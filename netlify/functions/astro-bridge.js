function parseTextResponse(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data.data === 'string') return data.data;
  if (typeof data.text === 'string') return data.text;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.message === 'string') return data.message;

  const firstChoiceText = data?.choices?.[0]?.message?.content;
  if (typeof firstChoiceText === 'string') return firstChoiceText;

  const firstCandidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof firstCandidateText === 'string') return firstCandidateText;

  return '';
}

async function callGemini(prompt, skyContext, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini key is missing. Set LUMINA or QUERY_API_KEY.');
  }

  const systemPrompt = typeof skyContext === 'string' && skyContext
    ? `You are a skilled sky interpreter. Use this sky data as ground truth and write a concise interpretation.\n\n${skyContext}`
    : 'You are a skilled sky interpreter. Respond with concise, grounded astrological context.';

  const model = process.env.QUERY_MODEL || 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 900, temperature: 0.82 }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Gemini ${response.status}: ${msg}`);
  }

  const text = parseTextResponse(data);
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function callBridgeProvider(provider, prompt, skyContext, body) {
  const endpoint = body.bridgeEndpoint ||
    (provider === 'vedastro' ? process.env.VEDASTRO_MCP_URL : process.env.KERYKEION_API_URL);

  if (!endpoint) {
    throw new Error(`No endpoint configured for provider "${provider}".`);
  }

  const token = body.bridgeApiKey ||
    (provider === 'vedastro' ? (process.env.VEDASTRO_MCP_TOKEN || process.env.VEDASTRO_API_KEY) : process.env.KERYKEION_API_KEY);

  const payload = provider === 'vedastro'
    ? (body.mcpPayload || {
        prompt,
        skyContext: skyContext || '',
        intent: 'interpret-current-sky'
      })
    : (body.kerykeionPayload || {
        prompt,
        skyContext: skyContext || ''
      });

  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['x-api-key'] = token;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = { text: raw };
  }

  if (!response.ok) {
    const msg = parseTextResponse(data) || raw || `HTTP ${response.status}`;
    throw new Error(`${provider} ${response.status}: ${msg}`);
  }

  const text = parseTextResponse(data);
  if (!text) {
    return JSON.stringify(data);
  }

  return text;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { provider = 'auto', prompt, skyContext } = requestBody;

  if (!prompt || typeof prompt !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Request must include a "prompt" string' }) };
  }

  try {
    const normalizedProvider = String(provider || 'auto').toLowerCase();

    if (normalizedProvider === 'auto' || normalizedProvider === 'gemini') {
      const apiKey = process.env.LUMINA || process.env.QUERY_API_KEY;
      const text = await callGemini(prompt, skyContext, apiKey);
      return { statusCode: 200, body: JSON.stringify({ provider: 'gemini', data: text }) };
    }

    if (normalizedProvider === 'vedastro' || normalizedProvider === 'kerykeion') {
      const text = await callBridgeProvider(normalizedProvider, prompt, skyContext, requestBody || {});
      return { statusCode: 200, body: JSON.stringify({ provider: normalizedProvider, data: text }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: `Unsupported provider: ${normalizedProvider}` }) };
  } catch (error) {
    return { statusCode: 502, body: JSON.stringify({ error: error.message || 'Bridge request failed' }) };
  }
}

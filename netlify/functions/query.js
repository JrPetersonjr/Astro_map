export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.QUERY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing QUERY_API_KEY environment variable' }) };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const prompt = requestBody.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Request must include a "prompt" string' }) };
  }

  const skyContext = typeof requestBody.skyContext === 'string' ? requestBody.skyContext : null;

  const apiUrl = process.env.QUERY_API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  const model = process.env.QUERY_MODEL || 'gemini-2.0-flash-lite';

  const systemPrompt = skyContext
    ? `You are a compassionate astrology-aware journal companion who reads life experiences through both Western/tropical and Eastern/Vedic (sidereal + nakshatra) lenses.

The user has shared a journal entry. You have the current live sky data below. Use it to give a grounded, specific interpretation — reference actual planetary positions, active aspects, and moon context rather than speaking in vague generalities. Cross-reference the Western and Vedic layers when relevant.

Be warm, insightful, and concise. Prioritize the 1-2 most resonant astrological patterns for what the user is experiencing. Keep your response under 250 words.

${skyContext}`
    : `You are a compassionate astrology-aware journal companion. Respond to what the user shares with empathy, context, and insight. Keep responses under 200 words.`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: 600,
    temperature: 0.7
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('API Error:', { status: response.status, error: data });
      return { statusCode: 502, body: JSON.stringify({ error: data?.error?.message || 'API request failed', details: data }) };
    }

    const text = data?.choices?.[0]?.message?.content || data?.output || JSON.stringify(data);
    return { statusCode: 200, body: JSON.stringify({ data: text }) };
  } catch (error) {
    console.error('Fetch Error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Query call failed' }) };
  }
}

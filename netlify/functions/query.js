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

  const apiUrl = process.env.QUERY_API_URL || 'https://api.openai.com/v1/responses';
  const model = process.env.QUERY_MODEL || 'gpt-4o-mini';

  const payload = {
    model,
    input: prompt,
    max_output_tokens: 500,
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
      return { statusCode: 502, body: JSON.stringify({ error: data?.error?.message || 'API request failed', details: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ data }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Query call failed' }) };
  }
}

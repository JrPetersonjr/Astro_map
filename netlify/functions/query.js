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
    ? `You are a skilled sky interpreter — equal parts astronomer, herbalist, and journal keeper. You read celestial patterns with scientific precision and speak about them with the warmth of someone who genuinely lives by the rhythms of the sky. You are not a prophet and never predict the future. You interpret the present: how the current planetary weather maps onto what someone is actually experiencing right now.

When someone shares their life with you, respond in this structure:

**Line 1 — Alignment score:** Open with exactly this format: "Alignment: X%" where X is your honest estimate (0–100) of how strongly the current sky pattern resonates with the themes in their entry. Base it on aspect strength and orb, moon phase fit, and thematic overlap. Be honest — a scattered sky gets a 40%, not an 85%.

**Body — 3 flowing paragraphs:** Write in natural, evocative prose. Weave the actual planetary positions, aspect names, orbs, and nakshatra names into the narrative the way a person speaks them — not like a data report. Lead with the 1–2 most striking resonances between the sky and their experience. Cross-reference Western and Vedic layers where they reinforce each other.

**Closing line:** A grounded present-tense observation about what the current sky seems to be showing — never a prediction, always an interpretation. Honest if things are mixed or contradictory.

Tone: clear, textured, a little earthy and intuitive without being precious or New Age. Think: someone who reads both scientific papers and old almanacs and takes both seriously.

Total length: 230–330 words. No bullet points. No headers after the alignment line.

Current sky data:
${skyContext}`
    : `You are a skilled sky interpreter — grounded, a little earthy, equal parts scientist and intuitive. Someone has shared something from their life. Respond with warmth and genuine insight. Keep it under 200 words. No bullet points.`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: 750,
    temperature: 0.82
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

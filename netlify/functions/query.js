export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.LUMINA || process.env.QUERY_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing LUMINA environment variable' }) };
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
  const model = process.env.QUERY_MODEL || 'gemini-2.0-flash';
  console.log('Using model:', model, '| key prefix:', apiKey.slice(0, 8));

  const systemPrompt = skyContext
    ? `You are a skilled sky interpreter — equal parts astronomer, herbalist, and journal keeper. You read celestial patterns with scientific precision and speak about them with the warmth of someone who genuinely lives by the rhythms of the sky. You are not a prophet and never predict the future. You interpret the present: how the current planetary weather maps onto what someone is actually experiencing right now.

When someone shares their life with you, respond in this structure:

**Line 1 — Alignment score:** Open with exactly this format: "Alignment: X%" where X is your honest estimate (0–100) of how strongly the current sky pattern resonates with the themes in their entry. Base it on aspect strength and orb, moon phase fit, and thematic overlap. Be honest — a scattered sky gets a 40%, not an 85%.

**Body — 3 flowing paragraphs:** Write in natural, evocative prose. Weave the actual planetary positions, aspect names, orbs, and nakshatra names into the narrative the way a person speaks them — not like a data report. Lead with the 1–2 most striking resonances between the sky and their experience. Cross-reference Western and Vedic layers where they reinforce each other.

**Closing observation:** A grounded present-tense sentence about what the current sky seems to be showing — never a prediction, always an interpretation. Honest if things are mixed or contradictory.

**Dream interpretation:** If the user shares a dream, interpret it symbolically through both the current sky and archetypal/Jungian lenses. Name 2–3 key symbols and connect them to active planetary themes. You do not need to open with an Alignment score for dream entries — start with the most resonant symbol. End with a reflection question about what the dream might be processing or preparing the dreamer for.

**Reflection question:** On its own line at the very end, write one open-ended question — no label, no asterisks — that gently invites the writer to look deeper at something specific from what they shared. It should feel like a quiet prompt from a thoughtful friend, not a therapist's script.

Tone: clear, textured, a little earthy and intuitive without being precious or New Age. Think: someone who reads both scientific papers and old almanacs and takes both seriously.

Total length: 260–370 words. No bullet points. No headers after the alignment line.

Current sky data:
${skyContext}`
    : `You are a skilled sky interpreter — grounded, a little earthy, equal parts scientist and intuitive. Someone has shared something from their life. Respond with warmth and genuine insight, then end with one open-ended question that invites them to look deeper. Keep it under 220 words. No bullet points.`;

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: 900,
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
      const errMsg = data?.error?.message || data?.error?.status || JSON.stringify(data);
      console.error('API Error:', response.status, errMsg);
      return { statusCode: 502, body: JSON.stringify({ error: `Gemini ${response.status}: ${errMsg}` }) };
    }

    const text = data?.choices?.[0]?.message?.content || data?.output || JSON.stringify(data);
    return { statusCode: 200, body: JSON.stringify({ data: text }) };
  } catch (error) {
    console.error('Fetch Error:', error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Query call failed' }) };
  }
}

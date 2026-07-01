const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'precomputedForecast.json');
const RUNTIME = process.env.LUMINA_RUNTIME_URL || 'http://127.0.0.1:8787';
const DAYS = Number(process.env.FORECAST_DAYS || 14);

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function localBridge(prompt) {
  const response = await fetch(`${RUNTIME}/local/bridge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'mage-local',
      prompt,
      skyContext: '',
      contextHints: ['archivist-projects', 'mage-system', 'indra-system']
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Bridge failed (${response.status})`);
  }
  return data?.data || '';
}

async function run() {
  const today = new Date();
  const entries = [];

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const date = ymd(d);

    const prompt = [
      `Generate a concise astrological day forecast for ${date}.`,
      'Output exactly 3 short lines:',
      '1) Theme: ...',
      '2) Watch: ...',
      '3) Best Move: ...',
      'No markdown.'
    ].join('\n');

    const forecast = await localBridge(prompt);
    entries.push({ date, forecast: String(forecast).trim() });
    console.log(`Built forecast for ${date}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'mage-local',
    days: entries
  };

  await fs.writeFile(OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved: ${OUTPUT}`);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

(function (global) {
  async function loadPrecomputedForecast() {
    const panel = document.getElementById('precomputedForecastPanel');
    const source = document.getElementById('precomputedForecastSource');
    const body = document.getElementById('precomputedForecastBody');
    if (!panel || !source || !body) return;

    try {
      const response = await fetch('data/precomputedForecast.json', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const today = new Date();
      const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const entry = (data.days || []).find((d) => d.date === key);
      if (!entry || !entry.forecast) return;

      panel.classList.remove('forecast-hidden');
      panel.style.display = '';
      source.textContent = `Source: ${data.source || 'precomputed'} · Generated: ${data.generatedAt ? new Date(data.generatedAt).toLocaleString() : 'unknown'}`;
      body.textContent = entry.forecast;

      const cites = document.getElementById('precomputedForecastCitations');
      if (cites) {
        if (Array.isArray(entry.sources) && entry.sources.length) {
          const list = entry.sources.map((s) => `${s.author}, ${s.title} (${s.year})`).join(' · ');
          cites.innerHTML = `<span class="cite-label">Grounded in</span>${list}`;
          cites.style.display = '';
        } else {
          cites.style.display = 'none';
        }
      }
    } catch {
      // Keep panel hidden when no precomputed data exists.
    }
  }

  function noKeyCard(chatLogEl) {
    const div = document.createElement('div');
    div.className = 'j-bubble ai j-no-key-card';
    div.innerHTML = `
      <strong>Mage not connected</strong>
      <p>Interpretations now run through the local Mage runtime only.</p>
      <ol>
        <li>Open <strong>Settings</strong></li>
        <li>Keep <strong>Mage Local</strong> selected</li>
        <li>Launch Mage from Dev or request a dev-side interp</li>
      </ol>
      <p style="margin-top:6px;font-size:0.78rem;color:var(--soft);">No cloud keys are used in the normal flow.</p>
    `;
    if (chatLogEl) chatLogEl.appendChild(div);
    return div;
  }

  global.LuminaForecast = {
    loadPrecomputedForecast,
    noKeyCard
  };
})(window);

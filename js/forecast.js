(function (global) {
  const PANEL = 'precomputedForecastPanel';
  let current = null;   // 'YYYY-MM-DD' currently shown
  let inited = false;

  const el = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayYmd = () => ymd(new Date());

  function shift(dateStr, n) {
    const [Y, M, D] = dateStr.split('-').map(Number);
    const d = new Date(Y, M - 1, D);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function pretty(dateStr) {
    const [Y, M, D] = dateStr.split('-').map(Number);
    return new Date(Y, M - 1, D).toLocaleDateString(undefined,
      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Dynamic API first; fall back to the committed static cache (offline / local
  // dev without serverless functions).
  async function fetchForecast(dateStr) {
    try {
      const r = await fetch(`/api/forecast?date=${dateStr}`, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch (_) { /* fall through */ }
    try {
      const r = await fetch('data/precomputedForecast.json', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        const e = (data.days || []).find((d) => d.date === dateStr);
        if (e) {
          return { date: e.date, locked: false, forecast: e.forecast,
                   sources: e.sources, sky: e.sky, source: data.source,
                   generatedAt: data.generatedAt };
        }
      }
    } catch (_) { /* fall through */ }
    return null;
  }

  function renderFree(data) {
    const body = el('precomputedForecastBody');
    const locked = el('forecastLocked');
    const cites = el('precomputedForecastCitations');
    if (locked) locked.style.display = 'none';
    if (body) { body.style.display = ''; body.textContent = data.forecast || ''; }
    if (cites) {
      if (Array.isArray(data.sources) && data.sources.length) {
        const list = data.sources.map((s) => `${s.author}, ${s.title} (${s.year})`).join(' · ');
        cites.innerHTML = `<span class="cite-label">Grounded in</span>${list}`;
        cites.style.display = '';
      } else {
        cites.style.display = 'none';
      }
    }
  }

  function renderLocked(data) {
    const body = el('precomputedForecastBody');
    const cites = el('precomputedForecastCitations');
    const locked = el('forecastLocked');
    if (body) body.style.display = 'none';
    if (cites) cites.style.display = 'none';
    if (!locked) return;
    locked.style.display = '';
    locked.innerHTML = `
      <div class="forecast-lock-teaser">${(data.teaser || '').replace(/\n/g, '<br>')}</div>
      <div class="forecast-lock-cta">
        <strong>Advanced forecast</strong>
        <p>${data.message || 'Unlock upcoming days with a subscription.'}</p>
        <button type="button" class="forecast-lock-btn" id="forecastSubscribe">Get the weekly reading</button>
      </div>`;
    const btn = el('forecastSubscribe');
    if (btn) {
      btn.addEventListener('click', () => {
        // Payment flow is not wired yet — emit an event for the future checkout.
        global.dispatchEvent(new CustomEvent('lumina:subscribe', { detail: { date: data.date } }));
      });
    }
  }

  async function show(dateStr) {
    current = dateStr;
    const panel = el(PANEL);
    if (!panel) return;
    const dateLbl = el('forecastDate');
    if (dateLbl) dateLbl.textContent = pretty(dateStr) + (dateStr === todayYmd() ? '  ·  Today' : '');

    const data = await fetchForecast(dateStr);
    const src = el('precomputedForecastSource');
    if (!data) {
      const body = el('precomputedForecastBody');
      const locked = el('forecastLocked');
      if (locked) locked.style.display = 'none';
      if (body) { body.style.display = ''; body.textContent = 'Forecast unavailable for this date.'; }
      if (src) src.textContent = '';
      panel.classList.remove('forecast-hidden');
      panel.style.display = '';
      return;
    }
    panel.classList.remove('forecast-hidden');
    panel.style.display = '';
    if (src) {
      src.textContent = data.generatedAt
        ? `Source: ${data.source || 'precomputed'} · Generated: ${new Date(data.generatedAt).toLocaleString()}`
        : 'Source: live · deterministic sky model';
    }
    if (data.locked) renderLocked(data); else renderFree(data);
  }

  function wireNav() {
    const prev = el('forecastPrev');
    const next = el('forecastNext');
    const goToday = el('forecastToday');
    if (prev) prev.addEventListener('click', () => show(shift(current, -1)));
    if (next) next.addEventListener('click', () => show(shift(current, +1)));
    if (goToday) goToday.addEventListener('click', () => show(todayYmd()));
  }

  function loadPrecomputedForecast() {
    if (!inited) { wireNav(); inited = true; }
    show(todayYmd());
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

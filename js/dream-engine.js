// Browser build of the deterministic, citation-backed dream engine.
// Mirrors standalone/dream-interpret.js (keep the two in sync) but loads its data
// by fetch so there is no duplicated symbol table. Zero model tokens.
//
// API (for the Dreams UI):
//   window.DreamEngine.ready            -> Promise (resolves when data loaded)
//   window.DreamEngine.interpret(text)  -> { matches: [{key,label,meaning,citations,citeInline}], reading }
//   window.DreamEngine.matchSymbols(text) -> raw symbol matches
(function () {
  'use strict';
  const state = { symbols: [], srcMap: {} };

  const ready = Promise.all([
    fetch('data/dream-symbols.json').then((r) => r.json()),
    fetch('standalone/interpretation-sources.json').then((r) => r.json())
  ]).then(([sym, sources]) => {
    state.symbols = (sym && sym.symbols) || [];
    for (const cat of ['tarot', 'astrology', 'dream', 'repos']) {
      for (const s of (sources[cat] || [])) state.srcMap[s.id] = s;
    }
  }).catch((e) => { console.warn('[DreamEngine] data load failed:', e && e.message); });

  const lastName = (a) => (a || '').split(/\s+/).filter(Boolean).pop() || a;
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const resolveCites = (refs) => (refs || []).map((id) => state.srcMap[id]).filter(Boolean)
    .map((s) => ({ id: s.id, author: s.author, title: s.title, year: s.year }));
  function citeInline(refs) {
    const cs = resolveCites(refs);
    return cs.length ? '(' + cs.map((c) => `${lastName(c.author)}, ${c.title}, ${c.year}`).join('; ') + ')' : '';
  }

  function matchSymbols(text) {
    const lower = ' ' + String(text || '').toLowerCase() + ' ';
    const found = [];
    for (const sym of state.symbols) {
      const hit = sym.aliases.find((a) => new RegExp(`\\b${escapeRe(a.toLowerCase())}\\b`).test(lower));
      if (hit) found.push(sym);
    }
    return found;
  }

  function renderReading(matches) {
    if (!matches.length) {
      return "No catalogued symbols surfaced in what you shared. Tell me more of the dream's images — water, a house, being chased, a figure — and I can read them.";
    }
    const lines = matches.map((m) => `${cap(m.label)} speaks to ${m.meaning} ${m.citeInline}`.trim());
    const closing = matches.length > 1
      ? 'Read together, these images point to one movement in you: something old asking to be faced and released so something truer can take its place.'
      : 'Sit with this image on waking — let it tell you which part of your waking life it is pointing at.';
    return `This dream is speaking in symbols. ${lines.join(' ')} ${closing}`;
  }

  function interpret(text) {
    const matches = matchSymbols(text).map((m) => ({
      key: m.key, label: m.aliases[0], meaning: m.meaning,
      citations: resolveCites(m.sourceRefs), citeInline: citeInline(m.sourceRefs)
    }));
    return { matches, reading: renderReading(matches) };
  }

  window.DreamEngine = { ready, interpret, matchSymbols };
})();

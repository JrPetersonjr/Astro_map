// Deterministic, citation-backed dream interpretation.
// Matches a dream's images against data/dream-symbols.json and returns each
// symbol's meaning WITH its source attribution, so nothing reads as invented.
// Zero model tokens — an LLM (if used) only smooths the wording, never the facts.

const path = require('path');
const { symbols: SYMBOLS } = require(path.join(__dirname, '..', 'data', 'dream-symbols.json'));
const SOURCES = require(path.join(__dirname, 'interpretation-sources.json'));

// Flatten the bibliography into one id -> {author,title,year} map for citations.
const SRC = {};
for (const cat of ['tarot', 'astrology', 'dream', 'repos']) {
  for (const s of SOURCES[cat] || []) SRC[s.id] = s;
}
const lastName = (author) => (author || '').split(/\s+/).filter(Boolean).pop() || author;
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

function resolveCites(refs) {
  return (refs || []).map((id) => SRC[id]).filter(Boolean)
    .map((s) => ({ id: s.id, author: s.author, title: s.title, year: s.year }));
}
function citeInline(refs) {
  const cs = resolveCites(refs);
  if (!cs.length) return '';
  return '(' + cs.map((c) => `${lastName(c.author)}, ${c.title}, ${c.year}`).join('; ') + ')';
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matchSymbols(text) {
  const lower = ' ' + text.toLowerCase() + ' ';
  const found = [];
  for (const sym of SYMBOLS) {
    const hit = sym.aliases.find((a) => new RegExp(`\\b${escapeRe(a.toLowerCase())}\\b`).test(lower));
    if (hit) found.push({ key: sym.key, label: sym.aliases[0], hit, meaning: sym.meaning, sourceRefs: sym.sourceRefs });
  }
  return found;
}

// Structured interpretation — no tokens.
function interpret(text) {
  const matches = matchSymbols(text).map((m) => ({
    key: m.key, label: m.label, meaning: m.meaning,
    citations: resolveCites(m.sourceRefs), citeInline: citeInline(m.sourceRefs)
  }));
  return { matches, reading: renderReading(matches) };
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

module.exports = { interpret, matchSymbols };

if (require.main === module) {
  const arg = process.argv.slice(2).join(' ').trim();
  const dream = arg || 'I was being chased through a dark house, and when I found the basement it was full of water. My teeth were falling out and I could not find the door.';
  const r = interpret(dream);
  console.log(`===== DREAM (0 model tokens) =====\n"${dream}"\n`);
  console.log(r.reading);
  console.log(`\n----- symbols matched: ${r.matches.map((m) => m.key).join(', ') || 'none'} -----`);
  for (const m of r.matches) console.log(`  ${m.label}: ${m.citations.map((c) => c.title).join('; ')}`);
}

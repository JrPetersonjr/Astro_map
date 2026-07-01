// Deterministic, citation-backed tarot interpretation.
// Looks up cards from data/tarotCards.js (the same data the app renders) and
// returns meaning + keywords WITH source attribution to the RWS canon, so a
// reading reads as sourced, not invented. Zero model tokens.

const path = require('path');
const { tarotCards: CARDS } = require(path.join(__dirname, '..', 'data', 'tarotCards.js'));
const SOURCES = require(path.join(__dirname, 'interpretation-sources.json'));

const SRC = {};
for (const cat of ['tarot', 'astrology', 'dream', 'repos']) {
  for (const s of SOURCES[cat] || []) SRC[s.id] = s;
}
// The interpretive basis for card meanings (Rider-Waite-Smith canon + modern reading).
const MEANING_SRC = ['tarot_waite_pictorial_key', 'tarot_pollack_78_degrees'];
const METHOD_SRC = ['tarot_greer_taro_for_self', 'tarot_arrien_handbook'];

const lastName = (a) => (a || '').split(/\s+/).filter(Boolean).pop() || a;
function resolveCites(refs) {
  return (refs || []).map((id) => SRC[id]).filter(Boolean).map((s) => ({ id: s.id, author: s.author, title: s.title, year: s.year }));
}
function citeInline(refs) {
  const cs = resolveCites(refs);
  return cs.length ? '(' + cs.map((c) => `${lastName(c.author)}, ${c.title}, ${c.year}`).join('; ') + ')' : '';
}

function findCard(query) {
  if (typeof query === 'number') return CARDS.find((c) => c.id === query) || null;
  const q = String(query).toLowerCase().trim();
  return CARDS.find((c) => c.name.toLowerCase() === q)
    || CARDS.find((c) => c.name.toLowerCase().includes(q)) || null;
}

// Interpret one card. opts: { reversed, position }
function interpret(query, opts = {}) {
  const card = typeof query === 'object' && query.name ? query : findCard(query);
  if (!card) return { error: `Card not found: ${query}` };
  const reversed = !!opts.reversed;
  const keywords = reversed ? card.keywords.reversed : card.keywords.upright;
  const core = reversed
    ? `Reversed — ${keywords.join(', ')}. The upright current (${card.meaning.replace(/\.$/, '')}) is blocked, inverted, or turned inward.`
    : card.meaning;
  const cite = citeInline(MEANING_SRC);

  const posLabel = opts.position ? `${opts.position}: ` : '';
  const reading = `${posLabel}${card.name}${reversed ? ' (reversed)' : ''} — ${core} ${card.description} ${cite}`.trim();

  return {
    id: card.id, name: card.name, arcana: card.arcana, suit: card.suit,
    orientation: reversed ? 'reversed' : 'upright',
    keywords, meaning: core, description: card.description, themes: card.themes,
    citations: resolveCites(MEANING_SRC), citeInline: cite, reading
  };
}

// Draw a spread. positions = array of labels (default 3-card Past/Present/Future).
function drawSpread(positions = ['Past', 'Present', 'Future'], rng = Math.random) {
  const pool = [...CARDS];
  return positions.map((label) => {
    const card = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    return interpret(card, { reversed: rng() < 0.35, position: label });
  });
}

module.exports = { interpret, drawSpread, findCard };

if (require.main === module) {
  const arg = process.argv.slice(2).join(' ').trim();
  if (arg) {
    const r = interpret(arg.replace(/\s+reversed$/i, ''), { reversed: /reversed$/i.test(arg) });
    console.log(r.error ? r.error : `===== ${r.name} (${r.orientation}) — 0 tokens =====\n${r.reading}`);
  } else {
    console.log('===== 3-CARD SPREAD (Past / Present / Future) — 0 model tokens =====\n');
    for (const c of drawSpread()) console.log(c.reading + '\n');
    console.log(`Reading method: ${citeInline(METHOD_SRC)}`);
  }
}

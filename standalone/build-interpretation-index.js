const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TAROT_PATH = path.join(ROOT, 'data', 'tarotCards.js');
const SOURCES_PATH = path.join(__dirname, 'interpretation-sources.json');
const JSON_OUT = path.join(ROOT, 'data', 'interpretation-index.json');
const MD_OUT = path.join(ROOT, 'data', 'interpretation-guide.md');

const THEME_CATALOG = {
  love_interest: {
    label: 'Love / Attraction / Reconnection',
    description: 'Connection, chemistry, desire, and the choices that shape intimacy.',
    sourceRefs: ['tarot_pollack_78_degrees', 'tarot_greer_taro_for_self', 'astro_forrest_inner_sky']
  },
  loss: {
    label: 'Loss / Grief / Ending',
    description: 'Farewell, release, mourning, and the reality of something finishing.',
    sourceRefs: ['tarot_waite_pictorial_key', 'dream_inner_work', 'astro_brady_eagle_lark']
  },
  money_gain: {
    label: 'Gain / Opportunity / Expansion',
    description: 'Growth, increase, luck, and doors opening in practical life.',
    sourceRefs: ['tarot_arrien_handbook', 'astro_hand_planets_transit']
  },
  money_loss: {
    label: 'Money / Resource Pressure',
    description: 'Budget strain, spending, scarcity, and material insecurity.',
    sourceRefs: ['tarot_greer_taro_for_self', 'astro_arroyo_elements']
  },
  health: {
    label: 'Health / Body / Burnout',
    description: 'Rest, recovery, body awareness, and the limits of endurance.',
    sourceRefs: ['tarot_arrien_handbook', 'astro_arroyo_elements']
  },
  career: {
    label: 'Career / Work / Responsibility',
    description: 'Direction, discipline, goals, labor, and the shape of contribution.',
    sourceRefs: ['tarot_waite_pictorial_key', 'astro_hand_planets_transit', 'astro_forrest_inner_sky']
  },
  family_home: {
    label: 'Family / Home / Belonging',
    description: 'Roots, kinship, domestic life, and the need to feel held.',
    sourceRefs: ['tarot_pollack_78_degrees', 'dream_jung_symbols']
  },
  spiritual: {
    label: 'Spiritual / Dream / Intuition',
    description: 'Inner knowing, symbols, mystery, and the language of the unseen.',
    sourceRefs: ['dream_jung_symbols', 'dream_inner_work', 'tarot_pollack_78_degrees']
  },
  sudden_change: {
    label: 'Sudden Change / Breakthrough',
    description: 'Shifts, disruption, liberation, and the crack that lets new air in.',
    sourceRefs: ['tarot_waite_pictorial_key', 'astro_brady_eagle_lark']
  },
  tension: {
    label: 'Tension / Conflict / Pressure',
    description: 'Stress, struggle, opposition, and the heat that reveals form.',
    sourceRefs: ['astro_hand_planets_transit', 'tarot_arrien_handbook']
  },
  new_beginnings: {
    label: 'New Beginnings',
    description: 'Fresh starts, first steps, open potential, and the spark before structure.',
    sourceRefs: ['tarot_waite_pictorial_key', 'astro_forrest_inner_sky']
  },
  completion: {
    label: 'Completion / Closure',
    description: 'A cycle finishing, integration, and the compost of what came before.',
    sourceRefs: ['tarot_pollack_78_degrees', 'astro_brady_eagle_lark']
  },
  balance: {
    label: 'Balance / Integration',
    description: 'Moderation, proportion, and the work of bringing opposites together.',
    sourceRefs: ['tarot_arrien_handbook', 'astro_arroyo_elements']
  }
};

const SOURCE_FAMILIES = {
  tarot: ['tarot_waite_pictorial_key', 'tarot_pollack_78_degrees', 'tarot_greer_taro_for_self', 'tarot_arrien_handbook'],
  astrology: ['astro_forrest_inner_sky', 'astro_hand_planets_transit', 'astro_brady_eagle_lark', 'astro_arroyo_elements', 'astro_light_on_life'],
  dream: ['dream_jung_symbols', 'dream_inner_work', 'dream_interpretation_of_dreams'],
  repos: ['repo_astronomy_engine', 'repo_kerykeion', 'repo_vedastro']
};

function loadTarotCards() {
  const source = fs.readFileSync(TAROT_PATH, 'utf8');
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'tarotCards.js' });
  const cards = sandbox.window._TAROT_CARDS;
  if (!Array.isArray(cards) || !cards.length) {
    throw new Error('Failed to load tarot card source data');
  }
  return cards;
}

function loadSources() {
  const raw = fs.readFileSync(SOURCES_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const lookup = new Map();
  [...(parsed.tarot || []), ...(parsed.astrology || []), ...(parsed.dream || []), ...(parsed.repos || [])].forEach((item) => {
    if (item?.id) lookup.set(item.id, item);
  });
  return { ...parsed, lookup };
}

function normalizeThemeKey(key) {
  return String(key || '').trim();
}

function buildThemeIndex(cards) {
  const grouped = new Map();
  cards.forEach((card) => {
    (card.themes || []).forEach((theme) => {
      const themeKey = normalizeThemeKey(theme);
      if (!themeKey) return;
      if (!grouped.has(themeKey)) grouped.set(themeKey, []);
      grouped.get(themeKey).push(card.name);
    });
  });

  return [...grouped.entries()].map(([key, names]) => {
    const meta = THEME_CATALOG[key] || {
      label: key.replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      description: 'Derived theme group from the tarot source deck.'
    };
    return {
      key,
      label: meta.label,
      description: meta.description,
      sourceRefs: meta.sourceRefs || [],
      cards: names
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
}

function cardSourceRefs(card, sources) {
  const refs = new Set();
  const add = (id) => {
    if (id && sources.lookup.has(id)) refs.add(id);
  };

  add('tarot_waite_pictorial_key');
  add('tarot_pollack_78_degrees');

  if (card.arcana === 'Minor') {
    add('tarot_greer_taro_for_self');
    add('tarot_arrien_handbook');
  }

  if (card.suit === 'Cups' || card.name === 'The Moon') {
    add('dream_jung_symbols');
    add('dream_inner_work');
  }

  if (card.suit === 'Swords') {
    add('astro_hand_planets_transit');
    add('astro_brady_eagle_lark');
  }

  if (card.suit === 'Pentacles') {
    add('astro_forrest_inner_sky');
    add('astro_arroyo_elements');
  }

  if (card.suit === 'Wands') {
    add('astro_forrest_inner_sky');
    add('astro_hand_planets_transit');
  }

  if (card.themes?.includes('spiritual') || card.themes?.includes('tension')) {
    add('dream_jung_symbols');
    add('astro_light_on_life');
  }

  return [...refs];
}

function cardsToJson(cards) {
  return cards.map((card) => ({
    id: card.id,
    name: card.name,
    arcana: card.arcana,
    number: card.number,
    suit: card.suit,
    meaning: card.meaning,
    description: card.description,
    keywords: card.keywords,
    themes: card.themes || [],
    sourceRefs: card.sourceRefs || []
  }));
}

function buildMarkdown(cards, themes, sources) {
  const lines = [];
  lines.push('# LuminaSynodic Interpretation Index');
  lines.push('');
  lines.push('Offline reading guide derived from the tarot source deck, a curated source bibliography, and packed for the standalone runner.');
  lines.push('');
  lines.push('This pack is source-backed, not text-copied: it uses bibliographic references and synthesis notes rather than reproducing book passages.');
  lines.push('');
  lines.push('## How To Read It');
  lines.push('');
  lines.push('- Start with the card or theme that is loudest.');
  lines.push('- Read upright meaning first, then reversed meaning if the situation feels inverted or blocked.');
  lines.push('- Pair the card with the current life condition: loss, gain, tension, love, work, family, health, change, or spiritual pressure.');
  lines.push('- For an old-fashioned reading, keep the language plain: what is happening, what is being asked, what changes next.');
  lines.push('- Use the source backbone below when you want the interpretation to stay close to reputable tarot, astrology, dreamwork, and ephemeris references.');
  lines.push('');
  lines.push('## Source Backbone');
  lines.push('');
  Object.entries(SOURCE_FAMILIES).forEach(([family, ids]) => {
    lines.push(`### ${family.charAt(0).toUpperCase() + family.slice(1)}`);
    lines.push('');
    ids.forEach((id) => {
      const item = sources.lookup.get(id);
      if (!item) return;
      lines.push(`- ${item.title} — ${item.author} (${item.year})`);
      lines.push(`  - ${item.use}`);
      lines.push(`  - ${item.url}`);
    });
    lines.push('');
  });
  lines.push('');
  lines.push('## Theme Index');
  lines.push('');
  themes.forEach((theme) => {
    lines.push(`### ${theme.label}`);
    lines.push('');
    lines.push(theme.description);
    lines.push('');
    lines.push(`Cards: ${theme.cards.join(', ')}`);
    if (theme.sourceRefs?.length) {
      lines.push(`Sources: ${theme.sourceRefs.map((id) => (sources.lookup.get(id)?.title || id)).join(' · ')}`);
    }
    lines.push('');
  });
  lines.push('## Card Index');
  lines.push('');
  cards.forEach((card) => {
    const upright = (card.keywords?.upright || []).join(', ');
    const reversed = (card.keywords?.reversed || []).join(', ');
    const themeNames = (card.themes || []).map((theme) => {
      const meta = THEME_CATALOG[theme];
      return meta ? meta.label : theme;
    }).join(' · ');
    const refs = card.sourceRefs || [];

    lines.push(`### ${card.name}`);
    lines.push('');
    lines.push(`Arcana: ${card.arcana}${card.suit ? ` / ${card.suit}` : ''}`);
    lines.push(`Meaning: ${card.meaning}`);
    lines.push(`Themes: ${themeNames || 'none listed'}`);
    lines.push(`Upright: ${upright}`);
    lines.push(`Reversed: ${reversed}`);
    if (refs.length) {
      lines.push(`References: ${refs.map((id) => sources.lookup.get(id)?.title || id).join(' · ')}`);
    }
    lines.push('');
    lines.push(card.description || '');
    lines.push('');
  });

  lines.push('## Offline Use');
  lines.push('');
  lines.push('- Open this file directly if you want a plain text reference without the app UI.');
  lines.push('- For packaged use, keep this guide beside the local runner and the tarot image assets.');
  lines.push('- When accuracy matters, prefer known source cards and local reasoning over generic cloud summaries.');
  lines.push('- For astrology timing, lean on the ephemeris engine and the astrology references listed above.');
  lines.push('- For dream reading, keep Jungian symbolism and journaling style front and center.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const cards = loadTarotCards();
  const sources = loadSources();
  const cardsWithRefs = cards.map((card) => ({ ...card, sourceRefs: cardSourceRefs(card, sources) }));
  const themes = buildThemeIndex(cardsWithRefs);
  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      tarotCardsFile: path.relative(ROOT, TAROT_PATH).replaceAll('\\', '/'),
      sourcesFile: path.relative(ROOT, SOURCES_PATH).replaceAll('\\', '/'),
      guide: 'standalone/build-interpretation-index.js'
    },
    sources: {
      tarot: sources.tarot || [],
      astrology: sources.astrology || [],
      dream: sources.dream || [],
      repos: sources.repos || []
    },
    themeIndex: themes,
    cards: cardsToJson(cardsWithRefs)
  };

  await fsp.writeFile(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await fsp.writeFile(MD_OUT, `${buildMarkdown(payload.cards, themes, sources)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, JSON_OUT)}`);
  console.log(`Wrote ${path.relative(ROOT, MD_OUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
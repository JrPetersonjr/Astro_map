(function (global) {
  function createTarotUx(config) {
    const cfg = config || {};

    const TAROT_THEME_TO_LEXICON = {
      love_interest: 'newLove',
      loss: 'loss',
      money_gain: 'gain',
      money_loss: 'money',
      health: 'health',
      career: 'career',
      family_home: 'family',
      spiritual: 'spiritual',
      sudden_change: 'change',
      tension: 'tension',
      new_beginnings: 'gain',
      completion: 'loss',
      balance: 'spiritual'
    };

    const TAROT_IMAGE_MAP = {
      'The Fool': 'thefool.jpeg', 'The Magician': 'themagician.jpeg', 'The High Priestess': 'thehighpriestess.jpeg',
      'The Empress': 'theempress.jpeg', 'The Emperor': 'theemperor.jpeg', 'The Hierophant': 'thehierophant.jpeg',
      'The Lovers': 'TheLovers.jpg', 'The Chariot': 'thechariot.jpeg', Strength: 'thestrength.jpeg',
      'The Hermit': 'thehermit.jpeg', 'Wheel of Fortune': 'wheeloffortune.jpeg', Justice: 'justice.jpeg',
      'The Hanged Man': 'thehangedman.jpeg', Death: 'death.jpeg', Temperance: 'temperance.jpeg',
      'The Devil': 'thedevil.jpeg', 'The Tower': 'thetower.jpeg', 'The Star': 'thestar.jpeg',
      'The Moon': 'themoon.jpeg', 'The Sun': 'thesun.jpeg', Judgement: 'judgement.jpeg', 'The World': 'theworld.jpeg',
      'Ace of Cups': 'aceofcups.jpeg', 'Two of Cups': 'twoofcups.jpeg', 'Three of Cups': 'threeofcups.jpeg',
      'Four of Cups': 'fourofcups.jpeg', 'Five of Cups': 'fiveofcups.jpeg', 'Six of Cups': 'sixofcups.jpeg',
      'Seven of Cups': 'sevenofcups.jpeg', 'Eight of Cups': 'eightofcups.jpeg', 'Nine of Cups': 'nineofcups.jpeg',
      'Ten of Cups': 'tenofcups.jpeg', 'Page of Cups': 'pageofcups.jpeg', 'Knight of Cups': 'knightofcups.jpeg',
      'Queen of Cups': 'queenofcups.jpeg', 'King of Cups': 'kingofcups.jpeg',
      'Ace of Pentacles': 'aceofpentacles.jpeg', 'Two of Pentacles': 'twoofpentacles.jpeg', 'Three of Pentacles': 'threeofpentacles.jpeg',
      'Four of Pentacles': 'fourofpentacles.jpeg', 'Five of Pentacles': 'fiveofpentacles.jpeg', 'Six of Pentacles': 'sixofpentacles.jpeg',
      'Seven of Pentacles': 'sevenofpentacles.jpeg', 'Eight of Pentacles': 'eightofpentacles.jpeg', 'Nine of Pentacles': 'nineofpentacles.jpeg',
      'Ten of Pentacles': 'tenofpentacles.jpeg', 'Page of Pentacles': 'pageofpentacles.jpeg', 'Knight of Pentacles': 'knightofpentacles.jpeg',
      'Queen of Pentacles': 'queenofpentacles.jpeg', 'King of Pentacles': 'kingofpentacles.jpeg',
      'Ace of Swords': 'aceofswords.jpeg', 'Two of Swords': 'twoofswords.jpeg', 'Three of Swords': 'threeofswords.jpeg',
      'Four of Swords': 'fourofswords.jpeg', 'Five of Swords': 'fiveofswords.jpeg', 'Six of Swords': 'sixofswords.jpeg',
      'Seven of Swords': 'sevenofswords.jpeg', 'Eight of Swords': 'eightofswords.jpeg', 'Nine of Swords': 'nineofswords.jpeg',
      'Ten of Swords': 'tenofswords.jpeg', 'Page of Swords': 'pageofswords.jpeg', 'Knight of Swords': 'knightofswords.jpeg',
      'Queen of Swords': 'queenofswords.jpeg', 'King of Swords': 'kingofswords.jpeg',
      'Ace of Wands': 'aceofwands.jpeg', 'Two of Wands': 'twoofwands.jpeg', 'Three of Wands': 'threeofwands.jpeg',
      'Four of Wands': 'fourofwands.jpeg', 'Five of Wands': 'fiveofwands.jpeg', 'Six of Wands': 'sixofwands.jpeg',
      'Seven of Wands': 'sevenofwands.jpeg', 'Eight of Wands': 'eightofwands.jpeg', 'Nine of Wands': 'nineofwands.jpeg',
      'Ten of Wands': 'tenofwands.jpeg', 'Page of Wands': 'pageofwands.jpeg', 'Knight of Wands': 'knightofwands.jpeg',
      'Queen of Wands': 'queenofwands.jpeg', 'King of Wands': 'kingofwands.jpeg'
    };

    let _tarotKwThemeMap = null;

    const TAROT_SPREADS = {
      single: {
        positions: [
          { label: 'The Card', hint: 'The central message or focus of this moment.' }
        ]
      },
      three_ppf: {
        positions: [
          { label: 'Past', hint: 'What has shaped this moment; the foundation beneath you.' },
          { label: 'Present', hint: 'Where you stand now; the current active energy.' },
          { label: 'Future', hint: 'What is moving toward you on this trajectory.' }
        ]
      },
      three_sao: {
        positions: [
          { label: 'Situation', hint: 'The circumstances or challenge at the center.' },
          { label: 'Action', hint: 'Where to direct your energy or what to consider doing.' },
          { label: 'Outcome', hint: 'The likely result if this energy is acted on.' }
        ]
      },
      three_mbs: {
        positions: [
          { label: 'Mind', hint: 'Your mental state; thoughts, beliefs, and patterns.' },
          { label: 'Body', hint: 'Physical reality; health, environment, practical matters.' },
          { label: 'Spirit', hint: 'Soul-level guidance; what your deeper self is calling toward.' }
        ]
      },
      horseshoe: {
        positions: [
          { label: 'Past Influence', hint: 'Recent past that shaped this situation.' },
          { label: 'Present', hint: 'The current state of affairs.' },
          { label: 'Hidden Influences', hint: 'Unseen factors or what lies beneath the surface.' },
          { label: 'Obstacles', hint: 'What stands in the way or must be worked through.' },
          { label: 'External Influences', hint: 'People, circumstances, or forces around you.' },
          { label: 'Guidance', hint: 'The recommended approach or what to lean into.' },
          { label: 'Outcome', hint: 'The most likely resolution if the path continues.' }
        ]
      },
      celtic_cross: {
        positions: [
          { label: 'The Present', hint: 'The heart of the matter; the situation as it stands.' },
          { label: 'The Challenge', hint: 'What crosses you; the immediate complicating factor.' },
          { label: 'The Foundation', hint: 'The deep root; what this situation is built on.' },
          { label: 'The Recent Past', hint: 'What is passing away or has just moved through.' },
          { label: 'The Crown', hint: 'The best possible outcome; what you are reaching toward.' },
          { label: 'The Near Future', hint: 'What is forming and approaching in the coming weeks.' },
          { label: 'Your Position', hint: 'Your attitude, role, or inner state in this situation.' },
          { label: 'External Influences', hint: 'Environment, others, and circumstances outside your control.' },
          { label: 'Hopes and Fears', hint: 'What you most want - and most fear - about this.' },
          { label: 'The Outcome', hint: 'The ultimate result if the current path is followed.' }
        ]
      }
    };

    const CURATED_KW_CLOUD = [
      { valence: 'pos', label: 'Uplifting', keywords: [
        { kw: 'love', themes: ['love_interest'] },
        { kw: 'abundance', themes: ['money_gain'] },
        { kw: 'new beginning', themes: ['new_beginnings'] },
        { kw: 'joy', themes: ['new_beginnings', 'love_interest'] },
        { kw: 'courage', themes: ['tension', 'career'] },
        { kw: 'clarity', themes: ['spiritual'] },
        { kw: 'growth', themes: ['money_gain', 'career'] },
        { kw: 'connection', themes: ['love_interest', 'family_home'] },
        { kw: 'hope', themes: ['new_beginnings', 'spiritual'] },
        { kw: 'creativity', themes: ['career', 'new_beginnings'] },
        { kw: 'confidence', themes: ['career', 'tension'] },
        { kw: 'healing', themes: ['health', 'spiritual'] },
        { kw: 'harmony', themes: ['balance', 'love_interest'] },
        { kw: 'freedom', themes: ['sudden_change', 'new_beginnings'] },
        { kw: 'success', themes: ['career', 'money_gain'] }
      ] },
      { valence: 'chal', label: 'Challenging', keywords: [
        { kw: 'grief', themes: ['loss', 'completion'] },
        { kw: 'fear', themes: ['tension', 'loss'] },
        { kw: 'conflict', themes: ['tension'] },
        { kw: 'feeling stuck', themes: ['tension', 'loss'] },
        { kw: 'loneliness', themes: ['loss', 'family_home'] },
        { kw: 'burnout', themes: ['health', 'tension'] },
        { kw: 'financial worry', themes: ['money_loss'] },
        { kw: 'betrayal', themes: ['tension', 'loss'] },
        { kw: 'confusion', themes: ['sudden_change', 'loss'] },
        { kw: 'overwhelm', themes: ['tension', 'health'] },
        { kw: 'regret', themes: ['loss', 'tension'] },
        { kw: 'endings', themes: ['completion', 'loss'] },
        { kw: 'restlessness', themes: ['sudden_change', 'tension'] }
      ] },
      { valence: 'neu', label: 'In Between', keywords: [
        { kw: 'change', themes: ['sudden_change'] },
        { kw: 'waiting', themes: ['spiritual', 'completion'] },
        { kw: 'letting go', themes: ['completion', 'loss'] },
        { kw: 'reflection', themes: ['spiritual'] },
        { kw: 'balance', themes: ['balance'] },
        { kw: 'independence', themes: ['career', 'sudden_change'] },
        { kw: 'family', themes: ['family_home'] },
        { kw: 'spiritual search', themes: ['spiritual'] },
        { kw: 'work / career', themes: ['career'] },
        { kw: 'health focus', themes: ['health'] },
        { kw: 'boundaries', themes: ['tension', 'career'] },
        { kw: 'completion', themes: ['completion'] }
      ] }
    ];

    const _curatedKwMap = new Map(CURATED_KW_CLOUD.flatMap((g) => g.keywords.map(({ kw, themes }) => [kw, themes])));

    const tarotKwSelections = { today: new Set(), week: new Set(), month: new Set() };
    let lastTarotKwReading = null;
    let lastTarotSpreadReading = null;
    let tarotTabInited = false;
    let tarotSelectedCardName = 'The Fool';
    let tarotSearchQuery = '';
    let tarotDeckPromptPack = '';
    let tarotDeckCatalog = [];
    let tarotActiveDeckSlug = localStorage.getItem('lumina_tarot_deck_slug') || 'classic-source';
    const TAROT_REFERENCE_SOURCES_KEY = 'lumina_tarot_reference_sources';
    const DEFAULT_TAROT_REFERENCE_SOURCES = 'https://www.vecteezy.com/free-vector/tarot';

    function getLatestData() {
      return typeof cfg.getLatestData === 'function' ? cfg.getLatestData() : [];
    }

    function getLatestAspects() {
      return typeof cfg.getLatestAspects === 'function' ? cfg.getLatestAspects() : [];
    }

    function getLatestDate() {
      return typeof cfg.getLatestDate === 'function' ? cfg.getLatestDate() : null;
    }

    function getJournalEntries() {
      return typeof cfg.getJournalEntries === 'function' ? cfg.getJournalEntries() : [];
    }

    function getJournalKey() {
      return typeof cfg.getJournalKey === 'function' ? cfg.getJournalKey() : null;
    }

    function setStatus(message) {
      if (typeof cfg.setStatus === 'function') cfg.setStatus(message);
    }

    function tarotRomanNumeral(name) {
      const card = (global._TAROT_CARDS || []).find((c) => c.name === name);
      if (!card) return '';
      if (card.arcana === 'Major') {
        const romans = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
        return romans[card.number] || '';
      }
      const nums = { Ace: 'A', Page: 'P', Knight: 'Kn', Queen: 'Q', King: 'K' };
      return nums[card.number] || String(card.number);
    }

    function tarotCardImg(name, reversed) {
      const file = TAROT_IMAGE_MAP[name];
      if (!file) return '';
      return `<div class="tarot-card-frame${reversed ? ' reversed' : ''}">
        <div class="tarot-card-frame__top">
          <span>${tarotRomanNumeral(name)}</span>
          <span>${reversed ? 'reversed' : 'upright'}</span>
        </div>
        <div class="tarot-card-frame__art">
          <img src="data/cards/${file}" alt="${name}" loading="lazy">
        </div>
        <div class="tarot-card-frame__bottom">
          <div class="tarot-card-frame__name">${name.toLowerCase()}</div>
          <div class="tarot-card-frame__subtitle">${reversed ? 'shadowed / internalized' : 'open / direct'}</div>
        </div>
      </div>`;
    }

    function getTarotKwThemeMap() {
      if (_tarotKwThemeMap) return _tarotKwThemeMap;
      const cards = global._TAROT_CARDS || [];
      const map = new Map();
      cards.forEach((card) => {
        const addKw = (kw) => {
          if (!map.has(kw)) map.set(kw, new Set());
          card.themes.forEach((t) => map.get(kw).add(t));
        };
        card.keywords.upright.forEach(addKw);
        card.keywords.reversed.forEach(addKw);
      });
      _tarotKwThemeMap = map;
      return map;
    }

    function slugifyDeck(input) {
      return String(input || 'tarot-deck')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'tarot-deck';
    }

    function baseDeckCatalog() {
      return [{
        slug: 'classic-source',
        name: 'Classic Source Deck',
        summary: 'Built-in LuminaSynodic tarot source deck.',
        source: 'builtin',
        createdAt: null
      }];
    }

    function normalizeDeckEntry(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const slug = slugifyDeck(raw.slug || raw.name || 'tarot-deck');
      return {
        slug,
        name: String(raw.name || slug),
        summary: String(raw.summary || ''),
        source: String(raw.source || 'published'),
        createdAt: raw.createdAt || raw.savedAt || null,
        manifestPath: raw.manifestPath || raw.filePath || null,
        manifest: raw.manifest || null
      };
    }

    function getActiveDeckEntry() {
      return tarotDeckCatalog.find((item) => item.slug === tarotActiveDeckSlug) || tarotDeckCatalog[0] || null;
    }

    function populateDeckSelect(select) {
      if (!select) return;
      select.innerHTML = '';
      tarotDeckCatalog.forEach((deck) => {
        const opt = document.createElement('option');
        opt.value = deck.slug;
        opt.textContent = deck.name;
        select.appendChild(opt);
      });
      select.value = tarotActiveDeckSlug;
    }

    function setActiveDeckSlug(nextSlug) {
      tarotActiveDeckSlug = nextSlug;
      if (!tarotDeckCatalog.some((deck) => deck.slug === tarotActiveDeckSlug)) {
        tarotActiveDeckSlug = tarotDeckCatalog[0]?.slug || 'classic-source';
      }
      localStorage.setItem('lumina_tarot_deck_slug', tarotActiveDeckSlug);
      populateDeckSelect(document.getElementById('tarotDeckOptionSelect'));
      populateDeckSelect(document.getElementById('tarotDeckOptionSelectPublic'));
    }

    function updateTarotDeckSelector() {
      setActiveDeckSlug(tarotActiveDeckSlug);
    }

    function getTarotReferenceSources() {
      const raw = (document.getElementById('tarotReferenceSources')?.value || '').trim();
      const sourceText = raw || localStorage.getItem(TAROT_REFERENCE_SOURCES_KEY) || DEFAULT_TAROT_REFERENCE_SOURCES;
      return sourceText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((url) => ({
          url,
          licenseConfirmed: true,
          usage: 'style and composition reference'
        }));
    }

    function syncTarotSettingsFields() {
      const referenceInput = document.getElementById('tarotReferenceSources');
      if (referenceInput) {
        referenceInput.value = localStorage.getItem(TAROT_REFERENCE_SOURCES_KEY) || DEFAULT_TAROT_REFERENCE_SOURCES;
      }
      updateTarotDeckSelector();
    }

    async function fetchTarotDeckCatalog() {
      const merged = [...baseDeckCatalog()];
      const localCatalogUrl = `${cfg.getLocalRuntimeUrl()}/local/decks/catalog`;
      const preferLocalCatalog = cfg.isStandaloneDev || cfg.isLocalHost || location.protocol === 'file:';
      const catalogCandidates = preferLocalCatalog
        ? [localCatalogUrl, '/api/decks']
        : ['/api/decks', localCatalogUrl];

      for (const catalogUrl of catalogCandidates) {
        try {
          const resp = await fetch(catalogUrl, { cache: 'no-store' });
          if (!resp.ok) continue;

          const data = await resp.json();
          const decks = Array.isArray(data?.decks) ? data.decks.map(normalizeDeckEntry).filter(Boolean) : [];
          decks.forEach((deck) => {
            if (!merged.some((existing) => existing.slug === deck.slug)) merged.push(deck);
          });
          break;
        } catch (error) {
          const scope = catalogUrl === '/api/decks'
            ? 'fetchTarotDeckCatalog.api-decks'
            : 'fetchTarotDeckCatalog.local-catalog';
          if (typeof cfg.logCaughtError === 'function') cfg.logCaughtError(scope, error);
        }
      }

      tarotDeckCatalog = merged;
      updateTarotDeckSelector();
      return tarotDeckCatalog;
    }

    async function publishTarotDeckToLive() {
      const nameInput = document.getElementById('tarotPublishDeckName');
      const slugInput = document.getElementById('tarotPublishDeckSlug');
      const keyInput = document.getElementById('tarotPublishAdminKey');
      const notes = document.getElementById('tarotMageDeckNotes');
      if (!nameInput || !slugInput || !keyInput) return;

      const name = (nameInput.value || '').trim();
      const slug = slugifyDeck((slugInput.value || '').trim() || name);
      const adminKey = (keyInput.value || '').trim();
      const manifestPayload = tarotDeckPromptPack || (notes?.textContent || '').trim();

      if (!name) {
        setStatus('Set a publish deck name first.');
        return;
      }
      if (!manifestPayload) {
        setStatus('Generate a deck brief first, then publish it.');
        return;
      }
      if (!adminKey) {
        setStatus('Admin key required for live deck publish.');
        return;
      }

      const body = {
        name,
        slug,
        source: 'tarot-atelier-dev',
        summary: 'Published from Tarot Atelier dev panel.',
        manifest: manifestPayload
      };

      try {
        const resp = await fetch('/api/decks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-deck-admin-key': adminKey
          },
          body: JSON.stringify(body)
        });
        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data?.error || 'Live deck publish failed');
        }

        tarotActiveDeckSlug = slug;
        localStorage.setItem('lumina_tarot_deck_slug', tarotActiveDeckSlug);
        await fetchTarotDeckCatalog();
        setStatus(`Deck published to live options: ${name}`);
      } catch (error) {
        try {
          const local = await cfg.callLocalRuntime('/local/decks/publish', body);
          if (local?.ok) {
            tarotActiveDeckSlug = slug;
            localStorage.setItem('lumina_tarot_deck_slug', tarotActiveDeckSlug);
            await fetchTarotDeckCatalog();
            setStatus(`Deck saved locally: ${name}. Configure /api/decks for cloud publish.`);
            return;
          }
        } catch (innerError) {
          if (typeof cfg.logCaughtError === 'function') cfg.logCaughtError('publishTarotDeckToLive.local-publish-fallback', innerError);
        }
        setStatus(error.message || 'Could not upload deck to live options.');
      }
    }

    function tarotCardMeta(card) {
      const upright = (card.keywords.upright || []).slice(0, 3).join(' - ');
      const reversed = (card.keywords.reversed || []).slice(0, 2).join(' - ');
      return { upright, reversed };
    }

    function tarotMatchesQuery(card, query) {
      if (!query) return true;
      const needle = query.toLowerCase();
      const haystack = [
        card.name,
        card.arcana,
        card.suit || '',
        card.meaning || '',
        card.description || '',
        ...(card.keywords.upright || []),
        ...(card.keywords.reversed || [])
      ].join(' ').toLowerCase();
      return haystack.includes(needle);
    }

    function renderTarotFeaturedCard(card) {
      const panel = document.getElementById('tarotFeaturedCard');
      const title = document.getElementById('tarotFeaturedTitle');
      const subtitle = document.getElementById('tarotFeaturedSubtitle');
      if (!panel || !card) return;

      const meta = tarotCardMeta(card);
      const tagList = [
        card.arcana,
        card.arcana === 'Major' ? `Major ${tarotRomanNumeral(card.name)}` : card.suit,
        ...(card.themes || []).slice(0, 3).map((theme) => theme.replaceAll('_', ' '))
      ].filter(Boolean);

      title.textContent = card.name;
      subtitle.textContent = card.meaning || 'selected card';
      panel.innerHTML = `
        <div class="tarot-featured-art">
          ${tarotCardImg(card.name, false)}
        </div>
        <div class="tarot-featured-copy">
          <div class="tarot-featured-title">
            <h3>${card.name}</h3>
            <span class="tarot-featured-number">${card.arcana}${card.number !== undefined && card.number !== null ? ` ${tarotRomanNumeral(card.name)}` : ''}</span>
          </div>
          <div class="tarot-featured-legend">
            ${tagList.map((tag) => `<span class="tag">${cfg.escapeHtml(String(tag))}</span>`).join('')}
          </div>
          <p class="tarot-featured-note">${cfg.escapeHtml(card.description || card.meaning || '')}</p>
          <div class="tarot-featured-tags">
            <span class="tarot-chip pos-chip selected">${cfg.escapeHtml(meta.upright || 'upright keywords')}</span>
            <span class="tarot-chip rev-chip selected">${cfg.escapeHtml(meta.reversed || 'reversed keywords')}</span>
          </div>
        </div>
      `;
    }

    function refreshTarotGalleryStatus(filteredCount, totalCount) {
      const el = document.getElementById('tarotGalleryStatus');
      if (!el) return;
      const queryText = tarotSearchQuery ? ` for "${tarotSearchQuery}"` : '';
      el.textContent = `${filteredCount} of ${totalCount} cards visible${queryText}.`;
    }

    function updateTarotCardsGrid() {
      const grid = document.getElementById('tarotCardsGrid');
      if (!grid) return;
      const allCards = global._TAROT_CARDS || [];
      const cards = allCards.filter((card) => tarotMatchesQuery(card, tarotSearchQuery));
      const featured = cards.find((card) => card.name === tarotSelectedCardName) || cards[0] || allCards[0];
      if (featured) {
        tarotSelectedCardName = featured.name;
        renderTarotFeaturedCard(featured);
      }

      grid.innerHTML = '';
      cards.forEach((card) => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = `tarot-card-tile${card.name === tarotSelectedCardName ? ' selected' : ''}`;
        const meta = tarotCardMeta(card);
        tile.innerHTML = `
          ${tarotCardImg(card.name, false)}
          <div class="tarot-card-tile-note">
            <span>${card.arcana}</span>
            <span>${card.suit || `#${tarotRomanNumeral(card.name)}`}</span>
          </div>
          <div class="tarot-card-name">${card.name}</div>
          <div class="tarot-card-chip-row">
            <span class="tarot-mini-chip">${cfg.escapeHtml(meta.upright.split(' - ')[0] || 'open')}</span>
            <span class="tarot-mini-chip">${cfg.escapeHtml(meta.reversed.split(' - ')[0] || 'shadow')}</span>
          </div>
        `;
        tile.addEventListener('click', () => {
          tarotSelectedCardName = card.name;
          updateTarotCardsGrid();
          document.getElementById('tarotCards')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        grid.appendChild(tile);
      });

      refreshTarotGalleryStatus(cards.length, allCards.length);
    }

    function buildTarotSourceManifest() {
      const cards = global._TAROT_CARDS || [];
      const activeDeck = getActiveDeckEntry();
      const referenceSources = getTarotReferenceSources();
      return {
        deckTheme: 'Edgy, tasteful witch deck with velvet purples, brass gold, candlelit chiaroscuro, recurring characters, and cohesive occult symbolism.',
        referenceSources,
        selectedDeckOption: activeDeck ? {
          slug: activeDeck.slug,
          name: activeDeck.name,
          summary: activeDeck.summary,
          source: activeDeck.source,
          manifestPath: activeDeck.manifestPath || null
        } : null,
        visualRules: [
          'Preserve a consistent cast of archetypal characters across the deck.',
          'Keep wardrobe, face structure, hand styling, and framing coherent card to card.',
          'Use the existing source art as style and symbolism reference, not random inspiration.',
          'Prefer premium editorial fantasy illustration quality over generic AI gloss.'
        ],
        cards: cards.map((card) => ({
          name: card.name,
          arcana: card.arcana,
          suit: card.suit || null,
          number: card.number,
          meaning: card.meaning,
          description: card.description,
          keywords: card.keywords,
          sourceArt: TAROT_IMAGE_MAP[card.name] ? `data/cards/${TAROT_IMAGE_MAP[card.name]}` : null
        }))
      };
    }

    function updateTarotDevStatus(message, isError) {
      const statusEl = document.getElementById('tarotDevStatus');
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.style.color = isError ? 'var(--coral)' : 'var(--gold)';
    }

    async function refreshTarotDevMenu() {
      const panel = document.getElementById('tarotDevPanel');
      const launchBtn = document.getElementById('tarotDevLaunchMageBtn');
      const generateBtn = document.getElementById('tarotGenerateDeckBtn');
      if (!panel || !launchBtn || !generateBtn) return { running: false, launchable: false };

      try {
        const base = cfg.getLocalRuntimeUrl();
        const response = await fetch(`${base}/local/mage/status`, { cache: 'no-store' });
        const data = await response.json();
        const running = Boolean(response.ok && (data.running || data.httpReady));
        const launchable = Boolean(response.ok && (data.launchable || running));

        panel.classList.remove('hidden');
        launchBtn.disabled = !launchable || running;
        generateBtn.disabled = !running;

        if (!launchable) {
          updateTarotDevStatus('Mage not detected on this system. Dev deck tools stay hidden.', true);
        } else if (running) {
          const modeLabel = data.mode ? ` (${data.mode})` : '';
          updateTarotDevStatus(`Mage running${modeLabel}${data.pid ? ` (pid ${data.pid})` : ''}. Dev deck tools unlocked.`);
        } else {
          updateTarotDevStatus(`Mage detected from ${data.detectedFrom || 'local roots'}. Launch to enable deck generation.`);
        }

        return { running, launchable, data };
      } catch (error) {
        if (typeof cfg.logCaughtError === 'function') cfg.logCaughtError('refreshTarotDevMenu', error);
        panel.classList.add('hidden');
        launchBtn.disabled = true;
        generateBtn.disabled = true;
        updateTarotDevStatus('Local runtime offline. Start standalone/local-runtime.js first.', true);
        return { running: false, launchable: false };
      }
    }

    async function generateTarotDeckFromSourceArt() {
      const notes = document.getElementById('tarotMageDeckNotes');
      if (!notes) return;
      notes.textContent = 'Generating a source-art tarot deck brief with Mage...';
      try {
        const manifest = buildTarotSourceManifest();
        const activeDeck = getActiveDeckEntry();
        const continuitySeed = activeDeck && activeDeck.slug !== 'classic-source'
          ? `\n\nContinuity seed from active deck option:\n- name: ${activeDeck.name}\n- slug: ${activeDeck.slug}\n- summary: ${activeDeck.summary || 'n/a'}\n- source: ${activeDeck.source || 'published'}\nUse this as style continuity guidance.`
          : '';
        const prompt = `You are connected to a Mage image generation server with the tools required to create a tarot deck. Use the current source art deck plus licensed reference links in the manifest as the reference bible and generate a production-ready deck plan.\n\nTask:\n- Create a full 78-card deck generation brief from the supplied source deck.\n- Preserve character consistency, visual language, wardrobe logic, palette discipline, and occult symbolism across the full deck.\n- Use deep purple, brass gold, ink black, candle glow, velvet shadows, and premium editorial fantasy illustration quality.\n- Only use reference links that are provided in the manifest and marked as licensed/approved.\n- Assume the downstream image tools are available to you through Mage. If possible, prepare the response so it can be used directly by those tools.\n\nRequired response shape:\n- Start with a short deck-level art direction summary.\n- Then output valid JSON only with: styleGuide, recurringCharacters, and cards.\n- Each card entry must include: name, sourceArt, prompt, negativePrompt, compositionNotes, paletteNotes, characterContinuityNotes.${continuitySeed}\n\nSource deck manifest:\n${JSON.stringify(manifest, null, 2)}`;
        const result = await cfg.callLocalRuntime('/local/bridge', {
          provider: 'mage-local',
          prompt,
          skyContext: '',
          contextHints: ['mage-system', 'archivist-projects']
        });
        tarotDeckPromptPack = typeof result?.data === 'string' ? result.data : JSON.stringify(result?.data || result, null, 2);
        await saveTarotDeckManifest(tarotDeckPromptPack, 'tarot-deck-full');
        notes.textContent = tarotDeckPromptPack;
        updateTarotDevStatus('Mage deck brief generated from source art.');
        setStatus('Mage tarot deck brief generated.');
      } catch (error) {
        tarotDeckPromptPack = '';
        notes.textContent = 'Mage deck generation is unavailable. Launch Mage from Dev, then retry once the local bridge is ready.';
        updateTarotDevStatus(error.message || 'Could not generate deck from source art.', true);
        setStatus(error.message || 'Could not generate Mage deck brief.');
      }
    }

    async function saveTarotDeckManifest(manifestText, slug) {
      try {
        const saved = await cfg.callLocalRuntime('/local/decks/save', {
          slug,
          source: 'tarot-dev-menu',
          manifest: manifestText
        });
        const path = saved?.saved?.filePath || '';
        if (path) {
          setStatus(`Saved deck manifest: ${path}`);
        }
      } catch (error) {
        setStatus(error.message || 'Could not save deck manifest.');
      }
    }

    async function regenerateSingleTarotCardFromSourceArt() {
      const notes = document.getElementById('tarotMageDeckNotes');
      const cardStatus = document.getElementById('tarotDevCardStatus');
      const cardInput = document.getElementById('tarotDevCardInput');
      if (!notes || !cardInput || !cardStatus) return;

      const cardName = (cardInput.value || '').trim();
      const card = (global._TAROT_CARDS || []).find((item) => item.name.toLowerCase() === cardName.toLowerCase());
      if (!card) {
        cardStatus.textContent = 'Choose a valid card name from the deck list.';
        cardStatus.style.color = 'var(--coral)';
        return;
      }

      cardStatus.textContent = `Regenerating ${card.name} with style lock...`;
      cardStatus.style.color = 'var(--gold)';

      const sourceImage = TAROT_IMAGE_MAP[card.name] ? `data/cards/${TAROT_IMAGE_MAP[card.name]}` : 'unknown';
      const continuityContext = tarotDeckPromptPack
        ? `Use this previously generated deck context for style continuity:\n${tarotDeckPromptPack}`
        : 'No prior generated deck context is available. Infer continuity from source-art style and deck archetypes.';

      try {
        const prompt = `Regenerate a single tarot card while locking style continuity with the full deck.\n\nTarget card:\n- name: ${card.name}\n- arcana: ${card.arcana}\n- suit: ${card.suit || 'major'}\n- sourceArt: ${sourceImage}\n- meaning: ${card.meaning}\n- description: ${card.description}\n- keywords upright: ${(card.keywords?.upright || []).join(', ')}\n- keywords reversed: ${(card.keywords?.reversed || []).join(', ')}\n\nConstraints:\n- Keep recurring character style, costume motifs, framing language, and palette consistency with the deck.\n- Preserve symbolism of this card while improving image quality.\n- Provide output as valid JSON with fields: cardName, prompt, negativePrompt, compositionNotes, paletteNotes, continuityNotes.\n\n${continuityContext}`;

        const result = await cfg.callLocalRuntime('/local/bridge', {
          provider: 'mage-local',
          prompt,
          skyContext: '',
          contextHints: ['mage-system', 'archivist-projects']
        });

        const singleCardBrief = typeof result?.data === 'string' ? result.data : JSON.stringify(result?.data || result, null, 2);
        notes.textContent = singleCardBrief;
        await saveTarotDeckManifest(singleCardBrief, `tarot-card-${card.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`);
        cardStatus.textContent = `${card.name} regenerated and saved.`;
        cardStatus.style.color = 'var(--teal)';
        setStatus(`${card.name} regeneration brief created.`);
      } catch (error) {
        cardStatus.textContent = error.message || 'Single card regeneration failed.';
        cardStatus.style.color = 'var(--coral)';
        setStatus(error.message || 'Could not regenerate single card.');
      }
    }

    function scoreTarotThemes(themeValues) {
      const data = getLatestData();
      const aspectData = getLatestAspects();
      if (!data.length) return { score: 0, details: [] };

      const lexiconMap = {};
      (cfg.themeLexicon || []).forEach((t) => { lexiconMap[t.key] = t; });

      const seenKeys = new Set();
      let totalScore = 0;
      let count = 0;
      const details = [];

      themeValues.forEach((themeVal) => {
        const lexKey = TAROT_THEME_TO_LEXICON[themeVal];
        if (!lexKey || seenKeys.has(lexKey)) return;
        seenKeys.add(lexKey);
        const lex = lexiconMap[lexKey];
        if (!lex) return;

        const supports = cfg.aspectSupportsTheme(lex, aspectData);
        const retros = lex.planets.filter((name) => data.find((p) => p.key === name)?.retrograde).length;
        const themeScore = Math.min(95, 30 + supports.length * 12 + retros * 6);
        totalScore += themeScore;
        count++;

        const aspectStr = supports.length
          ? supports.map((a) => `${a.a.key} ${a.aspect.name.toLowerCase()} ${a.b.key} (${a.orb.toFixed(1)}deg)`).join(', ')
          : null;
        const retroPlanets = retros > 0
          ? lex.planets.filter((n) => data.find((p) => p.key === n)?.retrograde)
          : [];
        details.push({ themeVal, lexKey, label: lex.label, themeScore, aspectStr, retroPlanets });
      });

      const overall = count > 0 ? Math.round(totalScore / count) : 0;
      return { score: overall, details };
    }

    function _capLabel(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function buildTarotKeywordCloud(period) {
      const capPeriod = _capLabel(period);
      const cloud = document.getElementById(`tarotCloud${capPeriod}`);
      const countEl = document.getElementById(`tarotCount${capPeriod}`);
      if (!cloud) return;
      cloud.innerHTML = '';
      const sel = tarotKwSelections[period];

      CURATED_KW_CLOUD.forEach((group) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'tarot-valence-group';

        const labelEl = document.createElement('div');
        labelEl.className = `tarot-valence-label valence-${group.valence}`;
        labelEl.textContent = group.label;
        groupEl.appendChild(labelEl);

        const chipsWrap = document.createElement('div');
        chipsWrap.className = 'tarot-kw-cloud';

        group.keywords.forEach(({ kw }) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `tarot-chip ${group.valence}-chip${sel.has(kw) ? ' selected' : ''}`;
          btn.textContent = kw;
          btn.addEventListener('click', () => {
            if (sel.has(kw)) { sel.delete(kw); btn.classList.remove('selected'); }
            else { sel.add(kw); btn.classList.add('selected'); }
            countEl.textContent = sel.size ? `${sel.size} selected` : '';
          });
          chipsWrap.appendChild(btn);
        });

        groupEl.appendChild(chipsWrap);
        cloud.appendChild(groupEl);
      });

      countEl.textContent = sel.size ? `${sel.size} selected` : '';
    }

    function generateKeywordReading() {
      const latestData = getLatestData();
      const latestAspects = getLatestAspects();

      const periods = [
        { key: 'today', label: 'Today', sel: tarotKwSelections.today },
        { key: 'week', label: 'This Week', sel: tarotKwSelections.week },
        { key: 'month', label: 'This Month', sel: tarotKwSelections.month }
      ].filter((p) => p.sel.size > 0);

      if (!periods.length) { setStatus('Select at least one feeling keyword first.'); return; }
      if (!latestData.length) { setStatus('Sky chart not loaded yet.'); return; }

      let html = '';
      let totalScore = 0;
      let periodCount = 0;

      periods.forEach(({ label, sel }) => {
        const selectedKws = Array.from(sel);
        const allThemes = [];
        selectedKws.forEach((kw) => {
          const themes = _curatedKwMap.get(kw) || getTarotKwThemeMap().get(kw) || [];
          themes.forEach((t) => { if (!allThemes.includes(t)) allThemes.push(t); });
        });

        const result = scoreTarotThemes(allThemes);
        totalScore += result.score;
        periodCount++;

        html += `<div class="tarot-card-result">
          <div class="t-card-pos">${label}</div>
          <div class="t-card-name" style="color:var(--violet);margin:3px 0;">${result.score}% sky alignment</div>
          <div class="t-card-kw">${selectedKws.join(' - ')}</div>`;

        if (result.details.length) {
          result.details.forEach((d) => {
            html += `<div class="t-sky-note">${d.label}`;
            if (d.aspectStr) html += ` - ${d.aspectStr}`;
            if (d.retroPlanets.length) html += ` - ${d.retroPlanets.join(', ')} retrograde`;
            html += '</div>';
          });
        } else {
          html += '<div class="t-sky-note">No direct aspect matches in the current sky - this energy runs beneath the surface transits.</div>';
        }
        html += '</div>';
      });

      const overall = periodCount > 0 ? Math.round(totalScore / periodCount) : 0;
      const signature = cfg.currentSkySignature(latestData, latestAspects);

      html = `<div class="tarot-align-bar">Overall sky alignment: ${overall}%</div>` + html;
      const retroNote = signature.retrogrades.length
        ? `Active retrogrades: ${signature.retrogrades.join(', ')} - themes tied to these planets carry a reflective or inward quality.`
        : 'No major retrogrades active.';
      html += `<div class="t-sky-note" style="margin-top:8px;">${retroNote} Moon is ${signature.phaseName} in ${signature.moon.sign.name}.</div>`;

      const out = document.getElementById('tarotKeywordOutput');
      out.innerHTML = html;
      out.classList.remove('hidden');
      document.getElementById('tarotKeywordActions').classList.remove('hidden');

      lastTarotKwReading = `Feeling Cloud Reading - Sky Alignment: ${overall}%\n` +
        periods.map(({ label, sel }) => `${label}: ${Array.from(sel).join(', ')}`).join('\n');
    }

    function buildSpreadSlots() {
      const spread = document.getElementById('tarotSpreadSelect').value;
      const positions = TAROT_SPREADS[spread]?.positions || [];
      const showHints = document.getElementById('tarotPositionEffects').checked;
      const slotsEl = document.getElementById('tarotCardSlots');
      slotsEl.innerHTML = '';
      slotsEl.style.gridTemplateColumns = positions.length <= 3 ? '1fr' : 'repeat(2, 1fr)';

      positions.forEach((pos, i) => {
        const slot = document.createElement('div');
        slot.className = 'tarot-slot';
        slot.dataset.index = i;
        slot.innerHTML = `
          <div class="tarot-slot-label">${pos.label}</div>
          ${showHints ? `<div class="tarot-slot-pos-hint">${pos.hint}</div>` : ''}
          <div class="tarot-slot-row">
            <input type="text" class="tarot-card-input" list="tarotCardNames" placeholder="Card name..." autocomplete="off">
            <button type="button" class="tarot-orient-btn" data-reversed="false">Upright</button>
          </div>
          <div class="tarot-slot-kw-preview"></div>
        `;
        const orientBtn = slot.querySelector('.tarot-orient-btn');
        const input = slot.querySelector('.tarot-card-input');
        const preview = slot.querySelector('.tarot-slot-kw-preview');

        function refreshSlotPreview() {
          const name = (input.value || '').trim();
          const cards = global._TAROT_CARDS || [];
          const card = cards.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (card) {
            const rev = orientBtn.dataset.reversed === 'true';
            const kws = rev ? card.keywords.reversed : card.keywords.upright;
            const kwColor = rev ? 'var(--coral)' : 'var(--violet)';
            preview.innerHTML = `<div class="tarot-slot-card-preview">
              ${tarotCardImg(card.name, rev)}
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.72rem;color:var(--muted);line-height:1.5;margin-bottom:4px;">${cfg.escapeHtml(card.meaning)}</div>
                <div style="font-size:0.7rem;color:${kwColor};">${kws.join(' - ')}</div>
              </div>
            </div>`;
          } else {
            preview.innerHTML = '';
          }
        }

        orientBtn.addEventListener('click', () => {
          const rev = orientBtn.dataset.reversed === 'true';
          orientBtn.dataset.reversed = String(!rev);
          orientBtn.textContent = rev ? 'Upright' : 'Reversed';
          orientBtn.classList.toggle('reversed', !rev);
          refreshSlotPreview();
        });
        input.addEventListener('input', refreshSlotPreview);
        input.addEventListener('change', refreshSlotPreview);
        slotsEl.appendChild(slot);
      });
    }

    function interpretSpread() {
      const cards = global._TAROT_CARDS;
      const latestData = getLatestData();
      const latestAspects = getLatestAspects();

      if (!cards) { setStatus('Tarot data still loading - try again in a moment.'); return; }
      if (!latestData.length) { setStatus('Sky chart not loaded yet.'); return; }

      const spread = document.getElementById('tarotSpreadSelect').value;
      const positions = TAROT_SPREADS[spread]?.positions || [];
      const positionEffects = document.getElementById('tarotPositionEffects').checked;
      const slots = document.querySelectorAll('#tarotCardSlots .tarot-slot');

      const cardResults = [];
      let hasAny = false;
      let totalScore = 0;
      let scoredCount = 0;

      slots.forEach((slot, i) => {
        const input = slot.querySelector('.tarot-card-input');
        const orientBtn = slot.querySelector('.tarot-orient-btn');
        const name = (input?.value || '').trim();
        const pos = positions[i];
        if (!name || !pos) return;

        const card = cards.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (!card) {
          cardResults.push({ pos, name, error: `"${name}" not found in the 78-card deck.` });
          return;
        }

        hasAny = true;
        const reversed = orientBtn?.dataset.reversed === 'true';
        const keywords = reversed ? card.keywords.reversed : card.keywords.upright;
        const result = scoreTarotThemes(card.themes);

        let posModifier = 0;
        if (positionEffects) {
          const lbl = pos.label.toLowerCase();
          if (lbl.includes('past') || lbl.includes('foundation')) posModifier = -8;
          if (lbl.includes('future') || lbl.includes('outcome') || lbl.includes('crown')) posModifier = 5;
          if (lbl.includes('challenge') || lbl.includes('obstacle')) posModifier = -5;
          if (lbl.includes('guidance') || lbl.includes('action')) posModifier = 3;
        }
        const finalScore = Math.min(95, Math.max(5, result.score + posModifier));
        totalScore += finalScore;
        scoredCount++;
        cardResults.push({ pos, name, card, reversed, keywords, result, finalScore });
      });

      if (!hasAny) { setStatus('Enter at least one card name.'); return; }

      const overallScore = scoredCount ? Math.round(totalScore / scoredCount) : 0;
      const signature = cfg.currentSkySignature(latestData, latestAspects);

      let html = `<div class="tarot-align-bar">Reading Alignment: ${overallScore}% - Moon ${signature.phaseName} in ${signature.moon.sign.name}</div>`;
      const TAROT_MEANING_CITE = 'Waite, The Pictorial Key to the Tarot (1910) - Pollack, Seventy-Eight Degrees of Wisdom (1980)';

      cardResults.forEach((r) => {
        if (r.error) {
          html += `<div class="tarot-card-result"><div class="t-card-pos">${r.pos.label}</div><div class="t-card-desc" style="color:var(--coral);">${r.error}</div></div>`;
          return;
        }
        let skyNote = `Sky alignment ${r.finalScore}%`;
        if (r.result.details.length) {
          const top = r.result.details[0];
          skyNote += ` - ${top.label}`;
          if (top.aspectStr) skyNote += `: ${top.aspectStr}`;
          if (top.retroPlanets.length) skyNote += ` (${top.retroPlanets.join(', ')} retrograde)`;
        }
        html += `<div class="tarot-card-result">
          <div class="t-card-pos">${r.pos.label}</div>
          <div class="tarot-card-result-row">
            ${tarotCardImg(r.card.name, r.reversed)}
            <div class="t-result-text">
              <div class="t-card-name">${r.card.name}</div>
              <div class="t-card-orient">${r.reversed ? 'Reversed' : 'Upright'} - ${r.card.arcana} Arcana${r.card.suit ? ' - ' + r.card.suit : ''}</div>
              ${positionEffects && r.pos.hint ? `<div class="t-card-pos-hint">${r.pos.hint}</div>` : ''}
              <div class="t-card-kw">${r.keywords.join(' - ')}</div>
              <div class="t-card-desc">${cfg.escapeHtml(r.card.description)}</div>
              <div class="t-sky-note">${skyNote}</div>
              <div class="t-card-cite"><span class="cite-label">Grounded in</span>${TAROT_MEANING_CITE}</div>
            </div>
          </div>
        </div>`;
      });

      if (signature.retrogrades.length) {
        html += `<div class="t-sky-note" style="margin-top:8px;">Active retrogrades: ${signature.retrogrades.join(', ')}.</div>`;
      }

      const out = document.getElementById('tarotSpreadOutput');
      out.innerHTML = html;
      out.classList.remove('hidden');
      document.getElementById('tarotSpreadActions').classList.remove('hidden');

      lastTarotSpreadReading = `Tarot Spread Reading - ${overallScore}% sky alignment\n` +
        cardResults.filter((r) => r.card).map((r) =>
          `${r.pos.label}: ${r.card.name} (${r.reversed ? 'Reversed' : 'Upright'}) - ${r.keywords.join(', ')}`
        ).join('\n');
    }

    function initTarotTab() {
      if (tarotTabInited) return;
      tarotTabInited = true;

      const dl = document.getElementById('tarotCardNames');
      const cards = global._TAROT_CARDS || [];
      cards.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.name;
        dl.appendChild(opt);
      });

      ['today', 'week', 'month'].forEach(buildTarotKeywordCloud);

      const searchInput = document.getElementById('tarotCardSearch');
      searchInput?.addEventListener('input', () => {
        tarotSearchQuery = searchInput.value.trim();
        updateTarotCardsGrid();
      });

      document.getElementById('tarotClearSearchBtn')?.addEventListener('click', () => {
        tarotSearchQuery = '';
        if (searchInput) searchInput.value = '';
        updateTarotCardsGrid();
      });

      document.getElementById('tarotOpenGalleryBtn')?.addEventListener('click', () => {
        document.querySelector('[data-subnav="cards"]')?.click();
        document.getElementById('tarotCards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      document.getElementById('tarotOpenSettingsBtn')?.addEventListener('click', () => {
        document.querySelector('[data-tab="settings"]')?.click();
        document.querySelector('[data-settings-panel="tarot"]')?.click();
      });

      document.getElementById('tarotDeckOptionSelect')?.addEventListener('change', (event) => {
        setActiveDeckSlug(event.target.value);
        document.getElementById('tarotDeckOptionSelectPublic').value = tarotActiveDeckSlug;
        const active = getActiveDeckEntry();
        setStatus(active ? `Active deck option: ${active.name}` : 'Active deck option updated.');
      });

      document.getElementById('tarotDeckOptionSelectPublic')?.addEventListener('change', (event) => {
        setActiveDeckSlug(event.target.value);
        document.getElementById('tarotDeckOptionSelect').value = tarotActiveDeckSlug;
        const active = getActiveDeckEntry();
        setStatus(active ? `Active deck option: ${active.name}` : 'Active deck option updated.');
      });

      document.getElementById('tarotRefreshDeckOptionsBtn')?.addEventListener('click', async () => {
        await fetchTarotDeckCatalog();
        setStatus('Deck options refreshed.');
      });

      document.getElementById('tarotRefreshDeckOptionsBtnPublic')?.addEventListener('click', async () => {
        await fetchTarotDeckCatalog();
        setStatus('Deck options refreshed.');
      });

      document.getElementById('tarotPublishDeckBtn')?.addEventListener('click', publishTarotDeckToLive);
      document.getElementById('tarotDevLaunchMageBtn')?.addEventListener('click', async () => {
        await cfg.launchMageServer();
        await refreshTarotDevMenu();
      });
      document.getElementById('tarotGenerateDeckBtn')?.addEventListener('click', generateTarotDeckFromSourceArt);
      document.getElementById('tarotRegenerateCardBtn')?.addEventListener('click', regenerateSingleTarotCardFromSourceArt);
      document.getElementById('tarotCopyManifestBtn')?.addEventListener('click', async () => {
        const manifest = JSON.stringify(buildTarotSourceManifest(), null, 2);
        try {
          await navigator.clipboard.writeText(manifest);
          setStatus('Tarot source manifest copied.');
        } catch (error) {
          if (typeof cfg.logCaughtError === 'function') cfg.logCaughtError('tarotCopyManifest', error);
          setStatus('Could not copy the tarot source manifest.');
        }
      });

      document.getElementById('tarotFocusJournalBtn')?.addEventListener('click', () => {
        document.querySelector('[data-tab="journal"]')?.click();
        const input = document.getElementById('journalChatInput');
        if (input) {
          input.value = 'Pull the latest tarot reading into my journal context and interpret the deck mood against my current entries.';
          input.focus();
        }
      });

      document.getElementById('tarotSaveReferenceSourcesBtn')?.addEventListener('click', () => {
        const sourceInput = document.getElementById('tarotReferenceSources');
        if (!sourceInput) return;
        const cleaned = sourceInput.value
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .join('\n');
        localStorage.setItem(TAROT_REFERENCE_SOURCES_KEY, cleaned || DEFAULT_TAROT_REFERENCE_SOURCES);
        syncTarotSettingsFields();
        setStatus('Tarot reference sources saved for deck generation.');
      });

      updateTarotCardsGrid();
      fetchTarotDeckCatalog();
      syncTarotSettingsFields();
      refreshTarotDevMenu();

      document.querySelectorAll('.tarot-period-header').forEach((header) => {
        header.addEventListener('click', () => {
          const period = header.dataset.period;
          const body = document.getElementById(`tarotBody${_capLabel(period)}`);
          const icon = header.querySelector('.tarot-period-toggle-icon');
          const isOpen = body.classList.contains('open');
          body.classList.toggle('open', !isOpen);
          icon.classList.toggle('open', !isOpen);
        });
      });

      document.getElementById('tarotSpreadSelect').addEventListener('change', buildSpreadSlots);
      document.getElementById('tarotPositionEffects').addEventListener('change', buildSpreadSlots);

      document.getElementById('tarotMapBtn').addEventListener('click', generateKeywordReading);
      document.getElementById('tarotInterpretBtn').addEventListener('click', interpretSpread);

      document.getElementById('tarotClearAllBtn').addEventListener('click', () => {
        ['today', 'week', 'month'].forEach((p) => { tarotKwSelections[p].clear(); buildTarotKeywordCloud(p); });
        document.getElementById('tarotKeywordOutput').classList.add('hidden');
        document.getElementById('tarotKeywordActions').classList.add('hidden');
        lastTarotKwReading = null;
      });

      document.getElementById('tarotClearSpreadBtn').addEventListener('click', () => {
        buildSpreadSlots();
        document.getElementById('tarotSpreadOutput').classList.add('hidden');
        document.getElementById('tarotSpreadActions').classList.add('hidden');
        lastTarotSpreadReading = null;
      });

      document.getElementById('tarotSaveKwBtn').addEventListener('click', async () => {
        if (!getJournalKey()) { setStatus('Unlock your journal first.'); return; }
        if (!lastTarotKwReading) return;
        await cfg.journalAddEntry(lastTarotKwReading, null, null, cfg.getMoonPhaseName(new Date()), 'tarot-cloud');
        setStatus('Feeling cloud reading saved to journal.');
      });

      document.getElementById('tarotSaveSpreadBtn').addEventListener('click', async () => {
        if (!getJournalKey()) { setStatus('Unlock your journal first.'); return; }
        if (!lastTarotSpreadReading) return;
        await cfg.journalAddEntry(lastTarotSpreadReading, null, null, cfg.getMoonPhaseName(new Date()), 'tarot-spread');
        setStatus('Spread reading saved to journal.');
      });

      document.getElementById('tarotAIKwBtn').addEventListener('click', () => {
        if (!lastTarotKwReading) return;
        global._lastTarotContext = lastTarotKwReading;
        document.querySelector('[data-tab="journal"]').click();
        const input = document.getElementById('journalChatInput');
        if (input) { input.value = 'Interpret my feeling cloud reading in relation to my current sky.'; input.focus(); }
        setStatus('Tarot context loaded. Send the journal AI prompt to use it.');
      });

      document.getElementById('tarotAISpreadBtn').addEventListener('click', () => {
        if (!lastTarotSpreadReading) return;
        global._lastTarotContext = lastTarotSpreadReading;
        document.querySelector('[data-tab="journal"]').click();
        const input = document.getElementById('journalChatInput');
        if (input) { input.value = 'Interpret my tarot reading in relation to my current sky and journal entries.'; input.focus(); }
        setStatus('Tarot context loaded. Send the journal AI prompt to use it.');
      });

      buildSpreadSlots();

      document.querySelectorAll('.tarot-subnav-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tarot-subnav-btn').forEach((b) => b.classList.remove('active'));
          document.querySelectorAll('.tarot-sub-panel').forEach((p) => p.classList.remove('active'));
          btn.classList.add('active');
          const panelId = 'tarot' + btn.dataset.subnav.charAt(0).toUpperCase() + btn.dataset.subnav.slice(1);
          const panel = document.getElementById(panelId);
          if (panel) panel.classList.add('active');
          if (btn.dataset.subnav === 'cards') updateTarotCardsGrid();
        });
      });

      updateTarotCardsGrid();

      document.getElementById('tarotFromJournalBtn').addEventListener('click', () => {
        const entry = getJournalEntries()[0];
        if (!entry) { setStatus('No journal entries found. Write one first.'); return; }
        const text = entry.text || '';
        const themes = cfg.detectThemes(text);
        const cardList = global._TAROT_CARDS || [];
        const themeVals = Object.values(themes).filter(Boolean);
        const matched = cardList.filter((c) => c.themes && c.themes.some((t) => themeVals.includes(t)));
        if (!matched.length) { setStatus('No matching cards found for your latest entry themes.'); return; }

        document.querySelectorAll('.tarot-subnav-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.subnav === 'cards');
        });
        document.querySelectorAll('.tarot-sub-panel').forEach((p) => p.classList.remove('active'));
        document.getElementById('tarotCards').classList.add('active');
        updateTarotCardsGrid();
        const grid = document.getElementById('tarotCardsGrid');
        grid.querySelectorAll('.tarot-card-tile').forEach((tile) => {
          const name = tile.querySelector('.tarot-card-name')?.textContent || '';
          tile.classList.toggle('selected', matched.some((card) => card.name === name));
        });
        setStatus(`Showing ${matched.length} cards matching themes from your latest entry.`);
      });
    }

    return {
      buildTarotSourceManifest,
      initTarotTab,
      refreshTarotDevMenu,
      saveTarotDeckManifest,
      syncTarotSettingsFields
    };
  }

  global.LuminaTarot = {
    createTarotUx
  };
})(window);

(function (global) {
  function createJournalUx(config) {
    const cfg = config || {};

    let dreamSymbolCatalogCache = null;
    let dreamSourceIndexCache = null;

    function escapeRegex(text) {
      return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async function loadDreamSymbolCatalog() {
      if (dreamSymbolCatalogCache) return dreamSymbolCatalogCache;
      const resp = await fetch('data/dream-symbols.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('Could not load dream symbol catalog.');
      const data = await resp.json();
      dreamSymbolCatalogCache = Array.isArray(data?.symbols) ? data.symbols : [];
      return dreamSymbolCatalogCache;
    }

    async function loadDreamSourceIndex() {
      if (dreamSourceIndexCache) return dreamSourceIndexCache;
      const resp = await fetch('standalone/interpretation-sources.json', { cache: 'no-store' });
      if (!resp.ok) throw new Error('Could not load interpretation sources.');
      const data = await resp.json();
      const idx = {};
      ['tarot', 'astrology', 'dream', 'repos'].forEach((bucket) => {
        (data?.[bucket] || []).forEach((item) => {
          if (item?.id) idx[item.id] = item;
        });
      });
      dreamSourceIndexCache = idx;
      return dreamSourceIndexCache;
    }

    function matchDreamSymbolsFromCatalog(text, symbols) {
      const lower = ` ${String(text || '').toLowerCase()} `;
      const found = [];
      (symbols || []).forEach((sym) => {
        const aliases = Array.isArray(sym?.aliases) ? sym.aliases : [];
        const hit = aliases.find((a) => new RegExp(`\\b${escapeRegex(String(a).toLowerCase())}\\b`).test(lower));
        if (hit) {
          found.push({
            key: sym.key,
            label: aliases[0] || sym.key || 'symbol',
            meaning: sym.meaning || '',
            sourceRefs: Array.isArray(sym.sourceRefs) ? sym.sourceRefs : []
          });
        }
      });
      return found;
    }

    function formatDreamSourceCitation(sourceRefs, sourceIndex) {
      const refs = (sourceRefs || []).map((id) => sourceIndex?.[id]).filter(Boolean);
      if (!refs.length) return '';
      return refs
        .map((s) => `${s.author || 'Unknown'}, ${s.title || 'Untitled'} (${s.year || 'n.d.'})`)
        .join(' · ');
    }

    async function renderDreamCitedInterpretation(text) {
      const out = document.getElementById('dreamCitedOutput');
      if (!out) return;

      try {
        const [symbols, sourceIndex] = await Promise.all([
          loadDreamSymbolCatalog(),
          loadDreamSourceIndex()
        ]);
        const matches = matchDreamSymbolsFromCatalog(text, symbols);
        if (!matches.length) {
          out.classList.remove('hidden');
          out.innerHTML = '<div class="dream-cited-title">Dream Symbols (Local Catalog)</div><p class="dream-cited-empty">No catalogued symbols matched this entry yet. Add more concrete images (objects, locations, people, animals, sensations) for a cited read.</p>';
          return;
        }

        const rows = matches.slice(0, 8).map((m) => {
          const citation = formatDreamSourceCitation(m.sourceRefs, sourceIndex);
          const meaning = cfg.escapeHtml(m.meaning || 'No meaning mapped.');
          const label = cfg.escapeHtml(m.label);
          const citeHtml = citation
            ? `<div class="dream-cited-cite"><span class="cite-label">Grounded in</span>${cfg.escapeHtml(citation)}</div>`
            : '';
          return `<div class="dream-cited-row"><div class="dream-cited-symbol">${label}</div><div class="dream-cited-meaning">${meaning}</div>${citeHtml}</div>`;
        }).join('');

        out.classList.remove('hidden');
        out.innerHTML = `<div class="dream-cited-title">Dream Symbols (Local Catalog)</div>${rows}`;
      } catch (error) {
        if (typeof cfg.logCaughtError === 'function') cfg.logCaughtError('renderDreamCitedInterpretation', error);
        out.classList.remove('hidden');
        out.innerHTML = '<div class="dream-cited-title">Dream Symbols (Local Catalog)</div><p class="dream-cited-empty">Local cited dream interpretation is currently unavailable.</p>';
      }
    }

    function buildJournalContext(question) {
      const journalEntries = typeof cfg.getJournalEntries === 'function' ? cfg.getJournalEntries() : [];
      const recent = journalEntries.slice(0, 5);
      const scored = journalEntries.filter((e) => e.alignment !== null);
      const avgAlign = scored.length ? Math.round(scored.reduce((s, e) => s + e.alignment, 0) / scored.length) : null;

      const entryLines = recent.map((e) => {
        const d = new Date(e.date).toLocaleDateString();
        const tag = e.entryType === 'dream' ? '[Dream] ' : '';
        const align = e.alignment != null ? ` (${e.alignment}% alignment, ${e.moonPhase})` : '';
        return `${d}${align} — ${tag}${e.text.slice(0, 280)}${e.text.length > 280 ? '...' : ''}`;
      }).join('\n');

      const draft = (document.getElementById('journalEntryInput')?.value || '').trim();
      const tarotCtx = global._lastTarotContext || null;
      if (global._lastTarotContext) global._lastTarotContext = null;

      return [
        `The user has ${journalEntries.length} encrypted journal entries.`,
        avgAlign != null ? `Average sky alignment across ${scored.length} scored entries: ${avgAlign}%.` : '',
        recent.length ? `\nRecent entries:\n${entryLines}` : '',
        draft ? `\nCurrent unsaved entry (not yet saved):\n${draft}` : '',
        tarotCtx ? `\nTarot reading context:\n${tarotCtx}` : '',
        `\nUser's question or entry to interpret: ${question}`
      ].filter(Boolean).join(' ');
    }

    function journalAddChatBubble(html, type) {
      const chatLog = document.getElementById('journalChatLog');
      const div = document.createElement('div');
      div.className = `j-bubble ${type}`;
      div.innerHTML = html;
      chatLog.appendChild(div);
      chatLog.scrollTop = chatLog.scrollHeight;
      return div;
    }

    async function sendJournalChat() {
      if (!cfg.getJournalKey || !cfg.getJournalKey()) { cfg.setStatus('Unlock your journal first.'); return; }
      const input = document.getElementById('journalChatInput');
      const question = input.value.trim();
      if (!question) return;

      journalAddChatBubble(cfg.escapeHtml(question), 'user');
      input.value = '';
      const thinking = journalAddChatBubble('Reading your entries...', 'ai');

      try {
        const skyContext = cfg.buildSkyContext(cfg.getLatestData(), cfg.getLatestAspects(), cfg.getLatestDate());
        const fullPrompt = buildJournalContext(question);
        const response = await cfg.querySkyAssistant(fullPrompt, skyContext);
        thinking.innerHTML = cfg.formatSkyReading(response);
      } catch (e) {
        const chatLog = document.getElementById('journalChatLog');
        if (e.message === 'NO_KEY') { thinking.remove(); cfg.noKeyCard(chatLog); }
        else thinking.innerHTML = `AI error: ${e.message}`;
      }
      document.getElementById('journalChatLog').scrollTop = Infinity;
    }

    function bindEntryTabs() {
      document.querySelectorAll('.j-entry-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.j-entry-tab').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const mode = btn.dataset.entry;
          document.getElementById('journalEntrySection').classList.toggle('hidden', mode !== 'journal');
          document.getElementById('dreamEntrySection').classList.toggle('hidden', mode !== 'dream');
        });
      });
    }

    function bindDreamHandlers() {
      document.getElementById('dreamSaveBtn').addEventListener('click', async () => {
        if (!cfg.getJournalKey || !cfg.getJournalKey()) { cfg.setStatus('Unlock your journal first.'); return; }
        const input = document.getElementById('dreamEntryInput');
        const text = input.value.trim();
        if (!text) { cfg.setStatus('Describe your dream first.'); return; }

        await cfg.journalAddEntry(text, null, null, cfg.getMoonPhaseName(new Date()), 'dream');
        input.value = '';
        cfg.renderJournal();
        cfg.renderPatternStats();
        cfg.setStatus('Dream logged.');

        await renderDreamCitedInterpretation(text);

        const prompt = `Dream interpretation request:\n\n${text}`;
        journalAddChatBubble('<em>🌙 Dream logged — interpreting...</em>', 'ai');
        try {
          const skyContext = cfg.buildSkyContext(cfg.getLatestData(), cfg.getLatestAspects(), cfg.getLatestDate());
          const fullPrompt = buildJournalContext(prompt);
          const response = await cfg.querySkyAssistant(fullPrompt, skyContext);
          const chatLog = document.getElementById('journalChatLog');
          chatLog.lastElementChild.innerHTML = cfg.formatSkyReading(response);
          chatLog.scrollTop = chatLog.scrollHeight;
        } catch (e) {
          const chatLog = document.getElementById('journalChatLog');
          if (e.message === 'NO_KEY') { chatLog.lastElementChild.remove(); cfg.noKeyCard(chatLog); }
          else chatLog.lastElementChild.innerHTML = `Dream logged. AI error: ${e.message}`;
        }
      });

      document.getElementById('journalChatSendBtn').addEventListener('click', sendJournalChat);
      document.getElementById('journalChatInput').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendJournalChat();
      });

      document.getElementById('journalClearChatBtn').addEventListener('click', () => {
        document.getElementById('journalChatLog').innerHTML = '';
      });
    }

    function bind() {
      bindEntryTabs();
      bindDreamHandlers();
    }

    return {
      bind,
      buildJournalContext,
      renderDreamCitedInterpretation,
      sendJournalChat
    };
  }

  global.LuminaJournal = {
    createJournalUx
  };
})(window);

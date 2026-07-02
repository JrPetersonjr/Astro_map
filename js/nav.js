(function (global) {
  const VIEW_TO_TAB = {
    chart: 'calendar',
    journal: 'journal',
    settings: 'settings',
    tarot: 'tarot',
    skies: 'skies'
  };

  const TAB_TO_VIEW = {
    calendar: 'chart',
    journal: 'journal',
    settings: 'settings',
    tarot: 'tarot',
    skies: 'skies'
  };

  const VALID_VIEWS = new Set(Object.keys(VIEW_TO_TAB));
  const LEGACY_CHART_VIEWS = new Set(['sky-controls', 'calendar']);

  function normalizeView(view) {
    if (LEGACY_CHART_VIEWS.has(view)) return 'chart';
    return VALID_VIEWS.has(view) ? view : 'chart';
  }

  function createNavController(config) {
    const opts = config || {};
    const onTabActivate = opts.onTabActivate || {};
    const body = opts.body || document.body;
    const rawInitialView =
      opts.initialView || new URLSearchParams(window.location.search).get('view') || 'chart';

    let pageView = normalizeView(rawInitialView);

    function syncPageNavActive() {
      document.querySelectorAll('.page-nav [data-view]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === pageView);
      });
    }

    function setPageView(view, options) {
      const navOpts = options || {};
      const normalized = normalizeView(view || 'chart');
      pageView = normalized;
      body.dataset.view = normalized;

      if (navOpts.syncUrl !== false) {
        const url = new URL(window.location.href);
        url.searchParams.set('view', normalized);
        const state = { view: normalized };
        if (navOpts.pushHistory) window.history.pushState(state, '', url.toString());
        else window.history.replaceState(state, '', url.toString());
      }

      if (navOpts.syncTab !== false) {
        const tabName = VIEW_TO_TAB[normalized] || 'calendar';
        activateTab(tabName, { syncView: false });
      }

      syncPageNavActive();
    }

    function activateTab(tabName, options) {
      const tabOpts = options || {};
      const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
      if (!tabButton) return;

      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      tabButton.classList.add('active');
      document.getElementById(`${tabName}Tab`)?.classList.add('active');

      const handler = onTabActivate[tabName];
      if (typeof handler === 'function') handler();

      if (tabOpts.syncView !== false) {
        const nextView = TAB_TO_VIEW[tabName] || 'chart';
        setPageView(nextView, { pushHistory: !!tabOpts.pushHistory, syncTab: false });
      }
    }

    function navigateToView(view) {
      setPageView(view, { pushHistory: true });
    }

    function initializePageView() {
      setPageView(pageView, { syncUrl: true, pushHistory: false });
    }

    function bindNavEvents() {
      document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          activateTab(btn.dataset.tab, { pushHistory: true });
        });
      });

      document.querySelectorAll('.page-nav [data-view]').forEach((btn) => {
        btn.addEventListener('click', () => {
          navigateToView(btn.dataset.view);
        });
      });

      window.addEventListener('popstate', () => {
        const viewFromUrl = new URLSearchParams(window.location.search).get('view') || 'chart';
        setPageView(viewFromUrl, { syncUrl: false });
      });
    }

    return {
      activateTab,
      bindNavEvents,
      initializePageView,
      navigateToView,
      setPageView,
      syncPageNavActive,
      getPageView: () => pageView
    };
  }

  global.LuminaNav = {
    createNavController,
    normalizeView
  };
})(window);

// Dynamic daily forecast — computes any date's sky + reading on the fly,
// deterministically (0 model tokens), reusing the exact same assembly as the
// committed cache. History + today + tomorrow are free; further-out "advanced"
// days are gated so they can sit behind a subscription / weekly reading.
const { forecastParts, assembleForecast } = require('../standalone/build-forecast-cache.js');

const DAY = 86400000;
const FREE_AHEAD = 1; // today (0) and tomorrow (1) free; past always free

function isEntitled(req) {
  // TODO: wire a real subscription check (session cookie / JWT / Stripe customer).
  // For now an env-guarded header unlocks the advanced range for testing:
  //   FORECAST_UNLOCK=<secret> and send header  x-forecast-unlock: <secret>
  const key = process.env.FORECAST_UNLOCK;
  return Boolean(key && req.headers['x-forecast-unlock'] === key);
}

function utcYmd(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

module.exports = async (req, res) => {
  try {
    const now = new Date();
    const q = (req.query && req.query.date) || '';
    const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : utcYmd(now);
    const [Y, M, D] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(Y, M - 1, D, 12, 0, 0));           // noon UTC = deterministic
    const todayNoon = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);
    const daysAhead = Math.round((d.getTime() - todayNoon) / DAY);

    const parts = forecastParts(d);

    if (daysAhead > FREE_AHEAD && !isEntitled(req)) {
      // Locked: hand back the factual sky + a teaser, withhold the reading.
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
      return res.status(200).json({
        date: parts.date,
        locked: true,
        daysAhead,
        teaser: [parts.setup.backdrop, parts.setup.today, parts.setup.aspectLine]
          .filter(Boolean).join('\n'),
        sky: parts.sky,
        message: 'Advanced forecast — unlock with a subscription or a weekly reading.'
      });
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      date: parts.date,
      locked: false,
      daysAhead,
      forecast: assembleForecast(parts),
      sources: parts.sources,
      sky: parts.sky
    });
  } catch (err) {
    return res.status(500).json({ error: (err && err.message) || 'forecast failed' });
  }
};

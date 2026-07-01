# LuminaSynodic - Daily Astrological Sky Map

Files:

- `index.html` - interactive daily transit app for GitHub Pages.
- `sky-map-social.png` - static preview image.
- `vendor/astronomy.browser.min.js` - vendored Astronomy Engine browser build.
- `vendor/ASTRONOMY_ENGINE_LICENSE.txt` - upstream MIT license.

What it does:

- Uses today's date by default.
- Lets you step backward/forward by day or scrub within 30 days of today.
- Calculates Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto positions.
- Highlights major aspects and retrograde status.
- Adds a "Use My Location" option for local altitude/azimuth horizon context.
- Includes a local life mapping analyzer for themes like loss, gain, tension, new love, money, career, family/home, health, spiritual confusion, and sudden change. It maps user-entered life themes to the current tropical chart, approximate sidereal/Vedic positions, nakshatras, Moon context, and local astronomy context.
- Supports a Netlify function proxy for optional AI query integration. Add `QUERY_API_KEY` as an environment variable in Netlify to keep the secret off the client.
- Supports a provider bridge for dev-side AI/astrology integrations and the local Mage runtime path.

AI/Astrology integrations:

- Frontend provider selector is in `Journal -> Password/Settings`.
- Providers:
  - `Mage Local` = the only end-user interpretation path; uses the local runtime bridge and repo/context hints.
- No API key is required for the normal user flow.
- New bridge functions:
  - `api/astro-bridge.js` (Vercel)
  - `netlify/functions/astro-bridge.js` (Netlify)

Standalone local app (Mage MCP / GGUF / Homeplanet):

- Local runtime files are in `standalone/`:
  - `standalone/local-runtime.js` (serves app + local bridge + context indexing)
  - `standalone/contexts.json` (Mage/GGUF/Homeplanet endpoints + context roots)
  - `standalone/sw.js` + `standalone/manifest.webmanifest` (installable PWA)
  - `standalone/start-standalone.ps1`
- Start locally:
  - `node standalone/local-runtime.js`
  - open `http://127.0.0.1:8787/index.html?standalone=1`
- In app settings (`Journal -> Password/Settings`):
  - keep `Mage Local` selected for end-user interpretations
  - verify `Local runtime URL` (default `http://127.0.0.1:8787`)
  - use `Launch Mage (Dev)` to auto-detect and start Mage from local roots
  - use `Mage Status` to confirm local process status
- Reindex project/system contexts:
  - `POST http://127.0.0.1:8787/local/context/reindex`
- Search indexes:
  - `GET http://127.0.0.1:8787/local/context/search?q=your+term`

Mage process endpoints:

- `GET http://127.0.0.1:8787/local/mage/status`
- `POST http://127.0.0.1:8787/local/mage/launch`
- `POST http://127.0.0.1:8787/local/mage/stop`

Precomputed forecasts (no live tool calls for visitors):

- Build cache from local Mage:
  - `node standalone/build-forecast-cache.js`
- Output file:
  - `data/precomputedForecast.json`
- The app automatically shows today's precomputed forecast when an entry for today's date exists.

Default indexed context groups:

- `archivist-projects`: `H:/airlock/homeplanetstudio/projects`, `H:/airlock/flowstate_mage/projects`
- `mage-system`: `H:/airlock/homeplanetstudio/mage`, `H:/airlock/flowstate_mage/mage`
- `indra-system`: `H:/airlock/homeplanetstudio/indra`, `H:/airlock/flowstate_mage/indra`

Environment variables:

- Shared Gemini fallback:
  - `LUMINA` or `QUERY_API_KEY`
  - optional `QUERY_MODEL`
- VedAstro bridge defaults:
  - optional `VEDASTRO_MCP_URL` (defaults to `https://mcp.vedastro.org/api/mcp`)
  - optional `VEDASTRO_MCP_TOKEN` or `VEDASTRO_API_KEY`
- Kerykeion bridge defaults:
  - `KERYKEION_API_URL` (required for server-side Kerykeion bridge mode)
  - optional `KERYKEION_API_KEY`

Notes on Kerykeion:

- Kerykeion is AGPL for direct library embedding. For closed-source/private deployments, prefer their hosted API model as documented in their README.
- LuminaSynodic integration here is API-bridge based, so you can plug in either a hosted Kerykeion endpoint or your own compatible service.

Future runner direction:

- A lightweight standalone interp runner can package VedAstro, Kerykeion, and the model stack behind a single local installer/runtime.
- The end-user experience should stay local-first: either copy/paste an interp, download a guarded custom interp model, or request a dev-side interp/session.
- If a reading path cannot be made accurate, prefer repo-catalogued sources and known-good local models over cloud AI shortcuts.
- Response times may vary depending on local model size and device speed.
- Discord or adjacent support channels can sit beside the app as an optional human fallback for 1:1 sessions.

Offline interpretation pack:

- The app now includes a downloadable text guide, JSON index, and source catalog derived from the tarot source deck and curated reference list:
  - `data/interpretation-guide.md`
  - `data/interpretation-index.json`
- `standalone/interpretation-sources.json`
- Regenerate them with:
  - `node standalone/build-interpretation-index.js`
- These files are intended for the old-fashioned use case: a plain-text reference you can read without the UI, plus a structured index and bibliography you can ship with a standalone runner.
- The pack uses reputable tarot, astrology, dreamwork, and ephemeris references as metadata and synthesis anchors; it does not copy book passages.

Publishing notes:

- The interactive version runs as a static GitHub Pages site.
- The preview image is available for places that need a plain image.

Ephemeris source:

- Astronomy Engine by Don Cross / cosinekitty: <https://github.com/cosinekitty/astronomy>
- It is MIT licensed and based on VSOP87 and NOVAS models.
- I looked at `ryuphi/astrology-api`, but it is a server-side Swiss Ephemeris REST API requiring Node/native dependencies, so it is not a good fit for a static GitHub Pages app.
- The sidereal layer uses an approximate Lahiri-style ayanamsa offset for lightweight browser interpretation, not a full Vedic chart engine.

Suggested caption:

Daily sky map with live planetary positions, major aspects, retrogrades, and optional local horizon context.

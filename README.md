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
- Supports a provider bridge for a la carte AI/astrology integrations (Gemini, VedAstro MCP-compatible endpoints, and Kerykeion-compatible APIs).

AI/Astrology integrations:

- Frontend provider selector is in `Journal -> Password/Settings`.
- Providers:
  - `Auto` = local Gemini key first, then server bridge.
  - `Gemini` = direct browser call using your local API key.
  - `VedAstro MCP` = server bridge (`/api/astro-bridge` or `/.netlify/functions/astro-bridge`).
  - `Kerykeion API` = server bridge with Kerykeion-compatible payload forwarding.
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
  - set provider to `Mage Local`, `GGUF Local`, or `Homeplanet Local`
  - verify `Local runtime URL` (default `http://127.0.0.1:8787`)
- Reindex project/system contexts:
  - `POST http://127.0.0.1:8787/local/context/reindex`
- Search indexes:
  - `GET http://127.0.0.1:8787/local/context/search?q=your+term`

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

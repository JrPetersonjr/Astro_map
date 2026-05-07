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

Publishing notes:

- The interactive version runs as a static GitHub Pages site.
- The preview image is available for places that need a plain image.

Ephemeris source:

- Astronomy Engine by Don Cross / cosinekitty: https://github.com/cosinekitty/astronomy
- It is MIT licensed and based on VSOP87 and NOVAS models.
- I looked at `ryuphi/astrology-api`, but it is a server-side Swiss Ephemeris REST API requiring Node/native dependencies, so it is not a good fit for a static GitHub Pages app.
- The sidereal layer uses an approximate Lahiri-style ayanamsa offset for lightweight browser interpretation, not a full Vedic chart engine.

Suggested caption:

Daily sky map with live planetary positions, major aspects, retrogrades, and optional local horizon context.

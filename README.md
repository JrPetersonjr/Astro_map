# Daily Astrological Sky Map

Files:

- `index.html` - interactive daily transit app for GitHub Pages.
- `sky-map-social.png` - static preview image for a normal Facebook image post.
- `vendor/astronomy.browser.min.js` - vendored Astronomy Engine browser build.
- `vendor/ASTRONOMY_ENGINE_LICENSE.txt` - upstream MIT license.

What it does:

- Uses today's date by default.
- Lets you step backward/forward by day or scrub within 30 days of today.
- Calculates Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto positions.
- Highlights major aspects and retrograde status.
- Adds a "Use My Location" option for local altitude/azimuth horizon context.

Facebook notes:

- Facebook will not run custom HTML or SVG scripts inside a native post.
- To keep the interactivity, upload this folder to a static host such as GitHub Pages, Netlify, Vercel, or your own site, then post the hosted `index.html` URL.
- For a regular image post, upload `sky-map-social.png` and use the caption from the page.

Ephemeris source:

- Astronomy Engine by Don Cross / cosinekitty: https://github.com/cosinekitty/astronomy
- It is MIT licensed and based on VSOP87 and NOVAS models.
- I looked at `ryuphi/astrology-api`, but it is a server-side Swiss Ephemeris REST API requiring Node/native dependencies, so it is not a good fit for a static GitHub Pages app.

Suggested post caption:

Daily sky map with live planetary positions, major aspects, retrogrades, and optional local horizon context.

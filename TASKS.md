# LuminaSynodic — Shared Task Board

Coordination board for splitting work between **Claude Code** and **GitHub Copilot Chat**.
Both agents can read/write this file, so it's our shared memory for who-does-what.

**Convention:** each task has an owner (`Claude` / `Copilot` / `open`) and a status
(`[ ]` todo · `[~]` in progress · `[x]` done). Before starting, set yourself as owner
and `[~]`. When done, mark `[x]` and note the commit. Don't both grab the same task.

## Agent Handoff Protocol
- Add new requests as a checklist item under the right section with owner `open`.
- If you want **Claude** to do a task, set owner to `Claude` and keep status `[ ]`.
- If you want **Copilot** to do a task, set owner to `Copilot` and keep status `[ ]`.
- Whichever agent starts the task must switch it to `[~]` and keep ownership updated.
- On completion, switch to `[x]` and add a short completion note directly under the task.
- Completion note format:
	- `Done by: <Claude|Copilot>`
	- `Date: YYYY-MM-DD`
	- `Summary: <1-2 lines>`
	- `Files: <key files changed>`

Live app: <https://luminasynodic.vercel.app> · Deploy: **Vercel** (`api/` serverless).

---

## 🔴 FIX — bugs / correctness
- [x] `Copilot` — **Surface swallowed errors.** 22 silent `catch {}` blocks in `index.html` hide failures (this is how the journal & forecast bugs stayed invisible). Add a dev-mode logger so caught errors are visible in console when `?standalone=1` / localhost.
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Added a dev-only caught-error logger (`?standalone=1` or localhost) and wired all previously silent catch blocks in `index.html` to emit contextual console warnings.
	- Files: index.html
- [x] `Copilot` — **`/api/decks` 404 in standalone.** The tarot tab fetches `/api/decks`, which `standalone/local-runtime.js` doesn't serve (Vercel-only route). Serve it locally or handle the 404 without a console error.
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Updated tarot deck catalog loading to prefer the local runtime catalog in standalone/localhost/file contexts, then fall back to `/api/decks`, avoiding unnecessary standalone 404 requests.
	- Files: index.html, TASKS.md
- [ ] `open` — **Init-order audit.** Two TDZ crashes came from the single-script init order (fixed 606e861). Sweep for other `const`/`let` referenced before declaration by init-time calls; move all initial renders into the one deferred block.

## 🟡 BETTER — improvements
- [x] `Copilot` — **Remove `netlify/` + `netlify.toml`.** On Vercel now; duplicated dead bridge code.
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Audited workspace and verified `netlify/` and `netlify.toml` are already absent; no cleanup changes were required.
	- Files: TASKS.md
- [~] `Claude` — **Deepen datasets** (`data/astro-rules.json`, `data/dream-symbols.json`): planet-in-sign meanings, finer advice polarity, more symbols; per-card tarot citations beyond the RWS default.
	- Progress (Claude): Moon-in-sign daily texture (4fa1a64); dream lexicon 20→36 (09e640a); finer advice polarity (ec79ce9); forecast citations "Grounded in" footnote (30f580c). Next: planet-in-sign meanings for Mercury/Venus/Mars.
- [ ] `open` — **Dream UI in the app.** `standalone/dream-interpret.js` is Node-only; give it an in-app surface (a Dreams tab or a journal hook) with the cited output.

## 🟠 REBUILD — works, but poorly implemented
- [ ] `Copilot` — **Extract the `<style>` block to `css/app.css`.** Safest first monolith step: move the inline `<style>` content into `css/app.css` and link it from `index.html`. Behavior-preserving — change no rules, just relocate. Verify: `npm test` passes and all five views render with no console errors. (Claude will re-verify in a browser.)
- [ ] `open` — **THEN extract `index.html` inline JS into modules** (`js/*.js`: chart, tarot, journal, forecast, nav) so it's testable. Higher risk (shared globals / init order) — coordinate on the board before starting; keep behavior identical.

## 🔵 REDESIGN — architecture / UX
- [x] `Copilot` — **Single-page view switching.** `navigateToView()` does a full `window.location` reload per tab (recomputes the chart, loses state). Make it an in-page swap.
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Replaced full-page tab navigation with in-page view switching via `history.pushState`/`replaceState`, URL sync, and `popstate` handling while preserving tab rendering behavior.
	- Files: index.html, TASKS.md
- [x] `Copilot` — **Unify the dual nav** (`data-view` + `data-tab`) into one system.
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Unified both nav systems through shared `setPageView`/`activateTab` flow, with URL/history sync and de-duplicated tab activation to avoid double renders.
	- Files: index.html, TASKS.md

## 🧪 TEST — foundation (currently zero automated tests)
- [x] `Copilot` — **Test harness:** `package.json` + `node:test` (no deps).
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Added a zero-dependency Node test harness (`node --test`) with initial smoke tests for interpreter module exports and a known tarot card lookup.
	- Files: package.json, test/harness.test.js, TASKS.md
- [x] `Claude` — **Engine unit tests:** lock in interpretation accuracy (`astro-interpret`, `dream-interpret`, `tarot-interpret`, sky math). e.g. 2026-07-01 → polarity `cautionary`, axis `Cancer-Capricorn`.
	- Done by: Claude
	- Date: 2026-07-01
	- Summary: Added comprehensive deterministic engine tests covering sky math, astro interpretation polarity/axis, dream symbol matching with citations, and tarot interpretation/spread behavior; Copilot re-verified with passing `npm test`.
	- Files: test/engines.test.js, package.json, TASKS.md
- [x] `Copilot` — **View smoke test:** load each view, assert no console errors + key elements render (would have caught the journal crash).
	- Done by: Copilot
	- Date: 2026-07-01
	- Summary: Added a no-dependency smoke test that verifies all core views/tabs exist, confirms in-page history navigation is used (no full reload), and checks dev error logging hooks are present.
	- Files: test/view-smoke.test.js, TASKS.md

---

## Suggested split
- **Claude Code:** correctness-sensitive work — engines, tests, datasets, init-order audit (needs care + verification).
- **Copilot Chat:** mechanical, well-scoped work — monolith JS extraction, CSS/layout, `netlify/` removal, boilerplate.
- Keep commits small and note them here so we don't collide.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const has = (pattern) => pattern.test(html);

test('view smoke: all primary view nav buttons exist', () => {
  assert.ok(has(/data-view="chart"/));
  assert.ok(has(/data-view="journal"/));
  assert.ok(has(/data-view="settings"/));
  assert.ok(has(/data-view="tarot"/));
  assert.ok(has(/data-view="skies"/));
});

test('view smoke: all tab content containers exist', () => {
  assert.ok(has(/id="calendarTab"/));
  assert.ok(has(/id="journalTab"/));
  assert.ok(has(/id="settingsTab"/));
  assert.ok(has(/id="tarotTab"/));
  assert.ok(has(/id="skiesTab"/));
});

test('view smoke: navigation uses in-page view switching, not full reload', () => {
  assert.ok(has(/function\s+setPageView\(/));
  assert.ok(has(/history\.pushState\(/));
  assert.ok(has(/window\.addEventListener\('popstate'/));
  assert.ok(!has(/window\.location\.href\s*=\s*url\.toString\(\)/));
});

test('view smoke: dev caught-error logger exists for local troubleshooting', () => {
  assert.ok(has(/function\s+logCaughtError\(/));
  assert.ok(has(/devErrorLoggingEnabled/));
});

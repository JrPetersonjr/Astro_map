const test = require('node:test');
const assert = require('node:assert/strict');

const astro = require('../standalone/astro-interpret.js');
const dream = require('../standalone/dream-interpret.js');
const tarot = require('../standalone/tarot-interpret.js');

test('engine modules expose expected functions', () => {
  assert.equal(typeof astro.interpret, 'function');
  assert.equal(typeof astro.renderEffect, 'function');

  assert.equal(typeof dream.interpret, 'function');
  assert.equal(typeof dream.matchSymbols, 'function');

  assert.equal(typeof tarot.interpret, 'function');
  assert.equal(typeof tarot.drawSpread, 'function');
  assert.equal(typeof tarot.findCard, 'function');
});

test('tarot interpret resolves a known card', () => {
  const reading = tarot.interpret('The Fool');
  assert.ok(!reading.error);
  assert.equal(reading.name, 'The Fool');
});

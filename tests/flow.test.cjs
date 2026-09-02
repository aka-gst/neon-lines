const assert = require('node:assert/strict');
const test = require('node:test');

let flow = null;
try {
  flow = require('../flow.js');
} catch {
  // The first red run documents the missing game-flow contract.
}

test('flow contract exposes the first-turn hint and safe telemetry', () => {
  assert.ok(flow, 'flow.js must expose the first-turn and telemetry helpers');
  assert.equal(typeof flow.firstTurnHint, 'function');
  assert.equal(typeof flow.createTelemetry, 'function');
  assert.equal(typeof flow.quietFrom, 'function');
});

test('quiet mode recognizes every shared spelling without false matches', () => {
  assert.ok(flow, 'flow.js must expose the quiet-mode helper');
  for (const [search, hash] of [
    ['?тихо', ''],
    ['?tiho', ''],
    ['?quiet', ''],
    ['', '#тихо'],
    ['', '#tiho'],
    ['', '#quiet'],
    ['?%D1%82%D0%B8%D1%85%D0%BE', ''],
    ['?%', '']
  ]) assert.equal(flow.quietFrom(search, hash), search !== '?%');

  for (const [search, hash] of [['?тихонько',''],['?disquiet',''],['?l=ABC',''],['','#l=ABC']]) {
    assert.equal(flow.quietFrom(search, hash), false);
  }
});

test('the first empty move explains the three incoming balls', () => {
  assert.ok(flow, 'flow.js must expose the first-turn helper');
  assert.equal(
    flow.firstTurnHint({ firstMove: true, cleared: false }),
    'Пришли три шара. Собери первую пятёрку — +50'
  );
});

test('a first move that clears a line keeps its real result message', () => {
  assert.ok(flow, 'flow.js must expose the first-turn helper');
  assert.equal(flow.firstTurnHint({ firstMove: true, cleared: true }), null);
});

test('telemetry is a no-op for test runs and when analytics is absent', () => {
  assert.ok(flow, 'flow.js must expose the telemetry helper');

  const calls = [];
  const testTelemetry = flow.createTelemetry({
    search: '?test=1',
    umami: { track: (...args) => calls.push(args) }
  });
  assert.equal(testTelemetry.once('first-move'), false);
  assert.deepEqual(calls, []);

  const silentTelemetry = flow.createTelemetry({ search: '', umami: null });
  assert.doesNotThrow(() => silentTelemetry.once('first-move'));
  assert.equal(silentTelemetry.once('first-move'), false);
});

test('one-time events are sent once without payload about a player or board', () => {
  assert.ok(flow, 'flow.js must expose the telemetry helper');

  const calls = [];
  const telemetry = flow.createTelemetry({
    search: '',
    umami: { track: (...args) => calls.push(args) }
  });
  assert.equal(telemetry.once('first-special'), true);
  assert.equal(telemetry.once('first-special'), false);
  assert.deepEqual(calls, [['first-special']]);
});

test('normal telemetry keeps existing anonymous events while test runs stay silent', () => {
  assert.ok(flow, 'flow.js must expose the telemetry helper');

  const calls = [];
  const telemetry = flow.createTelemetry({
    search: '',
    umami: { track: (...args) => calls.push(args) }
  });
  assert.equal(telemetry.track('game-start', { game: 'neon-lines' }), true);
  assert.deepEqual(calls, [['game-start', { game: 'neon-lines' }]]);
});

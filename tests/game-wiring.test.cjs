const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('the game loads the flow helper before game.js', () => {
  const helper = page.indexOf('src="flow.js?v=2"');
  const gameScript = page.indexOf('src="game.js?v=32"');
  assert.ok(helper >= 0, 'index must load flow.js');
  assert.ok(helper < gameScript, 'flow.js must load before game.js');
});

test('test-mode pages do not load the production Pulse script', () => {
  assert.match(page, /URLSearchParams\(location\.search\)\.has\('test'\)/);
  assert.match(page, /document\.write\(/);
  assert.match(page, /\/pulse\/script\.js/);
});

test('the exit is discoverable and names the cost of leaving an active game', () => {
  assert.match(page, /class="game-home-menu" href="\/">НА САЙТ<\/a>/);
  assert.match(game, /Прогресс может не сохраниться/);
});

test('the real move path tracks milestones and keeps the first line result', () => {
  assert.match(game, /flow\.quietFrom\(location\.search,location\.hash\)/);
  assert.match(game, /telemetry\.track\('game-start',\{game:'neon-lines'\}\)/);
  assert.match(game, /telemetry\.once\('first-move'\)/);
  assert.match(game, /telemetry\.once\('first-line'\)/);
  assert.match(game, /telemetry\.once\('first-special'\)/);
  assert.match(game, /telemetry\.once\('game-resume'\)/);
  assert.match(game, /firstTurnHint\(\{firstMove,cleared\}\)/);
  assert.match(game, /if\(hint\)messageEl\.textContent=hint/);
});

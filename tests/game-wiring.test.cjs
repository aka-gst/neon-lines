const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('the game loads the flow helper before game.js', () => {
  const helper = page.indexOf('src="flow.js?v=2"');
  const gameScript = page.indexOf('src="game.js?v=33"');
  assert.ok(helper >= 0, 'index must load flow.js');
  assert.ok(helper < gameScript, 'flow.js must load before game.js');
});

test('test-mode pages do not load the production Pulse script', () => {
  assert.match(page, /URLSearchParams\(location\.search\)\.has\('test'\)/);
  assert.match(page, /document\.write\(/);
  assert.match(page, /\/pulse\/script\.js/);
});

test('a visual build changes both its asset URLs and offline cache name', () => {
  assert.match(page, /styles\.css\?v=27/);
  assert.match(page, /game\.js\?v=33/);
  assert.match(worker, /neon-lines-v28/);
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

test('a selected ball distinguishes an open destination from an unreachable barrier', () => {
  assert.match(game, /reachable\.has\(id\(x,y\)\)\?'reachable':''/);
  assert.match(styles, /\.cell\.reachable/);
  assert.match(styles, /\.cell\.blocked::after/);
  assert.match(styles, /linear-gradient\(45deg/);
  assert.doesNotMatch(styles, /\.cell\.blocked::after\{content:'';position:absolute;inset:42%;border-radius:50%;background:#2a2233/);
});

test('red and pink have non-colour marks, while sound and music share one toggle treatment', () => {
  assert.match(styles, /\.ball\[data-colour='red'\]::after/);
  assert.match(styles, /\.ball\[data-colour='pink'\]::after/);
  assert.match(styles, /#sound-toggle,#music-toggle/);
  assert.match(styles, /#undo\{order:-1/);
  assert.match(styles, /#restart,#sound-toggle,#music-toggle,#how\{min-height:44px/);
});

test('line clears scatter capped ball-coloured particles and bombs keep a distinct blast', () => {
  assert.match(game, /function burstParticles\(cells\)/);
  assert.match(game, /Math\.min\(54,/);
  assert.match(game, /burst-particle/);
  assert.match(game, /startClear\(hit,\{bomb:true,x,y\}\)/);
  assert.match(game, /startClear\(found\)/);
  assert.match(styles, /\.burst-particle/);
  assert.match(styles, /\.board\.bomb-blast::before/);
  assert.match(styles, /prefers-reduced-motion:reduce\)\{\.burst-particle/);
});

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const game=fs.readFileSync("game.js","utf8");
const css=fs.readFileSync("styles.css","utf8");
test("очки всплывают в месте собранной линии",()=>{assert.match(game,/function scorePop\(cells,text\)/);assert.match(game,/ДЛИННАЯ ЛИНИЯ/);assert.match(css,/\.score-pop/)});

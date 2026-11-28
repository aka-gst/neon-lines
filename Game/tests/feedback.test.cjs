const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");const ROOT=path.resolve(__dirname,"..");const rd=f=>fs.readFileSync(path.join(ROOT,f),"utf8"); // путь от теста, а не от текущей папки
const game=rd("game.js");
const css=rd("styles.css");
test("очки всплывают в месте собранной линии",()=>{assert.match(game,/function scorePop\(cells,text\)/);assert.match(game,/ДЛИННАЯ ЛИНИЯ/);assert.match(css,/\.score-pop/)});

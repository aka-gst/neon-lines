const SIZE=9;
const COLORS=['#ef4356','#ffd13a','#42d574','#42aef5','#bd67e8','#ff70ad','#ff9138'];
// Same order as COLORS. Written into the element's own style attribute so the
// path resolves against the page and keeps working under the /lines/ prefix.
// The look of a ball is CSS now, one of five rolled per game, so the only
// thing the markup carries is its colour.
const ballTag=index=>`<i class="ball" style="--ball:${COLORS[index]}"></i>`;
const BALL_STYLES=['glass','tube','crt','candy','facet'];
function rollBalls(){const previous=document.body.dataset.ballStyle;const pool=BALL_STYLES.filter(style=>style!==previous);document.body.dataset.ballStyle=pool[Math.floor(Math.random()*pool.length)]}
const boardEl=document.querySelector('#board'),messageEl=document.querySelector('#message'),scoreEl=document.querySelector('#score'),bestEl=document.querySelector('#best'),nextEl=document.querySelector('#next'),recordsEl=document.querySelector('#records');
document.addEventListener('dblclick',event=>event.preventDefault(),{passive:false});
let board,selected,nextColors,score,best,records,started=false,gameOver=false,locked=false,born=new Set(),clearing=new Set(),startedAt=0,leaderboardToken='',allScores=[],turns=0,nextWisdomAt=9;
const WISDOM=['Не цепляйся за ход — смотри, что он открывает.','Спокойный ум замечает свободный путь.','Победа начинается с внимания к настоящему ходу.','Иногда лучший ход — сначала увидеть всё поле.','Отпусти неудачный ход и начни следующий чисто.','Терпение освобождает пространство для решения.'];
let audio,muted=localStorage.getItem('neon-lines-muted')==='1';
function resumeAudio(){if(audio?.state==='suspended')void audio.resume().catch(()=>{})}
['pointerdown','touchstart','keydown','pageshow'].forEach(type=>window.addEventListener(type,resumeAudio,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeAudio()});
const MOSCOW_OFFSET_MS=3*60*60*1000;
// The leaderboard server cuts its "today" period at Moscow midnight, so the
// local daily best rolls over together with the ranking.
const moscowDay=()=>new Date(Date.now()+MOSCOW_OFFSET_MS).toISOString().slice(0,10);
async function beginLeaderboard(){try{const response=await fetch('/api/leaderboard/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:'neon-lines'})});leaderboardToken=(await response.json()).token||''}catch{leaderboardToken=''}}
// Only the all-time table is left: without a shared sequence a daily board
// would compare runs that started from different fields.
async function loadLeaderboard(){try{allScores=(await fetch('/api/leaderboard/scores?game=neon-lines&period=all&limit=5').then(response=>response.json())).scores||[];render()}catch{}}
// Nicknames are server-validated against [\w\- А-Яа-яЁё]{1,6}, so no markup can reach here.
const scoreRows=entries=>entries.length?entries.map((entry,index)=>`<p><span>${index+1}. ${entry.nickname}</span><b>${entry.score}</b></p>`).join(''):'<em>пока пусто</em>';
async function submitLeaderboard(){const dailyKey=`neon-lines-daily-best:${moscowDay()}`,dailyBest=Number(localStorage.getItem(dailyKey)||0);if(score<=0||score<=dailyBest){leaderboardToken='';return}localStorage.setItem(dailyKey,String(score));if(!leaderboardToken)return;const token=leaderboardToken;leaderboardToken='';try{const nickname=await window.requestPlayerName();await fetch('/api/leaderboard/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,nickname,score})});await loadLeaderboard()}catch{}}
function tone(frequency,duration=70,type='square',volume=.035,delay=0){if(muted)return;const AudioEngine=window.AudioContext||window.webkitAudioContext;if(!AudioEngine)return;audio??=new AudioEngine();if(audio.state==='suspended')void audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration/1000);oscillator.connect(gain).connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration/1000)}
function haptic(pattern){try{navigator.vibrate?.(pattern)}catch{}}
let quakeTimer=0;
function quake(power){boardEl.style.setProperty('--quake',String(Math.min(3,Math.max(1,power))));boardEl.classList.remove('quake');void boardEl.offsetWidth;boardEl.classList.add('quake');clearTimeout(quakeTimer);quakeTimer=setTimeout(()=>boardEl.classList.remove('quake'),470)}
const sound={select:()=>{haptic(8);tone(520,55,'square',.025)},step:index=>tone(280+index%4*35,65,'square',.018),spawn:()=>{haptic(15);[0,1,2].forEach(i=>tone(360+i*90,100,'triangle',.025,i*.07))},clear:()=>{haptic([20,28,38]);[0,1,2,3].forEach(i=>tone(740-i*110,130,'square',.035,i*.055))},start:()=>{haptic(18);[0,1,2].forEach(i=>tone(300+i*150,120,'triangle',.035,i*.08))},over:()=>{haptic([55,40,75]);[0,1,2].forEach(i=>tone(330-i*75,220,'sawtooth',.025,i*.14))}};
const empty=()=>Array.from({length:SIZE},()=>Array(SIZE).fill(null));
const id=(x,y)=>`${x}:${y}`;
const randomColor=()=>Math.floor(Math.random()*COLORS.length);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function freshBoard(){const value=empty();for(let i=0;i<5;i++){let x,y;do{x=Math.floor(Math.random()*SIZE);y=Math.floor(Math.random()*SIZE)}while(value[y][x]!==null);value[y][x]=randomColor()}return value}
function findPath(from,to){const queue=[from],seen=new Set([id(...from)]),parent=new Map();for(let i=0;i<queue.length;i++){const[x,y]=queue[i];if(x===to[0]&&y===to[1]){const path=[];let cursor=id(...to);while(cursor!==id(...from)){const parts=cursor.split(':').map(Number);path.push(parts);cursor=parent.get(cursor)}return path.reverse()}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=id(nx,ny);if(nx<0||ny<0||nx>=SIZE||ny>=SIZE||seen.has(key)||board[ny][nx]!==null)continue;seen.add(key);parent.set(key,id(x,y));queue.push([nx,ny])}}return null}
function matches(){const result=new Set();for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const color=board[y][x];if(color===null)continue;for(const[dx,dy]of[[1,0],[0,1],[1,1],[1,-1]]){if(board[y-dy]?.[x-dx]===color)continue;const run=[];for(let cx=x,cy=y;board[cy]?.[cx]===color;cx+=dx,cy+=dy)run.push(id(cx,cy));if(run.length>=5)run.forEach(cell=>result.add(cell))}}return result}
function freeCells(){const out=[];board.forEach((row,y)=>row.forEach((value,x)=>{if(value===null)out.push([x,y])}));return out}
function render(){boardEl.innerHTML='';for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const button=document.createElement('button');button.className=`cell ${selected?.[0]===x&&selected?.[1]===y?'selected':''} ${born.has(id(x,y))?'born':''} ${clearing.has(id(x,y))?'clearing':''}`;button.setAttribute('aria-label',board[y][x]===null?'Свободная клетка':'Шарик');button.onclick=()=>handleCell(x,y);if(board[y][x]!==null)button.innerHTML=ballTag(board[y][x]);boardEl.append(button)}scoreEl.textContent=String(score);bestEl.textContent=String(best);nextEl.innerHTML=nextColors.map(color=>ballTag(color)).join('');recordsEl.innerHTML=scoreRows(allScores);if(!started)overlay('start','НЕОН ЛИНИИ','Выстраивай пять шаров в линию','НАЧАТЬ',restart);else if(gameOver)overlay('over','ИГРА ОКОНЧЕНА',`Счёт: ${score}`,'ЕЩЁ РАЗ',restart);else document.querySelector('.overlay')?.remove()}
// The curtain lives on the body, not inside the board: it covers the whole
// screen now and carries its own picture. Rebuilt only when the state behind
// it changes, so the fade does not replay on every render.
function overlay(kind,title,text,label,action){const current=document.querySelector('.overlay');if(current?.dataset.kind===kind){current.querySelector('span').textContent=text;return}current?.remove();const art=kind==='start'?`<img class="curtain-sky" src="lines-start-bg.webp" alt="" aria-hidden="true"><img class="curtain-floor" src="lines-start-bg.webp" alt="" aria-hidden="true">`:`<img class="curtain-full" src="lines-over.webp" alt="" aria-hidden="true">`;const el=document.createElement('div');el.className='overlay';el.dataset.kind=kind;el.innerHTML=`${art}<div class="curtain-veil" aria-hidden="true"></div><b>${title}</b><span>${text}</span><button>${label}</button>`;el.querySelector('button').onclick=action;document.body.append(el)}
async function animatePath(from,path,color){const source=boardEl.children[from[1]*SIZE+from[0]];source.classList.add('ghost');const ball=document.createElement('i');ball.className='ball route-ball';ball.style.setProperty('--ball',COLORS[color]);ball.style.setProperty('--x',from[0]);ball.style.setProperty('--y',from[1]);boardEl.append(ball);for(let index=0;index<path.length;index++){const[x,y]=path[index];await wait(62);sound.step(index);ball.style.setProperty('--x',x);ball.style.setProperty('--y',y)}await wait(72);ball.remove()}
// Four drawings for the same moment. One burst repeated on every line reads as
// a stamp; drawing at random reads as an explosion. Relative paths keep them
// resolving under /lines/.
const BURSTS=['burst.png','burst-g.webp','burst-h.webp','burst-i.webp'];
function pickBurst(){const file=BURSTS[Math.floor(Math.random()*BURSTS.length)];document.documentElement.style.setProperty('--burst',`url(${new URL(file,document.baseURI).href})`)}
async function removeMatches(found){if(!found.size)return false;sound.clear();pickBurst();clearing=found;render();quake(Math.round(found.size/5));await wait(430);if(selected&&found.has(id(...selected)))selected=null;found.forEach(cell=>{const[x,y]=cell.split(':').map(Number);board[y][x]=null});score+=found.size*10;clearing=new Set();render();messageEl.textContent=`Линия! +${found.size*10}`;return true}
async function spawnBalls(){const free=freeCells(),created=[];for(const color of nextColors){if(!free.length)break;const index=Math.floor(Math.random()*free.length),[x,y]=free.splice(index,1)[0];board[y][x]=color;created.push(id(x,y))}nextColors=[randomColor(),randomColor(),randomColor()];born=new Set(created);sound.spawn();render();await wait(540);born=new Set();render();await removeMatches(matches())}
async function handleCell(x,y){if(!started||gameOver)return;if(board[y][x]!==null){const target=boardEl.children[y*SIZE+x];if(target?.classList.contains('ghost'))return;sound.select();selected=[x,y];messageEl.textContent=clearing.has(id(x,y))?'Этот шар сейчас сгорает.':'Шарик выбран.';if(locked){boardEl.querySelectorAll('.cell.selected').forEach(cell=>cell.classList.remove('selected'));target?.classList.add('selected')}else render();return}if(locked)return;if(!selected){messageEl.textContent='Сначала выбери шарик.';return}const path=findPath(selected,[x,y]);if(!path){messageEl.textContent='Туда нет свободного пути.';return}locked=true;const from=selected,color=board[from[1]][from[0]];selected=null;messageEl.textContent='Шарик прыгает по найденному пути…';await animatePath(from,path,color);board[from[1]][from[0]]=null;board[y][x]=color;render();if(!await removeMatches(matches())){await spawnBalls();messageEl.textContent='Появились три новых шарика.'}turns+=1;if(turns>=nextWisdomAt){messageEl.textContent=WISDOM[Math.floor(Math.random()*WISDOM.length)];nextWisdomAt=turns+8+Math.floor(Math.random()*6)}if(freeCells().length===0){gameOver=true;finishScore()}locked=false;render()}
function finishScore(){sound.over();quake(3);window.umami?.track('game-finish',{game:'neon-lines',score,duration_seconds:Math.round((Date.now()-startedAt)/1000)});void submitLeaderboard();records=[...records,score].sort((a,b)=>b-a).slice(0,5);best=Math.max(best,score);localStorage.setItem('neon-lines-records',JSON.stringify(records));localStorage.setItem('neon-lines-best',String(best))}
function restart(){sound.start();rollBalls();startedAt=Date.now();void beginLeaderboard();window.umami?.track('game-start',{game:'neon-lines'});board=freshBoard();selected=null;nextColors=[randomColor(),randomColor(),randomColor()];score=0;turns=0;nextWisdomAt=8+Math.floor(Math.random()*5);started=true;gameOver=false;locked=false;born=new Set();board.forEach((row,y)=>row.forEach((value,x)=>{if(value!==null)born.add(id(x,y))}));messageEl.textContent='Собери пять одинаковых шаров.';render();setTimeout(()=>{born=new Set();render()},520)}
document.querySelector('#restart').onclick=()=>{if(started&&!gameOver&&!confirm('Начать новую игру? Текущий результат будет потерян.'))return;restart()};
const soundToggle=document.querySelector('#sound-toggle');
function updateSoundButton(){soundToggle.textContent=`ЗВУК: ${muted?'ВЫКЛ':'ВКЛ'}`}
soundToggle.onclick=()=>{muted=!muted;localStorage.setItem('neon-lines-muted',muted?'1':'0');updateSoundButton();if(!muted)tone(520,70,'square',.025)};
updateSoundButton();
try{best=Number(localStorage.getItem('neon-lines-best')||0);records=JSON.parse(localStorage.getItem('neon-lines-records')||'[]')}catch{best=0;records=[]}
pickBurst();rollBalls();
board=freshBoard();nextColors=[randomColor(),randomColor(),randomColor()];score=0;render();
void loadLeaderboard();
if('serviceWorker' in navigator)void navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});

/* Поле девять на девять и только: размеры пробовались, но в общую таблицу
   всё равно шёл один из них, а остальные оставались игрой в стороне. */
const SIZE=9;
const startBalls=()=>5;
const COLORS=['#ef4356','#ffd13a','#42d574','#42aef5','#bd67e8','#ff70ad','#ff9138'];
// Same order as COLORS. Written into the element's own style attribute so the
// path resolves against the page and keeps working under the /lines/ prefix.
// The look of a ball is CSS now, one of five rolled per game, so the only
// thing the markup carries is its colour.
// Волшебный шар — восьмое значение клетки. Подходит к любому цвету, но живёт
// считанные ходы: иначе его копили бы до конца партии, а он задуман как
// подарок, который надо успеть потратить.
const WILD=COLORS.length;
/* Бомба и камень — не цвета: в ряду они его не продолжают, а обрывают.
   Камень вдобавок не двигается, пока рядом что-нибудь не сгорит. */
const BOMB=WILD+1;
const STONE=BOMB+1;
const isWild=value=>value===WILD;
const isBomb=value=>value===BOMB;
const isStone=value=>value===STONE;
const countOf=kind=>board.reduce((sum,row)=>sum+row.filter(value=>value===kind).length,0);
let wildLife=0,wildBorn=0;
/* Пять откатов за партию, каждый по полсотни очков. Бесплатный откат
   превращает игру в перебор вариантов; платный оставляет её игрой, но снимает
   боль от промаха мимо клетки — а на телефоне промахиваются часто. */
const UNDO_TOTAL=5,UNDO_COST=50;
let undoLeft=UNDO_TOTAL,snapshot=null,reachable=null;
/* У партии не было развития: двадцатый ход не отличался от второго. Теперь
   каждые восемь собранных линий поднимают этап, а с ним — сколько шаров
   выбрасывается за ход. Первые два этапа идут по три, как раньше, так что
   короткая партия играется ровно как игралась; давление приходит к тому, кто
   дожил до него, — и вместе с ним приходит цена длинной линии. */
/* Этапы совпадают с изменением числа шаров, а не идут по круглым числам:
   объявленный этап, который ничего не меняет, — это фанфары ни о чём.
   Десять линий — крепкая партия, двадцать две — сильная, так что давление
   приходит к тому, кто до него доиграл. */
const STAGE_AT=[0,10,22];
let lines=0;
const stage=()=>STAGE_AT.filter(threshold=>lines>=threshold).length;
const ballsPerTurn=()=>2+stage();
const ballWord=count=>count<5?'шара':'шаров';
const wildAt=()=>{for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(isWild(board[y][x]))return[x,y];return null};
const wildLeft=()=>wildLife?wildLife-(turns-wildBorn):0;
// Мигать начинает за два хода до конца: неожиданное исчезновение читалось бы
// как сбой, а не как правило.
/* Картинка выбирается стилями по паре «вид + цвет», поэтому разметка несёт
   только имя цвета. Под картинкой лежит заливка --ball: пока файл не приехал,
   шар всё равно нужного цвета, а не дырка. */
const ballTag=index=>isWild(index)
  ?`<i class="ball wild${wildLeft()>0&&wildLeft()<=2?' fading':''}"></i>`
  :isBomb(index)?'<i class="ball bomb"></i>'
  :isStone(index)?'<i class="ball stone"></i>'
  :`<i class="ball" data-colour="${COLOR_NAMES[index]}" style="--ball:${COLORS[index]}"></i>`;
// Один волшебный на поле за раз и не чаще, чем примерно раз в семь выбросов.
/* Особая фишка приходит в очереди, как обычная: её видно заранее, и к ней
   можно готовиться. Больше одной за раз не бывает — иначе ход перестаёт быть
   про цвета. Камни начинаются со второго этапа и держатся вдвоём, не больше:
   поле, засыпанное неподвижным, перестаёт быть решаемым. */
function rollNext(){
  const queue=Array.from({length:ballsPerTurn()},randomColor);
  const put=value=>{queue[Math.floor(Math.random()*queue.length)]=value};
  const roll=Math.random();
  if(!wildAt()&&roll<.13)put(WILD);
  else if(countOf(BOMB)===0&&roll<.24)put(BOMB);
  else if(stage()>=2&&countOf(STONE)<2&&roll<.34)put(STONE);
  return queue}
// Пошаговое обучение поверх настоящего интерфейса — общий файл с остальными
// играми. Появляется один раз на устройство и по кнопке «как играть». Игра
// пошаговая, торопить некому, поэтому замораживать ничего не нужно.
const TOUR_STEPS=[
  {sel:'#board',text:'Поле 9×9. Нажми на шар, потом на свободную клетку — он поедет туда, если есть дорога.'},
  {sel:'#next',text:'Три следующих шара. Они лягут на поле после твоего хода.'},
  {sel:'.sidebar-top .meter',text:'Пять одинаковых в ряд — по горизонтали, вертикали или диагонали — сгорают и дают очки.'}
];
/* Панель видов. Открывается только по ?admin: игроку она не нужна, а хозяину
   нужна редко, поэтому и разметка её строится на месте, а не лежит в странице. */
/* Первый показ набора, которого нет в офлайн-копии, ждёт сети: на пробе
   кристаллы появились через шесть секунд после броска, и всё это время клетки
   стояли пустыми. Поэтому остальные наборы подтягиваются фоном сразу после
   начала партии — по одному файлу за раз, чтобы не толкаться с самой игрой.
   Дальше они лежат в кэше, и жребий может брать любой. */
let warmed=false;
function warmLooks(){
  if(warmed)return;
  warmed=true;
  const files=[];
  for(const[style]of BALL_STYLES)for(const colour of COLOR_NAMES)files.push(`art/ball-${style}-${colour}.png`);
  files.push('art/burst-j.png','art/burst-k.png');
  let index=0;
  const next=()=>{
    if(index>=files.length)return;
    const image=new Image();
    image.onload=image.onerror=()=>setTimeout(next,120);
    image.src=files[index++];
  };
  setTimeout(next,1500);
}

function looksPanel(){
  document.querySelector('.looks')?.remove();
  const el=document.createElement('div');
  el.className='looks';
  el.innerHTML=`<div class="looks-card"><header><b>ЧТО МОЖЕТ ВЫПАСТЬ</b><button type="button" class="looks-close">ЗАКРЫТЬ</button></header>${
    LOOKS.map(([key,list,attr,title])=>{
      const allowed=poolOf(key,list);
      return `<section data-key="${key}" data-attr="${attr}"><small>${title}</small><div>${
        list.map(([id,name])=>`<button type="button" data-id="${id}" class="${allowed.includes(id)?'on':''}">${name}</button>`).join('')
      }</div></section>`;
    }).join('')}<footer><span>Снятые варианты в случайном броске не участвуют. Если снять все — вернутся все.</span><button type="button" class="looks-roll">БРОСИТЬ СЕЙЧАС</button></footer></div>`;
  el.querySelector('.looks-close').onclick=()=>el.remove();
  el.querySelector('.looks-roll').onclick=()=>{rollBalls();render()};
  el.querySelectorAll('section button').forEach(button=>{
    button.onclick=()=>{
      const section=button.closest('section'),key=section.dataset.key;
      const list=LOOKS.find(entry=>entry[0]===key)[1];
      const on=[...section.querySelectorAll('button.on')].map(b=>b.dataset.id);
      const next=on.includes(button.dataset.id)?on.filter(id=>id!==button.dataset.id):[...on,button.dataset.id];
      try{localStorage.setItem(POOL_KEY+key,JSON.stringify(next))}catch{}
      button.classList.toggle('on');
      /* Показываем выбранное сразу: панель поверх поля, и всё видно. */
      document.body.dataset[section.dataset.attr]=button.dataset.id;
      render();
    };
  });
  document.body.append(el);
}

function startTour(force){if(!window.Tour)return;if(force)window.Tour.start(TOUR_STEPS);else window.Tour.once('neon-lines',TOUR_STEPS)}
/* Вид шаров, вид поля и фон бросаются каждую партию. Что именно может выпасть,
   выбирается в панели по ?admin: снял галочку — этот вариант больше не придёт.
   Пустой список значит «всё разрешено», иначе один снятый крестик оставил бы
   игру без внешности вообще. */
const BALL_STYLES=[['glass','СТЕКЛО'],['core','ЯДРО'],['crystal','КРИСТАЛЛ'],['plasma','ПЛАЗМА']];
const COLOR_NAMES=['red','yellow','green','blue','violet','pink','orange'];
const BOARD_STYLES=[['grid','СЕТКА'],['void','ПУСТОТА'],['scan','РАЗВЁРТКА'],['tile','ПЛИТКА']];
const BACK_STYLES=[['void','ЧЁРНЫЙ'],['violet','ФИОЛЕТ'],['ember','УГЛИ'],['ice','ЛЁД']];
const LOOKS=[['balls',BALL_STYLES,'ballStyle','ШАРЫ'],['board',BOARD_STYLES,'boardStyle','ПОЛЕ'],['back',BACK_STYLES,'backStyle','ФОН']];
const POOL_KEY='neon-lines-pool:';
function poolOf(key,list){
  let saved=[];
  try{saved=JSON.parse(localStorage.getItem(POOL_KEY+key)||'[]')}catch{}
  const allowed=list.filter(([id])=>saved.includes(id));
  return allowed.length?allowed.map(([id])=>id):list.map(([id])=>id);
}
function rollBalls(){
  for(const[key,list,attr]of LOOKS){
    const allowed=poolOf(key,list),previous=document.body.dataset[attr];
    const choices=allowed.length>1?allowed.filter(id=>id!==previous):allowed;
    document.body.dataset[attr]=choices[Math.floor(Math.random()*choices.length)];
  }
}
const boardEl=document.querySelector('#board'),messageEl=document.querySelector('#message'),scoreEl=document.querySelector('#score'),stageEl=document.querySelector('#stage'),bestEl=document.querySelector('#best'),nextEl=document.querySelector('#next'),recordsEl=document.querySelector('#records'),undoEl=document.querySelector('#undo');
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
// The day is marked only once the board actually has the score. Marking it
// before the request meant a single dropped connection silenced that player
// until Moscow midnight, with nothing on screen to say so and the failure
// swallowed whole. On a failure the token is kept as well, so the next game
// can try again.
async function submitLeaderboard(){const dailyKey=`neon-lines-daily-best:${moscowDay()}`,dailyBest=Number(localStorage.getItem(dailyKey)||0);if(score<=0||score<=dailyBest||!leaderboardToken)return;const token=leaderboardToken;try{const nickname=await window.requestPlayerName();const response=await fetch('/api/leaderboard/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,nickname,score})});if(!response.ok)throw new Error(`сервер ответил ${response.status}`);localStorage.setItem(dailyKey,String(score));leaderboardToken='';await loadLeaderboard()}catch(error){console.warn('Результат не отправлен, попробуем со следующей партии',error)}}
function tone(frequency,duration=70,type='square',volume=.035,delay=0){if(muted)return;const AudioEngine=window.AudioContext||window.webkitAudioContext;if(!AudioEngine)return;audio??=new AudioEngine();if(audio.state==='suspended')void audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration/1000);oscillator.connect(gain).connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration/1000)}
function haptic(pattern){try{navigator.vibrate?.(pattern)}catch{}}
let quakeTimer=0;
function quake(power){boardEl.style.setProperty('--quake',String(Math.min(3,Math.max(1,power))));boardEl.classList.remove('quake');void boardEl.offsetWidth;boardEl.classList.add('quake');clearTimeout(quakeTimer);quakeTimer=setTimeout(()=>boardEl.classList.remove('quake'),470)}
const sound={select:()=>{haptic(8);tone(520,55,'square',.025)},step:index=>tone(280+index%4*35,65,'square',.018),spawn:()=>{haptic(15);[0,1,2].forEach(i=>tone(360+i*90,100,'triangle',.025,i*.07))},clear:()=>{haptic([20,28,38]);[0,1,2,3].forEach(i=>tone(740-i*110,130,'square',.035,i*.055))},start:()=>{haptic(18);[0,1,2].forEach(i=>tone(300+i*150,120,'triangle',.035,i*.08))},stage:()=>{haptic([18,30,18]);[0,1,2,3].forEach(i=>tone(300+i*130,150,'triangle',.03,i*.09))},over:()=>{haptic([55,40,75]);[0,1,2].forEach(i=>tone(330-i*75,220,'sawtooth',.025,i*.14))}};
const empty=()=>Array.from({length:SIZE},()=>Array(SIZE).fill(null));
const id=(x,y)=>`${x}:${y}`;
const randomColor=()=>Math.floor(Math.random()*COLORS.length);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function freshBoard(){const value=empty();for(let i=0;i<startBalls();i++){let x,y;do{x=Math.floor(Math.random()*SIZE);y=Math.floor(Math.random()*SIZE)}while(value[y][x]!==null);value[y][x]=randomColor()}return value}
function findPath(from,to){const queue=[from],seen=new Set([id(...from)]),parent=new Map();for(let i=0;i<queue.length;i++){const[x,y]=queue[i];if(x===to[0]&&y===to[1]){const path=[];let cursor=id(...to);while(cursor!==id(...from)){const parts=cursor.split(':').map(Number);path.push(parts);cursor=parent.get(cursor)}return path.reverse()}for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=id(nx,ny);if(nx<0||ny<0||nx>=SIZE||ny>=SIZE||seen.has(key)||board[ny][nx]!==null)continue;seen.add(key);parent.set(key,id(x,y));queue.push([nx,ny])}}return null}
// Волшебный шар подходит к любому цвету, поэтому «одинаковость» ряда больше не
// проверить сравнением с соседом: цвет ряда задаёт первый не-волшебный шар в
// нём. Отсюда и отказ от прежней отсечки «начинать только с начала ряда» —
// ряд W R R R R начинается там, где цвета ещё нет. Восемьдесят одна клетка на
// четыре направления считается за доли миллисекунды.
function matches(){const result=new Set();
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    if(board[y][x]===null)continue;
    for(const[dx,dy]of[[1,0],[0,1],[1,1],[1,-1]]){
      const run=[];let color=null;
      for(let cx=x,cy=y;;cx+=dx,cy+=dy){
        const value=board[cy]?.[cx];
        if(value===null||value===undefined)break;
        if(isBomb(value)||isStone(value))break;
        if(!isWild(value)){if(color===null)color=value;else if(value!==color)break}
        run.push(id(cx,cy));
      }
      if(run.length>=5&&color!==null)run.forEach(cell=>result.add(cell));
    }
  }
  return result}
function freeCells(){const out=[];board.forEach((row,y)=>row.forEach((value,x)=>{if(value===null)out.push([x,y])}));return out}
function render(){boardEl.innerHTML='';for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const button=document.createElement('button');button.className=`cell ${selected?.[0]===x&&selected?.[1]===y?'selected':''} ${born.has(id(x,y))?'born':''} ${clearing.has(id(x,y))?'clearing':''} ${reachable&&board[y][x]===null&&!reachable.has(id(x,y))?'blocked':''}`;button.setAttribute('aria-label',board[y][x]===null?'Свободная клетка':'Шарик');button.onclick=()=>handleCell(x,y);if(board[y][x]!==null)button.innerHTML=ballTag(board[y][x]);boardEl.append(button)}scoreEl.textContent=String(score);bestEl.textContent=String(best);stageEl.textContent=`этап ${stage()}`;undoEl.textContent=`↶ ОТКАТ ${undoLeft} · −${UNDO_COST}`;undoEl.disabled=!snapshot||undoLeft<=0||locked||gameOver||!started;nextEl.innerHTML=nextColors.map(color=>ballTag(color)).join('');recordsEl.innerHTML=scoreRows(allScores);if(!started)overlay('start','НЕОН ЛИНИИ','Выстраивай пять шаров в линию','НАЧАТЬ',restart);else if(gameOver)overlay('over','ИГРА ОКОНЧЕНА',`Счёт: ${score}`,'ЕЩЁ РАЗ',restart);else document.querySelector('.overlay')?.remove()}
// The curtain lives on the body, not inside the board: it covers the whole
// screen now and carries its own picture. Rebuilt only when the state behind
// it changes, so the fade does not replay on every render.
function overlay(kind,title,text,label,action){const current=document.querySelector('.overlay');if(current?.dataset.kind===kind){current.querySelector('span').textContent=text;return}current?.remove();/* Кадр берётся под форму экрана: вертикальный на телефон, широкий на
   компьютер. Скачивается ровно один — второй устройству не нужен. */
  const wide=innerWidth>=innerHeight;
  const art=kind==='start'
    ?(wide?`<img class="curtain-full" src="art/lines-start-wide.png" alt="" aria-hidden="true">`
          :`<img class="curtain-sky" src="art/lines-start-tall.png" alt="" aria-hidden="true"><img class="curtain-floor" src="art/lines-start-tall.png" alt="" aria-hidden="true">`)
    :`<img class="curtain-full" src="art/lines-over-wide.png" alt="" aria-hidden="true">`;const el=document.createElement('div');el.className='overlay';el.dataset.kind=kind;el.innerHTML=`${art}<div class="curtain-veil" aria-hidden="true"></div><b>${title}</b><span>${text}</span><button class="go">${label}</button>`;el.querySelector('.go').onclick=action;document.body.append(el)}
async function animatePath(from,path,color){const source=boardEl.children[from[1]*SIZE+from[0]];source.classList.add('ghost');const ball=document.createElement('i');/* Летящий шар одевается так же, как лежащий. Раньше особым фишкам здесь
   ничего не доставалось: цвета у них нет, --ball выходил undefined, и
   бомба ехала невидимой — на экране она просто взрывалась. */
  const special=isWild(color)?'wild':isBomb(color)?'bomb':isStone(color)?'stone':'';
  ball.className=`ball route-ball${special?' '+special:''}`;
  if(!special){ball.dataset.colour=COLOR_NAMES[color];ball.style.setProperty('--ball',COLORS[color])}ball.style.setProperty('--x',from[0]);ball.style.setProperty('--y',from[1]);boardEl.append(ball);for(let index=0;index<path.length;index++){const[x,y]=path[index];await wait(62);sound.step(index);ball.style.setProperty('--x',x);ball.style.setProperty('--y',y)}await wait(72);ball.remove()}
// Four drawings for the same moment. One burst repeated on every line reads as
// a stamp; drawing at random reads as an explosion. Relative paths keep them
// resolving under /lines/.
const BURSTS=['burst.png','art/burst-j.png','art/burst-k.png'];
function pickBurst(){const file=BURSTS[Math.floor(Math.random()*BURSTS.length)];document.documentElement.style.setProperty('--burst',`url(${new URL(file,document.baseURI).href})`)}
/* Камень уходит, когда рядом что-нибудь сгорело: иначе он остался бы навсегда
   и поле медленно каменело. Это и есть ответ на вопрос «что с ним делать» —
   собрать линию рядом. */
function breakStones(cleared){
  const gone=[];
  for(const cell of cleared){const[cx,cy]=cell.split(':').map(Number);
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=cx+dx,y=cy+dy;
      if(isStone(board[y]?.[x])){board[y][x]=null;gone.push(id(x,y))}}}
  return gone.length}

/* Бомба — единственное, что убирает камень без линии, и единственный ответ на
   забитое поле. Очков даёт мало: это инструмент, а не способ набрать счёт. */
async function explode(x,y){
  const hit=new Set();
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;
    if(board[ny]?.[nx]!==null&&board[ny]?.[nx]!==undefined)hit.add(id(nx,ny))}
  sound.clear();pickBurst();clearing=hit;render();quake(3);await wait(430);
  hit.forEach(cell=>{const[cx,cy]=cell.split(':').map(Number);board[cy][cx]=null});
  const gained=hit.size*5;score+=gained;
  clearing=new Set();render();
  messageEl.textContent=`Взрыв! Смело ${hit.size}, +${gained}`;
  return true}

async function removeMatches(found){if(!found.size)return false;sound.clear();pickBurst();clearing=found;render();quake(Math.round(found.size/5));await wait(430);if(selected&&found.has(id(...selected)))selected=null;const usedWild=[...found].some(cell=>{const[x,y]=cell.split(':').map(Number);return isWild(board[y][x])});found.forEach(cell=>{const[x,y]=cell.split(':').map(Number);board[y][x]=null});if(usedWild)wildLife=0;const brokeStones=breakStones(found);const wasStage=stage();lines+=1;const nowStage=stage();/* Пять в ряд стоили 50, семь — 70: тянуть до семи было невыгодно, проще
     собрать две пятёрки. Каждый шар сверх пятого теперь стоит вчетверо
     дороже прежнего, и строить наконец имеет смысл. Обычная пятёрка стоит
     ровно столько же, сколько стоила, — старые рекорды остаются сравнимы. */
  const gained=50+(found.size-5)*40;score+=gained;clearing=new Set();render();messageEl.textContent=(usedWild?`Волшебный шар подошёл! +${gained}`:`Линия! +${gained}`)+(brokeStones?` Камней осыпалось: ${brokeStones}.`:'');if(nowStage>wasStage){while(nextColors.length<ballsPerTurn())nextColors.push(randomColor());sound.stage();quake(2);render();messageEl.textContent=`ЭТАП ${nowStage}. Теперь по ${ballsPerTurn()} ${ballWord(ballsPerTurn())} за ход.`}return true}
/* Особые фишки появляются редко, и строка сообщений под полем для них слишком
   тихая: игрок видит новый предмет и не понимает, что это. Поэтому первый раз
   объяснение выезжает прямо к нему — с самой фишкой, нарисованной рядом.
   Один раз на устройство: дальше это уже знание, а не новость. */
const TIPS={
  [WILD]:['ВОЛШЕБНЫЙ ШАР','Подходит к любому цвету. Живёт несколько ходов и тает — последние два мигает.'],
  [BOMB]:['БОМБА','Веди её куда хочешь: на месте она сносит всё вокруг себя. Единственное, что убирает камень без линии.'],
  [STONE]:['КАМЕНЬ','Не двигается и рвёт ряд. Осыплется, если рядом сгорит линия. Или взорви его бомбой.']
};
const TIP_KEY='neon-lines-explained:';
let tipTimer=0;
function hideTip(){document.querySelector('.tip')?.remove();clearTimeout(tipTimer)}
function showTip(kind,x,y){
  const known=TIPS[kind];
  if(!known)return;
  try{if(localStorage.getItem(TIP_KEY+kind))return;localStorage.setItem(TIP_KEY+kind,'1')}catch{}
  hideTip();
  const el=document.createElement('div');
  el.className='tip';
  el.style.setProperty('--x',String(x));
  el.style.setProperty('--y',String(y));
  el.dataset.side=y<SIZE/2?'below':'above';
  el.innerHTML=`<i class="ball ${kind===WILD?'wild':kind===BOMB?'bomb':'stone'}"></i><b></b><span></span>`;
  el.querySelector('b').textContent=known[0];
  el.querySelector('span').textContent=known[1];
  el.onclick=hideTip;
  boardEl.append(el);
  tipTimer=setTimeout(hideTip,9000);
}

async function spawnBalls(){const free=freeCells(),created=[];let wildCame=false,landed=null;for(const color of nextColors){if(!free.length)break;const index=Math.floor(Math.random()*free.length),[x,y]=free.splice(index,1)[0];board[y][x]=color;created.push(id(x,y));if(isWild(color)){wildCame=true;wildLife=5+Math.floor(Math.random()*5);wildBorn=turns}if(color>=WILD)landed=[color,x,y]}nextColors=rollNext();born=new Set(created);sound.spawn();render();await wait(540);born=new Set();render();await removeMatches(matches());if(landed)showTip(landed[0],landed[1],landed[2]);return wildCame}
/* Куда шар вообще дойдёт. Считается один раз при выборе, а не на каждый
   наведённый курсор: восемьдесят одна клетка обходится за доли миллисекунды,
   но обходить их по разу на движение мыши незачем. Показываем не достижимое,
   а НЕдостижимое: обычно дойти можно почти везде, и подсветка «почти всего»
   была бы шумом, а вот запертый угол — ровно то, что игрок хочет знать. */
function takeSnapshot(){snapshot={board:board.map(row=>[...row]),score,nextColors:[...nextColors],wildLife,wildBorn,lines,turns,message:messageEl.textContent}}
function undoMove(){
  if(!started||gameOver||locked||!snapshot||undoLeft<=0)return;
  board=snapshot.board.map(row=>[...row]);
  nextColors=[...snapshot.nextColors];
  wildLife=snapshot.wildLife;wildBorn=snapshot.wildBorn;lines=snapshot.lines;turns=snapshot.turns;
  score=Math.max(0,snapshot.score-UNDO_COST);
  snapshot=null;undoLeft-=1;selected=null;reachable=null;born=new Set();clearing=new Set();
  sound.select();
  messageEl.textContent=`Ход отменён, −${UNDO_COST}. Осталось откатов: ${undoLeft}.`;
  render()}

function reachableFrom(from){
  const seen=new Set([id(...from)]),queue=[from];
  for(let i=0;i<queue.length;i++){const[x,y]=queue[i];
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=id(nx,ny);
      if(nx<0||ny<0||nx>=SIZE||ny>=SIZE||seen.has(key)||board[ny][nx]!==null)continue;
      seen.add(key);queue.push([nx,ny])}}
  return seen}

/* Маршрут под курсором рисуется прямо по клеткам, без перерисовки доски:
   перерисовка на каждое движение мыши стоила бы дороже самого поиска. */
let hoverKey='';
function showRoute(x,y){
  const key=id(x,y);
  if(key===hoverKey)return;
  hoverKey=key;
  boardEl.querySelectorAll('.cell.route').forEach(cell=>cell.classList.remove('route'));
  if(!selected||board[y]?.[x]!==null)return;
  const path=findPath(selected,[x,y]);
  if(!path)return;
  path.forEach(([px,py])=>boardEl.children[py*SIZE+px]?.classList.add('route'));
}
function clearRoute(){hoverKey='';boardEl.querySelectorAll('.cell.route').forEach(cell=>cell.classList.remove('route'))}
boardEl.addEventListener('pointermove',event=>{
  if(!selected||locked)return;
  const cell=event.target.closest?.('.cell');
  if(!cell)return;
  const index=[...boardEl.children].indexOf(cell);
  if(index<0)return;
  showRoute(index%SIZE,Math.floor(index/SIZE));
});
boardEl.addEventListener('pointerleave',clearRoute);

async function handleCell(x,y){
  if(!started||gameOver)return;
  hideTip();
  if(board[y][x]!==null){
    if(isStone(board[y][x])){messageEl.textContent='Камень не сдвинуть. Собери линию рядом.';return}
    const target=boardEl.children[y*SIZE+x];
    if(target?.classList.contains('ghost'))return;
    sound.select();selected=[x,y];reachable=reachableFrom(selected);clearRoute();
    messageEl.textContent=clearing.has(id(x,y))?'Этот шар сейчас сгорает.':'Шарик выбран.';
    render();return}
  if(locked)return;
  if(!selected){messageEl.textContent='Сначала выбери шарик.';return}
  const path=findPath(selected,[x,y]);
  if(!path){messageEl.textContent='Туда нет свободного пути.';return}
  locked=true;clearRoute();
  takeSnapshot();
  const from=selected,color=board[from[1]][from[0]];
  selected=null;reachable=null;
  messageEl.textContent='Шарик прыгает по найденному пути…';
  await animatePath(from,path,color);
  board[from[1]][from[0]]=null;board[y][x]=color;render();
  /* Бомба срабатывает там, где встала: ход ею — это и есть её применение. */
  const blew=isBomb(color)?await explode(x,y):false;
  const cleared=blew||await removeMatches(matches());
  if(!cleared){const wildCame=await spawnBalls();
    messageEl.textContent=wildCame?'Особая фишка в очереди. Смотри, что придёт.':'Появились три новых шарика.'}
  turns+=1;
  const wild=wildAt();
  if(wild&&wildLeft()<=0){board[wild[1]][wild[0]]=null;wildLife=0;messageEl.textContent='Волшебный шар растаял.';sound.step(3)}
  else if(!wild)wildLife=0;
  if(turns>=nextWisdomAt){messageEl.textContent=WISDOM[Math.floor(Math.random()*WISDOM.length)];nextWisdomAt=turns+8+Math.floor(Math.random()*6)}
  if(freeCells().length===0){gameOver=true;finishScore()}
  locked=false;render()}

function finishScore(){sound.over();quake(3);window.umami?.track('game-finish',{game:'neon-lines',score,duration_seconds:Math.round((Date.now()-startedAt)/1000)});void submitLeaderboard();records=[...records,score].sort((a,b)=>b-a).slice(0,5);best=Math.max(best,score);localStorage.setItem('neon-lines-records',JSON.stringify(records));localStorage.setItem('neon-lines-best',String(best))}
function restart(){sound.start();rollBalls();startedAt=Date.now();void beginLeaderboard();window.umami?.track('game-start',{game:'neon-lines'});board=freshBoard();selected=null;reachable=null;snapshot=null;undoLeft=UNDO_TOTAL;wildLife=0;wildBorn=0;score=0;turns=0;lines=0;nextColors=rollNext();nextWisdomAt=8+Math.floor(Math.random()*5);started=true;gameOver=false;locked=false;born=new Set();board.forEach((row,y)=>row.forEach((value,x)=>{if(value!==null)born.add(id(x,y))}));messageEl.textContent='Собери пять одинаковых шаров.';render();warmLooks();setTimeout(()=>{born=new Set();render()},520);setTimeout(()=>startTour(false),900)}
document.querySelector('#restart').onclick=()=>{if(started&&!gameOver&&!confirm('Начать новую игру? Текущий результат будет потерян.'))return;restart()};
const soundToggle=document.querySelector('#sound-toggle');
function updateSoundButton(){soundToggle.textContent=`ЗВУК: ${muted?'ВЫКЛ':'ВКЛ'}`}
soundToggle.onclick=()=>{muted=!muted;localStorage.setItem('neon-lines-muted',muted?'1':'0');updateSoundButton();if(!muted)tone(520,70,'square',.025)};
updateSoundButton();
/* Обработчики кнопок вешаются здесь, на верхнем уровне. Раньше они по ошибке
   попали внутрь обработчика кнопки звука: «как играть» и «откат» оживали
   только после того, как игрок нажмёт «звук», и до этого молчали. */
document.getElementById('how').onclick=()=>startTour(true);
undoEl.onclick=undoMove;
if(new URLSearchParams(location.search).has('admin')){
  const button=document.createElement('button');
  button.id='looks-open';button.className='action';button.textContent='\u2699 \u0412\u0418\u0414\u042b';
  button.onclick=looksPanel;
  document.getElementById('how').after(button);
}
try{best=Number(localStorage.getItem('neon-lines-best')||0);records=JSON.parse(localStorage.getItem('neon-lines-records')||'[]')}catch{best=0;records=[]}
pickBurst();rollBalls();
boardEl.style.setProperty('--size',String(SIZE));
board=freshBoard();wildLife=0;wildBorn=0;turns=0;lines=0;nextColors=rollNext();score=0;render();
void loadLeaderboard();
if('serviceWorker' in navigator)void navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});

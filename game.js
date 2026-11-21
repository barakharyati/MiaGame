'use strict';

const byId = id => document.getElementById(id);
const canvas = byId('track');
const ctx = canvas.getContext('2d');
const intro = byId('intro');
const overlay = byId('overlay');
const hud = byId('hud');
let best = 0;
try { best = Number(localStorage.getItem('mia-best')) || 0; } catch {}
byId('best').textContent = best;

let width, height, state = 'home', lane, position, jump, distance, gap, clock, nextRow, obstacles, previous;
let gesture;

function resize() {
  const bounds = canvas.getBoundingClientRect();
  width = bounds.width;
  height = bounds.height;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}
new ResizeObserver(resize).observe(canvas);
resize();

function start() {
  lane = position = 0;
  jump = distance = clock = 0;
  gap = 3;
  nextRow = 0.5;
  obstacles = [];
  state = 'running';
  intro.hidden = overlay.hidden = true;
  hud.hidden = false;
  overlay.classList.remove('caught');
  byId('pause').focus({preventScroll:true});
}

function showDialog(title, detail, button) {
  byId('result').textContent = title;
  byId('detail').textContent = detail;
  byId('resume').textContent = button;
  overlay.hidden = false;
  byId('resume').focus({preventScroll:true});
}

function pause() {
  if (state !== 'running') return;
  state = 'paused';
  showDialog('רגע לנשום', 'המרדף מחכה לכם.', 'ממשיכים');
}

function caught() {
  state = 'caught';
  overlay.classList.add('caught');
  showDialog('פלאק! נועה תפסה את מיה!', 'נועה נתנה למיה פליק מצויר בטוסיק.\nהגעתם ל־' + Math.floor(distance) + ' מ׳.', 'מנסים שוב');
}

function move(action) {
  if (state !== 'running') return;
  if (action === 'jump') {
    if (!jump) jump = .72;
    return;
  }
  lane = Math.max(-1, Math.min(1, lane + (action === 'left' ? -1 : 1)));
}

function update(dt) {
  clock += dt;
  distance += dt * (16 + Math.min(16, clock * .24));
  position += (lane - position) * Math.min(1, dt * 17);
  jump = Math.max(0, jump - dt);
  const speed = Math.min(.63, .32 + clock * .0038);
  if (clock >= nextRow) {
    const first = Math.floor(Math.random() * 3) - 1;
    const make = lane => ({ lane, depth: 0, kind: Math.floor(Math.random() * 3), checked: false });
    obstacles.push(make(first));
    if (clock > 12 && Math.random() < .55) obstacles.push(make((first + 2 + Math.floor(Math.random() * 2)) % 3 - 1));
    nextRow = clock + Math.max(.7, 1.28 - clock * .007) + Math.random() * .28;
  }
  for (const obstacle of obstacles) {
    obstacle.depth += speed * dt;
    if (!obstacle.checked && obstacle.depth >= .73) {
      obstacle.checked = true;
      if (Math.abs(position - obstacle.lane) < .42 && lift() < .38) gap--;
    }
  }
  obstacles = obstacles.filter(obstacle => obstacle.depth < 1.08);
  const score = Math.floor(distance);
  if (score > best) {
    best = score;
    byId('best').textContent = best;
  }
  byId('distance').textContent = score;
  byId('gap').textContent = '●'.repeat(Math.max(0, gap)) + '○'.repeat(Math.min(3, 3 - gap));
  if (gap <= 0) {
    saveBest();
    caught();
  }
}

function saveBest() {
  try { localStorage.setItem('mia-best', String(best)); } catch {}
}
window.addEventListener('pagehide', saveBest);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveBest(); pause(); }
});

function lift() { return Math.sin(jump / .72 * Math.PI); }
function horizon() { return height * .32; }
function roadWidth(depth) { return (.09 + depth * .94) * width; }
function roadY(depth) { return horizon() + depth * (height - horizon()); }
function roadX(lane, depth) { return width / 2 + lane * roadWidth(depth) / 3; }

function polygon(color, points) {
  ctx.beginPath();
  points.forEach(([x,y], index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function oval(x,y,rx,ry,color,outline = false) {
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) { ctx.strokeStyle = '#302235'; ctx.lineWidth = 2.8; ctx.stroke(); }
}
function line(color, thickness, points) {
  ctx.beginPath();
  points.forEach(([x,y], index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
}

function landscape() {
  const h = horizon();
  const sky = ctx.createLinearGradient(0,0,0,h + 50);
  sky.addColorStop(0,'#fbaf7b');
  sky.addColorStop(1,'#ffe6a5');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,width,height);
  oval(width * .74,h * .69, h * .36,h * .36,'#fff1ba');
  ctx.save();
  ctx.scale(width / 1000, 1);
  polygon('#d47564',[[0,h],[0,.58*h],[76,.51*h],[119,.64*h],[142,.87*h],[238,.91*h],[271,.64*h],[331,.66*h],[356,.91*h],[574,h],[668,.81*h],[744,.84*h],[800,.58*h],[917,.54*h],[969,.77*h],[1000,.8*h],[1000,h]]);
  polygon('#aa5558',[[0,h],[0,.77*h],[61,.7*h],[116,.92*h],[191,.89*h],[222,h],[753,h],[815,.82*h],[897,.76*h],[1000,.94*h],[1000,h]]);
  ctx.restore();
  ctx.fillStyle = '#e98d55';
  ctx.fillRect(0,h,width,height-h);
  polygon('#ffc47e',[[roadX(-1.57,0),h],[roadX(1.57,0),h],[roadX(1.57,1),height],[roadX(-1.57,1),height]]);
  for (let i = 0; i < 17; i++) {
    const depth = ((i / 17 + (distance || 0) * .012) % 1) ** 1.9;
    const bottom = Math.min(1, depth + .017 + depth * .029);
    for (const edge of [-1.5,-.5,.5,1.5]) {
      polygon('#df8f56',[[roadX(edge-.013,depth),roadY(depth)],[roadX(edge+.013,depth),roadY(depth)],[roadX(edge+.013,bottom),roadY(bottom)],[roadX(edge-.013,bottom),roadY(bottom)]]);
    }
  }
  for (let i = 0; i < 10; i++) {
    const depth = ((i / 10 + (distance || 0) * .009) % 1) ** 1.8;
    const x = roadX((i % 2 ? 1 : -1) * (1.77 + (i % 3) * .16),depth);
    const y = roadY(depth);
    const size = 2 + depth * 22;
    oval(x,y,size*.74,size*.19,'#c56d4a');
    if (i % 3) {
      line('#296d61',size*.24,[[x,y],[x,y-size*1.4]]);
      line('#398476',size*.18,[[x-size*.48,y-size],[x-size*.48,y-size*.64],[x,y-size*.51],[x+size*.46,y-size*.72],[x+size*.46,y-size*1.13]]);
    }
  }
}

function runner(x,y,scale,mother,phase) {
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(scale,scale);
  const swing = Math.sin(phase);
  const skin = mother ? '#d89469' : '#dba075';
  const hair = '#382631';
  const top = mother ? '#ed94a5' : '#fff5dc';
  oval(0,1,21,4,'#984d494b');
  for (const step of [-swing,swing]) {
    line('#302235',9,[[0,-28],[step*13,-17],[step*19,-5]]);
    line(mother ? '#e96779' : '#2b8279',7,[[step*19-2,-4],[step*19+6,-4]]);
  }
  oval(-13,-41,mother ? 9 : 12,15,mother ? hair : '#2d4356',true);
  line(skin,7,[[4,-53],[-14*swing,-42],[-25*swing,-35]]);
  polygon(top,[[-13,-54],[12,-54],[17,-30],[-14,-28]]);
  line('#302235',2,[[-13,-54],[12,-54],[17,-30],[-14,-28],[-13,-54]]);
  if (!mother) oval(3,-43,5,5,'#f3ba49');
  if (mother) {
    line(skin,7,[[11,-49],[22,-44],[26,-57]]);
    line('#70422f',6,[[18,-61],[34,-83]]);
    line('#bc794e',10,[[21,-65],[31,-79]]);
  }
  oval(-3,-73,26,28,hair,true);
  if (!mother) {
    oval(-26,-65,12,8,hair,true);
    line(hair,10,[[-31,-62],[-42,-52+swing*5],[-46,-42+swing*5]]);
    oval(-22,-67,4,6,'#eab84d');
  } else {
    oval(-20,-60,11,21,hair);
    oval(15,-57,9,16,hair);
  }
  oval(1,-68,20,22,skin,true);
  polygon(hair,[[-20,-69],[-24,-81],[-15,-93],[3,-97],[19,-83],[19,-76],[9,-82],[-1,-85],[-9,-78],[-18,-75]]);
  for (const offset of [-7,9]) {
    oval(offset,-70,5,6,'#fff6e5');
    oval(offset+1,-69,2.6,3.7,'#302235');
    line(hair,2,[[offset-3,-78],[offset+4,-79]]);
  }
  oval(13,-60,4,2.3,'#e98674');
  oval(1,-58,8,4,'#66343a');
  oval(1,-59,6,1.5,'#fff6e5');
  ctx.restore();
}

function drawObstacle(obstacle) {
  const {depth,lane,kind} = obstacle;
  const x = roadX(lane,depth);
  const y = roadY(depth);
  const size = Math.min(width * .097, height * .105) * (.17 + depth);
  oval(x,y,size*.93,size*.21,'#a7654590');
  if (kind === 0) {
    polygon('#75566c',[[x-size*.8,y],[x-size*.65,y-size*.49],[x-size*.18,y-size*.79],[x+size*.43,y-size*.68],[x+size*.77,y]]);
    polygon('#a27a87',[[x-size*.65,y-size*.49],[x-size*.18,y-size*.79],[x+size*.43,y-size*.68],[x+size*.13,y-size*.43]]);
  } else if (kind === 1) {
    line('#215c4d',size*.46,[[x,y],[x,y-size]]);
    line('#3c8a6c',size*.25,[[x-size*.49,y-size*.77],[x-size*.42,y-size*.37],[x+size*.43,y-size*.43],[x+size*.52,y-size*.78]]);
  } else {
    ctx.fillStyle = '#9a5032';
    ctx.fillRect(x-size*.67,y-size*.83,size*1.34,size*.83);
    ctx.fillStyle = '#e6a054';
    ctx.fillRect(x-size*.57,y-size*.73,size*1.14,size*.64);
    line('#aa633e',size*.12,[[x-size*.53,y-size*.15],[x+size*.53,y-size*.67]]);
  }
}

function draw() {
  landscape();
  if (state === 'home') {
    const scale = Math.min(width / 310, height / 330);
    runner(width * .65, height * .64, scale, true, 1);
    runner(width * .82, height * .60, scale * .86, false, 2);
    return;
  }
  const scale = Math.min(width / 520,height / 600);
  const playerDepth = .73;
  const momDepth = Math.min(.95, playerDepth + .032 + gap * .058);
  const momPosition = position * .73 + .23;
  const miaX = roadX(position,playerDepth);
  const miaY = roadY(playerDepth) - lift() * height * .15;
  const scene = obstacles.map(obstacle => ({depth:obstacle.depth,paint:() => drawObstacle(obstacle)}));
  scene.push({depth:playerDepth,paint:() => runner(miaX,miaY,scale,false,clock*18)});
  scene.push({depth:momDepth,paint:() => runner(roadX(momPosition,momDepth),roadY(momDepth),scale*1.14,true,clock*16)});
  scene.sort((a,b) => a.depth-b.depth).forEach(item => item.paint());
}

function frame(now) {
  const dt = Math.min(.05, (now - (previous ?? now)) / 1000);
  previous = now;
  if (state === 'running') update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

byId('start').addEventListener('click',start);
byId('pause').addEventListener('click',pause);
byId('resume').addEventListener('click',() => {
  if (state === 'caught') { start(); return; }
  state = 'running';
  overlay.hidden = true;
  byId('pause').focus({preventScroll:true});
});
byId('home').addEventListener('click',() => {
  saveBest();
  state = 'home';
  overlay.hidden = hud.hidden = true;
  intro.hidden = false;
  byId('start').focus({preventScroll:true});
});

const keyActions = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',' ':'jump',a:'left',d:'right',w:'jump'};
document.addEventListener('keydown',event => {
  if (state !== 'running') return;
  const action = keyActions[event.key];
  if (action) {
    if (event.key === ' ' && event.target.closest('.keys')) return;
    event.preventDefault();
    if (!event.repeat) move(action);
  }
  if (event.key === 'Escape' || event.key === 'p') pause();
});
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click',() => move(button.dataset.action)));
canvas.addEventListener('pointerdown',event => {
  if (state !== 'running') return;
  canvas.setPointerCapture(event.pointerId);
  gesture = {id:event.pointerId,x:event.clientX,y:event.clientY};
});
canvas.addEventListener('pointerup',event => {
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  gesture = null;
  if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 'left' : 'right');
  else if (dy < -20 || Math.abs(dy) < 12) move('jump');
});
canvas.addEventListener('pointercancel',() => { gesture = null; });

/* ============================================================
   ARCANA ARENA - Game sihir 3D (Three.js r128)
   6 Level: 1-3 MUDAH, 4-6 EKSTREM (level 6 ada BOS)
   ============================================================ */
(() => {
'use strict';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const ARENA = 28;
const NOVA_R = 6;

/* ---------------- KONFIGURASI LEVEL ---------------- */
const LEVELS = [
  { name:'Hutan Percobaan',     diff:'MUDAH',   ext:false, kills:10, spawn:2.4, max:4,  speed:2.0, hp:1, contact:6,  casters:0,    shootCd:3.0, orbSpeed:6,  orbDmg:0,  boss:false, sky:0x0b1f17, ground:0x1d3b2c, accent:0x66ffaa },
  { name:'Lembah Kunang-kunang',diff:'MUDAH',   ext:false, kills:16, spawn:2.0, max:6,  speed:2.4, hp:2, contact:8,  casters:0.15, shootCd:3.2, orbSpeed:6,  orbDmg:6,  boss:false, sky:0x0f0c2e, ground:0x241a4a, accent:0x7aa2ff },
  { name:'Gerbang Penyihir',    diff:'MUDAH',   ext:false, kills:22, spawn:1.7, max:8,  speed:2.7, hp:2, contact:8,  casters:0.25, shootCd:2.8, orbSpeed:6.5,orbDmg:8,  boss:false, sky:0x1e1208, ground:0x4a3320, accent:0xffd36a },
  { name:'Kawah Kegelapan',     diff:'EKSTREM', ext:true,  kills:35, spawn:0.9, max:16, speed:3.8, hp:3, contact:12, casters:0.30, shootCd:1.8, orbSpeed:9,  orbDmg:11, boss:false, sky:0x2a0606, ground:0x3a1010, accent:0xff4433 },
  { name:'Menara Void',         diff:'EKSTREM', ext:true,  kills:45, spawn:0.7, max:20, speed:4.3, hp:4, contact:14, casters:0.35, shootCd:1.5, orbSpeed:10, orbDmg:13, boss:false, sky:0x12031f, ground:0x2a0f44, accent:0xd24bff },
  { name:'Takhta Raja Kegelapan',diff:'EKSTREM',ext:true,  kills:55, spawn:0.55,max:24, speed:4.8, hp:5, contact:16, casters:0.40, shootCd:1.2, orbSpeed:11, orbDmg:15, boss:true,  bossHp:100, sky:0x040008, ground:0x14141f, accent:0xff2266 }
];

const SPELLS = [
  { name:'Bola Api', cost:8,  cd:0.32 },
  { name:'Nova Es',  cost:25, cd:2.0  },
  { name:'Petir',    cost:20, cd:1.1  }
];

/* ---------------- SIMPAN PROGRES ---------------- */
function getUnlocked() { try { return Math.min(6, Math.max(1, parseInt(localStorage.getItem('arcana_max') || '1'))); } catch (e) { return 1; } }
function saveUnlocked(n) { try { localStorage.setItem('arcana_max', String(Math.max(getUnlocked(), Math.min(6, n)))); } catch (e) {} }

/* ---------------- SUARA SEDERHANA ---------------- */
let ac;
function sfx(f, d = 0.1, type = 'sine', vol = 0.05, slide = 0) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), ac.currentTime + d);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
  } catch (e) {}
}

/* ---------------- THREE.JS SETUP ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 15, 12);

const ambient = new THREE.AmbientLight(0x8877bb, 0.55);
const hemi = new THREE.HemisphereLight(0x9ab0ff, 0x221133, 0.5);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(12, 26, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;   sun.shadow.camera.bottom = -34;
scene.add(ambient, hemi, sun);

const playerLight = new THREE.PointLight(0x88aaff, 1.4, 16);
scene.add(playerLight);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* geometri & material bersama */
const sphereGeo = new THREE.SphereGeometry(1, 12, 12);
const ringGeo = new THREE.RingGeometry(0.85, 1, 48); ringGeo.rotateX(-Math.PI / 2);
const fireMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5500, emissiveIntensity: 2 });
const orbMat = new THREE.MeshStandardMaterial({ color: 0xff3355, emissive: 0xff1133, emissiveIntensity: 2 });
const mat = (c, e = 0, ei = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, emissive: e, emissiveIntensity: ei });

/* ---------------- EFEK ---------------- */
const fxList = [];
function addFx(mesh, life, upd) { scene.add(mesh); fxList.push({ mesh, life, max: life, upd }); }
function disposeObj(o) {
  o.traverse(c => {
    if (c.userData.ownGeo && c.geometry) c.geometry.dispose();
    if (c.material && !c.userData.shared) c.material.dispose();
  });
}
function updateFx(dt) {
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    f.life -= dt;
    const t = 1 - Math.max(f.life, 0) / f.max;
    if (f.upd) f.upd(f.mesh, t, dt);
    if (f.life <= 0) { scene.remove(f.mesh); disposeObj(f.mesh); fxList.splice(i, 1); }
  }
}
function clearFx() {
  for (const f of fxList) { scene.remove(f.mesh); disposeObj(f.mesh); }
  fxList.length = 0;
}
function burst(pos, color, n = 10, speed = 5) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.scale.setScalar(rand(0.08, 0.18));
    m.position.copy(pos);
    m.userData.v = new THREE.Vector3(rand(-1, 1), rand(0, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(speed * 0.4, speed));
    addFx(m, rand(0.4, 0.7), (mm, t, dt) => {
      mm.position.addScaledVector(mm.userData.v, dt);
      mm.userData.v.y -= 6 * dt;
      mm.material.opacity = 1 - t;
    });
  }
}
function ringFx(pos, color, radius, life = 0.45) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
  m.position.set(pos.x, 0.15, pos.z);
  addFx(m, life, (mm, t) => { const s = 0.5 + t * radius; mm.scale.set(s, s, s); mm.material.opacity = 0.9 * (1 - t); });
}
function bolt(a, b) {
  for (let k = 0; k < 2; k++) {
    const pts = [], n = 7;
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      if (i > 0 && i < n) { p.x += rand(-0.6, 0.6); p.y += rand(-0.5, 0.5); p.z += rand(-0.6, 0.6); }
      pts.push(p);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: k ? 0xffffff : 0xfff27a, transparent: true }));
    l.userData.ownGeo = true;
    addFx(l, 0.22, (m, t) => { m.material.opacity = 1 - t; });
  }
}

/* ---------------- DUNIA / ARENA ---------------- */
let world = null;
let worldRings = [];
let worldStars = null;
function buildWorld(cfg) {
  if (world) { scene.remove(world); disposeObj(world); }
  world = new THREE.Group();
  worldRings = [];
  scene.background = new THREE.Color(cfg.sky);
  scene.fog = new THREE.FogExp2(cfg.sky, 0.017);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(ARENA + 2, 64), mat(cfg.ground));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.userData.ownGeo = true;
  world.add(ground);

  // cincin rune bercahaya
  [5, 11, 18, 25].forEach((r, i) => {
    const g = new THREE.RingGeometry(r - 0.12, r + 0.12, 72);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: cfg.accent, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.userData.ownGeo = true;
    world.add(m); worldRings.push(m);
  });
  // simbol bintang rune di tengah
  const starPts = [];
  for (let i = 0; i <= 5; i++) { const a = (i * 2 / 5) * Math.PI * 2; starPts.push(new THREE.Vector3(Math.cos(a) * 9, 0.04, Math.sin(a) * 9)); }
  const sg = new THREE.BufferGeometry().setFromPoints(starPts);
  const star = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: cfg.accent, transparent: true, opacity: 0.6 }));
  star.userData.ownGeo = true; world.add(star); worldRings.push(star);

  // pilar kristal di tepi
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = ARENA - 0.5;
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 5, 8), mat(0x2a2438));
    pil.position.set(Math.cos(a) * r, 2.5, Math.sin(a) * r); pil.castShadow = true; pil.userData.ownGeo = true;
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), mat(cfg.accent, cfg.accent, 1.6));
    cr.position.set(pil.position.x, 6, pil.position.z); cr.userData.ownGeo = true; cr.userData.spin = true;
    world.add(pil, cr);
    if (i % 3 === 0) { const l = new THREE.PointLight(cfg.accent, 1.1, 18); l.position.copy(cr.position); world.add(l); }
  }
  // bintang di langit
  const sp = [];
  for (let i = 0; i < 500; i++) {
    const a = rand(0, Math.PI * 2), e = rand(0.15, 1.4), R = 140;
    sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R * 0.7 + 10, Math.sin(a) * Math.cos(e) * R);
  }
  const stg = new THREE.BufferGeometry();
  stg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  worldStars = new THREE.Points(stg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false }));
  worldStars.userData.ownGeo = true;
  world.add(worldStars);
  // kunang-kunang sihir
  const fp = [];
  for (let i = 0; i < 120; i++) { const a = rand(0, 6.28), r = rand(2, ARENA - 2); fp.push(Math.cos(a) * r, rand(0.5, 6), Math.sin(a) * r); }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: cfg.accent, size: 0.28, transparent: true, opacity: 0.8 }));
  flies.userData.ownGeo = true; flies.userData.flies = true;
  world.add(flies);
  scene.add(world);
}

/* ---------------- PEMAIN ---------------- */
const wizard = new THREE.Group();
let staffOrb;
(function makeWizard() {
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.9, 14), mat(0x5b2bd6, 0x1a0866, 0.5));
  robe.position.y = 0.95;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 16), mat(0xffd36a, 0xaa7700, 0.6));
  belt.rotation.x = Math.PI / 2; belt.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16), mat(0xf2c9a0));
  head.position.y = 2.05;
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 10), mat(0xeeeeee));
  beard.position.set(0, 1.78, 0.18); beard.rotation.x = 0.2;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.07, 18), mat(0x3a1c9c));
  brim.position.y = 2.25;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.1, 14), mat(0x3a1c9c, 0x120555, 0.5));
  hat.position.y = 2.8; hat.rotation.z = 0.12;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), mat(0xffd36a, 0xffd36a, 2));
  star.position.set(0.05, 2.45, 0.5);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8), mat(0x6b4423));
  staff.position.set(0.85, 1.25, 0.2);
  staffOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), mat(0x66e0ff, 0x33ccff, 2.5));
  staffOrb.position.set(0.85, 2.7, 0.2);
  [robe, head, brim, hat, staff, beard].forEach(m => { m.castShadow = true; });
  wizard.add(robe, belt, head, beard, brim, hat, star, staff, staffOrb);
  scene.add(wizard);
})();

const player = { pos: new THREE.Vector3(), hp: 100, mana: 100, inv: 0, dashT: 0, dashCd: 0, dashDir: new THREE.Vector3(), cd: [0, 0, 0], spell: 0 };
let stats = baseStats(0);
function baseStats(n) { return { maxHp: 100 + n * 10, maxMana: 100, dmg: 1 + n * 0.12, regen: 12 + n * 1.2, speed: 7 + n * 0.15 }; }

/* ---------------- STATE GAME ---------------- */
let state = 'menu';            // menu | playing | paused | clear | upgrade | over | win
let levelIdx = 0, cfg = LEVELS[0];
let normalKilled = 0, spawned = 0, bossSpawned = false, bossDead = false, boss = null;
let spawnT = 1, shake = 0, totalKills = 0;
const enemies = [], projs = [], eProjs = [], pickups = [];
const keys = {};
const mouseNDC = new THREE.Vector2(0, 0);
let mouseDown = false;
const aim = new THREE.Vector3(0, 0, 5);
const ray = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/* ---------------- UI ---------------- */
const overlayIds = ['menu', 'levels', 'howto', 'pause', 'upgrade', 'gameover', 'win'];
function showOverlay(id) {
  overlayIds.forEach(o => $(o).classList.toggle('show', o === id));
  $('hud').classList.toggle('show', id === null || id === 'pause');
}
function banner(text, sub, color) {
  const b = $('banner');
  b.style.color = color || '#ffd36a';
  b.innerHTML = text + (sub ? '<small>' + sub + '</small>' : '');
  b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
}
function buildLevelGrid() {
  const grid = $('levelGrid'); grid.innerHTML = '';
  const un = getUnlocked();
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    const locked = i + 1 > un;
    b.className = 'lv ' + (L.ext ? 'ext' : 'easy') + (locked ? ' locked' : '');
    b.innerHTML = `<div class="n">${locked ? '🔒' : i + 1}</div><div class="nm">${L.name}</div><span class="tag">${L.diff}</span>`;
    if (!locked) b.onclick = () => startRun(i);
    grid.appendChild(b);
  });
}
function updateSlots() {
  for (let i = 0; i < 3; i++) {
    const s = $('slot' + i);
    s.classList.toggle('sel', player.spell === i);
    s.querySelector('.cd').style.height = Math.min(100, (player.cd[i] / SPELLS[i].cd) * 100) + '%';
    s.style.opacity = player.mana >= SPELLS[i].cost ? 1 : 0.45;
  }
  $('slot3').querySelector('.cd').style.height = Math.min(100, (player.dashCd / 1.6) * 100) + '%';
}
function updateHud() {
  $('hpFill').style.width = Math.max(0, player.hp / stats.maxHp * 100) + '%';
  $('mpFill').style.width = Math.max(0, player.mana / stats.maxMana * 100) + '%';
  $('hpText').textContent = Math.ceil(Math.max(0, player.hp)) + ' / ' + stats.maxHp;
  $('mpText').textContent = Math.floor(player.mana) + ' / ' + stats.maxMana;
  let t = `Musuh: ${normalKilled}/${cfg.kills}`;
  if (cfg.boss) t += bossDead ? '  ·  BOS ✔' : (bossSpawned ? '  ·  BOS!' : '');
  $('progress').textContent = t;
  if (boss && !bossDead) { $('bossWrap').style.display = 'block'; $('bossFill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
  else $('bossWrap').style.display = 'none';
  updateSlots();
}

/* ---------------- MULAI / AKHIRI LEVEL ---------------- */
function clearEntities() {
  [enemies, projs, eProjs, pickups].forEach(arr => { arr.forEach(o => { scene.remove(o.mesh); }); arr.length = 0; });
  clearFx(); boss = null;
}
function startRun(from) {
  try { if (ac) ac.resume(); else sfx(1, 0.01, 'sine', 0.0001); } catch (e) {}
  stats = baseStats(from); totalKills = 0;
  startLevel(from);
}
function startLevel(i) {
  levelIdx = i; cfg = LEVELS[i];
  clearEntities(); buildWorld(cfg);
  normalKilled = 0; spawned = 0; bossSpawned = false; bossDead = false; spawnT = 1.2;
  player.pos.set(0, 0, 0); player.hp = stats.maxHp; player.mana = stats.maxMana;
  player.inv = 1; player.dashT = 0; player.dashCd = 0; player.cd = [0, 0, 0]; player.spell = 0;
  shake = 0; mouseDown = false;
  $('lvlName').textContent = `LEVEL ${i + 1}: ${cfg.name}`;
  $('lvlDiff').textContent = cfg.diff;
  $('lvlDiff').style.color = cfg.ext ? '#ff5555' : '#4be08b';
  state = 'playing';
  showOverlay(null);
  banner(`LEVEL ${i + 1}`, cfg.diff + ' — ' + cfg.name, cfg.ext ? '#ff5555' : '#4be08b');
  sfx(300, 0.5, 'triangle', 0.07, 400);
}
function levelComplete() {
  state = 'clear';
  eProjs.forEach(o => scene.remove(o.mesh)); eProjs.length = 0;
  saveUnlocked(levelIdx + 2);
  banner('LEVEL SELESAI!', '', '#ffd36a');
  sfx(520, 0.6, 'triangle', 0.08, 500);
  setTimeout(() => {
    if (state !== 'clear') return;
    if (levelIdx >= LEVELS.length - 1) { state = 'win'; showOverlay('win'); }
    else {
      state = 'upgrade';
      $('upSub').textContent = `Siap untuk Level ${levelIdx + 2} (${LEVELS[levelIdx + 1].diff})? Pilih satu peningkatan sihir`;
      showOverlay('upgrade');
    }
  }, 1400);
}
function gameOver() {
  state = 'over';
  $('overStat').innerHTML = `Gugur di Level ${levelIdx + 1} (${cfg.diff})<br>Musuh dikalahkan: ${totalKills + normalKilled}`;
  showOverlay('gameover');
  sfx(200, 0.8, 'sawtooth', 0.08, -150);
}

/* ---------------- MUSUH ---------------- */
function spawnEnemy(type) {
  const a = rand(0, Math.PI * 2), r = ARENA - 3;
  let pos = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  if (pos.distanceTo(player.pos) < 12) pos.set(-pos.x, 0, -pos.z);
  const g = new THREE.Group();
  const e = { mesh: g, type, pos, slow: 0, flash: 0, shootCd: rand(1, cfg.shootCd), phase: rand(0, 6) };
  let body;
  if (type === 'imp') {
    body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), mat(0x3a0a4a, 0x7a0099, 0.8));
    body.position.y = 0.9;
    for (const sx of [-0.28, 0.28]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), mat(0xffee00, 0xffee00, 3)); eye.position.set(sx, 1.05, 0.62); g.add(eye); }
    for (const sx of [-0.4, 0.4]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 6), mat(0x220022)); h.position.set(sx, 1.65, 0); h.rotation.z = -sx; g.add(h); }
    e.hp = cfg.hp; e.speed = cfg.speed * rand(0.9, 1.15); e.r = 0.8;
  } else if (type === 'caster') {
    body = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), mat(0x0a3a7a, 0x1a66ff, 1.2));
    body.position.y = 1.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 24), mat(0x66ccff, 0x66ccff, 2));
    ring.position.y = 1.5; ring.rotation.x = Math.PI / 2; g.add(ring); e.ring = ring;
    e.hp = Math.max(1, cfg.hp - 1 + (cfg.ext ? 1 : 0)); e.speed = cfg.speed * 0.8; e.r = 0.85;
  } else { // boss
    body = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), mat(0x20002a, 0xff1166, 1.0));
    body.position.y = 2.6;
    for (const sx of [-0.8, 0.8]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), mat(0xffffff, 0xff2266, 4)); eye.position.set(sx, 3, 1.9); g.add(eye); }
    for (const sx of [-1.3, 1.3]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.8, 8), mat(0x110011, 0x440022, 0.6)); h.position.set(sx, 4.8, 0); h.rotation.z = -sx * 0.3; g.add(h); }
    e.hp = cfg.bossHp; e.maxHp = cfg.bossHp; e.speed = cfg.speed * 0.55; e.r = 2.3; e.ringCd = 2; e.aimCd = 3.5;
    pos.set(0, 0, -(ARENA - 6));
  }
  body.castShadow = true; g.add(body);
  e.body = body; e.maxHp = e.maxHp || e.hp;
  g.position.copy(pos);
  scene.add(g); enemies.push(e);
  ringFx(pos, type === 'boss' ? 0xff2266 : 0xaa66ff, 3, 0.6);
  return e;
}
function hurtEnemy(e, amt) {
  e.hp -= amt; e.flash = 0.12;
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
  scene.remove(e.mesh);
  burst(e.mesh.position.clone().setY(1.2), e.type === 'boss' ? 0xff2266 : 0xcc66ff, e.type === 'boss' ? 60 : 14, e.type === 'boss' ? 12 : 6);
  sfx(160, 0.2, 'square', 0.05, -80);
  if (e.type === 'boss') { bossDead = true; ringFx(e.pos, 0xff2266, 30, 1); }
  else normalKilled++;
  if (e.type !== 'boss' && Math.random() < 0.22) spawnPickup(e.pos, Math.random() < 0.55 ? 'hp' : 'mp');
  if (e.type === 'boss') for (let k = 0; k < 5; k++) spawnPickup(e.pos.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))), k % 2 ? 'hp' : 'mp');
}
function spawnPickup(pos, kind) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), mat(kind === 'hp' ? 0x33ff77 : 0x33aaff, kind === 'hp' ? 0x11ff55 : 0x1188ff, 2));
  m.position.set(pos.x, 0.9, pos.z); scene.add(m);
  pickups.push({ mesh: m, kind, life: 14, t: rand(0, 6) });
}
function enemyShot(from, dir, speed, dmg, scale = 0.35) {
  const m = new THREE.Mesh(sphereGeo, orbMat); m.userData.shared = true;
  m.scale.setScalar(scale); m.position.copy(from); scene.add(m);
  eProjs.push({ mesh: m, vel: dir.clone().multiplyScalar(speed), life: 6, dmg });
}
function hurtPlayer(n) {
  if (player.inv > 0 || state !== 'playing') return;
  player.hp -= n; player.inv = 0.7; shake = 0.5;
  const h = $('hurt'); h.style.opacity = 1; setTimeout(() => h.style.opacity = 0, 120);
  sfx(120, 0.25, 'sawtooth', 0.07, -60);
  if (player.hp <= 0) gameOver();
}

/* ---------------- SIHIR ---------------- */
function staffTip() { const v = new THREE.Vector3(); staffOrb.getWorldPosition(v); return v; }
function castSpell(i) {
  if (state !== 'playing') return;
  const S = SPELLS[i];
  if (player.cd[i] > 0 || player.mana < S.cost) return;
  player.mana -= S.cost; player.cd[i] = S.cd;
  const tip = staffTip();
  const flatDir = new THREE.Vector3(aim.x - player.pos.x, 0, aim.z - player.pos.z);
  if (flatDir.lengthSq() < 0.01) flatDir.set(0, 0, 1);
  flatDir.normalize();

  if (i === 0) { // BOLA API
    const m = new THREE.Mesh(sphereGeo, fireMat); m.userData.shared = true;
    m.scale.setScalar(0.38); m.position.copy(tip); scene.add(m);
    projs.push({ mesh: m, vel: flatDir.clone().multiplyScalar(20), life: 1.8, dmg: stats.dmg, trail: 0 });
    sfx(500, 0.15, 'sawtooth', 0.04, -250);
  } else if (i === 1) { // NOVA ES
    ringFx(player.pos, 0x88ddff, NOVA_R + 1, 0.5);
    burst(player.pos.clone().setY(1), 0x99eeff, 22, 8);
    for (const e of [...enemies]) {
      if (e.mesh.position.distanceTo(player.pos) < NOVA_R + e.r) { e.slow = 3; hurtEnemy(e, stats.dmg * (e.type === 'boss' ? 1.5 : 1.2)); }
    }
    eProjs.forEach(p => { if (p.mesh.position.distanceTo(player.pos) < NOVA_R) p.life = 0; });
    sfx(700, 0.4, 'triangle', 0.07, -450);
  } else { // PETIR (berantai)
    const aimP = new THREE.Vector3(aim.x, 1, aim.z);
    let first = null, best = 9;
    for (const e of enemies) { const d = Math.hypot(e.pos.x - aimP.x, e.pos.z - aimP.z); if (d < best) { best = d; first = e; } }
    if (!first) {
      const end = tip.clone().addScaledVector(flatDir, 13); end.y = 1;
      bolt(tip, end);
    } else {
      const hit = [first]; let cur = first;
      for (let j = 0; j < 4; j++) {
        let nx = null, bd = 7;
        for (const e of enemies) { if (hit.includes(e)) continue; const d = e.pos.distanceTo(cur.pos); if (d < bd) { bd = d; nx = e; } }
        if (!nx) break; hit.push(nx); cur = nx;
      }
      let prev = tip, dmg = stats.dmg * 2.5;
      for (const e of hit) {
        const p = e.mesh.position.clone().setY(1.3);
        bolt(prev, p); burst(p, 0xfff27a, 8, 5);
        hurtEnemy(e, dmg); dmg *= 0.85; prev = p;
      }
    }
    sfx(900, 0.25, 'square', 0.05, -600);
  }
}
function dash() {
  if (state !== 'playing' || player.dashCd > 0) return;
  let dx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  let dz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
  if (!dx && !dz) { dx = aim.x - player.pos.x; dz = aim.z - player.pos.z; }
  const l = Math.hypot(dx, dz) || 1;
  player.dashDir.set(dx / l, 0, dz / l);
  player.dashT = 0.18; player.dashCd = 1.6; player.inv = Math.max(player.inv, 0.28);
  burst(player.pos.clone().setY(1), 0xaa88ff, 12, 5);
  sfx(250, 0.2, 'sine', 0.06, 400);
}

/* ---------------- UPDATE UTAMA ---------------- */
function updateAim() {
  camera.updateMatrixWorld();
  ray.setFromCamera(mouseNDC, camera);
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, p)) aim.copy(p);
}

function update(dt) {
  const p = player;
  // ----- gerak -----
  let mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
  let mz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
  const ml = Math.hypot(mx, mz);
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.pos.addScaledVector(p.dashDir, stats.speed * 3.4 * dt);
  } else if (ml > 0) {
    p.pos.x += (mx / ml) * stats.speed * dt;
    p.pos.z += (mz / ml) * stats.speed * dt;
  }
  const rl = Math.hypot(p.pos.x, p.pos.z);
  if (rl > ARENA - 1.3) { p.pos.x *= (ARENA - 1.3) / rl; p.pos.z *= (ARENA - 1.3) / rl; }
  p.inv -= dt; p.dashCd -= dt;
  p.mana = Math.min(stats.maxMana, p.mana + stats.regen * dt);
  for (let i = 0; i < 3; i++) p.cd[i] -= dt;

  updateAim();
  wizard.position.copy(p.pos);
  wizard.position.y = Math.sin(performance.now() / 300) * 0.06;
  wizard.rotation.y = Math.atan2(aim.x - p.pos.x, aim.z - p.pos.z);
  wizard.visible = p.inv > 0 ? (Math.floor(p.inv * 20) % 2 === 0 || p.dashT > 0) : true;
  playerLight.position.set(p.pos.x, 3, p.pos.z);
  staffOrb.scale.setScalar(1 + Math.sin(performance.now() / 150) * 0.15);

  if (mouseDown) castSpell(p.spell);

  // ----- kamera -----
  const target = new THREE.Vector3(p.pos.x * 0.9, 15, p.pos.z * 0.9 + 12);
  camera.position.lerp(target, 0.1);
  shake = Math.max(0, shake - dt * 2);
  camera.position.x += rand(-1, 1) * shake * 0.4;
  camera.position.y += rand(-1, 1) * shake * 0.4;
  camera.lookAt(p.pos.x * 0.9, 0, p.pos.z * 0.9);

  // ----- spawn -----
  spawnT -= dt;
  if (spawnT <= 0) {
    spawnT = cfg.spawn;
    const normals = enemies.filter(e => e.type !== 'boss').length;
    if (spawned < cfg.kills && normals < cfg.max) {
      spawnEnemy(Math.random() < cfg.casters ? 'caster' : 'imp'); spawned++;
      if (cfg.ext && spawned < cfg.kills && normals + 1 < cfg.max && Math.random() < 0.35) { spawnEnemy('imp'); spawned++; }
    }
  }
  if (cfg.boss && !bossSpawned && normalKilled >= Math.ceil(cfg.kills * 0.6)) {
    bossSpawned = true; boss = spawnEnemy('boss');
    banner('RAJA KEGELAPAN', 'BOS MUNCUL!', '#ff2266'); shake = 1; sfx(80, 1, 'sawtooth', 0.09, 60);
  }

  // ----- musuh -----
  for (const e of enemies) {
    const ep = e.pos, ex = p.pos.x - ep.x, ez = p.pos.z - ep.z;
    const d = Math.hypot(ex, ez) || 1;
    const nx = ex / d, nz = ez / d;
    e.slow = Math.max(0, e.slow - dt);
    const sf = e.slow > 0 ? 0.4 : 1;
    e.phase += dt;
    if (e.type === 'imp') {
      ep.x += nx * e.speed * sf * dt; ep.z += nz * e.speed * sf * dt;
      e.body.rotation.y += dt * 3; e.body.position.y = 0.9 + Math.abs(Math.sin(e.phase * 5)) * 0.25;
      if (d < e.r + 0.6) hurtPlayer(cfg.contact);
    } else if (e.type === 'caster') {
      if (d > 10) { ep.x += nx * e.speed * sf * dt; ep.z += nz * e.speed * sf * dt; }
      else if (d < 6.5) { ep.x -= nx * e.speed * sf * dt; ep.z -= nz * e.speed * sf * dt; }
      else { ep.x += -nz * e.speed * 0.6 * sf * dt; ep.z += nx * e.speed * 0.6 * sf * dt; }
      e.body.position.y = 1.5 + Math.sin(e.phase * 2) * 0.25; e.body.rotation.y += dt * 2; e.ring.rotation.z += dt * 4;
      e.shootCd -= dt * sf;
      if (e.shootCd <= 0) {
        e.shootCd = cfg.shootCd * rand(0.85, 1.2);
        const from = ep.clone().setY(1.5);
        enemyShot(from, new THREE.Vector3(nx, 0, nz), cfg.orbSpeed, cfg.orbDmg);
        sfx(380, 0.12, 'triangle', 0.03, -150);
      }
    } else { // boss
      if (d > 7) { ep.x += nx * e.speed * sf * dt; ep.z += nz * e.speed * sf * dt; }
      e.body.rotation.y += dt * 0.8; e.body.position.y = 2.6 + Math.sin(e.phase * 2) * 0.3;
      e.ringCd -= dt * sf; e.aimCd -= dt * sf;
      const hpRatio = e.hp / e.maxHp, enraged = hpRatio < 0.5;
      if (e.ringCd <= 0) {
        e.ringCd = enraged ? 2.2 : 3.2;
        const n = enraged ? 20 : 14, off = Math.random() * 6.28;
        for (let k = 0; k < n; k++) { const a = off + k / n * 6.2832; enemyShot(ep.clone().setY(1.6), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), cfg.orbSpeed * 0.7, cfg.orbDmg, 0.45); }
        ringFx(ep, 0xff2266, 8, 0.6); sfx(100, 0.4, 'sawtooth', 0.08, 80);
      }
      if (e.aimCd <= 0) {
        e.aimCd = enraged ? 1.5 : 2.4;
        for (const ang of [-0.25, 0, 0.25]) {
          const a = Math.atan2(nz, nx) + ang;
          enemyShot(ep.clone().setY(1.6), new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), cfg.orbSpeed * 1.1, cfg.orbDmg, 0.5);
        }
      }
      if (d < e.r + 0.7) hurtPlayer(cfg.contact * 1.5);
    }
    // dorong antar musuh agar tidak menumpuk
    for (const o of enemies) {
      if (o === e) continue;
      const ox = ep.x - o.pos.x, oz = ep.z - o.pos.z, od = Math.hypot(ox, oz);
      const minD = e.r + o.r;
      if (od > 0 && od < minD) { const push = (minD - od) * 0.5; ep.x += ox / od * push * 0.5; ep.z += oz / od * push * 0.5; }
    }
    e.mesh.position.x = ep.x; e.mesh.position.z = ep.z;
    e.mesh.rotation.y = Math.atan2(nx, nz);
    e.flash = Math.max(0, e.flash - dt);
    e.body.material.emissiveIntensity = e.flash > 0 ? 6 : (e.slow > 0 ? 3 : 1);
    if (e.slow > 0) e.body.material.emissive.setHex(0x66ccff);
    else e.body.material.emissive.setHex(e.type === 'boss' ? 0xff1166 : e.type === 'caster' ? 0x1a66ff : 0x7a0099);
  }

  // ----- peluru pemain -----
  for (let i = projs.length - 1; i >= 0; i--) {
    const pr = projs[i];
    pr.mesh.position.addScaledVector(pr.vel, dt);
    pr.life -= dt; pr.trail -= dt;
    if (pr.trail <= 0) { pr.trail = 0.035; burst(pr.mesh.position, 0xff9922, 1, 1.2); }
    let hitE = null;
    for (const e of enemies) {
      const dx = e.pos.x - pr.mesh.position.x, dz = e.pos.z - pr.mesh.position.z;
      if (Math.hypot(dx, dz) < e.r + 0.4) { hitE = e; break; }
    }
    if (hitE) {
      const at = pr.mesh.position.clone();
      burst(at, 0xff8833, 12, 6); ringFx(at, 0xff9944, 3, 0.3);
      for (const o of [...enemies]) {
        if (o === hitE) continue;
        if (Math.hypot(o.pos.x - at.x, o.pos.z - at.z) < 1.8 + o.r) hurtEnemy(o, pr.dmg * 0.6);
      }
      hurtEnemy(hitE, pr.dmg);
      sfx(220, 0.12, 'square', 0.04, -100);
      pr.life = 0;
    }
    if (pr.life <= 0) { scene.remove(pr.mesh); projs.splice(i, 1); }
  }

  // ----- peluru musuh -----
  for (let i = eProjs.length - 1; i >= 0; i--) {
    const pr = eProjs[i];
    pr.mesh.position.addScaledVector(pr.vel, dt);
    pr.life -= dt;
    const dx = pr.mesh.position.x - p.pos.x, dz = pr.mesh.position.z - p.pos.z;
    if (pr.life > 0 && Math.hypot(dx, dz) < 0.85 && p.inv <= 0) {
      hurtPlayer(pr.dmg); burst(pr.mesh.position, 0xff3355, 8, 5); pr.life = 0;
    }
    if (Math.hypot(pr.mesh.position.x, pr.mesh.position.z) > ARENA + 4) pr.life = 0;
    if (pr.life <= 0) { scene.remove(pr.mesh); eProjs.splice(i, 1); }
  }

  // ----- pickup -----
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    pk.life -= dt; pk.t += dt;
    pk.mesh.rotation.y += dt * 3; pk.mesh.position.y = 0.9 + Math.sin(pk.t * 4) * 0.2;
    if (Math.hypot(pk.mesh.position.x - p.pos.x, pk.mesh.position.z - p.pos.z) < 1.4) {
      if (pk.kind === 'hp') p.hp = Math.min(stats.maxHp, p.hp + 18);
      else p.mana = Math.min(stats.maxMana, p.mana + 40);
      burst(pk.mesh.position, pk.kind === 'hp' ? 0x33ff77 : 0x33aaff, 10, 4);
      sfx(800, 0.15, 'sine', 0.05, 400); pk.life = 0;
    }
    if (pk.life <= 0) { scene.remove(pk.mesh); pickups.splice(i, 1); }
  }

  updateFx(dt);
  updateHud();

  // ----- selesai level? -----
  if (state === 'playing' && normalKilled >= cfg.kills && (!cfg.boss || bossDead)) levelComplete();
}

/* ---------------- ANIMASI LATAR & LOOP ---------------- */
const clock = new THREE.Clock();
function ambientAnim(t, dt) {
  if (!world) return;
  worldRings.forEach((r, i) => { r.rotation.z += dt * (i % 2 ? 0.15 : -0.1); });
  world.children.forEach(c => {
    if (c.userData.spin) c.rotation.y += dt * 1.5;
    if (c.userData.flies) c.rotation.y += dt * 0.03;
  });
  if (worldStars) worldStars.rotation.y += dt * 0.004;
}
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (state === 'playing') update(dt);
  else if (state === 'clear') { updateFx(dt); }
  else if (state === 'menu') {
    camera.position.set(Math.cos(t * 0.12) * 20, 9, Math.sin(t * 0.12) * 20);
    camera.lookAt(0, 2, 0);
    wizard.position.set(0, Math.sin(t * 2) * 0.08, 0);
    wizard.rotation.y = t * 0.4; wizard.visible = true;
    playerLight.position.set(0, 3, 2);
    updateFx(dt);
  }
  ambientAnim(t, dt);
  renderer.render(scene, camera);
}

/* ---------------- INPUT ---------------- */
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === ' ') { e.preventDefault(); dash(); }
  if (state === 'playing') {
    if (k === '1') player.spell = 0;
    if (k === '2') player.spell = 1;
    if (k === '3') player.spell = 2;
  }
  if (k === 'escape') {
    if (state === 'playing') { state = 'paused'; mouseDown = false; showOverlay('pause'); }
    else if (state === 'paused') { state = 'playing'; showOverlay(null); }
  }
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });
addEventListener('mousemove', e => { mouseNDC.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
$('game').addEventListener('mousedown', e => { if (e.button === 0) { mouseDown = true; } });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => {
  if (state !== 'playing') return;
  player.spell = (player.spell + (e.deltaY > 0 ? 1 : 2)) % 3;
}, { passive: true });

/* tombol UI */
$('btnStart').onclick = () => startRun(0);
$('btnLevels').onclick = () => { buildLevelGrid(); showOverlay('levels'); };
$('btnHow').onclick = () => showOverlay('howto');
document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { state = 'menu'; showOverlay(b.dataset.goto); });
$('btnResume').onclick = () => { state = 'playing'; showOverlay(null); };
$('btnRestart').onclick = () => startLevel(levelIdx);
const toMenu = () => { state = 'menu'; clearEntities(); buildWorld(LEVELS[0]); showOverlay('menu'); };
$('btnQuit').onclick = toMenu; $('btnQuit2').onclick = toMenu; $('btnQuit3').onclick = toMenu;
$('btnRetry').onclick = () => startLevel(levelIdx);
$('btnAgain').onclick = () => startRun(0);
document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => {
  const u = b.dataset.up;
  if (u === 'hp') stats.maxHp += 25;
  if (u === 'dmg') stats.dmg *= 1.25;
  if (u === 'regen') stats.regen *= 1.4;
  if (u === 'speed') stats.speed *= 1.12;
  totalKills += normalKilled;
  startLevel(levelIdx + 1);
});

/* ---------------- INIT ---------------- */
buildWorld(LEVELS[0]);
showOverlay('menu');
loop();
})();

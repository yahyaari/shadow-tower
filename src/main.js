// The loop, the input, and the things that are presentation rather than rules.
//
// Two screens: the loadout you open on, and a run. A run always returns to the loadout, because
// that is where the account level went up and where the spell it opened is waiting to be picked.

import { begin, step, click, take } from './rules.js';
import { frame, hitCard, cards, loadout, hitLoadout } from './draw.js';
import * as sound from './sound.js';
import * as meta from './meta.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

let data = meta.load();
sound.setMuted(!!data.muted);

let screen = 'loadout';           // 'loadout' | 'run'
let state = null;
let show = fresh();
let last = performance.now();
let dpr = 1;

function fresh() {
  return {
    bits: [], floats: [], overCard: null, overTile: null, overBegin: false,
    hint: true, shake: 0, booked: false, won: null,
  };
}

function size() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  dpr = scale;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
window.addEventListener('resize', size);
size();

function start() {
  state = begin(Date.now(), data.loadout);
  show = fresh();
  show.hint = (data.runs || 0) < 2;
  screen = 'run';
}

/**
 * Turns what the rules reported into something to look at and listen to.
 *
 * The rules push plain events and never touch the screen. Without this a kill is silent - the
 * figure is simply gone on the next frame, and the thing the whole game is about would be the
 * one thing with no feedback at all.
 */
function readEvents() {
  for (const e of state.events) {
    if (e.kind === 'killed') {
      sound.died(e.size > 2);
      for (let i = 0; i < 11 + e.size * 7; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 30 + Math.random() * 130;
        show.bits.push({
          x: e.x, y: e.y, z: 20 + Math.random() * 46,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: 40 + Math.random() * 140,
          size: 1.6 + Math.random() * 2.6 * e.size,
          life: 0.5 + Math.random() * 0.5, max: 1,
        });
      }
    } else if (e.kind === 'struck') {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        show.bits.push({
          x: e.x, y: e.y, z: 24 + Math.random() * 28,
          vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, vz: 40 + Math.random() * 60,
          size: 1.2 + Math.random() * 1.6,
          life: 0.2 + Math.random() * 0.18, max: 0.4,
        });
      }
    } else if (e.kind === 'bitten') {
      show.shake = 1;
      sound.bitten();
    } else if (e.kind === 'cast') {
      sound.cast(e.key);
    } else if (e.kind === 'levelled') {
      sound.levelled();
    } else if (e.kind === 'boss') {
      sound.bossIn();
      show.shake = 1;
    } else if (e.kind === 'cleared') {
      sound.cleared();
    }
  }
  state.events.length = 0;
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (screen === 'loadout') {
    loadout(ctx, data, canvas.width, canvas.height, show, dpr);
    requestAnimationFrame(tick);
    return;
  }

  step(state, dt);
  readEvents();

  // Booked once: `step` runs every frame and a run that ended ten frames ago is still ended.
  if (state.phase === 'lost' && !show.booked) {
    show.booked = true;
    show.won = meta.record(data, state.stage, state.kills);
    sound.over();
  }

  show.shake = Math.max(0, show.shake - dt * 4);
  for (let i = show.bits.length - 1; i >= 0; i--) {
    const p = show.bits[i];
    p.life -= dt;
    if (p.life <= 0) { show.bits.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.vz -= 420 * dt;
    if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.7; p.vy *= 0.7; }
  }
  for (let i = show.floats.length - 1; i >= 0; i--) {
    const f = show.floats[i];
    f.life -= dt;
    f.rise += dt * 46;
    if (f.life <= 0) show.floats.splice(i, 1);
  }

  if (show.shake > 0.01) {
    ctx.translate((Math.random() - 0.5) * show.shake * 7, (Math.random() - 0.5) * show.shake * 7);
  }
  frame(ctx, canvas.width, canvas.height, state, show, dpr);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function spot(e) {
  const r = canvas.getBoundingClientRect();
  const k = canvas.width / r.width;
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
}

addEventListener('pointermove', (e) => {
  const p = spot(e);
  if (screen === 'loadout') {
    const over = hitLoadout(canvas.width, canvas.height, p.x, p.y, dpr);
    show.overTile = over === '@begin' ? null : over;
    show.overBegin = over === '@begin';
    canvas.style.cursor = over ? 'pointer' : 'default';
    return;
  }
  show.overCard = state.phase === 'picking'
    ? hitCard(canvas.width, canvas.height, p.x, p.y, dpr)
    : null;
  canvas.style.cursor = show.overCard !== null ? 'pointer' : 'crosshair';
});

addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const p = spot(e);

  if (screen === 'loadout') {
    const hit = hitLoadout(canvas.width, canvas.height, p.x, p.y, dpr);
    if (hit === '@begin') { start(); return; }
    if (hit) { meta.toggle(data, hit); show.overTile = hit; }
    return;
  }

  if (state.phase === 'lost') {
    // Back to the loadout rather than straight into another run: the account just went up, and
    // whatever that opened is sitting on that screen waiting to be picked up.
    screen = 'loadout';
    show = fresh();
    return;
  }
  if (state.phase === 'picking') {
    // A finger has no hover, so the card under it lights on contact rather than after a move
    // event that never arrives.
    const i = hitCard(canvas.width, canvas.height, p.x, p.y, dpr);
    show.overCard = i;
    if (i !== null) { take(state, i); show.overCard = null; }
    return;
  }
  click(state);
  show.hint = false;
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    sound.setMuted(!sound.isMuted());
    data.muted = sound.isMuted();
    meta.save(data);
    return;
  }
  if (screen === 'loadout') {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); start(); }
    return;
  }
  if (state.phase === 'picking') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3) take(state, n - 1);
    return;
  }
  if (state.phase === 'lost') { screen = 'loadout'; show = fresh(); return; }
  if (e.code === 'Space') { e.preventDefault(); click(state); show.hint = false; }
});
addEventListener('contextmenu', (e) => e.preventDefault());

window.ShadowTower = {
  get state() { return state; },
  get show() { return show; },
  get meta() { return data; },
  get screen() { return screen; },
  start, click, take, sound,
};
window.__cards = (w, h) => cards(w, h, dpr);
console.log('[ShadowTower] ready');

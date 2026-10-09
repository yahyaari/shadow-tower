// The loop, the mouse, and the things that are presentation rather than rules.

import { begin, step, click, take } from './rules.js';
import { frame, hitCard, cards } from './draw.js';
import * as sound from './sound.js';
import * as store from './store.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

const saved = store.load();
sound.setMuted(!!saved.muted);

let state = begin(Date.now());
let show = fresh();
let last = performance.now();
let pointer = { x: -1, y: -1 };

function fresh() {
  return { bits: [], floats: [], overCard: null, hint: true, shake: 0, best: null, booked: false };
}

let dpr = 1;

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

/**
 * Turns what the rules reported into something to look at.
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

  step(state, dt);
  readEvents();

  // Booked once: `step` is called every frame and a run that ended ten frames ago is still ended.
  if (state.phase === 'lost' && !show.booked) {
    show.booked = true;
    show.best = store.record(saved, state.stage, state.kills);
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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
  pointer = spot(e);
  show.overCard = state.phase === 'picking'
    ? hitCard(canvas.width, canvas.height, pointer.x, pointer.y, dpr)
    : null;
  canvas.style.cursor = show.overCard !== null ? 'pointer' : 'crosshair';
});

addEventListener('pointerdown', (e) => {
  e.preventDefault();
  pointer = spot(e);
  if (state.phase === 'picking') show.overCard = hitCard(canvas.width, canvas.height, pointer.x, pointer.y, dpr);
  if (state.phase === 'lost') {
    state = begin(Date.now());
    show = fresh();
    show.hint = false;
    return;
  }
  if (state.phase === 'picking') {
    // Only a card does anything while choosing. A stray click must not take one for you.
    const i = hitCard(canvas.width, canvas.height, pointer.x, pointer.y, dpr);
    if (i !== null) { take(state, i); show.overCard = null; }
    return;
  }
  click(state);
  show.hint = false;
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    sound.setMuted(!sound.isMuted());
    saved.muted = sound.isMuted();
    store.save(saved);
    return;
  }
  if (state.phase === 'picking') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3) take(state, n - 1);
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); click(state); show.hint = false; }
});
addEventListener('contextmenu', (e) => e.preventDefault());

window.ShadowTower = { get state() { return state; }, get show() { return show; }, click, take, sound };
window.__cards = (w, h) => cards(w, h, dpr);
console.log('[ShadowTower] ready');

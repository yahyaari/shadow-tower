// The loop, the input, and the things that are presentation rather than rules.
//
// Two screens: the loadout you open on, and a run. A run always returns to the loadout, because
// that is where the account level went up and where the spell it opened is waiting to be picked.

import { begin, advance, click, take, investedIn, spawn, carrying } from './rules.js';
import { frame, hitCard, cards, hitSpeed } from './draw.js';
import { menu, menuHit, heroHome, heroReach, wheelReach, restFor } from './menu.js';
import { Wedges } from './rewards.js';
import * as sound from './sound.js';
import * as meta from './meta.js';
import { setLanguage, Languages, language } from './text.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

let data = meta.load();
sound.setMuted(!!data.muted);
setLanguage(data.lang);

let screen = 'menu';              // 'menu' | 'run'
let state = null;
let show = fresh();
let last = performance.now();
let dpr = 1;

function fresh() {
  return {
    bits: [], floats: [], overCard: null, overMenu: null,
    hint: true, shake: 0, booked: false, won: null, speed: data.speed, settings: false, codexPick: null, heroScroll: null,
    // Half a wedge back, so the wheel opens with a wedge under the pointer rather than the seam
    // between two of them - which looks like a spin that landed on nothing.
    turn: -Math.PI / Wedges.length, spin: null, spinWon: null, chestWon: null, wheelScroll: 0,
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
  state = begin(Date.now(), data.loadout, data.stage, meta.heroBonus(data), meta.spellLevels(data));
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
  // Two clocks. The fight is stepped with a capped `dt`, because a stutter that let it run on for
  // a quarter of a second would move every enemy through the wall. The wheel is not a simulation
  // and nothing of the sort can happen to it, so it gets the real elapsed time - with the cap it
  // takes three seconds only on a machine that never drops below twenty frames, and crawls on
  // anything slower.
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (screen === 'menu') {
    if (data.tab === 'hero' && show.heroScroll === null) {
      show.heroScroll = heroHome(data, canvas.width, canvas.height, dpr);
    }
    // Clamped here rather than only where it is pushed. Turning a phone sideways, or opening the
    // keyboard, changes how far the tab reaches - and a scroll left over from the taller window
    // shows an empty screen with the content somewhere above it.
    if (scrolls(data.tab)) setScroll(data.tab, scrollOf(data.tab));
    spinOn(Math.min(0.25, raw));
    menu(ctx, data, canvas.width, canvas.height, show, dpr);
    requestAnimationFrame(tick);
    return;
  }

  // How fast the whole thing runs. `advance` does the stepping; it is in the rules so it can be
  // tested without a canvas.
  show.speed = data.speed;
  const dts = advance(state, dt, data.speed, readEvents);


  // Booked once: `step` runs every frame and a run that ended ten frames ago is still ended.
  if (!show.booked && (state.phase === 'done' || state.phase === 'lost')) {
    show.booked = true;
    if (state.phase === 'done') {
      // `investedIn` is read here rather than inside meta, because what the run put into each
      // spell is the run's business and shards are the account's.
      show.won = meta.finish(data, state.stage, state.wall, state.maxWall, state.kills,
        investedIn(state),
        { level: state.level, evos: carrying(state).reduce((a, k) => a + state.kit[k].evos.length, 0) });
      sound.cleared();
    } else {
      sound.over();
    }
  }

  // The specks run at the same speed as the fight, or they drift about behind it
  show.shake = Math.max(0, show.shake - dts * 4);
  for (let i = show.bits.length - 1; i >= 0; i--) {
    const p = show.bits[i];
    p.life -= dts;
    if (p.life <= 0) { show.bits.splice(i, 1); continue; }
    p.x += p.vx * dts; p.y += p.vy * dts; p.z += p.vz * dts;
    p.vz -= 420 * dts;
    if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.7; p.vy *= 0.7; }
  }
  for (let i = show.floats.length - 1; i >= 0; i--) {
    const f = show.floats[i];
    f.life -= dts;
    f.rise += dts * 46;
    if (f.life <= 0) show.floats.splice(i, 1);
  }

  if (show.shake > 0.01) {
    ctx.translate((Math.random() - 0.5) * show.shake * 7, (Math.random() - 0.5) * show.shake * 7);
  }
  frame(ctx, canvas.width, canvas.height, state, show, dpr);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/**
 * Turns the wheel.
 *
 * The prize was settled and banked the moment the wheel was pressed; this only carries the
 * picture to where that prize already is. Easing out, so it slows into the wedge rather than
 * stopping dead, and a tick for every wedge that passes the pointer - which is the sound that
 * makes it a wheel and not a rotating picture.
 */
function spinOn(dt) {
  const sp = show.spin;
  if (!sp) return;
  sp.t = Math.min(sp.dur, sp.t + dt);
  const k = sp.t / sp.dur;
  const eased = 1 - Math.pow(1 - k, 3);
  show.turn = sp.from + (sp.to - sp.from) * eased;

  const step = (Math.PI * 2) / Wedges.length;
  const past = Math.floor((show.turn - sp.from) / step);
  if (past > sp.past) { sp.past = past; sound.tick(); }

  if (sp.t >= sp.dur) {
    show.turn = sp.to;
    show.spinWon = sp.won;
    show.spin = null;
    sound.prize();
  }
}

/**
 * The two tabs that are taller than the screen.
 *
 * Both are dragged the same way and both are clamped the same way; only the measure differs, so
 * the drag below does not have to know which tab it is on.
 */
const reachOf = (tab) => (tab === 'hero'
  ? heroReach(canvas.width, canvas.height, dpr)
  : wheelReach(canvas.width, canvas.height, dpr));

const scrolls = (tab) => tab === 'hero' || tab === 'wheel';

function clampScroll(tab, at) {
  return Math.max(0, Math.min(reachOf(tab), at));
}

function setScroll(tab, at) {
  if (tab === 'hero') show.heroScroll = clampScroll(tab, at);
  else show.wheelScroll = clampScroll(tab, at);
}

const scrollOf = (tab) => (tab === 'hero' ? (show.heroScroll || 0) : (show.wheelScroll || 0));

let drag = null;

function doMenu(hit) {
  if (!hit) return;
  if (hit.what === 'openSettings') { show.settings = true; return; }
  if (hit.what === 'closeSettings') { show.settings = false; return; }
  if (hit.what === 'tab') {
    data.tab = hit.key;
    show.codexPick = null;
    show.spinWon = null;
    show.chestWon = null;
    if (hit.key === 'hero') show.heroScroll = heroHome(data, canvas.width, canvas.height, dpr);
    if (hit.key === 'wheel') show.wheelScroll = 0;
    meta.save(data);
    return;
  }
  if (hit.what === 'codexHalf') { data.codex = hit.key; meta.save(data); return; }
  if (hit.what === 'spellHalf') { data.spellTab = hit.key; meta.save(data); return; }
  if (hit.what === 'codexOpen') { show.codexPick = hit.key; return; }
  if (hit.what === 'codexClose') { show.codexPick = null; return; }
  if (hit.what === 'spin') {
    // Banked here, before any of it is drawn: a tab closed mid-spin has still paid out, and the
    // button is spent the moment it is pressed rather than when the animation finishes.
    const got = meta.spin(data);
    if (!got) return;
    const from = show.turn || 0;
    show.spinWon = null;
    show.chestWon = null;
    show.spin = {
      at: got.at, won: got, was: got.kind === 'exp' ? (data.bank || 0) - got.amount : (data.bank || 0),
      from, to: restFor(got.at, from), t: 0, dur: 3, past: 0,
    };
    return;
  }
  if (hit.what === 'chest') {
    const got = meta.openChest(data, hit.key, hit.many);
    if (!got) return;
    show.chestWon = got;
    sound.prize();
    return;
  }
  if (hit.what === 'daily') {
    if (meta.claimDaily(data, hit.key)) sound.prize();
    return;
  }
  if (hit.what === 'buySpell') {
    if (meta.buySpell(data, hit.key)) sound.levelled();
    return;
  }
  if (hit.what === 'heroBuy') {
    if (meta.buyHero(data)) sound.levelled();
    return;
  }
  if (hit.what === 'lang') {
    const next = Languages[(Languages.indexOf(language()) + 1) % Languages.length];
    setLanguage(next);
    data.lang = next;
    meta.save(data);
    return;
  }
  if (hit.what === 'sound') {
    sound.setMuted(!sound.isMuted());
    data.muted = sound.isMuted();
    meta.save(data);
    return;
  }
  if (hit.what === 'stage') {
    const far = meta.furthestStage(data);
    const want = data.stage + hit.step;
    if (want >= 1 && want <= far) { data.stage = want; meta.save(data); }
    return;
  }
  if (hit.what === 'play') { start(); return; }
  if (hit.what === 'tile') { meta.toggle(data, hit.key); return; }
}

function spot(e) {
  const r = canvas.getBoundingClientRect();
  const k = canvas.width / r.width;
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
}

addEventListener('pointermove', (e) => {
  const p = spot(e);
  if (drag) {
    const dy = p.y - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dy));
    setScroll(drag.tab, drag.from - dy);
    return;
  }
  if (screen === 'menu') {
    const hit = menuHit(data, show, canvas.width, canvas.height, p.x, p.y, dpr);
    show.overMenu = !hit ? null
      : hit.what === 'tile' ? 'tile:' + hit.key
      : hit.what === 'tab' ? 'tab:' + hit.key
      : hit.what === 'codexHalf' ? 'codexHalf:' + hit.key
      : hit.what === 'spellHalf' ? 'spellHalf:' + hit.key
      : hit.what === 'buySpell' ? 'buySpell:' + hit.key
      : hit.what === 'chest' ? `chest:${hit.key}:${hit.many}`
      : hit.what === 'daily' ? 'daily:' + hit.key
      : hit.what === 'codexOpen' ? 'codexOpen:' + hit.key
      : hit.what;
    canvas.style.cursor = hit ? 'pointer' : 'default';
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

  if (screen === 'menu') {
    // The hero comb and the rewards tab are both taller than the screen, so a press on either
    // might be a scroll. It is settled on release: moved a little, it was a tap; moved a lot, it
    // was a drag.
    if (scrolls(data.tab) && !show.settings) {
      drag = { tab: data.tab, y: p.y, from: scrollOf(data.tab), moved: 0 };
      return;
    }
    doMenu(menuHit(data, show, canvas.width, canvas.height, p.x, p.y, dpr));
    return;
  }

  // The speed control sits over the field, so it is read before a tap counts as a cast.
  if (state.phase === 'playing') {
    const pace = hitSpeed(canvas.width, canvas.height, p.x, p.y, dpr);
    if (pace) { data.speed = pace; show.speed = pace; meta.save(data); return; }
  }

  if (state.phase === 'done') {
    // Back to the menu, which has already moved on to the stage this one opened.
    screen = 'menu';
    show = fresh();
    return;
  }
  if (state.phase === 'lost') {
    // Straight back into the same stage. Failing a stage you chose is a retry, not a trip home.
    start();
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

addEventListener('pointerup', (e) => {
  if (!drag) return;
  const was = drag;
  drag = null;
  // a press that barely moved was meant as a tap
  if (was.moved > 6 * dpr) return;
  const p = spot(e);
  doMenu(menuHit(data, show, canvas.width, canvas.height, p.x, p.y, dpr));
});
addEventListener('pointercancel', () => { drag = null; });

addEventListener('wheel', (e) => {
  if (screen !== 'menu' || !scrolls(data.tab) || show.settings) return;
  e.preventDefault();
  setScroll(data.tab, scrollOf(data.tab) + e.deltaY);
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    sound.setMuted(!sound.isMuted());
    data.muted = sound.isMuted();
    meta.save(data);
    return;
  }
  if (screen === 'menu') {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (data.tab === 'map') start(); }
    return;
  }
  if (state.phase === 'picking') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3) take(state, n - 1);
    return;
  }
  if (state.phase === 'done') { screen = 'menu'; show = fresh(); return; }
  if (state.phase === 'lost') { start(); return; }
  if (e.code === 'Space') { e.preventDefault(); click(state); show.hint = false; }
});
addEventListener('contextmenu', (e) => e.preventDefault());

window.ShadowTower = {
  get state() { return state; },
  get show() { return show; },
  get meta() { return data; },
  get screen() { return screen; },
  start, click, take, sound, setLanguage,
  // Lets a tool put a named creature on the field. The families are the one thing a screenshot
  // cannot pose from the outside: they are chosen inside `spawn` from the stage.
  spawnOne: spawn,
  // The menu's presses, so a tool can press a button rather than pose the screen. A posed screen
  // only ever proves that the poser and the painter agree; this goes through the same handler a
  // finger does, so a wheel that paid one wedge and stopped on another would show up.
  menu: doMenu,
};
window.__cards = (w, h) => cards(w, h, dpr);
console.log('[ShadowTower] ready');

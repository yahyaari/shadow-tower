// The loop, the input, and the things that are presentation rather than rules.
//
// Two screens: the loadout you open on, and a run. A run always returns to the loadout, because
// that is where the account level went up and where the spell it opened is waiting to be picked.

import { begin, advance, click, take, investedIn, spawn, surge, carrying, pressure } from './rules.js';
import {
  frame, hitCard, cards, hitSpeed, hitRun, hitRunPanel, hitEnd,
  runBtns, runPanel, runRows, endBtns, endKeys, TextSpy, OverFade,
} from './draw.js';
import { menu, menuHit, heroHome, heroReach, wheelReach, boardReach, boardShape, restFor } from './menu.js';
import { Wedges } from './rewards.js';
import * as sound from './sound.js';
import * as ads from './ads.js';
import * as music from './music.js';
import * as meta from './meta.js';
import { setLanguage, Languages, language } from './text.js';

/**
 * How long the breath at each end of a run lasts, in seconds.
 *
 * A stage used to begin and end between two frames. You pressed PLAY and the wave was already
 * walking; you fought the Warden, its bar emptied, and the end panel was simply there - the
 * thing you had spent five minutes on was never seen to die. Both ends are stillness rather than
 * animation: the rules are not stepped at all, so nothing can walk, bite or be cast during them.
 *
 * A press skips either one, because a wait you cannot skip is a wait that is too long the second
 * time.
 */
const ReadyFor = 2.2;
const OverFor = OverFade;
import {
  Store as EnergyStore, PerRun as EnergyPerRun, Clean as EnergyClean,
  canRun, spendEnergy, giveEnergy, setEnergy,
} from './energy.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

// The portal BEFORE the save is read: its data module keeps the save with the account, and a
// save loaded from the browser first and written to the portal afterwards is two saves.
// Resolves either way - a portal that is not there must not stop the game from opening.
await ads.open();

let data = meta.load();

/**
 * Sound and music, as the game wants them AND as the portal insists.
 *
 * The portal's own mute outranks the in-game switch - the docs are explicit that a game option
 * must not turn back on what the platform has silenced. One function, called from everywhere
 * that touches either, so there is no second place where the two can disagree.
 */
function applyAudio() {
  sound.setMuted(!!data.muted || ads.mutedByPortal());
  music.setOn(data.music !== false && !ads.mutedByPortal());
}
applyAudio();
setLanguage(data.lang);
ads.watchSettings(() => applyAudio());

let screen = 'menu';              // 'menu' | 'run'
let state = null;
let show = fresh();
let last = performance.now();
let dpr = 1;

function fresh() {
  return {
    bits: [], floats: [], overCard: null, overMenu: null,
    hint: true, shake: 0, booked: false, won: null, speed: data.speed, settings: false, codexPick: null, heroScroll: null,
    // A horde arriving. Counts down to nothing, like the shake.
    horde: 0,
    /**
     * The two beats a run needs at its ends.
     *
     * `ready` holds the field still before the first creature is spawned, and `over` holds it
     * still after the last one falls. Without them a stage began and ended between two frames:
     * the player was fighting the Warden, its bar emptied, and the end panel was simply there -
     * they never saw it die. A fight needs a breath at each end to be a fight.
     *
     * They live here rather than in the rules because neither is simulation: the rules are not
     * stepped at all while either is running, which is also why `advance` never sees them.
     */
    ready: ReadyFor, over: 0,
    // Half a wedge back, so the wheel opens with a wedge under the pointer rather than the seam
    // between two of them - which looks like a spin that landed on nothing.
    turn: -Math.PI / Wedges.length, spin: null, spinWon: null, chestWon: null, wheelScroll: 0,
    board: null, boardScroll: 0, adMissing: 0,
    // The menu's clock. Read once a frame and handed to everything that counts down, so the
    // energy total and the time to the next one can never disagree inside a single frame.
    clock: Date.now(),
    // Which panel is open over the field, if any: 'menu' or 'cards'. Also the pause, because the
    // panel and the pause are the same thing.
    paused: null,
    // Which speeds this run may be played at. Filled in by `start`; one alone until a stage has
    // been cleared once, and all three after an advert.
    speedsOpen: [1],
    // Settings as the run screen needs to read them. `draw` has no business importing the sound,
    // and the pause menu has to say whether it is on.
    muted: false, music: true,
    // The end screen's three answers: what the advert paid, how many are left today, and the
    // stage the menu has moved on to.
    doubled: null, adsDouble: 0, nextStage: 0,
  };
}

/**
 * Tuval, görülebilen alana sığar — pencerenin tamamına değil.
 *
 * Telefonun çentiği, ev çubuğu, ve portalın kendi çerçevesi ekranın kenarlarından pay alıyor.
 * Bunlar `env(safe-area-inset-*)` ile söyleniyor ve tuval onları ÇIKARARAK kuruluyor: böylece
 * yerleşimin tamamı - en altta duran sekme şeridi dahil - güvenli alanın içinde kalıyor ve
 * hiçbir ölçü fonksiyonunun bundan haberi olması gerekmiyor.
 *
 * Sebep: CrazyGames'in QA oynatıcısında sekme şeridine ulaşılamadı ve oyuncu ödüller sekmesinde
 * kapana kısıldı. Oyunun tek çıkışı ekranın tam dibindeydi, ve bir gömülü oynatıcıda ekranın tam
 * dibi her zaman görünür değil.
 */
function insets() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;'
    + 'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);'
    + 'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)';
  document.body.appendChild(el);
  const c = getComputedStyle(el);
  const n = (v) => Math.max(0, Math.round(parseFloat(v) || 0));
  const out = {
    top: n(c.paddingTop), right: n(c.paddingRight),
    bottom: n(c.paddingBottom), left: n(c.paddingLeft),
  };
  el.remove();
  return out;
}

function size() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  dpr = scale;
  const pad = insets();
  const w = Math.max(240, window.innerWidth - pad.left - pad.right);
  const h = Math.max(240, window.innerHeight - pad.top - pad.bottom);
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.marginLeft = pad.left + 'px';
  canvas.style.marginTop = pad.top + 'px';
}
window.addEventListener('resize', size);
size();

function start() {
  // Paid on the way in, not on the way out. Charged at the end, quitting a run you were losing
  // would be free, and the one thing an energy gate must not do is reward giving up.
  if (!spendEnergy(data, EnergyPerRun)) return;
  meta.save(data);
  state = begin(Date.now(), data.loadout, data.stage, meta.heroBonus(data), meta.spellLevels(data));
  music.start('run', Date.now());
  show = fresh();
  show.hint = (data.runs || 0) < 2;
  // Which speeds this stage allows, read once at the start and kept for the run. A stage you
  // have never finished is played at one; a stage you are repeating opens one and a half; an
  // advert opens all three. Saved choice is clamped, or a stage would open at a speed it does
  // not allow simply because the last one did.
  show.speedsOpen = meta.speedsFor(data, data.stage);
  show.speed = meta.speedAllowed(data, data.stage, data.speed);
  data.speed = show.speed;
  screen = 'run';
  ads.playing(true);
}

/** Back to the menu, and the one place that tells the portal play has stopped. */
function toMenu() {
  ads.playing(false);
  screen = 'menu';
  show = fresh();
}

/** Silences everything while an advert plays, and gives it back however the advert ends. */
function hush(on) {
  if (on) { sound.setMuted(true); music.setOn(false); }
  else applyAudio();
}

const watchAd = () => ads.show(hush);

/**
 * Turns what the rules reported into something to look at and listen to.
 *
 * The rules push plain events and never touch the screen. Without this a kill is silent - the
 * figure is simply gone on the next frame, and the thing the whole game is about would be the
 * one thing with no feedback at all.
 */
/**
 * A number over whatever was just hit.
 *
 * Capped and merged rather than one per strike: a nova landing on thirty creatures threw thirty
 * numbers at the same instant and the screen went white. One float per creature position, and a
 * second hit in the same place adds to the one already rising.
 */
function hitShow(e) {
  if (!(e.dealt > 0)) return;
  const near = show.floats.find((f) => f.hit
    && Math.abs(f.x - e.x) < 26 && Math.abs(f.y - e.y) < 26 && f.life > 0.35);
  if (near) {
    near.sum += e.dealt;
    near.text = String(Math.round(near.sum));
    near.life = Math.max(near.life, 0.6);
    return;
  }
  if (show.floats.length > 26) return;
  show.floats.push({
    hit: true, sum: e.dealt, text: String(Math.round(e.dealt)),
    x: e.x, y: e.y, life: 0.8, rise: 0,
    big: e.kind === 'killed',
  });
}

function readEvents() {
  for (const e of state.events) {
    if (e.kind === 'killed') {
      hitShow(e);
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
      hitShow(e);
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
    } else if (e.kind === 'surge') {
      // Long enough to be read and short enough that it is gone before the horde arrives.
      show.horde = 1.9;
      show.hordeAt = e.a;
      sound.bossIn();
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
    show.clock = Date.now();
    const what = scroller();
    if (what) setScroll(what, scrollOf(what));
    spinOn(Math.min(0.25, raw));
    music.start('menu');
    menu(ctx, data, canvas.width, canvas.height, show, dpr);
    requestAnimationFrame(tick);
    return;
  }

  // How fast the whole thing runs. `advance` does the stepping; it is in the rules so it can be
  // tested without a canvas.
  show.speed = data.speed;
  show.muted = sound.isMuted();
  show.music = data.music !== false;
  // The bed keeps time with the same number the wave is spawned from, so it tightens as the
  // field fills and opens out again when it clears.
  music.feel(pressure(state));
  // The breath before it starts. Nothing is stepped: the wall and the wizard stand there, the
  // stage says its name, and the first creature has not been spawned yet.
  if (show.ready > 0) {
    show.ready = Math.max(0, show.ready - dt);
    frame(ctx, canvas.width, canvas.height, state, show, dpr);
    requestAnimationFrame(tick);
    return;
  }

  // A panel you read while the wave keeps walking is a panel that costs you the run. Nothing is
  // stepped while one is open - not the fight, not the specks, not the floating numbers. Nor is
  // it stepped during the breath after the end, which is there so the last creature can be seen
  // to fall.
  const dts = (show.paused || show.over > 0) ? 0 : advance(state, dt, data.speed, readEvents);
  if (show.over > 0) show.over = Math.max(0, show.over - dt);


  // Booked once: `step` runs every frame and a run that ended ten frames ago is still ended.
  if (!show.booked && (state.phase === 'done' || state.phase === 'lost')) {
    show.booked = true;
    show.over = OverFor;
    if (state.phase === 'done') {
      // `investedIn` is read here rather than inside meta, because what the run put into each
      // spell is the run's business and shards are the account's.
      show.won = meta.finish(data, state.stage, state.wall, state.maxWall, state.kills,
        investedIn(state),
        { level: state.level, evos: carrying(state).reduce((a, k) => a + state.kit[k].evos.length, 0) });
      // The wall never touched gives some of it back. The only concrete thing three stars buy,
      // now that they buy nothing else.
      if (show.won && show.won.stars >= 3) {
        giveEnergy(data, EnergyClean);
        show.energyBack = EnergyClean;
        meta.save(data);
      }
      // Read once, here, rather than every frame: `finish` has just moved the account on, and
      // these are the two things the buttons at the foot are decided by.
      show.nextStage = data.stage;
      show.adsDouble = ads.ready() ? meta.adsLeft(data, 'double') : 0;
      sound.cleared();
      ads.playing(false);
      // A stage cleared for the FIRST time, which happens a dozen times in the life of an
      // account. Sparingly is what the portal asks for, and this is what sparingly means here.
      if (show.won && show.won.first) ads.cheer();
      ads.progress((meta.furthestStage(data) - 1) / 12 * 100);
    } else {
      sound.over();
      ads.playing(false);
    }
  }

  // The specks run at the same speed as the fight, or they drift about behind it
  show.shake = Math.max(0, show.shake - dts * 4);
  show.horde = Math.max(0, show.horde - dts);
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
// Yukleme bitti: ilk kare cizilmek uzere. `loadingStop` portala BURADAN gidiyor, `ads.open()`
// icinden degil - oradan gitse baslangic ve bitis ayni milisaniyede olurdu.
ads.loaded();
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
/**
 * Everything taller than the window it is in, under one name.
 *
 * An open board counts as its own scroller and wins over whatever tab is behind it, because the
 * board is what the finger is on.
 */
const reachOf = (what) => {
  if (what === 'board') {
    const shape = boardShape(data, show.board);
    return boardReach(canvas.width, canvas.height, dpr, shape.many, shape.tall);
  }
  return what === 'hero'
    ? heroReach(canvas.width, canvas.height, dpr)
    : wheelReach(canvas.width, canvas.height, dpr);
};

const scroller = () => (show.board ? 'board' : (data.tab === 'hero' || data.tab === 'wheel') ? data.tab : null);

function setScroll(what, at) {
  const to = Math.max(0, Math.min(reachOf(what), at));
  if (what === 'board') show.boardScroll = to;
  else if (what === 'hero') show.heroScroll = to;
  else show.wheelScroll = to;
}

const scrollOf = (what) => (what === 'board' ? (show.boardScroll || 0)
  : what === 'hero' ? (show.heroScroll || 0) : (show.wheelScroll || 0));

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
  if (hit.what === 'adSpin' || hit.what === 'adChest') {
    // The advert is watched first and booked after. An advert the player closed costs nothing,
    // and nothing is paid for one that never finished.
    const kind = hit.what === 'adSpin' ? 'spin' : hit.key;
    if (meta.adsLeft(data, kind) <= 0) return;
    watchAd().then((watched) => {
      if (!watched || !meta.useAd(data, kind)) { show.adMissing = performance.now(); return; }
      if (hit.what === 'adSpin') {
        const got = meta.spin(data, Math.random(), undefined, Math.random(), true);
        if (!got) return;
        const from = show.turn || 0;
        show.spinWon = null;
        show.chestWon = null;
        show.spin = {
          at: got.at, won: got,
          was: got.kind === 'exp' ? (data.bank || 0) - got.amount : (data.bank || 0),
          from, to: restFor(got.at, from), t: 0, dur: 3, past: 0,
        };
      } else {
        const got = meta.openChest(data, hit.key, 1, true);
        if (got) { show.chestWon = got; sound.prize(); }
      }
    });
    return;
  }
  if (hit.what === 'chest') {
    const got = meta.openChest(data, hit.key, hit.many);
    if (!got) return;
    show.chestWon = got;
    sound.prize();
    return;
  }
  if (hit.what === 'board') { show.board = hit.key; show.boardScroll = 0; return; }
  if (hit.what === 'week') {
    if (meta.claimWeek(data)) sound.prize();
    return;
  }
  if (hit.what === 'feat') {
    if (meta.claimFeat(data, hit.key)) sound.prize();
    return;
  }
  if (hit.what === 'boardClose') { show.board = null; return; }
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
  if (hit.what === 'energyAd') {
    if (!ads.ready() || meta.adsLeft(data, 'energy') <= 0) { show.adMissing = performance.now(); return; }
    watchAd().then((watched) => {
      if (!watched || !meta.useAd(data, 'energy')) { show.adMissing = performance.now(); return; }
      setEnergy(data, EnergyStore);
      meta.save(data);
      sound.prize();
    });
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
    data.muted = !data.muted;
    applyAudio();
    meta.save(data);
    return;
  }
  if (hit.what === 'music') {
    data.music = data.music === false;
    applyAudio();
    if (data.music && !ads.mutedByPortal()) music.start(screen === 'run' ? 'run' : 'menu');
    meta.save(data);
    return;
  }
  if (hit.what === 'stage') {
    const far = meta.furthestStage(data);
    const want = data.stage + hit.step;
    if (want >= 1 && want <= far) { data.stage = want; meta.save(data); }
    return;
  }
  if (hit.what === 'play') { if (canRun(data)) start(); return; }
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
      : hit.what === 'board' ? 'board:' + hit.key
      : hit.what === 'feat' ? 'feat:' + hit.key
      : hit.what === 'adChest' ? 'adChest:' + hit.key
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
    const what = scroller();
    if (what && !show.settings) {
      drag = { tab: what, y: p.y, from: scrollOf(what), moved: 0 };
      return;
    }
    doMenu(menuHit(data, show, canvas.width, canvas.height, p.x, p.y, dpr));
    return;
  }

  // A panel is open, so it is the only thing on the screen that answers a press - including the
  // field behind it, which closes it rather than casting through it.
  if (show.paused) {
    doPause(hitRunPanel(canvas.width, canvas.height, p.x, p.y, dpr, show.paused, state));
    return;
  }

  // The breath before the first wave: a press skips it, and nothing else happens.
  if (show.ready > 0) { show.ready = 0; return; }

  // The speed control and the two corner buttons sit over the field, so they are read before a
  // tap counts as a cast.
  if (state.phase === 'playing') {
    const pace = hitSpeed(canvas.width, canvas.height, p.x, p.y, dpr);
    if (pace) { takeSpeed(pace); return; }
    const btn = hitRun(canvas.width, canvas.height, p.x, p.y, dpr);
    if (btn) { show.paused = btn; ads.playing(false); return; }
  }

  // A finished run is answered by its buttons and by nothing else. It used to take a press
  // anywhere, which on a loss put you back in the stage before you had read why you lost.
  if (state.phase === 'done' || state.phase === 'lost') {
    // A press during the breath skips it rather than pressing a button that is not drawn yet.
    if (show.over > 0) { show.over = 0; return; }
    doEnd(hitEnd(canvas.width, canvas.height, p.x, p.y, dpr, state, show));
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

/**
 * A press on one of the speed pills.
 *
 * A pill the stage does not allow is not dead - it is the advert. Watched through, every speed
 * opens for the rest of this run, which is the one thing an advert sells here that is worth
 * buying: the five minutes you have already spent once.
 */
function takeSpeed(pace) {
  if ((show.speedsOpen || [1]).includes(pace)) {
    show.speed = pace;
    data.speed = pace;
    meta.save(data);
    return;
  }
  if (!ads.ready() || meta.adsLeft(data, 'speed') <= 0) { show.adMissing = performance.now(); return; }
  watchAd().then((watched) => {
    if (!watched || !meta.useAd(data, 'speed')) { show.adMissing = performance.now(); return; }
    show.speedsOpen = meta.speedsFor(data, state.stage, true);
    show.speed = pace;
    data.speed = pace;
    meta.save(data);
  });
}

/**
 * A row of the pause menu.
 *
 * The settings here are the same three the opening screen has and are saved the same way, so a
 * language changed mid-run is the language the menu opens in.
 */
function doPause(what) {
  if (!what || what === 'close' || what === 'resume') { show.paused = null; ads.playing(true); return; }
  if (what === 'sound') {
    data.muted = !data.muted;
    applyAudio();
    meta.save(data);
    return;
  }
  if (what === 'music') {
    data.music = data.music === false;
    applyAudio();
    if (data.music && !ads.mutedByPortal()) music.start('run');
    meta.save(data);
    return;
  }
  if (what === 'lang') {
    const next = Languages[(Languages.indexOf(language()) + 1) % Languages.length];
    setLanguage(next);
    data.lang = next;
    meta.save(data);
    return;
  }
  if (what === 'leave') toMenu();
}

/**
 * A button at the foot of a finished run.
 *
 * The advert is watched first and booked after, as everywhere else: an advert the player closed
 * costs an allowance nothing and pays nothing.
 */
function doEnd(what) {
  if (what === 'again' || what === 'next') { start(); return; }
  if (what === 'menu') { toMenu(); return; }
  if (what !== 'double') return;
  if (!show.won || show.doubled || meta.adsLeft(data, 'double') <= 0) return;
  watchAd().then((watched) => {
    if (!watched || !meta.useAd(data, 'double')) { show.adMissing = performance.now(); return; }
    const got = meta.doubleUp(data, show.won);
    if (!got) return;
    show.doubled = got;
    show.adsDouble = meta.adsLeft(data, 'double');
    sound.prize();
  });
}

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
  if (screen !== 'menu' || show.settings) return;
  const what = scroller();
  if (!what) return;
  e.preventDefault();
  setScroll(what, scrollOf(what) + e.deltaY);
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    data.muted = !data.muted;
    applyAudio();
    meta.save(data);
    return;
  }
  if (screen === 'menu') {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (data.tab === 'map') start(); }
    return;
  }
  // Escape is the pause, and the way out of either panel. Tab is the card list, because that is
  // the one you want while you are deciding what to take next.
  if (e.key === 'Escape') {
    show.paused = show.paused ? null : 'menu';
    return;
  }
  if (show.paused) {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); show.paused = null; }
    return;
  }
  if (e.key === 'Tab' && state.phase === 'playing') {
    e.preventDefault();
    show.paused = 'cards';
    return;
  }
  if (state.phase === 'picking') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3) take(state, n - 1);
    return;
  }
  if (show.over > 0) { show.over = 0; return; }
  if (state.phase === 'done') { toMenu(); return; }
  if (state.phase === 'lost') { start(); return; }
  if (e.code === 'Space') { e.preventDefault(); click(state); show.hint = false; }
});
addEventListener('contextmenu', (e) => e.preventDefault());

window.ShadowTower = {
  get state() { return state; },
  get show() { return show; },
  get meta() { return data; },
  get screen() { return screen; },
  start, click, take, sound, music, setLanguage,
  // Lets a tool put a named creature on the field. The families are the one thing a screenshot
  // cannot pose from the outside: they are chosen inside `spawn` from the stage.
  spawnOne: spawn,
  // Ve bir sürü, aynı sebeple: sürünün ne zaman geldiğini saat söylüyor, dışarıdan poz verilemez.
  surgeOne: surge,
  // The menu's presses, so a tool can press a button rather than pose the screen. A posed screen
  // only ever proves that the poser and the painter agree; this goes through the same handler a
  // finger does, so a wheel that paid one wedge and stopped on another would show up.
  menu: doMenu,
  // The run screen's presses, for the same reason: a panel a tool posed proves only that the
  // poser and the painter agree.
  pause: doPause, endPress: doEnd,
  // Where the run screen's buttons actually are, and at what ratio they were measured. A tool
  // that worked this out for itself would only ever check its own arithmetic.
  get dpr() { return dpr; },
  ui: { runBtns, runPanel, runRows, endBtns, endKeys },
  // Every label of the last drawn frame, with its box, so a tool can find two of them sitting on
  // top of each other. Nothing can read that off the source: the two are written by different
  // functions at sizes that depend on the window.
  spy: TextSpy,
};
window.__cards = (w, h) => cards(w, h, dpr);
console.log('[ShadowTower] ready');

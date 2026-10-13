// The menu: five tabs along the bottom, and whatever the chosen one wants to show.
//
// Nothing here decides anything either - it reads the saved account and draws it. The field has
// its own file; this is the place you come back to between stages, and it is the part a player
// sees first, so it gets the same two inks and the same care.
//
// Three of the tabs are skeletons on purpose. The shape of the menu is the thing to agree on
// first; what goes inside each tab is a conversation per tab.

import {
  Inks, Face, write, fitWrite, wrap, sigil, star, stars, creatureMark,
} from './draw.js';
import { say, UI, LanguageNames, language } from './text.js';
import { Spells, UnlockAt, LoadoutSize, Always, spellKeys, nextUnlock } from './spells.js';
import { needFor, furthestStage, starsAt, totalStars } from './meta.js';
import { stageOf, kindsOn } from './stages.js';
import { Kinds } from './rules.js';

const { Black, Pale } = Inks;

/** The five, left to right, with the one that matters most in the middle. */
export const Tabs = [
  { key: 'wheel', name: ['Rewards', 'Ödüller'] },
  { key: 'hero', name: ['Hero', 'Kahraman'] },
  { key: 'map', name: ['Map', 'Harita'] },
  { key: 'spells', name: ['Spells', 'Büyüler'] },
  { key: 'codex', name: ['Codex', 'Külliyat'] },
];

const unit = (dpr) => Math.max(1, Math.min(2.4, dpr));

// --- where everything is ------------------------------------------------------------------------

/**
 * The five tabs, as separate cards.
 *
 * Cards rather than one continuous bar, and marks rather than words. Five labels across the foot
 * of a phone are five pieces of small text nobody reads twice; the shapes are distinct enough to
 * be learnt once, and the chosen one lifts clear of the row and fills in, which says which it is
 * without saying anything.
 */
export function navBar(w, h, dpr = 1) {
  const U = unit(dpr);
  const gap = 10 * U;
  const cw = Math.min(84 * U, (w - 24 * U - gap * (Tabs.length - 1)) / Tabs.length);
  const ch = 64 * U;
  const total = Tabs.length * cw + (Tabs.length - 1) * gap;
  const left = w / 2 - total / 2;
  const y = h - ch - 16 * U;
  return Tabs.map((t, i) => ({
    ...t, i,
    x: left + i * (cw + gap), y, w: cw, h: ch,
    cx: left + i * (cw + gap) + cw / 2, cy: y + ch / 2,
  }));
}

const narrow = (w, h) => h > w * 1.1;

/**
 * The band between the top bar and the tabs - everything a tab draws goes in here.
 *
 * Taller on a phone, because the top bar needs two rows there. Laid out in one row for both, the
 * level, the star count and the two setting pills all landed on top of each other.
 */
export function band(w, h, dpr = 1) {
  const U = unit(dpr);
  const top = (narrow(w, h) ? 96 : 84) * U;
  const bottom = h - 96 * U;
  return { top, bottom, mid: (top + bottom) / 2, height: bottom - top };
}

export function artBox(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const aw = Math.min(660 * U, w - 72 * U);
  const ah = Math.min(aw * 0.42, b.height * 0.44);
  return { x: w / 2 - aw / 2, y: b.top + 10 * U, w: aw, h: ah };
}

export function arrows(w, h, dpr = 1) {
  const U = unit(dpr);
  const a = artBox(w, h, dpr);
  const r = 26 * U;
  const y = a.y + a.h / 2 - r;
  return {
    prev: { x: a.x - r * 2 - 4 * U, y, w: r * 2, h: r * 2 },
    next: { x: a.x + a.w + 4 * U, y, w: r * 2, h: r * 2 },
  };
}

export function playBox(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const bw = Math.min(300 * U, w - 80 * U);
  return { x: w / 2 - bw / 2, y: b.bottom - 66 * U, w: bw, h: 58 * U };
}

/** The loadout grid, inside the band, for the spells tab. */
export function spellTiles(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const tall = h > w * 1.1;
  const cols = tall ? 2 : 5;
  const rows = Math.ceil(spellKeys.length / cols);
  const gap = 10 * U;
  const tw = Math.min(tall ? 300 * U : 200 * U, (w - 40 * U - (cols - 1) * gap) / cols);
  const th = Math.min(tall ? 72 * U : 92 * U, (b.height - 70 * U - (rows - 1) * gap) / rows);
  const left = w / 2 - (cols * tw + (cols - 1) * gap) / 2;
  const top = b.top + 56 * U;
  const order = [...spellKeys].sort((a, c) => UnlockAt[a] - UnlockAt[c]);
  return order.map((key, i) => ({
    key,
    x: left + (i % cols) * (tw + gap),
    y: top + Math.floor(i / cols) * (th + gap),
    w: tw, h: th, tall,
  }));
}

/** The one button that opens the settings. */
export function gearBox(w, h, dpr = 1) {
  const U = unit(dpr);
  const r = 34 * U;
  return { x: w - 18 * U - r, y: 16 * U, w: r, h: r };
}

/**
 * The settings panel.
 *
 * A panel rather than two pills parked in the corner of the menu. Pills were fine while there
 * were two of them; the moment anything else wants a switch there is nowhere to put it, and on a
 * phone they were already fighting the account bar for the same row.
 */
export function settingsPanel(w, h, dpr = 1) {
  const U = unit(dpr);
  const pw = Math.min(420 * U, w - 48 * U);
  const rowH = 52 * U;
  const rows = 2;
  const ph = 86 * U + rows * rowH + 20 * U;
  const x = w / 2 - pw / 2;
  const y = h / 2 - ph / 2;
  const row = (i) => ({ x: x + 16 * U, y: y + 76 * U + i * rowH, w: pw - 32 * U, h: rowH - 8 * U });
  return {
    box: { x, y, w: pw, h: ph },
    lang: row(0),
    sound: row(1),
    close: { x: x + pw - 54 * U, y: y + 12 * U, w: 40 * U, h: 40 * U },
  };
}

const inside = (r, x, y) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

export function menuHit(data, show, w, h, px, py, dpr = 1) {
  // While the settings are open they are the only thing that can be touched, bar the way out.
  if (show.settings) {
    const sp = settingsPanel(w, h, dpr);
    if (inside(sp.close, px, py)) return { what: 'closeSettings' };
    if (inside(sp.lang, px, py)) return { what: 'lang' };
    if (inside(sp.sound, px, py)) return { what: 'sound' };
    if (!inside(sp.box, px, py)) return { what: 'closeSettings' };
    return null;
  }

  if (inside(gearBox(w, h, dpr), px, py)) return { what: 'openSettings' };
  for (const t of navBar(w, h, dpr)) if (inside(t, px, py)) return { what: 'tab', key: t.key };

  if (data.tab === 'map') {
    const a = arrows(w, h, dpr);
    if (inside(a.prev, px, py)) return { what: 'stage', step: -1 };
    if (inside(a.next, px, py)) return { what: 'stage', step: 1 };
    if (inside(playBox(w, h, dpr), px, py)) return { what: 'play' };
  }
  if (data.tab === 'spells') {
    for (const t of spellTiles(w, h, dpr)) if (inside(t, px, py)) return { what: 'tile', key: t.key };
  }
  return null;
}

// --- the marks on the tabs ----------------------------------------------------------------------

function tabMark(ctx, key, x, y, s, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = s * 0.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (key === 'wheel') {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12);
      ctx.lineTo(Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.46);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2); ctx.fill();

  } else if (key === 'hero') {
    ctx.beginPath(); ctx.arc(0, -s * 0.3, s * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.26, s * 0.46);
    ctx.quadraticCurveTo(-s * 0.1, -s * 0.12, 0, -s * 0.12);
    ctx.quadraticCurveTo(s * 0.1, -s * 0.12, s * 0.26, s * 0.46);
    ctx.closePath(); ctx.fill();

  } else if (key === 'map') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.46, -s * 0.3); ctx.lineTo(-s * 0.15, -s * 0.44);
    ctx.lineTo(s * 0.15, -s * 0.3); ctx.lineTo(s * 0.46, -s * 0.44);
    ctx.lineTo(s * 0.46, s * 0.3); ctx.lineTo(s * 0.15, s * 0.44);
    ctx.lineTo(-s * 0.15, s * 0.3); ctx.lineTo(-s * 0.46, s * 0.44);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.44); ctx.lineTo(-s * 0.15, s * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.15, -s * 0.3); ctx.lineTo(s * 0.15, s * 0.44); ctx.stroke();

  } else if (key === 'spells') {
    ctx.beginPath();
    ctx.roundRect(-s * 0.4, -s * 0.44, s * 0.8, s * 0.88, s * 0.08);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.44); ctx.lineTo(-s * 0.18, s * 0.44); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const o = (i % 2 ? s * 0.07 : s * 0.19);
      i ? ctx.lineTo(s * 0.13 + Math.cos(a) * o, Math.sin(a) * o)
        : ctx.moveTo(s * 0.13 + Math.cos(a) * o, Math.sin(a) * o);
    }
    ctx.closePath(); ctx.fill();

  } else {
    for (let i = 0; i < 4; i++) {
      const y0 = -s * 0.34 + i * s * 0.23;
      ctx.beginPath(); ctx.arc(-s * 0.34, y0, s * 0.055, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, y0); ctx.lineTo(s * 0.4 - (i % 2) * s * 0.16, y0);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- the stage portrait ---------------------------------------------------------------------

/**
 * A picture of the place, drawn rather than loaded.
 *
 * Same two inks as the field, so the menu and the game look like the same game. Seeded off the
 * stage number, so the fortieth stage has its own skyline and it is the same one every time.
 */
function portrait(ctx, r, stage, look) {
  let seed = (stage * 2654435761) >>> 0;
  const roll = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, r.h * 0.05);
  ctx.clip();

  const sky = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  sky.addColorStop(0, '#f7f4ee');
  sky.addColorStop(0.7, Pale);
  sky.addColorStop(1, '#c9c0ae');
  ctx.fillStyle = sky;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // a low sun, the thing everything else is a silhouette against
  const sunX = r.x + r.w * (0.3 + roll() * 0.4);
  const sunY = r.y + r.h * 0.62;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r.h * 0.9);
  glow.addColorStop(0, 'rgba(255,253,246,0.95)');
  glow.addColorStop(1, 'rgba(236,231,220,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const floor = r.y + r.h * 0.88;
  const scale = r.h / 240;

  // --- far shapes, faint
  ctx.fillStyle = Black;
  ctx.globalAlpha = 0.22;
  if (look === 'ridge' || look === 'hollow') {
    ctx.beginPath();
    ctx.moveTo(r.x, floor);
    for (let x = 0; x <= 1.001; x += 0.08) {
      const hgt = (look === 'ridge' ? 0.3 : 0.14) * r.h * (0.5 + Math.sin(x * 9 + stage) * 0.5);
      ctx.lineTo(r.x + r.w * x, floor - hgt);
    }
    ctx.lineTo(r.x + r.w, floor);
    ctx.closePath(); ctx.fill();
  } else {
    for (let i = 0; i < 14; i++) {
      const x = r.x + roll() * r.w;
      const hgt = (18 + roll() * 34) * scale;
      ctx.fillRect(x, floor - hgt, 2.5 * scale, hgt);
    }
  }
  ctx.globalAlpha = 1;

  // --- the keep, small and in the middle distance
  {
    const k = 26 * scale;
    const kx = r.x + r.w / 2;
    const ky = floor - 4 * scale;
    ctx.fillStyle = Black;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(kx - k * 0.42, ky);
    ctx.quadraticCurveTo(kx - k * 0.2, ky - k * 1.1, kx + k * 0.16, ky - k * 2.1);
    ctx.quadraticCurveTo(kx + k * 0.04, ky - k * 1.0, kx + k * 0.42, ky);
    ctx.closePath(); ctx.fill();
    for (let i = -3; i <= 3; i++) {
      ctx.fillRect(kx + i * k * 0.34 - k * 0.1, ky - k * 0.34, k * 0.2, k * 0.34);
    }
    ctx.globalAlpha = 1;
  }

  // --- near shapes, solid
  ctx.fillStyle = Black;
  ctx.strokeStyle = Black;
  ctx.lineCap = 'round';
  const near = look === 'field' ? 5 : look === 'stones' ? 7 : look === 'road' ? 8 : 13;
  for (let i = 0; i < near; i++) {
    const x = r.x + (i / (near - 1)) * r.w + (roll() - 0.5) * r.w * 0.08;
    const hgt = (40 + roll() * 60) * scale;
    const lean = (roll() - 0.5) * 0.4;
    if (look === 'stones') {
      ctx.beginPath();
      ctx.moveTo(x - 9 * scale, floor);
      ctx.lineTo(x - 7 * scale, floor - hgt);
      ctx.lineTo(x + 7 * scale, floor - hgt * 0.92);
      ctx.lineTo(x + 9 * scale, floor);
      ctx.closePath(); ctx.fill();
    } else if (look === 'field' && i % 2) {
      ctx.beginPath();
      ctx.moveTo(x - 14 * scale, floor);
      ctx.lineTo(x - 5 * scale, floor - hgt * 0.35);
      ctx.lineTo(x + 10 * scale, floor - hgt * 0.22);
      ctx.lineTo(x + 16 * scale, floor);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.lineWidth = 4.5 * scale;
      ctx.beginPath();
      ctx.moveTo(x, floor); ctx.lineTo(x + lean * hgt * 0.3, floor - hgt);
      ctx.stroke();
      ctx.lineWidth = 2.6 * scale;
      for (let b = 0; b < 3; b++) {
        const at = floor - hgt * (0.45 + b * 0.2);
        const side = b % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + lean * (floor - at) * 0.3, at);
        ctx.lineTo(x + lean * (floor - at) * 0.3 + side * (12 + roll() * 16) * scale, at - (8 + roll() * 16) * scale);
        ctx.stroke();
      }
    }
  }

  // --- the ground they walk over
  ctx.fillStyle = Black;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(r.x, floor, r.w, r.y + r.h - floor);
  ctx.globalAlpha = 1;

  ctx.restore();

  ctx.strokeStyle = Black;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, r.h * 0.05);
  ctx.stroke();
}

// --- the tabs ------------------------------------------------------------------------------------

function soon(ctx, w, h, U, title, lines) {
  const b = band(w, h, U);
  write(ctx, title.toUpperCase(), w / 2, b.top + 40 * U, 26 * U, 800, 'center');
  let y = b.top + 96 * U;
  for (const line of lines) {
    wrap(ctx, line, w / 2, y, Math.min(560 * U, w - 60 * U), 14 * U, 20 * U, Black);
    y += 54 * U;
  }
  ctx.globalAlpha = 0.5;
  write(ctx, '· · ·', w / 2, b.bottom - 40 * U, 22 * U, 800, 'center');
  ctx.globalAlpha = 1;
}

function mapTab(ctx, data, w, h, U, show) {
  const r = artBox(w, h, U);
  const far = furthestStage(data);
  const info = stageOf(data.stage);

  portrait(ctx, r, data.stage, info.look);

  // Only the stage number goes on the picture. The name used to sit across the bottom of it,
  // which is the one band that is solid black - a black name on a black strip.
  write(ctx, say(UI.stage, data.stage), r.x + 16 * U, r.y + 20 * U, 11 * U, 800, 'left');

  const a = arrows(w, h, U);
  const arrow = (box, pointing, on) => {
    ctx.globalAlpha = on ? 1 : 0.16;
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3.5 * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, sz = 11 * U;
    ctx.beginPath();
    ctx.moveTo(cx - pointing * sz * 0.55, cy - sz);
    ctx.lineTo(cx + pointing * sz * 0.55, cy);
    ctx.lineTo(cx - pointing * sz * 0.55, cy + sz);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  arrow(a.prev, -1, data.stage > 1);
  arrow(a.next, 1, data.stage < far);

  let y = r.y + r.h + 30 * U;
  fitWrite(ctx, say(info.name), w / 2, y, 26 * U, 800, 'center', Black, w - 80 * U);
  y += 28 * U;
  stars(ctx, w / 2, y, 10 * U, starsAt(data, data.stage) || 0, Black);
  y += 26 * U;
  fitWrite(ctx, say(info.blurb), w / 2, y, 13 * U, 500, 'center', Black, w - 60 * U);

  // --- what walks in on this one. The marks stand on a line, so nothing overlaps the writing
  // above them however tall the Warden is.
  const kinds = kindsOn(data.stage);
  const feet = Math.min(y + 100 * U, playBox(w, h, U).y - 26 * U);
  const step = Math.min(104 * U, (w - 60 * U) / kinds.length);
  let x = w / 2 - ((kinds.length - 1) * step) / 2;
  for (const key of kinds) {
    creatureMark(ctx, key, x, feet, (key === 'warden' ? 44 : 34) * U, Black);
    write(ctx, say(UI['foe_' + key] || key), x, feet + 16 * U, 10 * U, 700, 'center');
    x += step;
  }

  const p = playBox(w, h, U);
  const lit = show.overMenu === 'play';
  ctx.fillStyle = lit ? Black : 'rgba(13,12,11,0)';
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 10 * U); ctx.fill();
  ctx.strokeStyle = Black;
  ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 10 * U); ctx.stroke();
  write(ctx, say(UI.play), p.x + p.w / 2, p.y + p.h / 2, 21 * U, 800, 'center', lit ? Pale : Black);
}

function spellsTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const room = LoadoutSize - data.loadout.length;
  write(ctx, room > 0 ? say(UI.chooseMore, room) : say(UI.chooseUpTo, LoadoutSize),
    w / 2, b.top + 26 * U, 13 * U, 800, 'center');

  for (const t of spellTiles(w, h, U)) {
    const open = UnlockAt[t.key] <= data.level;
    const fixed = t.key === Always;
    const taken = fixed || data.loadout.includes(t.key);
    const lit = show.overMenu === 'tile:' + t.key && open && !fixed;
    const sp = Spells[t.key];

    if (taken) {
      ctx.fillStyle = Black;
      ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 9 * U); ctx.fill();
    }
    ctx.globalAlpha = open ? 1 : 0.3;
    ctx.strokeStyle = Black;
    ctx.lineWidth = (taken || lit ? 3 : 1.6) * U;
    ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 9 * U); ctx.stroke();

    const ink = taken ? Pale : Black;
    const under = fixed ? say(UI.always) : open ? say(sp.tells) : say(UI.opensAt, UnlockAt[t.key]);
    if (t.tall) {
      const fits = t.w - 92 * U;
      sigil(ctx, t.key, t.x + 40 * U, t.y + t.h / 2, 28 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + 74 * U, t.y + 26 * U, 16 * U, 800, 'left', ink, fits);
      fitWrite(ctx, under, t.x + 74 * U, t.y + 48 * U, 10 * U, fixed ? 800 : 500, 'left', ink, fits);
    } else {
      const fits = t.w - 16 * U;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + 28 * U, 28 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + t.w / 2, t.y + 58 * U, 13 * U, 800, 'center', ink, fits);
      fitWrite(ctx, fixed ? say(UI.always) : open ? '' : say(UI.levelledPlain, UnlockAt[t.key]),
        t.x + t.w / 2, t.y + 76 * U, 9 * U, fixed ? 800 : 600, 'center', ink, fits);
    }
    ctx.globalAlpha = 1;
  }

  write(ctx, say(UI.spellsSoon), w / 2, b.bottom - 18 * U, 11 * U, 500, 'center');
}

// --- the whole screen ---------------------------------------------------------------------------

export function menu(ctx, data, w, h, show, dpr = 1) {
  const U = unit(dpr);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f6f3ec');
  sky.addColorStop(0.6, Pale);
  sky.addColorStop(1, '#cfc7b6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // --- the account, along the top
  {
    const need = needFor(data.level);
    const bw = Math.min(narrow(w, h) ? w - 150 * U : 300 * U, w * (narrow(w, h) ? 1 : 0.34));

    write(ctx, say(UI.level, data.level), 20 * U, 26 * U, 15 * U, 800, 'left');

    // the stars go on the right of the same line, where nothing else is
    const count = String(totalStars(data));
    const right = w - 72 * U;                 // clear of the gear
    ctx.font = `800 ${16 * U}px ${Face}`;
    const cw = ctx.measureText(count).width;
    write(ctx, count, right, 30 * U, 16 * U, 800, 'right');
    star(ctx, right - cw - 11 * U, 30 * U, 9 * U, true, Black);

    ctx.fillStyle = 'rgba(13,12,11,0.14)';
    ctx.fillRect(20 * U, 42 * U, bw, 7 * U);
    ctx.fillStyle = Black;
    ctx.fillRect(20 * U, 42 * U, bw * Math.max(0, Math.min(1, data.xp / need)), 7 * U);

    const next = nextUnlock(data.level);
    fitWrite(ctx, next ? say(UI.unlockSoon, say(Spells[next.key].name), next.at) : say(UI.allYours),
      20 * U + bw, 64 * U, 11 * U, 600, 'right', Black, bw * 0.8);
  }

  // --- the way into the settings
  {
    const g = gearBox(w, h, U);
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2, r = g.w * 0.34;
    const lit = show.overMenu === 'openSettings';
    ctx.globalAlpha = lit ? 1 : 0.75;
    ctx.strokeStyle = Black;
    ctx.fillStyle = Black;
    ctx.lineWidth = 2.4 * U;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
      ctx.lineTo(cx + Math.cos(a) * r * 1.34, cy + Math.sin(a) * r * 1.34);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- the chosen tab
  if (data.tab === 'map') mapTab(ctx, data, w, h, U, show);
  else if (data.tab === 'spells') spellsTab(ctx, data, w, h, U, show);
  else if (data.tab === 'wheel') soon(ctx, w, h, U, say(UI.tabWheel), [say(UI.wheelSoon)]);
  else if (data.tab === 'hero') soon(ctx, w, h, U, say(UI.tabHero), [say(UI.heroSoon)]);
  else soon(ctx, w, h, U, say(UI.tabCodex), [say(UI.codexSoon)]);

  // --- the tabs, as cards
  {
    for (const t of navBar(w, h, U)) {
      const on = data.tab === t.key;
      const over = show.overMenu === 'tab:' + t.key;
      // the chosen one lifts clear of the row and fills in
      const lift = on ? 12 * U : over ? 3 * U : 0;
      const y = t.y - lift;
      const grow = on ? 1.18 : 1;

      ctx.fillStyle = on ? Black : Pale;
      ctx.beginPath(); ctx.roundRect(t.x, y, t.w, t.h, 14 * U); ctx.fill();
      ctx.strokeStyle = Black;
      ctx.lineWidth = (on ? 3 : 1.6) * U;
      ctx.globalAlpha = on ? 1 : 0.55;
      ctx.beginPath(); ctx.roundRect(t.x, y, t.w, t.h, 14 * U); ctx.stroke();
      ctx.globalAlpha = on ? 1 : 0.7;
      tabMark(ctx, t.key, t.cx, y + t.h / 2, 32 * U * grow, on ? Pale : Black);
      ctx.globalAlpha = 1;
    }
  }

  // --- the settings, over everything
  if (show.settings) {
    ctx.fillStyle = 'rgba(236,231,220,0.86)';
    ctx.fillRect(0, 0, w, h);

    const sp = settingsPanel(w, h, U);
    ctx.fillStyle = Pale;
    ctx.beginPath(); ctx.roundRect(sp.box.x, sp.box.y, sp.box.w, sp.box.h, 16 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.beginPath(); ctx.roundRect(sp.box.x, sp.box.y, sp.box.w, sp.box.h, 16 * U); ctx.stroke();

    write(ctx, say(UI.settings), sp.box.x + 22 * U, sp.box.y + 34 * U, 20 * U, 800, 'left');

    // the way out
    {
      const c = sp.close;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2, r = c.w * 0.26;
      ctx.globalAlpha = show.overMenu === 'closeSettings' ? 1 : 0.6;
      ctx.strokeStyle = Black;
      ctx.lineWidth = 3 * U;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const row = (box, label, value, lit) => {
      ctx.fillStyle = lit ? Black : 'rgba(13,12,11,0)';
      ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 10 * U); ctx.fill();
      ctx.strokeStyle = Black;
      ctx.lineWidth = 1.6 * U;
      ctx.globalAlpha = lit ? 1 : 0.4;
      ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 10 * U); ctx.stroke();
      ctx.globalAlpha = 1;
      const ink = lit ? Pale : Black;
      write(ctx, label, box.x + 16 * U, box.y + box.h / 2, 12 * U, 700, 'left', ink);
      write(ctx, value, box.x + box.w - 16 * U, box.y + box.h / 2, 15 * U, 800, 'right', ink);
    };
    row(sp.lang, say(UI.language), LanguageNames[language()], show.overMenu === 'lang');
    row(sp.sound, say(UI.sound), say(data.muted ? UI.off : UI.on), show.overMenu === 'sound');
  }
}

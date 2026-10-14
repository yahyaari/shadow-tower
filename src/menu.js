// The menu: five tabs along the bottom, and whatever the chosen one wants to show.
//
// Nothing here decides anything either - it reads the saved account and draws it. The field has
// its own file; this is the place you come back to between stages, and it is the part a player
// sees first, so it gets the same two inks and the same care.
//
// Three of the tabs are skeletons on purpose. The shape of the menu is the thing to agree on
// first; what goes inside each tab is a conversation per tab.

import {
  Inks, Face, write, fitWrite, wrap, sigil, star, stars, creatureMark, coin, shard, gem,
} from './draw.js';
import { say, UI, LanguageNames, language } from './text.js';
import { Spells, UnlockAt, LoadoutSize, Always, spellKeys, nextUnlock } from './spells.js';
import {
  needFor, furthestStage, starsAt, totalStars, heroNext, heroBonus, spellStep, levelOf, shardsOf,
} from './meta.js';
import { Steps as SpellSteps, liftAt } from './upgrades.js';
import {
  Wedges, amountAt, kindAt, Jackpot, Chests, ChestKinds, chestPrize, costOf, canOpen, canSpin,
  Bulk, gemsHeld,
} from './rewards.js';
import { Ladder, Steps as HeroSteps, Bonus, amountText, totals as heroTotals } from './hero.js';
import { stageOf, kindsOn } from './stages.js';
import { Kinds, BoostsPerTier, MostEvos } from './rules.js';

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

/**
 * The wheel, the button under it, and the two chests below them.
 *
 * The tab scrolls now, so the wheel no longer has to be squeezed small enough to leave the chests
 * room on the same screen. It takes a comfortable size and the chests sit under the fold, which
 * is also the order they are met in: you spin, then you look down.
 */
export function wheelBox(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const head = 62 * U;
  const r = Math.max(60 * U, Math.min(168 * U,
    Math.min((b.height - head - 92 * U) / 2, (w - 76 * U) / 2)));
  return { cx: w / 2, cy: b.top + head + r, r, head };
}

export function spinBox(w, h, dpr = 1) {
  const U = unit(dpr);
  const c = wheelBox(w, h, dpr);
  const bw = Math.min(240 * U, w - 90 * U);
  return { x: w / 2 - bw / 2, y: c.cy + c.r + 18 * U, w: bw, h: 52 * U };
}

/** The two chests, stacked under the wheel, in the order they are worth. */
export function chestBoxes(w, h, dpr = 1) {
  const U = unit(dpr);
  const sb = spinBox(w, h, dpr);
  const bw = Math.min(460 * U, w - 32 * U);
  const bh = 126 * U;
  const top = sb.y + sb.h + 46 * U;
  return ChestKinds.map((kind, i) => ({
    kind, x: w / 2 - bw / 2, y: top + i * (bh + 14 * U), w: bw, h: bh,
  }));
}

/**
 * The two presses inside a chest panel: one, and ten.
 *
 * Side by side at the foot of the panel rather than one above the other, so the price of each is
 * read against the other - which is the only way the ten-for-nine is visible at all.
 */
export function chestOpens(box, dpr = 1) {
  const U = unit(dpr);
  const gap = 8 * U;
  const room = Math.min(280 * U, box.w - 108 * U);
  const bw = (room - gap) / 2;
  const y = box.y + box.h - 46 * U;
  const left = box.x + box.w - 14 * U - room;
  return {
    one: { x: left, y, w: bw, h: 38 * U, many: 1 },
    many: { x: left + bw + gap, y, w: bw, h: 38 * U, many: Bulk },
  };
}

/** How far the rewards tab may be pushed up, given the window it is in. */
export function wheelReach(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const boxes = chestBoxes(w, h, dpr);
  const last = boxes[boxes.length - 1];
  return Math.max(0, last.y + last.h + 14 * U - b.bottom);
}

/**
 * Where the wheel has to stop for wedge `at` to sit under the pointer, from where it is now.
 *
 * This is the whole honesty of the wheel. The wedge is drawn first, by the rules, and the spin is
 * then aimed at it - so the angle is worked out from the prize rather than the prize being read
 * off whatever angle the animation happened to stop at. Always at least `turns` whole turns
 * forward, so it never crawls to the next wedge or runs backwards.
 */
export function restFor(at, from = 0, turns = 4) {
  const full = Math.PI * 2;
  const step = full / Wedges.length;
  const want = -(at + 0.5) * step;           // wedge centre under the pointer at the top
  const base = from + full * turns;
  return base + (((want - base) % full) + full) % full;
}

/** Which wedge is under the pointer at a given rotation - the reverse of `restFor`. */
export function wedgeUnder(turn) {
  const full = Math.PI * 2;
  const step = full / Wedges.length;
  const at = Math.round((((-turn % full) + full) % full) / step - 0.5);
  return ((at % Wedges.length) + Wedges.length) % Wedges.length;
}

/** The two halves of the spells tab, the same shape as the two halves of the codex. */
export function spellHalves(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const bw = Math.min(180 * U, (w - 56 * U) / 2);
  const bh = 36 * U;
  const y = b.top + 4 * U;
  return {
    loadout: { x: w / 2 - bw - 6 * U, y, w: bw, h: bh },
    raise: { x: w / 2 + 6 * U, y, w: bw, h: bh },
  };
}

/**
 * One row per spell on the upgrade half.
 *
 * The whole row is the press. Two targets on one row - a body that picks and a button that buys -
 * is a phone-sized way of buying something you meant to look at.
 */
export function raiseRows(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const top = b.top + 92 * U;
  const gap = 6 * U;
  // Two columns on a wide screen. In one column the ten rows have to share the band's height and
  // on a desktop that leaves 38 pixels for two lines of writing - the rows overran each other.
  // A phone is the other way round: height to spare, no width for a second column.
  const cols = narrow(w, h) ? 1 : 2;
  const down = Math.ceil(spellKeys.length / cols);
  const cw = Math.min(460 * U, (w - 32 * U - (cols - 1) * gap) / cols);
  const rh = Math.min(74 * U, (b.bottom - top - 8 * U - gap * (down - 1)) / down);
  const left = w / 2 - (cols * cw + (cols - 1) * gap) / 2;
  const order = [...spellKeys].sort((a, c) => UnlockAt[a] - UnlockAt[c]);
  return order.map((key, i) => ({
    key,
    x: left + Math.floor(i / down) * (cw + gap),
    y: top + (i % down) * (rh + gap),
    w: cw, h: rh,
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

/** The two halves of the codex, as a pair of buttons at the top of the band. */
export function codexTabs(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const bw = Math.min(180 * U, (w - 56 * U) / 2);
  const bh = 36 * U;
  const y = b.top + 6 * U;
  return {
    spells: { x: w / 2 - bw - 6 * U, y, w: bw, h: bh },
    foes: { x: w / 2 + 6 * U, y, w: bw, h: bh },
  };
}

/** The ten spells, as a grid of marks. */
export function codexGrid(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const cols = narrow(w, h) ? 3 : 5;
  const rows = Math.ceil(spellKeys.length / cols);
  const gap = 10 * U;
  const tw = Math.min(190 * U, (w - 36 * U - (cols - 1) * gap) / cols);
  const th = Math.min(96 * U, (b.height - 90 * U - (rows - 1) * gap) / rows);
  const left = w / 2 - (cols * tw + (cols - 1) * gap) / 2;
  const top = b.top + 68 * U;
  const order = [...spellKeys].sort((a, c) => UnlockAt[a] - UnlockAt[c]);
  return order.map((key, i) => ({
    key,
    x: left + (i % cols) * (tw + gap),
    y: top + Math.floor(i / cols) * (th + gap),
    w: tw, h: th,
  }));
}

/** The creatures, one to a row, because each needs a sentence beside it. */
export function codexRows(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const keys = ['walker', 'runner', 'brute', 'warden'];
  const gap = 10 * U;
  const rw = Math.min(680 * U, w - 36 * U);
  const rh = Math.min(104 * U, (b.height - 80 * U - (keys.length - 1) * gap) / keys.length);
  const top = b.top + 60 * U;
  return keys.map((key, i) => ({
    key, x: w / 2 - rw / 2, y: top + i * (rh + gap), w: rw, h: rh,
  }));
}

/**
 * An opened spell, sized to what is written in it.
 *
 * A fixed height left two thirds of the panel empty under Magic Bolt and would have clipped a
 * spell with more in it; the height is counted off the rows instead.
 */
export function codexPanel(w, h, dpr = 1, key = null) {
  const U = unit(dpr);
  const pw = Math.min(720 * U, w - 32 * U);
  const twoUp = pw > 520 * U;
  const sp = key && Spells[key];
  const rows = !sp ? 6
    : twoUp ? Math.max(sp.boosts.length, sp.evolutions.length)
    : sp.boosts.length + sp.evolutions.length;
  const ph = Math.min(h - 100 * U, 118 * U + rows * 37 * U + (twoUp ? 0 : 32 * U) + 40 * U);
  return {
    box: { x: w / 2 - pw / 2, y: h / 2 - ph / 2, w: pw, h: ph },
    close: { x: w / 2 + pw / 2 - 56 * U, y: h / 2 - ph / 2 + 12 * U, w: 44 * U, h: 44 * U },
    twoUp,
  };
}

/**
 * The hero ladder, drawn from the bottom up as a honeycomb.
 *
 * Hexagons rather than a list, and two lanes rather than one, so the path zigzags up the screen
 * the way a route does. Step one is at the foot and fifty is at the head: the thing you are about
 * to buy sits nearest your thumb, and everything above it is the road.
 *
 * Taller than any screen, so it scrolls; `heroReach` is how far it can be pushed.
 */
export function heroCell(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  return {
    r: 34 * U,              // hexagon radius
    step: 88 * U,           // how far apart two of them are, up the screen
    lane: 76 * U,           // how far each lane sits off the middle
    // The line of words at the foot sits over the comb, so the comb has to stop above it -
    // otherwise the cells nearest your thumb, the ones you just bought, are the hidden ones.
    skirt: 54 * U,
    top: b.top + 56 * U,
    foot: b.bottom - 54 * U,
  };
}

export function heroReach(w, h, dpr = 1) {
  const U = unit(dpr);
  const c = heroCell(w, h, dpr);
  return Math.max(0, (HeroSteps - 1) * c.step + c.r * 2 + 34 * U - (c.foot - c.top));
}

/** Where step `n` sits on the screen for a given scroll. Odd steps lean left, even steps right. */
export function heroAt(n, w, h, dpr, scroll) {
  const c = heroCell(w, h, dpr);
  return {
    x: w / 2 + (n % 2 ? -c.lane : c.lane),
    y: c.foot - c.r - (n - 1) * c.step + scroll,
    r: c.r,
  };
}

export function heroHome(data, w, h, dpr = 1) {
  const c = heroCell(w, h, dpr);
  const next = Math.min(HeroSteps, (data.hero || 0) + 1);
  // the next cell about a third up, so the road ahead and the road behind are both in sight
  const room = (c.foot - c.top) / c.step;
  const want = Math.max(0, (next - 1 - Math.floor(room * 0.55)) * c.step);
  return Math.max(0, Math.min(heroReach(w, h, dpr), want));
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
  if (data.tab === 'hero') {
    const next = heroNext(data);
    if (next) {
      const c = heroAt(next.n, w, h, dpr, show.heroScroll || 0);
      const b = band(w, h, dpr);
      // only if it is actually on screen - a tap must not buy something scrolled out of sight
      const cell = heroCell(w, h, dpr);
      const near = Math.hypot(px - c.x, py - c.y) <= c.r * 1.15;
      if (c.y > cell.top && c.y < cell.foot && near) return { what: 'heroBuy' };
    }
  }
  if (data.tab === 'wheel') {
    // Nothing on this tab may be pressed while the wheel is turning: the prize is already banked
    // and a second press would be asking for a spin that has been spent.
    if (show.spin) return null;
    // Everything here is drawn shifted by the scroll, so everything here is tested shifted by it.
    const up = show.wheelScroll || 0;
    const moved = (r) => ({ ...r, y: r.y - up });
    if (canSpin(data) && inside(moved(spinBox(w, h, dpr)), px, py)) return { what: 'spin' };
    for (const box of chestBoxes(w, h, dpr)) {
      const press = chestOpens(box, dpr);
      for (const side of [press.one, press.many]) {
        if (!canOpen(data, box.kind, side.many)) continue;
        if (inside(moved(side), px, py)) {
          return { what: 'chest', key: box.kind, many: side.many };
        }
      }
    }
    return null;
  }
  if (data.tab === 'spells') {
    // The halves are read before anything under them: the loadout grid starts near the top of the
    // band and a tile that overlapped a half would eat the press that was meant to switch.
    const sh = spellHalves(w, h, dpr);
    if (inside(sh.loadout, px, py)) return { what: 'spellHalf', key: 'loadout' };
    if (inside(sh.raise, px, py)) return { what: 'spellHalf', key: 'raise' };
    if (data.spellTab === 'raise') {
      for (const r of raiseRows(w, h, dpr)) {
        if (!inside(r, px, py)) continue;
        if (UnlockAt[r.key] > data.level) return null;
        return { what: 'buySpell', key: r.key };
      }
      return null;
    }
    for (const t of spellTiles(w, h, dpr)) if (inside(t, px, py)) return { what: 'tile', key: t.key };
  }
  if (data.tab === 'codex') {
    // An open entry is the only thing on the screen, bar the way out of it.
    if (show.codexPick) {
      const cp = codexPanel(w, h, dpr, show.codexPick);
      if (inside(cp.close, px, py) || !inside(cp.box, px, py)) return { what: 'codexClose' };
      return null;
    }
    const ct = codexTabs(w, h, dpr);
    if (inside(ct.spells, px, py)) return { what: 'codexHalf', key: 'spells' };
    if (inside(ct.foes, px, py)) return { what: 'codexHalf', key: 'foes' };
    if (data.codex === 'spells') {
      for (const t of codexGrid(w, h, dpr)) if (inside(t, px, py)) return { what: 'codexOpen', key: t.key };
    }
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

/**
 * A chest, shut or thrown open.
 *
 * Solid ink with the detail bitten out of it in the pale, like every other shape in the game. The
 * seam across it is what makes it a chest rather than a postbox, so it is drawn even at the small
 * size this appears at.
 */
function chest(ctx, x, y, s, open, colour, back) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;

  const half = s * 0.5;
  const lip = s * 0.08;          // the seam between lid and body
  const bodyTop = -s * 0.04;

  // the body
  ctx.beginPath();
  ctx.rect(-half, bodyTop, s, s * 0.44);
  ctx.fill();

  // The lid. Shut it caps the body; open it is a thinner cap tipped back above it, with daylight
  // between the two - squashed flat it reads as a line rather than a lid.
  ctx.save();
  if (open) ctx.translate(0, -s * 0.3);
  ctx.beginPath();
  ctx.moveTo(-half, open ? -s * 0.02 : bodyTop);
  ctx.lineTo(-half, open ? -s * 0.14 : -s * 0.2);
  ctx.quadraticCurveTo(0, open ? -s * 0.32 : -s * 0.46, half, open ? -s * 0.14 : -s * 0.2);
  ctx.lineTo(half, open ? -s * 0.02 : bodyTop);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // the seam, and the strap and lock down the front, cut out of the ink
  ctx.fillStyle = back;
  if (!open) ctx.fillRect(-half, bodyTop - lip * 0.5, s, lip * 0.5);
  ctx.fillRect(-s * 0.09, bodyTop + lip, s * 0.18, s * 0.18);
  ctx.restore();
}

/**
 * The rewards tab.
 *
 * A wheel you may turn once a day, and a chest that fills with bodies while you play. Both pay
 * experience into the same bank the hero comb spends, so neither of them asks the player to
 * learn a second currency in order to understand a prize.
 */
/**
 * What the account has to spend, on one line.
 *
 * Experience and gold sit together because they are spent on different screens and a player who
 * only ever sees one of them on the screen that spends it never learns there are two.
 */
function purse(ctx, data, x, y, U, shownExp = null, withGems = false) {
  const exp = String(Math.round(shownExp === null ? (data.bank || 0) : shownExp));
  write(ctx, say(UI.heroBank), x, y, 10 * U, 700, 'left');
  write(ctx, exp, x, y + 20 * U, 22 * U, 800, 'left');

  ctx.font = `800 ${22 * U}px ${Face}`;
  let at = x + ctx.measureText(exp).width + 26 * U;
  coin(ctx, at, y + 20 * U, 8 * U, Black, Pale);
  const gold = String(Math.round(data.gold || 0));
  write(ctx, gold, at + 14 * U, y + 20 * U, 22 * U, 800, 'left');

  if (!withGems) return;
  at += 14 * U + ctx.measureText(gold).width + 26 * U;
  gem(ctx, at, y + 20 * U, 9 * U, Black, Pale);
  write(ctx, String(gemsHeld(data)), at + 15 * U, y + 20 * U, 22 * U, 800, 'left');
}

/**
 * Gold alone, on one line.
 *
 * The upgrade screen does not spend experience, so showing it there is a number the player has to
 * work out is irrelevant - and it was the number pushing the rows into the tabs above them.
 */
function coins(ctx, data, x, y, U) {
  coin(ctx, x + 8 * U, y, 8 * U, Black, Pale);
  write(ctx, String(Math.round(data.gold || 0)), x + 22 * U, y, 20 * U, 800, 'left');
}

/** The mark that says what a prize is paid in. */
function kindMark(ctx, kind, x, y, r, ink, back) {
  if (kind === 'gold') return coin(ctx, x, y, r, ink, back);
  if (kind === 'shard') return shard(ctx, x, y, r, ink);
  // experience: the same four-pointed spark the bolt is drawn with
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const o = i % 2 ? r * 0.3 : r;
    i ? ctx.lineTo(x + Math.cos(a) * o, y + Math.sin(a) * o)
      : ctx.moveTo(x + Math.cos(a) * o, y + Math.sin(a) * o);
  }
  ctx.closePath();
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.restore();
}

/** What a spin paid, in words. */
function spinSaid(won) {
  if (!won) return '';
  if (won.kind === 'gold') return say(UI.earnedGold, won.amount);
  if (won.kind === 'shard') {
    return won.key ? say(UI.earnedShards, won.amount, say(Spells[won.key].name).toUpperCase())
      : say(UI.earnedShardsAny, won.amount);
  }
  return say(UI.earned, won.amount);
}

/**
 * One chest, and the key that opens it.
 *
 * The small one and the great one differ in what they hold and in nothing else, so the panel is
 * the same for both and the difference is only ever the numbers on it. A chest you have no key
 * for is drawn faint and still says what it holds - that is the whole reason to want a key.
 */
function chestPanel(ctx, data, box, U, show) {
  const kind = box.kind;
  const great = kind === 'great';
  const won = show.chestWon && show.chestWon.kind === kind ? show.chestWon : null;
  const holds = chestPrize(kind, data.level || 1, data.loadout || [], 1);
  const press = chestOpens(box, U);
  const any = canOpen(data, kind, 1);
  const lively = any || !!won;

  ctx.strokeStyle = Black;
  ctx.lineWidth = (lively ? 3 : 1.5) * U;
  ctx.globalAlpha = lively ? 1 : 0.4;
  ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 14 * U); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.globalAlpha = lively ? 1 : 0.45;
  chest(ctx, box.x + 48 * U, box.y + box.h / 2 - 2 * U, great ? 62 * U : 44 * U,
    lively, Black, Pale);

  const tx = box.x + 94 * U;
  const right = box.x + box.w - 14 * U;

  if (won) {
    const bits = Object.entries(won.shards || {}).filter(([, n]) => n > 0);
    fitWrite(ctx, say(great ? UI.chestGreat : UI.chestSmall) + (won.many > 1 ? `  ×${won.many}` : ''),
      tx, box.y + 26 * U, 12 * U, 800, 'left', Black, right - tx);
    fitWrite(ctx, `${say(UI.earned, won.exp)}   ${say(UI.earnedGold, won.gold)}`,
      tx, box.y + 56 * U, 16 * U, 800, 'left', Black, right - tx);
    ctx.globalAlpha = 0.75;
    fitWrite(ctx, bits.map(([k, n]) => `${say(Spells[k].name)} ${n}`).join('  ·  '),
      tx, box.y + 86 * U, 11 * U, 700, 'left', Black, right - tx);
    ctx.globalAlpha = 1;
    return;
  }

  fitWrite(ctx, say(great ? UI.chestGreat : UI.chestSmall),
    tx, box.y + 26 * U, 12 * U, 800, 'left', Black, right - tx);

  // what one of them holds: the runes first, because they are what a chest is for
  shard(ctx, tx + 6 * U, box.y + 52 * U, 6 * U, Black);
  write(ctx, String(holds.runes), tx + 18 * U, box.y + 52 * U, 16 * U, 800, 'left');
  ctx.globalAlpha = 0.72;
  fitWrite(ctx, say(UI.chestHolds, holds.exp, holds.gold),
    tx + 42 * U, box.y + 52 * U, 11 * U, 600, 'left', Black, right - tx - 48 * U);
  ctx.globalAlpha = 1;

  // --- the two prices. Ten costs nine, which only reads if both are on the screen at once.
  for (const side of [press.one, press.many]) {
    const cost = costOf(kind, side.many);
    const can = canOpen(data, kind, side.many);
    const lit = can && show.overMenu === `chest:${kind}:${side.many}`;
    ctx.fillStyle = lit ? Black : Pale;
    ctx.beginPath(); ctx.roundRect(side.x, side.y, side.w, side.h, 10 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = (can ? 2.4 : 1.4) * U;
    ctx.globalAlpha = can ? 1 : 0.4;
    ctx.beginPath(); ctx.roundRect(side.x, side.y, side.w, side.h, 10 * U); ctx.stroke();

    const ink = lit ? Pale : Black;
    const back = lit ? Black : Pale;
    const mid = side.y + side.h / 2;
    write(ctx, side.many > 1 ? `×${side.many}` : '×1', side.x + 12 * U, mid, 13 * U, 800, 'left', ink);
    ctx.font = `800 ${13 * U}px ${Face}`;
    const cw = ctx.measureText(String(cost)).width;
    write(ctx, String(cost), side.x + side.w - 10 * U, mid, 13 * U, 800, 'right', ink);
    gem(ctx, side.x + side.w - 14 * U - cw - 8 * U, mid, 7 * U, ink, back);
    ctx.globalAlpha = 1;
  }

  // The saving, over the ten rather than under it - under it, it was drawn behind the button.
  ctx.globalAlpha = 0.6;
  write(ctx, say(UI.chestBulk, Math.round((1 - (Bulk - 1) / Bulk) * 100)),
    right, box.y + 68 * U, 9 * U, 700, 'right');
  ctx.globalAlpha = 1;
}

/**
 * The rewards tab: the wheel, then the chests under it.
 *
 * It scrolls, which is why everything below the heading is drawn inside one shifted and clipped
 * block. The purse and the scroll mark stay put - a balance that slid off the top of the screen
 * would be the one number you came here to check.
 */
function wheelTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const c = wheelBox(w, h, U);
  const sb = spinBox(w, h, U);
  const level = data.level || 1;
  const turning = !!show.spin;
  const up = show.wheelScroll || 0;
  const reach = wheelReach(w, h, U);
  const left = Math.max(20 * U, w / 2 - 230 * U);

  // --- what is in the bank.
  // Held at the old figure while the wheel turns: the prize is banked the moment the wheel is
  // pressed, so that closing the tab mid-spin cannot lose it, and a number that jumps before
  // the needle lands tells you what you won before the wheel does.
  const shown = turning && show.spin.was !== undefined ? show.spin.was : null;
  purse(ctx, data, left, b.top + 16 * U, U, shown, true);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, b.top + 56 * U, w, b.bottom - b.top - 56 * U);
  ctx.clip();
  ctx.translate(0, -up);

  // --- the wheel
  const step = (Math.PI * 2) / Wedges.length;
  const turn = show.turn || 0;
  ctx.save();
  ctx.translate(c.cx, c.cy);
  ctx.rotate(turn);
  for (let i = 0; i < Wedges.length; i++) {
    const from = i * step - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, c.r, from, from + step);
    ctx.closePath();
    const dark = i % 2 === 0;
    ctx.fillStyle = dark ? Black : Pale;
    ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 1.6 * U;
    ctx.stroke();

    // The prize, upright rather than laid along its wedge. Radial text reads at eight different
    // angles and four of them are upside down; the wheel turns, so there is no angle at which
    // laying them out radially is right for more than two of them at once.
    const mid = from + step / 2;
    const big = i === Jackpot;
    const ink = dark ? Pale : Black;
    ctx.save();
    ctx.translate(Math.cos(mid) * c.r * 0.6, Math.sin(mid) * c.r * 0.6);
    ctx.rotate(-turn);
    kindMark(ctx, kindAt(i), 0, -14 * U, 7 * U, ink, dark ? Black : Pale);
    write(ctx, String(amountAt(i, level)), 0, 6 * U, (big ? 17 : 14) * U, 800, 'center', ink);
    ctx.restore();
  }
  ctx.strokeStyle = Black;
  ctx.lineWidth = 3.4 * U;
  ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = Pale;
  ctx.beginPath(); ctx.arc(0, 0, c.r * 0.17, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.6 * U;
  ctx.beginPath(); ctx.arc(0, 0, c.r * 0.17, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // --- the pointer, which does not turn.
  // It sits wholly outside the rim rather than reaching over it. Four of the eight wedges are
  // solid black, so a black arrow overlapping the wheel is invisible on half the results.
  ctx.beginPath();
  ctx.moveTo(c.cx, c.cy - c.r - 3 * U);
  ctx.lineTo(c.cx - 12 * U, c.cy - c.r - 25 * U);
  ctx.lineTo(c.cx + 12 * U, c.cy - c.r - 25 * U);
  ctx.closePath();
  ctx.fillStyle = Black;
  ctx.fill();

  // --- the press under it, or what it says instead
  if (turning) {
    write(ctx, say(UI.spinning), w / 2, sb.y + sb.h / 2, 14 * U, 800, 'center');
  } else if (show.spinWon !== null && show.spinWon !== undefined) {
    fitWrite(ctx, spinSaid(show.spinWon), w / 2, sb.y + sb.h / 2 - 6 * U,
      20 * U, 800, 'center', Black, w - 60 * U);
    ctx.globalAlpha = 0.6;
    write(ctx, say(UI.spinTomorrow), w / 2, sb.y + sb.h / 2 + 18 * U, 11 * U, 600, 'center');
    ctx.globalAlpha = 1;
  } else if (canSpin(data)) {
    const lit = show.overMenu === 'spin';
    ctx.fillStyle = lit ? Black : Pale;
    ctx.beginPath(); ctx.roundRect(sb.x, sb.y, sb.w, sb.h, 14 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.beginPath(); ctx.roundRect(sb.x, sb.y, sb.w, sb.h, 14 * U); ctx.stroke();
    write(ctx, say(UI.spin), w / 2, sb.y + sb.h / 2, 18 * U, 800, 'center', lit ? Pale : Black);
  } else {
    ctx.globalAlpha = 0.55;
    write(ctx, say(UI.spinTomorrow), w / 2, sb.y + sb.h / 2, 13 * U, 700, 'center');
    ctx.globalAlpha = 1;
  }

  // --- the chests
  for (const box of chestBoxes(w, h, U)) chestPanel(ctx, data, box, U, show);

  ctx.restore();

  // --- there is more below: say so, and only while there is
  if (reach > 0) {
    const atFoot = up >= reach - 2;
    ctx.globalAlpha = atFoot ? 0.25 : 0.65;
    const y = b.bottom - 14 * U;
    ctx.strokeStyle = Black;
    ctx.lineWidth = 2.6 * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 9 * U, y - 4 * U);
    ctx.lineTo(w / 2, y + 4 * U);
    ctx.lineTo(w / 2 + 9 * U, y - 4 * U);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
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

/** The two halves, drawn the same way the codex draws its two. */
function half(ctx, box, label, on, lit, U) {
  ctx.fillStyle = on ? Black : 'rgba(13,12,11,0)';
  ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 10 * U); ctx.fill();
  ctx.strokeStyle = Black;
  ctx.lineWidth = (on || lit ? 2.6 : 1.4) * U;
  ctx.globalAlpha = on || lit ? 1 : 0.45;
  ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 10 * U); ctx.stroke();
  ctx.globalAlpha = 1;
  write(ctx, label, box.x + box.w / 2, box.y + box.h / 2, 12 * U, 800, 'center', on ? Pale : Black);
}

/** The level a spell has been raised to, as pips rather than a number you have to read. */
function pips(ctx, x, y, at, gap, ink) {
  const r = gap * 0.38;
  for (let i = 1; i <= SpellSteps; i++) {
    ctx.beginPath();
    ctx.arc(x + (i - 1) * gap, y, r, 0, Math.PI * 2);
    if (i <= at) {
      ctx.fillStyle = ink;
      ctx.fill();
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1, r * 0.4);
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * The upgrade half: one row per spell, the whole row a press.
 *
 * Every row says the same four things in the same places - which spell, how far it has been
 * raised, what the next step gives, and what it costs. A row you cannot afford is drawn faint
 * rather than hidden, because the reason to carry a spell into a run is the shard cost sitting
 * here with nothing next to it.
 */
function raiseTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const rows = raiseRows(w, h, U);
  const left = rows.length ? rows[0].x : Math.max(16 * U, w / 2 - 260 * U);
  coins(ctx, data, left, b.top + 58 * U, U);
  ctx.globalAlpha = 0.6;
  fitWrite(ctx, say(UI.raiseHow), left + rows[0].w, b.top + 58 * U,
    10 * U, 600, 'right', Black, rows[0].w * 0.62);
  ctx.globalAlpha = 1;

  for (const r of rows) {
    const open = UnlockAt[r.key] <= data.level;
    const at = levelOf(data, r.key);
    const step = open ? spellStep(data, r.key) : null;
    const held = shardsOf(data, r.key);
    const afford = !!(step && step.afford);
    const lit = show.overMenu === 'buySpell:' + r.key && afford;

    ctx.fillStyle = lit ? Black : 'rgba(13,12,11,0)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10 * U); ctx.fill();
    ctx.globalAlpha = open ? 1 : 0.3;
    ctx.strokeStyle = Black;
    ctx.lineWidth = (afford ? 2.6 : 1.4) * U;
    ctx.globalAlpha = open ? (afford ? 1 : 0.45) : 0.25;
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 10 * U); ctx.stroke();
    ctx.globalAlpha = open ? 1 : 0.35;

    const ink = lit ? Pale : Black;
    const back = lit ? Black : Pale;
    // Everything inside a row is placed from the row, not from numbers that assumed one height:
    // the rows shrink to fit the band and fixed offsets simply overran into the row beneath.
    const hi = r.y + r.h * 0.33;
    const lo = r.y + r.h * 0.72;
    const pip = Math.min(9 * U, (r.w * 0.34) / SpellSteps);
    sigil(ctx, r.key, r.x + 24 * U, r.y + r.h / 2, Math.min(24 * U, r.h * 0.42), ink);

    const tx = r.x + 44 * U;
    fitWrite(ctx, open ? say(Spells[r.key].name) : say(UI.locked),
      tx, hi, Math.min(13 * U, r.h * 0.24), 800, 'left', ink, r.w * 0.42);

    if (!open) {
      fitWrite(ctx, say(UI.opensAt, UnlockAt[r.key]), tx, lo,
        Math.min(10 * U, r.h * 0.2), 500, 'left', ink, r.w * 0.5);
      ctx.globalAlpha = 1;
      continue;
    }

    pips(ctx, tx + 4 * U, lo, at, pip, ink);
    ctx.globalAlpha = 0.75;
    fitWrite(ctx, say(UI.spellLift, Math.round(liftAt(at) * 100)),
      tx + SpellSteps * pip + 10 * U, lo, Math.min(10 * U, r.h * 0.19), 700, 'left', ink, r.w * 0.26);
    ctx.globalAlpha = 1;

    const rx = r.x + r.w - 14 * U;
    if (!step) {
      write(ctx, say(UI.spellMax), rx, r.y + r.h / 2, Math.min(13 * U, r.h * 0.24), 800, 'right', ink);
      ctx.globalAlpha = 1;
      continue;
    }

    // the cost, right-aligned: runes nearest the top because they are the half that says no
    const cost = Math.min(13 * U, r.h * 0.23);
    ctx.font = `800 ${cost}px ${Face}`;
    const sw = ctx.measureText(String(step.shards)).width;
    const enoughShards = held >= step.shards;
    ctx.globalAlpha = enoughShards ? 1 : 0.4;
    write(ctx, String(step.shards), rx, hi, cost, 800, 'right', ink);
    shard(ctx, rx - sw - 8 * U, hi, cost * 0.42, ink);
    ctx.globalAlpha = 1;

    const gw = ctx.measureText(String(step.gold)).width;
    const enoughGold = (data.gold || 0) >= step.gold;
    ctx.globalAlpha = enoughGold ? 1 : 0.4;
    write(ctx, String(step.gold), rx, lo, cost, 800, 'right', ink);
    coin(ctx, rx - gw - 10 * U, lo, cost * 0.46, ink, back);
    ctx.globalAlpha = 1;

    // what you hold, beside the cost, only while it is the thing standing in the way
    if (!enoughShards) {
      ctx.globalAlpha = 0.55;
      fitWrite(ctx, say(UI.shardsHeld, held), rx - sw - 20 * U, hi,
        Math.min(9 * U, r.h * 0.17), 600, 'right', ink, r.w * 0.28);
      ctx.globalAlpha = 1;
    }
  }

}

function spellsTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const sh = spellHalves(w, h, U);
  const on = data.spellTab === 'raise' ? 'raise' : 'loadout';
  half(ctx, sh.loadout, say(UI.tabLoadout), on === 'loadout', show.overMenu === 'spellHalf:loadout', U);
  half(ctx, sh.raise, say(UI.tabRaise), on === 'raise', show.overMenu === 'spellHalf:raise', U);

  if (on === 'raise') {
    raiseTab(ctx, data, w, h, U, show);
    return;
  }

  const room = LoadoutSize - data.loadout.length;
  write(ctx, room > 0 ? say(UI.chooseMore, room) : say(UI.chooseUpTo, LoadoutSize),
    w / 2, b.top + 58 * U, 13 * U, 800, 'center');

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
    const at = levelOf(data, t.key);
    const under = fixed ? say(UI.always) : open ? say(sp.tells) : say(UI.opensAt, UnlockAt[t.key]);
    if (t.tall) {
      const fits = t.w - 92 * U;
      sigil(ctx, t.key, t.x + 40 * U, t.y + t.h / 2, 28 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + 74 * U, t.y + 26 * U, 16 * U, 800, 'left', ink, fits);
      fitWrite(ctx, under, t.x + 74 * U, t.y + 48 * U, 10 * U, fixed ? 800 : 500, 'left', ink, fits);
      if (open && at > 1) write(ctx, say(UI.lv, at), t.x + t.w - 14 * U, t.y + 26 * U, 12 * U, 800, 'right', ink);
    } else {
      const fits = t.w - 16 * U;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + 28 * U, 28 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + t.w / 2, t.y + 58 * U, 13 * U, 800, 'center', ink, fits);
      fitWrite(ctx, fixed ? say(UI.always) : open ? '' : say(UI.levelledPlain, UnlockAt[t.key]),
        t.x + t.w / 2, t.y + 76 * U, 9 * U, fixed ? 800 : 600, 'center', ink, fits);
      if (open && at > 1) write(ctx, say(UI.lv, at), t.x + t.w - 10 * U, t.y + 14 * U, 11 * U, 800, 'right', ink);
    }
    ctx.globalAlpha = 1;
  }
}

function codexTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const ct = codexTabs(w, h, U);

  const half = (box, label, on, lit) => {
    ctx.fillStyle = on ? Black : 'rgba(13,12,11,0)';
    ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, box.h / 2); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = (on ? 2.4 : 1.4) * U;
    ctx.globalAlpha = on || lit ? 1 : 0.4;
    ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, box.h / 2); ctx.stroke();
    ctx.globalAlpha = 1;
    write(ctx, label, box.x + box.w / 2, box.y + box.h / 2, 12 * U, 800, 'center', on ? Pale : Black);
  };
  half(ct.spells, say(UI.codexSpells), data.codex === 'spells', show.overMenu === 'codexHalf:spells');
  half(ct.foes, say(UI.codexFoes), data.codex === 'foes', show.overMenu === 'codexHalf:foes');

  if (data.codex === 'spells') {
    write(ctx, say(UI.codexTap), w / 2, b.top + 56 * U, 10 * U, 500, 'center');
    for (const t of codexGrid(w, h, U)) {
      const lit = show.overMenu === 'codexOpen:' + t.key;
      ctx.fillStyle = lit ? Black : 'rgba(13,12,11,0)';
      ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 9 * U); ctx.fill();
      ctx.strokeStyle = Black;
      ctx.lineWidth = (lit ? 2.6 : 1.5) * U;
      ctx.globalAlpha = lit ? 1 : 0.6;
      ctx.beginPath(); ctx.roundRect(t.x, t.y, t.w, t.h, 9 * U); ctx.stroke();
      ctx.globalAlpha = 1;
      const ink = lit ? Pale : Black;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + t.h * 0.36, 30 * U, ink);
      fitWrite(ctx, say(Spells[t.key].name), t.x + t.w / 2, t.y + t.h * 0.76, 13 * U, 800, 'center', ink, t.w - 12 * U);
    }
  } else {
    for (const r of codexRows(w, h, U)) {
      const k = Kinds[r.key];
      ctx.strokeStyle = Black;
      ctx.lineWidth = 1.5 * U;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 9 * U); ctx.stroke();
      ctx.globalAlpha = 1;

      // The Warden is drawn smaller here than its size in the game would suggest: its horns
      // reach further above its feet than anything else and were leaving the top of the row.
      const mark = r.key === 'warden' ? Math.min(46, r.h * 0.46) : Math.min(58, r.h * 0.6);
      creatureMark(ctx, r.key, r.x + 46 * U, r.y + r.h - 18 * U, mark * U, Black);
      write(ctx, say(UI['foe_' + r.key]), r.x + 92 * U, r.y + 24 * U, 17 * U, 800, 'left');

      // the numbers, said in the same breath as the name
      const bits = [
        `${say(UI.statHealth)} ${k.hp}`,
        `${say(UI.statSpeed)} ${k.speed}`,
        `${say(UI.statBite)} ${k.bite}`,
        `${say(UI.statXp)} ${k.xp}`,
      ].join('   ·   ');
      fitWrite(ctx, bits, r.x + r.w - 16 * U, r.y + 24 * U, 10 * U, 600, 'right', Black, r.w - 220 * U);

      wrap(ctx, say(UI['about_' + r.key]), r.x + 92 * U + (r.w - 108 * U) / 2, r.y + r.h * 0.66,
        r.w - 108 * U, 11 * U, 15 * U, Black);
    }
  }

  // --- one spell, opened
  if (show.codexPick && Spells[show.codexPick]) {
    const key = show.codexPick;
    const sp = Spells[key];
    const cp = codexPanel(w, h, U, key);
    const { box } = cp;

    ctx.fillStyle = 'rgba(236,231,220,0.9)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = Pale;
    ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 16 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, 16 * U); ctx.stroke();

    sigil(ctx, key, box.x + 46 * U, box.y + 44 * U, 34 * U, Black);
    write(ctx, say(sp.name), box.x + 76 * U, box.y + 34 * U, 22 * U, 800, 'left');
    fitWrite(ctx, say(sp.tells), box.x + 76 * U, box.y + 58 * U, 12 * U, 500, 'left', Black, box.w - 150 * U);

    {
      const c = cp.close;
      const cx = c.x + c.w / 2, cy = c.y + c.h / 2, r = c.w * 0.24;
      ctx.globalAlpha = show.overMenu === 'codexClose' ? 1 : 0.6;
      ctx.strokeStyle = Black;
      ctx.lineWidth = 3 * U;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const twoUp = cp.twoUp;
    const colW = twoUp ? (box.w - 64 * U) / 2 : box.w - 48 * U;
    const leftX = box.x + 24 * U;
    const rightX = twoUp ? box.x + 40 * U + colW : leftX;
    let ly = box.y + 96 * U;
    let ry = twoUp ? ly : 0;

    write(ctx, say(UI.codexBoosts), leftX, ly, 11 * U, 800, 'left');
    ly += 22 * U;
    for (const bst of sp.boosts) {
      write(ctx, say(bst.name), leftX, ly, 13 * U, 700, 'left');
      write(ctx, say(UI.times, bst.most || 1), leftX + colW, ly, 9 * U, 600, 'right');
      ly += 15 * U;
      fitWrite(ctx, say(bst.tells), leftX, ly, 11 * U, 500, 'left', Black, colW);
      ly += 22 * U;
    }

    if (!twoUp) { ry = ly + 10 * U; }
    write(ctx, say(UI.codexTiers), rightX, ry, 11 * U, 800, 'left');
    ry += 22 * U;
    for (const evo of sp.evolutions) {
      write(ctx, say(evo.name), rightX, ry, 13 * U, 700, 'left');
      if (evo.needs) {
        // The whole reason this page exists: which other spell a tier is borrowed from.
        write(ctx, say(UI.codexNeeds, say(Spells[evo.needs].name)), rightX + colW, ry, 9 * U, 700, 'right');
      }
      ry += 15 * U;
      fitWrite(ctx, say(evo.tells), rightX, ry, 11 * U, 500, 'left', Black, colW);
      ry += 22 * U;
    }

    ctx.globalAlpha = 0.6;
    fitWrite(ctx, say(UI.codexRule, BoostsPerTier, MostEvos),
      box.x + box.w / 2, box.y + box.h - 20 * U, 10 * U, 600, 'center', Black, box.w - 40 * U);
    ctx.globalAlpha = 1;
  }
}

/** One cell of the comb. Flat top and bottom, points to left and right. */
function hex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/**
 * The mark inside a cell: one per kind of upgrade.
 *
 * Shapes rather than words, because a comb of fifty cells with a sentence in each is a wall of
 * text. What each one means is said once, beside the cell you are about to buy.
 */
function heroMark(ctx, key, x, y, s, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = s * 0.14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (key === 'dmg') {
    // the same four-pointed star the bolt uses
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const o = (i % 2 ? s * 0.16 : s * 0.56);
      i ? ctx.lineTo(Math.cos(a) * o, Math.sin(a) * o) : ctx.moveTo(Math.cos(a) * o, Math.sin(a) * o);
    }
    ctx.closePath(); ctx.fill();

  } else if (key === 'wall') {
    ctx.beginPath();
    ctx.rect(-s * 0.5, -s * 0.12, s, s * 0.52);
    ctx.fill();
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * s * 0.34 - s * 0.12, -s * 0.46, s * 0.24, s * 0.36);

  } else if (key === 'cd') {
    // an hourglass: less waiting
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.5); ctx.lineTo(s * 0.4, -s * 0.5);
    ctx.lineTo(-s * 0.4, s * 0.5); ctx.lineTo(s * 0.4, s * 0.5);
    ctx.closePath();
    ctx.lineWidth = s * 0.17;
    ctx.stroke();

  } else if (key === 'area') {
    for (const o of [0.2, 0.38, 0.56]) {
      ctx.beginPath(); ctx.arc(0, 0, s * o, 0, Math.PI * 2); ctx.stroke();
    }

  } else if (key === 'mend') {
    ctx.beginPath();
    ctx.rect(-s * 0.16, -s * 0.52, s * 0.32, s * 1.04);
    ctx.rect(-s * 0.52, -s * 0.16, s * 1.04, s * 0.32);
    ctx.fill();

  } else {
    // learning: an open book
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.34); ctx.lineTo(0, s * 0.42);
    ctx.moveTo(0, -s * 0.34);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.5, -s * 0.54, -s * 0.34);
    ctx.lineTo(-s * 0.54, s * 0.3);
    ctx.quadraticCurveTo(-s * 0.3, s * 0.16, 0, s * 0.42);
    ctx.moveTo(0, -s * 0.34);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.54, -s * 0.34);
    ctx.lineTo(s * 0.54, s * 0.3);
    ctx.quadraticCurveTo(s * 0.3, s * 0.16, 0, s * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The hero comb.
 *
 * Fifty cells, bottom to top, one bought at a time. Everything above the next one is drawn faint
 * - you can read the road, which is the point of having one, but there is only ever one cell you
 * can press.
 */
function heroTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const c = heroCell(w, h, U);
  const have = data.hero || 0;
  const next = heroNext(data);
  const scroll = show.heroScroll || 0;
  const left = Math.max(16 * U, w / 2 - 240 * U);
  const width = Math.min(480 * U, w - 32 * U);

  write(ctx, say(UI.heroBank), left, b.top + 18 * U, 10 * U, 700, 'left');
  write(ctx, String(Math.round(data.bank || 0)), left, b.top + 38 * U, 22 * U, 800, 'left');
  write(ctx, say(UI.heroStep, have, HeroSteps), left + width, b.top + 38 * U, 13 * U, 700, 'right');

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, c.top, w, c.foot + 16 * U - c.top);
  ctx.clip();

  const seen = (n) => {
    const p = heroAt(n, w, h, U, scroll);
    return p.y > c.top - c.step && p.y < c.foot + c.step;
  };

  // --- the path between the cells, drawn behind them
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let n = 1; n < HeroSteps; n++) {
    if (!seen(n) && !seen(n + 1)) continue;
    const a = heroAt(n, w, h, U, scroll);
    const z = heroAt(n + 1, w, h, U, scroll);
    const climbed = n < have;
    ctx.strokeStyle = Black;
    ctx.lineWidth = (climbed ? 5 : 3.5) * U;
    ctx.globalAlpha = climbed ? 1 : n + 1 <= have + 1 ? 0.5 : 0.18;
    // out of the top of one, a slant across, into the bottom of the next
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - c.r);
    ctx.lineTo(a.x, a.y - c.r - 10 * U);
    ctx.lineTo(z.x, z.y + c.r + 10 * U);
    ctx.lineTo(z.x, z.y + c.r);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // --- the cells
  for (const step of Ladder) {
    if (!seen(step.n)) continue;
    const p = heroAt(step.n, w, h, U, scroll);
    const owned = step.n <= have;
    const isNext = next && step.n === next.n;
    const canBuy = isNext && (data.bank || 0) >= step.cost;
    const lit = isNext && show.overMenu === 'heroBuy';

    ctx.globalAlpha = owned || isNext ? 1 : 0.3;

    hex(ctx, p.x, p.y, p.r);
    ctx.fillStyle = owned || (lit && canBuy) ? Black : Pale;
    ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = (isNext ? 3.6 : 2) * U;
    ctx.stroke();

    const ink = owned || (lit && canBuy) ? Pale : Black;
    heroMark(ctx, step.key, p.x, p.y, p.r * 0.86, ink);

    // a ring around the one you can take next, so it is found without reading
    if (isNext) {
      ctx.globalAlpha = canBuy ? 1 : 0.45;
      ctx.strokeStyle = Black;
      ctx.lineWidth = 2 * U;
      hex(ctx, p.x, p.y, p.r + 7 * U);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // the price, under the ones not yet bought
    if (!owned) {
      ctx.globalAlpha = isNext ? 1 : 0.4;
      write(ctx, String(step.cost), p.x, p.y + p.r + 13 * U, 11 * U, 800, 'center');
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // --- what the next cell actually gives, said once, in words
  if (next) {
    const bon = Bonus[next.key];
    const barY = b.bottom - 4 * U;
    ctx.fillStyle = Pale;
    ctx.fillRect(0, barY - 46 * U, w, 50 * U);
    ctx.strokeStyle = 'rgba(13,12,11,0.25)';
    ctx.lineWidth = 1.5 * U;
    ctx.beginPath();
    ctx.moveTo(0, barY - 46 * U); ctx.lineTo(w, barY - 46 * U);
    ctx.stroke();

    write(ctx, say(bon.name), left, barY - 28 * U, 13 * U, 800, 'left');
    fitWrite(ctx, say(bon.tells, amountText(next.key, next.amount)),
      left, barY - 11 * U, 11 * U, 500, 'left', Black, width - 90 * U);
    const short = (data.bank || 0) < next.cost;
    ctx.globalAlpha = short ? 0.45 : 1;
    write(ctx, String(next.cost), left + width, barY - 19 * U, 17 * U, 800, 'right');
    ctx.globalAlpha = 1;
  } else {
    write(ctx, say(UI.heroDone), w / 2, b.bottom - 16 * U, 12 * U, 700, 'center');
  }
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
  else if (data.tab === 'wheel') wheelTab(ctx, data, w, h, U, show);
  else if (data.tab === 'hero') heroTab(ctx, data, w, h, U, show);
  else codexTab(ctx, data, w, h, U, show);

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

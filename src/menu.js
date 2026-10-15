// The menu: five tabs along the bottom, and whatever the chosen one wants to show.
//
// Nothing here decides anything either - it reads the saved account and draws it. The field has
// its own file; this is the place you come back to between stages, and it is the part a player
// sees first, so it gets the same two inks and the same care.
//
// Three of the tabs are skeletons on purpose. The shape of the menu is the thing to agree on
// first; what goes inside each tab is a conversation per tab.

import {
  Inks, Face, write, fitWrite, wrap, wrapIn, sigil, star, stars, creatureMark, coin, shard, gem,
  cutPath, cutBox, boxPath, slashes, spyOpen, spyShut, spyMark, spyLayer,
} from './draw.js';
import { say, UI, LanguageNames, language } from './text.js';
import { Spells, UnlockAt, LoadoutSize, Always, spellKeys, nextUnlock } from './spells.js';
import {
  needFor, furthestStage, starsAt, heroNext, heroBonus, spellStep, levelOf, shardsOf,
  dailyJobs, runJobs, week, feats, adsLeft,
} from './meta.js';
import { News } from './news.js';
import { ready as adsReady } from './ads.js';
import { Feats, DailyCount, Week } from './missions.js';
import { Steps as SpellSteps, liftAt } from './upgrades.js';
import {
  Wedges, amountAt, kindAt, Jackpot, Chests, ChestKinds, chestPrize, costOf, canOpen, canSpin,
  Bulk, gemsHeld,
} from './rewards.js';
import { Ladder, Steps as HeroSteps, Bonus, amountText, totals as heroTotals } from './hero.js';
import { stageOf, kindsOn } from './stages.js';
import { Families, FamilyKeys, Roles, familiesOn, weakness, armour } from './foes.js';
import { Kinds, BoostsPerTier, MostEvos, HeraldCalls, ShadeKeeps, Bosses } from './rules.js';

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
/**
 * The account, on a black band across the top.
 *
 * A band rather than writing on the background, because this is the one strip that is true on
 * every tab: who you are, how far along, and the way into the settings. Its bottom-right corner
 * is cut away - the first of the cuts, and the one that says what the rest of the screen is
 * going to look like.
 */
export function topBand(w, h, dpr = 1) {
  const U = unit(dpr);
  const tall = (narrow(w, h) ? 92 : 74) * U;
  const pad = 13 * U;
  const av = tall - pad * 2;
  const g = 32 * U;
  const gear = { x: w - pad - g, y: tall / 2 - g / 2, w: g, h: g };
  return {
    box: { x: 0, y: 0, w, h: tall },
    cut: 24 * U,
    avatar: { x: pad, y: pad, w: av, h: av },
    textX: pad + av + 13 * U,
    gear,
    // The experience bar runs to the gear now. The star total used to sit here with a hairline
    // beside it; a total that opens nothing and buys nothing is a number carried on every screen
    // for no reason, so it went and the bar got the room.
    barEnd: gear.x - 18 * U,
  };
}

export function navBar(w, h, dpr = 1) {
  const U = unit(dpr);
  // Touching rather than spaced. Apart they read as five loose objects floating at the foot of
  // the screen; edge to edge they read as one strip with five parts, which is what they are - and
  // the shared edge between two of them is what says they are separate.
  // Wide enough for a word under the mark. The marks alone were learnable but never learnt -
  // five shapes with nothing to attach a name to is five shapes you guess at every time.
  const cw = Math.min(104 * U, (w - 16 * U) / Tabs.length);
  const ch = 62 * U;
  const total = Tabs.length * cw;
  const left = w / 2 - total / 2;
  const y = h - ch - 12 * U;
  return Tabs.map((t, i) => ({
    ...t, i,
    x: left + i * cw, y, w: cw, h: ch,
    cx: left + i * cw + cw / 2, cy: y + ch / 2,
    first: i === 0, last: i === Tabs.length - 1,
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
  const top = topBand(w, h, dpr).box.h + 10 * U;
  const bottom = h - 92 * U;
  return { top, bottom, mid: (top + bottom) / 2, height: bottom - top };
}

/**
 * The stage picture, dead centre, with a margin either side wide enough to put something in.
 *
 * It used to take whatever width was going and leave only room for the arrows. The edges are now
 * a place: the three boards live down the left, the gear down the right, and the picture is
 * between them where it belongs.
 */
export function artBox(w, h, dpr = 1) {
  return mapColumn(w, h, dpr).art;
}

/**
 * The arrows, laid over the picture's own edges.
 *
 * Outside it they ate the margins the boards now live in. Over it they are always exactly where
 * the picture is, which is also where the eye already is.
 */
export function arrows(w, h, dpr = 1) {
  const U = unit(dpr);
  const a = artBox(w, h, dpr);
  const r = 23 * U;
  // Low on the picture rather than halfway down it. The stage's name and stars now sit over the
  // left of the art, and an arrow at mid-height landed on the writing.
  const y = a.y + a.h - r * 2 - 14 * U;
  return {
    prev: { x: a.x + 14 * U, y, w: r * 2, h: r * 2 },
    next: { x: a.x + a.w - r * 2 - 14 * U, y, w: r * 2, h: r * 2 },
  };
}

/**
 * The map is one column of stacked cards, and this is where it is measured.
 *
 * Everything on the map tab hangs off this: the four boards, the stage card, who lives there,
 * PLAY, and the two cards at the foot. It is measured top-down from the band and reports its own
 * total height, so the tab can scroll when the window is too short to hold it - which a landscape
 * window always is.
 */
export const Boards = ['jobs', 'week', 'feats', 'news'];

export function mapColumn(w, h, dpr = 1) {
  const U = unit(dpr);
  const b = band(w, h, dpr);
  const cw = Math.min(520 * U, w - 28 * U);
  const x = w / 2 - cw / 2;
  const boardH = 62 * U;
  const foesH = 92 * U;
  const playH = 62 * U;
  const stripH = 72 * U;

  // The picture is the one card that gives: everything else is as tall as its own contents, and
  // whatever room is left over is the picture's. Laid out with a fixed picture height the column
  // ran eight pixels past the tab strip on a 720-high window - which is every landscape window.
  const fixed = boardH + foesH + playH + stripH;
  const gaps = 4;
  let gap = 12 * U;
  const room = b.height - fixed - gap * gaps;
  const artH = Math.max(110 * U, Math.min(cw * 0.62, 260 * U, room));
  // ...and when there is MORE room than the picture can use, it goes into the gaps rather than
  // being left as a hole above the tabs.
  gap += Math.min(16 * U, Math.max(0, room - artH) / gaps);

  let y = b.top;
  const bw = (cw - gap * (Boards.length - 1) * 0.5) / Boards.length;
  const boards = Boards.map((key, i) => ({
    key,
    x: x + i * (bw + gap * 0.5), y, w: bw, h: boardH,
  }));
  y += boardH + gap;

  const art = { x, y, w: cw, h: artH };
  y += artH + gap;

  const foes = { x, y, w: cw, h: foesH };
  y += foesH + gap;

  const play = { x, y, w: cw, h: playH };
  y += playH + gap;

  const sw = (cw - 12 * U) / 2;
  const strip = [
    { key: 'spin', x, y, w: sw, h: stripH },
    { key: 'runjobs', x: x + sw + 12 * U, y, w: sw, h: stripH },
  ];
  y += stripH;

  return { x, w: cw, gap, boards, art, foes, play, strip, foot: y, height: y - b.top };
}

/** Where PLAY is. Its own export because the hit test and three other screens ask for it. */
export function playBox(w, h, dpr = 1) {
  return mapColumn(w, h, dpr).play;
}

export function sideBoxes(w, h, dpr = 1) {
  return mapColumn(w, h, dpr).boards;
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
  const top = b.top + 78 * U;
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
  const top = sb.y + sb.h + 92 * U;
  return ChestKinds.map((kind, i) => ({
    kind, x: w / 2 - bw / 2, y: top + i * (bh + 14 * U), w: bw, h: bh,
  }));
}

/** The advert spin, under the wheel's own button. */
export function adSpinBox(w, h, dpr = 1) {
  const U = unit(dpr);
  const sb = spinBox(w, h, dpr);
  const bw = Math.min(190 * U, w - 110 * U);
  return { x: w / 2 - bw / 2, y: sb.y + sb.h + 10 * U, w: bw, h: 38 * U };
}

/**
 * The advert open, on a chest's top right.
 *
 * Beside the two prices it squeezed them until "x10 2250" ran over its own gem. The title row
 * above them is empty and the same width.
 */
export function adChestBox(box, dpr = 1) {
  const U = unit(dpr);
  const bw = Math.min(104 * U, box.w * 0.26);
  return { x: box.x + box.w - bw - 12 * U, y: box.y + 10 * U, w: bw, h: 32 * U };
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

// --- the three boards, as panels -------------------------------------------------------------

/** How many rows a board has, and how tall they are. One answer, read by the hits and the paint. */
export function boardShape(data, key) {
  // The week used to be the first row of the daily board. Split out, because the two are not the
  // same promise: the dailies reset every midnight and the week is the one thing that only comes
  // round once, and a row that only comes round once does not belong at the top of a list that
  // is new every day.
  if (key === 'jobs') return { many: DailyCount, tall: 66 };
  if (key === 'week') return { many: 1, tall: 66 };
  if (key === 'feats') return { many: Feats.length, tall: 62 };
  return { many: News.length, tall: 92 };
}

/**
 * One panel, the same shape for all three boards.
 *
 * Nearly the whole screen, because all three have lists in them and a list in a small box is a
 * list you scroll past rather than read.
 */
export function boardPanel(w, h, dpr = 1, shape = null) {
  const U = unit(dpr);
  const pw = Math.min(520 * U, w - 28 * U);
  // Sized to what is in it, up to what the screen allows. A fixed height left the shortest board
  // as four rows adrift in a sheet of empty paper.
  const want = shape
    ? (78 + shape.many * (shape.tall + 7) + 10) * U
    : 680 * U;
  const ph = Math.min(h - 120 * U, 680 * U, Math.max(220 * U, want));
  const x = w / 2 - pw / 2;
  const y = h / 2 - ph / 2;
  return {
    box: { x, y, w: pw, h: ph },
    close: { x: x + pw - 54 * U, y: y + 12 * U, w: 40 * U, h: 40 * U },
    head: y + 46 * U,
    top: y + 64 * U,
    foot: y + ph - 14 * U,
  };
}

/** One row inside a panel. `n` is how many there are; the panel scrolls when they do not fit. */
export function boardRows(w, h, dpr = 1, many = 3, tall = 66) {
  const U = unit(dpr);
  const p = boardPanel(w, h, dpr, { many, tall });
  const rh = tall * U;
  const gap = 7 * U;
  return Array.from({ length: many }, (_, i) => ({
    i, x: p.box.x + 14 * U, y: p.top + i * (rh + gap), w: p.box.w - 28 * U, h: rh,
  }));
}

/** The press on a finished mission or achievement. */
export function boardTake(box, dpr = 1) {
  const U = unit(dpr);
  const bw = Math.min(104 * U, box.w * 0.3);
  return { x: box.x + box.w - bw - 10 * U, y: box.y + box.h / 2 - 16 * U, w: bw, h: 32 * U };
}

/** How far a board's list can be pushed up. */
export function boardReach(w, h, dpr = 1, many = 3, tall = 66) {
  const U = unit(dpr);
  const p = boardPanel(w, h, dpr, { many, tall });
  const rows = boardRows(w, h, dpr, many, tall);
  const last = rows[rows.length - 1];
  return Math.max(0, last.y + last.h + 8 * U - p.foot);
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
  const top = b.top + 104 * U;
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
/**
 * The settings gear stays in the corner.
 *
 * It belongs to every tab, and the picture it would have sat beside only exists on one of them -
 * a gear floating next to nothing on the hero comb is a gear nobody finds twice.
 */
export function gearBox(w, h, dpr = 1) {
  // One definition, read by the painter and the hit test alike. It used to carry its own corner
  // arithmetic and the two drifted apart the first time the top bar changed height.
  return topBand(w, h, dpr).gear;
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
  const rows = 3;
  const ph = 86 * U + rows * rowH + 20 * U;
  const x = w / 2 - pw / 2;
  const y = h / 2 - ph / 2;
  const row = (i) => ({ x: x + 16 * U, y: y + 76 * U + i * rowH, w: pw - 32 * U, h: rowH - 8 * U });
  return {
    box: { x, y, w: pw, h: ph },
    lang: row(0),
    sound: row(1),
    // Music gets its own switch. Plenty of people want the spells to land and the room to be
    // quiet, and one switch for both makes them choose.
    music: row(2),
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
  // Families first, then the bosses. Both lists are read from their own tables rather than
  // written out here: a hand-kept list goes out of step with the thing it describes the first
  // time either changes - and it did, the moment two more bosses arrived and the codex went on
  // saying there was one.
  const keys = [...FamilyKeys.map((k) => ({ key: k, family: true })),
    ...Bosses.map((k) => ({ key: k, family: false }))];
  const gap = 8 * U;
  const rw = Math.min(680 * U, w - 36 * U);
  const rh = Math.min(104 * U, (b.height - 92 * U - (keys.length - 1) * gap) / keys.length);
  const top = b.top + 72 * U;
  return keys.map((k, i) => ({
    ...k, x: w / 2 - rw / 2, y: top + i * (rh + gap), w: rw, h: rh,
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
    if (inside(sp.music, px, py)) return { what: 'music' };
    if (!inside(sp.box, px, py)) return { what: 'closeSettings' };
    return null;
  }

  if (inside(gearBox(w, h, dpr), px, py)) return { what: 'openSettings' };
  for (const t of navBar(w, h, dpr)) if (inside(t, px, py)) return { what: 'tab', key: t.key };

  // A board is over everything, so it is tested before anything under it.
  if (show.board) {
    const shape = boardShape(data, show.board);
    const p = boardPanel(w, h, dpr, shape);
    if (inside(p.close, px, py) || !inside(p.box, px, py)) return { what: 'boardClose' };
    const up = show.boardScroll || 0;
    const rows = boardRows(w, h, dpr, shape.many, shape.tall);
    if (show.board === 'week') {
      const w0 = week(data);
      const t = boardTake(rows[0], dpr);
      if (w0.due && inside({ ...t, y: t.y - up }, px, py)) return { what: 'week' };
    } else if (show.board === 'jobs') {
      const jobs = dailyJobs(data);
      for (let i = 0; i < jobs.length; i++) {
        const j = jobs[i];
        const r = rows[i];
        if (!r || !j.done || j.paid) continue;
        const t = boardTake(r, dpr);
        if (inside({ ...t, y: t.y - up }, px, py)) return { what: 'daily', key: j.key };
      }
    } else if (show.board === 'feats') {
      const all = feats(data);
      for (let i = 0; i < all.length; i++) {
        const f = all[i];
        const r = rows[i];
        if (!r || !f.done || f.paid) continue;
        const t = boardTake(r, dpr);
        if (inside({ ...t, y: t.y - up }, px, py)) return { what: 'feat', key: f.key };
      }
    }
    return null;
  }

  if (data.tab === 'map') {
    for (const box of sideBoxes(w, h, dpr)) {
      if (inside(box, px, py)) return { what: 'board', key: box.key };
    }
    const a = arrows(w, h, dpr);
    if (inside(a.prev, px, py)) return { what: 'stage', step: -1 };
    if (inside(a.next, px, py)) return { what: 'stage', step: 1 };
    if (inside(playBox(w, h, dpr), px, py)) return { what: 'play' };
    // The spin card is the only one of the two at the foot that goes anywhere.
    const spin = mapColumn(w, h, dpr).strip.find((b) => b.key === 'spin');
    if (spin && inside(spin, px, py)) return { what: 'tab', key: 'wheel' };
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
    if (adsReady() && adsLeft(data, 'spin') > 0
      && inside(moved(adSpinBox(w, h, dpr)), px, py)) return { what: 'adSpin' };
    for (const box of chestBoxes(w, h, dpr)) {
      if (adsReady() && adsLeft(data, box.kind) > 0
        && inside(moved(adChestBox(box, dpr)), px, py)) {
        return { what: 'adChest', key: box.kind };
      }
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

/** The gear, wherever it is asked for, in whichever ink the thing behind it needs. */
function gearMark(ctx, g, U, ink, lit) {
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2, r = g.w * 0.3;
  ctx.globalAlpha = lit ? 1 : 0.8;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 2.2 * U;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    ctx.lineTo(cx + Math.cos(a) * r * 1.36, cy + Math.sin(a) * r * 1.36);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * The tower the game is named after: a keep with battlements and one lit window.
 *
 * `back` is what is behind it, because the window is painted in that rather than cut out of the
 * canvas - cutting would punch through to nothing on a canvas with no alpha.
 */
function keepMark(ctx, x, y, s, ink, back) {
  const half = s * 0.34;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(x - half, y + s * 0.46);
  ctx.lineTo(x - half * 0.82, y - s * 0.2);
  ctx.lineTo(x + half * 0.82, y - s * 0.2);
  ctx.lineTo(x + half, y + s * 0.46);
  ctx.closePath();
  ctx.fill();
  // battlements: three teeth across the top
  const tooth = half * 0.52;
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(x + i * tooth * 1.5 - tooth * 0.42, y - s * 0.42, tooth * 0.84, s * 0.24);
  }
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.arc(x, y + s * 0.08, s * 0.11, 0, Math.PI * 2);
  ctx.fill();
}

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

/** The three boards' marks: a ticked list, a laurel, and a folded sheet. */
function boardMark(ctx, key, x, y, s, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = s * 0.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (key === 'week') {
    // seven days as a ring of ticks: a week, said without a word
    ctx.lineWidth = s * 0.09;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33, s * 0.1, 0, Math.PI * 2);
      if (i < 4) ctx.fill(); else ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (key === 'jobs') {
    // a list with the first line ticked
    for (let i = 0; i < 3; i++) {
      const yy = -s * 0.32 + i * s * 0.32;
      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, yy); ctx.lineTo(-s * 0.3, yy + s * 0.12); ctx.lineTo(-s * 0.1, yy - s * 0.16);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(-s * 0.3, yy, s * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(s * 0.02, yy); ctx.lineTo(s * 0.44, yy);
      ctx.stroke();
    }

  } else if (key === 'feats') {
    // a laurel around a star
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.14, s * 0.44);
      ctx.quadraticCurveTo(side * s * 0.52, s * 0.18, side * s * 0.3, -s * 0.4);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const o = i % 2 ? s * 0.1 : s * 0.26;
      i ? ctx.lineTo(Math.cos(a) * o, Math.sin(a) * o - s * 0.04)
        : ctx.moveTo(Math.cos(a) * o, Math.sin(a) * o - s * 0.04);
    }
    ctx.closePath(); ctx.fill();

  } else {
    // a sheet with a fold out of the corner
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, -s * 0.44);
    ctx.lineTo(s * 0.16, -s * 0.44);
    ctx.lineTo(s * 0.36, -s * 0.22);
    ctx.lineTo(s * 0.36, s * 0.44);
    ctx.lineTo(-s * 0.34, s * 0.44);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.16, -s * 0.44); ctx.lineTo(s * 0.16, -s * 0.22); ctx.lineTo(s * 0.36, -s * 0.22);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const yy = -s * 0.04 + i * s * 0.18;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, yy); ctx.lineTo(s * (i === 2 ? 0.06 : 0.22), yy);
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
  // A plain rectangle: whoever asks for a portrait has already clipped it to whatever shape the
  // card is. Rounding here as well left a pale notch inside the cut corners of the stage card.
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
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
  // A far range behind everything, in every place.
  //
  // Five of the twelve looks had nothing at all in the back - the stage card drew a sun, a few
  // thin posts and then a third of a blank sky, which only became obvious once the card was given
  // room to be a picture. This stands behind whatever the place does next and never competes with
  // it: one tenth of an ink, and a profile that is the same for a stage every time.
  {
    ctx.globalAlpha = 0.1;
    ctx.beginPath();
    ctx.moveTo(r.x, floor);
    for (let x = 0; x <= 1.001; x += 0.06) {
      const wave = 0.42 + Math.sin(x * 5.3 + stage * 1.7) * 0.3 + Math.sin(x * 11 + stage) * 0.18;
      ctx.lineTo(r.x + r.w * x, floor - r.h * 0.42 * wave);
    }
    ctx.lineTo(r.x + r.w, floor);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.22;
  }

  const Hills = { ridge: 0.3, hollow: 0.14, ice: 0.34, marsh: 0.08 };
  if (Hills[look] !== undefined) {
    // One profile across the back, shaped differently by place: a ridge is a skyline, dunes roll,
    // a marsh is almost flat, and ice is jagged rather than rounded.
    ctx.beginPath();
    ctx.moveTo(r.x, floor);
    for (let x = 0; x <= 1.001; x += look === 'ice' ? 0.045 : 0.08) {
      const wave = look === 'ice'
        ? Math.abs(Math.sin(x * 23 + stage)) * 0.9 + 0.1
        : look === 'dunes'
          ? 0.5 + Math.sin(x * 4.2 + stage) * 0.5
          : 0.5 + Math.sin(x * 9 + stage) * 0.5;
      ctx.lineTo(r.x + r.w * x, floor - Hills[look] * r.h * wave);
    }
    ctx.lineTo(r.x + r.w, floor);
    ctx.closePath(); ctx.fill();

  } else if (look === 'dunes') {
    // Layered crests, each nearer one a little darker. One wave across the back was a flat line
    // with nothing on it - sand only reads as sand when one ridge overlaps another.
    for (let n = 0; n < 4; n++) {
      const deep = n / 3;
      const lift = r.h * (0.3 - deep * 0.06);
      const slide = roll() * 6;
      ctx.globalAlpha = 0.16 + deep * 0.3;
      ctx.beginPath();
      ctx.moveTo(r.x, floor);
      for (let x = 0; x <= 1.001; x += 0.05) {
        const wave = Math.sin(x * (2.4 + n * 0.8) + slide) * 0.5 + 0.5;
        ctx.lineTo(r.x + r.w * x, floor - lift * (0.25 + wave * 0.75) * (0.55 + deep * 0.45));
      }
      ctx.lineTo(r.x + r.w, floor);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 0.22;

  } else if (look === 'cave') {
    // A mound with a hole in it, rather than a grey wall with spikes - which is what filling the
    // whole back with rock looked like. The mound is faint; the mouth is the only black thing in
    // the picture, which is the point of it.
    const mx = r.x + r.w * (0.26 + roll() * 0.14);
    ctx.beginPath();
    ctx.moveTo(r.x - r.w * 0.1, floor);
    ctx.quadraticCurveTo(mx, floor - r.h * 0.95, r.x + r.w * 0.86, floor);
    ctx.closePath(); ctx.fill();

  } else if (look === 'ruin') {
    // broken rooflines, each missing a different piece
    for (let i = 0; i < 9; i++) {
      const x = r.x + roll() * r.w;
      const wd = (26 + roll() * 26) * scale;
      const hgt = (30 + roll() * 40) * scale;
      ctx.beginPath();
      ctx.moveTo(x, floor);
      ctx.lineTo(x, floor - hgt);
      ctx.lineTo(x + wd * 0.5, floor - hgt - (roll() < 0.5 ? 14 * scale : 0));
      ctx.lineTo(x + wd, floor - hgt * (0.4 + roll() * 0.5));
      ctx.lineTo(x + wd, floor);
      ctx.closePath(); ctx.fill();
    }

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
  const Count = {
    field: 5, stones: 7, road: 8, marsh: 16, cave: 11, ruin: 6, ice: 9, bones: 4, dunes: 5,
  };
  const near = Count[look] ?? 13;
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

    } else if (look === 'marsh') {
      // reeds, in clumps, with a head on about half of them
      ctx.lineWidth = 2.4 * scale;
      for (let n = 0; n < 4; n++) {
        const rx = x + (n - 1.5) * 5 * scale;
        const rh = hgt * (0.4 + roll() * 0.5);
        const bend = (roll() - 0.5) * 12 * scale;
        ctx.beginPath();
        ctx.moveTo(rx, floor);
        ctx.quadraticCurveTo(rx + bend * 0.4, floor - rh * 0.6, rx + bend, floor - rh);
        ctx.stroke();
        if (roll() < 0.5) {
          ctx.beginPath();
          ctx.ellipse(rx + bend, floor - rh - 3 * scale, 2 * scale, 5 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (look === 'cave') {
      // The mouth is drawn once, on the first pass, and the rest of the passes are its teeth -
      // cut out of it in the pale rather than drawn on in the black, so they read as gaps in the
      // dark the way teeth in a silhouette have to.
      const mx = r.x + r.w * 0.33;
      const mw = r.w * 0.3;
      const mh = r.h * 0.56;
      const mouth = () => {
        ctx.beginPath();
        ctx.moveTo(mx - mw / 2, floor);
        ctx.lineTo(mx - mw / 2, floor - mh * 0.45);
        ctx.quadraticCurveTo(mx, floor - mh * 1.3, mx + mw / 2, floor - mh * 0.45);
        ctx.lineTo(mx + mw / 2, floor);
        ctx.closePath();
      };
      if (i === 0) {
        mouth();
        ctx.fill();
      } else {
        // Clipped to the mouth. Without it the teeth that fell outside the arch cut into the
        // faint hill instead and read as marks floating in the sky.
        ctx.save();
        mouth();
        ctx.clip();
        ctx.globalCompositeOperation = 'destination-out';
        const at = mx - mw * 0.4 + ((i - 1) / (near - 2)) * mw * 0.8;
        const down = i % 2 === 0;
        const t = (12 + roll() * 16) * scale;
        ctx.beginPath();
        if (down) {
          const top = floor - mh * (0.62 + roll() * 0.42);
          ctx.moveTo(at - 6 * scale, top); ctx.lineTo(at, top + t); ctx.lineTo(at + 6 * scale, top);
        } else {
          ctx.moveTo(at - 6 * scale, floor); ctx.lineTo(at, floor - t); ctx.lineTo(at + 6 * scale, floor);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = Black;
      }

    } else if (look === 'ruin') {
      // a standing piece of wall with a window gone out of it
      const wd = (30 + roll() * 30) * scale;
      const h2 = hgt * 0.9;
      ctx.beginPath();
      ctx.rect(x - wd / 2, floor - h2, wd, h2);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(x - wd * 0.18, floor - h2 * 0.78, wd * 0.36, h2 * 0.34);
      ctx.restore();
      ctx.fillStyle = Black;

    } else if (look === 'ice') {
      // shards: straight edges, no curve anywhere
      ctx.beginPath();
      ctx.moveTo(x - 11 * scale, floor);
      ctx.lineTo(x - 3 * scale, floor - hgt);
      ctx.lineTo(x + 5 * scale, floor - hgt * 0.62);
      ctx.lineTo(x + 12 * scale, floor);
      ctx.closePath(); ctx.fill();

    } else if (look === 'bones') {
      // A rib cage arching out of the ground. Thin and close together it read as grass, so there
      // are fewer of them, they are twice the weight, and the spine runs along the top of them.
      ctx.lineWidth = 5 * scale;
      const span = hgt * 0.75;
      const wide = 13 * scale;
      for (let n = 0; n < 5; n++) {
        const at = x + (n - 2) * wide;
        const rise = span * (1 - Math.abs(n - 2) * 0.18);
        ctx.beginPath();
        ctx.moveTo(at, floor);
        ctx.quadraticCurveTo(at + 15 * scale, floor - rise * 0.7, at + 6 * scale, floor - rise);
        ctx.stroke();
      }
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(x - 2 * wide + 6 * scale, floor - span * 0.64);
      ctx.quadraticCurveTo(x + 6 * scale, floor - span * 1.06, x + 2 * wide + 6 * scale, floor - span * 0.64);
      ctx.stroke();
      if (roll() < 0.6) {
        ctx.beginPath();
        ctx.ellipse(x - 3 * wide, floor - 9 * scale, 10 * scale, 9 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (look === 'dunes') {
      // the near crest, solid, cutting across the bottom of the picture
      if (i === 0) {
        ctx.beginPath();
        ctx.moveTo(r.x, floor);
        for (let t = 0; t <= 1.001; t += 0.05) {
          ctx.lineTo(r.x + r.w * t, floor - r.h * 0.065 * (0.3 + Math.sin(t * 3.1 + 1.6) * 0.5 + 0.5));
        }
        ctx.lineTo(r.x + r.w, floor);
        ctx.closePath(); ctx.fill();
      }
      // and almost nothing standing: a stalk, bent hard with the wind
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(x, floor);
      ctx.quadraticCurveTo(x + 14 * scale, floor - hgt * 0.5, x + 34 * scale, floor - hgt * 0.55);
      ctx.stroke();

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
  const gold = String(Math.round(data.gold || 0));
  write(ctx, gold, x + 22 * U, y, 20 * U, 800, 'left');

  // Runes as well. This screen spends both and only ever named one of them.
  ctx.font = `800 ${20 * U}px ${Face}`;
  const at = x + 22 * U + ctx.measureText(gold).width + 24 * U;
  const total = Object.values(data.shards || {}).reduce((a, b) => a + b, 0);
  shard(ctx, at + 6 * U, y, 7 * U, Black);
  write(ctx, String(total), at + 18 * U, y, 20 * U, 800, 'left');
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

/**
 * A watch-an-advert button.
 *
 * Drawn whenever the day's allowance has one left, and pressable only once the portal's SDK is
 * actually there. Without it the button is faint and says so: a press that paid out with no
 * advert behind it would be a free prize, and three free wheel spins a day would quietly undo
 * the rule the whole economy stands on.
 */
function adButton(ctx, box, left, U, lit) {
  const live = adsReady();
  ctx.globalAlpha = live ? 1 : 0.4;
  ctx.fillStyle = lit && live ? Black : Pale;
  ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 9 * U); ctx.fill();
  ctx.strokeStyle = Black;
  ctx.lineWidth = 2 * U;
  ctx.setLineDash([5 * U, 4 * U]);
  ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 9 * U); ctx.stroke();
  ctx.setLineDash([]);

  const ink = lit && live ? Pale : Black;
  // a small play triangle, so it reads as "watch" without the word
  ctx.fillStyle = ink;
  ctx.beginPath();
  const px = box.x + 16 * U, py = box.y + box.h / 2;
  ctx.moveTo(px - 4 * U, py - 6 * U);
  ctx.lineTo(px + 6 * U, py);
  ctx.lineTo(px - 4 * U, py + 6 * U);
  ctx.closePath(); ctx.fill();
  fitWrite(ctx, `${say(UI.adWatch)}  ${left}`, px + 14 * U, py, 11 * U, 800, 'left', ink,
    box.w - 34 * U);
  ctx.globalAlpha = 1;
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
  ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 14 * U); ctx.stroke();
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
    tx, box.y + 26 * U, 12 * U, 800, 'left', Black,
    right - tx - (adsLeft(data, kind) > 0 ? adChestBox(box, U).w + 12 * U : 0));

  // what one of them holds: the runes first, because they are what a chest is for
  shard(ctx, tx + 6 * U, box.y + 52 * U, 6 * U, Black);
  write(ctx, String(holds.runes), tx + 18 * U, box.y + 52 * U, 16 * U, 800, 'left');
  ctx.globalAlpha = 0.72;
  fitWrite(ctx, say(UI.chestHolds, holds.exp, holds.gold),
    tx + 42 * U, box.y + 52 * U, 11 * U, 600, 'left', Black, right - tx - 48 * U);
  ctx.globalAlpha = 1;

  // --- one free open a day, three times, for an advert
  {
    const left = adsLeft(data, kind);
    if (left > 0) adButton(ctx, adChestBox(box, U), left, U, show.overMenu === 'adChest:' + kind);
  }

  // --- the two prices. Ten costs nine, which only reads if both are on the screen at once.
  for (const side of [press.one, press.many]) {
    const cost = costOf(kind, side.many);
    const can = canOpen(data, kind, side.many);
    const lit = can && show.overMenu === `chest:${kind}:${side.many}`;
    ctx.fillStyle = lit ? Black : Pale;
    ctx.beginPath(); boxPath(ctx, side.x, side.y, side.w, side.h, 10 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = (can ? 2.4 : 1.4) * U;
    ctx.globalAlpha = can ? 1 : 0.4;
    ctx.beginPath(); boxPath(ctx, side.x, side.y, side.w, side.h, 10 * U); ctx.stroke();

    const ink = lit ? Pale : Black;
    const back = lit ? Black : Pale;
    const mid = side.y + side.h / 2;
    // The price is measured and placed first; the ×N gets what is left of the button. A ten at a
    // fixed size and a four-digit price at the other end met in the middle on a narrow phone.
    ctx.font = `800 ${13 * U}px ${Face}`;
    const cw = ctx.measureText(String(cost)).width;
    const gemX = side.x + side.w - 14 * U - cw - 8 * U;
    write(ctx, String(cost), side.x + side.w - 10 * U, mid, 13 * U, 800, 'right', ink);
    gem(ctx, gemX, mid, 7 * U, ink, back);
    fitWrite(ctx, side.many > 1 ? `×${side.many}` : '×1', side.x + 12 * U, mid,
      13 * U, 800, 'left', ink, gemX - 7 * U - (side.x + 12 * U) - 5 * U);
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
    ctx.beginPath(); boxPath(ctx, sb.x, sb.y, sb.w, sb.h, 14 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.beginPath(); boxPath(ctx, sb.x, sb.y, sb.w, sb.h, 14 * U); ctx.stroke();
    write(ctx, say(UI.spin), w / 2, sb.y + sb.h / 2, 18 * U, 800, 'center', lit ? Pale : Black);
  } else {
    ctx.globalAlpha = 0.55;
    write(ctx, say(UI.spinTomorrow), w / 2, sb.y + sb.h / 2, 13 * U, 700, 'center');
    ctx.globalAlpha = 1;
  }

  // the extra turns, bought with an advert rather than with the day
  {
    const left = adsLeft(data, 'spin');
    if (left > 0 && !turning) {
      const ab = adSpinBox(w, h, U);
      adButton(ctx, ab, left, U, show.overMenu === 'adSpin');
      if (!adsReady()) {
        ctx.globalAlpha = 0.45;
        fitWrite(ctx, say(UI.adSoon), w / 2, ab.y + ab.h + 13 * U, 9 * U, 600, 'center',
          Black, w - 60 * U);
        ctx.globalAlpha = 1;
      }
    }
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

/**
 * The map: one column of cards, read top to bottom.
 *
 * Four doors, then the stage, then what lives in it, then the button, then two things that are a
 * state rather than a door. It used to be a picture with three icons stacked down its left and a
 * third of the screen left empty underneath; the column fills the page and says more with it.
 */
function mapTab(ctx, data, w, h, U, show) {
  const col = mapColumn(w, h, U);
  const far = furthestStage(data);
  const info = stageOf(data.stage);
  const cut = 14 * U;

  boardRow(ctx, data, col, U, show);
  stageCard(ctx, data, col, U, show, info, far, cut, w, h);
  foeCard(ctx, data, col, U, cut);

  // --- the one button the whole screen is for
  {
    const p = col.play;
    const lit = show.overMenu === 'play';
    cutBox(ctx, p, U, { cut: { tl: cut * 1.4, br: cut * 1.4 }, fill: Black });
    if (lit) {
      // pressed, it loses its fill and keeps its outline - the only button that does
      cutBox(ctx, p, U, { cut: { tl: cut * 1.4, br: cut * 1.4 }, fill: Pale, line: Black, width: 3 });
    }
    const ink = lit ? Black : Pale;
    // the triangle, then the word, centred as one group
    ctx.font = `800 ${22 * U}px ${Face}`;
    const word = say(UI.play);
    const ww = ctx.measureText(word).width;
    const left = p.x + p.w / 2 - (ww + 34 * U) / 2;
    const cy = p.y + p.h / 2;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(left, cy - 11 * U);
    ctx.lineTo(left + 18 * U, cy);
    ctx.lineTo(left, cy + 11 * U);
    ctx.closePath();
    ctx.fill();
    write(ctx, word, left + 34 * U, cy, 22 * U, 800, 'left', ink);
    slashes(ctx, p, U, ink);
  }

  stripRow(ctx, data, col, U, show);
}

/**
 * The four doors along the top.
 *
 * A row rather than a column down the edge of the picture: stacked at the side they squeezed the
 * stage art into the middle third of the screen, and three unlabelled icons in a vertical line
 * are three icons nobody presses twice. Each one says what it is and how many are waiting.
 */
function boardRow(ctx, data, col, U, show) {
  const waiting = {
    jobs: dailyJobs(data).filter((j) => j.done && !j.paid).length,
    week: week(data).due ? 1 : 0,
    feats: feats(data).filter((f) => f.done && !f.paid).length,
    news: 0,
  };
  const name = {
    jobs: UI.boardJobs, week: UI.boardWeek, feats: UI.boardFeats, news: UI.boardNews,
  };

  for (const box of col.boards) {
    const lit = show.overMenu === 'board:' + box.key;
    const many = waiting[box.key] || 0;
    cutBox(ctx, box, U, {
      cut: { tl: 10 * U, br: 10 * U },
      fill: lit ? Black : Pale,
      line: Black,
      width: many ? 2.6 : 1.5,
    });
    const ink = lit ? Pale : Black;
    ctx.globalAlpha = lit || many ? 1 : 0.72;
    boardMark(ctx, box.key, box.x + box.w / 2, box.y + box.h * 0.38, box.h * 0.42, ink);
    fitWrite(ctx, say(name[box.key]), box.x + box.w / 2, box.y + box.h * 0.78,
      8.5 * U, 800, 'center', ink, box.w - 8 * U);
    ctx.globalAlpha = 1;

    // The count, in a disc on the corner. A plain dot said "something is here" and nothing else;
    // a number says whether it is worth the trip.
    if (many) {
      const cx = box.x + box.w - 8 * U, cy = box.y + 8 * U;
      ctx.fillStyle = lit ? Pale : Black;
      ctx.beginPath(); ctx.arc(cx, cy, 9 * U, 0, Math.PI * 2); ctx.fill();
      write(ctx, String(many), cx, cy, 11 * U, 800, 'center', lit ? Black : Pale);
    }
  }
}

/**
 * The stage, as a picture with its name written on it.
 *
 * The name and the stars used to sit under the picture as loose writing. On it, in a dark panel
 * cut into the corner, they belong to the place they are naming - and the space they used to take
 * up is where the rest of the column now lives.
 */
function stageCard(ctx, data, col, U, show, info, far, cut, w, h) {
  const r = col.art;

  ctx.save();
  cutPath(ctx, r, { tl: cut, br: cut });
  ctx.clip();
  portrait(ctx, r, data.stage, info.look);

  // The writing sits on a dark wash that fades out to the right, so a pale sky behind the title
  // cannot swallow it and the picture is still a picture on the side the arrows are not.
  const wash = ctx.createLinearGradient(r.x, 0, r.x + r.w * 0.92, 0);
  wash.addColorStop(0, 'rgba(13,12,11,0.9)');
  wash.addColorStop(0.55, 'rgba(13,12,11,0.62)');
  wash.addColorStop(1, 'rgba(13,12,11,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  // the stage number on its own tab, cut into the top-left
  {
    const tab = { x: r.x, y: r.y, w: Math.min(132 * U, r.w * 0.46), h: 32 * U };
    cutBox(ctx, tab, U, { cut: { br: 14 * U }, fill: Black });
    fitWrite(ctx, say(UI.stage, data.stage), tab.x + 14 * U, tab.y + tab.h / 2,
      12 * U, 800, 'left', Pale, tab.w - 28 * U);
  }

  // One column down the left: title, stars, a rule, then the line about the place. `wrapIn`
  // takes the CENTRE of its column, not its left edge - passed the left edge, half the sentence
  // was drawn off the side of the picture.
  const colX = r.x + 18 * U;
  const colW = r.w * 0.54;
  let y = r.y + 52 * U;
  fitWrite(ctx, say(info.name), colX, y, 25 * U, 800, 'left', Pale, colW + r.w * 0.1);
  y += 28 * U;
  stars(ctx, colX + 32 * U, y, 11 * U, starsAt(data, data.stage) || 0, Pale);
  y += 20 * U;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = Pale;
  ctx.lineWidth = 1.4 * U;
  ctx.beginPath();
  ctx.moveTo(colX, y); ctx.lineTo(colX + colW * 0.7, y);
  ctx.stroke();
  ctx.globalAlpha = 0.88;
  y += 9 * U;
  // Stops short of the bottom strip, because that is where the two arrows stand.
  wrapIn(ctx, say(info.blurb), colX, y, colW,
    Math.max(14 * U, r.y + r.h - 74 * U - y), 12 * U, Pale, 'left');
  ctx.globalAlpha = 1;
  ctx.restore();

  cutBox(ctx, r, U, { cut: { tl: cut, br: cut }, line: Black, width: 2 });

  // --- the way to the stage before and the one after
  const a = arrows(w, h, U);
  const arrow = (box, pointing, on) => {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, sz = 10 * U;
    const lit = show.overMenu === (pointing > 0 ? 'stage:1' : 'stage:-1');
    ctx.globalAlpha = on ? 1 : 0.28;
    ctx.fillStyle = Pale;
    ctx.beginPath(); ctx.arc(cx, cy, box.w / 2, 0, Math.PI * 2); ctx.fill();
    if (lit && on) { ctx.fillStyle = Black; ctx.beginPath(); ctx.arc(cx, cy, box.w / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = lit && on ? Pale : Black;
    ctx.lineWidth = 3.4 * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - pointing * sz * 0.45, cy - sz * 0.8);
    ctx.lineTo(cx + pointing * sz * 0.55, cy);
    ctx.lineTo(cx - pointing * sz * 0.45, cy + sz * 0.8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  arrow(a.prev, -1, data.stage > 1);
  arrow(a.next, 1, data.stage < far);
}

/**
 * Who lives in the stage, and what leads them.
 *
 * Beside PLAY on purpose. Which spells to bring is the one decision the menu asks for, and a
 * weakness you can only find out by losing a run is not a decision, it is a guess.
 */
function foeCard(ctx, data, col, U, cut) {
  const r = col.foes;
  cutBox(ctx, r, U, { cut: { tl: cut, br: cut }, fill: Pale, line: Black, width: 1.5 });

  const here = familiesOn(data.stage);
  const boss = kindsOn(data.stage).slice(-1)[0];
  const bossW = 92 * U;
  const left = { x: r.x, y: r.y, w: r.w - bossW, h: r.h };

  // the divider, which is what makes this one card and not two
  ctx.strokeStyle = Black;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.4 * U;
  ctx.beginPath();
  ctx.moveTo(r.x + r.w - bossW, r.y + 14 * U);
  ctx.lineTo(r.x + r.w - bossW, r.y + r.h - 14 * U);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // --- the families, one column each inside the left half
  const step = left.w / here.length;
  here.forEach((family, i) => {
    const x = left.x + i * step;
    const markX = x + 34 * U;
    creatureMark(ctx, 'walker', markX, r.y + r.h / 2, 40 * U, Black, family);

    const textX = x + 64 * U;
    const room = step - 72 * U;
    fitWrite(ctx, say(Families[family].name).toUpperCase(), textX, r.y + 28 * U,
      13 * U, 800, 'left', Black, room);

    const w0 = weakness(family);
    const a0 = armour(family);
    let at = r.y + 50 * U;
    const line = (up, el, much) => {
      ctx.fillStyle = Black;
      ctx.beginPath();
      if (up) { ctx.moveTo(textX + 5 * U, at - 5 * U); ctx.lineTo(textX, at + 3 * U); ctx.lineTo(textX + 10 * U, at + 3 * U); }
      else { ctx.moveTo(textX + 5 * U, at + 5 * U); ctx.lineTo(textX, at - 3 * U); ctx.lineTo(textX + 10 * U, at - 3 * U); }
      ctx.closePath(); ctx.fill();
      fitWrite(ctx, `${say(UI['el_' + el])} ×${much}`, textX + 17 * U, at,
        11 * U, 700, 'left', Black, room - 17 * U);
      at += 17 * U;
    };
    if (w0) line(true, w0.element, w0.much);
    if (a0) line(false, a0.element, a0.much);
    if (!w0 && !a0) {
      ctx.globalAlpha = 0.55;
      fitWrite(ctx, say(UI.noElement), textX, at, 10 * U, 600, 'left', Black, room);
      ctx.globalAlpha = 1;
    }
  });

  // --- and the one at the end of it
  {
    const cx = r.x + r.w - bossW / 2;
    creatureMark(ctx, boss, cx, r.y + r.h / 2 - 6 * U, 46 * U, Black);
    fitWrite(ctx, say(UI['foe_' + boss] || boss), cx, r.y + r.h - 16 * U,
      11 * U, 800, 'center', Black, bossW - 10 * U);
  }
}

/**
 * The two cards at the foot: a free spin, and what this run is being asked for.
 *
 * Neither of them opens anything. They are here because they are true right now and change on
 * their own - a countdown and three goals - and that is a different kind of thing from a door.
 */
function stripRow(ctx, data, col, U, show) {
  const cut = 10 * U;
  for (const box of col.strip) {
    // Only the spin card is a door - it goes where the wheel is. The run's three are read here
    // and nowhere else, so nothing about that card should look pressable.
    const lit = box.key === 'spin' && show.overMenu === 'strip:spin';
    cutBox(ctx, box, U, {
      cut: { tl: cut, br: cut },
      fill: lit ? 'rgba(13,12,11,0.06)' : Pale,
      line: Black,
      width: 1.5,
    });

    if (box.key === 'spin') {
      const ready = canSpin(data);
      tabMark(ctx, 'wheel', box.x + 26 * U, box.y + 26 * U, 24 * U, Black);
      fitWrite(ctx, say(UI.stripSpin), box.x + 44 * U, box.y + 24 * U, 11 * U, 800, 'left',
        Black, box.w - 56 * U);
      ctx.globalAlpha = ready ? 1 : 0.55;
      wrapIn(ctx, ready ? say(UI.stripSpinReady) : say(UI.stripSpinWait),
        box.x + 16 * U, box.y + 38 * U, box.w - 32 * U, box.h - 44 * U, 10 * U, Black, 'left');
      ctx.globalAlpha = 1;
    } else {
      const jobs = runJobs(data, data.stage);
      boardMark(ctx, 'jobs', box.x + 26 * U, box.y + 26 * U, 20 * U, Black);
      fitWrite(ctx, say(UI.runJobs), box.x + 44 * U, box.y + 24 * U, 11 * U, 800, 'left',
        Black, box.w - 56 * U);
      // Wrapped rather than squeezed onto one line. Three goal names on a single line came out
      // at the size of a footnote, which is the size nobody reads before pressing PLAY.
      ctx.globalAlpha = 0.72;
      wrapIn(ctx, jobs.map((j) => say(j.job.name)).join(' · '),
        box.x + 16 * U, box.y + 38 * U, box.w - 32 * U, box.h - 44 * U, 10 * U, Black, 'left');
      ctx.globalAlpha = 1;
    }
  }
}

/** The two halves, drawn the same way the codex draws its two. */
function half(ctx, box, label, on, lit, U) {
  ctx.fillStyle = on ? Black : 'rgba(13,12,11,0)';
  ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 10 * U); ctx.fill();
  ctx.strokeStyle = Black;
  ctx.lineWidth = (on || lit ? 2.6 : 1.4) * U;
  ctx.globalAlpha = on || lit ? 1 : 0.45;
  ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 10 * U); ctx.stroke();
  ctx.globalAlpha = 1;
  write(ctx, label, box.x + box.w / 2, box.y + box.h / 2, 12 * U, 800, 'center', on ? Pale : Black);
}

/**
 * A spell's element, as a small badge.
 *
 * The map and the codex say a family takes twice the damage from BLADE. Nothing said which spells
 * ARE blade, so that number was unreadable - there is no spell called Blade, there is Shards and
 * there is Orbit. The badge goes wherever a spell is named, which is the only thing that makes
 * the family tables mean anything.
 */
/** How wide the tag would be, without drawing it - so a caller can decide there is no room. */
function tagWidth(ctx, key, U) {
  const el = Spells[key] && Spells[key].element;
  if (!el) return 0;
  ctx.font = `800 ${9 * U}px ${Face}`;
  return ctx.measureText(say(UI['el_' + el])).width + 12 * U;
}

function elementTag(ctx, key, x, y, U, ink = Black, back = Pale, align = 'left') {
  // Not reported to the spy. A tag is a pill with its own word inside it, so the pill and the
  // word overlap by definition - sixty of those drowned the real faults on the first run.
  const el = Spells[key] && Spells[key].element;
  if (!el) return 0;
  const words = say(UI['el_' + el]);
  const size = 9 * U;
  ctx.font = `800 ${size}px ${Face}`;
  const tw = ctx.measureText(words).width;
  const pad = 6 * U;
  const bw = tw + pad * 2;
  const left = align === 'right' ? x - bw : x;

  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.3 * U;
  ctx.globalAlpha = 0.55;
  ctx.beginPath(); boxPath(ctx, left, y - 8 * U, bw, 16 * U, 5 * U); ctx.stroke();
  ctx.globalAlpha = 1;
  write(ctx, words, left + pad, y, size, 800, 'left', ink);
  return bw;
}

/** The level a spell has been raised to, as pips rather than a number you have to read. */
function pips(ctx, x, y, at, gap, ink) {
  spyMark(ctx, '[pips]', x - gap * 0.4, y - gap * 0.4, gap * SpellSteps, gap * 0.8);
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
  coins(ctx, data, left, b.top + 56 * U, U);
  // The line of explanation gets its own row. Beside the purse it sat on the rune total, which is
  // the number this screen was added to show.
  ctx.globalAlpha = 0.6;
  fitWrite(ctx, say(UI.raiseHow), left + rows[0].w / 2, b.top + 84 * U,
    10 * U, 600, 'center', Black, rows[0].w);
  ctx.globalAlpha = 1;

  for (const r of rows) {
    const open = UnlockAt[r.key] <= data.level;
    const at = levelOf(data, r.key);
    const step = open ? spellStep(data, r.key) : null;
    const held = shardsOf(data, r.key);
    const afford = !!(step && step.afford);
    const lit = show.overMenu === 'buySpell:' + r.key && afford;

    ctx.fillStyle = lit ? Black : 'rgba(13,12,11,0)';
    ctx.beginPath(); boxPath(ctx, r.x, r.y, r.w, r.h, 10 * U); ctx.fill();
    ctx.globalAlpha = open ? 1 : 0.3;
    ctx.strokeStyle = Black;
    ctx.lineWidth = (afford ? 2.6 : 1.4) * U;
    ctx.globalAlpha = open ? (afford ? 1 : 0.45) : 0.25;
    ctx.beginPath(); boxPath(ctx, r.x, r.y, r.w, r.h, 10 * U); ctx.stroke();
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
    const nameW = Math.min(13 * U, r.h * 0.24);
    fitWrite(ctx, open ? say(Spells[r.key].name) : say(UI.locked),
      tx, hi, nameW, 800, 'left', ink, r.w * 0.3);
    if (open) {
      ctx.font = `800 ${nameW}px ${Face}`;
      elementTag(ctx, r.key, tx + Math.min(ctx.measureText(say(Spells[r.key].name)).width, r.w * 0.3) + 8 * U,
        hi, U, ink, back);
    }

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

    // What you hold, always - not only when it is the thing standing in the way. Shown only on
    // the rows that were short, a player with enough runes had no way to know they had any, and
    // the screen asked for a currency it never displayed.
    ctx.globalAlpha = enoughShards ? 0.5 : 0.75;
    fitWrite(ctx, say(UI.shardsHeld, held), rx - sw - 20 * U, hi,
      Math.min(9 * U, r.h * 0.17), 600, 'right', ink, r.w * 0.28);
    ctx.globalAlpha = 1;
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
      ctx.beginPath(); boxPath(ctx, t.x, t.y, t.w, t.h, 9 * U); ctx.fill();
    }
    ctx.globalAlpha = open ? 1 : 0.3;
    ctx.strokeStyle = Black;
    ctx.lineWidth = (taken || lit ? 3 : 1.6) * U;
    ctx.beginPath(); boxPath(ctx, t.x, t.y, t.w, t.h, 9 * U); ctx.stroke();

    const ink = taken ? Pale : Black;
    const at = levelOf(data, t.key);
    const under = fixed ? say(UI.always) : open ? say(sp.tells) : say(UI.opensAt, UnlockAt[t.key]);
    if (t.tall) {
      // Measured from the tile, not from the pixel ratio alone. The sigil's column was a flat
      // `74 * U`, which on a phone at ratio two ate a hundred and fifty of a three-hundred-pixel
      // tile - so "Magic Bolt" was being shrunk to nothing to make room for a badge.
      const icon = Math.min(28 * U, t.h * 0.4);
      sigil(ctx, t.key, t.x + 14 * U + icon / 2, t.y + t.h / 2, icon, ink);
      const tx = t.x + 22 * U + icon;
      const right = t.x + t.w - 14 * U;
      const hi = t.y + t.h * 0.36;
      const lo = t.y + t.h * 0.68;

      // The badge is measured before it is drawn and dropped when the name would be left with
      // less room than a name can be read in. The element is still named on the upgrade screen
      // and in the codex, so nothing is lost but a repetition.
      const want = open ? tagWidth(ctx, t.key, U) : 0;
      const badge = want && right - tx - want >= 70 * U
        ? elementTag(ctx, t.key, right, hi, U, ink, Pale, 'right')
        : 0;
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), tx, hi,
        Math.min(16 * U, t.h * 0.23), 800, 'left', ink,
        right - tx - (badge ? badge + 8 * U : 0));

      // Same rule on the row below: the level badge is measured first, and what is left is what
      // the description gets. Given the whole width it ran straight under "LV 10".
      const lv = open && at > 1 ? say(UI.lv, at) : null;
      let lvW = 0;
      if (lv) { ctx.font = `800 ${12 * U}px ${Face}`; lvW = ctx.measureText(lv).width + 12 * U; }
      fitWrite(ctx, under, tx, lo, Math.min(10 * U, t.h * 0.15), fixed ? 800 : 500, 'left', ink,
        right - tx - lvW);
      if (lv) write(ctx, lv, right, lo, Math.min(12 * U, t.h * 0.18), 800, 'right', ink);
    } else {
      const fits = t.w - 16 * U;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + 30 * U, 26 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + t.w / 2, t.y + 54 * U, 13 * U, 800, 'center', ink, fits);
      if (open) {
        ctx.font = `800 ${9 * U}px ${Face}`;
        const words = say(UI['el_' + sp.element]);
        const bw = ctx.measureText(words).width + 12 * U;
        elementTag(ctx, t.key, t.x + t.w / 2 - bw / 2, t.y + 74 * U, U, ink, Pale);
      } else {
        fitWrite(ctx, say(UI.levelledPlain, UnlockAt[t.key]),
          t.x + t.w / 2, t.y + 74 * U, 9 * U, 600, 'center', ink, fits);
      }
      // ALWAYS goes along the top edge, which is otherwise empty. Under the name it sat on the
      // element badge, and the fixed spell is the one tile where both have to be readable.
      // Same row, same rule: ALWAYS is centred and the level sits on the right, so the badge is
      // measured first and taken off BOTH sides of the room the centred word is allowed.
      const lv2 = open && at > 1 ? say(UI.lv, at) : null;
      let lv2W = 0;
      if (lv2) { ctx.font = `800 ${11 * U}px ${Face}`; lv2W = ctx.measureText(lv2).width + 10 * U; }
      if (fixed) fitWrite(ctx, say(UI.always), t.x + t.w / 2, t.y + 11 * U, 9 * U, 800, 'center',
        ink, Math.max(20 * U, fits - lv2W * 2));
      if (lv2) write(ctx, lv2, t.x + t.w - 10 * U, t.y + 14 * U, 11 * U, 800, 'right', ink);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * What a creature's entry says, with its own numbers filled in from the rules.
 *
 * The same principle as a spell card: the writing is generated from the thing it describes, so it
 * cannot drift. The herald's entry had already drifted - it went on promising three runners after
 * it had been cut to two.
 */
function about(key) {
  if (key === 'herald') return say(UI.about_herald, HeraldCalls);
  if (key === 'shade') return say(UI.about_shade, Math.round(ShadeKeeps * 100));
  return say(UI['about_' + key]);
}

function codexTab(ctx, data, w, h, U, show) {
  const b = band(w, h, U);
  const ct = codexTabs(w, h, U);

  const half = (box, label, on, lit) => {
    ctx.fillStyle = on ? Black : 'rgba(13,12,11,0)';
    ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, box.h / 2); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = (on ? 2.4 : 1.4) * U;
    ctx.globalAlpha = on || lit ? 1 : 0.4;
    ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, box.h / 2); ctx.stroke();
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
      ctx.beginPath(); boxPath(ctx, t.x, t.y, t.w, t.h, 9 * U); ctx.fill();
      ctx.strokeStyle = Black;
      ctx.lineWidth = (lit ? 2.6 : 1.5) * U;
      ctx.globalAlpha = lit ? 1 : 0.6;
      ctx.beginPath(); boxPath(ctx, t.x, t.y, t.w, t.h, 9 * U); ctx.stroke();
      ctx.globalAlpha = 1;
      const ink = lit ? Pale : Black;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + t.h * 0.36, 30 * U, ink);
      fitWrite(ctx, say(Spells[t.key].name), t.x + t.w / 2, t.y + t.h * 0.7, 13 * U, 800, 'center', ink, t.w - 12 * U);
      {
        // centred under the name, so the grid can be read as "which of these is fire?"
        ctx.font = `800 ${9 * U}px ${Face}`;
        const words = say(UI['el_' + Spells[t.key].element]);
        const bw = ctx.measureText(words).width + 12 * U;
        elementTag(ctx, t.key, t.x + t.w / 2 - bw / 2, t.y + t.h * 0.93, U, ink, Pale);
      }
    }
  } else {
    const rows = codexRows(w, h, U);
    // Said once, at the top: the three roles behave the same whichever family they belong to.
    ctx.globalAlpha = 0.6;
    fitWrite(ctx, say(UI.roleLine), w / 2, rows[0].y - 14 * U, 10 * U, 600, 'center',
      Black, w - 40 * U);
    ctx.globalAlpha = 1;

    for (const r of rows) {
      const fam = r.family ? Families[r.key] : null;
      const k = fam ? null : Kinds[r.key];

      ctx.strokeStyle = Black;
      ctx.lineWidth = 1.5 * U;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); boxPath(ctx, r.x, r.y, r.w, r.h, 9 * U); ctx.stroke();
      ctx.globalAlpha = 1;

      const nameAt = r.y + Math.min(24 * U, r.h * 0.26);
      const nameSize = Math.min(17 * U, r.h * 0.24);
      const feet = r.y + r.h - 12 * U;

      if (fam) {
        // all three roles, so the shape of the family is seen rather than described
        const mark = Math.min(44, r.h * 0.46) * U;
        Roles.forEach((role, i) => {
          creatureMark(ctx, role, r.x + (26 + i * 30) * U, feet, mark, Black, r.key);
        });
        write(ctx, say(fam.name), r.x + 118 * U, nameAt, nameSize, 800, 'left');

        // what hurts them, in the same words the map uses
        const bits = [];
        const w0 = weakness(r.key);
        const a0 = armour(r.key);
        if (w0) bits.push(`▲ ${say(UI['el_' + w0.element])} ×${w0.much}`);
        if (a0) bits.push(`▼ ${say(UI['el_' + a0.element])} ×${a0.much}`);
        fitWrite(ctx, bits.length ? bits.join('   ') : say(UI.noElement),
          r.x + r.w - 16 * U, nameAt, 11 * U, 800, 'right', Black, r.w * 0.44);

        const under = nameAt + nameSize * 0.7 + 4 * U;
        wrapIn(ctx, say(fam.about), r.x + 118 * U + (r.w - 134 * U) / 2, under,
          r.w - 134 * U, r.y + r.h - 8 * U - under, 11 * U, Black);

      } else {
        const mark = Math.min(46, r.h * 0.46) * U;
        creatureMark(ctx, r.key, r.x + 46 * U, feet, mark, Black);
        write(ctx, say(UI['foe_' + r.key]), r.x + 92 * U, nameAt, nameSize, 800, 'left');

        const bits = [
          `${say(UI.statHealth)} ${k.hp}`,
          `${say(UI.statSpeed)} ${k.speed}`,
          `${say(UI.statBite)} ${k.bite}`,
        ].join('   ·   ');
        fitWrite(ctx, bits, r.x + r.w - 16 * U, nameAt, 10 * U, 600, 'right', Black, r.w * 0.42);

        const under = nameAt + nameSize * 0.7 + 4 * U;
        wrapIn(ctx, about(r.key), r.x + 92 * U + (r.w - 108 * U) / 2, under,
          r.w - 108 * U, r.y + r.h - 8 * U - under, 11 * U, Black);
      }
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
    ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 16 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 16 * U); ctx.stroke();

    sigil(ctx, key, box.x + 46 * U, box.y + 44 * U, 34 * U, Black);
    write(ctx, say(sp.name), box.x + 76 * U, box.y + 34 * U, 22 * U, 800, 'left');
    ctx.font = `800 ${22 * U}px ${Face}`;
    elementTag(ctx, key, box.x + 76 * U + ctx.measureText(say(sp.name)).width + 12 * U,
      box.y + 34 * U, U);
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

/**
 * One of the three boards, opened.
 *
 * The same frame for all three, and a different list inside it. Everything below the heading is
 * clipped and shifted, because two of the three have more in them than fits.
 */
function board(ctx, data, w, h, U, show) {
  const key = show.board;
  const shape = boardShape(data, key);
  const p = boardPanel(w, h, U, shape);
  const rows = boardRows(w, h, U, shape.many, shape.tall);
  const up = show.boardScroll || 0;

  ctx.fillStyle = 'rgba(236,231,220,0.9)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = Pale;
  ctx.beginPath(); boxPath(ctx, p.box.x, p.box.y, p.box.w, p.box.h, 16 * U); ctx.fill();
  ctx.strokeStyle = Black;
  ctx.lineWidth = 3 * U;
  ctx.beginPath(); boxPath(ctx, p.box.x, p.box.y, p.box.w, p.box.h, 16 * U); ctx.stroke();

  write(ctx, say(key === 'jobs' ? UI.boardJobs : key === 'week' ? UI.boardWeek
    : key === 'feats' ? UI.boardFeats : UI.boardNews),
    p.box.x + 22 * U, p.head - 8 * U, 18 * U, 800, 'left');

  // the way out
  {
    const c = p.close;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2, r = c.w * 0.26;
    ctx.globalAlpha = show.overMenu === 'boardClose' ? 1 : 0.6;
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(p.box.x, p.top - 6 * U, p.box.w, p.foot - p.top + 6 * U);
  ctx.clip();
  ctx.translate(0, -up);

  /** One row of a list, with a press on the end when there is something to take. */
  const row = (r, name, at, need, done, paid, prize, lit) => {
    ctx.strokeStyle = Black;
    ctx.lineWidth = (done && !paid ? 3 : 1.5) * U;
    ctx.globalAlpha = paid ? 0.32 : done ? 1 : 0.55;
    ctx.beginPath(); boxPath(ctx, r.x, r.y, r.w, r.h, 11 * U); ctx.stroke();

    const press = boardTake(r, U);
    const room = (done && !paid ? press.x - 10 * U : r.x + r.w - 12 * U) - (r.x + 14 * U);
    fitWrite(ctx, name, r.x + 14 * U, r.y + 22 * U, 12 * U, 800, 'left', Black, room);

    if (need > 1 || at < need) {
      const bw = room * 0.6;
      ctx.fillStyle = 'rgba(13,12,11,0.14)';
      ctx.fillRect(r.x + 14 * U, r.y + 38 * U, bw, 6 * U);
      ctx.fillStyle = Black;
      ctx.fillRect(r.x + 14 * U, r.y + 38 * U, bw * Math.min(1, at / need), 6 * U);
      ctx.globalAlpha = paid ? 0.32 : 0.75;
      write(ctx, `${at} / ${need}`, r.x + 20 * U + bw, r.y + 41 * U, 10 * U, 700, 'left');
      ctx.globalAlpha = paid ? 0.32 : 1;
    }

    if (paid) {
      write(ctx, say(UI.dailyDone), r.x + r.w - 14 * U, r.y + r.h / 2, 11 * U, 800, 'right');
    } else if (done) {
      ctx.fillStyle = lit ? Black : Pale;
      ctx.beginPath(); boxPath(ctx, press.x, press.y, press.w, press.h, 9 * U); ctx.fill();
      ctx.strokeStyle = Black;
      ctx.lineWidth = 2.4 * U;
      ctx.beginPath(); boxPath(ctx, press.x, press.y, press.w, press.h, 9 * U); ctx.stroke();
      write(ctx, say(UI.dailyTake), press.x + press.w / 2, press.y + press.h / 2,
        12 * U, 800, 'center', lit ? Pale : Black);
    } else if (prize) {
      ctx.font = `800 ${12 * U}px ${Face}`;
      const pw = ctx.measureText(String(prize.gems)).width;
      gem(ctx, r.x + r.w - 16 * U - pw - 11 * U, r.y + r.h / 2, 7 * U, Black, Pale);
      write(ctx, String(prize.gems), r.x + r.w - 14 * U, r.y + r.h / 2, 12 * U, 800, 'right');
    }
    ctx.globalAlpha = 1;
  };

  if (key === 'week') {
    const w0 = week(data);
    row(rows[0], say(UI.weekRun, w0.run, w0.of), w0.run, w0.of, w0.due, false,
      { gems: w0.pays.gems }, show.overMenu === 'week');

    // Seven marks under it, one a day. The bar in the row says how far along you are; these say
    // what the promise actually is - seven of them, and then it starts over.
    const r0 = rows[0];
    const gap = Math.min(46 * U, (r0.w - 20 * U) / Week);
    const left = r0.x + r0.w / 2 - (gap * (Week - 1)) / 2;
    const top = r0.y + r0.h + 34 * U;
    for (let i = 0; i < Week; i++) {
      const dx = left + i * gap;
      const on = i < w0.run;
      const box = { x: dx - 15 * U, y: top - 15 * U, w: 30 * U, h: 30 * U };
      cutBox(ctx, box, U, {
        cut: { tl: 7 * U, br: 7 * U },
        fill: on ? Black : 'rgba(13,12,11,0)',
        line: Black,
        width: on ? 2 : 1.4,
      });
      ctx.globalAlpha = on ? 1 : 0.45;
      write(ctx, String(i + 1), dx, top, 12 * U, 800, 'center', on ? Pale : Black);
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 0.6;
    fitWrite(ctx, say(UI.weekTell), r0.x + r0.w / 2, top + 34 * U, 11 * U, 600, 'center',
      Black, r0.w - 20 * U);
    ctx.globalAlpha = 1;

  } else if (key === 'jobs') {
    dailyJobs(data).forEach((j, i) => {
      row(rows[i], say(j.job.name), j.at, j.need, j.done, j.paid,
        { gems: j.pays.gems }, show.overMenu === 'daily:' + j.key);
    });

  } else if (key === 'feats') {
    feats(data).forEach((f, i) => {
      row(rows[i], say(f.feat.name), f.at, f.need, f.done, f.paid,
        { gems: f.gems }, show.overMenu === 'feat:' + f.key);
    });

  } else {
    News.forEach((n, i) => {
      const r = rows[i];
      ctx.strokeStyle = Black;
      ctx.lineWidth = 1.5 * U;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); boxPath(ctx, r.x, r.y, r.w, r.h, 11 * U); ctx.stroke();
      ctx.globalAlpha = 1;
      write(ctx, say(n.title), r.x + 14 * U, r.y + 22 * U, 13 * U, 800, 'left');
      ctx.globalAlpha = 0.5;
      write(ctx, n.at, r.x + r.w - 14 * U, r.y + 22 * U, 10 * U, 700, 'right');
      ctx.globalAlpha = 1;
      wrapIn(ctx, say(n.body), r.x + r.w / 2, r.y + 32 * U, r.w - 28 * U, r.h - 42 * U, 11 * U, Black);
    });
  }

  ctx.restore();

  // more below?
  if (boardReach(w, h, U, shape.many, shape.tall) > 0) {
    const atFoot = up >= boardReach(w, h, U, shape.many, shape.tall) - 2;
    ctx.globalAlpha = atFoot ? 0.2 : 0.6;
    ctx.strokeStyle = Black;
    ctx.lineWidth = 2.6 * U;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 9 * U, p.foot + 2 * U);
    ctx.lineTo(w / 2, p.foot + 10 * U);
    ctx.lineTo(w / 2 + 9 * U, p.foot + 2 * U);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// --- the whole screen ---------------------------------------------------------------------------

export function menu(ctx, data, w, h, show, dpr = 1) {
  spyOpen();
  const U = unit(dpr);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f6f3ec');
  sky.addColorStop(0.6, Pale);
  sky.addColorStop(1, '#cfc7b6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // --- the account, on a black band across the top
  {
    const t = topBand(w, h, U);
    cutBox(ctx, t.box, U, { cut: { br: t.cut }, fill: Black });

    // the keep this whole place is named after, in its own little frame
    {
      const a = t.avatar;
      cutBox(ctx, a, U, { cut: { tl: 7 * U, br: 7 * U }, line: Pale, width: 2 });
      keepMark(ctx, a.x + a.w / 2, a.y + a.h / 2, a.h * 0.62, Pale, Black);
    }

    const need = needFor(data.level);
    const barW = Math.max(60 * U, t.barEnd - t.textX);
    write(ctx, say(UI.level, data.level), t.textX, t.box.h * 0.32, 15 * U, 800, 'left', Pale);

    // The experience bar lives on the band now, so its track has to be a lightened black rather
    // than a darkened pale - on the band the old track was invisible.
    const barY = t.box.h * 0.52;
    spyMark(ctx, '[xp bar]', t.textX, barY, barW, 7 * U);
    ctx.fillStyle = 'rgba(246,243,236,0.22)';
    ctx.fillRect(t.textX, barY, barW, 7 * U);
    ctx.fillStyle = Pale;
    ctx.fillRect(t.textX, barY, barW * Math.max(0, Math.min(1, data.xp / need)), 7 * U);

    gearMark(ctx, t.gear, U, Pale, show.overMenu === 'openSettings');

    // What the next level opens, on the band under the bar. It used to sit just below the band,
    // which is exactly where the row of boards now begins - it was being drawn underneath them.
    const next = nextUnlock(data.level);
    ctx.globalAlpha = 0.55;
    fitWrite(ctx, next ? say(UI.unlockSoon, say(Spells[next.key].name), next.at) : say(UI.allYours),
      t.textX, t.box.h * 0.84, 10 * U, 600, 'left', Pale, barW);
    ctx.globalAlpha = 1;
  }

  // --- the chosen tab
  if (data.tab === 'map') mapTab(ctx, data, w, h, U, show);
  else if (data.tab === 'spells') spellsTab(ctx, data, w, h, U, show);
  else if (data.tab === 'wheel') wheelTab(ctx, data, w, h, U, show);
  else if (data.tab === 'hero') heroTab(ctx, data, w, h, U, show);
  else codexTab(ctx, data, w, h, U, show);

  // --- the tabs, as one strip of five
  //
  // Edge to edge, with only the outer corners rounded, so the row reads as a single thing with
  // five parts rather than five objects adrift at the foot of the screen. What keeps them apart
  // is the line they share, and the chosen one still lifts clear of the row entirely.
  {
    // The strip is solid and everything scrolls under it, so it is a layer of its own: without
    // saying so, the tool reported the rewards tab's chest text as colliding with the tab labels
    // it is hidden behind.
    spyLayer();
    const bar = navBar(w, h, U);
    const first = bar[0];
    const last = bar[bar.length - 1];
    const strip = { x: first.x, y: first.y, w: last.x + last.w - first.x, h: first.h };
    const c = 16 * U;

    cutBox(ctx, strip, U, { cut: { tl: c, br: c }, fill: Black });

    for (const t of bar) {
      const on = data.tab === t.key;
      const over = show.overMenu === 'tab:' + t.key;

      // The chosen one is a pale tab cut out of the strip, narrower at the top like a real one.
      // A filled card that lifted clear of the row read as a sixth object; this reads as the row
      // telling you where you are.
      if (on) {
        const lean = 9 * U;
        const pad = 4 * U;
        ctx.fillStyle = Pale;
        ctx.beginPath();
        ctx.moveTo(t.x + pad + lean, t.y + pad);
        ctx.lineTo(t.x + t.w - pad - lean, t.y + pad);
        ctx.lineTo(t.x + t.w - pad, t.y + t.h - pad);
        ctx.lineTo(t.x + pad, t.y + t.h - pad);
        ctx.closePath();
        ctx.fill();
      }

      const ink = on ? Black : Pale;
      ctx.globalAlpha = on ? 1 : over ? 0.95 : 0.6;
      tabMark(ctx, t.key, t.cx, t.y + t.h * 0.42, 26 * U, ink);
      fitWrite(ctx, say(t.name).toUpperCase(), t.cx, t.y + t.h * 0.78,
        9 * U, 800, 'center', ink, t.w - 8 * U);
      ctx.globalAlpha = 1;
    }
  }

  // --- a board, over everything
  if (show.board) { spyLayer(); board(ctx, data, w, h, U, show); }

  // --- the settings, over everything
  if (show.settings) {
    spyLayer();
    ctx.fillStyle = 'rgba(236,231,220,0.86)';
    ctx.fillRect(0, 0, w, h);

    const sp = settingsPanel(w, h, U);
    ctx.fillStyle = Pale;
    ctx.beginPath(); boxPath(ctx, sp.box.x, sp.box.y, sp.box.w, sp.box.h, 16 * U); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 3 * U;
    ctx.beginPath(); boxPath(ctx, sp.box.x, sp.box.y, sp.box.w, sp.box.h, 16 * U); ctx.stroke();

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
      ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 10 * U); ctx.fill();
      ctx.strokeStyle = Black;
      ctx.lineWidth = 1.6 * U;
      ctx.globalAlpha = lit ? 1 : 0.4;
      ctx.beginPath(); boxPath(ctx, box.x, box.y, box.w, box.h, 10 * U); ctx.stroke();
      ctx.globalAlpha = 1;
      const ink = lit ? Pale : Black;
      write(ctx, label, box.x + 16 * U, box.y + box.h / 2, 12 * U, 700, 'left', ink);
      write(ctx, value, box.x + box.w - 16 * U, box.y + box.h / 2, 15 * U, 800, 'right', ink);
    };
    row(sp.lang, say(UI.language), LanguageNames[language()], show.overMenu === 'lang');
    row(sp.sound, say(UI.sound), say(data.muted ? UI.off : UI.on), show.overMenu === 'sound');
    row(sp.music, say(UI.music), say(data.music === false ? UI.off : UI.on), show.overMenu === 'music');
  }

  spyShut();
}

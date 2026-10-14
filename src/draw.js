// Everything you see. Nothing here decides anything.
//
// One rule holds the whole look together: there are exactly two inks. A pale sky and pure black.
// Nothing is shaded, nothing is textured, nothing is coloured - a thing is either light or it is
// a shape cut out of the light. That is a style rather than a shortage, which matters, because
// across four games the absence of artwork was something to hide. A silhouette has nothing to
// hide: it is a shape, and a shape drawn with care is finished.
//
// Figures are drawn standing even though they walk in from every side, because a shape seen from
// above is a blob and a shape seen from the side is a creature. Far ones small and high, near
// ones large and low, everything drawn back to front.
//
// The middle is kept deliberately low. A tall thing in the centre of a ring hides whatever walks
// up behind it, and when they come from all sides that is half the board - which is exactly what
// the first version did with a tower. A waist-high wall with a figure inside it reads as a place
// worth defending without standing in front of anything.

import {
  Arena, Wall, Reach, StageWaves, placeOf, Spells, Passives,
  BoostsPerTier, MostEvos, LoadoutSize, Always, spellKeys, statsOf, carrying, describe,
} from './rules.js';
import { UnlockAt, nextUnlock } from './spells.js';
import { say, UI, LanguageNames, Languages, language } from './text.js';
import { needFor, Speeds, starsFor, nextStarAt, stageOpen, furthestStage, starsAt } from './meta.js';

const Black = '#0d0c0b';
const Pale = '#ece7dc';
export const Face = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Where the arena sits and how flat it is drawn.
 *
 * The squash adapts. On a wide screen a half-flattened circle reads as ground seen at an angle;
 * on a phone held upright the same circle is limited by the width and leaves two thirds of the
 * screen empty above and below it. Rounding it out on a tall screen uses that height without
 * moving anything in the world - the positions are unchanged, only how they are projected.
 */
export function stage(w, h) {
  const scale = Math.min(w / (Arena * 2.35), h / (Arena * 1.62));
  const room = h / (Arena * 2 * scale);
  const squash = Math.max(0.5, Math.min(0.92, room * 0.62));
  return { cx: w / 2, cy: h * (squash > 0.7 ? 0.5 : 0.545), scale, squash };
}

const place = (S, x, y) => [S.cx + x * S.scale, S.cy + y * S.scale * S.squash];
const depth = (y) => 0.66 + ((y + Arena) / (Arena * 2)) * 0.62;

export function write(ctx, text, x, y, size, weight = 600, align = 'left', colour = Black) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${Face}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/**
 * Writes text that fits, shrinking it rather than letting it run past where it was allowed.
 *
 * A phone tile is a third the width of a desktop one and the words in it are the same words, so
 * a size chosen for one runs off the other - "Magic Bolt" came out through the side of its box.
 */
export function fitWrite(ctx, text, x, y, px, weight, align, colour, room) {
  ctx.font = `${weight} ${Math.round(px)}px ${Face}`;
  const wide = ctx.measureText(text).width;
  write(ctx, text, x, y, wide > room ? Math.max(8, px * room / wide) : px, weight, align, colour);
}

/**
 * Wrapped writing that fits a box, by shrinking until it does.
 *
 * `wrap` centres a block on a point and will happily run out of the bottom of whatever it is in -
 * which is what the codex did the moment seven rows had to share the height six used to. This one
 * is told how much room it has and finds a size that lives in it.
 */
export function wrapIn(ctx, text, x, top, width, height, most, colour) {
  for (let size = most; size >= most * 0.45; size -= Math.max(0.5, most * 0.06)) {
    const lead = size * 1.34;
    ctx.font = `500 ${size}px ${Face}`;
    let lines = 1, line = '';
    for (const word of String(text).split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > width && line) { lines += 1; line = word; }
      else line = next;
    }
    if (lines * lead <= height || size <= most * 0.5) {
      wrap(ctx, text, x, top + height / 2, width, size, lead, colour);
      return;
    }
  }
}

export function wrap(ctx, text, x, y, width, size, lead, colour) {
  ctx.fillStyle = colour;
  ctx.font = `500 ${size}px ${Face}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > width && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  const top = y - ((lines.length - 1) * lead) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, top + i * lead));
}

// --- the scenery ------------------------------------------------------------------------------

const Trees = (() => {
  let s = 20260413;
  const roll = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [];
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2 + (roll() - 0.5) * 0.07;
    // Nothing in the near arc: a tree at the front of the ring is drawn biggest, lands across the
    // writing and stands where the creatures walk in. An open near edge reads as a clearing.
    const front = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (front < 0.72) continue;
    out.push({
      a,
      r: Arena * (1.17 + roll() * 0.12),
      h: 40 + roll() * 74,
      lean: (roll() - 0.5) * 0.5,
      kind: roll() < 0.3 ? 'rock' : 'tree',
      limbs: [roll(), roll(), roll()],
    });
  }
  return out;
})();

function tree(ctx, S, t) {
  const x = Math.cos(t.a) * t.r, y = Math.sin(t.a) * t.r;
  const [px, py] = place(S, x, y);
  const k = depth(y) * S.scale;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(k, k);
  ctx.fillStyle = Black;
  ctx.strokeStyle = Black;
  ctx.lineCap = 'round';

  if (t.kind === 'rock') {
    const h = t.h * 0.3;
    ctx.beginPath();
    ctx.moveTo(-h * 0.9, 0); ctx.lineTo(-h * 0.5, -h * 0.85);
    ctx.lineTo(h * 0.2, -h); ctx.lineTo(h * 0.95, -h * 0.3);
    ctx.lineTo(h * 0.8, 0);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.rotate(t.lean * 0.2);
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(t.lean * t.h * 0.3, -t.h); ctx.stroke();
    ctx.lineWidth = 3;
    t.limbs.forEach((v, i) => {
      const at = -t.h * (0.45 + i * 0.2);
      const side = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(t.lean * -at * 0.3, at);
      ctx.lineTo(t.lean * -at * 0.3 + side * (14 + v * 20), at - (10 + v * 20));
      ctx.stroke();
    });
  }
  ctx.restore();
}

// --- the keep ---------------------------------------------------------------------------------

const Stones = 34;

/**
 * Half the wall: the far half drawn before the wizard, the near half after.
 *
 * Stones fall off it as it is broken. The bar at the top says the same thing as a number, but the
 * wall is where you are already looking - a gap in the ring is the only reading of "this is going
 * badly" that arrives without being looked for.
 */
function wallHalf(ctx, S, state, near) {
  const standing = state.wall / state.maxWall;
  ctx.fillStyle = Black;
  for (let i = 0; i < Stones; i++) {
    const a = (i / Stones) * Math.PI * 2;
    if ((Math.sin(a) > 0) !== near) continue;
    // a scattered but repeatable order of collapse, rather than a tidy arc vanishing
    if (((i * 7919) % Stones) / Stones > standing) continue;

    const x = Math.cos(a) * Wall, y = Math.sin(a) * Wall;
    const [px, py] = place(S, x, y);
    const k = depth(y) * S.scale;
    // Low. It is a thing to stand behind, not a thing to hide behind - the point of this middle
    // is that nothing in it blocks the view of what is walking up.
    const tall = (i % 2 ? 19 : 13) * k;
    const wide = 15 * k;
    ctx.beginPath();
    ctx.roundRect(px - wide / 2, py - tall, wide, tall + 3 * k, 2 * k);
    ctx.fill();
  }
}

function platform(ctx, S) {
  const [px, py] = place(S, 0, 0);
  const shade = ctx.createRadialGradient(px, py, 0, px, py, Wall * 1.9 * S.scale);
  shade.addColorStop(0, 'rgba(13,12,11,0.2)');
  shade.addColorStop(1, 'rgba(13,12,11,0)');
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(1, S.squash);
  ctx.fillStyle = shade;
  ctx.beginPath(); ctx.arc(0, 0, Wall * 1.9 * S.scale, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(13,12,11,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, Wall * S.scale, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/**
 * The wizard.
 *
 * A robe, a hat and a staff, and no face - which is the whole trick of a silhouette: leave out
 * what cannot be read and nobody looks for it. The staff comes up when something is cast, so the
 * figure is visibly the cause of what happens rather than something standing next to it.
 */
function wizard(ctx, S, state) {
  const [px, py] = place(S, 0, 0);
  // He is the hero of the picture and he was smaller than the things attacking him, which read
  // as a figurine someone had left on the platform.
  const k = S.scale * 1.55;
  const sway = Math.sin(state.t * 1.6) * 1.2;
  const lift = state.cast;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(k, k);
  ctx.fillStyle = Black;
  ctx.strokeStyle = Black;
  ctx.lineCap = 'round';

  // the robe, wide at the hem
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.quadraticCurveTo(-15, -40, -10, -62);
  ctx.lineTo(10, -62);
  ctx.quadraticCurveTo(15, -40, 24, 0);
  ctx.closePath();
  ctx.fill();

  // head, then the hat: a long leaning cone with a kink in it
  ctx.beginPath(); ctx.arc(0, -70, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-17, -76);
  ctx.quadraticCurveTo(-6, -104, 10 + sway, -124);
  ctx.quadraticCurveTo(2, -98, 17, -76);
  ctx.closePath();
  ctx.fill();

  // the staff arm, which rises as a spell goes off
  const hand = -52 - lift * 22;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(8, -58); ctx.lineTo(26, hand); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(26, hand + 34); ctx.lineTo(26, hand - 44); ctx.stroke();
  ctx.beginPath(); ctx.arc(26, hand - 48, 7 + lift * 7, 0, Math.PI * 2); ctx.fill();
  if (lift > 0.1) {
    ctx.globalAlpha = lift;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * Math.PI * 2;
      const out = (i % 2 ? 7 : 19) * (0.5 + lift);
      const fx = 26 + Math.cos(t) * out, fy = hand - 48 + Math.sin(t) * out;
      i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// --- the creatures ----------------------------------------------------------------------------

/**
 * One creature's outline, drawn at the origin at unit scale.
 *
 * Pulled out of `figure` so the menu can draw the same shapes without a fight running behind
 * them. Two copies of a silhouette is two copies that stop matching the first time one is
 * changed, and the codex exists precisely to show you what you are about to meet.
 */
/**
 * One creature, in the game's own units: feet on the line at y = 0, head somewhere above it.
 *
 * `key` is the ROLE - walker, runner, brute - or a boss's own name. `family` says what kind of
 * thing it is. The three bosses have no family and are drawn as themselves; everything else is
 * drawn by its family, with the role changing the proportions inside it.
 */
export function body(ctx, key, swing = 0, colour = Black, family = 'folk') {
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';

  if (family && family !== 'folk' && (key === 'walker' || key === 'runner' || key === 'brute')) {
    if (family === 'swarm') return swarmBody(ctx, key, swing);
    if (family === 'spider') return spiderBody(ctx, key, swing);
    if (family === 'wurm') return wurmBody(ctx, key, swing);
  }

if (key === 'warden') {
  // Bigger than everything, and built so you can tell at a glance it is not one of the crowd:
  // horns, a stoop, and arms that reach the floor.
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-9, -30); ctx.lineTo(-13 + swing * 8, 0);
  ctx.moveTo(9, -30); ctx.lineTo(13 - swing * 8, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, -28); ctx.lineTo(-34, -58); ctx.lineTo(-22, -70);
  ctx.lineTo(22, -70); ctx.lineTo(34, -58); ctx.lineTo(20, -28);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -70, 11, 0, Math.PI * 2); ctx.fill();
  for (const hx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx * 8, -78); ctx.lineTo(hx * 30, -104); ctx.lineTo(hx * 13, -82);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(-30, -58); ctx.lineTo(-36 - swing * 5, -14);
  ctx.moveTo(30, -58); ctx.lineTo(36 + swing * 5, -14);
  ctx.stroke();
} else if (key === 'herald') {
  // Tall and thin where the warden is broad: a raised arm, a long robe, and no legs showing - it
  // should read as something that summons rather than something that swings.
  ctx.beginPath();
  ctx.moveTo(-26, 2); ctx.lineTo(-13, -56); ctx.lineTo(13, -56); ctx.lineTo(26, 2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -68, 10, 0, Math.PI * 2); ctx.fill();
  // the crown, three spikes
  for (const hx of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx * 9 - 3, -76); ctx.lineTo(hx * 11, -96); ctx.lineTo(hx * 9 + 3, -76);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-14, -52); ctx.lineTo(-30 - swing * 4, -86);
  ctx.moveTo(14, -52); ctx.lineTo(28 + swing * 4, -24);
  ctx.stroke();
  // what the raised hand is holding up
  ctx.beginPath(); ctx.arc(-32 - swing * 4, -94, 7, 0, Math.PI * 2); ctx.fill();

} else if (key === 'shade') {
  // Barely a body: a hood, a torn hem, and arms that trail. The one that comes apart should look
  // like it is already half apart.
  ctx.beginPath();
  ctx.moveTo(-19, 2);
  ctx.lineTo(-12, 8); ctx.lineTo(-6, 0); ctx.lineTo(0, 9); ctx.lineTo(6, 0);
  ctx.lineTo(12, 8); ctx.lineTo(19, 2);
  ctx.lineTo(16, -44);
  ctx.quadraticCurveTo(0, -62, -16, -44);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -52, 11, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-16, -40); ctx.lineTo(-30 - swing * 6, -8);
  ctx.moveTo(16, -40); ctx.lineTo(30 + swing * 6, -8);
  ctx.stroke();

} else if (key === 'brute') {
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-7, -26); ctx.lineTo(-9 + swing * 7, 0);
  ctx.moveTo(7, -26); ctx.lineTo(9 - swing * 7, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-15, -26); ctx.lineTo(-24, -52); ctx.lineTo(-17, -62);
  ctx.lineTo(17, -62); ctx.lineTo(24, -52); ctx.lineTo(15, -26);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -58, 9, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-21, -54); ctx.lineTo(-26 - swing * 4, -24);
  ctx.moveTo(21, -54); ctx.lineTo(26 + swing * 4, -24);
  ctx.stroke();
} else if (key === 'runner') {
  ctx.rotate(-0.16);
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, -22); ctx.lineTo(swing * 13, 0);
  ctx.moveTo(0, -22); ctx.lineTo(-swing * 13, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, -22); ctx.lineTo(-6, -43); ctx.lineTo(6, -43); ctx.lineTo(5, -22);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -48, 6, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -40); ctx.lineTo(-swing * 12, -28);
  ctx.moveTo(0, -40); ctx.lineTo(swing * 12, -28);
  ctx.stroke();
} else {
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -24); ctx.lineTo(swing * 9, 0);
  ctx.moveTo(0, -24); ctx.lineTo(-swing * 9, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, -24); ctx.lineTo(-8, -48); ctx.lineTo(8, -48); ctx.lineTo(7, -24);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -54, 7, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-6, -44); ctx.lineTo(-10 - swing * 6, -22);
  ctx.moveTo(6, -44); ctx.lineTo(10 + swing * 6, -22);
  ctx.stroke();
}

}

/**
 * The swarm: wings, and nothing on the ground.
 *
 * Drawn clear of the line the others stand on, because that is the whole read - at a glance you
 * should know this one is in the air. The wings beat with the same `swing` the others walk with.
 */
function swarmBody(ctx, key, swing) {
  const big = key === 'brute' ? 1.32 : key === 'runner' ? 0.72 : 1;
  const lift = -30 - (key === 'runner' ? 10 : 0);
  const beat = 0.45 + Math.abs(swing) * 0.55;

  ctx.save();
  ctx.translate(0, lift);
  ctx.scale(big, big);

  // the wings, one pair, opening and closing
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 5, -6);
    ctx.quadraticCurveTo(side * 30, -14 - beat * 16, side * 34, 2 - beat * 10);
    ctx.quadraticCurveTo(side * 22, 6, side * 5, 4);
    ctx.closePath();
    ctx.fill();
  }

  // body: two lumps and a head
  ctx.beginPath(); ctx.ellipse(0, 2, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -13, 7, 0, Math.PI * 2); ctx.fill();

  // antennae
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-3, -18); ctx.lineTo(-10, -30);
  ctx.moveTo(3, -18); ctx.lineTo(10, -30);
  ctx.stroke();

  // the tail, which the brute drags longer
  if (key === 'brute') {
    ctx.beginPath(); ctx.ellipse(0, 18, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Spiders: low, wide, and all legs.
 *
 * The body sits barely off the ground and the legs reach further out than anything else in the
 * game is wide, so a field of them reads as a different kind of crowd even in silhouette.
 */
function spiderBody(ctx, key, swing) {
  const big = key === 'brute' ? 1.3 : key === 'runner' ? 0.74 : 1;
  const reach = key === 'runner' ? 1.25 : 1;

  ctx.save();
  ctx.scale(big, big);
  ctx.lineWidth = key === 'brute' ? 4.2 : 3;
  ctx.lineJoin = 'round';

  // four legs a side, each a knee out and a foot down
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const out = (14 + i * 7) * reach;
      const up = -26 + i * 4;
      const wave = Math.sin(swing * Math.PI + i) * 3;
      ctx.beginPath();
      ctx.moveTo(side * 5, -20);
      ctx.lineTo(side * out, up - 8 + wave);
      ctx.lineTo(side * (out + 5), 0);
      ctx.stroke();
    }
  }

  // abdomen and head
  ctx.beginPath(); ctx.ellipse(0, -18, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -30, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  // two fangs
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-4, -26); ctx.lineTo(-6, -18);
  ctx.moveTo(4, -26); ctx.lineTo(6, -18);
  ctx.stroke();
  ctx.restore();
}

/**
 * Wurms: one long body, arched, in segments.
 *
 * No legs and no head to speak of - a line of lumps rising out of the ground and back into it.
 * The arch moves with `swing`, which is what makes it read as crawling rather than lying there.
 */
function wurmBody(ctx, key, swing) {
  const parts = key === 'brute' ? 7 : key === 'runner' ? 4 : 5;
  const fat = key === 'brute' ? 13 : key === 'runner' ? 8 : 10;
  const span = key === 'runner' ? 12 : 13;

  ctx.save();
  for (let i = 0; i < parts; i++) {
    const at = i / (parts - 1);
    const x = (at - 0.5) * span * parts * 0.55;
    const arch = Math.sin(at * Math.PI) * (key === 'brute' ? 34 : 26);
    const ripple = Math.sin(swing * Math.PI + at * 3) * 4;
    const r = fat * (0.6 + 0.4 * Math.sin(at * Math.PI));
    ctx.beginPath();
    ctx.ellipse(x, -r - arch - ripple, r, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // the head end, raised and blunt, with a mouth bitten out of it
  const hx = (0.5 - 0.5) * 0 + (span * parts * 0.55) / 2;
  const hy = -fat - (key === 'brute' ? 10 : 8);
  ctx.beginPath(); ctx.ellipse(hx + fat * 0.5, hy, fat * 0.95, fat * 1.15, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(hx + fat * 1.1, hy - fat * 0.5);
  ctx.lineTo(hx + fat * 1.9, hy - fat * 0.9);
  ctx.moveTo(hx + fat * 1.1, hy + fat * 0.2);
  ctx.lineTo(hx + fat * 1.9, hy + fat * 0.6);
  ctx.stroke();
  ctx.restore();
}

/** A creature standing still, for a list or a card. */
export function creatureMark(ctx, key, x, y, size, colour = Black, family = 'folk') {
  ctx.save();
  ctx.translate(x, y);
  const k = size / 70;
  ctx.scale(k, k);
  body(ctx, key, 0.35, colour, family);
  ctx.restore();
}

function figure(ctx, S, f) {
  const p = placeOf(f);
  const [px, py] = place(S, p.x, p.y);
  const k = depth(p.y) * S.scale * f.size;
  const swing = Math.sin(f.step * (f.key === 'runner' ? 1.7 : 1.2));
  const bob = Math.abs(Math.cos(f.step * 1.2)) * 2;

  ctx.save();
  ctx.translate(px, py);

  ctx.fillStyle = 'rgba(13,12,11,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 0, 16 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();

  // Something slowed gets a ring at its feet. In two inks there is no colour to tint it with, and
  // a mark on the ground is read without being explained.
  if (f.chill > 0) {
    ctx.strokeStyle = Black;
    ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.ellipse(0, 0, 21 * k, 7 * k, 0, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.scale(k, k);
  if (f.hurt > 0) ctx.translate(Math.cos(f.a) * f.hurt * 4, Math.sin(f.a) * f.hurt * 2);
  ctx.translate(0, -bob);

  ctx.fillStyle = Black;
  ctx.strokeStyle = Black;
  ctx.lineCap = 'round';

  body(ctx, f.key, swing, Black, f.family);

  ctx.restore();
}

/**
 * Fire and storms left lying about.
 *
 * Under the feet of everything, because they are on the floor - drawn over the top they read as
 * a lid rather than as ground, and the crowd walking through them is half of what makes them
 * worth taking.
 */
function grounds(ctx, S, state) {
  for (const g of state.grounds) {
    const k = Math.max(0, g.life / g.max);
    const [gx, gy] = place(S, g.x, g.y);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, S.squash);
    if (g.kind === 'fire') {
      // Tongues and nothing else. Drawn over a filled disc it read as a puddle - a flat shape on
      // the floor is a hole, and no amount of flicker around the edge of a hole makes it a fire.
      ctx.fillStyle = Black;
      ctx.globalAlpha = 0.1 * k;
      ctx.beginPath(); ctx.arc(0, 0, g.r * S.scale * 0.9, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2 + g.x * 0.013;
        const out = g.r * S.scale * (0.35 + 0.6 * Math.abs(Math.sin(state.t * 8 + i * 1.7)));
        const foot = out * 0.42;
        ctx.globalAlpha = 0.45 + k * 0.55;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * out, Math.sin(a) * out);
        ctx.quadraticCurveTo(
          Math.cos(a + 0.26) * foot, Math.sin(a + 0.26) * foot,
          Math.cos(a + 0.1) * foot * 0.3, Math.sin(a + 0.1) * foot * 0.3);
        ctx.quadraticCurveTo(
          Math.cos(a - 0.26) * foot, Math.sin(a - 0.26) * foot,
          Math.cos(a) * out, Math.sin(a) * out);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = Black;
      ctx.globalAlpha = 0.25 + k * 0.4;
      ctx.lineWidth = 3 * S.scale;
      ctx.setLineDash([14 * S.scale, 12 * S.scale]);
      ctx.lineDashOffset = state.t * -70;
      ctx.beginPath(); ctx.arc(0, 0, g.r * S.scale, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

// --- the spells -------------------------------------------------------------------------------

/** How high above the ground a spell flies, so a bolt is never mistaken for something on it. */
const Flight = 58;

function spellFx(ctx, S, state) {
  ctx.fillStyle = Black;
  ctx.strokeStyle = Black;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const up = Flight * S.scale * S.squash;

  for (const e of state.fx) {
    const k = Math.max(0, e.life / e.max);

    if (e.kind === 'nova' || e.kind === 'burst' || e.kind === 'frost') {
      const grow = e.kind === 'nova' ? 1 - k : 1;
      const [ex, ey] = place(S, e.x, e.y);
      ctx.globalAlpha = k;
      ctx.lineWidth = (e.kind === 'frost' ? 3 : 6) * S.scale * k;
      ctx.beginPath();
      ctx.ellipse(ex, ey - up, e.r * grow * S.scale, e.r * grow * S.scale * S.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      // frost throws spikes instead of a clean ring, so the two bursts read apart at a glance
      if (e.kind === 'frost') {
        ctx.lineWidth = 3 * S.scale;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const [ax, ay] = place(S, e.x + Math.cos(a) * e.r * 0.55, e.y + Math.sin(a) * e.r * 0.55);
          const [bx, by] = place(S, e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r);
          ctx.beginPath(); ctx.moveTo(ax, ay - up); ctx.lineTo(bx, by - up); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

    } else if (e.kind === 'chain') {
      ctx.globalAlpha = k;
      ctx.lineWidth = 4 * S.scale;
      ctx.beginPath();
      for (let i = 0; i < e.points.length - 1; i++) {
        const [ax, ay] = place(S, e.points[i].x, e.points[i].y);
        const [bx, by] = place(S, e.points[i + 1].x, e.points[i + 1].y);
        ctx.moveTo(ax, ay - up);
        // three kinks, so it reads as lightning and not as a ruler
        for (let j = 1; j <= 3; j++) {
          const t = j / 4;
          const jitter = (j % 2 ? 1 : -1) * 13 * S.scale;
          ctx.lineTo(ax + (bx - ax) * t + jitter, ay + (by - ay) * t - up + jitter * 0.5);
        }
        ctx.lineTo(bx, by - up);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

    } else if (e.kind === 'beam') {
      ctx.globalAlpha = k;
      const [ax, ay] = place(S, Math.cos(e.a) * Wall, Math.sin(e.a) * Wall);
      const [bx, by] = place(S, Math.cos(e.a) * Arena * 1.25, Math.sin(e.a) * Arena * 1.25);
      ctx.lineWidth = e.wide * S.scale * k;
      ctx.beginPath(); ctx.moveTo(ax, ay - up); ctx.lineTo(bx, by - up); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // --- things still in the air
  for (const b of state.shots) {
    const [bx, by] = place(S, b.x, b.y);
    const high = (Flight + (b.z || 0)) * S.scale * S.squash;
    const size = (b.blast > 0 ? 9 : 5) * S.scale;
    ctx.beginPath(); ctx.arc(bx, by - high, size, 0, Math.PI * 2); ctx.fill();
    // a meteor gets a tail and a mark where it will land, or it reads as a dot hanging in the sky
    if (b.falls) {
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(bx, by - high); ctx.lineTo(bx, by - high - 46 * S.scale);
      ctx.stroke();
      ctx.lineWidth = 2 * S.scale;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(bx, by, b.blast * S.scale, b.blast * S.scale * S.squash, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // --- the orbiting blades
  if (state.kit.blade) {
    const st = statsOf(state, 'blade');
    for (let n = 0; n < st.count; n++) {
      const at = state.bladeAt + (n / st.count) * Math.PI * 2;
      const bx = Math.cos(at) * st.ring, by = Math.sin(at) * st.ring;
      const [px, py] = place(S, bx, by);
      const k = depth(by) * S.scale;
      ctx.save();
      ctx.translate(px, py - up);
      ctx.rotate(at * 3);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const out = (i % 2 ? 9 : 22) * k;
        i ? ctx.lineTo(Math.cos(a) * out, Math.sin(a) * out) : ctx.moveTo(Math.cos(a) * out, Math.sin(a) * out);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * A star. Filled when earned, outlined when not.
 *
 * In two inks there is no gold, so what carries it is solid against hollow - which also means a
 * row of them reads at a glance from across a phone.
 */
/**
 * A coin, for gold.
 *
 * Two inks, so it cannot be yellow and has to be a shape instead: a disc with a ring bitten out
 * of it. At the sizes this appears at - beside a number, on a wedge - the ring is what stops it
 * reading as a full stop.
 */
export function coin(ctx, x, y, r, colour, back) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = colour; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = back; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = colour; ctx.fill();
  ctx.restore();
}

/**
 * A gem.
 *
 * A cut stone rather than another diamond: a rune is already a plain rhombus, and at the sizes
 * these appear at - beside a number on a button - two rhombuses would be one shape. This one has
 * a flat table, shoulders, and a point, with the facets bitten out in the other ink.
 */
export function gem(ctx, x, y, r, colour, back) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-r * 0.46, -r * 0.62);
  ctx.lineTo(r * 0.46, -r * 0.62);
  ctx.lineTo(r * 0.92, -r * 0.04);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.92, -r * 0.04);
  ctx.closePath();
  ctx.fill();

  // the facets, cut out rather than drawn on, so the shape still reads when it is tiny
  ctx.strokeStyle = back;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.92, -r * 0.04);
  ctx.lineTo(r * 0.92, -r * 0.04);
  ctx.moveTo(-r * 0.46, -r * 0.62);
  ctx.lineTo(-r * 0.2, -r * 0.04);
  ctx.lineTo(0, r);
  ctx.moveTo(r * 0.46, -r * 0.62);
  ctx.lineTo(r * 0.2, -r * 0.04);
  ctx.stroke();
  ctx.restore();
}

/** A shard: a plain rhombus, chosen because nothing else in the game is one. */
export function shard(ctx, x, y, r, colour) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.66, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.66, y);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.restore();
}

export function star(ctx, x, y, r, filled, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const out = (i % 2 ? r * 0.44 : r);
    i ? ctx.lineTo(Math.cos(a) * out, Math.sin(a) * out) : ctx.moveTo(Math.cos(a) * out, Math.sin(a) * out);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = colour;
    ctx.fill();
  } else {
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1.5, r * 0.13);
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** A row of three, for a stage. */
export function stars(ctx, x, y, r, got, colour) {
  const gap = r * 2.5;
  for (let i = 0; i < 3; i++) star(ctx, x - gap + i * gap, y, r, i < got, colour);
}

/** A small mark for each spell. The same vocabulary of shapes as the field uses. */
export function sigil(ctx, key, x, y, s, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const star = (n, inner, outer) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const o = (i % 2 ? inner : outer) * s;
      i ? ctx.lineTo(Math.cos(a) * o, Math.sin(a) * o) : ctx.moveTo(Math.cos(a) * o, Math.sin(a) * o);
    }
    ctx.closePath();
  };

  if (key === 'bolt') { star(4, 0.14, 0.5); ctx.fill(); }
  else if (key === 'shards') {
    for (const dx of [-0.32, 0, 0.32]) {
      ctx.beginPath();
      ctx.moveTo(dx * s, -0.45 * s); ctx.lineTo(dx * s + 0.1 * s, 0.1 * s);
      ctx.lineTo(dx * s - 0.1 * s, 0.1 * s);
      ctx.closePath(); ctx.fill();
    }
  } else if (key === 'wisp') {
    ctx.beginPath(); ctx.arc(0, 0, 0.26 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 0.46 * s, 0.6, 4.2); ctx.stroke();
  } else if (key === 'fireball') {
    ctx.beginPath();
    ctx.moveTo(0, 0.5 * s);
    ctx.quadraticCurveTo(-0.5 * s, 0.1 * s, -0.12 * s, -0.5 * s);
    ctx.quadraticCurveTo(-0.02 * s, -0.14 * s, 0.22 * s, -0.28 * s);
    ctx.quadraticCurveTo(0.5 * s, 0.14 * s, 0, 0.5 * s);
    ctx.closePath(); ctx.fill();
  } else if (key === 'frost') { star(6, 0.1, 0.5); ctx.stroke(); }
  else if (key === 'lightning') {
    ctx.beginPath();
    ctx.moveTo(0.14 * s, -0.5 * s); ctx.lineTo(-0.22 * s, 0.02 * s); ctx.lineTo(0.04 * s, 0.02 * s);
    ctx.lineTo(-0.1 * s, 0.5 * s); ctx.lineTo(0.26 * s, -0.06 * s); ctx.lineTo(0, -0.06 * s);
    ctx.closePath(); ctx.fill();
  } else if (key === 'laser') {
    ctx.beginPath(); ctx.moveTo(-0.5 * s, 0.22 * s); ctx.lineTo(0.5 * s, -0.22 * s); ctx.stroke();
    ctx.beginPath(); ctx.arc(-0.42 * s, 0.2 * s, 0.12 * s, 0, Math.PI * 2); ctx.fill();
  } else if (key === 'nova') {
    for (const r of [0.22, 0.36, 0.5]) { ctx.beginPath(); ctx.arc(0, 0, r * s, 0, Math.PI * 2); ctx.stroke(); }
  } else if (key === 'meteor') {
    ctx.beginPath(); ctx.arc(0.08 * s, 0.14 * s, 0.24 * s, 0, Math.PI * 2); ctx.fill();
    for (const o of [0, 0.18, -0.18]) {
      ctx.beginPath();
      ctx.moveTo(-0.5 * s + o * s, -0.42 * s); ctx.lineTo(-0.14 * s + o * s, -0.06 * s);
      ctx.stroke();
    }
  } else if (key === 'blade') { star(8, 0.2, 0.5); ctx.fill(); }
  else {
    // Mend is the only passive left: a cross in a ring, which is the one mark here that is not
    // about hurting something.
    ctx.beginPath(); ctx.arc(0, 0, 0.44 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.2 * s, 0); ctx.lineTo(0.2 * s, 0);
    ctx.moveTo(0, -0.2 * s); ctx.lineTo(0, 0.2 * s);
    ctx.stroke();
  }
  ctx.restore();
}

// --- the writing ------------------------------------------------------------------------------

/** Where the three cards sit. Shared with the mouse, so one can never be drawn out of reach. */
/**
 * Where the three cards sit. Shared with the mouse, so one can never be drawn out of reach.
 *
 * Always across, on every screen. They were stacked on a narrow one, which read as a list to
 * scroll rather than three things to weigh against each other - and weighing them against each
 * other is the whole of what a level up is. Everything on a card is sized from the card's own
 * width instead of the screen, so three narrow ones stay three cards.
 */
export function cards(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const pad = 16 * U, gap = 10 * U;
  const cw = Math.min(252 * U, (w - pad * 2 - gap * 2) / 3);
  const ch = Math.min(h * 0.6, cw * 1.3);
  const x0 = w / 2 - (3 * cw + 2 * gap) / 2;
  const y = h / 2 - ch / 2 + 14 * U;
  return [0, 1, 2].map((i) => ({ i, x: x0 + i * (cw + gap), y, w: cw, h: ch }));
}

/**
 * The speed control, top right of a run.
 *
 * Three pills in one outline rather than a single button that cycles, because a cycling button
 * does not say what the other settings are and a player on a phone should not have to tap three
 * times to find out.
 */
export function speedBox(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const bw = 112 * U;
  return { x: w - 22 * U - bw, y: 20 * U, w: bw, h: 30 * U };
}

export function hitSpeed(w, h, px, py, dpr = 1) {
  const b = speedBox(w, h, dpr);
  if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) return null;
  const i = Math.floor(((px - b.x) / b.w) * Speeds.length);
  return Speeds[Math.max(0, Math.min(Speeds.length - 1, i))];
}

/** Language and sound, on the opening screen, under the button that starts a run. */
export function settings(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const b = begins(w, h, dpr);
  const bw = 150 * U, bh = 34 * U, gap = 12 * U;
  const y = Math.min(h - bh - 14 * U, b.y + b.h + 16 * U);
  return {
    lang:  { x: w / 2 - bw - gap / 2, y, w: bw, h: bh },
    sound: { x: w / 2 + gap / 2, y, w: bw, h: bh },
  };
}

export function hitSettings(w, h, px, py, dpr = 1) {
  const r = settings(w, h, dpr);
  for (const [what, box] of Object.entries(r)) {
    if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) return what;
  }
  return null;
}

export function hitCard(w, h, px, py, dpr = 1) {
  for (const c of cards(w, h, dpr)) {
    if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) return c.i;
  }
  return null;
}

/**
 * How much to multiply the writing by.
 *
 * Everything on the panel is in canvas pixels, and a phone's canvas is twice its screen, so text
 * laid out to look right on a desktop comes out half size in the hand. The device ratio is the
 * conversion back, and it is 1 on an ordinary monitor, which is why none of this changes the
 * look there.
 */
function panel(ctx, state, w, h, U, show) {
  // --- experience, right across the top, where it cannot be missed
  const part = Math.max(0, Math.min(1, state.xp / state.need));
  ctx.fillStyle = 'rgba(13,12,11,0.14)';
  ctx.fillRect(0, 0, w, 11 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(0, 0, w * part, 11 * U);
  write(ctx, say(UI.lv, state.level), 22 * U, 34 * U, 20 * U, 800);

  // The stage, and how far through its waves you are. The boss replaces both when it arrives,
  // because at that point there is only one thing worth knowing.
  if (state.boss) {
    write(ctx, say(UI['foe_' + state.boss.key] || UI.warden).toUpperCase(),
      w / 2, 30 * U, 15 * U, 800, 'center');

    // One bar per boss still standing. With a single bar, killing the shade looked like nothing
    // had happened: the bar simply refilled, because `state.boss` had become one of its halves.
    // Two bars say what actually happened without a word.
    const standing = state.foes.filter((f) => f.boss && f.hp > 0);
    const bossW = Math.min(460 * U, w * 0.46);
    const gap = 6 * U;
    const each = (bossW - gap * (standing.length - 1)) / Math.max(1, standing.length);
    standing.forEach((f, i) => {
      const x = w / 2 - bossW / 2 + i * (each + gap);
      ctx.fillStyle = 'rgba(13,12,11,0.15)';
      ctx.fillRect(x, 44 * U, each, 14 * U);
      ctx.fillStyle = Black;
      ctx.fillRect(x, 44 * U, each * Math.max(0, f.hp) / f.maxHp, 14 * U);
      ctx.strokeStyle = Black;
      ctx.lineWidth = 2 * U;
      ctx.strokeRect(x, 44 * U, each, 14 * U);
    });
  } else {
    write(ctx, say(UI.stage, state.stage), w / 2, 32 * U, 24 * U, 800, 'center');
    const onW = Math.min(300 * U, w * 0.3);
    ctx.fillStyle = 'rgba(13,12,11,0.15)';
    ctx.fillRect(w / 2 - onW / 2, 50 * U, onW, 5 * U);
    ctx.fillStyle = Black;
    ctx.fillRect(w / 2 - onW / 2, 50 * U, onW * Math.min(1, state.stageT / StageWaves), 5 * U);
  }
  write(ctx, say(UI.down, state.kills), w - 22 * U, 70 * U, 13 * U, 700, 'right');

  // --- how fast the whole thing runs, in the corner where nothing else is
  {
    const b = speedBox(w, h, U);
    const pills = Speeds.length;
    ctx.strokeStyle = Black;
    ctx.lineWidth = 2 * U;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, b.h / 2); ctx.stroke();
    for (let i = 0; i < pills; i++) {
      const pw = b.w / pills;
      const px = b.x + i * pw;
      const on = Speeds[i] === show.speed;
      if (on) {
        ctx.fillStyle = Black;
        ctx.beginPath(); ctx.roundRect(px + 2 * U, b.y + 2 * U, pw - 4 * U, b.h - 4 * U, (b.h - 4 * U) / 2); ctx.fill();
      }
      write(ctx, `${Speeds[i]}x`, px + pw / 2, b.y + b.h / 2, 12 * U, 800, 'center', on ? Pale : Black);
    }
  }

  const bw = Math.min(240 * U, w * 0.22);
  write(ctx, say(UI.wall), 22 * U, 62 * U, 11 * U, 700);
  ctx.lineWidth = 2 * U;
  ctx.strokeStyle = Black;
  ctx.strokeRect(22 * U, 72 * U, bw, 13 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(22 * U, 72 * U, bw * Math.max(0, state.wall) / state.maxWall, 13 * U);

  // Heat lives under the wall, not under the clock. Stacked in the middle it was a second
  // nameless bar directly below the stage bar, and two anonymous bars one above the other are
  // two bars nobody reads.
  write(ctx, say(UI.cast), 22 * U, 100 * U, 11 * U, 700);
  ctx.fillStyle = 'rgba(13,12,11,0.16)';
  ctx.fillRect(22 * U, 110 * U, bw, 7 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(22 * U, 110 * U, bw * state.heat, 7 * U);

  // --- what you are carrying: the name, what tier it has reached, and how near the next one
  const owned = carrying(state);
  let y = h - 22 * U - (owned.length - 1) * 23 * U;
  write(ctx, say(UI.spells), 22 * U, y - 26 * U, 11 * U, 700);
  for (const key of owned) {
    const kit = state.kit[key];
    write(ctx, say(Spells[key].name), 22 * U, y, 14 * U, 600);
    if (kit.tier > 1) {
      // a filled tag, so a spell that has become something reads differently at a glance
      ctx.fillStyle = Black;
      ctx.beginPath(); ctx.roundRect(126 * U, y - 9 * U, 26 * U, 18 * U, 4 * U); ctx.fill();
      write(ctx, `T${kit.tier}`, 139 * U, y, 11 * U, 800, 'center', Pale);
    }
    // the climb to the next tier, as pips: five of them, then it becomes something
    const done = kit.taken - (kit.tier - 1) * BoostsPerTier;
    const capped = kit.evos.length >= MostEvos;
    for (let i = 0; i < BoostsPerTier; i++) {
      ctx.fillStyle = Black;
      ctx.globalAlpha = capped ? 0.12 : i < done ? 1 : 0.2;
      ctx.beginPath(); ctx.arc(166 * U + i * 12 * U, y, 4 * U, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    y += 23 * U;
  }

  // Only ones the book still knows about. A key that has been taken out of the game can still be
  // sitting in a state object - it was, the moment Might and Haste were removed - and reading a
  // name off it takes the whole frame down.
  const kept = Object.keys(state.passives).filter((k) => Passives[k]);
  let py = h - 22 * U - (kept.length - 1) * 19 * U;
  for (const key of kept) {
    write(ctx, `${say(Passives[key].name)} ${state.passives[key]}`, w - 22 * U, py, 13 * U, 600, 'right');
    py += 19 * U;
  }
}

function picking(ctx, state, w, h, show, U) {
  ctx.fillStyle = 'rgba(236,231,220,0.93)';
  ctx.fillRect(0, 0, w, h);

  const list = cards(w, h, U);
  const top0 = list[0].y;
  write(ctx, say(UI.level, state.level), w / 2, top0 - 52 * U, 32 * U, 800, 'center');
  write(ctx, say(UI.takeOne), w / 2, top0 - 24 * U, 13 * U, 600, 'center');

  for (const r of list) {
    const card = describe(state, state.choices[r.i]);
    if (!card) continue;
    const lit = show.overCard === r.i;
    const top = r.y - (lit ? 8 : 0);
    const cx = r.x + r.w / 2;
    // Everything is a fraction of the card, so a card half the width is a card and not a label.
    const f = r.w;

    if (lit) {
      ctx.fillStyle = Black;
      ctx.beginPath(); ctx.roundRect(r.x, top, r.w, r.h, 0.04 * f); ctx.fill();
    }
    ctx.strokeStyle = Black;
    ctx.lineWidth = (lit ? 3 : card.big ? 4 : 2) * U;
    ctx.beginPath(); ctx.roundRect(r.x, top, r.w, r.h, 0.04 * f); ctx.stroke();

    const ink = lit ? Pale : Black;
    const room = r.w - 0.1 * f;

    if (card.badge) fitWrite(ctx, card.badge.toUpperCase(), cx, top + 0.11 * f, 0.05 * f, 800, 'center', ink, room);
    fitWrite(ctx, card.title, cx, top + 0.235 * f, 0.108 * f, 800, 'center', ink, room);
    sigil(ctx, card.mark, cx, top + 0.5 * f, card.big ? 0.24 * f : 0.2 * f, ink);
    wrap(ctx, card.text, cx, top + 0.83 * f, room, 0.066 * f, 0.09 * f, ink);

    // The one extra line that survives: which other spell lent this. It is not bookkeeping - it
    // is the only place the player is ever told the combinations exist.
    if (card.borrows) {
      fitWrite(ctx, say(UI.withSpell, card.borrows), cx, top + 1.08 * f, 0.05 * f, 600, 'center', ink, room);
    }
  }
  write(ctx, say(UI.tapCard), w / 2, list[0].y + list[0].h + 26 * U, 13 * U, 500, 'center');
}

// --- the loadout screen ------------------------------------------------------------------------

/**
 * Where the ten spells sit on the opening screen.
 *
 * Five across on a wide screen, two across on a tall one. Same list either way, and `hitLoadout`
 * reads the same function, so a tile can never be drawn somewhere it cannot be tapped.
 */
export function tiles(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const tall = h > w * 1.1;
  const cols = tall ? 2 : 5;
  const rows = Math.ceil(spellKeys.length / cols);
  const gap = 12 * U;
  const tw = Math.min(tall ? 300 * U : 200 * U, (w - 48 * U - (cols - 1) * gap) / cols);
  const th = tall ? 74 * U : 96 * U;
  const left = w / 2 - (cols * tw + (cols - 1) * gap) / 2;
  const top = h / 2 - (rows * th + (rows - 1) * gap) / 2 + (tall ? 10 * U : 16 * U);
  // In the order they open, so the locked ones gather at the end and the grid reads as a path
  // rather than a shelf with gaps in it.
  const order = [...spellKeys].sort((a, b) => UnlockAt[a] - UnlockAt[b]);
  return order.map((key, i) => ({
    key,
    x: left + (i % cols) * (tw + gap),
    y: top + Math.floor(i / cols) * (th + gap),
    w: tw, h: th, tall,
  }));
}

/**
 * The stage picker: an arrow either side of the stage you are about to play.
 *
 * Above the loadout rather than on a screen of its own, because choosing the stage and choosing
 * what to take into it are one decision - a later stage is a reason to bring something different.
 */
export function stageBox(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const list = tiles(w, h, dpr);
  const y = list[0].y - 92 * U;
  const r = 24 * U;
  return {
    prev: { x: w / 2 - 130 * U - r, y: y - r, w: r * 2, h: r * 2 },
    next: { x: w / 2 + 130 * U - r, y: y - r, w: r * 2, h: r * 2 },
    at: { x: w / 2, y },
  };
}

export function hitStage(w, h, px, py, dpr = 1) {
  const b = stageBox(w, h, dpr);
  for (const what of ['prev', 'next']) {
    const r = b[what];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return what;
  }
  return null;
}

export function begins(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const list = tiles(w, h, dpr);
  const last = list[list.length - 1];
  return { x: w / 2 - 130 * U, y: Math.min(h - 84 * U, last.y + last.h + 26 * U), w: 260 * U, h: 60 * U };
}

export function hitLoadout(w, h, px, py, dpr = 1) {
  for (const t of tiles(w, h, dpr)) {
    if (px >= t.x && px <= t.x + t.w && py >= t.y && py <= t.y + t.h) return t.key;
  }
  const b = begins(w, h, dpr);
  if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return '@begin';
  return null;
}

/**
 * The opening screen: the account, what it has opened, and what you are taking in.
 *
 * It is the first thing anybody sees, so it has to answer "what is this" before it asks anything.
 * The account bar does that on its own - a number that goes up, with the next spell named next to
 * it, is the whole reason to come back tomorrow stated in one line.
 */
export function loadout(ctx, meta, w, h, show, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f6f3ec');
  sky.addColorStop(0.55, Pale);
  sky.addColorStop(1, '#cfc7b6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const list = tiles(w, h, dpr);
  const headTop = list[0].y - (list[0].tall ? 196 * U : 172 * U);

  fitWrite(ctx, say(UI.title), w / 2, headTop, 34 * U, 800, 'center', Black, w - 48 * U);

  // the account: level, the climb to the next one, and what that one opens
  const need = needFor(meta.level);
  const bw = Math.min(460 * U, w - 48 * U);
  const bx = w / 2 - bw / 2;
  const by = headTop + 28 * U;
  ctx.fillStyle = 'rgba(13,12,11,0.14)';
  ctx.fillRect(bx, by, bw, 9 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, meta.xp / need)), 9 * U);
  const soon = nextUnlock(meta.level);
  write(ctx, say(UI.level, meta.level), bx, by + 24 * U, 13 * U, 800, 'left');
  fitWrite(ctx, soon ? say(UI.unlockSoon, say(Spells[soon.key].name), soon.at) : say(UI.allYours),
    bx + bw, by + 24 * U, 13 * U, 600, 'right', Black, bw * 0.45);
  if (meta.best) write(ctx, say(UI.bestStage, meta.best), w / 2, by + 24 * U, 13 * U, 600, 'center');

  // --- which stage, and what it has been worth so far
  {
    const box = stageBox(w, h, dpr);
    const far = furthestStage(meta);
    const arrow = (r, pointing, on) => {
      ctx.globalAlpha = on ? 1 : 0.18;
      ctx.strokeStyle = Black;
      ctx.lineWidth = 3 * U;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, a = 9 * U;
      // The tip goes the way it points. Written the other way round, the left arrow drew a ">".
      ctx.beginPath();
      ctx.moveTo(cx - pointing * a * 0.5, cy - a);
      ctx.lineTo(cx + pointing * a * 0.5, cy);
      ctx.lineTo(cx - pointing * a * 0.5, cy + a);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    arrow(box.prev, -1, meta.stage > 1);
    arrow(box.next, 1, meta.stage < far);
    write(ctx, say(UI.stage, meta.stage), box.at.x, box.at.y - 6 * U, 28 * U, 800, 'center');
    const got = starsAt(meta, meta.stage);
    stars(ctx, box.at.x, box.at.y + 26 * U, 9 * U, got || 0, Black);
  }

  const room = LoadoutSize - meta.loadout.length;
  write(ctx, room > 0 ? say(UI.chooseMore, room) : say(UI.chooseUpTo, LoadoutSize),
    w / 2, list[0].y - 24 * U, 12 * U, 800, 'center');

  for (const t of list) {
    const open = UnlockAt[t.key] <= meta.level;
    const fixed = t.key === Always;
    const taken = fixed || meta.loadout.includes(t.key);
    const lit = show.overTile === t.key && open && !fixed;
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
    // The fixed slot says so rather than looking like a choice somebody already made for you.
    const under = fixed ? say(UI.always)
      : open ? say(sp.tells)
      : say(UI.opensAt, UnlockAt[t.key]);

    if (t.tall) {
      const fits = t.w - 92 * U;
      sigil(ctx, t.key, t.x + 40 * U, t.y + t.h / 2, 30 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + 76 * U, t.y + 28 * U, 17 * U, 800, 'left', ink, fits);
      fitWrite(ctx, under, t.x + 76 * U, t.y + 50 * U, 11 * U, fixed ? 800 : 500, 'left', ink, fits);
    } else {
      const fits = t.w - 16 * U;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + 30 * U, 30 * U, ink);
      fitWrite(ctx, open ? say(sp.name) : say(UI.locked), t.x + t.w / 2, t.y + 62 * U, 14 * U, 800, 'center', ink, fits);
      fitWrite(ctx, fixed ? say(UI.always) : open ? '' : say(UI.levelledPlain, UnlockAt[t.key]),
        t.x + t.w / 2, t.y + 80 * U, 10 * U, fixed ? 800 : 600, 'center', ink, fits);
    }
    ctx.globalAlpha = 1;
  }

  const b = begins(w, h, dpr);
  const ready = show.overBegin;
  ctx.fillStyle = ready ? Black : 'rgba(13,12,11,0)';
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10 * U); ctx.fill();
  ctx.strokeStyle = Black;
  ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10 * U); ctx.stroke();
  write(ctx, `${say(UI.play)}  ·  ${say(UI.stage, meta.stage)}`, b.x + b.w / 2, b.y + b.h / 2,
    19 * U, 800, 'center', ready ? Pale : Black);

  // --- language and sound, under the button that starts a run
  const set = settings(w, h, dpr);
  const pill = (box, label, value, lit) => {
    ctx.fillStyle = lit ? Black : 'rgba(13,12,11,0)';
    ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, box.h / 2); ctx.fill();
    ctx.strokeStyle = Black;
    ctx.lineWidth = 1.6 * U;
    ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, box.h / 2); ctx.stroke();
    const ink = lit ? Pale : Black;
    write(ctx, label, box.x + 14 * U, box.y + box.h / 2, 10 * U, 700, 'left', ink);
    write(ctx, value, box.x + box.w - 14 * U, box.y + box.h / 2, 13 * U, 800, 'right', ink);
  };
  pill(set.lang, say(UI.language), LanguageNames[language()], show.overSetting === 'lang');
  pill(set.sound, say(UI.sound), say(meta.muted ? UI.off : UI.on), show.overSetting === 'sound');
}

// --- the frame --------------------------------------------------------------------------------

/**
 * What a finished stage paid: experience, gold, and the shards each carried spell earned.
 *
 * On two lines rather than three, because this sits under a star row and over a prompt and the
 * screen is not tall. Shards are named by spell, since a shard that does not say which spell it
 * belongs to is a number with nowhere to go.
 */
function spoils(ctx, won, cx, y, U, room) {
  const gap = 14 * U;
  const exp = say(UI.earned, won.earned);
  const gold = say(UI.earnedGold, won.gold || 0);

  ctx.font = `800 ${16 * U}px ${Face}`;
  const we = ctx.measureText(exp).width;
  const wg = ctx.measureText(gold).width;
  const wide = we + gap + wg + 22 * U;
  const left = cx - wide / 2;

  write(ctx, exp, left, y, 16 * U, 800, 'left');
  coin(ctx, left + we + gap + 8 * U, y, 7 * U, Black, Inks.Pale);
  write(ctx, gold, left + we + gap + 22 * U, y, 16 * U, 800, 'left');

  let at = y;

  // The runes, with the mark beside the writing rather than at the edge of the width the writing
  // is allowed - which is where it sat, alone against the left of the screen.
  const bits = Object.entries(won.shards || {}).filter(([, n]) => n > 0);
  if (bits.length) {
    at += 24 * U;
    const line = bits.map(([k, n]) => `${say(Spells[k].name)} ${n}`).join('  ·  ');
    ctx.font = `700 ${12 * U}px ${Face}`;
    const wl = Math.min(ctx.measureText(line).width, room - 40 * U);
    shard(ctx, cx - wl / 2 - 12 * U, at, 6 * U, Black);
    fitWrite(ctx, line, cx + 6 * U, at, 12 * U, 700, 'center', Black, room - 40 * U);
  }

  // The gems, which are the only thing here a repeat clear will not pay again. Said so, the one
  // time it matters: the first clear of a stage is worth saying out loud.
  if (won.gems > 0) {
    at += 24 * U;
    const words = won.first ? say(UI.gemsFirst, won.gems) : say(UI.gemsAgain, won.gems);
    ctx.font = `800 ${12 * U}px ${Face}`;
    const ww = Math.min(ctx.measureText(words).width, room - 40 * U);
    gem(ctx, cx - ww / 2 - 14 * U, at, 8 * U, Black, Inks.Pale);
    fitWrite(ctx, words, cx + 6 * U, at, 12 * U, 800, 'center', Black, room - 40 * U);
  } else if (won.lift < 1) {
    at += 24 * U;
    ctx.globalAlpha = 0.6;
    fitWrite(ctx, say(UI.gemsSpent, Math.round(won.lift * 100)), cx, at,
      11 * U, 700, 'center', Black, room - 40 * U);
    ctx.globalAlpha = 1;
  }

  return at;
}

export function frame(ctx, w, h, state, show, dpr = 1) {
  const S = stage(w, h);
  const U = Math.max(1, Math.min(2.4, dpr));

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f6f3ec');
  sky.addColorStop(0.55, Pale);
  sky.addColorStop(1, '#cfc7b6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const [sx, sy] = place(S, 0, -Arena * 0.45);
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.42);
  sun.addColorStop(0, 'rgba(255,253,246,0.95)');
  sun.addColorStop(0.45, 'rgba(246,241,230,0.4)');
  sun.addColorStop(1, 'rgba(236,231,220,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(13,12,11,0.08)';
  ctx.lineWidth = 2;
  for (const r of [Reach, Arena * 0.5, Arena * 0.78, Arena]) {
    ctx.beginPath();
    ctx.ellipse(S.cx, S.cy, r * S.scale, r * S.scale * S.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  platform(ctx, S);
  grounds(ctx, S, state);

  const things = [];
  for (const t of Trees) things.push({ y: Math.sin(t.a) * t.r, draw: () => tree(ctx, S, t) });
  for (const f of state.foes) things.push({ y: placeOf(f).y, draw: () => figure(ctx, S, f) });
  things.push({ y: -Wall, draw: () => wallHalf(ctx, S, state, false) });
  things.push({ y: 0, draw: () => wizard(ctx, S, state) });
  things.push({ y: Wall, draw: () => wallHalf(ctx, S, state, true) });
  things.sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();

  spellFx(ctx, S, state);

  for (const p of show.bits) {
    const [bx, by] = place(S, p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = Black;
    ctx.beginPath();
    ctx.ellipse(bx, by - p.z * S.scale, p.size * S.scale, p.size * S.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const f of show.floats) {
    const [fx, fy] = place(S, f.x, f.y);
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6));
    write(ctx, f.text, fx, fy - f.rise, 15 * S.scale + 6, 800, 'center');
    ctx.globalAlpha = 1;
  }

  panel(ctx, state, w, h, U, show);

  if (show.hint && state.t < 9 && state.phase === 'playing') {
    ctx.globalAlpha = Math.min(1, 9 - state.t);
    fitWrite(ctx, say(UI.hint), w / 2, h - 118 * U, 14 * U, 700, 'center', Black, w - 48 * U);
    ctx.globalAlpha = 1;
  }

  if (state.phase === 'picking') picking(ctx, state, w, h, show, U);

  // --- the stage is finished, and scored on how much wall is still standing
  if (state.phase === 'done') {
    ctx.fillStyle = 'rgba(236,231,220,0.93)';
    ctx.fillRect(0, 0, w, h);
    const won = show.won;
    const row = (n) => h / 2 + (n - 2.6) * 34 * U;
    const part = Math.round((Math.max(0, state.wall) / state.maxWall) * 100);
    let foot = row(4.7);

    write(ctx, say(UI.complete, state.stage), w / 2, row(0) - 18 * U, 34 * U, 800, 'center');
    stars(ctx, w / 2, row(1.4), 26 * U, won ? won.stars : 0, Black);
    write(ctx, say(UI.wallLeft, part), w / 2, row(2.9), 16 * U, 600, 'center');

    if (won) {
      const need = nextStarAt(won.stars);
      write(ctx, need === null ? say(UI.allStars) : say(UI.starFor, need),
        w / 2, row(3.7), 13 * U, 500, 'center');
      // Everything the run paid, because currencies that drop silently are currencies the
      // player does not know they have. It reports where it finished, so the lines under it
      // follow rather than being placed at a row that assumed how much there was to say.
      foot = spoils(ctx, won, w / 2, row(4.7), U, w - 48 * U);
      if (won.opened.length) {
        foot += 28 * U;
        fitWrite(ctx, say(UI.unlocked, won.level, won.opened.map((k) => say(Spells[k].name)).join(' + ').toUpperCase()),
          w / 2, foot, 14 * U, 800, 'center', Black, w - 48 * U);
      }
    }
    write(ctx, say(UI.toMenu), w / 2, Math.max(row(6.6), foot + 30 * U), 15 * U, 700, 'center');
  }

  if (state.phase === 'lost') {
    ctx.fillStyle = 'rgba(236,231,220,0.92)';
    ctx.fillRect(0, 0, w, h);
    const row = (n) => h / 2 + (n - 1.6) * 34 * U;

    write(ctx, say(UI.fell), w / 2, row(0) - 18 * U, 40 * U, 800, 'center');
    write(ctx, say(UI.stage, state.stage), w / 2, row(1), 26 * U, 800, 'center');
    const secs = Math.floor(state.t);
    const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    write(ctx, say(UI.runLine, state.level, state.kills, clock), w / 2, row(2), 15 * U, 600, 'center');
    write(ctx, say(UI.retry), w / 2, row(3.4), 15 * U, 700, 'center');
  }
}

export const Inks = { Black, Pale };

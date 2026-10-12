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
  BoostsPerTier, MostEvos, LoadoutSize, spellKeys, statsOf, carrying, describe,
} from './rules.js';
import { UnlockAt, nextUnlock } from './spells.js';
import { needFor } from './meta.js';

const Black = '#0d0c0b';
const Pale = '#ece7dc';
const Face = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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

function write(ctx, text, x, y, size, weight = 600, align = 'left', colour = Black) {
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
function fitWrite(ctx, text, x, y, px, weight, align, colour, room) {
  ctx.font = `${weight} ${Math.round(px)}px ${Face}`;
  const wide = ctx.measureText(text).width;
  write(ctx, text, x, y, wide > room ? Math.max(8, px * room / wide) : px, weight, align, colour);
}

function wrap(ctx, text, x, y, width, size, lead, colour) {
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

  if (f.boss) {
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
  } else if (f.key === 'brute') {
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
  } else if (f.key === 'runner') {
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

/** A small mark for each spell. The same vocabulary of shapes as the field uses. */
function sigil(ctx, key, x, y, s, colour) {
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
    ctx.beginPath(); ctx.arc(0, 0, 0.44 * s, 0, Math.PI * 2); ctx.stroke();
    if (key === 'might') { ctx.beginPath(); ctx.moveTo(-0.16 * s, 0.16 * s); ctx.lineTo(0.16 * s, -0.16 * s); ctx.stroke(); }
    if (key === 'haste') { star(3, 0.1, 0.3); ctx.fill(); }
    if (key === 'reach') { ctx.beginPath(); ctx.arc(0, 0, 0.2 * s, 0, Math.PI * 2); ctx.stroke(); }
    if (key === 'mend') {
      ctx.beginPath();
      ctx.moveTo(-0.2 * s, 0); ctx.lineTo(0.2 * s, 0);
      ctx.moveTo(0, -0.2 * s); ctx.lineTo(0, 0.2 * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- the writing ------------------------------------------------------------------------------

/** Where the three cards sit. Shared with the mouse, so one can never be drawn out of reach. */
/**
 * Where the three cards sit. Shared with the mouse, so one can never be drawn out of reach.
 *
 * On a phone held upright three cards across would be the width of a thumb each, so below a
 * certain width they stack instead. Same three rectangles either way, and the hit test reads
 * the same list, so neither layout can disagree with where the finger lands.
 */
export function cards(w, h, dpr = 1) {
  const U = Math.max(1, Math.min(2.4, dpr));
  const tall = h > w * 1.1;
  if (tall) {
    const cw = Math.min(520 * U, w - 48 * U);
    const ch = 118 * U;
    const gap = 16 * U;
    const top = h / 2 - (3 * ch + 2 * gap) / 2 + 30 * U;
    return [0, 1, 2].map((i) => ({ i, x: w / 2 - cw / 2, y: top + i * (ch + gap), w: cw, h: ch, flat: true }));
  }
  const cw = Math.min(252 * U, (w - 90 * U) / 3 - 20 * U);
  const ch = 268 * U;
  const total = 3 * cw + 2 * 20 * U;
  let x = w / 2 - total / 2;
  return [0, 1, 2].map((i) => {
    const r = { i, x, y: h / 2 - ch / 2 + 20 * U, w: cw, h: ch, flat: false };
    x += cw + 20 * U;
    return r;
  });
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
function panel(ctx, state, w, h, U) {
  // --- experience, right across the top, where it cannot be missed
  const part = Math.max(0, Math.min(1, state.xp / state.need));
  ctx.fillStyle = 'rgba(13,12,11,0.14)';
  ctx.fillRect(0, 0, w, 11 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(0, 0, w * part, 11 * U);
  write(ctx, `LV ${state.level}`, 22 * U, 34 * U, 20 * U, 800);

  // The stage, and how far through its waves you are. The boss replaces both when it arrives,
  // because at that point there is only one thing worth knowing.
  if (state.boss) {
    write(ctx, 'THE WARDEN', w / 2, 30 * U, 15 * U, 800, 'center');
    const bossW = Math.min(460 * U, w * 0.46);
    ctx.fillStyle = 'rgba(13,12,11,0.15)';
    ctx.fillRect(w / 2 - bossW / 2, 44 * U, bossW, 14 * U);
    ctx.fillStyle = Black;
    ctx.fillRect(w / 2 - bossW / 2, 44 * U, bossW * Math.max(0, state.boss.hp) / state.boss.maxHp, 14 * U);
    ctx.strokeStyle = Black;
    ctx.lineWidth = 2 * U;
    ctx.strokeRect(w / 2 - bossW / 2, 44 * U, bossW, 14 * U);
  } else {
    write(ctx, `STAGE ${state.stage}`, w / 2, 32 * U, 24 * U, 800, 'center');
    const onW = Math.min(300 * U, w * 0.3);
    ctx.fillStyle = 'rgba(13,12,11,0.15)';
    ctx.fillRect(w / 2 - onW / 2, 50 * U, onW, 5 * U);
    ctx.fillStyle = Black;
    ctx.fillRect(w / 2 - onW / 2, 50 * U, onW * Math.min(1, state.stageT / StageWaves), 5 * U);
  }
  write(ctx, `${state.kills} DOWN`, w - 22 * U, 34 * U, 13 * U, 700, 'right');

  const bw = Math.min(240 * U, w * 0.22);
  write(ctx, 'WALL', 22 * U, 62 * U, 11 * U, 700);
  ctx.lineWidth = 2 * U;
  ctx.strokeStyle = Black;
  ctx.strokeRect(22 * U, 72 * U, bw, 13 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(22 * U, 72 * U, bw * Math.max(0, state.wall) / state.maxWall, 13 * U);

  // Heat lives under the wall, not under the clock. Stacked in the middle it was a second
  // nameless bar directly below the stage bar, and two anonymous bars one above the other are
  // two bars nobody reads.
  write(ctx, 'SPEED', 22 * U, 100 * U, 11 * U, 700);
  ctx.fillStyle = 'rgba(13,12,11,0.16)';
  ctx.fillRect(22 * U, 110 * U, bw, 7 * U);
  ctx.fillStyle = Black;
  ctx.fillRect(22 * U, 110 * U, bw * state.heat, 7 * U);

  // --- what you are carrying: the name, what tier it has reached, and how near the next one
  const owned = carrying(state);
  let y = h - 22 * U - (owned.length - 1) * 23 * U;
  write(ctx, 'SPELLS', 22 * U, y - 26 * U, 11 * U, 700);
  for (const key of owned) {
    const kit = state.kit[key];
    write(ctx, Spells[key].name, 22 * U, y, 14 * U, 600);
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

  const kept = Object.keys(state.passives);
  let py = h - 22 * U - (kept.length - 1) * 19 * U;
  for (const key of kept) {
    write(ctx, `${Passives[key].name} ${state.passives[key]}`, w - 22 * U, py, 13 * U, 600, 'right');
    py += 19 * U;
  }
}

function picking(ctx, state, w, h, show, U) {
  ctx.fillStyle = 'rgba(236,231,220,0.93)';
  ctx.fillRect(0, 0, w, h);

  const list = cards(w, h, U);
  const header = list[0].y - (list[0].flat ? 56 * U : 46 * U);
  write(ctx, state.cleared ? `STAGE ${state.stage - 1} CLEARED` : `LEVEL ${state.level}`,
    w / 2, header - 24 * U, 36 * U, 800, 'center');
  write(ctx, state.cleared ? 'the wall is mended — take one' : 'TAKE ONE',
    w / 2, header + 8 * U, 14 * U, 600, 'center');

  for (const r of list) {
    const card = describe(state, state.choices[r.i]);
    if (!card) continue;
    const lit = show.overCard === r.i;
    const big = !!card.tier;              // a tier card is the one that changes the spell
    const top = r.y - (lit ? 8 : 0);
    const cx = r.x + r.w / 2;

    if (lit) {
      ctx.fillStyle = Black;
      ctx.beginPath(); ctx.roundRect(r.x, top, r.w, r.h, 10 * U); ctx.fill();
    }
    ctx.strokeStyle = Black;
    ctx.lineWidth = (lit ? 3 : big ? 4 : 2) * U;
    ctx.beginPath(); ctx.roundRect(r.x, top, r.w, r.h, 10 * U); ctx.stroke();

    const ink = lit ? Pale : Black;

    /** The pips under a card: how many of this you have, out of how many you may. */
    const pips = (px, py) => {
      if (!card.most) return;
      for (let i = 0; i < card.most; i++) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = i < card.have + 1 ? 1 : 0.22;
        ctx.beginPath(); ctx.arc(px - (card.most - 1) * 7 * U + i * 14 * U, py, 5 * U, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    // A tier card says what it borrowed. "An electric storm where it lands" only exists because
    // lightning is in the loadout, and a player who is not told that will never go looking for
    // the next combination.
    const foot = card.borrows ? `with ${card.borrows}`
      : card.toTier > 0 ? `${card.toTier} more to tier ${(state.kit[card.mark] || {}).tier + 1}`
      : '';

    if (r.flat) {
      sigil(ctx, card.mark, r.x + 58 * U, top + r.h / 2, 38 * U, ink);
      write(ctx, card.badge.toUpperCase(), r.x + 110 * U, top + 26 * U, 10 * U, 800, 'left', ink);
      write(ctx, card.title, r.x + 110 * U, top + 54 * U, 21 * U, 800, 'left', ink);
      write(ctx, card.text, r.x + 110 * U, top + 80 * U, 12 * U, 500, 'left', ink);
      if (foot) write(ctx, foot, r.x + 110 * U, top + 100 * U, 10 * U, 600, 'left', ink);
      pips(r.x + r.w - 60 * U, top + r.h / 2);
    } else {
      write(ctx, card.badge.toUpperCase(), cx, top + 26 * U, 10 * U, 800, 'center', ink);
      write(ctx, card.title, cx, top + 56 * U, 22 * U, 800, 'center', ink);
      sigil(ctx, card.mark, cx, top + 120 * U, big ? 46 * U : 38 * U, ink);
      wrap(ctx, card.text, cx, top + 190 * U, r.w - 30 * U, 13 * U, 18 * U, ink);
      if (foot) write(ctx, foot, cx, top + 222 * U, 10 * U, 600, 'center', ink);
      pips(cx, top + 246 * U);
    }
  }
  write(ctx, 'tap a card  ·  or press 1, 2, 3', w / 2, list[2].y + list[2].h + 32 * U, 13 * U, 500, 'center');
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
  const headTop = list[0].y - (list[0].tall ? 128 * U : 104 * U);

  write(ctx, 'SHADOW TOWER', w / 2, headTop, 34 * U, 800, 'center');

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
  write(ctx, `LEVEL ${meta.level}`, bx, by + 24 * U, 13 * U, 800, 'left');
  fitWrite(ctx, soon ? `${Spells[soon.key].name} at level ${soon.at}` : 'every spell is yours',
    bx + bw, by + 24 * U, 13 * U, 600, 'right', Black, bw * 0.45);
  if (meta.best) write(ctx, `best: stage ${meta.best}`, w / 2, by + 24 * U, 13 * U, 600, 'center');

  write(ctx, `CHOOSE UP TO ${LoadoutSize}`, w / 2, list[0].y - 24 * U, 12 * U, 800, 'center');

  for (const t of list) {
    const open = UnlockAt[t.key] <= meta.level;
    const taken = meta.loadout.includes(t.key);
    const lit = show.overTile === t.key && open;
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
    if (t.tall) {
      const room = t.w - 92 * U;
      sigil(ctx, t.key, t.x + 40 * U, t.y + t.h / 2, 30 * U, ink);
      fitWrite(ctx, open ? sp.name : 'LOCKED', t.x + 76 * U, t.y + 28 * U, 17 * U, 800, 'left', ink, room);
      fitWrite(ctx, open ? sp.tells : `opens at level ${UnlockAt[t.key]}`,
        t.x + 76 * U, t.y + 50 * U, 11 * U, 500, 'left', ink, room);
    } else {
      const room = t.w - 16 * U;
      sigil(ctx, t.key, t.x + t.w / 2, t.y + 32 * U, 30 * U, ink);
      fitWrite(ctx, open ? sp.name : 'LOCKED', t.x + t.w / 2, t.y + 64 * U, 14 * U, 800, 'center', ink, room);
      write(ctx, open ? '' : `level ${UnlockAt[t.key]}`, t.x + t.w / 2, t.y + 81 * U, 10 * U, 600, 'center', ink);
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
  write(ctx, `BEGIN  ·  ${meta.loadout.length}/${LoadoutSize}`, b.x + b.w / 2, b.y + b.h / 2,
    19 * U, 800, 'center', ready ? Pale : Black);
}

// --- the frame --------------------------------------------------------------------------------

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

  panel(ctx, state, w, h, U);

  if (show.hint && state.t < 9 && state.phase === 'playing') {
    ctx.globalAlpha = Math.min(1, 9 - state.t);
    write(ctx, 'YOUR SPELLS CAST THEMSELVES  —  TAP TO MAKE THEM CAST FASTER',
      w / 2, h - 118 * U, 14 * U, 700, 'center');
    ctx.globalAlpha = 1;
  }

  if (state.phase === 'picking') picking(ctx, state, w, h, show, U);

  if (state.phase === 'lost') {
    ctx.fillStyle = 'rgba(236,231,220,0.92)';
    ctx.fillRect(0, 0, w, h);
    const won = show.won;
    const row = (n) => h / 2 + (n - 2.2) * 34 * U;

    write(ctx, 'THE WALL FELL', w / 2, row(0) - 22 * U, 42 * U, 800, 'center');
    write(ctx, `STAGE ${state.stage}`, w / 2, row(1), 30 * U, 800, 'center');
    const secs = Math.floor(state.t);
    write(ctx, `level ${state.level}  ·  ${state.kills} down  ·  ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`,
      w / 2, row(2), 16 * U, 600, 'center');

    if (won) {
      // The account is the reason to go again, so it is said here rather than left on a screen
      // the player has to go back to before they find out anything happened.
      write(ctx, `+${won.earned} EXPERIENCE`, w / 2, row(3.1), 17 * U, 800, 'center');
      if (won.opened.length) {
        const names = won.opened.map((k) => Spells[k].name).join(' and ');
        write(ctx, `LEVEL ${won.level} — ${names.toUpperCase()} UNLOCKED`, w / 2, row(4.1), 15 * U, 800, 'center');
      } else if (won.levelled) {
        const soon = nextUnlock(won.level);
        write(ctx, soon ? `level ${won.level} — ${Spells[soon.key].name} at level ${soon.at}` : `level ${won.level}`,
          w / 2, row(4.1), 14 * U, 600, 'center');
      } else if (won.beatBest) {
        write(ctx, won.wasBest ? `a new best — you had only reached stage ${won.wasBest}` : 'a new best',
          w / 2, row(4.1), 14 * U, 600, 'center');
      } else {
        write(ctx, `your best is stage ${won.best}`, w / 2, row(4.1), 14 * U, 600, 'center');
      }
    }
    write(ctx, 'TAP TO CHOOSE AGAIN', w / 2, row(5.6), 15 * U, 700, 'center');
  }
}

export const Inks = { Black, Pale };

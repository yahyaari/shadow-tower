// Everything you see. Nothing here decides anything.
//
// One rule holds the whole look together: there are exactly two inks. A pale sky and pure black.
// Nothing is shaded, nothing is textured, nothing is coloured - a thing is either light or it is
// a shape cut out of the light. That is a style rather than a shortage, which matters, because
// across four games the absence of artwork has been something to hide. A silhouette has nothing
// to hide: it is a shape, and a shape drawn with care is finished.
//
// What carries it is the outline and the staging. Figures are drawn standing up even though they
// walk in from every side, because a shape seen from above is a blob and a shape seen from the
// side is a creature. Far ones are small and high, near ones are large and low, and everything is
// drawn back to front so the arena has depth without a single pixel of perspective maths.

import { Arena, Reach, TowerRadius, placeOf, Costs, costOf, canBuy, damageOf, rateOf, gainOf } from './rules.js';

const Black = '#0d0c0b';
const Pale = '#ece7dc';

/** Where the arena sits and how big it is drawn. */
export function stage(w, h) {
  const scale = Math.min(w / (Arena * 2.35), h / (Arena * 1.62));
  return { cx: w / 2, cy: h * 0.545, scale, squash: 0.5 };
}

/** World point to screen point. */
function place(S, x, y) {
  return [S.cx + x * S.scale, S.cy + y * S.scale * S.squash];
}

/** How big a figure standing at this depth is drawn. Near the bottom of the screen is near you. */
function depth(y) {
  return 0.66 + ((y + Arena) / (Arena * 2)) * 0.62;
}

// --- the scenery ------------------------------------------------------------------------------

/**
 * The ring of dead trees at the edge.
 *
 * Fixed, worked out once from a seed so they do not crawl about between frames. They do nothing
 * and they are most of why the arena looks like a place rather than a circle - a silhouette needs
 * something at the horizon to be a silhouette against.
 */
const Trees = (() => {
  let s = 20260413;
  const roll = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [];
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2 + (roll() - 0.5) * 0.07;
    // Nothing in the near arc. A tree at the front of the ring is drawn biggest, lands across the
    // upgrade buttons and stands exactly where the creatures walk in. Leaving the front open
    // reads as the near edge of a clearing, which is what it is.
    // `front` is 0 straight towards the camera and PI straight away from it. Written the other
    // way round the first time, which opened the gap at the back where nothing needed clearing.
    const front = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (front < 0.72) continue;
    out.push({
      a,
      // Pushed out past the arena and kept low. At the old radius the near ones stood right where
      // the creatures walk and across the buttons, and a frame you have to look past is not a
      // frame.
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
    // a few bare limbs, which is all a dead tree is
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

// --- the tower --------------------------------------------------------------------------------

function tower(ctx, S, state, flash) {
  const [px, py] = place(S, 0, 0);
  const k = S.scale * 1.52;

  ctx.save();
  ctx.translate(px, py);

  // the shadow it throws on the ground
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, TowerRadius * 2.4 * S.scale);
  shade.addColorStop(0, 'rgba(13,12,11,0.22)');
  shade.addColorStop(1, 'rgba(13,12,11,0)');
  ctx.save();
  ctx.scale(1, S.squash);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(0, 0, TowerRadius * 2.4 * S.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.scale(k, k);
  ctx.fillStyle = Black;

  // a tapering keep, widest at the foot
  ctx.beginPath();
  ctx.moveTo(-46, 6);
  ctx.lineTo(-33, -124);
  ctx.lineTo(33, -124);
  ctx.lineTo(46, 6);
  ctx.closePath();
  ctx.fill();

  // battlements
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * 17 - 7, -148, 14, 26);
  }
  ctx.fillRect(-38, -132, 76, 12);

  // a slit of a window, cut back out of the black
  ctx.fillStyle = Pale;
  ctx.beginPath();
  ctx.roundRect(-6, -96, 12, 30, 6);
  ctx.fill();

  // the gun on top, which turns to face whatever it is shooting
  ctx.save();
  ctx.translate(0, -158);
  ctx.fillStyle = Black;
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
  // the barrel is drawn in flat angle, squashed the same way the ground is
  const a = state.aim;
  ctx.rotate(Math.atan2(Math.sin(a) * S.squash, Math.cos(a)));
  const reach = 46 - Math.abs(Math.sin(a)) * 12;
  ctx.beginPath();
  ctx.roundRect(0, -6, reach, 12, 6);
  ctx.fill();

  // The flash. Clicking is the whole game, so the thing a click causes has to be visible at a
  // glance - without it the only sign the gun went off is a dot leaving somewhere.
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash * 2.2);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const t = (i / 7) * Math.PI * 2;
      const out = (i % 2 ? 9 : 22) * (0.6 + flash * 0.7);
      const fx = reach + 6 + Math.cos(t) * out, fy = Math.sin(t) * out;
      i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.restore();
}

// --- the creatures ----------------------------------------------------------------------------

/**
 * One enemy, drawn standing.
 *
 * Three outlines doing three jobs: a plain walker, a runner tipped forward, and a brute that is
 * mostly shoulders. The legs are two lines swung out of phase, which is the whole animation - a
 * silhouette only has to move correctly at the joints, because there is nothing else to look at.
 */
function figure(ctx, S, f) {
  const p = placeOf(f);
  const [px, py] = place(S, p.x, p.y);
  const k = depth(p.y) * S.scale * f.size;
  const swing = Math.sin(f.step * (f.key === 'runner' ? 1.7 : 1.2));
  const bob = Math.abs(Math.cos(f.step * 1.2)) * 2;

  ctx.save();
  ctx.translate(px, py);

  ctx.fillStyle = 'rgba(13,12,11,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 16 * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(k, k);
  // a struck one flinches away from the tower
  if (f.hurt > 0) ctx.translate(Math.cos(f.a) * f.hurt * 4, Math.sin(f.a) * f.hurt * 2);
  ctx.translate(0, -bob);

  ctx.fillStyle = Black;
  ctx.strokeStyle = Black;
  ctx.lineCap = 'round';

  if (f.key === 'brute') {
    ctx.lineWidth = 9;
    // legs
    ctx.beginPath();
    ctx.moveTo(-7, -26); ctx.lineTo(-9 + swing * 7, 0);
    ctx.moveTo(7, -26); ctx.lineTo(9 - swing * 7, 0);
    ctx.stroke();
    // a slab of a body with shoulders above the head
    ctx.beginPath();
    ctx.moveTo(-15, -26); ctx.lineTo(-24, -52); ctx.lineTo(-17, -62);
    ctx.lineTo(17, -62); ctx.lineTo(24, -52); ctx.lineTo(15, -26);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -58, 9, 0, Math.PI * 2); ctx.fill();
    // arms hanging long
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

// --- the writing ------------------------------------------------------------------------------

const Face = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function write(ctx, text, x, y, size, weight = 600, align = 'left', colour = Black) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${Face}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/** Where the three buttons are. Shared with the mouse, so one can never be drawn out of reach. */
export function buttons(w, h) {
  const kinds = ['damage', 'rate', 'gain'];
  const bw = Math.min(228, (w - 80) / 3 - 16);
  const bh = 74;
  const total = kinds.length * bw + (kinds.length - 1) * 16;
  let x = w / 2 - total / 2;
  return kinds.map((kind) => {
    const r = { kind, x, y: h - bh - 22, w: bw, h: bh };
    x += bw + 16;
    return r;
  });
}

export function hitButton(state, w, h, px, py) {
  for (const b of buttons(w, h)) {
    if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.kind;
  }
  return null;
}

function panel(ctx, state, w, h, show) {
  // --- the tower's own health, top left
  const bw = Math.min(300, w * 0.26);
  write(ctx, 'TOWER', 30, 34, 13, 700);
  ctx.lineWidth = 2;
  ctx.strokeStyle = Black;
  ctx.strokeRect(30, 46, bw, 16);
  ctx.fillStyle = Black;
  ctx.fillRect(30, 46, bw * Math.max(0, state.hp) / state.maxHp, 16);
  write(ctx, `${Math.ceil(state.hp)}`, 30 + bw + 12, 54, 15, 700);

  // --- the count, top right
  write(ctx, String(state.coins), w - 30, 40, 38, 800, 'right');
  write(ctx, 'COINS', w - 30, 68, 12, 700, 'right');
  write(ctx, `${state.kills} DOWN`, w - 30, 92, 12, 600, 'right');

  // --- time and the gun, top middle
  const secs = Math.floor(state.t);
  write(ctx, `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`,
    w / 2, 40, 26, 800, 'center');
  write(ctx, `${damageOf(state)} DMG   ·   ${rateOf(state).toFixed(1)}/SEC   ·   +${gainOf(state)} PER KILL`,
    w / 2, 68, 12, 600, 'center');

  // --- heat: the thing the clicking is actually doing, drawn where the clicking happens
  if (state.heat > 0.02) {
    const hw = 220;
    ctx.fillStyle = Black;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(w / 2 - hw / 2, 86, hw, 7);
    ctx.globalAlpha = 1;
    ctx.fillRect(w / 2 - hw / 2, 86, hw * state.heat, 7);
  }

  // --- the three upgrades
  for (const b of buttons(w, h)) {
    const cost = costOf(b.kind, state.levels[b.kind]);
    const can = canBuy(state, b.kind);
    const lit = show.over === b.kind && can;

    ctx.lineWidth = can ? 2.5 : 1.5;
    ctx.strokeStyle = Black;
    ctx.globalAlpha = can ? 1 : 0.32;
    if (lit) {
      ctx.fillStyle = Black;
      ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
    }
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.stroke();

    const ink = lit ? Pale : Black;
    write(ctx, Costs[b.kind].says, b.x + b.w / 2, b.y + 20, 14, 800, 'center', ink);
    write(ctx, Costs[b.kind].tells, b.x + b.w / 2, b.y + 39, 11, 500, 'center', ink);
    write(ctx, `${cost}`, b.x + b.w / 2, b.y + 59, 17, 800, 'center', ink);
    write(ctx, `LV ${state.levels[b.kind]}`, b.x + 10, b.y + 12, 10, 700, 'left', ink);
    ctx.globalAlpha = 1;
  }
}

// --- the frame --------------------------------------------------------------------------------

export function frame(ctx, w, h, state, show) {
  const S = stage(w, h);

  // --- sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f6f3ec');
  sky.addColorStop(0.55, Pale);
  sky.addColorStop(1, '#cfc7b6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // a low sun behind the tower, which is what makes it a silhouette and not a drawing
  const [sx, sy] = place(S, 0, -Arena * 0.45);
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.42);
  sun.addColorStop(0, 'rgba(255,253,246,0.95)');
  sun.addColorStop(0.45, 'rgba(246,241,230,0.4)');
  sun.addColorStop(1, 'rgba(236,231,220,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // --- the ground: a couple of faint rings, so distance is readable
  ctx.strokeStyle = 'rgba(13,12,11,0.09)';
  ctx.lineWidth = 2;
  for (const r of [Reach, Arena * 0.45, Arena * 0.74, Arena]) {
    ctx.beginPath();
    ctx.ellipse(S.cx, S.cy, r * S.scale, r * S.scale * S.squash, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- everything with a position, back to front
  const things = [];
  for (const t of Trees) things.push({ y: Math.sin(t.a) * t.r, draw: () => tree(ctx, S, t) });
  for (const f of state.foes) things.push({ y: placeOf(f).y, draw: () => figure(ctx, S, f) });
  things.push({ y: 0, draw: () => tower(ctx, S, state, show.flash) });
  things.sort((a, b) => a.y - b.y);
  for (const t of things) t.draw();

  // --- the shots, over everything: they are the fastest thing on screen and must not be lost
  ctx.fillStyle = Black;
  for (const b of state.shots) {
    const [bx, by] = place(S, b.x, b.y);
    ctx.beginPath();
    ctx.ellipse(bx, by - 150 * S.scale, 4.5 * S.scale, 4.5 * S.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- specks thrown off a death
  for (const p of show.bits) {
    const [bx, by] = place(S, p.x, p.y);
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = Black;
    ctx.beginPath();
    ctx.ellipse(bx, by - p.z * S.scale, p.size * S.scale, p.size * S.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- coins floating off a kill
  for (const f of show.floats) {
    const [fx, fy] = place(S, f.x, f.y);
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6));
    write(ctx, f.text, fx, fy - f.rise, 17 * S.scale + 7, 800, 'center');
    ctx.globalAlpha = 1;
  }

  panel(ctx, state, w, h, show);

  // --- the only words a new player gets
  if (show.hint && state.t < 9) {
    ctx.globalAlpha = Math.min(1, 9 - state.t);
    write(ctx, 'CLICK ANYWHERE — THE MORE YOU CLICK, THE FASTER IT FIRES',
      w / 2, h - 126, 15, 700, 'center');
    ctx.globalAlpha = 1;
  }

  // --- the end
  if (!state.alive) {
    ctx.fillStyle = 'rgba(236,231,220,0.88)';
    ctx.fillRect(0, 0, w, h);
    write(ctx, 'THE TOWER FELL', w / 2, h / 2 - 54, 46, 800, 'center');
    const secs = Math.floor(state.t);
    write(ctx, `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')} · ${state.kills} down`,
      w / 2, h / 2 + 2, 20, 600, 'center');
    write(ctx, 'CLICK TO BEGIN AGAIN', w / 2, h / 2 + 52, 15, 700, 'center');
  }
}

export const Inks = { Black, Pale };

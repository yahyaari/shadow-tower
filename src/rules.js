// The game, with nothing drawn and nothing clicked.
//
// No DOM, no canvas, no audio: everything is arithmetic over a state object, so a bot can play it
// in Node. In a game that is a pile of interacting spells that is not a nicety - whether it works
// is entirely a question of whether the pile is balanced, and nobody can judge a pile by playing
// it through twice.

export const Arena = 560;        // how far out they walk in from
export const Wall = 76;          // the ring they have to break through
export const Reach = 96;         // how close one gets before it starts hitting the wall
export const Length = 180;       // how long the level is, in seconds

export const Base = {
  wall: 300,
  bullet: 560,
};

/**
 * What clicking does.
 *
 * Every spell casts on its own; a click makes all of them cast faster for a moment. That keeps
 * the hands busy in a game that would otherwise watch itself, without turning it into a test of
 * how fast a mouse can be hit - heat is capped and bleeds away, so mashing is worth something and
 * worth about the same whether you manage six a second or sixteen.
 */
export const Heat = {
  perClick: 0.22,
  fade: 0.8,
  most: 1,
  lift: 0.9,       // +90% cast speed at full heat
};

// --- the spells -------------------------------------------------------------------------------

/**
 * Ten of them, each doing a different job rather than more damage than the last.
 *
 * `every` is the cooldown at level one and `damage` the damage at level one; both improve by
 * `per` each level after. Everything a spell needs sits on its own entry, so the one place to
 * look when a spell is wrong is the spell.
 */
export const Spells = {
  bolt: {
    name: 'Magic Bolt', tells: 'a homing bolt at the nearest',
    every: 0.85, damage: 7, per: 0.17, seeks: 'near', homing: true,
  },
  shards: {
    name: 'Shards', tells: 'three splinters in a fan',
    every: 1.7, damage: 5, per: 0.15, seeks: 'near', count: 3, spread: 0.42,
  },
  wisp: {
    name: 'Wisp', tells: 'hunts whatever is toughest',
    every: 1.5, damage: 11, per: 0.19, seeks: 'strong', homing: true,
  },
  fireball: {
    name: 'Fireball', tells: 'bursts where it lands',
    every: 2.6, damage: 12, per: 0.2, seeks: 'crowd', blast: 86,
  },
  frost: {
    name: 'Frost Orb', tells: 'bursts, and what it touches slows',
    every: 2.3, damage: 7, per: 0.15, seeks: 'near', blast: 76, chill: 2.4,
  },
  lightning: {
    name: 'Lightning', tells: 'leaps between them',
    every: 2.5, damage: 10, per: 0.18, instant: 'chain', jumps: 3,
  },
  laser: {
    name: 'Beam', tells: 'burns a line clean through',
    every: 3.4, damage: 20, per: 0.22, instant: 'beam', wide: 34,
  },
  nova: {
    name: 'Nova', tells: 'everything near the wall, at once',
    every: 3.8, damage: 15, per: 0.2, instant: 'nova', blast: 190,
  },
  meteor: {
    name: 'Meteor', tells: 'falls on the thickest part of the crowd',
    every: 5, damage: 34, per: 0.24, seeks: 'crowd', falls: true, blast: 110,
  },
  blade: {
    name: 'Orbit', tells: 'a blade circling you, always',
    every: 0.55, damage: 9, per: 0.16, orbit: true,
  },
};

/** What you can take instead of a spell. Fewer, and each one helps everything you own. */
export const Passives = {
  might: { name: 'Might', tells: '+15% damage, everything' },
  haste: { name: 'Haste', tells: '+13% cast speed, everything' },
  reach: { name: 'Reach', tells: '+18% blast and beam size' },
  mend:  { name: 'Mend', tells: 'the wall rebuilds itself' },
};

export const MostSpells = 6;
export const MostLevel = 5;

export const spellKeys = Object.keys(Spells);
export const passiveKeys = Object.keys(Passives);

/** What the next level costs. The first is two kills, as asked; after that it climbs. */
export function xpFor(level) {
  return Math.round(2 * Math.pow(1.3, level - 1) + (level - 1) * 1.6);
}

export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- the enemies ------------------------------------------------------------------------------

/**
 * Bites are small on purpose.
 *
 * They were twice this, and the result was a wall that went from untouched to gone in under
 * three seconds: the moment ten of them stood at the ring together they took it off between two
 * breaths. Every winning run ended with the wall almost full and every losing one with it at
 * zero, which means the wall never actually took part. Small bites turn a leak into wear, and
 * wear is something the player can see happening and answer.
 */
export const Kinds = {
  walker: { hp: 12, speed: 44, bite: 3, xp: 1, size: 1 },
  runner: { hp: 8, speed: 86, bite: 2, xp: 1, size: 0.84, sprint: 1.9 },
  brute:  { hp: 40, speed: 25, bite: 8, xp: 3, size: 1.12 },
};

export const SprintAt = 210;

/**
 * How hard it is right now, and what the wave does with it.
 *
 * The wave gets *thicker*, not tougher. In the first pass each one's health climbed as the
 * pressure to the power of 1.9 while the player's output tops out at about three and a half
 * times what it starts at - five spells at five levels, plus Might - so the two curves cross
 * about a minute in and never come back. Tripling the wall bought five seconds, which is how I
 * know the wall was never the problem.
 *
 * So health barely moves and the numbers do. That is the shape this genre actually has: a crowd
 * of things you can each kill, arriving faster than you can kill them one at a time, which is
 * what makes a spell that hits twenty of them at once worth taking.
 */
export const pressure = (s) => 1 + s.t / 60;
export const spawnEvery = (s) => Math.max(0.055, 0.85 / Math.pow(pressure(s), 1.25));

// --- a run ------------------------------------------------------------------------------------

export function begin(seed = Date.now()) {
  return {
    roll: seeded(seed),
    t: 0,
    phase: 'playing',         // 'playing' | 'picking' | 'won' | 'lost'
    wall: Base.wall, maxWall: Base.wall,
    level: 1, xp: 0, need: xpFor(1),
    kills: 0,
    heat: 0,
    spells: { bolt: 1 },
    passives: {},
    cools: { bolt: 0.4 },
    choices: [],
    foes: [],
    shots: [],
    fx: [],                   // things that have already happened and are only drawn
    bladeAt: 0,
    bladeHits: {},            // foe id -> the time the blade may hit it again
    aim: -Math.PI / 2,
    cast: 0,                  // counts down after a cast, for the staff to swing on
    events: [],
    nextIn: 1.2,
    id: 1,
  };
}

export const might = (s) => 1 + (s.passives.might || 0) * 0.15;
export const haste = (s) => (1 + (s.passives.haste || 0) * 0.13) * (1 + s.heat * Heat.lift);
export const reach = (s) => 1 + (s.passives.reach || 0) * 0.18;

export function damageOf(s, key) {
  const sp = Spells[key];
  const lv = s.spells[key] || 1;
  return sp.damage * Math.pow(1 + sp.per, lv - 1) * might(s);
}

export function everyOf(s, key) {
  const sp = Spells[key];
  const lv = s.spells[key] || 1;
  return sp.every / Math.pow(1 + sp.per * 0.55, lv - 1) / haste(s);
}

export const placeOf = (f) => ({ x: Math.cos(f.a) * f.r, y: Math.sin(f.a) * f.r });

export function spawn(s, kindKey = null, angle = null) {
  const r = s.roll();
  const p = pressure(s);
  const key = kindKey || (p > 1.5 && r < 0.12 ? 'brute' : r < 0.2 + Math.min(0.25, p * 0.1) ? 'runner' : 'walker');
  const k = Kinds[key];
  const tough = Math.pow(p, 0.9);
  const foe = {
    id: s.id++,
    key,
    a: angle == null ? s.roll() * Math.PI * 2 : angle,
    r: Arena,
    hp: k.hp * tough, maxHp: k.hp * tough,
    speed: k.speed * (1 + (p - 1) * 0.08),
    sprint: k.sprint || 0,
    bite: k.bite,
    xp: k.xp,
    size: k.size,
    step: s.roll() * 6.28,
    hurt: 0, chill: 0, biteCool: 0,
  };
  s.foes.push(foe);
  return foe;
}

// --- picking targets --------------------------------------------------------------------------

function nearest(s) {
  let best = null;
  for (const f of s.foes) if (f.hp > 0 && (!best || f.r < best.r)) best = f;
  return best;
}

function strongest(s) {
  let best = null;
  for (const f of s.foes) if (f.hp > 0 && (!best || f.hp > best.hp)) best = f;
  return best;
}

/** The thickest part of the crowd: whichever one has the most company around it. */
function crowd(s, within = 120) {
  let best = null, most = -1;
  for (const f of s.foes) {
    if (f.hp <= 0) continue;
    const p = placeOf(f);
    let n = 0;
    for (const o of s.foes) {
      if (o.hp <= 0) continue;
      const q = placeOf(o);
      if (Math.hypot(q.x - p.x, q.y - p.y) <= within) n++;
    }
    if (n > most) { most = n; best = f; }
  }
  return best;
}

const aimAt = (s, how) => (how === 'strong' ? strongest(s) : how === 'crowd' ? crowd(s) : nearest(s));

// --- doing damage -------------------------------------------------------------------------------

function wound(s, f, amount, chill = 0) {
  f.hp -= amount;
  f.hurt = 1;
  if (chill) f.chill = Math.max(f.chill, chill);
  const p = placeOf(f);
  if (f.hp <= 0) {
    s.kills += 1;
    s.xp += f.xp;
    s.events.push({ kind: 'killed', x: p.x, y: p.y, size: f.size, xp: f.xp });
  } else {
    s.events.push({ kind: 'struck', x: p.x, y: p.y, size: f.size });
  }
}

/** Everything inside a circle. The bread and butter of half of these spells. */
function splash(s, x, y, radius, amount, chill = 0) {
  for (const f of s.foes) {
    if (f.hp <= 0) continue;
    const p = placeOf(f);
    if (Math.hypot(p.x - x, p.y - y) <= radius) wound(s, f, amount, chill);
  }
}

// --- casting --------------------------------------------------------------------------------

function castSpell(s, key) {
  const sp = Spells[key];
  const dmg = damageOf(s, key);
  const size = reach(s);

  if (sp.instant === 'nova') {
    const r = sp.blast * size;
    splash(s, 0, 0, r, dmg);
    s.fx.push({ kind: 'nova', x: 0, y: 0, r, life: 0.42, max: 0.42 });
    s.cast = 1;
    return true;
  }

  const mark = aimAt(s, sp.seeks || 'near');
  if (!mark) return false;

  if (sp.instant === 'chain') {
    const hit = [];
    let from = mark;
    const jumps = sp.jumps + ((s.spells[key] || 1) - 1);
    const points = [{ x: 0, y: -46 }];
    for (let i = 0; i < jumps && from; i++) {
      const p = placeOf(from);
      points.push(p);
      hit.push(from.id);
      wound(s, from, dmg);
      let next = null, best = 1e9;
      for (const f of s.foes) {
        if (f.hp <= 0 || hit.includes(f.id)) continue;
        const q = placeOf(f);
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < best && d < 190 * size) { best = d; next = f; }
      }
      from = next;
    }
    s.fx.push({ kind: 'chain', points, life: 0.26, max: 0.26 });
    s.cast = 1;
    return true;
  }

  if (sp.instant === 'beam') {
    const p = placeOf(mark);
    const a = Math.atan2(p.y, p.x);
    const wide = sp.wide * size;
    for (const f of s.foes) {
      if (f.hp <= 0) continue;
      const q = placeOf(f);
      // how far along the line it is, and how far off it - only what is in front counts
      const along = q.x * Math.cos(a) + q.y * Math.sin(a);
      const off = Math.abs(-q.x * Math.sin(a) + q.y * Math.cos(a));
      if (along > 0 && off <= wide / 2) wound(s, f, dmg);
    }
    s.aim = a;
    s.fx.push({ kind: 'beam', a, wide, life: 0.2, max: 0.2 });
    s.cast = 1;
    return true;
  }

  // everything else is a thing that flies
  const p = placeOf(mark);
  const a = Math.atan2(p.y, p.x);
  s.aim = a;
  const n = sp.count || 1;
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i - (n - 1) / 2) * sp.spread : 0;
    s.shots.push({
      key,
      x: sp.falls ? p.x : Math.cos(a + off) * Wall,
      y: sp.falls ? p.y : Math.sin(a + off) * Wall,
      z: sp.falls ? 620 : 0,
      a: a + off,
      at: sp.homing ? mark.id : null,
      damage: dmg,
      blast: (sp.blast || 0) * size,
      chill: sp.chill || 0,
      falls: !!sp.falls,
      life: 3,
    });
  }
  s.cast = 1;
  return true;
}

// --- levelling ----------------------------------------------------------------------------------

/**
 * Three things to choose between.
 *
 * Spells you own that can still grow, spells you do not have, and the passives, all in one pool.
 * The point of the mix is that a pick is a question - go wider or go deeper - and a list of only
 * new spells would answer it for you every time.
 */
export function offer(s) {
  const pool = [];
  for (const k of Object.keys(s.spells)) {
    if (s.spells[k] < MostLevel) pool.push({ what: 'spell', key: k, up: true });
  }
  if (Object.keys(s.spells).length < MostSpells) {
    for (const k of spellKeys) if (!s.spells[k]) pool.push({ what: 'spell', key: k, up: false });
  }
  for (const k of passiveKeys) {
    if ((s.passives[k] || 0) < MostLevel) pool.push({ what: 'passive', key: k, up: !!s.passives[k] });
  }

  const out = [];
  const taken = new Set();
  for (let guard = 0; guard < 120 && out.length < 3 && pool.length; guard++) {
    const pick = pool[Math.floor(s.roll() * pool.length)];
    const id = pick.what + ':' + pick.key;
    if (taken.has(id)) continue;
    taken.add(id);
    out.push(pick);
  }
  return out;
}

export function take(s, index) {
  if (s.phase !== 'picking') return false;
  const pick = s.choices[index];
  if (pick) {
    if (pick.what === 'spell') {
      s.spells[pick.key] = (s.spells[pick.key] || 0) + 1;
      if (s.cools[pick.key] === undefined) s.cools[pick.key] = 0.2;
    } else {
      s.passives[pick.key] = (s.passives[pick.key] || 0) + 1;
      if (pick.key === 'mend') { s.maxWall += 20; s.wall += 20; }
    }
    s.events.push({ kind: 'took', pick });
  }
  s.choices = [];
  s.phase = 'playing';
  return true;
}

export function click(s) {
  if (s.phase !== 'playing') return false;
  s.heat = Math.min(Heat.most, s.heat + Heat.perClick);
  return true;
}

// --- the tick -----------------------------------------------------------------------------------

export function step(s, dt) {
  if (s.phase !== 'playing') return s;
  s.t += dt;
  s.heat = Math.max(0, s.heat - Heat.fade * dt);
  s.cast = Math.max(0, s.cast - dt * 5);

  if (s.t >= Length) { s.phase = 'won'; return s; }

  // --- they keep coming
  s.nextIn -= dt;
  while (s.nextIn <= 0) { spawn(s); s.nextIn += spawnEvery(s); }

  // --- the walk in
  for (const f of s.foes) {
    f.hurt = Math.max(0, f.hurt - dt * 4);
    f.chill = Math.max(0, f.chill - dt);
    f.biteCool = Math.max(0, f.biteCool - dt);
    const slow = f.chill > 0 ? 0.45 : 1;
    if (f.r > Reach) {
      const dash = f.sprint && f.r < SprintAt ? f.sprint : 1;
      f.r = Math.max(Reach, f.r - f.speed * dash * slow * dt);
      f.step += dt * f.speed * dash * slow * 0.055;
    } else if (f.biteCool <= 0) {
      f.biteCool = 0.9;
      s.wall -= f.bite;
      s.events.push({ kind: 'bitten', amount: f.bite, a: f.a });
      if (s.wall <= 0) { s.wall = 0; s.phase = 'lost'; return s; }
    }
  }

  if (s.passives.mend) s.wall = Math.min(s.maxWall, s.wall + s.passives.mend * 1.1 * dt);

  // --- the spells, each on its own clock
  for (const key of Object.keys(s.spells)) {
    if (Spells[key].orbit) continue;
    s.cools[key] -= dt;
    if (s.cools[key] <= 0) {
      const went = castSpell(s, key);
      s.cools[key] = went ? everyOf(s, key) : 0.2;
      if (went) s.events.push({ kind: 'cast', key });
    }
  }

  // --- the blade, which is a position rather than a cooldown
  if (s.spells.blade) {
    const lv = s.spells.blade;
    s.bladeAt = (s.bladeAt + dt * (1.5 + lv * 0.18) * (1 + s.heat * 0.4)) % (Math.PI * 2);
    const ring = 150 + lv * 14;
    const bx = Math.cos(s.bladeAt) * ring, by = Math.sin(s.bladeAt) * ring;
    for (const f of s.foes) {
      if (f.hp <= 0 || (s.bladeHits[f.id] || 0) > s.t) continue;
      const p = placeOf(f);
      if (Math.hypot(p.x - bx, p.y - by) < 34 + f.size * 12) {
        s.bladeHits[f.id] = s.t + 0.45;
        wound(s, f, damageOf(s, 'blade'));
      }
    }
  }

  // --- the things in flight
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const b = s.shots[i];
    b.life -= dt;
    let landed = false;

    if (b.falls) {
      b.z -= 1500 * dt;
      if (b.z <= 0) landed = true;
    } else if (b.at != null) {
      const f = s.foes.find((o) => o.id === b.at && o.hp > 0);
      if (!f) { b.at = null; } else {
        const p = placeOf(f);
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const move = Base.bullet * dt;
        b.a = Math.atan2(dy, dx);
        if (d <= move + f.size * 14) { b.x = p.x; b.y = p.y; landed = true; }
        else { b.x += (dx / d) * move; b.y += (dy / d) * move; }
      }
    }
    if (!landed && b.at == null && !b.falls) {
      b.x += Math.cos(b.a) * Base.bullet * dt;
      b.y += Math.sin(b.a) * Base.bullet * dt;
      for (const f of s.foes) {
        if (f.hp <= 0) continue;
        const p = placeOf(f);
        if (Math.hypot(p.x - b.x, p.y - b.y) < 16 + f.size * 13) { landed = true; break; }
      }
      if (!landed && Math.hypot(b.x, b.y) > Arena * 1.3) { s.shots.splice(i, 1); continue; }
    }

    if (landed) {
      if (b.blast > 0) {
        splash(s, b.x, b.y, b.blast, b.damage, b.chill);
        s.fx.push({ kind: b.chill ? 'frost' : 'burst', x: b.x, y: b.y, r: b.blast, life: 0.34, max: 0.34 });
      } else {
        let best = null, near = 1e9;
        for (const f of s.foes) {
          if (f.hp <= 0) continue;
          const p = placeOf(f);
          const d = Math.hypot(p.x - b.x, p.y - b.y);
          if (d < near) { near = d; best = f; }
        }
        if (best && near < 34) wound(s, best, b.damage);
      }
      s.shots.splice(i, 1);
      continue;
    }
    if (b.life <= 0) s.shots.splice(i, 1);
  }

  for (let i = s.fx.length - 1; i >= 0; i--) {
    s.fx[i].life -= dt;
    if (s.fx[i].life <= 0) s.fx.splice(i, 1);
  }

  s.foes = s.foes.filter((f) => f.hp > 0);
  for (const id of Object.keys(s.bladeHits)) if (s.bladeHits[id] < s.t - 2) delete s.bladeHits[id];

  // --- levelling, last, so a kill made this tick counts
  if (s.xp >= s.need) {
    s.xp -= s.need;
    s.level += 1;
    s.need = xpFor(s.level);
    s.choices = offer(s);
    if (s.choices.length) {
      s.phase = 'picking';
      s.events.push({ kind: 'levelled', level: s.level });
    }
  }
  return s;
}

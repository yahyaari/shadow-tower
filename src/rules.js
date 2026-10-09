// The game, with nothing drawn and nothing clicked.
//
// No DOM, no canvas, no audio: everything here is arithmetic over a state object, so a bot can
// play it in Node. In a game whose whole shape is "numbers go up" that is not a nicety - whether
// it is any good is entirely a question of whether the curve is right, and a curve is not
// something anybody can judge by feel in the first two minutes.

export const Arena = 560;        // how far out they walk in from
export const TowerRadius = 44;
export const Reach = 58;         // how close one gets before it starts hitting the tower

export const Base = {
  hp: 100,
  damage: 4,
  rate: 1.35,        // shots a second, before heat
  gain: 2,
  bullet: 620,       // how fast a shot travels
};

/**
 * What clicking does.
 *
 * The click has to be worth making or the game is a screensaver, and it has to stop being worth
 * making at some point or it is a test of how fast a mouse can be hit. So: every click fires a
 * shot and adds heat, heat makes the automatic fire faster, and heat bleeds away on its own. Mash
 * and the tower roars; stop and it settles back. The cap is what keeps a fast mouse from being the
 * whole game.
 */
export const Heat = {
  perClick: 0.3,
  fade: 0.85,        // per second
  most: 1,
  lift: 1.9,         // fire rate multiplier at full heat
  shotEvery: 0.07,   // a click cannot fire faster than this
};

/**
 * What the upgrades cost.
 *
 * Deliberately cheap at the start and climbing fast. In the first pass a minute in bought seven
 * upgrades between them and the counter sat at eighteen coins, which is not a clicker - it is a
 * waiting room. The feeling this genre runs on is the number moving faster than you can spend it
 * for the first minute, and then never quite fast enough afterwards.
 */
export const Costs = {
  damage: { first: 8,  step: 1.15, says: 'DAMAGE',    tells: '+2 per shot' },
  rate:   { first: 11, step: 1.17, says: 'FIRE RATE', tells: '+0.22 / sec' },
  gain:   { first: 18, step: 1.21, says: 'GAIN',      tells: '+1 per kill' },
};

export const Steps = { damage: 2, rate: 0.22, gain: 1 };

export function costOf(kind, level) {
  const c = Costs[kind];
  return Math.round(c.first * Math.pow(c.step, level));
}

/**
 * The enemies.
 *
 * Three shapes rather than three stat lines: one that arrives, one that arrives early, and one
 * that does not care what you do to it. A wave of things that differ only in health is a wave of
 * one thing.
 */
export const Kinds = {
  walker: { hp: 11, speed: 46, bite: 7, bounty: 1, size: 1 },
  runner: { hp: 7, speed: 88, bite: 4, bounty: 1, size: 0.84, sprint: 2.1 },
  brute:  { hp: 38, speed: 26, bite: 18, bounty: 4, size: 1.42 },
};

/**
 * Where a runner breaks into a sprint.
 *
 * The gun shoots whatever is closest, which means it either keeps up with the whole wave or it
 * does not - and so the tower took no damage at all for the first two minutes and then fell in
 * twenty seconds. A health bar that only moves at the end is not a health bar.
 *
 * The sprint is the leak. A runner that doubles its pace for the last stretch sometimes crosses
 * it faster than the gun can come round, lands a bite and dies for it. Small, constant, survivable
 * damage from the first minute, without touching how the wave grows.
 */
export const SprintAt = 210;

export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function begin(seed = Date.now()) {
  return {
    roll: seeded(seed),
    t: 0,
    alive: true,
    hp: Base.hp, maxHp: Base.hp,
    coins: 0, earned: 0, kills: 0,
    levels: { damage: 0, rate: 0, gain: 0 },
    heat: 0,
    cool: 0,          // time until the automatic gun fires again
    clickCool: 0,
    aim: -Math.PI / 2,
    foes: [],
    shots: [],
    events: [],       // for the view: deaths, hits, purchases
    nextIn: 1.1,
    id: 1,
  };
}

export const damageOf = (s) => Base.damage + s.levels.damage * Steps.damage;
export const rateOf = (s) => (Base.rate + s.levels.rate * Steps.rate) * (1 + s.heat * Heat.lift);
export const gainOf = (s) => Base.gain + s.levels.gain * Steps.gain;

/**
 * How hard it is right now.
 *
 * One number, driven by nothing but time. Everything about the wave - how often they come, how
 * much they take to put down - hangs off it, so the difficulty has a single place to be tuned and
 * cannot drift apart from itself.
 */
export const pressure = (s) => 1 + s.t / 48;

export function spawnEvery(s) {
  // Faster than linear. With the interval simply divided by the pressure, the gun outgrew the
  // wave for three solid minutes - the bot sat at full health through every mark the test takes
  // and then fell off a cliff. A health bar that does not move for three minutes is a decoration,
  // and the first thing it has to do is move.
  return Math.max(0.1, 1.0 / Math.pow(pressure(s), 1.22));
}

function pick(s) {
  const p = pressure(s);
  const r = s.roll();
  // brutes only once it has had a chance to buy something; runners thicken as it goes on
  if (p > 1.6 && r < 0.17) return 'brute';
  if (r < 0.2 + Math.min(0.25, p * 0.1)) return 'runner';
  return 'walker';
}

export function spawn(s, kindKey = null, angle = null) {
  const key = kindKey || pick(s);
  const k = Kinds[key];
  const a = angle == null ? s.roll() * Math.PI * 2 : angle;
  const tough = Math.pow(pressure(s), 2.0);
  const foe = {
    id: s.id++,
    key,
    a,
    r: Arena,
    hp: k.hp * tough,
    maxHp: k.hp * tough,
    speed: k.speed * (1 + (pressure(s) - 1) * 0.1),
    sprint: k.sprint || 0,
    bite: k.bite,
    bounty: Math.round(k.bounty * (1 + (pressure(s) - 1) * 0.8)),
    size: k.size,
    step: s.roll() * 6.28,     // where in its walk cycle it starts
    hurt: 0,
    biteCool: 0,
  };
  s.foes.push(foe);
  return foe;
}

/** Where a foe is, in flat coordinates with the tower at the origin. */
export const placeOf = (f) => ({ x: Math.cos(f.a) * f.r, y: Math.sin(f.a) * f.r });

/** The one it should be shooting: whatever is closest to the tower. */
export function target(s) {
  let best = null;
  for (const f of s.foes) if (f.hp > 0 && (!best || f.r < best.r)) best = f;
  return best;
}

function fire(s) {
  const t = target(s);
  if (!t) return false;
  const p = placeOf(t);
  s.aim = Math.atan2(p.y, p.x);
  s.shots.push({
    x: Math.cos(s.aim) * TowerRadius,
    y: Math.sin(s.aim) * TowerRadius,
    at: t.id,
    damage: damageOf(s),
  });
  s.events.push({ kind: 'fire' });
  return true;
}

/** A click: a shot now, and the gun runs hotter for a while. */
export function click(s) {
  if (!s.alive) return false;
  s.heat = Math.min(Heat.most, s.heat + Heat.perClick);
  if (s.clickCool > 0) return false;
  s.clickCool = Heat.shotEvery;
  return fire(s);
}

export function canBuy(s, kind) {
  return s.alive && s.coins >= costOf(kind, s.levels[kind]);
}

export function buy(s, kind) {
  if (!canBuy(s, kind)) return false;
  s.coins -= costOf(kind, s.levels[kind]);
  s.levels[kind] += 1;
  s.events.push({ kind: 'bought', what: kind });
  return true;
}

export function step(s, dt) {
  if (!s.alive) return s;
  s.t += dt;
  s.heat = Math.max(0, s.heat - Heat.fade * dt);
  s.clickCool = Math.max(0, s.clickCool - dt);

  // --- they keep coming
  s.nextIn -= dt;
  while (s.nextIn <= 0) {
    spawn(s);
    s.nextIn += spawnEvery(s);
  }

  // --- the walk in
  for (const f of s.foes) {
    f.hurt = Math.max(0, f.hurt - dt * 4);
    f.biteCool = Math.max(0, f.biteCool - dt);
    if (f.r > Reach) {
      const dash = f.sprint && f.r < SprintAt ? f.sprint : 1;
      f.r = Math.max(Reach, f.r - f.speed * dash * dt);
      f.step += dt * f.speed * dash * 0.055;
    } else if (f.biteCool <= 0) {
      f.biteCool = 0.85;
      s.hp -= f.bite;
      s.events.push({ kind: 'bitten', amount: f.bite, a: f.a });
      if (s.hp <= 0) { s.hp = 0; s.alive = false; }
    }
  }

  // --- the gun
  s.cool -= dt * rateOf(s);
  while (s.cool <= 0) {
    if (!fire(s)) { s.cool = 0; break; }
    s.cool += 1;
  }

  // --- the shots, which home on what they were sent at
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const b = s.shots[i];
    const f = s.foes.find((o) => o.id === b.at && o.hp > 0);
    if (!f) { s.shots.splice(i, 1); continue; }
    const p = placeOf(f);
    const dx = p.x - b.x, dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    const move = Base.bullet * dt;
    if (d <= move + f.size * 14) {
      f.hp -= b.damage;
      f.hurt = 1;
      s.shots.splice(i, 1);
      s.events.push({ kind: 'struck', x: p.x, y: p.y, size: f.size });
      if (f.hp <= 0) {
        const got = f.bounty * gainOf(s);
        s.coins += got;
        s.earned += got;
        s.kills += 1;
        s.events.push({ kind: 'killed', x: p.x, y: p.y, size: f.size, got, key: f.key });
      }
      continue;
    }
    b.x += (dx / d) * move;
    b.y += (dy / d) * move;
  }

  s.foes = s.foes.filter((f) => f.hp > 0);
  return s;
}

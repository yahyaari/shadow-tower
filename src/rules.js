// The game, with nothing drawn and nothing clicked.
//
// No DOM, no canvas, no audio: everything is arithmetic over a state object, so a bot can play it
// in Node. In a game that is a pile of interacting spells that is not a nicety - whether it works
// is entirely a question of whether the pile is balanced, and nobody can judge a pile by playing
// it through twice.
//
// You bring four or five spells (the loadout, chosen from what the account has unlocked) and they
// all cast from the first second. What a run *is* is what you do to them: every level up offers
// cards, most of them ordinary boosts, and every fifth boost on a spell turns into a tier - a
// card that changes what the spell does rather than how much of it there is.

import { Spells, Passives, BoostsPerTier, MostPassive, passiveKeys, LoadoutSize, Always } from './spells.js';
import { takes, familyFor, Roles } from './foes.js';
import { liftAt } from './upgrades.js';
import { say, UI } from './text.js';

export { Spells, Passives, BoostsPerTier, MostPassive, passiveKeys, LoadoutSize, Always };
export const spellKeys = Object.keys(Spells);

export const Arena = 560;
export const Wall = 76;
export const Reach = 96;
export const StageWaves = 72;

export const Base = { wall: 300, bullet: 560 };

/**
 * How many evolutions one spell may hold - so, four tiers at most.
 *
 * This is what keeps the loadout a loadout. Without a cap, a bot carrying one spell outlived a
 * bot carrying five by nearly three to one: every evolution fires on every hit, so five of them
 * stacked on a single fast spell is five area effects a dozen times a second, and nothing spread
 * across five spells comes close. Depth has to run out before breadth stops being worth it.
 */
export const MostEvos = 3;

export const Heat = { perClick: 0.22, fade: 0.8, most: 1, lift: 0.9 };

export const Kinds = {
  walker: { hp: 12, speed: 44, bite: 3, xp: 1, size: 1 },
  runner: { hp: 8, speed: 86, bite: 2, xp: 1, size: 0.84, sprint: 1.9 },
  brute:  { hp: 40, speed: 25, bite: 8, xp: 3, size: 1.12 },
  warden: { hp: 420, speed: 17, bite: 22, xp: 14, size: 2.5, boss: true },
  herald: { hp: 460, speed: 27, bite: 13, xp: 14, size: 2.1, boss: true, calls: 5.5 },
  shade:  { hp: 320, speed: 42, bite: 10, xp: 14, size: 1.9, boss: true, splits: true },
};

/**
 * Which boss walks in, by stage.
 *
 * Three of them, taking turns, because stages go on for ever and one boss met for the sixteenth
 * time is not a boss, it is a wall with a health bar. What makes each one different is what it
 * DOES, not what its numbers are - a second sponge with more health would be the same fight.
 *
 *   warden  - slow, enormous, and hits the wall harder than anything else. A duel.
 *   herald  - keeps calling runners in from where it stands. Ignore it and the field fills up.
 *   shade   - quick and thin, and when it falls it comes apart into two of itself. It bites the
 *             wall far more softly than the others: it reaches the wall in a third of the time
 *             and then stands there twice, and at the warden's bite that left no stage it
 *             guarded with a star on it.
 */
export const Bosses = ['warden', 'herald', 'shade'];

/**
 * The two numbers the codex has to say out loud.
 *
 * Named here rather than written into the description, because a description with a number typed
 * into it is a description that lies the first time the number changes - and this one already
 * had: it still said the herald called three in after it had been cut to two.
 */
export const HeraldCalls = 2;
export const ShadeKeeps = 0.7;

export const bossFor = (stage) => Bosses[(Math.max(1, Math.floor(stage)) - 1) % Bosses.length];

export const SprintAt = 210;

/**
 * How hard it is right now.
 *
 * Flat for the first `Grace` seconds. A run opens with one spell and builds the rest out of
 * cards, so the opening minute is the weakest the player ever is - and with a ramp that started
 * climbing immediately, fewer cleared the first stage than the second, which is the wrong way
 * round for the stage everybody sees.
 *
 * After that it climbs, and the exponent on health is steep, because by the fourth stage the
 * player has four spells with tiers on them and the wave has to have grown into that.
 */
export const Grace = 25;

/**
 * How hard it is right now.
 *
 * Two parts. Within a stage it climbs with the clock, flat for the first `Grace` seconds because
 * every stage opens with one spell and the rest have to be picked up. Between stages it steps up
 * by a fixed amount, rather than carrying on from where the last one stopped - a stage is played
 * from scratch, so stage five cannot start at five minutes' worth of wave with one spell in hand.
 */
export const StageStep = 0.2;
export const pressure = (s) =>
  (1 + Math.max(0, s.t - Grace) / 56) * (1 + ((s.stage || 1) - 1) * StageStep);
export const spawnEvery = (s) => Math.max(0.05, 0.85 / Math.pow(pressure(s), 1.3));

export function seeded(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/**
 * What the next level of a run costs, in kills.
 *
 * Flat enough that a run hands out around thirty picks. It used to climb at 1.3 a level, which
 * gave about eighteen - and with five spells needing five boosts each before any of them becomes
 * anything, eighteen picks meant nothing ever tiered up. The bot carrying five spells reached the
 * two-minute mark with no evolutions at all while the bot carrying one had already tiered twice,
 * which is how a loadout of five ended up weaker than a loadout of one.
 *
 * Thirty picks is five spells at six each: everything tiers once, and what you favour tiers twice.
 */
export function xpFor(level) {
  return Math.round(2 * Math.pow(1.1, level - 1) + (level - 1) * 0.8);
}

// --- a run --------------------------------------------------------------------------------------

/**
 * A run.
 *
 * `loadout` is what you *may* end up with; `kit` is what is actually casting. Only the fixed
 * spell is in the kit when a run opens - the other three sit in the loadout waiting to be offered
 * as cards. That is the difference between a loadout and a starting hand: you begin a run with
 * one spell every time and build the rest, and what you brought decides what you can build.
 */
/** What the hero ladder adds, when nothing has been bought. */
export const NoHero = { dmg: 0, wall: 0, cd: 0, area: 0, mend: 0, gain: 0 };

export const NoLevels = {};

/**
 * `levels` is the permanent level each spell carries, bought between runs with gold and shards.
 * It arrives as plain data and is never written to, so a run cannot change what the account owns.
 */
export function begin(seed = Date.now(), loadout = [Always], stage = 1, hero = NoHero, levels = NoLevels) {
  const carried = loadout.filter((k) => Spells[k]).slice(0, LoadoutSize);
  if (!carried.includes(Always)) carried.unshift(Always);
  const kit = { [Always]: { tier: 1, boosts: {}, evos: [], taken: 0 } };
  const cools = { [Always]: 0.25 };
  return {
    roll: seeded(seed),
    t: 0,
    stage: Math.max(1, Math.floor(stage)),
    stageT: 0,
    boss: null,
    phase: 'playing',             // 'playing' | 'picking' | 'done' | 'lost'
    hero: { ...NoHero, ...hero },
    levels: { ...levels },
    wall: Base.wall + (hero.wall || 0), maxWall: Base.wall + (hero.wall || 0),
    level: 1, xp: 0, need: xpFor(1),
    kills: 0,
    heat: 0,
    loadout: carried,
    kit,
    passives: {},
    cools,
    choices: [],
    foes: [],
    shots: [],
    grounds: [],                  // fire and storms left lying on the field
    fx: [],
    bladeAt: 0,
    bladeHits: {},
    aim: -Math.PI / 2,
    cast: 0,
    events: [],
    nextIn: 1.2,
    id: 1,
  };
}

/**
 * The only thing left that speeds up everything at once, and it is not a card - it is the tapping.
 *
 * Might, Haste and Reach used to multiply every spell from the outside. They are gone: a card that
 * makes everything better by the same amount cannot say which spell it is for, and how good it was
 * depended on a loadout it never mentioned. All of it moved onto the spells, with its own number
 * on each.
 */
export const haste = (s) => 1 + s.heat * Heat.lift;

export const carries = (s, key) => !!s.kit[key];

/** Every spell actually casting, in loadout order. */
export const carrying = (s) => s.loadout.filter((k) => s.kit[k]);

/**
 * How much of the run went into each spell that was actually cast.
 *
 * This is what shards are paid on. A spell brought and cast still earns something for having been
 * carried; the one fed all run earns the most. It is why a run with four spells does not simply
 * pay four times over - what you concentrated on is what you bank.
 */
export const investedIn = (s) =>
  Object.fromEntries(carrying(s).map((k) => [k, s.kit[k].taken || 0]));

/** Brought, but not taken yet - the ones the cards can still hand you. */
export const waiting = (s) => s.loadout.filter((k) => !s.kit[k]);

/**
 * What a spell actually does right now.
 *
 * Base, plus every boost taken, plus a flat lift per tier, plus the passives. One function, so
 * the card text, the bot and the thing that fires all read the same numbers - a second place
 * that works out damage is a second place that drifts out of step with the first.
 */
export function statsOf(s, key) {
  const sp = Spells[key];
  const kit = s.kit[key];
  if (!sp || !kit) return null;

  const add = { dmg: 0, cd: 0, count: 0, spread: 0, blast: 0, pierce: 0, jumps: 0, chill: 0, ring: 0, whirl: 0 };
  for (const [bk, n] of Object.entries(kit.boosts)) {
    const b = sp.boosts.find((x) => x.key === bk);
    if (!b) continue;
    for (const [knob, v] of Object.entries(b.does)) add[knob] = (add[knob] || 0) + v * n;
  }

  const hero = s.hero || NoHero;
  const tierLift = Math.min(0.9, (kit.tier - 1) * 0.3);
  // Each spell's own area, from its own Wider cards. There is no global one any more, so this is
  // also what the spell's evolutions are sized by - a wider Fireball leaves a wider fire.
  const size = (1 + add.blast) * (1 + hero.area);

  return {
    tier: kit.tier,
    size,
    element: sp.element || null,
    // Three sources, and they multiply: the cards taken this run, the hero comb, and the
    // permanent level this spell has been raised to. The level is the smallest of the three on
    // purpose - it is the one that never goes away.
    damage: sp.damage * (1 + add.dmg + tierLift) * (1 + hero.dmg) * (1 + liftAt((s.levels || {})[key])),
    // Two floors, and the absolute one is the important half.
    //
    // Damage, projectile count and fire rate multiply each other, so a spell that can halve its
    // own cooldown AND quadruple its projectiles is not four times better, it is eight - which is
    // how a bot carrying one spell reached 831 damage a second while a bot carrying four managed
    // 262. No spell may cast faster than three times a second however much is poured into it.
    every: Math.max(0.3, (sp.every * Math.max(0.6, 1 + add.cd) * (1 - hero.cd)) / haste(s)),
    count: (sp.count || 1) + add.count,
    spread: (sp.spread || 0.34) + add.spread,
    blast: (sp.blast || 0) * size,
    pierce: add.pierce,
    jumps: (sp.jumps || 0) + add.jumps,
    chill: (sp.chill || 0) + add.chill,
    wide: (sp.wide || 0) * size,
    ring: (150 + kit.tier * 14) * (1 + add.ring),
    whirl: (1.5 + kit.tier * 0.18) * (1 + add.whirl),
    evos: kit.evos,
  };
}

export function spawn(s, kindKey = null, angle = null) {
  const r = s.roll();
  const p = pressure(s);
  const key = kindKey || (p > 1.5 && r < 0.12 ? 'brute' : r < 0.2 + Math.min(0.25, p * 0.1) ? 'runner' : 'walker');
  const k = Kinds[key];
  const tough = Math.pow(p, 1.4);
  // Which family it belongs to, drawn from the stage's list. Bosses have none: they are single
  // creatures with their own identity, and a Warden that resisted fire because the stage happened
  // to be full of wurms would be a boss fight decided by the wallpaper.
  const foe = {
    id: s.id++,
    key,
    boss: !!k.boss,
    family: k.boss ? null : familyFor(s.stage, s.roll()),
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
    calls: k.calls || 0,
    callIn: k.calls || 0,
    splits: !!k.splits,
  };
  s.foes.push(foe);
  return foe;
}

export const placeOf = (f) => ({ x: Math.cos(f.a) * f.r, y: Math.sin(f.a) * f.r });

// --- finding something to hit ---------------------------------------------------------------

function nearest(s, fromX = 0, fromY = 0, skip = null) {
  let best = null, near = Infinity;
  for (const f of s.foes) {
    if (f.hp <= 0 || (skip && skip.has(f.id))) continue;
    const p = placeOf(f);
    const d = Math.hypot(p.x - fromX, p.y - fromY);
    if (d < near) { near = d; best = f; }
  }
  return best;
}

function strongest(s) {
  let best = null;
  for (const f of s.foes) if (f.hp > 0 && (!best || f.hp > best.hp)) best = f;
  return best;
}

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

// --- doing damage -----------------------------------------------------------------------------

/**
 * Damage, and the one place a creature's family can change it.
 *
 * Everything that hurts anything comes through here, so the resistance table is applied once
 * rather than at each of the seven places that do damage - which is also why adding a family
 * costs nothing: it is a row in a table, not a branch in the combat code.
 */
function wound(s, f, amount, chill = 0, element = null) {
  if (f.hp <= 0) return;
  f.hp -= amount * takes(f.family, element);
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

function splash(s, x, y, radius, amount, chill = 0, element = null) {
  for (const f of s.foes) {
    if (f.hp <= 0) continue;
    const p = placeOf(f);
    if (Math.hypot(p.x - x, p.y - y) <= radius) wound(s, f, amount, chill, element);
  }
}

/**
 * Everything a spell's tiers do where it landed.
 *
 * Called at each point a spell touches the world - where a bolt struck, each link of a chain, the
 * far end of a beam. The children it throws are marked so they never evoke in turn: a splinter
 * that splinters is a run that stops at one frame.
 */
function evoke(s, key, x, y, damage) {
  const kit = s.kit[key];
  if (!kit || !kit.evos.length) return;
  const st = statsOf(s, key);
  const size = st.size;
  const element = st.element;

  for (const evo of kit.evos) {
    if (evo === 'burst') {
      splash(s, x, y, 74 * size, damage * 0.55, 0, element);
      s.fx.push({ kind: 'burst', x, y, r: 74 * size, life: 0.3, max: 0.3 });

    } else if (evo === 'split') {
      // The two it throws hunt. Sent off at a random angle they simply left the field: the test
      // measuring damage with and without this evolution read exactly the same number both ways.
      const skip = new Set();
      for (let i = 0; i < 2; i++) {
        const mark = nearest(s, x, y, skip);
        if (!mark) break;
        skip.add(mark.id);
        s.shots.push({
          key, child: true,
          x, y, z: 0, a: 0,
          at: mark.id, damage: damage * 0.45, blast: 0, chill: 0, element,
          pierce: 0, hits: new Set(), falls: false, life: 1.4,
        });
      }

    } else if (evo === 'fire') {
      s.grounds.push({
        // The pool is fire and the storm is storm, whichever spell dropped them. A Fireball
        // that borrowed Lightning's storm really does leave a storm - and a spider really does
        // shrug it off.
        kind: 'fire', x, y, r: 62 * size, life: 3.2, max: 3.2, element: 'fire',
        every: 0.4, next: 0, damage: damage * 0.3,
      });

    } else if (evo === 'storm') {
      s.grounds.push({
        kind: 'storm', x, y, r: 150 * size, life: 2.2, max: 2.2, element: 'storm',
        every: 0.34, next: 0, damage: damage * 0.42,
      });

    } else if (evo === 'freeze') {
      splash(s, x, y, 86 * size, damage * 0.3, 2.2, 'ice');
      s.fx.push({ kind: 'frost', x, y, r: 86 * size, life: 0.32, max: 0.32 });
    }
  }
}

// --- casting ------------------------------------------------------------------------------------

function throwOne(s, key, st, from, a, markId) {
  s.shots.push({
    key,
    child: false,
    x: from.x, y: from.y, z: from.z || 0,
    a,
    at: markId,
    damage: st.damage,
    element: st.element,
    blast: st.blast,
    chill: st.chill,
    pierce: st.pierce,
    hits: new Set(),
    falls: !!Spells[key].falls,
    life: 3,
  });
}

function castSpell(s, key) {
  const sp = Spells[key];
  const st = statsOf(s, key);
  if (!st) return false;

  if (sp.instant === 'nova') {
    for (let i = 0; i < st.count; i++) {
      const ring = Math.max(60, st.blast * (1 + i * 0.4));
      splash(s, 0, 0, ring, st.damage * (i ? 0.7 : 1), st.chill, st.element);
      s.fx.push({ kind: 'nova', x: 0, y: 0, r: ring, life: 0.42, max: 0.42 });
      evoke(s, key, 0, 0, st.damage);
    }
    s.cast = 1;
    return true;
  }

  const mark = aimAt(s, sp.seeks || 'near');
  if (!mark) return false;

  if (sp.instant === 'chain') {
    for (let round = 0; round < st.count; round++) {
      const hit = new Set();
      const from0 = round === 0 ? mark : nearest(s, 0, 0, hit);
      let from = from0;
      const points = [{ x: 0, y: -46 }];
      for (let i = 0; i < st.jumps && from; i++) {
        const p = placeOf(from);
        points.push(p);
        hit.add(from.id);
        wound(s, from, st.damage, st.chill, st.element);
        evoke(s, key, p.x, p.y, st.damage);
        let next = null, best = Infinity;
        for (const f of s.foes) {
          if (f.hp <= 0 || hit.has(f.id)) continue;
          const q = placeOf(f);
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < best && d < 190 * st.size) { best = d; next = f; }
        }
        from = next;
      }
      if (points.length > 1) s.fx.push({ kind: 'chain', points, life: 0.26, max: 0.26 });
    }
    s.cast = 1;
    return true;
  }

  if (sp.instant === 'beam') {
    const seen = new Set();
    for (let i = 0; i < st.count; i++) {
      const target = i === 0 ? mark : nearest(s, 0, 0, seen);
      if (!target) break;
      seen.add(target.id);
      const p = placeOf(target);
      const a = Math.atan2(p.y, p.x);
      const wide = Math.max(10, st.wide);
      for (const f of s.foes) {
        if (f.hp <= 0) continue;
        const q = placeOf(f);
        const along = q.x * Math.cos(a) + q.y * Math.sin(a);
        const off = Math.abs(-q.x * Math.sin(a) + q.y * Math.cos(a));
        if (along > 0 && off <= wide / 2) {
          wound(s, f, st.damage, st.chill, st.element);
          evoke(s, key, q.x, q.y, st.damage);
        }
      }
      s.aim = a;
      s.fx.push({ kind: 'beam', a, wide, life: 0.2, max: 0.2 });
    }
    s.cast = 1;
    return true;
  }

  // everything else flies
  const p = placeOf(mark);
  const a = Math.atan2(p.y, p.x);
  s.aim = a;
  const n = st.count;
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i / (n - 1) - 0.5) * st.spread * (n - 1) : 0;
    const from = sp.falls
      ? { x: p.x + (i ? (s.roll() - 0.5) * 160 : 0), y: p.y + (i ? (s.roll() - 0.5) * 160 : 0), z: 620 }
      : { x: Math.cos(a + off) * Wall, y: Math.sin(a + off) * Wall, z: 0 };
    throwOne(s, key, st, from, a + off, sp.homing && i === 0 ? mark.id : null);
  }
  s.cast = 1;
  return true;
}

// --- the cards ------------------------------------------------------------------------------------

/** Has this spell earned its next tier? Every fifth boost. */
export const tierDue = (s, key) => !!s.kit[key] && s.kit[key].taken >= s.kit[key].tier * BoostsPerTier;

/**
 * The evolutions a spell may still be offered.
 *
 * `needs` is the combination rule and it is absolute: an evolution that borrows another spell is
 * not merely rare without it, it does not exist. "An electric storm where it lands" is the
 * lightning spell lending itself to this one, and you cannot lend what you are not carrying.
 */
export function evolutionsFor(s, key) {
  const kit = s.kit[key];
  if (!kit || kit.evos.length >= MostEvos) return [];
  return Spells[key].evolutions.filter(
    (e) => !kit.evos.includes(e.onHit) && (!e.needs || carries(s, e.needs))
  );
}

/** The boosts a spell may still be offered: the ones not already taken to their limit. */
export function boostsFor(s, key) {
  const kit = s.kit[key];
  if (!kit) return [];
  return Spells[key].boosts.filter((b) => (kit.boosts[b.key] || 0) < (b.most || 3));
}

/**
 * Three things to choose between.
 *
 * A spell with a tier owing offers that tier and nothing else of its own, so the big card cannot
 * be crowded out by a stack of small ones. Everything else goes in together: ordinary boosts for
 * what you carry, and the passives.
 */
export function offer(s) {
  // One entry per spell, not one per upgrade. Built the other way round - every available boost
  // its own entry - a spell with five boosts put five tickets in the hat and its tier card put
  // one, so tiers almost never came up: the bot finished a whole run having taken none.
  const pool = [];
  const due = [];

  // A spell you brought but have not taken yet. These are the cards that turn one spell into
  // four, so they go in the pool in their own right rather than competing with a boost.
  for (const key of waiting(s)) pool.push({ what: 'spell', key });

  for (const key of carrying(s)) {
    if (tierDue(s, key)) {
      const evos = evolutionsFor(s, key);
      if (evos.length) {
        due.push({ what: 'evolution', key, evo: evos[Math.floor(s.roll() * evos.length)].key });
        continue;
      }
      // Nothing left for it to become: it goes back to ordinary boosts rather than offering
      // nothing, which would quietly drop a spell out of the pool for the rest of the run.
    }
    const boosts = boostsFor(s, key);
    if (boosts.length) {
      pool.push({ what: 'boost', key, boost: boosts[Math.floor(s.roll() * boosts.length)].key });
    }
  }
  // Mend only turns up once the wall has actually been hit. Offering to repair something at full
  // height is a wasted card, and with only one passive left it would otherwise be a third of
  // every choice in the opening minute, when nothing has reached the wall yet.
  for (const k of passiveKeys) {
    if ((s.passives[k] || 0) >= MostPassive) continue;
    if (k === 'mend' && s.wall >= s.maxWall && !s.passives.mend) continue;
    pool.push({ what: 'passive', key: k });
  }

  // A tier that has been earned is shown, not rolled for. "Pick it five times and it levels up"
  // has to mean that, or the promise the card made is a lottery ticket.
  const out = due.slice(0, 3);
  for (let guard = 0; guard < 240 && out.length < 3 && pool.length; guard++) {
    const pick = pool[Math.floor(s.roll() * pool.length)];
    if (out.some((o) => o.key === pick.key)) continue;
    out.push(pick);
    if (out.length >= pool.length + due.length) break;
  }
  return out;
}

/**
 * What a card says: the name of the spell, and the power it gives. Nothing else.
 *
 * It used to carry the upgrade's own invented name, how many of that upgrade you had, and how
 * many more picks until the spell levelled - three pieces of bookkeeping on a card you read in
 * two seconds while things are walking at you. A card is a choice, not a progress report.
 *
 * Here rather than in the view, because a card that promises one thing and does another is the
 * worst bug this game can have, and a test can only catch it if it can read the promise. That
 * means this one function knows about language - `text.js` has no DOM in it, so the rules stay
 * runnable in Node either way.
 */
export function describe(s, pick) {
  if (!pick) return null;

  if (pick.what === 'passive') {
    const p = Passives[pick.key];
    return { title: say(p.name), text: say(p.tells), mark: pick.key };
  }

  const sp = Spells[pick.key];

  if (pick.what === 'spell') {
    return { badge: say(UI.newSpell), title: say(sp.name), text: say(sp.tells), mark: pick.key, big: true };
  }

  if (pick.what === 'evolution') {
    const evo = sp.evolutions.find((e) => e.onHit === pick.evo);
    return {
      title: say(sp.name),
      text: say(evo.tells),
      mark: pick.key,
      big: true,
      borrows: evo.needs ? say(Spells[evo.needs].name) : null,
    };
  }

  const b = sp.boosts.find((x) => x.key === pick.boost);
  return { title: say(sp.name), text: say(b.tells), mark: pick.key };
}

export function take(s, index) {
  if (s.phase !== 'picking') return false;
  const pick = s.choices[index];
  if (pick) {
    if (pick.what === 'passive') {
      s.passives[pick.key] = (s.passives[pick.key] || 0) + 1;
      if (pick.key === 'mend') { s.maxWall += 20; s.wall += 20; }
    } else if (pick.what === 'spell') {
      s.kit[pick.key] = { tier: 1, boosts: {}, evos: [], taken: 0 };
      s.cools[pick.key] = 0.15;
    } else if (pick.what === 'boost') {
      const kit = s.kit[pick.key];
      kit.boosts[pick.boost] = (kit.boosts[pick.boost] || 0) + 1;
      kit.taken += 1;
    } else if (pick.what === 'evolution') {
      const kit = s.kit[pick.key];
      kit.evos.push(pick.evo);
      kit.tier += 1;
    }
    s.events.push({ kind: 'took', pick });
  }
  s.choices = [];
  s.phase = 'playing';
  return true;
}

/**
 * Advances the fight by one frame of wall clock, at `speed` times normal.
 *
 * More steps, never one longer one. A single step of twice the length walks a projectile straight
 * past what it should have hit - collisions are checked where things are, not where they were, so
 * the longer the step the more it misses. 1.5x is three half-steps for the same reason.
 *
 * Lives here rather than in the loop so it can be tested without a canvas. Measuring it through
 * the browser does not work: the headless software renderer is already the bottleneck, so asking
 * it for twice the simulation just halves the frame rate and the game clock ends up no further on.
 */
export function advance(s, dt, speed = 1, after = null) {
  const times = speed === 1.5 ? 3 : speed === 2 ? 2 : 1;
  const slice = (dt * speed) / times;
  for (let i = 0; i < times; i++) {
    step(s, slice);
    if (after) after();
    if (s.phase !== 'playing') break;
  }
  return dt * speed;
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
  s.stageT += dt;
  s.heat = Math.max(0, s.heat - Heat.fade * dt);
  s.cast = Math.max(0, s.cast - dt * 5);

  if (!s.boss && !s.bossDone && s.stageT >= StageWaves) {
    s.bossDone = true;
    s.boss = spawn(s, bossFor(s.stage));
    s.boss.hp *= 1 + (s.stage - 1) * 0.42;
    s.boss.maxHp = s.boss.hp;
    s.events.push({ kind: 'boss', stage: s.stage, key: s.boss.key });
  }

  s.nextIn -= dt;
  const thin = s.boss ? 2.4 : 1;
  while (s.nextIn <= 0) { spawn(s); s.nextIn += spawnEvery(s) * thin; }

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
      f.biteCool = f.boss ? 1.4 : 0.9;
      s.wall -= f.bite;
      s.events.push({ kind: 'bitten', amount: f.bite, a: f.a });
      if (s.wall <= 0) { s.wall = 0; s.phase = 'lost'; return s; }
    }

    // The herald's whole fight: it keeps calling, from where it stands, for as long as it lives.
    // Killing it is not optional the way killing a sponge is - it is the only way to stop the
    // field filling up behind everything else you are shooting at.
    if (f.calls > 0 && f.hp > 0) {
      f.callIn -= dt;
      if (f.callIn <= 0) {
        f.callIn = f.calls;
        // Two, not three. Three was twenty extra runners over a boss fight, and the wall never
        // came out of it whole - which quietly took three stars off the table from stage two on.
        for (let n = 0; n < HeraldCalls; n++) spawn(s, 'runner', f.a + (n - (HeraldCalls - 1) / 2) * 0.44);
        s.events.push({ kind: 'called', a: f.a });
      }
    }
  }

  const repair = (s.passives.mend || 0) * 1.1 + (s.hero ? s.hero.mend : 0);
  if (repair > 0) s.wall = Math.min(s.maxWall, s.wall + repair * dt);

  // --- the spells, each on its own clock
  for (const key of carrying(s)) {
    if (Spells[key].orbit) continue;
    s.cools[key] -= dt;
    if (s.cools[key] <= 0) {
      const went = castSpell(s, key);
      s.cools[key] = went ? statsOf(s, key).every : 0.2;
      if (went) s.events.push({ kind: 'cast', key });
    }
  }

  // --- the orbiting blades, a position rather than a cooldown
  if (s.kit.blade) {
    const st = statsOf(s, 'blade');
    s.bladeAt = (s.bladeAt + dt * st.whirl * (1 + s.heat * 0.4)) % (Math.PI * 2);
    for (let i = 0; i < st.count; i++) {
      const a = s.bladeAt + (i / st.count) * Math.PI * 2;
      const bx = Math.cos(a) * st.ring, by = Math.sin(a) * st.ring;
      for (const f of s.foes) {
        if (f.hp <= 0 || (s.bladeHits[f.id] || 0) > s.t) continue;
        const p = placeOf(f);
        if (Math.hypot(p.x - bx, p.y - by) < 34 + f.size * 12) {
          s.bladeHits[f.id] = s.t + 0.45;
          wound(s, f, st.damage, st.chill, st.element);
          evoke(s, 'blade', p.x, p.y, st.damage);
        }
      }
    }
  }

  // --- fire and storms left lying about
  for (let i = s.grounds.length - 1; i >= 0; i--) {
    const g = s.grounds[i];
    g.life -= dt;
    g.next -= dt;
    if (g.next <= 0) {
      g.next = g.every;
      if (g.kind === 'fire') {
        splash(s, g.x, g.y, g.r, g.damage, 0, g.element);
      } else {
        // a storm takes one at a time rather than everything, which is what makes it a storm
        const mark = nearest(s, g.x, g.y);
        if (mark) {
          const p = placeOf(mark);
          if (Math.hypot(p.x - g.x, p.y - g.y) <= g.r) {
            wound(s, mark, g.damage, 0, g.element);
            s.fx.push({ kind: 'chain', points: [{ x: g.x, y: g.y - 120 }, p], life: 0.2, max: 0.2 });
          }
        }
      }
    }
    if (g.life <= 0) s.grounds.splice(i, 1);
  }

  // --- the things in flight
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const b = s.shots[i];
    b.life -= dt;
    let landed = false;
    let where = null;

    if (b.falls) {
      b.z -= 1500 * dt;
      if (b.z <= 0) { landed = true; where = { x: b.x, y: b.y }; }
    } else if (b.at != null) {
      const f = s.foes.find((o) => o.id === b.at && o.hp > 0);
      if (!f) { b.at = null; } else {
        const p = placeOf(f);
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const move = Base.bullet * dt;
        b.a = Math.atan2(dy, dx);
        if (d <= move + f.size * 14) { b.x = p.x; b.y = p.y; landed = true; where = p; }
        else { b.x += (dx / d) * move; b.y += (dy / d) * move; }
      }
    }
    if (!landed && b.at == null && !b.falls) {
      b.x += Math.cos(b.a) * Base.bullet * dt;
      b.y += Math.sin(b.a) * Base.bullet * dt;
      for (const f of s.foes) {
        if (f.hp <= 0 || b.hits.has(f.id)) continue;
        const p = placeOf(f);
        if (Math.hypot(p.x - b.x, p.y - b.y) < 16 + f.size * 13) { landed = true; where = p; break; }
      }
      if (!landed && Math.hypot(b.x, b.y) > Arena * 1.3) { s.shots.splice(i, 1); continue; }
    }

    if (landed) {
      if (b.blast > 0) {
        splash(s, b.x, b.y, b.blast, b.damage, b.chill, b.element);
        s.fx.push({ kind: b.chill ? 'frost' : 'burst', x: b.x, y: b.y, r: b.blast, life: 0.34, max: 0.34 });
      } else {
        const mark = nearest(s, b.x, b.y, b.hits);
        if (mark) {
          const p = placeOf(mark);
          if (Math.hypot(p.x - b.x, p.y - b.y) < 36) { wound(s, mark, b.damage, b.chill, b.element); b.hits.add(mark.id); }
        }
      }
      if (!b.child) evoke(s, b.key, where ? where.x : b.x, where ? where.y : b.y, b.damage);

      // Piercing: it carries on rather than stopping, and never hits the same one twice.
      if (b.pierce > 0 && !b.falls && b.blast <= 0) {
        b.pierce -= 1;
        b.at = null;
        continue;
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

  // The shade: killed once, it is two of itself, each with half of what it had. Done here rather
  // than wherever the damage landed, so every spell and every evolution splits it the same way.
  for (const f of s.foes) {
    if (f.hp > 0 || !f.splits) continue;
    f.splits = false;
    for (const side of [-1, 1]) {
      // The halves come back at the rim, not where the shade fell. Killing it pushes it away and
      // it has to walk in again - which is the fight, and is also what stops two of them standing
      // at the wall chewing on it for the rest of the stage. With them reforming where they died,
      // no stage the shade guarded could be finished with the wall whole.
      const half = spawn(s, f.key, f.a + side * 0.3);
      half.splits = false;
      half.hp = half.maxHp = f.maxHp * ShadeKeeps;
      half.size = f.size * 0.76;
      half.bite = f.bite * 0.6;
      half.xp = Math.round(f.xp * 0.5);
    }
    s.events.push({ kind: 'split', a: f.a, r: f.r });
  }

  s.foes = s.foes.filter((f) => f.hp > 0);
  for (const id of Object.keys(s.bladeHits)) if (s.bladeHits[id] < s.t - 2) delete s.bladeHits[id];

  // The boss is the end of the stage, and the end of the run. Written as "no boss left standing"
  // rather than "the boss is dead", because the shade dies into two more of itself and a stage
  // that ended on its first death would end halfway through its own fight.
  if (s.bossDone) {
    const standing = s.foes.filter((f) => f.boss);
    s.boss = standing[0] || null;
    if (!standing.length) {
      s.phase = 'done';
      s.events.push({ kind: 'cleared', stage: s.stage });
      return s;
    }
  }

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

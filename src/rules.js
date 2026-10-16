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

import { Spells, Passives, BoostsPerTier, MostPassive, MendPart, MendAfter, passiveKeys, LoadoutSize, CarrySize, Always, Reaches } from './spells.js';
import { Fusions, fusionKeys, fusionOf, anySpell } from './spells.js';
import { takes, familyFor, Roles } from './foes.js';
import { liftAt } from './upgrades.js';
import { say, UI } from './text.js';

export { Spells, Passives, BoostsPerTier, MostPassive, MendPart, MendAfter, passiveKeys, LoadoutSize, CarrySize, Always, Reaches };
export const spellKeys = Object.keys(Spells);

export const Arena = 560;

/**
 * A spell's reach as a word, because the number is arena pixels.
 *
 * Nobody can read 430 as anything. What a player needs off the loadout screen is which of these
 * is artillery and which is close work, so the codex says "long" and "close" and the arithmetic
 * stays where the arithmetic belongs.
 */
export function reachWord(key) {
  const r = Reaches[key] || Arena;
  if (r >= Arena * 0.88) return UI.reachAll;
  if (r >= 400) return UI.reachFar;
  if (r >= 290) return UI.reachMid;
  return UI.reachNear;
}
export const Wall = 76;
export const Reach = 96;
/**
 * How long the waves last before the boss comes, in seconds.
 *
 * Five minutes. It was seventy-two seconds, which made a whole stage about a minute and three
 * quarters - long enough to show the game and too short to build anything in. Over five minutes
 * the wave climbs the whole way and the boss arrives at the end of it.
 */
export const StageWaves = 300;

/**
 * When the boss walks in - ten seconds before the wave stops.
 *
 * It used to arrive exactly as the wave ended, and the last fight was one enormous creature alone
 * on an empty field, which looks like a different game. Those ten seconds are worth about forty
 * creatures at the wave's heaviest, so the boss now arrives in the middle of a crowd and has to
 * be fought through it.
 */
export const BossAt = 290;

/**
 * How long the wave takes to double, in seconds.
 *
 * It was fifty-six, chosen when a stage ended at seventy-two. Left alone over five minutes that
 * reached six and a half times the opening pressure, which is not a climb, it is a cliff.
 */
export const RampOver = 150;

/**
 * How fast a projectile crosses the field.
 *
 * It was 560, which is the width of the whole arena in a second: a shot was a flicker between the
 * wall and whatever it hit, and the player never saw their own spells travel. Slower costs
 * something too - a crowd stays alive longer because the volley aimed at it is still in the air -
 * and that is half of what makes a crowd a crowd.
 */
export const Base = { wall: 300, bullet: 420 };

/**
 * How many evolutions one spell may hold - so, four tiers at most.
 *
 * This is what keeps the loadout a loadout. Without a cap, a bot carrying one spell outlived a
 * bot carrying five by nearly three to one: every evolution fires on every hit, so five of them
 * stacked on a single fast spell is five area effects a dozen times a second, and nothing spread
 * across five spells comes close. Depth has to run out before breadth stops being worth it.
 */
export const MostEvos = 3;

/**
 * Tapping, and how fast it cools.
 *
 * `fade` was 0.8 a second, which with 0.22 a tap means the bar only fills at FOUR taps a second
 * and stays there. Measured on stage three, that was a cliff and not a slope: two taps a second
 * cleared 15 runs in a hundred, three cleared 15, and four cleared 85. Four taps a second for
 * five minutes is twelve hundred taps a run, and this game is going on a portal people open for
 * ten minutes - the reward for playing actively should not require that.
 *
 * At 0.38 the bar fills at under two taps a second, so a comfortable rate gets what the
 * frantic rate got. Nothing above that changes, which is why none of the balance in this file
 * moved: the bot plays at six a second and was already at the ceiling.
 */
export const Heat = { perClick: 0.22, fade: 0.38, most: 1, lift: 0.9 };

/**
 * The creatures, and why they all walk slower than they used to.
 *
 * Everything here is seven tenths of the speed it was. A walker crossed the arena in ten seconds
 * and now takes fifteen, and that single number is what lets a crowd exist: what is standing on
 * the field at any moment is the spawn rate multiplied by how long each one lives, and the
 * complaint that the game is too fast for anything to build up is that second number being too
 * small. It is also what makes the walk in readable - at 86 px a second a runner was across the
 * field before it had been looked at.
 */
export const Kinds = {
  walker: { hp: 12, speed: 31, bite: 3, xp: 1, size: 1 },
  runner: { hp: 8, speed: 60, bite: 2, xp: 1, size: 0.84, sprint: 1.9 },
  brute:  { hp: 40, speed: 18, bite: 8, xp: 3, size: 1.12 },
  warden: { hp: 420, speed: 12, bite: 22, xp: 14, size: 2.5, boss: true },
  herald: { hp: 460, speed: 19, bite: 13, xp: 14, size: 2.1, boss: true, calls: 5.5 },
  shade:  { hp: 320, speed: 30, bite: 10, xp: 14, size: 1.9, boss: true, splits: true },
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

export const SprintAt = 230;

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
/**
 * How much harder each stage is than the one before it - and why it is a curve rather than a step.
 *
 * It was a straight line, a fifth harder every stage, and measured against an account with
 * everything bought the line ran into a cliff: stage nine cleared 95 times in a hundred and
 * stage ten cleared 30. Not a wall, a trapdoor. The reason it is so sharp is that a run has a
 * tipping point - while you kill them faster than they arrive the wall is never touched, and the
 * moment you do not the crowd compounds and the run is already over - so a difficulty line that
 * steps past that point in one stage shows up as a cliff however gentle the step looks.
 *
 * Bent, the first five stages are within a hair of what they were (1.25, 1.42, 1.57, 1.70 against
 * 1.2, 1.4, 1.6, 1.8) and the deep end climbs far more slowly: stage sixteen is now what stage
 * ten used to be. The wall is still there, because a game a finished account can play for ever
 * has nowhere to arrive - it is just six stages further out, which is the whole set of twelve
 * places seen comfortably and some of them twice.
 */
export const StageStep = 0.28;
export const StageBend = 0.75;
export const stageLift = (stage) =>
  1 + Math.pow(Math.max(0, (stage || 1) - 1), StageBend) * StageStep;
export const pressure = (s) =>
  (1 + Math.max(0, s.t - Grace) / RampOver) * stageLift(s.stage || 1);
export const spawnEvery = (s) => Math.max(0.05, 0.92 / Math.pow(pressure(s), 1.3));

/**
 * The horde: how often one arrives, and how big it is.
 *
 * The drip climbs the whole stage and the measurement says nobody can feel it. Sampled every
 * thirty seconds through a cleared stage, the crowd standing on the field read
 * 1, 3, 9, 11, 12, 11, 11, 11, 8, 13 - flat from the second minute to the fifth, because a drip
 * that gets faster against a player who also gets faster is two curves cancelling each other out.
 * Pressure that can only be read off a graph is not pressure.
 *
 * A horde does not cancel. A dozen or more arrive at once and the field is genuinely full for
 * the twenty seconds after one lands, which is the shape of a stage: breathe, brace, breathe,
 * brace.
 *
 * They come from ALL THE WAY ROUND, and that was the player's correction. The first version
 * dropped each horde inside an arc of a radian and a half, on the reasoning that one side of the
 * tower about to be lost reads better than a ring. Played, it read as the arena having four
 * sides - north, south, east and west, taking turns - which is the opposite of a tower with
 * things closing in on it from everywhere. A ring it is, and the crowd is what carries it.
 */
export const SurgeEvery = 24;
export const surgeSize = (s) => Math.round(5 + pressure(s) * 3.2);

export function seeded(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

/**
 * The highest a run can reach, and the end of the cards.
 *
 * Twenty-three, and a run cannot level past it. Before, the level simply went on climbing: a
 * cleared stage finished at level 35 with thirty-four picks taken, and the last ten of those went
 * into spells that had already run out of anything to be given, against a wave the player was
 * already ahead of. A ceiling makes the ladder mean something - twenty-two picks across five
 * spells is four each, so what a run becomes is a question of where they went, and the last
 * minute of a stage is fought with what you built rather than with what is still arriving.
 */
export const MaxLevel = 23;

/** Whether this run has taken everything it can. */
export const maxed = (s) => s.level >= MaxLevel;

/**
 * What the next level of a run costs, in kills - and why the stage number is in it.
 *
 * Chosen against the measurement rather than guessed. Sampled every thirty seconds, a cleared
 * stage one earns 27, 78, 132, 198, 299, 402, 524, 649, 804, 975 experience; this ladder totals
 * about 945 to the ceiling, so the last pick lands at around five minutes - with the heaviest
 * horde and the boss still to come. The first ladder totalled 620 and got there by 4:15, and the
 * player said exactly what that feels like: nothing left to choose while the stage runs on.
 *
 * The stage is in it because a deeper stage pays far more experience for the same five minutes -
 * stage three earns 1473 where stage one earns 975 - so a fixed ladder would hand stage eight its
 * last card at the three minute mark.
 *
 * But that scaling is spread ACROSS the ladder rather than applied flat to it, and the difference
 * is a whole stage. Flat, the first card of stage five cost nearly twice what the first card of
 * stage one costs - so the hardest openings were also the slowest to arm themselves, and a bare
 * account at stage five died at forty-five seconds having reached level six. The opening is when
 * cards are needed most and it is now identical everywhere; it is the TOP of the ladder that
 * stretches, which is the end that was arriving too early.
 *
 * And it STOPS at stage five, which is the other thing the measurement insisted on. Carried on
 * climbing, the last level of stage twelve cost four times the last level of stage one, and a
 * fully kitted account went from reaching stage thirteen to stalling at ten - three stages of
 * the game deleted to fix the pacing of the three stages anybody is actually playing. Past the
 * fifth they all use the fifth's ladder: the ceiling arrives early down there, and a run that is
 * being overrun at stage twelve has nothing to complain about on that score.
 *
 * It climbs rather than staying flat because the early picks are the ones that have to arrive
 * quickly: a run opens with one spell casting and the other four are cards.
 */
export function xpFor(level, stage = 1) {
  const along = Math.min(1, (level - 1) / (MaxLevel - 1));
  return Math.round(3 * Math.pow(1.21, level - 1) * (1 + (Math.min(5, Math.max(1, stage)) - 1) * 0.27 * along));
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
    // Spells a fusion has used up. They go on firing exactly as they are and can never be fed
    // again - that, and not a lost slot, is what a fusion costs.
    sealed: [],
    fused: [],
    wall: Base.wall + (hero.wall || 0), maxWall: Base.wall + (hero.wall || 0),
    level: 1, xp: 0, need: xpFor(1, stage),
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
    // Yörüngede dönen HER büyünün kendi açısı. Tek bir `bladeAt` vardı ve yörünge kodu da
    // yalnızca `kit.blade`'e bakıyordu: Hale (ok + bıçak birleşmesi) oyunda hiç ateşlenmedi.
    // Ölçüm bunu üç saniyede söyledi - sıfır hasar.
    orbitAt: {},
    bladeHits: {},
    aim: -Math.PI / 2,
    cast: 0,
    events: [],
    nextIn: 1.2,
    surgeIn: SurgeEvery,
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
/**
 * Spells brought but not yet cast - and only while there is a slot free for one.
 *
 * Four slots out of five brought, so the last one in the bag is never offered. Which four you end
 * up with is decided by which cards came and which you took, so the same loadout plays differently
 * twice. A fusion counts against the slots too: it IS a fifth spell on the field, and the two it
 * spends stop being fed, which is what pays for it.
 */
export const waiting = (s) =>
  carrying(s).length >= CarrySize ? [] : s.loadout.filter((k) => !s.kit[k]);

/**
 * What a spell actually does right now.
 *
 * Base, plus every boost taken, plus a flat lift per tier, plus the passives. One function, so
 * the card text, the bot and the thing that fires all read the same numbers - a second place
 * that works out damage is a second place that drifts out of step with the first.
 */
export function statsOf(s, key) {
  const sp = anySpell(key);
  const kit = s.kit[key];
  if (!sp || !kit) return null;

  const add = { dmg: 0, cd: 0, count: 0, spread: 0, blast: 0, pierce: 0, jumps: 0, chill: 0, ring: 0, whirl: 0 };
  for (const [bk, n] of Object.entries(kit.boosts)) {
    const b = sp.boosts.find((x) => x.key === bk);
    if (!b) continue;
    for (const [knob, v] of Object.entries(b.does)) add[knob] = (add[knob] || 0) + v * n;
  }

  const hero = s.hero || NoHero;
  // Her kademe, pick sayısı 34'ten 22'ye indiği için eskiden olduğundan daha çok veriyor.
  const tierLift = Math.min(1.2, (kit.tier - 1) * 0.4);
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
    /**
     * How far from the tower this spell can touch anything.
     *
     * Flat, from the table in `spells.js`, except for the two whose reach is already something
     * else they own: Nova reaches exactly as far as it bursts and Orbit exactly as far as its
     * blade swings, so for those two it is worked out rather than declared. A Wider Nova really
     * does reach further out, which is what the card says.
     */
    reach: sp.instant === 'nova' ? Math.max(60, (sp.blast || 0) * size)
      : sp.orbit ? (150 + kit.tier * 14) * (1 + add.ring) + 40
        : (Reaches[key] || Arena),
    jumps: (sp.jumps || 0) + add.jumps,
    chill: (sp.chill || 0) + add.chill,
    wide: (sp.wide || 0) * size,
    ring: (150 + kit.tier * 14) * (1 + add.ring),
    whirl: (1.5 + kit.tier * 0.18) * (1 + add.whirl),
    evos: kit.evos,
  };
}

/**
 * A horde, from one side.
 *
 * Deliberately spawned through the same `spawn` as the drip, so a horde is made of whatever the
 * stage would have sent anyway - at pressure the brutes turn up in it by themselves. All it
 * changes is when they arrive and from where.
 */
export function surge(s) {
  const many = surgeSize(s);
  // Evenly round the circle, with a random quarter-turn so two hordes are never the same ring,
  // and a little jitter on each so it is a crowd rather than a clock face.
  const from = s.roll() * Math.PI * 2;
  for (let i = 0; i < many; i++) {
    spawn(s, null, from + (i / many) * Math.PI * 2 + (s.roll() - 0.5) * 0.5);
  }
  s.events.push({ kind: 'surge', many });
  return many;
}

export function spawn(s, kindKey = null, angle = null) {
  const r = s.roll();
  const p = pressure(s);
  const key = kindKey || (p > 1.5 && r < 0.12 ? 'brute' : r < 0.2 + Math.min(0.25, p * 0.1) ? 'runner' : 'walker');
  const k = Kinds[key];
  // Canin baskiyla buyume hizi. 1.4'ten indi: hasar pick sayisiyla kabaca DOGRUSAL artiyor,
  // can ise usel - ikisinin makasi bir yerde kapanmak zorunda ve makasin kapandigi yer, yukarida
  // anlatilan devrilme noktasini bir bolumde gecmeye yetiyordu.
  const tough = Math.pow(p, 1.32);
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
    // When it arrived, in stage time. Only the tests read it, and they could not read it before:
    // the one checking that the wave stops for the boss was written against `f.spawnedAt`, which
    // nothing set, so it compared undefined to a number and passed without ever looking.
    spawnedAt: s.stageT,
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

/**
 * Whether a spell may touch this creature at all.
 *
 * `f.r` IS the distance from the tower - everything walks straight in - so a range check is one
 * comparison and not a square root, which is why it can sit in every one of these loops.
 */
const inRange = (f, reach) => reach == null || f.r <= reach;

function nearest(s, fromX = 0, fromY = 0, skip = null, reach = null, most = Infinity) {
  let best = null, near = most;
  for (const f of s.foes) {
    if (f.hp <= 0 || (skip && skip.has(f.id)) || !inRange(f, reach)) continue;
    const p = placeOf(f);
    const d = Math.hypot(p.x - fromX, p.y - fromY);
    if (d < near) { near = d; best = f; }
  }
  return best;
}

function strongest(s, reach = null) {
  let best = null;
  for (const f of s.foes) {
    if (f.hp > 0 && inRange(f, reach) && (!best || f.hp > best.hp)) best = f;
  }
  return best;
}

/**
 * The thickest part of the crowd - counted among everything, aimed only at what is in range.
 *
 * The two halves are deliberately different. A creature standing at the edge of the range with
 * nine more behind it IS the thickest part of the crowd, and a meteor that refused to see the
 * nine because they are a few pixels further out would land somewhere emptier for no reason the
 * player could ever see.
 */
function crowd(s, within = 120, reach = null) {
  let best = null, most = -1;
  for (const f of s.foes) {
    if (f.hp <= 0 || !inRange(f, reach)) continue;
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

const aimAt = (s, how, reach = null) => (
  how === 'strong' ? strongest(s, reach)
    : how === 'crowd' ? crowd(s, 120, reach)
      : nearest(s, 0, 0, null, reach));

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
  // What actually landed, after the family's own table. The number shown over a spider has to be
  // the number it took, or the resistances are a thing the player is told about and never sees.
  const dealt = amount * takes(f.family, element);
  f.hp -= dealt;
  f.hurt = 1;
  if (chill) f.chill = Math.max(f.chill, chill);
  const p = placeOf(f);
  if (f.hp <= 0) {
    s.kills += 1;
    s.xp += f.xp;
    s.events.push({ kind: 'killed', x: p.x, y: p.y, size: f.size, xp: f.xp, dealt, element });
  } else {
    s.events.push({ kind: 'struck', x: p.x, y: p.y, size: f.size, dealt, element });
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
      s.fx.push({ kind: 'burst', x, y, r: 74 * size, life: 0.3, max: 0.3, element });

    } else if (evo === 'split') {
      // The two it throws hunt. Sent off at a random angle they simply left the field: the test
      // measuring damage with and without this evolution read exactly the same number both ways.
      const skip = new Set();
      for (let i = 0; i < 2; i++) {
        // Within reach of where the parent landed, not of the tower: the children belong to the
        // place the spell went off, and one that flew the width of the arena to find something
        // was a splinter with a mind of its own.
        const mark = nearest(s, x, y, skip, null, 300);
        if (!mark) break;
        skip.add(mark.id);
        s.shots.push({
          key, child: true,
          x, y, z: 0, a: 0,
          at: mark.id, damage: damage * 0.45, blast: 0, chill: 0, element,
          pierce: 0, hits: new Set(), falls: false, life: 1.4, reach: Arena,
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
      s.fx.push({ kind: 'frost', x, y, r: 86 * size, life: 0.32, max: 0.32, element: 'ice' });
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
    reach: st.reach,
    hits: new Set(),
    falls: !!anySpell(key).falls,
    life: 3,
  });
}

/**
 * One mark per projectile.
 *
 * A fan of angles was how this worked, and a volley of two hit NOTHING. The offsets are
 * symmetrical, so with two projectiles neither of them goes where the spell was aimed: both leave
 * at a tenth of a radian to either side, which over 400 px of arena is forty px of miss on each
 * side of a creature twenty-eight px wide. Measured against a standing target for three seconds,
 * one fireball did 33 damage and two did 21 - every count card in the game was a downgrade, and
 * Twin Flame, Second Orb, More Shards and Flanking were all selling a loss.
 *
 * So the fan decides WHICH creature each projectile goes for rather than which way it leaves: the
 * first takes the mark, the rest take whatever stands nearest to it, and `spread` is how far out
 * from the mark they are willing to look. Fewer creatures than projectiles and the spares double
 * up on the ones there are, a hand's width apart - two fireballs on one body is twice the damage,
 * which is what the card promised in the first place.
 */
function marksFor(s, mark, n, st) {
  const out = [mark];
  if (n <= 1) return out;
  const p = placeOf(mark);
  const skip = new Set([mark.id]);
  // How far from the first mark the volley will look for the others, as a slice of the arena.
  const within = 90 + st.spread * 420;
  for (let i = 1; i < n; i++) {
    const next = nearest(s, p.x, p.y, skip, st.reach, within);
    if (!next) break;
    skip.add(next.id);
    out.push(next);
  }
  return out;
}

function castSpell(s, key) {
  const sp = anySpell(key);
  const st = statsOf(s, key);
  if (!st) return false;

  if (sp.instant === 'nova') {
    for (let i = 0; i < st.count; i++) {
      const ring = Math.max(60, st.blast * (1 + i * 0.4));
      splash(s, 0, 0, ring, st.damage * (i ? 0.7 : 1), st.chill, st.element);
      s.fx.push({ kind: 'nova', x: 0, y: 0, r: ring, life: 0.42, max: 0.42, element: st.element });
      evoke(s, key, 0, 0, st.damage);
    }
    s.cast = 1;
    return true;
  }

  const mark = aimAt(s, sp.seeks || 'near', st.reach);
  if (!mark) return false;

  if (sp.instant === 'chain') {
    for (let round = 0; round < st.count; round++) {
      const hit = new Set();
      // The first link has to be in range; the jumps after it do not. A chain that leapt outwards
      // beyond where the spell can reach is the spell being carried by its own victims, which is
      // what a chain is for.
      const from0 = round === 0 ? mark : nearest(s, 0, 0, hit, st.reach);
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
      if (points.length > 1) s.fx.push({ kind: 'chain', points, life: 0.26, max: 0.26, element: st.element });
    }
    s.cast = 1;
    return true;
  }

  if (sp.instant === 'beam') {
    const seen = new Set();
    for (let i = 0; i < st.count; i++) {
      const target = i === 0 ? mark : nearest(s, 0, 0, seen, st.reach);
      if (!target) break;
      seen.add(target.id);
      const p = placeOf(target);
      const a = Math.atan2(p.y, p.x);
      const wide = Math.max(10, st.wide);
      for (const f of s.foes) {
        if (f.hp <= 0 || !inRange(f, st.reach)) continue;
        const q = placeOf(f);
        const along = q.x * Math.cos(a) + q.y * Math.sin(a);
        const off = Math.abs(-q.x * Math.sin(a) + q.y * Math.cos(a));
        if (along > 0 && off <= wide / 2) {
          wound(s, f, st.damage, st.chill, st.element);
          evoke(s, key, q.x, q.y, st.damage);
        }
      }
      s.aim = a;
      s.fx.push({ kind: 'beam', a, wide, reach: st.reach, life: 0.2, max: 0.2, element: st.element });
    }
    s.cast = 1;
    return true;
  }

  // everything else flies, one projectile per mark
  const marks = marksFor(s, mark, st.count, st);
  for (let i = 0; i < st.count; i++) {
    const target = marks[i % marks.length];
    const p = placeOf(target);
    // Doubled up on a mark somebody else already has: a hand's width over, so two of them read
    // as two things rather than as one thing drawn twice.
    const again = i >= marks.length;
    const a = Math.atan2(p.y, p.x) + (again ? (s.roll() - 0.5) * 0.14 : 0);
    if (i === 0) s.aim = a;
    const from = sp.falls
      ? {
        x: p.x + (again ? (s.roll() - 0.5) * 90 : 0),
        y: p.y + (again ? (s.roll() - 0.5) * 90 : 0),
        z: 620,
      }
      : { x: Math.cos(a) * Wall, y: Math.sin(a) * Wall, z: 0 };
    // Homing locks onto its own mark; everything else is aimed at where the mark is standing.
    // Straight is enough: the shot leaves the wall along the same line the creature is walking
    // in on, so the two meet head on.
    throwOne(s, key, st, from, a, sp.homing ? target.id : null);
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
  if ((s.sealed || []).includes(key)) return [];
  return (anySpell(key).evolutions || []).filter(
    (e) => !kit.evos.includes(e.onHit) && (!e.needs || carries(s, e.needs))
  );
}

/** The boosts a spell may still be offered: the ones not already taken to their limit. */
export function boostsFor(s, key) {
  const kit = s.kit[key];
  if (!kit) return [];
  if ((s.sealed || []).includes(key)) return [];
  return (anySpell(key).boosts || []).filter((b) => (kit.boosts[b.key] || 0) < (b.most || 3));
}

/**
 * Three things to choose between.
 *
 * A spell with a tier owing offers that tier and nothing else of its own, so the big card cannot
 * be crowded out by a stack of small ones. Everything else goes in together: ordinary boosts for
 * what you carry, and the passives.
 */
/**
 * How much has to have gone into the pair before it can be put together.
 *
 * Counted as picks spread over the two of them rather than a tier each. A tier each was the first
 * rule and it was unreachable: a tier costs five boosts, so two of them is ten picks into exactly
 * those two spells, and a run hands out about twenty across four. Measured, it happened in four
 * runs out of forty - and in four out of forty for a player who had deliberately brought the pair,
 * which is the part that made it wrong. A gate nobody can aim at is not a gate, it is weather.
 */
/**
 * How many picks the two parents must have had between them before a fusion is offered.
 *
 * It was eight, chosen when a run handed out about thirty picks across four spells: a fusion
 * happened in half of random runs and nine in ten aimed ones. A five-minute run hands out forty
 * odd, so an untargeted pair reaches twenty between them without trying, and at eight - and at
 * thirteen - it happened in nearly every run. Not a choice, a step on the way.
 *
 * Eighteen is most of a run's picks poured into two spells. You can still fall into one, but
 * you mostly have to mean it.
 *
 * Twelve now, because the run level stops at 23 and a run hands out twenty-two picks rather than
 * thirty-odd: at eighteen it happened in NONE of twelve runs, and a fusion nobody can reach is
 * four spells that exist only in the codex.
 *
 * Twelve is measured rather than guessed. The picks that land on the best fusable pair in a run
 * read: smallest 4, median 9, largest 13 - so a gate at fifteen is unreachable by arithmetic and
 * a gate at nine is most runs. Twelve is half of a whole run's picks poured into two of the five
 * spells you brought: reachable by a player who means it, and not somewhere you arrive by
 * accident.
 */
export const FuseAt = 9;

/**
 * The fusions this run could still make.
 *
 * Both parents have to be carried, both have to have reached a tier - a fusion is a reward for
 * having built two spells, not a shortcut past building either - and neither can already have
 * been used up by an earlier one.
 */
export function fusionsFor(s) {
  const have = carrying(s);
  const sealed = s.sealed || [];
  const out = [];
  for (const key of fusionKeys) {
    if (s.kit[key]) continue;
    const [a, b] = Fusions[key].of;
    if (!have.includes(a) || !have.includes(b)) continue;
    if (sealed.includes(a) || sealed.includes(b)) continue;
    if ((s.kit[a].taken || 0) + (s.kit[b].taken || 0) < FuseAt) continue;
    out.push(key);
  }
  return out;
}

export function offer(s) {
  // One entry per spell, not one per upgrade. Built the other way round - every available boost
  // its own entry - a spell with five boosts put five tickets in the hat and its tier card put
  // one, so tiers almost never came up: the bot finished a whole run having taken none.
  const pool = [];
  const due = [];

  // A fusion that has been earned is shown rather than rolled for, like a tier. Two spells built
  // to a tier each is a long way to come, and a lottery ticket at the end of it is not a reward.
  for (const key of fusionsFor(s)) due.push({ what: 'fusion', key });

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
    if (k === 'mend' && s.wall >= s.maxWall) continue;
    // Late, and once. A repair offered in the first minute is a card spent on a wall nothing has
    // reached yet, and with one passive left in the game it was a third of every early choice.
    if (k === 'mend' && s.stageT < MendAfter) continue;
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

  const sp = anySpell(pick.key);

  if (pick.what === 'spell') {
    return { badge: say(UI.newSpell), title: say(sp.name), text: say(sp.tells), mark: pick.key, big: true };
  }

  if (pick.what === 'fusion') {
    const [a, b] = Fusions[pick.key].of;
    return {
      badge: say(UI.fusion),
      title: say(sp.name),
      text: say(sp.tells),
      mark: pick.key,
      big: true,
      // What it costs, said on the card. A fusion that only mentioned what it gives would be
      // selling a choice as a present.
      spends: say(UI.fuseOf, say(anySpell(a).name), say(anySpell(b).name)),
    };
  }

  if (pick.what === 'evolution') {
    const evo = sp.evolutions.find((e) => e.onHit === pick.evo);
    return {
      title: say(sp.name),
      text: say(evo.tells),
      mark: pick.key,
      big: true,
      borrows: evo.needs ? say(anySpell(evo.needs).name) : null,
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
      // A repair, there and then - not a trickle and not a bigger wall. Both of those were
      // things you took early and forgot about; this one is a decision made while losing.
      if (pick.key === 'mend') {
        s.wall = Math.min(s.maxWall, s.wall + s.maxWall * MendPart);
      }
    } else if (pick.what === 'spell') {
      s.kit[pick.key] = { tier: 1, boosts: {}, evos: [], taken: 0 };
      s.cools[pick.key] = 0.15;
    } else if (pick.what === 'boost') {
      const kit = s.kit[pick.key];
      kit.boosts[pick.boost] = (kit.boosts[pick.boost] || 0) + 1;
      kit.taken += 1;
    } else if (pick.what === 'fusion') {
      const [a, b] = Fusions[pick.key].of;
      s.kit[pick.key] = { tier: 1, boosts: {}, evos: [], taken: 0 };
      s.cools[pick.key] = 0.15;
      s.loadout.push(pick.key);
      s.sealed.push(a, b);
      s.fused.push(pick.key);
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

  if (!s.boss && !s.bossDone && s.stageT >= BossAt) {
    s.bossDone = true;
    s.boss = spawn(s, bossFor(s.stage));
    s.boss.hp *= 1 + (s.stage - 1) * 0.42;
    s.boss.maxHp = s.boss.hp;
    s.events.push({ kind: 'boss', stage: s.stage, key: s.boss.key });
  }

  // The wave runs to the five minute mark and then stops - which is ten seconds AFTER the boss
  // walks in, so it arrives into a full field instead of onto an empty one. It is told by the
  // clock rather than by whether the boss is here, because the boss is here for the last ten
  // seconds of it.
  if (s.stageT < StageWaves) {
    s.nextIn -= dt;
    while (s.nextIn <= 0) { spawn(s); s.nextIn += spawnEvery(s); }
    s.surgeIn -= dt;
    if (s.surgeIn <= 0) { surge(s); s.surgeIn = SurgeEvery; }
  }

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

  // Only the hero comb rebuilds the wall over time now. Mend is a one-off repair.
  const repair = s.hero ? s.hero.mend : 0;
  if (repair > 0) s.wall = Math.min(s.maxWall, s.wall + repair * dt);

  // --- the spells, each on its own clock
  for (const key of carrying(s)) {
    if (anySpell(key).orbit) continue;
    s.cools[key] -= dt;
    if (s.cools[key] <= 0) {
      const went = castSpell(s, key);
      s.cools[key] = went ? statsOf(s, key).every : 0.2;
      if (went) s.events.push({ kind: 'cast', key });
    }
  }

  // --- the orbiting blades, a position rather than a cooldown
  //
  // Every orbiting spell, by key. It used to read `if (s.kit.blade)` and work out the numbers for
  // `'blade'` by name, which meant Halo - the fusion of Magic Bolt and Orbit, two blades circling,
  // and one of the four things a run can be built towards - never touched anything at all. Nothing
  // noticed because the fusion still appeared, still drew, still sealed its parents, and simply
  // did no damage. A fusion is also not a replacement: Orbit goes on turning beside it, so there
  // genuinely are two of these at once and one shared angle would have pinned them together.
  for (const key of carrying(s)) {
    if (!anySpell(key).orbit) continue;
    const st = statsOf(s, key);
    s.orbitAt[key] = ((s.orbitAt[key] || 0) + dt * st.whirl * (1 + s.heat * 0.4)) % (Math.PI * 2);
    for (let i = 0; i < st.count; i++) {
      const a = s.orbitAt[key] + (i / st.count) * Math.PI * 2;
      const bx = Math.cos(a) * st.ring, by = Math.sin(a) * st.ring;
      for (const f of s.foes) {
        const mark = key + ':' + f.id;
        if (f.hp <= 0 || (s.bladeHits[mark] || 0) > s.t) continue;
        const p = placeOf(f);
        if (Math.hypot(p.x - bx, p.y - by) < 34 + f.size * 12) {
          s.bladeHits[mark] = s.t + 0.45;
          wound(s, f, st.damage, st.chill, st.element);
          evoke(s, key, p.x, p.y, st.damage);
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
            s.fx.push({ kind: 'chain', points: [{ x: g.x, y: g.y - 120 }, p], life: 0.2, max: 0.2, element: g.element });
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
      // The end of the range, and the end of the shot. A fireball that has gone as far as a
      // fireball goes stops there rather than sailing off the field - which is also what stops a
      // piercing shot from carrying on out past the range it was cast with.
      if (!landed && Math.hypot(b.x, b.y) > Math.min(Arena * 1.3, (b.reach || Arena) + 30)) {
        s.shots.splice(i, 1);
        continue;
      }
    }

    if (landed) {
      if (b.blast > 0) {
        splash(s, b.x, b.y, b.blast, b.damage, b.chill, b.element);
        s.fx.push({
          kind: b.chill ? 'frost' : 'burst', x: b.x, y: b.y, r: b.blast, life: 0.34, max: 0.34,
          // Donduran bir patlama buzdur, atisi hangi buyu yaptiysa yapsin.
          element: b.chill ? 'ice' : b.element,
        });
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

  if (maxed(s)) {
    // Capped. The bar stays full rather than creeping towards a level that will never come, and
    // the kills still count for everything else they count for.
    s.xp = s.need;
  } else if (s.xp >= s.need) {
    s.xp -= s.need;
    s.level += 1;
    s.need = xpFor(s.level, s.stage);
    s.choices = offer(s);
    if (s.choices.length) {
      s.phase = 'picking';
      s.events.push({ kind: 'levelled', level: s.level });
    }
    if (maxed(s)) s.events.push({ kind: 'maxed', level: s.level });
  }
  return s;
}

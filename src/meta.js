// What survives between runs: the account, what it has unlocked, and what you are carrying.
//
// localStorage and nothing else. Every read is wrapped, because a private window, blocked site
// data or a full quota all throw rather than return nothing, and none of those is a reason for
// the game to refuse to run.

import { LoadoutSize, Always, UnlockAt, unlocked, spellKeys } from './spells.js';
import { Languages } from './text.js';
import { Ladder, Steps as HeroSteps, totals as heroTotals, costOf as heroCost } from './hero.js';
import {
  today, canSpin, wedgeFor, amountAt, kindAt, spellFor,
  Chests, ChestKinds, chestPrize, costOf, canOpen, Bulk,
  gemsOn, repeatLift,
} from './rewards.js';
import { Steps as SpellSteps, stepOf, canStep } from './upgrades.js';

const Key = 'shadowtower';

const blank = {
  xp: 0,            // towards the next account level
  level: 1,
  best: 0,          // furthest stage
  runs: 0,
  kills: 0,
  loadout: null,    // filled from whatever is unlocked, so a new account starts with a full hand
  muted: false,
  lang: 'en',       // English by default; Turkish is chosen, not detected
  speed: 1,
  stars: null,      // stage number -> best stars ever earned there
  stage: 1,         // the one showing on the menu
  tab: 'map',       // which menu tab was last open
  codex: 'spells',  // and which half of the codex
  spellTab: 'loadout',  // and which half of the spells tab
  hero: 0,          // how many steps of the hero ladder are bought
  bank: 0,          // experience still to spend
  spun: null,       // the local date of the last free spin, so tomorrow is another one
  spins: 0,
  gems: 0,          // what chests are bought with; only a stage's first clears make them
  done: null,       // stage -> how many times it has been cleared
  chests: 0,
  gold: 0,          // shared, and what decides how many spells you can afford to raise
  shards: null,     // spell -> shards held; they decide which spell you are raising
  spell: null,      // spell -> permanent level, 1 to 10
};

/**
 * The two things experience does.
 *
 * `xp` climbs toward the next account level and resets, which is what unlocks spells. `bank` is
 * the same experience kept as a balance, and the hero ladder spends it. One number earned, two
 * tracks fed - a player who buys everything on the ladder does not stop unlocking spells, and a
 * player who hoards does not get them faster.
 */
export const heroBonus = (data) => heroTotals(data.hero || 0);

/** The permanent level of every spell, as the rules want it. Unraised spells are simply absent. */
export const spellLevels = (data) => ({ ...(data.spell || {}) });

export const levelOf = (data, key) => Math.max(1, (data.spell || {})[key] || 1);
export const shardsOf = (data, key) => Math.max(0, (data.shards || {})[key] || 0);

/** What raising this spell by one costs, and whether it can be afforded. Null at the top. */
export function spellStep(data, key) {
  const at = levelOf(data, key);
  const step = stepOf(at);
  if (!step) return null;
  return {
    ...step, from: at,
    gold: step.gold, shards: step.shards,
    afford: (data.gold || 0) >= step.gold && shardsOf(data, key) >= step.shards,
  };
}

/** Raises a spell by one. Returns whether it happened, so the screen never reports a false buy. */
export function buySpell(data, key) {
  if (!spellKeys.includes(key)) return false;
  const step = spellStep(data, key);
  if (!step || !step.afford) return false;
  data.gold -= step.gold;
  data.shards[key] -= step.shards;
  if (data.shards[key] <= 0) delete data.shards[key];
  data.spell[key] = step.to;
  save(data);
  return true;
}

export const heroNext = (data) => ((data.hero || 0) >= HeroSteps ? null : Ladder[data.hero || 0]);

export function buyHero(data) {
  const next = heroNext(data);
  if (!next || (data.bank || 0) < next.cost) return false;
  data.bank -= next.cost;
  data.hero = (data.hero || 0) + 1;
  save(data);
  return true;
}

/**
 * Takes the day's free spin.
 *
 * The wedge is drawn here and handed back, so the screen is told what was won rather than asked
 * to work it out from the angle it happens to stop at. Returns null when there is no spin to
 * take, which is also what stops a second press during the animation from paying twice.
 */
export function spin(data, roll = Math.random(), day = today(), pick = Math.random()) {
  if (!canSpin(data, day)) return null;
  const at = wedgeFor(roll);
  const kind = kindAt(at);
  const amount = amountAt(at, data.level || 1);
  const key = kind === 'shard' ? spellFor(data.loadout, pick) : null;

  data.spun = day;
  data.spins = (data.spins || 0) + 1;
  if (kind === 'exp') data.bank = (data.bank || 0) + amount;
  else if (kind === 'gold') data.gold = (data.gold || 0) + amount;
  else if (key) data.shards[key] = (data.shards[key] || 0) + amount;
  save(data);
  return { at, kind, amount, key };
}

export const timesDone = (data, stage) => Math.max(0, (data.done || {})[stage] || 0);

/**
 * Buys one chest, or ten.
 *
 * Returns null when it cannot be paid for, so a press that was too expensive never reports a
 * prize. Ten are bought as one purchase rather than ten in a row, because ten in a row would be
 * ten single prices and the discount is the whole point of the button.
 */
export function openChest(data, kind, many = 1) {
  const n = Math.max(1, Math.floor(many));
  if (!canOpen(data, kind, n)) return null;
  const prize = chestPrize(kind, data.level || 1, data.loadout || [], n);
  data.gems -= prize.gems;
  data.chests = (data.chests || 0) + n;
  data.bank = (data.bank || 0) + prize.exp;
  data.gold = (data.gold || 0) + prize.gold;
  for (const [k, amount] of Object.entries(prize.shards)) {
    if (spellKeys.includes(k)) data.shards[k] = (data.shards[k] || 0) + amount;
  }
  save(data);
  return prize;
}

export const TabKeys = ['wheel', 'hero', 'map', 'spells', 'codex'];

/**
 * What finishing a stage is worth, in stars.
 *
 * Measured on the wall that is still standing, because the wall is the only thing a run can
 * protect. Three stars means nothing ever reached it - which on a later stage is a real feat and
 * is meant to be.
 */
export function starsFor(wall, maxWall) {
  const part = maxWall > 0 ? wall / maxWall : 0;
  if (part >= 1) return 3;
  if (part >= 0.95) return 2;
  if (part >= 0.6) return 1;
  return 0;
}

/** How much of the wall the next star up would need, or null at three. */
export function nextStarAt(stars) {
  return stars >= 3 ? null : stars === 2 ? 100 : stars === 1 ? 95 : 60;
}

/** Stage one is always there; each later one opens when the one before it has been finished. */
export function stageOpen(data, stage) {
  if (stage <= 1) return true;
  return (data.stars || {})[stage - 1] !== undefined;
}

export function furthestStage(data) {
  let n = 1;
  while (stageOpen(data, n + 1)) n += 1;
  return n;
}

export const starsAt = (data, stage) => (data.stars || {})[stage];

export const totalStars = (data) =>
  Object.values(data.stars || {}).reduce((a, b) => a + b, 0);

export const Speeds = [1, 1.5, 2];

/**
 * What the next account level costs.
 *
 * Climbing, but not steeply. These are earned over days rather than minutes, and the thing they
 * buy - another spell allowed into the loadout - is the only reason to open the game tomorrow.
 * Slow enough to last, fast enough that the second one arrives on the first evening.
 */
export function needFor(level) {
  return Math.round(180 * Math.pow(level, 1.15));
}

/** What a finished run was worth. Stages count for far more than bodies, because stages are hard. */
export function worth(stage, kills) {
  return kills + (stage - 1) * 150;
}

/**
 * The gold a finished stage pays.
 *
 * Shared across every spell, so this is the number that decides how many spells an account can
 * afford to raise rather than which one. Paced against the upgrade line: raising one spell the
 * whole way costs about as much gold as twenty-odd clears bring in, so levelling everything is a
 * long job and levelling your favourite is not.
 */
export function goldFor(stage, kills) {
  return Math.round(kills * 1.2 + (stage - 1) * 120);
}

/**
 * The shards one spell earns from a run.
 *
 * Paid on what the run put into it, not merely on having brought it. Carrying a spell and never
 * feeding it earns the floor; feeding it all run earns three times that. This is the half of the
 * economy that says WHICH spell is being raised, so it has to answer to what you actually played.
 */
export function shardsFor(stage, taken) {
  const deep = Math.max(1, Math.floor(stage));
  // Multiplied by the stage rather than nudged by it. Added, a stage-three clear was worth twelve
  // per cent more than a stage-one clear for several times the difficulty, which is another way
  // of saying stay where it is easy.
  return Math.round((2 + Math.max(0, Math.floor(taken || 0))) * (1 + (deep - 1) * 0.25));
}

export function load() {
  let data;
  try {
    const raw = localStorage.getItem(Key);
    data = raw ? { ...blank, ...JSON.parse(raw) } : { ...blank };
  } catch {
    data = { ...blank };
  }
  return tidy(data);
}

/**
 * Puts right anything the saved data should not contain.
 *
 * It can be old, hand-edited, or from a build where a spell had a different name. A loadout
 * holding a spell that no longer exists, or one the account has not unlocked, would be a run that
 * casts nothing - so it is filtered here rather than trusted and crashed on later.
 */
export function tidy(data) {
  data.level = Math.max(1, Math.floor(data.level || 1));
  data.xp = Math.max(0, data.xp || 0);
  if (!Languages.includes(data.lang)) data.lang = 'en';
  if (!Speeds.includes(data.speed)) data.speed = 1;

  data.stars = (data.stars && typeof data.stars === 'object') ? data.stars : {};
  for (const [k, v] of Object.entries(data.stars)) {
    const n = Number(k);
    if (!Number.isInteger(n) || n < 1 || !Number.isInteger(v) || v < 0 || v > 3) delete data.stars[k];
  }
  data.stage = Math.max(1, Math.min(furthestStage(data), Math.floor(data.stage || 1)));
  if (!TabKeys.includes(data.tab)) data.tab = 'map';
  if (data.codex !== 'spells' && data.codex !== 'foes') data.codex = 'spells';
  if (data.spellTab !== 'loadout' && data.spellTab !== 'raise') data.spellTab = 'loadout';
  data.hero = Math.max(0, Math.min(HeroSteps, Math.floor(data.hero || 0)));
  data.bank = Math.max(0, Math.round(data.bank || 0));
  data.gems = Math.max(0, Math.round(data.gems || 0));
  data.chests = Math.max(0, Math.floor(data.chests || 0));

  // How often each stage has been cleared. A junk key here would either hand out first-clear gems
  // for ever or withhold them for a stage nobody has played.
  const done = (data.done && typeof data.done === 'object') ? data.done : {};
  data.done = {};
  for (const [k, v] of Object.entries(done)) {
    const n = Number(k);
    const times = Math.floor(v);
    if (Number.isInteger(n) && n >= 1 && Number.isFinite(times) && times > 0) data.done[n] = times;
  }
  data.spins = Math.max(0, Math.floor(data.spins || 0));
  if (typeof data.spun !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.spun)) data.spun = null;
  data.gold = Math.max(0, Math.round(data.gold || 0));

  // Shards and levels are keyed by spell, so a key that is not a spell any more - an old build, a
  // hand-edited save - would quietly buy nothing and show nothing. Dropped rather than kept.
  const shards = (data.shards && typeof data.shards === 'object') ? data.shards : {};
  data.shards = {};
  for (const k of spellKeys) {
    const n = Math.floor(shards[k] || 0);
    if (n > 0) data.shards[k] = n;
  }
  const spell = (data.spell && typeof data.spell === 'object') ? data.spell : {};
  data.spell = {};
  for (const k of spellKeys) {
    const n = Math.floor(spell[k] || 1);
    if (n > 1) data.spell[k] = Math.min(SpellSteps, n);
  }

  const open = unlocked(data.level);
  let kit = (Array.isArray(data.loadout) ? data.loadout : [])
    .filter((k, i, all) => spellKeys.includes(k) && open.includes(k) && all.indexOf(k) === i && k !== Always);
  // The fixed slot is always first and is never stored as a choice, so a saved loadout from an
  // older build - or one hand-edited - cannot end up without it.
  kit = [Always, ...kit].slice(0, LoadoutSize);
  while (kit.length < LoadoutSize) {
    const next = open.find((k) => !kit.includes(k));
    if (!next) break;
    kit.push(next);
  }
  data.loadout = kit;
  return data;
}

export function save(data) {
  try {
    localStorage.setItem(Key, JSON.stringify(data));
  } catch {
    /* a browser that will not keep it is not a browser that should stop the game */
  }
}

/**
 * Books a finished run.
 *
 * Returns everything the end screen wants to say: what it earned, whether the account went up,
 * and what that opened. Levelling more than once on a single run is possible on a long one, so
 * this loops rather than levelling at most once.
 */
/**
 * Books a finished stage.
 *
 * Stars are kept at their best: a replay that goes worse does not take back what was earned, or
 * nobody would ever risk a replay.
 */
export function finish(data, stage, wall, maxWall, kills, taken = null) {
  const stars = starsFor(wall, maxWall);
  const had = data.stars[stage];
  const beat = had === undefined || stars > had;
  if (beat) data.stars[stage] = stars;
  // `record` already returns `opened` for the spells the account unlocked, so the stage that
  // just opened is named something else rather than quietly overwriting it.
  const openedStage = had === undefined && stageOpen(data, stage + 1);
  // How many times this stage has been beaten BEFORE this run. Everything about what the run
  // pays hangs off that number, so it is read before it is bumped.
  const times = timesDone(data, stage);
  const lift = repeatLift(times);
  const account = record(data, stage, kills, taken, lift);

  // Gems are booked here rather than in `record`, because this is the only place that knows both
  // how often the stage has been cleared and how cleanly it was cleared this time.
  const gems = gemsOn(stage, times, stars);
  data.gems = (data.gems || 0) + gems;
  data.done[stage] = times + 1;
  if (data.stage < furthestStage(data)) data.stage = Math.min(furthestStage(data), stage + 1);
  save(data);
  return { stars, had, beat, openedStage, gems, times, first: times === 0, ...account };
}

export function record(data, stage, kills, taken = null, lift = 1) {
  const earned = Math.round(worth(stage, kills) * (1 + heroBonus(data).gain) * lift);
  const coin = Math.round(goldFor(stage, kills) * lift);
  const wasLevel = data.level;
  const wasBest = data.best || 0;

  // Shards go to the spells that were carried, each by what the run put into it. `taken` comes
  // from the run itself; without it - a replay booked by a tool, an old call - nothing is paid,
  // which is better than paying a flat amount nobody earned.
  const won = {};
  for (const [k, n] of Object.entries(taken || {})) {
    if (!spellKeys.includes(k)) continue;
    const got = Math.max(1, Math.round(shardsFor(stage, n) * lift));
    won[k] = got;
    data.shards[k] = (data.shards[k] || 0) + got;
  }
  data.gold = (data.gold || 0) + coin;

  data.xp += earned;
  data.bank = (data.bank || 0) + earned;
  data.runs = (data.runs || 0) + 1;
  data.kills = (data.kills || 0) + kills;
  while (data.xp >= needFor(data.level)) {
    data.xp -= needFor(data.level);
    data.level += 1;
  }
  if (stage > wasBest) data.best = stage;

  const opened = spellKeys.filter((k) => UnlockAt[k] > wasLevel && UnlockAt[k] <= data.level);
  // A spell that has just unlocked goes straight into a loadout with room, so the next run
  // actually uses it instead of waiting to be noticed on a screen nobody reads.
  for (const k of opened) if (data.loadout.length < LoadoutSize) data.loadout.push(k);

  save(data);
  return {
    earned,
    gold: coin,
    shards: won,
    lift,
    levelled: data.level > wasLevel,
    wasLevel,
    level: data.level,
    opened,
    beatBest: stage > wasBest,
    wasBest,
    best: data.best,
  };
}

/** Puts a spell in or out of the loadout. Returns whether anything changed. */
export function toggle(data, key) {
  if (key === Always) return false;                 // the fixed slot is not a choice
  if (!unlocked(data.level).includes(key)) return false;
  const at = data.loadout.indexOf(key);
  if (at >= 0) {
    data.loadout.splice(at, 1);
  } else {
    if (data.loadout.length >= LoadoutSize) return false;
    data.loadout.push(key);
  }
  save(data);
  return true;
}

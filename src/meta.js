// What survives between runs: the account, what it has unlocked, and what you are carrying.
//
// localStorage and nothing else. Every read is wrapped, because a private window, blocked site
// data or a full quota all throw rather than return nothing, and none of those is a reason for
// the game to refuse to run.

import { LoadoutSize, Always, UnlockAt, unlocked, spellKeys } from './spells.js';
import { Languages } from './text.js';
import { Ladder, Steps as HeroSteps, totals as heroTotals, costOf as heroCost } from './hero.js';

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
  hero: 0,          // how many steps of the hero ladder are bought
  bank: 0,          // experience still to spend
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

export const heroNext = (data) => ((data.hero || 0) >= HeroSteps ? null : Ladder[data.hero || 0]);

export function buyHero(data) {
  const next = heroNext(data);
  if (!next || (data.bank || 0) < next.cost) return false;
  data.bank -= next.cost;
  data.hero = (data.hero || 0) + 1;
  save(data);
  return true;
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
  data.hero = Math.max(0, Math.min(HeroSteps, Math.floor(data.hero || 0)));
  data.bank = Math.max(0, Math.round(data.bank || 0));

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
export function finish(data, stage, wall, maxWall, kills) {
  const stars = starsFor(wall, maxWall);
  const had = data.stars[stage];
  const beat = had === undefined || stars > had;
  if (beat) data.stars[stage] = stars;
  // `record` already returns `opened` for the spells the account unlocked, so the stage that
  // just opened is named something else rather than quietly overwriting it.
  const openedStage = had === undefined && stageOpen(data, stage + 1);
  const account = record(data, stage, kills);
  if (data.stage < furthestStage(data)) data.stage = Math.min(furthestStage(data), stage + 1);
  save(data);
  return { stars, had, beat, openedStage, ...account };
}

export function record(data, stage, kills) {
  const earned = Math.round(worth(stage, kills) * (1 + heroBonus(data).gain));
  const wasLevel = data.level;
  const wasBest = data.best || 0;

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

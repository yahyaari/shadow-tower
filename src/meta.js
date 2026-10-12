// What survives between runs: the account, what it has unlocked, and what you are carrying.
//
// localStorage and nothing else. Every read is wrapped, because a private window, blocked site
// data or a full quota all throw rather than return nothing, and none of those is a reason for
// the game to refuse to run.

import { LoadoutSize, UnlockAt, unlocked, spellKeys } from './spells.js';

const Key = 'shadowtower';

const blank = {
  xp: 0,            // towards the next account level
  level: 1,
  best: 0,          // furthest stage
  runs: 0,
  kills: 0,
  loadout: ['bolt'],
  muted: false,
};

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
  const open = unlocked(data.level);
  let kit = (Array.isArray(data.loadout) ? data.loadout : [])
    .filter((k, i, all) => spellKeys.includes(k) && open.includes(k) && all.indexOf(k) === i)
    .slice(0, LoadoutSize);
  if (!kit.length) kit = [open[0] || 'bolt'];
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
export function record(data, stage, kills) {
  const earned = worth(stage, kills);
  const wasLevel = data.level;
  const wasBest = data.best || 0;

  data.xp += earned;
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
  if (!unlocked(data.level).includes(key)) return false;
  const at = data.loadout.indexOf(key);
  if (at >= 0) {
    if (data.loadout.length === 1) return false;    // never leave for a run with nothing to cast
    data.loadout.splice(at, 1);
  } else {
    if (data.loadout.length >= LoadoutSize) return false;
    data.loadout.push(key);
  }
  save(data);
  return true;
}

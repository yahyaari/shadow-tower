// Things to aim at, in two rhythms.
//
//   daily  - three a day, reset at the player's own midnight. They are the reason to open the
//            game tomorrow, and they are the only place besides a stage's first clear that gems
//            come from.
//   run    - three a run, named on the map before you press PLAY and paid when it ends. They pay
//            gold and never gems, because a run goal refreshes every run and a gem that refreshes
//            every run is a gem you can farm - which is the one thing gems are not allowed to be.
//
// All data and arithmetic. Nothing here knows the screen, the rules or the save exist: a mission
// is a question asked of a tally, and the tally is handed in.

import { goldUnitOf } from './rewards.js';

/**
 * The daily three.
 *
 * `of` names a counter kept for the day. `need` is how much of it. Between them they have to
 * cover the different things a session can be - a long one, a careful one, a shopping trip -
 * so that whichever way the player likes to play, some of the day's work is already done.
 */
export const Daily = [
  { key: 'clears', of: 'clears', need: 3,
    name: ['Finish three stages', 'Üç bölüm bitir'], gems: 30, gold: 1 },
  { key: 'kills', of: 'kills', need: 500,
    name: ['Put down 500', '500 düşman indir'], gems: 30, gold: 1 },
  { key: 'clean', of: 'stars', need: 3,
    name: ['Finish one with every star', 'Bir bölümü üç yıldızla bitir'], gems: 45, gold: 1.5 },
  { key: 'deep', of: 'deepest', need: 3,
    name: ['Finish stage three or deeper', 'Üçüncü bölümü veya daha derinini bitir'], gems: 40, gold: 1.2 },
  { key: 'chest', of: 'chests', need: 1,
    name: ['Open a chest', 'Bir sandık aç'], gems: 25, gold: 1 },
  { key: 'raise', of: 'raises', need: 1,
    name: ['Raise a spell', 'Bir büyüyü yükselt'], gems: 35, gold: 1 },
  { key: 'spin', of: 'spins', need: 1,
    name: ['Spin the wheel', 'Çarkı çevir'], gems: 20, gold: 0.6 },
  { key: 'hero', of: 'hero', need: 1,
    name: ['Take a step on the comb', 'Petekten bir basamak al'], gems: 35, gold: 1 },
];

/**
 * The run three.
 *
 * Measured from what a finished run already knows, so none of this reaches into the fight: the
 * rules go on not knowing missions exist.
 */
export const Runly = [
  { key: 'kills', of: 'kills', need: 150,
    name: ['150 down in one run', 'Tek koşuda 150 düşman'], gold: 0.5 },
  { key: 'kills2', of: 'kills', need: 260,
    name: ['260 down in one run', 'Tek koşuda 260 düşman'], gold: 0.9 },
  { key: 'wall', of: 'wall', need: 90,
    name: ['Finish with the wall over 90%', 'Duvar %90 üstündeyken bitir'], gold: 0.8 },
  { key: 'evos', of: 'evos', need: 2,
    name: ['Take two tier-ups', 'İki dönüşüm al'], gold: 0.7 },
  { key: 'level', of: 'level', need: 18,
    name: ['Reach level 18 in a run', 'Bir koşuda 18. seviyeye çık'], gold: 0.7 },
  { key: 'full', of: 'carried', need: 4,
    name: ['Cast all four of your spells', 'Dört büyünün dördünü de ateşle'], gold: 0.6 },
  { key: 'clear', of: 'cleared', need: 1,
    name: ['Finish the stage', 'Bölümü bitir'], gold: 0.5 },
];

export const DailyCount = 3;
export const RunCount = 3;

/** A small, stable shuffle. The same seed always picks the same three, on every machine. */
export function pick(pool, seed, many) {
  let s = (Math.floor(seed) * 2654435761 + 12345) >>> 0;
  const roll = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const left = pool.map((m) => m.key);
  const out = [];
  while (out.length < Math.min(many, pool.length)) {
    out.push(left.splice(Math.floor(roll() * left.length), 1)[0]);
  }
  return out;
}

export const dailyOf = (key) => Daily.find((m) => m.key === key) || null;
export const runOf = (key) => Runly.find((m) => m.key === key) || null;

/** Which three today asks for. The day's own text is the seed, so it turns over at midnight. */
export function dailyKeys(day) {
  let n = 0;
  for (const ch of String(day)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return pick(Daily, n, DailyCount);
}

/** Which three this run asks for. Seeded off the stage and how many runs have been played. */
export const runKeys = (stage, runs) => pick(Runly, stage * 7919 + Math.floor(runs || 0) * 104729, RunCount);

/** How far along a mission is, against a tally. Capped, so a bar cannot run past its end. */
export function progress(job, tally) {
  if (!job) return 0;
  return Math.max(0, Math.min(job.need, Math.floor((tally || {})[job.of] || 0)));
}

export const doneWith = (job, tally) => !!job && progress(job, tally) >= job.need;

/** What a mission pays, at this account level. */
export function pays(job, level) {
  if (!job) return null;
  return {
    gems: job.gems || 0,
    gold: Math.round((goldUnitOf(level) * (job.gold || 0)) / 5) * 5,
  };
}

/**
 * What a finished run is worth measuring against.
 *
 * Built from the run's own numbers rather than counted as the fight goes, so a mission can be
 * added without a line changing anywhere in `rules.js`.
 */
export function runTally(stage, stars, wall, maxWall, kills, level, evos, carried, cleared) {
  return {
    kills,
    wall: maxWall > 0 ? Math.round((wall / maxWall) * 100) : 0,
    level,
    evos,
    carried,
    cleared: cleared ? 1 : 0,
    stars,
    stage,
  };
}

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
import {
  dailyKeys, dailyOf, runKeys, runOf, runTally, progress, doneWith, pays, DailyCount,
  Feats, featOf, Week, weekAt, weekDue, weekPays, nextDay,
} from './missions.js';
import { Allow as AdAllow, Kinds as AdKinds } from './ads.js';

const Key = 'shadowtower';

const blank = {
  xp: 0,            // towards the next account level
  level: 1,
  best: 0,          // furthest stage
  runs: 0,
  kills: 0,
  loadout: null,    // filled from whatever is unlocked, so a new account starts with a full hand
  muted: false,
  music: true,      // the bed, separately from the spell sounds
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
  tally: null,      // what has been done today, for the daily missions
  paid: null,       // which of today's missions have been collected
  streak: null,     // { last, run } - days in a row, and the last one counted
  feats: null,      // which achievements have been collected
  ads: null,        // { day, spin, small, great } - rewarded adverts watched today
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
  mark(data, 'raises');
  save(data);
  return true;
}

export const heroNext = (data) => ((data.hero || 0) >= HeroSteps ? null : Ladder[data.hero || 0]);

export function buyHero(data) {
  const next = heroNext(data);
  if (!next || (data.bank || 0) < next.cost) return false;
  data.bank -= next.cost;
  data.hero = (data.hero || 0) + 1;
  mark(data, 'hero');
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
export function spin(data, roll = Math.random(), day = today(), pick = Math.random(), paidFor = false) {
  if (!paidFor && !canSpin(data, day)) return null;
  const at = wedgeFor(roll);
  const kind = kindAt(at);
  const amount = amountAt(at, data.level || 1);
  const key = kind === 'shard' ? spellFor(data.loadout, pick) : null;

  // An advert spin does not spend the free one: it is an extra turn, not the same turn twice.
  if (!paidFor) data.spun = day;
  data.spins = (data.spins || 0) + 1;
  mark(data, 'spins', 1, day);
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
export function openChest(data, kind, many = 1, paidFor = false) {
  const n = Math.max(1, Math.floor(many));
  if (!paidFor && !canOpen(data, kind, n)) return null;
  const prize = chestPrize(kind, data.level || 1, data.loadout || [], n);
  if (!paidFor) data.gems -= prize.gems;
  data.chests = (data.chests || 0) + n;
  mark(data, 'chests', n);
  data.bank = (data.bank || 0) + prize.exp;
  data.gold = (data.gold || 0) + prize.gold;
  for (const [k, amount] of Object.entries(prize.shards)) {
    if (spellKeys.includes(k)) data.shards[k] = (data.shards[k] || 0) + amount;
  }
  save(data);
  return prize;
}

/**
 * Bumps one of the day's counters.
 *
 * Rolls the day over on the first thing done after midnight, which is also what clears what was
 * already collected - the missions and the wheel share one clock, so "a new day" means the same
 * thing in both places.
 */
export function mark(data, what, by = 1, day = today()) {
  if (!data.tally || data.tally.day !== day) {
    data.tally = { day, clears: 0, kills: 0, stars: 0, deepest: 0, chests: 0, raises: 0, spins: 0, hero: 0 };
    data.paid = [];
  }
  // The streak counts days on which something was DONE, not days the page was opened and left.
  // Counted here rather than on load, so it cannot be run up by refreshing seven times.
  if (!data.streak) data.streak = { last: null, run: 0 };
  if (data.streak.last !== day) {
    data.streak.run = nextDay(data.streak.last, day) ? weekAt(data.streak.run) + 1 : 1;
    data.streak.last = day;
  }
  if (what === 'stars' || what === 'deepest') {
    // these two are a best, not a running total
    data.tally[what] = Math.max(data.tally[what] || 0, by);
  } else {
    data.tally[what] = (data.tally[what] || 0) + by;
  }
}

/** Today's three, with how far each has got and whether it has been collected. */
export function dailyJobs(data, day = today()) {
  const tally = data.tally && data.tally.day === day ? data.tally : {};
  return dailyKeys(day).map((key) => {
    const job = dailyOf(key);
    return {
      key, job,
      at: progress(job, tally),
      need: job.need,
      done: doneWith(job, tally),
      paid: (data.paid || []).includes(key),
      pays: pays(job, data.level || 1),
    };
  });
}

/** Collects one finished daily mission. Null when it is not finished, or already collected. */
export function claimDaily(data, key, day = today()) {
  const one = dailyJobs(data, day).find((j) => j.key === key);
  if (!one || !one.done || one.paid) return null;
  data.paid.push(key);
  data.gems = (data.gems || 0) + one.pays.gems;
  data.gold = (data.gold || 0) + one.pays.gold;
  save(data);
  return one.pays;
}

/** The three this run is asking for. The map shows these before PLAY and the end screen scores them. */
export function runJobs(data, stage = data.stage) {
  return runKeys(stage, data.runs || 0).map((key) => ({ key, job: runOf(key) }));
}

/** Where the week stands, and whether its prize is waiting. */
export function week(data) {
  const run = weekAt(data.streak ? data.streak.run : 0);
  return { run, of: Week, due: weekDue(run), pays: weekPays(data.level || 1) };
}

/** Collects the seventh day. The count wraps, so the next week starts from nothing. */
export function claimWeek(data) {
  const w = week(data);
  if (!w.due) return null;
  data.streak.run = 0;
  data.gems = (data.gems || 0) + w.pays.gems;
  data.gold = (data.gold || 0) + w.pays.gold;
  save(data);
  return w.pays;
}

/** What the account has done in its life, for the achievements to be measured against. */
export function lifetime(data) {
  const levels = Object.values(data.spell || {});
  return {
    runs: data.runs || 0,
    kills: data.kills || 0,
    best: data.best || 0,
    chests: data.chests || 0,
    spins: data.spins || 0,
    hero: data.hero || 0,
    topSpell: levels.length ? Math.max(...levels) : 1,
    cleanStages: Object.values(data.stars || {}).filter((n) => n >= 3).length,
  };
}

export function feats(data) {
  const life = lifetime(data);
  return Feats.map((f) => ({
    key: f.key, feat: f,
    at: Math.min(f.need, Math.floor(life[f.of] || 0)),
    need: f.need,
    done: (life[f.of] || 0) >= f.need,
    paid: (data.feats || []).includes(f.key),
    gems: f.gems,
  }));
}

/** Collects one achievement. Once in the life of an account, which is what stops it being farmed. */
export function claimFeat(data, key) {
  const one = feats(data).find((f) => f.key === key);
  if (!one || !one.done || one.paid) return null;
  data.feats.push(key);
  data.gems = (data.gems || 0) + one.gems;
  save(data);
  return { gems: one.gems };
}

/** How many rewarded adverts are left today, per thing they buy. */
export function adsLeft(data, kind, day = today()) {
  if (!AdAllow[kind]) return 0;
  const used = data.ads && data.ads.day === day ? (data.ads[kind] || 0) : 0;
  return Math.max(0, AdAllow[kind] - used);
}

/**
 * Books one watched advert. False when the day's allowance is gone.
 *
 * Only called once the advert has actually finished, so an advert the player closed costs nothing.
 */
export function useAd(data, kind, day = today()) {
  if (adsLeft(data, kind, day) <= 0) return false;
  if (!data.ads || data.ads.day !== day) {
    data.ads = { day };
    for (const k of AdKinds) data.ads[k] = 0;
  }
  data.ads[kind] = (data.ads[kind] || 0) + 1;
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
  return 1;
}

/**
 * How much of the wall the next star up would need, or null at three.
 *
 * Finishing at all is worth one - nobody who clears a stage gets nothing. The other two are both
 * near the top, and deliberately: the wall barely scratched is worth two, the wall never touched
 * is worth three. Anything below that is one star, however it went.
 */
export function nextStarAt(stars) {
  return stars >= 3 ? null : stars === 2 ? 100 : 95;
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
  data.music = data.music !== false;
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

  // The day's tally. A tally from yesterday is not wrong, it is over - so it is thrown away
  // rather than repaired, and with it the record of what was already collected.
  const tally = (data.tally && typeof data.tally === 'object') ? data.tally : {};
  const day = typeof tally.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tally.day) ? tally.day : null;
  data.tally = { day, clears: 0, kills: 0, stars: 0, deepest: 0, chests: 0, raises: 0, spins: 0, hero: 0 };
  if (day) {
    for (const k of Object.keys(data.tally)) {
      if (k !== 'day') data.tally[k] = Math.max(0, Math.floor(tally[k] || 0));
    }
  }
  const paid = Array.isArray(data.paid) ? data.paid : [];
  data.paid = day ? paid.filter((k, i) => dailyOf(k) && paid.indexOf(k) === i) : [];

  const streak = (data.streak && typeof data.streak === 'object') ? data.streak : {};
  const lastDay = typeof streak.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(streak.last)
    ? streak.last : null;
  data.streak = {
    last: lastDay,
    run: lastDay ? Math.max(0, Math.min(Week, Math.floor(streak.run || 0))) : 0,
  };

  const feats = Array.isArray(data.feats) ? data.feats : [];
  data.feats = feats.filter((k, i) => featOf(k) && feats.indexOf(k) === i);

  // Watched adverts are per day like everything else, and a count over the day's allowance would
  // be a button that is spent before it is pressed.
  const ads = (data.ads && typeof data.ads === 'object') ? data.ads : {};
  const adDay = typeof ads.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ads.day) ? ads.day : null;
  data.ads = { day: adDay };
  for (const k of AdKinds) data.ads[k] = adDay ? Math.max(0, Math.min(AdAllow[k], Math.floor(ads[k] || 0))) : 0;

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
export function finish(data, stage, wall, maxWall, kills, taken = null, run = {}) {
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

  // --- the day's counters, and the run's own three
  mark(data, 'clears');
  mark(data, 'kills', kills);
  mark(data, 'stars', stars);
  mark(data, 'deepest', stage);

  // The run missions are scored from what the run already knows and paid on the spot. No tap to
  // collect: they belong to the run, and a run you have to go and claim is a chore.
  const sheet = runTally(stage, stars, wall, maxWall, kills,
    run.level || 0, run.evos || 0, Object.keys(taken || {}).length, true);
  const jobs = runJobs(data, stage).map((j) => ({
    ...j,
    at: progress(j.job, sheet),
    need: j.job.need,
    done: doneWith(j.job, sheet),
    pays: pays(j.job, data.level || 1),
  }));
  let runGold = 0;
  for (const j of jobs) if (j.done) runGold += j.pays.gold;
  data.gold = (data.gold || 0) + runGold;
  if (data.stage < furthestStage(data)) data.stage = Math.min(furthestStage(data), stage + 1);
  save(data);
  return {
    stars, had, beat, openedStage, gems, times, first: times === 0,
    jobs, runGold,
    ...account,
    gold: (account.gold || 0) + runGold,
  };
}

/**
 * Banks experience, takes the levels it is worth, and opens what those levels open.
 *
 * Its own function because experience arrives from two places now - the end of a run, and the
 * advert that doubles it - and a second copy of the level loop is a second place for the account
 * to level up without the spell it earned ever reaching a loadout.
 */
function gainXp(data, earned) {
  const wasLevel = data.level;
  data.xp += earned;
  data.bank = (data.bank || 0) + earned;
  while (data.xp >= needFor(data.level)) {
    data.xp -= needFor(data.level);
    data.level += 1;
  }
  const opened = spellKeys.filter((k) => UnlockAt[k] > wasLevel && UnlockAt[k] <= data.level);
  // A spell that has just unlocked goes straight into a loadout with room, so the next run
  // actually uses it instead of waiting to be noticed on a screen nobody reads.
  for (const k of opened) if (data.loadout.length < LoadoutSize) data.loadout.push(k);
  return { wasLevel, levelled: data.level > wasLevel, opened };
}

/**
 * Pays a finished run's reward a second time, for an advert.
 *
 * Everything the run paid, including the gems - which sounds like a hole in the one rule the
 * economy has, and is not. Gems are paid on a FIRST clear, so this can only ever double what a
 * stage was going to pay once in its life, and the day's allowance caps it besides.
 *
 * It takes the `won` the run already returned and marks it, so a second press pays nothing.
 */
export function doubleUp(data, won) {
  if (!won || won.doubled) return null;

  const again = {
    earned: won.earned || 0,
    gold: won.gold || 0,
    gems: won.gems || 0,
    shards: {},
  };
  data.gold = (data.gold || 0) + again.gold;
  data.gems = (data.gems || 0) + again.gems;
  for (const [k, n] of Object.entries(won.shards || {})) {
    if (!spellKeys.includes(k) || !(n > 0)) continue;
    again.shards[k] = n;
    data.shards[k] = (data.shards[k] || 0) + n;
  }
  const grew = gainXp(data, again.earned);
  save(data);

  // Marked on the object the end screen is still reading, so the button that paid it disappears.
  won.doubled = true;
  return { ...again, ...grew };
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

  data.runs = (data.runs || 0) + 1;
  data.kills = (data.kills || 0) + kills;
  if (stage > wasBest) data.best = stage;
  const { opened } = gainXp(data, earned);

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

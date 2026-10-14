// What the Rewards tab gives, and when.
//
// Three things now, because three things are earned: experience, which buys the hero comb; gold,
// which is shared and decides how many spells you can afford to raise; and shards, which belong
// to one spell each and decide which spell you are raising.
//
// Two sources, deliberately different in rhythm:
//
//   the wheel  - one free spin a day. It is the reason to open the game tomorrow, which is the
//                one thing a session of any length cannot provide.
//   the chest  - fills with bodies as you play, and pays out inside the session you earned it in.
//                A chest pays all three at once; the wheel pays one thing at a time, which is
//                what lets a wedge be a single number you can read while it turns.
//
// No DOM here and no clock of its own: the day and the rolls are all passed in, so a test can
// hand it a Tuesday and a loaded die.

/**
 * What a prize is measured in.
 *
 * Climbs with the account, because a prize fixed in size is generous on the first evening and an
 * insult on the tenth. Tied to the level rather than to the stage so that it cannot be farmed by
 * replaying stage one.
 */
export const unitOf = (level) => 25 + 14 * Math.max(1, level);
export const goldUnitOf = (level) => 30 + 30 * Math.max(1, level);
export const ShardUnit = 6;

/**
 * The eight wedges.
 *
 * Kinds alternate so that no two neighbours pay the same thing - a wheel whose left half is all
 * gold tells you what you won before it stops. The smallest is the booby prize and still has to
 * be worth having: one player in eight lands on it, and on a new account that is their first
 * impression of the whole tab. The jackpot is experience, because experience has the longest
 * thing to spend itself on.
 */
export const Wedges = [
  { kind: 'gold', mul: 1 },
  { kind: 'exp', mul: 1 },
  { kind: 'shard', mul: 1 },
  { kind: 'gold', mul: 2 },
  { kind: 'exp', mul: 1.5 },
  { kind: 'shard', mul: 2 },
  { kind: 'gold', mul: 3 },
  { kind: 'exp', mul: 6 },
];

export const Jackpot = Wedges.reduce((best, w, i) => (w.mul > Wedges[best].mul ? i : best), 0);

/** How much a wedge pays, in whatever it pays in. */
export function amountAt(i, level) {
  const w = Wedges[i];
  if (!w) return 0;
  if (w.kind === 'shard') return Math.round(ShardUnit * w.mul);
  const unit = w.kind === 'gold' ? goldUnitOf(level) : unitOf(level);
  return Math.round((unit * w.mul) / 5) * 5;
}

export const kindAt = (i) => (Wedges[i] ? Wedges[i].kind : null);

/** Which wedge a roll in [0,1) lands on. */
export const wedgeFor = (roll) =>
  Math.max(0, Math.min(Wedges.length - 1, Math.floor(roll * Wedges.length)));

/** Which carried spell a shard prize belongs to. */
export function spellFor(loadout, roll) {
  const list = Array.isArray(loadout) && loadout.length ? loadout : [];
  if (!list.length) return null;
  return list[Math.max(0, Math.min(list.length - 1, Math.floor(roll * list.length)))];
}

/** Bodies for a full chest, and what a full one is worth. */
export const ChestKills = 750;
export const ChestExp = 2;
export const ChestGold = 2;
export const ChestShards = 12;

/** A chest pays all three. The shards are split over what you are carrying, biggest share first. */
export function chestPrize(level, loadout = []) {
  const list = Array.isArray(loadout) ? loadout.filter(Boolean) : [];
  const each = list.length ? Math.max(1, Math.round(ChestShards / list.length)) : 0;
  return {
    exp: Math.round((unitOf(level) * ChestExp) / 5) * 5,
    gold: Math.round((goldUnitOf(level) * ChestGold) / 5) * 5,
    shards: Object.fromEntries(list.map((k) => [k, each])),
  };
}

/** How full the chest is, 0 to 1. */
export const chestPart = (data) =>
  Math.max(0, Math.min(1, (data.chest || 0) / ChestKills));

export const chestFull = (data) => (data.chest || 0) >= ChestKills;

/**
 * The day, as a plain local date.
 *
 * A date rather than a cooldown in hours: "tomorrow" is a thing a player already understands, and
 * a bar counting down from nineteen hours is not. Local, so the reset lands at the player's own
 * midnight rather than somewhere in the middle of their evening.
 */
export function today(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export const canSpin = (data, day = today()) => (data.spun || null) !== day;

/** Everything the tab needs to know, in one read. */
export function state(data, day = today()) {
  return {
    spin: canSpin(data, day),
    chest: chestFull(data),
    part: chestPart(data),
    kills: Math.min(ChestKills, data.chest || 0),
    need: ChestKills,
    unit: unitOf(data.level || 1),
    chestWorth: chestPrize(data.level || 1, data.loadout || []),
  };
}

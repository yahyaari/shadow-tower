// What the Rewards tab gives, and when.
//
// Four things are earned now. Experience buys the hero comb. Gold is shared and decides how many
// spells you can afford to raise. Runes belong to one spell each and decide which spell you are
// raising. Gems buy chests - and gems are the one thing farming cannot produce.
//
// Two sources, deliberately different in rhythm:
//
//   the wheel  - one free spin a day. It is the reason to open the game tomorrow, which is the
//                one thing a session of any length cannot provide.
//   the chests - bought with gems, one at a time or ten at once.
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
 *
 * Gems are not on the wheel. They are the one currency only progress can produce, and a wheel
 * that dripped them would be a way of buying chests by waiting.
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

// --- gems, and why they cannot be farmed ------------------------------------------------------

/**
 * What finishing a stage for the first time is worth in gems.
 *
 * Climbs with the stage, because the first clear of a deep stage is the hardest single thing a
 * player does and ought to be the best paid.
 */
export const gemsFor = (stage) => 30 + 15 * (Math.max(1, Math.floor(stage)) - 1);

/**
 * How much of that a repeat clear is worth.
 *
 * Full the first time, a quarter the second, a tenth the third, nothing after that. Gems are the
 * currency grinding cannot produce: the only way to more of them is a stage you have not beaten
 * yet. Stages go on for ever, so there is always another one - but it is always in front of you
 * rather than behind.
 */
const GemDecay = [1, 0.25, 0.1];
export const gemDecay = (times) => GemDecay[Math.max(0, Math.floor(times))] ?? 0;

/**
 * How much of everything ELSE a repeat clear is worth.
 *
 * This falls off too, so old ground is never the best use of a minute - but it floors at half
 * rather than at nothing. A player who cannot yet clear the next stage has to grind the last one
 * to afford the upgrades that will let them; take that away and being stuck becomes being
 * finished.
 */
export const RepeatFloor = 0.5;
export const repeatLift = (times) =>
  Math.max(RepeatFloor, 1 - 0.15 * Math.max(0, Math.floor(times)));

/** What a clear pays in gems: which stage, how often it has been beaten, and how cleanly. */
export function gemsOn(stage, times, stars) {
  const clean = 0.7 + 0.1 * Math.max(0, Math.min(3, stars || 0));
  return Math.round(gemsFor(stage) * gemDecay(times) * clean);
}

// --- the chests -------------------------------------------------------------------------------

/**
 * Two chests, bought with gems, singly or ten at a time.
 *
 * Ten costs nine, which is the whole reason the button exists: not a convenience, a discount for
 * saving up. The runes are what these are really for - the one currency a run can only pay for
 * spells you carried, so a chest is where a spell you have not been playing gets caught up.
 */
export const Bulk = 10;

export const Chests = {
  small: { gems: 100, runes: 10, exp: 0.5, gold: 0.5 },
  great: { gems: 250, runes: 25, exp: 1.5, gold: 1.5 },
};

export const ChestKinds = ['small', 'great'];

/** Ten for the price of nine; anything else simply costs its own price, however many. */
export function costOf(kind, many = 1) {
  const c = Chests[kind];
  if (!c) return 0;
  const n = Math.max(1, Math.floor(many));
  return c.gems * (n >= Bulk ? n - 1 : n);
}

export const gemsHeld = (data) => Math.max(0, Math.round(data.gems || 0));

export const canOpen = (data, kind, many = 1) =>
  !!Chests[kind] && gemsHeld(data) >= costOf(kind, many);

/**
 * What a chest holds.
 *
 * The runes are split over what you are carrying, so the total is what was promised however many
 * spells are in the loadout - a chest that paid per spell would be worth twice as much to a
 * player who happened to have unlocked more of them.
 */
export function chestPrize(kind, level, loadout = [], many = 1) {
  const c = Chests[kind];
  if (!c) return null;
  const n = Math.max(1, Math.floor(many));
  const list = Array.isArray(loadout) ? loadout.filter(Boolean) : [];
  // Everything is worked out for ONE chest and then multiplied. Rounding the batch instead left
  // ten-at-once paying 1845 where ten singles paid 1850 - a discount on the prize, in a button
  // whose entire point is a discount on the price.
  const each = list.length ? Math.max(1, Math.round(c.runes / list.length)) : 0;
  const exp = Math.round((unitOf(level) * c.exp) / 5) * 5;
  const gold = Math.round((goldUnitOf(level) * c.gold) / 5) * 5;
  return {
    kind,
    many: n,
    gems: costOf(kind, n),
    exp: exp * n,
    gold: gold * n,
    shards: Object.fromEntries(list.map((k) => [k, each * n])),
    runes: each * list.length * n,
  };
}

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
  const level = data.level || 1;
  const kit = data.loadout || [];
  const side = (kind, many) => ({
    cost: costOf(kind, many),
    can: canOpen(data, kind, many),
    holds: chestPrize(kind, level, kit, many),
  });
  return {
    spin: canSpin(data, day),
    unit: unitOf(level),
    gems: gemsHeld(data),
    chests: ChestKinds.map((kind) => ({ kind, one: side(kind, 1), many: side(kind, Bulk) })),
  };
}

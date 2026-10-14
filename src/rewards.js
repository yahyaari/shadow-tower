// What the Rewards tab gives, and when.
//
// Experience, and nothing else. The game already has one currency with somewhere to spend it -
// the hero comb - so a wheel that paid in a second kind of token would be asking the player to
// learn an economy in order to understand a prize. Everything here pays into `bank`.
//
// Two sources, deliberately different in rhythm:
//
//   the wheel  - one free spin a day. It is the reason to open the game tomorrow, which is the
//                one thing a session of any length cannot provide.
//   the chest   - fills with bodies as you play, and pays out inside the session you earned it in.
//
// No DOM here and no clock of its own: the day and the roll are both passed in, so a test can
// hand it a Tuesday and a loaded die.

/**
 * What a prize is measured in.
 *
 * Climbs with the account, because a prize fixed in size is generous on the first evening and an
 * insult on the tenth. Tied to the level rather than to the stage so that it cannot be farmed by
 * replaying stage one.
 */
export const unitOf = (level) => 25 + 14 * Math.max(1, level);

/**
 * The eight wedges, as multiples of the unit.
 *
 * The smallest is the booby prize and still has to be worth having: one player in eight lands on
 * it, and for a new account that is their first impression of the whole tab. The largest is worth
 * eight times it, and it is a flat one-in-eight like every other wedge. No near-miss weighting, no wedge that the needle is quietly steered away from: the wedge
 * is drawn first and the spin is then aimed at it, so what the wheel shows is what was won.
 */
export const Wedges = [0.75, 1, 1, 1.5, 2, 2, 3, 6];

export const prizeAt = (i, level) => Math.round((unitOf(level) * Wedges[i]) / 5) * 5;

/** Which wedge a roll in [0,1) lands on. */
export const wedgeFor = (roll) =>
  Math.max(0, Math.min(Wedges.length - 1, Math.floor(roll * Wedges.length)));

/** Bodies for a full chest, and what a full one is worth. */
export const ChestKills = 750;
export const ChestWorth = 2;

export const chestPrize = (level) => Math.round((unitOf(level) * ChestWorth) / 5) * 5;

/** How full the chest is, 0 to 1. */
export const chestPart = (data) =>
  Math.max(0, Math.min(1, (data.chest || 0) / ChestKills));

export const chestFull = (data) => (data.chest || 0) >= ChestKills;

/**
 * The day, as a plain local date.
 *
 * A date rather than a cooldown in hours: "tomorrow" is a thing a player already understands,
 * and a bar counting down from nineteen hours is not. Local, so the reset lands at the player's
 * own midnight rather than somewhere in the middle of their evening.
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
    chestWorth: chestPrize(data.level || 1),
  };
}

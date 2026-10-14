// The permanent level a spell carries between runs.
//
// One line per spell, ten steps long, bought with gold and with that spell's own shards. Gold is
// shared, so it decides how many spells you can afford to raise; shards only drop for the spells
// you took into a run, so they decide which spell you are raising. Neither currency alone is a
// gate - together they ask you to pick a spell and stay with it.
//
// Deliberately flat. Every step gives the same small lift to the same thing, because this sits on
// top of two power sources that already multiply - the hero comb and the cards taken during a run
// - and a third one with its own shape would make the balance unreadable rather than deeper.

export const Steps = 10;        // a spell starts at 1 and ends at 10, so nine of these are bought
export const Lift = 0.05;       // damage, per step

/** What a spell's level is worth. Level one is where everything starts, so it is worth nothing. */
export const liftAt = (level) => (Math.max(1, Math.min(Steps, level || 1)) - 1) * Lift;

/**
 * What the step up to `level` costs.
 *
 * Both climb, and gold climbs faster than shards. Shards are the slower drip - they only come
 * from runs you actually carried that spell in - so making them the steeper of the two would mean
 * sitting on gold with nothing to spend it on.
 */
export const goldTo = (level) => Math.round((100 * Math.pow(level - 1, 1.5)) / 10) * 10;
export const shardsTo = (level) => 3 + 2 * (level - 1);

export const canStep = (level) => (level || 1) < Steps;

/** The whole line for one spell, as a list - the shape the screen draws and the test counts. */
export const Line = Array.from({ length: Steps - 1 }, (_, i) => {
  const to = i + 2;
  return { to, gold: goldTo(to), shards: shardsTo(to), lift: Lift };
});

export const wholeGold = Line.reduce((a, s) => a + s.gold, 0);
export const wholeShards = Line.reduce((a, s) => a + s.shards, 0);

/** What a step costs, or null at the top of the line. */
export function stepOf(level) {
  const at = Math.max(1, Math.min(Steps, level || 1));
  return canStep(at) ? Line[at - 1] : null;
}

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

/**
 * Two chests and the two keys that open them.
 *
 * A key rather than a bar that fills with bodies. The bar paid out whenever it happened to be
 * full, which made it a thing that happened TO you; a key sits in your pocket until you choose to
 * spend it, and the great one is worth holding on to.
 *
 * The runes are what these are really for - the one currency a run can only pay for spells you
 * carried, so a chest is where a spell you have not been playing can be caught up on.
 *
 * Nothing here is coloured, because the game has exactly two inks. The two keys are told apart by
 * shape, and are named after what they open rather than after a colour that cannot be drawn.
 */
export const Chests = {
  small: { keys: 3, runes: 10, exp: 0.5, gold: 0.5 },
  great: { keys: 2, runes: 25, exp: 1.5, gold: 1.5 },
};

export const ChestKinds = ['small', 'great'];

/**
 * What a cleared stage leaves in your pocket.
 *
 * One small key for finishing, and a great one only for finishing with the wall untouched. Three
 * stars buy nothing - that idea was taken off the table - but they are still the mark of a clean
 * run, and this is what makes that mark worth something: a reason to go back to a stage you can
 * already beat and beat it properly.
 *
 * How often a key drops was the one number nobody specified, and it turned out to be the number
 * that decides whether the whole thing is sane. At one key per chest per clear the chests paid
 * more than the runs that earned them - a third of the stage-one economy was a box. So a key is
 * what every clear gives and the chests cost several of them; the counts sit in `Chests` and are
 * the dial to turn if the rhythm feels wrong.
 *
 * They also climb with the stage. Flat keys made the first stage the best place in the game to
 * farm - it is quick and it is nearly always cleared, so the boxes came faster there than
 * anywhere deeper. The rule the economy has to keep is that the deepest stage you can reliably
 * clear is the one worth clearing.
 */
export const keysFor = (stars, stage = 1) => {
  const deep = Math.max(1, Math.floor(stage));
  return {
    small: 1 + Math.floor((deep - 1) / 2),
    great: stars >= 3 ? 1 + Math.floor((deep - 1) / 3) : 0,
  };
};

export const keysOf = (data, kind) => Math.max(0, ((data.keys || {})[kind] || 0));

export const canOpen = (data, kind) => !!Chests[kind] && keysOf(data, kind) >= Chests[kind].keys;

/**
 * What one chest holds.
 *
 * The runes are split over what you are carrying, so the total is what was promised however many
 * spells are in the loadout - a chest that paid per spell would be worth twice as much to a
 * player who happened to have unlocked more of them.
 */
export function chestPrize(kind, level, loadout = []) {
  const c = Chests[kind];
  if (!c) return null;
  const list = Array.isArray(loadout) ? loadout.filter(Boolean) : [];
  const each = list.length ? Math.max(1, Math.round(c.runes / list.length)) : 0;
  return {
    kind,
    keys: c.keys,
    exp: Math.round((unitOf(level) * c.exp) / 5) * 5,
    gold: Math.round((goldUnitOf(level) * c.gold) / 5) * 5,
    shards: Object.fromEntries(list.map((k) => [k, each])),
    runes: each * list.length,
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
  return {
    spin: canSpin(data, day),
    unit: unitOf(level),
    chests: ChestKinds.map((kind) => ({
      kind,
      keys: keysOf(data, kind),
      can: canOpen(data, kind),
      holds: chestPrize(kind, level, kit),
    })),
  };
}

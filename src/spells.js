// The spell book: ten spells, what each one does, and everything you can do to it.
//
// All data, no behaviour. The rules read it, the view reads it, the tests read it, and nothing
// here knows any of them exist. Three kinds of entry:
//
//   the spell      what it is before you touch it
//   boosts         the ordinary upgrades - more of it, harder, faster
//   evolutions     what it becomes. Taken on a tier-up, every fifth boost.
//
// An evolution with `needs` only ever appears if you are carrying that other spell. "An electric
// storm where it lands" is the lightning spell lending itself to this one, so without lightning
// the option does not exist - not rare, not unlikely: absent.

/** How many boosts a spell takes before its next tier. */
export const BoostsPerTier = 5;

/**
 * What a boost can change, and what the number means.
 *
 * Every boost is a bag of these, added up. Keeping them to one small vocabulary is what lets the
 * card text, the bot and the maths all agree without any of them being told about a new spell.
 */
export const Knobs = {
  dmg: 'damage, as a fraction',
  cd: 'cooldown, as a fraction (negative is faster)',
  count: 'extra projectiles',
  spread: 'how wide a fan opens',
  blast: 'blast radius, as a fraction',
  pierce: 'how many extra it passes through',
  jumps: 'extra chain jumps',
  chill: 'extra seconds of slow',
  wide: 'beam width, as a fraction',
  ring: 'orbit radius, as a fraction',
  whirl: 'orbit speed, as a fraction',
};

// Boosts that read the same on every spell. Written once; a typo in "+15% damage" would otherwise
// be a typo in ten places.
// The caps are deliberately low.
//
// A spell has to run out of upgrades, because a pick spent on a spell you already own multiplies
// what that spell does while a pick spent on a second spell only adds to the total - so without a
// ceiling, pouring everything into one spell always beats carrying five, and the loadout stops
// meaning anything. A bot with one spell outlived a bot with five by nearly three to one before
// these came down.
const sharper = (most = 3) => ({ key: 'sharper', name: 'Sharper', tells: '+18% damage', does: { dmg: 0.18 }, most });
const quicker = (most = 2) => ({ key: 'quicker', name: 'Quicker', tells: '-13% cooldown', does: { cd: -0.13 }, most });
const wider = (most = 3) => ({ key: 'wider', name: 'Wider', tells: '+22% blast', does: { blast: 0.22 }, most });

export const Spells = {
  bolt: {
    name: 'Magic Bolt',
    tells: 'a homing bolt at the nearest',
    every: 0.85, damage: 7, seeks: 'near', homing: true,
    boosts: [
      { key: 'more', name: 'Twin Bolt', tells: '+1 bolt each cast', does: { count: 1 }, most: 2 },
      { key: 'flank', name: 'Flanking', tells: '+2 bolts, one to each side', does: { count: 2, spread: 0.5 }, most: 1 },
      { key: 'pierce', name: 'Piercing', tells: 'passes through one more', does: { pierce: 1 }, most: 2 },
      sharper(), quicker(),
    ],
    evolutions: [
      { key: 'split', name: 'Splinter', tells: 'splits into two smaller bolts where it lands', onHit: 'split' },
      { key: 'burst', name: 'Detonate', tells: 'bursts where it lands', onHit: 'burst' },
      { key: 'fire', name: 'Ignite', tells: 'leaves fire where it lands', onHit: 'fire', needs: 'fireball' },
      { key: 'storm', name: 'Conduct', tells: 'an electric storm where it lands', onHit: 'storm', needs: 'lightning' },
      { key: 'freeze', name: 'Rime', tells: 'a freezing burst where it lands', onHit: 'freeze', needs: 'frost' },
    ],
  },

  shards: {
    name: 'Shards',
    tells: 'three splinters in a fan',
    every: 1.7, damage: 5, seeks: 'near', count: 3, spread: 0.42,
    boosts: [
      { key: 'more', name: 'More Shards', tells: '+2 shards', does: { count: 2 }, most: 2 },
      { key: 'fan', name: 'Wide Fan', tells: 'a wider spread', does: { spread: 0.25 }, most: 2 },
      { key: 'pierce', name: 'Piercing', tells: 'passes through one more', does: { pierce: 1 }, most: 2 },
      sharper(), quicker(),
    ],
    evolutions: [
      { key: 'burst', name: 'Shrapnel', tells: 'every shard bursts where it lands', onHit: 'burst' },
      { key: 'split', name: 'Fracture', tells: 'every shard splits in two', onHit: 'split' },
      { key: 'fire', name: 'Firebrand', tells: 'every shard leaves fire', onHit: 'fire', needs: 'fireball' },
      { key: 'storm', name: 'Live Wire', tells: 'every shard leaves a storm', onHit: 'storm', needs: 'lightning' },
    ],
  },

  wisp: {
    name: 'Wisp',
    tells: 'hunts whatever is toughest',
    every: 1.5, damage: 11, seeks: 'strong', homing: true,
    boosts: [
      { key: 'more', name: 'Second Wisp', tells: '+1 wisp', does: { count: 1 }, most: 2 },
      { key: 'pierce', name: 'Relentless', tells: 'passes through one more', does: { pierce: 1 }, most: 2 },
      sharper(), quicker(), wider(2),
    ],
    evolutions: [
      { key: 'burst', name: 'Burst Soul', tells: 'bursts on its quarry', onHit: 'burst' },
      { key: 'split', name: 'Divide', tells: 'splits into two smaller wisps', onHit: 'split' },
      { key: 'freeze', name: 'Cold Hunt', tells: 'a freezing burst on its quarry', onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: 'Arc Hunt', tells: 'a storm on its quarry', onHit: 'storm', needs: 'lightning' },
    ],
  },

  fireball: {
    name: 'Fireball',
    tells: 'bursts where it lands',
    every: 2.6, damage: 12, seeks: 'crowd', blast: 86,
    boosts: [
      { key: 'more', name: 'Twin Flame', tells: '+1 fireball', does: { count: 1, spread: 0.3 }, most: 2 },
      wider(4), sharper(), quicker(),
      { key: 'pierce', name: 'Overshoot', tells: 'passes through one more', does: { pierce: 1 }, most: 1 },
    ],
    evolutions: [
      { key: 'fire', name: 'Wildfire', tells: 'leaves fire burning where it lands', onHit: 'fire' },
      { key: 'split', name: 'Scatter Shot', tells: 'throws two smaller fireballs out of the burst', onHit: 'split' },
      { key: 'storm', name: 'Firestorm', tells: 'an electric storm in the flames', onHit: 'storm', needs: 'lightning' },
      { key: 'freeze', name: 'Thermal Shock', tells: 'the burst freezes as it goes out', onHit: 'freeze', needs: 'frost' },
    ],
  },

  frost: {
    name: 'Frost Orb',
    tells: 'bursts, and what it touches slows',
    every: 2.3, damage: 7, seeks: 'near', blast: 76, chill: 2.4,
    boosts: [
      { key: 'deep', name: 'Deep Cold', tells: '+1.4s of slow', does: { chill: 1.4 }, most: 3 },
      { key: 'more', name: 'Second Orb', tells: '+1 orb', does: { count: 1, spread: 0.3 }, most: 2 },
      wider(4), sharper(), quicker(),
    ],
    evolutions: [
      { key: 'freeze', name: 'Deep Freeze', tells: 'a second freezing burst where it lands', onHit: 'freeze' },
      { key: 'split', name: 'Shatter', tells: 'throws two smaller orbs out of the burst', onHit: 'split' },
      { key: 'fire', name: 'Thermal Split', tells: 'leaves fire in the frost', onHit: 'fire', needs: 'fireball' },
      { key: 'storm', name: 'Conduct', tells: 'a storm in the frost', onHit: 'storm', needs: 'lightning' },
    ],
  },

  lightning: {
    name: 'Lightning',
    tells: 'leaps between them',
    every: 2.5, damage: 10, instant: 'chain', jumps: 3,
    boosts: [
      { key: 'jump', name: 'Further Leap', tells: '+1 jump', does: { jumps: 1 }, most: 3 },
      { key: 'twice', name: 'Double Strike', tells: 'strikes twice', does: { count: 1 }, most: 1 },
      sharper(), quicker(), wider(2),
    ],
    evolutions: [
      { key: 'storm', name: 'Thunderhead', tells: 'a storm where the chain ends', onHit: 'storm' },
      { key: 'burst', name: 'Discharge', tells: 'bursts at every link', onHit: 'burst' },
      { key: 'fire', name: 'Scorch', tells: 'leaves fire at every link', onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: 'Flash Freeze', tells: 'freezes at every link', onHit: 'freeze', needs: 'frost' },
    ],
  },

  laser: {
    name: 'Beam',
    tells: 'burns a line clean through',
    every: 3.4, damage: 20, instant: 'beam', wide: 34,
    boosts: [
      { key: 'thick', name: 'Thicker Beam', tells: '+30% width', does: { wide: 0.3 }, most: 3 },
      { key: 'more', name: 'Second Beam', tells: '+1 beam, elsewhere', does: { count: 1 }, most: 2 },
      sharper(), quicker(), wider(2),
    ],
    evolutions: [
      { key: 'fire', name: 'Scorched Earth', tells: 'leaves the line burning', onHit: 'fire', needs: 'fireball' },
      { key: 'burst', name: 'Overload', tells: 'bursts along the line', onHit: 'burst' },
      { key: 'freeze', name: 'Cold Light', tells: 'freezes along the line', onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: 'Arc Lance', tells: 'a storm at the far end', onHit: 'storm', needs: 'lightning' },
    ],
  },

  nova: {
    name: 'Nova',
    tells: 'everything near the wall, at once',
    every: 3.8, damage: 15, instant: 'nova', blast: 190,
    boosts: [
      wider(4), sharper(), quicker(),
      { key: 'more', name: 'Second Pulse', tells: 'pulses twice', does: { count: 1 }, most: 2 },
      { key: 'deep', name: 'Lingering', tells: 'slows what it catches', does: { chill: 1.2 }, most: 2 },
    ],
    evolutions: [
      { key: 'burst', name: 'Shockwave', tells: 'a second burst further out', onHit: 'burst' },
      { key: 'fire', name: 'Ring of Fire', tells: 'leaves a ring of fire', onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: 'Winter', tells: 'freezes everything it catches', onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: 'Tempest', tells: 'a storm around the wall', onHit: 'storm', needs: 'lightning' },
    ],
  },

  meteor: {
    name: 'Meteor',
    tells: 'falls on the thickest part of the crowd',
    every: 5, damage: 34, seeks: 'crowd', falls: true, blast: 110,
    boosts: [
      { key: 'more', name: 'Shower', tells: '+1 meteor', does: { count: 1 }, most: 2 },
      wider(4), sharper(), quicker(),
      { key: 'deep', name: 'Crushing', tells: 'slows what survives', does: { chill: 1.2 }, most: 2 },
    ],
    evolutions: [
      { key: 'fire', name: 'Cinder', tells: 'leaves the crater burning', onHit: 'fire' },
      { key: 'split', name: 'Breakup', tells: 'throws two smaller rocks out of the crater', onHit: 'split' },
      { key: 'storm', name: 'Ion Strike', tells: 'a storm in the crater', onHit: 'storm', needs: 'lightning' },
      { key: 'freeze', name: 'Cold Iron', tells: 'the crater freezes', onHit: 'freeze', needs: 'frost' },
    ],
  },

  blade: {
    name: 'Orbit',
    tells: 'a blade circling you, always',
    every: 0.55, damage: 9, orbit: true,
    boosts: [
      { key: 'more', name: 'Second Blade', tells: '+1 blade', does: { count: 1 }, most: 2 },
      { key: 'whirl', name: 'Faster', tells: '+25% orbit speed', does: { whirl: 0.25 }, most: 3 },
      { key: 'ring', name: 'Wider Orbit', tells: '+20% orbit radius', does: { ring: 0.2 }, most: 3 },
      sharper(), quicker(),
    ],
    evolutions: [
      { key: 'burst', name: 'Cleave', tells: 'bursts on everything it touches', onHit: 'burst' },
      { key: 'fire', name: 'Brand', tells: 'leaves a trail of fire', onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: 'Hoarfrost', tells: 'freezes what it touches', onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: 'Live Edge', tells: 'a storm on what it touches', onHit: 'storm', needs: 'lightning' },
    ],
  },
};

export const spellKeys = Object.keys(Spells);

/** What you can take instead of a spell upgrade. Each one helps everything you own. */
export const Passives = {
  might: { name: 'Might', tells: '+15% damage, everything' },
  haste: { name: 'Haste', tells: '+13% cast speed, everything' },
  reach: { name: 'Reach', tells: '+18% blast and beam size' },
  mend:  { name: 'Mend', tells: 'the wall rebuilds itself' },
};

export const passiveKeys = Object.keys(Passives);
export const MostPassive = 5;

/**
 * When each spell becomes available to put in a loadout.
 *
 * Account level, not run level - these are earned over days, not minutes. The first is free
 * because a game that opens on an empty loadout screen is a game that opens on homework.
 */
export const UnlockAt = {
  bolt: 1,
  shards: 2,
  fireball: 3,
  frost: 4,
  blade: 6,
  lightning: 8,
  wisp: 10,
  nova: 12,
  laser: 14,
  meteor: 16,
};

/** How many you may carry. */
export const LoadoutSize = 5;

export function unlocked(accountLevel) {
  return spellKeys.filter((k) => UnlockAt[k] <= accountLevel);
}

/** The next thing that unlocks, for the screen to dangle. */
export function nextUnlock(accountLevel) {
  let best = null;
  for (const k of spellKeys) {
    if (UnlockAt[k] > accountLevel && (!best || UnlockAt[k] < UnlockAt[best])) best = k;
  }
  return best ? { key: best, at: UnlockAt[best] } : null;
}

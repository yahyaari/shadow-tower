// Who walks in, and what hurts them.
//
// Two things are kept apart on purpose:
//
//   the ROLE   - walker, runner, brute. What a creature does in the wave: come straight on, run,
//                or take a lot of stopping. The wave rule only ever speaks in roles, so a new
//                family costs nothing in balance.
//   the FAMILY - folk, swarm, spider, wurm. What it is. A family changes how it looks and what
//                it takes damage from, and nothing else.
//
// A stage names its families, so the fourth stage is a different fight from the first with the
// same wave behind it - and from the fifth stage on they mix.
//
// All data. Nothing here knows the rules, the screen or the tests exist.

export const Roles = ['walker', 'runner', 'brute'];

/**
 * The five elements, and why there are five.
 *
 * Every spell is one of them. Three of them - arcane, fire, blade - are carried by more than one
 * spell, so a weakness pointed at those is an invitation rather than a demand. Ice and storm are
 * one spell each, which is why they are only ever RESISTED, never the thing a family is weak to:
 * being punished for the one spell you happened to bring is a small thing, but needing a spell
 * you have not unlocked yet is a wall.
 */
export const Elements = ['arcane', 'fire', 'ice', 'storm', 'blade'];

/**
 * The families.
 *
 * `takes` is how much damage each element does to them, and anything not named is 1. A number
 * above one is a weakness; below one is armour. Each family is weak to exactly one thing and
 * armoured against exactly one other, because two of each is a table nobody reads.
 *
 * The two numbers are deliberately lopsided - a weakness more than doubles, armour takes off less
 * than half. The table is meant to reward bringing the right spell, not to punish bringing the
 * wrong one: at even odds the fourth stage went from a third of runs cleared to a seventh for a
 * player who simply had not read the map yet.
 *
 * Every weakness points at an element that is available from the first account level - Fireball,
 * Shards and Orbit are all unlocked at level one - so a stage never asks for something the player
 * cannot have yet.
 *
 * It also points at an element that CARRIES REAL DAMAGE, which is not the same thing and was
 * learnt the hard way. Ice was a weakness first, and measured against the same wave with the
 * table on and off it changed nothing at all: Frost Orb is a utility spell doing seven damage,
 * so doubling it doubles almost nothing. Fire and blade are the two elements several spells carry
 * and one of them is Orbit, which does more damage than anything else in a run - turning that
 * table on against wurms moved the kill count twenty-five per cent on its own.
 *
 * So two families share a weakness to fire. That is deliberate: fire is the generalist, wurms are
 * its answer, and the loadout decision is the legible one - bring fire for stages two and three,
 * swap to blade for four.
 */
export const Families = {
  folk: {
    name: ['Folk', 'İnsanlar'],
    about: ['Whatever used to live here. Nothing about them is clever and nothing about them stops.',
            'Eskiden burada yaşayan her neyse. Akıllıca hiçbir yanları yok, duran hiçbir yanları da.'],
    takes: {},
  },
  swarm: {
    name: ['Swarm', 'Sürü'],
    about: ['Wings, and too many of them. They go up like paper; a circling blade mostly swings under them.',
            'Kanatlar, ve fazlasıyla çok. Kâğıt gibi tutuşuyorlar; dönen bir bıçak çoğunlukla altlarından geçiyor.'],
    takes: { fire: 2.1, blade: 0.6 },
  },
  spider: {
    name: ['Spiders', 'Örümcekler'],
    about: ['They come low and fast and from further out than anything else. They burn easily, and they hardly feel lightning at all.',
            'Alçaktan, hızlı ve her şeyden uzaktan geliyorlar. Kolay yanıyorlar, ve yıldırımı neredeyse hiç hissetmiyorlar.'],
    takes: { fire: 2.1, storm: 0.55 },
  },
  wurm: {
    name: ['Wurms', 'Kurtlar'],
    about: ['Long, segmented, and slow to notice they have been hurt. A blade takes them apart a piece at a time; fire barely marks the hide.',
            'Uzun, boğum boğum, ve yaralandığını geç fark ediyor. Bıçak onları parça parça ayırıyor; ateş derilerini zor işaretliyor.'],
    takes: { blade: 2.1, fire: 0.55 },
  },
};

export const FamilyKeys = Object.keys(Families);

/** How much damage an element does to a family. One when nothing is said. */
export function takes(family, element) {
  const f = Families[family];
  if (!f || !element) return 1;
  return f.takes[element] ?? 1;
}

/** What a family is weak to, and what it is armoured against. Null when it is neither. */
export function weakness(family) {
  const f = Families[family];
  if (!f) return null;
  const found = Object.entries(f.takes).find(([, n]) => n > 1);
  return found ? { element: found[0], much: found[1] } : null;
}

export function armour(family) {
  const f = Families[family];
  if (!f) return null;
  const found = Object.entries(f.takes).find(([, n]) => n < 1);
  return found ? { element: found[0], much: found[1] } : null;
}

/**
 * Which families a stage sends.
 *
 * The first four stages are one family each, so each is met alone and learnt before it is mixed
 * with anything. From the fifth they pair up. Past the list it starts again with one more family
 * thrown in each time round, so the twentieth stage is everything at once - the pattern does not
 * run out, it thickens.
 */
export const StageFamilies = [
  ['folk'],
  ['swarm'],
  ['spider'],
  ['wurm'],
  ['swarm', 'folk'],
  ['spider', 'folk'],
  ['wurm', 'swarm'],
  ['spider', 'wurm'],
];

export function familiesOn(stage) {
  const n = Math.max(1, Math.floor(stage));
  const at = (n - 1) % StageFamilies.length;
  const round = Math.floor((n - 1) / StageFamilies.length);
  const out = [...StageFamilies[at]];
  for (let i = 0; i < round && out.length < FamilyKeys.length; i++) {
    const next = FamilyKeys.find((k) => !out.includes(k));
    if (next) out.push(next);
  }
  return out;
}

/** Which family a given creature belongs to, chosen from the stage's list. */
export function familyFor(stage, roll) {
  const list = familiesOn(stage);
  return list[Math.max(0, Math.min(list.length - 1, Math.floor(roll * list.length)))];
}

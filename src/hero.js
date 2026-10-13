// The hero ladder: fifty small, permanent upgrades, bought one at a time with experience.
//
// Data only. Every step is general - a little more damage, a little more wall, a little less
// waiting - and **none of it is tied to a particular spell**. The spells have their own upgrades
// inside a run; this is the thing that is still there tomorrow, and a step that only helped one
// spell would quietly decide which spell you bring.
//
// The steps are deliberately small. They are not meant to be felt one at a time; they are meant
// to be the reason stage five is possible in two months and is not today.

export const Steps = 50;

/**
 * What one step of each kind gives.
 *
 * `mult` grows twice over the ladder, so a step near the top is worth more than a step near the
 * bottom - without that, the last step costs twelve times the first and hands over exactly the
 * same thing.
 */
export const Bonus = {
  dmg:  { step: 0.025, pct: true,  name: ['Damage', 'Hasar'],        tells: ['+{0}% damage from every spell', 'her büyüden +%{0} hasar'] },
  wall: { step: 10,    pct: false, name: ['Wall', 'Duvar'],          tells: ['+{0} to the wall', 'duvara +{0}'] },
  cd:   { step: 0.005, pct: true,  name: ['Haste', 'Çeviklik'],      tells: ['-{0}% cooldown on every spell', 'her büyüde -%{0} bekleme'] },
  area: { step: 0.015, pct: true,  name: ['Reach', 'Erim'],          tells: ['+{0}% blast and beam size', '+%{0} patlama ve ışın boyu'] },
  mend: { step: 0.15,  pct: false, name: ['Mending', 'Onarım'],      tells: ['the wall repairs {0}/sec', 'duvar saniyede {0} onarılır'] },
  gain: { step: 0.02,  pct: true,  name: ['Learning', 'Öğrenme'],    tells: ['+{0}% experience from a stage', 'bölümden +%{0} deneyim'] },
};

/** The order they come in. Repeats every ten, so the ladder has a readable rhythm. */
const Rhythm = ['dmg', 'wall', 'cd', 'dmg', 'area', 'wall', 'dmg', 'cd', 'gain', 'mend'];

/**
 * What the nth step costs.
 *
 * 250, then 500, then rising more gently. Measured against what a stage pays - 143 experience
 * for the first, 725 for the fourth - the whole ladder comes to about 96,500, which is a couple
 * of hundred stages. It is meant to be a long road, not a wall.
 */
export function costOf(n) {
  return Math.round((250 + 250 * Math.pow(Math.max(0, n - 1), 0.62)) / 10) * 10;
}

/** A step grows in size twice on the way up, so the dear ones are worth their price. */
export function sizeAt(n) {
  return n > 35 ? 2 : n > 20 ? 1.5 : 1;
}

export const Ladder = Array.from({ length: Steps }, (_, i) => {
  const n = i + 1;
  const key = Rhythm[i % Rhythm.length];
  return { n, key, amount: Bonus[key].step * sizeAt(n), cost: costOf(n) };
});

/** How a step reads on its own line. */
export function amountText(key, amount) {
  const b = Bonus[key];
  if (b.pct) return Math.round(amount * 1000) / 10;
  return Math.round(amount * 100) / 100;
}

/** Everything bought so far, added up. `taken` is how many steps of the ladder are owned. */
export function totals(taken = 0) {
  const out = { dmg: 0, wall: 0, cd: 0, area: 0, mend: 0, gain: 0 };
  for (let i = 0; i < Math.min(taken, Steps); i++) {
    const s = Ladder[i];
    out[s.key] += s.amount;
  }
  return out;
}

/** What the whole ladder costs, for anything that wants to say how long the road is. */
export const wholeLadder = Ladder.reduce((a, s) => a + s.cost, 0);

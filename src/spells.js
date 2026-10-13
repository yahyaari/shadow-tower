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
//
// Every piece of writing is a pair, English then Turkish, read through `say()` in `text.js`. The
// translation sits beside the thing it names so the two cannot drift apart.

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

// The caps are deliberately low.
//
// A spell has to run out of upgrades, because a pick spent on a spell you already own multiplies
// what that spell does while a pick spent on a second spell only adds to the total - so without a
// ceiling, pouring everything into one spell always beats carrying five, and the loadout stops
// meaning anything.
const sharper = (most = 3) => ({
  key: 'sharper', name: ['Sharper', 'Keskin'], tells: ['+18% damage', '+%18 hasar'],
  does: { dmg: 0.18 }, most,
});
const quicker = (most = 2) => ({
  key: 'quicker', name: ['Quicker', 'Çevik'], tells: ['-13% cooldown', '-%13 bekleme'],
  does: { cd: -0.13 }, most,
});
const wider = (most = 3) => ({
  key: 'wider', name: ['Wider', 'Geniş'], tells: ['+22% blast', '+%22 patlama'],
  does: { blast: 0.22 }, most,
});

export const Spells = {
  bolt: {
    name: ['Magic Bolt', 'Sihirli Ok'],
    tells: ['a homing bolt at the nearest', 'en yakındakini takip eden bir ok'],
    every: 0.85, damage: 7, seeks: 'near', homing: true,
    boosts: [
      { key: 'more', name: ['Twin Bolt', 'İkiz Ok'], tells: ['+1 bolt each cast', 'her atışta +1 ok'], does: { count: 1 }, most: 2 },
      { key: 'flank', name: ['Flanking', 'Kanat Ateşi'], tells: ['+2 bolts, one to each side', 'sağa ve sola birer ok'], does: { count: 2, spread: 0.5 }, most: 1 },
      { key: 'pierce', name: ['Piercing', 'Delici'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 2 },
      sharper(), quicker(),
    ],
    evolutions: [
      { key: 'split', name: ['Splinter', 'Parçalanma'], tells: ['splits into two smaller bolts where it lands', 'düştüğü yerde iki küçük oka ayrılır'], onHit: 'split' },
      { key: 'burst', name: ['Detonate', 'Patlama'], tells: ['bursts where it lands', 'düştüğü yerde patlar'], onHit: 'burst' },
      { key: 'fire', name: ['Ignite', 'Tutuşturma'], tells: ['leaves fire where it lands', 'düştüğü yerde yangın bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'storm', name: ['Conduct', 'İletim'], tells: ['an electric storm where it lands', 'düştüğü yerde elektrik fırtınası'], onHit: 'storm', needs: 'lightning' },
      { key: 'freeze', name: ['Rime', 'Kırağı'], tells: ['a freezing burst where it lands', 'düştüğü yerde dondurucu patlama'], onHit: 'freeze', needs: 'frost' },
    ],
  },

  shards: {
    name: ['Shards', 'Kıymıklar'],
    tells: ['three splinters in a fan', 'yelpaze şeklinde üç kıymık'],
    every: 1.7, damage: 5, seeks: 'near', count: 3, spread: 0.42,
    boosts: [
      { key: 'more', name: ['More Shards', 'Daha Çok Kıymık'], tells: ['+2 shards', '+2 kıymık'], does: { count: 2 }, most: 2 },
      { key: 'fan', name: ['Wide Fan', 'Geniş Yelpaze'], tells: ['a wider spread', 'daha geniş açılır'], does: { spread: 0.25 }, most: 2 },
      { key: 'pierce', name: ['Piercing', 'Delici'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 2 },
      sharper(), quicker(),
    ],
    evolutions: [
      { key: 'burst', name: ['Shrapnel', 'Şarapnel'], tells: ['every shard bursts where it lands', 'her kıymık düştüğü yerde patlar'], onHit: 'burst' },
      { key: 'split', name: ['Fracture', 'Çatlak'], tells: ['every shard splits in two', 'her kıymık ikiye ayrılır'], onHit: 'split' },
      { key: 'fire', name: ['Firebrand', 'Ateş Kıymığı'], tells: ['every shard leaves fire', 'her kıymık yangın bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'storm', name: ['Live Wire', 'Canlı Tel'], tells: ['every shard leaves a storm', 'her kıymık fırtına bırakır'], onHit: 'storm', needs: 'lightning' },
    ],
  },

  wisp: {
    name: ['Wisp', 'Ruh Ateşi'],
    tells: ['hunts whatever is toughest', 'en dayanıklı olanı avlar'],
    every: 1.5, damage: 11, seeks: 'strong', homing: true,
    boosts: [
      { key: 'more', name: ['Second Wisp', 'İkinci Ruh'], tells: ['+1 wisp', '+1 ruh ateşi'], does: { count: 1 }, most: 2 },
      { key: 'pierce', name: ['Relentless', 'Yılmaz'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 2 },
      sharper(), quicker(), wider(2),
    ],
    evolutions: [
      { key: 'burst', name: ['Burst Soul', 'Patlayan Ruh'], tells: ['bursts on its quarry', 'avının üstünde patlar'], onHit: 'burst' },
      { key: 'split', name: ['Divide', 'Bölünme'], tells: ['splits into two smaller wisps', 'iki küçük ruha ayrılır'], onHit: 'split' },
      { key: 'freeze', name: ['Cold Hunt', 'Soğuk Av'], tells: ['a freezing burst on its quarry', 'avının üstünde dondurucu patlama'], onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: ['Arc Hunt', 'Yıldırımlı Av'], tells: ['a storm on its quarry', 'avının üstünde fırtına'], onHit: 'storm', needs: 'lightning' },
    ],
  },

  fireball: {
    name: ['Fireball', 'Ateş Topu'],
    tells: ['bursts where it lands', 'düştüğü yerde patlar'],
    every: 2.6, damage: 12, seeks: 'crowd', blast: 86,
    boosts: [
      { key: 'more', name: ['Twin Flame', 'İkiz Alev'], tells: ['+1 fireball', '+1 ateş topu'], does: { count: 1, spread: 0.3 }, most: 2 },
      wider(4), sharper(), quicker(),
      { key: 'pierce', name: ['Overshoot', 'Aşırı Atış'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 1 },
    ],
    evolutions: [
      { key: 'fire', name: ['Wildfire', 'Yangın'], tells: ['leaves fire burning where it lands', 'düştüğü yerde yangın bırakır'], onHit: 'fire' },
      { key: 'split', name: ['Scatter Shot', 'Saçma'], tells: ['throws two smaller fireballs out of the burst', 'patlamadan iki küçük ateş topu savurur'], onHit: 'split' },
      { key: 'storm', name: ['Firestorm', 'Ateş Fırtınası'], tells: ['an electric storm in the flames', 'alevlerin içinde elektrik fırtınası'], onHit: 'storm', needs: 'lightning' },
      { key: 'freeze', name: ['Thermal Shock', 'Isı Şoku'], tells: ['the burst freezes as it goes out', 'patlama sönerken dondurur'], onHit: 'freeze', needs: 'frost' },
    ],
  },

  frost: {
    name: ['Frost Orb', 'Buz Küresi'],
    tells: ['bursts, and what it touches slows', 'patlar, değdiğini yavaşlatır'],
    every: 2.3, damage: 7, seeks: 'near', blast: 76, chill: 2.4,
    boosts: [
      { key: 'deep', name: ['Deep Cold', 'Derin Soğuk'], tells: ['+1.4s of slow', '+1.4sn yavaşlatma'], does: { chill: 1.4 }, most: 3 },
      { key: 'more', name: ['Second Orb', 'İkinci Küre'], tells: ['+1 orb', '+1 küre'], does: { count: 1, spread: 0.3 }, most: 2 },
      wider(4), sharper(), quicker(),
    ],
    evolutions: [
      { key: 'freeze', name: ['Deep Freeze', 'Derin Donma'], tells: ['a second freezing burst where it lands', 'düştüğü yerde ikinci bir dondurucu patlama'], onHit: 'freeze' },
      { key: 'split', name: ['Shatter', 'Parçalama'], tells: ['throws two smaller orbs out of the burst', 'patlamadan iki küçük küre savurur'], onHit: 'split' },
      { key: 'fire', name: ['Thermal Split', 'Isı Yarığı'], tells: ['leaves fire in the frost', 'buzun içinde yangın bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'storm', name: ['Conduct', 'İletim'], tells: ['a storm in the frost', 'buzun içinde fırtına'], onHit: 'storm', needs: 'lightning' },
    ],
  },

  lightning: {
    name: ['Lightning', 'Yıldırım'],
    tells: ['leaps between them', 'aralarında sıçrar'],
    every: 2.5, damage: 10, instant: 'chain', jumps: 3,
    boosts: [
      { key: 'jump', name: ['Further Leap', 'Uzun Sıçrayış'], tells: ['+1 jump', '+1 sıçrayış'], does: { jumps: 1 }, most: 3 },
      { key: 'twice', name: ['Double Strike', 'Çifte Vuruş'], tells: ['strikes twice', 'iki kere vurur'], does: { count: 1 }, most: 1 },
      sharper(), quicker(), wider(2),
    ],
    evolutions: [
      { key: 'storm', name: ['Thunderhead', 'Fırtına Bulutu'], tells: ['a storm where the chain ends', 'zincirin bittiği yerde fırtına'], onHit: 'storm' },
      { key: 'burst', name: ['Discharge', 'Boşalma'], tells: ['bursts at every link', 'her halkada patlar'], onHit: 'burst' },
      { key: 'fire', name: ['Scorch', 'Kavurma'], tells: ['leaves fire at every link', 'her halkada yangın bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: ['Flash Freeze', 'Ani Donma'], tells: ['freezes at every link', 'her halkada dondurur'], onHit: 'freeze', needs: 'frost' },
    ],
  },

  laser: {
    name: ['Beam', 'Işın'],
    tells: ['burns a line clean through', 'bir hattı boydan boya yakar'],
    every: 3.4, damage: 20, instant: 'beam', wide: 34,
    boosts: [
      { key: 'thick', name: ['Thicker Beam', 'Kalın Işın'], tells: ['+30% width', '+%30 kalınlık'], does: { wide: 0.3 }, most: 3 },
      { key: 'more', name: ['Second Beam', 'İkinci Işın'], tells: ['+1 beam, elsewhere', 'başka bir yöne +1 ışın'], does: { count: 1 }, most: 2 },
      sharper(), quicker(), wider(2),
    ],
    evolutions: [
      { key: 'burst', name: ['Overload', 'Aşırı Yük'], tells: ['bursts along the line', 'hat boyunca patlar'], onHit: 'burst' },
      { key: 'fire', name: ['Scorched Earth', 'Yanık Toprak'], tells: ['leaves the line burning', 'hattı yanar halde bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: ['Cold Light', 'Soğuk Işık'], tells: ['freezes along the line', 'hat boyunca dondurur'], onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: ['Arc Lance', 'Yıldırım Mızrağı'], tells: ['a storm at the far end', 'hattın ucunda fırtına'], onHit: 'storm', needs: 'lightning' },
    ],
  },

  nova: {
    name: ['Nova', 'Nova'],
    tells: ['everything near the wall, at once', 'duvara yakın ne varsa, hepsi birden'],
    every: 3.8, damage: 15, instant: 'nova', blast: 190,
    boosts: [
      wider(4), sharper(), quicker(),
      { key: 'more', name: ['Second Pulse', 'İkinci Dalga'], tells: ['pulses twice', 'iki kere dalgalanır'], does: { count: 1 }, most: 2 },
      { key: 'deep', name: ['Lingering', 'Kalıcı'], tells: ['slows what it catches', 'yakaladığını yavaşlatır'], does: { chill: 1.2 }, most: 2 },
    ],
    evolutions: [
      { key: 'burst', name: ['Shockwave', 'Şok Dalgası'], tells: ['a second burst further out', 'daha dışarıda ikinci bir patlama'], onHit: 'burst' },
      { key: 'fire', name: ['Ring of Fire', 'Ateş Çemberi'], tells: ['leaves a ring of fire', 'bir ateş çemberi bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: ['Winter', 'Kış'], tells: ['freezes everything it catches', 'yakaladığı her şeyi dondurur'], onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: ['Tempest', 'Kasırga'], tells: ['a storm around the wall', 'duvarın çevresinde fırtına'], onHit: 'storm', needs: 'lightning' },
    ],
  },

  meteor: {
    name: ['Meteor', 'Meteor'],
    tells: ['falls on the thickest part of the crowd', 'kalabalığın en yoğun yerine düşer'],
    every: 5, damage: 34, seeks: 'crowd', falls: true, blast: 110,
    boosts: [
      { key: 'more', name: ['Shower', 'Yağmur'], tells: ['+1 meteor', '+1 meteor'], does: { count: 1 }, most: 2 },
      wider(4), sharper(), quicker(),
      { key: 'deep', name: ['Crushing', 'Ezici'], tells: ['slows what survives', 'sağ kalanı yavaşlatır'], does: { chill: 1.2 }, most: 2 },
    ],
    evolutions: [
      { key: 'fire', name: ['Cinder', 'Köz'], tells: ['leaves the crater burning', 'krateri yanar halde bırakır'], onHit: 'fire' },
      { key: 'split', name: ['Breakup', 'Dağılma'], tells: ['throws two smaller rocks out of the crater', 'kraterden iki küçük kaya savurur'], onHit: 'split' },
      { key: 'storm', name: ['Ion Strike', 'İyon Vuruşu'], tells: ['a storm in the crater', 'kraterin içinde fırtına'], onHit: 'storm', needs: 'lightning' },
      { key: 'freeze', name: ['Cold Iron', 'Soğuk Demir'], tells: ['the crater freezes', 'krater donar'], onHit: 'freeze', needs: 'frost' },
    ],
  },

  blade: {
    name: ['Orbit', 'Yörünge'],
    tells: ['a blade circling you, always', 'çevrende sürekli dönen bir bıçak'],
    every: 0.55, damage: 9, orbit: true,
    boosts: [
      { key: 'more', name: ['Second Blade', 'İkinci Bıçak'], tells: ['+1 blade', '+1 bıçak'], does: { count: 1 }, most: 2 },
      { key: 'whirl', name: ['Faster', 'Daha Hızlı'], tells: ['+25% orbit speed', '+%25 dönüş hızı'], does: { whirl: 0.25 }, most: 3 },
      { key: 'ring', name: ['Wider Orbit', 'Geniş Yörünge'], tells: ['+20% orbit radius', '+%20 yörünge yarıçapı'], does: { ring: 0.2 }, most: 3 },
      sharper(), quicker(),
    ],
    evolutions: [
      { key: 'burst', name: ['Cleave', 'Yarma'], tells: ['bursts on everything it touches', 'değdiği her şeyde patlar'], onHit: 'burst' },
      { key: 'fire', name: ['Brand', 'Dağlama'], tells: ['leaves a trail of fire', 'arkasında ateş izi bırakır'], onHit: 'fire', needs: 'fireball' },
      { key: 'freeze', name: ['Hoarfrost', 'Kırç'], tells: ['freezes what it touches', 'değdiğini dondurur'], onHit: 'freeze', needs: 'frost' },
      { key: 'storm', name: ['Live Edge', 'Canlı Kenar'], tells: ['a storm on what it touches', 'değdiği yerde fırtına'], onHit: 'storm', needs: 'lightning' },
    ],
  },
};

export const spellKeys = Object.keys(Spells);

/** What you can take instead of a spell upgrade. Each one helps everything you own. */
export const Passives = {
  might: { name: ['Might', 'Kudret'], tells: ['+15% damage, everything', 'her şeye +%15 hasar'] },
  haste: { name: ['Haste', 'Çeviklik'], tells: ['+13% cast speed, everything', 'her şeye +%13 atış hızı'] },
  reach: { name: ['Reach', 'Erim'], tells: ['+18% blast and beam size', '+%18 patlama ve ışın boyu'] },
  mend:  { name: ['Mend', 'Onarım'], tells: ['the wall rebuilds itself', 'duvar kendini onarır'] },
};

export const passiveKeys = Object.keys(Passives);
export const MostPassive = 5;

/** How many you may carry. */
export const LoadoutSize = 5;

/**
 * When each spell becomes available to put in a loadout.
 *
 * Five are open from the first minute, which is the whole loadout - so the very first run is
 * played with a full hand rather than with one spell and four empty slots. Opening on an almost
 * empty screen made the account look like homework and made the first run the weakest the game
 * ever gets, which is the wrong way round.
 *
 * The other five are what the account is for: each one arrives as a reason to come back, and
 * each one changes what the first five can become, because a third of the tier cards are borrowed
 * from another spell.
 */
export const UnlockAt = {
  bolt: 1,
  shards: 1,
  fireball: 1,
  frost: 1,
  blade: 1,
  lightning: 3,
  wisp: 5,
  nova: 7,
  laser: 10,
  meteor: 13,
};

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

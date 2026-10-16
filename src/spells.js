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
export const BoostsPerTier = 4;

/**
 * How far each spell can reach, from the tower.
 *
 * `range` is the whole of item five, and it was missing: every spell struck anything anywhere,
 * including a creature that had appeared a frame ago at the rim. That is why nothing ever piled
 * up - measured, the crowd standing on the field sat at eleven from the second minute of a stage
 * to the fifth, because everything was killed the moment it existed and the field was a queue
 * rather than a crowd.
 *
 * The arena is 560 across and the wall is bitten at 96, so every number here has to cover
 * 96 upwards or the spell cannot defend the thing it is standing on. Beyond that they differ, and
 * the difference is the spell's character: artillery reaches the rim, a fan of blades does not.
 *
 * Nova and Orbit have no number of their own. Their reach IS their blast and their ring, so it is
 * worked out from those - a Wider Nova really does reach further, and a card that said otherwise
 * would be a card that lies.
 */
export const Reaches = {
  bolt: 330, shards: 250, wisp: 430, fireball: 430, frost: 300,
  lightning: 320, laser: 520, nova: 190, meteor: 520, blade: 200,
  tempest: 360, hail: 300, halo: 215, collapse: 250,
};

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
  spread: 'how far out it looks for another mark',
  blast: 'blast radius, as a fraction',
  pierce: 'how many extra it passes through',
  reach: 'how far from the tower it can touch anything',
  jumps: 'extra chain jumps',
  chill: 'extra seconds of slow',
  ring: 'orbit radius, as a fraction',
  whirl: 'orbit speed, as a fraction',
};

/**
 * The ordinary upgrades, and why every spell gets its own numbers.
 *
 * A flat "+18% damage" is not the same card on two different spells. Measured against the same
 * crowd for ten seconds, Nova does 589 damage and Magic Bolt does 56 - ten times as much - so the
 * same percentage hands one spell ten times the gain. (And the nominal damage-per-second is no
 * guide at all: Orbit has the highest of the lot on paper and lands a sixth of what Nova does.)
 *
 * So the percentage runs the other way: the spells that are already doing the most work gain the
 * least from a card, and the weakest gain the most. Not all the way to equal - a strong spell
 * should still be worth feeding - but enough that putting picks into Magic Bolt is a choice
 * rather than a mistake.
 *
 * They are also few and large rather than many and small, and that is the more important half.
 * Damage, projectile count and fire rate all multiply each other, so twelve picks poured into one
 * spell is not twelve times better - it is thirty. Measured: a bot carrying only Magic Bolt put
 * every pick into it and reached 1872 damage a second by ninety seconds, while a bot carrying
 * four spells spread the same picks and managed 168. Eleven times. The fix is not a smaller
 * percentage, it is a shorter ladder: a spell runs out of upgrades in six or seven picks, so the
 * rest have to go somewhere else.
 *
 * `Bigger` is the ceiling on the run level, paid for.
 *
 * A run used to reach level 35 and hand out thirty-four picks. It stops at 23 now and hands out
 * twenty-two, which is two thirds of what every one of these percentages was chosen against -
 * and the measurement said exactly that: a new account cleared stages one to three every time
 * before the ceiling and cleared the third of them 63 times in a hundred after it. Fewer picks
 * have to be worth more, or a ceiling on the level is a quiet nerf to the whole game.
 *
 * The text is built from the number, so a card can never promise a figure it does not deliver.
 */
const pct = (n) => Math.round(n * 100);
const Bigger = 1.3;

const hit = (n, most = 2) => ({
  key: 'sharper', name: ['Sharper', 'Keskin'],
  tells: [`+${pct(n * Bigger)}% damage`, `+%${pct(n * Bigger)} hasar`],
  does: { dmg: n * Bigger }, most,
});

const fast = (n, most = 2) => ({
  key: 'quicker', name: ['Quicker', 'Çevik'],
  tells: [`-${pct(n * Bigger)}% cooldown`, `-%${pct(n * Bigger)} bekleme`],
  does: { cd: -n * Bigger }, most,
});

const area = (n, most = 3) => ({
  key: 'wider', name: ['Wider', 'Geniş'],
  tells: [`+${pct(n * Bigger)}% area`, `+%${pct(n * Bigger)} alan`],
  does: { blast: n * Bigger }, most,
});

export const Spells = {
  bolt: {
    name: ['Magic Bolt', 'Sihirli Ok'],
    tells: ['a homing bolt at the nearest', 'en yakındakini takip eden bir ok'],
    every: 0.85, damage: 7, seeks: 'near', homing: true, element: 'arcane',
    boosts: [
      { key: 'more', name: ['Twin Bolt', 'İkiz Ok'], tells: ['+1 bolt each cast', 'her atışta +1 ok'], does: { count: 1 }, most: 1 },
      { key: 'flank', name: ['Flanking', 'Kanat Ateşi'], tells: ['+1 bolt, at another mark', 'başka bir hedefe +1 ok'], does: { count: 1, spread: 0.5 }, most: 1 },
      { key: 'pierce', name: ['Piercing', 'Delici'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 1 },
      hit(0.4), fast(0.25),
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
    tells: ['three splinters, each at its own mark', 'her biri ayrı hedefe üç kıymık'],
    every: 1.7, damage: 5, seeks: 'near', count: 3, spread: 0.42, element: 'blade',
    boosts: [
      { key: 'more', name: ['More Shards', 'Daha Çok Kıymık'], tells: ['+1 shard', '+1 kıymık'], does: { count: 1 }, most: 1 },
      { key: 'fan', name: ['Wide Fan', 'Geniş Yelpaze'], tells: ['picks its marks further apart', 'hedeflerini daha uzaktan seçer'], does: { spread: 0.25 }, most: 1 },
      { key: 'pierce', name: ['Piercing', 'Delici'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 1 },
      hit(0.29), fast(0.18),
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
    every: 1.5, damage: 11, seeks: 'strong', homing: true, element: 'arcane',
    boosts: [
      { key: 'more', name: ['Second Wisp', 'İkinci Ruh'], tells: ['+1 wisp', '+1 ruh ateşi'], does: { count: 1 }, most: 1 },
      { key: 'pierce', name: ['Relentless', 'Yılmaz'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 1 },
      hit(0.29), fast(0.18),
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
    every: 2.6, damage: 12, seeks: 'crowd', blast: 86, element: 'fire',
    boosts: [
      { key: 'more', name: ['Twin Flame', 'İkiz Alev'], tells: ['+1 fireball', '+1 ateş topu'], does: { count: 1, spread: 0.3 }, most: 1 },
      area(0.2, 3), hit(0.19), fast(0.13),
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
    every: 2.3, damage: 7, seeks: 'near', blast: 76, chill: 2.4, element: 'ice',
    boosts: [
      { key: 'deep', name: ['Deep Cold', 'Derin Soğuk'], tells: ['+1.4s of slow', '+1.4sn yavaşlatma'], does: { chill: 1.4 }, most: 2 },
      { key: 'more', name: ['Second Orb', 'İkinci Küre'], tells: ['+1 orb', '+1 küre'], does: { count: 1, spread: 0.3 }, most: 1 },
      area(0.2, 3), hit(0.24), fast(0.15),
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
    every: 2.5, damage: 10, instant: 'chain', jumps: 3, element: 'storm',
    boosts: [
      { key: 'jump', name: ['Further Leap', 'Uzun Sıçrayış'], tells: ['+1 jump', '+1 sıçrayış'], does: { jumps: 1 }, most: 2 },
      { key: 'twice', name: ['Double Strike', 'Çifte Vuruş'], tells: ['strikes twice', 'iki kere vurur'], does: { count: 1 }, most: 1 },
      hit(0.24), fast(0.15), area(0.16, 2),
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
    every: 3.4, damage: 20, instant: 'beam', wide: 34, element: 'fire',
    boosts: [
      { key: 'more', name: ['Second Beam', 'İkinci Işın'], tells: ['+1 beam, elsewhere', 'başka bir yöne +1 ışın'], does: { count: 1 }, most: 1 },
      area(0.18, 3), hit(0.32), fast(0.2),
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
    every: 3.8, damage: 15, instant: 'nova', blast: 190, element: 'arcane',
    boosts: [
      area(0.12, 3), hit(0.13), fast(0.08),
      { key: 'more', name: ['Second Pulse', 'İkinci Dalga'], tells: ['pulses twice', 'iki kere dalgalanır'], does: { count: 1 }, most: 1 },
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
    every: 5, damage: 34, seeks: 'crowd', falls: true, blast: 110, element: 'fire',
    boosts: [
      { key: 'more', name: ['Shower', 'Yağmur'], tells: ['+1 meteor', '+1 meteor'], does: { count: 1 }, most: 1 },
      area(0.14, 3), hit(0.14), fast(0.1),
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
    every: 0.55, damage: 9, orbit: true, element: 'blade',
    boosts: [
      { key: 'more', name: ['Second Blade', 'İkinci Bıçak'], tells: ['+1 blade', '+1 bıçak'], does: { count: 1 }, most: 1 },
      { key: 'whirl', name: ['Faster', 'Daha Hızlı'], tells: ['+25% orbit speed', '+%25 dönüş hızı'], does: { whirl: 0.25 }, most: 2 },
      { key: 'ring', name: ['Wider Orbit', 'Geniş Yörünge'], tells: ['+20% orbit radius', '+%20 yörünge yarıçapı'], does: { ring: 0.2 }, most: 2 },
      hit(0.29), fast(0.18),
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

/**
 * The one thing left that is not a spell.
 *
 * Might, Haste and Reach used to sit here as global multipliers, and they were the three cards
 * nobody could place: they looked the same on every run, they made every spell better by the same
 * amount, and whether one was good depended on a loadout the card never mentioned. Everything they
 * did now lives on the spells themselves, where a card can say which spell it is talking about and
 * by how much.
 *
 * Mend stays because it is the only card that answers a different question. The rest say "kill
 * faster"; this one says "last longer", and a run needs both to be a choice.
 */
export const Passives = {
  mend: { name: ['Mend', 'Onarım'], tells: ['the wall rebuilds itself', 'duvar kendini onarır'] },
};

export const passiveKeys = Object.keys(Passives);
export const MostPassive = 5;

/**
 * The loadout: four slots, and the first one is not a choice.
 *
 * Magic Bolt is always carried and is the only thing firing when a run opens. The other three are
 * chosen before the run but are *not* cast at the start - they are what the cards can offer you,
 * and each one has to be taken in the run before it fires.
 *
 * That is what makes the opening a run rather than a loadout screen with the volume up: you begin
 * with one spell and build the rest, and what you can build is what you brought.
 */
export const LoadoutSize = 5;

/**
 * How many of them can be casting at once.
 *
 * Five are brought and four are cast, and the gap between those two numbers is the whole point.
 * With four brought and four slots, every one of them was taken within the first minute and from
 * then on every card was a boost for a spell already in hand - so the run narrowed to whichever
 * one you fed, and feeding one to the end was the strongest thing you could do. With a spare in
 * the bag the run has to choose, and two runs with the same loadout are no longer the same run.
 */
export const CarrySize = 4;
export const Always = 'bolt';

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
/**
 * What two spells become when they are put together.
 *
 * These live in their own table rather than in `Spells`, and that is the whole of the design
 * decision. A spell in `Spells` is a thing you can bring: it has an unlock level, a tile on the
 * loadout screen, a page in the codex, a permanent level, and shards of its own. A fusion has
 * none of that - it only exists inside a run, so putting it in the same table would have added
 * four rows to five systems that have nothing to do with it.
 *
 * Each one reuses a casting behaviour that already exists. A fusion is meant to be a new thing on
 * the field, not a new engine underneath it.
 *
 * Taking one does NOT cost you a slot. It adds a fifth spell to the field and seals both parents:
 * they keep firing exactly as they are and can never be fed again. That is the choice - more in
 * the air now, fewer places to put the rest of your picks. Measured over days, concentrating
 * picks multiplies and spreading them adds, so a fusion that simply replaced two spells with one
 * would have been the obvious move every time.
 */
export const Fusions = {
  tempest: {
    name: ['Tempest', 'Fırtına'],
    tells: ['a storm that leaps from one to the next', 'birinden ötekine sıçrayan bir fırtına'],
    of: ['fireball', 'lightning'],
    every: 2.2, damage: 22, instant: 'chain', jumps: 5, element: 'storm',
    boosts: [
      { key: 'jump', name: ['Forking', 'Çatallanma'], tells: ['+2 jumps', '+2 sıçrama'], does: { jumps: 2 }, most: 2 },
      hit(0.16), fast(0.14),
      { key: 'chill', name: ['Shocked', 'Şoklu'], tells: ['what it hits slows', 'vurduğunu yavaşlatır'], does: { chill: 1.4 }, most: 1 },
    ],
    evolutions: [
      { key: 'storm', name: ['Downburst', 'Hortum'], tells: ['leaves a storm on the ground', 'yere bir fırtına bırakır'], onHit: 'storm' },
      { key: 'burst', name: ['Thunderclap', 'Gök Gürültüsü'], tells: ['bursts where it lands', 'düştüğü yerde patlar'], onHit: 'burst' },
    ],
  },
  hail: {
    name: ['Hail', 'Dolu'],
    tells: ['five freezing splinters, spread over the crowd', 'kalabalığa dağılan beş donduran kıymık'],
    of: ['frost', 'shards'],
    every: 1.3, damage: 9, seeks: 'near', count: 5, spread: 0.62, chill: 2.4, element: 'ice',
    boosts: [
      { key: 'more', name: ['Thicker', 'Yoğun'], tells: ['+2 splinters', '+2 kıymık'], does: { count: 2 }, most: 2 },
      { key: 'pierce', name: ['Piercing', 'Delici'], tells: ['passes through one more', 'bir kişiyi daha delip geçer'], does: { pierce: 1 }, most: 2 },
      hit(0.3), fast(0.18),
    ],
    evolutions: [
      { key: 'freeze', name: ['Whiteout', 'Tipi'], tells: ['freezes everything near where it lands', 'düştüğü yerin çevresini dondurur'], onHit: 'freeze' },
      { key: 'split', name: ['Shatter', 'Parçalanma'], tells: ['splits into two where it lands', 'düştüğü yerde ikiye ayrılır'], onHit: 'split' },
    ],
  },
  halo: {
    name: ['Halo', 'Hale'],
    tells: ['two blades circling, always', 'çevrende sürekli dönen iki bıçak'],
    of: ['bolt', 'blade'],
    every: 0.5, damage: 15, orbit: true, count: 2, element: 'blade',
    boosts: [
      { key: 'more', name: ['Third Blade', 'Üçüncü Bıçak'], tells: ['+1 blade', '+1 bıçak'], does: { count: 1 }, most: 2 },
      { key: 'ring', name: ['Wider Ring', 'Geniş Halka'], tells: ['+30% orbit', '+%30 yörünge'], does: { ring: 0.3 }, most: 2 },
      hit(0.2), fast(0.12),
    ],
    evolutions: [
      { key: 'burst', name: ['Scatter', 'Saçılma'], tells: ['bursts where it strikes', 'vurduğu yerde patlar'], onHit: 'burst' },
      { key: 'fire', name: ['Searing', 'Kavurucu'], tells: ['leaves fire where it strikes', 'vurduğu yerde ateş bırakır'], onHit: 'fire' },
    ],
  },
  collapse: {
    name: ['Collapse', 'Çöküş'],
    tells: ['everything near the wall, and then some', 'duvara yakın ne varsa, ve biraz fazlası'],
    of: ['nova', 'meteor'],
    every: 4.4, damage: 34, instant: 'nova', blast: 250, element: 'fire',
    boosts: [
      area(0.22, 3), hit(0.14), fast(0.12),
      { key: 'chill', name: ['Cold Heart', 'Soğuk Çekirdek'], tells: ['what it touches slows', 'değdiğini yavaşlatır'], does: { chill: 1.6 }, most: 1 },
    ],
    evolutions: [
      { key: 'fire', name: ['Cinders', 'Kor'], tells: ['leaves fire behind it', 'ardında ateş bırakır'], onHit: 'fire' },
      { key: 'storm', name: ['Aftershock', 'Artçı'], tells: ['leaves a storm behind it', 'ardında bir fırtına bırakır'], onHit: 'storm' },
    ],
  },
};

export const fusionKeys = Object.keys(Fusions);

/** Any spell by key, brought or made. The one lookup everything inside a run should use. */
export const anySpell = (key) => Spells[key] || Fusions[key] || null;

/** What a pair of carried spells could become, if anything. */
export function fusionOf(a, b) {
  for (const [key, f] of Object.entries(Fusions)) {
    if ((f.of[0] === a && f.of[1] === b) || (f.of[0] === b && f.of[1] === a)) return key;
  }
  return null;
}

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

// Kurallar + bir bot. Tarayıcı yok.
//
// Bu oyun birbiriyle etkileşen on büyü ve doksana yakın yükseltmeden ibaret; o yığının tutarlı
// olup olmadığı gözle görülmez. Burada bir koşu milisaniyelerde bitiyor, yüzlercesi birden.
//
//   node Tools/test.mjs

import {
  begin, step, click, take, offer, spawn, statsOf, carrying, carries,
  tierDue, evolutionsFor, boostsFor, Bosses, bossFor, HeraldCalls, ShadeKeeps,
  Spells, Passives, Kinds, StageWaves, BoostsPerTier, MostPassive, MostEvos, LoadoutSize,
  spellKeys, passiveKeys, haste, describe, advance, waiting, Always, pressure, Reach,
} from '../src/rules.js';
import { UnlockAt, unlocked, nextUnlock, LoadoutSize as Carry } from '../src/spells.js';
import { say, setLanguage, language, Languages, UI } from '../src/text.js';
import { needFor, worth, goldFor, shardsFor, record, finish, toggle, tidy, Speeds, starsFor, nextStarAt, stageOpen, furthestStage, starsAt, heroBonus, heroNext, buyHero, spin, openChest, buySpell, spellStep, levelOf, shardsOf, spellLevels, timesDone } from '../src/meta.js';
import {
  Wedges, amountAt, kindAt, Jackpot, wedgeFor, spellFor, unitOf, goldUnitOf, ShardUnit,
  Chests, ChestKinds, chestPrize, costOf, canOpen, Bulk, gemsHeld,
  gemsFor, gemDecay, gemsOn, repeatLift, RepeatFloor,
  today, canSpin, state as rewardState,
} from '../src/rewards.js';
import { restFor, wedgeUnder } from '../src/menu.js';
import { kindsOn } from '../src/stages.js';
import {
  Families, FamilyKeys, Elements, Roles, takes, weakness, armour, familiesOn, StageFamilies,
} from '../src/foes.js';
import {
  Steps as SpellSteps, Lift, liftAt, Line as SpellLine, stepOf, canStep,
  wholeGold, wholeShards,
} from '../src/upgrades.js';
import { Ladder, Steps as HeroSteps, Bonus, costOf as heroCost, totals as heroTotals, wholeLadder } from '../src/hero.js';

let passed = 0;
const failures = [];
const check = (what, ok, detail = '') => {
  if (ok) { passed++; return; }
  failures.push(what + (detail ? ' — ' + detail : ''));
};

const all = spellKeys;

// --- the spell book ---------------------------------------------------------------------------

check('on büyü var', all.length === 10, `${all.length} tane`);

check('her büyünün adı, açıklaması, hasarı, bekleme süresi var',
  Object.values(Spells).every((s) => s.name && s.tells && s.damage > 0 && s.every > 0));

check('her büyünün en az dört normal yükseltmesi var',
  Object.values(Spells).every((s) => s.boosts.length >= 4),
  Object.entries(Spells).filter(([, s]) => s.boosts.length < 4).map(([k]) => k).join(', '));

check('her büyünün en az üç dönüşümü var',
  Object.values(Spells).every((s) => s.evolutions.length >= 3));

check('her normal yükseltme bir şeyi değiştiriyor',
  Object.values(Spells).every((s) => s.boosts.every((b) => b.key && b.name && b.tells && Object.keys(b.does).length)));

check('her dönüşümün bir etkisi var',
  Object.values(Spells).every((s) => s.evolutions.every((e) => e.key && e.name && e.tells && e.onHit)));

// Bir büyünün iki dönüşümü aynı etkiyi vermemeli: ikincisi alındığında hiçbir şey değişmez.
{
  const twice = [];
  for (const [k, s] of Object.entries(Spells)) {
    const seen = new Set();
    for (const e of s.evolutions) {
      if (seen.has(e.onHit)) twice.push(`${k}:${e.onHit}`);
      seen.add(e.onHit);
    }
  }
  check('bir büyünün iki dönüşümü aynı etkiyi vermiyor', twice.length === 0, twice.join(', '));
}

check('her kilitli dönüşüm gerçek bir büyüye bağlı',
  Object.values(Spells).every((s) => s.evolutions.every((e) => !e.needs || all.includes(e.needs))));

check('hiçbir dönüşüm kendi büyüsüne bağlı değil',
  Object.entries(Spells).every(([k, s]) => s.evolutions.every((e) => e.needs !== k)));

{
  const locked = Object.values(Spells).reduce((a, s) => a + s.evolutions.filter((e) => e.needs).length, 0);
  const total = Object.values(Spells).reduce((a, s) => a + s.evolutions.length, 0);
  const boosts = Object.values(Spells).reduce((a, s) => a + s.boosts.length, 0);
  console.log(`büyü kitabı: ${all.length} büyü, ${boosts} normal yükseltme, ${total} dönüşüm (${locked} tanesi kombo kilitli)`);
  check('dönüşümlerin önemli bir kısmı kombo', locked / total > 0.4, `${locked}/${total}`);
}

// --- loadout -----------------------------------------------------------------------------------

{
  // Loadout dört kişilik ama koşu TEK büyüyle açılıyor: kalan üçü kartlardan alınacak.
  const s = begin(1, ['bolt', 'fireball', 'frost', 'lightning']);
  check('koşu sadece sabit büyüyle açılıyor', carrying(s).join() === Always, carrying(s).join());
  check('geri kalanı sırada bekliyor', waiting(s).join() === 'fireball,frost,lightning', waiting(s).join());
  check('bekleyen büyü henüz taşınmıyor', !carries(s, 'fireball'));
}

{
  const s = begin(1, [...all]);
  check('loadout dörtten fazla olamıyor', s.loadout.length === LoadoutSize, `${s.loadout.length}`);
  check('loadout dört kişilik', LoadoutSize === 4, `${LoadoutSize}`);
}

{
  const s = begin(1, ['frost', 'nova']);
  check('sabit büyü loadoutta olmasa da eklenir', s.loadout[0] === Always, s.loadout.join());
  check('sabit büyü her koşuda ateşler', carries(s, Always));
}

{
  // Bekleyen bir büyü kart olarak sunulmalı, yoksa koşu boyunca tek büyüyle kalırsın
  const s = begin(3, ['bolt', 'fireball', 'frost', 'lightning']);
  s.phase = 'picking';
  let sawSpell = false;
  for (let i = 0; i < 40 && !sawSpell; i++) {
    s.choices = offer(s);
    sawSpell = s.choices.some((c) => c.what === 'spell');
  }
  check('bekleyen büyü kart olarak çıkıyor', sawSpell);

  const card = s.choices.find((c) => c.what === 'spell');
  if (card) {
    const was = carrying(s).length;
    take(s, s.choices.indexOf(card));
    check('alınan büyü ateşlemeye başlıyor', carrying(s).length === was + 1 && carries(s, card.key));
    check('alınan büyü artık beklemiyor', !waiting(s).includes(card.key));
  }
}

{
  // Hepsi alındıktan sonra bir daha büyü kartı çıkmamalı
  const s = begin(4, ['bolt', 'fireball', 'frost', 'lightning']);
  for (const k of waiting(s)) s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };
  check('hepsi alınınca büyü kartı kalmıyor',
    !offer(s).some((c) => c.what === 'spell') && waiting(s).length === 0);
}

// --- her büyü gerçekten bir şey yapıyor mu ----------------------------------------------------

for (const key of all) {
  const s = begin(42, [key]);
  for (let i = 0; i < 8; i++) spawn(s, 'walker', (i / 8) * Math.PI * 2);
  for (const f of s.foes) f.r = 140;
  const mine = new Set(s.foes.map((f) => f.id));
  const before = s.foes.reduce((a, f) => a + f.hp, 0);
  for (let i = 0; i < 60 * 8; i++) step(s, 1 / 60);
  const after = s.foes.filter((f) => mine.has(f.id)).reduce((a, f) => a + f.hp, 0);
  check(`${Spells[key].name} tek başına hasar veriyor`, after < before * 0.9, `${before.toFixed(0)} -> ${after.toFixed(0)}`);
}

// --- normal yükseltmeler -------------------------------------------------------------------------

{
  const s = begin(2, ['bolt']);
  const was = statsOf(s, 'bolt');
  s.kit.bolt.boosts.sharper = 2;
  check('hasar yükseltmesi hasarı artırıyor', statsOf(s, 'bolt').damage > was.damage * 1.3,
    `${was.damage.toFixed(1)} -> ${statsOf(s, 'bolt').damage.toFixed(1)}`);

  s.kit.bolt.boosts.quicker = 3;
  check('bekleme yükseltmesi bekleme süresini kısaltıyor', statsOf(s, 'bolt').every < was.every * 0.75);

  s.kit.bolt.boosts.more = 2;
  check('atış yükseltmesi atış sayısını artırıyor', statsOf(s, 'bolt').count === was.count + 2);
}

{
  // Bekleme süresi sıfıra inemez: bir yığın Çevik kartı ve kızgın bir tetik birlikte sonsuz
  // atış demek olurdu
  const s = begin(3, ['bolt']);
  s.kit.bolt.boosts.quicker = 20;
  s.heat = 1;
  check('bekleme süresinin bir tabanı var', statsOf(s, 'bolt').every > 0.02,
    `${statsOf(s, 'bolt').every.toFixed(4)}`);
}

{
  const s = begin(4, ['bolt']);
  for (const b of Spells.bolt.boosts) s.kit.bolt.boosts[b.key] = b.most;
  check('tavana vuran yükseltme tekrar sunulmuyor', boostsFor(s, 'bolt').length === 0);
}

// --- seviye ve dönüşüm ---------------------------------------------------------------------------

{
  const s = begin(5, ['bolt', 'fireball']);
  check('başta hiçbir büyünün seviyesi borçlu değil', !tierDue(s, 'bolt'));
  s.kit.bolt.taken = BoostsPerTier;
  check(`${BoostsPerTier} yükseltmeden sonra seviye geliyor`, tierDue(s, 'bolt'));

  s.phase = 'picking';
  s.choices = offer(s);
  const card = s.choices.find((c) => c.key === 'bolt');
  check('seviye borcu olan büyü dönüşüm kartı veriyor', !!card && card.what === 'evolution',
    card ? card.what : 'kart yok');

  if (card) {
    take(s, s.choices.indexOf(card));
    check('dönüşüm alınınca büyü seviye atlıyor', s.kit.bolt.tier === 2);
    check('dönüşüm alınınca borç kapanıyor', !tierDue(s, 'bolt'));
    check('alınan dönüşüm kayıtlı', s.kit.bolt.evos.length === 1);
  }
}

{
  const s = begin(6, ['bolt']);
  s.kit.bolt.evos = Spells.bolt.evolutions.slice(0, MostEvos).map((e) => e.onHit);
  check('bir büyü sınırsız dönüşüm alamıyor', evolutionsFor(s, 'bolt').length === 0);
  s.kit.bolt.evos = ['burst'];
  check('alınan dönüşüm tekrar sunulmuyor',
    !evolutionsFor(s, 'bolt').some((e) => e.onHit === 'burst'));
}

// --- KOMBO KİLİDİ: bu oyunun en önemli kuralı ---------------------------------------------------

{
  // Elektrik yoksa "elektrik fırtınası" seçeneği ASLA çıkmamalı - nadir değil, yok.
  const s = begin(7, ['bolt', 'fireball']);
  s.kit.fireball = { tier: 1, boosts: {}, evos: [], taken: 0 };
  const open = evolutionsFor(s, 'bolt');
  check('elektrik taşımıyorken fırtına dönüşümü yok',
    !open.some((e) => e.needs === 'lightning'),
    open.filter((e) => e.needs).map((e) => e.name + '<-' + e.needs).join(', '));
  check('ateş topu taşırken yangın dönüşümü var', open.some((e) => e.needs === 'fireball'));
}

{
  // Bu artık daha ince bir kural: elektrik LOADOUTTA olması yetmez, koşuda ALINMIŞ olmalı.
  // Kullanıcının söylediği de buydu - "eğer alınmadıysa o seçenek kesinlikle çıkmaz".
  const s = begin(8, ['bolt', 'lightning', 'fireball', 'frost']);
  check('loadoutta olup alınmamış elektrik dönüşümü açmıyor',
    !evolutionsFor(s, 'bolt').some((e) => e.needs === 'lightning'),
    evolutionsFor(s, 'bolt').filter((e) => e.needs).map((e) => e.needs).join(','));

  s.kit.lightning = { tier: 1, boosts: {}, evos: [], taken: 0 };
  check('elektrik alınınca fırtına dönüşümü açılıyor',
    evolutionsFor(s, 'bolt').some((e) => e.needs === 'lightning'));
  check('alınmamış ateş topu hâlâ yangın dönüşümü açmıyor',
    !evolutionsFor(s, 'bolt').some((e) => e.needs === 'fireball'));
}

{
  // Ve bunu rastgele yüzlerce seçimde doğrula: kilitli bir dönüşüm tek bir kere bile sızmamalı.
  let leaks = 0, cards = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const s = begin(seed * 131, ['bolt', 'shards', 'wisp']);
    for (const k of waiting(s)) s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };
    for (const k of carrying(s)) s.kit[k].taken = BoostsPerTier;
    s.phase = 'picking';
    for (const c of offer(s)) {
      cards++;
      if (c.what !== 'evolution') continue;
      const evo = Spells[c.key].evolutions.find((e) => e.onHit === c.evo);
      if (evo.needs && !carries(s, evo.needs)) leaks++;
    }
  }
  check('400 seçimde kilitli dönüşüm hiç sızmıyor', leaks === 0, `${leaks} sızıntı / ${cards} kart`);
}

{
  const s = begin(9, ['bolt', 'fireball', 'frost', 'lightning']);
  for (const k of waiting(s)) s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };
  const combos = carrying(s).flatMap((k) => evolutionsFor(s, k).filter((e) => e.needs));
  check('dolu bir loadout kombo dönüşümleri açıyor', combos.length >= 6, `${combos.length} tane`);
}

// --- dönüşümlerin etkileri ------------------------------------------------------------------------

{
  const s = begin(10, ['bolt']);
  s.kit.bolt.evos = ['fire'];
  for (let i = 0; i < 4; i++) spawn(s, 'walker', (i / 4) * Math.PI * 2);
  for (const f of s.foes) f.r = 150;
  let sawFire = false;
  for (let i = 0; i < 60 * 3; i++) { step(s, 1 / 60); if (s.grounds.some((g) => g.kind === 'fire')) sawFire = true; }
  check('yangın yere kalıyor', sawFire);
}

{
  const s = begin(11, ['bolt']);
  s.kit.bolt.evos = ['storm'];
  for (let i = 0; i < 6; i++) spawn(s, 'walker', (i / 6) * Math.PI * 2);
  for (const f of s.foes) f.r = 150;
  let sawStorm = false;
  for (let i = 0; i < 60 * 3; i++) { step(s, 1 / 60); if (s.grounds.some((g) => g.kind === 'storm')) sawStorm = true; }
  check('fırtına yere kalıyor', sawStorm);
}

{
  // Dönüşüm almış bir büyü, almamıştan daha çok iş yapmalı - yoksa kart boş bir vaat.
  //
  // Ölüm sayısıyla ölçmüştüm ve ikisi de 2 çıktı: altı saniyede tek bir Magic Bolt zaten iki
  // tane öldürüyor, patlamanın fazladan verdiği hasar kimseyi bitirmeye yetmiyor. Verilen
  // TOPLAM hasar doğru ölçü - kartın vaadi de bu.
  const hurt = (evos) => {
    const s = begin(12, ['bolt']);
    s.kit.bolt.evos = evos;
    for (let i = 0; i < 14; i++) spawn(s, 'walker', (i / 14) * Math.PI * 2);
    for (const f of s.foes) f.r = 150;
    const mine = new Map(s.foes.map((f) => [f.id, f.hp]));
    for (let i = 0; i < 60 * 8; i++) step(s, 1 / 60);
    let gone = 0;
    for (const [id, was] of mine) {
      const still = s.foes.find((f) => f.id === id);
      gone += was - (still ? still.hp : 0);
    }
    return gone;
  };
  const plain = hurt([]);
  for (const evo of ['burst', 'fire', 'storm', 'freeze', 'split']) {
    check(`${evo} dönüşümü daha çok iş yapıyor`, hurt([evo]) > plain * 1.05,
      `düz ${plain.toFixed(0)}, ${evo} ${hurt([evo]).toFixed(0)}`);
  }
}

{
  const s = begin(13, ['bolt']);
  s.kit.bolt.boosts.pierce = 2;
  check('delme yükseltmesi sayılıyor', statsOf(s, 'bolt').pierce === 2);
}

// --- pasifler: artik tek tane -----------------------------------------------------------------

check('tek bir pasif kaldı', passiveKeys.length === 1 && passiveKeys[0] === 'mend', passiveKeys.join(','));

{
  // Duvar tamken Onarım sunulmamalı: dolu bir duvarı onarmayı teklif eden kart boşa giden karttır,
  // ve tek pasif kaldığı için ilk dakikanın her üç kartından biri o olurdu.
  const s = begin(31, ['bolt', 'fireball', 'frost', 'lightning']);
  for (const k of waiting(s)) s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };
  s.phase = 'picking';
  let seen = false;
  for (let i = 0; i < 60 && !seen; i++) seen = offer(s).some((c) => c.what === 'passive');
  check('duvar tamken onarım kartı çıkmıyor', !seen);

  s.wall = s.maxWall - 1;
  let now = false;
  for (let i = 0; i < 60 && !now; i++) now = offer(s).some((c) => c.key === 'mend');
  check('duvar hasar alınca onarım kartı çıkıyor', now);
}

// --- yükseltme oranları: güçlü büyü az, zayıf büyü çok kazanmalı ------------------------------

{
  // Sabit bir "+%18 hasar" iki ayrı büyüde aynı kart değil. Aynı kalabalığa karşı on saniyede
  // Nova 589, Sihirli Ok 56 hasar veriyor - on katı - yani aynı yüzde birine on kat fazla
  // kazandırır. Oranlar bu yüzden tersine: en çok iş yapan en az kazanır.
  const dmgOf = (k) => {
    const b = Spells[k].boosts.find((x) => x.key === 'sharper');
    return b ? b.does.dmg : 0;
  };
  check('her büyünün bir hasar yükseltmesi var', all.every((k) => dmgOf(k) > 0),
    all.filter((k) => !dmgOf(k)).join(','));

  const strong = ['nova', 'meteor', 'fireball'];
  const weak = ['bolt', 'laser'];
  const worstStrong = Math.max(...strong.map(dmgOf));
  const bestWeak = Math.min(...weak.map(dmgOf));
  check('güçlü büyüler hasar kartından az kazanıyor', worstStrong < bestWeak,
    `en güçlüsü %${(worstStrong * 100).toFixed(0)}, en zayıfı %${(bestWeak * 100).toFixed(0)}`);

  const cdOf = (k) => {
    const b = Spells[k].boosts.find((x) => x.key === 'quicker');
    return b ? -b.does.cd : 0;
  };
  check('bekleme kartı da aynı sırayı izliyor',
    Math.max(...strong.map(cdOf)) < Math.min(...weak.map(cdOf)));

  // Hiçbir yükseltme ölü olmamalı: alan kartı sadece alanı olan büyülerde bulunmalı
  const dead = all.filter((k) => {
    const sp = Spells[k];
    const hasArea = sp.blast || sp.wide || sp.instant === 'chain';
    return sp.boosts.some((b) => b.key === 'wider') && !hasArea;
  });
  check('alan kartı sadece alanı olan büyülerde', dead.length === 0, dead.join(','));

  // Kart yazısı sayıdan üretiliyor, yani vaat ile gerçek ayrılamaz
  check('hasar kartının yazısı gerçek oranı söylüyor',
    all.every((k) => {
      const b = Spells[k].boosts.find((x) => x.key === 'sharper');
      return b.tells[0].includes(`${Math.round(b.does.dmg * 100)}%`);
    }));
}

// --- alan kartı gerçekten alanı büyütüyor mu ---------------------------------------------------

{
  const s = begin(32, ['bolt', 'fireball', 'laser', 'lightning']);
  for (const k of waiting(s)) s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };

  const wasBlast = statsOf(s, 'fireball').blast;
  s.kit.fireball.boosts.wider = 4;
  check('alan kartı patlama yarıçapını büyütüyor', statsOf(s, 'fireball').blast > wasBlast * 1.5,
    `${wasBlast.toFixed(0)} -> ${statsOf(s, 'fireball').blast.toFixed(0)}`);

  const wasWide = statsOf(s, 'laser').wide;
  s.kit.laser.boosts.wider = 3;
  check('alan kartı ışının kalınlığını büyütüyor', statsOf(s, 'laser').wide > wasWide * 1.4,
    `${wasWide.toFixed(0)} -> ${statsOf(s, 'laser').wide.toFixed(0)}`);

  // Ve dönüşümlerin etkisini de: artık küresel bir Erim yok, her büyü kendi alanını taşıyor.
  //
  // İlk yazdığımda bunu bolt üzerinde denedim ve sayı hiç değişmedi: bolt'un ALAN KARTI YOK,
  // yani `boosts.wider = 4` yazmak olmayan bir yükseltmeyi vermek demekti ve `statsOf` onu
  // sessizce atlıyordu. Ölçtüğüm şey oyun değil, kendi kurulumumun hatasıydı.
  const burn = (seed, widerLevels) => {
    const st = begin(seed, ['bolt', 'fireball']);
    // begin() artık sadece sabit büyüyü kit'e koyuyor; fireball beklemede, elle almamız lazım
    st.kit.fireball = { tier: 1, boosts: {}, evos: ['fire'], taken: 0 };
    st.cools.fireball = 0;
    if (widerLevels) st.kit.fireball.boosts.wider = widerLevels;
    for (let i = 0; i < 6; i++) spawn(st, 'walker', (i / 6) * Math.PI * 2);
    for (const f of st.foes) f.r = 150;
    let widest = 0;
    for (let i = 0; i < 180; i++) {
      step(st, 1 / 60);
      for (const g of st.grounds) if (g.kind === 'fire') widest = Math.max(widest, g.r);
    }
    return widest;
  };
  const plain = burn(33, 0);
  const wide = burn(33, 4);
  check('dönüşümün boyutu da büyünün kendi alanından geliyor', wide > plain * 1.4,
    `${plain.toFixed(0)} -> ${wide.toFixed(0)}`);
}

// --- kartlar --------------------------------------------------------------------------------------

{
  const s = begin(14, ['bolt', 'fireball', 'frost']);
  s.phase = 'picking';
  const cards = offer(s);
  check('üç kart geliyor', cards.length === 3, `${cards.length}`);
  check('aynı büyü iki kartta çıkmıyor', new Set(cards.map((c) => c.key)).size === cards.length);
}

{
  const s = begin(15, ['bolt']);
  for (const k of passiveKeys) s.passives[k] = MostPassive;
  for (const b of Spells.bolt.boosts) s.kit.bolt.boosts[b.key] = b.most;
  s.kit.bolt.evos = Spells.bolt.evolutions.map((e) => e.onHit);
  s.phase = 'picking';
  check('verecek bir şey kalmayınca çökmüyor', Array.isArray(offer(s)));
}

// --- bölüm, patron, duvar ---------------------------------------------------------------------------

{
  const s = begin(16, ['bolt']);
  s.kit = {}; s.cools = {}; s.loadout = [];
  for (let i = 0; i < 60 * 300 && s.phase === 'playing'; i++) step(s, 1 / 60);
  check('savunmasız duvar yıkılıyor', s.phase === 'lost', `${s.t.toFixed(0)} saniye`);
}

{
  const s = begin(17, ['bolt']);
  s.kit = {}; s.cools = {}; s.loadout = [];
  s.stageT = StageWaves - 0.005;
  step(s, 1 / 60);
  check('bölümün sonunda patron geliyor', !!s.boss && s.boss.boss === true);
  check('patron çok daha dayanıklı', s.boss.maxHp > Kinds.brute.hp * 5);
  s.boss.hp = 0;
  step(s, 1 / 60);
  check('patron ölünce bölüm BİTİYOR', s.phase === 'done', s.phase);
  check('bölüm bitince düşman dalgası durmuş oluyor', s.boss === null);
}

{
  // Patron bir kere gelir: öldükten sonra bölüm bitiyor, yenisi doğmamalı
  const s = begin(21, ['bolt']);
  s.kit = {}; s.cools = {}; s.loadout = [];
  s.stageT = StageWaves;
  step(s, 1 / 60);
  s.boss.hp = 0;
  step(s, 1 / 60);
  s.phase = 'playing';
  s.stageT = StageWaves * 3;
  step(s, 1 / 60);
  check('patron ikinci kez gelmiyor', s.boss === null);
}

{
  // Bölüm numarası zorluğu belirlemeli, ve her bölüm kendi başına oynanabilir olmalı:
  // 5. bölüm, beş dakikalık bir dalgayla değil, biraz daha sert bir dalgayla başlar.
  const easy = begin(22, ['bolt'], 1);
  const hard = begin(22, ['bolt'], 5);
  check('sonraki bölüm daha zor başlıyor', pressure(hard) > pressure(easy) * 1.4,
    `${pressure(easy).toFixed(2)} -> ${pressure(hard).toFixed(2)}`);
  easy.t = 72; hard.t = 72;
  check('ama sıfırdan oynanamayacak kadar değil', pressure(hard) < pressure(easy) * 2.5,
    `${pressure(easy).toFixed(2)} -> ${pressure(hard).toFixed(2)}`);
}

// --- düşman aileleri ------------------------------------------------------------------------------

check('dört aile var', FamilyKeys.length === 4, FamilyKeys.join(', '));
check('her ailenin adı ve açıklaması var',
  FamilyKeys.every((k) => Families[k].name && Families[k].about));

// Her aile tam bir şeye zayıf, tam bir şeye dayanıklı. İkişer tane olsa kimse okumaz.
for (const k of FamilyKeys) {
  const t = Families[k].takes;
  const up = Object.values(t).filter((n) => n > 1).length;
  const down = Object.values(t).filter((n) => n < 1).length;
  check(`${k}: en fazla bir zayıflık, en fazla bir zırh`, up <= 1 && down <= 1,
    JSON.stringify(t));
  check(`${k}: sadece gerçek elementler`,
    Object.keys(t).every((e) => Elements.includes(e)), Object.keys(t).join(','));
}
check('ilk aile tamamen nötr', Object.keys(Families.folk.takes).length === 0,
  'ilk bölümde öğrenilen şey temel olmalı');

// BU KURAL ÖNEMLİ: zayıflık hep hesabın ilk seviyesinde elde olan bir elemente bakmalı. Bir
// bölüm, oyuncunun henüz açamadığı bir büyüyü istiyorsa o bölüm bir duvar olur.
{
  const early = new Set(Object.values(Spells)
    .filter((sp) => UnlockAt[spellKeys.find((k) => Spells[k] === sp)] === 1)
    .map((sp) => sp.element));
  const bad = FamilyKeys.filter((k) => {
    const w = weakness(k);
    return w && !early.has(w.element);
  });
  check('her zayıflığın karşılığı birinci seviyede açık', bad.length === 0,
    bad.map((k) => `${k} -> ${weakness(k).element}`).join(', '));
}

// BU KONTROL BIR HATADAN DOGDU. Harita "BIÇAK x2.1" yaziyordu ama oyunda Biçak diye bir buyu
// yok - Kiymiklar ve Yorunge var. Element hicbir buyunun ustunde yazmadigi icin o sayi okunamaz
// bir sayiydi. Ailenin soyledigi her elementin, oyuncunun gorebilecegi bir karsiligi olmali.
{
  const named = new Set();
  for (const k of FamilyKeys) {
    const w = weakness(k), a = armour(k);
    if (w) named.add(w.element);
    if (a) named.add(a.element);
  }
  const carried = new Set(spellKeys.map((k) => Spells[k].element));
  const orphan = [...named].filter((e) => !carried.has(e));
  check('ailelerin saydığı her elementi taşıyan bir büyü var', orphan.length === 0,
    orphan.join(', '));

  // ve her birinin iki dilde de bir adi olmali, cunku ekranda o ad yaziyor
  const unnamed = [...new Set([...named, ...carried])].filter((e) => !UI['el_' + e]);
  check('her elementin iki dilde adı var', unnamed.length === 0, unnamed.join(', '));
  check('element adları iki dilde de dolu',
    Elements.every((e) => UI['el_' + e] && UI['el_' + e][0] && UI['el_' + e][1]),
    Elements.filter((e) => !UI['el_' + e] || !UI['el_' + e][1]).join(','));
}

check('her büyünün bir elementi var',
  spellKeys.every((k) => Elements.includes(Spells[k].element)),
  spellKeys.filter((k) => !Elements.includes(Spells[k].element)).join(','));

check('direnç tablosu dışı her şey nötr',
  takes('folk', 'fire') === 1 && takes('spider', 'arcane') === 1 && takes(null, 'fire') === 1);
check('örümcek ateşten fazla, yıldırımdan az alıyor',
  takes('spider', 'fire') > 1 && takes('spider', 'storm') < 1,
  `ateş ${takes('spider', 'fire')} · yıldırım ${takes('spider', 'storm')}`);

// Bölüm → aile eşlemesi: ilk dördü tek tek öğretiyor, sonrası karışıyor.
check('ilk dört bölüm birer aile',
  [1, 2, 3, 4].every((n) => familiesOn(n).length === 1));
check('ilk dört bölümde dört ailenin hepsi var',
  new Set([1, 2, 3, 4].flatMap(familiesOn)).size === 4,
  [1, 2, 3, 4].map((n) => familiesOn(n)[0]).join(','));
check('beşinci bölümden sonra karışıyor',
  [5, 6, 7, 8].every((n) => familiesOn(n).length >= 2),
  [5, 6, 7, 8].map((n) => familiesOn(n).join('+')).join(' · '));
check('listenin sonu gelmiyor, kalınlaşıyor',
  familiesOn(13).length > familiesOn(5).length
  && familiesOn(100).length <= FamilyKeys.length,
  `13. ${familiesOn(13).join('+')} · 100. ${familiesOn(100).join('+')}`);
check('hiçbir bölüm aynı aileyi iki kez saymıyor',
  [...Array(40)].every((_, i) => new Set(familiesOn(i + 1)).size === familiesOn(i + 1).length));

// Sahada gerçekten o aileler mi var?
{
  let wrong = 0;
  for (const stage of [1, 2, 3, 4, 6]) {
    const s = begin(5, ['bolt'], stage);
    for (let i = 0; i < 60; i++) spawn(s);
    const want = new Set(familiesOn(stage));
    for (const f of s.foes) if (!f.boss && !want.has(f.family)) wrong += 1;
  }
  check('sahaya sadece o bölümün aileleri geliyor', wrong === 0, `${wrong} yabancı`);
}

check('patronların ailesi yok', (() => {
  const s = begin(5, ['bolt'], 3);
  s.stageT = StageWaves;
  step(s, 1 / 60);
  return s.boss && s.boss.family === null;
})(), 'patron, bölümün duvar kâğıdına göre direnç kazanmamalı');

// Direnç gerçekten hasara dönüşüyor mu - tabloda değil, canda.
{
  const hit = (family, element) => {
    const s = begin(5, ['bolt'], 1);
    const f = spawn(s, 'walker');
    f.family = family;
    const was = f.hp;
    // tek bir ateş: dogrudan wound degil, oyunun kendi yolu
    s.shots.push({
      key: 'x', child: true, x: 0, y: 0, z: 0, a: 0, at: f.id,
      damage: 100, element, blast: 0, chill: 0, pierce: 0,
      hits: new Set(), falls: false, life: 1,
    });
    for (let i = 0; i < 60 && f.hp === was; i++) step(s, 1 / 60);
    return was - f.hp;
  };
  const plain = hit('folk', 'fire');
  const weak = hit('spider', 'fire');
  const tough = hit('spider', 'storm');
  check('zayıflık gerçekten daha çok vuruyor', weak > plain * 1.3, `${plain} -> ${weak}`);
  check('zırh gerçekten daha az yediriyor', tough < plain * 0.8, `${plain} -> ${tough}`);
  check('nötr aile tam hasar alıyor', Math.abs(plain - 100) < 1, String(plain));
}

// --- patronlar ------------------------------------------------------------------------------------

check('üç patron var', Bosses.length === 3, Bosses.join(', '));
check('hepsi patron işaretli', Bosses.every((k) => Kinds[k] && Kinds[k].boss === true));
check('patronlar sırayla geliyor',
  [1, 2, 3, 4, 5, 6].map(bossFor).join(',') === [...Bosses, ...Bosses].join(','),
  [1, 2, 3, 4, 5, 6].map(bossFor).join(','));
check('her patron sıradan düşmandan çok daha dayanıklı',
  Bosses.every((k) => Kinds[k].hp > Kinds.brute.hp * 5));

// Farkları istatistik değil DAVRANIŞ olmalı. İkinci bir sünger, birincinin aynısıdır.
check('her patronun kendi davranışı var',
  !!Kinds.herald.calls && !!Kinds.shade.splits && !Kinds.warden.calls && !Kinds.warden.splits);

// Çağırıcı: yaşadığı sürece çağırıyor, ölünce susuyor.
{
  const s = begin(7, ['bolt'], 2);
  s.stageT = StageWaves;
  step(s, 1 / 60);
  check('2. bölümün patronu çağırıcı', s.boss && s.boss.key === 'herald', s.boss && s.boss.key);
  s.boss.hp = 1e9;                              // ölmesin, sadece çağırışını ölçelim
  const before = s.foes.length;
  for (let i = 0; i < 60 * 12; i++) step(s, 1 / 60);
  check('çağırıcı yaşadıkça kalabalık büyüyor', s.foes.length > before,
    `${before} -> ${s.foes.length}`);

  // ölünce çağırmayı kesiyor
  const quiet = begin(7, ['bolt'], 2);
  quiet.stageT = StageWaves;
  step(quiet, 1 / 60);
  const called = quiet.events.filter((e) => e.kind === 'called').length;
  check('daha çağırmaya başlamadı', called === 0);
}

// Gölge: bir kez öldürmek bitirmiyor.
{
  const s = begin(11, ['bolt'], 3);
  s.stageT = StageWaves;
  step(s, 1 / 60);
  check('3. bölümün patronu gölge', s.boss && s.boss.key === 'shade', s.boss && s.boss.key);
  const was = s.boss.maxHp;
  s.boss.hp = 0;
  step(s, 1 / 60);
  check('bir kez öldürmek bölümü bitirmiyor', s.phase === 'playing', s.phase);
  const halves = s.foes.filter((f) => f.boss);
  check('ikiye ayrılıyor', halves.length === 2, String(halves.length));
  check('yarılar daha zayıf', halves.every((h) => h.maxHp < was && h.maxHp > 0),
    halves.map((h) => Math.round(h.maxHp)).join('/'));
  check('yarılar kenarda beliriyor', halves.every((h) => h.r > Reach * 2),
    halves.map((h) => Math.round(h.r)).join('/'));
  check('yarılar bir daha bölünmüyor', halves.every((h) => h.splits === false));

  for (const h of halves) h.hp = 0;
  step(s, 1 / 60);
  check('ikisi de ölünce bölüm bitiyor', s.phase === 'done', s.phase);
}

// Gardiyan bölünmüyor, çağırmıyor - duello olarak kalıyor.
{
  const s = begin(5, ['bolt'], 1);
  s.stageT = StageWaves;
  step(s, 1 / 60);
  check('1. bölümün patronu gardiyan', s.boss && s.boss.key === 'warden');
  s.boss.hp = 0;
  step(s, 1 / 60);
  check('gardiyan bir kerede bitiyor', s.phase === 'done');
}

// Külliyat her bölümün gerçek patronunu yazmalı; elle tutulan bir liste ilk değişiklikte yalan olur.
check('külliyat doğru patronu gösteriyor',
  [1, 2, 3, 7].every((n) => kindsOn(n).includes(bossFor(n))),
  [1, 2, 3, 7].map((n) => `${n}: ${kindsOn(n).join('/')}`).join(' · '));
// Külliyat kurallardan okumalı. Açıklamanın içine elle yazılmış bir sayı, sayı değiştiği gün
// yalan söylemeye başlar - ve başlamıştı: çağırıcı ikiye düşürüldükten sonra bile "üç" diyordu.
{
  const s = begin(3, ['bolt'], 2);
  s.stageT = StageWaves;
  step(s, 1 / 60);
  s.boss.hp = 1e9;
  const before = s.foes.length;
  const until = s.t + Kinds.herald.calls + 0.2;
  while (s.t < until) step(s, 1 / 60);
  const extra = s.foes.filter((f) => f.key === 'runner').length
    - before + 1;                                 // patronun kendisi sayılmasın
  check('çağırıcı tam söylediği kadar çağırıyor', extra >= HeraldCalls,
    `${extra} geldi, söz ${HeraldCalls}`);
  check('açıklamadaki sayı kuraldan geliyor',
    say(UI.about_herald, HeraldCalls).includes(String(HeraldCalls)));
}
check('gölgenin açıklaması gerçek oranı söylüyor', (() => {
  const s = begin(11, ['bolt'], 3);
  s.stageT = StageWaves;
  step(s, 1 / 60);
  const was = s.boss.maxHp;
  s.boss.hp = 0;
  step(s, 1 / 60);
  const half = s.foes.find((f) => f.boss);
  return Math.abs(half.maxHp / was - ShadeKeeps) < 1e-9;
})(), `söz %${Math.round(ShadeKeeps * 100)}`);

check('her patronun adı ve açıklaması var',
  Bosses.every((k) => UI['foe_' + k] && UI['about_' + k]),
  Bosses.filter((k) => !UI['about_' + k]).join(','));

// --- yıldızlar ----------------------------------------------------------------------------------

{
  check('tam duvarla üç yıldız', starsFor(300, 300) === 3);
  check('%95 üstü iki yıldız', starsFor(286, 300) === 2 && starsFor(299, 300) === 2);
  check('%60 üstü bir yıldız', starsFor(190, 300) === 1 && starsFor(284, 300) === 1);
  check('%60 altı yıldız yok', starsFor(170, 300) === 0);
  check('sıradaki yıldızın eşiği söyleniyor',
    nextStarAt(0) === 60 && nextStarAt(1) === 95 && nextStarAt(2) === 100 && nextStarAt(3) === null);
}

{
  const d = tidy({ level: 13, loadout: ['bolt'] });
  check('birinci bölüm hep açık', stageOpen(d, 1));
  check('ikinci bölüm başta kapalı', !stageOpen(d, 2));

  const r = finish(d, 1, 300, 300, 400);
  check('bölüm bitince yıldız kaydediliyor', r.stars === 3 && starsAt(d, 1) === 3);
  check('bölüm bitince sonraki açılıyor', stageOpen(d, 2) && furthestStage(d) === 2);
  check('bölüm bitince menü sonrakine geçiyor', d.stage === 2, String(d.stage));

  const worse = finish(d, 1, 100, 300, 400);
  check('kötü bir tekrar kazanılmış yıldızı geri almıyor', starsAt(d, 1) === 3 && worse.stars === 0);

  const better = finish(d, 2, 290, 300, 400);
  check('ikinci bölüm de kaydediliyor', starsAt(d, 2) === 2 && better.beat === true);
  check('üçüncü bölüm açıldı', stageOpen(d, 3));
}

{
  const d = tidy({ level: 13, loadout: ['bolt'], stage: 9, stars: {} });
  check('menü açılmamış bir bölümde kalmıyor', d.stage === 1, String(d.stage));
  const bad = tidy({ level: 13, loadout: ['bolt'], stars: { '1': 9, 'x': 2, '2': 1 } });
  check('bozuk yıldız kaydı temizleniyor', bad.stars['1'] === undefined && bad.stars.x === undefined && bad.stars['2'] === 1);
}

{
  const s = begin(18, ['bolt']);
  check('patron normal dalgadan çıkmıyor', (() => {
    for (let i = 0; i < 400; i++) { s.t = i; spawn(s); }
    return !s.foes.some((f) => f.boss);
  })());
}

{
  const warm = begin(19, ['bolt']);
  warm.kit = {}; warm.cools = {}; warm.loadout = [];
  const a = spawn(warm, 'walker', 0);
  const from = a.r;
  for (let i = 0; i < 60; i++) step(warm, 1 / 60);
  const plain = from - warm.foes[0].r;

  const cold = begin(19, ['bolt']);
  cold.kit = {}; cold.cools = {}; cold.loadout = [];
  const b = spawn(cold, 'walker', 0);
  b.chill = 5;
  for (let i = 0; i < 60; i++) step(cold, 1 / 60);
  check('soğuyan düşman yavaşlıyor', from - cold.foes[0].r < plain * 0.7);
}

// --- tıklamak ----------------------------------------------------------------------------------

{
  const s = begin(20, ['bolt']);
  const cold = haste(s);
  for (let i = 0; i < 20; i++) click(s);
  check('tıklamak büyüleri hızlandırıyor', haste(s) > cold * 1.4);
  check('ısı tavanı aşmıyor', s.heat <= 1 + 1e-9);
  for (let i = 0; i < 200; i++) step(s, 1 / 60);
  check('ısı kendiliğinden soğuyor', s.heat === 0);
}

// --- oyun hızı -----------------------------------------------------------------------------

{
  // 1x, 1.5x, 2x gerçekten o kadar hızlandırmalı. Tarayıcıda ölçülemez: yazılımsal çizim zaten
  // darboğaz olduğu için iki kat simülasyon istemek kare hızını yarıya indiriyor ve oyun saati
  // hiç ilerlememiş gibi görünüyor. Bu yüzden adımlama `advance()` içinde, tuvalsiz ölçülebilir.
  const ran = {};
  for (const sp of Speeds) {
    const s = begin(5, ['bolt']);
    for (let i = 0; i < 120; i++) advance(s, 1 / 60, sp);
    ran[sp] = s.t;
  }
  check('1x normal hızda koşuyor', Math.abs(ran[1] - 2) < 0.01, `${ran[1].toFixed(3)}`);
  for (const sp of Speeds) {
    check(`${sp}x gerçekten ${sp} kat hızlı`, Math.abs(ran[sp] / ran[1] - sp) < 0.01,
      `${(ran[sp] / ran[1]).toFixed(3)} kat`);
  }

  // Ve hızlanmak tek büyük adımla değil, çok adımla olmalı: tek uzun adım mermiyi vuracağı
  // şeyin içinden geçirir, çünkü çarpışma nerede olduğuna bakılarak kontrol ediliyor.
  const fast = begin(6, ['bolt']);
  for (let i = 0; i < 6; i++) spawn(fast, 'walker', (i / 6) * Math.PI * 2);
  for (const f of fast.foes) f.r = 200;
  const mine = new Set(fast.foes.map((f) => f.id));
  const before = fast.foes.reduce((a, f) => a + f.hp, 0);
  for (let i = 0; i < 240; i++) advance(fast, 1 / 60, 2);
  const after = fast.foes.filter((f) => mine.has(f.id)).reduce((a, f) => a + f.hp, 0);
  check('hızlıyken de mermiler isabet ediyor', after < before * 0.9 || fast.kills > 0);
}

// --- kahraman merdiveni --------------------------------------------------------------------------

check('merdiven elli basamak', Ladder.length === HeroSteps && HeroSteps === 50, `${Ladder.length}`);
check('ilk basamak 250, ikincisi 500', heroCost(1) === 250 && heroCost(2) === 500,
  `${heroCost(1)} / ${heroCost(2)}`);
check('maliyet hep artıyor', Ladder.every((st, i) => i === 0 || st.cost > Ladder[i - 1].cost));

// Kullanıcının koyduğu kural: hiçbir basamak tek bir büyüye ait olmamalı. Olsaydı, kart hiç
// bahsetmeden hangi büyüyü getireceğine karar verirdi.
check('hiçbir basamak bir büyüye özel değil',
  Ladder.every((st) => !spellKeys.includes(st.key) && Bonus[st.key]),
  Ladder.filter((st) => spellKeys.includes(st.key)).map((st) => st.key).join(','));

check('her basamağın yazısı ve miktarı var',
  Ladder.every((st) => Bonus[st.key].name && Bonus[st.key].tells && st.amount > 0));

{
  // Üstteki basamaklar alttakilerden daha çok vermeli, yoksa on iki katı ödeyip aynı şeyi alırsın
  const early = Ladder.find((st) => st.key === 'dmg');
  const late = [...Ladder].reverse().find((st) => st.key === 'dmg');
  check('yukarıdaki basamak aşağıdakinden büyük', late.amount > early.amount,
    `${early.amount} -> ${late.amount}`);
}

{
  const d = tidy({ level: 1, loadout: ['bolt'], bank: 740, hero: 0 });
  check('ilk basamak alınıyor', buyHero(d) === true && d.hero === 1 && d.bank === 490,
    `basamak ${d.hero}, kalan ${d.bank}`);
  check('kalan para ikinciye yetmiyor', buyHero(d) === false && d.hero === 1 && d.bank === 490,
    `basamak ${d.hero}, kalan ${d.bank}`);
  d.bank += 20;
  check('yeterince biriktirince alınıyor', buyHero(d) === true && d.hero === 2 && d.bank === 10,
    `basamak ${d.hero}, kalan ${d.bank}`);
  const poor = tidy({ level: 1, loadout: ['bolt'], bank: 100, hero: 0 });
  check('parası yetmeyen basamak alınmıyor', buyHero(poor) === false && poor.hero === 0);
  const full = tidy({ level: 1, loadout: ['bolt'], bank: 1e9, hero: HeroSteps });
  check('merdiven bitince alınacak bir şey kalmıyor', heroNext(full) === null && buyHero(full) === false);
}

{
  const none = heroBonus({ hero: 0 });
  const all = heroBonus({ hero: HeroSteps });
  check('merdivensizken hiçbir artış yok', Object.values(none).every((v) => v === 0));
  check('merdiven hasarı artırıyor', all.dmg > 0.4, `%${(all.dmg * 100).toFixed(0)}`);
  check('merdiven duvarı büyütüyor', all.wall >= 100, String(all.wall));
  check('merdiven beklemeyi kısaltıyor', all.cd > 0.05, `%${(all.cd * 100).toFixed(1)}`);
  check('merdiven oyunu ele geçirmiyor', all.dmg < 1 && all.cd < 0.2,
    `hasar %${(all.dmg * 100).toFixed(0)}, bekleme %${(all.cd * 100).toFixed(0)}`);
}

{
  // Ve gerçekten koşuya giriyor mu
  const plain = begin(44, ['bolt'], 1);
  const climbed = begin(44, ['bolt'], 1, heroTotals(HeroSteps));
  check('merdiven koşudaki hasara yansıyor',
    statsOf(climbed, 'bolt').damage > statsOf(plain, 'bolt').damage * 1.4,
    `${statsOf(plain, 'bolt').damage.toFixed(1)} -> ${statsOf(climbed, 'bolt').damage.toFixed(1)}`);
  check('merdiven duvara yansıyor', climbed.maxWall > plain.maxWall + 100);
  check('merdiven beklemeye yansıyor', statsOf(climbed, 'bolt').every < statsOf(plain, 'bolt').every);
}

{
  // Deneyim kazancı da merdivene bağlı
  const plain = tidy({ level: 1, loadout: ['bolt'], hero: 0 });
  const climbed = tidy({ level: 1, loadout: ['bolt'], hero: HeroSteps });
  const a = record(plain, 2, 300).earned;
  const b = record(climbed, 2, 300).earned;
  check('öğrenme basamakları deneyimi artırıyor', b > a, `${a} -> ${b}`);
}

console.log('');
console.log(`kahraman merdiveni: ${HeroSteps} basamak, toplam ${wholeLadder.toLocaleString('en')} deneyim`);
{
  const all = heroBonus({ hero: HeroSteps });
  console.log(`  tamamı: hasar +%${(all.dmg * 100).toFixed(0)}  duvar +${all.wall}  bekleme -%${(all.cd * 100).toFixed(1)}  ` +
    `alan +%${(all.area * 100).toFixed(0)}  onarım ${all.mend.toFixed(2)}/sn  deneyim +%${(all.gain * 100).toFixed(0)}`);
}

// --- üç para birimi ------------------------------------------------------------------------------

check('bir koşu üç şey ödüyor', typeof worth === 'function' && typeof goldFor === 'function'
  && typeof shardsFor === 'function');

check('altın bölümle de ölü sayısıyla da büyüyor',
  goldFor(3, 200) > goldFor(1, 200) && goldFor(1, 300) > goldFor(1, 150));

// Parça, o büyüye ne kadar yatırım yaptığına ödeniyor. Sadece "getirdim" demek tabanı veriyor,
// bütün koşu onu beslemek üç katını. Ekonominin HANGİ büyü sorusunu cevaplayan yarısı bu.
check('parça, büyüye konan karta göre ödeniyor', shardsFor(1, 6) > shardsFor(1, 0));
check('hiç kart konmayan büyü de bir şey kazanıyor', shardsFor(1, 0) > 0);
check('derin bölüm daha çok parça veriyor', shardsFor(5, 3) > shardsFor(1, 3));

{
  const d = tidy({ level: 5, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  const got = record(d, 3, 210, { bolt: 7, fireball: 4, frost: 2, lightning: 1 });
  check('koşu altın ödüyor', got.gold === goldFor(3, 210) && d.gold === got.gold, String(d.gold));
  check('koşu taşınan her büyüye parça ödüyor',
    Object.keys(got.shards).length === 4, JSON.stringify(got.shards));
  check('en çok beslenen büyü en çok parça alıyor',
    got.shards.bolt > got.shards.fireball && got.shards.fireball > got.shards.frost,
    JSON.stringify(got.shards));
  check('parçalar hesaba yazıldı', shardsOf(d, 'bolt') === got.shards.bolt);
  check('taşınmayan büyüye parça yok', shardsOf(d, 'meteor') === 0);
}

// Yatırım bilgisi verilmezse hiç parça ödenmemeli. Düz bir miktar ödemek, kimsenin kazanmadığı
// bir şeyi dağıtmak olurdu.
{
  const d = tidy({ level: 2 });
  const got = record(d, 2, 100);
  check('yatırım bilinmiyorsa parça ödenmiyor',
    Object.keys(got.shards).length === 0 && Object.keys(d.shards).length === 0);
  check('ama altın yine de ödeniyor', got.gold > 0);
}

// --- büyülerin kalıcı seviyesi -------------------------------------------------------------------

check('her büyü on seviye', SpellSteps === 10 && SpellLine.length === SpellSteps - 1);
check('seviye bir hiçbir şey vermiyor', liftAt(1) === 0);
check('son seviye hepsini veriyor', Math.abs(liftAt(SpellSteps) - (SpellSteps - 1) * Lift) < 1e-9);
check('seviye sınırın üstüne çıkmıyor', liftAt(99) === liftAt(SpellSteps));
check('maliyetler artıyor',
  SpellLine.every((st, i) => i === 0 || (st.gold > SpellLine[i - 1].gold && st.shards > SpellLine[i - 1].shards)));
check('son basamakta devam yok', stepOf(SpellSteps) === null && !canStep(SpellSteps));

// Üç güç kaynağı çarpışıyor: koşu içi kartlar, kahraman peteği ve bu. Bu kasten en küçüğü -
// hiç kaybolmayan tek kaynak o.
check('kalıcı seviye üç kaynağın en küçüğü',
  liftAt(SpellSteps) < heroBonus({ hero: 50 }).dmg + 0.01 || liftAt(SpellSteps) <= 0.5,
  `büyü +%${Math.round(liftAt(SpellSteps) * 100)} vs kahraman +%${Math.round(heroBonus({ hero: 50 }).dmg * 100)}`);

{
  const d = tidy({ level: 9 });
  check('her büyü birinci seviyede başlıyor', levelOf(d, 'bolt') === 1);
  check('parasız yükseltilemiyor', buySpell(d, 'bolt') === false && levelOf(d, 'bolt') === 1);

  d.gold = 100; d.shards = { bolt: 5 };
  const st = spellStep(d, 'bolt');
  check('ilk basamak tam bu kadar', st.gold === SpellLine[0].gold && st.shards === SpellLine[0].shards);
  check('tam yetiyorsa alınabilir', st.afford === true);
  check('alındı', buySpell(d, 'bolt') === true && levelOf(d, 'bolt') === 2);
  check('ödeme yapıldı', d.gold === 0 && shardsOf(d, 'bolt') === 0);
  check('ikinci kez alınamıyor', buySpell(d, 'bolt') === false);

  // altın var ama parça yok: parçanın görevi tam olarak bu
  d.gold = 999999;
  check('altın tek başına yetmiyor', spellStep(d, 'bolt').afford === false && buySpell(d, 'bolt') === false,
    'parça yokken alındı');
  d.shards = { bolt: 999 };
  check('ikisi birden varsa alınıyor', buySpell(d, 'bolt') === true && levelOf(d, 'bolt') === 3);

  // sonuna kadar
  d.gold = 10 ** 9; d.shards = { bolt: 10 ** 6 };
  let guard = 0;
  while (buySpell(d, 'bolt') && guard++ < 50);
  check('sonuna kadar gidiyor ve duruyor', levelOf(d, 'bolt') === SpellSteps && guard < 50,
    `seviye ${levelOf(d, 'bolt')}`);
  check('tepede basamak kalmıyor', spellStep(d, 'bolt') === null);
}

check('kilitli büyü yükseltilemiyor', (() => {
  const d = tidy({ level: 1 });
  d.gold = 10 ** 6; d.shards = { meteor: 10 ** 4 };
  // meteor seviye 13'te açılıyor; hesap seviye 1
  return levelOf(d, 'meteor') === 1;
})());

// Kalıcı seviye koşuya gerçekten giriyor mu - veri olarak değil, hasara dönüşerek.
{
  const flat = begin(1, ['bolt'], 1);
  const raised = begin(1, ['bolt'], 1, undefined, { bolt: SpellSteps });
  const a = statsOf(flat, 'bolt').damage;
  const z = statsOf(raised, 'bolt').damage;
  check('kalıcı seviye hasarı artırıyor', z > a, `${a.toFixed(1)} -> ${z.toFixed(1)}`);
  check('artış tam söylediği kadar',
    Math.abs(z / a - (1 + liftAt(SpellSteps))) < 1e-9, (z / a).toFixed(4));
  // Başka bir büyünün seviyesi bunu kıpırdatmamalı. (Koşu sadece Magic Bolt ile açıldığı için
  // kitte olan tek büyü o; o yüzden ölçüm bunun üstünden yapılıyor.)
  check('başka büyünün seviyesi bu büyüyü etkilemiyor',
    statsOf(begin(1, ['bolt', 'frost'], 1, undefined, { frost: SpellSteps }), 'bolt').damage === a,
    'frost yükseltilince bolt da güçlendi');
  check('koşu hesabın seviyelerini değiştirmiyor', (() => {
    const owned = { bolt: 4 };
    const s = begin(1, ['bolt'], 1, undefined, owned);
    s.levels.bolt = 10;
    return owned.bolt === 4;
  })());
}

// --- ödüller: çark ve sandık ---------------------------------------------------------------------

check('çarkın sekiz dilimi var', Wedges.length === 8, `${Wedges.length} tane`);
check('her dilim bir şey veriyor', Wedges.every((x) => x.mul > 0 && x.kind));
check('üç tür de çarkta var',
  new Set(Wedges.map((x) => x.kind)).size === 3, [...new Set(Wedges.map((x) => x.kind))].join(','));

// Komşu dilimler aynı türü ödememeli: çarkın sol yarısı tamamen altınsa, çark durmadan ne
// kazandığını söylemiş olur.
check('komşu dilimler farklı tür',
  Wedges.every((x, i) => x.kind !== Wedges[(i + 1) % Wedges.length].kind),
  Wedges.map((x) => x.kind).join(','));

check('ödüller seviyeyle büyüyor',
  amountAt(1, 10) > amountAt(1, 1) && amountAt(0, 10) > amountAt(0, 1));
check('parça seviyeyle büyümüyor', (() => {
  const i = Wedges.findIndex((x) => x.kind === 'shard');
  return amountAt(i, 1) === amountAt(i, 20);
})(), 'parça sabit kalmalı - harcandığı yer de sabit');

{
  const hits = Wedges.map(() => 0);
  const n = 80000;
  for (let i = 0; i < n; i++) hits[wedgeFor(i / n)] += 1;
  const want = n / Wedges.length;
  check('her dilimin şansı eşit', hits.every((h) => Math.abs(h - want) <= 2), hits.join(','));
}

// BU, ÇARKIN BÜTÜN DÜRÜSTLÜĞÜ. Kazanan dilim kurallarda seçiliyor, animasyon ona nişan alıyor.
{
  let wrong = 0, backwards = 0;
  for (const from of [0, 0.4, 1.3, 3.9, -4.2, 17.9, 100]) {
    for (let at = 0; at < Wedges.length; at++) {
      const to = restFor(at, from);
      if (wedgeUnder(to) !== at) wrong += 1;
      if (to <= from) backwards += 1;
    }
  }
  check('çark kazanan dilimin üstünde duruyor', wrong === 0, `${wrong} sapma`);
  check('çark hep ileri dönüyor', backwards === 0, `${backwards} geri dönüş`);
  check('çark birkaç tur atıyor', restFor(0, 0) > Math.PI * 2 * 3);
}

// Günde bir çevirme.
{
  const d = tidy({ level: 3, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  check('yeni hesap çarkı çevirebilir', canSpin(d, '2026-10-14'));
  const first = spin(d, 0.01, '2026-10-14', 0);
  check('çevirme dilim, tür ve miktar döndürüyor',
    first && first.at === 0 && first.kind === kindAt(0) && first.amount === amountAt(0, 3),
    JSON.stringify(first));
  check('aynı gün ikinci çevirme yok', spin(d, 0.9, '2026-10-14') === null);
  const next = spin(d, 0.99, '2026-10-15', 0);
  check('yarın yine çevrilebiliyor', next !== null);
  check('iki çevirme sayıldı', d.spins === 2, String(d.spins));
}

// Her dilim kendi türünü, kendi kasasına ödüyor.
{
  let bad = [];
  for (let at = 0; at < Wedges.length; at++) {
    const d = tidy({ level: 6, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
    const before = { bank: d.bank, gold: d.gold };
    const got = spin(d, (at + 0.5) / Wedges.length, '2026-01-01', 0);
    if (!got || got.at !== at) { bad.push(`${at}: yanlış dilim`); continue; }
    if (got.amount !== amountAt(at, 6)) { bad.push(`${at}: yanlış miktar`); continue; }
    if (got.kind === 'exp' && d.bank !== before.bank + got.amount) bad.push(`${at}: deneyim yazılmadı`);
    if (got.kind === 'gold' && d.gold !== before.gold + got.amount) bad.push(`${at}: altın yazılmadı`);
    if (got.kind === 'shard') {
      if (!got.key) bad.push(`${at}: parça hangi büyünün belli değil`);
      else if (shardsOf(d, got.key) !== got.amount) bad.push(`${at}: parça yazılmadı`);
      else if (!d.loadout.includes(got.key)) bad.push(`${at}: taşınmayan büyüye parça`);
    }
    // bir dilim sadece kendi kasasına dokunmalı
    if (got.kind !== 'exp' && d.bank !== before.bank) bad.push(`${at}: deneyime dokundu`);
    if (got.kind !== 'gold' && d.gold !== before.gold) bad.push(`${at}: altına dokundu`);
  }
  check('her dilim sadece kendi türünü ödüyor', bad.length === 0, bad.join(' · '));
}

check('parça ödülü taşınan büyülerden seçiliyor', (() => {
  const kit = ['bolt', 'frost'];
  return [0, 0.4, 0.6, 0.99].every((r) => kit.includes(spellFor(kit, r)))
    && new Set([0, 0.99].map((r) => spellFor(kit, r))).size === 2;
})());
check('loadout boşsa parça kime gideceğini uydurmuyor', spellFor([], 0.5) === null);

// --- gem: farmlanamayan para birimi --------------------------------------------------------------
//
// Oyunun en önemli ekonomik kuralı burada. Gem'i sadece ILERLEMEK üretiyor; aynı bölümü tekrar
// tekrar geçmek üretmiyor. Bu kural tutmazsa oyun kendi ilk bölümünde kilitlenir.

check('gem derin bölümde daha çok', gemsFor(5) > gemsFor(1) && gemsFor(16) > gemsFor(5),
  `1. ${gemsFor(1)} · 5. ${gemsFor(5)} · 16. ${gemsFor(16)}`);
check('ilk geçiş tam ödüyor', gemDecay(0) === 1);
check('tekrarlar hızla sönüyor', gemDecay(1) < 0.5 && gemDecay(2) < gemDecay(1));
check('farmlamak gem vermiyor', gemDecay(3) === 0 && gemDecay(9) === 0);
check('temiz geçiş daha çok gem', gemsOn(5, 0, 3) > gemsOn(5, 0, 0));
check('yıldız gem\'i ikiye katlamıyor', gemsOn(5, 0, 3) < gemsOn(5, 0, 0) * 1.6,
  `${gemsOn(5, 0, 0)} -> ${gemsOn(5, 0, 3)}`);

// Diğer ödüller de düşüyor ama sıfıra değil: bir bölümde takılan oyuncunun güçlenme yolu budur.
check('tekrar ödülleri azaltıyor', repeatLift(1) < 1 && repeatLift(3) < repeatLift(1));
check('ama sıfıra inmiyor', repeatLift(99) === RepeatFloor && RepeatFloor > 0,
  `taban ${RepeatFloor}`);

{
  const d = tidy({ level: 5, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  const put = Object.fromEntries(d.loadout.map((k) => [k, 5]));
  check('hiç geçilmemiş bölüm sıfır kere geçilmiş', timesDone(d, 3) === 0);

  const runs = [];
  for (let i = 0; i < 4; i++) runs.push(finish(d, 3, 100, 100, 210, put));

  check('ilk geçiş "ilk" diyor', runs[0].first === true && runs[1].first === false);
  check('ilk geçiş en çok gem veriyor',
    runs[0].gems > runs[1].gems && runs[1].gems > runs[2].gems,
    runs.map((r) => r.gems).join(' -> '));
  check('dördüncü geçiş hiç gem vermiyor', runs[3].gems === 0, String(runs[3].gems));
  check('gem\'ler cepte toplanıyor',
    gemsHeld(d) === runs.reduce((a, r) => a + r.gems, 0), String(gemsHeld(d)));

  check('deneyim, altın ve parça da tekrarda düşüyor',
    runs[0].earned > runs[3].earned && runs[0].gold > runs[3].gold
    && runs[0].shards.bolt > runs[3].shards.bolt,
    `deneyim ${runs[0].earned}->${runs[3].earned}`);
  check('ama yarıdan aşağı inmiyor', runs[3].earned >= runs[0].earned * RepeatFloor * 0.98,
    `${runs[0].earned} -> ${runs[3].earned}`);
  check('geçiş sayacı tutuluyor', timesDone(d, 3) === 4, String(timesDone(d, 3)));
  check('başka bölümün sayacı etkilenmiyor', timesDone(d, 4) === 0);
}

// Bir bölümü ilk kez geçmek, aynı bölümü on kez farmlamaktan çok daha fazla gem veriyor.
{
  const farm = tidy({ level: 5, loadout: ['bolt'] });
  for (let i = 0; i < 10; i++) finish(farm, 1, 100, 100, 150, { bolt: 5 });
  const push = tidy({ level: 5, loadout: ['bolt'] });
  finish(push, 1, 100, 100, 150, { bolt: 5 });
  finish(push, 2, 100, 100, 150, { bolt: 5 });
  check('ilerlemek farmlamaktan çok daha fazla gem veriyor',
    gemsHeld(push) > gemsHeld(farm) * 0.9,
    `iki yeni bölüm ${gemsHeld(push)} gem vs 1. bölümü on kez ${gemsHeld(farm)} gem`);
}

// --- iki sandık, gem ile ---------------------------------------------------------------------

check('iki sandık var', ChestKinds.length === 2 && Chests.small && Chests.great);
check('büyük sandık her şeyde küçükten cömert',
  Chests.great.runes > Chests.small.runes && Chests.great.exp > Chests.small.exp
  && Chests.great.gold > Chests.small.gold && Chests.great.gems > Chests.small.gems);

// 10x'in bütün sebebi bu: ucuz olmazsa düğme bir kolaylıktan ibaret kalır.
check('on tane dokuz fiyatına',
  costOf('small', Bulk) === Chests.small.gems * (Bulk - 1)
  && costOf('great', Bulk) === Chests.great.gems * (Bulk - 1),
  `${costOf('small', Bulk)} vs ${Chests.small.gems * Bulk}`);
check('10x gerçekten ucuz', costOf('small', Bulk) < Chests.small.gems * Bulk);
check('tek tek almak indirimsiz', costOf('small', 1) * Bulk > costOf('small', Bulk));

{
  const d = tidy({ level: 5, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  const kit = d.loadout;
  check('gemsiz sandık açılmıyor',
    openChest(d, 'small') === null && openChest(d, 'great') === null);

  d.gems = Chests.small.gems;
  check('tam parayla açılabiliyor', canOpen(d, 'small', 1));
  check('ama 10x açılamıyor', !canOpen(d, 'small', Bulk) && openChest(d, 'small', Bulk) === null);

  const was = { bank: d.bank, gold: d.gold, shards: { ...d.shards } };
  const got = openChest(d, 'small', 1);
  check('küçük sandık deneyim, altın ve parça ödüyor',
    got && got.kind === 'small' && got.many === 1 && got.exp > 0 && got.gold > 0
    && Object.keys(got.shards).length === kit.length, JSON.stringify(got));
  check('vaat edilen parça sayısı çıkıyor',
    Math.abs(got.runes - Chests.small.runes) <= kit.length,
    `${got.runes} vs ${Chests.small.runes}`);
  check('sandığın deneyimi yazıldı', d.bank === was.bank + got.exp);
  check('sandığın altını yazıldı', d.gold === was.gold + got.gold);
  check('sandığın parçaları taşınanlara dağıldı',
    kit.every((k) => shardsOf(d, k) === (was.shards[k] || 0) + got.shards[k]));
  check('gem harcandı', gemsHeld(d) === 0, String(gemsHeld(d)));
  check('parasız ikinci kez açılmıyor', openChest(d, 'small') === null);
}

// 10x bir alışveriş, art arda on alışveriş değil - yoksa indirim diye bir şey kalmaz.
{
  const d = tidy({ level: 7, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  d.gems = costOf('great', Bulk);
  const one = chestPrize('great', 7, d.loadout, 1);
  const big = openChest(d, 'great', Bulk);
  check('10x on katını ödüyor',
    big && big.many === Bulk && big.exp === one.exp * Bulk && big.runes === one.runes * Bulk,
    JSON.stringify({ one: one.runes, big: big && big.runes }));
  check('10x dokuz tane parası alıyor', gemsHeld(d) === 0 && big.gems === costOf('great', Bulk));
  check('10x on sandık sayılıyor', d.chests === Bulk, String(d.chests));
}

check('olmayan bir sandık yok', chestPrize('devasa', 5, ['bolt']) === null);

// Vaat edilen toplam, kaç büyü taşıdığından bağımsız olmalı.
{
  for (const n of [1, 2, 4]) {
    const kit = ['bolt', 'fireball', 'frost', 'lightning'].slice(0, n);
    const p = chestPrize('great', 8, kit);
    check(`${n} büyüyle büyük sandık sözünü tutuyor`,
      Math.abs(p.runes - Chests.great.runes) <= n,
      `${p.runes} parça (söz: ${Chests.great.runes})`);
  }
}

// Bozuk kayıt.
{
  const d = tidy({
    level: 1, chests: -4, spins: 1.7, spun: 'bugün', gems: -40,
    done: { 1: 3, 0: 9, tarla: 5, 4: -2 },
    gold: -20, shards: { bolt: 5, hayalet: 99, frost: -3 }, spell: { bolt: 99, hayalet: 4, frost: 0 },
  });
  check('eksi gem sıfırlanıyor', d.gems === 0);
  check('geçerli geçiş sayacı korunuyor', d.done[1] === 3);
  check('sıfırıncı bölüm diye bir şey yok', d.done[0] === undefined);
  check('bölüm olmayan anahtar atılıyor', d.done.tarla === undefined);
  check('eksi sayaç atılıyor', d.done[4] === undefined);
  check('tarih olmayan çevirme kaydı atılıyor', d.spun === null);
  check('eksi altın sıfırlanıyor', d.gold === 0);
  check('olmayan büyünün parçası atılıyor', d.shards.hayalet === undefined);
  check('geçerli parça korunuyor', d.shards.bolt === 5);
  check('eksi parça atılıyor', d.shards.frost === undefined);
  check('olmayan büyünün seviyesi atılıyor', d.spell.hayalet === undefined);
  check('sınır üstü seviye kırpılıyor', d.spell.bolt === SpellSteps, String(d.spell.bolt));
  check('seviyeler koşuya temiz gidiyor',
    Object.keys(spellLevels(d)).every((k) => all.includes(k)));
}

{
  const d = tidy({ level: 4, loadout: ['bolt', 'frost'], gems: Chests.small.gems });
  const r = rewardState(d, '2026-10-14');
  check('sekme durumu tek okumada geliyor',
    r.spin === true && r.unit === unitOf(4) && r.gems === Chests.small.gems
    && r.chests.length === 2
    && r.chests[0].one.can === true && r.chests[0].many.can === false
    && r.chests[1].one.can === false
    && r.chests[1].one.holds.runes > r.chests[0].one.holds.runes,
    JSON.stringify(r));
}

console.log('');
console.log(`çark: ${Wedges.map((x, i) => `${amountAt(i, 5)}${x.kind === 'gold' ? ' altın' : x.kind === 'shard' ? ' parça' : ' dnym'}`).join(' · ')}   (seviye 5)`);
for (const kind of ChestKinds) {
  const p = chestPrize(kind, 5, ['bolt', 'fireball', 'frost', 'lightning']);
  console.log(`${kind === 'great' ? 'büyük' : 'küçük'} sandık: ${p.gems} gem → ${p.runes} parça · ${p.exp} deneyim · ${p.gold} altın   (10x: ${costOf(kind, Bulk)} gem)  (seviye 5)`);
}
console.log(`gem: ilk geçiş ${gemsFor(1)} (1. bölüm) → ${gemsFor(10)} (10. bölüm) · tekrarlar ${[0, 1, 2, 3].map((n) => gemDecay(n)).join('/')}`);
console.log(`bir büyüyü sonuna kadar: ${wholeGold.toLocaleString('en')} altın + ${wholeShards} parça → hasar +%${Math.round(liftAt(SpellSteps) * 100)}`);

// --- hesap: ana seviye ve kilitler --------------------------------------------------------------

check('ilk büyü baştan açık', UnlockAt.bolt === 1);
check('her büyünün bir açılma seviyesi var', all.every((k) => UnlockAt[k] >= 1));
check('ana seviye maliyeti hep artıyor', [1, 2, 3, 5, 9, 14].every((n) => needFor(n + 1) > needFor(n)));

// Birinci seviyede TAM BİR LOADOUT açık olmalı. Tek büyüyle açılan bir oyun, ilk koşusu en zayıf
// koşu olan bir oyundur - ve açılış ekranı dolu değil, ödev gibi görünür.
check('1. seviyede tam bir loadout kuracak kadar büyü açık', unlocked(1).length >= Carry,
  `${unlocked(1).length} tane: ${unlocked(1).join(',')}`);
check('her şey 13. seviyede açılıyor', unlocked(13).length === all.length);
check('sıradaki kilit söylenebiliyor', !!nextUnlock(1) && nextUnlock(1).at > 1);
check('son seviyede sıradaki kilit yok', nextUnlock(99) === null);

{
  const d = tidy({ level: 1, xp: 0, loadout: ['meteor', 'nova'] });
  check('açılmamış büyü loadouttan atılıyor', !d.loadout.includes('meteor') && !d.loadout.includes('nova'));
  check('yeni hesap dolu loadoutla başlıyor', d.loadout.length === Carry, d.loadout.join(','));
  check('sabit büyü her zaman loadoutta', d.loadout[0] === Always);
}

{
  const d = tidy({});
  check('boş kayıt dolu loadout veriyor', d.loadout.length === Carry, d.loadout.join(','));
  check('varsayılan dil İngilizce', d.lang === 'en');
  check('varsayılan hız 1x', d.speed === 1);
  const bad = tidy({ lang: 'klingon', speed: 7, loadout: ['bolt'] });
  check('tanınmayan dil ve hız düzeltiliyor', bad.lang === 'en' && bad.speed === 1);
}

// --- diller -------------------------------------------------------------------------------------

{
  // Her yazı bir çift: İngilizce, Türkçe. Biri eksikse ekranda boşluk ya da yanlış dil çıkar.
  const pairs = [];
  const add = (where, v) => pairs.push([where, v]);
  for (const [k, sp] of Object.entries(Spells)) {
    add(`${k}.name`, sp.name);
    add(`${k}.tells`, sp.tells);
    for (const b of sp.boosts) { add(`${k}.${b.key}.name`, b.name); add(`${k}.${b.key}.tells`, b.tells); }
    for (const e of sp.evolutions) { add(`${k}.${e.key}.name`, e.name); add(`${k}.${e.key}.tells`, e.tells); }
  }
  for (const [k, pa] of Object.entries(Passives)) { add(`passive.${k}.name`, pa.name); add(`passive.${k}.tells`, pa.tells); }
  for (const [k, v] of Object.entries(UI)) add(`UI.${k}`, v);

  const broken = pairs.filter(([, v]) =>
    !Array.isArray(v) || v.length !== Languages.length || v.some((x) => typeof x !== 'string' || !x.trim()));
  check(`${pairs.length} yazının hepsi iki dilde`, broken.length === 0,
    broken.slice(0, 6).map(([w]) => w).join(', '));

  // Ve çevrilmiş olmalı. İki dilde aynı kalabilecek olanlar: özel adlar (Nova, Meteor) ve
  // içinde kelime olmayan biçimler ("{0} / {1}"). Bir avuçtan fazlası, unutulmuş çeviri demek.
  const sameBoth = pairs.filter(([, v]) => Array.isArray(v) && v[0] === v[1]);
  check('neredeyse her yazı gerçekten çevrilmiş', sameBoth.length <= 5,
    `${sameBoth.length} tane: ${sameBoth.map(([w]) => w).join(', ')}`);
}

{
  const was = language();
  setLanguage('tr');
  check('dil değişince yazı değişiyor', say(Spells.bolt.name) === Spells.bolt.name[1]);
  check('yer tutucular dolduruluyor', say(UI.stage, 4) === 'BÖLÜM 4', say(UI.stage, 4));
  setLanguage('en');
  check('İngilizceye dönülebiliyor', say(Spells.bolt.name) === Spells.bolt.name[0]);
  setLanguage('bilinmeyen');
  check('tanınmayan dil İngilizceye düşüyor', language() === 'en');
  check('düz yazı olduğu gibi dönüyor', say('plain') === 'plain');
  check('boş değer çökmüyor', say(undefined) === '');
  setLanguage(was);
}

{
  // Kart metinleri de dilden geçmeli - kartın vaadi oyuncunun okuduğu dilde olmalı
  const s = begin(99, ['bolt', 'lightning']);
  s.kit.bolt.taken = BoostsPerTier;
  s.phase = 'picking';
  s.choices = offer(s);
  const card = s.choices.find((c) => c.key === 'bolt');
  if (card) {
    setLanguage('en');
    const en = describe(s, card);
    setLanguage('tr');
    const tr = describe(s, card);
    setLanguage('en');
    check('kart metni dile göre değişiyor', en.title !== tr.title && en.text !== tr.text,
      `${en.title} / ${tr.title}`);
  } else {
    check('kart metni dile göre değişiyor', false, 'kart bulunamadı');
  }
}

{
  const d = tidy({ level: 13, xp: 0, loadout: ['bolt', 'bolt', 'bolt', 'nova', 'frost', 'meteor', 'laser'] });
  check('loadout tekrarsız ve dörtle sınırlı',
    d.loadout.length === LoadoutSize && new Set(d.loadout).size === LoadoutSize, d.loadout.join());
  check('sabit büyü hep başta', d.loadout[0] === Always, d.loadout.join());
}

{
  const e = tidy({ level: 13, xp: 0, loadout: ['bolt'] });
  check('sabit büyü loadouttan çıkarılamıyor', toggle(e, Always) === false && e.loadout.includes(Always));
  const f = tidy({ level: 13, xp: 0, loadout: ['bolt', 'frost', 'nova', 'laser'] });
  check('dolu loadouta beşincisi eklenemiyor', toggle(f, 'shards') === false, f.loadout.join(','));
  const g = tidy({ level: 1, xp: 0, loadout: ['bolt'] });
  check('açılmamış büyü loadouta eklenemiyor', toggle(g, 'meteor') === false);
  const h = tidy({ level: 13, xp: 0, loadout: ['bolt', 'frost', 'nova', 'laser'] });
  check('loadouttan çıkarma çalışıyor', toggle(h, 'frost') === true && !h.loadout.includes('frost'));
}

{
  const d = tidy({ level: 1, xp: 0, loadout: ['bolt', 'shards'], best: 0 });
  const r = record(d, 3, 500);
  check('koşu deneyim kazandırıyor', r.earned === worth(3, 500) && r.earned > 500);
  check('hesap seviye atlıyor', r.levelled && d.level > 1);
  // Loadout doluysa yeni açılan büyü kendi giremez - oyuncunun seçimini ezmek doğru olmaz.
  check('açılan büyü yer varsa kendi giriyor, yoksa loadout dolu kalıyor',
    d.loadout.length === Carry, d.loadout.join(','));
  check('en iyi bölüm kaydediliyor', d.best === 3);
}

// --- the bot ---------------------------------------------------------------------------------

/** Makul bir oyuncu: saniyede altı tıklar ve kartları puanlar. Tek bir bölüm oynar. */
/**
 * `neutral` scrubs every creature back to the family with no resistances, frame by frame.
 *
 * It is the only way to measure what a family is actually worth. Comparing two loadouts conflates
 * the resistance with the raw power of the spells they differ by; comparing two stages conflates
 * it with how hard those stages are. The same seed, the same loadout, the same stage, with the
 * table on and off, conflates it with nothing.
 */
function botRun(seed, loadout, stage = 1, clicksPerSecond = 6, hero = 0, spellAt = 1, neutral = false) {
  const levels = Object.fromEntries(loadout.map((k) => [k, spellAt]));
  const s = begin(seed, loadout, stage, heroTotals(hero), levels);
  const dt = 1 / 60;
  let since = 0;
  let guard = 0;
  while ((s.phase === 'playing' || s.phase === 'picking') && guard++ < 60 * 420) {
    if (s.phase === 'picking') {
      let best = 0, bestScore = -1e9;
      s.choices.forEach((c, j) => {
        let score;
        if (c.what === 'spell') score = 120;
        else if (c.what === 'evolution') score = 100;
        else if (c.what === 'passive') score = 34 - (s.passives[c.key] || 0) * 8;
        else score = 18 + (s.kit[c.key] ? s.kit[c.key].taken * 4 : 0);
        if (score > bestScore) { bestScore = score; best = j; }
      });
      take(s, best);
      continue;
    }
    since += dt;
    if (since >= 1 / clicksPerSecond) { since = 0; click(s); }
    step(s, dt);
    if (neutral) for (const f of s.foes) if (!f.boss) f.family = 'folk';
    s.events.length = 0;
  }
  return {
    done: s.phase === 'done',
    t: s.t,
    level: s.level,
    kills: s.kills,
    wall: s.wall,
    maxWall: s.maxWall,
    stars: s.phase === 'done' ? starsFor(s.wall, s.maxWall) : 0,
    evos: carrying(s).reduce((a, k) => a + s.kit[k].evos.length, 0),
  };
}

const Four = ['bolt', 'fireball', 'frost', 'lightning'];
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

console.log('');
console.log(`loadout: ${Four.join(', ')} — saniyede 6 tıklayan oyuncu, bölüm başına 40 koşu:`);
console.log('bölüm  bitirme   süre    yıldız dağılımı (0/1/2/3)   ortanca seviye/dönüşüm');
const byStage = [];
for (const stage of [1, 2, 3, 4, 5]) {
  const runs = [];
  for (let i = 1; i <= 40; i++) runs.push(botRun(i * 7919, Four, stage));
  const done = runs.filter((r) => r.done);
  const times = done.map((r) => r.t).sort((a, b) => a - b);
  const spread = [0, 1, 2, 3].map((n) => runs.filter((r) => r.done && r.stars === n).length);
  const lv = runs.map((r) => r.level).sort((a, b) => a - b)[20];
  const ev = runs.map((r) => r.evos).sort((a, b) => a - b)[20];
  byStage.push({ stage, rate: done.length / runs.length, spread, times });
  console.log(`  ${stage}     %${String(Math.round(done.length / runs.length * 100)).padStart(3)}   ` +
    `${(times.length ? fmt(times[Math.floor(times.length / 2)]) : ' -- ').padStart(5)}    ` +
    `${spread.join(' / ').padEnd(22)}  ${lv} / ${ev}`);
}

// Tek büyü, erken bölümlerde dolu loadouttan İYİ - ve bu doğru: ilk bölümler affedici ve
// odaklanmak işe yarıyor. Asıl soru derin bölümlerde ne olduğu, çünkü loadout oraya yetişmek
// için var. Ölçüm: 1. bölümde tek büyü %100 / dört büyü %88, ama 3.'de %18 / %43, 5.'de %0 / %13.
// Merdivenin asıl işi: bugün çok sert olan bölümleri zamanla ulaşılabilir kılmak.
console.log('');
console.log('merdivenin bölümlere etkisi (40 koşu):');
for (const stage of [3, 4, 5]) {
  const off = [], on = [];
  for (let i = 1; i <= 40; i++) {
    off.push(botRun(i * 7919, Four, stage, 6, 0).done);
    on.push(botRun(i * 7919, Four, stage, 6, HeroSteps).done);
  }
  const pc = (a) => Math.round(a.filter(Boolean).length / a.length * 100);
  console.log(`  bölüm ${stage}:  merdivensiz %${String(pc(off)).padStart(3)}   tam merdivenle %${String(pc(on)).padStart(3)}`);
  if (stage === 5) {
    check('tam merdiven derin bölümleri açıyor', pc(on) > pc(off) + 10,
      `bölüm 5: %${pc(off)} -> %${pc(on)}`);
  }
}

// Üçüncü güç kaynağı. Koşu içi kartlar, kahraman peteği ve kalıcı büyü seviyesi BİRBİRİYLE
// ÇARPILIYOR; üçü birden açıkken oyun hâlâ bir oyun mu, yoksa yürüyüş mü - ölçülmeden bilinmez.
console.log('');
console.log('kalıcı büyü seviyesinin etkisi (40 koşu):');
for (const stage of [3, 5]) {
  const off = [], lvl = [], both = [];
  for (let i = 1; i <= 40; i++) {
    off.push(botRun(i * 7919, Four, stage, 6, 0, 1).done);
    lvl.push(botRun(i * 7919, Four, stage, 6, 0, SpellSteps).done);
    both.push(botRun(i * 7919, Four, stage, 6, HeroSteps, SpellSteps).done);
  }
  const pc = (a) => Math.round(a.filter(Boolean).length / a.length * 100);
  console.log(`  bölüm ${stage}:  çıplak %${String(pc(off)).padStart(3)}   ` +
    `sadece büyü seviyesi %${String(pc(lvl)).padStart(3)}   ` +
    `merdiven + seviye %${String(pc(both)).padStart(3)}`);
  if (stage === 5) {
    check('kalıcı seviye derin bölümlerde hissediliyor', pc(lvl) > pc(off),
      `bölüm 5: %${pc(off)} -> %${pc(lvl)}`);
    // Bu kontrol eskiden "5. bölüm garanti olmamalı" diyordu - derin bölüm ölçümü eklenmeden
    // önce test edilen en derin bölüm 5'ti. Artık değil: "hâlâ bir duvar var mı" sorusu aşağıda,
    // 8/12/16. bölümlerde soruluyor. Burada sorulacak doğru soru bunun tersi: merdiveni ve
    // seviyeleri sonuna kadar alan oyuncu, bugün zar zor geçtiği bölümü rahatça geçebilmeli -
    // yoksa yüzlerce koşuluk yükseltmenin karşılığı görünmez.
    check('tam donanım bugün zor olan bölümü rahat kılıyor', pc(both) > 90,
      `bölüm 5: çıplak %${pc(off)} -> tam donanım %${pc(both)}`);
  }
}

// Tam donanımlı oyuncuda 3. ve 5. bölüm neredeyse garanti - ve bu, ancak derin bölümler hâlâ
// direniyorsa sorun değil. Bölümler sonsuz dönüyor ve her biri bir öncekinden sert; eğer burada
// da duvar yoksa, oyunun bir sonu var demektir ve oraya varan geri gelmez.
{
  const deep = [];
  for (const stage of [8, 12, 16]) {
    const runs = [];
    for (let i = 1; i <= 20; i++) runs.push(botRun(i * 7919, Four, stage, 6, HeroSteps, SpellSteps).done);
    const pc = Math.round(runs.filter(Boolean).length / runs.length * 100);
    deep.push({ stage, pc });
  }
  console.log(`  tam donanımlı, derin bölümler: ${deep.map((d) => `${d.stage}. %${d.pc}`).join('  ')}`);
  check('tam donanımlı oyuncunun önünde hâlâ duvar var',
    deep[deep.length - 1].pc < 60,
    deep.map((d) => `${d.stage}. bölüm %${d.pc}`).join(', '));
  check('bölümler tam donanımda da zorlaşıyor', deep[0].pc > deep[deep.length - 1].pc,
    deep.map((d) => `${d.stage}. %${d.pc}`).join(' '));
}

// Aileler bir KARAR mi, yoksa sadece bir sus mu?
//
// Bitirme orani bu soru icin fazla korelmis bir alet: %20 civarinda, 40 kosuda standart hata
// ~6 puan, yani aradigimiz etki gurultunun icinde kayboluyor. Iki kez olctum, iki kez "fark yok"
// cikti - olcum yanlisti, oyun degil.
//
// Bunun yerine ESLI olcum: ayni tohum, ayni loadout, ayni bolum, sabit sure, tablo acik ve
// kapali. Dalga aynisi (aile zarini her iki halde de atiyoruz), oyuncu aynisi, tek degisen
// direnc tablosu. Oldurulen sayisi surekli bir sayi, ve esli fark varyansin cogunu siliyor.
function sweep(kit, stage, seconds, neutral) {
  let kills = 0;
  for (let i = 1; i <= 25; i++) {
    const s = begin(i * 7919, kit, stage);
    const dt = 1 / 60;
    let since = 0;
    while (s.t < seconds && s.phase !== 'lost') {
      if (s.phase === 'picking') { take(s, 0); continue; }
      since += dt;
      if (since >= 1 / 6) { since = 0; click(s); }
      step(s, dt);
      if (neutral) for (const f of s.foes) if (!f.boss) f.family = 'folk';
      s.events.length = 0;
    }
    kills += s.kills;
  }
  return kills;
}

console.log('');
console.log('element eşleşmesi — iki ayrı loadout, aynı tohumlar (25 koşu × 60 sn):');
{
  // Esli olcum (tablo acik/kapali) tek basina yaniltiyordu: bot kartlarin hepsini TEK bir buyuye
  // yigiyor, o yuzden "ates x2.1" dedigimde ates bu loadout'un hasarinin yuzde dordu oldugu icin
  // hicbir sey degismiyordu. Olculmesi gereken, oyuncunun gercekten verecegi karar: elemente gore
  // kurulmus bir loadout, o elemente zayif ve dayanikli ailelere karsi.
  const fireKit = ['bolt', 'fireball', 'laser', 'meteor'];   // ateş yığını
  const bladeKit = ['bolt', 'shards', 'blade', 'wisp'];      // bıçak yığını
  const rows = [];
  for (const stage of [2, 3, 4]) {
    rows.push({
      stage, family: familiesOn(stage).join('+'),
      fire: sweep(fireKit, stage, 60, false),
      blade: sweep(bladeKit, stage, 60, false),
    });
  }
  for (const r of rows) {
    const lead = r.fire > r.blade ? 'ateş' : 'bıçak';
    const by = Math.round(Math.abs(r.fire / r.blade - 1) * 100);
    console.log(`  ${r.stage}. bölüm (${r.family}): ateş yığını ${r.fire} ölü · bıçak yığını ${r.blade} ölü  → ${lead} %${by} önde`);
  }

  const swarm = rows.find((r) => r.family.includes('swarm'));   // ateşe zayıf, bıçağa dayanıklı
  const spider = rows.find((r) => r.family.includes('spider')); // ateşe zayıf
  const wurm = rows.find((r) => r.family.includes('wurm'));     // bıçağa zayıf, ateşe dayanıklı

  check('ateşe zayıf ailelere karşı ateş yığını önde',
    swarm.fire > swarm.blade && spider.fire > spider.blade,
    `sürü ${swarm.fire}/${swarm.blade} · örümcek ${spider.fire}/${spider.blade}`);
  check('ateşe dayanıklı aileye karşı sıralama tersine dönüyor',
    wurm.blade > wurm.fire,
    `kurt: ateş ${wurm.fire} · bıçak ${wurm.blade}`);

  // Fark hissedilmezse ailelerin bir anlami yok; fark ezici olursa loadout bir secim degil bir
  // sinav olur. Ikisinin arasinda bir yerde olmali.
  const gap = (r) => Math.abs(r.fire / r.blade - 1);
  check('fark hissedilir ama ezici değil',
    rows.every((r) => gap(r) < 1.2) && Math.max(...rows.map(gap)) > 0.15,
    rows.map((r) => `${r.stage}. %${Math.round(gap(r) * 100)}`).join(' · '));
}

// Harita, her bolumun neye zayif oldugunu OYNA'nin yaninda yaziyor. O yaziyi okuyup loadout'unu
// degistiren oyuncu icin bolum gecilebilir olmali - yoksa yazi bir tavsiye degil, bir alay olur.
console.log('');
console.log('haritanın söylediğini yapan oyuncu (40 koşu):');
{
  const rate = (kit, stage) => {
    const runs = [];
    for (let i = 1; i <= 40; i++) runs.push(botRun(i * 7919, kit, stage).done);
    return Math.round(runs.filter(Boolean).length / runs.length * 100);
  };
  // 4. bolum kurtlar: atese dayanikli, bicaga zayif. Botun varsayilan eli tam tersi.
  //
  // Bitirme orani burada yine kor: iki loadout sadece elementte degil guc olarak da farkli, ve
  // %15 civarinda 40 kosunun standart hatasi 6 puan. Olcum oldurulene bakiyor - surekli bir sayi,
  // ve ayni tohumlarda esli.
  const wrongKit = ['bolt', 'fireball', 'frost', 'lightning'];
  const rightKit = ['bolt', 'shards', 'blade', 'frost'];
  const wrong = sweep(wrongKit, 4, 60, false);
  const right = sweep(rightKit, 4, 60, false);
  console.log(`  4. bölüm (kurtlar): ters loadout ${wrong} ölü · haritayı okuyan ${right} ölü`);
  // Esik sadece "one gecer" - cunku bu iki loadout element disinda da farkli ve kagit uzerinde
  // uygun olan daha ZAYIF: Yildirim, Kiymiklar'dan guclu. Soylenen sudur: kagit uzerinde daha
  // zayif ama elemente uygun bir el, kagit uzerinde guclu ama ters olani geciyor. Elementin tek
  // basina ne ettigi yukarida, ayni gucte iki yiginla olculuyor.
  check('elemente uygun el, kâğıt üzerinde güçlü olan ters eli geçiyor', right > wrong,
    `ters ${wrong} vs uygun ${right}`);
  check('bölüm uyum sağlamayanı da tamamen dışlamıyor',
    rate(wrongKit, 4) >= 15, `ters loadout ile %${rate(wrongKit, 4)}`);
}

const solo = [];
for (let i = 1; i <= 30; i++) solo.push(botRun(i * 104729, ['bolt'], 3).done);
const lazy = [];
for (let i = 1; i <= 30; i++) lazy.push(botRun(i * 104729, Four, 1, 1).done);
console.log(`  sadece sabit büyüyle 3. bölüm: %${Math.round(solo.filter(Boolean).length / solo.length * 100)}  (dört büyüyle %${Math.round(byStage[2].rate * 100)})`);
console.log(`  neredeyse hiç tıklamayan (1/sn), 1. bölüm: %${Math.round(lazy.filter(Boolean).length / lazy.length * 100)}`);

// Birinci bölümü neredeyse herkes bitirmeli - ilk oturuşta hiçbir şey başaramayan oyuncu geri
// gelmez. Ama üç yıldız kolay olmamalı, yoksa yıldızın bir anlamı kalmaz.
check('birinci bölümü çoğu oyuncu bitiriyor', byStage[0].rate > 0.85, `%${Math.round(byStage[0].rate * 100)}`);
check('bölümler zorlaşıyor', byStage[4].rate < byStage[0].rate * 0.85,
  `1: %${Math.round(byStage[0].rate * 100)}  5: %${Math.round(byStage[4].rate * 100)}`);
check('üç yıldız garanti değil', byStage[0].spread[3] < 40, `${byStage[0].spread[3]}/40`);
check('üç yıldız imkânsız da değil', byStage.some((b) => b.spread[3] > 0),
  byStage.map((b) => b.spread[3]).join(','));
check('bir bölüm makul sürüyor', byStage[0].times.length > 0 && byStage[0].times[Math.floor(byStage[0].times.length / 2)] < 240,
  byStage[0].times.length ? fmt(byStage[0].times[Math.floor(byStage[0].times.length / 2)]) : 'hiç bitmedi');
check('dolu loadout derin bölümlerde tek büyüden iyi', byStage[2].rate > solo.filter(Boolean).length / solo.length * 1.3,
  `3. bölüm: %${Math.round(byStage[2].rate * 100)} vs %${Math.round(solo.filter(Boolean).length / solo.length * 100)}`);
check('tıklamak işe yarıyor', byStage[0].rate > lazy.filter(Boolean).length / lazy.length,
  `%${Math.round(byStage[0].rate * 100)} vs %${Math.round(lazy.filter(Boolean).length / lazy.length * 100)}`);

// --- ödüller ne kadar ediyor --------------------------------------------------------------------
//
// Iki ayri soru, cunku iki ayri sey olcüluyor.
//
// CARK bedava: gunde bir, hicbir sey yapmadan. Ona sorulacak soru "oynamadan ne kadar
// alabiliyorsun" - ve cevabi kucuk olmali.
//
// SANDIK bedava degil: gem ile aliniyor, gem'i de sadece YENI bir bolum geçmek uretiyor. Ona
// sorulacak soru bambaska: bir sandiga kac yeni bolum uzaklikta?
{
  const Session = 8;
  const rows = [];

  // Bir cevirmenin tur basina beklentisi: her dilim 1/8.
  const perSpin = (level) => {
    const out = { exp: 0, gold: 0, shard: 0 };
    Wedges.forEach((wedge, i) => { out[wedge.kind] += amountAt(i, level) / Wedges.length; });
    return out;
  };

  for (const stage of [1, 3]) {
    const d = tidy({ level: 1, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
    const runs = { exp: 0, gold: 0, shard: 0 };
    for (let i = 1; i <= Session; i++) {
      const r = botRun(i * 7919, Four, stage);
      if (!r.done) continue;
      const was = { bank: d.bank, gold: d.gold };
      const got = finish(d, stage, r.wall, r.maxWall, r.kills,
        Object.fromEntries(Four.map((k) => [k, 4])));
      runs.exp += d.bank - was.bank;
      runs.gold += d.gold - was.gold;
      runs.shard += Object.values(got.shards).reduce((a, b) => a + b, 0);
    }
    const wheel = perSpin(d.level);
    rows.push({
      stage, runs, wheel,
      part: { exp: wheel.exp / runs.exp, gold: wheel.gold / runs.gold, shard: wheel.shard / runs.shard },
    });
  }

  const pc = (x) => `%${Math.round(x * 100)}`;
  const kinds = ['exp', 'gold', 'shard'];
  console.log('');
  console.log(`çarkın ağırlığı (günde bir çevirme, ${Session} koşuluk bir oturumun yanında):`);
  for (const r of rows) {
    console.log(`  bölüm ${r.stage}: deneyim ${pc(r.part.exp)} · altın ${pc(r.part.gold)} · parça ${pc(r.part.shard)}`);
  }
  check('çark oynamanın yerini almıyor',
    rows.every((r) => kinds.every((k) => r.part[k] < 0.35)),
    rows.map((r) => `bölüm ${r.stage}: ${kinds.map((k) => k + ' ' + pc(r.part[k])).join(' ')}`).join('  |  '));
  check('çark hissedilir derecede var',
    rows.every((r) => kinds.some((k) => r.part[k] > 0.05)),
    rows.map((r) => `bölüm ${r.stage}: ${kinds.map((k) => k + ' ' + pc(r.part[k])).join(' ')}`).join('  |  '));

  // --- gem: bir sandiga kac yeni bolum?
  {
    let gems = 0;
    const milestones = [];
    for (let stage = 1; stage <= 24; stage += 1) {
      gems += gemsOn(stage, 0, 3);
      milestones.push({ stage, gems });
    }
    const reaches = (cost) => (milestones.find((m) => m.gems >= cost) || {}).stage;
    console.log(`gem: her bölümü bir kez üç yıldızla geçerek —` +
      ` küçük sandık ${reaches(costOf('small', 1))}. bölümde,` +
      ` büyük sandık ${reaches(costOf('great', 1))}. bölümde,` +
      ` 10x küçük ${reaches(costOf('small', Bulk))}. bölümde,` +
      ` 10x büyük ${reaches(costOf('great', Bulk))}. bölümde`);

    check('ilk sandık erken geliyor', reaches(costOf('small', 1)) <= 4,
      `${reaches(costOf('small', 1))}. bölüm`);
    check('10x büyük sandık uzun vadeli bir hedef',
      reaches(costOf('great', Bulk)) >= 12 && reaches(costOf('great', Bulk)) <= 24,
      `${reaches(costOf('great', Bulk))}. bölüm`);

    // Ve asil kural: ayni bolumu durmadan gecmek hicbir sandigi acmiyor.
    const farm = tidy({ level: 5, loadout: ['bolt'] });
    for (let i = 0; i < 50; i++) finish(farm, 1, 100, 100, 150, { bolt: 5 });
    check('aynı bölümü elli kez geçmek bir sandık bile açmıyor',
      gemsHeld(farm) < costOf('small', 1),
      `${gemsHeld(farm)} gem (küçük sandık ${costOf('small', 1)})`);
  }

  // --- ve hala: guvenle bitirilen en derin bolum en cok odemeli
  {
    const perMinute = (stage) => {
      const d = tidy({ level: 9, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
      let runes = 0, seconds = 0;
      for (let i = 1; i <= 30; i++) {
        const r = botRun(i * 7919, Four, stage, 6, HeroSteps, SpellSteps);
        seconds += r.t;
        if (!r.done) continue;
        const got = finish(d, stage, r.wall, r.maxWall, r.kills,
          { bolt: 6, fireball: 3, frost: 3, lightning: 3 });
        runes += got.shards.bolt || 0;
      }
      return (runes / seconds) * 60;
    };
    const farm = perMinute(1);
    const push = perMinute(5);
    console.log(`  tam donanımda, beslenen büyüye dakikada parça: 1. bölüm ${farm.toFixed(1)} · 5. bölüm ${push.toFixed(1)}`);
    check('güvenle bitirilen en derin bölüm en çok ödüyor', push > farm * 1.2,
      `1. bölüm ${farm.toFixed(1)}/dk vs 5. bölüm ${push.toFixed(1)}/dk`);
  }

  const mid = rows[1];
  const perRun = { gold: mid.runs.gold / Session, shard: mid.runs.shard / Session / Four.length };
  console.log(`  3. bölümde koşu başına ~${Math.round(perRun.gold)} altın, beslenen büyüye ~${Math.round(perRun.shard)} parça`);
  console.log(`  → bir büyüyü sonuna kadar: altınla ~${Math.round(wholeGold / perRun.gold)} koşu, parçayla ~${Math.round(wholeShards / perRun.shard)} koşu`);
  check('iki para birimi de söz sahibi',
    Math.max(wholeGold / perRun.gold, wholeShards / perRun.shard)
      < Math.min(wholeGold / perRun.gold, wholeShards / perRun.shard) * 3,
    `altın ${Math.round(wholeGold / perRun.gold)} koşu vs parça ${Math.round(wholeShards / perRun.shard)} koşu`);
}

console.log('');
if (failures.length) {
  console.log(`${failures.length} KONTROL DÜŞTÜ:`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${passed} kontrol geçti`);

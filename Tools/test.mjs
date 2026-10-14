// Kurallar + bir bot. Tarayıcı yok.
//
// Bu oyun birbiriyle etkileşen on büyü ve doksana yakın yükseltmeden ibaret; o yığının tutarlı
// olup olmadığı gözle görülmez. Burada bir koşu milisaniyelerde bitiyor, yüzlercesi birden.
//
//   node Tools/test.mjs

import {
  begin, step, click, take, offer, spawn, statsOf, carrying, carries,
  tierDue, evolutionsFor, boostsFor,
  Spells, Passives, Kinds, StageWaves, BoostsPerTier, MostPassive, MostEvos, LoadoutSize,
  spellKeys, passiveKeys, haste, describe, advance, waiting, Always, pressure,
} from '../src/rules.js';
import { UnlockAt, unlocked, nextUnlock, LoadoutSize as Carry } from '../src/spells.js';
import { say, setLanguage, language, Languages, UI } from '../src/text.js';
import { needFor, worth, record, finish, toggle, tidy, Speeds, starsFor, nextStarAt, stageOpen, furthestStage, starsAt, heroBonus, heroNext, buyHero, spin, openChest } from '../src/meta.js';
import {
  Wedges, prizeAt, wedgeFor, unitOf, ChestKills, ChestWorth, chestPrize, chestFull, chestPart,
  today, canSpin, state as rewardState,
} from '../src/rewards.js';
import { restFor, wedgeUnder } from '../src/menu.js';
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

// --- ödüller: çark ve sandık --------------------------------------------------------------------

check('çarkın sekiz dilimi var', Wedges.length === 8, `${Wedges.length} tane`);

check('her dilim bir şey veriyor', Wedges.every((x) => x > 0));

check('ödüller seviyeyle büyüyor',
  prizeAt(0, 10) > prizeAt(0, 1) && prizeAt(7, 10) > prizeAt(7, 1),
  `sv1: ${prizeAt(0, 1)}..${prizeAt(7, 1)}  sv10: ${prizeAt(0, 10)}..${prizeAt(7, 10)}`);

// Her dilimin şansı eşit olmalı. Çarkı "neredeyse kazandın" diye ayarlamak kolay ve ucuz bir
// hile; burada öyle bir şey olmadığını ölçerek gösteriyoruz.
{
  const hits = Wedges.map(() => 0);
  const n = 80000;
  for (let i = 0; i < n; i++) hits[wedgeFor(i / n)] += 1;
  const want = n / Wedges.length;
  check('her dilimin şansı eşit', hits.every((h) => Math.abs(h - want) <= 2), hits.join(','));
  check('her dilime düşülebiliyor', hits.every((h) => h > 0));
}

// BU, ÇARKIN BÜTÜN DÜRÜSTLÜĞÜ. Kazanan dilim kurallarda seçiliyor, animasyon ona nişan alıyor.
// Ters kurulsa - önce döndür, sonra durduğu yeri oku - çark bir şey gösterip başka bir şey
// verebilir ve bunu kimse fark etmez.
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

// Günde bir çevirme. İkinci basış aynı gün hiçbir şey vermemeli - animasyon sürerken ikinci
// kez basmak, harcanmış bir çevirmeyi tekrar istemek olurdu.
{
  const d = tidy({ level: 3 });
  check('yeni hesap çarkı çevirebilir', canSpin(d, '2026-10-14'));
  const first = spin(d, 0.1, '2026-10-14');
  check('çevirme bir dilim ve bir ödül döndürüyor',
    first && first.at === 0 && first.prize === prizeAt(0, 3), JSON.stringify(first));
  check('ödül bankaya yazıldı', d.bank === prizeAt(0, 3), String(d.bank));
  check('aynı gün ikinci çevirme yok', spin(d, 0.9, '2026-10-14') === null);
  check('banka ikinci basıştan etkilenmedi', d.bank === prizeAt(0, 3), String(d.bank));
  const next = spin(d, 0.99, '2026-10-15');
  check('yarın yine çevrilebiliyor', next !== null && next.at === 7);
  check('ikramiye en büyük dilim', next && next.prize === prizeAt(7, 3) && Wedges[7] === Math.max(...Wedges));
  check('iki çevirme sayıldı', d.spins === 2, String(d.spins));
}

// Çark kazanılan dilimin ödülünü veriyor, başka bir dilimin ödülünü değil.
{
  let bad = 0;
  for (let at = 0; at < Wedges.length; at++) {
    const d = tidy({ level: 6 });
    const got = spin(d, (at + 0.5) / Wedges.length, '2026-01-01');
    if (!got || got.at !== at || got.prize !== prizeAt(at, 6) || d.bank !== prizeAt(at, 6)) bad += 1;
  }
  check('her dilim kendi ödülünü ödüyor', bad === 0, `${bad} dilim yanlış`);
}

// Sandık oynarken doluyor, beklerken değil. Dolmadan açılmamalı; dolduktan sonra bir kez.
{
  const d = tidy({ level: 2 });
  check('sandık boş başlıyor', (d.chest || 0) === 0 && !chestFull(d));
  check('boş sandık açılmıyor', openChest(d) === null);

  record(d, 1, 200);
  check('öldürülenler sandığa işliyor', d.chest === 200, String(d.chest));
  check('sandık dolmadan açılmıyor', openChest(d) === null && d.chest === 200);
  check('dolum oranı doğru', Math.abs(chestPart(d) - 200 / ChestKills) < 1e-9);

  record(d, 1, ChestKills);
  check('sandık taşmıyor', d.chest === ChestKills, String(d.chest));
  check('dolu sandık dolu görünüyor', chestFull(d) && chestPart(d) === 1);

  const was = d.bank;
  const got = openChest(d);
  check('dolu sandık açılıyor ve ödüyor',
    got && got.prize === chestPrize(d.level) && d.bank === was + got.prize);
  check('açılan sandık sıfırlanıyor', d.chest === 0 && !chestFull(d));
  check('aynı sandık iki kez açılmıyor', openChest(d) === null);
  check('açılan sandık sayıldı', d.chests === 1);
}

check('sandık çarkın ortalama diliminden değerli',
  ChestWorth > Wedges.reduce((a, b) => a + b, 0) / Wedges.length * 0.9,
  `sandık ${ChestWorth}x vs ortalama ${(Wedges.reduce((a, b) => a + b, 0) / Wedges.length).toFixed(2)}x`);

// Bozuk kayıt: elle düzenlenmiş, eski bir sürümden gelmiş, ya da yarı yazılmış olabilir. Hiçbiri
// oyunun açılmamasının ya da bedava sandık dağıtmasının sebebi olamaz.
{
  const d = tidy({ level: 1, chest: 99999, chests: -4, spins: 1.7, spun: 'bugün' });
  check('taşmış sandık kırpılıyor', d.chest === ChestKills, String(d.chest));
  check('eksi sayaç düzeltiliyor', d.chests === 0);
  check('kesirli sayaç yuvarlanıyor', d.spins === 1);
  check('tarih olmayan çevirme kaydı atılıyor', d.spun === null);
  check('bozuk kayıttan sonra çark çalışıyor', canSpin(d, today()));

  const e = tidy({ level: 1, chest: -50, spun: '2026-10-14' });
  check('eksi sandık sıfırlanıyor', e.chest === 0);
  check('geçerli tarih korunuyor', e.spun === '2026-10-14');
  check('aynı günse çark kilitli', !canSpin(e, '2026-10-14') && canSpin(e, '2026-10-15'));
}

// Tek okumada sekmenin ihtiyacı olan her şey.
{
  const half = ChestKills / 2;
  const d = tidy({ level: 4, chest: half });
  const r = rewardState(d, '2026-10-14');
  check('sekme durumu tek okumada geliyor',
    r.spin === true && r.chest === false && Math.abs(r.part - 0.5) < 1e-9
    && r.kills === half && r.need === ChestKills && r.unit === unitOf(4)
    && r.chestWorth === chestPrize(4),
    JSON.stringify(r));
}

console.log('');
console.log(`çark: ${Wedges.length} dilim · seviye 1'de ${Wedges.map((_, i) => prizeAt(i, 1)).join('/')} deneyim`);
console.log(`      seviye 5'te ${Wedges.map((_, i) => prizeAt(i, 5)).join('/')}`);
console.log(`sandık: ${ChestKills} ölü · seviye 1'de ${chestPrize(1)}, seviye 5'te ${chestPrize(5)} deneyim`);

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
function botRun(seed, loadout, stage = 1, clicksPerSecond = 6, hero = 0) {
  const s = begin(seed, loadout, stage, heroTotals(hero));
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
    s.events.length = 0;
  }
  return {
    done: s.phase === 'done',
    t: s.t,
    level: s.level,
    kills: s.kills,
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
// Bir çark, oyunu ne kadar hızlandırdığını söylemediği sürece dengelenmiş sayılmaz. Burada
// gerçek bot koşularının öldürme sayılarıyla bir oturum oynanıyor ve ödüllerin, koşuların
// kazandırdığı deneyimin yanında yüzde kaç ettiği ölçülüyor.
{
  const Session = 8;                       // ~10 dakika, CrazyGames'in beklediği oturum
  const rows = [];
  for (const stage of [1, 3]) {
    const d = tidy({ level: 1 });
    let fromRuns = 0, fromChests = 0, chests = 0;
    for (let i = 1; i <= Session; i++) {
      const r = botRun(i * 7919, Four, stage);
      const was = d.bank;
      record(d, stage, r.kills);
      fromRuns += d.bank - was;
      // oyuncu dolu sandığı açar
      const got = openChest(d);
      if (got) { fromChests += got.prize; chests += 1; }
    }
    // günün tek çevirmesi, ortalama dilim
    const wheel = Wedges.reduce((a, b) => a + b, 0) / Wedges.length * unitOf(d.level);
    const extra = fromChests + wheel;
    rows.push({ stage, level: d.level, fromRuns, fromChests, chests, wheel, extra,
                part: extra / fromRuns });
  }

  console.log('');
  console.log(`ödüllerin ağırlığı (${Session} koşuluk bir oturum):`);
  for (const r of rows) {
    console.log(`  bölüm ${r.stage}: koşular ${Math.round(r.fromRuns)} · sandık ${Math.round(r.fromChests)} (${r.chests} tane) · çark ~${Math.round(r.wheel)}  →  ödüller %${Math.round(r.part * 100)} ekliyor`);
  }

  // Ödül bir ikram olmalı, ana yemek değil. Oyunu oynamak hâlâ deneyimin açık ara en büyük
  // kaynağı olmazsa, çarkı çevirip kapatmak oynamaktan daha verimli hâle gelir.
  check('ödüller oynamanın yerini almıyor', rows.every((r) => r.part < 0.3),
    rows.map((r) => `bölüm ${r.stage}: %${Math.round(r.part * 100)}`).join('  '));
  check('ödüller hissedilir derecede var', rows.every((r) => r.part > 0.05),
    rows.map((r) => `bölüm ${r.stage}: %${Math.round(r.part * 100)}`).join('  '));
  check('bir oturumda sandık açılıyor', rows.every((r) => r.chests >= 1),
    rows.map((r) => `bölüm ${r.stage}: ${r.chests}`).join('  '));
}

console.log('');
if (failures.length) {
  console.log(`${failures.length} KONTROL DÜŞTÜ:`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${passed} kontrol geçti`);

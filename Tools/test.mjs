// Kurallar + bir bot. Tarayıcı yok.
//
// Bu oyun birbiriyle etkileşen on büyü ve doksana yakın yükseltmeden ibaret; o yığının tutarlı
// olup olmadığı gözle görülmez. Burada bir koşu milisaniyelerde bitiyor, yüzlercesi birden.
//
//   node Tools/test.mjs

import {
  begin, step, click, take, offer, spawn, statsOf, carrying, carries,
  tierDue, evolutionsFor, boostsFor,
  Spells, Kinds, StageWaves, BoostsPerTier, MostPassive, MostEvos, LoadoutSize,
  spellKeys, passiveKeys, haste,
} from '../src/rules.js';
import { UnlockAt, unlocked, nextUnlock } from '../src/spells.js';
import { needFor, worth, record, toggle, tidy } from '../src/meta.js';

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
  const s = begin(1, ['bolt', 'fireball', 'frost']);
  check('loadout taşınıyor', carrying(s).join() === 'bolt,fireball,frost');
  check('loadout dışındaki büyü taşınmıyor', !carries(s, 'meteor'));
}

{
  const s = begin(1, [...all]);
  check('loadout beşten fazla olamıyor', carrying(s).length === LoadoutSize, `${carrying(s).length}`);
}

{
  const s = begin(1, ['yok-boyle-bir-sey']);
  check('olmayan büyü loadouta girmiyor, oyun da boş kalmıyor', carrying(s).length === 1 && carries(s, 'bolt'));
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
  // Bekleme süresi sıfıra inemez: dört Quicker ve Haste birlikte sonsuz atış demek olurdu
  const s = begin(3, ['bolt']);
  s.kit.bolt.boosts.quicker = 20;
  s.passives.haste = MostPassive;
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
  const open = evolutionsFor(s, 'bolt');
  check('elektrik taşımıyorken fırtına dönüşümü yok',
    !open.some((e) => e.needs === 'lightning'),
    open.filter((e) => e.needs).map((e) => e.name + '<-' + e.needs).join(', '));
  check('ateş topu taşırken yangın dönüşümü var', open.some((e) => e.needs === 'fireball'));
}

{
  const s = begin(8, ['bolt', 'lightning']);
  check('elektrik taşırken fırtına dönüşümü var',
    evolutionsFor(s, 'bolt').some((e) => e.needs === 'lightning'));
  check('ateş topu taşımıyorken yangın dönüşümü yok',
    !evolutionsFor(s, 'bolt').some((e) => e.needs === 'fireball'));
}

{
  // Ve bunu rastgele yüzlerce seçimde doğrula: kilitli bir dönüşüm tek bir kere bile sızmamalı.
  let leaks = 0, cards = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const s = begin(seed * 131, ['bolt', 'shards', 'wisp']);
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
  const s = begin(9, ['bolt', 'fireball', 'frost', 'lightning', 'blade']);
  const combos = carrying(s).flatMap((k) => evolutionsFor(s, k).filter((e) => e.needs));
  check('dolu bir loadout kombo dönüşümleri açıyor', combos.length >= 8, `${combos.length} tane`);
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
  s.wall = 100;
  s.boss.hp = 0;
  step(s, 1 / 60);
  check('patron ölünce bölüm geçiliyor', s.stage === 2 && s.boss === null);
  check('bölüm geçince duvar onarılıyor', s.wall > 100);
  check('bölüm geçince bedava kart geliyor', s.phase === 'picking' && s.cleared === true);
  take(s, 0);
  check('bedava karttan sonra bayrak iniyor', s.cleared === false && s.phase === 'playing');
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

// --- hesap: ana seviye ve kilitler --------------------------------------------------------------

check('ilk büyü baştan açık', UnlockAt.bolt === 1);
check('her büyünün bir açılma seviyesi var', all.every((k) => UnlockAt[k] >= 1));
check('ana seviye maliyeti hep artıyor', [1, 2, 3, 5, 9, 14].every((n) => needFor(n + 1) > needFor(n)));
check('1. seviyede sadece bir büyü açık', unlocked(1).length === 1, unlocked(1).join(','));
check('16. seviyede hepsi açık', unlocked(16).length === all.length);
check('sıradaki kilit söylenebiliyor', !!nextUnlock(1) && nextUnlock(1).at === 2);
check('son seviyede sıradaki kilit yok', nextUnlock(99) === null);

{
  const d = tidy({ level: 1, xp: 0, loadout: ['meteor', 'nova'] });
  check('açılmamış büyü loadouttan atılıyor', d.loadout.join() === 'bolt', d.loadout.join());
}

{
  const d = tidy({ level: 16, xp: 0, loadout: ['bolt', 'bolt', 'bolt', 'nova', 'frost', 'meteor', 'laser'] });
  check('loadout tekrarsız ve beşle sınırlı',
    d.loadout.length === LoadoutSize && new Set(d.loadout).size === LoadoutSize, d.loadout.join());
}

{
  const e = tidy({ level: 16, xp: 0, loadout: ['bolt'] });
  check('son büyü loadouttan çıkarılamıyor', toggle(e, 'bolt') === false && e.loadout.length === 1);
  const f = tidy({ level: 16, xp: 0, loadout: ['bolt', 'frost', 'nova', 'laser', 'meteor'] });
  check('dolu loadouta altıncı eklenemiyor', toggle(f, 'shards') === false);
  const g = tidy({ level: 1, xp: 0, loadout: ['bolt'] });
  check('açılmamış büyü loadouta eklenemiyor', toggle(g, 'meteor') === false);
  const h = tidy({ level: 16, xp: 0, loadout: ['bolt', 'frost'] });
  check('loadouttan çıkarma çalışıyor', toggle(h, 'frost') === true && h.loadout.join() === 'bolt');
}

{
  const d = tidy({ level: 1, xp: 0, loadout: ['bolt'], best: 0 });
  const r = record(d, 3, 500);
  check('koşu deneyim kazandırıyor', r.earned === worth(3, 500) && r.earned > 500);
  check('hesap seviye atlıyor', r.levelled && d.level > 1);
  check('açılan büyü boş loadouta kendi giriyor', d.loadout.length > 1, d.loadout.join());
  check('en iyi bölüm kaydediliyor', d.best === 3);
}

// --- the bot ---------------------------------------------------------------------------------

/** Makul bir oyuncu: saniyede altı tıklar ve seçimde dönüşümü, yoksa ilk kartı alır. */
function botRun(seed, loadout, clicksPerSecond = 6) {
  const s = begin(seed, loadout);
  const dt = 1 / 60;
  let since = 0;
  let guard = 0;
  while ((s.phase === 'playing' || s.phase === 'picking') && guard++ < 60 * 420) {
    if (s.phase === 'picking') {
      // Kartları puanlar. İlk iki halinde de ölçüm aletiydi sorun, oyun değil:
      //   - önce hep ilk kartı alıyordu, hiçbir büyü beş yükseltmeye ulaşmıyordu;
      //   - sonra "en çok yatırdığım büyüyü büyüt" dedim ve PASİFLERİ HİÇ ALMADI. Tek büyülü
      //     havuz beş girişlik olduğu için pasifler oraya kendiliğinden düşüp maxlanıyordu,
      //     beş büyülü havuzda ise hiç seçilmiyordu - "tek büyü beşten iyi" sonucunu veren şey
      //     buydu, 200 saniyede beş büyülü bot sadece haste 1 almıştı.
      let best = 0, bestScore = -1e9;
      s.choices.forEach((c, j) => {
        let score;
        if (c.what === 'evolution') score = 100;
        else if (c.what === 'passive') score = 30 - (s.passives[c.key] || 0) * 9;
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
  const evos = carrying(s).reduce((a, k) => a + s.kit[k].evos.length, 0);
  return { t: s.t, stage: s.stage, level: s.level, kills: s.kills, evos };
}

const Five = ['bolt', 'fireball', 'frost', 'lightning', 'blade'];
const runs = [];
for (let i = 1; i <= 60; i++) runs.push(botRun(i * 7919, Five));
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const lived = runs.map((r) => r.t).sort((a, b) => a - b);
const stages = runs.map((r) => r.stage).sort((a, b) => a - b);
const levels = runs.map((r) => r.level).sort((a, b) => a - b);
const evos = runs.map((r) => r.evos).sort((a, b) => a - b);
const reached = (n) => runs.filter((r) => r.stage > n).length / runs.length;

console.log('');
console.log(`beş büyüyle (${Five.join(', ')}), saniyede 6 tıklayan oyuncu, 60 koşu:`);
console.log(`  dayanma   en kısa ${fmt(lived[0])}   ortanca ${fmt(lived[30])}   en uzun ${fmt(lived[59])}`);
console.log(`  bölüm     ortanca ${stages[30]}   en yüksek ${stages[59]}`);
console.log(`  seviye    ortanca ${levels[30]}   dönüşüm ortanca ${evos[30]}, en çok ${evos[59]}`);
console.log(`  1. bölümü geçen %${(reached(1) * 100).toFixed(0)}   2'yi %${(reached(2) * 100).toFixed(0)}   3'ü %${(reached(3) * 100).toFixed(0)}`);

const solo = [];
for (let i = 1; i <= 40; i++) solo.push(botRun(i * 104729, ['bolt']).t);
solo.sort((a, b) => a - b);
console.log(`  tek büyüyle (sadece Magic Bolt): ortanca ${fmt(solo[20])}`);

const lazy = [];
for (let i = 1; i <= 40; i++) lazy.push(botRun(i * 104729, Five, 1).t);
lazy.sort((a, b) => a - b);
console.log(`  neredeyse hiç tıklamayan (1/sn): ortanca ${fmt(lazy[20])}`);

check('ilk bölümü çoğu oyuncu geçiyor', reached(1) > 0.6, `%${(reached(1) * 100).toFixed(0)}`);
// Bir koşu kendiliğinden bitmeli. Botun sınırına dayanması "ölmedi" demek değil, "ne kadar
// yaşadığını ölçemedik" demek - ve ölçemediğim bir sayıyla denge ayarlanmaz.
check('koşu botun sınırına dayanmıyor', lived[30] < 410, `ortanca ${fmt(lived[30])}`);
check('koşu bir yerde bitiyor', stages[59] < 25, `en yüksek bölüm ${stages[59]}`);
check('bölümler zorlaşıyor', reached(3) < reached(1) * 0.95);
check('oyuncu bir sürü seçim yapıyor', levels[30] >= 12, `ortanca seviye ${levels[30]}`);
check('bir koşuda birkaç dönüşüm alınıyor', evos[30] >= 2, `ortanca ${evos[30]}`);
check('beş büyü tek büyüden iyi', lived[30] > solo[20] * 1.15, `${fmt(lived[30])} vs ${fmt(solo[20])}`);
check('tıklamak işe yarıyor', lived[30] > lazy[20] * 1.08, `${fmt(lived[30])} vs ${fmt(lazy[20])}`);

console.log('');
if (failures.length) {
  console.log(`${failures.length} KONTROL DÜŞTÜ:`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${passed} kontrol geçti`);

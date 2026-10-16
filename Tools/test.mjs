// Kurallar + bir bot. Tarayıcı yok.
//
// Bu oyun birbiriyle etkileşen on büyü ve doksana yakın yükseltmeden ibaret; o yığının tutarlı
// olup olmadığı gözle görülmez. Burada bir koşu milisaniyelerde bitiyor, yüzlercesi birden.
//
//   node Tools/test.mjs

import {
  begin, step, click, take, offer, spawn, statsOf, carrying, carries,
  tierDue, evolutionsFor, boostsFor, Bosses, bossFor, HeraldCalls, ShadeKeeps, fusionsFor, FuseAt, RampOver,
  Spells, Passives, Kinds, StageWaves, BoostsPerTier, MostPassive, MostEvos, LoadoutSize,
  spellKeys, passiveKeys, haste, describe, advance, waiting, Always, pressure, Reach,
} from '../src/rules.js';
import { UnlockAt, unlocked, nextUnlock, LoadoutSize as Carry, CarrySize, Fusions, fusionKeys, fusionOf, anySpell } from '../src/spells.js';
import { say, setLanguage, language, Languages, UI } from '../src/text.js';
import { speedsFor, speedAllowed, needFor, worth, goldFor, shardsFor, record, finish, doubleUp, toggle, tidy, Speeds, starsFor, nextStarAt, stageOpen, furthestStage, starsAt, heroBonus, heroNext, buyHero, spin, openChest, buySpell, spellStep, levelOf, shardsOf, spellLevels, timesDone, mark, dailyJobs, claimDaily, runJobs, week, claimWeek, feats, claimFeat, lifetime, adsLeft, useAd } from '../src/meta.js';
import {
  Wedges, amountAt, kindAt, Jackpot, wedgeFor, spellFor, unitOf, goldUnitOf, ShardUnit,
  Chests, ChestKinds, chestPrize, costOf, canOpen, Bulk, gemsHeld,
  gemsFor, gemDecay, gemsOn, repeatLift, RepeatFloor,
  today, canSpin, state as rewardState,
} from '../src/rewards.js';
import { restFor, wedgeUnder } from '../src/menu.js';
import {
  sceneryFor, runBtns, runPanel, runRows, PauseRows, endBtns, endKeys,
  hitRun, hitRunPanel, hitEnd, speedBox,
} from '../src/draw.js';
import { topBand, menuHit } from '../src/menu.js';
import { Scale, Bar, Root, hzOf, beatOf, beatAt, walkFrom, nextDegree } from '../src/music.js';
import {
  Daily, Runly, DailyCount, RunCount, dailyKeys, runKeys, dailyOf, runOf, pays as jobPays,
  Feats, featOf, Week, weekAt, weekDue, nextDay,
} from '../src/missions.js';
import {
  Allow as AdAllow, Kinds as AdKinds, ready as adsReady,
  open as portalOpen, playing as portalPlaying, cheer as portalCheer,
  progress as portalProgress, watchSettings, mutedByPortal, show as adShow, ready,
} from '../src/ads.js';
import { News } from '../src/news.js';
import {
  Store as EStore, PerRun as EPerRun, Clean as EClean, PerMinute as EPerMinute, Tick as ETick,
  energyNow, setEnergy, spendEnergy, giveEnergy, canRun, untilNext, untilRun, clockOf,
} from '../src/energy.js';
import { kindsOn, stageOf, Stages, Looks } from '../src/stages.js';
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
  check('loadout beşten fazla olamıyor', s.loadout.length === LoadoutSize, `${s.loadout.length}`);
  check('loadout beş kişilik', LoadoutSize === 5, `${LoadoutSize}`);
  check('sahada dördü birden taşınabiliyor', CarrySize === 4, `${CarrySize}`);
  // ARADAKI FARK BU OZELLIGIN TAMAMI. Esit olsalardi ilk dakikada hepsi alinir, geri kalan butun
  // kartlar elindeki bir buyunun yukseltmesi olurdu ve kosu besledigin tek buyuye daralirdi.
  check('getirilen, sahaya sığandan fazla', LoadoutSize > CarrySize);
}

// --- beş getir, dördünü oyna ----------------------------------------------------------------------

{
  const five = ['bolt', 'fireball', 'frost', 'lightning', 'shards'];
  const s = begin(7, five, 1);
  check('beşi de koşuya giriyor', s.loadout.length === 5, s.loadout.join(','));
  check('açılışta sadece sabit büyü ateşliyor', carrying(s).length === 1);
  check('başta dördü de çıkabilir', waiting(s).length === 4, waiting(s).join(','));

  // Uc tane daha al: artik dort tane tasiyoruz, ve BESINCISI BIR DAHA TEKLIF EDILMIYOR.
  for (const k of ['fireball', 'frost', 'lightning']) {
    s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };
    s.cools[k] = 0;
  }
  check('dört taşınınca slot doldu', carrying(s).length === CarrySize);
  check('beşinci büyü artık kartlarda yok', waiting(s).length === 0,
    'çantada kalan, bu koşuda kalır');
  check('ama hâlâ loadoutta', s.loadout.includes('shards'));

  // Kart havuzunda da yok: `offer` `waiting`den besleniyor, iki yerde ayri karar verilmiyor.
  s.phase = 'picking';
  const out = offer(s);
  check('kart havuzunda da beşinci büyü yok',
    !out.some((c) => c.what === 'spell' && c.key === 'shards'),
    out.map((c) => c.what + ':' + (c.key || '')).join(' '));
  check('yine de kart çıkıyor', out.length > 0, 'slot dolu diye koşu kartsız kalmaz');
}

// Hangi dordu oldugun kosudan kosuya degisir - ozelligin sebebi bu.
{
  const five = ['bolt', 'fireball', 'frost', 'lightning', 'shards'];
  const seen = new Set();
  for (let i = 1; i <= 40; i++) {
    const s = begin(i * 7919, five, 3);
    // kagit uzerinde: her kosuda dort farkli ucluden biri cikabilir
    const bag = waiting(s);
    seen.add(bag.slice().sort().join(','));
  }
  check('çantadaki dörtlü her koşuda aynı', seen.size === 1,
    'hangi üçünün alındığı kartlara bağlı, çantanın kendisi değil');
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

// --- görevler -------------------------------------------------------------------------------------

check('günde üç görev', DailyCount === 3 && dailyKeys('2026-10-14').length === 3);
check('koşuda üç görev', RunCount === 3 && runKeys(1, 0).length === 3);
check('her görevin adı iki dilde var',
  [...Daily, ...Runly].every((j) => j.name && j.name[0] && j.name[1]));
check('hiçbir görev kendini tekrar etmiyor',
  new Set(dailyKeys('2026-10-14')).size === 3 && new Set(runKeys(1, 0)).size === 3);

// BU KURAL EKONOMININ TEMELI. Gem'i sadece bir bolumu ILK kez gecmek uretiyor. Kosu gorevleri
// her kosuda yenileniyor, yani gem verseydi ayni bolumu tekrar tekrar gecerek sonsuz gem
// uretilebilirdi - ve gem'in tek ozelligi tam olarak bunun yapilamamasi.
check('koşu görevleri gem vermiyor', Runly.every((j) => !j.gems),
  Runly.filter((j) => j.gems).map((j) => j.key).join(', '));
check('günlük görevler gem veriyor', Daily.every((j) => j.gems > 0));

// Ayni gun ayni uc gorev; ertesi gun baska. Gun icinde degisseydi bir gorev bitirmek, yerine
// baskasinin gelmesi demek olurdu.
check('gün içinde görevler sabit',
  dailyKeys('2026-10-14').join() === dailyKeys('2026-10-14').join());
{
  const days = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'];
  const sets = days.map((d) => dailyKeys(d).join());
  check('günden güne değişiyor', new Set(sets).size >= 4, sets.join(' | '));
}
check('koşudan koşuya değişiyor',
  runKeys(1, 0).join() !== runKeys(1, 1).join(),
  `${runKeys(1, 0).join()} vs ${runKeys(1, 1).join()}`);

// Sayac: gun donunce hem ilerleme hem alinanlar sifirlaniyor.
{
  const d = tidy({ level: 5, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  mark(d, 'kills', 120, '2026-10-14');
  mark(d, 'clears', 1, '2026-10-14');
  check('sayaç biriktiriyor', d.tally.kills === 120 && d.tally.clears === 1);
  mark(d, 'kills', 80, '2026-10-14');
  check('aynı gün üstüne ekliyor', d.tally.kills === 200);
  mark(d, 'kills', 10, '2026-10-15');
  check('gün dönünce sayaç sıfırdan başlıyor', d.tally.kills === 10 && d.tally.clears === 0,
    JSON.stringify(d.tally));

  // yildiz ve derinlik toplam degil, en iyi
  mark(d, 'stars', 3, '2026-10-15');
  mark(d, 'stars', 1, '2026-10-15');
  check('yıldız toplanmıyor, en iyisi tutuluyor', d.tally.stars === 3, String(d.tally.stars));
  mark(d, 'deepest', 5, '2026-10-15');
  mark(d, 'deepest', 2, '2026-10-15');
  check('en derin bölüm geriye gitmiyor', d.tally.deepest === 5);
}

// Alma: bir kez, ve ancak bittiyse.
{
  const day = '2026-10-14';
  const d = tidy({ level: 6, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  const first = dailyJobs(d, day)[0];
  check('biten görev yoksa alınamıyor', !first.done && claimDaily(d, first.key, day) === null);

  mark(d, first.job.of, first.job.need, day);
  const ready = dailyJobs(d, day)[0];
  check('koşullar sağlanınca bitiyor', ready.done && !ready.paid,
    `${ready.at}/${ready.need}`);

  const wasGems = d.gems, wasGold = d.gold;
  const got = claimDaily(d, first.key, day);
  check('alınca gem ve altın ödüyor',
    got && got.gems > 0 && d.gems === wasGems + got.gems && d.gold === wasGold + got.gold,
    JSON.stringify(got));
  check('ikinci kez alınamıyor', claimDaily(d, first.key, day) === null);
  check('alındı olarak işaretleniyor', dailyJobs(d, day)[0].paid === true);
  check('olmayan görev alınamıyor', claimDaily(d, 'tarla', day) === null);

  // gun donunce yeniden alinabilir hale geliyor
  mark(d, 'kills', 1, '2026-10-15');
  check('ertesi gün alınanlar sıfırlanıyor', (d.paid || []).length === 0);
}

// Ilerleme kendi tavanini asmiyor - cubugun ucundan tasan bir sayi, bitmis bir gorevin
// bitmedigini soyler.
{
  const d = tidy({ level: 3 });
  const day = '2026-10-14';
  const job = dailyJobs(d, day)[0];
  mark(d, job.job.of, job.job.need * 5, day);
  const after = dailyJobs(d, day)[0];
  check('ilerleme tavanda duruyor', after.at === after.need, `${after.at}/${after.need}`);
}

// Kosu gorevleri: kosunun kendi sayilarindan puanlaniyor ve kendiliginden odeniyor.
{
  const d = tidy({ level: 6, loadout: ['bolt', 'fireball', 'frost', 'lightning'] });
  const asked = runJobs(d, 3).map((j) => j.key);
  check('harita ile koşu aynı üçü soruyor',
    asked.join() === runKeys(3, d.runs || 0).join(), asked.join());

  const wasGold = d.gold;
  const r = finish(d, 3, 100, 100, 400, { bolt: 8, fireball: 4, frost: 3, lightning: 2 },
    { level: 24, evos: 3 });
  check('koşu görevleri puanlandı', r.jobs && r.jobs.length === RunCount);
  check('her biri bittiyse işaretli',
    r.jobs.every((j) => typeof j.done === 'boolean'));
  check('biten görevler altın ödedi', r.runGold > 0 && r.jobs.some((j) => j.done),
    `${r.runGold} altın`);
  check('ödenen altın bankaya yazıldı', d.gold >= wasGold + r.runGold);
  check('koşu görevleri hiç gem ödemiyor',
    r.jobs.every((j) => !j.pays.gems), 'gem farmlanabilir hâle gelirdi');

  // bos bir kosu hicbir gorevi bitirmemeli
  const e = tidy({ level: 6, loadout: ['bolt'] });
  const weak = finish(e, 1, 1, 100, 0, { bolt: 0 }, { level: 1, evos: 0 });
  check('hiçbir şey yapılmayan koşu her görevi bitirmiyor',
    weak.jobs.some((j) => !j.done), JSON.stringify(weak.jobs.map((j) => j.done)));
}

// --- koşu ekranının arayüzü -----------------------------------------------------------------------

// Her sey gercek olculerle: bir telefon dik, bir masaustu yatay, bir de en yuksek piksel orani -
// kutularin birbirine girdigi yer hep uclardan biri oldu.
const screens = [[390, 844, 1], [390, 844, 2.4], [1280, 720, 1], [1280, 720, 2]];
const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const mid = (b) => [b.x + b.w / 2, b.y + b.h / 2];

check('iki köşe butonu hız düğmelerine değmiyor', screens.every(([w, h, r]) => {
  const btn = runBtns(w, h, r);
  const sp = speedBox(w, h, r);
  return !over(btn.menu, sp) && !over(btn.cards, sp) && !over(btn.menu, btn.cards);
}), 'üst sağda üç şey var ve üçü de basılabilir olmak zorunda');

check('iki köşe butonu da ekranın içinde', screens.every(([w, h, r]) => {
  const btn = runBtns(w, h, r);
  return Object.values(btn).every((b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h);
}));

check('parmak büyüklüğünde', screens.every(([w, h, r]) =>
  Object.values(runBtns(w, h, r)).every((b) => b.w >= 34 && b.h >= 34)),
  'otuz dört piksel altı buton, basılmak isteyen bir buton değil');

check('her köşe butonu kendi adını veriyor', screens.every(([w, h, r]) => {
  const btn = runBtns(w, h, r);
  return Object.entries(btn).every(([what, b]) => hitRun(w, h, ...mid(b), r) === what);
}));

check('butonların dışına basmak hiçbir şey açmıyor',
  screens.every(([w, h, r]) => hitRun(w, h, w / 2, h / 2, r) === null));

// --- duraklatma paneli
check('duraklatma panelinde beş satır var', runRows({}, 'menu') === PauseRows.length
  && PauseRows.join() === 'resume,sound,music,lang,leave');

check('panel her ekrana sığıyor', screens.every(([w, h, r]) =>
  [1, 5, 7].every((rows) => {
    const q = runPanel(w, h, r, rows);
    return q.box.x >= 0 && q.box.y >= 0
      && q.box.x + q.box.w <= w && q.box.y + q.box.h <= h
      && q.row(rows - 1).y + q.row(rows - 1).h <= q.box.y + q.box.h;
  })), 'uzun bir kart listesi yüksek piksel oranında ekranın altından taşıyordu');

check('panelin satırları üst üste gelmiyor', screens.every(([w, h, r]) => {
  const q = runPanel(w, h, r, 7);
  for (let i = 1; i < 7; i++) if (over(q.row(i - 1), q.row(i))) return false;
  return true;
}));

check('duraklatma panelinin her satırı basılabilir', screens.every(([w, h, r]) =>
  PauseRows.every((what, i) => {
    const q = runPanel(w, h, r, PauseRows.length);
    return hitRunPanel(w, h, ...mid(q.row(i)), r, 'menu', {}) === what;
  })), 'çizilen ama basılamayan satır, olmayan satırdır');

check('çarpı paneli kapatıyor', screens.every(([w, h, r]) =>
  hitRunPanel(w, h, ...mid(runPanel(w, h, r, 5).close), r, 'menu', {}) === 'close'));

check('panelin dışına basmak da kapatıyor',
  screens.every(([w, h, r]) => hitRunPanel(w, h, 4, h - 4, r, 'menu', {}) === 'close'));

// Kart listesinin satirlari okunmak icin, basilmak icin degil: uzerine basmak hicbir sey yapmaz,
// yoksa listeyi okurken parmagin kaydigi yer paneli kapatirdi.
check('kart listesinde satıra basmak paneli kapatmıyor', screens.every(([w, h, r]) => {
  const st = { loadout: ['bolt'], passives: {}, kit: { bolt: {} }, sealed: [], fused: [] };
  const q = runPanel(w, h, r, runRows(st, 'cards'));
  return hitRunPanel(w, h, ...mid(q.row(0)), r, 'cards', st) === null;
}));

{
  const s = begin(3, ['bolt', 'fireball', 'frost'], 1);
  check('kart listesi taşınan büyü kadar satır istiyor',
    runRows(s, 'cards') === carrying(s).length, `${runRows(s, 'cards')} / ${carrying(s).length}`);
  s.passives.mend = 2;
  check('takviyeler bir satır daha açıyor', runRows(s, 'cards') === carrying(s).length + 1);
}

// --- koşunun sonundaki butonlar
{
  const lost = { phase: 'lost', stage: 4 };
  check('kaybedince iki buton var: yeniden ve menü',
    endKeys(lost, {}).join() === 'again,menu');

  // Kazanilan bolumu tekrar oynamak ile siradakine girmek ayri seyler. Menu zaten ilerlediyse
  // buton SONRAKI BOLUM der; ilerlemediyse - eski bir bolum tekrar gecildiyse - YENIDEN OYNA.
  const won = { phase: 'done', stage: 4 };
  check('menü ilerlediyse sonraki bölüm deniyor',
    endKeys(won, { nextStage: 5, won: {} }).join() === 'next,menu');
  check('ilerlemediyse yeniden oyna deniyor',
    endKeys(won, { nextStage: 4, won: {} }).join() === 'again,menu');
  check('reklam hakkı varsa 2x butonu başta',
    endKeys(won, { nextStage: 5, won: {}, adsDouble: 3 }).join() === 'double,next,menu');
  check('bir kez ikiye katlandıysa buton gidiyor',
    endKeys(won, { nextStage: 5, won: {}, adsDouble: 3, doubled: { gold: 1 } }).join() === 'next,menu');
  check('kaybedince 2x teklif edilmiyor',
    endKeys(lost, { adsDouble: 3, won: {} }).join() === 'again,menu',
    'ikiye katlanacak bir ödül yok');

  check('bitiş butonları ekranın içinde ve üst üste değil', screens.every(([w, h, r]) =>
    [['again', 'menu'], ['double', 'next', 'menu']].every((keys) => {
      const btns = endBtns(w, h, r, keys);
      const list = keys.map((k) => btns[k]);
      if (!list.every((b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h)) return false;
      for (let i = 1; i < list.length; i++) if (over(list[i - 1], list[i])) return false;
      return true;
    })));

  check('her bitiş butonu kendi adını veriyor', screens.every(([w, h, r]) => {
    const sh = { nextStage: 5, won: {}, adsDouble: 3 };
    const keys = endKeys(won, sh);
    const btns = endBtns(w, h, r, keys);
    return keys.every((k) => hitEnd(w, h, ...mid(btns[k]), r, won, sh) === k);
  }));

  check('bitiş ekranının boşluğuna basmak hiçbir şey yapmıyor',
    screens.every(([w, h, r]) => hitEnd(w, h, w / 2, 30 * r, r, won, { nextStage: 5, won: {} }) === null),
    'eskiden her yere basmak kaybettiğin bölüme geri sokuyordu');
}

// --- reklamın ikiye katladığı ödül
{
  const d = tidy({ level: 6, loadout: ['bolt', 'fireball'] });
  const won = finish(d, 2, 300, 300, 260, { bolt: 4, fireball: 2 });
  const gold = d.gold, gems = d.gems, bank = d.bank || 0;
  const held = { ...d.shards };

  const again = doubleUp(d, won);
  check('reklam ödülün aynısını bir kez daha ödüyor',
    d.gold === gold + (won.gold || 0) && d.gems === gems + (won.gems || 0)
    && (d.bank || 0) === bank + won.earned,
    `altın ${gold}->${d.gold}, gem ${gems}->${d.gems}`);
  check('parçalar da büyü büyü ikiye katlanıyor',
    Object.entries(won.shards).every(([k, n]) => d.shards[k] === (held[k] || 0) + n),
    'parçayı atlayan bir 2x, beslediğin büyüyü atlıyor demektir');
  check('ne ödediğini söylüyor',
    again && again.gold === won.gold && again.earned === won.earned);

  check('ikinci basış hiçbir şey ödemiyor', (() => {
    const was = d.gold;
    const twice = doubleUp(d, won);
    return twice === null && d.gold === was;
  })(), 'bir reklam bir ödül');
  check('bitiş ekranı artık 2x göstermiyor',
    endKeys({ phase: 'done', stage: 2 }, { won, adsDouble: 3, nextStage: 3, doubled: again })
      .includes('double') === false);
}

// Gemler ikiye katlanabilir ve bu farmlamaya kapi acmaz: gem ILK geciste dusuyor, yani bu ancak
// bir bolumun hayatinda bir kez odedigi seyi ikiye katlayabilir. Olculdu, tahmin edilmedi:
{
  const d = tidy({ level: 6, loadout: ['bolt'] });
  const first = finish(d, 3, 300, 300, 300, { bolt: 3 });
  doubleUp(d, first);
  const after = d.gems;
  for (let i = 0; i < 30; i++) {
    const w = finish(d, 3, 300, 300, 300, { bolt: 3 });
    doubleUp(d, w);
  }
  check('reklamla bile aynı bölüm gem madeni olmuyor', d.gems - after < first.gems * 2,
    `ilk geçiş ${first.gems}x2, sonraki otuz geçiş toplam ${d.gems - after}`);
}

// --- birleşmeler ----------------------------------------------------------------------------------

check('dört birleşme var', fusionKeys.length === 4, fusionKeys.join(', '));
check('her birleşmenin iki ebeveyni var',
  fusionKeys.every((k) => Fusions[k].of.length === 2 && Fusions[k].of.every((p) => all.includes(p))),
  fusionKeys.filter((k) => !Fusions[k].of.every((p) => all.includes(p))).join(','));
check('her birleşmenin adı, açıklaması, elementi var',
  fusionKeys.every((k) => Fusions[k].name && Fusions[k].name[1] && Fusions[k].tells && Fusions[k].element));
check('her birleşmenin kendi yükseltmeleri ve dönüşümleri var',
  fusionKeys.every((k) => Fusions[k].boosts.length >= 3 && Fusions[k].evolutions.length >= 2));
check('eşleştirme iki yönlü de çalışıyor',
  fusionKeys.every((k) => fusionOf(Fusions[k].of[0], Fusions[k].of[1]) === k
    && fusionOf(Fusions[k].of[1], Fusions[k].of[0]) === k));
check('hiçbir büyü iki birleşmeye birden girmiyor', (() => {
  const seen = new Set();
  for (const k of fusionKeys) for (const p of Fusions[k].of) { if (seen.has(p)) return false; seen.add(p); }
  return true;
})(), 'aynı büyü iki yerde olursa biri alınınca öteki ölü kalır');

// BIRLESMELER `Spells`'IN DISINDA. Icine konsaydi loadout ekrani, kulliyat, kilit seviyeleri,
// kalici buyu seviyeleri ve parcalar - hicbiriyle ilgisi olmayan bes sistem - dort satir buyurdu.
check('birleşmeler getirilebilir büyü sayılmıyor',
  fusionKeys.every((k) => !all.includes(k)) && all.length === 10, String(all.length));
check('ama koşu içinde her büyü gibi okunuyor',
  fusionKeys.every((k) => anySpell(k) === Fusions[k]) && anySpell('bolt') === Spells.bolt);

// Hak edilmeden cikmiyor: iki ebeveyn de tasinacak VE ikisi de kademe atlamis olacak.
{
  const s = begin(5, ['bolt', 'fireball', 'frost', 'lightning'], 1);
  check('başlangıçta hiçbir birleşme yok', fusionsFor(s).length === 0);

  for (const k of ['fireball', 'lightning']) s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 };
  check('sadece taşımak yetmiyor', fusionsFor(s).length === 0, fusionsFor(s).join(','));

  s.kit.fireball.taken = FuseAt - 1;
  check('eşiğin bir altında çıkmıyor', fusionsFor(s).length === 0);

  s.kit.lightning.taken = 1;
  check('ikisine konan toplam yatırım eşiği geçince çıkıyor',
    fusionsFor(s).join() === 'tempest', fusionsFor(s).join());
}

// Alinca: sahada bir buyu daha, ama iki ebeveyn bir daha beslenemez. Tek birakilan slot degil,
// yatirim yapilacak yer.
{
  const s = begin(5, ['bolt', 'fireball', 'frost', 'lightning'], 1);
  for (const k of ['fireball', 'lightning']) {
    s.kit[k] = { tier: 2, boosts: {}, evos: ['burst'], taken: FuseAt };
    s.cools[k] = 0;
  }
  const before = carrying(s).length;
  const fireWas = Math.round(statsOf(s, 'fireball').damage);

  s.phase = 'picking';
  s.choices = [{ what: 'fusion', key: 'tempest' }];
  take(s, 0);

  check('sahada bir büyü daha var', carrying(s).length === before + 1,
    `${before} -> ${carrying(s).length}`);
  check('yeni büyü ateşliyor', !!s.kit.tempest && statsOf(s, 'tempest').damage > 0);
  check('iki ebeveyn de mühürlendi',
    s.sealed.includes('fireball') && s.sealed.includes('lightning'), s.sealed.join(','));
  check('mühürlü büyü hâlâ ateşliyor',
    Math.round(statsOf(s, 'fireball').damage) === fireWas, 'mühür susturmak değil');
  check('mühürlü büyüye yükseltme çıkmıyor',
    boostsFor(s, 'fireball').length === 0 && evolutionsFor(s, 'fireball').length === 0);
  check('mühürlenmemiş büyü etkilenmedi', boostsFor(s, 'bolt').length > 0);
  check('aynı birleşme ikinci kez çıkmıyor', fusionsFor(s).length === 0);
  check('kart ne verdiğini VE ne harcadığını söylüyor', (() => {
    const d = describe(s, { what: 'fusion', key: 'tempest' });
    return d && d.title && d.text && d.spends && d.badge;
  })(), 'sadece verdiğini söyleyen kart, seçimi hediye diye satar');
}

// Hak edilmis bir birlesme kurayla degil garantiyle gelir - kademe karti gibi.
{
  const s = begin(9, ['bolt', 'fireball', 'frost', 'lightning'], 1);
  for (const k of ['fireball', 'lightning']) s.kit[k] = { tier: 2, boosts: {}, evos: [], taken: FuseAt };
  const out = offer(s);
  check('hak edilen birleşme kartlarda görünüyor',
    out.some((c) => c.what === 'fusion' && c.key === 'tempest'),
    out.map((c) => c.what).join(','));
}

// --- yedi günlük seri -----------------------------------------------------------------------------

check('hafta yedi gün', Week === 7);
check('ardışık günler tanınıyor',
  nextDay('2026-10-14', '2026-10-15') && !nextDay('2026-10-14', '2026-10-16'));
check('ay sonu da ardışık', nextDay('2026-10-31', '2026-11-01'));
check('yıl sonu da ardışık', nextDay('2026-12-31', '2027-01-01'));
check('geriye giden gün ardışık değil', !nextDay('2026-10-15', '2026-10-14'));

{
  const d = tidy({ level: 6, loadout: ['bolt'] });
  const days = ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'];
  days.forEach((day) => mark(d, 'clears', 1, day));
  check('seri gün gün artıyor', week(d).run === 6, String(week(d).run));
  check('yedinciden önce ödül yok', !week(d).due && claimWeek(d) === null);

  // Ayni gun ne kadar oynarsan oyna seri bir artar. Sayfayi yedi kez acmakla kazanilan bir odul
  // odul degildir.
  mark(d, 'clears', 1, '2026-10-19');
  mark(d, 'kills', 50, '2026-10-19');
  check('aynı gün seriyi tekrar artırmıyor', week(d).run === 6, String(week(d).run));

  mark(d, 'clears', 1, '2026-10-20');
  const w = week(d);
  check('yedinci gün ödül hazır', w.due && w.run === Week);
  const was = { gems: d.gems, gold: d.gold };
  const got = claimWeek(d);
  check('hafta ödülü gem ve altın ödüyor',
    got && got.gems > 0 && d.gems === was.gems + got.gems && d.gold === was.gold + got.gold,
    JSON.stringify(got));
  check('alınınca seri başa dönüyor', week(d).run === 0);
  check('ikinci kez alınamıyor', claimWeek(d) === null);

  // bir gun atlayinca sifirdan
  mark(d, 'clears', 1, '2026-10-23');
  check('bir gün kaçırınca seri birden başlıyor', week(d).run === 1, String(week(d).run));
}

// --- başarımlar -----------------------------------------------------------------------------------

check('başarım listesi dolu', Feats.length >= 10);
check('her başarımın adı iki dilde ve gem ödülü var',
  Feats.every((f) => f.name && f.name[1] && f.gems > 0));
check('başarım anahtarları benzersiz', new Set(Feats.map((f) => f.key)).size === Feats.length);
check('her başarım ömürlük bir sayıya bakıyor', (() => {
  const life = lifetime(tidy({ level: 1 }));
  return Feats.every((f) => f.of in life);
})(), Feats.filter((f) => !(f.of in lifetime(tidy({ level: 1 })))).map((f) => f.of).join(','));

{
  const d = tidy({ level: 6, loadout: ['bolt'] });
  check('yeni hesapta hiçbiri bitmemiş', feats(d).every((f) => !f.done || f.need === 0));

  d.runs = 10;
  const one = feats(d).find((f) => f.key === 'runs10');
  check('koşullar sağlanınca açılıyor', one.done && !one.paid, `${one.at}/${one.need}`);
  const was = d.gems;
  const got = claimFeat(d, 'runs10');
  check('başarım gem ödüyor', got && d.gems === was + got.gems, JSON.stringify(got));
  check('ikinci kez alınamıyor', claimFeat(d, 'runs10') === null);

  // BU KURAL ONEMLI: basarim hayat boyu bir kez. Tekrar tekrar alinabilseydi gem farmlanabilir
  // hale gelirdi ve gem'in tek ozelligi tam olarak bunun olmamasi.
  d.runs = 10000;
  check('sayı daha da artsa bile tekrar ödemiyor', claimFeat(d, 'runs10') === null);
  check('alınmış olarak işaretli', feats(d).find((f) => f.key === 'runs10').paid === true);
  check('bitmemiş olan alınamıyor', claimFeat(d, 'combAll') === null);
  check('olmayan başarım alınamıyor', claimFeat(d, 'tarla') === null);
}

// --- reklam hakları -------------------------------------------------------------------------------

check('her tür için günlük hak var', AdKinds.every((k) => AdAllow[k] >= 1));
check('çark ve iki sandık için hak var',
  AdKinds.includes('spin') && AdKinds.includes('small') && AdKinds.includes('great'));

// SDK yokken reklam hazir olmamali. Hazir sayilsaydi butonlar reklamsiz odul dagitirdi ve gunde
// uc bedava cark cevirme, ekonominin dayandigi kurali sessizce bozardi.
check('SDK yokken reklam hazır değil', adsReady() === false);

{
  const d = tidy({ level: 5, loadout: ['bolt'] });
  const day = '2026-10-14';
  check('gün başında haklar dolu', adsLeft(d, 'spin', day) === AdAllow.spin);
  for (let i = 0; i < AdAllow.spin; i++) {
    check(`${i + 1}. reklam kabul ediliyor`, useAd(d, 'spin', day) === true);
  }
  check('hak bitince reddediyor', useAd(d, 'spin', day) === false && adsLeft(d, 'spin', day) === 0);
  check('bir türün hakkı ötekini etkilemiyor', adsLeft(d, 'small', day) === AdAllow.small);
  check('ertesi gün haklar yenileniyor', adsLeft(d, 'spin', '2026-10-15') === AdAllow.spin);
  check('olmayan tür için hak yok', adsLeft(d, 'tarla', day) === 0 && useAd(d, 'tarla', day) === false);
}

// Reklamla cevirme, gunun bedava cevirmesini HARCAMAMALI: fazladan bir tur, ayni turun iki kez
// satin alinmasi degil.
{
  const d = tidy({ level: 5, loadout: ['bolt', 'frost'] });
  const day = '2026-10-14';
  const paid = spin(d, 0.4, day, 0, true);
  check('reklam çevirmesi ödül veriyor', paid !== null);
  check('günün bedava çevirmesi hâlâ duruyor', canSpin(d, day));
  const free = spin(d, 0.4, day, 0);
  check('bedava çevirme ayrıca alınabiliyor', free !== null && !canSpin(d, day));
}

// Reklamla sandik acmak gem harcamamali - reklam zaten odemedir.
{
  const d = tidy({ level: 5, loadout: ['bolt', 'frost'] });
  d.gems = 0;
  check('gemsiz sandık normalde açılmıyor', openChest(d, 'great', 1) === null);
  const got = openChest(d, 'great', 1, true);
  check('reklamla açılıyor', got !== null && got.runes > 0);
  check('ve gem harcamıyor', d.gems === 0, String(d.gems));
}

// --- duyurular ------------------------------------------------------------------------------------

check('duyuru listesi dolu', News.length >= 3);
check('her duyurunun tarihi, başlığı ve metni iki dilde',
  News.every((n) => /^\d{4}-\d{2}-\d{2}$/.test(n.at) && n.title && n.title[1] && n.body && n.body[1]),
  News.filter((n) => !n.body || !n.body[1]).length + ' eksik');
check('duyurular yeniden eskiye sıralı',
  News.every((n, i) => i === 0 || News[i - 1].at >= n.at),
  News.map((n) => n.at).join(' '));

// --- müzik --------------------------------------------------------------------------------------
//
// Calan ses test edilemiyor, ama muzigin BUTUN KARARLARI aritmetik ve edilebiliyor: hangi notalar
// var, vurus ne kadar surer, bir barda kac ses cikar. Calan sey o kararlardan ibaret.

check('ölçek minör beşli', Scale[0] === 0 && Scale.includes(3) && Scale.includes(7)
  && !Scale.includes(2) && !Scale.includes(9), Scale.join(','));
check('ölçek yükselerek gidiyor', Scale.every((n, i) => i === 0 || n > Scale[i - 1]));
check('nota frekansları kökten yukarı', hzOf(0) === Root && hzOf(4) > hzOf(0));
check('ölçek dışına taşmıyor', hzOf(-5) === hzOf(0) && hzOf(99) === hzOf(Scale.length - 1));

// Vurus baskiyla hizlaniyor: muzigin oyunla ilgili olan tek yani bu.
check('baskı arttıkça vuruş hızlanıyor', beatOf(3) < beatOf(2) && beatOf(2) < beatOf(1),
  [1, 2, 3].map((p) => beatOf(p).toFixed(2)).join(' > '));
check('vuruş iki uçtan da duvarlı',
  beatOf(100) >= 0.3 && beatOf(0.01) <= 1.2,
  `${beatOf(100)} .. ${beatOf(0.01)}`);
check('menü koşudan yavaş', beatOf(1, 'menu') > beatOf(1, 'run'));

// ON DAKIKA KURALI. Bir barda dort sesten fazlasi varsa ses bir yatak degil bir sarki olur, ve
// sarki yirminci dinleyiste cekilmez. Bosluk, muzigin sahip oldugu tek sey.
{
  for (const bar of [0, 1, 2, 3]) {
    const sounds = [...Array(Bar).keys()].filter((b) => beatAt(bar, b, 3)).length;
    check(`bar ${bar}: barda en çok üç ses`, sounds <= 3 && sounds >= 2, String(sounds));
  }
  check('her barın ilk vuruşunda kök var',
    [0, 1, 2, 3].every((bar) => {
      const n = beatAt(bar, 0, 3);
      return n && Math.abs(n.hz - hzOf(0)) < 1e-6;
    }));
  check('yürüyen ses her barda çıkmıyor',
    !beatAt(0, 3, 3) && !!beatAt(1, 3, 3),
    'tek sesin sürekli çalması tam da kaçınılan şey');
  check('hiçbir nota yüksek sesli değil',
    [0, 1, 2, 3].every((bar) => [...Array(Bar).keys()].every((b) => {
      const n = beatAt(bar, b, 3);
      return !n || n.loud <= 0.12;
    })), 'yatak, büyü seslerinin önüne geçmemeli');
}

// Yurüyüs: rastgele notalar gurultu, sirali notalar calisma parcasi. Birer derece adim atmak,
// karar gibi duyulan en ucuz sey.
{
  const roll = walkFrom(12345);
  let at = 3;
  const path = [at];
  for (let i = 0; i < 400; i++) { at = nextDegree(at, roll); path.push(at); }
  check('yürüyüş hep bir adım atıyor',
    path.every((d, i) => i === 0 || Math.abs(d - path[i - 1]) <= 1),
    'sıçrayan nota melodi değil kaza');
  check('yürüyüş ölçeğin içinde kalıyor',
    path.every((d) => d >= 0 && d < Scale.length), `${Math.min(...path)}..${Math.max(...path)}`);
  check('yürüyüş bir yerde takılıp kalmıyor', new Set(path).size >= 4,
    [...new Set(path)].join(','));
  check('yürüyüş aynı tohumda aynı',
    (() => {
      const r2 = walkFrom(12345);
      let a2 = 3;
      return path.slice(1, 20).every((d) => (a2 = nextDegree(a2, r2)) === d);
    })());
}

// --- bölümler ve yerler --------------------------------------------------------------------------

check('on iki ayrı yer var', Stages.length === 12, String(Stages.length));
check('her yerin adı, tanıtımı ve görünümü var',
  Stages.every((st) => st.name && st.name[0] && st.name[1] && st.blurb && st.blurb[1] && st.look));
check('her yerin adı farklı',
  new Set(Stages.map((st) => st.name[1])).size === Stages.length);

// Portre, tanimadigi bir `look` icin ciplak agaclara dusuyor. Yani yanlis yazilmis bir gorunum
// hata vermez - sessizce ilk ormani cizer ve kimse fark etmez. Liste bu yuzden var.
check('her yerin görünümü çizilebiliyor',
  Stages.every((st) => Looks.includes(st.look)),
  Stages.filter((st) => !Looks.includes(st.look)).map((st) => st.look).join(', '));
// MENUNUN VERDIGI SOZU OYUN TUTMALI. Uzun sure on iki yer menude cizildi ama sahanin icinde
// hepsi ayniydi: "Kum Denizi"ni secip OYNA'ya basinca ayni olu ormandaydin. Sahne modul
// seviyesinde, sabit tohumlu, bolumden habersiz tek bir sabitti.
{
  const scenes = Looks.map((l) => ({ l, at: sceneryFor(l) }));
  check('her yerin kendi sahnesi var',
    scenes.every((s0) => s0.at.length > 10),
    scenes.filter((s0) => s0.at.length <= 10).map((s0) => s0.l).join(', '));

  const sig = (at) => [...new Set(at.map((t) => t.kind))].sort().join('+');
  const same = [];
  for (let i = 0; i < scenes.length; i++) {
    for (let j = i + 1; j < scenes.length; j++) {
      if (sig(scenes[i].at) === sig(scenes[j].at)) same.push(`${scenes[i].l}=${scenes[j].l}`);
    }
  }
  check('hiçbir iki yer aynı şeylerden kurulu değil', same.length === 0, same.join(', '));

  check('sahne yer başına bir kez üretiliyor', sceneryFor('wood') === sceneryFor('wood'),
    'her karede yeniden üretilirse ağaçlar titrer');
  check('ön yay açık kalıyor', scenes.every((s0) => s0.at.every((t) => {
    const front = Math.abs(((t.a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    return front >= 0.72;
  })), 'düşmanların girdiği yerde bir şey duramaz');
}

check('her görünüm en az bir yerde kullanılıyor',
  Looks.every((l) => Stages.some((st) => st.look === l)),
  Looks.filter((l) => !Stages.some((st) => st.look === l)).join(', '));
check('aynı görünüm iki yerde kullanılmıyor',
  new Set(Stages.map((st) => st.look)).size === Stages.length);

// Listenin sonu gelince adlar sayiyla tekrar ediyor; resim de ayni, ama o bolumde yasayanlar
// farkli olmali - yoksa 13. bolum 1. bolumun birebir aynisi olur.
check('liste bitince adlar sayıyla dönüyor',
  stageOf(Stages.length + 1).name[1] === Stages[0].name[1] + ' 2',
  stageOf(Stages.length + 1).name[1]);
check('aynı yere dönüldüğünde içinde yaşayanlar değişiyor',
  familiesOn(1).join() !== familiesOn(Stages.length + 1).join(),
  `1. ${familiesOn(1).join('+')} vs ${Stages.length + 1}. ${familiesOn(Stages.length + 1).join('+')}`);

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
  // Uc esik: bitirdin (1), duvar neredeyse cizilmedi (2), duvara hic dokunulmadi (3). Ikisi de
  // bilerek tepede: aradaki butun fark tek yildizin icinde.
  check('tam duvarla üç yıldız', starsFor(300, 300) === 3);
  check('%95 üstü iki yıldız', starsFor(286, 300) === 2 && starsFor(299, 300) === 2);
  check('%95 altı bir yıldız',
    starsFor(284, 300) === 1 && starsFor(150, 300) === 1 && starsFor(1, 300) === 1);
  check('bitiren hiçbir zaman sıfır yıldız almıyor', starsFor(0, 300) === 1,
    'bölümü bitirmek kendi başına bir yıldız eder');
  check('sıradaki yıldızın eşiği söyleniyor',
    nextStarAt(1) === 95 && nextStarAt(2) === 100 && nextStarAt(3) === null);
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
  check('kötü bir tekrar kazanılmış yıldızı geri almıyor', starsAt(d, 1) === 3 && worse.stars === 1);

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
// Gem artik yildiza BAKMIYOR. Bir bolumu bir can kala bitirmek de bitirmektir, ve zor
// bitirenin odule en cok ihtiyaci olandir. Yildiz bir skor, bir fiyat degil.
check('gem yıldıza bakmıyor', gemsOn(5, 0) === gemsFor(5), `${gemsOn(5, 0)} / ${gemsFor(5)}`);
check('gem sadece bölüme ve kaçıncı geçiş olduğuna bakıyor',
  gemsOn(5, 0) > gemsOn(5, 1) && gemsOn(5, 3) === 0);

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

  // `gold` IKI SEYIN TOPLAMI: bolumun odedigi (tekrarda sonuyor) ve kosu gorevlerinin odedigi
  // (hesap seviyesiyle BUYUYOR). Dort kosuda hesap seviye atladigi icin gorev altini 135'ten
  // 350'ye cikti ve sonumu tamamen ortmustu - olculmek istenen sey toplam degil, bolumun payi.
  const stageGold = (r) => r.gold - (r.runGold || 0);
  check('deneyim, altın ve parça da tekrarda düşüyor',
    runs[0].earned > runs[3].earned && stageGold(runs[0]) > stageGold(runs[3])
    && runs[0].shards.bolt > runs[3].shards.bolt,
    `deneyim ${runs[0].earned}->${runs[3].earned} · ` +
    `altın ${stageGold(runs[0])}->${stageGold(runs[3])}`);
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
  const f = tidy({ level: 13, xp: 0, loadout: ['bolt', 'frost', 'nova', 'laser', 'shards'] });
  check('dolu loadouta altıncısı eklenemiyor', toggle(f, 'wisp') === false, f.loadout.join(','));
  const g = tidy({ level: 1, xp: 0, loadout: ['bolt'] });
  check('açılmamış büyü loadouta eklenemiyor', toggle(g, 'meteor') === false);
  const h = tidy({ level: 13, xp: 0, loadout: ['bolt', 'frost', 'nova', 'laser'] });
  check('loadouttan çıkarma çalışıyor', toggle(h, 'frost') === true && !h.loadout.includes('frost'));
}

{
  const d = tidy({ level: 1, xp: 0, loadout: ['bolt', 'shards'], best: 0 });
  const r = record(d, 3, 500);
  // Esik 500'dü, yani "oldurme sayisindan cok". Kosu basina odeme yariya inince (bolum ucte bir
  // degil UC KAT uzun oldugu icin) bu aritmetik olarak imkansiz hale geldi; olculmek istenen sey
  // `worth` ile `record`'un ayni sayiyi soylemesi.
  check('koşu deneyim kazandırıyor', r.earned === worth(3, 500) && r.earned > 0, String(r.earned));
  check('hesap seviye atlıyor', r.levelled && d.level > 1);
  // Loadout doluysa yeni açılan büyü kendi giremez - oyuncunun seçimini ezmek doğru olmaz.
  check('açılan büyü yer varsa kendi giriyor, yoksa loadout dolu kalıyor',
    d.loadout.length === Carry, d.loadout.join(','));
  check('en iyi bölüm kaydediliyor', d.best === 3);
}

// --- enerji ----------------------------------------------------------------------------------

// Saat disaridan veriliyor, yani "kirk dakika sonra" beklemeden olculebiliyor.
const T0 = 1760000000000;
const mins = (n) => T0 + n * 60000;

check('bir koşu on beş enerji', EPerRun === 15, String(EPerRun));
check('depo altmış', EStore === 60);
check('dakikada iki doluyor', EPerMinute === 2 && ETick === 30000);

// BU OZELLIGIN VAR OLMA SEBEBI. Bes dakikalik bir kosu, 5 enerjiye ve dakikada 2 yenilemeye
// ayarli eski sayilarla, harcadigindan COK DAHA FAZLASINI geri veriyordu: kapi hic kapanmiyordu.
{
  const runMin = 5.5;
  const back = runMin * EPerMinute;
  check('bir koşu kazandırdığından çok yiyor', EPerRun > back,
    `koşu -${EPerRun}, bu sürede +${back}`);
}

{
  const d = tidy({ level: 5, loadout: ['bolt'] });
  setEnergy(d, EStore, T0);
  check('dolu başlıyor', energyNow(d, T0) === EStore);
  check('dolu kalıyor, taşmıyor', energyNow(d, mins(60)) === EStore);

  check('koşu enerji yiyor', spendEnergy(d, EPerRun, T0) === true
    && energyNow(d, T0) === EStore - EPerRun, String(energyNow(d, T0)));

  // Zamanla doluyor - oyun KAPALIYKEN de. Kaydedilen sey sayi degil, sayi ve an.
  check('saatle doluyor', energyNow(d, mins(5)) === EStore - EPerRun + 10,
    String(energyNow(d, mins(5))));
  check('depoyu aşmıyor', energyNow(d, mins(600)) === EStore);
}

// Yetmiyorsa hicbir seye dokunmuyor: yarim bir harcama, enerjisi yenmis ama kosmamis bir oyuncu.
{
  const d = tidy({ level: 5, loadout: ['bolt'] });
  setEnergy(d, 9, T0);
  check('yetmeyince harcamıyor', spendEnergy(d, EPerRun, T0) === false);
  check('ve hiçbir şeye dokunmuyor', energyNow(d, T0) === 9, String(energyNow(d, T0)));
  check('koşamıyor', canRun(d, T0) === false);
  // 9 var, 15 gerek: 6 tane daha, her biri 30 saniye = 3 dakika.
  check('ne kadar bekleyeceğini söylüyor', untilRun(d, T0) === 6 * ETick,
    `${untilRun(d, T0) / 1000} sn`);
  check('o kadar sonra koşabiliyor', canRun(d, T0 + untilRun(d, T0)) === true);
  check('doluyken sıfır bekliyor', untilRun({ energy: { at: EStore, when: T0 } }, T0) === 0);
}

// Temiz gecisin iadesi: uc yildizin satin aldigi tek somut sey.
{
  const d = tidy({ level: 5, loadout: ['bolt'] });
  setEnergy(d, 20, T0);
  giveEnergy(d, EClean, T0);
  check('temiz geçiş enerji iade ediyor', energyNow(d, T0) === 20 + EClean);
  setEnergy(d, EStore - 2, T0);
  giveEnergy(d, EClean, T0);
  check('iade depoyu aşmıyor', energyNow(d, T0) === EStore);
}

// Saat geriye alinirsa eksi enerji olmamali - ve kayit bozuksa oyun acilir acilmaz
// oynanabilir olmali, yarim saat bekleyen bir oyuncu degil.
{
  const d = tidy({ level: 5, loadout: ['bolt'] });
  setEnergy(d, 30, T0);
  check('saat geri gidince kırılmıyor', energyNow(d, T0 - 600000) === 30,
    String(energyNow(d, T0 - 600000)));
  const old = tidy({ level: 5, loadout: ['bolt'], energy: null });
  check('enerjisiz eski kayıt dolu başlıyor', energyNow(old) === EStore);
  const broken = tidy({ level: 5, loadout: ['bolt'], energy: { at: 'x', when: 'y' } });
  check('bozuk kayıt dolu başlıyor', energyNow(broken) === EStore);
  const future = tidy({ level: 5, loadout: ['bolt'], energy: { at: 0, when: Date.now() + 9e8 } });
  check('ileri tarihli kayıt dolu başlıyor', energyNow(future) === EStore);
}

check('geri sayım okunur yazılıyor',
  clockOf(0) === '0:00' && clockOf(90000) === '1:30' && clockOf(3750000) === '1:02:30',
  `${clockOf(0)} · ${clockOf(90000)} · ${clockOf(3750000)}`);

// Bir oturum ne kadar surer: dolu depoyla kac kosu, sonra kosu basina ne kadar bekleme.
{
  const d = tidy({ level: 5, loadout: ['bolt'] });
  setEnergy(d, EStore, T0);
  let at = T0;
  let runs = 0;
  // Bes bucuk dakikalik kosular, art arda, enerji bitene kadar.
  while (spendEnergy(d, EPerRun, at) && runs < 99) {
    runs += 1;
    at += 5.5 * 60000;
  }
  check('dolu depo kesintisiz bir oturum veriyor', runs >= 8 && runs <= 25,
    `${runs} koşu, ${Math.round((at - T0) / 60000)} dakika`);
  console.log(`\nenerji: dolu depoyla ${runs} koşu kesintisiz (~${Math.round((at - T0) / 60000)} dakika), ` +
    `sonra koşu başına ${clockOf(EPerRun / EPerMinute * 60000)} bekleme`);
}

// --- her ekrandan bir çıkış var mı ----------------------------------------------------------------

// CrazyGames'in gomulu oynaticisinda sekme seridine ulasilamadi ve oyuncu oduller sekmesinde
// KAPANA KISILDI: oyunun tek cikisi ekranin en altindaydi. Ekranin tepesindeki kale isareti artik
// haritaya donuyor, ve bu kontrol onu tutuyor.
{
  const d = tidy({ level: 6, loadout: ['bolt'] });
  for (const tab of ['wheel', 'hero', 'spells', 'codex', 'map']) {
    d.tab = tab;
    const t = topBand(1280, 720, 1);
    const mid = { x: t.avatar.x + t.avatar.w / 2, y: t.avatar.y + t.avatar.h / 2 };
    const hit = menuHit(d, {}, 1280, 720, mid.x, mid.y, 1);
    check(`${tab} sekmesinden kale işaretiyle haritaya dönülüyor`,
      !!hit && hit.what === 'tab' && hit.key === 'map',
      JSON.stringify(hit));
  }
  // Panel acikken degil: o zaman once panel kapanmali, yoksa basis panelin icinden gecer.
  d.tab = 'map';
  const t = topBand(1280, 720, 1);
  const mid = { x: t.avatar.x + t.avatar.w / 2, y: t.avatar.y + t.avatar.h / 2 };
  const over = menuHit(d, { board: 'jobs' }, 1280, 720, mid.x, mid.y, 1);
  check('pano açıkken kale işareti panonun altında kalmıyor',
    !over || over.what !== 'tab', JSON.stringify(over));
}

// --- portal dikişi ---------------------------------------------------------------------------------

// SDK YOKKEN hicbir sey patlamamali ve hicbir sey odememeli. Oyun GitHub Pages'te, yerel bir
// sunucuda ve bu testin icinde hep boyle calisiyor.
check('SDK yokken hiçbiri patlamıyor', (() => {
  try {
    portalPlaying(true); portalPlaying(false); portalCheer(); portalProgress(40);
    watchSettings(() => {});
    return mutedByPortal() === false;
  } catch { return false; }
})());
check('SDK yokken reklam ödemiyor', (await adShow()) === false);
check('SDK yokken açılış yine de dönüyor', (await portalOpen()) === false);

// Simdi SAHTE bir portal kurup cagrilarin dogru sirada gittigini dogruluyoruz. Dikisi yazmak
// kolay, yanlis sirada cagirmak kolay, ve portalin kendisi bunu ancak yayindayken soyler.
{
  const said = [];
  let fire = null;
  globalThis.window = {
    CrazyGames: {
      SDK: {
        init: async () => { said.push('init'); },
        ad: {
          hasAdblock: async () => false,
          requestAd: (kind, cb) => { said.push('ad:' + kind); fire = cb; },
        },
        game: {
          settings: { muteAudio: false },
          loadingStart: () => said.push('loadingStart'),
          loadingStop: () => said.push('loadingStop'),
          gameplayStart: () => said.push('play'),
          gameplayStop: () => said.push('stop'),
          happytime: () => said.push('cheer'),
          reportGameCompletedPercentage: (n) => said.push('part:' + n),
          addSettingsChangeListener: (fn) => said.push('listen') || fn,
        },
      },
    },
  };

  check('portal açılmadan reklam hazır değil', adsReady() === false,
    'init beklenmeden gonderilen bir reklam, hic oynamayan bir reklamdir');

  const started = await portalOpen();
  check('portal açılıyor', started === true);
  check('yükleme sırası doğru', said.join() === 'loadingStart,init,loadingStop', said.join());
  check('açılınca reklam hazır', adsReady() === true);

  said.length = 0;
  portalPlaying(true);
  portalPlaying(true);
  portalPlaying(false);
  portalPlaying(false);
  // Kosu ekranina birkac giris cikis var; iki kere soylemek kolay, ve portal bunu ancak
  // yayindayken sikayet eder.
  check('oynuyor/durdu iki kere söylenmiyor', said.join() === 'play,stop', said.join());

  said.length = 0;
  portalCheer();
  portalProgress(250);
  check('kutlama ve ilerleme gidiyor', said.join() === 'cheer,part:100', said.join());

  // Odullu reklam: izlenirse oduyor, hata verirse odemiyor, ve ses iki durumda da geri geliyor.
  {
    const hushed = [];
    const won = adShow((on) => hushed.push(on));
    fire.adStarted();
    fire.adFinished();
    check('izlenen ödüllü reklam ödüyor', (await won) === true);
    check('ses sustu ve geri geldi', hushed.join() === 'true,false', hushed.join());
  }
  {
    const hushed = [];
    const won = adShow((on) => hushed.push(on));
    fire.adStarted();
    fire.adError({ code: 'unfilled' });
    check('dolmayan reklam ödemiyor', (await won) === false,
      'adError dolu olmayan reklam icin de atesleniyor - ilk firlatista her reklam boyle');
    check('hata olsa da ses geri geliyor', hushed.join() === 'true,false', hushed.join());
  }

  // ODULLU REKLAMDAN BASKA HICBIR SEY. Kullanicinin karari: her reklam, oyuncunun butona basip
  // karsiliginda butonda yazani aldigi bir reklam olacak. SDK ara reklam da sunuyor; istenmedi.
  said.length = 0;
  const probe = adShow();
  // Sahte SDK geri aramayi kendisi atesmiyor, biz atesliyoruz - beklemeden `await` etmek bu
  // dosyayi sonsuza kadar asili birakir.
  fire.adFinished();
  await probe;
  check('oyun sadece ödüllü reklam istiyor', said.join() === 'ad:rewarded', said.join());

  // Portalin sesi, oyunun sesinden ustun.
  globalThis.window.CrazyGames.SDK.game.settings.muteAudio = true;
  check('portal susturunca oyun da susuyor', mutedByPortal() === true);

  delete globalThis.window;
}

// --- BASLATILMAMIS SDK -----------------------------------------------------------------------
//
// CrazyGames'in QA ortaminda oyuncunun reklam engelleyicisi portalin KENDI scriptlerini engelledi,
// `init()` basarisiz oldu, ve o halde SDK'nin OZELLIKLERINE DOKUNMAK bile patliyor. `ready()`
// icinde `sdk().ad` `portal.started`'dan once okunuyordu: oduller sekmesi karenin ortasinda oldu,
// sekme seridi cizilmedi ve oyuncu o ekranda kapana kisildi.
{
  const boom = () => { throw { name: 'CrazySDK', message: 'CrazySDK is not initialized yet.' }; };
  const sdk = { init: () => Promise.reject({ code: 'blocked' }) };
  for (const name of ['ad', 'data', 'game', 'user', 'banner']) {
    Object.defineProperty(sdk, name, { get: boom });
  }
  globalThis.window = { CrazyGames: { SDK: sdk } };

  check('başlatılamayan portal açılışı sessizce düşüyor', (await portalOpen()) === false);
  // Asil mesele: bundan SONRA cizim ve basma yollarinda cagrilan her sey patlamamali.
  check("kırık SDK: reklam hazır değil", ready() === false);
  check("kırık SDK: hiçbiri patlamıyor", (() => {
    try {
      portalPlaying(true); portalPlaying(false); portalCheer(); portalProgress(50);
      watchSettings(() => {});
      return mutedByPortal() === false;
    } catch { return false; }
  })(), 'tek bir patlama bütün kareyi düşürüyor');
  check("kırık SDK: reklam ödemiyor", (await adShow()) === false);

  delete globalThis.window;
}

// --- beş dakikalık bölüm ---------------------------------------------------------------------------

check('patron beşinci dakikada', StageWaves === 300, `${StageWaves}`);
check('dalga bütün bölüm boyunca tırmanıyor', RampOver > 0 && RampOver < StageWaves,
  `${RampOver} / ${StageWaves}`);

{
  const s = begin(11, ['bolt', 'fireball'], 1);
  const soon = pressure(s);
  s.t = 150;
  const half = pressure(s);
  s.t = 300;
  const end = pressure(s);
  check('baskı kademeli artıyor', half > soon * 1.4 && end > half * 1.2,
    `${soon.toFixed(2)} → ${half.toFixed(2)} → ${end.toFixed(2)}`);
  // Eski bolen 56'ydi ve 72 saniyeye gore secilmisti. Bes dakika boyunca birakilsa acilisin
  // alti buçuk katina cikiyordu; bu tirmanis degil, ucurum.
  check('ama uçuruma dönmüyor', end < soon * 4,
    `beş dakikanın sonunda açılışın ${(end / soon).toFixed(1)} katı`);
}

// Patron geldikten sonra HIC yeni dusman gelmemeli: son dovus patronla ve sahada kalanla.
{
  const s = begin(13, ['bolt'], 1);
  s.t = StageWaves + 1;
  s.stageT = StageWaves + 1;
  step(s, 1 / 60);
  check('beşinci dakikada patron geliyor', !!s.boss && s.bossDone, s.boss ? s.boss.key : 'yok');

  const was = s.foes.length;
  for (let i = 0; i < 60 * 30; i++) {
    if (s.phase !== 'playing') break;
    step(s, 1 / 60);
  }
  const born = s.foes.filter((f) => !f.boss && f.spawnedAt > StageWaves + 1).length;
  check('patron gelince dalga duruyor', s.foes.filter((f) => !f.boss).length <= was,
    `${was} → ${s.foes.filter((f) => !f.boss).length}`);
}

// --- hız kilidi ------------------------------------------------------------------------------------

{
  const d = tidy({ level: 10, loadout: ['bolt'] });
  check('hiç geçilmemiş bölüm sadece 1x', speedsFor(d, 4).join() === '1', speedsFor(d, 4).join());
  d.done = { 4: 1 };
  check('geçilmiş bölüm 1.5x açıyor', speedsFor(d, 4).join() === '1,1.5', speedsFor(d, 4).join());
  check('reklam hepsini açıyor', speedsFor(d, 4, true).length === Speeds.length);
  check('reklam, hiç geçilmemiş bölümde de açıyor', speedsFor(d, 9, true).length === Speeds.length,
    'reklamın sattığı şey beklemek, ilerleme değil');

  // Kaydedilmis secim, izin vermeyen bir boluma tasinmaz.
  check('izinsiz hız kırpılıyor', speedAllowed(d, 9, 2) === 1, String(speedAllowed(d, 9, 2)));
  check('izinli hız korunuyor', speedAllowed(d, 4, 1.5) === 1.5);
  check('reklamlıysa korunuyor', speedAllowed(d, 9, 2, true) === 2);
}

// --- the bot ---------------------------------------------------------------------------------
//
// Everything below here SIMULATES RUNS, and a run is now five minutes of game time rather than
// one and three quarters. At sixty steps a second across the thousand-odd runs the sweep plays,
// that is minutes of wall clock - and a suite you think twice about running is a suite that
// stops being run. So it is behind a flag.
//
//   node Tools/test.mjs            kontroller + bot (tam ölçüm)
//   node Tools/test.mjs --quick    sadece kontroller, saniyeler
//
// `--quick` is for the dev loop: it still proves the rules, the economy, the text and every
// geometry, and it is what to run after changing anything that is not balance. The full sweep is
// what to run before believing a number.
const Quick = process.argv.includes('--quick');

/**
 * How many runs a measurement plays, and over how many stages.
 *
 * The sweep used forty runs across five stages, several times over. At seventy-two seconds a run
 * that was seconds; at five minutes it is half an hour, and a suite you think twice about running
 * is a suite that stops being run. The normal sweep now takes a sample - enough to catch a change
 * that broke the game - and `--deep` restores the full count for when a number is going to be
 * written down somewhere.
 *
 * `Tools/tune.mjs` is the other half of this: same bot, chosen stages, chosen count.
 */
const Deep = process.argv.includes('--deep');
const R = (n) => (Deep ? n : Math.max(8, Math.round(n * 0.3)));
const Sweep = Deep ? [1, 2, 3, 4, 5] : [1, 3, 5];
if (Quick) {
  if (failures.length) {
    console.log(`${failures.length} KONTROL DÜŞTÜ:`);
    for (const f of failures) console.log('  - ' + f);
    process.exit(1);
  }
  console.log(`${passed} kontrol geçti (bot atlandı — tam ölçüm için bayraksız çalıştır)`);
  process.exit(0);
}

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
        // A fusion scores like the big pick it is. Left out, it fell through to the boost branch
        // at 18 and the bot went whole runs without ever taking one - and a feature the bot never
        // touches is a feature no measurement in this file covers.
        else if (c.what === 'fusion') score = 110;
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
    fused: (s.fused || []).length,
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
console.log('bölüm  bitirme   süre    yıldız dağılımı (1/2/3)   ortanca seviye/dönüşüm');
const byStage = [];
for (const stage of Sweep) {
  const runs = [];
  for (let i = 1; i <= R(40); i++) runs.push(botRun(i * 7919, Four, stage));
  const done = runs.filter((r) => r.done);
  const times = done.map((r) => r.t).sort((a, b) => a - b);
  // Yildiz sifir olamiyor artik: bitiren en az bir aliyor.
  const spread = [1, 2, 3].map((n) => runs.filter((r) => r.done && r.stars === n).length);
  // Ortanca, YIRMINCI degil. Yirmi, kirk kosuluk sabit bir orneklemeye gore yazilmisti ve
  // ornekleme kuculunce tablonun yarisi "undefined" basmaya basladi.
  const midOf = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const lv = midOf(runs.map((r) => r.level));
  const ev = midOf(runs.map((r) => r.evos));
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
  for (let i = 1; i <= R(40); i++) {
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
  for (let i = 1; i <= R(40); i++) {
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
    for (let i = 1; i <= R(20); i++) runs.push(botRun(i * 7919, Four, stage, 6, HeroSteps, SpellSteps).done);
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
    for (let i = 1; i <= R(40); i++) runs.push(botRun(i * 7919, kit, stage).done);
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

// NEREYE KADAR GIDILEBILIYOR?
//
// Bolum sayisinda ust sinir yok - adlar sayiyla donuyor, zorluk ise durmadan artiyor. "Kac bolum
// var" sorusunun anlamli cevabi bu tablo: yeni bir hesap nerede duruyor, her seyi almis bir hesap
// nerede duruyor.
console.log('');
console.log('nereye kadar (24 koşu):');
console.log('  bölüm   yeni hesap   tam donanım   yer                   aileler');
{
  const pcAt = (stage, hero, lvl) => {
    const runs = [];
    for (let i = 1; i <= R(24); i++) runs.push(botRun(i * 7919, Four, stage, 6, hero, lvl).done);
    return Math.round(runs.filter(Boolean).length / runs.length * 100);
  };
  const rows = [];
  for (let n = 1; n <= 14; n++) {
    rows.push({ n, bare: pcAt(n, 0, 1), full: pcAt(n, HeroSteps, SpellSteps) });
    const r = rows[rows.length - 1];
    console.log(`  ${String(r.n).padStart(5)}   ${('%' + r.bare).padStart(9)}   ${('%' + r.full).padStart(11)}   ` +
      `${stageOf(r.n).name[1].padEnd(20)}  ${familiesOn(r.n).join('+')}`);
  }
  const lastBare = rows.filter((r) => r.bare > 0).slice(-1)[0];
  const lastFull = rows.filter((r) => r.full > 0).slice(-1)[0];
  console.log(`  → yeni hesap ${lastBare ? lastBare.n : 0}. bölüme kadar · tam donanım ${lastFull ? lastFull.n : 0}. bölüme kadar`);
  // 24 kosuda %25 civarinda standart hata ~%9. Tabloda bu kadarlik oynamalar gurultudur ve
  // yazmak zorundayiz: bir keresinde burada "3. bolum 4.'den zor" gorundu, 150 kosuda duzgun
  // bir egri cikti. Sayilarin yanina ne kadarina guvenilecegi yazmazsa, yanilmak kacinilmaz.
  console.log('  (24 koşu · bu tabloda ~9 puandan küçük farklar gürültüdür)');

  const g = (a, b) => (b ? g(b, a % b) : a);
  const lcm = (a, b) => (a * b) / g(a, b);
  const cycle = lcm(lcm(Stages.length, StageFamilies.length), Bosses.length);
  console.log(`  yer ${Stages.length} · aile deseni ${StageFamilies.length} · patron ${Bosses.length} → aynı birleşim ${cycle} bölümde bir`);

  check('yeni bir hesap ilk birkaç bölümü geçebiliyor', lastBare && lastBare.n >= 3,
    `${lastBare ? lastBare.n : 0}. bölüm`);
  check('tam donanım çok daha ileri gidiyor', lastFull.n >= lastBare.n + 4,
    `${lastBare.n} -> ${lastFull.n}`);
  // Bir yerde durmali: her seyi almis bir oyuncunun sonsuza kadar gittigi bir oyunun sonu yok,
  // ve sonu olmayan bir oyunun ulasilacak hicbir yeri yok.
  check('tam donanımın da bir duvarı var', rows.some((r) => r.full === 0),
    rows.map((r) => r.full).join('/'));
  // Zorluk duzenli artmali: arada bir bolum kendinden sonrakinden sert olursa oyuncu "ben mi
  // yanlis yapiyorum" diye dusunur, oysa sira yanlistir.
  const bumps = rows.slice(0, 8).filter((r, i, all) => i > 0 && r.full > all[i - 1].full + 8);
  check('zorluk sırası tersine dönmüyor', bumps.length === 0,
    bumps.map((r) => `${r.n}. bölüm öncekinden kolay`).join(', '));
}

// Birlesme gercekten OLUYOR mu? Yukaridaki butun bitirme oranlari, bot hic birlesme almiyorsa
// birlesmesiz oyunun oranlaridir - ve bu projede ozelligi hic denemeyen bir olcume uc kere
// kanmistim.
console.log('');
{
  const runs = [];
  for (let i = 1; i <= R(40); i++) runs.push(botRun(i * 7919, Four, 3));
  const made = runs.filter((r) => r.fused > 0).length;
  console.log(`birleşme: ${runs.length} koşunun ${made} tanesinde en az bir tane yapıldı`);
  check('bot gerçekten birleşme yapıyor', made > 0,
    'hiç yapılmıyorsa yukarıdaki bütün oranlar birleşmesiz oyunun oranları');
  // Ama her kosuda olmamali: iki buyuyu birden kademeye cikarmak uzun bir yol, ve her kosuda
  // olan sey secim degil adimdir.
  check('ama her koşuda olmuyor', made < runs.length,
    `${made}/${runs.length}`);

  // Bot hedef gozetmiyor, eline ne gecerse aliyor. Asil soru: BILEREK birlesmeye oynayan bir
  // oyuncu alabiliyor mu? Ayni bot, kadrosunda cifti tasiyan ve yayilacak az yeri olan bir elle.
  const aimed = [];
  for (let i = 1; i <= R(40); i++) aimed.push(botRun(i * 7919, ['bolt', 'fireball', 'lightning'], 3));
  const hit = aimed.filter((r) => r.fused > 0).length;
  console.log(`  çifti kadrosuna alan oyuncu: ${aimed.length} koşunun ${hit} tanesinde`);
  // Esik "iki kati" idi ve kapi genisletilince aritmetik olarak imkansiz hale geldi: rastgele
  // oyuncu 20/40 alinca iki kati 40/40 demek. Olculen fark, oranin kendisi degil.
  // Esik ORAN, cunku kosu sayisi ornekleme ile degisiyor. Mutlak bir "sekiz tane daha" esigi
  // on iki kosuluk bir ornekte aritmetik olarak imkansiz olurdu.
  check('birleşmeye oynayan oyuncu belirgin şekilde daha sık alıyor',
    hit / aimed.length >= made / runs.length + 0.2,
    `rastgele ${made}/${runs.length} vs hedefli ${hit}/${aimed.length}`);
}

const solo = [];
for (let i = 1; i <= R(30); i++) solo.push(botRun(i * 104729, ['bolt'], 3).done);
const lazy = [];
for (let i = 1; i <= R(30); i++) lazy.push(botRun(i * 104729, Four, 1, 1).done);
console.log(`  sadece sabit büyüyle 3. bölüm: %${Math.round(solo.filter(Boolean).length / solo.length * 100)}  (dört büyüyle %${Math.round(byStage[2].rate * 100)})`);
console.log(`  neredeyse hiç tıklamayan (1/sn), 1. bölüm: %${Math.round(lazy.filter(Boolean).length / lazy.length * 100)}`);

// Birinci bölümü neredeyse herkes bitirmeli - ilk oturuşta hiçbir şey başaramayan oyuncu geri
// gelmez. Ama üç yıldız kolay olmamalı, yoksa yıldızın bir anlamı kalmaz.
check('birinci bölümü çoğu oyuncu bitiriyor', byStage[0].rate > 0.85, `%${Math.round(byStage[0].rate * 100)}`);
// Ornekleme ile sweep uc bolume dusebiliyor, o yuzden SON kayit okunuyor, besincisi degil.
const deepest = byStage[byStage.length - 1];
check('bölümler zorlaşıyor', deepest.rate < byStage[0].rate * 0.85,
  `1: %${Math.round(byStage[0].rate * 100)}  5: %${Math.round(deepest.rate * 100)}`);
// `spread` artik [1,2,3] yildiz, yani ucuncusu son eleman. Eskiden sifir da sayiliyordu.
const threes = (b) => b.spread[b.spread.length - 1];
// 1. bolum ogrenme bolumu: orada uc yildiz garanti olabilir. Asil soru DERINDE garanti mi.
check('üç yıldız derinlerde garanti değil',
  byStage.slice(1).every((b) => threes(b) < b.spread.reduce((a, n) => a + n, 0)),
  byStage.map((b) => threes(b)).join(','));
check('üç yıldız imkânsız da değil', byStage.some((b) => threes(b) > 0),
  byStage.map((b) => threes(b)).join(','));
{
  // Bes dakika dalga, sonra patron. Alt sinir da onemli: dalga erken biterse bolum bes dakikalik
  // degildir, ve ust sinir patron dovusunun kendi basina bir bolum olmadigini soyler.
  const mid = byStage[0].times.length
    ? byStage[0].times[Math.floor(byStage[0].times.length / 2)] : 0;
  check('bir bölüm beş dakika sürüyor', mid > StageWaves * 0.98 && mid < StageWaves + 180,
    byStage[0].times.length ? fmt(mid) : 'hiç bitmedi');
}
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
      for (let i = 1; i <= R(30); i++) {
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

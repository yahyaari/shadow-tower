// Kurallar + bir bot. Tarayıcı yok.
//
// Bu oyun birbiriyle etkileşen on büyüden ibaret ve o yığının dengeli olup olmadığı gözle
// görülmez. Burada bir koşu milisaniyelerde bitiyor, yüzlercesi birden koşuyor.
//
//   node Tools/test.mjs

import {
  begin, step, click, take, offer, spawn, xpFor,
  Spells, Passives, MostLevel, MostSpells, StageWaves, Kinds, spellKeys,
  damageOf, everyOf, haste, reach,
} from '../src/rules.js';

let passed = 0;
const failures = [];
const check = (what, ok, detail = '') => {
  if (ok) { passed++; return; }
  failures.push(what + (detail ? ' — ' + detail : ''));
};

// --- the spell book ---------------------------------------------------------------------------

check('on büyü var', spellKeys.length === 10, `${spellKeys.length} tane`);

check('her büyünün adı, açıklaması, hasarı ve bekleme süresi var',
  Object.values(Spells).every((s) => s.name && s.tells && s.damage > 0 && s.every > 0));

check('her büyü seviye atladıkça güçleniyor', Object.values(Spells).every((s) => s.per > 0));

check('her pasifin adı ve açıklaması var',
  Object.values(Passives).every((p) => p.name && p.tells));

// İki büyü aynı işi yapıyorsa biri fazlalık. "İş" = neye nişan aldığı + nasıl vurduğu.
{
  const job = (s) => `${s.seeks || '-'}|${s.instant || (s.falls ? 'falls' : s.orbit ? 'orbit' : s.blast ? 'blast' : s.count ? 'fan' : 'single')}`;
  const seen = new Map();
  const same = [];
  for (const [k, s] of Object.entries(Spells)) {
    const j = job(s);
    if (seen.has(j)) same.push(`${seen.get(j)} = ${k}`);
    else seen.set(j, k);
  }
  check('iki büyü aynı işi yapmıyor', same.length === 0, same.join(', '));
}

// --- her büyü gerçekten bir şey yapıyor mu --------------------------------------------------

for (const key of spellKeys) {
  const s = begin(42);
  s.spells = { [key]: 1 };
  s.cools = { [key]: 0 };
  for (let i = 0; i < 6; i++) spawn(s, 'walker', (i / 6) * Math.PI * 2);
  // Nova'nın yarıçapının içinde dursunlar, yoksa test büyüyü değil mesafeyi ölçer.
  for (const f of s.foes) f.r = 140;
  const mine = new Set(s.foes.map((f) => f.id));
  const before = s.foes.reduce((a, f) => a + f.hp, 0);
  // SADECE başta koyduklarım sayılır: ilk yazdığımda sahadaki toplam canı ölçüyordum ve o sekiz
  // saniye boyunca yenileri doğduğu için toplam ARTIYORDU - test, hiç hasar verilmedi diyordu.
  for (let i = 0; i < 60 * 8; i++) step(s, 1 / 60);
  const after = s.foes.filter((f) => mine.has(f.id)).reduce((a, f) => a + f.hp, 0);
  check(`${Spells[key].name} bir şeye hasar veriyor`, after < before * 0.9,
    `${before.toFixed(0)} -> ${after.toFixed(0)}`);
}

// --- seviye atlama ------------------------------------------------------------------------------

check('ilk seviye iki öldürmeye geliyor', xpFor(1) === 2, String(xpFor(1)));
check('her seviye bir öncekinden pahalı', [1, 2, 3, 5, 9].every((n) => xpFor(n + 1) > xpFor(n)));

{
  const s = begin(7);
  s.xp = 99;
  step(s, 1 / 60);
  check('yeterli deneyim seçim ekranını açıyor', s.phase === 'picking' && s.choices.length === 3);
  check('seçenekler birbirinden farklı',
    new Set(s.choices.map((c) => c.what + c.key)).size === s.choices.length);
  const had = Object.keys(s.spells).length + Object.keys(s.passives).length;
  take(s, 0);
  check('seçim oyunu devam ettiriyor', s.phase === 'playing');
  check('seçilen şey gerçekten alınıyor',
    Object.keys(s.spells).length + Object.keys(s.passives).length >= had);
}

{
  const s = begin(8);
  s.spells = { bolt: MostLevel, fireball: MostLevel };
  check('tavana vuran büyü tekrar sunulmuyor',
    !offer(s).some((p) => p.what === 'spell' && s.spells[p.key] >= MostLevel));
}

{
  const s = begin(9);
  s.spells = {};
  for (const k of spellKeys.slice(0, MostSpells)) s.spells[k] = 1;
  check('altı büyüden sonra yeni büyü sunulmuyor',
    !offer(s).some((p) => p.what === 'spell' && !s.spells[p.key]));
}

// --- pasifler ------------------------------------------------------------------------------

{
  const s = begin(10);
  const plain = damageOf(s, 'bolt');
  s.passives.might = 2;
  check('güç her şeyin hasarını artırıyor', damageOf(s, 'bolt') > plain * 1.25);
  const slow = everyOf(s, 'bolt');
  s.passives.haste = 3;
  check('çeviklik bekleme süresini kısaltıyor', everyOf(s, 'bolt') < slow);
  check('erim patlama yarıçapını büyütüyor', reach({ passives: { reach: 2 } }) > 1.3);
}

{
  const s = begin(11);
  s.wall = 40;
  s.passives.mend = 2;
  step(s, 1);
  check('tamir duvarı onarıyor', s.wall > 40);
  s.wall = s.maxWall;
  step(s, 1);
  check('tamir duvarı tavanın üstüne çıkarmıyor', s.wall <= s.maxWall);
}

// --- tıklamak ---------------------------------------------------------------------------------

{
  const s = begin(12);
  const cold = haste(s);
  for (let i = 0; i < 20; i++) click(s);
  check('tıklamak büyüleri hızlandırıyor', haste(s) > cold * 1.4);
  check('ısı tavanı aşmıyor', s.heat <= 1 + 1e-9);
  for (let i = 0; i < 200; i++) step(s, 1 / 60);
  check('ısı kendiliğinden soğuyor', s.heat === 0);
}

// --- bölüm --------------------------------------------------------------------------------------

{
  // Hiç büyüsü olmayan bir büyücü düşmeli, yoksa kaybetmek diye bir şey yok
  const s = begin(13);
  s.spells = {};
  s.cools = {};
  for (let i = 0; i < 60 * 300 && s.phase === 'playing'; i++) step(s, 1 / 60);
  check('savunmasız duvar yıkılıyor', s.phase === 'lost', `${s.t.toFixed(0)} saniye`);
}

{
  // Bölümün sonunda patron gelmeli, yoksa bölümün bitişi diye bir şey yok
  const s = begin(14);
  s.spells = {}; s.cools = {};
  s.stageT = StageWaves - 0.005;
  step(s, 1 / 60);
  check('bölümün sonunda patron geliyor', !!s.boss && s.boss.boss === true);
  check('patron diğerlerinden çok daha dayanıklı',
    s.boss.maxHp > Kinds.brute.hp * 5, `${s.boss.maxHp.toFixed(0)}`);
}

{
  // Patron ölünce bölüm geçilmeli: duvar onarılsın, bedava kart gelsin, sıradaki bölüm başlasın
  const s = begin(15);
  s.spells = {}; s.cools = {};
  s.stageT = StageWaves;
  step(s, 1 / 60);
  s.wall = 100;
  s.boss.hp = 0;
  step(s, 1 / 60);
  check('patron ölünce bölüm geçiliyor', s.stage === 2 && s.boss === null);
  check('bölüm geçince duvar onarılıyor', s.wall > 100, `${s.wall.toFixed(0)}`);
  check('bölüm geçince bedava kart geliyor', s.phase === 'picking' && s.cleared === true);
  take(s, 0);
  check('bedava karttan sonra bayrak iniyor', s.cleared === false && s.phase === 'playing');
}

{
  const s = begin(16);
  s.spells = {}; s.cools = {};
  s.stageT = StageWaves;
  step(s, 1 / 60);
  const hard = s.boss.maxHp;
  const t = begin(16);
  t.spells = {}; t.cools = {};
  t.stage = 4;
  t.stageT = StageWaves;
  step(t, 1 / 60);
  check('sonraki bölümlerin patronu daha güçlü', t.boss.maxHp > hard * 2, `${hard.toFixed(0)} -> ${t.boss.maxHp.toFixed(0)}`);
}

{
  const s = begin(17);
  check('patron normal dalgadan çıkmıyor', (() => {
    for (let i = 0; i < 400; i++) { s.t = i; spawn(s); }
    return !s.foes.some((f) => f.boss);
  })());
}

{
  const s = begin(15);
  spawn(s, 'walker', 0);
  const start = s.foes[0].r;
  for (let i = 0; i < 60; i++) step(s, 1 / 60);
  check('düşmanlar duvara doğru yürüyor', s.foes[0] && s.foes[0].r < start);
}

{
  const warm = begin(16);
  warm.spells = {}; warm.cools = {};
  const a = spawn(warm, 'walker', 0);
  const from = a.r;
  for (let i = 0; i < 60; i++) step(warm, 1 / 60);
  const plain = from - warm.foes[0].r;

  const cold = begin(16);
  cold.spells = {}; cold.cools = {};
  const b = spawn(cold, 'walker', 0);
  b.chill = 5;
  for (let i = 0; i < 60; i++) step(cold, 1 / 60);
  const slowed = from - cold.foes[0].r;
  check('soğuyan düşman yavaşlıyor', slowed < plain * 0.7, `${slowed.toFixed(0)} vs ${plain.toFixed(0)}`);
}

// --- the bot -----------------------------------------------------------------------------------

/** Makul bir oyuncu: saniyede altı tıklar, seçimde yeni büyüyü tercih eder. */
function botRun(seed, clicksPerSecond = 6) {
  const s = begin(seed);
  const dt = 1 / 60;
  let since = 0;
  let guard = 0;
  while ((s.phase === 'playing' || s.phase === 'picking') && guard++ < 60 * 400) {
    if (s.phase === 'picking') {
      const i = s.choices.findIndex((c) => c.what === 'spell' && !c.up);
      take(s, i >= 0 ? i : 0);
      continue;
    }
    since += dt;
    if (since >= 1 / clicksPerSecond) { since = 0; click(s); }
    step(s, dt);
    s.events.length = 0;
  }
  return { t: s.t, stage: s.stage, level: s.level, kills: s.kills, wall: s.wall };
}

const runs = [];
for (let i = 1; i <= 60; i++) runs.push(botRun(i * 7919));
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
const lived = runs.map((r) => r.t).sort((a, b) => a - b);
const levels = runs.map((r) => r.level).sort((a, b) => a - b);
const stages = runs.map((r) => r.stage).sort((a, b) => a - b);
const reached = (n) => runs.filter((r) => r.stage > n).length / runs.length;

console.log('saniyede 6 tıklayan bir oyuncu, 60 koşu:');
console.log(`  dayanma   en kısa ${fmt(lived[0])}   ortanca ${fmt(lived[30])}   en uzun ${fmt(lived[59])}`);
console.log(`  bölüm     en düşük ${stages[0]}   ortanca ${stages[30]}   en yüksek ${stages[59]}`);
console.log(`  seviye    en düşük ${levels[0]}   ortanca ${levels[30]}   en yüksek ${levels[59]}`);
console.log(`  1. bölümü geçen %${(reached(1) * 100).toFixed(0)}   2'yi %${(reached(2) * 100).toFixed(0)}   3'ü %${(reached(3) * 100).toFixed(0)}   4'ü %${(reached(4) * 100).toFixed(0)}`);

const slow = [];
for (let i = 1; i <= 40; i++) slow.push(botRun(i * 104729, 1).t);
slow.sort((a, b) => a - b);
console.log(`  neredeyse hiç tıklamayan (1/sn): ortanca ${fmt(slow[20])}`);

// Birinci bölümü neredeyse herkes geçmeli - ilk oturuşta hiçbir şey başaramayan oyuncu geri
// gelmez. Ama hiç kimsenin düşmediği bir oyun da oyun değil.
check('ilk bölümü çoğu oyuncu geçiyor', reached(1) > 0.7, `%${(reached(1) * 100).toFixed(0)}`);
check('koşu bir yerde bitiyor', stages[59] < 20, `en yüksek bölüm ${stages[59]}`);
check('bölümler gerçekten zorlaşıyor', reached(3) < reached(1) * 0.9,
  `1: %${(reached(1) * 100).toFixed(0)}  3: %${(reached(3) * 100).toFixed(0)}`);
check('oyuncu bir sürü seçim yapıyor', levels[30] >= 12, `ortanca seviye ${levels[30]}`);
check('tıklamak işe yarıyor', lived[30] > slow[20] * 1.08, `6/sn ${fmt(lived[30])} vs 1/sn ${fmt(slow[20])}`);

console.log('');
if (failures.length) {
  console.log(`${failures.length} KONTROL DÜŞTÜ:`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${passed} kontrol geçti`);

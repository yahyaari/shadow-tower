// Kurallar + bir bot. Tarayıcı yok.
//
// Bu türde tek bir soru var ve gözle cevaplanamaz: eğri doğru mu? Oyun gerçek zamanlı olduğu
// için tarayıcıda bir koşuyu izlemek dakikalar sürüyor; burada aynı koşu milisaniyelerde bitiyor,
// yüzlercesi birden koşuyor.
//
//   node Tools/test.mjs

import {
  begin, step, click, buy, canBuy, costOf, spawn, spawnEvery, pressure,
  damageOf, rateOf, gainOf, Costs, Kinds, Base, Heat, Arena, Reach,
} from '../src/rules.js';

let passed = 0;
const failures = [];
const check = (what, ok, detail = '') => {
  if (ok) { passed++; return; }
  failures.push(`${what}${detail ? ' — ' + detail : ''}`);
};

// --- the numbers ----------------------------------------------------------------------------

check('her yükseltmenin bedeli, adı ve açıklaması var',
  Object.values(Costs).every((c) => c.first > 0 && c.step > 1 && c.says && c.tells));

check('yükseltme bedelleri hep artıyor',
  ['damage', 'rate', 'gain'].every((k) => costOf(k, 5) > costOf(k, 4) && costOf(k, 1) > costOf(k, 0)));

check('ilk yükseltme ilk saniyelerde alınabilir',
  Math.min(...Object.values(Costs).map((c) => c.first)) <= 10,
  `en ucuzu ${Math.min(...Object.values(Costs).map((c) => c.first))}`);

check('üç düşman türü de birbirinden farklı',
  new Set(Object.values(Kinds).map((k) => `${k.speed}/${k.hp}`)).size === 3);

// --- clicking -------------------------------------------------------------------------------

{
  const s = begin(1);
  spawn(s, 'walker', 0);
  const before = s.shots.length;
  click(s);
  check('tıklamak ateş ediyor', s.shots.length === before + 1);
  check('tıklamak ısıtıyor', s.heat > 0);
}

{
  const s = begin(2);
  spawn(s, 'walker', 0);
  for (let i = 0; i < 50; i++) click(s);
  check('ısı tavanı aşmıyor', s.heat <= Heat.most + 1e-9, String(s.heat));
  check('arka arkaya tıklamak sınırsız mermi vermiyor', s.shots.length < 50, `${s.shots.length} mermi`);
}

{
  const s = begin(3);
  const cold = rateOf(s);
  s.heat = Heat.most;
  check('ısı atış hızını artırıyor', rateOf(s) > cold * 1.5, `${cold.toFixed(2)} -> ${rateOf(s).toFixed(2)}`);
  for (let i = 0; i < 200; i++) step(s, 1 / 60);
  check('ısı kendiliğinden soğuyor', s.heat === 0);
}

{
  const s = begin(4);
  s.coins = 999;
  const before = damageOf(s);
  buy(s, 'damage');
  check('yükseltme para harcıyor ve işe yarıyor', s.coins < 999 && damageOf(s) > before);
  s.coins = 0;
  check('parası yetmeyen yükseltme alınmıyor', buy(s, 'damage') === false && canBuy(s, 'damage') === false);
}

// --- the fight ------------------------------------------------------------------------------

{
  const s = begin(5);
  const f = spawn(s, 'walker', 0);
  for (let i = 0; i < 60 * 20; i++) step(s, 1 / 60);
  check('bir düşman öldürülebiliyor', s.kills > 0);
  check('öldürmek para veriyor', s.coins > 0);
}

{
  // Hiç ateş etmeyen bir kule yenmeli: yoksa kaybetmek diye bir şey yok
  const s = begin(6);
  s.levels.damage = -2;        // silahı etkisiz kıl
  for (let i = 0; i < 60 * 120 && s.alive; i++) step(s, 1 / 60);
  check('savunmasız kule düşüyor', !s.alive, `${s.t.toFixed(0)} saniye dayandı`);
}

{
  const s = begin(7);
  const early = spawnEvery(s);
  s.t = 180;
  check('zamanla daha sık geliyorlar', spawnEvery(s) < early * 0.5, `${early.toFixed(2)} -> ${spawnEvery(s).toFixed(2)}`);
  check('geliş aralığının bir tabanı var', spawnEvery({ ...s, t: 100000 }) > 0.05);
}

{
  const s = begin(8);
  const f = spawn(s, 'walker', 0);
  const start = f.r;
  for (let i = 0; i < 60; i++) step(s, 1 / 60);
  check('düşmanlar kuleye doğru yürüyor', s.foes[0] && s.foes[0].r < start);
}

// --- the bot --------------------------------------------------------------------------------

/**
 * Makul bir oyuncu: saniyede altı kere tıklar ve parası yettiğinde en ucuz yükseltmeyi alır.
 *
 * Altı, sürdürülebilir bir tempo. Saniyede yirmi tıklayan bir bot, oyunun fare hızı testi olup
 * olmadığını söylemez - sadece botun fare olmadığını söyler.
 */
function botRun(seed, clicksPerSecond = 6, cap = 900) {
  const s = begin(seed);
  const dt = 1 / 60;
  let sinceClick = 0;
  const marks = {};
  while (s.alive && s.t < cap) {
    sinceClick += dt;
    if (sinceClick >= 1 / clicksPerSecond) { sinceClick = 0; click(s); }
    // en ucuzunu al, hangisi olursa
    for (;;) {
      const best = ['damage', 'rate', 'gain']
        .map((k) => ({ k, c: costOf(k, s.levels[k]) }))
        .sort((a, b) => a.c - b.c)
        .find((x) => s.coins >= x.c);
      if (!best) break;
      buy(s, best.k);
    }
    step(s, dt);
    s.events.length = 0;
    for (const m of [30, 60, 120, 180]) if (!marks[m] && s.t >= m) marks[m] = { hp: s.hp, kills: s.kills, upgrades: s.levels.damage + s.levels.rate + s.levels.gain };
  }
  return { lived: s.t, kills: s.kills, levels: s.levels, marks, survived: s.alive };
}

const runs = [];
for (let i = 1; i <= 60; i++) runs.push(botRun(i * 7919));
const lived = runs.map((r) => r.lived).sort((a, b) => a - b);
const mid = lived[Math.floor(lived.length / 2)];
const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

console.log('saniyede 6 tıklayan bir oyuncu, 60 koşu:');
console.log(`  bir koşu   en kısa ${fmt(lived[0])}   ortanca ${fmt(mid)}   en uzun ${fmt(lived[lived.length - 1])}`);
for (const m of [30, 60, 120, 180]) {
  const got = runs.map((r) => r.marks[m]).filter(Boolean);
  if (!got.length) { console.log(`  ${m}. saniye  kimse göremedi`); continue; }
  const avg = (f) => (got.reduce((a, g) => a + f(g), 0) / got.length).toFixed(0);
  console.log(`  ${String(m).padStart(3)}. saniye  can ${avg((g) => g.hp)}   ${avg((g) => g.kills)} ölü   ${avg((g) => g.upgrades)} yükseltme`);
}

const slow = [];
for (let i = 1; i <= 40; i++) slow.push(botRun(i * 104729, 2).lived);
slow.sort((a, b) => a - b);
console.log(`  yavaş tıklayan (2/sn): ortanca ${fmt(slow[Math.floor(slow.length / 2)])}`);

// Bir koşu bitmeli: sonsuza kadar ayakta kalan bir kule, yükseltmelerin hiçbirinin önemi
// olmadığını söyler - alsan da almasan da aynı yere varıyorsun.
check('koşu bir yerde bitiyor', runs.every((r) => !r.survived), `${runs.filter((r) => r.survived).length} koşu 15 dakikayı geçti`);
check('bir koşu en az iki dakika sürüyor', mid > 120, `ortanca ${fmt(mid)}`);
check('bir koşu on dakikayı geçmiyor', mid < 600, `ortanca ${fmt(mid)}`);

// Ve tıklamak işe yaramalı. Hızlı tıklayanla yavaş tıklayan aynı yere varıyorsa, oyunun
// adı clicker ama kendisi değil.
check('tıklamak koşuyu uzatıyor', mid > slow[Math.floor(slow.length / 2)] * 1.15,
  `6/sn ${fmt(mid)} vs 2/sn ${fmt(slow[Math.floor(slow.length / 2)])}`);

console.log('');
if (failures.length) {
  console.log(`${failures.length} KONTROL DÜŞTÜ:`);
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(`${passed} kontrol geçti`);

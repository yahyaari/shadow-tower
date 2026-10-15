// Bir sayıyı değiştirip sonucunu görmek için. Hızlı, dar, ve hiçbir şeyi doğrulamaz.
//
// `test.mjs` bütün dengeyi süpürüyor ve beş dakikalık bölümlerle bu dakikalar sürüyor — bir
// sayıyı dört kez denemek için yarım gün demek. Bu araç sadece istenen bölümleri, istenen
// sayıda koşuyla oynar ve tabloyu basar. AYNI BOTU kullanır, kendi kopyasını değil.
//
//   node Tools/tune.mjs                      1-5. bölüm, 20 koşu
//   node Tools/tune.mjs 1,3,5,8 40           seçilen bölümler, 40 koşu
//   node Tools/tune.mjs 3 40 five            beş büyülü loadout ile

import { botRun, Four, Five, fmt } from './bot.mjs';
import { StageWaves, RampOver, pressure, CarrySize, LoadoutSize } from '../src/rules.js';

const stages = (process.argv[2] ?? '1,2,3,4,5').split(',').map(Number);
const runs = Number(process.argv[3] ?? 20);
const kit = process.argv[4] === 'five' ? Five : Four;

const at = (t) => (1 + Math.max(0, t - 25) / RampOver);
console.log(`bölüm ${StageWaves} saniye · tırmanma böleni ${RampOver} ` +
  `(açılış ×1.00 → orta ×${at(StageWaves / 2).toFixed(2)} → son ×${at(StageWaves).toFixed(2)})`);
console.log(`loadout ${kit.length} büyü (getir ${LoadoutSize}, sahada ${CarrySize}) · ${runs} koşu\n`);
console.log('bölüm  bitirme   süre    yıldız (1/2/3)   ortanca seviye/dönüşüm/öldürme  taşınan');

const orta = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const stage of stages) {
  const out = [];
  for (let i = 1; i <= runs; i++) out.push(botRun(i * 7919, kit, stage));
  const done = out.filter((r) => r.done);
  const times = done.map((r) => r.t).sort((a, b) => a - b);
  const spread = [1, 2, 3].map((n) => out.filter((r) => r.done && r.stars === n).length);
  console.log(`  ${String(stage).padStart(2)}    %${String(Math.round(done.length / out.length * 100)).padStart(3)}   ` +
    `${(times.length ? fmt(orta(times)) : ' -- ').padStart(5)}    ` +
    `${spread.join(' / ').padEnd(14)}   ` +
    `${orta(out.map((r) => r.level))} / ${orta(out.map((r) => r.evos))} / ${orta(out.map((r) => r.kills))}` +
    `${String(orta(out.map((r) => r.carried))).padStart(10)}`);
}

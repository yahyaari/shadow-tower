// Bir sayiyi degistirip hem kalabaligi hem bitirmeyi birlikte gormek icin. Gecici.
import { botRun, Five } from './bot.mjs';
const mid = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const stage of [1, 3, 5]) {
  const at = {}, done = [], wall = [];
  for (let i = 1; i <= 16; i++) {
    const r = botRun(i * 7919, Five, stage);
    done.push(r.done);
    if (r.done) wall.push(Math.round(r.wall / r.maxWall * 100));
    for (const row of r.trace) (at[row.t] = at[row.t] || []).push(row.foes);
  }
  const ts = Object.keys(at).map(Number).sort((a, b) => a - b);
  console.log(`b${stage}: %${String(Math.round(done.filter(Boolean).length / 16 * 100)).padStart(3)} · ` +
    `duvar %${wall.length ? mid(wall) : '-'} · sahada ${ts.map((t) => mid(at[t])).join(' ')}`);
}

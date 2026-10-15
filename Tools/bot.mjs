// Makul bir oyuncu: saniyede altı tıklar, kartları puanlar, tek bir bölüm oynar.
//
// Kendi dosyasında, çünkü iki yer onu kullanıyor: `test.mjs` dengeyi doğruluyor, `tune.mjs` bir
// sayıyı elde ederken hızlıca ölçüyor. İKİNCİ BİR BOT YAZMAK bu projede zaten bir kez yapıldı ve
// oyunun olduğundan çok daha zor olduğunu söyledi — çünkü o kopya hep sıfırıncı kartı alıyordu.
// Tek bot, tek puanlama, tek sonuç.

import { begin, step, click, take, carrying } from '../src/rules.js';
import { starsFor } from '../src/meta.js';
import { totals as heroTotals } from '../src/hero.js';

/** Bir koşunun ne kadar ince adımlandığı. Oyunun kendisi değişken adımla çalışır. */
export const BotDt = 1 / 60;

/**
 * `neutral` her yaratığı, kare kare, direnci olmayan aileye geri çeker.
 *
 * Bir ailenin gerçekte ne ettiğini ölçmenin tek yolu bu. İki loadout'u karşılaştırmak direnci
 * aradaki büyülerin ham gücüyle, iki bölümü karşılaştırmak o bölümlerin zorluğuyla karıştırır;
 * aynı tohum, aynı loadout, aynı bölüm, tablo açık ve kapalı — hiçbir şeyle karıştırmaz.
 */
export function botRun(seed, loadout, stage = 1, clicksPerSecond = 6, hero = 0, spellAt = 1,
                       neutral = false, dt = BotDt) {
  const levels = Object.fromEntries(loadout.map((k) => [k, spellAt]));
  const s = begin(seed, loadout, stage, heroTotals(hero), levels);
  let since = 0;
  let guard = 0;
  const most = Math.ceil(620 / dt);
  while ((s.phase === 'playing' || s.phase === 'picking') && guard++ < most) {
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
    carried: carrying(s).length,
    stars: s.phase === 'done' ? starsFor(s.wall, s.maxWall) : 0,
    evos: carrying(s).reduce((a, k) => a + s.kit[k].evos.length, 0),
  };
}

export const Four = ['bolt', 'fireball', 'frost', 'lightning'];
export const Five = ['bolt', 'fireball', 'frost', 'lightning', 'shards'];
export const fmt = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;

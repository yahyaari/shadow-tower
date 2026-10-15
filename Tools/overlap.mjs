// Ekrandaki YAZILARIN üst üste binip binmediğine bakar.
//
// Bu, kaynak koda bakarak bulunamayan tek kusur: iki etiketi iki ayrı fonksiyon yazıyor,
// boyutları pencereye bağlı, ve ancak belirli genişliklerde birbirine değiyorlar. O yüzden koda
// değil ekranın kendisine soruyoruz: `draw.js` çizdiği her yazının kutusunu kaydediyor, burası da
// o kutuları ikişer ikişer kesiştiriyor.
//
//   node Tools/overlap.mjs <url> [genislik] [yukseklik]

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const url = process.argv[2] ?? 'http://127.0.0.1:8050/';
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
// Türkçe sözcükler İngilizcelerinden uzun. Aynı kutuya sığan bir yazı, öteki dilde sığmayabilir,
// o yüzden tarama iki dilde de yapılmalı.
const LANG = process.argv[5] ?? 'en';
const phone = H > W;

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9400 + (process.pid % 200);
const profile = join(tmpdir(), 'overlap-edge-' + Date.now());
mkdirSync(profile, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watchdog = setTimeout(() => { console.log('ZAMAN AŞIMI'); browser.kill(); process.exit(2); }, 120000);

let target;
for (let i = 0; i < 60 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
  } catch { /* hazır değil */ }
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let nextId = 1;
const pending = new Map();
const log = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') {
    log.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`${method} cevap vermedi`)), 30000);
  pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (e) => {
  const r = (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result;
  if (r?.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',
  { width: W, height: H, deviceScaleFactor: phone ? 2 : 1, mobile: phone });
await send('Page.navigate', { url });

const deadline = Date.now() + 20000;
while (Date.now() < deadline && !log.some((l) => l.includes('[ShadowTower] ready'))) await sleep(200);
if (!log.some((l) => l.includes('[ShadowTower] ready'))) {
  console.log('OYUN ACILMADI: ' + url);
  clearTimeout(watchdog);
  browser.kill();
  process.exit(3);
}
await sleep(400);

/**
 * Bir karedeki bütün yazıları alıp kesişenleri döndürür.
 *
 * Eşik piksel değil ORAN: iki kutunun kesiştiği alan, küçük olanın en az beşte biri olmalı.
 * Yoksa bir harfin kuyruğunun yanındakine bir piksel değmesi de hata sayılırdı ve liste
 * okunmayacak kadar uzardı. Tamamen saydam yazılar atlanıyor.
 */
const SNIFF = `(() => {
  const S = window.ShadowTower.spy;
  const b = (S.done || []).filter((t) => t.alpha > 0.08 && t.text.trim() && t.w > 0);
  const hits = [];
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) {
      const A = b[i], B = b[j];
      // Ayri katmandakiler cakismaz: bir pano haritanin USTUNE ciziliyor, yani haritanin yazisi
      // kagit uzerinde panonunkiyle kesisiyor ama oyuncu sadece birini goruyor.
      if (A.layer !== B.layer) continue;
      const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (oy <= 0) continue;                       // ayri satirlardalar
      const least = Math.min(A.w * A.h, B.w * B.h);
      if (ox > 0 && ox * oy >= least * 0.15) {
        hits.push({
          kind: 'ustuste',
          a: A.text, b: B.text,
          over: Math.round(ox) + 'x' + Math.round(oy),
          at: Math.round(Math.max(A.x, B.x)) + ',' + Math.round(Math.max(A.y, B.y)),
          part: Math.round(((ox * oy) / least) * 100),
        });
        continue;
      }
      // Degmiyor ama nefes almiyor. Uc pikselden yakin duran iki sey, bir sonraki dilde ya da
      // bir sonraki ekran genisliginde degen iki seydir - ve oyuncu zaten bitisik okuyor.
      if (ox > -3 && ox <= 0 && Math.min(A.h, B.h) > 6) {
        hits.push({
          kind: 'bitisik',
          a: A.text, b: B.text,
          over: Math.round(-ox) + 'px boşluk',
          at: Math.round(Math.max(A.x, B.x)) + ',' + Math.round(Math.max(A.y, B.y)),
          part: 0,
        });
      }
    }
  }
  return JSON.stringify({ many: b.length, hits });
})()`;

const set = async (js) => { await evaluate(`(() => { ${js} return true; })()`); await sleep(260); };

async function sniff(name) {
  await evaluate(`(() => { window.ShadowTower.spy.on = true; return true; })()`);
  await sleep(260);
  const raw = await evaluate(SNIFF);
  await evaluate(`(() => { window.ShadowTower.spy.on = false; return true; })()`);
  const { many, hits } = JSON.parse(raw);
  if (!hits.length) { console.log(`  ${name}: ${many} yazı, temiz`); return 0; }
  console.log(`  ${name}: ${many} yazı, ${hits.length} ÇAKIŞMA`);
  for (const t of hits) {
    const how = t.kind === 'ustuste' ? `${t.over} px (${t.part}%)` : t.over;
    console.log(`     [${t.kind}] "${t.a}"  <->  "${t.b}"   ${how} @ ${t.at}`);
  }
  return hits.length;
}



await set(`const d = window.ShadowTower.meta; d.lang = '${LANG}';
  window.ShadowTower.setLanguage('${LANG}');`);

// Dolu bir hesap: bos bir hesapta cogu yazi hic cizilmiyor, yani hic olculmuyor.
await set(`const d = window.ShadowTower.meta;
  d.level = 14; d.xp = 900; d.gold = 24000; d.gems = 4800; d.best = 12; d.stage = 3;
  d.stars = { 1: 3, 2: 2, 3: 1, 4: 3, 5: 2, 6: 1, 7: 3 };
  d.loadout = ['bolt', 'fireball', 'lightning', 'frost'];
  // ALAN ADI \`spell\`, \`spells\` DEGIL. Yanlis alani doldurunca butun buyuler 1. seviyede kaldi,
  // "SV n" rozeti hic cizilmedi ve arac o yuzden temiz dedi - oysa kusur tam oradaydi.
  d.spell = { bolt: 6, fireball: 3, lightning: 10, frost: 9, shards: 2, orbit: 4, wisp: 7, nova: 5 };
  for (const k of ['bolt','fireball','lightning','frost','shards','orbit','wisp','nova'])
    d.shards[k] = 140;`);

let bad = 0;
for (const tab of ['map', 'wheel', 'hero', 'spells', 'codex']) {
  await set(`window.ShadowTower.meta.tab = '${tab}';`);
  bad += await sniff('sekme:' + tab);
}

await set(`window.ShadowTower.meta.spellTab = 'raise';`);
bad += await sniff('büyüler: yükseltme');
await set(`window.ShadowTower.meta.spellTab = 'loadout'; window.ShadowTower.meta.tab = 'map';`);

for (const key of ['jobs', 'week', 'feats', 'news']) {
  await set(`window.ShadowTower.show.board = '${key}';`);
  bad += await sniff('pano:' + key);
}
await set(`window.ShadowTower.show.board = null;`);

await set(`window.ShadowTower.show.settings = true;`);
bad += await sniff('ayarlar');
await set(`window.ShadowTower.show.settings = false;`);

// --- kosu ekrani
await set(`const m = window.ShadowTower; m.start();
  const s = m.state;
  s.stage = 7; s.level = 19;
  s.kit.bolt = { tier: 4, taken: 16, boosts: { more: 1, pierce: 1, hit: 3 }, evos: ['split','burst'] };
  s.kit.fireball = { tier: 3, taken: 11, boosts: { wider: 2 }, evos: ['fire'] };
  s.kit.frost = { tier: 2, taken: 6, boosts: { deep: 2 }, evos: [] };
  for (const k of ['fireball','frost']) { s.cools[k] = 0.4; if (!s.loadout.includes(k)) s.loadout.push(k); }
  s.passives = { mend: 3 };
  s.phase = 'playing'; s.wall = s.maxWall * 0.6; m.show.hint = false;`);
bad += await sniff('koşu: saha');

await set(`window.ShadowTower.show.paused = 'cards';`);
bad += await sniff('koşu: kartlar');
await set(`window.ShadowTower.show.paused = 'menu';`);
bad += await sniff('koşu: duraklat');
await set(`window.ShadowTower.show.paused = null;`);

await set(`const m = window.ShadowTower, s = m.state;
  s.phase = 'picking';
  s.choices = m.state.choices && m.state.choices.length ? s.choices
    : [{ what: 'spell', key: 'nova' }, { what: 'boost', key: 'bolt', boost: 'more' },
       { what: 'evolution', key: 'fireball', evo: 'fire' }];`);
bad += await sniff('koşu: kartlar ekranı');

await set(`const m = window.ShadowTower, s = m.state;
  s.phase = 'done'; s.wall = s.maxWall * 0.97;
  m.show.booked = false; m.show.won = null; m.show.adsDouble = 3; m.show.nextStage = 8;`);
await sleep(300);
await set(`window.ShadowTower.show.adsDouble = 3;`);
bad += await sniff('koşu: bitiş');

await set(`const m = window.ShadowTower, s = m.state;
  s.phase = 'lost'; m.show.booked = true;`);
bad += await sniff('koşu: kayıp');

console.log(bad ? `\nTOPLAM ${bad} ÇAKIŞMA (${W}x${H})` : `\nhiç çakışma yok (${W}x${H})`);

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
process.exit(bad ? 1 : 0);

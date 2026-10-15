// Tanıtım videosu: oyunu kendisi oynatır ve kaydeder.
//
//   node Tools/promo.mjs http://127.0.0.1:8050/Tools/promo.html Logs/promo
//
// CrazyGames'in şartları:
//   15-20 saniye · SES YOK · hızlandırma yok · siyah geçiş yok · imleç yok · yazı yok
//   yatay 1920x1080 ve dikey 1080x1620 (2:3), ikisi de zorunlu
//   "açılış karesi statik kapağın olsun"
//
// POTION MIX'TEN KALAN DERS: yenilgiyle biten bir tanıtım, oynamamak için reklamdır. Burada
// kayıt donanımlı bir hesapla ve geçilmiş bir bölümde yapılıyor, yani kazanan bir koşu çekiliyor.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const url = process.argv[2] ?? 'http://127.0.0.1:8050/Tools/promo.html';
const outDir = process.argv[3] ?? 'Logs/promo';

/** Kapak kaç milisaniye durur, ve toplam kaç saniye kaydedilir. */
const CoverMs = 1300;
const TotalMs = 18000;

const Sizes = [
  ['video_yatay_1920x1080', 1920, 1080],
  ['video_dikey_1080x1620', 1080, 1620],
];

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9800 + (process.pid % 150);
const profile = join(tmpdir(), 'promo-edge-' + Date.now()).split('\\').join('/');
mkdirSync(outDir, { recursive: true });
mkdirSync(profile, { recursive: true });

const browser = spawn(EDGE, [
  // SwiftShader YOK. Yazılım render'ı 1920x1080'de saniyede üç kare çiziyordu ve o hızda
  // kaydedilen bir video slayt gösterisidir. Fotoğraf araçları yazılım render'ıyla kalabilir -
  // onlar tek kare çekiyor - ama bu on sekiz saniye boyunca akmak zorunda.
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1920,1080', '--no-first-run', '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watchdog = setTimeout(() => { console.log('ZAMAN AŞIMI'); browser.kill(); process.exit(2); }, 240000);

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
  const timer = setTimeout(() => reject(new Error(`${method} cevap vermedi`)), 60000);
  pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (e) => {
  const r = (await send('Runtime.evaluate', {
    expression: e, returnByValue: true, awaitPromise: true,
  })).result;
  if (r?.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });

const deadline = Date.now() + 20000;
while (Date.now() < deadline && !log.some((l) => l.includes('[promo] ready'))) await sleep(200);
if (!log.some((l) => l.includes('[promo] ready'))) {
  console.log('SAYFA ACILMADI: ' + url);
  for (const l of log) console.log('  ' + l);
  clearTimeout(watchdog);
  browser.kill();
  process.exit(3);
}
await sleep(600);

/**
 * Gösterilecek koşu.
 *
 * Bu bir ÖLÇÜM DEĞİL, bir gösteri: buradan hiçbir sonuç çıkarılmıyor ve çıkarılmamalı. Dengeyi
 * `Tools/test.mjs` ve `Tools/tune.mjs` ölçüyor, ikisi de `Tools/bot.mjs`'teki tek botu kullanıyor.
 * Buradaki otomatik pilot sadece ekranı dolu ve kazanıyor gösteriyor.
 */
const SETUP = `(() => {
  const m = window.promoGame();
  if (!m) return 'oyun yok';
  const d = m.meta;
  d.level = 16; d.gold = 30000; d.gems = 3000; d.best = 9; d.stage = 6;
  d.stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2, 6: 1 };
  d.done = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 1 };
  d.loadout = ['bolt', 'fireball', 'lightning', 'frost', 'shards'];
  d.spell = { bolt: 8, fireball: 7, lightning: 8, frost: 6, shards: 5 };
  d.hero = 28;
  d.energy = { at: 60, when: Date.now() };
  d.muted = true; d.music = false;
  m.setLanguage('en');
  m.sound.setMuted(true);
  m.music.setOn(false);
  m.start();

  const s = m.state;
  // Hazır bir el: ekran ilk saniyeden itibaren dolu olsun, kurulumu izlemeye gerek kalmasın.
  s.kit.fireball = { tier: 3, taken: 12, boosts: { wider: 2, sharper: 2 }, evos: ['fire'] };
  s.kit.lightning = { tier: 3, taken: 12, boosts: { sharper: 2 }, evos: ['storm'] };
  s.kit.frost = { tier: 2, taken: 7, boosts: { deep: 2 }, evos: [] };
  for (const k of ['fireball', 'lightning', 'frost']) s.cools[k] = 0.3;
  s.kit.bolt = { tier: 4, taken: 17, boosts: { more: 1, flank: 1, pierce: 1, hit: 3 }, evos: ['split', 'burst'] };
  s.passives = { mend: 2 };
  s.level = 22; s.xp = 0;
  // Dalganın tırmanmış hali: ilk kareden itibaren saha dolu olsun. Boş bir arena, oyunun ne
  // olduğunu anlatmayan bir tanıtımdır.
  s.t = 235; s.stageT = 235;
  s.wall = s.maxWall;
  m.show.hint = false;
  // Ve hemen bir halka: kayıt başlarken ekranda birileri olsun, ilk dalgayı beklemeyelim.
  for (let i = 0; i < 14; i++) {
    const f = m.spawnOne(s, ['walker', 'runner', 'brute'][i % 3], (i / 14) * Math.PI * 2 + 0.2);
    f.r = 190 + (i % 4) * 45;
  }
  return 'hazır';
})()`;

/**
 * Otomatik pilot: saniyede altı tıklar, kart ekranında bir seçer, ve video penceresine bir patron
 * sığdırır. Patron, tanıtımın parası olan kare.
 */
const PILOT = `(() => {
  const m = window.promoGame();
  const s = m.state;
  if (!s) return;
  if (s.phase === 'picking') {
    // Kart ekranı bir buçuk saniye dursun: oyunun ne olduğunu anlatan şey o seçim.
    if (!window.__pickAt) { window.__pickAt = performance.now(); return; }
    if (performance.now() - window.__pickAt < 1500) return;
    window.__pickAt = 0;
    const best = s.choices.findIndex((c) => c.what === 'evolution' || c.what === 'fusion');
    m.take(s, best >= 0 ? best : 0);
    return;
  }
  if (s.phase === 'playing') m.click(s);
})()`;

const bringBoss = `(() => {
  const s = window.promoGame().state;
  if (s && s.phase === 'playing' && !s.boss) { s.stageT = 1e9; s.t = Math.max(s.t, 200); }
  return true;
})()`;

for (const [name, w, h] of Sizes) {
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await evaluate(`window.promoSize(${w}, ${h})`);
  await sleep(500);

  const set = await evaluate(SETUP);
  if (set !== 'hazır') { console.log('  kurulum düştü: ' + set); continue; }
  await sleep(300);

  const type = await evaluate(`window.promoStart(${CoverMs})`);
  if (!type) { console.log('  BU TARAYICI KAYIT EDEMİYOR'); break; }

  const began = Date.now();
  let bossed = false;
  // Videoyu kimse izleyemiyor - ne ben, ne de bir test. O yüzden kayıt SIRASINDA birkaç kare de
  // fotoğraflanıyor: içinde ne olduğu ancak böyle görülebiliyor. Bakılmamış bir video,
  // gönderilmiş ama hiç açılmamış bir dosyadır.
  const shots = [300, 900, 2500, 8000, 16000];
  let shot = 0;
  while (Date.now() - began < TotalMs) {
    await evaluate(PILOT);
    if (!bossed && Date.now() - began > TotalMs * 0.68) { await evaluate(bringBoss); bossed = true; }
    if (shot < shots.length && Date.now() - began >= shots[shot]) {
      const png = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(outDir, `${name}_kare${shot + 1}.png`), Buffer.from(png.result.data, 'base64'));
      shot += 1;
    }
    await sleep(110);
  }

  // Kaç kare aktığı yazılıyor: yazılım render'ıyla bu sayı üçe düşüyordu ve o hızda kaydedilen
  // bir video slayt gösterisi oluyordu. Rakam görünmezse bir daha fark edilmez.
  const ran = await evaluate('window.promoDebug()');
  const fps = ran[5] / (TotalMs / 1000);
  console.log(`    ${Math.round(fps)} fps`);
  if (fps < 24) console.log('    UYARI: yirmi dördün altı, bu video akmıyor');
  const size = await evaluate(`window.promoStop()`);
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const file = join(outDir, `${name}.${ext}`);
  writeFileSync(file, Buffer.alloc(0));
  const Step = 600000;
  for (let at = 0; at < size; at += Step) {
    const b64 = await evaluate(`window.promoBytes(${at}, ${Step})`);
    appendFileSync(file, Buffer.from(b64, 'base64'));
  }
  console.log(`  ${name}.${ext}  ${(size / 1048576).toFixed(1)} MB  ${type}`);
}

const bad = log.filter((l) => l.toLowerCase().includes('error'));
if (bad.length) { console.log('KONSOLDA HATA:'); for (const l of bad) console.log('  ' + l); }

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
console.log('videolar hazır: ' + outDir);

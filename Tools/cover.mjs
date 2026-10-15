// Üç kapağı çizer ve PNG olarak kaydeder.
//
//   node Tools/cover.mjs http://127.0.0.1:8050/Tools/cover.html Logs/cover
//
// CrazyGames üçünü birden istiyor ve birbirine benzemelerini şart koşuyor; üçü de aynı sahneyi
// aynı tohumla çiziyor, sadece kompozisyon orana göre kayıyor.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const url = process.argv[2] ?? 'http://127.0.0.1:8050/Tools/cover.html';
const outDir = process.argv[3] ?? 'Logs/cover';

const Sizes = [
  ['kapak_yatay_1920x1080', 1920, 1080],
  ['kapak_dikey_800x1200', 800, 1200],
  ['kapak_kare_800x800', 800, 800],
];

// Ters bolu isareti yerine duz: bu dosya birkac kez ters bolunun yenildigi bir borudan
// gecti ve `C:Program Files` diye bir yol olustu. Node ikisini de kabul ediyor.
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9600 + (process.pid % 150);
const profile = join(tmpdir(), 'cover-edge-' + Date.now()).split('\\').join('/')
mkdirSync(outDir, { recursive: true });
mkdirSync(profile, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1920,1080', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--no-first-run', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watchdog = setTimeout(() => { console.log('ZAMAN AŞIMI'); browser.kill(); process.exit(2); }, 90000);

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
    log.push(m.params.args.map((a) => a.value ?? '').join(' '));
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`${method} cevap vermedi`)), 30000);
  pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (e) => {
  const r = (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result;
  if (r?.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  }
  return r?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });

const deadline = Date.now() + 15000;
while (Date.now() < deadline && !log.some((l) => l.includes('[cover] ready'))) await sleep(150);
if (!log.some((l) => l.includes('[cover] ready'))) {
  console.log('SAYFA ACILMADI: ' + url);
  for (const l of log) console.log('  ' + l);
  clearTimeout(watchdog);
  browser.kill();
  process.exit(3);
}

console.log('  kaynak: ' + await evaluate('window.paintReady()'));

for (const [name, w, h] of Sizes) {
  // Tuvali de pencereyi de tam boyuta getiriyoruz: ekran görüntüsü kırpılmış bir kapak değil,
  // kapağın kendisi olmalı.
  await send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  console.log('  ' + await evaluate(`window.paint(${w}, ${h})`));
  await sleep(200);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, name + '.png'), Buffer.from(shot.result.data, 'base64'));
  console.log(`  ${name}.png`);
}

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
console.log('kapaklar hazır: ' + outDir);

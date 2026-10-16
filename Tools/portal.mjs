// Oyunu PORTAL VARMIŞ GİBİ açar ve her ekranı gezer.
//
//   node Tools/portal.mjs http://127.0.0.1:8050/
//
// Bunun olmamasının bedeli ödendi: `ads.ready()` yerelde hep false olduğu için reklam butonlarının
// çizildiği ve basıldığı bütün kod yolları **tarayıcıda hiç çalışmadı**. CrazyGames'in QA
// ortamında SDK ilk kez vardı, o yollar ilk kez çalıştı ve oyun çark sekmesinde dondu.
//
// Sahte SDK sayfa YÜKLENMEDEN ÖNCE kuruluyor (`addScriptToEvaluateOnNewDocument`), çünkü
// `ads.open()` modül yüklenirken çalışıyor - sonradan kurulan bir SDK geç kalmış olur.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const url = process.argv[2] ?? 'http://127.0.0.1:8050/';
const outDir = process.argv[3] ?? 'Logs/portal';
const W = Number(process.argv[4] ?? 1280);
const H = Number(process.argv[5] ?? 720);

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9300 + (process.pid % 150);
const profile = join(tmpdir(), 'portal-edge-' + Date.now()).split('\\').join('/');
mkdirSync(outDir, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--no-first-run', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watchdog = setTimeout(() => { console.log('ZAMAN AŞIMI'); browser.kill(); process.exit(2); }, 150000);

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
let bad = 0;
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    log.push(`[${m.params.type}] ${text}`);
    if (m.params.type === 'error') bad += 1;
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    log.push(`[exception] ${d.exception?.description ?? d.text}`);
    bad += 1;
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
  { width: W, height: H, deviceScaleFactor: H > W ? 2 : 1, mobile: H > W });

// Sahte portal: gerçek SDK'nın imzası, ama hiçbir reklam oynamıyor. Basic Launch'ta CrazyGames
// zaten `adsDisabledBasicLaunch` döndürüyor, yani bu davranış gerçeğin ta kendisi.
// `--gercek` verilirse sahte SDK kurulmuyor: oyun `?sdk=1` ile açılıp CrazyGames'in KENDİ
// SDK'sını indiriyor. Portal ortamını yerelde tekrarlamanın tek dürüst yolu bu.
const real = process.argv.includes('--gercek');
// `--kirik`: SDK yüklendi ama `init()` başarısız oldu. Reklam engelleyici portalın kendi
// scriptlerini engelleyince CrazyGames QA'de olan tam buydu, ve o hâlde SDK'nın ÖZELLİKLERİNE
// DOKUNMAK bile patlıyor - oyunu donduran şey buydu.
const broken = process.argv.includes('--kirik');
if (broken) await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    (function () {
      var boom = function () { throw { name: 'CrazySDK', message: 'CrazySDK is not initialized yet.' }; };
      var sdk = { init: function () { return Promise.reject({ code: 'blocked' }); } };
      for (var i = 0, names = ['ad', 'data', 'game', 'user', 'banner']; i < names.length; i++) {
        Object.defineProperty(sdk, names[i], { get: boom });
      }
      window.CrazyGames = { SDK: sdk };
    })();
  `,
});

// Sahte SDK, HER CAGRIYI KAYDEDIYOR.
//
// Kaydetmiyordu, ve bedeli CrazyGames'in QA panelinde goruldu: panel "Loading Stop algilandi,
// Loading Start algilanmadi" diyordu. Sebep koddaydi - `loadingStart` init'ten once cagriliyor,
// bu SDK surumu baslatilmadan once kendisine dokunulmasina hata firlatiyor, cagri kendi `try`'i
// icinde sessizce dusuyordu. Yerelde gorulebilecek tek yer buydu ve burasi bakmiyordu.
if (!real && !broken) await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    window.__portalSaid = [];
    (function () {
      var say = function (n) { window.__portalSaid.push(n); };
      window.CrazyGames = {
        SDK: {
          init: () => { say('init'); return Promise.resolve(); },
          ad: {
            hasAdblock: () => Promise.resolve(false),
            requestAd: (kind, cb) => {
              say('Request ' + kind + ' Ad');
              setTimeout(() => cb.adError({ code: 'adsDisabledBasicLaunch' }), 30);
            },
          },
          data: {
            getItem: (k) => { say('Get Item'); return window.localStorage.getItem('portal:' + k); },
            setItem: (k, v) => { say('Set Item'); window.localStorage.setItem('portal:' + k, v); },
            removeItem: (k) => { say('Remove Item'); window.localStorage.removeItem('portal:' + k); },
            clear: () => say('Clear'),
          },
          game: {
            settings: { muteAudio: false, disableChat: false },
            loadingStart: () => say('Loading Start'),
            loadingStop: () => say('Loading Stop'),
            gameplayStart: () => say('Gameplay Start'),
            gameplayStop: () => say('Gameplay Stop'),
            happytime: () => say('Happytime'),
            reportGameCompletedPercentage: () => say('Game completion reported'),
            addSettingsChangeListener: () => say('Mute audio support'),
            removeSettingsChangeListener: () => {},
          },
        },
      };
    })();
  `,
});

await send('Page.navigate', { url: real ? url + (url.includes('?') ? '&' : '?') + 'sdk=1' : url });
const deadline = Date.now() + 20000;
while (Date.now() < deadline && !log.some((l) => l.includes('[ShadowTower] ready'))) await sleep(200);
if (!log.some((l) => l.includes('[ShadowTower] ready'))) {
  console.log('OYUN ACILMADI: ' + url);
  for (const l of log) console.log('  ' + l);
  clearTimeout(watchdog);
  browser.kill();
  process.exit(3);
}
await sleep(500);

console.log('  portal görüldü mü: ' + await evaluate('JSON.stringify(window.ShadowTower.meta.tab)'));

const shot = async (name) => {
  const png = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, name + '.png'), Buffer.from(png.result.data, 'base64'));
};

/**
 * Döngü hâlâ ATIYOR MU.
 *
 * İlk hâli `spy.done.length > 0` diye bakıyordu ve bu HİÇBİR ŞEY ölçmüyordu: donmuş bir döngüde
 * `done` son tamamlanan karenin kutularını tutmaya devam ediyor. Araç o yüzden gerçek hatayı
 * çalıştırdı ve "çiziyor" dedi. Ölçülmesi gereken şey TAMAMLANAN KARE SAYISININ ARTMASI.
 */
const frames = () => evaluate('window.ShadowTower.spy.frames');

async function visit(tab) {
  await evaluate(`(() => { window.ShadowTower.meta.tab = '${tab}'; return true; })()`);
  await sleep(400);
  const was = bad;
  const a = await frames();
  await sleep(400);
  const b = await frames();
  const alive = b > a;
  await shot('sekme_' + tab);
  console.log(`  sekme ${tab}: ${alive ? `çiziyor (${b - a} kare)` : 'DONDU'}` +
    `${bad > was ? ' · YENİ HATA' : ''}`);
  return alive && bad === was;
}

await evaluate('(() => { window.ShadowTower.spy.on = true; return true; })()');
let ok = true;
for (const tab of ['map', 'wheel', 'hero', 'spells', 'codex']) ok = (await visit(tab)) && ok;

// Çarkı gerçekten çevir: günün hakkı harcanınca çizilen şey başka bir şey.
await evaluate(`window.ShadowTower.menu({ what: 'spin' })`);
await sleep(3600);
const after = await visit('wheel');
console.log('  çark çevrildikten sonra: ' + (after ? 'çiziyor' : 'DONDU'));

// Bir kosu baslat ve bitir: `gameplayStart` / `gameplayStop` yalnizca burada gidiyor, ve
// Basic Launch'in zorunlu sarti bu ikisi. Sekmeleri gezip "SDK calisiyor" demek yetmez.
//
// Yalnizca SAHTE SDK ile: cagrilari kaydeden o. `--gercek` modunda CrazyGames'in kendi SDK'si
// yukleniyor ve hicbir sey kaydetmiyor, yani liste bos cikip yedi satiri birden "eksik" diye
// bagiriyordu - alet, olcemedigi seyi yok sanmisti.
if (!broken && !real) {
  await evaluate(`(() => {
    const m = window.ShadowTower;
    m.start();
    // Kosunun basindaki nefes 2.2 saniye ve o sure boyunca kurallar adimlanmiyor; beklemeden
    // kosuyu bitirmeye calismak "Gameplay Stop gitmedi" diye okunuyordu - oysa kosu daha
    // baslamamisti. Alet oyunu degil kendini olcuyordu.
    m.show.ready = 0;
    return true;
  })()`);
  await sleep(900);
  await shot('kosu');
  await evaluate(`(() => {
    const m = window.ShadowTower;
    m.state.wall = 0;
    m.state.phase = 'lost';
    return true;
  })()`);
  await sleep(600);

  const said = await evaluate('JSON.stringify(window.__portalSaid || [])');
  const list = said ? JSON.parse(said) : [];
  const once = [...new Set(list)];
  console.log('\nPORTALA GIDEN CAGRILAR (CrazyGames panelindeki liste):');
  for (const name of once) console.log('  ✓ ' + name);
  // Basic Launch'in zorunlu gordukleri. Panelde gri kalan her satir, burada eksik olur.
  for (const must of ['Loading Start', 'Loading Stop', 'Gameplay Start', 'Gameplay Stop',
    'Get Item', 'Set Item', 'Mute audio support']) {
    if (!once.includes(must)) { console.log('  ✗ EKSIK: ' + must); bad += 1; }
  }
}

if (bad) {
  console.log(`\nKONSOLDA ${bad} HATA:`);
  for (const l of log.filter((x) => x.startsWith('[error]') || x.startsWith('[exception]'))) {
    console.log('  ' + l);
  }
} else {
  console.log('\nkonsol temiz');
}

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
process.exit(bad || !ok || !after ? 1 : 0);

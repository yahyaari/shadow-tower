// Oyunun belirli bir anına ATLAYIP fotoğraf çeker.
//
// `look.mjs` oyunu gerçekten oynuyor ve o yüzden patronu görmek için gerçek zamanda yetmiş
// saniye beklemek gerekiyor - swiftshader'da bu dört dakika duvar saati. Burada durumu doğrudan
// kurup o anı çekiyoruz. Dengeyi ölçmek için değil, yeni çizilen bir şeyin ekranda doğru
// göründüğünü görmek için.
//
//   node Tools/peek.mjs <url> <klasör> [genişlik] [yükseklik]

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [url = "http://localhost:8050/", outDir = "Logs/peek"] = process.argv.slice(2);
const W = Number(process.argv[4] ?? 1280), H = Number(process.argv[5] ?? 720);
const phone = H > W;

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9700 + (process.pid % 200);
mkdirSync(outDir, { recursive: true });
const profile = join(tmpdir(), "peek-edge-" + Date.now());

const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, "--enable-unsafe-swiftshader", "--use-angle=swiftshader",
  "--no-first-run", "--autoplay-policy=no-user-gesture-required", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
let bad = 0;

const watchdog = setTimeout(() => { console.log("ZAMAN AŞIMI"); browser.kill(); process.exit(2); }, 90000);

let target;
for (let i = 0; i < 60 && !target; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === "page");
  } catch { /* hazır değil */ }
  if (!target) await sleep(200);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let nextId = 1;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.consoleAPICalled") {
    const text = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    log.push(`[${m.params.type}] ${text}`);
    if (m.params.type === "error") bad++;
  } else if (m.method === "Runtime.exceptionThrown") {
    log.push(`[exception] ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
    bad++;
  }
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  const timer = setTimeout(() => reject(new Error(`${method} cevap vermedi`)), 30000);
  pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
  ws.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;

async function screenshot(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(outDir, name + ".png"), Buffer.from(r.result.data, "base64"));
  console.log(`  ${name}.png`);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: phone ? 2 : 1, mobile: phone });
await send("Page.navigate", { url });

const deadline = Date.now() + 20000;
while (Date.now() < deadline && !log.some((l) => l.includes("[ShadowTower] ready"))) await sleep(200);
await sleep(400);



// Donanımlı bir büyücü kur: altı büyü, birkaç pasif, ve bölümün sonuna gel
// Açılış ekranı: önce kilitli haliyle, sonra her şey açıkken
await screenshot('menu_yeni_hesap');

// Ilerlemis bir hesap
await evaluate(`(() => {
  const d = window.ShadowTower.meta;
  d.level = 8; d.xp = 700;
  d.stars = { 1: 3, 2: 2, 3: 1 };
  d.stage = 3;
  d.loadout = ['bolt', 'fireball', 'lightning', 'frost'];
  return true;
})()`);
await sleep(400);
await screenshot('menu_map');

for (const tab of ['wheel', 'hero', 'spells', 'codex']) {
  await evaluate(`(() => { window.ShadowTower.meta.tab = '${tab}'; return true; })()`);
  await sleep(350);
  await screenshot('menu_' + tab);
}

await evaluate(`(() => { const d = window.ShadowTower.meta; d.tab = 'map'; d.lang = 'tr'; window.ShadowTower.setLanguage('tr'); return true; })()`);
await sleep(350);
await screenshot('menu_tr');

// Ayarlar paneli
await evaluate(`(() => { window.ShadowTower.show.settings = true; return true; })()`);
await sleep(350);
await screenshot('ayarlar');
await evaluate(`(() => { window.ShadowTower.show.settings = false; return true; })()`);
await sleep(250);
await evaluate(`(() => { const d = window.ShadowTower.meta; d.lang = 'en'; window.ShadowTower.setLanguage('en'); return true; })()`);
await sleep(300);

// Kosunun ilk kart ekrani: tek buyuyle basliyor
await evaluate(`(() => {
  window.ShadowTower.start();
  const s = window.ShadowTower.state;
  s.xp = s.need;
  return true;
})()`);
for (let i = 0; i < 60; i++) {
  if (await evaluate(`window.ShadowTower.state.phase === 'picking'`)) break;
  await sleep(100);
}
await sleep(500);
console.log('  acilista atesleyen: ' + await evaluate(`Object.keys(window.ShadowTower.state.kit).join('+')`));
await screenshot('kartlar');
await evaluate(`window.ShadowTower.take(window.ShadowTower.state, 0); true`);

// Patron ani
await evaluate(`(() => {
  const s = window.ShadowTower.state;
  s.kit.fireball = { tier: 2, taken: 6, boosts: { wider: 2, sharper: 2 }, evos: ['fire'] };
  s.cools.fireball = 0.2;
  s.kit.frost = { tier: 1, taken: 3, boosts: { deep: 2 }, evos: [] };
  s.cools.frost = 0.3;
  s.passives = { mend: 1 };
  s.t = 70; s.stageT = 70;
  s.wall = s.maxWall * 0.72;
  return true;
})()`);
for (let i = 0; i < 120; i++) {
  if (await evaluate('!!window.ShadowTower.state.boss')) break;
  await sleep(150);
}
await sleep(900);
await screenshot('patron');

// Bolum tamamlandi: uc ayri yildiz durumu
for (const [name, part] of [['bitti_3yildiz', 1], ['bitti_2yildiz', 0.96], ['bitti_1yildiz', 0.7]]) {
  await evaluate(`(() => {
    const s = window.ShadowTower.state;
    // Ayni kosuyu tekrar bitiriyoruz; gercek akista start() bunlari sifirliyor.
    window.ShadowTower.show.booked = false;
    window.ShadowTower.show.won = null;
    s.phase = 'playing';
    s.wall = s.maxWall * ${part};
    if (s.boss) s.boss.hp = 0;
    else { s.bossDone = false; s.stageT = 1e9; }
    return true;
  })()`);
  for (let i = 0; i < 160; i++) {
    if (await evaluate(`window.ShadowTower.state.phase === 'done'`)) break;
    await sleep(80);
  }
  await sleep(500);
  await screenshot(name);
}

writeFileSync(join(outDir, "console.txt"), log.join("\n"));
console.log(bad ? `KONSOLDA ${bad} HATA:\n` + log.filter((l) => l.startsWith("[error]") || l.startsWith("[exception]")).join("\n") : "konsol temiz");

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
process.exit(bad ? 1 : 0);

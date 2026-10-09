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
await evaluate(`(() => {
  const s = window.ShadowTower.state;
  s.spells = { bolt: 4, fireball: 3, lightning: 3, nova: 2, blade: 3, frost: 2 };
  s.cools = { bolt: 0.2, fireball: 0.3, lightning: 0.4, nova: 0.5, frost: 0.6 };
  s.passives = { might: 3, haste: 2, reach: 2, mend: 1 };
  s.level = 16;
  s.xp = 0; s.need = 40;
  s.t = 70; s.stageT = 70;
  s.wall = s.maxWall * 0.62;
  return true;
})()`);

for (let i = 0; i < 120; i++) {
  if (await evaluate('!!window.ShadowTower.state.boss')) break;
  await sleep(150);
}
await sleep(900);
await screenshot("patron");
console.log('  ' + await evaluate(`(() => { const s = window.ShadowTower.state; return 'bolum ' + s.stage + ', patron can ' + Math.ceil(s.boss ? s.boss.hp : -1) + '/' + Math.ceil(s.boss ? s.boss.maxHp : -1) + ', sahada ' + s.foes.length; })()`));

// Patronu indir: bölüm geçme ekranı
await evaluate('window.ShadowTower.state.boss.hp = 0; true');
for (let i = 0; i < 60; i++) {
  if (await evaluate(`window.ShadowTower.state.phase === 'picking'`)) break;
  await sleep(100);
}
await sleep(500);
await screenshot("bolum_gecildi");

// Ve duvarı yıkıp bitiş ekranı
// Tamir pasifi kapatılmadan duvar düşmüyor: ilk denemede 1 cana indirdim ve saniyede bir
// buçuk geri gelerek ayakta kaldı, bitiş ekranını hiç göremedim.
await evaluate(`(() => {
  const s = window.ShadowTower.state;
  window.ShadowTower.take(s, 0);
  s.passives.mend = 0;
  s.wall = 1;
  for (const f of s.foes) { f.r = 96; f.biteCool = 0; }
  return true;
})()`);
for (let i = 0; i < 100; i++) {
  if (await evaluate(`window.ShadowTower.state.phase === 'lost'`)) break;
  await sleep(150);
}
await sleep(700);
await screenshot("bitis");

writeFileSync(join(outDir, "console.txt"), log.join("\n"));
console.log(bad ? `KONSOLDA ${bad} HATA:\n` + log.filter((l) => l.startsWith("[error]") || l.startsWith("[exception]")).join("\n") : "konsol temiz");

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
process.exit(bad ? 1 : 0);

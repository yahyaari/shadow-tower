// Oyunu gerçek bir tarayıcıda açar, bir bot oynatır ve belirli saniyelerde fotoğraf çeker.
//
//   node Tools/look.mjs <url> <klasör> [saniyeler] [genişlik] [yükseklik]

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [url = "http://localhost:8050/", outDir = "Logs/look", when = "3,20,55,95"] = process.argv.slice(2);
const W = Number(process.argv[5] ?? 1280), H = Number(process.argv[6] ?? 720);
const phone = H > W;
const marks = when.split(",").map(Number).sort((a, b) => a - b);

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9400 + (process.pid % 500);
mkdirSync(outDir, { recursive: true });
const profile = join(tmpdir(), "shadowtower-edge-" + Date.now());

const browser = spawn(EDGE, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, "--enable-unsafe-swiftshader", "--use-angle=swiftshader",
  "--no-first-run", "--autoplay-policy=no-user-gesture-required", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
let bad = 0;

const watchdog = setTimeout(() => {
  console.log("ZAMAN AŞIMI\n" + log.slice(-20).join("\n"));
  browser.kill();
  process.exit(2);
}, 300000);

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch { /* hazır değil */ }
    await sleep(200);
  }
  throw new Error("Tarayıcıya bağlanılamadı");
}

const target = await getTarget();
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
  const timer = setTimeout(() => reject(new Error(`${method} cevap vermedi`)), 45000);
  pending.set(id, (m) => { clearTimeout(timer); resolve(m); });
  ws.send(JSON.stringify({ id, method, params }));
});

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
}

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
if (!log.some((l) => l.includes("[ShadowTower] ready"))) {
  console.log("Oyun hazır olduğunu bildirmedi:\n" + log.join("\n"));
  browser.kill();
  process.exit(1);
}

// Botu sayfanın kendi kare döngüsüne kur: saniyede birkaç kere tıklar ve parası yettikçe en ucuz
// yükseltmeyi alır. Dışarıdan CDP ile tıklamak saniyede birkaç kere zor; oyunun ritmi orada.
await evaluate(`
  window.__auto = true;
  (function auto() {
    if (!window.__auto) return;
    const g = window.ShadowTower, s = g.state;
    if (s.phase === 'playing') g.click(s);
    setTimeout(auto, 160);
  })();
  true
`);

console.log(`${W}x${H} — bot oynuyor`);
const began = Date.now();
let shotCards = false;
let shotBoss = false;
for (const mark of marks) {
  while ((Date.now() - began) / 1000 < mark) {
    const phase = await evaluate('window.ShadowTower.state.phase');
    if (phase === 'won' || phase === 'lost') break;
    if (phase === 'picking') {
      // Seçim ekranı oyunu durduruyor: bir kere fotoğrafla, sonra geç.
      if (!shotCards) {
        shotCards = true;
        const p = await evaluate(`(() => { const c = window.__cards(innerWidth * devicePixelRatio, innerHeight * devicePixelRatio)[1], d = devicePixelRatio; return { x: (c.x + c.w / 2) / d, y: (c.y + c.h / 2) / d }; })()`);
        if (p) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y }); await sleep(150); }
        await screenshot('secim');
      }
      await evaluate('window.ShadowTower.take(window.ShadowTower.state, 0); true');
      continue;
    }
    if (!shotBoss && (await evaluate('!!window.ShadowTower.state.boss'))) {
      shotBoss = true;
      await screenshot('patron');
    }
    await sleep(150);
  }
  const s = await evaluate(`(() => { const s = window.ShadowTower.state; return { t: Math.floor(s.t), wall: Math.ceil(s.wall), kills: s.kills, level: s.level, phase: s.phase, spells: Object.keys(s.spells).join('+'), foes: s.foes.length }; })()`);
  await screenshot(`${String(mark).padStart(3, '0')}sn`);
  console.log(`      ${s.t}sn  duvar ${s.wall}  ${s.kills} olu  LV${s.level}  sahada ${s.foes}  ${s.spells}`);
  if (s.phase === 'won' || s.phase === 'lost') { await screenshot('bitti'); break; }
}

await evaluate('window.__auto = false; true');
writeFileSync(join(outDir, "console.txt"), log.join("\n"));
console.log(bad ? `KONSOLDA ${bad} HATA:\n` + log.filter((l) => l.startsWith("[error]") || l.startsWith("[exception]")).join("\n") : "konsol temiz");

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
process.exit(bad ? 1 : 0);

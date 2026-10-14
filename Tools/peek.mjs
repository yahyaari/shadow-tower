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

// Harita, bolum bolum: ailelerin ve zayifliklarinin OYNA'nin yaninda gorunmesi gerekiyor.
for (const stage of [2, 4, 6]) {
  await evaluate(`(() => { const d = window.ShadowTower.meta; d.stars[${stage - 1}] = 1; d.stage = ${stage}; return true; })()`);
  await sleep(350);
  await screenshot('harita_bolum' + stage);
}
await evaluate(`(() => { window.ShadowTower.meta.stage = 3; return true; })()`);

// Kahraman merdiveni: uc ayri noktada
await evaluate(`(() => { const d = window.ShadowTower.meta; d.tab = 'hero'; d.hero = 0; d.bank = 600; window.ShadowTower.show.heroScroll = null; return true; })()`);
await sleep(400);
await screenshot('kahraman_bas');
await evaluate(`(() => { const d = window.ShadowTower.meta; d.hero = 14; d.bank = 1400; window.ShadowTower.show.heroScroll = null; return true; })()`);
await sleep(400);
await screenshot('kahraman_orta');
await evaluate(`(() => { window.ShadowTower.show.heroScroll = 0; return true; })()`);
await sleep(400);
await screenshot('kahraman_tepe');
await evaluate(`(() => { const d = window.ShadowTower.meta; d.hero = 0; d.bank = 0; return true; })()`);

// Oduller. Hicbiri poz degil: ekran kurulup "kazandi" diye bir sayi yazilmiyor, SPIN'e gercekten
// basiliyor ve cark kendi durdugu yerde birakiliyor. Poz verilmis bir ekran yalnizca pozu veren
// ile cizen kodun ayni fikirde oldugunu gosterir; asil merak edilen, carkin durdugu dilim ile
// odedigi sayinin ayni olup olmadigi.
const rewardAt = (how) => evaluate(`(() => {
  const d = window.ShadowTower.meta, s = window.ShadowTower.show;
  const how = ${JSON.stringify(how)};
  d.tab = 'wheel';
  d.spun = how.spun ?? null;
  d.gems = how.gems ?? 0; d.bank = how.bank; d.gold = how.gold ?? 0; d.level = how.level;
  s.spin = null; s.spinWon = null; s.chestWon = null; s.turn = 0;
  s.wheelScroll = how.scroll || 0;
  return true;
})()`);

const press = (what, key, many) => evaluate(`(() => { window.ShadowTower.menu({ what: ${JSON.stringify(what)}, key: ${JSON.stringify(key ?? null)}, many: ${JSON.stringify(many ?? 1)} }); return true; })()`);

await rewardAt({ gems: 40, bank: 1240, gold: 820, level: 8 });
await sleep(350);
await screenshot('oduller_cevirmeye_hazir');

// basiyoruz ve carki donerken yakaliyoruz
await press('spin');
await sleep(700);
await screenshot('oduller_donerken');

// animasyon 3 saniye; bitince durdugu dilim ile yazan sayi karsilastirilabilir
await sleep(2800);
await screenshot('oduller_cevrildi');

const landed = await evaluate(`(() => {
  const s = window.ShadowTower.show;
  return { won: s.spinWon, turn: s.turn, spinning: !!s.spin };
})()`);
console.log('  cark durdu:', JSON.stringify(landed));

// Asagisi: iki sandik. Once hicbirinin anahtari yokken, sonra ikisinin de varken.
const down = await evaluate(`(() => {
  const m = window.ShadowTower;
  return m.reach ? m.reach() : 99999;
})()`);

await rewardAt({ spun: '2026-01-01', gems: 40, bank: 1240, gold: 820, level: 8, scroll: 99999 });
await sleep(350);
await screenshot('sandiklar_kilitli');

await rewardAt({ spun: '2026-01-01', gems: 3000, bank: 1240, gold: 820, level: 8, scroll: 99999 });
await sleep(350);
await screenshot('sandiklar_acilabilir');

await press('chest', 'great', 10);
await sleep(350);
await screenshot('sandik_buyuk_10x_acildi');

await rewardAt({ gems: 0, bank: 0, gold: 0, level: 1 });
await sleep(350);
await screenshot('oduller_yeni_hesap');

await evaluate(`(() => {
  const d = window.ShadowTower.meta, s = window.ShadowTower.show;
  s.spin = null; s.spinWon = null; s.chestWon = null; s.turn = 0;
  d.spun = null; d.chest = 0; d.bank = 0; d.level = 8;
  d.tab = 'spells'; d.spellTab = 'loadout';
  return true;
})()`);
await sleep(350);
await screenshot('menu_spells');

// Yukseltme yarisi: hic parasi olmayan ve tam parasi olan hesap - bir satirin neyi engelledigini
// soyleyip soylemedigi ancak ikisi yan yana gorulunce anlasilir.
await evaluate(`(() => {
  const d = window.ShadowTower.meta;
  d.spellTab = 'raise';
  d.gold = 0; d.shards = {}; d.spell = {};
  return true;
})()`);
await sleep(350);
await screenshot('yukselt_bos');

await evaluate(`(() => {
  const d = window.ShadowTower.meta;
  d.gold = 2400;
  d.shards = { bolt: 14, fireball: 9, frost: 3, lightning: 21, shards: 2 };
  d.spell = { bolt: 5, fireball: 2, lightning: 10 };
  return true;
})()`);
await sleep(350);
await screenshot('yukselt_dolu');

// Kulliyat: iki yarisi ve acilmis bir buyu
await evaluate(`(() => { const d = window.ShadowTower.meta; d.tab = 'codex'; d.codex = 'spells'; return true; })()`);
await sleep(350);
await screenshot('kulliyat_buyuler');
await evaluate(`(() => { window.ShadowTower.show.codexPick = 'bolt'; return true; })()`);
await sleep(350);
await screenshot('kulliyat_buyu_bolt');
await evaluate(`(() => { window.ShadowTower.show.codexPick = 'fireball'; return true; })()`);
await sleep(350);
await screenshot('kulliyat_buyu_fireball');
await evaluate(`(() => { const d = window.ShadowTower.meta; window.ShadowTower.show.codexPick = null; d.codex = 'foes'; return true; })()`);
await sleep(350);
await screenshot('kulliyat_canavarlar');

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

// Dort aile, uc rol. Bir ailenin digerinden ayrilip ayrilmadigi ancak yan yana gorulunce bilinir.
for (const [stage, name] of [[1, 'aile_insanlar'], [2, 'aile_suru'], [3, 'aile_orumcek'], [4, 'aile_kurt']]) {
  await evaluate(`(() => {
    const m = window.ShadowTower, s = m.state;
    s.stage = ${stage};
    s.foes.length = 0;
    s.boss = null; s.bossDone = false; s.stageT = 0; s.t = 2;
    s.wall = s.maxWall;
    s.phase = 'playing';
    m.show.booked = false; m.show.won = null; m.show.hint = false;
    // uc rolu de, ayni yarim cemberde, buyukten kucuge
    const roles = ['brute', 'walker', 'runner'];
    for (let i = 0; i < 9; i++) {
      const f = m.spawnOne(s, roles[i % 3], (i / 9) * Math.PI * 2 + 0.3);
      f.r = 230 + (i % 3) * 55;
    }
    return true;
  })()`);
  await sleep(500);
  await screenshot(name);
}

// Uc patron, uc ayri silüet. Hepsini ayri ayri cagiriyoruz: bir patronu digerinden ayiran sey
// once nasil gorundugu, ve ucu de ayni ciziliyorsa cesitlilik diye bir sey yok.
for (const [stage, name] of [[1, 'patron_gardiyan'], [2, 'patron_cagirici'], [3, 'patron_golge']]) {
  await evaluate(`(() => {
    const m = window.ShadowTower, s = m.state;
    s.stage = ${stage};
    s.foes.length = 0;
    s.boss = null; s.bossDone = false; s.stageT = 1e9;
    s.wall = s.maxWall * 0.8;
    return true;
  })()`);
  for (let i = 0; i < 80; i++) {
    if (await evaluate('!!window.ShadowTower.state.boss')) break;
    await sleep(80);
  }
  await sleep(700);
  await screenshot(name);
}

// Golge olunce ikiye ayrilmali - bir kez oldurmek bitirmiyor.
await evaluate(`(() => {
  const s = window.ShadowTower.state;
  if (s.boss && s.boss.key === 'shade') s.boss.hp = 0;
  return true;
})()`);
await sleep(600);
await screenshot('patron_golge_ikiye');

// Bolum tamamlandi: uc ayri yildiz durumu
for (const [name, part] of [['bitti_3yildiz', 1], ['bitti_2yildiz', 0.96], ['bitti_1yildiz', 0.7]]) {
  await evaluate(`(() => {
    const s = window.ShadowTower.state;
    // Ayni kosuyu tekrar bitiriyoruz; gercek akista start() bunlari sifirliyor.
    window.ShadowTower.show.booked = false;
    window.ShadowTower.show.won = null;
    s.phase = 'playing';
    s.wall = s.maxWall * ${part};
    // Golge olunce ikiye ayriliyor, yani "patronun canini sifirla" tek basina bolumu bitirmiyor
    // ve bu dongu sonsuza kadar bekliyordu. Once bolunmeyi kapatip hepsini birden dusuruyoruz.
    const bosses = s.foes.filter((f) => f.boss);
    if (bosses.length) { for (const f of bosses) { f.splits = false; f.hp = 0; } }
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

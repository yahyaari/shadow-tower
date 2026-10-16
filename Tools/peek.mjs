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

// Doksan saniye, kosu ekraninin kendi fiksturleri eklenene kadar yetiyordu. Patronlar gercek
// zamanda dovusuyor ve her yeni fikstur bu butceden yiyor.
const watchdog = setTimeout(() => { console.log("ZAMAN AŞIMI"); browser.kill(); process.exit(2); }, 180000);

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

/**
 * Sayfada bir ifade degerlendirir.
 *
 * Patlayan bir ifade sessizce `undefined` donuyordu, yani "havadaki vurus sayisi: undefined"
 * satiri hem "sifir tane var" hem "ifade patladi" anlamina geliyordu - ve olcmek icin yazilmis
 * bir satirin soyleyebilecegi en kotu sey budur.
 */
const evaluate = async (e) => {
  const r = (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result;
  if (r?.exceptionDetails) {
    const why = r.exceptionDetails.exception?.description ?? r.exceptionDetails.text;
    log.push(`[exception] ${e} -> ${why}`);
    bad++;
    throw new Error(why);
  }
  return r?.result?.value;
};

/**
 * Bir kutunun ortasina gercek bir basis.
 *
 * `box` oyunun kendi olcusunu veren bir ifade - tuvalin pikselleriyle. Burada CSS pikseline
 * cevrilip pencereye gercek bir `pointerdown` olarak gonderiliyor, yani parmagin gittigi
 * dinleyiciye gidiyor. Kutuyu burada kendimiz hesaplasaydik yalnizca kendi aritmetigimizi
 * dogrulamis olurduk.
 */
async function tap(box) {
  const ok = await evaluate(`(() => {
    const M = window.ShadowTower, C = document.getElementById('game');
    const b = ${box};
    if (!b) return 'kutu yok';
    const r = C.getBoundingClientRect();
    const k = C.width / r.width;
    const x = r.left + (b.x + b.w / 2) / k;
    const y = r.top + (b.y + b.h / 2) / k;
    window.dispatchEvent(new PointerEvent('pointerdown', {
      clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch',
    }));
    return 'ok';
  })()`);
  if (ok !== 'ok') console.log('  BASIS DUSTU: ' + box + ' -> ' + ok);
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

// Oyun gercekten acildi mi. Acilmadiysa burada duruyoruz: bos bir sayfa da fotograf cekilir ve
// bembeyaz kirk kare, bakmadan "temiz" diye gecilen kirk karedir. `--phone` diye bir argumani
// yoktu bu aracin, url sanildi, tarayici "--phone" adresine gitti ve butun kareler bos cikti.
const deadline = Date.now() + 20000;
while (Date.now() < deadline && !log.some((l) => l.includes("[ShadowTower] ready"))) await sleep(200);
if (!log.some((l) => l.includes("[ShadowTower] ready"))) {
  console.log('OYUN ACILMADI: ' + url);
  for (const line of log) console.log('  ' + line);
  if (!log.length) console.log('  konsolda tek satir yok');
  console.log("kullanim: node Tools/peek.mjs <url> <klasor> [genislik] [yukseklik]");
  clearTimeout(watchdog);
  browser.kill();
  process.exit(3);
}
await sleep(400);



// Donanımlı bir büyücü kur: altı büyü, birkaç pasif, ve bölümün sonuna gel
// Açılış ekranı: önce kilitli haliyle, sonra her şey açıkken
await screenshot('menu_yeni_hesap');

// Enerjisi bitmis bir hesap: OYNA kapisi, geri sayim ve dolum reklami. Bir kosu 15 yiyor,
// elinde 4 var - yani asla gormek icin beklemeye gerek yok.
await evaluate(`(() => {
  const d = window.ShadowTower.meta;
  d.energy = { at: 4, when: Date.now() };
  return true;
})()`);
await sleep(400);
await screenshot('enerji_bitti');
await evaluate(`(() => {
  window.ShadowTower.meta.energy = { at: 60, when: Date.now() };
  return true;
})()`);
await sleep(300);

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

// Uc pano: gorevler (hafta serisi dahil), basarimlar, duyurular.
await evaluate(`(() => {
  const d = window.ShadowTower.meta;
  d.runs = 40; d.kills = 3200; d.best = 6; d.chests = 4; d.hero = 26;
  // Bugünün kendi tarihi, yoksa sayaç bugüne ait sayılmaz ve ilerleme sıfır görünür.
  const p2 = (n) => String(n).padStart(2, '0');
  const n0 = new Date();
  const day = n0.getFullYear() + '-' + p2(n0.getMonth() + 1) + '-' + p2(n0.getDate());
  d.streak = { last: day, run: 5 };
  d.tally = { day, clears: 2, kills: 260, stars: 3, deepest: 4, chests: 1, raises: 1, spins: 1, hero: 0 };
  d.paid = [];
  return true;
})()`);
for (const key of ['jobs', 'feats', 'news']) {
  await evaluate(`(() => { const s = window.ShadowTower.show; s.board = '${key}'; s.boardScroll = 0; return true; })()`);
  await sleep(400);
  await screenshot('pano_' + key);
}
// Ve ALINMIS hali. Oyuncunun sikayeti tam buydu: aliyor, satirda yalnizca "alindi" yaziyor ve ne
// aldigi hicbir yerde yazmiyordu. Odulun, alinmadan onceki yeriyle AYNI yerde kaldigi gorunmeli.
// Gunun hangi uc gorevi geldigi tarihe gore degisiyor, o yuzden hepsine basiliyor: olmayan bir
// gorevin tusu zaten hicbir sey yapmiyor.
await evaluate(`(() => {
  const m = window.ShadowTower;
  m.show.board = 'jobs';
  m.show.boardScroll = 0;
  for (const key of ['clears', 'kills', 'clean', 'deep', 'chest', 'raise', 'spin', 'hero']) {
    m.menu({ what: 'daily', key });
  }
  return (m.meta.paid || []).length;
})()`);
await sleep(400);
await screenshot('pano_jobs_alindi');

await evaluate(`(() => { window.ShadowTower.show.board = null; return true; })()`);

// Harita, bolum bolum: ailelerin ve zayifliklarinin OYNA'nin yaninda gorunmesi gerekiyor.
for (const stage of [2, 4, 6, 7, 8, 9, 10, 11, 12]) {
  await evaluate(`(() => { const d = window.ShadowTower.meta; for (let i = 1; i < ${stage}; i++) d.stars[i] = 1; d.stage = ${stage}; return true; })()`);
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

// Birlesme karti: iki ebeveyn de beslenmis, kart hem ne verdigini hem ne harcadigini soylemeli.
await evaluate(`(() => {
  const m = window.ShadowTower, s = m.state;
  for (const k of ['fireball', 'lightning']) {
    if (!s.kit[k]) { s.kit[k] = { tier: 1, boosts: {}, evos: [], taken: 0 }; s.cools[k] = 0; s.loadout.includes(k) || s.loadout.push(k); }
    s.kit[k].taken = 6;
  }
  s.choices = m.offerCards ? m.offerCards(s) : s.choices;
  s.phase = 'picking';
  s.choices = [{ what: 'fusion', key: 'tempest' },
               { what: 'boost', key: 'bolt', boost: 'sharper' },
               { what: 'spell', key: 'frost' }];
  return true;
})()`);
await sleep(400);
await screenshot('kart_birlesme');
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

// On iki yer, sahanin icinden. Menu bir yer vaat ediyor; oyun onu tutuyor mu?
for (const [stage, name] of [[1,'saha01_orman'],[2,'saha02_ova'],[3,'saha03_yol'],[4,'saha04_taslar'],
                             [5,'saha05_cukur'],[6,'saha06_sirt'],[7,'saha07_bataklik'],[8,'saha08_magara'],
                             [9,'saha09_koy'],[10,'saha10_buzul'],[11,'saha11_kemik'],[12,'saha12_kum']]) {
  await evaluate(`(() => {
    const m = window.ShadowTower, s = m.state;
    s.stage = ${stage};
    s.foes.length = 0;
    s.boss = null; s.bossDone = false; s.stageT = 0; s.t = 2;
    s.wall = s.maxWall;
    s.phase = 'playing';
    m.show.booked = false; m.show.won = null; m.show.hint = false;
    for (let i = 0; i < 5; i++) { const f = m.spawnOne(s, 'walker', (i / 5) * Math.PI * 2 + 0.3); f.r = 260; }
    return true;
  })()`);
  await sleep(420);
  await screenshot(name);
}

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
for (const [name, part] of [['bitti_3yildiz', 1], ['bitti_2yildiz', 0.97], ['bitti_1yildiz', 0.5]]) {
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
  // Her denemede sahadaki butun patronlari dusuruyoruz. Bir kez oldurup beklemek, ikinci turda
  // patron yeniden dogdugu icin sonsuza kadar beklemek demekti.
  for (let i = 0; i < 120; i++) {
    if (await evaluate(`window.ShadowTower.state.phase === 'done'`)) break;
    await evaluate(`(() => {
      const s = window.ShadowTower.state;
      for (const f of s.foes) if (f.boss) { f.splits = false; f.hp = 0; }
      return true;
    })()`);
    await sleep(60);
  }
  await sleep(500);
  await screenshot(name);
}

// Reklamli bitis ekrani: 2x odul butonu ve onun altindaki ikisi. SDK gelmedigi icin
// `adsDouble` gercek akista sifir; burada elle veriyoruz, cizim dogru mu diye.
await evaluate(`(() => { window.ShadowTower.show.adsDouble = 3; window.ShadowTower.show.nextStage = 4; return true; })()`);
await sleep(350);
await screenshot('bitti_reklamli');
await evaluate(`(() => { window.ShadowTower.show.adsDouble = 0; return true; })()`);

// Duvar yikildiginda: artik her yere basmak degil, iki buton.
await evaluate(`(() => {
  const m = window.ShadowTower, s = m.state;
  s.phase = 'playing';
  m.show.booked = false; m.show.won = null; m.show.doubled = null;
  s.wall = 1;
  s.foes.length = 0;
  for (let i = 0; i < 6; i++) { const f = m.spawnOne(s, 'brute', (i / 6) * Math.PI * 2); f.r = 40; }
  return true;
})()`);
for (let i = 0; i < 160; i++) {
  if (await evaluate(`window.ShadowTower.state.phase === 'lost'`)) break;
  await sleep(80);
}
await sleep(400);
await screenshot('kaybettim');

// --- kosu ekraninin kendi arayuzu
// Gercek bir kosu: iki butonu da gercek basisla aciyoruz, posalayarak degil. Bir paneli elle
// kurmak yalnizca kuran ile cizenin ayni fikirde oldugunu kanitlar.
await evaluate(`(() => {
  const m = window.ShadowTower;
  m.start();
  const s = m.state;
  s.stage = 5;
  s.level = 7;
  s.kit.bolt = { tier: 3, taken: 11, boosts: { more: 1, pierce: 1, hit: 2 }, evos: ['split', 'burst'] };
  s.kit.fireball = { tier: 2, taken: 6, boosts: { wider: 2 }, evos: ['fire'] };
  s.kit.frost = { tier: 1, taken: 2, boosts: { deep: 1 }, evos: [] };
  for (const k of ['fireball', 'frost']) { s.cools[k] = 0.4; if (!s.loadout.includes(k)) s.loadout.push(k); }
  s.passives = { mend: 2 };
  s.wall = s.maxWall * 0.78;
  s.phase = 'playing';
  m.show.hint = false;
  for (let i = 0; i < 7; i++) { const f = m.spawnOne(s, ['walker','runner','brute'][i % 3], (i / 7) * Math.PI * 2); f.r = 250; }
  return true;
})()`);
await sleep(600);

// Vurus sayilari: bir an gercekten dovusmesini bekliyoruz, sonra hangi sayilarin havada
// oldugunu sayiyoruz. Ekrana bakmak yetmez - bos bir kare de temiz gorunur.
await evaluate(`(() => { const s = window.ShadowTower.state; s.heat = 0; s.xp = 0; return true; })()`);
await sleep(1100);
// Dovusurken seviye atlanirsa kart ekrani aciliyor ve sahada hicbir sey gorunmuyor. Kartlari
// kapatip sahaya donuyoruz: cekmek istedigimiz sey dovus, kart degil.
await evaluate(`(() => {
  const s = window.ShadowTower.state;
  if (s.phase === 'picking') { s.phase = 'playing'; s.choices = []; }
  s.xp = 0;
  return s.phase;
})()`);
await sleep(500);
// Havada sayi OLDUGU bir kare bekliyoruz. Bir kare once saymak, "iki tane vardi" deyip hicbiri
// gorunmeyen bir fotograf cekmek demek - olculen seyle cekilen sey ayni an olmak zorunda.
let floats = 0;
for (let i = 0; i < 60; i++) {
  floats = await evaluate(`window.ShadowTower.show.floats.filter((f) => f.hit).length`);
  if (floats >= 3) break;
  await sleep(60);
}
console.log('  havadaki vurus sayisi: ' + floats);
await screenshot('kosu_vurus_sayilari');

// Suru geliyor, ve kosu tavana vardi. Ikisi de yeni cizim: biri sahanin kenarinda kalinlasan bir
// yay ve ust bantta bir sozcuk, oteki `LV 23 MAX`. Ikisini de bir kare icinde goruyoruz, cunku
// ikisi de ust banda yaziyor ve ust bant dar.
const horde = await evaluate(`(() => {
  const m = window.ShadowTower;
  const s = m.state;
  s.level = 23;
  s.xp = s.need;
  m.surgeOne(s);
  for (const e of s.events) if (e.kind === 'surge') { m.show.horde = 1.9; m.show.hordeAt = e.a; }
  s.events.length = 0;
  return { sahada: s.foes.length, suru: m.show.horde > 0, seviye: s.level };
})()`);
console.log('  sürü: ' + JSON.stringify(horde));
await sleep(260);
await screenshot('kosu_suru_ve_tavan');

// Kosunun iki ucundaki nefes. Ikisi de canli sahanin ustunde duruyor ve ikisinde de kurallar
// adimlanmiyor; bir bolum eskiden iki kare arasinda baslayip iki kare arasinda bitiyordu.
await evaluate(`(() => { window.ShadowTower.show.ready = 2; return true; })()`);
await sleep(300);
await screenshot('kosu_hazir');
await evaluate(`(() => { window.ShadowTower.show.ready = 0; return true; })()`);

await evaluate(`(() => {
  const m = window.ShadowTower;
  m.state.phase = 'done';
  m.show.booked = true;
  m.show.over = 1.2;
  return true;
})()`);
await sleep(300);
await screenshot('kosu_bitti_nefes');
await evaluate(`(() => {
  const m = window.ShadowTower;
  m.show.over = 0;
  m.show.booked = false;
  m.state.phase = 'playing';
  return true;
})()`);

// Sayilari bekleyen dongu de bir seviye atlatabiliyor. Butonlara basmadan once sahaya bir kez
// daha donuyoruz: 'picking' sirasinda iki kose butonu ne ciziliyor ne basilabiliyor.
await evaluate(`(() => {
  const s = window.ShadowTower.state;
  if (s.phase === 'picking') { s.phase = 'playing'; s.choices = []; }
  s.xp = 0;
  return s.phase;
})()`);
await sleep(300);

for (const [what, name] of [['cards', 'kosu_kartlar'], ['menu', 'kosu_menu']]) {
  // Butonlar yalnizca dovus surerken basilabilir, ve on dort kart kartlari 'picking'e dusurur.
  // Basmadan once nerede oldugumuzu soyluyoruz: basis dustugunde sebebini aramak yerine okumak.
  console.log(`  ${name}: ekran = ` + await evaluate(
    `window.ShadowTower.screen + '/' + window.ShadowTower.state.phase`));
  await tap(`window.ShadowTower.ui.runBtns(C.width, C.height, M.dpr).${what}`);
  await sleep(450);
  console.log(`  ${name}: panel = ` + await evaluate(`window.ShadowTower.show.paused`));
  await screenshot(name);
  // Kapatirken da gercek basisla: panelin disina.
  await tap('{ x: 2, y: 2, w: 8, h: 8 }');
  await sleep(250);
  console.log(`  ${name}: kapandi mi = ` + await evaluate(`window.ShadowTower.show.paused === null`));
}

// Muzik gercekten caliyor mu? Duyamiyoruz; ses saatine kac nota verildigini sayabiliyoruz.
{
  const before = await evaluate(`JSON.stringify(window.ShadowTower.music.played())`);
  await sleep(3000);
  const after = await evaluate(`JSON.stringify(window.ShadowTower.music.played())`);
  console.log("  muzik:", before, "->", after);
}

writeFileSync(join(outDir, "console.txt"), log.join("\n"));
console.log(bad ? `KONSOLDA ${bad} HATA:\n` + log.filter((l) => l.startsWith("[error]") || l.startsWith("[exception]")).join("\n") : "konsol temiz");

clearTimeout(watchdog);
ws.close();
browser.kill();
await sleep(400);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* kilitli */ }
process.exit(bad ? 1 : 0);

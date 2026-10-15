// Oyunun kapak görselleri — oyunun kendi çizimiyle.
//
// Elle çizilmiş görsel yok, bu projenin baştan beri kuralı. Kapak da aynı siluetlerden kuruluyor:
// `draw.js`'in yaratıkları, aynı iki mürekkep. Ekran görüntüsü DEĞİL - portal "sadece oynanış
// görüntüsü koymayın" diyor - ama oyunun içinde olmayan hiçbir şey de yok.
//
// CrazyGames üç boy istiyor ve üçünün birbirine benzemesini şart koşuyor:
//   yatay 1920x1080 · dikey 800x1200 · kare 800x800
// Kenarlık koymak, oyunun adından başka yazı yazmak ve logo koymak yasak.
//
// BASİT TUT. İlk iki denemede sahneye her şey kondu - dev bir büyücü, önünde duvar, iki sıra
// kalabalık - ve ikisi de okunmaz çıktı; biri başlığın üstüne bindi. Portalın kendi tavsiyesi
// doğru: kalabalık bir kapak küçük ekranda taranamaz. Burada üç şey var ve üçü de ÖLÇEK
// farkıyla konuşuyor: kule kocaman, kalabalık küçük, aralarında tek bir kişi.

import { Inks, Face, creatureMark } from '../src/draw.js';

const { Black, Pale } = Inks;

/**
 * Bir kapak çizer.
 *
 * `w/h` oranı neyse kompozisyon ona göre kayıyor: yatayda kule sağda ve ad solda, dikeyde ve
 * karede kule ortada ve ad altta. Üçünde de aynı sahne — portal tutarlılık istiyor.
 */
export function drawCover(ctx, w, h) {
  const wide = w / h > 1.2;
  const S = Math.min(w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#f9f6f0');
  sky.addColorStop(0.62, Pale);
  sky.addColorStop(1, '#cdc4b2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Zemin şeridi İNCE. Kalın olduğunda kapağın beşte biri boş siyah bir kütle oluyordu.
  const ground = h * (wide ? 0.87 : 0.82);
  const towerX = wide ? w * 0.68 : w * 0.5;
  const towerH = S * (wide ? 0.62 : 0.46);

  // --- ay: her şeyin siluet olmasının sebebi olan ışık, kulenin arkasında
  const moonY = ground - towerH * 0.78;
  const moonR = S * 0.19;
  const glow = ctx.createRadialGradient(towerX, moonY, 0, towerX, moonY, moonR * 3.6);
  glow.addColorStop(0, 'rgba(255,253,247,0.95)');
  glow.addColorStop(0.32, 'rgba(249,246,239,0.55)');
  glow.addColorStop(1, 'rgba(236,231,220,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fefcf7';
  ctx.beginPath();
  ctx.arc(towerX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // --- iki sıra uzak tepe, çok soluk
  ctx.fillStyle = Black;
  for (let layer = 0; layer < 2; layer++) {
    const base = ground - h * (0.055 - layer * 0.03);
    const tall = h * (0.07 + layer * 0.04);
    ctx.globalAlpha = 0.08 + layer * 0.06;
    ctx.beginPath();
    ctx.moveTo(-1, h);
    for (let x = 0; x <= 1.0001; x += 0.05) {
      const wave = 0.45 + Math.sin(x * 3.6 + layer * 2.1) * 0.34 + Math.sin(x * 9 + layer) * 0.16;
      ctx.lineTo(x * w, base - tall * wave);
    }
    ctx.lineTo(w + 1, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  keep(ctx, towerX, ground, towerH);

  // --- zemin: ön plandaki her şeyin üstünde durduğu çizgi
  ctx.fillStyle = Black;
  ctx.beginPath();
  ctx.moveTo(-1, ground);
  for (let x = 0; x <= 1.0001; x += 0.07) ctx.lineTo(x * w, ground - Math.sin(x * 5 + 1) * h * 0.008);
  ctx.lineTo(w + 1, h);
  ctx.lineTo(-1, h);
  ctx.closePath();
  ctx.fill();

  // --- kalabalık: dört ailenin dördü de, kuleye doğru. Küçükler, çünkü ÇOK olmaları gerek.
  //
  // Oyunun ne olduğunu bir bakışta söyleyen şey bu: her yönden gelen bir kalabalık, ve
  // aralarında tek bir kişi.
  const crowd = [
    { kind: 'walker', family: 'folk', at: 0.05, size: 0.085 },
    { kind: 'runner', family: 'swarm', at: 0.13, size: 0.07 },
    { kind: 'brute', family: 'wurm', at: 0.21, size: 0.1 },
    { kind: 'walker', family: 'spider', at: 0.29, size: 0.08 },
    { kind: 'brute', family: 'spider', at: 0.79, size: 0.095 },
    { kind: 'runner', family: 'folk', at: 0.87, size: 0.075 },
    { kind: 'walker', family: 'swarm', at: 0.94, size: 0.085 },
  ];
  for (const c of crowd) {
    // `creatureMark` gövdeyi verilen noktanın ORTASINA çiziyor, ayağına değil - hizalamadan
    // konunca hepsi zemin çizgisine yarı yarıya gömülüyordu.
    creatureMark(ctx, c.kind, c.at * w, ground - S * c.size * 0.3, S * c.size, Black, c.family);
  }

  // Dikeyde kulenin arkasına düşmemesi için yana alınıyor.
  wizard(ctx, wide ? w * 0.44 : w * 0.28, ground + h * 0.004, S * 0.17);

  title(ctx, w, h, wide, S);
}

/** Kule: dar bir gövde, mazgallı bir taç, tek sivri ve tek yanan pencere. */
function keep(ctx, x, base, tall) {
  const wide = tall * 0.3;
  ctx.fillStyle = Black;

  ctx.beginPath();
  ctx.moveTo(x - wide * 0.58, base);
  ctx.lineTo(x - wide * 0.42, base - tall * 0.78);
  ctx.lineTo(x + wide * 0.42, base - tall * 0.78);
  ctx.lineTo(x + wide * 0.58, base);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(x - wide * 0.58, base - tall * 0.87, wide * 1.16, tall * 0.09);
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(x + i * wide * 0.42 - wide * 0.13, base - tall * 0.96, wide * 0.26, tall * 0.1);
  }

  ctx.beginPath();
  ctx.moveTo(x, base - tall * 1.3);
  ctx.lineTo(x + wide * 0.19, base - tall * 0.95);
  ctx.lineTo(x - wide * 0.19, base - tall * 0.95);
  ctx.closePath();
  ctx.fill();

  // tek yanan pencere: kulede birinin olduğunu söyleyen tek şey
  ctx.fillStyle = '#fefcf7';
  ctx.beginPath();
  ctx.moveTo(x - wide * 0.095, base - tall * 0.56);
  ctx.lineTo(x + wide * 0.095, base - tall * 0.56);
  ctx.lineTo(x + wide * 0.095, base - tall * 0.42);
  ctx.quadraticCurveTo(x, base - tall * 0.36, x - wide * 0.095, base - tall * 0.42);
  ctx.closePath();
  ctx.fill();
}

/**
 * Büyücü: ince bir pelerin, ayrı bir kafa, üstünde sivri bir şapka, elinde asa.
 *
 * Tek parça siyah bir siluet, o yüzden parçaların birbirine değmemesi gerekiyor: bir denemede
 * şapka ile kafa birleşip tek bir koni oldu. Dar tutuluyor — genişleyen bir pelerin, uzaktan
 * bakınca yaratık değil çan.
 */
function wizard(ctx, x, base, tall) {
  ctx.fillStyle = Black;

  const staffX = x + tall * 0.3;
  ctx.fillRect(staffX - tall * 0.03, base - tall * 1.08, tall * 0.06, tall * 1.08);
  ctx.fillStyle = '#fefcf7';
  ctx.beginPath();
  ctx.arc(staffX, base - tall * 1.12, tall * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = Black;

  ctx.beginPath();
  ctx.moveTo(x - tall * 0.12, base - tall * 0.66);
  ctx.lineTo(x - tall * 0.26, base);
  ctx.lineTo(x + tall * 0.26, base);
  ctx.lineTo(x + tall * 0.12, base - tall * 0.66);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, base - tall * 0.78, tall * 0.11, 0, Math.PI * 2);
  ctx.fill();

  const brim = base - tall * 0.92;
  ctx.beginPath();
  ctx.ellipse(x, brim, tall * 0.25, tall * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + tall * 0.04, base - tall * 1.34);
  ctx.lineTo(x + tall * 0.16, brim);
  ctx.lineTo(x - tall * 0.16, brim);
  ctx.closePath();
  ctx.fill();
}

/**
 * Oyunun adı, iki satır.
 *
 * HER ZAMAN GÖKTE. Dikey kapakta önce alta konmuştu ve zemin çizgisini ortadan kesiyordu: üst
 * satır solgun zemine siyah, alt satır siyah zemine siyah düşüyordu, yani adın yarısı yoktu.
 * Gök, üç oranda da boş olan tek yer.
 *
 * VE SOL ÜST KÖŞEDEN UZAK. CrazyGames kendi rozetini oraya basıyor - Potion Mix ve Slime Rush
 * gönderimlerinden kalan not. Başlık ilk halinde tam oraya konmuştu, yani rozet adın üstüne
 * basacaktı. Yatayda aşağı indi, dikeyde ve karede köşenin altına.
 *
 * Portal oyunun adından başka yazıya izin vermiyor, ki iyi de ediyor.
 */
const BadgeCorner = { w: 0.3, h: 0.17 };

function title(ctx, w, h, wide, S) {
  const words = ['SHADOW', 'TOWER'];
  const size = wide ? h * 0.135 : w * 0.15;
  const lead = size * 0.98;
  const x = wide ? w * 0.07 : w / 2;
  const y = wide ? h * 0.44 : h * 0.24;

  ctx.textAlign = wide ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px ${Face}`;

  words.forEach((word, i) => {
    const ly = y + i * lead;
    // Gök üstte açık, dibe doğru koyulaşıyor; kendi solgun gölgesi adı ikisinde de ayırıyor.
    ctx.fillStyle = Pale;
    ctx.globalAlpha = 0.45;
    ctx.fillText(word, x + size * 0.03, ly + size * 0.03);
    ctx.globalAlpha = 1;
    ctx.fillStyle = Black;
    ctx.fillText(word, x, ly);
  });

  // Oyunun kendi işareti: menüdeki OYNA tuşunun üç eğik çizgisi.
  const slashY = y + lead * 1.58;
  const sx = wide ? x : x - size * 0.86;
  ctx.strokeStyle = Black;
  ctx.lineWidth = Math.max(2, S * 0.007);
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    const px = sx + i * size * 0.2;
    ctx.beginPath();
    ctx.moveTo(px, slashY + size * 0.15);
    ctx.lineTo(px + size * 0.16, slashY - size * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Enerji: bir oturumun ne kadar sürdüğünü söyleyen tek sayı.
//
// Saf veri ve aritmetik. Saat bile burada değil - her şey dışarıdan verilen bir `now` ile
// hesaplanıyor, böylece "kırk dakika sonra" diye bir şeyi beklemeden test edilebiliyor.
//
// DEPODA DURMUYOR, ZAMANDA DURUYOR. Kaydedilen şey "şu anda kaç enerjin var" değil, "şu anda
// şu kadarın vardı" ve o an. Aradaki fark, oyunu kapatınca da dolmaya devam etmesi - ki bir
// enerji sisteminin tek anlamlı davranışı budur.

/** Taşıyabileceğin en çok. */
export const Store = 60;

/**
 * Bir koşu ne yiyor.
 *
 * Beş değil, on beş. Beş, bölüm bir buçuk dakikayken seçilmişti: o zaman koşu başına ~2 dakikada
 * 5 gidiyor 4 geliyordu, yani depo yavaşça eriyordu. Bölüm beş dakikaya çıkınca aynı sayılarla
 * bir koşuda 5 gidip 11 geliyordu — yani enerji ASLA bitmiyordu ve bütün sistem ekranda duran
 * bir sayıdan ibaret kalıyordu.
 */
export const PerRun = 15;

/** Duvara hiç dokundurmadan bitirmenin iadesi. Temiz oynamanın tek somut karşılığı. */
export const Clean = 5;

/** Dakikada kaç tane doluyor. */
export const PerMinute = 2;

/** Bir dolum ne kadar sürer, milisaniye. */
export const Tick = 60000 / PerMinute;

/**
 * Şu an kaç enerji var.
 *
 * `when`'den bu yana geçen süreyi ekliyor ve depoyla sınırlıyor. Saat geriye alınırsa fark
 * negatif çıkar ve sıfıra kırpılır: telefonun saatiyle oynayarak enerji üretilmesin diye değil -
 * o zaten mümkün - eksi enerji diye bir şey olmasın diye.
 */
export function energyNow(data, now = Date.now()) {
  const e = data.energy;
  if (!e || typeof e.at !== 'number') return Store;
  const since = Math.max(0, now - (e.when || now));
  return Math.max(0, Math.min(Store, Math.floor(e.at + since / Tick)));
}

/** Yazarken hep ikisi birden: kaç tane ve ne zaman. Biri eksik kalırsa sayı donar. */
export function setEnergy(data, amount, now = Date.now()) {
  const at = Math.max(0, Math.min(Store, Math.floor(amount)));
  data.energy = { at, when: now };
  return at;
}

/** Harcar. Yetmiyorsa hiçbir şeye dokunmaz ve false döner. */
export function spendEnergy(data, cost = PerRun, now = Date.now()) {
  const have = energyNow(data, now);
  if (have < cost) return false;
  setEnergy(data, have - cost, now);
  return true;
}

/** Ekler. Depodan fazlası kaybolur, çünkü depo depodur. */
export function giveEnergy(data, amount, now = Date.now()) {
  return setEnergy(data, energyNow(data, now) + amount, now);
}

/** Bir koşuya yetiyor mu. */
export const canRun = (data, now = Date.now()) => energyNow(data, now) >= PerRun;

/**
 * Bir sonraki enerjiye kaç milisaniye var; doluysa 0.
 *
 * Geri sayımın tek saniyede bir değil sürekli akması için: ekranda duran sayı, dolmakta olan
 * şeyin kendisiyle aynı saatten okunuyor.
 */
export function untilNext(data, now = Date.now()) {
  if (energyNow(data, now) >= Store) return 0;
  const e = data.energy;
  const since = Math.max(0, now - ((e && e.when) || now));
  return Tick - (since % Tick);
}

/** Bir koşuya yetecek kadar enerjiye kaç milisaniye var; yetiyorsa 0. */
export function untilRun(data, now = Date.now()) {
  const have = energyNow(data, now);
  if (have >= PerRun) return 0;
  const need = PerRun - have;
  return untilNext(data, now) + (need - 1) * Tick;
}

/** "12:30" gibi. Saat gerekirse "1:02:30". */
export function clockOf(ms) {
  const all = Math.max(0, Math.ceil(ms / 1000));
  const s = all % 60;
  const m = Math.floor(all / 60) % 60;
  const h = Math.floor(all / 3600);
  const two = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

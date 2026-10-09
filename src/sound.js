// Sound, made rather than loaded.
//
// Tones out of an oscillator, no files. Nothing to download, nothing to decode, nothing to fall
// out of step with the build - which on a game whose whole pitch is that it opens instantly is
// worth more than any sample would be. It also keeps the game a single page of plain files, so
// it can sit on a static host with nothing behind it.
//
// The context is not created until the first tap. Browsers refuse to start one before the player
// has touched the page, and a refused context nothing ever retries is how a game ends up silent
// for everybody while sounding fine to whoever wrote it.

let ctx = null;
let out = null;
let muted = false;

function wake() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    out = ctx.createGain();
    out.gain.value = 0.5;
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * One note.
 *
 * Shaped at both ends. A tone that starts or stops at full volume clicks, and in a game that can
 * make twenty sounds a second a handful of clicks is the difference between something that sounds
 * made and something that sounds broken.
 */
function tone({ from, to = from, seconds = 0.09, kind = 'sine', loud = 0.18, delay = 0 }) {
  const c = wake();
  if (!c || muted) return;
  const at = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + seconds);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(loud, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

/** A short burst of noise, for the things that are not pitched. */
function hiss({ seconds = 0.14, loud = 0.1, bend = 1600, delay = 0 }) {
  const c = wake();
  if (!c || muted) return;
  const at = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(bend, at);
  filter.frequency.exponentialRampToValueAtTime(220, at + seconds);
  const gain = c.createGain();
  gain.gain.setValueAtTime(loud, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  src.connect(filter).connect(gain).connect(out);
  src.start(at);
}

/**
 * A spell going off.
 *
 * Each one has its own voice, because six of them are firing at once and a single sound for all
 * of them is a wash. They are also quiet: at full speed this fires several times a second, and
 * the loudest thing in the game should be something that happens rarely.
 */
export function cast(key) {
  switch (key) {
    case 'bolt':      return tone({ from: 760, to: 1180, seconds: 0.05, kind: 'triangle', loud: 0.05 });
    case 'shards':    for (let i = 0; i < 3; i++) tone({ from: 900 + i * 90, to: 1300, seconds: 0.04, kind: 'square', loud: 0.03, delay: i * 0.03 }); return;
    case 'wisp':      return tone({ from: 520, to: 980, seconds: 0.16, kind: 'sine', loud: 0.06 });
    case 'fireball':  hiss({ seconds: 0.22, loud: 0.09, bend: 900 }); return tone({ from: 180, to: 70, seconds: 0.24, kind: 'sawtooth', loud: 0.07 });
    case 'frost':     return tone({ from: 1500, to: 620, seconds: 0.2, kind: 'sine', loud: 0.06 });
    case 'lightning': hiss({ seconds: 0.1, loud: 0.08, bend: 4200 }); return tone({ from: 1700, to: 500, seconds: 0.11, kind: 'square', loud: 0.04 });
    case 'laser':     return tone({ from: 300, to: 1500, seconds: 0.18, kind: 'sawtooth', loud: 0.06 });
    case 'nova':      hiss({ seconds: 0.3, loud: 0.1, bend: 1400 }); return tone({ from: 140, to: 420, seconds: 0.3, kind: 'sine', loud: 0.08 });
    case 'meteor':    return tone({ from: 900, to: 90, seconds: 0.42, kind: 'sawtooth', loud: 0.06 });
    default:          return tone({ from: 660, seconds: 0.04, kind: 'triangle', loud: 0.04 });
  }
}

export function died(big) {
  hiss({ seconds: big ? 0.3 : 0.1, loud: big ? 0.14 : 0.05, bend: big ? 700 : 1500 });
  if (big) tone({ from: 150, to: 50, seconds: 0.4, kind: 'sawtooth', loud: 0.1 });
}

/** The wall taking a hit. Low and dull, and the only thing that sounds bad on purpose. */
export function bitten() {
  tone({ from: 110, to: 60, seconds: 0.13, kind: 'square', loud: 0.07 });
}

export function levelled() {
  [0, 0.08, 0.16].forEach((d, i) => tone({ from: 520 + i * 180, seconds: 0.16, kind: 'sine', loud: 0.1, delay: d }));
}

export function bossIn() {
  [0, 0.26].forEach((d) => tone({ from: 90, to: 60, seconds: 0.5, kind: 'sawtooth', loud: 0.14, delay: d }));
}

export function cleared() {
  [523, 659, 784, 1046].forEach((f, i) => tone({ from: f, seconds: 0.22, kind: 'sine', loud: 0.11, delay: i * 0.1 }));
}

export function over() {
  [0, 0.14, 0.3].forEach((d, i) => tone({ from: 300 - i * 70, to: 60, seconds: 0.5, kind: 'sawtooth', loud: 0.12, delay: d }));
}

export function setMuted(m) {
  muted = m;
  if (out) out.gain.value = m ? 0 : 0.5;
}

export const isMuted = () => muted;

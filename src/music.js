// Music, made rather than loaded, like everything else that makes a sound here.
//
// Two rules decide all of it.
//
// It has to survive ten minutes. A loop with a tune in it is charming twice and unbearable the
// twentieth time, and ten minutes is what this game asks for. So there is no tune: a drone that
// holds, and single notes placed far enough apart that the ear never catches a phrase to get
// tired of. What it has instead of melody is space.
//
// And it has to be about the game. The beat comes from `pressure` - the same number the wave is
// spawned from - so the music tightens as the field fills and opens out again when it clears.
// Nothing announces this; it is just true, and it is the only part of the music a player will
// actually notice.
//
// The arrangement is pure arithmetic and is tested. Only `start`, `stop` and `feel` touch audio.

import { voiceOut, wake } from './sound.js';

/** D, low. Everything else is an interval from here. */
export const Root = 73.42;

/** Minor pentatonic. No second and no sixth, which is what keeps it from sounding cheerful. */
export const Scale = [0, 3, 5, 7, 10, 12, 15, 17];

export const hzOf = (degree) =>
  Root * Math.pow(2, Scale[Math.max(0, Math.min(Scale.length - 1, degree))] / 12);

export const Bar = 4;

/**
 * Seconds a beat lasts.
 *
 * Falls as the pressure climbs, and is held between walls at both ends: slower than the top and
 * it stops being a pulse, faster than the bottom and a game that runs for four minutes turns into
 * a drum solo. The menu has no pressure and sits slower than anything a run reaches.
 */
export function beatOf(pressure, where = 'run') {
  if (where !== 'run') return 1.45;
  const p = Math.max(1, pressure || 1);
  return Math.max(0.36, Math.min(1.05, 1.15 / p));
}

/**
 * A gentle walk over the scale.
 *
 * Notes picked at random are noise and notes picked in order are a scale exercise. Stepping one
 * degree at a time, occasionally staying put, is the cheapest thing that sounds like a decision.
 */
export function walkFrom(seed) {
  let s = (Math.floor(seed) * 2654435761 + 1) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function nextDegree(at, roll, low = 1, high = Scale.length - 1) {
  const r = roll();
  const to = r < 0.34 ? at - 1 : r < 0.56 ? at : at + 1;
  if (to < low) return low + 1;
  if (to > high) return high - 1;
  return to;
}

/**
 * What is played on one beat of one bar.
 *
 * Returns null for most of them, and that is the point: three sounds in a bar of four, two of
 * them the same low note. The rest is the drone and the room.
 */
export function beatAt(bar, beat, degree, where = 'run') {
  const heavy = where === 'run';
  if (beat === 0) {
    return { hz: hzOf(0), seconds: heavy ? 1.1 : 1.6, loud: 0.1, kind: 'sine' };
  }
  if (beat === 2) {
    return { hz: hzOf(0) * 1.5, seconds: 0.9, loud: 0.055, kind: 'sine' };
  }
  // the one voice that moves, and only on the odd beats of every other bar
  if (bar % 2 === 1 && beat === 3) {
    return { hz: hzOf(degree) * 2, seconds: 1.4, loud: heavy ? 0.05 : 0.038, kind: 'triangle' };
  }
  return null;
}

// --- the part that makes a noise -----------------------------------------------------------

let timer = null;
let drone = [];
let bar = 0;
let beat = 0;
let at = 0;             // audio-clock time of the next beat
let degree = 3;
let roll = walkFrom(1);
let where = 'menu';
let pressure = 1;
let on = true;

export const isOn = () => on;

/** What the music is doing, for a tool to read. Counts notes handed to the audio clock. */
let made = 0;
export const played = () => ({ on, where, bar, beat, drone: drone.length, notes: made, running: !!timer });

export function setOn(yes) {
  on = !!yes;
  if (!on) stop();
}

/** The pressure the music is keeping time with. Taken every frame; acted on at the next beat. */
export function feel(p) {
  pressure = p;
}

function holdDrone(c, bus) {
  // Two oscillators a few cents apart. One alone is a test tone; two beating against each other
  // is a room.
  for (const detune of [-7, 6]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = Root / 2;
    osc.detune.value = detune;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, c.currentTime + 2.5);
    osc.connect(filter).connect(gain).connect(bus);
    osc.start();
    drone.push({ osc, gain });
  }
}

function tick() {
  const c = wake();
  const bus = voiceOut();
  if (!c || !bus) return;
  // schedule everything that falls in the next quarter second, which is further ahead than any
  // stutter this game produces
  const until = c.currentTime + 0.25;
  let guard = 0;
  while (at < until && guard++ < 16) {
    const note = beatAt(bar, beat, degree, where);
    if (note) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = note.kind;
      osc.frequency.setValueAtTime(note.hz, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(note.loud, at + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.seconds);
      osc.connect(gain).connect(bus);
      osc.start(at);
      osc.stop(at + note.seconds + 0.05);
      made += 1;
    }
    at += beatOf(pressure, where);
    beat += 1;
    if (beat >= Bar) {
      beat = 0;
      bar += 1;
      degree = nextDegree(degree, roll);
    }
  }
}

export function start(place = 'menu', seed = Date.now()) {
  if (!on) return;
  const c = wake();
  const bus = voiceOut();
  if (!c || !bus) return;
  if (where === place && timer) return;
  stop();
  where = place;
  bar = 0;
  beat = 0;
  degree = 3;
  roll = walkFrom(seed);
  at = c.currentTime + 0.15;
  holdDrone(c, bus);
  timer = setInterval(tick, 60);
  tick();
}

export function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  const c = wake();
  for (const d of drone) {
    try {
      if (c) {
        d.gain.gain.cancelScheduledValues(c.currentTime);
        d.gain.gain.setValueAtTime(d.gain.gain.value, c.currentTime);
        d.gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.4);
        d.osc.stop(c.currentTime + 0.5);
      } else {
        d.osc.stop();
      }
    } catch { /* already stopped */ }
  }
  drone = [];
}

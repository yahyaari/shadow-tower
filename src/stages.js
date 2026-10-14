// The stages: what each one is called, what it looks like, and which boss waits at the end.
//
// Data only. The menu draws the picture from `look`, which names a kind of place rather than a
// file - there is no artwork in this game and there is not going to be any, so a stage portrait
// is the same two inks as everything else: a horizon, some shapes against it, and the keep.
//
// Past the end of the list the names start again with a number on them, so there is always
// something to call stage forty.

import { bossFor } from './rules.js';

export const Stages = [
  {
    name: ['The Dead Wood', 'Uğursuz Orman'],
    blurb: ['bare trees, and something moving between them', 'çıplak ağaçlar, aralarında kıpırdayan bir şey'],
    look: 'wood',
  },
  {
    name: ['The Ashen Field', 'Küllü Ova'],
    blurb: ['open ground, nothing to hide behind', 'açık arazi, saklanacak hiçbir şey yok'],
    look: 'field',
  },
  {
    name: ['The Broken Road', 'Kırık Yol'],
    blurb: ['they come up the old road, in numbers', 'eski yoldan geliyorlar, kalabalık'],
    look: 'road',
  },
  {
    name: ['The Standing Stones', 'Dikili Taşlar'],
    blurb: ['older than the wall, and watching', 'duvardan eski, ve seyrediyor'],
    look: 'stones',
  },
  {
    name: ['The Drowned Hollow', 'Boğulmuş Çukur'],
    blurb: ['low ground, and they come from every side at once', 'alçak zemin, her yönden birden'],
    look: 'hollow',
  },
  {
    name: ['The Last Ridge', 'Son Sırt'],
    blurb: ['nothing beyond this but the dark', 'bundan ötesi sadece karanlık'],
    look: 'ridge',
  },
];

/** What to call a stage, however far out it is. */
export function stageOf(n) {
  const at = (n - 1) % Stages.length;
  const round = Math.floor((n - 1) / Stages.length);
  const base = Stages[at];
  return round === 0 ? base : { ...base, name: base.name.map((s) => `${s} ${round + 1}`) };
}

/**
 * Which creatures walk in on a stage.
 *
 * Read from the same rule the wave uses, rather than written out beside it - a list that is kept
 * by hand is a list that goes out of step with the thing it describes the first time either
 * changes. Brutes only start once the pressure is up, which on the first stage is partway in and
 * on later ones is from the opening second.
 */
export function kindsOn(stage) {
  const out = ['walker', 'runner'];
  // the pressure a stage reaches by the time its boss arrives
  const peak = (1 + (72 - 25) / 56) * (1 + (stage - 1) * 0.2);
  if (peak > 1.5) out.push('brute');
  out.push(bossFor(stage));
  return out;
}

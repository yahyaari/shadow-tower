// What survives a reload: the furthest stage, and whether the sound is off.
//
// localStorage and nothing else. Every read is wrapped, because a private window, blocked site
// data or a full quota all throw rather than return nothing, and none of those is a reason for
// the game to refuse to run.

const Key = 'shadowtower';
const blank = { best: 0, runs: 0, kills: 0, muted: false };

export function load() {
  try {
    const raw = localStorage.getItem(Key);
    return raw ? { ...blank, ...JSON.parse(raw) } : { ...blank };
  } catch {
    return { ...blank };
  }
}

export function save(data) {
  try {
    localStorage.setItem(Key, JSON.stringify(data));
  } catch {
    /* a browser that will not keep it is not a browser that should stop the game */
  }
}

/** Books a finished run. Returns what it beat, because that is the part worth saying. */
export function record(data, stage, kills) {
  const was = data.best || 0;
  const beat = stage > was;
  if (beat) data.best = stage;
  data.runs = (data.runs || 0) + 1;
  data.kills = (data.kills || 0) + kills;
  save(data);
  return { beat, was, value: data.best };
}

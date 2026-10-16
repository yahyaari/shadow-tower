// The portal: everything that knows CrazyGames exists.
//
// One file, and every function in it is a no-op when the SDK is not there - which is the case on
// a local server, on GitHub Pages, and in every test. The game does not import this to find out
// whether it is on a portal; it calls these and they quietly do nothing.
//
// The SDK is loaded by a script tag in `index.html`. If it fails to load - offline, blocked, or
// served from somewhere CrazyGames has never heard of - `window.CrazyGames` is simply undefined
// and everything below falls through.
//
//   docs.crazygames.com/sdk/intro      init and the script tag
//   docs.crazygames.com/sdk/game       loadingStart/Stop, gameplayStart/Stop, happytime
//   docs.crazygames.com/sdk/video-ads  requestAd, hasAdblock

/** How many rewarded adverts a day, per thing they buy. */
export const Allow = { spin: 3, small: 3, great: 3, double: 3, speed: 3, energy: 3 };

export const Kinds = Object.keys(Allow);

const sdk = () => (typeof window !== 'undefined' && window.CrazyGames && window.CrazyGames.SDK) || null;

/**
 * What the portal has told us about itself.
 *
 * `started` is set once `init()` has resolved: the docs say nothing else may be called before it,
 * and a `requestAd` sent during loading is an advert that never plays. `blocked` comes from the
 * SDK's own adblock check - the game must work with an adblocker, so this only decides whether to
 * offer buttons that cannot pay.
 */
const portal = { started: false, blocked: false, playing: false, loaded: false };

/**
 * Başlatılmamış bir SDK'ya DOKUNMAK bile hata fırlatıyor.
 *
 * CrazyGames'in QA ortamında oyuncunun reklam engelleyicisi portalın kendi scriptlerini de
 * engelledi, `init()` başarısız oldu, ve ondan sonra `SDK.ad` özelliğini OKUMAK
 * "CrazySDK is not initialized yet" diye patlamaya başladı. `ready()` içinde `sdk().ad`
 * `portal.started`'dan ÖNCE okunuyordu, yani kontrol hiçbir işe yaramıyordu: ödüller sekmesi
 * karenin ortasında ölüyor, sekme şeridi çizilmiyor ve oyuncu o ekranda kapana kısılıyordu.
 *
 * Buradan sonra portalın hiçbir parçasına, `portal.started` doğrulanmadan ve bir `try` olmadan
 * dokunulmuyor. Dokümanın kendi şartı da bu: oyun, reklam engelleyici varken de çalışmalı.
 */
function part(name) {
  if (!portal.started) return null;
  const s = sdk();
  if (!s) return null;
  try {
    return s[name] || null;
  } catch {
    return null;
  }
}

/** Whether a rewarded advert can actually be shown right now. */
export function ready() {
  return !!(part('ad') && !portal.blocked);
}

/**
 * Starts the portal, and says the game has begun loading.
 *
 * The docs put `loadingStart` BEFORE `init`, and that is what this did - and the portal never
 * saw it. Reading `SDK.game` before `init` has resolved throws on this version, which is the
 * same thing that once froze the rewards tab; the call was in its own `try`, so it failed
 * silently and the only trace was in CrazyGames' own panel, which listed Loading Stop as
 * detected and Loading Start as not. A call the portal cannot receive is not a call.
 *
 * So: `init` first, then `loadingStart`, and `loadingStop` is `loaded()` below - called once
 * the game can actually draw, so there is a real loading window between the two rather than two
 * calls in the same millisecond.
 *
 * Resolves either way: a portal that is not there must not stop the game from opening, and this
 * is awaited on the path to the first frame.
 */
export async function open() {
  const s = sdk();
  if (!s) return false;
  try {
    await s.init();
    portal.started = true;
    if (s.ad && s.ad.hasAdblock) {
      try { portal.blocked = !!(await s.ad.hasAdblock()); } catch { portal.blocked = false; }
    }
  } catch {
    // An SDK that will not start is an SDK that is not there.
    portal.started = false;
  }
  const g = part('game');
  try { if (g && g.loadingStart) g.loadingStart(); } catch { /* yoksa yok */ }
  return portal.started;
}

/**
 * The game can draw now.
 *
 * The other half of `open()`. Idempotent, because the loop starts once but this is the kind of
 * call that gets added to a second place a year later.
 */
export function loaded() {
  if (portal.loaded) return;
  const g = part('game');
  if (!g) return;
  portal.loaded = true;
  try { if (g.loadingStop) g.loadingStop(); } catch { /* yoksa yok */ }
}

/**
 * The player is playing, or has stopped.
 *
 * Called when a run begins and when it ends, and around the pause panel. NOT around the card
 * screen: the docs ask for this on every break, but a five-minute run opens forty card screens
 * for a few seconds each, and forty start-stop pairs is noise rather than a signal.
 *
 * Idempotent, because the run screen has several ways in and out and double-calling these is the
 * kind of thing that is easy to do and hard to see.
 */
export function playing(on) {
  const g = part('game');
  if (!g || portal.playing === !!on) return;
  portal.playing = !!on;
  try {
    if (on) g.gameplayStart();
    else g.gameplayStop();
  } catch { /* portal susarsa oyun durmaz */ }
}

/**
 * A moment worth a celebration on the portal's side.
 *
 * Sparingly, the docs say, and they mean it: not every boss and not every level. Here it is a
 * stage cleared for the FIRST time, which happens a dozen times in the life of an account.
 */
export function cheer() {
  const g = part('game');
  try { if (g && g.happytime) g.happytime(); } catch { /* yoksa yok */ }
}

/** How far through the game this account is, 0 to 100. Only ever moves forward. */
export function progress(howFar) {
  const g = part('game');
  try {
    if (g && g.reportGameCompletedPercentage) {
      g.reportGameCompletedPercentage(Math.max(0, Math.min(100, Math.round(howFar))));
    }
  } catch { /* yoksa yok */ }
}

/**
 * The portal's own audio switch, which outranks the game's.
 *
 * The docs are explicit: when `muteAudio` is set, the in-game toggle must not turn sound back on.
 * `onMute` is handed the portal's wish and the game obeys it.
 */
export function watchSettings(onMute) {
  const g = part('game');
  if (!g) return;
  const tell = () => { try { onMute(mutedByPortal()); } catch { /* yoksa yok */ } };
  try { if (g.addSettingsChangeListener) g.addSettingsChangeListener(tell); }
  catch { /* yoksa yok */ }
  tell();
}

/**
 * Where the save goes.
 *
 * The portal's data module has exactly localStorage's shape - `getItem`, `setItem` - and keeps
 * the save with the ACCOUNT rather than the browser, so a player who comes back on their phone
 * finds their spells where they left them. Logged out, the module falls back to localStorage by
 * itself, so there is one code path and not two.
 *
 * Null off the portal, and `meta.js` uses localStorage directly then.
 */
export function store() {
  const box = part('data');
  return box && typeof box.getItem === 'function' ? box : null;
}

export const mutedByPortal = () => {
  const g = part('game');
  try {
    return !!(g && g.settings && g.settings.muteAudio);
  } catch {
    return false;
  }
};

/**
 * Shows one REWARDED advert and resolves with whether it was watched through.
 *
 * Rewarded is the only kind this game shows. The SDK also offers `"midgame"` - an advert between
 * runs that nobody asks for and nothing pays for - and it is deliberately not used: every advert
 * here is one the player pressed a button to see, in exchange for something named on the button.
 *
 * Resolves false rather than rejecting when there is nothing to show, because every caller has
 * the same thing to do about it either way: pay nothing and say so. `adError` fires for a filled
 * ad that failed AND for no ad at all - including `adsDisabledBasicLaunch`, which is every advert
 * until the game is past its first launch stage.
 *
 * `hush` is called with true when the advert starts and false when it ends, however it ends. The
 * SDK pauses the game itself; the sound is ours to silence.
 */
export function show(hush = null) {
  if (!ready()) return Promise.resolve(false);
  return new Promise((done) => {
    let shut = false;
    const end = (won) => {
      if (shut) return;
      shut = true;
      if (hush) { try { hush(false); } catch { /* yoksa yok */ } }
      done(won);
    };
    const ad = part('ad');
    if (!ad) { end(false); return; }
    try {
      ad.requestAd('rewarded', {
        adStarted: () => { if (hush) { try { hush(true); } catch { /* yoksa yok */ } } },
        adFinished: () => end(true),
        adError: () => end(false),
      });
    } catch {
      end(false);
    }
  });
}

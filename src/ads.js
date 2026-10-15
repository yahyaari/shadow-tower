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
const portal = { started: false, blocked: false, playing: false };

/** Whether a rewarded advert can actually be shown right now. */
export function ready() {
  return !!(sdk() && sdk().ad && portal.started && !portal.blocked);
}

/**
 * Starts the portal, around whatever the game does to load.
 *
 * `loadingStart` before anything, `init` awaited, `loadingStop` when the first frame can be
 * drawn. Resolves either way: a portal that is not there must not stop the game from opening,
 * and this is awaited on the path to the first frame.
 */
export async function open() {
  const s = sdk();
  if (!s) return false;
  try {
    if (s.game && s.game.loadingStart) s.game.loadingStart();
    await s.init();
    portal.started = true;
    if (s.ad && s.ad.hasAdblock) {
      try { portal.blocked = !!(await s.ad.hasAdblock()); } catch { portal.blocked = false; }
    }
  } catch {
    // An SDK that will not start is an SDK that is not there.
    portal.started = false;
  }
  // Only if it started. Calling `loadingStop` on an SDK that failed to initialise is how you get
  // a third console error for free.
  if (portal.started) {
    try { if (s.game && s.game.loadingStop) s.game.loadingStop(); } catch { /* yoksa yok */ }
  }
  return portal.started;
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
  const s = sdk();
  if (!s || !portal.started || !s.game || portal.playing === !!on) return;
  portal.playing = !!on;
  try {
    if (on) s.game.gameplayStart();
    else s.game.gameplayStop();
  } catch { /* portal susarsa oyun durmaz */ }
}

/**
 * A moment worth a celebration on the portal's side.
 *
 * Sparingly, the docs say, and they mean it: not every boss and not every level. Here it is a
 * stage cleared for the FIRST time, which happens a dozen times in the life of an account.
 */
export function cheer() {
  const s = sdk();
  if (!s || !portal.started || !s.game || !s.game.happytime) return;
  try { s.game.happytime(); } catch { /* yoksa yok */ }
}

/** How far through the game this account is, 0 to 100. Only ever moves forward. */
export function progress(part) {
  const s = sdk();
  if (!s || !portal.started || !s.game || !s.game.reportGameCompletedPercentage) return;
  try { s.game.reportGameCompletedPercentage(Math.max(0, Math.min(100, Math.round(part)))); }
  catch { /* yoksa yok */ }
}

/**
 * The portal's own audio switch, which outranks the game's.
 *
 * The docs are explicit: when `muteAudio` is set, the in-game toggle must not turn sound back on.
 * `onMute` is handed the portal's wish and the game obeys it.
 */
export function watchSettings(onMute) {
  const s = sdk();
  if (!s || !portal.started || !s.game || !s.game.addSettingsChangeListener) return;
  const tell = () => {
    try { onMute(!!(s.game.settings && s.game.settings.muteAudio)); } catch { /* yoksa yok */ }
  };
  try { s.game.addSettingsChangeListener(tell); } catch { /* yoksa yok */ }
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
  const s = sdk();
  return (portal.started && s && s.data && typeof s.data.getItem === 'function') ? s.data : null;
}

export const mutedByPortal = () => {
  const s = sdk();
  return !!(s && portal.started && s.game && s.game.settings && s.game.settings.muteAudio);
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
    try {
      sdk().ad.requestAd('rewarded', {
        adStarted: () => { if (hush) { try { hush(true); } catch { /* yoksa yok */ } } },
        adFinished: () => end(true),
        adError: () => end(false),
      });
    } catch {
      end(false);
    }
  });
}

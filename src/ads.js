// The seam where rewarded adverts go.
//
// Nothing here shows an advert, because the CrazyGames SDK is not in the game yet. What is here
// is everything around one: how many are allowed a day, what each one pays for, and a single
// `show()` that the rest of the game awaits.
//
// It is written now rather than later so the buttons, the counters and the daily limits are real
// and tested. When the SDK arrives, `ready()` starts returning true and `show()` calls it - one
// file changes and nothing else does.
//
// `ready()` is false today on purpose. A button that paid out without an advert would be a free
// prize behind a pointless wait, and three free wheel spins a day would quietly undo the one rule
// the economy is built on.

/** How many rewarded adverts a day, per thing they buy. */
export const Allow = { spin: 3, small: 3, great: 3, double: 3, speed: 3 };

export const Kinds = Object.keys(Allow);

/** Whether an advert can actually be shown right now. */
export function ready() {
  return typeof window !== 'undefined'
    && !!window.CrazyGames
    && !!window.CrazyGames.SDK
    && !!window.CrazyGames.SDK.ad;
}

/**
 * Shows one rewarded advert and resolves with whether it was watched through.
 *
 * Resolves false rather than rejecting when there is nothing to show, because every caller has
 * the same thing to do about it either way: pay nothing and say so.
 */
export function show() {
  if (!ready()) return Promise.resolve(false);
  return new Promise((done) => {
    try {
      window.CrazyGames.SDK.ad.requestAd('rewarded', {
        adFinished: () => done(true),
        adError: () => done(false),
        adStarted: () => {},
      });
    } catch {
      done(false);
    }
  });
}

// Two languages, and the one small function that picks between them.
//
// Every piece of writing in the game is a pair: `['Magic Bolt', 'Sihirli Ok']`. English first,
// because that is the language the portal and its players are in; Turkish second, because that is
// the language it is made in. The pair lives next to the thing it names - in `spells.js` beside
// the spell, here beside the button - rather than in a key table somewhere else, so a string and
// its translation cannot drift apart or go missing without the test seeing it.

export const Languages = ['en', 'tr'];
export const LanguageNames = { en: 'ENGLISH', tr: 'TÜRKÇE' };

let at = 0;

export function setLanguage(code) {
  const i = Languages.indexOf(code);
  at = i < 0 ? 0 : i;
}

export const language = () => Languages[at];

/**
 * Picks the line in the current language.
 *
 * Takes a pair, a plain string, or nothing. A plain string comes back as it is, which is what
 * makes it safe to run over something half-translated: the English shows rather than the screen
 * going blank. `{n}` is filled from whatever is passed after it.
 */
export function say(pair, ...fill) {
  let out = Array.isArray(pair) ? (pair[at] ?? pair[0] ?? '') : (pair ?? '');
  for (let i = 0; i < fill.length; i++) out = out.split(`{${i}}`).join(String(fill[i]));
  return out;
}

/** Everything written on the screen that is not a spell. */
export const UI = {
  title:        ['SHADOW TOWER', 'GÖLGE KULE'],
  level:        ['LEVEL {0}', 'SEVİYE {0}'],
  chooseUpTo:   ['CHOOSE {0}', '{0} TANE SEÇ'],
  chooseMore:   ['PICK {0} MORE', '{0} TANE DAHA SEÇ'],
  always:       ['ALWAYS', 'HER ZAMAN'],
  newSpell:     ['NEW SPELL', 'YENİ BÜYÜ'],
  notYet:       ['not cast until you take it', 'alana kadar ateşlenmez'],
  begin:        ['BEGIN  ·  {0}/{1}', 'BAŞLA  ·  {0}/{1}'],
  locked:       ['LOCKED', 'KİLİTLİ'],
  opensAt:      ['opens at level {0}', 'seviye {0}’da açılır'],
  unlockSoon:   ['{0} at level {1}', '{0}: seviye {1}'],
  allYours:     ['every spell is yours', 'bütün büyüler açık'],
  bestStage:    ['best: stage {0}', 'en iyi: bölüm {0}'],

  lv:           ['LV {0}', 'SV {0}'],
  stage:        ['STAGE {0}', 'BÖLÜM {0}'],
  wall:         ['WALL', 'DUVAR'],
  cast:         ['CAST', 'ATIŞ'],
  speed:        ['SPEED', 'HIZ'],
  spells:       ['SPELLS', 'BÜYÜLER'],
  down:         ['{0} DOWN', '{0} ÖLÜ'],
  warden:       ['THE WARDEN', 'GARDİYAN'],

  takeOne:      ['TAKE ONE', 'BİRİNİ AL'],
  cleared:      ['STAGE {0} CLEARED', 'BÖLÜM {0} GEÇİLDİ'],
  complete:     ['STAGE {0} COMPLETE', 'BÖLÜM {0} TAMAMLANDI'],
  wallLeft:     ['the wall held at {0}%', 'duvar %{0} ile ayakta kaldı'],
  starNone:     ['no stars — hold more of the wall', 'yıldız yok — duvarı daha çok koru'],
  starFor:      ['{0}% for the next star', 'sonraki yıldız için %{0}'],
  allStars:     ['every star', 'bütün yıldızlar'],
  play:         ['PLAY', 'OYNA'],
  stageLocked:  ['finish stage {0} first', 'önce bölüm {0}\u2019i bitir'],
  nextStage:    ['NEXT STAGE', 'SONRAKİ BÖLÜM'],
  retry:        ['TRY AGAIN', 'TEKRAR DENE'],
  toMenu:       ['CHOOSE AGAIN', 'BAŞA DÖN'],
  mended:       ['the wall is mended — take one', 'duvar onarıldı — birini al'],
  tapCard:      ['tap a card  ·  or press 1, 2, 3', 'bir karta dokun  ·  ya da 1, 2, 3'],
  tierCard:     ['{0} — TIER {1}', '{0} — KADEME {1}'],
  power:        ['POWER', 'GÜÇ'],
  newPower:     ['NEW POWER', 'YENİ GÜÇ'],
  withSpell:    ['with {0}', '{0} sayesinde'],
  moreToTier:   ['{0} more to tier {1}', 'kademe {1} için {0} tane daha'],

  hint:         ['YOUR SPELLS CAST THEMSELVES — TAP TO MAKE THEM CAST FASTER',
                 'BÜYÜLER KENDİLİĞİNDEN ÇIKAR — DOKUNDUKÇA HIZLANIR'],
  fell:         ['THE WALL FELL', 'DUVAR YIKILDI'],
  runLine:      ['level {0}  ·  {1} down  ·  {2}', 'seviye {0}  ·  {1} ölü  ·  {2}'],
  earned:       ['+{0} EXPERIENCE', '+{0} DENEYİM'],
  unlocked:     ['LEVEL {0} — {1} UNLOCKED', 'SEVİYE {0} — {1} AÇILDI'],
  levelledTo:   ['level {0} — {1} at level {2}', 'seviye {0} — {1}: seviye {2}'],
  levelledPlain:['level {0}', 'seviye {0}'],
  newBest:      ['a new best', 'yeni rekor'],
  newBestWas:   ['a new best — you had only reached stage {0}', 'yeni rekor — en iyin bölüm {0} idi'],
  yourBest:     ['your best is stage {0}', 'en iyin: bölüm {0}'],
  tapAgain:     ['TAP TO CHOOSE AGAIN', 'TEKRAR SEÇMEK İÇİN DOKUN'],

  language:     ['LANGUAGE', 'DİL'],
  sound:        ['SOUND', 'SES'],
  on:           ['ON', 'AÇIK'],
  off:          ['OFF', 'KAPALI'],
};

# Shadow Tower

**Play it: https://yahyaari.github.io/shadow-tower/**

A wizard, a waist-high wall, and everything in the dark walking towards you. You bring up to five
spells; they cast themselves, and tapping makes all of them cast faster. Every few kills you take
one of three cards. Survive the waves, kill the Warden at the end of the stage, and the next
stage begins harder.

Black and white, silhouettes only. No engine, no build step, no dependencies: the browser opens
`index.html` and the game is running. The whole thing is under 100 KB.

## Three layers

**The account.** Finishing a run earns experience that keeps between runs, and account levels
unlock spells. Five are open from the first minute — enough to fill a loadout — and the other five
arrive at levels 3, 5, 7, 10 and 13. Each one is not only a new spell but a new set of tier cards
for the ones you already had, so it is the reason to open the game tomorrow.

**The loadout.** Four slots. The first is always Magic Bolt; you choose the other three. It is a
pool rather than a starting hand — what you bring decides what the cards can offer you.

**The stage.** Chosen from the menu, with arrows either side. A stage is waves and then the
Warden; finishing it is scored on how much of the wall is still standing — 100% is three stars,
95% two, 60% one. Stars are kept at their best, and finishing a stage opens the next.

**The run.** A stage opens with Magic Bolt and nothing else. The three spells you brought arrive as
**NEW SPELL** cards as you level, and only cast once taken. Every other card belongs to a spell
you are carrying — more projectiles, a wider blast, a shorter cooldown — and **every fifth boost
on a spell turns it into the next tier**, a card that changes what the spell *does* rather than
how much of it there is.

There are no global upgrades. A flat "+18% damage" is not the same card on two spells: measured
against the same crowd, Nova does ten times the work Magic Bolt does, so the same percentage hands
it ten times the gain. Every spell has its own numbers, and the ones already doing the most work
gain the least — Magic Bolt's damage card is +40%, Nova's is +13%. The only card that is not a
spell is **Mend**, and it is only offered once the wall has actually been hit.

## The combinations

A tier card can borrow from another spell, and those only exist if you are carrying it.

> **Conduct** — an electric storm where it lands.

Magic Bolt can only be offered that if you have **taken** Lightning in this run — not merely
brought it. Not rarely: never. Of the 41 tier cards in the game, 24 are locked behind another
spell, so what you bring decides what your spells can become. Fireball lets things leave fire behind; Frost Orb lets them freeze; Lightning
lets them arc.

## Controls

| | |
| --- | --- |
| tap / click | speed up every spell for a moment |
| space | the same |
| 1 2 3 | take that card when levelling |
| M | mute |

## The spells

**Magic Bolt** homes on the nearest · **Shards** throws three in a fan · **Wisp** hunts whatever is
toughest · **Fireball** bursts where it lands · **Frost Orb** bursts and slows · **Lightning**
leaps between them · **Beam** burns a line clean through · **Nova** hits everything near the wall ·
**Meteor** falls on the thickest part of the crowd · **Orbit** is a blade circling you, always.

Plus **Mend**, the one card that is not a spell: the wall rebuilds itself.

## Running it

```sh
node Tools/serve.mjs . 8050          # then open http://localhost:8050
node Tools/test.mjs                  # the rules and a bot, no browser
node Tools/peek.mjs http://localhost:8050/ Logs/peek 1280 720
```

`src/rules.js` is the whole game and touches no DOM, which is why a bot can play hundreds of runs
in Node and say whether the curve is right. `src/draw.js` decides nothing. `src/spells.js` is all
data. Notes on how it is built, and the four balance mistakes made on the way, are in
[`Docs/working-on-this.md`](Docs/working-on-this.md).

## Where it stands

No music, one arena, one kind of boss. The spells do not combine into named weapons the way the
genre's best do — a tier borrows an effect rather than producing a new spell.

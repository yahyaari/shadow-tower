# Shadow Tower

**Play it: https://yahyaari.github.io/shadow-tower/**

A wizard, a waist-high wall, and everything in the dark walking towards you. Your spells cast
themselves — tap to make them cast faster. Every few kills you level up and take one of three
cards: a new spell, a deeper one, or a power that improves everything you own. Survive the waves,
kill the Warden at the end of the stage, and the next stage begins harder.

Black and white, silhouettes only. No engine, no build step, no dependencies: the browser opens
`index.html` and the game is running. The whole thing is about 50 KB.

## Controls

| | |
| --- | --- |
| tap / click anywhere | speed up every spell for a moment |
| space | the same |
| 1 2 3 | take that card when levelling |
| M | mute |

## The spells

Ten, each with a different job rather than a bigger number than the last. You can carry six, each
up to five levels.

**Magic Bolt** homes on the nearest · **Shards** throws three in a fan · **Wisp** hunts whatever
is toughest · **Fireball** bursts where it lands · **Frost Orb** bursts and slows · **Lightning**
leaps between them · **Beam** burns a line clean through · **Nova** hits everything near the wall
· **Meteor** falls on the thickest part of the crowd · **Orbit** is a blade circling you, always.

And four powers: **Might** (damage), **Haste** (cast speed), **Reach** (blast size), **Mend** (the
wall rebuilds itself).

## Running it

```sh
node Tools/serve.mjs . 8050          # then open http://localhost:8050
node Tools/test.mjs                  # the rules and a bot, no browser, about a second
node Tools/look.mjs http://localhost:8050/ Logs/look "30,130" 1280 720
```

`src/rules.js` is the whole game and touches no DOM, which is why a bot can play hundreds of runs
in Node and say whether the curve is right. `src/draw.js` decides nothing. Notes on how it is
built and what went wrong on the way are in [`Docs/working-on-this.md`](Docs/working-on-this.md).

## Where it stands

A decent player clears stage 1 every time, stage 2 about a third of the time, and stage 3 rarely.
A run lasts about three and a half minutes. There is no music, no second kind of arena, and the
spells do not combine into anything yet.

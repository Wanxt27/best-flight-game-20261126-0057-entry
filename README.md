# Merpati Express — Island Hopper

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Wanxt27/best-flight-game-20261126-0057-entry/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Wanxt27/best-flight-game-20261126-0057-entry/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

An original 2D flight game for the [make.fun best flight game bounty](https://make.fun/c/best-flight-game-20261126-0057): fly a small Indonesian mail plane between island airstrips, thread glowing rings, and land before the fuel runs out.

## Play

```sh
node serve.ts        # then open http://localhost:8080
```

Or open `game/index.html` from any static server. No network requests, no build step, keyboard + mouse.

- **Take off** from the runway, **fly through the glowing rings** in order, then **land** on the next island's strip.
- **3 islands per run** — Pulau Merpati → Pulau Kelapa → Pulau Api → Pulau Ombak — with stronger crosswind and narrower rings each leg, and a smoking volcano to avoid on Pulau Api.
- **Score** for rings (centre hits pay extra), smooth landings, and on-time arrivals. Ditching in the sea, clipping the volcano, or running dry ends the run.

## Controls

| Key | Action |
| --- | --- |
| ↑ / ↓ | Pitch up / down |
| ← / → | Bank and turn |
| W / S | Throttle up / down |
| Space | Airbrake / flaps |
| P | Pause |
| R | Restart |
| M | Mute |
| Enter | Start / continue |
| Mouse | Click the menu buttons |

## The game

- **Chase view** over sea, green islands with beaches, a volcano, clouds and sun, with the plane in frame and a lit instrument panel: altimeter, airspeed, heading compass, fuel gauge, ring counter and timer.
- **Synthesised sound** (WebAudio, no audio files): engine hum tied to throttle, wind, ring chimes, landing thud.
- **Original art, sounds and names** — plain canvas shapes in one warm palette, no copied assets.

## Layout

- `game/index.html` — page shell, loads `src/main.js`
- `game/src/main.js` — bootstrap, game loop and state machine
- `game/src/world.js` — flight model, rings, landings, crashes
- `game/src/render.js` — pseudo-3D chase view: sky, sea, islands, rings, plane
- `game/src/hud.js` — instrument panel, compass, menus and results
- `game/src/config.js` — tuning, legs, scoring, palette
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — WebAudio synthesis
- `game/src/shots.js` — `?shot=` presets used for the screenshots
- `main.ts` — entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — real renders of the game in headless Chromium
- `serve.ts` — tiny static dev server for `game/`

## License

MIT — see [LICENSE](LICENSE).

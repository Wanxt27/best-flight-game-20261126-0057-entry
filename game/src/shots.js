// Screenshot presets: `?shot=<name>&seed=<n>` jumps the game into a fixed,
// good-looking moment so screenshots are real renders of the game code.
// Normal play never passes a shot parameter.
import { makeRun, buildLeg } from './world.js';
import { mulberry32 } from './config.js';

const PRESETS = {
  // Title menu over the home runway, plane parked and ready.
  start(run) {
    run.state = 'menu';
    run.plane.throttle = 0.3;
  },
  // Mid-flight: two rings down, third ring dead ahead, islands and volcano in view.
  play(run) {
    run.state = 'flying';
    const p = run.plane;
    p.onGround = false;
    p.alt = 118;
    p.speed = 92;
    p.throttle = 0.72;
    p.dist = run.leg.rings[1].z - 260;
    p.x = run.leg.rings[2].x * 0.4;
    p.heading = 2;
    run.leg.rings[0].hit = true;
    run.leg.rings[1].hit = true;
    run.leg.nextRing = 2;
    run.ringsHit = 2;
    run.score = 320;
    run.time = 41;
  },
  // Right on top of a ring, centre-line, propeller spinning.
  ring(run) {
    run.state = 'flying';
    const p = run.plane;
    const target = run.leg.rings[1];
    p.onGround = false;
    p.alt = target.y;
    p.speed = 88;
    p.throttle = 0.68;
    p.dist = target.z - 120;
    p.x = target.x;
    p.heading = 0;
    run.leg.rings[0].hit = true;
    run.leg.nextRing = 1;
    run.ringsHit = 1;
    run.score = 160;
    run.time = 24;
  },
  // Final approach: low over the sea, destination runway and island ahead.
  land(run) {
    run.state = 'landing';
    const p = run.plane;
    const leg = run.leg;
    p.onGround = false;
    p.alt = 26;
    p.speed = 52;
    p.throttle = 0.34;
    p.dist = leg.def.legLength - 780;
    p.x = 4;
    p.heading = -1;
    p.vspeed = -2.4;
    for (const r of leg.rings) r.hit = true;
    leg.nextRing = leg.rings.length;
    run.ringsHit = leg.rings.length;
    run.score = 940;
    run.time = 96;
  },
};

export function applyShot(run, params) {
  const name = params.get('shot');
  if (!name || !PRESETS[name]) return false;
  const seed = Number(params.get('seed') || '20261126');
  const fresh = makeRun(Number.isFinite(seed) ? seed : 20261126);
  // Rebuild this run from the seeded fresh one so terrain matches the seed.
  run.leg = fresh.leg;
  run.clouds = fresh.clouds;
  run.birds = fresh.birds;
  run.seed = fresh.seed;
  PRESETS[name](run);
  // Freeze the clock so the render is identical every time.
  run.time = run.time || 0;
  run.frozenTime = run.time;
  return true;
}

export { buildLeg, mulberry32 };

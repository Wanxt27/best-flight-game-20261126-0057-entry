// World state: the plane, the route, the rings and the terrain features.
// The world is a forward corridor: distance grows with speed, lateral offset
// and altitude are the pilot's to manage, heading turns the corridor.
import { FLIGHT, LEGS, SCORE, mulberry32 } from './config.js';

export function makeRun(seed = 20261126) {
  const rng = mulberry32(seed);
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({
      x: (rng() - 0.5) * 900,
      y: 260 + rng() * 320,
      z: rng() * 9000,
      s: 46 + rng() * 90,
      drift: 2 + rng() * 4,
    });
  }
  const birds = [];
  for (let i = 0; i < 6; i += 1) {
    birds.push({ x: (rng() - 0.5) * 300, y: 60 + rng() * 120, z: 800 + rng() * 5000, phase: rng() * 6.28 });
  }
  return {
    seed,
    legIndex: 0,
    score: 0,
    ringsHit: 0,
    ringsTotal: LEGS.reduce((n, l) => n + l.ringCount, 0),
    landings: 0,
    state: 'menu', // menu | takeoff | flying | landing | landed | crashed | done
    message: '',
    messageUntil: 0,
    fuelWarned: false,
    plane: freshPlane(),
    leg: buildLeg(0, rng),
    clouds,
    birds,
    time: 0,
    runTime: 0,
    paused: false,
  };
}

export function freshPlane() {
  return {
    x: 0,            // lateral offset from route centreline (m)
    alt: 0,          // altitude above sea level (m)
    dist: 0,         // distance along the current leg (m)
    heading: 0,      // degrees, 0 = straight down the route
    speed: 0,        // m/s forward
    throttle: 0.55,
    pitch: 0,        // -1 (down) .. 1 (up), smoothed
    bank: 0,         // degrees, smoothed visual + turn input
    vspeed: 0,       // vertical speed m/s
    fuel: 100,
    onGround: true,
    propAngle: 0,
    flare: 0,
  };
}

// Build one leg: runway at both ends, rings spaced along the route, islands
// placed so the destination is always visible ahead of the last ring.
export function buildLeg(index, rng) {
  const def = LEGS[index];
  const rand = rng ?? mulberry32(1000 + index * 77);
  const rings = [];
  const usable = def.legLength - 900;
  for (let i = 0; i < def.ringCount; i += 1) {
    const z = 700 + (usable * (i + 1)) / (def.ringCount + 1);
    rings.push({
      z,
      x: (rand() - 0.5) * 190,
      y: 55 + rand() * 130,
      r: def.ringRadius,
      hit: false,
      passed: false,
    });
  }
  return {
    def,
    index,
    rings,
    nextRing: 0,
    startTime: 0,
    legTime: 0,
    timeLeft: def.timeLimit,
    islands: [
      { z: -260, x: 0, w: 620, h: 150, kind: 'home', name: def.from },
      { z: def.legLength * 0.45, x: (rand() - 0.5) * 420, w: 300 + rand() * 160, h: 90 + rand() * 60, kind: 'isle', name: '' },
      { z: def.legLength * 0.72, x: (rand() - 0.5) * 420, w: 260 + rand() * 140, h: 80 + rand() * 50, kind: 'isle', name: '' },
      { z: def.legLength, x: 0, w: 680, h: 170, kind: 'dest', name: def.to, volcano: def.volcano, volcanoX: 210 },
    ],
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// One physics tick. `input` holds -1..1 pitch/turn and booleans for throttle,
// airbrake and flaps. Returns an event string ('ring', 'landed', 'crash-sea',
// 'crash-mountain', 'fuel', 'takeoff') or ''.
export function stepWorld(run, input, dt) {
  const p = run.plane;
  const leg = run.leg;
  const def = leg.def;
  if (run.state === 'menu' || run.state === 'done' || run.state === 'crashed' || run.state === 'landed' || run.paused) return '';

  p.propAngle += dt * (6 + p.throttle * 46);

  // Throttle.
  if (input.throttleUp) p.throttle = clamp(p.throttle + FLIGHT.throttleStep * dt, 0, 1);
  if (input.throttleDown) p.throttle = clamp(p.throttle - FLIGHT.throttleStep * dt, 0, 1);

  // Target speed follows throttle; airbrake drags hard.
  const target = FLIGHT.maxSpeed * (0.12 + 0.88 * p.throttle);
  let accel = (target - p.speed) * 0.55;
  if (input.airbrake) accel -= FLIGHT.airbrakeDrag;
  p.speed = clamp(p.speed + accel * dt, 0, FLIGHT.maxSpeed);

  // Pitch and bank smooth toward the pilot's input.
  const pitchTarget = input.pitch;
  p.pitch += (pitchTarget - p.pitch) * Math.min(1, dt * 3.2);
  const bankTarget = input.turn * FLIGHT.bankMax;
  p.bank += (bankTarget - p.bank) * Math.min(1, dt * 3.0);

  // Heading turns with bank; crosswind pushes sideways.
  p.heading += (p.bank / FLIGHT.bankMax) * FLIGHT.turnRate * dt * (p.speed / FLIGHT.cruiseSpeed);
  const headingRad = (p.heading * Math.PI) / 180;
  p.x += Math.sin(headingRad) * p.speed * dt + def.wind * def.windDir * dt * 0.35;
  p.x = clamp(p.x, -340, 340);

  // Vertical speed: pitch and throttle lift, gravity and drag sink.
  const lift = p.onGround ? 0 : 1;
  let vs = p.pitch * FLIGHT.climbRate * (0.4 + 0.6 * p.throttle) - (1 - p.throttle) * 2.2;
  if (p.speed < FLIGHT.minFlySpeed) vs -= (FLIGHT.minFlySpeed - p.speed) * 0.35;
  if (input.airbrake) vs += FLIGHT.flapLift;
  if (p.onGround && p.alt < 6) vs += FLIGHT.groundEffect * 0.4;
  p.vspeed = p.vspeed * 0.7 + vs * 0.3;
  p.alt += p.vspeed * dt * lift;
  if (p.alt < 0) p.alt = 0;

  // Takeoff: once fast enough the wing lifts and the runway lets go.
  if (p.onGround && p.speed > FLIGHT.minFlySpeed + 6 && p.pitch > 0.15) {
    p.onGround = false;
    p.alt = 2;
    run.state = 'flying';
    return 'takeoff';
  }

  // Forward progress only while airborne or rolling on a runway.
  if (!p.onGround || p.speed > 4) p.dist += p.speed * dt;
  run.time += dt;
  if (run.state === 'flying' || run.state === 'landing') {
    run.runTime += dt;
    leg.legTime += dt;
    leg.timeLeft = Math.max(0, def.timeLimit - leg.legTime);
  }

  // Fuel burns with throttle; empty tank ends the run. Warn once at 15%.
  p.fuel -= FLIGHT.fuelBurn * (0.35 + 0.65 * p.throttle) * dt;
  if (p.fuel <= 0) {
    p.fuel = 0;
    return 'fuel';
  }
  if (p.fuel < 15 && !run.fuelWarned) {
    run.fuelWarned = true;
    return 'fuel-low';
  }

  // Ring checks: the next ring only, as the plane crosses its plane.
  const ring = leg.rings[leg.nextRing];
  if (ring && !p.onGround) {
    const prevDist = p.dist - p.speed * dt;
    if (prevDist < ring.z && p.dist >= ring.z) {
      const dx = p.x - ring.x;
      const dy = p.alt - ring.y;
      const d = Math.hypot(dx, dy);
      ring.passed = true;
      if (d <= ring.r + 6) {
        ring.hit = true;
        leg.nextRing += 1;
        run.ringsHit += 1;
        const centre = d <= ring.r * 0.33;
        run.score += SCORE.ring + (centre ? SCORE.ringCentre : 0);
        return centre ? 'ring-centre' : 'ring';
      }
    }
    if (p.dist > ring.z + 60 && !ring.passed) {
      ring.passed = true;
      leg.nextRing += 1;
      return 'ring-missed';
    }
  }

  // Ran off the end of the home runway without lifting off.
  if (p.onGround && p.dist > FLIGHT.runwayLength && run.state === 'takeoff') return 'crash-sea';

  // Destination runway: landing zone is the last stretch of the leg.
  const runwayStart = def.legLength - FLIGHT.runwayLength;
  if (p.dist >= runwayStart && !p.onGround) {
    run.state = 'landing';
    if (p.alt <= 1.5) {
      return tryTouchdown(run, p);
    }
  }
  // Rolling past the runway end without landing = overshoot into the sea.
  if (p.dist > def.legLength + 60 && p.onGround) return 'crash-sea';
  if (p.dist > def.legLength + 30 && !p.onGround && p.alt < 2) return 'crash-sea';

  // Sea crash: touching the water away from a runway.
  if (!p.onGround && p.alt <= 0.5 && p.dist < runwayStart) return 'crash-sea';

  // Volcano: the cone on Pulau Api stands beside the runway, not on it,
  // so a pilot on the centreline never clips it — only a wide drift does.
  if (def.volcano && !p.onGround) {
    const coneZ = def.legLength - 150;
    const coneX = 210;
    const dz = p.dist - coneZ;
    if (Math.abs(dz) < 170 && Math.abs(p.x - coneX) < 105 && p.alt < 145 - Math.abs(dz) * 0.5) {
      return 'crash-mountain';
    }
  }
  return '';
}

function tryTouchdown(run, p) {
  const leg = run.leg;
  const def = leg.def;
  p.onGround = true;
  const centred = Math.abs(p.x) <= FLIGHT.runwayHalfWidth;
  const gentle = p.vspeed > FLIGHT.crashSink;
  if (!centred) {
    p.alt = 0;
    return 'crash-sea'; // off the strip, into the grass and sea beyond
  }
  if (!gentle) {
    p.alt = 0;
    return 'crash-hard';
  }
  // A landing! Score it, then either the next leg or the end of the run.
  p.alt = 0;
  p.speed = Math.min(p.speed, 42);
  const quality = p.vspeed > -4 ? 'smooth' : p.vspeed > FLIGHT.hardSink ? 'firm' : 'rough';
  const gained = quality === 'smooth' ? SCORE.smoothLanding : quality === 'firm' ? SCORE.firmLanding : SCORE.roughLanding;
  run.score += gained + SCORE.legComplete;
  if (leg.timeLeft > 0) run.score += SCORE.onTimeBonus;
  run.landings += 1;
  run.state = 'landed';
  return `landed-${quality}`;
}

// Start the next leg after a landing, keeping score and fuel topped up a bit.
export function nextLeg(run) {
  run.legIndex += 1;
  if (run.legIndex >= LEGS.length) {
    run.state = 'done';
    return;
  }
  const rng = mulberry32(run.seed + run.legIndex * 131);
  run.leg = buildLeg(run.legIndex, rng);
  run.plane = freshPlane();
  run.plane.fuel = Math.max(run.plane.fuel, 0);
  run.plane.fuel = 100;
  run.state = 'takeoff';
}

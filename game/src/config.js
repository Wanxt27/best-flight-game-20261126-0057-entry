// Merpati Express — Island Hopper: tuning constants and the island route.
// Every number here is original tuning for this game, not copied from anywhere.
export const GAME_NAME = 'Merpati Express — Island Hopper';
export const GAME_TAGLINE = 'Fly the mail plane across three islands before the fuel runs dry.';

// Canvas is fixed logical size; the page scales it to the window.
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Flight model tuning (units: metres, seconds, knots-ish display).
export const FLIGHT = {
  cruiseSpeed: 95,          // m/s at full throttle, level
  minFlySpeed: 38,          // below this the wing stops lifting
  maxSpeed: 130,
  climbRate: 9,             // m/s at full pitch up, full throttle
  sinkRate: 7,              // m/s at full pitch down
  turnRate: 26,             // degrees per second at full bank
  bankMax: 42,              // degrees of visual bank
  throttleStep: 0.55,       // per second while W/S held
  fuelBurn: 0.55,           // fuel units per second at full throttle
  fuelTank: 100,
  airbrakeDrag: 34,         // extra deceleration while Space held
  flapLift: 2.2,            // extra lift while Space held (helps landing)
  groundEffect: 1.6,        // lift bonus very low over a runway
  crashSink: -14,           // vertical speed that counts as a hard landing
  hardSink: -9,             // vertical speed that counts as a rough landing
  runwayHalfWidth: 26,      // metres either side of centreline
  runwayLength: 420,
  seaLevel: 0,
};

// One leg = one island hop. Three legs make a run; wind and ring size tighten.
export const LEGS = [
  {
    name: 'Leg 1 — Pulau Merpati to Pulau Kelapa',
    from: 'Pulau Merpati',
    to: 'Pulau Kelapa',
    wind: 4,                // m/s crosswind, pushes the plane sideways
    windDir: 1,
    ringRadius: 26,
    ringCount: 5,
    legLength: 5200,        // metres of route
    timeLimit: 150,         // seconds to arrive for the on-time bonus
    volcano: false,
  },
  {
    name: 'Leg 2 — Pulau Kelapa to Pulau Api',
    from: 'Pulau Kelapa',
    to: 'Pulau Api',
    wind: 9,
    windDir: -1,
    ringRadius: 21,
    ringCount: 6,
    legLength: 6400,
    timeLimit: 170,
    volcano: true,
  },
  {
    name: 'Leg 3 — Pulau Api to Pulau Ombak',
    from: 'Pulau Api',
    to: 'Pulau Ombak',
    wind: 14,
    windDir: 1,
    ringRadius: 17,
    ringCount: 7,
    legLength: 7600,
    timeLimit: 190,
    volcano: true,
  },
];

// Scoring.
export const SCORE = {
  ring: 100,
  ringCentre: 60,           // bonus for flying through the middle third
  smoothLanding: 400,
  firmLanding: 200,
  roughLanding: 50,
  onTimeBonus: 250,
  legComplete: 150,
};

// Colours: one warm flat palette for sky, sea, land and the plane.
export const PALETTE = {
  skyTop: '#2f7fd0',
  skyMid: '#7ec3ee',
  skyLow: '#cfeefb',
  sun: '#ffd94d',
  sunCore: '#fff3b0',
  seaFar: '#2e7fb8',
  seaNear: '#3f9fd4',
  seaSparkle: '#bfe8ff',
  sand: '#f2dd9e',
  grass: '#58b368',
  grassDark: '#3f9a52',
  jungle: '#2e7d46',
  volcanoRock: '#6b5a52',
  volcanoLava: '#ff6b35',
  smoke: '#e8e8e8',
  runway: '#4a4a52',
  runwayLine: '#f5f5f5',
  runwayEdge: '#ffcf3f',
  ring: '#ffd23f',
  ringGlow: '#ff9d00',
  ringNext: '#7dff6a',
  planeBody: '#e8493f',
  planeBelly: '#f7f3e8',
  planeWing: '#f2b705',
  planeTrim: '#1d3557',
  hudPanel: 'rgba(12, 32, 54, 0.82)',
  hudText: '#eaf6ff',
  hudAmber: '#ffc93c',
  hudGreen: '#7dff6a',
  hudRed: '#ff5a4e',
};

// Deterministic random: same seed, same islands and clouds every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

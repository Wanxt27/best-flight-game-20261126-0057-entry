// Merpati Express — Island Hopper: bootstrap, game loop and state machine.
// One frame: read input, step the world, play sounds, draw the scene + HUD.
import { GAME_NAME, VIEW_W, VIEW_H } from './config.js';
import { makeRun, stepWorld, nextLeg } from './world.js';
import { drawScene } from './render.js';
import { drawHud, drawMenu, drawPaused, drawCrashed, drawResults, drawLegComplete } from './hud.js';
import { makeInput, attachInput, pollInput } from './input.js';
import { makeAudio, resumeAudio, updateEngineSound, playRingChime, playThud, playCrash, playClick, toggleMute } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '20261126');
const run = makeRun(Number.isFinite(seed) ? seed : 20261126);
const input = makeInput();
const audio = makeAudio();
let crashReason = '';
let legQuality = 'smooth';
let shotMode = false;

function showMessage(text, seconds = 2.4) {
  run.message = text;
  run.messageUntil = run.time + seconds;
}

function startFlying() {
  resumeAudio(audio);
  playClick(audio);
  if (run.state === 'menu') {
    run.state = 'takeoff';
    run.leg.startTime = run.time;
    showMessage('Full throttle — lift off at 45 knots!', 3);
  }
}

function restartRun() {
  resumeAudio(audio);
  playClick(audio);
  const fresh = makeRun(run.seed);
  run.legIndex = 0;
  run.score = 0;
  run.ringsHit = 0;
  run.landings = 0;
  run.state = 'menu';
  run.plane = fresh.plane;
  run.leg = fresh.leg;
  run.clouds = fresh.clouds;
  run.birds = fresh.birds;
  run.time = 0;
  run.runTime = 0;
  run.message = '';
  crashReason = '';
}

function continueToNextLeg() {
  resumeAudio(audio);
  playClick(audio);
  nextLeg(run);
  if (run.state === 'takeoff') showMessage(`${run.leg.def.name} — full throttle!`, 3);
}

function handleAction(action) {
  if (action === 'pause') {
    if (run.state === 'flying' || run.state === 'takeoff' || run.state === 'landing') {
      run.paused = !run.paused;
    }
    return;
  }
  if (action === 'mute') {
    toggleMute(audio);
    return;
  }
  if (action === 'restart') {
    if (run.state !== 'menu') restartRun();
    return;
  }
  if (action === 'confirm') {
    if (run.state === 'menu') startFlying();
    else if (run.state === 'landed') continueToNextLeg();
    else if (run.state === 'crashed' || run.state === 'done') restartRun();
    return;
  }
  if (action === 'click') {
    const c = input.click;
    if (!c) return;
    const inside = (b) => b && c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h;
    if (run.state === 'menu' && inside(run.startButton)) startFlying();
    else if (run.state === 'landed' && inside(run.continueButton)) continueToNextLeg();
    else if ((run.state === 'crashed' || run.state === 'done') && inside(run.restartButton)) restartRun();
    input.click = null;
  }
}

attachInput(input, canvas, handleAction);

function handleEvent(event) {
  if (!event) return;
  if (event === 'takeoff') {
    showMessage('Airborne! Follow the glowing rings.', 2.6);
  } else if (event === 'ring' || event === 'ring-centre') {
    playRingChime(audio, event === 'ring-centre');
    showMessage(event === 'ring-centre' ? 'RING! Dead centre — +160' : 'RING! +100', 1.6);
  } else if (event === 'ring-missed') {
    showMessage('Missed that ring — line up the next one!', 1.8);
  } else if (event === 'fuel-low') {
    showMessage('LOW FUEL — land on the next island soon!', 3);
  } else if (event.startsWith('landed-')) {
    legQuality = event.slice('landed-'.length);
    playThud(audio);
    const gain = legQuality === 'smooth' ? 400 : legQuality === 'firm' ? 200 : 50;
    showMessage(`${legQuality === 'smooth' ? 'Butter-smooth landing' : 'Landed'} — +${gain + 150}`, 2.5);
  } else if (event === 'fuel') {
    crashReason = 'fuel';
    run.state = 'crashed';
    playCrash(audio);
  } else if (event === 'crash-sea' || event === 'crash-mountain' || event === 'crash-hard') {
    crashReason = event;
    run.state = 'crashed';
    playCrash(audio);
  }
}

let lastNow = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  // Screenshot mode freezes the clock so renders are deterministic.
  const frozen = shotMode ? run.frozenTime : null;
  const dt = frozen !== null ? 0 : Math.min(0.05, (now - lastNow) / 1000);
  lastNow = now;
  const t = frozen !== null ? frozen * 1000 : now;
  // run.time advances inside stepWorld only, so the clock never double-counts.

  pollInput(input);
  if (dt > 0) {
    const event = stepWorld(run, input, dt);
    handleEvent(event);
    updateEngineSound(audio, run.plane, run.state === 'flying' || run.state === 'landing' || run.state === 'takeoff');
  }

  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawScene(ctx, run, t);
  if (run.state === 'menu') {
    drawMenu(ctx, run);
  } else if (run.state === 'landed') {
    drawHud(ctx, run);
    drawLegComplete(ctx, run, legQuality);
  } else if (run.state === 'crashed') {
    drawHud(ctx, run);
    drawCrashed(ctx, run, crashReason);
  } else if (run.state === 'done') {
    drawHud(ctx, run);
    drawResults(ctx, run);
  } else {
    drawHud(ctx, run);
    if (run.paused) drawPaused(ctx, run);
  }

  // Screen-reader status line.
  const status = document.getElementById('status');
  if (status && Math.floor(now / 500) !== Math.floor((now - 16) / 500)) {
    status.textContent = `${GAME_NAME}: ${run.state}, score ${run.score}, altitude ${Math.round(run.plane.alt)} metres, speed ${Math.round(run.plane.speed * 1.94)} knots, fuel ${Math.round(run.plane.fuel)} percent.`;
  }
}

// A shot preset jumps straight into a fixed moment and freezes the clock.
shotMode = applyShot(run, params);
if (shotMode) {
  run.paused = false;
  // Draw once immediately so a headless screenshot catches the scene.
  drawScene(ctx, run, run.frozenTime * 1000);
}

document.title = GAME_NAME;
requestAnimationFrame(frame);

// Exposed for play-testing: the live run state, readable from the console.
window.__merpati = { run, input };

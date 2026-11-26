// HUD and screens: the lit instrument panel, the top status bar, and the
// menu / pause / crash / results overlays. All drawn on the same canvas.
import { PALETTE, VIEW_W, VIEW_H, LEGS } from './config.js';
import { HORIZON } from './render.js';

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function fmt(n, d = 0) { return n.toFixed(d); }

export function drawHud(ctx, run) {
  const p = run.plane;
  const leg = run.leg;
  drawTopBar(ctx, run);
  drawInstrumentPanel(ctx, run);
  drawCompassStrip(ctx, run);
  if (run.message && run.time < run.messageUntil) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(12,32,54,0.8)';
    const w = ctx.measureText(run.message).width + 48;
    ctx.fillRect((VIEW_W - w) / 2, 96, w, 52);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(run.message, VIEW_W / 2, 132);
    ctx.restore();
  }
  if (run.state === 'landing') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.fillText('FINAL APPROACH — ease off the throttle, keep the strip centred', VIEW_W / 2, 178);
    ctx.restore();
  }
}

function drawTopBar(ctx, run) {
  const p = run.plane;
  const leg = run.leg;
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.fillRect(0, 0, VIEW_W, 54);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const left = 16;
  ctx.fillText(`MERPATI EXPRESS`, left, 22);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = '#bfe0f5';
  ctx.fillText(`${leg.def.from} → ${leg.def.to}   •   ${leg.def.name}`, left, 44);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`SCORE ${run.score}`, VIEW_W - 16, 22);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = run.ringsHit === run.ringsTotal ? PALETTE.hudGreen : '#bfe0f5';
  ctx.fillText(`RINGS ${run.ringsHit}/${run.ringsTotal}   •   LEG ${run.legIndex + 1}/3`, VIEW_W - 16, 44);
  // Timer sits in the top bar, left of the fuel bar, so it never collides
  // with the compass strip below.
  const fw = 260;
  const fx = VIEW_W / 2 - fw / 2;
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = leg.timeLeft < 20 ? PALETTE.hudRed : PALETTE.hudText;
  ctx.fillText(`TIME ${Math.ceil(leg.timeLeft)}s`, fx - 16, 22);
  // Fuel bar across the top bar.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(fx, 12, fw, 12);
  ctx.fillStyle = p.fuel > 30 ? PALETTE.hudGreen : p.fuel > 12 ? PALETTE.hudAmber : PALETTE.hudRed;
  ctx.fillRect(fx, 12, fw * clamp(p.fuel / 100, 0, 1), 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`FUEL ${Math.round(p.fuel)}%`, VIEW_W / 2, 38);
}

function drawCompassStrip(ctx, run) {
  const p = run.plane;
  const cy = 78;
  ctx.fillStyle = 'rgba(12,32,54,0.55)';
  ctx.fillRect(VIEW_W / 2 - 190, cy - 16, 380, 30);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(VIEW_W / 2 - 190, cy - 16, 380, 30);
  const points = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'], [360, 'N']];
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [deg, label] of points) {
    let rel = deg - p.heading;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    const x = VIEW_W / 2 + rel * 2.1;
    if (x < VIEW_W / 2 - 185 || x > VIEW_W / 2 + 185) continue;
    ctx.fillStyle = deg % 90 === 0 ? '#ffffff' : '#9fc6e2';
    ctx.fillText(label, x, cy + 5);
  }
  // Centre caret = current heading.
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(VIEW_W / 2, cy - 16);
  ctx.lineTo(VIEW_W / 2 - 7, cy - 26);
  ctx.lineTo(VIEW_W / 2 + 7, cy - 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`HDG ${String(((Math.round(p.heading) % 360) + 360) % 360).padStart(3, '0')}°`, VIEW_W / 2, cy + 34);
}

function drawInstrumentPanel(ctx, run) {
  const p = run.plane;
  const panelY = VIEW_H - 118;
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, 14, panelY, 430, 104, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, 14, panelY, 430, 104, 12);
  ctx.stroke();

  // Altimeter dial.
  drawDial(ctx, 78, panelY + 52, 40, p.alt / 400, 'ALT', `${Math.round(p.alt)} m`, PALETTE.hudAmber);
  // Airspeed dial.
  drawDial(ctx, 178, panelY + 52, 40, p.speed / 130, 'SPD', `${Math.round(p.speed * 1.94)} kt`, PALETTE.hudGreen);
  // Throttle bar.
  ctx.fillStyle = '#bfe0f5';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THR', 248, panelY + 22);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(248, panelY + 30, 150, 12);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillRect(248, panelY + 30, 150 * p.throttle, 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${Math.round(p.throttle * 100)}%`, 248, panelY + 62);
  // Vertical speed.
  const vs = p.vspeed;
  ctx.fillStyle = vs < -6 ? PALETTE.hudRed : '#bfe0f5';
  ctx.fillText(`V/S ${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`, 248, panelY + 84);
  // Wind readout.
  ctx.fillStyle = '#bfe0f5';
  ctx.fillText(`WIND ${run.leg.def.wind} m/s ${run.leg.def.windDir > 0 ? '→' : '←'}`, 248, panelY + 100 - 4);
  // Next ring hint, bottom right.
  const leg = run.leg;
  const ring = leg.rings[leg.nextRing];
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  if (ring) {
    const ahead = Math.max(0, Math.round(ring.z - p.dist));
    ctx.fillText(`NEXT RING ${leg.nextRing + 1}/${leg.rings.length} — ${ahead} m ahead`, VIEW_W - 16, VIEW_H - 24);
  } else {
    ctx.fillText(`ALL RINGS CLEAR — land on ${leg.def.to}!`, VIEW_W - 16, VIEW_H - 24);
  }
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#bfe0f5';
  ctx.fillText('↑↓ pitch   ←→ turn   W/S throttle   SPACE airbrake   P pause   R restart', VIEW_W - 16, VIEW_H - 6);
}

function drawDial(ctx, cx, cy, r, frac, label, value, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#0a1c30';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Tick marks.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const a = (-Math.PI * 0.75) + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  const a = (-Math.PI * 0.75) + clamp(frac, 0, 1) * Math.PI * 1.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9fc6e2';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r - 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(value, cx, cy + r + 14);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function overlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 24, 44, 0.5)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '19px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, y + 102 + i * 30));
  return { x, y, w, h };
}

export function drawMenu(ctx, run) {
  const panel = overlayPanel(ctx, 'MERPATI EXPRESS', [
    'Island Hopper — fly the mail plane across three islands.',
    'Take off, thread the glowing rings, land before the fuel runs out.',
    '↑ ↓ pitch      ← → bank & turn      W / S throttle      SPACE airbrake',
    'R restart      P pause      Click START or press Enter to fly.',
  ], PALETTE.hudAmber);
  drawStartButton(ctx, run, panel.y + panel.h + 16);
}

export function drawStartButton(ctx, run, topY) {
  const bw = 220;
  const bh = 54;
  const bx = (VIEW_W - bw) / 2;
  const by = topY ?? VIEW_H / 2 + 118;
  ctx.fillStyle = PALETTE.hudGreen;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.fillStyle = '#0c2036';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  START FLYING', VIEW_W / 2, by + 36);
  run.startButton = { x: bx, y: by, w: bw, h: bh };
}

export function drawPaused(ctx, run) {
  overlayPanel(ctx, 'PAUSED', [
    'The plane is holding steady. Take a breath.',
    'Press P or click to keep flying.',
  ], PALETTE.hudAmber);
}

export function drawCrashed(ctx, run, reason) {
  const titles = {
    'crash-sea': 'DITCHED IN THE SEA',
    'crash-mountain': 'CLIPPED THE VOLCANO',
    'crash-hard': 'HARD LANDING',
    fuel: 'OUT OF FUEL',
  };
  const panel = overlayPanel(ctx, titles[reason] || 'CRASHED', [
    `Score ${run.score}  •  Rings ${run.ringsHit}/${run.ringsTotal}  •  Landings ${run.landings}`,
    'The Merpati mail still has to get through.',
    'Press R or click RESTART to fly again.',
  ], PALETTE.hudRed);
  drawRestartButton(ctx, run, panel.y + panel.h + 16);
}

export function drawResults(ctx, run) {
  const legs = run.landings;
  const panel = overlayPanel(ctx, 'ROUTE COMPLETE!', [
    `All three islands served. Final score: ${run.score}`,
    `Rings flown: ${run.ringsHit}/${run.ringsTotal}   •   Landings: ${legs}/3`,
    run.score >= 2200 ? 'Airmail legend — the islands sing your name.' : run.score >= 1400 ? 'Solid flying, captain. The mail got through.' : 'The mail got through — barely. Fly it again, smoother.',
    'Press R or click RESTART to fly the route again.',
  ], PALETTE.hudGreen);
  drawRestartButton(ctx, run, panel.y + panel.h + 16);
}

export function drawRestartButton(ctx, run, topY) {
  const bw = 220;
  const bh = 54;
  const bx = (VIEW_W - bw) / 2;
  const by = topY ?? VIEW_H / 2 + 118;
  ctx.fillStyle = PALETTE.hudAmber;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.fillStyle = '#0c2036';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('↻  RESTART', VIEW_W / 2, by + 36);
  run.restartButton = { x: bx, y: by, w: bw, h: bh };
}

export function drawLegComplete(ctx, run, quality) {
  const label = quality === 'smooth' ? 'BUTTER-SMOOTH LANDING!' : quality === 'firm' ? 'LANDED — FIRM BUT SAFE' : 'LANDED — A BIT ROUGH';
  const panel = overlayPanel(ctx, label, [
    `Welcome to ${run.leg.def.to}. Score ${run.score}.`,
    'Fuel topped up. The next island is waiting.',
    'Press Enter or click CONTINUE for the next leg.',
  ], PALETTE.hudGreen);
  const bw = 220;
  const bh = 54;
  const bx = (VIEW_W - bw) / 2;
  const by = panel.y + panel.h + 16;
  ctx.fillStyle = PALETTE.hudGreen;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.fillStyle = '#0c2036';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CONTINUE  ▶', VIEW_W / 2, by + 36);
  run.continueButton = { x: bx, y: by, w: bw, h: bh };
}

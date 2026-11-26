// Renderer: the pseudo-3D chase view. Everything is flat canvas shapes in one
// warm palette — sky gradient, sun, drifting clouds, sea, islands with beaches,
// a smoking volcano, the runway ahead, glowing rings, and the plane itself.
import { PALETTE, VIEW_W, VIEW_H, FLIGHT } from './config.js';

const HORIZON = 400; // horizon line in screen space

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

// How big something at world distance z looks: nearer = bigger, farther = tiny.
function scaleFor(z, dist) {
  const ahead = z - dist;
  if (ahead < 30) return 0;
  return clamp(620 / ahead, 0.02, 2.4);
}

export function drawScene(ctx, run, now) {
  const p = run.plane;
  const leg = run.leg;
  drawSky(ctx, now);
  drawSun(ctx, now);
  drawClouds(ctx, run, now);
  drawSea(ctx);
  drawIslands(ctx, run);
  drawRunway(ctx, run);
  drawRings(ctx, run);
  drawBirds(ctx, run, now);
  drawPlane(ctx, run, now);
}

function drawSky(ctx, now) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 40);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, HORIZON + 40);
  // A faint high haze band right above the horizon.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, HORIZON - 26, VIEW_W, 26);
}

function drawSun(ctx, now) {
  const sx = 1020 + Math.sin(now * 0.00004) * 12;
  const sy = 118;
  const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 150);
  glow.addColorStop(0, 'rgba(255, 243, 176, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 217, 77, 0.55)');
  glow.addColorStop(1, 'rgba(255, 217, 77, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(sx, sy, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, run, now) {
  const p = run.plane;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const c of run.clouds) {
    const ahead = c.z - p.dist;
    if (ahead < -80 || ahead > 9000) continue;
    const s = scaleFor(c.z, p.dist);
    if (s <= 0.02) continue;
    const drift = ((c.x + c.drift * (now / 1000)) % 900 + 900) % 900 - 450;
    const sx = VIEW_W / 2 + (drift - p.x * 0.9) * s * 1.4 - p.heading * 6 * s;
    const sy = HORIZON - (c.y - p.alt) * s * 0.9 - 40;
    const r = c.s * s;
    if (r < 2 || sy < -60 || sy > HORIZON + 20) continue;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 1.5, r * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - r * 0.8, sy + r * 0.18, r * 0.9, r * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + r * 0.8, sy + r * 0.16, r * 0.95, r * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSea(ctx) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
  g.addColorStop(0, PALETTE.seaFar);
  g.addColorStop(1, PALETTE.seaNear);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON);
  // Sparkle lines on the water.
  ctx.strokeStyle = 'rgba(191,232,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const y = HORIZON + 24 + i * 34;
    const x0 = ((i * 173) % 900) + 60;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + 120 - i * 8, y);
    ctx.stroke();
  }
}

// Islands are drawn back-to-front as perspective humps on the sea.
function drawIslands(ctx, run) {
  const p = run.plane;
  const sorted = [...run.leg.islands].sort((a, b) => b.z - a.z);
  for (const isl of sorted) {
    const s = scaleFor(isl.z, p.dist);
    if (s <= 0.02) continue;
    const cx = VIEW_W / 2 + (isl.x - p.x) * s * 1.6 - p.heading * 7 * s;
    const baseY = HORIZON + 6;
    const w = isl.w * s;
    const h = isl.h * s;
    if (w < 4 || cx < -w || cx > VIEW_W + w) continue;
    // Beach ring, then green body.
    ctx.fillStyle = PALETTE.sand;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, w * 0.62, Math.max(6, h * 0.24), 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = isl.kind === 'home' ? PALETTE.grass : PALETTE.grassDark;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.55, baseY);
    ctx.quadraticCurveTo(cx - w * 0.3, baseY - h, cx, baseY - h * 0.92);
    ctx.quadraticCurveTo(cx + w * 0.3, baseY - h, cx + w * 0.55, baseY);
    ctx.closePath();
    ctx.fill();
    // Jungle tufts.
    ctx.fillStyle = PALETTE.jungle;
    for (let i = 0; i < 5; i += 1) {
      const tx = cx - w * 0.36 + (i * w * 0.18);
      const ty = baseY - h * (0.35 + ((i * 37) % 40) / 100);
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(3, h * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    if (isl.volcano) drawVolcano(ctx, cx + (isl.volcanoX || 0) * s * 1.6, baseY, w, h, run);
    // Island name tag on the destination.
    if (isl.kind === 'dest' || isl.kind === 'home') {
      ctx.fillStyle = 'rgba(12,32,54,0.75)';
      ctx.font = `bold ${Math.max(13, Math.round(15 * s + 9))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(isl.name.toUpperCase(), cx, baseY - h - 12);
    }
  }
}

function drawVolcano(ctx, cx, baseY, w, h, run) {
  const topY = baseY - h * 1.35;
  ctx.fillStyle = PALETTE.volcanoRock;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, baseY);
  ctx.lineTo(cx - w * 0.1, topY);
  ctx.lineTo(cx + w * 0.1, topY);
  ctx.lineTo(cx + w * 0.42, baseY);
  ctx.closePath();
  ctx.fill();
  // Lava glow at the crater.
  ctx.fillStyle = PALETTE.volcanoLava;
  ctx.beginPath();
  ctx.ellipse(cx, topY + 2, w * 0.1, Math.max(3, h * 0.06), 0, 0, Math.PI * 2);
  ctx.fill();
  // Smoke puffs drifting up.
  ctx.fillStyle = 'rgba(232,232,232,0.85)';
  const t = run.time;
  for (let i = 0; i < 3; i += 1) {
    const ph = (t * 0.25 + i * 0.33) % 1;
    const sx = cx + Math.sin(t * 0.6 + i * 2.1) * w * 0.06 + ph * 26;
    const sy = topY - ph * h * 0.7;
    ctx.beginPath();
    ctx.arc(sx, sy, 6 + ph * 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The runway: a perspective strip on the home island (takeoff) or the
// destination island (landing), with centreline dashes and edge lights.
function drawRunway(ctx, run) {
  const p = run.plane;
  const leg = run.leg;
  const def = leg.def;
  const onHome = run.state === 'menu' || run.state === 'takeoff';
  const z = onHome ? -260 : def.legLength;
  const s = scaleFor(z, p.dist);
  if (s <= 0.02 && !onHome) return;
  const cx = VIEW_W / 2 + (0 - p.x) * s * 1.6 - p.heading * 7 * s;
  const baseY = HORIZON + 6;
  if (onHome) {
    // Takeoff strip: big, right under the plane, seen from behind.
    const w = 190;
    const topY = 468;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(cx - w, VIEW_H);
    ctx.lineTo(cx - w * 0.42, topY);
    ctx.lineTo(cx + w * 0.42, topY);
    ctx.lineTo(cx + w, VIEW_H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.runwayLine;
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 22]);
    ctx.beginPath();
    ctx.moveTo(cx, VIEW_H);
    ctx.lineTo(cx, topY + 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = PALETTE.runwayEdge;
    ctx.fillRect(cx - w - 6, 560, 6, 160);
    ctx.fillRect(cx + w, 560, 6, 160);
    return;
  }
  // Destination strip far ahead: a narrow band that grows as you approach.
  const w = 320 * s;
  if (w < 3) return;
  const stripH = Math.max(4, 26 * s);
  ctx.fillStyle = PALETTE.runway;
  ctx.fillRect(cx - w / 2, baseY - stripH, w, stripH);
  ctx.fillStyle = PALETTE.runwayLine;
  ctx.fillRect(cx - w * 0.06, baseY - stripH, w * 0.12, stripH);
  ctx.fillStyle = PALETTE.runwayEdge;
  ctx.fillRect(cx - w / 2, baseY - stripH - 2, 4, stripH + 2);
  ctx.fillRect(cx + w / 2 - 4, baseY - stripH - 2, 4, stripH + 2);
}

// Rings: glowing ellipses that grow as the plane nears them. The next ring
// is gold-green; later ones are dimmer gold.
function drawRings(ctx, run) {
  const p = run.plane;
  const leg = run.leg;
  const rings = [...leg.rings].sort((a, b) => b.z - a.z);
  for (const ring of rings) {
    if (ring.hit) continue;
    const s = scaleFor(ring.z, p.dist);
    if (s <= 0.02) continue;
    const ahead = ring.z - p.dist;
    const cx = VIEW_W / 2 + (ring.x - p.x) * s * 1.6 - p.heading * 7 * s;
    const cy = HORIZON - (ring.y - p.alt) * s * 0.9 - 30;
    const rx = ring.r * s * 2.1;
    const ry = ring.r * s * 1.5;
    if (rx < 2 || cy < -80 || cy > VIEW_H + 80) continue;
    const isNext = leg.rings[leg.nextRing] === ring;
    const alpha = clamp(1.15 - ahead / 4200, 0.25, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = isNext ? PALETTE.ringNext : PALETTE.ring;
    ctx.lineWidth = Math.max(3, 7 * s);
    ctx.shadowColor = isNext ? PALETTE.ringNext : PALETTE.ringGlow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(3, rx), Math.max(3, ry), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = isNext ? 'rgba(125,255,106,0.10)' : 'rgba(255,210,63,0.07)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(3, rx), Math.max(3, ry), 0, 0, Math.PI * 2);
    ctx.fill();
    if (isNext && ahead < 1400) {
      const label = `RING ${leg.nextRing + 1} / ${leg.rings.length}`;
      ctx.font = `bold ${Math.max(13, Math.round(11 + 9 * s))}px system-ui, sans-serif`;
      const lw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(12,32,54,0.75)';
      ctx.fillRect(cx - lw / 2 - 10, cy - ry - 34, lw + 20, 28);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy - ry - 12);
    }
    ctx.restore();
  }
}

function drawBirds(ctx, run, now) {
  const p = run.plane;
  ctx.strokeStyle = 'rgba(30,50,70,0.8)';
  ctx.lineWidth = 2;
  for (const b of run.birds) {
    const s = scaleFor(b.z, p.dist);
    if (s <= 0.02) continue;
    const sx = VIEW_W / 2 + (b.x + Math.sin(now / 700 + b.phase) * 14 - p.x) * s * 1.6;
    const sy = HORIZON - (b.y - p.alt) * s - 60;
    const flap = Math.sin(now / 130 + b.phase) * 4 * s;
    if (sy < 0 || sy > HORIZON) continue;
    ctx.beginPath();
    ctx.moveTo(sx - 8 * s, sy + flap);
    ctx.quadraticCurveTo(sx, sy - 3 * s, sx, sy);
    ctx.quadraticCurveTo(sx, sy - 3 * s, sx + 8 * s, sy + flap);
    ctx.stroke();
  }
}

// The plane: a small red-and-cream prop plane seen from behind and slightly
// above, banking with the turn, propeller a spinning blur disc.
function drawPlane(ctx, run, now) {
  const p = run.plane;
  const cx = VIEW_W / 2;
  const cy = 520 + p.pitch * -14;
  const bank = (p.bank * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank * 0.55);
  // Shadow on the sea / ground below.
  ctx.restore();
  ctx.save();
  ctx.translate(cx, 628);
  ctx.fillStyle = 'rgba(10,30,50,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 46 - p.alt * 0.12, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank * 0.55);
  const scale = 1 + clamp(p.alt, 0, 120) * 0.0006;
  ctx.scale(scale, scale);
  // Tail wings.
  ctx.fillStyle = PALETTE.planeWing;
  ctx.beginPath();
  ctx.moveTo(-14, 26);
  ctx.lineTo(-52, 44);
  ctx.lineTo(-46, 52);
  ctx.lineTo(-10, 38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 26);
  ctx.lineTo(52, 44);
  ctx.lineTo(46, 52);
  ctx.lineTo(10, 38);
  ctx.closePath();
  ctx.fill();
  // Main wings.
  ctx.fillStyle = PALETTE.planeWing;
  ctx.beginPath();
  ctx.moveTo(-26, 6);
  ctx.lineTo(-118, 26);
  ctx.lineTo(-112, 40);
  ctx.lineTo(-22, 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, 6);
  ctx.lineTo(118, 26);
  ctx.lineTo(112, 40);
  ctx.lineTo(22, 22);
  ctx.closePath();
  ctx.fill();
  // Fuselage: cream belly, red top, blue trim stripe.
  ctx.fillStyle = PALETTE.planeBelly;
  ctx.beginPath();
  ctx.ellipse(0, 8, 30, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.ellipse(0, -6, 27, 40, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.planeTrim;
  ctx.fillRect(-27, -2, 54, 5);
  // Cockpit windows.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.ellipse(0, -26, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-5, -29, 5, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Tail fin with the Merpati mark.
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-8, 52);
  ctx.lineTo(-16, 84);
  ctx.lineTo(16, 84);
  ctx.lineTo(8, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('M', 0, 76);
  // Propeller: spinning translucent disc + two blades.
  const a = p.propAngle;
  ctx.save();
  ctx.translate(0, -52);
  ctx.rotate(a);
  ctx.fillStyle = 'rgba(60,60,70,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 46, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(-3, -48, 6, 96);
  ctx.restore();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(0, -52, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export { HORIZON };

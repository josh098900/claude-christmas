// Nell's house: the landing outside her door (D1) and the hallway downstairs (D7).
import { C2D, F, W, H } from '../core/stage';
import { V2, v2, lerp, clamp, hash1, TAU } from '../core/math';
import { handRect, handPoly, blobEllipse, vgrad } from '../draw/brush';
import { glow, shaft } from '../draw/light';

/** The landing: cold dark wall, a carpet, Nell's door filling the frame. gap = 0..1 ajar amount. */
export function landing(f: F, c: C2D, o: { gap: number; underGlow: number; shake?: number }) {
  // wall
  vgrad(c, 0, 0, W, H, [[0, '#18203f'], [1, '#222b52']]);
  // faint wallpaper stripes
  c.fillStyle = 'rgba(140,160,220,0.05)';
  for (let x = 0; x < W; x += 70) c.fillRect(x, 0, 26, H);
  // carpet
  const cg = c.createLinearGradient(0, 960, 0, H);
  cg.addColorStop(0, '#3a2a3e'); cg.addColorStop(1, '#2a1e2e');
  c.fillStyle = cg; c.fillRect(0, 960, W, 120);
  c.fillStyle = '#141a33'; c.fillRect(0, 944, W, 18); // skirting
  // door frame (architrave)
  const dx = 700, dy = 40, dw = 560, dh = 920;
  c.fillStyle = '#727aa2'; c.beginPath(); handRect(c, dx - 46, dy - 40, dw + 92, dh + 40, 3, 1); c.fill();
  // room light behind the gap
  const gap = clamp(o.gap);
  const sh = (o.shake ?? 0);
  if (gap > 0.001) {
    const gw = gap * 150;
    const rg = c.createLinearGradient(dx + dw - gw, 0, dx + dw, 0);
    rg.addColorStop(0, '#ffcf8e'); rg.addColorStop(1, '#f2a860');
    c.fillStyle = rg; c.fillRect(dx + dw - gw, dy, gw, dh);
    glow(f.glow, dx + dw - gw / 2, dy + dh * 0.5, 380, '#ffc07a', 0.35 * gap);
    // wedge of light on the carpet
    shaft(f.glow, [v2(dx + dw - gw, dy + dh), v2(dx + dw, dy + dh), v2(dx + dw + 520 * gap, H + 40), v2(dx + dw - gw - 240 * gap, H + 40)], 'rgba(255,190,120,0.9)', 0.35 * gap, 10);
  } else {
    c.fillStyle = '#0e1226'; c.fillRect(dx, dy, dw, dh);
  }
  // door leaf (swings inward: its free edge retreats left as it opens)
  const leafW = dw - gap * 150;
  c.save(); c.translate(sh, 0);
  c.fillStyle = '#8d94b8'; c.beginPath(); handRect(c, dx, dy, leafW, dh, 5, 0.8); c.fill();
  // panels
  c.fillStyle = 'rgba(40,50,90,0.16)';
  const px = dx + leafW * 0.12, pw = leafW * 0.76;
  c.fillRect(px, dy + 60, pw * 0.46, 300); c.fillRect(px + pw * 0.54, dy + 60, pw * 0.46, 300);
  c.fillRect(px, dy + 440, pw * 0.46, 400); c.fillRect(px + pw * 0.54, dy + 440, pw * 0.46, 400);
  // handle
  c.fillStyle = '#b89a54'; c.beginPath(); c.arc(dx + leafW - 54, dy + 500, 15, 0, TAU); c.fill();
  c.fillRect(dx + leafW - 60, dy + 488, 10, 40);
  c.restore();
  // shadow side of frame
  c.fillStyle = 'rgba(10,12,30,0.35)'; c.fillRect(dx - 46, dy - 40, 18, dh + 40);
  // light under the door
  const ug = clamp(o.underGlow);
  if (ug > 0) {
    c.fillStyle = `rgba(255,200,130,${0.9 * ug})`; c.fillRect(dx + 6, dy + dh - 5, dw - 12, 5);
    glow(f.glow, dx + dw / 2, dy + dh + 4, 300, '#ffbe78', 0.28 * ug);
    shaft(f.glow, [v2(dx + 10, dy + dh), v2(dx + dw - 10, dy + dh), v2(dx + dw + 200, H + 20), v2(dx - 200, H + 20)], 'rgba(255,190,120,0.9)', 0.22 * ug, 14);
  }
  return { dx, dy, dw, dh, leafW };
}

/** Downstairs hallway: warm lamp, stairs rising right, front door left. */
export function hallway(f: F, c: C2D, cam: { x: number; y: number; z: number }, o: { swing: number; dust: number; t: number }) {
  c.save(); f.glow.save();
  for (const x of [c, f.glow]) { x.translate(W / 2, H / 2); x.scale(cam.z, cam.z); x.translate(-cam.x, -cam.y); }
  // world: floor y=0, ceiling y=-560 (1 m = 230)
  vgrad(c, -1400, -620, 2800, 640, [[0, '#4a4038'], [0.5, '#5e5040'], [1, '#544838']]);
  // wallpaper: faded leaf sprigs
  c.fillStyle = 'rgba(255,230,180,0.06)';
  for (let i = 0; i < 140; i++) {
    const x = -1400 + (i % 20) * 140 + ((Math.floor(i / 20) % 2) * 70), y = -600 + Math.floor(i / 20) * 90;
    c.beginPath(); blobEllipse(c, x, y, 10, 18, i, 0.1, 7, 0.6); c.fill();
  }
  // dado rail
  c.fillStyle = '#3e342c'; c.fillRect(-1400, -220, 2800, 10);
  c.fillStyle = '#3a3a48'; c.fillRect(-1400, -210, 2800, 210);
  // floor (tiles)
  vgrad(c, -1400, 0, 2800, 300, [[0, '#3a2c2a'], [1, '#241c1e']]);
  c.fillStyle = 'rgba(200,170,140,0.07)';
  for (let i = 0; i < 30; i++) { c.fillRect(-1400 + i * 100, 0, 48, 40); c.fillRect(-1350 + i * 100, 40, 48, 40); }
  // front door (left) with dark blue glass
  c.fillStyle = '#2a1e1c'; c.beginPath(); handRect(c, -940, -520, 260, 520, 9, 1); c.fill();
  c.fillStyle = '#1b2a5a'; c.beginPath(); handRect(c, -900, -480, 180, 150, 10, 1); c.fill();
  c.fillStyle = 'rgba(160,190,255,0.25)'; c.beginPath(); c.moveTo(-880, -340); c.lineTo(-800, -480); c.lineTo(-760, -480); c.lineTo(-840, -340); c.fill();
  // stairs rising to the right
  c.fillStyle = '#3a2c28';
  c.beginPath(); c.moveTo(320, 0);
  for (let k = 0; k < 9; k++) { c.lineTo(320 + k * 90, -k * 70); c.lineTo(320 + (k + 1) * 90, -k * 70); }
  c.lineTo(1400, -630); c.lineTo(1400, 0); c.closePath(); c.fill();
  c.fillStyle = '#5a3a3a';
  for (let k = 0; k < 9; k++) c.fillRect(320 + k * 90, -k * 70 - 8, 90, 10);
  // banister
  c.strokeStyle = '#2a1c18'; c.lineWidth = 14; c.lineCap = 'round';
  c.beginPath(); c.moveTo(330, -230); c.lineTo(1200, -860); c.stroke();
  c.lineWidth = 5;
  for (let k = 0; k < 9; k++) { const bx = 360 + k * 90; c.beginPath(); c.moveTo(bx, -k * 70); c.lineTo(bx, -250 - k * 70 + 30); c.stroke(); }
  c.fillStyle = '#2a1c18'; c.fillRect(312, -300, 36, 300);
  // coats on hooks
  c.fillStyle = '#3d4a5a'; c.beginPath(); blobEllipse(c, -560, -330, 50, 120, 3, 0.08, 9); c.fill();
  c.fillStyle = '#8a3a32'; c.beginPath(); blobEllipse(c, -470, -350, 34, 80, 4, 0.08, 9); c.fill(); // Nell's small red coat
  c.fillStyle = '#2a201c'; c.fillRect(-620, -460, 220, 14);
  // hall table + lamp
  c.fillStyle = '#4a3428'; c.fillRect(-300, -190, 260, 20); c.fillRect(-290, -170, 16, 170); c.fillRect(-66, -170, 16, 170);
  c.fillStyle = '#7a5a3a'; c.beginPath(); c.moveTo(-200, -190); c.lineTo(-150, -190); c.lineTo(-160, -270); c.lineTo(-190, -270); c.fill();
  c.fillStyle = '#e8c486'; c.beginPath(); c.moveTo(-230, -270); c.lineTo(-120, -270); c.lineTo(-145, -350); c.lineTo(-205, -350); c.closePath(); c.fill();
  glow(f.glow, -175, -300, 180, '#ffc982', 0.55);
  glow(f.glow, -175, -300, 520, '#ffb070', 0.18);
  // framed picture
  c.fillStyle = '#2a201c'; c.fillRect(20, -470, 150, 120); c.fillStyle = '#6a7a9a'; c.fillRect(32, -458, 126, 96);
  // ceiling + pendant light that swings
  c.fillStyle = '#3a3228'; c.fillRect(-1400, -640, 2800, 80);
  const px = 60, py = -560;
  const ang = o.swing;
  const lx = px + Math.sin(ang) * 120, ly = py + Math.cos(ang) * 120;
  c.strokeStyle = '#1c1612'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(lx, ly); c.stroke();
  c.save(); c.translate(lx, ly); c.rotate(-ang);
  c.fillStyle = '#c99a5a'; c.beginPath(); c.moveTo(-40, 40); c.lineTo(40, 40); c.lineTo(16, 0); c.lineTo(-16, 0); c.closePath(); c.fill();
  c.fillStyle = '#fff0c8'; c.beginPath(); c.arc(0, 44, 10, 0, TAU); c.fill();
  c.restore();
  glow(f.glow, lx, ly + 44, 120, '#ffd8a0', 0.5);
  glow(f.glow, lx, ly + 60, 600, '#ffb878', 0.14);
  // plaster dust falling from the ceiling
  if (o.dust > 0) {
    for (let i = 0; i < 26; i++) {
      const sx = -60 + hash1(i * 3.7) * 260, fall = (o.t * (160 + hash1(i) * 120));
      const sy = -560 + fall + hash1(i * 1.3) * 30;
      if (sy > 0) continue;
      c.fillStyle = `rgba(230,220,200,${0.7 * o.dust * (1 - fall / 700)})`;
      c.beginPath(); c.arc(sx + Math.sin(o.t * 3 + i) * 6, sy, 1.5 + hash1(i * 9) * 2, 0, TAU); c.fill();
    }
  }
  c.restore(); f.glow.restore();
}

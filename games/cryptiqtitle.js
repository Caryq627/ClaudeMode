#!/usr/bin/env node
'use strict';

/* ╔══════════════════════════════════════════════════════════════╗
   ║  CRYPTIQ SHIELD — Title Screen                              ║
   ║  Face enrollment & verification setup for MindSpark         ║
   ╚══════════════════════════════════════════════════════════════╝ */

const { stdin, stdout } = process;
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
//  ANSI
// ═══════════════════════════════════════════════════════════════
const E = '\x1b[';
const RST = `${E}0m`;
const BOLD = `${E}1m`;
const DIM = `${E}2m`;
const HIDE = `${E}?25l`;
const SHOW = `${E}?25h`;
const HOME = `${E}H`;
const CLR = `${E}2J`;
const rgb = (r, g, b) => `${E}38;2;${r};${g};${b}m`;
const bgRgb = (r, g, b) => `${E}48;2;${r};${g};${b}m`;

// ═══════════════════════════════════════════════════════════════
//  TERMINAL & FRAMEBUFFER
// ═══════════════════════════════════════════════════════════════
const FPS = 30;
const TICK = Math.floor(1000 / FPS);
let W, H;
function dims() { W = stdout.columns || 80; H = stdout.rows || 24; fbAlloc(); }

let fC = [], fS = [];
function fbAlloc() {
  fC = []; fS = [];
  for (let y = 0; y < H; y++) {
    fC[y] = new Array(W).fill(' ');
    fS[y] = new Array(W).fill('');
  }
}
function fbClr() {
  for (let y = 0; y < H; y++) { fC[y].fill(' '); fS[y].fill(''); }
}
function px(x, y, c, s) {
  x = x | 0; y = y | 0;
  if (x >= 0 && x < W && y >= 0 && y < H) { fC[y][x] = c; fS[y][x] = s || ''; }
}
function tx(x, y, t, s) { for (let i = 0; i < t.length; i++) px(x + i, y, t[i], s); }
function cx(y, t, s) { tx(((W - t.length) / 2) | 0, y, t, s); }
let invertTimer = 0;

function flush() {
  const doInvert = invertTimer > 0 &&
    (invertTimer > 15 || ((invertTimer / 2) | 0) % 2 === 0);
  const inv = doInvert ? `${E}7m` : '';
  let o = HOME + inv, cur = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = fS[y][x];
      if (s !== cur) { o += RST + inv + s; cur = s; }
      o += fC[y][x];
    }
    if (y < H - 1) o += '\r\n';
  }
  stdout.write(o + RST);
}

// ═══════════════════════════════════════════════════════════════
//  STARFIELD
// ═══════════════════════════════════════════════════════════════
let stars = [];
function initStars() {
  stars = [];
  const n = Math.max(30, (W * H * 0.06) | 0);
  for (let i = 0; i < n; i++) {
    stars.push({
      x: (Math.random() * W * 3) | 0,
      y: (Math.random() * H) | 0,
      c: ['.', '\u00b7', '\u2217', '+', '\u00b7', '.'][(Math.random() * 6) | 0],
      b: 12 + ((Math.random() * 50) | 0),
      p: Math.random() * 6.28,
    });
  }
}
function drawStars(frame) {
  for (const s of stars) {
    const tw = Math.sin(frame * 0.035 + s.p) * 0.35 + 0.65;
    const v = (s.b * tw) | 0;
    const xx = (s.x % W + W) % W;
    if (xx < W) px(xx, s.y, s.c, rgb(v, (v * 0.9) | 0, Math.min(255, (v * 1.5) | 0)));
  }
}

// ═══════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════
let spTap = false, enterPress = false, backPress = false, inputQ = [];

function setupInput() {
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume(); stdin.setEncoding('utf8');
  stdin.on('data', d => inputQ.push(d));
}

function procInput() {
  spTap = false; enterPress = false; backPress = false;
  for (const d of inputQ) {
    for (let i = 0; i < d.length; i++) {
      const ch = d[i], cc = d.charCodeAt(i);
      if (cc === 3 || ch === 'q' || ch === 'Q') cleanup(0);
      if (ch === ' ') spTap = true;
      if (ch === '\r' || ch === '\n') enterPress = true;
      if (cc === 127 || cc === 8) backPress = true;
    }
  }
  inputQ = [];
}

// ═══════════════════════════════════════════════════════════════
//  CRYPTIQ SHIELD — Swift helper
// ═══════════════════════════════════════════════════════════════
const SHIELD_DIR = path.join(os.tmpdir(), 'termijump-shield');
const SHIELD_DATA = path.join(os.homedir(), '.termijump-shield');
const SHIELD_SRC = path.join(__dirname, 'termijump-shield.swift');
const SHIELD_BIN = path.join(SHIELD_DIR, 'shield');
let shieldOK = false;
let shieldEnrolled = false;
let shieldBusy = false;
let shieldResult = null;
let shieldDoneAt = 0;

function initShield() {
  if (process.platform !== 'darwin') return;
  if (!fs.existsSync(SHIELD_SRC)) return;
  try {
    fs.mkdirSync(SHIELD_DIR, { recursive: true });
    fs.mkdirSync(SHIELD_DATA, { recursive: true });
    let needBuild = true;
    try {
      const bs = fs.statSync(SHIELD_BIN);
      const ss = fs.statSync(SHIELD_SRC);
      if (bs.mtimeMs > ss.mtimeMs) needBuild = false;
    } catch (e) {}
    if (needBuild) {
      const r = spawnSync('swiftc', [
        '-swift-version', '5', '-O', '-o', SHIELD_BIN, SHIELD_SRC,
        '-framework', 'AVFoundation', '-framework', 'Vision',
        '-framework', 'CoreImage',
      ], { timeout: 120000 });
      if (r.status !== 0) return;
      fs.chmodSync(SHIELD_BIN, 0o755);
    }
    const s = spawnSync(SHIELD_BIN, ['status'], { timeout: 5000 });
    if (s.status === 0) {
      const d = JSON.parse(s.stdout.toString());
      shieldOK = true;
      shieldEnrolled = d.enrolled;
    }
  } catch (e) {}
}

function runShieldCmd(cmd) {
  shieldBusy = true;
  shieldResult = null;
  const p = spawn(SHIELD_BIN, [cmd]);
  let out = '';
  p.stdout.on('data', d => out += d);
  p.stderr.on('data', () => {});
  p.on('close', () => {
    shieldBusy = false;
    try { shieldResult = JSON.parse(out); }
    catch (e) { shieldResult = { error: 'parse_error' }; }
    shieldDoneAt = frame;
  });
  p.on('error', () => {
    shieldBusy = false;
    shieldResult = { error: 'spawn_error' };
    shieldDoneAt = frame;
  });
}

// ═══════════════════════════════════════════════════════════════
//  DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════

function drawShieldIcon(cx0, cy0, f) {
  const pulse = Math.sin(f * 0.06) * 0.15 + 0.85;
  const s1 = rgb(0, (200 * pulse) | 0, (220 * pulse) | 0);
  const s2 = rgb(0, (140 * pulse) | 0, (160 * pulse) | 0);
  const lines = [
    ['   \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557   ', s1],
    ['  \u2554\u255D\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u255A\u2557  ', s1],
    ['  \u2551\u2591\u2591\u2591\u2554\u2550\u2557\u2591\u2591\u2591\u2551  ', s1],
    ['  \u2551\u2591\u2591\u2591\u2551\u25C9\u2551\u2591\u2591\u2591\u2551  ', s1],
    ['  \u2551\u2591\u2591\u2591\u255A\u2550\u255D\u2591\u2591\u2591\u2551  ', s2],
    ['  \u255A\u2557\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2554\u255D  ', s2],
    ['   \u255A\u2557\u2591\u2591\u2591\u2591\u2591\u2554\u255D   ', s2],
    ['    \u255A\u2550\u2550\u2550\u2550\u2550\u255D    ', s2],
  ];
  for (let i = 0; i < lines.length; i++) {
    tx(cx0 - 7, cy0 + i, lines[i][0], lines[i][1]);
  }
  // Animated eye glow
  if (((f / 12) | 0) % 3 !== 0) {
    px(cx0, cy0 + 3, '\u25C9', BOLD + rgb(0, 255, (200 + Math.sin(f * 0.2) * 55) | 0));
  }
}

// Bouncing equalizer bars — thin columns that jump up and down
function drawEqualizer(baseY, f, color, maxH) {
  maxH = maxH || 5;
  const numBars = Math.min(20, W - 14);
  const x0 = ((W - numBars) / 2) | 0;
  const c = color || [0, 220, 255];
  for (let i = 0; i < numBars; i++) {
    const speed1 = 0.18 + (i % 5) * 0.04;
    const speed2 = 0.27 + (i % 3) * 0.06;
    const phase1 = i * 1.1 + i * i * 0.3;
    const phase2 = i * 0.7 + 2.5;
    const wave = Math.sin(f * speed1 + phase1) * 0.5
               + Math.sin(f * speed2 + phase2) * 0.35
               + Math.sin(f * 0.33 + i * 0.5) * 0.15;
    const h = Math.max(1, ((wave * 0.5 + 0.5) * maxH + 0.5) | 0);
    for (let dy = 0; dy < h; dy++) {
      const bright = 0.4 + (1 - dy / h) * 0.6;
      const ch = dy === 0 ? '\u2580' : '\u2502';
      px(x0 + i, baseY - dy, ch,
        rgb((c[0] * bright) | 0, (c[1] * bright) | 0, (c[2] * bright) | 0));
    }
  }
}

function drawCR() { cx(H - 1, '\u2726 \u00A9 MindSpark', DIM + rgb(60, 60, 90)); }

// ═══════════════════════════════════════════════════════════════
//  STATES
// ═══════════════════════════════════════════════════════════════
let state = 'setup';  // setup | verify | done
let frame = 0;

function tickSetup() {
  fbClr();
  drawStars(frame);

  const cy = Math.max(1, ((H / 2) | 0) - 12);
  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  // Bordered panel
  const bw = Math.min(44, W - 4);
  const bx0 = ((W - bw) / 2) | 0;
  const bh = 22;
  const bc = rgb(0, (160 * pulse) | 0, (200 * pulse) | 0);
  tx(bx0, cy, '\u2554' + '\u2550'.repeat(bw - 2) + '\u2557', bc);
  for (let dy = 1; dy < bh; dy++) {
    tx(bx0, cy + dy, '\u2551', bc);
    tx(bx0 + bw - 1, cy + dy, '\u2551', bc);
  }
  tx(bx0, cy + bh, '\u255A' + '\u2550'.repeat(bw - 2) + '\u255D', bc);

  // Title with letter-by-letter reveal
  const title = 'C R Y P T I Q   S H I E L D';
  const revealed = Math.min(title.length, ((frame / 2) | 0));
  const titleGlow = Math.sin(frame * 0.08) * 0.2 + 0.8;
  const tx0 = ((W - title.length) / 2) | 0;
  for (let i = 0; i < revealed; i++) {
    const age = revealed - i;
    const bright = Math.min(1, age * 0.08);
    const t = i / title.length;
    const lr = (t * 80 * bright) | 0;
    const lg = ((200 - t * 60) * bright * titleGlow) | 0;
    const lb = (255 * bright * titleGlow) | 0;
    px(tx0 + i, cy + 2, title[i], BOLD + rgb(lr, Math.min(255, lg), Math.min(255, lb)));
  }

  // Subtitle line
  if (frame > 60) {
    const lw = Math.min(30, bw - 6);
    const lx = ((W - lw) / 2) | 0;
    const la = Math.min(1, (frame - 60) / 20);
    for (let i = 0; i < lw; i++) {
      const t = i / lw;
      px(lx + i, cy + 3, '\u2500', rgb((t * 80 * la) | 0, ((100 - t * 50) * la) | 0, (130 * pulse * la) | 0));
    }
    cx(cy + 4, 'S E T U P', DIM + rgb(0, (160 * pulse * la) | 0, (180 * pulse * la) | 0));
  }

  // Shield icon
  if (frame > 30) drawShieldIcon(((W / 2) | 0), cy + 6, frame);

  // Status area
  if (!shieldBusy && !shieldResult) {
    if (frame > 80) {
      cx(cy + 15, 'Look at the camera to enroll', rgb(180, 190, 200));
      cx(cy + 16, 'your admin face.', rgb(180, 190, 200));
      cx(cy + 18, 'This face will be required to', DIM + rgb(120, 130, 140));
      cx(cy + 19, 'unlock the screen and quit the app.', DIM + rgb(120, 130, 140));
    }
    if (frame > 100) {
      const blink = ((frame / 18) | 0) % 2;
      cx(cy + 21, blink ? '\u25B8 Press SPACE to begin \u25C2' : '  Press SPACE to begin  ',
        BOLD + rgb(0, (blink ? 255 : 200), (blink ? 220 : 170)));
    }
    if (spTap && frame > 100 && shieldOK) runShieldCmd('enroll');
    else if (spTap && frame > 100 && !shieldOK) {
      shieldResult = { error: 'shield_unavailable' };
      shieldDoneAt = frame;
    }
  } else if (shieldBusy) {
    cx(cy + 14, 'SCANNING FACE...', BOLD + rgb(0, 255, 220));
    drawEqualizer(cy + 21, frame, [0, 220, 255], 5);
    const dots = '.'.repeat(((frame / 8) | 0) % 4);
    cx(cy + 15, 'Capturing landmarks' + dots, DIM + rgb(0, 180, 200));
  } else if (shieldResult && shieldResult.success) {
    cx(cy + 15, '\u2713 FACE ENROLLED SUCCESSFULLY', BOLD + rgb(0, 255, 120));
    cx(cy + 17, shieldResult.points + ' facial landmarks captured', DIM + rgb(0, 200, 150));
    const flash = Math.sin((frame - shieldDoneAt) * 0.2) * 0.3 + 0.7;
    tx(bx0, cy, '\u2554' + '\u2550'.repeat(bw - 2) + '\u2557', rgb(0, (255 * flash) | 0, (120 * flash) | 0));
    tx(bx0, cy + bh, '\u255A' + '\u2550'.repeat(bw - 2) + '\u255D', rgb(0, (255 * flash) | 0, (120 * flash) | 0));
    cx(cy + 19, 'Shield activated.', rgb(0, 200, 160));
    if (frame - shieldDoneAt > 120) cleanup(0);
  } else if (shieldResult && shieldResult.error) {
    const err = shieldResult.error === 'no_face' ? 'No face detected \u2014 try again' :
                shieldResult.error === 'camera_failed' ? 'Camera unavailable \u2014 check permissions' :
                shieldResult.error === 'shield_unavailable' ? 'Shield binary not available' :
                'Error: ' + shieldResult.error;
    cx(cy + 15, err, rgb(255, 80, 80));
    cx(cy + 17, 'Make sure your face is visible and', DIM + rgb(180, 140, 140));
    cx(cy + 18, 'well-lit in the camera frame.', DIM + rgb(180, 140, 140));
    cx(cy + 20, 'Press SPACE to retry', rgb(180, 190, 200));
    if (spTap) { shieldResult = null; if (shieldOK) runShieldCmd('enroll'); }
  }

  drawCR();
}

function tickVerify() {
  fbClr();
  drawStars(frame);

  const cy = Math.max(1, ((H / 2) | 0) - 10);
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Red-tinted panel
  const bw = Math.min(44, W - 4);
  const bx0 = ((W - bw) / 2) | 0;
  const bh = 18;
  const bc = rgb((160 * pulse) | 0, (60 * pulse) | 0, (60 * pulse) | 0);
  tx(bx0, cy, '\u2554' + '\u2550'.repeat(bw - 2) + '\u2557', bc);
  for (let dy = 1; dy < bh; dy++) {
    tx(bx0, cy + dy, '\u2551', bc);
    tx(bx0 + bw - 1, cy + dy, '\u2551', bc);
  }
  tx(bx0, cy + bh, '\u255A' + '\u2550'.repeat(bw - 2) + '\u255D', bc);

  // Title
  cx(cy + 2, 'C R Y P T I Q   S H I E L D', BOLD + rgb((230 * pulse) | 0, (100 * pulse) | 0, (100 * pulse) | 0));
  const lw = Math.min(30, bw - 6);
  const lx = ((W - lw) / 2) | 0;
  for (let i = 0; i < lw; i++) {
    px(lx + i, cy + 3, '\u2500', rgb((130 * pulse) | 0, (40 * pulse) | 0, (40 * pulse) | 0));
  }

  // Lock icon
  const lcy = cy + 5;
  const lockCol = rgb(255, (100 + Math.sin(frame * 0.1) * 50) | 0, (80 + Math.sin(frame * 0.1) * 40) | 0);
  cx(lcy,     '  \u250C\u2500\u2500\u2500\u2510  ', lockCol);
  cx(lcy + 1, '\u250C\u2500\u2524   \u251C\u2500\u2510', lockCol);
  cx(lcy + 2, '\u2502 \u2502 \u25C9 \u2502 \u2502', lockCol);
  cx(lcy + 3, '\u2514\u2500\u2534\u2500\u2500\u2500\u2534\u2500\u2518', lockCol);

  if (!shieldBusy && !shieldResult) {
    cx(cy + 10, 'FACE VERIFICATION REQUIRED', BOLD + rgb(255, 200, 100));
    cx(cy + 12, 'Look at the camera to verify', rgb(180, 190, 200));
    cx(cy + 13, 'your identity.', rgb(180, 190, 200));
    const blink = ((frame / 18) | 0) % 2;
    cx(cy + 15, blink ? '\u25B8 Press SPACE to scan \u25C2' : '  Press SPACE to scan  ',
      BOLD + rgb(0, (blink ? 255 : 200), (blink ? 220 : 170)));
    if (spTap && shieldOK) runShieldCmd('verify');
  } else if (shieldBusy) {
    cx(cy + 10, 'VERIFYING...', BOLD + rgb(255, 200, 100));
    drawEqualizer(cy + 17, frame, [255, 180, 50], 5);
  } else if (shieldResult && shieldResult.match) {
    cx(cy + 10, '\u2713 IDENTITY VERIFIED', BOLD + rgb(0, 255, 120));
    const score = shieldResult.score || 0;
    cx(cy + 12, 'Match: ' + ((score * 100) | 0) + '%', DIM + rgb(0, 200, 150));
    tx(bx0, cy, '\u2554' + '\u2550'.repeat(bw - 2) + '\u2557', rgb(0, 255, 120));
    tx(bx0, cy + bh, '\u255A' + '\u2550'.repeat(bw - 2) + '\u255D', rgb(0, 255, 120));
    if (frame - shieldDoneAt > 80) cleanup(0);
  } else {
    const err = shieldResult && shieldResult.error === 'no_face' ? 'No face detected' :
                shieldResult && shieldResult.error === 'camera_failed' ? 'Camera unavailable' :
                'FACE MISMATCH \u2014 ACCESS DENIED';
    cx(cy + 10, err, BOLD + rgb(255, 50, 50));
    if (shieldResult && shieldResult.score !== undefined) {
      cx(cy + 12, 'Match: ' + ((shieldResult.score * 100) | 0) + '% (required: 60%)', DIM + rgb(200, 100, 100));
    }
    if (frame - shieldDoneAt < 15) invertTimer = Math.max(invertTimer, 8);
    cx(cy + 14, 'Press SPACE to retry', rgb(180, 190, 200));
    if (spTap) { shieldResult = null; if (shieldOK) runShieldCmd('verify'); }
  }

  drawCR();
}

// ═══════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════
let loopTimer = null;

function tick() {
  procInput();
  if (W < 50 || H < 12) {
    stdout.write(HOME + CLR + 'Please resize terminal to at least 50x12\r\n'); return;
  }
  if (!fC.length || fC.length !== H || (fC[0] && fC[0].length !== W)) dims();
  fbClr();

  switch (state) {
    case 'setup':  tickSetup(); break;
    case 'verify': tickVerify(); break;
  }

  if (invertTimer > 0) invertTimer--;
  flush(); frame++;
}

// ═══════════════════════════════════════════════════════════════
//  CLEANUP & ENTRY
// ═══════════════════════════════════════════════════════════════
function cleanup(code) {
  if (loopTimer) clearInterval(loopTimer);
  stdout.write(RST + SHOW + CLR + HOME);
  stdout.write('Cryptiq Shield \u2014 MindSpark\r\n');
  if (shieldEnrolled) stdout.write(DIM + '\u2726 Face enrolled and active\r\n' + RST);
  process.exit(code || 0);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('uncaughtException', (err) => {
  stdout.write(RST + SHOW + '\r\n');
  console.error(err);
  process.exit(1);
});
stdout.on('resize', () => { dims(); initStars(); });

// Determine mode from args: --verify to go straight to verify screen
const mode = process.argv.includes('--verify') ? 'verify' : 'setup';

// Boot
dims(); fbAlloc(); initStars(); setupInput(); initShield();
stdout.write(CLR + HIDE);
state = mode;
loopTimer = setInterval(tick, TICK);

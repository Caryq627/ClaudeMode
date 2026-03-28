#!/usr/bin/env node
'use strict';

/* ╔══════════════════════════════════════════════════════════════╗
   ║  TERMIJUMP — Terminal Based Games from MindSpark            ║
   ║  A retro pixel side-scrolling platformer for your terminal  ║
   ╚══════════════════════════════════════════════════════════════╝ */

const { stdin, stdout } = process;
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════
const FPS = 30;
const TICK = Math.floor(1000 / FPS);
const GRAV = 0.35;
const JUMP_V = -2.6;
const TERM_V = 3.5;
const PW = 1;
const PIECE_H = 1;
const PLR_SX = 12;
const MAX_LIVES = 3;
const INVINCE_DUR = 80;
const MAX_JUMPS = 5;          // quintuple jump!

// Difficulty presets (set by menu)
const DIFF = {
  easy:   { spd: 1.60, max: 4.4, acc: 0.00040, enemy: 0.5, label: 'EASY' },
  brave:  { spd: 1.90, max: 5.6, acc: 0.00056, enemy: 1.0, label: 'BRAVE' },
  insane: { spd: 2.30, max: 7.2, acc: 0.00076, enemy: 2.2, label: 'INSANE' },
};
let diffLevel = 'brave';

// Dynamic ground height scales to terminal size
function baseGnd() { return Math.max(4, Math.min(10, (GH * 0.22) | 0)); }

// ═══════════════════════════════════════════════════════════════
//  ENTROPY ENGINE — harvests randomness from gameplay
// ═══════════════════════════════════════════════════════════════
let entropy = Date.now() ^ (process.pid << 16);
function stir(v) { entropy = ((entropy * 1103515245 + (v | 0) + 12345) >>> 0) & 0x7FFFFFFF; }
function eRand() { stir(entropy); return (entropy & 0xFFFF) / 0xFFFF; }

// HSL → RGB terminal color string
function hsl(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return rgb((r*255)|0, (g*255)|0, (b*255)|0);
}
function hslRaw(h, s, l) {
  // Returns [r,g,b] 0-255
  h = (((h % 360) + 360) % 360) / 360;
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const f = (p, q, t) => {
      if (t<0)t++;if(t>1)t--;
      return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;
    };
    const q = l<.5?l*(1+s):l+s-l*s, p = 2*l-q;
    r = f(p,q,h+1/3); g = f(p,q,h); b = f(p,q,h-1/3);
  }
  return [(r*255)|0,(g*255)|0,(b*255)|0];
}

// Color palette — regenerated each game from entropy
let pal = {};
function genPalette() {
  const h = ((entropy * 137.508) % 360 + 360) % 360;
  pal.h = h;
  pal.grassTop = hsl(h+120, .65, .35);
  pal.grassHi  = hsl(h+115, .70, .45);
  pal.grassSub = hsl(h+125, .50, .28);
  pal.dirt     = hsl(h+30,  .45, .24);
  pal.dirtDk   = hsl(h+28,  .35, .18);
  pal.dirtLt   = hsl(h+32,  .40, .30);
  pal.stone    = hsl(h+20,  .25, .32);
  pal.plat     = hsl(h+180, .65, .42);
  pal.platMid  = hsl(h+182, .55, .32);
  pal.platDk   = hsl(h+185, .45, .25);
  pal.platEdge = hsl(h+178, .50, .28);
  pal.player   = hsl(h+40,  .90, .55);
  pal.player2  = hsl(h+30,  .85, .45);
  pal.player1  = hsl(h+0,   .00, .90);
  pal.enemy    = hsl(h,     .75, .48);
  pal.enemy2   = hsl(h+10,  .65, .38);
  pal.trail    = hsl(h+160, .55, .25);
  pal.trailBr  = hsl(h+155, .60, .35);
  pal.orb      = hsl(h+270, .80, .55);
  pal.orbGlow  = hsl(h+275, .60, .35);
  pal.deco     = hsl(h+140, .50, .40);
  pal.obstacle = hsl(h+350, .70, .40);
  pal.obstDk   = hsl(h+355, .60, .30);
}

const MUSIC_FILE = path.join(os.homedir(),
  'Library/CloudStorage/Dropbox/MindSpark/Videos/gravity-aavirall-main-version-01-41-13965.mp3');

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
//  TERMINAL
// ═══════════════════════════════════════════════════════════════
let W, H, GT, GH;
function dims() {
  W = stdout.columns || 80;
  H = stdout.rows || 24;
  GT = 2; GH = H - 3;
  fbAlloc();
}

// ═══════════════════════════════════════════════════════════════
//  FRAMEBUFFER
// ═══════════════════════════════════════════════════════════════
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
function bx(x, y, w, h, c, s) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      px(x + dx, y + dy, c, s);
}
let invertTimer = 0;  // screen inversion on hit (30 frames = 1s)

function flush() {
  // Fading invert: solid first half, flickering second half
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
//  PIXEL FONT (5×5)
// ═══════════════════════════════════════════════════════════════
const FN = {
  T:['#####','  #  ','  #  ','  #  ','  #  '],
  E:['#####','#    ','#### ','#    ','#####'],
  R:['#### ','#   #','#### ','# #  ','#  ##'],
  M:['#   #','## ##','# # #','#   #','#   #'],
  I:['#####','  #  ','  #  ','  #  ','#####'],
  J:[' ####','   # ','   # ','#  # ',' ##  '],
  U:['#   #','#   #','#   #','#   #',' ### '],
  P:['#### ','#   #','#### ','#    ','#    '],
  G:[' ####','#    ','# ###','#   #',' ### '],
  A:[' ### ','#   #','#####','#   #','#   #'],
  O:[' ### ','#   #','#   #','#   #',' ### '],
  V:['#   #','#   #',' # # ',' # # ','  #  '],
  N:['#   #','##  #','# # #','#  ##','#   #'],
  D:['#### ','#   #','#   #','#   #','#### '],
  S:[' ####','#    ',' ### ','    #','#### '],
  K:['#  # ','# #  ','##   ','# #  ','#  # '],
  C:[' ####','#    ','#    ','#    ',' ####'],
  W:['#   #','#   #','# # #','## ##','#   #'],
  H:['#   #','#   #','#####','#   #','#   #'],
  L:['#    ','#    ','#    ','#    ','#####'],
  ' ':['     ','     ','     ','     ','     '],
};

// ── Neon logo rendering ──────────────────────────────────────
// Logo star orbit system
let logoStars = [];
function initLogoStars() {
  logoStars = [];
  for (let i = 0; i < 18; i++) {
    logoStars.push({
      angle: (i / 18) * Math.PI * 2,
      radius: 8 + Math.random() * 6,
      speed: 0.008 + Math.random() * 0.012,
      ch: ['✦','·','∗','+','·','✦'][(Math.random()*6)|0],
      bright: 60 + ((Math.random() * 120) | 0),
    });
  }
}

function drawLogoStars(cx0, cy0, frame) {
  for (const ls of logoStars) {
    ls.angle += ls.speed;
    const sx = cx0 + Math.cos(ls.angle) * ls.radius;
    const sy = cy0 + Math.sin(ls.angle) * ls.radius * 0.45; // squash for terminal aspect
    const pulse = Math.sin(frame * 0.05 + ls.angle) * 0.3 + 0.7;
    const v = (ls.bright * pulse) | 0;
    px(sx | 0, sy | 0, ls.ch, rgb((v * 0.4) | 0, v, (v * 0.9) | 0));
  }
}

function bigPos(text) {
  const cw = W >= 110 ? 11 : 6;
  const tw = text.length * cw - 1;
  return text.split('').map((_, i) => (((W - tw) / 2) | 0) + i * cw);
}

// Scaled logo rendering (scale 0..1 for zoom effect)
function drawLogoZoom(text, cy, frame, revealed, scale) {
  if (scale <= 0.05) return;
  const pos = bigPos(text);
  const wide = W >= 110;
  const centerX = (W / 2) | 0;
  const centerY = cy + 2;

  for (let ci = 0; ci < text.length && ci <= revealed; ci++) {
    const d = FN[text[ci]]; if (!d) continue;
    const age = Math.max(0, revealed - ci);
    const bright = Math.min(1, age * 0.12);
    const t = ci / (text.length - 1 || 1);

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (d[r][c] !== '#') continue;
        // Scale from center
        const baseX = wide ? pos[ci] + c * 2 : pos[ci] + c;
        const baseY = cy + r;
        const sx = centerX + ((baseX - centerX) * scale) | 0;
        const sy = centerY + ((baseY - centerY) * scale) | 0;

        const rowF = [0.80, 0.92, 1.0, 0.94, 0.82][r];
        const wave = Math.sin(frame * 0.022 + ci * 0.55 + r * 0.3) * 0.06;
        const f = (rowF + wave) * bright * Math.min(1, scale * 1.5);
        const lr = Math.min(255, ((15 + t * 165) * f) | 0);
        const lg = Math.min(255, ((215 - t * 170) * f) | 0);
        const lb = Math.min(255, (255 * f) | 0);
        // Glow around edges
        const gr = (lr * 0.35) | 0, gg = (lg * 0.35) | 0, gb = (lb * 0.35) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            px(sx + dx, sy + dy, '░', rgb(gr, gg, gb));
          }
        }
        px(sx, sy, '█', rgb(lr, lg, lb));
        if (wide) {
          const sx2 = centerX + ((baseX + 1 - centerX) * scale) | 0;
          px(sx2, sy, '█', rgb(lr, lg, lb));
        }
      }
    }
  }
}

// Generic big text (for GAME OVER etc)
function bigText(text, y, colorFn) {
  const pos = bigPos(text);
  for (let i = 0; i < text.length; i++) {
    const d = FN[text[i]]; if (!d) continue;
    const s = colorFn(i);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (d[r][c] === '#') px(pos[i] + c, y + r, '█', s);
  }
}

function drawLogoNeon(text, cy, frame, revealed) {
  const pos = bigPos(text);
  const wide = W >= 110;

  // Pass 1: outer glow
  for (let ci = 0; ci < text.length && ci <= revealed; ci++) {
    const d = FN[text[ci]]; if (!d) continue;
    const t = ci / (text.length - 1 || 1);
    const gr = (t * 60) | 0, gg = (85 - t * 55) | 0, gb = 110;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (d[r][c] !== '#') continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nr = r + dy, nc = c + dx;
            const inside = nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && d[nr] && d[nr][nc] === '#';
            if (!inside) {
              if (wide) {
                px(pos[ci] + c * 2 + dx, cy + r + dy, '░', rgb(gr, gg, gb));
                px(pos[ci] + c * 2 + 1 + dx, cy + r + dy, '░', rgb(gr, gg, gb));
              } else {
                px(pos[ci] + c + dx, cy + r + dy, '░', rgb(gr, gg, gb));
              }
            }
          }
        }
      }
    }
  }

  // Pass 2: letter face with neon gradient
  for (let ci = 0; ci < text.length && ci <= revealed; ci++) {
    const d = FN[text[ci]]; if (!d) continue;
    const age = Math.max(0, revealed - ci);
    const bright = Math.min(1, age * 0.12);
    const t = ci / (text.length - 1 || 1);

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (d[r][c] !== '#') continue;
        const rowF = [0.80, 0.92, 1.0, 0.94, 0.82][r];
        const wave = Math.sin(frame * 0.022 + ci * 0.55 + r * 0.3) * 0.06;
        const f = (rowF + wave) * bright;
        const lr = Math.min(255, ((15 + t * 165) * f) | 0);
        const lg = Math.min(255, ((215 - t * 170) * f) | 0);
        const lb = Math.min(255, (255 * f) | 0);
        if (wide) {
          px(pos[ci] + c * 2, cy + r, '█', rgb(lr, lg, lb));
          px(pos[ci] + c * 2 + 1, cy + r, '█', rgb(lr, lg, lb));
        } else {
          px(pos[ci] + c, cy + r, '█', rgb(lr, lg, lb));
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  AUDIO SYSTEM
// ═══════════════════════════════════════════════════════════════
const audioDir = path.join(os.tmpdir(), 'termijump-audio');
const audioPlayer = process.platform === 'darwin' ? 'afplay' :
                    process.platform === 'linux' ? 'aplay' : null;
let audioOK = !!audioPlayer && !process.argv.includes('--no-audio');
let muted = false;
let musicProc = null;
let activeSfx = 0;

function makeWav(samples, sr = 22050) {
  const n = samples.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 30);
  buf.writeUInt16LE(16, 32); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    buf.writeInt16LE((Math.max(-1, Math.min(1, samples[i])) * 32767) | 0, 44 + i * 2);
  return buf;
}
function sq(f, t, v) { return Math.sign(Math.sin(6.2832 * f * t)) * v; }

function genSfx() {
  if (!audioOK) return;
  try { fs.mkdirSync(audioDir, { recursive: true }); } catch (e) {}
  const sr = 22050;
  let s;

  // Jump
  s = []; for (let i = 0; i < sr * 0.1; i++) {
    const t = i / sr, f = 350 + (i / (sr * 0.1)) * 500;
    s.push(sq(f, t, 0.2) * (1 - i / (sr * 0.1)));
  }
  fs.writeFileSync(path.join(audioDir, 'jump.wav'), makeWav(s, sr));

  // Jump2 (double)
  s = []; for (let i = 0; i < sr * 0.12; i++) {
    const t = i / sr, phase = i < sr * 0.05 ? 0 : 1;
    const f = phase === 0 ? 500 : 750;
    s.push(sq(f, t, 0.18) * (1 - i / (sr * 0.12)));
  }
  fs.writeFileSync(path.join(audioDir, 'jump2.wav'), makeWav(s, sr));

  // Hit
  s = []; for (let i = 0; i < sr * 0.25; i++) {
    const t = i / sr, f = 400 - (i / (sr * 0.25)) * 300;
    s.push((sq(f, t, 0.22) + sq(f * 0.5, t, 0.1)) * (1 - i / (sr * 0.25)));
  }
  fs.writeFileSync(path.join(audioDir, 'hit.wav'), makeWav(s, sr));

  // Powerup
  s = [];
  for (const freq of [330, 392, 494, 587, 659, 784]) {
    const nl = (sr * 0.06) | 0;
    for (let i = 0; i < nl; i++) {
      const t = i / sr, env = i < nl * 0.1 ? i / (nl * 0.1) : i > nl * 0.6 ? (nl - i) / (nl * 0.4) : 1;
      s.push(sq(freq, t, 0.15) * env);
    }
  }
  fs.writeFileSync(path.join(audioDir, 'powerup.wav'), makeWav(s, sr));

  // Death
  s = [];
  for (const freq of [440, 415, 392, 370, 349, 330, 294, 262, 220, 165]) {
    const nl = (sr * 0.07) | 0;
    for (let i = 0; i < nl; i++) s.push(sq(freq, i / sr, 0.22) * (1 - i / nl));
  }
  fs.writeFileSync(path.join(audioDir, 'death.wav'), makeWav(s, sr));
}

function playSound(name) {
  if (!audioOK || muted || activeSfx >= 5) return;
  const file = path.join(audioDir, name + '.wav');
  try {
    if (!fs.existsSync(file)) return;
    activeSfx++;
    const args = audioPlayer === 'afplay' ? ['-v', '0.40', file] : ['-q', file];
    const p = spawn(audioPlayer, args, { stdio: 'ignore' });
    p.on('exit', () => activeSfx--); p.on('error', () => activeSfx--); p.unref();
  } catch (e) { activeSfx--; }
}

function startMusic() {
  stopMusic();
  if (muted || !audioOK || !fs.existsSync(MUSIC_FILE)) return;
  function loop() {
    if (muted) return;
    const args = audioPlayer === 'afplay' ? ['-v', '0.28', MUSIC_FILE] : [MUSIC_FILE];
    musicProc = spawn(audioPlayer, args, { stdio: 'ignore' });
    musicProc.on('exit', () => { musicProc = null; if (!muted) loop(); });
    musicProc.on('error', () => { musicProc = null; });
    musicProc.unref();
  }
  loop();
}
function stopMusic() {
  if (musicProc) { try { musicProc.kill(); } catch (e) {} musicProc = null; }
}
function toggleMute() {
  muted = !muted;
  if (muted) stopMusic(); else startMusic();
}

// ═══════════════════════════════════════════════════════════════
//  HIGH SCORES
// ═══════════════════════════════════════════════════════════════
const SCORE_FILE = path.join(os.homedir(), '.termijump-scores.json');
function loadAllScores() {
  try {
    const raw = JSON.parse(fs.readFileSync(SCORE_FILE, 'utf8'));
    if (Array.isArray(raw)) return { brave: raw }; // migrate old format
    return raw;
  } catch (e) { return {}; }
}
function loadScores(dl) {
  return loadAllScores()[dl || diffLevel] || [];
}
function saveScoreEntry(ini, sc) {
  const all = loadAllScores();
  if (!all[diffLevel]) all[diffLevel] = [];
  all[diffLevel].push({ initials: ini.toUpperCase(), score: sc });
  all[diffLevel].sort((a, b) => b.score - a.score);
  if (all[diffLevel].length > 10) all[diffLevel].length = 10;
  try { fs.writeFileSync(SCORE_FILE, JSON.stringify(all, null, 2)); } catch (e) {}
  return all[diffLevel];
}
function isHighScore(sc) {
  const scores = loadScores();
  return sc > 0 && (scores.length < 10 || sc > (scores[scores.length - 1]?.score || 0));
}

// ═══════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════
const GLIDE_GRAV = 0.12;     // reduced gravity while holding space
let spDown = false, spTap = false, spReleased = true, spTime = 0;
let onePress = false, twoPress = false, threePress = false;
let enterPress = false, backPress = false;
let pausePress = false, resetPress = false;
let letterBuf = [], inputQ = [];
let paused = false;

function setupInput() {
  if (stdin.isTTY) stdin.setRawMode(true);
  stdin.resume(); stdin.setEncoding('utf8');
  stdin.on('data', d => inputQ.push(d));
}

function procInput() {
  spTap = false; onePress = false; twoPress = false; threePress = false;
  enterPress = false; backPress = false; pausePress = false; resetPress = false;
  letterBuf = [];
  for (const d of inputQ) {
    for (let i = 0; i < d.length; i++) {
      const ch = d[i], cc = d.charCodeAt(i);
      if (cc === 3) cleanup(0);
      if (ch === ' ') {
        if (spReleased) { spTap = true; spReleased = false; }
        spDown = true; spTime = Date.now();
      }
      if (ch === '1') onePress = true;
      if (ch === '2') twoPress = true;
      if (ch === '3') threePress = true;
      if (ch === '\r' || ch === '\n') enterPress = true;
      if (cc === 127 || cc === 8) backPress = true;
      if (ch === 'p' || ch === 'P') pausePress = true;
      if (ch === 'r' || ch === 'R') resetPress = true;
      if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z')) {
        letterBuf.push(ch.toUpperCase());
      }
      if ((ch === 'q' || ch === 'Q') && state !== 'initials') cleanup(0);
      if ((ch === 'm' || ch === 'M') && state !== 'initials') toggleMute();
    }
  }
  inputQ = [];
  if (Date.now() - spTime > 105) { spDown = false; spReleased = true; }
}

// ═══════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════
let particles = [];
function addP(x, y, spread, ch, r, g, b) {
  particles.push({ x, y, vx: (Math.random()-.5)*spread, vy: (Math.random()-.8)*spread,
    ch: ch||'█', r:r||255, g:g||255, b:b||255, life:1, decay:.012+Math.random()*.025 });
}
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += .04; p.vx *= .97; p.vy *= .97; p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function drawParticles() {
  for (const p of particles) {
    const f = Math.max(0, p.life);
    px(Math.round(p.x), Math.round(p.y), p.ch, rgb((p.r*f)|0, (p.g*f)|0, (p.b*f)|0));
  }
}

// ═══════════════════════════════════════════════════════════════
//  3-PLANE PARALLAX
// ═══════════════════════════════════════════════════════════════

// ── Far plane: stars (lots, slow) ──
let stars = [];
function initStars() {
  stars = [];
  if (!GH || GH < 1) return;
  const n = Math.max(20, (W * GH * 0.08) | 0);  // very dense starfield
  for (let i = 0; i < n; i++) {
    stars.push({
      x: (Math.random() * W * 4) | 0,
      y: GT + ((Math.random() * GH) | 0),
      c: ['.','·','∗','+','·','.','·','.','+'][(Math.random()*9)|0],
      b: 12 + ((Math.random()*50)|0),
      p: Math.random() * 6.28,
      speed: 0.03 + Math.random() * 0.04,  // varied parallax speed
    });
  }
}
function drawStars(frame, camOff) {
  for (const s of stars) {
    const tw = Math.sin(frame * 0.035 + s.p) * 0.35 + 0.65;
    const v = (s.b * tw) | 0;
    const xx = ((s.x - ((camOff * s.speed) | 0)) % (W * 3) + W * 3) % (W * 3);
    if (xx < W) px(xx, s.y, s.c, rgb(v, (v * 0.9)|0, Math.min(255, (v*1.5)|0)));
  }
}

// ── Far plane: clouds (slow, blurry) ──
let clouds = [];
function initClouds() {
  clouds = [];
  if (!GH || GH < 5) return;
  const n = 4 + ((Math.random() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const w = 10 + ((Math.random() * 20) | 0);
    const h = 2 + (Math.random() < 0.35 ? 1 : 0);
    const rows = [];
    for (let r = 0; r < h; r++) {
      let row = '';
      for (let c = 0; c < w; c++) {
        const cx = c / w - 0.5, cy = r / h - 0.5;
        row += (Math.sqrt(cx*cx*3 + cy*cy*12) < 0.38 + Math.random()*0.14) ? '░' : ' ';
      }
      rows.push(row);
    }
    clouds.push({ x: (Math.random()*W*6)|0, y: GT+1+((Math.random()*(GH*0.3))|0), w, h, rows });
  }
}
function drawClouds(camOff) {
  for (const c of clouds) {
    const sx = ((c.x - ((camOff * 0.05)|0)) % (W*5) + W*5) % (W*5) - W;
    for (let r = 0; r < c.h; r++)
      for (let cc = 0; cc < c.w; cc++)
        if (c.rows[r][cc] !== ' ') {
          const screenX = (sx + cc) | 0;
          if (screenX >= 0 && screenX < W) px(screenX, c.y + r, '░', rgb(35, 38, 55));
        }
  }
}

// ── Near plane: foreground blur (fast) ──
let fgElems = [];
function initFg() {
  fgElems = [];
  if (!GH || GH < 5) return;
  const n = 6 + ((Math.random() * 5) | 0);
  for (let i = 0; i < n; i++) {
    fgElems.push({
      x: (Math.random()*W*3)|0, y: GT+2+((Math.random()*(GH-4))|0),
      len: 1+((Math.random()*4)|0), h: 1+(Math.random()<.25?1:0),
      ch: Math.random()<.65?'░':'▒',
    });
  }
}
function drawFg(camOff) {
  for (const fg of fgElems) {
    const sx = ((fg.x - ((camOff * 2.0)|0)) % (W*2) + W*2) % (W*2) - (W*.3)|0;
    for (let dy = 0; dy < fg.h; dy++)
      for (let dx = 0; dx < fg.len; dx++) {
        const screenX = (sx + dx) | 0;
        if (screenX >= 0 && screenX < W) px(screenX, fg.y + dy, fg.ch, DIM + rgb(20, 23, 30));
      }
  }
}

// ═══════════════════════════════════════════════════════════════
//  COPYRIGHT + MUTE
// ═══════════════════════════════════════════════════════════════
function drawCR() { cx(H - 1, '✦ © MindSpark', DIM + rgb(60, 60, 90)); }

// ── Cloud ceiling ──
function drawCeiling(camX, frame) {
  for (let sx = 0; sx < W; sx++) {
    const wx = camX + sx;
    // Wispy cloud layer at top of game area
    const v1 = dhash(wx, 20) % 7;
    const v2 = dhash(wx, 21) % 9;
    if (v1 === 0) px(sx, GT, '░', rgb(30, 32, 50));
    if (v2 === 0) px(sx, GT + 1, '░', rgb(25, 27, 42));
    if (v1 === 1 && v2 < 3) px(sx, GT, '▒', rgb(22, 24, 38));
  }
}

// ── Shooting stars ──
let shootingStars = [];
function updateShootingStars() {
  // Occasionally spawn a shooting star
  if (Math.random() < 0.008) {
    const colors = [[255,100,100],[100,200,255],[255,255,100],[100,255,180],[255,150,255]];
    const c = colors[(Math.random()*colors.length)|0];
    shootingStars.push({
      x: W + 5, y: GT + 1 + ((Math.random() * (GH * 0.4)) | 0),
      vx: -(3 + Math.random() * 4),
      vy: 0.3 + Math.random() * 0.6,
      r: c[0], g: c[1], b: c[2],
      life: 1.0,
    });
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.x += s.vx; s.y += s.vy; s.life -= 0.025;
    if (s.life <= 0 || s.x < -10) { shootingStars.splice(i, 1); continue; }
    // Draw trail
    for (let t = 0; t < 5; t++) {
      const tx = (s.x + t * (-s.vx * 0.3)) | 0;
      const ty = (s.y + t * (-s.vy * 0.3)) | 0;
      const fade = s.life * (1 - t * 0.18);
      if (fade > 0) {
        const ch = t === 0 ? '★' : t < 2 ? '·' : '.';
        px(tx, ty, ch, rgb((s.r*fade)|0, (s.g*fade)|0, (s.b*fade)|0));
      }
    }
  }
}
function drawMute() {
  tx(W - 8, 0, muted ? 'M=🔇' : 'M=♪', DIM + rgb(70, 70, 95));
}

// ═══════════════════════════════════════════════════════════════
//  TERMINAL COMMAND TRAIL
// ═══════════════════════════════════════════════════════════════
const TRAIL_CMDS = [
  'ls','cd','git','npm','grep','cat','ssh','vim','node','pwd','echo','curl',
  'pip','make','rm','cp','mv','tar','awk','man','chmod','kill','ping','sed',
  'sort','find','diff','touch','mkdir','sudo','brew','push','pull','log',
  'test','run','dev','init','clone','merge','fetch','reset','stash','add',
];
let trail = [];
let trailCmd = '', trailIdx = 0;

function updateTrail() {
  if (!pAlive) return;
  // Spawn one character per frame
  if (trailIdx >= trailCmd.length) {
    trailCmd = ' ' + TRAIL_CMDS[(Math.random() * TRAIL_CMDS.length) | 0];
    trailIdx = 0;
  }
  const ph = playerH();
  trail.push({
    ch: trailCmd[trailIdx],
    wx: (scrollX | 0) + PLR_SX - 1,
    gy: (py | 0) + ((ph / 2) | 0),
    age: 0,
  });
  trailIdx++;
  for (const t of trail) t.age++;
  trail = trail.filter(t => t.age < 55);
}

function drawTrail(camX) {
  for (const t of trail) {
    const sx = t.wx - camX;
    if (sx < 0 || sx >= W) continue;
    const fade = Math.max(0, 1 - t.age / 50);
    // Trail uses palette color with fade
    const trailH = (pal.h || 0) + 160;
    px(sx, GT + t.gy, t.ch, hsl(trailH, 0.5 * fade, 0.2 * fade));
  }
}

// ═══════════════════════════════════════════════════════════════
//  GAME WORLD
// ═══════════════════════════════════════════════════════════════
let terrain = [], obstacles = [], platforms = [], powerups = [], enemies = [];
let scrollX = 0, speed = 0.55, score = 0, lives = MAX_LIVES, diff = 0;
let py = 0, pvy = 0, pGnd = false, pAlive = true, pInv = 0;
let jumpCount = 0;
let highScoreBeaten = false;
let gMode = 'flat', gLen = 0, gH = 5, gX = 0, gTotalLen = 0;
let gGapStart = 0, gGapPlat = false, gGapPlatY = 0, gBumpW = 0;

function playerH() { return 1; }
function dhash(x, s) { return (((x * 2654435761 + s * 1234567) >>> 0) & 0x7FFFFFFF); }

// ═══════════════════════════════════════════════════════════════
//  LEVEL GENERATOR
// ═══════════════════════════════════════════════════════════════
function initGame() {
  // Stir entropy from current time — every game is unique
  stir(Date.now()); stir(process.hrtime.bigint ? Number(process.hrtime.bigint() & 0xFFFFFFFFn) : Date.now());
  genPalette();  // new color scheme each game

  terrain = []; obstacles = []; platforms = []; powerups = [];
  enemies = []; particles = []; trail = []; trailCmd = ''; trailIdx = 0;
  scrollX = 0; score = 0; lives = MAX_LIVES; diff = 0;
  invertTimer = 0; paused = false;
  py = 0; pvy = 0; pGnd = true; pAlive = true; pInv = 0;
  jumpCount = 0; highScoreBeaten = false;
  const d = DIFF[diffLevel];
  speed = d.spd;
  gMode = 'flat'; gLen = 45; gH = baseGnd(); gX = 0; gTotalLen = 45;
  genAhead();
  py = GH - (terrain[PLR_SX] || baseGnd()) - playerH();
}

function genAhead() {
  const need = (scrollX | 0) + W + 100;
  while (gX < need) { if (gLen <= 0) pickGen(); genCol(gX); gLen--; gX++; }
}

function pickGen() {
  const d = diff;
  if (gMode === 'gap') { gMode = 'flat'; gLen = 5 + ((Math.random()*9*(1-d*.3))|0); gTotalLen = gLen; return; }
  const r = Math.random();
  if (r < .16 - d * .05) { gMode = 'flat'; gLen = 8 + ((Math.random()*18*(1-d*.4))|0); }
  else if (r < .30) { gMode = 'up'; gLen = 4 + ((Math.random()*8)|0); }
  else if (r < .44) { gMode = 'down'; gLen = 4 + ((Math.random()*8)|0); }
  else if (r < .66) {
    gMode = 'gap'; gLen = 12 + ((Math.random()*(14+d*24))|0);  // much wider gaps
    gGapStart = gX;
    gGapPlat = gLen > 5 && Math.random() < .55;
    gGapPlatY = gGapPlat ? Math.max(2, GH - gH - 3 - ((Math.random()*4)|0)) : 0;
  }
  else if (r < .72) { gMode = 'obs'; gLen = 6 + ((Math.random()*10)|0); }
  else if (r < .88) {
    gMode = 'multi'; gLen = 15 + ((Math.random()*20)|0); // multilevel platforms
  }
  else { gMode = 'bump'; gLen = 6 + ((Math.random()*10)|0); gBumpW = gLen; }
  gTotalLen = gLen;
}

function genCol(x) {
  let h = gH;
  switch (gMode) {
    case 'flat': break;
    case 'up': if (gLen%3===0 && gH<GH-8) gH++; h=gH; break;    // smoother inclines
    case 'down': if (gLen%3===0 && gH>3) gH--; h=gH; break;  // smoother declines
    case 'gap':
      h = 0;
      {
        const pos = x - gGapStart;
        // Floating platform
        if (gGapPlat && pos === ((gTotalLen*.25)|0)) {
          platforms.push({ x, w: Math.max(5, ((gTotalLen*.5)|0)), y: gGapPlatY });
        }
        // Bridge across wide gaps (thin walkway)
        if (gTotalLen > 8 && !gGapPlat && pos === ((gTotalLen*.15)|0)) {
          const bw = Math.max(4, ((gTotalLen*.6)|0));
          const by = GH - gH + 1;
          platforms.push({ x, w: bw, y: by });
        }
      }
      break;
    case 'obs':
      h = gH;
      { const pos = gTotalLen - gLen;
        const iv = Math.max(3, 6 - ((diff*3)|0));
        if (pos > 1 && pos % iv === 0 && x > 55) {
          obstacles.push({ x, h: Math.max(1, 1 + ((diff*2.5*Math.random())|0)) });
        }
      } break;
    case 'multi':
      h = gH;  // keep ground
      { const pos = gTotalLen - gLen;
        // Spawn floating platforms at different heights with gaps
        if (pos % 7 === 0 && pos > 0) {
          const platY = Math.max(3, GH - gH - 3 - ((Math.random() * (GH * 0.45)) | 0));
          const pw = 6 + ((Math.random() * 12) | 0);
          platforms.push({ x, w: pw, y: platY });
        }
        // Higher platforms too
        if (pos % 11 === 3) {
          const platY = Math.max(2, ((GH * 0.2) | 0) + ((Math.random() * (GH * 0.2)) | 0));
          platforms.push({ x, w: 5 + ((Math.random() * 10) | 0), y: platY });
        }
      }
      break;
    case 'bump': {
      const mid = gBumpW/2, pos = gBumpW - gLen;
      h = Math.min(GH-5, gH + Math.max(0, (mid - Math.abs(pos - mid))|0));
    } break;
  }
  terrain[x] = h;

  // Ground enemies
  if (h > 0 && x > 55 && gMode !== 'obs') {
    if (Math.random() < (.006 + diff * .025) * DIFF[diffLevel].enemy) {
      enemies.push({ wx:x, gy:GH-h-2, type:(Math.random()*3)|0, alive:true,
        dir: Math.random()<.5?-.25:.25, ox:x, frame:(Math.random()*200)|0, flying:false });
    }
  }
  // Flying enemies (hover at various heights)
  if (x > 70 && Math.random() < (.004 + diff * .015) * DIFF[diffLevel].enemy) {
    const flyY = 3 + ((Math.random() * (GH * 0.5)) | 0);
    enemies.push({ wx:x, gy:flyY, type:3, alive:true,
      dir: Math.random()<.5?-.2:.2, ox:x, frame:(Math.random()*200)|0, flying:true });
  }
  if (x > 65 && Math.random() < .003 + diff * .002) {
    const puy = h > 0 ? GH-h-4-((Math.random()*5)|0) : GH-gH-3-((Math.random()*3)|0);
    if (puy > 1 && puy < GH-2) powerups.push({ wx:x, gy:puy, alive:true, frame:0 });
  }
}

function cleanWorld() {
  const m = (scrollX|0) - 20;
  obstacles = obstacles.filter(o => o.x > m);
  platforms = platforms.filter(p => p.x+p.w > m);
  enemies = enemies.filter(e => e.wx > m-5);
  powerups = powerups.filter(p => p.wx > m-3);
}

// ═══════════════════════════════════════════════════════════════
//  PLAYER PHYSICS
// ═══════════════════════════════════════════════════════════════
function updatePlayer() {
  if (!pAlive) return;
  if (pInv > 0) pInv--;
  const ph = playerH();

  // ── 5x jump ──
  if (spTap) {
    stir(Date.now() ^ ((py * 1000) | 0));  // harvest entropy from jump timing
    if (pGnd) {
      pvy = JUMP_V; pGnd = false; jumpCount = 1;
      playSound('jump');
    } else if (jumpCount < MAX_JUMPS) {
      pvy = JUMP_V;
      jumpCount++;
      playSound(jumpCount === 2 ? 'jump2' : 'jump');
    }
  }

  // Gravity — hold space to glide (reduced gravity when falling)
  const gliding = spDown && !pGnd && pvy > 0;
  pvy += gliding ? GLIDE_GRAV : GRAV;
  if (pvy > (gliding ? TERM_V * 0.4 : TERM_V)) pvy = gliding ? TERM_V * 0.4 : TERM_V;

  py += pvy;
  const wx = (scrollX | 0) + PLR_SX;

  // ── Ground ──
  pGnd = false;
  if (pvy >= 0) {
    for (let dx = 0; dx < PW; dx++) {
      const th = terrain[wx + dx];
      if (th && th > 0 && py + ph >= GH - th) {
        py = GH - th - ph; pvy = 0; pGnd = true;
        jumpCount = 0;
      }
    }
  }

  // ── Platforms ──
  if (!pGnd && pvy >= 0) {
    for (const pl of platforms) {
      if (wx+PW > pl.x && wx < pl.x+pl.w && py+ph >= pl.y && py+ph < pl.y+1.6) {
        py = pl.y - ph; pvy = 0; pGnd = true;
        jumpCount = 0; break;
      }
    }
  }

  // ── Obstacles ──
  for (const o of obstacles) {
    const oth = terrain[o.x] || 0; if (oth <= 0) continue;
    const oTop = GH-oth-o.h, oBot = GH-oth;
    if (wx+PW > o.x && wx < o.x+2 && py+ph > oTop && py < oBot) {
      if (pvy >= 0 && py+ph-pvy <= oTop+.9) {
        py = oTop-ph; pvy = 0; pGnd = true;
        jumpCount = 0;
      } else { hitPlayer(); return; }
    }
  }

  // ── Wall collision (lose a piece, not instant death) ──
  for (let dx = 0; dx < PW; dx++) {
    for (let dy = 0; dy < ph - (pGnd ? 1 : 0); dy++) {
      const th = terrain[wx+dx] || 0;
      if (th > 0 && (py|0)+dy >= GH-th) { hitPlayer(); return; }
    }
  }

  // ── Enemies ──
  for (const e of enemies) {
    if (!e.alive) continue;
    const ewx = Math.round(e.wx);
    if (wx+PW > ewx && wx < ewx+2 && (py|0)+ph > e.gy && (py|0) < e.gy+2) {
      if (pInv <= 0) { hitPlayer(); return; }
    }
  }

  // ── Powerups ──
  for (const pu of powerups) {
    if (!pu.alive) continue;
    if (wx+PW > pu.wx && wx < pu.wx+2 && (py|0)+ph > pu.gy && (py|0) < pu.gy+2) {
      pu.alive = false;
      lives++; py -= PIECE_H;
      playSound('powerup');
      for (let i = 0; i < 22; i++) {
        const ci = (Math.random()*9)|0;
        const nc = [[0,255,255],[0,190,255],[80,100,255],[160,50,255],[255,0,200]][ci%5];
        addP(PLR_SX+1, GT+pu.gy+1, 3.5, '█', nc[0], nc[1], nc[2]);
      }
    }
  }

  if (py > GH + 5) hitPlayer();
}

function hitPlayer() {
  if (pInv > 0 || !pAlive) return;
  lives--; pInv = INVINCE_DUR;
  invertTimer = 30;  // 1 second fading screen invert
  playSound('hit');
  for (let i = 0; i < 14; i++) addP(PLR_SX+1, GT+(py|0)+1, 2.5, '█', 255, 150, 30);
  if (lives <= 0) {
    pAlive = false; playSound('death');
    changeState('gameover');
  } else {
    pvy = JUMP_V * .4;
    const wx = (scrollX|0) + PLR_SX;
    for (let a = 0; a < 40; a++) {
      const th = terrain[wx+a] || 0;
      if (th > 0) { py = GH - th - playerH(); break; }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  ENEMY UPDATE
// ═══════════════════════════════════════════════════════════════
function updateEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.wx += e.dir;
    if (Math.abs(e.wx - e.ox) > (e.flying ? 6 : 3.5)) e.dir *= -1;
    if (!e.flying) {
      const th = terrain[Math.round(e.wx)] || 0;
      if (th > 0) e.gy = GH - th - 2;
    } else {
      // Flying enemies bob up and down
      e.gy += Math.sin(e.frame * 0.06) * 0.15;
    }
    e.frame++;
  }
}

// ═══════════════════════════════════════════════════════════════
//  DRAWING
// ═══════════════════════════════════════════════════════════════
function drawTerrain(camX) {
  for (let sx = 0; sx < W; sx++) {
    const wx = camX + sx;
    const h = terrain[wx]; if (!h || h <= 0) continue;
    const topY = GT + GH - h;

    // Grass top — palette colored with highlight edge
    const gv = dhash(wx, 1);
    px(sx, topY, gv % 8 === 0 ? '▓' : '█', gv % 8 === 0 ? pal.grassHi : pal.grassTop);

    // Sub-grass with depth shading
    if (topY + 1 < GT + GH) px(sx, topY + 1, '▓', pal.grassSub);

    // Dirt layers — palette colored with depth gradient
    for (let y = topY + 2; y < GT + GH; y++) {
      const depth = (y - topY - 2) / Math.max(1, GT + GH - topY - 2);
      const variation = dhash(wx + y * 97, 3) % 16;
      const ch = variation === 0 ? '░' : variation < 2 ? '▒' : variation < 5 ? '▓' : '█';
      const col = variation === 0 ? pal.stone :
                  variation < 2 ? pal.dirtLt :
                  variation < 5 ? pal.dirtDk : pal.dirt;
      px(sx, y, ch, col);
    }

    // Edge shadow — darken left side if terrain drops
    const prevH = terrain[wx - 1] || 0;
    if (prevH > h && topY > GT) {
      px(sx, topY, '▓', pal.grassSub);
    }

    // Decorations
    if (dhash(wx, 7) % 10 === 0 && topY > GT) {
      const deco = ['♣','♠','∧','•','▪','⌂','∨'][dhash(wx, 8) % 7];
      px(sx, topY - 1, deco, pal.deco);
    }
  }
}

function drawPlatforms(camX) {
  for (const p of platforms) {
    const sx = p.x - camX;
    for (let dx = 0; dx < p.w; dx++) {
      const screenX = sx + dx;
      if (screenX < 0 || screenX >= W) continue;
      px(screenX, GT+p.y, '▓', pal.plat);
      if (p.y+1 < GH) px(screenX, GT+p.y+1, '█', pal.platMid);
      if (p.y+2 < GH) px(screenX, GT+p.y+2, '▓', pal.platDk);
    }
    const lx = sx - 1, rx = sx + p.w;
    if (lx >= 0) px(lx, GT+p.y+1, '▐', pal.platEdge);
    if (rx < W) px(rx, GT+p.y+1, '▌', pal.platEdge);
  }
}

function drawObstacles(camX) {
  for (const o of obstacles) {
    const sx = o.x - camX;
    if (sx < -3 || sx > W+3) continue;
    const th = terrain[o.x] || 0; if (th <= 0) continue;
    const oTopY = GH - th - o.h;
    for (let dy = 0; dy < o.h; dy++) {
      px(sx, GT+oTopY+dy, '█', pal.obstacle);
      px(sx+1, GT+oTopY+dy, '▓', pal.obstDk);
    }
    px(sx, GT+oTopY-1, '▲', pal.obstacle);
    px(sx+1, GT+oTopY-1, '▲', pal.obstacle);
  }
}

function drawPowerups(camX, frame) {
  const NEON_PU = [[0,255,255],[0,190,255],[80,100,255],[160,50,255],[255,0,200]];
  for (const pu of powerups) {
    if (!pu.alive) continue;
    const sx = pu.wx - camX;
    if (sx < -3 || sx > W+3) continue;
    const sy = GT + pu.gy;
    const pulse = Math.sin(frame * .18) * .35 + .65;
    const ci = ((frame/8)|0) % NEON_PU.length;
    const [r,g,b] = NEON_PU[ci];
    const pr=(r*pulse)|0, pg=(g*pulse)|0, pb=(b*pulse)|0;
    px(sx,sy,'█',rgb(pr,pg,pb)); px(sx+1,sy,'█',rgb(pr,pg,pb));
    px(sx,sy+1,'█',rgb(pr,pg,pb)); px(sx+1,sy+1,'█',rgb(pr,pg,pb));
    const gv = (22*pulse)|0;
    for (const [dx,dy] of [[-1,0],[2,0],[-1,1],[2,1],[0,-1],[1,-1],[0,2],[1,2]])
      px(sx+dx, sy+dy, '░', rgb(gv, gv, gv));
  }
}

function drawEnemies(camX, frame) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const sx = Math.round(e.wx) - camX;
    if (sx < -3 || sx > W+3) continue;
    const sy = GT + (e.gy | 0);
    const f = ((e.frame/8)|0)%2;

    if (e.flying) {
      // Flying enemy — wings + body
      const c = f ? rgb(200,50,50) : rgb(180,30,80);
      const wing = f ? '~' : '≈';
      px(sx-1, sy, wing, rgb(150,40,40));
      px(sx, sy, '█', c);
      px(sx+1, sy, '█', c);
      px(sx+2, sy, wing, rgb(150,40,40));
      px(sx, sy+1, '▓', rgb(140,25,35));
      px(sx+1, sy+1, '▓', rgb(140,25,35));
    } else {
      // Ground enemy
      let c1, c2, ch1, ch2;
      switch (e.type) {
        case 0: c1=f?rgb(230,50,30):rgb(200,80,20); c2=f?rgb(200,30,50):rgb(180,50,30);
          ch1=f?'▓':'▒'; ch2='█'; break;
        case 1: c1=f?rgb(200,30,180):rgb(160,50,200); c2=f?rgb(160,50,200):rgb(200,30,180);
          ch1=f?'▒':'░'; ch2='█'; break;
        default: c1=f?rgb(255,160,0):rgb(255,100,0); c2=f?rgb(220,120,0):rgb(200,80,0);
          ch1=f?'◆':'◇'; ch2='▓'; break;
      }
      px(sx,sy,ch1,c1); px(sx+1,sy,ch1,c1);
      px(sx,sy+1,ch2,c2); px(sx+1,sy+1,ch2,c2);
    }
  }
}

function drawPlayer(frame) {
  if (!pAlive) return;
  if (pInv > 0 && ((pInv/4)|0)%2 === 0) return;
  const sy = GT + (py | 0);
  const blink = ((frame / 8) | 0) % 2;
  const color = lives >= 3 ? pal.player :
                lives === 2 ? pal.player2 :
                blink ? pal.player1 : DIM + pal.player1;
  // Main body
  px(PLR_SX, sy, '█', color);
  // Shading — highlight above, shadow below, side detail
  const gliding = spDown && !pGnd && pvy > 0;
  px(PLR_SX, sy - 1, gliding ? '░' : '▀', color);
  px(PLR_SX - 1, sy, '▐', DIM + color);
  px(PLR_SX + 1, sy, '▌', DIM + color);
  if (gliding) {
    // Glide visual — small "wing" particles
    px(PLR_SX - 1, sy - 1, '·', DIM + rgb(180, 220, 255));
    px(PLR_SX + 1, sy - 1, '·', DIM + rgb(180, 220, 255));
  }
}

// ── Entropy Orb — living visualization of game randomness ──
function drawEntropyOrb(frame) {
  const ocx = (W / 2) | 0;
  const ocy = GT + 2;
  const orbChars = '◉◎●○◐◑◒◓★✦✧·∗';
  const intensity = diff * 0.4 + 0.6;
  const baseH = pal.h || 0;

  // Outer ring — rotating particles
  for (let i = 0; i < 10; i++) {
    const angle = frame * 0.045 + (i / 10) * Math.PI * 2;
    const wobble = Math.sin(frame * 0.02 + i * 1.3) * 0.6;
    const r = 2.5 + wobble;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r * 0.45;
    const ci = ((entropy + i * 13 + ((frame/3)|0)) >>> 0) % orbChars.length;
    const hue = (baseH + 270 + frame * 0.8 + i * 36) % 360;
    const lum = (0.35 + Math.sin(frame * 0.06 + i) * 0.15) * intensity;
    px((ocx + dx) | 0, (ocy + dy) | 0, orbChars[ci], hsl(hue, 0.8, lum));
  }

  // Inner ring — counter-rotating
  for (let i = 0; i < 6; i++) {
    const angle = -frame * 0.07 + (i / 6) * Math.PI * 2;
    const r = 1.2;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r * 0.45;
    const hue = (baseH + 270 + frame * 1.2 + i * 60) % 360;
    px((ocx + dx) | 0, (ocy + dy) | 0, '·', hsl(hue, 0.9, 0.5 * intensity));
  }

  // Core — pulsing, morphing
  const corePhase = ((frame / 5) | 0) % 6;
  const coreChar = ['◉','●','◎','⊙','◎','●'][corePhase];
  const corePulse = Math.sin(frame * 0.15) * 0.2 + 0.7;
  const coreHue = (baseH + 270 + frame * 2) % 360;
  px(ocx, ocy, coreChar, hsl(coreHue, 0.95, 0.6 * corePulse));

  // Occasional energy burst
  if (frame % 45 === 0 && state === 'playing') {
    for (let j = 0; j < 4; j++) {
      const [pr, pg, pb] = hslRaw((baseH + 270 + j * 90) % 360, 0.8, 0.55);
      addP(ocx, ocy, 2.5, '✦', pr, pg, pb);
    }
  }

  // Entropy label
  const eStr = `E:${(entropy % 10000).toString(16).padStart(4, '0')}`;
  tx(ocx - 3, ocy + 2, eStr, DIM + hsl(coreHue, 0.4, 0.25));
}

function drawHUD(frame) {
  // Score (prominent)
  const sc = `SCORE ${score}`;
  tx(2, 0, sc, BOLD + rgb(0, 240, 240));

  // Lives as cursor blocks — show all lives (uncapped)
  const liveColor = lives>=3 ? rgb(255,180,40) : lives===2 ? rgb(255,120,20) : rgb(255,255,255);
  const maxShow = Math.max(3, lives);
  const lx = ((W - maxShow * 2 - 2) / 2) | 0;
  for (let i = 0; i < maxShow; i++) {
    tx(lx + i * 2, 0, i < lives ? '█' : '·', i < lives ? liveColor : DIM + rgb(50,50,50));
  }

  // Difficulty badge
  const badge = DIFF[diffLevel].label;
  tx(lx + maxShow * 2 + 1, 0, badge, DIM + rgb(100, 100, 130));

  // Control labels — right side
  tx(W - 22, 0, 'x' + speed.toFixed(1), rgb(140, 140, 160));
  tx(W - 15, 0, muted ? 'M:OFF' : 'M:♪', DIM + rgb(70, 70, 95));
  tx(W - 9, 0, 'P:Pause', DIM + rgb(70, 70, 95));

  // Separator
  for (let x = 0; x < W; x++) px(x, 1, '─', rgb(28, 28, 45));
}

// ═══════════════════════════════════════════════════════════════
//  GAME STATES
// ═══════════════════════════════════════════════════════════════
let state = 'title', stF = 0;
let initials = ['A','A','A'], initialPos = 0;
let musicStarted = false;
function changeState(s) { state = s; stF = 0; }

// ── TITLE ─────────────────────────────────────────────────────
function tickTitle() {
  const text = 'TERMIJUMP';
  const cy = Math.max(2, ((H/2)|0) - 7);

  drawStars(stF, stF * 2);
  drawClouds(stF * 2);

  if (stF === 8 && !musicStarted) { startMusic(); musicStarted = true; }
  if (stF === 1) initLogoStars();

  // Orbiting stars
  if (stF > 10) drawLogoStars((W/2)|0, cy + 5, stF);

  // ── Logo: clean double-height, single-width pixels ──
  const revealed = (stF / 5) | 0;
  const logoW = text.length * 6 - 1;
  const logoX = ((W - logoW) / 2) | 0;
  for (let ci = 0; ci < text.length && ci <= revealed; ci++) {
    const d = FN[text[ci]]; if (!d) continue;
    const age = Math.max(0, revealed - ci);
    const bright = Math.min(1, age * 0.12);
    const t = ci / (text.length - 1 || 1);
    const cx0 = logoX + ci * 6;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (d[r][c] !== '#') continue;
        const rowF = [0.80, 0.92, 1.0, 0.94, 0.82][r];
        const wave = Math.sin(stF * 0.022 + ci * 0.55 + r * 0.3) * 0.06;
        const f = (rowF + wave) * bright;
        const lr = Math.min(255, ((15 + t * 165) * f) | 0);
        const lg = Math.min(255, ((215 - t * 170) * f) | 0);
        const lb = Math.min(255, (255 * f) | 0);
        px(cx0 + c, cy + r * 2, '▀', rgb(lr, lg, lb));
        px(cx0 + c, cy + r * 2 + 1, '█', rgb(lr, lg, lb));
        // Side glow
        const gr = (lr * 0.25) | 0, gg = (lg * 0.25) | 0, gb = (lb * 0.25) | 0;
        if (c === 0) px(cx0 - 1, cy + r * 2 + 1, '░', rgb(gr, gg, gb));
        if (c === 4 || d[r][c + 1] !== '#') px(cx0 + c + 1, cy + r * 2 + 1, '░', rgb(gr, gg, gb));
      }
    }
  }

  // Neon line
  if (stF > 55) {
    const lw = Math.min(W - 10, logoW + 6), lx = ((W - lw) / 2) | 0;
    const a = Math.min(1, (stF - 55) / 15);
    for (let i = 0; i < lw; i++) {
      const t = i / lw, v = (40 * a) | 0;
      px(lx + i, cy + 11, '─', rgb((v * t * .8) | 0, v, (v * (1 - t * .5)) | 0));
    }
  }

  // Tagline
  if (stF > 65) {
    const a = Math.min(1, (stF - 65) / 25);
    cx(cy + 13, 'Terminal Based Games from MindSpark', rgb((180*a)|0, (185*a)|0, (195*a)|0));
    if (stF > 85) {
      const a2 = Math.min(1, (stF - 85) / 30);
      cx(cy + 15, 'Harvested entropy makes the game different every time you play',
        DIM + rgb((90*a2)|0, (100*a2)|0, (120*a2)|0));
    }
  }

  // ── Difficulty selection (clean rendering) ──
  if (stF > 100) {
    const sy = cy + 18;
    cx(sy, 'CHOOSE YOUR FATE', BOLD + rgb(200, 200, 220));
    const opts = [
      { k: '1', n: 'EASY',   c: [0, 255, 180] },
      { k: '2', n: 'BRAVE',  c: [255, 210, 0] },
      { k: '3', n: 'INSANE', c: [255, 50, 50] },
    ];
    const totalW = 38;
    const ox = ((W - totalW) / 2) | 0;
    for (let i = 0; i < 3; i++) {
      const x = ox + i * 14;
      const pulse = Math.sin(stF * .1 + i * 2.1) * .3 + .7;
      const [cr, cg, cb] = opts[i].c;
      tx(x, sy + 2, opts[i].k + ' ', rgb(120, 120, 140));
      tx(x + 2, sy + 2, opts[i].n, BOLD + rgb((cr*pulse)|0, (cg*pulse)|0, (cb*pulse)|0));
    }
  }

  // High scores (per difficulty, show all 3)
  if (stF > 110) {
    const sy = cy + 22;
    for (const dl of ['easy', 'brave', 'insane']) {
      const scores = loadScores(dl);
      if (scores.length > 0) {
        const col = dl === 'easy' ? 0 : dl === 'brave' ? 1 : 2;
        const ox2 = ((W - 42) / 2) | 0 + col * 15;
        tx(ox2, sy, DIFF[dl].label, DIM + rgb(70, 90, 100));
        for (let i = 0; i < Math.min(2, scores.length); i++)
          tx(ox2, sy + 1 + i, `${scores[i].initials} ${scores[i].score}`, DIM + rgb(55, 120, 125));
      }
    }
  }

  drawCR();

  if (stF > 80) {
    if (onePress) { diffLevel = 'easy'; startTransition(); }
    if (twoPress) { diffLevel = 'brave'; startTransition(); }
    if (threePress) { diffLevel = 'insane'; startTransition(); }
  }
}

// ── TRANSITION ────────────────────────────────────────────────
function startTransition() {
  const text = 'TERMIJUMP';
  const cy = Math.max(2, ((H/2)|0)-7);
  const logoW = text.length * 6 - 1;
  const logoX = ((W - logoW) / 2) | 0;
  particles = [];
  for (let ci = 0; ci < text.length; ci++) {
    const d = FN[text[ci]]; if (!d) continue;
    const t = ci / (text.length-1||1);
    const cr = (15+t*165)|0, cg = (215-t*170)|0, cb = 255;
    const cx0 = logoX + ci * 6;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (d[r][c] === '#') {
          addP(cx0+c, cy+r*2, 3.5, '█', cr, cg, cb);
          addP(cx0+c, cy+r*2+1, 3.5, '█', cr, cg, cb);
        }
  }
  initGame();
  changeState('transition');
}

function tickTransition() {
  fbClr();
  drawStars(stF, stF*2);
  if (stF < 48) { updateParticles(); drawParticles(); }
  if (stF >= 22 && stF < 60) {
    const spark = 'MINDSPARK';
    let a; if (stF<38) a=(stF-22)/16; else a=Math.max(0,1-(stF-38)/22);
    const v = (50*a)|0;
    const sy = ((H/2)|0)-2, sp = bigPos(spark);
    for (let ci = 0; ci < spark.length; ci++) {
      const d = FN[spark[ci]]; if (!d) continue;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++)
        if (d[r][c] === '#') px(sp[ci]+c, sy+r, '░', rgb(v, (v*.6)|0, (v*1.3)|0));
    }
    if (stF < 48) drawParticles();
  }
  if (stF >= 52) {
    const progress = Math.min(1, (stF-52)/34), scanX = (progress*W)|0;
    const camX = scrollX|0;
    for (let sx = 0; sx < scanX; sx++) {
      const wx = camX+sx, h = terrain[wx]; if (!h||h<=0) continue;
      const topY = GT+GH-h;
      px(sx, topY, dhash(wx,1)%5===0?'▓':'█', rgb(30,165,35));
      for (let y = topY+1; y < GT+GH; y++) {
        const shade = Math.max(32, 92-(y-topY)*6);
        px(sx, y, '█', rgb(shade, (shade*.5)|0, 10));
      }
    }
    if (scanX > 0 && scanX < W) {
      for (let y = GT; y < GT+GH; y++) {
        px(scanX, y, '│', BOLD+rgb(180,230,255));
        if (scanX>1) px(scanX-1, y, '▌', rgb(80,160,210));
      }
    }
    if (scanX > PLR_SX+PW+2)
      bx(PLR_SX, GT+(py|0), PW, playerH(), '█', rgb(255,230,0));
  }
  drawCR();
  if (stF >= 88) changeState('ready');
}

// ── READY ─────────────────────────────────────────────────────
function tickReady() {
  fbClr();
  const camX = scrollX|0;
  drawStars(stF, scrollX); drawClouds(scrollX);
  drawTerrain(camX); drawPlatforms(camX); drawObstacles(camX);
  drawPowerups(camX, stF); drawEnemies(camX, stF);
  drawPlayer(stF); drawHUD(stF); drawCR();

  // "termi" callout above character
  const psy = GT + (py | 0);
  tx(PLR_SX - 2, psy - 3, 'termi', BOLD + rgb(0, 200, 180));
  px(PLR_SX, psy - 2, '↓', rgb(0, 200, 180));

  const flash = ((stF/12)|0)%2;
  if (flash) {
    const iy = Math.min(GT+3, GT+((GH/4)|0));
    cx(iy, '╔══════════════════════════╗', rgb(200,240,255));
    cx(iy+1, '║     Space = Jump  x5    ║', BOLD+rgb(180,255,220));
    cx(iy+2, '╚══════════════════════════╝', rgb(200,240,255));
  }
  if (spTap) { pvy=JUMP_V; pGnd=false; jumpCount=1; playSound('jump'); changeState('playing'); }
}

// ── PLAYING ───────────────────────────────────────────────────
function tickPlaying() {
  // Pause toggle
  if (pausePress) { paused = !paused; }
  if (resetPress) { initGame(); changeState('title'); return; }
  if (paused) {
    // Draw paused screen over last frame
    const pcy = ((H / 2) | 0) - 1;
    cx(pcy, '╔═══════════════════╗', rgb(0, 200, 220));
    cx(pcy+1, '║    ▶  PAUSED  ◀   ║', BOLD + rgb(0, 255, 220));
    cx(pcy+2, '╚═══════════════════╝', rgb(0, 200, 220));
    cx(pcy+4, 'P to resume · R to restart', DIM + rgb(120, 140, 150));
    drawCR();
    return;
  }
  const dl = DIFF[diffLevel];
  scrollX += speed;
  speed = Math.min(dl.max, speed + dl.acc);
  diff = Math.min(1, score / 5000);
  score = (scrollX * .9) | 0;

  // High score fireworks
  const prevHi = loadScores()[0]?.score || 0;
  if (prevHi > 0 && score > prevHi && !highScoreBeaten) {
    highScoreBeaten = true;
    for (let i = 0; i < 40; i++) {
      const [r,g,b] = [[255,50,50],[50,255,50],[50,100,255],[255,255,50],[255,50,255],
        [50,255,255]][((Math.random()*6)|0)];
      addP(((Math.random()*W)|0), GT+((Math.random()*GH)|0), 4, '✦', r, g, b);
    }
  }

  genAhead(); updatePlayer(); updateEnemies(); updateParticles(); updateTrail();
  updateShootingStars();
  if ((stF&127)===0) cleanWorld();
  for (const pu of powerups) if (pu.alive) pu.frame++;

  fbClr();
  const camX = scrollX|0;
  drawStars(stF, scrollX); drawClouds(scrollX);
  drawCeiling(camX, stF);
  drawTerrain(camX); drawPlatforms(camX); drawObstacles(camX);
  drawPowerups(camX, stF); drawEnemies(camX, stF);
  drawTrail(camX);
  drawPlayer(stF); drawParticles();
  drawFg(scrollX);
  drawEntropyOrb(stF);
  drawHUD(stF); drawCR();

  if (score > 0 && score%500 < 3)
    cx(GT+2, `── ${score} ──`, BOLD+rgb(0, 255, 200));
}

// ── GAME OVER ─────────────────────────────────────────────────
function tickGameover() {
  fbClr();
  drawStars(stF, scrollX);
  if (stF < 8) {
    const v = (255*(1-stF/8))|0;
    for (let x=0;x<W;x++){px(x,0,'▓',rgb(v,0,0));px(x,H-1,'▓',rgb(v,0,0));}
    for (let y=0;y<H;y++){px(0,y,'▓',rgb(v,0,0));px(W-1,y,'▓',rgb(v,0,0));}
  }
  updateParticles(); drawParticles();
  const cy = Math.max(2, ((H/2)|0)-6);
  if (stF > 15) {
    const pulse = Math.sin(stF*.06)*.15+.85;
    bigText('GAME OVER', cy, () => {
      const v=(220*pulse)|0; return rgb(v,(v*.2)|0,(v*.15)|0);
    });
  }
  if (stF > 35) cx(cy+7, `SCORE: ${score}`, BOLD+rgb(0,230,230));
  if (stF > 55) {
    if (isHighScore(score)) {
      const nf = ((stF/6)|0)%2;
      cx(cy+9, '★ NEW HIGH SCORE ★', nf?BOLD+rgb(255,255,0):BOLD+rgb(255,150,0));
      cx(cy+11, '▸ Press SPACE / ENTER to Enter Initials ◂', BOLD+rgb(0,200,150));
    } else {
      const pulse = Math.sin(stF*.1)*.5+.5;
      cx(cy+9, '▸ Press SPACE / ENTER to Retry ◂', BOLD+rgb(0, (130+125*pulse)|0, (100+100*pulse)|0));
    }
    cx(cy+11 + (isHighScore(score)?2:2), 'R = Title Screen', DIM+rgb(100,110,120));
  }
  drawMute(); drawCR();
  if (resetPress && stF > 40) { changeState('title'); return; }
  if ((spTap || enterPress || onePress) && stF > 40) {
    if (isHighScore(score)) { initials=['A','A','A']; initialPos=0; changeState('initials'); }
    else startTransition();
  }
}

// ── INITIALS ENTRY (fixed) ────────────────────────────────────
function tickInitials() {
  fbClr();
  drawStars(stF, scrollX);
  const cy = Math.max(2, ((H/2)|0)-5);
  cx(cy, 'ENTER YOUR INITIALS', BOLD+rgb(0, 230, 200));
  cx(cy+2, `SCORE: ${score}`, rgb(0,220,230));

  // Process letters from buffer
  for (const ch of letterBuf) {
    if (ch >= 'A' && ch <= 'Z') {
      initials[initialPos] = ch;
      if (initialPos < 2) initialPos++;
    }
  }
  // Backspace via flag
  if (backPress && initialPos > 0) initialPos--;
  // Enter via flag
  if (enterPress) {
    saveScoreEntry(initials.join(''), score);
    changeState('scoreboard');
    return;
  }

  // Draw boxes
  const bx0 = ((W - 17) / 2) | 0;
  for (let i = 0; i < 3; i++) {
    const ix = bx0 + i * 6;
    const active = i === initialPos;
    const style = active ?
      (((stF/8)|0)%2 ? BOLD+rgb(0,255,220) : BOLD+rgb(0,200,180)) :
      rgb(180,190,200);
    tx(ix, cy+5, '┌────┐', style);
    tx(ix, cy+6, '│ ' + initials[i] + '  │', style);
    tx(ix, cy+7, '└────┘', style);
    if (active) px(ix+2, cy+8, '▲', rgb(0,255,200));
  }

  cx(cy+11, 'Type letters · BACKSPACE to go back', DIM+rgb(120,130,140));
  cx(cy+12, 'Press ENTER to confirm', rgb(0,200,160));
  drawMute(); drawCR();
}

// ── SCOREBOARD ────────────────────────────────────────────────
function tickScoreboard() {
  fbClr();
  drawStars(stF, scrollX);
  const cy = Math.max(1, ((H/2)|0)-8);
  cx(cy, '── HIGH SCORES ──', BOLD+rgb(0,230,200));
  const scores = loadScores();
  for (let i = 0; i < Math.min(10, scores.length); i++) {
    const s = scores[i];
    const isNew = s.initials === initials.join('') && s.score === score;
    const rank = `${(i+1+'').padStart(2)}. ${s.initials}  ${(s.score+'').padStart(6)}`;
    cx(cy+2+i, rank, isNew ?
      (((stF/6)|0)%2 ? BOLD+rgb(0,255,220) : BOLD+rgb(0,200,180)) :
      rgb(80,180,185));
  }
  if (stF > 30) {
    const pulse = Math.sin(stF*.1)*.5+.5;
    cx(cy+14, '▸ Press SPACE / ENTER to Play Again ◂', BOLD+rgb(0,(130+125*pulse)|0,(100+100*pulse)|0));
    cx(cy+16, 'R = Title Screen', DIM+rgb(100,110,120));
  }
  drawMute(); drawCR();
  if (resetPress && stF > 20) { changeState('title'); return; }
  if ((spTap || enterPress || onePress) && stF > 20) startTransition();
}

// ═══════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════
let loopTimer = null;
function tick() {
  procInput();
  if (W < 50 || H < 12) {
    stdout.write(HOME+CLR+'Please resize terminal to at least 50x12\r\n'); return;
  }
  if (!fC.length || fC.length !== H || (fC[0] && fC[0].length !== W)) dims();
  fbClr();
  switch (state) {
    case 'title':      tickTitle(); break;
    case 'transition': tickTransition(); break;
    case 'ready':      tickReady(); break;
    case 'playing':    tickPlaying(); break;
    case 'gameover':   tickGameover(); break;
    case 'initials':   tickInitials(); break;
    case 'scoreboard': tickScoreboard(); break;
  }
  if (invertTimer > 0) invertTimer--;
  flush(); stF++;
}

// ═══════════════════════════════════════════════════════════════
//  CLEANUP & ENTRY
// ═══════════════════════════════════════════════════════════════
function cleanup(code) {
  if (loopTimer) clearInterval(loopTimer);
  stopMusic();
  stdout.write(RST+SHOW+CLR+HOME);
  stdout.write('Thanks for playing TERMIJUMP!\r\n');
  stdout.write(DIM+'✦ MindSpark — Terminal Based Games\r\n'+RST);
  const scores = loadScores();
  if (scores.length > 0) stdout.write(`High Score (${diffLevel}): ${scores[0].initials} ${scores[0].score}\r\n`);
  process.exit(code || 0);
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('uncaughtException', (err) => {
  stopMusic();
  stdout.write(RST+SHOW+'\r\n');
  console.error(err);
  process.exit(1);
});

stdout.on('resize', () => {
  dims(); initStars(); initClouds(); initFg();
  if (py > GH - 2) py = GH - 2;
});

// Boot
dims(); fbAlloc(); genPalette(); initStars(); initClouds(); initFg();
genSfx(); setupInput();
stdout.write(CLR + HIDE);
changeState('title');
loopTimer = setInterval(tick, TICK);

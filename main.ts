// THE WORLD IN ONE PICTURE — Friday 20 November 2026.
// A deterministic newspaper front page drawn entirely in code.
// Node 22+ stdlib only. Writes $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png).
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  const crcBuf = Buffer.concat([Buffer.from(type, "ascii"), data]);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
}
function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0; // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * w * 3, w * 3).copy(raw, y * (1 + w * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- 5x7 bitmap font
// Every glyph is 7 rows of 5 cells; '#' is ink, '.' is blank.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01000", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "11110", "10001", "10001", "11110", "10000", "10000"],
  q: ["00000", "01111", "10001", "10001", "01111", "00001", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11110", "01000", "01000", "01000", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "11011", "10001"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [247, 242, 231];
const INK: [number, number, number] = [24, 22, 20];
const RED: [number, number, number] = [163, 59, 46];
const BLUE: [number, number, number] = [43, 74, 122];
const GREY: [number, number, number] = [110, 104, 92];
const LIGHT: [number, number, number] = [233, 226, 210];
type RGB = [number, number, number];

const px = new Uint8Array(W * H * 3);
function fillAll(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) setPx(xx, yy, c);
}
function hline(x0: number, x1: number, y: number, c: RGB, th = 1): void {
  for (let t = 0; t < th; t++) for (let x = x0; x <= x1; x++) setPx(x, y + t, c);
}
function vline(x: number, y0: number, y1: number, c: RGB, th = 1): void {
  for (let t = 0; t < th; t++) for (let y = y0; y <= y1; y++) setPx(x + t, y, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function polyline(pts: [number, number][], c: RGB): void {
  for (let i = 0; i + 1 < pts.length; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
}
function fillPoly(pts: [number, number][], c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, minY); y <= Math.min(H - 1, maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(Math.round(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = xs[k]; x <= xs[k + 1]; x++) setPx(x, y, c);
  }
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) setPx(cx + x, cy + y, c);
}
function ring(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    setPx(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
// Quadratic bezier sampled as a dashed trail.
function bezierTrail(p0: [number, number], p1: [number, number], p2: [number, number], c: RGB): void {
  let prev: [number, number] | null = null;
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const x = Math.round((1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]);
    const y = Math.round((1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]);
    if (prev && i % 3 !== 0) line(prev[0], prev[1], x, y, c);
    prev = [x, y];
  }
}
function burst(cx: number, cy: number, r: number, c: RGB): void {
  // Spiky explosion: 12 rays plus a filled core.
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const rr = k % 2 === 0 ? r : Math.round(r * 0.55);
    line(cx, cy, Math.round(cx + rr * Math.cos(a)), Math.round(cy + rr * Math.sin(a)), c);
  }
  disc(cx, cy, Math.max(2, Math.round(r * 0.3)), c);
}
function star4(cx: number, cy: number, r: number, c: RGB): void {
  // Four-point NATO-style compass star.
  const pts: [number, number][] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2;
    const rr = k % 2 === 0 ? r : Math.round(r * 0.28);
    pts.push([Math.round(cx + rr * Math.cos(a)), Math.round(cy + rr * Math.sin(a))]);
  }
  fillPoly(pts, c);
}

// ---------------------------------------------------------------- text
function glyphWidth(scale: number): number {
  return 6 * scale;
}
function textWidth(s: string, scale: number): number {
  return s.length * glyphWidth(scale) - scale;
}
function drawGlyph(x: number, y: number, ch: string, scale: number, c: RGB, bold: boolean): void {
  const g = FONT[ch];
  if (!g) return;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (g[row][col] === "1") {
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            setPx(x + col * scale + dx, y + row * scale + dy, c);
            if (bold) setPx(x + col * scale + dx + 1, y + row * scale + dy, c);
          }
      }
    }
  }
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB, bold = false): number {
  let cx = x;
  for (const ch of s) {
    drawGlyph(cx, y, ch, scale, c, bold);
    cx += glyphWidth(scale);
  }
  return cx;
}
function drawCentred(cx: number, y: number, s: string, scale: number, c: RGB, bold = false): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c, bold);
}
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawBlock(
  x: number,
  y: number,
  s: string,
  maxW: number,
  scale: number,
  c: RGB,
  lineH: number,
  bold = false,
): number {
  const lines = wrap(s, maxW, scale);
  let yy = y;
  for (const ln of lines) {
    drawText(x, yy, ln, scale, c, bold);
    yy += lineH;
  }
  return yy;
}
function drawCentredBlock(
  cx: number,
  y: number,
  s: string,
  maxW: number,
  scale: number,
  c: RGB,
  lineH: number,
  bold = false,
): number {
  const lines = wrap(s, maxW, scale);
  let yy = y;
  for (const ln of lines) {
    drawCentred(cx, yy, ln, scale, c, bold);
    yy += lineH;
  }
  return yy;
}

// ---------------------------------------------------------------- illustrations
function drawLeadMap(x0: number, y0: number, x1: number, y1: number): void {
  // Frame.
  rect(x0, y0, x1 - x0, 2, INK);
  rect(x0, y1 - 2, x1 - x0, 2, INK);
  rect(x0, y0, 2, y1 - y0, INK);
  rect(x1 - 2, y0, 2, y1 - y0, INK);
  // Land shapes (stylised outlines of Poland, left, and Ukraine, right).
  const poland: [number, number][] = [
    [650, 215], [705, 195], [745, 210], [740, 255], [700, 295], [655, 285], [630, 245],
  ];
  const ukraine: [number, number][] = [
    [760, 225], [905, 205], [965, 245], [955, 330], [890, 385], [805, 365], [745, 305],
  ];
  fillPoly(poland, LIGHT);
  fillPoly(ukraine, LIGHT);
  polyline([...poland, poland[0]], INK);
  polyline([...ukraine, ukraine[0]], INK);
  // NATO compass star over Poland.
  star4(688, 232, 14, BLUE);
  // Missile trails arcing in from the east, with impact bursts.
  bezierTrail([975, 230], [880, 180], [718, 236], RED);
  bezierTrail([970, 290], [900, 250], [830, 310], RED);
  bezierTrail([960, 350], [880, 330], [770, 344], RED);
  burst(715, 238, 12, RED);
  burst(828, 312, 10, RED);
  burst(768, 346, 9, RED);
  // Labels.
  drawText(886, 176, "RUSSIA", 2, GREY, true);
  drawText(640, 316, "POLAND", 2, INK, true);
  drawText(795, 402, "UKRAINE", 2, INK, true);
  drawText(828, 430, "BLACK SEA", 2, GREY, true);
  drawCentred(784, 466, "MISSILES CROSSED INTO POLAND", 2, RED, true);
}

function drawCourthouse(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHT);
  const cx = x + Math.floor(w / 2);
  const top = y + 8;
  const base = y + h - 10;
  // Pediment.
  polyline([[cx - 52, top + 16], [cx, top], [cx + 52, top + 16]], INK);
  hline(cx - 52, cx + 52, top + 16, INK, 2);
  // Columns.
  for (const dx of [-36, -12, 12, 36]) vline(cx + dx, top + 20, base - 4, INK, 3);
  hline(cx - 52, cx + 52, base, INK, 2);
  hline(cx - 58, cx + 58, base + 5, INK, 2);
  // Scales of justice mark on the pediment.
  disc(cx, top + 9, 3, RED);
}

function drawChart(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHT);
  // Gridlines.
  for (let gy = y + 12; gy < y + h - 6; gy += 12) hline(x + 8, x + w - 8, gy, [210, 202, 184]);
  // Falling line.
  const pts: [number, number][] = [
    [x + 12, y + 12], [x + 52, y + 20], [x + 92, y + 15], [x + 132, y + 32],
    [x + 172, y + 26], [x + 212, y + 44], [x + w - 14, y + 48],
  ];
  for (let i = 0; i + 1 < pts.length; i++) {
    line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], RED);
    line(pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, RED);
  }
  // Arrowhead at the end.
  const [ax, ay] = pts[pts.length - 1];
  line(ax, ay, ax - 12, ay - 3, RED);
  line(ax, ay, ax - 4, ay - 11, RED);
  // Axis.
  hline(x + 8, x + w - 8, y + h - 8, INK, 2);
}

function drawGlobe(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHT);
  const cx = x + Math.floor(w / 2) - 40;
  const cy = y + Math.floor(h / 2);
  const r = 22;
  ring(cx, cy, r, INK);
  ring(cx, cy, r, BLUE);
  // Meridians and equator.
  for (let a = 0; a < 180; a += 6) {
    const t = (a * Math.PI) / 180;
    setPx(Math.round(cx + r * 0.45 * Math.cos(t)), Math.round(cy + r * Math.sin(t)), INK);
    setPx(Math.round(cx - r * 0.45 * Math.cos(t)), Math.round(cy + r * Math.sin(t)), INK);
  }
  hline(cx - r, cx + r, cy, INK);
  // Hot sun, top right.
  const sx = x + w - 42;
  const sy = y + 14;
  disc(sx, sy, 7, RED);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    line(sx + Math.round(10 * Math.cos(a)), sy + Math.round(10 * Math.sin(a)),
      sx + Math.round(14 * Math.cos(a)), sy + Math.round(14 * Math.sin(a)), RED);
  }
  drawText(x + w - 96, y + h - 18, "NO DEAL", 2, RED, true);
}

function drawQuake(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHT);
  const base = y + h - 8;
  // Andes peaks.
  polyline([[x + 10, base], [x + 60, y + 10], [x + 105, base]], INK);
  polyline([[x + 80, base], [x + 140, y + 18], [x + 195, base]], INK);
  polyline([[x + 170, base], [x + 215, y + 24], [x + w - 10, base]], INK);
  hline(x + 8, x + w - 8, base, INK, 2);
  // Snow caps.
  disc(x + 60, y + 14, 4, PAPER);
  disc(x + 140, y + 22, 3, PAPER);
  // Crack down the middle peak.
  polyline(
    [[x + 140, y + 24], [x + 134, y + 30], [x + 142, y + 36], [x + 136, y + 42]],
    RED,
  );
  disc(x + 136, y + 46, 2, RED);
}

function drawFlags(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, LIGHT);
  const top = y + 10;
  const flagW = 52;
  const flagH = 26;
  const gap = 18;
  const startX = x + Math.floor((w - (3 * flagW + 2 * gap)) / 2);
  // Poles.
  for (let k = 0; k < 3; k++) vline(startX + k * (flagW + gap), top - 4, y + h - 8, INK, 2);
  // US flag: stripes.
  const ux = startX;
  for (let s = 0; s < 5; s++) rect(ux, top + s * 5, flagW, 3, s % 2 === 0 ? RED : PAPER);
  rect(ux, top, 22, 12, BLUE);
  // China flag: red field, yellow star.
  const cx = startX + flagW + gap;
  rect(cx, top, flagW, flagH, RED);
  star4(cx + 12, top + 9, 5, [240, 200, 60]);
  // Russia flag: white / blue / red bands.
  const rx = startX + 2 * (flagW + gap);
  rect(rx, top, flagW, 9, PAPER);
  rect(rx, top + 9, flagW, 9, BLUE);
  rect(rx, top + 18, flagW, 8, RED);
  // Handshake line under the flags.
  hline(startX, startX + 3 * flagW + 2 * gap, y + h - 12, INK, 2);
}

// ---------------------------------------------------------------- page
const LEAD_HEAD = "MISSILES LAND IN POLAND AS RUSSIA POUNDS UKRAINE";
const LEAD_BODY =
  "Russia fired more than 400 drones and 110 missiles at Ukraine overnight — at least 8 killed, nearly 30 injured. " +
  "The power grid was hit and nuclear plants cut output. Two Russian missiles and a suspected drone came down in Poland, " +
  "with no casualties. Poland called it a deliberate provocation; NATO chief Mark Rutte called it a " +
  "'grave violation' and scrambled jets.";

interface Secondary {
  head: string;
  body: string;
  draw: (x: number, y: number, w: number, h: number) => void;
}
const SECONDARIES: Secondary[] = [
  {
    head: "MYANMAR CALLS GENOCIDE VERDICT 'NOT FAIR'",
    body: "The world court ruled Myanmar committed genocide against the Rohingya. Myanmar rejected the verdict; refugees welcomed it.",
    draw: drawCourthouse,
  },
  {
    head: "AI ROUT: S&P 500 IN CORRECTION",
    body: "US stocks fell hard on Friday. The S&P 500 dropped 3.7% to 6,910, now 10% below its October peak. The Nasdaq fell 5.28%. Nvidia tumbled 13.8%.",
    draw: drawChart,
  },
  {
    head: "COP31 ENDS WITHOUT FOSSIL-FUEL DEAL",
    body: "Climate talks wrapped up with near-final texts dropping the fossil-fuel transition, drawing outrage from Pacific nations facing rising seas.",
    draw: drawGlobe,
  },
  {
    head: "STRONG QUAKE SHAKES PERU",
    body: "A magnitude 6.7 earthquake struck the Andes of central Peru, in the Junin region.",
    draw: drawQuake,
  },
  {
    head: "TRUMP DEFENDS TIES AFTER SUMMIT",
    body: "After the first-ever trilateral summit with Xi Jinping and Vladimir Putin in Shenzhen, Donald Trump defended his ties to both leaders. Their four-point 'peace declaration' said nothing about Ukraine or the war with Iran.",
    draw: drawFlags,
  },
];

function drawSecondaryBox(x: number, y: number, w: number, h: number, s: Secondary): void {
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
  const pad = 12;
  const ix = x + pad;
  const iw = w - pad * 2;
  const ih = 56;
  s.draw(ix, y + 10, iw, ih);
  let yy = y + 10 + ih + 10;
  yy = drawBlock(ix, yy, s.head, iw, 2, INK, 16, true);
  yy += 6;
  drawBlock(ix, yy, s.body, iw, 2, INK, 15);
}

function main(): void {
  fillAll(PAPER);

  // Masthead.
  drawCentred(512, 34, "THE WORLD IN ONE PICTURE", 5, INK, true);
  drawCentred(512, 86, "FRIDAY 20 NOVEMBER 2026", 3, RED, true);
  hline(36, 988, 122, INK, 3);
  hline(36, 988, 129, INK, 1);

  // Lead story, left column.
  drawBlock(36, 156, LEAD_HEAD, 524, 4, INK, 34, true);
  drawBlock(36, 272, LEAD_BODY, 524, 2, INK, 17);
  hline(36, 560, 446, RED, 2);
  drawText(36, 458, "400+ DRONES - 110 MISSILES - 8 KILLED", 2, RED, true);
  drawText(36, 478, "30 INJURED - NONE HURT IN POLAND", 2, RED, true);

  // Lead illustration, right column.
  drawLeadMap(580, 156, 988, 500);

  // Divider.
  hline(36, 988, 516, INK, 2);

  // Secondary stories: three across, then two across.
  const rowA = 530;
  const rowB = 762;
  drawSecondaryBox(36, rowA, 306, 220, SECONDARIES[0]);
  drawSecondaryBox(359, rowA, 306, 220, SECONDARIES[1]);
  drawSecondaryBox(682, rowA, 306, 220, SECONDARIES[2]);
  drawSecondaryBox(36, rowB, 468, 224, SECONDARIES[3]);
  drawSecondaryBox(520, rowB, 468, 224, SECONDARIES[4]);

  // Footer.
  drawCentred(512, 994, "THE WORLD IN ONE PICTURE", 2, GREY);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output/entry.png";
  const outPath = outDir.endsWith(".png") ? outDir : path.join(outDir, "entry.png");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, encodePng(W, H, px));
}

main();


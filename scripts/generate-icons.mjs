#!/usr/bin/env node
// Générateur d icônes PWA BudgetGwen — pur node, zéro dépendance.
//   node scripts/generate-icons.mjs
// Le dépôt ne contient AUCUN binaire : les PNG naissent ici, au build
// (npm run build), de façon déterministe (aucun aléa). L art : une pièce
// terracotta frappée d un euro crème, sur fond crème — la charte de l app.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

// Charte (src/App.css) : crème, terracotta, sauge.
const BG = [250, 245, 238];      // #faf5ee fond
const COIN = [201, 95, 63];      // #c95f3f pièce terracotta
const COIN_DEEP = [168, 74, 46]; // #a84a2e liseré de la pièce
const MARK = [250, 245, 238];    // l euro, frappé en creux crème

// Table CRC32 (PNG impose un CRC par morceau).
const CRC_TABLE = (() => {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Un morceau PNG : longueur, type, données, CRC.
const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

// PNG RGBA 8 bits, filtre « none » ligne à ligne, compression niveau 9.
const encodePng = (width, height, rgba) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // profondeur : 8 bits par canal
  ihdr[9] = 6;  // type couleur : RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// Classification d un point (u, v) centrés, en fractions du rayon de la
// pièce. Rendu booléen : le lissage vient du suréchantillonnage en aval.
// L euro : un anneau ouvert à droite (le C), barré de deux traits
// horizontaux qui débordent par l ouverture.
const classify = (u, v, R) => {
  const d = Math.hypot(u, v);
  if (d >= R) return 'bg';
  if (d >= R * 0.95) return 'coinDeep';
  const inRing = d >= R * 0.42 && d <= R * 0.72;
  const gap = u > R * 0.22 && Math.abs(v) < R * 0.46;
  if (inRing && !gap) return 'mark';
  const bar1 = v >= -R * 0.06 && v <= R * 0.06;
  const bar2 = v >= R * 0.18 && v <= R * 0.30;
  if ((bar1 || bar2) && u >= -R * 0.74 && u <= R * 0.62) return 'mark';
  return 'coin';
};

// Rendu 4x suréchantillonné puis moyenné : des bords doux, sans librairie.
const renderIcon = (size, coinRatio) => {
  const SS = 4;
  const N = size * SS;
  const rgba = Buffer.alloc(size * size * 4);
  const palette = { bg: BG, coin: COIN, coinDeep: COIN_DEEP, mark: MARK };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx, py = y * SS + sy;
          const u = (px + 0.5) / N - 0.5;
          const v = (py + 0.5) / N - 0.5;
          const c = palette[classify(u, v, coinRatio)];
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
        }
      }
      const k = SS * SS, o = (y * size + x) * 4;
      rgba[o] = Math.round(acc[0] / k);
      rgba[o + 1] = Math.round(acc[1] / k);
      rgba[o + 2] = Math.round(acc[2] / k);
      rgba[o + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
};

// « any » : la pièce occasse 40 % du carré ; « maskable » : 34 %, pour
// rester dans la zone sûre (cercle des 80 %) que les lanceurs découpent.
fs.mkdirSync(OUT_DIR, { recursive: true });
const ICONS = [
  { file: 'icon-192.png', size: 192, coinRatio: 0.40 },
  { file: 'icon-512.png', size: 512, coinRatio: 0.40 },
  { file: 'icon-maskable-512.png', size: 512, coinRatio: 0.34 },
];
for (const icon of ICONS) {
  fs.writeFileSync(path.join(OUT_DIR, icon.file), renderIcon(icon.size, icon.coinRatio));
  console.log('icône écrite : public/icons/' + icon.file + ' (' + icon.size + 'x' + icon.size + ')');
}

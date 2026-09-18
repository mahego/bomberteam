import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate pure PNG buffer using zlib
function createPngBuffer(size, isMaskable = false) {
  const width = size;
  const height = size;
  
  // Row filter 0 (None) + 4 bytes per pixel (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = size * (isMaskable ? 0.48 : 0.44);
  const innerRadius = radius * 0.88;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Outer glowing rim
        const rimRatio = Math.max(0, (dist - innerRadius) / (radius - innerRadius));
        if (rimRatio > 0) {
          // Neon violet / cyan gradient
          const angle = Math.atan2(dy, dx);
          const t = (Math.sin(angle * 2) + 1) / 2;
          const r = Math.round(99 * (1 - t) + 245 * t);
          const g = Math.round(102 * (1 - t) + 158 * t);
          const b = Math.round(241 * (1 - t) + 11 * t);
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        } else {
          // Dark metallic core with bomb blast gradient
          const coreDist = dist / innerRadius;
          const r = Math.round(15 + (1 - coreDist) * 80);
          const g = Math.round(23 + (1 - coreDist) * 30);
          const b = Math.round(42 + (1 - coreDist) * 60);
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }

        // Add a stylized center spark / bomb fuse highlight
        const bombBodyDist = Math.sqrt(dx * dx + (dy - size * 0.04) * (dy - size * 0.04));
        if (bombBodyDist < size * 0.24) {
          // Intense bomb sphere
          rawData[pixelOffset] = 239;
          rawData[pixelOffset + 1] = 68;
          rawData[pixelOffset + 2] = 68;
          rawData[pixelOffset + 3] = 255;
        }
        // Spark on top
        const sparkDist = Math.sqrt((dx - size * 0.12) * (dx - size * 0.12) + (dy + size * 0.18) * (dy + size * 0.18));
        if (sparkDist < size * 0.08) {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 230;
          rawData[pixelOffset + 2] = 50;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        if (isMaskable) {
          // Background for maskable icon
          rawData[pixelOffset] = 9;
          rawData[pixelOffset + 1] = 13;
          rawData[pixelOffset + 2] = 22;
          rawData[pixelOffset + 3] = 255;
        } else {
          // Transparent outside circle
          rawData[pixelOffset] = 0;
          rawData[pixelOffset + 1] = 0;
          rawData[pixelOffset + 2] = 0;
          rawData[pixelOffset + 3] = 0;
        }
      }
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);

  // Helper for CRC32
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Write PNG icons
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPngBuffer(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPngBuffer(512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPngBuffer(512, true));

// Create SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090d16" />
    </radialGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bg)" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="url(#glow)" stroke-width="16" opacity="0.8" />
  <text x="256" y="320" font-size="200" text-anchor="middle" dominant-baseline="central">💣</text>
  <text x="350" y="160" font-size="70" text-anchor="middle">✨</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
console.log('PWA icons created successfully in public/icons/');

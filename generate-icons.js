// Generate professional Fleavi extension icons
// Run: node generate-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  ihdrData[9] = 6;  // RGBA
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      const px = x / (width - 1);
      const py = y / (height - 1);
      const [r, g, b, a] = drawFn(px, py, width, height);
      rawData.push(r, g, b, a);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Rounded rectangle SDF
function roundedRectSDF(px, py, x, y, w, h, r) {
  const dx = Math.max(x - px, 0, px - (x + w));
  const dy = Math.max(y - py, 0, py - (y + h));
  if (dx === 0 && dy === 0) return 0;
  return Math.sqrt(dx * dx + dy * dy) - r;
}

// Check if point is inside a rounded rectangle
function inRoundedRect(px, py, rx, ry, rw, rh, radius) {
  const dx = Math.max(rx - px, 0, px - (rx + rw));
  const dy = Math.max(ry - py, 0, py - (ry + rh));
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

// Draw the "F" letter
function inF(px, py) {
  // Top bar
  if (py > 0.22 && py < 0.33 && px > 0.25 && px < 0.78) return true;
  // Left vertical stem
  if (py > 0.22 && py < 0.78 && px > 0.25 && px < 0.38) return true;
  // Middle bar
  if (py > 0.42 && py < 0.53 && px > 0.25 && px < 0.65) return true;
  return false;
}

// Lightning bolt accent (small, in top-right)
function inBolt(px, py) {
  // Small lightning bolt shape
  const cx = 0.82, cy = 0.18;
  const dx = px - cx, dy = py - cy;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist > 0.12) return false;

  // Triangle-ish bolt
  if (py > 0.10 && py < 0.28) {
    if (px > 0.75 && px < 0.92) {
      if (py < 0.18) return px > 0.82 - (0.18 - py) * 0.5;
      if (py < 0.22) return true;
      return px < 0.82 + (py - 0.22) * 0.5;
    }
  }
  return false;
}

// Main icon drawing function
function drawIcon(px, py, w, h) {
  // Colors
  const BG_R = 108, BG_G = 92, BG_B = 231; // #6C5CE7
  const ACCENT_R = 0, ACCENT_G = 184, ACCENT_B = 148; // #00B894

  // Rounded rectangle background
  const cornerRadius = 0.18;
  if (!inRoundedRect(px, py, 0, 0, 1, 1, cornerRadius)) {
    return [0, 0, 0, 0]; // transparent
  }

  // Anti-aliasing at edges
  const dist = roundedRectSDF(px, py, 0, 0, 1, 1, cornerRadius);
  const alpha = Math.min(1, Math.max(0, -dist * w * 0.5 + 1));

  // Check if inside F letter
  const isF = inF(px, py);

  // Check if inside bolt accent
  const isBolt = inBolt(px, py);

  if (isF) {
    return [255, 255, 255, Math.round(255 * alpha)];
  }

  if (isBolt) {
    return [ACCENT_R, ACCENT_G, ACCENT_B, Math.round(255 * alpha)];
  }

  // Background with subtle gradient
  const gradient = 1 - py * 0.15;
  return [
    Math.round(BG_R * gradient),
    Math.round(BG_G * gradient),
    Math.round(BG_B * gradient),
    Math.round(255 * alpha)
  ];
}

// Generate all sizes
const sizes = [16, 48, 128];
const iconDir = path.join(__dirname, 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

sizes.forEach(size => {
  const png = createPNG(size, size, drawIcon);
  const filePath = path.join(iconDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes, ${size}x${size})`);
});

// Also create a social preview image (1200x630)
const socialPng = createPNG(1200, 630, (px, py, w, h) => {
  // Dark background
  const bgR = 26, bgG = 26, bgB = 46; // #1A1A2E

  // Center icon area
  const iconSize = 0.35;
  const iconX = 0.325, iconY = 0.2;
  const inIcon = inRoundedRect(px - iconX, py - iconY, 0, 0, iconSize, iconSize, 0.12);

  if (inIcon) {
    const localPx = (px - iconX) / iconSize;
    const localPy = (py - iconY) / iconSize;
    if (inF(localPx, localPy)) return [255, 255, 255, 255];
    return [108, 92, 231, 255];
  }

  // Text area - "Fleavi" title
  // Simple horizontal lines to simulate text
  if (py > 0.35 && py < 0.55) {
    if (px > 0.325 && px < 0.75) {
      // Title area - slight purple tint
      return [40, 40, 70, 255];
    }
  }
  if (py > 0.6 && py < 0.75) {
    if (px > 0.325 && px < 0.65) {
      return [60, 60, 90, 255];
    }
  }

  return [bgR, bgG, bgB, 255];
});

fs.writeFileSync(path.join(iconDir, 'social-preview.png'), socialPng);
console.log(`Created social-preview.png (${socialPng.length} bytes, 1200x630)`);

console.log('\nDone! All icons generated.');

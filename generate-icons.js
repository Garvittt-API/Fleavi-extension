// Generate placeholder PNG icons for SnapSum extension
// Run: node generate-icons.js
const fs = require('fs');
const path = require('path');

// Minimal PNG generator (no dependencies)
function createPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk - raw image data with zlib
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < width; x++) {
      // Draw a simple lightning bolt / "S" shape on purple background
      const cx = x / width;
      const cy = y / height;

      // Background: #6C5CE7
      let pr = r, pg = g, pb = b;

      // Draw "S" letter in white
      const inS = (
        // Top horizontal bar
        (cy > 0.15 && cy < 0.25 && cx > 0.2 && cx < 0.8) ||
        // Top-left vertical
        (cy > 0.15 && cy < 0.5 && cx > 0.2 && cx < 0.35) ||
        // Middle horizontal bar
        (cy > 0.42 && cy < 0.58 && cx > 0.2 && cx < 0.8) ||
        // Bottom-right vertical
        (cy > 0.5 && cy < 0.85 && cx > 0.65 && cx < 0.8) ||
        // Bottom horizontal bar
        (cy > 0.75 && cy < 0.85 && cx > 0.2 && cx < 0.8)
      );

      if (inS) {
        pr = 255; pg = 255; pb = 255; // white
      }

      rawData.push(pr, pg, pb);
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
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

// Generate icons
const sizes = [16, 48, 128];
const iconDir = path.join(__dirname, 'public', 'icons');

sizes.forEach(size => {
  const png = createPNG(size, size, 108, 92, 231); // #6C5CE7
  const filePath = path.join(iconDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Created ${filePath} (${png.length} bytes)`);
});

console.log('Done! Icons generated.');

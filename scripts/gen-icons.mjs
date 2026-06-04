import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const OUT = resolve("src/assets/icons");
mkdirSync(OUT, { recursive: true });

function makePng(size) {
  // Build a simple solid-circle icon RGBA buffer
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;
  const outerRim = size * 0.46;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= r) {
        // Aubergine
        raw[p++] = 44;  raw[p++] = 0;  raw[p++] = 30;  raw[p++] = 255;
      } else if (d <= outerRim) {
        // Orange ring
        raw[p++] = 233; raw[p++] = 84; raw[p++] = 32; raw[p++] = 255;
      } else {
        raw[p++] = 0; raw[p++] = 0; raw[p++] = 0; raw[p++] = 0;
      }
    }
  }
  // Build IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const idat = deflateSync(raw);
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunks = [sig, ck("IHDR", ihdr), ck("IDAT", idat), ck("IEND", Buffer.alloc(0))];
  return Buffer.concat(chunks);
}

function ck(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([t, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return ~c;
}

for (const sz of [16, 32, 48, 96, 128]) {
  const buf = makePng(sz);
  const path = resolve(OUT, `${sz}.png`);
  writeFileSync(path, buf);
  // Verify by parsing the header dimension
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log(`wrote ${sz}.png → ${w}x${h}, ${buf.length} bytes`);
}

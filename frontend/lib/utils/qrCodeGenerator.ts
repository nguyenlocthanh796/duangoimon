/**
 * 👑 Pure TypeScript QR Code Matrix Generator
 * Self-contained, zero-dependency, offline-first EMVCo / Napas247 QR Code Engine.
 */

// GF(256) Math
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = val;
    GF256_EXP[i + 255] = val;
    GF256_LOG[val] = i;
    val <<= 1;
    if (val & 256) val ^= 0x11d;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMul(poly[j], GF256_EXP[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCompute(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = rsGeneratorPoly(eccCount);
  const result = new Uint8Array(eccCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ result[0];
    result.copyWithin(0, 1);
    result[eccCount - 1] = 0;
    for (let j = 0; j < eccCount; j++) {
      result[j] ^= gfMul(gen[j], factor);
    }
  }
  return result;
}

// QR Code Specifications (Versions 1-10, Error Correction Level L)
interface VersionInfo {
  version: number;
  totalBytes: number;
  dataBytes: number;
  eccBytes: number;
  alignCoords: number[];
}

const VERSIONS_L: VersionInfo[] = [
  { version: 1, totalBytes: 26, dataBytes: 19, eccBytes: 7, alignCoords: [] },
  { version: 2, totalBytes: 44, dataBytes: 34, eccBytes: 10, alignCoords: [6, 18] },
  { version: 3, totalBytes: 70, dataBytes: 55, eccBytes: 15, alignCoords: [6, 22] },
  { version: 4, totalBytes: 100, dataBytes: 80, eccBytes: 20, alignCoords: [6, 26] },
  { version: 5, totalBytes: 134, dataBytes: 108, eccBytes: 26, alignCoords: [6, 30] },
  { version: 6, totalBytes: 172, dataBytes: 136, eccBytes: 36, alignCoords: [6, 34] },
  { version: 7, totalBytes: 196, dataBytes: 156, eccBytes: 40, alignCoords: [6, 22, 38] },
  { version: 8, totalBytes: 242, dataBytes: 194, eccBytes: 48, alignCoords: [6, 24, 42] },
  { version: 9, totalBytes: 292, dataBytes: 232, eccBytes: 60, alignCoords: [6, 26, 46] },
  { version: 10, totalBytes: 346, dataBytes: 274, eccBytes: 72, alignCoords: [6, 28, 50] },
];

export function generateQRMatrix(text: string): boolean[][] {
  const utf8 = new TextEncoder().encode(text);
  const dataLen = utf8.length;

  // 1. Pick Version
  let vInfo = VERSIONS_L.find((v) => v.dataBytes >= dataLen + 3);
  if (!vInfo) {
    vInfo = VERSIONS_L[VERSIONS_L.length - 1]; // Max fallback
  }

  const ver = vInfo.version;
  const size = ver * 4 + 17;

  // 2. Encode Data in 8-bit Byte Mode
  const buffer: number[] = [];
  function addBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      buffer.push((val >> i) & 1);
    }
  }

  addBits(0b0100, 4); // Byte Mode Indicator
  addBits(dataLen, ver < 10 ? 8 : 16); // Character Count
  for (let i = 0; i < dataLen; i++) {
    addBits(utf8[i], 8);
  }

  // Terminator (up to 4 zeroes)
  const maxBits = vInfo.dataBytes * 8;
  const termLen = Math.min(4, maxBits - buffer.length);
  addBits(0, termLen);

  // Pad to multiple of 8
  while (buffer.length % 8 !== 0) {
    buffer.push(0);
  }

  // Pad bytes (0xEC, 0x11)
  const dataCodewords = new Uint8Array(vInfo.dataBytes);
  for (let i = 0; i < buffer.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | buffer[i * 8 + b];
    }
    dataCodewords[i] = byte;
  }

  let pad = 0xec;
  for (let i = buffer.length / 8; i < vInfo.dataBytes; i++) {
    dataCodewords[i] = pad;
    pad = pad === 0xec ? 0x11 : 0xec;
  }

  // 3. Error Correction Codewords
  const eccCodewords = rsCompute(dataCodewords, vInfo.eccBytes);

  // Concatenate Data + ECC
  const allCodewords = new Uint8Array(vInfo.totalBytes);
  allCodewords.set(dataCodewords);
  allCodewords.set(eccCodewords, vInfo.dataBytes);

  // 4. Build Matrix and Function Patterns
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  // Helper to draw Finder Pattern
  function drawFinder(r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (
            (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
            (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4)
          ) {
            matrix[nr][nc] = true;
          } else {
            matrix[nr][nc] = false;
          }
        }
      }
    }
  }

  // 3 Finder Patterns
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns
  if (vInfo.alignCoords.length > 0) {
    for (const ar of vInfo.alignCoords) {
      for (const ac of vInfo.alignCoords) {
        if (
          (ar === 6 && ac === 6) ||
          (ar === 6 && ac === size - 7) ||
          (ar === size - 7 && ac === 6)
        ) {
          continue;
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            matrix[ar + dr][ac + dc] = isBorder || isCenter;
          }
        }
      }
    }
  }

  // Dark module
  matrix[size - 8][8] = true;

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // 5. Place Data Bits
  const bitStream: boolean[] = [];
  for (let i = 0; i < allCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      bitStream.push(((allCodewords[i] >> b) & 1) === 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing line
    const rows = upwards
      ? Array.from({ length: size }, (_, k) => size - 1 - k)
      : Array.from({ length: size }, (_, k) => k);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (matrix[r][c] === null) {
          let bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : false;
          // Apply Mask 0: (row + col) % 2 === 0
          if ((r + c) % 2 === 0) {
            bit = !bit;
          }
          matrix[r][c] = bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 6. Draw Format Information (Level L, Mask 0 = 0b01000 -> Format Bits: 0x77C4 with mask 0x5412)
  const formatBits = 0x77c4 ^ 0x5412; // 15 bits
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> i) & 1) === 1;
    // Top-left
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    // Split across top-right and bottom-left
    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix.map((row) => row.map((m) => !!m));
}

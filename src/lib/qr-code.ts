const VERSION = 4;
const SIZE = VERSION * 4 + 17;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;
const FORMAT_MASK = 0x5412;
const FORMAT_POLY = 0x537;

type Matrix = {
  modules: boolean[][];
  reserved: boolean[][];
};

function makeMatrix(): Matrix {
  return {
    modules: Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false)),
    reserved: Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => false)),
  };
}

function setModule(matrix: Matrix, x: number, y: number, value: boolean, reserved = true) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  matrix.modules[y][x] = value;
  if (reserved) matrix.reserved[y][x] = true;
}

function drawFinder(matrix: Matrix, x: number, y: number) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      const inCore = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const black = inCore && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setModule(matrix, xx, yy, black);
    }
  }
}

function drawAlignment(matrix: Matrix, centerX: number, centerY: number) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setModule(matrix, centerX + dx, centerY + dy, dist !== 1);
    }
  }
}

function reservePatterns(matrix: Matrix) {
  drawFinder(matrix, 0, 0);
  drawFinder(matrix, SIZE - 7, 0);
  drawFinder(matrix, 0, SIZE - 7);
  drawAlignment(matrix, 26, 26);

  for (let i = 8; i < SIZE - 8; i += 1) {
    setModule(matrix, i, 6, i % 2 === 0);
    setModule(matrix, 6, i, i % 2 === 0);
  }

  setModule(matrix, 8, VERSION * 4 + 9, true);
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function makeDataCodewords(value: string) {
  const bytes = Array.from(new TextEncoder().encode(value));
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);

  const maxBits = DATA_CODEWORDS * 8;
  if (bits.length > maxBits) {
    throw new Error("QR_INPUT_TOO_LONG");
  }

  appendBits(bits, 0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  for (let pad = 0xec; codewords.length < DATA_CODEWORDS; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }

  return codewords;
}

const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
let x = 1;
for (let i = 0; i < 255; i += 1) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];

function gfMul(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function makeRsDivisor(degree: number) {
  const result = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function makeRsRemainder(data: number[]) {
  const divisor = makeRsDivisor(ECC_CODEWORDS);
  const result = Array.from({ length: ECC_CODEWORDS }, () => 0);

  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= gfMul(divisor[i], factor);
    }
  }

  return result;
}

function getFormatBits() {
  const data = (0b01 << 3) | 0;
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * FORMAT_POLY);
  return ((data << 10) | rem) ^ FORMAT_MASK;
}

function drawFormatBits(matrix: Matrix) {
  const bits = getFormatBits();
  const bit = (index: number) => ((bits >>> index) & 1) !== 0;

  for (let i = 0; i <= 5; i += 1) setModule(matrix, 8, i, bit(i));
  setModule(matrix, 8, 7, bit(6));
  setModule(matrix, 8, 8, bit(7));
  setModule(matrix, 7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) setModule(matrix, 14 - i, 8, bit(i));

  for (let i = 0; i < 8; i += 1) setModule(matrix, SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) setModule(matrix, 8, SIZE - 15 + i, bit(i));
  setModule(matrix, 8, SIZE - 8, true);
}

function mask(row: number, col: number) {
  return (row + col) % 2 === 0;
}

function drawData(matrix: Matrix, codewords: number[]) {
  const bits: number[] = [];
  for (const byte of codewords) appendBits(bits, byte, 8);

  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < SIZE; vert += 1) {
      const row = upward ? SIZE - 1 - vert : vert;
      for (let dx = 0; dx < 2; dx += 1) {
        const col = right - dx;
        if (matrix.reserved[row][col]) continue;
        const raw = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        bitIndex += 1;
        setModule(matrix, col, row, raw !== mask(row, col), false);
      }
    }
    upward = !upward;
  }
}

function makeQrMatrix(value: string) {
  const matrix = makeMatrix();
  reservePatterns(matrix);
  drawFormatBits(matrix);

  const data = makeDataCodewords(value);
  const ecc = makeRsRemainder(data);
  drawData(matrix, [...data, ...ecc]);

  return matrix.modules;
}

export function renderQrSvg(value: string, options: { margin?: number; dark?: string; light?: string } = {}) {
  const margin = options.margin ?? 4;
  const dark = options.dark ?? "#101828";
  const light = options.light ?? "#ffffff";
  const modules = makeQrMatrix(value);
  const viewSize = SIZE + margin * 2;
  const paths: string[] = [];

  modules.forEach((row, y) => {
    row.forEach((isDark, x) => {
      if (isDark) paths.push(`M${x + margin} ${y + margin}h1v1h-1z`);
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges" role="img" aria-label="QR ${escapeXml(value)}"><rect width="${viewSize}" height="${viewSize}" fill="${light}"/><path fill="${dark}" d="${paths.join("")}"/></svg>`;
}

export function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const VIEWBOX = "0 0 400 300";
const STROKE = 'stroke="#000" stroke-width="2"';
const SHADE = "#ccc";
const FONT = 'font-family="sans-serif" font-size="16"';
const DEG = Math.PI / 180;
const ARC = 26;
const GLYPH: Record<string, number> = {
  " ": 4,
  "=": 13.4,
  "°": 8,
  m: 16,
  c: 8,
};

export type Corner = "UR" | "UL" | "LL" | "LR";
export type Mark = readonly [line: "top" | "bottom", corner: Corner, label: string];
type Box = { x: number; y: number; hw: number; hh: number };
type Arm = readonly [hx: number, vy: number, ray: "U" | "D"];
const ARM: Record<Corner, Arm> = {
  UR: [1, -1, "U"],
  UL: [-1, -1, "U"],
  LL: [-1, 1, "D"],
  LR: [1, 1, "D"],
};

const measure = (label: string) =>
  [...label].reduce((w, c) => w + (GLYPH[c] ?? 9.4), 0) + 6;
const box = (x: number, y: number, label: string): Box => ({
  x,
  y,
  hw: measure(label) / 2,
  hh: 10,
});
const overlaps = (a: Box, b: Box) =>
  Math.abs(a.x - b.x) < a.hw + b.hw && Math.abs(a.y - b.y) < a.hh + b.hh;
const holds = (b: Box, px: number, py: number) =>
  Math.abs(px - b.x) < b.hw && Math.abs(py - b.y) < b.hh;

export function svg(body: readonly string[]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">\n${body.map((line) => "  " + line).join("\n")}\n</svg>\n`;
}

export function py1(x: number) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const bits = view.getBigUint64(0);
  const negative = bits >> 63n === 1n;
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const mantissa = exponent ? fraction | (1n << 52n) : fraction;
  const shift = (exponent || 1) - 1075;
  let top = mantissa * 10n;
  let bottom = 1n;
  if (shift >= 0) top <<= BigInt(shift);
  else bottom <<= BigInt(-shift);
  let tenths = top / bottom;
  const twice = 2n * (top % bottom);
  if (twice > bottom || (twice === bottom && tenths % 2n === 1n)) tenths++;
  return `${negative ? "-" : ""}${tenths / 10n}.${tenths % 10n}`;
}

const tenth = (x: number) => Number(py1(x));

function point(cx: number, cy: number, r: number, deg: number) {
  return [
    py1(cx + r * Math.cos(deg * DEG)),
    py1(cy + r * Math.sin(deg * DEG)),
  ];
}

function text(x: number, y: number, label: string, anchor = "middle") {
  return `<text x="${py1(x)}" y="${py1(y + 5)}" text-anchor="${anchor}" ${FONT}>${label}</text>`;
}

function clip(x: number, y: number, dx: number, dy: number, pad = 14) {
  let t = 1e9;
  for (const [p, d, lo, hi] of [
    [x, dx, pad, 400 - pad],
    [y, dy, pad, 300 - pad],
  ]) {
    if (d > 0) t = Math.min(t, (hi - p) / d);
    else if (d < 0) t = Math.min(t, (lo - p) / d);
  }
  return [py1(x + t * dx), py1(y + t * dy)];
}

export function pie(parts: number, shaded = 0, cx = 200, cy = 150, r = 110) {
  if (parts < 1 || shaded < 0 || shaded > parts)
    throw new RangeError(`pie needs 0 <= shaded <= parts (${shaded}/${parts})`);
  if (parts === 1)
    return svg([
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${shaded ? SHADE : "none"}" ${STROKE}/>`,
    ]);
  const step = 360 / parts;
  const body: string[] = [];
  for (let i = 0; i < parts; i++) {
    const [x1, y1] = point(cx, cy, r, -90 + i * step);
    const [x2, y2] = point(cx, cy, r, -90 + (i + 1) * step);
    body.push(
      `<path d="M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${step > 180 ? 1 : 0} 1 ${x2},${y2} Z" ` +
        `fill="${i < shaded ? SHADE : "none"}" ${STROKE}/>`,
    );
  }
  return svg(body);
}

export function transversal(
  phi: number,
  marks: readonly Mark[],
  cx = 200,
  cy = 150,
) {
  if (!(phi > 0 && phi < 180) || Math.abs(phi - 90) < 1e-9)
    throw new RangeError(
      `transversal needs 0 < phi < 180, phi != 90 (got ${phi})`,
    );
  const gap = Math.min(110, 200 * Math.abs(Math.tan(phi * DEG)));
  const run = gap / Math.tan(phi * DEG);
  const top = [cx + run / 2, cy - gap / 2];
  const bottom = [cx - run / 2, cy + gap / 2];
  const ux = Math.cos(phi * DEG);
  const uy = -Math.sin(phi * DEG);
  const body = [top, bottom].map(
    ([, y]) =>
      `<line x1="20" y1="${py1(y)}" x2="380" y2="${py1(y)}" ${STROKE}/>`,
  );
  const [x1, y1] = clip(top[0], top[1], ux, uy);
  const [x2, y2] = clip(bottom[0], bottom[1], -ux, -uy);
  const sectors: string[] = [];
  const labels: string[] = [];
  const edges: number[][] = [];
  const placed: Box[] = [];
  const across = (px: number, py: number) =>
    (px - top[0]) * uy - (py - top[1]) * ux;
  const clear = (b: Box) => {
    if (b.x - b.hw < 2 || b.x + b.hw > 398) return false;
    if (b.y - b.hh < 2 || b.y + b.hh > 298) return false;
    if ([top, bottom].some(([, y]) => Math.abs(y - b.y) < b.hh + 2))
      return false;
    const sides = [
      [b.x - b.hw, b.y - b.hh],
      [b.x + b.hw, b.y - b.hh],
      [b.x - b.hw, b.y + b.hh],
      [b.x + b.hw, b.y + b.hh],
    ].map(([px, py]) => across(px, py));
    if (!(sides.every((d) => d > 2) || sides.every((d) => d < -2)))
      return false;
    const padded = { ...b, hw: b.hw + 2, hh: b.hh + 2 };
    if (edges.some(([px, py]) => holds(padded, px, py))) return false;
    return placed.every((other) => !overlaps(other, b));
  };
  const wedges = marks.map(([line, corner, label]) => {
    const [ox, oy] = line === "top" ? top : bottom;
    const [hx, vy, ray] = ARM[corner];
    const [tx, ty] = ray === "U" ? [ux, uy] : [-ux, -uy];
    const sweep = hx * ty > 0 ? 1 : 0;
    const from = Math.atan2(0, hx);
    const turn = (Math.atan2(ty, tx) - from) * (sweep ? 1 : -1);
    const span = ((turn % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    for (let i = 0; i <= 12; i++) {
      const a = from + ((sweep ? 1 : -1) * span * i) / 12;
      edges.push([ox + ARC * Math.cos(a), oy + ARC * Math.sin(a)]);
    }
    for (const f of [0.35, 0.7]) {
      edges.push([ox + ARC * f * hx, oy]);
      edges.push([ox + ARC * f * tx, oy + ARC * f * ty]);
    }
    sectors.push(
      `<path d="M ${py1(ox)},${py1(oy)} L ${py1(ox + ARC * hx)},${py1(oy)} ` +
        `A ${ARC},${ARC} 0 0 ${sweep} ` +
        `${py1(ox + ARC * tx)},${py1(oy + ARC * ty)} Z" ` +
        `fill="${SHADE}" ${STROKE}/>`,
    );
    return { ox, oy, hx, vy, tx, ty, label, where: `${line} ${corner}` };
  });
  for (const { ox, oy, hx, vy, tx, ty, label, where } of wedges) {
    const hw = measure(label) / 2;
    const n = Math.hypot(hx + tx, ty);
    const candidates = function* () {
      for (let s = ARC + 4; s <= 42; s++)
        yield box(ox + hx * (s + hw), oy + vy * 13, label);
      for (let r = ARC + 12; r <= 64; r++)
        yield box(ox + (r * (hx + tx)) / n, oy + (r * ty) / n, label);
      for (let s = 4; s <= 60; s++)
        yield box(ox + hx * (s + hw), oy - vy * 13, label);
    };
    let spot: Box | undefined;
    for (const candidate of candidates())
      if (clear(candidate)) {
        spot = candidate;
        break;
      }
    if (!spot) throw new RangeError(`no room for ${label} at ${where}`);
    placed.push(spot);
    labels.push(text(spot.x, spot.y, label));
  }
  body.unshift(...sectors);
  body.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${STROKE}/>`);
  body.push(...labels);
  return svg(body);
}

export function lshape(W: number, H: number, p: number, q: number, unit = "m") {
  if (!(p > 0 && p < W && q > 0 && q < H))
    throw new RangeError(
      `lshape needs 0 < p < W, 0 < q < H (got ${p}/${W}, ${q}/${H})`,
    );
  const s = Math.min(276 / W, 200 / H);
  const ox = 200 - (W * s) / 2;
  const oy = 150 + (H * s) / 2;
  const corners = [
    [0, 0],
    [W, 0],
    [W, H - q],
    [W - p, H - q],
    [W - p, H],
    [0, H],
  ].map(([x, y]) => [tenth(ox + x * s), tenth(oy - y * s)]);
  const lengths = [W, H - q, p, q, W - p, H];
  const body = [
    `<polygon points="${corners.map(([x, y]) => `${py1(x)},${py1(y)}`).join(" ")}" fill="none" ${STROKE}/>`,
  ];
  const labels = corners.map(([x1, y1], i) => {
    const [x2, y2] = corners[(i + 1) % corners.length];
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const n = Math.hypot(nx, ny) || 1;
    return box(
      (x1 + x2) / 2 + (20 * nx) / n,
      (y1 + y2) / 2 + (20 * ny) / n,
      `${lengths[i]} ${unit}`,
    );
  });
  if (overlaps(labels[2], labels[3]) || labels[2].hw + 2 > (p * s) / 2)
    labels[2].y = labels[4].y;
  labels.forEach((spot, i) =>
    body.push(text(spot.x, spot.y, `${lengths[i]} ${unit}`)),
  );
  return svg(body);
}

export function rightTriangle(
  a: number,
  b: number,
  la: string,
  lb: string,
  lc: string,
) {
  if (a <= 0 || b <= 0)
    throw new RangeError(`rightTriangle needs positive legs (got ${a}, ${b})`);
  const s = Math.min(280 / a, 200 / b);
  const ox = 200 - (a * s) / 2;
  const oy = 150 + (b * s) / 2;
  const A = [ox, oy];
  const B = [ox + a * s, oy];
  const C = [ox, oy - b * s];
  const pt = ([x, y]: readonly number[]) => `${py1(x)},${py1(y)}`;
  return svg([
    `<polygon points="${pt(A)} ${pt(B)} ${pt(C)}" fill="none" ${STROKE}/>`,
    `<polyline points="${pt([A[0] + 18, A[1]])} ${pt([A[0] + 18, A[1] - 18])} ${pt([A[0], A[1] - 18])}" fill="none" ${STROKE}/>`,
    text((A[0] + B[0]) / 2, A[1] + 26, la),
    text(A[0] - 12, (A[1] + C[1]) / 2, lb, "end"),
    text((B[0] + C[0]) / 2 + 22, (B[1] + C[1]) / 2 - 12, lc, "start"),
  ]);
}

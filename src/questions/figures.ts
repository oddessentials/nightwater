const VIEWBOX = "0 0 400 300";
const STROKE = 'stroke="#000" stroke-width="2"';
const SHADE = "#ccc";
const FONT = 'font-family="sans-serif" font-size="16"';
const DEG = Math.PI / 180;

export type Corner = "UR" | "UL" | "LL" | "LR";
export type Mark = readonly [line: "top" | "bottom", corner: Corner, label: string];
type Ray = "R" | "L" | "U" | "D";
const WEDGES: Record<Corner, readonly [Ray, Ray]> = {
  UR: ["R", "U"],
  UL: ["U", "L"],
  LL: ["L", "D"],
  LR: ["D", "R"],
};

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
  body.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${STROKE}/>`);
  const rays: Record<Ray, readonly number[]> = {
    R: [1, 0],
    L: [-1, 0],
    U: [ux, uy],
    D: [-ux, -uy],
  };
  for (const [line, corner, label] of marks) {
    const [ox, oy] = line === "top" ? top : bottom;
    const [first, second] = WEDGES[corner];
    const bx = rays[first][0] + rays[second][0];
    const by = rays[first][1] + rays[second][1];
    const n = Math.hypot(bx, by) || 1;
    const dx = bx / n;
    const dy = by / n;
    const anchor = dx > 0.2 ? "start" : dx < -0.2 ? "end" : "middle";
    body.push(text(ox + 30 * dx, oy + 34 * dy, label, anchor));
  }
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
  corners.forEach(([x1, y1], i) => {
    const [x2, y2] = corners[(i + 1) % corners.length];
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const n = Math.hypot(nx, ny) || 1;
    body.push(
      text(
        (x1 + x2) / 2 + (20 * nx) / n,
        (y1 + y2) / 2 + (20 * ny) / n,
        `${lengths[i]} ${unit}`,
      ),
    );
  });
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

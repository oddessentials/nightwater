const VIEWBOX = "0 0 400 300";
const STROKE = 'stroke="#000" stroke-width="2"';
const SHADE = "#ccc";
const DEG = Math.PI / 180;

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

function point(cx: number, cy: number, r: number, deg: number) {
  return [
    py1(cx + r * Math.cos(deg * DEG)),
    py1(cy + r * Math.sin(deg * DEG)),
  ];
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

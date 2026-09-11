import {
  close,
  evaluate,
  only,
  parse,
  type Asked,
  type Checks,
} from "../support/math.ts";

type Curve = (x: number) => number;

const POINT = /\((−?\d+(?:\.\d+)?), (−?\d+(?:\.\d+)?)\)/g;
const QUADRANTS = ["I", "II", "III", "IV"];
const PROBES = [-2, 0, 1, 3.5];

const gcd = (a: number, b: number): number =>
  b ? gcd(b, a % b) : Math.abs(a);
function squarefree(n: number) {
  for (let i = 2; i * i <= n; i++) if (n % (i * i) === 0) return false;
  return true;
}

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}
function points(text: string, count: number) {
  const found = [...text.matchAll(POINT)];
  if (found.length !== count || found.map((m) => m[0]).join(" and ") !== text)
    throw new Error(`expected ${count} point(s) in ${text}`);
  return found.map((m) => [evaluate(m[1]), evaluate(m[2])] as const);
}
const point = (text: string) => points(text, 1)[0];
function curve(text: string): Curve {
  const node = parse(text);
  return (x) => node({ x });
}
function line(text: string) {
  const match = /^y = (.+)$/.exec(text);
  if (!match) throw new Error(`not a line: ${text}`);
  return curve(match[1]);
}
const slopeOf = (f: Curve) => f(1) - f(0);
function ratio(text: string) {
  const match = /^(−?)(\d+)(?:\/(\d+))?$/.exec(text);
  if (!match) throw new Error(`not a fraction: ${text}`);
  return [(match[1] ? -1 : 1) * Number(match[2]), Number(match[3] ?? 1)];
}

const distance = (q: Asked) => {
  const [[x1, y1], [x2, y2]] = points(
    read(/^How far is it from (.+)\?$/, q)[1].replace(" to ", " and "),
    2,
  );
  const target = Math.hypot(x2 - x1, y2 - y1);
  const i = only(q.choices, (c) => close(evaluate(c), target));
  const radical = /√(\d+)$/.exec(q.choices[i]);
  if (radical && !squarefree(Number(radical[1])))
    throw new Error(`${q.choices[i]} is not in simplest form`);
  return i;
};

export default {
  1: (q) => {
    const [x, y] = point(read(/^Where does the point (.+) lie\?$/, q)[1]);
    const turn = Math.floor(Math.atan2(y, x) / (Math.PI / 2));
    const want =
      y === 0
        ? "on the x-axis"
        : x === 0
          ? "on the y-axis"
          : `Quadrant ${QUADRANTS[(turn + 4) % 4]}`;
    return only(q.choices, (c) => c === want);
  },
  2: (q) => {
    const [, start, moves] = read(
      /^Start at (.+?)\. Move (.+)\. Where do you land\?$/,
      q,
    );
    let [x, y] = point(start);
    const steps = moves.split(" and ");
    if (steps.length !== 2) throw new Error(`expected two moves: ${moves}`);
    for (const move of steps) {
      const step = /^(\d+) (right|left|up|down)$/.exec(move);
      if (!step) throw new Error(`unreadable move: ${move}`);
      const size = Number(step[1]);
      if (step[2] === "right") x += size;
      else if (step[2] === "left") x -= size;
      else if (step[2] === "up") y += size;
      else y -= size;
    }
    return only(q.choices, (c) => {
      const [cx, cy] = point(c);
      return cx === x && cy === y;
    });
  },
  3: distance,
  4: (q) => {
    const [[x1, y1], [x2, y2]] = points(
      read(/^What is the midpoint of (.+)\?$/, q)[1],
      2,
    );
    return only(q.choices, (c) => {
      const [x, y] = point(c);
      return 2 * x === x1 + x2 && 2 * y === y1 + y2;
    });
  },
  5: (q) => {
    const [[x1, y1], [x2, y2]] = points(
      read(/^What is the slope of the line through (.+)\?$/, q)[1],
      2,
    );
    const i = only(q.choices, (c) => {
      const [n, d] = ratio(c);
      return n * (x2 - x1) === d * (y2 - y1);
    });
    const [n, d] = ratio(q.choices[i]);
    if (gcd(n, d) !== 1)
      throw new Error(`${q.choices[i]} is not in lowest terms`);
    return i;
  },
  6: (q) => {
    const reading = /^In y = (.+), what is the (slope|y-intercept)\?$/.exec(
      q.prompt,
    );
    if (reading) {
      const f = curve(reading[1]);
      const target = reading[2] === "slope" ? slopeOf(f) : f(0);
      return only(q.choices, (c) => close(evaluate(c), target));
    }
    const [, slope, intercept] = read(
      /^A line has slope (\S+) and y-intercept (\S+)\. Which equation is it\?$/,
      q,
    );
    const m = evaluate(slope);
    const b = evaluate(intercept);
    return only(q.choices, (c) => {
      const g = line(c);
      return PROBES.every((x) => close(g(x), m * x + b));
    });
  },
  7: (q) => {
    const f = curve(read(/^Which point lies on y = (.+)\?$/, q)[1]);
    return only(q.choices, (c) => {
      const [x, y] = point(c);
      return close(f(x), y);
    });
  },
  8: (q) => {
    const [[x1, y1], [x2, y2]] = points(
      read(/^Which equation describes the line through (.+)\?$/, q)[1],
      2,
    );
    if (!q.choices.every((c) => close(line(c)(x1), y1)))
      throw new Error("a choice misses the first point");
    return only(q.choices, (c) => {
      const g = line(c);
      return close(g(x1), y1) && close(g(x2), y2);
    });
  },
  9: distance,
  10: (q) => {
    const [, relation, given, through] = read(
      /^Which line is (parallel|perpendicular) to y = (.+) and passes through (\(.+\))\?$/,
      q,
    );
    const m = slopeOf(curve(given));
    const [x0, y0] = point(through);
    if (!q.choices.every((c) => close(line(c)(x0), y0)))
      throw new Error("a choice misses the given point");
    return only(q.choices, (c) => {
      const s = slopeOf(line(c));
      return relation === "parallel" ? close(s, m) : close(s * m, -1);
    });
  },
} satisfies Checks;

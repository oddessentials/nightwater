import {
  close,
  evaluate,
  only,
  parse,
  type Asked,
  type Checks,
} from "../support/math.ts";

type Curve = (x: number) => number;

const PROBES = [-2.7, -1.3, 0.4, 1.9, 3.6];

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function fn(text: string, name = "x"): Curve {
  const node = parse(text);
  return (v) => node({ [name]: v });
}

const agrees = (f: Curve, g: Curve) => PROBES.every((x) => close(f(x), g(x)));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

const expanded = (pattern: RegExp) => (q: Asked) => {
  const f = fn(read(pattern, q)[1]);
  return only(q.choices, (c) => !c.includes("(") && agrees(f, fn(c)));
};

function factored(q: Asked) {
  const f = fn(read(/^Factor (.+)\.$/, q)[1]);
  const i = only(q.choices, (c) => agrees(f, fn(c)));
  for (const [, inside] of q.choices[i].matchAll(/\(([^()]+)\)/g)) {
    const g = fn(inside);
    if (gcd(g(1) - g(0), g(0)) !== 1)
      throw new Error(`${q.choices[i]} is not fully factored`);
  }
  return i;
}

function solutionsOf(text: string) {
  const or = /^x = (\S+) or x = (\S+)$/.exec(text);
  if (or) return [evaluate(or[1]), evaluate(or[2])];
  const pm = /^x = (\S+) ± √(\d+)$/.exec(text);
  if (pm) {
    const mid = evaluate(pm[1]);
    const half = Math.sqrt(Number(pm[2]));
    return [mid - half, mid + half];
  }
  const over = /^x = \((\S+) ± √(\d+)\)\/(\d+)$/.exec(text);
  if (over) {
    const top = evaluate(over[1]);
    const half = Math.sqrt(Number(over[2]));
    const den = Number(over[3]);
    return [(top - half) / den, (top + half) / den];
  }
  throw new Error(`unreadable solutions ${text}`);
}

function solved(q: Asked) {
  const [, left, right] = read(
    /^Solve (.+) = (\S+)\.(?: Give the exact solutions\.)?$/,
    q,
  );
  const f = fn(left);
  const g = fn(right);
  return only(q.choices, (c) => {
    const [lo, hi] = solutionsOf(c);
    return lo < hi && [lo, hi].every((x) => close(f(x) - g(x), 0));
  });
}

function turning(q: Asked) {
  const [, asked, body] = read(
    /^What is the (vertex|axis of symmetry) of y = (.+)\?$/,
    q,
  );
  const f = fn(body);
  const mirror = (h: number) =>
    [0.5, 1, 2.5].every((t) => close(f(h + t), f(h - t)));
  return only(q.choices, (c) => {
    if (asked === "vertex") {
      const point = /^\((\S+), (\S+)\)$/.exec(c);
      if (!point) throw new Error(`unreadable point ${c}`);
      const x = evaluate(point[1]);
      return mirror(x) && close(f(x), evaluate(point[2]));
    }
    const axis = /^x = (\S+)$/.exec(c);
    if (!axis) throw new Error(`unreadable axis ${c}`);
    return mirror(evaluate(axis[1]));
  });
}

function counted(q: Asked) {
  const asked = /^How many real solutions does (.+) = 0 have\?$/.exec(q.prompt);
  if (!asked) return solved(q);
  const f = fn(asked[1]);
  const c = f(0);
  const a = (f(1) + f(-1)) / 2 - c;
  const b = (f(1) - f(-1)) / 2;
  const height = f(-b / (2 * a));
  const n = close(height, 0) ? 1 : Math.sign(height) === Math.sign(a) ? 0 : 2;
  return only(q.choices, (choice) => choice === String(n));
}

function landing(q: Asked) {
  const flight =
    /^A \w+ is (?:thrown up|launched) from a \w+\. Its height after t seconds is h = (.+) feet\. When does it hit the ground\?$/.exec(
      q.prompt,
    );
  if (flight) {
    const h = fn(flight[1], "t");
    return only(q.choices, (c) => {
      const time = /^(\d+) s$/.exec(c);
      if (!time) throw new Error(`no time in ${c}`);
      const t = Number(time[1]);
      return t > 0 && h(t) === 0;
    });
  }
  const area =
    /^A (?:rectangle|garden bed) is (\d+) (cm|m) longer than it is wide\. Its area is (\d+) (cm|m)²\. How wide is it\?$/.exec(
      q.prompt,
    );
  const numbers =
    /^Two whole numbers differ by (\d+)\. Their product is (\d+)\. What is the smaller number\?$/.exec(
      q.prompt,
    );
  if (area && area[2] !== area[4])
    throw new Error(`mixed units in ${q.prompt}`);
  const given = area ? [area[1], area[3]] : numbers?.slice(1, 3);
  if (!given) throw new Error(`unexpected prompt: ${q.prompt}`);
  const [d, T] = given.map(Number);
  const fits = Array.from({ length: T + 1 }, (_, w) => w).filter(
    (w) => w * (w + d) === T,
  );
  if (fits.length !== 1)
    throw new Error(`${fits.length} whole widths fit ${q.prompt}`);
  const want = area ? `${fits[0]} ${area[2]}` : `${fits[0]}`;
  return only(q.choices, (c) => c === want);
}

export default {
  1: expanded(/^Simplify (.+)\.$/),
  2: expanded(/^Expand (.+)\.$/),
  3: expanded(/^Expand (.+)\.$/),
  4: factored,
  5: factored,
  6: solved,
  7: turning,
  8: solved,
  9: counted,
  10: landing,
} satisfies Checks;

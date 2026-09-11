import {
  close,
  evaluate,
  only,
  parse,
  type Asked,
  type Checks,
} from "../support/math.ts";

type Curve = (x: number) => number;

const PROBES = [0.61, 1.37, 2.29, 3.83];
const PLANE = [
  [2.7, 1.9],
  [5.3, 1.7],
  [7.9, 2.9],
];
const RAISED = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const LOWERED = "₀₁₂₃₄₅₆₇₈₉";

function fn(text: string): Curve {
  const node = parse(text);
  return (x) => node({ x });
}
const agrees = (f: Curve, g: Curve) =>
  PROBES.every((x) => close(f(x), g(x), 1e-9));
const script = (text: string, digits: string) =>
  Number([...text].map((c) => String(digits.indexOf(c))).join(""));
const signed = (text: string) => Number(text.replace("−", "-"));
const cents = (text: string) =>
  Math.round(Number(text.replace(/[$,]/g, "").split(" ")[0]) * 100);
const shown = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`;

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function holds(text: string): (v: number) => boolean {
  const match = /^[xy] (≠|≥|≤|>|<) (\S+)$/.exec(text);
  if (!match) throw new Error(`unreadable condition ${text}`);
  const bound = signed(match[2]);
  return {
    "≠": (v: number) => v !== bound,
    "≥": (v: number) => v >= bound,
    "≤": (v: number) => v <= bound,
    ">": (v: number) => v > bound,
    "<": (v: number) => v < bound,
  }[match[1]]!;
}

const probe = (x: number) => x ** 3 + 2 ** x;

export default {
  1: (q) => {
    const [, body, at] = read(/^f\(x\) = (.+)\. What is f\((.+)\)\?$/, q);
    const target = fn(body)(evaluate(at));
    return only(q.choices, (c) => close(evaluate(c), target));
  },
  2: (q) => {
    const grid = Array.from({ length: 241 }, (_, i) => -30 + i / 4);
    const domain = /^What is the domain of f\(x\) = (.+)\?$/.exec(q.prompt);
    if (domain) {
      const f = fn(domain[1]);
      return only(q.choices, (c) => {
        const inside = holds(c);
        return grid.every((x) => inside(x) === Number.isFinite(f(x)));
      });
    }
    const f = fn(read(/^What is the range of f\(x\) = (.+)\?$/, q)[1]);
    const heights = grid.map(f);
    const want =
      f(1000) > f(0)
        ? `y ≥ ${shown(Math.min(...heights))}`
        : `y ≤ ${shown(Math.max(...heights))}`;
    return only(q.choices, (c) => c === want);
  },
  3: (q) => {
    const [, f, g, n] = read(
      /^f\(x\) = (.+) and g\(x\) = (.+)\. (?:What is f\(g\((.+)\)\)\?|Write \(f ∘ g\)\(x\)\.)$/,
      q,
    );
    const outer = fn(f);
    const inner = fn(g);
    if (n !== undefined) {
      const target = outer(inner(evaluate(n)));
      return only(q.choices, (c) => close(evaluate(c), target));
    }
    return only(q.choices, (c) => agrees(fn(c), (x) => outer(inner(x))));
  },
  4: (q) => {
    const f = fn(read(/^f\(x\) = (.+)\. What is f⁻¹\(x\)\?$/, q)[1]);
    return only(q.choices, (c) => {
      const g = fn(c.replace(/^f⁻¹\(x\) = /, ""));
      return PROBES.every(
        (x) => close(f(g(x)), x, 1e-9) && close(g(f(x)), x, 1e-9),
      );
    });
  },
  5: (q) => {
    const moved =
      /^g\(x\) = f\((.+?)\)(?: ([+−]) (\d+))?\. How does the graph of g compare with the graph of f\?$/.exec(
        q.prompt,
      );
    if (moved) {
      const inside = fn(moved[1]);
      const lift = moved[2] ? signed(`${moved[2]}${moved[3]}`) : 0;
      return only(q.choices, (c) => {
        const [, across, way, up, dir] =
          /^(\d+) units? (right|left) and (\d+) units? (up|down)$/.exec(c)!;
        const dx = way === "right" ? Number(across) : -Number(across);
        const dy = dir === "up" ? Number(up) : -Number(up);
        return agrees(
          (x) => probe(inside(x)) + lift,
          (x) => probe(x - dx) + dy,
        );
      });
    }
    const parent =
      /^The graph of y = (.+) is moved (\d+) units? (right|left) and (\d+) units? (up|down)\. Which is the new function\?$/.exec(
        q.prompt,
      );
    if (parent) {
      const base = fn(parent[1]);
      const dx = parent[3] === "right" ? Number(parent[2]) : -Number(parent[2]);
      const dy = parent[5] === "up" ? Number(parent[4]) : -Number(parent[4]);
      return only(q.choices, (c) =>
        agrees(fn(c.replace(/^y = /, "")), (x) => base(x - dx) + dy),
      );
    }
    const [, f, g] = read(
      /^f\(x\) = (.+) and g\(x\) = (.+)\. How is the graph of g related to the graph of f\?$/,
      q,
    );
    const F = fn(f);
    const G = fn(g);
    const flips = [
      agrees(G, (x) => -F(x)) && "reflected in the x-axis",
      agrees(G, (x) => F(-x)) && "reflected in the y-axis",
    ].filter(Boolean);
    if (flips.length !== 1) throw new Error(`${flips.length} reflections fit`);
    return only(q.choices, (c) => c === flips[0]);
  },
  6: (q) => {
    const P = Number(/(\d[\d,]*)/.exec(q.prompt)![1].replace(/,/g, ""));
    const t = Number(read(/ after (\d+) \w+\? Round to 2 dp\.$/, q)[1]);
    const rate = /(\d+)%/.exec(q.prompt);
    let want: number;
    if (rate) {
      const s = / (gains|grows) /.test(q.prompt)
        ? 1
        : / (loses|drops|shrinks) /.test(q.prompt)
          ? -1
          : 0;
      if (!s) throw new Error(`no direction in ${q.prompt}`);
      const top =
        BigInt(P) * BigInt(100 + s * Number(rate[1])) ** BigInt(t) * 100n;
      const bottom = 100n ** BigInt(t);
      want = Number((2n * top + bottom) / (2n * bottom));
    } else {
      const half = / has a half-life of (\d+) /.exec(q.prompt);
      const double = / doubles every (\d+) /.exec(q.prompt);
      const h = Number((half ?? double)![1]);
      want = Math.round(P * 2 ** ((half ? -t : t) / h) * 100);
    }
    return only(q.choices, (c) => cents(c) === want);
  },
  7: (q) => {
    const toLog =
      /^Write (\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = (\d+) in logarithmic form\.$/.exec(
        q.prompt,
      );
    if (toLog) {
      const b = Number(toLog[1]);
      const N = Number(toLog[3]);
      if (b ** script(toLog[2], RAISED) !== N)
        throw new Error(`${q.prompt} is not true`);
      return only(q.choices, (c) => {
        const [, base, arg, value] =
          /^log([₀₁₂₃₄₅₆₇₈₉]+) (\d+) = (\d+)$/.exec(c)!;
        const B = script(base, LOWERED);
        return B === b && Number(arg) === N && B ** Number(value) === N;
      });
    }
    const toPower =
      /^Write log([₀₁₂₃₄₅₆₇₈₉]+) (\d+) = (\d+) in exponential form\.$/.exec(
        q.prompt,
      );
    if (toPower) {
      const b = script(toPower[1], LOWERED);
      const N = Number(toPower[2]);
      if (b ** Number(toPower[3]) !== N)
        throw new Error(`${q.prompt} is not true`);
      return only(q.choices, (c) => {
        const [, base, power, value] =
          /^(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+) = (\d+)$/.exec(c)!;
        return (
          Number(base) === b &&
          Number(value) === N &&
          Number(base) ** script(power, RAISED) === N
        );
      });
    }
    const target = evaluate(read(/^What is (.+)\?$/, q)[1]);
    return only(q.choices, (c) => close(evaluate(c), target, 1e-9));
  },
  8: (q) => {
    const whole =
      /^Write (.+) as (?:a single logarithm|a sum or difference of logarithms)\.$/.exec(
        q.prompt,
      );
    if (whole)
      return only(q.choices, (c) =>
        PLANE.every(([x, y]) =>
          close(evaluate(c, { x, y }), evaluate(whole[1], { x, y }), 1e-9),
        ),
      );
    const [, given, inside] = read(
      /^Take (.+)\. Estimate log₁₀\((.+)\) to 2 dp\.$/,
      q,
    );
    const logs = new Map<number, number>();
    for (const [, n, v] of given.matchAll(/log₁₀ (\d+) ≈ (\d+\.\d\d)/g))
      logs.set(Number(n), Math.round(Number(v) * 100));
    const product = /^(\d+) × (\d+)$/.exec(inside);
    const quotient = /^(\d+)\/(\d+)$/.exec(inside);
    const power = /^(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(inside);
    const log = (n: string) => logs.get(Number(n))!;
    const want = product
      ? log(product[1]) + log(product[2])
      : quotient
        ? log(quotient[1]) - log(quotient[2])
        : script(power![2], RAISED) * log(power![1]);
    return only(q.choices, (c) => Math.round(evaluate(c) * 100) === want);
  },
  9: (q) => {
    const exact = /^Solve (.+) = (\d+)\.$/.exec(q.prompt);
    if (exact) {
      const left = fn(exact[1]);
      return only(q.choices, (c) =>
        close(left(evaluate(c.replace(/^x = /, ""))), Number(exact[2])),
      );
    }
    const logged = /^Solve (\d+)\^x = (\d+)\. Round to 2 dp\.$/.exec(q.prompt);
    if (logged) {
      const want = Math.round(
        (Math.log(Number(logged[2])) / Math.log(Number(logged[1]))) * 100,
      );
      return only(
        q.choices,
        (c) => Math.round(evaluate(c.replace(/^x = /, "")) * 100) === want,
      );
    }
    const [, rate, unit, times] = read(
      /grows (\d+)% an? (\w+)\. To 2 dp, how many (?:\w+) until it (doubles|triples)\?$/,
      q,
    );
    const g = times === "doubles" ? 2 : 3;
    const want = Math.round(
      (Math.log(g) / Math.log(1 + Number(rate) / 100)) * 100,
    );
    return only(
      q.choices,
      (c) => c.endsWith(` ${unit}s`) && cents(c) === want,
    );
  },
  10: (q) => {
    const [, left, k] = read(/^Solve (.+) = (\d+)\.$/, q);
    const f = fn(left);
    return only(q.choices, (c) => {
      const value = f(evaluate(c.replace(/^x = /, "")));
      return Number.isFinite(value) && close(value, Number(k), 1e-9);
    });
  },
} satisfies Checks;

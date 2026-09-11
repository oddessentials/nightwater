import {
  close,
  evaluate,
  only,
  parse,
  type Asked,
  type Checks,
} from "../support/math.ts";

type Curve = (x: number) => number;

const PROBES = [0.93, 1.1, 2.13, 2.88];
const RAISED = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const LOWERED = "₀₁₂₃₄₅₆₇₈₉";

function fn(text: string): Curve {
  const node = parse(text);
  return (x) => node({ x });
}
const slope = (f: Curve, x: number, h = 1e-6) =>
  (f(x + h) - f(x - h)) / (2 * h);
const bend = (f: Curve, x: number, h = 1e-3) =>
  (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
const agrees = (f: Curve, g: Curve) =>
  PROBES.every((x) => close(f(x), g(x), 1e-6));
const script = (text: string, digits: string) =>
  Number(
    [...text]
      .map((c) => (c === "⁻" || c === "₋" ? "-" : String(digits.indexOf(c))))
      .join(""),
  );

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function simpson(f: Curve, a: number, b: number, n = 4000) {
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
  return (sum * h) / 3;
}

const derivative = (q: Asked) => {
  const f = fn(read(/^What is the derivative of f\(x\) = (.+)\?$/, q)[1]);
  return only(q.choices, (c) => agrees((x) => slope(f, x), fn(c)));
};

export default {
  1: (q) => {
    const [, c, body] = read(/^What is lim x→(.+?) \((.+)\)\?$/, q);
    const target = fn(body)(evaluate(c));
    return only(q.choices, (choice) => close(evaluate(choice), target));
  },
  2: (q) => {
    const [, c, body] = read(/^What is lim x→(\S+) (.+)\?$/, q);
    const f = fn(body);
    const x = evaluate(c);
    const limit = (f(x + 1e-5) + f(x - 1e-5)) / 2;
    return only(q.choices, (choice) => close(evaluate(choice), limit, 1e-6));
  },
  3: (q) => {
    const far = fn(read(/^What is lim x→∞ (.+)\?$/, q)[1])(1e7);
    return only(q.choices, (choice) =>
      choice === "∞"
        ? far > 1e5
        : choice === "−∞"
          ? far < -1e5
          : Math.abs(far) < 1e5 && Math.abs(evaluate(choice) - far) < 1e-4,
    );
  },
  4: (q) => {
    const value = /^f\(x\) = (.+)\. What is f′\((.+)\)\?$/.exec(q.prompt);
    if (!value) return derivative(q);
    const target = slope(fn(value[1]), evaluate(value[2]));
    return only(q.choices, (choice) => close(evaluate(choice), target, 1e-6));
  },
  5: derivative,
  6: derivative,
  7: (q) => {
    const [, body, at] = read(
      /^What is the tangent line to y = (.+) at x = (.+)\?$/,
      q,
    );
    const f = fn(body);
    const p = evaluate(at);
    const m = slope(f, p);
    const y0 = f(p);
    return only(q.choices, (choice) => {
      const g = fn(choice.replace(/^y = /, ""));
      return [0, 1].every((x) => close(g(x), y0 + m * (x - p), 1e-6));
    });
  },
  8: (q) => {
    const extreme =
      /^Where does f\(x\) = (.+) have a local (minimum|maximum)\?$/.exec(
        q.prompt,
      );
    if (extreme) {
      const f = fn(extreme[1]);
      return only(q.choices, (choice) => {
        const v = evaluate(choice.replace(/^x = /, ""));
        const turning = Math.abs(slope(f, v)) < 1e-4;
        return (
          turning && (extreme[2] === "minimum" ? bend(f, v) > 0 : bend(f, v) < 0)
        );
      });
    }
    const [, body, way] = read(
      /^Where is f\(x\) = (.+) (increasing|decreasing)\?$/,
      q,
    );
    const f = fn(body);
    const grid = Array.from({ length: 97 }, (_, i) => -12 + i * 0.25).filter(
      (x) => Math.abs(slope(f, x)) > 1e-6,
    );
    return only(q.choices, (choice) => {
      const band = /^(\S+) < x < (\S+)$/.exec(choice);
      const union = /^x < (\S+) or x > (\S+)$/.exec(choice);
      const inside = band
        ? (x: number) => evaluate(band[1]) < x && x < evaluate(band[2])
        : union
          ? (x: number) => x < evaluate(union[1]) || x > evaluate(union[2])
          : null;
      if (!inside) throw new Error(`unreadable interval ${choice}`);
      return grid.every(
        (x) =>
          inside(x) === (way === "increasing" ? slope(f, x) > 0 : slope(f, x) < 0),
      );
    });
  },
  9: (q) => {
    const g = fn(read(/^What is ∫ \((.+)\) dx\?$/, q)[1]);
    return only(
      q.choices,
      (choice) =>
        choice.endsWith(" + C") &&
        agrees((x) => slope(fn(choice.slice(0, -4)), x), g),
    );
  },
  10: (q) => {
    const area =
      /^What is the area under y = (.+) from x = (.+) to x = (.+)\?$/.exec(
        q.prompt,
      );
    let total: number;
    if (area) {
      const f = fn(area[1]);
      const a = evaluate(area[2]);
      const b = evaluate(area[3]);
      if (
        Array.from({ length: 101 }, (_, i) => a + ((b - a) * i) / 100).some(
          (x) => f(x) <= 0,
        )
      )
        throw new Error("the curve dips below the axis");
      total = simpson(f, a, b);
    } else {
      const [, lower, upper, body] = read(
        /^What is ∫([₀₁₂₃₄₅₆₇₈₉₋]+)([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+) (.+) dx\?$/,
        q,
      );
      total = simpson(fn(body), script(lower, LOWERED), script(upper, RAISED));
    }
    return only(q.choices, (choice) => close(evaluate(choice), total, 1e-8));
  },
} satisfies Checks;

import { close, evaluate, only, parse, type Checks } from "../support/math.ts";

const RAISED = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const LOWERED = "₀₁₂₃₄₅₆₇₈₉";
const STEP =
  /^An arithmetic sequence has a₁ = (\S+) and d = (\S+)\. What is a([₀-₉]+)\?$/;
const ENDS =
  /^An arithmetic sequence has a₁ = (\S+) and a([₀-₉]+) = (\S+)\. What is the common difference d\?$/;
const LISTED = /^What is a([₀-₉]+) in the geometric sequence (.+), …\?$/;
const GIVEN =
  /^A geometric sequence has a₁ = (\S+) and r = (\S+)\. What is a([₀-₉]+)\?$/;
const SUM = /^What is the sum of the first (\d+) terms of (.+), …\?$/;
const SEATS =
  /^A (?:theatre|stadium|concert hall|lecture hall) has (\d+) seats in the front row and (\d+) more seats in each row behind it\. How many seats are in the first (\d+) rows\?$/;
const SERIES = /^(−?[\d,]+) ([+−]) ([\d,]+) ([+−]) ([\d,]+) ([+−]) …$/;
const SIGMA = /^What is Σ \((.+)\) for k = (\d+) to (\d+)\?$/;
const RECURSION = /^(.+) and aₙ = (.+)\. What is a([₀-₉]+)\?$/;
const ASYMPTOTES = /^What are the asymptotes of f\(x\) = \((.+)\)\/(\(.+)\?$/;
const LINES = /^x = (\S+) and y = (\S+)$/;
const FACTOR = /^Which is a factor of (.+)\?$/;
const REMAINDER = /^What is the remainder when (.+) is divided by (.+)\?$/;
const RATE =
  /^What is the average rate of change of f\(x\) = (.+) from x = (\S+) to x = (\S+)\?$/;
const QUOTIENT =
  /^For f\(x\) = (.+), what is \(f\((\S+) \+ h\) − f\((\S+)\)\)\/h when h = (\d+)\?$/;
const COEFFICIENT =
  /^What is the coefficient of x([⁰¹²³⁴⁵⁶⁷⁸⁹]*) in \((.+)\)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\?$/;

const script = (text: string, digits: string) =>
  Number([...text].map((c) => String(digits.indexOf(c))).join(""));

function read(pattern: RegExp, text: string) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`unexpected text: ${text}`);
  return match;
}

const listed = (text: string) => text.split(", ").map((part) => evaluate(part));

function walk(start: number, count: number, next: (term: number) => number) {
  let term = start;
  for (let i = 1; i < count; i++) term = next(term);
  return term;
}

function sumOf(first: number, count: number, next: (term: number) => number) {
  let total = 0;
  for (let i = 0, term = first; i < count; i++, term = next(term))
    total += term;
  return total;
}

function geometric(text: string) {
  const [, first, s2, t2, s3, t3, s4] = read(SERIES, text);
  const signed = (sign: string, digits: string) =>
    (sign === "+" ? 1 : -1) * evaluate(digits);
  const shown = [evaluate(first), signed(s2, t2), signed(s3, t3)];
  const ratio = shown[1] / shown[0];
  if (
    !close(shown[2] / shown[1], ratio) ||
    Math.sign(shown[2] * ratio) !== (s4 === "+" ? 1 : -1)
  )
    throw new Error(`${text} is not a geometric series`);
  return { first: shown[0], ratio };
}

const curve = (text: string) => {
  const node = parse(text);
  return (x: number) => node({ x });
};

export default {
  1: (q) => {
    const step = STEP.exec(q.prompt);
    if (step) {
      const d = evaluate(step[2]);
      const count = script(step[3], LOWERED);
      const term = walk(evaluate(step[1]), count, (t) => t + d);
      return only(q.choices, (c) => evaluate(c) === term);
    }
    const [, first, at, last] = read(ENDS, q.prompt);
    const count = script(at, LOWERED);
    return only(
      q.choices,
      (c) =>
        walk(evaluate(first), count, (t) => t + evaluate(c)) ===
        evaluate(last),
    );
  },
  2: (q) => {
    const shown = LISTED.exec(q.prompt);
    let first: number;
    let ratio: number;
    let at: string;
    if (shown) {
      const terms = listed(shown[2]);
      [first, ratio, at] = [terms[0], terms[1] / terms[0], shown[1]];
      if (terms[2] !== terms[1] * ratio)
        throw new Error(`not geometric: ${q.prompt}`);
    } else {
      const given = read(GIVEN, q.prompt);
      [first, ratio, at] = [evaluate(given[1]), evaluate(given[2]), given[3]];
    }
    const term = walk(first, script(at, LOWERED), (t) => t * ratio);
    return only(q.choices, (c) => evaluate(c) === term);
  },
  3: (q) => {
    const shown = SUM.exec(q.prompt);
    let first: number;
    let step: number;
    let count: number;
    if (shown) {
      const terms = listed(shown[2]);
      if (terms[2] - terms[1] !== terms[1] - terms[0])
        throw new Error(`not arithmetic: ${q.prompt}`);
      [first, step, count] = [terms[0], terms[1] - terms[0], Number(shown[1])];
    } else {
      [first, step, count] = read(SEATS, q.prompt).slice(1).map(Number);
    }
    const total = sumOf(first, count, (t) => t + step);
    return only(q.choices, (c) => evaluate(c) === total);
  },
  4: (q) => {
    if (q.prompt === "Which infinite series has a finite sum?")
      return only(q.choices, (c) => Math.abs(geometric(c).ratio) < 1);
    const shown = SUM.exec(q.prompt);
    if (shown) {
      const terms = listed(shown[2]);
      const ratio = terms[1] / terms[0];
      if (terms[2] !== terms[1] * ratio)
        throw new Error(`not geometric: ${q.prompt}`);
      const total = sumOf(terms[0], Number(shown[1]), (t) => t * ratio);
      return only(q.choices, (c) => evaluate(c) === total);
    }
    const { first, ratio } = geometric(read(/^(.+) = \?$/, q.prompt)[1]);
    const total = sumOf(first, 4000, (t) => t * ratio);
    return only(q.choices, (c) => close(evaluate(c), total, 1e-9));
  },
  5: (q) => {
    const [, rule, lo, hi] = read(SIGMA, q.prompt);
    const node = parse(rule);
    let total = 0;
    for (let k = Number(lo); k <= Number(hi); k++) total += node({ k });
    return only(q.choices, (c) => evaluate(c) === total);
  },
  6: (q) => {
    const [, given, rule, at] = read(RECURSION, q.prompt);
    const start = given
      .split(", ")
      .map((part) => evaluate(read(/^a[₁₂] = (.+)$/, part)[1]));
    const node = parse(rule.replace("aₙ₋₁", "p").replace("aₙ₋₂", "u"));
    const step = (p: number, u: number) => node({ p, u });
    const n = script(at, LOWERED);
    let target: number;
    if (start.length === 1) {
      const c = step(0, 0);
      const m = step(1, 0) - c;
      if (step(5, 0) !== 5 * m + c) throw new Error(`not affine: ${rule}`);
      target = m ** (n - 1) * start[0] + (c * (m ** (n - 1) - 1)) / (m - 1);
    } else {
      const lead = step(1, 0);
      const back = step(0, 1);
      if (step(3, 5) !== 3 * lead + 5 * back || step(0, 0) !== 0)
        throw new Error(`not linear: ${rule}`);
      let power = [
        [1, 0],
        [0, 1],
      ];
      for (let i = 2; i < n; i++)
        power = power.map(([x, y]) => [x * lead + y, x * back]);
      target = power[0][0] * start[1] + power[0][1] * start[0];
    }
    return only(q.choices, (c) => evaluate(c) === target);
  },
  7: (q) => {
    const [, top, bottom] = read(ASYMPTOTES, q.prompt);
    const f = curve(`(${top})/${bottom}`);
    const below = curve(bottom);
    const far = f(1e9);
    return only(q.choices, (c) => {
      const [, xs, ys] = read(LINES, c);
      const x = evaluate(xs);
      return (
        below(x) === 0 &&
        Math.abs(f(x + 1e-6)) > 1e4 &&
        Math.abs(evaluate(ys) - far) < 1e-6
      );
    });
  },
  8: (q) => {
    const asked = FACTOR.exec(q.prompt);
    if (asked) {
      const P = curve(asked[1]);
      return only(q.choices, (c) => P(-curve(c)(0)) === 0);
    }
    const [, body, divisor] = read(REMAINDER, q.prompt);
    const P = curve(body);
    const k = -curve(divisor)(0);
    const d = P(0);
    const b = (P(1) + P(-1)) / 2 - d;
    const c = (P(1) - P(-1)) / 2 - 1;
    if (P(2) !== 8 + 4 * b + 2 * c + d || P(-3) !== -27 + 9 * b - 3 * c + d)
      throw new Error(`not a monic cubic: ${body}`);
    let carry = 1;
    for (const next of [b, c, d]) carry = carry * k + next;
    return only(q.choices, (choice) => evaluate(choice) === carry);
  },
  9: (q) => {
    const rate = RATE.exec(q.prompt);
    let rule: string;
    let from: number;
    let to: number;
    if (rate) {
      [rule, from, to] = [rate[1], evaluate(rate[2]), evaluate(rate[3])];
    } else {
      const [, body, p, again, h] = read(QUOTIENT, q.prompt);
      if (p !== again) throw new Error(`two different points: ${q.prompt}`);
      [rule, from, to] = [body, evaluate(p), evaluate(p) + Number(h)];
    }
    const f = curve(rule);
    if (f(1) + f(-1) - 2 * f(0) !== f(2) + f(0) - 2 * f(1))
      throw new Error(`not a quadratic: ${rule}`);
    const mid = (from + to) / 2;
    const tangent = f(mid + 0.5) - f(mid - 0.5);
    return only(q.choices, (c) => close(evaluate(c), tangent));
  },
  10: (q) => {
    const [, power, base, n] = read(COEFFICIENT, q.prompt);
    const g = curve(base);
    const b = g(0);
    const a = g(1) - b;
    let coefs = [1];
    for (let i = 0; i < script(n, RAISED); i++)
      coefs = [...coefs, 0].map((c, j) => c * b + (j ? coefs[j - 1] * a : 0));
    const target = coefs[power ? script(power, RAISED) : 1];
    return only(q.choices, (c) => evaluate(c) === target);
  },
} satisfies Checks;

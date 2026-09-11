import { only, type Asked, type Checks } from "../support/math.ts";

const NUMBER = String.raw`[1-9]\d{0,2}(?:,\d{3})*`;
const HALF = String.raw` \(halfway rounds up\)`;
const PLACES = new Map([
  ["ones", 1],
  ["tens", 10],
  ["hundreds", 100],
  ["thousands", 1000],
  ["ten thousands", 10000],
  ["hundred thousands", 100000],
  ["millions", 1000000],
]);

function value(text: string) {
  if (!new RegExp(`^${NUMBER}$`).test(text))
    throw new Error(`${text} is not a whole number grouped in threes`);
  return Number(text.replace(/,/g, ""));
}

function read(pattern: string, q: Asked) {
  const match = new RegExp(`^${pattern}$`).exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match.slice(1);
}

function nearest(n: number, unit: number) {
  const below = Math.floor(n / unit) * unit;
  return n - below < below + unit - n ? below : below + unit;
}

const equalTo = (target: number, q: Asked) =>
  only(q.choices, (c) => value(c) === target);

const rounded = (q: Asked) => {
  const [n, unit] = read(
    String.raw`Round (${NUMBER}) to the nearest (${NUMBER})\.${HALF}`,
    q,
  );
  return equalTo(nearest(value(n), value(unit)), q);
};

export default {
  1: (q) => {
    const [n, d] = read(
      String.raw`In (${NUMBER}), what is the value of the digit (\d)\?`,
      q,
    );
    const digits = String(value(n));
    const at = [...digits].flatMap((c, i) => (c === d ? [i] : []));
    if (at.length !== 1)
      throw new Error(`the digit ${d} appears ${at.length} times in ${n}`);
    return equalTo(Number(d) * 10 ** (digits.length - 1 - at[0]), q);
  },
  2: (q) => {
    const [sum] = read(String.raw`(.+) = \?`, q);
    const parts = sum.split(" + ").map((part) => {
      const match = /^(\d) (.+)$/.exec(part);
      const place = match ? PLACES.get(match[2]) : undefined;
      if (!match || place === undefined)
        throw new Error(`unreadable part ${part}`);
      return [Number(match[1]), place];
    });
    if (parts.some(([, place], i) => place !== 10 ** (parts.length - 1 - i)))
      throw new Error(`the places do not run down to the ones: ${sum}`);
    return equalTo(
      parts.reduce((total, [digit, place]) => total + digit * place, 0),
      q,
    );
  },
  3: (q) => {
    read(String.raw`Which is largest\?`, q);
    return equalTo(Math.max(...q.choices.map(value)), q);
  },
  4: rounded,
  5: rounded,
  6: (q) => {
    const [unit, verb, a, op, b] = read(
      String.raw`Round each to the nearest (${NUMBER}), then (add|subtract): (${NUMBER}) ([+−]) (${NUMBER}) ≈ \?${HALF}`,
      q,
    );
    if ((verb === "add") !== (op === "+"))
      throw new Error(`${verb} does not match ${op}`);
    const x = nearest(value(a), value(unit));
    const y = nearest(value(b), value(unit));
    return equalTo(op === "+" ? x + y : x - y, q);
  },
  7: (q) => {
    const [named, a, b] = read(
      String.raw`Round (each|${NUMBER}) to the nearest 10, then multiply: (${NUMBER}) × (${NUMBER}) ≈ \?${HALF}`,
      q,
    );
    if (named !== "each" && named !== a)
      throw new Error(`rounds ${named} but multiplies ${a}`);
    const y = named === "each" ? nearest(value(b), 10) : value(b);
    return equalTo(nearest(value(a), 10) * y, q);
  },
  8: (q) => {
    const [target, unit] = read(
      String.raw`Which number rounds to (${NUMBER}) at the nearest (${NUMBER})\?${HALF}`,
      q,
    );
    return only(
      q.choices,
      (c) => nearest(value(c), value(unit)) === value(target),
    );
  },
  9: (q) => {
    const [jump, dir, n] = read(
      String.raw`What is (${NUMBER}) (more|less) than (${NUMBER})\?`,
      q,
    );
    return equalTo(
      dir === "more" ? value(n) + value(jump) : value(n) - value(jump),
      q,
    );
  },
  10: (q) => {
    const [target, unit, end] = read(
      String.raw`A whole number rounds to (${NUMBER}) at the nearest (${NUMBER})\. What is the (smallest|largest) it could be\?${HALF}`,
      q,
    );
    const R = value(target);
    const H = value(unit);
    const band: number[] = [];
    for (let n = R - H; n <= R + H; n++) if (nearest(n, H) === R) band.push(n);
    return equalTo(end === "smallest" ? band[0] : band[band.length - 1], q);
  },
} satisfies Checks;

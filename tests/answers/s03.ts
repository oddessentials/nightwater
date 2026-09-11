import { evaluate, only, type Asked, type Checks } from "../support/math.ts";

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function count(text: string) {
  if (!/^\d+$/.test(text)) throw new Error(`${text} is not a whole number`);
  return Number(text);
}

const list = (text: string) => text.split(", ").map(count);
const gaps = (t: readonly number[]) => t.slice(1).map((v, i) => v - t[i]);

function same(values: readonly number[]) {
  if (values.some((v) => v !== values[0]))
    throw new Error(`${values.join(", ")} do not stay the same`);
  return values[0];
}

const equalTo = (target: number, q: Asked) =>
  only(q.choices, (c) => {
    if (count(c) < 1) throw new Error(`the choice ${c} is below 1`);
    return count(c) === target;
  });

const shown = (q: Asked) => list(read(/^What comes next\? (.+), \?$/, q)[1]);

const extend = (q: Asked) => {
  const t = shown(q);
  return equalTo(t[t.length - 1] + same(gaps(t)), q);
};

const suffix = (n: number) =>
  n % 100 >= 11 && n % 100 <= 13
    ? "th"
    : n % 10 === 1
      ? "st"
      : n % 10 === 2
        ? "nd"
        : n % 10 === 3
          ? "rd"
          : "th";

export default {
  1: extend,
  2: extend,
  3: (q) => {
    const [, ...found] = read(
      /^Find the missing number: (\d+), \?, (\d+), (\d+)$/,
      q,
    );
    const [first, third, fourth] = found.map(count);
    const step = fourth - third;
    const blank = third - step;
    if (blank - first !== step) throw new Error("the gaps do not match");
    for (const c of q.choices)
      if ([first, third, fourth].includes(count(c)))
        throw new Error(`the choice ${c} repeats a shown term`);
    return equalTo(blank, q);
  },
  4: (q) => {
    const t = shown(q);
    const factor = same(t.slice(1).map((v, i) => v / t[i]));
    return equalTo(t[t.length - 1] * factor, q);
  },
  5: (q) => {
    const t = list(read(/^Which rule makes (.+)\?$/, q)[1]);
    return only(q.choices, (c) => {
      const plus = /^Add (\d+) each time$/.exec(c);
      const times = /^Multiply by (\d+) each time$/.exec(c);
      if (!plus && !times) throw new Error(`unreadable rule ${c}`);
      const step = (v: number) =>
        plus ? v + Number(plus[1]) : v * Number(times![1]);
      return t.slice(1).every((v, i) => step(t[i]) === v);
    });
  },
  6: (q) => {
    const [, table, asked] = read(/^in → out: (.+), (\d+)→\?$/, q);
    const rows = table.split(", ").map((row) => row.split("→").map(count));
    const [[x1, y1], [x2, y2]] = rows;
    const times = (y2 - y1) / (x2 - x1);
    const plus = y1 - times * x1;
    if (rows.some(([x, y]) => times * x + plus !== y))
      throw new Error("no single rule fits the table");
    return equalTo(times * count(asked) + plus, q);
  },
  7: (q) => {
    const t = shown(q);
    const g = gaps(t);
    return equalTo(t[t.length - 1] + g[g.length - 1] + same(gaps(g)), q);
  },
  8: (q) => {
    const [t1, t2, t3, t4, t5] = shown(q);
    const plus = t2 - t1;
    const times = t3 / t2;
    if (!Number.isInteger(times) || t4 !== t3 + plus || t5 !== t4 * times)
      throw new Error("the two rules do not take turns");
    return equalTo(t5 + plus, q);
  },
  9: (q) => {
    const [, start, at, tail] = read(
      /^The pattern starts (.+), … What is the (\d+)(st|nd|rd|th) term\?$/,
      q,
    );
    const n = count(at);
    if (tail !== suffix(n)) throw new Error(`${at}${tail} is not an ordinal`);
    const t = list(start);
    const step = same(gaps(t));
    let term = t[0];
    for (let i = 1; i < n; i++) term += step;
    return equalTo(term, q);
  },
  10: (q) => {
    const t = list(
      read(/^The pattern is (.+), … Which rule gives term n\?$/, q)[1],
    );
    return only(q.choices, (c) =>
      t.every((v, i) => evaluate(c, { n: i + 1 }) === v),
    );
  },
} satisfies Checks;

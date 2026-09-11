import { only, type Asked, type Checks } from "../support/math.ts";

const GROUPED = String.raw`\d{1,3}(?:,\d{3})*`;
const MONEY = new RegExp(`^\\$(${GROUPED})\\.(\\d{2})$`);
const DECIMAL = new RegExp(`^(${GROUPED})(?:\\.(\\d?[1-9]))?$`);
const ONE: Record<string, number> = {
  "$1 bill": 100,
  quarter: 25,
  dime: 10,
  nickel: 5,
  penny: 1,
};
const MANY: Record<string, number> = {
  "$1 bills": 100,
  quarters: 25,
  dimes: 10,
  nickels: 5,
  pennies: 1,
};
const UNITS: Record<string, readonly [kind: string, size: number]> = {
  mm: ["length", 1],
  cm: ["length", 10],
  m: ["length", 1000],
  km: ["length", 1000000],
  in: ["inches", 1],
  ft: ["inches", 12],
  g: ["mass", 1],
  kg: ["mass", 1000],
  oz: ["ounces", 1],
  lb: ["ounces", 16],
  mL: ["capacity", 1],
  L: ["capacity", 1000],
  s: ["time", 1],
  min: ["time", 60],
  h: ["time", 3600],
};
const ADJECTIVE: Record<string, string> = {
  length: "longer",
  inches: "longer",
  time: "longer",
  mass: "heavier",
  ounces: "heavier",
  capacity: "more",
};

function read(pattern: RegExp, text: string) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`unexpected text: ${text}`);
  return match;
}

const plain = (digits: string) => Number(digits.replace(/,/g, ""));

function cents(text: string) {
  const [, dollars, rest] = read(MONEY, text);
  return plain(dollars) * 100 + Number(rest);
}

function clock(text: string) {
  const [, h, m, meridiem] = read(/^(1[0-2]|[1-9]):([0-5]\d) (AM|PM)$/, text);
  return (Number(h) % 12) * 60 + Number(m) + (meridiem === "PM" ? 720 : 0);
}

const halfOf = (minutes: number) => Math.floor(minutes / 720);

function span(text: string) {
  const [, h, m] = read(/^([1-9]\d*) h(?: ([1-9]|[1-5]\d) min)?$/, text);
  return Number(h) * 60 + Number(m ?? 0);
}

type Amount = { kind: string; top: number; bottom: number; units: string[] };

function amount(text: string): Amount {
  const words = text.split(" ");
  if (words.length % 2) throw new Error(`unreadable measure: ${text}`);
  const out: Amount = { kind: "", top: 0, bottom: 1, units: [] };
  for (let i = 0; i < words.length; i += 2) {
    const [, whole, places = ""] = read(DECIMAL, words[i]);
    const unit = UNITS[words[i + 1]];
    if (!unit) throw new Error(`unknown unit in ${text}`);
    if (out.kind && out.kind !== unit[0])
      throw new Error(`mixed kinds in ${text}`);
    const scale = 10 ** places.length;
    const value = (plain(whole) * scale + Number(places || 0)) * unit[1];
    out.top = out.top * scale + value * out.bottom;
    out.bottom *= scale;
    out.kind = unit[0];
    out.units.push(words[i + 1]);
  }
  return out;
}

const order = (a: Amount, b: Amount) =>
  Math.sign(a.top * b.bottom - b.top * a.bottom);

function proper(text: string) {
  const words = text.split(" ");
  if (words.length === 2) return true;
  const [big, small] = [UNITS[words[1]][1], UNITS[words[3]][1]];
  return (
    /^\d+$/.test(words[0]) &&
    /^\d+$/.test(words[2]) &&
    big > small &&
    Number(words[2]) < big / small
  );
}

function converted(q: Asked) {
  const [, given, asked] = read(/^(.+) = (\? .+)$/, q.prompt);
  const want = amount(given);
  const units = asked.split(" ").filter((word) => word !== "?");
  if (asked !== units.map((unit) => `? ${unit}`).join(" "))
    throw new Error(`unreadable question: ${q.prompt}`);
  return only(q.choices, (c) => {
    const got = amount(c);
    return (
      got.units.join(" ") === units.join(" ") &&
      proper(c) &&
      order(got, want) === 0
    );
  });
}

export default {
  1: (q) => {
    const [, list] = read(/^How much money is (.+)\?$/, q.prompt);
    const [, head, last] = read(/^(.+) and ([^,]+)$/, list);
    let total = 0;
    for (const part of [...head.split(", "), last]) {
      const [, count, thing] = read(/^(\d+) (.+)$/, part);
      const n = Number(count);
      const value = n === 1 ? ONE[thing] : MANY[thing];
      if (value === undefined) throw new Error(`unreadable part: ${part}`);
      total += n * value;
    }
    return only(q.choices, (c) => cents(c) === total);
  },
  2: (q) => {
    const [, start, length] = read(
      /^A [a-z]+ starts at (.+) and lasts (.+)\. What time does it end\?$/,
      q.prompt,
    );
    const from = clock(start);
    if (q.choices.some((c) => halfOf(clock(c)) !== halfOf(from)))
      throw new Error("a choice leaves the start's half of the day");
    return only(q.choices, (c) => clock(c) === from + span(length));
  },
  3: converted,
  4: (q) => {
    const [, price, bill] = read(
      /^A [a-z]+ costs (\S+)\. You pay with a \$(\d+) bill\. How much change\?$/,
      q.prompt,
    );
    const change = Number(bill) * 100 - cents(price);
    return only(q.choices, (c) => cents(c) === change);
  },
  5: (q) => {
    const [, start, end] = read(
      /^A [a-z]+ starts at (.+) and ends at (.+)\. How long is it\?$/,
      q.prompt,
    );
    const length = clock(end) - clock(start);
    if (length <= 0) throw new Error("the end is not after the start");
    return only(q.choices, (c) => span(c) === length);
  },
  6: converted,
  7: (q) => {
    const [, adjective, first, second] = read(
      /^Which is (longer|heavier|more): (.+) or (.+)\?$/,
      q.prompt,
    );
    const a = amount(first);
    const b = amount(second);
    if (a.kind !== b.kind || ADJECTIVE[a.kind] !== adjective)
      throw new Error(`"${adjective}" does not fit ${first} and ${second}`);
    const want =
      order(a, b) > 0 ? first : order(a, b) < 0 ? second : "They are equal.";
    return only(q.choices, (c) => c === want);
  },
  8: (q) => {
    const [, k, price, bill] = read(
      /^[A-Z][a-z]+ buys (\d+) [a-z]+ at (\S+) each and pays with a \$(\d+) bill\. How much change\?$/,
      q.prompt,
    );
    const change = Number(bill) * 100 - Number(k) * cents(price);
    return only(q.choices, (c) => cents(c) === change);
  },
  9: (q) => {
    const [, start, length] = read(
      /^It is (.+)\. What time will it be (.+) later\?$/,
      q.prompt,
    );
    const from = clock(start);
    const minutes = span(length);
    if (minutes < 65 || minutes > 355)
      throw new Error("the duration is outside 1 h 5 min to 5 h 55 min");
    const end = (from + minutes) % 1440;
    if (halfOf(end) === halfOf(from))
      throw new Error("the answer stays in the start's half of the day");
    return only(q.choices, (c) => clock(c) === end);
  },
  10: (q) => {
    const [, first, second] = read(
      /^Which is the better buy: (.+) or (.+)\?$/,
      q.prompt,
    );
    const offer = (text: string) => {
      const [, n, price] = read(/^(\d+) [a-z]+ for (\S+)$/, text);
      return { n: Number(n), c: cents(price) };
    };
    const a = offer(first);
    const b = offer(second);
    const cmp = Math.sign(a.c * b.n - b.c * a.n);
    const want =
      cmp < 0 ? first : cmp > 0 ? second : "They are the same value.";
    return only(q.choices, (c) => c === want);
  },
} satisfies Checks;

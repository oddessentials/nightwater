import { only, type Asked, type Checks } from "../support/math.ts";

type Exact = readonly [number, number];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
function exact(n: number, d: number): Exact {
  const g = gcd(n, d) * Math.sign(d);
  return [n / g, d / g];
}
const same = (a: Exact, b: Exact) => a[0] * b[1] === b[0] * a[1];
const above = (a: Exact, b: Exact) => a[0] * b[1] > b[0] * a[1];
const plus = (a: Exact, b: Exact) =>
  exact(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const minus = (a: Exact, b: Exact) => plus(a, [-b[0], b[1]]);
const times = (a: Exact, b: Exact) => exact(a[0] * b[0], a[1] * b[1]);
const divide = (a: Exact, b: Exact) => exact(a[0] * b[1], a[1] * b[0]);
const floorDiv = (a: number, b: number) => (a - (a % b)) / b;

function decimal(text: string): Exact {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error(`not a plain decimal: ${text}`);
  const tail = match[2] ?? "";
  if (tail.endsWith("0")) throw new Error(`${text} has a trailing zero`);
  return exact(Number(match[1] + tail), 10 ** tail.length);
}
function fixedPlaces(text: string, places: number): Exact {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  const tail = match?.[2] ?? "";
  if (!match || tail.length !== places)
    throw new Error(`${text} is not written to ${places} places`);
  return exact(Number(match[1] + tail), 10 ** places);
}
function percent(text: string): Exact {
  if (!text.endsWith("%")) throw new Error(`not a percent: ${text}`);
  return decimal(text.slice(0, -1));
}
function cash(text: string): Exact {
  if (!text.startsWith("$")) throw new Error(`not money: ${text}`);
  return fixedPlaces(text.slice(1), 2);
}
function fraction(text: string): Exact {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (!match) throw new Error(`not a fraction: ${text}`);
  const n = Number(match[1]);
  const d = Number(match[2]);
  if (gcd(n, d) !== 1) throw new Error(`${text} is not in lowest terms`);
  return [n, d];
}

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}
const fits = (q: Asked, parse: (text: string) => Exact, target: Exact) =>
  only(q.choices, (c) => same(parse(c), target));

export default {
  1: (q) => {
    const [, whole, tail, digit] = read(
      /^In (\d+)\.(\d+), what is the value of the digit (\d)\?$/,
      q,
    );
    if ((whole + tail).split(digit).length !== 2)
      throw new Error(`the digit ${digit} is not unique`);
    const at = tail.indexOf(digit) + 1;
    if (!at) throw new Error(`${digit} is not after the point`);
    return fits(q, decimal, exact(Number(digit), 10 ** at));
  },
  2: (q) => {
    if (q.prompt !== "Which is largest?")
      throw new Error(`unexpected prompt: ${q.prompt}`);
    const values = q.choices.map(decimal);
    const top = values.reduce((best, v) => (above(v, best) ? v : best));
    return fits(q, decimal, top);
  },
  3: (q) => {
    const toDecimal = /^Write (\d+)\/(\d+) as a decimal\.$/.exec(q.prompt);
    if (toDecimal)
      return fits(
        q,
        decimal,
        exact(Number(toDecimal[1]), Number(toDecimal[2])),
      );
    const [, x] = read(/^Write (\S+) as a fraction in lowest terms\.$/, q);
    return fits(q, fraction, decimal(x));
  },
  4: (q) => {
    const [, a, op, b] = read(/^What is (\S+) ([+−]) (\S+)\?$/, q);
    const [x, y] = [decimal(a), decimal(b)];
    return fits(q, decimal, op === "+" ? plus(x, y) : minus(x, y));
  },
  5: (q) => {
    const [, a, op, b] = read(/^What is (\S+) ([×÷]) (\S+)\?$/, q);
    const [x, y] = [decimal(a), decimal(b)];
    return fits(q, decimal, op === "×" ? times(x, y) : divide(x, y));
  },
  6: (q) => {
    const [, n, place] = read(
      /^Round (\S+) to the nearest (whole number|tenth|hundredth)\. \(halfway rounds up\)$/,
      q,
    );
    const e = ["whole number", "tenth", "hundredth"].indexOf(place);
    const [top, bottom] = decimal(n);
    const scale = 10 ** e;
    const rounded = floorDiv(2 * top * scale + bottom, 2 * bottom);
    return fits(q, (c) => fixedPlaces(c, e), exact(rounded, scale));
  },
  7: (q) => {
    const toDecimal = /^Write (\S+)% as a decimal\.$/.exec(q.prompt);
    if (toDecimal)
      return fits(q, decimal, divide(decimal(toDecimal[1]), [100, 1]));
    const fromFraction = /^Write (\d+)\/(\d+) as a percent\.$/.exec(q.prompt);
    if (fromFraction)
      return fits(
        q,
        percent,
        exact(100 * Number(fromFraction[1]), Number(fromFraction[2])),
      );
    const [, x] = read(/^Write (\S+) as a percent\.$/, q);
    return fits(q, percent, times(decimal(x), [100, 1]));
  },
  8: (q) => {
    const of = /^What is (\d+)% of (\d+)\?$/.exec(q.prompt);
    if (of)
      return fits(q, decimal, exact(Number(of[1]) * Number(of[2]), 100));
    const [, , price, off] = read(
      /^A (\w+) is marked \$(\d+)\. It is (\d+)% off\. What is the sale price\?$/,
      q,
    );
    return fits(q, cash, exact(Number(price) * (100 - Number(off)), 100));
  },
  9: (q) => {
    const share = /^(\d+) is what percent of (\d+)\?$/.exec(q.prompt);
    if (share)
      return fits(q, percent, exact(100 * Number(share[1]), Number(share[2])));
    const [, p, a] = read(
      /^(\d+)% of a number is (\d+)\. What is the number\?$/,
      q,
    );
    return fits(q, decimal, exact(100 * Number(a), Number(p)));
  },
  10: (q) => {
    const priced =
      /^A (\w+) costs \$(\d+)\. The price (?:goes up (\d+)%, then (\d+)% comes off|drops (\d+)%, then (\d+)% is added to) the new price\. What is the final price\?$/.exec(
        q.prompt,
      );
    if (priced) {
      const start = Number(priced[2]);
      const up = priced[3] !== undefined;
      const first = up ? 100 + Number(priced[3]) : 100 - Number(priced[5]);
      const second = up ? 100 - Number(priced[4]) : 100 + Number(priced[6]);
      return fits(q, cash, exact(start * first * second, 10000));
    }
    const [, a, way, b, kind] = read(
      /^(\d+) (rises|falls) to (\d+)\. What is the percent (increase|decrease)\?$/,
      q,
    );
    const from = Number(a);
    const to = Number(b);
    const rises = way === "rises";
    if (to > from !== rises || rises !== (kind === "increase"))
      throw new Error("the direction words disagree");
    return fits(q, percent, exact(100 * Math.abs(to - from), from));
  },
} satisfies Checks;

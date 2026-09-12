import { only, type Asked, type Checks } from "../support/math.ts";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function prime(n: number) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match.slice(1).map(Number);
}

function count(text: string) {
  if (!/^[1-9]\d*$/.test(text)) throw new Error(`not a whole number: ${text}`);
  return Number(text);
}

function firstCommonMultiple(a: number, b: number) {
  let m = 1;
  while (m % a || m % b) m++;
  return m;
}

function greatestCommonFactor(a: number, b: number) {
  let d = Math.min(a, b);
  while (a % d || b % d) d--;
  return d;
}

function factorization(text: string) {
  let value = 1;
  let previous = 1;
  for (const part of text.split(" · ")) {
    const match = /^(\d+)(?:\^(\d+))?$/.exec(part);
    if (!match) throw new Error(`unreadable factor ${part} in ${text}`);
    const p = Number(match[1]);
    const e = match[2] === undefined ? 1 : Number(match[2]);
    if (!prime(p) || p <= previous || (match[2] !== undefined && e < 2))
      throw new Error(`${text} is not a prime factorization`);
    previous = p;
    for (let i = 0; i < e; i++) value *= p;
  }
  return value;
}

const BUS =
  /^The [a-z]+ bus comes every (\d+) minutes and the [a-z]+ bus every (\d+) minutes\. Both are at the stop now\. In how many minutes will they both be at the stop again\?$/;
const CUT =
  /^[A-Z][a-z]+ has a [a-z]+ (\d+) cm long and another (\d+) cm long, and cuts both into equal pieces, as long as possible, with none left over\. How long is each piece\?$/;

const equalTo = (target: number, q: Asked) =>
  only(q.choices, (c) => count(c) === target);

export default {
  1: (q) => {
    const [n] = read(/^Which is a multiple of (\d+)\?$/, q);
    return only(q.choices, (c) => count(c) % n === 0);
  },
  2: (q) => {
    const [n] = read(/^Which is a factor of (\d+)\?$/, q);
    return only(q.choices, (c) => n % count(c) === 0);
  },
  3: (q) => {
    const [n] = read(/^How many factors does (\d+) have\?$/, q);
    let total = 0;
    for (let d = 1; d <= n; d++) if (n % d === 0) total++;
    return equalTo(total, q);
  },
  4: (q) => {
    read(/^Which is prime\?$/, q);
    return only(q.choices, (c) => prime(count(c)));
  },
  5: (q) => {
    const [k] = read(/^Which is divisible by (\d+)\?$/, q);
    if (new Set(q.choices.map((c) => c.length)).size !== 1)
      throw new Error("the choices differ in length");
    return only(q.choices, (c) => count(c) % k === 0);
  },
  6: (q) => {
    const [a, b] = read(
      /^What is the smallest number that is a multiple of both (\d+) and (\d+)\?$/,
      q,
    );
    return equalTo(firstCommonMultiple(a, b), q);
  },
  7: (q) => {
    const [a, b] = read(
      /^What is the greatest common factor of (\d+) and (\d+)\?$/,
      q,
    );
    return equalTo(greatestCommonFactor(a, b), q);
  },
  8: (q) => {
    const [n] = read(/^What is the prime factorization of (\d+)\?$/, q);
    return only(q.choices, (c) => factorization(c) === n);
  },
  9: (q) => {
    const bus = BUS.exec(q.prompt);
    if (bus) {
      const [a, b] = bus.slice(1).map(Number);
      return equalTo(firstCommonMultiple(a, b), q);
    }
    const [a, b] = read(CUT, q);
    const target = greatestCommonFactor(a, b);
    return only(q.choices, (c) => {
      const match = /^(\d+) cm$/.exec(c);
      if (!match) throw new Error(`not a length in cm: ${c}`);
      return count(match[1]) === target;
    });
  },
  10: (q) => {
    const [g, l, a] = read(
      /^Two numbers have a greatest common factor of (\d+) and a least common multiple of (\d+)\. One of the numbers is (\d+)\. What is the other\?$/,
      q,
    );
    return only(q.choices, (c) => {
      const x = count(c);
      const shared = gcd(a, x);
      return shared === g && (a / shared) * x === l;
    });
  },
} satisfies Checks;

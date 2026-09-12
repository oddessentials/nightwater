import { digits, only, type Asked, type Checks } from "../support/math.ts";

type Frac = readonly [number, number];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const BANDS: Record<string, Frac> = {
  cyclist: [15, 35],
  ferry: [25, 50],
  bus: [30, 70],
  coach: [40, 90],
  train: [50, 120],
};

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function decimal(text: string): Frac {
  const match = /^([\d,]+)(?:\.([1-9]))?$/.exec(text);
  if (!match) throw new Error(`${text} is not a whole number or tenths`);
  return match[2] ? [digits(match[1] + match[2]), 10] : [digits(match[1]), 1];
}

function amount(text: string, unit: string): Frac {
  const match = /^(\S+) (.+)$/.exec(text);
  if (!match || match[2] !== unit) throw new Error(`${text} is not in ${unit}`);
  return decimal(match[1]);
}

function cents(text: string) {
  const match = /^\$([\d,]+)\.(\d\d)$/.exec(text);
  if (!match) throw new Error(`${text} is not an amount of money`);
  return digits(match[1]) * 100 + Number(match[2]);
}

function parts(text: string): Frac {
  const match = /^(\d+) : (\d+)$/.exec(text);
  if (!match) throw new Error(`${text} is not a ratio`);
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a < 1 || b < 1 || gcd(a, b) !== 1)
    throw new Error(`${text} is not in lowest terms`);
  return [a, b];
}

const equal = ([a, b]: Frac, [c, d]: Frac) => a * d === b * c;
const within = (gap: number, low: number) => 20 * gap >= low && 4 * gap <= low;

function banded(vehicle: string, [top, bottom]: Frac) {
  const band = BANDS[vehicle];
  if (!band || top < band[0] * bottom || top > band[1] * bottom)
    throw new Error(`a ${vehicle} does not go ${top / bottom} km/h`);
}

export default {
  1: (q) => {
    const [, a, X, b, Y, P, Q] = read(
      /^There are (\d+) (.+?) and (\d+) (.+?)\. What is the ratio of (.+?) to (.+?)\?$/,
      q,
    );
    const count = new Map([
      [X, Number(a)],
      [Y, Number(b)],
    ]);
    const first = count.get(P);
    const second = count.get(Q);
    if (first === undefined || second === undefined || P === Q)
      throw new Error("the ratio does not name the two counted groups");
    return only(q.choices, (c) => equal(parts(c), [first, second]));
  },
  2: (q) => {
    const [, A, B] = read(/^Write (\d+) : (\d+) in its simplest form\.$/, q);
    return only(q.choices, (c) => equal(parts(c), [Number(A), Number(B)]));
  },
  3: (q) => {
    const price =
      /^(\d+) (\w+) cost (\$\d+\.\d\d)\. What does one cost\?$/.exec(q.prompt);
    if (price) {
      const total = cents(price[3]);
      return only(q.choices, (c) => cents(c) * Number(price[1]) === total);
    }
    const speed =
      /^A (\w+) travels ([\d,]+) km in (\d+) hours\. What is the speed\?$/.exec(
        q.prompt,
      );
    if (speed) {
      const rate: Frac = [digits(speed[2]), Number(speed[3])];
      banded(speed[1], rate);
      return only(q.choices, (c) => equal(amount(c, "km/h"), rate));
    }
    const typing =
      /^(\w+) types (\d+) words in (\d+) minutes\. What is \1's rate\?$/.exec(
        q.prompt,
      );
    if (typing)
      return only(q.choices, (c) =>
        equal(amount(c, "words per minute"), [
          Number(typing[2]),
          Number(typing[3]),
        ]),
      );
    const [, , pages, hours] = read(
      /^(\w+) reads (\d+) pages in (\d+) hours\. How many pages per hour\?$/,
      q,
    );
    return only(q.choices, (c) =>
      equal(amount(c, "pages per hour"), [Number(pages), Number(hours)]),
    );
  },
  4: (q) => {
    const [, a, unit, , b, , c] = read(
      /^A (?:recipe|paint mix|punch) uses (\d+) (cups|tins) of (.+?) for every (\d+) \2 of (.+?)\. How many \2 of \5 are needed for (\d+) \2 of \3\?$/,
      q,
    );
    return only(q.choices, (choice) => {
      const [n, d] = amount(choice, unit);
      return n * Number(a) === Number(b) * Number(c) * d;
    });
  },
  5: (q) => {
    const [, total, , first, second, p, r, who] = read(
      /^(\d+) (\w+) are shared between (\w+) and (\w+) in the ratio (\d+) : (\d+)\. How many does (\w+) get\?$/,
      q,
    );
    if (first === second || (who !== first && who !== second))
      throw new Error(`${who} is not one of the two sharers`);
    const [mine, theirs] =
      who === first ? [Number(p), Number(r)] : [Number(r), Number(p)];
    return only(q.choices, (c) => {
      const [share, one] = decimal(c);
      const rest = Number(total) - share;
      return one === 1 && rest > 0 && share * theirs === rest * mine;
    });
  },
  6: (q) => {
    const value =
      /^Which is better value: ((\d+) (.+?) for (\$\d+\.\d\d)), or ((\d+) (.+?) for (\$\d+\.\d\d))\?$/.exec(
        q.prompt,
      );
    let options: string[];
    let order: number;
    if (value) {
      const [, first, n1, item, c1, second, n2, again, c2] = value;
      const [a, b, x, y] = [Number(n1), Number(n2), cents(c1), cents(c2)];
      if (item !== again || a >= b || x >= y || y > 3000 || x % a || y % b)
        throw new Error("the two offers break the pack rules");
      const [u, w] = [x / a, y / b];
      if ([u, w].some((p) => p % 5 || p < 40 || p > 300))
        throw new Error("a unit price is off the 5¢ grid");
      if (
        Math.floor((u + 5) / 10) !== Math.floor((w + 5) / 10) ||
        (u !== w && !within(Math.abs(u - w), Math.min(u, w)))
      )
        throw new Error("the unit prices are not a close call");
      order = Math.sign(w - u);
      options = [first, second, "They are the same value."];
    } else {
      const [, first, verb, x1, noun, t1, second, x2, t2] = read(
        /^(\w+) (reads|swims) (\d+) (pages|laps) in (\d+) minutes\. (\w+) \2 (\d+) \4 in (\d+) minutes\. Who \2 faster\?$/,
        q,
      );
      const [p1, m1, p2, m2] = [x1, t1, x2, t2].map(Number);
      if (
        first === second ||
        (verb === "reads") !== (noun === "pages") ||
        m1 >= m2 ||
        p1 >= p2 ||
        (10 * p1) % m1 ||
        (10 * p2) % m2
      )
        throw new Error("the two efforts break the rules");
      const half = (p: number, m: number) => Math.floor((4 * p + m) / (2 * m));
      const gap = Math.abs(p1 * m2 - p2 * m1);
      if (
        half(p1, m1) !== half(p2, m2) ||
        (gap && !within(gap, Math.min(p1 * m2, p2 * m1)))
      )
        throw new Error("the two rates are not a close call");
      order = Math.sign(p1 * m2 - p2 * m1);
      options = [first, second, `They ${verb.slice(0, -1)} at the same rate.`];
    }
    if ([...q.choices].sort().join("|") !== [...options].sort().join("|"))
      throw new Error("the choices are not the two options and a tie");
    const want = order > 0 ? options[0] : order < 0 ? options[1] : options[2];
    return only(q.choices, (c) => c === want);
  },
  7: (q) => {
    const [, a, b, d] = read(/^What is x\? +(\d+)\/(\d+) = x\/(\d+)$/, q);
    if (q.choices.some((c) => !c.endsWith(".5")))
      throw new Error("a choice does not end in .5");
    return only(q.choices, (c) =>
      equal(decimal(c), [Number(a) * Number(d), Number(b)]),
    );
  },
  8: (q) => {
    const [, S, , m] = read(
      /^On a map, 1 cm represents (\d+) km\. A (\w+) measures (\d+\.[1-9]) cm on the map\. How long is the real \2\?$/,
      q,
    );
    const [top, bottom] = decimal(m);
    return only(q.choices, (c) =>
      equal(amount(c, "km"), [top * Number(S), bottom]),
    );
  },
  9: (q) => {
    const far =
      /^A (\w+) travels for (\d+) minutes at (\d+) km\/h\. How far is the trip\?$/.exec(
        q.prompt,
      );
    if (far) {
      const [t, r] = [Number(far[2]), Number(far[3])];
      banded(far[1], [r, 1]);
      return only(q.choices, (c) => {
        const [n, d] = amount(c, "km");
        return 60 * n === r * t * d;
      });
    }
    const long =
      /^A (\w+) covers (\d+) km at (\d+) km\/h\. How many minutes does the trip take\?$/.exec(
        q.prompt,
      );
    if (long) {
      const [dist, r] = [Number(long[2]), Number(long[3])];
      banded(long[1], [r, 1]);
      return only(q.choices, (c) => {
        const [n, d] = amount(c, "min");
        return n * r === 60 * dist * d;
      });
    }
    const [, vehicle, dist, t] = read(
      /^A (\w+) covers (\d+) km in (\d+) minutes\. What is the speed in km\/h\?$/,
      q,
    );
    banded(vehicle, [60 * Number(dist), Number(t)]);
    return only(q.choices, (c) => {
      const [n, d] = amount(c, "km/h");
      return n * Number(t) === 60 * Number(dist) * d;
    });
  },
  10: (q) => {
    const [, n1, , d1, unit, n2] = read(
      /^(\d+) (\w+) take (\d+) (days|minutes|hours) to (?:paint a hall|fill a tank|print an order|clear a field)\. At the same rate, how long would (\d+) \2 take\?$/,
      q,
    );
    return only(q.choices, (c) => {
      const match = /^(\d+) (\w+)$/.exec(c);
      if (!match) throw new Error(`${c} is not a length of time`);
      const time = Number(match[1]);
      if (match[2] !== (time === 1 ? unit.slice(0, -1) : unit))
        throw new Error(`${c} is not in ${unit}`);
      return Number(n2) * time === Number(n1) * Number(d1);
    });
  },
} satisfies Checks;

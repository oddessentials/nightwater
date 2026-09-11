import {
  close,
  evaluate,
  only,
  parse,
  type Asked,
  type Checks,
} from "../support/math.ts";

const PROBES = [0.93, 1.1, 2.13, 2.88];

const range = (lo: number, hi: number) =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

const agrees = (text: string, want: (v: number) => number, name = "x") => {
  const node = parse(text);
  return PROBES.every((v) => close(node({ [name]: v }), want(v)));
};

const equivalent = (q: Asked, given: string) => {
  const node = parse(given);
  return only(q.choices, (c) => agrees(c, (x) => node({ x })));
};

const solves = (q: Asked) => {
  const [left, right] = read(/^Solve (.+)\.$/, q)[1]
    .split(" = ")
    .map((side) => parse(side));
  return only(q.choices, (c) => {
    const value = /^x = (\S+)$/.exec(c);
    if (!value) throw new Error(`unreadable solution ${c}`);
    const x = evaluate(value[1]);
    return close(left({ x }), right({ x }));
  });
};

const PHRASES: [RegExp, (a: number, b: number, n: number) => number][] = [
  [/^(\d+) less than (\d+) times a number n$/, (k, m, n) => m * n - k],
  [/^(\d+) more than (\d+) times a number n$/, (k, m, n) => m * n + k],
  [/^(\d+) times the sum of a number n and (\d+)$/, (m, k, n) => m * (n + k)],
  [
    /^the quotient of a number n and (\d+), increased by (\d+)$/,
    (k, m, n) => n / k + m,
  ],
];

function story(text: string) {
  const shop =
    /^[A-Z][a-z]+ buys (\d+) [A-Za-z -]+? and (?:pays an? \$(\d+) (?:booking fee|delivery charge|postage charge)|uses an? \$(\d+) voucher)\. The total is \$(\d+)\. (.+)$/.exec(
      text,
    );
  if (shop)
    return {
      rate: Number(shop[1]),
      fixed: shop[2] ? Number(shop[2]) : -Number(shop[3]),
      total: Number(shop[4]),
      ask: shop[5],
    };
  const hire =
    /^A (?:taxi|plumber) charges (?:an? \$(\d+) (?:pick-up|call-out) fee plus \$(\d+) (?:per km|an hour)|\$(\d+) (?:per km|an hour) and takes \$(\d+) off for members)\. [A-Z][a-z]+ paid \$(\d+) in total\. (.+)$/.exec(
      text,
    );
  if (!hire) throw new Error(`unexpected story: ${text}`);
  return {
    rate: Number(hire[2] ?? hire[3]),
    fixed: hire[1] ? Number(hire[1]) : -Number(hire[4]),
    total: Number(hire[5]),
    ask: hire[6],
  };
}

function amount(text: string, unit: string) {
  const match =
    unit === "$"
      ? /^\$(\d+)$/.exec(text)
      : unit === "km"
        ? /^(\d+) km$/.exec(text)
        : /^(\d+) hours?$/.exec(text);
  if (!match) throw new Error(`${text} is not in ${unit}`);
  const value = Number(match[1]);
  if (unit === "hours" && (value === 1) !== text.endsWith(" hour"))
    throw new Error(`${text} has the wrong plural`);
  return value;
}

export default {
  1: (q) => {
    const [, body, at] = read(/^What is (.+) when x = (\S+)\?$/, q);
    const target = evaluate(body, { x: evaluate(at) });
    return only(q.choices, (c) => close(evaluate(c), target));
  },
  2: (q) => {
    const [, phrase] = read(/^Which expression means "(.+)"\?$/, q);
    for (const [pattern, meaning] of PHRASES) {
      const hit = pattern.exec(phrase);
      if (hit)
        return only(q.choices, (c) =>
          agrees(c, (n) => meaning(Number(hit[1]), Number(hit[2]), n), "n"),
        );
    }
    throw new Error(`unknown phrase: ${phrase}`);
  },
  3: (q) => equivalent(q, read(/^Simplify (.+)\.$/, q)[1]),
  4: (q) => equivalent(q, read(/^Expand (.+)\.$/, q)[1]),
  5: solves,
  6: solves,
  7: solves,
  8: (q) => {
    const { rate, fixed, total, ask } = story(q.prompt);
    const fits = range(1, 1000).filter((x) => rate * x + fixed === total);
    if (fits.length !== 1) throw new Error(`${fits.length} amounts fit`);
    const [x] = fits;
    if (
      /^Which equation gives the (?:price x of one [A-Za-z -]+|number of (?:km|hours) x)\?$/.test(
        ask,
      )
    )
      return only(q.choices, (c) => {
        const sides = /^(.+) = (\d+)$/.exec(c);
        if (!sides) throw new Error(`unreadable equation ${c}`);
        return close(evaluate(sides[1], { x }), Number(sides[2]));
      });
    const unit = /^What does one [A-Za-z -]+ cost\?$/.test(ask)
      ? "$"
      : /^How many (km|hours) was the (?:ride|job)\?$/.exec(ask)?.[1];
    if (!unit) throw new Error(`unexpected question: ${ask}`);
    return only(q.choices, (c) => amount(c, unit) === x);
  },
  9: solves,
  10: (q) => {
    const run =
      /^(Three|Five) consecutive (whole|even|odd) numbers add up to (\d+)\. What is the (smallest|largest)\?$/.exec(
        q.prompt,
      );
    if (run) {
      const size = run[1] === "Three" ? 3 : 5;
      const gap = run[2] === "whole" ? 1 : 2;
      const runs = range(0, 500)
        .filter(
          (s) => run[2] === "whole" || s % 2 === (run[2] === "even" ? 0 : 1),
        )
        .map((s) => range(0, size - 1).map((i) => s + i * gap))
        .filter(
          (list) => list.reduce((sum, v) => sum + v, 0) === Number(run[3]),
        );
      if (runs.length !== 1) throw new Error(`${runs.length} runs fit`);
      const want = run[4] === "smallest" ? runs[0][0] : runs[0][size - 1];
      return only(q.choices, (c) => Number(c) === want);
    }
    const [, older, gap, younger, ahead, later, back, earlier, asked] = read(
      /^([A-Z][a-z]+) is (\d+) years older than ([A-Z][a-z]+)\. (?:In (\d+) years their ages will add up to (\d+)|(\d+) years ago their ages added up to (\d+))\. How old is ([A-Z][a-z]+) now\?$/,
      q,
    );
    if (older === younger) throw new Error("the two people share a name");
    const shift = ahead ? Number(ahead) : -Number(back);
    const total = Number(ahead ? later : earlier);
    const fits = range(1, 200).filter(
      (y) => y + shift >= 1 && 2 * (y + shift) + Number(gap) === total,
    );
    if (fits.length !== 1) throw new Error(`${fits.length} ages fit`);
    const want =
      asked === older
        ? fits[0] + Number(gap)
        : asked === younger
          ? fits[0]
          : Number.NaN;
    return only(q.choices, (c) => Number(c) === want);
  },
} satisfies Checks;

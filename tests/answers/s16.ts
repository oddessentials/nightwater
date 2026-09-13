import { digits, only, type Asked, type Checks } from "../support/math.ts";

type Frac = readonly [number, number];

const WORD: Record<string, number> = { three: 3, four: 4, five: 5, six: 6 };
const NTH: Record<string, number> = { fourth: 4, fifth: 5, sixth: 6 };
const PLACES = ["first", "second", "third", "fourth"];
const DEVICE =
  "a fair coin is flipped|a fair die is rolled|a spinner with \\d+ equal sections, \\d+ of them \\w+, is spun";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const sum = (v: readonly number[]) => v.reduce((t, x) => t + x, 0);
const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function read(pattern: RegExp, text: string) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`unexpected text: ${text}`);
  return match;
}

function value(text: string): Frac {
  const [, top, bottom] = read(/^([\d,]+)(?:\/([\d,]+))?$/, text);
  const n = digits(top);
  const d = bottom === undefined ? 1 : digits(bottom);
  if (d < 2 && bottom !== undefined)
    throw new Error(`${text} is not a fraction`);
  if (gcd(n, d) !== 1) throw new Error(`${text} is not in lowest terms`);
  return [n, d];
}

function counts(q: Asked) {
  for (const c of q.choices)
    if (!/^[1-9]\d{0,2}(?:,\d{3})*$/.test(c))
      throw new Error(`${c} is not a whole count`);
}

function chances(q: Asked) {
  for (const c of q.choices) {
    const [n, d] = value(c);
    if (d < 2 || n < 1 || n >= d)
      throw new Error(`${c} is not strictly between 0 and 1`);
  }
}

const fits = (q: Asked, [n, d]: Frac) =>
  only(q.choices, (c) => {
    const [cn, cd] = value(c);
    return cn * d === n * cd;
  });

const numbers = (text: string) =>
  text.split(/, | and /).map((part) => Number(read(/^(\d+)$/, part)[1]));

function bagOf(parts: readonly (readonly [number, string])[]) {
  return parts.flatMap(([count, colour]) => Array<string>(count).fill(colour));
}

function outcomes(device: string) {
  if (device === "a fair coin is flipped") return ["heads", "tails"];
  if (device === "a fair die is rolled") return ["1", "2", "3", "4", "5", "6"];
  const [, n, a, colour] = read(
    /^a spinner with (\d+) equal sections, (\d+) of them (\w+), is spun$/,
    device,
  );
  return upTo(Number(n)).map((i) =>
    i <= Number(a) ? colour : "another colour",
  );
}

function holds(event: string, outcome: string) {
  const face = /^\d$/.test(outcome) ? Number(outcome) : null;
  const single = /^a (\d)$/.exec(event);
  if (single) return face === Number(single[1]);
  const parity = /^an (even|odd) number$/.exec(event);
  if (parity)
    return face !== null && (face % 2 === 0) === (parity[1] === "even");
  const above = /^a number greater than (\d)$/.exec(event);
  if (above) return face !== null && face > Number(above[1]);
  const below = /^a number less than (\d)$/.exec(event);
  if (below) return face !== null && face < Number(below[1]);
  return outcome === event;
}

function tuples(sizes: readonly number[]) {
  let out: number[][] = [[]];
  for (const size of sizes)
    out = out.flatMap((t) => upTo(size).map((x) => [...t, x]));
  return out.length;
}

function arrangements(n: number, r: number, ordered: boolean) {
  let found = 0;
  const walk = (picked: number[]) => {
    if (picked.length === r) {
      found++;
      return;
    }
    for (let x = 1; x <= n; x++)
      if (
        !picked.includes(x) &&
        (ordered || !picked.length || x > picked[picked.length - 1])
      )
        walk([...picked, x]);
  };
  walk([]);
  return found;
}

export default {
  1: (q) => {
    counts(q);
    const v = read(/^What is the mean of (.+)\?$/, q.prompt)[1]
      .split(", ")
      .map(Number);
    return fits(q, [sum(v), v.length]);
  },
  2: (q) => {
    counts(q);
    const [, stat, list] = read(
      /^What is the (median|mode|range) of (.+)\?$/,
      q.prompt,
    );
    const v = list.split(", ").map(Number);
    const s = [...v].sort((a, b) => a - b);
    const h = Math.floor(s.length / 2);
    if (stat === "median")
      return fits(q, s.length % 2 ? [s[h], 1] : [s[h - 1] + s[h], 2]);
    if (stat === "range") return fits(q, [s[s.length - 1] - s[0], 1]);
    const times = v.map((x) => v.filter((y) => y === x).length);
    const most = Math.max(...times);
    const modes = new Set(v.filter((_, i) => times[i] === most));
    if (most < 2 || modes.size !== 1) throw new Error("no unique mode");
    return fits(q, [[...modes][0], 1]);
  },
  3: (q) => {
    chances(q);
    const [, n1, c1, items, n2, c2, again, one, asked] = read(
      /^A bag holds (\d+) (\w+) (\w+) and (\d+) (\w+) (\w+)\. One (\w+) is taken at random\. What is the probability that it is (\w+)\?$/,
      q.prompt,
    );
    if (again !== items || `${one}s` !== items || c1 === c2)
      throw new Error(`unexpected bag: ${q.prompt}`);
    const bag = bagOf([
      [Number(n1), c1],
      [Number(n2), c2],
    ]);
    return fits(q, [bag.filter((x) => x === asked).length, bag.length]);
  },
  4: (q) => {
    const x =
      /^(?:A fair die is rolled once|A spinner with (\d+) equal sections numbered 1 to (\d+) is spun once)\. What is the probability of a number (greater|less) than (\d+)\?$/.exec(
        q.prompt,
      );
    if (x) {
      if (x[1] !== x[2]) throw new Error(`unexpected spinner: ${q.prompt}`);
      const T = x[1] ? Number(x[1]) : 6;
      const cut = Number(x[4]);
      const set = [...q.choices].sort().join(" ");
      if (set !== ["0", "1", `1/${T}`].sort().join(" "))
        throw new Error(`choices are not 0, 1/${T} and 1`);
      const hits = upTo(T).filter((f) =>
        x[3] === "greater" ? f > cut : f < cut,
      );
      return fits(q, [hits.length, T]);
    }
    chances(q);
    const [, list, noun, asked] = read(
      /^A bag holds (.+) (marbles?)\. One marble is taken at random\. What is the probability that it is not (\w+)\?$/,
      q.prompt,
    );
    const parts = list.split(/, | and /).map((part) => {
      const [, count, colour] = read(/^(\d+) (\w+)$/, part);
      return [Number(count), colour] as const;
    });
    if ((parts[parts.length - 1][0] === 1) !== (noun === "marble"))
      throw new Error(`the noun does not agree: ${q.prompt}`);
    const bag = bagOf(parts);
    if (!bag.includes(asked)) throw new Error(`${asked} is not in the bag`);
    return fits(q, [bag.filter((m) => m !== asked).length, bag.length]);
  },
  5: (q) => {
    counts(q);
    const [, who, list, cnt, nth, all, mean, again, nth2] = read(
      /^(\w+) scores (.+) points in (\w+) games\. After the (\w+) game the mean over all (\w+) games is (\d+)\. How many points did (\w+) score in the (\w+) game\?$/,
      q.prompt,
    );
    const v = numbers(list);
    const N = WORD[all];
    if (
      v.length !== WORD[cnt] ||
      N !== v.length + 1 ||
      NTH[nth] !== N ||
      nth2 !== nth ||
      again !== who
    )
      throw new Error(`the words do not agree: ${q.prompt}`);
    return only(q.choices, (c) => sum(v) + Number(c) === N * Number(mean));
  },
  6: (q) => {
    chances(q);
    const text = q.prompt[0].toLowerCase() + q.prompt.slice(1);
    const [, d1, d2, e1, e2] = read(
      new RegExp(
        `^(${DEVICE}) and (${DEVICE})\\. What is the probability of (.+) and (.+)\\?$`,
      ),
      text,
    );
    const o1 = outcomes(d1);
    const o2 = outcomes(d2);
    if (!o1.some((o) => holds(e1, o)) || !o2.some((o) => holds(e2, o)))
      throw new Error(`an event cannot happen: ${q.prompt}`);
    let favourable = 0;
    for (const a of o1)
      for (const b of o2) if (holds(e1, a) && holds(e2, b)) favourable++;
    return fits(q, [favourable, o1.length * o2.length]);
  },
  7: (q) => {
    counts(q);
    const [, list, deal, used, deals] = read(
      /^A \w+ (?:offers|sells) (.+)\. A (.+) is (.+)\. How many different (.+) are there\?$/,
      q.prompt,
    );
    if (deals !== `${deal}s` && deals !== `${deal}es`)
      throw new Error(`unexpected deal: ${q.prompt}`);
    const menu = list.split(/, | and /).map((part) => {
      const [, count, item] = read(/^(\d+) (\w+)$/, part);
      return { count: Number(count), item };
    });
    const picked = used.split(/, | and /).map((part) => {
      const word = read(/^one (?:pair of )?(\w+)$/, part)[1];
      const hit = menu.find(
        ({ item }) =>
          item === word ||
          item === `${word}s` ||
          item === `${word}es` ||
          item === word.replace(/f$/, "ves"),
      );
      if (!hit) throw new Error(`${part} is not on the menu`);
      return hit;
    });
    if (new Set(picked).size !== picked.length || picked.length === menu.length)
      throw new Error(`unexpected deal: ${q.prompt}`);
    return fits(q, [tuples(picked.map(({ count }) => count)), 1]);
  },
  8: (q) => {
    chances(q);
    const [, n1, c1, items, n2, c2, again, asked] = read(
      /^A bag holds (\d+) (\w+) (\w+) and (\d+) (\w+) (\w+)\. Two are taken at random, without replacement\. What is the probability that both are (\w+)\?$/,
      q.prompt,
    );
    if (again !== items || c1 === c2)
      throw new Error(`unexpected bag: ${q.prompt}`);
    const bag = bagOf([
      [Number(n1), c1],
      [Number(n2), c2],
    ]);
    let pairs = 0;
    let both = 0;
    bag.forEach((first, i) =>
      bag.forEach((second, j) => {
        if (i === j) return;
        pairs++;
        if (first === asked && second === asked) both++;
      }),
    );
    return fits(q, [both, pairs]);
  },
  9: (q) => {
    const [, s, a, colour, rest] = read(
      /^A spinner has (\d+) equal sections, (\d+) of them (\w+)\. (.+)$/,
      q.prompt,
    );
    const spins =
      /^It is spun (\d+) times\. About how many (\w+) results should you expect\?$/.exec(
        rest,
      );
    if (spins) {
      counts(q);
      if (spins[2] !== colour)
        throw new Error(`unexpected colour: ${q.prompt}`);
      return fits(q, [Number(spins[1]) * Number(a), Number(s)]);
    }
    chances(q);
    const [, n, got, k, asked] = read(
      /^\w+ spins it (\d+) times and gets (\w+) (\d+) times\. What is the experimental probability of (\w+) from these spins\?$/,
      rest,
    );
    if (got !== colour || asked !== colour)
      throw new Error(`unexpected colour: ${q.prompt}`);
    return fits(q, [Number(k), Number(n)]);
  },
  10: (q) => {
    counts(q);
    const [, n, what, r, places, loose] = read(
      /^A \w+ has (\d+) ([\w ]+)\. (\d+) of them are chosen for (.+?)\.( Order does not matter\.)? How many different [\w -]+ are possible\?$/,
      q.prompt,
    );
    const size = Number(r);
    if (
      !what ||
      (!loose &&
        places !==
          `${PLACES.slice(0, size - 1).join(", ")} and ${PLACES[size - 1]} place`)
    )
      throw new Error(`unexpected places: ${q.prompt}`);
    return fits(q, [arrangements(Number(n), size, !loose), 1]);
  },
} satisfies Checks;

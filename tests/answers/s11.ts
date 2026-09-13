import { only, type Asked, type Checks } from "../support/math.ts";

type Exact = readonly [top: bigint, bottom: bigint];

const WHOLE = String.raw`\d{1,3}(?:,\d{3})*`;
const GROUPED = new RegExp(`^${WHOLE}$`);
const RATIONAL = new RegExp(`^(−?)(${WHOLE})(?:/(${WHOLE}))?$`);

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

const gcd = (a: bigint, b: bigint): bigint =>
  b ? gcd(b, a % b) : a < 0n ? -a : a;

function grouped(text: string) {
  if (!GROUPED.test(text)) throw new Error(`badly printed number ${text}`);
  return BigInt(text.replace(/,/g, ""));
}

function rational(text: string): Exact {
  const match = RATIONAL.exec(text);
  if (!match) throw new Error(`unreadable number ${text}`);
  const top = (match[1] ? -1n : 1n) * grouped(match[2]);
  if (match[3] === undefined) return [top, 1n];
  const bottom = grouped(match[3]);
  if (bottom < 2n || gcd(top, bottom) !== 1n)
    throw new Error(`${text} is not in lowest terms`);
  return [top, bottom];
}

const same = (x: Exact, y: Exact) => x[0] * y[1] === y[0] * x[1];

function powered(text: string) {
  return text.split(" · ").reduce((value, part) => {
    const match = /^(\d+)(?:\^(\d+))?$/.exec(part);
    if (!match) throw new Error(`unreadable power ${text}`);
    return value * BigInt(match[1]) ** BigInt(match[2] ?? "1");
  }, 1n);
}

const multiplied = (text: string) =>
  text.split(" × ").reduce((value, part) => value * powered(part), 1n);

function wholeRoot(n: bigint, index: bigint) {
  let root = 0n;
  while (root ** index < n) root++;
  if (root ** index !== n) throw new Error(`${n} has no whole root`);
  return root;
}

function squarefree(n: number) {
  for (let i = 2; i * i <= n; i++) if (n % (i * i) === 0) return false;
  return n > 1;
}

export default {
  1: (q) => {
    const [, base, exponent] = read(/^What is (\d+)\^(\d+)\?$/, q);
    let value = 1n;
    for (let i = 0; i < Number(exponent); i++) value *= BigInt(base);
    return only(q.choices, (c) => grouped(c) === value);
  },
  2: (q) => {
    const [, left] = read(/^(.+) = \?$/, q);
    if (new Set(left.split(" × ")).size !== 1)
      throw new Error(`unequal factors in ${left}`);
    const target = multiplied(left);
    return only(q.choices, (c) => multiplied(c) === target);
  },
  3: (q) => {
    const [, sign, radicand] = read(/^What is ([√∛])(.+)\?$/, q);
    const root = wholeRoot(grouped(radicand), sign === "√" ? 2n : 3n);
    return only(q.choices, (c) => grouped(c) === root);
  },
  4: (q) => {
    const power = /^What is 10\^(\d+)\?$/.exec(q.prompt);
    if (power) {
      const target = 10n ** BigInt(power[1]);
      return only(q.choices, (c) => grouped(c) === target);
    }
    const asPower = /^Write (.+) as a power\.$/.exec(q.prompt);
    if (asPower) {
      const target = grouped(asPower[1]);
      return only(q.choices, (c) => powered(c) === target);
    }
    const ordinary =
      /^Write (\d)(?:\.(\d))? × 10\^(\d+) as an ordinary number\.$/.exec(
        q.prompt,
      );
    if (ordinary) {
      const scale = ordinary[2] === undefined ? 1n : 10n;
      const shifted =
        BigInt(ordinary[1] + (ordinary[2] ?? "")) * 10n ** BigInt(ordinary[3]);
      if (shifted % scale !== 0n) throw new Error("not a whole number");
      return only(q.choices, (c) => grouped(c) === shifted / scale);
    }
    const target = grouped(read(/^Write (.+) in scientific notation\.$/, q)[1]);
    return only(q.choices, (c) => {
      const match = /^([1-9])(?:\.(\d+))? × 10\^(\d+)$/.exec(c);
      if (!match) throw new Error(`${c} is not in scientific notation`);
      const decimals = match[2] ?? "";
      return (
        BigInt(match[1] + decimals) * 10n ** BigInt(match[3]) ===
        target * 10n ** BigInt(decimals.length)
      );
    });
  },
  5: (q) => {
    const [, left, op, right] = read(
      /^Simplify (\d+(?:\^\d+)?) ([·÷]) (\d+(?:\^\d+)?)\.$/,
      q,
    );
    const x = powered(left);
    const y = powered(right);
    if (op === "÷" && x % y !== 0n)
      throw new Error("the quotient is not whole");
    const target = op === "·" ? x * y : x / y;
    return only(q.choices, (c) => {
      if (!/^\d+\^\d+$/.test(c)) throw new Error(`${c} is not a power`);
      return powered(c) === target;
    });
  },
  6: (q) => {
    const zero = /^What is (\d+)\^0 \+ (\d+)\?$/.exec(q.prompt);
    if (zero) {
      const target = BigInt(zero[1]) ** 0n + BigInt(zero[2]);
      return only(q.choices, (c) => grouped(c) === target);
    }
    const [, inside, outer] = read(/^Simplify \((.+)\)\^(\d+)\.$/, q);
    const target = powered(inside) ** BigInt(outer);
    return only(q.choices, (c) => powered(c) === target);
  },
  7: (q) => {
    const plain = /^What is (\d+)\^−(\d+)\?$/.exec(q.prompt);
    const [top, bottom, n] = plain
      ? [plain[1], "1", plain[2]]
      : read(/^What is \((\d+)\/(\d+)\)\^−(\d+)\?$/, q).slice(1);
    const e = BigInt(n);
    const target: Exact = [BigInt(bottom) ** e, BigInt(top) ** e];
    return only(q.choices, (c) => same(rational(c), target));
  },
  8: (q) => {
    const [, radicand] = read(
      /^√(\d+) lies between which two consecutive whole numbers\?$/,
      q,
    );
    const n = Number(radicand);
    return only(q.choices, (c) => {
      const match = /^(\d+) and (\d+)$/.exec(c);
      if (!match || Number(match[2]) !== Number(match[1]) + 1)
        throw new Error(`${c} is not two consecutive whole numbers`);
      const k = Number(match[1]);
      return k * k < n && n < (k + 1) * (k + 1);
    });
  },
  9: (q) => {
    const n = Number(read(/^Simplify √(\d+)\.$/, q)[1]);
    return only(q.choices, (c) => {
      const match = /^(\d*)√(\d+)$/.exec(c);
      if (!match) throw new Error(`unreadable radical ${c}`);
      const outside = match[1] ? Number(match[1]) : 1;
      const inside = Number(match[2]);
      if (!squarefree(inside)) throw new Error(`${c} is not fully simplified`);
      return outside * outside * inside === n;
    });
  },
  10: (q) => {
    const [, base, minus, p, index] = read(
      /^What is (.+)\^\((−?)(\d+)\/(\d+)\)\?$/,
      q,
    );
    const value = wholeRoot(grouped(base), BigInt(index)) ** BigInt(p);
    const target: Exact = minus ? [1n, value] : [value, 1n];
    return only(q.choices, (c) => same(rational(c), target));
  },
} satisfies Checks;

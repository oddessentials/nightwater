import {
  digits,
  evaluate,
  only,
  type Asked,
  type Checks,
} from "../support/math.ts";

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function count(text: string) {
  if (!/^[1-9]\d{0,2}(?:,\d{3})*$/.test(text))
    throw new Error(`${text} is not a whole number from 1 up`);
  return digits(text);
}

function plural(many: string, one: string) {
  if (many === one || !many.startsWith(one))
    throw new Error(`${many} is not the plural of ${one}`);
}

const equalTo = (target: number, q: Asked) =>
  only(q.choices, (c) => count(c) === target);

const worked = (q: Asked) => equalTo(evaluate(read(/^(.+) = \?$/, q)[1]), q);

const balanced = (q: Asked) => {
  const [left, right] = read(/^(.+) = (.+)$/, q).slice(1);
  return only(q.choices, (c) => {
    const x = String(count(c));
    return evaluate(left.replace("?", x)) === evaluate(right.replace("?", x));
  });
};

export default {
  1: worked,
  2: worked,
  3: balanced,
  4: worked,
  5: worked,
  6: (q) => {
    const rows =
      /^[A-Z][a-z]+ sets out (\d+) rows of (\d+) ([a-z]+)\. How many \3 in total\?$/.exec(
        q.prompt,
      );
    if (rows) return equalTo(Number(rows[1]) * Number(rows[2]), q);
    const [, total, , groups, many, one] = read(
      /^[A-Z][a-z]+ shares (\d+) ([a-z]+) equally among (\d+) ([a-z]+)\. How many \2 in each ([a-z]+)\?$/,
      q,
    );
    plural(many, one);
    return equalTo(Number(total) / Number(groups), q);
  },
  7: (q) => {
    const [, a, b] = read(/^(\d+) ÷ (\d+) = \?$/, q).map(Number);
    return only(q.choices, (c) => {
      const parts = /^([1-9]\d*) R ([1-9]\d*)$/.exec(c);
      if (!parts) throw new Error(`${c} is not written q R r`);
      const [, groups, left] = parts.map(Number);
      return b * groups + left === a && left < b;
    });
  },
  8: worked,
  9: worked,
  10: (q) => {
    const [, n, item, one, b, ask] = read(
      /^There are (\d+) ([a-z]+)\. Each ([a-z]+) holds (\d+) \2\. (.+)$/,
      q,
    );
    const total = Number(n);
    const size = Number(b);
    const left = total % size;
    const full = (total - left) / size;
    const asks: [RegExp, number][] = [
      [/^How many ([a-z]+) are needed\?$/, left ? full + 1 : full],
      [/^How many ([a-z]+) are completely full\?$/, full],
      [
        new RegExp(
          `^When as many ([a-z]+) as possible are filled, how many ${item} are left over\\?$`,
        ),
        left,
      ],
    ];
    for (const [pattern, target] of asks) {
      const match = pattern.exec(ask);
      if (!match) continue;
      plural(match[1], one);
      return equalTo(target, q);
    }
    throw new Error(`unexpected question: ${ask}`);
  },
} satisfies Checks;

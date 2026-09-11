import {
  close,
  evaluate,
  only,
  type Asked,
  type Checks,
} from "../support/math.ts";

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function value(text: string) {
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(text);
  return mixed
    ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
    : evaluate(text);
}

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

const equalTo = (target: number, q: Asked) =>
  only(q.choices, (c) => close(value(c), target));

export default {
  2: (q) => equalTo(value(read(/^Which fraction is equal to (.+)\?$/, q)[1]), q),
  3: (q) => {
    const [, a, b] = read(/^Which is greater: (.+) or (.+)\?$/, q);
    const x = value(a);
    const y = value(b);
    const want = close(x, y) ? "They are equal" : x > y ? a : b;
    return only(q.choices, (c) => c === want);
  },
  4: (q) => {
    const i = equalTo(value(read(/^Write (.+) in lowest terms\.$/, q)[1]), q);
    const [n, d] = q.choices[i].split("/").map(Number);
    if (d !== undefined && gcd(n, d) !== 1)
      throw new Error(`${q.choices[i]} is not in lowest terms`);
    return i;
  },
  5: (q) => equalTo(value(read(/^What is (.+)\?$/, q)[1]), q),
  6: (q) =>
    equalTo(
      value(
        read(/^Write (.+) as (?:a mixed number|an improper fraction)\.$/, q)[1],
      ),
      q,
    ),
  7: (q) => equalTo(value(read(/^What is (.+)\?$/, q)[1]), q),
  8: (q) => {
    const of = /^What is (.+) of (\d+)\?$/.exec(q.prompt);
    return equalTo(
      of
        ? value(of[1]) * Number(of[2])
        : value(read(/^What is (.+)\?$/, q)[1]),
      q,
    );
  },
  9: (q) => {
    const scoops =
      /^How many (\d+)\/(\d+)-cup scoops does it take to fill (\d+) cups\?$/.exec(
        q.prompt,
      );
    return equalTo(
      scoops
        ? Number(scoops[3]) / (Number(scoops[1]) / Number(scoops[2]))
        : value(read(/^What is (.+)\?$/, q)[1]),
      q,
    );
  },
} satisfies Checks;

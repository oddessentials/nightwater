import {
  close,
  evaluate,
  only,
  parse,
  type Asked,
  type Checks,
} from "../support/math.ts";

type Region = (x: number) => boolean;

const GRID = Array.from({ length: 1601 }, (_, i) => -400 + i / 2);
const COMPARE: Record<string, (a: number, b: number) => boolean> = {
  "<": (a, b) => a < b,
  "≤": (a, b) => a <= b,
  ">": (a, b) => a > b,
  "≥": (a, b) => a >= b,
};

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function region(text: string): Region {
  const band = /^(\S+) ([<≤]) x ([<≤]) (\S+)$/.exec(text);
  if (band) {
    const lo = evaluate(band[1]);
    const hi = evaluate(band[4]);
    return (x) => COMPARE[band[2]](lo, x) && COMPARE[band[3]](x, hi);
  }
  const union = /^x ([<≤]) (\S+) or x ([>≥]) (\S+)$/.exec(text);
  if (union) {
    const lo = evaluate(union[2]);
    const hi = evaluate(union[4]);
    return (x) => COMPARE[union[1]](x, lo) || COMPARE[union[3]](x, hi);
  }
  const ray = /^x ([<≤>≥]) (\S+)$/.exec(text);
  if (ray) {
    const end = evaluate(ray[2]);
    return (x) => COMPARE[ray[1]](x, end);
  }
  throw new Error(`unreadable solution set ${text}`);
}

const sameSet = (text: string, truth: Region) => {
  const inside = region(text);
  return GRID.every((x) => inside(x) === truth(x));
};

function letters(seed: number) {
  const env: Record<string, number> = {};
  [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"].forEach(
    (c, i) => {
      const h = Math.imul(seed * 131 + i + 1, 2654435761) >>> 0;
      env[c] = 1 + (h % 10007) / 2000;
    },
  );
  return env;
}

const cents = (text: string) => {
  const [dollars, part = "0"] = text.split(".");
  return Number(dollars) * 100 + Number(part.padEnd(2, "0"));
};
const amount = (words: string, q: Asked) =>
  cents(read(new RegExp(`(?:${words}) \\$(\\d+(?:\\.\\d\\d)?)[ .]`), q)[1]);

export default {
  1: (q) => {
    const [, left, right] = read(/^Solve (.+) = (\S+)\.$/, q);
    const f = parse(left);
    const target = evaluate(right);
    return only(q.choices, (c) => close(f({ x: evaluate(c) }), target));
  },
  2: (q) => {
    const found =
      /^(.+)\. Solve for (\w)\.$/.exec(q.prompt) ??
      /^Solve (.+) for (\w)\.$/.exec(q.prompt);
    if (!found) throw new Error(`unexpected prompt: ${q.prompt}`);
    const [, formula, target] = found;
    const [lhs, rhs] = formula.replace(/½/g, "(1/2)").split(" = ").map(parse);
    return only(q.choices, (c) => {
      const [name, body] = c.split(" = ");
      if (name !== target) return false;
      const solved = parse(body);
      return [1, 2, 3].every((seed) => {
        const env = letters(seed);
        env[target] = solved(env);
        return close(lhs(env), rhs(env), 1e-9);
      });
    });
  },
  3: (q) => {
    const [, left, rel, right] = read(/^Solve (.+) ([<≤>≥]) (\S+)\.$/, q);
    const f = parse(left);
    const c = evaluate(right);
    return only(q.choices, (choice) =>
      sameSet(choice, (x) => COMPARE[rel](f({ x }), c)),
    );
  },
  4: (q) => {
    const [, low, r1, middle, r2, high] = read(
      /^Solve (\S+) ([<≤]) (.+) ([<≤]) (\S+)\.$/,
      q,
    );
    const f = parse(middle);
    const lo = evaluate(low);
    const hi = evaluate(high);
    return only(q.choices, (choice) =>
      sameSet(
        choice,
        (x) => COMPARE[r1](lo, f({ x })) && COMPARE[r2](f({ x }), hi),
      ),
    );
  },
  5: (q) => {
    const [, left, right] = read(/^Solve (\|.+\|) = (\S+)\.$/, q);
    const f = parse(left);
    const c = evaluate(right);
    return only(q.choices, (choice) => {
      if (choice === "no solution") return c < 0;
      const found = /^x = (\S+) or x = (\S+)$/.exec(choice);
      if (!found) throw new Error(`unreadable roots ${choice}`);
      const u = evaluate(found[1]);
      const w = evaluate(found[2]);
      return u !== w && [u, w].every((x) => close(f({ x }), c));
    });
  },
  6: (q) => {
    const [, first, second] = read(/^Solve the system: (.+); (.+)\.$/, q);
    const equations = [first, second].map((e) => e.split(" = ").map(parse));
    return only(q.choices, (choice) => {
      const found = /^\((\S+), (\S+)\)$/.exec(choice);
      if (!found) throw new Error(`unreadable point ${choice}`);
      const env = { x: evaluate(found[1]), y: evaluate(found[2]) };
      return equations.every(([l, r]) => close(l(env), r(env)));
    });
  },
  7: (q) => {
    const single = /^How many solutions does (.+) = (.+) have\?$/.exec(
      q.prompt,
    );
    let kind: string;
    if (single) {
      const l = parse(single[1]);
      const r = parse(single[2]);
      const gap = (x: number) => l({ x }) - r({ x });
      kind =
        gap(1) !== gap(0)
          ? "one solution"
          : gap(0) === 0
            ? "infinitely many solutions"
            : "no solutions";
    } else {
      const [, first, second] = read(
        /^How many solutions does this system have\? (.+); (.+)\.$/,
        q,
      );
      const [[a, b, c], [d, e, f]] = [first, second].map((equation) => {
        const [l, r] = equation.split(" = ").map(parse);
        const at = (x: number, y: number) => l({ x, y }) - r({ x, y });
        return [at(1, 0) - at(0, 0), at(0, 1) - at(0, 0), -at(0, 0)];
      });
      kind =
        a * e - b * d !== 0
          ? "one solution"
          : a * f - c * d === 0 && b * f - c * e === 0
            ? "infinitely many solutions"
            : "no solutions";
    }
    return only(q.choices, (choice) => choice === kind);
  },
  8: (q) => {
    const greatest = /What is the greatest number of /.test(q.prompt);
    const fewest = /What is the fewest /.test(q.prompt);
    if (greatest === fewest) throw new Error(`unexpected prompt: ${q.prompt}`);
    const total = amount("has|must raise", q);
    const fee = amount(
      "Entry to the fair costs|The bus fare is|the printing cost|the supplies cost",
      q,
    );
    const rate = amount(
      "each ride costs|each game at the arcade costs|Each raffle ticket sells for|Each car wash costs the buyer",
      q,
    );
    let n = 0;
    if (greatest) while (fee + rate * (n + 1) <= total) n++;
    else while (rate * n - fee < total) n++;
    return only(q.choices, (choice) => Number(choice) === n);
  },
  9: (q) => {
    const found =
      /^\w+ buys (\d+) tickets for the show\. Adult tickets cost \$(\d+) and child tickets cost \$(\d+)\. The total is \$(\d+)\. How many (adult|child) tickets were bought\?$/.exec(
        q.prompt,
      ) ??
      /^\w+ orders (\d+) drinks\. A large costs \$(\d+) and a small costs \$(\d+)\. The bill is \$(\d+)\. How many (large|small) drinks were ordered\?$/.exec(
        q.prompt,
      );
    if (!found) throw new Error(`unexpected prompt: ${q.prompt}`);
    const [count, high, low, bill] = found.slice(1, 5).map(Number);
    const splits = Array.from({ length: count + 1 }, (_, n) => n).filter(
      (n) => high * n + low * (count - n) === bill,
    );
    if (splits.length !== 1) throw new Error(`${splits.length} splits fit`);
    const want =
      found[5] === "adult" || found[5] === "large"
        ? splits[0]
        : count - splits[0];
    return only(q.choices, (choice) => Number(choice) === want);
  },
  10: (q) => {
    const [, left, rel, right] = read(/^Solve (\|.+\|) ([<≤>≥]) (\S+)\.$/, q);
    const f = parse(left);
    const c = evaluate(right);
    return only(q.choices, (choice) =>
      sameSet(choice, (x) => COMPARE[rel](f({ x }), c)),
    );
  },
} satisfies Checks;

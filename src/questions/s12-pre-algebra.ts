import {
  type Choice,
  type Level,
  NAMES,
  expr,
  int,
  loneSign,
  money,
  nonzero,
  num,
  range,
  terms,
  whole,
} from "./kit.ts";

export const name = "Pre-Algebra: Expressions and Simple Equations";

const ITEMS: Record<string, { one: string; fee: string }> = {
  "cinema tickets": { one: "ticket", fee: "booking fee" },
  notebooks: { one: "notebook", fee: "delivery charge" },
  "T-shirts": { one: "T-shirt", fee: "delivery charge" },
  "plant pots": { one: "plant pot", fee: "delivery charge" },
  "comic books": { one: "comic book", fee: "postage charge" },
  badges: { one: "badge", fee: "postage charge" },
};
const RATES: Record<
  string,
  { fee: string; per: string; unit: string; one: string; job: string }
> = {
  taxi: {
    fee: "pick-up fee",
    per: "per km",
    unit: "km",
    one: "km",
    job: "the ride",
  },
  plumber: {
    fee: "call-out fee",
    per: "an hour",
    unit: "hours",
    one: "hour",
    job: "the job",
  },
};
const COUNTS: Record<number, string> = { 3: "Three", 5: "Five" };

const step = (k: number) => (k % 2 ? Math.abs(k) : Math.abs(k) / 2);
const multiples = (unit: number, limit: number) =>
  nonzero(Math.floor(limit / unit)).map((i) => i * unit);
const linear = (a: number, b: number, v = "x") =>
  terms([
    [a, v],
    [b, ""],
  ]);
const poly = (a: number, b: number) => expr(linear(a, b), (x) => a * x + b);
const solution = (v: number) => num(v, `x = ${int(v)}`);
const an = (n: number) => ([8, 11, 18].includes(n) ? "an" : "a");
const ask = (phrase: string) => `Which expression means "${phrase}"?`;

export const levels: Level[] = [
  {
    skill: "Substitute and evaluate",
    make(r) {
      const { a, b, v, values } = r.exclude(
        () => {
          const a = r.int("a", 2, 9);
          const b = r.pick("b", nonzero(9));
          const v = r.pick(
            "v",
            range(-5, 10).filter((v) => v !== 0 && v !== 1),
          );
          return { a, b, v, values: [a * v + b, a + v + b, a * (v + b)] };
        },
        ({ a, b, v, values }) =>
          (a === 2 && v === 2) || (a === 2 && v + b === 2) || loneSign(values),
      );
      return {
        prompt: `What is ${linear(a, b)} when x = ${int(v)}?`,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "Words to expression",
    make(r) {
      const form = r.pick("form", ["S", "T", "G", "Q"]);
      const m = r.int("m", 2, 9);
      const k = r.resample(
        () => r.int("k", 2, 20),
        (k) => k !== m,
      );
      const times = (c: number, d: number) =>
        expr(linear(c, d, "n"), (x) => c * x + d);
      const bracket = (c: number, d: number) =>
        expr(`${c}(${linear(1, d, "n")})`, (x) => c * (x + d));
      if (form === "S")
        return {
          prompt: ask(`${k} less than ${m} times a number n`),
          answer: times(m, -k),
          wrong: [expr(`${k} − ${m}n`, (x) => k - m * x), bracket(m, -k)],
        };
      if (form === "T")
        return {
          prompt: ask(`${k} more than ${m} times a number n`),
          answer: times(m, k),
          wrong: [bracket(m, k), times(k, m)],
        };
      if (form === "G")
        return {
          prompt: ask(`${m} times the sum of a number n and ${k}`),
          answer: bracket(m, k),
          wrong: [times(m, k), bracket(k, m)],
        };
      return {
        prompt: ask(`the quotient of a number n and ${k}, increased by ${m}`),
        answer: expr(`n/${k} + ${m}`, (x) => x / k + m),
        wrong: [
          expr(`${k}/n + ${m}`, (x) => k / x + m),
          expr(`n/${m} + ${k}`, (x) => x / m + k),
        ],
      };
    },
  },
  {
    skill: "Combine like terms",
    make(r) {
      const v = r.pick("v", ["X", "C"]);
      const { a, b, c, d } = r.exclude(
        () => ({
          a: r.int("a", 1, 9),
          b: r.pick("b", nonzero(9)),
          c: r.pick("c", nonzero(9)),
          d: r.pick("d", nonzero(9)),
        }),
        ({ a, b, c, d }) =>
          a + c === 0 ||
          b + d === 0 ||
          (v === "X" ? a === c || a * c === a + c || a * c === a - c : b === d),
      );
      return {
        prompt: `Simplify ${terms([
          [a, "x"],
          [b, ""],
          [c, "x"],
          [d, ""],
        ])}.`,
        answer: poly(a + c, b + d),
        wrong:
          v === "X"
            ? [poly(a - c, b + d), poly(a * c, b + d)]
            : [poly(a + c, b - d), poly(a + c, b)],
      };
    },
  },
  {
    skill: "Distributive property",
    make(r) {
      const v = r.pick("v", ["A", "B"]);
      const m = r.pick(
        "m",
        nonzero(9).filter((m) => Math.abs(m) >= 2),
      );
      const a = r.int("a", 1, 9);
      const b = r.pick("b", nonzero(9));
      return {
        prompt: `Expand ${int(m)}(${linear(a, b)}).`,
        answer: poly(m * a, m * b),
        wrong:
          v === "A"
            ? [poly(m * a, b), poly(m * a, -m * b)]
            : [poly(-m * a, m * b), poly(a, m * b)],
      };
    },
  },
  {
    skill: "One-step equations",
    make(r) {
      const form = r.pick("form", ["A", "M", "D"]);
      const { prompt, values } = r.exclude(
        () => {
          if (form === "A") {
            const a = r.pick("a", nonzero(20));
            const x = r.pick("x", nonzero(20));
            const b = x + a;
            return {
              prompt: `Solve ${linear(1, a)} = ${int(b)}.`,
              values: [b - a, b + a, a - b],
              legal: b !== 0 && Math.abs(b) <= 20 && a !== b,
            };
          }
          const a = r.int("a", 2, 9);
          if (form === "M") {
            const x = r.pick(
              "x",
              nonzero(20).filter((x) => Math.abs(x) >= 2),
            );
            const b = a * x;
            return {
              prompt: `Solve ${a}x = ${int(b)}.`,
              values: [b / a, a * b, b - a],
              legal: Math.abs(b) <= 60 && !(a === 2 && x === 2),
            };
          }
          const b = r.pick(
            "b",
            nonzero(20).filter((b) => Math.abs(b) >= 2),
          );
          return {
            prompt: `Solve x/${a} = ${int(b)}.`,
            values: [a * b, b + a, b - a],
            legal: Math.abs(a * b) <= 20 && !(a === 2 && Math.abs(b) === 2),
          };
        },
        ({ values, legal }) => !legal || loneSign(values),
      );
      return {
        prompt,
        answer: solution(values[0]),
        wrong: [solution(values[1]), solution(values[2])],
      };
    },
  },
  {
    skill: "Two-step equations",
    make(r) {
      const { a, b, c } = r.exclude(
        () => {
          const a = r.int("a", 2, 9);
          const b = r.pick("b", multiples(step(a), 20));
          const x = r.pick("x", nonzero(12));
          return { a, b, x, c: a * x + b };
        },
        ({ a, b, x, c }) => Math.abs(c) > 99 || 2 * b === a * (a - 1) * x,
      );
      return {
        prompt: `Solve ${linear(a, b)} = ${int(c)}.`,
        answer: solution((c - b) / a),
        wrong: [solution(c - b), solution((c + b) / a)],
      };
    },
  },
  {
    skill: "Variables on both sides",
    make(r) {
      const { a, b, c, d, p } = r.exclude(
        () => {
          const { a, c } = r.exclude(
            () => ({ a: r.int("a", 1, 9), c: r.int("c", 1, 9) }),
            ({ a, c }) => Math.abs(a - c) < 2,
          );
          const p = a - c;
          const b = r.pick("b", multiples(step(p), 12));
          const x = r.pick("x", nonzero(10));
          return { a, b, c, p, x, d: b + p * x };
        },
        ({ b, p, x, d }) =>
          d === 0 ||
          Math.abs(d) > 30 ||
          2 * b === p * (p - 1) * x ||
          loneSign([(d - b) / p, (d + b) / p, d - b]),
      );
      return {
        prompt: `Solve ${linear(a, b)} = ${linear(c, d)}.`,
        answer: solution((d - b) / p),
        wrong: [solution((d + b) / p), solution(d - b)],
      };
    },
  },
  {
    skill: "Word problem to equation",
    make(r) {
      const form = r.pick("form", ["V", "Q"]);
      const context = r.pick("context", ["P", "R"]);
      const s = r.pick("s", ["F", "D"]);
      const sgn = s === "F" ? 1 : -1;
      const { n, f, u, T } = r.exclude(
        () => {
          const n = r.int("n", 2, 9);
          const f = r.pick(
            "f",
            range(2, Math.floor(20 / n)).map((i) => i * n),
          );
          const u = r.int("u", 2, 20);
          return { n, f, u, T: n * u + sgn * f };
        },
        ({ n, f, u, T }) =>
          T < 10 ||
          T > 199 ||
          (s === "F" ? 2 * f === n * (n - 1) * u : u - (2 * f) / n < 1),
      );
      const who = r.pick("Name", NAMES);
      let story: string;
      let question: string;
      let amount: (v: number) => Choice;
      if (context === "P") {
        const item = r.pick("item", Object.keys(ITEMS));
        const { one, fee } = ITEMS[item];
        const paid =
          s === "F"
            ? `pays ${an(f)} ${money(f, 0)} ${fee}`
            : `uses ${an(f)} ${money(f, 0)} voucher`;
        story = `${who} buys ${n} ${item} and ${paid}. The total is ${money(T, 0)}.`;
        question =
          form === "V"
            ? `What does one ${one} cost?`
            : `Which equation gives the price x of one ${one}?`;
        amount = (v) => num(v, money(v, 0));
      } else {
        const rate = r.pick("rate", Object.keys(RATES));
        const { fee, per, unit, one, job } = RATES[rate];
        const charges =
          s === "F"
            ? `charges ${an(f)} ${money(f, 0)} ${fee} plus ${money(n, 0)} ${per}`
            : `charges ${money(n, 0)} ${per} and takes ${money(f, 0)} off for members`;
        story = `A ${rate} ${charges}. ${who} paid ${money(T, 0)} in total.`;
        question =
          form === "V"
            ? `How many ${unit} was ${job}?`
            : `Which equation gives the number of ${unit} x?`;
        amount = (v) => num(v, `${int(v)} ${v === 1 ? one : unit}`);
      }
      const prompt = `${story} ${question}`;
      if (form === "V")
        return {
          prompt,
          answer: amount(u),
          wrong: [amount(u + (sgn * 2 * f) / n), amount(T - sgn * f)],
        };
      const equation = (left: string, g: (x: number) => number) =>
        expr(`${left} = ${int(T)}`, (x) => g(x) - T);
      return {
        prompt,
        answer: equation(linear(n, sgn * f), (x) => n * x + sgn * f),
        wrong: [
          equation(`${n}(${linear(1, sgn * f)})`, (x) => n * (x + sgn * f)),
          equation(linear(f, sgn * n), (x) => f * x + sgn * n),
        ],
      };
    },
  },
  {
    skill: "Equations with grouping",
    make(r) {
      const { m, b, c, T, values } = r.exclude(
        () => {
          const m = r.int("m", 2, 9);
          const b = r.pick("b", multiples(m, 12));
          const c = r.pick("c", nonzero(12));
          const x = r.pick("x", nonzero(12));
          const T = m * (x + b) + c;
          return {
            m,
            b,
            c,
            T,
            values: [(T - c) / m - b, (T - b - c) / m, (T - c) / m + b],
          };
        },
        ({ T, values }) => Math.abs(T) > 99 || loneSign(values),
      );
      return {
        prompt: `Solve ${terms([
          [m, `(${linear(1, b)})`],
          [c, ""],
        ])} = ${int(T)}.`,
        answer: solution(values[0]),
        wrong: [solution(values[1]), solution(values[2])],
      };
    },
  },
  {
    skill: "Consecutive integers and ages",
    make(r) {
      if (r.pick("form", ["N", "A"]) === "N") {
        const k = r.pick("k", [3, 5]);
        const kind = r.pick("kind", ["whole", "even", "odd"]);
        const which = r.pick("which", ["smallest", "largest"]);
        const m = r.pick(
          "m",
          range(k === 3 ? 4 : 6, 80).filter(
            (m) => kind === "whole" || m % 2 === (kind === "even" ? 0 : 1),
          ),
        );
        const t = kind === "whole" ? 1 : 2;
        const out = ((k - 1) / 2) * (which === "smallest" ? -1 : 1);
        return {
          prompt: `${COUNTS[k]} consecutive ${kind} numbers add up to ${k * m}. What is the ${which}?`,
          answer: whole(m + out * t),
          wrong: [whole(m), whole(m + out * (3 - t))],
        };
      }
      const dir = r.pick("dir", ["future", "past"]);
      const who = r.pick("who", ["younger", "older"]);
      const d = r.int("d", 2, 12);
      const k = r.pick("k", [2, 4, 6, 8, 10]);
      const y = r.int("y", dir === "past" ? Math.max(5, k + 1) : 5, 30);
      const P = r.pick("P", NAMES);
      const Q = r.pick(
        "Q",
        NAMES.filter((n) => n !== P),
      );
      const shift = dir === "future" ? k : -k;
      const answer = who === "younger" ? y : y + d;
      const when =
        dir === "future"
          ? `In ${k} years their ages will add up to ${2 * y + d + 2 * k}.`
          : `${k} years ago their ages added up to ${2 * y + d - 2 * k}.`;
      return {
        prompt: `${P} is ${d} years older than ${Q}. ${when} How old is ${who === "younger" ? Q : P} now?`,
        answer: whole(answer),
        wrong: [whole(answer + shift), whole(answer + shift / 2)],
      };
    },
  },
];

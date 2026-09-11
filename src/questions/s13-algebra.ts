import {
  type Level,
  NAMES,
  choice,
  dec,
  expr,
  int,
  label,
  loneSign,
  money,
  nonzero,
  over,
  q,
  terms,
  whole,
} from "./kit.ts";

export const name = "Algebra: Equations, Inequalities, and Systems";

type Rel = "<" | "≤" | ">" | "≥";
const RELS: readonly Rel[] = ["<", "≤", ">", "≥"];
const REVERSED: Record<Rel, Rel> = { "<": ">", "≤": "≥", ">": "<", "≥": "≤" };
const SWAPPED: Record<Rel, Rel> = { "<": "≤", "≤": "<", ">": "≥", "≥": ">" };
const step = (k: number) => (k % 2 ? Math.abs(k) : Math.abs(k) / 2);
const multiples = (k: number) => nonzero(20).filter((b) => b % step(k) === 0);
const linear = (a: number, b: number) =>
  terms([
    [a, "x"],
    [b, ""],
  ]);
const distinct = (values: readonly number[]) =>
  new Set(values).size === values.length;
const ray = (rel: string, end: number) =>
  choice(`x ${rel} ${int(end)}`, `ray:${rel}${end}`);
const roots = (u: number, w: number) => {
  const [lo, hi] = u < w ? [u, w] : [w, u];
  return choice(`x = ${int(lo)} or x = ${int(hi)}`, `roots:${lo},${hi}`);
};
const point = (x: number, y: number) =>
  choice(`(${int(x)}, ${int(y)})`, `point:${x},${y}`);

type Letters = Record<string, number>;
type Side = readonly [text: string, value: (e: Letters) => number];
const BANK: readonly (readonly [string, string, Side, Side, Side])[] = [
  [
    "A = ½bh",
    "h",
    ["2A/b", (e) => (2 * e.A) / e.b],
    ["A/(2b)", (e) => e.A / (2 * e.b)],
    ["A/b", (e) => e.A / e.b],
  ],
  [
    "A = ½bh",
    "b",
    ["2A/h", (e) => (2 * e.A) / e.h],
    ["A/(2h)", (e) => e.A / (2 * e.h)],
    ["A/h", (e) => e.A / e.h],
  ],
  [
    "P = 2(l + w)",
    "w",
    ["P/2 − l", (e) => e.P / 2 - e.l],
    ["(P − l)/2", (e) => (e.P - e.l) / 2],
    ["P/2 + l", (e) => e.P / 2 + e.l],
  ],
  [
    "P = 2(l + w)",
    "l",
    ["P/2 − w", (e) => e.P / 2 - e.w],
    ["(P − w)/2", (e) => (e.P - e.w) / 2],
    ["P/2 + w", (e) => e.P / 2 + e.w],
  ],
  [
    "d = rt",
    "t",
    ["d/r", (e) => e.d / e.r],
    ["d·r", (e) => e.d * e.r],
    ["r/d", (e) => e.r / e.d],
  ],
  [
    "d = rt",
    "r",
    ["d/t", (e) => e.d / e.t],
    ["d·t", (e) => e.d * e.t],
    ["t/d", (e) => e.t / e.d],
  ],
  [
    "F = 9/5·C + 32",
    "C",
    ["5(F − 32)/9", (e) => (5 * (e.F - 32)) / 9],
    ["5F/9 − 32", (e) => (5 * e.F) / 9 - 32],
    ["9(F − 32)/5", (e) => (9 * (e.F - 32)) / 5],
  ],
  [
    "I = Prt",
    "r",
    ["I/(Pt)", (e) => e.I / (e.P * e.t)],
    ["It/P", (e) => (e.I * e.t) / e.P],
    ["I/(P + t)", (e) => e.I / (e.P + e.t)],
  ],
  [
    "y = mx + b",
    "x",
    ["(y − b)/m", (e) => (e.y - e.b) / e.m],
    ["y/m − b", (e) => e.y / e.m - e.b],
    ["(y + b)/m", (e) => (e.y + e.b) / e.m],
  ],
  [
    "v = u + at",
    "t",
    ["(v − u)/a", (e) => (e.v - e.u) / e.a],
    ["v/a − u", (e) => e.v / e.a - e.u],
    ["(v + u)/a", (e) => (e.v + e.u) / e.a],
  ],
  [
    "E = mc²",
    "m",
    ["E/c²", (e) => e.E / e.c ** 2],
    ["E/(2c)", (e) => e.E / (2 * e.c)],
    ["Ec²", (e) => e.E * e.c ** 2],
  ],
  [
    "A = ½(a + b)h",
    "h",
    ["2A/(a + b)", (e) => (2 * e.A) / (e.a + e.b)],
    ["A/(2(a + b))", (e) => e.A / (2 * (e.a + e.b))],
    ["2A/(ab)", (e) => (2 * e.A) / (e.a * e.b)],
  ],
  [
    "C = 2πr",
    "r",
    ["C/(2π)", (e) => e.C / (2 * Math.PI)],
    ["2C/π", (e) => (2 * e.C) / Math.PI],
    ["2πC", (e) => 2 * Math.PI * e.C],
  ],
  [
    "V = lwh",
    "h",
    ["V/(lw)", (e) => e.V / (e.l * e.w)],
    ["Vw/l", (e) => (e.V * e.w) / e.l],
    ["V/(l + w)", (e) => e.V / (e.l + e.w)],
  ],
];
const letters = (x: number): Letters =>
  Object.fromEntries(
    [..."AbhPlwdrtFCIymvuaEcV"].map((c, i) => [
      c,
      x * (1 + i / 10) + (i + 1) / 7,
    ]),
  );

type Budget = (who: string, total: string, fee: string, rate: string) => string;
const BUDGETS: Record<string, Budget> = {
  fair: (who, total, fee, rate) =>
    `${who} has ${total}. Entry to the fair costs ${fee} and each ride costs ${rate}. What is the greatest number of rides ${who} can take?`,
  "day out": (who, total, fee, rate) =>
    `${who} has ${total} for a day out. The bus fare is ${fee} and each game at the arcade costs ${rate}. What is the greatest number of games ${who} can play?`,
  club: (who, total, fee, rate) =>
    `${who}'s club must raise ${total}. Each raffle ticket sells for ${rate} and the printing cost ${fee}. What is the fewest tickets they must sell?`,
  team: (who, total, fee, rate) =>
    `${who}'s team must raise ${total}. Each car wash costs the buyer ${rate} and the supplies cost ${fee}. What is the fewest cars they must wash?`,
};

type Mix = (
  who: string,
  count: number,
  high: string,
  low: string,
  bill: string,
  first: boolean,
) => string;
const MIXES: Record<string, Mix> = {
  show: (who, count, high, low, bill, first) =>
    `${who} buys ${count} tickets for the show. Adult tickets cost ${high} and child tickets cost ${low}. The total is ${bill}. How many ${first ? "adult" : "child"} tickets were bought?`,
  café: (who, count, high, low, bill, first) =>
    `${who} orders ${count} drinks. A large costs ${high} and a small costs ${low}. The bill is ${bill}. How many ${first ? "large" : "small"} drinks were ordered?`,
};

export const levels: Level[] = [
  {
    skill: "Equations with a fraction or a decimal",
    make(r) {
      const form = r.pick("form", ["F", "D"]);
      const { prompt, values } = r.exclude(
        () => {
          if (form === "F") {
            const a = r.int("a", 2, 9);
            const v = r.pick("q", nonzero(12));
            const b = r.pick("b", nonzero(12));
            const c = v + b;
            return {
              prompt: `Solve ${terms([
                [1, `x/${a}`],
                [b, ""],
              ])} = ${int(c)}.`,
              c,
              values: [a * (c - b), a * c - b, a * (c + b)],
            };
          }
          const k = r.pick("k", [2, 4, 5]);
          const w = r.pick("w", nonzero(k === 2 ? 8 : k === 4 ? 4 : 3));
          const b = r.pick("b", nonzero(12));
          const c = k * w + b;
          return {
            prompt: `Solve ${terms([
              [1, `${dec(q(1, k))}x`],
              [b, ""],
            ])} = ${int(c)}.`,
            c,
            values: [k * (c - b), (c - b) / k, k * (c + b)],
          };
        },
        ({ c, values }) =>
          c === 0 ||
          Math.abs(c) > (form === "F" ? 20 : 40) ||
          !distinct(values) ||
          (form === "F" && loneSign(values)),
      );
      return {
        prompt,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "Literal equations",
    make(r) {
      const form = r.weighted("form", [
        ["W", 1],
        ["N", 3],
      ]);
      if (form === "W") {
        const [formula, target, ...sides] = BANK[r.int("i", 1, 14) - 1];
        const [answer, d1, d2] = sides.map(([text, value]) =>
          expr(`${target} = ${text}`, (x) => value(letters(x))),
        );
        return {
          prompt: `${formula}. Solve for ${target}.`,
          answer,
          wrong: [d1, d2],
        };
      }
      const a = r.int("a", 2, 9);
      const b = r.int("b", 2, 9);
      const c = r.pick("c", nonzero(20));
      const moved = (sign: number) =>
        terms([
          [c, ""],
          [sign * a, "x"],
        ]);
      return {
        prompt: `Solve ${terms([
          [a, "x"],
          [b, "y"],
        ])} = ${int(c)} for y.`,
        answer: expr(`y = (${moved(-1)})/${b}`, (x) => (c - a * x) / b),
        wrong: [
          expr(
            `y = ${c % b === 0 ? int(c / b) : over(c, b)} − ${a}x`,
            (x) => c / b - a * x,
          ),
          expr(`y = (${moved(1)})/${b}`, (x) => (c + a * x) / b),
        ],
      };
    },
  },
  {
    skill: "Linear inequalities, with the flip",
    make(r) {
      const v = r.pick("v", ["V", "R"]);
      const { a, rel, n, b, c } = r.exclude(
        () => {
          const a = r.pick(
            "a",
            nonzero(9).filter((a) => Math.abs(a) >= 2),
          );
          const rel = r.pick("rel", RELS);
          const n = r.pick("n", nonzero(12));
          const b = r.pick("b", multiples(a));
          return { a, rel, n, b, c: a * n + b };
        },
        ({ a, n, b, c }) => {
          if (c === 0 || Math.abs(c) > 99) return true;
          if (v === "R") return false;
          const values = [n, (c + b) / a, c - b];
          return !distinct(values) || loneSign(values);
        },
      );
      const out = a > 0 ? rel : REVERSED[rel];
      return {
        prompt: `Solve ${linear(a, b)} ${rel} ${int(c)}.`,
        answer: ray(out, n),
        wrong:
          v === "V"
            ? [ray(out, (c + b) / a), ray(out, c - b)]
            : [ray(REVERSED[out], n), ray(SWAPPED[out], n)],
      };
    },
  },
  {
    skill: "Compound inequalities",
    make(r) {
      const { a, b, lo, hi, r1, r2 } = r.exclude(
        () => {
          const a = r.int("a", 2, 9);
          const b = r.pick("b", multiples(a));
          const lo = r.pick("lo", nonzero(12));
          const hi = r.pick("hi", nonzero(12));
          const r1 = r.pick("r1", ["<", "≤"]);
          const r2 = r.pick("r2", ["<", "≤"]);
          return { a, b, lo, hi, r1, r2 };
        },
        ({ a, b, lo, hi }) => {
          if (lo >= hi) return true;
          if (Math.abs(a * lo + b) > 99 || Math.abs(a * hi + b) > 99)
            return true;
          const shift = (2 * b) / a;
          return (
            !distinct([lo, a * lo, lo + shift]) ||
            !distinct([hi, a * hi, hi + shift])
          );
        },
      );
      const band = (l: number, h: number) =>
        choice(
          `${int(l)} ${r1} x ${r2} ${int(h)}`,
          `band:${r1}${l},${r2}${h}`,
        );
      const shift = (2 * b) / a;
      return {
        prompt: `Solve ${int(a * lo + b)} ${r1} ${linear(a, b)} ${r2} ${int(a * hi + b)}.`,
        answer: band(lo, hi),
        wrong: [band(a * lo, a * hi), band(lo + shift, hi + shift)],
      };
    },
  },
  {
    skill: "Absolute value equations",
    make(r) {
      const s = r.pick("s", ["P", "Z"]);
      const { a, p, gap } = r.exclude(
        () => ({
          a: r.int("a", 2, 7),
          p: r.pick("p", nonzero(10)),
          gap: r.int("q", 1, 9),
        }),
        ({ a, p, gap }) => a * gap > 60 || p + gap === 0,
      );
      const x1 = p + gap;
      const x2 = p - gap;
      const none = label("no solution");
      const prompt = `Solve |${linear(a, -a * p)}| = ${int(s === "P" ? a * gap : -a * gap)}.`;
      return s === "P"
        ? { prompt, answer: roots(x2, x1), wrong: [roots(-x1, x1), none] }
        : { prompt, answer: none, wrong: [roots(x2, x1), roots(-x1, x1)] };
    },
  },
  {
    skill: "Systems by elimination",
    make(r) {
      const op = r.pick("op", ["A", "B"]);
      const { a, c, x, y, W } = r.exclude(
        () => {
          const a = r.int("a", 1, 6);
          const c = r.int("c", 1, 6);
          const x = r.int("x", -8, 8);
          const y = r.pick("y", nonzero(8));
          return {
            a,
            c,
            x,
            y,
            S: op === "A" ? a + c : a - c,
            W: op === "A" ? a - c : a + c,
          };
        },
        ({ a, c, x, y, S, W }) => {
          if (a === c || x === y || S === 0 || W === 0 || (2 * y) % W !== 0)
            return true;
          const second = op === "A" ? c * x - y : c * x + y;
          if (Math.abs(a * x + y) > 60 || Math.abs(second) > 60) return true;
          const t = (2 * y) / W;
          return !distinct([x, y, x + t]) || !distinct([y, x, y - a * t]);
        },
      );
      const t = (2 * y) / W;
      const lower = op === "A" ? -1 : 1;
      return {
        prompt: `Solve the system: ${terms([
          [a, "x"],
          [1, "y"],
        ])} = ${int(a * x + y)}; ${terms([
          [c, "x"],
          [lower, "y"],
        ])} = ${int(c * x + lower * y)}.`,
        answer: point(x, y),
        wrong: [point(y, x), point(x + t, y - a * t)],
      };
    },
  },
  {
    skill: "How many solutions",
    make(r) {
      const form = r.pick("form", ["E", "S"]);
      const kind = r.pick("case", ["one", "none", "inf"] as const);
      let prompt: string;
      if (form === "E") {
        const m = r.int("m", 2, 6);
        const e = r.int("e", 1, 6);
        const f = r.resample(
          () => r.pick("f", nonzero(9)),
          (f) => Math.abs(m * f) <= 30,
        );
        let a = m * e;
        let b = m * f;
        if (kind === "none")
          b = r.resample(
            () => r.pick("b", nonzero(30)),
            (b) => b !== m * f,
          );
        if (kind === "one") {
          a = r.resample(
            () => r.int("a", 2, 12),
            (a) => a !== m * e,
          );
          b = r.pick("b", nonzero(30));
        }
        prompt = `How many solutions does ${linear(a, b)} = ${m}(${linear(e, f)}) have?`;
      } else {
        const a = r.pick("a", nonzero(6));
        const b = r.pick("b", nonzero(6));
        const c = r.pick("c", nonzero(20));
        let d: number;
        let e: number;
        let f: number;
        if (kind === "one") {
          ({ d, e } = r.exclude(
            () => ({
              d: r.pick("d", nonzero(6)),
              e: r.pick("e", nonzero(6)),
            }),
            ({ d, e }) => a * e === d * b,
          ));
          f = r.pick("f", nonzero(20));
        } else {
          const k = r.pick("k", [2, 3, -2]);
          d = k * a;
          e = k * b;
          f = kind === "inf" ? k * c : k * c + r.pick("offset", nonzero(4));
        }
        prompt = `How many solutions does this system have? ${terms([
          [a, "x"],
          [b, "y"],
        ])} = ${int(c)}; ${terms([
          [d, "x"],
          [e, "y"],
        ])} = ${int(f)}.`;
      }
      const labels = {
        one: label("one solution"),
        none: label("no solutions"),
        inf: label("infinitely many solutions"),
      };
      const [d1, d2] = (["one", "none", "inf"] as const)
        .filter((other) => other !== kind)
        .map((other) => labels[other]);
      return { prompt, answer: labels[kind], wrong: [d1, d2] };
    },
  },
  {
    skill: "Inequality word problem",
    make(r) {
      const s = r.pick("s", ["max", "min"]);
      const u = r.pick("u", ["I", "U"]);
      const { rate, f, T, values } = r.exclude(
        () => {
          const rate = q(
            r.pick("r", [150, 200, 250, 300, 350, 400, 500]),
            100,
          );
          const f = r.int("f", 5, 20);
          const T = s === "max" ? r.int("T", 30, 120) : r.int("T", 40, 150);
          const rounded = q(s === "max" ? T - f : T + f).div(rate);
          const plain = q(T).div(rate);
          const answer = s === "max" ? rounded.floor() : rounded.ceil();
          const d2 =
            s === "max"
              ? plain.floor() - (u === "U" ? f : 0)
              : plain.ceil() + (u === "U" ? f : 0);
          return {
            rate,
            f,
            T,
            exact: rounded.isInt(),
            values: [answer, s === "max" ? answer + 1 : answer - 1, d2],
          };
        },
        ({ exact, values }) =>
          exact ||
          values[0] < (s === "max" ? 3 : 4) ||
          values.some((v) => v < 1) ||
          !distinct(values),
      );
      const context = r.pick(
        "context",
        s === "max" ? ["fair", "day out"] : ["club", "team"],
      );
      const who = r.pick("Name", NAMES);
      return {
        prompt: BUDGETS[context](
          who,
          money(T, 0),
          money(f, 0),
          money(rate, "auto"),
        ),
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "System word problem",
    make(r) {
      const which = r.pick("which", ["A", "C"]);
      const t = r.pick("t", ["hi", "lo"]);
      const { pC, pA, N, A, e } = r.exclude(
        () => {
          const pC = r.int("pC", 3, 8);
          const g = r.int("g", 2, 6);
          const N = r.int("N", 10, 30);
          const A = r.int("A", 3, N - 3);
          const pA = pC + g;
          const fits = t === "hi" ? A * g <= N : (g * A) % pA === 0;
          const e = !fits ? 0 : t === "hi" ? A * g : (g * A) / pA;
          return { pC, pA, N, A, fits, e };
        },
        ({ N, A, fits, e }) => {
          if (2 * A === N || !fits || e < 1) return true;
          const values = which === "A" ? [A, N - A, e] : [N - A, A, N - e];
          return !distinct(values) || values.some((v) => v < 1);
        },
      );
      const context = r.pick("context", ["show", "café"]);
      const who = r.pick("Name", NAMES);
      const C = N - A;
      return {
        prompt: MIXES[context](
          who,
          N,
          money(pA, 0),
          money(pC, 0),
          money(pA * A + pC * C, 0),
          which === "A",
        ),
        answer: whole(which === "A" ? A : C),
        wrong: [
          whole(which === "A" ? C : A),
          whole(which === "A" ? e : N - e),
        ],
      };
    },
  },
  {
    skill: "Absolute value inequalities",
    make(r) {
      const v = r.pick("v", ["K", "V"]);
      const d = r.pick("d", ["LT", "GT"]);
      const st = r.pick("st", ["strict", "loose"]);
      const { a, p, gap } = r.exclude(
        () => ({
          a: r.int("a", v === "V" ? 2 : 1, 5),
          p: r.pick("p", nonzero(10)),
          gap: r.int("q", 1, 10),
        }),
        ({ a, p, gap }) => {
          const x1 = p + gap;
          const x2 = p - gap;
          if (x1 === 0 || x2 === 0 || a * gap > 60) return true;
          if (v === "K") return false;
          return (
            !distinct([x2, -x1, a * x2]) || !distinct([x1, -x2, a * x1])
          );
        },
      );
      const x1 = p + gap;
      const x2 = p - gap;
      const lt = st === "strict" ? "<" : "≤";
      const gt = st === "strict" ? ">" : "≥";
      const band = (lo: number, hi: number) =>
        choice(
          `${int(lo)} ${lt} x ${lt} ${int(hi)}`,
          `band:${lt}${lo},${hi}`,
        );
      const union = (lo: number, hi: number) =>
        choice(
          `x ${lt} ${int(lo)} or x ${gt} ${int(hi)}`,
          `union:${lt}${lo},${hi}`,
        );
      const [shape, other] = d === "LT" ? [band, union] : [union, band];
      const rel = d === "LT" ? lt : gt;
      return {
        prompt: `Solve |${linear(a, -a * p)}| ${rel} ${int(a * gap)}.`,
        answer: shape(x2, x1),
        wrong:
          v === "K"
            ? [other(x2, x1), ray(rel, x1)]
            : [shape(-x1, -x2), shape(a * x2, a * x1)],
      };
    },
  },
];

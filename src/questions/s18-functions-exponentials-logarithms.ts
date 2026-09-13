import {
  type Level,
  Rat,
  choice,
  dec,
  distinctValues,
  expr,
  fixed,
  int,
  label,
  lcm,
  loneSign,
  money,
  nearBoundary,
  nonzero,
  num,
  q,
  range,
  roundHalfUp,
  sub,
  sup,
  terms,
  whole,
  withPositiveDomain,
} from "./kit.ts";

export const name = "Functions, Exponentials, and Logarithms";

const linear = (a: number, b: number) =>
  terms([
    [a, "x"],
    [b, ""],
  ]);
const shift = (h: number) =>
  terms([
    [1, "x"],
    [-h, ""],
  ]);
const quadratic = (a: number, b: number, c: number) =>
  terms([
    [a, "x²"],
    [b, "x"],
    [c, ""],
  ]);
const offered = <T>(pair: string, slips: Record<string, T>): [T, T] => [
  slips[pair[0]],
  slips[pair[1]],
];
function slotted(parts: readonly (readonly number[])[]) {
  const agree = (x: readonly number[], y: readonly number[]) =>
    x.some((part, i) => part === y[i]);
  const voted = (rows: readonly (readonly number[])[]) => {
    const [a, b, c] = rows;
    if (agree(a, b) && agree(a, c) && !agree(b, c)) return false;
    const majority = a.map((_, i) => {
      const column = rows.map((p) => p[i]);
      return column.find((part) => column.filter((x) => x === part).length > 1);
    });
    return !majority.every((part, i) => part === a[i]);
  };
  const halves = parts.map((p) =>
    p.flatMap((v) => [v < 0 ? -1 : 1, Math.abs(v)]),
  );
  return voted(parts) && voted(halves);
}
function counted(v: Rat) {
  if (!v.isInt()) throw new RangeError(`${v} is not whole`);
  return whole(v.n);
}
const units = (n: number) =>
  `${Math.abs(n)} unit${Math.abs(n) === 1 ? "" : "s"}`;
const inverse = (text: string, f: (x: number) => number) =>
  expr(`f${sup(-1)}(x) = ${text}`, f);
const logb = (b: number) => `log${sub(b)}`;
const xIs = (v: number) => num(v, `x = ${int(v)}`);

type Amount = Rat | number;
const size = (v: Amount) => (v instanceof Rat ? v.toNumber() : v);
const onTie = (v: Amount) =>
  v instanceof Rat
    ? v.mul(100).sub(v.mul(100).floor()).eq(q(1, 2))
    : nearBoundary(v, 2);
const cents = (v: Amount) =>
  v instanceof Rat ? roundHalfUp(v, 2) : q(Math.round(v * 100), 100);
const twoDp = (v: Amount) =>
  v instanceof Rat ? dec(roundHalfUp(v, 2), 2, true) : fixed(v, 2, true);
const pairs = (values: readonly Amount[]) => {
  const shown = values.map(cents);
  return shown.flatMap((a, i) =>
    shown.slice(i + 1).map((b) => (a.cmp(b) < 0 ? [a, b] : [b, a])),
  );
};
const crowded = (values: readonly Amount[], gap: Rat) =>
  pairs(values).some(([lo, hi]) => hi.sub(lo).cmp(gap) < 0);
const withinTwoPercent = (values: readonly Amount[]) =>
  pairs(values).some(([lo, hi]) => hi.sub(lo).cmp(hi.mul(q(2, 100))) <= 0);

type Story = {
  name: string;
  unit: string;
  period: string;
  opening: (amount: string) => string;
  ask: string;
};
type Trend = Story & { change: (rate: number) => string };
const GROWING: Trend[] = [
  {
    name: "a savings account",
    unit: "$",
    period: "year",
    opening: (P) => `A savings account holds ${P}.`,
    change: (r) => `It gains ${r}%`,
    ask: "How much is in it",
  },
  {
    name: "an investment",
    unit: "$",
    period: "year",
    opening: (P) => `An investment is worth ${P}.`,
    change: (r) => `It gains ${r}%`,
    ask: "What is it worth",
  },
  {
    name: "a reed bed",
    unit: "m²",
    period: "year",
    opening: (P) => `A reed bed covers ${P}.`,
    change: (r) => `It grows by ${r}%`,
    ask: "How much does it cover",
  },
  {
    name: "a town's water use",
    unit: "kL",
    period: "year",
    opening: (P) => `A town uses ${P} of water a day.`,
    change: (r) => `Its use grows by ${r}%`,
    ask: "How much will it use a day",
  },
];
const FALLING: Trend[] = [
  {
    name: "a machine's value",
    unit: "$",
    period: "year",
    opening: (P) => `A machine is worth ${P}.`,
    change: (r) => `It loses ${r}% of its value`,
    ask: "What is it worth",
  },
  {
    name: "a pond",
    unit: "kL",
    period: "week",
    opening: (P) => `A pond holds ${P} of water.`,
    change: (r) => `It loses ${r}%`,
    ask: "How much is left",
  },
  {
    name: "a forest",
    unit: "km²",
    period: "year",
    opening: (P) => `A forest covers ${P}.`,
    change: (r) => `It shrinks by ${r}%`,
    ask: "How much is left",
  },
  {
    name: "a dose in the blood",
    unit: "mg",
    period: "hour",
    opening: (P) => `A dose of ${P} is in the blood.`,
    change: (r) => `It drops by ${r}%`,
    ask: "How much is left",
  },
];
const HALVING: Story[] = [
  {
    name: "a radioactive sample",
    unit: "g",
    period: "year",
    opening: (P) => `A radioactive sample weighing ${P}`,
    ask: "How much is left",
  },
  {
    name: "a tracer",
    unit: "mg",
    period: "hour",
    opening: (P) => `A tracer dose of ${P}`,
    ask: "How much is left",
  },
  {
    name: "a pollutant",
    unit: "g",
    period: "day",
    opening: (P) => `A pollutant weighing ${P}`,
    ask: "How much is left",
  },
];
const DOUBLING: Story[] = [
  {
    name: "a yeast culture",
    unit: "g",
    period: "hour",
    opening: (P) => `A yeast culture weighing ${P}`,
    ask: "How much is there",
  },
  {
    name: "a colony",
    unit: "mm²",
    period: "hour",
    opening: (P) => `A bacteria colony covering ${P}`,
    ask: "How much does it cover",
  },
  {
    name: "an algae mat",
    unit: "m²",
    period: "day",
    opening: (P) => `An algae mat covering ${P}`,
    ask: "How much does it cover",
  },
];
const RISES = [
  {
    name: "a town's people",
    opening: "A town of 5,000 people",
    per: "a year",
    period: "year",
  },
  {
    name: "an investment",
    opening: "An investment of $2,000",
    per: "a year",
    period: "year",
  },
  {
    name: "a bacteria colony",
    opening: "A bacteria colony of 800 cells",
    per: "an hour",
    period: "hour",
  },
  {
    name: "site traffic",
    opening: "A website's daily traffic of 3,000 visits",
    per: "a month",
    period: "month",
  },
];
const told = <T extends { name: string }>(list: readonly T[], name: string) =>
  list.find((s) => s.name === name)!;
const AMOUNTS = range(4, 18).map((n) => n * 50);
const RATES = [4, 5, 6, 8, 10, 12, 15, 20, 25];
const worth = (unit: string, P: number) =>
  unit === "$" ? money(P, 0) : `${int(P)} ${unit}`;
const reading = (unit: string, v: Amount) =>
  num(cents(v), unit === "$" ? money(cents(v)) : `${twoDp(v)} ${unit}`);

const LOGGED = [2, 3, 5, 6, 7, 11, 13, 15];
const approx = (n: number) => ({
  text: fixed(Math.log10(n), 2),
  value: q(Math.round(Math.log10(n) * 100), 100),
});
const POINTS = [
  [5.3, 1.7],
  [7.9, 2.9],
  [3.7, 1.3],
];
const twoVar = (text: string, f: (x: number, y: number) => number) =>
  choice(
    text,
    `xy:${POINTS.map(([x, y]) => f(x, y).toPrecision(12)).join(",")}`,
  );
const TOP: Record<number, number> = { 2: 9, 3: 6, 5: 4, 10: 3 };

export const levels: Level[] = [
  {
    skill: "Evaluating a function",
    make(r) {
      if (r.pick("form", ["Q", "R"]) === "Q") {
        const pair = r.weighted("v", [
          ["SA", 4],
          ["SM", 1],
          ["AM", 2],
        ]);
        const { prompt, values } = r.exclude(
          () => {
            const a = r.pick(
              "a",
              range(-5, 5).filter((a) => Math.abs(a) >= 2),
            );
            const b = r.pick("b", nonzero(9));
            const c = r.pick("c", nonzero(12));
            const n = r.int("n", -7, -1);
            const answer = a * n * n + b * n + c;
            const slips: Record<string, number> = {
              S: -a * n * n + b * n + c,
              A: a * n * n - b * n + c,
              M: (a * n) ** 2 + b * n + c,
            };
            return {
              prompt: `f(x) = ${quadratic(a, b, c)}. What is f(${int(n)})?`,
              all: [answer, slips.S, slips.A, slips.M],
              values: [answer, ...offered(pair, slips)],
            };
          },
          ({ all, values }) => new Set(all).size < 4 || loneSign(values),
        );
        return {
          prompt,
          answer: whole(values[0]),
          wrong: [whole(values[1]), whole(values[2])],
        };
      }
      const pair = r.pick("v", ["PO", "PZ", "OZ"]);
      const { prompt, values } = r.exclude(
        () => {
          const d = r.pick("d", nonzero(9));
          const n = r.pick(
            "n",
            range(-9, 9).filter((n) => n !== 0 && n !== d && n !== -d),
          );
          const t = r.pick("t", nonzero(6));
          const m = n - d;
          const need = (slip: string) => Math.abs(slip === "P" ? n + d : n);
          const k = lcm(lcm(Math.abs(m), need(pair[0])), need(pair[1])) * t;
          const slips: Record<string, Rat> = {
            P: q(k, n + d),
            O: q(k, n).sub(d),
            Z: q(k, n),
          };
          return {
            k,
            prompt: `f(x) = ${int(k)}/(${shift(d)}). What is f(${int(n)})?`,
            values: [q(k, m), ...offered(pair, slips)],
          };
        },
        ({ k, values }) =>
          Math.abs(k) > 400 ||
          values[0].abs().cmp(60) > 0 ||
          !distinctValues(values) ||
          loneSign(values),
      );
      return {
        prompt,
        answer: counted(values[0]),
        wrong: [counted(values[1]), counted(values[2])],
      };
    },
  },
  {
    skill: "Domain and range",
    make(r) {
      const form = r.pick("form", ["F", "S", "G"]);
      const bound = (variable: string, rel: string, value: number) =>
        label(`${variable} ${rel} ${int(value)}`);
      if (form === "F") {
        const a = r.pick("a", nonzero(12));
        const k = r.int("k", 1, 12);
        return {
          prompt: `What is the domain of f(x) = ${k}/(${shift(a)})?`,
          answer: bound("x", "≠", a),
          wrong: [bound("x", "≠", -a), bound("x", "≠", 0)],
        };
      }
      const reversed: Record<string, string> = {
        "≥": "≤",
        "≤": "≥",
        ">": "<",
        "<": ">",
      };
      const v = r.pick("v", ["dir", "bnd"]);
      if (form === "S") {
        const shape = r.pick("shape", ["L", "U", "D"]);
        const a = r.pick("a", nonzero(20));
        const body =
          shape === "L"
            ? `√(${shift(a)})`
            : shape === "U"
              ? `√(${terms([
                  [a, ""],
                  [-1, "x"],
                ])})`
              : `1/√(${shift(a)})`;
        const rel = shape === "L" ? "≥" : shape === "U" ? "≤" : ">";
        const toggled = shape === "L" ? ">" : shape === "U" ? "<" : "≥";
        return {
          prompt: `What is the domain of f(x) = ${body}?`,
          answer: bound("x", rel, a),
          wrong:
            v === "dir"
              ? [bound("x", reversed[rel], a), bound("x", toggled, a)]
              : [bound("x", rel, -a), bound("x", rel, 0)],
        };
      }
      const h = r.pick("h", nonzero(7));
      const k = r.pick(
        "k",
        nonzero(12).filter((k) => Math.abs(k) !== Math.abs(h)),
      );
      const s = r.sign("s");
      const rel = s > 0 ? "≥" : "≤";
      return {
        prompt: `What is the range of f(x) = ${terms([
          [s, `(${shift(h)})²`],
          [k, ""],
        ])}?`,
        answer: bound("y", rel, k),
        wrong:
          v === "dir"
            ? [bound("y", reversed[rel], k), bound("y", s > 0 ? ">" : "<", k)]
            : [bound("y", rel, h), bound("y", rel, -k)],
      };
    },
  },
  {
    skill: "Composition",
    make(r) {
      const form = r.pick("form", ["N", "X"]);
      const given = (a: number, b: number, c: number) =>
        `f(x) = ${linear(a, b)} and g(x) = ${terms([
          [1, "x²"],
          [c, ""],
        ])}.`;
      const pickA = () =>
        r.pick(
          "a",
          range(-6, 6).filter((a) => Math.abs(a) >= 2),
        );
      if (form === "N") {
        const pair = r.pick("v", ["OP", "OU", "PU"]);
        const { prompt, values } = r.exclude(
          () => {
            const a = pickA();
            const b = r.pick("b", nonzero(9));
            const c = r.pick("c", nonzero(9));
            const n = r.pick("n", nonzero(5));
            const answer = a * (n * n + c) + b;
            const slips: Record<string, number> = {
              O: (a * n + b) ** 2 + c,
              P: (a * n + b) * (n * n + c),
              U: a * n * n + c + b,
            };
            return {
              prompt: `${given(a, b, c)} What is f(g(${int(n)}))?`,
              all: [answer, slips.O, slips.P, slips.U],
              values: [answer, ...offered(pair, slips)],
            };
          },
          ({ all, values }) =>
            new Set(all).size < 4 ||
            values.some((v) => Math.abs(v) > 1200) ||
            loneSign(values) ||
            !slotted(values.map((v) => [v])),
        );
        return {
          prompt,
          answer: whole(values[0]),
          wrong: [whole(values[1]), whole(values[2])],
        };
      }
      const w = r.pick("w", ["O", "P"]);
      const { a, b, c, three } = r.exclude(
        () => {
          const a = pickA();
          const b = r.pick("b", nonzero(9));
          const c = r.pick("c", nonzero(9));
          return {
            a,
            b,
            c,
            three: [
              [0, a, 0, a * c + b],
              [0, a, 0, c + b],
              w === "O"
                ? [0, a * a, 2 * a * b, b * b + c]
                : [a, b, a * c, b * c],
            ],
          };
        },
        ({ a, b, c, three }) =>
          a * c + b === 0 || c + b === 0 || !slotted(three),
      );
      const poly = ([A, B, C, D]: readonly number[]) =>
        expr(
          terms([
            [A, "x³"],
            [B, "x²"],
            [C, "x"],
            [D, ""],
          ]),
          (x) => A * x ** 3 + B * x * x + C * x + D,
        );
      return {
        prompt: `${given(a, b, c)} Write (f ∘ g)(x).`,
        answer: poly(three[0]),
        wrong: [poly(three[1]), poly(three[2])],
      };
    },
  },
  {
    skill: "Inverse functions",
    make(r) {
      if (r.pick("form", ["L", "R"]) === "L") {
        const w = r.pick("w", ["ord", "rec"]);
        const a = r.int("a", 2, 9);
        const b = r.pick("b", nonzero(20));
        return {
          prompt: `f(x) = ${linear(a, b)}. What is f${sup(-1)}(x)?`,
          answer: inverse(`(${shift(b)})/${a}`, (x) => (x - b) / a),
          wrong: [
            inverse(`(${shift(-b)})/${a}`, (x) => (x + b) / a),
            w === "ord"
              ? inverse(
                  terms([
                    [1, `x/${a}`],
                    [-b, ""],
                  ]),
                  (x) => x / a - b,
                )
              : inverse(`1/(${linear(a, b)})`, (x) => 1 / (a * x + b)),
          ],
        };
      }
      const w = r.pick("w", ["rec", "sgn"]);
      const k = r.int("k", 2, 15);
      const d = r.pick("d", nonzero(12));
      const reciprocal = (c: number) =>
        terms([
          [k, "/x"],
          [c, ""],
        ]);
      return {
        prompt: `f(x) = ${k}/(${shift(d)}). What is f${sup(-1)}(x)?`,
        answer: inverse(reciprocal(d), (x) => k / x + d),
        wrong: [
          inverse(reciprocal(-d), (x) => k / x - d),
          w === "rec"
            ? inverse(`(${shift(d)})/${k}`, (x) => (x - d) / k)
            : inverse(`${k}/(${shift(-d)})`, (x) => k / (x + d)),
        ],
      };
    },
  },
  {
    skill: "Transformations",
    make(r) {
      const form = r.pick("form", ["D", "E", "R"]);
      if (form === "D") {
        const h = r.pick("h", nonzero(9));
        const k = r.pick("k", nonzero(9));
        const move = (right: boolean, up: boolean) =>
          label(
            `${units(h)} ${right ? "right" : "left"} and ${units(k)} ${up ? "up" : "down"}`,
          );
        return {
          prompt: `g(x) = ${terms([
            [1, `f(${shift(h)})`],
            [k, ""],
          ])}. How does the graph of g compare with the graph of f?`,
          answer: move(h > 0, k > 0),
          wrong: [move(h < 0, k > 0), move(h < 0, k < 0)],
        };
      }
      if (form === "E") {
        const parent = r.pick("parent", ["x²", "x³", "|x|"]);
        const h = r.pick("h", nonzero(9));
        const k = r.pick("k", nonzero(9));
        const curve = (across: number, lift: number) => {
          const body =
            parent === "|x|"
              ? `|${shift(across)}|`
              : `(${shift(across)})${parent === "x²" ? "²" : "³"}`;
          const base = (u: number) =>
            parent === "|x|" ? Math.abs(u) : u ** (parent === "x²" ? 2 : 3);
          return expr(
            `y = ${terms([
              [1, body],
              [lift, ""],
            ])}`,
            (x) => base(x - across) + lift,
          );
        };
        return {
          prompt: `The graph of y = ${parent} is moved ${units(h)} ${h > 0 ? "right" : "left"} and ${units(k)} ${k > 0 ? "up" : "down"}. Which is the new function?`,
          answer: curve(h, k),
          wrong: [curve(-h, k), curve(-h, -k)],
        };
      }
      const a = r.pick("a", nonzero(3));
      const b = r.pick("b", nonzero(9));
      const c = r.pick("c", nonzero(12));
      const across = r.pick("ax", ["x", "y"]);
      const g = across === "x" ? quadratic(-a, -b, -c) : quadratic(a, -b, c);
      const inX = label("reflected in the x-axis");
      const inY = label("reflected in the y-axis");
      return {
        prompt: `f(x) = ${quadratic(a, b, c)} and g(x) = ${g}. How is the graph of g related to the graph of f?`,
        answer: across === "x" ? inX : inY,
        wrong: [
          across === "x" ? inY : inX,
          label("reflected in the line y = x"),
        ],
      };
    },
  },
  {
    skill: "Exponential growth and decay",
    make(r) {
      if (r.pick("form", ["G", "H"]) === "G") {
        const dir = r.pick("dir", ["up", "down"]);
        const pair = r.weighted(
          "v",
          dir === "up"
            ? [
                ["LF", 2],
                ["LE", 1],
                ["FE", 1],
              ]
            : [
                ["LF", 1],
                ["LE", 2],
                ["FE", 1],
              ],
        );
        const stories = dir === "up" ? GROWING : FALLING;
        const story = told(
          stories,
          r.pick(
            "context",
            stories.map((s) => s.name),
          ),
        );
        const s = dir === "up" ? 1 : -1;
        const { P, rate, t, values } = r.exclude(
          () => {
            const P = r.pick("P", AMOUNTS);
            const rate = r.pick("r", RATES);
            const t = r.int("t", 2, Math.min(6, Math.floor(94 / rate)));
            const along = q(100 + s * rate, 100);
            const answer = along.pow(t).mul(P);
            const slips: Record<string, Rat> = {
              L: q(100 + s * rate * t, 100).mul(P),
              F: q(100 - s * rate, 100)
                .pow(t)
                .mul(P),
              E: along.pow(t + 1).mul(P),
            };
            return {
              P,
              rate,
              t,
              all: [answer, slips.L, slips.F, slips.E],
              values: [answer, ...offered(pair, slips)],
            };
          },
          ({ all, values }) =>
            all.some(onTie) ||
            withinTwoPercent(values) ||
            values.some((v) => v.cmp(1) < 0),
        );
        return {
          prompt: `${story.opening(worth(story.unit, P))} ${story.change(rate)} each ${story.period}. ${story.ask} after ${t} ${story.period}s? Round to 2 dp.`,
          answer: reading(story.unit, values[0]),
          wrong: [
            reading(story.unit, values[1]),
            reading(story.unit, values[2]),
          ],
        };
      }
      const dir = r.pick("dir", ["half", "double"]);
      const pair = r.weighted("v", [
        ["IF", 2],
        ["IE", 3],
        ["FE", 2],
      ]);
      const stories = dir === "half" ? HALVING : DOUBLING;
      const story = told(
        stories,
        r.pick(
          "context",
          stories.map((s) => s.name),
        ),
      );
      const s = dir === "double" ? 1 : -1;
      const amount = (P: number, e: number): Amount =>
        Number.isInteger(e)
          ? q(2)
              .pow(s * e)
              .mul(P)
          : P * 2 ** (s * e);
      const { P, h, t, values } = r.exclude(
        () => {
          const P = r.pick("P", AMOUNTS);
          const h = r.int("h", 2, 8);
          const periods = r.pick("q", [1.5, 2, 2.5, 3, 3.5, 4]);
          const t = periods * h;
          if (!Number.isInteger(t) || t < 3 || t > 8)
            return { P, h, t, all: [], values: [] };
          const answer = amount(P, periods);
          const slips: Record<string, Amount> = {
            I: amount(P, t),
            F: amount(P, periods - 1),
            E: amount(P, periods + 1),
          };
          return {
            P,
            h,
            t,
            all: [answer, slips.I, slips.F, slips.E],
            values: [answer, ...offered(pair, slips)],
          };
        },
        ({ all, values }) =>
          !values.length ||
          all.some(onTie) ||
          withinTwoPercent(values) ||
          values.some((v) => size(v) < 1),
      );
      return {
        prompt: `${story.opening(worth(story.unit, P))} ${dir === "half" ? "has a half-life of" : "doubles every"} ${h} ${story.period}s. ${story.ask} after ${t} ${story.period}s? Round to 2 dp.`,
        answer: reading(story.unit, values[0]),
        wrong: [reading(story.unit, values[1]), reading(story.unit, values[2])],
      };
    },
  },
  {
    skill: "Exponential and logarithmic form",
    make(r) {
      const form = r.pick("form", ["C", "K", "V"]);
      if (form !== "V") {
        const statement = (text: string, ...parts: number[]) =>
          choice(text, `${form}:${parts.join(",")}`);
        const { prompt, three } = r.exclude(
          () => {
            const b = r.int("b", 2, 30);
            const p = r.int("p", 2, 13);
            if (b === p || b ** p > 99999) return { prompt: "", three: [] };
            const N = b ** p;
            return form === "C"
              ? {
                  prompt: `Write ${b}${sup(p)} = ${N} in logarithmic form.`,
                  three: [
                    statement(`${logb(b)} ${N} = ${p}`, b, N, p),
                    statement(`${logb(N)} ${b} = ${p}`, N, b, p),
                    statement(`${logb(N)} ${p} = ${b}`, N, p, b),
                  ],
                }
              : {
                  prompt: `Write ${logb(b)} ${N} = ${p} in exponential form.`,
                  three: [
                    statement(`${b}${sup(p)} = ${N}`, b, p, N),
                    statement(`${N}${sup(p)} = ${b}`, N, p, b),
                    statement(`${N}${sup(b)} = ${p}`, N, b, p),
                  ],
                };
          },
          ({ three }) =>
            !three.length || new Set(three.map((c) => c.key)).size < 3,
        );
        return { prompt, answer: three[0], wrong: [three[1], three[2]] };
      }
      const base = r.weighted("base", [
        ["e", 1],
        ["b", 4],
      ]);
      const recip = r.pick("arg", ["whole", "recip"]) === "recip";
      const sign = recip ? -1 : 1;
      if (base === "e") {
        const pair = r.weighted("v", [
          ["UD", 1],
          ["UO", 1],
          ["DO", 2],
        ]);
        const values = (p: number) => [
          sign * p,
          ...offered(pair, { U: sign * p + 1, D: sign * p - 1, O: 1 }),
        ];
        const p = r.resample(
          () => r.int("p", 2, 8),
          (p) => new Set(values(p)).size === 3 && !loneSign(values(p)),
        );
        const [answer, d1, d2] = values(p);
        return {
          prompt: `What is ln(${recip ? "1/" : ""}e${sup(p)})?`,
          answer: whole(answer),
          wrong: [whole(d1), whole(d2)],
        };
      }
      const pair = r.weighted("v", [
        ["UD", 1],
        ["UB", 3],
        ["DB", 1],
      ]);
      const { b, p, values } = r.exclude(
        () => {
          const b = r.int("b", 2, 30);
          const p = r.int("p", 2, 13);
          return {
            b,
            p,
            values: [
              sign * p,
              ...offered(pair, { U: sign * p + 1, D: sign * p - 1, B: b }),
            ],
          };
        },
        ({ b, p, values }) =>
          b === p ||
          Math.abs(b - p) < 2 ||
          b ** p > 99999 ||
          new Set(values).size < 3 ||
          loneSign(values),
      );
      const N = b ** p;
      return {
        prompt: recip
          ? `What is ${logb(b)}(1/${N})?`
          : `What is ${logb(b)} ${N}?`,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "Logarithm properties",
    make(r) {
      const form = r.pick("form", ["N", "X", "G"]);
      if (form === "N") {
        const z = r.pick("z", ["lo", "hi"]);
        const b = r.pick("b", [2, 3, 5, 10]);
        const { A, B, C } = r.exclude(
          () => ({
            A: r.int("A", 2, 24),
            B: r.int("B", 2, 24),
            C: r.int("C", 2, 24),
          }),
          ({ A, B, C }) => {
            if ((A * B) % C) return true;
            const args = [(A * B) / C, A + B - C, A * B - C];
            return (
              args.some((x) => x < 2 || x > 999) ||
              new Set(args).size < 3 ||
              args[1] > args[0] !== (z === "hi")
            );
          },
        );
        const single = (x: number) => choice(`${logb(b)} ${x}`, `log:${x}`);
        return {
          prompt: `Write ${logb(b)} ${A} + ${logb(b)} ${B} − ${logb(b)} ${C} as a single logarithm.`,
          answer: single((A * B) / C),
          wrong: [single(A + B - C), single(A * B - C)],
        };
      }
      if (form === "X") {
        const e = r.pick("e", ["expand", "condense"]);
        const w = r.pick("w", ["pow", "div"]);
        const b = r.pick("b", [2, 3, 5, 10]);
        const m = r.int("m", 2, 5);
        const k = r.int("r", 1, 4);
        const L = logb(b);
        const lg = (v: number) => Math.log(v) / Math.log(b);
        const lx = `${L} x`;
        const ly = k === 1 ? `${L} y` : `${k} ${L} y`;
        const xm = `x${sup(m)}`;
        const yk = k === 1 ? "y" : `y${sup(k)}`;
        if (e === "expand")
          return withPositiveDomain(["x", "y"], {
            prompt: `Write ${L}(${xm}/${yk}) as a sum or difference of logarithms.`,
            answer: twoVar(
              `${m} ${lx} − ${ly}`,
              (x, y) => m * lg(x) - k * lg(y),
            ),
            wrong: [
              twoVar(`${m} ${lx} + ${ly}`, (x, y) => m * lg(x) + k * lg(y)),
              w === "pow"
                ? twoVar(
                    `(${lx})${sup(m)} − ${ly}`,
                    (x, y) => lg(x) ** m - k * lg(y),
                  )
                : twoVar(
                    `(${m} ${lx})/(${ly})`,
                    (x, y) => (m * lg(x)) / (k * lg(y)),
                  ),
            ],
          });
        return withPositiveDomain(["x", "y"], {
          prompt: `Write ${m} ${lx} − ${ly} as a single logarithm.`,
          answer: twoVar(`${L}(${xm}/${yk})`, (x, y) => lg(x ** m / y ** k)),
          wrong: [
            twoVar(`${L}(${xm}${yk})`, (x, y) => lg(x ** m * y ** k)),
            w === "pow"
              ? twoVar(
                  `${L}(${terms([
                    [m, "x"],
                    [-k, "y"],
                  ])})`,
                  (x, y) => lg(m * x - k * y),
                )
              : twoVar(
                  `${L}(${xm})/${L}(${yk})`,
                  (x, y) => lg(x ** m) / lg(y ** k),
                ),
          ],
        });
      }
      const op = r.pick("op", ["prod", "quot", "pow"]);
      const pair = r.weighted(
        "v",
        op === "prod"
          ? [
              ["MQ", 1],
              ["QS", 1],
            ]
          : op === "quot"
            ? [
                ["QA", 2],
                ["QR", 1],
                ["AR", 1],
              ]
            : [
                ["PS", 1],
                ["PV", 2],
                ["SV", 1],
              ],
      );
      const z = op === "prod" ? r.pick("z", ["lo", "hi"]) : "";
      const { prompt, values } = r.exclude(
        () => {
          const A = r.pick("A", LOGGED);
          const u = approx(A);
          if (op === "pow") {
            const m = r.int("m", 2, 4);
            return {
              prompt: `Take ${logb(10)} ${A} ≈ ${u.text}. Estimate ${logb(10)}(${A}${sup(m)}) to 2 dp.`,
              legal: true,
              values: [
                u.value.mul(m),
                ...offered(pair, {
                  P: u.value.pow(m),
                  S: u.value.add(m),
                  V: u.value.div(m),
                }),
              ],
            };
          }
          const B = r.pick(
            "B",
            LOGGED.filter((n) => n !== A),
          );
          const w = approx(B);
          const given = `Take ${logb(10)} ${A} ≈ ${u.text} and ${logb(10)} ${B} ≈ ${w.text}.`;
          const quotient = u.value.div(w.value);
          if (op === "prod")
            return {
              prompt: `${given} Estimate ${logb(10)}(${A} × ${B}) to 2 dp.`,
              legal: quotient.cmp(u.value.add(w.value)) > 0 === (z === "hi"),
              values: [
                u.value.add(w.value),
                ...offered(pair, {
                  M: u.value.mul(w.value),
                  Q: quotient,
                  S: u.value.sub(w.value),
                }),
              ],
            };
          return {
            prompt: `${given} Estimate ${logb(10)}(${A}/${B}) to 2 dp.`,
            legal: A > B,
            values: [
              u.value.sub(w.value),
              ...offered(pair, {
                Q: quotient,
                A: u.value.add(w.value),
                R: w.value.sub(u.value),
              }),
            ],
          };
        },
        ({ legal, values }) =>
          !legal ||
          values.some(onTie) ||
          !distinctValues(values.map(cents)) ||
          crowded(values, q(3, 100)) ||
          loneSign(values),
      );
      return {
        prompt,
        answer: num(cents(values[0]), twoDp(values[0])),
        wrong: [
          num(cents(values[1]), twoDp(values[1])),
          num(cents(values[2]), twoDp(values[2])),
        ],
      };
    },
  },
  {
    skill: "Solving exponential equations",
    make(r) {
      const form = r.pick("form", ["S", "L", "D"]);
      if (form === "S") {
        const pair = r.weighted("pair", [
          ["SC", 2],
          ["SO", 1],
          ["CO", 3],
        ]);
        const { prompt, values } = r.exclude(
          () => {
            const b = r.pick("b", [2, 3, 5, 7]);
            const m = r.int("m", 2, 5);
            const K = r.int("K", 1, 8);
            const Nn = r.pick("Nn", nonzero(6));
            const answer = K - Nn;
            const slips: Record<string, number> = {
              S: K + Nn,
              C: m * (K - Nn),
              O: K - m * Nn,
            };
            return {
              prompt:
                b ** (m * K) > 16384
                  ? ""
                  : `Solve ${b}^(${linear(m, m * Nn)}) = ${b ** (m * K)}.`,
              all: [answer, slips.S, slips.C, slips.O],
              values: [answer, ...offered(pair, slips)],
            };
          },
          ({ prompt, all, values }) =>
            !prompt || new Set(all).size < 4 || loneSign(values),
        );
        return {
          prompt,
          answer: xIs(values[0]),
          wrong: [xIs(values[1]), xIs(values[2])],
        };
      }
      const decimal = (v: Amount, unit = "") =>
        num(cents(v), unit ? `${twoDp(v)} ${unit}` : `x = ${twoDp(v)}`);
      const bad = (values: readonly Amount[]) =>
        values.some(onTie) ||
        !distinctValues(values.map(cents)) ||
        crowded(values, q(5, 100));
      if (form === "L") {
        const pair = r.weighted("pair", [
          ["QI", 5],
          ["QD", 2],
          ["ID", 2],
        ]);
        const { b, N, values } = r.exclude(
          () => {
            const b = r.int("b", 2, 9);
            const N = r.int("N", 5, 500);
            const slips: Record<string, Amount> = {
              Q: Math.log10(N) - Math.log10(b),
              I: Math.log10(b) / Math.log10(N),
              D: q(N, b),
            };
            return {
              b,
              N,
              values: [Math.log(N) / Math.log(b), ...offered(pair, slips)],
            };
          },
          ({ b, N, values }) => {
            for (let p = b; p <= N; p *= b) if (p === N) return true;
            return bad(values);
          },
        );
        return {
          prompt: `Solve ${b}^x = ${N}. Round to 2 dp.`,
          answer: decimal(values[0]),
          wrong: [decimal(values[1]), decimal(values[2])],
        };
      }
      const pair = r.weighted("pair", [
        ["PQ", 1],
        ["PT", 2],
        ["QT", 1],
      ]);
      const rise = told(
        RISES,
        r.pick(
          "context",
          RISES.map((s) => s.name),
        ),
      );
      const { g, rate, values } = r.exclude(
        () => {
          const g = r.pick("g", [2, 3]);
          const rate = r.int("r", 2, 25);
          const slips: Record<string, Amount> = {
            P: q(100 * (g - 1), rate),
            Q: Math.log10(g) - Math.log10(1 + rate / 100),
            T: q(100 * g, rate),
          };
          return {
            g,
            rate,
            values: [
              Math.log(g) / Math.log(1 + rate / 100),
              ...offered(pair, slips),
            ],
          };
        },
        ({ values }) => bad(values),
      );
      const unit = `${rise.period}s`;
      return {
        prompt: `${rise.opening} grows ${rate}% ${rise.per}. To 2 dp, how many ${unit} until it ${g === 2 ? "doubles" : "triples"}?`,
        answer: decimal(values[0], unit),
        wrong: [decimal(values[1], unit), decimal(values[2], unit)],
      };
    },
  },
  {
    skill: "Solving logarithmic equations",
    make(r) {
      if (r.pick("form", ["P", "D"]) === "P") {
        const pair = r.weighted("pair", [
          ["RS", 1],
          ["RF", 2],
          ["SF", 1],
        ]);
        const { prompt, values } = r.exclude(
          () => {
            const b = r.pick("b", [2, 3, 5, 10]);
            const k = r.int("k", 2, TOP[b]);
            const M = b ** k;
            const lows = range(2, M).filter((v) => M % v === 0 && M / v > v);
            if (M > 1024 || !lows.length) return { prompt: "", values: [] };
            const v = r.pick("v", lows);
            const u = M / v;
            const X = r.int("X", v + 1, u);
            const a = u - X;
            const c = X - v;
            if (a > 60 || c > 60) return { prompt: "", values: [] };
            const slips: Record<string, number> = {
              R: c - a - X,
              S: M - a,
              F: X - c,
            };
            return {
              prompt: `Solve ${logb(b)} ${a ? `(${shift(-a)})` : "x"} + ${logb(b)} (${shift(c)}) = ${k}.`,
              values: [X, ...offered(pair, slips)],
            };
          },
          ({ prompt, values }) =>
            !prompt ||
            new Set(values).size < 3 ||
            values.some((v) => Math.abs(v) > 4000) ||
            loneSign(values),
        );
        return {
          prompt,
          answer: xIs(values[0]),
          wrong: [xIs(values[1]), xIs(values[2])],
        };
      }
      const pair = r.weighted("pair", [
        ["NV", 3],
        ["NK", 2],
        ["VK", 2],
      ]);
      const { prompt, values } = r.exclude(
        () => {
          const b = r.pick("b", [2, 3, 5, 10]);
          const k = r.int("k", 2, TOP[b]);
          const M = b ** k;
          const j = r.int("j", 1, 20);
          const d = (M - 1) * j;
          const slips: Record<string, Rat> = {
            N: q(j),
            V: q(-j),
            K: q(k * d, k - 1),
          };
          return {
            prompt:
              M > 1000 || d > 2000 || M * j > 2000
                ? ""
                : `Solve ${logb(b)} x − ${logb(b)} (${shift(d)}) = ${k}.`,
            values: [q(M * j), ...offered(pair, slips)],
          };
        },
        ({ prompt, values }) =>
          !prompt ||
          values.some((v) => !v.isInt() || v.abs().cmp(4000) > 0) ||
          !distinctValues(values) ||
          loneSign(values),
      );
      return {
        prompt,
        answer: xIs(values[0].n),
        wrong: [xIs(values[1].n), xIs(values[2].n)],
      };
    },
  },
];

import {
  type Level,
  NAMES,
  int,
  label,
  loneSign,
  money,
  nonzero,
  num,
  range,
  sup,
  whole,
} from "./kit.ts";

export const name = "Negative Numbers and Order of Operations";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WEEK = DAYS.flatMap((first, i) =>
  DAYS.slice(i + 1).flatMap((second, j) =>
    DAYS.slice(i + j + 2).map((third) => [first, second, third]),
  ),
);
const CHANGES = [...range(-30, -2), ...range(2, 30)];
const PLACEMENTS = ["L", "M", "R"] as const;

type Story = {
  opening: (who: string) => string;
  rise: string;
  fall: string;
  step: (m: number) => string;
  asked: string;
  shown: (v: number) => string;
  ceiling: number;
};
const STORIES: Record<string, Story> = {
  temp: {
    opening: () => "The temperature is",
    rise: "rises",
    fall: "drops",
    step: (m) => `${m}°`,
    asked: "temperature",
    shown: (v) => `${int(v)} °C`,
    ceiling: 50,
  },
  sub: {
    opening: () => "A submarine is at",
    rise: "rises",
    fall: "dives",
    step: (m) => `${m} m`,
    asked: "depth",
    shown: (v) => `${int(v)} m`,
    ceiling: 0,
  },
  bank: {
    opening: (who) => `${who}'s balance is`,
    rise: "pays in",
    fall: "spends",
    step: (m) => `$${m}`,
    asked: "balance",
    shown: (v) => money(v, 0),
    ceiling: 50,
  },
};

const bracket = (n: number) => (n < 0 ? `(${int(n)})` : int(n));
const squared = (base: string) => `${base}${sup(2)}`;
const total = (list: readonly number[], start = 0) =>
  list.reduce((sum, m) => sum + m, start);
const clean = (values: readonly number[], cap: number) =>
  values.every((v) => v !== 0 && Math.abs(v) <= cap) &&
  new Set(values).size === values.length &&
  !loneSign(values);

export const levels: Level[] = [
  {
    skill: "Order integers",
    make(r) {
      const form = r.pick("form", ["T", "B"]);
      const dir = r.pick("dir", ["low", "high"]);
      const { p, q } = r.exclude(
        () => {
          const p = r.int("p", 3, 20);
          return { p, q: r.int("q", 2, p - 1) };
        },
        ({ p, q }) => dir === "high" && q > p - 2,
      );
      const top =
        dir === "low" ? r.int("r", 1, q - 1) : r.int("r", q + 1, p - 1);
      let labels: string[];
      if (form === "T") labels = r.pick("days", WEEK);
      else {
        const first = r.pick("N1", NAMES);
        const second = r.pick(
          "N2",
          NAMES.filter((n) => n !== first),
        );
        const third = r.pick(
          "N3",
          NAMES.filter((n) => n !== first && n !== second),
        );
        labels = [first, second, third];
      }
      const values = r.shuffle("deal", [-p, -q, top]);
      const at = (v: number) => label(labels[values.indexOf(v)]);
      const low = dir === "low";
      const said = values.map((v, i) =>
        form === "T"
          ? `${i ? "on" : "On"} ${labels[i]} it was ${int(v)} °C`
          : `${labels[i]}'s ${i ? "" : "balance "}is ${money(v, 0)}`,
      );
      const ask =
        form === "T"
          ? `Which day was ${low ? "coldest" : "warmest"}?`
          : `Whose balance is ${low ? "lowest" : "highest"}?`;
      return {
        prompt: `${said.join(", ")}. ${ask}`,
        answer: at(low ? -p : top),
        wrong: [at(low ? top : -p), at(-q)],
      };
    },
  },
  {
    skill: "Add integers",
    make(r) {
      const sp = r.pick("sp", ["np", "pn", "nn"]);
      const { A, B } = r.exclude(
        () => ({ A: r.int("A", 1, 20), B: r.int("B", 1, 20) }),
        ({ A, B }) => A === B,
      );
      const a = sp === "pn" ? A : -A;
      const b = sp === "np" ? B : -B;
      const sum = a + b;
      return {
        prompt: `What is ${int(a)} + ${bracket(b)}?`,
        answer: whole(sum),
        wrong: [
          whole(-sum),
          whole(sp === "nn" ? -Math.abs(A - B) : Math.sign(sum) * (A + B)),
        ],
      };
    },
  },
  {
    skill: "Subtract integers",
    make(r) {
      const sp = r.pick("sp", ["pn", "np", "nn"]);
      const { A, B } = r.exclude(
        () => ({ A: r.int("A", 1, 20), B: r.int("B", 1, 20) }),
        ({ A, B }) => A === B || (sp !== "nn" && A < B),
      );
      const a = sp === "pn" ? A : -A;
      const b = sp === "np" ? B : -B;
      return {
        prompt: `What is ${int(a)} − ${bracket(b)}?`,
        answer: whole(a - b),
        wrong: [whole(a + b), whole(A > B ? b - a : A + B)],
      };
    },
  },
  {
    skill: "Multiply and divide integers",
    make(r) {
      const op = r.pick("op", ["×", "÷"]);
      const sp = r.pick("sp", ["np", "pn", "nn"]);
      const s = r.sign("s");
      const m = r.int("m", 2, 12);
      const n = r.int("n", 2, 12);
      const first = sp === "pn" ? 1 : -1;
      const second = sp === "np" ? 1 : -1;
      const sign = first * second;
      const [a, size] = op === "×" ? [first * m, m * n] : [first * m * n, m];
      return {
        prompt: `What is ${int(a)} ${op} ${bracket(second * n)}?`,
        answer: whole(sign * size),
        wrong: [
          whole(-sign * size),
          whole(sign * (m + s) * (op === "×" ? n : 1)),
        ],
      };
    },
  },
  {
    skill: "Order of operations, no grouping",
    make(r) {
      const form = r.pick("form", ["F1", "F2", "F3", "F4"]);
      const { prompt, values } = r.exclude(
        () => {
          if (form === "F1") {
            const a = r.int("a", 1, 12);
            const b = r.int("b", 2, 12);
            const c = r.int("c", 2, 12);
            return {
              prompt: `What is ${a} + ${b} × ${c}?`,
              values: [a + b * c, (a + b) * c, a * b + c],
            };
          }
          if (form === "F3") {
            const a = r.int("a", 2, 12);
            const b = r.int("b", 2, 12);
            const c = r.int("c", 2, 12);
            const d = r.int("d", 2, 12);
            return {
              prompt: `What is ${a} × ${b} − ${c} × ${d}?`,
              values: [a * b - c * d, (a * b - c) * d, a * (b - c) * d],
            };
          }
          const c = r.int("c", 2, 9);
          const a = r.pick(
            "a",
            range(1, Math.floor(36 / c)).map((j) => j * c),
          );
          const k = r.int("k", 1, Math.min(12, Math.floor(60 / c)));
          const b = c * k;
          const j = a / c;
          return form === "F2"
            ? {
                prompt: `What is ${a} − ${b} ÷ ${c}?`,
                values: [a - k, j - k, k - a],
              }
            : {
                prompt: `What is ${a} + ${b} ÷ ${c}?`,
                values: [a + k, j + k, j + b],
              };
        },
        ({ values }) => !clean(values, 200),
      );
      return {
        prompt,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "Grouping and exponents",
    make(r) {
      const v = r.pick("v", ["A", "B", "C"]);
      const { a, b, c, d, values } = r.exclude(
        () => {
          const a = r.int("a", 1, 12);
          const b = r.int("b", 1, 12);
          const c = r.int("c", 2, 9);
          const d = r.int("d", 3, 9);
          const grouped = (a + b) * c;
          return {
            a,
            b,
            c,
            d,
            values: [
              grouped - d * d,
              v === "B" ? grouped : a + b * c - d * d,
              v === "C" ? a * c + b - d * d : grouped - 2 * d,
            ],
          };
        },
        ({ a, b, values }) => a === b || !clean(values, 200),
      );
      return {
        prompt: `What is (${a} + ${b}) × ${c} − ${squared(int(d))}?`,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "Absolute value and number-line distance",
    make(r) {
      const form = r.pick("form", ["D", "S"]);
      const a = r.int("a", -20, -1);
      if (form === "D") {
        const b = r.resample(
          () => r.int("b", a + 1, 20),
          (b) => b !== 0 && b !== -a,
        );
        const d2 =
          b < 0
            ? -a - b
            : r.int("w", 1, 2) === 1
              ? Math.abs(-a - b)
              : b - a + 1;
        return {
          prompt: `How far apart are ${int(a)} and ${int(b)} on the number line?`,
          answer: whole(b - a),
          wrong: [whole(a - b), whole(d2)],
        };
      }
      const b = r.resample(
        () => r.int("b", 1, 20),
        (b) => b !== -a,
      );
      return {
        prompt: `What is |${int(a)}| − |${int(b)}|?`,
        answer: whole(-a - b),
        wrong: [whole(a - b), whole(Math.abs(a - b))],
      };
    },
  },
  {
    skill: "Integer word problems",
    make(r) {
      const ctx = r.pick("ctx", ["temp", "sub", "bank"]);
      const k = r.pick("k", [2, 3]);
      const v = r.pick("v", ["A", "B"]);
      const story = STORIES[ctx];
      const { s, changes, values } = r.exclude(
        () => {
          const s = r.int("s", -50, -1);
          const changes = range(1, k).map((i) => r.pick(`m${i}`, CHANGES));
          const runs = changes.map((_, i) =>
            total(changes.slice(0, i + 1), s),
          );
          const answer = runs[k - 1];
          const size = total(changes.map(Math.abs));
          const d1 = v === "A" ? s + size : s - size;
          const last = changes[k - 1];
          const reversed = answer - 2 * last;
          const d2 = reversed === d1 ? answer - last : reversed;
          return { s, changes, runs, values: [answer, d1, d2] };
        },
        ({ s, changes, runs, values }) =>
          !changes.some((m) => m > 0) ||
          !changes.some((m) => m < 0) ||
          values[0] === s ||
          runs.some((x) => x < -50 || x > story.ceiling) ||
          !clean(values, 50),
      );
      const who = ctx === "bank" ? r.pick("N", NAMES) : "It";
      const move = (m: number) =>
        `${m > 0 ? story.rise : story.fall} ${story.step(Math.abs(m))}`;
      const steps = changes.map(move).join(", then ");
      const shown = (x: number) => num(x, story.shown(x));
      return {
        prompt: `${story.opening(who)} ${story.shown(s)}. ${who} ${steps}. What is the ${story.asked} now?`,
        answer: shown(values[0]),
        wrong: [shown(values[1]), shown(values[2])],
      };
    },
  },
  {
    skill: "Choose the grouping",
    make(r) {
      const star = r.pick("star", PLACEMENTS);
      const { a, b, c, d, o1, o3, values } = r.exclude(
        () => {
          const o1 = r.pick("o1", ["+", "−"]);
          const o3 = r.pick("o3", ["+", "−"]);
          const a = r.int("a", 2, 20);
          const b = r.int("b", 2, 12);
          const c = r.int("c", 2, 12);
          const d = r.int("d", 2, 12);
          const s1 = o1 === "+" ? 1 : -1;
          const s3 = o3 === "+" ? 1 : -1;
          return {
            a,
            b,
            c,
            d,
            o1,
            o3,
            values: {
              L: (a + s1 * b) * c + s3 * d,
              M: a + s1 * b * c + s3 * d,
              R: a + s1 * b * (c + s3 * d),
            },
          };
        },
        ({ values: { L, M, R } }) =>
          new Set([L, M, R]).size < 3 ||
          [L, M, R].some((x) => Math.abs(x) > 200),
      );
      const placed = {
        L: num(values.L, `(${a} ${o1} ${b}) × ${c} ${o3} ${d}`),
        M: num(values.M, `${a} ${o1} (${b} × ${c}) ${o3} ${d}`),
        R: num(values.R, `${a} ${o1} ${b} × (${c} ${o3} ${d})`),
      };
      return {
        prompt: `Which brackets make ${a} ${o1} ${b} × ${c} ${o3} ${d} equal ${int(values[star])}?`,
        answer: placed[star],
        wrong: [
          star === "L" ? placed.R : placed.L,
          star === "M" ? placed.R : placed.M,
        ],
      };
    },
  },
  {
    skill: "Negatives with exponents and nesting",
    make(r) {
      const form = r.pick("form", ["E", "N"]);
      if (form === "E") {
        const shape = r.pick("shape", ["E1", "E2"]);
        const { a, b } = r.exclude(
          () => ({ a: r.int("a", 2, 15), b: r.int("b", 2, 15) }),
          ({ a, b }) =>
            a === b ||
            (shape === "E1" ? a === b + 2 : a > b || b === a + 2),
        );
        const doubled = whole(-2 * a - 2 * b);
        return shape === "E1"
          ? {
              prompt: `What is ${squared(int(-a))} + ${squared(`(${int(-b)})`)}?`,
              answer: whole(b * b - a * a),
              wrong: [whole(a * a + b * b), doubled],
            }
          : {
              prompt: `What is ${squared(`(${int(-a)})`)} − ${squared(int(b))}?`,
              answer: whole(a * a - b * b),
              wrong: [whole(-a * a - b * b), doubled],
            };
      }
      const { a, b, c, d, e, values } = r.exclude(
        () => {
          const a = r.pick("a", nonzero(9));
          const b = r.int("b", 1, 9);
          const c = r.int("c", 1, 9);
          const d = r.int("d", 1, 9);
          const e = r.int("e", 2, 5);
          const inner = b - c + d;
          return {
            a,
            b,
            c,
            d,
            e,
            inner,
            values: [a + e * inner, a + e * (b - c - d), a - e * inner],
          };
        },
        ({ b, c, inner, values }) =>
          b === c || inner === 0 || !clean(values, 200),
      );
      return {
        prompt: `What is ${int(a)} − [${b} − (${c} − ${d})] × (${int(-e)})?`,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
];

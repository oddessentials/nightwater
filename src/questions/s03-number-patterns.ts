import { type Level, expr, int, label, ordinal, terms, whole } from "./kit.ts";

export const name = "Number Patterns and Missing Numbers";

const seq = (list: readonly number[]) => list.map((t) => int(t)).join(", ");
const add = (step: number) => label(`Add ${int(step)} each time`);
const rule = (m: number, b: number) =>
  expr(
    terms([
      [m, "n"],
      [b, ""],
    ]),
    (n) => m * n + b,
  );

export const levels: Level[] = [
  {
    skill: "Skip counting forward",
    make(r) {
      const d = r.pick("d", [2, 5, 10]);
      const a = d * r.int("k", 1, Math.floor(100 / d));
      const s = r.sign("s");
      return {
        prompt: `What comes next? ${seq([a, a + d, a + 2 * d, a + 3 * d])}, ?`,
        answer: whole(a + 4 * d),
        wrong: [whole(a + (4 + s) * d), whole(a + 3 * d + 1)],
      };
    },
  },
  {
    skill: "Arithmetic sequence, any step, either direction",
    make(r) {
      const m = r.int("m", 2, 9);
      const dir = r.sign("dir");
      const d = dir * m;
      const t1 =
        dir === 1 ? r.int("t1", 0, 199 - 5 * m) : r.int("t1", 5 * m + 1, 200);
      const s = r.sign("s");
      const t = (i: number) => t1 + (i - 1) * d;
      return {
        prompt: `What comes next? ${seq([t(1), t(2), t(3), t(4)])}, ?`,
        answer: whole(t(5)),
        wrong: [whole(t(5) + s), whole(t(4) + 2 * d)],
      };
    },
  },
  {
    skill: "Missing middle term",
    make(r) {
      const a = r.int("a", 1, 100);
      const d = r.int("d", 2, 12);
      const s = r.sign("s");
      return {
        prompt: `Find the missing number: ${int(a)}, ?, ${seq([a + 2 * d, a + 3 * d])}`,
        answer: whole(a + d),
        wrong: [whole(a + d + s), whole(a + 4 * d)],
      };
    },
  },
  {
    skill: "Doubling / halving",
    make(r) {
      if (r.pick("F", ["D", "H"]) === "D") {
        const a = r.int("a", 1, 9);
        const s = r.sign("s");
        return {
          prompt: `What comes next? ${seq([a, 2 * a, 4 * a, 8 * a])}, ?`,
          answer: whole(16 * a),
          wrong: [whole(s === 1 ? 32 * a : 12 * a), whole(9 * a)],
        };
      }
      const a = r.int("a", 2, 9);
      return {
        prompt: `What comes next? ${seq([32 * a, 16 * a, 8 * a, 4 * a])}, ?`,
        answer: whole(2 * a),
        wrong: [whole(a), whole(4 * a - 2)],
      };
    },
  },
  {
    skill: "Identify the rule",
    make(r) {
      const a = r.int("a", 1, 20);
      const d = r.int("d", 2, 9);
      const s = r.sign("s");
      const t2 = a + d;
      const k = t2 % a === 0 && t2 / a >= 2 && t2 / a <= 5 ? t2 / a : 2;
      return {
        prompt: `Which rule makes ${seq([a, t2, a + 2 * d, a + 3 * d])}?`,
        answer: add(d),
        wrong: [add(d + s), label(`Multiply by ${int(k)} each time`)],
      };
    },
  },
  {
    skill: "Input–output table",
    make(r) {
      const m = r.int("m", 1, 5);
      const b = r.resample(
        () => r.int("b", 1, 9),
        (b) => b !== m,
      );
      const c = r.int("c", 1, 3);
      const q = r.int("q", c + 4, 12);
      const out = (i: number) => m * i + b;
      const row = (i: number) => `${int(i)}→${int(out(i))}`;
      const d1 = b * q + m;
      return {
        prompt: `in → out: ${[c, c + 1, c + 2].map(row).join(", ")}, ${int(q)}→?`,
        answer: whole(out(q)),
        wrong: [whole(d1), whole(m * q === d1 ? m * q - b : m * q)],
      };
    },
  },
  {
    skill: "Growing steps",
    make(r) {
      const a = r.int("a", 1, 20);
      const p = r.int("p", 1, 4);
      const g = r.pick("g", [1, 2]);
      const s = r.sign("s");
      const t2 = a + p;
      const t3 = t2 + p + g;
      const t4 = t3 + p + 2 * g;
      return {
        prompt: `What comes next? ${seq([a, t2, t3, t4])}, ?`,
        answer: whole(t4 + p + 3 * g),
        wrong: [whole(t4 + p + 3 * g + s * g), whole(t4 + p)],
      };
    },
  },
  {
    skill: "Alternating two-rule pattern",
    make(r) {
      const t1 = r.int("t1", 1, 30);
      const a = r.int("a", 2, 5);
      const b = r.pick("b", [2, 3]);
      const s = r.sign("s");
      const t2 = t1 + a;
      const t3 = b * t2;
      const t4 = t3 + a;
      const t5 = b * t4;
      return {
        prompt: `What comes next? ${seq([t1, t2, t3, t4, t5])}, ?`,
        answer: whole(t5 + a),
        wrong: [whole(s === 1 ? b * t5 : t4 + a), whole(2 * t5 - t4)],
      };
    },
  },
  {
    skill: "nth term of an arithmetic sequence",
    make(r) {
      const a = r.int("a", 1, 20);
      const d = r.resample(
        () => r.int("d", 2, 9),
        (d) => d !== a,
      );
      const n = r.int("n", 10, 50);
      return {
        prompt: `The pattern starts ${seq([a, a + d, a + 2 * d])}, … What is the ${ordinal(n)} term?`,
        answer: whole(a + (n - 1) * d),
        wrong: [whole(a + n * d), whole(n * d)],
      };
    },
  },
  {
    skill: "Position-to-term rule as an expression",
    make(r) {
      const m = r.int("m", 2, 6);
      const b = r.resample(
        () => r.int("b", -5, 9),
        (b) => b !== 0 && b !== m && m + b >= 1,
      );
      return {
        prompt: `The pattern is ${seq([1, 2, 3, 4].map((i) => m * i + b))}, … Which rule gives term n?`,
        answer: rule(m, b),
        wrong: [rule(Math.abs(b), m), rule(m, m + b)],
      };
    },
  },
];

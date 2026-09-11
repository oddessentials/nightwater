import { type Level, NAMES, label, whole } from "./kit.ts";

export const name = "Addition and Subtraction";

const ITEMS = ["stickers", "marbles", "cards", "beads", "stamps", "shells"];
const GAIN = ["buys", "finds", "gets", "collects"];
const LOSE = ["gives away", "loses", "uses", "sells"];
const ones = (n: number) => n % 10;
const tens = (n: number) => Math.floor(n / 10) % 10;
const swap = (n: number) => n - 9 * tens(n) + 9 * ones(n);

export const levels: Level[] = [
  {
    skill: "Single-digit addition facts",
    make(r) {
      const a = r.int("a", 1, 9);
      const b = r.int("b", 1, 9);
      let s = r.sign("s");
      const n = a + b;
      let d2 = a === b ? n + 2 * s : Math.abs(a - b);
      if (d2 < 1) {
        s = 1;
        d2 = n + 2 * s;
      }
      return {
        prompt: `${a} + ${b} = ?`,
        answer: whole(n),
        wrong: [whole(n + s), whole(d2)],
      };
    },
  },
  {
    skill: "Subtraction facts within 20",
    make(r) {
      const a = r.int("a", 5, 20);
      const b = r.int("b", 1, Math.min(9, a - 1));
      const n = a - b;
      const s = n === 1 ? 1 : r.sign("s");
      return {
        prompt: `${a} − ${b} = ?`,
        answer: whole(n),
        wrong: [whole(a + b), whole(n + s)],
      };
    },
  },
  {
    skill: "Two-digit addition with regrouping",
    make(r) {
      const ta = r.int("ta", 1, 9);
      const oa = r.int("oa", 1, 9);
      const tb = r.int("tb", 1, 9);
      const ob = r.int("ob", 10 - oa, 9);
      const a = 10 * ta + oa;
      const b = 10 * tb + ob;
      const n = a + b;
      const d2 = tb !== ob ? a + swap(b) : ta !== oa ? swap(a) + b : n - 1;
      return {
        prompt: `${a} + ${b} = ?`,
        answer: whole(n),
        wrong: [whole(n - 10), whole(d2)],
      };
    },
  },
  {
    skill: "Two-digit subtraction with borrowing",
    make(r) {
      const ta = r.int("ta", 2, 9);
      const oa = r.int("oa", 0, 8);
      const ob = r.int("ob", oa + 1, 9);
      const tb = r.int("tb", 1, ta - 1);
      const a = 10 * ta + oa;
      const b = 10 * tb + ob;
      const n = a - b;
      let s = n < 11 ? 1 : r.sign("s");
      const d1 = 10 * (ta - tb) + (ob - oa);
      let d2 = n + 10 * s;
      if (d2 === d1) {
        s = -s;
        d2 = n + 10 * s < 1 ? n + 1 : n + 10 * s;
      }
      return {
        prompt: `${a} − ${b} = ?`,
        answer: whole(n),
        wrong: [whole(d1), whole(d2)],
      };
    },
  },
  {
    skill: "Missing addend / subtrahend",
    make(r) {
      const form = r.pick("F", [1, 2, 3]);
      let prompt: string;
      let x: number;
      let d1: number;
      if (form === 1) {
        const a = r.int("a", 10, 89);
        x = r.int("x", 10, 100 - a);
        const c = a + x;
        prompt = `${a} + ? = ${c}`;
        d1 = a + c;
      } else if (form === 2) {
        const a = r.int("a", 20, 100);
        x = r.int("x", 10, a - 10);
        const c = a - x;
        prompt = `${a} − ? = ${c}`;
        d1 = a + c;
      } else {
        const b = r.int("b", 10, 89);
        const c = r.resample(
          () => r.int("c", 10, 100 - b),
          (c) => c !== b,
        );
        x = b + c;
        prompt = `? − ${b} = ${c}`;
        d1 = Math.abs(c - b);
      }
      let s = x === 10 ? 1 : r.sign("s");
      if (x + 10 * s === d1) s = -s;
      return {
        prompt,
        answer: whole(x),
        wrong: [whole(d1), whole(x + 10 * s)],
      };
    },
  },
  {
    skill: "Compare two expressions",
    make(r) {
      const outcome = r.pick("O", ["left", "right", "equal"]);
      const L = r.int("L", 20, 80);
      const a = r.int("a", 10, L - 10);
      const b = L - a;
      const R =
        outcome === "equal"
          ? L
          : outcome === "left"
            ? L - r.int("delta", 1, 10)
            : L + r.int("delta", 1, 10);
      const d = r.int("d", 10, 100 - R);
      const c = R + d;
      const left = label(`${a} + ${b}`);
      const right = label(`${c} − ${d}`);
      const equal = label("They are equal");
      const prompt = `Which is greater: ${left.text} or ${right.text}?`;
      if (outcome === "left")
        return { prompt, answer: left, wrong: [right, equal] };
      if (outcome === "right")
        return { prompt, answer: right, wrong: [left, equal] };
      return { prompt, answer: equal, wrong: [left, right] };
    },
  },
  {
    skill: "Three-digit add / subtract, multiple regroups",
    make(r) {
      const op = r.pick("op", ["+", "−"]);
      const p = r.pick("p", [10, 100]);
      let s = r.sign("s");
      let a: number;
      let b: number;
      let n: number;
      let d2: number;
      if (op === "+") {
        const ha = r.int("ha", 1, 7);
        const hb = r.int("hb", 1, 8 - ha);
        const ta = r.int("ta", 0, 9);
        const tb = r.int("tb", 9 - ta, 9);
        const oa = r.int("oa", 1, 9);
        const ob = r.int("ob", 10 - oa, 9);
        a = 100 * ha + 10 * ta + oa;
        b = 100 * hb + 10 * tb + ob;
        n = a + b;
        if (n - p < 1) s = 1;
        d2 =
          tb !== ob
            ? a + swap(b)
            : ta !== oa
              ? swap(a) + b
              : n + s * (110 - p);
      } else {
        const ha = r.int("ha", 2, 9);
        const hb = r.int("hb", 1, ha - 1);
        const ta = r.int("zflag", 1, 4) === 1 ? 0 : r.int("ta", 0, 9);
        const tb = r.int("tb", ta, 9);
        const oa = r.int("oa", 0, 8);
        const ob = r.int("ob", oa + 1, 9);
        a = 100 * ha + 10 * ta + oa;
        b = 100 * hb + 10 * tb + ob;
        n = a - b;
        if (n - p < 1) s = 1;
        d2 = 100 * (ha - hb) + 10 * (tb - ta) + (ob - oa);
      }
      let d1 = n + s * p;
      if (d1 === d2) d1 = n - s * p;
      return {
        prompt: `${a} ${op} ${b} = ?`,
        answer: whole(n),
        wrong: [whole(d1), whole(d2)],
      };
    },
  },
  {
    skill: "Two-step change word problem",
    make(r) {
      const n = r.int("n", 100, 500);
      const hi = Math.min(200, n - 1);
      const a = r.int("a", 10, hi);
      const b = r.resample(
        () => r.int("b", 10, hi),
        (b) => b !== a,
      );
      const order = r.pick("order", ["gain-first", "lose-first"]);
      const P = r.pick("P", NAMES);
      const item = r.pick("item", ITEMS);
      const gain = r.pick("gain", GAIN);
      const lose = r.pick("lose", LOSE);
      const d1 = n - a + b;
      let d2 = order === "gain-first" ? n + a : n - b;
      if (d2 === d1) d2 = n + a + b;
      const steps =
        order === "gain-first"
          ? `${P} ${gain} ${a} more, then ${lose} ${b}`
          : `${P} ${lose} ${b}, then ${gain} ${a} more`;
      return {
        prompt: `${P} has ${n} ${item}. ${steps}. How many ${item} does ${P} have now?`,
        answer: whole(n + a - b),
        wrong: [whole(d1), whole(d2)],
      };
    },
  },
  {
    skill: "Balance a number sentence",
    make(r) {
      const form = r.pick("F", [1, 2]);
      let prompt: string;
      let x: number;
      let d1: number;
      if (form === 1) {
        const a = r.int("a", 11, 100);
        const b = r.int("b", 11, 100);
        const d = r.int("d", 11, a + b - 11);
        x = a + b - d;
        d1 = a + b;
        prompt = `${a} + ${b} − ? = ${d}`;
      } else {
        const b = r.int("b", 11, 100);
        const c = r.int("c", 11, 100);
        const a = r.int("a", 11, b + c - 11);
        x = b + c - a;
        d1 = b + c;
        prompt = `? + ${a} = ${b} + ${c}`;
      }
      let s = r.sign("s");
      if (x + 10 * s === d1) s = -s;
      return {
        prompt,
        answer: whole(x),
        wrong: [whole(d1), whole(x + 10 * s)],
      };
    },
  },
  {
    skill: "Comparative-language multi-step",
    make(r) {
      const rel1 = r.pick("rel1", ["more", "fewer"]);
      const rel2 = r.pick("rel2", ["more", "fewer"]);
      const x = r.int("x", 30, 300);
      const y =
        rel1 === "more"
          ? r.int("y", 10, 150)
          : r.int("y", 10, Math.min(150, x - 11));
      const Bv = rel1 === "more" ? x + y : x - y;
      const z = r.int("z", 10, Math.min(150, Bv - 1));
      const Cv = rel2 === "more" ? Bv + z : Bv - z;
      const A = r.pick("A", NAMES);
      const B = r.pick(
        "B",
        NAMES.filter((n) => n !== A),
      );
      const C = r.pick(
        "C",
        NAMES.filter((n) => n !== A && n !== B),
      );
      const item = r.pick("item", ITEMS);
      const d1 = rel2 === "more" ? Bv - z : Bv + z;
      let d2 = rel2 === "more" ? x + z : x - z;
      if (d2 < 1 || d2 === d1) d2 = Bv;
      return {
        prompt: `${A} has ${x} ${item}. ${B} has ${y} ${rel1} than ${A}. ${C} has ${z} ${rel2} than ${B}. How many ${item} does ${C} have?`,
        answer: whole(Cv),
        wrong: [whole(d1), whole(d2)],
      };
    },
  },
];

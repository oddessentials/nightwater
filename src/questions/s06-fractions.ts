import {
  type Level,
  NAMES,
  Rat,
  coprimes,
  frac,
  gcd,
  label,
  lcm,
  mixed,
  num,
  over,
  q,
  range,
  whole,
} from "./kit.ts";
import { pie } from "./figures.ts";

export const name = "Fractions";

const FOODS = ["pizza", "cake", "pie"];
const ITEMS = ["paint", "honey", "jam", "rice", "beads"];
const reduced = (x: Rat) => num(x, frac(x));
const written = (n: number, d: number) => num(q(n, d), over(n, d));
const pickPair = (a: number, b: number) => ({ a, b });

export const levels: Level[] = [
  {
    skill: "Name a fraction of a whole",
    make(r) {
      const d = r.int("d", 3, 12);
      const n = r.pick(
        "n",
        range(1, d - 2).filter((n) => gcd(n, d) === 1),
      );
      const who = r.pick("Name", NAMES);
      const food = r.pick("food", FOODS);
      return {
        prompt: `A ${food} is cut into ${d} equal slices. ${who} eats ${n} of them. What fraction of the ${food} did ${who} eat?`,
        figure: pie(d, n),
        answer: reduced(q(n, d)),
        wrong: [reduced(q(d - n, d)), reduced(q(n, d - n))],
      };
    },
  },
  {
    skill: "Equivalent fractions",
    make(r) {
      const b = r.int("b", 2, 10);
      const a = r.pick("a", coprimes(b));
      const k = r.int("k", 2, 5);
      let s = r.sign("s");
      if (s === 1 && ((k * a) % b === 0 || q(k * a, b).eq(q(a + k, b + k))))
        s = -1;
      return {
        prompt: `Which fraction is equal to ${a}/${b}?`,
        answer: written(k * a, k * b),
        wrong: [
          written(a + k, b + k),
          s === 1 ? written(k * a, b) : written(a, k * b),
        ],
      };
    },
  },
  {
    skill: "Compare two fractions",
    make(r) {
      const mode = r.pick("mode", ["D", "N", "H", "E"]);
      let pair: [string, Rat][];
      if (mode === "D") {
        const d = r.int("d", 3, 12);
        const x = r.int("x", 1, d - 1);
        const y = r.resample(
          () => r.int("y", 1, d - 1),
          (y) => y !== x,
        );
        pair = [
          [over(x, d), q(x, d)],
          [over(y, d), q(y, d)],
        ];
      } else if (mode === "N") {
        const a = r.int("a", 1, 9);
        const q1 = r.int("q1", a + 1, 12);
        const q2 = r.resample(
          () => r.int("q2", a + 1, 12),
          (v) => v !== q1,
        );
        pair = [
          [over(a, q1), q(a, q1)],
          [over(a, q2), q(a, q2)],
        ];
      } else if (mode === "H") {
        const d = r.int("q", 3, 12);
        const a = r.pick(
          "a",
          coprimes(d).filter((a) => 2 * a !== d),
        );
        pair = [
          [over(a, d), q(a, d)],
          ["1/2", q(1, 2)],
        ];
        if (r.int("swap", 0, 1)) pair.reverse();
      } else {
        const b = r.int("b", 2, 6);
        const a = r.pick("a", coprimes(b));
        const k = r.int("k", 2, 4);
        pair = [
          [over(a, b), q(a, b)],
          [over(k * a, k * b), q(a, b)],
        ];
        if (r.int("swap", 0, 1)) pair.reverse();
      }
      const [first, second] = pair;
      const prompt = `Which is greater: ${first[0]} or ${second[0]}?`;
      const one = label(first[0]);
      const two = label(second[0]);
      const equal = label("They are equal");
      if (mode === "E") return { prompt, answer: equal, wrong: [one, two] };
      const larger = first[1].cmp(second[1]) > 0;
      return {
        prompt,
        answer: larger ? one : two,
        wrong: [larger ? two : one, equal],
      };
    },
  },
  {
    skill: "Simplify to lowest terms",
    make(r) {
      const d = r.int("q", 3, 30);
      const p = r.pick(
        "p",
        range(2, d - 1).filter((p) => gcd(p, d) === 1),
      );
      const g = r.int("g", 2, Math.floor(60 / d));
      const a = g * p;
      const b = g * d;
      const d2 = q(p - 1, d - 1);
      const branch = (s: number) => (s === 1 ? q(p, b) : q(a, d));
      let s = r.sign("s");
      if (branch(s).isInt() || branch(s).eq(d2)) s = -s;
      return {
        prompt: `Write ${a}/${b} in lowest terms.`,
        answer: reduced(q(p, d)),
        wrong: [reduced(branch(s)), reduced(d2)],
      };
    },
  },
  {
    skill: "Add / subtract, like denominators",
    make(r) {
      const op = r.pick("op", ["+", "−"]);
      const { d, a, b } = r.exclude(
        () => {
          const d = r.int("d", 3, 12);
          return { d, ...pickPair(r.int("a", 1, d - 1), r.int("b", 1, d - 1)) };
        },
        ({ d, a, b }) => {
          if (op === "−" && a <= b) return true;
          const total = op === "+" ? a + b : a - b;
          const g = gcd(total, d);
          return (
            g < 2 ||
            total === d ||
            total % (d / g) === 0 ||
            (op === "−" && a + b === d)
          );
        },
      );
      const total = op === "+" ? a + b : a - b;
      const g = gcd(total, d);
      const answer = q(total, d);
      const d1 = op === "+" ? q(total, 2 * d) : q(a + b, d);
      const branch = (s: number) =>
        s === 1 ? q(total, d / g) : q(total / g, d);
      const bad = (v: Rat) => v.isInt() || v.eq(answer) || v.eq(d1);
      let s = r.sign("s");
      if (bad(branch(s))) s = -s;
      return {
        prompt: `What is ${a}/${d} ${op} ${b}/${d}?`,
        answer: reduced(answer),
        wrong: [reduced(d1), reduced(branch(s))],
      };
    },
  },
  {
    skill: "Mixed ↔ improper",
    make(r) {
      const { d, w, n } = r.exclude(
        () => {
          const d = r.int("q", 3, 9);
          const w = r.int("w", 1, Math.min(6, d - 1));
          const options = coprimes(d).filter((n) => n !== w && w + n !== d);
          return { d, w, n: options.length ? r.pick("n", options) : 0 };
        },
        ({ n }) => n === 0,
      );
      const p = w * d + n;
      if (r.pick("form", ["A", "B"]) === "A") {
        const s = w === 1 ? 1 : r.sign("s");
        const mix = (whole: number, top: number) => {
          const v = q(whole * d + top, d);
          return num(v, mixed(v));
        };
        return {
          prompt: `Write ${p}/${d} as a mixed number.`,
          answer: mix(w, n),
          wrong: [mix(n, w), mix(w + s, n)],
        };
      }
      return {
        prompt: `Write ${w} ${n}/${d} as an improper fraction.`,
        answer: written(p, d),
        wrong: [written(w + n, d), written(d * n + w, d)],
      };
    },
  },
  {
    skill: "Add / subtract, unlike denominators",
    make(r) {
      const op = r.pick("op", ["+", "−"]);
      const combine = (x: Rat, y: Rat) => (op === "+" ? x.add(y) : x.sub(y));
      const { b, d, a, c } = r.exclude(
        () => {
          const b = r.int("b", 2, 12);
          const d = r.int("d", 2, 12);
          return {
            b,
            d,
            a: r.pick("a", coprimes(b)),
            c: r.pick("c", coprimes(d)),
          };
        },
        ({ b, d, a, c }) => {
          if (b === d || lcm(b, d) > 60) return true;
          const result = combine(q(a, b), q(c, d));
          if (result.isInt()) return true;
          return (
            op === "−" &&
            (b <= d || result.sign() <= 0 || (a - c) % (b - d) === 0)
          );
        },
      );
      const answer = combine(q(a, b), q(c, d));
      const top = op === "+" ? a + c : a - c;
      const d1 = op === "+" ? q(a + c, b + d) : q(a - c, b - d);
      const bad = (v: Rat) => v.isInt() || v.eq(answer) || v.eq(d1);
      const branch = (s: number) =>
        q(top, s === 1 ? Math.min(b, d) : lcm(b, d));
      const s = r.sign("s");
      let d2 = branch(s);
      if (bad(d2)) d2 = branch(-s);
      if (bad(d2)) d2 = q(top, b * d);
      return {
        prompt: `What is ${a}/${b} ${op} ${c}/${d}?`,
        answer: reduced(answer),
        wrong: [reduced(d1), reduced(d2)],
      };
    },
  },
  {
    skill: "Multiply / fraction of a quantity",
    make(r) {
      if (r.pick("form", ["A", "B"]) === "A") {
        const { b, d, a, c } = r.exclude(
          () => {
            const b = r.int("b", 2, 12);
            const d = r.int("d", 2, 12);
            return {
              b,
              d,
              a: r.pick("a", coprimes(b)),
              c: r.pick("c", coprimes(d)),
            };
          },
          ({ b, d, a, c }) => b * d > 72 || (a * d) % (b * c) === 0,
        );
        const answer = q(a * c, b * d);
        let d2 = q(a + c, b * d);
        if (d2.eq(answer)) d2 = q(a, b).add(q(c, d));
        return {
          prompt: `What is ${a}/${b} × ${c}/${d}?`,
          answer: reduced(answer),
          wrong: [reduced(q(a * d, b * c)), reduced(d2)],
        };
      }
      const { b, a } = r.exclude(
        () => {
          const b = r.int("b", 3, 12);
          return {
            b,
            a: r.pick(
              "a",
              coprimes(b).filter((a) => a >= 2),
            ),
          };
        },
        ({ a, b }) => a * b > 120,
      );
      const t = r.int("t", 1, Math.floor(120 / (a * b)));
      return {
        prompt: `What is ${a}/${b} of ${a * b * t}?`,
        answer: whole(a * a * t),
        wrong: [whole(a * t), whole(b * t)],
      };
    },
  },
  {
    skill: "Divide fractions",
    make(r) {
      if (r.pick("form", ["A", "B"]) === "A") {
        const { b, d, a, c } = r.exclude(
          () => {
            const b = r.int("b", 2, 12);
            const d = r.int("d", 2, 12);
            return {
              b,
              d,
              a: r.pick("a", coprimes(b)),
              c: r.pick("c", coprimes(d)),
            };
          },
          ({ b, d, a, c }) => {
            const v = q(a * d, b * c);
            return (
              b * c > 72 ||
              v.isInt() ||
              v.cmp(q(1, 20)) < 0 ||
              v.cmp(20) > 0 ||
              v.n < 2
            );
          },
        );
        return {
          prompt: `What is ${a}/${b} ÷ ${c}/${d}?`,
          answer: reduced(q(a * d, b * c)),
          wrong: [reduced(q(a * c, b * d)), reduced(q(b * c, a * d))],
        };
      }
      const b = r.int("b", 3, 8);
      const a = r.pick(
        "a",
        coprimes(b).filter((a) => a >= 2),
      );
      const t = r.int("t", 1, Math.min(8, Math.floor(16 / a)));
      const n = a * t;
      return {
        prompt: `How many ${a}/${b}-cup scoops does it take to fill ${n} cups?`,
        answer: whole(b * t),
        wrong: [whole(n * b), whole(n * a)],
      };
    },
  },
  {
    skill: "Multi-step fraction word problem",
    make(r) {
      const { b, d, a, c } = r.exclude(
        () => {
          const b = r.int("b", 2, 6);
          const d = r.int("d", 2, 6);
          return {
            b,
            d,
            a: r.pick("a", coprimes(b)),
            c: r.pick("c", coprimes(d)),
          };
        },
        ({ b, d, a, c }) => q(a, b).add(q(c, d)).cmp(1) >= 0,
      );
      const form = r.pick("form", ["left", "used"]);
      const who = r.pick("Name", NAMES);
      const item = r.pick("item", ITEMS);
      const first = q(a, b);
      const second = q(c, d);
      const left = q(1).sub(first).mul(q(1).sub(second));
      const answer = form === "left" ? left : q(1).sub(left);
      const d1 =
        form === "left" ? q(1).sub(first).sub(second) : first.add(second);
      let d2 = q(1).sub(answer);
      if (d2.eq(answer) || d2.eq(d1))
        d2 = form === "left" ? q(1).sub(first) : first;
      return {
        prompt: `${who}'s jar of ${item} was full. ${who} used ${a}/${b} of it on Monday, then ${c}/${d} of the rest on Tuesday. What fraction of the ${item} is ${form === "left" ? "left in the jar" : "used up"}?`,
        answer: reduced(answer),
        wrong: [reduced(d1), reduced(d2)],
      };
    },
  },
];

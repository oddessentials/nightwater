import {
  type Level,
  type Rat,
  type Term,
  choice,
  divisors,
  expr,
  gcd,
  int,
  isSquarefree,
  isqrt,
  loneSign,
  nonzero,
  num,
  q,
  range,
  terms,
  whole,
} from "./kit.ts";

export const name = "Advanced Algebra: Polynomials and Quadratics";

type Coef = readonly [coef: number, power: number];
type Point = readonly [x: number, y: number];

const POWERS = ["", "x", "x²", "x³"];
const LEADS = [-3, -2, -1, 1, 2, 3];
const UNITS: Record<string, string> = {
  rectangle: "cm",
  "garden bed": "m",
  numbers: "",
};
const PLACES: Record<string, string> = {
  ball: "rooftop",
  stone: "cliff",
  rocket: "tower",
  drone: "balcony",
};

const polyText = (list: readonly Coef[]) =>
  terms(list.map(([c, p]): Term => [c, POWERS[p]]));
const poly = (list: readonly Coef[]) =>
  expr(polyText(list), (x) =>
    list.reduce((sum, [c, p]) => sum + c * x ** p, 0),
  );
const quadratic = (a: number, b: number, c: number) =>
  polyText([
    [a, 2],
    [b, 1],
    [c, 0],
  ]);
const lin = (m: number, c: number) =>
  terms([
    [m, "x"],
    [c, ""],
  ]);
const brackets = (m1: number, c1: number, m2: number, c2: number) =>
  expr(
    `(${lin(m1, c1)})(${lin(m2, c2)})`,
    (x) => (m1 * x + c1) * (m2 * x + c2),
  );
const monic = (u: number, w: number) =>
  u < w ? brackets(1, u, 1, w) : brackets(1, w, 1, u);
const roots = (text: string, mid: Rat, spread: Rat) =>
  choice(text, `roots:${mid}|${spread}`);
const pair = (u: number, w: number) => {
  const [lo, hi] = u < w ? [u, w] : [w, u];
  return roots(
    `x = ${int(lo)} or x = ${int(hi)}`,
    q(lo + hi, 2),
    q(hi - lo, 2).pow(2),
  );
};
const around = (mid: number, radicand: number) =>
  roots(`x = ${int(mid)} ± √${radicand}`, q(mid), q(radicand));
const formula = (top: number, radicand: number, den: number) =>
  roots(
    `x = (${int(top)} ± √${radicand})/${den}`,
    q(top, den),
    q(radicand, den * den),
  );
const point = ([x, y]: Point) =>
  choice(`(${int(x)}, ${int(y)})`, `point:${x},${y}`);
const carriesMinus = ([x, y]: Point) => (x < 0 || y < 0 ? -1 : 1);
const solutions = (d: number) => whole(d > 0 ? 2 : d === 0 ? 1 : 0);
const offsets = (a: number) =>
  nonzero(6).filter((h) => Math.abs(a) * h * h <= 24);
const vertices = (a: number, h: number, c: number): Point[] => [
  [h, c - a * h * h],
  [-h, c + 3 * a * h * h],
  [h, c],
];
const partners = (a: number) =>
  range(1, 40).filter((n) => {
    const m = isqrt(a * n);
    return m * m === a * n && m <= 12;
  });

function shifts(lo: number, hi: number) {
  const taken = [lo, hi, -lo, -hi];
  return [-2, -1, 1, 2].filter((d) => {
    const u = lo + d;
    const w = hi - d;
    return (
      u !== 0 &&
      w !== 0 &&
      d !== hi - lo &&
      u !== w &&
      !taken.includes(u) &&
      !taken.includes(w)
    );
  });
}

function productPairs(lo: number, hi: number) {
  const size = Math.abs(lo * hi);
  const taken = [lo, hi, -lo, -hi];
  return divisors(size)
    .map((d): [number, number] => [
      Math.sign(lo) * d,
      (Math.sign(hi) * size) / d,
    ])
    .filter(
      ([u, w]) =>
        u < w && u + w !== lo + hi && !taken.includes(u) && !taken.includes(w),
    );
}

export const levels: Level[] = [
  {
    skill: "Adding and subtracting polynomials",
    make(r) {
      const op = r.pick("op", ["A", "S"]);
      const pw = r.pick("pw", [
        [2, 1, 0],
        [3, 2, 0],
        [3, 2, 1],
      ]);
      const { P, Q } = r.exclude(
        () => ({
          P: ["p2", "p1", "p0"].map((n) => r.pick(n, nonzero(9))),
          Q: ["q2", "q1", "q0"].map((n) => r.pick(n, nonzero(9))),
        }),
        ({ P, Q }) => {
          if (P.some((p, i) => p + Q[i] === 0 || p - Q[i] === 0)) return true;
          const same = P.map((p, i) => Math.sign(p) === Math.sign(Q[i]));
          return op === "A" && (same.every(Boolean) || !same.some(Boolean));
        },
      );
      const at = (list: readonly number[]) =>
        list.map((c, i): Coef => [c, pw[i]]);
      const sum = P.map((p, i) => p + Q[i]);
      const difference = P.map((p, i) => p - Q[i]);
      const d1 =
        op === "A"
          ? P.map((p, i) =>
              Math.sign(p) === Math.sign(Q[i])
                ? p + Q[i]
                : Math.sign(p) * (Math.abs(p) + Math.abs(Q[i])),
            )
          : P.map((p, i) => (i ? p + Q[i] : p - Q[i]));
      return {
        prompt: `Simplify (${polyText(at(P))}) ${op === "A" ? "+" : "−"} (${polyText(at(Q))}).`,
        answer: poly(at(op === "A" ? sum : difference)),
        wrong: [poly(at(d1)), poly(at(op === "A" ? difference : sum))],
      };
    },
  },
  {
    skill: "Multiplying out",
    make(r) {
      if (r.pick("form", ["B", "M"]) === "B") {
        const v = r.pick("v", ["M", "C"]);
        const { a, b } = r.exclude(
          () => ({ a: r.pick("a", nonzero(9)), b: r.pick("b", nonzero(9)) }),
          ({ a, b }) =>
            a + b === 0 ||
            (v === "C" &&
              (Math.min(a, b) > 0 || a + b === a * b || a + b === -a * b)),
        );
        const trinomial = (middle: number, end: number) =>
          poly([
            [1, 2],
            [middle, 1],
            [end, 0],
          ]);
        return {
          prompt: `Expand (${lin(1, a)})(${lin(1, b)}).`,
          answer: trinomial(a + b, a * b),
          wrong:
            v === "M"
              ? [trinomial(-(a + b), a * b), trinomial(0, a * b)]
              : [trinomial(a + b, -a * b), trinomial(a + b, a + b)],
        };
      }
      const { c, p, t, u } = r.exclude(
        () => ({
          c: r.int("c", 2, 9),
          p: r.pick("p", nonzero(9)),
          t: r.pick("q", nonzero(9)),
          u: r.pick("r", nonzero(9)),
        }),
        ({ c, p, t, u }) =>
          [p, t, u].some((z) => c * z === c + z || c + z === 0),
      );
      const cubic = (x3: number, x2: number, x1: number) =>
        poly([
          [x3, 3],
          [x2, 2],
          [x1, 1],
        ]);
      return {
        prompt: `Expand ${c}x(${quadratic(p, t, u)}).`,
        answer: cubic(c * p, c * t, c * u),
        wrong: [cubic(c * p, t, u), cubic(c + p, c + t, c + u)],
      };
    },
  },
  {
    skill: "Special products",
    make(r) {
      if (r.pick("form", ["S", "D"]) === "S") {
        const m = r.int("m", 1, 6);
        const a = r.int("a", 1, 20);
        const s = r.sign("s");
        const square = (middle: number) =>
          poly([
            [m * m, 2],
            [middle, 1],
            [a * a, 0],
          ]);
        return {
          prompt: `Expand (${lin(m, s * a)})².`,
          answer: square(2 * s * m * a),
          wrong: [square(0), square(s * m * a)],
        };
      }
      const v = r.pick("v", ["L", "K"]);
      const m = r.int("m", v === "L" ? 3 : 1, 6);
      const a = r.int("a", v === "L" ? 2 : 3, 20);
      const two = (lead: number, end: number) =>
        poly([
          [lead, 2],
          [end, 0],
        ]);
      return {
        prompt: `Expand (${lin(m, a)})(${lin(m, -a)}).`,
        answer: two(m * m, -a * a),
        wrong:
          v === "L"
            ? [two(m, -a * a), two(2 * m, -a * a)]
            : [two(m * m, a * a), two(m * m, -2 * a)],
      };
    },
  },
  {
    skill: "Factoring: common factor, and x² + Bx + C",
    make(r) {
      if (r.pick("form", ["T", "G"]) === "T") {
        const { lo, hi, options } = r.exclude(
          () => {
            const lo = r.pick("r", nonzero(12));
            const hi = r.pick("s", nonzero(12));
            return {
              lo,
              hi,
              options: lo < hi && lo !== -hi ? shifts(lo, hi) : [],
            };
          },
          ({ options }) => !options.length,
        );
        const d = r.pick("d", options);
        return {
          prompt: `Factor ${quadratic(1, lo + hi, lo * hi)}.`,
          answer: monic(lo, hi),
          wrong: [monic(-lo, -hi), monic(lo + d, hi - d)],
        };
      }
      const v = r.pick("v", ["M", "K"]);
      const g = r.int("g", 2, 9);
      const a = r.int("a", v === "M" ? 2 : 1, 9);
      const b = r.pick(
        "b",
        nonzero(9).filter((b) => gcd(a, b) === 1),
      );
      const outside = (k: number, power: number, m: number, c: number) =>
        expr(
          `${k}${POWERS[power]}(${lin(m, c)})`,
          (x) => k * x ** power * (m * x + c),
        );
      return {
        prompt: `Factor ${polyText([
          [g * a, 2],
          [g * b, 1],
        ])}.`,
        answer: outside(g, 1, a, b),
        wrong:
          v === "M"
            ? [outside(g, 2, a, b), outside(g * a, 1, a, b)]
            : [outside(g, 1, g * a, g * b), outside(g, 1, a, g * b)],
      };
    },
  },
  {
    skill: "Factoring: a ≠ 1, and the difference of two squares",
    make(r) {
      if (r.pick("form", ["A", "DS"]) === "A") {
        const p = r.int("p", 2, 4);
        const { u, w } = r.exclude(
          () => ({
            u: r.pick("q", nonzero(11)),
            w: r.pick("s", nonzero(11)),
          }),
          ({ u, w }) =>
            gcd(p, u) !== 1 ||
            gcd(p, w) !== 1 ||
            u === w ||
            u === -w ||
            p * w + u === 0,
        );
        return {
          prompt: `Factor ${quadratic(p, p * w + u, u * w)}.`,
          answer: brackets(p, u, 1, w),
          wrong: [brackets(p, w, 1, u), brackets(p, -u, 1, -w)],
        };
      }
      const { m, a } = r.exclude(
        () => ({ m: r.int("m", 1, 9), a: r.int("a", 2, 15) }),
        ({ m, a }) => gcd(m, a) !== 1,
      );
      return {
        prompt: `Factor ${polyText([
          [m * m, 2],
          [-a * a, 0],
        ])}.`,
        answer: brackets(m, a, m, -a),
        wrong: [
          expr(`(${lin(m, -a)})²`, (x) => (m * x - a) ** 2),
          brackets(m * m, a * a, m * m, -a * a),
        ],
      };
    },
  },
  {
    skill: "Solving by factoring",
    make(r) {
      const { lo, hi, options } = r.exclude(
        () => {
          const lo = r.pick("r", nonzero(15));
          const hi = r.pick("s", nonzero(15));
          return {
            lo,
            hi,
            options: lo < hi && lo !== -hi ? productPairs(lo, hi) : [],
          };
        },
        ({ options }) => !options.length,
      );
      const [r2, s2] = r.pick("pair", options);
      return {
        prompt: `Solve ${quadratic(1, -(lo + hi), lo * hi)} = 0.`,
        answer: pair(lo, hi),
        wrong: [pair(-hi, -lo), pair(r2, s2)],
      };
    },
  },
  {
    skill: "Vertex and axis of symmetry",
    make(r) {
      if (r.pick("form", ["V", "X"]) === "V") {
        const { a, h, c } = r.exclude(
          () => {
            const a = r.pick("a", LEADS);
            return { a, h: r.pick("h", offsets(a)), c: r.int("c", -16, 16) };
          },
          ({ a, h, c }) => loneSign(vertices(a, h, c).map(carriesMinus)),
        );
        const [answer, d1, d2] = vertices(a, h, c).map(point);
        return {
          prompt: `What is the vertex of y = ${quadratic(a, -2 * a * h, c)}?`,
          answer,
          wrong: [d1, d2],
        };
      }
      const z = r.weighted("z", [
        ["lo", 2],
        ["hi", 1],
      ]);
      const { a, h, t } = r.exclude(
        () => {
          const a = r.pick("a", LEADS);
          const h = r.pick("h", offsets(a));
          return { a, h, t: r.pick("t", nonzero(6)) };
        },
        ({ a, h, t }) =>
          Math.sign(t) === Math.sign(h) ||
          (z === "lo"
            ? Math.abs(t) >= Math.abs(h)
            : Math.abs(t) <= Math.abs(h)) ||
          Math.abs(2 * a * h * t) > 60,
      );
      const b = -2 * a * h;
      const axis = (x: number) => num(x, `x = ${int(x)}`);
      return {
        prompt: `What is the axis of symmetry of y = ${quadratic(a, b, t * b)}?`,
        answer: axis(h),
        wrong: [axis(-h), axis(-t)],
      };
    },
  },
  {
    skill: "Square roots and completing the square",
    make(r) {
      if (r.pick("form", ["R", "C"]) === "R") {
        const { k, w } = r.exclude(
          () => ({ k: r.int("k", 2, 9), w: r.pick("w", nonzero(25)) }),
          ({ k, w }) => {
            const P = -w;
            if (Math.abs(P) >= k && Math.abs(P) <= k * k) return true;
            const values = [P - k, P + k, P - k * k, P + k * k, -P - k, -P + k];
            return new Set(values).size < values.length;
          },
        );
        const P = -w;
        return {
          prompt: `Solve (${lin(1, w)})² = ${k * k}.`,
          answer: pair(P - k, P + k),
          wrong: [pair(P - k * k, P + k * k), pair(-P - k, -P + k)],
        };
      }
      const v = r.pick("v", ["S", "R"]);
      const { h, n } = r.exclude(
        () => ({ h: r.pick("h", nonzero(8)), n: r.int("n", 1, 40) }),
        ({ h, n }) => {
          const radicands = [h * h + n, n, h * h - n];
          const shown = v === "S" ? radicands.slice(0, 1) : radicands;
          return (
            shown.some((e) => e < 2 || !isSquarefree(e)) ||
            new Set(shown).size < shown.length
          );
        },
      );
      const D = h * h + n;
      return {
        prompt: `Solve ${quadratic(1, 2 * h, -n)} = 0.`,
        answer: around(-h, D),
        wrong:
          v === "S"
            ? [around(h, D), around(-2 * h, D)]
            : [around(-h, n), around(-h, h * h - n)],
      };
    },
  },
  {
    skill: "Discriminant and the quadratic formula",
    make(r) {
      if (r.pick("form", ["N", "F"]) === "N") {
        const k = r.pick("k", [0, 1, 2]);
        const u = k === 2 ? r.pick("u", ["P", "N"]) : "";
        let a: number;
        let c: number;
        let m: number;
        if (u === "P") {
          a = r.int("a", 1, 8);
          c = -r.pick("n", partners(a));
          m = isqrt(-a * c);
        } else if (u === "N") {
          a = r.int("a", -8, -1);
          m = r.int("m", 1, 6);
          c = m * m;
        } else if (k === 1) {
          a = r.pick("a", nonzero(8));
          c = r.pick(
            "c",
            partners(Math.abs(a)).map((n) => Math.sign(a) * n),
          );
          m = isqrt(a * c);
        } else {
          m = r.int("m", 1, 6);
          c = m * m;
          a = r.int("a", 2, 8);
        }
        const b = r.sign("sign") * 2 * m;
        const slips =
          u === "P"
            ? [b * b + 4 * a * c, 4 * a * c - b * b]
            : u === "N"
              ? [b * b - 4 * c, 4 * a * c - b * b]
              : k === 1
                ? [b * b + 4 * a * c, b - 4 * a * c]
                : [b * b - 4 * c, 4 * a * c - b * b];
        return {
          prompt: `How many real solutions does ${quadratic(a, b, c)} = 0 have?`,
          answer: solutions(b * b - 4 * a * c),
          wrong: [solutions(slips[0]), solutions(slips[1])],
        };
      }
      const v = r.pick("v", ["D", "R"]);
      const { a, b, c } = r.exclude(
        () => ({
          a: r.int("a", v === "D" ? 3 : 2, 6),
          b: r.pick("b", nonzero(12)),
          c: r.pick("c", nonzero(9)),
        }),
        ({ a, b, c }) => {
          const radicands = [
            b * b - 4 * a * c,
            b * b + 4 * a * c,
            b * b - 4 * c,
          ];
          const shown = v === "D" ? radicands.slice(0, 1) : radicands;
          return (
            shown.some((e) => e < 2 || !isSquarefree(e)) ||
            new Set(shown).size < shown.length
          );
        },
      );
      const D = b * b - 4 * a * c;
      return {
        prompt: `Solve ${quadratic(a, b, c)} = 0. Give the exact solutions.`,
        answer: formula(-b, D, 2 * a),
        wrong:
          v === "D"
            ? [formula(-b, D, 2), formula(-b, D, a)]
            : [
                formula(-b, b * b + 4 * a * c, 2 * a),
                formula(-b, b * b - 4 * c, 2 * a),
              ],
      };
    },
  },
  {
    skill: "Quadratic word problems",
    make(r) {
      if (r.pick("form", ["A", "P"]) === "A") {
        const z = r.pick("z", ["near", "far"]);
        const context = r.pick("context", Object.keys(UNITS));
        const { x, d, T, options } = r.exclude(
          () => {
            const x = r.int("x", 2, 15);
            const d = r.int("d", 1, 12);
            const T = x * (x + d);
            const options = divisors(T).filter((f) => {
              const gap = T / f - f;
              return (
                gap >= 0 &&
                (z === "near" ? gap < d : gap > d) &&
                f !== x &&
                f !== x + d
              );
            });
            return { x, d, T, options };
          },
          ({ options }) => !options.length,
        );
        const f = r.pick("f", options);
        const unit = UNITS[context];
        const size = (n: number) => num(n, unit ? `${int(n)} ${unit}` : int(n));
        return {
          prompt:
            context === "numbers"
              ? `Two whole numbers differ by ${d}. Their product is ${T}. What is the smaller number?`
              : `A ${context} is ${d} ${unit} longer than it is wide. Its area is ${T} ${unit}². How wide is it?`,
          answer: size(x),
          wrong: [size(x + d), size(f)],
        };
      }
      const v = r.pick("v", ["M", "B"]);
      const ctx = r.pick("ctx", Object.keys(PLACES));
      const { R, L } = r.exclude(
        () => ({ R: r.int("R", 3, 15), L: r.int("L", 1, 12) }),
        ({ R, L }) =>
          L >= R ||
          (R - L) % 2 !== 0 ||
          R === 3 * L ||
          16 * (R - L) > 240 ||
          16 * R * L > 1600,
      );
      const v0 = 16 * (R - L);
      const s = 16 * R * L;
      const height = terms([
        [-16, "t²"],
        [v0, "t"],
        [s, ""],
      ]);
      const time = (n: number) => num(n, `${int(n)} s`);
      const start =
        ctx === "rocket" || ctx === "drone" ? "is launched" : "is thrown up";
      return {
        prompt: `A ${ctx} ${start} from a ${PLACES[ctx]}. Its height after t seconds is h = ${height} feet. When does it hit the ground?`,
        answer: time(R),
        wrong: [time(v === "M" ? (v0 + s) / 16 : L), time(v0 / 32)],
      };
    },
  },
];

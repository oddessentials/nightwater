import { type Level, type Rng, int, range, whole } from "./kit.ts";

export const name = "Place Value, Rounding, and Estimation";

const PLACES = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten thousands",
  "hundred thousands",
  "millions",
];
const TAG = " (halfway rounds up)";
const show = (n: number) => int(n, true);
const grouped = (n: number) => whole(n, true);
const trunc = (n: number, H: number) => n - (n % H);
const round = (n: number, H: number) => trunc(n, H) + (n % H >= H / 2 ? H : 0);
const other = (n: number, H: number) =>
  n % H >= H / 2 ? round(n, H) - H : round(n, H) + H;
const fromDigits = (digits: readonly number[]) =>
  digits.reduce((n, g, i) => n + g * 10 ** i, 0);
const above = (r: Rng, from: number, L: number) =>
  range(from, L - 1).reduce(
    (n, i) => n + r.int(`d${i}`, i === L - 1 ? 1 : 0, 9) * 10 ** i,
    0,
  );

export const levels: Level[] = [
  {
    skill: "Value of a digit",
    make(r) {
      const L = r.int("L", 3, 4);
      const p = r.int("p", 1, L - 1);
      const d = r.int("d", 2, 9);
      const N = fromDigits(
        range(0, L - 1).map((i) =>
          i === p
            ? d
            : r.resample(
                () => r.int(`g${i}`, i === L - 1 ? 1 : 0, 9),
                (g) => g !== d,
              ),
        ),
      );
      const fits = [-1, 1].filter((s) => p + s >= 1 && p + s <= L - 1);
      const s = fits.length > 1 ? r.sign("s") : fits[0];
      return {
        prompt: `In ${show(N)}, what is the value of the digit ${d}?`,
        answer: grouped(d * 10 ** p),
        wrong: [grouped(d), grouped(d * 10 ** (p + s))],
      };
    },
  },
  {
    skill: "Compose from place values",
    make(r) {
      const L = r.int("L", 4, 5);
      const z = r.int("z", 0, L - 2);
      const swaps = (g: readonly number[]) =>
        range(0, L - 2).filter(
          (j) => g[j] !== 0 && g[j + 1] !== 0 && g[j] !== g[j + 1],
        );
      const g = r.exclude(
        () => range(0, L - 1).map((i) => (i === z ? 0 : r.int(`g${i}`, 1, 9))),
        (g) => !swaps(g).length,
      );
      const j = r.pick("j", swaps(g));
      const swapped = g.map((digit, i) =>
        i === j ? g[j + 1] : i === j + 1 ? g[j] : digit,
      );
      const sum = g
        .map(
          (digit, i) =>
            `${digit} ${digit === 1 ? PLACES[i].slice(0, -1) : PLACES[i]}`,
        )
        .reverse()
        .join(" + ");
      return {
        prompt: `${sum} = ?`,
        answer: grouped(fromDigits(g)),
        wrong: [
          grouped(fromDigits(g.filter((_, i) => i !== z))),
          grouped(fromDigits(swapped)),
        ],
      };
    },
  },
  {
    skill: "Compare same-length numbers",
    make(r) {
      const L = r.int("L", 4, 5);
      const f = r.int("f", 1, 8);
      const { a, b, c } = r.exclude(
        () => ({
          a: r.int("a", 0, 8),
          b: r.int("b", 0, 8),
          c: r.int("c", 0, 8),
        }),
        ({ a, b, c }) => a <= b || b <= c,
      );
      const top = L - 3;
      const number = (lead: number, tail: (i: number) => number) =>
        grouped(fromDigits([...range(0, top).map(tail), lead, f]));
      return {
        prompt: "Which is largest?",
        answer: number(a, (i) => r.int(`a${i}`, 0, i ? 8 : 4)),
        wrong: [
          number(b, (i) => r.int(`b${i}`, i ? 0 : 6, 8)),
          number(c, (i) => (i === top ? 9 : r.int(`c${i}`, 0, i ? 8 : 5))),
        ],
      };
    },
  },
  {
    skill: "Round to the nearest 10 or 100",
    make(r) {
      const H = r.pick("H", [10, 100]);
      const L = r.int("L", 3, 4);
      const bnd = r.weighted("bnd", [
        [true, 1],
        [false, 2],
      ]);
      const low =
        H === 10
          ? 10 * r.int("t", 2, 7) +
            (bnd ? 5 : r.pick("d0", [1, 2, 3, 4, 6, 7, 8, 9]))
          : 10 * (bnd ? 5 : r.pick("c", [1, 2, 3, 4, 6, 7, 8])) +
            r.int("d0", 0, 9);
      const N = low + above(r, 2, L);
      return {
        prompt: `Round ${show(N)} to the nearest ${show(H)}.${TAG}`,
        answer: grouped(round(N, H)),
        wrong: [grouped(other(N, H)), grouped(round(N, H === 10 ? 100 : 10))],
      };
    },
  },
  {
    skill: "Round to the nearest 1,000 or 10,000",
    make(r) {
      const k = r.int("k", 3, 4);
      const H = 10 ** k;
      const L = r.int("L", k + 1, 6);
      const carry = r.weighted("carry", [
        [true, 1],
        [false, 3],
      ]);
      const t = carry ? 9 : r.int("t", k === L - 1 ? 1 : 0, 9);
      const c = r.int("c", carry ? 5 : 1, 8);
      const w = r.int("w", 0, H / 10 - 1);
      const N = t * H + (c * H) / 10 + w + above(r, k + 1, L);
      return {
        prompt: `Round ${show(N)} to the nearest ${show(H)}.${TAG}`,
        answer: grouped(round(N, H)),
        wrong: [grouped(other(N, H)), grouped(round(N, H / 10))],
      };
    },
  },
  {
    skill: "Estimate a sum or difference",
    make(r) {
      const op = r.pick("op", ["+", "−"]);
      const H = r.pick("H", [10, 100]);
      const apply = (x: number, y: number) => (op === "+" ? x + y : x - y);
      const estimates = (a: number, b: number) => [
        apply(round(a, H), round(b, H)),
        round(apply(a, b), H),
        apply(other(a, H), other(b, H)),
      ];
      const { a, b } = r.exclude(
        () => ({ a: r.int("a", 100, 999), b: r.int("b", 100, 999) }),
        ({ a, b }) =>
          a % H === 0 ||
          b % H === 0 ||
          (op === "−" && a - b < 4 * H) ||
          new Set(estimates(a, b)).size < 3,
      );
      const [answer, d1, d2] = estimates(a, b);
      return {
        prompt: `Round each to the nearest ${show(H)}, then ${op === "+" ? "add" : "subtract"}: ${show(a)} ${op} ${show(b)} ≈ ?${TAG}`,
        answer: grouped(answer),
        wrong: [grouped(d1), grouped(d2)],
      };
    },
  },
  {
    skill: "Estimate a product",
    make(r) {
      const form = r.weighted("form", [
        ["A", 2],
        ["B", 1],
      ]);
      const a = r.resample(
        () => r.int("a", 10, 99),
        (a) => a % 10 !== 0,
      );
      const b =
        form === "A"
          ? r.resample(
              () => r.int("b", 10, 99),
              (b) => b % 10 !== 0,
            )
          : r.int("b", 2, 9);
      const f = form === "A" ? r.pick("f", ["a", "b"]) : "a";
      const A1 = round(a, 10);
      const B1 = form === "A" ? round(b, 10) : b;
      const slip = f === "a" ? other(a, 10) * B1 : A1 * other(b, 10);
      const which = form === "A" ? "each" : show(a);
      return {
        prompt: `Round ${which} to the nearest 10, then multiply: ${show(a)} × ${show(b)} ≈ ?${TAG}`,
        answer: grouped(A1 * B1),
        wrong: [grouped(slip), grouped((A1 * B1) / 10)],
      };
    },
  },
  {
    skill: "Which number rounds to R",
    make(r) {
      const H = r.pick("H", [100, 1000]);
      const R = r.int("m", 10, 999) * H;
      const s = r.sign("s");
      const x = r.resample(
        () => r.int("x", R - H / 2, R + H / 2 - 1),
        (x) => x !== R,
      );
      const v = r.int("v", 1, s === 1 ? H / 2 - 1 : H / 20 - 1);
      const edge = s === 1 ? R + H / 2 : R - H / 2 - 1;
      return {
        prompt: `Which number rounds to ${show(R)} at the nearest ${show(H)}?${TAG}`,
        answer: grouped(x),
        wrong: [grouped(edge), grouped(edge + s * v)],
      };
    },
  },
  {
    skill: "Place-value jumps with rollover",
    make(r) {
      const run = r.pick("run", [1, 1, 2]);
      const L = r.int("L", 5, 7);
      const p = r.int("p", 2, Math.min(5, L - 1 - run));
      const J = 10 ** p;
      const dir = r.pick("dir", ["more", "less"]);
      const more = dir === "more";
      const digit = (i: number) => {
        const lead = i === L - 1 ? 1 : 0;
        if (i >= p && i < p + run) return more ? 9 : 0;
        if (i === p + run)
          return more ? r.int(`d${i}`, lead, 8) : r.int(`d${i}`, 1, 9);
        return r.int(`d${i}`, lead, 9);
      };
      const N = fromDigits(range(0, L - 1).map(digit));
      const step = more ? 1 : -1;
      const u = r.sign("u");
      let d1 = N + step * (u === 1 ? J * 10 : J / 10);
      if (d1 < 1 || d1 > 9_999_999) d1 = N + step * (J / 10);
      return {
        prompt: `What is ${show(J)} ${dir} than ${show(N)}?`,
        answer: grouped(N + step * J),
        wrong: [grouped(d1), grouped(N - step * 9 * J)],
      };
    },
  },
  {
    skill: "Rounding range",
    make(r) {
      const H = r.pick("H", [10, 100, 1000]);
      const R = r.int("m", 2, 999) * H;
      const end = r.pick("end", ["smallest", "largest"]);
      const s = r.sign("s");
      const small = end === "smallest";
      const slip = s === 1 ? (small ? R : R + H - 1) : small ? R - H + 1 : R;
      return {
        prompt: `A whole number rounds to ${show(R)} at the nearest ${show(H)}. What is the ${end} it could be?${TAG}`,
        answer: grouped(small ? R - H / 2 : R + H / 2 - 1),
        wrong: [grouped(small ? R - H / 2 + 1 : R + H / 2), grouped(slip)],
      };
    },
  },
];

import {
  type Level,
  MINUS,
  Rat,
  choice,
  coprimes,
  dec,
  frac,
  int,
  isSquarefree,
  isqrt,
  label,
  num,
  powers,
  q,
  range,
  simplifyRoot,
  surd,
  whole,
} from "./kit.ts";

export const name = "Exponents and Roots";

const PRIMES = [2, 3, 5, 7];
const POWER_PAIRS = range(2, 5).flatMap((n) =>
  range(2, [20, 12, 6, 4][n - 2])
    .filter((a) => !(a === 2 && n === 2))
    .map((a) => [a, n] as const),
);
const RADICAL_PAIRS = range(2, 15)
  .filter(isSquarefree)
  .flatMap((k) =>
    range(2, 500)
      .filter((m) => k * k * m <= 500 && m !== k && isSquarefree(m))
      .map((m) => [k, m] as const),
  );
const raise = (base: number, e: number) => q(base).pow(e).n;
const big = (base: number, e: number) => BigInt(base) ** BigInt(e);
const valued = (text: string, value: bigint) => choice(text, `num:${value}`);
const power = (base: number, e: number) =>
  valued(powers([[base, e]]), big(base, e));
const both = (a: number, x: number, b: number, y: number) =>
  powers([
    [a, x],
    [b, y],
  ]);
const product = (a: number, x: number, b: number, y: number) =>
  valued(both(a, x, b, y), big(a, x) * big(b, y));
const count = (n: number) => whole(n, true);
const exact = (v: Rat) => num(v, frac(v, true));
const radical = (c: number, m: number) =>
  choice(surd(c, m), `surd:${simplifyRoot(c * c * m).join("√")}`);
const times = (x: number, copies: number) =>
  Array.from({ length: copies }, () => `${x}`).join(" × ");
const tens = (e: number) => `10^${e}`;

export const levels: Level[] = [
  {
    skill: "Evaluate powers",
    make(r) {
      let s = r.sign("s");
      const [a, n] = r.pick("an", POWER_PAIRS);
      const slip = (t: number) => raise(a, n - 1) * (a + t);
      if (slip(s) === a * n) s = -s;
      return {
        prompt: `What is ${powers([[a, n]])}?`,
        answer: count(raise(a, n)),
        wrong: [count(a * n), count(slip(s))],
      };
    },
  },
  {
    skill: "Repeated multiplication ↔ power",
    make(r) {
      const form = r.pick("form", ["E", "P"]);
      const { a, n } = r.exclude(
        () => ({ a: r.int("a", 2, 9), n: r.int("n", 2, 5) }),
        ({ a, n }) => a === n || (a === 2 && n === 4) || (a === 4 && n === 2),
      );
      if (form === "E")
        return {
          prompt: `${times(a, n)} = ?`,
          answer: power(a, n),
          wrong: [power(n, a), count(a * n)],
        };
      return {
        prompt: `${powers([[a, n]])} = ?`,
        answer: valued(times(a, n), big(a, n)),
        wrong: [
          valued(times(n, a), big(n, a)),
          valued(`${a} × ${n}`, BigInt(a * n)),
        ],
      };
    },
  },
  {
    skill: "Perfect square and cube roots",
    make(r) {
      const form = r.pick("form", ["S", "C"]);
      let s = r.sign("s");
      const index = form === "S" ? 2 : 3;
      const root = r.int("r", 3, form === "S" ? 15 : 10);
      const n = raise(root, index);
      const split = Math.floor(n / index);
      if (root + s === split) s = -s;
      return {
        prompt: `What is ${form === "S" ? "√" : "∛"}${int(n, true)}?`,
        answer: count(root),
        wrong: [count(root + s), count(split)],
      };
    },
  },
  {
    skill: "Powers of 10 and scientific notation",
    make(r) {
      const form = r.pick("form", ["P", "Q", "S", "R"]);
      const s = r.sign("s");
      const t = form === "R" ? r.sign("t") : 0;
      const e = r.int("e", 2, 6);
      if (form === "P")
        return {
          prompt: `What is ${tens(e)}?`,
          answer: count(raise(10, e)),
          wrong: [count(raise(10, e + s)), count(10 * e)],
        };
      if (form === "Q")
        return {
          prompt: `Write ${int(raise(10, e), true)} as a power.`,
          answer: valued(tens(e), big(10, e)),
          wrong: [valued(tens(e + s), big(10, e + s)), power(e, 10)],
        };
      const k =
        form === "R"
          ? r.resample(
              () => r.int("k", 11, 99),
              (k) => k % 10 !== 0,
            )
          : r.int("k", 11, 99);
      const m = q(k, 10);
      const scaled = (x: number) => m.mul(raise(10, x));
      if (form === "S")
        return {
          prompt: `Write ${dec(m)} × ${tens(e)} as an ordinary number.`,
          answer: exact(scaled(e)),
          wrong: [exact(scaled(e + s)), exact(m.mul(10 * e))],
        };
      const sci = (mantissa: Rat, x: number) =>
        num(mantissa.mul(raise(10, x)), `${dec(mantissa)} × ${tens(x)}`);
      return {
        prompt: `Write ${frac(scaled(e), true)} in scientific notation.`,
        answer: sci(m, e),
        wrong: [sci(m, e + s), sci(q(Math.floor(k / 10)), e + t)],
      };
    },
  },
  {
    skill: "Product and quotient rules",
    make(r) {
      const form = r.pick("form", ["P", "Q"]);
      const v = form === "P" ? r.pick("v", ["A", "B"]) : "";
      const a = r.int("a", 2, 12);
      if (form === "P") {
        const { m, n } = r.exclude(
          () => ({ m: r.int("m", 1, 9), n: r.int("n", 1, 9) }),
          ({ m, n }) => m === n && m <= 2,
        );
        const shared = v === "A" && 2 * (m + n) !== m * n ? m + n : m * n;
        return {
          prompt: `Simplify ${both(a, m, a, n)}.`,
          answer: power(a, m + n),
          wrong: [power(a, m * n), power(a * a, shared)],
        };
      }
      const { m, n } = r.exclude(
        () => ({ m: r.int("m", 1, 9), n: r.int("n", 1, 9) }),
        ({ m, n }) => m % n !== 0 || m - n < 2 || (m === 4 && n === 2),
      );
      return {
        prompt: `Simplify ${powers([[a, m]])} ÷ ${powers([[a, n]])}.`,
        answer: power(a, m - n),
        wrong: [power(a, m + n), power(a, m / n)],
      };
    },
  },
  {
    skill: "Power of a power, zero exponent",
    make(r) {
      const form = r.pick("form", ["W", "Z", "B"]);
      const v = form === "W" ? "" : r.pick("v", ["A", "B"]);
      if (form === "W") {
        const { a, m, n } = r.exclude(
          () => ({
            a: r.int("a", 2, 9),
            m: r.int("m", 2, 5),
            n: r.int("n", 2, 5),
          }),
          ({ a, m, n }) =>
            (m === 2 && n === 2) ||
            (a === 2 && m === 2) ||
            raise(m, n) === raise(a, m),
        );
        return {
          prompt: `Simplify (${powers([[a, m]])})^${n}.`,
          answer: power(a, m * n),
          wrong: [power(a, m + n), power(a * m, n)],
        };
      }
      if (form === "Z") {
        const a = r.int("a", 2, 12);
        const b = r.int("b", 2, 20);
        return {
          prompt: `What is ${powers([[a, 0]])} + ${b}?`,
          answer: count(b + 1),
          wrong: [count(b), count(v === "A" ? a + b : 1)],
        };
      }
      const a = r.pick("a", PRIMES);
      const b = r.pick(
        "b",
        PRIMES.filter((p) => p !== a),
      );
      const { m, n } = r.exclude(
        () => ({ m: r.int("m", 1, 5), n: r.int("n", 2, 5) }),
        ({ m, n }) => (m === 2 && n === 2) || (v === "A" && m === 1),
      );
      return {
        prompt: `Simplify (${both(a, m, b, 1)})^${n}.`,
        answer: product(a, m * n, b, n),
        wrong:
          v === "A"
            ? [product(a, m * n, b, 1), product(a, m * n, b, m * n)]
            : [product(a, m, b, n), product(a, m + n, b, n)],
      };
    },
  },
  {
    skill: "Negative exponents",
    make(r) {
      const form = r.pick("form", ["N", "R"]);
      const v = r.pick("v", ["A", "B"]);
      if (form === "N") {
        const { a, n } = r.exclude(
          () => ({ n: r.int("n", 2, 4), a: r.int("a", 2, 10) }),
          ({ a, n }) => raise(a, n) > 1000 || (a === 2 && n === 2),
        );
        const top = raise(a, n);
        return {
          prompt: `What is ${powers([[a, -n]])}?`,
          answer: exact(q(1, top)),
          wrong: [exact(q(v === "A" ? -top : top)), exact(q(1, a * n))],
        };
      }
      const { a, n, b } = r.exclude(
        () => {
          const n = r.int("n", 2, 4);
          const a = r.int("a", 2, 10);
          return { n, a, b: r.pick("b", coprimes(a)) };
        },
        ({ a, n, b }) => raise(a, n) > 1000 || (v === "B" && b === 1),
      );
      const flipped = q(a, b).pow(n);
      return {
        prompt: `What is (${b}/${a})^${int(-n)}?`,
        answer: exact(flipped),
        wrong: [
          exact(flipped.inv()),
          exact(v === "A" ? flipped.neg() : q(raise(a, n), b)),
        ],
      };
    },
  },
  {
    skill: "Estimate irrational roots",
    make(r) {
      let s = r.sign("s");
      const n = r.resample(
        () => r.int("n", 6, 200),
        (n) => isqrt(n) * isqrt(n) !== n,
      );
      const k = isqrt(n);
      const h = Math.floor(n / 2);
      if (k + s === h) s = -s;
      const pair = (x: number) => label(`${x} and ${x + 1}`);
      return {
        prompt: `√${n} lies between which two consecutive whole numbers?`,
        answer: pair(k),
        wrong: [pair(k + s), pair(h)],
      };
    },
  },
  {
    skill: "Simplify radicals",
    make(r) {
      const [k, m] = r.pick("km", RADICAL_PAIRS);
      return {
        prompt: `Simplify √${k * k * m}.`,
        answer: radical(k, m),
        wrong: [radical(m, k), radical(k * k, m)],
      };
    },
  },
  {
    skill: "Fractional exponents",
    make(r) {
      const form = r.pick("form", ["U", "P", "G"]);
      if (form === "U") {
        let s = r.sign("s");
        const index = r.pick("q", [2, 3, 4]);
        const root = index === 4 ? r.int("r", 2, 5) : r.int("r", 3, 10);
        const n = raise(root, index);
        const split = Math.floor(n / index);
        if (root + s === split) s = -s;
        return {
          prompt: `What is ${int(n, true)}^(1/${index})?`,
          answer: count(root),
          wrong: [count(split), count(root + s)],
        };
      }
      const v = r.pick("v", ["A", "B"]);
      if (form === "P") {
        const [index, p] = r.pick("qp", [
          [2, 3],
          [3, 2],
        ]);
        const root = r.int("r", 2, 6);
        const n = raise(root, index);
        const slip =
          v === "A" && !(root === 2 && p === 2) ? root * p : raise(n, p);
        return {
          prompt: `What is ${int(n, true)}^(${p}/${index})?`,
          answer: count(raise(root, p)),
          wrong: [count(root), count(slip)],
        };
      }
      const [index, p] = r.pick("qp", [
        [2, 1],
        [3, 1],
        [4, 1],
        [2, 3],
        [3, 2],
      ]);
      const root = p === 1 && index <= 3 ? r.int("r", 2, 10) : r.int("r", 2, 5);
      const n = raise(root, index);
      const answer = q(1, raise(root, p));
      return {
        prompt: `What is ${int(n, true)}^(${MINUS}${p}/${index})?`,
        answer: exact(answer),
        wrong: [
          exact(answer.neg()),
          exact(v === "A" ? answer.inv() : q(1, raise(n, p))),
        ],
      };
    },
  },
];

import {
  type Level,
  NAMES,
  divisors,
  gcd,
  isPrime,
  lcm,
  num,
  powers,
  range,
  whole,
} from "./kit.ts";

export const name = "Factors, Multiples, and Prime Numbers";

const cm = (n: number) => num(n, `${n} cm`);

const PRIMES = range(11, 97).filter(isPrime);
const ODD = [9, 21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 99];
const GCF = [
  6, 8, 10, 12, 14, 15, 16, 18, 20, 21, 22, 24, 26, 27, 28, 30, 32, 33,
];
const COLOURS = ["red", "blue", "green", "yellow", "orange", "purple"];
const CORDS = ["ribbon", "rope", "string", "cord", "tape"];
const LAST: Record<number, readonly number[]> = {
  3: [0, 3, 6, 9],
  4: [0, 4, 8],
  6: [0, 6],
  8: [0, 8],
  9: [0, 9],
};

type Factor = readonly [prime: number, exponent: number];

const tau = (n: number) => divisors(n).length;
const lpf = (n: number) => divisors(n)[1];
const digits = (n: number) => [...String(n)].map(Number);
const digitsum = (n: number) => digits(n).reduce((sum, d) => sum + d, 0);
const last = (n: number) => n % 10;
const usable = (n: number) =>
  divisors(n).filter((d) => d >= 3 && (n / d) % 2 === 1 && n / d >= 3);
function factorize(n: number) {
  const out: Factor[] = [];
  let rest = n;
  for (let p = 2; rest > 1; p++) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e++;
    }
    if (e) out.push([p, e]);
  }
  return out;
}
function product(list: readonly Factor[]) {
  let out = 1;
  for (const [p, e] of list) for (let i = 0; i < e; i++) out *= p;
  return out;
}
const factored = (list: readonly Factor[]) => num(product(list), powers(list));
const PARTIAL: Record<number, (x: number) => boolean> = {
  3: (x) => {
    const sum = digitsum(x);
    return sum % 3 !== 0 && digits(x).some((d) => d >= 1 && d % 3 === sum % 3);
  },
  4: (x) => x % 4 === 2,
  6: (x) => x % 3 === 0 && x % 2 === 1,
  8: (x) => x % 8 === 4,
  9: (x) => digitsum(x) % 3 === 0 && x % 9 !== 0,
};

export const levels: Level[] = [
  {
    skill: "Recognize a multiple",
    make(r) {
      const n = r.int("n", 3, 12);
      const m = r.int("m", 2, 12);
      const s1 = r.sign("s1");
      const s2 = r.sign("s2");
      const c = m * n;
      return {
        prompt: `Which is a multiple of ${n}?`,
        answer: whole(c),
        wrong: [whole(c + s1), whole(c + 2 * s2)],
      };
    },
  },
  {
    skill: "Recognize a factor",
    make(r) {
      const N = r.resample(
        () => r.int("N", 12, 100),
        (N) => !isPrime(N) && usable(N).length > 0,
      );
      const sides = (f: number) =>
        [-1, 1].filter((s) => f + s >= 2 && N % (f + s) !== 0);
      const f = r.resample(
        () => r.pick("f", usable(N)),
        (f) => sides(f).length > 0,
      );
      const s = r.pick("s", sides(f));
      return {
        prompt: `Which is a factor of ${N}?`,
        answer: whole(f),
        wrong: [whole(f + s), whole(2 * f)],
      };
    },
  },
  {
    skill: "Count factors",
    make(r) {
      const N = r.resample(
        () => r.int("N", 6, 60),
        (N) => !isPrime(N),
      );
      const s = r.sign("s");
      const t = tau(N);
      return {
        prompt: `How many factors does ${N} have?`,
        answer: whole(t),
        wrong: [whole(t - 2), whole(t + s)],
      };
    },
  },
  {
    skill: "Prime vs composite",
    make(r) {
      const p = r.pick("p", PRIMES);
      const one = r.weighted("one", [
        [true, 1],
        [false, 3],
      ]);
      const c1 = r.pick("c1", ODD);
      const c2 = one
        ? 1
        : r.pick(
            "c2",
            ODD.filter((c) => c !== c1),
          );
      return {
        prompt: "Which is prime?",
        answer: whole(p),
        wrong: [whole(c1), whole(c2)],
      };
    },
  },
  {
    skill: "Divisibility rules",
    make(r) {
      const k = r.pick("k", [3, 4, 6, 8, 9]);
      const L = r.pick("L", [4, 5]);
      const [lo, hi] = L === 4 ? [1000, 9999] : [10000, 99999];
      const ends = LAST[k];
      const c = r.resample(
        () => r.int("c", lo, hi),
        (x) => x % k === 0,
      );
      const d1 = r.resample(
        () => r.int("d1", lo, hi),
        (x) => PARTIAL[k](x) && !ends.includes(last(x)),
      );
      const d2 = r.resample(
        () => r.int("d2", lo, hi),
        (x) =>
          ends.includes(last(x)) &&
          x % k !== 0 &&
          (k !== 9 || digitsum(x) % 3 !== 0) &&
          (k !== 8 || x % 4 !== 0),
      );
      return {
        prompt: `Which is divisible by ${k}?`,
        answer: whole(c),
        wrong: [whole(d1), whole(d2)],
      };
    },
  },
  {
    skill: "Least common multiple",
    make(r) {
      const { a, b } = r.exclude(
        () => ({ a: r.int("a", 2, 12), b: r.int("b", 2, 12) }),
        ({ a, b }) => a >= b || b % a === 0,
      );
      const s = r.sign("s");
      const L = lcm(a, b);
      return {
        prompt: `What is the smallest number that is a multiple of both ${a} and ${b}?`,
        answer: whole(L),
        wrong: [whole(gcd(a, b) === 1 ? 2 * L : a * b), whole(L + s * b)],
      };
    },
  },
  {
    skill: "Greatest common factor",
    make(r) {
      const g = r.pick("g", GCF);
      const { u, v } = r.exclude(
        () => ({ u: r.int("u", 2, 16), v: r.int("v", 2, 16) }),
        ({ u, v }) =>
          u >= v ||
          gcd(u, v) !== 1 ||
          g * u < 12 ||
          g * v > 100 ||
          g * u * v > 600,
      );
      const s = r.sign("s");
      const a = g * u;
      const p = lpf(g);
      return {
        prompt: `What is the greatest common factor of ${a} and ${g * v}?`,
        answer: whole(g),
        wrong: s < 0 ? [whole(g / p), whole(p)] : [whole(a), whole(g * u * v)],
      };
    },
  },
  {
    skill: "Prime factorization",
    make(r) {
      const N = r.resample(
        () => r.int("N", 24, 360),
        (N) => {
          const counts = factorize(N).map(([, n]) => n);
          return counts.length >= 2 && new Set(counts).size >= 2;
        },
      );
      const list = factorize(N);
      const e = list.map(([, n]) => n);
      const size = list.length;
      const { i, j } = r.exclude(
        () => ({ i: r.int("i", 1, size), j: r.int("j", 1, size) }),
        ({ i, j }) => i >= j || e[i - 1] === e[j - 1],
      );
      const { t, s } = r.exclude(
        () => ({ t: r.int("t", 1, size), s: r.sign("s") }),
        ({ t, s }) => e[t - 1] + s < 1,
      );
      const swapped = e.map((n, k) =>
        k === i - 1 ? e[j - 1] : k === j - 1 ? e[i - 1] : n,
      );
      const shifted = e.map((n, k) => (k === t - 1 ? n + s : n));
      const written = (counts: readonly number[]) =>
        factored(list.map(([p], k): Factor => [p, counts[k]]));
      return {
        prompt: `What is the prime factorization of ${N}?`,
        answer: written(e),
        wrong: [written(swapped), written(shifted)],
      };
    },
  },
  {
    skill: "LCM / GCF word problems",
    make(r) {
      const form = r.pick("form", ["A", "B"]);
      const { a, b } = r.exclude(
        () => ({ a: r.int("a", 4, 30), b: r.int("b", 4, 30) }),
        ({ a, b }) => {
          const g = gcd(a, b);
          return (
            a >= b ||
            g === 1 ||
            a / g < 2 ||
            b / g < 2 ||
            (form === "A" && lcm(a, b) > 180)
          );
        },
      );
      const g = gcd(a, b);
      const L = lcm(a, b);
      const p = lpf(g);
      if (form === "A") {
        const s = r.sign("s");
        const c1 = r.pick("c1", COLOURS);
        const c2 = r.pick(
          "c2",
          COLOURS.filter((c) => c !== c1),
        );
        return {
          prompt: `The ${c1} bus comes every ${a} minutes and the ${c2} bus every ${b} minutes. Both are at the stop now. In how many minutes will they both be at the stop again?`,
          answer: whole(L),
          wrong: [whole(g), whole(L + s * a)],
        };
      }
      const s = isPrime(g) || g === p * p ? 1 : r.sign("s");
      const P = r.pick("P", NAMES);
      const cord = r.pick("cord", CORDS);
      return {
        prompt: `${P} has a ${cord} ${a} cm long and another ${b} cm long, and cuts both into equal pieces, as long as possible, with none left over. How long is each piece?`,
        answer: cm(g),
        wrong: s > 0 ? [cm(L), cm(a)] : [cm(g / p), cm(p)],
      };
    },
  },
  {
    skill: "GCF × LCM relationship",
    make(r) {
      const s = r.sign("s");
      const { g, u, v } = r.exclude(
        () => ({
          g: r.int("g", 2, 20),
          u: r.int("u", 2, 20),
          v: r.int("v", 2, 20),
        }),
        ({ g, u, v }) =>
          gcd(u, v) !== 1 ||
          u === v ||
          (s > 0 ? u <= g : u >= g) ||
          g * u > 100 ||
          g * v > 100 ||
          g * u * v > 1200,
      );
      const a = g * u;
      const l = g * u * v;
      return {
        prompt: `Two numbers have a greatest common factor of ${g} and a least common multiple of ${l}. One of the numbers is ${a}. What is the other?`,
        answer: whole((g * l) / a),
        wrong:
          v === g
            ? [whole(g * l), whole(a / g)]
            : [whole(l / a), whole(l / g)],
      };
    },
  },
];

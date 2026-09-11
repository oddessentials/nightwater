import {
  type Draft,
  type Level,
  MINUS,
  Rat,
  choice,
  choose,
  distinctValues,
  divisors,
  expr,
  frac,
  int,
  label,
  loneShape,
  loneSign,
  nonzero,
  num,
  printedNumbers,
  q,
  range,
  sub,
  sup,
  terms,
} from "./kit.ts";

export const name = "Precalculus: Advanced Functions, Sequences, and Series";

const PLACES = ["theatre", "stadium", "concert hall", "lecture hall"];
const RATIOS: readonly (readonly [number, number])[] = [
  [1, 2],
  [-1, 2],
  [1, 3],
  [-1, 3],
  [1, 4],
  [-1, 4],
  [2, 3],
  [-2, 3],
  [3, 4],
  [-3, 4],
  [2, 5],
  [-2, 5],
  [3, 5],
  [-3, 5],
];
const ALTERNATING: readonly (readonly [number, number])[] = [
  [-2, 1],
  [-3, 1],
  [-3, 2],
];
const STEADY: readonly (readonly [number, number])[] = [
  [1, 1],
  [-1, 1],
  [3, 2],
  [2, 1],
];
const TERM = `a${sub("n")}`;
const PREVIOUS = `a${sub("n−1")}`;
const EARLIER = `a${sub("n−2")}`;

const exact = (v: Rat) => num(v, frac(v, true));
const wholes = (values: readonly number[]) => values.map((v) => q(v));
const listed = (values: readonly number[]) =>
  `${values.map((v) => int(v, true)).join(", ")}, …`;
const numeric = (
  prompt: string,
  [answer, one, two]: readonly Rat[],
): Draft => ({
  prompt,
  answer: exact(answer),
  wrong: [exact(one), exact(two)],
});
function offer<T>(pair: string, slips: Record<string, T>): [T, T] {
  const names = pair.match(/O[mp]|[A-Z]/g);
  if (names?.length !== 2 || !names.every((slip) => slip in slips))
    throw new RangeError(`unknown pair ${pair}`);
  return [slips[names[0]], slips[names[1]]];
}
const offered = <T>(shape: string, slips: { a: T; b: T; ab: T }): [T, T] =>
  shape === "T1"
    ? [slips.a, slips.b]
    : shape === "T2"
      ? [slips.b, slips.ab]
      : [slips.a, slips.ab];

const printedSize = (printed: Set<number>, v: Rat) =>
  v.isInt() && printed.has(Math.abs(v.n));
function lonePrinted(prompt: string, values: readonly Rat[]) {
  const printed = printedNumbers(prompt);
  const flags = values.map((v) => printedSize(printed, v));
  return flags.filter((flag) => flag === flags[0]).length === 1;
}
function tells(prompt: string, values: readonly Rat[], apart: boolean) {
  const printed = printedNumbers(prompt);
  const hit = (v: Rat) => printedSize(printed, v);
  if (values.some(hit)) return true;
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) {
      const [x, y] = [values[i], values[j]];
      if (apart && hit(x.sub(y))) return true;
      if (x.n && y.n && (hit(x.div(y)) || hit(y.div(x)))) return true;
    }
  return false;
}

function series(first: Rat, ratio: Rat) {
  const shown = [first, first.mul(ratio), first.mul(ratio).mul(ratio)];
  if (!shown.every((t) => t.isInt()))
    throw new RangeError(`series terms ${shown.join(", ")} are not whole`);
  const sign = (t: Rat) => (t.sign() < 0 ? MINUS : "+");
  const rest = shown
    .slice(1)
    .map((t) => `${sign(t)} ${int(Math.abs(t.n), true)}`)
    .join(" ");
  return `${int(first.n, true)} ${rest} ${sign(shown[2].mul(ratio))} …`;
}
const minus = (k: number) =>
  terms([
    [1, "x"],
    [-k, ""],
  ]);
const factor = (root: number) => expr(`(${minus(root)})`, (x) => x - root);
const asymptotes = (x: Rat, y: Rat) =>
  choice(
    `x = ${frac(x, true)} and y = ${frac(y, true)}`,
    `asymptotes:${x}|${y}`,
  );
const cubic = (b: number, c: number, d: number) =>
  terms([
    [1, "x³"],
    [b, "x²"],
    [c, "x"],
    [d, ""],
  ]);

export const levels: Level[] = [
  {
    skill: "Arithmetic sequence, nth term",
    make(r) {
      if (r.pick("form", ["N", "T"]) === "N") {
        const v = r.pick("v", ["up", "down"]);
        const { prompt, values } = r.exclude(
          () => {
            const a = r.pick("a", nonzero(20));
            const d = r.pick("d", nonzero(9));
            const n = r.int("n", 8, 30);
            return {
              a,
              d,
              prompt: `An arithmetic sequence has a₁ = ${int(a, true)} and d = ${int(d, true)}. What is a${sub(n)}?`,
              values: wholes([
                a + (n - 1) * d,
                v === "up" ? a + n * d : a + (n - 2) * d,
                d + (n - 1) * a,
              ]),
            };
          },
          ({ a, d, values }) =>
            a === d || !distinctValues(values) || loneSign(values),
        );
        return numeric(prompt, values);
      }
      const { prompt, values } = r.exclude(
        () => {
          const n = r.int("n", 4, 12);
          const t = r.pick("t", [-4, -3, -2, -1, 1, 2, 3, 4]);
          const s = r.pick("s", nonzero(5));
          const d = n * t;
          const a = (n - 1) * s;
          const y = a + (n - 1) * d;
          return {
            s,
            t,
            prompt: `An arithmetic sequence has a₁ = ${int(a, true)} and a${sub(n)} = ${int(y, true)}. What is the common difference d?`,
            values: [q(y - a, n - 1), q(y - a, n), q(y, n - 1)],
          };
        },
        ({ s, t, prompt, values }) => s === -t || lonePrinted(prompt, values),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Geometric sequence, nth term",
    make(r) {
      const form = r.pick("form", ["N", "P"]);
      const pair = r.weighted("pair", [
        ["MA", 2],
        ["MX", 1],
        ["AX", 1],
      ]);
      const { prompt, values } = r.exclude(
        () => {
          const ratio = r.pick("r", [-3, -2, 2, 3]);
          const a = r.int("a", -9, 9);
          const n = r.int("n", form === "N" ? 5 : 4, 12);
          const [t1, t2, t3] = [a, a * ratio, a * ratio * ratio];
          const answer = a * ratio ** (n - 1);
          const slips: Record<string, number> = {
            M: a * ratio * (n - 1),
            A: form === "N" ? t1 + (n - 1) * (t2 - t1) : a + (n - 1) * ratio,
            X: ratio * a ** (n - 1),
          };
          return {
            legal:
              Math.abs(a) > Math.abs(ratio) &&
              (n % 2 === 0 || (a > 0 && ratio > 0)),
            answer,
            slips,
            prompt:
              form === "N"
                ? `What is a${sub(n)} in the geometric sequence ${listed([t1, t2, t3])}?`
                : `A geometric sequence has a₁ = ${int(a, true)} and r = ${int(ratio, true)}. What is a${sub(n)}?`,
            values: wholes([answer, ...offer(pair, slips)]),
          };
        },
        ({ legal, answer, slips, prompt, values }) =>
          !legal ||
          Math.abs(answer) < 30 ||
          [answer, slips.M, slips.A, slips.X].some(
            (v) => Math.abs(v) > 1_000_000,
          ) ||
          !distinctValues(values) ||
          loneSign(values) ||
          tells(prompt, values, true),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Arithmetic series",
    make(r) {
      const form = r.pick("form", ["F", "R"]);
      const pair = r.pick("pair", ["LW", "WP", "LQ"]);
      const { prompt, values } = r.exclude(
        () => {
          const a =
            form === "F" ? r.pick("a", nonzero(30)) : r.int("a", 10, 30);
          const d = r.pick("d", form === "F" ? [-8, -6, -4, 4, 6, 8] : [4, 6]);
          const n = r.int("n", 8, 30);
          const sum = (k: number) => (k * (2 * a + (k - 1) * d)) / 2;
          const last = a + (n - 1) * d;
          const slips = {
            L: (n * (2 * a + n * d)) / 2,
            W: ((n - 1) * (a + last)) / 2,
            P: sum(n - 1),
            Q: sum(n + 1),
          };
          return {
            prompt:
              form === "F"
                ? `What is the sum of the first ${n} terms of ${listed([a, a + d, a + 2 * d])}?`
                : `A ${r.pick("place", PLACES)} has ${a} seats in the front row and ${d} more seats in each row behind it. How many seats are in the first ${n} rows?`,
            values: wholes([(n * (a + last)) / 2, ...offer(pair, slips)]),
          };
        },
        ({ values }) => !distinctValues(values) || loneSign(values),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Geometric series, finite and infinite",
    make(r) {
      const form = r.weighted("form", [
        ["F", 1],
        ["I", 2],
        ["C", 1],
      ]);
      if (form === "F") {
        const pair = r.pick("pair", ["WP", "WQ"]);
        const { prompt, values } = r.exclude(
          () => {
            const ratio = r.pick("r", [2, 3]);
            const a = r.pick("a", nonzero(12));
            const n = r.int("n", 4, 9);
            const sum = (k: number) => q(a * (ratio ** k - 1), ratio - 1);
            const slips = {
              W: q(n * (a + a * ratio ** (n - 1)), 2),
              P: sum(n - 1),
              Q: sum(n + 1),
            };
            return {
              legal: ratio === 3 || n % 2 === 0 || a % 2 === 0,
              prompt: `What is the sum of the first ${n} terms of ${listed([a, a * ratio, a * ratio ** 2])}?`,
              values: [sum(n), ...offer(pair, slips)],
            };
          },
          ({ legal, values }) =>
            !legal ||
            values.some((v) => v.abs().cmp(1_000_000) > 0) ||
            !distinctValues(values) ||
            loneSign(values),
        );
        return numeric(prompt, values);
      }
      if (form === "I") {
        const pair = r.weighted("pair", [
          ["JG", 1],
          ["JR", 1],
          ["HG", 1],
          ["HR", 1],
          ["GX", 2],
        ]);
        const { prompt, values } = r.exclude(
          () => {
            const ratio = q(...r.pick("r", RATIOS));
            const first = q(r.pick("c", nonzero(10)) * ratio.d * ratio.d);
            const answer = first.div(q(1).sub(ratio));
            const flipped = first.div(q(1).add(ratio));
            const slips = {
              H: answer.sub(first),
              J: answer.add(first),
              G: flipped,
              R: first.add(first.mul(ratio)).add(first.mul(ratio).mul(ratio)),
              X: flipped.add(first),
            };
            return {
              prompt: `${series(first, ratio)} = ?`,
              values: [answer, ...offer(pair, slips)],
            };
          },
          ({ values }) =>
            !distinctValues(values) || loneSign(values) || loneShape(values),
        );
        return numeric(prompt, values);
      }
      const shrinking = r.pick("r", RATIOS);
      const alternating = r.pick("r1", ALTERNATING);
      const steady = r.pick("r2", STEADY);
      const bottom = shrinking[1];
      const c = r.pick(
        "c",
        range(1, 40).filter(
          (c) => c * bottom * bottom >= 20 && c * bottom * bottom <= 60,
        ),
      );
      const target = c * bottom * bottom;
      const scaled = (drawn: string, [top, under]: readonly number[]) => {
        const ratio = q(top, under);
        const largest = (k: number) =>
          Math.max(
            ...[0, 1, 2].map((i) =>
              q(k * under * under)
                .mul(ratio.pow(i))
                .abs()
                .toNumber(),
            ),
          );
        const gap = (k: number) => Math.abs(largest(k) - target);
        const best = Math.min(...range(1, 40).map(gap));
        const k = r.pick(
          drawn,
          range(1, 40).filter((k) => gap(k) === best),
        );
        return q(k * under * under);
      };
      const slipFirst = scaled("c1", alternating);
      const steadyFirst = scaled("c2", steady);
      const [s0, s1, s2] = [r.sign("s0"), r.sign("s1"), r.sign("s2")];
      return {
        prompt: "Which infinite series has a finite sum?",
        answer: label(series(q(s0 * target), q(...shrinking))),
        wrong: [
          label(series(slipFirst.mul(s1), q(...alternating))),
          label(series(steadyFirst.mul(s2), q(...steady))),
        ],
      };
    },
  },
  {
    skill: "Sigma notation",
    make(r) {
      const body = r.pick("body", ["linear", "square"]);
      const v = r.pick("v", ["E", "X"]);
      const { prompt, values } = r.exclude(
        () => {
          const L = r.int("L", 0, 1);
          const n = r.int("n", 4, 8);
          const p = body === "linear" ? r.pick("p", nonzero(5)) : 1;
          const constant = r.pick("q", nonzero(9));
          const U = L + n - 1;
          const f = (k: number) =>
            (body === "linear" ? p * k : k * k) + constant;
          const total = range(L, U).reduce((sum, k) => sum + f(k), 0);
          const rule = terms([
            [p, body === "linear" ? "k" : "k²"],
            [constant, ""],
          ]);
          return {
            prompt: `What is Σ (${rule}) for k = ${L} to ${U}?`,
            values: wholes([
              total,
              total - (n - 1) * constant,
              v === "E" ? total - f(U) : total + f(U + 1),
            ]),
          };
        },
        ({ values }) => !distinctValues(values) || loneSign(values),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Recursive sequences",
    make(r) {
      if (r.pick("form", ["A", "F"]) === "A") {
        const pair = r.pick("pair", ["OmG", "OpP", "OmP", "OpG"]);
        const { prompt, values } = r.exclude(
          () => {
            const s = r.pick("s", nonzero(9));
            const c = r.pick("c", nonzero(9));
            const m = r.pick("m", [2, 3]);
            const N = r.int("N", 4, 6);
            const run = (step: (last: number) => number, count: number) => {
              const seq = [s];
              while (seq.length < count) seq.push(step(seq[seq.length - 1]));
              return seq;
            };
            const seq = run((last) => m * last + c, N + 1);
            const slips = {
              Om: seq[N - 2],
              Op: seq[N],
              P: run((last) => m * (last + c), N)[N - 1],
              G: s * m ** (N - 1),
            };
            const rule = terms([
              [m, PREVIOUS],
              [c, ""],
            ]);
            return {
              prompt: `a₁ = ${int(s, true)} and ${TERM} = ${rule}. What is a${sub(N)}?`,
              values: wholes([seq[N - 1], ...offer(pair, slips)]),
            };
          },
          ({ values }) => !distinctValues(values) || loneSign(values),
        );
        return numeric(prompt, values);
      }
      const pair = r.pick("pair", ["OmR", "OpW", "OmW", "OpR"]);
      const { prompt, values } = r.exclude(
        () => {
          const u = r.pick("u", nonzero(9));
          const v = r.pick("v", nonzero(9));
          const j = r.pick("j", [1, 2]);
          const N = r.int("N", 5, 8);
          const seq = [u, v];
          while (seq.length < N + 1)
            seq.push(seq[seq.length - 1] + j * seq[seq.length - 2]);
          const slips = {
            Om: seq[N - 2],
            Op: seq[N],
            W: v * (1 + j) ** (N - 2),
            R: v + (N - 2) * j * u,
          };
          const rule = terms([
            [1, PREVIOUS],
            [j, EARLIER],
          ]);
          return {
            prompt: `a₁ = ${int(u, true)}, a₂ = ${int(v, true)} and ${TERM} = ${rule}. What is a${sub(N)}?`,
            values: wholes([seq[N - 1], ...offer(pair, slips)]),
          };
        },
        ({ values }) => !distinctValues(values) || loneSign(values),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Rational functions: asymptotes",
    make(r) {
      const form = r.pick("form", ["LL", "LQ"]);
      const v = r.pick("v", ["V", "H"]);
      const shape = v === "V" ? r.pick("T", ["T1", "T2", "T3"]) : "";
      const { prompt, h, y, slot } = r.exclude(
        () => {
          const h = r.pick("h", nonzero(9));
          const a = r.pick("a", nonzero(6));
          const z = r.pick(
            "z",
            nonzero(9).filter((z) => Math.abs(z) !== Math.abs(h)),
          );
          const c = form === "LL" ? r.pick("c", [1, 2, 3]) : 1;
          const b = -a * z;
          const top = terms([
            [a, "x"],
            [b, ""],
          ]);
          const bottom = terms([
            [c, "x"],
            [-c * h, ""],
          ]);
          const y = form === "LL" ? q(a, c) : q(0);
          return {
            prompt: `What are the asymptotes of f(x) = (${top})/(${bottom})${form === "LQ" ? "²" : ""}?`,
            h,
            y,
            slot:
              v === "V"
                ? [q(h), ...offered(shape, { a: q(-h), b: q(z), ab: q(-z) })]
                : form === "LL"
                  ? [y, q(b, -c * h), q(0)]
                  : [y, q(a), q(b, h * h)],
          };
        },
        ({ prompt, slot }) =>
          !distinctValues(slot) ||
          loneShape(slot) ||
          lonePrinted(prompt, slot) ||
          (v === "H" && loneSign(slot)),
      );
      const [answer, one, two] =
        v === "V"
          ? slot.map((x) => asymptotes(x, y))
          : slot.map((k) => asymptotes(q(h), k));
      return { prompt, answer, wrong: [one, two] };
    },
  },
  {
    skill: "Remainder and factor theorems",
    make(r) {
      if (r.pick("form", ["F", "R"]) === "F") {
        const shape = r.pick("T", ["T1", "T2", "T3"]);
        const { prompt, root, X } = r.exclude(
          () => {
            const none = { prompt: "", root: 0, X: 0 };
            const roots = [
              r.pick("r1", nonzero(6)),
              r.pick("r2", nonzero(6)),
              r.pick("r3", nonzero(6)),
            ];
            const [r1, r2, r3] = roots;
            const [b, c, d] = [
              -(r1 + r2 + r3),
              r1 * r2 + r1 * r3 + r2 * r3,
              -r1 * r2 * r3,
            ];
            if ([b, c, d].some((k) => Math.abs(k) > 60)) return none;
            const unpaired = [...new Set(roots)].filter(
              (k) => !roots.includes(-k),
            );
            if (!unpaired.length) return none;
            const root = r.pick("r", unpaired);
            const unchecked = divisors(Math.abs(d)).filter(
              (k) =>
                !roots.includes(k) &&
                !roots.includes(-k) &&
                k !== Math.abs(root),
            );
            if (!unchecked.length) return none;
            return {
              prompt: `Which is a factor of ${cubic(b, c, d)}?`,
              root,
              X: r.pick("X", unchecked),
            };
          },
          ({ prompt, root, X }) =>
            !prompt ||
            lonePrinted(prompt, [
              q(root),
              ...offered(shape, { a: q(-root), b: q(X), ab: q(-X) }),
            ]),
        );
        return {
          prompt,
          answer: factor(root),
          wrong: offered(shape, {
            a: factor(-root),
            b: factor(X),
            ab: factor(-X),
          }),
        };
      }
      const { prompt, values } = r.exclude(
        () => {
          const b = r.int("b", -9, 9);
          const c = r.int("c", -9, 9);
          const d = r.pick("d", nonzero(9));
          const k = r.pick("k", nonzero(4));
          const P = (x: number) => x ** 3 + b * x * x + c * x + d;
          return {
            prompt: `What is the remainder when ${cubic(b, c, d)} is divided by ${minus(k)}?`,
            values: wholes([P(k), P(-k), c + b * k + k * k]),
          };
        },
        ({ values }) => !distinctValues(values) || loneSign(values),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Average rate of change and the difference quotient",
    make(r) {
      const form = r.pick("form", ["A", "D"]);
      const { prompt, values } = r.exclude(
        () => {
          const a = r.pick("a", nonzero(4));
          const b = r.int("b", -9, 9);
          const p = r.pick("p", nonzero(5));
          const gap = r.int("delta", 2, 6);
          const c = r.pick(
            "c",
            range(-12, 12).filter((c) => c % gap === 0),
          );
          const end = p + gap;
          if (end === 0) return { prompt: "", values: [] };
          const f = (x: number) => a * x * x + b * x + c;
          const rule = terms([
            [a, "x²"],
            [b, "x"],
            [c, ""],
          ]);
          return {
            prompt:
              form === "A"
                ? `What is the average rate of change of f(x) = ${rule} from x = ${int(p)} to x = ${int(end)}?`
                : `For f(x) = ${rule}, what is (f(${int(p)} + h) − f(${int(p)}))/h when h = ${gap}?`,
            values: [
              q(f(end) - f(p), gap),
              q(f(gap), gap),
              q(f(end) - f(p), end),
            ],
          };
        },
        ({ prompt, values }) =>
          !prompt ||
          values.some((v) => !v.isInt()) ||
          !distinctValues(values) ||
          loneSign(values) ||
          tells(prompt, values, true),
      );
      return numeric(prompt, values);
    },
  },
  {
    skill: "Binomial theorem",
    make(r) {
      const form = r.pick("form", ["V1", "V2"]);
      const pair = r.pick(
        "pair",
        form === "V1" ? ["PW", "PK", "WK"] : ["AW", "PW", "AK"],
      );
      const { prompt, values } = r.exclude(
        () => {
          const n = r.int("n", 3, 7);
          const k = r.int("k", 1, n - 1);
          const a = form === "V1" ? 1 : r.pick("a", [2, 3]);
          const b = r.pick(
            "b",
            form === "V1" ? [-4, -3, -2, 2, 3, 4] : nonzero(4),
          );
          const C = choose(n, k);
          const slips = {
            P: C,
            W: C * a ** (n - k) * b ** k,
            A: C * b ** (n - k),
            K: choose(n, k + 1) * a ** k * b ** (n - k),
          };
          const binomial = terms([
            [a, "x"],
            [b, ""],
          ]);
          return {
            prompt: `What is the coefficient of ${k === 1 ? "x" : `x${sup(k)}`} in (${binomial})${sup(n)}?`,
            values: wholes([C * a ** k * b ** (n - k), ...offer(pair, slips)]),
          };
        },
        ({ prompt, values }) =>
          !distinctValues(values) ||
          loneSign(values) ||
          values.some((v) => v.abs().cmp(99_999) > 0) ||
          tells(prompt, values, false),
      );
      return numeric(prompt, values);
    },
  },
];

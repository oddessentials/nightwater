import {
  type Choice,
  type Level,
  MINUS,
  Rat,
  distinctValues,
  expr,
  frac,
  gcd,
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

export const name = "Calculus: Limits, Derivatives, and Integrals";

const SHAPES = ["a,b", "b,ab", "a,ab"];
const offered = <T>(shape: string, slips: { a: T; b: T; ab: T }): [T, T] =>
  shape === "a,b"
    ? [slips.a, slips.b]
    : shape === "b,ab"
      ? [slips.b, slips.ab]
      : [slips.a, slips.ab];

function pw(power: Rat | number) {
  const p = Rat.of(power);
  if (!p.n) return "";
  if (p.eq(1)) return "x";
  return p.isInt() ? `x${sup(p.n)}` : `x^(${frac(p)})`;
}
type Mono = { c: Rat; p: Rat };
const mono = (c: Rat | number, p: Rat | number): Mono => ({
  c: Rat.of(c),
  p: Rat.of(p),
});
function printMonos(list: readonly Mono[]) {
  return terms(
    list.map(({ c, p }) => {
      if (!c.isInt()) throw new RangeError(`coefficient ${c} is not whole`);
      return [c.n, pw(p)] as const;
    }),
  );
}
const polyChoice = (list: readonly Mono[], tail = "") =>
  expr(
    printMonos(list) + tail,
    (x) => list.reduce((sum, { c, p }) => sum + c.toNumber() * x ** p.toNumber(), 0),
    tail,
  );
const exact = (v: Rat) => num(v, frac(v, true));
const sized = (prompt: string, values: readonly Rat[], scripts = true) => {
  const printed = printedNumbers(prompt, scripts);
  return values.some((v) => v.isInt() && printed.has(Math.abs(v.n)));
};
function related(prompt: string, values: readonly Rat[]) {
  const printed = printedNumbers(prompt);
  const hit = (v: Rat) => v.isInt() && printed.has(v.n);
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) {
      if (hit(values[i].sub(values[j]).abs())) return true;
      if (values[i].n && values[j].n)
        if (
          hit(values[i].div(values[j]).abs()) ||
          hit(values[j].div(values[i]).abs())
        )
          return true;
    }
  return false;
}
const quadratic = (a: number, b: number, c: number) =>
  terms([
    [a, "x²"],
    [b, "x"],
    [c, ""],
  ]);
const inner = (c: number, power: number) =>
  `(x² ${c < 0 ? MINUS : "+"} ${Math.abs(c)})${power > 1 ? sup(power) : ""}`;

export const levels: Level[] = [
  {
    skill: "Limits by substitution",
    make(r) {
      const pair = r.pick("pair", ["SA", "AM"]);
      const { prompt, values } = r.exclude(
        () => {
          const a = r.pick("a", [-3, -2, 2, 3]);
          const b = r.pick("b", nonzero(9));
          const k = r.pick("k", [...range(-60, -20), ...range(20, 60)]);
          const c = r.int("c", -4, -1);
          const slips: Record<string, number> = {
            S: -a * c * c + b * c + k,
            A: a * c * c - b * c + k,
            M: Math.sign(a) * (a * c) ** 2 + b * c + k,
          };
          return {
            prompt: `What is lim x→${int(c)} (${quadratic(a, b, k)})?`,
            values: [a * c * c + b * c + k, slips[pair[0]], slips[pair[1]]].map(
              (v) => q(v),
            ),
          };
        },
        ({ prompt, values }) =>
          !distinctValues(values) || loneSign(values) || sized(prompt, values),
      );
      return {
        prompt,
        answer: exact(values[0]),
        wrong: [exact(values[1]), exact(values[2])],
      };
    },
  },
  {
    skill: "0/0 limits by factoring",
    make(r) {
      const pair = r.pick("pair", ["BV", "BN", "VN"]);
      const { prompt, values } = r.exclude(
        () => {
          const a = r.pick("a", [-2, -1, 1, 2]);
          const c = r.pick("c", nonzero(6));
          const t = r.pick("t", nonzero(6));
          const s = r.pick("s", nonzero(9));
          if (c === s || c === t || s === t || c + t === 0)
            return { prompt: "", values: [] };
          const top = quadratic(a, -a * (c + s), a * c * s);
          const bottom = quadratic(1, -(c + t), c * t);
          const slips: Record<string, Rat> = {
            B: q(a * (c + s), c + t),
            V: q(a * (c - s), c + t),
            N: q(a * (c + s), c - t),
          };
          return {
            prompt: `What is lim x→${int(c)} (${top})/(${bottom})?`,
            values: [q(a * (c - s), c - t), slips[pair[0]], slips[pair[1]]],
          };
        },
        ({ prompt, values }) =>
          !values.length ||
          !distinctValues(values) ||
          loneSign(values) ||
          loneShape(values) ||
          sized(prompt, values) ||
          related(prompt, values),
      );
      return {
        prompt,
        answer: exact(values[0]),
        wrong: [exact(values[1]), exact(values[2])],
      };
    },
  },
  {
    skill: "Limits at infinity",
    make(r) {
      const kind = r.pick("case", ["E", "B", "T"]);
      const degrees =
        kind === "E"
          ? [
              [1, 1],
              [2, 2],
              [3, 3],
            ]
          : kind === "B"
            ? [
                [1, 2],
                [1, 3],
                [2, 3],
              ]
            : [
                [2, 1],
                [3, 1],
                [3, 2],
              ];
      const [m, n] = r.pick("deg", degrees);
      const a = r.pick("a", nonzero(9));
      const d = r.pick("d", nonzero(9));
      const e = r.pick("e", nonzero(9));
      const pe = r.int("pe", 0, m - 1);
      const f = r.pick("f", nonzero(9));
      const pf = r.int("pf", 0, n - 1);
      const side = (lead: [number, string], rest: [number, string], order: string) =>
        terms(order === "desc" ? [lead, rest] : [rest, lead]);
      const top = side([a, pw(m)], [e, pw(pe)], r.pick("topOrder", ["desc", "asc"]));
      const bottom = side(
        [d, pw(n)],
        [f, pw(pf)],
        r.pick("bottomOrder", ["desc", "asc"]),
      );
      const ratio = q(a, d);
      const zero = num(0, "0");
      const lead = exact(ratio);
      const infinity = label(ratio.sign() < 0 ? `${MINUS}∞` : "∞");
      const answer = kind === "E" ? lead : kind === "B" ? zero : infinity;
      const [d1, d2] = [zero, lead, infinity].filter((c) => c !== answer);
      return {
        prompt: `What is lim x→∞ (${top})/(${bottom})?`,
        answer,
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Power rule",
    make(r) {
      if (r.pick("form", ["D", "V"]) === "D") {
        const v = r.pick("v", ["coef", "exp"]);
        const m = r.int("m", 3, 5);
        const a = r.pick("a", nonzero(6));
        const [top, bottom] = r.pick("n", [
          [-1, 1],
          [-2, 1],
          [-3, 1],
          [1, 2],
          [3, 2],
          [-1, 2],
        ]);
        const n = q(top, bottom);
        const b = r.pick(
          "b",
          nonzero(9).filter((b) => bottom === 1 || b % 2 === 0),
        );
        const k = r.pick("k", nonzero(9));
        const two = (c1: number, p1: number, c2: Rat, p2: Rat) =>
          polyChoice([mono(c1, p1), mono(c2, p2)]);
        const lowered = n.sub(1);
        return {
          prompt: `What is the derivative of f(x) = ${printMonos([mono(a, m), mono(b, n), mono(k, 0)])}?`,
          answer: two(a * m, m - 1, n.mul(b), lowered),
          wrong:
            v === "coef"
              ? [
                  two(a, m - 1, q(b), lowered),
                  two(a * (m - 1), m - 1, lowered.mul(b), lowered),
                ]
              : [
                  two(a * m, m, n.mul(b), n),
                  two(a * m, m + 1, n.mul(b), n.add(1)),
                ],
        };
      }
      const pair = r.pick("pair", ["FL", "FP", "FE"]);
      const { prompt, values } = r.exclude(
        () => {
          const m = r.int("m", 2, 4);
          const a = r.pick("a", nonzero(5));
          const b = r.pick("b", nonzero(9));
          const k = r.pick("k", nonzero(9));
          const c = r.int("c", 1, 3);
          const slips: Record<string, number> = {
            F: a * c ** m + b * c + k,
            L: a * m * c ** (m - 1) + b * c,
            P: a * (m - 1) * c ** (m - 1) + b,
            E: a * m * c ** m + b,
          };
          return {
            prompt: `f(x) = ${terms([
              [a, pw(m)],
              [b, "x"],
              [k, ""],
            ])}. What is f′(${c})?`,
            values: [a * m * c ** (m - 1) + b, slips[pair[0]], slips[pair[1]]].map(
              (v) => q(v),
            ),
          };
        },
        ({ prompt, values }) =>
          !distinctValues(values) || loneSign(values) || sized(prompt, values),
      );
      return {
        prompt,
        answer: exact(values[0]),
        wrong: [exact(values[1]), exact(values[2])],
      };
    },
  },
  {
    skill: "Product and quotient rules",
    make(r) {
      const form = r.pick("form", ["P", "Q"]);
      const shape = r.pick("shape", SHAPES);
      if (form === "P") {
        const a = r.pick("a", nonzero(9));
        const m = r.int("m", 2, 5);
        const g = r.pick("g", ["sin x", "cos x", "eˣ", "ln x"]);
        const attach = (p: number) =>
          g === "eˣ" ? `${pw(p)}eˣ` : `${pw(p)} ${g}`;
        const gv = (x: number) =>
          g === "sin x"
            ? Math.sin(x)
            : g === "cos x"
              ? Math.cos(x)
              : g === "eˣ"
                ? Math.exp(x)
                : Math.log(x);
        const second =
          g === "sin x"
            ? { c: a, body: `${pw(m)} cos x`, v: (x: number) => x ** m * Math.cos(x) }
            : g === "cos x"
              ? { c: -a, body: `${pw(m)} sin x`, v: (x: number) => x ** m * Math.sin(x) }
              : g === "eˣ"
                ? { c: a, body: `${pw(m)}eˣ`, v: (x: number) => x ** m * Math.exp(x) }
                : { c: a, body: pw(m - 1), v: (x: number) => x ** (m - 1) };
        const build = (flip: boolean, keep: boolean) => {
          const p = keep ? m : m - 1;
          const c2 = flip ? -second.c : second.c;
          return expr(
            terms([
              [a * m, attach(p)],
              [c2, second.body],
            ]),
            (x) => a * m * x ** p * gv(x) + c2 * second.v(x),
          );
        };
        const [d1, d2] = offered(shape, {
          a: build(true, false),
          b: build(false, true),
          ab: build(true, true),
        });
        return {
          prompt: `What is the derivative of f(x) = ${terms([[a, attach(m)]])}?`,
          answer: build(false, false),
          wrong: [d1, d2],
        };
      }
      const { a, b, c, d } = r.exclude(
        () => ({
          a: r.pick("a", nonzero(5)),
          b: r.pick("b", nonzero(9)),
          d: r.pick("d", nonzero(9)),
          c: r.int("c", 1, 5),
        }),
        ({ a, b, c, d }) => gcd(c, Math.abs(d)) !== 1 || a * d === b * c,
      );
      const p = a * d - b * c;
      const den = terms([
        [c, "x"],
        [d, ""],
      ]);
      const build = (flip: boolean, flat: boolean) => {
        const top = flip ? -p : p;
        return expr(
          `${int(top)}/(${den})${flat ? "" : "²"}`,
          (x) => top / (c * x + d) ** (flat ? 1 : 2),
        );
      };
      const [d1, d2] = offered(shape, {
        a: build(true, false),
        b: build(false, true),
        ab: build(true, true),
      });
      return {
        prompt: `What is the derivative of f(x) = (${terms([
          [a, "x"],
          [b, ""],
        ])})/(${den})?`,
        answer: build(false, false),
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Chain rule",
    make(r) {
      const form = r.pick("form", ["T", "E", "L", "P"]);
      const shape = r.pick("shape", SHAPES);
      let given: string;
      let build: (a: boolean, b: boolean) => Choice;
      if (form === "T") {
        const trig = r.pick("trig", ["sin", "cos"]);
        const a = r.pick("a", nonzero(5));
        const k = r.int("k", 2, 9);
        const outer = trig === "sin" ? "cos" : "sin";
        const f = outer === "cos" ? Math.cos : Math.sin;
        const base = trig === "sin" ? a * k : -a * k;
        given = terms([[a, `${trig}(${k}x)`]]);
        build = (A, B) => {
          const c = A ? -base : base;
          return expr(
            terms([[c, `${B ? "x " : ""}${outer}(${k}x)`]]),
            (x) => c * (B ? x : 1) * f(k * x),
          );
        };
      } else if (form === "E") {
        const a = r.pick("a", nonzero(5));
        const k = r.pick(
          "k",
          nonzero(9).filter((k) => Math.abs(k) >= 2),
        );
        given = terms([[a, `e^(${terms([[k, "x"]])})`]]);
        build = (A, B) =>
          expr(
            terms([
              [
                a * k,
                `${A ? "x" : ""}e^(${terms([
                  [k, "x"],
                  [B ? -1 : 0, ""],
                ])})`,
              ],
            ]),
            (x) => a * k * (A ? x : 1) * Math.exp(k * x - (B ? 1 : 0)),
          );
      } else if (form === "L") {
        const a = r.pick("a", nonzero(5));
        const m = r.int("m", 2, 4);
        const c = r.int("c", 1, 9);
        const den = `(x${sup(m)} + ${c})`;
        given = terms([[a, `ln${den}`]]);
        build = (A, B) =>
          expr(
            `${A ? int(a) : terms([[a * m, pw(m - 1)]])}/${den}${B ? "²" : ""}`,
            (x) => (A ? a : a * m * x ** (m - 1)) / (x ** m + c) ** (B ? 2 : 1),
          );
      } else {
        const a = r.pick("a", nonzero(4));
        const c = r.pick("c", nonzero(9));
        const n = r.int("n", 3, 6);
        given = terms([[a, inner(c, n)]]);
        build = (A, B) => {
          const coef = A ? a * n : 2 * a * n;
          const power = B ? n : n - 1;
          return expr(
            terms([[coef, `${A ? "" : "x"}${inner(c, power)}`]]),
            (x) => coef * (A ? 1 : x) * (x * x + c) ** power,
          );
        };
      }
      const [d1, d2] = offered(shape, {
        a: build(true, false),
        b: build(false, true),
        ab: build(true, true),
      });
      return {
        prompt: `What is the derivative of f(x) = ${given}?`,
        answer: build(false, false),
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Tangent lines",
    make(r) {
      const cat = r.pick("cat", ["I", "S"]);
      const pair = r.weighted(
        "pair",
        cat === "I"
          ? [
              ["SO", 1],
              ["DO", 3],
            ]
          : [
              ["FL", 2],
              ["FP", 1],
            ],
      );
      type Line = [number, number];
      const { prompt, lines } = r.exclude(
        () => {
          const a = r.pick("a", [-3, -2, -1, 1, 2, 3]);
          const b = r.int("b", -9, 9);
          const c = r.int("c", -9, 9);
          const p = r.pick("p", nonzero(4));
          const f = (x: number) => a * x * x + b * x + c;
          const m = 2 * a * p + b;
          const y0 = f(p);
          const through = (slope: number): Line => [slope, y0 - slope * p];
          const slips: Record<string, Line> = {
            S: [m, y0 + m * p],
            D: [m, p - m * y0],
            O: [m, y0],
            F: through(f(p)),
            L: through(2 * a * p + b * p),
            P: through(a * p + b),
          };
          return {
            prompt: `What is the tangent line to y = ${quadratic(a, b, c)} at x = ${int(p)}?`,
            lines: [through(m), slips[pair[0]], slips[pair[1]]],
          };
        },
        ({ prompt, lines }) => {
          if (new Set(lines.map((l) => l.join())).size < 3) return true;
          if (lines.some((l) => l.some((v) => v === 0 || Math.abs(v) > 99)))
            return true;
          const printed = printedNumbers(prompt);
          const majority = [0, 1].map((slot) =>
            lines.filter((l) => l[slot] < 0).length >= 2 ? -1 : 1,
          );
          for (const slot of [0, 1]) {
            const values = lines.map((l) => l[slot]);
            if (loneSign(values)) return true;
            for (let i = 0; i < 3; i++)
              for (let j = i + 1; j < 3; j++)
                if (printed.has(Math.abs(values[i] - values[j]))) return true;
          }
          const fits = (l: Line) =>
            Math.sign(l[0]) === majority[0] && Math.sign(l[1]) === majority[1];
          return fits(lines[0]) && !fits(lines[1]) && !fits(lines[2]);
        },
      );
      const line = ([m, k]: Line) =>
        label(
          `y = ${terms([
            [m, "x"],
            [k, ""],
          ])}`,
        );
      return {
        prompt,
        answer: line(lines[0]),
        wrong: [line(lines[1]), line(lines[2])],
      };
    },
  },
  {
    skill: "Critical points and extrema",
    make(r) {
      const form = r.pick("form", ["X", "I"]);
      const ask = r.pick("ask", form === "X" ? ["min", "max"] : ["inc", "dec"]);
      const shape = r.pick("shape", SHAPES);
      const answerSign = form === "X" ? r.sign("answerSign") : 0;
      const aSign = form === "X" ? r.sign("aSign") : 0;
      const top = (a: number, lo: number, hi: number) =>
        (ask === "max") === (a > 0) ? [lo, hi] : [hi, lo];
      const found = r.exclude(
        () => {
          const a =
            form === "X"
              ? r.pick("a", aSign > 0 ? [1, 2] : [-1, -2])
              : r.pick("a", [-2, -1, 1, 2]);
          const u = r.pick("r", nonzero(6));
          const v = r.pick("s", nonzero(6));
          const k = r.int("k", -9, 9);
          const [lo, hi] = u < v ? [u, v] : [v, u];
          const legal = u !== v && lo !== -hi && (a * (lo + hi)) % 2 === 0;
          const poly = legal
            ? terms([
                [a, "x³"],
                [(-3 * a * (lo + hi)) / 2, "x²"],
                [3 * a * lo * hi, "x"],
                [k, ""],
              ])
            : "";
          return { a, lo, hi, poly, legal };
        },
        ({ a, lo, hi, poly, legal }) => {
          if (!legal) return true;
          if (form === "I") return false;
          const [point, other] = top(a, lo, hi);
          if (Math.sign(point) !== answerSign) return true;
          const printed = printedNumbers(poly, false);
          return [
            point,
            ...offered(shape, { a: -point, b: other, ab: -other }),
          ].some((v) => printed.has(Math.abs(v)));
        },
      );
      const { a, lo, hi, poly } = found;
      if (form === "X") {
        const [point, other] = top(a, lo, hi);
        const at = (v: number) => num(v, `x = ${int(v)}`);
        const [d1, d2] = offered(shape, {
          a: at(-point),
          b: at(other),
          ab: at(-other),
        });
        return {
          prompt: `Where does f(x) = ${poly} have a local ${ask === "min" ? "minimum" : "maximum"}?`,
          answer: at(point),
          wrong: [d1, d2],
        };
      }
      const band = (l: number, h: number) =>
        label(`${int(l)} < x < ${int(h)}`);
      const union = (l: number, h: number) =>
        label(`x < ${int(l)} or x > ${int(h)}`);
      const [same, other] =
        (ask === "inc") === (a > 0) ? [union, band] : [band, union];
      const [d1, d2] = offered(shape, {
        a: same(-hi, -lo),
        b: other(lo, hi),
        ab: other(-hi, -lo),
      });
      return {
        prompt: `Where is f(x) = ${poly} ${ask === "inc" ? "increasing" : "decreasing"}?`,
        answer: same(lo, hi),
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Indefinite integrals",
    make(r) {
      const form = r.pick("form", ["P", "F"]);
      const shape = r.pick("shape", SHAPES);
      if (form === "P") {
        const m = r.int("m", 2, 5);
        const n = r.int("n", 1, m - 1);
        const a = r.pick(
          "a",
          [-3, -2, -1, 1, 2, 3].map((u) => u * (m + 1)),
        );
        const b = r.pick(
          "b",
          [-3, -2, -1, 1, 2, 3].map((u) => u * (n + 1)),
        );
        const k = r.pick("k", nonzero(9));
        const build = (withC: boolean, undivided: boolean) =>
          polyChoice(
            [
              mono(undivided ? a : a / (m + 1), m + 1),
              mono(undivided ? b : b / (n + 1), n + 1),
              mono(k, 1),
            ],
            withC ? " + C" : "",
          );
        const [d1, d2] = offered(shape, {
          a: build(false, false),
          b: build(true, true),
          ab: build(false, true),
        });
        return {
          prompt: `What is ∫ (${printMonos([mono(a, m), mono(b, n), mono(k, 0)])}) dx?`,
          answer: build(true, false),
          wrong: [d1, d2],
        };
      }
      const trig = r.pick("trig", ["sin", "cos"]);
      const other = r.pick("other", ["exp", "recip"]);
      const a = r.pick("a", nonzero(9));
      const b = r.pick("b", nonzero(9));
      const size = Math.abs(b);
      const integrand =
        terms([[a, `${trig} x`]]) +
        (b < 0 ? ` ${MINUS} ` : " + ") +
        (other === "exp" ? `${size === 1 ? "" : size}eˣ` : `${size}/x`);
      const build = (withC: boolean, flipped: boolean) => {
        const coef = (trig === "sin" ? -a : a) * (flipped ? -1 : 1);
        const tail = withC ? " + C" : "";
        return expr(
          terms([
            [coef, trig === "sin" ? "cos x" : "sin x"],
            [b, other === "exp" ? "eˣ" : "ln|x|"],
          ]) + tail,
          (x) =>
            coef * (trig === "sin" ? Math.cos(x) : Math.sin(x)) +
            b * (other === "exp" ? Math.exp(x) : Math.log(Math.abs(x))),
          tail,
        );
      };
      const [d1, d2] = offered(shape, {
        a: build(false, false),
        b: build(true, true),
        ab: build(false, true),
      });
      return {
        prompt: `What is ∫ (${integrand}) dx?`,
        answer: build(true, false),
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Definite integrals (FTC)",
    make(r) {
      const form = r.pick("form", ["D", "U", "A"]);
      const cubic = (a: number, b: number, c: number) => (x: number) =>
        q(a * x ** 3, 3)
          .add(q(b * x * x, 2))
          .add(c * x);
      if (form === "A") {
        const pair = r.pick("pair", ["VG", "VK", "WG"]);
        const { prompt, values } = r.exclude(
          () => {
            const a = r.int("a", 1, 3);
            const b = r.int("b", -6, 6);
            const c = r.int("c", 1, 9);
            const p = r.int("p", 0, 3);
            const end = r.int("q", p + 2, p + 3);
            const f = (x: number) => a * x * x + b * x + c;
            const F = cubic(a, b, c);
            const answer = F(end).sub(F(p));
            const inside = -b > 2 * a * p && -b < 2 * a * end;
            const positive = inside
              ? 4 * a * c - b * b > 0
              : f(p) > 0 && f(end) > 0;
            const slips: Record<string, Rat> = {
              V: q(f(end) - f(p)),
              G: F(end).add(F(p)),
              K: answer.sub(c * (end - p)),
              W: q(
                a * end ** 3 + b * end * end + c * end - (a * p ** 3 + b * p * p + c * p),
              ),
            };
            return {
              prompt: positive
                ? `What is the area under y = ${quadratic(a, b, c)} from x = ${p} to x = ${end}?`
                : "",
              values: [answer, slips[pair[0]], slips[pair[1]]],
            };
          },
          ({ prompt, values }) =>
            !prompt ||
            !distinctValues(values) ||
            values.some((v) => v.abs().cmp(999) > 0) ||
            sized(prompt, values) ||
            loneSign(values) ||
            loneShape(values),
        );
        return {
          prompt,
          answer: exact(values[0]),
          wrong: [exact(values[1]), exact(values[2])],
        };
      }
      const shape = r.pick("shape", SHAPES);
      const X = r.pick("X", form === "D" ? ["F", "K"] : ["B", "W"]);
      const answerSign = r.sign("answerSign");
      const leadSign = r.sign(form === "D" ? "aSign" : "kSign");
      const { prompt, answer, slip } = r.exclude(
        () => {
          if (form === "D") {
            const a = r.pick(
              "a",
              [1, 2, 3].map((u) => u * leadSign),
            );
            const b = r.int("b", -6, 6);
            const c = r.int("c", -9, 9);
            const p = r.int("p", -3, 3);
            const end = r.int("q", p + 1, p + 3);
            const F = cubic(a, b, c);
            const answer = F(end).sub(F(p));
            const legal = X === "F" ? p !== 0 : end - p >= 2 && c !== 0;
            const slip = X === "F" ? F(end) : answer.sub(c * (end - p));
            return {
              prompt: legal
                ? `What is ∫${sub(p)}${sup(end)} (${quadratic(a, b, c)}) dx?`
                : "",
              answer,
              slip,
            };
          }
          const k = r.pick(
            "k",
            [1, 2, 3].map((u) => u * leadSign),
          );
          const c = r.pick("c", nonzero(4));
          const n = r.int("n", 1, 3);
          const p = r.int("p", 0, 1);
          const end = r.int("q", p + 1, p + 2);
          const U = (u: number) => q(k * u ** (n + 1), n + 1);
          const answer = U(end * end + c).sub(U(p * p + c));
          const slip = X === "B" ? U(end).sub(U(p)) : answer.mul(n + 1);
          return {
            prompt: `What is ∫${sub(p)}${sup(end)} ${terms([[2 * k, `x${inner(c, n)}`]])} dx?`,
            answer,
            slip,
          };
        },
        ({ prompt, answer, slip }) => {
          if (!prompt || answer.sign() !== answerSign) return true;
          const values = [
            answer,
            ...offered(shape, { a: answer.neg(), b: slip, ab: slip.neg() }),
          ];
          return (
            !distinctValues(values) ||
            values.some((v) => v.abs().cmp(999) > 0) ||
            sized(prompt, values) ||
            slip.isInt() !== answer.isInt()
          );
        },
      );
      const [d1, d2] = offered(shape, {
        a: answer.neg(),
        b: slip,
        ab: slip.neg(),
      });
      return { prompt, answer: exact(answer), wrong: [exact(d1), exact(d2)] };
    },
  },
];

import {
  type Level,
  Rat,
  coprimes,
  dec,
  distinctValues,
  frac,
  gcd,
  lcm,
  money,
  num,
  over,
  pct,
  q,
  range,
} from "./kit.ts";

export const name = "Decimals and Percentages";

const TAGGED = ["jacket", "kettle", "backpack", "lamp", "helmet"];
const PRICED = ["ticket", "sofa", "printer", "bike", "camera"];
const PLACES = ["whole number", "tenth", "hundredth"];
const FORMS: [number, number, "+" | "−"][] = [
  [1, 2, "+"],
  [1, 2, "−"],
  [2, 1, "+"],
  [2, 1, "−"],
  [0, 2, "−"],
];
const STEPS = [5, 10, 15, 20, 25, 30, 40, 50];
const ONE_IN_FOUR: [boolean, number][] = [
  [true, 1],
  [false, 3],
];

const decimal = (v: Rat) => num(v, dec(v));
const percent = (v: Rat) => num(v.div(100), pct(v));
const cash = (v: Rat) => num(v, money(v));
const reduced = (v: Rat) => num(v, frac(v));
const tenTo = (e: number) => q(10).pow(e);
function places(x: Rat) {
  let k = 0;
  while (!x.mul(10 ** k).isInt()) k++;
  return k;
}
const digits = (x: Rat) => x.mul(10 ** places(x)).n;
const afterPoint = (x: Rat) => digits(x.sub(x.floor()));
const build = (w: number, after: readonly number[]) =>
  after.reduce((v, digit, i) => v.add(q(digit, 10 ** (i + 1))), q(w));
const nearest = (x: Rat, unit: Rat) =>
  unit.mul(x.div(unit).add(q(1, 2)).floor());
const multiples = (step: number, lo: number, hi: number) =>
  range(lo, hi).filter((n) => n % step === 0);

export const levels: Level[] = [
  {
    skill: "Decimal place value",
    make(r) {
      const k = r.int("k", 1, 3);
      const p = r.int("p", 1, k);
      const d = r.int("d", 2, 9);
      const w = r.pick(
        "w",
        range(1, 9).filter((w) => w !== d),
      );
      const after = range(1, k).map((i) =>
        i === p
          ? d
          : r.pick(
              `c${i}`,
              range(i === k ? 1 : 0, 9).filter((c) => c !== d),
            ),
      );
      const s = p === 1 ? 1 : r.sign("s");
      return {
        prompt: `In ${dec(build(w, after))}, what is the value of the digit ${d}?`,
        answer: decimal(tenTo(-p).mul(d)),
        wrong: [decimal(q(d)), decimal(tenTo(-p - s).mul(d))],
      };
    },
  },
  {
    skill: "Compare decimals",
    make(r) {
      const prompt = "Which is largest?";
      const mode = r.pick("mode", ["S", "M", "L"]);
      const w = r.int("w", 0, 8);
      const t = r.int("t", mode === "S" ? 3 : 2, 8);
      const x = decimal(build(w, [t]));
      if (mode === "S") {
        const y = decimal(build(w, [r.int("b", 1, t - 1), 9]));
        const z = decimal(
          build(w, [
            r.int("c1", 1, t - 1),
            r.int("c2", 0, 8),
            r.int("c3", 1, 8),
          ]),
        );
        return { prompt, answer: x, wrong: [z, y] };
      }
      if (mode === "M") {
        const y = decimal(build(w, [t, r.int("h", 1, 9)]));
        const z = decimal(
          build(w, [
            r.int("c1", 1, t - 1),
            r.int("c2", 0, 9),
            r.int("c3", 1, 9),
          ]),
        );
        return { prompt, answer: y, wrong: [z, x] };
      }
      const y = decimal(build(w, [r.int("b", 1, t - 1), 9]));
      const z = decimal(build(w, [t, r.int("g2", 0, 8), r.int("g3", 1, 8)]));
      return { prompt, answer: z, wrong: [x, y] };
    },
  },
  {
    skill: "Fraction ↔ decimal",
    make(r) {
      if (r.pick("form", ["A", "B"]) === "A") {
        const d = r.pick("d", [2, 4, 5, 8, 20, 25, 100]);
        const n = r.pick(
          "n",
          coprimes(d).filter((n) => n <= 9),
        );
        const x = q(n, d);
        return {
          prompt: `Write ${over(n, d)} as a decimal.`,
          answer: decimal(x),
          wrong: [decimal(q(n, 10)), decimal(x.div(10))],
        };
      }
      const { d, n } = r.exclude(
        () => {
          const d = r.pick("d", [2, 4, 5, 8, 10, 20, 25, 100]);
          return { d, n: r.pick("n", coprimes(d)) };
        },
        ({ d, n }) => digits(q(n, d)) < 2,
      );
      const x = q(n, d);
      return {
        prompt: `Write ${dec(x)} as a fraction in lowest terms.`,
        answer: reduced(x),
        wrong: [reduced(x.div(10)), reduced(q(1, digits(x)))],
      };
    },
  },
  {
    skill: "Add / subtract decimals",
    make(r) {
      const [kx, ky, op] = r.pick("form", FORMS);
      const plus = op === "+";
      const combine = (a: Rat, b: Rat) => (plus ? a.add(b) : a.sub(b));
      const spread = (a: Rat, b: Rat) =>
        plus
          ? afterPoint(a) + afterPoint(b)
          : Math.abs(afterPoint(a) - afterPoint(b));
      const operand = (k: number, name: string) => {
        const whole = r.int(`${name}w`, 1, 9);
        if (k === 0) return q(whole);
        if (k === 1) return q(10 * whole + r.int(`${name}1`, 1, 9), 10);
        return q(
          100 * whole + 10 * r.int(`${name}1`, 0, 9) + r.int(`${name}2`, 1, 9),
          100,
        );
      };
      const { x, y } = r.exclude(
        () => ({ x: operand(kx, "x"), y: operand(ky, "y") }),
        ({ x, y }) =>
          spread(x, y) >= 100 ||
          (!plus && (x.floor() <= y.floor() || x.sub(y).cmp(q(1, 10)) < 0)),
      );
      const answer = combine(x, y);
      const kmin = Math.min(kx, ky);
      const chop = (v: Rat) => q(v.mul(10 ** kmin).floor(), 10 ** kmin);
      const slip = combine(chop(x), chop(y));
      const lined = q(
        Math.abs(plus ? digits(x) + digits(y) : digits(x) - digits(y)),
        100,
      );
      const d1 = lined.eq(answer) ? slip : lined;
      const split = q(
        plus ? x.floor() + y.floor() : x.floor() - y.floor(),
      ).add(q(spread(x, y), 100));
      const d2 = split.eq(answer) || split.eq(d1) ? slip : split;
      return {
        prompt: `What is ${dec(x)} ${op} ${dec(y)}?`,
        answer: decimal(answer),
        wrong: [decimal(d1), decimal(d2)],
      };
    },
  },
  {
    skill: "Multiply and divide decimals",
    make(r) {
      const form = r.pick("form", ["P", "W", "D"]);
      if (form === "P") {
        const m = r.pick("m", [10, 100]);
        const op = r.pick("op", ["×", "÷"]);
        const s = r.sign("s");
        const x =
          op === "×"
            ? q(
                r.pick(
                  "hundredths",
                  range(1, 10000 / m).filter((k) => k % 100 !== 0),
                ),
                100,
              )
            : m === 10
              ? q(
                  r.pick(
                    "tenths",
                    range(11, 999).filter((k) => k % 10 !== 0),
                  ),
                  10,
                )
              : q(
                  r.pick(
                    "x",
                    range(1, 99).filter((k) => k % 10 !== 0),
                  ),
                );
        const e = (op === "×" ? 1 : -1) * (m === 10 ? 1 : 2);
        const slip = m === 10 ? e + Math.sign(e) : e + s;
        return {
          prompt: `What is ${dec(x)} ${op} ${m}?`,
          answer: decimal(x.mul(tenTo(e))),
          wrong: [decimal(x.mul(tenTo(-e))), decimal(x.mul(tenTo(slip)))],
        };
      }
      if (form === "W") {
        const { x, n } = r.exclude(
          () => ({
            x: q(
              r.pick(
                "hundredths",
                range(101, 999).filter((k) => k % 100 !== 0),
              ),
              100,
            ),
            n: r.int("n", 2, 9),
          }),
          ({ x, n }) =>
            x.mul(n).cmp(100) > 0 || afterPoint(x) * n < 10 ** places(x),
        );
        const answer = x.mul(n);
        const carry = q(afterPoint(x) * n, 10 ** places(x)).floor();
        return {
          prompt: `What is ${dec(x)} × ${n}?`,
          answer: decimal(answer),
          wrong: [decimal(answer.mul(10)), decimal(answer.sub(carry))],
        };
      }
      const { a, b } = r.exclude(
        () => ({ a: r.int("a", 2, 49), b: r.int("b", 2, 49) }),
        ({ a, b }) => a * b > 400 || (a * b) % 10 === 0,
      );
      const once = q(a * b, 10);
      const added = q(a + b, 10);
      return {
        prompt: `What is ${dec(q(a, 10))} × ${dec(q(b, 10))}?`,
        answer: decimal(q(a * b, 100)),
        wrong: [
          decimal(once),
          decimal(added.eq(once) ? q(a * b, 1000) : added),
        ],
      };
    },
  },
  {
    skill: "Round decimals",
    make(r) {
      const k = r.int("k", 2, 3);
      const place = r.pick("place", PLACES.slice(0, k));
      const e = PLACES.indexOf(place);
      const carry = e > 0 && r.weighted("carry", ONE_IN_FOUR);
      const bnd = e === k - 1 && r.weighted("bnd", ONE_IN_FOUR);
      const unit = tenTo(-e);
      const { n, values } = r.exclude(
        () => {
          const w = r.pick(
            "w",
            range(10, 99).filter((w) => e > 0 || (w % 10 >= 1 && w % 10 <= 8)),
          );
          const after = range(1, k).map((i) =>
            bnd && i === k
              ? 5
              : carry && i === e
                ? 9
                : r.int(`d${i}`, carry && i === e + 1 ? 5 : i === k ? 1 : 0, 9),
          );
          const n = build(w, after);
          const answer = nearest(n, unit);
          const down = unit.mul(n.div(unit).floor());
          const other = answer.eq(down) ? down.add(unit) : down;
          const coarse = unit.mul(10);
          const d2 = [answer, other].some((v) => v.div(coarse).isInt())
            ? nearest(n, coarse.mul(10))
            : nearest(n, coarse);
          return { n, values: [answer, other, d2] };
        },
        ({ values }) => !distinctValues(values),
      );
      const shown = (v: Rat) => num(v, dec(v, e));
      return {
        prompt: `Round ${dec(n)} to the nearest ${place}. (halfway rounds up)`,
        answer: shown(values[0]),
        wrong: [shown(values[1]), shown(values[2])],
      };
    },
  },
  {
    skill: "Percent ↔ decimal ↔ fraction",
    make(r) {
      const form = r.pick("form", ["A", "B", "C"]);
      if (form === "C") {
        const d = r.pick("d", [2, 4, 5, 8, 10, 20, 25]);
        const n = r.pick(
          "n",
          range(1, 2 * d).filter(
            (n) => gcd(n, d) === 1 && n !== d && 2 * n <= 3 * d,
          ),
        );
        return {
          prompt: `Write ${over(n, d)} as a percent.`,
          answer: percent(q(100 * n, d)),
          wrong: [percent(q(n)), percent(q(n, d))],
        };
      }
      const p = q(r.int("halves", 2, 300), 2);
      const s = r.sign("s");
      if (form === "A")
        return {
          prompt: `Write ${pct(p)} as a decimal.`,
          answer: decimal(p.div(100)),
          wrong: [decimal(p.div(10)), decimal(s < 0 ? p.div(1000) : p)],
        };
      return {
        prompt: `Write ${dec(p.div(100))} as a percent.`,
        answer: percent(p),
        wrong: [percent(p.div(10)), percent(s < 0 ? p.div(100) : p.mul(10))],
      };
    },
  },
  {
    skill: "Percent of a quantity",
    make(r) {
      if (r.pick("form", ["A", "B"]) === "A") {
        const p = r.pick("p", [5, 15, 20, 25, 30, 40, 75]);
        const step = lcm(10, 100 / gcd(p, 100));
        const n = r.pick("N", multiples(step, step, 400));
        const part = q(p * n, 100);
        return {
          prompt: `What is ${p}% of ${n}?`,
          answer: decimal(part),
          wrong: [decimal(q(n, 10)), decimal(q(n).sub(part))],
        };
      }
      const p = r.pick("p", [5, 10, 15, 20, 25, 30, 40, 50, 75]);
      const n = r.pick(
        "N",
        multiples(100 / gcd(p, 100), 20, 300).filter(
          (n) => n !== 100 && n > p && n * (100 - p) !== 100 * p,
        ),
      );
      const item = r.pick("item", TAGGED);
      const off = q(p * n, 100);
      const sale = q(n).sub(off);
      return {
        prompt: `A ${item} is marked ${money(n, 0)}. It is ${p}% off. What is the sale price?`,
        answer: cash(sale),
        wrong: [
          cash(off.eq(sale) ? q(n * (100 + p), 100) : off),
          cash(q(n - p)),
        ],
      };
    },
  },
  {
    skill: "Find the percent, find the whole",
    make(r) {
      if (r.pick("form", ["A", "B"]) === "A") {
        const { p, b } = r.exclude(
          () => {
            const p = r.pick(
              "pct",
              multiples(5, 5, 95).filter((p) => p !== 50),
            );
            return {
              p,
              b: r.pick(
                "b",
                multiples(100 / gcd(p, 100), 20, 300).filter((b) => b !== 100),
              ),
            };
          },
          ({ p, b }) => p * b === 100 * (100 - p),
        );
        const a = q(p * b, 100);
        return {
          prompt: `${dec(a)} is what percent of ${b}?`,
          answer: percent(q(p)),
          wrong: [percent(a), percent(q(100 - p))],
        };
      }
      const p = r.pick("p", [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
      const step = lcm(10, 100 / gcd(p, 100));
      const n = r.pick(
        "N",
        multiples(step, step, 500).filter((n) => p * n >= 200),
      );
      const s = r.sign("s");
      const a = q(p * n, 100);
      return {
        prompt: `${p}% of a number is ${dec(a)}. What is the number?`,
        answer: decimal(q(n)),
        wrong: [decimal(q(n).mul(tenTo(s))), decimal(q(n).sub(a))],
      };
    },
  },
  {
    skill: "Percent change and successive percents",
    make(r) {
      if (r.pick("form", ["A", "B"]) === "A") {
        const n = r.pick("N", multiples(20, 40, 300));
        const p = r.pick("p", STEPS);
        const t = r.pick("q", STEPS);
        const up = r.pick("dir", ["U", "D"]) === "U";
        const item = r.pick("item", PRICED);
        const first = up ? 100 + p : 100 - p;
        const second = up ? 100 - t : 100 + t;
        const change = up
          ? `goes up ${p}%, then ${t}% comes off`
          : `drops ${p}%, then ${t}% is added to`;
        return {
          prompt: `A ${item} costs ${money(n, 0)}. The price ${change} the new price. What is the final price?`,
          answer: cash(q(n * first * second, 10000)),
          wrong: [
            cash(q(n * (first + second - 100), 100)),
            cash(q(n * first, 100)),
          ],
        };
      }
      const { x, y } = r.exclude(
        () => ({ x: r.int("x", 8, 200), y: r.int("y", 8, 200) }),
        ({ x, y }) => {
          const d = Math.abs(y - x);
          return (
            x === y ||
            x === 100 ||
            y === 100 ||
            (100 * d) % x !== 0 ||
            100 * d < 10 * x ||
            100 * d > 150 * x ||
            100 * y === x * d
          );
        },
      );
      const d = Math.abs(y - x);
      const against = q(100 * d, y);
      return {
        prompt:
          y > x
            ? `${x} rises to ${y}. What is the percent increase?`
            : `${x} falls to ${y}. What is the percent decrease?`,
        answer: percent(q(100 * d, x)),
        wrong: [
          percent(against.isInt() ? against : q(100 * y, x)),
          percent(q(d)),
        ],
      };
    },
  },
];

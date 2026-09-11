import {
  type Choice,
  type Level,
  MINUS,
  Rat,
  choice,
  dec,
  frac,
  gcd,
  int,
  isSquarefree,
  label,
  loneSign,
  nonzero,
  num,
  q,
  range,
  simplifyRoot,
  surd,
  whole,
} from "./kit.ts";

export const name = "Coordinate Geometry and Graphing";

type Line = readonly [Rat, Rat];

const FRACTIONS = [2, 3, 4].flatMap((d) =>
  range(1, 5 * d - 1)
    .filter((n) => gcd(n, d) === 1)
    .flatMap((n) => [[n, d] as const, [-n, d] as const]),
);
const LEGS = range(1, 20).flatMap((u) =>
  range(1, 20)
    .filter((v) => v !== u)
    .map((v) => [u, v] as const),
);
const TRIPLES = LEGS.filter(([u, v]) => {
  const [m, k] = simplifyRoot(u * u + v * v);
  return k === 1 && m <= 20;
});
const ROOTS = LEGS.filter(([u, v]) => {
  const [m, k] = simplifyRoot(u * u + v * v);
  return m >= 2 && k >= 2 && m !== k && isSquarefree(m) && isSquarefree(k);
});
const SLOPES = [
  [2, 3],
  [2, 5],
  [3, 2],
  [3, 4],
  [4, 3],
  [5, 2],
] as const;
const RUNS = [...range(-5, -2), ...range(2, 5)];

const quad = (x: number, y: number) =>
  `Quadrant ${x > 0 ? (y > 0 ? "I" : "IV") : y > 0 ? "II" : "III"}`;
const at = (x: number, y: number) => `(${int(x)}, ${int(y)})`;
const point = (x: Rat | number, y: Rat | number) =>
  choice(`(${dec(x)}, ${dec(y)})`, `point:${Rat.of(x)},${Rat.of(y)}`);
const exact = (v: Rat) => num(v, frac(v));
function root(n: number) {
  const [m, k] = simplifyRoot(n);
  return choice(surd(m, k), `root:${n}`);
}
const distinct = (three: readonly Choice[]) =>
  new Set(three.map((c) => c.text)).size === 3 &&
  new Set(three.map((c) => c.key)).size === 3;
const lone = (three: readonly Choice[]) =>
  loneSign(three.map((c) => (c.text.includes(MINUS) ? -1 : 1)));
const low = (step: number) => Math.max(-10, -10 - step);
const high = (step: number) => Math.min(10, 10 - step);

function orbit(A: Rat, B: Rat, option: number): [Rat, Rat] {
  if (option === 1) return [B, B.neg()];
  return A.sign() === B.sign() ? [B, A.neg()] : [A.neg(), B.neg()];
}

const lead = (m: Rat) =>
  m.eq(-1) ? MINUS : m.isInt() ? int(m.n) : `(${frac(m)})`;
function plus(b: Rat) {
  if (!b.n) throw new RangeError("a line's constant is never 0");
  return `${b.sign() < 0 ? MINUS : "+"} ${frac(b.abs())}`;
}
const equation = (m: Rat, b: Rat) =>
  `y = ${m.eq(1) ? "" : lead(m)}x ${plus(b)}`;
const line = ([m, b]: Line) => choice(equation(m, b), `line:${m},${b}`);
const bracket = (m: Rat, b: Rat) =>
  choice(`y = ${lead(m)}(x ${plus(b)})`, `line:${m},${m.mul(b)}`);
function unfit(lines: readonly Line[]) {
  if (lines.length < 3 || lines.some(([, b]) => !b.n)) return true;
  const three = lines.map(line);
  return !distinct(three) || lone(three);
}

export const levels: Level[] = [
  {
    skill: "Quadrants and axes",
    make(r) {
      const form = r.weighted("form", [
        ["Q", 3],
        ["A", 1],
      ]);
      if (form === "Q") {
        const s = r.pick("s", ["hv", "hd", "vd"]);
        const x = r.pick("x", nonzero(10));
        const y = r.pick("y", nonzero(10));
        return {
          prompt: `Where does the point ${at(x, y)} lie?`,
          answer: label(quad(x, y)),
          wrong: [
            label(s === "vd" ? quad(x, -y) : quad(-x, y)),
            label(s === "hv" ? quad(x, -y) : quad(-x, -y)),
          ],
        };
      }
      const ax = r.pick("ax", ["x", "y"]);
      const x = ax === "x" ? r.pick("x", nonzero(10)) : 0;
      const y = ax === "y" ? r.pick("y", nonzero(10)) : 0;
      const axis = (name: string) => label(`on the ${name}-axis`);
      return {
        prompt: `Where does the point ${at(x, y)} lie?`,
        answer: axis(ax),
        wrong: [axis(ax === "x" ? "y" : "x"), label(quad(x || 1, y || 1))],
      };
    },
  },
  {
    skill: "Translate a point",
    make(r) {
      const w = r.pick("w", ["x", "y"]);
      const o = r.pick("o", ["across first", "up-down first"]);
      const { x, y, moves, three } = r.exclude(
        () => {
          const x = r.int("x", -10, 10);
          const y = r.int("y", -10, 10);
          const a = r.int("a", 1, 10);
          const b = r.int("b", 1, 10);
          const h = r.pick("h", ["right", "left"]);
          const v = r.pick("v", ["up", "down"]);
          const sh = h === "right" ? 1 : -1;
          const sv = v === "up" ? 1 : -1;
          return {
            x,
            y,
            a,
            b,
            moves: [`${a} ${h}`, `${b} ${v}`],
            three: [
              point(x + sh * a, y + sv * b),
              w === "x"
                ? point(x - sh * a, y + sv * b)
                : point(x + sh * a, y - sv * b),
              point(x + sv * b, y + sh * a),
            ],
          };
        },
        ({ a, b, three }) => a === b || !distinct(three) || lone(three),
      );
      if (o === "up-down first") moves.reverse();
      return {
        prompt: `Start at ${at(x, y)}. Move ${moves[0]} and ${moves[1]}. Where do you land?`,
        answer: three[0],
        wrong: [three[1], three[2]],
      };
    },
  },
  {
    skill: "Horizontal and vertical distance",
    make(r) {
      const ax = r.pick("ax", ["H", "V"]);
      const u = r.sign("u");
      const { ends, values } = r.exclude(
        () => {
          const p = r.pick("p", nonzero(10));
          const end = r.pick("q", nonzero(10));
          const shared = r.int("r", -10, 10);
          const gap = Math.abs(end - p);
          const sum = Math.abs(p + end);
          return {
            gap,
            ends: [p, end].map((v) =>
              ax === "H" ? at(v, shared) : at(shared, v),
            ),
            values: [gap, sum, gap + u === sum ? gap - u : gap + u],
          };
        },
        ({ gap, values }) =>
          gap < 2 || new Set(values).size < 3 || values.some((v) => v < 1),
      );
      return {
        prompt: `How far is it from ${ends[0]} to ${ends[1]}?`,
        answer: whole(values[0]),
        wrong: [whole(values[1]), whole(values[2])],
      };
    },
  },
  {
    skill: "Midpoint",
    make(r) {
      const { x1, y1, x2, y2, three } = r.exclude(
        () => {
          const x1 = r.pick("x1", nonzero(10));
          const y1 = r.pick("y1", nonzero(10));
          const x2 = r.int("x2", -10, 10);
          const y2 = r.int("y2", -10, 10);
          return {
            x1,
            y1,
            x2,
            y2,
            three: [
              point(q(x1 + x2, 2), q(y1 + y2, 2)),
              point(x1 + x2, y1 + y2),
              point(q(x2 - x1, 2), q(y2 - y1, 2)),
            ],
          };
        },
        ({ x1, y1, x2, y2, three }) =>
          x1 + x2 === 0 ||
          y1 + y2 === 0 ||
          (x1 === x2 && y1 === y2) ||
          !distinct(three) ||
          lone(three),
      );
      return {
        prompt: `What is the midpoint of ${at(x1, y1)} and ${at(x2, y2)}?`,
        answer: three[0],
        wrong: [three[1], three[2]],
      };
    },
  },
  {
    skill: "Slope from two points",
    make(r) {
      const option = r.pick("orbit", [1, 2]);
      const { top, bottom } = r.exclude(
        () => ({
          bottom: r.int("q", 2, 9),
          top: r.pick("p", [...range(-9, -2), ...range(2, 9)]),
        }),
        ({ top, bottom }) => gcd(top, bottom) !== 1,
      );
      const k = r.int(
        "k",
        1,
        Math.min(4, Math.floor(20 / bottom), Math.floor(20 / Math.abs(top))),
      );
      const d = r.sign("d");
      const dx = d * k * bottom;
      const dy = d * k * top;
      const x1 = r.int("x1", low(dx), high(dx));
      const y1 = r.int("y1", low(dy), high(dy));
      const m = q(top, bottom);
      const [d1, d2] = orbit(m, m.inv(), option);
      return {
        prompt: `What is the slope of the line through ${at(x1, y1)} and ${at(x1 + dx, y1 + dy)}?`,
        answer: exact(m),
        wrong: [exact(d1), exact(d2)],
      };
    },
  },
  {
    skill: "Read slope and y-intercept",
    make(r) {
      const form = r.pick("form", ["S", "I", "W"]);
      const kind = r.pick("kind", ["whole", "fraction"]);
      const option = form === "W" ? 0 : r.pick("orbit", [1, 2]);
      const value = (name: string) =>
        kind === "whole"
          ? q(r.pick(name, nonzero(5)))
          : q(...r.pick(name, FRACTIONS));
      const { m, b } = r.exclude(
        () => ({ m: value("m"), b: value("b") }),
        ({ m, b }) =>
          m.abs().eq(b.abs()) || (form === "W" && (m.eq(1) || b.eq(1))),
      );
      if (form === "W")
        return {
          prompt: `A line has slope ${frac(m)} and y-intercept ${frac(b)}. Which equation is it?`,
          answer: line([m, b]),
          wrong: [line([b, m]), bracket(m, b)],
        };
      const [A, B] = form === "S" ? [m, b] : [b, m];
      const [d1, d2] = orbit(A, B, option);
      return {
        prompt: `In ${equation(m, b)}, what is the ${form === "S" ? "slope" : "y-intercept"}?`,
        answer: exact(A),
        wrong: [exact(d1), exact(d2)],
      };
    },
  },
  {
    skill: "Point on a line?",
    make(r) {
      const { m, b, three } = r.exclude(
        () => {
          const m = r.pick("m", nonzero(5));
          const b = r.pick("b", nonzero(9));
          const t = [
            r.int("t1", -6, 6),
            r.int("t2", -6, 6),
            r.int("t3", -6, 6),
          ];
          const pts = [
            [t[0], m * t[0] + b],
            [t[1], m * t[1] - b],
            [t[2], b * t[2] + m],
          ];
          return { m, b, t, pts, three: pts.map(([x, y]) => point(x, y)) };
        },
        ({ m, b, t, pts, three }) =>
          m === b ||
          new Set(t).size < 3 ||
          t[2] === 1 ||
          !distinct(three) ||
          pts.filter(([x, y]) => y === m * x + b).length > 1 ||
          lone(three),
      );
      return {
        prompt: `Which point lies on ${equation(q(m), q(b))}?`,
        answer: three[0],
        wrong: [three[1], three[2]],
      };
    },
  },
  {
    skill: "Line through two points",
    make(r) {
      const option = r.pick("orbit", [1, 2]);
      const { ends, lines } = r.exclude(
        () => {
          const m = r.pick("m", nonzero(5));
          const dx = r.pick("dx", RUNS);
          const dy = m * dx;
          if (Math.abs(dy) > 20) return { ends: [], lines: [], hits: 0 };
          const x1 = r.pick(
            "x1",
            range(low(dx), high(dx)).filter((x) => x !== 0),
          );
          const y1 = r.int("y1", low(dy), high(dy));
          const x2 = x1 + dx;
          const y2 = y1 + dy;
          const lines = [q(m), ...orbit(q(m), q(dy), option)].map(
            (s): Line => [s, s.mul(-x1).add(y1)],
          );
          return {
            ends: [at(x1, y1), at(x2, y2)],
            lines,
            hits: lines.filter(([s, c]) => s.mul(x2).add(c).eq(y2)).length,
          };
        },
        ({ lines, hits }) => unfit(lines) || hits > 1,
      );
      const [answer, d1, d2] = lines.map(line);
      return {
        prompt: `Which equation describes the line through ${ends[0]} and ${ends[1]}?`,
        answer,
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Distance formula",
    make(r) {
      const form = r.pick("form", ["T", "R"]);
      const z = r.pick(
        "z",
        form === "T"
          ? ["sum,square", "sum,long", "long,diff"]
          : ["sum", "square", "long"],
      );
      const { ends, radicands } = r.exclude(
        () => {
          const [u, v] = r.pick("legs", form === "T" ? TRIPLES : ROOTS);
          const dx = r.sign("sx") * u;
          const dy = r.sign("sy") * v;
          const x1 = r.int("x1", low(dx), high(dx));
          const y1 = r.int("y1", low(dy), high(dy));
          const n = u * u + v * v;
          const [m, k] = simplifyRoot(n);
          const slips: Record<string, number> = {
            sum: (u + v) ** 2,
            square: n * n,
            long: Math.max(u, v) ** 2,
            diff: (u - v) ** 2,
          };
          return {
            ends: [at(x1, y1), at(x1 + dx, y1 + dy)],
            radicands: [
              n,
              ...(form === "T"
                ? z.split(",").map((slip) => slips[slip])
                : [k * k * m, slips[z]]),
            ],
          };
        },
        ({ radicands }) =>
          new Set(radicands).size < 3 || radicands.some((n) => n < 1),
      );
      const [answer, d1, d2] = radicands.map(root);
      return {
        prompt: `How far is it from ${ends[0]} to ${ends[1]}?`,
        answer,
        wrong: [d1, d2],
      };
    },
  },
  {
    skill: "Parallel and perpendicular lines",
    make(r) {
      const form = r.pick("form", ["par", "perp"]);
      const option = r.pick("orbit", [1, 2]);
      const { given, through, lines } = r.exclude(
        () => {
          const [size, den] = r.pick("ab", SLOPES);
          const m = q(r.sign("sa") * size, den);
          const p = r.sign("sp") * size * den;
          const y0 = r.int("q", -10, 10);
          const c = r.pick("c", nonzero(10));
          const A = form === "par" ? m : m.inv().neg();
          const B = form === "par" ? m.inv() : m.neg();
          return {
            given: equation(m, q(c)),
            through: at(p, y0),
            lines: [A, ...orbit(A, B, option)].map(
              (s): Line => [s, s.mul(-p).add(y0)],
            ),
          };
        },
        ({ lines }) => unfit(lines),
      );
      const [answer, d1, d2] = lines.map(line);
      return {
        prompt: `Which line is ${form === "par" ? "parallel" : "perpendicular"} to ${given} and passes through ${through}?`,
        answer,
        wrong: [d1, d2],
      };
    },
  },
];

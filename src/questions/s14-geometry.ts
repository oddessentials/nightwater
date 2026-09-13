import {
  type Choice,
  type Draft,
  type Level,
  choice,
  int,
  isSquarefree,
  isqrt,
  label,
  num,
  piMul,
  range,
  simplifyRoot,
  surd,
} from "./kit.ts";
import { type Corner, lshape, rightTriangle, transversal } from "./figures.ts";

export const name = "Geometry: Shapes, Angles, Perimeter, Area, and Volume";

const POLYGONS = [
  "triangle",
  "quadrilateral",
  "pentagon",
  "hexagon",
  "heptagon",
  "octagon",
  "nonagon",
  "decagon",
];
const ANGLES = ["acute", "right", "obtuse"];
const TRIANGLES = ["scalene", "isosceles", "equilateral"];
const UNITS = ["cm", "m"];
const SIDES = ["lo", "hi"];
const poly = (n: number) => POLYGONS[n - 3];
const total = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const coincide = (values: readonly number[]) =>
  new Set(values).size < values.length;
const belowOne = (values: readonly number[]) => values.some((v) => v < 1);

const measured = (unit: string) => (n: number) => num(n, `${int(n)} ${unit}`);
const degrees = (n: number) => num(n, `${int(n)}°`);
const inPi = (unit: string) => (n: number) =>
  choice(`${piMul(n)} ${unit}`, `pi:${n}`);

function offer(
  prompt: string,
  values: readonly number[],
  make: (n: number) => Choice,
  figure?: string,
): Draft {
  const [answer, d1, d2] = values.map((v) => make(v));
  return { prompt, figure, answer, wrong: [d1, d2] };
}

function named(
  prompt: string,
  answer: string,
  names: readonly string[],
): Draft {
  const [d1, d2] = names.filter((n) => n !== answer).map((n) => label(n));
  return { prompt, answer: label(answer), wrong: [d1, d2] };
}

type Rel =
  | "corresponding"
  | "alternate interior"
  | "alternate exterior"
  | "co-interior"
  | "vertically opposite";
type Spot = readonly ["top" | "bottom", Corner];
const RELS: readonly Rel[] = [
  "corresponding",
  "alternate interior",
  "alternate exterior",
  "co-interior",
  "vertically opposite",
];
const PHRASE: Record<Rel, string> = {
  corresponding: "the corresponding angle to a",
  "alternate interior": "alternate interior to a",
  "alternate exterior": "alternate exterior to a",
  "co-interior": "co-interior (same side) with a",
  "vertically opposite": "vertically opposite a",
};
const AT_TOP: readonly Spot[] = [
  ["top", "UR"],
  ["top", "UL"],
  ["top", "LL"],
  ["top", "LR"],
];
const INSIDE: readonly Spot[] = [
  ["top", "LL"],
  ["top", "LR"],
  ["bottom", "UR"],
  ["bottom", "UL"],
];
const OUTSIDE: readonly Spot[] = [
  ["top", "UR"],
  ["top", "UL"],
  ["bottom", "LL"],
  ["bottom", "LR"],
];
const SPOTS: Record<Rel, readonly Spot[]> = {
  corresponding: AT_TOP,
  "vertically opposite": AT_TOP,
  "alternate interior": INSIDE,
  "co-interior": INSIDE,
  "alternate exterior": OUTSIDE,
};
const OPPOSITE: Record<Corner, Corner> = {
  UR: "LL",
  UL: "LR",
  LL: "UR",
  LR: "UL",
};
const MIRROR: Record<Corner, Corner> = {
  UR: "LR",
  UL: "LL",
  LL: "UL",
  LR: "UR",
};
function partner(rel: Rel, [line, corner]: Spot): Spot {
  const other = line === "top" ? "bottom" : "top";
  if (rel === "corresponding") return [other, corner];
  if (rel === "vertically opposite") return [line, OPPOSITE[corner]];
  if (rel === "co-interior") return [other, MIRROR[corner]];
  return [other, OPPOSITE[corner]];
}
const SIZES = [...range(15, 75), ...range(105, 165)].filter(
  (d) => d !== 45 && d !== 135,
);

const OBJECTS: Record<string, string> = {
  circle: "",
  "round pond": "m",
  "bicycle wheel": "cm",
  "dinner plate": "cm",
  "clock face": "cm",
  "circular rug": "m",
};
const DIAMETERS = range(6, 60).filter((d) => d % 2 === 0);

const TRIPLES = range(1, 100).flatMap((a) =>
  range(a + 1, 100).flatMap((b) => {
    const c = isqrt(a * a + b * b);
    return c * c === a * a + b * b && c <= 100 ? [[a, b, c]] : [];
  }),
);
const LEGS = range(2, 25).flatMap((a) =>
  range(a, 25)
    .filter((b) => {
      const [m, k] = simplifyRoot(a * a + b * b);
      return m >= 2 && k >= 2 && m !== k && isSquarefree(m) && isSquarefree(k);
    })
    .map((b) => [a, b]),
);

export const levels: Level[] = [
  {
    skill: "Shape and angle names",
    make(r) {
      const form = r.pick("form", ["P", "A", "T"]);
      if (form === "P") {
        const n = r.int("n", 3, 10);
        return {
          prompt: `A polygon has ${n} sides. What is it called?`,
          answer: label(poly(n)),
          wrong: [
            label(poly(n === 10 ? n - 2 : n + 1)),
            label(poly(n === 3 ? n + 2 : n - 1)),
          ],
        };
      }
      if (form === "A") {
        const kind = r.pick("case", ANGLES);
        const d =
          kind === "acute"
            ? r.int("d", 10, 89)
            : kind === "right"
              ? 90
              : r.int("d", 91, 179);
        return named(
          `An angle measures ${d}°. Which name fits it?`,
          kind,
          ANGLES,
        );
      }
      const kind = r.pick("case", TRIANGLES);
      const unit = r.pick("unit", UNITS);
      let sides: number[];
      if (kind === "scalene")
        sides = r.resample(
          () => [r.int("x", 2, 20), r.int("y", 2, 20), r.int("z", 2, 20)],
          (drawn) => {
            const [x, y, z] = [...drawn].sort((a, b) => a - b);
            return x < y && y < z && x + y > z;
          },
        );
      else {
        const e = r.int("e", 3, 20);
        sides =
          kind === "equilateral"
            ? [e, e, e]
            : [
                e,
                e,
                r.resample(
                  () => r.int("f", 1, 2 * e - 1),
                  (f) => f !== e,
                ),
              ];
      }
      const [x, y, z] = [...sides].sort((a, b) => a - b);
      return named(
        `A triangle has sides ${x} ${unit}, ${y} ${unit} and ${z} ${unit}. Which name fits it?`,
        kind,
        TRIANGLES,
      );
    },
  },
  {
    skill: "Perimeter",
    make(r) {
      const form = r.pick("form", ["R", "M", "G"]);
      const z = form === "R" ? r.pick("z", SIDES) : "";
      const unit = r.pick("unit", UNITS);
      if (form === "R") {
        const { l, w, values } = r.exclude(
          () => {
            const l = r.int("l", 3, 50);
            const w = r.int("w", 2, l - 1);
            return {
              l,
              w,
              values: [2 * (l + w), l * w, z === "lo" ? l + w : 4 * l],
            };
          },
          ({ values }) => coincide(values),
        );
        return offer(
          `A rectangle is ${l} ${unit} long and ${w} ${unit} wide. What is its perimeter?`,
          values,
          measured(unit),
        );
      }
      if (form === "M") {
        const { P, g, values } = r.exclude(
          () => {
            const l = r.int("l", 3, 50);
            const w = r.int("w", 2, l - 1);
            const g = r.pick("g", [l, w]);
            const P = 2 * (l + w);
            return { l, w, P, g, values: [P / 2 - g, P - g, P / 4] };
          },
          ({ l, w, values }) => (l + w) % 2 !== 0 || coincide(values),
        );
        return offer(
          `A rectangle has perimeter ${P} ${unit}. One side is ${g} ${unit}. How long is the side next to it?`,
          values,
          measured(unit),
        );
      }
      const { n, a, values } = r.exclude(
        () => {
          const n = r.int("n", 5, 10);
          const a = r.int("a", 2, 40);
          const s = n === 5 ? 1 : n === 10 ? -1 : r.sign("s");
          return { n, a, values: [n * a, (n + s) * a, 4 * a] };
        },
        ({ values }) => coincide(values),
      );
      return offer(
        `A regular ${poly(n)} has sides ${a} ${unit} long. What is its perimeter?`,
        values,
        measured(unit),
      );
    },
  },
  {
    skill: "Area of rectangles and squares",
    make(r) {
      const form = r.pick("form", ["A", "S", "M"]);
      const z = r.pick("z", SIDES);
      const unit = r.pick("unit", UNITS);
      const bad = (values: readonly number[]) =>
        coincide(values) || belowOne(values);
      if (form === "A") {
        const { l, w, values } = r.exclude(
          () => {
            const l = r.int("l", 3, 30);
            const w = r.int("w", 2, l - 1);
            return {
              l,
              w,
              values: [l * w, 2 * (l + w), z === "lo" ? l + w : l * l],
            };
          },
          ({ values }) => bad(values),
        );
        return offer(
          `A rectangle is ${l} ${unit} long and ${w} ${unit} wide. What is its area?`,
          values,
          measured(`${unit}²`),
        );
      }
      if (form === "S") {
        const { a, values } = r.exclude(
          () => {
            const a = r.int("a", 3, z === "lo" ? 30 : 12);
            return {
              a,
              values: [a * a, z === "lo" ? 4 * a : a * a * a, 2 * a],
            };
          },
          ({ values }) => bad(values),
        );
        return offer(
          `A square has sides ${a} ${unit} long. What is its area?`,
          values,
          measured(`${unit}²`),
        );
      }
      const { g, A, values } = r.exclude(
        () => {
          const g = r.int("g", 2, 30);
          const h = r.int("h", 2, 30);
          const A = g * h;
          return {
            g,
            h,
            A,
            values: [h, A - g, z === "hi" ? A / 2 - g : A / (2 * g)],
          };
        },
        ({ g, h, A, values }) =>
          g === h || A % 2 !== 0 || (z === "lo" && h % 2 !== 0) || bad(values),
      );
      return offer(
        `A rectangle has area ${A} ${unit}² and one side ${g} ${unit}. How long is the other side?`,
        values,
        measured(unit),
      );
    },
  },
  {
    skill: "Angle sums",
    make(r) {
      const ctx = r.pick("ctx", ["tri", "line", "point"]);
      const z = r.pick("z", SIDES);
      const full = ctx === "point" ? 360 : 180;
      const { given, values } = r.exclude(
        () => {
          const given = ["a", "b", "c"]
            .slice(0, ctx === "point" ? 3 : 2)
            .map((v) => r.int(v, 15, 150));
          const u = r.int("u", 1, given.length);
          const S = total(given);
          return { given, S, values: [full - S, full - S + given[u - 1], S] };
        },
        ({ S, values }) =>
          S > full - 10 ||
          (z === "lo" ? S >= full / 2 : S <= full / 2) ||
          coincide(values),
      );
      const [a, b, c] = given;
      const prompt =
        ctx === "tri"
          ? `Two angles of a triangle are ${a}° and ${b}°. How big is the third angle?`
          : ctx === "line"
            ? `Angles of ${a}°, ${b}° and x sit side by side on a straight line. How big is x?`
            : `Angles of ${a}°, ${b}°, ${c}° and x meet at a point. How big is x?`;
      return offer(prompt, values, degrees);
    },
  },
  {
    skill: "Parallel lines and a transversal",
    make(r) {
      const rel = r.pick("rel", RELS);
      const d = r.pick("d", SIZES);
      const spot = SPOTS[rel][r.int("pos", 0, 3)];
      const [line, corner] = spot;
      const [across, facing] = partner(rel, spot);
      const b = rel === "co-interior" ? 180 - d : d;
      return offer(
        `Two parallel lines are cut by a transversal. Angle a is ${d}°. Angle b is ${PHRASE[rel]}. How big is angle b?`,
        [b, 180 - b, Math.abs(90 - d)],
        degrees,
        transversal(corner === "UR" || corner === "LL" ? d : 180 - d, [
          [line, corner, `a = ${d}°`],
          [across, facing, "b"],
        ]),
      );
    },
  },
  {
    skill: "Area of a triangle, parallelogram and trapezoid",
    make(r) {
      const shape = r.pick("shape", ["tri", "para", "trap"]);
      const z = r.pick("z", SIDES);
      const unit = r.pick("unit", UNITS);
      const offside = (values: readonly number[]) =>
        z === "hi" ? values[2] <= values[0] : values[2] >= values[0];
      if (shape === "trap") {
        const { a, b, h, values } = r.exclude(
          () => {
            const a = r.int("a", 2, 30);
            const b = r.int("b", 2, 30);
            const h = r.int("h", 2, 20);
            const side = z === "hi" ? Math.max(a, b) : Math.min(a, b);
            return {
              a,
              b,
              h,
              values: [((a + b) * h) / 2, (a + b) * h, side * h],
            };
          },
          ({ a, b, h, values }) =>
            a === b ||
            ((a + b) * h) % 2 !== 0 ||
            offside(values) ||
            coincide(values),
        );
        return offer(
          `A trapezoid has parallel sides ${a} ${unit} and ${b} ${unit}, ${h} ${unit} apart. What is its area?`,
          values,
          measured(`${unit}²`),
        );
      }
      const { b, h, c, values } = r.exclude(
        () => {
          const b = r.int("b", 3, 30);
          const h = r.int("h", 2, 25);
          const c = r.int("c", h + 1, 30);
          return {
            b,
            h,
            c,
            values:
              shape === "tri"
                ? [(b * h) / 2, b * h, b + h + c]
                : [b * h, b * c, 2 * (b + c)],
          };
        },
        ({ b, h, values }) =>
          (shape === "tri" && (b * h) % 2 !== 0) ||
          offside(values) ||
          coincide(values),
      );
      return offer(
        `A ${shape === "tri" ? "triangle" : "parallelogram"} has base ${b} ${unit}, slanted side ${c} ${unit} and height ${h} ${unit}. What is its area?`,
        values,
        measured(`${unit}²`),
      );
    },
  },
  {
    skill: "Circles",
    make(r) {
      const qty = r.pick("qty", ["C", "A"]);
      const giv = r.pick("giv", ["r", "d"]);
      const u = r.pick("u", qty === "C" ? ["lo", "hi"] : ["lo", "mid", "hi"]);
      const object = r.pick("object", Object.keys(OBJECTS));
      const unit = OBJECTS[object] || r.pick("unit", UNITS);
      const paired = qty === "C" && u === "hi";
      let size: number;
      let slips: Record<string, number[]>;
      let answer: number;
      if (giv === "r") {
        const rad = r.exclude(
          () => r.int("r", 3, 30),
          (v) => paired && v === 4,
        );
        size = rad;
        answer = qty === "C" ? 2 * rad : rad * rad;
        slips =
          qty === "C"
            ? { lo: [rad, rad * rad], hi: [4 * rad, rad * rad] }
            : {
                lo: [rad, 2 * rad],
                mid: [2 * rad, 2 * rad * rad],
                hi: [2 * rad * rad, 4 * rad * rad],
              };
      } else {
        const d = r.exclude(
          () => r.pick("d", DIAMETERS),
          (v) => paired && v === 8,
        );
        const half = d / 2;
        size = d;
        answer = qty === "C" ? d : half * half;
        slips =
          qty === "C"
            ? { lo: [half, 2 * d], hi: [half * half, 2 * d] }
            : {
                lo: [half, d],
                mid: [d, d * d],
                hi: [d * d, (d * d) / 2],
              };
      }
      return offer(
        `A ${object} has ${giv === "r" ? "radius" : "diameter"} ${size} ${unit}. What is its ${qty === "C" ? "circumference" : "area"}? Give your answer in terms of π.`,
        [answer, ...slips[u]],
        inPi(qty === "C" ? unit : `${unit}²`),
      );
    },
  },
  {
    skill: "Composite shapes",
    make(r) {
      const ask = r.pick("ask", ["area", "perimeter"]);
      const v = ask === "perimeter" ? r.pick("v", ["hi", "lo"]) : "";
      const { W, H, p, q, values } = r.exclude(
        () => {
          const W = r.int("W", 8, 20);
          const H = r.int("H", 8, 20);
          const p = r.int("p", 3, W - 3);
          const q = r.int("q", 3, H - 3);
          const values =
            ask === "area"
              ? [W * H - p * q, W * H, W * (H - q) + p * q]
              : [
                  2 * (W + H),
                  2 * W + 2 * H - p - q,
                  v === "hi"
                    ? 2 * (W + H - q) + 2 * (W - p + q)
                    : 2 * (W + H) - 2 * (p + q),
                ];
          return { W, H, p, q, values };
        },
        ({ W, p, values }) =>
          2 * p === W || coincide(values) || belowOne(values),
      );
      return offer(
        `An L-shaped plot has six sides. Going round from one corner they measure ${W} m, ${H - q} m, ${p} m, ${q} m, ${W - p} m and ${H} m. What is its ${ask}?`,
        values,
        measured(ask === "area" ? "m²" : "m"),
        lshape(W, H, p, q),
      );
    },
  },
  {
    skill: "Volume and surface area",
    make(r) {
      const solid = r.pick("solid", ["box", "cube", "cyl"]);
      const qty = r.pick("qty", ["V", "SA"]);
      const sw = r.pick("sw", SIDES);
      const ask = qty === "V" ? "volume" : "surface area";
      const unit = qty === "V" ? "cm³" : "cm²";
      const offside = (values: readonly number[]) =>
        sw === "hi" ? values[1] <= values[0] : values[1] >= values[0];
      if (solid === "box") {
        const { l, w, h, values } = r.exclude(
          () => {
            const l = r.int("l", 2, 12);
            const w = r.int("w", 2, 12);
            const h = r.int("h", 2, 12);
            const faces = l * w + l * h + w * h;
            return {
              l,
              w,
              h,
              values:
                qty === "V"
                  ? [l * w * h, 2 * faces, l * w]
                  : [2 * faces, l * w * h, faces],
            };
          },
          ({ l, w, h, values }) =>
            (l === w && w === h) || offside(values) || coincide(values),
        );
        return offer(
          `A box measures ${l} cm by ${w} cm by ${h} cm. What is its ${ask}?`,
          values,
          measured(unit),
        );
      }
      if (solid === "cube") {
        const { a, values } = r.resample(
          () => {
            const a = r.int("a", 2, 12);
            return {
              a,
              values:
                qty === "V"
                  ? [a * a * a, 6 * a * a, 3 * a]
                  : [6 * a * a, a * a * a, a * a],
            };
          },
          ({ a, values }) => a !== 6 && !offside(values) && !coincide(values),
        );
        return offer(
          `A cube has edges ${a} cm long. What is its ${ask}?`,
          values,
          measured(unit),
        );
      }
      const { rad, h, values } = r.exclude(
        () => {
          const rad = r.int("r", 3, 10);
          const h = r.int("h", 2, 15);
          return {
            rad,
            h,
            values:
              qty === "V"
                ? [
                    rad * rad * h,
                    2 * rad * h,
                    sw === "lo" ? rad * h : 4 * rad * rad * h,
                  ]
                : [2 * rad * rad + 2 * rad * h, rad * rad * h, 2 * rad * h],
          };
        },
        ({ rad, h, values }) =>
          (qty === "SA" && ((rad - 2) * (h - 2) === 4 || offside(values))) ||
          coincide(values),
      );
      return offer(
        `A cylinder has radius ${rad} cm and height ${h} cm. What is its ${ask}? Give your answer in terms of π.`,
        values,
        inPi(unit),
      );
    },
  },
  {
    skill: "The Pythagorean theorem",
    make(r) {
      const form = r.pick("form", ["H", "L", "R"]);
      const u = form === "R" ? "" : r.pick("u", SIDES);
      const unit = r.pick("unit", UNITS);
      const says = (n: number) => `${n} ${unit}`;
      const side = (m: number, k = 1) =>
        choice(`${surd(m, k)} ${unit}`, `root:${m * m * k}`);
      const clean = (values: readonly number[]) =>
        coincide(values) || belowOne(values);
      if (form === "R") {
        const { a, b, m, k } = r.exclude(
          () => {
            const [a, b] = r.pick("legs", LEGS);
            const [m, k] = simplifyRoot(a * a + b * b);
            return { a, b, m, k };
          },
          ({ a, b, m, k }) => clean([m * m * k, k * k * m, (a + b) ** 2]),
        );
        return {
          prompt: `A right triangle has legs ${says(a)} and ${says(b)}. How long is the hypotenuse? Give your answer in simplest radical form.`,
          figure: rightTriangle(a, b, says(a), says(b), "?"),
          answer: side(m, k),
          wrong: [side(k, m), side(a + b)],
        };
      }
      if (form === "H") {
        const { a, b, values } = r.exclude(
          () => {
            const [a, b, c] = r.pick("triple", TRIPLES);
            return {
              a,
              b,
              values: [c, a + b, u === "hi" ? a * a + b * b : b - a],
            };
          },
          ({ values }) => clean(values),
        );
        return offer(
          `A right triangle has legs ${says(a)} and ${says(b)}. How long is the hypotenuse?`,
          values,
          (n) => side(n),
          rightTriangle(a, b, says(a), says(b), "?"),
        );
      }
      const { c, g, other, values } = r.exclude(
        () => {
          const [a, b, c] = r.pick("triple", TRIPLES);
          const g = r.pick("g", [a, b]);
          const other = g === a ? b : a;
          return {
            c,
            g,
            other,
            values: [other, u === "lo" ? c - g : c + g, c * c - g * g],
          };
        },
        ({ values }) => clean(values),
      );
      return offer(
        `A right triangle has hypotenuse ${says(c)} and one leg ${says(g)}. How long is the other leg?`,
        values,
        (n) => side(n),
        rightTriangle(g, other, says(g), "?", says(c)),
      );
    },
  },
];

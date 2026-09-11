import { only, type Asked, type Checks } from "../support/math.ts";

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
const MEASURED_IN: Record<string, string[]> = {
  circle: ["cm", "m"],
  "round pond": ["m"],
  "bicycle wheel": ["cm"],
  "dinner plate": ["cm"],
  "clock face": ["cm"],
  "circular rug": ["m"],
};

function read(pattern: RegExp, text: string) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`unexpected text: ${text}`);
  return match;
}

function amount(text: string, unit: string, pi: boolean) {
  const match = new RegExp(`^(\\d+)${pi ? "π" : ""} ${unit}$`).exec(text);
  if (!match)
    throw new Error(
      `${text} is not a ${pi ? "multiple of π in" : "number of"} ${unit}`,
    );
  return Number(match[1]);
}

const pick = (q: Asked, target: number, unit: string, pi = false) =>
  only(q.choices, (c) => amount(c, unit, pi) === target);

const angle = (q: Asked, target: number) =>
  only(q.choices, (c) => Number(read(/^(\d+)°$/, c)[1]) === target);

function named(q: Asked, names: string[], want: string) {
  if ([...q.choices].sort().join() !== [...names].sort().join())
    throw new Error(`unexpected names ${q.choices.join(" / ")}`);
  return only(q.choices, (c) => c === want);
}

function squarefree(n: number) {
  for (let i = 2; i * i <= n; i++) if (n % (i * i) === 0) return false;
  return n > 1;
}

function squared(text: string, unit: string) {
  const root = new RegExp(`^(\\d*)√(\\d+) ${unit}$`).exec(text);
  if (root) return Number(root[1] || 1) ** 2 * Number(root[2]);
  return amount(text, unit, false) ** 2;
}

type Spot = { top: boolean; up: boolean; right: boolean };
const SPOTS: Spot[] = [true, false].flatMap((top) =>
  [true, false].flatMap((up) =>
    [true, false].map((right) => ({ top, up, right })),
  ),
);
const inside = (s: Spot) => s.top !== s.up;
const opening = (s: Spot, theta: number) =>
  s.up === s.right ? theta : 180 - theta;
const RELATED: Record<string, (a: Spot, b: Spot) => boolean> = {
  "the corresponding angle to a": (a, b) =>
    a.top !== b.top && a.up === b.up && a.right === b.right,
  "vertically opposite a": (a, b) =>
    a.top === b.top && a.up !== b.up && a.right !== b.right,
  "alternate interior to a": (a, b) =>
    a.top !== b.top && inside(a) && inside(b) && a.right !== b.right,
  "alternate exterior to a": (a, b) =>
    a.top !== b.top && !inside(a) && !inside(b) && a.right !== b.right,
  "co-interior (same side) with a": (a, b) =>
    a.top !== b.top && inside(a) && inside(b) && a.right === b.right,
};

const STEPS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export default {
  1: (q) => {
    const polygon = /^A polygon has (\d+) sides\. What is it called\?$/.exec(
      q.prompt,
    );
    if (polygon)
      return only(q.choices, (c) => c === POLYGONS[Number(polygon[1]) - 3]);
    const turn = /^An angle measures (\d+)°\. Which name fits it\?$/.exec(
      q.prompt,
    );
    if (turn) {
      const d = Number(turn[1]);
      if (d <= 0 || d >= 180) throw new Error(`${d}° has no name here`);
      return named(q, ANGLES, d < 90 ? "acute" : d === 90 ? "right" : "obtuse");
    }
    const [, x, , y, z] = read(
      /^A triangle has sides (\d+) (cm|m), (\d+) \2 and (\d+) \2\. Which name fits it\?$/,
      q.prompt,
    );
    const [a, b, c] = [x, y, z].map(Number);
    if (a > b || b > c) throw new Error("the sides are not in ascending order");
    if (a + b <= c) throw new Error("the sides do not close a triangle");
    return named(
      q,
      TRIANGLES,
      a === c ? "equilateral" : a === b || b === c ? "isosceles" : "scalene",
    );
  },
  2: (q) => {
    const rectangle =
      /^A rectangle is (\d+) (cm|m) long and (\d+) \2 wide\. What is its perimeter\?$/.exec(
        q.prompt,
      );
    if (rectangle)
      return pick(
        q,
        2 * (Number(rectangle[1]) + Number(rectangle[3])),
        rectangle[2],
      );
    const missing =
      /^A rectangle has perimeter (\d+) (cm|m)\. One side is (\d+) \2\. How long is the side next to it\?$/.exec(
        q.prompt,
      );
    if (missing)
      return pick(q, Number(missing[1]) / 2 - Number(missing[3]), missing[2]);
    const [, shape, a, unit] = read(
      /^A regular (\w+) has sides (\d+) (cm|m) long\. What is its perimeter\?$/,
      q.prompt,
    );
    const n = POLYGONS.indexOf(shape) + 3;
    if (n < 3) throw new Error(`unknown polygon ${shape}`);
    return pick(q, n * Number(a), unit);
  },
  3: (q) => {
    const rectangle =
      /^A rectangle is (\d+) (cm|m) long and (\d+) \2 wide\. What is its area\?$/.exec(
        q.prompt,
      );
    if (rectangle)
      return pick(
        q,
        Number(rectangle[1]) * Number(rectangle[3]),
        `${rectangle[2]}²`,
      );
    const square =
      /^A square has sides (\d+) (cm|m) long\. What is its area\?$/.exec(
        q.prompt,
      );
    if (square) return pick(q, Number(square[1]) ** 2, `${square[2]}²`);
    const [, area, unit, side] = read(
      /^A rectangle has area (\d+) (cm|m)² and one side (\d+) \2\. How long is the other side\?$/,
      q.prompt,
    );
    return pick(q, Number(area) / Number(side), unit);
  },
  4: (q) => {
    const found =
      /^Two angles of a triangle are (\d+)° and (\d+)°\. How big is the third angle\?$/.exec(
        q.prompt,
      ) ??
      /^Angles of (\d+)°, (\d+)° and x sit side by side on a straight line\. How big is x\?$/.exec(
        q.prompt,
      ) ??
      /^Angles of (\d+)°, (\d+)°, (\d+)° and x meet at a point\. How big is x\?$/.exec(
        q.prompt,
      );
    if (!found) throw new Error(`unexpected prompt: ${q.prompt}`);
    const given = found.slice(1).map(Number);
    const x =
      (given.length === 3 ? 360 : 180) - given.reduce((s, v) => s + v, 0);
    if (x <= 0) throw new Error("the given angles leave nothing for x");
    return angle(q, x);
  },
  5: (q) => {
    const [, size, relation] = read(
      /^Two parallel lines are cut by a transversal\. Angle a is (\d+)°\. Angle b is (.+)\. How big is angle b\?$/,
      q.prompt,
    );
    const related = RELATED[relation];
    if (!related) throw new Error(`unknown relationship ${relation}`);
    const found = new Set<number>();
    for (const a of SPOTS) {
      const theta = a.up === a.right ? Number(size) : 180 - Number(size);
      for (const b of SPOTS) if (related(a, b)) found.add(opening(b, theta));
    }
    if (found.size !== 1) throw new Error(`${relation} does not fix angle b`);
    return angle(q, [...found][0]);
  },
  6: (q) => {
    const slanted =
      /^A (triangle|parallelogram) has base (\d+) (cm|m), slanted side (\d+) \3 and height (\d+) \3\. What is its area\?$/.exec(
        q.prompt,
      );
    if (slanted) {
      const [base, side, height] = [slanted[2], slanted[4], slanted[5]].map(
        Number,
      );
      if (side <= height)
        throw new Error("the slanted side is not longer than the height");
      const area =
        slanted[1] === "triangle" ? (base * height) / 2 : base * height;
      return pick(q, area, `${slanted[3]}²`);
    }
    const [, a, unit, b, h] = read(
      /^A trapezoid has parallel sides (\d+) (cm|m) and (\d+) \2, (\d+) \2 apart\. What is its area\?$/,
      q.prompt,
    );
    return pick(q, ((Number(a) + Number(b)) * Number(h)) / 2, `${unit}²`);
  },
  7: (q) => {
    const [, object, given, size, unit, ask] = read(
      /^A (.+) has (radius|diameter) (\d+) (cm|m)\. What is its (circumference|area)\? Give your answer in terms of π\.$/,
      q.prompt,
    );
    if (!MEASURED_IN[object]?.includes(unit))
      throw new Error(`a ${object} measured in ${unit}`);
    const radius = Number(size) / (given === "diameter" ? 2 : 1);
    return ask === "circumference"
      ? pick(q, 2 * radius, unit, true)
      : pick(q, radius * radius, `${unit}²`, true);
  },
  8: (q) => {
    const [, list, ask] = read(
      /^An L-shaped plot has six sides\. Going round from one corner they measure (.+)\. What is its (area|perimeter)\?$/,
      q.prompt,
    );
    const sides = list
      .split(/, | and /)
      .map((side) => Number(read(/^(\d+) m$/, side)[1]));
    if (sides.length !== 6) throw new Error(`${sides.length} sides`);
    let x = 0;
    let y = 0;
    let twice = 0;
    sides.forEach((length, i) => {
      const nx = x + STEPS[i][0] * length;
      const ny = y + STEPS[i][1] * length;
      twice += x * ny - nx * y;
      x = nx;
      y = ny;
    });
    if (x !== 0 || y !== 0) throw new Error("the sides do not close up");
    return ask === "area"
      ? pick(q, Math.abs(twice) / 2, "m²")
      : pick(q, sides.reduce((s, v) => s + v, 0), "m");
  },
  9: (q) => {
    const unit = (ask: string) => (ask === "volume" ? "cm³" : "cm²");
    const box =
      /^A box measures (\d+) cm by (\d+) cm by (\d+) cm\. What is its (volume|surface area)\?$/.exec(
        q.prompt,
      );
    const cube =
      /^A cube has edges (\d+) cm long\. What is its (volume|surface area)\?$/.exec(
        q.prompt,
      );
    if (box || cube) {
      const [l, w, h] = box
        ? box.slice(1, 4).map(Number)
        : [cube![1], cube![1], cube![1]].map(Number);
      const ask = box ? box[4] : cube![2];
      return pick(
        q,
        ask === "volume" ? l * w * h : 2 * (l * w + l * h + w * h),
        unit(ask),
      );
    }
    const [, r, h, ask] = read(
      /^A cylinder has radius (\d+) cm and height (\d+) cm\. What is its (volume|surface area)\? Give your answer in terms of π\.$/,
      q.prompt,
    );
    const [radius, height] = [r, h].map(Number);
    const end = radius * radius;
    return pick(
      q,
      ask === "volume" ? end * height : 2 * end + 2 * radius * height,
      unit(ask),
      true,
    );
  },
  10: (q) => {
    const legs =
      /^A right triangle has legs (\d+) (cm|m) and (\d+) \2\. How long is the hypotenuse\?( Give your answer in simplest radical form\.)?$/.exec(
        q.prompt,
      );
    let target: number;
    let unit: string;
    if (legs) {
      target = Number(legs[1]) ** 2 + Number(legs[3]) ** 2;
      unit = legs[2];
    } else {
      const [, c, u, g] = read(
        /^A right triangle has hypotenuse (\d+) (cm|m) and one leg (\d+) \2\. How long is the other leg\?$/,
        q.prompt,
      );
      target = Number(c) ** 2 - Number(g) ** 2;
      unit = u;
    }
    const index = only(q.choices, (c) => squared(c, unit) === target);
    const root = /^(\d*)√(\d+) /.exec(q.choices[index]);
    if (legs?.[4]) {
      if (!root || !squarefree(Number(root[2])))
        throw new Error(`${q.choices[index]} is not in simplest radical form`);
    } else if (root) throw new Error(`${q.choices[index]} should be whole`);
    return index;
  },
} satisfies Checks;

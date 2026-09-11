import {
  type Choice,
  type Level,
  MINUS,
  NAMES,
  Rat,
  choice,
  dec,
  distinctValues,
  fixed,
  frac,
  gcd,
  isqrt,
  label,
  nearBoundary,
  num,
  piMul,
  q,
  range,
  real,
  roundHalfUp,
  simplifyRoot,
  surd,
} from "./kit.ts";

export const name = "Trigonometry";

type Fn = "sin" | "cos" | "tan";
const rad = (t: number) => (t * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;
const inDegrees: Record<Fn, (t: number) => number> = {
  sin: (t) => Math.sin(rad(t)),
  cos: (t) => Math.cos(rad(t)),
  tan: (t) => Math.tan(rad(t)),
};
const inRadians: Record<Fn, (t: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};
const tenth = (x: number) => Math.round(x * 10) / 10;
const broken = (values: readonly number[], places: number) =>
  values.some((v) => !Number.isFinite(v) || nearBoundary(v, places));
const crowded = (values: readonly number[], gap: number) =>
  values.some((v, i) => values.some((w, j) => j > i && Math.abs(v - w) < gap));
const length = (x: number, unit: string) => real(x, `${fixed(x, 1)} ${unit}`);
const angle = (x: number) => real(x, `${fixed(x, 0)}°`);
const lone = (flags: readonly boolean[]) =>
  flags.filter((flag) => flag === flags[0]).length === 1;
const pairsOf = <T>(items: readonly T[]) =>
  items.flatMap((a, i) => items.slice(i + 1).map((b): [T, T] => [a, b]));
const three = (answer: Choice, wrong: readonly Choice[]) => ({
  answer,
  wrong: [wrong[0], wrong[1]] as [Choice, Choice],
});

function slotted(parts: readonly (readonly string[])[]) {
  const agree = (x: readonly string[], y: readonly string[]) =>
    x.some((part, i) => part === y[i]);
  const [a, b, c] = parts;
  if (agree(a, b) && agree(a, c) && !agree(b, c)) return false;
  const majority = a.map((_, i) => {
    const column = parts.map((p) => p[i]);
    return column.find((part) => column.filter((x) => x === part).length > 1);
  });
  return !majority.every((part, i) => part === a[i]);
}

const LETTERS = [..."ABCDEFGHKLMNPQRSTXYZ"];
const TRIANGLES = LETTERS.flatMap((x, i) =>
  LETTERS.slice(i + 1).flatMap((y, j) =>
    LETTERS.slice(i + j + 2).map((z) => x + y + z),
  ),
);
const ROLES = ["opposite side", "adjacent side", "hypotenuse"];
const joined = (x: string, y: string) => [x, y].sort().join("");

const TRIPLES: [number, number, number][] = [];
for (let c = 5; c <= 100; c++)
  for (let p = 1; 2 * p * p < c * c; p++) {
    const m = isqrt(c * c - p * p);
    if (m * m === c * c - p * p) TRIPLES.push([p, m, c]);
  }
const ratio = (x: Rat) => num(x, frac(x));

const SIDES: Record<string, (t: number) => string> = {
  H: () => "the hypotenuse",
  O: (t) => `the side opposite the ${t}° angle`,
  A: (t) => `the side adjacent to the ${t}° angle`,
};
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const FIND_SIDE: Record<string, [Fn, boolean]> = {
  HO: ["sin", true],
  HA: ["cos", true],
  AO: ["tan", true],
  OA: ["tan", false],
  OH: ["sin", false],
  AH: ["cos", false],
};
const apply = (s: number, by: number, times: boolean) =>
  times ? s * by : s / by;

const INVERSE: Record<string, (x: number) => number> = {
  OA: (x) => deg(Math.atan(x)),
  OH: (x) => deg(Math.asin(x)),
  AH: (x) => deg(Math.acos(x)),
};
const onTie = (x: Rat) => x.mul(20).isInt() && x.mul(20).n % 2 !== 0;

type Exact = { c: Rat; k: number };
const surdOf = (n: number, d = 1, k = 1): Exact => ({
  c: q(n, d),
  k: n ? k : 1,
});
const scaled = (v: Exact, m: number): Exact => ({
  c: v.c.mul(m),
  k: v.c.n && m ? v.k : 1,
});
function product(a: Exact, b: Exact): Exact {
  const [outside, inside] = simplifyRoot(a.k * b.k);
  const c = a.c.mul(b.c).mul(outside);
  return { c, k: c.n ? inside : 1 };
}
const exactText = (v: Exact) => (v.k === 1 ? frac(v.c) : surd(v.c, v.k));
const exactKey = (v: Exact) => `${v.c}:${v.k}`;
const exactChoice = (v: Exact) => choice(exactText(v), `exact:${exactKey(v)}`);
const exactParts = (v: Exact) => [
  v.k > 1 && Math.abs(v.c.n) === 1 ? "" : String(Math.abs(v.c.n)),
  String(v.k),
  String(v.c.d),
];
const ROWS = [0, 30, 45, 60, 90];
const SPECIAL: Record<Fn, Record<number, Exact>> = {
  sin: {
    0: surdOf(0),
    30: surdOf(1, 2),
    45: surdOf(1, 2, 2),
    60: surdOf(1, 2, 3),
    90: surdOf(1),
  },
  cos: {
    0: surdOf(1),
    30: surdOf(1, 2, 3),
    45: surdOf(1, 2, 2),
    60: surdOf(1, 2),
    90: surdOf(0),
  },
  tan: {
    0: surdOf(0),
    30: surdOf(1, 3, 3),
    45: surdOf(1),
    60: surdOf(1, 1, 3),
  },
};
const FACTS = (["sin", "cos", "tan"] as Fn[]).flatMap((f) =>
  ROWS.filter((t) => SPECIAL[f][t]).map((t): [Fn, number] => [f, t]),
);
const present = <T>(entries: [string, T | undefined][]) =>
  entries.filter((entry): entry is [string, T] => entry[1] !== undefined);
function valueBank(f: Fn, t: number) {
  const row = ROWS.indexOf(t);
  const at = (g: Fn, u: number | undefined) =>
    u === undefined ? undefined : SPECIAL[g][u];
  if (f === "tan")
    return present<Exact>([
      ["C", t === 0 || t === 45 ? undefined : at("tan", 90 - t)],
      ["N-", at("tan", ROWS[row - 1])],
      ["N+", at("tan", ROWS[row + 1])],
      ["Ws", at("sin", t)],
      ["Wc", at("cos", t)],
      ["M", product(SPECIAL.sin[t], SPECIAL.cos[t])],
    ]);
  return present<Exact>([
    ["C", at(f === "sin" ? "cos" : "sin", t)],
    ["N-", at(f, ROWS[row - 1])],
    ["N+", at(f, ROWS[row + 1])],
    ["W", t === 90 ? undefined : at("tan", t)],
  ]);
}
function valuePairs(f: Fn, t: number, k: number) {
  const answer = scaled(SPECIAL[f][t], k);
  return pairsOf(valueBank(f, t))
    .filter(([[, x], [, y]]) => {
      const found = [answer, scaled(x, k), scaled(y, k)];
      return (
        new Set(found.map(exactKey)).size === 3 &&
        !lone(found.map((v) => v.k > 1)) &&
        !lone(found.map((v) => v.c.d > 1)) &&
        slotted(found.map(exactParts))
      );
    })
    .map(([[x], [y]]) => [x, y]);
}
const multipliers = (f: Fn, t: number) =>
  (t === 0 || t === 90 ? [1] : range(1, 9)).filter(
    (k) => valuePairs(f, t, k).length,
  );
function angleBank(t: number) {
  const row = ROWS.indexOf(t);
  return present<number>([
    ["C", t === 45 ? undefined : 90 - t],
    ["N-", ROWS[row - 1]],
    ["N+", ROWS[row + 1]],
  ]);
}

const THINGS = ["tree", "flagpole", "tower", "building", "mast"];
const LOOKOUTS = [
  ["cliff", "boat", "water"],
  ["lighthouse", "boat", "water"],
  ["bridge", "buoy", "water"],
  ["tower", "car", "ground"],
];
const HEIGHTS = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8];
const STORIES: Record<
  string,
  { given: string; g: [number, number]; t: [number, number]; v: string[] }
> = {
  LH: { given: "L", g: [3, 15], t: [50, 80], v: ["P"] },
  LF: { given: "L", g: [3, 15], t: [50, 80], v: ["P"] },
  KH: { given: "L", g: [20, 90], t: [20, 70], v: ["R", "P"] },
  EL: { given: "d", g: [10, 60], t: [15, 70], v: ["R", "P"] },
  DP: { given: "H", g: [20, 120], t: [10, 60], v: ["R", "P"] },
  EY: { given: "d", g: [10, 40], t: [15, 60], v: ["R", "P", "E"] },
};
function storyValues(form: string, v: string, t: number, g: number, e: number) {
  const slip = (fn: Fn) =>
    v === "R" ? inRadians[fn](t) : tenth(inDegrees[fn](t));
  const [sin, cos, tan] = (["sin", "cos", "tan"] as Fn[]).map((fn) =>
    inDegrees[fn](t),
  );
  if (form === "LH" || form === "KH")
    return [g * sin, g * cos, g * slip("sin")];
  if (form === "LF") return [g * cos, g * sin, g * slip("cos")];
  if (form === "EL") return [g * tan, g / tan, g * slip("tan")];
  if (form === "DP") return [g / tan, g * tan, g / slip("tan")];
  return [g * tan + e, g / tan + e, v === "E" ? g * tan : g * slip("tan") + e];
}
const vowelSound = (n: number) =>
  n === 8 || n === 11 || n === 18 || Math.floor(n / 10) === 8;

const MULTIPLES_OF_5 = range(1, 71).map((i) => 5 * i);
const ARC_RADIANS = [2, 3, 4, 6].flatMap((n) =>
  range(1, 2 * n - 1)
    .filter((k) => gcd(k, n) === 1)
    .map((k) => [k, n]),
);
const ARC_DEGREES = range(1, 23).map((i) => 15 * i);
const piChoice = (x: Rat, unit = "") =>
  choice(unit ? `${piMul(x)} ${unit}` : piMul(x), `pi:${x}`);
const piParts = (x: Rat) => [x.n === 1 ? "" : String(x.n), String(x.d)];
const piFits = (found: readonly Rat[]) =>
  distinctValues(found) &&
  !lone(found.map((x) => x.isInt())) &&
  slotted(found.map(piParts));
function degreeSlips(d: number) {
  const { n: k, d: n } = q(d, 180);
  return present<Rat>([
    ["H", q(2 * d)],
    ["T", q(d, 2)],
    ["F", q(180 * n, k)],
    ["N", q(180 * k)],
    ["K", k >= 2 ? q(180, n) : undefined],
  ]).filter(([, x]) => x.isInt() && x.n >= 1 && x.n <= 720 && x.n !== d);
}

const QUADRANT_ANGLES = [120, 135, 150, 210, 225, 240, 300, 315, 330];
const POSITIVE_IN: Record<Fn, number> = { sin: 2, cos: 4, tan: 3 };
function unitCircle(f: Fn, t: number) {
  const quadrant = t < 180 ? 2 : t < 270 ? 3 : 4;
  const alpha = quadrant === 2 ? 180 - t : quadrant === 3 ? t - 180 : 360 - t;
  const s = POSITIVE_IN[f] === quadrant ? 1 : -1;
  const co =
    alpha === 45
      ? f === "tan"
        ? SPECIAL.sin[45]
        : SPECIAL.tan[45]
      : f === "tan"
        ? SPECIAL.tan[90 - alpha]
        : SPECIAL[f === "sin" ? "cos" : "sin"][alpha];
  const answer = scaled(SPECIAL[f][alpha], s);
  const X = scaled(co, s);
  return { answer, G: scaled(answer, -1), X, negX: scaled(X, -1) };
}

const SIZES: Record<string, Exact> = {
  "1/2": surdOf(1, 2),
  "√2/2": surdOf(1, 2, 2),
  "√3/2": surdOf(1, 2, 3),
  "√3/3": surdOf(1, 3, 3),
  "1": surdOf(1),
  "√3": surdOf(1, 1, 3),
};
const CALCULATOR: Record<Fn, Record<string, number>> = {
  sin: { "1/2": 30, "√2/2": 45, "√3/2": 60 },
  cos: { "1/2": 60, "√2/2": 45, "√3/2": 30 },
  tan: { "√3/3": 30, "1": 45, "√3": 60 },
};
const CO_SIZE: Record<string, string> = {
  "1/2": "√3/2",
  "√3/2": "1/2",
  "√3/3": "√3",
  "√3": "√3/3",
};
const LEADS: Record<string, number[]> = {
  "1/2": [2, 4, 6],
  "√2/2": [2, 4, 6],
  "√3/2": [2, 4, 6],
  "√3/3": [3, 6],
  "1": [1, 2, 3],
  "√3": [1, 2, 3],
};
const calculator = (f: Fn, sigma: number, u: string) => {
  const p = CALCULATOR[f][u];
  return sigma > 0 ? p : f === "cos" ? 180 - p : -p;
};
const solutionSet = (xs: readonly number[]) =>
  xs.map((x) => ((x % 360) + 360) % 360).sort((a, b) => a - b);
function solved(f: Fn, sigma: number, u: string) {
  const p = calculator(f, sigma, u);
  return solutionSet([
    p,
    f === "sin" ? 180 - p : f === "cos" ? 360 - p : p + 180,
  ]);
}
function setBank(f: Fn, sigma: number, u: string) {
  const p = calculator(f, sigma, u);
  return present<number[]>([
    ["Q", solutionSet([p, f === "sin" ? 360 - p : 180 - p])],
    ["P", solutionSet([p, f === "tan" ? 360 - p : p + 180])],
    ["G", solved(f, -sigma, u)],
    ["S", CO_SIZE[u] ? solved(f, sigma, CO_SIZE[u]) : undefined],
  ]);
}
function setPairs(f: Fn, sigma: number, u: string) {
  const answer = solved(f, sigma, u);
  return pairsOf(setBank(f, sigma, u))
    .filter(([[, x], [, y]]) => {
      const sets = [answer, x, y];
      return (
        new Set(sets.map((s) => s.join())).size === 3 &&
        slotted(sets.map((s) => s.map(String)))
      );
    })
    .map(([[x], [y]]) => [x, y]);
}
const setChoice = (xs: readonly number[]) =>
  choice(`{${xs.map((x) => `${x}°`).join(", ")}}`, `set:${xs.join(",")}`);

export const levels: Level[] = [
  {
    skill: "Name the sides",
    make(r) {
      const form = r.pick("form", ["N", "S"]);
      const role = r.pick("role", ROLES);
      const T = r.pick("T", TRIANGLES);
      const c = r.pick("c", [...T]);
      const a = r.pick(
        "a",
        [...T].filter((x) => x !== c),
      );
      const b = [...T].find((x) => x !== c && x !== a)!;
      const side: Record<string, string> = {
        hypotenuse: joined(a, b),
        "opposite side": joined(b, c),
        "adjacent side": joined(a, c),
      };
      const intro = `Triangle ${T} has a right angle at ${c}. Relative to angle ${a},`;
      const others = ROLES.filter((x) => x !== role);
      if (form === "N")
        return {
          prompt: `${intro} side ${side[role]} is the…`,
          ...three(label(role), others.map(label)),
        };
      return {
        prompt: `${intro} which side is the ${role}?`,
        ...three(
          label(side[role]),
          others.map((x) => label(side[x])),
        ),
      };
    },
  },
  {
    skill: "Trig ratios from sides",
    make(r) {
      const f = r.pick("f", ["sin", "cos", "tan"]);
      const X = r.pick("X", ["A", "B"]);
      const gs = r.pick("gs", ["BC", "AC"]);
      const opposite = X === "A" ? "BC" : "AC";
      const adjacent = X === "A" ? "AC" : "BC";
      const missing = gs === "BC" ? "AC" : "BC";
      const draw = () => {
        const [p, m, c] = r.pick("tri", TRIPLES);
        const bc = r.pick("BC", [p, m]);
        const sides: Record<string, number> = { BC: bc, AC: bc === p ? m : p };
        return { c, sides, g: sides[gs] };
      };
      const ask = (c: number, g: number) =>
        `Triangle ABC has a right angle at C, with AB = ${c} and ${gs} = ${g}. What is ${f} ${X}?`;
      if (f !== "tan") {
        const top = f === "sin" ? opposite : adjacent;
        const other = top === "BC" ? "AC" : "BC";
        const z = r.weighted("z", [
          ["top", 1],
          ["middle", 1],
          ["bottom", top === gs ? 2 : 0],
        ]);
        const below = z === "top" ? 2 : z === "middle" ? 1 : 0;
        const { c, sides, g } = r.exclude(draw, ({ c, sides, g }) => {
          const tops = [sides[top], sides[other], c - g];
          return (
            c === 2 * g || tops.filter((x) => x < tops[0]).length !== below
          );
        });
        return {
          prompt: ask(c, g),
          ...three(ratio(q(sides[top], c)), [
            ratio(q(sides[other], c)),
            ratio(q(c - g, c)),
          ]),
        };
      }
      const v = r.pick("v", ["D", "H"]);
      const build = ({ c, sides, g }: ReturnType<typeof draw>) => {
        const slipped = { ...sides, [missing]: v === "D" ? c - g : c };
        return [
          q(sides[opposite], sides[adjacent]),
          q(sides[adjacent], c),
          q(slipped[opposite], slipped[adjacent]),
        ];
      };
      const drawn = r.exclude(draw, (t) => build(t).some((x) => x.isInt()));
      const [answer, d1, d2] = build(drawn);
      return {
        prompt: ask(drawn.c, drawn.g),
        ...three(ratio(answer), [ratio(d1), ratio(d2)]),
      };
    },
  },
  {
    skill: "Find a side",
    make(r) {
      const form = r.pick("form", ["HO", "HA", "AO", "OA", "OH", "AH"]);
      const v = r.pick("v", ["R", "P"]);
      const [fn, times] = FIND_SIDE[form];
      const values = (t: number, s: number) => {
        const exact = inDegrees[fn](t);
        const d1 =
          fn === "tan"
            ? apply(s, exact, !times)
            : apply(s, inDegrees[fn === "sin" ? "cos" : "sin"](t), times);
        const d2 = apply(s, v === "R" ? inRadians[fn](t) : tenth(exact), times);
        return [apply(s, exact, times), d1, d2];
      };
      const { t, s, found } = r.exclude(
        () => {
          const t = r.int("t", 15, 75);
          const s = r.int("s", 4, 30);
          return { t, s, found: values(t, s) };
        },
        ({ t, s, found }) =>
          t === 45 ||
          broken(found, 1) ||
          found.some((x) => x <= 0) ||
          crowded(found, 0.3) ||
          (form[0] === "H" && found.some((x) => s - x < 0.3)) ||
          (form[1] === "H" && found.some((x) => x - s < 0.3 || x > 4 * s)) ||
          (!form.includes("H") && found.some((x) => x < s / 4 || x > 4 * s)),
      );
      const U = r.pick("U", ["cm", "m"]);
      return {
        prompt: `A right triangle has a ${t}° angle. ${capital(SIDES[form[0]](t))} is ${s} ${U}. How long is ${SIDES[form[1]](t)}? Round to 1 dp.`,
        ...three(
          length(found[0], U),
          found.slice(1).map((x) => length(x, U)),
        ),
      };
    },
  },
  {
    skill: "Find an angle",
    make(r) {
      const form = r.pick("form", ["OA", "OH", "AH"]);
      const v = r.pick("v", ["W", "P"]);
      const U = r.pick("U", ["cm", "m"]);
      const inverse = INVERSE[form];
      const { x, y, found } = r.exclude(
        () => {
          const x = r.int("x", 2, form === "OA" ? 30 : 29);
          const y = form === "OA" ? r.int("y", 2, 30) : r.int("y", x + 1, 30);
          if (x === y) return { x, y, found: [] };
          const exact = q(x, y);
          const rounded = roundHalfUp(exact, 1);
          const answer = inverse(x / y);
          const d2 =
            v === "W"
              ? form === "OA"
                ? INVERSE.OH(Math.min(x, y) / Math.max(x, y))
                : INVERSE.OA(x / y)
              : onTie(exact) || (form !== "OA" && rounded.eq(1))
                ? NaN
                : inverse(rounded.toNumber());
          return { x, y, found: [answer, 90 - answer, d2] };
        },
        ({ found }) =>
          !found.length ||
          broken(found, 0) ||
          found.some((a) => a < 1) ||
          new Set(found.map((a) => Math.round(a))).size < 3,
      );
      const opening =
        form === "OA"
          ? `the side opposite angle θ is ${x} ${U} and the side adjacent to it is ${y} ${U}`
          : `the side ${form === "OH" ? "opposite" : "adjacent to"} angle θ is ${x} ${U} and the hypotenuse is ${y} ${U}`;
      return {
        prompt: `In a right triangle, ${opening}. What is θ to the nearest degree?`,
        ...three(angle(found[0]), found.slice(1).map(angle)),
      };
    },
  },
  {
    skill: "Special angles, exact",
    make(r) {
      const form = r.pick("form", ["V", "A"]);
      const [f, t] = r.pick("fact", FACTS);
      if (form === "V") {
        const k = r.pick("k", multipliers(f, t));
        const [x, y] = r.pick("pair", valuePairs(f, t, k));
        const bank = Object.fromEntries(valueBank(f, t));
        return {
          prompt: `What is the exact value of ${k === 1 ? "" : `${k} `}${f} ${t}°?`,
          ...three(exactChoice(scaled(SPECIAL[f][t], k)), [
            exactChoice(scaled(bank[x], k)),
            exactChoice(scaled(bank[y], k)),
          ]),
        };
      }
      const bank = angleBank(t);
      const [x, y] = r.pick(
        "pair",
        pairsOf(bank)
          .filter(([[, a], [, b]]) => a !== b)
          .map(([[a], [b]]) => [a, b]),
      );
      const at = Object.fromEntries(bank);
      const degree = (u: number) => num(u, `${u}°`);
      return {
        prompt: `θ is between 0° and 90°, and ${f} θ = ${exactText(SPECIAL[f][t])}. What is θ?`,
        ...three(degree(t), [degree(at[x]), degree(at[y])]),
      };
    },
  },
  {
    skill: "Elevation and depression",
    make(r) {
      const form = r.pick("form", ["LH", "LF", "KH", "EL", "DP", "EY"]);
      const story = STORIES[form];
      const v = story.v.length > 1 ? r.pick("v", story.v) : story.v[0];
      const z = r.pick("z", ["same", "split"]);
      const { g, t, e, found } = r.exclude(
        () => {
          const g = r.int(story.given, ...story.g);
          const t = r.int("t", ...story.t);
          const e = form === "EY" ? r.pick("e", HEIGHTS) : 0;
          return { g, t, e, found: storyValues(form, v, t, g, e) };
        },
        ({ g, t, found }) =>
          t === 45 ||
          broken(found, 1) ||
          found.some((x) => x <= 0.5 || x > 6 * g) ||
          (story.given === "L" && found.some((x) => g - x < 0.3)) ||
          crowded(found, 0.3) ||
          (Math.sign(found[1] - found[0]) ===
            Math.sign(found[2] - found[0])) !==
            (z === "same"),
      );
      let prompt: string;
      if (form === "LH" || form === "LF")
        prompt = `${vowelSound(g) ? "An" : "A"} ${g} m ladder leans against a wall, making an angle of ${t}° with the level ground. ${form === "LH" ? "How high up the wall does it reach?" : "How far is its foot from the wall?"} Round to 1 dp.`;
      else if (form === "KH")
        prompt = `A kite is flying on ${vowelSound(g) ? "an" : "a"} ${g} m string that makes an angle of ${t}° with the level ground. How high is the kite above the point where the string is held? Round to 1 dp.`;
      else if (form === "EL") {
        const thing = r.pick("thing", THINGS);
        prompt = `From a point ${g} m from the foot of a ${thing}, on level ground, the angle of elevation to its top is ${t}°. How tall is the ${thing}? Round to 1 dp.`;
      } else if (form === "DP") {
        const [look, target, ground] = r.pick("look", LOOKOUTS);
        prompt = `From the top of a ${look} ${g} m above the ${ground}, the angle of depression to a ${target} is ${t}°. How far is the ${target} from the foot of the ${look}? Round to 1 dp.`;
      } else {
        const who = r.pick("name", NAMES);
        const thing = r.pick("thing", THINGS);
        prompt = `${who}'s eyes are ${dec(q(Math.round(e * 10), 10))} m above the level ground. From ${g} m away, ${who} sees the top of a ${thing} at an angle of elevation of ${t}°. How tall is the ${thing}? Round to 1 dp.`;
      }
      const metres = (x: number) => length(x, "m");
      return { prompt, ...three(metres(found[0]), found.slice(1).map(metres)) };
    },
  },
  {
    skill: "Radians, degrees and arc length",
    make(r) {
      const form = r.pick("form", ["DR", "RD", "AR", "AD"]);
      const degree = (u: number) => num(u, `${u}°`);
      if (form === "DR") {
        const y = r.pick("y", ["H", "T"]);
        const set = r.weighted("set", [
          ["F", 2],
          ["flip", 1],
        ]);
        const { d, found } = r.exclude(
          () => {
            const d = r.pick("d", MULTIPLES_OF_5);
            const answer = q(d, 180);
            const slip = q(d, y === "H" ? 360 : 90);
            return {
              d,
              found:
                set === "F"
                  ? [answer, answer.inv(), slip]
                  : [answer, slip, slip.inv()],
            };
          },
          ({ d, found }) =>
            d === 180 || found.some((x) => x.cmp(4) > 0) || !piFits(found),
        );
        return {
          prompt: `Write ${d}° in radians.`,
          ...three(
            piChoice(found[0]),
            found.slice(1).map((x) => piChoice(x)),
          ),
        };
      }
      if (form === "RD") {
        const z = r.weighted("z", [
          ["same", 2],
          ["split", 1],
        ]);
        const options = (d: number) =>
          pairsOf(degreeSlips(d)).filter(
            ([[, a], [, b]]) =>
              !a.eq(b) && (a.n < d === b.n < d) === (z === "same"),
          );
        const d = r.resample(
          () => r.pick("d", MULTIPLES_OF_5),
          (d) => options(d).length > 0,
        );
        const slips = Object.fromEntries(degreeSlips(d));
        const [x, y] = r.pick(
          "pair",
          options(d).map(([[a], [b]]) => [a, b]),
        );
        return {
          prompt: `Write ${piMul(q(d, 180))} in degrees.`,
          ...three(degree(d), [degree(slips[x].n), degree(slips[y].n)]),
        };
      }
      const pair = r.weighted("pair", [
        ["AD", 2],
        ["AH", 1],
        ["DH", 1],
      ]);
      const { radius, text, found } = r.exclude(
        () => {
          const radius = r.int("r", 3, 20);
          const [top, bottom] =
            form === "AR"
              ? r.pick("theta", ARC_RADIANS)
              : [r.pick("theta", ARC_DEGREES), 180];
          const theta = q(top, bottom);
          const slips: Record<string, Rat> = {
            A: theta.mul(radius * radius).div(2),
            D: theta.mul(2 * radius),
            H: theta.mul(radius).div(2),
          };
          return {
            radius,
            text: form === "AR" ? piMul(theta) : `${top}°`,
            found: [theta.mul(radius), slips[pair[0]], slips[pair[1]]],
          };
        },
        ({ found }) => !piFits(found),
      );
      const U = r.pick("U", ["cm", "m"]);
      return {
        prompt: `A circle has radius ${radius} ${U}. An arc subtends an angle of ${text} at the centre. How long is the arc? Give an exact answer.`,
        ...three(
          piChoice(found[0], U),
          found.slice(1).map((x) => piChoice(x, U)),
        ),
      };
    },
  },
  {
    skill: "Unit circle and reference angles",
    make(r) {
      const form = r.pick("form", ["D", "R"]);
      const shape = r.pick("shape", ["T1", "T2", "T3"]);
      const f = r.pick("f", ["sin", "cos", "tan"] as Fn[]);
      const t = r.pick("t", QUADRANT_ANGLES);
      const { answer, G, X, negX } = unitCircle(f, t);
      const [d1, d2] =
        shape === "T1" ? [G, X] : shape === "T2" ? [X, negX] : [G, negX];
      return {
        prompt:
          form === "D"
            ? `What is the exact value of ${f} ${t}°?`
            : `What is the exact value of ${f}(${piMul(q(t, 180))})?`,
        ...three(exactChoice(answer), [exactChoice(d1), exactChoice(d2)]),
      };
    },
  },
  {
    skill: "Law of sines and law of cosines",
    make(r) {
      const form = r.pick("form", ["C", "S"]);
      const U = r.pick("U", ["cm", "m"]);
      if (form === "C") {
        const v1 = r.pick("v1", ["P", "N"]);
        const v2 = r.pick("v2", ["W", "R"]);
        const { a, b, C, found } = r.exclude(
          () => {
            const a = r.int("a", 4, 20);
            const b = r.int("b", 4, 20);
            const C = r.int("C", 25, 150);
            const squares = a * a + b * b;
            const cos = inDegrees.cos(C);
            const inside = [
              squares - 2 * a * b * cos,
              v1 === "P" ? squares + 2 * a * b * cos : squares - a * b * cos,
              squares -
                2 * a * b * (v2 === "W" ? inDegrees.sin(C) : inRadians.cos(C)),
            ];
            return {
              a,
              b,
              C,
              found: inside.map((x) => (x > 0 ? Math.sqrt(x) : NaN)),
            };
          },
          ({ C, found }) => C === 90 || broken(found, 1) || crowded(found, 0.3),
        );
        return {
          prompt: `In triangle ABC, a = ${a} ${U}, b = ${b} ${U} and angle C = ${C}°. How long is side c? Round to 1 dp.`,
          ...three(
            length(found[0], U),
            found.slice(1).map((x) => length(x, U)),
          ),
        };
      }
      const v = r.pick("v", ["X", "R"]);
      const { A, B, a, found } = r.exclude(
        () => {
          const A = r.int("A", 20, 120);
          const B = r.int("B", 20, 120);
          const a = r.int("a", 4, 20);
          const C = 180 - A - B;
          const sin = inDegrees.sin;
          return {
            A,
            B,
            C,
            a,
            found: [
              (a * sin(B)) / sin(A),
              (a * sin(A)) / sin(B),
              v === "X"
                ? (a * sin(C)) / sin(A)
                : (a * inRadians.sin(B)) / inRadians.sin(A),
            ],
          };
        },
        ({ A, B, C, a, found }) =>
          C < 20 ||
          A === B ||
          B === C ||
          broken(found, 1) ||
          crowded(found, 0.3) ||
          found.some((x) => x <= 0.5 || x > 4 * a),
      );
      return {
        prompt: `In triangle ABC, angle A = ${A}°, angle B = ${B}° and a = ${a} ${U}. How long is side b? Round to 1 dp.`,
        ...three(
          length(found[0], U),
          found.slice(1).map((x) => length(x, U)),
        ),
      };
    },
  },
  {
    skill: "Trig equations on [0°, 360°)",
    make(r) {
      const f = r.pick("f", ["sin", "cos", "tan"] as Fn[]);
      const sigma = r.sign("sigma");
      const u = r.pick("u", Object.keys(CALCULATOR[f]));
      const a = r.pick("a", LEADS[u]);
      const print = r.pick("print", ["value", "zero"]);
      const [x, y] = r.pick("pair", setPairs(f, sigma, u));
      const c = scaled(SIZES[u], a * sigma);
      const lead = `${a === 1 ? "" : `${a} `}${f} x`;
      const equation =
        print === "value"
          ? `${lead} = ${exactText(c)}`
          : `${lead} ${sigma < 0 ? "+" : MINUS} ${exactText(scaled(c, sigma))} = 0`;
      const bank = Object.fromEntries(setBank(f, sigma, u));
      return {
        prompt: `Solve ${equation} for 0° ≤ x < 360°.`,
        ...three(setChoice(solved(f, sigma, u)), [
          setChoice(bank[x]),
          setChoice(bank[y]),
        ]),
      };
    },
  },
];

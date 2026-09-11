import { type Level, type Rng, NAMES, choice, int, whole } from "./kit.ts";

export const name = "Multiplication and Division";

const ROW_ITEMS = [
  "chairs",
  "tiles",
  "cookies",
  "stickers",
  "stamps",
  "plants",
];
const SHARED_ITEMS = [
  "stickers",
  "cookies",
  "marbles",
  "beads",
  "stamps",
  "shells",
];
const HOLDER: Record<string, string> = {
  bags: "bag",
  boxes: "box",
  baskets: "basket",
  jars: "jar",
  trays: "tray",
};
const SCENES = [
  ["children", "bus"],
  ["books", "box"],
  ["cupcakes", "tray"],
  ["apples", "basket"],
  ["photos", "page"],
  ["marbles", "jar"],
];
const GROUPS: Record<string, string> = {
  bus: "buses",
  box: "boxes",
  tray: "trays",
  basket: "baskets",
  page: "pages",
  jar: "jars",
};
const ones = (n: number) => n % 10;
const tens = (n: number) => Math.floor(n / 10) % 10;
const quot = (a: number, b: number) => Math.floor(a / b);
const rem = (a: number, b: number) => a % b;
const split = (q: number, r: number) =>
  choice(`${int(q)} R ${int(r)}`, `qr:${q},${r}`);
const factors = (r: Rng) =>
  r.exclude(
    () => ({ a: r.int("a", 2, 9), b: r.int("b", 2, 9) }),
    ({ a, b }) => a === 2 && b === 2,
  );

export const levels: Level[] = [
  {
    skill: "Multiplication facts",
    make(r) {
      const { a, b } = factors(r);
      const d2 = a + b;
      let s = r.sign("s");
      if (a * (b + s) === d2) s = -s;
      return {
        prompt: `${a} × ${b} = ?`,
        answer: whole(a * b),
        wrong: [whole(a * (b + s)), whole(d2)],
      };
    },
  },
  {
    skill: "Division facts",
    make(r) {
      const { a, b } = factors(r);
      const c = a * b;
      const d2 = c - b;
      let s = r.sign("s");
      if (a + s === d2) s = -s;
      return {
        prompt: `${c} ÷ ${b} = ?`,
        answer: whole(a),
        wrong: [whole(a + s), whole(d2)],
      };
    },
  },
  {
    skill: "Missing factor",
    make(r) {
      const form = r.pick("F", [1, 2]);
      const { a, b } = factors(r);
      const c = a * b;
      let s = r.sign("s");
      if (form === 1) {
        const d1 = c - a;
        if (b + s === d1) s = -s;
        return {
          prompt: `${a} × ? = ${c}`,
          answer: whole(b),
          wrong: [whole(d1), whole(b + s)],
        };
      }
      const d1 = a + b;
      if ((a + s) * b === d1) s = -s;
      return {
        prompt: `? ÷ ${b} = ${a}`,
        answer: whole(c),
        wrong: [whole(d1), whole((a + s) * b)],
      };
    },
  },
  {
    skill: "Multiples of 10 and 100",
    make(r) {
      const form = r.pick("F", [1, 2, 3]);
      const a = r.int("a", 2, 9);
      let prompt: string;
      let n: number;
      let d2: number;
      if (form === 1) {
        prompt = `${a} × 10 = ?`;
        n = 10 * a;
        d2 = a + 10;
      } else if (form === 2) {
        prompt = `${a} × 100 = ?`;
        n = 100 * a;
        d2 = a + 100;
      } else {
        const b = r.int("b", 2, 9);
        prompt = `${10 * a} × ${b} = ?`;
        n = 10 * a * b;
        d2 = 10 * a + b;
      }
      const s = r.sign("s");
      return {
        prompt,
        answer: whole(n),
        wrong: [whole(s === 1 ? n * 10 : n / 10), whole(d2)],
      };
    },
  },
  {
    skill: "Two-digit × one-digit",
    make(r) {
      const { tm, om, c } = r.resample(
        () => ({
          tm: r.int("tm", 1, 9),
          om: r.int("om", 2, 9),
          c: r.int("c", 3, 9),
        }),
        ({ om, c }) => om * c >= 10,
      );
      const m = 10 * tm + om;
      const k = quot(om * c, 10);
      const s = r.sign("s");
      const n = m * c;
      return {
        prompt: `${m} × ${c} = ?`,
        answer: whole(n),
        wrong: [whole(n - 10 * k), whole(n + 10 * s * c)],
      };
    },
  },
  {
    skill: "Equal groups and sharing",
    make(r) {
      const form = r.pick("form", ["A", "B"]);
      const P = r.pick("P", NAMES);
      let s = r.sign("s");
      if (form === "A") {
        const rows = r.int("r", 3, 9);
        const m = r.int("m", 3, 9);
        const item = r.pick("item", ROW_ITEMS);
        const n = rows * m;
        const d1 = rows + m;
        if (n + s * m === d1) s = -s;
        return {
          prompt: `${P} sets out ${rows} rows of ${m} ${item}. How many ${item} in total?`,
          answer: whole(n),
          wrong: [whole(d1), whole(n + s * m)],
        };
      }
      const g = r.int("g", 3, 9);
      const q = r.int("q", 2, 12);
      const t = g * q;
      const item = r.pick("item", SHARED_ITEMS);
      const holders = r.pick("holder", Object.keys(HOLDER));
      const d1 = t - g;
      if (q + s === d1) s = -s;
      return {
        prompt: `${P} shares ${t} ${item} equally among ${g} ${holders}. How many ${item} in each ${HOLDER[holders]}?`,
        answer: whole(q),
        wrong: [whole(d1), whole(q + s)],
      };
    },
  },
  {
    skill: "Division with a remainder",
    make(r) {
      const { a, b } = r.resample(
        () => ({ a: r.int("a", 20, 99), b: r.int("b", 3, 9) }),
        ({ a, b }) => rem(a, b) !== 0,
      );
      const q = quot(a, b);
      const left = rem(a, b);
      const half = b === 2 * left;
      return {
        prompt: `${a} ÷ ${b} = ?`,
        answer: split(q, left),
        wrong: [
          half ? split(q + 1, left) : split(q, b - left),
          left !== q ? split(left, q) : split(half ? q - 1 : q + 1, left),
        ],
      };
    },
  },
  {
    skill: "Two-digit × two-digit",
    make(r) {
      const { u, v } = r.exclude(
        () => ({ u: r.int("u", 11, 30), v: r.int("v", 11, 30) }),
        ({ u, v }) => ones(u) === 0 && ones(v) === 0,
      );
      const d1 = 100 * tens(u) * tens(v) + ones(u) * ones(v);
      let s = r.sign("s");
      if (u * (v + s) === d1) s = -s;
      return {
        prompt: `${u} × ${v} = ?`,
        answer: whole(u * v),
        wrong: [whole(d1), whole(u * (v + s))],
      };
    },
  },
  {
    skill: "Three-digit ÷ one-digit, exact",
    make(r) {
      const d = r.int("d", 3, 9);
      const zflag = r.int("zflag", 1, 3);
      let q: number;
      let dropped = 0;
      if (zflag === 1) {
        const { h, o } = r.exclude(
          () => ({ h: r.int("h", 1, 9), o: r.int("o", 1, 9) }),
          ({ h, o }) => d * (100 * h + o) > 999,
        );
        q = 100 * h + o;
        dropped = 10 * h + o;
      } else
        q = r.exclude(
          () => r.int("q", Math.ceil(100 / d), quot(999, d)),
          (q) => q >= 100 && tens(q) === 0,
        );
      const s = r.sign("s");
      const d2 = zflag === 1 ? dropped : q + r.sign("s2");
      return {
        prompt: `${d * q} ÷ ${d} = ?`,
        answer: whole(q),
        wrong: [whole(q + 10 * s), whole(d2)],
      };
    },
  },
  {
    skill: "Interpret the remainder",
    make(r) {
      const { b, n } = r.resample(
        () => ({ b: r.int("b", 4, 12), n: r.int("n", 30, 200) }),
        ({ b, n }) => {
          const q = quot(n, b);
          const left = rem(n, b);
          return left !== 0 && new Set([q, q + 1, left, b - left]).size === 4;
        },
      );
      const q = quot(n, b);
      const left = rem(n, b);
      const ask = r.pick("ask", ["needed", "full", "left"]);
      const [item, group] = r.pick("scene", SCENES);
      const groups = GROUPS[group];
      const stem = `There are ${n} ${item}. Each ${group} holds ${b} ${item}.`;
      if (ask === "needed")
        return {
          prompt: `${stem} How many ${groups} are needed?`,
          answer: whole(q + 1),
          wrong: [whole(q), whole(left)],
        };
      if (ask === "full")
        return {
          prompt: `${stem} How many ${groups} are completely full?`,
          answer: whole(q),
          wrong: [whole(q + 1), whole(left)],
        };
      return {
        prompt: `${stem} When as many ${groups} as possible are filled, how many ${item} are left over?`,
        answer: whole(left),
        wrong: [whole(q), whole(b - left)],
      };
    },
  },
];

import {
  type Level,
  NAMES,
  Rat,
  dec,
  duration,
  int,
  label,
  money,
  num,
  q,
  range,
  roundHalfUp,
  time12,
} from "./kit.ts";

export const name = "Measurement, Time, and Money";

const EVENTS = ["class", "film", "hike", "rehearsal", "match"];
const GIFTS = ["book", "shirt", "puzzle", "mug", "kite"];
const GOODS = ["notebooks", "apples", "candles", "socks", "markers"];
const PACKS = ["pens", "apples", "batteries", "bagels", "cookies"];
const FIVES = range(0, 11).map((i) => 5 * i);
const PRICES = range(21, 199).map((i) => 5 * i);
const LADDER = [5, 10, 20, 50];

type Coin = "Q" | "D" | "N" | "P";
const COINS: Record<
  Coin,
  { value: number; swapped: number; most: number; one: string; many: string }
> = {
  Q: { value: 25, swapped: 25, most: 4, one: "quarter", many: "quarters" },
  D: { value: 10, swapped: 5, most: 5, one: "dime", many: "dimes" },
  N: { value: 5, swapped: 10, most: 5, one: "nickel", many: "nickels" },
  P: { value: 1, swapped: 1, most: 4, one: "penny", many: "pennies" },
};
const KINDS = [
  "QD",
  "QN",
  "QP",
  "DN",
  "DP",
  "NP",
  "QDN",
  "QDP",
  "QNP",
  "DNP",
].filter((set) => /[DN]/.test(set));

const METRIC: Record<string, readonly [su: string, bu: string, f: number]> = {
  "mm/cm": ["mm", "cm", 10],
  "cm/m": ["cm", "m", 100],
  "m/km": ["m", "km", 1000],
  "g/kg": ["g", "kg", 1000],
  "mL/L": ["mL", "L", 1000],
};
const CUSTOMARY: Record<
  string,
  readonly [bu: string, su: string, f: number, g: number]
> = {
  "ft/in": ["ft", "in", 12, 10],
  "lb/oz": ["lb", "oz", 16, 10],
  "h/min": ["h", "min", 60, 100],
  "min/s": ["min", "s", 60, 100],
};
type Slip = readonly [
  su: string,
  bu: string,
  f: number,
  g: number,
  adj: string,
];
const SHRUNK: Record<string, Slip> = {
  "cm/m": ["cm", "m", 100, 10, "longer"],
  "m/km": ["m", "km", 1000, 100, "longer"],
  "g/kg": ["g", "kg", 1000, 100, "heavier"],
  "mL/L": ["mL", "L", 1000, 100, "more"],
  "in/ft": ["in", "ft", 12, 10, "longer"],
  "oz/lb": ["oz", "lb", 16, 10, "heavier"],
};
const STRETCHED: Record<string, Slip> = {
  "mm/cm": ["mm", "cm", 10, 100, "longer"],
  "cm/m": ["cm", "m", 100, 1000, "longer"],
  "min/h": ["min", "h", 60, 100, "longer"],
  "s/min": ["s", "min", 60, 100, "longer"],
};

const counted = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
const listed = (parts: readonly string[]) =>
  `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
const cash = (cents: number) => num(q(cents, 100), money(q(cents, 100)));
const day = (minutes: number) => ((minutes % 1440) + 1440) % 1440;
const blk = (minutes: number) => Math.floor(minutes / 720);
const clock = (minutes: number) => num(day(minutes), time12(minutes));
const span = (minutes: number) => num(minutes, duration(minutes));
const measure = (value: Rat, unit: string) =>
  num(value, `${dec(value, undefined, true)} ${unit}`);
const tail = (x: Rat) => dec(x).split(".")[1] ?? "";
const dp = (x: Rat) => tail(x).length;
const digits = (x: Rat) => Number(tail(x) || "0");
const twoPlaces = (x: Rat) => x.mul(100).isInt();

export const levels: Level[] = [
  {
    skill: "Count coins and bills",
    make(r) {
      const form = r.pick("form", ["B", "C"]);
      const bills = form === "B" ? r.int("b", 1, 3) : 0;
      const kinds = [
        ...r.pick(
          "kinds",
          KINDS.filter((set) => set.length === (form === "B" ? 2 : 3)),
        ),
      ] as Coin[];
      const count = r.exclude(
        () =>
          kinds.map((kind) => r.int(kind.toLowerCase(), 1, COINS[kind].most)),
        (counts) =>
          kinds.includes("D") &&
          kinds.includes("N") &&
          counts[kinds.indexOf("D")] === counts[kinds.indexOf("N")],
      );
      const sum = (value: (kind: Coin) => number) =>
        kinds.reduce((total, kind, i) => total + value(kind) * count[i], 0);
      const coins = sum(() => 1);
      const total = 100 * bills + sum((kind) => COINS[kind].value);
      const d1 = 100 * bills + sum((kind) => COINS[kind].swapped);
      let d2 = 100 * bills + 10 * coins;
      if (d2 === total || d2 === d1)
        d2 =
          100 * bills +
          Math.max(...kinds.map((kind) => COINS[kind].value)) * coins;
      const parts = kinds.map((kind, i) =>
        counted(count[i], COINS[kind].one, COINS[kind].many),
      );
      if (bills) parts.unshift(counted(bills, "$1 bill", "$1 bills"));
      return {
        prompt: `How much money is ${listed(parts)}?`,
        answer: cash(total),
        wrong: [cash(d1), cash(d2)],
      };
    },
  },
  {
    skill: "Elapsed time, whole and half hours",
    make(r) {
      const { start, length, M } = r.exclude(
        () => {
          const mer = r.pick("mer", ["AM", "PM"]);
          const h = r.pick("h", [12, ...range(1, 11)]);
          const sm = r.pick("sm", [0, 30]);
          const H = r.int("H", 1, 5);
          const M = r.pick("M", [0, 30]);
          return {
            start: (mer === "PM" ? 720 : 0) + 60 * (h % 12) + sm,
            length: 60 * H + M,
            sm,
            M,
          };
        },
        ({ start, length, sm, M }) => {
          const end = start + length;
          return (
            start < 6 * 60 ||
            start > 20 * 60 + 30 ||
            length < 90 ||
            (sm !== 30 && M !== 30) ||
            blk(end) !== blk(start) ||
            (M === 30 && blk(end + 20) !== blk(start))
          );
        },
      );
      const end = start + length;
      const s = blk(end + 60) === blk(start) ? r.sign("s") : -1;
      const event = r.pick("event", EVENTS);
      return {
        prompt: `A ${event} starts at ${time12(start)} and lasts ${duration(length)}. What time does it end?`,
        answer: clock(end),
        wrong: [clock(end + 60 * s), clock(M === 30 ? end + 20 : end - 30)],
      };
    },
  },
  {
    skill: "Metric conversions",
    make(r) {
      const dir = r.pick("dir", ["SB", "BS"]);
      const pairs = Object.keys(METRIC).filter(
        (pair) => dir === "SB" || pair !== "mm/cm",
      );
      const [su, bu, f] = METRIC[r.pick("pair", pairs)];
      const s = f / 10 >= 10 ? r.sign("s") : 1;
      const g = s === 1 ? f * 10 : f / 10;
      if (dir === "SB") {
        const x = r.resample(
          () => r.int("x", q(5 * f, 100).ceil(), q(999 * f, 100).floor()),
          (x) => twoPlaces(q(x, f)) && !q(x, f).isInt() && twoPlaces(q(x, g)),
        );
        const answer = q(x, f);
        const v = x >= f ? r.pick("v", ["N", "W"]) : "N";
        return {
          prompt: `${int(x, true)} ${su} = ? ${bu}`,
          answer: measure(answer, bu),
          wrong: [
            measure(q(x, g), bu),
            measure(v === "N" ? q(x) : q(answer.floor()), bu),
          ],
        };
      }
      const x = q(
        r.resample(
          () => r.int("x100", 100, 999),
          (k) => dp(q(k, 100)) >= 1 && f !== 10 ** dp(q(k, 100)),
        ),
        100,
      );
      return {
        prompt: `${dec(x)} ${bu} = ? ${su}`,
        answer: measure(x.mul(f), su),
        wrong: [
          measure(x.mul(g), su),
          measure(q(x.floor() * f + digits(x)), su),
        ],
      };
    },
  },
  {
    skill: "Making change",
    make(r) {
      const B = r.pick("B", [5, 10, 20]);
      const P = r.resample(
        () => r.int("P", 105, 100 * B - 101),
        (P) => P % 100 !== 0,
      );
      const v = r.pick("v", ["B", "D"]);
      const rung = LADDER.indexOf(B);
      const s = rung > 0 && 100 * LADDER[rung - 1] - P >= 100 ? r.sign("s") : 1;
      const item = r.pick("item", GIFTS);
      const price = q(P, 100);
      const change = 100 * B - P;
      return {
        prompt: `A ${item} costs ${money(price)}. You pay with a ${money(B, 0)} bill. How much change?`,
        answer: cash(change),
        wrong: [
          cash(v === "B" ? change + 100 : 100 * (B - price.ceil())),
          cash(100 * LADDER[rung + s] - P),
        ],
      };
    },
  },
  {
    skill: "Elapsed time across the hour",
    make(r) {
      const { start, m1, H, M } = r.exclude(
        () => {
          const h1 = r.int("h1", 6, 19);
          const m1 = r.pick("m1", FIVES.slice(1));
          const H = r.int("H", 2, 5);
          const M = r.pick(
            "M",
            FIVES.slice(1).filter((m) => m !== 30),
          );
          return { start: 60 * h1 + m1, m1, H, M };
        },
        ({ start, m1, H, M }) =>
          m1 + M <= 60 || start + 60 * H + M > 23 * 60 + 55,
      );
      const T = 60 * H + M;
      const v = r.pick("v", ["W", "L"]);
      const s = r.sign("s");
      const event = r.pick("event", EVENTS);
      return {
        prompt: `A ${event} starts at ${time12(start)} and ends at ${time12(start + T)}. How long is it?`,
        answer: span(T),
        wrong: [
          span(v === "W" ? T + 120 - 2 * M : T - (60 - m1)),
          span(T + 60 * s),
        ],
      };
    },
  },
  {
    skill: "Customary and time unit conversions",
    make(r) {
      const form = r.pick("form", ["M", "S"]);
      const [bu, su, f, g] = CUSTOMARY[r.pick("pair", Object.keys(CUSTOMARY))];
      const { a, b } = r.exclude(
        () => ({ a: r.int("a", 1, 9), b: r.int("b", 1, f - 1) }),
        ({ a, b }) => {
          const n = a * f + b;
          return (
            a === b ||
            (form === "M" ? f === 60 && b > 30 : n < g || n % g >= f)
          );
        },
      );
      const n = a * f + b;
      if (form === "M") {
        const v = r.pick("v", ["L", "B"]);
        const d1 = a * g + b;
        let d2 = v === "L" ? a * f : f * (a + b);
        if (d2 === n || d2 === d1) d2 = a + b;
        const small = (value: number) =>
          num(value, `${int(value, true)} ${su}`);
        return {
          prompt: `${a} ${bu} ${b} ${su} = ? ${su}`,
          answer: small(n),
          wrong: [small(d1), small(d2)],
        };
      }
      const worth = ([big, rest]: readonly number[]) => big * f + rest;
      const both = ([big, rest]: readonly number[]) =>
        num(big * f + rest, `${int(big, true)} ${bu} ${int(rest, true)} ${su}`);
      const slipped = [Math.floor(n / g), n % g];
      let flipped = [b, a];
      if (worth(flipped) === n || worth(flipped) === worth(slipped))
        flipped = [a, f - b];
      return {
        prompt: `${int(n, true)} ${su} = ? ${bu} ? ${su}`,
        answer: both([Math.floor(n / f), n % f]),
        wrong: [both(slipped), both(flipped)],
      };
    },
  },
  {
    skill: "Compare measures in mixed units",
    make(r) {
      const mode = r.pick("mode", ["A", "B", "E"]);
      const table = mode === "A" ? SHRUNK : STRETCHED;
      const [su, bu, f, g, adj] = table[r.pick("pair", Object.keys(table))];
      const factor = mode === "E" ? f : g;
      const X = q(
        r.resample(
          () => r.int("X100", 50, 999),
          (k) => q(k * factor, 100).isInt(),
        ),
        100,
      );
      const Y = X.mul(factor).n;
      const big = label(`${dec(X)} ${bu}`);
      const small = label(`${int(Y, true)} ${su}`);
      const equal = label("They are equal.");
      const verdict = (order: number) =>
        order > 0 ? big : order < 0 ? small : equal;
      return {
        prompt: `Which is ${adj}: ${big.text} or ${small.text}?`,
        answer: verdict(X.cmp(q(Y, f))),
        wrong: [
          mode === "B" ? big : verdict(X.cmp(Y)),
          verdict(X.cmp(q(Y, g))),
        ],
      };
    },
  },
  {
    skill: "Multi-step money word problem",
    make(r) {
      const { k, p, B, s } = r.exclude(
        () => ({
          k: r.int("k", 2, 5),
          p: r.pick("p", PRICES),
          B: r.pick("B", [10, 20, 50]),
          s: r.sign("s"),
        }),
        ({ k, p, B, s }) => {
          const total = k * p;
          const change = 100 * B - total;
          const slip = 100 * B - (k + s) * p;
          return (
            total > 5000 ||
            change < 100 ||
            slip <= 0 ||
            new Set([change, total, slip]).size < 3
          );
        },
      );
      const who = r.pick("name", NAMES);
      const items = r.pick("items", GOODS);
      return {
        prompt: `${who} buys ${k} ${items} at ${money(q(p, 100))} each and pays with a ${money(B, 0)} bill. How much change?`,
        answer: cash(100 * B - k * p),
        wrong: [cash(k * p), cash(100 * B - (k + s) * p)],
      };
    },
  },
  {
    skill: "Elapsed time crossing noon or midnight",
    make(r) {
      const { t, d } = r.exclude(
        () => {
          const h = r.int("h", 0, 23);
          const m = r.pick("m", FIVES);
          const H = r.int("H", 1, 5);
          const M = r.pick("M", FIVES);
          return { t: 60 * h + m, d: 60 * H + M };
        },
        ({ t, d }) => d < 65 || blk(t + d) - blk(t) !== 1,
      );
      const end = t + d;
      const s = r.resample(
        () => r.sign("s"),
        (s) => day(end + 60 * s) !== day(t),
      );
      return {
        prompt: `It is ${time12(t)}. What time will it be ${duration(d)} later?`,
        answer: clock(end),
        wrong: [clock(end + 720), clock(end + 60 * s)],
      };
    },
  },
  {
    skill: "Unit price and best buy",
    make(r) {
      const mode = r.pick("mode", ["A", "B", "S"]);
      const { n1, n2, u1, u2 } = r.exclude(
        () => {
          const n1 = r.int("n1", 2, 8);
          const n2 = r.int("n2", 2, 8);
          if (mode === "S") {
            const u = r.pick(
              "u",
              range(10, 40).map((i) => 5 * i),
            );
            return { n1, n2, u1: u, u2: u };
          }
          const t = r.pick(
            "t",
            range(6, 20).map((i) => 10 * i),
          );
          return {
            n1,
            n2,
            u1: r.int("u1", t - 5, t + 4),
            u2: r.int("u2", t - 5, t + 4),
          };
        },
        ({ n1, n2, u1, u2 }) =>
          n1 >= n2 ||
          n1 * u1 >= n2 * u2 ||
          n2 * u2 > 3000 ||
          (mode === "A" && u2 - u1 < 5) ||
          (mode === "B" && u1 - u2 < 5),
      );
      const item = r.pick("item", PACKS);
      const c1 = n1 * u1;
      const c2 = n2 * u2;
      const one = label(`${n1} ${item} for ${money(q(c1, 100))}`);
      const two = label(`${n2} ${item} for ${money(q(c2, 100))}`);
      const same = label("They are the same value.");
      const cheaper = (x: Rat, y: Rat) => {
        const order = x.cmp(y);
        return order < 0 ? one : order > 0 ? two : same;
      };
      const moreItems = n2 > n1 ? two : one;
      const smallerTotal = c1 < c2 ? one : two;
      const rounded = (c: number, n: number) => roundHalfUp(q(c, 100 * n), 1);
      return {
        prompt: `Which is the better buy: ${one.text} or ${two.text}?`,
        answer: cheaper(q(c1, n1), q(c2, n2)),
        wrong: [
          mode === "A" ? moreItems : smallerTotal,
          mode === "S"
            ? moreItems
            : cheaper(rounded(c1, n1), rounded(c2, n2)),
        ],
      };
    },
  },
];

import {
  type Choice,
  type Draft,
  type Level,
  type Rng,
  NAMES,
  Rat,
  dec,
  distinctValues,
  gcd,
  label,
  money,
  num,
  range,
  ratio,
  roundHalfUp,
  whole,
} from "./kit.ts";

export const name = "Ratios, Rates, and Proportions";

const PAIRS = [
  "cats/dogs",
  "hens/ducks",
  "apples/pears",
  "red beads/blue beads",
  "oak trees/pine trees",
  "roses/tulips",
  "pens/pencils",
  "green tiles/white tiles",
];
const RATES: Record<string, readonly [number, number]> = {
  speed: [15, 120],
  typing: [15, 70],
  reading: [8, 40],
  price: [2, 9],
};
const VEHICLES: readonly (readonly [string, number, number])[] = [
  ["cyclist", 15, 35],
  ["ferry", 25, 50],
  ["bus", 30, 70],
  ["coach", 40, 90],
  ["train", 50, 120],
];
const MIXES: Record<string, readonly [string, string, string, string]> = {
  "flour/sugar": ["recipe", "cups", "flour", "sugar"],
  "oats/raisins": ["recipe", "cups", "oats", "raisins"],
  "blue/white paint": ["paint mix", "tins", "blue paint", "white paint"],
  "red/yellow paint": ["paint mix", "tins", "red paint", "yellow paint"],
  "juice/soda": ["punch", "cups", "juice", "soda"],
};
const PRICED = ["pens", "erasers", "apples", "candles"];
const SHARED = ["stickers", "marbles", "sweets", "cards", "coins"];
const OFFERED = ["pencils", "oranges", "sponges", "muffins", "tennis balls"];
const FEATURES = ["road", "river", "trail", "railway", "canal"];
const SETTINGS = [
  "workers/days/paint a hall",
  "taps/minutes/fill a tank",
  "machines/hours/print an order",
  "pickers/days/clear a field",
];
const CENTS = range(8, 60).map((k) => 5 * k);
const READINGS = range(4, 25).flatMap((t) =>
  range(3, 40)
    .filter((x) => (10 * x) % t === 0)
    .map((x) => [x, t] as const),
);
const HOURS: readonly (readonly [number, number])[] = [
  [6, 5],
  [3, 2],
  [2, 1],
  [5, 2],
  [3, 1],
  [4, 1],
  [5, 1],
  [6, 1],
];
const LEAD: Record<string, number> = { A: 1, B: -1, E: 0 };

const plain = (v: Rat) => dec(v, v.isInt() ? 0 : 1);
const part = (v: Rat) => num(v, ratio(v.n, v.d));
const measure = (v: Rat | number, unit: string) =>
  num(v, `${plain(Rat.of(v))} ${unit}`);
const cash = (v: number) => num(v, money(v));
const riding = (r: Rng, speed: Rat | number) =>
  r.pick(
    "veh",
    VEHICLES.filter(
      ([, lo, hi]) => Rat.of(speed).cmp(lo) >= 0 && Rat.of(speed).cmp(hi) <= 0,
    ).map(([vehicle]) => vehicle),
  );
const coprimePair = (
  r: Rng,
  [first, second]: readonly [string, string],
  lo: number,
  hi: number,
) =>
  r.exclude(
    () => [r.int(first, lo, hi), r.int(second, lo, hi)] as const,
    ([a, b]) => a === b || gcd(a, b) !== 1,
  );
function near(x: Rat, y: Rat) {
  const gap = x.sub(y).abs();
  const low = x.cmp(y) < 0 ? x : y;
  return gap.mul(20).cmp(low) >= 0 && gap.mul(4).cmp(low) <= 0;
}
function pricesFit(mode: string, u1: number, u2: number) {
  const tens = (u: number) => roundHalfUp(new Rat(u, 100), 1);
  return (
    Math.sign(u2 - u1) === LEAD[mode] &&
    (mode === "E" || near(new Rat(u1), new Rat(u2))) &&
    tens(u1).eq(tens(u2))
  );
}
function ratesFit(mode: string, one: Rat, two: Rat) {
  const halves = (v: Rat) => roundHalfUp(v.mul(2));
  return (
    one.cmp(two) === LEAD[mode] &&
    (mode === "E" || near(one, two)) &&
    halves(one).eq(halves(two))
  );
}
function judged(
  mode: string,
  prompt: string,
  first: Choice,
  second: Choice,
  same: Choice,
): Draft {
  if (mode === "A") return { prompt, answer: first, wrong: [second, same] };
  if (mode === "B") return { prompt, answer: second, wrong: [first, same] };
  return { prompt, answer: same, wrong: [second, first] };
}

export const levels: Level[] = [
  {
    skill: "Write a ratio",
    make(r) {
      const [a, b] = coprimePair(r, ["a", "b"], 2, 12);
      const ord = r.pick("ord", ["XY", "YX"]);
      const [X, Y] = r.pick("pair", PAIRS).split("/");
      const [first, second] = ord === "XY" ? [a, b] : [b, a];
      const asked = ord === "XY" ? `${X} to ${Y}` : `${Y} to ${X}`;
      return {
        prompt: `There are ${a} ${X} and ${b} ${Y}. What is the ratio of ${asked}?`,
        answer: part(new Rat(first, second)),
        wrong: [part(new Rat(second, first)), part(new Rat(first, a + b))],
      };
    },
  },
  {
    skill: "Simplify a ratio",
    make(r) {
      const { A, B } = r.exclude(
        () => ({ A: r.int("A", 2, 60), B: r.int("B", 2, 60) }),
        ({ A, B }) => A === B || gcd(A, B) < 2 || A % B === 0 || B % A === 0,
      );
      const g = gcd(A, B);
      return {
        prompt: `Write ${ratio(A, B)} in its simplest form.`,
        answer: part(new Rat(A / g, B / g)),
        wrong: [part(new Rat(B / g, A / g)), part(new Rat(A - g, B - g))],
      };
    },
  },
  {
    skill: "Unit rate",
    make(r) {
      const kind = r.pick("kind", ["speed", "typing", "reading", "price"]);
      const [lo, hi] = RATES[kind];
      const { t, rate, s } = r.exclude(
        () => ({
          t: r.int("t", 3, 9),
          rate: r.int("r", lo, hi),
          s: r.sign("s"),
        }),
        ({ t, rate, s }) => t + s < 2 || (rate * t) % (t + s) !== 0,
      );
      const total = rate * t;
      let prompt: string;
      let show: (v: number) => Choice;
      if (kind === "speed") {
        const veh = riding(r, rate);
        prompt = `A ${veh} travels ${total} km in ${t} hours. What is the speed?`;
        show = (v) => measure(v, "km/h");
      } else if (kind === "price") {
        const item = r.pick("item", PRICED);
        prompt = `${t} ${item} cost ${money(total)}. What does one cost?`;
        show = cash;
      } else {
        const who = r.pick("name", NAMES);
        prompt =
          kind === "typing"
            ? `${who} types ${total} words in ${t} minutes. What is ${who}'s rate?`
            : `${who} reads ${total} pages in ${t} hours. How many pages per hour?`;
        const unit = kind === "typing" ? "words per minute" : "pages per hour";
        show = (v) => measure(v, unit);
      }
      return {
        prompt,
        answer: show(rate),
        wrong: [show(total), show(total / (t + s))],
      };
    },
  },
  {
    skill: "Scale a ratio by a whole-number factor",
    make(r) {
      const [a, b] = coprimePair(r, ["a", "b"], 2, 12);
      const k = r.int("k", 2, Math.min(6, Math.floor(36 / a)));
      const s = r.sign("s");
      const [maker, unit, X, Y] = MIXES[r.pick("mix", Object.keys(MIXES))];
      const answer = k * b;
      const additive = b + a * (k - 1);
      const off = [answer, additive].includes(b * (k + s))
        ? b * (k - s)
        : b * (k + s);
      return {
        prompt: `A ${maker} uses ${a} ${unit} of ${X} for every ${b} ${unit} of ${Y}. How many ${unit} of ${Y} are needed for ${k * a} ${unit} of ${X}?`,
        answer: measure(answer, unit),
        wrong: [measure(additive, unit), measure(off, unit)],
      };
    },
  },
  {
    skill: "Share by a ratio",
    make(r) {
      const [p, q] = coprimePair(r, ["p", "q"], 2, 9);
      const w = r.pick("w", [1, 2]);
      const v = r.pick("v", ["S", "H"]);
      const m = r.resample(
        () => r.int("m", 2, 12),
        (m) => v === "S" || (m * (p + q)) % 2 === 0,
      );
      const total = m * (p + q);
      const first = r.pick("N1", NAMES);
      const second = r.pick(
        "N2",
        NAMES.filter((n) => n !== first),
      );
      const item = r.pick("item", SHARED);
      const [mine, theirs] = w === 1 ? [m * p, m * q] : [m * q, m * p];
      return {
        prompt: `${total} ${item} are shared between ${first} and ${second} in the ratio ${ratio(p, q)}. How many does ${w === 1 ? first : second} get?`,
        answer: whole(mine),
        wrong: [whole(theirs), whole(v === "S" ? m : total / 2)],
      };
    },
  },
  {
    skill: "Compare rates",
    make(r) {
      const fam = r.pick("fam", ["V", "R"]);
      const mode = r.pick("mode", ["A", "B", "E"]);
      if (fam === "V") {
        const pairs = CENTS.flatMap((u1) =>
          CENTS.filter((u2) => pricesFit(mode, u1, u2)).map(
            (u2) => [u1, u2] as const,
          ),
        );
        const { n1, n2, u } = r.exclude(
          () => ({
            n1: r.int("n1", 2, 9),
            n2: r.int("n2", 2, 9),
            u: r.pick("u", pairs),
          }),
          ({ n1, n2, u: [u1, u2] }) =>
            n1 >= n2 || n1 * u1 >= n2 * u2 || n2 * u2 > 3000,
        );
        const item = r.pick("item", OFFERED);
        const offer = (n: number, cents: number) =>
          label(`${n} ${item} for ${money(new Rat(cents, 100))}`);
        const first = offer(n1, n1 * u[0]);
        const second = offer(n2, n2 * u[1]);
        return judged(
          mode,
          `Which is better value: ${first.text}, or ${second.text}?`,
          first,
          second,
          label("They are the same value."),
        );
      }
      const { one, two } = r.exclude(
        () => ({ one: r.pick("one", READINGS), two: r.pick("two", READINGS) }),
        ({ one: [x1, t1], two: [x2, t2] }) =>
          t1 >= t2 ||
          x1 >= x2 ||
          !ratesFit(mode, new Rat(x1, t1), new Rat(x2, t2)),
      );
      const act = r.pick("act", ["read", "swim"]);
      const first = r.pick("N1", NAMES);
      const second = r.pick(
        "N2",
        NAMES.filter((n) => n !== first),
      );
      const unit = act === "read" ? "pages" : "laps";
      return judged(
        mode,
        `${first} ${act}s ${one[0]} ${unit} in ${one[1]} minutes. ${second} ${act}s ${two[0]} ${unit} in ${two[1]} minutes. Who ${act}s faster?`,
        label(first),
        label(second),
        label(`They ${act} at the same rate.`),
      );
    },
  },
  {
    skill: "Solve a proportion with a non-whole factor",
    make(r) {
      const { a, b, k } = r.exclude(
        () => ({
          a: r.pick("a", [3, 5, 7, 9, 11, 13, 15]),
          b: r.pick("b", [2, 4, 6, 8, 10, 12, 14]),
          k: r.int("k", 1, 19),
        }),
        ({ a, b, k }) => {
          const f = new Rat(2 * k + 1, 2);
          return (
            gcd(a, b) !== 1 || f.mul(b).cmp(99) > 0 || f.mul(a).cmp(150) > 0
          );
        },
      );
      const s = r.sign("s");
      const f = new Rat(2 * k + 1, 2);
      const value = (v: Rat) => num(v, plain(v));
      return {
        prompt: `What is x?   ${a}/${b} = x/${plain(f.mul(b))}`,
        answer: value(f.mul(a)),
        wrong: [
          value(f.add(s).mul(a)),
          value(new Rat(a * k).add(new Rat(1, 2))),
        ],
      };
    },
  },
  {
    skill: "Scale drawings and maps",
    make(r) {
      const { S, mm } = r.exclude(
        () => ({
          S: r.pick("S", [5, 10, 20, 25, 50]),
          mm: r.int("mm", 11, 149),
        }),
        ({ S, mm }) => mm % 10 === 0 || new Rat(mm * S, 10).cmp(500) > 0,
      );
      const feature = r.pick("feature", FEATURES);
      const m = new Rat(mm, 10);
      return {
        prompt: `On a map, 1 cm represents ${S} km. A ${feature} measures ${plain(m)} cm on the map. How long is the real ${feature}?`,
        answer: measure(m.mul(S), "km"),
        wrong: [measure(roundHalfUp(m).mul(S), "km"), measure(m.add(S), "km")],
      };
    },
  },
  {
    skill: "Speed, distance and time",
    make(r) {
      const form = r.pick("form", ["D", "T", "R"]);
      const v = r.pick("v", ["A", "B"]);
      if (form === "D") {
        const { speed, t, values } = r.exclude(
          () => {
            const speed = r.pick(
              "r",
              range(4, 20).map((k) => 5 * k),
            );
            const t = r.pick(
              "t",
              range(14, 70)
                .map((k) => 5 * k)
                .filter((t) => t % 60 !== 0),
            );
            const hours = new Rat(t, 60);
            return {
              speed,
              t,
              values: [
                hours.mul(speed),
                new Rat(speed * t, 100),
                new Rat(speed * (v === "A" ? hours.ceil() : hours.floor())),
              ],
            };
          },
          ({ values }) =>
            !values[0].isInt() || !values[1].isInt() || !distinctValues(values),
        );
        const veh = riding(r, speed);
        return {
          prompt: `A ${veh} travels for ${t} minutes at ${speed} km/h. How far is the trip?`,
          answer: measure(values[0], "km"),
          wrong: [measure(values[1], "km"), measure(values[2], "km")],
        };
      }
      if (form === "T") {
        const { speed, dist, values } = r.exclude(
          () => {
            const speed = r.pick(
              "r",
              range(6, 20).map((k) => 5 * k),
            );
            const [top, bottom] = r.pick("q", HOURS);
            const hours = new Rat(top, bottom);
            return {
              speed,
              half: hours.sub(hours.floor()).eq(new Rat(1, 2)),
              dist: hours.mul(speed),
              values: [
                hours.mul(60),
                hours.mul(100),
                v === "A"
                  ? new Rat(60).div(hours)
                  : new Rat(60 * hours.floor() + 50),
              ],
            };
          },
          ({ half, dist, values }) =>
            !dist.isInt() || (v === "B" && !half) || !distinctValues(values),
        );
        const veh = riding(r, speed);
        return {
          prompt: `A ${veh} covers ${plain(dist)} km at ${speed} km/h. How many minutes does the trip take?`,
          answer: measure(values[0], "min"),
          wrong: [measure(values[1], "min"), measure(values[2], "min")],
        };
      }
      const { t, dist, values } = r.exclude(
        () => {
          const t = r.pick(
            "t",
            range(5, 23)
              .map((k) => 15 * k)
              .filter((t) => t % 60 !== 0),
          );
          const dist = r.int("d", 1, 400);
          const hours = new Rat(t, 60);
          return {
            t,
            dist,
            hours,
            values: [
              new Rat(60 * dist, t),
              new Rat(100 * dist, t),
              new Rat(dist, v === "A" ? hours.ceil() : hours.floor()),
            ],
          };
        },
        ({ dist, hours, values }) =>
          !values[0].isInt() ||
          !values[1].isInt() ||
          dist % hours.floor() !== 0 ||
          dist % hours.ceil() !== 0 ||
          values[0].cmp(15) < 0 ||
          values[0].cmp(120) > 0 ||
          !distinctValues(values),
      );
      const veh = riding(r, values[0]);
      return {
        prompt: `A ${veh} covers ${dist} km in ${t} minutes. What is the speed in km/h?`,
        answer: measure(values[0], "km/h"),
        wrong: [measure(values[1], "km/h"), measure(values[2], "km/h")],
      };
    },
  },
  {
    skill: "Inverse proportion",
    make(r) {
      const { n1, n2, d1 } = r.exclude(
        () => ({
          n1: r.int("n1", 2, 12),
          n2: r.int("n2", 2, 12),
          d1: r.int("d1", 2, 24),
        }),
        ({ n1, n2, d1 }) =>
          n1 === n2 ||
          n2 === n1 * n1 ||
          (n1 * d1) % n2 !== 0 ||
          (d1 * n2) % n1 !== 0 ||
          (n1 * d1) / n2 > 60,
      );
      const v = r.pick("v", ["A", "T"]);
      const [crew, unit, task] = r.pick("setting", SETTINGS).split("/");
      const answer = (n1 * d1) / n2;
      const direct = (d1 * n2) / n1;
      const added = d1 + n1 - n2;
      const slip =
        v === "A" && added >= 1 && added !== answer && added !== direct
          ? added
          : n1 * d1;
      const time = (n: number) =>
        num(n, `${n} ${n === 1 ? unit.slice(0, -1) : unit}`);
      return {
        prompt: `${n1} ${crew} take ${d1} ${unit} to ${task}. At the same rate, how long would ${n2} ${crew} take?`,
        answer: time(answer),
        wrong: [time(direct), time(slip)],
      };
    },
  },
];

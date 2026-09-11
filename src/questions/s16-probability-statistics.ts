import {
  type Choice,
  type Level,
  type Rng,
  NAMES,
  Rat,
  choose,
  distinctValues,
  factorial,
  frac,
  num,
  perm,
  q,
  range,
  whole,
} from "./kit.ts";

export const name = "Probability and Statistics";

const BAGS: Record<string, readonly [string, string]> = {
  marbles: ["red", "blue"],
  counters: ["green", "yellow"],
  beads: ["black", "white"],
  cubes: ["red", "green"],
  tiles: ["blue", "white"],
  buttons: ["red", "yellow"],
  pebbles: ["grey", "white"],
  discs: ["green", "black"],
};
const COLOURS = ["red", "blue", "green", "yellow", "white"];
const SPINNER = ["red", "blue", "green", "yellow", "purple"];
type Menu = {
  place: string;
  items: readonly string[];
  ones: readonly string[];
  deal: string;
  deals: string;
};
const MENUS: Record<string, Menu> = {
  cafe: {
    place: "A cafe offers",
    items: ["sandwiches", "drinks", "cakes"],
    ones: ["one sandwich", "one drink"],
    deal: "A lunch deal",
    deals: "lunch deals",
  },
  cinema: {
    place: "A cinema offers",
    items: ["films", "snacks", "drinks"],
    ones: ["one film", "one snack"],
    deal: "A film deal",
    deals: "film deals",
  },
  stall: {
    place: "A stall sells",
    items: ["hats", "scarves", "badges"],
    ones: ["one hat", "one scarf"],
    deal: "A winter set",
    deals: "winter sets",
  },
  restaurant: {
    place: "A restaurant offers",
    items: ["starters", "mains", "puddings", "drinks"],
    ones: ["one starter", "one main", "one pudding"],
    deal: "A set meal",
    deals: "set meals",
  },
  shop: {
    place: "A shop sells",
    items: ["shirts", "shorts", "socks", "caps"],
    ones: ["one shirt", "one pair of shorts", "one pair of socks"],
    deal: "A kit",
    deals: "kits",
  },
  bakery: {
    place: "A bakery sells",
    items: ["breads", "spreads", "fruits", "juices"],
    ones: ["one bread", "one spread", "one fruit"],
    deal: "A breakfast box",
    deals: "breakfast boxes",
  },
};
const GROUPS: Record<string, readonly [string, string, string]> = {
  club: ["members", "committee", "committees"],
  class: ["pupils", "team", "teams"],
  choir: ["singers", "small group", "small groups"],
  squad: ["players", "training group", "training groups"],
  band: ["players", "practice group", "practice groups"],
  crew: ["sailors", "watch", "watches"],
  panel: ["judges", "sub-panel", "sub-panels"],
  camp: ["leaders", "rota", "rotas"],
};
const WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
const NTH = ["", "first", "second", "third", "fourth", "fifth", "sixth"];

const none: Rat[] = [];
const total = (v: readonly number[]) => v.reduce((sum, x) => sum + x, 0);
const ascending = (v: readonly number[]) => [...v].sort((a, b) => a - b);
function median(v: readonly number[]) {
  const s = ascending(v);
  const h = s.length / 2;
  return s.length % 2 ? q(s[(s.length - 1) / 2]) : q(s[h - 1] + s[h], 2);
}
function mode(v: readonly number[]) {
  const seen = new Map<number, number>();
  for (const x of v) seen.set(x, (seen.get(x) ?? 0) + 1);
  const most = Math.max(...seen.values());
  const tops = [...seen].filter(([, times]) => times === most);
  return most > 1 && tops.length === 1 ? tops[0][0] : 0;
}
const listed = (v: readonly number[]) => v.join(", ");
const spoken = (v: readonly (string | number)[]) =>
  `${v.slice(0, -1).join(", ")} and ${v[v.length - 1]}`;
const pairOf = <T>(z: string, table: Record<string, T>) =>
  z.split("-").map((key) => table[key]);
const chance = (x: Rat) => num(x, frac(x));
function tally(x: Rat) {
  if (!x.isInt()) throw new RangeError(`${x} is not a whole count`);
  return whole(x.n);
}
const proper = (values: readonly Rat[]) =>
  values.length === 3 &&
  distinctValues(values) &&
  values.every((v) => v.sign() > 0 && v.cmp(1) < 0);
const counted = (values: readonly Rat[]) =>
  values.length === 3 &&
  distinctValues(values) &&
  values.every((v) => v.isInt() && v.cmp(1) >= 0);
const offer = (
  prompt: string,
  values: readonly Rat[],
  show: (v: Rat) => Choice,
) => ({
  prompt,
  answer: show(values[0]),
  wrong: [show(values[1]), show(values[2])] as const,
});

type Device = { a: number; n: number; text: string; event: string };
function device(r: Rng, kind: string): Device {
  if (kind === "coin")
    return {
      a: 1,
      n: 2,
      text: "a fair coin is flipped",
      event: r.pick("coin", ["heads", "tails"]),
    };
  if (kind === "die") {
    const die = (a: number, event: string) => ({
      a,
      n: 6,
      text: "a fair die is rolled",
      event,
    });
    const type = r.pick("die", ["face", "parity", "greater", "less"]);
    if (type === "face") return die(1, `a ${r.int("v", 1, 6)}`);
    if (type === "parity")
      return die(3, `an ${r.pick("parity", ["even", "odd"])} number`);
    if (type === "greater") {
      const v = r.int("v", 1, 5);
      return die(6 - v, `a number greater than ${v}`);
    }
    const v = r.int("v", 2, 6);
    return die(v - 1, `a number less than ${v}`);
  }
  const n = r.pick("sections", [3, 4, 5, 8, 10]);
  const a = r.int("a", 1, n - 1);
  const colour = r.pick("colour", SPINNER);
  return {
    a,
    n,
    text: `a spinner with ${n} equal sections, ${a} of them ${colour}, is spun`,
    event: colour,
  };
}

function bag(r: Rng, item: string, hi: number, cap: number) {
  const [c1, c2] = BAGS[item];
  const first = r.int("r", 2, hi);
  const second = r.int("b", 2, hi);
  const asked = r.pick("ca", [c1, c2]);
  const [a, o] = asked === c1 ? [first, second] : [second, first];
  return {
    a,
    o,
    asked,
    legal: first !== second && a + o <= cap,
    held: `A bag holds ${first} ${c1} ${item} and ${second} ${c2} ${item}.`,
  };
}

export const levels: Level[] = [
  {
    skill: "Mean",
    make(r) {
      const w = r.pick("w", ["med", "mid"]);
      const u = r.pick("u", ["drop", "tot"]);
      const { v, values } = r.exclude(
        () => {
          const n = r.int("n", 3, 6);
          const v = range(1, n).map((i) => r.int(`v${i}`, 1, 20));
          const sum = total(v);
          const s = ascending(v);
          const places = range(1, n).filter(
            (j) => (sum - v[j - 1]) % (n - 1) === 0,
          );
          const legal =
            new Set(v).size >= 3 &&
            sum % n === 0 &&
            (w === "med" ? median(v).isInt() : (s[0] + s[n - 1]) % 2 === 0) &&
            (u === "tot" || places.length > 0);
          if (!legal) return { v, values: none };
          const d1 = w === "med" ? median(v) : q(s[0] + s[n - 1], 2);
          const d2 =
            u === "drop"
              ? q(sum - v[r.pick("j", places) - 1], n - 1)
              : q(sum);
          return { v, values: [q(sum, n), d1, d2] };
        },
        ({ values }) => !counted(values),
      );
      return offer(`What is the mean of ${listed(v)}?`, values, tally);
    },
  },
  {
    skill: "Median, mode and range",
    make(r) {
      const form = r.pick("form", ["M", "O", "R"]);
      if (form === "O") {
        const m = r.int("m", 1, 20);
        const p = r.pick(
          "p",
          range(1, 20).filter((x) => x !== m),
        );
        const o = r.pick(
          "q",
          range(1, 20).filter((x) => x !== m && x !== p),
        );
        const list = r.shuffle("list", [m, m, m, p, p, o, o]);
        return offer(
          `What is the mode of ${listed(list)}?`,
          [q(m), q(p), q(o)],
          tally,
        );
      }
      if (form === "R") {
        const sw = r.pick("sw", ["A", "B", "C"]);
        const { v, values } = r.exclude(
          () => {
            const n = r.int("n", 5, 7);
            const v = range(1, n).map((i) => r.int(`v${i}`, 2, 20));
            const s = ascending(v);
            const [lo, hi] = [s[0], s[n - 1]];
            const spread = hi - lo;
            const ends = Math.abs(v[0] - v[n - 1]);
            const legal =
              mode(v) > 0 &&
              s[1] !== lo &&
              s[n - 2] !== hi &&
              (sw !== "B" || ends !== spread);
            const slips =
              sw === "A"
                ? [hi, spread + 1]
                : sw === "B"
                  ? [hi, ends]
                  : [s[n - 2] - lo, hi - s[1]];
            return {
              v,
              values: legal ? [spread, ...slips].map((x) => q(x)) : none,
            };
          },
          ({ values }) => !counted(values),
        );
        return offer(`What is the range of ${listed(v)}?`, values, tally);
      }
      let n = r.pick("n", [5, 6, 7]);
      const sd = n % 2 ? r.pick("sd", ["same", "split"]) : "";
      const pair = n % 2 ? "" : r.pick("pair", ["early", "late"]);
      if (sd === "same") n = 7;
      const { v, values } = r.exclude(
        () => {
          const v = range(1, n).map((i) => r.int(`v${i}`, 1, 20));
          const s = ascending(v);
          const m = mode(v);
          if (n % 2) {
            const med = s[(n - 1) / 2];
            const mid = v[(n - 1) / 2];
            const side = Math.sign(m - med) * Math.sign(mid - med);
            const legal = m > 0 && (sd === "same" ? side > 0 : side < 0);
            return { v, values: legal ? [q(med), q(mid), q(m)] : none };
          }
          const [x, y] = pair === "early" ? [s[1], s[2]] : [s[3], s[4]];
          const mean = q(total(v), n);
          const legal =
            m > 0 &&
            s[2] !== s[3] &&
            (s[2] + s[3]) % 2 === 0 &&
            x !== y &&
            (x + y) % 2 === 0 &&
            mean.isInt() &&
            !v.includes(mean.n);
          return { v, values: legal ? [median(v), q(x + y, 2), mean] : none };
        },
        ({ values }) => !counted(values),
      );
      return offer(`What is the median of ${listed(v)}?`, values, tally);
    },
  },
  {
    skill: "Single-event probability",
    make(r) {
      const z = r.pick("z", ["other-one", "other-less", "part-less"]);
      const item = r.pick("bag", Object.keys(BAGS));
      const { b, values } = r.exclude(
        () => {
          const b = bag(r, item, 17, 20);
          const T = b.a + b.o;
          const table = {
            other: q(b.o, T),
            one: q(1, T),
            less: q(b.a, T - 1),
            part: q(b.a, b.o),
          };
          const legal = b.legal && (!z.includes("part") || b.a < b.o);
          return { b, values: legal ? [q(b.a, T), ...pairOf(z, table)] : none };
        },
        ({ values }) => !proper(values),
      );
      return offer(
        `${b.held} One ${item.slice(0, -1)} is taken at random. What is the probability that it is ${b.asked}?`,
        values,
        chance,
      );
    },
  },
  {
    skill: "Complement, certain and impossible",
    make(r) {
      if (r.pick("form", ["C", "X"]) === "X") {
        const T = r.pick("T", [6, 7, 8, 9, 10, 11, 12, 15, 20]);
        const fam = r.pick("fam", ["greater", "less"]);
        const at = ["0", "1/T", "1"].indexOf(
          r.pick("answer", ["0", "1/T", "1"]),
        );
        const cut = fam === "greater" ? [T, T - 1, 0][at] : [1, 2, T + 1][at];
        const three = [chance(q(0)), chance(q(1, T)), chance(q(1))];
        const near = at === 1 ? 0 : 1;
        const rest = 3 - at - near;
        return {
          prompt: `${T === 6 ? "A fair die is rolled once." : `A spinner with ${T} equal sections numbered 1 to ${T} is spun once.`} What is the probability of a number ${fam} than ${cut}?`,
          answer: three[at],
          wrong: [three[near], three[rest]],
        };
      }
      const z = r.pick("z", ["self-cols", "self-less", "cols-less"]);
      const { cols, c, asked, values } = r.exclude(
        () => {
          const k = r.int("k", 3, 4);
          const cols = r.shuffle("colours", COLOURS).slice(0, k);
          const c = range(1, k).map((i) => r.int(`c${i}`, 1, 8));
          const i = r.int("i", 1, k);
          const T = total(c);
          const mine = c[i - 1];
          const table = {
            self: q(mine, T),
            cols: q(k - 1, k),
            less: q(T - mine, T - 1),
          };
          const legal = T <= 20 && T >= k + 2;
          return {
            cols,
            c,
            asked: cols[i - 1],
            values: legal ? [q(T - mine, T), ...pairOf(z, table)] : none,
          };
        },
        ({ values }) => !proper(values),
      );
      const noun = c[c.length - 1] === 1 ? "marble" : "marbles";
      return offer(
        `A bag holds ${spoken(cols.map((col, j) => `${c[j]} ${col}`))} ${noun}. One marble is taken at random. What is the probability that it is not ${asked}?`,
        values,
        chance,
      );
    },
  },
  {
    skill: "Missing value from a mean",
    make(r) {
      const w = r.pick("w", ["km", "sh", "fg"]);
      const { v, N, M, values } = r.exclude(
        () => {
          const N = r.int("N", 4, 6);
          const n = N - 1;
          const M = r.int("M", 6, 18);
          const v = range(1, n).map((i) => r.int(`v${i}`, 3, 20));
          const sum = total(v);
          const x = N * M - sum;
          const legal =
            x >= 3 && x <= 20 && x !== M && (w !== "km" || sum % n === 0);
          if (!legal) return { v, N, M, values: none };
          const d2 =
            w === "km"
              ? q(sum, n)
              : w === "sh"
                ? q(n * M - sum)
                : q(x + v[r.int("j", 1, n) - 1]);
          return { v, N, M, values: [q(x), q(M), d2] };
        },
        ({ values }) => !counted(values),
      );
      const who = r.pick("Name", NAMES);
      return offer(
        `${who} scores ${spoken(v)} points in ${WORDS[N - 1]} games. After the ${NTH[N]} game the mean over all ${WORDS[N]} games is ${M}. How many points did ${who} score in the ${NTH[N]} game?`,
        values,
        tally,
      );
    },
  },
  {
    skill: "Independent compound events",
    make(r) {
      const z = r.pick("z", ["add-one", "add-med", "med-comp", "one-comp"]);
      const kinds = ["coin", "die", "spinner"];
      const { x, y, values } = r.exclude(
        () => {
          const first = r.pick("dev1", kinds);
          const second = r.pick(
            "dev2",
            kinds.filter((kind) => kind !== first),
          );
          const x = device(r, first);
          const y = device(r, second);
          const p1 = q(x.a, x.n);
          const p2 = q(y.a, y.n);
          const legal =
            (!z.includes("add") || p1.add(p2).cmp(1) < 0) &&
            (!z.includes("one") || x.a * y.a >= 2) &&
            (!z.includes("comp") || 2 * y.a !== y.n);
          const table = {
            add: p1.add(p2),
            med: q(x.a + y.a, x.n + y.n),
            one: q(1, x.n * y.n),
            comp: p1.mul(q(1).sub(p2)),
          };
          return {
            x,
            y,
            values: legal ? [p1.mul(p2), ...pairOf(z, table)] : none,
          };
        },
        ({ values }) => !proper(values),
      );
      return offer(
        `${x.text[0].toUpperCase()}${x.text.slice(1)} and ${y.text}. What is the probability of ${x.event} and ${y.event}?`,
        values,
        chance,
      );
    },
  },
  {
    skill: "Counting principle",
    make(r) {
      const j = r.int("j", 2, 3);
      const z = r.pick("z", ["all-sum", "all-swap", "sum-drop", "swap-drop"]);
      const menu =
        MENUS[
          r.pick(
            "menu",
            Object.keys(MENUS).filter(
              (key) => MENUS[key].items.length === j + 1,
            ),
          )
        ];
      const { c, values } = r.exclude(
        () => {
          const c = range(1, j + 1).map((k) => r.int(`c${k}`, 2, 6));
          const i = r.int("i", 1, j);
          const used = c.slice(0, j);
          const product = used.reduce((out, x) => out * x, 1);
          const table = {
            all: product * c[j],
            sum: total(used),
            drop: product / c[i - 1],
            swap: (product / c[i - 1]) * c[j],
          };
          return {
            c,
            values: [product, ...pairOf(z, table)].map((x) => q(x)),
          };
        },
        ({ values }) => !counted(values),
      );
      return offer(
        `${menu.place} ${spoken(menu.items.map((item, k) => `${c[k]} ${item}`))}. ${menu.deal} is ${spoken(menu.ones)}. How many different ${menu.deals} are there?`,
        values,
        tally,
      );
    },
  },
  {
    skill: "Without replacement",
    make(r) {
      const z = r.pick("z", ["rep-num", "rep-den", "num-other", "den-other"]);
      const item = r.pick("bag", Object.keys(BAGS));
      const { b, values } = r.exclude(
        () => {
          const b = bag(r, item, 8, 10);
          const T = b.a + b.o;
          const table = {
            rep: q(b.a * b.a, T * T),
            den: q(b.a * b.a, T * (T - 1)),
            num: q(b.a * (b.a - 1), T * T),
            other: q(b.o * (b.o - 1), T * (T - 1)),
          };
          return {
            b,
            values: b.legal
              ? [q(b.a * (b.a - 1), T * (T - 1)), ...pairOf(z, table)]
              : none,
          };
        },
        ({ values }) => !proper(values),
      );
      return offer(
        `${b.held} Two are taken at random, without replacement. What is the probability that both are ${b.asked}?`,
        values,
        chance,
      );
    },
  },
  {
    skill: "Expected count and experimental probability",
    make(r) {
      const form = r.pick("form", ["E", "X"]);
      const z =
        form === "E" ? r.pick("z", ["den-comp", "den-div", "comp-div"]) : "";
      const { s, a, n, k, values } = r.exclude(
        () => {
          const s = r.pick("s", [5, 6, 8, 10]);
          const a = r.pick(
            "a",
            range(2, s - 2).filter((a) => 2 * a !== s),
          );
          if (form === "E") {
            const n = r.pick(
              "n",
              range(3, 20)
                .map((m) => s * m)
                .filter((n) => n <= 200),
            );
            const table = {
              den: q(n, s),
              comp: q(n * (s - a), s),
              div: q(n, a),
            };
            const legal = !z.includes("div") || n % a === 0;
            return {
              s,
              a,
              n,
              k: 0,
              values: legal ? [q(n * a, s), ...pairOf(z, table)] : none,
            };
          }
          const n = r.pick("n", [20, 25, 30, 40, 50, 60, 80, 100, 120]);
          const k = r.pick(
            "k",
            range(2, n - 2).filter(
              (k) =>
                2 * k !== n &&
                k * s !== a * n &&
                5 * Math.abs(k * s - a * n) <= n * s,
            ),
          );
          return { s, a, n, k, values: [q(k, n), q(n - k, n), q(a, s)] };
        },
        ({ values }) =>
          form === "E" ? !counted(values) : !proper(values),
      );
      const colour = r.pick("colour", SPINNER);
      const opening = `A spinner has ${s} equal sections, ${a} of them ${colour}.`;
      if (form === "E")
        return offer(
          `${opening} It is spun ${n} times. About how many ${colour} results should you expect?`,
          values,
          tally,
        );
      const who = r.pick("Name", NAMES);
      return offer(
        `${opening} ${who} spins it ${n} times and gets ${colour} ${k} times. What is the experimental probability of ${colour} from these spins?`,
        values,
        chance,
      );
    },
  },
  {
    skill: "Permutations and combinations",
    make(r) {
      const form = r.pick("form", ["C", "P"]);
      const z = r.pick(
        "z",
        form === "C"
          ? ["perm-divr", "perm-addf", "divr-mult", "mult-addf"]
          : ["comb-pow", "comb-addf", "pow-fact", "addf-pow"],
      );
      const grp = r.pick("group", Object.keys(GROUPS));
      const [mem, team, teams] = GROUPS[grp];
      const { n, k, values } = r.exclude(
        () => {
          const n = r.int("n", 6, 8);
          const k = r.int("r", form === "C" ? 3 : 2, 4);
          const table = {
            perm: perm(n, k),
            divr: perm(n, k) / k,
            comb: choose(n, k),
            pow: n ** k,
            fact: factorial(n),
            mult: n * k,
            addf: total(range(n - k + 1, n)),
          };
          return {
            n,
            k,
            values: [
              form === "C" ? choose(n, k) : perm(n, k),
              ...pairOf(z, table),
            ].map((x) => q(x)),
          };
        },
        ({ values }) => !counted(values),
      );
      const opening = `A ${grp} has ${n} ${mem}. ${k} of them are chosen for`;
      return offer(
        form === "C"
          ? `${opening} a ${team}. Order does not matter. How many different ${teams} are possible?`
          : `${opening} ${spoken(["first", "second", "third", "fourth"].slice(0, k))} place. How many different results are possible?`,
        values,
        tally,
      );
    },
  },
];

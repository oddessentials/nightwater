import { random } from "../model.ts";

export const MATH_FONT = '"Nightwater Math", Georgia, serif';
export const GLYPHS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
  "°±²³·¹½×÷ˣΣθπ…′⁰⁴⁵⁶⁷⁸⁹⁻₀₁₂₃₄₅₆₇₈₉₋ₙ→−∘√∛∞∫≈≠≤≥";
export const MINUS = "−";
export const NAMES: readonly string[] = [
  "Ava",
  "Ben",
  "Cleo",
  "Dev",
  "Eli",
  "Fay",
  "Gus",
  "Ivy",
  "Jo",
  "Kai",
  "Leo",
  "Mia",
  "Noor",
  "Omar",
  "Pia",
  "Raj",
  "Sam",
  "Tia",
  "Uma",
  "Zoe",
];

export class CapError extends Error {}

const CAP = 5000;

export interface Rng {
  int(name: string, lo: number, hi: number): number;
  pick<T>(name: string, items: readonly T[]): T;
  sign(name: string): number;
  weighted<T>(name: string, options: readonly (readonly [T, number])[]): T;
  shuffle<T>(name: string, items: readonly T[]): T[];
  resample<T>(draw: () => T, ok: (value: T) => boolean): T;
  exclude<T>(draw: () => T, bad: (value: T) => boolean): T;
}

export class SeededRng implements Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = random(seed);
  }
  int(name: string, lo: number, hi: number) {
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo > hi)
      throw new RangeError(`${name}: empty range ${lo}..${hi}`);
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  pick<T>(name: string, items: readonly T[]) {
    if (!items.length) throw new RangeError(`${name}: nothing to pick`);
    return items[Math.floor(this.next() * items.length)];
  }
  sign() {
    return this.next() < 0.5 ? -1 : 1;
  }
  weighted<T>(name: string, options: readonly (readonly [T, number])[]) {
    const live = options.filter(([, weight]) => weight > 0);
    if (!live.length) throw new RangeError(`${name}: no weighted options`);
    let x = this.next() * live.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [value, weight] of live) if ((x -= weight) < 0) return value;
    return live[live.length - 1][0];
  }
  shuffle<T>(_name: string, items: readonly T[]) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  resample<T>(draw: () => T, ok: (value: T) => boolean) {
    for (let i = 0; i < CAP; i++) {
      const value = draw();
      if (ok(value)) return value;
    }
    throw new CapError("resample cap reached");
  }
  exclude<T>(draw: () => T, bad: (value: T) => boolean) {
    return this.resample(draw, (value) => !bad(value));
  }
}

const same = (a: unknown, b: unknown) =>
  a === b || JSON.stringify(a) === JSON.stringify(b);

export class ScriptedRng implements Rng {
  private values: Record<string, unknown>;
  private used = new Set<string>();
  constructor(values: Record<string, unknown>) {
    this.values = values;
  }
  private get(name: string) {
    if (!(name in this.values))
      throw new Error(`no scripted value for ${name}`);
    this.used.add(name);
    return this.values[name];
  }
  int(name: string, lo: number, hi: number) {
    const value = this.get(name);
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < lo ||
      value > hi
    )
      throw new RangeError(`${name} = ${String(value)} is outside ${lo}..${hi}`);
    return value;
  }
  pick<T>(name: string, items: readonly T[]) {
    const value = this.get(name);
    const index = items.findIndex((item) => same(item, value));
    if (index < 0)
      throw new RangeError(
        `${name} = ${JSON.stringify(value)} is not one of ${JSON.stringify(items)}`,
      );
    return items[index];
  }
  sign(name: string) {
    const value = this.get(name);
    if (value !== 1 && value !== -1)
      throw new RangeError(`${name} = ${String(value)} is not ±1`);
    return value;
  }
  weighted<T>(name: string, options: readonly (readonly [T, number])[]) {
    return this.pick(
      name,
      options.filter(([, weight]) => weight > 0).map(([value]) => value),
    );
  }
  shuffle<T>(name: string, items: readonly T[]) {
    const value = this.get(name);
    const pool = [...items];
    if (!Array.isArray(value) || value.length !== items.length)
      throw new RangeError(`${name} is not an ordering of its items`);
    return value.map((entry) => {
      const index = pool.findIndex((item) => same(item, entry));
      if (index < 0)
        throw new RangeError(`${name} is not an ordering of its items`);
      return pool.splice(index, 1)[0];
    });
  }
  resample<T>(draw: () => T, ok: (value: T) => boolean) {
    const value = draw();
    if (!ok(value))
      throw new RangeError("scripted values fail a resample condition");
    return value;
  }
  exclude<T>(draw: () => T, bad: (value: T) => boolean) {
    const value = draw();
    if (bad(value)) throw new RangeError("scripted values hit an exclusion");
    return value;
  }
  unused() {
    return Object.keys(this.values).filter((name) => !this.used.has(name));
  }
}

export function mix(...values: number[]) {
  let h = 0x9e3779b9;
  for (const value of values) {
    h = Math.imul(h ^ (value >>> 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export const lcm = (a: number, b: number) => Math.abs((a / gcd(a, b)) * b);
export function isPrime(n: number) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}
export function divisors(n: number) {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}
export const range = (lo: number, hi: number) =>
  Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
export const coprimes = (b: number) =>
  range(1, b - 1).filter((a) => gcd(a, b) === 1);
export function isSquarefree(n: number) {
  if (n < 1) return false;
  for (let i = 2; i * i <= n; i++) if (n % (i * i) === 0) return false;
  return true;
}
export function simplifyRoot(n: number): [number, number] {
  let outside = 1;
  let inside = n;
  for (let i = 2; i * i <= inside; i++)
    while (inside % (i * i) === 0) {
      inside /= i * i;
      outside *= i;
    }
  return [outside, inside];
}
export function isqrt(n: number) {
  let root = Math.floor(Math.sqrt(n));
  while (root * root > n) root--;
  while ((root + 1) * (root + 1) <= n) root++;
  return root;
}
export function factorial(n: number) {
  let out = 1;
  for (let i = 2; i <= n; i++) out *= i;
  return out;
}
export function perm(n: number, k: number) {
  let out = 1;
  for (let i = 0; i < k; i++) out *= n - i;
  return out;
}
export const choose = (n: number, k: number) => perm(n, k) / factorial(k);

export class Rat {
  readonly n: number;
  readonly d: number;
  constructor(n: number, d = 1) {
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
      throw new RangeError(`not an exact rational: ${n}/${d}`);
    const g = gcd(n, d) * Math.sign(d);
    this.n = n / g + 0;
    this.d = d / g;
  }
  static of(x: Rat | number) {
    return x instanceof Rat ? x : new Rat(x);
  }
  add(other: Rat | number) {
    const b = Rat.of(other);
    return new Rat(this.n * b.d + b.n * this.d, this.d * b.d);
  }
  sub(other: Rat | number) {
    return this.add(Rat.of(other).neg());
  }
  mul(other: Rat | number) {
    const b = Rat.of(other);
    return new Rat(this.n * b.n, this.d * b.d);
  }
  div(other: Rat | number) {
    const b = Rat.of(other);
    if (!b.n) throw new RangeError("division by zero");
    return new Rat(this.n * b.d, this.d * b.n);
  }
  neg() {
    return new Rat(-this.n, this.d);
  }
  abs() {
    return new Rat(Math.abs(this.n), this.d);
  }
  inv() {
    return new Rat(1).div(this);
  }
  pow(k: number) {
    let out = new Rat(1);
    for (let i = 0; i < Math.abs(k); i++) out = out.mul(this);
    return k < 0 ? out.inv() : out;
  }
  cmp(other: Rat | number) {
    const b = Rat.of(other);
    return Math.sign(this.n * b.d - b.n * this.d);
  }
  eq(other: Rat | number) {
    return this.cmp(other) === 0;
  }
  isInt() {
    return this.d === 1;
  }
  sign() {
    return Math.sign(this.n);
  }
  floor() {
    return (this.n - (((this.n % this.d) + this.d) % this.d)) / this.d;
  }
  ceil() {
    return -new Rat(-this.n, this.d).floor();
  }
  toNumber() {
    return this.n / this.d;
  }
  toString() {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }
}
export const q = (n: number, d = 1) => new Rat(n, d);

export function roundHalfUp(x: Rat, places = 0) {
  const scale = 10 ** places;
  return new Rat(x.mul(scale).add(new Rat(1, 2)).floor(), scale);
}
export function nearBoundary(x: number, places: number, epsilon = 1e-6) {
  const scaled = x * 10 ** places;
  return Math.abs(scaled - Math.floor(scaled) - 0.5) * 10 ** -places < epsilon;
}

const grouped = (digits: string) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export function int(n: number, group = false) {
  if (!Number.isSafeInteger(n)) throw new RangeError(`not a whole number: ${n}`);
  const digits = String(Math.abs(n));
  return (n < 0 ? MINUS : "") + (group ? grouped(digits) : digits);
}
export function dec(x: Rat | number, places?: number, group = false) {
  const v = Rat.of(x);
  let rest = v.d;
  let twos = 0;
  let fives = 0;
  while (rest % 2 === 0) {
    rest /= 2;
    twos++;
  }
  while (rest % 5 === 0) {
    rest /= 5;
    fives++;
  }
  if (rest !== 1) throw new RangeError(`${v} is not a terminating decimal`);
  const exact = Math.max(twos, fives);
  const p = places ?? exact;
  if (p < exact) throw new RangeError(`${v} needs ${exact} decimal places`);
  const unit = 10 ** p;
  const scaled = Math.abs(v.n) * (unit / v.d);
  const whole = String((scaled - (scaled % unit)) / unit);
  const fraction = p ? "." + String(scaled % unit).padStart(p, "0") : "";
  return (v.n < 0 ? MINUS : "") + (group ? grouped(whole) : whole) + fraction;
}
export function fixed(x: number, places: number, group = false) {
  if (!Number.isFinite(x) || nearBoundary(x, places))
    throw new RangeError(`${x} sits on a rounding boundary`);
  return dec(
    new Rat(Math.round(x * 10 ** places), 10 ** places),
    places,
    group,
  );
}
export function frac(x: Rat | number, group = false) {
  const v = Rat.of(x);
  const top = int(v.n, group);
  return v.d === 1 ? top : `${top}/${int(v.d, group)}`;
}
export const over = (n: number, d: number) => `${int(n)}/${int(d)}`;
export function mixed(x: Rat) {
  const whole = x.floor();
  const rest = x.sub(whole);
  if (!rest.n) return int(whole);
  return whole ? `${int(whole)} ${frac(rest)}` : frac(rest);
}
export function money(x: Rat | number, places: 0 | 2 | "auto" = 2) {
  const v = Rat.of(x);
  const p = places === "auto" ? (v.isInt() ? 0 : 2) : places;
  return `${v.n < 0 ? MINUS : ""}$${dec(v.abs(), p, true)}`;
}
export const pct = (x: Rat | number) => `${dec(x)}%`;
export const ratio = (a: number, b: number) => `${a} : ${b}`;
export const powers = (pairs: readonly (readonly [number, number])[]) =>
  pairs
    .map(([base, e]) => (e === 1 ? `${base}` : `${base}^${int(e)}`))
    .join(" · ");

const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "−": "⁻",
  x: "ˣ",
};
const SUB: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "-": "₋",
  "−": "₋",
  n: "ₙ",
};
function script(map: Record<string, string>, text: string) {
  return [...text]
    .map((c) => {
      const out = map[c];
      if (!out) throw new RangeError(`no raised or lowered form for ${c}`);
      return out;
    })
    .join("");
}
export const sup = (v: number | string) => script(SUP, String(v));
export const sub = (v: number | string) => script(SUB, String(v));

export type Term = readonly [coef: number, body: string];
export function terms(list: readonly Term[], group = false) {
  const live = list.filter(([coef]) => coef !== 0);
  if (!live.length) return "0";
  return live
    .map(([coef, body], i) => {
      const size = Math.abs(coef);
      const sign = coef < 0 ? (i ? ` ${MINUS} ` : MINUS) : i ? " + " : "";
      if (!body) return sign + int(size, group);
      const lead =
        size === 1
          ? ""
          : int(size, group) + (/^(sin|cos|tan|ln|log)/.test(body) ? " " : "");
      return sign + lead + body;
    })
    .join("");
}
export function surd(c: Rat | number, k: number) {
  const v = Rat.of(c);
  if (k === 1) return frac(v);
  const size = Math.abs(v.n);
  return `${v.n < 0 ? MINUS : ""}${size === 1 ? "" : size}√${k}${v.d === 1 ? "" : `/${v.d}`}`;
}
export function piMul(c: Rat | number) {
  const v = Rat.of(c);
  const size = Math.abs(v.n);
  return `${v.n < 0 ? MINUS : ""}${size === 1 ? "" : size}π${v.d === 1 ? "" : `/${v.d}`}`;
}
export function ordinal(n: number) {
  const tail =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${tail}`;
}
export function time12(minutes: number) {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export function duration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

export const nonzero = (n: number) => [...range(-n, -1), ...range(1, n)];

const RAISED = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const LOWERED = "₀₁₂₃₄₅₆₇₈₉";
export function printedNumbers(text: string, scripts = true) {
  const out = new Set<number>();
  for (const [digits] of text.matchAll(/\d{1,3}(?:,\d{3})+|\d+/g))
    out.add(Number(digits.replace(/,/g, "")));
  if (scripts)
    for (const set of [RAISED, LOWERED])
      for (const [run] of text.matchAll(new RegExp(`[${set}]+`, "g")))
        out.add(Number([...run].map((c) => set.indexOf(c)).join("")));
  return out;
}
const alone = (keys: readonly unknown[]) =>
  keys.filter((key) => key === keys[0]).length === 1;
export const loneSign = (values: readonly (Rat | number)[]) =>
  alone(values.map((v) => (v instanceof Rat ? v.sign() : Math.sign(v)) < 0));
export const loneShape = (values: readonly Rat[]) =>
  alone(values.map((v) => v.isInt()));
export const distinctValues = (values: readonly Rat[]) =>
  values.every((v, i) => values.findIndex((w) => w.eq(v)) === i);

export type Choice = { readonly text: string; readonly key: string };
export const choice = (text: string, key: string): Choice => ({ text, key });
export const label = (text: string) => choice(text, `label:${text}`);
export const num = (value: Rat | number, text: string) =>
  choice(text, `num:${Rat.of(value)}`);
export const whole = (n: number, group = false) => num(n, int(n, group));
const probe = (value: number) =>
  (Object.is(value, -0) ? 0 : value).toPrecision(12);
export const real = (value: number, text: string) =>
  choice(text, `real:${probe(value)}`);
const PROBES = [0.37, 1.23, 2.71, 4.19];
export const expr = (text: string, f: (x: number) => number, tag = "") =>
  choice(text, `expr${tag}:${PROBES.map((x) => probe(f(x))).join(",")}`);

export type Draft = {
  prompt: string;
  domain?: { positive: readonly string[] };
  figure?: string;
  answer: Choice;
  wrong: readonly [Choice, Choice];
};

export function withPositiveDomain(
  variables: readonly string[],
  draft: Draft,
): Draft {
  const conditions = variables
    .map((variable) => `${variable} > 0`)
    .join(" and ");
  return {
    ...draft,
    domain: { positive: [...variables] },
    prompt: `For ${conditions}, ${draft.prompt[0].toLowerCase()}${draft.prompt.slice(1)}`,
  };
}

export type Level = { skill: string; make(r: Rng): Draft };
export type Stage = { name: string; levels: readonly Level[] };

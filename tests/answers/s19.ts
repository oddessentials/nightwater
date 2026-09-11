import { close, only, type Asked, type Checks } from "../support/math.ts";

const TRIG: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
};
const rad = (t: number) => (t * Math.PI) / 180;
const deg = (x: number) => (x * 180) / Math.PI;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function read(pattern: RegExp, q: Asked) {
  const match = pattern.exec(q.prompt);
  if (!match) throw new Error(`unexpected prompt: ${q.prompt}`);
  return match;
}

function exact(text: string) {
  const m = /^(−)?(\d*)(?:√(\d+))?(?:\/(\d+))?$/.exec(text);
  if (!m || (!m[2] && !m[3])) throw new Error(`unreadable value ${text}`);
  const top = m[2] ? Number(m[2]) : 1;
  const bottom = m[4] ? Number(m[4]) : 1;
  if (m[4] && gcd(top, bottom) !== 1)
    throw new Error(`${text} is not in lowest terms`);
  return ((m[1] ? -1 : 1) * top * Math.sqrt(m[3] ? Number(m[3]) : 1)) / bottom;
}

function piCoefficient(text: string): [number, number] {
  const m = /^(\d*)π(?:\/(\d+))?$/.exec(text);
  if (!m) throw new Error(`unreadable multiple of π ${text}`);
  const top = m[1] ? Number(m[1]) : 1;
  const bottom = m[2] ? Number(m[2]) : 1;
  if (gcd(top, bottom) !== 1) throw new Error(`${text} is not in lowest terms`);
  return [top, bottom];
}

function measured(choice: string, unit: string, target: number) {
  const m = /^(\d+\.\d) (cm|m)$/.exec(choice);
  if (!m || m[2] !== unit) throw new Error(`unreadable length ${choice}`);
  return Math.round(Number(m[1]) * 10) === Math.round(target * 10);
}

function degrees(choice: string) {
  const m = /^(\d+)°$/.exec(choice);
  if (!m) throw new Error(`unreadable angle ${choice}`);
  return Number(m[1]);
}

function solve2(
  [a, b, e]: [number, number, number],
  [c, d, f]: [number, number, number],
) {
  const det = a * d - b * c;
  return [(e * d - b * f) / det, (a * f - e * c) / det];
}

export default {
  1: (q) => {
    const [, T, right, from, side, role] = read(
      /^Triangle ([A-Z]{3}) has a right angle at ([A-Z])\. Relative to angle ([A-Z]), (?:side ([A-Z]{2}) is the…|which side is the (opposite side|adjacent side|hypotenuse)\?)$/,
      q,
    );
    const roleOf = (s: string) =>
      !s.includes(right)
        ? "hypotenuse"
        : s.includes(from)
          ? "adjacent side"
          : "opposite side";
    if (side) return only(q.choices, (c) => c === roleOf(side));
    return only(
      q.choices,
      (c) =>
        /^[A-Z]{2}$/.test(c) &&
        c[0] < c[1] &&
        [...c].every((x) => T.includes(x)) &&
        roleOf(c) === role,
    );
  },
  2: (q) => {
    const [, ab, leg, printed, f, X] = read(
      /^Triangle ABC has a right angle at C, with AB = (\d+) and (BC|AC) = (\d+)\. What is (sin|cos|tan) (A|B)\?$/,
      q,
    );
    const c = Number(ab);
    const g = Number(printed);
    const other = Math.round(Math.sqrt(c * c - g * g));
    if (other * other + g * g !== c * c)
      throw new Error("not a whole triangle");
    const BC = leg === "BC" ? g : other;
    const AC = leg === "AC" ? g : other;
    const opposite = X === "A" ? BC : AC;
    const adjacent = X === "A" ? AC : BC;
    const [top, bottom] =
      f === "sin"
        ? [opposite, c]
        : f === "cos"
          ? [adjacent, c]
          : [opposite, adjacent];
    return only(q.choices, (choice) => {
      const [n, d] = choice.split("/").map(Number);
      return d !== undefined && gcd(n, d) === 1 && n * bottom === d * top;
    });
  },
  3: (q) => {
    const [, t, given, s, unit, asked] = read(
      /^A right triangle has a (\d+)° angle\. (.+) is (\d+) (cm|m)\. How long is (.+)\? Round to 1 dp\.$/,
      q,
    );
    const theta = rad(Number(t));
    const share = (name: string) => {
      if (/^the hypotenuse$/i.test(name)) return 1;
      const m = /^the side (opposite|adjacent to) the (\d+)° angle$/i.exec(
        name,
      );
      if (!m || m[2] !== t) throw new Error(`unreadable side ${name}`);
      return m[1] === "opposite" ? Math.sin(theta) : Math.cos(theta);
    };
    const target = (Number(s) / share(given)) * share(asked);
    return only(q.choices, (c) => measured(c, unit, target));
  },
  4: (q) => {
    const m = read(
      /^In a right triangle, the side (opposite|adjacent to) angle θ is (\d+) (cm|m) and (the side adjacent to it|the hypotenuse) is (\d+) (cm|m)\. What is θ to the nearest degree\?$/,
      q,
    );
    if (m[3] !== m[6]) throw new Error("mixed units");
    const x = Number(m[2]);
    const y = Number(m[5]);
    const legs =
      m[4] === "the side adjacent to it"
        ? m[1] === "opposite"
          ? [x, y]
          : [NaN, NaN]
        : m[1] === "opposite"
          ? [x, Math.sqrt(y * y - x * x)]
          : [Math.sqrt(y * y - x * x), x];
    const theta = deg(Math.atan2(legs[0], legs[1]));
    return only(q.choices, (c) => degrees(c) === Math.round(theta));
  },
  5: (q) => {
    const value =
      /^What is the exact value of (?:(\d) )?(sin|cos|tan) (\d+)°\?$/.exec(
        q.prompt,
      );
    if (value) {
      const target =
        Number(value[1] ?? 1) * TRIG[value[2]](rad(Number(value[3])));
      return only(q.choices, (c) => close(exact(c), target, 1e-9));
    }
    const [, f, v] = read(
      /^θ is between 0° and 90°, and (sin|cos|tan) θ = (.+)\. What is θ\?$/,
      q,
    );
    const target = exact(v);
    const hits = Array.from({ length: 91 }, (_, t) => t).filter(
      (t) => !(f === "tan" && t === 90) && close(TRIG[f](rad(t)), target, 1e-9),
    );
    if (hits.length !== 1) throw new Error(`${hits.length} angles fit`);
    return only(q.choices, (c) => degrees(c) === hits[0]);
  },
  6: (q) => {
    const p = q.prompt;
    const ladder =
      /^An? (\d+) m ladder leans against a wall, making an angle of (\d+)° with the level ground\. (How high up the wall does it reach|How far is its foot from the wall)\? Round to 1 dp\.$/.exec(
        p,
      );
    const kite =
      /^A kite is flying on an? (\d+) m string that makes an angle of (\d+)° with the level ground\. How high is the kite above the point where the string is held\? Round to 1 dp\.$/.exec(
        p,
      );
    const elevation =
      /^From a point (\d+) m from the foot of a (\w+), on level ground, the angle of elevation to its top is (\d+)°\. How tall is the \2\? Round to 1 dp\.$/.exec(
        p,
      );
    const depression =
      /^From the top of a (\w+) (\d+) m above the (water|ground), the angle of depression to a (\w+) is (\d+)°\. How far is the \4 from the foot of the \1\? Round to 1 dp\.$/.exec(
        p,
      );
    let target: number;
    if (ladder) {
      const t = rad(Number(ladder[2]));
      const top = [
        Number(ladder[1]) * Math.cos(t),
        Number(ladder[1]) * Math.sin(t),
      ];
      target = ladder[3].startsWith("How high") ? top[1] : top[0];
    } else if (kite) {
      target = Number(kite[1]) * Math.sin(rad(Number(kite[2])));
    } else if (elevation) {
      const t = rad(Number(elevation[3]));
      target = (Number(elevation[1]) * Math.sin(t)) / Math.cos(t);
    } else if (depression) {
      const t = rad(Number(depression[5]));
      target = (Number(depression[2]) * Math.cos(t)) / Math.sin(t);
    } else {
      const eyes = read(
        /^(\w+)'s eyes are (\d\.\d) m above the level ground\. From (\d+) m away, \1 sees the top of a (\w+) at an angle of elevation of (\d+)°\. How tall is the \4\? Round to 1 dp\.$/,
        q,
      );
      const t = rad(Number(eyes[5]));
      target = Number(eyes[2]) + (Number(eyes[3]) * Math.sin(t)) / Math.cos(t);
    }
    return only(q.choices, (c) => measured(c, "m", target));
  },
  7: (q) => {
    const toRadians = /^Write (\d+)° in radians\.$/.exec(q.prompt);
    if (toRadians) {
      const d = Number(toRadians[1]);
      return only(q.choices, (c) => {
        const [k, n] = piCoefficient(c);
        return k * 180 === d * n;
      });
    }
    const toDegrees = /^Write (.+) in degrees\.$/.exec(q.prompt);
    if (toDegrees) {
      const [k, n] = piCoefficient(toDegrees[1]);
      return only(q.choices, (c) => degrees(c) * n === 180 * k);
    }
    const [, r, unit, at] = read(
      /^A circle has radius (\d+) (cm|m)\. An arc subtends an angle of (.+) at the centre\. How long is the arc\? Give an exact answer\.$/,
      q,
    );
    const turn = at.endsWith("°")
      ? [Number(at.slice(0, -1)), 360]
      : [piCoefficient(at)[0] * 180, piCoefficient(at)[1] * 360];
    return only(q.choices, (c) => {
      if (!c.endsWith(` ${unit}`)) throw new Error(`no unit in ${c}`);
      const [k, n] = piCoefficient(c.slice(0, -unit.length - 1));
      return k * turn[1] === 2 * Number(r) * turn[0] * n;
    });
  },
  8: (q) => {
    const [, f, degree, radian] = read(
      /^What is the exact value of (sin|cos|tan)(?: (\d+)°|\((.+)\))\?$/,
      q,
    );
    const turn = degree
      ? rad(Number(degree))
      : (piCoefficient(radian)[0] * Math.PI) / piCoefficient(radian)[1];
    return only(q.choices, (c) => close(exact(c), TRIG[f](turn), 1e-9));
  },
  9: (q) => {
    const cosine =
      /^In triangle ABC, a = (\d+) (cm|m), b = (\d+) \2 and angle C = (\d+)°\. How long is side c\? Round to 1 dp\.$/.exec(
        q.prompt,
      );
    if (cosine) {
      const C = rad(Number(cosine[4]));
      const b = Number(cosine[3]);
      const side = Math.hypot(
        b * Math.cos(C) - Number(cosine[1]),
        b * Math.sin(C),
      );
      return only(q.choices, (c) => measured(c, cosine[2], side));
    }
    const [, A, B, a, unit] = read(
      /^In triangle ABC, angle A = (\d+)°, angle B = (\d+)° and a = (\d+) (cm|m)\. How long is side b\? Round to 1 dp\.$/,
      q,
    );
    const tA = rad(Number(A));
    const tB = rad(Number(B));
    const [s] = solve2(
      [Math.cos(tA), Math.cos(tB), 1],
      [Math.sin(tA), -Math.sin(tB), 0],
    );
    const C = [s * Math.cos(tA), s * Math.sin(tA)];
    const scale = Number(a) / Math.hypot(C[0] - 1, C[1]);
    return only(q.choices, (c) =>
      measured(c, unit, Math.hypot(C[0], C[1]) * scale),
    );
  },
  10: (q) => {
    const [, equation] = read(/^Solve (.+) for 0° ≤ x < 360°\.$/, q);
    const m = /^(?:(\d) )?(sin|cos|tan) x(?: ([+−]) (\S+))? = (\S+)$/.exec(
      equation,
    );
    if (!m) throw new Error(`unreadable equation ${equation}`);
    const a = Number(m[1] ?? 1);
    const shift = m[3] ? (m[3] === "+" ? 1 : -1) * exact(m[4]) : 0;
    const right = exact(m[5]);
    const roots = Array.from({ length: 360 }, (_, x) => x).filter(
      (x) =>
        !(m[2] === "tan" && x % 180 === 90) &&
        Math.abs(a * TRIG[m[2]](rad(x)) + shift - right) < 1e-9,
    );
    if (roots.length !== 2) throw new Error(`${roots.length} roots`);
    const text = `{${roots.map((x) => `${x}°`).join(", ")}}`;
    return only(q.choices, (c) => c === text);
  },
} satisfies Checks;

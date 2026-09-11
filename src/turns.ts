import { Curve, Vector3 } from "three";

export const RIDE_STYLES = [
  "sweep",
  "slalom",
  "switchback",
  "tightening",
  "weave",
  "spiral",
] as const;
export type RideStyle = (typeof RIDE_STYLES)[number];

const movements: Record<RideStyle, readonly number[]> = {
  sweep: [0.8, 1.15, -0.65],
  slalom: [1.25, -1.65, 1.55, -1.05],
  switchback: [2.25, -2.5, 1],
  tightening: [0.45, 0.7, 1.2, -1.15],
  weave: [0.65, -1.3, 1.35, -1.25, 0.8],
  spiral: [0.35, 4.4, 0.35],
};

// Change horizontal direction while retaining the original distance/height
// profile. The speed model can keep following the same downhill slopes.
export class TurnCurve extends Curve<Vector3> {
  start: Vector3;
  forward: Vector3;
  right: Vector3;
  readonly style: RideStyle;
  private readonly positions: Float64Array;
  private readonly derivatives: Float64Array;

  constructor(reference: Curve<Vector3>, rng: () => number, style: RideStyle) {
    super();
    this.style = style;
    this.start = reference.getPoint(0);
    this.forward = reference.getTangent(0).setY(0).normalize();
    this.right = new Vector3().crossVectors(this.forward, new Vector3(0, 1, 0));
    this.arcLengthDivisions = 1400;
    const count = this.arcLengthDivisions;
    this.positions = new Float64Array((count + 1) * 3);
    this.derivatives = new Float64Array((count + 1) * 3);
    const length = reference.getLength();
    const step = length / count;
    const direction = rng() < 0.5 ? -1 : 1;
    const strength = 0.9 + rng() * 0.15;
    const angles = movements[style].map(
      (angle) => angle * direction * strength * (0.9 + rng() * 0.2),
    );
    if (style !== "spiral" && style !== "tightening" && rng() < 0.5)
      angles.reverse();
    const weights = angles.map((angle, i) =>
      style === "tightening"
        ? (1.3 - i * 0.1) * (0.9 + rng() * 0.2)
        : Math.abs(angle) * (0.85 + rng() * 0.3),
    );
    const entry = 10 + rng() * 4;
    const exit = 16 + rng() * 5;
    const gap = 1.5 + rng() * 2.5;
    const available = length - entry - exit - gap * (angles.length - 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cursor = entry;
    const turns = angles.map((angle, i) => {
      const span = (available * weights[i]) / totalWeight;
      const turn = {
        start: cursor / length,
        end: (cursor + span) / length,
        // Keep the bend radius comfortably larger than the tube radius.
        angle: Math.sign(angle) * Math.min(Math.abs(angle), span * 0.04),
      };
      cursor += span + gap;
      return turn;
    });
    const heading = (u: number) => {
      let angle = 0;
      for (const turn of turns) {
        const t = Math.max(
          0,
          Math.min(1, (u - turn.start) / (turn.end - turn.start)),
        );
        angle += turn.angle * t * t * t * (10 + t * (-15 + t * 6));
      }
      return angle;
    };
    const derivative = (u: number, target: Vector3) => {
      const y = reference.getTangentAt(u, target).y;
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = heading(u);
      return target.set(
        Math.sin(angle) * horizontal,
        y,
        Math.cos(angle) * horizontal,
      );
    };
    const previous = derivative(0, new Vector3());
    const middle = new Vector3();
    const next = new Vector3();
    const point = new Vector3();
    previous.clone().multiplyScalar(step).toArray(this.derivatives, 0);
    for (let i = 1; i <= count; i++) {
      derivative((i - 0.5) / count, middle);
      derivative(i / count, next);
      const at = i * 3;
      // Simpson integration keeps the sampled curve's arc length and slope
      // within the original curve's own sampling precision.
      this.positions[at] =
        this.positions[at - 3] +
        (step / 6) * (previous.x + 4 * middle.x + next.x);
      this.positions[at + 1] =
        reference.getPointAt(i / count, point).y - this.start.y;
      this.positions[at + 2] =
        this.positions[at - 1] +
        (step / 6) * (previous.z + 4 * middle.z + next.z);
      next.clone().multiplyScalar(step).toArray(this.derivatives, at);
      previous.copy(next);
    }
    this.updateArcLengths();
  }

  private sample(t: number, tangent: boolean, target: Vector3) {
    const scaled = Math.max(0, Math.min(1, t)) * this.arcLengthDivisions;
    const i = Math.min(this.arcLengthDivisions - 1, Math.floor(scaled));
    const u = scaled - i;
    const u2 = u * u;
    const a = tangent ? 6 * u2 - 6 * u : 2 * u2 * u - 3 * u2 + 1;
    const b = tangent ? 3 * u2 - 4 * u + 1 : u2 * u - 2 * u2 + u;
    const c = tangent ? -6 * u2 + 6 * u : -2 * u2 * u + 3 * u2;
    const d = tangent ? 3 * u2 - 2 * u : u2 * u - u2;
    const at = i * 3;
    const component = (axis: number) =>
      a * this.positions[at + axis] +
      b * this.derivatives[at + axis] +
      c * this.positions[at + axis + 3] +
      d * this.derivatives[at + axis + 3];
    const x = component(0),
      y = component(1),
      z = component(2);
    if (tangent) target.set(0, y, 0);
    else {
      target.copy(this.start);
      target.y += y;
    }
    target.addScaledVector(this.right, x).addScaledVector(this.forward, z);
    return tangent ? target.normalize() : target;
  }

  getPoint(t: number, target = new Vector3()) {
    return this.sample(t, false, target);
  }

  getTangent(t: number, target = new Vector3()) {
    return this.sample(t, true, target);
  }

  rebase(offset: Vector3) {
    this.start.sub(offset);
  }
}

// Each group includes every style. Excluding the last two also keeps the
// boundary between groups from immediately repeating a recent ride.
export class RideStyles {
  private remaining: RideStyle[] = RIDE_STYLES.filter(
    (style) => style !== "sweep",
  );
  private recent: RideStyle[] = ["sweep"];
  private rng: () => number;
  constructor(rng: () => number) {
    this.rng = rng;
  }

  next() {
    if (!this.remaining.length) this.remaining = [...RIDE_STYLES];
    const choices = this.remaining.filter(
      (style) => !this.recent.includes(style),
    );
    const style = choices[Math.floor(this.rng() * choices.length)];
    this.remaining.splice(this.remaining.indexOf(style), 1);
    this.recent = [this.recent[this.recent.length - 1], style];
    return style;
  }
}

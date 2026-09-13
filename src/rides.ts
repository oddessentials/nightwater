import { Curve, Vector3 } from "three";
import { TurnCurve } from "./turns.ts";

export const RIDE_SPEEDS = { relaxed: 0.8, fast: 1, rush: 1.3 } as const;
export type RideSpeed = keyof typeof RIDE_SPEEDS;

export function rideCurve(
  turns: TurnCurve,
  rng: () => number,
  looping: boolean,
) {
  if (looping) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = new RideCurve(turns, rng, true);
      if (candidate.hasClearance()) return candidate;
    }
  }
  return new RideCurve(turns, rng, false);
}

// An offset loop joins the existing turns tangentially. Its sideways travel
// separates the returning shell from the entrance without flattening the loop.
export class RideCurve extends Curve<Vector3> {
  readonly turns: TurnCurve;
  readonly loop: { start: number; end: number } | null;
  private readonly baseLength: number;
  private readonly loopLength: number;
  private readonly radius: number;
  private readonly drift: number;
  private readonly entry: number;
  private readonly origin: Vector3;
  private readonly tangent: Vector3;
  private readonly side: Vector3;
  private readonly up: Vector3;

  constructor(turns: TurnCurve, rng: () => number, looping: boolean) {
    super();
    this.turns = turns;
    this.baseLength = turns.getLength();
    this.radius = 12 + rng() * 3;
    this.drift = (rng() < 0.5 ? -1 : 1) * (10 + rng() * 3);
    this.entry = this.baseLength * (0.38 + rng() * 0.16);
    this.origin = turns.getPointAt(this.entry / this.baseLength);
    this.tangent = turns.getTangentAt(this.entry / this.baseLength);
    this.side = new Vector3()
      .crossVectors(this.tangent, new Vector3(0, 1, 0))
      .normalize();
    this.up = new Vector3().crossVectors(this.side, this.tangent).normalize();
    this.loopLength = looping ? Math.PI * 2 * this.radius : 0;
    const total = this.baseLength + this.loopLength;
    this.loop = looping
      ? {
          start: this.entry / total,
          end: (this.entry + this.loopLength) / total,
        }
      : null;
    this.arcLengthDivisions = Math.ceil(total * 7);
    this.updateArcLengths();
  }

  get style() {
    return this.turns.style;
  }
  get forward() {
    return this.turns.forward;
  }
  get right() {
    return this.turns.right;
  }

  private sample(t: number, tangent: boolean, target: Vector3) {
    const distance =
      Math.max(0, Math.min(1, t)) * (this.baseLength + this.loopLength);
    if (!this.loop || distance <= this.entry)
      return tangent
        ? this.turns.getTangentAt(distance / this.baseLength, target)
        : this.turns.getPointAt(distance / this.baseLength, target);
    if (distance >= this.entry + this.loopLength) {
      const u = Math.max(
        0,
        Math.min(1, (distance - this.loopLength) / this.baseLength),
      );
      return tangent
        ? this.turns.getTangentAt(u, target)
        : this.turns
            .getPointAt(u, target)
            .addScaledVector(this.side, this.drift);
    }
    const u = (distance - this.entry) / this.loopLength;
    const angle = Math.PI * 2 * u;
    if (tangent)
      return target
        .copy(this.tangent)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(this.up, Math.sin(angle))
        .addScaledVector(
          this.side,
          (this.drift * 6 * u * (1 - u)) / this.loopLength,
        )
        .normalize();
    return target
      .copy(this.origin)
      .addScaledVector(this.tangent, this.radius * Math.sin(angle))
      .addScaledVector(this.up, this.radius * (1 - Math.cos(angle)))
      .addScaledVector(this.side, this.drift * u * u * (3 - 2 * u));
  }

  getPoint(t: number, target = new Vector3()) {
    return this.sample(t, false, target);
  }
  getTangent(t: number, target = new Vector3()) {
    return this.sample(t, true, target);
  }

  frameRight(u: number, tangent: Vector3) {
    const t = this.getUtoTmapping(u, 0);
    if (this.loop && t > this.loop.start && t < this.loop.end)
      return this.side
        .clone()
        .addScaledVector(tangent, -this.side.dot(tangent))
        .normalize();
    return new Vector3()
      .crossVectors(tangent, new Vector3(0, 1, 0))
      .normalize();
  }

  hasClearance() {
    const length = this.getLength();
    const count = Math.ceil(length);
    const points = Array.from({ length: count + 1 }, (_, i) =>
      this.getPointAt(i / count),
    );
    const neighbors = Math.ceil((12 * count) / length);
    // One-meter sampling and extra shell clearance cover the gaps between
    // samples, including where a loop rejoins a randomized switchback.
    for (let i = 0; i <= count; i++)
      for (let j = i + neighbors; j <= count; j++)
        if (points[i].distanceToSquared(points[j]) < 5.8 ** 2) return false;
    return true;
  }

  rebase(offset: Vector3) {
    this.turns.rebase(offset);
    this.origin.sub(offset);
  }
}

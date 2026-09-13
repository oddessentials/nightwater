import { Curve, Vector3 } from "three";
import { RIDE_STYLES, RideStyles, TurnCurve } from "./turns.ts";
import { RideCurve, rideCurve, RIDE_SPEEDS, type RideSpeed } from "./rides.ts";

export const C = Object.freeze({
  radius: 15,
  wallTop: 8.4,
  floor: -2.8,
  water: 0,
  eye: 0.6,
  tubeRadius: 2.08,
  tubeEye: 1.15,
  inletY: 4.4,
  exitY: 1.75,
  playerRadius: 0.55,
  currentSpeed: 0.7,
  currentRamp: 3,
});
export const EXITS = Object.freeze([
  { name: "Tideline", angle: -1.03, color: 0x6de9d1 },
  { name: "Afterglow", angle: 0, color: 0xb6a0fa },
  { name: "Undertow", angle: 1.03, color: 0xf3c080 },
]);
export type BasinSpec = { center: Vector3; yaw: number; number: number };
export type Portal = {
  position: Vector3;
  outward: Vector3;
  color: number;
  index: number;
};
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const damp = (a: number, b: number, k: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-k * dt));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function portal(spec: BasinSpec, index: number): Portal {
  const def = EXITS[index];
  const a = spec.yaw + (def ? def.angle : Math.PI);
  const outward = new Vector3(Math.sin(a), 0, -Math.cos(a));
  const position = spec.center.clone().addScaledVector(outward, C.radius);
  position.y += def ? C.exitY : C.inletY;
  return { position, outward, color: def?.color ?? 0xa7dadd, index };
}

function basinCurrent(spec: BasinSpec, body: Vector3, seconds: number) {
  const flow = new Vector3();
  let total = 0;
  for (let i = 0; i < EXITS.length; i++) {
    const toward = portal(spec, i).position.sub(body).setY(0);
    // Nearby mouths pull more strongly; the blend stays below swimming speed.
    const weight = 1 / Math.max(1, toward.lengthSq());
    flow.addScaledVector(toward.normalize(), weight);
    total += weight;
  }
  return flow.multiplyScalar(
    (C.currentSpeed * smooth(clamp(seconds / C.currentRamp, 0, 1))) / total,
  );
}

export class FlumeCurve extends Curve<Vector3> {
  start: Vector3;
  forward: Vector3;
  right: Vector3;
  run: number;
  drop: number;
  amplitude: number;
  turns: number;
  phase: number;
  readonly drops: readonly { start: number; span: number; share: number }[];
  constructor(
    start: Vector3,
    forward: Vector3,
    run: number,
    drop: number,
    seed: number,
    thrilling = false,
  ) {
    super();
    this.start = start.clone();
    this.forward = forward.clone().setY(0).normalize();
    this.right = new Vector3().crossVectors(this.forward, new Vector3(0, 1, 0));
    const rng = random(seed);
    this.run = run;
    this.drop = drop;
    this.amplitude = 13 + rng() * 13;
    this.turns = 1 + rng() * 0.85;
    this.phase = rng() * Math.PI * 2;
    this.drops = !thrilling
      ? []
      : rng() < 0.5
        ? [
            {
              start: 0.25 + rng() * 0.15,
              span: 0.3 + rng() * 0.08,
              share: 0.88,
            },
          ]
        : [
            { start: 0.18 + rng() * 0.08, span: 0.24, share: 0.44 },
            { start: 0.56 + rng() * 0.06, span: 0.24, share: 0.44 },
          ];
    this.arcLengthDivisions = 1400;
    this.updateArcLengths();
  }
  getPoint(t: number, target = new Vector3()) {
    const wave =
      Math.sin(t * Math.PI) ** 2 *
      Math.sin(t * Math.PI * 2 * this.turns + this.phase);
    target
      .copy(this.start)
      .addScaledVector(this.forward, this.run * t)
      .addScaledVector(this.right, wave * this.amplitude);
    const descent = this.drops.length
      ? 0.12 * t +
        this.drops.reduce((sum, drop) => {
          const u = clamp((t - drop.start) / drop.span, 0, 1);
          return sum + drop.share * u * u * u * (10 + u * (-15 + u * 6));
        }, 0)
      : 0.24 * t + 0.76 * smooth(t);
    target.y -= this.drop * descent;
    return target;
  }
  rebase(offset: Vector3) {
    this.start.sub(offset);
  }
}
export type Route = {
  curve: RideCurve;
  destination: BasinSpec;
  color: number;
  seed: number;
  length: number;
};
export function makeRoute(
  from: BasinSpec,
  exit: number,
  seed: number,
  style = RIDE_STYLES[
    Math.floor(random(seed ^ 0x71ab9)() * RIDE_STYLES.length)
  ],
): Route {
  const mouth = portal(from, exit);
  const rng = random(seed ^ 0x321ae);
  const run = 155 + rng() * 65;
  const drop = 37 + rng() * 14;
  const reference = new FlumeCurve(
    mouth.position,
    mouth.outward,
    run,
    drop,
    seed,
    true,
  );
  const curve = rideCurve(
    new TurnCurve(reference, random(seed ^ 0x98ac3), style),
    random(seed ^ 0x3d7ab),
    random(seed ^ 0x4a18f)() < 0.5,
  );
  const end = curve.getPoint(1);
  const outward = curve.getTangent(1).setY(0).normalize();
  const center = end.clone().addScaledVector(outward, C.radius);
  center.y = end.y - C.inletY;
  const yaw = Math.atan2(outward.x, -outward.z);
  return {
    curve,
    destination: { center, yaw, number: from.number + 1 },
    color: mouth.color,
    seed,
    length: curve.getLength(),
  };
}
export function makeFeeder(seed: number, number = 1): Route {
  const reference = new FlumeCurve(
    new Vector3(0, 47, 200),
    new Vector3(0, 0, -1),
    185,
    47 - C.inletY,
    seed,
    true,
  );
  const turns = new TurnCurve(reference, random(seed ^ 0x98ac3), "sweep");
  const tangent = turns.getTangent(1);
  const rotation = Math.atan2(tangent.x, -tangent.z);
  const up = new Vector3(0, 1, 0);
  turns.forward.applyAxisAngle(up, rotation);
  turns.right.applyAxisAngle(up, rotation);
  const curve = rideCurve(turns, random(seed ^ 0x3d7ab), true);
  curve.rebase(curve.getPoint(1).sub(new Vector3(0, C.inletY, C.radius)));
  return {
    curve,
    destination: { center: new Vector3(), yaw: 0, number },
    color: 0x6de9d1,
    seed,
    length: curve.getLength(),
  };
}
export function frameAt(curve: Curve<Vector3>, u: number) {
  const position = curve.getPointAt(clamp(u, 0, 1));
  const tangent = curve.getTangentAt(clamp(u, 0, 1)).normalize();
  const right =
    curve instanceof RideCurve
      ? curve.frameRight(clamp(u, 0, 1), tangent)
      : new Vector3().crossVectors(tangent, new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(right, tangent).normalize();
  return { position, tangent, right, up };
}

export type Phase = "ready" | "tube" | "air" | "splash" | "basin" | "entering";
export type Controls = {
  forward: number;
  strafe: number;
  turn: number;
  lookX: number;
  lookY: number;
};
export const idleControls = (): Controls => ({
  forward: 0,
  strafe: 0,
  turn: 0,
  lookX: 0,
  lookY: 0,
});
export type RideEvent =
  | { kind: "route"; route: Route; from: BasinSpec; exit: number }
  | { kind: "land"; offset: Vector3 }
  | { kind: "splash" };

export class RideState {
  phase: Phase = "ready";
  route: Route;
  basin: BasinSpec;
  body = new Vector3();
  velocity = new Vector3();
  yaw = 0;
  pitch = -0.03;
  roll = 0;
  tubeUp = new Vector3(0, 1, 0);
  rideSpeed: RideSpeed = "fast";
  speed = 10;
  distance = 5;
  elapsed = 0;
  phaseTime = 0;
  landings = 0;
  selected: number | null = null;
  seed: number;
  events: RideEvent[] = [];
  private entryStart = new Vector3();
  private entryYaw = 0;
  private entryPitch = 0;
  private entered = 0;
  private splashStart = new Vector3();
  private styles: RideStyles;

  constructor(seed = 41721, landings = 0) {
    this.seed = seed;
    this.landings = landings;
    this.styles = new RideStyles(random(seed ^ 0x51c87));
    for (let i = 0; i < landings; i++) this.styles.next();
    this.route = makeFeeder(seed, landings + 1);
    this.basin = this.route.destination;
    this.placeTube(0);
  }
  start() {
    if (this.phase === "ready") {
      this.phase = "tube";
      this.phaseTime = 0;
    }
  }
  choose(index: number) {
    if (this.phase !== "basin" || index < 0 || index >= EXITS.length) return;
    this.selected = index;
  }
  private placeTube(dt: number) {
    const f = frameAt(this.route.curve, this.distance / this.route.length);
    this.body.copy(f.position).addScaledVector(f.up, -C.tubeEye);
    this.yaw = Math.atan2(-f.tangent.x, -f.tangent.z);
    this.pitch = Math.asin(f.tangent.y);
    this.tubeUp.copy(f.up);
    const next = this.route.curve.getTangentAt(
      clamp((this.distance + 2.5) / this.route.length, 0, 1),
    );
    const bend = f.tangent.x * next.z - f.tangent.z * next.x;
    this.roll = damp(
      this.roll,
      clamp(-bend * this.speed * 0.2, -0.16, 0.16),
      4,
      dt,
    );
    this.velocity.copy(f.tangent).multiplyScalar(this.speed);
  }
  step(dt: number, input: Controls) {
    dt = clamp(dt, 0, 1 / 30);
    this.elapsed += dt;
    this.phaseTime += dt;
    if (this.phase === "ready") return;
    if (this.phase === "tube") {
      const tangent = this.route.curve.getTangentAt(
        clamp(this.distance / this.route.length, 0, 1),
      );
      const target =
        clamp(23 - tangent.y * 20, 16, 40) * RIDE_SPEEDS[this.rideSpeed];
      // Finish at the original launch speed so every setting shares the same
      // airborne arc and splashdown, independent of the preceding maneuver.
      const remaining = this.route.length - this.distance;
      const approach = smooth(clamp((remaining - 4) / 32, 0, 1));
      const launch = 11.5 - tangent.y * 24;
      this.speed = Math.min(
        damp(this.speed, launch + (target - launch) * approach, 2, dt),
        launch + (52 - launch) * approach,
      );
      this.distance = Math.min(
        this.route.length,
        this.distance + this.speed * dt,
      );
      this.placeTube(dt);
      if (this.distance >= this.route.length) {
        this.phase = "air";
        this.phaseTime = 0;
      }
    } else if (this.phase === "air") {
      this.velocity.y -= 15 * dt;
      this.body.addScaledVector(this.velocity, dt);
      this.pitch = damp(this.pitch, -0.14, 3, dt);
      this.roll = damp(this.roll, 0, 5, dt);
      if (this.body.y <= this.basin.center.y + C.eye * 0.45) {
        this.phase = "splash";
        this.phaseTime = 0;
        this.velocity.multiplyScalar(0.36);
        this.velocity.y = 0;
        this.splashStart.copy(this.body);
        this.landings++;
        this.events.push({ kind: "splash" });
      }
    } else if (this.phase === "splash") {
      const t = clamp(this.phaseTime / 1.2, 0, 1);
      const target = this.basin.center
        .clone()
        .addScaledVector(portal(this.basin, 3).outward, 5.2);
      this.body.lerpVectors(this.splashStart, target, 1 - (1 - t) ** 3);
      this.body.y =
        this.basin.center.y +
        C.eye -
        Math.sin(t * Math.PI) * 0.94 -
        (1 - t) * 0.3;
      this.pitch = damp(this.pitch, 0.055, 2, dt);
      if (t >= 1) {
        const offset = this.basin.center.clone();
        this.body.sub(offset);
        this.route.curve.rebase(offset);
        this.basin.center.set(0, 0, 0);
        this.phase = "basin";
        this.phaseTime = 0;
        this.selected = null;
        this.velocity.set(0, 0, 0);
        this.events.push({ kind: "land", offset });
      }
    } else if (this.phase === "basin") {
      this.yaw -= input.lookX;
      this.yaw += input.turn * 1.65 * dt;
      this.pitch = clamp(this.pitch - input.lookY, -1.15, 1.35);
      let forward = input.forward;
      let strafe = input.strafe;
      if (Math.abs(forward) + Math.abs(strafe) + Math.abs(input.turn) > 0.05)
        this.selected = null;
      if (this.selected !== null) {
        const goal = portal(this.basin, this.selected).position.sub(this.body);
        const desiredYaw = Math.atan2(-goal.x, -goal.z);
        this.yaw +=
          Math.atan2(
            Math.sin(desiredYaw - this.yaw),
            Math.cos(desiredYaw - this.yaw),
          ) *
          (1 - Math.exp(-3.5 * dt));
        this.pitch = damp(this.pitch, 0.01, 3, dt);
        const direction = goal.setY(0).normalize();
        this.velocity.x = damp(this.velocity.x, direction.x * 5.8, 2.4, dt);
        this.velocity.z = damp(this.velocity.z, direction.z * 5.8, 2.4, dt);
      } else {
        const magnitude = Math.max(1, Math.hypot(forward, strafe));
        forward /= magnitude;
        strafe /= magnitude;
        this.velocity.x = damp(
          this.velocity.x,
          (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * strafe) * 5.8,
          3,
          dt,
        );
        this.velocity.z = damp(
          this.velocity.z,
          (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * strafe) * 5.8,
          3,
          dt,
        );
      }
      this.velocity.y = 0;
      // Swimming is relative to the water. Keep its drift separate so wall
      // collisions cannot erase a gentle current at a pipe's lip.
      const motion = this.velocity.clone();
      if (this.selected === null)
        motion.add(basinCurrent(this.basin, this.body, this.phaseTime));
      this.body.addScaledVector(motion, dt);
      this.body.y = this.basin.center.y + C.eye;
      this.speed = motion.length();
      let entering = -1;
      for (let i = 0; i < EXITS.length; i++) {
        const e = portal(this.basin, i);
        const dx = this.body.x - e.position.x,
          dz = this.body.z - e.position.z;
        if (dx * dx + dz * dz < 1.8 ** 2 && motion.dot(e.outward) > 0.25)
          entering = i;
      }
      if (entering >= 0) {
        this.phase = "entering";
        this.phaseTime = 0;
        this.entered = entering;
        this.entryStart.copy(this.body);
        this.entryYaw = this.yaw;
        this.entryPitch = this.pitch;
      } else {
        const rel = this.body.clone().sub(this.basin.center).setY(0);
        const maxR = C.radius - C.playerRadius;
        if (rel.length() > maxR) {
          rel.setLength(maxR);
          this.body.x = this.basin.center.x + rel.x;
          this.body.z = this.basin.center.z + rel.z;
          const outSpeed = this.velocity.dot(rel) / (maxR * maxR);
          if (outSpeed > 0) this.velocity.addScaledVector(rel, -outSpeed);
        }
      }
    } else if (this.phase === "entering") {
      const e = portal(this.basin, this.entered);
      const target = e.position.clone();
      target.y -= C.tubeEye;
      const t = smooth(clamp(this.phaseTime / 0.55, 0, 1));
      this.body.lerpVectors(this.entryStart, target, t);
      const heading = Math.atan2(-e.outward.x, -e.outward.z);
      this.yaw =
        this.entryYaw +
        Math.atan2(
          Math.sin(heading - this.entryYaw),
          Math.cos(heading - this.entryYaw),
        ) *
          t;
      this.pitch = this.entryPitch * (1 - t);
      this.roll = 0;
      if (t >= 1) {
        const from = this.basin;
        this.route = makeRoute(
          from,
          this.entered,
          this.seed + this.landings * 971 + this.entered * 3571,
          this.styles.next(),
        );
        this.basin = this.route.destination;
        this.events.push({
          kind: "route",
          route: this.route,
          from,
          exit: this.entered,
        });
        this.phase = "tube";
        this.phaseTime = 0;
        this.distance = 0;
        this.speed = 7;
        this.selected = null;
        this.placeTube(dt);
      }
    }
  }
}

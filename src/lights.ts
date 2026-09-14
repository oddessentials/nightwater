import type { Route } from "./model.ts";
import { RIDE_SPEEDS, tubeSpeed, type RideSpeed } from "./rides.ts";

export type Multiplier = 1 | 2 | 5 | 10;
export const LIGHT_STYLES = {
  2: { name: "Ember", color: "#55edcf" },
  5: { name: "Lantern", color: "#bb83ff" },
  10: { name: "Star", color: "#ffce58" },
} as const;
export type RideLight = {
  distance: number;
  angle: number;
  tier: Exclude<Multiplier, 1>;
};
export const LIGHT_LAYER = 1;
export const LIGHT_RADIUS = 1.15;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function leanLimit(
  speed: number,
  setting: RideSpeed,
  distance: number,
  length: number,
) {
  const pace = speed / RIDE_SPEEDS[setting];
  const angle = ((40 + 35 * clamp((pace - 16) / 19, 0, 1)) * Math.PI) / 180;
  return (
    angle *
    smooth(clamp(distance / 10, 0, 1)) *
    smooth(clamp((length - distance) / 14, 0, 1))
  );
}

export const lightSize = (tier: RideLight["tier"]) =>
  tier === 10 ? 0.27 : tier === 5 ? 0.19 : 0.12;

export function makeRideLights(route: Route): RideLight[] {
  let seed = route.seed >>> 0;
  const draw = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const lights: RideLight[] = [];
  let side = draw() < 0.5 ? -1 : 1;
  for (
    let cell = 2;
    2.8 + cell * 5.6 < route.length - 18;
    cell += draw() < 0.7 ? 2 : 3
  ) {
    const i = lights.length;
    if (i % 4 === 0) side = draw() < 0.5 ? -1 : 1;
    lights.push({
      distance: 2.8 + cell * 5.6,
      angle: side,
      tier: i % 4 === 2 ? 5 : 2,
    });
  }
  if (!lights.length) return lights;
  const limits = lights.map(() => Infinity);
  for (const setting of Object.keys(RIDE_SPEEDS) as RideSpeed[]) {
    let distance = 0,
      speed = 7,
      next = 0;
    while (next < lights.length) {
      const slope = route.curve.getTangentAt(distance / route.length).y;
      speed = tubeSpeed(speed, slope, route.length - distance, setting, 1 / 60);
      distance += speed / 60;
      if (distance >= lights[next].distance) {
        limits[next] = Math.min(
          limits[next],
          leanLimit(speed, setting, distance, route.length),
        );
        next++;
      }
    }
  }
  let star = Math.min(2, lights.length - 1);
  for (let i = 2; i < lights.length - 2; i++)
    if (limits[i] > limits[star]) star = i;
  lights[star].tier = 10;
  for (let i = Math.max(0, star - 2); i < star; i++)
    lights[i].angle = lights[star].angle;
  lights.forEach((light, i) => {
    light.angle *=
      light.tier === 10
        ? limits[i] * 0.88
        : light.tier === 5
          ? limits[i] * 0.6
          : 0.08 + draw() * 0.2;
  });
  return lights;
}

export function catchesLight(
  light: RideLight,
  from: number,
  to: number,
  fromAngle: number,
  toAngle: number,
) {
  const reach = 0.55;
  if (to < from || to < light.distance - reach || from > light.distance + reach)
    return false;
  const span = to - from;
  const a = span ? clamp((light.distance - reach - from) / span, 0, 1) : 0;
  const b = span ? clamp((light.distance + reach - from) / span, 0, 1) : 1;
  const lo = fromAngle + (toAngle - fromAngle) * a;
  const hi = fromAngle + (toAngle - fromAngle) * b;
  const tolerance = (lightSize(light.tier) + 0.12) / LIGHT_RADIUS;
  return (
    light.angle >= Math.min(lo, hi) - tolerance &&
    light.angle <= Math.max(lo, hi) + tolerance
  );
}

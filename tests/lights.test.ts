import test from "node:test";
import assert from "node:assert/strict";
import {
  Group,
  Matrix4,
  PerspectiveCamera,
  PlaneGeometry,
  Vector3,
} from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import {
  C,
  RideState,
  frameAt,
  idleControls,
  makeRoute,
  portal,
} from "../src/model.ts";
import {
  catchesLight,
  leanLimit,
  LIGHT_LAYER,
  LIGHT_RADIUS,
  lightSize,
  makeRideLights,
} from "../src/lights.ts";
import { RIDE_SPEEDS, type RideSpeed } from "../src/rides.ts";
import { RIDE_STYLES } from "../src/turns.ts";
import {
  disposeGroup,
  catchLight,
  aimNextLight,
  makeFlumeMesh,
  makeLightsMesh,
} from "../src/geometry.ts";
import { Journey, newJourney } from "../src/journey.ts";

test("lights repeat by seed, align with arches, fit inside the shell, and include one star", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const route = makeRoute(
      { center: new Vector3(), yaw: 0, number: 1 },
      seed % 3,
      seed * 971,
    );
    const lights = makeRideLights(route);
    assert.deepEqual(makeRideLights(route), lights);
    assert.equal(lights.filter((light) => light.tier === 10).length, 1);
    assert.ok(lights.some((light) => light.tier === 5));
    for (const [i, light] of lights.entries()) {
      assert.ok(light.distance > 6 && light.distance < route.length - 6);
      assert.ok(
        Math.abs(
          light.distance / 5.6 - 0.5 - Math.round(light.distance / 5.6 - 0.5),
        ) < 1e-8,
      );
      assert.ok(LIGHT_RADIUS + lightSize(light.tier) < C.tubeRadius - 0.5);
      assert.ok(Math.abs(light.angle) < Math.PI / 2);
      if (i) assert.ok(light.distance - lights[i - 1].distance >= 11.19);
    }
    const before = [...lights];
    route.curve.rebase(new Vector3(50, -12, 34));
    assert.deepEqual(makeRideLights(route), before);
  }
});

test("swept catches detect crossings, angular misses, and movement through the angular window", () => {
  const light = { distance: 10, angle: 0.7, tier: 10 as const };
  assert.equal(catchesLight(light, 9, 11, 0.7, 0.7), true);
  assert.equal(catchesLight(light, 9, 11, -0.7, -0.7), false);
  assert.equal(catchesLight(light, 9, 11, 0, 1.4), true);
  assert.equal(catchesLight(light, 8, 9, 0.7, 0.7), false);
  assert.equal(catchesLight(light, 11, 12, 0.7, 0.7), false);
  assert.equal(catchesLight(light, 11, 9, 0.7, 0.7), false);
});

test("stars are steerable at every speed and style, with centered launches and exactly one catch event per light", () => {
  for (const speed of Object.keys(RIDE_SPEEDS) as RideSpeed[])
    for (let seed = 1; seed <= 18; seed++) {
      const state = new RideState(seed);
      if (seed > 6) {
        state.route = makeRoute(
          { center: new Vector3(), yaw: 0, number: 1 },
          seed % 3,
          seed * 971,
          RIDE_STYLES[seed % RIDE_STYLES.length],
        );
        state.basin = state.route.destination;
        state.lights = makeRideLights(state.route);
        state.distance = 0;
        state.speed = 7;
      }
      state.rideSpeed = speed;
      const star = state.lights.find((light) => light.tier === 10)!;
      const events: number[] = [];
      state.start();
      for (let i = 0; state.phase === "tube" && i < 1800; i++) {
        const limit = leanLimit(
          state.speed,
          speed,
          state.distance,
          state.route.length,
        );
        const strafe =
          state.distance > star.distance - 30 &&
          state.distance < star.distance + 1
            ? Math.max(-1, Math.min(1, star.angle / Math.max(limit, 0.01)))
            : 0;
        state.step(i % 2 ? 1 / 30 : 1 / 60, { ...idleControls(), strafe });
        for (const event of state.events.splice(0))
          if (event.kind === "catch") events.push(event.index);
        const frame = frameAt(
          state.route.curve,
          state.distance / state.route.length,
        );
        assert.ok(state.body.distanceTo(frame.position) < C.tubeRadius - 0.5);
        assert.ok(state.body.toArray().every(Number.isFinite));
      }
      assert.equal(state.phase, "air");
      assert.equal(state.multiplier, 10, `${speed}, seed ${seed}: star missed`);
      assert.equal(events.length, new Set(events).size);
      assert.equal(state.lean, 0);
      const frame = frameAt(state.route.curve, 1);
      assert.ok(
        state.body.distanceTo(
          frame.position.addScaledVector(frame.up, -C.tubeEye),
        ) < 1e-8,
      );
      for (let i = 0; state.phase !== "basin" && i < 600; i++)
        state.step(1 / 60, idleControls());
      assert.equal(state.phase, "basin");
      assert.ok(
        state.body.distanceTo(
          portal(state.basin, 3).outward.multiplyScalar(5.2).setY(C.eye),
        ) < 1e-8,
      );
    }
});

test("answer events consume the landed bonus before the new ride can collect another", () => {
  const state = new RideState(2310);
  const journey = new Journey(newJourney(42));
  state.start();
  while (state.phase !== "basin") state.step(1 / 60, idleControls());
  journey.arm(state.multiplier);
  const bonus = journey.state.multiplier;
  state.events.length = 0;
  state.choose(journey.question!.correct);
  while (state.phase !== "tube") state.step(1 / 60, idleControls());
  assert.equal(state.multiplier, 1);
  assert.equal(state.caught.size, 0);
  const routes = state.events.filter((event) => event.kind === "route");
  assert.equal(routes.length, 1);
  const feedback = journey.answer(routes[0].exit, 35_000)!;
  assert.equal(feedback.points, 100 * bonus);
  assert.equal(journey.state.multiplier, 1);
  assert.equal(journey.state.score, 100 * bonus);
});

test("caught light instances retain their pose for absorption, stay out of reflections, and release", () => {
  const route = new RideState(2310).route;
  const lights = makeRideLights(route);
  const mesh = makeLightsMesh(route, lights);
  const camera = new PerspectiveCamera();
  camera.layers.enable(LIGHT_LAYER);
  const reflector = new Reflector(new PlaneGeometry(1, 1));
  const reflected = reflector.getReflectionCamera(camera);
  reflected.layers.disable(LIGHT_LAYER);
  assert.equal(camera.layers.test(mesh.layers), true);
  assert.equal(reflected.layers.test(mesh.layers), false);
  const matrix = new Matrix4();
  let disposed = 0;
  mesh.addEventListener("dispose", () => disposed++);
  const group = new Group();
  group.add(mesh);
  mesh.getMatrixAt(0, matrix);
  const pose = matrix.clone();
  const caught = mesh.geometry.getAttribute("aCaught");
  assert.equal(caught.getX(0), -1);
  catchLight(group, 0, 12.5);
  mesh.getMatrixAt(0, matrix);
  assert.deepEqual(matrix, pose);
  assert.equal(caught.getX(0), 12.5);
  assert.equal(caught.getX(1), -1);
  catchLight(group, 0, 13);
  assert.equal(
    caught.getX(0),
    12.5,
    "a duplicate catch cannot restart absorption",
  );
  disposeGroup(group);
  assert.equal(disposed, 1);
  reflector.dispose();
  reflector.geometry.dispose();
});

test("light pools update only the caught light and the next target advances on catches and misses", () => {
  const state = new RideState(2310);
  const flume = makeFlumeMesh(state.route, state.lights);
  const blocks = flume.userData.glowBlocks;
  assert.equal(blocks.length, state.lights.length);
  const next = flume.userData.pickupUniforms.uNext.value;
  aimNextLight(flume, state.lights, new Set(), 0);
  assert.equal(next.x, state.lights[0].distance);
  aimNextLight(flume, state.lights, new Set([0]), 0);
  assert.equal(next.x, state.lights[1].distance);
  aimNextLight(flume, state.lights, new Set(), state.lights[1].distance + 0.1);
  assert.equal(next.x, state.lights[2].distance);
  catchLight(flume, 1, 8);
  for (const [index, lightBlocks] of blocks.entries()) {
    for (const { attribute, start, count } of lightBlocks) {
      assert.ok(count > 0);
      let weight = 0;
      for (let i = start; i < start + count; i++) {
        assert.equal(attribute.getY(i), index === 1 ? 8 : -1);
        assert.equal(attribute.getZ(i), state.lights[index].tier);
        weight += attribute.getX(i);
      }
      assert.ok(weight > 0, "each pickup illuminates both shell and water");
    }
  }
  aimNextLight(flume, state.lights, new Set(), state.route.length);
  assert.equal(next.w, 0);
  disposeGroup(flume);
});

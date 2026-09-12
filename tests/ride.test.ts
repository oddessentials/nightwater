import test from "node:test";
import assert from "node:assert/strict";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  C,
  FlumeCurve,
  RideState,
  frameAt,
  idleControls,
  makeFeeder,
  makeRoute,
  portal,
  random,
} from "../src/model.ts";
import { tubeGeometry } from "../src/geometry.ts";
import { RIDE_STYLES, RideStyles } from "../src/turns.ts";

test("every generated route descends continuously and meets its destination inlet", () => {
  const spec = { center: new Vector3(15, -27, 51), yaw: 0.72, number: 8 };
  for (let seed = 1; seed <= 210; seed++)
    for (let exit = 0; exit < 3; exit++) {
      const route = makeRoute(spec, exit, seed * 971);
      assert.ok(
        route.curve.getPoint(0).distanceTo(portal(spec, exit).position) < 1e-6,
      );
      assert.ok(
        route.curve
          .getPoint(1)
          .distanceTo(portal(route.destination, 3).position) < 1e-6,
      );
      for (let i = 0; i <= 120; i++)
        assert.ok(
          route.curve.getTangentAt(i / 120).y < 0,
          `uphill: seed ${seed}, exit ${exit}, t ${i}`,
        );
      assert.ok(
        route.curve
          .getTangentAt(1)
          .clone()
          .setY(0)
          .normalize()
          .dot(portal(route.destination, 3).outward) < -0.999,
      );
    }
});

test("new turn sequences preserve the original distance, drop, and downhill pacing", () => {
  const spec = { center: new Vector3(), yaw: 0.37, number: 1 };
  for (let ride = 1; ride <= 210; ride++) {
    const exit = ride % 3;
    const seed = 41721 + ride * 971 + exit * 3571;
    const route = makeRoute(
      spec,
      exit,
      seed,
      RIDE_STYLES[ride % RIDE_STYLES.length],
    );
    const rng = random(seed ^ 0x321ae);
    const mouth = portal(spec, exit);
    const original = new FlumeCurve(
      mouth.position,
      mouth.outward,
      155 + rng() * 65,
      37 + rng() * 14,
      seed,
    );
    assert.ok(Math.abs(route.length - original.getLength()) < 0.005);
    assert.ok(
      Math.abs(
        Math.ceil(route.length * 2.5) - Math.ceil(original.getLength() * 2.5),
      ) <= 1,
    );
    for (let i = 0; i <= 100; i++) {
      assert.ok(
        Math.abs(
          route.curve.getPointAt(i / 100).y - original.getPointAt(i / 100).y,
        ) < 0.002,
      );
      assert.ok(
        Math.abs(
          route.curve.getTangentAt(i / 100).y -
            original.getTangentAt(i / 100).y,
        ) < 0.002,
      );
    }
  }
  const feeder = makeFeeder(41721);
  assert.ok(Math.abs(feeder.length - 207.74931781949417) < 0.005);
  assert.ok(
    feeder.curve
      .getPoint(1)
      .distanceTo(portal(feeder.destination, 3).position) < 1e-6,
  );
  assert.ok(
    feeder.curve
      .getTangent(1)
      .setY(0)
      .normalize()
      .dot(new Vector3(0, 0, -1)) > 0.99999,
  );
});

test("turns leave room for the shell, other sections, and both pools", () => {
  const spec = { center: new Vector3(), yaw: 0, number: 1 };
  for (let ride = 1; ride <= 210; ride++) {
    for (let exit = 0; exit < 3; exit++) {
      const route = makeRoute(spec, exit, ride * 971 + exit * 3571);
      const count = 192;
      const spacing = route.length / count;
      const points = Array.from({ length: count + 1 }, (_, i) =>
        route.curve.getPointAt(i / count),
      );
      let tangent = route.curve.getTangentAt(0);
      const label = `ride ${ride}, exit ${exit}, ${route.curve.style}`;
      for (let i = 1; i <= count; i++) {
        const next = route.curve.getTangentAt(i / count);
        const bend = Math.acos(Math.max(-1, Math.min(1, tangent.dot(next))));
        assert.ok(bend / spacing < 0.105, `tight bend: ${label}, sample ${i}`);
        tangent = next;
        for (let j = i + Math.ceil(12 / spacing); j <= count; j++)
          assert.ok(
            points[i].distanceToSquared(points[j]) >
              (C.tubeRadius * 2 + 0.5) ** 2,
            `overlap: ${label}, samples ${i}/${j}`,
          );
        for (const [basin, atEntrance] of [
          [spec, true],
          [route.destination, false],
        ] as const) {
          if (atEntrance ? i * spacing < 4 : (count - i) * spacing < 4)
            continue;
          const point = points[i].clone().sub(basin.center);
          if (
            point.y > C.wallTop + C.tubeRadius ||
            point.y < C.floor - C.tubeRadius
          )
            continue;
          assert.ok(
            Math.hypot(point.x, point.z) > C.radius + C.tubeRadius,
            `pool intersection: ${label}, sample ${i}`,
          );
        }
      }
    }
  }
});

test("style rotation is reproducible and balanced over 210 rides without recent repeats", () => {
  for (const seed of [1, 2310, 41721, 987654, 0xffffffff]) {
    const first = new RideStyles(random(seed));
    const second = new RideStyles(random(seed));
    const history = ["sweep"];
    for (let i = 1; i < 210; i++) {
      const style = first.next();
      assert.equal(style, second.next());
      assert.ok(!history.slice(-2).includes(style));
      history.push(style);
    }
    for (const style of RIDE_STYLES)
      assert.equal(history.filter((entry) => entry === style).length, 35);
  }
});

test("first and subsequent flumes have a closed shell around the camera along the whole ride", () => {
  const routes = [
    makeFeeder(1),
    ...RIDE_STYLES.map((style, i) =>
      makeRoute(
        { center: new Vector3(), yaw: 0, number: 1 },
        i % 3,
        2431 + i,
        style,
      ),
    ),
  ];
  for (const route of routes) {
    const geometry = tubeGeometry(
      route.curve,
      C.tubeRadius,
      Math.ceil(route.length * 2.5),
    );
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    for (let i = 1; i < 65; i++) {
      const f = frameAt(route.curve, i / 65);
      const eye = f.position.clone().addScaledVector(f.up, -C.tubeEye);
      for (const direction of [
        f.up,
        f.up.clone().negate(),
        f.right,
        f.right.clone().negate(),
      ]) {
        const hits = new Raycaster(eye, direction, 0, 4).intersectObject(mesh);
        assert.ok(hits.length > 0, `missing shell at ${i}/65`);
        assert.ok(hits[0].distance < 3.3);
      }
    }
    geometry.dispose();
    material.dispose();
  }
});

function stepUntil(state: RideState, phase: string, maxSeconds = 45) {
  let frames = 0;
  for (; frames < maxSeconds * 60 && state.phase !== phase; frames++) {
    state.step(1 / 60, idleControls());
    state.events.length = 0;
  }
  assert.equal(state.phase, phase);
  return frames / 60;
}
test("210 actual choices produce distinct rides through tube, air, splash, and basin", () => {
  const state = new RideState(2310);
  const shapes = new Set<string>();
  const styles = [state.route.curve.style];
  const durations: number[] = [];
  state.start();
  stepUntil(state, "basin");
  for (let cycle = 0; cycle < 210; cycle++) {
    assert.equal(state.landings, cycle + 1);
    assert.equal(state.basin.center.length(), 0);
    assert.ok(Math.abs(state.body.y - C.eye) < 1e-6);
    assert.ok(Math.abs(Math.hypot(state.body.x, state.body.z) - 5.2) < 1e-6);
    assert.ok(state.body.y < C.wallTop - 6);
    assert.equal([0, 1, 2].map((i) => portal(state.basin, i)).length, 3);
    assert.ok(portal(state.basin, 3).position.y - C.tubeRadius > C.eye + 1);
    state.choose(cycle % 3);
    stepUntil(state, "entering");
    stepUntil(state, "tube");
    assert.ok(!styles.slice(-2).includes(state.route.curve.style));
    styles.push(state.route.curve.style);
    const forward = state.route.curve.forward;
    const right = state.route.curve.right;
    shapes.add(
      JSON.stringify(
        Array.from({ length: 12 }, (_, i) => {
          const tangent = state.route.curve.getTangentAt((i + 1) / 13);
          return [tangent.dot(forward), tangent.dot(right), tangent.y].map(
            (v) => Math.round(v * 1000),
          );
        }),
      ),
    );
    const seconds = stepUntil(state, "air");
    assert.ok(seconds >= 9.5 && seconds <= 17.5, `duration ${seconds}`);
    durations.push(seconds);
    stepUntil(state, "splash");
    stepUntil(state, "basin");
    for (const n of [...state.body.toArray(), state.pitch, state.yaw])
      assert.ok(Number.isFinite(n));
  }
  assert.equal(shapes.size, 210);
  assert.ok(
    Math.abs(durations.reduce((a, b) => a + b, 0) / durations.length - 13.2) <
      0.5,
  );
});

test("WASD is camera-relative and solid walls and raised inlet cannot be paddled through", () => {
  const state = new RideState();
  state.start();
  stepUntil(state, "basin");
  state.body.set(0, C.eye, 0);
  state.yaw = 0;
  state.velocity.set(0, 0, 0);
  for (let i = 0; i < 60; i++)
    state.step(1 / 60, { ...idleControls(), strafe: -1 });
  assert.ok(state.body.x < -3);
  assert.ok(Math.abs(state.body.z) < C.currentSpeed);
  state.body.set(0, C.eye, 0);
  state.velocity.set(0, 0, 0);
  for (let i = 0; i < 60; i++)
    state.step(1 / 60, { ...idleControls(), strafe: 1 });
  assert.ok(state.body.x > 3);
  state.body.set(0, C.eye, 0);
  state.velocity.set(0, 0, 0);
  state.yaw = Math.PI;
  for (let i = 0; i < 15 * 60; i++)
    state.step(1 / 60, { ...idleControls(), forward: 1 });
  assert.equal(state.phase, "basin");
  assert.ok(state.body.z <= C.radius - C.playerRadius + 0.001);
  assert.equal(state.body.y, C.eye);
  state.choose(0);
  state.step(1 / 60, { ...idleControls(), forward: 1 });
  assert.equal(state.selected, null);
});

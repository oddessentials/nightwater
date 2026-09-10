import test from "node:test";
import assert from "node:assert/strict";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import {
  C,
  RideState,
  frameAt,
  idleControls,
  makeFeeder,
  makeRoute,
  portal,
} from "../src/model.ts";
import { tubeGeometry } from "../src/geometry.ts";

test("every generated route descends continuously and meets its destination inlet", () => {
  const spec = { center: new Vector3(15, -27, 51), yaw: 0.72, number: 8 };
  for (let seed = 1; seed <= 80; seed++)
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

test("first and subsequent flumes have a closed shell around the camera along the whole ride", () => {
  const routes = [
    makeFeeder(1),
    ...[0, 1, 2].map((i) =>
      makeRoute({ center: new Vector3(), yaw: 0, number: 1 }, i, 2431 + i),
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
  for (let i = 0; i < maxSeconds * 60 && state.phase !== phase; i++) {
    state.step(1 / 60, idleControls());
    state.events.length = 0;
  }
  assert.equal(state.phase, phase);
}
test("sixty consecutive actual choices repeat tube, air, splash, and the same walled basin", () => {
  const state = new RideState(2310);
  state.start();
  stepUntil(state, "basin");
  for (let cycle = 0; cycle < 60; cycle++) {
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
    stepUntil(state, "air");
    stepUntil(state, "splash");
    stepUntil(state, "basin");
    for (const n of [...state.body.toArray(), state.pitch, state.yaw])
      assert.ok(Number.isFinite(n));
  }
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
  assert.ok(Math.abs(state.body.z) < 0.01);
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

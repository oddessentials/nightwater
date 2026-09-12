import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { C, RideState, idleControls, portal } from "../src/model.ts";

function landed() {
  const state = new RideState();
  state.start();
  for (let i = 0; i < 30 * 60 && state.phase !== "basin"; i++)
    state.step(1 / 60, idleControls());
  assert.equal(state.phase, "basin");
  state.events.length = 0;
  return state;
}

test("idle drift leaves reading time, keeps the camera free, and enters through the normal route event", () => {
  const durations = [];
  for (const hz of [30, 60, 120]) {
    const state = landed();
    const start = state.body.clone();
    state.yaw = 1.2;
    state.pitch = 0.3;
    for (let i = 0; i < 3 * hz; i++) state.step(1 / hz, idleControls());
    assert.equal(state.phase, "basin");
    assert.ok(state.body.distanceTo(start) > 0.1);
    assert.ok(state.body.distanceTo(start) < 1);
    let seconds = 3;
    for (; seconds < 60 && state.phase === "basin"; seconds += 1 / hz) {
      assert.equal(state.selected, null);
      assert.equal(state.yaw, 1.2);
      assert.equal(state.pitch, 0.3);
      assert.equal(state.body.y, C.eye);
      assert.ok(state.speed <= C.currentSpeed);
      state.step(1 / hz, idleControls());
    }
    assert.equal(state.phase, "entering");
    assert.ok(seconds > 35 && seconds < 45, `idle entry after ${seconds}s`);
    assert.deepEqual(state.events, [], "drifting does not submit early");
    durations.push(seconds);
    for (let i = 0; i < hz; i++) state.step(1 / hz, idleControls());
    const routes = state.events.filter((event) => event.kind === "route");
    assert.equal(routes.length, 1);
    assert.equal(routes[0].exit, 1);
    assert.equal(state.phase, "tube");
    for (let i = 0; i < 30 * hz && state.phase !== "basin"; i++)
      state.step(1 / hz, idleControls());
    assert.equal(state.phase, "basin");
    assert.equal(state.phaseTime, 0, "each landing restarts the gentle ramp");
  }
  assert.ok(Math.max(...durations) - Math.min(...durations) < 0.05);
});

test("the current reaches all three mouths across rotated pools and never stalls at the rim", () => {
  const state = landed();
  const center = new Vector3(7, -20, 12);
  for (const yaw of [0, 0.72, -2.3]) {
    const reached = new Set<number>();
    state.basin = { center, yaw, number: 4 };
    const starts = [];
    for (let x = -14; x <= 14; x += 2)
      for (let z = -14; z <= 14; z += 2)
        if (Math.hypot(x, z) <= C.radius - C.playerRadius)
          starts.push(new Vector3(x, 0, z));
    // Begin against the wall too, where collision response clears swim velocity.
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      starts.push(
        new Vector3(Math.sin(angle), 0, -Math.cos(angle)).multiplyScalar(
          C.radius - C.playerRadius,
        ),
      );
    }
    for (const start of starts) {
      state.phase = "basin";
      state.phaseTime = 0;
      state.selected = null;
      state.velocity.set(0, 0, 0);
      state.body
        .copy(start)
        .applyAxisAngle(new Vector3(0, 1, 0), -yaw)
        .add(center);
      state.body.y += C.eye;
      for (let i = 0; i < 75 * 60 && state.phase === "basin"; i++) {
        state.step(1 / 60, idleControls());
        assert.ok(state.body.distanceTo(center) <= C.radius);
      }
      assert.equal(
        state.phase,
        "entering",
        `stalled at ${start.toArray()}, yaw ${yaw}`,
      );
      const distances = [0, 1, 2].map((i) =>
        portal(state.basin, i).position.sub(state.body).setY(0).length(),
      );
      reached.add(distances.indexOf(Math.min(...distances)));
      assert.equal(state.selected, null);
    }
    assert.equal(reached.size, 3);
  }
});

test("paddling buys time, and releasing the controls lets the current resume", () => {
  const state = landed();
  const start = state.body.clone();
  state.yaw = 0;
  state.choose(1);
  for (let i = 0; i < 60 * 60; i++)
    state.step(1 / 60, { ...idleControls(), forward: -1 });
  assert.equal(state.phase, "basin");
  assert.equal(state.selected, null);
  assert.ok(state.body.z > start.z + 5);
  assert.ok(state.body.z <= C.radius - C.playerRadius + 1e-6);
  assert.deepEqual(state.events, []);
  for (let i = 0; i < 75 * 60 && state.phase === "basin"; i++)
    state.step(1 / 60, idleControls());
  assert.equal(state.phase, "entering");
});

test("an explicit choice can redirect a rider already drifting toward another pipe", () => {
  for (const exit of [0, 1, 2]) {
    const state = landed();
    for (let i = 0; i < 32 * 60; i++) state.step(1 / 60, idleControls());
    assert.equal(state.phase, "basin");
    state.choose(exit);
    for (let i = 0; i < 10 * 60 && state.phase !== "tube"; i++)
      state.step(1 / 60, idleControls());
    assert.equal(state.phase, "tube");
    const routes = state.events.filter((event) => event.kind === "route");
    assert.equal(routes.length, 1);
    assert.equal(routes[0].exit, exit);
  }
});

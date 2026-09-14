import test from "node:test";
import assert from "node:assert/strict";
import { BufferAttribute, InstancedMesh, Matrix4, Mesh, Vector3 } from "three";
import { C, makeFeeder, makeRoute } from "../src/model.ts";
import { RIDE_STYLES } from "../src/turns.ts";
import { disposeGroup } from "../src/geometry.ts";
import {
  OVERHEAD_LOOPS,
  OverheadLoop,
  makeOverheadTubes,
} from "../src/scenery.ts";

test("overhead circuits close with matching tangents and stay clear of each other and the pool", () => {
  const loops = Array.from(
    { length: OVERHEAD_LOOPS },
    (_, i) => new OverheadLoop(i),
  );
  const samples = loops.map((curve) => {
    assert.deepEqual(curve.getPoint(0), curve.getPoint(1));
    assert.deepEqual(curve.getTangent(0), curve.getTangent(1));
    return Array.from({ length: 192 }, (_, i) => {
      const point = curve.getPointAt(i / 192);
      assert.ok(point.toArray().every(Number.isFinite));
      assert.ok(Math.hypot(point.x, point.z) > C.radius + curve.tubeRadius + 4);
      assert.ok(point.y - curve.tubeRadius > C.wallTop + 3);
      return point;
    });
  });
  for (let i = 0; i < loops.length; i++)
    for (let j = i + 1; j < loops.length; j++) {
      const clearance = loops[i].tubeRadius + loops[j].tubeRadius + 0.5;
      for (const a of samples[i])
        for (const b of samples[j])
          assert.ok(
            a.distanceTo(b) > clearance,
            `circuits ${i + 1} and ${j + 1} intersect`,
          );
    }
});

const vertex = (attribute: BufferAttribute, index: number) =>
  new Vector3().fromBufferAttribute(attribute, index);

test("support columns stay outside the incoming ride corridor", () => {
  const group = makeOverheadTubes();
  try {
    const columns = group.getObjectByName("circuit-support-columns");
    assert.ok(columns instanceof InstancedMesh);
    const matrix = new Matrix4();
    const supports = Array.from({ length: columns.count }, (_, i) => {
      columns.getMatrixAt(i, matrix);
      return {
        bottom: new Vector3(0, -0.5, 0).applyMatrix4(matrix),
        top: new Vector3(0, 0.5, 0).applyMatrix4(matrix),
      };
    });
    const up = new Vector3(0, 1, 0);
    const closest = new Vector3();
    for (const seed of [2310, 41721, 42]) {
      // Nonzero translation and yaw exercise later pools as well as the feeder.
      const from = {
        center: new Vector3(29, 51, -17),
        yaw: seed * 0.37,
        number: 3,
      };
      const routes = [
        makeFeeder(seed),
        ...RIDE_STYLES.flatMap((style) =>
          [0, 1, 2].map((exit) => makeRoute(from, exit, seed, style)),
        ),
      ];
      for (const route of routes)
        // Scenery appears for the final 30 m; include a 5 m approach margin.
        for (let remaining = 0; remaining <= 35; remaining += 0.5) {
          const point = route.curve
            .getPointAt(1 - remaining / route.length)
            .sub(route.destination.center)
            .applyAxisAngle(up, route.destination.yaw);
          for (const { bottom, top } of supports) {
            closest.copy(bottom);
            closest.y = Math.max(bottom.y, Math.min(top.y, point.y));
            assert.ok(
              point.distanceTo(closest) > C.tubeRadius + 0.3 + 1,
              `support crosses ${route.curve.style} inlet, seed ${seed}, ${remaining} m remaining`,
            );
          }
        }
    }
  } finally {
    disposeGroup(group);
  }
});

test("glass and solid channels meet along both roof edges and the complete loop seam", () => {
  const group = makeOverheadTubes();
  try {
    for (let i = 0; i < OVERHEAD_LOOPS; i++) {
      const body = group.getObjectByName(`circuit-${i + 1}-solid-channel`);
      const roof = group.getObjectByName(`circuit-${i + 1}-glass-canopy`);
      assert.ok(body instanceof Mesh && roof instanceof Mesh);
      const a = body.geometry.getAttribute("position") as BufferAttribute;
      const b = roof.geometry.getAttribute("position") as BufferAttribute;
      const bodyStride = 17;
      const roofStride = 13;
      const rings = a.count / bodyStride;
      assert.equal(rings, b.count / roofStride);
      for (let ring = 0; ring < rings; ring++) {
        assert.ok(
          vertex(a, ring * bodyStride).distanceTo(
            vertex(b, ring * roofStride + roofStride - 1),
          ) < 0.00002,
        );
        assert.ok(
          vertex(a, ring * bodyStride + bodyStride - 1).distanceTo(
            vertex(b, ring * roofStride),
          ) < 0.00002,
        );
      }
      for (const [mesh, stride] of [
        [body, bodyStride],
        [roof, roofStride],
      ] as const)
        for (const name of ["position", "normal"]) {
          const attribute = mesh.geometry.getAttribute(name) as BufferAttribute;
          for (let j = 0; j < stride; j++)
            assert.ok(
              vertex(attribute, j).distanceTo(
                vertex(attribute, (rings - 1) * stride + j),
              ) < 0.00002,
              `${mesh.name}: open ${name} seam`,
            );
        }
    }
  } finally {
    disposeGroup(group);
  }
});

test("batched support resources are released when a pool is retired", () => {
  const group = makeOverheadTubes();
  let instances = 0;
  let released = 0;
  group.traverse((obj) => {
    if (obj instanceof InstancedMesh) {
      instances++;
      obj.addEventListener("dispose", () => released++);
    }
  });
  assert.equal(instances, 2);
  disposeGroup(group);
  assert.equal(released, instances);
});

import * as T from "three";
import { EXITS, frameAt } from "./model.ts";
import { tubeGeometry } from "./geometry.ts";
import { sceneryTubeFragment, tubeVertex } from "./shaders.ts";

export const OVERHEAD_LOOPS = 6;
export const CANOPY_EDGE = Math.asin(0.32);

// Periodic positions and analytic tangents give the circuits a seamless join.
// Radial separation keeps their gently rising and falling paths apart.
export class OverheadLoop extends T.Curve<T.Vector3> {
  readonly radius: number;
  readonly height: number;
  readonly phase: number;
  readonly tubeRadius: number;
  constructor(index: number) {
    super();
    this.radius = 30 + index * 7.2;
    this.height = 17 + index * 7.4 + index * index * 1.35;
    this.phase = index * 0.83;
    this.tubeRadius = 1.65 + (index % 2) * 0.1;
    this.arcLengthDivisions = 720;
  }
  getPoint(t: number, target = new T.Vector3()) {
    const a = (t % 1) * Math.PI * 2;
    const r =
      this.radius +
      Math.sin(a * 2 + this.phase) * 1.35 +
      Math.sin(a * 3 - this.phase) * 0.35;
    return target.set(
      Math.sin(a) * r,
      this.height +
        Math.sin(a * 2 + this.phase) * 2.4 +
        Math.cos(a * 3 - this.phase) * 0.7,
      -Math.cos(a) * r * 1.04,
    );
  }
  getTangent(t: number, target = new T.Vector3()) {
    const a = (t % 1) * Math.PI * 2;
    const r =
      this.radius +
      Math.sin(a * 2 + this.phase) * 1.35 +
      Math.sin(a * 3 - this.phase) * 0.35;
    const dr =
      Math.cos(a * 2 + this.phase) * 2.7 + Math.cos(a * 3 - this.phase) * 1.05;
    return target
      .set(
        Math.cos(a) * r + Math.sin(a) * dr,
        Math.cos(a * 2 + this.phase) * 4.8 - Math.sin(a * 3 - this.phase) * 2.1,
        (Math.sin(a) * r - Math.cos(a) * dr) * 1.04,
      )
      .normalize();
  }
}

export function makeOverheadTubes() {
  const group = new T.Group();
  group.name = "complete-glass-roof-circuits";
  const supportsPerLoop = 6;
  const supports = OVERHEAD_LOOPS * supportsPerLoop;
  const metal = new T.MeshStandardMaterial({
    color: 0x20363e,
    roughness: 0.35,
    metalness: 0.65,
  });
  const columns = new T.InstancedMesh(
    new T.CylinderGeometry(0.2, 0.3, 1, 8),
    metal,
    supports,
  );
  const saddles = new T.InstancedMesh(
    new T.BoxGeometry(1, 0.2, 0.4),
    metal,
    supports,
  );
  columns.name = "circuit-support-columns";
  saddles.name = "aligned-circuit-saddles";
  const matrix = new T.Matrix4();
  const rotation = new T.Quaternion();
  const scale = new T.Vector3();
  for (let i = 0; i < OVERHEAD_LOOPS; i++) {
    const curve = new OverheadLoop(i);
    const segments = 192 + i * 16;
    // A whole number of light bays also closes the material pattern at the join.
    const uniforms = {
      uColor: { value: new T.Color(EXITS[i % 3].color) },
      uBands: { value: Math.round(curve.getLength() / 5.6) },
    };
    const channel = new T.Mesh(
      tubeGeometry(
        curve,
        curve.tubeRadius,
        segments,
        16,
        Math.PI - CANOPY_EDGE,
        Math.PI + CANOPY_EDGE * 2,
      ),
      new T.ShaderMaterial({
        uniforms,
        vertexShader: tubeVertex,
        fragmentShader: sceneryTubeFragment,
        side: T.DoubleSide,
      }),
    );
    const roof = new T.Mesh(
      tubeGeometry(
        curve,
        curve.tubeRadius,
        segments,
        12,
        CANOPY_EDGE,
        Math.PI - CANOPY_EDGE * 2,
      ),
      new T.ShaderMaterial({
        uniforms,
        defines: { GLASS_ROOF: 1 },
        vertexShader: tubeVertex,
        fragmentShader: sceneryTubeFragment,
        side: T.DoubleSide,
        transparent: true,
        depthWrite: false,
        forceSinglePass: true,
      }),
    );
    channel.name = `circuit-${i + 1}-solid-channel`;
    roof.name = `circuit-${i + 1}-glass-canopy`;
    group.add(channel, roof);

    for (let k = 0; k < supportsPerLoop; k++) {
      const f = frameAt(curve, (k + (i % 2) * 0.5) / supportsPerLoop);
      const seat = f.position
        .clone()
        .addScaledVector(f.up, -curve.tubeRadius - 0.12);
      const h = seat.y + 16;
      const index = i * supportsPerLoop + k;
      matrix.compose(
        new T.Vector3(seat.x, seat.y - h / 2, seat.z),
        rotation.identity(),
        scale.set(1, h, 1),
      );
      columns.setMatrixAt(index, matrix);
      matrix.makeBasis(f.right, f.up, f.tangent.clone().negate());
      rotation.setFromRotationMatrix(matrix);
      matrix.compose(
        seat,
        rotation,
        scale.set(curve.tubeRadius * 2 + 0.45, 1, 1),
      );
      saddles.setMatrixAt(index, matrix);
    }
  }
  columns.computeBoundingSphere();
  saddles.computeBoundingSphere();
  group.add(columns, saddles);
  return group;
}

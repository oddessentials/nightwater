import * as T from "three";
import { C, frameAt, type Route } from "./model.ts";
import {
  tubeVertex,
  tubeFragment,
  filmVertex,
  filmFragment,
} from "./shaders.ts";

export function tubeGeometry(
  curve: T.Curve<T.Vector3>,
  radius: number,
  segments: number,
  radial = 48,
  startAngle = 0,
  arc = Math.PI * 2,
) {
  const positions: number[] = [],
    normals: number[] = [],
    uvs: number[] = [],
    around: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = frameAt(curve, i / segments);
    for (let j = 0; j <= radial; j++) {
      const angle = startAngle + (j / radial) * arc,
        c = Math.cos(angle),
        s = Math.sin(angle);
      const n = f.right.clone().multiplyScalar(c).addScaledVector(f.up, s);
      const p = f.position.clone().addScaledVector(n, radius);
      positions.push(p.x, p.y, p.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(i / segments, angle / (Math.PI * 2));
      around.push(c, s);
      if (i < segments && j < radial) {
        const a = i * (radial + 1) + j,
          b = a + radial + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("aAround", new T.Float32BufferAttribute(around, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}
export function tubeMaterial(
  color: number,
  length: number,
  seed = 0,
  exterior = false,
) {
  return new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSkyTime: { value: 0 },
      uColor: { value: new T.Color(color) },
      uLength: { value: length },
      uSeed: { value: seed % 20 },
      uExterior: { value: exterior ? 1 : 0 },
    },
    vertexShader: tubeVertex,
    fragmentShader: tubeFragment,
    side: T.DoubleSide,
  });
}
export function waterRibbon(
  curve: T.Curve<T.Vector3>,
  length: number,
  color: number,
  segments: number,
) {
  const p: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const across = 10;
  for (let i = 0; i <= segments; i++) {
    const f = frameAt(curve, i / segments);
    for (let j = 0; j <= across; j++) {
      const x = ((j / across) * 2 - 1) * 1.16;
      const pos = f.position
        .clone()
        .addScaledVector(f.up, -1.71 + x * x * 0.045)
        .addScaledVector(f.right, x);
      p.push(pos.x, pos.y, pos.z);
      uv.push(i / segments, j / across);
      if (i < segments && j < across) {
        const a = i * (across + 1) + j,
          b = a + across + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  const mat = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLength: { value: length },
      uColor: { value: new T.Color(color) },
    },
    vertexShader: filmVertex,
    fragmentShader: filmFragment,
    side: T.DoubleSide,
  });
  return new T.Mesh(geo, mat);
}
export function makeFlumeMesh(route: Route) {
  const group = new T.Group();
  group.name = "starlit-flume";
  const segments = Math.ceil(route.length * 2.5);
  const material = tubeMaterial(route.color, route.length, route.seed);
  // Only the ridden flume gets a star canopy; basin mouths keep their collars.
  material.defines.STAR_ROOF = 1;
  const shell = new T.Mesh(
    tubeGeometry(route.curve, C.tubeRadius, segments),
    material,
  );
  shell.name = "star-canopy-with-light-arches";
  group.add(
    shell,
    waterRibbon(route.curve, route.length, route.color, segments),
  );
  return group;
}
export function disposeGroup(group: T.Object3D) {
  const geos = new Set<T.BufferGeometry>(),
    mats = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  group.traverse((obj) => {
    if (!(
      obj instanceof T.Mesh ||
      obj instanceof T.Points ||
      obj instanceof T.Sprite
    ))
      return;
    if ("geometry" in obj) geos.add(obj.geometry);
    if (obj instanceof T.InstancedMesh) obj.dispose();
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of list) {
      mats.add(mat);
      for (const value of Object.values(mat))
        if (value instanceof T.Texture) textures.add(value);
    }
  });
  for (const geo of geos) geo.dispose();
  for (const mat of mats) mat.dispose();
  for (const tex of textures) tex.dispose();
  group.removeFromParent();
}
export function tickMaterials(group: T.Object3D, time: number, skyTime = time) {
  group.traverse((obj) => {
    if (
      obj instanceof T.Mesh &&
      obj.material instanceof T.ShaderMaterial &&
      obj.material.uniforms.uTime
    ) {
      obj.material.uniforms.uTime.value = time;
      if (obj.material.uniforms.uSkyTime)
        obj.material.uniforms.uSkyTime.value = skyTime;
    }
  });
}

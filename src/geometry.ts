import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { C, frameAt, type Route } from "./model.ts";
import {
  LIGHT_LAYER,
  LIGHT_RADIUS,
  LIGHT_STYLES,
  lightSize,
  makeRideLights,
  type RideLight,
} from "./lights.ts";
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
export function makeLightsMesh(route: Route, lights: readonly RideLight[]) {
  const ember = new T.LatheGeometry(
    [
      new T.Vector2(0, -1),
      new T.Vector2(0.48, -0.78),
      new T.Vector2(0.64, -0.3),
      new T.Vector2(0.54, 0.12),
      new T.Vector2(0.3, 0.58),
      new T.Vector2(0, 1.15),
    ],
    12,
  );
  const frame = new T.TorusGeometry(0.88, 0.095, 6, 4);
  frame.rotateZ(Math.PI / 2);
  frame.scale(0.78, 1.18, 1);
  const jewel = new T.OctahedronGeometry(0.45);
  jewel.scale(0.8, 1.2, 0.65);
  const star = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? 0.46 : 1.1;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    if (i === 0) star.moveTo(x, y);
    else star.lineTo(x, y);
  }
  star.closePath();
  const starMesh = new T.ExtrudeGeometry(star, {
    depth: 0.14,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.055,
    bevelThickness: 0.04,
  });
  starMesh.translate(0, 0, -0.07);
  const parts = [
    [2, ember],
    [5, frame],
    [5, jewel],
    [10, starMesh],
  ] as const;
  const shapes = parts.map(([tier, source]) => {
    const shape = source.index ? source.toNonIndexed() : source;
    shape.setAttribute(
      "aShape",
      new T.Float32BufferAttribute(
        new Array(shape.getAttribute("position").count).fill(tier),
        1,
      ),
    );
    return shape;
  });
  // Each instance selects one silhouette; unused triangles collapse to keep one draw call.
  const geometry = mergeGeometries(shapes)!;
  for (const shape of new Set([
    ...shapes,
    ...parts.map(([, source]) => source),
  ]))
    shape.dispose();
  geometry.setAttribute(
    "aTier",
    new T.InstancedBufferAttribute(
      new Float32Array(lights.map((light) => light.tier)),
      1,
    ),
  );
  const material = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEmber: { value: new T.Color(LIGHT_STYLES[2].color) },
      uLantern: { value: new T.Color(LIGHT_STYLES[5].color) },
      uStar: { value: new T.Color(LIGHT_STYLES[10].color) },
    },
    vertexShader: `attribute float aTier; attribute float aShape;
      varying float vTier; varying vec3 vNormal; varying vec3 vView;
      void main(){vTier=aTier;
      vec3 p=abs(aTier-aShape)<.1?position:vec3(0.);
      vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.);
      vNormal=normalMatrix*mat3(instanceMatrix)*normal;vView=-view.xyz;
      gl_Position=projectionMatrix*view;}`,
    fragmentShader: `uniform float uTime; uniform vec3 uEmber; uniform vec3 uLantern; uniform vec3 uStar;
      varying float vTier; varying vec3 vNormal; varying vec3 vView;
      void main(){float pulse=.94+.06*sin(uTime*2.4+vTier);
      vec3 color=vTier<3.?uEmber:vTier<6.?uLantern:uStar;
      vec3 n=normalize(vNormal);
      float rim=pow(1.-abs(dot(n,normalize(vView))),2.);
      float facet=.85+.35*abs(dot(n,normalize(vec3(1.,2.,3.))));
      gl_FragColor=vec4(color*(facet+rim*1.8)*pulse,1.);}`,
  });
  const mesh = new T.InstancedMesh(geometry, material, lights.length);
  mesh.name = "catch-lights";
  mesh.layers.set(LIGHT_LAYER);
  const pose = new T.Object3D();
  lights.forEach((light, index) => {
    const f = frameAt(route.curve, light.distance / route.length);
    pose.position
      .copy(f.position)
      .addScaledVector(f.up, -LIGHT_RADIUS * Math.cos(light.angle))
      .addScaledVector(f.right, LIGHT_RADIUS * Math.sin(light.angle));
    pose.quaternion.setFromRotationMatrix(
      new T.Matrix4().makeBasis(f.right, f.up, f.tangent.clone().negate()),
    );
    pose.scale.setScalar(lightSize(light.tier) * 1.4);
    pose.updateMatrix();
    mesh.setMatrixAt(index, pose.matrix);
  });
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.computeBoundingSphere();
  return mesh;
}

export function hideCaughtLight(flume: T.Group, index: number) {
  const mesh = flume.getObjectByName("catch-lights") as T.InstancedMesh;
  mesh.setMatrixAt(index, new T.Matrix4().makeScale(0, 0, 0));
  mesh.instanceMatrix.needsUpdate = true;
}

export function makeFlumeMesh(route: Route, lights = makeRideLights(route)) {
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
    makeLightsMesh(route, lights),
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
export function tickMaterials(group: T.Object3D, time: number) {
  group.traverse((obj) => {
    if (
      obj instanceof T.Mesh &&
      obj.material instanceof T.ShaderMaterial &&
      obj.material.uniforms.uTime
    ) {
      obj.material.uniforms.uTime.value = time;
      if (obj.material.uniforms.uSkyTime)
        obj.material.uniforms.uSkyTime.value = time;
    }
  });
}

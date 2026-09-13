import * as T from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { C, EXITS, portal, random, type BasinSpec } from "./model.ts";
import {
  disposeGroup,
  tubeGeometry,
  tubeMaterial,
  waterRibbon,
  tickMaterials,
} from "./geometry.ts";
import {
  worldVertex,
  wallFragment,
  waterVertex,
  waterFragment,
  filmVertex,
  noiseGLSL,
} from "./shaders.ts";
import { MATH_FONT } from "./questions/kit.ts";
import { drawLine, widthOf, wrapLines } from "./mathtext.ts";

export type Labels = { board: string; exits: readonly string[] } | null;

type Sign = {
  mesh: T.Mesh;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: T.CanvasTexture;
};

function ring(
  radius: number,
  thickness: number,
  material: T.Material,
  at: T.Vector3,
  normal = new T.Vector3(0, 1, 0),
) {
  const mesh = new T.Mesh(
    new T.TorusGeometry(radius, thickness, 10, 128),
    material,
  );
  mesh.position.copy(at);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), normal);
  return mesh;
}
function sign(width: number, resolution = 1): Sign {
  const canvas = document.createElement("canvas");
  canvas.width = 1024 * resolution;
  canvas.height = 256 * resolution;
  const ctx = canvas.getContext("2d")!;
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const mat = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    toneMapped: false,
    opacity: 0.8,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(width, width / 4), mat);
  return { mesh, canvas, ctx, texture };
}
function paint(
  target: Sign,
  color: string,
  draw: (ctx: CanvasRenderingContext2D, k: number) => void,
) {
  const { ctx, canvas } = target;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  draw(ctx, canvas.width / 1024);
  ctx.restore();
  target.texture.needsUpdate = true;
}
function titled(target: Sign, text: string, sub: string, color: string) {
  paint(target, color, (ctx, k) => {
    ctx.font = `500 ${76 * k}px Arial`;
    ctx.fillText(text, 512 * k, 95 * k);
    ctx.globalAlpha = 0.65;
    ctx.font = `${28 * k}px Arial`;
    ctx.letterSpacing = `${7 * k}px`;
    ctx.fillText(sub, 512 * k, 178 * k);
  });
}
function answered(target: Sign, text: string, sub: string, color: string) {
  paint(target, color, (ctx, k) => {
    let size = 128;
    while (size > 40 && widthOf(ctx, text, size * k, MATH_FONT) > 940 * k)
      size -= 4;
    drawLine(ctx, text, 512 * k, 100 * k, size * k, MATH_FONT);
    ctx.globalAlpha = 0.65;
    ctx.font = `${26 * k}px Arial`;
    ctx.letterSpacing = `${7 * k}px`;
    ctx.fillText(sub, 512 * k, 212 * k);
  });
}
function asked(target: Sign, text: string, color: string) {
  paint(target, color, (ctx, k) => {
    for (let size = 128; ; size -= 2) {
      const px = size * k;
      const lines = wrapLines(ctx, text, 960 * k, px, MATH_FONT);
      const lead = px * 1.22;
      const fits =
        lines.length * lead <= 228 * k &&
        lines.every((line) => widthOf(ctx, line, px, MATH_FONT) <= 960 * k);
      if (fits || size <= 22) {
        lines.forEach((line, i) =>
          drawLine(
            ctx,
            line,
            512 * k,
            128 * k + (i - (lines.length - 1) / 2) * lead,
            px,
            MATH_FONT,
          ),
        );
        return;
      }
    }
  });
}

function network() {
  const group = new T.Group();
  group.name = "surrounding-tube-network";
  const rng = random(84305);
  const metal = new T.MeshStandardMaterial({
    color: 0x17272f,
    roughness: 0.42,
    metalness: 0.7,
  });
  const pale = new T.MeshStandardMaterial({
    color: 0x688080,
    roughness: 0.42,
    metalness: 0.45,
  });
  for (let i = 0; i < 9; i++) {
    const rad = 30 + i * 4.7;
    const height = 15 + (i % 4) * 6.5;
    const a0 = -0.7 + i * 0.83;
    const points: T.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const a = a0 + (k / 24) * (3.4 + rng() * 0.025);
      const r = rad + Math.sin((k / 24) * Math.PI * 2) * 3;
      points.push(
        new T.Vector3(
          Math.sin(a) * r,
          height + Math.sin((k / 24) * Math.PI) * (8 + (i % 3)) - k * 0.12,
          -Math.cos(a) * r,
        ),
      );
    }
    const curve = new T.CatmullRomCurve3(points);
    const len = curve.getLength();
    const tube = new T.Mesh(
      tubeGeometry(curve, 1.6 + (i % 2) * 0.35, 160, 20),
      tubeMaterial(EXITS[i % 3].color, len, i, true),
    );
    group.add(tube);
    for (let k = 2; k < 24; k += 5) {
      const pos = points[k];
      const h = pos.y + 16;
      const column = new T.Mesh(
        new T.CylinderGeometry(0.22, 0.35, h, 8),
        metal,
      );
      column.position.set(pos.x, pos.y - h / 2 - 1.5, pos.z);
      group.add(column);
      const brace = new T.Mesh(new T.BoxGeometry(4.5, 0.24, 0.3), pale);
      brace.position.set(pos.x, pos.y - 1.8, pos.z);
      group.add(brace);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2,
      r = 78 + rng() * 20,
      h = 14 + rng() * 25;
    const tower = new T.Mesh(
      new T.CylinderGeometry(5.5, 5.5, h, 24, 1, true),
      metal,
    );
    tower.position.set(Math.sin(a) * r, h * 0.5 - 10, -Math.cos(a) * r);
    group.add(tower);
    group.add(
      ring(
        5.7,
        0.08,
        new T.MeshBasicMaterial({ color: 0x395858 }),
        new T.Vector3(tower.position.x, h - 10, tower.position.z),
      ),
    );
  }
  for (let i = 0; i < 3; i++) {
    const points: T.Vector3[] = [];
    for (let k = 0; k <= 32; k++) {
      const t = k / 32,
        a = t * Math.PI * 1.6 + i * 2.1;
      const p = new T.Vector3(
        Math.sin(a) * (47 - t * 15),
        34 + Math.sin(t * Math.PI) * 13 - t * 17,
        -Math.cos(a) * (47 - t * 15),
      );
      points.push(p);
    }
    const curve = new T.CatmullRomCurve3(points);
    group.add(
      new T.Mesh(
        tubeGeometry(curve, 1.85, 190, 20),
        tubeMaterial(EXITS[(i + 1) % 3].color, curve.getLength(), i + 19, true),
      ),
    );
  }
  return group;
}

function inletCascade() {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 40; i++)
    for (let j = 0; j <= 10; j++) {
      const t = i / 40,
        x = ((j / 10) * 2 - 1) * (1.15 + t * 0.2);
      positions.push(
        x,
        C.inletY - 1.71 - (C.inletY - 1.73) * t * t,
        15 - 5.3 * t,
      );
      uvs.push(t, j / 10);
      if (i < 40 && j < 10) {
        const a = i * 11 + j,
          b = a + 11;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const mat = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: filmVertex,
    fragmentShader: `
    uniform float uTime;varying vec2 vUv;varying vec3 vWorld;
    ${noiseGLSL}
    void main(){
      float streak=pow(noise(vec2(vUv.x*4.-uTime*4.,vUv.y*55.)),2.);
      float thin=noise(vec2(vUv.x*17.-uTime*8.,vUv.y*170.));
      float edge=1.-smoothstep(.86,1.,abs(vUv.y*2.-1.));
      float alpha=(.13+streak*.52+thin*.1)*edge;
      gl_FragColor=vec4(mix(vec3(.045,.22,.23),vec3(.42,.74,.68),streak+thin*.18),alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    side: T.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new T.Mesh(geo, mat);
  mesh.name = "continuous-inlet-cascade";
  return mesh;
}

export class Basin {
  group = new T.Group();
  scenery: T.Group;
  water: Reflector;
  wall: T.Mesh;
  spec: BasinSpec;
  stubs: T.Group[] = [];
  private exitSigns: Sign[] = [];
  private board: Sign;
  private splashAt = new T.Vector3(0, 0, -100);
  constructor(spec: BasinSpec, reflectionSize: number, labels: Labels = null) {
    this.spec = spec;
    this.group.name = "basin-ritual";
    this.group.userData.kind = "basin";
    this.group.position.copy(spec.center);
    this.group.rotation.y = -spec.yaw;
    const localSpec = { center: new T.Vector3(), yaw: 0, number: spec.number };
    const portals = [0, 1, 2, 3].map((i) => portal(localSpec, i));
    const positions = portals.map((e) => e.position),
      normals = portals.map((e) => e.outward),
      colors = portals.map((e) => new T.Color(e.color));
    const wallGeo = new T.CylinderGeometry(
      C.radius,
      C.radius,
      C.wallTop - C.floor,
      256,
      1,
      true,
    );
    wallGeo.translate(0, (C.wallTop + C.floor) / 2, 0);
    this.wall = new T.Mesh(
      wallGeo,
      new T.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uHoles: { value: positions },
          uNormals: { value: normals },
          uColors: { value: colors },
        },
        vertexShader: worldVertex,
        fragmentShader: wallFragment,
        side: T.DoubleSide,
      }),
    );
    this.wall.name = "full-height-circular-wall";
    this.group.add(this.wall);
    const concrete = new T.MeshStandardMaterial({
      color: 0x566469,
      roughness: 0.8,
      metalness: 0.12,
    });
    const hardware = new T.MeshStandardMaterial({
      color: 0x627779,
      roughness: 0.27,
      metalness: 0.8,
    });
    const black = new T.MeshStandardMaterial({
      color: 0x101c24,
      roughness: 0.48,
      metalness: 0.45,
    });
    this.group.add(ring(15.05, 0.3, concrete, new T.Vector3(0, 8.4, 0)));
    this.group.add(
      ring(
        14.93,
        0.045,
        new T.MeshBasicMaterial({ color: 0x80b6be }),
        new T.Vector3(0, 8.07, 0),
      ),
    );
    this.group.add(ring(15.13, 0.07, hardware, new T.Vector3(0, 9.13, 0)));
    this.group.add(ring(15.13, 0.045, black, new T.Vector3(0, 8.8, 0)));
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const post = new T.Mesh(
        new T.CylinderGeometry(0.035, 0.035, 0.8, 5),
        hardware,
      );
      post.position.set(Math.sin(a) * 15.13, 8.76, -Math.cos(a) * 15.13);
      this.group.add(post);
      if (i % 4 === 0 && i !== 0 && i !== 24) {
        const rib = new T.Mesh(new T.BoxGeometry(0.12, 2.3, 0.09), black);
        rib.position.set(Math.sin(a) * 14.94, 7.16, -Math.cos(a) * 14.94);
        rib.rotation.y = -a;
        this.group.add(rib);
      }
    }
    const floor = new T.Mesh(
      new T.CircleGeometry(15, 128),
      new T.MeshStandardMaterial({ color: 0x194b52, roughness: 0.3 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = C.floor;
    this.group.add(floor);
    for (let i = 0; i < 4; i++) {
      const e = portals[i],
        inward = e.outward.clone().negate();
      this.group.add(
        ring(
          2.26,
          0.22,
          black,
          e.position.clone().addScaledVector(inward, 0.02),
          e.outward,
        ),
      );
      this.group.add(
        ring(
          2.25,
          0.065,
          hardware,
          e.position.clone().addScaledVector(inward, 0.24),
          e.outward,
        ),
      );
      this.group.add(
        ring(
          2.13,
          0.055,
          new T.MeshBasicMaterial({
            color: new T.Color(e.color).multiplyScalar(i === 3 ? 1.5 : 3.2),
          }),
          e.position.clone().addScaledVector(inward, 0.25),
          e.outward,
        ),
      );
      const label = sign(i < 3 ? 4.2 : 3.6);
      if (i < 3) this.exitSigns.push(label);
      else
        titled(
          label,
          "INLET",
          "UPHILL · NO RETURN",
          "#" + e.color.toString(16).padStart(6, "0"),
        );
      label.mesh.position.copy(e.position).addScaledVector(inward, 0.34);
      label.mesh.position.y += i < 3 ? 3.25 : 2.9;
      label.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), inward);
      this.group.add(label.mesh);
      if (i < 3) {
        const points = [
          e.position.clone().addScaledVector(inward, 0.18),
          e.position
            .clone()
            .addScaledVector(e.outward, 6)
            .add(new T.Vector3(0, -0.5, 0)),
          e.position
            .clone()
            .addScaledVector(e.outward, 14)
            .add(new T.Vector3(0, -2, 0)),
        ];
        const curve = new T.CatmullRomCurve3(points),
          len = curve.getLength();
        const stub = new T.Group();
        stub.add(
          new T.Mesh(
            tubeGeometry(curve, C.tubeRadius, 42),
            tubeMaterial(e.color, len),
          ),
          waterRibbon(curve, len, e.color, 42),
        );
        this.stubs.push(stub);
        this.group.add(stub);
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const side = new T.Vector3().crossVectors(
          e.outward,
          new T.Vector3(0, 1, 0),
        );
        const bolt = new T.Mesh(new T.SphereGeometry(0.055, 6, 4), hardware);
        bolt.position
          .copy(e.position)
          .addScaledVector(inward, 0.26)
          .addScaledVector(side, Math.cos(a) * 2.29)
          .add(new T.Vector3(0, Math.sin(a) * 2.29, 0));
        this.group.add(bolt);
      }
    }
    this.board = sign(5.5, 2);
    this.board.mesh.position.set(0, 6.7, -14.3);
    this.group.add(this.board.mesh);
    this.setLabels(labels);
    const geometry = new T.PlaneGeometry(30.12, 30.12, 100, 100);
    this.water = new Reflector(geometry, {
      textureWidth: reflectionSize,
      textureHeight: reflectionSize,
      clipBias: 0.003,
      multisample: 0,
      shader: {
        name: "NightwaterSurface",
        uniforms: {
          tDiffuse: { value: null },
          color: { value: new T.Color() },
          textureMatrix: { value: new T.Matrix4() },
          uTime: { value: 0 },
          uUnder: { value: 0 },
          uWake: { value: new T.Vector2() },
          uSpeed: { value: 0 },
          uSplash: { value: this.splashAt },
          uLights: { value: positions.map((e) => e.clone()) },
          uColors: { value: colors },
        },
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
      },
    });
    this.water.rotation.x = -Math.PI / 2;
    this.water.name = "rippled-reflection-water";
    (this.water.material as T.ShaderMaterial).side = T.DoubleSide;
    this.group.add(this.water);
    this.group.add(inletCascade());
    this.scenery = network();
    this.group.add(this.scenery);
  }
  setLabels(labels: Labels) {
    this.exitSigns.forEach((target, i) => {
      const color = "#" + EXITS[i].color.toString(16).padStart(6, "0");
      if (labels)
        answered(
          target,
          `0${i + 1}  ${labels.exits[i]}`,
          "FOLLOW THE CURRENT",
          color,
        );
      else
        titled(
          target,
          `0${i + 1}  ${EXITS[i].name.toUpperCase()}`,
          "FOLLOW THE CURRENT",
          color,
        );
    });
    if (labels) asked(this.board, labels.board, "#d3e4df");
    else titled(this.board, "NIGHTWATER", "AFTER HOURS, FOREVER", "#b9d1cc");
  }
  update(time: number, body: T.Vector3, speed: number, under: boolean) {
    tickMaterials(this.group, time);
    this.group.updateMatrixWorld(true);
    const local = this.group.worldToLocal(body.clone());
    const mat = this.water.material as T.ShaderMaterial;
    mat.uniforms.uWake.value.set(local.x, -local.z);
    mat.uniforms.uSpeed.value = speed;
    mat.uniforms.uUnder.value = under ? 1 : 0;
    mat.uniforms.uSplash.value.copy(this.splashAt);
    for (let i = 0; i < 4; i++)
      mat.uniforms.uLights.value[i].copy(portal(this.spec, i).position);
  }
  splash(body: T.Vector3, time: number) {
    const p = this.group.worldToLocal(body.clone());
    this.splashAt.set(p.x, -p.z, time);
  }
  rebase(offset: T.Vector3) {
    this.group.position.sub(offset);
  }
  dispose() {
    this.water.getRenderTarget().dispose();
    disposeGroup(this.group);
  }
}

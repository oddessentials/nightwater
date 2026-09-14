import * as T from "three";
import { C, portal, random, type BasinSpec } from "./model.ts";

type Particle = {
  position: T.Vector3;
  velocity: T.Vector3;
  life: number;
  max: number;
  size: number;
};
export class Spray {
  points: T.Points;
  private particles: Particle[] = [];
  private positions: Float32Array;
  private alpha: Float32Array;
  private sizes: Float32Array;
  private cursor = 0;
  private emission = 0;
  private rng = random(42);
  constructor() {
    const count = 320;
    this.positions = new Float32Array(count * 3);
    this.alpha = new Float32Array(count);
    this.sizes = new Float32Array(count);
    for (let i = 0; i < count; i++)
      this.particles.push({
        position: new T.Vector3(),
        velocity: new T.Vector3(),
        life: 0,
        max: 1,
        size: 1,
      });
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(this.positions, 3));
    geo.setAttribute("aAlpha", new T.BufferAttribute(this.alpha, 1));
    geo.setAttribute("aSize", new T.BufferAttribute(this.sizes, 1));
    const mat = new T.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader:
        "attribute float aAlpha;attribute float aSize;varying float vAlpha;uniform float uScale;void main(){vAlpha=aAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*uScale/max(1.,-p.z),1.,40.);}",
      fragmentShader:
        "varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.2,1.,d))*vAlpha;gl_FragColor=vec4(.55,.83,.83,a);}",
      transparent: true,
      depthWrite: false,
      blending: T.NormalBlending,
    });
    this.points = new T.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.name = "inlet-and-landing-spray";
  }
  private emit(
    position: T.Vector3,
    velocity: T.Vector3,
    life: number,
    size: number,
  ) {
    const p = this.particles[this.cursor++ % this.particles.length];
    p.position.copy(position);
    p.velocity.copy(velocity);
    p.life = life;
    p.max = life;
    p.size = size;
  }
  burst(position: T.Vector3) {
    for (let i = 0; i < 180; i++) {
      const a = this.rng() * Math.PI * 2,
        v = 1 + this.rng() * 5;
      this.emit(
        position
          .clone()
          .add(
            new T.Vector3((this.rng() - 0.5) * 2, 0, (this.rng() - 0.5) * 2),
          ),
        new T.Vector3(Math.cos(a) * v, 2 + this.rng() * 7, Math.sin(a) * v),
        0.5 + this.rng() * 1.2,
        0.03 + this.rng() * 0.14,
      );
    }
  }
  glimmer(position: T.Vector3) {
    for (let i = 0; i < 14; i++)
      this.emit(
        position,
        new T.Vector3(
          (this.rng() - 0.5) * 2,
          this.rng() * 2,
          (this.rng() - 0.5) * 2,
        ),
        0.2 + this.rng() * 0.25,
        0.025 + this.rng() * 0.035,
      );
  }
  update(dt: number, spec: BasinSpec, active: boolean) {
    if (active) {
      this.emission += dt * 90;
      const inlet = portal(spec, 3);
      while (this.emission >= 1) {
        this.emission--;
        const p = inlet.position.clone();
        p.y -= 1.55;
        p.x += (this.rng() - 0.5) * 1.4;
        p.z += (this.rng() - 0.5) * 0.2;
        const v = inlet.outward.clone().multiplyScalar(-5 - this.rng() * 2);
        v.y = -0.4 - this.rng();
        this.emit(p, v, 1.1 + this.rng() * 0.4, 0.025 + this.rng() * 0.07);
      }
    }
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life = Math.max(0, p.life - dt);
      if (p.life > 0) {
        p.velocity.y -= 9.8 * dt;
        p.position.addScaledVector(p.velocity, dt);
        if (p.position.y < spec.center.y + C.water - 0.12) p.life = 0;
      }
      p.position.toArray(this.positions, i * 3);
      this.alpha[i] = Math.min(1, p.life / 0.15) * 0.5;
      this.sizes[i] = p.size;
    }
    for (const key of ["position", "aAlpha", "aSize"])
      this.points.geometry.getAttribute(key).needsUpdate = true;
  }
  rebase(offset: T.Vector3) {
    for (const p of this.particles) p.position.sub(offset);
  }
  dispose() {
    this.points.geometry.dispose();
    (this.points.material as T.Material).dispose();
  }
}

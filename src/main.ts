import "./style.css";
import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { Basin, type Labels } from "./basin.ts";
import { RideState, C, clamp, damp, idleControls, portal } from "./model.ts";
import { RIDE_SPEEDS, type RideSpeed } from "./rides.ts";
import {
  makeFlumeMesh,
  hideCaughtLight,
  disposeGroup,
  tickMaterials,
} from "./geometry.ts";
import { LIGHT_LAYER, leanLimit } from "./lights.ts";
import { skyFragment, lensShader } from "./shaders.ts";
import { Input } from "./input.ts";
import { WaterAudio } from "./audio.ts";
import { Spray } from "./effects.ts";
import { GLYPHS, MATH_FONT } from "./questions/kit.ts";
import type { Question } from "./questions/index.ts";
import { Journey, newJourney, runOptions } from "./journey.ts";
import { loadJourney, saveJourney } from "./save.ts";
import * as panel from "./panel.ts";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>("#scene");
const params = new URLSearchParams(location.search);
const qa = params.get("qa") === "1";
const options = runOptions(location.search, import.meta.env.DEV);
const labelsFor = (question: Question | null): Labels =>
  question ? { board: question.prompt, exits: question.choices } : null;
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

async function launch() {
  await Promise.race([
    document.fonts.load(`48px ${MATH_FONT}`, GLYPHS).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  const saved = options.sandbox ? null : loadJourney();
  let journey = new Journey(
    saved ??
      newJourney(freshSeed(), options.start?.stage, options.start?.level),
    options.pin,
  );
  let shown = journey.question;
  let feedback = "";
  let winOpen = false;
  const persist = () => {
    if (!options.sandbox)
      saveJourney({ ...journey.state, landings: state.landings });
  };
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x030812);
  renderer.info.autoReset = false;
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x091925, 0.003);
  const camera = new T.PerspectiveCamera(78, 1, 0.045, 1800);
  camera.rotation.order = "YXZ";
  camera.layers.enable(LIGHT_LAYER);
  const tubeView = new T.Matrix4();
  const viewOrigin = new T.Vector3();
  const sky = new T.Mesh(
    new T.SphereGeometry(1200, 40, 24),
    new T.ShaderMaterial({
      uniforms: { uSkyTime: { value: 0 } },
      vertexShader:
        "varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: skyFragment,
      side: T.BackSide,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  // Shade only sky pixels left uncovered by opaque scenery and the canopy.
  sky.renderOrder = 10;
  scene.add(sky);
  scene.add(new T.HemisphereLight(0xb1d4ff, 0x123d3a, 1.25));
  const moon = new T.DirectionalLight(0xa5c9dd, 2.1);
  moon.position.set(-40, 70, -65);
  scene.add(moon);
  const riderLight = new T.PointLight(0x8ec9dd, 12, 20, 1.5);
  scene.add(riderLight);
  const state = new RideState(
    Number(params.get("seed")) || 41721,
    saved?.landings ?? 0,
  );
  let quality = matchMedia("(pointer:coarse)").matches ? "balanced" : "high";
  let basin = new Basin(
    state.basin,
    quality === "high" ? 1024 : 512,
    labelsFor(shown),
  );
  scene.add(basin.group);
  basin.water.getReflectionCamera(camera).layers.disable(LIGHT_LAYER);
  panel.showQuestion(shown);
  let previousBasin: Basin | null = null;
  let flume = makeFlumeMesh(state.route, state.lights);
  scene.add(flume);
  let previousFlume: T.Group | null = null;
  const spray = new Spray();
  scene.add(spray.points);
  const audio = new WaterAudio(
    params.get("music") ?? import.meta.env.VITE_MUSIC_URL,
  );
  let paused = false,
    last = performance.now(),
    accumulator = 0,
    glanceX = 0,
    glanceY = 0,
    catchTime = -100,
    announcedMultiplier: number = journey.state.multiplier,
    splashTime = -100;
  let lastPhase = "",
    lastScore = "",
    lastBasin = 0,
    lastSelected: number | null = null,
    disposed = false,
    manualFrames = false,
    frameCount = 0,
    fps = 60,
    fpsTime = performance.now();
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.36, 0.55, 1.05);
  composer.addPass(bloom);
  const lens = new ShaderPass(lensShader);
  composer.addPass(lens);
  composer.addPass(new OutputPass());
  const antialias = new ShaderPass(FXAAShader);
  composer.addPass(antialias);

  function setPaused(value: boolean) {
    if (disposed || state.phase === "ready") return;
    paused = value;
    input.clear();
    audio.pause(value);
    panel.showQuestionId(shown?.id ?? null);
    $("#pause-menu").hidden = !value;
    if (value && document.pointerLockElement) document.exitPointerLock();
    last = performance.now();
    accumulator = 0;
  }
  function mute() {
    const muted = audio.mute();
    $("#sound").textContent = muted ? "SOUND OFF" : "SOUND ON";
    $("#sound").setAttribute(
      "aria-label",
      muted ? "Unmute sound" : "Mute sound",
    );
  }
  const input = new Input(canvas, (key) => {
    if (key === "KeyM") mute();
    if (winOpen) return;
    if (key === "Escape") setPaused(!paused);
    if (!paused && /^Digit[123]$/.test(key))
      state.choose(Number(key.slice(-1)) - 1);
  });
  let wasLocked = false;
  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    if (wasLocked && !locked && !paused && !winOpen) setPaused(true);
    wasLocked = locked;
  });
  function begin() {
    persist();
    state.start();
    void audio.start().catch(() => {});
    $("#welcome").hidden = true;
    $("#hud").hidden = false;
    $("#crosshair").hidden = false;
    syncHud();
  }
  function startOver() {
    journey = new Journey(newJourney(freshSeed()));
    shown = journey.question;
    feedback = "";
    catchTime = -100;
    announcedMultiplier = 1;
    basin.setLabels(labelsFor(shown));
    panel.showQuestion(shown);
    persist();
    lastPhase = "";
  }
  function openWin() {
    winOpen = true;
    input.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    panel.showWin(journey.state);
    lastPhase = "";
  }
  function closeWin() {
    winOpen = false;
    panel.hideWin();
    last = performance.now();
    accumulator = 0;
    lastPhase = "";
    syncHud();
  }
  $("#start").addEventListener("click", begin);
  $("#restart").addEventListener("click", () => {
    if (panel.armRestart()) return;
    startOver();
    begin();
  });
  $("#free-ride").addEventListener("click", () => {
    journey.rideFree();
    persist();
    closeWin();
  });
  $("#win-restart").addEventListener("click", () => {
    startOver();
    closeWin();
  });
  $("#pause").addEventListener("click", () => setPaused(true));
  $("#resume").addEventListener("click", () => setPaused(false));
  $("#sound").addEventListener("click", mute);
  document
    .querySelectorAll<HTMLButtonElement>("[data-exit]")
    .forEach((button) => {
      const choose = () => {
        if (!paused && !winOpen) state.choose(Number(button.dataset.exit));
      };
      button.addEventListener("click", choose);
      button.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") {
          event.preventDefault();
          choose();
        }
      });
    });
  $("#ride-speed").addEventListener("change", () => {
    const speed = $<HTMLSelectElement>("#ride-speed").value;
    if (Object.hasOwn(RIDE_SPEEDS, speed)) state.rideSpeed = speed as RideSpeed;
  });
  $<HTMLSelectElement>("#quality").value = quality;
  $("#quality").addEventListener("change", () => {
    quality = $<HTMLSelectElement>("#quality").value;
    resize();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPaused(true);
  });
  window.addEventListener("blur", () => {
    if (!qa) setPaused(true);
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    setPaused(true);
    $("#error").hidden = false;
    $("#error-detail").textContent =
      "The graphics device was interrupted. Reload to reopen the park.";
  });
  const touch = matchMedia("(pointer:coarse)").matches;
  if (touch)
    $(".control-hint").textContent =
      "The current carries you · left thumb to paddle · drag to look · tap a light to follow it";
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, quality === "high" ? 1.6 : 1);
    renderer.setPixelRatio(ratio);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(ratio);
    composer.setSize(innerWidth, innerHeight);
    antialias.uniforms.resolution.value.set(
      1 / (innerWidth * ratio),
      1 / (innerHeight * ratio),
    );
    const size = quality === "high" ? 1024 : 512;
    basin.water.getRenderTarget().setSize(size, size);
    previousBasin?.water.getRenderTarget().setSize(size, size);
    (spray.points.material as T.ShaderMaterial).uniforms.uScale.value =
      innerHeight * ratio * 0.65;
    panel.fitPanel();
    panel.clearTouchPad();
  }
  window.addEventListener("resize", resize);
  resize();
  function handleEvents() {
    for (const event of state.events.splice(0)) {
      if (event.kind === "route") {
        previousBasin?.dispose();
        if (previousFlume) disposeGroup(previousFlume);
        previousBasin = basin;
        previousFlume = flume;
        previousBasin.stubs[event.exit].visible = false;
        const result = shown ? journey.answer(event.exit) : null;
        feedback = result ? panel.feedbackText(result) : "";
        shown = journey.question;
        basin = new Basin(
          event.route.destination,
          quality === "high" ? 1024 : 512,
          labelsFor(shown),
        );
        scene.add(basin.group);
        basin.water.getReflectionCamera(camera).layers.disable(LIGHT_LAYER);
        panel.showQuestion(shown);
        flume = makeFlumeMesh(event.route, state.lights);
        scene.add(flume);
        catchTime = -100;
        announcedMultiplier = 1;
        if (result) persist();
      } else if (event.kind === "catch") {
        hideCaughtLight(flume, event.index);
        spray.glimmer(event.position);
        audio.catchLight(event.tier, event.total);
        const best = Math.max(
          journey.active ? journey.state.multiplier : 1,
          state.multiplier,
        );
        const upgrade = best > announcedMultiplier;
        if (upgrade || state.elapsed - catchTime > 1) {
          panel.showCatch(event.tier, best, upgrade);
          catchTime = state.elapsed;
        }
        announcedMultiplier = best;
      } else if (event.kind === "splash") {
        splashTime = state.elapsed;
        spray.burst(state.body);
        basin.splash(state.body, state.elapsed);
        audio.splash();
      } else if (event.kind === "land") {
        previousBasin?.dispose();
        previousBasin = null;
        if (previousFlume) {
          disposeGroup(previousFlume);
          previousFlume = null;
        }
        basin.rebase(event.offset);
        flume.position.sub(event.offset);
        spray.rebase(event.offset);
        feedback = "";
        journey.arm(state.multiplier);
        persist();
        if (journey.state.won && !journey.state.freeRide) openWin();
      }
    }
  }
  function syncHud() {
    const inTube = state.phase === "tube";
    const descending =
      inTube || state.phase === "air" || state.phase === "splash";
    const multiplier = descending
      ? Math.max(
          journey.active ? journey.state.multiplier : 1,
          state.multiplier,
        )
      : journey.state.multiplier;
    const scoreKey = `${journey.state.score}:${multiplier}:${journey.state.multiplier}:${journey.state.level}:${journey.active}`;
    if (lastScore !== scoreKey) {
      lastScore = scoreKey;
      panel.showPoints(journey.state, multiplier, journey.active);
    }
    $("#ride-bonus").hidden = !descending || winOpen;
    $("#catch-toast").hidden = !inTube || state.elapsed - catchTime > 1.8;
    if (
      lastPhase === state.phase &&
      lastSelected === state.selected &&
      lastBasin === state.basin.number
    )
      return;
    lastPhase = state.phase;
    lastBasin = state.basin.number;
    lastSelected = state.selected;
    const choosing =
      state.phase === "basin" && state.selected === null && !winOpen;
    $("#choices").hidden = !choosing;
    $("#touch-pad").hidden =
      !touch || (!inTube && state.phase !== "basin") || winOpen;
    $("#touch-pad").setAttribute(
      "aria-label",
      inTube ? "Drag left or right to lean" : "Drag to paddle",
    );
    $("#ride-hint").hidden = !inTube || winOpen;
    $("#ride-hint").textContent =
      `${touch ? "Left thumb" : "A / D or ← / →"} to lean · catch the lights${journey.active ? " for your next answer" : ""}`;
    panel.fitPanel();
    panel.clearTouchPad();
    panel.showLocation(
      journey.active
        ? panel.levelLabel(journey.state.stage, journey.state.level)
        : `${state.phase === "basin" || state.phase === "splash" ? "BASIN" : "DESCENT"} ${String(Math.max(1, state.basin.number)).padStart(2, "0")}`,
    );
    panel.showCaption(
      state.phase === "tube"
        ? feedback || (state.landings === 0 ? "Let the current take you." : "")
        : state.phase === "splash"
          ? "Under the same stars."
          : state.selected !== null
            ? "Following the light · paddle to take over"
            : "",
    );
    document.body.dataset.phase = state.phase;
  }
  function simulationStep(dt: number, controls = idleControls()) {
    if (state.phase === "tube" || state.phase === "ready") {
      glanceX = clamp(glanceX - controls.lookX, -0.6, 0.6);
      glanceY = clamp(glanceY - controls.lookY, -0.4, 0.4);
      glanceX = damp(glanceX, 0, 0.9, dt);
      glanceY = damp(glanceY, 0, 1, dt);
    } else {
      glanceX = damp(glanceX, 0, 5, dt);
      glanceY = damp(glanceY, 0, 5, dt);
    }
    state.step(dt, controls);
    handleEvents();
    const nearBasin = state.phase !== "tube" && state.phase !== "ready";
    spray.update(dt, state.basin, nearBasin);
  }
  function render() {
    const inTube = state.phase === "tube" || state.phase === "ready";
    camera.position.copy(state.body);
    if (state.phase === "basin")
      camera.position.y +=
        Math.sin(state.elapsed * (1.45 + state.speed * 0.12)) *
        (0.018 + state.speed * 0.002);
    if (inTube) {
      tubeView.lookAt(viewOrigin, state.velocity, state.tubeUp);
      camera.quaternion.setFromRotationMatrix(tubeView);
      camera.rotateY(glanceX);
      camera.rotateX(glanceY);
      camera.rotateZ(state.roll);
    } else {
      camera.rotation.set(
        state.pitch + glanceY,
        state.yaw + glanceX,
        state.roll,
        "YXZ",
      );
    }
    const fovTarget = inTube ? Math.min(90, 78 + state.speed * 0.25) : 76;
    camera.fov = damp(camera.fov, fovTarget, 3, 1 / 60);
    camera.updateProjectionMatrix();
    const under = camera.position.y < state.basin.center.y - 0.02;
    sky.position.copy(camera.position);
    (sky.material as T.ShaderMaterial).uniforms.uSkyTime.value = state.elapsed;
    riderLight.position.copy(camera.position);
    riderLight.intensity = inTube ? 4 : 6;
    const remaining = state.route.length - state.distance;
    basin.group.visible = !inTube || remaining < 65;
    basin.scenery.visible = !inTube || remaining < 30;
    if (previousBasin) {
      previousBasin.group.visible = state.distance < 9;
      previousBasin.water.visible = false;
      previousBasin.scenery.visible = false;
    }
    if (previousFlume) previousFlume.visible = false;
    basin.update(state.elapsed, state.body, state.speed, under);
    tickMaterials(flume, state.elapsed);
    if (previousBasin) tickMaterials(previousBasin.group, state.elapsed);
    lens.uniforms.uTime.value = state.elapsed;
    lens.uniforms.uSplash.value = Math.max(
      0,
      1 - (state.elapsed - splashTime) / 5,
    );
    lens.uniforms.uUnder.value = under ? 1 : 0;
    lens.uniforms.uSpeed.value = inTube ? state.speed / 20 : 0;
    audio.update(state.speed, inTube, under, state.roll, state.elapsed);
    syncHud();
    renderer.info.reset();
    composer.render();
  }
  function animate(now: number) {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 0.12);
    last = now;
    if (!paused && !winOpen && !manualFrames) {
      const controls = input.consume();
      accumulator += dt;
      let first = true;
      while (accumulator >= 1 / 60) {
        simulationStep(
          1 / 60,
          first ? controls : { ...controls, lookX: 0, lookY: 0 },
        );
        accumulator -= 1 / 60;
        first = false;
      }
      if (first) {
        input.lookX += controls.lookX;
        input.lookY += controls.lookY;
      }
    }
    render();
    frameCount++;
    if (now - fpsTime > 1000) {
      fps = (frameCount * 1000) / (now - fpsTime);
      frameCount = 0;
      fpsTime = now;
    }
    requestAnimationFrame(animate);
  }
  render();
  panel.showTitle(!!saved);
  requestAnimationFrame(animate);
  if (qa) {
    Object.assign(window, {
      __nightwater: {
        glyphs: GLYPHS,
        question: () =>
          shown ? { ...shown, choices: [...shown.choices] } : null,
        journey: () => ({ ...journey.state }),
        winOpen: () => winOpen,
        snapshot: () => ({
          phase: state.phase,
          landings: state.landings,
          basin: state.basin.number,
          body: state.body.toArray(),
          yaw: state.yaw,
          pitch: state.pitch,
          speed: state.speed,
          lean: state.lean,
          leanLimit: leanLimit(
            state.speed,
            state.rideSpeed,
            state.distance,
            state.route.length,
          ),
          multiplier: state.multiplier,
          armedMultiplier: journey.state.multiplier,
          score: journey.state.score,
          caught: [...state.caught],
          rideSpeed: state.rideSpeed,
          style: state.route.curve.style,
          loop: state.route.curve.loop,
          cameraUp: new T.Vector3(0, 1, 0)
            .applyQuaternion(camera.quaternion)
            .toArray(),
          waterY: state.basin.center.y,
          wallTop: state.basin.center.y + C.wallTop,
          exits: [0, 1, 2].map((i) =>
            portal(state.basin, i).position.toArray(),
          ),
          inlet: portal(state.basin, 3).position.toArray(),
          distance: state.distance,
          length: state.route.length,
          selected: state.selected,
          paused,
          geometries: renderer.info.memory.geometries,
          textures: renderer.info.memory.textures,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          fps,
          basinCount: scene.children.filter((c) => c.userData.kind === "basin")
            .length,
        }),
        lights: () =>
          state.lights.map((light, index) => ({
            ...light,
            index,
            caught: state.caught.has(index),
          })),
        advance: (
          seconds: number,
          keys: string[] = [],
          stopAt: boolean | string = false,
        ) => {
          const target = stopAt === true ? "basin" : stopAt;
          manualFrames = true;
          input.keys = new Set(keys);
          for (let i = 0; i < Math.ceil(seconds * 60); i++) {
            simulationStep(1 / 60, input.consume());
            if (target && state.phase === target) break;
          }
          input.clear();
          render();
        },
        realtime: () => {
          manualFrames = false;
          last = performance.now();
        },
        choose: (i: number) => state.choose(i),
        look: (yaw: number, pitch: number) => {
          state.yaw = yaw;
          state.pitch = pitch;
          render();
        },
        controls: (keys: string[]) => {
          input.keys = new Set(keys);
        },
        sampleRoute: (u: number) => {
          manualFrames = true;
          state.distance = clamp(u, 0, 0.999) * state.route.length;
          if (state.phase === "tube" || state.phase === "ready") {
            state.start();
            simulationStep(1 / 60);
            render();
          }
        },
      },
    });
  }
  window.addEventListener("pagehide", () => {
    if (disposed) return;
    disposed = true;
    input.dispose();
    audio.dispose();
    spray.dispose();
    basin.dispose();
    previousBasin?.dispose();
    disposeGroup(flume);
    if (previousFlume) disposeGroup(previousFlume);
    disposeGroup(sky);
    composer.passes.forEach((p) => p.dispose());
    composer.dispose();
    renderer.dispose();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
}
launch().catch((error) => {
  console.error(error);
  $("#error").hidden = false;
  $("#error-detail").textContent =
    error instanceof Error ? error.message : String(error);
});

// Synthesises the game's own sound for the edit: the water rush shaped by ride
// speed and phase, catch chimes, the splash and the answer reward, mirroring
// src/audio.ts sample for sample at the trailer's frame times.
import { writeFile } from "node:fs/promises";
import { FPS } from "./edit.mjs";

const SR = 48000;
const MASTER = 0.55;
// Trailer balance over the in-game levels: the basin lapping sits under the
// music instead of under ducked music, so it gets the most lift.
const BOOST = {
  flow: 1.4,
  ambience: 3.5,
  chime: 2.2,
  splash: 1.5,
  reward: 2.2,
};
const NOTES = [523.25, 659.25, 783.99, 1046.5, 1318.5];

// Web Audio's lowpass with its default Q (1 dB).
function lowpass(frequency) {
  const w0 = (2 * Math.PI * Math.min(frequency, SR * 0.45)) / SR;
  const alpha = Math.sin(w0) / (2 * 10 ** (1 / 20));
  const c = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: (1 - c) / 2 / a0,
    b1: (1 - c) / a0,
    b2: (1 - c) / 2 / a0,
    a1: (-2 * c) / a0,
    a2: (1 - alpha) / a0,
  };
}

class Biquad {
  x1 = 0;
  x2 = 0;
  y1 = 0;
  y2 = 0;
  k = lowpass(700);
  set(frequency) {
    this.k = lowpass(frequency);
  }
  run(x) {
    const { b0, b1, b2, a1, a2 } = this.k;
    const y =
      b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

function noise(seed = 7) {
  let s = seed >>> 0;
  const rand = () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let brown = 0;
  return () => {
    const white = rand() * 2 - 1;
    brown = (brown + white * 0.025) / 1.025;
    return brown * 2.6 + white * 0.11;
  };
}

// Exponential approach like AudioParam.setTargetAtTime.
const approach = (value, target, tau, dt) =>
  value + (target - value) * (1 - Math.exp(-dt / tau));

function addTone(left, right, at, frequency, peak, attack, release, stop) {
  const start = Math.round(at * SR);
  const end = Math.min(left.length, start + Math.round(stop * SR));
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    const gain =
      t < attack
        ? (peak * t) / attack
        : peak *
          Math.exp(
            (Math.log(0.001 / peak) * (t - attack)) / (release - attack),
          );
    const v = Math.sin(2 * Math.PI * frequency * t) * gain * MASTER;
    left[i] += v;
    right[i] += v;
  }
}

function addSplash(left, right, at) {
  const start = Math.round(at * SR);
  const end = Math.min(left.length, start + Math.round(1.6 * SR));
  const filter = new Biquad();
  const source = noise(41);
  for (let i = start; i < end; i++) {
    const t = (i - start) / SR;
    const frequency = t < 1.1 ? 3400 * (220 / 3400) ** (t / 1.1) : 220;
    if (i % 32 === 0) filter.set(frequency);
    const gain =
      t < 0.035
        ? 0.01 + (1.09 * t) / 0.035
        : 1.1 * Math.exp((Math.log(0.001 / 1.1) * (t - 0.035)) / (1.5 - 0.035));
    const v = filter.run(source()) * gain * MASTER * BOOST.splash;
    left[i] += v;
    right[i] += v;
  }
}

export async function renderSfx(timeline, file) {
  const total = Math.round((timeline.length / FPS) * SR);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const source = noise(3);
  const filter = new Biquad();
  let gain = 0.02;
  let frequency = 700;
  let pan = 0;
  const dt = 1 / SR;
  for (let f = 0; f < timeline.length; f++) {
    const { record } = timeline[f];
    const inTube = record.phase === "tube" || record.phase === "ready";
    const phaseTime = record.phaseTime ?? 0;
    const under =
      record.phase === "splash" && phaseTime > 0.15 && phaseTime < 0.85;
    const time = f / FPS;
    const targetGain = inTube
      ? (0.19 + record.speed * 0.014) * BOOST.flow
      : (0.075 + Math.sin(time * 0.6) * 0.008) * BOOST.ambience;
    const targetFrequency = under
      ? 180
      : inTube
        ? 500 + record.speed * 78
        : 850;
    const targetPan = Math.max(-0.6, Math.min(0.6, record.roll * 2));
    const start = Math.round((f / FPS) * SR);
    const end = Math.min(total, Math.round(((f + 1) / FPS) * SR));
    for (let i = start; i < end; i++) {
      gain = approach(gain, targetGain, 0.25, dt);
      frequency = approach(frequency, targetFrequency, 0.18, dt);
      pan = approach(pan, targetPan, 0.15, dt);
      if (i % 64 === 0) filter.set(frequency);
      const v = filter.run(source()) * gain * MASTER;
      // StereoPannerNode equal-power law.
      const angle = ((pan + 1) * Math.PI) / 4;
      left[i] += v * Math.cos(angle);
      right[i] += v * Math.sin(angle);
    }
    for (const event of record.events) {
      if (event.kind === "catch")
        addTone(
          left,
          right,
          time,
          NOTES[Math.min(4, event.count - 1)],
          (event.tier === 10 ? 0.24 : 0.16) * BOOST.chime,
          0.015,
          0.42,
          0.45,
        );
      if (event.kind === "phase" && event.to === "splash")
        addSplash(left, right, time);
      if (event.kind === "score" && event.delta > 0)
        [659.25, 987.77].forEach((note, k) =>
          addTone(
            left,
            right,
            time + k * 0.1,
            note,
            0.09 * BOOST.reward,
            0.015,
            0.28,
            0.3,
          ),
        );
    }
  }
  await writeFile(file, wav(left, right));
  return file;
}

function wav(left, right) {
  const frames = left.length;
  const data = Buffer.alloc(44 + frames * 8);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + frames * 8, 4);
  data.write("WAVE", 8);
  data.write("fmt ", 12);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(3, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 8, 28);
  data.writeUInt16LE(8, 32);
  data.writeUInt16LE(32, 34);
  data.write("data", 36);
  data.writeUInt32LE(frames * 8, 40);
  for (let i = 0; i < frames; i++) {
    data.writeFloatLE(left[i], 44 + i * 8);
    data.writeFloatLE(right[i], 48 + i * 8);
  }
  return data;
}

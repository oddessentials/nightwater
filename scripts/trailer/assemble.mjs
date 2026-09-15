// Cuts the captured takes into the trailer, composites the typography, mixes
// the album track with the synthesised game sound, and encodes the master.
//   node scripts/trailer/assemble.mjs [--aspect landscape|portrait]
//        [--out artifacts/trailer] [--scale N] [--skip-overlay] [--crf 13]
import { spawn } from "node:child_process";
import { copyFile, link, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ASPECTS } from "./capture.mjs";
import { renderSfx } from "./audio.mjs";
import {
  FPS,
  MUSIC,
  TOTAL,
  cues,
  loadLogs,
  segments,
  timeline,
} from "./edit.mjs";
import { renderOverlays } from "./overlay.mjs";

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

function ffmpeg(args, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-y", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (!quiet) {
        const line = String(chunk).trim().split("\r").at(-1);
        if (line.startsWith("frame="))
          process.stdout.write(`\r  ${line.slice(0, 100)}`);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (!quiet) process.stdout.write("\n");
      if (code)
        reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
      else resolve(stderr);
    });
  });
}

export async function assemble({
  aspect,
  out,
  scale,
  skipOverlay,
  crf,
  music,
}) {
  const profile = ASPECTS[aspect];
  const logs = await loadLogs(out, aspect);
  const cuts = segments(logs);
  const frames = timeline(logs);
  console.log(`Edit (${aspect}):`);
  for (const cut of cuts)
    console.log(
      `  ${(cut.at / FPS).toFixed(2).padStart(6)}s  ${cut.take.padEnd(12)} frames ${cut.from}-${cut.from + cut.length - 1}`,
    );

  const overlayDir = path.join(out, "overlay", aspect);
  if (!skipOverlay)
    await renderOverlays({
      aspect,
      cues: cues(aspect),
      frames: TOTAL,
      out,
      scale,
    });

  const mixDir = path.join(out, "audio");
  await mkdir(mixDir, { recursive: true });
  const sfx = await renderSfx(frames, path.join(mixDir, `sfx-${aspect}.wav`));
  const duration = TOTAL / FPS;
  const mix = path.join(mixDir, `mix-${aspect}.wav`);
  const audioGraph = [
    `[0:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,afade=t=out:st=${MUSIC.fadeAt}:d=${MUSIC.fadeFor}[m]`,
    `[1:a]atrim=duration=${duration},asetpts=PTS-STARTPTS,afade=t=out:st=${duration - 1.6}:d=1.5[s]`,
    `[m][s]amix=inputs=2:normalize=0:duration=first[a]`,
  ].join(";");
  await ffmpeg(
    [
      "-ss",
      String(MUSIC.offset),
      "-i",
      music,
      "-i",
      sfx,
      "-filter_complex",
      audioGraph,
      "-map",
      "[a]",
      "-ar",
      "48000",
      "-c:a",
      "pcm_f32le",
      mix,
    ],
    { quiet: true },
  );
  const measured = await ffmpeg(
    [
      "-i",
      mix,
      "-af",
      "loudnorm=I=-14:TP=-1:LRA=11:print_format=json",
      "-f",
      "null",
      "-",
    ],
    { quiet: true },
  );
  const stats = JSON.parse(
    measured.slice(measured.lastIndexOf("{"), measured.lastIndexOf("}") + 1),
  );
  console.log(
    `  audio: ${stats.input_i} LUFS, ${stats.input_tp} dBTP, LRA ${stats.input_lra} → normalising to -14 LUFS / -1 dBTP`,
  );
  const loudnorm = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true:print_format=summary`;

  // One sequential frame list (hard links) keeps ffmpeg streaming instead of
  // buffering every take at once.
  const editDir = path.join(out, "edit", aspect);
  await rm(editDir, { recursive: true, force: true });
  await mkdir(editDir, { recursive: true });
  await Promise.all(
    frames.map(({ take, frame }, i) => {
      const source = path.join(
        out,
        "takes",
        aspect,
        take,
        `${String(frame).padStart(5, "0")}.png`,
      );
      const target = path.join(editDir, `${String(i).padStart(5, "0")}.png`);
      return link(source, target).catch(() => copyFile(source, target));
    }),
  );
  const inputs = [
    "-framerate",
    String(FPS),
    "-i",
    path.join(editDir, "%05d.png"),
    "-framerate",
    String(FPS),
    "-i",
    path.join(overlayDir, "%05d.png"),
    "-i",
    mix,
  ];
  const graph = [
    `[0:v][1:v]overlay=format=rgb:shortest=1[comp]`,
    `[comp]scale=out_color_matrix=bt709:out_range=tv:flags=lanczos,format=yuv420p[v]`,
    `[2:a]${loudnorm},aresample=48000[a]`,
  ];
  const width = Math.round(profile.width * (scale ?? profile.scale));
  const height = Math.round(profile.height * (scale ?? profile.scale));
  const file = path.join(
    out,
    `nightwater-trailer-${aspect}-${width}x${height}.mp4`,
  );
  console.log(`  encoding ${file}`);
  await ffmpeg([
    ...inputs,
    "-filter_complex",
    graph.join(";"),
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(crf),
    "-profile:v",
    "high",
    "-level",
    "5.2",
    "-x264-params",
    "keyint=120:min-keyint=60:colorprim=bt709:transfer=bt709:colormatrix=bt709",
    "-pix_fmt",
    "yuv420p",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_range",
    "tv",
    "-c:a",
    "aac",
    "-b:a",
    "320k",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    "-t",
    String(duration),
    file,
  ]);
  const check = await ffmpeg(
    ["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"],
    { quiet: true },
  );
  const summary = check.slice(check.lastIndexOf("Integrated loudness"));
  const loudness = summary.match(/I:\s+(-?[\d.]+ LUFS)/)?.[1];
  const peak = summary.match(/Peak:\s+(-?[\d.]+ dBFS)/)?.[1];
  console.log(`  delivered audio: ${loudness}, true peak ${peak}`);
  return file;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const out = option("out", "artifacts/trailer");
  const file = await assemble({
    aspect: option("aspect", "landscape"),
    out,
    scale: option("scale") ? Number(option("scale")) : undefined,
    skipOverlay: process.argv.includes("--skip-overlay"),
    crf: Number(option("crf", 13)),
    music: option("music", path.join(out, "music", MUSIC.file)),
  });
  console.log(path.resolve(file));
}

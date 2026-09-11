import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);
const ffmpeg = (input, ...args) =>
  run("ffmpeg", ["-hide_banner", "-nostats", "-xerror", "-y", "-i", input, ...args]);
const aac = [
  ..."-c:a aac -b:a 256k -aac_pns 0 -ar 48000 -ac 2 -map_metadata -1".split(" "),
  ..."-fflags +bitexact -flags:a +bitexact -movflags +faststart -f mp4".split(" "),
];
const target = -16;
const ceiling = -1;
const span = 240;
const out = "dist";
const slug = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function measure(file) {
  const [{ stderr }, { stdout }] = await Promise.all([
    ffmpeg(file, "-af", "loudnorm=print_format=json", "-f", "null", "-"),
    run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]),
  ]);
  const stats = JSON.parse(
    stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1),
  );
  return {
    loudness: Number(stats.input_i),
    peak: Number(stats.input_tp),
    duration: Number(stdout),
  };
}

const levels = (file, gain) =>
  new Promise((resolve, reject) => {
    const decoder = spawn("ffmpeg", [
      ..."-v error -i".split(" "),
      file,
      ..."-af".split(" "),
      `volume=${gain}dB`,
      ..."-ac 2 -ar 48000 -f f32le -".split(" "),
    ]);
    const found = [];
    let level = 0;
    let count = 0;
    let rest = Buffer.alloc(0);
    decoder.stdout.on("data", (chunk) => {
      const data = Buffer.concat([rest, chunk]);
      const end = data.length - (data.length % 4);
      for (let offset = 0; offset < end; offset += 4) {
        level = Math.max(level, Math.abs(data.readFloatLE(offset)));
        if (++count === span * 2) {
          found.push(level);
          level = 0;
          count = 0;
        }
      }
      rest = data.subarray(end);
    });
    decoder.on("error", reject);
    decoder.on("close", (code) =>
      code ? reject(new Error(`${file} exited ${code}`)) : resolve(found),
    );
  });

async function click(input, gain, output) {
  const [heard, made] = await Promise.all([levels(input, gain), levels(output, 0)]);
  for (let i = 1; i < Math.min(heard.length, made.length) - 1; i++) {
    const near = Math.max(heard[i - 1], heard[i], heard[i + 1], 0.03);
    if (made[i] > near * 10 ** (3 / 20)) return ((i * span) / 48000).toFixed(2);
  }
  return null;
}

async function encode({ title, source }) {
  const input = `/source/${source}`;
  const before = await measure(input);
  const gain = (target - before.loudness).toFixed(2);
  const fadeOut = (before.duration - 3).toFixed(3);
  const filters = `volume=${gain}dB,afade=t=in:d=0.02,afade=t=out:st=${fadeOut}:d=3`;
  const temp = `${out}/.${slug(title)}.m4a`;
  await ffmpeg(input, "-af", filters, ...aac, temp);
  const after = await measure(temp);
  assert.ok(Math.abs(after.loudness - target) <= 0.5, `${title} ${after.loudness} LUFS`);
  assert.ok(after.peak <= ceiling, `${title} ${after.peak} dBTP`);
  assert.ok(Math.abs(after.duration - before.duration) <= 0.1, `${title} ${after.duration}s`);
  const at = await click(input, gain, temp);
  assert.equal(at, null, `${title} click at ${at}s`);
  const hash = createHash("sha256")
    .update(await readFile(temp))
    .digest("hex")
    .slice(0, 8);
  const src = `${slug(title)}-${hash}.m4a`;
  await rename(temp, `${out}/${src}`);
  console.log(
    `${src}  ${gain} dB  ${after.loudness} LUFS  ${after.peak} dBTP  ${after.duration}s`,
  );
  return { title, src, duration: Number(after.duration.toFixed(2)) };
}

const album = JSON.parse(await readFile("album.json", "utf8"));
assert.equal(new Set(album.map((track) => slug(track.title))).size, album.length);
await mkdir(out, { recursive: true });
const tracks = await Promise.all(album.map(encode));
const keep = new Set(tracks.map((track) => track.src));
for (const file of await readdir(out))
  if (file.endsWith(".m4a") && !keep.has(file)) await rm(`${out}/${file}`);
await writeFile(`${out}/manifest.json`, `${JSON.stringify({ tracks }, null, 2)}\n`);

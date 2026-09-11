import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "node:http";

const base =
  process.argv[2] || process.env.NIGHTWATER_MUSIC_URL || "http://127.0.0.1:4180";
const origin = "http://127.0.0.1:4199";
const cors = (response) =>
  ["*", origin].includes(response.headers.get("access-control-allow-origin"));

const manifest = await fetch(`${base}/manifest.json`, { headers: { origin } });
assert.equal(manifest.status, 200);
assert.equal(manifest.headers.get("content-type"), "application/json");
assert.equal(manifest.headers.get("cache-control"), "no-cache");
assert.ok(cors(manifest));
const { tracks } = await manifest.json();
assert.ok(tracks.length > 0);

for (const track of tracks) {
  const response = await fetch(`${base}/${track.src}`, {
    headers: { origin, range: "bytes=0-63" },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const box = (offset) => bytes.toString("latin1", offset + 4, offset + 8);
  assert.equal(response.status, 206, track.src);
  assert.equal(response.headers.get("content-type"), "audio/mp4", track.src);
  assert.match(response.headers.get("content-range") ?? "", /^bytes 0-63\/\d+$/);
  assert.equal(
    response.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
    track.src,
  );
  assert.ok(cors(response), track.src);
  assert.equal(`${box(0)} ${box(bytes.readUInt32BE(0))}`, "ftyp moov", track.src);
}

const preflight = await fetch(`${base}/${tracks[0].src}`, {
  method: "OPTIONS",
  headers: {
    origin,
    "access-control-request-method": "GET",
    "access-control-request-headers": "range",
  },
});
assert.ok([200, 204].includes(preflight.status));
assert.ok(cors(preflight));
assert.match(preflight.headers.get("access-control-allow-headers") ?? "", /range/i);

const server = createServer((request, response) =>
  response
    .writeHead(200, { "content-type": "text/html" })
    .end("<!doctype html><title>Nightwater music</title>"),
).listen(4199, "127.0.0.1");
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const errors = [];
const failed = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    failed.push(`${request.url()} ${request.failure()?.errorText}`),
  );
  await page.goto(origin);
  const results = await page.evaluate(async (base) => {
    const { tracks } = await (await fetch(`${base}/manifest.json`)).json();
    const context = new AudioContext();
    await context.resume();
    const results = [];
    for (const track of tracks) {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.src = `${base}/${track.src}`;
      const analyser = context.createAnalyser();
      context
        .createMediaElementSource(audio)
        .connect(analyser)
        .connect(context.destination);
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = () => reject(new Error(track.src));
      });
      audio.currentTime = audio.duration / 2;
      await audio.play();
      await new Promise((resolve) => setTimeout(resolve, 700));
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      audio.currentTime = audio.duration - 1.5;
      const ended = await new Promise((resolve) => {
        audio.onended = () => resolve(true);
        setTimeout(() => resolve(false), 6000);
      });
      audio.pause();
      results.push({
        src: track.src,
        drift: Number((audio.duration - track.duration).toFixed(3)),
        level: Number(
          (Math.hypot(...samples) / Math.sqrt(samples.length)).toFixed(4),
        ),
        ended,
      });
    }
    await context.close();
    return results;
  }, base);
  console.table(results);
  for (const result of results) {
    assert.ok(Math.abs(result.drift) < 0.1, result.src);
    assert.ok(result.level > 0.005, result.src);
    assert.ok(result.ended, result.src);
  }
  assert.deepEqual(errors, []);
  if (failed.length) console.log(failed.join("\n"));
  console.log(`PASS: ${results.length} tracks from ${base}`);
} finally {
  await browser.close();
  server.close();
}

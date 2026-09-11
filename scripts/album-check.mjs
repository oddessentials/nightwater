import { chromium } from "playwright";
import assert from "node:assert/strict";

const base =
  process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
const music = process.env.NIGHTWATER_MUSIC_URL || "http://127.0.0.1:4180";
const { tracks } = await (await fetch(`${music}/manifest.json`)).json();
const url = (index) =>
  new URL(tracks[index % tracks.length].src, `${music}/`).href;

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-webgl"],
});
const errors = [];
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (
      request.resourceType() === "media" &&
      request.failure()?.errorText === "net::ERR_ABORTED"
    )
      return;
    errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  await page.addInitScript(() => {
    const create = AudioContext.prototype.createMediaElementSource;
    AudioContext.prototype.createMediaElementSource = function (element) {
      const source = create.call(this, element);
      const analyser = this.createAnalyser();
      source.connect(analyser);
      window.__album = { context: this, element, analyser };
      const connect = source.connect.bind(source);
      source.connect = (destination, ...args) => {
        if (destination instanceof GainNode) window.__album.music = destination;
        return connect(destination, ...args);
      };
      return source;
    };
  });
  const album = () =>
    page.evaluate(() => {
      const { context, element, analyser, music } = window.__album;
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return {
        src: element.src,
        time: element.currentTime,
        duration: element.duration,
        playing: !element.paused,
        crossOrigin: element.crossOrigin,
        context: context.state,
        level: Math.hypot(...samples) / Math.sqrt(samples.length),
        gain: music?.gain.value,
      };
    });
  const playing = (index, after = 0) =>
    page.waitForFunction(
      ([src, after]) => {
        const element = window.__album?.element;
        return (
          !!element &&
          !element.paused &&
          element.src === src &&
          element.currentTime > after
        );
      },
      [url(index), after],
      { timeout: 10000 },
    );
  const stopped = () =>
    page.waitForFunction(() => window.__album.element.paused, null, {
      timeout: 3000,
    });
  const context = (state) =>
    page.waitForFunction(
      (state) => window.__album.context.state === state,
      state,
    );
  const seek = (fromEnd) =>
    page.evaluate((fromEnd) => {
      const { element } = window.__album;
      element.currentTime = fromEnd
        ? element.duration - 1
        : element.duration / 2;
    }, fromEnd);

  const override = process.env.NIGHTWATER_MUSIC_URL
    ? `&music=${encodeURIComponent(music)}`
    : "";
  await page.goto(`${base}/?qa=1${override}`);
  await page.waitForFunction(() => !!window.__nightwater);
  await page.click("#start");
  await page.evaluate(() => window.__nightwater.advance(0));
  await playing(0, 0.2);
  const first = await album();
  assert.equal(first.crossOrigin, "anonymous");
  assert.equal(first.context, "running");
  await seek(false);
  await playing(0, tracks[0].duration / 2 + 0.5);
  let level = 0;
  for (let sample = 0; sample < 6; sample++) {
    level = Math.max(level, (await album()).level);
    await page.waitForTimeout(100);
  }
  assert.ok(level > 0.005, `level ${level}`);

  assert.equal((await album()).gain, 1);
  const beforePool = (await album()).time;
  await page.evaluate(() => window.__nightwater.advance(25));
  assert.equal(
    await page.evaluate(() => window.__nightwater.snapshot().phase),
    "basin",
  );
  await page.waitForFunction(
    () => window.__album.music.gain.value < 0.25,
    null,
    { timeout: 3000 },
  );
  const pool = await album();
  assert.ok(pool.gain >= 0.19);
  assert.ok(
    pool.playing && pool.time > beforePool,
    "music should keep advancing quietly in the pool",
  );
  await page.evaluate(() => {
    window.__nightwater.choose(1);
    window.__nightwater.advance(6);
  });
  assert.equal(
    await page.evaluate(() => window.__nightwater.snapshot().phase),
    "tube",
  );
  await page.waitForFunction(
    () => window.__album.music.gain.value > 0.95,
    null,
    { timeout: 2000 },
  );
  assert.equal(
    (await album()).src,
    pool.src,
    "entering a tube must not restart or replace the track",
  );
  console.log(
    "PASS: music fades to 20% in the pool and returns to tunnel level while playback continues.",
  );

  await page.click("#sound");
  assert.equal(await page.textContent("#sound"), "SOUND OFF");
  await stopped();
  const muted = (await album()).time;
  await page.waitForTimeout(500);
  assert.equal((await album()).time, muted);
  await page.click("#sound");
  await playing(0, muted);

  await page.click("#pause");
  await stopped();
  await context("suspended");
  await page.keyboard.press("m");
  await page.click("#resume");
  await context("running");
  await page.waitForTimeout(700);
  assert.equal((await album()).playing, false);
  const held = (await album()).time;
  await page.keyboard.press("m");
  await playing(0, held);

  for (let index = 0; index < tracks.length; index++) {
    await playing(index);
    const track = await album();
    assert.ok(
      Math.abs(track.duration - tracks[index].duration) < 0.1,
      tracks[index].src,
    );
    await seek(true);
    await playing(index + 1);
    console.log(
      `${index + 1}. ${tracks[index].title} -> ${tracks[(index + 1) % tracks.length].title}`,
    );
  }

  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  await context("closed");
  assert.deepEqual(
    await page.evaluate(() => ({
      paused: window.__album.element.paused,
      src: window.__album.element.getAttribute("src"),
    })),
    { paused: true, src: null },
  );
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${tracks.length} tracks in order then back to the first; mute and pause hold the position; teardown stops the stream.`,
  );
} finally {
  await browser.close();
}

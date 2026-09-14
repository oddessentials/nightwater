import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { launch } from "./support/browser.mjs";

const base =
  process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
await mkdir("artifacts", { recursive: true });
const browser = await launch();
const errors = [];
const results = [];
try {
  for (const [device, options] of [
    ["desktop", { viewport: { width: 1440, height: 900 } }],
    [
      "mobile",
      { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    ],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const speed of ["relaxed", "fast", "rush"]) {
      await page.goto(`${base}/?qa=1&seed=2310&music=`, {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(() => !!window.__nightwater);
      await page.click("#start");
      await page.evaluate(() => window.__nightwater.advance(0));
      await page.click("#pause");
      const paused = await page.evaluate(() => window.__nightwater.snapshot());
      await page.selectOption("#ride-speed", speed);
      assert.equal(await page.locator("#gentle").count(), 0);
      assert.deepEqual(
        (await page.evaluate(() => window.__nightwater.snapshot())).body,
        paused.body,
      );
      assert.equal(
        await page.evaluate(() => window.__nightwater.snapshot().rideSpeed),
        speed,
      );
      assert.ok(
        await page.evaluate(() => {
          const card = document
            .querySelector("#pause-menu .pause-card")
            .getBoundingClientRect();
          const controls = [...document.querySelectorAll("#pause-menu select")];
          return (
            card.top >= 0 &&
            card.bottom <= innerHeight &&
            controls.every((control) => {
              const rect = control.getBoundingClientRect();
              return rect.left >= card.left && rect.right <= card.right;
            }) &&
            document.documentElement.scrollWidth <= innerWidth
          );
        }),
      );
      if (speed === "fast")
        await page.screenshot({
          path: `artifacts/${device}-ride-settings.png`,
        });
      await page.click("#resume");
      const loop = await page.evaluate(
        () => window.__nightwater.snapshot().loop,
      );
      assert.ok(loop);
      const frames = [];
      for (const [name, u] of [
        ["approach", loop.start - 0.025],
        ["climb", loop.start + (loop.end - loop.start) * 0.25],
        ["inverted", (loop.start + loop.end) / 2],
        ["drop", loop.start + (loop.end - loop.start) * 0.75],
        ["departure", loop.end + 0.025],
      ]) {
        const frame = await page.evaluate((u) => {
          window.__nightwater.sampleRoute(u);
          const source = document.querySelector("#scene");
          const canvas = document.createElement("canvas");
          canvas.width = 96;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(source, 0, 0, 96, 64);
          const pixels = [...ctx.getImageData(0, 0, 96, 64).data];
          return { state: window.__nightwater.snapshot(), pixels };
        }, u);
        const bright = frame.pixels.filter(
          (v, i) => i % 4 !== 3 && v > 35,
        ).length;
        assert.ok(bright > 500, `${device}, ${speed}, ${name}: blank canvas`);
        assert.equal(frame.state.phase, "tube");
        assert.ok(frame.state.body.every(Number.isFinite));
        if (name === "inverted") assert.ok(frame.state.cameraUp[1] < -0.85);
        if (frames.length)
          assert.notDeepEqual(frame.pixels, frames.at(-1).pixels);
        frames.push(frame);
        if (speed === "fast")
          await page.screenshot({
            path: `artifacts/${device}-loop-${name}.png`,
          });
      }
      await page.evaluate(() => window.__nightwater.advance(25, [], true));
      assert.equal(
        await page.evaluate(() => window.__nightwater.snapshot().phase),
        "basin",
      );
      const before = await page.evaluate(() => window.__nightwater.journey());
      const question = await page.evaluate(() =>
        window.__nightwater.question(),
      );
      await page.click(`[data-exit="${question.correct}"]`);
      await page.evaluate(() => window.__nightwater.advance(20, [], "tube"));
      const after = await page.evaluate(() => window.__nightwater.journey());
      assert.equal(after.answered, before.answered + 1);
      assert.equal(after.correct, before.correct + 1);
      const start = await page.evaluate(() => window.__nightwater.snapshot());
      await page.evaluate(() => window.__nightwater.advance(0.25));
      const moved = await page.evaluate(() => window.__nightwater.snapshot());
      assert.ok(moved.distance > start.distance);
      assert.equal(moved.rideSpeed, speed);
      await page.evaluate(() => window.__nightwater.advance(25, [], true));
      assert.equal(
        await page.evaluate(() => window.__nightwater.snapshot().landings),
        2,
      );
      results.push({
        device,
        speed,
        frames: frames.map(({ state }) => state),
        passed: true,
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/ride-results.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(
    "PASS: all three speeds, loop frames and canvas pixels, pause, landing, and scoring on desktop and mobile.",
  );
} finally {
  await browser.close();
}

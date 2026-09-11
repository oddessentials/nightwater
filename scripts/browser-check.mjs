import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-webgl"],
});
const errors = [];
const attach = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => {
    if (r.resourceType() === "media" && r.failure()?.errorText === "net::ERR_ABORTED")
      return;
    errors.push(`${r.url()}: ${r.failure()?.errorText}`);
  });
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
attach(page);
const snapshot = () => page.evaluate(() => window.__nightwater.snapshot());
const advance = (t, keys = []) =>
  page.evaluate(([t, keys]) => window.__nightwater.advance(t, keys), [t, keys]);
const screenshots = [];
async function capture(name) {
  await page.screenshot({ path: `artifacts/${name}.png` });
  screenshots.push(name);
}
try {
  await page.goto(`${base}/?qa=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__nightwater);
  assert.equal((await snapshot()).phase, "ready");
  await capture("desktop-title");
  await page.click("#start");
  await page.waitForFunction(
    () => window.__nightwater.snapshot().phase === "basin",
    {},
    { timeout: 35000 },
  );
  assert.equal((await snapshot()).landings, 1);
  await capture("first-landing");
  await page.click("#pause");
  assert.equal((await snapshot()).paused, true);
  const beforePause = await snapshot();
  await page.waitForTimeout(300);
  assert.deepEqual((await snapshot()).body, beforePause.body);
  await page.selectOption("#quality", "balanced");
  await page.check("#gentle");
  await page.click("#resume");
  assert.equal((await snapshot()).paused, false);
  await page.click("#sound");
  assert.equal(await page.textContent("#sound"), "SOUND OFF");
  await page.keyboard.press("m");
  assert.equal(await page.textContent("#sound"), "SOUND ON");
  await page.click("#scene", { position: { x: 1000, y: 350 } });
  await page.waitForFunction(
    () => document.pointerLockElement === document.querySelector("#scene"),
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__nightwater.snapshot().paused);
  await page.click("#resume");
  const beforeDrag = await snapshot();
  await page.mouse.move(750, 380);
  await page.mouse.down();
  await page.mouse.move(900, 380, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert.ok((await snapshot()).yaw < beforeDrag.yaw - 0.1);
  await page.evaluate(() => window.__nightwater.look(0, 0.04));
  await advance(0.6, ["KeyA"]);
  const left = await snapshot();
  assert.ok(left.body[0] < beforeDrag.body[0] - 1);
  await advance(1.2, ["KeyD"]);
  assert.ok((await snapshot()).body[0] > left.body[0] + 1);
  await page.evaluate(() => window.__nightwater.look(Math.PI, 0.08));
  await advance(9, ["KeyW"]);
  const inlet = await snapshot();
  assert.equal(inlet.phase, "basin");
  assert.ok(inlet.body[2] < 14.46);
  assert.equal(inlet.body[1], 0.6);
  await capture("inlet-collision");
  const history = [];
  for (let cycle = 0; cycle < 12; cycle++) {
    const exit = cycle % 3;
    await page.keyboard.press(String(exit + 1));
    assert.equal((await snapshot()).selected, exit);
    let waited = 0;
    while (
      (await snapshot()).phase === "basin" &&
      (await snapshot()).selected !== null &&
      waited++ < 20
    )
      await advance(0.5);
    assert.ok(["entering", "tube"].includes((await snapshot()).phase));
    if ((await snapshot()).phase === "entering") await advance(0.7);
    assert.equal((await snapshot()).phase, "tube");
    if (cycle < 3) {
      await advance(3);
      await capture(`exit-${exit + 1}-tube`);
    }
    await advance(22);
    const landed = await snapshot();
    assert.equal(landed.phase, "basin");
    assert.equal(landed.landings, cycle + 2);
    assert.equal(landed.basinCount, 1);
    assert.equal(landed.exits.length, 3);
    assert.equal(landed.waterY, 0);
    assert.equal(landed.wallTop, 8.4);
    assert.ok(Math.abs(landed.body[1] - 0.6) < 0.001);
    if (cycle < 3) {
      await capture(`exit-${exit + 1}-landing`);
      await page.evaluate(() => {
        const q = window.__nightwater;
        q.look(q.snapshot().yaw + Math.PI, 0.2);
      });
      await capture(`exit-${exit + 1}-inlet`);
    }
    history.push(landed);
    console.log(
      `Cycle ${cycle + 2}: basin, ${landed.geometries} geometries, ${landed.textures} textures`,
    );
  }
  assert.ok(
    history.at(-1).geometries <= history[2].geometries + 3,
    "geometry memory grows across cycles",
  );
  assert.ok(
    history.at(-1).textures <= history[2].textures + 1,
    "texture memory grows across cycles",
  );
  await page.evaluate(() => window.__nightwater.realtime());
  await page.waitForTimeout(2500);
  const performance = await snapshot();
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await mobileContext.newPage();
  attach(mobile);
  await mobile.goto(`${base}/?qa=1`, { waitUntil: "networkidle" });
  await mobile.waitForFunction(() => !!window.__nightwater);
  await mobile.screenshot({ path: "artifacts/mobile-title.png" });
  await mobile.tap("#start");
  await mobile.evaluate(() => window.__nightwater.advance(24));
  assert.equal(
    await mobile.evaluate(() => window.__nightwater.snapshot().phase),
    "basin",
  );
  await mobile.screenshot({ path: "artifacts/mobile-basin.png" });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const pad = mobile.locator("#touch-pad");
  assert.equal(await pad.isVisible(), true);
  const box = await pad.boundingBox();
  const beforeTouch = await mobile.evaluate(() =>
    window.__nightwater.snapshot(),
  );
  await mobile.evaluate(
    ({ x, y }) => {
      const pad = document.querySelector("#touch-pad");
      pad.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 1,
          clientX: x,
          clientY: y,
        }),
      );
    },
    { x: box.x + 45, y: box.y + 10 },
  );
  const cdp = await mobileContext.newCDPSession(mobile);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + 45, y: box.y + 15 }],
  });
  await mobile.evaluate(() => window.__nightwater.realtime());
  await mobile.waitForTimeout(650);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const afterTouch = await mobile.evaluate(() =>
    window.__nightwater.snapshot(),
  );
  assert.ok(
    afterTouch.body[2] < beforeTouch.body[2] - 0.5,
    "touch stick should paddle forward",
  );
  const beforeLook = afterTouch.yaw;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 230, y: 350 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 330, y: 350 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await mobile.waitForTimeout(100);
  assert.ok(
    (await mobile.evaluate(() => window.__nightwater.snapshot())).yaw <
      beforeLook - 0.1,
  );
  await mobile.tap('[data-exit="2"]');
  await mobile.waitForFunction(
    () => window.__nightwater.snapshot().selected === 2,
  );
  await mobile.evaluate(() => window.__nightwater.advance(26));
  await mobile.screenshot({ path: "artifacts/mobile-choice-check.png" });
  assert.equal(
    await mobile.evaluate(() => window.__nightwater.snapshot().landings),
    2,
  );
  assert.equal(await mobile.textContent("#location"), "BASIN 02");
  await mobile.screenshot({ path: "artifacts/mobile-second-basin.png" });
  await mobileContext.close();
  assert.deepEqual(errors, []);
  const result = {
    base,
    passed: true,
    realTimeFirstLanding: true,
    cycles: history.length + 1,
    controls: [
      "WASD",
      "drag look",
      "1/2/3 choose",
      "pause/resume",
      "mute",
      "quality",
      "gentle camera",
      "touch paddle",
      "touch look",
      "touch choose",
    ],
    performance,
    history,
    screenshots,
    errors,
  };
  await writeFile(
    "artifacts/browser-results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: true,
      cycles: history.length + 1,
      fps: performance.fps,
      errors,
    }),
  );
} finally {
  await browser.close();
}

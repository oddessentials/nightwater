import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base =
  process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
const cycles = Math.max(3, Number(process.env.NIGHTWATER_RIDES) || 12);
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
    if (
      r.resourceType() === "media" &&
      r.failure()?.errorText === "net::ERR_ABORTED"
    )
      return;
    errors.push(`${r.url()}: ${r.failure()?.errorText}`);
  });
};
const pad = (n) => String(n).padStart(2, "0");
const levelLabel = (j) => `STAGE ${pad(j.stage)} · LEVEL ${pad(j.level)}`;
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
};
const context = await browser.newContext(desktop);
const page = await context.newPage();
attach(page);
const hook = (p) => ({
  snapshot: () => p.evaluate(() => window.__nightwater.snapshot()),
  advance: (t, keys = []) =>
    p.evaluate(([t, keys]) => window.__nightwater.advance(t, keys), [t, keys]),
  question: () => p.evaluate(() => window.__nightwater.question()),
  journey: () => p.evaluate(() => window.__nightwater.journey()),
});
const { snapshot, advance, question, journey } = hook(page);
const screenshots = [];
async function capture(name, p = page) {
  await p.screenshot({ path: `artifacts/${name}.png` });
  screenshots.push(name);
}
async function showsQuestion(p, q) {
  assert.equal(await p.isVisible("#choices"), true);
  assert.equal(await p.textContent("#prompt"), q.prompt);
  assert.deepEqual(
    await p.$$eval("[data-exit] .answer", (spans) =>
      spans.map((s) => s.textContent),
    ),
    q.choices,
  );
}
async function follow(p, exit) {
  const h = hook(p);
  await p.keyboard.press(String(exit + 1));
  let waited = 0;
  while (
    (await h.snapshot()).phase === "basin" &&
    (await h.snapshot()).selected !== null &&
    waited++ < 20
  )
    await h.advance(0.5);
  if ((await h.snapshot()).phase === "entering") await h.advance(0.7);
  assert.equal((await h.snapshot()).phase, "tube");
}
async function landFresh(p, url) {
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() => !!window.__nightwater);
  await p.click("#start");
  await hook(p).advance(24);
  assert.equal((await hook(p).snapshot()).phase, "basin");
}
const flows = [];
try {
  await page.goto(`${base}/?qa=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.__nightwater);
  assert.equal((await snapshot()).phase, "ready");
  assert.equal(await page.textContent("#start span"), "Enter the current");
  assert.equal(await page.isVisible("#restart"), false);
  await capture("desktop-title");
  await page.click("#start");
  await page.waitForFunction(
    () => window.__nightwater.snapshot().phase === "basin",
    {},
    { timeout: 35000 },
  );
  assert.equal((await snapshot()).landings, 1);
  const opening = await question();
  assert.equal(opening.stage, 1);
  assert.equal(opening.level, 1);
  await showsQuestion(page, opening);
  assert.equal(await page.textContent("#location"), "STAGE 01 · LEVEL 01");
  await capture("first-landing-panel-01-L1");
  await page.evaluate(() => window.__nightwater.look(0, 0.16));
  await capture("landing-board-and-signs");
  const glyphs = await page.evaluate(async () => {
    const text = window.__nightwater.glyphs;
    const sheet = document.createElement("div");
    sheet.id = "glyph-sheet";
    sheet.textContent = text;
    Object.assign(sheet.style, {
      position: "fixed",
      inset: "60px",
      zIndex: "99",
      background: "#040b10",
      color: "#eef3eb",
      font: '44px "Nightwater Math", serif',
      lineHeight: "1.7",
      wordBreak: "break-all",
      padding: "30px",
    });
    document.body.append(sheet);
    await document.fonts.ready;
    return document.fonts.check('44px "Nightwater Math"', text);
  });
  assert.equal(glyphs, true, "math font faces did not load");
  await capture("glyph-sheet");
  await page.evaluate(() => document.querySelector("#glyph-sheet").remove());
  await page.click("#pause");
  assert.equal((await snapshot()).paused, true);
  assert.equal(await page.textContent("#question-id"), `Question ${opening.id}`);
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
  for (let cycle = 0; cycle < cycles; cycle++) {
    const exit = cycle % 3;
    const before = await journey();
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
    assert.equal((await journey()).answered, before.answered + 1);
    if (cycle < 6) {
      await advance(3);
      await capture(`ride-${cycle + 2}-exit-${exit + 1}-tube`);
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
    const now = await journey();
    const q = await question();
    if (q) {
      assert.equal(await page.textContent("#location"), levelLabel(now));
      await showsQuestion(page, q);
    }
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

  const flowPage = await context.newPage();
  attach(flowPage);
  const f = hook(flowPage);
  await landFresh(flowPage, `${base}/?qa=1`);
  const q1 = await f.question();
  await follow(flowPage, q1.correct);
  assert.equal(await flowPage.textContent("#ride-caption"), "Correct — Level 2 next.");
  assert.equal((await f.journey()).level, 2);
  await capture("descent-correct-caption", flowPage);
  await f.advance(22);
  const q2 = await f.question();
  assert.equal(q2.level, 2);
  assert.equal(await flowPage.textContent("#location"), "STAGE 01 · LEVEL 02");
  await follow(flowPage, (q2.correct + 1) % 3);
  assert.equal(
    await flowPage.textContent("#ride-caption"),
    `Not this time — it was ${q2.choices[q2.correct]}.`,
  );
  await capture("descent-wrong-caption", flowPage);
  const afterMiss = await f.journey();
  assert.equal(afterMiss.level, 2);
  assert.equal(afterMiss.attempt, 1);
  await f.advance(22);
  const q3 = await f.question();
  assert.equal(q3.level, 2);
  assert.notEqual(q3.id, q2.id);
  flows.push("correct → next level", "wrong → same level, answer revealed");

  await landFresh(flowPage, `${base}/?qa=1&save=1`);
  const saved = await f.question();
  await follow(flowPage, saved.correct);
  const pending = (await f.question()).id;
  await flowPage.reload({ waitUntil: "networkidle" });
  await flowPage.waitForFunction(() => !!window.__nightwater);
  assert.equal(await flowPage.textContent("#start span"), "Continue");
  assert.equal(await flowPage.isVisible("#restart"), true);
  await capture("title-continue", flowPage);
  await flowPage.click("#start");
  await f.advance(24);
  assert.equal((await f.question()).id, pending);
  await flowPage.reload({ waitUntil: "networkidle" });
  await flowPage.waitForFunction(() => !!window.__nightwater);
  await flowPage.click("#restart");
  assert.equal(await flowPage.textContent("#restart"), "Tap again to start over");
  await flowPage.click("#restart");
  const restarted = await f.journey();
  assert.equal(restarted.level, 1);
  assert.equal(restarted.answered, 0);
  assert.equal((await f.snapshot()).phase, "tube");
  flows.push("reload → Continue", "Start over with inline confirm");

  await landFresh(flowPage, `${base}/?qa=1&stage=1&level=10`);
  const finale = await f.question();
  assert.equal(finale.level, 10);
  await follow(flowPage, finale.correct);
  assert.equal(
    await flowPage.textContent("#ride-caption"),
    "Correct — every level is cleared.",
  );
  await f.advance(22);
  assert.equal(await flowPage.evaluate(() => window.__nightwater.winOpen()), true);
  assert.equal(await flowPage.isVisible("#win"), true);
  assert.equal(await flowPage.isVisible("#choices"), false);
  await capture("win-card", flowPage);
  await flowPage.click("#free-ride");
  assert.equal(await flowPage.isVisible("#win"), false);
  assert.equal((await f.journey()).freeRide, true);
  assert.equal(await f.question(), null);
  assert.equal(await flowPage.textContent("#prompt"), "Three lights. Your next descent.");
  assert.equal(await flowPage.textContent("#location"), "BASIN 02");
  await capture("free-ride-panel", flowPage);
  await follow(flowPage, 1);
  await f.advance(22);
  assert.equal(await f.question(), null);
  assert.equal(await flowPage.textContent("#location"), "BASIN 03");
  flows.push("final level → win card → free ride");
  await flowPage.close();

  const mobileContext = await browser.newContext(phone);
  const mobile = await mobileContext.newPage();
  attach(mobile);
  const m = hook(mobile);
  await mobile.goto(`${base}/?qa=1`, { waitUntil: "networkidle" });
  await mobile.waitForFunction(() => !!window.__nightwater);
  await mobile.screenshot({ path: "artifacts/mobile-title.png" });
  await mobile.tap("#start");
  await m.advance(24);
  assert.equal((await m.snapshot()).phase, "basin");
  await showsQuestion(mobile, await m.question());
  await mobile.screenshot({ path: "artifacts/mobile-panel-01-L1.png" });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const pad0 = mobile.locator("#touch-pad");
  assert.equal(await pad0.isVisible(), true);
  const box = await pad0.boundingBox();
  const panelBox = await mobile.locator("#choices").boundingBox();
  assert.ok(box.y + box.height <= panelBox.y, "touch pad overlaps the pick panel");
  const beforeTouch = await m.snapshot();
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
  const afterTouch = await m.snapshot();
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
  assert.ok((await m.snapshot()).yaw < beforeLook - 0.1);
  for (const [i, exit] of [2, 0, 1].entries()) {
    const before = await m.journey();
    await mobile.tap(`[data-exit="${exit}"]`);
    await mobile.waitForFunction(
      (e) => window.__nightwater.snapshot().selected === e,
      exit,
    );
    await m.advance(26);
    if (i === 0) await mobile.screenshot({ path: "artifacts/mobile-choice-check.png" });
    assert.equal((await m.snapshot()).landings, i + 2);
    const after = await m.journey();
    assert.equal(after.answered, before.answered + 1);
    assert.equal(await mobile.textContent("#location"), levelLabel(after));
    await showsQuestion(mobile, await m.question());
  }
  await mobile.screenshot({ path: "artifacts/mobile-second-basin.png" });
  flows.push("tapping each answer on a phone");
  await mobileContext.close();
  assert.deepEqual(errors, []);
  const result = {
    base,
    passed: true,
    realTimeFirstLanding: true,
    cycles: history.length + 1,
    flows,
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
      flows: flows.length,
      fps: performance.fps,
      errors,
    }),
  );
} finally {
  await browser.close();
}

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { launch } from "./support/browser.mjs";

const base =
  process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
await mkdir("artifacts", { recursive: true });
const browser = await launch();
const errors = [];
try {
  for (const mobile of [false, true]) {
    const started = performance.now();
    const progress = (message) =>
      console.log(
        `  catches/${mobile ? "mobile" : "desktop"}: ${message} (${((performance.now() - started) / 1000).toFixed(1)}s)`,
      );
    progress("loading");
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const hintOpacity = () =>
      page
        .locator("#ride-hint")
        .evaluate((hint) => Number(getComputedStyle(hint).opacity));
    const startAfterTitleWait = async () => {
      // Advance the real ready-phase clock without adding a wall-clock wait to CI.
      await page.evaluate(() => window.__nightwater.advance(6.5));
      assert.equal(
        await page.evaluate(() => window.__nightwater.snapshot().phase),
        "ready",
      );
      await page.click("#start");
      assert.equal(await page.isVisible("#ride-hint"), true);
      assert.equal(
        await hintOpacity(),
        1,
        "title-screen time must not fade the lean hint",
      );
    };
    await page.goto(`${base}/?qa=1&save=1&seed=2310&music=`);
    await page.waitForFunction(() => !!window.__nightwater);
    await startAfterTitleWait();
    const star = await page.evaluate(() =>
      window.__nightwater.lights().find((light) => light.tier === 10),
    );
    assert.ok(star, "the seeded route has a star");
    progress("catching the star");
    if (mobile) {
      assert.equal(await page.isVisible("#touch-pad"), true);
      await page.evaluate((distance) => {
        const q = window.__nightwater;
        q.advance(30, [], () => q.snapshot().distance >= distance - 30);
      }, star.distance);
      const pad = await page.locator("#touch-pad").boundingBox();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          {
            x: pad.x + pad.width / 2 + Math.sign(star.angle) * 32,
            y: pad.y + pad.height / 2,
          },
        ],
      });
      await page.evaluate(() => window.__nightwater.realtime());
      await page.waitForFunction(
        (index) => window.__nightwater.snapshot().caught.includes(index),
        star.index,
        { timeout: 15000 },
      );
      await page.evaluate(() => window.__nightwater.advance(0));
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await page.evaluate(() => window.__nightwater.advance(0.5, ["KeyA"]));
      assert.ok(
        await page.evaluate(() => window.__nightwater.snapshot().lean < -0.2),
      );
      await page.evaluate(() =>
        window.__nightwater.advance(0.5, ["ArrowRight"]),
      );
      assert.ok(
        await page.evaluate(() => window.__nightwater.snapshot().lean > 0.2),
      );
      await page.evaluate((star) => {
        const q = window.__nightwater;
        q.advance(30, [], () => q.snapshot().distance > star.distance - 30);
        q.advance(30, [star.angle > 0 ? "KeyD" : "KeyA"], () =>
          q.snapshot().caught.includes(star.index),
        );
      }, star);
    }
    const caught = await page.evaluate(() => window.__nightwater.snapshot());
    assert.equal(caught.phase, "tube");
    assert.equal(caught.multiplier, 10);
    assert.equal(caught.score, 0);
    assert.ok(caught.caught.includes(star.index));
    assert.equal(await page.isVisible("#ride-bonus"), true);
    assert.equal(await page.textContent("#bonus-value"), "×10");
    assert.equal(
      await page.textContent("#bonus-stake"),
      "1,000 points + quick answer bonus",
    );
    assert.equal(
      await page
        .locator("[data-bonus-tier].active")
        .getAttribute("data-bonus-tier"),
      "10",
    );
    assert.equal(await page.textContent("#catch-toast strong"), "STAR POWER!");
    assert.equal(
      await page.textContent("#catch-toast span"),
      "×10 is active · MAX MULTIPLIER",
    );
    await page.screenshot({
      path: `artifacts/${mobile ? "mobile" : "desktop"}-star-catch.png`,
    });
    progress("pause, landing, and saved multiplier");
    await page.click("#pause");
    await page.evaluate(() => window.__nightwater.realtime());
    const paused = await page.evaluate(() => window.__nightwater.snapshot());
    await page.waitForTimeout(200);
    assert.deepEqual(
      (await page.evaluate(() => window.__nightwater.snapshot())).body,
      paused.body,
    );
    await page.evaluate(() => window.__nightwater.advance(0));
    await page.click("#resume");
    await page.evaluate(() => window.__nightwater.advance(30, [], "air"));
    assert.equal(await page.isVisible("#ride-bonus"), true);
    assert.equal(await page.textContent("#bonus-value"), "×10");
    await page.evaluate(() => window.__nightwater.advance(30, [], true));
    assert.equal(await page.isVisible("#ride-bonus"), false);
    assert.equal(await page.textContent("#answer-stake"), "1,000 PTS · ×10");
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("nightwater.journey")),
    );
    assert.equal(saved.multiplier, 10);
    assert.equal(saved.landings, 1);
    const question = await page.evaluate(() => window.__nightwater.question());
    await page.screenshot({
      path: `artifacts/${mobile ? "mobile" : "desktop"}-armed-stake.png`,
    });
    await page.reload();
    await page.waitForFunction(() => !!window.__nightwater);
    assert.equal(await page.textContent("#start span"), "Continue");
    await startAfterTitleWait();
    progress("continued catch and correct/wrong answers");
    await page.evaluate(() => {
      const q = window.__nightwater;
      q.advance(20, [], () => q.snapshot().caught.length > 0);
    });
    assert.equal(await page.textContent("#bonus-value"), "×10");
    assert.equal(
      await page.textContent("#catch-toast span"),
      "×10 stays active",
    );
    await page.evaluate(() => window.__nightwater.advance(30, [], true));
    assert.equal(
      (await page.evaluate(() => window.__nightwater.question())).id,
      question.id,
    );
    assert.equal(await page.textContent("#answer-stake"), "1,000 PTS · ×10");
    await page.click(`[data-exit="${question.correct}"]`);
    await page.evaluate(() => window.__nightwater.advance(20, [], "tube"));
    const scored = await page.evaluate(() => window.__nightwater.snapshot());
    assert.equal(scored.score, 1500);
    assert.equal(scored.multiplier, 1);
    assert.equal(scored.armedMultiplier, 1);
    assert.equal(
      await hintOpacity(),
      1,
      "entering another tube restarts the hint",
    );
    assert.equal(await page.textContent("#bonus-value"), "×1");
    assert.equal(
      await page.textContent("#bonus-stake"),
      "200 points + quick answer bonus",
    );
    assert.equal(
      (await page.textContent("#ride-caption")).replace(/\u00a0/g, " "),
      "Correct · +1,500 · Quick answer +500 · Level 2 next.",
    );
    await page.evaluate(() => window.__nightwater.advance(30, [], true));
    const next = await page.evaluate(() => window.__nightwater.question());
    const atRisk = await page.evaluate(() => window.__nightwater.journey());
    await page.click(`[data-exit="${(next.correct + 1) % 3}"]`);
    await page.evaluate(() => window.__nightwater.advance(20, [], "tube"));
    const missed = await page.evaluate(() => window.__nightwater.snapshot());
    assert.equal(missed.score, 1500 - Math.min(1500, 150 * atRisk.multiplier));
    assert.equal(missed.armedMultiplier, 1);
    assert.equal(missed.multiplier, 1);
    assert.equal(
      await page.isVisible("#ride-hint"),
      false,
      "three landings retire the hint",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    progress("pickup screenshots");
    await page.goto(`${base}/?qa=1&seed=2310&music=`);
    await page.waitForFunction(() => !!window.__nightwater);
    await page.click("#start");
    await page.evaluate(() => window.__nightwater.advance(0));
    for (const tier of [2, 5, 10]) {
      await page.evaluate((tier) => {
        const q = window.__nightwater;
        const light = q.lights().find((light) => light.tier === tier);
        q.sampleRoute((light.distance - 2.4) / q.snapshot().length);
      }, tier);
      await page.screenshot({
        path: `artifacts/${mobile ? "mobile" : "desktop"}-pickup-${tier}.png`,
      });
    }
    const bounds = await page.locator("#ride-bonus").boundingBox();
    const viewport = page.viewportSize();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
    assert.ok(bounds.y + bounds.height < viewport.height / 2);
    progress("hint timing");
    await page.goto(`${base}/?qa=1&seed=2310&music=`);
    await page.waitForFunction(() => !!window.__nightwater);
    await startAfterTitleWait();
    await page.evaluate(() => window.__nightwater.advance(4.9));
    assert.equal(
      await hintOpacity(),
      1,
      "the hint holds for the first five ride seconds",
    );
    await page.evaluate(() => window.__nightwater.advance(0.4));
    const fading = await hintOpacity();
    assert.ok(
      fading > 0 && fading < 1,
      "the hint fades after five ride seconds",
    );
    await page.evaluate(() => window.__nightwater.advance(0.4));
    assert.equal(
      await hintOpacity(),
      0,
      "the hint finishes fading after 5.6 ride seconds",
    );
    await context.close();
    progress("complete");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: delayed Start/Continue hints and fading, keyboard and touch star catches, live HUD, pause, armed saves, reload, and correct/wrong scores.",
  );
} finally {
  await browser.close();
}

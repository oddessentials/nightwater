import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { launch } from "./support/browser.mjs";

const base =
  process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
await mkdir("artifacts", { recursive: true });
const browser = await launch();
const errors = [];
const closeTo = (actual, expected, tolerance = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );

try {
  for (const mobile of [false, true]) {
    const started = performance.now();
    const progress = (message) =>
      console.log(
        `  scoring/${mobile ? "mobile" : "desktop"}: ${message} (${((performance.now() - started) / 1000).toFixed(1)}s)`,
      );
    progress("presentation and quick bonus");
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const snapshot = () => page.evaluate(() => window.__nightwater.snapshot());
    const journey = () => page.evaluate(() => window.__nightwater.journey());
    const question = () => page.evaluate(() => window.__nightwater.question());
    const advance = (seconds, keys = [], stopAt = false) =>
      page.evaluate(
        ([seconds, keys, stopAt]) =>
          window.__nightwater.advance(seconds, keys, stopAt),
        [seconds, keys, stopAt],
      );
    const select = async (exit) => {
      if (mobile) await page.tap(`[data-exit="${exit}"]`);
      else await page.keyboard.press(String(exit + 1));
    };
    const start = async (query = "question=01-01-00000001") => {
      await page.goto(`${base}/?qa=1&seed=2310&music=&${query}`);
      await page.waitForFunction(() => !!window.__nightwater);
      await advance(0);
      await page.click("#start");
    };
    const land = () => advance(30, [], true);
    const capture = (name) =>
      page.screenshot({
        path: `artifacts/scoring-${mobile ? "mobile" : "desktop"}-${name}.png`,
      });

    // Loading, the descent, and approach signs cannot spend or preview the bonus.
    await start();
    await advance(5);
    assert.equal((await snapshot()).answerMs, 0);
    assert.equal((await snapshot()).questionPresented, false);
    assert.equal(await page.isVisible("#choices"), false);
    await page.evaluate(() => window.__nightwater.sampleRoute(0.96));
    await capture("approach");
    await land();
    assert.equal((await snapshot()).answerMs, 0);
    const initial = await journey();
    assert.equal(
      await page.textContent("#quick-points"),
      `+${50 * initial.multiplier}`,
    );
    const initialPanel = await page.locator("#choices").boundingBox();
    await advance(5);
    const stake = 100 * initial.multiplier;
    assert.equal(
      await page.textContent("#quick-points"),
      `+${Math.round((stake * 5) / 13)}`,
    );
    assert.deepEqual(
      await page.locator("#choices").boundingBox(),
      initialPanel,
    );
    await capture("bonus");

    // A pause freezes both actual elapsed time and the meter, and hides the question.
    progress("pause and changed/cancelled choices");
    await page.click("#pause");
    const frozen = (await snapshot()).answerMs;
    assert.equal(await page.isVisible("#choices"), false);
    await capture("pause");
    await page.evaluate(() => window.__nightwater.realtime());
    await page.waitForTimeout(200);
    await page.keyboard.press("1");
    assert.equal((await snapshot()).answerMs, frozen);
    assert.equal((await snapshot()).selected, null);
    await advance(10);
    assert.equal((await snapshot()).answerMs, frozen);
    await page.click("#resume");
    await advance(0); // Present the resumed panel before measuring the next decision.

    // Switching and cancelling all use the original running clock.
    const q = await question();
    const other = (q.correct + 1) % 3;
    await select(other);
    closeTo((await snapshot()).responseMs, 5000);
    await advance(0.5);
    await page.keyboard.press(String(q.correct + 1));
    closeTo((await snapshot()).responseMs, 5500);
    await advance(0.5, ["KeyS"]);
    assert.equal((await snapshot()).selected, null);
    assert.equal((await snapshot()).responseMs, null);
    await advance(2.5);
    closeTo((await snapshot()).answerMs, 8500);
    await select(q.correct);
    const decision = (await snapshot()).responseMs;
    await advance(0.2);
    // A delayed compatibility click from the same touch must not replace its time.
    await page.locator(`[data-exit="${q.correct}"]`).dispatchEvent("click");
    assert.equal((await snapshot()).responseMs, decision);
    assert.equal((await journey()).answered, initial.answered);
    await advance(20, [], "entering");
    const entry = await snapshot();
    assert.equal((await journey()).score, initial.score);
    await advance(0.3);
    assert.equal((await snapshot()).answerMs, entry.answerMs);
    await advance(1);
    assert.equal((await journey()).score, stake * 1.25);
    assert.equal((await journey()).answered, initial.answered + 1);
    assert.match(await page.textContent("#ride-caption"), /Quick answer/);
    await capture("reward");

    // All ride speeds produce the same bonus for the same decision time.
    progress("ride speeds");
    const rewards = [];
    for (const speed of ["relaxed", "fast", "rush"]) {
      await start();
      await page.click("#pause");
      await page.selectOption("#ride-speed", speed);
      await page.click("#resume");
      await land();
      const before = await journey();
      await advance(5);
      await select((await question()).correct);
      await advance(20, [], "tube");
      const earned = (await journey()).score;
      const basePoints = 100 * before.multiplier;
      assert.equal(earned, basePoints + Math.round((basePoints * 5) / 13));
      rewards.push(earned);
    }
    assert.equal(new Set(rewards).size, 1);

    // Exhausting any curriculum window keeps the original correct-answer reward.
    progress("curriculum windows");
    for (const [stage, seconds] of [
      [1, 15],
      [6, 25],
      [13, 35],
    ]) {
      await start(`stage=${stage}&level=1`);
      await land();
      const before = await journey();
      await page.evaluate(() => window.__nightwater.look(0, 0));
      await advance(seconds + 1, ["KeyS"]);
      assert.equal((await snapshot()).phase, "basin");
      assert.equal(await page.textContent("#quick-points"), "+0");
      assert.equal((await journey()).score, before.score);
      await select((await question()).correct);
      await advance(20, [], "tube");
      assert.equal((await journey()).score, 100 * before.multiplier);
      assert.doesNotMatch(
        await page.textContent("#ride-caption"),
        /Quick answer/,
      );
    }

    // Swimming commits at the mouth, while untouched drift arrives after expiry.
    progress("swimming and drift");
    for (const keys of [["KeyW"], []]) {
      await start();
      await land();
      const before = await journey();
      await page.evaluate(() => window.__nightwater.look(0, 0));
      await advance(50, keys, "entering");
      const entered = (await snapshot()).answerMs;
      assert.equal((await snapshot()).selected, null);
      assert.equal((await journey()).answered, 0);
      await advance(0.3);
      assert.equal((await snapshot()).answerMs, entered);
      await advance(1);
      assert.equal((await journey()).answered, 1);
      const earned = (await journey()).score;
      if (keys.length) assert.ok(earned > 100 * before.multiplier);
      else assert.equal(earned, 100 * before.multiplier);
    }

    // Reloading either an active question or a pause retains the spent time.
    progress("reload persistence");
    for (const pause of [false, true]) {
      // Leave any previous saved run before clearing this test's save.
      await start();
      await page.evaluate(() => localStorage.removeItem("nightwater.journey"));
      await start("save=1");
      await land();
      await advance(8.5);
      if (pause) await page.click("#pause");
      const before = await journey();
      const pending = await question();
      await page.reload();
      await page.waitForFunction(() => !!window.__nightwater);
      assert.equal((await question()).id, pending.id);
      closeTo((await snapshot()).answerMs, 8500, 1);
      assert.equal((await journey()).score, before.score);
      assert.equal((await journey()).multiplier, before.multiplier);
      await advance(0);
      await page.click("#start");
      await land();
      closeTo((await snapshot()).answerMs, 8500, 1);
      await select(pending.correct);
      const atChoice = await journey();
      await advance(20, [], "tube");
      assert.equal(
        (await journey()).score - before.score,
        125 * atChoice.multiplier,
      );
    }

    // Real clock time still advances during a slow frame, beyond the physics cap.
    progress("real elapsed time");
    await start();
    await land();
    await page.evaluate(() => window.__nightwater.realtime());
    const stalled = await page.evaluate(() => {
      const before = window.__nightwater.snapshot().answerMs;
      const until = performance.now() + 350;
      while (performance.now() < until) {
        /* Simulate a stalled frame. */
      }
      return window.__nightwater.snapshot().answerMs - before;
    });
    assert.ok(stalled >= 350);
    await context.close();
    progress("complete");
  }
  // Short screens retain readable math and reachable answers and controls.
  for (const [width, height] of [
    [360, 740],
    [320, 568],
    [844, 390],
  ]) {
    console.log(`  scoring/layout: ${width}×${height}`);
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: true,
      isMobile: true,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/?qa=1&question=14-08-00000001&music=`);
    await page.waitForFunction(() => !!window.__nightwater);
    await page.click("#start");
    await page.evaluate(() => window.__nightwater.advance(30, [], true));
    const layout = await page.evaluate(() => {
      const box = (selector) => {
        const b = document.querySelector(selector).getBoundingClientRect();
        return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
      };
      return {
        panel: box("#choices"),
        hud: box("#hud"),
        pad: box("#touch-pad"),
        font: parseFloat(
          getComputedStyle(document.querySelector("#prompt")).fontSize,
        ),
      };
    });
    assert.ok(layout.panel.top >= layout.hud.bottom, JSON.stringify(layout));
    assert.ok(layout.panel.bottom <= height);
    assert.ok(layout.pad.top >= layout.hud.bottom);
    assert.ok(
      layout.pad.bottom <= layout.panel.top ||
        layout.pad.right < layout.panel.left,
    );
    assert.ok(layout.font >= 17);
    const scroll = await page.evaluate(() => {
      const question = document.querySelector(".question");
      question.scrollTop = question.scrollHeight;
      const prompt = document.querySelector("#prompt").getBoundingClientRect();
      const area = question.getBoundingClientRect();
      return {
        bottom: prompt.bottom,
        areaTop: area.top,
        areaBottom: area.bottom,
      };
    });
    assert.ok(scroll.bottom <= scroll.areaBottom + 1);
    assert.ok(
      scroll.bottom > scroll.areaTop,
      "the prompt is visible at the end of the scroll",
    );
    if (height < 650) {
      await page.locator(".question").focus();
      await page
        .locator(".question")
        .evaluate((el) => el.scrollTo({ top: 0, behavior: "instant" }));
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(
        () => document.querySelector(".question").scrollTop > 0,
      );
      await page
        .locator(".question")
        .evaluate((el) =>
          el.scrollTo({ top: el.scrollHeight, behavior: "instant" }),
        );
    }
    await page.screenshot({
      path: `artifacts/scoring-compact-${width}-${height}.png`,
    });
    const nextScroll = await page.evaluate(() => {
      const q = window.__nightwater;
      q.choose((q.question().correct + 1) % 3);
      q.advance(20, [], "tube");
      q.advance(30, [], true);
      return document.querySelector(".question").scrollTop;
    });
    assert.equal(nextScroll, 0, "a fresh question begins at the top");
    await page.click("#pause");
    const pauseTop = (
      await page.locator("#pause-menu .pause-card").boundingBox()
    ).y;
    assert.ok(pauseTop >= 0);
    await page.locator(".scoring-help").scrollIntoViewIfNeeded();
    const help = await page.locator(".scoring-help").boundingBox();
    assert.ok(help.y >= 0 && help.y + help.height <= height);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: quick bonuses, cancelled/changed/duplicate choices, pause/reload, swimming/drift, all speeds and windows, and real elapsed time on desktop and touch.",
  );
} finally {
  await browser.close();
}

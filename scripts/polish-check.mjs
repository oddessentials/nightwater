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
  for (const [device, width, height] of [
    ["desktop", 1440, 900],
    ["phone", 390, 844],
    ["landscape", 844, 390],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: device !== "desktop",
      isMobile: device !== "desktop",
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const start = async () => {
      await page.goto(`${base}/?qa=1&seed=2310&music=`);
      await page.waitForFunction(() => !!window.__nightwater);
      await page.evaluate(() => window.__nightwater.advance(0));
      await page.click("#start");
    };
    for (const tier of [2, 5, 10]) {
      await start();
      // Approach through the actual simulation so steering, catches and rendering agree.
      await page.evaluate((tier) => {
        const q = window.__nightwater;
        const target = q.lights().find((light) => light.tier === tier);
        while (q.snapshot().distance < target.distance - 12) q.advance(1 / 60);
      }, tier);
      await page.screenshot({
        path: `artifacts/polish-${device}-${tier}-approach.png`,
      });
      const caught = await page.evaluate((tier) => {
        const q = window.__nightwater;
        const target = q.lights().find((light) => light.tier === tier);
        for (
          let i = 0;
          i < 900 && q.snapshot().distance < target.distance + 1;
          i++
        ) {
          const delta = target.angle - q.snapshot().lean;
          q.advance(
            1 / 60,
            Math.abs(delta) < 0.025 ? [] : [delta > 0 ? "KeyD" : "KeyA"],
          );
          if (q.snapshot().caught.includes(target.index)) return q.snapshot();
        }
        return null;
      }, tier);
      assert.ok(caught, `${device}: could not catch tier ${tier}`);
      assert.equal(
        caught.drawCalls,
        21,
        "pickup polish stays in the existing tube draws",
      );
      for (const [frame, seconds] of [
        [0, 0],
        [6, 0.1],
        [12, 0.1],
        [21, 0.15],
        [30, 0.15],
      ]) {
        await page.evaluate(
          (seconds) => window.__nightwater.advance(seconds),
          seconds,
        );
        await page.screenshot({
          path: `artifacts/polish-${device}-${tier}-frame-${frame}.png`,
        });
      }
      const hud = await page.evaluate(() => {
        const card = document
          .querySelector("#ride-bonus")
          .getBoundingClientRect();
        const toast = document
          .querySelector("#catch-toast")
          .getBoundingClientRect();
        return {
          card: {
            x: card.x,
            y: card.y,
            width: card.width,
            height: card.height,
          },
          toast: {
            x: toast.x,
            y: toast.y,
            width: toast.width,
            height: toast.height,
          },
          opacity: Number(
            getComputedStyle(document.querySelector("#catch-toast")).opacity,
          ),
          backdrop: getComputedStyle(document.querySelector("#ride-bonus"))
            .backdropFilter,
        };
      });
      assert.ok(hud.card.x >= 0 && hud.card.x + hud.card.width <= width);
      assert.equal(hud.backdrop, "none");
      assert.ok(hud.opacity > 0.99, "catch event fades in and holds");
      if (device !== "desktop") assert.ok(hud.card.height <= 66);
      if (device === "phone") assert.ok(hud.toast.y + hud.toast.height < 210);
      else assert.ok(hud.card.x + hud.card.width < width / 2);
      await page.click("#pause");
      const before = await page
        .locator("#catch-toast")
        .evaluate((el) => el.getAnimations()[0].currentTime);
      await page.evaluate(() => window.__nightwater.realtime());
      await page.waitForTimeout(100);
      assert.equal(
        await page
          .locator("#catch-toast")
          .evaluate((el) => el.getAnimations()[0].currentTime),
        before,
      );
      await page.evaluate(() => window.__nightwater.advance(0));
      await page.click("#resume");
      await page.evaluate(() => window.__nightwater.advance(1.1));
      assert.ok(
        await page
          .locator("#catch-toast")
          .evaluate((el) => Number(getComputedStyle(el).opacity) < 0.65),
      );
      await page.evaluate(() => window.__nightwater.advance(0.25));
      assert.equal(await page.isVisible("#catch-toast"), false);
      results.push({
        device,
        tier,
        drawCalls: caught.drawCalls,
        triangles: caught.triangles,
        hud,
      });
    }

    await start();
    const idle = await page.evaluate(() => {
      const q = window.__nightwater;
      const toast = document.querySelector("#catch-toast");
      let last = toast.firstChild,
        announcements = 0,
        repeats = 0;
      while (q.snapshot().phase === "tube") {
        const count = q.snapshot().caught.length;
        q.advance(1 / 60);
        if (last !== toast.firstChild) {
          announcements++;
          last = toast.firstChild;
        } else if (q.snapshot().caught.length > count) {
          repeats++;
          const index = q.snapshot().caught.at(-1);
          const tier = q.lights()[index].tier;
          if (
            !document
              .querySelector(`[data-bonus-tier="${tier}"]`)
              .getAnimations().length
          )
            throw new Error("a repeated pickup did not pulse its chip");
        }
      }
      return { announcements, repeats };
    });
    assert.ok(idle.announcements <= 4);
    assert.ok(idle.repeats > 0);
    // Base-only rewards and deductions are both visible without changing score copy.
    for (const correct of [true, false]) {
      await page.evaluate((correct) => {
        const q = window.__nightwater;
        q.advance(30, [], true);
        q.advance(16, ["KeyS"]);
        q.choose((q.question().correct + (correct ? 0 : 1)) % 3);
        q.advance(20, [], "tube");
        q.advance(0.12);
      }, correct);
      const delta = await page.textContent("#score-delta");
      assert.match(delta, correct ? /^\+[1-9]/ : /^−[1-9]/);
      assert.ok(
        await page
          .locator("#score-delta")
          .evaluate((el) => Number(getComputedStyle(el).opacity) > 0.5),
      );
      assert.ok(
        await page
          .locator("#score")
          .evaluate((el) => el.getAnimations().length > 0),
      );
      if (device === "phone") {
        assert.ok(
          await page.evaluate(() => {
            const delta = document
              .querySelector("#score-delta")
              .getBoundingClientRect();
            const card = document
              .querySelector("#ride-bonus")
              .getBoundingClientRect();
            return delta.bottom < card.top && delta.right <= innerWidth;
          }),
          "the floating score clears the compact card",
        );
      }
      await page.screenshot({
        path: `artifacts/polish-${device}-${correct ? "reward" : "deduction"}.png`,
      });
    }
    if (device === "desktop") {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await start();
      await page.evaluate(() => {
        const q = window.__nightwater;
        while (!q.snapshot().caught.length) q.advance(1 / 60);
        q.advance(0.1);
      });
      assert.equal(
        await page
          .locator("#catch-toast")
          .evaluate((el) => getComputedStyle(el).transform),
        "none",
      );
      await page.screenshot({ path: "artifacts/polish-reduced-motion.png" });
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/polish-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    "PASS: tier catch sequences, 21 tube draws, compact HUD, paused/fading events, repeat chips, and base rewards/deductions.",
  );
} finally {
  await browser.close();
}

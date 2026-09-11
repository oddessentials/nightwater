import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.argv[2] || process.env.NIGHTWATER_URL || "http://127.0.0.1:4173";
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
  await page.goto(`${base}/?qa=1`);
  await page.click("#start");
  await page.click("#pause");
  await page.click("#resume");
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    document.querySelector("#pause").click();
    document.querySelector("#resume").click();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
  });
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
  console.log("PASS: pause, resume, repeated teardown, and events after disposal.");
} finally {
  await browser.close();
}

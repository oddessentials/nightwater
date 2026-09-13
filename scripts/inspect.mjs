import { mkdir } from "node:fs/promises";
import { launch } from "./support/browser.mjs";

await mkdir("artifacts", { recursive: true });
const browser = await launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:4173/?qa=1", { waitUntil: "networkidle" });
await page.waitForFunction(
  () => window.__nightwater || !document.querySelector("#error").hidden,
);
await page.screenshot({ path: "artifacts/title.png" });
console.log("Errors at title:", errors);
if (await page.evaluate(() => !!window.__nightwater)) {
  await page.click("#start");
  await page.evaluate(() => window.__nightwater.advance(4));
  await page.screenshot({ path: "artifacts/tube.png" });
  await page.evaluate(() => window.__nightwater.advance(20));
  await page.screenshot({ path: "artifacts/basin.png" });
  console.log(
    "Basin:",
    await page.evaluate(() => window.__nightwater.snapshot()),
  );
  await page.evaluate(() => {
    const q = window.__nightwater;
    q.look(q.snapshot().yaw + Math.PI, 0.2);
  });
  await page.screenshot({ path: "artifacts/inlet.png" });
  console.log(
    "WebGL:",
    await page.evaluate(() => {
      const gl = document.querySelector("canvas").getContext("webgl2");
      const e = gl.getExtension("WEBGL_debug_renderer_info");
      return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unknown";
    }),
  );
}
console.log("Final errors:", errors);
await browser.close();
if (errors.length) process.exitCode = 1;

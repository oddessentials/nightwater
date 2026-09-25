import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ASPECTS, captureTake } from "../trailer/capture.mjs";
import { install } from "../trailer/driver.mjs";
import { launchBrowser, openGame, screenshot } from "../trailer/page.mjs";
import { POOLS, VIEWS } from "./pools.mjs";

process.chdir(fileURLToPath(new URL("../..", import.meta.url)));
const only = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const aspects = Object.keys(VIEWS).filter((aspect) =>
  process.argv.some((arg) => arg.startsWith("--"))
    ? process.argv.includes(`--${aspect}`)
    : true,
);

const HUD = [
  "#hud",
  "#choices",
  "#ride-caption",
  "#ride-bonus",
  "#catch-toast",
  "#ride-hint",
];

const pool = ({ name, stage, level, journey, seed }, view) => ({
  name,
  query: `seed=${seed}&stage=${stage}&level=${level}&journey=${journey}`,
  frames: view.frame + 1,
  params: { ...view, hud: HUD },
  setup(q, drive, ctx) {
    drive.begin();
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>${ctx.hud.join()}{visibility:hidden!important}</style>`,
    );
  },
  frame(q, drive, ctx, i) {
    const { state, camera } = q.trailer;
    const { center, yaw } = state.basin;
    state.body.x = center.x - Math.sin(yaw) * ctx.back;
    state.body.z = center.z + Math.cos(yaw) * ctx.back;
    state.velocity.set(0, 0, 0);
    drive.look(ctx.yaw - yaw, ctx.pitch);
    drive.step();
    camera.updateMatrixWorld();
    const up = camera.up.clone().applyQuaternion(camera.quaternion);
    const exits = q.snapshot().exits.map((p) => {
      const at = camera.position.clone().set(...p);
      const edge = at.clone().addScaledVector(up, 2.08).project(camera);
      at.project(camera);
      return {
        x: +((at.x + 1) / 2).toFixed(4),
        y: +((1 - at.y) / 2).toFixed(4),
        r: +Math.abs((edge.y - at.y) / 2).toFixed(4),
      };
    });
    return { ...drive.record(i), exits, question: q.question() };
  },
});

const tube = (exit) => ({
  name: `tube-${exit + 1}`,
  query: "seed=20&stage=1&level=1&journey=2",
  frames: 41,
  params: { exit, hud: HUD },
  setup(q, drive, ctx) {
    drive.begin();
    drive.enter(ctx.exit, 34);
    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>${ctx.hud.join()}{visibility:hidden!important}</style>`,
    );
  },
  frame(q, drive, ctx, i) {
    drive.step({ strafe: drive.autopilot() });
    return drive.record(i);
  },
});

async function captureRide(browser, aspect) {
  const shot = ASPECTS[aspect];
  const dir = `artifacts/site/takes/${aspect}/ride`;
  await mkdir(dir, { recursive: true });
  const { context, page, cdp } = await openGame(browser, {
    ...shot,
    query: "seed=20&stage=2&level=1&journey=5",
  });
  try {
    await page.evaluate(`(${install})()`);
    await page.evaluate((hud) => {
      window.__drive.begin();
      document.head.insertAdjacentHTML(
        "beforeend",
        `<style>${hud.join()}{visibility:hidden!important}</style>`,
      );
      window.__drive.enter(0, 0);
    }, HUD);
    const wanted = { 2: "ember", 5: "lantern", 10: "star" };
    const pending = new Map();
    const log = {};
    let airAt = -1;
    let mouth = false;
    for (let i = 0; i < 60 * 40; i++) {
      const record = await page.evaluate(() => {
        const drive = window.__drive;
        drive.step({ strafe: drive.autopilot() });
        return drive.record(0);
      });
      for (const event of record.events)
        if (
          event.kind === "catch" &&
          wanted[event.tier] &&
          !log[wanted[event.tier]]
        )
          pending.set(wanted[event.tier], i + (event.tier === 2 ? 3 : 4));
        else if (event.kind === "phase" && event.to === "air") airAt = i;
      const moments = [...pending]
        .filter(([, at]) => at === i)
        .map(([name]) => name);
      if (
        !mouth &&
        record.phase === "tube" &&
        record.length - record.distance < 5
      ) {
        mouth = true;
        moments.push("mouth");
      }
      if (airAt >= 0 && i === airAt + 28) moments.push("air");
      for (const name of moments) {
        pending.delete(name);
        log[name] = record;
        await writeFile(`${dir}/${name}.png`, await screenshot(cdp, shot));
        console.log(`  ride/${aspect}: ${name} at step ${i}`);
      }
      if (log.air) break;
    }
    await writeFile(`${dir}/log.json`, JSON.stringify(log, null, 1));
  } finally {
    await context.close();
  }
}

const browser = await launchBrowser();
try {
  for (const spec of POOLS.filter((p) => !only.length || only.includes(p.name)))
    for (const aspect of aspects) {
      console.log(`Capturing ${spec.name} (${aspect})`);
      await captureTake(pool(spec, VIEWS[aspect]), {
        aspect,
        every: VIEWS[aspect].frame,
        from: 0,
        out: "artifacts/site",
        browser,
      });
    }
  for (const exit of [0, 1, 2].filter(
    (exit) => !only.length || only.includes(`tube-${exit + 1}`),
  ))
    for (const aspect of aspects) {
      console.log(`Capturing tube-${exit + 1} (${aspect})`);
      await captureTake(tube(exit), {
        aspect,
        every: 20,
        from: 0,
        out: "artifacts/site",
        browser,
      });
    }
  if (!only.length || only.includes("ride"))
    for (const aspect of aspects) await captureRide(browser, aspect);
} finally {
  await browser.close();
}

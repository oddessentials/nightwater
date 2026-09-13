import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const args = process.argv.slice(2);
const needsMusic = args[0] === "--music" && !!args.shift();
const [script, ...rest] = args;
if (!script) {
  console.error(
    "usage: node scripts/with-server.mjs [--music] <script> [args]",
  );
  process.exit(2);
}
const app = "http://127.0.0.1:4173";
const music = process.env.NIGHTWATER_MUSIC_URL || "http://127.0.0.1:4180";

async function serving(url, text) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) });
    return response.ok && (!text || (await response.text()).includes(text));
  } catch {
    return false;
  }
}

const hasMusic = await serving(`${music}/manifest.json`);
if (needsMusic && !hasMusic) {
  console.error(`No album at ${music}. Start it with npm run music:serve.`);
  process.exit(1);
}
console.log(
  hasMusic
    ? `Music: ${music}`
    : "Music: none (npm run music:serve adds the album)",
);
let server = null;
if (await serving(app, "Nightwater")) console.log(`App: ${app} (already up)`);
else {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    {
      stdio: ["ignore", "ignore", "inherit"],
      windowsHide: true,
      env: { ...process.env, VITE_MUSIC_URL: hasMusic ? music : "" },
    },
  );
  for (let attempt = 0; !(await serving(app, "Nightwater")); attempt++) {
    if (server.exitCode !== null || attempt === 100) {
      console.error("The dev server did not start.");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.log(`App: ${app}`);
}
const child = spawn(process.execPath, [script, ...rest], {
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    NIGHTWATER_URL: app,
    ...(hasMusic && { NIGHTWATER_MUSIC_URL: music }),
  },
});
const stop = (code) => {
  server?.kill();
  process.exit(code);
};
child.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

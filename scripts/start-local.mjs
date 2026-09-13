import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const url = "http://127.0.0.1:4173";
const windows = process.platform === "win32";
function openBrowser() {
  const command = windows
    ? "cmd"
    : process.platform === "darwin"
      ? "open"
      : "xdg-open";
  const args = windows ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", windowsHide: true });
  child.on("error", () => console.log(`Open ${url} in your browser.`));
  child.unref();
}
async function isReady() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(500) });
    return response.ok && (await response.text()).includes("Nightwater");
  } catch {
    return false;
  }
}
if (existsSync("music/dist/manifest.json")) {
  const music = spawnSync("docker", ["compose", "up", "-d", "cdn"], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (music.status !== 0)
    console.log(
      "Riding without music. Start Docker Desktop to hear the album.",
    );
}
if (await isReady()) {
  console.log(`Nightwater is already running at ${url}`);
  openBrowser();
} else {
  if (!existsSync("node_modules/vite/bin/vite.js")) {
    console.log("Installing Nightwater dependencies…");
    const install = spawnSync(
      windows ? "npm.cmd" : "npm",
      ["ci", "--no-audit", "--no-fund"],
      { stdio: "inherit", shell: windows, windowsHide: true },
    );
    if (install.status !== 0) process.exit(install.status || 1);
  }
  const child = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    { stdio: "inherit", windowsHide: true },
  );
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code || 0;
  });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) break;
    if (await isReady()) {
      console.log(
        "Keep this window open while you ride. Ctrl+C closes the park.",
      );
      openBrowser();
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

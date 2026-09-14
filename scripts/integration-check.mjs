import { spawn } from "node:child_process";

// One server, sequential suites: avoid competing for the GPU or starving scoring.
const failed = [];
for (const suite of ["lifecycle", "catch", "scoring"]) {
  const started = performance.now();
  console.log(`\n› Browser: ${suite}`);
  const child = spawn(process.execPath, [`scripts/${suite}-check.mjs`], {
    stdio: "inherit",
    windowsHide: true,
    // A stuck suite must fail and leave time for the remaining checks.
    timeout: 5 * 60 * 1000,
  });
  const heartbeat = setInterval(() => {
    const seconds = ((performance.now() - started) / 1000).toFixed(0);
    console.log(`  Browser: ${suite} still running (${seconds}s)`);
  }, 15000);
  const status = await new Promise((resolve) => {
    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
    child.on("exit", (code, signal) => {
      if (signal)
        console.error(
          `  ${suite} stopped by ${signal} (timeout or interruption)`,
        );
      resolve(code ?? 1);
    });
  });
  clearInterval(heartbeat);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`  ${status === 0 ? "PASS" : "FAIL"}: ${suite} (${seconds}s)`);
  if (status !== 0) failed.push(suite);
}
if (failed.length) {
  console.error(`Browser checks failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}

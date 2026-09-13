import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const full = process.argv.includes("--full");
const tool = (name, file) => `node_modules/${name}/bin/${file}`;
const lintable = /\.(?:[cm]?js|ts)$/;
const failed = [];
const started = performance.now();

function run(title, command, args) {
  console.log(`\n› ${title}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error?.code === "ENOENT") {
    console.log(`  ${command} is not installed; skipped`);
    return;
  }
  if (result.error) throw result.error;
  if (result.status !== 0) failed.push(title);
}

const staged = () =>
  spawnSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
    { encoding: "utf8", windowsHide: true },
  )
    .stdout.split("\0")
    .filter(Boolean);

const files = full ? null : staged();
const formatted = files ?? ["."];
const linted = files ? files.filter((f) => lintable.test(f)) : ["."];
console.log(
  full ? "Checking everything" : `Checking ${files.length} staged files`,
);
if (formatted.length)
  run("Prettier", process.execPath, [
    tool("prettier", "prettier.cjs"),
    "--check",
    "--ignore-unknown",
    ...formatted,
  ]);
if (linted.length)
  run("ESLint", process.execPath, [
    tool("eslint", "eslint.js"),
    "--max-warnings",
    "0",
    ...linted,
  ]);
run("TypeScript", process.execPath, [tool("typescript", "tsc"), "--noEmit"]);
run("Unit tests", process.execPath, [
  "--experimental-strip-types",
  "--test",
  "tests/*.test.ts",
]);
run(
  "Gitleaks",
  "gitleaks",
  full
    ? ["git", "--redact", "--no-banner", "."]
    : ["git", "--pre-commit", "--staged", "--redact", "--no-banner", "."],
);
if (full) run("Build", process.execPath, [tool("vite", "vite.js"), "build"]);

const seconds = ((performance.now() - started) / 1000).toFixed(1);
if (failed.length) {
  console.error(`\n✗ ${failed.join(", ")} failed after ${seconds}s`);
  process.exit(1);
}
console.log(`\n✓ Verified in ${seconds}s`);

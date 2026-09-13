import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
if (!existsSync(new URL("../.git", import.meta.url))) process.exit(0);
const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "ignore",
  windowsHide: true,
});
if (!result.error && result.status === 0)
  console.log(
    "Git hooks: .githooks (pre-commit checks staged files, pre-push checks everything)",
  );

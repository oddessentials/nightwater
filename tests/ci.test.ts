import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

// Evaluate the workflow's actual gate. Its boolean/string expressions have
// the same semantics in JavaScript and GitHub Actions for these inputs.
const workflow = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);
const deploy = workflow.match(
  / {2}deploy:\r?\n {4}if: >-\r?\n\s*\$\{\{([\s\S]*?)\}\}\r?\n {4}needs: \[([^\]]+)\]/,
);
assert.ok(deploy, "deployment has an explicit gate and dependencies");
const [, gate, dependencies] = deploy;

function mayDeploy(
  event: string,
  results: Record<string, string> = {},
  cancelled = false,
  fork = false,
) {
  const needs: Record<string, { result: string }> = {
    check: { result: "success" },
    secrets: { result: "success" },
    browser: { result: event === "workflow_dispatch" ? "success" : "skipped" },
  };
  for (const [job, result] of Object.entries(results)) needs[job] = { result };
  return runInNewContext(gate, {
    needs,
    cancelled: () => cancelled,
    github: {
      event_name: event,
      repository: "owner/nightwater",
      event: {
        pull_request: {
          head: {
            repo: { full_name: fork ? "fork/nightwater" : "owner/nightwater" },
          },
        },
      },
    },
  });
}

test("deployment requires every applicable check to succeed", () => {
  assert.deepEqual(dependencies.split(", "), ["check", "secrets", "browser"]);
  for (const event of ["pull_request", "push", "workflow_dispatch"]) {
    assert.equal(mayDeploy(event), true, `${event}: successful checks deploy`);
    assert.equal(mayDeploy(event, {}, true), false, `${event}: cancelled run`);
    for (const job of ["check", "secrets", "browser"]) {
      for (const result of [
        "failure",
        "cancelled",
        "timed_out",
        "skipped",
        "",
      ]) {
        const optional =
          job === "browser" &&
          result === "skipped" &&
          event !== "workflow_dispatch";
        assert.equal(
          mayDeploy(event, { [job]: result }),
          optional,
          `${event}: ${job}=${result}`,
        );
      }
    }
  }
  assert.equal(mayDeploy("pull_request", {}, false, true), false, "fork PR");
});

# Development checks

`npm ci` installs the Git hooks in `.githooks`. Pre-commit checks staged formatting
and lint, TypeScript, unit tests, and secrets. Pre-push runs `npm run verify:full`:
repository-wide checks, a production build, then lifecycle, catch, and scoring
browser checks. A failure blocks the push.

The browser checks share one local server and run sequentially to avoid competing
for graphics resources. Each suite logs progress and timing, has a five-minute
limit, and lets the remaining suites run after a failure. Screenshots go to
`artifacts/`. Install the matching browser with `npx playwright install chromium`
if it is not already available.

| Command                    | Purpose                                                   |
| -------------------------- | --------------------------------------------------------- |
| `npm run verify:full`      | All pre-push checks, including browser integration        |
| `npm run verify:ci`        | Formatting, lint, types, unit tests, and production build |
| `npm run test:integration` | Lifecycle, catches, and scoring against one local server  |
| `npm run test:browser`     | Extended browser journey and rendering checks             |
| `npm run test:rides`       | Ride speed and motion checks                              |
| `npm run test:polish`      | Pickup appearance and feedback checks                     |

Routine pull-request and main-branch CI runs `verify:ci` and a dedicated secret
scan. It does not install or run Playwright. Deployment downloads the production
build from the successful check job instead of rebuilding it. Both required jobs
must succeed, and fork pull requests cannot deploy.

Use **Run workflow** only when hosted browser diagnostics are needed. That opt-in
run retains the extended browser and integration suites, uploads diagnostic
artifacts, and requires browser success before deployment. Failures, timeouts,
cancellations, and unexpectedly skipped checks block deployment.

For simulation-only waits in browser checks, use the QA hook's bounded predicate:
`q.advance(30, [], () => q.snapshot().distance >= target)`. It retains every 1/60 s
physics step and renders at the stopping point, with landing presentation still
rendered when needed for scoring. Avoid loops that call `advance(1 / 60)` just to
wait for a catch: each call renders a complete graphics frame.

// The main continuous take: basin 1 with "7 × 7 = ?", the chosen exit, a full
// ride with every light caught (loop, star), the splash, basin 2 with the ×10
// stake, the correct answer and the score reward inside tube 2.
export default {
  name: "journey",
  query: "seed=20&stage=2&level=1&journey=5",
  frames: 2160,
  params: {
    PAN_FRAMES: 229,
    QUESTION_HOLD: 134,
    LANDING_HOLD: 118,
    TUBE_TAIL: 300,
  },
  setup(q, drive) {
    drive.begin("fast");
    drive.fade("#hud", 0);
    drive.fade("#choices", 0);
    drive.look(0.78, 0.06);
    window.__take = { stage: "pan", since: 0, landed: -1, entered: -1 };
  },
  frame(q, drive, ctx, i) {
    const { PAN_FRAMES, QUESTION_HOLD, LANDING_HOLD, TUBE_TAIL } = ctx;
    const t = window.__take;
    const { state } = q.trailer;
    const ease = (x) => x * x * (3 - 2 * x);
    let controls = {};
    if (t.stage === "pan") {
      const u = ease(drive.clamp(i / PAN_FRAMES, 0, 1));
      drive.look(0.78 - 0.78 * u, 0.06 - 0.045 * u);
      const reveal = drive.clamp((i - (PAN_FRAMES - 40)) / 40, 0, 1);
      drive.fade("#hud", reveal);
      drive.fade("#choices", reveal);
      if (i >= PAN_FRAMES) {
        t.stage = "question";
        t.since = i;
      }
    } else if (t.stage === "question") {
      if (i - t.since >= QUESTION_HOLD) {
        // The question was read once the panel appeared, not during the pan:
        // credit the answer as a quick one.
        q.trailer.setNow(q.trailer.now() - q.trailer.clock().elapsedMs + 1200);
        q.choose(0);
        t.stage = "ride";
      }
    } else if (t.stage === "ride") {
      controls = { strafe: drive.autopilot() };
      if (state.phase === "basin" && state.landings >= 2) {
        t.stage = "landed";
        t.since = i;
        t.landed = i;
      }
    } else if (t.stage === "landed") {
      if (i - t.since >= LANDING_HOLD) {
        q.choose(q.question().correct);
        t.stage = "ride2";
      }
    } else if (t.stage === "ride2") {
      controls = { strafe: drive.autopilot() };
      if (state.phase === "tube" && t.entered < 0) t.entered = i;
      if (t.entered >= 0 && i - t.entered >= TUBE_TAIL) t.stage = "done";
    }
    if (t.stage !== "done") drive.step(controls);
    return { ...drive.record(i), stage: t.stage };
  },
};

// Page-side helpers for the take scripts. `install` is stringified and run in
// the browser, so it must stay self-contained.
export function install() {
  const q = window.__nightwater;
  const { input, state } = q.trailer;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const style = (selector, css) => {
    for (const element of document.querySelectorAll(selector))
      Object.assign(element.style, css);
  };
  // Score changes surface as answer rewards; phase edges and catches drive SFX.
  let lastPhase = state.phase;
  let lastCaught = new Set(state.caught);
  let lastScore = q.trailer.journey().state.score;
  const drive = {
    clamp,
    style,
    // Start the ride and skip the feeder without drawing it.
    begin(rideSpeed = "fast") {
      document.querySelector("#start").click();
      state.rideSpeed = rideSpeed;
      q.advance(60, [], true);
      lastPhase = state.phase;
      lastCaught = new Set(state.caught);
    },
    // Choose an exit and ride into its tube, steering for the lights, until
    // `distance` metres in. Frames are stepped but not captured.
    enter(exit, distance = 0) {
      q.choose(exit);
      for (let i = 0; i < 60 * 30 && state.phase !== "tube"; i++) drive.step();
      while (state.phase === "tube" && state.distance < distance)
        drive.step({ strafe: drive.autopilot() });
      lastPhase = state.phase;
      lastCaught = new Set(state.caught);
    },
    // Lean is analog through the touch pad axis; keys add paddle/turn input.
    step({ strafe = 0, forward = 0, keys = [] } = {}) {
      input.touchX = clamp(strafe, -1, 1);
      input.touchY = clamp(forward, -1, 1);
      q.advance(1 / 60, keys);
    },
    // Aim the lean at the next light in reach, easing back between lights.
    autopilot(lookahead = 14) {
      if (state.phase !== "tube") return 0;
      const next = state.lights.find(
        (light, index) =>
          !state.caught.has(index) && light.distance > state.distance - 0.6,
      );
      const limit = q.snapshot().leanLimit;
      if (!next || next.distance - state.distance > lookahead || limit < 0.01)
        return 0;
      return clamp(next.angle / limit, -1, 1);
    },
    look(yaw, pitch) {
      state.yaw = yaw;
      state.pitch = pitch;
    },
    fade(selector, alpha) {
      style(selector, { opacity: String(clamp(alpha, 0, 1)) });
    },
    record(i) {
      const journey = q.trailer.journey().state;
      const events = [];
      if (state.phase !== lastPhase) {
        events.push({ kind: "phase", from: lastPhase, to: state.phase });
        lastPhase = state.phase;
      }
      for (const index of state.caught)
        if (!lastCaught.has(index))
          events.push({
            kind: "catch",
            tier: state.lights[index].tier,
            count: state.caught.size,
          });
      lastCaught = new Set(state.caught);
      if (journey.score !== lastScore) {
        events.push({ kind: "score", delta: journey.score - lastScore });
        lastScore = journey.score;
      }
      return {
        i,
        phase: state.phase,
        phaseTime: Number(state.phaseTime.toFixed(3)),
        speed: Number(state.speed.toFixed(2)),
        distance: Number(state.distance.toFixed(2)),
        length: Number(state.route.length.toFixed(1)),
        lean: Number(state.lean.toFixed(3)),
        roll: Number(state.roll.toFixed(3)),
        yaw: Number(state.yaw.toFixed(3)),
        pitch: Number(state.pitch.toFixed(3)),
        caught: state.caught.size,
        multiplier: state.multiplier,
        armed: journey.multiplier,
        score: journey.score,
        level: journey.level,
        selected: state.selected,
        loop: state.route.curve.loop,
        events,
      };
    },
  };
  window.__drive = drive;
}

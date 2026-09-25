// Short basin shots for the "addition to calculus" montage: one question each,
// camera settled on the exits with the panel and wall signs visible. The
// integral shot runs on as the closing plate, its HUD fading out for the lockup.
const shot = (
  name,
  query,
  { yaw, pitch, drift, frames = 150, fadeAt = 0, fadeFor = 36 },
) => ({
  name,
  query,
  frames,
  params: { yaw, pitch, drift, fadeAt, fadeFor },
  setup(q, drive, ctx) {
    drive.begin();
    drive.look(ctx.yaw, ctx.pitch);
  },
  frame(q, drive, ctx, i) {
    drive.look(ctx.yaw + (ctx.drift * i) / 150, ctx.pitch);
    if (ctx.fadeAt && i >= ctx.fadeAt) {
      const alpha = 1 - drive.clamp((i - ctx.fadeAt) / ctx.fadeFor, 0, 1);
      drive.fade("#hud", alpha);
      drive.fade("#choices", alpha);
    }
    drive.step();
    return drive.record(i);
  },
});

export const pizza = shot("q-pizza", "seed=31&stage=6&level=1&journey=1", {
  yaw: -0.16,
  pitch: 0.05,
  drift: 0.06,
});
export const geometry = shot(
  "q-geometry",
  "seed=44&stage=14&level=5&journey=1",
  { yaw: 0.12, pitch: 0.04, drift: -0.05 },
);
export const integral = shot(
  "q-integral",
  "seed=53&stage=21&level=10&journey=5",
  { yaw: 0, pitch: 0.06, drift: 0.03, frames: 450, fadeAt: 87 },
);

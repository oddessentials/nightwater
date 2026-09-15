// Tube variety for the montage: a violet spiral and a gold switchback, joined a
// little way in so the shot opens at speed.
const shot = (name, query, exit, distance, frames = 150) => ({
  name,
  query,
  frames,
  params: { exit, distance },
  setup(q, drive, ctx) {
    drive.begin();
    drive.enter(ctx.exit, ctx.distance);
    drive.fade("#ride-caption", 0);
  },
  frame(q, drive, ctx, i) {
    drive.step({ strafe: drive.autopilot() });
    return drive.record(i);
  },
});

export const violet = shot(
  "tube-violet",
  "seed=28&stage=3&level=1&journey=2",
  1,
  70,
  240,
);
export const gold = shot(
  "tube-gold",
  "seed=16&stage=4&level=1&journey=3",
  2,
  60,
  240,
);

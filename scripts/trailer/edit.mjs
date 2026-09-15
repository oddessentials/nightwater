// The edit: which take frames land at which trailer frames, the typography
// cues, and the music. Cuts sit on the album track's beat grid (126 bpm) so the
// ride enters the tube on the drop and the star lands on a downbeat.
import { readFile } from "node:fs/promises";
import path from "node:path";

export const FPS = 60;
export const BPM = 126;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const bar = (n) => n * BAR;
export const TOTAL = 2520; // 42.0 s

export const MUSIC = {
  file: "glowstick-lifeguard-d243db70.m4a",
  // Trailer 0:00 sits 5.676 s into the track so its drop (15.20 s) hits bar 5.
  offset: 15.2 - bar(5),
  fadeAt: 38.6,
  fadeFor: 3.3,
};

export const TAKES = [
  "journey",
  "questions:pizza",
  "tubes:violet",
  "questions:geometry",
  "tubes:gold",
  "questions:integral",
];

export async function loadLogs(out, aspect) {
  const logs = {};
  for (const name of TAKES) {
    const file = name.includes(":") ? name.split(":")[1] : name;
    const take = {
      journey: "journey",
      pizza: "q-pizza",
      violet: "tube-violet",
      geometry: "q-geometry",
      gold: "tube-gold",
      integral: "q-integral",
    }[file];
    const log = JSON.parse(
      await readFile(path.join(out, "takes", aspect, take, "log.json"), "utf8"),
    );
    logs[take] = log.frames;
  }
  return logs;
}

const frameOf = (log, predicate) => log.find(predicate)?.i;

// Segments are [take, first frame, length] in trailer order.
export function segments(logs) {
  const journey = logs.journey;
  const tubeStart = frameOf(journey, (r) =>
    r.events.some((e) => e.kind === "phase" && e.to === "tube"),
  );
  const anchor = tubeStart - Math.round(bar(5) * FPS);
  if (anchor < 0)
    throw new Error(
      `journey take enters the tube too early (frame ${tubeStart})`,
    );
  const montageAt = Math.round(bar(16.5) * FPS);
  const shot = Math.round(BEAT * 2 * FPS);
  // The integral shot carries on under the closing lockup (its HUD fades at
  // take frame 87 = bar 19), so the montage never cuts into the end card.
  const list = [
    ["journey", anchor, montageAt],
    ["q-pizza", 30, shot],
    ["tube-violet", 60, shot],
    ["q-geometry", 30, shot],
    ["tube-gold", 60, shot],
    ["q-integral", 30, TOTAL - montageAt - 4 * shot],
  ];
  let at = 0;
  return list.map(([take, from, length]) => {
    const segment = { take, from, length, at };
    at += length;
    return segment;
  });
}

// Per trailer frame: the source record (for sound) and its take.
export function timeline(logs) {
  const frames = [];
  for (const segment of segments(logs))
    for (let k = 0; k < segment.length; k++) {
      const record = logs[segment.take][segment.from + k];
      if (!record)
        throw new Error(`${segment.take} has no frame ${segment.from + k}`);
      frames.push({ take: segment.take, frame: segment.from + k, record });
    }
  if (frames.length !== TOTAL)
    throw new Error(`timeline is ${frames.length} frames, expected ${TOTAL}`);
  return frames;
}

export function cues(aspect) {
  const portrait = aspect === "portrait";
  const top = (landscape, portraitValue) =>
    portrait ? portraitValue : landscape;
  const left = portrait ? undefined : "7.5%";
  return [
    { kind: "black", at: -1, until: 0, enter: 0, leave: 0.9 },
    {
      kind: "eyebrow",
      html: "<i></i>THE PARK IS YOURS",
      at: 0.9,
      until: 3.1,
      top: top("29%", "36%"),
    },
    {
      kind: "line",
      html: "After hours, <em>forever.</em>",
      at: 1.15,
      until: 3.25,
      top: top("33%", "39.5%"),
    },
    {
      kind: "line",
      html: "Every answer is a <em>slide.</em>",
      at: bar(2.5),
      until: 7.0,
      top: top("19%", "26%"),
    },
    {
      kind: "line",
      html: "Lean into the curves.",
      motion: "hit",
      at: bar(5),
      until: bar(6.4),
      top: top("20%", "30%"),
    },
    {
      kind: "line",
      html: "Catch the <em>lights.</em>",
      motion: "hit",
      at: bar(7),
      until: bar(8.6),
      top: top("20%", "30%"),
    },
    {
      kind: "line",
      html: "Multiply your score.",
      motion: "hit",
      at: bar(10),
      until: 21.2,
      top: top("20%", "30%"),
    },
    {
      kind: "eyebrow",
      html: "21 STAGES · 210 LEVELS",
      at: bar(16.5),
      until: bar(19) - 0.35,
      top: top("15%", "27.5%"),
    },
    {
      kind: "line",
      html: "From addition to <em>calculus.</em>",
      at: bar(16.5) + 0.12,
      until: bar(19) - 0.35,
      top: top("18.5%", "30.5%"),
    },
    { kind: "veil", at: bar(19), until: 99, enter: 0.7 },
    {
      kind: "lockup",
      html: "Night<span>water.</span>",
      at: bar(19) + 0.2,
      until: 99,
      enter: 0.8,
      rise: 18,
      top: top("24%", "30%"),
      left,
    },
    {
      kind: "tag",
      html: "Every answer is a slide.<br>From addition to calculus.",
      at: bar(19) + 0.9,
      until: 99,
      top: top("60%", "58%"),
      left,
    },
    {
      kind: "url",
      html: "PLAY IN YOUR BROWSER<b>math.oddessentials.ai</b>",
      at: bar(19) + 1.6,
      until: 99,
      top: top("77%", "72%"),
      left,
    },
    { kind: "black", at: TOTAL / FPS - 1.0, until: 99, enter: 0.9 },
  ];
}

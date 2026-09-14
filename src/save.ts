import { stageOf } from "./questions/index.ts";
import type { JourneyState } from "./journey.ts";
import { MAX_ANSWER_MS } from "./scoring.ts";

const KEY = "nightwater.journey";

export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStore(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const count = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;

function valid(d: Partial<JourneyState> | null): d is JourneyState {
  return (
    !!d &&
    typeof d === "object" &&
    d.v === 1 &&
    Number.isInteger(d.seed) &&
    d.seed! >= 0 &&
    d.seed! <= 0xffffffff &&
    !!stageOf(d.stage!) &&
    Number.isInteger(d.level) &&
    d.level! >= 1 &&
    d.level! <= 10 &&
    count(d.attempt) &&
    count(d.answered) &&
    count(d.correct) &&
    count(d.score) &&
    count(d.answerMs) &&
    d.answerMs! <= MAX_ANSWER_MS &&
    [1, 2, 5, 10].includes(d.multiplier!) &&
    d.correct! <= d.answered! &&
    typeof d.won === "boolean" &&
    typeof d.freeRide === "boolean" &&
    count(d.landings) &&
    (d.won || !d.freeRide)
  );
}

export function loadJourney(store = browserStore()): JourneyState | null {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      if (data.score === undefined) data.score = 0;
      if (data.multiplier === undefined) data.multiplier = 1;
      if (data.answerMs === undefined) data.answerMs = 0;
    }
    return valid(data) ? data : null;
  } catch {
    return null;
  }
}

export function saveJourney(state: JourneyState, store = browserStore()) {
  try {
    store?.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function clearJourney(store = browserStore()) {
  try {
    store?.removeItem(KEY);
  } catch {}
}

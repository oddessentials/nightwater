import { mix } from "./questions/kit.ts";
import {
  CURRICULUM,
  makeQuestion,
  nextLevel,
  parseQuestionId,
  stageOf,
  type Question,
} from "./questions/index.ts";

export type JourneyState = {
  v: 1;
  seed: number;
  stage: number;
  level: number;
  attempt: number;
  answered: number;
  correct: number;
  won: boolean;
  freeRide: boolean;
};

export type Feedback = {
  correct: boolean;
  answer: string;
  next: { stage: number; level: number } | null;
};

export function newJourney(
  seed: number,
  stage = CURRICULUM[0][0],
  level = 1,
): JourneyState {
  return {
    v: 1,
    seed: seed >>> 0,
    stage,
    level,
    attempt: 0,
    answered: 0,
    correct: 0,
    won: false,
    freeRide: false,
  };
}

export class Journey {
  state: JourneyState;
  private pin: number | null;
  private cacheKey = "";
  private cached: Question | null = null;
  constructor(state: JourneyState, pin: number | null = null) {
    this.state = state;
    this.pin = pin;
  }
  get active() {
    return !this.state.won && !this.state.freeRide;
  }
  get question() {
    if (!this.active) return null;
    const { seed, stage, level, attempt } = this.state;
    const draw = this.pin ?? mix(seed, stage, level, attempt);
    const key = `${stage}:${level}:${draw}`;
    if (key !== this.cacheKey) {
      this.cached = makeQuestion(stage, level, draw);
      this.cacheKey = key;
    }
    return this.cached;
  }
  answer(choice: number): Feedback | null {
    const question = this.question;
    if (!question) return null;
    const s = this.state;
    const correct = choice === question.correct;
    s.answered++;
    this.pin = null;
    let next: Feedback["next"] = { stage: s.stage, level: s.level };
    if (correct) {
      s.correct++;
      next = nextLevel(s.stage, s.level);
      s.attempt = 0;
      if (next) {
        s.stage = next.stage;
        s.level = next.level;
      } else s.won = true;
    } else s.attempt++;
    next = next && { stage: s.stage, level: s.level };
    return { correct, answer: question.choices[question.correct], next };
  }
  rideFree() {
    if (this.state.won) this.state.freeRide = true;
  }
}

export type RunOptions = {
  sandbox: boolean;
  start: { stage: number; level: number } | null;
  pin: number | null;
};

export function runOptions(search: string, dev: boolean): RunOptions {
  const params = new URLSearchParams(search);
  let start: RunOptions["start"] = null;
  let pin: number | null = null;
  if (dev) {
    const pinned = parseQuestionId(params.get("question") ?? "");
    const stage = Number(params.get("stage"));
    const level = Number(params.get("level") ?? 1);
    if (pinned) {
      start = { stage: pinned.stage, level: pinned.level };
      pin = pinned.seed;
    } else if (
      stageOf(stage) &&
      Number.isInteger(level) &&
      level >= 1 &&
      level <= 10
    )
      start = { stage, level };
  }
  const qa = params.get("qa") === "1" && params.get("save") !== "1";
  return { sandbox: !!start || qa, start, pin };
}

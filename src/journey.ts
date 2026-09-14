import { mix } from "./questions/kit.ts";
import type { Multiplier } from "./lights.ts";
import { answerStake, quickBonus, wrongPenalty } from "./scoring.ts";
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
  score: number;
  multiplier: Multiplier;
  answerMs: number;
  won: boolean;
  freeRide: boolean;
  landings: number;
};

export type Feedback = {
  correct: boolean;
  answer: string;
  points: number;
  quickBonus: number;
  multiplier: Multiplier;
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
    score: 0,
    multiplier: 1,
    answerMs: 0,
    won: false,
    freeRide: false,
    landings: 0,
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
  arm(multiplier: Multiplier) {
    if (this.active && multiplier > this.state.multiplier)
      this.state.multiplier = multiplier;
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
  answer(choice: number, elapsedMs: number): Feedback | null {
    const question = this.question;
    if (!question) return null;
    const s = this.state;
    const correct = choice === question.correct;
    const multiplier = s.multiplier;
    const stake = answerStake(question.level, multiplier);
    const bonus = correct ? quickBonus(stake, question.stage, elapsedMs) : 0;
    const loss = wrongPenalty(stake, s.score);
    const points = correct ? stake + bonus : loss ? -loss : 0;
    s.score += points;
    s.multiplier = 1;
    s.answerMs = 0;
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
    return {
      correct,
      answer: question.choices[question.correct],
      next,
      points,
      quickBonus: bonus,
      multiplier,
    };
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

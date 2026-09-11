import { random } from "../model.ts";
import {
  CapError,
  SeededRng,
  mix,
  type Choice,
  type Draft,
  type Stage,
} from "./kit.ts";
import * as s01 from "./s01-addition-subtraction.ts";
import * as s02 from "./s02-multiplication-division.ts";
import * as s03 from "./s03-number-patterns.ts";
import * as s04 from "./s04-place-value-rounding.ts";
import * as s05 from "./s05-factors-multiples-primes.ts";
import * as s06 from "./s06-fractions.ts";
import * as s07 from "./s07-decimals-percentages.ts";
import * as s08 from "./s08-measurement-time-money.ts";
import * as s09 from "./s09-ratios-rates-proportions.ts";
import * as s10 from "./s10-negative-numbers-order-of-operations.ts";
import * as s11 from "./s11-exponents-roots.ts";
import * as s12 from "./s12-pre-algebra.ts";
import * as s15 from "./s15-coordinate-geometry.ts";
import * as s21 from "./s21-calculus.ts";

export const CURRICULUM: readonly (readonly [number, Stage])[] = [
  [1, s01],
  [2, s02],
  [3, s03],
  [4, s04],
  [5, s05],
  [6, s06],
  [7, s07],
  [8, s08],
  [9, s09],
  [10, s10],
  [11, s11],
  [12, s12],
  [15, s15],
  [21, s21],
];

export type Question = {
  id: string;
  stage: number;
  level: number;
  prompt: string;
  figure?: string;
  choices: string[];
  correct: number;
  reseeds: number;
};

export const stageOf = (stage: number) =>
  CURRICULUM.find(([number]) => number === stage)?.[1];

const pad = (n: number) => String(n).padStart(2, "0");
export const questionId = (stage: number, level: number, seed: number) =>
  `${pad(stage)}-${pad(level)}-${(seed >>> 0).toString(16).padStart(8, "0")}`;

export function parseQuestionId(id: string) {
  const match = /^(\d{2})-(\d{2})-([0-9a-f]{8})$/.exec(id);
  if (!match) return null;
  const stage = Number(match[1]);
  const level = Number(match[2]);
  if (!stageOf(stage) || level < 1 || level > 10) return null;
  return { stage, level, seed: parseInt(match[3], 16) };
}

const distinct = (choices: readonly Choice[]) =>
  new Set(choices.map((c) => c.text)).size === choices.length &&
  new Set(choices.map((c) => c.key)).size === choices.length;

export function makeQuestion(
  stage: number,
  level: number,
  seed: number,
): Question {
  const found = stageOf(stage)?.levels[level - 1];
  if (!found) throw new RangeError(`no stage ${stage} level ${level}`);
  for (let reseeds = 0; reseeds < 50; reseeds++) {
    const draw = reseeds ? mix(seed, reseeds) : seed >>> 0;
    let draft: Draft;
    try {
      draft = found.make(new SeededRng(draw));
    } catch (error) {
      if (error instanceof CapError) continue;
      throw error;
    }
    const three = [draft.answer, ...draft.wrong];
    if (!distinct(three)) continue;
    const next = random(draw ^ 0x2c9277b5);
    const order = [0, 1, 2];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      id: questionId(stage, level, seed),
      stage,
      level,
      prompt: draft.prompt,
      figure: draft.figure,
      choices: order.map((i) => three[i].text),
      correct: order.indexOf(0),
      reseeds,
    };
  }
  throw new Error(`no valid question for ${questionId(stage, level, seed)}`);
}

export function nextLevel(stage: number, level: number) {
  if (level < 10) return { stage, level: level + 1 };
  const index = CURRICULUM.findIndex(([number]) => number === stage);
  const next = CURRICULUM[index + 1];
  return next ? { stage: next[0], level: 1 } : null;
}

export const MAX_ANSWER_MS = 35_000;
const READING_MS = 2_000;

export const bonusWindowMs = (stage: number) =>
  stage <= 5 ? 15_000 : stage <= 12 ? 25_000 : MAX_ANSWER_MS;

export const answerStake = (level: number, multiplier: number) =>
  100 * level * multiplier;

export function quickFraction(stage: number, elapsedMs: number) {
  return Math.max(
    0,
    Math.min(
      1,
      (bonusWindowMs(stage) - elapsedMs) / (bonusWindowMs(stage) - READING_MS),
    ),
  );
}

export const quickBonus = (stake: number, stage: number, elapsedMs: number) =>
  Math.round(stake * 0.5 * quickFraction(stage, elapsedMs));

export const wrongPenalty = (stake: number, score: number) =>
  Math.min(score, stake * 0.75);

// The clock runs through a provisional selection. Only that selection's bonus
// is frozen, so cancelling it cannot turn the journey to an exit into thinking
// time for a different answer. Pauses and completed entries stop the clock.
export class AnswerClock {
  private spent: number;
  private since: number | null = null;
  private selection: { choice: number; elapsedMs: number } | null = null;
  private now: () => number;

  constructor(elapsedMs = 0, now = () => performance.now()) {
    this.spent = elapsedMs;
    this.now = now;
  }

  get running() {
    return this.since !== null;
  }

  get elapsedMs() {
    return Math.min(
      MAX_ANSWER_MS,
      this.spent +
        (this.since === null ? 0 : Math.max(0, this.now() - this.since)),
    );
  }

  start() {
    if (this.since === null) this.since = this.now();
  }

  pause() {
    this.spent = this.elapsedMs;
    this.since = null;
  }

  select(choice: number | null) {
    if (choice === this.selection?.choice) return;
    this.selection =
      choice === null ? null : { choice, elapsedMs: this.elapsedMs };
  }

  responseMs(exit: number) {
    return this.selection?.choice === exit
      ? this.selection.elapsedMs
      : this.elapsedMs;
  }
}

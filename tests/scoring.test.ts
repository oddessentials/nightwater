import test from "node:test";
import assert from "node:assert/strict";
import {
  AnswerClock,
  answerStake,
  bonusWindowMs,
  quickBonus,
  wrongPenalty,
} from "../src/scoring.ts";

test("a reading allowance leads into a smooth bonus, with full base points after expiry", () => {
  for (const [stage, end] of [
    [1, 15000],
    [5, 15000],
    [6, 25000],
    [12, 25000],
    [13, 35000],
    [21, 35000],
  ]) {
    assert.equal(bonusWindowMs(stage), end);
    for (const multiplier of [1, 2, 5, 10]) {
      const stake = answerStake(5, multiplier);
      assert.equal(quickBonus(stake, stage, 0), stake / 2);
      assert.equal(quickBonus(stake, stage, 2000), stake / 2);
      assert.equal(quickBonus(stake, stage, (2000 + end) / 2), stake / 4);
      assert.equal(quickBonus(stake, stage, end), 0);
      assert.equal(quickBonus(stake, stage, end + 10000), 0);
      let previous = stake / 2;
      for (let time = 0; time <= end; time += 137) {
        const bonus = quickBonus(stake, stage, time);
        assert.ok(Number.isInteger(bonus) && bonus >= 0 && bonus <= previous);
        previous = bonus;
      }
      assert.equal(wrongPenalty(stake, 100_000), stake * 0.75);
      assert.equal(stake * 1.5 - 2 * wrongPenalty(stake, 100_000), 0);
      assert.equal(wrongPenalty(stake, 30), 30);
      assert.equal(wrongPenalty(stake, 0), 0);
    }
  }
});

test("a choice retains its decision time through travel and duplicate input", () => {
  let now = 0;
  const clock = new AnswerClock(0, () => now);
  now = 50_000; // Loading and the feeder ride do not count.
  assert.equal(clock.elapsedMs, 0);
  clock.start();
  now += 5000;
  clock.select(1);
  now += 2000;
  clock.select(1);
  now += 1800;
  clock.pause();
  assert.equal(clock.responseMs(1), 5000);
  assert.equal(clock.elapsedMs, 8800);
  now += 550; // Entry animation does not count for a manually entered exit either.
  assert.equal(clock.responseMs(0), 8800);
});

test("switching or cancelling a choice cannot retain an earlier bonus", () => {
  let now = 0;
  const clock = new AnswerClock(0, () => now);
  clock.start();
  now = 2000;
  clock.select(0);
  now = 4000;
  clock.select(1);
  assert.equal(clock.responseMs(1), 4000);
  now = 6000;
  clock.select(null);
  assert.equal(clock.responseMs(1), 6000);
  now = 8500;
  clock.select(0);
  assert.equal(clock.responseMs(0), 8500);
});

test("pauses and reloads retain elapsed time without retaining cancelled travel", () => {
  let now = 0;
  const clock = new AnswerClock(0, () => now);
  clock.start();
  now = 5000;
  clock.select(2);
  now = 6000;
  clock.pause();
  now = 600_000;
  clock.pause();
  assert.equal(clock.elapsedMs, 6000);
  clock.start();
  now += 1000;
  clock.start(); // Repeated renders must not reset the origin.
  assert.equal(clock.elapsedMs, 7000);
  assert.equal(clock.responseMs(2), 5000);
  const restored = new AnswerClock(Math.ceil(clock.elapsedMs), () => now);
  now += 30_000;
  assert.equal(restored.elapsedMs, 7000);
  assert.equal(restored.responseMs(2), 7000);
  restored.start();
  now += 1500;
  assert.equal(restored.elapsedMs, 8500);
});

test("elapsed time does not depend on frame frequency or simulation catch-up limits", () => {
  for (const hz of [5, 30, 60, 120]) {
    let now = 0;
    const clock = new AnswerClock(0, () => now);
    clock.start();
    for (let frame = 1; frame <= hz * 9; frame++) {
      now = (frame * 1000) / hz;
      void clock.elapsedMs;
    }
    assert.equal(clock.elapsedMs, 9000);
    now = 100_000;
    assert.equal(clock.elapsedMs, 35_000);
  }
});

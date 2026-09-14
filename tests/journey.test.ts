import test from "node:test";
import assert from "node:assert/strict";
import { Journey, newJourney, runOptions } from "../src/journey.ts";
import {
  clearJourney,
  loadJourney,
  saveJourney,
  type Store,
} from "../src/save.ts";
import {
  CURRICULUM,
  makeQuestion,
  parseQuestionId,
  questionId,
} from "../src/questions/index.ts";

class MemoryStore implements Store {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

test("correct answers climb every level, roll into the next stage and win at the end", () => {
  const journey = new Journey(newJourney(4242));
  let last = null;
  for (const [stage] of CURRICULUM)
    for (let level = 1; level <= 10; level++) {
      const q = journey.question!;
      assert.equal(q.stage, stage);
      assert.equal(q.level, level);
      last = journey.answer(q.correct, 35_000)!;
      assert.equal(last.correct, true);
      assert.equal(last.answer, q.choices[q.correct]);
    }
  assert.equal(last!.next, null);
  assert.equal(journey.state.won, true);
  assert.equal(journey.question, null);
  assert.equal(journey.answer(0, 0), null);
  assert.equal(journey.state.answered, CURRICULUM.length * 10);
  assert.equal(journey.state.correct, CURRICULUM.length * 10);
});

test("a wrong answer keeps the level and draws a fresh question", () => {
  const journey = new Journey(newJourney(99));
  const first = journey.question!;
  const feedback = journey.answer((first.correct + 1) % 3, 0)!;
  assert.equal(feedback.correct, false);
  assert.equal(feedback.answer, first.choices[first.correct]);
  assert.deepEqual(feedback.next, { stage: first.stage, level: first.level });
  assert.equal(journey.state.attempt, 1);
  const second = journey.question!;
  assert.equal(second.level, first.level);
  assert.notEqual(second.id, first.id);
  journey.answer(second.correct, 35_000);
  assert.equal(journey.state.level, 2);
  assert.equal(journey.state.attempt, 0);
  assert.equal(journey.state.answered, 2);
  assert.equal(journey.state.correct, 1);
});

test("the same state shows the same pending question after a reload", () => {
  const journey = new Journey(newJourney(7));
  journey.answer(journey.question!.correct, 35_000);
  journey.answer((journey.question!.correct + 2) % 3, 0);
  const restored = new Journey(JSON.parse(JSON.stringify(journey.state)));
  assert.deepEqual(restored.question, journey.question);
});

test("free ride follows a win and asks nothing", () => {
  const last = CURRICULUM[CURRICULUM.length - 1][0];
  const journey = new Journey(newJourney(5, last, 10));
  journey.rideFree();
  assert.equal(journey.state.freeRide, false);
  const feedback = journey.answer(journey.question!.correct, 0)!;
  assert.equal(feedback.next, null);
  assert.equal(journey.state.won, true);
  journey.rideFree();
  assert.equal(journey.state.freeRide, true);
  assert.equal(journey.question, null);
});

test("saves round-trip, and bad saves start fresh", () => {
  const store = new MemoryStore();
  assert.equal(loadJourney(store), null);
  const journey = new Journey(newJourney(12345));
  journey.answer(journey.question!.correct, 35_000);
  saveJourney(journey.state, store);
  assert.deepEqual(loadJourney(store), journey.state);
  for (const bad of [
    "{",
    "null",
    "[]",
    '{"v":2}',
    JSON.stringify({ ...journey.state, level: 11 }),
    JSON.stringify({ ...journey.state, stage: 99 }),
    JSON.stringify({ ...journey.state, correct: 5, answered: 1 }),
    JSON.stringify({ ...journey.state, freeRide: true }),
    JSON.stringify({ ...journey.state, seed: -1 }),
  ]) {
    store.setItem("nightwater.journey", bad);
    assert.equal(loadJourney(store), null, bad);
  }
  clearJourney(store);
  assert.equal(store.data.size, 0);
  const blocked: Store = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("full");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(loadJourney(blocked), null);
  assert.doesNotThrow(() => saveJourney(journey.state, blocked));
  assert.doesNotThrow(() => clearJourney(blocked));
});

test("dev and QA runs are sandboxed, and a question id reproduces its question", () => {
  assert.deepEqual(runOptions("", true), {
    sandbox: false,
    start: null,
    pin: null,
  });
  assert.equal(runOptions("?qa=1", false).sandbox, true);
  assert.equal(runOptions("?qa=1&save=1", false).sandbox, false);
  assert.deepEqual(runOptions("?stage=1&level=8", true), {
    sandbox: true,
    start: { stage: 1, level: 8 },
    pin: null,
  });
  assert.deepEqual(runOptions("?stage=1&level=8", false), {
    sandbox: false,
    start: null,
    pin: null,
  });
  assert.equal(runOptions("?stage=1&level=11", true).start, null);
  const options = runOptions("?question=01-08-7f3a91c2", true);
  assert.deepEqual(options, {
    sandbox: true,
    start: { stage: 1, level: 8 },
    pin: 0x7f3a91c2,
  });
  const journey = new Journey(newJourney(1, 1, 8), options.pin);
  assert.equal(journey.question!.id, "01-08-7f3a91c2");
  assert.deepEqual(journey.question, makeQuestion(1, 8, 0x7f3a91c2));
  assert.deepEqual(parseQuestionId(questionId(1, 3, 0xdeadbeef)), {
    stage: 1,
    level: 3,
    seed: 0xdeadbeef,
  });
  assert.equal(parseQuestionId("01-11-00000000"), null);
});

test("points use the answered level, keep the highest catch, and consume bonuses on either outcome", () => {
  const journey = new Journey(newJourney(123, 1, 10));
  journey.arm(5);
  journey.arm(2);
  const result = journey.answer(journey.question!.correct, 35_000)!;
  assert.equal(result.points, 5000);
  assert.equal(result.multiplier, 5);
  assert.equal(journey.state.score, 5000);
  assert.equal(journey.state.stage, 2);
  assert.equal(journey.state.level, 1);
  assert.equal(journey.state.multiplier, 1);
  journey.arm(10);
  const miss = journey.answer((journey.question!.correct + 1) % 3, 0)!;
  assert.equal(miss.points, -750);
  assert.equal(journey.state.score, 4250);
  assert.equal(journey.state.multiplier, 1);
  assert.equal(journey.answer(journey.question!.correct, 35_000)!.points, 100);
  assert.equal(journey.state.score, 4350);
});

test("old saves migrate, armed stakes survive reload, and invalid scoring fields are rejected", () => {
  const store = new MemoryStore();
  const old = JSON.parse(JSON.stringify(newJourney(12)));
  delete old.score;
  delete old.multiplier;
  delete old.answerMs;
  store.setItem("nightwater.journey", JSON.stringify(old));
  const journey = new Journey(loadJourney(store)!);
  assert.equal(journey.state.score, 0);
  assert.equal(journey.state.multiplier, 1);
  assert.equal(journey.state.answerMs, 0);
  journey.arm(10);
  journey.state.answerMs = 8_500;
  saveJourney(journey.state, store);
  const resumed = new Journey(loadJourney(store)!);
  resumed.arm(2);
  assert.deepEqual(resumed.question, journey.question);
  assert.equal(resumed.state.multiplier, 10);
  assert.equal(resumed.state.answerMs, 8_500);
  assert.equal(
    resumed.answer(resumed.question!.correct, resumed.state.answerMs)!.points,
    1250,
  );
  assert.equal(resumed.state.answerMs, 0);
  for (const patch of [
    { score: -1 },
    { score: 0.5 },
    { score: "100" },
    { score: null },
    { multiplier: 3 },
    { multiplier: "10" },
    { multiplier: null },
    { answerMs: -1 },
    { answerMs: 35_001 },
    { answerMs: 1.5 },
    { answerMs: "1000" },
    { answerMs: null },
  ]) {
    store.setItem(
      "nightwater.journey",
      JSON.stringify({ ...journey.state, ...patch }),
    );
    assert.equal(loadJourney(store), null);
  }
});

test("the last answer earns points, free riding cannot arm them, and a restart clears them", () => {
  const journey = new Journey(newJourney(45, 21, 10));
  journey.arm(10);
  assert.equal(journey.answer(journey.question!.correct, 0)!.points, 15000);
  journey.arm(5);
  assert.equal(journey.state.multiplier, 1);
  journey.rideFree();
  journey.arm(10);
  assert.equal(journey.answer(0, 0), null);
  assert.equal(journey.state.score, 15000);
  assert.equal(journey.state.multiplier, 1);
  const restart = newJourney(46);
  assert.equal(restart.score, 0);
  assert.equal(restart.multiplier, 1);
  assert.equal(restart.answerMs, 0);
});

test("quick answers use the answered stage's window and mistakes report the actual deduction", () => {
  const journey = new Journey(newJourney(123, 5, 10));
  journey.arm(2);
  journey.state.answerMs = 8500;
  const result = journey.answer(journey.question!.correct, 8500)!;
  assert.equal(result.points, 2500);
  assert.equal(result.quickBonus, 500);
  assert.equal(journey.state.stage, 6);
  assert.equal(journey.state.answerMs, 0);
  journey.arm(10);
  const next = journey.answer(journey.question!.correct, 8500)!;
  assert.equal(next.points, 1359);
  assert.equal(next.quickBonus, 359);
  journey.state.score = 90;
  journey.arm(10);
  const miss = journey.answer((journey.question!.correct + 1) % 3, 0)!;
  assert.equal(miss.points, -90);
  assert.equal(miss.quickBonus, 0);
  assert.equal(journey.state.score, 0);
  assert.equal(
    journey.answer((journey.question!.correct + 1) % 3, 0)!.points,
    0,
  );
  assert.equal(journey.state.score, 0);
});

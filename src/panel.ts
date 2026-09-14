import type { Question } from "./questions/index.ts";
import type { Feedback, JourneyState } from "./journey.ts";
import { LIGHT_STYLES, type RideLight } from "./lights.ts";
import { glue, runs } from "./mathtext.ts";
import {
  answerStake,
  quickBonus,
  quickFraction,
  wrongPenalty,
} from "./scoring.ts";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const pad = (n: number) => String(n).padStart(2, "0");
const ROUTES = ["Tideline", "Afterglow", "Undertow"];
const OPEN_WATER = "Three lights. Your next descent.";
const SMALLEST_PROMPT = 14;
const SMALLEST_ANSWER = 12;
let resetQuestionScroll = false;
let feedbackTime = 0;
const animations = new Map<
  HTMLElement,
  { animation: Animation; start: number; duration: number }
>();

// Run one-shot UI events on ride time so pausing and manual QA frames also freeze them.
export function tickFeedback(time: number) {
  feedbackTime = time;
  for (const [element, event] of animations) {
    const elapsed = (time - event.start) * 1000;
    if (elapsed >= event.duration) {
      event.animation.cancel();
      animations.delete(element);
    } else event.animation.currentTime = Math.max(0, elapsed);
  }
}

export function clearFeedback() {
  for (const { animation } of animations.values()) animation.cancel();
  animations.clear();
}

function animateFeedback(
  element: HTMLElement,
  frames: Keyframe[],
  duration: number,
) {
  animations.get(element)?.animation.cancel();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    frames = frames.map((frame) => ({ ...frame, transform: "none" }));
  const animation = element.animate(frames, {
    duration,
    easing: "ease-out",
    fill: "both",
  });
  animation.pause();
  animation.currentTime = 0;
  animations.set(element, { animation, start: feedbackTime, duration });
}

const tierColor = (multiplier: number) =>
  multiplier === 1
    ? "#d3e6e3"
    : LIGHT_STYLES[multiplier as RideLight["tier"]].color;

export const levelLabel = (stage: number, level: number) =>
  `STAGE ${pad(stage)} · LEVEL ${pad(level)}`;

function write(el: HTMLElement, text: string, breaks = false) {
  el.replaceChildren(
    ...runs(glue(text, breaks)).map((run) => {
      if (!run.raised) return run.text;
      const sup = document.createElement("sup");
      sup.textContent = run.text;
      return sup;
    }),
  );
}

const overflows = (el: HTMLElement) => el.scrollWidth > el.clientWidth + 1;

function shrink(el: HTMLElement, smallest: number) {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (overflows(el) && size > smallest) {
    size = Math.max(smallest, size - 1);
    el.style.fontSize = `${size}px`;
  }
}

export function showQuestion(question: Question | null) {
  resetQuestionScroll = true;
  $("#choices").classList.toggle("math", !!question);
  const prompt = $("#prompt");
  prompt.style.fontSize = "";
  if (question) {
    prompt.dataset.math = question.prompt;
    write(prompt, question.prompt);
  } else {
    delete prompt.dataset.math;
    prompt.textContent = OPEN_WATER;
  }
  const figure = $("#figure");
  figure.replaceChildren();
  figure.hidden = !question?.figure;
  figure.classList.toggle("labelled", !!question?.figure?.includes("<text"));
  if (question?.figure)
    figure.append(
      document.importNode(
        new DOMParser().parseFromString(question.figure, "image/svg+xml")
          .documentElement,
        true,
      ),
    );
  document
    .querySelectorAll<HTMLElement>("[data-exit] .answer")
    .forEach((span, i) => {
      const text = question ? question.choices[i] : ROUTES[i];
      span.style.fontSize = "";
      span.style.overflowWrap = "";
      if (question) {
        span.dataset.math = text;
        write(span, text);
      } else {
        delete span.dataset.math;
        span.textContent = text;
      }
      span.classList.toggle("long", !!question && text.length > 12);
      span.classList.toggle("longer", !!question && text.length > 22);
    });
  fitPanel();
}

export function fitPanel() {
  const prompt = $("#prompt");
  if (resetQuestionScroll && prompt.clientWidth) {
    $(".question").scrollTop = 0;
    resetQuestionScroll = false;
  }
  const asked = prompt.dataset.math;
  if (asked && prompt.clientWidth) {
    prompt.style.fontSize = "";
    write(prompt, asked);
    shrink(prompt, SMALLEST_PROMPT);
  }
  document
    .querySelectorAll<HTMLElement>("[data-exit] .answer")
    .forEach((span) => {
      const text = span.dataset.math;
      if (!text || !span.clientWidth) return;
      span.style.fontSize = "";
      span.style.overflowWrap = "";
      write(span, text);
      shrink(span, SMALLEST_ANSWER);
      if (!overflows(span)) return;
      write(span, text, true);
      if (overflows(span)) span.style.overflowWrap = "anywhere";
    });
}

export function feedbackText(feedback: Feedback) {
  if (!feedback.correct)
    return `Incorrect · ${feedback.points < 0 ? `−${points(-feedback.points)}` : "0 points"} · The answer was ${feedback.answer}.`;
  const reward = `Correct · +${points(feedback.points)}${feedback.quickBonus ? ` · Quick answer +${points(feedback.quickBonus)}` : ` (×${feedback.multiplier})`}`;
  if (!feedback.next) return `${reward} · Every level cleared.`;
  return feedback.next.level === 1
    ? `${reward} · Stage ${feedback.next.stage} next.`
    : `${reward} · Level ${feedback.next.level} next.`;
}

const points = (value: number) => value.toLocaleString("en-US");

export function showPoints(
  state: JourneyState,
  multiplier: number,
  active: boolean,
) {
  $("#score").textContent = `${points(state.score)} PTS`;
  $("#stake").hidden = !active;
  const stake = $("#answer-stake");
  const tier = document.createElement("span");
  tier.textContent = `×${state.multiplier}`;
  tier.style.color = tierColor(state.multiplier);
  stake.replaceChildren(
    ...(active
      ? [`${points(answerStake(state.level, state.multiplier))} PTS · `, tier]
      : []),
  );
  const loss = wrongPenalty(
    answerStake(state.level, state.multiplier),
    state.score,
  );
  $("#wrong-cost").textContent = loss
    ? `Wrong −${points(loss)}`
    : "Wrong 0 PTS";
  const style =
    multiplier === 1 ? null : LIGHT_STYLES[multiplier as RideLight["tier"]];
  const bonus = $("#ride-bonus");
  bonus.dataset.tier = String(multiplier);
  bonus.style.setProperty("--bonus-color", style?.color ?? "#d3e6e3");
  $("#bonus-label").textContent = active ? "NEXT ANSWER" : "THIS RIDE";
  $("#bonus-value").textContent = `×${multiplier}`;
  $("#bonus-name").textContent = style
    ? `${style.name.toUpperCase()} POWER`
    : "CATCH THE LIGHTS";
  $("#bonus-stake").textContent = active
    ? `${points(answerStake(state.level, multiplier))} points + quick answer bonus`
    : "Your best catch · keep riding";
  document
    .querySelectorAll<HTMLElement>("[data-bonus-tier]")
    .forEach((tier) => {
      tier.classList.toggle(
        "active",
        Number(tier.dataset.bonusTier) === multiplier,
      );
    });
}

export function showQuickBonus(state: JourneyState, elapsedMs: number) {
  const bonus = quickBonus(
    answerStake(state.level, state.multiplier),
    state.stage,
    elapsedMs,
  );
  const amount = $("#quick-points");
  const text = `+${points(bonus)}`;
  if (amount.textContent !== text) amount.textContent = text;
  $("#quick-meter").style.transform =
    `scaleX(${quickFraction(state.stage, elapsedMs)})`;
  $("#quick-answer").classList.toggle("spent", bonus === 0);
}

export function showAnswerReward(feedback: Feedback) {
  const color = feedback.correct ? tierColor(feedback.multiplier) : "#ebbdaf";
  animateFeedback(
    $("#score"),
    feedback.correct
      ? [
          { transform: "scale(1)", color: "#deebda" },
          { transform: "scale(1.16)", color, offset: 0.25 },
          { transform: "scale(1)", color: "#deebda" },
        ]
      : [
          { transform: "translateX(0)", color },
          { transform: "translateX(-4px)", color, offset: 0.2 },
          { transform: "translateX(3px)", color, offset: 0.4 },
          { transform: "translateX(-2px)", color, offset: 0.65 },
          { transform: "translateX(0)", color: "#deebda" },
        ],
    feedback.correct ? 500 : 360,
  );
  const delta = $("#score-delta");
  delta.textContent = `${feedback.points < 0 ? "−" : feedback.points > 0 ? "+" : ""}${points(Math.abs(feedback.points))}`;
  delta.style.color = color;
  animateFeedback(
    delta,
    [
      { opacity: 0, transform: "translateY(5px)" },
      { opacity: 1, transform: "translateY(0)", offset: 0.12 },
      { opacity: 1, transform: "translateY(0)", offset: 0.72 },
      { opacity: 0, transform: "translateY(-8px)" },
    ],
    1500,
  );
}

export function showArmedStake(multiplier: number) {
  animateFeedback(
    $("#answer-stake"),
    [
      { transform: "scale(1)", color: tierColor(multiplier) },
      { transform: "scale(1.12)", color: tierColor(multiplier), offset: 0.3 },
      { transform: "scale(1)", color: "#f3d59f" },
    ],
    600,
  );
}

export function pulseCatch(tier: RideLight["tier"]) {
  animateFeedback(
    $(`[data-bonus-tier="${tier}"]`),
    [
      { transform: "scale(1)", opacity: 1, color: tierColor(tier) },
      {
        transform: "scale(1.16)",
        opacity: 1,
        color: tierColor(tier),
        offset: 0.35,
      },
      { transform: "scale(1)" },
    ],
    180,
  );
}

export function showCatch(
  tier: RideLight["tier"],
  best: number,
  upgrade: boolean,
) {
  const toast = $("#catch-toast");
  const title = document.createElement("strong");
  title.textContent = upgrade
    ? best === 10
      ? "STAR POWER!"
      : "BONUS UPGRADED!"
    : `${LIGHT_STYLES[tier].name.toUpperCase()} CAUGHT`;
  const detail = document.createElement("span");
  detail.textContent = upgrade
    ? `×${best} is active${best === 10 ? " · MAX MULTIPLIER" : ""}`
    : `×${best} stays active`;
  toast.replaceChildren(title, detail);
  toast.hidden = false;
  toast.style.setProperty(
    "--bonus-color",
    LIGHT_STYLES[best as RideLight["tier"]].color,
  );
  animateFeedback(
    toast,
    [
      { opacity: 0, transform: "translateY(-6px) scale(.96)" },
      { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.1 },
      { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.72 },
      { opacity: 0, transform: "translateY(-4px) scale(.98)" },
    ],
    1800,
  );
  if (upgrade)
    animateFeedback(
      $("#bonus-value"),
      [
        { transform: "scale(1)" },
        { transform: "scale(1.28)", offset: 0.3 },
        { transform: "scale(1)" },
      ],
      480,
    );
}

export function showCaption(text: string) {
  write($("#ride-caption"), text);
}

export function showLocation(text: string) {
  $("#location").textContent = text;
}

export function showTitle(returning: boolean) {
  const start = $<HTMLButtonElement>("#start");
  start.disabled = false;
  start.firstElementChild!.textContent = returning
    ? "Continue"
    : "Enter the current";
  $("#restart").hidden = !returning;
}

let disarm = 0;
export function armRestart() {
  const button = $("#restart");
  clearTimeout(disarm);
  if (button.dataset.armed) {
    delete button.dataset.armed;
    button.textContent = "Start over";
    return false;
  }
  button.dataset.armed = "true";
  button.textContent = "Tap again to start over";
  disarm = window.setTimeout(() => {
    delete button.dataset.armed;
    button.textContent = "Start over";
  }, 4000);
  return true;
}

export function showWin(state: JourneyState) {
  $("#win-stats").textContent =
    `${points(state.score)} points · ${state.answered} ${state.answered === 1 ? "answer" : "answers"} given · ${state.correct} correct`;
  $("#win").hidden = false;
}

export function hideWin() {
  $("#win").hidden = true;
}

export function showQuestionId(id: string | null) {
  $("#question-id").textContent = id ? `Question ${id}` : "";
}

export function clearTouchPad() {
  const choices = $("#choices");
  document.documentElement.style.setProperty(
    "--panel-clear",
    choices.hidden
      ? ""
      : `${innerHeight - choices.getBoundingClientRect().top + 16}px`,
  );
}

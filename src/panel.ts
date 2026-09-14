import type { Question } from "./questions/index.ts";
import type { Feedback, JourneyState } from "./journey.ts";
import { glue, runs } from "./mathtext.ts";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const pad = (n: number) => String(n).padStart(2, "0");
const ROUTES = ["Tideline", "Afterglow", "Undertow"];
const OPEN_WATER = "Three lights. Your next descent.";
const SMALLEST_PROMPT = 14;
const SMALLEST_ANSWER = 12;

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
  if (!feedback.correct) return `Not this time — it was ${feedback.answer}.`;
  const reward = `Correct — +${points(feedback.points)} (×${feedback.multiplier})`;
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
  $("#score").textContent =
    `${points(state.score)} PTS${active ? ` · NEXT ×${multiplier}` : ""}`;
  $("#stake").hidden = !active;
  $("#stake").textContent = active
    ? `${points(100 * state.level * state.multiplier)} points riding on this answer · ×${state.multiplier}`
    : "";
}

export function showCatch(tier: number) {
  $("#catch-toast").textContent =
    `×${tier} ${tier === 10 ? "STAR" : tier === 5 ? "LANTERN" : "EMBER"}`;
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

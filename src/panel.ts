import type { Question } from "./questions/index.ts";
import type { Feedback, JourneyState } from "./journey.ts";

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const pad = (n: number) => String(n).padStart(2, "0");
const ROUTES = ["Tideline", "Afterglow", "Undertow"];
const OPEN_WATER = "Three lights. Your next descent.";

export const levelLabel = (stage: number, level: number) =>
  `STAGE ${pad(stage)} · LEVEL ${pad(level)}`;

const glued = (text: string) =>
  text
    .replace(/\b(sin|cos|tan|ln|log[₀-₉]*) /g, "$1\u00a0")
    .replace(/(\d) (\d+\/\d+)/g, "$1\u00a0$2");

export function showQuestion(question: Question | null) {
  $("#choices").classList.toggle("math", !!question);
  $("#prompt").textContent = question ? glued(question.prompt) : OPEN_WATER;
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
      span.textContent = question ? glued(text) : text;
      span.classList.toggle("long", !!question && text.length > 12);
      span.classList.toggle("longer", !!question && text.length > 22);
    });
}

export function feedbackText(feedback: Feedback) {
  if (!feedback.correct) return `Not this time — it was ${feedback.answer}.`;
  if (!feedback.next) return "Correct — every level is cleared.";
  return feedback.next.level === 1
    ? `Correct — Stage ${feedback.next.stage} next.`
    : `Correct — Level ${feedback.next.level} next.`;
}

export function showCaption(text: string) {
  $("#ride-caption").textContent = text;
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
    `${state.answered} ${state.answered === 1 ? "answer" : "answers"} given · ${state.correct} correct`;
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

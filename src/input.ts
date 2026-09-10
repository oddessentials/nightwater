import { idleControls, type Controls } from "./model.ts";

export class Input {
  keys = new Set<string>();
  lookX = 0;
  lookY = 0;
  touchX = 0;
  touchY = 0;
  private abort = new AbortController();
  private drag: { id: number; x: number; y: number; distance: number } | null =
    null;
  canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement, onKey: (key: string) => void) {
    this.canvas = canvas;
    const signal = this.abort.signal;
    window.addEventListener(
      "keydown",
      (e) => {
        if (
          e.target instanceof HTMLSelectElement ||
          e.target instanceof HTMLInputElement
        )
          return;
        if (
          ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
            e.code,
          )
        )
          e.preventDefault();
        this.keys.add(e.code);
        if (!e.repeat) onKey(e.code);
      },
      { signal },
    );
    window.addEventListener("keyup", (e) => this.keys.delete(e.code), {
      signal,
    });
    window.addEventListener("blur", () => this.clear(), { signal });
    document.addEventListener(
      "mousemove",
      (e) => {
        if (document.pointerLockElement === canvas) {
          this.lookX += e.movementX * 0.0022;
          this.lookY += e.movementY * 0.0022;
        }
      },
      { signal },
    );
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        if (document.pointerLockElement === canvas) return;
        this.drag = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          distance: 0,
        };
        canvas.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    canvas.addEventListener(
      "pointermove",
      (e) => {
        if (!this.drag || this.drag.id !== e.pointerId) return;
        const dx = e.clientX - this.drag.x,
          dy = e.clientY - this.drag.y;
        this.drag.distance += Math.abs(dx) + Math.abs(dy);
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
        const sens = e.pointerType === "touch" ? 0.004 : 0.003;
        this.lookX += dx * sens;
        this.lookY += dy * sens;
      },
      { signal },
    );
    const release = (e: PointerEvent) => {
      if (!this.drag) return;
      if (this.drag.distance < 4 && e.pointerType === "mouse")
        void canvas.requestPointerLock()?.catch(() => {});
      this.drag = null;
    };
    canvas.addEventListener("pointerup", release, { signal });
    canvas.addEventListener(
      "pointercancel",
      () => {
        this.drag = null;
      },
      { signal },
    );
    const pad = document.querySelector<HTMLDivElement>("#touch-pad")!;
    const puck = pad.firstElementChild as HTMLDivElement;
    const move = (e: PointerEvent) => {
      const rect = pad.getBoundingClientRect();
      let x = (e.clientX - rect.left - rect.width / 2) / 32,
        y = (e.clientY - rect.top - rect.height / 2) / 32;
      const n = Math.max(1, Math.hypot(x, y));
      x /= n;
      y /= n;
      this.touchX = x;
      this.touchY = -y;
      puck.style.transform = `translate(${x * 25}px,${y * 25}px)`;
    };
    pad.addEventListener(
      "pointerdown",
      (e) => {
        pad.setPointerCapture(e.pointerId);
        move(e);
      },
      { signal },
    );
    pad.addEventListener(
      "pointermove",
      (e) => {
        if (pad.hasPointerCapture(e.pointerId)) move(e);
      },
      { signal },
    );
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      pad.addEventListener(
        event,
        () => {
          this.touchX = 0;
          this.touchY = 0;
          puck.style.transform = "";
        },
        { signal },
      );
  }
  consume(): Controls {
    const out = idleControls();
    out.forward =
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) +
      this.touchY;
    out.strafe =
      Number(this.keys.has("KeyD")) -
      Number(this.keys.has("KeyA")) +
      this.touchX;
    out.turn =
      Number(this.keys.has("ArrowLeft")) - Number(this.keys.has("ArrowRight"));
    out.lookX = this.lookX;
    out.lookY = this.lookY;
    this.lookX = 0;
    this.lookY = 0;
    return out;
  }
  clear() {
    this.keys.clear();
    this.lookX = 0;
    this.lookY = 0;
    this.touchX = 0;
    this.touchY = 0;
    this.drag = null;
  }
  dispose() {
    this.abort.abort();
    this.clear();
  }
}

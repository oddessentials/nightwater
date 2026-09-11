type Track = { title: string; src: string; duration: number };

export class Album {
  private readonly element = new Audio();
  private base = "";
  private tracks: Track[] = [];
  private index = 0;
  private wanted = false;
  private failures = 0;
  private hold = 0;
  constructor(base: string) {
    this.element.crossOrigin = "anonymous";
    this.element.addEventListener("ended", () => this.next());
    this.element.addEventListener("error", () => {
      if (++this.failures < this.tracks.length) this.next();
    });
    this.element.addEventListener("playing", () => {
      this.failures = 0;
    });
    void this.load(base).catch(() => {});
  }
  connect(context: AudioContext, destination: AudioNode) {
    context.createMediaElementSource(this.element).connect(destination);
  }
  play(value: boolean, delay = 0) {
    this.wanted = value;
    clearTimeout(this.hold);
    if (!value) {
      if (delay)
        this.hold = window.setTimeout(() => this.element.pause(), delay * 1000);
      else this.element.pause();
      return;
    }
    if (!this.tracks.length) return;
    if (!this.element.getAttribute("src")) this.cue();
    void this.element.play().catch(() => {});
  }
  dispose() {
    clearTimeout(this.hold);
    this.wanted = false;
    this.tracks = [];
    this.element.pause();
    this.element.removeAttribute("src");
    this.element.load();
  }
  private async load(base: string) {
    this.base = new URL(base.replace(/\/?$/, "/"), location.href).href;
    const response = await fetch(new URL("manifest.json", this.base));
    const manifest = response.ok ? await response.json() : null;
    if (!Array.isArray(manifest?.tracks) || !manifest.tracks.length) return;
    this.tracks = manifest.tracks;
    if (this.wanted) this.play(true);
  }
  private cue() {
    this.element.src = new URL(this.tracks[this.index].src, this.base).href;
  }
  private next() {
    if (!this.tracks.length) return;
    this.index = (this.index + 1) % this.tracks.length;
    this.cue();
    if (this.wanted) void this.element.play().catch(() => {});
  }
}

export class WaterAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private flow: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private pan: StereoPannerNode | null = null;
  private noise: AudioBuffer | null = null;
  private running: AudioBufferSourceNode | null = null;
  muted = false;
  async start() {
    if (this.context) {
      await this.context.resume();
      return;
    }
    const ctx = new AudioContext();
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(ctx.destination);
    const data = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const out = data.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < out.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.025) / 1.025;
      out[i] = brown * 2.6 + white * 0.11;
    }
    this.noise = data;
    this.running = ctx.createBufferSource();
    this.running.buffer = data;
    this.running.loop = true;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 700;
    this.flow = ctx.createGain();
    this.flow.gain.value = 0.02;
    this.pan = ctx.createStereoPanner();
    this.running.connect(this.filter);
    this.filter.connect(this.flow);
    this.flow.connect(this.pan);
    this.pan.connect(this.master);
    this.running.start();
    await ctx.resume();
  }
  update(
    speed: number,
    inTube: boolean,
    under: boolean,
    roll: number,
    time: number,
  ) {
    if (!this.context || !this.flow || !this.filter || !this.pan) return;
    const now = this.context.currentTime;
    this.flow.gain.setTargetAtTime(
      inTube ? 0.19 + speed * 0.014 : 0.075 + Math.sin(time * 0.6) * 0.008,
      now,
      0.25,
    );
    this.filter.frequency.setTargetAtTime(
      under ? 180 : inTube ? 500 + speed * 78 : 850,
      now,
      0.18,
    );
    this.pan.pan.setTargetAtTime(
      Math.max(-0.6, Math.min(0.6, roll * 2)),
      now,
      0.15,
    );
  }
  splash() {
    if (!this.context || !this.master || !this.noise) return;
    const ctx = this.context,
      src = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    src.buffer = this.noise;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.1);
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.1, ctx.currentTime + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    src.stop(ctx.currentTime + 1.6);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
  mute() {
    this.muted = !this.muted;
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : 0.55,
        this.context.currentTime,
        0.1,
      );
    return this.muted;
  }
  pause(value: boolean) {
    const context = this.context;
    if (!context || context.state === "closed") return;
    void (value ? context.suspend() : context.resume()).catch(() => {
      // Closing the page can close audio while a state change is pending.
    });
  }
  dispose() {
    const context = this.context;
    this.context = null;
    this.running?.stop();
    this.running = null;
    this.master = null;
    this.flow = null;
    this.filter = null;
    this.pan = null;
    this.noise = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
}

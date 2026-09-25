const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const WIDE = "(min-aspect-ratio: 6/5) and (min-width: 560px)";
const wideArt = matchMedia(WIDE);
const art = () => (wideArt.matches ? "wide" : "tall");
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};
const data = JSON.parse($("#nightwater-data").textContent);
const pad = (n) => String(n).padStart(2, "0");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lazy = new IntersectionObserver(
  (entries) => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue;
      lazy.unobserve(target);
      for (const element of $$("[data-srcset]", target)) {
        element.srcset = element.dataset.srcset;
        element.removeAttribute("data-srcset");
      }
      const img = $("img[data-src]", target);
      if (img) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
    }
  },
  { rootMargin: "0px 0px 50% 0px" },
);
$$("picture[data-lazy]").forEach((picture) => lazy.observe(picture));

const header = $("[data-header]");
const hero = $("[data-hero]");
const scene = $("[data-scene]");
const poolPanel = $("[data-pool]");
const status = $("[data-status]");

new IntersectionObserver(([entry]) =>
  header.toggleAttribute("data-solid", !entry.isIntersecting),
).observe($("[data-top]"));
new IntersectionObserver(([entry]) =>
  header.toggleAttribute(
    "data-play",
    !entry.isIntersecting && entry.boundingClientRect.top < 0,
  ),
).observe($("[data-actions]"));

const MUSIC = "https://audio.oddessentials.ai/nightwater/";
const sound = {
  on: false,
  context: null,
  master: null,
  noise: null,
  audio: null,
  tracks: null,
  index: 0,
  wanted: false,
};

function audioContext() {
  if (!sound.context) {
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
    const noise = context.createBuffer(
      1,
      context.sampleRate * 2,
      context.sampleRate,
    );
    const out = noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < out.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.025) / 1.025;
      out[i] = brown * 2.6 + white * 0.11;
    }
    Object.assign(sound, { context, master, noise });
  }
  if (sound.context.state === "suspended") sound.context.resume();
  return sound.context;
}

function note(frequency, level, at = 0, length = 0.42) {
  const context = audioContext();
  const osc = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime + at;
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + length);
  osc.connect(gain);
  gain.connect(sound.master);
  osc.start(now);
  osc.stop(now + length + 0.05);
}

function wash(from, to, length, level) {
  const context = audioContext();
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime;
  source.buffer = sound.noise;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + length);
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(level, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + length);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(sound.master);
  source.start(now);
  source.stop(now + length + 0.1);
}

const effects = {
  chime(count, tier) {
    if (!sound.on) return;
    note(
      [523.25, 659.25, 783.99, 1046.5, 1318.5][Math.min(4, count - 1)],
      tier === 10 ? 0.24 : 0.16,
    );
  },
  reward() {
    if (!sound.on) return;
    note(659.25, 0.09, 0, 0.28);
    note(987.77, 0.09, 0.1, 0.28);
  },
  rush() {
    if (sound.on) wash(700, 2600, 1.2, 0.35);
  },
  splash() {
    if (sound.on) wash(3400, 220, 1.4, 0.9);
  },
};

const soundToggle = $("[data-sound]");
const albumButton = $("[data-album]");
const nowPlaying = $("[data-now]");
const trackButtons = $$("[data-tracks] button");

function renderSound() {
  soundToggle.setAttribute("aria-pressed", String(sound.on));
  const playing = !!sound.audio && !sound.audio.paused;
  albumButton.setAttribute("aria-pressed", String(playing || sound.wanted));
  $("[data-album-label]").textContent =
    playing || sound.wanted ? "Pause the album" : "Play the album";
  trackButtons.forEach((button, i) =>
    button.setAttribute(
      "aria-current",
      String(i === sound.index && (playing || sound.wanted)),
    ),
  );
}

async function loadAlbum() {
  if (sound.tracks) return sound.tracks;
  const response = await fetch(`${MUSIC}manifest.json`);
  if (!response.ok) throw new Error(`album manifest ${response.status}`);
  const { tracks } = await response.json();
  if (!Array.isArray(tracks) || !tracks.length) throw new Error("empty album");
  sound.tracks = tracks;
  sound.audio = new Audio();
  sound.audio.preload = "none";
  sound.audio.volume = 0.8;
  sound.audio.addEventListener("ended", () => playTrack(sound.index + 1));
  sound.audio.addEventListener("play", renderSound);
  sound.audio.addEventListener("pause", renderSound);
  return tracks;
}

async function playTrack(index) {
  sound.wanted = true;
  sound.on = true;
  audioContext();
  renderSound();
  try {
    const tracks = await loadAlbum();
    sound.index = ((index % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[sound.index];
    if (!sound.audio.src.endsWith(track.src))
      sound.audio.src = new URL(track.src, MUSIC).href;
    await sound.audio.play();
    const title = document.createElement("b");
    title.textContent = track.title;
    nowPlaying.replaceChildren(
      "Now playing ",
      title,
      `, track ${sound.index + 1} of ${tracks.length}`,
    );
  } catch {
    if (!sound.wanted) return;
    sound.wanted = false;
    nowPlaying.textContent =
      "The album couldn't start. Check your connection and press play again.";
  }
  renderSound();
}

function pauseAlbum() {
  sound.wanted = false;
  sound.audio?.pause();
  renderSound();
}

soundToggle.addEventListener("click", () => {
  if (sound.on) {
    sound.on = false;
    pauseAlbum();
  } else playTrack(sound.index);
});
albumButton.addEventListener("click", () => {
  if (sound.wanted || (sound.audio && !sound.audio.paused)) pauseAlbum();
  else playTrack(sound.index);
});
$("[data-next]").addEventListener("click", () => playTrack(sound.index + 1));
trackButtons.forEach((button, i) =>
  button.addEventListener("click", () => {
    if (i === sound.index && sound.audio && !sound.audio.paused) pauseAlbum();
    else playTrack(i);
  }),
);

const stillToggle = $("[data-still]");
let stillChoice = store.get("nightwater.still");
const isStill = () => (stillChoice ? stillChoice === "1" : reduced.matches);

function renderStill() {
  stillToggle.setAttribute("aria-pressed", String(isStill()));
  water.update();
}
stillToggle.addEventListener("click", () => {
  stillChoice = isStill() ? "0" : "1";
  store.set("nightwater.still", stillChoice);
  renderStill();
});
reduced.addEventListener("change", renderStill);

function coverRect(img) {
  const box = scene.getBoundingClientRect();
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(box.width / iw, box.height / ih);
  const w = iw * scale;
  const h = ih * scale;
  const [px, py] = getComputedStyle(img)
    .objectPosition.split(" ")
    .map((v) => parseFloat(v) / 100);
  return {
    x: (box.width - w) * px,
    y: (box.height - h) * py,
    w,
    h,
    width: box.width,
    height: box.height,
  };
}

const water = (() => {
  const canvas = $("[data-water]");
  const VERTEX = `attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
  const FRAGMENT = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;uniform sampler2D t;uniform vec2 scale;uniform vec2 offset;uniform float time;uniform float line;
void main(){vec2 q=offset+v*scale;float d=max(q.y-line,0.);float m=smoothstep(0.,.045,d);float k=1./(d+.04);
float w=sin(q.y*4.6*k+time*1.5)*.6+sin(q.y*2.8*k-time*1.05+q.x*7.)*.4;
vec2 s=q+vec2(w*.0022*m*(1.-d),w*.0006*m);gl_FragColor=vec4(texture2D(t,clamp(s,0.,1.)).rgb,m);}`;
  let gl = null;
  let uniforms = {};
  let image = null;
  let line = 0.64;
  let frame = 0;
  let started = false;
  let visible = true;
  let ready = false;
  let rect = null;

  function init() {
    gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) return false;
    const shader = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const p = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    for (const name of ["scale", "offset", "time", "line"])
      uniforms[name] = gl.getUniformLocation(program, name);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    for (const [key, value] of [
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
      [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
      gl.texParameteri(gl.TEXTURE_2D, key, value);
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      ready = false;
      stop();
    });
    return true;
  }

  function layout() {
    if (!image?.naturalWidth) return;
    rect = coverRect(image);
    const top = Math.max(0, Math.floor(rect.y + line * rect.h - 2));
    const height = Math.max(1, Math.ceil(rect.height - top));
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.scale, rect.width / rect.w, height / rect.h);
    gl.uniform2f(uniforms.offset, -rect.x / rect.w, (top - rect.y) / rect.h);
    gl.uniform1f(uniforms.line, line);
  }

  function upload() {
    if (!ready || !image?.naturalWidth) return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    layout();
  }

  let tick = 0;
  function loop(now) {
    frame = requestAnimationFrame(loop);
    if (++tick % 2) return;
    gl.uniform1f(uniforms.time, (now / 1000) % 600);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    canvas.toggleAttribute("data-live", true);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.toggleAttribute("data-live", false);
  }

  function update() {
    const run =
      started &&
      ready &&
      !!image &&
      visible &&
      !isStill() &&
      document.visibilityState === "visible";
    if (run && !frame) frame = requestAnimationFrame(loop);
    else if (!run && frame) stop();
  }

  function start() {
    if (started) return;
    started = true;
    if (navigator.connection?.saveData) return;
    ready = init();
    upload();
    update();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(hero);
  document.addEventListener("visibilitychange", update);
  new ResizeObserver(() => ready && layout()).observe(scene);

  return {
    start,
    update,
    use(img, waterline) {
      image = img;
      line = waterline;
      update();
      if (!img) return;
      if (!img.complete || !img.naturalWidth)
        img.addEventListener("load", upload, { once: true });
      else upload();
    },
    hide() {
      stop();
    },
  };
})();

const glows = $$("[data-glows] .glow");
const spot = $("[data-spot]");
const shots = $("[data-shots]");
let poolIndex = 0;
let busy = false;
let shot = $("[data-shot]");

function currentImage() {
  return $("img", shot);
}

function placeGlows() {
  const pool = data.pools[poolIndex];
  const img = currentImage();
  if (!pool || !img.naturalWidth) return;
  const rect = coverRect(img);
  const exits = pool.exits[art()];
  exits.forEach((exit, i) => {
    const x = rect.x + exit.x * rect.w;
    const y = rect.y + exit.y * rect.h;
    const onScreen = x > 0 && x < rect.width;
    glows[i].hidden = !onScreen;
    glows[i].style.setProperty("--x", `${x}px`);
    glows[i].style.setProperty("--y", `${y}px`);
    glows[i].style.setProperty("--d", `${exit.r * rect.h * 2.3}px`);
    glows[i].dataset.r = String(exit.r * rect.h);
  });
  const middle = rect.x + exits[1].x * rect.w;
  hero.style.setProperty(
    "--pool-x",
    `${((middle / rect.width) * 100).toFixed(2)}%`,
  );
}

const box = (element) => element.getBoundingClientRect();
function extent(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect();
}
function fit() {
  hero.removeAttribute("data-stack");
  hero.setAttribute("data-fitted", "");
  if (!wideArt.matches) return;
  const copy = [
    box($(".lockup")),
    ...$$(".hero-copy > p, .actions").map(extent),
  ];
  const pool = [
    ...$$(".exits, .figure, .pool-end", poolPanel).map(box),
    ...$$(".pool-where > *, .prompt", poolPanel).map(extent),
    extent(status),
  ];
  const near = (a, b) =>
    a.left < b.right + 16 &&
    b.left < a.right + 16 &&
    a.top < b.bottom + 16 &&
    b.top < a.bottom + 16;
  hero.toggleAttribute(
    "data-stack",
    copy.some((a) => a.height && pool.some((b) => b.height && near(a, b))),
  );
}

function picture(images, className = "shot") {
  const element = document.createElement("picture");
  element.className = className;
  element.innerHTML = `<source media="${WIDE}" type="image/avif" srcset="${images.wide.avif}" sizes="max(100vw, 177.8vh)"><source media="${WIDE}" type="image/webp" srcset="${images.wide.webp}" sizes="max(100vw, 177.8vh)"><source type="image/avif" srcset="${images.tall.avif}" sizes="max(100vw, 56.25vh)"><img src="${images.tall.webp}" alt="" decoding="async">`;
  return element;
}

const decoded = (element) =>
  Promise.race([
    $("img", element)
      .decode()
      .catch(() => {}),
    wait(4000),
  ]);

const nextShots = new Map();
const tubeShots = new Map();
function prime() {
  const next = data.pools[poolIndex + 1];
  if (next && !nextShots.has(poolIndex + 1)) {
    const element = picture(next.images);
    nextShots.set(poolIndex + 1, element);
    element.style.opacity = "0";
    shots.insertBefore(element, shot);
    decoded(element);
  }
  if (poolIndex + 1 === data.pools.length && !nextShots.has("end")) {
    const element = picture(data.end);
    nextShots.set("end", element);
    element.style.opacity = "0";
    shots.insertBefore(element, shot);
    decoded(element);
  }
  data.tubes.forEach((images, i) => {
    if (tubeShots.has(i)) return;
    const element = picture(images, "shot tube");
    element.style.opacity = "0";
    tubeShots.set(i, element);
    shots.insertBefore(element, shot);
    decoded(element);
  });
}
for (const type of ["pointerenter", "focusin", "touchstart"])
  poolPanel.addEventListener(type, prime, { once: true, passive: true });

const animateTo = (element, frames, options) =>
  element.animate(frames, { fill: "forwards", ...options });

async function dive(exitIndex, next) {
  const img = currentImage();
  const rect = coverRect(img);
  const exit = data.pools[poolIndex].exits[art()][exitIndex];
  const tube = tubeShots.get(exitIndex);
  await Promise.all([decoded(next), decoded(tube)]);
  water.hide();
  shots.append(next);
  if (reduced.matches) {
    await animateTo(next, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
      .finished;
  } else {
    shots.insertBefore(tube, next);
    shot.style.transformOrigin = `${rect.x + exit.x * rect.w}px ${rect.y + exit.y * rect.h}px`;
    effects.rush();
    animateTo(
      shot,
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(3.2)", opacity: 0 },
      ],
      { duration: 560, easing: "cubic-bezier(.55,0,.85,.35)" },
    );
    animateTo(
      tube,
      [
        { opacity: 0, transform: "scale(1)" },
        { opacity: 1, offset: 0.2 },
        { opacity: 1, transform: "scale(1.45)", offset: 0.8 },
        { opacity: 0, transform: "scale(1.6)" },
      ],
      { duration: 1150, delay: 280 },
    );
    const land = animateTo(
      next,
      [
        { opacity: 0, transform: "scale(1.1)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      { duration: 560, delay: 1180, easing: "cubic-bezier(.22,.8,.26,1)" },
    );
    await wait(1250);
    effects.splash();
    await land.finished;
  }
  for (const element of [shot, tube]) {
    element.getAnimations().forEach((a) => a.cancel());
    element.style.opacity = "0";
    element.style.transformOrigin = "";
    if (element === tube) shots.insertBefore(tube, shots.firstChild);
  }
  shot.remove();
  next.getAnimations().forEach((a) => a.cancel());
  next.style.opacity = "";
  next.style.transform = "";
  shot = next;
}

const where = $("[data-where]");
const skill = $("[data-skill]");
const figure = $("[data-figure]");
const prompt = $("[data-prompt]");
const exitButtons = $$("[data-exit]");

function showPool() {
  const pool = data.pools[poolIndex];
  where.innerHTML = pool.where;
  skill.innerHTML = pool.skill;
  figure.innerHTML = pool.figure;
  figure.hidden = !pool.figure;
  prompt.innerHTML = pool.prompt;
  exitButtons.forEach((button, i) => {
    $("[data-answer]", button).innerHTML = pool.choices[i];
    button.removeAttribute("data-chosen");
    button.removeAttribute("aria-disabled");
  });
  fit();
  placeGlows();
  water.use(currentImage(), pool.line[art()]);
}

const plain = (html) => {
  const span = document.createElement("span");
  span.innerHTML = html;
  return span.textContent;
};

async function choose(exitIndex) {
  if (busy || !exitButtons.length) return;
  busy = true;
  const pool = data.pools[poolIndex];
  const correct = exitIndex === pool.correct;
  const last = poolIndex === data.pools.length - 1;
  const following = data.pools[poolIndex + 1];
  exitButtons.forEach((button) => button.setAttribute("aria-disabled", "true"));
  exitButtons[exitIndex].toggleAttribute("data-chosen", true);
  light(exitIndex);
  const verdict = correct
    ? "Correct"
    : `Incorrect · The answer was ${plain(pool.answer)}`;
  status.textContent = last
    ? `${verdict}. That was the deepest pool.`
    : `${verdict} · Stage ${pad(following.stage)} next.`;
  if (correct) effects.reward();
  prime();
  await wait(reduced.matches ? 150 : 520);
  light(-1);
  const next = last ? nextShots.get("end") : nextShots.get(poolIndex + 1);
  await dive(exitIndex, next);
  if (last) {
    finish();
  } else {
    poolIndex++;
    showPool();
    status.textContent = `Pool ${poolIndex + 1} of ${data.pools.length}. Choose an exit to ride it down.`;
    prime();
  }
  busy = false;
}

const panelBody = poolPanel.querySelector("[data-pool] > div");
const panelStart = panelBody.innerHTML;

function finish() {
  glows.forEach((glow) => (glow.hidden = true));
  exitButtons.length = 0;
  water.use(null);
  panelBody.innerHTML = `<div class="pool-end"><p>Five pools, from Stage 1 to Stage 21. The park has 210 levels.</p><a class="play" href="https://math.oddessentials.ai/">Play in your browser<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6"/></svg></a><button class="again" type="button">Ride again from Stage 1</button></div>`;
  $(".again", panelBody).addEventListener("click", restart);
  fit();
  $(".play", panelBody).focus({ preventScroll: true });
}

async function restart() {
  busy = true;
  const first = picture(data.pools[0].images);
  nextShots.clear();
  poolIndex = 0;
  first.style.opacity = "0";
  shots.append(first);
  await decoded(first);
  await animateTo(first, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 })
    .finished;
  first.getAnimations().forEach((a) => a.cancel());
  first.style.opacity = "";
  shot.remove();
  shot = first;
  panelBody.innerHTML = panelStart;
  bindExits();
  showPool();
  status.textContent = "Choose an exit to ride it down.";
  exitButtons[0].focus({ preventScroll: true });
  busy = false;
}

function light(index) {
  glows.forEach((glow, i) => glow.toggleAttribute("data-lit", i === index));
  const glow = glows[index];
  if (!glow || glow.hidden) {
    spot.removeAttribute("data-on");
    return;
  }
  spot.style.setProperty("--sx", glow.style.getPropertyValue("--x"));
  spot.style.setProperty("--sy", glow.style.getPropertyValue("--y"));
  spot.style.setProperty("--sr", `${glow.dataset.r * 1.15}px`);
  spot.toggleAttribute("data-on", true);
}

let ignited = false;
function ignite() {
  if (ignited || reduced.matches) return;
  ignited = true;
  glows.forEach((glow, i) => {
    if (glow.hidden) return;
    setTimeout(
      () => busy || glow.toggleAttribute("data-lit", true),
      300 + i * 180,
    );
    setTimeout(() => busy || glow.removeAttribute("data-lit"), 1100 + i * 180);
  });
}

function bindExits() {
  exitButtons.splice(0, exitButtons.length, ...$$("[data-exit]", panelBody));
  exitButtons.forEach((button, i) => {
    button.addEventListener("click", () => choose(i));
    for (const type of ["pointerenter", "focus"])
      button.addEventListener(type, () => busy || light(i));
    for (const type of ["pointerleave", "blur"])
      button.addEventListener(type, () => busy || light(-1));
  });
}
bindExits();
glows.forEach((glow, i) => glow.addEventListener("click", () => choose(i)));
poolPanel.addEventListener("keydown", (event) => {
  const i = ["1", "2", "3"].indexOf(event.key);
  if (i < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
  if (!exitButtons.length) return;
  event.preventDefault();
  exitButtons[i].focus();
  choose(i);
});

new ResizeObserver(() => {
  fit();
  placeGlows();
}).observe(scene);
document.fonts.ready.then(fit);
wideArt.addEventListener("change", () => {
  if (exitButtons.length)
    water.use(currentImage(), data.pools[poolIndex].line[art()]);
});
const settle = () =>
  requestAnimationFrame(() =>
    setTimeout(() => {
      placeGlows();
      ignite();
      if (exitButtons.length)
        water.use(currentImage(), data.pools[poolIndex].line[art()]);
    }),
  );
shots.addEventListener(
  "load",
  (event) => event.target === currentImage() && settle(),
  true,
);
water.use(currentImage(), data.pools[0].line[art()]);
if (currentImage().complete) settle();

const startWater = () => {
  removeEventListener("pointermove", startWater);
  removeEventListener("keydown", startWater);
  removeEventListener("touchstart", startWater);
  water.start();
};
for (const type of ["pointermove", "keydown", "touchstart"])
  addEventListener(type, startWater, { once: true, passive: true });
addEventListener("load", () => setTimeout(startWater, 3500), { once: true });
renderStill();

const tabs = $$('[role="tab"]');
const tier = { "tab-ember": 2, "tab-lantern": 5, "tab-star": 10 };
$("[data-tablist]").hidden = false;
for (const tab of tabs) {
  const panel = $(`#${tab.getAttribute("aria-controls")}`);
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", tab.id);
  panel.hidden = tab.getAttribute("aria-selected") !== "true";
}
function select(tab, focus) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute("aria-selected", String(selected));
    other.tabIndex = selected ? 0 : -1;
    $(`#${other.getAttribute("aria-controls")}`).hidden = !selected;
  }
  if (focus) tab.focus();
  effects.chime(tabs.indexOf(tab) + 1, tier[tab.id]);
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => select(tab));
  tab.addEventListener("keydown", (event) => {
    const moves = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(tabs[(moves[event.key] + tabs.length) % tabs.length], true);
  });
});

function player(id, title) {
  const frame = document.createElement("iframe");
  frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
  frame.title = `${title} (YouTube)`;
  frame.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allowFullscreen = true;
  return frame;
}

for (const button of $$("[data-video]"))
  button.addEventListener("click", () => {
    pauseAlbum();
    const frame = document.createElement("div");
    frame.className = "player-frame";
    const iframe = player(button.dataset.video, button.dataset.title);
    frame.append(iframe);
    button.replaceWith(frame);
    iframe.focus();
  });

const theatre = $("[data-theatre-dialog]");
const theatreFrame = $("[data-theatre-frame]");
let opener = null;
$("[data-theatre]").addEventListener("click", (event) => {
  opener = event.currentTarget;
  pauseAlbum();
  theatre.showModal();
  theatreFrame.replaceChildren(player("BO8saAp3D2Y", "Nightwater trailer"));
});
$("[data-theatre-close]").addEventListener("click", () => theatre.close());
theatre.addEventListener("click", (event) => {
  if (event.target === theatre) theatre.close();
});
theatre.addEventListener("close", () => {
  theatreFrame.replaceChildren();
  opener?.focus();
});

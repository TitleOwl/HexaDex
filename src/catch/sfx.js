// Encounter sounds, synthesised with WebAudio so there are no audio files to
// ship or fail to load. Every call is wrapped: audio is a nice-to-have and must
// never be able to break a throw.
//
// The context is created lazily on the first sound, because browsers reject one
// created before a user gesture.

let ctx = null;
let muted = false;

function ac() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch { return null; }
}

export function setMuted(v) { muted = !!v; }

/** One shaped tone. `type` is any OscillatorNode wave. */
function tone({ freq, to, dur = 0.15, type = "sine", gain = 0.14, delay = 0 }) {
  const a = ac();
  if (!a) return;
  try {
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    // Short attack, exponential tail — a linear fade reads as a click.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {}
}

function noise({ dur = 0.12, gain = 0.1, delay = 0 }) {
  const a = ac();
  if (!a) return;
  try {
    const t0 = a.currentTime + delay;
    const len = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    const g = a.createGain();
    g.gain.setValueAtTime(gain, t0);
    src.buffer = buf;
    src.connect(g).connect(a.destination);
    src.start(t0);
  } catch {}
}

export const sfx = {
  throwBall() { tone({ freq: 320, to: 720, dur: 0.16, type: "triangle", gain: 0.1 }); },

  // Bonus stinger rises with the tier, so quality is audible as well as visible.
  bonus(tier) {
    const base = tier === "excellent" ? 780 : tier === "great" ? 620 : 500;
    tone({ freq: base, dur: 0.1, type: "square", gain: 0.09 });
    tone({ freq: base * 1.5, dur: 0.14, type: "square", gain: 0.08, delay: 0.09 });
    if (tier === "excellent") tone({ freq: base * 2, dur: 0.18, type: "square", gain: 0.07, delay: 0.2 });
  },

  hit()     { noise({ dur: 0.09, gain: 0.12 }); tone({ freq: 200, to: 120, dur: 0.1, type: "sine", gain: 0.1 }); },
  suckIn()  { tone({ freq: 800, to: 180, dur: 0.3, type: "sine", gain: 0.1 }); },
  wobble()  { tone({ freq: 240, to: 190, dur: 0.13, type: "triangle", gain: 0.11 }); },

  success() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: "triangle", gain: 0.11, delay: i * 0.11 }));
  },

  fail()    { tone({ freq: 300, to: 140, dur: 0.28, type: "sawtooth", gain: 0.09 }); noise({ dur: 0.2, gain: 0.08 }); },
  flee()    { tone({ freq: 500, to: 160, dur: 0.4, type: "sine", gain: 0.1 }); },
  miss()    { tone({ freq: 220, to: 150, dur: 0.14, type: "sine", gain: 0.07 }); },
  berry()   { tone({ freq: 620, to: 880, dur: 0.14, type: "sine", gain: 0.09 }); },
};

/** Short buzz on impact; silently ignored where unsupported (§9). */
export function haptic(ms = 25) {
  try { navigator.vibrate?.(ms); } catch {}
}

// ═══════════════════════════════════════════════════════════
// catchSounds.js — Pokemon-style SFX synthesizer (Web Audio API)
//
// Sounds modeled after Pokemon GO catch mechanics:
//   • playThrow()        — ball whoosh
//   • playHit()          — ball impacts pokemon (thud + small ping)
//   • playSuckIn()       — pokemon energy beam → ball (electronic zap)
//   • playWobble()       — mechanical click each wobble
//   • playBallLock()     — confirmation ding when caught
//   • playGotcha()       — long "Pokemon caught!" celebration jingle
//                          Also dispatches catch:success-start/end events
//                          so CatchBattleMusic can pause trainer music.
//   • playCatchFail()    — sad "aww" descending
//   • playRunAway()      — quick swoosh
//   • playPokemonCry()   — real Pokemon cry (PS CDN + PokeAPI fallback)
// ═══════════════════════════════════════════════════════════

class CatchSounds {
  constructor() {
    this.ctx = null;
    this._activeCry = null;
    this._activeNodes = [];
  }

  _ctx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  _enabled() {
    try { return localStorage.getItem("pkdx_sound") !== "false"; }
    catch { return true; }
  }

  // ─── Reverb-like delay/feedback chain ─────────────────────
  _makeReverb(ctx, wet = 0.25, delayTime = 0.06) {
    const delay = ctx.createDelay();
    delay.delayTime.value = delayTime;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wetGain = ctx.createGain();
    wetGain.gain.value = wet;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    return { input: delay, output: wetGain };
  }

  // ─── Ball whoosh (throw) ──────────────────────────────────
  playThrow() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.4;

    // Filtered white noise (descending pitch)
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);

    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(now); src.stop(now + dur);
  }

  // ─── Ball impacts Pokemon (thud + ping layer) ─────────────
  playHit() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    // Layer 1: low thud
    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(160, now);
    thud.frequency.exponentialRampToValueAtTime(55, now + 0.2);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.exponentialRampToValueAtTime(0.5, now + 0.005);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    thud.connect(thudGain); thudGain.connect(ctx.destination);
    thud.start(now); thud.stop(now + 0.3);

    // Layer 2: impact transient ("tok" — short noise burst)
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 1.2;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.35, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    noise.connect(bp); bp.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.05);

    // Layer 3: soft metallic ping (less shrill)
    const ping = ctx.createOscillator();
    ping.type = "triangle";
    ping.frequency.value = 1650;
    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0.001, now);
    pingGain.gain.exponentialRampToValueAtTime(0.18, now + 0.003);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    ping.connect(pingGain); pingGain.connect(ctx.destination);
    ping.start(now); ping.stop(now + 0.15);
  }

  // ─── Pokemon energy beam into ball ("pshoooo" warbling zap) ───
  playSuckIn() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.6;

    // Main beam tone — descending, with fast vibrato for the classic warble
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(430, now + dur);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 24;                 // warble speed
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 70;                  // warble depth (Hz)
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(1700, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.17, now + 0.05);
    gain.gain.setValueAtTime(0.17, now + dur - 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + dur);
    lfo.start(now); lfo.stop(now + dur);

    // Shimmer sparkle layer (airy high tail)
    const shimmer = ctx.createOscillator();
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(2600, now);
    shimmer.frequency.exponentialRampToValueAtTime(1500, now + dur);
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.0001, now);
    sGain.gain.exponentialRampToValueAtTime(0.05, now + 0.08);
    sGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    shimmer.connect(sGain); sGain.connect(ctx.destination);
    shimmer.start(now); shimmer.stop(now + dur);
  }

  // ─── Mechanical wobble click ("tk" — crisp & tight) ───────
  playWobble() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    // Transient noise tick (the "k" of the click)
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource(); noise.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    noise.connect(hp); hp.connect(nGain); nGain.connect(ctx.destination);
    noise.start(now); noise.stop(now + 0.04);

    // Short pitched body (the "t" — woody plastic knock)
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1300, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.05);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.26, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.08);
  }

  // ─── Ball locks shut (catch confirmed!) — "ka-chk" + bright DING✨ ──
  playBallLock() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    // 1) Mechanical lock "ka-chk" (low woody knock)
    const lock = ctx.createOscillator();
    lock.type = "square";
    lock.frequency.setValueAtTime(320, now);
    lock.frequency.exponentialRampToValueAtTime(90, now + 0.09);
    const lockGain = ctx.createGain();
    lockGain.gain.setValueAtTime(0.0001, now);
    lockGain.gain.exponentialRampToValueAtTime(0.28, now + 0.004);
    lockGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    lock.connect(lockGain); lockGain.connect(ctx.destination);
    lock.start(now); lock.stop(now + 0.13);

    // 2) Bright bell "DING" (two partials, ringing decay)
    const ding = now + 0.1;
    [1318.5, 1976.0].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ding);
      g.gain.exponentialRampToValueAtTime(i === 0 ? 0.16 : 0.07, ding + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, ding + 0.55);
      o.connect(g); g.connect(ctx.destination);
      o.start(ding); o.stop(ding + 0.6);
    });

    // 3) Sparkle — quick ascending high blips (the catch ✨)
    [2093, 2637, 3136].forEach((f, k) => {
      const t = ding + 0.06 + k * 0.05;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.14);
    });
  }

  // ─── "Pokemon Caught!" long celebration jingle ────────────
  // ~3.5 seconds. Pauses trainer music via dispatched events.
  playGotcha() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    this._stopActive();

    // Tell CatchBattleMusic to pause for celebration
    window.dispatchEvent(new CustomEvent("catch:success-start"));

    const now = ctx.currentTime;

    // Classic Pokemon GO "Pokemon caught!" melody (~3.5s)
    // C5 - E5 - G5 - C6 ascending, then triumphant C6-G5-C6 with sustain
    // Plus a low bass octave for body
    const melody = [
      { freq: 523.25, time: 0.00, dur: 0.18 },  // C5
      { freq: 659.25, time: 0.18, dur: 0.18 },  // E5
      { freq: 783.99, time: 0.36, dur: 0.18 },  // G5
      { freq: 1046.5, time: 0.54, dur: 0.30 },  // C6
      { freq: 1567.98,time: 0.84, dur: 0.18 },  // G6 (high accent)
      { freq: 1046.5, time: 1.02, dur: 0.18 },  // C6
      { freq: 1318.5, time: 1.20, dur: 0.18 },  // E6
      { freq: 1567.98,time: 1.38, dur: 1.40, sustained: true }, // G6 sustained
    ];

    // Bass line (lower octave for fullness)
    const bass = [
      { freq: 130.81, time: 0.00, dur: 0.36 }, // C3
      { freq: 196.00, time: 0.36, dur: 0.36 }, // G3
      { freq: 261.63, time: 0.72, dur: 0.30 }, // C4
      { freq: 196.00, time: 1.02, dur: 0.36 }, // G3
      { freq: 261.63, time: 1.38, dur: 1.40, sustained: true }, // C4 sustained
    ];

    const reverb = this._makeReverb(ctx, 0.18, 0.08);
    reverb.output.connect(ctx.destination);

    const playNotes = (arr, type, vol) => {
      arr.forEach(n => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = n.freq;

        const gain = ctx.createGain();
        const startT = now + n.time;
        const endT = startT + n.dur;

        gain.gain.setValueAtTime(0.0001, startT);
        gain.gain.exponentialRampToValueAtTime(vol, startT + 0.015);
        if (n.sustained) {
          gain.gain.setValueAtTime(vol, endT - 0.5);
          gain.gain.exponentialRampToValueAtTime(0.0001, endT);
        } else {
          gain.gain.setValueAtTime(vol, endT - 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, endT);
        }

        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.connect(reverb.input);
        osc.start(startT); osc.stop(endT + 0.06);
        this._activeNodes.push(osc, gain);
      });
    };

    playNotes(melody, "square", 0.12);
    playNotes(bass, "triangle", 0.10);

    // ✨ Sparkle shimmer cascade at the climax (magical "caught!" feel)
    [2093, 2637, 3136, 4186].forEach((f, i) => {
      const t = now + 1.45 + i * 0.09;
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.055, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(reverb.input); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.55);
      this._activeNodes.push(o, g);
    });

    // Restore trainer music after celebration ends (~3.5s)
    const totalDur = 2.78;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("catch:success-end"));
    }, totalDur * 1000);
  }

  _stopActive() {
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;
    this._activeNodes.forEach(n => {
      try {
        if (n.stop) n.stop(now);
        if (n.disconnect) n.disconnect();
      } catch {}
    });
    this._activeNodes = [];
  }

  // ─── Catch fail (Pokemon escapes) ─────────────────────────
  playCatchFail() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    // Pop sound (ball opens)
    const pop = ctx.createOscillator();
    pop.type = "triangle";
    pop.frequency.setValueAtTime(600, now);
    pop.frequency.exponentialRampToValueAtTime(200, now + 0.12);
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.exponentialRampToValueAtTime(0.3, now + 0.005);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    pop.connect(popGain); popGain.connect(ctx.destination);
    pop.start(now); pop.stop(now + 0.17);

    // Sad descending tone
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(523, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(196, now + 0.55);
    osc.frequency.exponentialRampToValueAtTime(98,  now + 0.85);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(now + 0.15); osc.stop(now + 0.95);
  }

  // ─── Run-away swoosh ──────────────────────────────────────
  playRunAway() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.4);
  }

  // ─── Pokemon cry (Pokemon Showdown CDN + PokeAPI fallback) ─
  playPokemonCry(pokemon) {
    if (!this._enabled() || !pokemon) return;
    this._stopActiveCry();

    const psName = String(pokemon.name).toLowerCase()
      .replace(/-/g, "").replace(/\./g, "").replace(/'/g, "")
      .replace(/♀/g, "f").replace(/♂/g, "m")
      .replace(/[^a-z0-9]/g, "");

    const tryUrls = [
      `https://play.pokemonshowdown.com/audio/cries/${psName}.mp3`,
      `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemon.id}.ogg`,
      `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/${pokemon.id}.ogg`,
    ];

    let i = 0;
    const tryNext = () => {
      if (i >= tryUrls.length) return;
      const audio = new Audio(tryUrls[i]);
      audio.volume = 0.5;
      audio.play().then(() => {
        this._activeCry = audio;
      }).catch(() => {
        i += 1;
        tryNext();
      });
    };
    tryNext();
  }

  _stopActiveCry() {
    if (this._activeCry) {
      try { this._activeCry.pause(); this._activeCry.src = ""; } catch {}
      this._activeCry = null;
    }
  }

  // Stop everything (called on cleanup / unmount)
  stopAll() {
    this._stopActiveCry();
    this._stopActive();
    // Make sure to release the trainer-music pause if user exits mid-celebration
    window.dispatchEvent(new CustomEvent("catch:success-end"));
  }
}

export const catchSounds = new CatchSounds();
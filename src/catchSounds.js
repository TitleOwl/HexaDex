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

    // Layer 2: metallic ping
    const ping = ctx.createOscillator();
    ping.type = "triangle";
    ping.frequency.value = 2200;
    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0.001, now);
    pingGain.gain.exponentialRampToValueAtTime(0.25, now + 0.003);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    ping.connect(pingGain); pingGain.connect(ctx.destination);
    ping.start(now); ping.stop(now + 0.15);
  }

  // ─── Pokemon energy beam into ball ────────────────────────
  playSuckIn() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.65;

    // Rising sawtooth (energy buildup)
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + dur);

    // Lowpass that opens up
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 8;
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.08);
    gain.gain.setValueAtTime(0.22, now + dur - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + dur);
  }

  // ─── Mechanical wobble click ──────────────────────────────
  playWobble() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    // Sharp two-tone click
    const osc1 = ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.06);
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.32, now + 0.003);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1); gain1.connect(ctx.destination);
    osc1.start(now); osc1.stop(now + 0.12);

    // Lower body
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(450, now);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.1);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.exponentialRampToValueAtTime(0.2, now + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.start(now); osc2.stop(now + 0.16);
  }

  // ─── Ball locks shut (catch confirmed!) ───────────────────
  // The iconic 4-note ascending "ding-ding-ding-DING" jingle
  playBallLock() {
    if (!this._enabled()) return;
    const ctx = this._ctx(); if (!ctx) return;
    const now = ctx.currentTime;

    // 4 ascending notes: F5, G5, A5, C6 (Pokemon classic catch jingle)
    const notes = [
      { freq: 698.46, time: 0.00, dur: 0.12 }, // F5
      { freq: 783.99, time: 0.12, dur: 0.12 }, // G5
      { freq: 880.00, time: 0.24, dur: 0.12 }, // A5
      { freq: 1046.5, time: 0.36, dur: 0.40, sustained: true }, // C6 (high)
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = n.freq;

      // Sub-octave for body
      const sub = ctx.createOscillator();
      sub.type = "triangle";
      sub.frequency.value = n.freq / 2;

      const gain = ctx.createGain();
      const subGain = ctx.createGain();
      const startT = now + n.time;
      const endT = startT + n.dur;

      gain.gain.setValueAtTime(0.0001, startT);
      gain.gain.exponentialRampToValueAtTime(0.15, startT + 0.01);
      gain.gain.setValueAtTime(0.15, endT - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, endT);

      subGain.gain.setValueAtTime(0.0001, startT);
      subGain.gain.exponentialRampToValueAtTime(0.08, startT + 0.01);
      subGain.gain.setValueAtTime(0.08, endT - 0.03);
      subGain.gain.exponentialRampToValueAtTime(0.0001, endT);

      osc.connect(gain); gain.connect(ctx.destination);
      sub.connect(subGain); subGain.connect(ctx.destination);
      osc.start(startT); osc.stop(endT + 0.05);
      sub.start(startT); sub.stop(endT + 0.05);
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
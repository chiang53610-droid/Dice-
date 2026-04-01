/**
 * Realistic dice‑collision sound synthesiser — Web Audio API, zero oscillators.
 *
 * Real dice impacts are broadband transients with NO pitched/tonal component.
 * The characteristic "clack" timbre comes from spectral shaping of noise
 * through the material's resonant properties, not from sine waves.
 *
 * All sounds here use ONLY shaped white noise — no oscillators — to avoid
 * any "electronic" or "synthy" feel.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ─── Shared long noise buffer (reused across all sounds) ─── */
let sharedNoise: AudioBuffer | null = null;

function getNoise(ctx: AudioContext): AudioBuffer {
  if (sharedNoise && sharedNoise.sampleRate === ctx.sampleRate) return sharedNoise;
  // 2-second stereo noise buffer
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  sharedNoise = buf;
  return buf;
}

/** Start a noise source at a random offset so consecutive sounds aren't identical */
function noiseSource(ctx: AudioContext): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  // random start position within the buffer
  (src as any)._offset = Math.random() * 1.5;
  return src;
}

function startNoise(src: AudioBufferSourceNode, time: number, dur: number) {
  const offset = (src as any)._offset ?? 0;
  src.start(time, offset, dur);
}

/* ───────────────────────────────────────────────
   DICE‑ON‑DICE IMPACT
   Very short (8–20 ms), bright, "clacky."
   Two parallel bandpass zones shape the noise:
     • Mid crack  :  1.5–3.5 kHz  (the body of the clack)
     • High snap  :  5–9 kHz      (the bright snap / edge hit)
   Both decay exponentially in < 20 ms.
   ─────────────────────────────────────────────── */
function playDiceHit(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  gain: number,
  pan: number,
) {
  const dur = 0.008 + Math.random() * 0.014; // 8–22 ms

  // ── Mid crack ──
  const src1 = noiseSource(ctx);
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass';
  bp1.frequency.value = 1500 + Math.random() * 2000;
  bp1.Q.value = 1.2 + Math.random() * 1.5;
  const env1 = ctx.createGain();
  env1.gain.setValueAtTime(gain, t);
  env1.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  // ── High snap ──
  const src2 = noiseSource(ctx);
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass';
  bp2.frequency.value = 5000 + Math.random() * 4000;
  bp2.Q.value = 0.8 + Math.random() * 1.0;
  const env2 = ctx.createGain();
  const highGain = gain * (0.3 + Math.random() * 0.35);
  env2.gain.setValueAtTime(highGain, t);
  env2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);

  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;

  src1.connect(bp1).connect(env1).connect(panner);
  src2.connect(bp2).connect(env2).connect(panner);
  panner.connect(dest);

  startNoise(src1, t, dur + 0.01);
  startNoise(src2, t, dur + 0.01);
}

/* ───────────────────────────────────────────────
   DICE‑ON‑CUP WALL
   Slightly longer decay (~30–50 ms) and more mid
   emphasis — the cup's leather / hard shell absorbs
   some highs and adds a muffled "thock."
   ─────────────────────────────────────────────── */
function playCupHit(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  gain: number,
) {
  const dur = 0.025 + Math.random() * 0.025;

  const src = noiseSource(ctx);

  // Low‑mid emphasis for the muffled cup wall sound
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 800 + Math.random() * 600;
  bp.Q.value = 1.5 + Math.random() * 1.0;

  // Gentle low‑pass to soften it (cup dampens highs)
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000 + Math.random() * 1500;
  lp.Q.value = 0.5;

  const env = ctx.createGain();
  env.gain.setValueAtTime(gain * 0.6, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(bp).connect(lp).connect(env).connect(dest);
  startNoise(src, t, dur + 0.01);
}

/* ───────────────────────────────────────────────
   TABLE THUD
   Low‑frequency noise burst — the felt‑covered
   table absorbs highs completely. Very short and
   dull, like a soft "boof."
   ─────────────────────────────────────────────── */
function playTableThud(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  gain: number,
) {
  const dur = 0.04 + Math.random() * 0.03;

  const src = noiseSource(ctx);

  // Very low bandpass — the table is felt, so mostly sub‑bass thump
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 250 + Math.random() * 150;
  lp.Q.value = 0.8;

  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(lp).connect(env).connect(dest);
  startNoise(src, t, dur + 0.01);
}

/* ───────────────────────────────────────────────
   ROLLING FRICTION
   Continuous, very quiet, modulated noise bed
   that simulates dice tumbling on felt.
   Uses amplitude modulation (via gain scheduling)
   instead of an oscillator LFO.
   ─────────────────────────────────────────────── */
function playRolling(
  ctx: AudioContext,
  dest: AudioNode,
  startTime: number,
  duration: number,
  gain: number,
) {
  const src = noiseSource(ctx);

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200 + Math.random() * 800;
  bp.Q.value = 0.6;

  const env = ctx.createGain();
  // Schedule irregular amplitude bumps to simulate tumbling
  const step = 0.04;
  for (let off = 0; off < duration; off += step) {
    const progress = off / duration;
    // Fade in, sustain, fade out
    let envelope: number;
    if (progress < 0.1) envelope = progress / 0.1;
    else if (progress > 0.7) envelope = (1 - progress) / 0.3;
    else envelope = 1;
    // Random variation on top
    const v = gain * envelope * (0.3 + Math.random() * 0.7);
    env.gain.setValueAtTime(v, startTime + off);
  }
  env.gain.setValueAtTime(0.0001, startTime + duration);

  src.connect(bp).connect(env).connect(dest);
  startNoise(src, startTime, duration + 0.05);
}

/* ───────────────────────────────────────────────
   COMPOUND COLLISION
   Layers a dice hit with optional cup hit; random
   chance of a faint secondary bounce 5–15 ms later.
   ─────────────────────────────────────────────── */
function playCollision(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  intensity: number, // 0–1
  hitCup: boolean,
  pan: number,
) {
  const g = (0.2 + intensity * 0.6) * (0.7 + Math.random() * 0.3);
  playDiceHit(ctx, dest, t, g, pan);

  if (hitCup) {
    playCupHit(ctx, dest, t + Math.random() * 0.003, g * 0.5);
  }

  // ~30 % chance of a faint micro-bounce right after
  if (Math.random() < 0.3) {
    const delay = 0.005 + Math.random() * 0.012;
    playDiceHit(ctx, dest, t + delay, g * 0.25, pan + (Math.random() - 0.5) * 0.3);
  }
}

/* ═══════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════ */

export function playDiceRattle(durationSec = 1.5): void {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Master bus: compressor → gain → destination
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 10;
  comp.ratio.value = 8;
  comp.attack.value = 0.001;
  comp.release.value = 0.08;

  const master = ctx.createGain();
  master.gain.value = 0.8;

  master.connect(comp);
  comp.connect(ctx.destination);

  // ── Background rolling noise bed ──
  playRolling(ctx, master, now, durationSec, 0.045);

  // ── Collision sequence ──
  // Three phases with progressively different densities
  const P1 = 0.25;                       // initial burst end
  const P2 = durationSec * 0.7;          // sustained shaking end
  let t = 0;

  while (t < durationSec) {
    const pan = (Math.random() - 0.5) * 1.4;

    if (t < P1) {
      /* Phase 1 — violent initial rattle: very dense, loud */
      const intensity = 0.75 + Math.random() * 0.25;
      // Fire 2–4 near‑simultaneous hits (five dice bouncing everywhere)
      const n = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < n; s++) {
        const jitter = Math.random() * 0.006;
        const p = (Math.random() - 0.5) * 1.2;
        playCollision(ctx, master, now + t + jitter, intensity, Math.random() < 0.5, p);
      }
      t += 0.014 + Math.random() * 0.026; // 14–40 ms gaps

    } else if (t < P2) {
      /* Phase 2 — sustained shaking: medium density, medium volume */
      const progress = (t - P1) / (P2 - P1);
      const intensity = 0.35 + (1 - progress) * 0.4 + Math.random() * 0.2;
      const n = 1 + Math.floor(Math.random() * 2);
      for (let s = 0; s < n; s++) {
        const jitter = Math.random() * 0.01;
        const p = (Math.random() - 0.5) * 1.0;
        playCollision(ctx, master, now + t + jitter, intensity, Math.random() < 0.4, p);
      }
      t += 0.03 + Math.random() * 0.06 + progress * 0.04;

    } else {
      /* Phase 3 — settling: sparse, quiet */
      const progress = (t - P2) / (durationSec - P2);
      const intensity = 0.1 + (1 - progress) * 0.3;
      playCollision(ctx, master, now + t, intensity, Math.random() < 0.25, pan);
      t += 0.07 + Math.random() * 0.12 + progress * 0.18;
    }
  }

  // ── Final settle clicks: 3–5 diminishing "tock…tock…tock" ──
  const settleN = 3 + Math.floor(Math.random() * 3);
  let st = durationSec - 0.22;
  for (let i = 0; i < settleN; i++) {
    const g = 0.3 * Math.pow(0.5, i);
    const p = (Math.random() - 0.5) * 0.5;
    playDiceHit(ctx, master, now + st, g, p);
    // faint micro‑bounce
    if (Math.random() < 0.5) {
      playDiceHit(ctx, master, now + st + 0.008 + Math.random() * 0.006, g * 0.2, p);
    }
    st += 0.055 + Math.random() * 0.04 + i * 0.035;
  }

  // ── Final table thud ──
  playTableThud(ctx, master, now + durationSec - 0.06, 0.25);
}

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  getCtx();
}

export function playHupen(strength = 1) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const master = c.createGain();
  master.gain.value = 0.22 * strength;
  master.connect(c.destination);

  // Two detuned square oscillators for a boat-horn texture
  const freqs = [180, 240];
  for (const f of freqs) {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f * 0.9, now);
    osc.frequency.linearRampToValueAtTime(f, now + 0.04);

    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.5, now + 0.03);
    g.gain.setValueAtTime(0.5, now + 0.45);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + 0.8);
  }
}

export function playTrampeln(strength = 1) {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;

  // Noise burst for a stomp / thump
  const dur = 0.22;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;

  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 320;

  const g = c.createGain();
  g.gain.value = 0.45 * strength;

  src.connect(lp);
  lp.connect(g);
  g.connect(c.destination);
  src.start(now);

  // Low thump sine
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
  const og = c.createGain();
  og.gain.setValueAtTime(0.5 * strength, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(og);
  og.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.25);
}

import whaleSound from '../assets/whale.mp3';
import crashSound from '../assets/crash.mp3';

let ctx: AudioContext | null = null;
const audioCache: Record<string, AudioBuffer> = {};

interface WindowWithAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as WindowWithAudioContext).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  getCtx();
}

async function loadSound(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  if (audioCache[url]) return audioCache[url];
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await c.decodeAudioData(arrayBuffer);
    audioCache[url] = audioBuffer;
    return audioBuffer;
  } catch (e) {
    console.error(`Failed to load sound: ${url}`, e);
    return null;
  }
}

function playBuffer(c: AudioContext, buffer: AudioBuffer, gain = 1) {
  const source = c.createBufferSource();
  source.buffer = buffer;
  const g = c.createGain();
  g.gain.value = gain;
  source.connect(g);
  g.connect(c.destination);
  source.start(0);
}

export async function playWhaleSound(strength = 1) {
  const c = getCtx();
  if (!c) return;
  const buffer = await loadSound(c, whaleSound);
  if (buffer) playBuffer(c, buffer, 0.4 * strength);
}

export async function playCrashSound(strength = 1) {
  const c = getCtx();
  if (!c) return;
  const buffer = await loadSound(c, crashSound);
  if (buffer) playBuffer(c, buffer, 0.35 * strength);
}

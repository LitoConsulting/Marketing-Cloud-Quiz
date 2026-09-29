'use client';

// Tiny synthesized sound effects for the big screen. No audio files to host,
// and browsers only allow audio after a click, hence the explicit enable toggle.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export async function unlockAudio(): Promise<boolean> {
  const c = audio();
  if (!c) return false;
  if (c.state === 'suspended') await c.resume();
  return c.state === 'running';
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.18) {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sounds = {
  tick: () => tone(880, 0, 0.08, 'square', 0.06),
  timeUp: () => {
    tone(330, 0, 0.25, 'sawtooth', 0.12);
    tone(220, 0.22, 0.4, 'sawtooth', 0.12);
  },
  reveal: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle')),
  whoosh: () => tone(392, 0, 0.3, 'triangle', 0.12),
  podium: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.12, 0.4, 'triangle')),
  winner: () =>
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.14, i === 5 ? 0.9 : 0.3, 'triangle', 0.2)),
  join: () => tone(1175, 0, 0.12, 'sine', 0.08),
};

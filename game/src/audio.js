// Sound: everything is synthesised with WebAudio — no audio files.
// Engine hum follows the throttle, wind follows speed, and events get a chime.
export function makeAudio() {
  return {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    windSrc: null,
    windGain: null,
    windFilter: null,
    muted: false,
    started: false,
  };
}

function ensureAudio(audio) {
  if (audio.ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);

    // Engine: two detuned sawtooths through a low-pass, gain by throttle.
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 62;
    const engineOsc2 = audio.ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 93;
    const engineFilter = audio.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0.0;
    audio.engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    engineOsc2.start();
    audio.engineOsc2 = engineOsc2;

    // Wind: looped noise buffer through a band-pass.
    const len = audio.ctx.sampleRate * 2;
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    audio.windSrc = audio.ctx.createBufferSource();
    audio.windSrc.buffer = buffer;
    audio.windSrc.loop = true;
    audio.windFilter = audio.ctx.createBiquadFilter();
    audio.windFilter.type = 'bandpass';
    audio.windFilter.frequency.value = 700;
    audio.windFilter.Q.value = 0.6;
    audio.windGain = audio.ctx.createGain();
    audio.windGain.gain.value = 0.0;
    audio.windSrc.connect(audio.windFilter);
    audio.windFilter.connect(audio.windGain);
    audio.windGain.connect(audio.master);
    audio.windSrc.start();
    audio.started = true;
    return true;
  } catch {
    return false;
  }
}

export function resumeAudio(audio) {
  if (!ensureAudio(audio)) return;
  if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
}

// Called every frame with the live flight state.
export function updateEngineSound(audio, plane, flying) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime;
  const target = flying ? 0.05 + plane.throttle * 0.11 : 0.0;
  audio.engineGain.gain.setTargetAtTime(target, t, 0.15);
  audio.engineOsc.frequency.setTargetAtTime(52 + plane.throttle * 58, t, 0.1);
  audio.engineOsc2.frequency.setTargetAtTime(78 + plane.throttle * 84, t, 0.1);
  const wind = flying ? Math.min(0.14, (plane.speed / 130) * 0.14) : 0;
  audio.windGain.gain.setTargetAtTime(wind, t, 0.2);
  audio.windFilter.frequency.setTargetAtTime(500 + plane.speed * 6, t, 0.2);
}

function blip(audio, freq, when, dur, type, vol) {
  if (!audio.ctx || audio.muted) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

export function playRingChime(audio, centre) {
  if (!ensureAudio(audio)) return;
  const t = audio.ctx.currentTime;
  blip(audio, 880, t, 0.5, 'sine', 0.22);
  blip(audio, 1318, t + 0.08, 0.5, 'sine', 0.18);
  if (centre) blip(audio, 1760, t + 0.16, 0.6, 'sine', 0.16);
}

export function playThud(audio) {
  if (!ensureAudio(audio)) return;
  const t = audio.ctx.currentTime;
  blip(audio, 70, t, 0.35, 'sine', 0.4);
  blip(audio, 46, t + 0.05, 0.4, 'sine', 0.3);
}

export function playCrash(audio) {
  if (!ensureAudio(audio)) return;
  const t = audio.ctx.currentTime;
  blip(audio, 180, t, 0.5, 'sawtooth', 0.2);
  blip(audio, 60, t + 0.1, 0.7, 'sawtooth', 0.25);
}

export function playClick(audio) {
  if (!ensureAudio(audio)) return;
  blip(audio, 660, audio.ctx.currentTime, 0.12, 'sine', 0.15);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}

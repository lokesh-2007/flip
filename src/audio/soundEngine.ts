import { EnvEventType, SpecialPowerType, WarpEffectType } from '../types/game';

const MUTE_STORAGE_KEY = 'cyber_trench_muted_v1';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;

  // Synthesized synthwave pulse state
  private beatTimer: number = 0;
  private beatStep: number = 0;
  private intensityEnvelope: number = 0.15;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      this.muted = false;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(mute));
    } catch {
      // Ignore storage errors
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const duration = 0.35;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Advances procedural synthwave pulse when actively playing and returns current intensity [0..1].
   * Works visually even when audio is muted so dynamic color-shifting stays rhythmic.
   */
  public stepMusicPulse(dt: number, isPlaying: boolean, speedMultiplier: number): number {
    this.intensityEnvelope = Math.max(0.12, this.intensityEnvelope - dt * 2.1);

    if (!isPlaying) {
      return this.intensityEnvelope * 0.5;
    }

    const bpm = 128 * Math.min(1.45, Math.max(0.75, speedMultiplier));
    const sixteenthDur = 60 / bpm / 4;
    this.beatTimer += dt;

    if (this.beatTimer >= sixteenthDur) {
      this.beatTimer -= sixteenthDur;
      const step = this.beatStep % 16;
      this.beatStep += 1;

      const isKick = step % 4 === 0;
      const isBass = step % 2 === 1;
      const isArp = step % 4 === 2;

      if (isKick) {
        this.intensityEnvelope = Math.min(1.0, this.intensityEnvelope + 0.58);
        this.playSynthKick();
      } else if (isBass) {
        this.intensityEnvelope = Math.min(1.0, this.intensityEnvelope + 0.22);
        this.playSynthBass(step, speedMultiplier);
      } else if (isArp) {
        this.intensityEnvelope = Math.min(1.0, this.intensityEnvelope + 0.16);
        this.playSynthArp(step, speedMultiplier);
      }
    }

    return Math.min(1, this.intensityEnvelope);
  }

  public getIntensity(): number {
    return Math.min(1, this.intensityEnvelope);
  }

  private playSynthKick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  private playSynthBass(step: number, speedMult: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bassNotes = [55, 55, 65.41, 73.42]; // A1, A1, C2, D2
    const freq = bassNotes[Math.floor(step / 4) % bassNotes.length] * (speedMult > 1.15 ? 1.122 : 1);

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.09);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  private playSynthArp(step: number, speedMult: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const arpNotes = [220, 261.63, 329.63, 392.0];
    const freq = arpNotes[(step >> 2) % arpNotes.length] * (speedMult > 1.15 ? 1.25 : 1);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playTurn(ascending: boolean): void {
    this.intensityEnvelope = Math.min(1, this.intensityEnvelope + 0.12);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    if (ascending) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.045);
    } else {
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);
    }

    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playCollectGold(comboIndex: number): void {
    this.intensityEnvelope = Math.min(1, this.intensityEnvelope + 0.18);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const freq = scale[Math.min(comboIndex % scale.length, scale.length - 1)];

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc1.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.08);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.17);
    osc2.stop(now + 0.17);
  }

  public playCollectStar(): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playCheckpoint(): void {
    this.intensityEnvelope = 0.85;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 659.25];
    notes.forEach((freq, i) => {
      const t = now + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  public playSpeedGate(boost: boolean): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    if (boost) {
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
    } else {
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.16);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playWarpGate(effect: WarpEffectType): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    if (effect === 'invertCam') {
      osc1.frequency.setValueAtTime(760, now);
      osc1.frequency.exponentialRampToValueAtTime(190, now + 0.34);
      osc2.frequency.setValueAtTime(380, now);
      osc2.frequency.exponentialRampToValueAtTime(920, now + 0.34);
    } else if (effect === 'mirrorCam') {
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(840, now + 0.16);
      osc1.frequency.exponentialRampToValueAtTime(420, now + 0.32);
      osc2.frequency.setValueAtTime(640, now);
      osc2.frequency.exponentialRampToValueAtTime(310, now + 0.32);
    } else {
      const startF = effect === 'shiftLeft' ? 540 : 340;
      const endF = effect === 'shiftLeft' ? 280 : 680;
      osc1.frequency.setValueAtTime(startF, now);
      osc1.frequency.exponentialRampToValueAtTime(endF, now + 0.26);
      osc2.frequency.setValueAtTime(startF * 1.5, now);
      osc2.frequency.exponentialRampToValueAtTime(endF * 1.5, now + 0.26);
    }

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.Q.setValueAtTime(1.8, now);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  public playSpecialPower(powerType: SpecialPowerType): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (powerType === 'slowmo' || powerType === 'stasis') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.28);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(370, now);
      osc2.frequency.exponentialRampToValueAtTime(105, now + 0.28);
    } else if (powerType === 'aegis' || powerType === 'deflect' || powerType === 'revive') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(powerType === 'revive' ? 440 : 320, now);
      osc.frequency.exponentialRampToValueAtTime(powerType === 'revive' ? 1180 : 880, now + 0.26);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(powerType === 'revive' ? 660 : 480, now);
      osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.26);
    } else if (powerType === 'breaker' || powerType === 'pulse') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.22);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(140, now);
      osc2.frequency.exponentialRampToValueAtTime(520, now + 0.22);
    } else if (powerType === 'warp') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.26);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(480, now);
      osc2.frequency.exponentialRampToValueAtTime(1120, now + 0.26);
    } else if (powerType === 'barrage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.24);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(330, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.24);
    } else if (powerType === 'smash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.3);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(380, now);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.28);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(540, now);
      osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.22);
    }

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.32);
    osc2.stop(now + 0.32);
  }

  public playBarrageShot(): void {
    this.intensityEnvelope = Math.min(1, this.intensityEnvelope + 0.14);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.085);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playSmashImpact(): void {
    this.intensityEnvelope = Math.min(1, this.intensityEnvelope + 0.28);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playShieldPop(): void {
    this.intensityEnvelope = 0.95;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.24);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playEnvWarning(type: EnvEventType): void {
    this.intensityEnvelope = Math.min(1, this.intensityEnvelope + 0.35);
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = type === 'solarFlare' ? 660 : type === 'gravityShift' ? 520 : 460;
    for (let i = 0; i < 2; i++) {
      const start = now + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * (i === 1 ? 1.25 : 1), start);
      gain.gain.setValueAtTime(0.085, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  }

  public playEnvEventStart(type: EnvEventType): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (type === 'glitchStorm') {
      const freqs = [780, 310, 960, 240];
      freqs.forEach((f, idx) => {
        const t = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.065, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      });
    } else if (type === 'gravityShift') {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.34);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(220, now);
      osc2.frequency.exponentialRampToValueAtTime(520, now + 0.34);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.38);
      osc2.stop(now + 0.38);
    } else if (type === 'solarFlare') {
      [440, 554.37, 659.25].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.03);
        gain.gain.setValueAtTime(0.09, now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.34);
      });
    } else {
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.28);
      filter.Q.setValueAtTime(2.4, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.32);
    }
  }

  public playCrash(): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.28);
    oscGain.gain.setValueAtTime(0.24, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.Q.setValueAtTime(1.2, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.28);
  }

  public playLevelComplete(): void {
    this.intensityEnvelope = 1.0;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    fanfare.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const duration = idx === fanfare.length - 1 ? 0.55 : 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === fanfare.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  }
}

export const soundEngine = new SoundEngine();

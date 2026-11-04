/**
 * Audio Engine: WebAudio Radio Sound Effects & iOS Unlocker
 * Generates tactile walkie-talkie press/release squelch, clicks, and roger beeps
 * without external asset files.
 */

class RadioAudioEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private soundEnabled: boolean = true;
  private volume: number = 0.7;

  constructor() {
    // Lazy initialize to avoid autoplay warnings before user gesture
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  /**
   * Unlocks AudioContext on user interaction (Required for iOS Safari & PWA)
   */
  public async unlock(): Promise<boolean> {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Play a 1-sample silent buffer to unlock hardware buffer on iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      this.isUnlocked = true;
      return true;
    } catch (err) {
      console.warn('AudioContext unlock failed:', err);
      return false;
    }
  }

  public getUnlockedStatus(): boolean {
    return this.isUnlocked && this.ctx?.state === 'running';
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Radio Key-Down (PTT Pressed)
   * High-pass filtered noise burst + subtle relay click
   */
  public playPressSquelch() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const duration = 0.08; // 80ms squelch tail

      // 1. Noise Generator for Static Burst
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      // Bandpass / High-pass filter for crisp radio character
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now);
      filter.Q.setValueAtTime(3, now);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.28 * this.volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);

      // 2. Tactile relay click (low frequency click)
      const osc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.025);

      clickGain.gain.setValueAtTime(0.2 * this.volume, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(clickGain);
      clickGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {
      console.warn('Could not play press squelch', e);
    }
  }

  /**
   * Radio Key-Up (PTT Released)
   * Roger beep chirp followed by a distinctive squelch tail ("kshh")
   */
  public playReleaseSquelch() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Roger Beep (tactile high tone chirp: 1100Hz -> 1350Hz)
      const rogerOsc = ctx.createOscillator();
      const rogerGain = ctx.createGain();
      rogerOsc.type = 'sine';
      rogerOsc.frequency.setValueAtTime(1150, now);
      rogerGain.gain.setValueAtTime(0.12 * this.volume, now);
      rogerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      rogerOsc.connect(rogerGain);
      rogerGain.connect(ctx.destination);
      rogerOsc.start(now);
      rogerOsc.stop(now + 0.045);

      // 2. Radio Squelch Tail (120ms filtered noise burst "kshh")
      const noiseStartTime = now + 0.035;
      const duration = 0.14;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, noiseStartTime);
      filter.Q.setValueAtTime(2.5, noiseStartTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, noiseStartTime);
      noiseGain.gain.linearRampToValueAtTime(0.35 * this.volume, noiseStartTime + 0.015);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, noiseStartTime + duration);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(noiseStartTime);
      whiteNoise.stop(noiseStartTime + duration);
    } catch (e) {
      console.warn('Could not play release squelch', e);
    }
  }

  /**
   * Channel frequency tuning / tactile rotary tick
   */
  public playTuningTick() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.03);

      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Ignored
    }
  }

  /**
   * Tactile click tone for iOS where navigator.vibrate is disabled
   */
  public playTactileClick() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.018);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.018);
    } catch {
      // Ignored
    }
  }
}

export const radioAudio = new RadioAudioEngine();

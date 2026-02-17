// Road Shooter - Sound System (Web Audio API, procedural)
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.3;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Helper: play a tone
  tone(freq, duration, type = 'square', vol = 1) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(this.volume * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  // Helper: noise burst
  noise(duration, vol = 0.5) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(this.volume * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
  }

  // --- Game Sounds ---

  shoot() {
    this.tone(800, 0.06, 'square', 0.15);
  }

  enemyHit() {
    this.tone(300, 0.05, 'sawtooth', 0.2);
  }

  enemyDeath() {
    this.tone(200, 0.1, 'sawtooth', 0.3);
    this.noise(0.08, 0.2);
  }

  itemCollect() {
    this.tone(600, 0.08, 'sine', 0.3);
    this.tone(900, 0.08, 'sine', 0.2);
  }

  gatePass() {
    this.tone(500, 0.1, 'sine', 0.3);
    this.tone(700, 0.15, 'sine', 0.25);
  }

  bossHit() {
    this.tone(150, 0.08, 'sawtooth', 0.35);
  }

  bossDeath() {
    this.noise(0.3, 0.5);
    this.tone(100, 0.4, 'sawtooth', 0.4);
    this.tone(60, 0.6, 'sawtooth', 0.3);
  }

  explosion() {
    this.noise(0.2, 0.5);
    this.tone(80, 0.25, 'sawtooth', 0.3);
  }

  damageTaken() {
    this.tone(150, 0.12, 'square', 0.3);
  }

  uiClick() {
    this.tone(1000, 0.04, 'sine', 0.15);
  }

  stageIntro() {
    this.tone(400, 0.15, 'sine', 0.25);
    setTimeout(() => this.tone(600, 0.2, 'sine', 0.3), 150);
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.2, 'sine', 0.3), i * 120);
    });
  }

  gameOver() {
    this.tone(300, 0.2, 'sawtooth', 0.3);
    setTimeout(() => this.tone(200, 0.3, 'sawtooth', 0.25), 200);
    setTimeout(() => this.tone(120, 0.5, 'sawtooth', 0.2), 400);
  }
}

// Singleton
const Sound = new SoundSystem();

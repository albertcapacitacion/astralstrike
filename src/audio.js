// Original synthesized arcade sounds and a quiet 16-step flight sequence.
// Audio starts only after a player gesture. No downloaded audio assets.
export class AudioEngine {
  constructor() { this.enabled = true; this.context = null; this.step = 0; this.nextNote = 0; }
  async unlock() {
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? .24 : 0;
      this.master.connect(this.context.destination);
    }
    try { await this.context.resume(); } catch { /* Some browsers require another gesture. */ }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.context) this.master.gain.setTargetAtTime(this.enabled ? .24 : 0, this.context.currentTime, .02);
  }
  tone(frequency, duration, volume = .1, type = 'square', end = frequency) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(10, frequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(10, end), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(this.master);
    oscillator.start(now); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  event(type) {
    if (type === 'shot') this.tone(1300, .065, .045, 'triangle', 700);
    if (type === 'kill') this.tone(95, .19, .27, 'sawtooth', 22);
    if (type === 'damage') this.tone(190, .27, .25, 'sawtooth', 42);
    if (type === 'bomb') { this.tone(90, .8, .65, 'sawtooth', 12); this.tone(700, .45, .18, 'triangle', 55); }
    if (type === 'pickup') { this.tone(660, .13, .25, 'sine', 1320); }
    if (type === 'warning') this.tone(440, .8, .16, 'square', 220);
    if (type === 'stage' || type === 'stageClear' || type === 'victory') this.tone(330, .7, .2, 'triangle', 1320);
  }
  update(playing, stage) {
    if (!this.context || !playing || !this.enabled) return;
    const t = this.context.currentTime;
    if (t < this.nextNote) return;
    this.nextNote = t + .21;
    const notes = [0, 12, 7, 12, 3, 12, 7, 15, 0, 12, 7, 12, 5, 12, 10, 7];
    const hz = 55 * 2 ** ((notes[this.step % 16] + stage * 2) / 12);
    this.tone(hz, .16, .11, 'triangle');
    if (this.step % 4 === 0) this.tone(75, .08, .15, 'sine', 25);
    this.step++;
  }
}

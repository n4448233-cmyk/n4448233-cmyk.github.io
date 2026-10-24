/* ============ МОЗГОБУМ! — звук (Web Audio API, всё синтезируется) ============ */
const Sfx = {
  ctx: null,
  master: null,
  muted: localStorage.getItem('mb_muted') === '1',

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('mb_muted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },

  /* приглушение на время рекламы Яндекса */
  duck(on) {
    if (this.master && !this.muted) this.master.gain.value = on ? 0 : 0.5;
  },

  /* короткий осциллятор-блип: тип, стартовая частота -> конечная, длительность */
  blip(type, f0, f1, dur, vol, delay) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },

  /* шумовой всплеск (для попов и промахов) */
  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  },

  /* тап по нейро-мордочке: весёлый блип, высота растёт с комбо */
  tap(combo) {
    const step = Math.min(combo || 1, 10);
    const f = 420 + step * 55;
    this.blip('sine', f, f * 1.6, 0.14, 0.5);
    this.blip('triangle', f * 2, f * 2.4, 0.08, 0.18, 0.02);
  },

  /* мордочка лопается с особым сочным попом */
  pop() {
    this.noise(0.09, 0.35, 1400);
    this.blip('square', 900, 300, 0.1, 0.12);
  },

  /* промах / тап мимо */
  miss() {
    this.blip('sawtooth', 220, 90, 0.18, 0.22);
    this.noise(0.12, 0.15, 400);
  },

  /* тап по тучке — обидный раскатик */
  cloud() {
    this.noise(0.3, 0.4, 250);
    this.blip('sawtooth', 160, 60, 0.3, 0.25);
  },

  /* бонусное время */
  bonus() {
    this.blip('sine', 660, 660, 0.09, 0.35);
    this.blip('sine', 880, 880, 0.09, 0.35, 0.09);
    this.blip('sine', 1320, 1320, 0.16, 0.35, 0.18);
  },

  /* штраф-тучка */
  penalty() {
    this.blip('square', 330, 330, 0.1, 0.3);
    this.blip('square', 262, 262, 0.1, 0.3, 0.11);
    this.blip('square', 196, 196, 0.2, 0.3, 0.22);
  },

  /* МОЗГОВЗРЫВ — режим неистовства */
  frenzy() {
    this.blip('sawtooth', 300, 1200, 0.35, 0.3);
    this.blip('square', 150, 600, 0.35, 0.2, 0.05);
    this.noise(0.35, 0.3, 2000);
  },

  /* финиш раунда: фанфара по числу звёзд */
  finish(stars) {
    const notes = [523, 659, 784, 1047];
    const n = 2 + Math.min(stars, 2);
    for (let i = 0; i < n; i++) {
      this.blip('triangle', notes[i], notes[i], 0.18, 0.4, i * 0.16);
    }
  },

  /* клик по кнопкам UI */
  click() {
    this.blip('sine', 760, 520, 0.07, 0.25);
  },

  /* тик последних секунд таймера */
  tick() {
    this.blip('sine', 950, 950, 0.05, 0.2);
  },

  /* ---- фоновый бит: kick + bass, темп растёт в МОЗГОВЗРЫВЕ ---- */
  _music: null,

  musicStart() {
    this.resume();
    if (!this.ctx || this._music) return;
    const BASS = [110, 110, 146.8, 110, 130.8, 130.8, 98, 98];
    let step = 0;
    let nextT = this.ctx.currentTime + 0.1;
    const m = this._music = { frenzy: false, timer: 0 };
    const sched = () => {
      if (!this._music) return;
      const eighth = m.frenzy ? 0.14 : 0.185;
      while (nextT < this.ctx.currentTime + 0.16) {
        const s = step % 8;
        const when = Math.max(0, nextT - this.ctx.currentTime);
        if (s % 2 === 0) this.blip('sine', 150, 48, 0.12, 0.5, when);
        this.blip('triangle', BASS[s], BASS[s], 0.15, 0.14, when);
        step++; nextT += eighth;
      }
      m.timer = setTimeout(sched, 60);
    };
    sched();
  },

  musicFrenzy(on) { if (this._music) this._music.frenzy = on; },

  musicStop() {
    if (this._music) { clearTimeout(this._music.timer); this._music = null; }
  },
};

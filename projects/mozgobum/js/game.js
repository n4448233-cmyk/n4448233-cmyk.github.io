/* ============ МОЗГОБУМ! — ядро игры ============ */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const Game = {
  W: 0, H: 0, dpr: 1,
  state: 'menu',           // menu | play | pause | over
  score: 0, time: 60, combo: 0, comboTimer: 0,
  frenzy: 0,               // оставшиеся сек. МОЗГОВЗРЫВА
  spawnTimer: 0, elapsed: 0,
  faces: [],               // нейро-мордочки
  clouds: [],              // тучки
  parts: [],               // частицы-взрывы
  rings: [],               // расходящиеся кольца-волны
  trail: [],               // звёздный шлейф за пальцем
  floats: [],              // всплывающий текст (+5 сек, -3 сек...)
  stars: [],               // фон-конфетка
  look: { x: 0, y: 0 },    // куда смотрят глазки
  flash: 0,                // вспышка экрана (золото / frenzy)
  _glowCache: {},
  _lastSec: -1,            // чтобы тикать звук раз в секунду
  shake: 0,

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    canvas.width = Math.floor(this.W * this.dpr);
    canvas.height = Math.floor(this.H * this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.makeStars();
  },

  /* фон — космос-конфетка: звёздочки-конфетти */
  makeStars() {
    this.stars = [];
    const n = Math.floor((this.W * this.H) / 9000);
    const cols = ['#ffd93d', '#ff6b9d', '#4ecdc4', '#a3e635', '#b9a6ff', '#ff9f43'];
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random() * this.W, y: Math.random() * this.H,
        r: 1 + Math.random() * 2.4,
        c: cols[Math.floor(Math.random() * cols.length)],
        tw: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 1.2,
      });
    }
  },

  /* ---------- главный цикл ---------- */
  tick(now) {
    const dt = Math.min((now - (this._last || now)) / 1000, 0.05);
    this._last = now;
    this.update(dt);
    this.draw(now / 1000);
    requestAnimationFrame((t) => this.tick(t));
  },

  update(dt) {
    // звёздочки мерцают всегда
    for (const s of this.stars) s.tw += dt * s.sp;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    // частицы и всплывашки живут даже на паузе-экранах
    this.updateFx(dt);
    if (this.state !== 'play') return;
    this.elapsed += dt;
    this.time -= dt;
    if (this.frenzy > 0) {
      this.frenzy -= dt;
      if (this.frenzy <= 0) Sfx.musicFrenzy(false);
    }
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    if (this.time <= 0) { this.time = 0; this.endRound(); return; }
    // тик-тик на последних секундах
    const sec = Math.ceil(this.time);
    if (sec <= 5 && sec !== this._lastSec) { this._lastSec = sec; Sfx.tick(); }
    this.updateWave(dt);
    this.updateFaces(dt);
    this.updateClouds(dt);
    this.updateHud();
  },

  /* ---------- спавн: волны мордочек с прогрессией ---------- */
  updateWave(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const e = this.elapsed;
    const rate = Math.max(0.35, 1.15 - e * 0.011);       // интервал спавна
    this.spawnTimer = rate * (0.7 + Math.random() * 0.6);
    if (this.frenzy > 0) this.spawnTimer *= 0.45;         // в неистовстве — рой
    // вероятность тучки растёт со временем, но не свыше 30%
    const cloudChance = Math.min(0.30, 0.10 + e * 0.0035);
    if (this.clouds.length < 3 && Math.random() < cloudChance) this.spawnCloud();
    else if (this.faces.length < (this.frenzy > 0 ? 9 : 6)) this.spawnFace();
  },

  spawnFace() {
    const r = Math.max(34, Math.min(this.W, this.H) * 0.058); // радиус
    const m = r + 8;
    const gold = this.elapsed > 5 && Math.random() < 0.07;    // золотой мозг — редкий подарок
    const types = ['pink', 'mint', 'lemon', 'violet'];
    const speed = (55 + this.elapsed * 2.2 + Math.random() * 40) * (this.frenzy > 0 ? 1.35 : 1);
    const ang = Math.random() * Math.PI * 2;
    this.faces.push({
      x: m + Math.random() * (this.W - m * 2),
      y: m + Math.random() * (this.H - m * 2),
      r, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      wob: Math.random() * Math.PI * 2,           // фаза покачивания
      life: gold ? 4 : 6.5 - Math.min(3, this.elapsed * 0.04), // исчезает сама
      born: this.elapsed,
      hue: gold ? 'gold' : types[Math.floor(Math.random() * types.length)],
      face: Math.floor(Math.random() * 3),        // вариант рожицы
      gold,
      sc: 0,                                       // анимация появления
    });
  },

  updateFaces(dt) {
    for (let i = this.faces.length - 1; i >= 0; i--) {
      const f = this.faces[i];
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.wob += dt * 6; f.sc = Math.min(1, f.sc + dt * 4);
      if (f.x < f.r || f.x > this.W - f.r) { f.vx *= -1; f.x = Math.max(f.r, Math.min(this.W - f.r, f.x)); }
      if (f.y < f.r || f.y > this.H - f.r) { f.vy *= -1; f.y = Math.max(f.r, Math.min(this.H - f.r, f.y)); }
      f.life -= dt;
      if (f.life <= 0) this.faces.splice(i, 1);   // уплыл — без штрафа
    }
  },

  /* ---------- тучки: не трогать! ---------- */
  spawnCloud() {
    const r = Math.max(40, Math.min(this.W, this.H) * 0.085);
    const m = r + 10;
    const speed = 35 + Math.random() * 45;
    const ang = Math.random() * Math.PI * 2;
    this.clouds.push({
      x: m + Math.random() * (this.W - m * 2),
      y: m + Math.random() * (this.H - m * 2),
      r, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      wob: Math.random() * Math.PI * 2,
      life: 7 + Math.random() * 3,
      sc: 0,
    });
  },

  updateClouds(dt) {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.wob += dt * 3; c.sc = Math.min(1, c.sc + dt * 3);
      if (c.x < c.r || c.x > this.W - c.r) { c.vx *= -1; c.x = Math.max(c.r, Math.min(this.W - c.r, c.x)); }
      if (c.y < c.r || c.y > this.H - c.r) { c.vy *= -1; c.y = Math.max(c.r, Math.min(this.H - c.r, c.y)); }
      c.life -= dt;
      if (c.life <= 0) this.clouds.splice(i, 1);
    }
  },

  /* ---------- частицы, кольца, шлейф, всплывающий текст ---------- */
  burst(x, y, col, n) {
    this.rings.push({ x, y, r: 10, t: 0, life: 0.35, c: col });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 220;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        r: 2 + Math.random() * 4, c: col,
        life: 0.5 + Math.random() * 0.4, t: 0,
      });
    }
  },

  /* радуга-салют: для золотых и МОЗГОВЗРЫВА */
  rainbowBurst(x, y, n) {
    const cols = ['#ffd93d', '#ff6b9d', '#4ecdc4', '#a3e635', '#ff9f43', '#45aaf2', '#a55eea'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const sp = 120 + Math.random() * 260;
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        r: 2.5 + Math.random() * 4.5, c: cols[i % cols.length],
        life: 0.6 + Math.random() * 0.5, t: 0,
      });
    }
    this.rings.push({ x, y, r: 10, t: 0, life: 0.5, c: '#ffd93d' });
    this.rings.push({ x, y, r: 4,  t: 0, life: 0.6, c: '#ff6b9d' });
  },

  addTrail(x, y) {
    const cols = ['#ffd93d', '#ff6b9d', '#4ecdc4', '#a3e635', '#fff'];
    this.trail.push({
      x, y, t: 0, life: 0.4,
      r: 3 + Math.random() * 5,
      c: cols[Math.floor(Math.random() * cols.length)],
    });
    if (this.trail.length > 60) this.trail.shift();
  },

  /* кэш glow-спрайтов: радиальный градиент, рисуется в режиме lighter */
  glowSprite(col) {
    if (this._glowCache[col]) return this._glowCache[col];
    const size = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c2 = cv.getContext('2d');
    const g = c2.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, col);
    g.addColorStop(0.35, this.fade(col, 0.45));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c2.fillStyle = g;
    c2.fillRect(0, 0, size, size);
    this._glowCache[col] = cv;
    return cv;
  },

  fade(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  },

  drawGlow(x, y, r, col, alpha) {
    const sp = this.glowSprite(col);
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  },

  updateFx(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 500 * dt; p.vx *= (1 - 2 * dt);
      if (p.t >= p.life) this.parts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.t += dt; rg.r += 340 * dt;
      if (rg.t >= rg.life) this.rings.splice(i, 1);
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const tr = this.trail[i];
      tr.t += dt;
      if (tr.t >= tr.life) this.trail.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const fl = this.floats[i];
      fl.t -= dt; fl.y -= 60 * dt;
      if (fl.t <= 0) this.floats.splice(i, 1);
    }
  },

  /* ---------- HUD ---------- */
  updateHud() {
    const elScore = document.getElementById('score');
    const elTime = document.getElementById('time');
    const elCombo = document.getElementById('comboTag');
    const elComboVal = document.getElementById('comboVal');
    if (elScore) elScore.textContent = String(this.score);
    if (elTime) {
      elTime.textContent = String(Math.ceil(this.time));
      document.getElementById('timePill').classList.toggle('low', this.time <= 10);
    }
    if (elCombo && elComboVal) {
      if (this.combo >= 2) {
        if (elCombo.classList.contains('hidden')) {
          elCombo.classList.remove('hidden');
        } else {
          // перезапуск CSS-пружинки комбо
          elCombo.style.animation = 'none';
          void elCombo.offsetWidth;
          elCombo.style.animation = '';
        }
        elComboVal.textContent = 'x' + this.combo;
      } else {
        elCombo.classList.add('hidden');
      }
    }
    const hud = document.getElementById('hud');
    if (hud && this.frenzy > 0) hud.classList.add('frenzy');
    else if (hud) hud.classList.remove('frenzy');
  },

  /* ---------- отрисовка ---------- */
  draw(t) {
    const W = this.W, H = this.H;
    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 12 * this.shake, (Math.random() - 0.5) * 12 * this.shake);
    }
    // фон: космос-конфетка
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241358');
    g.addColorStop(0.55, '#1a1040');
    g.addColorStop(1, '#2c1454');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    if (this.frenzy > 0) {
      ctx.fillStyle = 'rgba(255,180,40,' + (0.08 + 0.05 * Math.sin(t * 12)) + ')';
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    for (const s of this.stars) {
      ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(s.tw));
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ===== слой сияния: glow-ауры, шлейф, кольца =====
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.faces) {
      const pulse = 0.55 + 0.25 * Math.sin(f.wob * 2 + t * 3);
      this.drawGlow(f.x, f.y, f.r * (f.gold ? 2.4 : 1.9), f.gold ? '#ffd93d' : this.faceColor(f.hue), f.gold ? 0.75 : 0.4 * pulse * f.sc);
    }
    for (const c of this.clouds) this.drawGlow(c.x, c.y, c.r * 2, '#7f9bd9', 0.22 * c.sc);
    for (const tr of this.trail) {
      const a = 1 - tr.t / tr.life;
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = tr.c;
      ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r * a, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const rg of this.rings) {
      const a = 1 - rg.t / rg.life;
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = rg.c;
      ctx.lineWidth = 3 + 6 * a;
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (const c of this.clouds) this.drawCloud(c, t);
    for (const f of this.faces) this.drawFace(f, t);

    for (const fl of this.floats) {
      ctx.globalAlpha = Math.min(1, fl.t * 2);
      const px = Math.round(this.H * (fl.big ? 0.085 : 0.045));
      ctx.font = '900 ' + px + 'px "Arial Black", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(4, px * 0.16); ctx.strokeStyle = 'rgba(40,10,80,.85)';
      ctx.strokeText(fl.txt, fl.x, fl.y);
      ctx.fillStyle = fl.col;
      ctx.fillText(fl.txt, fl.x, fl.y);
    }
    ctx.globalAlpha = 1;

    // вспышка на золоте / МОЗГОВЗРЫВЕ
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,240,180,' + (this.flash * 0.55) + ')';
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }
    ctx.restore();
  },

  /* нейро-мордочка: розовый мозжичок с глазками */
  drawFace(f, t) {
    const s = f.sc * (f.life < 1 ? Math.max(0.2, f.life) : 1);
    const r = f.r * (1 + 0.05 * Math.sin(f.wob)) * (0.5 + 0.5 * s);
    const col = f.gold ? '#ffd93d' : this.faceColor(f.hue);
    ctx.save();
    ctx.translate(f.x, f.y);
    // тело-мозжичок
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      const wob = Math.sin(a * 5 + f.wob * 0.7) * r * 0.13;
      const rr = r + wob;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // блик-луна сверху
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.5, r * 0.3, r * 0.16, -0.5, 0, 7);
    ctx.fill();
    ctx.strokeStyle = f.gold ? 'rgba(150,90,0,.55)' : 'rgba(90,20,60,.45)';
    ctx.lineWidth = Math.max(2, r * 0.09);
    // бороздки мозга
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.2, r * 0.42, Math.PI * 0.7, Math.PI * 1.7);
    ctx.arc(r * 0.3, r * 0.25, r * 0.4, Math.PI * 1.6, Math.PI * 0.6);
    ctx.stroke();
    // щёчки
    ctx.fillStyle = f.gold ? 'rgba(255,150,0,.5)' : 'rgba(255,255,255,.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.55, r * 0.18, r * 0.14, r * 0.09, 0, 0, 7);
    ctx.ellipse(r * 0.55, r * 0.18, r * 0.14, r * 0.09, 0, 0, 7);
    ctx.fill();
    // глазки-зрачки: смотрят на последний тап
    const blink = (Math.sin(t * 2 + f.wob * 3) > 0.96) ? 0.15 : 1;
    const dx = this.look.x - f.x, dy = this.look.y - f.y;
    const dl = Math.max(1, Math.hypot(dx, dy));
    const ox = (dx / dl) * r * 0.06, oy = (dy / dl) * r * 0.06;
    const ey = -r * 0.15;
    // белки
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, ey, r * 0.19, r * 0.19 * blink, 0, 0, 7);
    ctx.ellipse(r * 0.35, ey, r * 0.19, r * 0.19 * blink, 0, 0, 7);
    ctx.fill();
    // зрачки
    ctx.fillStyle = '#2a1040';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35 + ox, ey + oy, r * 0.09, r * 0.09 * blink, 0, 0, 7);
    ctx.ellipse(r * 0.35 + ox, ey + oy, r * 0.09, r * 0.09 * blink, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    if (f.face === 0) ctx.arc(0, r * 0.25, r * 0.3, 0.15, Math.PI - 0.15);           // улыбка
    else if (f.face === 1) ctx.arc(0, r * 0.55, r * 0.3, Math.PI + 0.3, -0.3);       // «ой»
    else { ctx.moveTo(-r * 0.25, r * 0.35); ctx.lineTo(r * 0.25, r * 0.35); }        // прямая
    ctx.lineWidth = Math.max(2.5, r * 0.1); ctx.lineCap = 'round';
    ctx.strokeStyle = '#2a1040'; ctx.stroke();
    // золотому — корону и звёздочки-блёстки
    if (f.gold) {
      const bob = Math.sin(t * 6 + f.wob) * r * 0.05;
      ctx.fillStyle = '#ff9f43';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.85 + bob);
      ctx.lineTo(-r * 0.45, -r * 1.15 + bob);
      ctx.lineTo(-r * 0.2, -r * 0.95 + bob);
      ctx.lineTo(0, -r * 1.25 + bob);
      ctx.lineTo(r * 0.2, -r * 0.95 + bob);
      ctx.lineTo(r * 0.45, -r * 1.15 + bob);
      ctx.lineTo(r * 0.45, -r * 0.85 + bob);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (Math.sin(t * 9 + f.wob) > 0.4) {
        ctx.fillStyle = '#fff';
        this.sparkle(r * 0.9, -r * 0.7, r * 0.16);
        this.sparkle(-r * 1.0, -r * 0.2, r * 0.12);
      }
    }
    ctx.restore();
  },

  /* четырёхлучевая звёздочка-блёстка */
  sparkle(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
    ctx.fill();
  },

  /* тучка: сердитая, с грозой */
  drawCloud(c, t) {
    const r = c.r * (0.5 + 0.5 * c.sc);
    ctx.save();
    ctx.translate(c.x, c.y + Math.sin(c.wob) * 4);
    ctx.fillStyle = '#cfd8ea';
    ctx.beginPath();
    ctx.arc(-r * 0.5, 0, r * 0.55, 0, 7);
    ctx.arc(0, -r * 0.3, r * 0.65, 0, 7);
    ctx.arc(r * 0.5, 0, r * 0.55, 0, 7);
    ctx.arc(0, r * 0.15, r * 0.6, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#aab7cf';
    ctx.beginPath(); ctx.arc(r * 0.35, r * 0.25, r * 0.28, 0, 7); ctx.fill();
    // сердитые глазки-бровки
    ctx.strokeStyle = '#3a4666'; ctx.lineWidth = Math.max(2.5, r * 0.09); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.18); ctx.lineTo(-r * 0.16, -r * 0.05);
    ctx.moveTo(r * 0.42, -r * 0.18); ctx.lineTo(r * 0.16, -r * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#3a4666';
    ctx.beginPath(); ctx.arc(-r * 0.28, r * 0.1, r * 0.08, 0, 7); ctx.arc(r * 0.28, r * 0.1, r * 0.08, 0, 7); ctx.fill();
    // молния-предупреждение
    if (Math.sin(t * 6) > 0.5) {
      ctx.fillStyle = '#ffd93d';
      ctx.beginPath();
      ctx.moveTo(r * 0.05, -r * 0.55); ctx.lineTo(-r * 0.12, -r * 0.05);
      ctx.lineTo(0, -r * 0.05); ctx.lineTo(-r * 0.08, r * 0.45);
      ctx.lineTo(r * 0.14, -r * 0.12); ctx.lineTo(r * 0.02, -r * 0.12);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  /* ---------- ввод: тапы и ведение пальцем ---------- */
  onPointer(x, y, isMove) {
    this.look.x = x; this.look.y = y;
    if (this.state !== 'play') return;
    if (isMove) this.addTrail(x, y);
    // тучки проверяем первыми — их трогать нельзя
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      const dx = x - c.x, dy = y - c.y;
      if (dx * dx + dy * dy <= (c.r * 1.15) * (c.r * 1.15)) {
        this.clouds.splice(i, 1);
        this.hitCloud(c);
        return;
      }
    }
    // мордочки: берём верхнюю (последнюю нарисованную) в радиусе
    for (let i = this.faces.length - 1; i >= 0; i--) {
      const f = this.faces[i];
      const dx = x - f.x, dy = y - f.y;
      if (dx * dx + dy * dy <= (f.r * 1.25) * (f.r * 1.25)) {
        this.faces.splice(i, 1);
        this.hitFace(f);
        return;
      }
    }
    // промах: ругаемся только на отдельный тап, не на каждое движение
    if (!isMove) {
      this.combo = 0; this.comboTimer = 0;
      Sfx.miss();
    }
  },

  hitFace(f) {
    this.combo++;
    this.comboTimer = 2.2;
    const base = this.frenzy > 0 ? 2 : 1;
    this.score += base * Math.min(this.combo, 5);
    this.burst(f.x, f.y, f.gold ? '#ffd93d' : this.faceColor(f.hue), 14);
    this.floats.push({ x: f.x, y: f.y - f.r, txt: '+' + (base * Math.min(this.combo, 5)), t: 0.8, col: '#fff' });
    Sfx.tap(this.combo);
    Sfx.pop();
    // золотой мозг: +5 секунд и радуга-салют
    if (f.gold) {
      this.time = Math.min(99, this.time + 5);
      this.score += 15;
      this.flash = 1;
      this.shake = Math.max(this.shake, 0.6);
      this.rainbowBurst(f.x, f.y, 26);
      this.floats.push({ x: f.x, y: f.y - f.r * 1.6, txt: Lang.t('plusTime') + ' +15', t: 1.1, col: '#ffd93d', big: true });
      Sfx.bonus();
    }
    // каждые 12 попаданий — МОЗГОВЗРЫВ
    if (this.combo > 0 && this.combo % 12 === 0 && this.frenzy <= 0) {
      this.frenzy = 5;
      this.flash = 1;
      this.shake = Math.max(this.shake, 0.8);
      this.rainbowBurst(this.W / 2, this.H / 2, 40);
      Sfx.musicFrenzy(true);
      Sfx.frenzy();
      this.floats.push({ x: this.W / 2, y: this.H * 0.3, txt: Lang.t('frenzy'), t: 1.4, col: '#ffd93d', big: true });
    }
  },

  hitCloud(c) {
    this.time = Math.max(0, this.time - 3);
    this.combo = 0;
    this.shake = 1;
    this.burst(c.x, c.y, '#b9d9ff', 18);
    this.floats.push({ x: c.x, y: c.y - c.r, txt: Lang.t('minusTime'), t: 1, col: '#9ecbff' });
    Sfx.cloud();
    Sfx.penalty();
  },

  faceColor(hue) {
    return { pink: '#ff6b9d', mint: '#4ecdc4', lemon: '#ffd93d', violet: '#b9a6ff' }[hue] || '#ff6b9d';
  },

  /* ---------- управление раундом и экранами ---------- */
  show(id) {
    ['menu', 'over', 'pause', 'hud'].forEach((s) => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  },

  startRound() {
    this.score = 0; this.time = 60; this.combo = 0; this.comboTimer = 0;
    this.frenzy = 0; this.spawnTimer = 0.4; this.elapsed = 0;
    this.faces = []; this.clouds = []; this.parts = []; this.floats = [];
    this.trail = []; this.rings = []; this.flash = 0; this._lastSec = -1;
    this.shake = 0;
    this.state = 'play';
    this.show('hud');
    this.updateHud();
    Sfx.resume();
    Sfx.musicStart();
    YSDK.gameplayStart();
  },

  endRound() {
    this.state = 'over';
    this.faces = []; this.clouds = [];
    Sfx.musicStop();
    YSDK.gameplayStop();
    const prevBest = YSDK.best;
    YSDK.submitScore(this.score);
    const isBest = this.score > 0 && this.score > prevBest;
    // звёзды: 1 = играл, 2 = >= 30, 3 = >= 60
    const st = this.score >= 60 ? 3 : this.score >= 30 ? 2 : this.score > 0 ? 1 : 0;
    for (let i = 1; i <= 3; i++) {
      const s = document.getElementById('star' + i);
      if (s) s.classList.toggle('lit', i <= st);
    }
    // счёт тикает вверх — детям нравится
    const fs = document.getElementById('finalScore');
    if (fs) {
      const target = this.score;
      const t0 = performance.now();
      const dur = Math.min(900, 200 + target * 8);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        fs.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    const ob = document.getElementById('overBest');
    if (ob) ob.textContent = (isBest ? Lang.t('newBest') + ' ' : Lang.t('best') + ': ') + YSDK.best;
    const hud = document.getElementById('hud');
    if (hud) hud.classList.add('hidden');
    const over = document.getElementById('over');
    if (over) over.classList.remove('hidden');
    Sfx.finish(st);
  },

  toMenu() {
    this.state = 'menu';
    this.faces = []; this.clouds = [];
    Sfx.musicStop();
    const mb = document.getElementById('menuBest');
    if (mb) mb.textContent = YSDK.best > 0 ? Lang.t('best') + ': ' + YSDK.best : '';
    this.show('menu');
  },

  togglePause() {
    if (this.state === 'play') {
      this.state = 'pause';
      Sfx.musicStop();
      this.show('pause');
      YSDK.gameplayStop();
    } else if (this.state === 'pause') {
      this.state = 'play';
      this._last = performance.now();
      Sfx.musicStart();
      this.show('hud');
      YSDK.gameplayStart();
    }
  },
};

/* ============ инициализация ============ */
(function boot() {
  Game.resize();
  window.addEventListener('resize', () => Game.resize());
  window.addEventListener('orientationchange', () => setTimeout(() => Game.resize(), 200));

  // ввод: мышь + тач + ведение пальцем
  const pt = (e, isMove) => {
    const r = canvas.getBoundingClientRect();
    Game.onPointer(e.clientX - r.left, e.clientY - r.top, isMove);
  };
  canvas.addEventListener('pointerdown', (e) => { Sfx.resume(); pt(e, false); });
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons > 0 || (e.pointerType === 'touch' && e.pressure > 0)) pt(e, true);
  });
  // чтобы длинный тап/свайп не звал меню и выделение
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchmove',  (e) => e.preventDefault(), { passive: false });

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { e.stopPropagation(); Sfx.resume(); Sfx.click(); fn(); });
  };
  bind('playBtn', () => Game.startRound());
  bind('againBtn', () => YSDK.showAd(() => Game.startRound()));
  bind('toMenuBtn', () => Game.toMenu());
  bind('resumeBtn', () => Game.togglePause());
  bind('quitBtn', () => Game.toMenu());
  bind('pauseBtn', () => Game.togglePause());
  const mute = document.getElementById('muteBtn');
  if (mute) {
    mute.textContent = Sfx.muted ? '🔇' : '🔊';
    mute.addEventListener('click', () => {
      Sfx.resume();
      Sfx.setMuted(!Sfx.muted);
      mute.textContent = Sfx.muted ? '🔇' : '🔊';
    });
  }

  // ESC / P — пауза
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && Game.state === 'play') Game.togglePause();
  });

  // Яндекс требует паузу при сворачивании
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'play') Game.togglePause();
  });

  // язык: RU по умолчанию, EN если браузер английский (SDK потом уточнит)
  try { Lang.apply((navigator.language || 'ru').slice(0, 2) === 'en' ? 'en' : 'ru'); }
  catch (e) { Lang.apply('ru'); }
  Game.toMenu();

  // SDK — мягко, игра работает и без него; LoadingAPI.ready дёрнется из init
  YSDK.init().then(() => Game.toMenu()).catch(() => {});

  requestAnimationFrame((t) => Game.tick(t));
})();

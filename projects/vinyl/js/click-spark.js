/* ============================================================
   Click Spark — маленький взрыв искр по клику.
   Порт React-компонента ClickSpark (reactbits.dev).
   Цвета — кислотный шартрез и голографические.

   Использование: просто подключить файл; канвас #spark-canvas.
   ============================================================ */

(function () {
  "use strict";

  var canvas = document.getElementById("spark-canvas");
  if (!canvas) return;

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  var ctx = canvas.getContext("2d");
  var DPR_CAP = 2;
  var COLORS = ["#d8f34e", "#6fe7dd", "#a78bfa", "#f49ac1"];
  var particles = [];
  var raf = null;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();

  function burst(x, y) {
    var n = 12;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      var v = 2.6 + Math.random() * 2.4;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1.2,
        life: 1,
        decay: 0.028 + Math.random() * 0.02,
        color: COLORS[i % COLORS.length]
      });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var alive = [];

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.09;           // лёгкая гравитация
      p.vx *= 0.985;
      p.life -= p.decay;

      if (p.life > 0) {
        alive.push(p);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.1, p.y - p.vy * 2.1);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    particles = alive;

    if (particles.length) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  document.addEventListener("pointerdown", function (e) {
    burst(e.clientX, e.clientY);
  }, { passive: true });
})();

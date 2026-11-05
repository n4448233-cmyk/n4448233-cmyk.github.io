/* ============================================================
   Dot Grid — сетка точек, расходящихся от курсора.
   Порт React-компонента DotGrid (reactbits.dev) на ванильный JS.

   Использование: <canvas id="dot-grid"></canvas> внутри блока
   с position:relative. В покое не тикает — rAF только при
   движении мыши и затухании.
   ============================================================ */

(function () {
  "use strict";

  var canvas = document.getElementById("dot-grid");
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ctx = canvas.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var GAP = 26;
  var BASE_R = 1.25;
  var RADIUS = 130;

  var W = 0, H = 0, pts = [];
  var mx = -1e4, my = -1e4, raf = null;

  function build() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    pts = [];
    for (var y = GAP / 2; y < H; y += GAP) {
      for (var x = GAP / 2; x < W; x += GAP) {
        pts.push({ x: x, y: y });
      }
    }
    paint();
  }

  function paint() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var dx = p.x - mx, dy = p.y - my;
      var d = Math.hypot(dx, dy);
      var k = Math.max(0, 1 - d / RADIUS);
      k *= k;
      var r = BASE_R + k * 2.6;
      var off = k * 6;
      var ux = d ? dx / d : 0, uy = d ? dy / d : 0;
      ctx.beginPath();
      ctx.arc(p.x + ux * off, p.y + uy * off, r, 0, Math.PI * 2);
      ctx.fillStyle = k > 0.04
        ? "rgba(167,139,250," + (0.16 + k * 0.6).toFixed(3) + ")"
        : "rgba(237,232,220,0.15)";
      ctx.fill();
    }
  }

  function tick() {
    raf = null;
    mx -= (mx - tx) * 0.25;
    my -= (my - ty) * 0.25;
    paint();
    if (Math.abs(tx - mx) + Math.abs(ty - my) > 0.5) {
      raf = requestAnimationFrame(tick);
    }
  }

  var tx = -1e4, ty = -1e4;
  var host = canvas.parentElement || document.body;
  host.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (mx < -9000) { mx = tx; my = ty; }
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  var t = null;
  window.addEventListener("resize", function () {
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(function () { t = null; build(); });
  }, { passive: true });

  build();
})();

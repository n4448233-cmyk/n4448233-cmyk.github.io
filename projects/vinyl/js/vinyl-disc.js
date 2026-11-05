/* ============================================================
   VinylDisc — гигантская виниловая пластинка за заголовком:
   рисуется на canvas (дорожки, разделители треков, лейбл,
   два голографических блика), вращается через CSS.

   После осмотра пластинки в 3D-просмотрщике VinylDisc.setRecord(key)
   перекрашивает диск в релиз: цвет винила, дымы мрамора и этикетка
   (у полносе-прессингов вроде Back In Black печать — на весь диск).
   ============================================================ */

(function () {
  "use strict";

  var canvas = document.getElementById("vinyl-disc");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var currentLabel = null;   // canvas-этикетка последней осмотренной пластинки
  var currentVinyl = null;   // { base, marble, hole, labelR } — её винил
  var lastKey = null;        // чтобы перерисовать при догрузке лого/текстур

  function hexBlend(a, b, t) {
    function p(h) {
      h = h.replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var A = p(a), B = p(b);
    return "rgb(" + A.map(function (v, i) {
      return Math.round(v + (B[i] - v) * t);
    }).join(",") + ")";
  }

  function draw() {
    var cssSize = canvas.clientWidth;
    if (!cssSize) return;
    var size = Math.round(cssSize * DPR);
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    var s = size / 2;
    var vinyl = currentVinyl || {};
    var base = vinyl.base || "#0b0b0e";
    var fullFace = currentLabel && currentLabel.width &&
      vinyl.labelR && vinyl.labelR > 0.5;
    // круг этикета и зона печати (лого может вылезать за этикетку)
    var edgeR = (vinyl.labelR || 0.36) * s;
    var clipR = (vinyl.bleed || vinyl.labelR || 0.36) * s;

    ctx.clearRect(0, 0, size, size);

    // корпус диска: у цветного винила подмешиваем его цвет
    var body = ctx.createRadialGradient(s, s * 0.9, s * 0.15, s, s, s);
    body.addColorStop(0, hexBlend(base, "#141821", 0.55));
    body.addColorStop(0.72, hexBlend(base, "#0d1016", 0.6));
    body.addColorStop(1, hexBlend(base, "#090b10", 0.7));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(s, s, s * 0.995, 0, Math.PI * 2);
    ctx.fill();

    // полносе-прессинг: печать на весь диск, дорожки поверх с прозрачностью
    if (fullFace) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s, s, s * 0.975, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(currentLabel, 0, 0, size, size);
      ctx.restore();
    }

    // дорожки — тонкие концентрические кольца
    var innerR = fullFace ? 26 * DPR : edgeR + 6 * DPR;
    ctx.lineWidth = 1 * DPR;
    for (var r = innerR; r < s * 0.975; r += 2.6 * DPR) {
      ctx.strokeStyle = "rgba(237,232,220," + (fullFace ? 0.02 : 0.045) + ")";
      ctx.beginPath();
      ctx.arc(s, s, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // разделители «треков» — тёмная канавка + светлый гребень
    var bands = 7;
    for (var b = 1; b < bands; b++) {
      var rb = innerR + (s * 0.975 - innerR) * (b / bands);
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 2.6 * DPR;
      ctx.beginPath();
      ctx.arc(s, s, rb + 4 * DPR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(237,232,220,0.10)";
      ctx.lineWidth = 1.3 * DPR;
      ctx.beginPath();
      ctx.arc(s, s, rb, 0, Math.PI * 2);
      ctx.stroke();
    }

    // дымы мрамора поверх дорожек (только в зоне винила)
    if (vinyl.marble) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s, s, s * 0.975, 0, Math.PI * 2);
      ctx.arc(s, s, fullFace ? s * 0.975 : edgeR, 0, Math.PI * 2, true);
      ctx.clip();
      ctx.drawImage(vinyl.marble, 0, 0, size, size);
      ctx.restore();
    }

    // этикетка в центре — зона печати с вылетом, кольцо по краю этикета
    if (!fullFace) {
      if (currentLabel && currentLabel.width) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(s, s, clipR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(currentLabel, s - clipR, s - clipR, clipR * 2, clipR * 2);
        ctx.restore();
        ctx.strokeStyle = "rgba(216,243,78,0.4)";
        ctx.lineWidth = 2 * DPR;
        ctx.beginPath();
        ctx.arc(s, s, edgeR, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(s, s, edgeR, 0, Math.PI * 2);
        ctx.fillStyle = "#10140d";
        ctx.fill();
        ctx.strokeStyle = "rgba(216,243,78,0.55)";
        ctx.lineWidth = 2 * DPR;
        ctx.stroke();
      }
    }

    // отверстие — размер по формату релиза
    var holeK = (vinyl.hole ? vinyl.hole / 0.043 : 1);
    ctx.beginPath();
    ctx.arc(s, s, 7 * DPR * holeK, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0d12";
    ctx.fill();
    ctx.strokeStyle = "rgba(237,232,220,0.25)";
    ctx.lineWidth = 1 * DPR;
    ctx.stroke();

    // мягкая кромка, чтобы диск растворялся в фоне
    var edge = ctx.createRadialGradient(s, s, s * 0.9, s, s, s);
    edge.addColorStop(0, "rgba(11,13,18,0)");
    edge.addColorStop(1, "rgba(11,13,18,0.85)");
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.arc(s, s, s, 0, Math.PI * 2);
    ctx.fill();
  }

  var t = null;
  window.addEventListener("resize", function () {
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(function () { t = null; draw(); });
  }, { passive: true });

  draw();

  // наверху теперь эта пластинка: этикетка + цвет, дымы и формат её винила
  window.VinylDisc = {
    setRecord: function (key) {
      lastKey = key;
      apply(key);
    },
    // когда догрузились настоящие логотипы — этикетка могла измениться
    onLogoLoad: function () {
      if (lastKey) apply(lastKey);
    }
  };

  function apply(key) {
    if (window.RecordFactory && window.RecordFactory.label) {
      var c = window.RecordFactory.label(key);
      if (c && c.width) {
        currentLabel = c;
        currentVinyl = window.RecordFactory.vinyl
          ? window.RecordFactory.vinyl(key)
          : null;
        draw();
      }
    }
  }
})();

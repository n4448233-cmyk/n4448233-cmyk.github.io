/* ============================================================
   Text Pressure — заголовок «дышит» под курсором:
   переменный вес шрифта и лёгкий масштаб по дистанции
   до каждого знака (Unbounded 200..900).
   Порт React-компонента Text Pressure (reactbits.dev).

   Использование:
     TextPressure(document.getElementById("pressure-title"), {
       minWeight: 200, maxWeight: 900, radius: 260, scale: 0.1
     });
   ============================================================ */

(function () {
  "use strict";

  function TextPressure(el, opts) {
    if (!el) return function () {};
    opts = opts || {};

    var MIN = opts.minWeight != null ? opts.minWeight : 200;
    var MAX = opts.maxWeight != null ? opts.maxWeight : 900;
    var SCALE = opts.scale != null ? opts.scale : 0.1;
    var LERP = 0.16;

    var units = [].slice.call(el.querySelectorAll(".px"));
    if (!units.length) units = [el];

    var state = units.map(function () {
      return { w: MIN, s: 1 };
    });

    var mx = -1e4, my = -1e4, inside = false, raf = null;
    var reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return function () {};

    function frame() {
      raf = null;
      var radius = opts.radius || Math.max(200, window.innerWidth * 0.16);
      var dirty = false;

      for (var i = 0; i < units.length; i++) {
        var u = units[i], st = state[i];
        var r = u.getBoundingClientRect();
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;

        var d = Math.hypot(mx - cx, my - cy);
        var p = inside ? Math.max(0, 1 - d / radius) : 0;
        p = p * p; // мягкое затухание к краям

        var tw = MIN + (MAX - MIN) * p;
        var ts = 1 + p * SCALE;

        st.w += (tw - st.w) * LERP;
        st.s += (ts - st.s) * LERP;

        if (Math.abs(tw - st.w) > 0.4 || Math.abs(ts - st.s) > 0.0015) dirty = true;

        u.style.fontVariationSettings = "'wght' " + st.w.toFixed(0);
        u.style.transform = "scale(" + st.s.toFixed(4) + ")";
      }

      if (dirty) raf = requestAnimationFrame(frame);
    }

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    var zone = el.closest("section") || document.body;
    zone.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY; inside = true; kick();
    }, { passive: true });

    zone.addEventListener("pointerleave", function () {
      inside = false; kick();
    });

    return function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };
  }

  window.TextPressure = TextPressure;
})();

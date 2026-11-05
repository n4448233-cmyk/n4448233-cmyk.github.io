/* ============================================================
   Dock — навигация с «лупой»: элементы увеличиваются
   по гауссу возле курсора, как в macOS.
   Порт React-компонента Dock (reactbits.dev).

   Использование:
     Dock(document.getElementById("genre-dock"), {
       onPick: function (item) { ... }   // клик по элементу
     });
   ============================================================ */

(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function Dock(el, opts) {
    if (!el) return function () {};
    opts = opts || {};

    var items = [].slice.call(el.querySelectorAll(".dock-item"));
    var MAG = 0.45;        // насколько вырастает ближайший элемент
    var SIGMA = 95;        // ширина зоны влияния курсора, px
    var LIFT = 6;          // подъём ближайшего элемента, px
    var raf = null, mx = -1e4, inside = false;

    function apply() {
      raf = null;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var r = it.getBoundingClientRect();
        var c = r.left + r.width / 2;
        var d = (mx - c) / SIGMA;
        var p = inside ? Math.exp(-d * d) : 0;

        it.classList.toggle("is-magnified", p > 0.55);
        it.style.transform = "scale(" + (1 + p * MAG).toFixed(3) + ") translateY(" +
          (-p * LIFT).toFixed(1) + "px)";
      }
    }

    function kick() { if (!raf) raf = requestAnimationFrame(apply); }

    if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      el.addEventListener("pointermove", function (e) {
        mx = e.clientX; inside = true; kick();
      }, { passive: true });

      el.addEventListener("pointerleave", function () {
        inside = false; kick();
      });
    }

    items.forEach(function (it) {
      it.addEventListener("click", function () {
        items.forEach(function (o) { o.classList.remove("is-active"); });
        it.classList.add("is-active");
        if (opts.onPick) opts.onPick(it);
      });
    });

    return function stop() { if (raf) cancelAnimationFrame(raf); };
  }

  window.Dock = Dock;
})();

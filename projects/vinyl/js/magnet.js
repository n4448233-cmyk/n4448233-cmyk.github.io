/* ============================================================
   Magnet — элемент слегка тянется к курсору, пока тот рядом.
   Порт React-компонента Magnet (reactbits.dev).

   Использование: элементу класс .magnet; сила — через
   data-magnet="0.35" (по умолчанию 0.3).
   ============================================================ */

(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  if (!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches)) return;

  var RADIUS = 70; // зона притяжения за пределами элемента, px

  document.addEventListener("pointermove", function (e) {
    var els = document.querySelectorAll(".magnet");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var dist = Math.hypot(dx, dy);

      if (dist < Math.max(r.width, r.height) / 2 + RADIUS) {
        var k = parseFloat(el.getAttribute("data-magnet")) || 0.3;
        el.style.transform = "translate(" + dx * k + "px," + dy * k + "px)";
      } else if (el.style.transform) {
        el.style.transform = "";
      }
    }
  }, { passive: true });
})();

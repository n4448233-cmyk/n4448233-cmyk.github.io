/* ============================================================
   Tilted Card + Glare Hover — наклон карточки за курсором
   и блик, следующий за ним. Порт TiltedCard и GlareHover
   (reactbits.dev) на ванильный JS.

   Использование: элементу класс .tilt (или .card — у него те же
   переменные). Координаты блика пишутся в --gx/--gy, наклон в
   --rx/--ry. На тач-устройствах эффект не включается.
   ============================================================ */

(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!fine) return;

  var MAX_DEG = 7;

  document.addEventListener("pointermove", function (e) {
    var el = e.target.closest ? e.target.closest(".card, .tilt") : null;
    if (!el) return;

    var r = el.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width;
    var y = (e.clientY - r.top) / r.height;

    el.classList.remove("is-settling");
    el.style.setProperty("--ry", ((x - 0.5) * 2 * MAX_DEG).toFixed(2) + "deg");
    el.style.setProperty("--rx", ((0.5 - y) * 2 * MAX_DEG).toFixed(2) + "deg");
    el.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
    el.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
  }, { passive: true });

  document.addEventListener("pointerout", function (e) {
    var el = e.target.closest ? e.target.closest(".card, .tilt") : null;
    if (!el || el.contains(e.relatedTarget)) return;

    el.classList.add("is-settling");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, { passive: true });
})();

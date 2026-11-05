/* ============================================================
   Spotlight Card — подсветка, следующая за курсором:
   мягкое пятно на поверхности + светящаяся кромка (маска).
   Порт React-компонента SpotlightCard (reactbits.dev).

   Использование: элементу класс .spot; координаты пишутся
   в CSS-переменные --mx/--my.
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("pointermove", function (e) {
    var el = e.target.closest ? e.target.closest(".spot") : null;
    if (!el) return;

    var r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
  }, { passive: true });
})();

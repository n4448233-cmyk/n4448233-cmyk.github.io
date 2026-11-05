/* ============================================================
   Count Up — число накручивается от нуля, когда блок
   попадает в экран. Порт React-компонента CountUp (reactbits.dev).

   Использование: <span data-count="3800">0</span>
   Разряды отделяются тонким пробелом: 3 800.
   ============================================================ */

(function () {
  "use strict";

  var els = document.querySelectorAll("[data-count]");
  if (!els.length) return;

  function format(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
  }

  function run(el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var dur = 1700;
    var t0 = null;

    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
      el.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  if (!("IntersectionObserver" in window)) {
    [].forEach.call(els, function (el) {
      el.textContent = format(parseFloat(el.getAttribute("data-count")) || 0);
    });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        io.unobserve(entry.target);
        run(entry.target);
      }
    });
  }, { threshold: 0.5 });

  [].forEach.call(els, function (el) { io.observe(el); });
})();

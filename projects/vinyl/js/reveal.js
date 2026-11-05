/* ============================================================
   Fade Content — мягкое появление блоков при попадании в экран.
   Порт React-компонента FadeContent (reactbits.dev).

   Использование: элементам класс .reveal; задержка ступеней —
   через CSS-переменную --d (например style="--d:.12s").
   ============================================================ */

(function () {
  "use strict";

  var els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  if (!("IntersectionObserver" in window)) {
    [].forEach.call(els, function (el) { el.classList.add("in"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  [].forEach.call(els, function (el) { io.observe(el); });

  // для элементов, которые появляются позже (карточки каталога и т.п.)
  window.revealObserve = function (root) {
    if (!root) return;
    var list = root.matches && root.matches(".reveal")
      ? [root]
      : root.querySelectorAll(".reveal");
    [].forEach.call(list, function (el) { io.observe(el); });
  };
})();

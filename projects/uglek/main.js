/* ============================================================
   «Углёк» — логика страницы
   Каталог с фильтром, корзина-счётчик, подписка. Без зависимостей.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Данные каталога ---------- */

  var ROAST_NAMES = { light: "светлая", medium: "средняя", dark: "тёмная" };

  var PRODUCTS = [
    {
      name: "Эфиопия · Иргачефф",
      meta: "мытая · 1900 м · Sidamo",
      notes: "бергамот, персик, чёрный чай",
      roast: "light",
      level: 2,
      price: 890,
      color: "#c9973a",
      num: "01",
    },
    {
      name: "Кения · Ньери",
      meta: "мытая · 1800 м · Nyeri AA",
      notes: "чёрная смородина, малина",
      roast: "light",
      level: 2,
      price: 940,
      color: "#a03b4e",
      num: "02",
    },
    {
      name: "Колумбия · Уила",
      meta: "мытая · 1750 м · Huila",
      notes: "карамель, красное яблоко",
      roast: "medium",
      level: 3,
      price: 790,
      color: "#b3542e",
      num: "03",
    },
    {
      name: "Бразилия · Серрадо",
      meta: "натуральная · 1150 м · Cerrado",
      notes: "молочный шоколад, фундук",
      roast: "medium",
      level: 3,
      price: 690,
      color: "#8a6a3f",
      num: "04",
    },
    {
      name: "Гватемала · Антигуа",
      meta: "мытая · 1600 м · Antigua",
      notes: "горький шоколад, специи",
      roast: "dark",
      level: 4,
      price: 820,
      color: "#5c4632",
      num: "05",
    },
    {
      name: "Суматра · Мандэлинг",
      meta: "wet-hulled · 1400 м",
      notes: "кедр, чёрный перец, патока",
      roast: "dark",
      level: 4,
      price: 850,
      color: "#3f4a3c",
      num: "06",
    },
  ];

  /* ---------- Утилиты ---------- */

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Пакетик на карточке: один и тот же силуэт, лента цвета сорта
  function bagSvg(p) {
    return (
      '<svg viewBox="0 0 100 130" width="92" height="120" aria-hidden="true">' +
      '<path d="M22 10h56l8 16v86a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8V26l8-16z"' +
      ' fill="#f7f2e7" stroke="#231409" stroke-width="2.5"/>' +
      '<rect x="17" y="18" width="66" height="9" rx="2.5" fill="#231409"/>' +
      '<rect x="26" y="44" width="48" height="56" fill="#231409"/>' +
      '<rect x="26" y="44" width="48" height="12" fill="' + p.color + '"/>' +
      '<text x="50" y="76" text-anchor="middle" fill="#f7f2e7"' +
      ' font-family="JetBrains Mono, monospace" font-size="12">' + p.num + "</text>" +
      '<text x="50" y="92" text-anchor="middle" fill="#f7f2e7"' +
      ' font-family="JetBrains Mono, monospace" font-size="6.5" opacity=".8">' +
      ROAST_NAMES[p.roast].toUpperCase() + " ОБЖАРКА</text></svg>"
    );
  }

  /* ---------- Тост ---------- */

  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  /* ---------- Корзина (счётчик в шапке) ---------- */

  var cartCount = 0;
  var cartBadge = document.getElementById("cart-count");

  function addToCart(name) {
    cartCount++;
    cartBadge.textContent = cartCount;
    cartBadge.hidden = false;
    cartBadge.classList.remove("bump");
    void cartBadge.offsetWidth; // перезапуск анимации
    cartBadge.classList.add("bump");
    showToast(name + " — в корзине");
  }

  document.getElementById("cart-btn").addEventListener("click", function () {
    showToast(
      cartCount
        ? "В корзине: " + cartCount + " " + plural(cartCount, "пачка", "пачки", "пачек")
        : "Корзина пока пустая — загляни в каталог"
    );
  });

  function plural(n, one, few, many) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  /* ---------- Каталог ---------- */

  var grid = document.getElementById("catalog-grid");

  function priceFor(base, weight) {
    return weight === "kg" ? Math.round((base * 3.6) / 10) * 10 : base;
  }

  PRODUCTS.forEach(function (p) {
    var card = document.createElement("article");
    card.className = "product-card reveal";
    card.dataset.roast = p.roast;

    var dots = "";
    for (var i = 1; i <= 5; i++) {
      dots += '<i class="' + (i <= p.level ? "filled" : "") + '"></i>';
    }

    card.innerHTML =
      '<div class="prod-art">' + bagSvg(p) + "</div>" +
      '<div class="prod-info">' +
      '<div class="prod-top">' +
      '<h3 class="prod-name">' + escapeHtml(p.name) + "</h3>" +
      '<span class="roast-dots" title="Обжарка: ' + ROAST_NAMES[p.roast] + '">' + dots + "</span>" +
      "</div>" +
      '<p class="prod-meta mono">' + escapeHtml(p.meta) + " · " + ROAST_NAMES[p.roast] + " обжарка</p>" +
      '<p class="prod-notes">' + escapeHtml(p.notes) + "</p>" +
      '<div class="prod-buy">' +
      '<div class="weight-seg" role="group" aria-label="Вес упаковки">' +
      '<button type="button" data-weight="g" class="is-active">250 г</button>' +
      '<button type="button" data-weight="kg">1 кг</button>' +
      "</div>" +
      '<span class="prod-price">' + priceFor(p.price, "g") + " ₽</span>" +
      '<button class="add-btn" type="button">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      "</svg>В корзину</button>" +
      "</div></div>";

    // Переключение веса меняет цену
    var priceEl = card.querySelector(".prod-price");
    var weight = "g";
    card.querySelectorAll(".weight-seg button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        card.querySelectorAll(".weight-seg button").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        weight = btn.dataset.weight;
        priceEl.textContent = priceFor(p.price, weight) + " ₽";
      });
    });

    card.querySelector(".add-btn").addEventListener("click", function () {
      addToCart(p.name + " · " + (weight === "kg" ? "1 кг" : "250 г"));
    });

    grid.appendChild(card);
  });

  /* ---------- Фильтр по обжарке ---------- */

  var chips = document.querySelectorAll(".chip");

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        c.classList.remove("is-active");
      });
      chip.classList.add("is-active");
      var roast = chip.dataset.roast;
      document.querySelectorAll(".product-card").forEach(function (card) {
        var show = roast === "all" || card.dataset.roast === roast;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  /* ---------- Подписка ---------- */

  var form = document.getElementById("sub-form");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      showToast("Проверь почту — кажется, в адресе опечатка");
      form.email.focus();
      return;
    }
    var freq = form.querySelector("input[name='freq']:checked").value;
    showToast("Готово! Первая пачка уедет к тебе в ближайший четверг (" + freq + ")");
    form.reset();
  });

  /* ---------- Бургер-меню ---------- */

  var burger = document.getElementById("burger");
  var nav = document.getElementById("site-nav");

  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Год в подвале ---------- */

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Появление карточек при прокрутке ---------- */

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".reveal").forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();

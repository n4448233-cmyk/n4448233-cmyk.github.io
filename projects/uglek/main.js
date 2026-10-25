/* ============================================================
   «Углёк» — логика страницы
   Каталог с фильтром, корзина-счётчик, подписка. Без зависимостей.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Данные каталога ---------- */

  var ROAST_NAMES = { light: "светлая", medium: "средняя", dark: "тёмная" };

  // Фото пачек: Unsplash (лицензия Unsplash — свободное использование без указания автора)
  var PRODUCTS = [
    {
      name: "Эфиопия · Иргачефф",
      meta: "мытая · 1900 м · Sidamo",
      notes: "бергамот, персик, чёрный чай",
      roast: "light",
      level: 2,
      price: 890,
      img: "img/product-ethiopia.jpg",
      num: "01",
    },
    {
      name: "Кения · Ньери",
      meta: "мытая · 1800 м · Nyeri AA",
      notes: "чёрная смородина, малина",
      roast: "light",
      level: 2,
      price: 940,
      img: "img/product-kenya.jpg",
      num: "02",
    },
    {
      name: "Колумбия · Уила",
      meta: "мытая · 1750 м · Huila",
      notes: "карамель, красное яблоко",
      roast: "medium",
      level: 3,
      price: 790,
      img: "img/product-colombia.jpg",
      num: "03",
    },
    {
      name: "Бразилия · Серрадо",
      meta: "натуральная · 1150 м · Cerrado",
      notes: "молочный шоколад, фундук",
      roast: "medium",
      level: 3,
      price: 690,
      img: "img/product-brazil.jpg",
      num: "04",
    },
    {
      name: "Гватемала · Антигуа",
      meta: "мытая · 1600 м · Antigua",
      notes: "горький шоколад, специи",
      roast: "dark",
      level: 4,
      price: 820,
      img: "img/product-guatemala.jpg",
      num: "05",
    },
    {
      name: "Суматра · Мандэлинг",
      meta: "wet-hulled · 1400 м",
      notes: "кедр, чёрный перец, патока",
      roast: "dark",
      level: 4,
      price: 850,
      img: "img/product-sumatra.jpg",
      pos: "50% 32%",
      num: "06",
    },
  ];

  /* ---------- Утилиты ---------- */

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Теги вкусового профиля: «бергамот, персик» → отдельные чипы
  function notesTags(notes) {
    return notes
      .split(", ")
      .map(function (n) {
        return "<span>" + escapeHtml(n) + "</span>";
      })
      .join("");
  }

  /* ---------- Счётчик до обжарки ---------- */

  var cdText = document.getElementById("cd-text");
  var CD_BASE = new Date(2026, 9, 22, 8, 40, 0); // четверг, партия № 214
  var CD_NUM0 = 214;

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function roastNumber(target) {
    return CD_NUM0 + Math.round((target - CD_BASE) / 604800000);
  }

  function nextRoast(now) {
    var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 40, 0);
    t.setDate(t.getDate() + ((4 - now.getDay() + 7) % 7)); // четверг = 4
    if (t <= now) t.setDate(t.getDate() + 7);
    return t;
  }

  function tickCountdown() {
    if (!cdText) return;
    var now = new Date();
    var roastStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 40, 0);
    var roastEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    if (now.getDay() === 4 && now >= roastStart && now < roastEnd) {
      cdText.textContent = "обжарка № " + roastNumber(roastStart) + " идёт прямо сейчас — уезжает сегодня";
      return;
    }
    var target = nextRoast(now);
    var diff = Math.max(0, target - now);
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    cdText.textContent =
      "до обжарки № " + roastNumber(target) + ": " +
      (d ? d + " дн " : "") + pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  if (cdText) {
    tickCountdown();
    setInterval(tickCountdown, 1000);
  }

  /* ---------- Наклон фото в hero ---------- */

  var heroArt = document.querySelector(".hero-art");
  var heroWrap = document.querySelector(".hero-photo-wrap");

  if (
    heroArt && heroWrap &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    heroArt.addEventListener("pointermove", function (e) {
      var r = heroArt.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      heroWrap.style.setProperty("--ry", (x * 7).toFixed(2) + "deg");
      heroWrap.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
    });
    heroArt.addEventListener("pointerleave", function () {
      heroWrap.style.setProperty("--rx", "0deg");
      heroWrap.style.setProperty("--ry", "0deg");
    });
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
      '<div class="prod-media">' +
      '<img src="' + p.img + '" alt="Пачка кофе — ' + escapeHtml(p.name) + '" loading="lazy" width="800" height="600"' +
      (p.pos ? ' style="object-position:' + p.pos + '"' : "") + ">" +
      '<span class="prod-badge mono">№ ' + p.num + "</span>" +
      '<span class="prod-roast mono">' + ROAST_NAMES[p.roast] + " обжарка</span>" +
      "</div>" +
      '<div class="prod-info">' +
      '<div class="prod-top">' +
      '<h3 class="prod-name">' + escapeHtml(p.name) + "</h3>" +
      '<span class="roast-dots" title="Обжарка: ' + ROAST_NAMES[p.roast] + '">' + dots + "</span>" +
      "</div>" +
      '<p class="prod-meta mono">' + escapeHtml(p.meta) + "</p>" +
      '<div class="prod-tags">' + notesTags(p.notes) + "</div>" +
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

  /* ---------- Конструктор блендов ---------- */

  var blendState = [null, null, null];
  var chipBox = document.getElementById("origin-chips");
  var slotEls = Array.prototype.slice.call(
    document.querySelectorAll("#blend-slots .blend-slot")
  );
  var blendName = document.getElementById("blend-name");
  var blendNotes = document.getElementById("blend-notes");
  var blendPrice = document.getElementById("blend-price");
  var blendAdd = document.getElementById("blend-add");
  var blendHint = document.getElementById("blend-hint");
  var chipEls = [];

  function selectedOrigins() {
    var sel = [];
    blendState.forEach(function (i) {
      if (i !== null) sel.push(i);
    });
    return sel;
  }

  function renderBlend() {
    var sel = selectedOrigins();

    chipEls.forEach(function (btn, i) {
      btn.classList.toggle("is-active", blendState.indexOf(i) > -1);
    });

    slotEls.forEach(function (slot, k) {
      var p = blendState[k] !== null ? PRODUCTS[blendState[k]] : null;
      slot.classList.toggle("is-filled", !!p);
      slot.textContent = p ? p.name.split(" · ")[0] : "компонент " + (k + 1);
      slot.setAttribute("aria-label", p ? "убрать " + p.name : "пустой слот");
    });

    if (!sel.length) {
      blendName.textContent = "твой бленд";
      blendNotes.textContent = "выбери зерна слева — посчитаем вкус и цену";
      blendPrice.textContent = "—";
      blendAdd.disabled = true;
      blendHint.textContent = "250 г · смешаем и обжарим одной партией";
      return;
    }

    var name = sel
      .map(function (i) {
        return PRODUCTS[i].name.split(" · ")[0];
      })
      .join(" × ");
    blendName.textContent = "«" + name + "»";

    var seen = {};
    var notes = [];
    sel.forEach(function (i) {
      PRODUCTS[i].notes.split(", ").forEach(function (n) {
        if (!seen[n]) {
          seen[n] = 1;
          notes.push(n);
        }
      });
    });
    blendNotes.textContent = "в чашке: " + notes.slice(0, 4).join(" · ");

    var sum = 0;
    sel.forEach(function (i) {
      sum += PRODUCTS[i].price;
    });
    blendPrice.textContent = Math.round((sum / sel.length + 120) / 10) * 10 + " ₽ · 250 г";

    blendAdd.disabled = sel.length < 2;
    blendHint.textContent = sel.length < 2
      ? "добавь ещё хотя бы одно зерно"
      : "обжарим в ближайший четверг вместе с партией";
  }

  if (chipBox && slotEls.length) {
    PRODUCTS.forEach(function (p, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "origin-chip";
      btn.innerHTML =
        '<span class="oc-name">' + escapeHtml(p.name.split(" · ")[0]) + "</span>" +
        '<span class="oc-notes mono">' +
        escapeHtml(p.notes.split(", ")[0]) + " · " + ROAST_NAMES[p.roast] + "</span>";
      btn.addEventListener("click", function () {
        var at = blendState.indexOf(i);
        if (at > -1) {
          blendState[at] = null;
        } else {
          var empty = blendState.indexOf(null);
          if (empty === -1) {
            showToast("Максимум три зерна — сначала убери одно из слота");
            return;
          }
          blendState[empty] = i;
        }
        renderBlend();
      });
      chipBox.appendChild(btn);
      chipEls.push(btn);
    });

    slotEls.forEach(function (slot) {
      slot.addEventListener("click", function () {
        var k = +slot.dataset.k;
        if (blendState[k] !== null) {
          blendState[k] = null;
          renderBlend();
        }
      });
    });

    blendAdd.addEventListener("click", function () {
      addToCart("Бленд " + blendName.textContent + " · 250 г");
    });

    renderBlend();
  }

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

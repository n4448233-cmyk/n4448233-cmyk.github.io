/* ============================================================
   ПИНГ — логика клуба: неон, частицы, бронь, турниры
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Тост ---------- */
  var toastEl = $("#toast");
  var toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 3400);
  }

  /* ---------- Режим для скриншотов: ?shot=id секции ---------- */
  var shotId = new URLSearchParams(location.search).get("shot");
  var shotMode = !!shotId && !!document.getElementById(shotId);
  if (shotMode) {
    var shotEl = document.getElementById(shotId);
    // вместо скролла прячем всё, кроме целевой секции: кадр всегда с её начала
    Array.prototype.forEach.call(document.querySelectorAll("main > *"), function (el) {
      if (el !== shotEl) el.style.display = "none";
    });
    if (shotId !== "hero") {
      shotEl.style.paddingTop = "140px";
      shotEl.style.minHeight = "100vh";
    }
    // сразу финальное состояние: без анимаций появления
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Шапка и меню ---------- */
  var topbar = $(".topbar");
  function onScroll() {
    topbar.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = $("#burger");
  var nav = $("#main-nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Темы неона ---------- */
  var THEMES = [
    { id: "cyan", label: "неон: циан" },
    { id: "violet", label: "неон: виолет" },
    { id: "acid", label: "неон: кислота" },
  ];
  var themeBtn = $("#theme-btn");
  var themeName = $("#theme-name");
  var themeIdx = 0;

  function neonRGB() {
    var v = getComputedStyle(document.body).getPropertyValue("--neon-rgb").trim();
    var v2 = getComputedStyle(document.body).getPropertyValue("--neon2-rgb").trim();
    return [v, v2];
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      themeIdx = (themeIdx + 1) % THEMES.length;
      document.body.setAttribute("data-theme", THEMES[themeIdx].id);
      themeName.textContent = THEMES[themeIdx].label;
      FX.recolor(neonRGB());
      toast("Неон переключён: " + THEMES[themeIdx].label.replace("неон: ", ""));
    });
  }

  /* ---------- Кастомный курсор ---------- */
  if (finePointer && !reduced) {
    var dot = $("#cur-dot");
    var ring = $("#cur-ring");
    var mx = -100, my = -100, rx = -100, ry = -100, shown = false;

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; document.body.classList.add("has-cursor"); }
      var onLink = !!(e.target.closest && e.target.closest("a, button, input, .seat"));
      ring.classList.toggle("on-link", onLink);
    });

    (function cursorLoop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      var d = dot.style, r = ring.style;
      d.transform = "translate(" + (mx - 3.5) + "px," + (my - 3.5) + "px)";
      r.transform = "translate(" + (rx - 18) + "px," + (ry - 18) + "px)";
      requestAnimationFrame(cursorLoop);
    })();
  }

  /* ---------- Частицы в hero ---------- */
  var FX = (function () {
    var canvas = $("#hero-fx");
    if (!canvas || reduced) return { recolor: function () {} };

    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var pts = [];
    var colors = neonRGB().map(function (c) { return c.split(",").map(Number); });
    var mouse = { x: -9999, y: -9999 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var n = Math.max(34, Math.min(85, Math.round(W / 17)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: 1.1 + Math.random() * 1.4,
          c: Math.random() > 0.5 ? 1 : 0,
        });
      }
    }

    function frame() {
      if (!document.hidden) {
        ctx.clearRect(0, 0, W, H);
        var i, j, p, q, d2;

        for (i = 0; i < pts.length; i++) {
          p = pts[i];
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
          if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
        }

        ctx.lineWidth = 1;
        for (i = 0; i < pts.length; i++) {
          p = pts[i];
          for (j = i + 1; j < pts.length; j++) {
            q = pts[j];
            var dx = p.x - q.x, dy = p.y - q.y;
            d2 = dx * dx + dy * dy;
            if (d2 < 12100) {
              var a = (1 - Math.sqrt(d2) / 110) * 0.16;
              var c = colors[p.c];
              ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
            }
          }
        }

        for (i = 0; i < pts.length; i++) {
          p = pts[i];
          c = colors[p.c];
          ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.8)";
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }

    canvas.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    });

    window.addEventListener("resize", resize);
    resize();
    frame();

    return {
      recolor: function (rgb) { colors = rgb.map(function (c) { return c.split(",").map(Number); }); },
    };
  })();

  /* ---------- Эквалайзер и живой fps в hero-карточке ---------- */
  var eq = $("#eq");
  if (eq) {
    var span;
    for (var i = 0; i < 22; i++) {
      span = document.createElement("span");
      span.style.setProperty("--h", String(Math.round(Math.random() * 82)));
      span.style.setProperty("--d", Math.random().toFixed(2));
      eq.appendChild(span);
    }
  }
  var liveFps = $("#live-fps");
  if (liveFps) {
    setInterval(function () {
      liveFps.textContent = String(378 + Math.round(Math.random() * 84));
    }, 2200);
  }

  /* ---------- Появление при скролле ---------- */
  var reveals = $$(".reveal");
  $$(".zones-grid, .price-grid, .tourney-grid").forEach(function (grid) {
    $$(".reveal", grid).forEach(function (card, i) {
      card.style.transitionDelay = (i * 90) + "ms";
    });
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -30px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Счётчики в hero ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduced || shotMode) { el.textContent = target + suffix; return; }
    var start = null, dur = 1300;
    function stepFn(ts) {
      if (!start) start = ts;
      var k = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (k < 1) requestAnimationFrame(stepFn);
    }
    requestAnimationFrame(stepFn);
  }
  var statNums = $$(".stat-num");
  if ("IntersectionObserver" in window) {
    var ioStat = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          ioStat.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    statNums.forEach(function (el) { ioStat.observe(el); });
  } else {
    statNums.forEach(countUp);
  }

  /* ---------- 3D-наклон карточек залов ---------- */
  if (finePointer && !reduced) {
    $$(".tilt").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--rx", (-(y - 0.5) * 7).toFixed(2) + "deg");
        card.style.setProperty("--ry", ((x - 0.5) * 9).toFixed(2) + "deg");
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* ---------- Тарифы: время суток ---------- */
  var PRICE_MATRIX = {
    hourly: { morning: 120, evening: 170, night: 150 },
    five: { morning: 480, evening: 680, night: 600 },
    marafon: { morning: 890, evening: 990, night: 890 },
  };
  $$(".day-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $$(".day-tab").forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");

      var part = tab.getAttribute("data-part");
      $$(".p-num").forEach(function (num) {
        var key = num.getAttribute("data-key");
        if (!key || !PRICE_MATRIX[key]) return;
        num.classList.remove("swap");
        void num.offsetWidth;
        num.textContent = PRICE_MATRIX[key][part];
        num.classList.add("swap");
      });
    });
  });

  /* ---------- FPS-бары ---------- */
  $$(".fps-row").forEach(function (row) {
    var fps = parseInt(row.getAttribute("data-fps"), 10) || 0;
    var pct = Math.min(100, Math.round(fps / 480 * 100));
    var fill = $(".fps-bar i", row);
    if (fill) fill.style.setProperty("--w", pct + "%");
  });

  /* ---------- Бронирование ---------- */
  var ZONES = {
    std: { name: "зал «Стандарт»", seats: 32, occupied: 11, price: 120, cols: 8 },
    pro: { name: "зал «Про»", seats: 20, occupied: 6, price: 180, cols: 10 },
    vip: { name: "зал «VIP»", seats: 8, occupied: 2, price: 350, cols: 8 },
  };

  // Детерминированный «кто где сидит» — одинаковый весь день
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  var today = new Date();
  var dayKey = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();

  var state = { zone: "std", hours: 3, selected: [], mine: {} };
  var seatsEl = $("#seats");
  var seatZoneName = $("#seat-zone-name");
  var seatHint = $("#seat-hint");
  var summaryEl = $("#book-summary");
  var bookBtn = $("#book-btn");
  var hoursRange = $("#hours-range");
  var hoursValue = $("#hours-value");
  var freeSeatsEl = $("#free-seats");

  function occupiedFor(zoneKey) {
    var z = ZONES[zoneKey];
    var rnd = mulberry32(hashStr(dayKey + ":" + zoneKey));
    var idx = [];
    for (var i = 1; i <= z.seats; i++) idx.push(i);
    for (var j = idx.length - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var t = idx[j]; idx[j] = idx[k]; idx[k] = t;
    }
    var occ = {};
    idx.slice(0, z.occupied).forEach(function (n) { occ[n] = true; });
    (state.mine[zoneKey] || []).forEach(function (n) { delete occ[n]; });
    return occ;
  }

  function totalFree() {
    var sum = 0;
    Object.keys(ZONES).forEach(function (k) {
      sum += ZONES[k].seats - ZONES[k].occupied - (state.mine[k] || []).length;
    });
    return sum;
  }

  function renderHeroFree() {
    if (freeSeatsEl) freeSeatsEl.textContent = String(totalFree());
  }

  function fmt(n) { return n.toLocaleString("ru-RU"); }

  function renderSeats() {
    var z = ZONES[state.zone];
    var occ = occupiedFor(state.zone);
    var mineList = state.mine[state.zone] || [];
    var free = z.seats - z.occupied - mineList.length;

    seatZoneName.textContent = z.name;
    seatHint.textContent = "свободно " + free + " из " + z.seats;
    seatsEl.style.gridTemplateColumns = "repeat(" + z.cols + ", 1fr)";
    seatsEl.innerHTML = "";

    for (var n = 1; n <= z.seats; n++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "seat";
      b.textContent = n;
      b.setAttribute("aria-label", "Место " + n);
      if (occ[n]) {
        b.classList.add("occ");
        b.disabled = true;
        b.setAttribute("aria-label", "Место " + n + " занято");
      } else if (mineList.indexOf(n) !== -1) {
        b.classList.add("mine");
      } else if (state.selected.indexOf(n) !== -1) {
        b.classList.add("mine");
      }
      seatsEl.appendChild(b);
    }
  }

  function renderSummary() {
    var z = ZONES[state.zone];
    var sel = state.selected.length;
    var mine = (state.mine[state.zone] || []).length;

    if (sel === 0 && mine === 0) {
      summaryEl.innerHTML = '<span class="sum-line">выбери место на карте →</span>';
      bookBtn.disabled = true;
      return;
    }
    var html = "";
    if (sel > 0) {
      var total = sel * z.price * state.hours;
      html += '<span class="sum-line">место № ' + state.selected.sort(function (a, b) { return a - b; }).join(", ")
            + " × " + state.hours + " ч</span>";
      html += '<span class="sum-line sum-total">' + fmt(total) + " ₽</span>";
      bookBtn.disabled = false;
    } else {
      bookBtn.disabled = true;
    }
    if (mine > 0) {
      html += '<span class="sum-line sum-code">забронировано: ' + mine + " · код " + state.code + "</span>";
    }
    summaryEl.innerHTML = html;
  }

  function selectZone(key) {
    if (!ZONES[key]) {
      toast("Консольную зону бронируют по телефону: +7 900 555-01-05");
      return;
    }
    state.zone = key;
    state.selected = [];
    $$(".zone-pill").forEach(function (p) {
      p.classList.toggle("is-active", p.getAttribute("data-zone") === key);
    });
    renderSeats();
    renderSummary();
  }

  if (seatsEl) {
    seatsEl.addEventListener("click", function (e) {
      var b = e.target.closest(".seat");
      if (!b || b.disabled) return;
      var n = parseInt(b.textContent, 10);
      var mineList = state.mine[state.zone] || [];

      if (mineList.indexOf(n) !== -1) {
        state.mine[state.zone] = mineList.filter(function (m) { return m !== n; });
        toast("Бронь места № " + n + " отменена");
        renderSeats(); renderSummary(); renderHeroFree();
        return;
      }
      var at = state.selected.indexOf(n);
      if (at === -1) state.selected.push(n);
      else state.selected.splice(at, 1);

      b.classList.toggle("mine");
      renderSummary();
    });
  }

  $$(".zone-pill").forEach(function (pill) {
    pill.addEventListener("click", function () { selectZone(pill.getAttribute("data-zone")); });
  });

  $$(".zone-card").forEach(function (card) {
    var link = $(".zone-link", card);
    if (!link) return;
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var key = card.getAttribute("data-zone");
      selectZone(key);
      $("#book").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  if (hoursRange) {
    hoursRange.addEventListener("input", function () {
      state.hours = parseInt(hoursRange.value, 10);
      hoursValue.textContent = state.hours + " ч";
      renderSummary();
    });
  }

  if (bookBtn) {
    bookBtn.addEventListener("click", function () {
      if (!state.selected.length) return;
      var z = ZONES[state.zone];
      state.code = "P1NG-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      var nums = state.selected.slice().sort(function (a, b) { return a - b; });
      if (!state.mine[state.zone]) state.mine[state.zone] = [];
      state.mine[state.zone] = state.mine[state.zone].concat(nums);
      state.selected = [];

      toast("Готово: " + (nums.length > 1 ? "места № " : "место № ") + nums.join(", ")
        + " в " + z.name + ". Код брони " + state.code + " — покажи его на ресепшене");

      renderSeats();
      renderSummary();
      renderHeroFree();
    });
  }

  if (seatsEl && seatZoneName && summaryEl && bookBtn) {
    renderSeats();
    renderSummary();
    renderHeroFree();
  }

  // Лёгкая «жизнь» в счётчике свободных мест
  if (freeSeatsEl && !reduced) {
    setInterval(function () {
      var base = totalFree();
      var drift = base + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0);
      if (drift >= base - 1 && drift <= base + 3 && drift > 0) {
        freeSeatsEl.textContent = String(drift);
      }
    }, 7000);
  }

  /* ---------- Турниры: отсчёт до субботы 19:00 ---------- */
  var cdValue = $("#cd-value");
  if (cdValue) {
    function nextSat19() {
      var d = new Date();
      var target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0, 0);
      var day = d.getDay();
      var add = (6 - day + 7) % 7;
      target.setDate(target.getDate() + add);
      if (target <= d) target.setDate(target.getDate() + 7);
      return target;
    }
    var deadline = nextSat19();
    function pad(x) { return (x < 10 ? "0" : "") + x; }
    function tick() {
      var diff = Math.max(0, deadline - new Date());
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      cdValue.textContent = d + " дн " + pad(h) + ":" + pad(m) + ":" + pad(sec);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Записаться на турнир ---------- */
  $$(".t-join").forEach(function (btn) {
    btn.addEventListener("click", function () {
      toast("Ты в списке: " + btn.getAttribute("data-tourney")
        + ". Расписание пришлём в telegram — @ping_club");
    });
  });
})();

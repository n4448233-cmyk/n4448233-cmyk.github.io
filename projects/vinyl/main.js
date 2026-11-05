/* ============================================================
   33⅓ — данные каталога, фильтры, мелкая логика страницы.
   Порты reactbits лежат в js/ и инициализируются здесь.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- каталог ---------- */

  var GENRE_LABELS = {
    all: "все",
    rock: "рок",
    jazz: "джаз",
    electronic: "электроника",
    disco: "диско",
    classic: "классика",
    hiphop: "хип-хоп",
    metal: "метал"
  };

  var RECORDS = [
    { img: "img/covers/sgt-pepper.jpg", artist: "The Beatles", title: "Sgt. Pepper's Lonely Hearts Club Band", year: "1967", genre: "rock", tag: "ориг. UK", price: 5400 },
    { img: "gen:acdc-back-in-black", artist: "AC/DC", title: "Back In Black", year: "1980", genre: "rock", tag: "ориг. AU", price: 6200 },
    { img: "img/covers/sinatra-thats-life.jpg", artist: "Frank Sinatra", title: "That's Life", year: "1966", genre: "jazz", tag: "", price: 3200 },
    { img: "img/covers/mozart-requiem.jpg", artist: "В. А. Моцарт", title: "Requiem", year: "", genre: "classic", tag: "2LP", price: 2100 },
    { img: "img/covers/melodiya-beatles.jpg", artist: "The Beatles", title: "Сингл · фабрика «Мелодия»", year: "", genre: "rock", tag: "СССР", price: 4900 },
    { img: "img/covers/get-loose-crew.jpg", artist: "Get Loose Crew", title: "Get Loose Crew", year: "1988", genre: "hiphop", tag: "12\"", price: 3800 },
    { img: "img/covers/electronic-chamber-music.png", artist: "Various Artists", title: "Electronic Chamber Music", year: "", genre: "electronic", tag: "LP", price: 2700 },
    { img: "img/covers/disco-inferno.png", artist: "The Trammps", title: "Disco Inferno", year: "1977", genre: "disco", tag: "US 12\"", price: 3000 },
    { img: "img/covers/honey-love-78.png", artist: "The Drifters", title: "Honey Love", year: "", genre: "jazz", tag: "78 об/мин", price: 5200 },
    { img: "img/covers/pisu-strange-fruit.jpg", artist: "Stefano Pisu Trio", title: "Strange Fruit", year: "", genre: "jazz", tag: "", price: 2400 },
    { img: "img/covers/flight-attendant.jpg", artist: "Flight Attendant", title: "Flight Attendant", year: "", genre: "rock", tag: "", price: 2600 },
    { img: "img/covers/cloud-script.jpg", artist: "Cloud Script", title: "Cloud Script", year: "", genre: "electronic", tag: "", price: 2200 },
    { img: "img/covers/telescopes-third-wave.jpg", artist: "The Telescopes", title: "Third Wave", year: "", genre: "rock", tag: "Weisskalt", price: 3100 },
    { img: "img/covers/korn.jpg", artist: "Korn", title: "Korn", year: "1994", genre: "metal", tag: "красный мрамор", price: 6800 },
    { img: "img/covers/sleep-token.jpg", artist: "Sleep Token", title: "Even In Arcadia", year: "2025", genre: "metal", tag: "2025", price: 4500 },
    { img: "img/covers/ghost-skeleta.jpg", artist: "Ghost", title: "Skeletá", year: "2025", genre: "metal", tag: "2025", price: 4200 },
    { img: "img/covers/opeth-tlwat.jpg", artist: "Opeth", title: "The Last Will and Testament", year: "2024", genre: "metal", tag: "§1—§7", price: 4900 }
  ];

  function plural(n) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return "пластинка";
    if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return "пластинки";
    return "пластинок";
  }

  function formatPrice(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009") + " ₽";
  }

  var cardsBox = document.getElementById("cards");
  var emptyNote = document.getElementById("cards-empty");
  var currentGenre = "all";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function cardHTML(r, idx) {
    var meta = [];
    if (r.year) meta.push('<span class="card-year">' + esc(r.year) + "</span>");
    meta.push('<span class="card-genre">' + esc(GENRE_LABELS[r.genre]) + "</span>");
    meta.push('<span class="card-price">' + formatPrice(r.price) + "</span>");

    var imgTag = r.img.indexOf("gen:") === 0
      ? '<img data-gen="' + esc(r.key || r.img.slice(4)) + '" alt="' + esc(r.artist + " — " + r.title) + '">'
      : '<img src="' + r.img + '" alt="' + esc(r.artist + " — " + r.title) + '" loading="lazy">';

    return '<article class="card reveal" data-genre="' + r.genre + '" data-idx="' + idx + '">' +
      '<div class="card-cover">' +
        imgTag +
        (r.tag ? '<span class="card-tag">' + esc(r.tag) + "</span>" : "") +
      "</div>" +
      '<div class="card-meta">' +
        '<span class="card-artist">' + esc(r.artist) + "</span>" +
        '<h3 class="card-title">' + esc(r.title) + "</h3>" +
        '<div class="card-row">' + meta.join("") + "</div>" +
      "</div></article>";
  }

  cardsBox.innerHTML = RECORDS.map(cardHTML).join("");

  // рисованные конверты (AC/DC, метал-релизы): canvas в data-URL,
  // для Korn сначала пробуем настоящее фото, при отсутствии — рисунок
  if (window.RecordFactory && RecordFactory.sleeveFrontCanvas) {
    [].forEach.call(cardsBox.querySelectorAll("img[data-gen]"), function (im) {
      var key = im.getAttribute("data-gen");
      var card = im.closest(".card");
      var rec = RECORDS[parseInt(card.getAttribute("data-idx"), 10)];
      if (rec && rec.photo) {
        var probe = new Image();
        probe.onload = function () { im.src = rec.photo; };
        probe.onerror = function () {
          var c = RecordFactory.sleeveFrontCanvas(key);
          if (c) im.src = c.toDataURL("image/png");
        };
        probe.src = rec.photo;
      } else {
        var c = RecordFactory.sleeveFrontCanvas(key);
        if (c) im.src = c.toDataURL("image/png");
      }
    });
  }

  // карточки появились после reveal.js — подписываем их на появление сами
  if (window.revealObserve) window.revealObserve(cardsBox);

  // ключи релизов + регистрация в фабрике этикеток
  RECORDS.forEach(function (r) {
    r.key = r.img.indexOf("gen:") === 0
      ? r.img.slice(4)
      : r.img.replace(/^.*\//, "").replace(/\.\w+$/, "");
  });
  if (window.RecordFactory) window.RecordFactory.register(RECORDS);

  // обновляем счётчики на жанровых карточках
  [].forEach.call(document.querySelectorAll("[data-count-genre]"), function (el) {
    var g = el.getAttribute("data-count-genre");
    var n = RECORDS.filter(function (r) { return r.genre === g; }).length;
    el.textContent = "в привозе: " + n + " " + plural(n);
  });

  /* ---------- фильтры (dock, чипсы, жанровые карточки) ---------- */

  function setGenre(g) {
    currentGenre = g;
    var shown = 0;

    [].forEach.call(cardsBox.children, function (card) {
      var ok = g === "all" || card.getAttribute("data-genre") === g;
      card.classList.toggle("is-hidden", !ok);
      if (ok) {
        shown++;
        if (shown <= 8) card.style.setProperty("--d", (shown * 0.05) + "s");
      }
    });

    emptyNote.hidden = shown !== 0;

    [].forEach.call(document.querySelectorAll("#genre-dock .dock-item, #genre-chips .chip"), function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-genre") === g);
    });
  }

  setGenre("all");

  [].forEach.call(document.querySelectorAll("#genre-chips .chip"), function (btn) {
    btn.addEventListener("click", function () { setGenre(btn.getAttribute("data-genre")); });
  });

  [].forEach.call(document.querySelectorAll(".genre-card"), function (card) {
    function pick() {
      setGenre(card.getAttribute("data-genre"));
      document.getElementById("fresh").scrollIntoView({ behavior: "smooth" });
    }
    card.addEventListener("click", pick);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
    });
  });

  /* ---------- 3D-осмотр: клик по карточке пластинки ---------- */

  if (window.VinylViewer) {
    VinylViewer.onClose = function (rec) {
      // осмотрели — наверху теперь эта пластинка
      if (window.VinylDisc) window.VinylDisc.setRecord(rec.key);
    };

    cardsBox.addEventListener("click", function (e) {
      var card = e.target.closest ? e.target.closest(".card") : null;
      if (!card) return;
      var rec = RECORDS[parseInt(card.getAttribute("data-idx"), 10)];
      if (rec) VinylViewer.open(rec);
    });
  }

  /* ---------- инициализация портов reactbits ---------- */

  if (window.Iridescence) {
    window.Iridescence(document.getElementById("iridescence"), {
      colors: ["#6fe7dd", "#a78bfa", "#f49ac1"],
      speed: 0.45,
      amplitude: 1.15
    });
  }

  if (window.TextPressure) {
    window.TextPressure(document.getElementById("pressure-title"), {
      minWeight: 220,
      maxWeight: 900,
      scale: 0.12
    });
  }

  if (window.Dock) {
    window.Dock(document.getElementById("genre-dock"), {
      onPick: function (item) { setGenre(item.getAttribute("data-genre")); }
    });
  }

  /* ---------- шапка, бургер, форма, год ---------- */

  var header = document.getElementById("site-header");
  window.addEventListener("scroll", function () {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  }, { passive: true });

  var burger = document.getElementById("nav-burger");
  var nav = document.getElementById("site-nav");
  burger.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      nav.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- «Сейчас играет»: секции как треклист ---------- */

  var np = document.getElementById("now-playing");
  if (np) {
    var TRACKS = {
      hero: ["A0", "33⅓ — вступление"],
      fresh: ["A1", "Свежий привоз"],
      genres: ["A2", "С чего начнём"],
      stats: ["A3", "Магазин в цифрах"],
      bar: ["B1", "Бар прослушивания"],
      about: ["B2", "О магазине"],
      contacts: ["B3", "Контакты"]
    };
    var npCode = document.getElementById("np-code");
    var npTrack = document.getElementById("np-track");
    var npBar = document.getElementById("np-bar");
    var npIds = Object.keys(TRACKS);
    var npCurrent = "";

    function npUpdate() {
      var mid = window.scrollY + window.innerHeight * 0.45;
      var cur = npIds[0];
      for (var i = 0; i < npIds.length; i++) {
        var sec = document.getElementById(npIds[i]);
        if (sec && sec.offsetTop <= mid) cur = npIds[i];
      }
      if (cur !== npCurrent) {
        npCurrent = cur;
        npCode.textContent = TRACKS[cur][0];
        npTrack.textContent = TRACKS[cur][1];
      }
      np.classList.toggle("is-visible", window.scrollY > 160);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      npBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    }

    window.addEventListener("scroll", npUpdate, { passive: true });
    window.addEventListener("resize", npUpdate, { passive: true });
    npUpdate();

    var disc = document.getElementById("vinyl-disc");
    var npToggle = document.getElementById("np-toggle");
    npToggle.addEventListener("click", function () {
      var paused = np.classList.toggle("is-paused");
      if (disc) disc.classList.toggle("is-paused", paused);
      npToggle.setAttribute("aria-label", paused ? "Продолжить" : "Поставить на паузу");
      npToggle.setAttribute("title", paused ? "Продолжить" : "Пауза");
    });
  }

  var form = document.getElementById("book-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var done = form.querySelector(".form-done");
    done.hidden = false;
    var btn = form.querySelector("button[type=submit]");
    btn.textContent = "Заявка принята";
    btn.setAttribute("disabled", "");
    btn.style.opacity = "0.75";
  });

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- режим ?shot= для секционных скриншотов ---------- */

  var shot = new URLSearchParams(location.search).get("shot");
  if (shot) {
    document.body.classList.add("shot-mode");
    // fullPage-скриншоты в headless сшиваются криво из-за плавного скролла
    document.documentElement.style.scrollBehavior = "auto";
    document.documentElement.style.overflowX = "hidden";
    var target = document.getElementById(shot);
    if (target) {
      target.classList.add("is-shot");
      document.title = "33⅓ · shot:" + shot;
    }
    // остановить декоративные канвасы — кадр должен быть стабильным
    window.addEventListener("load", function () {
      if (window.Iridescence && shot !== "hero") {
        var c = document.getElementById("iridescence");
        if (c) c.style.display = "none";
      }
    });
  }
})();

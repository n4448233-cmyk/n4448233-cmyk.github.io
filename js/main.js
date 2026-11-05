/* ============================================================
   Логика страницы: рендер проектов с галереями скриншотов,
   полноэкранный просмотр (лайтбокс), контакты и мелочи.
   Обычный JS, без зависимостей.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Имя в шапке, приветствии и подвале ---------- */

  document.querySelectorAll("[data-bind='name']").forEach(function (el) {
    el.textContent = PROFILE.name;
  });

  // Одинаковая круглая кнопка со стрелкой для галереи и лайтбокса
  function arrowButton(direction, label) {
    var d = direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7";
    return (
      '<button class="g-arrow ' + direction + '" type="button" aria-label="' + label + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="' + d + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg></button>"
    );
  }

  /* ============================================================
     ЛАЙТБОКС — полноэкранный просмотр скриншотов.
     Создаётся один раз, используется всеми карточками.
     ============================================================ */

  var lightbox = (function () {
    var root = document.createElement("div");
    root.className = "lightbox";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Просмотр скриншота");
    root.setAttribute("tabindex", "-1");
    root.innerHTML =
      '<div class="lightbox-backdrop"></div>' +
      '<figure class="lightbox-figure">' +
      '<img class="lightbox-img" src="" alt="">' +
      '<figcaption class="lightbox-caption mono"></figcaption>' +
      "</figure>" +
      '<button class="lightbox-close" type="button" aria-label="Закрыть">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg></button>" +
      arrowButton("prev", "Предыдущий скриншот") +
      arrowButton("next", "Следующий скриншот") +
      '<a class="btn btn-solid lightbox-demo" target="_blank" rel="noopener" hidden>Открыть сайт &#8599;</a>';
    document.body.appendChild(root);

    var img = root.querySelector(".lightbox-img");
    var caption = root.querySelector(".lightbox-caption");
    var closeBtn = root.querySelector(".lightbox-close");
    var prevBtn = root.querySelector(".g-arrow.prev");
    var nextBtn = root.querySelector(".g-arrow.next");
    var demoBtn = root.querySelector(".lightbox-demo");

    var project = null;
    var index = 0;
    var count = 0;
    var hideTimer = null;

    function render() {
      img.src = project.images[index];
      img.alt = project.title + " — скриншот " + (index + 1);
      caption.textContent =
        (index + 1) + " / " + count + " · " + project.title;
      var single = count <= 1;
      prevBtn.disabled = single;
      nextBtn.disabled = single;
      if (project.demo) {
        demoBtn.href = project.demo;
        demoBtn.hidden = false;
      } else {
        demoBtn.hidden = true;
      }
    }

    function open(target, startIndex) {
      project = target;
      count = target.images.length;
      index = Math.min(Math.max(startIndex || 0, 0), count - 1);
      clearTimeout(hideTimer);
      render();
      root.hidden = false;
      // Небольшая пауза, чтобы сработал CSS-переход появления
      requestAnimationFrame(function () {
        root.classList.add("is-open");
      });
      document.body.style.overflow = "hidden"; // блокируем прокрутку страницы
      root.focus();
    }

    function close() {
      root.classList.remove("is-open");
      document.body.style.overflow = "";
      hideTimer = setTimeout(function () {
        root.hidden = true;
        img.src = "";
      }, 200);
    }

    function step(delta) {
      if (count <= 1) return;
      index = (index + delta + count) % count; // по кругу
      render();
    }

    closeBtn.addEventListener("click", close);
    root.querySelector(".lightbox-backdrop").addEventListener("click", close);
    prevBtn.addEventListener("click", function () {
      step(-1);
    });
    nextBtn.addEventListener("click", function () {
      step(1);
    });

    document.addEventListener("keydown", function (e) {
      if (root.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    });

    return { open: open };
  })();
  /* ============================================================
     ПРОЕКТЫ: колода CardSwap + панель передней карточки.
     Вкладки пересобирают колоду из отфильтрованных проектов.
     ============================================================ */

  // Обложка для карточки в колоде: скриншот или сгенерированная заглушка
  function coverFor(project, index) {
    if (project.images && project.images.length) return project.images[0];
    var num = String(index + 1).padStart(2, "0");
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="300" viewBox="0 0 460 300">' +
      '<defs><pattern id="p" width="22" height="22" patternUnits="userSpaceOnUse">' +
      '<circle cx="2" cy="2" r="1.6" fill="rgba(200,179,246,0.12)"/></pattern></defs>' +
      '<rect width="460" height="300" fill="#14153a"/>' +
      '<rect width="460" height="300" fill="url(#p)"/>' +
      '<text x="24" y="282" font-family="monospace" font-size="96" font-weight="bold" ' +
      'fill="none" stroke="#4a4499" stroke-width="2">' + num + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  var deckHolder = document.getElementById("projects-deck");
  var spotBox = document.getElementById("project-spot");
  var tabsBox = document.getElementById("projects-tabs");
  var emptyBox = document.getElementById("projects-empty");
  var deckApi = null;
  var currentList = [];

  // Панель под колодой: описание карточки, которая сейчас впереди
  function renderSpot(project) {
    if (!spotBox) return;
    spotBox.innerHTML = "";
    if (!project) return;

    var panel = document.createElement("article");
    panel.className = "spot-card filter-in";

    if (project.featured) {
      var badge = document.createElement("span");
      badge.className = "card-badge mono";
      badge.textContent = "Свежая работа";
      panel.appendChild(badge);
    }

    var title = document.createElement("h3");
    title.className = "spot-title";
    title.textContent = project.title;
    panel.appendChild(title);

    var desc = document.createElement("p");
    desc.className = "spot-desc";
    desc.textContent = project.description || "";
    panel.appendChild(desc);

    if (project.tags && project.tags.length) {
      var tags = document.createElement("ul");
      tags.className = "project-tags";
      project.tags.forEach(function (tag) {
        var li = document.createElement("li");
        li.textContent = tag;
        tags.appendChild(li);
      });
      panel.appendChild(tags);
    }

    var links = document.createElement("div");
    links.className = "project-links";
    if (project.demo) {
      var demo = document.createElement("a");
      demo.href = project.demo;
      demo.target = "_blank";
      demo.rel = "noopener";
      demo.textContent = "Демо ↗";
      links.appendChild(demo);
    }
    if (project.source) {
      var src = document.createElement("a");
      src.href = project.source;
      src.target = "_blank";
      src.rel = "noopener";
      src.textContent = "Код ↗";
      links.appendChild(src);
    }
    if (project.images && project.images.length) {
      var gal = document.createElement("button");
      gal.type = "button";
      gal.className = "spot-gallery mono";
      gal.textContent = "Скриншоты (" + project.images.length + ") ↗";
      gal.addEventListener("click", function () {
        lightbox.open(project, 0);
      });
      links.appendChild(gal);
    }
    if (links.childNodes.length) panel.appendChild(links);

    spotBox.appendChild(panel);
  }

  function showList(list, category) {
    currentList = list;
    if (deckApi) {
      deckApi.destroy();
      deckApi = null;
    }
    if (deckHolder) deckHolder.innerHTML = "";

    if (!list.length) {
      if (deckHolder) deckHolder.style.display = "none";
      if (spotBox) spotBox.innerHTML = "";
      if (emptyBox) {
        emptyBox.hidden = false;
        emptyBox.querySelector("p").textContent =
          "В разделе «" + category + "» пока пусто — работы готовятся.";
      }
      return;
    }
    if (emptyBox) emptyBox.hidden = true;
    if (deckHolder) deckHolder.style.display = "";

    var items = list.map(function (p, i) {
      return { title: p.title, image: coverFor(p, i), alt: p.title };
    });

    deckApi = window.CardSwap(deckHolder, {
      items: items,
      width: 460,
      height: 340,
      cardDistance: 55,
      verticalDistance: 65,
      depth: 80,
      skewAmount: 6,
      visibleCards: 4,
      delay: 4200,
      cardRadius: 16,
      theme: "dark",
      label: "Проекты",
      onCardClick: function (i) {
        var p = currentList[i];
        if (!p) return;
        if (p.images && p.images.length) lightbox.open(p, 0);
        else if (p.demo) window.open(p.demo, "_blank", "noopener");
      },
      onChange: function (i) {
        renderSpot(currentList[i]);
      }
    });
    renderSpot(list[0]);
  }

  if (deckHolder && typeof PROJECTS !== "undefined" && typeof window.CardSwap === "function") {
    if (tabsBox && typeof CATEGORIES !== "undefined") {
      var buttons = [];
      CATEGORIES.forEach(function (category, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tab-btn" + (i === 0 ? " is-active" : "");
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
        btn.textContent = category;
        btn.addEventListener("click", function () {
          buttons.forEach(function (b) {
            b.classList.remove("is-active");
            b.setAttribute("aria-selected", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-selected", "true");
          showList(
            PROJECTS.filter(function (p) {
              return category === "Все" || p.category === category;
            }),
            category
          );
        });
        tabsBox.appendChild(btn);
        buttons.push(btn);
      });
    }

    showList(PROJECTS.slice(), "Все");
  }


  /* ---------- Контакты ---------- */

  var emailLink = document.getElementById("email-link");
  if (emailLink && CONTACTS.email) {
    emailLink.textContent = CONTACTS.email;
    emailLink.href = "mailto:" + CONTACTS.email;
  }

  var copyBtn = document.getElementById("copy-email");
  if (copyBtn) {
    // Запасной вариант для случаев, когда clipboard API недоступен
    // (старые браузеры, открытие как file:// и т.п.)
    var fallbackCopy = function (text) {
      var tmp = document.createElement("textarea");
      tmp.value = text;
      tmp.style.position = "fixed";
      tmp.style.opacity = "0";
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
    };

    copyBtn.addEventListener("click", function () {
      var text = CONTACTS.email || "";
      var attempt;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        // Если буфер обмена не отвечает за 800 мс — идём в запасной вариант
        attempt = Promise.race([
          navigator.clipboard.writeText(text),
          new Promise(function (_, reject) {
            setTimeout(function () {
              reject(new Error("clipboard timeout"));
            }, 800);
          }),
        ]).catch(function () {
          fallbackCopy(text);
        });
      } else {
        attempt = Promise.resolve(fallbackCopy(text));
      }

      attempt.then(function () {
        copyBtn.textContent = "Скопировано";
        setTimeout(function () {
          copyBtn.textContent = "Скопировать";
        }, 1600);
      });
    });
  }

  var socialsList = document.getElementById("socials");
  if (socialsList && CONTACTS.socials) {
    CONTACTS.socials.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = item.label + " ↗";
      li.appendChild(a);
      socialsList.appendChild(li);
    });
  }

  /* ---------- Бегущая строка ---------- */

  // Анимация сдвигает трек на половину его ширины, поэтому половина ленты
  // обязана быть шире экрана — иначе между повторами виден провал.
  // Клонируем строки, пока это условие не выполнится (число копий чётное,
  // чтобы обе половины трека совпадали и шов был незаметен).
  var tickerTrack = document.querySelector(".ticker-track");
  if (tickerTrack) {
    var firstRun = tickerTrack.children[0];
    var needed = function () {
      return tickerTrack.scrollWidth / 2 < window.innerWidth + 200;
    };
    var guard = 0;
    while (needed() && guard++ < 20) {
      tickerTrack.appendChild(firstRun.cloneNode(true));
      tickerTrack.appendChild(firstRun.cloneNode(true));
    }
  }

  /* ---------- Год в подвале ---------- */

  var year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* ---------- Фон приветствия: GhostFibers (WebGL-ленты) ---------- */

  var heroFibers = document.querySelector(".hero-fibers");
  if (heroFibers && typeof window.GhostFibers === "function") {
    try {
      window.GhostFibers(heroFibers, {
        glowColor: "#8411d7",
        lineColor: "#f0f0f0",
        secondaryColor: "#7a17b7",
        layers: 3,
        twist: 0.45,
        threads: 44,
        fiberStyle: "dots",
        depthOfField: 0.75,
        hoverEffect: "focus",
        intro: true,
        mouseInteraction: true,
        waves: 0.9,
        volume: 0.65,
        spread: 1.4,
        scale: 0.7,
        rotation: 17,
        perspective: 0.64,
        density: 1.3,
        thickness: 1.2,
        foldGlow: 1.05,
        speed: 0.2,
        flow: 0.05,
        rollSpeed: -0.01,
        focusDepth: 0.05,
        particles: 0.85,
        glow: 0.5,
        brightness: 0.8,
        vignette: 0.45,
        grain: 0.13,
        mouseStrength: 1.05
      });
    } catch (e) {
      /* без анимации страница остаётся с градиентной подложкой */
    }
  }

  /* ---------- Фон зоны проектов: LightRays (WebGL-лучи) ---------- */

  var projectsRays = document.querySelector(".projects-rays");
  if (projectsRays && typeof window.LightRays === "function") {
    try {
      window.LightRays(projectsRays, {
        raysOrigin: "top-center",
        raysColor: "#a855f7",
        raysSpeed: 1,
        lightSpread: 0.5,
        rayLength: 2,
        glow: 0.6,
        haze: 0.25,
        followMouse: true,
        mouseInfluence: 0,
        raySharpness: 0.2,
        atmosphere: 0.95,
        intensity: 1.2,
        saturation: 0.75,
        cursorShadow: false,
        clickPulse: false
      });
    } catch (e) {
      /* без лучей секция остаётся с обычным фоном */
    }
  }

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

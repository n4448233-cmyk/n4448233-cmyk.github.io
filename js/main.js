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

  /* ---------- Утилиты ---------- */

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/"/g, "&quot;");
  }

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
     КАРТОЧКИ ПРОЕКТОВ
     ============================================================ */

  // Обложка: галерея скриншотов, если они есть; иначе заглушка с номером
  function buildCover(project, number) {
    var images = project.images || [];

    if (!images.length) {
      return (
        '<div class="project-cover" aria-hidden="true">' +
        '<span class="cover-tag">Проект</span>' +
        '<span class="cover-num">' + number + "</span>" +
        "</div>"
      );
    }

    var slides = images
      .map(function (src, i) {
        return (
          '<button class="cover-slide" type="button" data-slide-index="' + i + '"' +
          ' aria-label="Открыть скриншот ' + (i + 1) + ' в большом просмотре">' +
          '<img src="' + escapeAttr(src) + '" alt="' +
          escapeAttr(project.title + " — скриншот " + (i + 1)) + '" loading="lazy">' +
          "</button>"
        );
      })
      .join("");

    var dots = images
      .map(function (_, i) {
        return (
          '<button class="gallery-dot' + (i === 0 ? " is-active" : "") +
          '" type="button" data-goto="' + i + '" aria-label="Скриншот ' + (i + 1) + '"></button>'
        );
      })
      .join("");

    var multi = images.length > 1;
    var controls = multi
      ? arrowButton("prev", "Предыдущий скриншот") +
        arrowButton("next", "Следующий скриншот") +
        '<div class="gallery-dots" aria-hidden="false">' + dots + "</div>"
      : "";

    return (
      '<div class="project-cover">' +
      '<div class="cover-track">' + slides + "</div>" +
      controls +
      "</div>"
    );
  }

  // Листание внутри обложки: стрелки, точки, свайп (scroll-snap)
  function wireCoverGallery(card, project) {
    var track = card.querySelector(".cover-track");
    if (!track) return;

    var slides = track.querySelectorAll(".cover-slide").length;
    var dots = Array.prototype.slice.call(card.querySelectorAll(".gallery-dot"));
    var prev = card.querySelector(".g-arrow.prev");
    var next = card.querySelector(".g-arrow.next");

    function currentIndex() {
      return Math.round(track.scrollLeft / track.clientWidth);
    }

    function update() {
      var i = currentIndex();
      dots.forEach(function (dot, j) {
        dot.classList.toggle("is-active", j === i);
      });
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= slides - 1;
    }

    function goTo(i) {
      track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    }

    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    if (prev) prev.addEventListener("click", function () { goTo(currentIndex() - 1); });
    if (next) next.addEventListener("click", function () { goTo(currentIndex() + 1); });
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () { goTo(Number(dot.dataset.goto)); });
    });
    update();

    // Клик по скриншоту — открыть лайтбокс.
    // Если человек свайпнул и «отпустил» на слайде — не считаем это кликом.
    var downX = null;
    track.addEventListener("pointerdown", function (e) {
      downX = e.clientX;
    });
    track.addEventListener("click", function (e) {
      var slide = e.target.closest(".cover-slide");
      if (!slide) return;
      if (downX !== null && Math.abs(e.clientX - downX) > 8) {
        downX = null;
        return;
      }
      downX = null;
      lightbox.open(project, Number(slide.dataset.slideIndex));
    });
  }

  function renderProject(project, index) {
    var card = document.createElement("article");
    card.className = "project-card reveal" + (project.featured ? " featured" : "");

    var number = String(index + 1).padStart(2, "0");
    var tags = (project.tags || [])
      .map(function (tag) {
        return "<li>" + escapeHtml(tag) + "</li>";
      })
      .join("");

    var links = "";
    if (project.demo) {
      links +=
        '<a href="' + escapeAttr(project.demo) + '" target="_blank" rel="noopener">Демо &#8599;</a>';
    }
    if (project.source) {
      links +=
        '<a href="' + escapeAttr(project.source) + '" target="_blank" rel="noopener">Код &#8599;</a>';
    }

    card.innerHTML =
      buildCover(project, number) +
      '<div class="project-body">' +
      (project.featured ? '<span class="card-badge mono">Свежая работа</span>' : "") +
      '<h3 class="project-title">' + escapeHtml(project.title) + "</h3>" +
      '<p class="project-desc">' + escapeHtml(project.description) + "</p>" +
      '<ul class="project-tags">' + tags + "</ul>" +
      (links ? '<div class="project-links">' + links + "</div>" : "") +
      "</div>";

    return card;
  }

  /* ---------- Сборка списка проектов ---------- */

  var grid = document.getElementById("projects-grid");

  if (grid && typeof PROJECTS !== "undefined") {
    PROJECTS.forEach(function (project, index) {
      var card = renderProject(project, index);
      grid.appendChild(card);
      wireCoverGallery(card, project);
    });
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

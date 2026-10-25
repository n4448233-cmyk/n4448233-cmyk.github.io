/* ============================================================
   «Плакатня» — движок генератора
   Каждый плакат — строка SVG, собранная из фигур по сиду.
   Один сид = один и тот же плакат, поэтому пресеты галереи
   и скачанные файлы всегда совпадают с превью.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- утилиты ---------- */

  function esc(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // mulberry32: быстрый сеяный генератор — фигуры не «мигают» между рендерами
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length) % arr.length];
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // Перенос заголовка по словам под заданную ширину строки
  function wrapLines(text, maxChars) {
    var words = String(text).trim().toUpperCase().split(/\s+/).filter(Boolean);
    var lines = [];
    var line = "";
    words.forEach(function (w) {
      if (!line) {
        line = w;
      } else if ((line + " " + w).length <= maxChars) {
        line += " " + w;
      } else {
        lines.push(line);
        line = w;
      }
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function isDark(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255;
    var g = (n >> 8) & 255;
    var b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  }

  var DISPLAY_FONT = "'Arial Black','Arial Bold',sans-serif";
  var MONO_FONT = "'Courier New',monospace";

  /* ---------- стили и палитры ---------- */

  var STYLES = {
    bauhaus: { label: "Баухаус", hint: "круги, полосы, три цвета" },
    swiss: { label: "Свисс", hint: "сетка и много воздуха" },
    brutal: { label: "Брутализм", hint: "кислота и грубые рамки" },
    neon: { label: "Неон", hint: "свечение в темноте" },
  };

  // Мини-метки для карточек стилей: только fill-фигуры и простые штрихи,
  // без фильтров — чтобы не тормозили отрисовку страницы.
  var STYLE_MARKS = {
    bauhaus:
      '<svg viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="7" fill="#241F1B"/>' +
      '<circle cx="13" cy="21" r="8" fill="#E23B2E"/>' +
      '<path d="M3 31a13 13 0 0 1 13-13v13z" fill="#2450B4"/>' +
      '<rect x="20" y="6" width="8" height="8" transform="rotate(12 24 10)" fill="#F0B429"/></svg>',
    swiss:
      '<svg viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="7" fill="#241F1B"/>' +
      '<rect x="5" y="5" width="7" height="7" fill="#E23B2E"/>' +
      '<line x1="5" y1="20" x2="29" y2="20" stroke="#F0EBE1" stroke-width="3"/>' +
      '<line x1="5" y1="27" x2="21" y2="27" stroke="#8C877A" stroke-width="3"/></svg>',
    brutal:
      '<svg viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="7" fill="#241F1B"/>' +
      '<rect x="5" y="5" width="24" height="24" fill="none" stroke="#F0EBE1" stroke-width="3"/>' +
      '<line x1="9" y1="25" x2="25" y2="9" stroke="#DDF532" stroke-width="4"/>' +
      '<line x1="17" y1="25" x2="25" y2="17" stroke="#FF3DA6" stroke-width="4"/></svg>',
    neon:
      '<svg viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="7" fill="#0B0E1C"/>' +
      '<circle cx="17" cy="17" r="8" fill="none" stroke="#FF3DA6" stroke-width="2.5"/>' +
      '<circle cx="17" cy="17" r="12.5" fill="none" stroke="#3AF0C8" stroke-width="1.2" opacity="0.6"/>' +
      '<circle cx="17" cy="4.5" r="2" fill="#3AF0C8"/></svg>',
  };

  var PALETTES = {
    bauhaus: [
      { name: "Музей", bg: "#F2ECDD", ink: "#151410", a: ["#E23B2E", "#2450B4", "#F0B429"] },
      { name: "Негатив", bg: "#151410", ink: "#F2ECDD", a: ["#E23B2E", "#F0B429", "#4CB944"] },
      { name: "Алый", bg: "#E23B2E", ink: "#151410", a: ["#F2ECDD", "#F0B429", "#2450B4"] },
    ],
    swiss: [
      { name: "Лист", bg: "#F7F6F1", ink: "#111110", a: ["#E23B2E", "#111110", "#8C877A"] },
      { name: "Ночь", bg: "#101013", ink: "#F7F6F1", a: ["#3AF0C8", "#F7F6F1", "#5A564C"] },
      { name: "Ультрамарин", bg: "#2450B4", ink: "#F7F6F1", a: ["#F0B429", "#F7F6F1", "#0E2A6B"] },
    ],
    brutal: [
      { name: "Кислота", bg: "#DDF532", ink: "#0C0C0C", a: ["#FF3DA6", "#0C0C0C", "#FFFFFF"] },
      { name: "Барби", bg: "#FF5EA8", ink: "#0C0C0C", a: ["#00E0B8", "#FFFFFF", "#0C0C0C"] },
      { name: "Газета", bg: "#F2ECDD", ink: "#0C0C0C", a: ["#2450B4", "#E23B2E", "#0C0C0C"] },
    ],
    neon: [
      { name: "Магента", bg: "#0B0E1C", ink: "#EAF6FF", a: ["#FF3DA6", "#3AF0C8"] },
      { name: "Плазма", bg: "#0C0A18", ink: "#EAF6FF", a: ["#8B6BFF", "#3AF0C8"] },
      { name: "Тлеющий", bg: "#120A0F", ink: "#FFE9F2", a: ["#FF6A3D", "#FFC53D"] },
    ],
  };

  /* ---------- пулы для рандомайзера ---------- */

  var R_TITLES = [
    "БЕЛЫЙ ШУМ", "СИНТЕЗ ЗВУКА", "НОЧЬ ГЕОМЕТРИИ", "ФОСФОР",
    "ТРИ ДНЯ ПОЭЗИИ", "ИМПУЛЬС", "СТУДИЯ 7", "ГРАВИТАЦИЯ",
    "ЮГ", "ХРУСТАЛЬ", "ПОЛЁТ НОРМ", "ЗЕРНО",
  ];
  var R_SUBS = [
    "вечер новой музыки", "лекция о форме", "открытая лаборатория",
    "кино без слов", "танцы до утра", "разговор о городе",
    "фестиваль света", "показ и обсуждение",
  ];
  var R_METAS = [
    "сб · 22:00 · вход 300 ₽", "вс · 19:00 · вход свободный",
    "пт · 23:00 · 18+", "ср · 20:00 · по билетам",
    "ежедневно · 12:00–22:00",
  ];

  /* ============================================================
     РЕНДЕР СТИЛЕЙ
     viewBox: 600 × 800
     ============================================================ */

  function svgOpen(attrs) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"' + attrs + ">";
  }

  /* --- Баухаус --- */

  function drawBauhaus(p, rng, cfg) {
    var c1 = rng() < 0.5 ? p.a[0] : p.a[1];
    var c2 = c1 === p.a[0] ? p.a[1] : p.a[0];

    var circle = {
      cx: Math.round(150 + rng() * 90),
      cy: Math.round(160 + rng() * 90),
      r: Math.round(105 + rng() * 65),
    };

    var bars = "";
    var y = 84;
    for (var i = 0; i < 5; i++) {
      var h = Math.round(26 + rng() * 40);
      bars += '<rect x="468" y="' + y + '" width="22" height="' + h + '" fill="' + (i % 2 ? c2 : p.a[2]) + '"/>';
      y += h + 12;
    }

    var dots = "";
    for (var gx = 0; gx < 6; gx++) {
      for (var gy = 0; gy < 4; gy++) {
        dots += '<circle cx="' + (352 + gx * 24) + '" cy="' + (520 + gy * 24) + '" r="4" fill="' + p.ink + '"/>';
      }
    }

    var lines = wrapLines(cfg.title, 11);
    var fs = lines.length > 2 ? 50 : 58;
    var title = "";
    lines.forEach(function (l, i) {
      title += '<text x="42" y="' + (216 + i * (fs + 8)) + '" font-family="' + DISPLAY_FONT + '" font-weight="900" font-size="' + fs + '" fill="' + p.ink + '">' + esc(l) + "</text>";
    });

    return (
      svgOpen("") +
      '<rect width="600" height="800" fill="' + p.bg + '"/>' +
      '<circle cx="' + circle.cx + '" cy="' + circle.cy + '" r="' + circle.r + '" fill="' + c1 + '"/>' +
      '<path d="M0,800 L0,' + (800 - 175) + ' A175,175 0 0 0 175,800 Z" fill="' + c2 + '"/>' +
      bars +
      '<rect x="' + (60 + Math.round(rng() * 120)) + '" y="120" width="34" height="34" fill="' + p.a[2] + '" transform="rotate(45 77 137)"/>' +
      dots +
      '<text x="42" y="620" font-family="' + MONO_FONT + '" font-weight="700" font-size="17" fill="' + p.ink + '">' + esc(cfg.subtitle) + "</text>" +
      title +
      '<rect x="42" y="726" width="516" height="3" fill="' + p.ink + '"/>' +
      '<text x="42" y="762" font-family="' + MONO_FONT + '" font-weight="700" font-size="15" fill="' + p.ink + '">' + esc(cfg.meta) + "</text>" +
      "</svg>"
    );
  }

  /* --- Свисс --- */

  function drawSwiss(p, rng, cfg) {
    var lines = wrapLines(cfg.title, 10);
    var fs = lines.length > 2 ? 62 : 72;
    var title = "";
    lines.forEach(function (l, i) {
      title += '<text x="38" y="' + (256 + i * (fs + 2)) + '" font-family="Helvetica,Arial,sans-serif" font-weight="900" font-size="' + fs + '" fill="' + p.ink + '">' + esc(l) + "</text>";
    });

    var acc = p.a[0];
    var body = "Открытый набор форм: линии, клетка и один точный акцент. Ничего лишнего.";

    return (
      svgOpen("") +
      '<rect width="600" height="800" fill="' + p.bg + '"/>' +
      '<line x1="38" y1="0" x2="38" y2="800" stroke="' + p.ink + '" stroke-width="1" opacity="0.3"/>' +
      '<line x1="562" y1="0" x2="562" y2="800" stroke="' + p.ink + '" stroke-width="1" opacity="0.3"/>' +
      '<rect x="38" y="46" width="20" height="20" fill="' + acc + '"/>' +
      '<text x="562" y="62" text-anchor="end" font-family="' + MONO_FONT + '" font-size="14" letter-spacing="2" fill="' + p.ink + '">PLAKATNYA · №' + (1 + Math.floor(rng() * 9)) + "</text>" +
      '<line x1="360" y1="120" x2="560" y2="330" stroke="' + acc + '" stroke-width="4"/>' +
      '<text x="38" y="126" font-family="' + MONO_FONT + '" font-size="15" letter-spacing="3" fill="' + p.ink + '">' + esc(cfg.subtitle.toUpperCase()) + "</text>" +
      title +
      '<rect x="38" y="' + (256 + lines.length * (fs + 2) + 14) + '" width="330" height="2" fill="' + p.ink + '"/>' +
      '<text x="38" y="' + (256 + lines.length * (fs + 2) + 60) + '" font-family="Helvetica,Arial,sans-serif" font-size="17" fill="' + p.ink + '" opacity="0.75">' +
      '<tspan x="38" dy="0">' + esc(body.slice(0, 30)) + "</tspan>" +
      '<tspan x="38" dy="24">' + esc(body.slice(30, 62)) + "</tspan>" +
      "</text>" +
      '<line x1="38" y1="700" x2="562" y2="700" stroke="' + p.ink + '" stroke-width="2"/>' +
      '<text x="38" y="734" font-family="' + MONO_FONT + '" font-size="15" fill="' + p.ink + '">' + esc(cfg.meta) + "</text>" +
      '<text x="562" y="734" text-anchor="end" font-family="' + MONO_FONT + '" font-size="15" fill="' + acc + '">→ ' + esc(cfg.styleLabel.toUpperCase()) + "</text>" +
      "</svg>"
    );
  }

  /* --- Брутализм --- */

  function drawBrutal(p, rng, cfg) {
    var lines = wrapLines(cfg.title, 12);
    var fs = lines.length > 2 ? 54 : 62;
    var title = "";
    lines.forEach(function (l, i) {
      var fill = i === lines.length - 1 ? p.a[0] : p.ink;
      title += '<text x="38" y="' + (400 + i * (fs + 6)) + '" font-family="' + DISPLAY_FONT + '" font-weight="900" font-size="' + fs + '" fill="' + fill + '" stroke="' + p.ink + '" stroke-width="1.5">' + esc(l) + "</text>";
    });

    var hatch = "";
    for (var i = 0; i < 9; i++) {
      hatch += '<line x1="' + (330 + i * 26) + '" y1="80" x2="' + (304 + i * 26) + '" y2="212" stroke="' + p.a[0] + '" stroke-width="9"/>';
    }

    var barcode = "";
    var bx = 366;
    for (var j = 0; j < 16; j++) {
      var bw = 2 + Math.floor(rng() * 6);
      barcode += '<rect x="' + bx + '" y="648" width="' + bw + '" height="52" fill="' + p.ink + '"/>';
      bx += bw + 4;
    }

    var chips = [
      { x: 40, y: 96, t: "LIVE", fill: p.a[0] },
      { x: 132, y: 96, t: "22:00", fill: p.a[1] },
      { x: 232, y: 96, t: "№ " + (1 + Math.floor(rng() * 9)), fill: p.a[2] },
    ];
    var chipSvg = chips.map(function (c) {
      return '<g transform="rotate(-4 ' + (c.x + 30) + " " + (c.y + 16) + ')">' +
        '<rect x="' + c.x + '" y="' + c.y + '" width="72" height="32" fill="' + c.fill + '" stroke="' + p.ink + '" stroke-width="2.5"/>' +
        '<text x="' + (c.x + 36) + '" y="' + (c.y + 21) + '" text-anchor="middle" font-family="' + MONO_FONT + '" font-weight="700" font-size="15" fill="' + p.ink + '">' + esc(c.t) + "</text></g>";
    }).join("");

    return (
      svgOpen("") +
      '<rect width="600" height="800" fill="' + p.bg + '"/>' +
      '<rect x="30" y="30" width="556" height="748" fill="' + p.ink + '"/>' +
      '<rect x="16" y="16" width="556" height="748" fill="' + p.bg + '" stroke="' + p.ink + '" stroke-width="6"/>' +
      hatch +
      chipSvg +
      '<text x="38" y="360" font-family="' + MONO_FONT + '" font-weight="700" font-size="17" fill="' + p.ink + '">' + esc(cfg.subtitle) + "</text>" +
      title +
      barcode +
      '<text x="38" y="686" font-family="' + MONO_FONT + '" font-weight="700" font-size="15" fill="' + p.ink + '">' + esc(cfg.meta) + "</text>" +
      "</svg>"
    );
  }

  /* --- Неон --- */

  function drawNeon(p, rng, cfg) {
    var g1 = p.a[0];
    var g2 = p.a[1];

    var stars = "";
    for (var i = 0; i < 30; i++) {
      stars += '<circle cx="' + Math.round(rng() * 600) + '" cy="' + Math.round(rng() * 560) + '" r="' + (0.8 + rng() * 1.3).toFixed(1) + '" fill="' + p.ink + '" opacity="' + (0.25 + rng() * 0.5).toFixed(2) + '"/>';
    }

    var lines = wrapLines(cfg.title, 11);
    var fs = lines.length > 2 ? 52 : 60;
    // Гало — дешёвое: два fill-дубля со смещением («хроматический сдвиг»).
    // Штрихи-обводки по крупным глифам растеризуются секундами и роняют
    // захват кадра, поэтому никаких stroke и feGaussianBlur.
    var halo = "";
    var title = "";
    lines.forEach(function (l, i) {
      var y = 420 + i * (fs + 6);
      var fill = i % 2 ? g2 : g1;
      halo +=
        '<text x="45" y="' + (y + 3) + '" font-family="' + DISPLAY_FONT + '" font-weight="900" font-size="' + fs + '" fill="' + g1 + '" opacity="0.33">' + esc(l) + "</text>" +
        '<text x="39" y="' + (y - 3) + '" font-family="' + DISPLAY_FONT + '" font-weight="900" font-size="' + fs + '" fill="' + g2 + '" opacity="0.33">' + esc(l) + "</text>";
      title += '<text x="42" y="' + y + '" font-family="' + DISPLAY_FONT + '" font-weight="900" font-size="' + fs + '" fill="' + fill + '">' + esc(l) + "</text>";
    });

    return (
      svgOpen("") +
      '<rect width="600" height="800" fill="' + p.bg + '"/>' +
      stars +
      '<circle cx="452" cy="196" r="118" fill="none" stroke="' + g1 + '" stroke-width="2" opacity="0.85"/>' +
      '<circle cx="452" cy="196" r="160" fill="none" stroke="' + g2 + '" stroke-width="1.2" opacity="0.35"/>' +
      '<circle cx="452" cy="76" r="6" fill="' + g2 + '"/>' +
      '<text x="42" y="326" font-family="' + MONO_FONT + '" font-size="15" letter-spacing="4" fill="' + p.ink + '" opacity="0.75">' + esc(cfg.subtitle.toUpperCase()) + "</text>" +
      halo +
      title +
      '<rect x="0" y="618" width="600" height="2.5" fill="' + g1 + '" opacity="0.9"/>' +
      '<rect x="0" y="611" width="600" height="14" fill="' + g2 + '" opacity="0.16"/>' +
      '<text x="42" y="668" font-family="' + MONO_FONT + '" font-size="15" fill="' + g2 + '">' + esc(cfg.meta) + "</text>" +
      '<text x="558" y="668" text-anchor="end" font-family="' + MONO_FONT + '" font-size="15" fill="' + p.ink + '" opacity="0.6">' + esc(cfg.styleLabel.toUpperCase()) + "</text>" +
      "</svg>"
    );
  }

  var DRAWERS = { bauhaus: drawBauhaus, swiss: drawSwiss, brutal: drawBrutal, neon: drawNeon };

  /* ---------- общие слои: сетка и зерно ---------- */

  function addLayers(inner, p, cfg) {
    var out = inner;
    if (cfg.grid) {
      // вся сетка — один path: одна операция отрисовки вместо 27 линий
      var d = "";
      for (var x = 50; x < 600; x += 50) d += "M" + x + " 0V800";
      for (var y = 50; y < 800; y += 50) d += "M0 " + y + "H600";
      out = out.replace("</svg>",
        '<path d="' + d + '" stroke="' + p.ink + '" stroke-width="1" opacity="0.10" fill="none"/></svg>');
    }
    if (cfg.grain) {
      var grainColor = isDark(p.bg) ? "#FFFFFF" : "#000000";
      out = out.replace("</svg>",
        '<filter id="plk-grain-' + cfg.uid + '"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch"/></filter>' +
        '<rect width="600" height="800" filter="url(#plk-grain-' + cfg.uid + ')" opacity="0.06" fill="' + grainColor + '"/>' +
        "</svg>");
    }
    return out;
  }

  /* ---------- сборка постера ---------- */

  var renderCounter = 0;

  function renderPoster(cfg) {
    var base = PALETTES[cfg.style][cfg.pal];
    var p = cfg.invert
      ? { bg: base.ink, ink: base.bg, a: base.a }
      : { bg: base.bg, ink: base.ink, a: base.a };

    var full = {
      style: cfg.style,
      pal: cfg.pal,
      title: cfg.title || "БЕЗ НАЗВАНИЯ",
      subtitle: cfg.subtitle || "",
      meta: cfg.meta || "",
      seed: cfg.seed,
      styleLabel: STYLES[cfg.style].label,
      grain: cfg.grain,
      grid: cfg.grid,
      invert: cfg.invert,
      uid: "r" + (++renderCounter),
    };

    var inner = DRAWERS[cfg.style](p, seededRandom(full.seed), full);
    return addLayers(inner, p, full);
  }

  /* ============================================================
     СОСТОЯНИЕ И UI
     ============================================================ */

  var DEFAULT = {
    style: "bauhaus",
    pal: 0,
    title: "БЕЛЫЙ ШУМ",
    subtitle: "вечер новой музыки",
    meta: "сб · 22:00 · вход 300 ₽",
    seed: 12,
    grain: true,
    grid: false,
    invert: false,
  };

  var cfg = JSON.parse(JSON.stringify(DEFAULT));

  var posterEl = document.getElementById("poster");
  var stageName = document.getElementById("stage-name");

  function paint() {
    posterEl.innerHTML = renderPoster(cfg);
    stageName.textContent =
      STYLES[cfg.style].label + " · " + PALETTES[cfg.style][cfg.pal].name;
    syncInputs();
  }

  function syncInputs() {
    document.getElementById("f-title").value = cfg.title;
    document.getElementById("f-sub").value = cfg.subtitle;
    document.getElementById("f-meta").value = cfg.meta;
  }

  /* ---------- тост ---------- */

  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  /* ---------- карточки стилей ---------- */

  var styleCards = document.getElementById("style-cards");

  Object.keys(STYLES).forEach(function (key) {
    var s = STYLES[key];
    var card = document.createElement("button");
    card.type = "button";
    card.className = "style-card" + (cfg.style === key ? " is-on" : "");
    card.dataset.style = key;
    card.innerHTML =
      '<span class="style-mark" aria-hidden="true">' + STYLE_MARKS[key] + "</span>" +
      '<span><span class="style-name">' + s.label + "</span>" +
      '<span class="style-hint">' + s.hint + "</span></span>";

    card.addEventListener("click", function () {
      cfg.style = key;
      if (cfg.pal >= PALETTES[key].length) cfg.pal = 0;
      buildSwatches();
      markStyle();
      paint();
    });

    styleCards.appendChild(card);
  });

  function markStyle() {
    styleCards.querySelectorAll(".style-card").forEach(function (c) {
      c.classList.toggle("is-on", c.dataset.style === cfg.style);
    });
  }

  /* ---------- свотчи палитр ---------- */

  var swatches = document.getElementById("swatches");

  function buildSwatches() {
    swatches.innerHTML = "";
    PALETTES[cfg.style].forEach(function (pal, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (cfg.pal === idx ? " is-on" : "");
      b.innerHTML =
        '<span class="dots" aria-hidden="true">' +
        '<i style="background:' + pal.bg + '"></i>' +
        pal.a.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join("") +
        "</span>" +
        '<span class="swatch-name">' + pal.name + "</span>" +
        '<span class="swatch-sign" aria-hidden="true">✓</span>';

      b.addEventListener("click", function () {
        cfg.pal = idx;
        buildSwatches();
        paint();
      });

      swatches.appendChild(b);
    });
  }

  /* ---------- текстовые поля ---------- */

  function bindField(id, key) {
    var input = document.getElementById(id);
    input.addEventListener("input", function () {
      cfg[key] = input.value;
      posterEl.innerHTML = renderPoster(cfg);
    });
  }

  bindField("f-title", "title");
  bindField("f-sub", "subtitle");
  bindField("f-meta", "meta");

  /* ---------- тумблеры ---------- */

  document.querySelectorAll(".tgl").forEach(function (t) {
    t.addEventListener("click", function () {
      var key = t.dataset.t;
      cfg[key] = !cfg[key];
      t.setAttribute("aria-pressed", String(cfg[key]));
      paint();
    });
  });

  /* ---------- рандомайзер ---------- */

  function randomize() {
    var keys = Object.keys(STYLES);
    cfg.style = pick(Math.random, keys);
    cfg.pal = Math.floor(Math.random() * PALETTES[cfg.style].length);
    cfg.title = pick(Math.random, R_TITLES);
    cfg.subtitle = pick(Math.random, R_SUBS);
    cfg.meta = pick(Math.random, R_METAS);
    cfg.seed = Math.floor(Math.random() * 9999);
    cfg.invert = Math.random() < 0.15;
    buildSwatches();
    markStyle();
    paint();
  }

  document.getElementById("roll").addEventListener("click", randomize);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "r" && e.key !== "R" && e.key !== "к" && e.key !== "К") return;
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    randomize();
  });

  /* ---------- скачивание ---------- */

  function fileName(ext) {
    return "plakatnya-" + cfg.style + "-" + cfg.seed + "." + ext;
  }

  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  document.getElementById("dl-svg").addEventListener("click", function () {
    var svg = renderPoster(cfg).replace("<svg ", '<svg width="600" height="800" ');
    saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), fileName("svg"));
    showToast("SVG сохранён: " + fileName("svg"));
  });

  document.getElementById("dl-png").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    var svg = renderPoster(cfg).replace("<svg ", '<svg width="1200" height="1600" ');
    var url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    var img = new Image();

    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      canvas.getContext("2d").drawImage(img, 0, 0, 1200, 1600);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) {
        if (blob) {
          saveBlob(blob, fileName("png"));
          showToast("PNG сохранён: " + fileName("png"));
        } else {
          showToast("Не получилось собрать PNG — попробуй ещё раз");
        }
        btn.disabled = false;
      }, "image/png");
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      showToast("Не получилось собрать PNG — попробуй ещё раз");
      btn.disabled = false;
    };

    img.src = url;
  });

  /* ---------- наклон постера за курсором ---------- */

  var tiltBox = document.getElementById("poster-tilt");
  var frame = document.getElementById("poster-frame");

  tiltBox.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var r = tiltBox.getBoundingClientRect();
    var dx = (e.clientX - r.left) / r.width - 0.5;
    var dy = (e.clientY - r.top) / r.height - 0.5;
    frame.style.transform =
      "rotateY(" + (dx * 7).toFixed(2) + "deg) rotateX(" + (-dy * 7).toFixed(2) + "deg)";
  });

  tiltBox.addEventListener("pointerleave", function () {
    frame.style.transform = "";
  });

  /* ============================================================
     ГАЛЕРЕЯ ПРЕСЕТОВ
     ============================================================ */

  var PRESETS = [
    { style: "bauhaus", pal: 0, title: "БЕЛЫЙ ШУМ", subtitle: "вечер новой музыки", meta: "сб · 22:00 · вход 300 ₽", seed: 12, grain: true, grid: false, invert: false },
    { style: "swiss", pal: 0, title: "ИМПУЛЬС", subtitle: "лекция о форме", meta: "вс · 19:00 · вход свободный", seed: 7, grain: false, grid: true, invert: false },
    { style: "brutal", pal: 0, title: "НОЧЬ ГЕОМЕТРИИ", subtitle: "танцы до утра", meta: "пт · 23:00 · 18+", seed: 3, grain: true, grid: false, invert: false },
    { style: "neon", pal: 0, title: "ФОСФОР", subtitle: "фестиваль света", meta: "ежедневно · 12:00–22:00", seed: 21, grain: true, grid: false, invert: false },
    { style: "bauhaus", pal: 1, title: "ГРАВИТАЦИЯ", subtitle: "кино без слов", meta: "ср · 20:00 · по билетам", seed: 5, grain: true, grid: false, invert: true },
    { style: "neon", pal: 2, title: "ЮГ", subtitle: "разговор о городе", meta: "сб · 18:00 · вход свободный", seed: 14, grain: false, grid: true, invert: false },
  ];

  var gGrid = document.getElementById("g-grid");

  PRESETS.forEach(function (preset) {
    var item = document.createElement("button");
    item.type = "button";
    item.className = "g-item";
    item.setAttribute("aria-label", "Открыть в редакторе: " + preset.title);
    item.innerHTML =
      '<div class="g-art">' + renderPoster(preset) + "</div>" +
      '<div class="g-cap mono">' +
      '<span class="gc-name">' + esc(preset.title.toLowerCase()) + "</span>" +
      '<span class="gc-style">' + STYLES[preset.style].label + "</span>" +
      "</div>";

    item.addEventListener("click", function () {
      cfg = JSON.parse(JSON.stringify(preset));
      buildSwatches();
      markStyle();
      paint();
      document.getElementById("toggles").querySelectorAll(".tgl").forEach(function (t) {
        t.setAttribute("aria-pressed", String(!!cfg[t.dataset.t]));
      });
      document.getElementById("machine").scrollIntoView({ behavior: "smooth" });
      showToast("Открыл заготовку — крутить не обязательно, но можно");
    });

    gGrid.appendChild(item);
  });

  /* ---------- мелочи ---------- */

  document.getElementById("year").textContent = new Date().getFullYear();

  // Световое пятно следует за курсором (слой .spot в CSS)
  var rootStyle = document.documentElement.style;
  document.addEventListener("pointermove", function (e) {
    rootStyle.setProperty("--mx", e.clientX + "px");
    rootStyle.setProperty("--my", e.clientY + "px");
  }, { passive: true });

  /* ---------- старт ---------- */

  // Плакат можно «заказать» прямо из адреса: #p=стиль,палитра,сид[,i]
  // Например: plakat/index.html#p=neon,0,42,i — неон, первая палитра,
  // сид 42, инверсия. Удобно, чтобы показать или сохранить конкретный плакат.
  (function applyHash() {
    var m = location.hash.match(/^#p=(\w+)(?:,(\d+))?(?:,(\d+))?(,i)?$/);
    if (!m || !STYLES[m[1]]) return;
    cfg.style = m[1];
    if (m[2] !== undefined) cfg.pal = clamp(+m[2], 0, PALETTES[cfg.style].length - 1);
    if (m[3] !== undefined) cfg.seed = +m[3];
    if (m[4]) cfg.invert = true;
  })();

  buildSwatches();
  paint();
})();

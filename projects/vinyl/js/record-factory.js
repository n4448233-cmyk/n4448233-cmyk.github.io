/* ============================================================
   RecordFactory — рисованные этикетки, конверты и ВИНИЛ
   для 3D-просмотрщика. У каждого релиза свой диск: цвет,
   мрамор/прозрачность и этикетка-реплика по референсу.

   Реплики по нашим фото-референсам:
   · The Beatles — сингл «Мелодия» (кремовая этикетка, арки)
   · The Trammps — Disco Inferno (Atlantic 1976, красно-серый сплит)
   · The Drifters — Honey Love (Atlantic 78, оранжевая)
   Полная авторская этикетка: Sgt. Pepper (Parlophone, 1967).
   Плюс каждому релизу подобран цвет/мрамор винила — в духе
   цветных прессингов (Korn-стиль — красный с чёрным дымом
   у «Get Loose Crew»).
   ============================================================ */

(function () {
  "use strict";

  var S = 1024;
  var cache = {};
  var records = {};

  /* ---------- утилиты ---------- */

  function rng(s) {
    return function () {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function cvs() {
    var c = document.createElement("canvas");
    c.width = c.height = S;
    return c;
  }

  function fitText(x, t, font, cx, y, W) {
    x.font = font;
    var w = x.measureText(t).width;
    x.save(); x.translate(cx, y); x.scale(W / w, 1); x.fillText(t, 0, 0); x.restore();
  }

  function arcText(x, text, mid, R, font, color, dir) {
    x.save(); x.font = font; x.fillStyle = color;
    x.textAlign = "center"; x.textBaseline = "middle";
    var ch = text.split("");
    var w = ch.map(function (c) { return x.measureText(c).width + 1.2; });
    var tot = w.reduce(function (a, b) { return a + b; }, 0), cum = 0;
    ch.forEach(function (c, i) {
      var a = mid + dir * (cum + w[i] / 2 - tot / 2) / R;
      cum += w[i];
      x.save();
      x.translate(512 + R * Math.cos(a), 512 + R * Math.sin(a));
      x.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      x.fillText(c, 0, 0);
      x.restore();
    });
    x.restore();
  }

  function setLS(x, px) {
    if ("letterSpacing" in x) x.letterSpacing = px + "px";
  }

  /* ============================================================
     ВИНИЛ: цвет, мрамор, отверстие — у каждого релиза своё
     ============================================================ */

  // процедурный «дым»: фрактальный шум с domain warp — настоящие
  // завихрения (как на красном Korn), плюс тонкие wispy-пряди
  function marble(seed, color, density, wispy) {
    var c = cvs(), x = c.getContext("2d"), R = rng(seed);
    var i, j, t;

    // value-noise с перемешанной решёткой
    var perm = [];
    for (i = 0; i < 256; i++) perm[i] = i;
    for (i = 255; i > 0; i--) { j = (R() * (i + 1)) | 0; t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    var P = new Uint8Array(512);
    for (i = 0; i < 512; i++) P[i] = perm[i & 255];
    function fade(v) { return v * v * (3 - 2 * v); }
    function noise(px, py) {
      var xi = Math.floor(px), yi = Math.floor(py);
      var xf = px - xi, yf = py - yi;
      var X = xi & 255, Y = yi & 255;
      var u = fade(xf), v = fade(yf);
      var aa = P[P[X] + Y] / 255, ba = P[P[X + 1] + Y] / 255;
      var ab = P[P[X] + Y + 1] / 255, bb = P[P[X + 1] + Y + 1] / 255;
      var x1 = aa + u * (ba - aa), x2 = ab + u * (bb - ab);
      return x1 + v * (x2 - x1);
    }
    function fbm(fx, fy) {
      var v = 0, a = 0.55, f = 1;
      for (var o = 0; o < 5; o++) { v += a * noise(fx * f, fy * f); f *= 2.13; a *= 0.5; }
      return v;
    }

    // дым: два слоя шума искажают третий — получаются вихри
    var S2 = 256;
    var small = document.createElement("canvas");
    small.width = small.height = S2;
    var sx = small.getContext("2d");
    var img = sx.createImageData(S2, S2);
    var d = img.data;
    var t0 = 0.52 - density * 0.16, t1 = t0 + 0.2;
    var rgb = color.split(",").map(Number);
    var k = 0;
    for (var py = 0; py < S2; py++) {
      for (var px = 0; px < S2; px++) {
        var nx = px / S2 * 3, ny = py / S2 * 3;
        var qx = fbm(nx + 1.7, ny + 9.2), qy = fbm(nx + 8.3, ny + 2.8);
        var v = fbm(nx + 2.4 * qx, ny + 2.4 * qy);
        var a = v < t0 ? 0 : v > t1 ? 1 : (v - t0) / (t1 - t0);
        a = a * a * (3 - 2 * a);
        d[k++] = rgb[0]; d[k++] = rgb[1]; d[k++] = rgb[2];
        d[k++] = Math.round(a * 235);
      }
    }
    sx.putImageData(img, 0, 0);
    x.imageSmoothingEnabled = true;
    x.drawImage(small, 0, 0, S, S);

    // wispy-пряди: узкие изогнутые линии с мягким краем
    x.lineCap = "round"; x.lineJoin = "round";
    for (i = 0; i < (wispy ? 34 : 24); i++) {
      var cxp = R() * S, cyp = R() * S, ang = R() * 6.283;
      var segs = 18 + (R() * 26 | 0), step = 6 + R() * 14;
      x.strokeStyle = "rgba(" + color + "," + (0.1 + R() * 0.3).toFixed(2) + ")";
      x.shadowColor = "rgba(" + color + ",0.6)";
      x.shadowBlur = 7;
      x.beginPath();
      x.moveTo(cxp, cyp);
      for (var si = 0; si < segs; si++) {
        ang += (R() - 0.5) * 0.85;
        cxp += Math.cos(ang) * step;
        cyp += Math.sin(ang) * step;
        x.lineTo(cxp, cyp);
      }
      x.lineWidth = 1.5 + R() * 5;
      x.stroke();
    }
    x.shadowBlur = 0;
    c._rgb = "rgb(" + color + ")";
    return c;
  }

  var M_BLACK = "14,14,18";   // чёрный дым для цветного винила
  var M_GRAY = "120,126,138"; // серый дым для белого

  var VINYL = {
    "sgt-pepper":             { base: "#0b0b0e" },
    // Back In Black: печать на весь диск, канавки проступают сквозь краску
    "acdc-back-in-black":     { base: "#0b0b0e", labelR: 0.97, labelVinyl: 1 },
    // 7" сингл — этикетка пропорционально больше
    "melodiya-beatles":       { base: "#0b0b0e", labelR: 0.55 },
    "disco-inferno":          { base: "#0d0d10", hole: 0.095, labelR: 0.55 },
    "honey-love-78":          { base: "#171310", hole: 0.062, edge: "#0b0908", labelR: 0.5 },
    // Korn-стиль: прозрачный красный с чёрными дымами
    "get-loose-crew":         { base: "#c22a1c", marble: marble(5, M_BLACK, 0.5), glow: 0.5, hole: 0.095, edge: "#3a0d08" },
    "sinatra-thats-life":     { base: "#0b0b0e" },
    "mozart-requiem":         { base: "#0b0b0e" },
    "electronic-chamber-music": { base: "#43464e", marble: marble(9, M_BLACK, 0.35, true), glow: 0.35 },
    "pisu-strange-fruit":     { base: "#0f5f58", glow: 0.3 },
    "flight-attendant":       { base: "#1e4f9c", glow: 0.45 },
    "cloud-script":           { base: "#d9dade", marble: marble(13, M_GRAY, 0.4, true), glow: 0.12, edge: "#8e939c" },
    "telescopes-third-wave":  { base: "#3a2450", marble: marble(21, M_BLACK, 0.55), glow: 0.2, edge: "#1d1230" },
    // Korn — красный прозрачный с чёрными вихрями; лого вылезает за этикетку
    "korn":                   { base: "#b32318", marble: marble(31, "16,12,12", 0.55, true), glow: 0.5, edge: "#3a0d08", labelR: 0.33, bleed: 0.52, labelVinyl: 1 },
    "sleep-token":            { base: "#0b0b0e" },
    "ghost-skeleta":          { base: "#e8e2d4", marble: marble(37, M_GRAY, 0.3, true), glow: 0.12, edge: "#8e939c" },
    "opeth-tlwat":            { base: "#0d0d10" }
  };

  /* ============================================================
     ЭТИКЕТКИ
     ============================================================ */

  function labelBase(x, ring, bg1, bg2) {
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, bg1 || "#151515");
    g.addColorStop(1, bg2 || "#0a0a0a");
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    x.strokeStyle = ring;
    x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();
  }

  /* ---------- Sgt. Pepper: Parlophone (реплика) ---------- */

  function labelSgtPepper() {
    var c = cvs(), x = c.getContext("2d");
    var SIL = "#c9cdd2", DIM = "#9aa0a8";
    labelBase(x, "rgba(201,205,210,0.35)");

    x.textAlign = "center"; x.fillStyle = SIL;
    x.font = "bold 46px Georgia, 'Times New Roman', serif";
    x.fillText("PARLOPHONE", 512, 132);
    x.font = "15px Arial"; x.fillText("®", 665, 116);

    x.font = "19px Arial"; x.fillStyle = DIM;
    x.fillText("PCS 7027 · STEREO · 33⅓ RPM", 512, 172);

    x.fillStyle = SIL;
    fitText(x, "SGT. PEPPER'S LONELY HEARTS CLUB BAND",
      "bold 30px Georgia, 'Times New Roman', serif", 512, 232, 700);
    x.font = "26px Georgia, 'Times New Roman', serif";
    x.fillText("THE BEATLES", 512, 272);

    var s1 = ["Sgt. Pepper's Lonely Hearts Club Band",
      "With a Little Help from My Friends",
      "Lucy in the Sky with Diamonds",
      "Getting Better",
      "Fixing a Hole",
      "She's Leaving Home",
      "Being for the Benefit of Mr. Kite!"];
    var s2 = ["Within You Without You",
      "When I'm Sixty-Four",
      "Lovely Rita",
      "Good Morning Good Morning",
      "Sgt. Pepper's Lonely Hearts Club Band (Reprise)",
      "A Day in the Life"];

    x.font = "18px 'Times New Roman', serif";
    x.textAlign = "left";
    x.fillStyle = DIM;
    x.fillText("SIDE ONE", 130, 330);
    x.fillText("SIDE TWO", 560, 330);
    x.fillStyle = SIL;
    s1.forEach(function (t, i) { x.fillText(t, 130, 362 + i * 32); });
    s2.forEach(function (t, i) { x.fillText(t, 560, 362 + i * 32); });

    x.textAlign = "center";
    arcText(x, "SOLD IN THE UK SUBJECT TO RESALE PRICE CONDITIONS",
      Math.PI, 470, "13px Arial", DIM, 1);
    arcText(x, "℗ 1967 THE GRAMOPHONE CO. LTD. · MADE IN GT. BRITAIN",
      0, 470, "13px Arial", DIM, 1);
    return c;
  }

  function backSgtPepper() {
    var c = cvs(), x = c.getContext("2d");
    var R = rng(7);
    var SIL = "#c9cdd2", DIM = "#8f959d";

    var g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#101116");
    g.addColorStop(1, "#0a0b10");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 5200; i++) {
      x.fillStyle = "rgba(190,200,220," + (R() * 0.03).toFixed(3) + ")";
      x.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
    }

    x.textAlign = "center"; x.fillStyle = SIL;
    fitText(x, "SGT. PEPPER'S LONELY HEARTS CLUB BAND",
      "bold 40px Georgia, 'Times New Roman', serif", 512, 110, 760);
    x.font = "26px Georgia, 'Times New Roman', serif";
    x.fillText("THE BEATLES", 512, 152);

    var col = [
      ["Sgt. Pepper's Lonely Hearts Club Band", "Lennon–McCartney"],
      ["With a Little Help from My Friends", "Lennon–McCartney"],
      ["Lucy in the Sky with Diamonds", "Lennon–McCartney"],
      ["Getting Better", "Lennon–McCartney"],
      ["Fixing a Hole", "Lennon–McCartney"],
      ["She's Leaving Home", "Lennon–McCartney"],
      ["Being for the Benefit of Mr. Kite!", "Lennon–McCartney"],
      ["Within You Without You", "Harrison"],
      ["When I'm Sixty-Four", "Lennon–McCartney"],
      ["Lovely Rita", "Lennon–McCartney"],
      ["Good Morning Good Morning", "Lennon–McCartney"],
      ["Sgt. Pepper's Lonely Hearts Club Band (Reprise)", "Lennon–McCartney"],
      ["A Day in the Life", "Lennon–McCartney"]
    ];

    x.textAlign = "left";
    col.forEach(function (r, i) {
      var cx = i < 7 ? 92 : 540;
      var y = 232 + (i < 7 ? i : i - 7) * 58;
      x.font = "bold 23px Georgia, 'Times New Roman', serif";
      x.fillStyle = SIL;
      fitText(x, r[0], x.font, cx + 190, y, 384);
      x.font = "italic 17px Georgia, serif";
      x.fillStyle = DIM;
      x.fillText(r[1], cx, y + 26);
    });

    x.textAlign = "center";
    x.font = "17px Arial";
    x.fillStyle = DIM;
    x.fillText("Sleeve designed by Peter Blake and Jann Haworth", 512, 946);
    x.fillText("Printed by Garrod & Lofthouse Ltd · PCS 7027 · ℗ 1967", 512, 974);
    return c;
  }

  /* ---------- «Мелодия»: кремовая этикетка (реплика по фото) ---------- */

  function labelMelodiya(o) {
    var c = cvs(), x = c.getContext("2d");
    var bg1 = o.tint || "#efe9dc", ink = "#2b2a28", dim = "#54524d";
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, "#f5f0e4"); g.addColorStop(1, bg1);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(60,58,52,0.4)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();

    x.textAlign = "center"; x.fillStyle = ink;

    // арки шапки — как на оригинале
    arcText(x, "МИНИСТЕРСТВО КУЛЬТУРЫ СССР", -Math.PI / 2, 425, "17px 'Times New Roman', serif", ink, 1);
    arcText(x, "ВСЕСОЮЗНАЯ ФИРМА ГРАМПЛАСТИНОК", -Math.PI / 2, 330, "12px 'Times New Roman', serif", dim, 1);

    // МЕЛОДИЯ с разрядкой
    x.font = "bold 68px 'Times New Roman', serif";
    setLS(x, 14);
    x.fillText("МЕЛОДИЯ", 512, 268);
    setLS(x, 0);

    // розочка-логотип: три дуги
    x.strokeStyle = ink; x.lineWidth = 4;
    x.beginPath(); x.arc(512, 330, 26, Math.PI * 0.15, Math.PI * 1.15); x.stroke();
    x.beginPath(); x.arc(512, 330, 16, Math.PI * 1.2, Math.PI * 2.2); x.stroke();
    x.beginPath(); x.arc(512, 330, 7, Math.PI * 0.9, Math.PI * 2); x.stroke();

    x.font = "16px 'Times New Roman', serif";
    x.fillText(o.plant || "ЛЕНИНГРАДСКИЙ ЗАВОД", 512, 392);

    // линейка и реквизиты
    x.strokeStyle = ink; x.lineWidth = 2;
    x.beginPath(); x.moveTo(120, 420); x.lineTo(904, 420); x.stroke();

    x.textAlign = "left"; x.font = "16px 'Times New Roman', serif"; x.fillStyle = ink;
    x.fillText(o.gost || "", 130, 458);
    x.fillText(o.cat || "", 130, 486);
    x.textAlign = "right";
    x.fillText("▽33", 890, 458);
    x.textAlign = "center"; x.fillStyle = dim;
    x.fillText(o.side || "", 700, 486);

    // центральный блок (на 7" этикетке отверстие крупнее — блок ниже)
    x.fillStyle = ink;
    x.font = "bold 34px 'Times New Roman', serif";
    setLS(x, 4);
    x.fillText(o.big, 512, 648);
    setLS(x, 0);
    x.font = "19px 'Times New Roman', serif";
    (o.lines || []).forEach(function (t, i) {
      x.fillText(t, 512, 686 + i * 30);
    });

    x.fillStyle = dim;
    arcText(x, "ИЗГОТОВЛЕНО В СССР · ЦЕНА 1 РУБ.", Math.PI, 460,
      "13px 'Times New Roman', serif", dim, 1);
    return c;
  }

  /* ---------- Atlantic 1976 (Disco Inferno) — реплика по фото ---------- */

  function labelAtlantic76() {
    var c = cvs(), x = c.getContext("2d");
    var GRAY = "#3d3d40", RED = "#e8564a", DKRED = "#b03328", INK = "#1d1c1a";

    x.fillStyle = GRAY; x.fillRect(0, 0, S, 470);
    x.fillStyle = RED; x.fillRect(0, 470, S, S - 470);
    // мягкая граница половин
    var sh = x.createLinearGradient(0, 430, 0, 510);
    sh.addColorStop(0, "rgba(61,61,64,1)"); sh.addColorStop(1, "rgba(61,61,64,0)");
    x.fillStyle = sh; x.fillRect(0, 430, S, 80);

    x.strokeStyle = "rgba(232,86,74,0.5)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();

    // логотип ATLANTIC: большая A + хвост, потом TLANTIC
    x.save();
    x.fillStyle = RED;
    x.translate(96, 60);
    x.font = "italic bold 300px Georgia, serif";
    x.fillText("A", 0, 260);
    x.restore();
    x.fillStyle = RED;
    x.font = "italic bold 118px Georgia, serif";
    setLS(x, 6);
    x.fillText("TLANTIC", 330, 200);
    setLS(x, 0);
    // хвост-скиммер от A
    x.strokeStyle = RED; x.lineWidth = 22; x.lineCap = "round";
    x.beginPath(); x.moveTo(140, 240);
    x.bezierCurveTo(90, 420, 96, 560, 210, 640);
    x.stroke();
    // красная линия под логотипом
    x.beginPath(); x.moveTo(60, 300); x.lineTo(1010, 300); x.stroke();

    x.font = "bold 44px Arial"; x.fillStyle = RED;
    x.textAlign = "left";
    x.fillText("45  R.P.M.", 660, 440);

    // правый блок в красной зоне
    x.fillStyle = INK; x.font = "bold 24px Arial";
    var rb = ["45-3389", "Pub., Six Strings,", "Golden Fleece, BMI", "Time:  3:35", "From Atlantic", "LP  18211"];
    rb.forEach(function (t, i) { x.fillText(t, 620, 528 + i * 32); });

    // левый блок: ® + swirl + VOCAL
    x.strokeStyle = INK; x.lineWidth = 5;
    x.beginPath(); x.arc(180, 580, 16, 0, 6.283); x.stroke();
    x.font = "bold 18px Arial"; x.fillText("®", 172, 640);
    // swirl-эмблема Atlantic
    x.lineWidth = 9;
    for (var sw = 0; sw < 3; sw++) {
      x.beginPath();
      x.arc(180, 730, 20 + sw * 14, sw * 2.1, sw * 2.1 + 4.4);
      x.stroke();
    }
    x.fillStyle = INK;
    x.font = "bold 22px Arial";
    x.fillText("VOCAL", 96, 800);
    x.fillText("ST-A-33119 SP", 74, 830);
    x.font = "bold 28px Arial";
    x.fillText("STEREO", 96, 866);

    // центральный блок названия
    x.textAlign = "center";
    x.fillStyle = DKRED;
    x.font = "bold 40px Arial";
    setLS(x, 2);
    x.fillText("DISCO INFERNO", 512, 726);
    setLS(x, 0);
    x.fillStyle = INK;
    x.font = "21px Arial";
    x.fillText("(Leroy Green & Ron \"Have Mercy\" Kersey)", 512, 756);
    x.font = "bold 30px Arial";
    x.fillText("THE TRAMMPS", 512, 792);
    x.font = "17px Arial";
    x.fillText("Produced by Baker, Harris & Young Productions", 512, 822);
    x.fillText("Arranged by Ron \"Have Mercy\" Kersey", 512, 846);
    x.fillText("\"A Tom Moulton Mix\"", 512, 870);
    x.font = "16px Arial";
    x.fillText("℗ 1976 Atlantic", 512, 898);

    arcText(x, "MFG. BY ATLANTIC RECORDING CORP. 75 ROCKEFELLER PLAZA, N.Y., N.Y. · A WARNER COMMUNICATIONS COMPANY",
      Math.PI, 462, "13px Arial", "rgba(29,28,26,0.85)", 1);
    return c;
  }

  /* ---------- Atlantic 78 (Honey Love) — реплика по фото ---------- */

  function labelAtlantic78() {
    var c = cvs(), x = c.getContext("2d");
    var OR = "#e0591d", DK = "#2c2c24", INK = "#211f1a";

    x.fillStyle = OR; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(44,44,36,0.45)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();

    // тёмная «шапка» с вырезанным TLANTIC
    x.fillStyle = DK;
    x.beginPath();
    x.moveTo(60, 0); x.lineTo(1010, 0); x.lineTo(1010, 330);
    x.lineTo(330, 330); x.lineTo(330, 250); x.lineTo(60, 250);
    x.closePath(); x.fill();
    // вертикальная тёмная полоса слева (хвост A)
    x.beginPath();
    x.moveTo(60, 250); x.lineTo(200, 250);
    x.bezierCurveTo(150, 420, 130, 560, 160, 700);
    x.lineTo(64, 700); x.closePath(); x.fill();

    // большая A и TLANTIC оранжевым
    x.fillStyle = OR;
    x.font = "italic bold 240px Georgia, serif";
    x.fillText("A", 78, 236);
    x.font = "italic bold 100px Georgia, serif";
    setLS(x, 6);
    x.fillText("TLANTIC", 330, 196);
    setLS(x, 0);
    x.strokeStyle = OR; x.lineWidth = 16; x.lineCap = "round";
    x.beginPath(); x.moveTo(120, 300); x.lineTo(1000, 300); x.stroke();

    // отверстие 78 с потёртым белым кольцом
    x.beginPath(); x.arc(512, 470, 74, 0, 6.283);
    x.fillStyle = "rgba(232,226,214,0.85)"; x.fill();
    x.beginPath(); x.arc(512, 470, 56, 0, 6.283);
    x.fillStyle = "#0c0b09"; x.fill();

    x.fillStyle = INK; x.textAlign = "left";
    x.font = "bold 34px Arial";
    x.fillText("A-1203", 190, 470);

    x.font = "bold 26px Arial";
    var vb = ["Vocal  Quartet", "Pub:  Progressive,  BMI", "Times:  2:21"];
    vb.forEach(function (t, i) { x.fillText(t, 620, 440 + i * 36); });

    // название и исполнитель
    x.font = "bold 58px Arial";
    setLS(x, 10);
    x.fillText("HONEY LOVE", 170, 660);
    setLS(x, 0);
    x.font = "24px Arial";
    x.fillText("(McPhatter - Gerald)", 172, 700);
    x.font = "bold 48px Arial";
    setLS(x, 4);
    x.fillText("THE DRIFTERS", 172, 772);
    setLS(x, 0);
    x.font = "24px Arial";
    x.fillText("featuring Clyde McPhatter", 172, 812);

    x.textAlign = "center";
    x.font = "bold 34px Arial";
    x.fillText("1029", 512, 918);
    return c;
  }

  /* ---------- Get Loose Crew: тёмная этикетка под красный винил ---------- */

  function labelGetLoose() {
    var c = cvs(), x = c.getContext("2d");
    var SIL = "#d6d9de", DIM = "#8f949e";
    labelBase(x, "rgba(214,217,222,0.35)", "#1d1d20", "#0e0e10");

    x.textAlign = "center"; x.fillStyle = SIL;
    x.font = "bold 30px Arial";
    setLS(x, 8);
    x.fillText("GET LOOSE CREW", 512, 250);
    setLS(x, 0);
    x.fillStyle = DIM;
    x.font = "19px Arial";
    x.fillText("12\" SINGLE · 33⅓ RPM", 512, 300);

    x.strokeStyle = SIL; x.lineWidth = 2;
    x.beginPath(); x.moveTo(260, 340); x.lineTo(764, 340); x.stroke();

    x.fillStyle = SIL;
    x.font = "bold 26px Arial";
    x.fillText("SELF-TITLED DEBUT", 512, 640);
    x.fillStyle = DIM;
    x.font = "19px Arial";
    x.fillText("℗ 1988 · LOW LAND", 512, 676);
    x.fillText("PRODUCED AT THE BUNKER", 512, 704);

    // Parental Advisory — как на современных переизданиях
    x.fillStyle = "#0d0d0f"; x.fillRect(402, 800, 220, 54);
    x.strokeStyle = SIL; x.lineWidth = 3;
    x.strokeRect(402, 800, 220, 54);
    x.fillStyle = SIL;
    x.font = "bold 15px Arial";
    x.fillText("PARENTAL", 512, 822);
    x.fillText("ADVISORY", 512, 842);

    arcText(x, "STORE EXCLUSIVE PRESSING · RED MARBLED VINYL",
      Math.PI, 462, "14px Arial", DIM, 1);
    return c;
  }

  /* ---------- Reprise 1966 (Sinatra) ---------- */

  function labelReprise() {
    var c = cvs(), x = c.getContext("2d");
    var TAN = "#d9b98a", BR = "#46281a", DIM = "#6b4527";
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, "#e2c49a"); g.addColorStop(1, TAN);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(70,40,26,0.5)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();

    x.textAlign = "center"; x.fillStyle = BR;
    x.font = "italic bold 84px Georgia, serif";
    x.fillText("Reprise", 512, 190);

    x.strokeStyle = BR; x.lineWidth = 3;
    x.beginPath(); x.moveTo(300, 232); x.lineTo(724, 232); x.stroke();

    x.font = "22px Arial"; x.fillStyle = DIM;
    x.fillText("RECORDS · ℗ 1966", 512, 268);

    x.fillStyle = BR;
    fitText(x, "THAT'S LIFE", "bold 54px Georgia, serif", 512, 400, 660);
    x.font = "30px Georgia, serif";
    x.fillText("Frank Sinatra", 512, 450);

    x.textAlign = "left"; x.font = "bold 22px Arial"; x.fillStyle = DIM;
    x.fillText("STEREO", 130, 540);
    x.fillText("FS 1020", 130, 570);
    x.textAlign = "right";
    x.fillText("SIDE ONE", 894, 540);
    x.fillText("SIDE TWO", 894, 570);

    x.textAlign = "center";
    arcText(x, "A WARNER COMMUNICATIONS COMPANY · © 1966, 2003",
      Math.PI, 462, "14px Arial", DIM, 1);
    return c;
  }

  /* ---------- минималистичные современные этикетки ---------- */

  function minimalLabel(o) {
    var c = cvs(), x = c.getContext("2d");
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, o.bg1); g.addColorStop(1, o.bg2);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = o.ring; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();
    x.beginPath(); x.arc(512, 512, 200, 0, 6.283);
    x.lineWidth = o.thin || 2;
    x.stroke();

    x.fillStyle = o.ink; x.textAlign = "center";
    if (o.mono) {
      x.font = "bold 26px 'JetBrains Mono', monospace";
      setLS(x, 4);
      x.fillText((o.title || "").toUpperCase(), 512, 300);
      setLS(x, 0);
      x.font = "18px 'JetBrains Mono', monospace";
      x.fillStyle = o.dim || o.ink;
      x.fillText((o.artist || "").toUpperCase(), 512, 350);
      x.font = "16px 'JetBrains Mono', monospace";
      x.fillText((o.cat || "") + " · 33⅓ RPM", 512, 720);
      arcText(x, o.rim || "33⅓ · STORE PRESSING", Math.PI, 450,
        "13px 'JetBrains Mono', monospace", o.dim || o.ink, 1);
    } else {
      fitText(x, (o.title || "").toUpperCase(),
        "bold 40px Georgia, serif", 512, 320, 640);
      x.font = "italic 24px Georgia, serif";
      x.fillStyle = o.dim || o.ink;
      x.fillText(o.artist || "", 512, 368);
      x.font = "18px Arial";
      x.fillText((o.cat || "") + " · 33⅓ RPM", 512, 720);
      arcText(x, o.rim || "33⅓ RPM · STORE PRESSING", Math.PI, 450,
        "14px Arial", o.dim || o.ink, 1);
    }
    return c;
  }

  /* ---------- «Мелодия» жёлтая (Реквием) — реплика по фото ---------- */

  function labelMelodiyaYellow() {
    var c = cvs(), x = c.getContext("2d");
    var ink = "#1c1a14", dim = "#3d3a2e";
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, "#f0d04d"); g.addColorStop(1, "#dfb92e");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(60,50,20,0.45)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();

    x.textAlign = "center"; x.fillStyle = ink;

    // арки шапки, как на прессинге студии грамзаписи
    arcText(x, "ВСЕСОЮЗНАЯ СТУДИЯ ГРАМЗАПИСИ", -Math.PI / 2, 430,
      "17px 'Times New Roman', serif", ink, 1);
    arcText(x, "ВСЕСОЮЗНАЯ ФИРМА ГРАМПЛАСТИНОК «МЕЛОДИЯ»", Math.PI, 455,
      "13px 'Times New Roman', serif", dim, 1);

    // фигура с рупором (знак фирмы) — упрощённый контур
    x.strokeStyle = ink; x.fillStyle = ink;
    x.lineWidth = 4; x.lineCap = "round";
    x.beginPath(); x.arc(470, 282, 9, 0, 6.283); x.stroke();          // голова
    x.beginPath(); x.moveTo(470, 291); x.lineTo(466, 330); x.stroke(); // корпус
    x.beginPath(); x.moveTo(468, 305); x.lineTo(430, 285); x.stroke(); // рука к рупору
    x.beginPath(); x.moveTo(468, 312); x.lineTo(434, 300); x.stroke();
    x.beginPath(); x.moveTo(426, 280); x.lineTo(408, 312); x.lineTo(446, 316); x.closePath(); x.fill(); // рупор
    x.beginPath(); x.moveTo(466, 330); x.lineTo(452, 352); x.moveTo(466, 330); x.lineTo(480, 352); x.stroke(); // ноги
    x.beginPath(); x.arc(470, 360, 26, Math.PI * 0.05, Math.PI * 0.95); x.stroke(); // «пластинка» под ногами

    // МЕЛОДИЯ с разрядкой
    x.font = "bold 64px 'Times New Roman', serif";
    setLS(x, 12);
    x.fillText("МЕЛОДИЯ", 512, 430);
    setLS(x, 0);

    // реквизиты по краям
    x.textAlign = "left"; x.font = "16px 'Times New Roman', serif";
    x.fillText("ГОСТ 5289-56", 130, 460);
    x.fillText("Д—05111/2", 130, 486);
    x.textAlign = "right";
    x.fillText("вторая гр-1", 894, 460);
    x.fillText("(4 стороны)", 894, 486);

    // название и треки стороны
    x.textAlign = "center";
    x.font = "bold 32px 'Times New Roman', serif";
    x.fillText("В. МОЦАРТ. РЕКВИЕМ", 512, 590);
    x.font = "20px 'Times New Roman', serif";
    var tr = ["3. Sequenz: Tuba mirum", "4. Rex tremendae",
      "5. Recordare", "6. Confutatis"];
    tr.forEach(function (t, i) { x.fillText(t, 512, 630 + i * 32); });
    x.fillStyle = dim;
    x.font = "16px 'Times New Roman', serif";
    x.fillText("солисты, хор и симфонический оркестр", 512, 772);
    return c;
  }

  /* ---------- AC/DC — Back in Black: реплика по фото ---------- */

  // контур логотипа AC/DC (координаты из прототипа vinyl-3d)
  var LOGO_ASPECT = 2.5379;
  var LOGO = [[[0.917,0.0],[0.832,0.213],[0.831,0.768],[0.922,0.998],[1.0,0.787],[0.965,0.699],[0.958,0.699],[0.919,0.799],[0.883,0.706],[0.883,0.123],[0.958,0.296],[0.966,0.296],[0.999,0.194]],[[0.321,0.002],[0.238,0.213],[0.237,0.782],[0.329,0.998],[0.406,0.784],[0.373,0.699],[0.363,0.699],[0.325,0.799],[0.289,0.709],[0.289,0.126],[0.365,0.299],[0.388,0.256],[0.404,0.197],[0.329,0.002]],[[0.108,0.005],[0.016,0.237],[0.016,0.829],[0.0,0.896],[0.042,1.0],[0.092,0.884],[0.071,0.82],[0.074,0.642],[0.136,0.647],[0.137,0.82],[0.12,0.886],[0.161,0.995],[0.208,0.884],[0.189,0.82],[0.189,0.209]],[[0.707,0.012],[0.637,0.017],[0.597,0.116],[0.613,0.185],[0.613,0.815],[0.597,0.884],[0.639,0.988],[0.713,0.986],[0.782,0.81],[0.783,0.201]],[[0.67,0.135],[0.669,0.879],[0.675,0.882],[0.727,0.742],[0.727,0.275]],[[0.546,0.147],[0.486,0.152],[0.413,0.573],[0.418,0.59],[0.473,0.6],[0.435,0.927],[0.567,0.457],[0.566,0.441],[0.514,0.429],[0.546,0.197]],[[0.077,0.149],[0.076,0.483],[0.131,0.488],[0.133,0.28]]];

  function drawAcdcLogo(x, cx, cy, W, mode) {
    var H = W / LOGO_ASPECT, x0 = cx - W / 2, y0 = cy - H / 2;
    var path = function () {
      x.beginPath();
      LOGO.forEach(function (p) {
        p.forEach(function (q, i) {
          var X = x0 + q[0] * W, Y = y0 + q[1] * H;
          if (i) x.lineTo(X, Y); else x.moveTo(X, Y);
        });
        x.closePath();
      });
    };
    x.save(); x.lineJoin = "miter"; x.miterLimit = 4;
    path();
    x.strokeStyle = mode === "sleeve" ? "#e6e6ea" : "#cfcfcf";
    x.lineWidth = mode === "sleeve" ? 2.6 : 3.4;
    x.stroke();
    x.restore();
  }

  function labelAcdc() {
    var c = cvs(), x = c.getContext("2d");
    var SIL = "#d6d6d6", DIM = "#a8a8a8";
    labelBase(x, "rgba(214,214,214,0.0)", "#141414", "#080808");

    x.textAlign = "center"; x.fillStyle = SIL;
    drawAcdcLogo(x, 512, 225, 540, "label");

    x.font = "38px Georgia, 'Times New Roman', serif";
    setLS(x, 5);
    x.fillText("BACK IN BLACK", 512, 372);
    setLS(x, 0);

    // левая группа: ℗1980 · ALBERT · SONY MUSIC
    x.textAlign = "left";
    x.font = "13px Arial"; x.fillStyle = DIM;
    x.fillText("℗ 1980", 96, 496);
    x.strokeStyle = SIL; x.lineWidth = 2;
    x.strokeRect(148, 480, 74, 26);
    x.font = "bold 15px Arial"; x.fillStyle = SIL;
    x.fillText("ALBERT", 156, 498);
    x.font = "13px Arial"; x.fillStyle = DIM;
    x.fillText("SONY MUSIC", 240, 496);

    // правая группа: сторона и матричные номера
    x.textAlign = "right";
    x.font = "bold 17px Arial"; x.fillStyle = SIL;
    x.fillText("SIDE TWO", 920, 482);
    x.font = "15px Arial"; x.fillStyle = DIM;
    x.fillText("19658834541A", 920, 504);
    x.fillText("19658834541B", 920, 522);
    x.fillText("STEREO", 920, 540);

    // треклист — одна центральная колонка, как на фото
    x.textAlign = "center";
    var s1 = ["HELLS BELLS", "SHOOT TO THRILL", "WHAT DO YOU DO FOR MONEY HONEY",
      "GIVIN THE DOG A BONE", "LET ME PUT MY LOVE INTO YOU"];
    var s2 = ["BACK IN BLACK", "YOU SHOOK ME ALL NIGHT LONG", "HAVE A DRINK ON ME",
      "SHAKE A LEG", "ROCK AND ROLL AIN'T"];
    x.font = "18px 'Times New Roman', serif"; x.fillStyle = DIM;
    x.fillText("SIDE ONE", 512, 592);
    x.font = "24px 'Times New Roman', serif"; x.fillStyle = SIL;
    s1.forEach(function (t, i) { x.fillText(t, 512, 622 + i * 28); });
    x.font = "18px 'Times New Roman', serif"; x.fillStyle = DIM;
    x.fillText("SIDE TWO", 512, 770);
    x.font = "24px 'Times New Roman', serif"; x.fillStyle = SIL;
    s2.forEach(function (t, i) { x.fillText(t, 512, 800 + i * 27); });
    x.fillText("NOISE POLLUTION", 512, 935);

    arcText(x, "PRODUCED BY ROBERT JOHN 'MUTT' LANGE · REMASTERED FROM THE ORIGINAL MASTER TAPES BY GEORGE MARINO AT STERLING SOUND",
      Math.PI, 488, "14px Arial", DIM, 1);
    arcText(x, "ALL TITLES PUBLISHED BY J. ALBERT & SON (USA) INC. (ASCAP) · © 1980, 2003 LEIDSEPLEIN PRESSE B.V.",
      0, 488, "14px Arial", DIM, 1);
    return c;
  }

  // лицевая обложка Back in Black: чёрный конверт + контурный логотип
  function sleeveFrontAcdc() {
    var c = cvs(), x = c.getContext("2d"), R = rng(7);
    var g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#0b0c13"); g.addColorStop(1, "#07080d");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 9000; i++) {
      x.fillStyle = "rgba(" + (R() < 0.5 ? 255 : 90) + "," + (R() < 0.5 ? 255 : 120) + ",255," + (R() * 0.035).toFixed(3) + ")";
      x.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
    }
    x.save();
    x.strokeStyle = "rgba(150,155,175,0.07)"; x.lineWidth = 16;
    x.shadowColor = "rgba(150,155,175,0.08)"; x.shadowBlur = 12;
    x.beginPath(); x.arc(S / 2, S / 2, S * 0.478, 0, 6.283); x.stroke();
    x.restore();
    drawAcdcLogo(x, 502, 215, 549, "sleeve");
    x.fillStyle = "#74747a"; x.textAlign = "center";
    fitText(x, "BACK IN BLACK", "bold 76px 'Times New Roman', Georgia, serif", 502, 494, 532);
    return c;
  }

  function backAcdc() {
    var c = cvs(), x = c.getContext("2d"), R = rng(3);
    var g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#0b0c13"); g.addColorStop(1, "#07080d");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 9000; i++) {
      x.fillStyle = "rgba(" + (R() < 0.5 ? 255 : 90) + "," + (R() < 0.5 ? 255 : 120) + ",255," + (R() * 0.035).toFixed(3) + ")";
      x.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
    }
    x.textAlign = "center"; x.fillStyle = "#c9cdd2";
    drawAcdcLogo(x, 512, 150, 330, "sleeve");
    var all = ["HELLS BELLS", "SHOOT TO THRILL", "WHAT DO YOU DO FOR MONEY HONEY",
      "GIVIN THE DOG A BONE", "LET ME PUT MY LOVE INTO YOU",
      "BACK IN BLACK", "YOU SHOOK ME ALL NIGHT LONG", "HAVE A DRINK ON ME",
      "SHAKE A LEG", "ROCK AND ROLL AIN'T (NOISE POLLUTION)"];
    x.font = "22px 'Times New Roman', serif";
    all.forEach(function (t, i) { x.fillText(t, 512, 300 + i * 40); });
    x.fillStyle = "#8f959d";
    x.font = "17px Arial";
    x.fillText("Albert Productions · ℗ 1980 J. Albert & Son Pty. Ltd.", 512, 946);
    x.fillText("Manufactured by Sony Music Entertainment", 512, 974);
    return c;
  }

  /* ---------- KORN: скрябл-логотип, красный мрамор ---------- */

  // рвёт нарисованное: случайные выбоины и царапины по слою краски —
  // edges становятся рваными, как на настоящей печатной этикетке
  function distressed(drawFn, w, h, amount, seed) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    drawFn(x, w, h);
    var R = rng(seed);
    x.save();
    x.globalCompositeOperation = "destination-out";
    x.fillStyle = "#000";
    x.strokeStyle = "#000";
    x.lineCap = "round";
    var n = Math.round(w * h * amount / 1000);
    for (var i = 0; i < n; i++) {
      x.globalAlpha = 0.25 + R() * 0.75;
      x.beginPath();
      x.arc(R() * w, R() * h, 0.6 + R() * 2.2, 0, 6.283);
      x.fill();
    }
    for (i = 0; i < 4; i++) {
      x.globalAlpha = 0.4 + R() * 0.6;
      x.lineWidth = 0.7 + R() * 1.4;
      x.beginPath();
      x.moveTo(R() * w, R() * h);
      x.quadraticCurveTo(R() * w, R() * h, R() * w, R() * h);
      x.stroke();
    }
    x.restore();
    return c;
  }

  function kornLogoCanvas(W, color) {
    var H = Math.round(W * 0.44);
    return distressed(function (x, w, h) {
      var word = "Korn";
      x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "italic bold " + Math.round(h * 0.74) + "px Georgia, serif";
      var passes = [
        [0, 0, 1, 0], [4, -3, 0.5, 0.02], [-4, 3, 0.5, -0.02],
        [2, 5, 0.35, 0.03], [-6, -2, 0.3, -0.04]
      ];
      passes.forEach(function (p) {
        x.globalAlpha = p[2];
        x.fillStyle = color;
        x.save();
        x.translate(w / 2 + p[0], h / 2 + p[1]);
        x.rotate(p[3] - 0.03);
        x.fillText(word, 0, 0);
        x.restore();
      });
    }, W, Math.round(W * 0.44), 30, 57);
  }

  function drawKornScribble(x, cx, cy, W, color) {
    // «Korn» рукописно: рваный слой-логотип поверх
    var logo = kornLogoCanvas(W, color);
    x.drawImage(logo, cx - W / 2, cy - W * 0.22);
  }

  function coverKorn() {
    var c = cvs(), x = c.getContext("2d");
    var R = rng(41), i;
    // красный кадр: пересвеченный песок и тени
    var g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, "#b44434");
    g.addColorStop(0.55, "#8e2a1c");
    g.addColorStop(1, "#571009");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    var v = x.createRadialGradient(430, 380, 60, 430, 380, 720);
    v.addColorStop(0, "rgba(224,120,96,0.55)");
    v.addColorStop(1, "rgba(224,120,96,0)");
    x.fillStyle = v; x.fillRect(0, 0, S, S);

    // длинные тени от качелей — диагональные тёмные языки
    x.fillStyle = "rgba(46,8,5,0.72)";
    x.beginPath();
    x.moveTo(560, 300); x.lineTo(1024, 760); x.lineTo(1024, 1024);
    x.lineTo(430, 1024); x.closePath(); x.fill();
    x.beginPath();
    x.moveTo(700, 260); x.lineTo(1024, 560); x.lineTo(1024, 700);
    x.lineTo(610, 430); x.closePath(); x.fill();
    for (i = 0; i < 900; i++) {
      x.fillStyle = "rgba(30,6,4," + (R() * 0.1).toFixed(2) + ")";
      x.fillRect(R() * S, R() * S, 2 + R() * 3, 1 + R() * 2);
    }

    // качели: стойка, канаты, сиденье и силуэт девочки
    x.strokeStyle = "#2a0806"; x.lineWidth = 10; x.lineCap = "round";
    x.beginPath(); x.moveTo(560, 250); x.lineTo(640, 60); x.stroke();
    x.beginPath(); x.moveTo(560, 250); x.lineTo(480, 60); x.stroke();
    x.lineWidth = 4;
    x.beginPath(); x.moveTo(508, 92); x.lineTo(524, 470); x.stroke();
    x.beginPath(); x.moveTo(600, 92); x.lineTo(590, 470); x.stroke();
    x.fillStyle = "#240705";
    x.fillRect(508, 470, 96, 14);
    x.beginPath(); x.arc(556, 360, 26, 0, 6.283); x.fill();
    x.beginPath(); x.moveTo(556, 386); x.lineTo(550, 452); x.lineTo(580, 452); x.lineTo(574, 386); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(550, 452); x.lineTo(516, 486); x.moveTo(580, 452); x.lineTo(600, 486); x.stroke();

    drawKornScribble(x, 240, 190, 340, "#1c0a08");

    // Parental Advisory
    x.fillStyle = "#e9e9ea"; x.fillRect(56, 906, 190, 58);
    x.fillStyle = "#141414"; x.font = "bold 17px Arial"; x.textAlign = "center";
    x.fillText("PARENTAL", 151, 930);
    x.fillText("ADVISORY", 151, 950);
    return c;
  }

  function labelKorn() {
    var c = cvs(), x = c.getContext("2d");
    var SIL = "#d2d5da";
    // этикетка — круг на прозрачном фоне: логотип выйдет за край на винил
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 352);
    g.addColorStop(0, "#1e1e21"); g.addColorStop(1, "#0d0d0f");
    x.beginPath(); x.arc(512, 512, 352, 0, 6.283);
    x.fillStyle = g; x.fill();
    x.strokeStyle = "rgba(210,213,218,0.28)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 345, 0, 6.283); x.stroke();

    // логотип-призрак: под наклоном, чуть вылезает за край этикета
    if (KORN_LOGO.ready) {
      x.save();
      x.translate(512, 486);
      x.rotate(-0.31);
      x.globalAlpha = 0.55;
      x.drawImage(KORN_LOGO.img, -420, -420, 840, 840);
      x.restore();
    } else {
      x.save();
      x.translate(512, 486);
      x.rotate(-0.31);
      x.globalAlpha = 0.55;
      x.drawImage(kornLogoCanvas(800, SIL), -400, -352);
      x.restore();
    }

    // треклист — маленький блок справа от отверстия, ЖЁСТКО внутри этикета:
    // клип по кругу этикета, чтобы текст никогда не вышел на красное
    var tr = ["1. blind", "2. ball tongue", "3. need to", "4. clown",
      "5. divine", "6. faget", "7. lies", "8. helmet in the bush", "9. daddy"];
    var listC = distressed(function (x2, w, h) {
      x2.textAlign = "left"; x2.fillStyle = SIL;
      x2.font = "italic 16px Georgia, serif";
      x2.globalAlpha = 0.95;
      x2.fillText("side 1:", 4, 18);
      x2.font = "15px Georgia, serif";
      tr.forEach(function (t, i) {
        x2.fillText(t, 14, 44 + i * 22);
      });
    }, 280, 236, 12, 71);
    x.save();
    x.beginPath();
    x.arc(512, 512, 340, 0, 6.283);
    x.clip();
    x.globalAlpha = 0.9;
    x.drawImage(listC, 556, 470);
    x.restore();

    x.textAlign = "center"; x.fillStyle = "rgba(143,148,158,0.6)";
    x.font = "13px Arial";
    x.fillText("immortal records · ℗ 1994 sony music", 512, 806);
    return c;
  }

  /* ---------- SLEEP TOKEN — Even In Arcadia (2025) ---------- */

  function coverSleepToken() {
    var c = cvs(), x = c.getContext("2d");
    var g = x.createRadialGradient(512, 480, 80, 512, 512, 760);
    g.addColorStop(0, "#141419"); g.addColorStop(1, "#08080b");
    x.fillStyle = g; x.fillRect(0, 0, S, S);

    // сигил: двойной круг и ломаная печать
    x.strokeStyle = "rgba(238,238,240,0.92)"; x.lineWidth = 2.5;
    x.beginPath(); x.arc(512, 440, 300, 0, 6.283); x.stroke();
    x.beginPath(); x.arc(512, 440, 282, 0, 6.283); x.stroke();
    x.lineWidth = 3;
    x.beginPath(); x.moveTo(512, 200); x.lineTo(512, 640); x.stroke();
    x.beginPath(); x.moveTo(512, 300); x.lineTo(640, 420); x.lineTo(560, 470); x.stroke();
    x.beginPath(); x.moveTo(512, 380); x.lineTo(396, 500); x.lineTo(560, 560); x.stroke();
    x.beginPath(); x.arc(700, 320, 10, 0, 6.283); x.stroke();

    x.fillStyle = "#e8e8ec"; x.textAlign = "center";
    x.font = "24px 'JetBrains Mono', monospace";
    setLS(x, 14);
    x.fillText("SLEEP TOKEN", 512, 852);
    setLS(x, 0);
    x.font = "italic 40px Georgia, serif";
    x.fillText("Even In Arcadia", 512, 912);
    return c;
  }

  function labelSleepToken() {
    var c = cvs(), x = c.getContext("2d");
    var SIL = "#d8dade", DIM = "#8f949e";
    labelBase(x, "rgba(216,218,222,0.3)", "#141418", "#0a0a0d");

    // малый сигил
    x.strokeStyle = SIL; x.lineWidth = 2;
    x.beginPath(); x.arc(512, 250, 120, 0, 6.283); x.stroke();
    x.beginPath(); x.moveTo(512, 140); x.lineTo(512, 360); x.stroke();
    x.beginPath(); x.moveTo(512, 200); x.lineTo(610, 300); x.stroke();

    x.fillStyle = SIL; x.textAlign = "center";
    x.font = "bold 20px 'JetBrains Mono', monospace";
    setLS(x, 4);
    x.fillText("EVEN IN ARCADIA", 512, 452);
    setLS(x, 0);

    var tr = ["Emergence", "Past Self", "Look to Windward", "Gethsemane",
      "Dangerous", "Damocles", "Caramel", "Provider", "Infinite Baths"];
    x.font = "18px 'Times New Roman', serif";
    x.textAlign = "left";
    tr.slice(0, 5).forEach(function (t, i) { x.fillText((i + 1) + ". " + t, 150, 520 + i * 32); });
    tr.slice(5).forEach(function (t, i) { x.fillText((i + 6) + ". " + t, 560, 520 + i * 32); });

    x.textAlign = "center"; x.fillStyle = DIM;
    x.font = "16px Arial";
    x.fillText("℗ 2025 RCA RECORDS · A SONY MUSIC ENTERTAINMENT COMPANY", 512, 700);
    arcText(x, "MASKED · NAMELESS · MMXXV", Math.PI, 462, "14px Arial", DIM, 1);
    return c;
  }

  /* ---------- GHOST — Skeletá (2025) ---------- */

  function coverGhost() {
    var c = cvs(), x = c.getContext("2d");
    var g = x.createRadialGradient(512, 460, 100, 512, 512, 760);
    g.addColorStop(0, "#efe9da"); g.addColorStop(1, "#ddd4bf");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "#1c1a16"; x.lineWidth = 4;
    x.strokeRect(44, 44, S - 88, S - 88);
    x.lineWidth = 1.5;
    x.strokeRect(58, 58, S - 116, S - 116);

    x.fillStyle = "#1c1a16"; x.textAlign = "center";
    x.font = "bold 150px Georgia, serif";
    setLS(x, 26);
    x.fillText("GHOST", 512, 430);
    setLS(x, 0);
    x.font = "54px Georgia, serif";
    x.fillText("SKELETÁ", 512, 540);
    x.font = "22px Georgia, serif";
    x.fillStyle = "#5c5648";
    x.fillText("TEN COMMANDMENTS OF THE FLESH · MMXXV", 512, 880);
    return c;
  }

  function labelGhost() {
    var c = cvs(), x = c.getContext("2d");
    var INK = "#1c1a16", DIM = "#5c5648";
    var g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
    g.addColorStop(0, "#f0ead9"); g.addColorStop(1, "#e2d9c4");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(28,26,22,0.5)"; x.lineWidth = 3;
    x.beginPath(); x.arc(512, 512, 486, 0, 6.283); x.stroke();

    x.fillStyle = INK; x.textAlign = "center";
    x.font = "bold 44px Georgia, serif";
    setLS(x, 10);
    x.fillText("GHOST", 512, 180);
    setLS(x, 0);
    x.font = "26px Georgia, serif";
    x.fillText("SKELETÁ", 512, 226);

    var tr = ["Peacefield", "Lachryma", "Satanized", "Guiding Lights",
      "De Profundis", "Cenotaph", "Missilia Amori", "Marks of the Evil One",
      "Umbra", "Excelsis"];
    x.font = "19px 'Times New Roman', serif";
    x.textAlign = "left";
    tr.slice(0, 5).forEach(function (t, i) { x.fillText((i + 1) + ". " + t, 150, 300 + i * 34); });
    tr.slice(5).forEach(function (t, i) { x.fillText((i + 6) + ". " + t, 560, 300 + i * 34); });

    x.textAlign = "center"; x.fillStyle = DIM;
    x.font = "16px Arial";
    x.fillText("℗ 2025 LOMA VISTA RECORDINGS", 512, 560);
    arcText(x, "BONE WHITE VINYL · PAPA V PERPETUA", Math.PI, 462,
      "14px Arial", DIM, 1);
    return c;
  }

  /* ---------- OPETH — The Last Will and Testament (2024) ---------- */

  function coverOpeth() {
    var c = cvs(), x = c.getContext("2d");
    var g = x.createRadialGradient(512, 460, 80, 512, 512, 780);
    g.addColorStop(0, "#131318"); g.addColorStop(1, "#08080a");
    x.fillStyle = g; x.fillRect(0, 0, S, S);

    x.fillStyle = "rgba(201,167,90,0.1)";
    x.font = "560px Georgia, serif";
    x.textAlign = "center";
    x.fillText("§", 640, 860);

    x.fillStyle = "#c9a75a";
    x.font = "30px Georgia, serif";
    setLS(x, 22);
    x.fillText("OPETH", 512, 220);
    setLS(x, 0);
    x.font = "italic 42px Georgia, serif";
    x.fillText("The Last Will and Testament", 512, 700);
    x.font = "20px Georgia, serif";
    x.fillStyle = "rgba(201,167,90,0.75)";
    x.fillText("§1 — §7 · MMXXIV", 512, 760);
    return c;
  }

  function labelOpeth() {
    var c = cvs(), x = c.getContext("2d");
    var GOLD = "#c9a75a", DIM = "#8a7648";
    labelBase(x, "rgba(201,167,90,0.35)", "#131316", "#0a0a0c");

    x.fillStyle = GOLD; x.textAlign = "center";
    x.font = "bold 26px Georgia, serif";
    setLS(x, 12);
    x.fillText("OPETH", 512, 180);
    setLS(x, 0);
    x.font = "italic 22px Georgia, serif";
    x.fillText("The Last Will and Testament", 512, 222);

    var tr = ["§1", "§2", "§3", "§4", "§5", "§6", "§7"];
    x.font = "24px Georgia, serif";
    x.textAlign = "left";
    tr.slice(0, 4).forEach(function (t, i) { x.fillText(t, 210, 310 + i * 40); });
    tr.slice(4).forEach(function (t, i) { x.fillText(t, 610, 310 + i * 40); });

    x.textAlign = "center"; x.fillStyle = DIM;
    x.font = "16px Arial";
    x.fillText("℗ 2024 REIGNING PHOENIX MUSIC", 512, 520);
    x.fillText("A CONCERT FOR THE DEAD, BROADCAST AT THE BIRTH OF ONE", 512, 546);
    arcText(x, "DEATH IS ONLY A DOOR · MMXXIV", Math.PI, 462,
      "14px Arial", DIM, 1);
    return c;
  }

  var PAINTERS = {
    "sgt-pepper":       { label: labelSgtPepper, back: backSgtPepper },
    "acdc-back-in-black": { label: labelAcdc, back: backAcdc, front: sleeveFrontAcdc },
    "melodiya-beatles": { label: function () {
        return labelMelodiya({
          big: "БИТЛЗ",
          lines: ["Вокально-инструментальный ансамбль", "(Англия)",
            "Сад  (Р. Старки)", "Что-нибудь  (Дж. Харрисон)", "На английском языке"],
          gost: "ГОСТ 5289-73", cat: "М62-38133",
          side: "3 гр 0:70  (Сторона 1)"
        });
      } },
    "mozart-requiem":   { label: labelMelodiyaYellow },
    "disco-inferno":    { label: labelAtlantic76 },
    "honey-love-78":    { label: labelAtlantic78 },
    "get-loose-crew":   { label: labelGetLoose },
    "sinatra-thats-life": { label: labelReprise },
    "electronic-chamber-music": { label: function () {
        return minimalLabel({
          bg1: "#f4f3ee", bg2: "#e4e3dc", ring: "rgba(30,30,32,0.55)",
          ink: "#232326", dim: "#6f6f74", thin: 2,
          title: "ELECTRONIC CHAMBER MUSIC", artist: "Various Artists",
          cat: "EMS-1000", mono: false,
          rim: "STEREO · TAPE TO DISC TRANSFER"
        });
      } },
    "pisu-strange-fruit": { label: function () {
        return minimalLabel({
          bg1: "#131c2a", bg2: "#0c111a", ring: "rgba(214,222,232,0.4)",
          ink: "#e6ebf2", dim: "#93a0b4", thin: 2,
          title: "Strange Fruit", artist: "Stefano Pisu Trio",
          cat: "SPT-017", mono: false,
          rim: "RECORDED AT STUDIO ROSSELINI"
        });
      } },
    "flight-attendant": { label: function () {
        return minimalLabel({
          bg1: "#f2f4f8", bg2: "#e2e8f2", ring: "rgba(30,79,156,0.5)",
          ink: "#1e4f9c", dim: "#5a7cae", thin: 2,
          title: "FLIGHT ATTENDANT", artist: "Flight Attendant",
          cat: "FA-01", mono: true,
          rim: "CLEAR BLUE VINYL EDITION"
        });
      } },
    "cloud-script":     { label: function () {
        return minimalLabel({
          bg1: "#f6f6f8", bg2: "#e8e9ec", ring: "rgba(40,42,48,0.5)",
          ink: "#26282e", dim: "#7d828c", thin: 2,
          title: "CLOUD SCRIPT", artist: "Cloud Script",
          cat: "CS-2019", mono: true,
          rim: "WHITE VINYL · GRAY MARBLED"
        });
      } },
    "telescopes-third-wave": { label: function () {
        return minimalLabel({
          bg1: "#17141f", bg2: "#0d0b12", ring: "rgba(222,216,240,0.4)",
          ink: "#ded8f0", dim: "#948bab", thin: 2,
          title: "THIRD WAVE", artist: "The Telescopes",
          cat: "WEISSKALT 004", mono: true,
          rim: "PURPLE & BLACK MARBLED VINYL"
        });
      } },
    "korn":            { label: labelKorn, front: coverKorn },
    "sleep-token":     { label: labelSleepToken, front: coverSleepToken },
    "ghost-skeleta":   { label: labelGhost, front: coverGhost },
    "opeth-tlwat":     { label: labelOpeth, front: coverOpeth }
  };

  /* ---------- API ---------- */

  window.RecordFactory = {
    register: function (list) {
      (list || []).forEach(function (r) { if (r.key) records[r.key] = r; });
    },

    label: function (key) {
      var rec = records[key] || { artist: "", title: "33⅓" };
      var ck = "label:" + key;
      if (!cache[ck]) {
        var p = PAINTERS[key];
        cache[ck] = p
          ? p.label()
          : minimalLabel({
              bg1: "#17171a", bg2: "#0e0e10", ring: "rgba(214,217,222,0.35)",
              ink: "#d6d9de", dim: "#8f949e", thin: 2,
              title: rec.title || "33⅓", artist: rec.artist || "",
              cat: "STORE", mono: true, rim: "DEMO PRESSING · STORE EXCLUSIVE"
            });
      }
      return cache[ck];
    },

    sleeveBack: function (key) {
      var rec = records[key] || { artist: "", title: "33⅓" };
      var ck = "back:" + key;
      if (!cache[ck]) {
        var p = PAINTERS[key];
        cache[ck] = p && p.back ? p.back() : genericBack(rec);
      }
      return cache[ck];
    },

    // параметры винила: цвет, мрамор, свечение, отверстие
    vinyl: function (key) {
      return VINYL[key] || { base: "#0b0b0e" };
    },

    // лицевая обложка: реальное фото; для рисованных конвертов (gen:) —
    // сначала пробуем photo (если пользователь положил файл), затем canvas
    sleeveImage: function (rec) {
      if (rec.img && rec.img.indexOf("gen:") === 0) {
        var self = this;
        if (rec.photo) {
          return new Promise(function (resolve) {
            var im = new Image();
            im.onload = function () { resolve(im); };
            im.onerror = function () { resolve(self.sleeveFrontCanvas(rec.key)); };
            im.src = rec.photo;
          });
        }
        return Promise.resolve(self.sleeveFrontCanvas(rec.key));
      }
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () { resolve(im); };
        im.onerror = function () { resolve(null); };
        im.src = rec.img;
      });
    },

    // рисованный конверт для карточек без фото (AC/DC)
    sleeveFrontCanvas: function (key) {
      var p = PAINTERS[key];
      return p && p.front ? p.front() : null;
    }
  };

  function genericBack(rec) {
    var c = cvs(), x = c.getContext("2d");
    var R = rng(11);
    var g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#101116");
    g.addColorStop(1, "#0a0b10");
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (var i = 0; i < 5200; i++) {
      x.fillStyle = "rgba(190,200,220," + (R() * 0.03).toFixed(3) + ")";
      x.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
    }
    x.save(); x.strokeStyle = "rgba(150,155,175,0.07)"; x.lineWidth = 16;
    x.beginPath(); x.arc(S / 2, S / 2, S * 0.478, 0, 6.283); x.stroke(); x.restore();

    x.textAlign = "center"; x.fillStyle = "#c9cdd2";
    fitText(x, (rec.artist || "").toUpperCase() + " — " + (rec.title || "").toUpperCase(),
      "bold 34px Georgia, serif", 512, 300, 820);
    x.font = "20px Arial"; x.fillStyle = "#9aa0a8";
    x.fillText("Храните в конверте, вдали от солнца и батарей.", 512, 380);
    x.fillText("33⅓ · Покровка, 17 · Москва", 512, 414);

    // псевдо-штрихкод
    x.fillStyle = "#c9cdd2";
    var bx = 380;
    for (var b = 0; b < 46; b++) {
      var w = 2 + ((b * 7) % 5);
      x.fillRect(bx, 780, w, 90);
      bx += w + 2 + ((b * 3) % 4);
    }
    return c;
  }

  /* ---------- предзагрузка настоящих логотипов ---------- */

  var KORN_LOGO = { img: null, ready: false };
  (function () {
    var li = new Image();
    li.onload = function () {
      KORN_LOGO.img = li;
      KORN_LOGO.ready = true;
      delete cache["label:korn"];
      // если герой уже показывает Korn — перерисовать с настоящим лого
      if (window.VinylDisc && window.VinylDisc.onLogoLoad) {
        window.VinylDisc.onLogoLoad();
      }
    };
    li.src = "img/logos/korn-logo-silver.png";
  })();
})();

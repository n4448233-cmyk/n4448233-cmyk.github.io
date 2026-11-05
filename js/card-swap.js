/* ============================================================
   CardSwap — колода карточек со стопкой, автосменой и драгом.
   Порт React-компонента CardSwap (reactbits.dev) на ванильный JS.

   Использование:
     var deck = CardSwap(rootElement, {
       items: [{ title: "...", image: "..." }, ...],
       delay: 4000,
       onCardClick: function (index) {},
       onChange: function (index) {}
     });
   deck.next() / deck.prev() / deck.destroy()
   ============================================================ */

(function () {
  "use strict";

  var PERSPECTIVE = 900;
  var TAU = Math.PI * 2;
  var STEP = 1 / 240;
  var PAD = 32;
  var AXES = ["x", "y", "z", "r", "p"];
  var DOWN = { x: 0, y: 1 };

  var THEMES = {
    dark: {
      "--swap-tile": "linear-gradient(180deg, #3a3644 0%, #27242f 100%)",
      "--swap-tile-edge": "rgba(255, 255, 255, 0.07)",
      "--swap-tile-highlight": "rgba(255, 255, 255, 0.12)",
      "--swap-shadow": "0 30px 60px -24px rgba(0, 0, 0, 0.8), 0 10px 24px -12px rgba(0, 0, 0, 0.55)",
      "--swap-media-edge": "rgba(255, 255, 255, 0.06)",
      "--swap-ink": "#f4f4f5",
      "--swap-badge": "rgba(255, 255, 255, 0.08)",
      "--swap-shade": "#100e15"
    },
    light: {
      "--swap-tile": "linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)",
      "--swap-tile-edge": "rgba(24, 24, 27, 0.08)",
      "--swap-tile-highlight": "rgba(255, 255, 255, 1)",
      "--swap-shadow": "0 30px 60px -28px rgba(24, 24, 27, 0.35), 0 10px 24px -14px rgba(24, 24, 27, 0.2)",
      "--swap-media-edge": "rgba(24, 24, 27, 0.06)",
      "--swap-ink": "#27272a",
      "--swap-badge": "rgba(24, 24, 27, 0.05)",
      "--swap-shade": "#ffffff"
    }
  };

  var clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };

  var stackBounds = function (o) {
    var slope = Math.tan((o.skewAmount * Math.PI) / 180);
    var spread = 1 + Math.max(0, o.hoverSpread);
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < o.visible; i++) {
      var scale = PERSPECTIVE / (PERSPECTIVE + i * o.depth);
      var us = [-o.width / 2, o.width / 2];
      var vs = [-o.height / 2, o.height / 2];
      for (var ui = 0; ui < 2; ui++) {
        for (var vi = 0; vi < 2; vi++) {
          var u = us[ui], v = vs[vi];
          var x = (i * o.cardDistance * spread + u) * scale;
          var y = (-i * o.verticalDistance * spread + v + u * slope) * scale;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      width: Math.ceil(maxX - minX + PAD * 2),
      height: Math.ceil(maxY - minY + PAD * 2),
      originX: PAD - minX,
      originY: PAD - minY
    };
  };

  window.CardSwap = function (root, options) {
    var o = options || {};
    var items = o.items && o.items.length ? o.items : [];
    var noop = function () {};

    if (!root || !items.length) return { next: noop, prev: noop, destroy: noop };

    var cardWidth = Math.max(40, Number(o.width) || 460);
    var cardHeight = Math.max(40, Number(o.height) || 340);
    var cardDistance = o.cardDistance != null ? o.cardDistance : 60;
    var verticalDistance = o.verticalDistance != null ? o.verticalDistance : 70;
    var depth = Math.max(0, o.depth != null ? o.depth : 90);
    var skewAmount = o.skewAmount != null ? o.skewAmount : 6;
    var visible = clamp(Math.round(o.visibleCards != null ? o.visibleCards : 4), 1, items.length);
    var delay = o.delay != null ? o.delay : 4000;
    var intro = o.intro !== false;
    var themeVars = THEMES[o.theme] || THEMES.dark;

    var bounds = stackBounds({
      width: cardWidth,
      height: cardHeight,
      cardDistance: cardDistance,
      verticalDistance: verticalDistance,
      depth: depth,
      skewAmount: skewAmount,
      visible: visible,
      hoverSpread: Math.max(0, o.hoverSpread != null ? o.hoverSpread : 0.12)
    });

    var settings = {
      width: cardWidth,
      height: cardHeight,
      dx: cardDistance,
      dy: verticalDistance,
      dz: depth,
      skew: skewAmount,
      visible: visible,
      delay: delay,
      autoplay: o.autoplay !== false,
      pauseOnHover: o.pauseOnHover !== false,
      draggable: o.draggable !== false,
      speed: clamp(o.speed != null ? o.speed : 1, 0.1, 4),
      bounce: clamp(o.bounce != null ? o.bounce : 0.35, 0, 1),
      parallax: clamp(o.parallax != null ? o.parallax : 0.5, 0, 1),
      hoverSpread: Math.max(0, o.hoverSpread != null ? o.hoverSpread : 0.12),
      dim: clamp(o.dim != null ? o.dim : 0.5, 0, 1),
      bounds: bounds,
      onCardClick: o.onCardClick,
      onChange: o.onChange
    };

    /* ---------- DOM ---------- */

    root.classList.add("card-swap");
    root.tabIndex = 0;
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "carousel");
    root.setAttribute("aria-label", o.label || "Card stack");
    var styleVars = {
      "--swap-w": cardWidth + "px",
      "--swap-h": cardHeight + "px",
      "--swap-ox": bounds.originX + "px",
      "--swap-oy": bounds.originY + "px",
      "--swap-stage-w": bounds.width + "px",
      "--swap-stage-h": bounds.height + "px",
      "--swap-ratio": bounds.width + " / " + bounds.height,
      "--swap-radius": Math.max(0, o.cardRadius != null ? o.cardRadius : 18) + "px"
    };
    var theme = themeVars;
    for (var tv in theme) styleVars[tv] = theme[tv];
    if (o.vars) for (var cv in o.vars) styleVars[cv] = o.vars[cv];
    for (var sv in styleVars) root.style.setProperty(sv, styleVars[sv]);

    var sizer = document.createElement("div");
    sizer.className = "card-swap-sizer";
    sizer.setAttribute("aria-hidden", "true");
    sizer.innerHTML = "<span></span>";
    root.appendChild(sizer);

    var stage = document.createElement("div");
    stage.className = "card-swap-stage";
    root.appendChild(stage);

    var slots = [];
    var shades = [];
    items.forEach(function (item, index) {
      var slot = document.createElement("div");
      slot.className = "card-swap-slot";
      slot.setAttribute("data-swap-index", String(index));

      var card = document.createElement("div");
      card.className = "card-swap-card";

      var box = document.createElement("div");
      box.className = "card-swap-item";

      var head = document.createElement("div");
      head.className = "card-swap-head";
      var title = document.createElement("span");
      title.className = "card-swap-title";
      title.textContent = item.title || "";
      head.appendChild(title);

      var media = document.createElement("div");
      media.className = "card-swap-media";
      if (item.image) {
        var img = document.createElement("img");
        img.src = item.image;
        img.alt = item.alt || item.title || "";
        img.draggable = false;
        media.appendChild(img);
      }

      box.appendChild(head);
      box.appendChild(media);
      card.appendChild(box);

      var rim = document.createElement("span");
      rim.className = "card-swap-card-rim";
      rim.setAttribute("aria-hidden", "true");
      card.appendChild(rim);

      var shade = document.createElement("span");
      shade.className = "card-swap-shade";
      shade.setAttribute("aria-hidden", "true");

      slot.appendChild(card);
      slot.appendChild(shade);
      stage.appendChild(slot);
      slots.push(slot);
      shades.push(shade);
    });

    /* ---------- Состояние и анимация ---------- */

    var count = items.length;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var now0 = performance.now();
    var s0 = settings;

    var deck = items.map(function (_, index) {
      return {
        el: slots[index],
        shade: shades[index],
        index: index,
        pos: index,
        from: index,
        hold: 0,
        nudge: 0,
        phase: "rest",
        dir: { x: 0, y: 1 },
        tilt: 0,
        top: 0,
        under: false,
        x: 0, y: 0, z: 0, r: 0, p: 0,
        v: { x: 0, y: 0, z: 0, r: 0, p: 0 }
      };
    });

    var state = {
      order: deck.map(function (card) { return card.index; }),
      raf: 0,
      last: 0,
      timer: 0,
      queue: [],
      layers: 0,
      scale: 1,
      hovered: false,
      overCard: false,
      inView: true,
      drag: null,
      spread: 0,
      spreadV: 0,
      px: 0, py: 0, pvx: 0, pvy: 0,
      tx: 0, ty: 0,
      dragged: false,
      autoplay: s0.autoplay,
      delay: s0.delay
    };

    var slotOf = function (position, s) {
      var q = Math.min(position, s.visible);
      var spread = 1 + state.spread;
      return { x: q * s.dx * spread, y: -q * s.dy * spread, z: -q * s.dz, r: 0, p: q };
    };

    var clearance = function (s, dir) {
      return Math.abs(dir.x) * s.width + Math.abs(dir.y) * s.height + 12;
    };

    var targetOf = function (card, s, time) {
      var base;
      if (card.phase === "exit") {
        base = slotOf(0, s);
        var reach = clearance(s, card.dir) * 1.3;
        return { x: base.x + card.dir.x * reach, y: base.y + card.dir.y * reach, z: base.z, r: card.tilt, p: 0 };
      }
      if (card.phase === "enter") {
        base = slotOf(0, s);
        return { x: base.x, y: base.y + clearance(s, DOWN) * 1.3, z: base.z, r: 0, p: card.p };
      }
      var position = time < card.hold ? card.from : card.pos;
      return slotOf(Math.max(0, position + card.nudge), s);
    };

    var layerOf = function (card) {
      if (card.top) return 1000 + card.top;
      if (card.under) return 1;
      return 10 + (count - card.pos) * 2;
    };

    var write = function (card, s) {
      var el = card.el, shade = card.shade;
      if (!el) return;
      el.style.transform =
        "translate3d(" + card.x.toFixed(2) + "px, " + card.y.toFixed(2) + "px, " + card.z.toFixed(2) + "px) " +
        "rotate(" + card.r.toFixed(3) + "deg) skewY(" + s.skew + "deg)";
      el.style.zIndex = String(layerOf(card));
      var fade = clamp(s.visible - card.p, 0, 1);
      el.style.opacity = fade < 1 ? fade.toFixed(3) : "";
      el.style.visibility = fade <= 0.001 ? "hidden" : "";
      if (shade) {
        var depthT = clamp(card.p / Math.max(1, s.visible - 1), 0, 1);
        shade.style.opacity = (s.dim * 0.62 * depthT).toFixed(3);
      }
      el.style.cursor = card.phase === "drag" ? "grabbing" : card.pos > 0 ? "pointer" : s.draggable ? "grab" : "";
      if (card.pos === 0) el.setAttribute("data-front", "");
      else el.removeAttribute("data-front");
    };

    var writeStage = function (s) {
      var ox = s.bounds.originX + state.px;
      var oy = s.bounds.originY + state.py;
      stage.style.perspectiveOrigin = ox.toFixed(2) + "px " + oy.toFixed(2) + "px";
    };

    var integrate = function (card, target, omega, zeta, dt) {
      var k = omega * omega;
      var d = 2 * zeta * omega;
      var steps = Math.max(1, Math.ceil(dt / STEP));
      var h = dt / steps;
      for (var i = 0; i < steps; i++) {
        for (var ai = 0; ai < AXES.length; ai++) {
          var axis = AXES[ai];
          var velocity = card.v[axis] + (k * (target[axis] - card[axis]) - d * card.v[axis]) * h;
          card.v[axis] = velocity;
          card[axis] += velocity * h;
        }
      }
    };

    var scalar = function (value, velocity, target, omega, zeta, dt) {
      var k = omega * omega;
      var d = 2 * zeta * omega;
      var steps = Math.max(1, Math.ceil(dt / STEP));
      var h = dt / steps;
      var x = value, v = velocity;
      for (var i = 0; i < steps; i++) {
        v += (k * (target - x) - d * v) * h;
        x += v * h;
      }
      return [x, v];
    };

    var frame = function (time) {
      state.raf = 0;
      var s = settings;
      var dt = state.last ? Math.min(0.05, (time - state.last) / 1000) : 1 / 60;
      state.last = time;
      var speed = s.speed;
      var restOmega = TAU * 1.7 * speed;
      var restZeta = reduce ? 1 : 1 - 0.72 * s.bounce;
      var exitOmega = TAU * 1.9 * speed;
      var busy = false;

      var spreadTarget = state.hovered && !reduce ? s.hoverSpread : 0;
      var sp = scalar(state.spread, state.spreadV, spreadTarget, TAU * 1.4, 0.9, dt);
      state.spread = sp[0]; state.spreadV = sp[1];
      var pxr = scalar(state.px, state.pvx, reduce ? 0 : state.tx, TAU * 1.1, 1, dt);
      state.px = pxr[0]; state.pvx = pxr[1];
      var pyr = scalar(state.py, state.pvy, reduce ? 0 : state.ty, TAU * 1.1, 1, dt);
      state.py = pyr[0]; state.pvy = pyr[1];
      if (
        Math.abs(state.spread - spreadTarget) > 0.0005 ||
        Math.abs(state.spreadV) > 0.0005 ||
        Math.abs(state.px - state.tx) > 0.05 ||
        Math.abs(state.py - state.ty) > 0.05 ||
        Math.abs(state.pvx) + Math.abs(state.pvy) > 0.05
      ) {
        busy = true;
      }
      writeStage(s);

      deck.forEach(function (card) {
        if (card.phase === "drag") {
          busy = true;
          write(card, s);
          return;
        }
        var target = targetOf(card, s, time);
        var moving = card.phase === "exit" || card.phase === "enter";
        integrate(card, target, moving ? exitOmega : restOmega, moving ? 1 : restZeta, dt);
        if (card.phase === "exit") {
          var base = slotOf(0, s);
          var travelled = (card.x - base.x) * card.dir.x + (card.y - base.y) * card.dir.y;
          if (travelled >= clearance(s, card.dir)) {
            card.phase = "rest";
            card.top = 0;
            card.hold = 0;
          }
        } else if (card.phase === "enter") {
          var base2 = slotOf(0, s);
          if (card.y - base2.y >= clearance(s, DOWN)) {
            card.phase = "rest";
            card.under = false;
            card.hold = 0;
          }
        }
        if (card.hold > time || card.phase !== "rest") busy = true;
        AXES.forEach(function (axis) {
          var limit = axis === "p" ? 0.001 : 0.02;
          if (Math.abs(target[axis] - card[axis]) > limit || Math.abs(card.v[axis]) > limit) busy = true;
        });
        write(card, s);
      });

      if (busy) {
        state.raf = requestAnimationFrame(frame);
      } else {
        state.last = 0;
        deck.forEach(function (card) {
          if (card.top && card.phase === "rest") card.top = 0;
        });
      }
    };

    var wake = function () {
      if (!state.raf) state.raf = requestAnimationFrame(frame);
    };

    var isPaused = function () {
      return (
        !settings.autoplay ||
        count < 2 ||
        (settings.pauseOnHover && state.overCard) ||
        !!state.drag ||
        !state.inView ||
        document.visibilityState === "hidden"
      );
    };

    var shift;
    var schedule = function () {
      clearTimeout(state.timer);
      state.timer = 0;
      if (isPaused()) return;
      state.timer = window.setTimeout(function () {
        state.timer = 0;
        shift(1);
      }, Math.max(400, settings.delay));
    };

    var settleOrder = function (time, stagger) {
      state.order.forEach(function (index, position) {
        var card = deck[index];
        if (card.pos === position) return;
        card.from = card.pos;
        card.pos = position;
        card.hold = time + Math.max(0, position) * stagger;
      });
    };

    shift = function (direction, opts) {
      opts = opts || {};
      if (count < 2) return;
      var s = settings;
      var time = performance.now();
      var stagger = 0.05 / s.speed;
      if (direction > 0) {
        var front = deck[state.order[0]];
        state.order = state.order.slice(1).concat([front.index]);
        settleOrder(time, stagger * 1000);
        front.phase = "exit";
        front.dir = opts.dir || DOWN;
        front.tilt = opts.tilt || 0;
        front.top = ++state.layers;
        front.under = false;
        front.nudge = 0;
        front.hold = 0;
        if (opts.velocity) {
          front.v.x = opts.velocity.x;
          front.v.y = opts.velocity.y;
        }
      } else {
        var back = deck[state.order[count - 1]];
        state.order = [back.index].concat(state.order.slice(0, count - 1));
        settleOrder(time, stagger * 1000);
        back.phase = "enter";
        back.top = 0;
        back.under = true;
        back.nudge = 0;
        back.hold = 0;
      }
      deck.forEach(function (card) {
        if (card.phase === "rest") card.nudge = 0;
      });
      if (s.onChange) s.onChange(state.order[0]);
      wake();
      schedule();
    };

    var goTo = function (position) {
      state.queue.forEach(clearTimeout);
      state.queue = [];
      var gap = 110 / settings.speed;
      for (var i = 0; i < position; i++) {
        state.queue.push(window.setTimeout(function () { shift(1); }, i * gap));
      }
    };

    var fit = function () {
      var s = settings;
      var w = root.clientWidth;
      var h = root.clientHeight;
      var scale = Math.min(1, w / s.bounds.width, h > 0 ? h / s.bounds.height : 1);
      state.scale = scale > 0 ? scale : 1;
      stage.style.transform = "translate(-50%, -50%) scale(" + state.scale.toFixed(4) + ")";
    };

    var local = function (event) {
      var box = root.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top, w: box.width, h: box.height };
    };

    var onMove = function (event) {
      var s = settings;
      if (event.pointerType !== "touch") {
        var point = local(event);
        var nx = clamp((point.x / Math.max(1, point.w)) * 2 - 1, -1, 1);
        var ny = clamp((point.y / Math.max(1, point.h)) * 2 - 1, -1, 1);
        state.tx = nx * s.parallax * 0.35 * s.bounds.width;
        state.ty = ny * s.parallax * 0.35 * s.bounds.height;
        state.hovered = true;
        var overCard = Boolean(event.target.closest && event.target.closest("[data-swap-index]"));
        if (overCard !== state.overCard) {
          state.overCard = overCard;
          schedule();
        }
        wake();
      }
      var drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      var dx = (event.clientX - drag.startX) / state.scale;
      var dy = (event.clientY - drag.startY) / state.scale;
      if (!drag.active) {
        if (Math.hypot(dx, dy) < 5) return;
        drag.active = true;
        state.dragged = true;
        var dragCard = deck[drag.index];
        dragCard.phase = "drag";
        dragCard.v = { x: 0, y: 0, z: 0, r: 0, p: 0 };
        if (root.setPointerCapture) root.setPointerCapture(event.pointerId);
        root.style.cursor = "grabbing";
      }
      var card = deck[drag.index];
      var base = slotOf(0, s);
      card.x = base.x + dx;
      card.y = base.y + dy;
      card.z = base.z;
      card.r = clamp(dx * 0.035, -9, 9);
      card.p = 0;
      var time = performance.now();
      drag.samples.push({ x: card.x, y: card.y, t: time });
      while (drag.samples.length > 2 && time - drag.samples[0].t > 90) drag.samples.shift();
      var progress = clamp(Math.hypot(dx, dy) / (Math.min(s.width, s.height) * 0.3), 0, 1);
      var next = deck[state.order[1]];
      if (next && next.phase === "rest") next.nudge = -0.22 * progress;
      wake();
    };

    var onLeave = function (event) {
      if (event.pointerType === "touch") return;
      if (state.drag && state.drag.active) return;
      state.hovered = false;
      state.overCard = false;
      state.tx = 0;
      state.ty = 0;
      schedule();
      wake();
    };

    var onDown = function (event) {
      var s = settings;
      state.dragged = false;
      if (!s.draggable || event.button > 0 || count < 2) return;
      var target = event.target.closest && event.target.closest("[data-swap-index]");
      if (!target || !root.contains(target)) return;
      var index = Number(target.getAttribute("data-swap-index"));
      if (index !== state.order[0] || deck[index].phase !== "rest") return;
      state.drag = {
        id: event.pointerId,
        index: index,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        samples: []
      };
      schedule();
    };

    var onUp = function (event) {
      var drag = state.drag;
      if (!drag || drag.id !== event.pointerId) return;
      state.drag = null;
      root.style.cursor = "";
      if (!drag.active) {
        schedule();
        return;
      }
      if (root.releasePointerCapture) root.releasePointerCapture(event.pointerId);
      var s = settings;
      var card = deck[drag.index];
      var base = slotOf(0, s);
      var first = drag.samples[0];
      var lastSample = drag.samples[drag.samples.length - 1];
      var span = first && lastSample ? Math.max(0.016, (lastSample.t - first.t) / 1000) : 1;
      var velocity =
        first && lastSample && lastSample !== first
          ? { x: (lastSample.x - first.x) / span, y: (lastSample.y - first.y) / span }
          : { x: 0, y: 0 };
      var offset = { x: card.x - base.x, y: card.y - base.y };
      var distance = Math.hypot(offset.x, offset.y);
      var fling = Math.hypot(velocity.x, velocity.y);
      var next = deck[state.order[1]];
      if (next) next.nudge = 0;
      if (event.type !== "pointercancel" && (distance > Math.min(s.width, s.height) * 0.3 || fling > 700)) {
        var aim = { x: offset.x + velocity.x * 0.12, y: offset.y + velocity.y * 0.12 };
        var length = Math.hypot(aim.x, aim.y) || 1;
        card.phase = "rest";
        shift(1, {
          dir: { x: aim.x / length, y: aim.y / length },
          tilt: card.r,
          velocity: velocity
        });
      } else {
        card.phase = "rest";
        card.v.x = velocity.x;
        card.v.y = velocity.y;
        wake();
        schedule();
      }
    };

    var onClick = function (event) {
      if (state.dragged) {
        state.dragged = false;
        return;
      }
      var target = event.target.closest && event.target.closest("[data-swap-index]");
      if (!target || !root.contains(target)) return;
      var index = Number(target.getAttribute("data-swap-index"));
      var position = state.order.indexOf(index);
      // колбэк только для передней карточки: клики по задним просто поднимают их вперёд
      if (position === 0 && settings.onCardClick) settings.onCardClick(index);
      if (position > 0) goTo(position);
    };

    var onVisibility = function () { schedule(); };

    var onKeyDown = function (event) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        shift(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        shift(-1);
      }
    };

    if (intro && !reduce) {
      deck.forEach(function (card) {
        card.from = 0;
        card.hold = now0 + (card.pos * 70) / s0.speed;
      });
      if (stage.animate) stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-out" });
    } else {
      deck.forEach(function (card) {
        var placed = slotOf(card.pos, s0);
        card.x = placed.x; card.y = placed.y; card.z = placed.z; card.r = placed.r; card.p = placed.p;
      });
    }
    fit();
    writeStage(s0);
    deck.forEach(function (card) { write(card, s0); });
    wake();

    var resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(root);
    var intersectionObserver = new IntersectionObserver(function (entries) {
      state.inView = entries[entries.length - 1] ? entries[entries.length - 1].isIntersecting : true;
      schedule();
    });
    intersectionObserver.observe(root);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    return {
      next: function () { shift(1); },
      prev: function () { shift(-1); },
      destroy: function () {
        if (state.raf) cancelAnimationFrame(state.raf);
        clearTimeout(state.timer);
        state.queue.forEach(clearTimeout);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onLeave);
        root.removeEventListener("pointerdown", onDown);
        root.removeEventListener("pointerup", onUp);
        root.removeEventListener("pointercancel", onUp);
        root.removeEventListener("click", onClick);
        root.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("visibilitychange", onVisibility);
        root.innerHTML = "";
        root.classList.remove("card-swap");
      }
    };
  };
})();

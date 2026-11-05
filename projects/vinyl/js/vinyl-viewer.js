/* ============================================================
   VinylViewer — 3D-осмотр пластинки из привоза.

   Порт интерактивной сцены vinyl-3d (Three.js r128, грузится
   лениво с cdnjs): конверт с настоящей обложкой, диск с репликой
   этикетки (RecordFactory), износ и канавки — шейдером.
   Конверт раскрывается: диск вытаскивается перетаскиванием
   вправо или кнопкой, крутится 33⅓, вертится мышью, зум колесом.

   Использование:
     VinylViewer.onClose = function (rec) { ... };  // после осмотра
     VinylViewer.open(record);                      // record из каталога
   ============================================================ */

(function () {
  "use strict";

  var THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  var SPIN_SPEED = 3.49; // рад/с ≈ 33⅓ об/мин
  var ease = function (v) { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };

  var els = {}, inited = false, opened = false, raf = null;
  var currentRec = null;
  var activeTextures = [];

  // сцена
  var renderer, scene, camera, rig, sleeveGroup, pivot, spinner, edgeMat, holeMesh, mats, mFrontMat, mBackMat;
  var wearTex = null;

  // прозрачная заглушка для uMarble у чёрных пластинок
  function emptyTex(T) {
    var c = document.createElement("canvas");
    c.width = c.height = 4;
    var t = new T.CanvasTexture(c);
    return t;
  }

  // состояние взаимодействия (порт)
  var AX, AY, baseQ, START_Q, userQ, tmpQ, dq, L1v, L2v;
  var t = 0, tTarget = 0, pull = 0, mode = "none", dragging = false, lx = 0, ly = 0, vx = 0, vy = 0;
  var spin = true, zoom = 1, tiltX = 0, tiltY = 0;
  var TN = null;

  /* ---------- шейдеры (порт, LR = радиус этикета) ---------- */

  var VERT = `
varying vec3 vObj; varying vec3 vWorld; varying vec3 vN; varying vec3 vTan;
void main(){
  vObj = position;
  vTan = mat3(modelMatrix) * vec3(-position.z, 0.0, position.x);
  vec4 w = modelMatrix * vec4(position,1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

  var FRAG = `
uniform sampler2D uLabel; uniform sampler2D uWear; uniform sampler2D uMarble;
uniform vec3 uBase; uniform vec3 uSpec; uniform vec3 uMarbleCol;
uniform float uFlip; uniform float uGlow; uniform float uHole; uniform float uMarbleAmt;
uniform float uLR; uniform float uLabelVinyl; uniform float uLabelEdge;
uniform vec3 uL1; uniform vec3 uL2;
varying vec3 vObj; varying vec3 vWorld; varying vec3 vN; varying vec3 vTan;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 q = vObj.xz; float r = length(q);
  if (r < uHole) discard;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vN);
  vec3 T = normalize(vTan);
  vec2 wuv = vec2(0.5 + q.x*0.5, 0.5 - q.y*0.5); wuv.x = mix(wuv.x, 1.0-wuv.x, uFlip);
  vec3 w = texture2D(uWear, wuv).rgb;
  vec3 H1 = normalize(uL1 + V);
  vec3 H2 = normalize(uL2 + V);

  // канавки начинаются от края САМОЙ этикетки — печать может вылезать дальше
  float zone = smoothstep(uLabelEdge + 0.004, uLabelEdge + 0.012, r) * (1.0 - smoothstep(0.972, 0.982, r));
  float gr = zone;
  float f = r * 620.0;
  float fade = 1.0 - smoothstep(0.35, 0.9, fwidth(f));
  float pat = mix(0.5, 0.5 + 0.5*sin(f*6.2831 + sin(f*1.7)*1.5), fade);
  float hz = 0.7 + 0.3*hash(vec2(floor(f), 1.0));
  float t1 = dot(T,H1), t2 = dot(T,H2);
  float s1 = sqrt(max(0.0, 1.0 - t1*t1)), s2 = sqrt(max(0.0, 1.0 - t2*t2));
  float k = pow(s1,110.0) + 0.7*pow(s2,110.0);
  float lit = clamp(0.35 + 0.65*max(dot(N, normalize(uL1)),0.0), 0.0, 1.0);
  vec3 col = uBase * (0.65 + 0.35*lit) * mix(1.0, 0.82 + 0.18*pat, gr);
  vec4 mb = texture2D(uMarble, wuv);
  col = mix(col, uMarbleCol, mb.a * uMarbleAmt);
  col += uBase * uGlow * (1.0 - smoothstep(0.25, 1.0, r)) * 0.55;

  // печать этикета: альфа позволяет лого вылезать за круг этикета на винил
  if (r < uLR) {
    vec2 uv = vec2(0.5 + q.x/(2.0*uLR), 0.5 - q.y/(2.0*uLR)); uv.x = mix(uv.x, 1.0-uv.x, uFlip);
    vec4 lab = texture2D(uLabel, uv);
    vec3 pr = lab.rgb;
    pr *= 0.94 + 0.08*hash(floor(q*650.0));
    pr = mix(pr, pr * (0.80 + 0.20*pat), uLabelVinyl);
    float sh = pow(max(dot(N,H1),0.0), 30.0);
    pr += 0.045*sh;
    col = mix(col, pr, lab.a);
  }

  // блик: сильнее на голом виниле, слабее на бумаге этикета
  float spec = (k*1.1*(0.55 + 0.45*pat)*hz + (pow(s1,14.0) + pow(s2,14.0))*0.03) * mix(0.35, 1.0, gr) * (1.0 - w.g*0.6);
  col += uSpec * spec;
  col += uSpec * w.r * (0.08 + 0.5*pow(max(dot(N,H1),0.0), 20.0)) + w.b*0.18;
  float sm = 1.0 - gr;
  col += sm * (pow(max(dot(N,H1),0.0), 260.0)*0.4 + 0.03*pow(1.0 - max(dot(N,V),0.0), 3.0));
  gl_FragColor = vec4(col, 1.0);
}`;

  /* ---------- износ: царапины, отпечатки, пыль (порт) ---------- */

  function drawWear() {
    var S = 1024, c = document.createElement("canvas");
    c.width = c.height = S;
    var x = c.getContext("2d");
    var R = (function (s) {
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        var t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    })(11);

    x.fillStyle = "#000"; x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = "lighter"; x.lineCap = "round";
    var pt = function () {
      var a = R() * 6.283, r = Math.sqrt(R()) * 500;
      return [512 + r * Math.cos(a), 512 + r * Math.sin(a)];
    };
    var i, px, py, a, l;
    for (i = 0; i < 110; i++) {
      var p1 = pt(); px = p1[0]; py = p1[1];
      a = R() * 6.283; l = 15 + R() * R() * 220;
      x.strokeStyle = "rgba(255,0,0," + (0.12 + R() * 0.55) + ")";
      x.lineWidth = 0.5 + R();
      x.beginPath(); x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.cos(a) * l / 2 + R() * 8 - 4, py + Math.sin(a) * l / 2 + R() * 8 - 4,
        px + Math.cos(a) * l, py + Math.sin(a) * l);
      x.stroke();
    }
    for (i = 0; i < 22; i++) {
      var rr = 170 + R() * 335; a = R() * 6.283;
      x.strokeStyle = "rgba(255,0,0," + (0.12 + R() * 0.35) + ")";
      x.lineWidth = 0.6 + R() * 0.8;
      x.beginPath(); x.arc(512, 512, rr, a, a + 0.05 + R() * 0.6); x.stroke();
    }
    for (i = 0; i < 9; i++) {
      var p2 = pt(); px = p2[0]; py = p2[1];
      var rad = 40 + R() * 90;
      var g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, "rgba(0,255,0,0.35)"); g.addColorStop(1, "rgba(0,255,0,0)");
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill();
    }
    for (i = 0; i < 320; i++) {
      var p3 = pt();
      x.fillStyle = "rgba(0,0,255," + (0.25 + R() * 0.6) + ")";
      x.beginPath(); x.arc(p3[0], p3[1], 0.5 + R() * 1.4, 0, 6.283); x.fill();
    }
    return c;
  }

  /* ---------- ленивая загрузка Three ---------- */

  function loadThree() {
    if (window.THREE) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = THREE_URL;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("three.js не загрузился")); };
      document.head.appendChild(s);
    });
  }

  /* ---------- построение сцены (однократно) ---------- */

  function initScene() {
    if (inited) return;
    var T = window.THREE;

    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    els.stage.appendChild(renderer.domElement);

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 1, 0.1, 50);
    scene.add(new T.AmbientLight(0xffffff, 0.9));
    var dl = new T.DirectionalLight(0xffffff, 0.8);
    dl.position.set(-0.7, 0.55, 0.9);
    scene.add(dl);

    L1v = new T.Vector3(-0.7, 0.55, 0.45).normalize();
    L2v = new T.Vector3(0.6, 0.4, -0.7).normalize();

    wearTex = new T.CanvasTexture(drawWear());
    wearTex.anisotropy = 8;

    mats = [0, 1].map(function (flip) {
      return new T.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG,
        extensions: { derivatives: true },
        uniforms: {
          uLabel: { value: new T.Texture() },
          uWear: { value: wearTex },
          uMarble: { value: emptyTex(T) },
          uMarbleCol: { value: new T.Color("#101014") },
          uBase: { value: new T.Color(0.016, 0.016, 0.02) },
          uSpec: { value: new T.Color(1, 1, 1) },
          uFlip: { value: flip },
          uGlow: { value: 0 },
          uHole: { value: 0.043 },
          uMarbleAmt: { value: 1 },
          uLR: { value: 0.36 },
          uLabelVinyl: { value: 0 },
          uLabelEdge: { value: 0.36 },
          uL1: { value: L1v },
          uL2: { value: L2v }
        }
      });
    });

    rig = new T.Group(); scene.add(rig);

    // конверт
    var SW = 2.08, PZ = 0.03;
    sleeveGroup = new T.Group(); rig.add(sleeveGroup);
    var dark = new T.MeshStandardMaterial({ color: 0x020203, roughness: 0.85 });
    mFrontMat = new T.MeshStandardMaterial({ color: 0x111318, roughness: 0.72 });
    mBackMat = new T.MeshStandardMaterial({ color: 0x111318, roughness: 0.72 });
    var pF = new T.Mesh(new T.BoxGeometry(SW, SW, 0.006), [dark, dark, dark, dark, mFrontMat, dark]);
    pF.position.z = PZ;
    var pB = new T.Mesh(new T.BoxGeometry(SW, SW, 0.006), [dark, dark, dark, dark, dark, mBackMat]);
    pB.position.z = -PZ;
    var sL = new T.Mesh(new T.BoxGeometry(0.012, SW, PZ * 2 + 0.012), dark); sL.position.x = -SW / 2 + 0.006;
    var sT = new T.Mesh(new T.BoxGeometry(SW, 0.012, PZ * 2 + 0.012), dark); sT.position.y = SW / 2 - 0.006;
    var sB = new T.Mesh(new T.BoxGeometry(SW, 0.012, PZ * 2 + 0.012), dark); sB.position.y = -SW / 2 + 0.006;
    sleeveGroup.add(pF, pB, sL, sT, sB);

    // диск
    var TH = 0.03;
    pivot = new T.Group(); spinner = new T.Group(); pivot.add(spinner); rig.add(pivot);
    var gTop = new T.CircleGeometry(1, 192); gTop.rotateX(-Math.PI / 2); gTop.translate(0, TH / 2, 0);
    var gBot = new T.CircleGeometry(1, 192); gBot.rotateX(Math.PI / 2); gBot.translate(0, -TH / 2, 0);
    edgeMat = new T.MeshStandardMaterial({ color: 0x010101, roughness: 0.9, metalness: 0 });
    holeMesh = new T.Mesh(
      new T.CylinderGeometry(0.043, 0.043, TH, 48, 1, true),
      new T.MeshStandardMaterial({ color: 0x050505, roughness: 0.8, side: T.DoubleSide })
    );
    spinner.add(
      new T.Mesh(gTop, mats[0]),
      new T.Mesh(gBot, mats[1]),
      new T.Mesh(new T.CylinderGeometry(1, 1, TH, 192, 1, true), edgeMat),
      holeMesh
    );

    // состояние
    AX = new T.Vector3(1, 0, 0); AY = new T.Vector3(0, 1, 0);
    baseQ = new T.Quaternion().setFromAxisAngle(AX, Math.PI / 2);
    START_Q = new T.Quaternion().setFromEuler(new T.Euler(-0.3, 0.5, 0));
    userQ = START_Q.clone(); tmpQ = new T.Quaternion(); dq = new T.Quaternion();
    TN = Math.tan(16 * Math.PI / 180);

    // события
    var cv = renderer.domElement;
    cv.addEventListener("pointerdown", function (e) {
      dragging = true; lx = e.clientX; ly = e.clientY; vx = vy = 0;
      cv.setPointerCapture(e.pointerId); cv.classList.add("drag");
      mode = t >= 0.999 ? "rot" : (t <= 0.5 && tTarget <= 0.5 ? "pull" : "none");
      if (mode === "pull") pull = t;
    });
    cv.addEventListener("pointermove", function (e) {
      var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      if (dragging) {
        if (mode === "rot") {
          vx = dx * 0.008; vy = dy * 0.008;
          userQ.premultiply(dq.setFromAxisAngle(AY, vx));
          userQ.premultiply(dq.setFromAxisAngle(AX, vy));
        } else if (mode === "pull") {
          pull = Math.min(0.5, Math.max(0, pull + dx / (els.stage.clientWidth * 0.22)));
          t = tTarget = pull;
        }
      } else if (t < 0.999) {
        tiltY = (e.clientX / window.innerWidth - 0.5) * 0.5;
        tiltX = (e.clientY / window.innerHeight - 0.5) * 0.25;
      }
    });
    var endDrag = function () {
      if (dragging && mode === "pull") tTarget = pull > 0.2 ? 1 : 0;
      dragging = false; cv.classList.remove("drag");
    };
    cv.addEventListener("pointerup", endDrag);
    cv.addEventListener("pointercancel", endDrag);
    cv.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoom = Math.min(2.2, Math.max(0.5, zoom * (1 + e.deltaY * 0.001)));
    }, { passive: false });

    window.addEventListener("resize", resize);
    inited = true;
  }

  /* ---------- текстуры релиза ---------- */

  function trackTextures(list) {
    list.forEach(function (t) { if (t && t.dispose) t.dispose(); });
    activeTextures = [];
  }

  function setRecord(rec) {
    var T = window.THREE;
    trackTextures(activeTextures);

    // ВИНИЛ: цвет, мрамор, свечение, отверстие — свой у каждого релиза
    var look = (window.RecordFactory ? window.RecordFactory.vinyl(rec.key) : null) || {};
    mats.forEach(function (m) {
      m.uniforms.uBase.value.set(look.base || "#0b0b0e");
      m.uniforms.uGlow.value = look.glow || 0;
      m.uniforms.uHole.value = look.hole || 0.043;
      m.uniforms.uMarbleAmt.value = look.marble ? 1 : 0;
      m.uniforms.uLR.value = look.bleed || look.labelR || 0.36;
      m.uniforms.uLabelEdge.value = look.labelR || look.bleed || 0.36;
      m.uniforms.uLabelVinyl.value = look.labelVinyl || 0;
    });
    if (look.marble) {
      var mt = new T.CanvasTexture(look.marble);
      mt.anisotropy = 8;
      activeTextures.push(mt);
      mats.forEach(function (m) {
        m.uniforms.uMarble.value = mt;
        m.uniforms.uMarbleCol.value.set(look.marble._rgb || "#101014");
      });
    } else {
      mats.forEach(function (m) { m.uniforms.uMarble.value = emptyTex(T); });
    }
    var holeK = (look.hole || 0.043) / 0.043;
    holeMesh.scale.set(holeK, 1, holeK);
    edgeMat.color.set(look.edge || "#010101");

    // этикетка — реплика из фабрики
    var labC = window.RecordFactory ? window.RecordFactory.label(rec.key) : null;
    var labTex = new T.CanvasTexture(labC || new T.Texture());
    labTex.anisotropy = 8;
    activeTextures.push(labTex);
    mats.forEach(function (m) { m.uniforms.uLabel.value = labTex; });

    // конверт: лицо — реальное фото, оборот — рисованный
    var backC = window.RecordFactory ? window.RecordFactory.sleeveBack(rec.key) : null;
    var backTex = new T.CanvasTexture(backC || new T.Texture());
    backTex.anisotropy = 8;
    mBackMat.map = backTex;
    mBackMat.color.set(0xffffff);
    mBackMat.needsUpdate = true;
    activeTextures.push(backTex);

    return (window.RecordFactory ? window.RecordFactory.sleeveImage(rec) : Promise.resolve(null))
      .then(function (im) {
        if (im) {
          var ft = (typeof HTMLCanvasElement !== "undefined" && im instanceof HTMLCanvasElement)
            ? new T.CanvasTexture(im)
            : new T.Texture(im);
          ft.encoding = T.sRGBEncoding;
          ft.anisotropy = 8;
          ft.needsUpdate = true;
          mFrontMat.map = ft;
          mFrontMat.color.set(0xffffff);
          mFrontMat.needsUpdate = true;
          activeTextures.push(ft);
        }
      });
  }

  function resetState() {
    t = 0; tTarget = 0; pull = 0; mode = "none"; vx = vy = 0; zoom = 1; tiltX = tiltY = 0;
    if (userQ) userQ.copy(START_Q);
    spin = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    els.spin.classList.toggle("is-on", spin);
  }

  /* ---------- кадр (порт) ---------- */

  function tick(now) {
    raf = null;
    if (!opened) return;
    var dt = Math.min((now - (tick.last || now)) / 1000, 0.05);
    tick.last = now;

    if (!(dragging && mode === "pull")) {
      var d = tTarget - t, step = dt * 0.95;
      t += Math.abs(d) <= step ? d : Math.sign(d) * step;
    }
    var s1 = ease(t / 0.5), s2 = ease((t - 0.5) / 0.5);
    var sx = -0.35 + (-4.2 + 0.35) * s2;
    sleeveGroup.position.x = sx;
    pivot.position.x = (-0.35 + 0.40 + (2.25 - 0.40) * s1) * (1 - s2);

    if (t >= 0.999) {
      if (!dragging) {
        userQ.premultiply(dq.setFromAxisAngle(AY, vx));
        userQ.premultiply(dq.setFromAxisAngle(AX, vy));
        vx *= 0.94; vy *= 0.94;
      }
      if (spin) spinner.rotation.y -= SPIN_SPEED * dt;
    }
    tmpQ.identity().slerp(userQ, s2);
    pivot.quaternion.copy(tmpQ).multiply(baseQ);
    rig.rotation.y += (tiltY * (1 - s2) - rig.rotation.y) * 0.08;
    rig.rotation.x += (tiltX * (1 - s2) - rig.rotation.x) * 0.08;

    var SW = 2.08;
    var minX = (sx - SW / 2) * (1 - s2) + (pivot.position.x - 1) * s2;
    var maxX = pivot.position.x + 1;
    var cx = (minX + maxX) / 2;
    var halfW = (maxX - minX) / 2 * 1.1 + 0.05;
    var halfH = 1.28;
    var dist = Math.max(halfH / TN, halfW / (TN * camera.aspect)) * zoom;
    camera.position.set(cx, -0.12, dist);
    camera.lookAt(cx, -0.12, 0);

    els.pull.textContent = tTarget > 0.5 ? "Убрать в конверт" : "Достать диск";
    els.hint.textContent = t >= 0.999
      ? "Тяни, чтобы вращать · колесо — приблизить"
      : "Потяни диск вправо или нажми «Достать диск»";

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function resize() {
    if (!renderer) return;
    var w = els.stage.clientWidth, h = els.stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- публичный API ---------- */

  function open(rec) {
    if (!rec) return;
    currentRec = rec;
    els.viewer.hidden = false;
    document.body.classList.add("vv-lock");
    els.loading.hidden = false;
    els.loading.textContent = "Достаём пластинку с полки…";
    opened = true;
    tick.last = 0;

    loadThree()
      .then(function () {
        initScene();
        resetState();
        resize();
        return setRecord(rec);
      })
      .then(function () {
        els.loading.hidden = true;
        if (!raf) raf = requestAnimationFrame(tick);
      })
      .catch(function () {
        els.loading.textContent = "Не удалось загрузить 3D-движок — проверь сеть и обнови страницу.";
      });
  }

  function close() {
    if (!opened) return;
    opened = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    els.viewer.hidden = true;
    document.body.classList.remove("vv-lock");
    if (VinylViewer.onClose && currentRec) VinylViewer.onClose(currentRec);
  }

  var VinylViewer = {
    onClose: null,
    open: open,
    close: close
  };

  /* ---------- DOM ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    els.viewer = document.getElementById("vinyl-viewer");
    if (!els.viewer) return;
    els.stage = document.getElementById("vv-stage");
    els.hint = document.getElementById("vv-hint");
    els.loading = document.getElementById("vv-loading");
    els.pull = document.getElementById("vv-pull");
    els.spin = document.getElementById("vv-spin");
    els.reset = document.getElementById("vv-reset");
    els.close = document.getElementById("vv-close");

    els.pull.addEventListener("click", function () { tTarget = tTarget > 0.5 ? 0 : 1; });
    els.spin.addEventListener("click", function () {
      spin = !spin;
      els.spin.classList.toggle("is-on", spin);
    });
    els.reset.addEventListener("click", function () {
      userQ.copy(START_Q); vx = vy = 0; zoom = 1;
    });
    els.close.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && opened) close();
    });
  });

  window.VinylViewer = VinylViewer;
})();

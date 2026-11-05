/* ============================================================
   Iridescence — живой голографический фон (WebGL).
   Порт React-компонента Iridescence (reactbits.dev) на ванильный JS.

   Использование:
     var stop = Iridescence(canvasElement, {
       colors: ["#6fe7dd", "#a78bfa", "#f49ac1"],
       speed: 0.5, amplitude: 1.1
     });
   Возвращает функцию остановки. Анимация ставится на паузу,
   когда канвас вне экрана или вкладка скрыта.
   ============================================================ */

(function () {
  "use strict";

  var VERT = [
    "attribute vec2 aPos;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform vec2  uResolution;",
    "uniform float uTime;",
    "uniform vec3  uColorA;",
    "uniform vec3  uColorB;",
    "uniform vec3  uColorC;",
    "uniform vec2  uMouse;",
    "uniform float uSpeed;",
    "uniform float uAmplitude;",

    // simplex noise 2D (Ashima)
    "vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }",
    "float snoise(vec2 v){",
    "  const vec4 C = vec4(0.211324865405187, 0.366025403784439,",
    "                     -0.577350269189626, 0.024390243902439);",
    "  vec2 i  = floor(v + dot(v, C.yy));",
    "  vec2 x0 = v - i + dot(i, C.xx);",
    "  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);",
    "  vec4 x12 = x0.xyxy + C.xxzz;",
    "  x12.xy -= i1;",
    "  i = mod(i, 289.0);",
    "  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))",
    "        + i.x + vec3(0.0, i1.x, 1.0));",
    "  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),",
    "        dot(x12.zw,x12.zw)), 0.0);",
    "  m = m*m; m = m*m;",
    "  vec3 x = 2.0 * fract(p * C.www) - 1.0;",
    "  vec3 h = abs(x) - 0.5;",
    "  vec3 ox = floor(x + 0.5);",
    "  vec3 a0 = x - ox;",
    "  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);",
    "  vec3 g;",
    "  g.x  = a0.x  * x0.x  + h.x  * x0.y;",
    "  g.yz = a0.yz * x12.xz + h.yz * x12.yw;",
    "  return 130.0 * dot(m, g);",
    "}",

    "void main() {",
    "  vec2 uv = vUv;",
    "  vec2 px = uv * uResolution;",
    "  float t = uTime * uSpeed;",
    "  vec2 par = (uMouse - 0.5) * 0.22;",

    // фбм из четырёх октав — те самые медленные переливы
    "  float n = 0.0;",
    "  float amp = uAmplitude;",
    "  vec2 q = uv * 1.7 + par;",
    "  for (int i = 0; i < 4; i++) {",
    "    n += snoise(q + t * (0.05 + 0.028 * float(i))) * amp;",
    "    q = q * 2.03 + vec2(11.3, 7.7);",
    "    amp *= 0.55;",
    "  }",
    "  float f = clamp(n * 0.5 + 0.5, 0.0, 1.0);",

    // база — чернильная, поверх — голографические полосы
    // (аква занимает нижнюю половину диапазона, фиолетовый реже)
    "  vec3 base = vec3(0.043, 0.051, 0.071);",
    "  vec3 tint = mix(uColorA, uColorB, smoothstep(0.42, 0.78, f));",
    "  tint = mix(tint, uColorC, smoothstep(0.78, 0.98, f));",
    "  float glow = smoothstep(0.26, 0.92, f);",
    "  vec3 col = base + tint * glow * 0.48;",

    // виниловые дорожки — едва заметные концентрические кольца
    "  vec2 center = uResolution * vec2(0.74, 0.38);",
    "  float d = distance(px, center);",
    "  float grooves = sin(d * 0.11 - t * 1.6) * 0.5 + 0.5;",
    "  col += vec3(0.028) * grooves * smoothstep(0.9, 0.15, f);",

    // виньетка
    "  float vig = smoothstep(1.25, 0.30, distance(uv, vec2(0.5, 0.46)));",
    "  col *= mix(0.5, 1.0, vig);",

    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function Iridescence(canvas, opts) {
    opts = opts || {};
    var colors = (opts.colors || ["#6fe7dd", "#a78bfa", "#f49ac1"]).map(hexToRgb);
    var speed = opts.speed != null ? opts.speed : 0.5;
    var amplitude = opts.amplitude != null ? opts.amplitude : 1.1;
    var DPR_CAP = 1.5;

    var gl = canvas.getContext("webgl", { antialias: false, alpha: false }) ||
             canvas.getContext("experimental-webgl", { antialias: false, alpha: false });
    if (!gl) {
      canvas.style.background = "linear-gradient(135deg, #10131b 0%, #1c2233 45%, #2a2340 100%)";
      return function () {};
    }

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error("Shader: " + gl.getShaderInfoLog(sh));
      }
      return sh;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.style.background = "linear-gradient(135deg, #10131b, #2a2340)";
      return function () {};
    }
    gl.useProgram(prog);

    // большой треугольник на весь экран
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ["uResolution", "uTime", "uColorA", "uColorB", "uColorC", "uMouse", "uSpeed", "uAmplitude"]
      .forEach(function (name) { U[name] = gl.getUniformLocation(prog, name); });

    gl.uniform3fv(U.uColorA, colors[0]);
    gl.uniform3fv(U.uColorB, colors[1]);
    gl.uniform3fv(U.uColorC, colors[2]);
    gl.uniform1f(U.uSpeed, speed);
    gl.uniform1f(U.uAmplitude, amplitude);
    gl.uniform2f(U.uMouse, 0.5, 0.5);

    var raf = null, running = false, onScreen = true, t0 = performance.now(), acc = 0, last = t0;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(U.uResolution, w, h);
      }
    }

    function frame(now) {
      raf = null;
      if (!running) return;
      var dt = now - last;
      last = now;
      if (onScreen && !document.hidden) acc += dt;
      resize();
      gl.uniform1f(U.uTime, acc / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      running = false;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    // пауза вне экрана
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
      }).observe(canvas);
    }

    // лёгкий параллакс за курсором
    var host = canvas.parentElement || document.body;
    host.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      gl.uniform2f(
        U.uMouse,
        (e.clientX - r.left) / Math.max(1, r.width),
        1 - (e.clientY - r.top) / Math.max(1, r.height)
      );
    }, { passive: true });

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else play();
    });

    resize();
    play();

    return function stop() {
      pause();
      window.removeEventListener("resize", resize);
    };
  }

  window.Iridescence = Iridescence;
})();

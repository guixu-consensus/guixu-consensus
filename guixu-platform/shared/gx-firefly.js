/* 归墟客户端 · 背景动态特效（游走萤火）v1 · 2026-10-31
   纯装饰层：canvas 覆盖客户端窗口，pointer-events:none，不拦截任何交互。
   特性：5 只萤火亮点平滑游走 + 呼吸式明灭 + 光尾拖曳 + 极淡星云缓慢流动。
   尊重 prefers-reduced-motion；页面不可见时自动暂停，降低 CPU / 电量消耗。 */
(function () {
  'use strict';

  var cv = document.getElementById('gxFirefly');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var host = cv.parentElement;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var DPR = 1, W = 0, H = 0, time = 0, last = 0, raf = 0, running = false;
  var COUNT = 5;
  var flies = [];
  var auras = [];

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    var hues = [190, 200, 208, 178, 216];
    flies = [];
    for (var i = 0; i < COUNT; i++) {
      flies.push({
        x: rand(W * 0.12, W * 0.88),
        y: rand(H * 0.18, H * 0.88),
        vx: rand(-10, 10),
        vy: rand(-10, 10),
        r: rand(1.5, 2.5),
        hue: hues[i % hues.length],
        spd: rand(0.55, 1.05),
        a1: Math.random() * 6.2832,
        a2: Math.random() * 6.2832,
        ph: Math.random() * 6.2832,
        trail: []
      });
    }
    auras = [];
    var ah = [200, 214, 182];
    for (var j = 0; j < 3; j++) {
      auras.push({
        x: rand(0.18, 0.82),
        y: rand(0.2, 0.8),
        r: rand(0.34, 0.58),
        hue: ah[j],
        a1: Math.random() * 6.2832,
        a2: Math.random() * 6.2832,
        spd: rand(0.4, 0.8)
      });
    }
  }

  function size() {
    if (!host) return;
    var rect = host.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
    if (reduced) renderStatic();
  }

  /* ---------- 星云：极淡的大面积光晕，缓慢漂移，给背景一层"活"的底 ---------- */
  function drawAuras() {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < auras.length; i++) {
      var a = auras[i];
      var cx = (a.x + Math.sin(time * 0.00007 * a.spd + a.a1) * 0.07) * W;
      var cy = (a.y + Math.cos(time * 0.00006 * a.spd + a.a2) * 0.06) * H;
      var rr = a.r * Math.max(W, H);
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, 'hsla(' + a.hue + ',88%,58%,0.055)');
      g.addColorStop(0.55, 'hsla(' + a.hue + ',88%,52%,0.022)');
      g.addColorStop(1, 'hsla(' + a.hue + ',88%,50%,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, 6.2832);
      ctx.fill();
    }
  }

  /* ---------- 萤火：正弦叠加的自然游走 + 呼吸明灭 + 拖尾 ---------- */
  function stepFly(f, dt) {
    var t = time * 0.00016 * f.spd;
    var ax = Math.sin(t * 1.7 + f.a1) * 11 + Math.sin(t * 0.63 + f.a2) * 7;
    var ay = Math.cos(t * 1.35 + f.a2) * 10 + Math.cos(t * 0.87 + f.a1) * 6;
    var k = Math.min(1, dt * 1.8);
    f.vx += (ax - f.vx) * k;
    f.vy += (ay - f.vy) * k;

    var pad = 34;
    if (f.x < pad) f.vx += (pad - f.x) * 7 * dt;
    if (f.x > W - pad) f.vx -= (f.x - (W - pad)) * 7 * dt;
    if (f.y < pad) f.vy += (pad - f.y) * 7 * dt;
    if (f.y > H - pad) f.vy -= (f.y - (H - pad)) * 7 * dt;

    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    var max = 30;
    if (sp > max) { f.vx = f.vx / sp * max; f.vy = f.vy / sp * max; }

    f.x += f.vx * dt;
    f.y += f.vy * dt;

    f.trail.push([f.x, f.y]);
    if (f.trail.length > 24) f.trail.shift();
  }

  function drawFly(f) {
    var flick = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.0017 * f.spd + f.ph));
    var i, p, pn, alpha;

    /* 光尾：越靠尾部越透明 */
    if (f.trail.length > 2) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (i = 1; i < f.trail.length; i++) {
        p = f.trail[i - 1];
        pn = f.trail[i];
        alpha = (i / f.trail.length) * 0.30 * flick;
        if (alpha <= 0.002) continue;
        ctx.strokeStyle = 'hsla(' + f.hue + ',100%,82%,' + alpha + ')';
        ctx.lineWidth = f.r * (0.35 + 0.55 * (i / f.trail.length));
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(pn[0], pn[1]);
        ctx.stroke();
      }
    }

    /* 外发光 */
    var rr = f.r * 15;
    var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr);
    g.addColorStop(0, 'hsla(' + f.hue + ',100%,92%,' + (0.55 * flick) + ')');
    g.addColorStop(0.28, 'hsla(' + f.hue + ',100%,76%,' + (0.20 * flick) + ')');
    g.addColorStop(0.62, 'hsla(' + f.hue + ',100%,70%,' + (0.06 * flick) + ')');
    g.addColorStop(1, 'hsla(' + f.hue + ',100%,70%,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, rr, 0, 6.2832);
    ctx.fill();

    /* 芯点 */
    ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * flick) + ')';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * 0.62, 0, 6.2832);
    ctx.fill();
  }

  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time = now;

    ctx.clearRect(0, 0, W, H);
    drawAuras();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) {
      stepFly(flies[i], dt);
      drawFly(flies[i]);
    }
    ctx.globalCompositeOperation = 'source-over';
    raf = window.requestAnimationFrame(frame);
  }

  /* 减少动态效果偏好：只画静态萤火，不做动画 */
  function renderStatic() {
    time = 6000;
    ctx.clearRect(0, 0, W, H);
    drawAuras();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) {
      flies[i].trail = [];
      drawFly(flies[i]);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function start() {
    if (reduced || running || document.hidden) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  }

  var rt = 0;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var wasRunning = running;
      stop();
      size();
      if (wasRunning) start();
    }, 180);
  }

  if (window.ResizeObserver) {
    new window.ResizeObserver(onResize).observe(host);
  } else {
    window.addEventListener('resize', onResize);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else start();
  });

  size();
  if (reduced) renderStatic();
  else start();
})();

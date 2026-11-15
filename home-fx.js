/* 归墟共识官网 · Hero 动态背景 v1 · 2026-10-31
   1) 会变动的网状背景：两层正弦波网格，节点连线 + 高光节点，随鼠标轻微视差
   2) 游走萤火：5 个青蓝亮点平滑游走、呼吸明灭、带光尾
   纯装饰层：pointer-events:none，不拦截导航与按钮；英雄区不可见 / 页面隐藏时暂停。
   尊重 prefers-reduced-motion。 */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var style = document.createElement('style');
  style.textContent =
    '#gxHeroMesh,#gxHeroFire{position:absolute;inset:0;display:block;width:100%;height:100%;' +
    'pointer-events:none;user-select:none;-webkit-user-select:none;z-index:0}' +
    '#gxHeroFire{mix-blend-mode:screen}' +
    '.hero-content{position:relative;z-index:1}';
  document.head.appendChild(style);

  var mesh = document.createElement('canvas');
  mesh.id = 'gxHeroMesh';
  mesh.setAttribute('aria-hidden', 'true');
  var fire = document.createElement('canvas');
  fire.id = 'gxHeroFire';
  fire.setAttribute('aria-hidden', 'true');
  hero.insertBefore(mesh, hero.firstChild);
  hero.insertBefore(fire, mesh.nextSibling);

  var mctx = mesh.getContext('2d');
  var fctx = fire.getContext('2d');
  if (!mctx || !fctx) return;

  var W = 0, H = 0, DPR = 1;
  var time = 0, last = 0, raf = 0, running = false, visible = true;

  /* 鼠标 / 触摸视差目标值与缓动值 */
  var tx = 0, ty = 0, px = 0, py = 0;

  var flies = [];
  var COLS = 0, ROWS = 0, AMP = 60;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function layout() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    mesh.width = Math.round(W * DPR);
    mesh.height = Math.round(H * DPR);
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    fire.width = Math.round(W * DPR);
    fire.height = Math.round(H * DPR);
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    /* 网格按"近似正方形格距"计算行列：手机端高而窄时不会把格子拉长，
       避免出现纵向拉伸、网线变形的观感。 */
    var S = Math.max(38, Math.min(58, Math.min(W, H) / 11));
    COLS = Math.max(6, Math.round(W / S) + 1);
    ROWS = Math.max(5, Math.round(H / S) + 1);
    while (COLS * ROWS > 560) {
      S *= 1.12;
      COLS = Math.max(6, Math.round(W / S) + 1);
      ROWS = Math.max(5, Math.round(H / S) + 1);
    }

    /* 波幅按短边计算并受格距约束：窄屏不会被 H 放大出夸张的纵向起伏 */
    AMP = Math.min(Math.min(W, H) * 0.09, S * 1.5);

    buildFlies();
    if (reduced) drawStatic();
  }

  function buildFlies() {
    var hues = [190, 200, 208, 178, 214];
    flies = [];
    for (var i = 0; i < 5; i++) {
      flies.push({
        x: rand(W * 0.1, W * 0.9),
        y: rand(H * 0.15, H * 0.9),
        vx: rand(-10, 10), vy: rand(-10, 10),
        r: rand(1.5, 2.5),
        hue: hues[i],
        spd: rand(0.55, 1.05),
        a1: Math.random() * 6.2832,
        a2: Math.random() * 6.2832,
        ph: Math.random() * 6.2832,
        trail: []
      });
    }
  }

  /* ---------------- 网状背景 ---------------- */
  function drawMesh() {
    mctx.clearRect(0, 0, W, H);
    var h = (time / 1000) * 0.55;
    var sheet, row, col, u, z, pts, lineTo, i, j, p, q, c;

    for (sheet = 0; sheet < 2; sheet++) {
      pts = [];
      for (row = 0; row < ROWS; row++) {
        var line = [];
        for (col = 0; col < COLS; col++) {
          u = col / (COLS - 1);
          z = row / (ROWS - 1);
          line.push({
            x: (sheet === 0 ? -0.14 + u * 0.66 : 0.52 + u * 0.60) * W + px * (0.35 + z * 0.65),
            y: H * (0.26 + z * 0.56)
              + Math.sin(u * 5 + h * 0.6 + sheet * 2) * AMP
              + Math.sin(u * 9 + h * 0.9) * Math.cos(z * 3 + h * 0.35) * AMP * 0.45
              + Math.sin(z * 6 + h * 0.5) * AMP * 0.2
              + py * (0.35 + z * 0.65),
            a: 0.10 + Math.pow(Math.max(0, Math.sin(u * 8 - h * 1.4 + z * 2)), 8) * 0.42
          });
        }
        pts.push(line);
      }

      var rgb = sheet === 0 ? '163,191,250' : '127,211,232';
      mctx.lineWidth = 0.7;
      for (row = 0; row < ROWS; row++) {
        for (col = 0; col < COLS; col++) {
          p = pts[row][col];
          mctx.strokeStyle = 'rgba(' + rgb + ',' + (p.a * 0.30).toFixed(3) + ')';
          q = pts[row][col + 1];
          if (q) { mctx.beginPath(); mctx.moveTo(p.x, p.y); mctx.lineTo(q.x, q.y); mctx.stroke(); }
          q = pts[row + 1] ? pts[row + 1][col] : null;
          if (q) { mctx.beginPath(); mctx.moveTo(p.x, p.y); mctx.lineTo(q.x, q.y); mctx.stroke(); }
          mctx.fillStyle = 'rgba(' + rgb + ',' + p.a.toFixed(3) + ')';
          mctx.beginPath();
          mctx.arc(p.x, p.y, p.a > 0.45 ? 1.8 : 1.0, 0, 6.2832);
          mctx.fill();
        }
      }
    }
  }

  /* ---------------- 萤火 ---------------- */
  function drawFly(f, dt) {
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
    if (sp > 30) { f.vx = f.vx / sp * 30; f.vy = f.vy / sp * 30; }

    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.trail.push([f.x, f.y]);
    if (f.trail.length > 22) f.trail.shift();

    var flick = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.0017 * f.spd + f.ph));
    var i, p, pn, alpha;

    fctx.lineCap = 'round';
    fctx.lineJoin = 'round';
    for (i = 1; i < f.trail.length; i++) {
      p = f.trail[i - 1];
      pn = f.trail[i];
      alpha = (i / f.trail.length) * 0.28 * flick;
      fctx.strokeStyle = 'hsla(' + f.hue + ',100%,84%,' + alpha.toFixed(3) + ')';
      fctx.lineWidth = f.r * (0.35 + 0.55 * (i / f.trail.length));
      fctx.beginPath();
      fctx.moveTo(p[0], p[1]);
      fctx.lineTo(pn[0], pn[1]);
      fctx.stroke();
    }

    var rr = f.r * 15;
    var g = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr);
    g.addColorStop(0, 'hsla(' + f.hue + ',100%,92%,' + (0.55 * flick) + ')');
    g.addColorStop(0.28, 'hsla(' + f.hue + ',100%,76%,' + (0.20 * flick) + ')');
    g.addColorStop(0.62, 'hsla(' + f.hue + ',100%,70%,' + (0.06 * flick) + ')');
    g.addColorStop(1, 'hsla(' + f.hue + ',100%,70%,0)');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(f.x, f.y, rr, 0, 6.2832);
    fctx.fill();

    fctx.fillStyle = 'rgba(255,255,255,' + (0.9 * flick) + ')';
    fctx.beginPath();
    fctx.arc(f.x, f.y, f.r * 0.62, 0, 6.2832);
    fctx.fill();
  }

  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time = now;

    /* 视差缓动 */
    px += (tx - px) * 0.045;
    py += (ty - py) * 0.045;

    drawMesh();

    fctx.clearRect(0, 0, W, H);
    fctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) drawFly(flies[i], dt);
    fctx.globalCompositeOperation = 'source-over';

    raf = window.requestAnimationFrame(frame);
  }

  function drawStatic() {
    time = 6000;
    drawMesh();
    fctx.clearRect(0, 0, W, H);
    fctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < flies.length; i++) { flies[i].trail = []; drawFly(flies[i], 0); }
    fctx.globalCompositeOperation = 'source-over';
  }

  function start() {
    if (reduced || running || document.hidden || !visible) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
  }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 26;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 20;
  }, { passive: true });

  var rt = 0;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var was = running;
      stop();
      layout();
      if (was) start();
    }, 180);
  }
  window.addEventListener('resize', onResize);

  if (window.ResizeObserver) new window.ResizeObserver(onResize).observe(hero);

  if (window.IntersectionObserver) {
    new window.IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.02 }).observe(hero);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  layout();
  if (!reduced) start();
})();

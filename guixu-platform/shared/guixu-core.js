/* ============================================================
   Guixu Consensus Platform :: core runtime
   数据访问层 + 通用工具 + 点阵世界地图渲染 + 轻量图表
   依赖: shared/world-dots.js, shared/mock-data.js
   ============================================================ */

(function () {
  'use strict';
  var GX = window.GX = window.GX || {};

  /* =============== 1. 基础工具 =============== */
  GX.qs = function (s, r) { return (r || document).querySelector(s); };
  GX.qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  GX.on = function (el, ev, fn) { el && el.addEventListener(ev, fn); };

  GX.num = function (n, d) {
    if (n === null || n === undefined || isNaN(n)) return '--';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };

  /** 容量：GB 输入，自动升级单位 */
  GX.cap = function (gb) {
    if (gb >= 1024 * 1024) return (gb / 1024 / 1024).toFixed(2) + ' PB';
    if (gb >= 1024) return (gb / 1024).toFixed(1) + ' TB';
    return Math.round(gb) + ' GB';
  };
  /** TB 输入 */
  GX.capTB = function (tb) {
    if (tb >= 1024) return (tb / 1024).toFixed(2) + ' PB';
    return GX.num(tb) + ' TB';
  };
  /** 带宽 Mbps 输入 */
  GX.bw = function (mbps) {
    if (mbps >= 1000) return (mbps / 1000).toFixed(2) + ' Gbps';
    return Math.round(mbps) + ' Mbps';
  };
  GX.coin = function (x) { return GX.num(x, 2) + ' x'; };

  /* =============== 1.1 多语言便捷入口 ===============
     依赖 shared/guixu-i18n.js；未加载时原样返回 key，保证不报错。
  =================================================== */
  /** 取当前语言文案，支持 {name} 占位符 */
  GX.t = function (key, vars) {
    if (!key) return '';
    return GX.i18n ? GX.i18n.t(key, vars) : key;
  };
  /** 当前语言代码 */
  GX.lang = function () { return GX.i18n ? GX.i18n.lang : 'zh'; };
  /** 双语数据字段取值（name / nameEn），用于纯专有名词兜底 */
  GX.field = function (obj, base) {
    return GX.i18n ? GX.i18n.field(obj, base) : (obj ? obj[base] : '');
  };

  GX.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  GX.rand = function (a, b) { return a + Math.random() * (b - a); };
  GX.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  /** 数字滚动动画 */
  GX.countUp = function (el, target, opts) {
    if (!el) return;
    opts = opts || {};
    var dur = opts.duration || 900, dec = opts.decimals || 0, suffix = opts.suffix || '';
    var from = parseFloat(String(el.dataset.v || 0)) || 0;
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = GX.clamp((ts - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var v = from + (target - from) * e;
      el.textContent = GX.num(v, dec) + suffix;
      if (p < 1) requestAnimationFrame(step); else el.dataset.v = target;
    }
    requestAnimationFrame(step);
  };

  /* =============== 2. 数据访问层 ===============
     当前为 mock 模式；接入后端时只需把 mode 改为 'live'
     并实现 fetchSnapshot()，页面代码零改动。
  ============================================== */
  GX.api = {
    mode: 'mock',
    base: '/api',
    async snapshot() {
      if (this.mode === 'live') {
        var r = await fetch(this.base + '/snapshot');
        return await r.json();
      }
      return window.GX_DATA;
    },
    async nodes() { return (await this.snapshot()).nodes; }
  };

  /* =============== 3. 点阵世界地图 =============== */
  var BM = null; // basemap

  function decodeRows() {
    var src = window.GUIXU_BASEMAP;
    if (!src) return null;
    var grid = [];
    for (var r = 0; r < src.rows; r++) {
      var hex = src.rowsHex[r], row = [];
      for (var c = 0; c < src.cols; c++) {
        var v = parseInt(hex[Math.floor(c / 4)], 16);
        row.push((v >> (3 - (c % 4))) & 1);
      }
      grid.push(row);
    }
    return grid;
  }

  /** 经纬度 -> 归一化坐标 [0..1] */
  GX.geoToNorm = function (lon, lat) {
    var s = window.GUIXU_BASEMAP;
    return { cx: (lon + 180) / (s.cols * s.step), cy: (s.lat0 - lat) / (s.rows * s.step) };
  };

  /**
   * 渲染点阵世界地图 + 节点光点
   * @param {HTMLCanvasElement} canvas
   * @param {Object} opts { nodes:[], showNodes:bool, animate:bool }
   */
  GX.drawWorldMap = function (canvas, opts) {
    if (!canvas) return;
    opts = opts || {};
    var s = window.GUIXU_BASEMAP;
    if (!s) return;
    var grid = BM || (BM = decodeRows());
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 900;
    var H = Math.round(W * s.rows / s.cols);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cw = W / s.cols, ch = H / s.rows;
    var nodes = (opts.nodes || []).map(function (n) {
      var p = GX.geoToNorm(n.lon, n.lat);
      return { x: p.cx * W, y: p.cy * H, online: n.online !== false, type: n.type };
    });

    var typeColor = { pc: '#a3bffa', mobile: '#7ee0c8', nas: '#ffb86b', server: '#c9a7ff' };

    // 重复调用保护：取消上一轮动画与自适应观察
    if (canvas.__gxRAF) { cancelAnimationFrame(canvas.__gxRAF); canvas.__gxRAF = null; }
    canvas.__gxOpts = opts;

    function frame(ts) {
      ctx.clearRect(0, 0, W, H);

      // 陆地点阵
      ctx.fillStyle = 'rgba(163,191,250,.22)';
      var dot = Math.max(1.2, cw * 0.44);
      for (var r = 0; r < s.rows; r++) {
        for (var c = 0; c < s.cols; c++) {
          if (grid[r][c]) {
            ctx.fillRect(c * cw + (cw - dot) / 2, r * ch + (ch - dot) / 2, dot, dot);
          }
        }
      }

      // 节点光点
      if (opts.showNodes !== false) {
        var t = (ts || 0) / 1000;
        nodes.forEach(function (n, i) {
          var col = n.online ? (typeColor[n.type] || '#a3bffa') : '#ff8080';
          // 呼吸脉冲
          var ph = (t * 0.55 + i * 0.37) % 1;
          var rad = 3 + ph * 9;
          ctx.beginPath();
          ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
          ctx.strokeStyle = hexA(col, 0.42 * (1 - ph));
          ctx.lineWidth = 1;
          ctx.stroke();
          // 实心点
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.online ? 2.4 : 2, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.shadowColor = col; ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      if (opts.animate !== false) canvas.__gxRAF = requestAnimationFrame(frame);
    }
    frame();

    // 自适应：观察父容器宽度变化（避免观察自身造成回环）
    if (!canvas.__gxRO && window.ResizeObserver) {
      var lastW = W;
      var ro = new ResizeObserver(function () {
        var w = canvas.clientWidth;
        if (Math.abs(w - lastW) < 4) return;
        lastW = w;
        GX.drawWorldMap(canvas, canvas.__gxOpts);
      });
      ro.observe(canvas.parentElement || canvas);
      canvas.__gxRO = ro;
    }
  };

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  GX.hexA = hexA;

  /* =============== 4. 轻量图表 =============== */
  var charts = new WeakMap();

  /** 折线/面积图 */
  GX.lineChart = function (canvas, series, opts) {
    if (!canvas) return;
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 400, H = canvas.clientHeight || 120;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    charts.set(canvas, { canvas: canvas, series: series, opts: opts, draw: draw });

    function draw(highlight) {
      ctx.clearRect(0, 0, W, H);
      var all = [];
      series.forEach(function (s) { all = all.concat(s.data); });
      var min = opts.min !== undefined ? opts.min : Math.min.apply(null, all);
      var max = opts.max !== undefined ? opts.max : Math.max.apply(null, all);
      if (max === min) max = min + 1;
      var pad = 4;

      // 网格
      if (opts.grid !== false) {
        ctx.strokeStyle = 'rgba(163,191,250,.09)'; ctx.lineWidth = 1;
        for (var g = 0; g <= 3; g++) {
          var gy = pad + (H - pad * 2) * g / 3;
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }
      }

      series.forEach(function (s) {
        var data = s.data, n = data.length;
        var pts = data.map(function (v, i) {
          return [n === 1 ? W / 2 : (W * i) / (n - 1), pad + (H - pad * 2) * (1 - (v - min) / (max - min))];
        });
        var col = s.color || '#a3bffa';

        if (s.fill !== false) {
          var grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, hexA(col, .28));
          grad.addColorStop(1, hexA(col, 0));
          ctx.beginPath();
          ctx.moveTo(pts[0][0], H);
          pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
          ctx.lineTo(pts[n - 1][0], H);
          ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
        }

        ctx.beginPath();
        pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.lineJoin = 'round'; ctx.stroke();

        if (highlight !== undefined && pts[highlight]) {
          var hp = pts[highlight];
          ctx.beginPath(); ctx.arc(hp[0], hp[1], 4, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        }
      });
    }
    draw();
  };

  /** 环形进度 */
  GX.ring = function (canvas, pct, opts) {
    if (!canvas) return;
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var S = opts.size || 120;
    canvas.width = S * dpr; canvas.height = S * dpr;
    canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = S / 2 - 8, cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(163,191,250,.15)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (pct / 100));
    ctx.strokeStyle = opts.color || '#a3bffa'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.shadowColor = opts.color || '#a3bffa'; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
  };

  /* =============== 5. 实时数据抖动（模拟） =============== */
  GX.liveTick = function (fn, interval) {
    fn();
    return setInterval(fn, interval || 2000);
  };

  /** 生成一个围绕基准值波动的序列 */
  GX.wobble = function (base, len, amp) {
    var out = [], v = base;
    for (var i = 0; i < len; i++) {
      v = GX.clamp(v + GX.rand(-amp, amp), base - amp * 4, base + amp * 4);
      out.push(v);
    }
    return out;
  };

  /* =============== 6. 节点工具 ===============
     数据层（mock-data.js）中所有文案均以 *Key 形式存储，
     此处统一经 GX.t() 转换为当前语言文案。
  ============================================== */
  GX.parseNodes = function (raw) {
    return (raw || window.GX_DATA.nodes).map(function (a) {
      var o = {
        id: a.id,
        cityKey: a.cityKey,
        countryKey: a.countryKey,
        lon: a.lng !== undefined ? a.lng : a.lon,
        lat: a.lat,
        type: a.type,
        status: a.status,
        storageGB: a.storageGB,
        bwMbps: a.bwMbps,
        tflops: a.tflops,
        uptime: a.uptime,
        score: a.score
      };
      o.online = o.status === 'online';
      o.city = GX.t(o.cityKey);
      o.country = GX.t(o.countryKey);
      return o;
    });
  };

  GX.typeLabel = function (key) {
    var t = (window.GX_DATA.nodeTypes || []).filter(function (x) { return x.key === key; })[0];
    return t ? GX.t(t.labelKey) : key;
  };
  GX.typeColor = function (key) {
    var t = (window.GX_DATA.nodeTypes || []).filter(function (x) { return x.key === key; })[0];
    return t ? t.color : '#a3bffa';
  };

  /* =============== 7. 侧边栏高亮 =============== */
  GX.markNav = function (key) {
    GX.qsa('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === key);
    });
  };

  /* =============== 8. 开关 / 滑块通用绑定 =============== */
  GX.bindSwitch = function (el, onChange) {
    GX.on(el, 'click', function () {
      el.classList.toggle('on');
      var on = el.classList.contains('on');
      if (typeof onChange === 'function') onChange(on);
    });
    if (el.classList.contains('on') && typeof onChange === 'function') onChange(true);
  };

  window.__GX_READY = true;
})();

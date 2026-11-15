/* 🎆 归墟共识官网 · 烟花特效（连续 3 次 + 合成音效）
 * 每次打开 / 刷新 / 返回首页（含 bfcache 后退）都会激活。
 * 无外部依赖，纯 Canvas + Web Audio。 */
(function () {
  'use strict';

  var BURST_COUNT = 3;           // 连续 3 次烟花
  var COLORS = ['#ff0040', '#ff6600', '#ffcc00', '#00ff88', '#40a0ff', '#cc40ff', '#ff40cc'];
  var REPLAY_WINDOW_MS = 20000;  // 20 秒内的首次交互可补放（解决浏览器自动播放限制）

  var _audioCtx = null;
  var _soundPlayed = false;      // 是否成功出声过
  var _replayed = false;
  var _loadedAt = Date.now();
  window.__guixuFW = { runs: 0, bursts: 0, sounds: 0 };

  /* ---------- 音效 ---------- */
  function getAudioCtx() {
    try {
      if (!_audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        _audioCtx = new AC();
      }
      if (_audioCtx.state === 'suspended') { try { _audioCtx.resume(); } catch (e) {} }
      return _audioCtx;
    } catch (e) { return null; }
  }

  // 烟花爆炸音：白噪音爆裂 + 低频轰隆 + 高频咝咝
  function playBang() {
    var actx = getAudioCtx();
    if (!actx) return;
    if (actx.state !== 'running') {
      // 尚未解锁：在手势上下文内尝试恢复，成功后补发这一次爆炸声
      try { actx.resume().then(function () { emit(actx); }, function () {}); } catch (e) {}
      return;
    }
    emit(actx);
  }

  function emit(actx) {
    if (actx.state !== 'running') return;
    try {
      var t0 = actx.currentTime;
      var dur = 0.5 + Math.random() * 0.3;

      // 1. 爆裂「啪」
      var n1 = Math.floor(actx.sampleRate * dur);
      var b1 = actx.createBuffer(1, n1, actx.sampleRate);
      var d1 = b1.getChannelData(0);
      for (var i = 0; i < n1; i++) {
        d1[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n1 * 0.05));
      }
      var s1 = actx.createBufferSource(); s1.buffer = b1;
      var g1 = actx.createGain();
      g1.gain.setValueAtTime(0.6, t0);
      g1.gain.exponentialRampToValueAtTime(0.001, t0 + dur * 0.3);
      s1.connect(g1); g1.connect(actx.destination);

      // 2. 低频「咚」
      var osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100 + Math.random() * 60, t0);
      osc.frequency.exponentialRampToValueAtTime(25, t0 + dur);
      var g2 = actx.createGain();
      g2.gain.setValueAtTime(0.5, t0);
      g2.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g2); g2.connect(actx.destination);

      // 3. 高频「咝」尾音
      var n2 = Math.floor(actx.sampleRate * 0.8);
      var b2 = actx.createBuffer(1, n2, actx.sampleRate);
      var d2 = b2.getChannelData(0);
      for (var j = 0; j < n2; j++) {
        d2[j] = (Math.random() * 2 - 1) * Math.exp(-j / (n2 * 0.2)) * 0.3;
      }
      var s2 = actx.createBufferSource(); s2.buffer = b2;
      var hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
      var g3 = actx.createGain();
      g3.gain.setValueAtTime(0.3, t0);
      g3.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
      s2.connect(hp); hp.connect(g3); g3.connect(actx.destination);

      s1.start(t0); s1.stop(t0 + dur);
      osc.start(t0); osc.stop(t0 + dur);
      s2.start(t0); s2.stop(t0 + 0.8);
      _soundPlayed = true;
      window.__guixuFW.sounds++;
    } catch (e) {}
  }

  /* ---------- 视觉 ---------- */
  function run() {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9995';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var particles = [];
    var onResize = function () { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    window.__guixuFW.runs++;

    function burst(x, y) {
      playBang();
      window.__guixuFW.bursts++;
      var count = 60 + Math.random() * 40;
      var color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (var i = 0; i < count; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 2 + Math.random() * 4;
        particles.push({
          x: x, y: y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, decay: 0.004 + Math.random() * 0.006,
          size: 2 + Math.random() * 3, color: color,
          gravity: 0.02 + Math.random() * 0.015
        });
      }
    }

    // 连续 3 次烟花（音效与爆炸同步）
    for (var k = 0; k < BURST_COUNT; k++) {
      (function (idx) {
        setTimeout(function () {
          if (!canvas.parentNode) return;
          burst(
            canvas.width * 0.15 + Math.random() * canvas.width * 0.7,
            canvas.height * 0.12 + Math.random() * canvas.height * 0.45
          );
        }, idx * 620 + Math.random() * 150);
      })(k);
    }

    var hasBurst = false;
    var timer = setInterval(function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
        p.vx *= 0.98; p.vy *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (particles.length === 0 && hasBurst) {
        clearInterval(timer);
        window.removeEventListener('resize', onResize);
        if (canvas.parentNode) canvas.remove();
      }
    }, 16);

    setTimeout(function () { hasBurst = true; }, 4000);
    setTimeout(function () {                       // 兜底清理（最多 12 秒）
      clearInterval(timer);
      window.removeEventListener('resize', onResize);
      if (canvas.parentNode) canvas.remove();
    }, 12000);
  }

  /* ---------- 首次交互补放（浏览器自动播放策略） ---------- */
  function detachGesture() {
    ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
      window.removeEventListener(ev, onFirstGesture);
    });
  }
  function onFirstGesture() {
    var actx = getAudioCtx();
    if (!actx) return;
    var done = function () {
      if (!_soundPlayed && !_replayed && (Date.now() - _loadedAt) < REPLAY_WINDOW_MS) {
        _replayed = true;
        run();                                     // 补一次完整 3 连发（含音效）
      }
      if (_soundPlayed) detachGesture();
    };
    try {
      var p = actx.resume();
      if (p && p.then) { p.then(done, done); } else { setTimeout(done, 80); }
    } catch (e) { setTimeout(done, 80); }
  }
  ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, onFirstGesture, { passive: true });
  });

  /* ---------- 触发时机：打开 / 刷新 / 返回首页 ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // 从其他页面「后退」回来（bfcache）时同样激活
  window.addEventListener('pageshow', function (e) { if (e.persisted) run(); });

  window.guixuFireworks = run;                    // 手动触发备用
})();

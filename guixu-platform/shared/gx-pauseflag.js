/* 全网暂停常驻横幅 v20261114a —— desktop / mobile / 入口页共用
   数据源：GET /api/node/runtime（paused + pause_note{zh,en}）
   说明：paused 为真时在页面顶部常驻一条橙色横幅，展示后台填写的暂停说明；
        说明为空时回落到 i18n 默认文案。60 秒自动复查，切回页签时复查。 */
(function () {
  'use strict';
  var EL_ID = 'gx-pause-banner';
  var RECHECK_MS = 60000;
  var basePad = null;      /* body 原始 padding-top，首次渲染时记录 */
  var shown = false;
  var lastLang = '';
  var lastNote = null;   /* 存原始 pause_note，语言切换时重新取词 */
  var TXT = {
    zh: {
      title: '全网已暂停',
      note: '全网已暂停资源上报与计入，后台恢复后自动继续。',
      sep: '：'
    },
    en: {
      title: 'Paused network-wide',
      note: 'Resource reporting and accrual are paused network-wide; it resumes automatically once re-enabled.',
      sep: ': '
    }
  };

  function lang() {
    try {
      if (window.GX && typeof window.GX.lang === 'function') {
        var l = window.GX.lang();
        if (l) { return String(l).toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'; }
      }
    } catch (e) {}
    var h = String((document.documentElement && document.documentElement.getAttribute('lang')) || '').toLowerCase();
    return h.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function build() {
    var d = document.createElement('div');
    d.id = EL_ID;
    d.setAttribute('role', 'status');
    d.setAttribute('aria-live', 'polite');
    d.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483000',
      'display:none', 'box-sizing:border-box', 'margin:0',
      'padding:9px 16px', 'text-align:center',
      'font-size:13px', 'font-weight:600', 'line-height:1.45', 'letter-spacing:.2px',
      'color:#1b1205', 'word-break:break-word',
      'background:linear-gradient(90deg,#f6b73c 0%,#f59e0b 52%,#ef8f2b 100%)',
      'box-shadow:0 3px 14px rgba(0,0,0,.45)',
      'border-bottom:1px solid rgba(0,0,0,.22)'
    ].join(';');
    var t = document.createElement('span');
    t.id = EL_ID + '-title';
    t.style.cssText = 'font-weight:800';
    var n = document.createElement('span');
    n.id = EL_ID + '-note';
    d.appendChild(t);
    d.appendChild(n);
    return d;
  }

  function ensure() {
    var d = document.getElementById(EL_ID);
    if (d) { return d; }
    if (!document.body) { return null; }
    d = build();
    document.body.appendChild(d);
    return d;
  }

  function pad(on, h) {
    var b = document.body;
    if (!b) { return; }
    if (basePad === null) {
      var cs = window.getComputedStyle ? window.getComputedStyle(b) : null;
      basePad = cs ? (parseFloat(cs.paddingTop) || 0) : 0;
    }
    b.style.paddingTop = ((on ? basePad + h : basePad) + 'px');
  }

  function noteText(note, L) {
    var s = '';
    if (note && typeof note === 'object') {
      s = note[L] || note.zh || note.en || '';
    } else if (typeof note === 'string') {
      s = note;
    }
    s = String(s).trim();
    return s || TXT[L].note;
  }

  function render(on, note) {
    var d = ensure();
    if (!d) { return; }
    var L = lang();
    lastLang = L;
    if (!on) {
      if (shown) { d.style.display = 'none'; pad(false, 0); shown = false; }
      return;
    }
    var nt = noteText(note, L);
    lastNote = note;                     /* 留原始值，便于语言切换重取 */
    /* 标题随说明语种走：中文说明配中文标题，英文说明配英文标题，避免混排 */
    var TL = /[\u4e00-\u9fff]/.test(nt) ? 'zh' : 'en';
    var tEl = document.getElementById(EL_ID + '-title');
    var nEl = document.getElementById(EL_ID + '-note');
    if (tEl) { tEl.textContent = TXT[TL].title + TXT[TL].sep; }
    if (nEl) { nEl.textContent = nt; }
    d.style.display = 'block';
    shown = true;
    pad(true, d.offsetHeight || 0);
  }

  function refresh() {
    try {
      var url = '/api/node/runtime?ts=' + Date.now();
      fetch(url, { cache: 'no-store', headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || typeof j !== 'object') { return; }
          render(!!j.paused, j.pause_note);
        })
        .catch(function () { /* 接口不稳时不改动现有横幅状态 */ });
    } catch (e) {}
  }

  /* 语言切换（页面内切中英文）后即时改词，无需等下一次轮询 */
  function watchLang() {
    var L = lang();
    if (L !== lastLang) {
      lastLang = L;
      if (shown) { render(true, lastNote); }
    }
  }

  function boot() {
    refresh();
    setInterval(refresh, RECHECK_MS);
    setInterval(watchLang, 1500);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { refresh(); }
    });
    window.addEventListener('resize', function () {
      var d = document.getElementById(EL_ID);
      if (shown && d) { pad(true, d.offsetHeight || 0); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

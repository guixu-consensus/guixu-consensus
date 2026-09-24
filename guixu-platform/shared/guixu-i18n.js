/* ============================================================
   Guixu Consensus Platform :: i18n runtime
   ------------------------------------------------------------
   可维护多语言引擎（纯静态 / 零依赖 / 无需构建）

   设计要点
   1. 语言包与代码彻底分离：每种语言一个文件 shared/i18n/<code>.js，
      文件内调用 GX.i18n.register(code, {...}) 自注册。
   2. 新增语言：① 新建 shared/i18n/<code>.js；② 在下方 LOCALES 数组
      追加 <code>。页面 HTML 无需任何改动（引擎会自动注入缺失的语言包）。
   3. 默认语言 en，用户切换后写入 localStorage(gx-lang)，刷新后保持。
   4. 渲染方式是「用 JS 改写元素文本」，全程不使用 CSS display 控制
      语言元素显隐 —— 从根本上规避「单边 data-en 元素在中文模式下
      整块消失」的问题（任何元素在任何语言下都只被替换文本，不会被隐藏）。
   5. 文案回退链：当前语言 -> 默认语言(en) -> key 原文。

   标记约定
   · data-i18n="key"              -> 替换元素文本
   · data-i18n-html="key"         -> 替换元素 innerHTML（允许语言包内写 <b> 等）
   · data-i18n-attr="placeholder:key;title:key2" -> 替换指定属性
   · <title data-i18n="key">      -> 替换文档标题
   · [data-gx-lang-switch]        -> 语言切换按钮挂载点（由引擎渲染）
   ============================================================ */

(function () {
  'use strict';

  var GX = window.GX = window.GX || {};
  var i18n = GX.i18n = {};

  var LS_KEY = 'gx-lang';

  i18n.DEFAULT = 'en';

  /* ★ 支持的语言清单：新增语言只需新建语言包文件并在此追加语言代码 */
  var LOCALES = i18n.LOCALES = ['en', 'zh'];

  /* 语言元信息：short 用于切换按钮显示，name 用于 title 提示 */
  var META = i18n.META = {
    en: { name: 'English', short: 'EN' },
    zh: { name: '中文', short: '中' }
  };

  var packs = i18n.packs = Object.create(null);
  var listeners = [];
  var lang = i18n.DEFAULT;
  i18n.lang = lang;

  /* ---------- 解析期自动注入语言包（同步执行，保证后续脚本可见） ---------- */
  (function autoload() {
    if (document.readyState !== 'loading') return;
    var self = document.currentScript;
    var base = '';
    if (self && self.src) base = self.src.replace(/[?#].*$/, '').replace(/[^\/]*$/, '');
    if (!base) base = 'shared/';
    for (var i = 0; i < LOCALES.length; i++) {
      document.write('<script src="' + base + 'i18n/' + LOCALES[i] + '.js"><\/script>');
    }
  })();

  /* ---------- 语言包注册 ---------- */
  i18n.register = function (code, dict, meta) {
    if (!code || !dict) return;
    var p = packs[code] || (packs[code] = Object.create(null));
    for (var k in dict) {
      if (Object.prototype.hasOwnProperty.call(dict, k)) p[k] = dict[k];
    }
    if (meta) META[code] = meta;
    if (LOCALES.indexOf(code) < 0) LOCALES.push(code);
  };

  /* ---------- 取词（支持 {name} 占位符） ---------- */
  i18n.t = function (key, vars) {
    if (key === null || key === undefined) return '';
    var s = packs[lang] ? packs[lang][key] : undefined;
    if (s === undefined && packs[i18n.DEFAULT]) s = packs[i18n.DEFAULT][key];
    if (s === undefined) s = key;
    if (vars) {
      s = String(s).replace(/\{([\w.]+)\}/g, function (m, n) {
        return Object.prototype.hasOwnProperty.call(vars, n) ? vars[n] : m;
      });
    }
    return s;
  };

  /* ---------- 双语数据字段取值
     约定：中文为主字段（name），英文为 nameEn。
     i18n.field(region, 'name') -> 英文模式取 region.nameEn，中文模式取 region.name。
     未登记后缀的语言自动回退英文，避免出现空白。 ---------- */
  var SUFFIX = { en: 'En', zh: '' };

  i18n.field = function (obj, base) {
    if (!obj) return '';
    var suf = SUFFIX[lang];
    if (suf && obj[base + suf] !== undefined) return obj[base + suf];
    if (suf === '' && obj[base] !== undefined) return obj[base];
    if (obj[base + 'En'] !== undefined) return obj[base + 'En'];
    return obj[base] !== undefined ? obj[base] : '';
  };

  /* ---------- 语言变更订阅 ---------- */
  i18n.onChange = function (fn) {
    if (typeof fn === 'function') listeners.push(fn);
  };

  function emit() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](lang); } catch (e) { if (window.console) console.error(e); }
    }
  }

  /* ---------- DOM 填充 ---------- */
  function fillTitle() {
    var t = document.querySelector('title[data-i18n]');
    if (t) document.title = i18n.t(t.getAttribute('data-i18n'));
  }

  function fillText(root) {
    var list = (root || document).querySelectorAll('[data-i18n]');
    for (var i = 0; i < list.length; i++) {
      list[i].textContent = i18n.t(list[i].getAttribute('data-i18n'));
    }
  }

  function fillHtml(root) {
    var list = (root || document).querySelectorAll('[data-i18n-html]');
    for (var i = 0; i < list.length; i++) {
      list[i].innerHTML = i18n.t(list[i].getAttribute('data-i18n-html'));
    }
  }

  function fillAttrs(root) {
    var list = (root || document).querySelectorAll('[data-i18n-attr]');
    for (var i = 0; i < list.length; i++) {
      var pairs = String(list[i].getAttribute('data-i18n-attr')).split(';');
      for (var j = 0; j < pairs.length; j++) {
        var p = pairs[j].split(':');
        if (p.length < 2) continue;
        list[i].setAttribute(p[0].trim(), i18n.t(p[1].trim()));
      }
    }
  }

  i18n.apply = function (root) {
    fillTitle();
    fillText(root);
    fillHtml(root);
    fillAttrs(root);
  };

  /* ---------- 语言切换器 ---------- */
  function injectStyle() {
    if (document.getElementById('gx-i18n-style')) return;
    var css =
      '.gx-lang{display:inline-flex;align-items:center;gap:2px;border:1px solid var(--gx-line,#2a3b52);' +
      'border-radius:999px;padding:2px;background:rgba(255,255,255,.04);vertical-align:middle}' +
      '.gx-lang button{border:0;background:transparent;color:var(--gx-dim,#8ea3bd);font:inherit;font-size:.76em;' +
      'line-height:1;padding:6px 11px;border-radius:999px;cursor:pointer;transition:all .2s;letter-spacing:.4px}' +
      '.gx-lang button:hover{color:var(--gx-text,#e8eefc)}' +
      '.gx-lang button.active{background:var(--gx-accent-dim,rgba(163,191,250,.16));' +
      'color:var(--gx-accent,#a3bffa);font-weight:600}' +
      '.gx-lang-inline{margin-left:12px}' +
      '.gx-lang-bar{display:flex;justify-content:flex-end;width:100%;max-width:1360px;margin:0 auto 14px;padding:0 24px}';
    var s = document.createElement('style');
    s.id = 'gx-i18n-style';
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function mountSwitchers(root) {
    var boxes = (root || document).querySelectorAll('[data-gx-lang-switch]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (box.getAttribute('data-gx-lang-ready') === '1') continue;
      box.setAttribute('data-gx-lang-ready', '1');
      box.classList.add('gx-lang');
      var html = '';
      for (var j = 0; j < LOCALES.length; j++) {
        var code = LOCALES[j];
        var m = META[code] || { short: code.toUpperCase(), name: code };
        if (!packs[code]) continue;
        html += '<button type="button" data-lang="' + code + '"' +
          (code === lang ? ' class="active"' : '') + ' title="' + m.name + '">' + m.short + '</button>';
      }
      box.innerHTML = html;
      var btns = box.querySelectorAll('button');
      for (var k = 0; k < btns.length; k++) {
        (function (b) {
          b.addEventListener('click', function () { i18n.setLang(b.getAttribute('data-lang')); });
        })(btns[k]);
      }
    }
  }

  function refreshSwitchers() {
    var btns = document.querySelectorAll('[data-gx-lang-switch] button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-lang') === lang);
    }
  }

  /* ---------- 切换语言 ---------- */
  i18n.setLang = function (code, opts) {
    if (!code || LOCALES.indexOf(code) < 0) return;
    lang = code;
    i18n.lang = code;
    try { localStorage.setItem(LS_KEY, code); } catch (e) { /* 隐私模式下忽略 */ }
    document.documentElement.setAttribute('lang', code === 'zh' ? 'zh-CN' : code);
    i18n.apply(document);
    refreshSwitchers();
    if (!opts || opts.silent !== true) emit();
  };

  /* ---------- 初始化 ---------- */
  i18n.init = function () {
    var saved = null;
    try { saved = localStorage.getItem(LS_KEY); } catch (e) { /* ignore */ }
    lang = (saved && LOCALES.indexOf(saved) >= 0 && packs[saved]) ? saved : i18n.DEFAULT;
    i18n.lang = lang;
    injectStyle();
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : lang);
    mountSwitchers(document);
    i18n.apply(document);
    return lang;
  };

  i18n.available = function () { return LOCALES.slice(); };
})();

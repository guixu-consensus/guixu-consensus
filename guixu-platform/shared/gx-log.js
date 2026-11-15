/* 归墟 · 前端运行日志（shared/gx-log.js）  v20261114
   用途：终端页 / 管理后台的前端运行情况（页面打开、钱包操作、设置改动、JS 报错）统一上报到
        POST /api/log/client → 后端写 sys_log → 后台「运营总览 → 日志管理」可查 / 可导出 / 可删。
   原则：① 绝不阻塞与污染页面：异步、失败静默、不重试；
        ② 批量合并（最多 20 条/次）+ keepalive，关页也能发出；
        ③ 只上报动作名与简述，绝不上报签名、私钥、密钥、密码等敏感内容。 */
(function () {
  "use strict";
  if (window.GXLOG && window.GXLOG.__v) { return; }

  var API = "/api";
  var LS_TERM = "gx_terminal_wallet_v1";
  var LS_ADMIN = "gx_notice_admin_key";
  var Q = [], TIMER = null, SEEN = {}, ERR_N = 0, ERR_MAX = 30;

  function ls(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function terminal() {
    try { return String(JSON.parse(ls(LS_TERM) || '""') || "").slice(0, 64); } catch (e) { return ""; }
  }
  function adminKey() { return ls(LS_ADMIN); }
  function pagePath() { return String((location.pathname || "") + (location.hash || "")).slice(0, 180); }
  function brief(v, n) {
    if (v == null) { return ""; }
    if (typeof v === "string") { return v.slice(0, n || 800); }
    try { return JSON.stringify(v).slice(0, n || 800); } catch (e) { return String(v).slice(0, n || 800); }
  }

  function flush() {
    if (TIMER) { clearTimeout(TIMER); TIMER = null; }
    if (!Q.length) { return; }
    var batch = Q.splice(0, 20);
    var body = JSON.stringify({ events: batch });
    var key = adminKey();
    var headers = { "Content-Type": "application/json" };
    if (key) { headers["X-Admin-Key"] = key; }
    try {
      fetch(API + "/log/client", {
        method: "POST", headers: headers, body: body,
        cache: "no-store", credentials: "omit", keepalive: true
      }).catch(function () {});
      return;
    } catch (e) {}
    try {
      if (!key && navigator.sendBeacon) {
        navigator.sendBeacon(API + "/log/client", new Blob([body], { type: "application/json" }));
      }
    } catch (e2) {}
  }
  function schedule() { if (TIMER) { return; } TIMER = setTimeout(flush, 600); }

  function log(cat, action, detail, target, level) {
    try {
      var a = String(action || "").replace(/[^A-Za-z0-9_.\-]/g, "").slice(0, 60) || "client.event";
      Q.push({
        cat: cat || "front",
        level: level || "info",
        action: a,
        detail: brief(detail),
        target: String(target || terminal() || "").slice(0, 160),
        actor: terminal(),
        page: pagePath()
      });
      if (Q.length >= 20) { flush(); } else { schedule(); }
    } catch (e) {}
  }

  /* ---------------- 自动采集：页面打开 + JS 异常 ---------------- */
  var HOST = String(location.hostname || "");
  function isAdmin() { return /^agent\./i.test(HOST); }

  function boot() {
    log(isAdmin() ? "admin" : "front", "page.view",
        (location.pathname || "/") + " · " + String(document.title || "").slice(0, 80), HOST);
  }

  window.addEventListener("error", function (e) {
    try {
      if (ERR_N >= ERR_MAX) { return; }
      ERR_N++;
      var msg = (e && e.message) ? String(e.message) : "unknown error";
      var src = (e && e.target && e.target.src) ? String(e.target.src) : String((e && e.filename) || "");
      var key = msg + "|" + src;
      if (SEEN[key]) { return; }
      SEEN[key] = 1;
      log("front", "js.error",
          msg + (src ? " @" + src.slice(-90) : "") + ((e && e.lineno) ? (" line " + e.lineno) : ""),
          "", "error");
    } catch (x) {}
  }, true);

  window.addEventListener("unhandledrejection", function (e) {
    try {
      if (ERR_N >= ERR_MAX) { return; }
      ERR_N++;
      var r = e && e.reason;
      var msg = (r && (r.message || r)) ? String(r.message || r) : "promise rejection";
      if (SEEN[msg]) { return; }
      SEEN[msg] = 1;
      log("front", "js.rejection", msg.slice(0, 300), "", "warn");
    } catch (x) {}
  });

  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", function () { if (document.hidden) { flush(); } });

  window.GXLOG = {
    __v: "20261114",
    log: log,
    flush: flush,
    terminal: terminal,
    wallet: function (action, detail, target, level) { log("terminal", action, detail, target, level); },
    admin: function (action, detail, target, level) { log("admin", action, detail, target, level); },
    front: function (action, detail, target, level) { log("front", action, detail, target, level); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

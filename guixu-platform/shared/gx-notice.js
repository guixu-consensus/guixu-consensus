/* 归墟共识 · 重要信息公告弹窗（自包含，无依赖，入口页 / desktop / mobile 共用）
 * 数据来源：GET /api/notice  由后台 /web/admin.html 发布
 * 已读去重：localStorage.gx_notice_seen_v1 存 version，版本变化才会再次弹出
 * 对外接口：window.GX_NOTICE.show(notice) / refresh()  供后台预览
 */
(function () {
  "use strict";
  if (window.GX_NOTICE) { return; }

  var API = "/api/notice";
  var LS_SEEN = "gx_notice_seen_v1";

  var CSS = [
    ".gxn-mask{position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:22px;",
    "background:rgba(4,9,16,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}",
    ".gxn-mask.on{display:flex;animation:gxnFade .22s ease-out;}",
    "@keyframes gxnFade{from{opacity:0}to{opacity:1}}",
    "@keyframes gxnRise{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}",
    ".gxn-card{position:relative;width:100%;max-width:430px;max-height:88vh;overflow:auto;box-sizing:border-box;",
    "background:linear-gradient(180deg,#132437 0%,#0b1622 100%);border:1px solid rgba(127,176,255,.28);",
    "border-radius:16px;padding:22px 22px 18px;color:#e8f0fb;font-size:14px;line-height:1.7;",
    "box-shadow:0 0 0 1px rgba(255,255,255,.04),0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(127,176,255,.12);",
    "animation:gxnRise .26s cubic-bezier(.2,.8,.3,1);font-family:inherit;}",
    ".gxn-x{position:absolute;top:10px;right:12px;width:30px;height:30px;border:0;border-radius:9px;background:transparent;",
    "color:#93a3b5;font-size:20px;line-height:1;cursor:pointer;font-family:inherit;}",
    ".gxn-x:hover{background:rgba(255,255,255,.08);color:#cfe0ff;}",
    ".gxn-tag{display:inline-block;font-size:11px;letter-spacing:.8px;text-transform:uppercase;font-weight:700;",
    "color:#0b1622;background:#7fb0ff;border-radius:999px;padding:3px 10px;margin-bottom:12px;}",
    ".gxn-img{display:block;width:100%;height:auto;border-radius:12px;margin:0 0 14px;border:1px solid rgba(255,255,255,.12);}",
    ".gxn-title{font-size:17px;font-weight:700;margin:0 0 8px;letter-spacing:.2px;}",
    ".gxn-text{font-size:13.5px;color:#b9c9dc;white-space:pre-wrap;word-break:break-word;}",
    ".gxn-foot{display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap;}",
    ".gxn-link{color:#7fb0ff;text-decoration:none;font-size:13px;font-weight:600;margin-right:auto;}",
    ".gxn-link:hover{text-decoration:underline;}",
    ".gxn-ok{background:#7fb0ff;color:#0b1622;border:0;border-radius:10px;padding:9px 20px;font-size:13px;font-weight:700;",
    "cursor:pointer;font-family:inherit;}",
    ".gxn-ok:hover{filter:brightness(1.08);}",
    "@media(max-width:520px){.gxn-card{padding:18px 16px 14px;border-radius:14px;}.gxn-title{font-size:16px;}}"
  ].join("");

  function lang() { try { return localStorage.getItem("gx-lang") === "zh" ? "zh" : "en"; } catch (e) { return "en"; } }
  function T(zh, en) { return lang() === "zh" ? zh : en; }
  function readSeen() { try { return localStorage.getItem(LS_SEEN) || ""; } catch (e) { return ""; } }
  function writeSeen(v) { try { localStorage.setItem(LS_SEEN, v || ""); } catch (e) {} }

  function injectCSS() {
    if (document.getElementById("gxnCss")) { return; }
    var s = document.createElement("style");
    s.id = "gxnCss";
    s.appendChild(document.createTextNode(CSS));
    document.head.appendChild(s);
  }

  var current = null;

  function build() {
    var mask = document.createElement("div");
    mask.className = "gxn-mask";
    mask.id = "gxnMask";
    mask.setAttribute("role", "dialog");
    mask.setAttribute("aria-modal", "true");
    mask.innerHTML = '<div class="gxn-card">' +
      '<button class="gxn-x" type="button" aria-label="Close">&times;</button>' +
      '<div class="gxn-tag"></div>' +
      '<div class="gxn-shots"></div>' +
      '<h3 class="gxn-title"></h3>' +
      '<div class="gxn-text"></div>' +
      '<div class="gxn-foot">' +
      '<a class="gxn-link" target="_blank" rel="noopener noreferrer"></a>' +
      '<button class="gxn-ok" type="button"></button>' +
      '</div></div>';
    document.body.appendChild(mask);

    mask.addEventListener("click", function (e) { if (e.target === mask) { hide(); } });
    mask.querySelector(".gxn-x").addEventListener("click", hide);
    mask.querySelector(".gxn-ok").addEventListener("click", hide);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mask.className.indexOf("on") >= 0) { hide(); }
    });
    return mask;
  }

  function show(n) {
    if (!n) { return; }
    injectCSS();
    var mask = document.getElementById("gxnMask") || build();
    current = n;

    var zh = lang() === "zh";
    var title = zh ? (n.title_zh || n.title_en || "") : (n.title_en || n.title_zh || "");
    var body = zh ? (n.body_zh || n.body_en || "") : (n.body_en || n.body_zh || "");
    var label = zh ? (n.link_zh || "查看详情") : (n.link_en || "View details");
    var img = (n.image || "").trim();

    mask.querySelector(".gxn-tag").textContent = T("重要信息", "Important Notice");

    var shots = mask.querySelector(".gxn-shots");
    shots.innerHTML = "";
    if (img) {
      var im = document.createElement("img");
      im.className = "gxn-img";
      im.alt = title || "notice";
      im.src = img;
      im.addEventListener("error", function () { if (im.parentNode) { im.parentNode.removeChild(im); } });
      shots.appendChild(im);
    }

    var h = mask.querySelector(".gxn-title");
    h.textContent = title;
    h.style.display = title ? "" : "none";

    var t = mask.querySelector(".gxn-text");
    t.textContent = body;
    t.style.display = body ? "" : "none";

    var a = mask.querySelector(".gxn-link");
    var href = (n.link || "").trim();
    if (/^https?:\/\//i.test(href)) {
      a.href = href;
      a.textContent = label;
      a.style.display = "";
    } else {
      a.style.display = "none";
    }

    mask.querySelector(".gxn-ok").textContent = T("我知道了", "Got it");
    mask.className = "gxn-mask on";
    document.documentElement.style.overflow = "hidden";
  }

  function hide() {
    var mask = document.getElementById("gxnMask");
    if (mask) { mask.className = "gxn-mask"; }
    document.documentElement.style.overflow = "";
    if (current && current.version) { writeSeen(current.version); }
  }

  function usable(n) {
    return !!(n && n.enabled && (n.title_zh || n.title_en || n.body_zh || n.body_en || n.image));
  }

  function fetchNotice() {
    if (!window.fetch) { return null; }
    return fetch(API + "?t=" + (+new Date()), { cache: "no-store", credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j && j.notice) || null; })
      .catch(function () { return null; });
  }

  function autoShow() {
    fetchNotice().then(function (n) {
      if (!usable(n)) { return; }
      if (n.version && n.version === readSeen()) { return; }
      setTimeout(function () { show(n); }, 700);
    });
  }

  window.GX_NOTICE = {
    show: show,
    hide: hide,
    refresh: function (cb) { fetchNotice().then(function (n) { if (cb) { cb(n); } }); }
  };

  /* 后台页面（如 web/admin.html）用 data-auto="off" 引入本组件：只按需 show() 预览，不自动弹窗 */
  var SELF = document.currentScript;
  if (SELF && SELF.getAttribute && SELF.getAttribute("data-auto") === "off") { return; }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoShow);
  } else {
    autoShow();
  }
})();

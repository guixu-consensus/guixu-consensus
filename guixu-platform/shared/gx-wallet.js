/* 归墟共识 · 钱包连接与节点身份（自包含，desktop / mobile 终端页共用）
 * 原入口页 index.html 的连接钱包 / 节点身份 / 推荐绑定功能迁移至此。
 * 需在页面中放置挂载点：<div id="gxWalletMount"></div>
 * 身份沿用 localStorage：gx_terminal_wallet_v1（地址） / gx_terminal_nodes_v1（{地址:{name,email,ref}}）
 * 写入后调用 window.GX_WALLET_REFRESH()（各终端页暴露的刷新钩子）让原有身份卡同步。
 */
(function () {
  "use strict";
  if (window.GX_WALLET) { return; }

  var MOUNT_ID = "gxWalletMount";
  var LS_WALLET = "gx_terminal_wallet_v1";
  var LS_NODES = "gx_terminal_nodes_v1";
  var API = "/api";

  var CSS = [
    ".gxw-note{font-size:.8em;color:var(--gx-dim,#93a3b5);line-height:1.7;margin:0 0 12px;}",
    ".gxw-btn{background:var(--gx-accent,#7fb0ff);color:#0b1622;border:0;border-radius:10px;padding:9px 18px;font-size:.82em;font-weight:700;cursor:pointer;font-family:inherit;}",
    ".gxw-btn:hover{filter:brightness(1.08);}",
    ".gxw-btn:disabled{opacity:.5;cursor:default;filter:none;}",
    ".gxw-btn.ghost{background:transparent;color:var(--gx-accent,#7fb0ff);border:1px solid var(--gx-line-strong,rgba(255,255,255,.24));}",
    ".gxw-sep{margin-top:14px;padding-top:12px;border-top:1px solid var(--gx-line,rgba(255,255,255,.12));}",
    ".gxw-line{display:flex;align-items:center;gap:10px;justify-content:space-between;font-size:.82em;padding:6px 0;}",
    ".gxw-k{color:var(--gx-dim,#93a3b5);flex:none;}",
    ".gxw-mono{font-family:ui-monospace,Consolas,Menlo,monospace;color:var(--gx-accent,#7fb0ff);word-break:break-all;text-align:right;}",
    ".gxw-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:10px;}",
    ".gxw-row input{flex:1 1 150px;min-width:0;box-sizing:border-box;background:rgba(0,0,0,.28);border:1px solid var(--gx-line,rgba(255,255,255,.12));border-radius:9px;padding:9px 11px;color:inherit;font-family:inherit;font-size:.82em;}",
    ".gxw-row input:focus{outline:none;border-color:var(--gx-accent,#7fb0ff);}",
    ".gxw-row input[readonly]{color:var(--gx-accent,#7fb0ff);font-family:ui-monospace,Consolas,monospace;}",
    ".gxw-msg{margin-top:10px;font-size:.78em;color:var(--gx-dim,#93a3b5);min-height:18px;line-height:1.6;word-break:break-word;}",
    ".gxw-msg.ok{color:#7fe0b0;}",
    ".gxw-msg.warn{color:#ffbf7f;}",
    ".gxw-stats{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;font-size:.8em;color:var(--gx-dim,#93a3b5);}",
    ".gxw-stats b{color:var(--gx-accent,#7fb0ff);font-size:1.2em;font-weight:700;margin-left:5px;}",
    ".gxw-btn-sm{padding:6px 13px;font-size:.76em;border-radius:8px;}",
    ".gxw-inline-msg{font-size:.72em;color:var(--gx-dim,#93a3b5);line-height:1.5;max-width:300px;}",
    ".gxw-copy{background:rgba(127,176,255,.1);border:1px solid var(--gx-line,rgba(163,191,250,.22));color:var(--gx-accent,#7fb0ff);font-size:.72em;padding:3px 10px;border-radius:7px;margin-left:8px;cursor:pointer;font-family:inherit;}",
    ".gxw-line-wrap{flex-wrap:wrap;}",
    ".gxw-line-wrap .gxw-mono{flex:1 1 100%;text-align:left;font-size:.95em;line-height:1.5;}",
    /* 账户切换提醒浮层：钱包里换账户后主动弹出，提示需重新授权签名（PC 端顶栏 inline 空间小，故用浮层） */
    ".gxw-switch{position:fixed;left:50%;top:74px;transform:translateX(-50%);z-index:2147483000;width:min(560px,calc(100vw - 28px));box-sizing:border-box;display:none;padding:14px 16px 13px;border-radius:14px;border:1px solid rgba(255,191,127,.55);background:var(--gx-panel,#101a26);background-image:linear-gradient(180deg,rgba(255,191,127,.13),rgba(255,191,127,0));box-shadow:0 18px 46px rgba(0,0,0,.55);font-size:13px;line-height:1.6;color:inherit;}",
    ".gxw-switch.show{display:block;animation:gxwSwIn .22s ease-out;}",
    "@keyframes gxwSwIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}",
    ".gxw-switch-h{font-weight:700;font-size:.95em;color:#ffbf7f;margin:0 0 6px;}",
    ".gxw-switch-b{font-size:.84em;color:var(--gx-dim,#93a3b5);margin:0 0 10px;word-break:break-word;}",
    ".gxw-switch-b b{color:var(--gx-accent,#7fb0ff);font-family:ui-monospace,Consolas,Menlo,monospace;font-weight:600;}",
    ".gxw-switch-a{display:flex;gap:9px;flex-wrap:wrap;align-items:center;}",
    ".gxw-switch-x{margin-left:auto;background:transparent;border:0;color:var(--gx-dim,#93a3b5);font-size:.8em;cursor:pointer;font-family:inherit;padding:6px 4px;}",
    "@media(max-width:640px){.gxw-switch{top:auto;bottom:14px;}}",
  ].join("");

  function L() { try { return localStorage.getItem("gx-lang") === "zh" ? "zh" : "en"; } catch (e) { return "en"; } }
  function T(zh, en) { return L() === "zh" ? zh : en; }
  function q(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function readStore(k, d) { var v = lsGet(k); if (!v) { return d; } try { return JSON.parse(v) || d; } catch (e) { return d; } }
  function shortAddr(a) { return a ? a.slice(0, 6) + "..." + a.slice(-4) : ""; }
  function isAddr(a) { return /^0x[0-9a-fA-F]{40}$/.test(String(a || "").trim()); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function injectCSS() {
    if (q("gxwCss")) { return; }
    var s = document.createElement("style");
    s.id = "gxwCss";
    s.appendChild(document.createTextNode(CSS));
    document.head.appendChild(s);
  }

  /* ---------------- localStorage 读写（与终端页原有逻辑一致） ---------------- */
  function readAddr() {
    var raw = lsGet(LS_WALLET);
    if (!raw) { return ""; }
    raw = String(raw).trim();
    if (raw.charAt(0) === '"') { try { var s = JSON.parse(raw); if (typeof s === "string") { raw = s.trim(); } } catch (e) {} }
    return isAddr(raw) ? raw : "";
  }
  function readNodes() { return readStore(LS_NODES, {}); }
  function writeAddr(a) { lsSet(LS_WALLET, JSON.stringify(a)); }
  function writeNode(addr, patch) {
    var all = readNodes(), k = String(addr).toLowerCase(), rec = all[k] || {};
    for (var p in patch) { if (Object.prototype.hasOwnProperty.call(patch, p)) { rec[p] = patch[p]; } }
    all[k] = rec;
    lsSet(LS_NODES, JSON.stringify(all));
    return rec;
  }

  function notifyHost() {
    if (typeof window.GX_WALLET_REFRESH === "function") { try { window.GX_WALLET_REFRESH(); } catch (e) {} }
  }

  /* ---------------- 钱包 provider ---------------- */
  function getEth() {
    if (window.ethereum) { return window.ethereum; }
    if (window.web3 && window.web3.currentProvider) { return window.web3.currentProvider; }
    return null;
  }
  function waitProvider(ms) {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function poll() {
        var p = getEth();
        if (p && p.request) { resolve(p); return; }
        if (Date.now() - t0 >= ms) { resolve(null); return; }
        setTimeout(poll, 200);
      })();
    });
  }
  /* 超时兜底：钱包锁定/无响应时不让流程永久挂起 */
  function withTimeout(p, ms, fb) {
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(fb); } }, ms);
      Promise.resolve(p).then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
                             function () { if (!done) { done = true; clearTimeout(t); resolve(fb); } });
    });
  }
  function revoke(p) {
    var w = p || getEth();
    if (!w || !w.request) { return Promise.resolve(); }
    try {
      return w.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }
  /* 说明（2026-10-03）：连接流程**不再预先撤销授权**，撤销只发生在用户点「断开连接」时。
     历史坑：① 曾用 withTimeout(revoke(w), 2500)，撤销只等 2.5 秒，迟到的撤销会把刚授予的权限抹掉，
     签名随即 Unauthorized；② 改成等撤销结束后，又发现「刚撤销完紧接着请求账户」会被钱包当成
     自动拒绝直接回 4001 —— 两种表现都是「第一次连接不成功、第二次才行」（第二次权限已撤销，
     走的是不撤销的分支）。现在连接路径只有：请求账户 → 签名授权。 */
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  /* 钱包报错里取错误码/文案（MetaMask 走 code，部分钱包塞在 data.code） */
  function wErrCode(e) {
    if (!e) { return ""; }
    if (e.code !== undefined && e.code !== null && e.code !== "") { return e.code; }
    if (e.data && e.data.code !== undefined && e.data.code !== null && e.data.code !== "") { return e.data.code; }
    return "";
  }
  function wErrText(e) {
    if (!e) { return ""; }
    var c = wErrCode(e);
    var m = (e.message || (e.data && e.data.message) || (typeof e === "string" ? e : "") || "").toString();
    return (c !== "" ? "[" + c + "] " : "") + m;
  }
  /* 钱包里还有上一次没处理完的请求：MetaMask 对新的 eth_requestAccounts 会回 -32002 */
  function isWalletBusy(e) { return wErrCode(e) === -32002 || /already\s*process|already pending|resource unavailable/i.test(wErrText(e)); }
  /* 权限被抹掉：4100 = 未授权；-32603 部分钱包也拿它表示 unauthorized */
  function isWalletUnauthorized(e) { var c = wErrCode(e); return c === 4100 || c === -32603 || /unauthor|not been authorized|not authorized|permission/i.test(wErrText(e)); }
  function isUserRejected(e) { var c = wErrCode(e); return c === 4001 || /user (rejected|denied)|rejected the request|denied/i.test(wErrText(e)); }
  /* 最近一次钱包报错（现场排查用）：window.__GXW_LAST_ERR = { method, code, message, ms }
     同时在控制台留一条 warn，方便用户截图/复制。 */
  function noteErr(method, e, ms) {
    var rec = { method: method, code: wErrCode(e), message: wErrText(e), ms: ms };
    try { window.__GXW_LAST_ERR = rec; } catch (_) {}
    try { console.warn("[gx-wallet] " + method + " 失败：" + JSON.stringify(rec)); } catch (_) {}
    return rec;
  }
  function errTag(rec) {
    if (!rec) { return ""; }
    return "（" + rec.method + " · " + (rec.code !== "" && rec.code !== undefined ? rec.code + " · " : "") + rec.ms + "ms）";
  }
  /* 请求账户。现实里「第一次点了不成功」基本是这三种，都在这里兜住：
     ① 钱包里还有上一次没处理完的弹窗 → MetaMask 回 -32002「已在处理中」
     ② 个别钱包第一次请求返回空账户
     ③ 钱包在极短时间内回 4001（人不可能这么快点取消 = 自动拒绝）→ 重试一次
     用户真手动取消（耗时超过 1.2 秒的 4001）不重试，免得连环弹窗。 */
  function requestAccounts(w, tries) {
    var left = tries || 3;
    function attempt() {
      var t0 = Date.now();
      return w.request({ method: "eth_requestAccounts" }).then(function (accs) {
        var a = accs && accs[0];
        if (isAddr(a)) { return a; }
        if (left > 1) {
          left--;
          msg("", function () { return T("钱包没有返回账户，正在重试……", "Wallet returned no account - retrying..."); });
          return sleep(1200).then(attempt);
        }
        throw new Error(T("钱包没有返回账户", "wallet returned no account"));
      }, function (e) {
        var ms = Date.now() - t0;
        var rec = noteErr("eth_requestAccounts", e, ms);
        var busy = isWalletBusy(e), unauth = isWalletUnauthorized(e), fastReject = isUserRejected(e) && ms < 1200;
        if (left > 1 && (busy || unauth || fastReject)) {
          left--;
          msg("", function () {
            if (busy) { return T("钱包里似乎还有一个未完成的请求，正在等它结束……", "A previous wallet request is still pending - waiting for it to finish..."); }
            if (fastReject) { return T("钱包拒绝了本次请求，正在重试……", "The wallet rejected this request - retrying..."); }
            return T("正在重新请求钱包授权……", "Requesting wallet authorization again...");
          });
          return sleep(busy ? 1500 : 700).then(attempt);
        }
        throw e;
      });
    }
    return attempt();
  }
  /* 签名授权：若签名时发现权限已被钱包抹掉（撤销晚到等），重新请求一次账户再签 */
  function signAuth(w, a) {
    var text = buildConnectMessage(a);
    var t0 = Date.now();
    return signText(text, a).then(function (sig) { return { addr: a, sig: sig, text: text }; },
      function (e) {
        noteErr("personal_sign", e, Date.now() - t0);
        if (isUserRejected(e) || !isWalletUnauthorized(e)) { throw e; }
        /* 权限被钱包抹掉（撤销晚到等）：重新请求账户再签一次 */
        return requestAccounts(w, 2).then(function (a2) {
          var t2 = buildConnectMessage(a2);
          return signText(t2, a2).then(function (sig) { return { addr: a2, sig: sig, text: t2 }; });
        });
      });
  }
  function toHexUtf8(str) {
    if (typeof TextEncoder !== "undefined") {
      var bytes = new TextEncoder().encode(str), hex = "";
      for (var i = 0; i < bytes.length; i++) { hex += ("0" + bytes[i].toString(16)).slice(-2); }
      return "0x" + hex;
    }
    var esc2 = unescape(encodeURIComponent(str)), h = "";
    for (var j = 0; j < esc2.length; j++) { h += ("0" + esc2.charCodeAt(j).toString(16)).slice(-2); }
    return "0x" + h;
  }
  function fmtNow() {
    var t = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate()) + " " + p(t.getHours()) + ":" + p(t.getMinutes()) + ":" + p(t.getSeconds());
  }
  function signText(text, addr) {
    var w = getEth();
    if (!w || !w.request || !addr) { return Promise.reject(new Error("wallet not connected")); }
    return w.request({ method: "personal_sign", params: [toHexUtf8(text), addr] }).then(function (sig) {
      if (!sig || typeof sig !== "string" || sig.length < 20) { throw new Error("signature unavailable"); }
      return sig;
    });
  }
  function buildBindMessage(addr, ref) {
    var ts = fmtNow();
    return "Guixu Consensus - Terminal Referral Binding Authorization\n" +
      "Terminal (wallet): " + addr + "\n" +
      "Referrer (wallet): " + ref + "\n" +
      "Time: " + ts + "\n" +
      "Statement: I am the owner of this terminal and I authorize binding the referrer above to this terminal.\n" +
      "Nonce: " + ts + "-" + Math.random().toString(36).slice(2, 10);
  }
  function buildConnectMessage(addr) {
    var ts = fmtNow();
    return "Guixu Consensus - Terminal Wallet Authorization\n" +
      "Terminal (wallet): " + addr + "\n" +
      "Time: " + ts + "\n" +
      "Statement: I am the owner of this wallet. I authorize connecting it as this terminal's identity (the connection is invalid without this signature).\n" +
      "Nonce: " + ts + "-" + Math.random().toString(36).slice(2, 10);
  }
  function buildProfileMessage(addr) {
    var ts = fmtNow();
    return "Guixu Consensus - Terminal Profile Update Authorization\n" +
      "Terminal (wallet): " + addr + "\n" +
      "Time: " + ts + "\n" +
      "Statement: I am the owner of this terminal. I confirm updating this terminal's node profile (name and email) on the server.\n" +
      "Nonce: " + ts + "-" + Math.random().toString(36).slice(2, 10);
  }
  function apiReq(path, opt, ms) {
    opt = opt || {};
    var ctl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = null;
    if (ctl) { timer = setTimeout(function () { ctl.abort(); }, ms || 12000); opt.signal = ctl.signal; }
    return fetch(API + path, opt).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        return { status: r.status, body: j };
      });
    }).then(function (r) { if (timer) { clearTimeout(timer); } return r; }, function (e) { if (timer) { clearTimeout(timer); } throw e; });
  }
  function apiGet(path) { return apiReq(path, { cache: "no-store" }); }
  function apiPost(path, data) {
    return apiReq(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }, 15000);
  }
  function apiErrText(r) {
    var b = (r && r.body) || {};
    return b.message || b.code || (r && r.status ? ("HTTP " + r.status) : "unknown error");
  }

  /* ---------------- 渲染 ---------------- */
  /* 最后一条提示：存成“按当前语言生成文案”的函数，切语言 / 重渲染后依然能正确显示（不再残留旧语言） */
  var LAST_MSG = null;
  function msg(kind, text) {
    LAST_MSG = { kind: kind || "", text: (typeof text === "function" ? text : function () { return text || ""; }) };
    paintMsg();
  }
  function paintMsg() {
    var el = q("gxwMsg");
    if (!el) { return; }
    var base = el.getAttribute("data-base") || "gxw-msg";
    if (!LAST_MSG) { el.className = base; el.textContent = ""; return; }
    el.className = LAST_MSG.kind ? (base + " " + LAST_MSG.kind) : base;
    el.textContent = LAST_MSG.text();
  }

  /* 内联模式：不占独立卡片，只渲染「连接钱包」按钮 / 短地址 + 断开按钮（PC 端顶栏「节点主人」前使用） */
  function renderInline(mount, addr) {
    var h = [];
    if (!addr) {
      h.push('<button class="gxw-btn gxw-btn-sm" type="button" id="gxwConnect">' + T("连接钱包", "Connect Wallet") + '</button>');
      h.push('<span class="gxw-msg gxw-inline-msg" id="gxwMsg" data-base="gxw-msg gxw-inline-msg"></span>');
    } else {
      h.push('<span class="gxw-mono" style="font-size:.78em">' + esc(shortAddr(addr)) + '</span>');
      h.push('<button class="gxw-btn gxw-btn-sm ghost" type="button" id="gxwDisc">' + T("断开", "Disconnect") + '</button>');
      h.push('<span class="gxw-msg gxw-inline-msg" id="gxwMsg" data-base="gxw-msg gxw-inline-msg"></span>');
    }
    mount.innerHTML = h.join("");
    bind(addr);
    /* 内联模式的入口在此提前返回，提示文案也要重放（否则切语言后提示消失/残留旧语言） */
    paintMsg();
  }

  function render() {
    var mount = q(MOUNT_ID);
    if (!mount) { return; }
    injectCSS();

    var addr = readAddr();
    var shortMode = (mount.getAttribute("data-addr") || "full") === "short";
    if ((mount.getAttribute("data-mode") || "card") === "inline") { renderInline(mount, addr, shortMode); return; }
    var h = [];
    h.push('<div class="gx-card-head"><h3>' + T("钱包与节点身份", "Wallet &amp; Node Identity") + '</h3>');
    h.push('<span class="gx-sub">' + T("连接后作为本机终端身份，仅保存在本机", "Used as this terminal&rsquo;s identity, stored locally") + '</span></div>');

    if (!addr) {
      h.push('<p class="gxw-note">' + T(
        "未连接钱包。点击下方按钮手动连接；本页不会自动连接。连接后节点名称、推荐关系等身份信息将以本机钱包地址为准。",
        "No wallet connected. Use the button below to connect manually &mdash; this page never connects automatically. Your wallet address becomes this terminal&rsquo;s identity.") + '</p>');
      h.push('<button class="gxw-btn" type="button" id="gxwConnect">' + T("连接钱包", "Connect Wallet") + '</button>');
      var pendNC = pendingInviteRef("");
      if (pendNC) {
        h.push('<div class="gxw-msg">' + T("你通过邀请链接访问：连接钱包并签名后，推荐人 " + shortAddr(pendNC) + " 会自动填入。",
          "You arrived via an invite link: after you connect and sign, referrer " + shortAddr(pendNC) + " will be pre-filled.") + '</div>');
      }
      h.push('<div class="gxw-msg" id="gxwMsg"></div>');
    } else {
      var nodes = readNodes();
      var rec = nodes[addr.toLowerCase()] || {};
      var bound = !!String(rec.ref || "").trim();
      h.push('<div class="gxw-line"><span class="gxw-k">' + T("钱包地址", "Wallet Address") + '</span><span class="gxw-mono" title="' + esc(addr) + '">' + esc(shortMode ? shortAddr(addr) : addr) + '</span>' + (shortMode ? '<button class="gxw-copy" type="button" data-gxw-copy="' + esc(addr) + '">' + T("复制", "Copy") + '</button>' : '') + '</div>');
      h.push('<div class="gxw-row"><input id="gxwName" type="text" maxlength="40" placeholder="' + T("节点名称（可选）", "Node name (optional)") + '" value="' + esc(rec.name || "") + '">');
      h.push('<input id="gxwMail" type="email" maxlength="80" placeholder="' + T("邮箱（可选）", "Email (optional)") + '" value="' + esc(rec.email || "") + '"></div>');
      h.push('<div class="gxw-dup" id="gxwDup"></div>');
      h.push('<div class="gxw-row"><button class="gxw-btn" type="button" id="gxwSave">' + T("保存", "Save") + '</button>');
      h.push('<button class="gxw-btn ghost" type="button" id="gxwDisc">' + T("断开连接", "Disconnect") + '</button></div>');

      h.push('<div class="gxw-sep"></div>');
      h.push('<div class="gxw-line"><span class="gxw-k">' + T("我的推荐码", "My referral code") + '</span><span class="gxw-mono">' + esc(shortAddr(addr)) + '</span></div>');
      /* 邀请链接：完整链接同样展示在「我的推荐码」卡片里，这里给一个一键复制的入口 */
      h.push('<div class="gxw-row"><button class="gxw-btn ghost gxw-btn-sm" type="button" data-gxw-copy="' + esc(inviteLink(addr)) + '" data-gxw-copy-kind="link">' + T("复制邀请链接", "Copy invite link") + '</button></div>');
      /* 推荐人区块：是否显示「绑定推荐人」由服务端绑定状态决定（已绑定则整块隐藏，见 renderReferrer） */
      h.push('<div id="gxwRefArea"></div>');
      h.push('<div class="gxw-stats" id="gxwStats">' + T("直推", "Direct") + '<b id="gxwDirect">-</b>' + '<span>' + T("团队", "Team") + '</span><b id="gxwTeam">-</b></div>');
      h.push('<div class="gxw-msg" id="gxwMsg"></div>');
    }
    mount.innerHTML = h.join("");
    bind(addr);
    if (addr) {
      attachDupCheck(addr, "gxwName", "gxwMail", "gxwDup", q("gxwSave"));
      loadStats(addr);
      /* 已绑定推荐人的钱包：不渲染绑定入口（服务端为准，见 /api/referral/info） */
      renderReferrer(q("gxwRefArea"), addr, shortMode);
    }
    /* 宿主页扩展钩子：手机端把「连接指引 / 服务端绑定状态」并入同一张卡片（与页面自带的
       身份卡片合并，避免同屏重复）。桌面端为 inline 模式，不经过这里，不受影响。 */
    if (typeof window.GX_WALLET_EXTRA === "function") { try { window.GX_WALLET_EXTRA(mount, addr); } catch (e) {} }
    /* 切语言 / 重渲染后浮层文案跟着走（重绘会清掉浮层内的临时提示，仅在有激活提醒时执行） */
    if (SWITCH.active) { try { renderSwitchTip(); } catch (e) {} }
    paintMsg();
  }

  /* ---------------- 邀请链接（推荐码分享） ----------------
     链接形如 https://<本页所在域>/…?ref=0x…：把推荐码（钱包地址）带在 URL 里。
     对方打开后本机先记住这个地址，等其连接钱包、渲染出「绑定推荐人」输入框时自动填入。
     基础路径按域切换：node.guixu.club 的用户终端入口在根路径，
     其它域（www.guixu.club / guixu.club 等）在 /terminal/。 */
  var LS_INVITE = "gx_invite_ref";
  var REF_PARAM = "ref";

  function inviteBase() {
    var proto = location.protocol === "http:" ? "http:" : "https:";
    var host = location.host || "";
    var path = /(^|\.)node\./.test(host) ? "/" : "/terminal/";
    return proto + "//" + host + path;
  }
  function inviteLink(addr) {
    return inviteBase() + "?" + REF_PARAM + "=" + String(addr || "").toLowerCase();
  }
  function readInviteRef() {
    var v = lsGet(LS_INVITE);
    return isAddr(v) ? String(v).toLowerCase() : "";
  }
  /* 开机调用：URL 带 ref 就记到本机（记完从地址栏去掉，不再继续往后传），返回记下的地址 */
  function captureInviteRef() {
    var m = null;
    try {
      m = new RegExp("[?&#]" + REF_PARAM + "=(0x[0-9a-fA-F]{40})")
        .exec(String(location.search || "") + String(location.hash || ""));
    } catch (e) { m = null; }
    if (m) {
      lsSet(LS_INVITE, m[1].toLowerCase());
      try {
        if (window.history && history.replaceState) {
          var qs = String(location.search || "").replace(/^\?/, "").split("&").filter(function (kv) {
            return kv && kv.indexOf(REF_PARAM + "=") !== 0;
          }).join("&");
          history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + String(location.hash || ""));
        }
      } catch (e) {}
    }
    return readInviteRef();
  }
  /* 待填入的推荐人；打开链接的人自己就是推荐人（自己开自己的链接）时不填 */
  function pendingInviteRef(selfAddr) {
    var v = readInviteRef();
    if (v && String(selfAddr || "").toLowerCase() === v) { return ""; }
    return v;
  }
  function clearInviteRef() { lsDel(LS_INVITE); }

  /* 邀请链接区块：完整链接 + 复制按钮 + 说明（手机端「我的推荐码」卡片 / PC 端钱包身份卡共用） */
  function renderInvite(root, addr) {
    if (!root) { return ""; }
    injectCSS();
    if (!isAddr(addr)) { root.innerHTML = ""; return ""; }
    var link = inviteLink(addr);
    root.innerHTML =
      '<div class="gxw-line gxw-line-wrap"><span class="gxw-k">' + T("邀请链接", "Invite link") + '</span>' +
      '<span class="gxw-mono" title="' + esc(link) + '">' + esc(link) + '</span></div>' +
      '<div class="gxw-row"><button class="gxw-btn" type="button" data-gxw-copy="' + esc(link) + '" data-gxw-copy-kind="link">' +
      T("复制邀请链接", "Copy invite link") + '</button></div>' +
      '<div class="gxw-msg">' + T(
        "对方打开该链接后，推荐人会自动填入你的钱包地址；连接钱包并签名即完成绑定。",
        "Opening the link pre-fills your wallet address as the referrer; the recipient connects a wallet and signs to bind.") +
      '</div>';
    return link;
  }

  /* ---------------- 推荐人绑定状态（服务端为准） ----------------
     规则（2026-09-29 用户要求）：只要该钱包**已经绑定过推荐人**，就不再渲染「绑定推荐人」按钮
     （手机端 / PC 端一致）；已绑定的推荐人只读展示，仅后台管理端（管理员密钥）可强制改绑 / 解绑。
     判定顺序：服务端 /api/referral/info → 本机 localStorage 记录（接口不可达时兜底）。
     待服务端返回前显示「正在读取绑定状态……」，避免先闪出按钮再消失。 */
  var REF_CACHE = {};   /* addr(lower) -> {bound, referrer, source, name, email, offline?} 本会话缓存 */

  function refState(addr) {
    var k = String(addr).toLowerCase();
    var rec = readNodes()[k] || {};
    var localRef = String(rec.ref || "").trim();
    var info = REF_CACHE[k];
    if (info && info.bound) { return { known: true, bound: true, ref: String(info.referrer || ""), source: info.source || "" }; }
    if (info) { return { known: true, bound: false, ref: "", source: "" }; }
    /* 服务端状态未知（首次渲染 / 接口不可达）：退回本机记录，未绑定则仍允许绑定 */
    return { known: false, bound: !!localRef, ref: localRef, source: "" };
  }

  /* 用服务端结果同步本机记录，让页面其它区块（身份卡 / 团队统计）与后台保持一致 */
  function applySrvRef(addr, info) {
    var k = String(addr).toLowerCase(), rec = readNodes()[k] || {};
    if (info && info.bound && info.referrer) {
      var patch = { ref: String(info.referrer).toLowerCase(), srv: true };
      if (!String(rec.name || "").trim() && info.name) { patch.name = info.name; }
      if (!String(rec.email || "").trim() && info.email) { patch.email = info.email; }
      writeNode(addr, patch);
    } else if (info && !info.bound && String(rec.ref || "").trim()) {
      /* 后台已解绑：清掉本机残留的推荐人，避免继续显示为已绑定 */
      writeNode(addr, { ref: "", srv: false });
    } else {
      return;
    }
    notifyHost();
  }

  function paintReferrer(root, addr) {
    if (!root) { return; }
    var st = refState(addr), h = [];
    if (st.bound) {
      /* 已绑定的推荐人地址默认缩略显示（0x1234...abcd，title 仍保留全量）：
         只有显式 data-gxw-ref-short="0" 的容器才显示完整地址 */
      var shortMode = root.getAttribute("data-gxw-ref-short") !== "0";
      h.push('<div class="gxw-line"><span class="gxw-k">' + T("推荐人", "Referrer") + '</span><span class="gxw-mono" title="' + esc(st.ref) + '">' + esc(shortMode ? shortAddr(st.ref) : st.ref) + '</span></div>');
      h.push('<div class="gxw-msg">' + T("推荐人已绑定。", "Referrer bound.") +
        (st.source === "admin" ? T("（由后台管理员写入）", " (set by admin)") : "") + '</div>');
      root.setAttribute("data-gxw-bound", "1");
    } else if (!st.known) {
      h.push('<div class="gxw-msg">' + T("正在读取绑定状态……", "Checking binding status...") + '</div>');
      root.removeAttribute("data-gxw-bound");
    } else {
      /* 通过邀请链接进来的：自动把链接里的推荐人地址填进输入框 */
      var pend = pendingInviteRef(addr);
      h.push('<div class="gxw-row"><input id="gxwRef" type="text" maxlength="42" placeholder="' + T("推荐人钱包地址（可选）", "Referrer wallet address (optional)") + '" value="' + (pend ? esc(pend) : "") + '">');
      h.push('<button class="gxw-btn" type="button" id="gxwBind">' + T("绑定推荐人", "Bind referrer") + '</button></div>');
      h.push('<div class="gxw-msg">' + (pend
        ? T("已自动填入邀请链接中的推荐人地址；绑定需钱包签名授权。", "Pre-filled from the invite link. Binding requires a wallet signature.")
        : T("绑定需钱包签名授权，签名后写入服务器。", "Binding requires a wallet signature and is recorded on the server.")) + '</div>');
      root.removeAttribute("data-gxw-bound");
    }
    root.innerHTML = h.join("");
    bindRefForm(root);
  }

  /* 挂载推荐人区块（可复用：手机端卡片 / PC 端钱包身份卡都用这一份逻辑） */
  function renderReferrer(root, addr, shortMode) {
    if (!root) { return; }
    if (!isAddr(addr)) { root.innerHTML = ""; root.removeAttribute("data-gxw-bound"); root.removeAttribute("data-gxw-ref-addr"); return; }
    root.setAttribute("data-gxw-ref-addr", addr);
    if (shortMode !== undefined && shortMode !== null) { root.setAttribute("data-gxw-ref-short", shortMode ? "1" : "0"); }
    var k = String(addr).toLowerCase();
    paintReferrer(root, addr);
    if (REF_CACHE[k]) { return; }
    apiGet("/referral/info?terminal=" + encodeURIComponent(addr)).then(function (r) {
      var b = (r && r.body) || {};
      if (b.ok !== true) { throw new Error(apiErrText(r)); }
      REF_CACHE[k] = {
        bound: !!b.bound, referrer: b.bound ? String(b.referrer || "") : "",
        source: b.source || "", name: b.name || "", email: b.email || ""
      };
      applySrvRef(addr, REF_CACHE[k]);
      paintReferrer(root, addr);
    }).catch(function () {
      /* 接口不可达：用本机记录兜底，未绑定时仍可正常绑定（不因网络问题锁死功能） */
      var rec = readNodes()[k] || {}, lr = String(rec.ref || "").trim();
      REF_CACHE[k] = { bound: !!lr, referrer: lr, source: "", offline: true };
      paintReferrer(root, addr);
    });
  }

  /* 刷新页面上所有已挂载的推荐人区块（后台改绑后手动刷新 / 地址切换时用） */
  function updateRefAreas() {
    var areas = document.querySelectorAll("#gxwRefArea, #wiRef, [data-gxw-ref-area]");
    for (var i = 0; i < areas.length; i++) {
      var el = areas[i];
      var a = el.getAttribute("data-gxw-ref-addr") || readAddr();
      renderReferrer(el, a);
    }
  }

  function bindRefForm(root) {
    var btn = root.querySelector("#gxwBind");
    if (!btn) { return; }
    btn.addEventListener("click", function () {
      var ref = ((root.querySelector("#gxwRef") || {}).value || "").trim();
      var cur = readAddr();
      if (!cur) { return; }
      if (!isAddr(ref)) {
        msg("warn", function () { return T("请输入合法的推荐人钱包地址（0x 开头，42 位）。", "Enter a valid referrer wallet address (0x, 42 chars)."); });
        return;
      }
      if (ref.toLowerCase() === cur.toLowerCase()) {
        msg("warn", function () { return T("不能把自己绑定为推荐人。", "You cannot bind yourself as the referrer."); });
        return;
      }
      var name = ((q("gxwName") || {}).value || "").trim();
      var mail = ((q("gxwMail") || {}).value || "").trim();
      btn.disabled = true;
      msg("", function () { return T("等待钱包签名授权……", "Waiting for wallet signature..."); });
      var text = buildBindMessage(cur, ref);
      signText(text, cur).then(function (sig) {
        return apiPost("/referral/bind", { terminal: cur, referrer: ref, sig: sig, sig_msg: text, name: name, email: mail }).then(function (r) {
          if (!r.body || r.body.ok !== true) { throw new Error(apiErrText(r)); }
          writeNode(cur, { name: name, email: mail, ref: ref, sig: sig, sigMsg: text, sigTs: Date.now(), srv: true });
          REF_CACHE[String(cur).toLowerCase()] = { bound: true, referrer: String(ref).toLowerCase(), source: "signature" };
          if (window.GXLOG) { window.GXLOG.wallet("referral.bind", "绑定推荐人 " + shortAddr(ref) + "（签名验证通过）", cur); }
          clearInviteRef();      /* 绑定完成：清掉邀请链接里的暂存推荐人，避免下次误填 */
          notifyHost();
          paintReferrer(root, cur);
          msg("ok", function () { return T("推荐人已绑定，签名验证通过并已写入服务器。", "Referrer bound — signature verified and saved to the server."); });
        });
      }).catch(function (err) {
        msg("warn", function () { return T("绑定失败：", "Binding failed: ") + (err && err.message ? err.message : ""); });
        /* 若服务端说「已绑定其他推荐人」，说明状态已变：刷新状态并把绑定入口收起 */
        var k2 = String(cur).toLowerCase();
        REF_CACHE[k2] = { bound: true, referrer: String((readNodes()[k2] || {}).ref || ""), source: "" };
        apiGet("/referral/info?terminal=" + encodeURIComponent(cur)).then(function (r) {
          var b = (r && r.body) || {};
          if (b.ok === true && b.bound) {
            REF_CACHE[k2] = { bound: true, referrer: String(b.referrer || ""), source: b.source || "" };
            applySrvRef(cur, REF_CACHE[k2]);
          } else if (b.ok === true) {
            REF_CACHE[k2] = { bound: false, referrer: "", source: "" };
          }
          paintReferrer(root, cur);
        }).catch(function () { paintReferrer(root, cur); });
      });
    });
  }

  /* ---------------- 账户切换提醒（重新授权签名） ----------------
     场景：用户先在钱包里换账户（accountsChanged），或关页期间换过账户再进终端（reconcileWallet）。
     旧行为：已签名账户静默切换、未签名账户静默清身份 —— 界面上只变成「未连接」，用户不知道自己
     已经不在原账户上，也不会想到要重新签名。现在统一主动提示，并给出一键重新授权的入口。 */
  var SWITCH = { prev: "", next: "", active: false };

  function switchAckKey(pv, nx) { return String(pv || "").toLowerCase() + ">" + String(nx || "").toLowerCase(); }
  function switchAcked(pv, nx) {
    try { return sessionStorage.getItem("gx_wallet_switch_ack") === switchAckKey(pv, nx); } catch (e) { return false; }
  }
  function switchAck(pv, nx) { try { sessionStorage.setItem("gx_wallet_switch_ack", switchAckKey(pv, nx)); } catch (e) {} }

  function hideSwitchTip() {
    SWITCH.active = false;
    var el = q("gxwSwitch");
    if (el) { el.className = "gxw-switch"; }
  }

  function switchSay(kind, txt) {
    var sm = q("gxwSwitchMsg");
    if (!sm) { return; }
    sm.className = kind ? ("gxw-msg " + kind) : "gxw-msg";
    sm.textContent = txt || "";
  }

  /* 浮层里的一键重新授权：直接对钱包当前账户重新签名，成功后身份随之更新 */
  function authorizeSwitch() {
    var btn = q("gxwSwitchSign");
    if (btn) { btn.disabled = true; }
    switchSay("", T("请在钱包中确认签名授权……", "Confirm the authorization signature in your wallet..."));
    waitProvider(4000).then(function (w) {
      if (!w) { throw new Error(T("未检测到浏览器钱包", "no browser wallet detected")); }
      return w.request({ method: "eth_accounts" }).then(function (accs) {
        var cur = accs && accs[0];
        var target = isAddr(cur) ? cur : SWITCH.next;
        if (!isAddr(target)) { throw new Error(T("钱包没有返回账户", "wallet returned no account")); }
        return signAuth(w, target).then(function (r) {
          writeAddr(r.addr);
          writeNode(r.addr, { authSig: r.sig, authMsg: r.text, authTs: Date.now() });
          switchAck(SWITCH.prev, r.addr);
          if (window.GXLOG) { window.GXLOG.wallet("wallet.reauthorize", "账户切换后重新授权签名（原 " + shortAddr(SWITCH.prev) + "）", r.addr); }
          presencePing("connect");
          hideSwitchTip();
          notifyHost();
          render();
          msg("ok", function () { return T("已重新授权签名：" + shortAddr(r.addr), "Re-authorized signature for " + shortAddr(r.addr)); });
        });
      });
    }).catch(function (e) {
      if (btn) { btn.disabled = false; }
      switchSay("warn", isUserRejected(e)
        ? T("你在钱包中取消了签名，尚未完成重新授权。", "You dismissed the signature - re-authorization not completed.")
        : T("重新授权未完成：", "Re-authorization incomplete: ") + wErrText(e));
    });
  }

  function renderSwitchTip() {
    var el = q("gxwSwitch");
    if (!el) {
      el = document.createElement("div");
      el.id = "gxwSwitch";
      el.className = "gxw-switch";
      el.setAttribute("role", "alertdialog");
      document.body.appendChild(el);
    }
    var pv = SWITCH.prev, nx = SWITCH.next;
    var h = [];
    h.push('<div class="gxw-switch-h">' + T("检测到钱包账户已切换，请重新授权签名", "Wallet account changed - please re-authorize the signature") + '</div>');
    h.push('<div class="gxw-switch-b">' +
      (pv ? T("原身份 ", "Previous identity ") + '<b>' + esc(shortAddr(pv)) + '</b>' + T(" → 当前账户 ", " → current account ") : T("当前账户 ", "Current account ")) +
      '<b>' + (nx ? esc(shortAddr(nx)) : T("（钱包未返回账户）", "(no account returned)")) + '</b>。' +
      (nx
        ? T("本终端的身份由钱包签名授权产生，与账户一一绑定：在重新授权签名前，本机不会以该账户上报资源与结算收益。",
            "This terminal\u2019s identity is produced by a wallet signature and is bound to one account: until you re-authorize, nothing is reported or settled under this account.")
        : T("钱包已不再提供该账户，需重新连接并授权签名。", "The wallet no longer exposes this account - reconnect and sign again.")) +
      '</div>');
    h.push('<div class="gxw-switch-a">');
    h.push('<button class="gxw-btn gxw-btn-sm" type="button" id="gxwSwitchSign">' + T("重新授权签名", "Re-authorize signature") + '</button>');
    h.push('<button class="gxw-switch-x" type="button" id="gxwSwitchLater">' + T("稍后提醒", "Later") + '</button>');
    h.push('</div>');
    h.push('<div class="gxw-msg" id="gxwSwitchMsg"></div>');
    el.innerHTML = h.join("");
    el.className = "gxw-switch show";
    SWITCH.active = true;
    var bSign = q("gxwSwitchSign");
    if (bSign) { bSign.addEventListener("click", authorizeSwitch); }
    var bLater = q("gxwSwitchLater");
    if (bLater) {
      bLater.addEventListener("click", function () {
        switchAck(SWITCH.prev, SWITCH.next);
        hideSwitchTip();
        msg("warn", function () { return T("钱包账户已切换，尚未重新授权签名。", "Wallet account changed - signature not re-authorized yet."); });
      });
    }
  }

  /* 账户切换统一入口：prev = 原身份（可为空），next = 钱包当前账户（可为空）。
     同时刷新浮层与钱包卡内提示，保证 PC 端顶栏小字与浮层看到的是同一件事。 */
  function onAccountSwitch(pv, nx, kind) {
    if (window.GXLOG) { window.GXLOG.wallet("wallet.switch", "钱包已切换：" + shortAddr(pv) + " 换成 " + (nx ? shortAddr(nx) : "无账户") + (kind === "signed" ? "（已签名）" : "（未签名）"), nx, (kind === "unsigned" || !nx) ? "warn" : "info"); }
    SWITCH.prev = pv || "";
    SWITCH.next = nx || "";
    if (!switchAcked(SWITCH.prev, SWITCH.next)) { renderSwitchTip(); }
    if (kind === "signed") {
      msg("warn", function () { return T("钱包账户已切换至 " + shortAddr(nx) + "，本机存有该账户的旧签名；建议重新授权签名。",
        "Wallet switched to " + shortAddr(nx) + ". An older signature for this account exists locally - re-authorizing is recommended."); });
    } else if (nx) {
      msg("warn", function () { return T("钱包账户已切换至 " + shortAddr(nx) + "，需重新授权签名后才能以该账户使用本终端。",
        "Wallet switched to " + shortAddr(nx) + ". Re-authorize the signature before using this terminal with it."); });
    } else {
      msg("warn", function () { return T("钱包已不再提供原账户，需重新连接并授权签名。",
        "The wallet no longer exposes the previous account - reconnect and sign again."); });
    }
  }

  /* ---------------- 钱包账户变化：一次性常驻注册 ----------------
     坑：原先 accountsChanged 只在「连接成功」分支里注册。于是刷新页面后（本机已存身份、没再点连接）
     根本没有监听器 —— 在钱包里换账户，本页毫无反应，必须手动「断开连接」再连一次才能识别。
     现在改为模块级注册一次、常驻生效；重复调用会被 WALLET_HOOKED 拦住，也不会叠加监听器。

     未连接状态下不自动占用身份：身份必须由钱包签名授权产生，
     所以本机没有记录时，钱包切账户不会让本页悄悄「认领」一个没签过名的地址。 */
  /* 身份 = 地址 + 签名，两者缺一不可。
     只有「该地址在本机存有签名授权记录」时，才允许把它当作已连接身份。
     否则页面会出现「打开就自动连上了」的假连接（TP 等钱包的 eth_accounts 会直接吐当前账户，
     但它并没有为我们这个站点签过名）。 */
  function signedRecord(addr) {
    if (!isAddr(addr)) { return null; }
    var nodes = readNodes();
    var rec = nodes[String(addr).toLowerCase()] || {};
    return (rec && rec.authSig && rec.authMsg) ? rec : null;
  }

  var WALLET_HOOKED = false;
  function hookWalletEvents() {
    if (WALLET_HOOKED) { return; }
    var w = getEth();
    if (!w || !w.on) { return; }
    WALLET_HOOKED = true;
    try {
      w.on("accountsChanged", function (list) {
        var prev = readAddr();
        if (!prev) { return; }              /* 未连接：不因钱包切账户而自动占用身份 */
        var na = list && list[0];
        if (!isAddr(na)) {
          /* 钱包锁定 / 撤回账户：不静默失联，清身份并提示重新连接签名 */
          lsDel(LS_WALLET); notifyHost(); render();
          SWITCH.prev = prev; SWITCH.next = "";
          if (prev) { onAccountSwitch(prev, "", "none"); }
          return;
        }
        if (String(na).toLowerCase() === String(prev).toLowerCase()) { return; }
        /* 新账户在本机签过名 → 认同切换，但仍主动提醒（可一键重新授权）；
           没签过 → 视为未连接，必须重新连接并签名 */
        if (signedRecord(na)) {
          writeAddr(na); notifyHost(); render();
          onAccountSwitch(prev, na, "signed");
        } else {
          lsDel(LS_WALLET); notifyHost(); render();
          onAccountSwitch(prev, na, "unsigned");
        }
      });
      /* 链切换：身份不变，但要刷新界面与上报上下文 */
      w.on("chainChanged", function () { notifyHost(); render(); });
    } catch (e) {}
  }

  /* 开机与钱包当前账户对齐：本机有身份记录、而钱包当前账户已变（例如关页期间换过账户）时，
     立即以钱包为准更新显示，不必先断开。eth_accounts 是静默查询，不会弹窗。
     新账户若还没有连接签名，界面会提示「需重新连接钱包签名」——这是应该的。 */
  function reconcileWallet() {
    var cur = readAddr();
    if (!cur) { return; }
    var w = getEth();
    if (!w || !w.request) { return; }
    try {
      w.request({ method: "eth_accounts" }).then(function (accs) {
        var na = accs && accs[0];
        var cur = readAddr();
        if (!cur) { return; }
        if (!isAddr(na)) {
          /* 钱包没给出账户（锁定/未授权）：保留已有的已签名身份，不因查询不到就断连 */
          return;
        }
        if (String(na).toLowerCase() === String(cur).toLowerCase()) { return; }
        if (signedRecord(na)) {
          writeAddr(na); notifyHost(); render();      /* 这个账户本机签过名 → 认同 */
          onAccountSwitch(cur, na, "signed");
        } else {
          /* 钱包当前账户从未签过名 → 绝不能显示成「已连接」，请用户重新连接并签名 */
          lsDel(LS_WALLET); notifyHost(); render();
          onAccountSwitch(cur, na, "unsigned");
        }
      }).catch(function () {});
    } catch (e) {}
  }

  function bind(addr) {
    /* 注意：每个按钮各自持有变量，禁止复用同一个变量，否则未连接态下会被置空导致点击报错 */
    var btnConnect = q("gxwConnect");
    if (btnConnect) {
      btnConnect.addEventListener("click", function () {
        var self = btnConnect;
        var settled = false;
        var guard = null;
        function finish() {
          if (settled) { return; }
          settled = true;
          if (guard) { clearTimeout(guard); }
          self.disabled = false;
        }
        self.disabled = true;
        msg("", function () { return T("正在连接钱包……", "Connecting wallet..."); });
        /* 兜底：钱包锁定或长时间无响应时，恢复按钮并提示，避免永久卡在连接中 */
        guard = setTimeout(function () {
          if (settled) { return; }
          settled = true;
          self.disabled = false;
          msg("warn", function () { return T("钱包长时间无响应。请先在钱包中解锁账户再重试，或刷新页面。", "Wallet not responding. Unlock your wallet and try again, or reload the page."); });
        }, 120000);
        waitProvider(4000).then(function (w) {
          if (!w) {
            msg("warn", function () { return T("未检测到浏览器钱包。请安装钱包插件（MetaMask / OKX），或在手机钱包 App 的内置浏览器中打开本页后刷新。",
              "No browser wallet detected. Install a wallet extension (MetaMask / OKX), or open this page in your wallet app's built-in browser."); });
            finish();
            return;
          }
          /* 连接只做一件事：请求账户 → 签名授权，**不再先撤销授权**。
             理由（2026-10-03 实测结论）：撤销在 MetaMask 里自己会弹一个确认框；而且刚撤销完
             紧接着请求账户，钱包会把它当成「自动拒绝」直接回 4001 —— 表现就是
             「第一次点连不上（提示已取消授权）、第二次才行」（第二次权限已被撤掉，走的是不撤销的分支）。
             需要换账户时用「断开连接」按钮（它仍然撤销授权），再点连接就会重新弹出账户选择。 */
          return requestAccounts(w)
            .then(function (a) {
              /* 必须签名授权：仅在钱包签名通过后才写入本机身份，否则保持未连接 */
              msg("", function () { return T("请在钱包中确认签名授权……", "Confirm the authorization signature in your wallet..."); });
              return signAuth(w, a).then(function (r) {
                writeAddr(r.addr);
                writeNode(r.addr, { authSig: r.sig, authMsg: r.text, authTs: Date.now() });
                presencePing("connect");   /* 连接成功立刻给后台发一次在线信号 */
                if (window.GXLOG) { window.GXLOG.wallet("wallet.connect", "连接钱包并签名授权成功", r.addr); }
                hookWalletEvents();   /* 常驻监听，见下方说明；不再每次连接都注册一遍 */

                hideSwitchTip();          /* 已按当前账户签名，切换提醒随之收起 */
                notifyHost();
                msg("ok", function () { return T("钱包已连接（签名授权通过）。", "Wallet connected (signature authorized)."); });
                render();
                finish();
              });
            }).catch(function (err) {
              var detail = wErrText(err);
              var tag = errTag(window.__GXW_LAST_ERR);
              msg("warn", function () {
                if (isUserRejected(err)) {
                  return T("你在钱包中取消了授权，尚未连接；可再点一次「连接钱包」。",
                           "You dismissed the authorization in your wallet - not connected yet. You can click Connect Wallet again.") + tag;
                }
                return T("连接未完成：", "Connection incomplete: ") + detail + tag;
              });
            }).then(function () { finish(); });
        });
      });
    }

    var btnDisc = q("gxwDisc");
    if (btnDisc) {
      btnDisc.addEventListener("click", function () {
        revoke();
        lsDel(LS_WALLET);
        hideSwitchTip();
        notifyHost();
        msg("", function () { return T("已断开连接。", "Disconnected."); });
        render();
      });
    }

    var btnSave = q("gxwSave");
    if (btnSave) {
      btnSave.addEventListener("click", function () {
        var name = ((q("gxwName") || {}).value || "").trim();
        var mail = ((q("gxwMail") || {}).value || "").trim();
        var cur = readAddr();
        if (!cur) { return; }
        /* 保存逻辑与 PC 端「钱包身份」卡的档案编辑区共用（见 saveProfile） */
        saveProfile(cur, name, mail, msg, btnSave, { onLocalSave: render });
      });
    }
  }

  /* ---------------- 节点档案（节点名 / 邮箱）编辑区 ----------------
     手机端卡片内建同样的输入框；PC 端钱包身份卡通过 renderProfile 挂载，保存逻辑共用一份。
     root   : 容器元素
     addr   : 钱包地址
     prefix : 元素 id 前缀（默认 gxp → gxpName / gxpMail / gxpSave / gxpMsg）
     opts   : { disconnect: 是否在保存旁附「断开连接」按钮（默认否）, onLocalSave: 仅本机保存后的回调 } */
  var PROFILE_MSG = {};   /* prefix -> {kind, text:fn, addr}：文案存函数，切语言 / 重渲染后仍按当前语言显示 */

  /* ---------------- 名称 / 邮箱查重（输入即校验） ----------------
     口径与服务端一致：去首尾空白、不区分大小写；空值不查；自己已占用的值不算冲突。
     复用本机已有的连接授权签名（不额外弹窗）；没有签名就不查，交由服务端兜底把关。 */
  var DUP_SEQ = 0, DUP_TIMER = {};
  var DUP_CSS = ".gxw-dup{display:block;font-size:.74em;line-height:1.35;margin:3px 0 0;opacity:.9}" +
                ".gxw-dup-busy{opacity:.6}.gxw-dup-ok{color:#4ade80}.gxw-dup-bad{color:#f87171}" +
                "button.gxw-btn[disabled]{opacity:.45;cursor:not-allowed}";
  function injectDupCSS() {
    if (q("gxwDupCss")) { return; }
    var s = document.createElement("style");
    s.id = "gxwDupCss";
    s.appendChild(document.createTextNode(DUP_CSS));
    document.head.appendChild(s);
  }
  function dupCheck(addr, name, mail, cb) {
    var rec = readNodes()[String(addr || "").toLowerCase()] || {};
    if (!rec.authSig || !rec.authMsg) { cb(null); return; }
    apiPost("/referral/check", { terminal: addr, sig: rec.authSig, sig_msg: rec.authMsg,
                                 name: name || "", email: mail || "" }).then(function (r) {
      var b = (r && r.body) || {};
      cb(b.ok === true ? { name_taken: !!b.name_taken, email_taken: !!b.email_taken } : null);
    }).catch(function () { cb(null); });
  }
  /* 给一对输入框挂上查重：450ms 防抖 + 失焦立即查；有冲突就禁用提交按钮 */
  function attachDupCheck(addr, idName, idMail, idHint, btn) {
    var nEl = document.getElementById(idName), mEl = document.getElementById(idMail), hint = document.getElementById(idHint);
    if (!nEl || !mEl || !hint) { return; }
    injectDupCSS();
    var setBtn = function (off) { if (btn) { btn.disabled = !!off; } };
    var run = function () {
      var n = (nEl.value || "").trim(), m = (mEl.value || "").trim();
      if (!n && !m) { hint.className = "gxw-dup"; hint.textContent = ""; setBtn(false); return; }
      var seq = ++DUP_SEQ;
      hint.className = "gxw-dup gxw-dup-busy";
      hint.textContent = T("检查中…", "Checking...");
      dupCheck(addr, n, m, function (res) {
        if (seq !== DUP_SEQ) { return; }          /* 已有更新的请求，丢弃本次过期结果 */
        if (!res) { hint.className = "gxw-dup"; hint.textContent = ""; setBtn(false); return; }
        var bad = [];
        if (res.name_taken) { bad.push(T("节点名称已被使用", "node name already taken")); }
        if (res.email_taken) { bad.push(T("邮箱已被使用", "email already taken")); }
        if (bad.length) {
          hint.className = "gxw-dup gxw-dup-bad";
          hint.textContent = "\u2717 " + bad.join(T("；", "; ")) + T("，不可重复", " — must be unique");
          setBtn(true);                            /* 有冲突就不能完成提交 */
        } else {
          hint.className = "gxw-dup gxw-dup-ok";
          hint.textContent = "\u2713 " + T("名称与邮箱均可使用", "name and email available");
          setBtn(false);
        }
      });
    };
    var deb = function () { clearTimeout(DUP_TIMER[idHint]); DUP_TIMER[idHint] = setTimeout(run, 450); };
    nEl.addEventListener("input", deb);
    mEl.addEventListener("input", deb);
    nEl.addEventListener("blur", run);
    mEl.addEventListener("blur", run);
  }

  function saveProfile(cur, name, mail, say, btn, opts) {
    opts = opts || {};
    if (typeof say !== "function") { say = function () {}; }
    var rec = readNodes()[String(cur).toLowerCase()] || {};
    var hasRef = !!String(rec.ref || "").trim();
    var prevName = String(rec.name || ""), prevMail = String(rec.email || "");
    if (name === prevName && mail === prevMail) {
      say("", function () { return T("没有需要保存的修改。", "Nothing changed."); });
      return;
    }
    var done = function () { if (btn) { btn.disabled = false; } };
    /* 未绑定推荐人：还不是节点，服务端无档案，名称/邮箱仅本机使用 */
    if (!hasRef) {
      if (window.GXLOG) { window.GXLOG.wallet("profile.local", "节点档案保存到本机（未绑定推荐人，未上链登记）", cur); }
      writeNode(cur, { name: name, email: mail });
      notifyHost();
      say("ok", function () { return T("已保存到本机。绑定推荐人后名称会登记到网络（届时才参与查重）。",
                                       "Saved locally. Once you bind a referrer the name is registered on the network (that is when uniqueness applies)."); });
      done();
      if (typeof opts.onLocalSave === "function") { try { opts.onLocalSave(); } catch (e) {} }
      return;
    }
    /* 已绑定推荐人：先经服务端查重与落库，通过后才写本机 —— 保证「有冲突就不能完成提交」 */
    if (btn) { btn.disabled = true; }
    say("", function () { return T("等待钱包签名，同步节点档案……", "Waiting for wallet signature to sync your node profile..."); });
    var text = buildProfileMessage(cur);
    signText(text, cur).then(function (sig) {
      return apiPost("/referral/profile", { terminal: cur, name: name, email: mail, sig: sig, sig_msg: text }).then(function (r) {
        if (!r.body || r.body.ok !== true) { throw new Error(apiErrText(r)); }
        if (window.GXLOG) { window.GXLOG.wallet("profile.sync", "节点档案同步到服务器（名称 " + (name || "—") + "，邮箱 " + (mail ? "已填" : "未填") + "）", cur); }
        writeNode(cur, { name: name, email: mail });     /* 服务端通过后才写本机 */
        notifyHost();
        say("ok", function () { return T("已保存并同步到服务器。", "Saved and synced to the server."); });
      });
    }).catch(function (err) {
      say("warn", function () { return T("保存失败：", "Save failed: ") + (err && err.message ? err.message : ""); });
    }).then(done);
  }

  function renderProfile(root, addr, prefix, opts) {
    if (!root) { return null; }
    injectCSS();
    opts = opts || {};
    prefix = prefix || "gxp";
    var idName = prefix + "Name", idMail = prefix + "Mail", idSave = prefix + "Save", idMsg = prefix + "Msg";
    var key = String(addr || "").toLowerCase();
    /* 换了钱包地址：清掉上一个地址残留的提示 */
    if (PROFILE_MSG[prefix] && PROFILE_MSG[prefix].addr !== key) { delete PROFILE_MSG[prefix]; }
    var rec = readNodes()[key] || {};
    var h = [];
    h.push('<div class="gxw-row">');
    h.push('<input id="' + idName + '" type="text" maxlength="40" placeholder="' + T("节点名称（可选）", "Node name (optional)") + '" value="' + esc(rec.name || "") + '">');
    h.push('<input id="' + idMail + '" type="email" maxlength="80" placeholder="' + T("邮箱（可选）", "Email (optional)") + '" value="' + esc(rec.email || "") + '">');
    h.push('</div>');
    h.push('<div class="gxw-dup" id="' + prefix + 'Dup"></div>');
    h.push('<div class="gxw-row"><button class="gxw-btn" type="button" id="' + idSave + '">' + T("保存", "Save") + '</button>');
    if (opts.disconnect) {
      h.push('<button class="gxw-btn ghost" type="button" id="' + prefix + 'Disc">' + T("断开连接", "Disconnect") + '</button>');
    }
    h.push('</div>');
    h.push('<div class="gxw-msg" id="' + idMsg + '"></div>');
    root.innerHTML = h.join("");

    var paint = function () {
      var el = document.getElementById(idMsg);
      if (!el) { return; }
      var m = PROFILE_MSG[prefix];
      if (!m) { el.className = "gxw-msg"; el.textContent = ""; return; }
      el.className = m.kind ? ("gxw-msg " + m.kind) : "gxw-msg";
      el.textContent = m.text();
    };
    var say = function (kind, text) {
      PROFILE_MSG[prefix] = { kind: kind || "", text: (typeof text === "function" ? text : function () { return text || ""; }), addr: key };
      paint();
    };
    var btn = document.getElementById(idSave);
    if (btn) {
      btn.addEventListener("click", function () {
        var name = ((document.getElementById(idName) || {}).value || "").trim();
        var mail = ((document.getElementById(idMail) || {}).value || "").trim();
        if (!addr) { return; }
        saveProfile(addr, name, mail, say, btn, opts);
      });
    }
    if (opts.disconnect) {
      var d = document.getElementById(prefix + "Disc");
      if (d) {
        d.addEventListener("click", function () {
          if (window.GXLOG) { window.GXLOG.wallet("wallet.disconnect", "主动断开连接并撤销授权", addr); }
          revoke(); lsDel(LS_WALLET); notifyHost(); render();
        });
      }
    }
    paint();   /* 重渲染后重放上一条提示（跟随当前语言） */
    /* 坑：这里原写 id + "Dup"（未定义变量）→ ReferenceError，PC 端钱包身份卡在档案区之后
       的「邀请链接 / 推荐人 / 直推团队」全部渲染不出来。应拼 prefix（wiDup）。 */
    attachDupCheck(addr, idName, idMail, prefix + "Dup", btn);
    return { say: say, paint: paint };
  }

  /* ---------------- 直推 / 团队（推荐网络统计） ---------------- */
  var STATS_CACHE = {};
  /* 服务端 /api/referral/team 返回的是 team_size（不是 team_count），
     历史代码取 team_count 导致这里的「团队」恒为 0，已修正。 */
  function statsValues(b) {
    var direct = b.direct_count != null ? b.direct_count : (b.direct ? b.direct.length : 0);
    var team = b.team_size != null ? b.team_size
      : (b.team_count != null ? b.team_count : (b.team ? b.team.length : 0));
    return { ok: true, direct: direct, team: team };
  }
  function ensureStats(addr, cb) {
    var k = String(addr).toLowerCase();
    if (STATS_CACHE[k]) { cb(STATS_CACHE[k]); return; }
    apiGet("/referral/team?terminal=" + encodeURIComponent(addr)).then(function (r) {
      var b = (r && r.body) || {};
      if (b.ok !== true) { throw new Error(apiErrText(r)); }
      STATS_CACHE[k] = statsValues(b);
      cb(STATS_CACHE[k]);
    }).catch(function () {
      /* 接口不可达：显示「—」，不编造 0 */
      STATS_CACHE[k] = { ok: false };
      cb(STATS_CACHE[k]);
    });
  }
  function loadStats(addr) {
    ensureStats(addr, function (v) {
      var d = q("gxwDirect"), t = q("gxwTeam");
      if (d) { d.textContent = v.ok ? v.direct : "—"; }
      if (t) { t.textContent = v.ok ? v.team : "—"; }
    });
  }
  /* 可复用：往任意容器挂载「直推 / 团队」统计行（PC 端钱包身份卡使用，与手机端同一份数据源） */
  function paintStats(root, addr) {
    var v = STATS_CACHE[String(addr).toLowerCase()];
    var d = (v && v.ok) ? v.direct : "—";
    var t = (v && v.ok) ? v.team : "—";
    root.innerHTML = '<div class="gxw-stats">' + T("直推", "Direct") + '<b>' + esc(d) + '</b>' +
      '<span>' + T("团队", "Team") + '</span><b>' + esc(t) + '</b></div>';
  }
  function renderStats(root, addr) {
    if (!root) { return; }
    if (!isAddr(addr)) { root.innerHTML = ""; root.removeAttribute("data-gxw-stats-addr"); return; }
    root.setAttribute("data-gxw-stats-addr", addr);
    paintStats(root, addr);
    ensureStats(addr, function () {
      /* 地址切换后用旧结果覆盖的防护：容器仍挂同一地址才重绘 */
      if (root.getAttribute("data-gxw-stats-addr") === addr) { paintStats(root, addr); }
    });
  }
  function updateStatsAreas() {
    var els = document.querySelectorAll("[data-gxw-stats-addr]");
    for (var i = 0; i < els.length; i++) { renderStats(els[i], els[i].getAttribute("data-gxw-stats-addr")); }
  }

  /* 地址复制按钮（手机端地址缩略展示时使用） */
  document.addEventListener("click", function (e) {
    var t = e.target;
    while (t && t !== document && !(t.getAttribute && t.getAttribute("data-gxw-copy"))) { t = t.parentNode; }
    if (!t || !t.getAttribute || !t.getAttribute("data-gxw-copy")) { return; }
    var v = t.getAttribute("data-gxw-copy");
    var isLink = t.getAttribute("data-gxw-copy-kind") === "link" || /^https?:\/\//.test(v);
    var ok = function () {
      msg("", function () { return isLink ? T("邀请链接已复制", "Invite link copied") : T("地址已复制", "Address copied"); });
    };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(v).then(ok, ok); return; }
    try {
      var ta = document.createElement("textarea");
      ta.value = v; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta); ok();
    } catch (err) {}
  });

  window.GX_WALLET = {
    render: render,
    reload: render,
    /* 可复用：往任意容器挂载「推荐人」区块（已绑定则不含绑定按钮） */
    renderReferrer: renderReferrer,
    /* 可复用：节点档案（节点名 / 邮箱）编辑区，PC 端钱包身份卡使用 */
    renderProfile: renderProfile,
    /* 可复用：直推 / 团队统计行（PC 端钱包身份卡使用） */
    renderStats: renderStats,
    refreshStats: function () { STATS_CACHE = {}; updateStatsAreas(); },
    bound: function (addr) { var i = REF_CACHE[String(addr || "").toLowerCase()]; return !!(i && i.bound); },
    /* 可复用：推荐码邀请链接（完整链接，形如 …?ref=推荐人钱包地址） */
    inviteLink: inviteLink,
    renderInvite: renderInvite,
    /* 账户切换提醒：供宿主页/调试手动触发或收起 */
    switchTip: function (pv, nx) { onAccountSwitch(pv, nx, "unsigned"); },
    hideSwitchTip: hideSwitchTip,
    pendingInviteRef: pendingInviteRef,
    refreshReferrer: function () { REF_CACHE = {}; updateRefAreas(); }
  };

  /* ---------------- 终端在线存在感（presence） ----------------
     信号时机：① 连接钱包成功后立刻发；② 打开/刷新页面（已连接状态下）发；
              ③ 页面从后台切回前台 / 网络恢复 / 窗口获得焦点时发；④ 每 90 秒保活一次。
     目的：管理后台（终端管理·真实模式）能实时看到这台终端在线。
     边界：只表示"此刻在线"，不申报资源、不计在线时长、不产生收益；未连接钱包不发。 */
  var PRESENCE = { timer: null, last: 0, gap: 3000, interval: 90000 };

/* 设备类型判定：页面路径最可靠（/desktop/ 与 /mobile/ 是两套独立页面），
   其次看桌面系统标识，最后才用移动特征兜底。
   旧写法只认 UA 里的 Mobi/Android/iPhone，Windows 上某些浏览器 UA 夹带移动标识，
   会把 PC 终端误报成手机端，导致后台气泡显示错误设备。 */
var GX_PRESENCE_CLIENT = (function () {
  try {
    var pth = String(location.pathname || "").toLowerCase();
    if (pth.indexOf("/desktop/") >= 0) { return "pc-web"; }
    if (pth.indexOf("/mobile/") >= 0) { return "mobile-web"; }
    var ua = String(navigator.userAgent || "");
    var handheld = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
    if (/Windows NT|Macintosh|X11|CrOS|Linux (x86_64|i686|aarch64)/i.test(ua) && !handheld) {
      return "pc-web";
    }
    if (navigator.userAgentData && navigator.userAgentData.mobile === true) { return "mobile-web"; }
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) { return "mobile-web"; }
    if ((navigator.maxTouchPoints || 0) > 1 && Math.min(screen.width || 0, screen.height || 0) <= 820) {
      return "mobile-web";
    }
    return "pc-web";
  } catch (e) { return "pc-web"; }
})();
  function presencePing(reason) {
    var addr = readAddr();
    if (!addr || !isAddr(addr)) { return; }
    var t = Date.now();
    if (reason !== "connect" && t - PRESENCE.last < PRESENCE.gap) { return; }
    PRESENCE.last = t;
    var rec = (function () { try { return readNodes()[String(addr).toLowerCase()] || {}; } catch (e) { return {}; } })();
    var body = {
      terminal: addr,
      reason: reason || "beat",
      client: GX_PRESENCE_CLIENT,
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } })(),
      lang: String(navigator.language || ""),
      page: String(location.pathname || "").slice(0, 64)
    };
    if (rec.authSig && rec.authMsg) { body.sig = rec.authSig; body.sig_msg = rec.authMsg; }
    try {
      fetch(API + "/node/ping", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), cache: "no-store", credentials: "omit", keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }
  function presenceStart() {
    presencePing("load");           /* 刷新/打开页面即发一次（未连接则静默跳过） */
    if (PRESENCE.timer) { clearInterval(PRESENCE.timer); }
    PRESENCE.timer = setInterval(function () { if (!document.hidden) { presencePing("beat"); } }, PRESENCE.interval);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { presencePing("visible"); } });
    window.addEventListener("focus", function () { presencePing("focus"); });
    window.addEventListener("online", function () { presencePing("online"); });
  }
  window.GX_PRESENCE = { ping: presencePing, start: presenceStart };

  function boot() {
    captureInviteRef();   /* 先记住邀请链接里的推荐人，钱包连接后自动填入 */
    presenceStart();      /* 在线存在感：刷新页面/回到前台即发信号 */
    render();
    /* 刷新后监听同样要生效：钱包插件可能晚于本脚本注入，故轮询等待 */
    waitProvider(6000).then(function (w) { if (w) { hookWalletEvents(); reconcileWallet(); } });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", boot); }
  else { boot(); }
})();

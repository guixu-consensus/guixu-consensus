---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 3c9b9cd9025783dd3ce698a9ba04573b_b9ceafacb82211f189c8525400393706
    ReservedCode1: 6mak3TYteIZeq8JDBuuumctQ6wMsFfaaAWEzpGJRWbbLKW6oU2MCb7N/oMLd0SYlfF80OAUwZXtYWw0eg/867naQswGaDGp23V91dmFTGb7zR4yH5bDIPqXhxe2X9AgvCgi146cDAi03aflHGlM4lvrGbOkp3tuTbT4L79xI1Ihaww7j7t6NQmFX9lc=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 3c9b9cd9025783dd3ce698a9ba04573b_b9ceafacb82211f189c8525400393706
    ReservedCode2: 6mak3TYteIZeq8JDBuuumctQ6wMsFfaaAWEzpGJRWbbLKW6oU2MCb7N/oMLd0SYlfF80OAUwZXtYWw0eg/867naQswGaDGp23V91dmFTGb7zR4yH5bDIPqXhxe2X9AgvCgi146cDAi03aflHGlM4lvrGbOkp3tuTbT4L79xI1Ihaww7j7t6NQmFX9lc=
---

# 归墟共识平台 · Guixu Consensus Platform

> **万流归一，共筑共识。** · *All streams converge into one — build the consensus together.*

一个以**资源证明（PoR，Proof of Resource）**为共识基础的去中心化网络项目：把每一台闲置的电脑与手机，变成共识网络的有效节点。

A decentralized network project built on **Proof of Resource (PoR)**: turning every idle computer and phone into a productive node of the consensus network.

| 资料 / Material | 中文 | English |
|---|---|---|
| 白皮书 v1.1 | [guixu-consensus-whitepaper-v1.html](guixu-consensus-whitepaper-v1.html) | [guixu-consensus-whitepaper-v1-en.html](guixu-consensus-whitepaper-v1-en.html) |
| 可行性运行计划书 | [guixu-consensus-platform-feasibility-plan-zh.html](guixu-consensus-platform-feasibility-plan-zh.html) | [guixu-consensus-platform-feasibility-plan-en.html](guixu-consensus-platform-feasibility-plan-en.html) |
| 品牌官网（单页双语） | [guixu-website.html](guixu-website.html) | — |
| 多端程序框架入口 | [guixu-platform/index.html](guixu-platform/index.html) | — |

官网地址 / Official website：<https://www.guixu.club/>

---

# 中文

## 一、项目简介

**归墟（Guixu / The Great Abyss）** 取自《列子·汤问》：海水汇聚的无底之渊，万流归入而水量不增不减。项目以此为名，寓意分散在各处的终端资源汇入同一张共识网络——生生不息，永不枯竭。

2026 年，算力仍集中在矿场，节点仍沉默在服务器集群里；普通人手边的闲置电脑、闲置手机、闲置宽带上限与存储空间，从未被纳入区块链的共识网络。归墟共识网络要做的，正是把这部分被浪费的资源变成共识力量。

- **核心理念**：资源即算力，贡献即共识
- **参与门槛**：零门槛，不需要矿机与服务器集群；无私募、不公募
- **通证发行**：按需铸造、无固定总量上限，全部由终端资源贡献自动铸造
- **资源去向**：聚合后的存储 / 带宽 / 算力通过标准化接口直连真实需求方，形成「贡献 — 聚合 — 对接 — 变现 — 反哺」的完整商业闭环，资源始终有真实买家

本仓库包含白皮书、可行性运行计划书、品牌官网，以及**多端程序框架**（Web 平台端 / PC 客户端 / 手机 App 原型，当前为框架骨架 v0.1）。所有页面均为**纯静态、零依赖**，无需构建、无需服务器，双击即可预览。

## 二、PoR 资源证明机制

传统 PoW 消耗大量电力，PoS 依赖资金锁定。归墟采用 **PoR（Proof of Resource，资源证明）**：**以资源贡献替代资本质押与算力竞赛**，是区别于 PoW / PoS 的独立路径；技术实现借鉴 PoS 的权益加权思路，但权重来源是资源贡献而非代币质押。

机制要点：

1. 终端通过持续贡献闲置资源（带宽、存储、算力）来证明其贡献价值
2. 系统实时计算各终端的贡献值排名
3. 贡献值排名靠前的终端，优先获得通证铸造权
4. 所有资源贡献记录上链，不可篡改

**贡献值模型**

```
贡献值 = ∑(资源类型 × 贡献系数 × 贡献时长 × 稳定性权重 × 防作弊系数)
```

**参与贡献的资源类型**

| 资源类型 | 贡献描述 | 采集方式 |
|---|---|---|
| 网络带宽 | 参与节点间通信、数据同步、网络转发 | 流量计量器 + 连通性检测 |
| 存储空间 | 提供分布式存储节点，存放区块与应用数据 | 磁盘使用量 + 可用性检测 |
| 计算能力 | 闲置 CPU / GPU 参与共识计算、数据验证、合约执行 | CPU 周期检测 + GPU 占用监控 |
| 稳定性 | 在线时长、连续运行时间、网络波动容忍度 | 心跳检测 + 在线日志 |
| 地理位置 | 多区域分布，提升网络抗单点故障能力 | IP 地理位置标注 |

**终端角色分工**（不同终端提供不同资源，这是与普通「挖矿型」项目的关键区别）

| 终端类型 | 定位 | 主要贡献 |
|---|---|---|
| 家用电脑（PC 客户端） | 主端 | 存储 + 带宽 + 算力 |
| 手机（手机 App） | 轻端 | 带宽 + 轻量存储 + 移动节点（算力不参与，保续航与温度） |
| 服务器 / NAS | 重端 | 高带宽 + 大存储 + 高算力 |
| 车载 / 穿戴设备 | 轻端 | 移动带宽 + 位置贡献 |

**反作弊与防薅羊毛**

| 防御策略 | 实现方式 | 目的 |
|---|---|---|
| 设备指纹 | 设备 ID + 网络环境指纹，同一设备重复贡献不叠加 | 防止单设备多账号 |
| 贡献衰减曲线 | 新设备系数 1.0，连续在线 30 天后逐步提升至 1.5 | 防止短期刷量 |
| 行为分析 | 识别非人类规律的操作频率与自动化脚本模式 | 检测脚本与 AI 代理 |
| 资源真实性验证 | 带宽使用量与设备性能匹配度校验，异常触发人工审核 | 防止性能虚报 |
| 地理位置校验 | 同 IP 段多终端注册限流，异地 IP 频繁变更告警 | 防止分布式虚假节点 |
| 社区举报 | 用户举报，社区投票确认后扣除贡献值 | 社区共治 |

**通证与运维基金**

交易税 1% + 转账税 0.5%，税费自动注入运维基金池，用于：节点奖励发放（40%）、网络维护与安全审计（30%）、系统升级与开发（20%）、社区建设与市场推广（10%）。税率与贡献系数均由社区治理投票决定，资金流动全链上可查。

## 三、目录结构

```
2026归墟共识平台/
├── README.md                                      本文件（中英双语）
├── LICENSE                                        MIT 许可证
├── .gitignore                                     Git 忽略规则
│
├── guixu-consensus-whitepaper-v1.html             白皮书 v1.1（中文）
├── guixu-consensus-whitepaper-v1-en.html          白皮书 v1.1（English）
├── guixu-consensus-platform-feasibility-plan-zh.html   可行性运行计划书（中文）
├── guixu-consensus-platform-feasibility-plan-en.html   可行性运行计划书（English）
├── guixu-website.html                             品牌官网单页（中英双语单页）
│
├── guixu-platform/                                ▍多端程序框架（纯静态）
│   ├── index.html                                 框架总览入口
│   ├── README.md                                  框架说明文档
│   ├── shared/                                    全端共享资源
│   │   ├── guixu-theme.css                        主题变量 + 组件库
│   │   ├── guixu-i18n.js                          多语言引擎（默认英文 / localStorage 持久化）
│   │   ├── guixu-core.js                          数据访问层 + 工具函数 + 地图渲染 + 轻量图表
│   │   ├── mock-data.js                           模拟数据集（文案已 key 化）
│   │   ├── world-dots.js                          点阵世界地图底图
│   │   └── i18n/                                  语言包（新增语言只需加 <code>.js）
│   │       ├── en.js                              英文文案（默认，636 条）
│   │       └── zh.js                              简体中文文案（636 条）
│   ├── web/                                       ▍平台端（Web）
│   │   ├── index.html                             官网门户 + 实时概览 + 产品矩阵
│   │   ├── network.html                           全球终端情况（地图 + 区域分布 + 终端明细）
│   │   └── admin.html                             后台管理（总览/终端/资源/通证/商业对接/设置）
│   ├── desktop/                                   ▍用户端（PC）
│   │   └── index.html                             PC 客户端（存储 + 带宽 + 算力）
│   └── mobile/                                    ▍用户端（手机）
│       └── index.html                             手机 App（带宽 + 轻量存储）
│
└── 截图相关/                                       界面截图（PNG）
```

> 说明：`guixu-platform.zip` 为框架目录的打包件，属构建分发包，已通过 `.gitignore` 排除，不入库。

## 四、本地预览

全部页面为**静态 HTML**，零依赖、无需构建。两种方式任选：

**方式一：直接双击（最快）**

直接双击任意 `.html` 文件即可在浏览器中打开。注意：请勿单独移动某个页面文件，需与其上级目录一起移动，否则对 `shared/` 的相对引用会失效。

**方式二：本地静态服务器（推荐）**

个别浏览器对 `file://` 协议下的脚本加载有限制，建议用静态服务器预览：

```bash
# 在 guixu-platform 目录下执行
cd guixu-platform
python -m http.server 8000
# 浏览器访问 http://localhost:8000/index.html
# 平台官网入口：http://localhost:8000/web/index.html
```

也可以使用 VS Code 的 Live Server 插件，或任意静态服务器（Nginx / Caddy）指向该目录。

**多语言**：全站默认英文，页面右上角（移动端为顶部状态栏）提供 `EN / 中` 切换按钮，选择结果写入 `localStorage(gx-lang)`，刷新后保持。扩展新语言只需新增 `shared/i18n/<code>.js` 并在 `guixu-i18n.js` 的 `LOCALES` 中登记，页面 HTML 零改动。

## 五、许可证

本项目采用 **MIT 许可证**，详见 [LICENSE](LICENSE)。

```
Copyright (c) 2026 Guixu Consensus Community (归墟共识社区)
```

---

# English

## 1. Overview

**Guixu (The Great Abyss)** originates from *Liezi · Tang Wen*: a bottomless abyss where all rivers converge, yet its water never increases. The name stands for scattered edge resources flowing into one consensus network — self-renewing and never exhausted.

In 2026, computing power is still concentrated in mining farms and nodes still sit silently in server clusters. The idle PCs, idle phones, unused bandwidth and spare disk space of ordinary people have never been included in a blockchain consensus network. Guixu Consensus Network exists to turn that wasted capacity into consensus power.

- **Core belief**: Resources are compute; contribution is consensus
- **Barrier to entry**: Zero — no mining rigs, no server clusters; no private sale, no public offering
- **Token issuance**: Minted on demand, no fixed supply cap, entirely generated by terminal resource contribution
- **Where resources go**: Aggregated storage / bandwidth / compute connect to real buyers through standardized interfaces, forming a full loop of *contribute → aggregate → match → monetize → feed back*

This repository contains the whitepaper, the feasibility & operation plan, the brand website, and a **multi-end program framework** (Web platform side / PC client / mobile app prototype, currently framework skeleton v0.1). Every page is **pure static with zero dependencies** — no build step, no server required, just double-click to preview.

## 2. PoR — Proof of Resource

PoW burns electricity; PoS relies on locked capital. Guixu adopts **PoR (Proof of Resource)**: **resource contribution replaces capital staking and hashing competition**, making it an independent path from both PoW and PoS. Its weighted design is inspired by PoS, but the weight comes from contributed resources rather than staked tokens.

How it works:

1. Terminals prove their value by continuously contributing idle resources (bandwidth, storage, compute)
2. The network ranks terminals by contribution score in real time
3. Top-ranked terminals gain minting priority
4. All contribution records are written on-chain and immutable

**Contribution score model**

```
Score = Σ (resource type × coefficient × duration × stability weight × anti-cheat factor)
```

**Resource types**

| Resource | Contribution | Measurement |
|---|---|---|
| Network bandwidth | Node-to-node communication, data sync, forwarding | Traffic meter + connectivity checks |
| Storage | Distributed storage nodes for block and app data | Disk usage + availability checks |
| Compute | Idle CPU / GPU for consensus, verification, contract execution | CPU cycle checks + GPU monitoring |
| Stability | Uptime, continuous runtime, tolerance to network jitter | Heartbeat + online logs |
| Geolocation | Multi-region distribution, resilience to single points of failure | IP geolocation tagging |

**Terminal roles** (different devices contribute different resources — the key difference from ordinary "mining" projects)

| Terminal | Role | Main contribution |
|---|---|---|
| Home PC (desktop client) | Primary node | Storage + bandwidth + compute |
| Phone (mobile app) | Light node | Bandwidth + light storage + mobile node (no compute, to protect battery and thermals) |
| Server / NAS | Heavy node | High bandwidth + large storage + high compute |
| In-car / wearable | Light node | Mobile bandwidth + location |

**Anti-cheat & anti-farming**

| Defense | Implementation | Purpose |
|---|---|---|
| Device fingerprint | Device ID + network fingerprint; duplicates do not stack | Prevent multi-account on one device |
| Contribution decay curve | Coefficient starts at 1.0, rises to 1.5 after 30 days online | Prevent short-term farming |
| Behavior analysis | Detect non-human operation frequency and script patterns | Detect bots and AI agents |
| Resource authenticity | Match bandwidth usage against device performance; anomalies trigger review | Prevent fake capability claims |
| Geolocation check | Rate-limit multi-terminal signups in the same IP range; warn on frequent IP changes | Prevent distributed fake nodes |
| Community reporting | Users report, community votes, contribution score deducted | Community governance |

**Token & operations fund**

1% transaction tax + 0.5% transfer tax flow automatically into the operations fund: node rewards (40%), network maintenance and security audits (30%), system upgrade and development (20%), community building and marketing (10%). Tax rates and contribution coefficients are decided by community governance votes; all fund flows are transparent on-chain.

## 3. Repository Structure

```
2026归墟共识平台/
├── README.md                                      This file (bilingual)
├── LICENSE                                        MIT License
├── .gitignore                                     Git ignore rules
│
├── guixu-consensus-whitepaper-v1.html             Whitepaper v1.1 (Chinese)
├── guixu-consensus-whitepaper-v1-en.html          Whitepaper v1.1 (English)
├── guixu-consensus-platform-feasibility-plan-zh.html   Feasibility & operation plan (Chinese)
├── guixu-consensus-platform-feasibility-plan-en.html   Feasibility & operation plan (English)
├── guixu-website.html                             Brand website, single-page bilingual
│
├── guixu-platform/                                ▍Multi-end program framework (pure static)
│   ├── index.html                                 Framework overview entry
│   ├── README.md                                  Framework documentation
│   ├── shared/                                    Shared assets for all ends
│   │   ├── guixu-theme.css                        Theme variables + component library
│   │   ├── guixu-i18n.js                          i18n engine (default English / localStorage persistence)
│   │   ├── guixu-core.js                          Data access layer + utils + map rendering + lightweight charts
│   │   ├── mock-data.js                           Mock dataset (all copy keyed)
│   │   ├── world-dots.js                          Dotted world map base layer
│   │   └── i18n/                                  Locale packs (add <code>.js to add a language)
│   │       ├── en.js                              English copy (default, 636 keys)
│   │       └── zh.js                              Simplified Chinese copy (636 keys)
│   ├── web/                                       ▍Platform side (Web)
│   │   ├── index.html                             Portal + live overview + product matrix
│   │   ├── network.html                           Global terminals (map + regions + terminal list)
│   │   └── admin.html                             Admin console (overview / terminals / resources / token / BD / settings)
│   ├── desktop/                                   ▍Client side (PC)
│   │   └── index.html                             PC client (storage + bandwidth + compute)
│   └── mobile/                                    ▍Client side (mobile)
│       └── index.html                             Mobile app (bandwidth + light storage)
│
└── 截图相关/                                       UI screenshots (PNG)
```

> `guixu-platform.zip` is a distribution archive of the framework folder and is excluded from version control via `.gitignore`.

## 4. Local Preview

All pages are **static HTML** with zero dependencies and no build step. Pick either method:

**Option 1 — Just double-click (fastest)**

Double-click any `.html` file to open it in your browser. Do not move a single page file elsewhere on its own: keep it together with its parent directories, or the relative `shared/` references will break.

**Option 2 — Local static server (recommended)**

Some browsers restrict script loading under the `file://` protocol, so a static server is recommended:

```bash
# Run inside the guixu-platform directory
cd guixu-platform
python -m http.server 8000
# Open http://localhost:8000/index.html
# Platform portal: http://localhost:8000/web/index.html
```

VS Code Live Server, or any static server (Nginx / Caddy) pointed at the folder, works equally well.

**Localization**: the site defaults to English; an `EN / 中` switch sits at the top-right of each page (top status bar on mobile). The choice is persisted in `localStorage(gx-lang)` and survives refresh. Adding a language only requires a new `shared/i18n/<code>.js` plus registering it in `LOCALES` inside `guixu-i18n.js` — no HTML changes.

## 5. License

Released under the **MIT License**. See [LICENSE](LICENSE).

```
Copyright (c) 2026 Guixu Consensus Community (归墟共识社区)
```

---

*归墟共识 · 资源证明（PoR）· 闲置即价值*
*Guixu Consensus · Proof of Resource · Idle is value*

*（本项目文档与页面内容部分由 AI 生成，仅供参考，不构成任何投资建议。）*
*（内容由AI生成，仅供参考）*

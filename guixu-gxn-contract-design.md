\---  
AIGC:  
Label: "1"  
ContentProducer: 001191440300708461136T1XGW3  
ProduceID: 3c9b9cd9025783dd3ce698a9ba04573b_c345ca12b8e111f1b172525400248c00  
ReservedCode1: GCG1C9eHdOW3FJ6oG7gkbW6DLxxNtb8xngzxeTZwJoxd4TTCFkqWnGhQP7oKPeY+2sjKWUba2XTRMe78ylapuwfrjMfvNEKXdCjbvSgo69IgUHGYfyHWVnrutWPpvSfFH/6OwY+IO8N7edKDwYKb9NGqhnEqm27ust7FlWahfBbHXOtVNNw5qCS2ekI=  
ContentPropagator: 001191440300708461136T1XGW3  
PropagateID: 3c9b9cd9025783dd3ce698a9ba04573b_c345ca12b8e111f1b172525400248c00  
ReservedCode2: GCG1C9eHdOW3FJ6oG7gkbW6DLxxNtb8xngzxeTZwJoxd4TTCFkqWnGhQP7oKPeY+2sjKWUba2XTRMe78ylapuwfrjMfvNEKXdCjbvSgo69IgUHGYfyHWVnrutWPpvSfFH/6OwY+IO8N7edKDwYKb9NGqhnEqm27ust7FlWahfBbHXOtVNNw5qCS2ekI=  
\---

# 归墟共识平台 GXN 智能合约设计文档

| 项目   | 内容                                         |
| ---- | ------------------------------------------ |
| 文档版本 | v1.0                                       |
| 编制日期 | 2026-09-25                                 |
| 适用范围 | BNB Smart Chain（BEP-20 标准），本期仅单链           |
| 文档状态 | 设计定稿，待开发实现                                 |
| 设计依据 | 归墟共识平台白皮书 v1.1 及项目已定参数（代币、税务、冷却、资源权重、时间系数） |
| 目标读者 | 合约开发者、后端与运维工程师、第三方审计机构                     |

---

# 1. 概述与定位

## 1.1 GXN 代币的职能定位

GXN（Guixu Node，中文名「归墟节点币」）是归墟共识平台在 BNB Smart Chain 上发行的 BEP-20 代币，承担三项职能：

| 职能     | 说明                                                           |
| ------ | ------------------------------------------------------------ |
| 贡献结算凭证 | 只有通过 PoR（Proof of Resource，资源证明）验证的贡献记录，才能触发铸造；代币增量与资源贡献严格对应 |
| 基金计价单位 | 运维基金的收支、节点激励的发放均以 GXN 计价结算                                   |
| 网络激励标的 | 平台对节点贡献的回报通过 GXN 兑现，形成「贡献 → 发行 → 激励 → 再贡献」的闭环                |

GXN 与传统挖矿型代币的本质差异在于**发行依据**：PoW 以算力竞赛发行、PoS 以资本质押发行，GXN 以**多维度资源贡献**发行，且没有资本准入通道——无私募、无公募、无预挖，初始供应为零。

| 维度     | PoW 型代币 | PoS 型代币     | GXN（PoR 型）                   |
| ------ | ------- | ----------- | ---------------------------- |
| 发行依据   | 算力竞赛    | 代币质押量       | 五类资源贡献加权值（见第 3 章）            |
| 初始分配   | 常存在预挖   | 常存在私募/基金会份额 | 初始供应 0，无私募、无公募、无预挖           |
| 供应方式   | 通常设总量上限 | 通常设总量上限     | 按需铸造，总量无上限                   |
| 准入成本   | 硬件与电力   | 代币持仓        | 资源贡献（权重差异化，非资本门槛）            |
| 发行节流手段 | 难度调整    | 质押率与出块概率    | 地址级铸造冷却 1 小时 + 贡献值阈值 + 防作弊系数 |
| 税收机制   | 无（或矿工费） | 无（或协议费）     | 交易税 1% + 转账税 0.5%，全额注入运维基金   |

## 1.2 BSC 选型理由

本期仅落地 BNB Smart Chain 单链，选型基于以下对比结论：

| 评估维度        | BNB Smart Chain                                    | 以太坊主网              | 判断               |
| ----------- | -------------------------------------------------- | ------------------ | ---------------- |
| EVM 兼容性     | 完全兼容，Solidity 0.8.x + OpenZeppelin 可直接复用           | 完全兼容               | 两者相当，BSC 无明显劣势   |
| 写入成本        | 单笔交易 gas 成本低，适配「高频贡献记录 + 小额铸造」                     | 成本高，单次铸造成本可能超过铸造价值 | BSC 优            |
| 出块与确认       | 约 3 秒出块，交易确认快                                      | 约 12 秒出块           | BSC 优            |
| 工具链         | Hardhat / Foundry / BscScan 验证 / 事件索引（The Graph）成熟 | 生态最成熟              | 两者均可用            |
| 代币与流动性生态    | BEP-20 标准成熟，BNB 生态 DEX 流动性充足                       | 流动性最充足             | 两者均可用，BSC 满足初期需求 |
| 与 PoR 架构匹配度 | 链下计算 + 链上验签的 EIP-712 / ECDSA 方案可直接实现               | 同样可实现，但成本高         | BSC 优            |

BSC 选型的核心逻辑：**PoR 是高频小额写入型负载**（每个节点每小时最多产生一次铸造请求，另有持续的证明提交流），其链上动作的价值密度低于以太坊主网的平均交易价值，因此必须落在单笔成本可忽略的链上。

本期不引入 L2 与跨链桥，理由：

| 排除项         | 理由                                                                |
| ----------- | ----------------------------------------------------------------- |
| L2 / Rollup | PoR 的首要任务是验证「链下数据 + 链上验签」主流程的正确性；引入 L2 会增加提款延迟与排序器信任假设，干扰对安全模型的判断 |
| 跨链桥         | 桥是独立的高危攻击面，且本期不存在多链发行的业务需求；引入桥只会扩大审计范围而无收益                        |
| 多链同步发行      | 多链会带来供应口径、税务口径与治理口径的三重分裂，与「无私募、按需铸造」的单一供应账本原则冲突                   |

## 1.3 本期交付范围与边界

| 范围项                             | 本期是否交付 | 说明                                   |
| ------------------------------- | ------ | ------------------------------------ |
| BEP-20 代币与税率机制                  | 是      | 交易税 1%、转账税 0.5% 在转账层拦截               |
| PoR 存证（节点注册与证明记录）               | 是      | PoRRegistry                          |
| PoR 证明验证（签名与阈值校验）               | 是      | ProofValidator                       |
| 铸造控制与地址级冷却                      | 是      | MintController，冷却 1 小时               |
| 运维基金与四类分配                       | 是      | TreasuryFund，40/30/20/10             |
| 治理参数与角色管理                       | 是      | Governance                           |
| L2 部署                           | 否      | 本期仅 BSC 单链                           |
| 跨链桥 / 多链发行                      | 否      | 本期不引入                                |
| 可升级代理（UUPS / Transparent Proxy） | 否      | 采用「不可升级 + 新版本部署 + 状态迁移」策略，规避代理存储布局风险 |
| 链上全量存储资源原始数据                    | 否      | 链上只存摘要、索引与状态，原始数据留链下并进入事件日志          |

## 1.4 术语表

| 术语             | 含义                                                      |
| -------------- | ------------------------------------------------------- |
| BEP-20         | BNB Smart Chain 上的同质化代币标准，接口与 ERC-20 等价                 |
| PoR            | Proof of Resource，资源证明：以算力、存储、稳定性、带宽、地理位置五类资源贡献为权重的共识机制 |
| 贡献值（Score）     | 节点资源贡献经权重、时间系数、防作弊系数合成后的标量，是铸造量的唯一输入                    |
| 运维基金（Treasury） | 接收全部税务收入并按 40/30/20/10 分配的链上资金池                         |
| 铸造冷却           | 同一地址两次成功铸造之间的最小时间间隔，本期固定为 1 小时                          |
| 验证者（Validator） | 链下采集与计算资源贡献数据，并以阈值签名向链上提交结果的授权实体集合                      |
| 阈值签名           | 由验证者集合中达到门限数量的成员共同签发的签名，链上验签后才接受数据                      |

---

# 2. 代币经济模型

## 2.1 代币基础参数

| 参数           | 取值                                     | 说明                                              |
| ------------ | -------------------------------------- | ----------------------------------------------- |
| 名称           | Guixu Node                             | —                                               |
| 代码           | GXN                                    | —                                               |
| 中文名          | 归墟节点币                                  | —                                               |
| 标准           | BEP-20                                 | BNB Smart Chain 上接口与 ERC-20 等价                  |
| 精度（decimals） | 18                                     | 设计约定：采用 BEP-20 常规精度 18，已定参数中未单独约定，如需其他精度须在部署前确认 |
| 初始供应量        | 0                                      | 无私募、无公募、无预挖，部署时不铸造任何代币                          |
| 供应上限         | 无上限                                    | 按需铸造（mint-on-demand）                            |
| 发行途径         | 仅 PoR 验证通过后的铸造                         | 合约不提供任何管理员直接 mint 的后门函数                         |
| 转账与销毁        | 支持标准 transfer / approve / transferFrom | 不设持币分红，不设自动销毁                                   |

设计红线：**GXNToken 的 mint 权限只授予 MintController 单一地址**，MintController 内部再要求调用方携带通过 ProofValidator 验签的证明数据与冷却校验结果。管理角色（Governance）不具备直接铸造权，避免「治理即铸币权」的单点风险。

## 2.2 铸造规则

| 规则项     | 取值                                           | 说明                           |
| ------- | -------------------------------------------- | ---------------------------- |
| 地址级铸造冷却 | 1 小时（3600 秒）                                 | 同一地址两次成功铸造的最小间隔              |
| 冷却计时依据  | 链上 `block.timestamp` 与 `lastMintAt[address]` | 不依赖链下时间，规避时钟篡改               |
| 触发条件    | 提交的 PoR 证明通过 Validation 且本轮贡献值 ≥ 阈值          | 阈值为治理参数，待定（本设计不预设数值）         |
| 单次铸造量   | 由贡献值换算                                       | 换算公式见第 3.6 节；换算率为治理参数，待定     |
| 总量      | 500 亿枚（软上限）                                  | 接近 500 亿枚时触发 DAO 治理投票（见 2.7） |
| 铸造接收地址  | 必须为证明中登记的节点地址                                | 禁止代领，防止贡献值归集刷量               |

「无上限」与「防无序膨胀」并存的逻辑：2.1 节表注「无上限」指早期不设总量硬顶，不等于发行速度不受约束。实际发行速度受三重约束叠加：

| 约束         | 作用                                  |
| ---------- | ----------------------------------- |
| 地址级冷却 1 小时 | 单地址理论最大铸造频次为 24 次/天，且需在每次均通过验证的前提下  |
| 贡献值阈值      | 未达到阈值的地址无法触发铸造，抑制低质量或空壳节点           |
| 防作弊系数 f    | 对伪造、重复上报、数据偏差做衰减，直接压低 Score 从而压低铸造量 |

当累计铸造量接近 **500 亿枚（50,000,000,000 GXN）** 时，触发 DAO 治理投票决定是否冻结铸造或改为贡献值兑换现有流通量（回购销毁模型）。具体设计见 2.7 节。在此之前，按需铸造机制保持不变，无总量硬顶。

## 2.7 软上限设计（500 亿枚治理投票）

当 GXN 累计铸造量接近 500 亿枚时，协议自动触发 DAO 治理投票，由社区投票决定是否冻结铸造或改为回购销毁模型。

### 2.7.1 触发机制

| 项    | 取值 / 说明                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 触发总量 | 500 亿枚（50,000,000,000 GXN）                                                                                                             |
| 触发方式 | 在 MintController 内部增加全局铸造总量计数器 `totalMinted`，每次 `token.mint` 后递增；当 `totalMinted` 接近触发阈值（如 450 亿，占 90%）时，在下次 `requestMint` 调用中检查并触发投票流程 |
| 投票状态 | 使用 `bool softCapTriggered` 标志位，触发后 `softCapTriggered = true`，后续铸造请求进入治理投票阶段，需 DAO 投票通过后才继续铸造                                           |
| 投票内容 | ① 冻结铸造：永久停止按需铸造（`mintPaused = true`）；② 回购销毁：暂停按需铸造，改为贡献值兑换现有流通量（节点通过销毁现有 GXN 获取新铸造量，实现流通量内部循环）                                         |

### 2.7.2 合约实现位置

| 合约                 | 新增/修改内容                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MintController** | ① 新增 `uint256 public totalMinted`（全局铸造总量计数器）；② 在 `requestMint` 开头增加软上限检查：若 `totalMinted >= SOFT_CAP_THRESHOLD` 且 `softCapTriggered == true`，则调用 Governance 投票接口；③ 新增 `SOFT_CAP_THRESHOLD` 常量（450 亿，占 90%） |
| **Governance**     | 新增投票接口，支持两种提案选项（冻结铸造 / 回购销毁），投票通过后由 Governance 执行最终状态切换                                                                                                                                                   |

### 2.7.3 流程图：软上限触发与治理决策

```
累计铸造总量接近 500 亿枚
        │
        ▼
  MintController.checkSoftCap()
        │
        ▼
  totalMinted >= 450 亿（SOFT_CAP_THRESHOLD）?
        │
    是 ──┘
        ▼
  softCapTriggered = true
        │
        ▼
  DAO 治理投票启动
        │
    ┌───┴───┐
    ▼       ▼
 选项①：   选项②：
 冻结铸造    回购销毁
（永久停铸）  （贡献值换现有
            流通量，内部循环）
    │       │
    ▼       ▼
投票通过    投票通过
    │       │
    ▼       ▼
mintPaused=true  mintPaused=true
             + 启用回购销毁模型
             （节点销毁 GXN 换新铸造）
    │       │
    ▼       ▼
 铸造流程停止 /  铸造流程进入
 新机制启动       回购销毁模式
```

### 2.7.4 状态流转

```
                    ┌─────────────┐
                    │ 初始状态     │
                    │ softCapTriggered=false │
                    └──────┬──────┘
                           │ 铸造进行中
                           │ totalMinted 累积
                           ▼
                    ┌─────────────┐
                    │ 接近阈值     │
                    │ 450 亿 → 触发 │
                    └──────┬──────┘
                           │ 进入 DAO 投票
                           ▼
                    ┌─────────────┐
                    │ 冻结铸造     │── 投票不通过或选① ──→ mintPaused=true
                    │ OR           │
                    │ 回购销毁     │── 投票通过选② ──→ 启用回购销毁模型
                    └─────────────┘
```


### 2.7.5 合约代码骨架

```solidity
// MintController.sol — 新增软上限相关

uint256 public constant SOFT_CAP_THRESHOLD = 45_000_000_000 ether; // 450亿
uint256 public constant SOFT_CAP_TARGET    = 50_000_000_000 ether; // 500亿

uint256 public totalMinted;                // 全局铸造总量计数器
bool   public softCapTriggered;            // 软上限是否已触发

event SoftCapTriggered(uint256 totalMinted, uint256 totalSupply);
event VotingResult(bool freeze铸造, bool enableBuyback);

function checkSoftCap() internal {
    if (!softCapTriggered && totalMinted >= SOFT_CAP_THRESHOLD) {
        softCapTriggered = true;
        emit SoftCapTriggered(totalMinted, totalSupply());
        // 触发 DAO 投票流程（通过 Governance）
        _triggerGovernanceVote();
    }
}

function _triggerGovernanceVote() internal {
    // 调用 Governance 合约创建投票提案
    // 提案内容：冻结铸造 vs 回购销毁
    governance.proposeSoftCapDecision();
}
```

### 2.7.6 回购销毁模型（投票通过选项②时）

当 DAO 投票通过回购销毁模型时，铸造机制切换为：

- 节点不再通过贡献值直接兑换新铸造量
- 改为贡献值兑换现有流通量：节点提交贡献证明 + 销毁一定量 GXN，MintController 按贡献值等量铸造新 GXN
- 实现方式：新增 `requestBuybackMint` 函数，要求节点传入 `burnAmount`（需销毁的 GXN 数量），通过 `token.burn` 销毁后按贡献值铸造新 GXN
- 效果：流通总量不变（销毁 = 铸造），但贡献值高的节点可通过消耗自有代币获取更多新铸造量，形成贡献驱动的内部循环

此模型确保 500 亿枚总供应上限不被突破的同时，保持贡献激励的延续性。

### 2.7.7 设计原则

| 原则      | 说明                               |
| ------- | -------------------------------- |
| 非硬顶     | 500 亿不是不可逾越的硬顶，而是治理触发阈值，社区有最终决定权 |
| 提前预警    | 阈值设在 90%（450 亿），给社区充分时间讨论与投票     |
| 投票选项二选一 | 冻结铸造（保存量）或回购销毁（保机制），避免模棱两可       |
| 不改变既有参数 | 投票通过前，铸造规则、税率、冷却时间等一切参数保持不变      |

## 2.3 税务规则

| 税种  | 税率   | 触发场景                           | 收款方               |
| --- | ---- | ------------------------------ | ----------------- |
| 交易税 | 1%   | 转账路径涉及 DEX 交易对（买入、卖出、添加/移除流动性） | 运维基金 TreasuryFund |
| 转账税 | 0.5% | 普通地址间转账（非交易对路径）                | 运维基金 TreasuryFund |

税率实现口径：

| 实现项    | 口径                                                                                            |
| ------ | --------------------------------------------------------------------------------------------- |
| 基数表示   | 以 10000 bps 为 1.0，交易税 = 100 bps，转账税 = 50 bps                                                  |
| 拦截位置   | 在 `_update`（OpenZeppelin v5 的转账统一入口）中覆盖，`transfer` / `transferFrom` / `mint` / `burn` 全部经过此路径 |
| 交易路径判定 | 维护 `isMarketPair[address]` 集合，当 `from` 或 `to` 命中该集合时判定为交易，按 1% 计征；否则按 0.5% 计征                 |
| 征收方式   | 税从转出金额中扣除，接收方收到税后金额，税款直接转入 TreasuryFund 地址                                                    |
| 免税路径   | 设计约定（需确认）：铸造（mint）、TreasuryFund 向四类用途的支出、系统合约之间的结算调用不计税，以保证税务「全额注入」不被二次侵蚀                     |

免税路径的取舍说明：若 TreasuryFund 向节点发放激励时仍按 0.5% 抽税，则基金实际可用规模会被反复稀释，与「全额注入运维基金」的既定口径冲突。因此采用「仅在外部地址间流转时征税」的判定策略。该策略需在开发前确认，因为它会使「税务对内部流转不生效」，存在被合约间自转账套利的理论空间（缓解措施见第 7.5 节）。

税务去向明确：**税款不分红给持币人、不销毁、不进入开发团队地址，100% 进入 TreasuryFund**。

## 2.4 运维基金分配比例

| 用途     | 比例       | bps 表示    | 使用方向                    |
| ------ | -------- | --------- | ----------------------- |
| 节点激励   | 40%      | 4000      | 向活跃节点发放奖励，与 PoR 贡献值排名挂钩 |
| 维护审计   | 30%      | 3000      | 网络运维、第三方安全审计、漏洞赏金       |
| 升级开发   | 20%      | 2000      | 协议迭代、客户端与工具链开发          |
| 社区     | 10%      | 1000      | 社区运营、生态合作与教育            |
| **合计** | **100%** | **10000** | —                       |

合约层约束：四项比例以常量定义，Governance 修改分配比例时必须满足四项之和恒等于 10000 bps，否则交易回滚；不允许出现「未分配余额」或「超额分配」状态。

## 2.5 经济闭环

```
节点贡献资源（算力/存储/稳定性/带宽/地理位置）
        │
        ▼  链下采集与加权计算（第 3 章）
   PoR 贡献值 Score
        │
        ▼  验证者阈值签名上报
   ProofValidator 链上验签
        │
        ▼  冷却 + 阈值校验
   MintController 触发铸造
        │
        ▼
   GXN 发行至节点地址  ──►  平台内流通 / DEX 交易
        │                          │
        │                          ▼  交易税 1% / 转账税 0.5%
        │                    TreasuryFund 资金池
        │                          │
        └──── 节点激励 40% ◄───────┼──────► 维护审计 30%
                                   ├──────► 升级开发 20%
                                   └──────► 社区 10%
```

## 2.6 可持续性与风险（优劣并述）

优势：

- **无早期筹码集中**：初始供应为 0，无私募、无公募、无预挖，不存在低价筹码解锁带来的抛压结构。
- **发行锚定真实资源**：铸造量由贡献值决定，理论上代币增量对应网络实际承载能力的增长。
- **基金有稳定税源**：交易与转账均计税，资金池随流通活跃度增长，不依赖外部注资。

风险与不足：

- **通胀压力的传导路径**：总量无上限（早期）意味着长期供应持续增长；若验证环节被绕过或贡献值可被刷取，增量将脱离真实资源对应关系，转为价格压力。缓解依赖防作弊系数与验证者集合的可信度（第 7 章）。接近 500 亿枚时 DAO 治理投票提供最终刹车。
- **激励闭环的自我强化**：节点激励占基金 40%，其资金部分来自铸造后流通产生的税收，存在「铸造 → 流通 → 抽税 → 激励 → 再铸造」的闭环。该闭环强度需由治理参数（贡献值阈值、铸造换算率、基金支出节奏）调节，否则会放大通胀。
- **参数未定项的风险集中**：铸造换算率、贡献值阈值、归一化基准值均未在既定参数中给出（见第 3 章标注），属治理参数。这些参数上线前必须逐一确定并公开，否则经济模型的量化边界不成立。

---

# 3. PoR 机制与贡献值计算公式

## 3.1 五类资源权重

| 资源类型 | 权重   | bps 表示（10000 = 1.0） | 采集来源             | 权重设定意图               |
| ---- | ---- | ------------------- | ---------------- | -------------------- |
| 算力   | 1.5x | 15000               | CPU / GPU 基准测试结果 | 稀缺度最高、结果可复算验证        |
| 存储   | 1.2x | 12000               | 可用容量 + 存储占用证明    | 长期占用硬件资源，成本可观测       |
| 稳定性  | 1.1x | 11000               | 在线率、丢包率、异常重启次数   | 保障网络可靠性              |
| 带宽   | 1.0x | 10000               | 上下行吞吐、可连通节点数     | 网络基础资源，作为基准权重        |
| 地理位置 | 0.8x | 8000                | 区域 / ASN 分散度     | 鼓励节点分布分散，但伪造成本低故权重最低 |

权重为既定参数，任何调整必须经 Governance 并同步更新本文档。

## 3.2 归一化口径

五类资源的原始上报值量纲不同（TFLOPS、TB、百分比、Mbps、区域编号），必须先归一化才能加权求和。

对第 i 类资源：

```
r_i = min( r_raw,i / B_i , cap_i )
```

- `r_raw,i`：链下采集的原始值
- `B_i`：该类资源的归一化基准值（对应 r_i = 1.0）
- `cap_i`：该类资源的单节点归一化上限，用于防止单一维度刷分

`B_i` 与 `cap_i` 属治理参数，**既定参数中未提供具体数值，本设计不预设**，需在上线前确定并公开。链上以定点数表示（bps 或 1e18 定标），**禁止使用浮点运算**。

## 3.3 在线时间系数

设节点连续在线时长为 `t`（单位：天），时间系数定义为：

```
k(t) = 1.0 + 0.5 × min(t, 30) / 30
```

取值特性：连续在线满 30 天，系数由 1.0 线性提升至 1.5，之后封顶不再增长。

| 连续在线天数 t | 时间系数 k(t) |
| -------- | --------- |
| 0        | 1.000     |
| 5        | 1.083     |
| 10       | 1.167     |
| 15       | 1.250     |
| 20       | 1.333     |
| 25       | 1.417     |
| ≥ 30     | 1.500     |

链上定点实现（bps）：

```
k_bps = 10000 + 5000 * min(t, 30) / 30
```

「连续在线」的定义与中断处理口径：

| 项    | 口径                                                                    |
| ---- | --------------------------------------------------------------------- |
| 在线判定 | 由节点心跳（链下）判定，心跳间隔与超时阈值属治理参数（未提供，待定）                                    |
| 中断处理 | 超时即视为连续在线中断，`t` 重新从 0 累计；是否设置「宽限窗口」属治理参数（未提供，待定）                      |
| 数据来源 | 链上无法自行测量在线时长，`t` 必须由验证者签名上报并记录 `lastSeenAt`，链上仅校验其不超过当前区块时间（见第 7.3 节） |

## 3.4 防作弊系数

防作弊系数 `f ∈ (0, 1]`，初始为 1.0，由多因子连乘得到，链下计算、链上只做范围校验：

| 因子     | 触发条件                | 处理                         |
| ------ | ------------------- | -------------------------- |
| 设备指纹去重 | 多地址上报同一设备指纹         | 按重复地址数衰减，严重时置 0            |
| 数据偏差   | 上报值与验证者交叉比对结果偏差超过容差 | 按偏差比例衰减                    |
| 历史违规   | 地址存在被驳回或处罚记录        | 在衰减窗口内持续压低系数（衰减曲线为治理参数，待定） |

`f` 的取值下限与衰减曲线属治理参数，既定参数中未提供，本设计不预设。

## 3.5 贡献值计算公式

```
Score = ( Σ_i  w_i × r_i ) × k(t) × f

其中 i ∈ { 算力, 存储, 稳定性, 带宽, 地理位置 }
```

展开形式：

```
Score = ( 1.5×r_算力 + 1.2×r_存储 + 1.1×r_稳定性 + 1.0×r_带宽 + 0.8×r_地理 ) × k(t) × f
```

链上 1e18 定标实现口径：

```
score = ( W_HASHRATE*r_hash
        + W_STORAGE*r_storage
        + W_STABILITY*r_stability
        + W_BANDWIDTH*r_bandwidth
        + W_GEOGRAPHY*r_geo ) * k / 1e18   // 时间系数
        * f / 1e18                          // 防作弊系数
```

权重常量（1e18 定标）：`W_HASHRATE = 1.5e18`、`W_STORAGE = 1.2e18`、`W_STABILITY = 1.1e18`、`W_BANDWIDTH = 1.0e18`、`W_GEOGRAPHY = 0.8e18`。

## 3.6 铸造量换算

```
mintAmount = Score × mintRatePerScore
```

`mintRatePerScore`（每单位贡献值对应的 GXN 数量）为治理参数，**既定参数中未提供，本设计不预设**，由 Governance 设定并可调整。该参数是调节通胀速度的主阀门。

## 3.7 计算示例

> 示例说明：以下算例中的归一化基准值统一取 100 分、换算率取 0.01 GXN/贡献值点，均为**演示用假设值，非最终参数**；权重、时间系数公式、计算结构均按既定参数执行。

**节点 A**：算力上报 80、存储 60、稳定性 95、带宽 70、地理位置 50（基准值均为 100）

| 资源      | 原始值 | 归一化 r_i | 权重 w_i | w_i × r_i |
| ------- | --- | ------- | ------ | --------- |
| 算力      | 80  | 0.80    | 1.5    | 1.200     |
| 存储      | 60  | 0.60    | 1.2    | 0.720     |
| 稳定性     | 95  | 0.95    | 1.1    | 1.045     |
| 带宽      | 70  | 0.70    | 1.0    | 0.700     |
| 地理位置    | 50  | 0.50    | 0.8    | 0.400     |
| **加权和** | —   | —       | —      | **4.065** |

- 连续在线 t = 22 天 → k = 1.0 + 0.5 × 22/30 = 1.367
- 防作弊系数 f = 1.0（无异常）
- Score = 4.065 × 1.367 × 1.0 = **5.558**
- 铸造量 = 5.558 × 0.01 = **0.05558 GXN**

**节点 B**：算力 40、存储 90、稳定性 85、带宽 100、地理位置 90

| 资源      | 原始值 | 归一化 r_i | 权重 w_i | w_i × r_i |
| ------- | --- | ------- | ------ | --------- |
| 算力      | 40  | 0.40    | 1.5    | 0.600     |
| 存储      | 90  | 0.90    | 1.2    | 1.080     |
| 稳定性     | 85  | 0.85    | 1.1    | 0.935     |
| 带宽      | 100 | 1.00    | 1.0    | 1.000     |
| 地理位置    | 90  | 0.90    | 0.8    | 0.720     |
| **加权和** | —   | —       | —      | **4.335** |

- 连续在线 t = 8 天 → k = 1.0 + 0.5 × 8/30 = 1.133
- 防作弊系数 f = 0.9（存在 10% 数据偏差衰减，示例）
- Score = 4.335 × 1.133 × 0.9 = **4.420**
- 铸造量 = 4.420 × 0.01 = **0.04420 GXN**

**结果对比**

| 项               | 节点 A        | 节点 B        |
| --------------- | ----------- | ----------- |
| 资源加权和           | 4.065       | 4.335       |
| 连续在线 t（天）       | 22          | 8           |
| 时间系数 k          | 1.367       | 1.133       |
| 防作弊系数 f         | 1.0         | 0.9         |
| **贡献值 Score**   | **5.558**   | **4.420**   |
| 铸造量（示例换算率 0.01） | 0.05558 GXN | 0.04420 GXN |

算例说明两点机制特征：其一，节点 B 的资源加权和高于节点 A，但因在线时长不足且存在数据偏差衰减，最终贡献值反而更低——时间系数与防作弊系数具备实际区分力；其二，单次铸造量随贡献值线性变化，不存在固定出块奖励，发行完全由贡献驱动。

## 3.8 链上与链下的计算分工

| 环节                    | 执行位置          | 原因                        |
| --------------------- | ------------- | ------------------------- |
| 资源原始数据采集              | 链下            | CPU、带宽、在线时长等指标无法在 EVM 内测量 |
| 归一化、加权求和、时间系数、防作弊系数   | 链下            | 涉及浮点与多次迭代运算，链上 gas 不可承受   |
| 结果签名                  | 链下（验证者集合阈值签名） | 为链上数据提供唯一可追溯的来源凭证         |
| 签名验证、数值范围校验、冷却校验、阈值判定 | 链上            | 必须由链上强制，不可委托链下            |
| 铸造执行                  | 链上            | 发行权必须在链上收敛，不可由链下决定        |

必须明确本架构的信任假设：**链上无法独立验证「资源贡献是否真实」，只能验证「该数据由授权验证者签名、字段完整、数值在合法范围内、且该地址未处于冷却期」**。因此 PoR 的安全性上限由验证者集合的可信度决定，相关威胁与缓解措施见第 7.2、7.3 节。

---

# 4. 合约架构

## 4.1 架构总览

系统由 6 个职责单一的合约构成，采用单向依赖链：治理层只调参、不改账本；发行层只决策、不发签名；资金层只分配、不征税。

```
                        ┌────────────────────┐
                        │    Governance      │  参数 / 角色 / 暂停（不持有资产）
                        │  多签 + 时间锁      │
                        └─────────┬──────────┘
                                  │ setParam / grantRole / pause（单向下发）
        ┌──────────────┬──────────┼───────────────┬────────────────┐
        ▼              ▼          ▼               ▼                ▼
 ┌────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐
 │ GXNToken   │ │PoRRegistry   │ │ProofValidator │ │TreasuryFund  │
 │ 账本 + 税务 │ │节点与证明存证 │ │验签 + 阈值校验 │ │基金 + 四类分配│
 └─────▲──────┘ └──────▲───────┘ └───────▲───────┘ └──────▲───────┘
       │ mint()        │ updateNodeProof  │ verifyProof     │ allocate()
       │               │                  │                 │
       └───────────────┴──────────────────┴─────────────────┘
                                  │
                        ┌─────────┴──────────┐
                        │  MintController    │  冷却 + 阈值 + 换算 + 触发铸造
                        └─────────▲──────────┘
                                  │ requestMint(proof, signatures)
                                  │
                          验证者集合（链下）→ 阈值签名上报
```


## 4.2 六合约职责边界

| 合约                 | 核心职责                                                           | 关键状态                                                                 | 明确不做什么                           |
| ------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------- |
| **GXNToken**       | BEP-20 账本；税率拦截与征收；交易对与免税白名单管理；铸造权限收敛                           | `balances`、`allowance`、`tradeTaxBps`、`transferTaxBps`、`isMarketPair` | 不决定铸造量、不参与验签、不持有基金、无管理员直接铸币接口    |
| **PoRRegistry**    | 节点注册（地址 ↔ 设备指纹 ↔ 地区）；证明摘要与状态记录；设备指纹去重表；节点活跃度与冷却时间锚点            | `NodeInfo`、`fingerprintUsed`、`proofHistory`                          | 不做数值验签与范围校验（交由 ProofValidator）   |
| **ProofValidator** | 验证者集合与阈值管理；EIP-712 阈值签名验签；数值范围校验；防重放；驳回与处罚标记                   | `validators`、`threshold`、`isVerified[epoch][digest]`                 | 不发币、不持有资产、不修改节点状态                |
| **MintController** | 冷却校验（1 小时）；贡献值阈值校验；Score → mintAmount 换算；调用 GXNToken 铸造；汇总状态写入 | `MINT_COOLDOWN`、`mintRatePerScore`、`scoreThreshold`                  | 不自行生成贡献值（必须来自验签数据）、不持有资金         |
| **TreasuryFund**   | 接收全部税款；累计收入台账；按 40/30/20/10 支出；白名单收款方结算                        | `totalReceived`、`allocatedByKind`、`allocation`、`whitelist`           | 不征税、不铸币、不修改分配比例（由 Governance 修改） |
| **Governance**     | 参数与角色管理；分配比例调整；暂停开关；提案 + 时间锁执行                                 | 参数键值表、角色表、`eta` 时间锁                                                  | 不持有代币、无铸造权、无基金提款权                |

## 4.3 依赖与调用方向

| 调用方向                            | 目的                  | 权限约束                            |
| ------------------------------- | ------------------- | ------------------------------- |
| MintController → ProofValidator | 校验证明有效性与阈值签名        | `view`/调用，无需额外权限                |
| MintController → PoRRegistry    | 读取节点状态（冷却锚点）与写入证明快照 | 读：无限制；写：`REGISTRY_WRITER`       |
| MintController → GXNToken       | 执行铸造                | `MINTER_ROLE`（唯一持有者）            |
| GXNToken → TreasuryFund         | 转账时把税款划入基金          | 无需权限，作为转账目标地址                   |
| TreasuryFund → GXNToken         | 向白名单用途地址发放资金        | `TREASURER_ROLE` + 白名单 + 比例上限校验 |
| Governance → 其余 5 合约            | 参数设置、角色授予、暂停控制      | `GOVERNOR_ROLE` + 时间锁           |
| ProofValidator → PoRRegistry    | 只读查询节点是否已注册、指纹是否重复  | 只读，不形成写依赖                       |

**设计原则：依赖严格单向，不出现双向互调。** ProofValidator 与 PoRRegistry 之间不存在调用闭环——前者只读后者的公开状态做判定，写入动作统一由 MintController 汇总触发。这一约束消除了循环依赖，也把重入面压缩到「铸造」与「基金支出」两个明确入口（均为 `nonReentrant`）。

## 4.4 权限矩阵

| 角色 \ 合约                           | GXNToken      | PoRRegistry    | ProofValidator | MintController | TreasuryFund    | Governance |
| --------------------------------- | ------------- | -------------- | -------------- | -------------- | --------------- | ---------- |
| `GOVERNOR_ROLE`                   | 税率 / 交易对 / 暂停 | 注册参数 / 状态 / 暂停 | 验证者 / 阈值 / 暂停  | 换算率 / 阈值 / 暂停  | 分配比例 / 白名单 / 暂停 | —          |
| `MINTER_ROLE`（MintController）     | `mint`        | —              | —              | —              | —               | —          |
| `VALIDATOR_ROLE`                  | —             | —              | 提交签名结果         | —              | —               | —          |
| `REGISTRY_WRITER`（MintController） | —             | 更新证明快照与铸造时间    | —              | —              | —               | —          |
| `TREASURER_ROLE`                  | —             | —              | —              | —              | 执行分配支出          | —          |
| `DEFAULT_ADMIN_ROLE`              | 角色授予          | 角色授予           | 角色授予           | 角色授予           | 角色授予            | 多签持有       |

## 4.5 关键分离设计

| 分离项        | 设计                                                                            | 防的是什么                   |
| ---------- | ----------------------------------------------------------------------------- | ----------------------- |
| 铸造权 vs 治理权 | Governance 无 mint 权限，只能在 MintController 中调整换算率与阈值；铸造仍需真实证明经 ProofValidator 验签 | 治理被攻破后无法凭空印钞            |
| 支出权 vs 治理权 | Governance 只能改分配比例与白名单；实际支出需 `TREASURER_ROLE` 且受 40/30/20/10 上限约束             | 治理私钥泄露无法一次性抽干基金         |
| 验签权 vs 发行权 | ProofValidator 只验签不铸币；MintController 只铸币不验签                                   | 单一合约被绕过不会直接造成超额发行       |
| 账本 vs 决策   | GXNToken 不含任何经济参数推导逻辑，只执行 `mint` 与税务拦截                                        | 经济参数变更不需要改动代币合约，降低升级必要性 |

## 4.6 技术选型

| 项目          | 选择                                                                                                           | 理由                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Solidity 版本 | 0.8.24                                                                                                       | 内置溢出检查；支持自定义错误（gas 更低）                |
| 基础库         | OpenZeppelin Contracts v5.x（ERC20 / AccessControl / Pausable / ReentrancyGuard / EIP712 / ECDSA / SafeERC20） | 经充分审计，避免重复实现密码学与代币标准                  |
| 访问控制        | `AccessControl` 角色制（非 `Ownable`）                                                                             | 需区分铸造、验签、出纳、治理四类权限                    |
| 可升级性        | 不可升级（无代理）                                                                                                    | 规避代理存储布局与升级管理密钥风险；协议迭代走「新版本部署 + 状态迁移」 |
| 开发与部署工具     | Foundry（合约测试与部署脚本）+ Hardhat（BscScan 验证与运维脚本）                                                                 | 兼顾测试效率与工具生态成熟度                        |
| 链下服务        | 采集代理 + 验证者节点（阈值签名服务）+ 事件索引                                                                                   | 承担无法在链上完成的测量与计算                       |

---

# 5. 核心数据结构与接口

## 5.1 通用约定

| 约定项  | 口径                                                    |
| ---- | ----------------------------------------------------- |
| 数值定标 | 代币金额与贡献值统一用 1e18 定标（`1e18` 表示 1.0）                    |
| 比例表示 | 税率与分配比例用 bps（`10_000` = 100%），即交易税 100 bps、转账税 50 bps |
| 时间表示 | 统一使用 `block.timestamp`（`uint64`），不引入链下时间              |
| 错误处理 | 使用自定义错误（`error Xxx();`）替代字符串 `require`，降低 gas 并便于前端识别 |
| 事件索引 | 地址类字段一律 `indexed`，便于事件索引与前端检索                         |

## 5.2 核心结构体

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

enum NodeStatus { Inactive, Active, Paused, Banned }
enum RejectReason { BadSignature, BelowThreshold, OutOfRange, Replay, DuplicateFingerprint }
enum AllocationKind { NodeIncentive, Maintenance, UpgradeDev, Community }

/// @notice 节点基础信息（链上持久化，用于状态判定与冷却锚点）
struct NodeInfo {
    bytes32 fingerprintHash; // 设备指纹哈希（多地址去重依据）
    bytes32 regionCode;      // 地理位置编码（区域 / ASN 摘要）
    uint64  registeredAt;    // 注册时间
    uint64  lastProofAt;     // 最近一次证明提交时间
    uint64  lastMintAt;      // 最近一次成功铸造时间（1 小时冷却依据）
    uint32  continuousDays;  // 连续在线天数 t（由签名数据更新）
    NodeStatus status;       // 节点状态
}

/// @notice 资源证明（链下计算、验证者签名、链上校验；不上链存储原文）
struct ResourceProof {
    address node;            // 被证明的节点地址
    uint64  epoch;           // 数据窗口序号（防重放维度）
    uint64  reportedAt;      // 数据窗口结束时间
    uint256 score;           // 贡献值 Score（1e18 定标）
    bytes32 metricsDigest;   // 五类资源原始指标摘要（原文留链下）
    bytes32 fingerprintHash; // 设备指纹哈希
    uint32  continuousDays;  // 连续在线天数 t
    uint16  antiCheatBps;    // 防作弊系数 f（bps，10000 = 1.0）
}

/// @notice 运维基金四类分配比例（bps，合计恒为 10000）
struct FundAllocation {
    uint16 nodeIncentiveBps; // 4000（40%）
    uint16 maintenanceBps;   // 3000（30%）
    uint16 upgradeDevBps;    // 2000（20%）
    uint16 communityBps;     // 1000（10%）
}

/// @notice 税率配置（bps）
struct TaxConfig {
    uint16 tradeTaxBps;    // 100（1%）
    uint16 transferTaxBps; // 50（0.5%）
}
```

## 5.3 事件定义

```solidity
// ---------- GXNToken ----------
event TaxCollected(address indexed from, address indexed to, uint256 taxAmount, uint8 taxKind);
event MarketPairUpdated(address indexed pair, bool allowed);
event TaxConfigUpdated(uint16 tradeTaxBps, uint16 transferTaxBps);
event TaxExemptUpdated(address indexed account, bool exempt);

// ---------- PoRRegistry ----------
event NodeRegistered(address indexed node, bytes32 fingerprintHash, bytes32 regionCode);
event NodeStatusChanged(address indexed node, NodeStatus oldStatus, NodeStatus newStatus);
event ProofRecorded(address indexed node, bytes32 proofDigest, uint256 score, uint64 epoch);

// ---------- ProofValidator ----------
event ValidatorUpdated(address indexed validator, bool enabled);
event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
event ProofVerified(address indexed node, bytes32 proofDigest, uint256 score, uint64 epoch);
event ProofRejected(address indexed node, bytes32 proofDigest, RejectReason reason);

// ---------- MintController ----------
event MintRateUpdated(uint256 oldRate, uint256 newRate);
event ScoreThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
event Minted(address indexed node, uint256 amount, uint256 score, uint64 epoch);

// ---------- TreasuryFund ----------
event TaxReceived(address indexed from, uint256 amount);
event AllocationUpdated(uint16 nodeIncentiveBps, uint16 maintenanceBps, uint16 upgradeDevBps, uint16 communityBps);
event FundsAllocated(address indexed to, AllocationKind indexed kind, uint256 amount);

// ---------- Governance ----------
event ParamProposed(bytes32 indexed key, uint256 value, uint256 eta);
event ParamExecuted(bytes32 indexed key, uint256 value);
event EmergencyPaused(address indexed by, uint8 scope);
```

## 5.4 关键函数签名

```solidity
// ---------- GXNToken ----------
function mint(address to, uint256 amount) external;                                  // onlyRole(MINTER_ROLE)
function burn(uint256 amount) external;
function setMarketPair(address pair, bool allowed) external;                          // onlyRole(GOVERNOR_ROLE)
function setTaxConfig(uint16 tradeTaxBps, uint16 transferTaxBps) external;            // onlyRole(GOVERNOR_ROLE)
function setTaxExempt(address account, bool exempt) external;                         // onlyRole(GOVERNOR_ROLE)
function setMintPaused(bool paused) external;                                         // onlyRole(GOVERNOR_ROLE)
function treasury() external view returns (address);
function computeTax(address from, address to, uint256 value) external view returns (uint256 tax, uint8 kind);

// ---------- PoRRegistry ----------
function registerNode(bytes32 fingerprintHash, bytes32 regionCode) external;
function recordProof(address node, bytes32 proofDigest, uint256 score, uint32 continuousDays) external; // onlyRole(REGISTRY_WRITER)
function setNodeStatus(address node, NodeStatus status) external;                     // onlyRole(GOVERNOR_ROLE)
function isFingerprintUsed(bytes32 fingerprintHash) external view returns (bool);
function getNode(address node) external view returns (NodeInfo memory);

// ---------- ProofValidator ----------
function setValidator(address validator, bool enabled) external;                      // onlyRole(GOVERNOR_ROLE)
function setThreshold(uint256 threshold) external;                                    // onlyRole(GOVERNOR_ROLE)
function verifyProof(ResourceProof calldata proof, bytes[] calldata signatures)
    external view returns (bool ok, bytes32 proofDigest);
function hashProof(ResourceProof calldata proof) external view returns (bytes32);

// ---------- MintController ----------
function requestMint(ResourceProof calldata proof, bytes[] calldata signatures) external;
function setMintRatePerScore(uint256 ratePerScore) external;                          // onlyRole(GOVERNOR_ROLE)
function setScoreThreshold(uint256 threshold) external;                               // onlyRole(GOVERNOR_ROLE)
function mintCooldown() external view returns (uint256);                              // 恒为 1 hours
function canMint(address node) external view returns (bool);
function previewMint(uint256 score) external view returns (uint256 amount);

// ---------- TreasuryFund ----------
function allocate(AllocationKind kind, address to, uint256 amount) external;          // onlyRole(TREASURER_ROLE)
function setAllocation(FundAllocation calldata allocation) external;                  // onlyRole(GOVERNOR_ROLE)
function setWhitelist(address account, bool allowed) external;                        // onlyRole(GOVERNOR_ROLE)
function totalReceived() external view returns (uint256);
function allocatedByKind(AllocationKind kind) external view returns (uint256);
function remainingByKind(AllocationKind kind) external view returns (uint256);

// ---------- Governance ----------
function proposeParam(bytes32 key, uint256 value) external;                          // onlyRole(GOVERNOR_ROLE)
function executeParam(bytes32 key) external;                                          // onlyRole(GOVERNOR_ROLE)
function pauseScope(uint8 scope) external;                                            // onlyRole(GOVERNOR_ROLE)
function unpauseScope(uint8 scope) external;                                          // onlyRole(GOVERNOR_ROLE)
```


## 5.5 代码骨架

### 5.5.1 GXNToken：BEP-20 账本与税务拦截

```solidity
contract GXNToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    uint256 private constant BPS = 10_000;
    address public immutable treasury;

    uint16 public tradeTaxBps    = 100; // 交易税 1%
    uint16 public transferTaxBps = 50;  // 转账税 0.5%

    mapping(address => bool) public isMarketPair;   // DEX 交易对
    mapping(address => bool) public isTaxExempt;    // 免税路径（基金支出、系统合约）
    bool public mintPaused;                         // 独立于转账暂停的铸造开关

    event TaxCollected(address indexed from, address indexed to, uint256 taxAmount, uint8 taxKind);

    constructor(address treasury_) ERC20("Guixu Node", "GXN") {
        require(treasury_ != address(0), "treasury=0");
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice 唯一铸造入口，仅 MintController 持有 MINTER_ROLE
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (mintPaused) revert MintIsPaused();
        _mint(to, amount); // from == address(0) 走免税分支
    }

    /// @dev OpenZeppelin v5 的转账统一入口：transfer / transferFrom / mint / burn 均经此
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value); // 铸造 / 销毁不计税
            return;
        }
        (uint256 tax, uint8 kind) = _computeTax(from, to, value);
        if (tax == 0) {
            super._update(from, to, value);
            return;
        }
        super._update(from, to, value - tax);   // 收款方按税后金额入账
        super._update(from, treasury, tax);     // 税款 100% 划入运维基金
        emit TaxCollected(from, to, tax, kind);
    }

    function _computeTax(address from, address to, uint256 value)
        internal view returns (uint256 tax, uint8 kind)
    {
        if (isTaxExempt[from] || isTaxExempt[to]) return (0, 0);
        if (isMarketPair[from] || isMarketPair[to]) {
            return (value * tradeTaxBps / BPS, 1);   // 交易税 1%
        }
        return (value * transferTaxBps / BPS, 2);    // 转账税 0.5%
    }

    function setTaxConfig(uint16 tradeTaxBps_, uint16 transferTaxBps_) external onlyRole(GOVERNOR_ROLE) {
        if (tradeTaxBps_ > 1_000 || transferTaxBps_ > 1_000) revert TaxTooHigh();
        tradeTaxBps = tradeTaxBps_;
        transferTaxBps = transferTaxBps_;
        emit TaxConfigUpdated(tradeTaxBps_, transferTaxBps_);
    }
}
```

### 5.5.2 ProofValidator：阈值签名验签与防重放

```solidity
contract ProofValidator is AccessControl, EIP712 {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 private constant PROOF_TYPEHASH = keccak256(
        "ResourceProof(address node,uint64 epoch,uint64 reportedAt,uint256 score,bytes32 metricsDigest,bytes32 fingerprintHash,uint32 continuousDays,uint16 antiCheatBps)"
    );

    mapping(address => bool) public validators;
    uint256 public threshold;                                        // 门限，治理参数
    mapping(uint64 => mapping(bytes32 => bool)) public isVerified;    // epoch => digest => 已用

    function verifyProof(ResourceProof calldata proof, bytes[] calldata signatures)
        external view returns (bool ok, bytes32 digest)
    {
        digest = hashProof(proof);
        if (isVerified[proof.epoch][digest]) return (false, digest);  // 防重放

        uint256 valid;
        address last = address(0);
        for (uint256 i = 0; i < signatures.length; ++i) {
            address signer = ECDSA.recover(digest, signatures[i]);
            if (signer <= last) revert SignersNotStrictlySorted();     // 防重复计数
            if (validators[signer]) { ++valid; last = signer; }
        }
        if (valid < threshold) return (false, digest);
        if (!_inRange(proof)) return (false, digest);
        return (true, digest);
    }

    function hashProof(ResourceProof calldata p) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            PROOF_TYPEHASH, p.node, p.epoch, p.reportedAt,
            p.score, p.metricsDigest, p.fingerprintHash, p.continuousDays, p.antiCheatBps
        )));
    }

    /// @dev 范围校验：防作弊系数必须在 (0, 1.0]，在线天数与时间戳不得越界
    function _inRange(ResourceProof calldata p) internal view returns (bool) {
        if (p.antiCheatBps == 0 || p.antiCheatBps > 10_000) return false;
        if (p.continuousDays > MAX_CONTINUOUS_DAYS) return false;      // 上限 30，封顶后可取等
        if (p.reportedAt > block.timestamp) return false;              // 不允许未来时间
        return true;
    }

    /// @dev 状态标记由 MintController 在校验通过后调用，避免 view 函数产生副作用
    function markVerified(uint64 epoch, bytes32 digest) external onlyRole(VERIFIER_WRITER) {
        isVerified[epoch][digest] = true;
        emit ProofVerified(msg.sender, digest, 0, epoch);
    }
}
```

### 5.5.3 MintController：冷却、阈值、换算与铸造

```solidity
contract MintController is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    uint256 public constant MINT_COOLDOWN = 1 hours;   // 地址级冷却：1 小时

    GXNToken       public immutable token;
    PoRRegistry    public immutable registry;
    ProofValidator public immutable validator;

    uint256 public mintRatePerScore;   // 治理参数：每单位贡献值对应的 GXN（1e18 定标），初始值待定
    uint256 public scoreThreshold;     // 治理参数：触发铸造的最低贡献值，初始值待定

    event Minted(address indexed node, uint256 amount, uint256 score, uint64 epoch);

    function requestMint(ResourceProof calldata proof, bytes[] calldata signatures)
        external nonReentrant whenNotPaused
    {
        if (proof.node != msg.sender) revert NotProofOwner();          // 禁止代领

        (bool ok, bytes32 digest) = validator.verifyProof(proof, signatures);
        if (!ok) revert ProofInvalid();

        NodeInfo memory node = registry.getNode(msg.sender);
        if (node.status != NodeStatus.Active) revert NodeNotActive();
        if (node.lastMintAt != 0 && block.timestamp < uint256(node.lastMintAt) + MINT_COOLDOWN) {
            revert MintCooldownNotElapsed();                            // 冷却 1 小时
        }
        if (proof.score < scoreThreshold) revert ScoreBelowThreshold();

        uint256 amount = previewMint(proof.score);
        if (amount == 0) revert ZeroMintAmount();

        // Checks-Effects-Interactions：先落状态，后发币
        registry.recordProof(msg.sender, digest, proof.score, proof.continuousDays);
        token.mint(msg.sender, amount);

        emit Minted(msg.sender, amount, proof.score, proof.epoch);
    }

    function previewMint(uint256 score) public view returns (uint256) {
        return score * mintRatePerScore / 1e18;
    }

    function canMint(address node) external view returns (bool) {
        NodeInfo memory n = registry.getNode(node);
        if (n.status != NodeStatus.Active) return false;
        return n.lastMintAt == 0 || block.timestamp >= uint256(n.lastMintAt) + MINT_COOLDOWN;
    }
}
```

### 5.5.4 贡献值链上复算（校验用）

链上不主动计算贡献值，但保留一份定点复算实现，用于审计核对与治理参数调整前的验证：

```solidity
library PoRMath {
    uint256 internal constant W_HASHRATE   = 1.5e18;  // 算力 1.5x
    uint256 internal constant W_STORAGE    = 1.2e18;  // 存储 1.2x
    uint256 internal constant W_STABILITY  = 1.1e18;  // 稳定性 1.1x
    uint256 internal constant W_BANDWIDTH  = 1.0e18;  // 带宽 1.0x
    uint256 internal constant W_GEOGRAPHY  = 0.8e18;  // 地理位置 0.8x
    uint256 internal constant BPS          = 10_000;

    /// @param rHash/rStorage/rStability/rBandwidth/rGeo 归一化后的资源值（1e18 定标）
    /// @param continuousDays 连续在线天数
    /// @param antiCheatBps   防作弊系数（bps，10000 = 1.0）
    function computeScore(
        uint256 rHash, uint256 rStorage, uint256 rStability,
        uint256 rBandwidth, uint256 rGeo,
        uint32 continuousDays, uint16 antiCheatBps
    ) internal pure returns (uint256 score) {
        uint256 weighted = (W_HASHRATE  * rHash
                          + W_STORAGE   * rStorage
                          + W_STABILITY * rStability
                          + W_BANDWIDTH * rBandwidth
                          + W_GEOGRAPHY * rGeo) / 1e18;

        uint32 d = continuousDays > 30 ? 30 : continuousDays;
        uint256 kBps = BPS + 5_000 * uint256(d) / 30;      // 1.0 → 1.5 线性

        score = weighted * kBps / BPS * antiCheatBps / BPS;
    }
}
```

### 5.5.5 TreasuryFund：比例封顶的拉取式分配

```solidity
contract TreasuryFund is AccessControl, ReentrancyGuard {
    bytes32 public constant GOVERNOR_ROLE  = keccak256("GOVERNOR_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    uint256 private constant BPS = 10_000;

    IERC20 public immutable token;
    FundAllocation public allocation = FundAllocation(4000, 3000, 2000, 1000); // 40/30/20/10
    uint256 public totalReceived;
    uint256 public totalAllocated;
    mapping(AllocationKind => uint256) public allocatedByKind;
    mapping(address => bool) public whitelist;

    /// @notice 出纳按用途拉取资金（pull 模式，避免 push 循环与重入）
    function allocate(AllocationKind kind, address to, uint256 amount)
        external onlyRole(TREASURER_ROLE) nonReentrant
    {
        if (!whitelist[to]) revert NotWhitelisted();
        if (allocatedByKind[kind] + amount > capOf(kind)) revert ExceedsAllocationCap();
        allocatedByKind[kind] += amount;
        totalAllocated += amount;
        token.safeTransfer(to, amount);
        emit FundsAllocated(to, kind, amount);
    }

    function capOf(AllocationKind kind) public view returns (uint256) {
        uint16 bps = kind == AllocationKind.NodeIncentive ? allocation.nodeIncentiveBps
                   : kind == AllocationKind.Maintenance   ? allocation.maintenanceBps
                   : kind == AllocationKind.UpgradeDev    ? allocation.upgradeDevBps
                   :                                        allocation.communityBps;
        return totalReceived * bps / BPS;
    }

    function setAllocation(FundAllocation calldata a) external onlyRole(GOVERNOR_ROLE) {
        if (uint256(a.nodeIncentiveBps) + a.maintenanceBps + a.upgradeDevBps + a.communityBps != BPS) {
            revert AllocationMustSumTo10000();   // 40/30/20/10 之和必须为 10000 bps
        }
        allocation = a;
        emit AllocationUpdated(a.nodeIncentiveBps, a.maintenanceBps, a.upgradeDevBps, a.communityBps);
    }
}
```



## 5.6 存储与 gas 取舍

| 状态项 | 是否上链持久化 | 存放位置 | 理由 |
|---|---|---|---|
| 节点基础信息（地址 / 指纹 / 地区 / 状态） | 是 | `NodeInfo` mapping | 去重与状态判定必需 |
| 贡献值、时间系数、防作弊系数 | 是（快照） | `ResourceProof` 摘要 + 事件 | 铸造换算与事后审计需要 |
| 五类资源原始指标 | 否 | 链下存储 + `metricsDigest` 摘要上链 | 原文上链存储成本过高 |
| 验证者签名数组 | 否 | `calldata`（仅瞬时校验） | 无需持久化，避免无谓 SSTORE |
| 已使用证明（防重放） | 是 | `isVerified[epoch][digest]` | 防重放为硬需求 |
| 基金收支台账 | 是 | `totalReceived` / `allocatedByKind` | 比例封顶校验必需 |
| 节点历史贡献曲线 | 否（事件） | 事件日志 + 链下索引 | 曲线查询走链下，链上只留状态 |



---


# 6. 关键业务流程

## 6.0 全链路总览

```
[链下] 节点客户端             [链下] 验证者集合            [链上] BNB Smart Chain
──────────────────           ──────────────────           ────────────────────────
 1 注册 ────────────────────────────────────────────────► PoRRegistry.registerNode
 2 采集五类资源指标 ──► 独立采集 + 交叉比对                      │
    归一化 / 加权 / 时间系数 / f                                │
    计算 Score ─────────► 阈值签名（EIP-712）                    │
 3 提交证明 ────────────────────────────────────────────► MintController.requestMint
                                                               └► ProofValidator.verifyProof
 4 铸造 ────────────────────────────────────────────────► GXNToken.mint（冷却 1h）
 5 税务 ────────────────────────────────────────────────► 转账时 1% / 0.5% → TreasuryFund
                                                               └► allocate 按 40/30/20/10 支出
```

六步中有两步（阶段 2 的采集计算、阶段 5 的采集与发放执行）完全在链下，链上只承担验证与状态收敛。

## 6.1 阶段一：节点注册

| 项 | 内容 |
|---|---|
| 参与方 | 节点客户端（链下）、PoRRegistry（链上） |
| 输入 | `fingerprintHash`（设备指纹哈希，链下生成，原文不上链）、`regionCode`（地区 / ASN 摘要）、调用者地址 |
| 链上动作 | 校验指纹未被使用、地址未注册 → 写入 `NodeInfo`，状态置 `Active`，记录 `registeredAt` |
| 输出 | `NodeRegistered(node, fingerprintHash, regionCode)` 事件；`getNode(node)` 可查 |
| 失败路径 | 指纹已被占用 → `DuplicateFingerprint` 回滚；地址已注册 → `AlreadyRegistered` 回滚；调用者为合约地址 → `ContractNotAllowed` 回滚（防批量脚本注册） |

链下配合说明：指纹由客户端采集硬件标识与系统标识后本地哈希，只提交哈希值，避免把设备标识原文暴露到链上。指纹生成算法必须在客户端开源，否则无法排除「伪造指纹」的争议。

## 6.2 阶段二：资源证明采集与签名（链下）

| 项 | 内容 |
|---|---|
| 参与方 | 节点客户端、采集代理、验证者节点集合 |
| 输入 | 一个数据窗口（epoch）内的五类资源原始指标、心跳记录 |
| 处理步骤 | ① 归一化 `r_i = min(r_raw,i / B_i, cap_i)`；② 加权求和 `Σ w_i × r_i`；③ 乘时间系数 `k(t) = 1.0 + 0.5 × min(t,30)/30`；④ 乘防作弊系数 `f`；⑤ 生成 `metricsDigest` |
| 交叉比对 | 验证者独立采集同一节点的数据，与节点自报数据比对；偏差超容差则下调 `f` 或驳回 |
| 输出 | `ResourceProof` 结构 + 达到门限数量的验证者 EIP-712 签名数组 |
| 失败路径 | 签名数不足门限 → 无法进入链上验证；数据偏差超容差 → `f` 衰减或本轮不提交；节点离线超阈值 → `t` 归零 |

## 6.3 阶段三：链上验证

| 项 | 内容 |
|---|---|
| 参与方 | MintController（编排）、ProofValidator（验签） |
| 输入 | `ResourceProof`（含 `score`、`epoch`、`metricsDigest`、`fingerprintHash`、`continuousDays`、`antiCheatBps`）+ 签名数组 |
| 校验顺序 | ① `proof.node == msg.sender`（禁止代领）；② 计算 EIP-712 digest（域含 `chainId`，防跨链重放）；③ 签名严格递增去重，统计有效验证者数 ≥ 门限；④ 范围校验（`antiCheatBps ∈ (0,10000]`、`continuousDays ≤ 30`、`reportedAt ≤ block.timestamp`）；⑤ 防重放（同 `epoch` 同 digest 未使用过） |
| 输出 | 校验结论（`ok`、`digest`），供 MintController 继续或回滚 |
| 失败路径 | 见 6.3.1 |

### 6.3.1 验证失败原因与处理

| 失败条件 | 链上表现 | 处理 |
|---|---|---|
| 调用者非证明中的节点 | `NotProofOwner` 回滚 | 前端拦截，提示必须由节点地址发起 |
| 有效签名数 < 门限 | `ProofInvalid` 回滚 | 链下重新收集签名 |
| 签名未严格递增（重复或乱序） | `SignersNotStrictlySorted` 回滚 | 客户端按升序排序并去重签名 |
| 防作弊系数越界 / 在线天数越界 / 时间戳未来 | 返回 `ok = false` | 链下修正数据后重新签名 |
| 同一 epoch 同一摘要重复提交 | 返回 `ok = false`（防重放命中） | 正常现象，说明该轮已铸造 |

## 6.4 阶段四：铸造

| 项 | 内容 |
|---|---|
| 参与方 | MintController → GXNToken |
| 前置校验 | 节点状态为 `Active`；冷却满足 `block.timestamp ≥ lastMintAt + 3600`；`score ≥ scoreThreshold`；`amount > 0` |
| 换算 | `amount = score × mintRatePerScore / 1e18`（`mintRatePerScore` 为治理参数，待定） |
| 执行顺序 | 按 Checks-Effects-Interactions：先 `registry.recordProof` 落状态（更新 `lastMintAt`、`continuousDays`、`lastProofAt`），再 `token.mint` 发币 |
| 输出 | `Minted(node, amount, score, epoch)` 事件；节点余额增加，`lastMintAt` 更新 |
| 失败路径 | 冷却未到 → `MintCooldownNotElapsed` 回滚；贡献值低于阈值 → `ScoreBelowThreshold` 回滚；换算为 0 → `ZeroMintAmount` 回滚；铸造总开关关闭 → `MintIsPaused` 回滚 |
| 无需人为干预 | 全流程无管理员审批环节，满足条件即自动铸造，避免运营介入造成的公平性质疑 |

## 6.5 阶段五：税务征收与基金分配

### 6.5.1 征收（自动，随转账发生）

| 项 | 内容 |
|---|---|
| 触发 | 任意 `transfer` / `transferFrom`（通过 `_update` 统一拦截） |
| 判定 | `from` 或 `to` 命中 `isMarketPair` → 交易税 1%；否则转账税 0.5%；命中 `isTaxExempt` 或 mint/burn → 不计税 |
| 资金流向 | 税款从转出方余额直接划至 TreasuryFund 地址 |
| 输出 | `TaxCollected(from, to, taxAmount, taxKind)` 事件；TreasuryFund 余额与 `totalReceived` 同步增加 |

说明：TreasuryFund 的 `totalReceived` 以「收到的税额」累计。由于税款是直接划转而非回调通知，TreasuryFund 通过覆写 `onTokenTransfer` 式的记账入口不存在于 BEP-20 标准中，因此采用**由 GXNToken 在征收时同步调用 `TreasuryFund.notifyTax(from, amount)`**（仅允许 GXNToken 调用）来维持台账一致；若出于减少外部调用的考虑不采用该回调，则 `totalReceived` 需改为按余额变化延迟累计，两种方案择一，须在开发前确认。

### 6.5.2 分配（由出纳角色主动拉取）

| 项 | 内容 |
|---|---|
| 参与方 | TREASURER_ROLE 持有的运营账户 → TreasuryFund → 四类白名单地址 |
| 上限计算 | `capOf(kind) = totalReceived × bps / 10000`，其中 40/30/20/10 对应 4000/3000/2000/1000 bps |
| 执行 | `allocate(kind, to, amount)`：校验 `to` 在白名单、累计支出不超上限 → 记账 → `safeTransfer` |
| 输出 | `FundsAllocated(to, kind, amount)` 事件；`allocatedByKind` 更新 |
| 失败路径 | 收款方不在白名单 → `NotWhitelisted` 回滚；超出该用途上限 → `ExceedsAllocationCap` 回滚（治理修改比例时四项之和不等于 10000 bps 亦直接回滚） |
| 分配节奏 | 支出周期（周 / 月）与单笔上限属运营参数，**既定参数中未提供，待定** |

## 6.6 端到端时序

```
节点客户端            采集代理/验证者          MintController      ProofValidator      GXNToken        TreasuryFund
    │                      │                       │                   │                │                │
    │ 1 registerNode ──────────────────────────────┼───────────────────┼────────────────┼───► PoRRegistry
    │                      │                       │                   │                │                │
    │ 2 采集指标 ──────────► │ 交叉比对 + 计算 Score  │                   │                │                │
    │                      │ 阈值签名 ──────────────┼───────────────────┼────────────────┼────────────────│
    │ 3 requestMint(proof, sigs) ──────────────────► │ verifyProof ──────► │                │                │
    │                      │                       │ ◄── ok, digest ────│                │                │
    │                      │                       │ 冷却/阈值/换算      │                │                │
    │                      │                       │ recordProof ───────┼───► PoRRegistry │                │
    │                      │                       │ mint ──────────────┼───────────────► │                │
    │ ◄── GXN 到账          │                       │                   │                │                │
    │ 4 转账/交易 ──────────┼───────────────────────┼───────────────────┼───────────────► │ 抽税 1%/0.5% ──► │
    │                      │                       │                   │                │                │
    │                      │                       │                   │                │ 5 allocate ────► │ 四类支出
```

## 6.7 各阶段失败的影响面

| 阶段 | 失败后果 | 是否产生不可逆资产后果 |
|---|---|---|
| 注册失败 | 节点无法参与 PoR，无资产变动 | 否 |
| 采集 / 签名失败 | 本轮不产生证明，节点损失一轮收益 | 否 |
| 链上验证失败 | 交易整体回滚，不产生状态变更与铸造 | 否 |
| 铸造失败 | 交易回滚，`lastMintAt` 不变，可修正后重试 | 否 |
| 税务征收 | 无失败路径（随转账原子执行），若税额计算为 0 则按普通转账处理 | 否 |
| 基金分配失败 | 交易回滚，资金留在基金合约内，无损失 | 否 |

全链路所有写操作均为单笔交易内的原子动作，不存在「部分成功」状态，因此任一环节失败都不会造成资产损失，只会消耗 gas。



---


# 7. 安全设计

## 7.1 重入防护

| 措施 | 落点 | 说明 |
|---|---|---|
| `nonReentrant` 重入锁 | `MintController.requestMint`、`TreasuryFund.allocate` | 仅有的两个「先改状态再对外转账」入口，全部加锁 |
| Checks-Effects-Interactions | `requestMint` 先写 `lastMintAt` 等状态，最后调用 `token.mint` | 即使外部调用被劫持，冷却状态已落定，无法重复铸造 |
| 拉取式资金支出 | TreasuryFund 不主动推送资金，由 TREASURER 调用 `allocate` 拉取 | 消除「循环转账 + 循环中失败」的 DoS 与重入面 |
| 不引入代币回调 | GXNToken 不实现 ERC-777 类 `tokensReceived` 钩子 | 转账不给接收方任何执行机会，从根上消除代币层重入 |
| 单向依赖 | ProofValidator 与 PoRRegistry 之间无写依赖闭环 | 消除跨合约循环调用 |

`_update` 中的税务处理为纯账本操作（两次 `super._update`），不触发任何外部调用，因此不构成重入面；`treasury` 地址为 `immutable`，无法被篡改指向恶意合约。

## 7.2 女巫与伪造贡献防护

| 攻击方式 | 防护措施 | 有效性边界 |
|---|---|---|
| 单设备批量注册多地址刷贡献 | 设备指纹哈希一对一绑定，`fingerprintUsed` 拒绝重复注册；Paused/Banned 状态可冻结可疑地址 | 指纹算法若可被绕过（虚拟机改硬件标识），防护失效——依赖客户端指纹实现的开源与持续对抗 |
| 单维度刷分（如虚报存储容量） | 归一化上限 `cap_i` 限制单维度贡献上限，避免单一指标堆出高分 | `cap_i` 需按真实硬件分布设定，过高则失去抑制作用 |
| 低价设备集群（真实但低价值） | 贡献值阈值 `scoreThreshold` 过滤低贡献地址；冷却 1 小时限制刷量频率 | 若阈值低于集群成本，集群仍可持续获利——阈值需与经济模型联动测算 |
| 数据伪造（虚报带宽/算力） | 验证者独立采集并与自报数据交叉比对，偏差超容差下调 `f` 或驳回；`f` 趋近 0 时得分归零 | 依赖验证者的独立性与采集覆盖面 |
| 贡献值代领归集 | `proof.node == msg.sender` 强制校验，禁止第三方代提交 | 无残余风险（链上强约束） |
| 同一证明重复使用 | `isVerified[epoch][digest]` 防重放 + `epoch` 单调递增维度 | 需保证 `epoch` 不被复用，链下应维护递增窗口 |

残留风险须明确：**上述防护均不能证明「资源贡献真实有效」**。链上只能验证数据来源与格式合法，真实性的最终裁决权在验证者集合。因此验证者集合的独立性、数量与轮换机制是女巫防护的实际边界（见 7.3）。

## 7.3 资源数据来源可信性

本架构的根本信任假设是「验证者集合诚实且相互独立」，链上无法独立测量任何资源指标。围绕该假设的加固措施：

| 措施 | 设计 |
|---|---|
| 多重独立采集 | 每个数据窗口由多个验证者独立采集同一节点的指标，取一致性结果 |
| 阈值签名 | 链上要求有效签名数 ≥ `threshold`，单一验证者被攻破无法伪造数据 |
| 门限设定 | `threshold` 建议设为验证者总数的 2/3 以上（具体数值为治理参数，待定），提高串通成本 |
| 偏差检测 | 与自报数据偏差超容差时下调 `f`，异常集中出现时冻结该节点 `Active` 状态 |
| 角色轮换 | 验证者集合支持增删（`setValidator`），可淘汰长期异常节点 |
| 域分隔 | EIP-712 域分隔符包含 `chainId` 与合约地址，同一份签名无法在测试网/主网或其它合约间重放 |
| 时间戳约束 | `reportedAt ≤ block.timestamp`，禁止未来时间的数据窗口 |

验证者自身的激励与惩罚：验证者按贡献获得报酬、作恶被罚没，其经济参数（激励额度、质押与罚没比例）**既定参数中未提供，待定**。这是当前设计中最大的未决安全依赖——在验证者无质押、无罚没的情况下，串通造假的成本仅为信誉损失，无法在经济上抑制。

## 7.4 紧急暂停

暂停按作用域分粒度设计，避免「一停全停」导致用户资产无法流转：

| 作用域（scope） | 暂停对象 | 触发场景 |
|---|---|---|
| 0 | 全局转账（`GXNToken._update`） | 发现代币合约级严重漏洞、大规模异常转账 |
| 1 | 铸造（`MintController` / `GXNToken.mintPaused`） | 怀疑验证者被攻破、发现贡献值异常高值 |
| 2 | 证明提交与验签（`ProofValidator` / `PoRRegistry.recordProof`） | 采集侧数据污染、签名服务异常 |
| 3 | 基金支出（`TreasuryFund.allocate`） | 白名单地址被入侵、分配逻辑异常 |

| 暂停相关规则 | 口径 |
|---|---|
| 触发权限 | 仅 `GOVERNOR_ROLE`（多签持有），单签不可暂停 |
| 恢复权限 | 恢复需治理多签 + 时间锁延迟执行，且需在链上公示恢复原因 |
| 暂停的性质 | 仅阻止**流转与发行**，不冻结余额所有权；用户余额、已铸造代币的归属不因暂停改变 |
| 暂停期间的时间系数 | 设计约定（需确认）：全局转账或证明提交暂停期间，`continuousDays` 停止累计，避免「停摆期仍获得在线系数」 |
| 暂停时的不受影响项 | 已发出的转账交易若已上链则不可逆；暂停仅影响其后的交易 |
| 暂停演练 | 测试网阶段必须完成四个 scope 的暂停与恢复全流程演练 |

## 7.5 其他关联风险

| 风险 | 说明 | 缓解措施 | 残余风险 |
|---|---|---|---|
| 税务绕过 | 「免税路径」若判定过宽，攻击者可通过自建合约与白名单地址间的转账规避税费 | 免税名单收紧至必要系统地址（TreasuryFund、MintController、PoRRegistry、ProofValidator）；新增免税地址须经治理时间锁；链上监控异常免税路径调用频次 | 合约间自转账的合规性难以完全链上判定，需依赖监控与治理响应 |
| 整数精度损失 | 税率与换算涉及连续乘除，先除后乘会放大误差 | 统一使用「先乘后除」；金额与贡献值统一 1e18 定标；比例统一 bps | 极端小额的舍入可能产生 0 税额，属可接受行为（需在文档中明示） |
| 权限集中 | 治理角色若被单一私钥持有，等同于系统被单点控制 | `GOVERNOR_ROLE` 由多签持有；参数修改走「提案 + 时间锁」双阶段；治理合约不持有铸造权与提款权 | 多签成员串通的风险无法由代码消除 |
| 不可升级带来的修复滞后 | 合约无代理，发现漏洞后无法原地修补 | 通过分粒度暂停先行止损；新版本「部署 + 状态快照迁移」；迁移期需并行双账本核对 | 迁移窗口内可能存在状态不一致风险，需冻结写入后迁移 |
| 签名数组长度导致的 gas 耗尽 | 验证者数量无上限时，验签循环可能超出区块 gas 上限 | `verifyProof` 限制签名数组最大长度；验证者总数设上限（治理参数，待定） | 上限过低会削弱去中心化程度，需在安全与分布式之间取平衡 |
| 前端与签名钓鱼 | 用户被诱导签署非预期的 EIP-712 结构 | 域分隔符含 `chainId` 与合约地址；前端展示完整待签字段；签名结构不含可自由扩展字段 | 用户侧安全无法由合约保证 |
| 验证者贿赂 | 收买门限数量的验证者为特定地址虚增贡献 | 提高门限比例、验证者轮换、收益与惩罚对称设计 | 无罚没机制时无法经济抑制（见 7.3） |



## 7.6 风险清单（触发条件 → 影响 → 缓解 → 止损阈值）

| 风险 | 触发条件 | 影响 | 缓解 | 止损阈值（示例口径，具体数值待定） |
|---|---|---|---|---|
| 验证者串通虚增贡献 | 同一 epoch 内某地址 Score 显著偏离其历史分布 | 高 | 偏差检测下调 `f`；暂停 scope 1 铸造；治理替换验证者 | 单地址 Score 超过其 30 日移动均值 N 倍时自动驳回并告警 |
| 女巫集群刷量 | 同指纹注册量异常、同 ASN 短时大量注册 | 中 | 指纹去重、注册速率限制、状态冻结 | 同 ASN 单日注册数超阈值触发人工复核 |
| 税务绕过 | 免税地址出现高频大额流转 | 中 | 免税名单收紧 + 时间锁 + 链上监控 | 免税地址单日流出量超阈值告警并暂停 scope 3 |
| 代币合约漏洞 | 转账路径异常、余额不平 | 高 | 暂停 scope 0；不可升级条件下走版本迁移 | 出现可复现的余额不一致即全量暂停 |
| 基金支出异常 | 单笔支出接近或超出用途上限 | 中 | `capOf` 上限硬约束 + 白名单 + 出纳角色分离 | 单日支出达到该用途上限的 80% 触发复核 |
| 治理私钥泄露 | 多签成员设备被入侵 | 高 | 多签门限 + 时间锁为最后的反应窗口 | 时间锁期内可撤销待执行参数 |



---


# 8. 部署方案

## 8.1 网络与环境

| 项 | 测试网 | 主网 |
|---|---|---|
| 网络名称 | BNB Smart Chain 测试网（Chapel） | BNB Smart Chain 主网 |
| chainId | 97 | 56 |
| 原生代币 | tBNB（测试用） | BNB（需真实成本） |
| 区块浏览器 | 测试网 BscScan（用于源码验证与交易核对） | 主网 BscScan |
| RPC 接入 | 官方或自建归档节点，具体 URL 由运维配置，不写入代码仓库 | 同左，建议配置多节点故障切换 |
| 部署账户 | 测试用专用账户，私钥不入库，使用硬件钱包或多签 | 必须为多签账户或硬件钱包，禁止使用热钱包私钥部署 |
| 工具链 | Foundry（`forge script`）执行部署与验证；Hardhat 做 BscScan 验证兜底 | 同左 |

部署前必须核对 chainId 与目标网络，EIP-712 域分隔符包含 `chainId`，在测试网签发的证明签名无法在主网使用，这一差异是预期行为，而非缺陷。

## 8.2 部署顺序与依赖

部署顺序不可随意调换的原因在于**构造依赖与代币记账依赖**：GXNToken 在构造时需要运维基金地址（税款接收方），而 TreasuryFund 需要知道代币地址才能转账，形成一处循环依赖。解决办法是让 TreasuryFund 的代币地址采用一次性后置设置：

```solidity
// TreasuryFund：仅允许部署者一次性绑定代币，绑定后不可更改
function bindToken(IERC20 token_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(address(token) == address(0), "token already bound");
    token = token_;
}
```

| 步骤 | 合约 | 关键构造 / 初始化参数 | 依赖 | 必须在此位次的原因 |
|---|---|---|---|---|
| 1 | **TreasuryFund** | 无代币构造依赖（`token` 后置绑定） | 无 | 必须最先部署，为 GXNToken 提供 `treasury` 地址 |
| 2 | **GXNToken** | `treasury = TreasuryFund 地址`；名称 Guixu Node / 代码 GXN | 步骤 1 | 构造时校验 `treasury != address(0)`，且税务划转目标不可变 |
| 3 | TreasuryFund 调 `bindToken(GXNToken)` | — | 步骤 2 | 绑定代币地址，完成循环依赖闭合 |
| 4 | **PoRRegistry** | 无 | 无 | 无依赖，可与步骤 5 并行部署 |
| 5 | **ProofValidator** | 初始验证者集合、`threshold`（待定） | 无 | 与步骤 4 并行 |
| 6 | **MintController** | `token`、`registry`、`validator` 三个地址 | 步骤 2、4、5 | 需引用三者地址；`MINT_COOLDOWN` 为编译期常量，无需传参 |
| 7 | **Governance** | 多签成员、时间锁延迟 | 步骤 1-6 | 需在授予角色前，把所有受管合约地址登记进治理 |
| 8 | 角色授予与移交 | 见 8.4 | 步骤 7 | 必须在治理就绪后执行，避免角色悬空 |

## 8.3 部署后参数写入清单

| 参数 | 目标值 | 所在合约 | 是否已有默认值 |
|---|---|---|---|
| 交易税 | 100 bps（1%） | GXNToken | 是（构造函数默认赋值，需链上核对） |
| 转账税 | 50 bps（0.5%） | GXNToken | 是（同上） |
| 基金分配比例 | 4000 / 3000 / 2000 / 1000 bps | TreasuryFund | 是（合约内初始值，需链上核对） |
| 铸造冷却 | 3600 秒（1 小时） | MintController | 是（`constant`，不可修改） |
| 五类资源权重 | 1.5 / 1.2 / 1.1 / 1.0 / 0.8（1e18 定标） | PoRMath 库常量 | 是（`constant`，调整需重新部署） |
| 时间系数公式 | `10000 + 5000 × min(t,30)/30` bps | PoRMath 库常量 | 是（`constant`，不可修改） |
| 铸造换算率 `mintRatePerScore` | **待定**（治理参数） | MintController | 否，必须显式设置 |
| 贡献值阈值 `scoreThreshold` | **待定**（治理参数） | MintController | 否，必须显式设置 |
| 验证者门限 `threshold` | **待定**（治理参数，建议 ≥ 验证者总数 2/3） | ProofValidator | 否，必须显式设置 |
| 验证者集合 | 初始成员地址列表 | ProofValidator | 否，必须显式设置 |
| 交易对登记 `isMarketPair` | DEX 交易对地址（主网交易对地址以实际创建结果为准） | GXNToken | 否，必须在交易对创建后登记 |
| 免税地址 `isTaxExempt` | TreasuryFund、MintController、PoRRegistry、ProofValidator | GXNToken | 否，需逐项设置并经时间锁 |
| 基金白名单 `whitelist` | 四类用途的接收地址各 1 个（建议多签或对应专户） | TreasuryFund | 否，必须显式设置 |

未提供数值的参数（`mintRatePerScore`、`scoreThreshold`、`threshold`、验证者成员）必须在上线前由治理确定并公示，缺失时铸造流程不可用（阈值默认为 0 会导致任意贡献值均可铸造，属于危险默认值，部署后必须立即设置）。

## 8.4 角色授予与移交清单

| 角色 | 目标持有者 | 所在合约 | 移交动作 |
|---|---|---|---|
| `MINTER_ROLE` | MintController 地址 | GXNToken | 部署后授予，且**不得**授予任何 EOA 或治理合约 |
| `REGISTRY_WRITER` | MintController 地址 | PoRRegistry | 部署后授予 |
| `GOVERNOR_ROLE` | Governance 合约地址 | 全部 5 个业务合约 | 授予后必须核对原部署者是否仍持有 |
| `TREASURER_ROLE` | 运营多签地址或出纳专户 | TreasuryFund | 授予，且持有人不得同时持有 `GOVERNOR_ROLE`（支出与治理分离） |
| `DEFAULT_ADMIN_ROLE` | Governance 合约地址 | 全部 6 个合约 | 移交后**撤销部署者账户**的该角色，撤销动作需链上确认 |
| 部署者账户 | 不再持有任何角色 | 全部合约 | 最终核对 `hasRole` 全为 false |

## 8.5 部署后验证清单

以下每一项都必须在链上实测，不能只做静态代码核对：

| 验证项 | 方法 | 通过标准 |
|---|---|---|
| 源码验证 | BscScan 上传源码与构造参数 | 全部 6 个合约显示 `Verified` |
| 角色矩阵 | 逐合约调用 `hasRole` 核对 | 与 8.4 表格完全一致；部署者无任何角色 |
| 税率实测（普通转账） | 从 A 向 B 转 100 GXN，核对到账金额 | B 实际到账 99.5 GXN，基金收到 0.5 GXN，`TaxCollected` 事件 `taxKind = 2` |
| 税率实测（交易路径） | 经登记的交易对地址转账 100 GXN | 到账 99 GXN，基金收到 1 GXN，`taxKind = 1` |
| 免征路径实测 | MintController 触发一次铸造；TreasuryFund 执行一次分配 | 两者均未被扣税，基金收入仅来自外部流转 |
| 冷却实测 | 同一地址在 1 小时内连续两次 `requestMint` | 第二次以 `MintCooldownNotElapsed` 回滚 |
| 阈值实测 | 提交低于 `scoreThreshold` 的证明 | 以 `ScoreBelowThreshold` 回滚 |
| 防重放实测 | 同一 `epoch` 同一 digest 重复提交 | 验签返回 `ok = false`，不产生铸造 |
| 防代领实测 | 由非证明节点地址调用 `requestMint` | 以 `NotProofOwner` 回滚 |
| 分配上限实测 | 尝试支出超过某用途 `capOf` 的金额 | 以 `ExceedsAllocationCap` 回滚 |
| 分配比例约束实测 | 尝试设置四项之和不等于 10000 bps 的比例 | 以 `AllocationMustSumTo10000` 回滚 |
| 暂停演练 | 依次暂停 scope 0/1/2/3 并恢复 | 每次暂停仅影响对应功能，其余功能正常；恢复需治理 + 时间锁 |
| 事件抓取 | 索引服务订阅全部事件 | 六类合约主要事件均可正常解析入库 |

## 8.6 主网切换要点

| 要点 | 要求 |
|---|---|
| 前置条件 | 测试网 Chapel 全部验证项通过（见 8.5）且第三方审计高危问题清零 |
| 参数冻结 | `mintRatePerScore`、`scoreThreshold`、`threshold`、验证者集合在主网部署前冻结并公开发布 |
| 灰度策略 | 首期限制铸造规模与验证者数量（具体限额待定），确认无异常后逐步放开 |
| 暂停常备 | 部署完成后立即确认四个 scope 的暂停调用可用，并把治理多签的暂停操作流程写入运维手册 |
| 监控上线 | 监控须覆盖第 7.6 节风险清单的全部触发条件，告警通道与责任人在上线前确认 |
| 资金准备 | 主网部署与后续运维调用需消耗 BNB，须预留足量余额，避免治理操作因余额不足而无法执行 |
| 回退路径 | 主网合约不可升级，出现严重问题时以「暂停 → 修复 → 重新部署 → 状态迁移」处理，不假设存在原地修复能力 |

## 8.7 部署产物与记录

| 产物 | 内容 |
|---|---|
| 合约地址清单 | 6 个合约在测试网与主网的地址、部署交易哈希、部署区块号 |
| 构造参数记录 | 每个合约的构造函数入参原文（含 TreasuryFund 地址等） |
| 角色矩阵快照 | 部署后 `hasRole` 查询结果留档 |
| 参数公示 | 第 8.3 节全部参数的实际生效值 |
| 验证清单回执 | 第 8.5 节每一项的实测交易哈希 |



---


# 9. 开发里程碑

## 9.1 阶段总览与关键路径

```
M1 合约开发与单测 ──► M2 测试网 Chapel 联调 ──► M3 第三方审计与修复 ──► M4 主网部署与灰度
```

四个阶段为严格线性依赖：每一阶段的交付物是下一阶段的输入，不存在可并行空间。**关键路径为 M1 → M2 → M3 → M4**，其中 M3（审计）通常为耗时最长的不确定环节，M4 的前置条件之一是审计高危问题清零。

各阶段设置阶段门（Gate）：未通过验收标准不得进入下一阶段。

## 9.2 里程碑任务表

| 阶段 | 任务 | 交付物 | 负责角色 | 依赖 | 验收标准 |
|---|---|---|---|---|---|
| **M1 合约开发与单测** | 实现 6 个合约（GXNToken / PoRRegistry / ProofValidator / MintController / TreasuryFund / Governance）与 PoRMath 库 | 合约源码仓库（Foundry 工程结构） | 合约开发工程师（待指定） | 本文档定稿；待定参数首轮取值确定 | 6 个合约全部编译通过；`forge build` 无警告级问题 |
| | 编写单元测试：税率、冷却、验签、换算、分配上限、权限 | 测试套件 | 合约开发工程师 | 合约实现 | 全部用例通过；**建议目标**：核心合约分支覆盖率 ≥ 90%（既定参数未提供该基准，属建议值） |
| | 编写断言测试：冷却 1 小时边界、1%/0.5% 税率边界、40/30/20/10 之和约束 | 边界测试用例集 | 合约开发工程师 | 单元测试框架就绪 | 冷却 3599 秒回滚 / 3600 秒通过；税率取整符合预期；四项和不等于 10000 bps 时回滚 |
| | 模糊测试与不变量测试（如「铸造总量 == 各地址余额之和」「基金余额 ≥ 累计分配额」） | 模糊测试报告 | 合约开发工程师 | 单元测试通过 | 无高危反例；不变量在当前测试深度内恒成立 |
| | gas 测量与优化 | gas 报告 | 合约开发工程师 | 功能实现冻结 | 关键路径（`requestMint`、`_update`、`allocate`）gas 消耗有基线记录，供后续回归对比 |
| **M2 测试网 Chapel 联调** | 在 Chapel 部署 6 个合约并完成角色授予 | 测试网合约地址清单 + 部署记录 | 合约开发工程师 | M1 通过阶段门 | 部署顺序与依赖符合第 8.2 节；角色矩阵与第 8.4 节一致 |
| | 链下采集与签名服务对接：采集代理、验证者节点、阈值签名服务 | 联调环境（采集 → 签名 → 提交全链路可用） | 后端工程师（待指定） | 测试网合约就绪 | 链下生成的 EIP-712 签名能被链上 `verifyProof` 成功校验 |
| | 端到端跑通「注册 → 采集 → 验证 → 铸造 → 税务 → 分配」 | 联调报告 + 全链路演示交易哈希 | 后端工程师 + 合约开发工程师 | 签名服务可用 | 一笔完整链路可在区块浏览器逐笔核对；数据与第 3 章公式一致 |
| | 执行第 8.5 节本地验证清单全部 13 项 | 验证清单回执 | 合约开发工程师 | 端到端跑通 | 13 项全部通过，每项附交易哈希 |
| | 四类暂停 scope 的暂停/恢复演练 | 演练记录 | 运维工程师（待指定） | 合约部署完成 | 每个 scope 暂停仅影响对应功能；恢复需治理 + 时间锁 |
| | 稳定性观察期 | 观察期运行日志 | 运维工程师 | 全链路可用 | **示例口径**：连续 7 天无人工干预下按 1 小时冷却稳定产出铸造记录，无异常回滚（观察期具体时长待定） |
| **M3 第三方安全审计与修复** | 选定审计机构并提供代码、文档、部署说明 | 审计委托与范围确认书 | 项目技术负责人（待指定） | M2 通过阶段门 | 审计范围明确覆盖 6 个合约与链下签名服务接口 |
| | 审计执行 | 审计报告 | 第三方审计机构 | 代码冻结 | 报告含结论、问题分级与复现步骤 |
| | 问题修复与复测 | 修复记录 + 复测报告 | 合约开发工程师 | 审计报告出具 | 高危、中危问题全部关闭；低危问题有明确处置结论（修复或书面接受） |
| | 重跑全部单测与端到端链路 | 回归测试报告 | 合约开发工程师 | 修复完成 | 修复未破坏任何既有验收项 |
| **M4 主网部署与灰度** | 主网部署 6 个合约 | 主网合约地址清单 + 部署交易哈希 | 合约开发工程师 + 多签持有人 | M3 通过阶段门 | 部署顺序与依赖符合第 8.2 节；部署账户为多签或硬件钱包 |
| | BscScan 源码验证 | 验证截图与合约页面 | 运维工程师 | 主网部署完成 | 6 个合约全部 `Verified` |
| | 参数冻结与公示 | 参数公示文档（`mintRatePerScore`、`scoreThreshold`、`threshold`、验证者集合） | 项目技术负责人 | 主网部署完成 | 参数在治理界面与公示渠道一致；链上实际值与公示值完全一致 |
| | 灰度运行 | 灰度期报告 | 运维工程师 | 参数配置完成 | 灰度期内未出现越权调用、未突破用途上限、无异常铸造记录 |
| | 监控与告警上线 | 监控看板 + 告警通道 | 运维工程师 | 主网运行 | 监控覆盖第 7.6 节风险清单全部触发条件；告警可送达责任人 |
| | 上线复盘 | 复盘报告 | 项目技术负责人 | 灰度期结束 | 记录未达预期的项并输出改进项，明确后续版本（如多链）的启动条件 |

## 9.3 阶段门验收口径

| 阶段门 | 通过条件（全部满足） |
|---|---|
| M1 → M2 | 编译通过、单测全绿、边界测试通过、模糊测试无高危反例、gas 基线建立 |
| M2 → M3 | 测试网 13 项验证清单全通过、端到端链路可复现、暂停演练完成、稳定性观察期无异常 |
| M3 → M4 | 审计高危与中危问题清零、低危有结论、回归测试全绿 |
| M4 完成 | 主网源码全验证、参数冻结公示、灰度期无越权与超限、监控告警可用 |

## 9.4 未定项与前置决策

以下项目在既定参数中未提供，须在对应阶段开始前解决，否则不得进入下一阶段：

| 未定项 | 需要决策的内容 | 最迟解决时点 |
|---|---|---|
| 铸造换算率 `mintRatePerScore` | 每单位贡献值对应的 GXN 数量，直接决定通胀速度 | M1 开始前（用于测试取值），M4 前冻结 |
| 贡献值阈值 `scoreThreshold` | 触发铸造的最低贡献值 | 同上 |
| 归一化基准值 `B_i` 与上限 `cap_i` | 五类资源的归一化标尺与单维上限 | M2 开始前（影响链下计算与链上复算一致性） |
| 验证者门限 `threshold` 与成员集合 | 门限比例与初始验证者名单 | M2 开始前（联调必需），M4 前冻结 |
| 验证者激励与罚没参数 | 验证者报酬额度、是否引入质押与罚没 | M3 审计前（引入质押会改变合约结构） |
| 在线判定与中断宽限口径 | 心跳间隔、超时阈值、连续在线是否设宽限窗口 | M2 开始前 |
| 阶段时间表与负责人 | 各阶段起止时间与责任人指派 | M1 开始前 |
*（内容由AI生成，仅供参考）*

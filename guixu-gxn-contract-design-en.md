# Guixu Consensus Platform GXN Smart Contract Design Document

| Item | Content |
| ---- | ------- |
| Document Version | v1.0 |
| Date of Preparation | 2026-09-25 |
| Scope | BNB Smart Chain (BEP-20 standard), single-chain only in this phase |
| Document Status | Design finalized, pending development implementation |
| Design Basis | Guixu Consensus Platform Whitepaper v1.1 and the project's finalized parameters (token, tax, cooldown, resource weights, time coefficient) |
| Intended Readers | Smart contract developers, backend and DevOps engineers, and third-party auditing firms |

---

# 1. Overview and Positioning

## 1.1 Functional Positioning of the GXN Token

GXN (Guixu Node, Chinese name "归墟节点币") is a BEP-20 token issued by the Guixu Consensus Platform on BNB Smart Chain, serving three functions:

| Function | Description |
| -------- | ----------- |
| Contribution settlement certificate | Only contribution records that pass PoR (Proof of Resource) verification can trigger minting; token increments correspond strictly to resource contributions |
| Fund unit of account | The revenue and expenditure of the Treasury Fund and the payout of node incentives are all denominated and settled in GXN |
| Network incentive target | The platform rewards node contributions with GXN, forming a closed loop of "contribution → issuance → incentive → re-contribution" |

The essential difference between GXN and traditional mining-style tokens lies in the **issuance basis**: PoW issues through hash-power competition and PoS issues through capital staking, whereas GXN issues through **multi-dimensional resource contribution**, with no capital entry channel — no private sale, no public sale, no pre-mine, and an initial supply of zero.

| Dimension | PoW-type token | PoS-type token | GXN (PoR-type) |
| --------- | -------------- | -------------- | -------------- |
| Issuance basis | Hash-power competition | Token staking amount | Weighted value of five resource contributions (see Chapter 3) |
| Initial distribution | Often has a pre-mine | Often has private sale / foundation shares | Initial supply 0, no private sale, no public sale, no pre-mine |
| Supply method | Usually has a total supply cap | Usually has a total supply cap | Minted on demand, no total supply cap |
| Entry cost | Hardware and electricity | Token holdings | Resource contribution (differentiated weights, not a capital threshold) |
| Issuance throttling | Difficulty adjustment | Staking rate and block probability | Address-level mint cooldown of 1 hour + contribution score threshold + anti-cheat coefficient |
| Tax mechanism | None (or miner fee) | None (or protocol fee) | Trade tax 1% + transfer tax 0.5%, fully injected into the Treasury Fund |

## 1.2 Reasons for Choosing BSC

This phase deploys only on a single chain, BNB Smart Chain, based on the following comparison:

| Evaluation dimension | BNB Smart Chain | Ethereum Mainnet | Judgement |
| -------------------- | --------------- | ---------------- | --------- |
| EVM compatibility | Fully compatible; Solidity 0.8.x + OpenZeppelin can be reused directly | Fully compatible | Comparable; BSC has no obvious disadvantage |
| Write cost | Low gas cost per transaction, suited to "high-frequency contribution records + small-amount minting" | High cost; a single mint may cost more than the value minted | BSC better |
| Block production and confirmation | About 3-second block time, fast transaction confirmation | About 12-second block time | BSC better |
| Toolchain | Mature Hardhat / Foundry / BscScan verification / event indexing (The Graph) | Most mature ecosystem | Both usable |
| Token and liquidity ecosystem | Mature BEP-20 standard, ample DEX liquidity in the BNB ecosystem | Most ample liquidity | Both usable; BSC meets initial needs |
| Match with PoR architecture | The off-chain computation + on-chain signature verification scheme using EIP-712 / ECDSA can be implemented directly | Also implementable, but at higher cost | BSC better |

The core logic of the BSC choice: **PoR is a high-frequency, small-amount write workload** (each node generates at most one mint request per hour, plus a continuous stream of proof submissions), and the value density of its on-chain actions is lower than the average transaction value on Ethereum Mainnet; therefore it must run on a chain where the per-transaction cost is negligible.

This phase does not introduce L2 or cross-chain bridges, for the following reasons:

| Excluded item | Reason |
| ------------- | ------ |
| L2 / Rollup | The primary task of PoR is to verify the correctness of the "off-chain data + on-chain signature verification" main flow; introducing L2 adds withdrawal latency and sequencer trust assumptions, interfering with the judgement of the security model |
| Cross-chain bridge | A bridge is an independent, high-risk attack surface, and this phase has no business need for multi-chain issuance; introducing a bridge only expands the audit scope without benefit |
| Simultaneous multi-chain issuance | Multi-chain brings a threefold split in supply accounting, tax accounting, and governance accounting, conflicting with the single supply ledger principle of "no private sale, minted on demand" |

## 1.3 Delivery Scope and Boundaries of This Phase

| Scope item | Delivered in this phase | Description |
| ---------- | ----------------------- | ----------- |
| BEP-20 token and tax mechanism | Yes | Trade tax 1% and transfer tax 0.5% intercepted at the transfer layer |
| PoR attestation (node registration and proof records) | Yes | PoRRegistry |
| PoR proof verification (signature and threshold checks) | Yes | ProofValidator |
| Mint control and address-level cooldown | Yes | MintController, cooldown 1 hour |
| Treasury Fund and four-way allocation | Yes | TreasuryFund, 40/30/20/10 |
| Governance parameters and role management | Yes | Governance |
| L2 deployment | No | BSC single-chain only in this phase |
| Cross-chain bridge / multi-chain issuance | No | Not introduced in this phase |
| Upgradeable proxy (UUPS / Transparent Proxy) | No | Adopts a "non-upgradeable + new version deployment + state migration" strategy to avoid proxy storage layout risk |
| Full on-chain storage of raw resource data | No | Only digests, indexes, and state are stored on-chain; raw data stays off-chain and enters the event log |

## 1.4 Glossary

| Term | Meaning |
| ---- | ------- |
| BEP-20 | The fungible token standard on BNB Smart Chain, whose interface is equivalent to ERC-20 |
| PoR | Proof of Resource: a consensus mechanism weighted by five categories of resource contribution — hash power, storage, stability, bandwidth, and geographic location |
| Contribution score (Score) | The scalar obtained by combining a node's resource contribution with weights, the time coefficient, and the anti-cheat coefficient; it is the sole input to the minted amount |
| Treasury Fund (Treasury) | The on-chain fund pool that receives all tax revenue and distributes it according to 40/30/20/10 |
| Mint cooldown | The minimum time interval between two successful mintings from the same address; fixed at 1 hour in this phase |
| Validator | The set of authorized entities that collect and compute resource contribution data off-chain and submit results on-chain via threshold signatures |
| Threshold signature | A signature jointly issued by at least a threshold number of members of the validator set, accepted on-chain only after signature verification |

---

# 2. Token Economics

## 2.1 Basic Token Parameters

| Parameter | Value | Description |
| --------- | ----- | ----------- |
| Name | Guixu Node | — |
| Symbol | GXN | — |
| Chinese name | 归墟节点币 | — |
| Standard | BEP-20 | Interface equivalent to ERC-20 on BNB Smart Chain |
| Decimals | 18 | Design convention: the conventional BEP-20 precision of 18 is adopted; not separately specified in the finalized parameters, and any other precision must be confirmed before deployment |
| Initial supply | 0 | No private sale, no public sale, no pre-mine; no tokens are minted at deployment |
| Supply cap | No cap | Minted on demand (mint-on-demand) |
| Issuance channel | Only minting after PoR verification passes | The contract provides no administrator backdoor function for direct minting |
| Transfer and burn | Supports standard transfer / approve / transferFrom | No holder dividends, no automatic burn |

Design red line: **the mint permission of GXNToken is granted only to the single address MintController**, which in turn requires the caller to supply proof data that has passed ProofValidator verification together with the cooldown check result. The administrative role (Governance) has no direct minting right, avoiding the single-point risk of "governance equals minting right".

## 2.2 Minting Rules

| Rule item | Value | Description |
| --------- | ----- | ----------- |
| Address-level mint cooldown | 1 hour (3600 seconds) | The minimum interval between two successful mintings from the same address |
| Cooldown timing basis | On-chain `block.timestamp` and `lastMintAt[address]` | Does not rely on off-chain time, avoiding clock tampering |
| Trigger condition | The submitted PoR proof passes validation and the current round's contribution score ≥ threshold | The threshold is a governance parameter, to be determined (not preset in this design) |
| Single mint amount | Converted from the contribution score | Conversion formula in Section 3.6; the conversion rate is a governance parameter, to be determined |
| Total supply | Soft cap of 50 billion | Approaching 50 billion triggers a DAO governance vote (see 2.7) |
| Mint recipient address | Must be the node address registered in the proof | Proxy claiming is forbidden, preventing contribution-score aggregation to inflate volume |

The logic behind the coexistence of "no cap" and "protection against disorderly inflation": the note "no cap" in the table of Section 2.1 means that no total supply hard cap is set in the early stage, which does not mean the issuance rate is unconstrained. The actual issuance rate is subject to three superimposed constraints:

| Constraint | Effect |
| ---------- | ------ |
| Address-level cooldown of 1 hour | The theoretical maximum minting frequency of a single address is 24 times/day, and only on the premise that each mint passes verification |
| Contribution score threshold | Addresses that do not reach the threshold cannot trigger minting, suppressing low-quality or shell nodes |
| Anti-cheat coefficient f | Attenuates forgery, duplicate reporting, and data deviation, directly lowering the Score and thus the minted amount |

When the cumulative minted amount approaches **50 billion (50,000,000,000 GXN)**, a DAO governance vote is triggered to decide whether to freeze minting or switch to exchanging contribution scores against existing circulating supply (a buyback-and-burn model). See Section 2.7 for the detailed design. Until then, the mint-on-demand mechanism remains unchanged, with no total supply hard cap.

## 2.7 Soft Cap Design (50-Billion Governance Vote)

When the cumulative minted amount of GXN approaches 50 billion, the protocol automatically triggers a DAO governance vote, in which the community decides whether to freeze minting or switch to a buyback-and-burn model.

### 2.7.1 Trigger Mechanism

| Item | Value / Description |
| ---- | ------------------- |
| Trigger amount | 50 billion (50,000,000,000 GXN) |
| Trigger method | A global minted-total counter `totalMinted` is added inside MintController and incremented after each `token.mint`; when `totalMinted` approaches the trigger threshold (e.g., 45 billion, i.e., 90%), the next `requestMint` call checks and triggers the voting process |
| Voting state | A `bool softCapTriggered` flag is used; once triggered, `softCapTriggered = true`, and subsequent mint requests enter the governance voting stage and can proceed only after the DAO vote passes |
| Voting content | ① Freeze minting: permanently stop mint-on-demand (`mintPaused = true`); ② Buyback and burn: suspend mint-on-demand and switch to exchanging contribution scores against existing circulating supply (nodes obtain new minted amounts by burning existing GXN, realizing an internal circulation of supply) |

### 2.7.2 Contract Implementation Locations

| Contract | Added / modified content |
| -------- | ------------------------ |
| **MintController** | ① Add `uint256 public totalMinted` (global minted-total counter); ② Add a soft-cap check at the beginning of `requestMint`: if `totalMinted >= SOFT_CAP_THRESHOLD` and `softCapTriggered == true`, call the Governance voting interface; ③ Add the `SOFT_CAP_THRESHOLD` constant (45 billion, i.e., 90%) |
| **Governance** | Add a voting interface supporting two proposal options (freeze minting / buyback and burn); after the vote passes, Governance executes the final state switch |

### 2.7.3 Flowchart: Soft Cap Trigger and Governance Decision

```
Cumulative minted amount approaches 50 billion
        │
        ▼
  MintController.checkSoftCap()
        │
        ▼
  totalMinted >= 45 billion (SOFT_CAP_THRESHOLD)?
        │
    Yes ┘
        ▼
  softCapTriggered = true
        │
        ▼
  DAO governance vote starts
        │
    ┌───┴───┐
    ▼       ▼
 Option ①:  Option ②:
 Freeze     Buyback and burn
 minting    (exchange contribution
(permanent  scores for existing
 halt)       supply, internal
             circulation)
    │       │
    ▼       ▼
 Vote       Vote
 passes     passes
    │       │
    ▼       ▼
mintPaused=true  mintPaused=true
             + enable buyback-and-burn model
             (nodes burn GXN for new minting)
    │       │
    ▼       ▼
 Minting     Minting process
 process     enters buyback-and-burn
 stops /     mode
 new
 mechanism
 starts
```

### 2.7.4 State Transitions

```
                    ┌─────────────┐
                    │ Initial state │
                    │ softCapTriggered=false │
                    └──────┬──────┘
                           │ Minting in progress
                           │ totalMinted accumulating
                           ▼
                    ┌─────────────┐
                    │ Approaching   │
                    │ threshold     │
                    │ 45 billion →  │
                    │ trigger       │
                    └──────┬──────┘
                           │ Enter DAO vote
                           ▼
                    ┌─────────────┐
                    │ Freeze minting│── Vote fails or ① chosen ──→ mintPaused=true
                    │ OR            │
                    │ Buyback and   │── Vote passes and ② chosen ──→ enable buyback-and-burn model
                    │ burn          │
                    └─────────────┘
```

### 2.7.5 Contract Code Skeleton

```solidity
// MintController.sol — additions related to the soft cap

uint256 public constant SOFT_CAP_THRESHOLD = 45_000_000_000 ether; // 45 billion
uint256 public constant SOFT_CAP_TARGET    = 50_000_000_000 ether; // 50 billion

uint256 public totalMinted;                // Global minted-total counter
bool   public softCapTriggered;            // Whether the soft cap has been triggered

event SoftCapTriggered(uint256 totalMinted, uint256 totalSupply);
event VotingResult(bool freezeMinting, bool enableBuyback);

function checkSoftCap() internal {
    if (!softCapTriggered && totalMinted >= SOFT_CAP_THRESHOLD) {
        softCapTriggered = true;
        emit SoftCapTriggered(totalMinted, totalSupply());
        // Trigger the DAO voting process (via Governance)
        _triggerGovernanceVote();
    }
}

function _triggerGovernanceVote() internal {
    // Call the Governance contract to create a voting proposal
    // Proposal content: freeze minting vs. buyback and burn
    governance.proposeSoftCapDecision();
}
```

### 2.7.6 Buyback-and-Burn Model (When Option ② Passes the Vote)

When the DAO vote passes the buyback-and-burn model, the minting mechanism switches to:

- Nodes no longer exchange contribution scores directly for newly minted amounts
- Instead, contribution scores are exchanged for existing circulating supply: a node submits a contribution proof plus burns a certain amount of GXN, and MintController mints an equal amount of new GXN according to the contribution score
- Implementation: add a `requestBuybackMint` function requiring the node to pass in `burnAmount` (the amount of GXN to be burned); after burning via `token.burn`, new GXN is minted according to the contribution score
- Effect: total circulating supply stays unchanged (burn = mint), but nodes with high contribution scores can obtain more newly minted amounts by consuming their own tokens, forming an internal circulation driven by contribution

This model ensures that the 50-billion total supply cap is not breached while maintaining the continuity of contribution incentives.

### 2.7.7 Design Principles

| Principle | Description |
| --------- | ----------- |
| Not a hard cap | 50 billion is not an insurmountable hard cap but a governance trigger threshold; the community has the final say |
| Early warning | The threshold is set at 90% (45 billion), giving the community ample time for discussion and voting |
| Two exclusive options | Freeze minting (preserve supply) or buyback and burn (preserve the mechanism), avoiding ambiguity |
| No change to existing parameters | Before the vote passes, all parameters such as minting rules, tax rates, and cooldown remain unchanged |

## 2.3 Tax Rules

| Tax type | Rate | Trigger scenario | Recipient |
| -------- | ---- | ---------------- | --------- |
| Trade tax | 1% | The transfer path involves a DEX trading pair (buy, sell, add/remove liquidity) | Treasury Fund (TreasuryFund) |
| Transfer tax | 0.5% | Transfers between ordinary addresses (non-trading-pair paths) | Treasury Fund (TreasuryFund) |

Implementation specifications for tax rates:

| Implementation item | Specification |
| ------------------- | ------------- |
| Basis representation | 10000 bps = 1.0; trade tax = 100 bps, transfer tax = 50 bps |
| Interception location | Overridden in `_update` (the unified transfer entry point of OpenZeppelin v5); `transfer` / `transferFrom` / `mint` / `burn` all go through this path |
| Trading path determination | Maintain the `isMarketPair[address]` set; when `from` or `to` hits this set, the transfer is judged as a trade and charged at 1%; otherwise charged at 0.5% |
| Collection method | The tax is deducted from the transferred amount; the recipient receives the after-tax amount, and the tax is transferred directly to the TreasuryFund address |
| Tax-exempt paths | Design convention (to be confirmed): minting, TreasuryFund payouts for the four purposes, and settlement calls between system contracts are not taxed, so that the "full injection" of tax is not eroded twice |

Rationale for the tax-exempt path trade-off: if the TreasuryFund were still charged 0.5% when distributing incentives to nodes, the fund's actually available size would be repeatedly diluted, conflicting with the finalized principle of "full injection into the Treasury Fund". Therefore, the strategy of "tax only when value flows between external addresses" is adopted. This strategy must be confirmed before development, because it renders "tax ineffective on internal flows" and leaves theoretical room for arbitrage via self-transfers between contracts (see Section 7.5 for mitigations).

Tax destination is explicit: **tax is not distributed to holders as dividends, not burned, and not sent to the development team's address; 100% goes to the TreasuryFund**.

## 2.4 Treasury Fund Allocation Ratios

| Purpose | Ratio | bps representation | Direction of use |
| ------- | ----- | ------------------ | ---------------- |
| Node incentive | 40% | 4000 | Reward active nodes, tied to PoR contribution-score ranking |
| Maintenance and audit | 30% | 3000 | Network operations, third-party security audits, bug bounties |
| Upgrade and development | 20% | 2000 | Protocol iteration, client and toolchain development |
| Community | 10% | 1000 | Community operations, ecosystem cooperation, and education |
| **Total** | **100%** | **10000** | — |

Contract-layer constraint: the four ratios are defined as constants; when Governance modifies the allocation ratios, the sum of the four must equal exactly 10000 bps, otherwise the transaction reverts; no "unallocated balance" or "over-allocation" state is allowed.

## 2.5 Economic Closed Loop

```
Node contributes resources (hash power/storage/stability/bandwidth/geographic location)
        │
        ▼  Off-chain collection and weighted computation (Chapter 3)
   PoR contribution score (Score)
        │
        ▼  Validator threshold-signature reporting
   ProofValidator on-chain signature verification
        │
        ▼  Cooldown + threshold check
   MintController triggers minting
        │
        ▼
   GXN issued to the node address  ──►  Circulates on the platform / DEX trading
        │                                    │
        │                                    ▼  Trade tax 1% / transfer tax 0.5%
        │                              TreasuryFund pool
        │                                    │
        └──── Node incentive 40% ◄───────────┼──────► Maintenance and audit 30%
                                             ├──────► Upgrade and development 20%
                                             └──────► Community 10%
```

## 2.6 Sustainability and Risk (Strengths and Weaknesses Side by Side)

Strengths:

- **No early concentration of chips**: the initial supply is 0, with no private sale, no public sale, and no pre-mine, so there is no selling-pressure structure caused by the unlocking of low-price chips.
- **Issuance anchored to real resources**: the minted amount is determined by the contribution score, so in theory the token increment corresponds to the growth of the network's actual carrying capacity.
- **Stable tax source for the fund**: both trading and transfers are taxed, so the fund pool grows with circulation activity without relying on external capital injection.

Risks and shortcomings:

- **Transmission path of inflation pressure**: no total supply cap (early on) means long-term supply keeps growing; if the verification step is bypassed or the contribution score can be farmed, the increment will detach from the correspondence with real resources and turn into price pressure. Mitigation relies on the anti-cheat coefficient and the trustworthiness of the validator set (Chapter 7). The DAO governance vote when approaching 50 billion provides the ultimate brake.
- **Self-reinforcement of the incentive loop**: node incentives account for 40% of the fund, part of whose money comes from the tax generated by circulation after minting, creating a loop of "minting → circulation → tax collection → incentive → re-minting". The strength of this loop must be adjusted by governance parameters (contribution score threshold, mint conversion rate, fund payout cadence), otherwise it amplifies inflation.
- **Concentration of risk in undecided parameters**: the mint conversion rate, contribution score threshold, and normalization baselines are not given in the finalized parameters (see the annotations in Chapter 3) and are governance parameters. These parameters must be determined one by one and made public before launch, otherwise the quantitative boundaries of the economic model do not hold.

---

# 3. PoR Mechanism and Contribution Score Formula

## 3.1 Five Resource Weights

| Resource type | Weight | bps representation (10000 = 1.0) | Collection source | Intent of the weight setting |
| ------------- | ------ | -------------------------------- | ----------------- | ---------------------------- |
| Hash power | 1.5x | 15000 | CPU / GPU benchmark results | Highest scarcity; results can be recomputed and verified |
| Storage | 1.2x | 12000 | Available capacity + storage occupancy proof | Occupies hardware resources for a long time; cost is observable |
| Stability | 1.1x | 11000 | Online rate, packet loss rate, abnormal restart count | Ensures network reliability |
| Bandwidth | 1.0x | 10000 | Uplink/downlink throughput, number of reachable nodes | Basic network resource, used as the baseline weight |
| Geographic location | 0.8x | 8000 | Region / ASN dispersion | Encourages node dispersion, but weighting is lowest because forgery cost is low |

The weights are finalized parameters; any adjustment must go through Governance and be reflected in this document at the same time.

## 3.2 Normalization

The raw reported values of the five resources have different dimensions (TFLOPS, TB, percentage, Mbps, region code), so they must be normalized before the weighted sum.

For the i-th resource:

```
r_i = min( r_raw,i / B_i , cap_i )
```

- `r_raw,i`: the raw value collected off-chain
- `B_i`: the normalization baseline value for this resource (corresponding to r_i = 1.0)
- `cap_i`: the per-node normalized cap for this resource, used to prevent single-dimension score farming

`B_i` and `cap_i` are governance parameters. **Specific values are not provided among the finalized parameters and are not preset in this design**; they must be determined and made public before launch. On-chain they are represented as fixed-point numbers (bps or 1e18 scaling), and **floating-point operations are forbidden**.

## 3.3 Online Time Coefficient

Let the node's continuous online duration be `t` (unit: days); the time coefficient is defined as:

```
k(t) = 1.0 + 0.5 × min(t, 30) / 30
```

Value characteristics: after 30 consecutive online days, the coefficient rises linearly from 1.0 to 1.5, then is capped and no longer grows.

| Consecutive online days t | Time coefficient k(t) |
| ------------------------- | --------------------- |
| 0 | 1.000 |
| 5 | 1.083 |
| 10 | 1.167 |
| 15 | 1.250 |
| 20 | 1.333 |
| 25 | 1.417 |
| ≥ 30 | 1.500 |

On-chain fixed-point implementation (bps):

```
k_bps = 10000 + 5000 * min(t, 30) / 30
```

Definition of "continuous online" and the handling of interruptions:

| Item | Specification |
| ---- | ------------- |
| Online determination | Determined by node heartbeat (off-chain); the heartbeat interval and timeout threshold are governance parameters (not provided, TBD) |
| Interruption handling | A timeout is treated as an interruption of continuous online status, and `t` restarts from 0; whether to set a "grace window" is a governance parameter (not provided, TBD) |
| Data source | On-chain code cannot measure online duration by itself, so `t` must be reported by a validator signature and recorded in `lastSeenAt`; on-chain it only verifies that it does not exceed the current block time (see Section 7.3) |

## 3.4 Anti-Cheat Coefficient

The anti-cheat coefficient `f ∈ (0, 1]` starts at 1.0 and is obtained by multiplying multiple factors; it is computed off-chain and only range-checked on-chain:

| Factor | Trigger condition | Handling |
| ------ | ----------------- | -------- |
| Device fingerprint deduplication | Multiple addresses report the same device fingerprint | Decay according to the number of duplicate addresses; set to 0 in severe cases |
| Data deviation | The reported value deviates from the validator cross-comparison result beyond tolerance | Decay according to the deviation ratio |
| Historical violation | The address has rejected or penalized records | Continuously suppress the coefficient within the decay window (the decay curve is a governance parameter, TBD) |

The lower bound of `f` and the decay curve are governance parameters, not provided among the finalized parameters and not preset in this design.

## 3.5 Contribution Score Formula

```
Score = ( Σ_i  w_i × r_i ) × k(t) × f

where i ∈ { hash power, storage, stability, bandwidth, geographic location }
```

Expanded form:

```
Score = ( 1.5×r_hash + 1.2×r_storage + 1.1×r_stability + 1.0×r_bandwidth + 0.8×r_geo ) × k(t) × f
```

On-chain 1e18 scaling implementation:

```
score = ( W_HASHRATE*r_hash
        + W_STORAGE*r_storage
        + W_STABILITY*r_stability
        + W_BANDWIDTH*r_bandwidth
        + W_GEOGRAPHY*r_geo ) * k / 1e18   // time coefficient
        * f / 1e18                          // anti-cheat coefficient
```

Weight constants (1e18 scaling): `W_HASHRATE = 1.5e18`, `W_STORAGE = 1.2e18`, `W_STABILITY = 1.1e18`, `W_BANDWIDTH = 1.0e18`, `W_GEOGRAPHY = 0.8e18`.

## 3.6 Mint Amount Conversion

```
mintAmount = Score × mintRatePerScore
```

`mintRatePerScore` (the number of GXN per unit of contribution score) is a governance parameter. **It is not provided among the finalized parameters and is not preset in this design**; it is set and adjustable by Governance. This parameter is the main valve controlling the inflation speed.

## 3.7 Calculation Example

> Note on the examples: in the following examples, the normalization baseline is uniformly taken as 100 points and the conversion rate as 0.01 GXN per contribution-score point. These are **hypothetical values for demonstration only, not final parameters**; the weights, the time-coefficient formula, and the calculation structure all follow the finalized parameters.

**Node A**: hash power 80, storage 60, stability 95, bandwidth 70, geographic location 50 (all baseline values are 100)

| Resource | Raw value | Normalized r_i | Weight w_i | w_i × r_i |
| -------- | --------- | -------------- | ---------- | --------- |
| Hash power | 80 | 0.80 | 1.5 | 1.200 |
| Storage | 60 | 0.60 | 1.2 | 0.720 |
| Stability | 95 | 0.95 | 1.1 | 1.045 |
| Bandwidth | 70 | 0.70 | 1.0 | 0.700 |
| Geographic location | 50 | 0.50 | 0.8 | 0.400 |
| **Weighted sum** | — | — | — | **4.065** |

- Consecutive online t = 22 days → k = 1.0 + 0.5 × 22/30 = 1.367
- Anti-cheat coefficient f = 1.0 (no anomaly)
- Score = 4.065 × 1.367 × 1.0 = **5.558**
- Mint amount = 5.558 × 0.01 = **0.05558 GXN**

**Node B**: hash power 40, storage 90, stability 85, bandwidth 100, geographic location 90

| Resource | Raw value | Normalized r_i | Weight w_i | w_i × r_i |
| -------- | --------- | -------------- | ---------- | --------- |
| Hash power | 40 | 0.40 | 1.5 | 0.600 |
| Storage | 90 | 0.90 | 1.2 | 1.080 |
| Stability | 85 | 0.85 | 1.1 | 0.935 |
| Bandwidth | 100 | 1.00 | 1.0 | 1.000 |
| Geographic location | 90 | 0.90 | 0.8 | 0.720 |
| **Weighted sum** | — | — | — | **4.335** |

- Consecutive online t = 8 days → k = 1.0 + 0.5 × 8/30 = 1.133
- Anti-cheat coefficient f = 0.9 (10% data-deviation decay, for example)
- Score = 4.335 × 1.133 × 0.9 = **4.420**
- Mint amount = 4.420 × 0.01 = **0.04420 GXN**

**Result comparison**

| Item | Node A | Node B |
| ---- | ------ | ------ |
| Resource weighted sum | 4.065 | 4.335 |
| Consecutive online t (days) | 22 | 8 |
| Time coefficient k | 1.367 | 1.133 |
| Anti-cheat coefficient f | 1.0 | 0.9 |
| **Contribution score** | **5.558** | **4.420** |
| Mint amount (example conversion rate 0.01) | 0.05558 GXN | 0.04420 GXN |

The examples illustrate two mechanism characteristics: first, Node B's resource weighted sum is higher than Node A's, but because its online duration is insufficient and there is data-deviation decay, its final contribution score is actually lower — the time coefficient and anti-cheat coefficient have real discriminating power; second, the single mint amount varies linearly with the contribution score, with no fixed block reward, and issuance is entirely contribution-driven.

## 3.8 On-Chain vs. Off-Chain Division of Computation

| Step | Execution location | Reason |
| ---- | ------------------ | ------ |
| Collection of raw resource data | Off-chain | Indicators such as CPU, bandwidth, and online duration cannot be measured inside the EVM |
| Normalization, weighted sum, time coefficient, anti-cheat coefficient | Off-chain | Involves floating-point and repeated iterative operations; the on-chain gas cost is unaffordable |
| Result signing | Off-chain (validator-set threshold signature) | Provides a unique traceable source credential for on-chain data |
| Signature verification, numerical range check, cooldown check, threshold determination | On-chain | Must be enforced on-chain and cannot be delegated off-chain |
| Mint execution | On-chain | The issuance right must converge on-chain and cannot be decided off-chain |

The trust assumption of this architecture must be stated explicitly: **on-chain code cannot independently verify "whether the resource contribution is real"; it can only verify "that the data is signed by authorized validators, that the fields are complete, that the values are within the legal range, and that the address is not in a cooldown period"**. Therefore the security ceiling of PoR is determined by the trustworthiness of the validator set; the related threats and mitigations are discussed in Sections 7.2 and 7.3.

---

# 4. Contract Architecture

## 4.1 Architecture Overview

The system consists of 6 contracts with single responsibilities, adopting a one-way dependency chain: the governance layer only adjusts parameters and never touches the ledger; the issuance layer only makes decisions and never issues signatures; the fund layer only allocates and never levies taxes.

```
                        ┌────────────────────┐
                        │    Governance      │  Parameters / Roles / Pause (holds no assets)
                        │  Multi-sig + Timelock │
                        └─────────┬──────────┘
                                  │ setParam / grantRole / pause (one-way downward)
        ┌──────────────┬──────────┼───────────────┬────────────────┐
        ▼              ▼          ▼               ▼                ▼
 ┌────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐
 │ GXNToken   │ │PoRRegistry   │ │ProofValidator │ │TreasuryFund  │
 │ Ledger+Tax │ │Node & proof  │ │Sig verify +   │ │Fund + four   │
 │            │ │attestation   │ │threshold check│ │allocations   │
 └─────▲──────┘ └──────▲───────┘ └───────▲───────┘ └──────▲───────┘
       │ mint()        │ updateNodeProof  │ verifyProof     │ allocate()
       │               │                  │                 │
       └───────────────┴──────────────────┴─────────────────┘
                                  │
                        ┌─────────┴──────────┐
                        │  MintController    │  Cooldown + threshold + conversion + trigger mint
                        └─────────▲──────────┘
                                  │ requestMint(proof, signatures)
                                  │
                          Validator set (off-chain) → threshold-signature reporting
```

## 4.2 Responsibility Boundaries of the Six Contracts

| Contract | Core responsibility | Key state | Explicitly does not do |
| -------- | ------------------- | --------- | ---------------------- |
| **GXNToken** | BEP-20 ledger; tax interception and collection; management of market pairs and the tax-exempt whitelist; convergence of minting permission | `balances`, `allowance`, `tradeTaxBps`, `transferTaxBps`, `isMarketPair` | Does not decide the mint amount, does not take part in signature verification, does not hold the fund, and has no administrator direct-mint interface |
| **PoRRegistry** | Node registration (address ↔ device fingerprint ↔ region); proof digest and status records; device-fingerprint deduplication table; node activity and cooldown-time anchor | `NodeInfo`, `fingerprintUsed`, `proofHistory` | Does not perform numerical signature verification or range checks (left to ProofValidator) |
| **ProofValidator** | Validator set and threshold management; EIP-712 threshold-signature verification; numerical range check; anti-replay; rejection and penalty marking | `validators`, `threshold`, `isVerified[epoch][digest]` | Does not issue tokens, does not hold assets, does not modify node status |
| **MintController** | Cooldown check (1 hour); contribution-score threshold check; Score → mintAmount conversion; calls GXNToken to mint; writes aggregated state | `MINT_COOLDOWN`, `mintRatePerScore`, `scoreThreshold` | Does not generate the contribution score itself (must come from signature-verified data) and does not hold funds |
| **TreasuryFund** | Receives all tax revenue; cumulative revenue ledger; disburses according to 40/30/20/10; settles whitelisted recipients | `totalReceived`, `allocatedByKind`, `allocation`, `whitelist` | Does not levy tax, does not mint, does not modify allocation ratios (modified by Governance) |
| **Governance** | Parameter and role management; allocation-ratio adjustment; pause switches; proposal + timelock execution | Parameter key-value table, role table, `eta` timelock | Does not hold tokens, has no minting right, has no fund-withdrawal right |

## 4.3 Dependencies and Call Directions

| Call direction | Purpose | Permission constraint |
| -------------- | ------- | --------------------- |
| MintController → ProofValidator | Verify proof validity and threshold signatures | `view`/call, no additional permission required |
| MintController → PoRRegistry | Read node status (cooldown anchor) and write proof snapshots | Read: unrestricted; Write: `REGISTRY_WRITER` |
| MintController → GXNToken | Execute minting | `MINTER_ROLE` (sole holder) |
| GXNToken → TreasuryFund | Transfer the tax into the fund during transfers | No permission required; acts as the transfer target address |
| TreasuryFund → GXNToken | Disburse funds to whitelisted purpose addresses | `TREASURER_ROLE` + whitelist + ratio-cap check |
| Governance → the other 5 contracts | Parameter setting, role granting, pause control | `GOVERNOR_ROLE` + timelock |
| ProofValidator → PoRRegistry | Read-only query of whether a node is registered and whether a fingerprint is duplicated | Read-only; does not form a write dependency |

**Design principle: dependencies are strictly one-way, with no two-way mutual calls.** There is no call loop between ProofValidator and PoRRegistry — the former only reads the latter's public state for determination, and write actions are uniformly triggered by MintController's aggregation. This constraint eliminates circular dependencies and also compresses the reentrancy surface to the two explicit entry points of "minting" and "fund disbursement" (both `nonReentrant`).

## 4.4 Permission Matrix

| Role \ Contract | GXNToken | PoRRegistry | ProofValidator | MintController | TreasuryFund | Governance |
| --------------- | -------- | ----------- | -------------- | -------------- | ------------ | ---------- |
| `GOVERNOR_ROLE` | Tax rates / market pairs / pause | Registration params / status / pause | Validators / threshold / pause | Conversion rate / threshold / pause | Allocation ratios / whitelist / pause | — |
| `MINTER_ROLE` (MintController) | `mint` | — | — | — | — | — |
| `VALIDATOR_ROLE` | — | — | Submit signature results | — | — | — |
| `REGISTRY_WRITER` (MintController) | — | Update proof snapshots and mint time | — | — | — | — |
| `TREASURER_ROLE` | — | — | — | — | Execute allocation disbursements | — |
| `DEFAULT_ADMIN_ROLE` | Role granting | Role granting | Role granting | Role granting | Role granting | Held by multi-sig |

## 4.5 Key Separation Design

| Separation item | Design | What it guards against |
| --------------- | ------ | ---------------------- |
| Minting right vs. governance right | Governance has no mint permission and can only adjust the conversion rate and threshold in MintController; minting still requires a real proof verified by ProofValidator | After governance is compromised, it cannot print money out of thin air |
| Disbursement right vs. governance right | Governance can only change allocation ratios and the whitelist; actual disbursement requires `TREASURER_ROLE` and is bounded by the 40/30/20/10 caps | A leaked governance private key cannot drain the fund in one go |
| Signature-verification right vs. issuance right | ProofValidator only verifies signatures and does not mint; MintController only mints and does not verify signatures | Bypassing a single contract will not directly cause excessive issuance |
| Ledger vs. decision-making | GXNToken contains no economic-parameter derivation logic; it only executes `mint` and tax interception | Changes to economic parameters do not require modifying the token contract, reducing the need for upgrades |

## 4.6 Technology Selection

| Item | Choice | Reason |
| ---- | ------ | ------ |
| Solidity version | 0.8.24 | Built-in overflow checks; supports custom errors (lower gas) |
| Base library | OpenZeppelin Contracts v5.x (ERC20 / AccessControl / Pausable / ReentrancyGuard / EIP712 / ECDSA / SafeERC20) | Thoroughly audited; avoids re-implementing cryptography and token standards |
| Access control | `AccessControl` role-based (not `Ownable`) | Needs to distinguish four permission types: minting, signature verification, treasury, and governance |
| Upgradeability | Non-upgradeable (no proxy) | Avoids proxy storage-layout and upgrade-admin-key risks; protocol iteration follows "new version deployment + state migration" |
| Development and deployment tools | Foundry (contract testing and deployment scripts) + Hardhat (BscScan verification and operational scripts) | Balances testing efficiency with toolchain ecosystem maturity |
| Off-chain services | Collection agent + validator nodes (threshold-signature service) + event indexing | Handles measurement and computation that cannot be done on-chain |

---

# 5. Core Data Structures and Interfaces

## 5.1 Common Conventions

| Convention item | Specification |
| --------------- | ------------- |
| Numerical scaling | Token amounts and contribution scores uniformly use 1e18 scaling (`1e18` represents 1.0) |
| Ratio representation | Tax rates and allocation ratios use bps (`10_000` = 100%), i.e., trade tax 100 bps and transfer tax 50 bps |
| Time representation | Uniformly uses `block.timestamp` (`uint64`); no off-chain time is introduced |
| Error handling | Uses custom errors (`error Xxx();`) instead of string `require`, reducing gas and easing frontend identification |
| Event indexing | Address-type fields are always `indexed`, easing event indexing and frontend retrieval |

## 5.2 Core Structs

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

enum NodeStatus { Inactive, Active, Paused, Banned }
enum RejectReason { BadSignature, BelowThreshold, OutOfRange, Replay, DuplicateFingerprint }
enum AllocationKind { NodeIncentive, Maintenance, UpgradeDev, Community }

/// @notice Node basic info (persisted on-chain, used for status determination and the cooldown anchor)
struct NodeInfo {
    bytes32 fingerprintHash; // Device fingerprint hash (basis for multi-address deduplication)
    bytes32 regionCode;      // Geographic location code (region / ASN digest)
    uint64  registeredAt;    // Registration time
    uint64  lastProofAt;     // Most recent proof submission time
    uint64  lastMintAt;      // Most recent successful mint time (basis for the 1-hour cooldown)
    uint32  continuousDays;  // Consecutive online days t (updated by the signed data)
    NodeStatus status;       // Node status
}

/// @notice Resource proof (computed off-chain, signed by validators, verified on-chain; the raw text is not stored on-chain)
struct ResourceProof {
    address node;            // The proven node address
    uint64  epoch;           // Data window sequence number (anti-replay dimension)
    uint64  reportedAt;      // Data window end time
    uint256 score;           // Contribution score (1e18 scaling)
    bytes32 metricsDigest;   // Digest of the five resource raw metrics (raw text kept off-chain)
    bytes32 fingerprintHash; // Device fingerprint hash
    uint32  continuousDays;  // Consecutive online days t
    uint16  antiCheatBps;    // Anti-cheat coefficient f (bps, 10000 = 1.0)
}

/// @notice Four allocation ratios of the Treasury Fund (bps, always summing to 10000)
struct FundAllocation {
    uint16 nodeIncentiveBps; // 4000 (40%)
    uint16 maintenanceBps;   // 3000 (30%)
    uint16 upgradeDevBps;    // 2000 (20%)
    uint16 communityBps;     // 1000 (10%)
}

/// @notice Tax rate configuration (bps)
struct TaxConfig {
    uint16 tradeTaxBps;    // 100 (1%)
    uint16 transferTaxBps; // 50 (0.5%)
}
```

## 5.3 Event Definitions

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

## 5.4 Key Function Signatures

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
function mintCooldown() external view returns (uint256);                              // always 1 hours
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

## 5.5 Code Skeleton

### 5.5.1 GXNToken: BEP-20 Ledger and Tax Interception

```solidity
contract GXNToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE   = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    uint256 private constant BPS = 10_000;
    address public immutable treasury;

    uint16 public tradeTaxBps    = 100; // Trade tax 1%
    uint16 public transferTaxBps = 50;  // Transfer tax 0.5%

    mapping(address => bool) public isMarketPair;   // DEX market pair
    mapping(address => bool) public isTaxExempt;    // Tax-exempt paths (fund disbursement, system contracts)
    bool public mintPaused;                         // Mint switch independent of transfer pause

    event TaxCollected(address indexed from, address indexed to, uint256 taxAmount, uint8 taxKind);

    constructor(address treasury_) ERC20("Guixu Node", "GXN") {
        require(treasury_ != address(0), "treasury=0");
        treasury = treasury_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice The only mint entry, held only by MintController via MINTER_ROLE
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (mintPaused) revert MintIsPaused();
        _mint(to, amount); // from == address(0) takes the tax-exempt branch
    }

    /// @dev OpenZeppelin v5's unified transfer entry: transfer / transferFrom / mint / burn all go through it
    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value); // mint / burn are not taxed
            return;
        }
        (uint256 tax, uint8 kind) = _computeTax(from, to, value);
        if (tax == 0) {
            super._update(from, to, value);
            return;
        }
        super._update(from, to, value - tax);   // The recipient is credited the after-tax amount
        super._update(from, treasury, tax);     // 100% of the tax is transferred to the Treasury Fund
        emit TaxCollected(from, to, tax, kind);
    }

    function _computeTax(address from, address to, uint256 value)
        internal view returns (uint256 tax, uint8 kind)
    {
        if (isTaxExempt[from] || isTaxExempt[to]) return (0, 0);
        if (isMarketPair[from] || isMarketPair[to]) {
            return (value * tradeTaxBps / BPS, 1);   // Trade tax 1%
        }
        return (value * transferTaxBps / BPS, 2);    // Transfer tax 0.5%
    }

    function setTaxConfig(uint16 tradeTaxBps_, uint16 transferTaxBps_) external onlyRole(GOVERNOR_ROLE) {
        if (tradeTaxBps_ > 1_000 || transferTaxBps_ > 1_000) revert TaxTooHigh();
        tradeTaxBps = tradeTaxBps_;
        transferTaxBps = transferTaxBps_;
        emit TaxConfigUpdated(tradeTaxBps_, transferTaxBps_);
    }
}
```

### 5.5.2 ProofValidator: Threshold-Signature Verification and Anti-Replay

```solidity
contract ProofValidator is AccessControl, EIP712 {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 private constant PROOF_TYPEHASH = keccak256(
        "ResourceProof(address node,uint64 epoch,uint64 reportedAt,uint256 score,bytes32 metricsDigest,bytes32 fingerprintHash,uint32 continuousDays,uint16 antiCheatBps)"
    );

    mapping(address => bool) public validators;
    uint256 public threshold;                                        // Threshold, a governance parameter
    mapping(uint64 => mapping(bytes32 => bool)) public isVerified;    // epoch => digest => used

    function verifyProof(ResourceProof calldata proof, bytes[] calldata signatures)
        external view returns (bool ok, bytes32 digest)
    {
        digest = hashProof(proof);
        if (isVerified[proof.epoch][digest]) return (false, digest);  // Anti-replay

        uint256 valid;
        address last = address(0);
        for (uint256 i = 0; i < signatures.length; ++i) {
            address signer = ECDSA.recover(digest, signatures[i]);
            if (signer <= last) revert SignersNotStrictlySorted();     // Prevents double counting
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

    /// @dev Range check: the anti-cheat coefficient must be in (0, 1.0]; online days and timestamp must not be out of bounds
    function _inRange(ResourceProof calldata p) internal view returns (bool) {
        if (p.antiCheatBps == 0 || p.antiCheatBps > 10_000) return false;
        if (p.continuousDays > MAX_CONTINUOUS_DAYS) return false;      // Cap 30; equality allowed after capping
        if (p.reportedAt > block.timestamp) return false;              // Future times are not allowed
        return true;
    }

    /// @dev The status flag is called by MintController after verification passes, avoiding side effects in a view function
    function markVerified(uint64 epoch, bytes32 digest) external onlyRole(VERIFIER_WRITER) {
        isVerified[epoch][digest] = true;
        emit ProofVerified(msg.sender, digest, 0, epoch);
    }
}
```

### 5.5.3 MintController: Cooldown, Threshold, Conversion, and Minting

```solidity
contract MintController is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    uint256 public constant MINT_COOLDOWN = 1 hours;   // Address-level cooldown: 1 hour

    GXNToken       public immutable token;
    PoRRegistry    public immutable registry;
    ProofValidator public immutable validator;

    uint256 public mintRatePerScore;   // Governance parameter: GXN per unit of contribution score (1e18 scaling), initial value TBD
    uint256 public scoreThreshold;     // Governance parameter: minimum contribution score to trigger minting, initial value TBD

    event Minted(address indexed node, uint256 amount, uint256 score, uint64 epoch);

    function requestMint(ResourceProof calldata proof, bytes[] calldata signatures)
        external nonReentrant whenNotPaused
    {
        if (proof.node != msg.sender) revert NotProofOwner();          // Proxy claiming forbidden

        (bool ok, bytes32 digest) = validator.verifyProof(proof, signatures);
        if (!ok) revert ProofInvalid();

        NodeInfo memory node = registry.getNode(msg.sender);
        if (node.status != NodeStatus.Active) revert NodeNotActive();
        if (node.lastMintAt != 0 && block.timestamp < uint256(node.lastMintAt) + MINT_COOLDOWN) {
            revert MintCooldownNotElapsed();                            // 1-hour cooldown
        }
        if (proof.score < scoreThreshold) revert ScoreBelowThreshold();

        uint256 amount = previewMint(proof.score);
        if (amount == 0) revert ZeroMintAmount();

        // Checks-Effects-Interactions: write state first, then mint tokens
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

### 5.5.4 On-Chain Recalculation of the Contribution Score (for Verification)

The on-chain code does not actively compute the contribution score, but a fixed-point recalculation implementation is retained for audit cross-checking and for verification before governance-parameter adjustments:

```solidity
library PoRMath {
    uint256 internal constant W_HASHRATE   = 1.5e18;  // Hash power 1.5x
    uint256 internal constant W_STORAGE    = 1.2e18;  // Storage 1.2x
    uint256 internal constant W_STABILITY  = 1.1e18;  // Stability 1.1x
    uint256 internal constant W_BANDWIDTH  = 1.0e18;  // Bandwidth 1.0x
    uint256 internal constant W_GEOGRAPHY  = 0.8e18;  // Geographic location 0.8x
    uint256 internal constant BPS          = 10_000;

    /// @param rHash/rStorage/rStability/rBandwidth/rGeo Normalized resource values (1e18 scaling)
    /// @param continuousDays Consecutive online days
    /// @param antiCheatBps   Anti-cheat coefficient (bps, 10000 = 1.0)
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
        uint256 kBps = BPS + 5_000 * uint256(d) / 30;      // 1.0 → 1.5 linear

        score = weighted * kBps / BPS * antiCheatBps / BPS;
    }
}
```

### 5.5.5 TreasuryFund: Pull-Based Allocation with Ratio Caps

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

    /// @notice The treasurer pulls funds by purpose (pull mode, avoiding push loops and reentrancy)
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
            revert AllocationMustSumTo10000();   // The sum of 40/30/20/10 must be 10000 bps
        }
        allocation = a;
        emit AllocationUpdated(a.nodeIncentiveBps, a.maintenanceBps, a.upgradeDevBps, a.communityBps);
    }
}
```

## 5.6 Storage and Gas Trade-offs

| State item | Persisted on-chain | Storage location | Reason |
| ---------- | ------------------ | ---------------- | ------ |
| Node basic info (address / fingerprint / region / status) | Yes | `NodeInfo` mapping | Required for deduplication and status determination |
| Contribution score, time coefficient, anti-cheat coefficient | Yes (snapshot) | `ResourceProof` digest + events | Required for mint conversion and post-hoc audit |
| Five resource raw metrics | No | Off-chain storage + `metricsDigest` digest on-chain | The cost of storing raw text on-chain is too high |
| Validator signature array | No | `calldata` (transient verification only) | No persistence needed; avoids unnecessary SSTORE |
| Used proofs (anti-replay) | Yes | `isVerified[epoch][digest]` | Anti-replay is a hard requirement |
| Fund revenue/expenditure ledger | Yes | `totalReceived` / `allocatedByKind` | Required for ratio-cap checks |
| Historical node contribution curve | No (events) | Event log + off-chain index | Curve queries go off-chain; only state is kept on-chain |

---

# 6. Key Business Flows

## 6.0 Flow Overview

| # | Flow | Initiator | On-chain interaction | Core constraint |
| - | ---- | --------- | -------------------- | --------------- |
| 1 | Node registration | User | `PoRRegistry.registerNode` | Device fingerprint uniqueness |
| 2 | Node activation | Validator set (off-chain) + governance confirmation | `PoRRegistry.setNodeStatus` | Manual/automatic confirmation after collection |
| 3 | Proof submission and verification | Validator set (off-chain) | `ProofValidator.verifyProof` (view) + `markVerified` | Threshold signatures, numerical range, anti-replay |
| 4 | Minting | Node itself | `MintController.requestMint` | 1-hour cooldown + threshold + owner consistency |
| 5 | Tax collection | Any transfer party | Triggered inside `GXNToken._update` | Tax-exempt paths and market-pair determination |
| 6 | Fund allocation | Treasurer (multi-sig) | `TreasuryFund.allocate` | Whitelist + ratio caps |

All write operations are initiated externally, and the contracts themselves never actively call out (no timers, no scheduled tasks) — all time constraints are implemented as lazy checks at the moment of invocation.

## 6.1 Node Registration Flow

| Step | Acting party | Action | Contract interaction | Failure handling |
| ---- | ------------ | ------ | -------------------- | ---------------- |
| 1 | Collection agent | Client collects hardware fingerprint; the local client generates the device hash | None (off-chain) | The client refuses to start if collection fails |
| 2 | User | Calls `registerNode(fingerprintHash, regionCode)` | `PoRRegistry` | The device fingerprint is already bound → `DuplicateFingerprint` |
| 3 | PoRRegistry | `fingerprintUsed[hash]` check → write `NodeInfo`, status defaults to `Inactive`, record `registeredAt` | `PoRRegistry` | Withdrawal is allowed after registration (state rollback) |
| 4 | PoRRegistry | Emit `NodeRegistered` | — | — |
| 5 | User | Wait for validator collection and confirmation | None | Not confirmed within the window → remains `Inactive` |

Rationale for setting the registration status to `Inactive`: registration only declares "whom I am", not "that I am qualified to earn income". A newly registered node must wait for the validator set to complete at least one real collection before it can be activated, preventing "register and receive tokens" empty shells.

## 6.2 Node Activation Flow

| Step | Acting party | Action | Contract interaction |
| ---- | ------------ | ------ | -------------------- |
| 1 | Validator nodes | Collect CPU / storage / bandwidth / online duration / region data from the newly registered node | None (off-chain) |
| 2 | Validator set | Multiple independent collections, cross-comparison; on consistency, the result is threshold-signed | None (off-chain) |
| 3 | Validator set | Submit the signed activation result | `ProofValidator.verifyProof` (view) |
| 4 | Verifier/Gov | Calls `setNodeStatus(node, Active)` | `PoRRegistry` |
| 5 | PoRRegistry | Write status, emit `NodeStatusChanged` | — |

Activation itself does not mint; it only grants "eligibility to be minted". The first minting still requires a complete proof submission and passing the cooldown check (the first mint is not subject to the cooldown because `lastMintAt == 0`).

## 6.3 Contribution Proof Submission and Verification Flow

| Step | Execution location | Action |
| ---- | ------------------ | ------ |
| 1 | Off-chain | The collection agent obtains the raw metrics of the five resources |
| 2 | Off-chain | Normalization, weighted sum, time coefficient, anti-cheat coefficient, and the score is computed |
| 3 | Off-chain | Multiple validators collect independently and cross-compare; on deviation beyond tolerance, decay `f` or reject |
| 4 | Off-chain | Assemble `ResourceProof`, and after the threshold members sign separately, obtain `bytes[] signatures` |
| 5 | On-chain (node itself) | Call `requestMint(proof, signatures)` |
| 6 | On-chain | `verifyProof` recovers the signer addresses one by one and deduplicates, checks whether the valid count reaches `threshold`, and performs range checks on each field |
| 7 | On-chain | Check anti-replay, check `isVerified[epoch][digest]`, and mark it used after passing |
| 8 | On-chain | Check node status, cooldown, and score threshold, then execute minting |

| Design element | Approach | Reason |
| -------------- | -------- | ------ |
| Signature scheme | EIP-712 typed structured data + ECDSA | Field structures are explicit; the wallet can display them in full, preventing blind signing |
| Domain separator | Contains `chainId` and the contract address | Prevents cross-chain and cross-contract replay |
| Duplicate-signature handling | Requires the recovered signer addresses to be strictly ascending | Prevents a single validator's repeated signatures from being counted multiple times |
| Replay protection | `epoch` monotonicity + `digest` uniqueness | The same proof can only be used once globally |
| Range check | `antiCheatBps ∈ (0, 10000]`; `reportedAt ≤ block.timestamp`; `continuousDays` within the cap | Blocks obviously illegal inputs |

## 6.4 Minting Flow

| Step | On-chain action | State change |
| ---- | --------------- | ------------ |
| 1 | Verify `proof.node == msg.sender` | None |
| 2 | Call `verifyProof` to complete signature and range verification | None (view) |
| 3 | Read `NodeInfo` to check `Active` status | None |
| 4 | Check the cooldown: `block.timestamp >= lastMintAt + 3600` | None |
| 5 | Check `score >= scoreThreshold` | None |
| 6 | Compute `mintAmount = score × mintRatePerScore / 1e18` | None |
| 7 | `nonReentrant`: write `lastProofAt` / `lastMintAt` / `continuousDays` and the proof digest | `PoRRegistry` |
| 8 | Mark the proof as used `isVerified[epoch][digest] = true` | `ProofValidator` |
| 9 | `token.mint(node, mintAmount)` | `GXNToken` total supply and balance increase |
| 10 | Emit `Minted` | — |

The order of steps 7-8-9 is intentional: the entire state is written to disk before minting, so even if the external mint call is somehow reentered, the cooldown and the anti-replay flags are already in effect, making repeated minting impossible (Checks-Effects-Interactions).

## 6.5 Impact of Failure at Key Steps

| Failure point | Revert behavior | Impact | Recovery |
| ------------- | --------------- | ------ | -------- |
| Signature count below threshold | Whole transaction reverts | No state change, no minting | The validator set re-signs and resubmits |
| Numerical range check fails | Whole transaction reverts | No state change | The collection side corrects and resubmits |
| Cooldown not elapsed | `MintCooldownNotElapsed` revert | No state change | Retry after 1 hour |
| Score below threshold | `ScoreBelowThreshold` revert | No state change | Improve contribution and resubmit in the next window |
| Proof already used | `ProofInvalid` / replay rejection | No state change | Wait for a new epoch window |
| `previewMint` returns 0 | `ZeroMintAmount` revert | No state change | Check whether the conversion rate is set |
| Interruption during `token.mint` | Whole transaction reverts (atomic) | No state change | Investigate the token contract |

The atomicity of an EVM transaction ensures that any failure of the mint call chain rolls back all writes, with no case of "the state was written but no mint happened".

## 6.6 Tax Flow

| Scenario | Determination condition | Outcome |
| -------- | ----------------------- | ------- |
| Ordinary transfer | Neither party is tax-exempt or a market pair | Deduct 0.5% of the transfer amount, credited to the fund, `taxKind = 2` |
| Trade-path transfer | Either party `isMarketPair == true` | Deduct 1%, credited to the fund, `taxKind = 1` |
| Mint / burn | `from == address(0)` or `to == address(0)` | No tax |
| Fund disbursement | Either party `isTaxExempt == true` | No tax |
| Global pause | `Pausable` takes effect | All transfers revert |

## 6.7 Fund Allocation Flow

| Step | Acting party | Action | Constraint |
| ---- | ------------ | ------ | ---------- |
| 1 | Tax transfer | Tax is automatically credited in `_update` | Fund contract address is `immutable` |
| 2 | Fund contract | Accumulate `totalReceived` | — |
| 3 | Treasurer (multi-sig) | Call `allocate(kind, to, amount)` | Must hold `TREASURER_ROLE` |
| 4 | Fund contract | Check whitelist and `capOf(kind)` | `NotWhitelisted` / `ExceedsAllocationCap` |
| 5 | Fund contract | Update `allocatedByKind` and `totalAllocated`, transfer via `safeTransfer` | `nonReentrant` |
| 6 | Fund contract | Emit `FundsAllocated` | — |

Allocation uses the pull model (the treasurer actively calls), rather than the fund automatically pushing on receipt. Reason: push mode requires looping through four addresses on every tax receipt, which is gas-expensive and, if a payout fails, blocks the tax receipt itself, forming a DoS on the core path.

---

# 7. Security Design

## 7.1 Reentrancy Protection

| Measure | Placement | Description |
| ------- | --------- | ----------- |
| `nonReentrant` reentrancy lock | `MintController.requestMint`, `TreasuryFund.allocate` | The only two entry points that "change state first, then transfer out", both locked |
| Checks-Effects-Interactions | `requestMint` writes state such as `lastMintAt` first, then calls `token.mint` last | Even if the external call is hijacked, the cooldown state has already settled, so repeated minting is impossible |
| Pull-based fund disbursement | TreasuryFund does not push funds proactively; the TREASURER calls `allocate` to pull | Eliminates the DoS and reentrancy surface of "looped transfers + failure in the loop" |
| No token callbacks | GXNToken does not implement ERC-777-style `tokensReceived` hooks | Transfers give the recipient no execution opportunity, eliminating token-layer reentrancy at the root |
| One-way dependency | No write-dependency loop between ProofValidator and PoRRegistry | Eliminates cross-contract circular calls |

The tax handling in `_update` is a pure ledger operation (two `super._update` calls) and triggers no external call, so it does not constitute a reentrancy surface; the `treasury` address is `immutable` and cannot be tampered with to point at a malicious contract.

## 7.2 Sybil and Forged-Contribution Protection

| Attack method | Protection measure | Boundary of effectiveness |
| ------------- | ------------------ | ------------------------- |
| A single device registering many addresses in bulk to farm contributions | The device fingerprint hash is bound one-to-one; `fingerprintUsed` rejects duplicate registration; the Paused/Banned states can freeze suspicious addresses | If the fingerprint algorithm can be bypassed (e.g., a VM changing the hardware identifier), the protection fails — it depends on the client fingerprint implementation being open source and continuously contested |
| Single-dimension farming (e.g., falsely reporting storage capacity) | The normalization cap `cap_i` limits the single-dimension contribution ceiling, preventing a single metric from piling up a high score | `cap_i` must be set according to the real hardware distribution; set too high, it loses its suppressing effect |
| Low-price device clusters (real but low value) | The contribution-score threshold `scoreThreshold` filters out low-contribution addresses; the 1-hour cooldown limits the farming frequency | If the threshold is below the cluster cost, the cluster can still profit continuously — the threshold must be calibrated in conjunction with the economic model |
| Data forgery (falsely reporting bandwidth/hash power) | Validators independently collect and cross-compare with self-reported data; if the deviation exceeds tolerance, decay `f` or reject; when `f` approaches 0, the score goes to zero | Depends on the independence of the validators and the coverage of collection |
| Proxy claiming and aggregation of contribution scores | `proof.node == msg.sender` is enforced, prohibiting third-party proxy submission | No residual risk (on-chain hard constraint) |
| Reuse of the same proof | `isVerified[epoch][digest]` anti-replay + the monotonically increasing `epoch` dimension | `epoch` must not be reused, and an increasing window should be maintained off-chain |

Residual risk must be stated explicitly: **none of the above protections can prove that "the resource contribution is genuinely valid"**. On-chain, only the data source and format can be verified as legal; the final arbitration of authenticity lies with the validator set. Therefore the independence, size, and rotation mechanism of the validator set are the actual boundary of Sybil protection (see 7.3).

## 7.3 Trustworthiness of Resource Data Sources

The fundamental trust assumption of this architecture is that "the validator set is honest and mutually independent", and the chain cannot independently measure any resource indicator. Measures to reinforce this assumption:

| Measure | Design |
| ------- | ------ |
| Multiple independent collection | For each data window, multiple validators independently collect the same node's metrics, and a consistent result is taken |
| Threshold signature | The chain requires the number of valid signatures to be ≥ `threshold`; compromising a single validator cannot forge data |
| Threshold setting | `threshold` is recommended to be set at 2/3 or more of the total number of validators (the specific value is a governance parameter, TBD), raising the collusion cost |
| Deviation detection | When the deviation from self-reported data exceeds tolerance, decay `f`; when anomalies occur in concentration, freeze that node's `Active` status |
| Role rotation | The validator set supports addition and removal (`setValidator`), allowing long-term anomalous nodes to be eliminated |
| Domain separation | The EIP-712 domain separator contains the `chainId` and the contract address, so the same signature cannot be replayed across testnet/mainnet or across other contracts |
| Timestamp constraint | `reportedAt ≤ block.timestamp`, forbidding data windows with future times |

Incentives and penalties for validators themselves: validators are paid according to their contribution and penalized (slashed) for misbehavior, but their economic parameters (incentive amount, staking and slashing ratios) **are not provided among the finalized parameters and are TBD**. This is the largest unresolved security dependency in the current design — in the absence of validator staking and slashing, the cost of collusion to forge data is merely reputational loss, which cannot be economically suppressed.

## 7.4 Emergency Pause

Pausing is designed with granularity by scope, avoiding "pause everything at once", which would make user assets unable to circulate:

| Scope | Paused object | Trigger scenario |
| ----- | ------------- | ---------------- |
| 0 | Global transfers (`GXNToken._update`) | A serious vulnerability at the token-contract level is discovered, or large-scale abnormal transfers occur |
| 1 | Minting (`MintController` / `GXNToken.mintPaused`) | Suspected validator compromise, or an abnormally high contribution score is discovered |
| 2 | Proof submission and signature verification (`ProofValidator` / `PoRRegistry.recordProof`) | Data pollution on the collection side, or a signature-service anomaly |
| 3 | Fund disbursement (`TreasuryFund.allocate`) | A whitelisted address is compromised, or the allocation logic is abnormal |

| Pause-related rule | Specification |
| ------------------ | ------------- |
| Trigger authority | Only `GOVERNOR_ROLE` (held by the multi-sig); a single signature cannot pause |
| Recovery authority | Recovery requires the governance multi-sig + timelock delayed execution, and the reason for recovery must be publicly announced on-chain |
| Nature of the pause | Only blocks **circulation and issuance**, and does not freeze balance ownership; users' balances and the ownership of already-minted tokens do not change because of the pause |
| Time coefficient during a pause | Design convention (to be confirmed): while global transfers or proof submission are paused, `continuousDays` stops accumulating, avoiding "receiving the online coefficient during a standstill" |
| Items unaffected by a pause | Transfers already broadcast and on-chain are irreversible; the pause only affects subsequent transactions |
| Pause drills | During the testnet phase, the full pause-and-recovery process for all four scopes must be drilled |

## 7.5 Other Associated Risks

| Risk | Description | Mitigation | Residual risk |
| ---- | ----------- | ---------- | ------------- |
| Tax evasion | If the "tax-exempt path" is judged too broadly, an attacker can evade taxes by transferring between a self-built contract and a whitelisted address | Tighten the exemption list to the necessary system addresses (TreasuryFund, MintController, PoRRegistry, ProofValidator); new exempt addresses must go through the governance timelock; monitor the call frequency of abnormal exempt paths on-chain | The compliance of inter-contract self-transfers is difficult to fully determine on-chain and requires monitoring and governance response |
| Integer precision loss | Tax rates and conversions involve continuous multiplication and division; dividing before multiplying amplifies the error | Uniformly use "multiply first, then divide"; uniformly scale amounts and contribution scores by 1e18; uniformly use bps for ratios | Rounding for extremely small amounts may produce a zero tax, which is acceptable behavior (must be explicitly stated in the document) |
| Concentration of authority | If the governance role is held by a single private key, it amounts to single-point control of the system | `GOVERNOR_ROLE` is held by a multi-sig; parameter changes go through the two stages of "proposal + timelock"; the governance contract holds neither minting nor withdrawal rights | The risk of multi-sig members colluding cannot be eliminated by code |
| Delayed fixes due to non-upgradeability | The contracts have no proxy, so a discovered vulnerability cannot be patched in place | Use granular pausing as a first stop-loss; "deployment + state-snapshot migration" for the new version; migration requires parallel dual-ledger reconciliation | There may be a state-inconsistency risk during the migration window; writes must be frozen before migration |
| Gas exhaustion caused by signature array length | When the number of validators is unbounded, the signature-verification loop may exceed the block gas limit | `verifyProof` limits the maximum length of the signature array; the total number of validators is capped (a governance parameter, TBD) | A too-low cap weakens decentralization, so a balance must be struck between security and distribution |
| Frontend and signature phishing | A user is induced to sign an unexpected EIP-712 structure | The domain separator contains the `chainId` and the contract address; the frontend displays all fields to be signed; the signature structure contains no freely extensible fields | User-side security cannot be guaranteed by the contracts |
| Validator bribery | Bribing a threshold number of validators to inflate the contribution of a specific address | Raise the threshold ratio, rotate validators, and design symmetric rewards and penalties | Without a slashing mechanism, it cannot be economically suppressed (see 7.3) |

## 7.6 Risk List (Trigger Condition → Impact → Mitigation → Stop-Loss Threshold)

| Risk | Trigger condition | Impact | Mitigation | Stop-loss threshold (example specification; specific values TBD) |
| ---- | ----------------- | ------ | ---------- | ---------------------------------------------------------------- |
| Validators colluding to inflate contributions | Within the same epoch, some address's Score deviates significantly from its historical distribution | High | Deviation detection decays `f`; pause scope 1 (minting); governance replaces validators | When a single address's Score exceeds N times its 30-day moving average, it is automatically rejected and an alert is raised |
| Sybil cluster farming | Abnormal registrations for the same fingerprint; a large number of registrations from the same ASN in a short time | Medium | Fingerprint deduplication, registration rate limiting, status freezing | When the daily registration count from the same ASN exceeds the threshold, a manual review is triggered |
| Tax evasion | High-frequency, large-value flows involving an exempt address | Medium | Tighten the exemption list + timelock + on-chain monitoring | When an exempt address's daily outflow exceeds the threshold, an alert is raised and scope 3 is paused |
| Token contract vulnerability | Abnormal transfer paths; unbalanced balances | High | Pause scope 0; under non-upgradeable conditions, perform a version migration | Upon any reproducible balance inconsistency, a full pause is triggered |
| Abnormal fund disbursement | A single disbursement approaches or exceeds the purpose cap | Medium | The `capOf` cap hard constraint + whitelist + separation of the treasurer role | When the daily disbursement reaches 80% of the purpose cap, a review is triggered |
| Governance private-key leakage | A multi-sig member's device is compromised | High | Multi-sig threshold + timelock as the final reaction window | Pending parameters can be revoked within the timelock period |

---

# 8. Deployment Plan

## 8.1 Network and Environment

| Item | Testnet | Mainnet |
| ---- | ------- | ------- |
| Network name | BNB Smart Chain testnet (Chapel) | BNB Smart Chain mainnet |
| chainId | 97 | 56 |
| Native token | tBNB (for testing) | BNB (real cost required) |
| Block explorer | Testnet BscScan (for source verification and transaction checking) | Mainnet BscScan |
| RPC access | Official or self-built archive node; the specific URL is configured by operations and not written into the code repository | Same as left; multi-node failover is recommended |
| Deployment account | A dedicated test account; the private key is not stored in the repository; use a hardware wallet or multi-sig | Must be a multi-sig account or a hardware wallet; deploying with a hot-wallet private key is forbidden |
| Toolchain | Foundry (`forge script`) for deployment and verification; Hardhat for BscScan verification as a fallback | Same as left |

Before deployment, the chainId and the target network must be verified. The EIP-712 domain separator contains the `chainId`, so a proof signature issued on the testnet cannot be used on the mainnet. This difference is expected behavior, not a defect.

## 8.2 Deployment Order and Dependencies

The deployment order cannot be changed arbitrarily because of **construction dependencies and token-accounting dependencies**: GXNToken needs the operations fund address (tax recipient) at construction, while TreasuryFund needs to know the token address in order to transfer, forming a circular dependency. The solution is to have TreasuryFund's token address set once, ex post:

```solidity
// TreasuryFund: only the deployer may bind the token once; it cannot be changed after binding
function bindToken(IERC20 token_) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(address(token) == address(0), "token already bound");
    token = token_;
}
```

| Step | Contract | Key constructor / initialization parameters | Dependencies | Why it must be at this position |
| ---- | -------- | ------------------------------------------ | ------------ | ------------------------------- |
| 1 | **TreasuryFund** | No token constructor dependency (`token` bound ex post) | None | Must be deployed first, to provide the `treasury` address for GXNToken |
| 2 | **GXNToken** | `treasury = TreasuryFund address`; name Guixu Node / symbol GXN | Step 1 | The constructor checks `treasury != address(0)`, and the tax-transfer target is immutable |
| 3 | TreasuryFund calls `bindToken(GXNToken)` | — | Step 2 | Binds the token address, closing the circular dependency |
| 4 | **PoRRegistry** | None | None | No dependencies; can be deployed in parallel with step 5 |
| 5 | **ProofValidator** | Initial validator set, `threshold` (TBD) | None | Parallel with step 4 |
| 6 | **MintController** | The three addresses `token`, `registry`, `validator` | Steps 2, 4, 5 | Needs to reference the three addresses; `MINT_COOLDOWN` is a compile-time constant and needs no parameter |
| 7 | **Governance** | Multi-sig members, timelock delay | Steps 1-6 | Before granting roles, all managed contract addresses must be registered into governance |
| 8 | Role granting and handover | See 8.4 | Step 7 | Must be executed after governance is ready, to avoid dangling roles |

## 8.3 Post-Deployment Parameter Checklist

| Parameter | Target value | Contract | Has a default value |
| --------- | ------------ | -------- | ------------------- |
| Trade tax | 100 bps (1%) | GXNToken | Yes (defaulted in the constructor; must be verified on-chain) |
| Transfer tax | 50 bps (0.5%) | GXNToken | Yes (same as above) |
| Fund allocation ratios | 4000 / 3000 / 2000 / 1000 bps | TreasuryFund | Yes (initial values in the contract; must be verified on-chain) |
| Mint cooldown | 3600 seconds (1 hour) | MintController | Yes (`constant`, unmodifiable) |
| Five resource weights | 1.5 / 1.2 / 1.1 / 1.0 / 0.8 (1e18 scaling) | PoRMath library constants | Yes (`constant`; adjustment requires redeployment) |
| Time coefficient formula | `10000 + 5000 × min(t,30)/30` bps | PoRMath library constants | Yes (`constant`, unmodifiable) |
| Mint conversion rate `mintRatePerScore` | **TBD** (governance parameter) | MintController | No; must be set explicitly |
| Contribution-score threshold `scoreThreshold` | **TBD** (governance parameter) | MintController | No; must be set explicitly |
| Validator threshold `threshold` | **TBD** (governance parameter; recommended ≥ 2/3 of the total number of validators) | ProofValidator | No; must be set explicitly |
| Validator set | List of initial member addresses | ProofValidator | No; must be set explicitly |
| Market-pair registration `isMarketPair` | DEX market-pair address (the mainnet pair address follows the actual creation result) | GXNToken | No; must be registered after the market pair is created |
| Tax-exempt addresses `isTaxExempt` | TreasuryFund, MintController, PoRRegistry, ProofValidator | GXNToken | No; must be set item by item and go through the timelock |
| Fund whitelist `whitelist` | One recipient address for each of the four purposes (a multi-sig or corresponding dedicated account is recommended) | TreasuryFund | No; must be set explicitly |

Parameters without provided values (`mintRatePerScore`, `scoreThreshold`, `threshold`, validator members) must be determined and made public by governance before launch; when missing, the minting flow is unavailable (a default threshold of 0 would allow minting with any contribution score, which is a dangerous default and must be set immediately after deployment).

## 8.4 Role Granting and Handover Checklist

| Role | Target holder | Contract | Handover action |
| ---- | ------------- | -------- | --------------- |
| `MINTER_ROLE` | MintController address | GXNToken | Granted after deployment, and **must not** be granted to any EOA or the governance contract |
| `REGISTRY_WRITER` | MintController address | PoRRegistry | Granted after deployment |
| `GOVERNOR_ROLE` | Governance contract address | All 5 business contracts | After granting, verify whether the original deployer still holds it |
| `TREASURER_ROLE` | Operations multi-sig address or dedicated treasurer account | TreasuryFund | Granted, and the holder must not simultaneously hold `GOVERNOR_ROLE` (separation of disbursement and governance) |
| `DEFAULT_ADMIN_ROLE` | Governance contract address | All 6 contracts | After handover, **revoke this role from the deployer account**; the revocation must be confirmed on-chain |
| Deployer account | Holds no role any longer | All contracts | Final verification that all `hasRole` results are false |

## 8.5 Post-Deployment Verification Checklist

Each of the following must be actually tested on-chain, not merely checked statically against the code:

| Verification item | Method | Pass criterion |
| ----------------- | ------ | -------------- |
| Source verification | Upload the source and constructor parameters to BscScan | All 6 contracts show `Verified` |
| Role matrix | Call `hasRole` on each contract for verification | Exactly matches the table in 8.4; the deployer has no role |
| Tax rate test (ordinary transfer) | Transfer 100 GXN from A to B and check the received amount | B actually receives 99.5 GXN, the fund receives 0.5 GXN, and the `TaxCollected` event has `taxKind = 2` |
| Tax rate test (trade path) | Transfer 100 GXN via a registered market-pair address | The recipient receives 99 GXN, the fund receives 1 GXN, and `taxKind = 1` |
| Exempt-path test | MintController triggers a mint; TreasuryFund executes an allocation | Neither is taxed; fund revenue comes only from external circulation |
| Cooldown test | The same address calls `requestMint` twice within 1 hour | The second call reverts with `MintCooldownNotElapsed` |
| Threshold test | Submit a proof below `scoreThreshold` | Reverts with `ScoreBelowThreshold` |
| Anti-replay test | Resubmit the same digest for the same `epoch` | Signature verification returns `ok = false`, and no minting occurs |
| Anti-proxy test | Call `requestMint` from an address other than the proof node | Reverts with `NotProofOwner` |
| Allocation cap test | Attempt to disburse an amount exceeding the `capOf` for a purpose | Reverts with `ExceedsAllocationCap` |
| Allocation ratio constraint test | Attempt to set four ratios whose sum is not 10000 bps | Reverts with `AllocationMustSumTo10000` |
| Pause drill | Pause and recover scopes 0/1/2/3 in turn | Each pause affects only the corresponding function while the rest work normally; recovery requires governance + timelock |
| Event capture | The indexing service subscribes to all events | The main events of the six contract types can all be parsed into the database normally |

## 8.6 Mainnet Switchover Key Points

| Key point | Requirement |
| --------- | ----------- |
| Preconditions | All testnet Chapel verification items pass (see 8.5) and all high-severity issues from the third-party audit are closed |
| Parameter freeze | `mintRatePerScore`, `scoreThreshold`, `threshold`, and the validator set are frozen and publicly released before mainnet deployment |
| Gradual rollout strategy | Limit the minting scale and the number of validators in the first phase (specific limits TBD), then gradually open up after confirming there are no anomalies |
| Pause readiness | Immediately after deployment, confirm that the pause call for all four scopes is available, and write the governance multi-sig's pause operation procedure into the operations manual |
| Monitoring go-live | Monitoring must cover all trigger conditions in the risk list in Section 7.6; the alert channel and responsible persons must be confirmed before launch |
| Fund preparation | Mainnet deployment and subsequent operations calls consume BNB, so a sufficient balance must be reserved to prevent governance operations from being unable to execute due to insufficient balance |
| Rollback path | Mainnet contracts are non-upgradeable; when a serious issue occurs, handle it as "pause → fix → redeploy → state migration", without assuming any in-place fix capability |

## 8.7 Deployment Artifacts and Records

| Artifact | Content |
| -------- | ------- |
| Contract address list | The addresses of the 6 contracts on the testnet and mainnet, the deployment transaction hashes, and the deployment block numbers |
| Constructor parameter record | The verbatim constructor arguments of each contract (including the TreasuryFund address, etc.) |
| Role matrix snapshot | Archived `hasRole` query results after deployment |
| Parameter publication | The actual effective values of all parameters in Section 8.3 |
| Verification checklist receipt | The actually tested transaction hash for each item in Section 8.5 |

---

# 9. Development Milestones

## 9.1 Phase Overview and Critical Path

```
M1 Contract development and unit testing ──► M2 Testnet Chapel integration ──► M3 Third-party audit and fixes ──► M4 Mainnet deployment and gradual rollout
```

The four phases are in a strictly linear dependency: each phase's deliverables are the next phase's inputs, and there is no room for parallelism. **The critical path is M1 → M2 → M3 → M4**, in which M3 (audit) is usually the longest and most uncertain step, and one of the preconditions for M4 is that all high-severity audit issues are closed.

Each phase has a gate: without passing the acceptance criteria, it may not proceed to the next phase.

## 9.2 Milestone Task Table

| Phase | Task | Deliverable | Responsible role | Dependency | Acceptance criteria |
| ----- | ---- | ----------- | ---------------- | ---------- | ------------------- |
| **M1 Contract development and unit testing** | Implement the 6 contracts (GXNToken / PoRRegistry / ProofValidator / MintController / TreasuryFund / Governance) and the PoRMath library | Contract source repository (Foundry project structure) | Contract development engineer (TBD) | This document is finalized; the first-round values of the TBD parameters are determined | All 6 contracts compile; `forge build` has no warning-level issues |
| | Write unit tests: tax rates, cooldown, signature verification, conversion, allocation caps, permissions | Test suite | Contract development engineer | Contract implementation | All test cases pass; **recommended target**: core contract branch coverage ≥ 90% (this benchmark is not provided among the finalized parameters and is a suggested value) |
| | Write assertion tests: the 1-hour cooldown boundary, the 1%/0.5% tax-rate boundary, the 40/30/20/10 sum constraint | Boundary test case set | Contract development engineer | Unit test framework ready | Cooldown of 3599 seconds reverts / 3600 seconds passes; tax rounding meets expectations; reverts when the four items do not sum to 10000 bps |
| | Fuzz testing and invariant testing (e.g., "total minted == sum of all address balances", "fund balance ≥ cumulative allocated amount") | Fuzz testing report | Contract development engineer | Unit tests pass | No high-severity counterexamples; invariants hold within the current test depth |
| | Gas measurement and optimization | Gas report | Contract development engineer | Feature implementation frozen | The gas consumption of the key paths (`requestMint`, `_update`, `allocate`) has a baseline record for later regression comparison |
| **M2 Testnet Chapel integration** | Deploy the 6 contracts on Chapel and complete role granting | Testnet contract address list + deployment record | Contract development engineer | M1 passes the gate | The deployment order and dependencies conform to Section 8.2; the role matrix matches Section 8.4 |
| | Off-chain collection and signature service integration: collection agent, validator nodes, threshold-signature service | Integration environment (the full collection → signing → submission chain is usable) | Backend engineer (TBD) | Testnet contracts ready | EIP-712 signatures generated off-chain can be successfully verified by the on-chain `verifyProof` |
| | End-to-end run of "registration → collection → verification → minting → taxation → allocation" | Integration report + full-chain demo transaction hashes | Backend engineer + contract development engineer | Signature service available | A complete chain can be verified transaction by transaction in the block explorer; the data is consistent with the formulas in Chapter 3 |
| | Execute all 13 items of the local verification checklist in Section 8.5 | Verification checklist receipt | Contract development engineer | End-to-end run complete | All 13 items pass, each with a transaction hash |
| | Pause/recovery drills for the four pause scopes | Drill record | Operations engineer (TBD) | Contract deployment complete | Each scope's pause affects only the corresponding function; recovery requires governance + timelock |
| | Stability observation period | Observation-period runtime logs | Operations engineer | Full chain usable | **Example specification**: for 7 consecutive days without manual intervention, minting records are stably produced at the 1-hour cooldown, with no abnormal reverts (the specific observation-period duration is TBD) |
| **M3 Third-party security audit and fixes** | Select an audit firm and provide the code, documentation, and deployment instructions | Audit engagement and scope confirmation | Project technical lead (TBD) | M2 passes the gate | The audit scope explicitly covers the 6 contracts and the off-chain signature service interface |
| | Audit execution | Audit report | Third-party audit firm | Code frozen | The report contains conclusions, issue severity ratings, and reproduction steps |
| | Issue fixes and retesting | Fix record + retest report | Contract development engineer | Audit report issued | All high- and medium-severity issues are closed; low-severity issues have a clear disposition conclusion (fixed or accepted in writing) |
| | Rerun all unit tests and the end-to-end chain | Regression test report | Contract development engineer | Fixes complete | The fixes do not break any existing acceptance item |
| **M4 Mainnet deployment and gradual rollout** | Deploy the 6 contracts on mainnet | Mainnet contract address list + deployment transaction hashes | Contract development engineer + multi-sig holders | M3 passes the gate | The deployment order and dependencies conform to Section 8.2; the deployment account is a multi-sig or hardware wallet |
| | BscScan source verification | Verification screenshots and contract pages | Operations engineer | Mainnet deployment complete | All 6 contracts are `Verified` |
| | Parameter freeze and publication | Parameter publication document (`mintRatePerScore`, `scoreThreshold`, `threshold`, validator set) | Project technical lead | Mainnet deployment complete | The parameters are consistent between the governance interface and the publication channel; the actual on-chain values exactly match the published values |
| | Gradual rollout | Rollout-period report | Operations engineer | Parameter configuration complete | During the rollout period, no unauthorized calls occurred, no purpose cap was breached, and there were no abnormal minting records |
| | Monitoring and alerts go live | Monitoring dashboard + alert channel | Operations engineer | Mainnet running | Monitoring covers all trigger conditions in the risk list in Section 7.6; alerts can reach the responsible persons |
| | Post-launch review | Review report | Project technical lead | Rollout period ends | Record the items that fell short of expectations, output improvement items, and clarify the start conditions for subsequent versions (such as multi-chain) |

## 9.3 Phase Gate Acceptance Criteria

| Phase gate | Passing conditions (all must be satisfied) |
| ---------- | ------------------------------------------ |
| M1 → M2 | Compilation passes, all unit tests are green, boundary tests pass, fuzz testing has no high-severity counterexamples, and the gas baseline is established |
| M2 → M3 | All 13 testnet verification checklist items pass, the end-to-end chain is reproducible, the pause drills are complete, and there are no anomalies during the stability observation period |
| M3 → M4 | All high- and medium-severity audit issues are closed, low-severity issues have conclusions, and regression tests are all green |
| M4 complete | All mainnet source is verified, parameters are frozen and published, no unauthorized or over-limit actions occurred during the rollout period, and monitoring and alerts are available |

## 9.4 Open Items and Prerequisite Decisions

The following items are not provided among the finalized parameters and must be resolved before the corresponding phase begins; otherwise the next phase may not be entered:

| Open item | Decision content required | Latest resolution point |
| --------- | ------------------------- | ----------------------- |
| Mint conversion rate `mintRatePerScore` | The number of GXN per unit of contribution score, directly determining the inflation speed | Before M1 begins (for test values), frozen before M4 |
| Contribution-score threshold `scoreThreshold` | The minimum contribution score that triggers minting | Same as above |
| Normalization baseline values `B_i` and caps `cap_i` | The normalization yardstick and single-dimension cap for the five resources | Before M2 begins (affects the consistency between off-chain computation and on-chain recalculation) |
| Validator threshold `threshold` and member set | The threshold ratio and the initial validator list | Before M2 begins (required for integration), frozen before M4 |
| Validator incentive and slashing parameters | Validator remuneration and whether to introduce staking and slashing | Before the M3 audit (introducing staking changes the contract structure) |
| Online determination and interruption grace specification | Heartbeat interval, timeout threshold, and whether a grace window is set for continuous online | Before M2 begins |
| Phase schedule and responsible persons | The start and end times of each phase and the assignment of responsible persons | Before M1 begins |


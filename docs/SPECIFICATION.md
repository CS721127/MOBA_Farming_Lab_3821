# MOBA Farming Lab — Codex Implementation Specification

> **Document type:** Implementation-ready product + algorithm specification  
> **Source:** `main.pdf`, *Score-Farming Paths: An Algorithmic Analysis of the Orienteering Problem*, COMP3821/9801, 2026 T3.  
> **Audience:** Codex / coding agents / implementation team.  
> **Language:** English is used for precise implementation instructions. The project UI may default to English, with a lightweight Chinese localisation option if convenient.  
> **Status:** This specification defines an **interactive educational demo**, not a simulation of a particular commercial MOBA game's full mechanics.

## 0. Instructions for Codex (read first)

Build a **polished, browser-playable, top-down 2D MOBA-inspired algorithm simulator** called **MOBA Farming Lab**. The demo must let a visitor **play the farming problem manually**, run **different algorithmic strategies on the same map**, watch an animated character follow each computed walk, and understand why a **general graph** is difficult whereas a **path graph** admits an exact `O(n)` solution.

**Required outcome:** A working application with real, deterministic algorithms, not just a static UI mockup. Use tasteful original/stylised game visuals; avoid copyrighted game assets and heavy combat/game systems that do not belong to the mathematical model.

**Implementation principles:**

1. Model rules must agree with §1 and §4 of the uploaded report: fixed start, free endpoint, nonnegative travel costs and rewards, one-time reward per vertex, zero collection time, static undirected graph, and a total travel-time budget.
2. Do **not** treat an arbitrary visual route as a path-graph *input*. The path-graph algorithm runs only if the **selected input graph** is actually a path (including a singleton).
3. All algorithms use the **same immutable scenario** during a comparison. Animation speed must not affect simulated costs or results.
4. **Exact** means mathematically optimal under the model; **heuristic** means no such guarantee. Never label a Greedy solution exact or imply its approximation ratio is bounded.
5. No fabricated algorithm results. Score, cost, route, relative performance and operation counts must be computed from actual implementations.
6. Separate pure algorithm code from rendering, animation, and UI state. Unit-test the algorithm layer without a browser.
7. Use seeded fixtures so presentation/demo results are reproducible.
8. Prioritise a finished vertical slice over an oversized feature list. Deliver the MVP and then polish it.

### Definition of done — project-wide

- `npm install` and `npm run dev` open the playable demo.
- `npm run build`, `npm run test` and `npm run lint` (if configured) pass.
- Users can switch between **General Map** and **Single Lane** map modes.
- Manual, Greedy (two rules), Held–Karp DP and Path Two-Pointer strategies produce real executable walks.
- Every executed walk is validated against the budget, edge connectivity and one-time rewards.
- The app includes deterministic algorithm comparison, step/replay controls and at least three educational experiment presets.
- No fake or hardcoded outcome numbers in result panels.

---

## 1. Research framing and scope

### 1.1 What is being demonstrated?

The full mathematical problem is **rooted, free-endpoint Orienteering** on an undirected weighted graph:

- The player begins at a fixed vertex `s`.
- Each edge has **nonnegative travel time**.
- Each vertex has **nonnegative one-time reward**.
- A walk may revisit vertices and traverse edges more than once.
- Once a vertex reward has been collected, revisiting does not award it again.
- The walk can end at **any vertex**; no return to the base is required.
- Collecting a reward is instantaneous; movement is the only budgeted cost.
- The objective is to **maximise rewards visited before budget `T` is exceeded**.

Formally, for walk `W = (v0=s, v1, ..., vm)`:

```text
walkCost(W) = Σ_{j=1..m} w(v[j-1], v[j])
visited(W)  = set of all vertices in W
walkReward(W) = Σ_{v in visited(W)} r(v)
OPT = max walkReward(W), subject to walkCost(W) <= T.
```

The source paper also studies the decision variant: does a feasible walk exist with reward `>= K`?

### 1.2 Mapping the problem to MOBA farming

| Formal concept | Demo-world interpretation |
|---|---|
| Vertex | Lane wave, monster camp, strategic resource location, base |
| Vertex reward | Gold/XP-style score (single scalar for this demo) |
| Edge | Traversable map connection |
| Edge weight | Travel time, not visual pixel length |
| `s` | Starting hero/base position |
| `T` | Available farming time |
| Walk | Hero's sequence of movements |
| Objective | Collect maximum total score within time |

**Critical honesty constraint:** Actual MOBA games have respawns, competition, moving enemies, combat costs, temporal constraints and more. These are intentionally absent from this static graph model. Hero attack/collection animations may be cosmetic, but **must not silently consume travel budget**.

### 1.3 Why there are two map modes

**A. General Map (`GENERAL`)**

A stylised mini-MOBA map with top/middle/bottom lanes, jungle connectors, branches and cycles. It is an **undirected general graph**. The demo runs Held–Karp and Greedy algorithms; the exact Path Two-Pointer algorithm must be disabled with a clear explanation.

**B. Single Lane (`PATH`)**

One isolated lane displayed as a line or gentle curve, with consecutively ordered reward locations. Alternative shortcuts/links are **not present in the input graph**. The demo can run Greedy, Held–Karp (if small enough) and the exact Path Two-Pointer algorithm **on this same path instance**, enabling an apples-to-apples comparison.

A general MOBA map is **not** itself a path graph. We use the restricted *single lane* model to demonstrate the structural result, not claim full-map `O(n)` optimality.

---

## 2. Product experience and visual direction

### 2.1 Player journey

1. **Choose scenario:** General Map / Single Lane, with 3–4 curated experiment presets.
2. **Inspect the map:** Hover/click resource nodes to see rewards; edges show travel time.
3. **Set budget:** Use a slider or numeric control (integer time units, typically `0..40`).
4. **Choose strategy:** Manual / Nearest Greedy / Reward-per-Time Greedy / Held–Karp / Path Two-Pointer.
5. **Run:** Algorithm computes a route immediately, then a controllable visual playback begins.
6. **Compare:** Show outcomes for all applicable strategies on the **same frozen scenario**.
7. **Learn:** A compact “Why this strategy?” view explains the chosen step, correctness/limitations, and complexity.
8. **Experiment:** Switch topology or increase number of nodes and observe the theoretical and measured effects.

### 2.2 UX layout (desktop-first, responsive)

```text
┌───────────────────────────────────────────────────────────────────────┐
│  MOBA FARMING LAB         Scenario / Map   Budget   Reset  Help        │
├───────────────────────────────────────────┬───────────────────────────┤
│                                           │  STRATEGY                 │
│         Interactive top-down map          │  ○ Manual                 │
│                                           │  ○ Nearest Greedy         │
│     nodes • edges • hero • route          │  ○ Reward/Time Greedy     │
│     rewards • movement glow               │  ○ Held–Karp DP           │
│                                           │  ○ Path Two-Pointer       │
│                                           │                           │
│                                           │  Run | Pause | Step       │
├───────────────────────────────────────────┤  1× 2× 4× | Restart       │
│  Score  ███████      Cost  12/20          │                           │
│  Current: Camp C     Collected: 4/9       │  Outcome & explanation    │
├───────────────────────────────────────────┴───────────────────────────┤
│  COMPARISON: Strategy | Reward | Cost | % of OPT | Complexity / Work  │
└───────────────────────────────────────────────────────────────────────┘
```

Desktop: map dominates the screen (about 65–75% visual priority). Mobile: map above controls; do not squeeze the map into a tiny dashboard panel.

**Visual aesthetic:** polished indie strategy game, top-down/isometric-lite fantasy terrain, stylised lanes/jungle, soft lighting, subtle parallax, crisp route lines, animated collectible bursts, restrained glass/stone panels, clean typography. The map and hero are the centre; avoid an enterprise-dashboard look. Use **original** icons/art, SVG geometry and/or procedural textures to keep dependencies manageable.

**Play animation** (deterministic): hero glides between adjacent graph vertices; the active edge illuminates; collected nodes emit a short gold/XP burst; already-collected nodes become subdued. Playback timeline can be paused, stepped per **edge traversal**, reset and sped up without changing logical cost.

### 2.3 Core on-screen data

Show **actual** values: reward, travel cost used / budget, distinct reward nodes visited, route steps, and, where available, optimality ratio `realisedReward / exactOPT`.

- If exact optimal reward is unavailable (e.g. Held–Karp exceeds the instance cap), show **“Optimality: not computed”**, never an inferred percentage.
- If `exactOPT == 0`, show `0 / 0` as **N/A** or mark all solutions optimal if validated as reward `0`; never divide by zero.
- Algorithm “time” must distinguish **measured wall-clock computation** from **theoretical asymptotic complexity** and **instrumented operation count**.
- A strategy can return an empty-movement walk `[s]`; it still collects `r(s)`.

### 2.4 Learning panels

Keep explanations short on the default screen; expand to show:

- **General OP:** why a good route must choose both a subset and a visit order.
- **Metric closure:** shortest paths reduce the optimisation to orders of reward vertices; traversing between targets may collect additional rewards along the way.
- **Greedy:** local choice vs global outcome; demonstrate concrete failures without claiming *all* greedy methods are bad.
- **Held–Karp:** dynamic programming on subsets and last visited reward node; exact but exponential in `k`.
- **Path Graph:** visited vertices form a contiguous interval; two possible orders to cover both ends; monotonicity enables linear-time two pointers.
- **NP-hardness:** the underlying combinatorial problem on general graphs is hard; this is a proof/complexity concept, not an executable “NP-hardness strategy”.

---

## 3. Technology and directory structure

### 3.1 Preferred stack

- **Vite + React + TypeScript** for application and UI.
- **Phaser 3** (or an equivalent lightweight Canvas rendering module) for the world/hero/routes/particle effects. Avoid embedding algorithm logic into Phaser scenes.
- **CSS variables + well-designed components** for presentation. Any styling library is optional.
- **Vitest** for pure unit tests; Playwright for a small number of end-to-end interaction tests if practical.
- State management can be React hooks or a small store (e.g. Zustand); keep scenario/algorithm results separate from playback state.
- No backend is required. Store presets in local TypeScript/JSON. Avoid remote APIs.

### 3.2 Suggested file tree

```text
src/
  app/App.tsx
  app/routes.ts                # optional: single-page tabs instead of router
  components/
    GameHUD.tsx
    ScenarioSelector.tsx
    StrategyPanel.tsx
    PlaybackControls.tsx
    ComparisonTable.tsx
    AlgorithmExplainer.tsx
    ComplexityChart.tsx
  game/
    GameCanvas.tsx
    WorldScene.ts
    spriteFactory.ts
    animationController.ts
  model/
    types.ts
    validation.ts
    graph.ts
    shortestPaths.ts
    routeEvaluation.ts
    scenarioFactory.ts
  algorithms/
    greedy.ts
    heldKarp.ts
    pathTwoPointer.ts
    pathQuadratic.ts
    bruteForce.ts
    registry.ts
  scenarios/
    generalMap.ts
    singleLane.ts
    greedyCounterexample.ts
    smallGeneral.ts
  tests/
    fixtures.test.ts
    routeEvaluation.test.ts
    greedy.test.ts
    heldKarp.test.ts
    pathTwoPointer.test.ts
    properties.test.ts
  styles/
    tokens.css
    app.css
README.md
```

---

## 4. Shared model and immutable result contracts

### 4.1 TypeScript domain types

Use these exact concepts; names can be adapted, semantics must not change.

```ts
export type VertexId = string;
export type EdgeId = string;
export type StrategyId =
  | 'manual'
  | 'greedy-nearest'
  | 'greedy-ratio'
  | 'held-karp'
  | 'path-two-pointer'
  | 'path-quadratic'
  | 'brute-force';

export interface Vertex {
  id: VertexId;
  label: string;
  x: number; // world-space rendering coordinate; NOT a travel cost
  y: number;
  reward: number; // finite, nonnegative, preferably an integer
  kind: 'base' | 'lane' | 'jungle' | 'resource';
  lane?: 'top' | 'mid' | 'bot';
}

export interface Edge {
  id: EdgeId;
  u: VertexId;
  v: VertexId;
  cost: number; // finite, nonnegative
}

export interface Scenario {
  id: string;
  title: string;
  topology: 'GENERAL' | 'PATH'; // display intent, but validate actual topology
  vertices: Vertex[];
  edges: Edge[];
  startId: VertexId;
  budget: number;
  seed?: number;
  explanation: string;
}

export interface Walk {
  vertexIds: VertexId[]; // must start at startId; may repeat
  edgeIds: EdgeId[];     // length = vertexIds.length - 1
}

export interface EvaluatedWalk {
  walk: Walk;
  visitedIds: VertexId[]; // distinct, first-visit order
  totalReward: number;    // includes start reward
  travelCost: number;
  remainingBudget: number;
  isValid: boolean;
  violations: string[];
}

export interface AlgorithmMetrics {
  computeMs: number;       // UI/environment dependent, measured
  statesVisited?: number;  // exact work counter defined by each algorithm
  transitionsChecked?: number;
  dijkstraRuns?: number;
  pointerMoves?: number;
}

export interface StrategyResult {
  strategy: StrategyId;
  status: 'ok' | 'unsupported' | 'too-large' | 'invalid-input';
  reason?: string;
  walk?: Walk;                  // full physical walk on ORIGINAL graph
  selectedTargets?: VertexId[]; // abstract stop sequence, for DP explanation
  interval?: { left: number; right: number }; // PATH indices, zero-based
  evaluation?: EvaluatedWalk;
  metrics: AlgorithmMetrics;
  trace: AlgorithmTraceEvent[];
}

export interface AlgorithmTraceEvent {
  type:
    | 'start'
    | 'candidate'
    | 'select-target'
    | 'dp-state'
    | 'pointer-move'
    | 'traverse-edge'
    | 'collect'
    | 'finish';
  message: string;
  vertexId?: VertexId;
  edgeId?: EdgeId;
  time?: number;
  values?: Record<string, number | string | boolean>;
}
```

`trace` is for education, not the source of truth. `walk` and `evaluateWalk` are authoritative. Do not store an independent mutable “score” in game state that can disagree with evaluation.

### 4.2 Input validation

Validate at scenario load and before algorithm execution:

- Nonempty vertex list; unique vertex IDs and edge IDs; valid `startId`.
- Finite `reward >= 0`, finite `edge.cost >= 0`, finite `budget >= 0`.
- Every edge joins two different existing vertices. Reject multi-edges in the MVP to make traversal unambiguous.
- Undirected graph: a single `Edge(u,v)` permits traversal in either direction.
- Disconnected graph is permitted: algorithms ignore vertices unreachable from `s`; UI can render them but marks them unreachable.
- A path scenario must have actual **connected path topology**: one node/no edges, or for `n>=2`, exactly `n-1` edges and exactly two degree-1 endpoints, all others degree 2. Determine the actual ordered list by traversing from a degree-1 endpoint; do not infer ordering from screen position.
- For general maps, edges may form branches and cycles. A scenario labelled `GENERAL` may coincidentally be a path, but label the topological fact accurately.

### 4.3 Single source of truth: `evaluateWalk`

Implement and unit-test this **before any algorithms**.

```ts
function evaluateWalk(s: Scenario, walk: Walk): EvaluatedWalk {
  // 1. Check that walk.vertexIds[0] === s.startId.
  // 2. Check that edgeIds match each consecutive vertex pair,
  //    regardless of traversal direction.
  // 3. Sum each traversed edge cost, including repeat traversals.
  // 4. Visit/collect from start immediately at elapsed time 0.
  // 5. At each subsequent arrival, collect vertex reward iff first visit.
  // 6. Verify totalCost <= budget (allow EPS for floating point).
  // 7. Return real totalReward, travelCost, visitedIds, and violations.
}
```

**Use integer costs and rewards in bundled fixtures**, which avoids floating-point instability. General code may allow finite decimals with `EPS = 1e-9` for comparisons. A zero-cost edge is permitted; do not loop forever because of it.

### 4.4 Playback/event reconstruction

From a validated `Walk`, derive chronological events: initial collection at time `0`, every edge traversal, and any newly collected reward. Use cumulative **model cost**, not wall time. Playback speed (`0.5x / 1x / 2x / 4x`) changes only how quickly those events are shown. A zero-cost step may receive a small *visual* duration without increasing model cost.

For Manual mode, the user clicks an **adjacent graph vertex** or edge, not any arbitrary screen point. Reject a move if its edge cost exceeds remaining budget. Manual play may stop at any time.

---

## 5. Common graph utilities

### 5.1 Adjacency representation

```ts
type Adjacency = Map<VertexId, Array<{
  to: VertexId;
  edgeId: EdgeId;
  cost: number;
}>>;
```

Build both directions per edge. Keep adjacency order deterministic (sort by `to`, then `edgeId`) so seeds, route replays and test snapshots are stable.

### 5.2 Dijkstra and shortest-path reconstruction

Nonnegative edge weights make Dijkstra valid.

```text
DIJKSTRA(graph, source):
  dist[*] = INF
  parentVertex[*] = null
  parentEdge[*] = null
  dist[source] = 0
  push (0, source) onto a min-heap

  while heap not empty:
    pop (d, u)
    if d > dist[u]: continue
    for every undirected adjacency (u, v, edgeId, cost):
      candidate = d + cost
      if candidate < dist[v]:
         dist[v] = candidate
         parentVertex[v] = u
         parentEdge[v] = edgeId
         push (candidate, v)
  return (dist, parents)
```

Only update predecessor on **strict** improvement, not ties; this is important for stable predecessor trees when edge costs can be zero. Path reconstruction from the parent tree returns an **original-graph** walk segment including all intermediate vertices/edges.

Cache Dijkstra from `s` and from every positive-reward vertex for the Held–Karp/Greedy comparison. Cache per immutable scenario hash; invalidate if rewards, costs, start, graph structure or budget changes as appropriate (distances only depend on graph costs/topology, but results depend on all inputs).

### 5.3 Metric closure and an important semantic nuance

Let `P = {v != s | reward(v) > 0}`, and `k = |P|`. The closure includes `s` and each vertex of `P`; its edge weights are `d(u,v)` from Dijkstra.

A closure **target order** such as `[s, A, C]` expands to actual shortest paths, which **may pass through another reward node B**. Therefore:

- `selectedTargets` are intentional DP stops, **not necessarily the exact set of physically visited reward nodes**.
- All displayed outcomes must call `evaluateWalk` on the **expanded original-graph walk**.
- The DP optimisation is still exact with nonnegative one-time rewards: passing through extra positive-reward vertices cannot decrease the achieved reward, and the metric-closure equivalence in the paper establishes equality of optimum values.

Never assume `actualVisitedRewardSet === dpMask` for every intermediate DP state.

---

## 6. Algorithm 1 — Greedy Nearest Feasible Reward

**Category:** heuristic, no global optimality guarantee.  
**Supported topology:** general or path.  
**Purpose:** show why always picking the closest new resource can be shortsighted.

### Rule

At the current position, select the **uncollected positive-reward vertex with the smallest shortest-path travel cost that fits the remaining budget**. If no such vertex exists, stop.

**Deterministic ties:** smaller distance, then larger direct target reward, then lexicographic vertex ID.

### Pseudocode

```text
GREEDY_NEAREST(scenario):
  W = [start]
  seen = {start}
  current = start
  spent = 0

  while true:
    eligible = []
    for each reward target v where reward(v) > 0 and v not in seen:
      d = shortestDistance(current, v)
      if d is finite and spent + d <= T:
        add (v, d) to eligible
    if eligible is empty: break

    target = argmin eligible by (distance, -reward, vertexId)
    segment = shortestPath(current, target)   // includes intermediate vertices
    append segment to W (without duplicate first vertex)
    collect all previously unseen nodes along the segment
    spent += cost(segment)
    current = target

  return evaluateWalk(W)
```

**Note:** Nodes encountered in transit are automatically collected, even if not the chosen target; future iterations must exclude those already collected nodes. A target with zero shortest-path distance can be selected, but every iteration must newly visit a previously uncollected positive-reward target, so termination is finite.

**Complexity:** with `k` positive-reward targets and cached `k+1` Dijkstra source trees, up to `O(k^2)` target comparisons after shortest-path preprocessing. Without caching, a straightforward implementation may perform up to `k` Dijkstra runs. Report preprocessing and decisions separately.

---

## 7. Algorithm 2 — Greedy Reward per Travel Time

**Category:** heuristic, no global optimality guarantee.  
**Supported topology:** general or path.  
**Purpose:** show why maximising local gain/cost can still miss global combinations.

### Rule

At each step, among feasible uncollected positive-reward targets, select the one with the largest

```text
ratio(v) = reward(v) / shortestDistance(current, v).
```

For `distance == 0` and positive reward, treat ratio as `+Infinity` (select free rewards first). Do **not** silently modify the mathematical rule to include transit rewards in the numerator; transit rewards still count in the final realised score.

**Deterministic ties:** larger ratio, larger direct reward, smaller distance, lexicographic ID.

### Pseudocode

```text
GREEDY_RATIO(scenario):
  initialise walk/seen/current/spent as in GREEDY_NEAREST
  while there is a feasible uncollected reward target:
    choose target maximising reward(target) / distance(current,target)
    append shortest original-graph path to target
    update seen, collected reward, spent and current
  return evaluateWalk(W)
```

Approximate runtime is comparable to nearest Greedy. In the UI, phrase the rule as **“Highest immediate reward per additional travel time”**.

### Required counterexample (used by both Greedy modes)

```text
  A (reward 2)
  |
  | cost 1
  |
  S (reward 0) ---- cost M ---- B (reward M)
  T = M, M >= 3
```

Graph edges: `S-A:1`, `S-B:M`. No `A-B` edge. This graph itself is also a path `A-S-B`.

- Nearest Greedy picks `A`, obtains `2` and cannot subsequently reach `B` within budget.
- Ratio Greedy compares `2/1 = 2` against `M/M = 1`; also picks `A` and gets `2`.
- The optimal strategy moves directly `S -> B`, earning `M`.
- `OPT / GREEDY = M/2` grows without bound as `M` increases.

Use `M = 10` for the default demo (`Greedy = 2`, `OPT = 10`), with an optional slider for `M` and dynamically computed results. **This counterexample disproves these two specified rules, not every conceivable Greedy algorithm.**

---

## 8. Algorithm 3 — Exact Held–Karp-style DP (general graph)

**Category:** exact (within validated model).  
**Supported topology:** general or path.  
**Purpose:** global optimum and small-instance benchmark.

### 8.1 Important source alignment

The report's §3 presents a Held–Karp-style recurrence and an implementation that iterates all `V` vertices. The report's §1 Metric Closure Lemma instead permits optimisation over positive-reward vertices `P`. For the demo, implement the **reward-vertex-compressed variant** below; label this as an implementation refinement of the paper's general technique, **not a verbatim copy of Algorithm 1**.

Use `k = |P|`, not the total graph size `|V|`, as the exponential DP dimension. Still compute physical shortest paths in the original graph.

### 8.2 State definition

Index positive-reward vertices `P = [p0, p1, ..., p(k-1)]`, sorted by vertex ID. `mask` is a `k`-bit integer specifying which **intentional reward stops** are in the selected order.

```text
dp[mask][j] = minimum metric-closure cost of a stop order
              starting at s, visiting exactly the reward targets in mask,
              and ending at target p[j] (j must be in mask).
```

These are **abstract stop sequences**. The physically expanded shortest paths may incidentally pass through other reward vertices.

Reward for a selected mask:

```text
maskReward(mask) = reward(s) + Σ_{i bit in mask} reward(p[i]).
```

### 8.3 Initialization and recurrence

```text
dp[1 << j][j] = d(s, p[j])                   for every reachable j

dp[mask | (1 << j)][j] =
    min over i in mask of (dp[mask][i] + d(p[i], p[j]))
    where j not in mask.
```

The empty route `[s]` is a valid candidate with cost `0` and reward `r(s)`.

### 8.4 Implementable pseudocode

```text
HELD_KARP_EXACT(G, r, s, T):
  P = sorted vertices excluding s with positive reward and reachable from s
  k = length(P)
  if k > MAX_HK_REWARD_NODES: return status 'too-large'
  distances, shortestPathParents = Dijkstra from s and each vertex in P

  dp[0 .. 2^k - 1][0 .. k - 1] = INF
  prev[...][...] = NONE
  for j = 0..k-1:
    if d(s, P[j]) <= T:
      dp[1<<j][j] = d(s, P[j])

  bestMask = 0; bestLast = NONE
  bestReward = r(s); bestCost = 0

  for mask = 1..(1<<k)-1:
    selectedReward = r(s) + rewardSum[mask]
    for last = 0..k-1 where bit(last) in mask:
      spent = dp[mask][last]
      if spent == INF or spent > T: continue
      instrument: statesVisited += 1
      if selectedReward > bestReward:
         bestMask = mask; bestLast = last
         bestReward = selectedReward; bestCost = spent
      for next = 0..k-1 where bit(next) not in mask:
         instrument: transitionsChecked += 1
         d = distance(P[last], P[next])
         newSpent = spent + d
         if newSpent <= T and newSpent < dp[mask|(1<<next)][next]:
            dp[...] = newSpent
            prev[...] = last

  reconstruct target order from (bestMask, bestLast) via prev
  prepend start vertex s
  expand each abstract hop into its shortest ORIGINAL-GRAPH path
  evaluate the expanded original-graph walk
  return the actual walk + evaluation + selected target order + metrics
```

**Correction for implementation:** when reconstructing the predecessor mask, remove the current `last` bit at each step; `prev[mask][last]` records the previous terminal index. If there are cost or score ties, choose deterministic behaviour; e.g. smaller actual travel cost then lexicographic target order. The final result must be evaluated on the physical walk.

**Important:** You may safely prune states whose minimum cost exceeds `T` because adding nonnegative distances cannot restore feasibility.

### 8.5 Why it is exact

1. Any feasible physical walk induces an order of first visits to positive-reward vertices; substituting shortest-path distances never increases travel cost and preserves the selected reward.
2. Conversely, any feasible metric-closure stop order can be expanded into a physical walk with the same travel cost; incidental intermediate rewards cannot reduce the reward.
3. The DP enumerates all relevant selected target subsets and orders using the optimal-substructure recurrence. Therefore the best abstract reward equals the physical optimum, and the reconstructed route attains that optimum.

### 8.6 Complexity / browser cap

With `N = |V|`, `M = |E|`, and `k = |P|`:

```text
Dijkstra preprocessing: O((k+1) * (N+M) log N)   (conservative binary-heap bound)
DP transitions:       O(2^k * k^2)
DP storage:           O(2^k * k)
```

Store Dijkstra predecessor trees for reconstruction as well; that consumes additional polynomial memory. Default `MAX_HK_REWARD_NODES = 14` for smooth presentation, optionally `16` in a dedicated benchmark mode with safeguards. At the cap, use a Web Worker or yield control to keep the UI responsive. No attempt to run exponential DP on 30–50 reward nodes during normal interaction.

If the instance exceeds the cap, show **“Exact DP disabled: too many positive-reward vertices (k=...)”**, with a shortcut to a smaller preset. Do **not** silently switch to a heuristic while still labelling the outcome exact.

---

## 9. Algorithm 4 — Exact Path Graph Orienteering, `O(n)`

**Category:** exact; the primary structural result of §4 of `main.pdf`.  
**Supported topology:** *only* a path-graph input (including `n=1`).  
**Purpose:** show how a path topology eliminates combinatorial route-order ambiguity.

### 9.1 Model and notation

Let ordered vertices be `v[0], v[1], ..., v[n-1]`, start at index `h`. Each consecutive edge has nonnegative cost `ell[i]`; each vertex has nonnegative reward `r[i]`.

Every visited set must be an interval `[L,R]` with `L <= h <= R`.

```text
A(L) = distance from v[h] to v[L] = sum(ell[L..h-1])
B(R) = distance from v[h] to v[R] = sum(ell[h..R-1])
P(L,R) = sum(r[L..R])
```

**Interval property (Lemma 4.1 in the paper):** visiting both extreme indices on a path forces visiting every intermediate vertex. Since rewards are collected once, every walk's score is exactly `P(L,R)`.

**Covering-cost property (Lemma 4.2):** to visit both extremes from `h`, the best free-endpoint walk is either:

```text
h -> L -> R  costing 2*A + B
h -> R -> L  costing A + 2*B
```

Hence:

```text
C(L,R) = min(2*A + B, A + 2*B)
       = A + B + min(A, B).
```

The mathematical optimisation is:

```text
max P(L,R) over 0 <= L <= h <= R < n, subject to C(L,R) <= T.
```

### 9.2 `O(n^2)` exact baseline

First implement a simple quadratic version for confidence/testing:

```text
prefixDist[0] = 0
prefixDist[i+1] = prefixDist[i] + ell[i]
prefixReward[0] = 0
prefixReward[i+1] = prefixReward[i] + r[i]

best = -Infinity
for L from 0 to h:
  for R from h to n-1:
    A = prefixDist[h] - prefixDist[L]
    B = prefixDist[R] - prefixDist[h]
    cost = A + B + min(A,B)
    reward = prefixReward[R+1] - prefixReward[L]
    if cost <= T and reward > best:
       best = reward; chosen = [L,R]
```

Runtime `O(n^2)` after `O(n)` prefix construction; memory `O(n)`. Its role is a cross-check for the linear algorithm, **not** the main demonstration method.

### 9.3 `O(n)` exact two-pointer method

For fixed `L`, increasing `R` never decreases cost, because all edge costs are nonnegative; all feasible right endpoints form a prefix.

For fixed `L`, increasing `R` never decreases reward, because all rewards are nonnegative; therefore the **furthest feasible `R`** has the best reward for that `L`.

When `L` moves right, `A(L)` never increases, so the furthest feasible `R` never needs to move left. Each pointer advances at most `n` times.

**Reference TypeScript-style pseudocode (0-based indexing):**

```ts
function exactPathTwoPointer(
  orderedVertexIds: string[],
  edgeCosts: number[],  // length n-1
  rewards: number[],    // length n
  startIndex: number,
  budget: number,
) {
  const n = orderedVertexIds.length;
  const x = new Array<number>(n).fill(0);
  const q = new Array<number>(n + 1).fill(0);
  for (let i = 1; i < n; i++) x[i] = x[i - 1] + edgeCosts[i - 1];
  for (let i = 0; i < n; i++) q[i + 1] = q[i] + rewards[i];

  const h = startIndex;
  let R = h;
  let bestReward = -Infinity;
  let bestL = h, bestR = h;
  let bestCost = Infinity;
  let pointerMoves = 0;

  for (let L = 0; L <= h; L++) {
    const A = x[h] - x[L];
    if (A > budget) continue;

    while (R + 1 < n) {
      const Bnext = x[R + 1] - x[h];
      const nextCost = A + Bnext + Math.min(A, Bnext);
      if (nextCost > budget) break;
      R++;
      pointerMoves++;
    }

    const B = x[R] - x[h];
    const cost = A + B + Math.min(A, B);
    const reward = q[R + 1] - q[L];
    // Deterministic among evaluated maximal-R candidates.
    if (reward > bestReward || (reward === bestReward && cost < bestCost)) {
      bestReward = reward;
      bestL = L;
      bestR = R;
      bestCost = cost;
    }
  }

  // Build index walk: go to nearer extreme first, then cross to farther.
  // A <= B => h -> L -> R, otherwise h -> R -> L.
  // Expand integer index steps (+1/-1) to physical graph edge IDs.
  return { bestReward, bestL, bestR, bestCost, pointerMoves };
}
```

The function above is the **algorithm core**; the implementation must additionally return a fully expanded `Walk`, call `evaluateWalk`, and write explanatory pointer-move trace events. The tie rule chooses minimum cost **among maximal-R candidates inspected**, not necessarily the globally minimum-cost route among all equal-reward walks. The primary guarantee is **globally optimal reward**, not a secondary minimum-distance objective.

**Guard:** All indexed arrays must be derived from the **actual ordered path topology**. `n=1`, `h=0`, `budget=0`, zero-reward and zero-cost cases must work.

### 9.4 Reconstruction

```text
IF A(bestL) <= B(bestR): visit h, h-1, ..., bestL, bestL+1, ..., bestR
ELSE:                   visit h, h+1, ..., bestR, bestR-1, ..., bestL
```

The actual vertex/edge walk may repeat vertices, and this is valid. Both cases visit every node in `[L,R]`. A correctly reconstructed walk must have cost `C(L,R)` and score `P(L,R)`.

### 9.5 Complexity and scope

```text
Preprocessing prefix sums: O(n) time, O(n) space
Left pointer:              at most n iterations
Right pointer:             at most n total increments
Walk reconstruction:       O(n)
TOTAL:                     O(n) time, O(n) space
```

Do **not** use this theorem when:

- The graph has a branch, cycle, shortcut or lane-to-lane connector.
- Rewards are negative.
- There is a required end vertex or required return to base (the cost formula changes).
- Edge costs or rewards evolve during the walk.

### 9.6 Mandatory hand-checked fixture

```text
ordered vertices: [v1, v2, v3, v4, v5, v6, v7]
rewards:          [ 5,  2,  6,  1,  7,  4,  8]
edge costs:       [ 2,  1,  3,  2,  1,  2]
start: v4 (index 3)
budget: 10
expected optimal reward: 21
one optimal interval: [v1, v5] (indices [0,4])
A = 6, B = 2, C = 6 + 2 + 2 = 10
one optimal physical walk: v4 -> v5 -> v4 -> v3 -> v2 -> v1
```

This fixture can be a curated `Single Lane` preset and an automated test.

---

## 10. Algorithm 5 — Exhaustive small-instance validator (Brute Force)

**Category:** exact reference algorithm; not the headline UI strategy.  
**Purpose:** verify correctness independently on tiny instances.

### 10.1 General graph oracle

For `k <= 8` (optionally `<= 9`), enumerate ordered **distinct positive-reward target subsets** by DFS on the metric closure. Track current target, mask, cost, and selected reward. Prune when the next hop exceeds `T`.

```text
DFS(last, visitedMask, costSoFar, scoreSoFar):
  update best if scoreSoFar is larger
  for each unvisited reward target v:
    nextCost = costSoFar + d(last, v)
    if nextCost <= T:
      DFS(v, visitedMask + v, nextCost, scoreSoFar + reward(v))
```

Initial state is `(s, empty mask, 0, r(s))`. Reconstruct an original-graph walk for the winning order. The metric-closure lemma makes this exact under the model. Worst-case enumeration is factorial in `k`; impose the cap.

### 10.2 Path oracle

Run the quadratic interval enumeration in §9.2. In unit/property tests, require:

```text
exactPathTwoPointer(scenario).reward === pathQuadratic(scenario).reward
```

### 10.3 Validation policy

Use oracles **in tests and optionally in an “Advanced” view**, not on every render frame. Whenever an exact algorithm returns a walk, validate the result via `evaluateWalk`; tests should fail on an invalid or over-budget result.

---

## 11. NP-hardness interactive mini-lab (educational, not a strategy)

The paper's §2 uses a Hamiltonian Path reduction but its displayed budget/reward threshold parameters are inconsistent between construction and reverse proof. **Do not reproduce those conflicting parameters in the demo.** This module is optional for MVP but recommended for the polished research version.

### 11.1 Correct decision-instance construction

Given an undirected Hamiltonian Path instance `H=(V,E)` with `n = |V|`:

```text
Add new start vertex s.
Connect s to each v in V.
Give every edge in the new graph weight 1.
Set reward(s) = 0.
Set reward(v) = 1 for every original v in V.
Set travel budget T = n.
Set decision threshold K = n.
```

There is a Hamiltonian path in `H` **iff** there is an OP walk starting at `s` with cost `<=n` and reward `>=n`.

**Proof sketch:** A Hamiltonian path gives `s -> v1 -> ... -> vn`, costing `n` and rewarding `n`. Conversely, earning all `n` unit rewards in at most `n` unit traversals forces one new original vertex per traversal and no redundant moves; removing `s` leaves a Hamiltonian path in `H`.

Interactive idea: let visitors choose a tiny graph `H`, toggle **“Construct OP instance”**, show the augmented start node, budget and threshold, then demonstrate a YES witness route (or “no witness within exhaustive cap”) for very small graphs.

**Important distinction:** NP-hardness is a property/proof of the general optimisation problem, not a route-planning algorithm. Label this as **“Complexity Proof Playground”**.

---

## 12. Comparison rules and educational fairness

### 12.1 Comparable results

Always freeze one `Scenario` input (graph, edge weights, rewards, start, budget) for all compared strategies. Compute independent results, then replay them either sequentially or side-by-side on cloned identical maps.

**On GENERAL map:** Manual, nearest Greedy, ratio Greedy, Held–Karp (when `k` is below cap), brute-force oracle only for tiny fixtures. Path Two-Pointer appears **disabled**, with a meaningful tooltip.

**On PATH map:** All applicable methods can run **on the same path**. The expected exact result is:

```text
PathTwoPointer.reward == PathQuadratic.reward == HeldKarp.reward
```

when Held–Karp is within its size cap. Greedy is allowed to perform worse or equal.

### 12.2 Result cards

| Field | Definition |
|---|---|
| Reward | `evaluateWalk(result.walk).totalReward` |
| Travel cost | Sum of actual traversed edge costs |
| Budget used | `travelCost / T` if `T>0`, otherwise special `0` handling |
| Distinct nodes | Unique visited vertices (including start) |
| Path length | Number of traversed edges (including repeats) |
| Optimality | Realised reward / independently computed exact optimum, if available |
| Theoretical complexity | Formula keyed to `N,M,k,n` |
| States / checks | Real counters from algorithm execution |
| Compute time | Measured `performance.now()` delta, not a theoretical quantity |

For algorithms that do not run, display `unsupported` or `too-large` with a reason. Do not populate their fields with dummy scores.

### 12.3 Route view vs stop-order view

When presenting Held–Karp, optionally overlay two layers:

- **Stop order:** intended reward targets in metric closure (dashed line).
- **Physical route:** expanded shortest-path walk along original graph edges (solid line).

Clarify that the physical route can pass through extra reward locations and the actual score is computed from that expanded walk.

---

## 13. Scenario design and presets

The app should launch with polished, instantly playable curated scenarios. The geometry may be stylised, but all underlying graphs must be real and explicitly stored.

### Preset A — General MOBA Mini Map

- Small, stylised three-lane layout with jungle connections and at least one cycle.
- Aim for `8..12` positive-reward nodes, allowing Held–Karp to run quickly.
- Some vertices can have `0` reward to illustrate shortest-path connector nodes.
- Use integer travel times. Ensure the optimal route does not trivially collect every reward.
- Present strategy comparison and replay.

### Preset B — Single Mid Lane

- Exact path with the **seven-node fixture in §9.6**.
- Initial budget `T=10`; allow slider `0..18`.
- Highlight `[L,R]`, display `A`, `B`, `C(L,R)`, `P(L,R)` in an optional algorithm detail panel.
- Show live changes to the optimal interval as budget varies.

### Preset C — Greedy Trap

- Graph `A --(1)-- S --(10)-- B`; `r(A)=2`, `r(S)=0`, `r(B)=10`, `T=10`.
- Both Greedy modes obtain `2`; Held–Karp and Path Two-Pointer obtain `10`.
- This is **a path graph** and is a valuable counterexample to the **particular Greedy rules**.
- Animate the Greedy route vs exact route in mirrored view.

### Preset D — Small Branching Graph

Use this fixed graph as a known exact test:

```text
Vertices: s(0), a(4), b(6), c(5)
Undirected edges: s-a(2), s-b(3), a-c(1), b-c(1)
Budget T = 4
An optimal walk: s -> a -> c -> b
Travel cost = 2 + 1 + 1 = 4
Total reward = 4 + 5 + 6 = 15
```

This illustrates how path topology and general topology differ. The `s-a-c-b` chain is a **chosen walk**, but the input graph itself has an additional `s-b` connection, so the path-graph input theorem must not be assumed applicable.

### Optional custom graph editor

After MVP: click to add reward nodes, connect edges, edit costs/rewards, choose start and budget. Validate the input and mark strategy availability. Provide a seeded “Generate” button. Keep this optional until core execution and visual polish are stable.

---

## 14. Educational experiments (Research Lab tab)

### 14.1 Greedy trap experiment

- Use Preset C; compare both heuristics to exact methods.
- Highlight the **first choice** and explain the missed alternative.
- Allow changing `M` while updating both graph cost and reward at `B` consistently.
- Chart *measured* greedy/optimal reward, and show `OPT / Greedy = M/2` for this specific family.

### 14.2 General map vs path restriction

- Show a branching general map, then select a single **isolated lane input**.
- Explain the distinction between deleting all alternate links (changing the input) and merely drawing a selected route as a line.
- On the isolated lane, show the visited interval, the shorter-side-first walk, and pointer movements.
- Do not claim identical optimum scores between the original general map and its restricted lane — they are different feasible sets.

### 14.3 Complexity / scalability

- Generate paths with increasing `n`, compare `PathQuadratic` and `PathTwoPointer` using a repeatable seed. Plot real operation counts and optionally compute time.
- For general graphs, increase positive-reward count `k` only within a safe exact-DP range. Plot **actual DP states/transitions** plus a clearly-labelled theoretical `O(2^k k^2)` trend.
- Record environment-dependent timings carefully; never represent a single noisy browser measurement as a proof of asymptotic complexity.
- Run expensive tests on user action, not on every animation frame.

---

## 15. Performance, responsiveness and safety guards

- For routine demos, keep general maps at about 10–14 positive-reward vertices.
- Path maps may have many more nodes (hundreds or thousands for algorithm benchmarks; visualisation can sample labels while keeping the full graph).
- Limit trace generation to a reasonable size; provide sampled DP state updates in the UI, while retaining exact counters.
- When running Held–Karp, use a Worker or nonblocking job execution to avoid freezing the animation. Allow cancel/restart when scenario inputs change.
- Cache computed results by a stable scenario signature and strategy. Do not reuse results if the graph, start, budget, rewards or costs change.
- Dijkstra with zero-cost edges must terminate and construct valid parent chains.
- Never interpolate a movement directly between nonadjacent physical nodes; expand all shortest-path hops first.
- A comparator run must not mutate its input scenario or another strategy's visited state.
- Provide colour-blind-friendly line differences (solid/dashed/pattern) in addition to colours.
- Sound is optional, muted by default; all critical information must also be visual/textual.
- Control labels and charts should be understandable without advanced graph-theory knowledge.

---

## 16. Tests and correctness requirements

### 16.1 Required deterministic tests

| ID | Scenario | Required assertion |
|---|---|---|
| T01 | Single vertex `s`, `r(s)=5`, `T=0` | All valid exact methods return reward `5`, cost `0` |
| T02 | Seven-node path in §9.6, `T=10` | Two-Pointer = Quadratic = Held–Karp = `21` |
| T03 | Greedy trap with `M=10` | Nearest = `2`, Ratio = `2`, exact = `10` |
| T04 | Small branching graph in Preset D | Held–Karp and tiny brute-force oracle = `15`, travel cost `<=4` |
| T05 | Disconnected positive-reward vertex | Unreachable vertex is not counted |
| T06 | Start has positive reward; no movement budget | Start reward collected immediately |
| T07 | Zero-cost edges and zero-reward connector nodes | No infinite loop; correct cost/reward |
| T08 | Route walks the same edge/node twice | Edge cost counts twice; vertex reward counts once |
| T09 | Non-path graph with shortcut | Path Two-Pointer returns `unsupported` |
| T10 | Held–Karp above configured `k` cap | Status `too-large` with explanation; no fake result |
| T11 | Physical shortest path passes through extra reward vertex | Expanded route is evaluated by its actual visited set |
| T12 | Any completed strategy | Returned physical route is connected, starts at `s`, and respects `T` |

### 16.2 Property-based / seeded differential tests

Generate many small random path graphs with:

- `n` from 1 to about 12,
- random start index,
- integer edge costs including `0`,
- rewards including `0`,
- budgets from `0` to beyond the longest possible simple path,
- independent reproducible random seeds.

For every case, require:

```text
TwoPointer.reward === PathQuadratic.reward
TwoPointer.walk is valid
TwoPointer.walk travelCost <= T
TwoPointer.walk reward === TwoPointer.reportedReward
```

For sufficiently small `k`, also assert equality with Held–Karp and brute-force oracle. Run at least `1,000` random seeds in CI or as a script; more is welcome if tests remain fast.

Generate small random **general graphs** and compare Held–Karp against the brute-force oracle for `k<=8`. Check edge cases with disconnected components and zero-cost edges.

### 16.3 End-to-end UI tests

- Changing budget recomputes strategy results and resets current playback deterministically.
- Selecting a strategy and pressing Run visibly moves the hero along actual adjacent edges.
- Pause stops the animation but does not change logical results.
- Step advances one traversed edge, triggers collection on first arrival, and does not double-count revisits.
- Compare mode uses an identical frozen scenario for both strategies.
- Path algorithm is disabled when actual topology is not a path.
- Screens remain usable at desktop and narrow/mobile widths.

---

## 17. Implementation phases and acceptance criteria

### Phase 1 — Working game foundation (**must finish**)

- Scaffold Vite/React/TypeScript, graph models, validation, evaluator and Dijkstra.
- Build a good-looking map renderer with one animated hero, nodes, edges, world HUD, and replay controls.
- Implement Manual mode and the two curated graph modes.
- Deliver at least two deterministic presets with visible score/budget updates.

**Acceptance:** visitor can click adjacent nodes in Manual mode, collect one-time rewards, see valid budget changes, reset, and replay a stored walk.

### Phase 2 — All core algorithms (**must finish**)

- Implement Nearest Greedy, Ratio Greedy, Held–Karp compressed DP, Path Quadratic and Path Two-Pointer.
- Implement shortest-path expansion, common result contract, unsupported reasons and trace events.
- Test with deterministic fixtures plus differential validation.

**Acceptance:** exact algorithms agree on all small path fixtures; Greedy trap returns expected outcomes; every result passes `evaluateWalk`.

### Phase 3 — Research presentation (**must finish**)

- Add compare mode with real outcome cards and side-by-side/sequential animations.
- Add concise math/algorithm explainers, Path interval overlay, two-pointer movement visuals.
- Add Greedy Trap and Graph-vs-Path labs; complexity lab can be a smaller initial version.

**Acceptance:** a visitor can understand the result **without reading the source paper**, and every mathematical statement in the UI is scoped correctly.

### Phase 4 — Polish and optional depth

- Improve game assets, map detail, character animation, particle effects and transitions.
- Add seeded scenario generation, advanced editor, timing charts and NP-hardness reduction playground.
- Improve accessibility, touch controls, tutorial, keyboard shortcuts, screenshots and deployable build.

**Acceptance:** demo feels like a cohesive small game rather than a set of disjointed forms/charts; the app continues to pass tests and builds reproducibly.

### Priority rule for Codex

If time or context is limited, implement **Phase 1 → Phase 2 → Phase 3** in that order; prefer a complete, working subset rather than superficially displaying more features. Art polish must never compromise algorithm correctness.

---

## 18. README and demo presentation requirements

Include `README.md` with:

1. Quick start: install / dev / test / build.
2. Research question and exact model assumptions.
3. How to play: Manual, Run, Pause, Step, Compare, Reset.
4. Table of algorithms: supported input graph, exact/heuristic, purpose and asymptotic complexity.
5. Clearly stated limits (single-lane topology, fixed start/free endpoint, static nonnegative weights/rewards, no combat/respawn).
6. Reference to the source report `main.pdf` (assume Codex receives it; if not, this specification is self-contained for implementation).
7. An explicit note that the source paper's NP-hardness numeric parameters and Held–Karp proof/complexity presentation require editorial reconciliation, while this demo uses the consistent definitions in §§8 and 11 above.

### Suggested 90-second presentation sequence

**0–15 s:** “MOBA players have limited time to collect score; that is rooted free-endpoint Orienteering.” Show General Map.

**15–40 s:** Run Greedy and Held–Karp on the same map; compare reward and travel cost.

**40–60 s:** Run the tiny Greedy Trap; visually show why local choices can lose.

**60–80 s:** Switch to Single Lane, highlight the contiguous interval, display `C(L,R)=A+B+min(A,B)` and animate the Two-Pointer solution.

**80–90 s:** Show complexity comparison: general exact subset DP is exponential in the positive-reward count `k`; exact path solving is linear in `n`, **only under the path-input assumptions**.

---

## 19. Report correspondence and editorial caveats

The uploaded report is the main source for the mathematical model, with these relevant sections:

| Source section (`main.pdf`) | Relevant content | Demo representation |
|---|---|---|
| §1.1 Orienteering Problem | Walk, budget, nonnegative rewards/costs, one-time collection | Shared model and `evaluateWalk` |
| §1.2 Distances | Shortest-path costs, Dijkstra | Shortest-path utility |
| §1.3 Metric Closure Lemma | Equivalence of physical walks and stop orders | Held–Karp optimisation and route expansion |
| §2 NP-Hardness Proof | Reduction from Hamiltonian Path | Optional proof playground; **corrected consistent parameters** |
| §3 Held–Karp Style DP | Subset DP over visited stops | Compressed exact DP; see discrepancy note |
| §4 Path Graph | Interval property and covering cost | Exact Single Lane solver |
| §4.1 Linear-Time Two-Pointer | Monotonicity, pseudocode and `O(n)` theorem | Exact Path Two-Pointer + trace |
| §4.2 Scope and Limitations | Assumptions and nonapplicability to general graphs | Limitations explainer and availability guard |

**Editorial caveat — source vs implementation:**

- The report's §2 construction says `r(v)=1` for all vertices (including its new start), `T=|V|+1` and threshold `R=|V|`, while its reverse implication uses different values. The proof playground uses the explicitly stated **corrected construction** in §11 above; do not imply the PDF already writes those corrected parameters.
- The report's §3 recurrence and induction exposition contain notation/proof inconsistencies, and the listed algorithm loops over all `V` even though §1 discusses positive-reward compression. The implementation here uses a sound, specified `P`-compressed variant and a consistent complexity measure.
- The path-graph results in §4/§4.1 are already present in the uploaded PDF and are the principal basis for §9 of this spec.
- Greedy nearest/ratio, Manual mode, brute-force verification, extra fixtures, UX choices and game technical architecture are **demo additions**; they are not claimed as verbatim report algorithms.

---

## 20. Final instruction to coding agent

**Implement this project now.** Start by building/test-driving the pure mathematical engine, then integrate the animated top-down game. Do not stop after drawing the UI. Use the exact fixtures and output checks above, keep all comparisons honest, and ship a polished runnable application. When a requested advanced feature must be deferred, leave a clearly named future-work item, not a fake functioning button. Produce a clean README and report what is implemented and what remains.

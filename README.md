# MOBA Farming Lab

A playable, original fantasy-world demonstration of rooted, free-endpoint Orienteering. Real algorithms, original Canvas art and deterministic experiments. Built from `docs/SPECIFICATION.md` against the original report in `public/main.pdf`.

## Run

Node.js 22 recommended (20.19+ supported by the toolchain).

```sh
npm install
npm run dev
npm run test
npm run lint
npm run build
```

For a lockfile-exact installation use `npm ci`. Vite prints the development URL. `dist/` is the static production site; deploy it with any static host supporting JavaScript module Workers. No server, API keys, database or account is needed to run the downloaded project. Font loading is optional; system fonts work offline.

Optional browser automation:

```sh
npx playwright install chromium
npm run test:e2e
```

The included GitHub Actions workflow runs unit/differential tests, type checks, build and desktop/mobile Playwright cases. Unit tests do not require a browser. `qa.html` is a development-only 390 × 844 iframe harness for inspecting actual mobile media queries; it is not included in the Vite production build.

## Play

- **Expedition:** select General Map or Single Lane, a preset and travel budget.
- **Manual:** select Manual exploration, then click an adjacent camp. Keyboard users can expand Resource details and activate its buttons. Invalid/nonadjacent/over-budget moves are rejected. Finish & replay replays your saved walk.
- **Algorithms:** Run expedition, Pause/Resume, Step one physical edge, Replay, and 0.5×/1×/2×/4× speed. Score is derived from the arrived walk prefix, not a separately mutated counter.
- **Compare:** all rows solve the same immutable scenario. The solid selected route and dashed rival route share a map. The companion panel follows edge indices in lockstep for visual comparison (not a model-time race); Replay this route plays its own edge costs. Each route can also be replayed sequentially.
- **Decision trace:** separate educational playback shows subset states or pointer intervals. The slider highlights inspected path intervals. Route details distinguish physical walks from intentional stops and list model-time traversal/collection events.
- **Research lab:** adjust the greedy trap parameter, contrast topology, generate seeded paths, run real scaling experiments, examine the corrected NP-hardness reduction, edit and validate scenario JSON, export complete experiment JSON.
- **Field guide:** concise model, recurrence, proof ideas, complexity, scope and original report.

Sylva the Runekeeper and Auren the Dawn Warden are original layered 2D procedural characters. Cape, armour, helmet, face, staff/sword/shield, idle motion and movement are rendered locally. The world includes river animation, trees, worn roads, stone ruins, resource pedestals, fireflies and collection bursts. Character choice is cosmetic; their mathematical capabilities are identical. This is top-down 2D art, not a 3D character or terrain asset pipeline.

## Exact mathematical contract

A static undirected graph, fixed start, free endpoint, finite nonnegative costs and rewards, instantaneous one-time collection, travel budget T. Start reward is immediate. Revisited edges incur cost again; revisited vertices do not award again. Zero-cost edges and disconnected components are supported. Screen distance is unrelated to model cost. No combat, collection duration, respawn, opponent or changing resource mechanic is simulated.

`evaluateWalk` is authoritative. It checks starting vertex, edge IDs, undirected connectivity, repeated travel costs, unique rewards and budget. Every solver returns an expanded physical walk and is evaluated by this function. `playbackEvents` reconstructs model-time arrivals and one-time collections. Zero-cost motion can take a small visual duration without spending model time.

## Algorithms

N = all vertices; M = all edges; k = reachable positive-reward vertices excluding the start; n = path vertices. Preprocessing uses deterministic heap Dijkstra and strict predecessor improvement (safe with zero-weight edges). Shared shortest-path trees depend only on graph IDs/topology/costs. UI result caching uses complete scenario JSON and is bounded.

| Method              | Input                 | Guarantee               | Work                                               |
| ------------------- | --------------------- | ----------------------- | -------------------------------------------------- |
| Manual              | Any graph             | Feasible accepted moves | Evaluation linear in graph + walk                  |
| Nearest reward      | Any graph             | Heuristic; no bound     | O(k²) decisions + shortest paths + physical output |
| Reward / time       | Any graph             | Heuristic; no bound     | O(k²) decisions + shortest paths + physical output |
| Held–Karp           | Any graph, k ≤ 14     | Exact reward            | O(2^k k²) DP; O(2^k k) storage                     |
| Path two-pointer    | Actual connected path | Exact reward            | O(n) time and space including reconstruction       |
| Quadratic intervals | Actual connected path | Exact reference         | O(n²) time; O(n) space                             |
| Exhaustive oracle   | Any graph, k ≤ 8      | Exact reference         | O(k!) target orders, plus path preprocessing       |

All relevant-source Dijkstra preprocessing is O((k+1)(N+M) log N), conservatively for a binary heap. Counts record actual solver work; computation milliseconds are environment dependent and cache-sensitive. Unavailable results do not receive scores or fabricated optimality. A zero optimum shows N/A. DP state traces are sampled/bounded to 500 events; full state/transition counters remain exact.

A metric-closure mask represents intentional stops. Shortest-path expansion can pass through additional rewards. Nonnegative rewards and the metric-closure lemma establish equality of abstract and physical optima; final scores always use the physical walk.

For paths, validated graph traversal supplies the ordering (not x/y coordinates). The visited set is an interval [L,R]. With distances A and B from the start, cover cost is A+B+min(A,B). For each L the farthest feasible R maximises nonnegative reward; as L advances, R never moves backwards. The primary guarantee is maximum reward. The tie rule minimises cost only among inspected maximal-R candidates, not among all equal-reward walks.

Greedy ties follow the specification, including infinite ratio for a free positive reward. Transited rewards enter `seen`, and every decision reaches a previously uncollected positive target, ensuring termination.

## Reproducibility and validation

`src/engine.test.ts` includes required T01–T12 fixtures, malformed input, manual guards, deterministic replay and model-time events. It runs **1,000 seeded random paths** (n=1..12; all compare linear, quadratic and Held–Karp; small instances also compare exhaustive search) plus **250 seeded general graphs**, including disconnected and zero-cost cases, comparing DP against permutation enumeration. All paths are evaluated for feasibility.

Hand-checked outcomes:

| Preset                     | Result                            |
| -------------------------- | --------------------------------- |
| Seven-node lane, T=10      | Exact reward 21, physical cost 10 |
| Greedy trap, M=T=10        | Both Greedy rules 2; exact 10     |
| Small branching graph, T=4 | Exact reward 15, cost 4           |
| Singleton reward 5, T=0    | Reward 5, cost 0                  |

Seed 3821 is used by the benchmark. Path size is n; general-DP benchmark size is exactly k (all generated non-start rewards are positive and connectivity is ensured). Timings are measurements, never proofs. Benchmark jobs and all comparison algorithms run in module Workers; changing scenarios terminates stale jobs. Exported JSON captures exact scenario input and result values.

The UI was also exercised using the browser automation available in the build environment. See `docs/VALIDATION.md` for executed checks and the distinction between them and the included standalone Playwright suite.

## Architecture

- `src/engine.ts`: pure types, validation, adjacency, binary-heap Dijkstra, physical reconstruction, evaluator, seven strategy modes and playback events.
- `src/scenarios.ts`: curated fixtures, deterministic PRNG, path/general generation and corrected proof instances.
- `src/worker.ts`: background comparisons and benchmarks.
- `src/World.tsx`: independent Canvas world/character renderer; no route planning inside it.
- `src/main.tsx`: scenario controls, immutable result cache, animation state, comparisons, experiments and explanations.
- `src/style.css`: responsive design and accessible control focus styles.
- `src/engine.test.ts`, `e2e/play.spec.ts`: mathematical and UI regression coverage.

## Research correspondence and caveats

Reference: _Score-Farming Paths: An Algorithmic Analysis of the Orienteering Problem_, COMP3821/9801, UNSW Sydney, T3 2026 (`public/main.pdf`). Sections 1 and 4 establish the model/metric closure and linear path result. This demo uses a sound **positive-reward-compressed refinement** of the general Held–Karp technique; it is not a verbatim implementation of the paper's all-V pseudocode.

The original §2 NP-hardness construction/reverse implication use inconsistent numeric parameters, and §3 proof notation/complexity presentation require editorial reconciliation. The Theory chapter uses the corrected construction: add a new start s, connect it to every original vertex, unit edge costs, r(s)=0, unit original rewards, T=K=n. Visiting all n rewards in at most n traversals forces a Hamiltonian path in the original H. Chain and 3-leaf-star examples are solved by actual exact routines.

Greedy rules, manual gameplay, differential oracles, presets, visual effects and UX are demo additions, not attributed as verbatim report algorithms. A route drawn as a line in a branching/cyclic graph does not enable the path theorem.

## Scope

All core specification acceptance features are implemented. The Map workspace combines generation, drawing, gameplay and experiments. Draw vertices and edges, choose a start, move/delete items, edit rewards/costs and undo/redo; Test graph validates and runs the real algorithms. Seeded generation supports paths or general graphs with density/connectivity controls. Top, Mid and Bot are lane-only path showcases. Theory covers the whole paper with interactive graph illustrations and expandable proofs. JSON import/export remains available. The interface is English. Audio is omitted. No 3D assets, combat, multiplayer, accounts or persistence service are included; experiment JSON is the portable save format. Source and dependencies are in the project; generated output lives in `dist/`. The supplied ZIP excludes dependencies and Git internals.

## Dense graphs and guided playback

Generated general graphs use seeded interior layouts, and large paths use separated serpentine rows. Dense graphs use the same forest-and-river canvas as the presets. Replay and comparison now use the same single, full-width canvas as the default map, with no additional zoom toolbar, fit-map button, or node/edge inspector taking up viewport space. Dense graphs retain compact markers and display every network edge over the terrain; detailed editing remains available in Draw graph. Greedy traces continue to show actual chosen targets and decision quantities. Theory links open the corresponding paper chapter.

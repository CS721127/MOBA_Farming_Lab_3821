/** Pure, deterministic rooted free-endpoint orienteering engine. */
export const EPS = 1e-9;
export const HK_CAP = 14;
export type Strategy =
  "manual" | "nearest" | "ratio" | "hk" | "path" | "quadratic" | "brute";
export interface Vertex {
  id: string;
  label: string;
  x: number;
  y: number;
  reward: number;
  kind?: string;
}
export interface Edge {
  id: string;
  u: string;
  v: string;
  cost: number;
}
export interface Scenario {
  id: string;
  title: string;
  topology: "GENERAL" | "PATH";
  vertices: Vertex[];
  edges: Edge[];
  startId: string;
  budget: number;
  seed?: number;
  explanation: string;
}
export interface Walk {
  vertexIds: string[];
  edgeIds: string[];
}
export interface Evaluation {
  totalReward: number;
  travelCost: number;
  remainingBudget: number;
  visitedIds: string[];
  isValid: boolean;
  violations: string[];
}
export interface Trace {
  type: string;
  message: string;
  values?: Record<string, number | string>;
}
export interface Result {
  strategy: Strategy;
  status: "ok" | "unsupported" | "too-large" | "invalid-input";
  reason?: string;
  walk?: Walk;
  evaluation?: Evaluation;
  selectedTargets?: string[];
  interval?: { left: number; right: number };
  metrics: {
    computeMs: number;
    statesVisited: number;
    transitionsChecked: number;
    dijkstraRuns: number;
    pointerMoves: number;
  };
  trace: Trace[];
}
export const names: Record<Strategy, string> = {
  manual: "Manual exploration",
  nearest: "Greedy · nearest",
  ratio: "Greedy · reward / time",
  hk: "Held–Karp DP",
  path: "Path two-pointer",
  quadratic: "Quadratic intervals",
  brute: "Exhaustive oracle",
};
export const complexities: Record<Strategy, string> = {
  manual: "Your route",
  nearest: "O(k²) + shortest paths",
  ratio: "O(k²) + shortest paths",
  hk: "O(2ᵏ k²) + shortest paths",
  path: "O(n)",
  quadratic: "O(n²)",
  brute: "O(k!) + shortest paths",
};
export function validate(s: Scenario): string[] {
  const errors: string[] = [];
  const ids = new Set(s.vertices.map((v) => v.id));
  const eid = new Set<string>();
  const pairs = new Set<string>();
  if (!s.vertices.length || ids.size !== s.vertices.length)
    errors.push("Vertices must be nonempty and unique");
  if (!ids.has(s.startId)) errors.push("Missing start vertex");
  if (!Number.isFinite(s.budget) || s.budget < 0)
    errors.push("Budget must be finite and nonnegative");
  for (const v of s.vertices)
    if (
      !Number.isFinite(v.reward) ||
      v.reward < 0 ||
      !Number.isFinite(v.x) ||
      !Number.isFinite(v.y)
    )
      errors.push("Invalid vertex " + v.id);
  for (const e of s.edges) {
    const pair = [e.u, e.v].sort().join("\0");
    if (
      eid.has(e.id) ||
      pairs.has(pair) ||
      e.u === e.v ||
      !ids.has(e.u) ||
      !ids.has(e.v) ||
      !Number.isFinite(e.cost) ||
      e.cost < 0
    )
      errors.push("Invalid edge " + e.id);
    eid.add(e.id);
    pairs.add(pair);
  }
  return errors;
}
export function evaluateWalk(s: Scenario, w: Walk): Evaluation {
  const violations = validate(s);
  const vm = new Map(s.vertices.map((v) => [v.id, v]));
  const em = new Map(s.edges.map((e) => [e.id, e]));
  const seen = new Set<string>();
  let reward = 0,
    cost = 0;
  if (w.vertexIds[0] !== s.startId) violations.push("Walk must begin at start");
  if (w.edgeIds.length !== w.vertexIds.length - 1)
    violations.push("Edge/vertex count mismatch");
  w.vertexIds.forEach((id, i) => {
    const v = vm.get(id);
    if (!v) violations.push("Unknown vertex");
    else if (!seen.has(id)) {
      seen.add(id);
      reward += v.reward;
    }
    if (i) {
      const e = em.get(w.edgeIds[i - 1]);
      const a = w.vertexIds[i - 1];
      if (!e || !((e.u === a && e.v === id) || (e.v === a && e.u === id)))
        violations.push("Disconnected traversal");
      else cost += e.cost;
    }
  });
  if (cost > s.budget + EPS) violations.push("Budget exceeded");
  return {
    totalReward: reward,
    travelCost: cost,
    remainingBudget: s.budget - cost,
    visitedIds: [...seen],
    isValid: !violations.length,
    violations,
  };
}
export function adjacency(s: Scenario) {
  const a = new Map(
    s.vertices.map((v) => [
      v.id,
      [] as { to: string; edgeId: string; cost: number }[],
    ]),
  );
  for (const e of s.edges) {
    a.get(e.u)!.push({ to: e.v, edgeId: e.id, cost: e.cost });
    a.get(e.v)!.push({ to: e.u, edgeId: e.id, cost: e.cost });
  }
  for (const list of a.values())
    list.sort(
      (x, y) => x.to.localeCompare(y.to) || x.edgeId.localeCompare(y.edgeId),
    );
  return a;
}
export function pathOrder(s: Scenario): string[] | null {
  if (validate(s).length) return null;
  if (s.vertices.length === 1) return s.edges.length ? null : [s.startId];
  if (s.edges.length !== s.vertices.length - 1) return null;
  const a = adjacency(s);
  const ends = [...a]
    .filter(([, n]) => n.length === 1)
    .map(([id]) => id)
    .sort();
  if (
    ends.length !== 2 ||
    [...a.values()].some((n) => n.length < 1 || n.length > 2)
  )
    return null;
  const order: string[] = [];
  let p = "",
    c = ends[0];
  while (c) {
    order.push(c);
    const next = a.get(c)!.find((v) => v.to !== p)?.to || "";
    p = c;
    c = next;
    if (order.length > s.vertices.length) return null;
  }
  return order.length === s.vertices.length ? order : null;
}
class Heap {
  a: { d: number; id: string }[] = [];
  less(x: { d: number; id: string }, y: { d: number; id: string }) {
    return x.d < y.d || (x.d === y.d && x.id < y.id);
  }
  push(x: { d: number; id: string }) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const v = a[0],
      last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {
        let j = i;
        for (const c of [i * 2 + 1, i * 2 + 2])
          if (c < a.length && this.less(a[c], a[j])) j = c;
        if (i === j) break;
        [a[i], a[j]] = [a[j], a[i]];
        i = j;
      }
    }
    return v;
  }
}
type Tree = {
  dist: Map<string, number>;
  parent: Map<string, { id: string; edge: string }>;
};
export function dijkstra(s: Scenario, source: string): Tree {
  const a = adjacency(s),
    dist = new Map(s.vertices.map((v) => [v.id, Infinity])),
    parent = new Map<string, { id: string; edge: string }>();
  dist.set(source, 0);
  const h = new Heap();
  h.push({ d: 0, id: source });
  while (h.a.length) {
    const { d, id } = h.pop();
    if (d > dist.get(id)!) continue;
    for (const e of a.get(id)!) {
      const nd = d + e.cost;
      if (nd < dist.get(e.to)!) {
        dist.set(e.to, nd);
        parent.set(e.to, { id, edge: e.edgeId });
        h.push({ d: nd, id: e.to });
      }
    }
  }
  return { dist, parent };
}
const closureCache = new Map<string, Map<string, Tree>>();
function closure(s: Scenario) {
  const key = JSON.stringify([s.vertices.map((v) => v.id), s.edges]);
  if (!closureCache.has(key)) {
    if (closureCache.size > 20) closureCache.clear();
    closureCache.set(key, new Map());
  }
  return closureCache.get(key)!;
}
export function segment(t: Tree, source: string, target: string): Walk {
  const v = [target],
    e: string[] = [];
  while (v[v.length - 1] !== source) {
    const p = t.parent.get(v[v.length - 1]);
    if (!p) throw Error("Unreachable target");
    v.push(p.id);
    e.push(p.edge);
  }
  return { vertexIds: v.reverse(), edgeIds: e.reverse() };
}
export function solve(s: Scenario, strategy: Strategy): Result {
  const began = performance.now();
  const r: Result = {
    strategy,
    status: "ok",
    metrics: {
      computeMs: 0,
      statesVisited: 0,
      transitionsChecked: 0,
      dijkstraRuns: 0,
      pointerMoves: 0,
    },
    trace: [],
  };
  const trace = (type: string, message: string, values?: Trace["values"]) => {
    if (r.trace.length < 500) r.trace.push({ type, message, values });
  };
  const fail = (status: Result["status"], reason: string) => {
    r.status = status;
    r.reason = reason;
    r.metrics.computeMs = performance.now() - began;
    return r;
  };
  const errors = validate(s);
  if (errors.length) return fail("invalid-input", errors.join("; "));
  let walk: Walk = { vertexIds: [s.startId], edgeIds: [] };
  trace("start", "Collect the start reward at time zero.");
  const trees = closure(s);
  const tree = (id: string) => {
    if (!trees.has(id)) {
      trees.set(id, dijkstra(s, id));
      r.metrics.dijkstraRuns++;
    }
    return trees.get(id)!;
  };
  const append = (from: string, to: string) => {
    const w = segment(tree(from), from, to);
    walk.vertexIds.push(...w.vertexIds.slice(1));
    walk.edgeIds.push(...w.edgeIds);
    return w;
  };
  if (strategy === "path" || strategy === "quadratic") {
    const order = pathOrder(s);
    if (!order)
      return fail(
        "unsupported",
        "Input has branches, cycles or disconnected nodes. A drawn route is not a path-graph input.",
      );
    const n = order.length,
      h = order.indexOf(s.startId),
      x = [0],
      q = [0],
      vm = new Map(s.vertices.map((v) => [v.id, v])),
      a = adjacency(s);
    for (let i = 0; i < n; i++) {
      q.push(q[i] + vm.get(order[i])!.reward);
      if (i)
        x.push(
          x[i - 1] + a.get(order[i - 1])!.find((e) => e.to === order[i])!.cost,
        );
    }
    let best = -1,
      bc = Infinity,
      L = h,
      R = h,
      right = h;
    const inspect = (l: number, rr: number) => {
      r.metrics.statesVisited++;
      const A = x[h] - x[l],
        B = x[rr] - x[h],
        c = A + B + Math.min(A, B),
        v = q[rr + 1] - q[l];
      if (c <= s.budget + EPS && (v > best || (v === best && c < bc))) {
        best = v;
        bc = c;
        L = l;
        R = rr;
      }
      trace(
        "pointer-move",
        `Inspect interval [${l + 1}, ${rr + 1}]: reward ${v}, cover cost ${c}.`,
        { L: l, R: rr, A, B, cost: c, reward: v },
      );
    };
    for (let l = 0; l <= h; l++) {
      r.metrics.pointerMoves++;
      const A = x[h] - x[l];
      if (strategy === "quadratic") {
        for (let rr = h; rr < n; rr++) {
          r.metrics.transitionsChecked++;
          inspect(l, rr);
        }
      } else if (A <= s.budget + EPS) {
        while (right + 1 < n) {
          r.metrics.transitionsChecked++;
          const B = x[right + 1] - x[h];
          if (A + B + Math.min(A, B) > s.budget + EPS) break;
          right++;
          r.metrics.pointerMoves++;
        }
        inspect(l, right);
      }
    }
    const first = x[h] - x[L] <= x[R] - x[h] ? L : R,
      second = first === L ? R : L;
    let at = h;
    for (const end of [first, second])
      while (at !== end) {
        const next = at + Math.sign(end - at),
          e = a.get(order[at])!.find((e) => e.to === order[next])!;
        walk.vertexIds.push(order[next]);
        walk.edgeIds.push(e.edgeId);
        at = next;
      }
    r.interval = { left: L, right: R };
  } else if (strategy === "nearest" || strategy === "ratio") {
    const positive = s.vertices.filter((v) => v.reward > 0);
    const seen = new Set([s.startId]);
    let current = s.startId,
      spent = 0;
    r.selectedTargets = [s.startId];
    while (true) {
      const candidates = positive
        .filter((v) => {
          r.metrics.transitionsChecked++;
          return (
            v.reward > 0 &&
            !seen.has(v.id) &&
            Number.isFinite(tree(current).dist.get(v.id)) &&
            spent + tree(current).dist.get(v.id)! <= s.budget + EPS
          );
        })
        .map((v) => ({ v, d: tree(current).dist.get(v.id)! }));
      const compareCandidate = (
        a: { v: Vertex; d: number },
        b: { v: Vertex; d: number },
      ) => {
        if (strategy === "ratio") {
          const ar = a.d === 0 ? Infinity : a.v.reward / a.d,
            br = b.d === 0 ? Infinity : b.v.reward / b.d;
          if (ar !== br) return ar > br ? -1 : 1;
          return (
            b.v.reward - a.v.reward || a.d - b.d || a.v.id.localeCompare(b.v.id)
          );
        }
        return (
          a.d - b.d || b.v.reward - a.v.reward || a.v.id.localeCompare(b.v.id)
        );
      };
      if (!candidates.length) break;
      // Linear selection preserves the specified O(k²) decision bound.
      const { v, d } = candidates.reduce((best, candidate) =>
        compareCandidate(candidate, best) < 0 ? candidate : best,
      );
      trace(
        "select-target",
        `Choose ${v.label}: reward ${v.reward}, distance ${d}; ${strategy === "ratio" ? "highest direct reward / time" : "nearest feasible uncollected reward"}.`,
        {from:current,target:v.id,reward:v.reward,distance:d,remainingBudget:s.budget-spent,candidates:candidates.length,ratio:d===0?'free':Number((v.reward/d).toFixed(3))},
      );
      const traversed = append(current, v.id);
      traversed.vertexIds.forEach((id) => seen.add(id));
      spent += d;
      current = v.id;
      r.selectedTargets.push(v.id);
      r.metrics.statesVisited++;
    }
  } else if (strategy === "hk" || strategy === "brute") {
    const P = s.vertices
      .filter(
        (v) =>
          v.id !== s.startId &&
          v.reward > 0 &&
          Number.isFinite(tree(s.startId).dist.get(v.id)),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const k = P.length,
      cap = strategy === "hk" ? HK_CAP : 8;
    if (k > cap)
      return fail(
        "too-large",
        `Exact ${strategy === "hk" ? "DP" : "oracle"} disabled: k=${k} exceeds cap ${cap}. Choose a smaller preset.`,
      );
    let targets: string[] = [],
      best = 0,
      bc = 0;
    const D = [s.startId, ...P.map((v) => v.id)].map((id) =>
      P.map((v) => tree(id).dist.get(v.id)!),
    );
    if (strategy === "brute") {
      const dfs = (
        last: number,
        mask: number,
        cost: number,
        reward: number,
        order: string[],
      ) => {
        r.metrics.statesVisited++;
        if (reward > best || (reward === best && cost < bc)) {
          best = reward;
          bc = cost;
          targets = [...order];
        }
        for (let j = 0; j < k; j++)
          if (!(mask & (1 << j))) {
            r.metrics.transitionsChecked++;
            const c = cost + D[last][j];
            if (c <= s.budget + EPS)
              dfs(j + 1, mask | (1 << j), c, reward + P[j].reward, [
                ...order,
                P[j].id,
              ]);
          }
      };
      dfs(0, 0, 0, 0, []);
    } else if (k) {
      const size = 1 << k,
        dp = new Float64Array(size * k).fill(Infinity),
        prev = new Int16Array(size * k).fill(-1),
        rewards = new Float64Array(size);
      let bm = 0,
        bl = -1;
      for (let j = 0; j < k; j++)
        if (D[0][j] <= s.budget + EPS) dp[(1 << j) * k + j] = D[0][j];
      for (let mask = 1; mask < size; mask++) {
        const bit = mask & -mask,
          j = 31 - Math.clz32(bit);
        rewards[mask] = rewards[mask ^ bit] + P[j].reward;
        for (let last = 0; last < k; last++) {
          const spent = dp[mask * k + last];
          if (!Number.isFinite(spent)) continue;
          r.metrics.statesVisited++;
          if (
            r.metrics.statesVisited <= 100 ||
            r.metrics.statesVisited % 500 === 0
          )
            trace(
              "dp-state",
              `Mask ${mask.toString(2).padStart(k, "0")}, end ${P[last].label}: minimum cost ${spent}.`,
              { mask, last, cost: spent, reward: rewards[mask] },
            );
          if (rewards[mask] > best || (rewards[mask] === best && spent < bc)) {
            best = rewards[mask];
            bc = spent;
            bm = mask;
            bl = last;
          }
          for (let next = 0; next < k; next++)
            if (!(mask & (1 << next))) {
              r.metrics.transitionsChecked++;
              const c = spent + D[last + 1][next],
                idx = (mask | (1 << next)) * k + next;
              if (c <= s.budget + EPS && c < dp[idx]) {
                dp[idx] = c;
                prev[idx] = last;
              }
            }
        }
      }
      while (bl !== -1) {
        targets.push(P[bl].id);
        const pl = prev[bm * k + bl];
        bm ^= 1 << bl;
        bl = pl;
      }
      targets.reverse();
    }
    r.selectedTargets = [s.startId, ...targets];
    let current = s.startId;
    for (const t of targets) {
      append(current, t);
      current = t;
    }
  }
  r.walk = walk;
  r.evaluation = evaluateWalk(s, walk);
  if (!r.evaluation.isValid)
    return fail("invalid-input", r.evaluation.violations.join("; "));
  trace(
    "finish",
    `Validated physical walk: ${r.evaluation.totalReward} reward in ${r.evaluation.travelCost} travel time.`,
  );
  r.metrics.computeMs = performance.now() - began;
  return r;
}
export function manualMove(s: Scenario, w: Walk, target: string): Walk | null {
  const at = w.vertexIds.at(-1)!;
  const e = s.edges.find(
    (e) => (e.u === at && e.v === target) || (e.v === at && e.u === target),
  );
  if (!e) return null;
  const next = {
    vertexIds: [...w.vertexIds, target],
    edgeIds: [...w.edgeIds, e.id],
  };
  return evaluateWalk(s, next).isValid ? next : null;
}
export function prefix(w: Walk, steps: number): Walk {
  return {
    vertexIds: w.vertexIds.slice(0, steps + 1),
    edgeIds: w.edgeIds.slice(0, steps),
  };
}
/** Model-time events. Zero-cost steps can share a timestamp; visual duration is separate. */
export function playbackEvents(s: Scenario, w: Walk): Trace[] {
  const e = evaluateWalk(s, w);
  if (!e.isValid) throw Error(e.violations.join("; "));
  const vm = new Map(s.vertices.map((v) => [v.id, v])),
    em = new Map(s.edges.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const events: Trace[] = [];
  let time = 0;
  w.vertexIds.forEach((id, i) => {
    if (i) {
      const edge = em.get(w.edgeIds[i - 1])!;
      const before = time;
      time += edge.cost;
      events.push({
        type: "traverse-edge",
        message: `${w.vertexIds[i - 1]} → ${id}: ${edge.cost} time`,
        values: { edgeId: edge.id, depart: before, arrive: time },
      });
    }
    if (!seen.has(id)) {
      seen.add(id);
      events.push({
        type: "collect",
        message: `Collect ${vm.get(id)!.reward} at ${id} (once)`,
        values: { vertexId: id, time, reward: vm.get(id)!.reward },
      });
    }
  });
  return events;
}

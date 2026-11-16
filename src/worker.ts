import { solve, type Scenario, type Strategy } from "./engine";
import { randomPath, randomGeneral } from "./scenarios";
self.onmessage = (e: MessageEvent) => {
  const { scenario, benchmark } = e.data;
  if (benchmark) {
    const rows = [];
    for (const n of [16, 32, 64, 128, 256, 512]) {
      const s = randomPath(n, 3821);
      s.budget = n * 3;
      s.startId = "v" + Math.floor(n / 2);
      for (const id of ["path", "quadratic"] as Strategy[]) {
        const r = solve(s, id);
        rows.push({ n, id, ...r.metrics });
      }
    }
    for (const n of [4, 6, 8, 10, 12, 14]) {
      const s = randomGeneral(n + 1, 3821);
      s.budget = 100;
      s.startId = "v0";
      s.vertices.forEach((v) => (v.reward = v.id === "v0" ? 0 : 1));
      for (let i = 0; i < n; i++) {
        const u = "v" + i,
          v = "v" + (i + 1);
        if (
          !s.edges.some(
            (e) => (e.u === u && e.v === v) || (e.v === u && e.u === v),
          )
        )
          s.edges.push({ id: "connect" + i, u, v, cost: 1 });
      }
      rows.push({ n, id: "hk", ...solve(s, "hk").metrics });
    }
    postMessage({ benchmark: rows });
  } else {
    const s = scenario as Scenario;
    const ids: Strategy[] = [
      "nearest",
      "ratio",
      "hk",
      "path",
      "quadratic",
      "brute",
    ];
    postMessage({ results: ids.map((id) => solve(s, id)) });
  }
};

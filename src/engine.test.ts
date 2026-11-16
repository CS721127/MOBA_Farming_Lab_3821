import { describe, it, expect } from "vitest";
import {
  solve,
  playbackEvents,
  evaluateWalk,
  pathOrder,
  manualMove,
  dijkstra,
  segment,
  type Scenario,
  type Strategy,
} from "./engine";
import {
  lane,
  trap,
  branch,
  general,
  randomPath,
  randomGeneral,
} from "./scenarios";
const exact: Strategy[] = ["path", "quadratic", "hk", "brute"];
function check(s: Scenario, ids: Strategy[]) {
  for (const id of ids) {
    const r = solve(s, id);
    expect(r.status).toBe("ok");
    expect(r.evaluation?.isValid).toBe(true);
    expect(evaluateWalk(s, r.walk!).travelCost).toBeLessThanOrEqual(
      s.budget + 1e-9,
    );
  }
}
describe("Research fixtures T01–T12", () => {
  it("T01/T06 singleton and positive start with zero budget", () => {
    const s = randomPath(1, 1);
    s.vertices[0].reward = 5;
    s.budget = 0;
    for (const id of [...exact, "nearest", "ratio"] as Strategy[]) {
      expect(solve(s, id).evaluation?.totalReward).toBe(5);
      expect(solve(s, id).evaluation?.travelCost).toBe(0);
    }
  });
  it("T02 seven-node reward 21", () => {
    for (const id of exact)
      expect(solve(lane(), id).evaluation?.totalReward).toBe(21);
  });
  it("T03 both specified greedy rules lose", () => {
    for (const M of [3, 10, 50]) {
      for (const id of ["nearest", "ratio"] as Strategy[])
        expect(solve(trap(M), id).evaluation?.totalReward).toBe(2);
      for (const id of exact)
        expect(solve(trap(M), id).evaluation?.totalReward).toBe(M);
    }
  });
  it("T04 branching optimum 15", () => {
    for (const id of ["hk", "brute"] as Strategy[])
      expect(solve(branch(), id).evaluation?.totalReward).toBe(15);
  });
  it("T05 disconnected reward excluded", () => {
    const s = branch();
    s.vertices.push({
      id: "isolated",
      label: "Isolated",
      x: 0,
      y: 0,
      reward: 999,
    });
    expect(solve(s, "hk").evaluation?.totalReward).toBe(15);
  });
  it("T07 zero-cost connector and reward", () => {
    const s = lane();
    s.edges.forEach((e) => (e.cost = 0));
    s.budget = 0;
    s.vertices[2].reward = 0;
    for (const id of [...exact, "nearest", "ratio"] as Strategy[])
      expect(solve(s, id).evaluation?.totalReward).toBe(27);
    check(s, exact);
  });
  it("T08 revisits charge edges and collect once", () => {
    const s = trap();
    const w = { vertexIds: ["S", "A", "S"], edgeIds: ["e0", "e0"] };
    const e = evaluateWalk(s, w);
    expect(e.totalReward).toBe(2);
    expect(e.travelCost).toBe(2);
  });
  it("T09 cycle is not path; actual topology overrides label", () => {
    const s = branch();
    s.topology = "PATH";
    expect(pathOrder(s)).toBe(null);
    expect(solve(s, "path").status).toBe("unsupported");
    const t = lane();
    t.topology = "GENERAL";
    expect(solve(t, "path").status).toBe("ok");
  });
  it("T10 DP and oracle caps", () => {
    const s = randomPath(22, 1);
    s.vertices.forEach((v) => (v.reward = 1));
    expect(solve(s, "hk").status).toBe("too-large");
    expect(solve(s, "brute").status).toBe("too-large");
  });
  it("T11 intermediate rewards are physically collected", () => {
    const s = lane();
    const w = segment(dijkstra(s, "v4"), "v4", "v1");
    expect(w.vertexIds).toEqual(["v4", "v3", "v2", "v1"]);
    expect(evaluateWalk(s, w).totalReward).toBe(14);
  });
  it("T12 all executable walks and immutable comparison", () => {
    for (const s of [lane(), trap(), branch(), general()]) {
      const before = JSON.stringify(s);
      check(s, ["nearest", "ratio", "hk"]);
      expect(JSON.stringify(s)).toBe(before);
    }
  });
  it("invalid inputs and invalid walks fail", () => {
    const s = lane();
    s.vertices[0].reward = -1;
    expect(solve(s, "hk").status).toBe("invalid-input");
    expect(
      evaluateWalk(branch(), { vertexIds: ["s", "c"], edgeIds: ["e0"] })
        .isValid,
    ).toBe(false);
  });
  it("manual move is adjacent and budget checked", () => {
    const s = branch(),
      w = { vertexIds: ["s"], edgeIds: [] };
    expect(manualMove(s, w, "c")).toBe(null);
    expect(manualMove(s, w, "a")?.vertexIds).toEqual(["s", "a"]);
    s.budget = 0;
    expect(manualMove(s, w, "a")).toBe(null);
  });
});
describe("Reproducible differential validation", () => {
  it("1,000 seeded random paths; independent interval, subset and permutation oracles", () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const s = randomPath(1 + (seed % 12), seed),
        a = solve(s, "path"),
        b = solve(s, "quadratic");
      expect(a.evaluation?.isValid, `seed ${seed}`).toBe(true);
      expect(a.evaluation?.totalReward, `seed ${seed}`).toBe(
        b.evaluation?.totalReward,
      );
      expect(a.evaluation?.totalReward).toBe(
        solve(s, "hk").evaluation?.totalReward,
      );
      if (s.vertices.length <= 7)
        expect(a.evaluation?.totalReward).toBe(
          solve(s, "brute").evaluation?.totalReward,
        );
    }
  });
  it("250 seeded general graphs including disconnected/zero-cost cases", () => {
    for (let seed = 1; seed <= 250; seed++) {
      const s = randomGeneral(2 + (seed % 6), seed);
      const a = solve(s, "hk"),
        b = solve(s, "brute");
      expect(a.evaluation?.isValid).toBe(true);
      expect(a.evaluation?.totalReward, `seed ${seed}`).toBe(
        b.evaluation?.totalReward,
      );
    }
  });
  it("deterministic replay independent of runtime measurements", () => {
    const s = general(),
      a = solve(s, "hk"),
      b = solve(s, "hk");
    expect(a.walk).toEqual(b.walk);
    expect(a.metrics.transitionsChecked).toBe(b.metrics.transitionsChecked);
  });
});

it("model-time events preserve zero-cost arrivals and one-time reward", () => {
  const s = trap();
  s.edges[0].cost = 0;
  const w = { vertexIds: ["S", "A", "S"], edgeIds: ["e0", "e0"] };
  const es = playbackEvents(s, w);
  expect(es.filter((e) => e.type === "collect")).toHaveLength(2);
  expect(
    es.filter((e) => e.type === "traverse-edge").map((e) => e.values?.arrive),
  ).toEqual([0, 0]);
});

it("the default Rift links both bases by three separate lanes and two river objectives", () => {
  const rift = general();
  const isEdge = (a: string, b: string) => rift.edges.some(
    ({ u, v }) => (u === a && v === b) || (u === b && v === a),
  );
  for (const lane of [
    ["s", "t1", "t2", "t3", "r"],
    ["s", "m1", "m2", "m3", "r"],
    ["s", "b1", "b2", "b3", "r"],
  ]) {
    expect(lane.slice(1).every((id, index) => isEdge(lane[index], id))).toBe(true);
  }
  for (const pit of ["n", "d"]) {
    expect(isEdge("m2", pit)).toBe(true);
  }
  expect(solve(rift, "hk").evaluation?.isValid).toBe(true);
});

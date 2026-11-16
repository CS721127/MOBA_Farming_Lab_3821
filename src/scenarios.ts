import type { Scenario, Edge } from "./engine";
const edges = (tuples: [string, string, number][]): Edge[] =>
  tuples.map(([u, v, cost], i) => ({ id: "e" + i, u, v, cost }));
export function lane(which: "top" | "mid" | "bot" = "mid"): Scenario {
 const points=which==="top"?[[110,490],[110,315],[150,130],[330,110],[510,110],[690,110],[780,180]]:which==="bot"?[[110,490],[290,510],[470,510],[650,510],[780,420],[780,280],[780,180]]:Array.from({length:7},(_,i)=>[110+i*110,490-i*52]);
  return {
    id: which==="mid"?"lane":"lane-"+which,
    title: "Isolated "+which+" lane",
    topology: "PATH",
    startId: "v4",
    budget: 10,
    explanation:
      `Only the ${which} lane is traversable. Off-lane links are absent from this path input.`,
    vertices: [5, 2, 6, 1, 7, 4, 8].map((reward, i) => ({
      id: "v" + (i + 1),
      label: [
        "West shrine",
        "Watchpost",
        "Rune hollow",
        "Waystone",
        "Moon well",
        "Sentinel",
        "East shrine",
      ][i],
      reward,
      x: points[i][0],
      y: points[i][1],
      kind: i === 3 ? "base" : "lane",
    })),
    edges: edges(
      [2, 1, 3, 2, 1, 2].map((c, i) => ["v" + (i + 1), "v" + (i + 2), c]),
    ),
  };
}
export function trap(M = 10): Scenario {
  return {
    id: "trap",
    title: "The gilded detour",
    topology: "PATH",
    startId: "S",
    budget: M,
    explanation:
      "Both local rules choose the nearby 2-point camp. The direct route to the far shrine earns M. These two heuristics have no bounded approximation guarantee.",
    vertices: [
      {
        id: "A",
        label: "Tempting camp",
        reward: 2,
        x: 200,
        y: 300,
        kind: "jungle",
      },
      { id: "S", label: "Origin", reward: 0, x: 420, y: 400, kind: "base" },
      {
        id: "B",
        label: "Far shrine",
        reward: M,
        x: 690,
        y: 210,
        kind: "resource",
      },
    ],
    edges: edges([
      ["A", "S", 1],
      ["S", "B", M],
    ]),
  };
}
export function branch(): Scenario {
  return {
    id: "branch",
    title: "Crossroads of choice",
    topology: "GENERAL",
    startId: "s",
    budget: 4,
    explanation:
      "s → a → c → b earns 15 in 4 time. The extra s–b edge makes the input a cycle, even when the chosen walk looks like a path.",
    vertices: [
      { id: "s", label: "Origin", reward: 0, x: 190, y: 420, kind: "base" },
      {
        id: "a",
        label: "Moon camp",
        reward: 4,
        x: 300,
        y: 180,
        kind: "jungle",
      },
      { id: "b", label: "Sun camp", reward: 6, x: 620, y: 420, kind: "jungle" },
      {
        id: "c",
        label: "Crystal heart",
        reward: 5,
        x: 650,
        y: 180,
        kind: "resource",
      },
    ],
    edges: edges([
      ["s", "a", 2],
      ["s", "b", 3],
      ["a", "c", 1],
      ["b", "c", 1],
    ]),
  };
}
export function general(): Scenario {
  const sites: [string, string, number, number, number, string][] = [
    ["s", "Blue base", 0, 104, 510, "base"],
    ["r", "Red base", 0, 796, 102, "base"],
    ["t1", "Blue top", 4, 102, 310, "lane"],
    ["t2", "Top bend", 7, 115, 112, "lane"],
    ["t3", "Red top", 5, 480, 88, "lane"],
    ["m1", "Blue mid", 4, 278, 406, "lane"],
    ["m2", "Mid crossing", 0, 450, 306, "lane"],
    ["m3", "Red mid", 5, 622, 204, "lane"],
    ["b1", "Blue bot", 4, 420, 524, "lane"],
    ["b2", "Bot bend", 7, 784, 501, "lane"],
    ["b3", "Red bot", 5, 798, 302, "lane"],
    ["j1", "Blue wolves", 6, 224, 240, "jungle"],
    ["j2", "Blue raptors", 8, 363, 461, "jungle"],
    ["j3", "Red raptors", 8, 537, 149, "jungle"],
    ["j4", "Red wolves", 6, 678, 370, "jungle"],
    ["n", "Baron pit", 12, 323, 214, "baron"],
    ["d", "Dragon pit", 10, 577, 409, "dragon"],
  ];
  return {
    id: "general",
    title: "The Verdant Rift",
    topology: "GENERAL",
    startId: "s",
    budget: 20,
    seed: 3821,
    explanation: "Farm the top, mid and bot lanes, cross the river, or detour through either jungle.",
    vertices: sites.map(([id, label, reward, x, y, kind]) => ({
      id, label, reward, x, y, kind,
    })),
    edges: edges([
      ["s", "t1", 3], ["t1", "t2", 3], ["t2", "t3", 5], ["t3", "r", 5],
      ["s", "m1", 3], ["m1", "m2", 3], ["m2", "m3", 3], ["m3", "r", 3],
      ["s", "b1", 5], ["b1", "b2", 5], ["b2", "b3", 3], ["b3", "r", 3],
      ["t1", "j1", 2], ["j1", "m1", 3], ["j1", "n", 2],
      ["m1", "j2", 2], ["j2", "b1", 2], ["j2", "d", 3],
      ["t3", "j3", 2], ["j3", "m3", 2], ["j3", "n", 3],
      ["m3", "j4", 3], ["j4", "b3", 2], ["j4", "d", 2],
      ["n", "m2", 3], ["m2", "d", 3],
    ]),
  };
}
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randomPath(n: number, seed: number): Scenario {
  const r = rng(seed);
  return {
    id: "seed-" + seed,
    title: `Seeded lane · ${seed}`,
    topology: "PATH",
    startId: "v" + Math.floor(r() * n),
    budget: Math.floor(r() * n * 4),
    seed,
    explanation:
      "Seeded integer instance, including zero rewards and zero-cost edges.",
    vertices: Array.from({ length: n }, (_, i) => ({
      id: "v" + i,
      label: "Node " + i,
      reward: Math.floor(r() * 10),
      x: 85 + (i * 690) / Math.max(1, n - 1),
      y: 300 + Math.sin(i * 0.7) * 90,
      kind: "lane",
    })),
    edges: edges(
      Array.from({ length: n - 1 }, (_, i) => [
        "v" + i,
        "v" + (i + 1),
        Math.floor(r() * 5),
      ]),
    ),
  };
}
export function randomGeneral(n: number, seed: number): Scenario {
  const s = randomPath(n, seed),
    r = rng(seed + 123);
  s.topology = "GENERAL";
  s.edges = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (r() < 0.4)
        s.edges.push({
          id: `e${i}-${j}`,
          u: "v" + i,
          v: "v" + j,
          cost: Math.floor(r() * 5),
        });
  return s;
}
export function proof(star = false): Scenario {
  const n = 4;
  return {
    id: "proof",
    title: "Complexity proof playground",
    topology: "GENERAL",
    startId: "s",
    budget: n,
    explanation:
      "Corrected reduction: new start s, unit costs, r(s)=0, four unit rewards, T=K=4. A score of 4 is a Hamiltonian-path witness in the original graph.",
    vertices: [
      {
        id: "s",
        label: "Added start",
        reward: 0,
        x: 140,
        y: 300,
        kind: "base",
      },
      ...Array.from({ length: n }, (_, i) => ({
        id: "v" + i,
        label: "H vertex " + (i + 1),
        reward: 1,
        x: 370 + Math.cos((i * Math.PI) / 2) * 190,
        y: 300 + Math.sin((i * Math.PI) / 2) * 190,
        kind: "resource",
      })),
    ],
    edges: edges([
      ...Array.from(
        { length: n },
        (_, i) => ["s", "v" + i, 1] as [string, string, number],
      ),
      ...((star
        ? [
            ["v0", "v1", 1],
            ["v0", "v2", 1],
            ["v0", "v3", 1],
          ]
        : [
            ["v0", "v1", 1],
            ["v1", "v2", 1],
            ["v2", "v3", 1],
          ]) as [string, string, number][]),
    ]),
  };
}
/** User-facing generator: seeded geometry, topology and optional connectivity. */
export function generateMap(n:number,seed:number,topology:'PATH'|'GENERAL',density=.25,connected=true):Scenario{
 n=Math.max(1,Math.min(100,Math.floor(n)));const s=randomPath(n,seed);if(topology==='PATH'){if(n>18){const cols=Math.ceil(Math.sqrt(n*1.45)),rows=Math.ceil(n/cols);s.vertices=s.vertices.map((v,i)=>{const row=Math.floor(i/cols),col=row%2?cols-1-i%cols:i%cols;return {...v,x:65+col*770/Math.max(1,cols-1),y:70+row*460/Math.max(1,rows-1)};});}return s;}
 const r=rng(seed+971);s.id='seed-general-'+seed;s.title='Generated graph';s.topology='GENERAL';const cols=Math.ceil(Math.sqrt(n*1.45)),rows=Math.ceil(n/cols);s.vertices=s.vertices.map((v,i)=>({...v,x:65+(i%cols+.2*(r()-.5))*770/Math.max(1,cols-1),y:70+(Math.floor(i/cols)+.2*(r()-.5))*460/Math.max(1,rows-1)}));s.edges=[];
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if((connected&&j===i+1)||r()<density)s.edges.push({id:`g${i}-${j}`,u:s.vertices[i].id,v:s.vertices[j].id,cost:Math.floor(r()*5)});
 s.explanation='Seeded general graph. Weights and rewards are independent of drawn distance.';return s;
}

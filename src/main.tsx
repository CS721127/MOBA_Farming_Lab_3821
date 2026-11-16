import { Theory, LaneRestriction } from "./Theory";
import { GraphEditor } from "./GraphEditor";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ArrowUpRight,
  Compass,
  FlaskConical,
  BookOpen,
  Swords,
  ChevronRight,
  Download,
  Check,
  Settings2,
  X,
} from "lucide-react";
import { GraphViewport as World } from "./GraphViewport";
import {
  names,
  complexities,
  playbackEvents,
  evaluateWalk,
  manualMove,
  pathOrder,
  prefix,
  solve,
  type Scenario,
  type Strategy,
  type Result,
  type Walk,
} from "./engine";
import { general, lane, trap, branch, randomPath, generateMap } from "./scenarios";
import "./style.css";
import "./rift.css";
const ids: Strategy[] = ["manual", "nearest", "ratio", "hk", "path"];
const descriptions: Record<Strategy, string> = {
  manual: "Choose the next adjacent resource. Every decision is yours.",
  nearest:
    "Choose the closest feasible uncollected reward. Local choices can miss a richer route.",
  ratio:
    "Choose the highest direct reward per additional travel time. Free positive rewards come first.",
  hk: "Explore subsets and last stops on the metric closure. Reconstruct the exact optimum on original edges.",
  path: "Sweep the two endpoints of a contiguous interval. Visit its nearer extreme first, then cross to the farther one.",
  quadratic:
    "Enumerate every interval containing the start. Independent exact path baseline.",
  brute:
    "Enumerate all ordered subsets of positive-reward targets. Independent tiny-instance oracle.",
};
function App() {
  const [s, setS] = useState<Scenario>(general),
    [tab, setTab] = useState("lab"),
    [theoryChapter,setTheoryChapter]=useState(0),
    [drawing,setDrawing]=useState(false),
    [generationBudget, setGenerationBudget] = useState<string | null>(null),
    [generationType,setGenerationType]=useState<"PATH"|"GENERAL">("GENERAL"),
    [density,setDensity]=useState(.25),
    [connected,setConnected]=useState(true),
    [strategy, setStrategy] = useState<Strategy>("hk"),
    [results, setResults] = useState<Result[]>([]),
    [busy, setBusy] = useState(true),
    [hero, setHero] = useState(0),
    [walk, setWalk] = useState<Walk>({ vertexIds: [s.startId], edgeIds: [] }),
    [step, setStep] = useState(0),
    [progress, setProgress] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [message, setMessage] = useState(
      "Choose a strategy, then begin your expedition.",
    ),
    [selected, setSelected] = useState<string | null>(null),
    [compare, setCompare] = useState(false),
    [rival, setRival] = useState<Strategy>("nearest"),
    [traceIndex, setTraceIndex] = useState(0),
    [tracePlaying, setTracePlaying] = useState(false),
    [help, setHelp] = useState(false),
    [benchmark, setBenchmark] = useState<any[]>([]),
    [benchBusy, setBenchBusy] = useState(false),
    [seed, setSeed] = useState(3821),
    [count, setCount] = useState(12),
    [editor, setEditor] = useState(false),
    [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);
  const resultCache = useRef(new Map<string, Result[]>());
  const order = useMemo(() => pathOrder(s), [s]);
  const result = results.find((r) => r.strategy === strategy);
  const exact =
    results.find((r) => r.strategy === "hk" && r.status === "ok") ||
    results.find((r) => r.strategy === "path" && r.status === "ok");
  const ev = evaluateWalk(s, prefix(walk, step));
  const end = evaluateWalk(s, walk);
  const opt = exact?.evaluation?.totalReward;
  const ratio = (v: number) =>
    opt === undefined
      ? "not computed"
      : opt === 0
        ? "N/A"
        : ((v / opt) * 100).toFixed(0) + "%";
  const reset = () => {
    setPlaying(false);
    setStep(0);
    setProgress(0);
    setTraceIndex(0);
    setTracePlaying(false);
  };
  useEffect(() => {
    reset();
    setWalk({ vertexIds: [s.startId], edgeIds: [] });
    setBusy(true);
    setResults([]);
    setSelected(null);
    worker.current?.terminate();
    const signature = JSON.stringify(s);
    const cached = resultCache.current.get(signature);
    if (cached) {
      setResults(cached);
      setBusy(false);
      return;
    }
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      if (e.data.results) {
        setResults(e.data.results);
        if (resultCache.current.size > 30) resultCache.current.clear();
        resultCache.current.set(signature, e.data.results);
        setBusy(false);
      }
    };
    w.onerror = () => {
      setBusy(false);
      setMessage("Calculation failed. Reload this scenario to retry.");
    };
    w.postMessage({ scenario: s });
    return () => w.terminate();
  }, [s]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = 0;
    let p = progress;
    const tick = (time: number) => {
      if (!last) last = time;
      const dt = Math.min(100, time - last);
      last = time;
      const edge = s.edges.find((e) => e.id === walk.edgeIds[step]);
      if (!edge) {
        setPlaying(false);
        return;
      }
      p += (dt * speed) / Math.max(350, edge.cost * 420);
      if (p >= 1) {
        setStep((v) => v + 1);
        setProgress(0);
        if (step + 1 >= walk.edgeIds.length) setPlaying(false);
        return;
      }
      setProgress(p);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, step, speed, walk, s]);
  useEffect(() => {
    if (!tracePlaying) return;
    const t = setInterval(
      () =>
        setTraceIndex((i) => {
          if (i >= (result?.trace.length || 1) - 1) {
            setTracePlaying(false);
            return i;
          }
          return i + 1;
        }),
      650 / speed,
    );
    return () => clearInterval(t);
  }, [tracePlaying, result, speed]);
  const load = (next: Scenario) => {
    reset();
    setResults([]);
    setBusy(true);
    setWalk({ vertexIds: [next.startId], edgeIds: [] });
    setSelected(null);
    setS(next);
    setMessage(next.explanation);
    if (!pathOrder(next) && strategy === "path") setStrategy("hk");
  };
  const choose = (id: Strategy) => {
    setStrategy(id);
    reset();
    setWalk({ vertexIds: [s.startId], edgeIds: [] });
    setMessage(descriptions[id]);
  };
  const run = () => {
    if (strategy === "manual") {
      setMessage(
        "Click an adjacent node to move. Select Finish to replay your route.",
      );
      return;
    }
    if (result?.status === "ok") {
      reset();
      setWalk(result.walk!);
      setPlaying(true);
      setMessage(`${names[strategy]}: following the computed route. Gold marks travel; rewards are collected once.`);
    }
  };
  const clickNode = (id: string) => {
    setSelected(id);
    if (strategy !== "manual") return;
    if (playing || step < walk.edgeIds.length) {
      setMessage(
        "Finish the current playback before choosing the next manual move.",
      );
      return;
    }
    const next = manualMove(s, walk, id);
    if (!next) {
      setMessage(
        "Choose an adjacent node within your remaining travel budget.",
      );
      return;
    }
    setWalk(next);
    setPlaying(true);
    setMessage("Move accepted. Reward is collected on arrival, once only.");
  };
  const replay = (r: Result) => {
    if (r.status !== "ok") return;
    setStrategy(r.strategy);
    reset();
    setWalk(r.walk!);
    setPlaying(true);
  };
  const advance = () => {
    setPlaying(false);
    setProgress(0);
    if (step < walk.edgeIds.length) setStep(step + 1);
    else if (walk.edgeIds.length === 0 && result?.walk) {
      setWalk(result.walk);
      setStep(Math.min(1, result.walk.edgeIds.length));
    }
  };
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            scenario: s,
            results,
            manual:
              strategy === "manual" ? { walk, evaluation: end } : undefined,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "moba-experiment.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const bench = () => {
    setBenchBusy(true);
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    w.onmessage = (e) => {
      setBenchmark(e.data.benchmark);
      setBenchBusy(false);
      w.terminate();
    };
    w.postMessage({ benchmark: true });
  };
  const trace = result?.trace[traceIndex];
  const highlight =
    trace?.values && "L" in trace.values && order
      ? order.slice(Number(trace.values.L), Number(trace.values.R) + 1)
      : result?.interval && order
        ? order.slice(result.interval.left, result.interval.right + 1)
        : undefined;
  const rivalResult = results.find((r) => r.strategy === rival);
  const selectedV = s.vertices.find((v) => v.id === selected);
  return (
    <div className="app">
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("lab");
          }}
        >
          <span className="brandmark">
            <Compass size={25} />
          </span>
          <div>
            MOBA Farming Lab
          </div>
        </a>
        <nav>
          {[
            ["lab", "Map", <Compass size={16} />],
            ["theory", "Theory", <BookOpen size={16} />],
          ].map(([id, label, icon]) => (
            <button
              key={String(id)}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(String(id))}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>
        <button className="help" onClick={() => setHelp(true)}>
          How to play
        </button>
      </header>
      <main>
        {tab === "theory" ? (
          <Theory initialChapter={theoryChapter} />
        ) : (
          <>
            <div className="workspace-tools">
              <label>Graph type<select aria-label="Generator topology" value={generationType} onChange={e=>setGenerationType(e.target.value as "PATH"|"GENERAL")}><option value="GENERAL">General graph</option><option value="PATH">Path</option></select></label>
              <label>Nodes<input aria-label="Generated node count" type="number" min="1" max="100" value={count} onChange={e=>setCount(Math.max(1,Math.min(100,+e.target.value)))}/></label>
              <label>Seed<input aria-label="Map seed" type="number" value={seed} onChange={e=>setSeed(+e.target.value)}/></label>
              {generationType==='GENERAL'&&<><label>Density<input aria-label="Graph density" type="range" min="0" max="1" step=".05" value={density} onChange={e=>setDensity(+e.target.value)}/><output>{Math.round(density*100)}%</output></label><label className="inline-check"><input type="checkbox" checked={connected} onChange={e=>setConnected(e.target.checked)}/>Connected</label></>}
              <label>Travel budget
                <input
                  aria-label="Generated travel budget"
                  type="number"
                  min="0"
                  max="10000"
                  value={generationBudget ?? s.budget}
                  onChange={(event) => setGenerationBudget(event.target.value)}
                />
              </label>
              <button
                className="secondary"
                onClick={() => {
                  const generated = generateMap(count, seed, generationType, density, connected);
                  const requestedBudget = generationBudget?.trim() ? Number(generationBudget) : s.budget;
                  const budget = Number.isFinite(requestedBudget)
                    ? Math.max(0, Math.min(10000, requestedBudget))
                    : s.budget;
                  load({ ...generated, budget });
                  setGenerationBudget(null);
                  setDrawing(false);
                  setStrategy(generationType === "PATH" ? "path" : count > 15 ? "nearest" : "hk");
                }}
              >Generate</button>
              <button className={drawing?'primary':'secondary'} onClick={()=>{setPlaying(false);setDrawing(!drawing);}}>{drawing?'Back to map':'Draw graph'}</button>
              <button className="secondary" onClick={()=>{document.getElementById('experiments')?.scrollIntoView();}}>Experiments</button>
            </div>
            {drawing ? <GraphEditor initial={s} onCancel={()=>setDrawing(false)} onApply={next=>{load(next);setDrawing(false);setStrategy(pathOrder(next)?'path':'hk');setMessage('Graph validated. Choose a strategy and run.');}} /> : <>
            <div className="scenario-bar">
              <div className="segmented">
                <button
                  className={!order ? "chosen" : ""}
                  onClick={() => load(general())}
                >
                  General map
                </button>
                <button
                  className={order ? "chosen" : ""}
                  onClick={() => load(lane())}
                >
                  Single lane
                </button>
              </div>
              <label className="preset-label">
                Scenario
                <select
                  aria-label="Scenario"
                  value={
                    ["general", "lane", "lane-top", "lane-bot", "trap", "branch"].includes(
                      s.id,
                    )
                      ? s.id
                      : "seed"
                  }
                  onChange={(e) =>
                    load(
                      (
                        { general, lane, "lane-top":()=>lane("top"), "lane-bot":()=>lane("bot"), trap, branch } as Record<
                          string,
                          () => Scenario
                        >
                      )[e.target.value](),
                    )
                  }
                >
                  <option value="general">The Verdant Rift</option>
                  <option value="lane">Mid lane</option><option value="lane-top">Top lane</option><option value="lane-bot">Bot lane</option>
                  <option value="trap">The gilded detour</option>
                  <option value="branch">Crossroads of choice</option>
                  {!["general","lane","lane-top","lane-bot","trap","branch"].includes(s.id) && (
                    <option value="seed">{s.title}</option>
                  )}
                </select>
              </label>
              <label className="budget-label">
                Travel budget{" "}
                <input
                  aria-label="Travel budget"
                  type="range"
                  min="0"
                  max={Math.max(40, s.budget, s.id === "trap" ? 50 : 0)}
                  value={s.budget}
                  onChange={(e) => load({ ...s, budget: +e.target.value })}
                />
                <input
                  className="numeric"
                  aria-label="Travel budget numeric"
                  type="number"
                  min="0"
                  max="10000"
                  value={s.budget}
                  onChange={(e) =>
                    load({
                      ...s,
                      budget: Math.max(0, Math.min(10000, +e.target.value)),
                    })
                  }
                />
                <span>units</span>
              </label>
              <button
                className="iconbtn"
                title="Reset expedition"
                onClick={() => {
                  reset();
                  setWalk({ vertexIds: [s.startId], edgeIds: [] });
                }}
              >
                <RotateCcw size={17} />
              </button>
            </div>
            {s.id.startsWith("lane")&&<LaneRestriction value={s.id==="lane-top"?"top":s.id==="lane-bot"?"bot":"mid"} onChange={which=>{load({...lane(which),budget:s.budget});setStrategy("path");}}/>}
            <div className="arena">
              <section className="map-panel">
                <div className="map-top">
                  <div>
                    <span className="map-status">LIVE REALM</span>
                    <h2>{s.title}</h2>
                  </div>
                  <div className="topology-badge">
                    {order ? "PATH GRAPH" : "GENERAL GRAPH"}
                    <small>
                      {s.vertices.length} nodes · {s.edges.length} links
                    </small>
                  </div>
                </div>
                <div className="map-wrap">
                  <World key={s.id+":"+s.vertices.length}
                    s={s}
                    walk={walk}
                    step={step}
                    progress={progress}
                    hero={hero}
                    onNode={clickNode}
                    interval={result?.interval}
                    traceInterval={trace?.values?.target ? [String(trace.values.target)] : highlight}
                    ghost={compare ? rivalResult?.walk : undefined}
                  />
                  <div className="map-legend">
                    <span>
                      <i className="gold" /> Your route
                    </span>
                    {compare && (
                      <span>
                        <i className="purple" /> {names[rival]}
                      </span>
                    )}
                    <span>◇ Uncollected reward</span>
                  </div>
                  <div className="hero-picker">
                    <span>Hero</span>
                    <button
                      className={hero === 0 ? "chosen" : ""}
                      onClick={() => setHero(0)}
                    >
                      ♧ Sylva
                    </button>
                    <button
                      className={hero === 1 ? "chosen" : ""}
                      onClick={() => setHero(1)}
                    >
                      ⚔ Auren
                    </button>
                  </div>
                </div>
                <div className="hud">
                  <div>
                    <small>Score</small>
                    <strong className="gold-text" data-testid="score">
                      {ev.totalReward}
                      <span>
                        {" "}
                        / {s.vertices.reduce((a, v) => a + v.reward, 0)}
                      </span>
                    </strong>
                  </div>
                  <div className="time-hud">
                    <small>Travel used</small>
                    <strong data-testid="cost">
                      {ev.travelCost}
                      <span> / {s.budget}</span>
                    </strong>
                    <div className="meter">
                      <i
                        style={{
                          width: `${s.budget ? Math.min(100, (ev.travelCost / s.budget) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <small>Visited</small>
                    <strong>
                      {ev.visitedIds.length}
                      <span> / {s.vertices.length}</span>
                    </strong>
                  </div>
                  <div>
                    <small>Of optimum</small>
                    <strong>{ratio(ev.totalReward)}</strong>
                  </div>
                </div>
                <div className="map-footer">
                  <span className="dot" />
                  <span aria-live="polite">
                    {selectedV
                      ? `${selectedV.label} · reward ${selectedV.reward} · ${ev.visitedIds.includes(selectedV.id) ? "collected" : "uncollected"}. `
                      : ""}
                    {message}
                  </span>
                </div>
                <details className="node-access">
                  <summary>Resource details & keyboard movement</summary>
                  <div>
                    {s.vertices.map((v) => (
                      <button key={v.id} onClick={() => clickNode(v.id)}>
                        {v.label} <b>+{v.reward}</b>
                      </button>
                    ))}
                  </div>
                </details>
              </section>
              <aside className="strategy-panel">
                <div className="panel-heading">
                  <span className="eyebrow">PLAN YOUR EXPEDITION</span>
                  <Swords size={18} />
                </div>
                <h2>Choose a strategy</h2>
                <div className="strategies">
                  {ids.map((id, i) => {
                    const unsupported =
                      (id === "path" && !order) ||
                      results.find((r) => r.strategy === id)?.status ===
                        "too-large";
                    return (
                      <button
                        key={id}
                        aria-label={names[id]}
                        className={`strategy ${strategy === id ? "selected" : ""}`}
                        disabled={unsupported}
                        title={
                          unsupported
                            ? results.find((r) => r.strategy === id)?.reason ||
                              "Requires a connected path input"
                            : descriptions[id]
                        }
                        onClick={() => choose(id)}
                      >
                        <span className="strategy-number">0{i + 1}</span>
                        <div>
                          <strong>{names[id]}</strong>
                          <small>{id==='nearest'?'Take the closest feasible reward':id==='ratio'?'Maximise reward ÷ travel time':id==='hk'?'Exact · compare subsets and visit orders':id==='path'?'Exact · find the best reachable lane interval':'Choose each adjacent move yourself'}</small>
                        </div>
                        <span className="radio">
                          {strategy === id && <i />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!order && (
                  <p className="disabled-note">
                    Path solver requires an isolated lane without branches or
                    cycles.
                  </p>
                )}
                {result?.reason && <p className="disabled-note">{result.reason}</p>}<div className="method-explanation"><p>{descriptions[strategy]}</p><button onClick={()=>{setTheoryChapter(strategy==='hk'?3:strategy==='path'?4:0);setTab('theory');}}>{strategy==='hk'?'Paper §3 · exact subset DP':strategy==='path'?'Paper §4 · linear path algorithm':strategy==='nearest'||strategy==='ratio'?'Demo baseline · paper §1 model':'Paper §1 · walk model'}</button></div>
                <button
                  className="primary run"
                  onClick={run}
                  disabled={
                    busy || (strategy !== "manual" && result?.status !== "ok")
                  }
                >
                  <Play size={17} fill="currentColor" />
                  {busy
                    ? "Computing routes…"
                    : strategy === "manual"
                      ? "Play manually"
                      : "Run"}
                </button>
                <div className="playback">
                  <button
                    aria-label={playing ? "Pause" : "Resume"}
                    title={playing ? "Pause" : "Resume"}
                    onClick={() => setPlaying(!playing)}
                    disabled={!walk.edgeIds.length}
                  >
                    {playing ? <Pause size={17} /> : <Play size={17} />}
                  </button>
                  <button
                    aria-label="Step one edge"
                    title="Step one edge"
                    onClick={advance}
                  >
                    <SkipForward size={17} />
                  </button>
                  <button
                    aria-label="Replay from start"
                    title="Replay from start"
                    onClick={() => {
                      reset();
                      setPlaying(walk.edgeIds.length > 0);
                    }}
                  >
                    <RotateCcw size={16} />
                  </button>
                  <select
                    aria-label="Playback speed"
                    value={speed}
                    onChange={(e) => setSpeed(+e.target.value)}
                  >
                    {[0.5, 1, 2, 4].map((v) => (
                      <option key={v} value={v}>
                        {v}×
                      </option>
                    ))}
                  </select>
                  <span>
                    {step}/{walk.edgeIds.length} edges
                  </span>
                </div>
                {strategy === "manual" && (
                  <button
                    className="secondary full"
                    onClick={() => {
                      reset();
                      setPlaying(walk.edgeIds.length > 0);
                    }}
                  >
                    Finish & replay manual route
                  </button>
                )}
                <div className="travel-narration" aria-live="polite"><strong>{playing?'Travelling':step>0?'Route progress':'Ready'}</strong><p>{walk.edgeIds.length>step ? `${walk.vertexIds[step]} → ${walk.vertexIds[step+1]} · edge cost ${s.edges.find(e=>e.id===walk.edgeIds[step])?.cost ?? 0}. ${walk.vertexIds.slice(0,step+1).includes(walk.vertexIds[step+1])?'Revisit: no new reward.':`Arrival reward: ${s.vertices.find(v=>v.id===walk.vertexIds[step+1])?.reward ?? 0}.`}` : 'Run to replay the route, or step one edge at a time.'}</p></div><div className="route-outcome">
                  <div>
                    <small>Route reward</small>
                    <b>
                      {strategy === "manual"
                        ? end.totalReward
                        : (result?.evaluation?.totalReward ?? "—")}
                    </b>
                  </div>
                  <div>
                    <small>Route cost</small>
                    <b>
                      {strategy === "manual"
                        ? end.travelCost
                        : (result?.evaluation?.travelCost ?? "—")}{" "}
                      <em>/ {s.budget}</em>
                    </b>
                  </div>
                </div>
                <label className="compare-toggle">
                  <input
                    type="checkbox"
                    checked={compare}
                    onChange={(e) => setCompare(e.target.checked)}
                  />
                  Compare on the same map <span>⇄</span>
                </label>
                {compare && (
                  <select
                    className="full rival"
                    aria-label="Comparison strategy"
                    value={rival}
                    onChange={(e) => setRival(e.target.value as Strategy)}
                  >
                    {results
                      .filter((r) => r.status === "ok")
                      .map((r) => (
                        <option key={r.strategy} value={r.strategy}>
                          {names[r.strategy]}
                        </option>
                      ))}
                  </select>
                )}
                <div className="model-note">
                  <Check size={13} />
                  <span>
                    One-time rewards · Free endpoint
                    <br />
                    No combat or collection time
                  </span>
                </div>
              </aside>
            </div>
            {compare && rivalResult?.walk && (
              <section className="mirrored">
                <div>
                  <span className="eyebrow">IDENTICAL FROZEN SCENARIO</span>
                  <h2>
                    {names[strategy]} <span>vs</span> {names[rival]}
                  </h2>
                  <p>
                    Solid gold is the selected route. The dashed pink overlay is
                    the comparison route. Both panels use the same graph,
                    weights, start and budget; each step is an original edge.
                  </p>
                </div>
                <div className="mini-map">
                  <World key={s.id+":"+s.vertices.length}
                    s={s}
                    walk={rivalResult.walk}
                    step={Math.min(step, rivalResult.walk.edgeIds.length)}
                    progress={
                      step < rivalResult.walk.edgeIds.length ? progress : 0
                    }
                    hero={hero === 0 ? 1 : 0}
                    mini
                  />
                  <div>
                    {names[rival]} · {rivalResult.evaluation?.totalReward}{" "}
                    reward · {rivalResult.evaluation?.travelCost} time{" "}
                    <button onClick={() => replay(rivalResult)}>
                      Replay this route ↗
                    </button>
                  </div>
                </div>
              </section>
            )}
            <section className="comparison">
              <div className="section-head">
                <div>
                  <span className="eyebrow">
                    THE SAME WORLD. DIFFERENT DECISIONS.
                  </span>
                  <h2>Results</h2>
                </div>
                <button className="text-btn" onClick={download}>
                  <Download size={14} />
                  Export experiment
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Reward</th>
                      <th>Travel used</th>
                      <th>Of optimum</th>
                      <th>States / checks</th>
                      <th>Compute time</th>
                      <th>Replay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...(strategy === "manual"
                        ? [
                            {
                              strategy: "manual",
                              status: "ok",
                              walk,
                              evaluation: end,
                              metrics: {
                                computeMs: 0,
                                transitionsChecked: 0,
                                statesVisited: 0,
                                dijkstraRuns: 0,
                                pointerMoves: 0,
                              },
                              trace: [],
                            } as Result,
                          ]
                        : []),
                      ...results.filter(
                        (r) =>
                          tab === "lab" ||
                          !["quadratic", "brute"].includes(r.strategy),
                      ),
                    ].map((r) => (
                      <tr
                        key={r.strategy}
                        className={r.strategy === strategy ? "current" : ""}
                      >
                        <td>
                          <span className="table-dot" />
                          {names[r.strategy]}
                          <small>{complexities[r.strategy]}</small>
                        </td>
                        {r.status === "ok" ? (
                          <>
                            <td className="score-cell">
                              {r.evaluation?.totalReward}
                            </td>
                            <td>
                              {r.evaluation?.travelCost} / {s.budget}
                            </td>
                            <td>
                              <span className="ratio-badge">
                                {ratio(r.evaluation!.totalReward)}
                              </span>
                            </td>
                            <td>
                              {r.metrics.statesVisited.toLocaleString()} /{" "}
                              {r.metrics.transitionsChecked.toLocaleString()}
                              <small>
                                {r.metrics.dijkstraRuns} fresh Dijkstra runs
                                {r.strategy === "path"
                                  ? ` · ${r.metrics.pointerMoves} pointer moves`
                                  : ""}
                              </small>
                            </td>
                            <td>
                              {r.strategy === "manual"
                                ? "—"
                                : r.metrics.computeMs.toFixed(2) + " ms"}
                            </td>
                            <td>
                              <button
                                aria-label={"Replay " + names[r.strategy]}
                                className="replay-btn"
                                onClick={() => replay(r)}
                              >
                                <Play size={14} />
                              </button>
                            </td>
                          </>
                        ) : (
                          <td colSpan={6} className="unavailable">
                            {r.reason}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {busy && (
                  <p className="loading">
                    Solving this immutable scenario in a background worker…
                  </p>
                )}
              </div>
              <p className="footnote">
                Work = feasible states / tested transitions (interval candidates
                for quadratic). Wall-clock time is environment dependent (cached
                results retain their original timing); shortest-path caches are
                shared. Optimality uses an exact solution, never a guessed
                benchmark.
              </p>
            </section>
            <section className="trace-section"><div className="trace-help"><h2>Why this route?</h2><p>Planning decisions are separate from route playback. Step through the solver below; the map highlights path intervals when available.</p></div>
              <div>
                <span className="eyebrow">INSIDE THE ALGORITHM</span>
                <h2>{names[strategy]}</h2>
                <p>{descriptions[strategy]}</p>
                {result?.interval && (
                  <div className="formula">
                    C(L,R) = A + B + min(A,B)
                    <small>
                      Chosen interval [{result.interval.left + 1},{" "}
                      {result.interval.right + 1}] · reward{" "}
                      {result.evaluation?.totalReward} · cost{" "}
                      {result.evaluation?.travelCost}
                    </small>
                  </div>
                )}
                <small className="muted">
                  Actual topology: {order ? "connected path" : "not a path"} · k
                  ={" "}
                  {
                    s.vertices.filter((v) => v.reward > 0 && v.id !== s.startId)
                      .length
                  }{" "}
                  positive targets before reachability filtering.
                </small>
              </div>
              <div className="trace-view">
                <div className="trace-controls">
                  <span>
                    Decision · {traceIndex + 1}/
                    {result?.trace.length || 0}
                  </span>
                  <button
                    aria-label="Play planning decisions" onClick={() => setTracePlaying(!tracePlaying)}
                    disabled={!result}
                  >
                    {tracePlaying ? <Pause size={15} /> : <Play size={15} />} {tracePlaying ? "Pause decisions" : "Play decisions"}
                  </button>
                  <button
                    aria-label="Next decision"
                    onClick={() =>
                      setTraceIndex((i) =>
                        Math.min(i + 1, (result?.trace.length || 1) - 1),
                      )
                    }
                  >
                    <SkipForward size={15} />
                  </button>
                </div>
                <input
                  aria-label="Decision trace"
                  type="range"
                  min="0"
                  max={Math.max(0, (result?.trace.length || 1) - 1)}
                  value={traceIndex}
                  onChange={(e) => {
                    setTracePlaying(false);
                    setTraceIndex(+e.target.value);
                  }}
                />
                <p aria-live="polite">
                  {trace?.message ||
                    (busy ? "Computing planning decisions…" : strategy==="manual" ? "You choose the next feasible edge." : result?.reason || "No planning decisions available.")}
                </p>
                {trace?.values && (
                  <div className="trace-values">
                    {Object.entries(trace.values).map(([k, v]) => (
                      <span key={k}>
                        {k}
                        <b>{v}</b>
                      </span>
                    ))}
                  </div>
                )}
                <details>
                  <summary>Physical route & intentional stops</summary>
                  <p>
                    Physical:{" "}
                    {result?.walk?.vertexIds.join(" → ") ||
                      walk.vertexIds.join(" → ")}
                  </p>
                  <p>
                    Intentional stops:{" "}
                    {result?.selectedTargets?.join(" → ") ||
                      "Interval-based or manual walk"}
                  </p>
                  <p>
                    Transit rewards count even if absent from an intentional
                    stop sequence. DP traces are sampled; work counters are
                    complete.
                  </p>
                  <ol>
                    {playbackEvents(s, result?.walk || walk).map((event, i) => (
                      <li key={i}>
                        {event.message} · t=
                        {event.values?.time ?? event.values?.arrive}
                      </li>
                    ))}
                  </ol>
                </details>
              </div>
            </section>
            </>}
            {tab === "lab" && (
              <section className="experiments" id="experiments" aria-labelledby="experiments-title">
                <h2 id="experiments-title">Experiments</h2>
                <article>

                  <h3>When greedy fails</h3>
                  <p>
Change the distant reward and budget together. See when taking the nearby reward of 2 costs you a better route.
                  </p>
                  <label>
                    Reward / budget M = {s.id==='trap'?s.vertices.find(v=>v.id==='B')!.reward:10}{" "}
                    <input
                      aria-label="Greedy trap M"
                      type="range"
                      min="3"
                      max="50"
                      value={
                        s.id === "trap"
                          ? s.vertices.find((v) => v.id === "B")!.reward
                          : 10
                      }
                      onChange={(e) => {
                        load(trap(+e.target.value));
                        setStrategy("ratio");
                        setRival("hk");
                        setCompare(true);
                      }}
                    />
                  </label>
                  {s.id === "trap" && (
                    <>
                      <div className="bar-chart">
                        {results
                          .filter(
                            (r) =>
                              ["nearest", "ratio", "hk"].includes(r.strategy) &&
                              r.status === "ok",
                          )
                          .map((r) => (
                            <div key={r.strategy}>
                              <span>{names[r.strategy]}</span>
                              <i
                                style={{
                                  width: `${(r.evaluation!.totalReward / Math.max(1, opt || 1)) * 70}%`,
                                }}
                              />
                              <b>{r.evaluation!.totalReward}</b>
                            </div>
                          ))}
                      </div>
                      <p>
                        Measured OPT / nearest ={" "}
                        {(
                          (opt || 0) /
                          (results.find((r) => r.strategy === "nearest")
                            ?.evaluation?.totalReward || 1)
                        ).toFixed(2)}
                        . For the T=M family, the theoretical gap is M/2.
                        Changing the budget independently leaves that family.
                      </p>
                    </>
                  )}
                </article>
                <article id="benchmark" className="wide">
                  <h3>Compare running costs</h3>
                  <p>Measure how solver work grows with graph size. Compare two path solvers and general graph dynamic programming.</p>
                  <button className="secondary" onClick={bench} disabled={benchBusy}>
                    {benchBusy ? "Running benchmark…" : "Run benchmark"}
                  </button>
                  {benchmark.length > 0 && (
                    <>
                      <div className="benchmark-charts">
                        {["path", "hk"].map((group) => {
                          const rows = benchmark.filter((r) =>
                            group === "path" ? r.id !== "hk" : r.id === "hk",
                          );
                          const max = Math.max(
                            ...rows.map((r) => r.transitionsChecked),
                          );
                          return (
                            <div key={group}>
                              <h3>
                                {group === "path"
                                  ? "Path: O(n) vs O(n²)"
                                  : "General DP: O(2ᵏ k²)"}
                              </h3>
                              <svg
                                viewBox="0 0 500 180"
                                role="img"
                                aria-label="Measured transition counts"
                              >
                                <path
                                  d="M40 10 V150 H490"
                                  fill="none"
                                  stroke="#64837a"
                                />
                                {(group === "path"
                                  ? ["path", "quadratic"]
                                  : ["hk"]
                                ).map((id, index) => {
                                  const rr = rows.filter((r) => r.id === id);
                                  return (
                                    <g key={id}>
                                      <polyline
                                        fill="none"
                                        stroke={index ? "#dbb675" : "#8ed2be"}
                                        strokeWidth="3"
                                        strokeDasharray={
                                          index ? "6 4" : undefined
                                        }
                                        points={rr
                                          .map(
                                            (r, i) =>
                                              `${45 + i * 85},${145 - (r.transitionsChecked / max) * 125}`,
                                          )
                                          .join(" ")}
                                      />
                                      {rr.map((r, i) => (
                                        <g key={r.n}>
                                          <circle
                                            cx={45 + i * 85}
                                            cy={
                                              145 -
                                              (r.transitionsChecked / max) * 125
                                            }
                                            r="4"
                                            fill={index ? "#dbb675" : "#8ed2be"}
                                          />
                                          <text
                                            x={45 + i * 85}
                                            y="172"
                                            fill="#9db3ab"
                                            fontSize="11"
                                            textAnchor="middle"
                                          >
                                            {r.n}
                                          </text>
                                        </g>
                                      ))}
                                    </g>
                                  );
                                })}
                                <text
                                  x="45"
                                  y="12"
                                  fill="#9db3ab"
                                  fontSize="10"
                                >
                                  max {max.toLocaleString()} checks
                                </text>
                              </svg>
                              <small>
                                {group === "path"
                                  ? "Solid: two-pointer · Dashed: quadratic · x = n"
                                  : "Solid: actual DP transitions · x = positive-reward target count k"}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                      <details>
                        <summary>Exact measurements</summary>
                        <table>
                          <thead>
                            <tr>
                              <th>Size</th>
                              <th>Algorithm</th>
                              <th>States</th>
                              <th>Checks</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {benchmark.map((r) => (
                              <tr key={r.id + r.n}>
                                <td>{r.n}</td>
                                <td>{names[r.id as Strategy]}</td>
                                <td>{r.statesVisited}</td>
                                <td>{r.transitionsChecked}</td>
                                <td>{r.computeMs.toFixed(3)} ms</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    </>
                  )}
                </article>
                <article>

                  <h3>Edit a scenario</h3>
                  <p>
                    Paste scenario JSON or edit the current graph’s data.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setEditor(!editor)}
                  >
                    <Settings2 size={14} />{" "}
                    {editor ? "Close JSON" : "Edit JSON"}
                  </button>
                  {editor && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        try {
                          const parsed = JSON.parse(
                            new FormData(e.currentTarget).get(
                              "scenario",
                            ) as string,
                          );
                          const r = solve(parsed, "manual");
                          if (r.status !== "ok") throw Error(r.reason);
                          load(parsed);
                          setError("");
                        } catch (err) {
                          setError(String(err));
                        }
                      }}
                    >
                      <textarea
                        aria-label="Scenario JSON"
                        name="scenario"
                        key={s.id}
                        defaultValue={JSON.stringify(s, null, 2)}
                      />
                      <button className="secondary" type="submit">
                        Validate & apply
                      </button>
                      <p role="alert">{error}</p>
                    </form>
                  )}
                </article>
              </section>
            )}
          </>
        )}
        <footer>
          <a href="/main.pdf" target="_blank" rel="noreferrer">
            Research paper
          </a>
        </footer>
      </main>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="How to play"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close iconbtn"
              onClick={() => setHelp(false)}
              aria-label="Close help"
            >
              <X />
            </button>
            <span className="eyebrow">WELCOME, EXPLORER</span>
            <h2>Your first expedition.</h2>
            <ol>
              <li>
                Choose a map and travel budget. Gold numbers are one-time
                rewards; small edge numbers are travel cost.
              </li>
              <li>
                Select Manual and click adjacent camps, or choose an algorithm
                and Run.
              </li>
              <li>
                Pause, step one physical edge, change playback speed or replay.
                These controls never alter model costs.
              </li>
              <li>
                Compare all methods on the exact same scenario. Use the experiments
                to discover a greedy trap and the path theorem.
              </li>
            </ol>
            <p>
              Sylva and Auren are cosmetic characters with identical
              mathematical abilities. Start rewards are immediate; collection
              has no time cost.
            </p>
            <button className="primary" onClick={() => setHelp(false)}>
              Enter the realm <ChevronRight size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

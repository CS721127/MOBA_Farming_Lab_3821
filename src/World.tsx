import { useEffect, useRef } from "react";
import {
  dijkstra,
  evaluateWalk,
  prefix,
  type Scenario,
  type Walk,
  type Result,
} from "./engine";
import { rng } from "./scenarios";
export function World({
  s,
  walk,
  step,
  progress,
  hero,
  onNode,
  interval,
  traceInterval,
  ghost,
  mini = false,
  compact = false,
  inset = 1,
  highlightedNode,
  highlightedEdge,
}: {
  s: Scenario;
  walk: Walk;
  step: number;
  progress: number;
  hero: number;
  onNode?: (id: string) => void;
  interval?: Result["interval"];
  traceInterval?: string[];
  ghost?: Walk;
  mini?: boolean;
  compact?: boolean;
  inset?: number;
  highlightedNode?: string;
  highlightedEdge?: string;
}) {
  const screenPoint = (vertex: Scenario["vertices"][number]) => ({
    ...vertex,
    x: 450 + (vertex.x - 450) * inset,
    y: 310 + (vertex.y - 310) * inset,
  });
  const ref = useRef<HTMLCanvasElement>(null);
  const arrival = useRef({ step: -1, time: 0 });
  if (arrival.current.step !== step)
    arrival.current = { step, time: performance.now() };
  useEffect(() => {
    const canvas = ref.current!;
    const c = canvas.getContext("2d")!;
    let frame = 0;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = 900 * scale;
    canvas.height = 620 * scale;
    c.scale(scale, scale);
    const reachable = dijkstra(s, s.startId).dist;
    const vertices = s.vertices.map(screenPoint);
    const vm = new Map(vertices.map((v) => [v.id, v]));
    const edgeNetwork = new Path2D();
    const highlightedLinks = s.edges.filter((edge) => highlightedEdge
      ? edge.id === highlightedEdge
      : highlightedNode && (edge.u === highlightedNode || edge.v === highlightedNode));
    const highlightedIds = new Set(highlightedLinks.map((edge) => edge.id));
    if (compact) for (const edge of s.edges) {
      const from = vm.get(edge.u)!;
      const to = vm.get(edge.v)!;
      edgeNetwork.moveTo(from.x, from.y);
      edgeNetwork.lineTo(to.x, to.y);
    }
    const collected = new Set(evaluateWalk(s, prefix(walk, step)).visitedIds);
    const random = rng(3821);
    const trees = Array.from({ length: 190 }, () => ({
      x: random() * 880 + 10,
      y: random() * 590 + 10,
      size: 10 + random() * 20,
      t: random(),
    }));
    function line(
      x: number,
      y: number,
      x2: number,
      y2: number,
      width: number,
      color: string,
    ) {
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x2, y2);
      c.lineWidth = width;
      c.strokeStyle = color;
      c.stroke();
    }
    function poly(points: number[][], fill: string, stroke?: string) {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 1;
        c.stroke();
      }
    }
    function circle(x: number, y: number, r: number, color: string) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
    }
    function character(x: number, y: number, time: number, mirror = false) {
      c.save();
      c.translate(x, y - 17);
      const bob = Math.sin(time * 5) * 1.4;
      c.translate(0, bob);
      c.scale(mirror ? 0.85 : 1, mirror ? 0.85 : 1);
      c.globalAlpha = mirror ? 0.65 : 1;
      circle(0, 24, 17, "#0007");
      c.shadowBlur = 15;
      c.shadowColor = hero ? "#ffd582" : "#85e2dd";
      circle(0, 23, 13, hero ? "#edbc3d35" : "#68e8e335");
      c.shadowBlur = 0;
      // Original multi-layer character: flowing cape, boots, armour, face, weapon.
      poly(
        [
          [-9, -10],
          [-20, 21],
          [0, 28],
          [18, 19],
          [9, -10],
        ],
        hero ? "#885434" : "#315c58",
        "#a9cbb566",
      );
      line(-5, 11, -7, 24, 6, "#202d32");
      line(5, 11, 8, 24, 6, "#202d32");
      line(-7, 24, -11, 25, 6, "#a8ae9c");
      line(8, 24, 12, 25, 6, "#a8ae9c");
      poly(
        [
          [-9, -8],
          [9, -8],
          [11, 8],
          [0, 15],
          [-10, 8],
        ],
        hero ? "#d8b77d" : "#789f9b",
        "#e5e7c1",
      );
      poly(
        [
          [-7, -5],
          [0, 3],
          [8, -5],
          [6, 9],
          [-6, 9],
        ],
        hero ? "#7e5835" : "#2f5d5f",
      );
      line(-9, -5, -15, 8, 7, hero ? "#c4a66d" : "#a0b7a7");
      line(9, -5, 15, 7, 7, hero ? "#c4a66d" : "#a0b7a7");
      circle(0, -15, 8, "#d6b997");
      poly(
        [
          [-10, -15],
          [-6, -25],
          [4, -27],
          [10, -16],
          [6, -10],
          [4, -19],
          [-4, -18],
          [-6, -10],
        ],
        hero ? "#d0bd8e" : "#496d66",
        "#bdd5bd",
      );
      line(-4, -14, -1, -14, 1.5, "#112a2c");
      line(3, -14, 5, -14, 1.5, "#112a2c");
      if (hero) {
        poly(
          [
            [14, 5],
            [23, -28],
            [26, -27],
            [18, 8],
          ],
          "#f2deb1",
          "#fff5cc",
        );
        poly(
          [
            [11, 1],
            [24, 4],
            [22, 7],
            [10, 5],
          ],
          "#ce9346",
        );
        poly(
          [
            [-20, -8],
            [-28, -2],
            [-25, 15],
            [-17, 19],
            [-11, 8],
            [-12, -3],
          ],
          "#b9a27a",
          "#f3dfad",
        );
        line(-21, -3, -19, 11, 2, "#ead59d");
      } else {
        line(16, 14, 19, -31, 3, "#a58b56");
        circle(19, -32, 5, "#b1f3e6");
        poly(
          [
            [13, -29],
            [19, -40],
            [25, -29],
            [19, -24],
          ],
          "#72c8bd",
          "#dbffeb",
        );
        poly(
          [
            [-12, -17],
            [-23, -23],
            [-15, -11],
          ],
          "#95b8a1",
        );
      }
      c.restore();
    }
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    function draw(ms: number) {
      const time = reducedMotion.matches ? 0 : ms / 1000;
      const narrow = canvas.clientWidth < 480;
      const mapLabelSize = narrow ? 22 : 13;
      c.clearRect(0, 0, 900, 620);
      const bg = c.createLinearGradient(0, 0, 900, 620);
      bg.addColorStop(0, "#28483e");
      bg.addColorStop(0.5, "#20382e");
      bg.addColorStop(1, "#142c2b");
      c.fillStyle = bg;
      c.fillRect(0, 0, 900, 620);
      // River, banks and animated ripples; decorative world geometry is not connectivity.
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-45, -45);
      c.bezierCurveTo(190, 95, 295, 225, 450, 306);
      c.bezierCurveTo(570, 385, 690, 510, 950, 670);
      c.strokeStyle = "#506e5944";
      c.lineWidth = 95;
      c.stroke();
      c.strokeStyle = "#254e5c";
      c.lineWidth = 72;
      c.stroke();
      c.strokeStyle = "#41787633";
      c.lineWidth = 53;
      c.stroke();
      for (let i = 0; i < 20; i++) {
        const y = i * 37 + ((time * 6) % 37),
          x = (y - 310) * 1.42 + 450;
        line(x - 10, y, x + 10, y - 7, 1, "#8dd9cb20");
      }
      // On small maps, roads are painted underneath the vegetation.
      if (!compact) for (const e of s.edges) {
        const a = vm.get(e.u)!,
          b = vm.get(e.v)!;
        const isLane = [a, b].every((vertex) => vertex.kind === "lane" || vertex.kind === "base");
        const jungleTrail = s.id === "general" && !isLane;
        line(a.x, a.y, b.x, b.y, jungleTrail ? 15 : 29, "#18292077");
        line(a.x, a.y, b.x, b.y, jungleTrail ? 10 : 21, jungleTrail ? "#526355" : "#69735a");
        line(a.x, a.y, b.x, b.y, jungleTrail ? 5 : 15, jungleTrail ? "#728674" : "#818367");
        line(a.x, a.y, b.x, b.y, 1.1, "#e3dbad33");
      }
      for (const t of trees) {
        if (!compact && vertices.some((v) => Math.hypot(t.x - v.x, t.y - v.y) < 51))
          continue;
        let near = false;
        if (!compact) for (const e of s.edges) {
          const a = vm.get(e.u)!,
            b = vm.get(e.v)!,
            dx = b.x - a.x,
            dy = b.y - a.y;
          const q = Math.max(
            0,
            Math.min(
              1,
              ((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy),
            ),
          );
          if (Math.hypot(t.x - a.x - q * dx, t.y - a.y - q * dy) < 26) {
            near = true;
            break;
          }
        }
        if (near) continue;
        c.save();
        c.translate(t.x, t.y);
        circle(3, 7, t.size * 0.7, "#071c1b33");
        if (t.t > 0.82) {
          poly(
            [
              [-9, 6],
              [-7, -5],
              [2, -9],
              [12, 0],
              [8, 8],
            ],
            "#57665a",
            "#84927d44",
          );
          poly(
            [
              [-7, -5],
              [2, -9],
              [5, 0],
              [-3, 2],
            ],
            "#7a8470",
          );
        } else {
          line(0, 0, 0, 12, 4, "#3a3d2c");
          for (let k = 0; k < 3; k++)
            poly(
              [
                [-t.size * (0.65 - k * 0.12), 5 - k * 9],
                [0, -t.size - k * 6],
                [t.size * (0.65 - k * 0.12), 5 - k * 9],
              ],
              k === 2 ? "#48684b" : k === 1 ? "#35583d" : "#254831",
              "#57745722",
            );
        }
        c.restore();
      }
      // Ruined stones around the two citadels.
      for (const [x, y] of [
        [55, 545],
        [845, 71],
      ]) {
        c.save();
        c.translate(x, y);
        poly(
          [
            [-22, -5],
            [0, -17],
            [25, -5],
            [25, 15],
            [0, 29],
            [-22, 15],
          ],
          "#526661",
          "#8fa59155",
        );
        poly(
          [
            [-14, -15],
            [0, -24],
            [15, -15],
            [15, 4],
            [0, 13],
            [-14, 4],
          ],
          "#72817a",
        );
        poly(
          [
            [-6, -20],
            [0, -47],
            [7, -20],
            [0, -9],
          ],
          "#8dcebd",
          "#d1fae2",
        );
        c.restore();
      }
      if (compact) {
        // A single stroke paints every edge over the original terrain.
        c.lineWidth = s.edges.length > 500 ? 0.85 : 1.5;
        c.strokeStyle = s.edges.length > 500 ? "#b1ccbc66" : "#bac9aabb";
        c.stroke(edgeNetwork);
      }
      for (const edge of highlightedLinks) {
        const from = vm.get(edge.u)!;
        const to = vm.get(edge.v)!;
        line(from.x, from.y, to.x, to.y, highlightedEdge ? 3.5 : 2, "#f3d28c");
      }
      if (ghost) {
        c.setLineDash([5, 8]);
        for (let i = 1; i < ghost.vertexIds.length; i++) {
          const a = vm.get(ghost.vertexIds[i - 1])!,
            b = vm.get(ghost.vertexIds[i])!;
          line(a.x, a.y, b.x, b.y, 3, "#d99acb99");
        }
        c.setLineDash([]);
      }
      for (let i = 1; i < walk.vertexIds.length; i++) {
        const a = vm.get(walk.vertexIds[i - 1])!,
          b = vm.get(walk.vertexIds[i])!;
        line(
          a.x,
          a.y,
          b.x,
          b.y,
          i <= step ? 5 : 2,
          i <= step ? "#d6c788" : "#dec98777",
        );
      }
      if (step < walk.edgeIds.length) {
        const a = vm.get(walk.vertexIds[step])!,
          b = vm.get(walk.vertexIds[step + 1])!;
        line(
          a.x,
          a.y,
          a.x + (b.x - a.x) * progress,
          a.y + (b.y - a.y) * progress,
          5,
          "#f8e7a4",
        );
      }
      for (const e of s.edges) {
        if (compact && s.edges.length > 80 && !highlightedIds.has(e.id)) continue;
        const a = vm.get(e.u)!,
          b = vm.get(e.v)!,
          x = (a.x + b.x) / 2,
          y = (a.y + b.y) / 2;
        circle(x, y, 10, "#192f2de6");
        c.font = `600 ${narrow ? 17 : 11}px system-ui`;
        c.fillStyle = "#c9d7c9";
        c.textAlign = "center";
        c.fillText(String(e.cost), x, y + (narrow ? 6 : 4));
      }
      for (const v of vertices) {
        if (compact) {
          const radius = Math.min(16, 72 / Math.sqrt(vertices.length));
          const seen = collected.has(v.id);
          const marked = v.id === highlightedNode || traceInterval?.includes(v.id);
          const start = v.id === s.startId;
          circle(v.x, v.y, radius + 2, marked || start ? "#9de5dc" : "#cbb383");
          circle(v.x, v.y, radius, seen ? "#29534b" : "#122e29");
          c.textAlign = "center";
          c.font = `700 ${Math.max(12, radius)}px system-ui`;
          c.fillStyle = "#fff1cf";
          c.fillText(String(v.reward), v.x, v.y + 4);
          if (!mini) {
            c.font = "600 11px system-ui";
            c.shadowColor = "#071310";
            c.shadowBlur = 4;
            c.fillText(v.id, v.x, v.y + radius + 13);
            c.shadowBlur = 0;
          }
          continue;
        }
        const seen = collected.has(v.id),
          active = traceInterval?.includes(v.id) || v.id === highlightedNode,
          unreachable = !Number.isFinite(reachable.get(v.id));
        if (active) {
          circle(v.x, v.y, 36, "#74dccc22");
          c.strokeStyle = "#8fddc8";
          c.lineWidth = 2;
          c.beginPath();
          c.arc(v.x, v.y, 34, 0, Math.PI * 2);
          c.stroke();
        }
        if (v.kind === "baron" || v.kind === "dragon" || (s.id === "general" && v.kind === "base")) {
          const rim = v.kind === "baron" ? "#a592cc" : v.kind === "dragon" ? "#d6a56e" : v.id === s.startId ? "#85d6e5" : "#de988b";
          circle(v.x, v.y, 32, "#142a25");
          circle(v.x, v.y, 29, rim);
          circle(v.x, v.y, 27, "#30463b");
        }
        circle(v.x, v.y, 25, "#142a25");
        circle(v.x, v.y, 21, seen ? "#3d5546" : "#9c9571");
        circle(v.x, v.y, 17, seen ? "#304a40" : "#3b5246");
        if (v.kind === "base") {
          poly(
            [
              [v.x - 11, v.y],
              [v.x, v.y - 22],
              [v.x + 11, v.y],
              [v.x, v.y + 11],
            ],
            s.id === "general" && v.id !== s.startId ? "#df9a8b" : "#8acdb9",
            "#d0efcc",
          );
        } else if (!seen) {
          c.shadowBlur = 11;
          c.shadowColor = "#ded69a66";
          poly(
            [
              [v.x - 7, v.y],
              [v.x, v.y - 15],
              [v.x + 7, v.y],
              [v.x, v.y + 10],
            ],
            v.kind === "jungle" ? "#c7a56e" : "#afdcbb",
            "#eff1c7",
          );
          c.shadowBlur = 0;
          poly(
            [
              [v.x, v.y - 15],
              [v.x + 7, v.y],
              [v.x, v.y + 10],
            ],
            "#79a292",
          );
        } else {
          c.font = "13px system-ui";
          c.fillStyle = "#90b09a";
          c.textAlign = "center";
          c.fillText("✓", v.x, v.y + 4);
        }
        c.textAlign = "center";
        c.font = `600 ${narrow ? 17 : 11}px system-ui`;
        c.fillStyle = "#102523dd";
        c.fillRect(v.x - 18, v.y + 19, 36, 19);
        c.fillStyle = seen ? "#7d9c86" : "#ead6a0";
        c.fillText(seen ? "✓" : `+${v.reward}`, v.x, v.y + 33);
        if (!mini) {
          c.font = `${mapLabelSize}px system-ui`;
          c.fillStyle = "#f1ead7";
          c.shadowColor = "#0b201c";
          c.shadowBlur = 4;
          c.fillText(
            unreachable ? "Unreachable" : v.label,
            v.x,
            v.y + 53,
          );
          c.shadowBlur = 0;
        }
      }
      const a = vm.get(
        walk.vertexIds[Math.min(step, walk.vertexIds.length - 1)],
      )!;
      const b = vm.get(
        walk.vertexIds[Math.min(step + 1, walk.vertexIds.length - 1)],
      )!;
      const heroX = a.x + (b.x - a.x) * progress;
      const heroY = a.y + (b.y - a.y) * progress;
      c.save();
      c.translate(heroX, heroY);
      if (compact) c.scale(.45, .45);
      character(0, 0, time);
      c.restore();
      // Arrival burst: purely cosmetic, never consumes model budget.
      const burst = (performance.now() - arrival.current.time) / 900;
      const arrived = vm.get(walk.vertexIds[step]);
      if (
        step > 0 &&
        arrived &&
        burst < 1 &&
        !walk.vertexIds.slice(0, step).includes(arrived.id)
      ) {
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          circle(
            arrived.x + Math.cos(angle) * burst * 42,
            arrived.y + Math.sin(angle) * burst * 30 - 10 * burst,
            2 * (1 - burst),
            `rgba(241,223,153,${1 - burst})`,
          );
        }
        c.fillStyle = `rgba(249,229,171,${1 - burst})`;
        c.font = "bold 16px system-ui";
        c.textAlign = "center";
        c.fillText(
          "+" + arrived.reward,
          arrived.x,
          arrived.y - 42 - burst * 25,
        );
      }
      // Subtle fireflies and vignette.
      for (let i = 0; i < 12; i++) {
        const x = 60 + i * 71 + Math.sin(time * 0.6 + i) * 13,
          y = 110 + ((i * 97) % 440) + Math.cos(time + i) * 8;
        circle(
          x,
          y,
          1.5,
          `rgba(222,235,175,${0.18 + Math.sin(time + i) * 0.15})`,
        );
      }
      const vig = c.createRadialGradient(450, 310, 180, 450, 310, 570);
      vig.addColorStop(0, "#071b1300");
      vig.addColorStop(1, "#061813aa");
      c.fillStyle = vig;
      c.fillRect(0, 0, 900, 620);
      c.fillStyle = "#bbcbb170";
      c.font = "13px system-ui";
      c.textAlign = "left";
      c.fillText("N", 851, 43);
      line(855, 52, 855, 80, 1, "#b6c6a966");
      poly(
        [
          [851, 58],
          [855, 48],
          [859, 58],
        ],
        "#b6c6a9",
      );

      if (interval) {
        c.textAlign = "right";
        c.fillStyle = "#e8d9a4";
        c.fillText(
          `OPTIMAL INTERVAL  [${interval.left + 1}, ${interval.right + 1}]`,
          860,
          590,
        );
      }
      if (!compact) frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    const resize = compact ? new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }) : undefined;
    resize?.observe(canvas);
    return () => {
      resize?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [s, walk, step, progress, hero, interval, traceInterval, ghost, mini, compact, inset, highlightedNode, highlightedEdge]);
  return (
    <canvas
      ref={ref}
      className="world"
      aria-label={`${s.title} interactive graph map. Resource nodes can also be selected using the accessible node controls.`}
      onClick={(e) => {
        const box = e.currentTarget.getBoundingClientRect(),
          x = ((e.clientX - box.left) * 900) / box.width,
          y = ((e.clientY - box.top) * 620) / box.height;
        let closest: string | undefined;
        let distance = compact ? 19 : 35;
        for (const vertex of s.vertices) {
          const point = screenPoint(vertex);
          const candidate = Math.hypot(point.x - x, point.y - y);
          if (candidate >= distance) continue;
          closest = vertex.id;
          distance = candidate;
        }
        if (closest) onNode?.(closest);
      }}
    />
  );
}

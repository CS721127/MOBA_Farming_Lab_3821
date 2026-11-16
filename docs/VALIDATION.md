# Validation record

Validation performed for the delivered source on 15 November 2026.

## Executed automated checks

- `npm run lint`: TypeScript strict typecheck passed.
- `npm run test`: 23 test cases passed. The property loops include 1,000 random path scenarios and 250 random general graph scenarios.
- `npm run build`: TypeScript check and production Vite bundle passed.
- Deterministic fixture results: lane 21/cost 10; greedy trap 2 versus exact 10; branching graph 15/cost 4; singleton 5/cost 0.

## Executed browser checks

The available browser automation controlled the running Vite preview, read rendered DOM values and inspected screenshots. This is separate from the standalone Playwright CLI suite shipped with the project.

- General graph correctly disables Path two-pointer and shows a topology-specific reason.
- Single Lane + Path two-pointer + Step: reward 8, cost 2 on first edge; on returning to the start reward stays 8 and cost rises to 4; final reward 21/cost 10 after five steps.
- Budget change to zero resets playback and immediately retains only start reward 1 at cost 0.
- Nonadjacent manual move to Crystal heart is rejected (0 reward). Adjacent manual move to Moon camp succeeds (4 reward, 2 cost).
- Pause preserves score across subsequent visual observation. Run, step, replay, strategy/scenario switching and comparison were exercised.
- Greedy trap table displays both heuristics at reward 2 and 20% of optimum; all applicable exact methods return reward 10 and 100%.
- Scenario transition state was repaired to clear old results/walk synchronously before changing the graph; subsequent trap/lane/branch transitions passed.
- Worker benchmark completed in the browser with actual results. At n=512 and midpoint start, two-pointer inspects 257 interval states and 255 extension checks; quadratic inspects 65,792 intervals. At k=14, DP visits 114,688 feasible states and checks 745,472 transitions.
- A 390 × 844 iframe viewport exercised real mobile media queries. The content client width and scroll width both measured 375 px (remaining width is the browser scrollbar), with no horizontal page overflow. Mobile path stepping produced reward 8/cost 2. Screenshot inspection confirmed the map is above controls.

## Standalone E2E suite

`e2e/play.spec.ts` and `playwright.config.ts` provide repeatable desktop/mobile UI regression tests. The standalone Playwright CLI runner was **not launched in this environment**; browser interaction was performed through the supplied browser automation interface. Run `npx playwright install chromium && npm run test:e2e` locally or use the included CI workflow. Do not interpret provision of this suite as a claim that its CLI was executed here.

## Measurement notes

Timings vary by hardware, browser and cache; they are not proof of complexity. Cache hits retain original measured timings. All listed counts and scores came from actual code; no display result is hardcoded. The companion comparison panel follows edge index for visual comparison, not a simulated race. Sequential replay uses each route's own costs.

## Map and theory update

- Added graph editor model tests covering topology detection, duplicate/self-edge prevention, deletion/start repair, invalid costs and solver execution. Lane variants preserve mathematical fixtures; generators reproduce seeded results.
- Browser drew two vertices, connected two edges, changed start, exercised undo/redo and submitted the graph. All six comparison algorithms returned reward 10 and physical cost 2 for the resulting graph.
- Updated standalone E2E selectors for the simplified interface; CLI suite remains unexecuted here.

## 16 November update

- 100-node layouts tested for coordinate bounds, minimum separation and interior coverage.
- Earlier version: browser verified 100 rendered nodes, 1,331 drawn edges, zoom and node/edge inspection. The current streamlined comparison replay intentionally removes the extra toolbar and inspector to prioritise canvas space.
- Dense-map presentation preserves solver inputs, manual movement and comparison routes. Exact solver size caps remain enforced; large generation defaults to greedy.

## Illustrated dense map

Generated graphs use the same forest-and-river 900:620 canvas as default graphs. For dense networks the compact renderer paints every edge, without a separate inspection pane in replay. Editing and inspecting graph inputs remains available in the graph editor.

## 16 November — comparison viewport follow-up

- Removed generated-only zoom, Fit map, Clear highlight, node/edge inspector and their layout wrapper from both replay canvases.
- Kept the compact node/edge rendering on dense generated graphs and the default 900:620 canvas aspect ratio.
- Updated the E2E checks to assert no extra controls, correct canvas dimensions, and a visible comparison replay.
- Checked the prebuilt JavaScript bundle with `node --check` and verified the rendered component declaration and packaged assets statically.
- Browser E2E navigation was **blocked by the local browser administrator policy**, so the revised replay could not be interactively verified here. Run `npm ci && npm run test:e2e` in a normal browser-capable environment.

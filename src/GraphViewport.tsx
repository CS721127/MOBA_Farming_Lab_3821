import type { ComponentProps } from "react";
import { World } from "./World";

/**
 * Replay and comparison share the default map's single, full-size canvas.
 * Dense graphs retain the compact drawing style, but never add inspection,
 * zoom or toolbar panels that steal space from the comparison viewport.
 * Editing and inspecting nodes still belong in the separate Graph Editor.
 */
export function GraphViewport(props: ComponentProps<typeof World>) {
  const dense = props.s.vertices.length > 18 || props.s.edges.length > 42;
  return <World {...props} compact={dense} />;
}

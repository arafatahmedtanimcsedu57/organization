/**
 * Minimal ambient types for `d3-flextree` (v2), which ships no `.d.ts`.
 * Covers only the surface `topdownLayout.ts` uses: the factory, the `hierarchy`
 * helper, and the `x`/`y` + size fields flextree writes onto each hierarchy node.
 */
declare module 'd3-flextree' {
  import type { HierarchyNode } from 'd3-hierarchy';

  export interface FlextreeNode<Datum> extends HierarchyNode<Datum> {
    /** Center of the node on the breadth (horizontal) axis. */
    x: number;
    /** Top of the node on the depth (vertical) axis. */
    y: number;
    xSize: number;
    ySize: number;
    parent: FlextreeNode<Datum> | null;
    children?: FlextreeNode<Datum>[];
  }

  export interface FlextreeLayout<Datum> {
    (tree: FlextreeNode<Datum>): FlextreeNode<Datum>;
    hierarchy(
      data: Datum,
      children?: (d: Datum) => Datum[] | null | undefined,
    ): FlextreeNode<Datum>;
  }

  export interface FlextreeOptions<Datum> {
    children?: (d: Datum) => Datum[] | null | undefined;
    nodeSize?: (node: FlextreeNode<Datum>) => [number, number];
    spacing?: number | ((a: FlextreeNode<Datum>, b: FlextreeNode<Datum>) => number);
  }

  export function flextree<Datum>(options?: FlextreeOptions<Datum>): FlextreeLayout<Datum>;
}

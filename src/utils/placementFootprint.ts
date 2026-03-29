/**
 * Canonical key for a polyomino footprint: translate so min (r,c) is (0,0), then sort cells.
 * Collapses symmetric orientation variants (e.g. eight 2×3 rectangles → two distinct shapes).
 */
export function footprintKeyFromRelativeCells(
  cells: [number, number][]
): string {
  if (cells.length === 0) return "";
  const minR = Math.min(...cells.map(([r]) => r));
  const minC = Math.min(...cells.map(([, c]) => c));
  const shifted = cells.map(
    ([r, c]) => [r - minR, c - minC] as [number, number]
  );
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return shifted.map(([r, c]) => `${r},${c}`).join("|");
}

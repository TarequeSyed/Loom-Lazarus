// Feature: card-domain-and-loom-engine, Property 1: Read-order bijection
// **Validates: Requirements 4.1, 4.2, 4.9, 13.4**
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compileProfile } from "../profile/machineProfile";
import type { MachineProfile } from "../profile/machineProfile";
import { gridToReadIndex, readIndexToGrid } from "../profile/readOrder";
import { arbProfile } from "./generators/profile";
import { SEED_P1 } from "./seeds";

// Generator precondition: arbProfile({ maxDimension: 256 }) yields valid profiles (they pass
// validateProfile) with 1 to 256 rows and columns, a distinct in-grid reserved set of size 0 to
// min(8, cells - 1) so readableCount >= 1, and column-major (all four direction pairs) or, up to
// 1024 cells, explicit read orders over the readable positions.
//
// Speed: every public conversion call recompiles the profile (O(cells)). Profiles with at most
// FULL_CHECK_CELLS cells check every read index through the public functions. Larger profiles
// check a deterministic sample (first, last and an even stride of about SAMPLE_SIZE indices)
// through the public functions, and check full coverage and distinctness once on the compiled tables.
const FULL_CHECK_CELLS = 400;
const SAMPLE_SIZE = 24;

function indicesToCheck(profile: MachineProfile): number[] {
  const count = profile.readableCount;
  if (profile.gridRows * profile.gridColumns <= FULL_CHECK_CELLS) {
    return Array.from({ length: count }, (_, i) => i);
  }
  const stride = Math.max(1, Math.floor(count / SAMPLE_SIZE));
  const out = new Set<number>([0, count - 1]);
  for (let i = 0; i < count; i += stride) out.add(i);
  return [...out];
}

describe("Property 1: read-order bijection", () => {
  it("round-trips, covers every readable position once and never yields a reserved one", () => {
    fc.assert(
      fc.property(arbProfile({ maxDimension: 256 }), (profile) => {
        const compiled = compileProfile(profile);
        expect(compiled.ok).toBe(true);
        if (!compiled.ok) return;
        const { readableCount, gridToRead, readToGrid } = compiled.value;
        expect(readableCount).toBe(profile.readableCount);
        expect(readToGrid.length).toBe(readableCount);

        const reserved = new Set(
          profile.reservedPositions.map((r) => r.gridRow * profile.gridColumns + r.gridColumn),
        );

        // Full-table check: exactly readableCount distinct, non-reserved, in-grid positions.
        // Plain checks (not expect) in the hot loop: expect() per cell is too slow at 256 x 256.
        const seen = new Set<number>();
        let problem: string | undefined;
        for (let i = 0; i < readableCount && problem === undefined; i++) {
          const pos = readToGrid[i];
          if (pos === undefined) {
            problem = `readToGrid[${i}] is undefined`;
            break;
          }
          const key = pos.gridRow * profile.gridColumns + pos.gridColumn;
          if (pos.gridRow < 0 || pos.gridRow >= profile.gridRows || pos.gridColumn < 0 || pos.gridColumn >= profile.gridColumns) {
            problem = `readToGrid[${i}] = (${pos.gridRow}, ${pos.gridColumn}) is outside the grid`;
          } else if (reserved.has(key)) {
            problem = `readToGrid[${i}] is the reserved position (${pos.gridRow}, ${pos.gridColumn})`;
          } else if (seen.has(key)) {
            problem = `readToGrid[${i}] repeats position (${pos.gridRow}, ${pos.gridColumn})`;
          } else if (gridToRead[key] !== i) {
            problem = `gridToRead does not invert readToGrid at read index ${i}`;
          }
          seen.add(key);
        }
        expect(problem).toBeUndefined();
        expect(seen.size).toBe(readableCount);
        let nonNegative = 0;
        for (const v of gridToRead) if (v >= 0) nonNegative++;
        expect(nonNegative).toBe(readableCount);
        // Public-function round trips, both directions.
        for (const i of indicesToCheck(profile)) {
          const grid = readIndexToGrid(profile, i);
          expect(grid.ok).toBe(true);
          if (!grid.ok) return;
          expect(reserved.has(grid.value.gridRow * profile.gridColumns + grid.value.gridColumn)).toBe(false);
          const back = gridToReadIndex(profile, grid.value);
          expect(back.ok).toBe(true);
          if (!back.ok) return;
          expect(back.value).toBe(i);
          const again = readIndexToGrid(profile, back.value);
          expect(again.ok).toBe(true);
          if (!again.ok) return;
          expect(again.value).toEqual(grid.value);
        }
      }),
      { seed: SEED_P1, numRuns: 300 },
    );
  }, 120_000);
});

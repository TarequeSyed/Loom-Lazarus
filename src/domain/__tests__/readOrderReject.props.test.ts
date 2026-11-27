// Property 2 (task 3.5): reserved and out-of-range positions are rejected by the conversion functions.
// The "Card unchanged" clause is covered in task 6.14.
import fc from "fast-check";
import { describe, it } from "vitest";
import type { GridPosition } from "../brand";
import { gridToReadIndex, readIndexToGrid } from "../profile/readOrder";
import { deepFreeze } from "./helpers";
import { arbProfile } from "./generators/profile";
import { SEED_P2 } from "./seeds";

const NUM_RUNS = 200;

/** A coordinate that is invalid for an axis of length `count`: integer outside [0, count), non-integer, NaN or infinite. */
function arbBadCoordinate(count: number): fc.Arbitrary<number> {
  return fc.oneof(
    fc.integer({ min: -1000, max: -1 }),
    fc.integer({ min: count, max: count + 1000 }),
    fc
      .double({ min: -1000, max: 1000, noNaN: true })
      .filter((v) => !Number.isInteger(v)),
    fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
  );
}

/** A read index that is not an integer in [0, readableCount - 1]. */
function arbBadReadIndex(readableCount: number): fc.Arbitrary<number> {
  return arbBadCoordinate(readableCount);
}

const asPos = (gridRow: number, gridColumn: number): GridPosition =>
  ({ gridRow, gridColumn }) as unknown as GridPosition;

/*
 * Precondition for all properties: for any valid MachineProfile from `arbProfile` (rows and columns
 * in [1, 16], 0 to min(8, rows * columns - 1) distinct reserved positions, readableCount >= 1).
 */
describe("Property 2: reserved and out-of-range positions are rejected", () => {
  it("every reserved position gives RESERVED_POSITION, and no read index maps to one", () => {
    // **Validates: Requirements 3.4, 4.3, 13.5**
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        deepFreeze(profile);
        for (const r of profile.reservedPositions) {
          const pos = deepFreeze(asPos(r.gridRow, r.gridColumn));
          const res = gridToReadIndex(profile, pos);
          if (res.ok || res.error.code !== "RESERVED_POSITION") return false;
        }
        const reserved = new Set(profile.reservedPositions.map((r) => `${r.gridRow},${r.gridColumn}`));
        for (let i = 0; i < profile.readableCount; i++) {
          const res = readIndexToGrid(profile, i);
          if (!res.ok || reserved.has(`${res.value.gridRow},${res.value.gridColumn}`)) return false;
        }
        return true;
      }),
      { seed: SEED_P2, numRuns: NUM_RUNS },
    );
  });

  it("every out-of-grid or non-integer position gives POSITION_OUT_OF_RANGE", () => {
    // **Validates: Requirements 3.5, 4.3, 13.5**
    const arb = arbProfile().chain((profile) =>
      fc
        .tuple(
          fc.integer({ min: 0, max: 2 }),
          arbBadCoordinate(profile.gridRows),
          arbBadCoordinate(profile.gridColumns),
          fc.integer({ min: 0, max: profile.gridRows - 1 }),
          fc.integer({ min: 0, max: profile.gridColumns - 1 }),
        )
        .map(([which, badRow, badColumn, okRow, okColumn]) => ({
          profile,
          // which: 0 = bad row only, 1 = bad column only, 2 = both bad.
          pos:
            which === 0
              ? asPos(badRow, okColumn)
              : which === 1
                ? asPos(okRow, badColumn)
                : asPos(badRow, badColumn),
        })),
    );
    fc.assert(
      fc.property(arb, ({ profile, pos }) => {
        deepFreeze(profile);
        deepFreeze(pos);
        const res = gridToReadIndex(profile, pos);
        return !res.ok && res.error.code === "POSITION_OUT_OF_RANGE";
      }),
      { seed: SEED_P2, numRuns: NUM_RUNS },
    );
  });

  it("every read index outside [0, readableCount - 1] gives READ_INDEX_OUT_OF_RANGE", () => {
    // **Validates: Requirements 4.4, 13.5**
    const arb = arbProfile().chain((profile) =>
      arbBadReadIndex(profile.readableCount).map((index) => ({ profile, index })),
    );
    fc.assert(
      fc.property(arb, ({ profile, index }) => {
        deepFreeze(profile);
        const res = readIndexToGrid(profile, index);
        return !res.ok && res.error.code === "READ_INDEX_OUT_OF_RANGE";
      }),
      { seed: SEED_P2, numRuns: NUM_RUNS },
    );
  });
});

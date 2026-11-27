// Generator self-check for task 3.1. Not one of properties P1 to P4.
// Precondition: arbProfile defaults (1 to 16 rows and columns); seed 20260100.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compileProfile, validateProfile } from "../../profile/machineProfile";
import { arbPosition, arbProfile, arbReservedList } from "./profile";

describe("profile generators", () => {
  it("arbProfile output validates and compiles", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        expect(validateProfile(profile).ok).toBe(true);
        expect(profile.reservedPositions.length).toBeLessThanOrEqual(8);
        expect(profile.readableCount).toBeGreaterThanOrEqual(1);
        const compiled = compileProfile(profile);
        expect(compiled.ok).toBe(true);
        if (compiled.ok) expect(compiled.value.readToGrid.length).toBe(profile.readableCount);
      }),
      { seed: 20260100, numRuns: 100 },
    );
  });

  it("arbProfile with maxDimension 256 still validates and compiles", () => {
    fc.assert(
      fc.property(arbProfile({ maxDimension: 256 }), (profile) => {
        expect(validateProfile(profile).ok).toBe(true);
        expect(compileProfile(profile).ok).toBe(true);
      }),
      { seed: 20260100, numRuns: 20 },
    );
  });

  it("arbReservedList is distinct and in-grid; arbPosition is in-grid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 16 }),
        fc.integer({ min: 1, max: 16 }),
        (rows, columns) => {
          const [list, pos] = fc.sample(fc.tuple(arbReservedList(rows, columns), arbPosition(rows, columns)), {
            seed: rows * 100 + columns,
            numRuns: 1,
          })[0]!;
          const keys = new Set(list.map((r) => r.gridRow * columns + r.gridColumn));
          expect(keys.size).toBe(list.length);
          expect(list.length).toBeLessThanOrEqual(Math.min(8, rows * columns - 1));
          expect(list.every((r) => r.gridRow < rows && r.gridColumn < columns)).toBe(true);
          expect(pos.gridRow).toBeLessThan(rows);
          expect(pos.gridColumn).toBeLessThan(columns);
        },
      ),
      { seed: 20260100, numRuns: 50 },
    );
  });
});

import { describe, expect, it } from "vitest";
import type { GridColumn, GridRow, GridPosition } from "../brand";
import type { MachineProfile, ReadOrderSpec, VerificationStatus } from "../profile/machineProfile";
import { gridToPhysical, gridToReadIndex, readIndexToGrid } from "../profile/readOrder";

const UNVERIFIED: VerificationStatus = { status: "unverified", basis: "unknown" };

/** 5 rows x 3 columns, one reserved position at (2, 1), 14 readable. Built inline for this test file. */
function makeProfile(readOrder: ReadOrderSpec, withPhysical: boolean): MachineProfile {
  return {
    schemaVersion: 1,
    profileId: "test-5x3",
    displayName: "Test 5x3",
    gridRows: 5,
    gridColumns: 3,
    readableCount: 14,
    reservedPositions: [{ gridRow: 2, gridColumn: 1, role: "alignment" }],
    readOrder,
    hookMappings: [{ kind: "contiguous-visualization", verification: UNVERIFIED }],
    defaultThreadsPerHook: 2,
    mirrorOptions: ["none"],
    cardToPass: { kind: "one-card-per-pass" },
    ...(withPhysical
      ? {
          physicalDimensions: {
            cardWidthMm: 30,
            cardHeightMm: 60,
            originXMm: 5,
            originYMm: 10,
            rowPitchMm: 4,
            columnPitchMm: 8,
            holeDiameterMm: 2,
          },
        }
      : {}),
    verification: {
      gridSize: UNVERIFIED,
      reservedPositions: UNVERIFIED,
      endHoles: UNVERIFIED,
      readOrder: UNVERIFIED,
      defaultThreadsPerHook: UNVERIFIED,
      mirrorOptions: UNVERIFIED,
      cardToPass: UNVERIFIED,
      physicalDimensions: UNVERIFIED,
    },
  };
}

const garinStyle: ReadOrderSpec = {
  kind: "column-major",
  columnDirection: "right-to-left",
  rowDirection: "bottom-up",
};

const pos = (gridRow: number, gridColumn: number): GridPosition => ({
  gridRow: gridRow as GridRow,
  gridColumn: gridColumn as GridColumn,
});

describe("read-order conversions", () => {
  const profile = makeProfile(garinStyle, false);

  it("reads the rightmost column first, bottom-up (descending gridRow)", () => {
    const first = gridToReadIndex(profile, pos(4, 2));
    expect(first).toEqual({ ok: true, value: 0 });
    expect(gridToReadIndex(profile, pos(0, 2))).toEqual({ ok: true, value: 4 });
    expect(gridToReadIndex(profile, pos(4, 1))).toEqual({ ok: true, value: 5 });
  });

  it("skips the reserved position in the middle column", () => {
    // Column 1 bottom-up: rows 4, 3, (2 reserved), 1, 0 -> read indices 5, 6, 7, 8.
    expect(gridToReadIndex(profile, pos(3, 1))).toEqual({ ok: true, value: 6 });
    expect(gridToReadIndex(profile, pos(1, 1))).toEqual({ ok: true, value: 7 });
    expect(gridToReadIndex(profile, pos(0, 0))).toEqual({ ok: true, value: 13 });
  });

  it("rejects a reserved position", () => {
    const r = gridToReadIndex(profile, pos(2, 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("RESERVED_POSITION");
  });

  it.each([
    [5, 0],
    [0, 3],
    [-1, 0],
    [0, -1],
    [1.5, 0],
    [Number.NaN, 0],
  ])("rejects out-of-grid position (%s, %s)", (row, col) => {
    const r = gridToReadIndex(profile, pos(row, col));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("POSITION_OUT_OF_RANGE");
  });

  it("round-trips every readable position and every read index", () => {
    for (let i = 0; i < 14; i++) {
      const g = readIndexToGrid(profile, i);
      expect(g.ok).toBe(true);
      if (g.ok) expect(gridToReadIndex(profile, g.value)).toEqual({ ok: true, value: i });
    }
  });

  it.each([-1, 14, 0.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects read index %s", (i) => {
    const r = readIndexToGrid(profile, i);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("READ_INDEX_OUT_OF_RANGE");
  });

  it("follows an explicit order when the profile gives one", () => {
    const order: { gridRow: number; gridColumn: number }[] = [];
    for (let gridRow = 0; gridRow < 5; gridRow++) {
      for (let gridColumn = 0; gridColumn < 3; gridColumn++) {
        if (!(gridRow === 2 && gridColumn === 1)) order.push({ gridRow, gridColumn });
      }
    }
    const explicit = makeProfile({ kind: "explicit", order }, false);
    expect(gridToReadIndex(explicit, pos(0, 0))).toEqual({ ok: true, value: 0 });
    expect(readIndexToGrid(explicit, 13)).toEqual({ ok: true, value: { gridRow: 4, gridColumn: 2 } });
  });

  it("returns an error for an invalid profile instead of throwing", () => {
    const bad = { ...profile, readableCount: 99 };
    const r = gridToReadIndex(bad, pos(0, 0));
    expect(r.ok).toBe(false);
  });
});

describe("gridToPhysical", () => {
  it("returns PHYSICAL_DIMENSIONS_UNAVAILABLE when the profile declares none", () => {
    const r = gridToPhysical(makeProfile(garinStyle, false), pos(1, 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PHYSICAL_DIMENSIONS_UNAVAILABLE");
  });

  it("uses only the declared origin and pitches", () => {
    const r = gridToPhysical(makeProfile(garinStyle, true), pos(3, 2));
    expect(r).toEqual({ ok: true, value: { xMm: 5 + 2 * 8, yMm: 10 + 3 * 4 } });
  });

  it("rejects an out-of-grid position before reporting missing dimensions", () => {
    const r = gridToPhysical(makeProfile(garinStyle, false), pos(5, 0));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("POSITION_OUT_OF_RANGE");
  });
});

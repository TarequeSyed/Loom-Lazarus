import { describe, expect, it } from "vitest";
import { compileProfile, validateProfile } from "../profile/machineProfile";
import type { MachineProfile, ReadOrderSpec } from "../profile/machineProfile";

const unverified = { status: "unverified", basis: "unknown" } as const;

function makeProfile(over: Partial<MachineProfile> = {}): MachineProfile {
  return {
    schemaVersion: 1,
    profileId: "test-5x3",
    displayName: "Test 5x3",
    gridRows: 5,
    gridColumns: 3,
    readableCount: 14,
    reservedPositions: [{ gridRow: 2, gridColumn: 1, role: "alignment" }],
    readOrder: { kind: "column-major", columnDirection: "right-to-left", rowDirection: "bottom-up" },
    hookMappings: [{ kind: "repeat", verification: unverified }],
    defaultThreadsPerHook: 4,
    mirrorOptions: ["none", "mirrored"],
    cardToPass: { kind: "one-card-per-pass" },
    verification: {
      gridSize: unverified,
      reservedPositions: unverified,
      endHoles: unverified,
      readOrder: unverified,
      defaultThreadsPerHook: unverified,
      mirrorOptions: unverified,
      cardToPass: unverified,
      physicalDimensions: unverified,
    },
    ...over,
  };
}

describe("validateProfile", () => {
  it("accepts a valid 5x3 profile", () => {
    expect(validateProfile(makeProfile()).ok).toBe(true);
  });

  it("reports PROFILE_COUNT_MISMATCH", () => {
    const r = validateProfile(makeProfile({ readableCount: 15 }));
    expect(!r.ok && r.error.code).toBe("PROFILE_COUNT_MISMATCH");
  });

  it("reports HOOK_MAPPING_INVALID for an unknown kind", () => {
    const bad = makeProfile({ hookMappings: [{ kind: "zigzag", verification: unverified } as never] });
    const r = validateProfile(bad);
    expect(!r.ok && r.error.code).toBe("HOOK_MAPPING_INVALID");
  });

  it("reports INVALID_PROFILE for verified without source, naming the field", () => {
    const bad = makeProfile({
      verification: {
        ...makeProfile().verification,
        readOrder: { status: "verified", basis: "paper-figure" },
      },
    });
    const r = validateProfile(bad);
    expect(!r.ok && r.error.code).toBe("INVALID_PROFILE");
    expect(!r.ok && r.error.message).toContain("readOrder");
  });

  it("rejects bad grid size and duplicate reserved positions", () => {
    const a = validateProfile(makeProfile({ gridRows: 0 }));
    expect(!a.ok && a.error.code).toBe("INVALID_PROFILE");
    const dup = makeProfile({
      reservedPositions: [
        { gridRow: 0, gridColumn: 0, role: "a" },
        { gridRow: 0, gridColumn: 0, role: "b" },
      ],
      readableCount: 13,
    });
    const b = validateProfile(dup);
    expect(!b.ok && b.error.code).toBe("INVALID_PROFILE");
  });
});

describe("compileProfile", () => {
  it("builds right-to-left bottom-up tables skipping reserved positions", () => {
    const r = compileProfile(makeProfile());
    if (!r.ok) throw new Error("expected ok");
    const t = r.value;
    expect(t.readToGrid).toHaveLength(14);
    expect(t.readToGrid[0]).toEqual({ gridRow: 4, gridColumn: 2 });
    expect(t.gridToRead[2 * 3 + 1]).toBe(-1);
    t.readToGrid.forEach((p, i) => expect(t.gridToRead[p.gridRow * 3 + p.gridColumn]).toBe(i));
  });

  it("handles all four column-major direction pairs", () => {
    const cols = ["right-to-left", "left-to-right"] as const;
    const rowsDir = ["bottom-up", "top-down"] as const;
    for (const columnDirection of cols) {
      for (const rowDirection of rowsDir) {
        const order: ReadOrderSpec = { kind: "column-major", columnDirection, rowDirection };
        const r = compileProfile(makeProfile({ readOrder: order }));
        if (!r.ok) throw new Error("expected ok");
        const first = r.value.readToGrid[0]!;
        expect(first.gridColumn).toBe(columnDirection === "right-to-left" ? 2 : 0);
        expect(first.gridRow).toBe(rowDirection === "bottom-up" ? 4 : 0);
        expect(new Set(r.value.readToGrid.map((p) => `${p.gridRow},${p.gridColumn}`)).size).toBe(14);
      }
    }
  });

  it("compiles an explicit order and rejects an incomplete one", () => {
    const base = compileProfile(makeProfile());
    if (!base.ok) throw new Error("expected ok");
    const order = [...base.value.readToGrid].reverse();
    const good = compileProfile(makeProfile({ readOrder: { kind: "explicit", order } }));
    expect(good.ok && good.value.readToGrid[0]).toEqual(order[0]);
    const bad = compileProfile(makeProfile({ readOrder: { kind: "explicit", order: order.slice(1) } }));
    expect(bad.ok).toBe(false);
  });

  it("caches by profile identity", () => {
    const p = makeProfile();
    const a = compileProfile(p);
    const b = compileProfile(p);
    expect(a.ok && b.ok && a.value === b.value).toBe(true);
  });
});

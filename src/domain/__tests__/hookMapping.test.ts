import { describe, expect, it } from "vitest";
import type { ReadIndex } from "../brand";
import { hookWarpIndices, warpCount } from "../profile/hookMapping";
import type { HookMappingConfig } from "../profile/hookMapping";
import type { MachineProfile } from "../profile/machineProfile";

// Only readableCount, hookMappings and mirrorOptions are read by the hook mapping functions.
const UNV = { status: "unverified", basis: "unknown" } as const;
const BOTH = [
  { kind: "contiguous-visualization", verification: UNV },
  { kind: "repeat", verification: UNV },
] as const;
const GARIN_LIKE = { readableCount: 400, hookMappings: BOTH, mirrorOptions: ["none", "mirrored"] } as unknown as MachineProfile;
const SMALL = { readableCount: 5, hookMappings: BOTH, mirrorOptions: ["none", "mirrored"] } as unknown as MachineProfile;
const REPEAT_ONLY = {
  readableCount: 5,
  hookMappings: [BOTH[1]],
  mirrorOptions: ["none"],
} as unknown as MachineProfile;
const ri = (n: number): ReadIndex => n as ReadIndex;

function cfg(
  hookMapping: HookMappingConfig["hookMapping"],
  mirror: HookMappingConfig["mirror"],
  threadsPerHook = 16,
): HookMappingConfig {
  return { threadsPerHook, hookMapping, mirror };
}

function unwrap<T>(r: { ok: true; value: T } | { ok: false; error: { code: string } }): T {
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
}

describe("hook mapping", () => {
  it("gives 6,400 warps for Garín numbers under both mappings", () => {
    for (const kind of ["contiguous-visualization", "repeat"] as const) {
      expect(unwrap(warpCount(GARIN_LIKE, cfg(kind, "none")))).toBe(6400);
      expect(unwrap(warpCount(GARIN_LIKE, cfg(kind, "mirrored")))).toBe(6400);
    }
  });

  it("covers every warp exactly once under both mappings and both mirror options", () => {
    for (const kind of ["contiguous-visualization", "repeat"] as const) {
      for (const mirror of ["none", "mirrored"] as const) {
        const seen = new Uint8Array(6400);
        for (let h = 0; h < 400; h++) {
          const w = unwrap(hookWarpIndices(GARIN_LIKE, cfg(kind, mirror), ri(h)));
          expect(w).toHaveLength(16);
          for (const x of w) seen[x] = (seen[x] ?? 0) + 1;
        }
        expect(seen.every((n) => n === 1)).toBe(true);
      }
    }
  });

  it("contiguous: hook h drives h*t..h*t+t-1", () => {
    expect(unwrap(hookWarpIndices(SMALL, cfg("contiguous-visualization", "none", 3), ri(2)))).toEqual([6, 7, 8]);
  });

  it("repeat: hook h drives h + k*readableCount", () => {
    expect(unwrap(hookWarpIndices(SMALL, cfg("repeat", "none", 3), ri(2)))).toEqual([2, 7, 12]);
  });

  it("mirror maps w to warpCount-1-w and sorts ascending", () => {
    expect(unwrap(hookWarpIndices(SMALL, cfg("contiguous-visualization", "mirrored", 3), ri(2)))).toEqual([6, 7, 8]);
    expect(unwrap(hookWarpIndices(SMALL, cfg("contiguous-visualization", "mirrored", 3), ri(0)))).toEqual([12, 13, 14]);
    expect(unwrap(hookWarpIndices(SMALL, cfg("repeat", "mirrored", 3), ri(0)))).toEqual([4, 9, 14]);
  });

  it("rejects invalid threads-per-hook, hook index, mapping and mirror", () => {
    const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error?.code);
    expect(code(warpCount(SMALL, cfg("repeat", "none", 0)))).toBe("INVALID_THREADS_PER_HOOK");
    expect(code(warpCount(SMALL, cfg("repeat", "none", 65)))).toBe("INVALID_THREADS_PER_HOOK");
    expect(code(warpCount(SMALL, cfg("repeat", "none", 1.5)))).toBe("INVALID_THREADS_PER_HOOK");
    expect(code(hookWarpIndices(SMALL, cfg("repeat", "none", 2), ri(5)))).toBe("READ_INDEX_OUT_OF_RANGE");
    expect(code(hookWarpIndices(SMALL, cfg("repeat", "none", 2), ri(-1)))).toBe("READ_INDEX_OUT_OF_RANGE");
    expect(code(warpCount(SMALL, cfg(undefined, "none")))).toBe("HOOK_MAPPING_NOT_CONFIGURED");
    expect(code(warpCount(SMALL, cfg("bogus" as never, "none")))).toBe("UNSUPPORTED_HOOK_MAPPING");
    expect(code(warpCount(SMALL, cfg("repeat", undefined)))).toBe("MIRROR_NOT_CONFIGURED");
    expect(code(warpCount(SMALL, cfg("repeat", "sideways" as never)))).toBe("UNSUPPORTED_MIRROR");
  });

  it("rejects a mapping or mirror the profile does not permit", () => {
    const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error?.code);
    expect(code(warpCount(REPEAT_ONLY, cfg("repeat", "none")))).toBe("ok");
    expect(code(warpCount(REPEAT_ONLY, cfg("contiguous-visualization", "none")))).toBe("UNSUPPORTED_HOOK_MAPPING");
    expect(code(warpCount(REPEAT_ONLY, cfg("repeat", "mirrored")))).toBe("UNSUPPORTED_MIRROR");
    expect(code(hookWarpIndices(REPEAT_ONLY, cfg("contiguous-visualization", "none"), ri(0)))).toBe(
      "UNSUPPORTED_HOOK_MAPPING",
    );
  });

  it("has no implicit default in either function", () => {
    const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error?.code);
    expect(code(hookWarpIndices(SMALL, cfg(undefined, undefined), ri(0)))).toBe("HOOK_MAPPING_NOT_CONFIGURED");
    expect(code(hookWarpIndices(SMALL, cfg("repeat", undefined), ri(0)))).toBe("MIRROR_NOT_CONFIGURED");
  });

  it("follows the documented check order", () => {
    const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error?.code);
    // threads-per-hook before mapping, mapping before mirror, mirror before hook index.
    expect(code(warpCount(SMALL, cfg(undefined, undefined, 0)))).toBe("INVALID_THREADS_PER_HOOK");
    expect(code(warpCount(SMALL, cfg("bogus" as never, undefined)))).toBe("UNSUPPORTED_HOOK_MAPPING");
    expect(code(hookWarpIndices(SMALL, cfg("repeat", "sideways" as never), ri(99)))).toBe("UNSUPPORTED_MIRROR");
    expect(code(hookWarpIndices(SMALL, cfg("repeat", undefined), ri(99)))).toBe("MIRROR_NOT_CONFIGURED");
  });
});

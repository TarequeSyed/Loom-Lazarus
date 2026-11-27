/**
 * Hook-to-warp mappings (design.md, "Hook-to-warp mappings"; Req 14).
 * Pure index arithmetic. Mirror is applied after the mapping and never alters a Deck.
 */

import type { ReadIndex, WarpIndex } from "../brand";
import { LIMITS } from "../limits";
import { err, makeError, ok } from "../result";
import type { Result } from "../result";
import type { HookMappingKind, MachineProfile, MirrorOrientation } from "./machineProfile";

/**
 * The loom settings these functions read. `LoomConfiguration` (loom/config.ts) satisfies this
 * structurally; fields are typed loosely so unvalidated input (for example from JSON) is checked at runtime.
 */
export interface HookMappingConfig {
  readonly threadsPerHook: number;
  readonly hookMapping?: HookMappingKind;
  readonly mirror?: MirrorOrientation;
}

interface Checked {
  readonly readableCount: number;
  readonly threadsPerHook: number;
  readonly kind: HookMappingKind;
  readonly mirrored: boolean;
}

/**
 * Shared check order, first failure returned. There is no implicit default for the hook mapping or the mirror.
 * `HOOK_MAPPING_INVALID` is reserved for bad profile data and is never returned here.
 */
function checkConfig(profile: MachineProfile, cfg: HookMappingConfig): Result<Checked> {
  const t: unknown = cfg.threadsPerHook;
  if (typeof t !== "number" || !Number.isInteger(t) || t < 1 || t > LIMITS.maxThreadsPerHook) {
    return err(
      makeError(
        "INVALID_THREADS_PER_HOOK",
        `Got ${String(t)}; expected an integer in [1, ${LIMITS.maxThreadsPerHook}].`,
      ),
    );
  }
  const kind: unknown = cfg.hookMapping;
  if (kind === undefined) return err(makeError("HOOK_MAPPING_NOT_CONFIGURED"));
  if (typeof kind !== "string" || !profile.hookMappings.some((m) => m.kind === kind)) {
    return err(
      makeError("UNSUPPORTED_HOOK_MAPPING", `Hook mapping ${String(kind)} is unknown or not permitted by the profile.`),
    );
  }
  const mirror: unknown = cfg.mirror;
  if (mirror === undefined) return err(makeError("MIRROR_NOT_CONFIGURED"));
  if (typeof mirror !== "string" || !profile.mirrorOptions.some((m) => m === mirror)) {
    return err(
      makeError("UNSUPPORTED_MIRROR", `Mirror option ${String(mirror)} is unknown or not permitted by the profile.`),
    );
  }
  return ok({
    readableCount: profile.readableCount,
    threadsPerHook: t,
    kind: kind as HookMappingKind,
    mirrored: mirror === "mirrored",
  });
}
/**
 * Total warp threads: `readableCount * threadsPerHook`. Identical for both mappings and both mirror options.
 * Errors, in check order: `INVALID_THREADS_PER_HOOK`, `HOOK_MAPPING_NOT_CONFIGURED`,
 * `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`.
 */
export function warpCount(profile: MachineProfile, cfg: HookMappingConfig): Result<number> {
  const c = checkConfig(profile, cfg);
  if (!c.ok) return c;
  return ok(c.value.readableCount * c.value.threadsPerHook);
}

/**
 * Warp indices driven by one hook, after mirror, sorted ascending.
 * `hook` is a read index in [0, readableCount).
 * Errors, in check order: `INVALID_THREADS_PER_HOOK`, `HOOK_MAPPING_NOT_CONFIGURED`,
 * `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`, `READ_INDEX_OUT_OF_RANGE`.
 */
export function hookWarpIndices(
  profile: MachineProfile,
  cfg: HookMappingConfig,
  hook: ReadIndex,
): Result<readonly WarpIndex[]> {
  const c = checkConfig(profile, cfg);
  if (!c.ok) return c;
  const { readableCount, threadsPerHook: t, kind, mirrored } = c.value;
  if (typeof hook !== "number" || !Number.isInteger(hook) || hook < 0 || hook >= readableCount) {
    return err(
      makeError(
        "READ_INDEX_OUT_OF_RANGE",
        `Hook ${String(hook)} is outside 0 to ${readableCount - 1}.`,
      ),
    );
  }
  const total = readableCount * t;
  const out: number[] = [];
  for (let k = 0; k < t; k++) {
    // UNVERIFIED A5: neither mapping is verified against the paper. See .kiro/steering/jacquard-card-format.md.
    // UNVERIFIED A11: the default of 16 threads per hook may be a machine property rather than a design one.
    const w = kind === "contiguous-visualization" ? hook * t + k : hook + k * readableCount;
    out.push(mirrored ? total - 1 - w : w);
  }
  out.sort((a, b) => a - b);
  return ok(out as unknown as readonly WarpIndex[]);
}

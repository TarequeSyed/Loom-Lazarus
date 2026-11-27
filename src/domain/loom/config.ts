/**
 * Loom configuration (design.md, "Weft colour layer and loom configuration").
 * Signature stubs (task 4.2). Bodies are implemented in task 9.1.
 * Hook mapping and mirror have no default. Only `threadsPerHook` defaults, from the profile.
 */
import { notImplemented } from "../_stub";
import type { MachineProfile } from "../profile/machineProfile";
import type { Result } from "../result";
import type { LoomConfigInput, LoomConfiguration } from "../types";

/**
 * Build a LoomConfiguration. Errors, first failure returned, in check order:
 * `INVALID_THREADS_PER_HOOK` (after defaulting from the profile), `HOOK_MAPPING_NOT_CONFIGURED`,
 * `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`.
 */
export function makeLoomConfig(input: LoomConfigInput, profile: MachineProfile): Result<LoomConfiguration> {
  void input;
  void profile;
  return notImplemented("makeLoomConfig");
}

/**
 * Run the checks on a configuration that did not come through `makeLoomConfig` (for example from JSON).
 * The input is never defaulted.
 *
 * Errors, in check order: `INVALID_FORMAT` (wrong shape or `profileId` mismatch; checked first, since the other
 * checks cannot run on a wrong shape), `INVALID_THREADS_PER_HOOK`, `HOOK_MAPPING_NOT_CONFIGURED`,
 * `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`.
 */
export function validateLoomConfig(cfg: unknown, profile: MachineProfile): Result<LoomConfiguration> {
  void cfg;
  void profile;
  return notImplemented("validateLoomConfig");
}

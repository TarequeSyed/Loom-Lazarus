/**
 * Simulation: pure transitions, no timers (design.md, "Simulation").
 * Signature stubs (task 4.2). Bodies are implemented in tasks 9.3 and 9.4.
 * Replay is `replaySession` in `session/replay.ts`, not here.
 */
import { notImplemented } from "../_stub";
import type { Result } from "../result";
import type { Deck, LoomConfiguration } from "../types";
import type { SimulationState } from "./types";

/**
 * Snapshot the deck and return `passIndex` 0, status `ready`, no rows.
 *
 * Errors, in precondition order: `INVALID_FORMAT` (configuration shape or `profileId` mismatch),
 * `INVALID_THREADS_PER_HOOK`, `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`,
 * `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`, then the interpreter order: `DECK_NOT_APPROVED`,
 * `UNRESOLVED_CELL`, `FABRIC_TOO_LARGE`, `COLOUR_LAYER_OUT_OF_RANGE`, `INVALID_COLOUR_LAYER`.
 */
export function create(deck: Deck, cfg: LoomConfiguration): Result<SimulationState> {
  void deck;
  void cfg;
  return notImplemented("create");
}

/** Append one row. Errors, in check order: `PAUSED` (status paused), `ALREADY_COMPLETE` (status complete). */
export function step(s: SimulationState): Result<SimulationState> {
  void s;
  return notImplemented("step");
}

/** `ready` or `running` becomes `paused`; other statuses are returned unchanged. Never fails. */
export function pause(s: SimulationState): SimulationState {
  void s;
  return notImplemented("pause");
}

/** `paused` becomes `ready` at passIndex 0, else `running`; other statuses unchanged. Never fails. */
export function resume(s: SimulationState): SimulationState {
  void s;
  return notImplemented("resume");
}

/** Equals `reset` followed by `passIndex` calls to `step`. Error: `SEEK_OUT_OF_RANGE` (not an integer in [0, passCount]). */
export function seek(s: SimulationState, passIndex: number): Result<SimulationState> {
  void s;
  void passIndex;
  return notImplemented("seek");
}

/** `passIndex` 0, no rows, status `ready`. Never fails. */
export function reset(s: SimulationState): SimulationState {
  void s;
  return notImplemented("reset");
}

/**
 * `create` followed by steps to completion.
 *
 * Errors: exactly the codes of `create`, in the same order (`INVALID_FORMAT`, `INVALID_THREADS_PER_HOOK`,
 * `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`,
 * `DECK_NOT_APPROVED`, `UNRESOLVED_CELL`, `FABRIC_TOO_LARGE`, `COLOUR_LAYER_OUT_OF_RANGE`,
 * `INVALID_COLOUR_LAYER`). The stepping loop adds none.
 */
export function runToEnd(deck: Deck, cfg: LoomConfiguration): Result<SimulationState> {
  void deck;
  void cfg;
  return notImplemented("runToEnd");
}

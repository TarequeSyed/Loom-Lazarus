/**
 * Interpreter and fabric (design.md, "Interpreter and fabric", "Loom semantics").
 * Signature stubs (task 4.2). Bodies are implemented in task 9.2.
 *
 * Precondition order (first failure returned): (1) configuration validity, the `validateLoomConfig` codes
 * (`INVALID_FORMAT` for a wrong shape or `profileId` mismatch first, then `INVALID_THREADS_PER_HOOK`,
 * `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`);
 * (2) `DECK_NOT_APPROVED`; (3) `UNRESOLVED_CELL`; (4) `FABRIC_TOO_LARGE`;
 * (5) `COLOUR_LAYER_OUT_OF_RANGE`, `INVALID_COLOUR_LAYER`.
 */
import { notImplemented } from "../_stub";
import type { FabricCoordinate, PassIndex, ReadIndex } from "../brand";
import type { MachineProfile } from "../profile/machineProfile";
import type { Result } from "../result";
import type { Bit, Deck, LoomConfiguration } from "../types";
import type { FabricBuffer, FabricCell, FabricRow } from "./types";

/** "warp" iff the coordinate is lifted in a rendered row, otherwise "weft". Never fails. */
export function fabricCellAt(buf: FabricBuffer, c: FabricCoordinate): FabricCell {
  void buf;
  void c;
  return notImplemented("fabricCellAt");
}

/** Rectangular view of the rendered rows, built on demand. Never fails. */
export function fabricToCells(buf: FabricBuffer): readonly (readonly FabricCell[])[] {
  void buf;
  return notImplemented("fabricToCells");
}

/**
 * Card bits ordered by readIndex (1 lifted, 0 down). There is no fallback for an absent value.
 *
 * Errors, in check order: `CARD_INDEX_OUT_OF_RANGE` (cardIndex not an integer in `[0, card count - 1]`, Req 12.11),
 * `UNRESOLVED_CELL` (with card and readIndex).
 */
export function decodeCard(deck: Deck, cardIndex: number): Result<readonly Bit[]> {
  void deck;
  void cardIndex;
  return notImplemented("decodeCard");
}

/**
 * One fabric row for a pass.
 *
 * Errors, in the precondition order above, then `SEEK_OUT_OF_RANGE` (passIndex not an integer in
 * `[0, passCount - 1]`).
 */
export function passResult(deck: Deck, cfg: LoomConfiguration, passIndex: PassIndex): Result<FabricRow> {
  void deck;
  void cfg;
  void passIndex;
  return notImplemented("passResult");
}

/**
 * Fabric coordinate of one thread of one hook in one pass, after hook mapping and mirror.
 *
 * Errors, in check order: the `hookWarpIndices` checks (`INVALID_THREADS_PER_HOOK`, `HOOK_MAPPING_NOT_CONFIGURED`,
 * `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`, `READ_INDEX_OUT_OF_RANGE`),
 * `POSITION_OUT_OF_RANGE` (threadOffset not an integer in `[0, threadsPerHook)`, Req 3.7),
 * `SEEK_OUT_OF_RANGE` (passIndex non-integer or negative, Req 4.11).
 */
export function fabricCoordinate(
  readIndex: ReadIndex,
  threadOffset: number,
  passIndex: PassIndex,
  cfg: LoomConfiguration,
  profile: MachineProfile,
): Result<FabricCoordinate> {
  void readIndex;
  void threadOffset;
  void passIndex;
  void cfg;
  void profile;
  return notImplemented("fabricCoordinate");
}

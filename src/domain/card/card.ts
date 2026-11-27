/**
 * Card construction and read access (design.md, "Deck operations, edits and approval").
 * Signature stubs (task 4.2). Bodies are implemented in task 6.1.
 */
import { notImplemented } from "../_stub";
import type { MachineProfile } from "../profile/machineProfile";
import type { Result } from "../result";
import type { Card, CellInitial, Cell, Deck, EffectiveView, RawObservation } from "../types";

/**
 * Input for one cell. Detection observes holes; it does not evaluate restoration
 * correctness, so a seed carries no numeric confidence (Req 12.2).
 *
 * `initial`, when given, has no `restorationConfidence` field: `createCard` always sets it to `null`.
 * When `initial` is absent, the cell is `observed` if `raw.value` is present, otherwise `ambiguous`
 * with no effective value and evidence "no observation".
 */
export interface CellSeed {
  readonly raw: RawObservation;
  readonly initial?: Omit<CellInitial, "restorationConfidence">;
}

/**
 * Build a Card from observations, one seed per readable position, in readIndex order.
 *
 * Every created cell has `restorationConfidence: null` (not evaluated). It is never `0`, never
 * undefined, and never a number: only `setInferred` assigns a numeric value.
 *
 * Seed provenance is `observed` or `ambiguous` only (Req 12.10).
 *
 * Errors (first failure returned, in check order; no order requirement beyond this list):
 * - `CELL_COUNT_MISMATCH`: `observations.length !== profile.readableCount`.
 * - `INVALID_PROVENANCE`: a seed's initial provenance is not `observed` or `ambiguous`
 *   (`repeat-inferred`, `symmetry-inferred` and `user-edited` are rejected).
 * - `OBSERVED_WITHOUT_OBSERVATION`: a seed asks for `observed` without `raw.value`.
 * - `PROBABILITY_OUT_OF_RANGE`: `raw.holeLikelihood` present but not a finite number in [0, 1].
 * - `EVIDENCE_TOO_LONG`: a seed's evidence text exceeds 1,000 characters.
 */
export function createCard(
  profile: MachineProfile,
  cardId: string,
  observations: readonly CellSeed[],
): Result<Card> {
  void profile;
  void cardId;
  void observations;
  return notImplemented("createCard");
}

/**
 * Look up one cell by card id and readIndex.
 *
 * Errors, in check order: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`.
 */
export function getCell(deck: Deck, cardId: string, readIndex: number): Result<Cell> {
  void deck;
  void cardId;
  void readIndex;
  return notImplemented("getCell");
}

/**
 * Fold a cell's history over its initial state. Derived, never stored. A `null`
 * restorationConfidence stays `null`. Never fails.
 */
export function effectiveView(cell: Cell): EffectiveView {
  void cell;
  return notImplemented("effectiveView");
}

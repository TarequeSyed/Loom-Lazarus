/**
 * Neutral comparison and benchmark hooks (design.md, "Comparison and benchmark hooks (neutral)").
 * Signature stubs (task 4.2). Bodies are implemented in task 6.7.
 * Defines no damage model and creates no randomness (D7).
 */
import { notImplemented } from "../_stub";
import type { ActionId, ReadIndex } from "../brand";
import type { ReportedError, Result } from "../result";
import type { Bit, Deck, RawObservation } from "../types";

/** Deterministic structural equality. Never fails. */
export function deckEquals(a: Deck, b: Deck): boolean {
  void a;
  void b;
  return notImplemented("deckEquals");
}

export interface CellComparison {
  readonly total: number;
  readonly matching: number;
  readonly mismatchTotal: number;
  /** Capped at 1000 entries. */
  readonly mismatches: readonly {
    cardId: string;
    readIndex: ReadIndex;
    truth?: Bit;
    candidate?: Bit;
  }[];
}

/**
 * Compare effective values cell by cell. Requires the same profile id and the same card ids.
 *
 * Errors, in check order: `INVALID_DECK` (either Deck fails `validateDeck`; the report is in the error),
 * `DECK_SHAPE_MISMATCH` (different profile identifiers or different `cardId` lists, Req 12.9).
 */
export function compareCells(truth: Deck, candidate: Deck): Result<CellComparison, ReportedError> {
  void truth;
  void candidate;
  return notImplemented("compareCells");
}

/** Caller supplied, returns a number in [0, 1). */
export type RandomFn = () => number;

export type DamageFn = (
  rng: RandomFn,
  ctx: { cardId: string; readIndex: ReadIndex; raw: RawObservation },
) => RawObservation;

/**
 * Build a fresh Deck whose cells come from the caller's `damage` function, visited in card order then readIndex
 * order. History is empty, `initial` is as in `createCard` (`restorationConfidence: null`), and one `unapproved`
 * record is created. The truth Deck is never modified.
 *
 * Errors, in check order: `INVALID_DECK` (the truth deck fails `validateDeck`; the report is in the error), then the
 * `createCard` codes for a damage result that is not a valid observation: `OBSERVED_WITHOUT_OBSERVATION`,
 * `PROBABILITY_OUT_OF_RANGE`.
 */
export function deriveDamagedDeck(
  truth: Deck,
  damage: DamageFn,
  rng: RandomFn,
  actionId: ActionId,
): Result<Deck, ReportedError> {
  void truth;
  void damage;
  void rng;
  void actionId;
  return notImplemented("deriveDamagedDeck");
}

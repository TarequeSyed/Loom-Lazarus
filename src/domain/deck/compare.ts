/**
 * Neutral comparison and benchmark hooks (design.md, "Comparison and benchmark hooks (neutral)").
 * Signature stubs (task 4.2). Bodies are implemented in task 6.7.
 * Defines no damage model and creates no randomness (D7).
 */
import { notImplemented } from "../_stub";
import type { ActionId, ReadIndex } from "../brand";
import type { Result } from "../result";
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
 * Errors: `INVALID_DECK` (different profile id or card ids), `CELL_COUNT_MISMATCH`.
 */
export function compareCells(truth: Deck, candidate: Deck): Result<CellComparison> {
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
 * Errors: `INVALID_DECK` (the truth deck is invalid), `OBSERVED_WITHOUT_OBSERVATION`, `PROBABILITY_OUT_OF_RANGE`
 * (the damage function returned an invalid observation).
 */
export function deriveDamagedDeck(
  truth: Deck,
  damage: DamageFn,
  rng: RandomFn,
  actionId: ActionId,
): Result<Deck> {
  void truth;
  void damage;
  void rng;
  void actionId;
  return notImplemented("deriveDamagedDeck");
}

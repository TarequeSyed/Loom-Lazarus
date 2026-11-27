/**
 * Auditable cell edits: user edit, undo, inference, withdrawal (design.md, "Deck operations, edits and approval").
 * Signature stubs (task 4.2). Bodies are implemented in tasks 6.2 and 6.3.
 */
import { notImplemented } from "../_stub";
import type { ActionId } from "../brand";
import type { Result } from "../result";
import type { Bit, Cell, Deck, Evidence, InferenceEntry, UserEditEntry } from "../types";

export interface UserEditInput {
  cardId: string;
  readIndex: number;
  value: Bit;
  editNote: string;
  actionId: ActionId;
}

/**
 * Record a human edit. `raw`, `initial`, Restoration_Confidence (including `null`) and Evidence are unchanged.
 * On an approved deck an `unapproved` record (cause `edit`, same actionId) is also appended.
 *
 * Errors, in check order: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`,
 * `EDIT_NOTE_REQUIRED` (empty note), `EVIDENCE_TOO_LONG` (note over 1,000 characters).
 */
export function userEdit(deck: Deck, i: UserEditInput): Result<Deck> {
  void deck;
  void i;
  return notImplemented("userEdit");
}

/**
 * Reverse the latest un-reversed user edit of a cell by appending an `undo` entry. Never reverses an inference
 * (use `withdrawInference`). Restoration_Confidence is untouched.
 *
 * Errors, in check order: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`,
 * `NOTHING_TO_UNDO` (the latest entry is not an un-reversed `user-edit`, including after an undo or a withdrawal).
 */
export function undoEdit(
  deck: Deck,
  i: { cardId: string; readIndex: number; actionId: ActionId },
): Result<Deck> {
  void deck;
  void i;
  return notImplemented("undoEdit");
}

/**
 * Input for `setInferred`. `confidence` is a finite number in [0, 1]. `null` is rejected
 * (an inference is an evaluation). `provenance` is a plain string so invalid values can be reported.
 */
export interface InferenceInput {
  cardId: string;
  readIndex: number;
  actionId: ActionId;
  provenance: string;
  value?: Bit;
  confidence: number;
  evidence: Evidence;
}

/**
 * Append an `inference` entry whose `previous` field holds the view before the call (including a `null`
 * confidence and the earlier evidence). `raw` is untouched.
 *
 * Errors, in check order: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`,
 * `INFERENCE_CANNOT_BE_OBSERVED` (provenance `observed`), `INVALID_PROVENANCE` (not one of the five values, or
 * `user-edited`), `EVIDENCE_REQUIRED`, `EVIDENCE_TOO_LONG`, `PROBABILITY_OUT_OF_RANGE` (`null`, `undefined`,
 * non-number, NaN, infinity or outside [0, 1]), `INVALID_EDIT` (an un-reversed user edit protects the cell).
 */
export function setInferred(deck: Deck, i: InferenceInput): Result<Deck> {
  void deck;
  void i;
  return notImplemented("setInferred");
}

export interface WithdrawalInput {
  cardId: string;
  readIndex: number;
  actionId: ActionId;
}

/**
 * Reverse an accepted inference by appending a `withdrawal` entry that restores the Previous_Fields recorded in
 * the withdrawn inference entry (value or absence, provenance, confidence including `null`, evidence).
 * If the deck is approved, an `unapproved` record (cause `withdrawal`, same actionId) is also appended.
 * No operation reverses a withdrawal.
 *
 * Errors, in check order (first failure returned, deck unchanged): `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`,
 * `DUPLICATE_ACTION_ID`, `INVALID_EDIT` (the latest Live_Entry is a `user-edit`),
 * `NOTHING_TO_WITHDRAW` (no Live_Entry, or the latest Live_Entry is not an `inference`).
 */
export function withdrawInference(deck: Deck, i: WithdrawalInput): Result<Deck> {
  void deck;
  void i;
  return notImplemented("withdrawInference");
}

/**
 * The Live_Entry with the highest sequence, or undefined. A Live_Entry is a `user-edit` entry no `undo` entry
 * references, or an `inference` entry no `withdrawal` entry references. `undo` and `withdrawal` entries are never
 * Live_Entries. Never fails.
 */
export function latestLiveEntry(cell: Cell): UserEditEntry | InferenceEntry | undefined {
  void cell;
  return notImplemented("latestLiveEntry");
}

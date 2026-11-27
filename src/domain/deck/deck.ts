/**
 * Deck construction and structure operations (design.md, "Deck operations, edits and approval").
 * Signature stubs (task 4.2). Bodies are implemented in task 6.4.
 *
 * Structure operations keep each surviving cell byte for byte and append an `unapproved` record
 * (cause `structure`) with the supplied actionId.
 */
import { notImplemented } from "../_stub";
import type { ActionId } from "../brand";
import type { MachineProfile } from "../profile/machineProfile";
import type { Result } from "../result";
import type { Card, Cell, Deck } from "../types";

/**
 * Create a Deck with one `unapproved` record (cause `init`, the supplied actionId, sequence 1),
 * `lastEntrySequence` 0 and `confidenceCalibration` "uncalibrated".
 *
 * Errors, in check order: `DECK_SIZE_OUT_OF_RANGE` (not 1..10,000 cards), `DUPLICATE_CARD_ID`,
 * `CELL_COUNT_MISMATCH` (a card does not have `readableCount` cells), `INVALID_EDIT_HISTORY` (a supplied card has
 * a cell with non-empty history, since the new Deck starts at `lastEntrySequence` 0).
 * (`DUPLICATE_ACTION_ID` does not apply: the new Deck has no history.)
 */
export function createDeck(profile: MachineProfile, cards: readonly Card[], actionId: ActionId): Result<Deck> {
  void profile;
  void cards;
  void actionId;
  return notImplemented("createDeck");
}

/**
 * Reorder cards.
 *
 * Errors, in check order: `DUPLICATE_ACTION_ID`, `INVALID_REORDER` (unknown or repeated cardId, or not a permutation).
 */
export function reorderCards(deck: Deck, order: readonly string[], actionId: ActionId): Result<Deck> {
  void deck;
  void order;
  void actionId;
  return notImplemented("reorderCards");
}

/**
 * Insert a card at position `at` (0..cards.length).
 *
 * A Card with no history is inserted with every field kept. Cards with history are rejected because copying entries
 * would repeat Action_Ids and Sequence_Numbers (Req 6.13).
 *
 * Errors, in check order: `DUPLICATE_ACTION_ID`, `CARD_INDEX_OUT_OF_RANGE` (`at` not an integer in
 * `[0, card count]`, Req 6.14), `CELL_COUNT_MISMATCH` (the card does not have `readableCount` cells),
 * `DUPLICATE_CARD_ID`, `INVALID_EDIT_HISTORY` (any cell of the supplied card has non-empty history),
 * `DECK_SIZE_OUT_OF_RANGE` (result above 10,000 cards).
 */
export function insertCard(deck: Deck, card: Card, at: number, actionId: ActionId): Result<Deck> {
  void deck;
  void card;
  void at;
  void actionId;
  return notImplemented("insertCard");
}

/**
 * Remove a card.
 *
 * Errors, in check order: `DUPLICATE_ACTION_ID`, `UNKNOWN_CARD`, `DECK_SIZE_OUT_OF_RANGE` (removing the last card).
 */
export function removeCard(deck: Deck, cardId: string, actionId: ActionId): Result<Deck> {
  void deck;
  void cardId;
  void actionId;
  return notImplemented("removeCard");
}

/**
 * Duplicate a card under a new id, inserted after the source.
 *
 * A source card with no history is copied with every field kept; one with history is rejected (Req 6.13).
 *
 * Errors, in check order: `DUPLICATE_ACTION_ID`, `UNKNOWN_CARD`, `DUPLICATE_CARD_ID` (newCardId in use),
 * `INVALID_EDIT_HISTORY` (the source card has a cell with non-empty history),
 * `DECK_SIZE_OUT_OF_RANGE` (result above 10,000 cards).
 */
export function duplicateCard(
  deck: Deck,
  cardId: string,
  newCardId: string,
  actionId: ActionId,
): Result<Deck> {
  void deck;
  void cardId;
  void newCardId;
  void actionId;
  return notImplemented("duplicateCard");
}

/**
 * Look up one cell by card id and readIndex.
 *
 * Errors, in check order: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`.
 */
export function getCellByCardAndIndex(deck: Deck, cardId: string, readIndex: number): Result<Cell> {
  void deck;
  void cardId;
  void readIndex;
  return notImplemented("getCellByCardAndIndex");
}

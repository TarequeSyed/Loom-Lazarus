/**
 * Deck JSON export and import (design.md, "JSON serialization").
 * Signature stubs (task 4.2). Bodies are implemented in task 8.1.
 */
import { notImplemented } from "../_stub";
import type { ReportedError, Result } from "../result";
import type { Deck, WeftColourLayer } from "../types";

export interface ImportedDeck {
  readonly deck: Deck;
  readonly weftColourLayer?: WeftColourLayer;
  readonly meta: {
    readonly sourceSchemaVersion: number;
    readonly migrations: readonly string[];
  };
}

/**
 * Write a Deck as canonical JSON (stable key order, two-space indent, `\n`, no timestamps). `restorationConfidence`
 * is always written and `null` is written as `null`, distinct from `0`. Equal Decks give byte-identical text.
 *
 * Errors, in check order: `INVALID_DECK` (the deck fails `validateDeck`; the report is in the error, Req 12.9),
 * `INVALID_COLOUR_LAYER`, `INVALID_FORMAT` (colour layer of another shape, or a non-finite number).
 */
export function exportDeckJson(
  deck: Deck,
  extras?: { weftColourLayer?: WeftColourLayer },
): Result<string, ReportedError> {
  void deck;
  void extras;
  return notImplemented("exportDeckJson");
}

/**
 * Read a deck file. Returns no partial Deck. Errors, in check order: `INPUT_TOO_LARGE` (over 8 MiB, before parsing),
 * `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` (with path), `INVALID_DECK`
 * (with the violation report; a cell without `restorationConfidence` reports `MISSING_REQUIRED_FIELD`).
 */
export function importDeckJson(text: string): Result<ImportedDeck, ReportedError> {
  void text;
  return notImplemented("importDeckJson");
}

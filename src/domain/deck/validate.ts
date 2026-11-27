/**
 * Deck validation (design.md, "Validation").
 * Signature stub (task 4.2). Body is implemented in task 6.6.
 * `validateProfile` already exists in `profile/machineProfile.ts`.
 */
import { notImplemented } from "../_stub";
import type { ReportedError, Result } from "../result";
import type { Deck } from "../types";

/**
 * Validate unknown input as a Deck. Violations are collected (up to 100, with a total count) and the input is never
 * modified, repaired, clamped or defaulted.
 *
 * The wrapper error is `INVALID_DECK` with a report; `report.violations[0].code` carries the specific code. Codes
 * that can appear in the report: `UNSUPPORTED_SCHEMA_VERSION`, `INVALID_PROFILE`, `PROFILE_COUNT_MISMATCH`,
 * `DECK_SIZE_OUT_OF_RANGE`, `DUPLICATE_CARD_ID`, `CELL_COUNT_MISMATCH`, `OBSERVED_WITHOUT_OBSERVATION`,
 * `PROBABILITY_OUT_OF_RANGE`, `MISSING_REQUIRED_FIELD`, `INVALID_PROVENANCE`, `EVIDENCE_REQUIRED`,
 * `EVIDENCE_TOO_LONG`, `INVALID_EDIT_HISTORY`, `UNRESOLVED_CELL` (approved deck with an unresolved cell).
 */
export function validateDeck(d: unknown): Result<Deck, ReportedError> {
  void d;
  return notImplemented("validateDeck");
}

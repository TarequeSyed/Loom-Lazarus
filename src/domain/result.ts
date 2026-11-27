/**
 * Result type, domain errors and the stable error registry (Req 16.1, 16.2).
 * Codes are never renamed or reused. Expected failures return Result, never throw.
 */

export const ERROR_CODES = [
  "UNSUPPORTED_SCHEMA_VERSION",
  "INVALID_FORMAT",
  "INVALID_PROFILE",
  "PROFILE_COUNT_MISMATCH",
  "POSITION_OUT_OF_RANGE",
  "RESERVED_POSITION",
  "READ_INDEX_OUT_OF_RANGE",
  "PHYSICAL_DIMENSIONS_UNAVAILABLE",
  "OBSERVED_WITHOUT_OBSERVATION",
  "PROBABILITY_OUT_OF_RANGE",
  "INVALID_PROVENANCE",
  "INFERENCE_CANNOT_BE_OBSERVED",
  "EDIT_NOTE_REQUIRED",
  "EVIDENCE_REQUIRED",
  "EVIDENCE_TOO_LONG",
  "DUPLICATE_ACTION_ID",
  "NOTHING_TO_UNDO",
  "INVALID_EDIT",
  "INVALID_EDIT_HISTORY",
  "UNKNOWN_CARD",
  "UNRESOLVED_CELLS",
  "UNRESOLVED_CELL",
  "MISSING_REQUIRED_FIELD",
  "INVALID_DECK",
  "DECK_SIZE_OUT_OF_RANGE",
  "DUPLICATE_CARD_ID",
  "CELL_COUNT_MISMATCH",
  "INVALID_REORDER",
  "INPUT_TOO_LARGE",
  "INVALID_JSON",
  "UNKNOWN_FIELD",
  "INVALID_THREADS_PER_HOOK",
  "MIRROR_NOT_CONFIGURED",
  "UNSUPPORTED_MIRROR",
  "HOOK_MAPPING_NOT_CONFIGURED",
  "UNSUPPORTED_HOOK_MAPPING",
  "HOOK_MAPPING_INVALID",
  "DECK_NOT_APPROVED",
  "FABRIC_TOO_LARGE",
  "COLOUR_LAYER_OUT_OF_RANGE",
  "INVALID_COLOUR_LAYER",
  "ALREADY_COMPLETE",
  "PAUSED",
  "SEEK_OUT_OF_RANGE",
  "BITMAP_WIDTH_UNSUPPORTED",
  "BITMAP_HEIGHT_UNSUPPORTED",
  "BITMAP_NOT_BINARY",
  "INVALID_EXPORT_OPTIONS",
  "SESSION_DIGEST_MISMATCH",
  "SESSION_TRUNCATED",
  "SESSION_SEQUENCE_INVALID",
  "SESSION_TOO_LARGE",
  "SESSION_ACTION_INVALID",
  "SESSION_ACTION_FAILED",
  "NOTHING_TO_WITHDRAW",
  "DECK_SHAPE_MISMATCH",
  "CARD_INDEX_OUT_OF_RANGE",
  "INVALID_APPROVAL_HISTORY",
  "OBSERVED_CELL_PROTECTED",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Stable message text per code. A message may append names or numbers after this prefix. */
export const ERROR_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  UNSUPPORTED_SCHEMA_VERSION: "Unsupported schema version.",
  INVALID_FORMAT: "The value does not match the expected format.",
  INVALID_PROFILE: "The machine profile is invalid.",
  PROFILE_COUNT_MISMATCH: "The profile position counts are inconsistent.",
  POSITION_OUT_OF_RANGE: "The grid position is outside the card grid.",
  RESERVED_POSITION: "The grid position is reserved and holds no instruction.",
  READ_INDEX_OUT_OF_RANGE: "The read index is outside the readable positions.",
  PHYSICAL_DIMENSIONS_UNAVAILABLE: "Physical dimensions are not available in the profile.",
  OBSERVED_WITHOUT_OBSERVATION: "A cell cannot be observed without a raw observation.",
  PROBABILITY_OUT_OF_RANGE: "A probability or confidence must be a number in [0, 1].",
  INVALID_PROVENANCE: "The provenance is not valid for this cell.",
  INFERENCE_CANNOT_BE_OBSERVED: "An inference cannot have observed provenance.",
  EDIT_NOTE_REQUIRED: "A non-empty edit note is required.",
  EVIDENCE_REQUIRED: "Non-empty evidence text is required.",
  EVIDENCE_TOO_LONG: "The evidence text is too long.",
  DUPLICATE_ACTION_ID: "The action id has already been used.",
  NOTHING_TO_UNDO: "There is no user edit to undo.",
  INVALID_EDIT: "The edit is not valid.",
  INVALID_EDIT_HISTORY: "The edit history is not valid.",
  UNKNOWN_CARD: "No card with that identifier exists in the deck.",
  UNRESOLVED_CELLS: "The deck has unresolved cells.",
  UNRESOLVED_CELL: "The cell is unresolved.",
  MISSING_REQUIRED_FIELD: "A required field is missing.",
  INVALID_DECK: "The deck is invalid.",
  DECK_SIZE_OUT_OF_RANGE: "The number of cards in the deck is out of range.",
  DUPLICATE_CARD_ID: "A card identifier is used more than once.",
  CELL_COUNT_MISMATCH: "The number of cells does not match the readable position count.",
  INVALID_REORDER: "The reorder request is not a permutation of the deck cards.",
  INPUT_TOO_LARGE: "The input exceeds the size limit.",
  INVALID_JSON: "The text is not valid JSON.",
  UNKNOWN_FIELD: "The input contains an unknown field.",
  INVALID_THREADS_PER_HOOK: "Threads per hook must be a positive integer within the limit.",
  MIRROR_NOT_CONFIGURED: "Mirror handling is not configured.",
  UNSUPPORTED_MIRROR: "The mirror option is not supported by the profile.",
  HOOK_MAPPING_NOT_CONFIGURED: "Hook mapping is not configured.",
  UNSUPPORTED_HOOK_MAPPING: "The hook mapping is not supported by the profile.",
  HOOK_MAPPING_INVALID: "The hook mapping is invalid.",
  DECK_NOT_APPROVED: "The deck is not approved.",
  FABRIC_TOO_LARGE: "The fabric would exceed the size limit.",
  COLOUR_LAYER_OUT_OF_RANGE: "The colour layer references a position outside the fabric.",
  INVALID_COLOUR_LAYER: "The colour layer is invalid.",
  ALREADY_COMPLETE: "The simulation is already complete.",
  PAUSED: "The simulation is paused.",
  SEEK_OUT_OF_RANGE: "The seek target is outside the pass range.",
  BITMAP_WIDTH_UNSUPPORTED: "The bitmap width is not supported.",
  BITMAP_HEIGHT_UNSUPPORTED: "The bitmap height is not supported.",
  BITMAP_NOT_BINARY: "The bitmap contains values other than 0 and 1.",
  INVALID_EXPORT_OPTIONS: "The export options are invalid.",
  SESSION_DIGEST_MISMATCH: "The replayed state does not match the recorded digest.",
  SESSION_TRUNCATED: "The session log is truncated.",
  SESSION_SEQUENCE_INVALID: "The session log sequence numbers are invalid.",
  SESSION_TOO_LARGE: "The session log exceeds the size limit.",
  SESSION_ACTION_INVALID: "A session action is invalid.",
  SESSION_ACTION_FAILED: "A session action failed during replay.",
  NOTHING_TO_WITHDRAW:
    "There is nothing to withdraw: the cell has no live entry, or its latest live entry is not an inference.",
  DECK_SHAPE_MISMATCH: "The decks have different profile identifiers or different card identifier lists.",
  CARD_INDEX_OUT_OF_RANGE: "The card index or insert position is outside the deck.",
  INVALID_APPROVAL_HISTORY: "The approval history is empty or its sequence numbers are not contiguous from 1.",
  OBSERVED_CELL_PROTECTED:
    "An observed cell cannot be changed by an inference; only an explicit user edit may override an observation.",
};

export interface DomainError {
  readonly code: ErrorCode;
  readonly message: string;
  /** e.g. "cards[3].cells[17].initial.restorationConfidence" */
  readonly path?: string;
}

export interface ViolationReport {
  /** At most LIMITS.maxViolations entries. */
  readonly violations: readonly DomainError[];
  /** May exceed violations.length. */
  readonly totalViolations: number;
}

export interface ReportedError extends DomainError {
  readonly report: ViolationReport;
}

export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends DomainError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Build a DomainError with the stable message for the code. `detail` is appended
 * after the fixed prefix; `path` is included only when given.
 */
export function makeError(code: ErrorCode, detail?: string, path?: string): DomainError {
  const message = detail === undefined ? ERROR_MESSAGES[code] : `${ERROR_MESSAGES[code]} ${detail}`;
  return path === undefined ? { code, message } : { code, message, path };
}

/**
 * Deterministic replay (design.md, "Replay algorithm and failure order").
 * Signature stubs (task 4.2). Bodies are implemented in task 14.5.
 * Replay never returns a partial sequence and never modifies the input log.
 */
import { notImplemented } from "../_stub";
import type { ReportedError, Result } from "../result";
import type { SessionLog, SessionState } from "./sessionLog";

/**
 * Replay a log. Returns the initial state followed by one state per action.
 *
 * Errors, in check order: `INVALID_FORMAT` (format or digest algorithm unknown), `UNSUPPORTED_SCHEMA_VERSION`,
 * `UNKNOWN_FIELD` (path), `SESSION_TOO_LARGE` (over 100,000 actions), `SESSION_TRUNCATED` (actionCount differs from
 * actions.length), `SESSION_SEQUENCE_INVALID` (sequence not 1..n or duplicate actionId), `INVALID_DECK` (the initial
 * deck fails validation), then per action: `SESSION_ACTION_INVALID`, `SESSION_ACTION_FAILED` (with the underlying
 * code), `SESSION_DIGEST_MISMATCH` (path of the first mismatching action).
 */
export function replaySession(log: SessionLog): Result<readonly SessionState[], ReportedError> {
  void log;
  return notImplemented("replaySession");
}

/**
 * Parse then replay.
 *
 * Errors, in check order: `INPUT_TOO_LARGE` (over 32 MiB, before parsing), `INVALID_JSON` (including truncated
 * text), then every error `replaySession` can return.
 */
export function replaySessionJson(text: string): Result<readonly SessionState[], ReportedError> {
  void text;
  return notImplemented("replaySessionJson");
}

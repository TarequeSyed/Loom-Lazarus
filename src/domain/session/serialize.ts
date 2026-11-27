/**
 * Session log JSON export and import (design.md, "Session log schema").
 * Signature stubs (task 4.2). Bodies are implemented in task 14.4.
 */
import { notImplemented } from "../_stub";
import type { ReportedError, Result } from "../result";
import type { SessionLog } from "./sessionLog";

/**
 * Write a log as canonical JSON. export, import, export gives identical text.
 *
 * Errors: `SESSION_TRUNCATED` (actionCount differs from actions.length), `INVALID_FORMAT` (non-finite number).
 */
export function exportSessionLog(log: SessionLog): Result<string> {
  void log;
  return notImplemented("exportSessionLog");
}

/**
 * Parse and structurally validate a log. Errors, in check order: `INPUT_TOO_LARGE` (over 32 MiB), `INVALID_JSON`,
 * `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` (path), `SESSION_TOO_LARGE`, `SESSION_TRUNCATED`,
 * `SESSION_SEQUENCE_INVALID`, `INVALID_DECK`.
 */
export function importSessionLog(text: string): Result<SessionLog, ReportedError> {
  void text;
  return notImplemented("importSessionLog");
}

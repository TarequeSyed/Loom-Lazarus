/**
 * Session recording (design.md, "Session log and deterministic replay").
 * Signature stubs (task 4.2). Bodies are implemented in task 14.3.
 */
import { notImplemented } from "../_stub";
import type { Result } from "../result";
import type { Deck, LoomConfiguration } from "../types";
import type { SessionActionInput, SessionLog, SessionState } from "./sessionLog";

export interface RecordingSession {
  readonly log: SessionLog;
  /** State after the last action. */
  readonly state: SessionState;
}

/**
 * Start a recording with `actionCount` 0. The deck is validated first (Req 15.17).
 *
 * Errors: `INVALID_DECK` (with report), plus the loom configuration codes
 * (`INVALID_THREADS_PER_HOOK`, `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`, `MIRROR_NOT_CONFIGURED`,
 * `UNSUPPORTED_MIRROR`) when `config` is supplied and invalid.
 */
export function createSession(deck: Deck, config?: LoomConfiguration): Result<RecordingSession> {
  void deck;
  void config;
  return notImplemented("createSession");
}

/**
 * Apply one action through `applySessionAction`, assign sequence = actionCount + 1, record the state digest and
 * increment `actionCount`. On failure the failed action's error is returned and the log is unchanged.
 *
 * Errors: `DUPLICATE_ACTION_ID` (actionId already in the log), `SESSION_TOO_LARGE` (over 100,000 actions), then every
 * error `applySessionAction` can return.
 */
export function appendAction(s: RecordingSession, input: SessionActionInput): Result<RecordingSession> {
  void s;
  void input;
  return notImplemented("appendAction");
}

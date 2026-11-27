/**
 * The single session action dispatcher, used by both `appendAction` and replay (Req 15.5).
 * Signature stub (task 4.2). Body is implemented in task 14.2.
 */
import { notImplemented } from "../_stub";
import type { Result } from "../result";
import type { SessionActionInput, SessionLogContext, SessionState } from "./sessionLog";

/**
 * Validate the payload shape of one action and apply it through the same pure functions that produced it
 * (`userEdit`, `undoEdit`, `setInferred`, `withdrawInference`, approval, structure operations, simulation
 * transitions). The Session_Action's `actionId` is the Action_Id passed to the deck function.
 *
 * Errors: `SESSION_ACTION_INVALID` (unknown kind or bad payload, checked first), then for a failing deck or
 * simulation operation the underlying error is returned unchanged (`UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`,
 * `DUPLICATE_ACTION_ID`, `INVALID_EDIT`, `NOTHING_TO_UNDO`, `NOTHING_TO_WITHDRAW`, ...). A simulation action before
 * `sim-create`, or `sim-create` with no configuration, returns `SESSION_ACTION_FAILED`. Replay wraps underlying
 * failures as `SESSION_ACTION_FAILED` with the path and underlying code.
 */
export function applySessionAction(
  state: SessionState,
  input: SessionActionInput,
  log: SessionLogContext,
): Result<SessionState> {
  void state;
  void input;
  void log;
  return notImplemented("applySessionAction");
}

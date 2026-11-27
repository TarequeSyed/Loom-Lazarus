/**
 * Approval requests and the audit trail (design.md, "Deck operations, edits and approval").
 * Signature stubs (task 4.2). Bodies are implemented in task 6.5.
 */
import { notImplemented } from "../_stub";
import type { ActionId } from "../brand";
import type { Result } from "../result";
import type { ApprovalRecord, ApprovalState, Deck } from "../types";

/** Explicit policy that resolves unresolved cells as "down" at approval time. */
export interface AmbiguousAsDownPolicy {
  readonly ambiguousAs: "down";
  readonly note: string;
}

/**
 * State of the last approval record. Never fails: it returns no `Result` and has no error codes.
 * A deck with an empty or non-contiguous approval list is rejected by `validateDeck`
 * (`INVALID_APPROVAL_HISTORY`), not here.
 */
export function currentApproval(deck: Deck): ApprovalState {
  void deck;
  return notImplemented("currentApproval");
}

/** The full audit trail, in order, without timestamps. Never fails: no `Result`, no error codes. */
export function approvalHistory(deck: Deck): readonly ApprovalRecord[] {
  void deck;
  return notImplemented("approvalHistory");
}

/**
 * Approve a deck. With no policy, an unresolved cell blocks approval. With the policy, each such cell gets one
 * `inference` entry (value 0, provenance `ambiguous`, confidence and evidence copied from its previous view, a
 * `null` confidence stays `null`, `policyNote` set, derived actionId `"<actionId>#<cardId>#<readIndex>"`).
 * Then an `approved` record (cause `approve`) is appended.
 *
 * Errors, in check order: `DUPLICATE_ACTION_ID`, `UNRESOLVED_CELLS` (up to 100 cell references and a total count;
 * only when no policy is supplied).
 */
export function requestApproval(
  deck: Deck,
  i: { actionId: ActionId; policy?: AmbiguousAsDownPolicy },
): Result<Deck> {
  void deck;
  void i;
  return notImplemented("requestApproval");
}

/**
 * Append an `unapproved` record (cause `revoke`).
 *
 * Errors: `DUPLICATE_ACTION_ID`.
 */
export function revokeApproval(deck: Deck, i: { actionId: ActionId }): Result<Deck> {
  void deck;
  void i;
  return notImplemented("revokeApproval");
}

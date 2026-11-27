/**
 * Session log types (design.md, "Session log and deterministic replay").
 * Type declarations plus the digest algorithm name.
 */
import type { ActionId, SequenceNumber } from "../brand";
import type { SimulationState } from "../loom/types";
import type { Bit, Card, Deck, Evidence, LoomConfiguration } from "../types";

/** Deterministic, non-cryptographic checksum. Detects corruption, is not tamper-proof. */
export const DIGEST_ALGORITHM = "fnv1a-64-v1";

export type SessionActionKind =
  | "user-edit"
  | "undo-edit"
  | "set-inferred"
  | "withdraw-inference"
  | "request-approval"
  | "revoke-approval"
  | "reorder-cards"
  | "insert-card"
  | "remove-card"
  | "duplicate-card"
  | "sim-create"
  | "sim-step"
  | "sim-pause"
  | "sim-resume"
  | "sim-seek"
  | "sim-reset";

export interface UserEditPayload {
  readonly cardId: string;
  readonly readIndex: number;
  readonly value: Bit;
  readonly editNote: string;
}
export interface UndoEditPayload {
  readonly cardId: string;
  readonly readIndex: number;
}
export interface SetInferredPayload {
  readonly cardId: string;
  readonly readIndex: number;
  readonly provenance: string;
  readonly value?: Bit;
  readonly confidence: number;
  readonly evidence: Evidence;
}
export interface WithdrawInferencePayload {
  readonly cardId: string;
  readonly readIndex: number;
}
export interface RequestApprovalPayload {
  readonly policy?: { readonly ambiguousAs: "down"; readonly note: string };
}
export type RevokeApprovalPayload = Record<string, never>;
export interface ReorderCardsPayload {
  readonly order: readonly string[];
}
export interface InsertCardPayload {
  readonly card: Card;
  readonly at: number;
}
export interface RemoveCardPayload {
  readonly cardId: string;
}
export interface DuplicateCardPayload {
  readonly cardId: string;
  readonly newCardId: string;
}
export interface SimCreatePayload {
  /** Defaults to the log's initial configuration. */
  readonly loomConfiguration?: LoomConfiguration;
}
export type SimEmptyPayload = Record<string, never>;
export interface SimSeekPayload {
  readonly passIndex: number;
}

export type SessionPayload =
  | UserEditPayload
  | UndoEditPayload
  | SetInferredPayload
  | WithdrawInferencePayload
  | RequestApprovalPayload
  | RevokeApprovalPayload
  | ReorderCardsPayload
  | InsertCardPayload
  | RemoveCardPayload
  | DuplicateCardPayload
  | SimCreatePayload
  | SimEmptyPayload
  | SimSeekPayload;

export interface SessionAction {
  /** Contiguous from 1. */
  readonly sequence: SequenceNumber;
  /** Unique within the log. */
  readonly actionId: ActionId;
  readonly kind: SessionActionKind;
  readonly payload: SessionPayload;
  /** Digest of the SessionState after this action. No timestamp field exists. */
  readonly stateDigest: string;
}

export interface SessionLog {
  readonly format: "loom-lazarus-session";
  readonly schemaVersion: 1;
  readonly digestAlgorithm: typeof DIGEST_ALGORITHM;
  /** Includes its MachineProfile. */
  readonly initialDeck: Deck;
  readonly initialLoomConfiguration?: LoomConfiguration;
  /** Must equal actions.length. */
  readonly actionCount: number;
  readonly actions: readonly SessionAction[];
}

export interface SessionState {
  readonly deck: Deck;
  /** Present after sim-create. */
  readonly simulation?: SimulationState;
}

/** Log-level context passed to the single action dispatcher. */
export interface SessionLogContext {
  readonly initialLoomConfiguration?: LoomConfiguration;
}

export interface SessionActionInput {
  readonly actionId: ActionId;
  readonly kind: SessionActionKind;
  readonly payload: SessionPayload;
}

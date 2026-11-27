/**
 * Persisted domain types (design.md, "Cells, evidence, history and the Effective_View",
 * "Approval records and the Deck", "Weft colour layer and loom configuration").
 * Type-only module. Every persisted type carries `schemaVersion` except the nested
 * value types that live inside a versioned parent (Cell, entries, records).
 */
import type { ActionId, PassIndex, SequenceNumber, WarpIndex } from "./brand";
import type { HookMappingKind, MachineProfile, MirrorOrientation } from "./profile/machineProfile";

export type Provenance =
  | "observed"
  | "repeat-inferred"
  | "symmetry-inferred"
  | "ambiguous"
  | "user-edited";

/** 1 = lifted, 0 = down. */
export type Bit = 0 | 1;

/** Raw image observation. Never changed after creation. */
export interface RawObservation {
  readonly value?: Bit;
  readonly holeLikelihood?: number;
}

export interface EvidenceRef {
  readonly kind: "card" | "cell" | "period" | "symmetry-axis" | "note";
  readonly cardId?: string;
  readonly readIndex?: number;
  readonly period?: number;
}

/** `text` is at most 1000 characters. */
export interface Evidence {
  readonly text: string;
  readonly refs: readonly EvidenceRef[];
}

/** State at cell creation. Provenance is never "user-edited". */
export interface CellInitial {
  readonly effectiveValue?: Bit;
  readonly provenance: Exclude<Provenance, "user-edited">;
  /** Always present. A number in [0, 1] or null (not evaluated). Never undefined. */
  readonly restorationConfidence: number | null;
  readonly evidence: Evidence;
}

export type ApprovalState = "unapproved" | "approved";

export interface UserEditEntry {
  readonly kind: "user-edit";
  readonly actionId: ActionId;
  readonly sequence: SequenceNumber;
  readonly previousValue?: Bit;
  readonly previousProvenance: Provenance;
  readonly newValue: Bit;
  /** 1..1000 characters, distinct from Evidence. */
  readonly editNote: string;
  /** Deck approval before this edit. */
  readonly approvalBefore: ApprovalState;
}

/** State of the cell immediately before an inference. Confidence may be null and is never coerced to 0. */
export interface PreviousFields {
  /** Absent when the cell had no effective value. */
  readonly value?: Bit;
  readonly provenance: Provenance;
  /** Always present. null = not evaluated. */
  readonly confidence: number | null;
  readonly evidence: Evidence;
}

export interface InferenceEntry {
  readonly kind: "inference";
  readonly actionId: ActionId;
  readonly sequence: SequenceNumber;
  readonly previous: PreviousFields;
  readonly value?: Bit;
  readonly provenance: "repeat-inferred" | "symmetry-inferred" | "ambiguous";
  /** null occurs only on policy entries that copy a previous null. */
  readonly confidence: number | null;
  readonly evidence: Evidence;
  /** Ambiguous-as-down policy note. Lives here, not in Evidence. */
  readonly policyNote?: string;
}

export interface UndoEntry {
  readonly kind: "undo";
  readonly actionId: ActionId;
  readonly sequence: SequenceNumber;
  /** Action id of the reversed user-edit entry. */
  readonly reverses: ActionId;
  readonly restoredValue?: Bit;
  readonly restoredProvenance: Provenance;
}

export interface WithdrawalEntry {
  readonly kind: "withdrawal";
  readonly actionId: ActionId;
  readonly sequence: SequenceNumber;
  /** Action id of the withdrawn inference entry (same cell). */
  readonly reverses: ActionId;
  /** Equals the Previous_Fields of the referenced inference entry. */
  readonly restored: PreviousFields;
}

export type EditEntry = UserEditEntry | InferenceEntry | UndoEntry | WithdrawalEntry;

/** Position in `Card.cells` is the readIndex. */
export interface Cell {
  readonly raw: RawObservation;
  readonly initial: CellInitial;
  /** Append-only. */
  readonly history: readonly EditEntry[];
}

/** Derived, never stored. */
export interface EffectiveView {
  readonly effectiveValue?: Bit;
  readonly provenance: Provenance;
  /** null = not evaluated. Never coerced to 0. */
  readonly restorationConfidence: number | null;
  readonly evidence: Evidence;
  /** From raw. A separate field with a separate UI label. */
  readonly holeLikelihood?: number;
}

export interface ApprovalRecord {
  /** Same action id as the causing action. */
  readonly actionId: ActionId;
  /** Contiguous from 1 within the approvals list. */
  readonly sequence: SequenceNumber;
  readonly state: ApprovalState;
  readonly cause: "init" | "approve" | "revoke" | "edit" | "undo" | "structure" | "withdrawal";
  readonly policyNote?: string;
}

export interface Card {
  readonly schemaVersion: 1;
  /** Caller supplied, unique in the deck. */
  readonly cardId: string;
  /** Length equals profile.readableCount; index equals readIndex. */
  readonly cells: readonly Cell[];
}

export interface Deck {
  readonly schemaVersion: 1;
  readonly profile: MachineProfile;
  /** 1..10,000 cards. Order is pass order. */
  readonly cards: readonly Card[];
  /** Append-only, non-empty. The last record is current. */
  readonly approvals: readonly ApprovalRecord[];
  /** Highest sequence number used by any cell EditEntry in this deck. */
  readonly lastEntrySequence: number;
  readonly confidenceCalibration: "uncalibrated" | { readonly benchmarkRef: string };
}

/** User supplied, never part of a Card. */
export interface WeftColourLayer {
  readonly schemaVersion: 1;
  readonly label: "user-supplied colour layer (not stored on punched cards)";
  readonly passColours: readonly { readonly passIndex: PassIndex; readonly colour: string }[];
  readonly warpColours: readonly { readonly warpIndex: WarpIndex; readonly colour: string }[];
  readonly defaultWeftColour?: string;
  readonly defaultWarpColour?: string;
}

export interface LoomConfiguration {
  readonly schemaVersion: 1;
  readonly profileId: string;
  /** Integer 1..64. */
  readonly threadsPerHook: number;
  /** Explicit, no default. */
  readonly hookMapping: HookMappingKind;
  /** Explicit, no default. */
  readonly mirror: MirrorOrientation;
  readonly colourLayer?: WeftColourLayer;
}

export interface LoomConfigInput {
  threadsPerHook?: number;
  hookMapping?: HookMappingKind;
  mirror?: MirrorOrientation;
  colourLayer?: WeftColourLayer;
}

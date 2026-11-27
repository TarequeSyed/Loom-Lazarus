/**
 * Schema key lists and the schema walk (design.md, "Deck file schema").
 *
 * Every persisted type has an ordered key list. The order is the stable output order of
 * the canonical writer. Each list is checked at compile time to cover every key of its
 * type (`keyList<T>()`), so adding a field to a type without updating the schema fails
 * `npm run typecheck`.
 *
 * `walkSchema` reports `UNKNOWN_FIELD` and `MISSING_REQUIRED_FIELD` with a path, plus
 * `INVALID_FORMAT` for a wrong shape or a non-finite number. It never defaults a missing
 * field: an absent `restorationConfidence` is missing, never `null` and never `0`.
 */
import type { ActionId, SequenceNumber } from "../brand";
import type { SimulationState, FabricBuffer, FabricRow, ResolvedColours } from "../loom/types";
import type {
  CardToPassSpec,
  EndHoleSpec,
  HookMappingSpec,
  MachineProfile,
  PhysicalDimensions,
  ProfileFieldKey,
  ReadOrderSpec,
  ReservedPositionSpec,
  VerificationStatus,
} from "../profile/machineProfile";
import type {
  DuplicateCardPayload,
  InsertCardPayload,
  RemoveCardPayload,
  ReorderCardsPayload,
  RequestApprovalPayload,
  SessionAction,
  SessionActionKind,
  SessionLog,
  SessionState,
  SetInferredPayload,
  SimCreatePayload,
  SimSeekPayload,
  UndoEditPayload,
  UserEditPayload,
  WithdrawInferencePayload,
} from "../session/sessionLog";
import type {
  ApprovalRecord,
  Card,
  Cell,
  CellInitial,
  Deck,
  Evidence,
  EvidenceRef,
  InferenceEntry,
  LoomConfiguration,
  PreviousFields,
  RawObservation,
  UndoEntry,
  UserEditEntry,
  WeftColourLayer,
  WithdrawalEntry,
} from "../types";
import { makeError } from "../result";
import type { DomainError } from "../result";

// Referenced only so the brand imports stay meaningful in type positions below.
export type _SchemaBrands = ActionId | SequenceNumber;

// ---------------------------------------------------------------------------
// Node model
// ---------------------------------------------------------------------------

export interface ScalarNode {
  /** string, boolean or finite number. `null` is rejected. */
  readonly kind: "scalar";
}
export interface NullableNumberNode {
  /** Finite number or the literal `null`. Always written, never omitted. */
  readonly kind: "nullable-number";
}
export interface ArrayNode {
  readonly kind: "array";
  readonly item: SchemaNode;
}
export interface ObjectNode {
  readonly kind: "object";
  /** Stable output order. */
  readonly keys: readonly string[];
  /** Keys that may be absent. Absent optional fields are omitted, never written as `null`. */
  readonly optional: readonly string[];
  /** Keys without an entry are scalars. */
  readonly children: Readonly<Record<string, SchemaNode>>;
}
export interface UnionNode {
  readonly kind: "union";
  /** Picks the node for `value`, given the containing object. Undefined means no match. */
  readonly select: (value: unknown, parent: unknown) => SchemaNode | undefined;
}
export type SchemaNode = ScalarNode | NullableNumberNode | ArrayNode | ObjectNode | UnionNode;

export const SCALAR: ScalarNode = { kind: "scalar" };
export const NULLABLE_NUMBER: NullableNumberNode = { kind: "nullable-number" };

export function arrayOf(item: SchemaNode): ArrayNode {
  return { kind: "array", item };
}

export function unionOf(select: UnionNode["select"]): UnionNode {
  return { kind: "union", select };
}

export function objectNode<const K extends readonly string[]>(
  keys: K,
  options: {
    readonly optional?: readonly K[number][];
    readonly children?: Partial<Record<K[number], SchemaNode>>;
  } = {},
): ObjectNode {
  return {
    kind: "object",
    keys,
    optional: options.optional ?? [],
    children: (options.children ?? {}) as Readonly<Record<string, SchemaNode>>,
  };
}

// ---------------------------------------------------------------------------
// Compile-time key coverage
// ---------------------------------------------------------------------------

type MissingKeys<T, K extends readonly PropertyKey[]> = Exclude<keyof T, K[number]>;
type CoversAll<T, K extends readonly PropertyKey[]> = [MissingKeys<T, K>] extends [never]
  ? unknown
  : { readonly schemaIsMissingKeys: MissingKeys<T, K> };

/**
 * Declares the ordered key list of `T`. Every entry must be a key of `T`, and every key of
 * `T` must be listed, otherwise the call does not compile.
 */
export function keyList<T>() {
  return <const K extends readonly (keyof T & string)[]>(keys: K & CoversAll<T, K>): K => keys;
}

// ---------------------------------------------------------------------------
// Key lists
// ---------------------------------------------------------------------------

export const RAW_OBSERVATION_KEYS = keyList<RawObservation>()(["value", "holeLikelihood"]);
export const EVIDENCE_REF_KEYS = keyList<EvidenceRef>()(["kind", "cardId", "readIndex", "period"]);
export const EVIDENCE_KEYS = keyList<Evidence>()(["text", "refs"]);
export const CELL_INITIAL_KEYS = keyList<CellInitial>()([
  "effectiveValue",
  "provenance",
  "restorationConfidence",
  "evidence",
]);
export const USER_EDIT_ENTRY_KEYS = keyList<UserEditEntry>()([
  "kind",
  "actionId",
  "sequence",
  "previousValue",
  "previousProvenance",
  "newValue",
  "editNote",
  "approvalBefore",
]);
export const PREVIOUS_FIELDS_KEYS = keyList<PreviousFields>()([
  "value",
  "provenance",
  "confidence",
  "evidence",
]);
export const INFERENCE_ENTRY_KEYS = keyList<InferenceEntry>()([
  "kind",
  "actionId",
  "sequence",
  "previous",
  "value",
  "provenance",
  "confidence",
  "evidence",
  "policyNote",
]);
export const UNDO_ENTRY_KEYS = keyList<UndoEntry>()([
  "kind",
  "actionId",
  "sequence",
  "reverses",
  "restoredValue",
  "restoredProvenance",
]);
export const WITHDRAWAL_ENTRY_KEYS = keyList<WithdrawalEntry>()([
  "kind",
  "actionId",
  "sequence",
  "reverses",
  "restored",
]);
export const CELL_KEYS = keyList<Cell>()(["raw", "initial", "history"]);
export const APPROVAL_RECORD_KEYS = keyList<ApprovalRecord>()([
  "actionId",
  "sequence",
  "state",
  "cause",
  "policyNote",
]);
export const CARD_KEYS = keyList<Card>()(["schemaVersion", "cardId", "cells"]);
export const DECK_KEYS = keyList<Deck>()([
  "schemaVersion",
  "profile",
  "cards",
  "approvals",
  "lastEntrySequence",
  "confidenceCalibration",
]);

export const VERIFICATION_STATUS_KEYS = keyList<VerificationStatus>()([
  "status",
  "basis",
  "source",
  "note",
]);
export const RESERVED_POSITION_KEYS = keyList<ReservedPositionSpec>()([
  "gridRow",
  "gridColumn",
  "role",
]);
export const END_HOLE_KEYS = keyList<EndHoleSpec>()([
  "id",
  "description",
  "xMm",
  "yMm",
  "diameterMm",
]);
export const PHYSICAL_DIMENSIONS_KEYS = keyList<PhysicalDimensions>()([
  "cardWidthMm",
  "cardHeightMm",
  "originXMm",
  "originYMm",
  "rowPitchMm",
  "columnPitchMm",
  "holeDiameterMm",
]);
export const HOOK_MAPPING_KEYS = keyList<HookMappingSpec>()(["kind", "verification", "note"]);
export const CARD_TO_PASS_KEYS = keyList<CardToPassSpec>()(["kind"]);
export const READ_ORDER_COLUMN_MAJOR_KEYS = keyList<
  Extract<ReadOrderSpec, { kind: "column-major" }>
>()(["kind", "columnDirection", "rowDirection"]);
export const READ_ORDER_EXPLICIT_KEYS = keyList<Extract<ReadOrderSpec, { kind: "explicit" }>>()([
  "kind",
  "order",
]);
export const READ_ORDER_POSITION_KEYS = keyList<
  Extract<ReadOrderSpec, { kind: "explicit" }>["order"][number]
>()(["gridRow", "gridColumn"]);
export const PROFILE_VERIFICATION_KEYS = keyList<Record<ProfileFieldKey, VerificationStatus>>()([
  "gridSize",
  "reservedPositions",
  "endHoles",
  "readOrder",
  "defaultThreadsPerHook",
  "mirrorOptions",
  "cardToPass",
  "physicalDimensions",
]);
export const MACHINE_PROFILE_KEYS = keyList<MachineProfile>()([
  "schemaVersion",
  "profileId",
  "displayName",
  "gridRows",
  "gridColumns",
  "readableCount",
  "reservedPositions",
  "endHoles",
  "readOrder",
  "hookMappings",
  "defaultThreadsPerHook",
  "mirrorOptions",
  "cardToPass",
  "physicalDimensions",
  "verification",
]);

export const WEFT_COLOUR_LAYER_KEYS = keyList<WeftColourLayer>()([
  "schemaVersion",
  "label",
  "passColours",
  "warpColours",
  "defaultWeftColour",
  "defaultWarpColour",
]);
export const PASS_COLOUR_KEYS = keyList<WeftColourLayer["passColours"][number]>()([
  "passIndex",
  "colour",
]);
export const WARP_COLOUR_KEYS = keyList<WeftColourLayer["warpColours"][number]>()([
  "warpIndex",
  "colour",
]);
export const LOOM_CONFIGURATION_KEYS = keyList<LoomConfiguration>()([
  "schemaVersion",
  "profileId",
  "threadsPerHook",
  "hookMapping",
  "mirror",
  "colourLayer",
]);

export const FABRIC_ROW_KEYS = keyList<FabricRow>()(["passIndex", "liftedHooks", "liftedWarpIndices"]);
export const RESOLVED_COLOURS_KEYS = keyList<ResolvedColours>()([
  "label",
  "warpColourByIndex",
  "weftColourByPass",
]);
export const FABRIC_BUFFER_KEYS = keyList<FabricBuffer>()([
  "warpCount",
  "passCount",
  "rows",
  "colours",
  "disclaimer",
]);
export const SIMULATION_STATE_KEYS = keyList<SimulationState>()([
  "schemaVersion",
  "deck",
  "config",
  "passIndex",
  "status",
  "fabric",
  "disclaimer",
]);

export const USER_EDIT_PAYLOAD_KEYS = keyList<UserEditPayload>()([
  "cardId",
  "readIndex",
  "value",
  "editNote",
]);
export const UNDO_EDIT_PAYLOAD_KEYS = keyList<UndoEditPayload>()(["cardId", "readIndex"]);
export const SET_INFERRED_PAYLOAD_KEYS = keyList<SetInferredPayload>()([
  "cardId",
  "readIndex",
  "provenance",
  "value",
  "confidence",
  "evidence",
]);
export const WITHDRAW_INFERENCE_PAYLOAD_KEYS = keyList<WithdrawInferencePayload>()([
  "cardId",
  "readIndex",
]);
export const REQUEST_APPROVAL_PAYLOAD_KEYS = keyList<RequestApprovalPayload>()(["policy"]);
export const APPROVAL_POLICY_KEYS = keyList<NonNullable<RequestApprovalPayload["policy"]>>()([
  "ambiguousAs",
  "note",
]);
export const REORDER_CARDS_PAYLOAD_KEYS = keyList<ReorderCardsPayload>()(["order"]);
export const INSERT_CARD_PAYLOAD_KEYS = keyList<InsertCardPayload>()(["card", "at"]);
export const REMOVE_CARD_PAYLOAD_KEYS = keyList<RemoveCardPayload>()(["cardId"]);
export const DUPLICATE_CARD_PAYLOAD_KEYS = keyList<DuplicateCardPayload>()([
  "cardId",
  "newCardId",
]);
export const SIM_CREATE_PAYLOAD_KEYS = keyList<SimCreatePayload>()(["loomConfiguration"]);
export const SIM_SEEK_PAYLOAD_KEYS = keyList<SimSeekPayload>()(["passIndex"]);
export const SESSION_ACTION_KEYS = keyList<SessionAction>()([
  "sequence",
  "actionId",
  "kind",
  "payload",
  "stateDigest",
]);
export const SESSION_LOG_KEYS = keyList<SessionLog>()([
  "format",
  "schemaVersion",
  "digestAlgorithm",
  "initialDeck",
  "initialLoomConfiguration",
  "actionCount",
  "actions",
]);
export const SESSION_STATE_KEYS = keyList<SessionState>()(["deck", "simulation"]);

/** Top-level keys of the deck file (design.md "Deck file schema"). Not a domain type. */
export const DECK_FILE_KEYS = ["format", "schemaVersion", "deck", "weftColourLayer"] as const;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export const EVIDENCE_REF_NODE = objectNode(EVIDENCE_REF_KEYS, {
  optional: ["cardId", "readIndex", "period"],
});
export const EVIDENCE_NODE = objectNode(EVIDENCE_KEYS, {
  children: { refs: arrayOf(EVIDENCE_REF_NODE) },
});
export const RAW_OBSERVATION_NODE = objectNode(RAW_OBSERVATION_KEYS, {
  optional: ["value", "holeLikelihood"],
});
/** `restorationConfidence` is required and nullable: always written, `null` stays `null`. */
export const CELL_INITIAL_NODE = objectNode(CELL_INITIAL_KEYS, {
  optional: ["effectiveValue"],
  children: { restorationConfidence: NULLABLE_NUMBER, evidence: EVIDENCE_NODE },
});
export const PREVIOUS_FIELDS_NODE = objectNode(PREVIOUS_FIELDS_KEYS, {
  optional: ["value"],
  children: { confidence: NULLABLE_NUMBER, evidence: EVIDENCE_NODE },
});
const USER_EDIT_ENTRY_NODE = objectNode(USER_EDIT_ENTRY_KEYS, { optional: ["previousValue"] });
const INFERENCE_ENTRY_NODE = objectNode(INFERENCE_ENTRY_KEYS, {
  optional: ["value", "policyNote"],
  children: {
    previous: PREVIOUS_FIELDS_NODE,
    confidence: NULLABLE_NUMBER,
    evidence: EVIDENCE_NODE,
  },
});
const UNDO_ENTRY_NODE = objectNode(UNDO_ENTRY_KEYS, { optional: ["restoredValue"] });
const WITHDRAWAL_ENTRY_NODE = objectNode(WITHDRAWAL_ENTRY_KEYS, {
  children: { restored: PREVIOUS_FIELDS_NODE },
});
const EDIT_ENTRY_BY_KIND: Readonly<Record<string, ObjectNode>> = {
  "user-edit": USER_EDIT_ENTRY_NODE,
  inference: INFERENCE_ENTRY_NODE,
  undo: UNDO_ENTRY_NODE,
  withdrawal: WITHDRAWAL_ENTRY_NODE,
};

function kindOf(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const kind = (value as Record<string, unknown>)["kind"];
  return typeof kind === "string" && Object.hasOwn(EDIT_ENTRY_BY_KIND_ANY, kind) ? kind : undefined;
}
const EDIT_ENTRY_BY_KIND_ANY: Readonly<Record<string, true>> = {
  "user-edit": true,
  inference: true,
  undo: true,
  withdrawal: true,
  "column-major": true,
  explicit: true,
};

export const EDIT_ENTRY_NODE = unionOf((value) => {
  const kind = kindOf(value);
  return kind === undefined ? undefined : EDIT_ENTRY_BY_KIND[kind];
});

export const CELL_NODE = objectNode(CELL_KEYS, {
  children: {
    raw: RAW_OBSERVATION_NODE,
    initial: CELL_INITIAL_NODE,
    history: arrayOf(EDIT_ENTRY_NODE),
  },
});
export const APPROVAL_RECORD_NODE = objectNode(APPROVAL_RECORD_KEYS, { optional: ["policyNote"] });

const VERIFICATION_STATUS_NODE = objectNode(VERIFICATION_STATUS_KEYS, {
  optional: ["source", "note"],
});
const READ_ORDER_NODE = unionOf((value) => {
  const kind = kindOf(value);
  if (kind === "column-major") return objectNode(READ_ORDER_COLUMN_MAJOR_KEYS);
  if (kind === "explicit") {
    return objectNode(READ_ORDER_EXPLICIT_KEYS, {
      children: { order: arrayOf(objectNode(READ_ORDER_POSITION_KEYS)) },
    });
  }
  return undefined;
});
export const MACHINE_PROFILE_NODE = objectNode(MACHINE_PROFILE_KEYS, {
  optional: ["endHoles", "physicalDimensions"],
  children: {
    reservedPositions: arrayOf(objectNode(RESERVED_POSITION_KEYS)),
    endHoles: arrayOf(objectNode(END_HOLE_KEYS, { optional: ["xMm", "yMm", "diameterMm"] })),
    readOrder: READ_ORDER_NODE,
    hookMappings: arrayOf(
      objectNode(HOOK_MAPPING_KEYS, {
        optional: ["note"],
        children: { verification: VERIFICATION_STATUS_NODE },
      }),
    ),
    mirrorOptions: arrayOf(SCALAR),
    cardToPass: objectNode(CARD_TO_PASS_KEYS),
    physicalDimensions: objectNode(PHYSICAL_DIMENSIONS_KEYS),
    verification: objectNode(PROFILE_VERIFICATION_KEYS, {
      children: Object.fromEntries(
        PROFILE_VERIFICATION_KEYS.map((key) => [key, VERIFICATION_STATUS_NODE]),
      ),
    }),
  },
});

const CALIBRATION_NODE = unionOf((value) => {
  if (typeof value === "string") return SCALAR;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) return CALIBRATION_REF_NODE;
  return undefined;
});
const CALIBRATION_REF_NODE = objectNode(["benchmarkRef"] as const);

/** Card, including `schemaVersion` (embedded in a session log or digest input). */
export const CARD_NODE = objectNode(CARD_KEYS, { children: { cells: arrayOf(CELL_NODE) } });
/** Card as written in the deck file: the file carries one top-level `schemaVersion`. */
export const FILE_CARD_NODE = objectNode(["cardId", "cells"] as const, {
  children: { cells: arrayOf(CELL_NODE) },
});

function deckNode(card: ObjectNode, withSchemaVersion: boolean): ObjectNode {
  return {
    kind: "object",
    keys: withSchemaVersion ? DECK_KEYS : DECK_KEYS.filter((key) => key !== "schemaVersion"),
    optional: [],
    children: {
      profile: MACHINE_PROFILE_NODE,
      cards: arrayOf(card),
      approvals: arrayOf(APPROVAL_RECORD_NODE),
      confidenceCalibration: CALIBRATION_NODE,
    },
  };
}
/** Full Deck including `schemaVersion` on the deck and on each card. Used by session log and digest. */
export const DECK_NODE = deckNode(CARD_NODE, true);
/** Deck body inside the deck file. `schemaVersion` lives at the file top level only. */
export const FILE_DECK_NODE = deckNode(FILE_CARD_NODE, false);

export const WEFT_COLOUR_LAYER_NODE = objectNode(WEFT_COLOUR_LAYER_KEYS, {
  optional: ["defaultWeftColour", "defaultWarpColour"],
  children: {
    passColours: arrayOf(objectNode(PASS_COLOUR_KEYS)),
    warpColours: arrayOf(objectNode(WARP_COLOUR_KEYS)),
  },
});
export const LOOM_CONFIGURATION_NODE = objectNode(LOOM_CONFIGURATION_KEYS, {
  optional: ["colourLayer"],
  children: { colourLayer: WEFT_COLOUR_LAYER_NODE },
});

/** Deck file wrapper: `{ format, schemaVersion, deck, weftColourLayer? }`. */
export const DECK_FILE_NODE = objectNode(DECK_FILE_KEYS, {
  optional: ["weftColourLayer"],
  children: { deck: FILE_DECK_NODE, weftColourLayer: WEFT_COLOUR_LAYER_NODE },
});

export const FABRIC_BUFFER_NODE = objectNode(FABRIC_BUFFER_KEYS, {
  optional: ["colours"],
  children: {
    rows: arrayOf(
      objectNode(FABRIC_ROW_KEYS, {
        children: { liftedHooks: arrayOf(SCALAR), liftedWarpIndices: arrayOf(SCALAR) },
      }),
    ),
    colours: objectNode(RESOLVED_COLOURS_KEYS, {
      children: { warpColourByIndex: arrayOf(SCALAR), weftColourByPass: arrayOf(SCALAR) },
    }),
  },
});
export const SIMULATION_STATE_NODE = objectNode(SIMULATION_STATE_KEYS, {
  children: { deck: DECK_NODE, config: LOOM_CONFIGURATION_NODE, fabric: FABRIC_BUFFER_NODE },
});
export const SESSION_STATE_NODE = objectNode(SESSION_STATE_KEYS, {
  optional: ["simulation"],
  children: { deck: DECK_NODE, simulation: SIMULATION_STATE_NODE },
});

const EMPTY_PAYLOAD_NODE = objectNode([] as const);
/** Exhaustive over `SessionActionKind`: adding a kind without a payload schema fails to compile. */
const PAYLOAD_BY_KIND: Readonly<Record<SessionActionKind, ObjectNode>> = {
  "user-edit": objectNode(USER_EDIT_PAYLOAD_KEYS),
  "undo-edit": objectNode(UNDO_EDIT_PAYLOAD_KEYS),
  "set-inferred": objectNode(SET_INFERRED_PAYLOAD_KEYS, {
    optional: ["value"],
    children: { evidence: EVIDENCE_NODE },
  }),
  "withdraw-inference": objectNode(WITHDRAW_INFERENCE_PAYLOAD_KEYS),
  "request-approval": objectNode(REQUEST_APPROVAL_PAYLOAD_KEYS, {
    optional: ["policy"],
    children: { policy: objectNode(APPROVAL_POLICY_KEYS) },
  }),
  "revoke-approval": EMPTY_PAYLOAD_NODE,
  "reorder-cards": objectNode(REORDER_CARDS_PAYLOAD_KEYS, { children: { order: arrayOf(SCALAR) } }),
  "insert-card": objectNode(INSERT_CARD_PAYLOAD_KEYS, { children: { card: CARD_NODE } }),
  "remove-card": objectNode(REMOVE_CARD_PAYLOAD_KEYS),
  "duplicate-card": objectNode(DUPLICATE_CARD_PAYLOAD_KEYS),
  "sim-create": objectNode(SIM_CREATE_PAYLOAD_KEYS, {
    optional: ["loomConfiguration"],
    children: { loomConfiguration: LOOM_CONFIGURATION_NODE },
  }),
  "sim-step": EMPTY_PAYLOAD_NODE,
  "sim-pause": EMPTY_PAYLOAD_NODE,
  "sim-resume": EMPTY_PAYLOAD_NODE,
  "sim-seek": objectNode(SIM_SEEK_PAYLOAD_KEYS),
  "sim-reset": EMPTY_PAYLOAD_NODE,
};
export const SESSION_PAYLOAD_NODE = unionOf((_value, parent) => {
  if (typeof parent !== "object" || parent === null) return undefined;
  const kind = (parent as Record<string, unknown>)["kind"];
  return typeof kind === "string" && Object.hasOwn(PAYLOAD_BY_KIND, kind)
    ? PAYLOAD_BY_KIND[kind as SessionActionKind]
    : undefined;
});
export const SESSION_ACTION_NODE = objectNode(SESSION_ACTION_KEYS, {
  children: { payload: SESSION_PAYLOAD_NODE },
});
export const SESSION_LOG_NODE = objectNode(SESSION_LOG_KEYS, {
  optional: ["initialLoomConfiguration"],
  children: {
    initialDeck: DECK_NODE,
    initialLoomConfiguration: LOOM_CONFIGURATION_NODE,
    actions: arrayOf(SESSION_ACTION_NODE),
  },
});

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

function walk(
  value: unknown,
  node: SchemaNode,
  path: string,
  parent: unknown,
  out: DomainError[],
): void {
  switch (node.kind) {
    case "scalar": {
      const ok =
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value));
      if (!ok) out.push(makeError("INVALID_FORMAT", describe(value, "a string, boolean or finite number"), path));
      return;
    }
    case "nullable-number": {
      const ok = value === null || (typeof value === "number" && Number.isFinite(value));
      if (!ok) out.push(makeError("INVALID_FORMAT", describe(value, "a finite number or null"), path));
      return;
    }
    case "array": {
      if (!Array.isArray(value)) {
        out.push(makeError("INVALID_FORMAT", describe(value, "an array"), path));
        return;
      }
      for (let index = 0; index < value.length; index += 1) {
        walk(value[index], node.item, `${path}[${index}]`, value, out);
      }
      return;
    }
    case "union": {
      const chosen = node.select(value, parent);
      if (chosen === undefined) {
        out.push(makeError("INVALID_FORMAT", "No schema variant matches this value.", path));
        return;
      }
      walk(value, chosen, path, parent, out);
      return;
    }
    case "object": {
      if (!isRecord(value)) {
        out.push(makeError("INVALID_FORMAT", describe(value, "an object"), path));
        return;
      }
      for (const key of Object.keys(value)) {
        if (!node.keys.includes(key)) {
          out.push(makeError("UNKNOWN_FIELD", `Field "${key}".`, joinPath(path, key)));
        }
      }
      for (const key of node.keys) {
        const child = value[key];
        const childPath = joinPath(path, key);
        if (child === undefined) {
          if (!node.optional.includes(key)) {
            out.push(makeError("MISSING_REQUIRED_FIELD", `Field "${key}".`, childPath));
          }
          continue;
        }
        walk(child, node.children[key] ?? SCALAR, childPath, value, out);
      }
      return;
    }
  }
}

function describe(value: unknown, expected: string): string {
  if (typeof value === "number") return `Expected ${expected}, got the non-finite number ${String(value)}.`;
  const actual = value === null ? "null" : Array.isArray(value) ? "an array" : typeof value;
  return `Expected ${expected}, got ${actual}.`;
}

/**
 * Walks `value` against `node` and returns every problem, in document order:
 * `UNKNOWN_FIELD` (path of the unknown field), `MISSING_REQUIRED_FIELD` (path of the absent
 * field) and `INVALID_FORMAT` (wrong shape, `null` in a non-nullable place, or a
 * non-finite number). An empty list means the value conforms. Never throws, never mutates.
 */
export function walkSchema(value: unknown, node: SchemaNode, rootPath = ""): DomainError[] {
  const out: DomainError[] = [];
  walk(value, node, rootPath, undefined, out);
  return out;
}

/** The `UNKNOWN_FIELD` subset of {@link walkSchema}. */
export function findUnknownFields(value: unknown, node: SchemaNode, rootPath = ""): DomainError[] {
  return walkSchema(value, node, rootPath).filter((error) => error.code === "UNKNOWN_FIELD");
}

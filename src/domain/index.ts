// Single public export surface of the domain layer (Req 12.1).
// Changing an exported signature after the interface freeze requires a spec update (Req 12.6).

export const INTERFACE_VERSION = "1.1.0";

// Core types
export type {
  Provenance,
  Bit,
  RawObservation,
  EvidenceRef,
  Evidence,
  CellInitial,
  ApprovalState,
  UserEditEntry,
  PreviousFields,
  InferenceEntry,
  UndoEntry,
  WithdrawalEntry,
  EditEntry,
  Cell,
  EffectiveView,
  ApprovalRecord,
  Card,
  Deck,
  WeftColourLayer,
  LoomConfiguration,
  LoomConfigInput,
} from "./types";

// Result and error registry
export { ERROR_CODES, ERROR_MESSAGES, ok, err, makeError } from "./result";
export type { ErrorCode, DomainError, ViolationReport, ReportedError, Result } from "./result";

// Branded coordinates
export {
  asGridRow,
  asGridColumn,
  asReadIndex,
  asWarpIndex,
  asPassIndex,
  asMillimetres,
  asActionId,
  asSequenceNumber,
} from "./brand";
export type {
  GridRow,
  GridColumn,
  ReadIndex,
  WarpIndex,
  PassIndex,
  Millimetres,
  ActionId,
  SequenceNumber,
  GridPosition,
  PhysicalLocation,
  FabricCoordinate,
} from "./brand";

// Limits
export { LIMITS, SUPPORTED_SCHEMA_VERSIONS } from "./limits";

// Canonical JSON and schema node type
export { writeCanonicalJson } from "./io/canonicalJson";
export type { SchemaNode } from "./io/schema";

// Deck import and export, migration
export { exportDeckJson, importDeckJson } from "./io/serialize";
export type { ImportedDeck } from "./io/serialize";
export { migrateToCurrent } from "./io/migrate";
export type { MigrationOutcome } from "./io/migrate";

// Machine profile
export { GARIN_PROFILE } from "./profile/garinProfile";
export { validateProfile, compileProfile } from "./profile/machineProfile";
export type {
  VerificationStatus,
  ProfileFieldKey,
  ReservedPositionSpec,
  EndHoleSpec,
  MirrorOrientation,
  CardToPassSpec,
  PhysicalDimensions,
  HookMappingKind,
  HookMappingSpec,
  ReadOrderSpec,
  MachineProfile,
  CompiledGridPosition,
  CompiledProfile,
} from "./profile/machineProfile";
export { gridToReadIndex, readIndexToGrid, gridToPhysical } from "./profile/readOrder";
export { warpCount, hookWarpIndices } from "./profile/hookMapping";
export type { HookMappingConfig } from "./profile/hookMapping";

// Loom
export { makeLoomConfig, validateLoomConfig } from "./loom/config";
export { SIMULATION_DISCLAIMER } from "./loom/disclaimer";
export {
  fabricCellAt,
  fabricToCells,
  decodeCard,
  passResult,
  fabricCoordinate,
} from "./loom/interpreter";
export { create, step, pause, resume, seek, reset, runToEnd } from "./loom/simulation";
export type {
  SimulationDisclaimerText,
  FabricCell,
  FabricRow,
  ResolvedColours,
  FabricBuffer,
  RunStatus,
  SimulationState,
} from "./loom/types";

// Cards and edits
export { createCard, getCell, effectiveView } from "./card/card";
export type { CellSeed } from "./card/card";
export {
  userEdit,
  undoEdit,
  setInferred,
  withdrawInference,
  latestLiveEntry,
} from "./card/edit";
export type { UserEditInput, InferenceInput, WithdrawalInput } from "./card/edit";

// Decks
export {
  createDeck,
  reorderCards,
  insertCard,
  removeCard,
  duplicateCard,
  getCellByCardAndIndex,
} from "./deck/deck";
export { validateDeck } from "./deck/validate";
export { currentApproval, approvalHistory, requestApproval, revokeApproval } from "./deck/approval";
export type { AmbiguousAsDownPolicy } from "./deck/approval";
export { deckEquals, compareCells, deriveDamagedDeck } from "./deck/compare";
export type { CellComparison, RandomFn, DamageFn } from "./deck/compare";

// Bitmap
export { bitmapToDeck } from "./bitmap/bitmapToDeck";
export type { Bitmap } from "./bitmap/bitmapToDeck";

// Session
export { applySessionAction } from "./session/apply";
export { stateDigest } from "./session/digest";
export { DIGEST_ALGORITHM } from "./session/sessionLog";
export type {
  SessionActionKind,
  UserEditPayload,
  UndoEditPayload,
  SetInferredPayload,
  WithdrawInferencePayload,
  RequestApprovalPayload,
  RevokeApprovalPayload,
  ReorderCardsPayload,
  InsertCardPayload,
  RemoveCardPayload,
  DuplicateCardPayload,
  SimCreatePayload,
  SimEmptyPayload,
  SimSeekPayload,
  SessionPayload,
  SessionAction,
  SessionLog,
  SessionState,
  SessionLogContext,
  SessionActionInput,
} from "./session/sessionLog";
export { createSession, appendAction } from "./session/record";
export type { RecordingSession } from "./session/record";
export { replaySession, replaySessionJson } from "./session/replay";
export { exportSessionLog, importSessionLog } from "./session/serialize";

// SVG export
export { exportCardSvg, exportDeckSvg, SVG_CAVEAT } from "./svg/exportSvg";
export type { SvgExportOptions } from "./svg/exportSvg";

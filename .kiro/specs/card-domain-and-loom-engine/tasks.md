# Implementation Plan: Card Domain and Loom Engine

## Overview

This plan implements the Card_Domain_Library in `src/domain` as strict TypeScript with Vitest and fast-check, following `design.md`. It is ordered so that interfaces come first (types, MachineProfile, Result and error registry, coordinate mappings, canonical JSON, signature stubs, public index), then an explicit **Interface freeze** checkpoint (task 5). After the freeze, signatures change only through a spec update (Req 12.6).

Work after the freeze is split into groups:

- **Core deck work (task 6):** one worker, sequential. It blocks everything after it.
- **Group B (tasks 8 to 12): Crew-delegable.** Each task owns a disjoint set of files and tests, shares no mutable state, and depends only on frozen interfaces plus the core deck work.
- **Group C (task 14): Crew-delegable** once Group B's loom and JSON work is merged (task 13).
- Golden tests, integration and the final checkpoint run after merging (tasks 15 to 17).

Out of scope here (other specs): browser UI, vision, restoration, benchmark implementation, damage models.

Conventions for every task:
- Do not use `Date`, `Math.random`, DOM or network APIs inside `src/domain` (Req 1.5).
- Each property test is a single `fc.assert(fc.property(...), { seed, numRuns })`, with `numRuns` at most 500, the seed taken from `src/domain/__tests__/seeds.ts`, and a tag comment `// Feature: card-domain-and-loom-engine, Property N: <title>` plus an adjacent precondition and seed comment (Req 13.1, 13.2, 13.20).
- Code that depends on an unverified assumption carries `// UNVERIFIED A<n>: see .kiro/steering/jacquard-card-format.md`.
- A worker only edits the files its task lists as owned. Shared files are frozen after task 5.
- Run tests with `vitest --run`, not watch mode.
- Restoration_Confidence is typed `number | null` and always present. `null` means "not evaluated" and is never coerced to `0`, defaulted, or treated as missing; a missing or `undefined` field is `MISSING_REQUIRED_FIELD`. Only `setInferred` (numeric, in [0, 1]) and the bitmap converter (value 1) assign a number; `createCard` from detection-style seeds assigns `null` (Req 5.1, 12.2, 17). `withdrawInference` changes a confidence only by restoring the value recorded in the Previous_Fields of the withdrawn inference (a number or `null`, never coerced to `0`) (Req 5.30, 17.8).
- Inferences are reversed only by `withdrawInference` (append-only `withdrawal` entry); undo covers `user-edit` entries only. Nothing reverses a withdrawal; a new inference sets a value again (Req 5.16, 5.33).

## Tasks

- [ ] 1. Project scaffold and shared primitives
  - [ ] 1.1 Create the TypeScript, Vitest and fast-check scaffold
    - Add `package.json`, strict `tsconfig.json` and Vitest configuration with scripts `test` (`vitest --run`) and `typecheck`; add dependencies `typescript`, `vitest`, `fast-check`.
    - Create the `src/domain` folder skeleton from the design's module layout and `src/domain/__tests__/`.
    - Create `src/domain/__tests__/seeds.ts` with distinct seed constants `20260101` to `20260129` named `SEED_P1` to `SEED_P29` (`20260100 + n`; P25 to P29 are the withdrawal properties).
    - Create a `deepFreeze` and `cloneBefore` test helper in `src/domain/__tests__/helpers.ts` used to detect input mutation.
    - Files owned: `package.json`, `tsconfig.json`, Vitest config, `src/domain/__tests__/seeds.ts`, `src/domain/__tests__/helpers.ts`.
    - _Requirements: 13.1, 13.3, 16.3_

  - [ ] 1.2 Write the import-boundary test
    - Create `src/domain/__tests__/boundary.test.ts` using the TypeScript compiler API to scan every `.ts` file under `src/domain`, tests included.
    - Fail on imports resolving to `src/vision`, `src/restore`, `src/benchmark`, `src/ui` or `src/workers` (relative or alias form).
    - Fail on the identifiers `document`, `window`, `fetch`, `XMLHttpRequest`, `Date`, `Math.random`, `performance.now`, `setTimeout`, `setInterval`.
    - Add a negative self-test that feeds an in-memory violating source and expects failure.
    - _Requirements: 1.5, 1.6, 1.8_

  - [ ] 1.3 Implement Result, branded coordinate types, limits and the error registry
    - Create `result.ts` (`Result`, `DomainError`, `ViolationReport`, `ReportedError`, `ok`/`err` helpers, `ERROR_CODES` tuple with all codes from Req 16.1 including `MISSING_REQUIRED_FIELD`, derived `ErrorCode`, `ERROR_MESSAGES` with stable text per code).
    - Create `brand.ts` (`GridRow`, `GridColumn`, `ReadIndex`, `WarpIndex`, `PassIndex`, `Millimetres`, `ActionId`, `SequenceNumber`, and `as*` constructors returning `Result`).
    - Create `limits.ts` with the `LIMITS` constant and `SUPPORTED_SCHEMA_VERSIONS = [1]`.
    - Include `NOTHING_TO_WITHDRAW` in `ERROR_CODES` and `ERROR_MESSAGES` (the cell has no Live_Entry, or its latest Live_Entry is not an `inference` entry).
    - Write unit tests: codes are unique, every code (including `MISSING_REQUIRED_FIELD` and `NOTHING_TO_WITHDRAW`) has a non-empty message, and a `// @ts-expect-error` test shows a `ReadIndex` is not accepted where a `GridRow` is expected.
    - Files owned: `result.ts`, `brand.ts`, `limits.ts`, `src/domain/__tests__/result.test.ts`.
    - _Requirements: 1.3, 3.6, 5.28, 7.13, 16.1, 16.2, 17.2_

- [ ] 2. Domain types and machine profile
  - [ ] 2.1 Define the persisted domain types
    - Create `types.ts` with `Provenance`, `Bit`, `RawObservation`, `EvidenceRef`, `Evidence`, `CellInitial`, `UserEditEntry`, `PreviousFields` (value or absence, provenance, `confidence: number | null` always present, evidence), `InferenceEntry` (with required `previous: PreviousFields`), `UndoEntry`, `WithdrawalEntry` (`reverses` action id, `restored: PreviousFields`), `EditEntry` (union of all four), `Cell`, `EffectiveView`, `ApprovalState`, `ApprovalRecord` (cause includes `withdrawal`), `Card`, `Deck`, `WeftColourLayer`, `LoomConfiguration`, `LoomConfigInput`, each persisted type carrying `schemaVersion`.
    - Type `restorationConfidence` as `number | null` (required, never optional) on `CellInitial` and `EffectiveView`, and `confidence` as `number | null` on `InferenceEntry` (null only on policy entries that copy a previous null). Add a compile-time type test that `EffectiveView["restorationConfidence"]` is `number | null` and that omitting the field from `CellInitial` does not compile.
    - The `confidence` field of `previous` and `restored` is required and typed `number | null`; add a compile-time test that omitting it does not compile.
    - Create `loom/types` content (`FabricCell`, `FabricRow`, `FabricBuffer`, `ResolvedColours`, `RunStatus`, `SimulationState`) and `session/sessionLog.ts` types (`SessionActionKind` with all 16 kinds including `withdraw-inference`, `SessionAction`, `SessionLog`, `SessionState`, payload types, `DIGEST_ALGORITHM`) as type-only definitions.
    - Files owned: `types.ts`, `loom/types.ts`, `session/sessionLog.ts`.
    - _Requirements: 1.1, 1.2, 1.7, 1.8, 5.1, 5.2, 5.3, 5.21, 5.25, 5.27, 5.29, 15.1, 15.2, 15.3, 17.3_

  - [ ] 2.2 Implement MachineProfile, validateProfile and compileProfile
    - Create `profile/machineProfile.ts` with `MachineProfile`, `VerificationStatus`, `ProfileFieldKey`, `ReservedPositionSpec`, `EndHoleSpec`, `ReadOrderSpec`, `HookMappingSpec`, `CardToPassSpec`, `PhysicalDimensions`, `validateProfile` and `compileProfile`.
    - `validateProfile` checks rows and columns are integers in [1, 256], reserved positions are distinct and in-grid, `readableCount` equals rows times columns minus reserved count (`PROFILE_COUNT_MISMATCH`), mappings are known (`HOOK_MAPPING_INVALID`), and a `verified` field has a non-empty `source` (`INVALID_PROFILE` naming the field).
    - `compileProfile` builds `gridToRead` and `readToGrid` tables for `column-major` (all four direction pairs) and `explicit` read orders, skipping reserved positions; it is the only place that derives tables, with an optional `WeakMap` cache.
    - Files owned: `profile/machineProfile.ts`.
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.10, 2.11, 2.12, 14.1, 14.5_

  - [ ] 2.3 Add the Garín profile data with unverified markers
    - Create `profile/garinProfile.ts` exporting `GARIN_PROFILE`: 51 rows, 8 columns, 8 reserved positions, 400 readable, default threads-per-hook 16, both hook mappings permitted, mirror options `none` and `mirrored`, `cardToPass` one-card-per-pass, no physical dimensions, two declared end holes outside the grid with no geometry.
    - Reserved positions are a placeholder (row 25, columns 0 to 7) with status `unverified`, basis `geometric-inference` and a note that the location is inferred from the 51 x 8 geometry, is a placeholder and was not observed in the paper's figures.
    - Mark every field in the assumptions table (A1 to A9, A11) `unverified` with a basis and note, and add `// UNVERIFIED A<n>` comments at each dependent value.
    - Files owned: `profile/garinProfile.ts`.
    - _Requirements: 2.2, 2.3, 2.7, 2.9, 3.1, 3.3, 6.9, 14.1, 14.12_

  - [ ]* 2.4 Write profile unit tests
    - Garín: 51 x 8, 408 positions, 8 reserved with basis `geometric-inference` and status `unverified`, 400 readable, default 16 `unverified`, both mappings permitted, no physical dimensions, every listed field `unverified`.
    - A second 5 x 3 profile with 1 reserved position creates, validates and compiles with no code change.
    - `PROFILE_COUNT_MISMATCH`, `INVALID_PROFILE` (verified without source, bad grid size, duplicate reserved) and `HOOK_MAPPING_INVALID` examples.
    - Files owned: `src/domain/__tests__/profile.test.ts`.
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.9, 2.11, 2.12, 13.16_

- [ ] 3. Coordinate and read-order mappings
  - [ ] 3.1 Add the profile generator
    - Create `src/domain/__tests__/generators/profile.ts` with `arbProfile` (rows and columns in [1, 16] by default, up to 256 for table-only use; reserved set via seeded shuffle of size 0 to `min(8, rows * cols - 1)`; column-major in all four direction pairs and explicit permutations; non-empty permitted mappings; mirror options including `none`), `arbReservedList` and `arbPosition`. Output always passes `validateProfile`.
    - Files owned: `src/domain/__tests__/generators/profile.ts`.
    - _Requirements: 13.2, 13.4, 13.5, 13.16_

  - [ ] 3.2 Implement read-order and position conversions
    - Create `profile/readOrder.ts` with `gridToReadIndex` (`POSITION_OUT_OF_RANGE`, `RESERVED_POSITION`), `readIndexToGrid` (`READ_INDEX_OUT_OF_RANGE`) and `gridToPhysical` (`PHYSICAL_DIMENSIONS_UNAVAILABLE`, no estimation from grid coordinates), using `compileProfile` tables.
    - Add `// UNVERIFIED A3` and `// UNVERIFIED A4` comments for the bottom-up and right-to-left direction (descending `gridRow`, row 0 at top as drawn).
    - Files owned: `profile/readOrder.ts`.
    - _Requirements: 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9_

  - [ ] 3.3 Implement hook-to-warp mappings
    - Create `profile/hookMapping.ts` with `warpCount`, `hookWarpIndices` for `contiguous-visualization` (`h * t + k`) and `repeat` (`h + k * readableCount`), mirror applied afterwards as `warpCount - 1 - w`, results sorted ascending.
    - Add `// UNVERIFIED A5` and `// UNVERIFIED A11` comments.
    - Files owned: `profile/hookMapping.ts`.
    - _Requirements: 4.7, 8.2, 8.7, 14.6, 14.7, 14.8_

  - [ ]* 3.4 Write property test for read-order bijection
    - **Property 1: Read-order bijection**
    - **Validates: Requirements 4.1, 4.2, 4.9, 13.4**
    - Seed `SEED_P1`, 300 runs, profiles up to 256 x 256, tables only.
    - Files owned: `src/domain/__tests__/readOrderBijection.props.test.ts`.

  - [ ]* 3.5 Write property test for rejected positions
    - **Property 2: Reserved and out-of-range positions are rejected**
    - **Validates: Requirements 3.4, 3.5, 4.3, 4.4, 13.5**
    - Seed `SEED_P2`, 200 runs. The "Card unchanged" part is covered after core deck work in task 6.14; this task checks the conversion functions only.
    - Files owned: `src/domain/__tests__/readOrderReject.props.test.ts`.

  - [ ]* 3.6 Write property test for profile-only reserved-position correction
    - **Property 3: Reserved positions are corrected in profile data only**
    - **Validates: Requirements 2.5, 2.6, 2.10, 13.16**
    - Seed `SEED_P3`, 200 runs. Tables only here; Card and Deck creation under the replaced profile is added in task 6.14.
    - Files owned: `src/domain/__tests__/reservedCorrection.props.test.ts`.

  - [ ]* 3.7 Write property test for hook mapping and mirror
    - **Property 4: Hook mapping and mirror**
    - **Validates: Requirements 4.7, 8.2, 8.3, 8.7, 14.6, 14.7, 14.8, 13.15**
    - Seed `SEED_P4`, 300 runs, `readableCount` 1 to 64, threads-per-hook in [1, 64], index arithmetic only. Add Garín example tests for 6,400 warp threads under both mappings. The `fabricCoordinate` agreement check is added in task 9.10.
    - Files owned: `src/domain/__tests__/hookMapping.props.test.ts`.

- [ ] 4. Canonical JSON, interface stubs and public index
  - [ ] 4.1 Implement the canonical JSON writer and schema key walk
    - Create `io/canonicalJson.ts`: schema-ordered stable writer, two-space indent, `\n` line endings, finite numbers only, absent optional fields omitted, no timestamps. Exception: `restorationConfidence` (and an inference entry's `confidence`) is always written, and `null` is written as the JSON literal `null`, never coerced to `0` or omitted.
    - Create `io/schema.ts`: key lists per persisted type and an unknown-field walk returning `UNKNOWN_FIELD` with a path.
    - Unit tests: equal values give byte-identical text, key order is stable, non-finite numbers are rejected, unknown fields are reported with a path, `null` confidence is written as `null` and `0` as `0` (distinct text).
    - Files owned: `io/canonicalJson.ts`, `io/schema.ts`, `src/domain/__tests__/canonicalJson.test.ts`.
    - _Requirements: 7.2, 7.7, 7.12, 15.6, 15.16_

  - [ ] 4.2 Declare signature stubs for every remaining module
    - In each file below, export the final function signatures and exported constants from the design, with TSDoc listing the Result error codes. Function bodies call a temporary `notImplemented()` helper in `src/domain/_stub.ts`.
    - Files: `card/card.ts`, `card/edit.ts`, `deck/deck.ts`, `deck/approval.ts`, `deck/validate.ts`, `deck/compare.ts`, `io/serialize.ts`, `io/migrate.ts`, `loom/config.ts`, `loom/interpreter.ts`, `loom/simulation.ts`, `session/apply.ts`, `session/record.ts`, `session/replay.ts`, `session/digest.ts`, `session/serialize.ts`, `bitmap/bitmapToDeck.ts`, `svg/exportSvg.ts`.
    - `card/edit.ts` stubs include `withdrawInference(deck, { cardId, readIndex, actionId }): Result<Deck>` (TSDoc lists `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `INVALID_EDIT`, `NOTHING_TO_WITHDRAW` in check order) and `latestLiveEntry(cell)`; `WithdrawalInput` is exported.
    - Stub signatures carry the final confidence types: `CellSeed` has no numeric confidence, `createCard` documents that every cell gets `restorationConfidence: null`, and `InferenceInput.confidence` is `number` (null rejected with `PROBABILITY_OUT_OF_RANGE`).
    - Define final constants now: `SIMULATION_DISCLAIMER` in `loom/disclaimer.ts`, `SVG_CAVEAT` in `svg/exportSvg.ts`, `DIGEST_ALGORITHM`.
    - `_stub.ts` is temporary; task 16.3 asserts that nothing imports it.
    - _Requirements: 5.8, 5.13, 5.17, 5.26, 5.28, 5.21, 6.1, 6.7, 7.1, 8.3, 8.16, 9.1, 10.1, 11.1, 11.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.8, 15.4, 15.5, 17.3_

  - [ ] 4.3 Create the public index and interface version
    - Create `index.ts` as the single export surface re-exporting all types, functions and constants named in the design, plus `INTERFACE_VERSION = "1.1.0"` (1.1.0 adds `withdrawInference`, `latestLiveEntry`, `PreviousFields`, `WithdrawalEntry`, the `withdraw-inference` session kind, the `withdrawal` approval cause and `NOTHING_TO_WITHDRAW`), `ERROR_CODES` and `ERROR_MESSAGES`.
    - Files owned: `index.ts`.
    - _Requirements: 12.1, 12.3, 12.4, 12.6, 16.1_

  - [ ] 4.4 Add the exported-surface snapshot test
    - Create `src/domain/__tests__/surface.test.ts` comparing the sorted list of exports of `index.ts` with a committed `surface.snapshot.json`, plus an assertion that `INTERFACE_VERSION` exists.
    - Any later change to the snapshot requires a spec update (Req 12.6).
    - _Requirements: 12.1, 12.6_

- [ ] 5. INTERFACE FREEZE checkpoint
  - Ensure `vitest --run` and the type check pass, the surface snapshot is committed, and the stub list in task 4.2 is complete.
  - From this point `types.ts`, `result.ts`, `brand.ts`, `limits.ts`, `profile/*`, `index.ts` and all exported signatures change only through a spec update. Crew workers must not edit these files.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Core deck work (single worker, not split; blocks tasks 8 to 12)
  - Files owned by this task: `card/card.ts`, `card/edit.ts`, `deck/deck.ts`, `deck/approval.ts`, `deck/validate.ts`, `deck/compare.ts`, `src/domain/__tests__/generators/deck.ts`, and the test files listed below (including `withdrawal.props.test.ts`, `withdrawalHistory.props.test.ts`, `withdrawalCorruption.props.test.ts` and `withdrawal.test.ts`).
  - Depends on: task 5 only.
  - [ ] 6.1 Implement cards and the effective view
    - `createCard` (length must equal `readableCount`; this is the vision constructor: default seed gives `observed` when a raw value exists, else `ambiguous` with evidence "no observation", and in both cases `restorationConfidence: null` = not evaluated, never `0`), `getCell` (`UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`), `latestLiveEntry` (a `user-edit` not referenced by an `undo`, or an `inference` not referenced by a `withdrawal`; highest sequence wins) and `effectiveView` as a fold of history over `initial` (the `withdrawal` case restores value or absence, provenance, confidence and evidence from `restored`), exposing `restorationConfidence: number | null` and passing `null` through unchanged. Hole likelihood stays a separate field from Restoration_Confidence.
    - _Requirements: 3.2, 5.1, 5.2, 5.4, 5.30, 12.2, 12.3, 17.3, 17.4_

  - [ ] 6.2 Implement deck construction and structure operations
    - `createDeck` (initial `unapproved` record, cause `init`), `reorderCards` (`INVALID_REORDER`), `insertCard`, `removeCard` (`DECK_SIZE_OUT_OF_RANGE` for the last card), `duplicateCard`, `getCellByCardAndIndex`. Each structure operation preserves surviving cells byte for byte (including a `null` Restoration_Confidence) and appends an `unapproved` record with the supplied `actionId`.
    - _Requirements: 6.1, 6.2, 6.7, 6.8, 6.9, 12.3, 17.4_

  - [ ] 6.3 Implement user edit, undo and inference
    - `userEdit` with check order `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `EDIT_NOTE_REQUIRED`, `EVIDENCE_TOO_LONG`; sets provenance `user-edited`, never changes raw, Restoration_Confidence (including `null`) or Evidence; appends an `unapproved` record (cause `edit`) when the deck was approved.
    - `undoEdit` appends an `undo` entry referencing the reversed edit, restores value and provenance in the view, appends an approval record when the approval state differs from `approvalBefore`, and returns `NOTHING_TO_UNDO` otherwise. Undo covers user-edit entries only.
    - `setInferred` rejects `observed` (`INFERENCE_CANNOT_BE_OBSERVED`), unknown provenance and `user-edited` (`INVALID_PROVENANCE`), empty evidence (`EVIDENCE_REQUIRED`), over-length evidence, confidence that is `null`, `undefined`, not a number, `NaN`, an infinity or outside [0, 1] (`PROBABILITY_OUT_OF_RANGE`, Deck unchanged, because an inference is an evaluation), and overwriting an un-reversed user edit (`INVALID_EDIT`). Every accepted inference appends an `inference` entry whose `previous` holds the Previous_Fields (view before the call, including a `null` confidence and earlier evidence). `userEdit` and `undoEdit` never alter Restoration_Confidence, including `null`; `undoEdit` returns `NOTHING_TO_UNDO` when the latest entry is a `withdrawal`.
    - `withdrawInference` checks in fixed order and returns the first failure with the Deck unchanged: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `INVALID_EDIT` (latest Live_Entry is a `user-edit`), `NOTHING_TO_WITHDRAW` (no Live_Entry, or latest is not an `inference`). On success it appends one `withdrawal` entry (new action id, next entry sequence, `reverses` the inference action id, `restored` equal to that inference's `previous`), changes no other cell, leaves `raw` untouched, and appends an `unapproved` record with cause `withdrawal` and the same action id only when the Deck is `approved`. A `userEdit` after a withdrawal records the post-withdrawal value and provenance as earlier values; a `setInferred` after a withdrawal is accepted when no un-reversed user edit protects the cell. No operation reverses a withdrawal.
    - _Requirements: 5.5, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 5.17, 5.18, 5.18a, 5.19, 5.20, 5.26, 5.27, 5.28, 5.29, 5.30, 5.31, 5.32, 5.33, 17.4, 17.8_

  - [ ] 6.4 Implement approval records and the ambiguous-as-down policy
    - `requestApproval` (`UNRESOLVED_CELLS` listing up to 100 entries plus total; with the explicit policy each unresolved cell gets one inference entry with value 0, provenance `ambiguous`, copied confidence and evidence, a `previous` Previous_Fields, and `policyNote` in the entry (withdrawable by the same rules), not in Evidence; a copied `null` confidence stays `null`), `revokeApproval`, `currentApproval`, `approvalHistory`. Approval never changes Restoration_Confidence (including `null`), Evidence or raw observations.
    - _Requirements: 5.21, 5.22, 5.23, 5.24, 5.25, 17.4_

  - [ ] 6.5 Implement deck validation
    - `validateDeck`: collects up to 100 violations plus a total (`INVALID_DECK` wrapper), never modifies, repairs or defaults input. Covers deck size, unique card ids, cell counts, provenance rules, probability ranges, evidence length, `observed` without raw value, history sequence contiguity, undo references, approval sequence contiguity and unique action ids, unresolved cells in an approved deck, unsupported `schemaVersion`.
    - Confidence rules: `restorationConfidence` and inference `confidence` accept `null`, `0` and `1`; `-0.0001`, `1.0001`, `NaN`, `Infinity` and `-Infinity` give `PROBABILITY_OUT_OF_RANGE` naming the cell; an absent or `undefined` `restorationConfidence` gives `MISSING_REQUIRED_FIELD` with the cell path and is never treated as `null`; an inference entry with `confidence: null` is valid only when it carries a `policyNote`; a `previous` or `restored` object lacking `confidence` gives `MISSING_REQUIRED_FIELD` with its path and is never defaulted.
    - Withdrawal rules: each `withdrawal.reverses` must name an earlier `inference` entry of the same cell that no earlier `withdrawal` reverses (a missing id, a `user-edit` entry, an inference of another cell, a later entry or an already-withdrawn inference gives `INVALID_EDIT_HISTORY` with the path of the withdrawal entry); `withdrawal.restored` must equal the referenced inference's `previous` (mismatch is `INVALID_EDIT_HISTORY`); action id uniqueness and sequence consistency apply to withdrawal entries exactly as to other entries.
    - _Requirements: 1.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.10, 6.11, 6.12, 7.13, 17.1, 17.2_

  - [ ] 6.6 Implement comparison and the neutral damage hook
    - `deckEquals`, `compareCells` (mismatch list capped at 1000, same profile id and card ids required) and `deriveDamagedDeck` that takes a caller-supplied `DamageFn` and `RandomFn`, visits cells in card then read order, builds a fresh `unapproved` deck, and defines no damage model and no randomness.
    - _Requirements: 12.5_

  - [ ] 6.7 Add the deck generators
    - Create `generators/deck.ts` with `arbCellSeed` (confidence drawn from `fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true }))` with `null`, `0` and `1` over-represented; numeric-only for inferred provenance), `arbDeck` (history and approvals built only through public operations with unique action ids), `arbApprovedDeck`, `arbInferenceInput`, `arbOp` (edit, undo, inference and withdrawal operations with unique action ids and occasional invalid inputs, applied only through public functions), `arbWithdrawalCorruption` (enumerated list tagged with the expected code: missing, wrong-kind, other-cell, later and already-withdrawn `reverses`; altered `restored`; duplicate action id; bad sequence), `arbColourLayer` (valid layers, shared with later tasks), `arbCorruption` (the enumerated corruption list, each tagged with its expected code, including non-finite or out-of-range confidence and a missing or `undefined` `restorationConfidence`).
    - _Requirements: 13.2, 13.3, 13.25, 17.6_

  - [ ]* 6.8 Write property test for invalid decks
    - **Property 6: Invalid decks and profiles are rejected, unmodified and unrepaired**
    - **Validates: Requirements 1.4, 1.7, 2.4, 2.11, 2.12, 5.5, 5.6, 5.7, 7.13, 17.1, 17.2, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.10, 14.5, 13.11**
    - Seed `SEED_P6`, 300 runs. File: `src/domain/__tests__/validate.props.test.ts`.

  - [ ]* 6.9 Write property test for edit then undo
    - **Property 7: A user edit followed by its undo restores the effective view**
    - **Validates: Requirements 5.8, 5.9, 5.12, 5.13, 5.14, 13.12, 17.4**
    - Seed `SEED_P7`, 200 runs; confidences include `null`, which must stay `null` throughout. File: `src/domain/__tests__/editUndo.props.test.ts`.

  - [ ]* 6.10 Write property test for append-only history
    - **Property 8: History is append-only and the effective view equals the fold**
    - **Validates: Requirements 5.13, 5.14, 5.15, 5.16, 6.5, 6.6, 13.17**
    - Seed `SEED_P8`, 150 runs, operation lists of 0 to 20. File: `src/domain/__tests__/history.props.test.ts`.

  - [ ]* 6.11 Write property test for inference rules
    - **Property 9: Inference rules and value invariants**
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5, 5.7, 5.11, 5.17, 5.18, 5.18a, 5.19, 13.13, 17.7**
    - Seed `SEED_P9`, 200 runs; includes `null`, `undefined`, `NaN`, infinity and out-of-range confidence inputs to `setInferred`. File: `src/domain/__tests__/inference.props.test.ts`.

  - [ ]* 6.12 Write property test for approval audit trail
    - **Property 10: Approval is an append-only audit trail**
    - **Validates: Requirements 5.2, 5.21, 5.22, 5.23, 5.24, 5.25**
    - Seed `SEED_P10`, 150 runs, operation lists of 0 to 10. File: `src/domain/__tests__/approval.props.test.ts`.

  - [ ]* 6.13 Write property test for structure operations
    - **Property 11: Structure operations preserve cells and clear approval**
    - **Validates: Requirements 6.7, 6.8**
    - Seed `SEED_P11`, 150 runs. File: `src/domain/__tests__/structure.props.test.ts`.

  - [ ]* 6.14 Write core unit and example tests
    - Reserved-position write path: addressing a reserved grid position through `gridToReadIndex` yields `RESERVED_POSITION` and the Card is unchanged (completes Property 2); a Card and Deck created under a profile with replaced reserved positions validate and approve (completes Property 3).
    - Second undo on the same cell returns `NOTHING_TO_UNDO`; undo of an edit made on an approved deck restores `approved` through a new record; `UNRESOLVED_CELLS` is capped at 100 with a correct total; `UNKNOWN_CARD`; `DUPLICATE_ACTION_ID`; `EDIT_NOTE_REQUIRED`; `EVIDENCE_TOO_LONG` at 1,000 and 1,001 characters; `DECK_SIZE_OUT_OF_RANGE` at 10,000 and 10,001 cards.
    - Confidence boundary examples (Req 17.1, 17.2, 17.7), explicit seed where generated: validator accepts `null`, `0`, `1` and returns `PROBABILITY_OUT_OF_RANGE` for `-0.0001`, `1.0001`, `NaN`, `Infinity`, `-Infinity`; a cell with the field absent or `undefined` returns `MISSING_REQUIRED_FIELD` naming the cell path and is not treated as `null`; `setInferred` with `confidence: null` returns `PROBABILITY_OUT_OF_RANGE` and the Deck equals its copy; `createCard` from vision-style seeds gives every cell `restorationConfidence: null`; user edit, undo, approval (with and without policy) and structure operations leave `null` and `0` unchanged and distinct; `effectiveView` type is `number | null`.
    - `deriveDamagedDeck` with a test-owned seeded damage function leaves the truth deck deeply equal to its copy and returns an `unapproved`, valid deck; `compareCells` of a deck with itself has zero mismatches.
    - Files owned: `src/domain/__tests__/core.test.ts`.
    - _Requirements: 3.5, 5.10, 5.11, 5.14, 5.15, 5.20, 5.18a, 5.23, 6.2, 7.13, 12.2, 12.5, 13.5, 13.16, 17.1, 17.2, 17.3, 17.4, 17.7_

  - [ ]* 6.15 Write property test for withdrawal restoring the effective view
    - **Property 25: Withdrawal restores the Effective_View exactly**
    - **Validates: Requirements 5.26, 5.27, 5.29, 5.30, 5.31, 13.21, 17.8**
    - Seed `SEED_P25`, 200 runs, 1 to 3 cards, null-biased confidences, a cell given an inference by `setInferred`, approved and unapproved variants; `null` must stay `null` and the approval list gains exactly one `withdrawal`-cause record only when the Deck was approved. File: `src/domain/__tests__/withdrawal.props.test.ts`.

  - [ ]* 6.16 Write property test for append-only history with withdrawals
    - **Property 26: History stays append-only and folds correctly with withdrawals**
    - **Validates: Requirements 5.28, 5.29, 5.32, 5.33, 6.11, 13.22**
    - Seed `SEED_P26`, 150 runs, operation lists of 0 to 20 from `arbOp` (edit, undo, infer, withdraw). File: `src/domain/__tests__/withdrawalHistory.props.test.ts`.

  - [ ]* 6.17 Write property test for corrupted withdrawal entries
    - **Property 29: Corrupted withdrawal entries are rejected**
    - **Validates: Requirements 6.11, 6.12, 13.25**
    - Seed `SEED_P29`, 200 runs, `arbDeck` with at least one withdrawal entry then one corruption from `arbWithdrawalCorruption`; input deeply equal to its pre-validation copy. File: `src/domain/__tests__/withdrawalCorruption.props.test.ts`.

  - [ ]* 6.18 Write withdrawal example tests
    - A second `withdrawInference` on the same single inference returns `NOTHING_TO_WITHDRAW`; withdrawal beneath an un-reversed user edit returns `INVALID_EDIT`; withdrawal after that user edit was undone succeeds; `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE` and `DUPLICATE_ACTION_ID` are returned in that order before `INVALID_EDIT` and `NOTHING_TO_WITHDRAW`; an approved Deck becomes `unapproved` with cause `withdrawal` and an unapproved Deck gains no record; a previous `null` confidence is restored as `null`; `undoEdit` after a withdrawal returns `NOTHING_TO_UNDO`; a new inference after a withdrawal is accepted; validator cases for a withdrawal with a missing `confidence` in `restored`.
    - Files owned: `src/domain/__tests__/withdrawal.test.ts`.
    - _Requirements: 5.26, 5.28, 5.29, 5.30, 5.31, 5.32, 5.33, 6.11, 6.12, 13.23, 17.8_

- [ ] 7. Checkpoint - Core deck work merged
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Deck JSON import and export (Crew-delegable, Group B)
  - Dependencies: tasks 4.1 and 6. Files owned: `io/serialize.ts`, `io/migrate.ts`, and the test files below. No shared state with tasks 9 to 12.
  - [ ] 8.1 Implement `exportDeckJson` and `importDeckJson`
    - Export through the canonical writer with `format: "loom-lazarus-deck"`, the embedded profile, all cells with history and the full approval list, and an optional top-level, labelled `weftColourLayer` section; no colour fields on cards or cells.
    - Import order: size above 8 MiB (`INPUT_TOO_LARGE`, before parsing, using UTF-8 byte length), `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION` (names supplied and supported versions), migration, `UNKNOWN_FIELD`, `validateDeck` violations as `INVALID_DECK`. Never return a partial deck.
    - Write `inference` entries (with `previous`) and `withdrawal` entries (with `reverses` and `restored`) in stable key order with no loss; every `previous.confidence` and `restored.confidence` is always written, `null` as the literal `null`, distinct from `0`.
    - Confidence handling: export writes `restorationConfidence: null` as the JSON literal `null` and `0` as `0`; import reads `null` back as `null`; a cell lacking the field is reported through the validator as `MISSING_REQUIRED_FIELD` with the cell path, and the reader never defaults it to `null` or `0`.
    - _Requirements: 2.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14_

  - [ ] 8.2 Implement the pure migration table
    - `migrate.ts` with an empty `Record<number, (json: unknown) => unknown>` at release, an injectable table for tests, and migration names recorded in `meta.migrations`.
    - _Requirements: 7.8_

  - [ ]* 8.3 Write property test for deck JSON round trip
    - **Property 5: Deck JSON round trip and byte stability**
    - **Validates: Requirements 2.8, 7.1, 7.2, 7.3, 7.9, 7.10, 7.12, 13.6**
    - Seed `SEED_P5`, 100 runs, 1 to 6 cards, Garín or profiles up to 16 x 16, confidences drawn from `null` and [0, 1]. File: `src/domain/__tests__/deckJson.props.test.ts`.

  - [ ]* 8.4 Write deck JSON boundary and example tests
    - `INPUT_TOO_LARGE` at exactly 8 MiB (accepted) and 8 MiB plus one byte (rejected); truncated text gives `INVALID_JSON` at seeded cut points; `INVALID_FORMAT`; `UNKNOWN_FIELD` path; `UNSUPPORTED_SCHEMA_VERSION` for newer and non-integer values; synthetic version-0 migration recorded in `meta.migrations`; a colour field on a card is rejected; imported JSON with a cell lacking `restorationConfidence` returns `INVALID_DECK` whose violations include `MISSING_REQUIRED_FIELD` with the cell path and no Deck; `null` and `0` each round trip to themselves and appear as `null` and `0` in the text.
    - Files owned: `src/domain/__tests__/deckJson.test.ts`.
    - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.11, 7.12, 7.13, 13.19, 17.2, 17.6_

  - [ ]* 8.5 Write property test for null confidence round trip
    - **Property 22: Null confidence round trip never coerces null and 0**
    - **Validates: Requirements 7.3, 7.10, 7.12, 17.6**
    - Seed `SEED_P22`, 200 runs, 1 to 4 cards, confidences from `fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1, noNaN: true }))` including `0` and `1`; a paired deck that differs only by one cell's `null` versus `0` must export to different text.
    - Files owned: `src/domain/__tests__/nullConfidenceJson.props.test.ts`.

  - [ ]* 8.6 Write property test for deck JSON round trip with withdrawals
    - **Property 27: Deck JSON round trip with withdrawals**
    - **Validates: Requirements 7.14, 7.15, 17.6**
    - Seed `SEED_P27`, 100 runs, 1 to 4 cards whose history includes `inference` and `withdrawal` entries built by public operations, confidences from `null` and [0, 1]; export, import, export gives identical text and a deeply equal Deck, with `previous.confidence` and `restored.confidence` exact.
    - Files owned: `src/domain/__tests__/deckJsonWithdrawal.props.test.ts`.

- [ ] 9. Loom engine (Crew-delegable, Group B)
  - Dependencies: tasks 3 and 6. Files owned: `loom/config.ts`, `loom/interpreter.ts`, `loom/simulation.ts`, `src/domain/__tests__/generators/loom.ts`, and the loom test files below. No shared state with other Group B tasks.
  - [ ] 9.1 Implement loom configuration
    - `makeLoomConfig` and `validateLoomConfig` with the fixed check order: threads-per-hook (`INVALID_THREADS_PER_HOOK`, default from profile), hook mapping (`HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`), mirror (`MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`). Hook mapping and mirror have no default.
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.17, 14.2, 14.3, 14.4_

  - [ ] 9.2 Implement the interpreter and fabric buffer
    - `decodeCard`, `passResult`, `fabricCoordinate`, `fabricCellAt`, `fabricToCells`; rows store lifted hooks and lifted warp indices only; both hook mappings; mirror applied after mapping; colours resolved only from the weft-colour layer (`COLOUR_LAYER_OUT_OF_RANGE`, `INVALID_COLOUR_LAYER`) and absent without one; `SIMULATION_DISCLAIMER` on every buffer.
    - Precondition order: loom configuration, `DECK_NOT_APPROVED`, `UNRESOLVED_CELL`, `FABRIC_TOO_LARGE` (cap 4,000,000 with warp count, pass count and cap in the message), colour layer.
    - _Requirements: 4.7, 8.1, 8.2, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 8.18, 14.6, 14.7, 14.8, 14.11_

  - [ ] 9.3 Implement the pure simulation API
    - `create`, `step`, `pause`, `resume`, `seek`, `reset`, `runToEnd`, with `ALREADY_COMPLETE`, `PAUSED`, `SEEK_OUT_OF_RANGE`; the deck is snapshotted at create; states are plain structured-cloneable data; no timers. Replay is not defined here (it is `replaySession` in task 14).
    - _Requirements: 8.15, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13_

  - [ ] 9.4 Add the loom generators
    - `generators/loom.ts` with `arbConfig` (threads-per-hook in [1, 8], mapping and mirror from the profile's permitted lists), `arbBadConfig` (one removed or invalid field) and a fabric-size variant computed by arithmetic, not by allocating 4,000,000 cells.
    - _Requirements: 13.2_

  - [ ]* 9.5 Write property test for loom determinism
    - **Property 12: Loom determinism**
    - **Validates: Requirements 1.2, 8.1, 8.10, 8.15, 13.7**
    - Seed `SEED_P12`, 100 runs. File: `src/domain/__tests__/loomDeterminism.props.test.ts`.

  - [ ]* 9.6 Write property test for card swap
    - **Property 13: Swapping two different cards changes exactly two rows**
    - **Validates: Requirements 8.10, 13.8**
    - Seed `SEED_P13`, 100 runs. File: `src/domain/__tests__/cardSwap.props.test.ts`.

  - [ ]* 9.7 Write property test for stepping, seeking and runToEnd
    - **Property 15: Stepping, seeking and runToEnd agree**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 13.10**
    - Seed `SEED_P15`, 100 runs. File: `src/domain/__tests__/simulation.props.test.ts`.

  - [ ]* 9.8 Write property test for precondition order
    - **Property 16: Preconditions are checked in a fixed order**
    - **Validates: Requirements 8.4, 8.6, 8.8, 8.9, 8.11, 8.14, 8.17, 8.18, 14.2, 14.3, 14.4, 14.11**
    - Seed `SEED_P16`, 200 runs. File: `src/domain/__tests__/preconditions.props.test.ts`.

  - [ ]* 9.9 Write property test for colours from the layer only
    - **Property 17: Colours come only from the layer**
    - **Validates: Requirements 8.12, 8.13**
    - Seed `SEED_P17`, 100 runs. File: `src/domain/__tests__/colourLayer.props.test.ts`.

  - [ ]* 9.10 Write loom unit and example tests
    - Fabric cap examples for Garín under both mappings: threads-per-hook 16 accepts 625 passes and rejects 626; 10 gives 4,000 warps and 1,000 passes; 64 gives 25,600 and 156; 1 gives 400 and 10,000.
    - `fabricCoordinate` agrees with `hookWarpIndices` (completes Property 4); pause then resume status; disclaimer text equals the required constant; `structuredClone` equality; a second 5 x 3 profile weaves.
    - Files owned: `src/domain/__tests__/loom.test.ts`.
    - _Requirements: 4.7, 8.11, 8.16, 9.11, 9.12, 14.10, 14.11, 14.12_

- [ ] 10. Bitmap-to-deck converter (Crew-delegable, Group B)
  - Dependencies: task 6. Files owned: `bitmap/bitmapToDeck.ts`, `src/domain/__tests__/bitmap.test.ts`.
  - [ ] 10.1 Implement `bitmapToDeck`
    - Check order: `readableCount` above 2,048 or width mismatch gives `BITMAP_WIDTH_UNSUPPORTED` (expected and supplied widths, no crop, pad or scale); height 0 or above 10,000 gives `BITMAP_HEIGHT_UNSUPPORTED`; non-binary values or unequal row lengths give `BITMAP_NOT_BINARY` naming the first row and column.
    - Cells are `observed`, raw value equals the bit, `restorationConfidence` the number 1 (a supplied bitmap is ground-truth input; not `null`), evidence "Value supplied from a binary bitmap.", deterministic card ids `${prefix}-${zero-padded row}`, deck starts `unapproved` with cause `init`.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9_

  - [ ]* 10.2 Write bitmap unit tests
    - Each `BITMAP_*` code, `readableCount` above 2,048, height 10,000 accepted and 10,001 rejected, deterministic card ids, no mutation of the input bitmap.
    - _Requirements: 10.1, 10.2, 10.4, 10.5, 10.6, 10.9, 13.9_

- [ ] 11. SVG exporter (Crew-delegable, Group B)
  - Dependencies: task 6. Files owned: `svg/exportSvg.ts`, `src/domain/__tests__/svg.props.test.ts`, `src/domain/__tests__/svg.test.ts`.
  - [ ] 11.1 Implement `exportCardSvg` and `exportDeckSvg`
    - Require positive finite `scale` and unit `px` or `mm` (`INVALID_EXPORT_OPTIONS`); `mm` needs declared dimensions (`PHYSICAL_DIMENSIONS_UNAVAILABLE`); `px` layout is schematic and labelled `geometry="schematic-grid"`.
    - One `<circle>` per lifted readable cell, separately identified reserved elements with a `<title>` "inferred location" when the basis is `geometric-inference`, class and `data-provenance` on inferred cells, visible "unapproved" text per card when the deck is unapproved.
    - Metadata holds profile id, scale, unit and the status and basis of the geometry fields; `SVG_CAVEAT` appears in both a `<desc>` and a visible `<text>`. Deterministic attribute order, `toFixed(3)` with trailing zeros trimmed, XML-escaped strings. Never use the words "laser-ready", "cut-ready" or "machine-ready".
    - `// UNVERIFIED A2, A3, A9` comments at the geometry code.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.10_

  - [ ]* 11.2 Write property test for SVG export
    - **Property 21: SVG export is deterministic and carries the caveat**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.10**
    - Seed `SEED_P21`, 100 runs, `arbSvgOptions` including invalid options, defined in this file.

  - [ ]* 11.3 Write SVG unit tests
    - `SVG_CAVEAT` text equals the required sentence; `INVALID_EXPORT_OPTIONS` for scale 0, negative, NaN and unit `cm`; `mm` without dimensions; unapproved marker; reserved "inferred location" label.
    - _Requirements: 11.2, 11.3, 11.6, 11.7, 11.10_

- [ ] 12. Documentation of contracts and historical assumptions (Crew-delegable, Group B)
  - Dependencies: task 5 (frozen registry and interfaces). Files owned: `docs/domain-errors.md`, `docs/domain-loom.md`, `docs/domain-svg-caveat.md`, `docs/domain-session-log.md`, `docs/domain-assumptions.md`, `src/domain/__tests__/docsSync.test.ts`. No code files are edited.
  - [ ] 12.1 Write the error list and the registry sync test
    - `docs/domain-errors.md` lists every code in `ERROR_CODES` with its message and meaning, including `NOTHING_TO_WITHDRAW` (the cell has no Live_Entry, or its latest Live_Entry is not an `inference` entry). `docsSync.test.ts` fails when the registry and the document differ.
    - _Requirements: 5.28, 12.7, 16.2, 16.4_

  - [ ] 12.2 Write the loom documentation
    - `docs/domain-loom.md`: read order for Garín (cites A3 and A4 as unverified), both hook mappings with their standing (neither verified), mirror applied after mapping, the threads-per-hook consequence table (16 gives 6,400 warps and 625 passes; 10 gives 4,000 and 1,000; 64 gives 25,600 and 156; 1 gives 400 and 10,000; identical for both mappings), bitmap pattern space, Restoration_Confidence as algorithmic and uncalibrated with `null` meaning "not evaluated" (distinct from `0`; detection assigns `null`, bitmap import assigns 1, only inference assigns a computed number; the deck-level calibration marker is `uncalibrated` unless a benchmark reference is supplied), the educational-simulation disclaimer, and the withdrawal model (inferences reversed only by `withdrawInference`, undo for user edits only, `withdrawal` approval cause, no operation reverses a withdrawal, `INTERFACE_VERSION` 1.1.0 changes).
    - _Requirements: 4.8, 8.16, 10.3, 12.2, 12.8, 14.9, 14.10, 17.3_

  - [ ] 12.3 Write the SVG caveat and session-log documents
    - `docs/domain-svg-caveat.md` repeats the caveat sentence. `docs/domain-session-log.md` documents the session schema, the 16 action kinds (including `withdraw-inference` with payload `cardId`, `readIndex`), the failure order of replay and the digest algorithm `fnv1a-64-v1` as a deterministic, non-cryptographic checksum, never tamper-proof.
    - _Requirements: 11.9, 15.19_

  - [ ] 12.4 Write the historical assumptions document
    - `docs/domain-assumptions.md`: table of A1 to A11 with working value, basis, where the code depends on it, the paper page or figure still to be recorded, and the correction path (profile data only). State that the Garín5 dataset licence (A10) is unchecked and no samples are redistributed. Include the open confirmations Q1 to Q5 from the design.
    - _Requirements: 2.3, 2.7, 2.9, 3.3, 4.8, 14.12_

- [ ] 13. Checkpoint - Group B merged
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Session log and deterministic replay (Crew-delegable, Group C)
  - Dependencies: task 13 (needs deck operations, the loom simulation and Deck JSON validation). Files owned: `session/digest.ts`, `session/apply.ts`, `session/record.ts`, `session/replay.ts`, `session/serialize.ts`, `src/domain/__tests__/generators/session.ts`, and the session test files below.
  - [ ] 14.1 Implement the state digest
    - `stateDigest`: 64-bit FNV-1a over UTF-8 bytes of the canonical JSON of `{ deck, simulation? }`, the simulation's deck snapshot replaced by its own `deckDigest`; 16 lowercase hex characters; non-cryptographic. A `null` confidence is written as the literal `null` in the canonical JSON, so states differing only by `null` versus `0` have different digests.
    - _Requirements: 15.7, 15.19, 17.4_

  - [ ] 14.2 Implement the action dispatcher
    - `applySessionAction` is the single dispatcher used by append and replay: validates each payload shape, applies the 16 action kinds through the same pure functions (`userEdit`, `undoEdit`, `setInferred`, `withdrawInference` for `withdraw-inference` using the Session_Action's `actionId`, approval, structure operations, simulation transitions), and returns `SESSION_ACTION_INVALID` for unknown kinds or bad payloads. `sim-create` snapshots the current deck; simulation actions before it fail.
    - The resulting withdrawal entry and any `withdrawal`-cause approval record are part of the state and its digest.
    - _Requirements: 15.3, 15.4, 15.5, 15.13, 15.21_

  - [ ] 14.3 Implement session recording
    - `createSession` validates the initial deck first and starts at `actionCount` 0; `appendAction` applies via `applySessionAction`, assigns the next sequence, records the digest, and on failure returns the action's error with the log unchanged.
    - _Requirements: 15.1, 15.2, 15.4, 15.17_

  - [ ] 14.4 Implement session log export and import
    - `exportSessionLog` and `importSessionLog` through the canonical writer (stable key order, no timestamps); size above 32 MiB gives `INPUT_TOO_LARGE` before parsing; `INVALID_JSON`; `INVALID_FORMAT` for unknown `format` or `digestAlgorithm`; `UNSUPPORTED_SCHEMA_VERSION`; `UNKNOWN_FIELD`.
    - _Requirements: 15.9, 15.15, 15.16, 15.18_

  - [ ] 14.5 Implement `replaySession` and `replaySessionJson`
    - Failure order: size, JSON, format, schema version, unknown field, `SESSION_TOO_LARGE` (above 100,000 actions), `SESSION_TRUNCATED`, `SESSION_SEQUENCE_INVALID`, initial deck validation, then per action `SESSION_ACTION_INVALID`, `SESSION_ACTION_FAILED` (with the underlying code; for `withdraw-inference` one of `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `INVALID_EDIT`, `NOTHING_TO_WITHDRAW`), `SESSION_DIGEST_MISMATCH`. Returns the initial state followed by one state per action, never a partial sequence, and leaves the input log unmodified. Replay is a reconstruction through the recorded actions and is not an alias of `create`; it leaves every Restoration_Confidence (including `null`) as the recorded actions left it, and the initial deck validation reports `MISSING_REQUIRED_FIELD` for a cell lacking the field.
    - _Requirements: 15.22, 17.2, 17.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 15.14, 15.15, 15.16, 15.17, 15.20, 9.13_

  - [ ] 14.6 Add the session generators
    - `generators/session.ts` with `arbSessionActions` (a seeded sequence of up to 30 actions from the 16 kinds including `withdraw-inference`, choosing only kinds the current state accepts so recording succeeds) and `arbSessionCorruption` (enumerated corruptions each tagged with its expected code).
    - _Requirements: 13.2, 13.18, 13.19_

  - [ ]* 14.7 Write property test for deterministic replay
    - **Property 18: Replay reconstructs the session deterministically**
    - **Validates: Requirements 9.13, 15.4, 15.5, 15.6, 15.7, 15.20, 13.18**
    - Seed `SEED_P18`, 100 runs. File: `src/domain/__tests__/replay.props.test.ts`.

  - [ ]* 14.8 Write property test for session log round trip
    - **Property 19: Session log export and import round trip**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.18**
    - Seed `SEED_P19`, 100 runs. File: `src/domain/__tests__/sessionRoundTrip.props.test.ts`.

  - [ ]* 14.9 Write property test for corruption boundaries
    - **Property 20: Corrupted, truncated and out-of-bounds input never yields a partial value**
    - **Validates: Requirements 1.4, 7.4, 7.5, 7.6, 7.7, 7.11, 15.8, 15.9, 15.10, 15.11, 15.12, 15.13, 15.14, 15.15, 15.16, 16.3, 13.19**
    - Seed `SEED_P20`, 300 runs, covering Deck JSON and Session_Log truncation, seeded byte corruption and the enumerated session corruptions. File: `src/domain/__tests__/corruption.props.test.ts`.

  - [ ]* 14.11 Write property test for confidence preservation across operations and replay
    - **Property 23: Edit, undo, approval, structure and replay preserve confidence including null**
    - **Validates: Requirements 5.8, 5.12, 5.14, 5.22, 5.24, 6.7, 17.4**
    - Seed `SEED_P23`, 150 runs, 1 to 4 cards with null-biased confidences, operation lists of 0 to 20 from edit, undo, approve (with and without policy), revoke, reorder, insert, remove and duplicate; only a successful `setInferred` (sets a number) or a successful `withdrawInference` (restores the recorded Previous_Fields value, a number or `null`) changes a confidence. The same operations recorded as a Session_Log and replayed give states with identical confidences.
    - File: `src/domain/__tests__/confidencePreserved.props.test.ts`.

  - [ ]* 14.12 Write property test for session replay with withdraw-inference
    - **Property 28: Session replay with withdraw-inference**
    - **Validates: Requirements 15.3, 15.21, 15.22, 13.24**
    - Seed `SEED_P28`, 100 runs, up to 30 seeded actions including `withdraw-inference` over 1 to 4 cards; replay twice gives byte-identical canonical JSON per state with digests equal to those recorded, and each state's Deck equals the Deck from calling `withdrawInference` directly; a seeded invalid-withdrawal variant (unknown card, out-of-range read index, reused action id, latest Live_Entry a user edit, no inference) returns `SESSION_ACTION_FAILED` with the path and underlying code and no states.
    - File: `src/domain/__tests__/replayWithdrawal.props.test.ts`.

  - [ ]* 14.10 Write session unit and example tests
    - A log with an edit then `sim-create` replays to a state that differs from `create` of the initial deck; a flipped digest returns `SESSION_DIGEST_MISMATCH` naming that action; `INPUT_TOO_LARGE` at 32 MiB and plus one byte; 100,000 and 100,001 actions; a corrupt initial deck returns validator violations; digest algorithm name is stored.
    - A session containing `withdraw-inference` after an approval replays with the `withdrawal`-cause approval record in state and digest.
    - Files owned: `src/domain/__tests__/session.test.ts`.
    - _Requirements: 9.13, 15.8, 15.9, 15.12, 15.17, 15.19, 13.19_

- [ ] 15. Golden tests
  - [ ] 15.1 Build the golden fixture and update script
    - Create the `golden-3x2` profile (3 rows, 2 columns, 1 reserved, both mappings permitted) and a 2-card deck built only through public operations: one observed cell, one repeat-inferred cell, one ambiguous cell resolved by the policy, one user-edited cell with an undone edit, and one further ambiguous cell (confidence `null`) that receives a `repeat-inferred` inference which is later withdrawn, so the goldens show an `inference` entry with `previous` (`confidence: null`) and a `withdrawal` entry with `restored`. Approval history has three records: `init`, `approve`, then `unapproved` with cause `withdrawal`. Include one observed cell with `restorationConfidence: null` (detection-style, not evaluated) and one observed cell with `restorationConfidence: 0`, so the goldens show `null` and `0` side by side. Add a script `golden:update` that regenerates the golden files, run only on purpose.
    - Files owned: `src/domain/__tests__/golden/fixture.ts`, `src/domain/__tests__/golden/update.ts`.
    - _Requirements: 5.31, 13.14_

  - [ ] 15.2 Commit goldens and write the comparison tests
    - Create committed goldens in `src/domain/__tests__/golden/`: `deck.golden.json`, `deck-px.golden.svg`, `deck-unapproved-px.golden.svg`, `session.golden.json` (eight actions: user-edit, undo-edit, set-inferred, request-approval, sim-create, two sim-steps, withdraw-inference, with digests), `fabric-repeat.golden.json` and `fabric-contiguous-mirrored.golden.json` (threads-per-hook 2). Tests assert byte equality, and a test asserts `deck.golden.json` contains the literal `null` for the unevaluated cell and `0` for the zero-confidence cell. Any golden change needs a stated reason in the commit message.
    - _Requirements: 7.12, 7.14, 13.14, 15.21, 17.7_

- [ ] 16. Integration and final checks
  - [ ]* 16.1 Write property test for bitmap round trip
    - **Property 14: Bitmap to Deck to fabric round trip**
    - **Validates: Requirements 10.1, 10.2, 10.4, 10.5, 10.6, 10.8, 13.9**
    - Seed `SEED_P14`, 200 runs. Add `arbBitmap(readableCount)` with a malformed variant in `generators/bitmap.ts`. File: `src/domain/__tests__/bitmapRoundTrip.props.test.ts`.

  - [ ] 16.2 Write the error-code coverage test
    - `src/domain/__tests__/errorCodes.test.ts` triggers every code in `ERROR_CODES` (including `MISSING_REQUIRED_FIELD` and `NOTHING_TO_WITHDRAW`) through the public API at least once and fails when a registered code is never triggered.
    - _Requirements: 16.1, 16.2, 16.3, 16.5_

  - [ ] 16.3 Write the final repository guards
    - Test that no file imports `_stub.ts`, then delete `_stub.ts`; scan `src/domain` and `docs` for the strings "laser-ready", "cut-ready" and "machine-ready"; assert the surface snapshot is unchanged since the freeze and `INTERFACE_VERSION` is `"1.1.0"`; assert `SIMULATION_DISCLAIMER` and `SVG_CAVEAT` equal the required text.
    - Files owned: `src/domain/__tests__/guards.test.ts`.
    - _Requirements: 8.16, 11.5, 11.6, 12.1, 12.6_

  - [ ] 16.4 Add the domain benchmark script
    - Create `scripts/bench-domain.ts` and an `npm run bench:domain` entry that times `runToEnd` at 625 passes by 6,400 warps, a 10,000-card deck export and a 100,000-action replay. It prints measurements and asserts no threshold. No performance claim is made in code or docs without a recorded run.
    - _Requirements: 8.11, 14.10, 15.12_

  - [ ] 16.5 Write the end-to-end integration test
    - `src/domain/__tests__/integration.test.ts`: bitmap to deck, resolve cells, approve, record a session with edits, an inference, a withdrawal and simulation steps, export and import the session, replay it, run the loom with each mapping and mirror option, export deck JSON and SVG, and assert the results agree with the recorded states.
    - _Requirements: 7.3, 8.15, 10.8, 11.8, 15.5, 15.6_

  - [ ]* 16.6 Write property test for interpreter and SVG ignoring confidence
    - **Property 24: Interpreter and SVG ignore confidence**
    - **Validates: Requirements 17.5**
    - Seed `SEED_P24`, 100 runs, `arbApprovedDeck` with 1 to 8 cards and a second deck equal except for a seeded rewrite of confidences from `null` and [0, 1]; `runToEnd` output and both SVG exports must be byte-identical. Runs after tasks 9 and 11 are merged.
    - File: `src/domain/__tests__/confidenceIgnored.props.test.ts`.

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Required tasks include the import-boundary test, the surface snapshot, golden tests and the final guards, because they enforce stated requirements.
- Crew delegation summary:

| Task | Crew-delegable | Depends on | Files owned (disjoint) |
|------|----------------|------------|------------------------|
| 6 | No, single worker (includes `withdrawInference`, P25, P26, P29, withdrawal examples) | 5 | `card/*`, `deck/*`, `generators/deck.ts` |
| 8 | Yes, Group B (includes P27) | 4.1, 6 | `io/serialize.ts`, `io/migrate.ts` |
| 9 | Yes, Group B | 3, 6 | `loom/config.ts`, `loom/interpreter.ts`, `loom/simulation.ts`, `generators/loom.ts` |
| 10 | Yes, Group B | 6 | `bitmap/bitmapToDeck.ts` |
| 11 | Yes, Group B | 6 | `svg/exportSvg.ts` |
| 12 | Yes, Group B | 5 | `docs/domain-*.md`, `docsSync.test.ts` |
| 14 | Yes, Group C (includes P28) | 13 | `session/digest.ts`, `apply.ts`, `record.ts`, `replay.ts`, `serialize.ts`, `generators/session.ts` |

- Each crew task owns its tests and edits no frozen file. If a crew worker finds that a frozen signature must change, it stops and reports so the spec can be updated.
- Each task references requirement clauses for traceability. Property tasks reference the property numbers in `design.md`.
- Withdrawal work (amendment, interface 1.1.0): types in 2.1, error code in 1.3, stubs and surface in 4.2 to 4.4, implementation in 6.3, validator in 6.5, P25, P26 and P29 plus examples in 6.15 to 6.18, JSON in 8.1 with P27 in 8.6, session dispatcher and replay in 14.2 and 14.5 with P28 in 14.12, docs in 12.1 to 12.3, goldens in 15.1 and 15.2.
- Properties 2, 3 and 4 are completed across tasks (3.5, 3.6, 3.7 with 6.14 and 9.10) because they touch Card and fabric code that does not exist at the interface stage.
- Null-confidence work (Req 17) is placed where file ownership fits: types in 2.1, error code in 1.3, validator and `setInferred` in 6.3 and 6.5, vision constructor in 6.1, boundary examples in 6.14 and 8.4, Property 22 in 8.5 (task 8 owns the JSON files), Property 23 in 14.11 (needs replay, Group C), Property 24 in 16.6 (needs both loom and SVG, so it runs after Group B is merged), goldens in 15.1 and 15.2. New sub-tasks 8.5, 14.11 and 16.6 add no new frozen files and no new owned source files.
- Detection (vision spec) must map every detected cell to `restorationConfidence: null`; only the restoration spec sets a numeric value, through `setInferred`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "4.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3", "3.1", "3.2", "3.3"] },
    { "id": 5, "tasks": ["2.4", "3.4", "3.5", "3.6", "3.7", "4.2"] },
    { "id": 6, "tasks": ["4.3"] },
    { "id": 7, "tasks": ["4.4"] },
    { "id": 8, "tasks": ["5"] },
    { "id": 9, "tasks": ["6.1"] },
    { "id": 10, "tasks": ["6.2", "6.3"] },
    { "id": 11, "tasks": ["6.4", "6.5", "6.6"] },
    { "id": 12, "tasks": ["6.7"] },
    { "id": 13, "tasks": ["6.8", "6.9", "6.10", "6.11", "6.12", "6.13", "6.14", "6.15", "6.16", "6.17", "6.18"] },
    { "id": 14, "tasks": ["7"] },
    { "id": 15, "tasks": ["8.1", "8.2", "9.1", "10.1", "11.1", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 16, "tasks": ["8.3", "8.4", "8.5", "8.6", "9.2", "10.2", "11.2", "11.3"] },
    { "id": 17, "tasks": ["9.3", "9.4"] },
    { "id": 18, "tasks": ["9.5", "9.6", "9.7", "9.8", "9.9", "9.10"] },
    { "id": 19, "tasks": ["13"] },
    { "id": 20, "tasks": ["14.1", "14.2", "14.4"] },
    { "id": 21, "tasks": ["14.3", "14.5"] },
    { "id": 22, "tasks": ["14.6"] },
    { "id": 23, "tasks": ["14.7", "14.8", "14.9", "14.10", "14.11", "14.12"] },
    { "id": 24, "tasks": ["15.1"] },
    { "id": 25, "tasks": ["15.2"] },
    { "id": 26, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5", "16.6"] },
    { "id": 27, "tasks": ["17"] }
  ]
}
```

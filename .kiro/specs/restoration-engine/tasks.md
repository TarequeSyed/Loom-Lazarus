# Implementation Plan: Restoration Engine

## Overview

This plan implements the Restoration_Engine in `src/restore` as strict, pure TypeScript with Vitest and fast-check, following `design.md`. It builds on `card-domain-and-loom-engine` (interface version 1.1.0 or a later compatible minor version, including `withdrawInference` and `latestLiveEntry`) and consumes detection output through its own structural input types (Q6), without importing `src/vision`, `src/benchmark`, `src/ui` or `src/workers`.

The plan is ordered so that interfaces come first:

- **Tasks 1 and 2:** repository preparation (including the `structure.md` update that Q7 requires) and every interface definition: result and error registries, inputs and masking contract, configuration, hypotheses, regions, abstentions, prior gating, state machine, audit entries, evidence view and heatmap types, signature stubs, the public index, and the domain-version check.
- **Task 3: INTERFACE FREEZE.** After it, exported signatures change only through a spec update (Req 23.4).
- **Groups A to C (tasks 4 to 17 and 23):** Crew-delegable components with disjoint files, their own tests, no shared mutable state, and dependence on frozen interfaces only (plus the domain library where stated).
- **Group D (tasks 19 and 20):** the engine integration and the review service. Each is one worker and is not split.
- **Group E (tasks 21, 22, 24 to 26):** stretch whole-card recovery, offline scripts, goldens, regression examples, final guards and integration.

Out of scope here (other specs): the React UI (spec 5), the benchmark harness, damage models and accuracy targets (spec 4), image detection, within-card periodicity detection, and any learned or LLM-based restoration.

Approved decisions reflected here:
- **Q1:** reversal of an accepted or selected inference uses the domain `withdrawInference`, once per region cell, after an all-cells pre-check. `undoEdit` is used only for `edit-cell`.
- **Q2:** a Hypothesis is written to the Deck only after `accept-hypothesis` or `select-alternative`, through `setInferred`.
- **Q3:** the optional `opaqueTimestampLabel` is stored verbatim, never parsed, capped by configuration (default 64), and excluded from equality, digests and determinism comparisons.
- **Q4:** the domain multi-level undo limit for edits is inherited unchanged.
- **Q5:** a Synthetic_Only_Prior is disabled by default on `real` decks. Use needs an explicit, audited `enable-synthetic-prior` entry, and every dependent output carries `syntheticPriorWarning`, the fixed warning text and `uncalibrated` status.
- **Q6:** `DetectionEvidenceInput` is restoration's own structural type. No import from `src/vision`. Keeping it a structural subset of `CardDetectionRecord` is a manual process, covered by a fixture-based test.
- **Q7 (folder part resolved):** the `scripts` entry has already landed in `structure.md`, so task 1.1 only verifies it. `scripts/restoration-tune.ts` is TypeScript so that it runs the same `src/restore` functions as the browser, and it is a thin CLI: role checking and Minimal_Dataset_Format import live in the pure modules `src/restore/tuning/roles.ts` and `src/restore/tuning/datasetFormat.ts`. Where committed Prior_Measurement and Calibration_Record artifacts live is still open (Q7a, recommended `data/restoration/` with a README); task 27 confirms it.
- **Amendment (benchmark roles):** restoration reads only the benchmark roles `tuning` and `calibration`. `held-out` and the sealed `test` role are refused by name before any cell is read (Req 26). `PriorMeasurement` records `datasetVersion` and `splitRole`. `CalibrationRecord` records its calibration and tuning roles, file-set ids and `datasetVersion`. Official `held-out` and `test` metrics come only from the benchmark runner (spec 4). Error codes `ROLE_NOT_PERMITTED_FOR_TUNING`, `FILE_SET_OVERLAP` and `SPLIT_ROLE_MISMATCH` are added to the registry. New properties P23 to P25 use seeds 20260523 to 20260525, and P22 is extended.

Conventions for every task:
- Inside `src/restore`, files that produce a Hypothesis, a Restoration_Record or a Deck write must not use `document`, `window`, `fetch`, `XMLHttpRequest`, `Date`, `Math.random`, `performance.now`, `setTimeout` or `setInterval` (Req 19.2, 23.7). Tests under `__tests__` are exempt from the identifier scan, but still use no `Math.random`, `Date.now` or network (Req 25.3).
- Each property test is a single `fc.assert(fc.property(...), { seed, numRuns })`, with `numRuns` at most 500, the seed taken from `src/restore/__tests__/seeds.ts`, a tag comment `// Feature: restoration-engine, Property N: <title>`, and an adjacent generator-precondition and seed comment (Req 25.1, 25.2). Failure output prints the seed and the shrunk counterexample (`verbose: 1`).
- Damaged decks in tests are built by a test-owned seeded masking function applied to a valid truth deck, so ground truth is known to the test and unreachable by the Inference_Engine (Req 25.3).
- Code that depends on an unverified assumption carries `// UNVERIFIED <id>: see .kiro/steering/jacquard-card-format.md` (ids R1 to R6, A3 to A8, A10).
- A worker edits only the files its task owns. Frozen files change only through a spec update. A worker that finds a frozen signature must change stops and reports.
- `RestorationResult` is the only error channel for expected failures. No function throws for an expected failure and no function returns a partial result (Req 1.9).
- Every domain write goes through the exact domain function named in Req 13.1. `src/restore` imports `src/domain` only through its index and never duplicates a domain type (Req 23.5).
- Restoration_Confidence stays `null` (not evaluated) for every cell without a written Hypothesis. `null` is never coerced to `0` (Req 10.3, 18.8, 21.9).
- Run tests with `vitest --run`, never watch mode.
- Every shrunk counterexample found becomes a permanent example in `src/restore/__tests__/regressions.test.ts` (task 25).
- No task asserts an accuracy, frequency or reliability threshold, and no document quotes a number that is absent from a recorded run (Req 24.4).

## Tasks

- [ ] 1. Repository preparation and scaffold
  - [ ] 1.1 Verify the `scripts` entry exists in `structure.md` (Q7, folder part)
    - Read `.kiro/steering/structure.md` and confirm it already has the `scripts` entry (thin TypeScript CLI entry points that may import the public index of any `src` folder, imported by no `src` folder, writing generated data only under `data/generated`, committed manifests and reports under `data/benchmark`). Do not edit the file if the entry is present. If it is missing, stop and report instead of adding it.
    - Confirm the entry does not forbid committed restoration artifacts. Where those artifacts live (Q7a, recommended `data/restoration/`) is decided in task 27, and `structure.md` is updated only if that decision needs it.
    - Files owned: none (read-only verification).
    - _Requirements: 10.10, 24.3, 26.1_

  - [ ] 1.2 Scaffold `src/restore`, seeds and shared test helpers
    - Create the `src/restore` skeleton from the design's module layout (placeholder `index.ts`, `__tests__/`, `__tests__/generators/`, `__tests__/golden/`).
    - Create `src/restore/__tests__/seeds.ts` with `SEED_P1` to `SEED_P27` (`20260500 + n`, so P23 to P27 are 20260523 to 20260527) and `SEED_GOLDEN = 20260600`. The seed block start 20260500 is settled. Create `src/restore/__tests__/helpers.ts` reusing or mirroring the domain `deepFreeze` and `cloneBefore` helpers, plus `stripOpaqueLabels(record)` used by every equality and determinism comparison.
    - Verify that the integrator's milestone M0 files exist: `package.json` with every script pre-registered (including `restore:tune` and `restore:golden:update`), `tsconfig*.json`, and the Vite, Vitest and Playwright configs. This task does not create or edit any of them. If a script or config is missing or needs a change, stop and ask the integrator for it.
    - Files owned: `src/restore/__tests__/seeds.ts`, `src/restore/__tests__/helpers.ts`, folder skeleton.
    - _Requirements: 19.2, 25.1, 25.3_

  - [ ] 1.3 Write the import-boundary test
    - Create `src/restore/__tests__/boundary.test.ts` using the TypeScript compiler API over every `.ts` file in `src/restore` and `src/domain`.
    - Fail on imports in `src/restore` that resolve to `src/vision`, `src/benchmark`, `src/ui` or `src/workers` (relative or alias form), on any import of `src/domain` other than through its index, and on a file in `src/domain` that imports `src/restore`.
    - Fail on the forbidden identifiers listed in Conventions in any `src/restore` file outside `__tests__`.
    - Fail on any module in `src/restore` whose name or import path refers to a ground-truth, benchmark, damage or evaluation module (Req 19.5), and on any import of `scripts/` from `src/restore` (the tuning modules in `src/restore/tuning` are pure and are imported by the script, never the reverse).
    - Add a negative self-test that feeds an in-memory violating source and expects failure.
    - Files owned: `src/restore/__tests__/boundary.test.ts`.
    - _Requirements: 19.2, 19.5, 23.5, 23.6, 23.7_

- [ ] 2. Interface definitions
  - [ ] 2.1 Define `RestorationResult`, the error registry and limits
    - Create `result.ts`: `RestorationResult`, `RestorationError` (code, message, path, `domainCode`), `RESTORATION_ERROR_CODES` tuple (all codes in Req 22.1 plus `NO_POLARITY_RECORDED` and the amendment codes `ROLE_NOT_PERMITTED_FOR_TUNING` (Req 26.3), `FILE_SET_OVERLAP` (Req 26.4) and `SPLIT_ROLE_MISMATCH` (Req 26.7); `UNKNOWN_FIELD` is already in the list and also serves Req 26.6), derived `RestorationErrorCode`, `RESTORATION_ERROR_MESSAGES` with a stable message per code, `ABSTENTION_REASONS` tuple (Req 22.2) with `ABSTENTION_MESSAGES`, `ok`/`err` helpers, and `wrapDomainError` that maps a domain error to `DOMAIN_RULE_REJECTED` with `domainCode`, `path` and `message` copied. Do not extend the domain `ErrorCode` union.
    - Attestation: export `SYNTHETIC_DECK_NOTICE = "Measured on synthetic data. This says nothing about historical cards."` from `limits.ts` (frozen text, used by explanations and tests). No new error code is added: every attestation failure is `INVALID_CONFIGURATION` (Req 3.26).
    - Create `limits.ts`: `RESTORATION_LIMITS` (3 hypotheses per region, 1,000 explanation characters, 1,000 note characters, domain ceiling 10,000 cards) and `SYNTHETIC_PRIOR_WARNING_TEXT` ("Warning: this prior was derived from synthetic data and has not been validated on historical cards.").
    - Files owned: `src/restore/result.ts`, `src/restore/limits.ts`.
    - _Requirements: 3.18, 20.2, 20.3, 22.1, 22.2, 22.3, 22.6, 26.3, 26.4, 26.6, 26.7_

  - [ ] 2.3 Define the model types: cells, regions, hypotheses, priors and calibration
    - `types/cell.ts` (types only: `CellRef`, `AppliedOverrideLike`, predicate signatures declared in the stubs task), `types/hypothesis.ts` (`Hypothesis` with `values: ReadonlyMap<number, Bit>`, `Alternative`, `AbstentionReasonCode`, `Abstention`, `EvidenceItem`, `CalibrationStatus`, `rawConfidence`, `syntheticPriorWarning`, optional `stretch`), `types/priors.ts` (`StructuralPriorKind`, `SymmetryAxisKind`, `PriorMeasurement` with the required fields `datasetVersion` and `splitRole: "tuning" | "calibration"`, `PriorGateState`, `DeckOrigin`, `SyntheticPriorEnablementEntry`), `types/calibration.ts` (`CalibrationRecord` with `calibrationRole: "calibration"`, `tuningRole: "tuning"`, `calibrationFileSetIds`, `tuningFileSetIds`, `datasetVersion`, an optional `expectedCalibrationError` carrying `measuredOnRole: "tuning" | "held-out" | "test"` (never `calibration`), `validPriorKinds`, `validSupportRange` and the histogram-binning mapping entries). Add `BenchmarkSplitRole`, `TuningPurpose` and `FileSetRef` to `types/priors.ts` for the tuning modules.
    - Attestation: in `types/priors.ts` add `SyntheticImageAttestation` (fields `generator`, `generatorVersion`, `sourceId`, `seed`, `parametersDigest`, `imageDigest`, as in the design) and `SyntheticAttestationRef` (`cardId`, `sourceId`, `imageDigest`, the per-card reference copied into outputs). Add optional `attestationRefs?: readonly SyntheticAttestationRef[]` to `Hypothesis` (`types/hypothesis.ts`) and to `PriorGateState`. In `types/calibration.ts` add `CalibrationRecord.scope` (`"synthetic" | "real"`, as in the design).
    - Reuse domain types by name (`Bit`, `Provenance`, `ActionId`, `SequenceNumber`); add a compile-time test (`// @ts-expect-error`) that a `Hypothesis` cannot carry provenance `observed`.
    - Files owned: `src/restore/types/cell.ts`, `hypothesis.ts`, `priors.ts`, `calibration.ts`, `src/restore/__tests__/modelTypes.test.ts`.
    - _Requirements: 3.4, 8.7, 10.5, 10.8, 12.2, 26.2_

  - [ ] 2.2 Define inputs, configuration and the masking contract
    - `types/inputs.ts`: `DetectionEvidenceInput` (structural, no `src/vision` import, field list as in the design), `Condition`, `RestorationInput`, `RestorationConfig` (all fields with documented ranges in TSDoc), `StructuralPriorKind` re-export. `RestorationInput` and every type it references declare no field that can carry a Ground_Truth_Value, a truth Deck or an evaluation label.
    - Attestation: add the optional `syntheticAttestations?: ReadonlyMap<string, SyntheticImageAttestation>` field to `RestorationInput` (keyed by `cardId`, absent or empty for `deckOrigin` `real`), with TSDoc stating that `src/restore` never constructs an attestation and that the declaration is the caller's, not proof.
    - Add the masking-contract types for benchmark use (`MaskedCellSpec`) and document in TSDoc that a masked cell is a Raw_Observation without value and provenance `ambiguous`.
    - Files owned: `src/restore/types/inputs.ts`.
    - _Requirements: 1.1, 1.5, 19.4, 19.7, 20.1, 23.3_

  - [ ] 2.4 Define the record, review, state and audit types
    - Attestation: `RestorationRecord` gains `deckOrigin` and an optional per-card `syntheticAttestations` list in deck order (each entry led by `cardId`, omitted when empty), placed after `syntheticPriorEnablements` and before `lastEntrySequence`.
    - `types/record.ts` (`RawObservationCopy`, `RunSection`, `Diagnostic`, `RestorationRecord` with the single shared `lastEntrySequence` counter), `types/review.ts` (`ReviewActionKind`, `ReviewOutcome`, `ReviewActionInput`, `RestorationState`), `types/audit.ts` (`AuditEntry`, `OpaqueTimestampLabel` as a plain string with a documented cap).
    - Files owned: `src/restore/types/record.ts`, `review.ts`, `audit.ts`.
    - _Requirements: 12.2, 12.5, 12.8, 14.1, 15.1, 17.1, 17.3_

  - [ ] 2.5 Define the Evidence Mode and heatmap view types
    - Attestation: `EvidenceView` and `ConfidenceHeatmapEntry` carry `deckOrigin` and `attestationRefs` (`SyntheticAttestationRef[]`).
    - `types/view.ts`: `EvidenceView`, `ConfidenceHeatmapEntry` (`confidence: number | null`), `ConfidenceHeatmapData` (separate `holeProbabilityLayer`, `deckLevelSyntheticWarning`). No rendering, colour or pixel field.
    - Files owned: `src/restore/types/view.ts`.
    - _Requirements: 18.1, 18.3, 18.7, 18.8, 18.9, 18.10, 18.12, 18.14_

  - [ ] 2.6 Declare signature stubs for every remaining module
    - In each file below, export the final function signatures from the design with TSDoc listing the `RestorationError` codes. Bodies call a temporary `notImplemented()` helper in `src/restore/_stub.ts`.
    - Files: `types/cell.ts` predicates (`isProtectedCell`, `isTargetCell`, `isTrustedCell`), `config/validate.ts` (including `validateSyntheticAttestation` and `validateOriginAndAttestation`), `config/defaults.ts`, `determinism/ordering.ts`, `determinism/leakageGuard.ts`, `inference/trustedCells.ts`, `regions/segment.ts`, `gating/priorGate.ts`, `calibration/apply.ts`, `calibration/validate.ts`, `inference/{repeat,symmetry,imageEvidence,combine,explain,rank,wholeCard,engine}.ts`, `record/{build,serialize}.ts`, `review/{stateMachine,domainWrite,approval,undo,service}.ts`, `evidence/{evidenceView,heatmap}.ts`, `tuning/roles.ts` (`permitTuningRole`, `checkFileSetsDisjoint`) and `tuning/datasetFormat.ts` (`MinimalDatasetFile`, `importMinimalDataset(text, suppliedRole)`). The two tuning stubs are pure signatures with no file or clock access.
    - Stubs carry the final contract: `runInference` is pure and takes only a `RestorationInput`; `applyAcceptedHypothesis` takes one `setInferred` call per cell with Action_Id `"<actionId>#<cardId>#<readIndex>"`; `undoReviewAction` documents the all-cells pre-check; no stub accepts a ground-truth value.
    - `_stub.ts` is temporary. Task 26.1 asserts that nothing imports it and deletes it.
    - _Requirements: 13.1, 13.3, 17.6b, 19.4, 22.6, 23.1, 26.1, 26.3_

  - [ ] 2.7 Create the public index, interface version and domain-version check
    - Create `src/restore/index.ts` as the single export surface re-exporting every type, function and constant named in the design, plus the tuning functions and types (`permitTuningRole`, `checkFileSetsDisjoint`, `importMinimalDataset`, `MinimalDatasetFile`, `BenchmarkSplitRole`, `TuningPurpose`, `FileSetRef`) so that the script and the benchmark spec use them through the public index, plus `RESTORATION_INTERFACE_VERSION = "1.0.0"`, `RESTORATION_ERROR_CODES`, `RESTORATION_ERROR_MESSAGES`, `ABSTENTION_REASONS`, `SYNTHETIC_PRIOR_WARNING_TEXT`, `SYNTHETIC_DECK_NOTICE`, `SyntheticImageAttestation`, `SyntheticAttestationRef`, `validateSyntheticAttestation` and `validateOriginAndAttestation`. Do not export anything from `__tests__`.
    - Add `MIN_DOMAIN_INTERFACE_VERSION = "1.1.0"` and a test `domainVersion.test.ts` that compares the domain `INTERFACE_VERSION` with it (same major, equal or greater minor) and fails when lower; also assert the domain index exports `withdrawInference`, `latestLiveEntry` and `NOTHING_TO_WITHDRAW` in its error registry.
    - Files owned: `src/restore/index.ts`, `src/restore/__tests__/domainVersion.test.ts`.
    - _Requirements: 13.1, 17.12, 23.1, 23.5_

  - [ ] 2.8 Add the exported-surface snapshot test
    - Create `src/restore/__tests__/surface.test.ts` comparing the sorted exports of `index.ts` with a committed `surface.snapshot.json`, plus an assertion that `RESTORATION_INTERFACE_VERSION` exists. Any later snapshot change requires a spec update.
    - Files owned: `src/restore/__tests__/surface.test.ts`, `src/restore/__tests__/surface.snapshot.json`.
    - _Requirements: 23.1, 23.4_

- [ ] 3. INTERFACE FREEZE checkpoint
  - Ensure `vitest --run` and the type check pass, the surface snapshot is committed, the domain-version check passes, and the stub list in task 2.6 is complete.
  - From this point every file in `types/`, `result.ts`, `limits.ts`, `index.ts` and all exported signatures change only through a spec update. Crew workers must not edit frozen files.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Configuration, limits, ordering and masking helpers (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `config/validate.ts`, `config/defaults.ts`, `determinism/ordering.ts`, `determinism/leakageGuard.ts`, and the test files below (task 4.4 also depends on task 7.2).
  - [ ] 4.1 Implement configuration defaults, `validateConfig` and `validateLimits`
    - `DEFAULT_RESTORATION_CONFIG` with the design's initial values (marked as initial, not validated). `validateConfig`: documented range per field (first failure wins, `INVALID_CONFIGURATION` naming field and range), `0 <= chance margins <= 0.5`, fixed limits cannot be raised, `maxCardsPerRun` at most 10,000, and the cross-field rule that `syntheticEvaluationContext` requires `deckOrigin: "synthetic"` (`INVALID_CONFIGURATION`). `validateLimits(input)` returns `LIMIT_EXCEEDED` naming limit, supplied and permitted value before any inference starts; The earlier blanket rule that rejected `deckOrigin: "synthetic"` on any deck with an `Image_Digest` is replaced by the per-card attestation check below.
    - Attestation: add `validateSyntheticAttestation(a)` (field order generator, generatorVersion, sourceId, seed as integer, parametersDigest and imageDigest in digest format; returns the first failing field) and `validateOriginAndAttestation(input)` (check order of the design: `real` deck with any entry; per entry unknown card, card without `Image_Digest`, failing field, digest mismatch; then each card with an `Image_Digest` and no entry; first failure wins; path `syntheticAttestations[<cardId>]` with `.<field>` when a field is the cause; always `INVALID_CONFIGURATION`; digests compared in canonical `<algorithm>:<hex>` form). Cards without an `Image_Digest` need no entry, so a mixed deck is valid. Add a code comment that the declaration is the caller's and not proof. Neither function constructs an attestation. Called by the run entry point after `validateConfig` and before `validateLimits`.
    - Files owned: `src/restore/config/validate.ts`, `src/restore/config/defaults.ts`.
    - _Requirements: 1.7, 1.8, 3.21, 20.1, 20.2, 20.3, 20.4_

  - [ ] 4.2 Implement canonical ordering and masking helpers
    - `canonicalCardOrder`, `canonicalIterationOrder` (cardId position, then readIndex, then period or axis ascending, never object key order), `maskCell` and `isMasked` operating only on domain `Deck` and `Cell` shapes (a masked cell has a Raw_Observation without value and provenance `ambiguous`). A masked cell that still carries `raw.value` is treated as an observation.
    - Files owned: `src/restore/determinism/ordering.ts`, `src/restore/determinism/leakageGuard.ts`.
    - _Requirements: 19.3, 19.6, 19.7, 23.3_

  - [ ]* 4.3 Write configuration, limits and masking unit tests
    - Each documented range boundary accepted and one beyond rejected, fixed limits cannot be raised, 10,000-card ceiling, cross-field synthetic rule, `LIMIT_EXCEEDED` before work, masking helper round trip, ordering independent of key insertion order. Add a fixture-based structural test (Q6): a hand-written literal that mirrors a `CardDetectionRecord` golden is assigned to `DetectionEvidenceInput` without a cast and without importing `src/vision`; the test header notes the field list must be kept in sync manually.
    - Files owned: `src/restore/__tests__/config.test.ts`, `src/restore/__tests__/masking.test.ts`, `src/restore/__tests__/detectionInput.test.ts`.
    - _Requirements: 1.4, 1.7, 1.8, 19.3, 19.6, 20.2, 20.3, 20.4_

  - [ ]* 4.4 Write property test for attestation validity and rejection cases
    - **Property 26: Attestation validity and rejection cases**
    - **Validates: Requirements 3.21, 3.22, 3.23, 3.26, 25.23, 25.24, 25.25**
    - Depends on task 7.2 (`arbAttestedInput`). Seed `SEED_P26` (20260526), 300 runs; assert cases (a) to (d) of the property: field and digest violations name `syntheticAttestations[<cardId>].<field>` in check order, a card with an `Image_Digest` and no entry is rejected, any entry on a `real` deck is rejected, an entry for an unknown card or a card without an `Image_Digest` is rejected, valid maps (including mixed decks) pass, only `INVALID_CONFIGURATION` is used, and a rejected run yields no Hypothesis and no record.
    - Files owned: `src/restore/__tests__/attestation.props.test.ts`.
- [ ] 5. Cell classification and region segmentation (Crew-delegable, Group A)
  - Depends on: task 3, task 4.2 (for 5.2). Files owned: `types/cell.ts` (predicate bodies), `inference/trustedCells.ts`, `regions/segment.ts`, and the test file below.
  - [ ] 5.1 Implement the cell predicates
    - `isProtectedCell`, `isTargetCell`, `isTrustedCell` as the only place classification logic lives: observed and un-reversed user-edited cells are protected, Applied_Override cells are protected for automatic writing, Target_Cell means provenance `ambiguous` with no effective value, repeat-inferred, symmetry-inferred and ambiguous cells are never trusted.
    - Files owned: `src/restore/types/cell.ts`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9, 2.11_

  - [ ] 5.2 Implement trusted-cell collection and region segmentation
    - `collectTrustedCells` (one pass, indexed by `(cardId, readIndex)`, excludes Applied_Override cells and earlier inferences), `segmentRegions` (maximal runs of consecutive Target_Cells within one card, Protected_Cells as boundaries, a card with every cell a Target_Cell yields one region of `readableCount` cells routed to whole-card recovery).
    - Files owned: `src/restore/inference/trustedCells.ts`, `src/restore/regions/segment.ts`.
    - _Requirements: 2.5, 2.6, 2.9, 2.12, 7.1, 7.5, 7.6_

  - [ ]* 5.3 Write classification and segmentation unit tests
    - Worked examples: a card with no Target_Cells, one with every cell a Target_Cell, Protected_Cells splitting two regions, an Applied_Override cell excluded from the trusted set, an earlier inference excluded from the trusted set, a region of exactly `readableCount` cells.
    - Files owned: `src/restore/__tests__/regions.test.ts`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.9, 2.12, 7.6_

- [ ] 6. Prior gating and enablement (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `gating/priorGate.ts`, and the test file below.
  - [ ] 6.1 Implement `validatePriorMeasurement`, `evaluatePriorGate` and enablement recording
    - `validatePriorMeasurement` (`INVALID_PRIOR_MEASUREMENT` with the path of the first violation: missing field including `datasetVersion` and `splitRole`, a `splitRole` other than `tuning` or `calibration` (so `held-out`, `test` and unknown names are rejected at `splitRole`), frequency or reliability outside [0, 1], sample size below 1, kind mismatch). `evaluatePriorGate` per the design's six branches: disabled, `PRIOR_MEASUREMENT_MISSING`, real deck with synthetic-only measurement and no enablement in effect (`PRIOR_NOT_VALIDATED_FOR_REAL_DECKS`), real deck with enablement in effect (warning on, `uncalibrated`), synthetic deck in a Synthetic_Evaluation_Context (no warning), plain measurement. Measurements of scope `synthetic` and `real` stay separate and are never pooled; a synthetic frequency is labelled a generator parameter; a measurement with licence status `unchecked` is marked `local-only`.
    - `recordSyntheticPriorEnablement` appends an `enable-synthetic-prior` or `disable-synthetic-prior` entry with Action_Id and Sequence_Number (`DUPLICATE_ACTION_ID`, `NOTE_REQUIRED`, `NOTE_TOO_LONG`, `INVALID_TRANSITION` for a kind without synthetic-only status); "in effect" is the latest entry per kind by sequence. Record the gate state of every run.
    - Attestation: a `synthetic` deck that passed `validateOriginAndAttestation` with a synthetic-only measurement uses the prior with no enablement entry, no `syntheticPriorWarning`, status `uncalibrated`, and copies the per-card `attestationRefs` into the `PriorGateState`. `PRIOR_MEASUREMENT_MISSING` still applies when no valid measurement exists. `real` decks behave exactly as before.
    - Files owned: `src/restore/gating/priorGate.ts`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 3.8, 3.9, 3.10, 3.12, 3.13, 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 3.20, 3.21_

  - [ ]* 6.2 Write gating unit tests
    - One example per gate branch; enable then disable then enable ordering by sequence; each error code of the enablement function; local-only marking; synthetic and real measurements for one kind stay separate; a synthetic-context run applies the prior with no warning; an attested synthetic deck uses the prior with no enablement entry, no warning and copied `attestationRefs`, and still returns `PRIOR_MEASUREMENT_MISSING` without a measurement.
    - Files owned: `src/restore/__tests__/priorGate.test.ts`.
    - _Requirements: 3.2, 3.6, 3.7, 3.10, 3.15, 3.16, 3.17, 3.20_

- [ ] 7. Test generators and synthetic pattern builders (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `src/restore/__tests__/generators/synthetic.ts`, `src/restore/__tests__/generators/data.ts`, `src/restore/__tests__/syntheticRecoveryConditions.ts`, and the test file below.
  - [ ] 7.1 Implement the synthetic deck builders and masking
    - `arbPeriodicDeck(period, density)` (one random row pattern per residue class modulo the period, density at least the degenerate margin away from 0 and 1, so the true period is known by construction), `arbSymmetricDeck(axisKind)` (mirrored card pairs about an axis, or rows satisfying the within-card partner mapping), `arbStructureFreeDeck` (independent uniform bits, re-checked by the same Evidence_Test the engine uses and retried with a new seed on an accidental pass), `arbFullyResolvedDeck`, `arbRealDeck`, `arbTruthDeckPair` (identical mask, different masked true values), and a test-owned seeded `maskDeck(deck, fraction, seed)`.
    - `syntheticRecoveryConditions.ts` exports the documented conditions as constants (minimum repeats, maximum masked fraction, minimum density margin, minimum deck size) used by Property 7 and documented in `docs/restoration-calibration.md`.
    - Files owned: `src/restore/__tests__/generators/synthetic.ts`, `src/restore/__tests__/syntheticRecoveryConditions.ts`.
    - _Requirements: 25.2, 25.3, 25.10, 25.11_

  - [ ] 7.2 Implement the data generators
    - `generators/data.ts`: `arbConfig`, `arbPriorMeasurement` and `arbCalibrationRecord` (valid, with `datasetVersion`, `splitRole`, roles and file-set ids, plus variants with one seeded violation tagged with the expected code, including the role, file-set and ECE-role violations), `arbRoleString`, `arbTuningPurpose`, `arbFileSetRefList`, `arbMinimalDatasetFile`, `arbExtraField` (generated path and name, never `familyKey` or `splitRole`) and `arbSplitRole`, `arbRestorationRecord` (satisfies every structural invariant, built independently of an inference run), `arbHypothesis` (varying evidence-item counts including truncation cases), `arbDetectionEvidence`, `arbRestorationInput`. All use small generated profiles of 3 to 12 rows and 2 to 8 columns unless a test says otherwise.
    - Attestation: add `arbAttestedInput` (deck of 3 to 12 cards where a generated subset carries evidence digests and the rest are context cards without evidence, a `deckOrigin`, and a `syntheticAttestations` map with at most one seeded violation tagged with its expected path) and a test-owned attestation builder used only in tests (`src/restore` never constructs one).
    - Files owned: `src/restore/__tests__/generators/data.ts`.
    - _Requirements: 25.2_

  - [ ]* 7.3 Write generator unit tests
    - Same seed gives identical output; the periodic builder yields the known period by construction and passes the engine Evidence_Test; the structure-free builder never passes it; truth pairs differ only on masked cells; each corruption variant carries its expected code.
    - Files owned: `src/restore/__tests__/generators.test.ts`.
    - _Requirements: 25.3, 25.10, 25.11_

- [ ] 8. Confidence calibration (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `calibration/apply.ts`, `calibration/validate.ts`, and the test files below.
  - [ ] 8.1 Implement `validateCalibrationRecord` and `applyCalibration`
    - Histogram binning with 10 equal-width bins. `validateCalibrationRecord` returns `INVALID_CALIBRATION_RECORD` (path of the first violation) when `calibrationRole` is not `calibration` or `tuningRole` is not `tuning`, either file-set id list is empty, a calibration file-set id equals or appears in the tuning list, `datasetVersion` is missing, `mapping.length !== binCount`, a calibrated value is outside [0, 1], or `expectedCalibrationError` is present with `measuredOnRole` equal to `calibration` or a value outside [0, 1]. An ECE measured on `tuning` is accepted and is labelled a development figure wherever shown. The Restoration_Engine never computes or quotes an ECE that is absent from the record. `applyCalibration` returns the raw value with status `uncalibrated` when no record is given, the prior kind is outside `validPriorKinds`, or the support count is outside `validSupportRange`; otherwise the calibrated value with a status citing the record. The raw value is always kept. A Hypothesis carrying the synthetic-prior warning is forced to `uncalibrated`. Expected calibration error is read from the record and never computed here.
    - Files owned: `src/restore/calibration/apply.ts`, `src/restore/calibration/validate.ts`.
    - _Requirements: 3.19, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_

  - [ ]* 8.2 Write calibration unit tests
    - Worked example: a fixed 10-bin record and a table of raw confidences with expected calibrated values; bin edge values; fallback to `uncalibrated` for an unlisted prior kind and for a support count out of range; the deck-level marker is `uncalibrated` unless every written confidence cites one record.
    - Files owned: `src/restore/__tests__/calibration.test.ts`.
    - _Requirements: 10.4, 10.7, 10.8, 10.9_

  - [ ]* 8.3 Write property test for measurement and calibration validation
    - **Property 22: Prior measurement and calibration record validation rejects malformed data**
    - **Validates: Requirements 3.4, 3.6, 10.5, 10.6, 10.10**
    - Seed `SEED_P22`, 300 runs; `arbPriorMeasurement` and `arbCalibrationRecord` each with one seeded violation. Prior_Measurement violations: missing field (including `datasetVersion` and `splitRole`), `splitRole` of `held-out`, `test` or an unknown name, frequency or reliability outside [0, 1], sample size below 1, kind mismatch. Calibration_Record violations: calibration or tuning role other than `calibration` or `tuning`, equal or overlapping file-set ids, empty id list, missing `datasetVersion`, wrong mapping length, calibrated value out of range, ECE measured on the `calibration` role. Assert the matching code and that the input is deeply equal to its copy. The generators in task 7.2 must produce these variants.
    - Files owned: `src/restore/__tests__/validation.props.test.ts`.

- [ ] 9. Repeat detection (Crew-delegable, Group B)
  - Depends on: tasks 4.2, 5.2, 7. Files owned: `inference/repeat.ts`, and the test file below.
  - [ ] 9.1 Implement repeat evidence testing and candidate derivation
    - For each period from 1 to `min(maxRepeatPeriod, cardCount - 1)`: comparable count, agreement count, agreeing card pairs, bit density, Chance_Baseline (`d^2 + (1-d)^2`), degenerate flag, and the Evidence_Test (minimum comparable, agreement threshold, margin over baseline, minimum support pairs). Each passing period is evaluated independently and never merged. Candidate value per Target_Cell is the majority of Trusted_Cells at distance `k*p` (both directions); an exact tie yields `CONFLICTING_EVIDENCE` and is never broken by position or seed; no support yields `NO_STRUCTURAL_EVIDENCE`; a degenerate pattern yields `DEGENERATE_PATTERN`. Iterate only in canonical order. Add `// UNVERIFIED R1` and `// UNVERIFIED A8` comments.
    - Files owned: `src/restore/inference/repeat.ts`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 19.3_

  - [ ]* 9.2 Write repeat unit tests
    - Hand-computed Evidence_Test worked example with the baseline value, a degenerate all-zero pattern, an exact tie, two passing periods kept separate, a deck with no passing period, a target near the deck edge with only one supporting side, the explanation fields (period, supporting and agreeing counts, comparable cell count).
    - Files owned: `src/restore/__tests__/repeat.test.ts`.
    - _Requirements: 4.3, 4.4, 4.6, 4.7, 4.8, 4.9_

- [ ] 10. Mirror symmetry evaluation (Crew-delegable, Group B)
  - Depends on: tasks 4.2, 5.2, 7. Files owned: `inference/symmetry.ts`, and the test file below.
  - [ ] 10.1 Implement symmetry evidence testing and candidate derivation
    - `card-sequence` axes (every candidate axis position in steps of 0.5, same Evidence_Test shape with symmetry thresholds) and `within-card` axes (documented `withinCardPartner(profile, readIndex)` defined once for any profile, Garín placeholder is a reflection about the read-order midpoint marked `// UNVERIFIED R4`). Only enabled axis kinds are evaluated; each deck is evaluated independently; a candidate is produced only when the partner is a Trusted_Cell. A failing axis produces no symmetry Hypothesis and the engine never reports a deck as asymmetric. Mark every result with the unverified status of A3 to A6 (within-card) or A8 (card-sequence). Add `// UNVERIFIED R2`, `R3`, `R4`, `A7` comments where relevant.
    - Files owned: `src/restore/inference/symmetry.ts`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 10.2 Write symmetry unit tests
    - Worked examples for both axis kinds, half-integer axis position, partner that is not a Trusted_Cell (no candidate), a non-symmetric deck producing no Hypothesis and no asymmetry claim, partner mapping works with a second small profile with no code change, explanation fields.
    - Files owned: `src/restore/__tests__/symmetry.test.ts`.
    - _Requirements: 5.2, 5.3, 5.5, 5.6, 5.7, 5.8_

- [ ] 11. Image evidence and evidence combination (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `inference/imageEvidence.ts`, `inference/combine.ts`, and the test file below.
  - [ ] 11.1 Implement hole-probability conversion and log-odds combination
    - `holeProbabilityToLiftedProbability` through the recorded polarity (`NO_POLARITY_RECORDED` when absent, recorded as a diagnostic and not combined). `combine`: Laplace-smoothed structural probability `(agree+1)/(support+2)`, log-odds addition of structural and image evidence, chosen value and confidence, contradiction rule (cap at `max(0.5, confidence - 0.15)` when the signals disagree at or above `contradictionThreshold`, contradiction stated in the explanation fields). A cell with Condition `unknown` contributes no image evidence and records its unknown reason. Image evidence alone never yields a candidate (`NO_STRUCTURAL_EVIDENCE`). A Protected_Cell's hole probability is never used for another cell. Overlapping quality-finding ids are copied verbatim. `assistantEvidence` is never read. Document the independence assumption and its limit in the module header.
    - Files owned: `src/restore/inference/imageEvidence.ts`, `src/restore/inference/combine.ts`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 11.2 Write combination unit tests
    - Hand-computed worked table of structural and image probability pairs including `supportingCount` 0 and 1, both polarities, missing polarity, contradiction penalty, unknown cell with reason, image-only cell abstains, assistant evidence ignored by the function.
    - Files owned: `src/restore/__tests__/combine.test.ts`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.9_

- [ ] 12. Explanations and ranking (Crew-delegable, Group B)
  - Depends on: task 3, task 7 (tests). Files owned: `inference/explain.ts`, `inference/rank.ts`, and the test files below.
  - [ ] 12.1 Implement deterministic explanation templates
    - Fixed-order templates for repeat, symmetry and combined evidence, contradiction sentence, synthetic-prior warning text and the label "prior measured on synthetic data only; real-card prevalence not measured", and the Calibration_Status. List at most `maxEvidenceItemsPerExplanation` items by name with "and N more"; truncate to 1,000 characters with an ellipsis while the full structured `evidenceItems` stay in the record.
    - Attestation: for a `synthetic` deck, append `SYNTHETIC_DECK_NOTICE` to every explanation before the Calibration_Status sentence. The notice counts toward the 1,000-character cap, so truncation keeps the notice and shortens the evidence list first.
    - Files owned: `src/restore/inference/explain.ts`.
    - _Requirements: 3.9, 3.18, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ] 12.2 Implement region assembly, ranking and abstention
    - `assembleRegion`: abstain with `REGION_TOO_LARGE` (length and bound) above `shortRegionBound` except whole-card cases; cross-product of consistent per-cell candidates; dedupe by full-region assignment and provenance; rank by confidence non-increasing with the fixed tie-break (repeat before symmetry, ascending first readIndex, ascending period or axis), never the seed; at most three, never padded; exactly one when only one assignment is supported; an Abstention (with a registry reason and structured values) for every Target_Cell not covered. Combined repeat and symmetry evidence takes one provenance by the documented rule (higher individual agreement fraction) and lists both kinds.
    - Files owned: `src/restore/inference/rank.ts`.
    - _Requirements: 7.2, 7.3, 7.4, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 19.8_

  - [ ]* 12.3 Write property test for explanations
    - **Property 21: Explanations are deterministic and reference real evidence**
    - **Validates: Requirements 9.1, 9.2, 9.3**
    - Seed `SEED_P21`, 150 runs; `arbHypothesis` with varying evidence-item counts including truncation cases; assert reproducibility from structured fields, length at most 1,000, and that every named evidence item is present in `evidenceItems`.
    - Files owned: `src/restore/__tests__/explain.props.test.ts`.

  - [ ]* 12.4 Write ranking unit tests
    - One, two and three supported assignments (never padded), a fourth dropped, equal-confidence tie-break independent of the seed (two seeds give equal output), region length at the bound accepted and at the bound plus one abstaining, abstention reasons and structured values, multi-cell region assignments deduplicated.
    - Files owned: `src/restore/__tests__/rank.test.ts`.
    - _Requirements: 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.9_

- [ ] 13. Restoration_Record construction and integrity (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `record/build.ts`, and the test file below.
  - [ ] 13.1 Implement `buildRestorationRecord`, supersession and `integrityCheck`
    - Copy each Target_Cell and region-cell Raw_Observation (value and hole likelihood, either possibly absent) once on the first run that touches it, with `patchId` and `Image_Digest` where evidence exists, and never again. A later run appends a new `RunSection` and marks earlier unreviewed Hypotheses `superseded`, except cells with Review_Outcome `accepted`, `selected` or `edited`. Record config, seed, prior gate states, calibration references, every Hypothesis and Abstention, diagnostics, base-deck digest (same FNV-1a-64 family as the domain session digest), profile id, verification markers, per-card image digests and detection result ids. Single shared sequence counter, no wall-clock value. `integrityCheck` returns `RECORD_DECK_MISMATCH` for a deck digest, raw copy or recorded domain write that disagrees with the supplied Deck, and for a derived `approved` state that disagrees with the domain approval state.
    - Attestation: record `deckOrigin` and, for a `synthetic` deck, the per-card `syntheticAttestations` list in deck order, and copy `attestationRefs` onto each Hypothesis and `PriorGateState`. `integrityCheck` also reports `RECORD_DECK_MISMATCH` when a recorded attestation `imageDigest` differs from that card's recorded image digest.
    - Files owned: `src/restore/record/build.ts`.
    - _Requirements: 1.10, 3.13, 12.1, 12.2, 12.3, 12.5, 12.6, 12.7, 12.8, 12.9, 14.12_

  - [ ]* 13.2 Write record unit tests
    - Raw observation copied once and unchanged by a second run, supersession keeps decided cells, a missing-evidence card is recorded as having no image evidence, digest mismatch, raw-copy mismatch, approval-state mismatch, contiguous sequence numbers, no timestamp field.
    - Files owned: `src/restore/__tests__/record.test.ts`.
    - _Requirements: 1.5, 12.3, 12.6, 12.7, 12.8, 12.9, 14.12_

- [ ] 14. Serialisation (Crew-delegable, Group B)
  - Depends on: task 3, task 7.2 (tests). Files owned: `record/serialize.ts`, and the test files below.
  - [ ] 14.1 Implement export and import of the three artifacts
    - Schema-ordered canonical writer, two-space indent, `\n` line endings, no timestamps, `null` written as the literal `null` and read back as `null`, `opaqueTimestampLabel` written only as a plain string and excluded from every equality and digest function provided. Import order: size (`INPUT_TOO_LARGE`, UTF-8 byte length before parsing), `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` (path), then semantic validation `INVALID_RESTORATION_RECORD` naming the first violated invariant (confidence outside [0, 1], numeric confidence with provenance `observed`, more than three Hypotheses in a region, non-contiguous sequence, duplicate Action_Id, dangling review reference). Same pipeline for `PriorMeasurement` and `CalibrationRecord` (using the validators from task 6 and task 8 through their public functions). No image pixels or Original_Image are embedded. Never return a partial value.
    - Attestation: serialise `deckOrigin` and the optional `syntheticAttestations` array (key order per the design; omitted when empty, never `null`), `attestationRefs` on each Hypothesis and in each `PriorGateState`. On import, `deckOrigin` defaults to `"real"` when absent (`schemaVersion` stays 1). Corruption paths: an unknown key inside an entry gives `UNKNOWN_FIELD` naming its path (for example `syntheticAttestations[0].extra`); a wrong-typed field gives `INVALID_RESTORATION_RECORD` naming the path; truncation gives `INVALID_JSON`. Semantic checks, each `INVALID_RESTORATION_RECORD`: `real` record with any entry or ref; `synthetic` record with a card that has a recorded image digest and no entry, or an entry whose digest differs; entry for a card not in the record or without an image digest; entry failing `validateSyntheticAttestation`; duplicate `cardId`; an `attestationRefs` item that differs from the record's entry; a Hypothesis of a `synthetic` record whose explanation lacks `SYNTHETIC_DECK_NOTICE` or that has `syntheticPriorWarning` true.
    - Files owned: `src/restore/record/serialize.ts`.
    - _Requirements: 17.3, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.9, 21.10, 21.11_

  - [ ]* 14.2 Write property test for round trip and corruption
    - **Property 15: Record, measurement and calibration round trip; corruption is caught**
    - **Validates: Requirements 21.8, 25.18**
    - Seed `SEED_P15`, 200 runs; `arbRestorationRecord`, `arbPriorMeasurement`, `arbCalibrationRecord`; export, import, export gives identical text; truncation at generated cut points gives `INVALID_JSON`; seeded single-byte corruption never yields a differing value without an error.
    - Files owned: `src/restore/__tests__/recordJson.props.test.ts`.

  - [ ]* 14.3 Write serialisation unit tests
    - `INPUT_TOO_LARGE` at exactly the limit (accepted) and plus one byte (rejected), each of `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` path, one example per record invariant, `null` and `0` confidence round trip to themselves and differ in text, differing only in the opaque label gives equal comparison results, no pixel data in an export.
    - Files owned: `src/restore/__tests__/recordJson.test.ts`.
    - _Requirements: 17.3, 21.3, 21.5, 21.6, 21.7, 21.9, 21.10, 21.11_

- [ ] 15. Evidence Mode view model and confidence heatmap (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `evidence/evidenceView.ts`, `evidence/heatmap.ts`, and the test file below.
  - [ ] 15.1 Implement the Evidence_View and heatmap builders
    - Pure builders with no rendering instruction, colour or pixel. `buildEvidenceView`: crop reference (`patchId`, `Image_Digest`) or an explicit "no image evidence" statement, Raw_Observation, `holeProbability` and `hypothesisConfidence` as separate named fields, proposed value, provenance category (or `unresolved`), supporting evidence, Calibration_Status with the `uncalibrated` marker, rank 2 and 3 alternatives, review state, Applied_Override detail, Abstention detail, verification markers, Deck_Origin, enablement entries in effect, `syntheticPriorWarning`. `buildConfidenceHeatmap`: one entry per `readIndex` with confidence or `null` (never coerced), provenance category, Restoration_State, Grid_Position through the domain `readIndexToGrid` (never re-implemented), a separate hole-probability layer, and the deck-level synthetic warning while an enablement is in effect.
    - Attestation: every Evidence_View and every heatmap entry carries `deckOrigin` and the per-card `attestationRefs` copied from the record. No attestation is shown or implied for a `real` deck.
    - Files owned: `src/restore/evidence/evidenceView.ts`, `src/restore/evidence/heatmap.ts`.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10, 18.11, 18.12, 18.13, 18.14_

  - [ ]* 15.2 Write view and heatmap unit tests
    - Missing detection evidence, `uncalibrated` marker propagation, `null` versus `0` preserved, separate hole layer, Applied_Override and Abstention detail, warning fields at cell and deck level, equal inputs give equal output, no colour or pixel field in the output type.
    - Files owned: `src/restore/__tests__/evidenceView.test.ts`.
    - _Requirements: 18.2, 18.4, 18.5, 18.6, 18.8, 18.9, 18.10, 18.12, 18.14_

- [ ] 16. State machine (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `review/stateMachine.ts`, and the test file below.
  - [ ] 16.1 Implement the Restoration_State derivation and transition guard
    - `deriveCellState`, `deriveRegionState`, `deriveDeckState` (always reads the live domain `currentApproval`; no approval flag of its own), `ALLOWED_TRANSITIONS` per Req 14.9, and `checkTransition` returning `INVALID_TRANSITION` naming the current state, the requested action and the failed guard with no state change. Derive the deck state after a withdrawal on an approved deck by the rule of Req 14.7 (see the design's documented reading and the confirmation item in task 27).
    - Files owned: `src/restore/review/stateMachine.ts`.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11_

  - [ ]* 16.2 Write state-machine unit tests
    - Every allowed transition once and a representative set of disallowed ones; region derivation; deck derivation for each domain approval state; the settled withdrawal behaviour: after `withdrawInference` on an approved Deck the domain state is `unapproved`, the reported transition is `approved` to `reviewed` (a transient state per Req 17.6c), the withdrawn cells return to `proposed`, and the derived deck state follows Req 14.7 and is `proposed`. The test is named after this behaviour and pins both the transient `reviewed` report and the derived `proposed` state.
    - Files owned: `src/restore/__tests__/stateMachine.test.ts`.
    - _Requirements: 14.7, 14.9, 14.10, 17.6c_

- [ ] 17. Domain write path (Crew-delegable, Group B)
  - Depends on: task 3, the domain library (core deck work and `withdrawInference`). Files owned: `review/domainWrite.ts`, and the test file below.
  - [ ] 17.1 Implement the domain write functions
    - `applyAcceptedHypothesis` (one domain `setInferred` per region cell, Action_Id `"<actionId>#<cardId>#<readIndex>"`, confidence is the calibrated value when a record applies, Evidence text equal to the explanation, all-or-nothing on a working Deck value so a failure leaves the original Deck and record unchanged), `applyUserEdit` (domain `userEdit` with a `Bit` and the user note), `withdrawRegion` (domain `withdrawInference` per cell with Action_Id `"<undoActionId>#<cardId>#<readIndex>"` after an all-cells pre-check that every cell's latest Live_Entry, from `latestLiveEntry`, is the inference written by the reversed action; no domain write happens if any cell fails), and `mapDomainUndoError` (`NOTHING_TO_WITHDRAW` and `NOTHING_TO_UNDO` to `NOTHING_TO_UNDO`, `INVALID_EDIT` from `withdrawInference` to `USER_EDIT_PROTECTED` naming the cell, `UNKNOWN_CARD` to `UNKNOWN_CARD`, anything else to `DOMAIN_RULE_REJECTED`). Return `OBSERVED_CELL_PROTECTED` before any domain call for an observed cell and `USER_EDIT_PROTECTED` for a cell with an un-reversed user edit. Never call `setInferred` for a `user-edited` write and never write provenance `observed`.
    - Files owned: `src/restore/review/domainWrite.ts`.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.10, 17.6, 17.6b, 17.14_

  - [ ]* 17.2 Write domain-write unit tests
    - Per-cell Action_Id format, rejected domain call at the last cell of a multi-cell region leaves the Deck deeply equal to its copy, pre-check failure at the last cell writes nothing to earlier cells, previous `null` confidence returns as `null` after withdrawal, withdrawal blocked by an un-reversed user edit (`USER_EDIT_PROTECTED`) and allowed after that edit is undone, every row of the error-mapping table, observed-cell write refused, `DUPLICATE_ACTION_ID` checked against the record and the Deck history.
    - Files owned: `src/restore/__tests__/domainWrite.test.ts`.
    - _Requirements: 13.3, 13.5, 13.6, 13.7, 13.10, 17.6, 17.6b, 17.14, 17.16_

- [ ] 18. Checkpoint - Groups A to B merged
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Inference engine integration (single worker, not split, Group D)
  - Depends on: task 18. Files owned: `inference/engine.ts`, `inference/wholeCard.ts` (baseline only), and the test files below.
  - [ ] 19.1 Implement `runInference` and the run orchestration
    - Pure function over a `RestorationInput`: `validateConfig` and `validateLimits` first, base-deck `validateDeck` (`DOMAIN_RULE_REJECTED`), evidence mismatch checks (`DETECTION_EVIDENCE_MISMATCH` for unknown `cardId`, profile id or `perCell` length), prior gate evaluation for every enabled kind, trusted-cell collection, region segmentation, repeat and symmetry evaluation, image evidence and combination, ranking and abstention, calibration application, explanation, and `buildRestorationRecord`. Report diagnostics for an observed cell that contradicts an enabled prior's Hypothesis (observed cell left unchanged), for a missing polarity, and for Pending_Corrections and Applied_Overrides (Hypotheses for Applied_Override cells are recorded only, never written). The function never calls a domain write, never reads a clock, never uses randomness, and returns the same record for the same input (the Seed is recorded and not used to choose among Hypotheses). The input type carries no ground-truth field. Remove the engine stub.
    - Attestation: call `validateOriginAndAttestation` after `validateConfig` and before `validateLimits` and any inference (a failure returns `INVALID_CONFIGURATION` with no Hypothesis and no record), and pass the validated `syntheticAttestations` map to the prior gate, the explanation builder and the record builder. The engine never constructs an attestation.
    - Files owned: `src/restore/inference/engine.ts`.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.9, 1.10, 2.4, 2.5, 2.7, 2.8, 2.10, 3.12, 3.13, 7.7, 19.1, 19.2, 19.4, 20.4_

  - [ ] 19.2 Implement the whole-card recovery baseline
    - `wholeCard.ts` baseline: when `wholeCardRecoveryEnabled` is false (the default) the engine never calls it. When enabled and the stretch implementation (task 21) is absent, return `INVALID_CONFIGURATION` naming `wholeCardRecoveryEnabled` with the message that whole-card recovery is not available. This keeps `_stub.ts` removable.
    - Files owned: `src/restore/inference/wholeCard.ts`.
    - _Requirements: 11.1_

  - [ ]* 19.3 Write engine unit and example tests
    - Each configuration error and `LIMIT_EXCEEDED` returns before inference starts; each `DETECTION_EVIDENCE_MISMATCH` case; missing evidence recorded as no image evidence; Applied_Override Hypothesis recorded but not written; observed-contradiction diagnostic; a run on the bundled-style small deck reproduces a hand-computed Hypothesis with its explanation; at least one example per `ABSTENTION_REASONS` value that the engine can emit.
    - Files owned: `src/restore/__tests__/engine.test.ts`.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.4, 2.5, 2.10, 8.9, 22.5_

  - [ ]* 19.4 Write property test for the unchanged deck
    - **Property 1: Unchanged deck produces no hypothesis**
    - **Validates: Requirements 25.4**
    - Seed `SEED_P1`, 150 runs; `arbFullyResolvedDeck`, 1 to 8 cards; all priors enabled with valid measurements; assert no Hypothesis, an unchanged Deck and no state other than `detected`.
    - Files owned: `src/restore/__tests__/unchangedDeck.props.test.ts`.

  - [ ]* 19.5 Write property test for known structure recovery
    - **Property 7: Known structure is recovered under documented conditions**
    - **Validates: Requirements 4.5, 4.6, 5.5, 25.10**
    - Seed `SEED_P7`, 100 runs; `arbPeriodicDeck` and `arbSymmetricDeck`, 6 to 20 cards, masked fraction at most the constant in `syntheticRecoveryConditions.ts`; every masked cell covered by a Hypothesis has its true value in rank 1. The conditions are stated in the test comment and in `docs/restoration-calibration.md`.
    - Files owned: `src/restore/__tests__/recovery.props.test.ts`.

  - [ ]* 19.6 Write property test for structure-free decks
    - **Property 8: Structure-free decks produce no structural hypothesis**
    - **Validates: Requirements 4.4, 5.3, 25.11**
    - Seed `SEED_P8`, 100 runs; `arbStructureFreeDeck` verified by the engine's own Evidence_Test; no `repeat-inferred` or `symmetry-inferred` Hypothesis.
    - Files owned: `src/restore/__tests__/structureFree.props.test.ts`.

  - [ ]* 19.7 Write property test for prior gating
    - **Property 9: Prior gating is enforced**
    - **Validates: Requirements 3.1, 3.2, 3.3, 25.12**
    - Seed `SEED_P9`, 150 runs; `arbConfig` with a kind disabled or `arbPriorMeasurement` omitted; no Hypothesis of that kind, `PRIOR_NOT_ENABLED` abstention where only that kind applies, and `PRIOR_MEASUREMENT_MISSING` when enabled without a valid measurement.
    - Files owned: `src/restore/__tests__/priorGating.props.test.ts`.

  - [ ]* 19.8 Write property test for the leakage guard
    - **Property 10: No leakage from masked ground truth**
    - **Validates: Requirements 19.4, 19.6, 25.13**
    - Seed `SEED_P10`, 100 runs; `arbTruthDeckPair` with an identical mask; run on each masked deck and assert deeply equal records. Include a static assertion (shared with the boundary test) that no `src/restore` module imports a ground-truth, benchmark or damage module, and an example that a masked cell still carrying `raw.value` is treated as an observation.
    - Files owned: `src/restore/__tests__/leakage.props.test.ts`.

  - [ ]* 19.9 Write property test for determinism
    - **Property 11: Determinism**
    - **Validates: Requirements 19.1, 25.14**
    - Seed `SEED_P11`, 100 runs; `arbRestorationInput`; two runs give deeply equal records, byte-identical exported text and deeply equal Decks, compared after `stripOpaqueLabels`; two different seeds in the configuration do not change the chosen Hypotheses.
    - Files owned: `src/restore/__tests__/determinism.props.test.ts`.

  - [ ]* 19.10 Write property test for hypothesis shape
    - **Property 12: Hypothesis shape invariants**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.6, 25.15**
    - Seed `SEED_P12`, 200 runs; many region shapes; at most three Hypotheses per region, non-increasing confidence, non-empty explanation of at most 1,000 characters, at least one supporting evidence item, no provenance `observed`.
    - Files owned: `src/restore/__tests__/hypothesisShape.props.test.ts`.

  - [ ]* 19.11 Write property test for protected cells
    - **Property 13: Protected cells are never changed by inference**
    - **Validates: Requirements 2.2, 2.3, 2.5, 25.16**
    - Seed `SEED_P13`, 150 runs; decks with observed, user-edited and Applied_Override cells plus a sequence of inference and write attempts; effective value and provenance unchanged; refused writes return `OBSERVED_CELL_PROTECTED` or `USER_EDIT_PROTECTED`.
    - Files owned: `src/restore/__tests__/protectedCells.props.test.ts`.

  - [ ]* 19.12 Write property test for contradicting evidence
    - **Property 16: Contradicting evidence never increases confidence**
    - **Validates: Requirements 6.4, 25.19**
    - Seed `SEED_P16`, 100 runs; `arbPeriodicDeck` with a supported Hypothesis and one seeded flip of a supporting Trusted_Cell; confidence of that value does not increase.
    - Files owned: `src/restore/__tests__/metamorphic.props.test.ts`.

  - [ ]* 19.13 Write property test for the synthetic-prior flow
    - **Property 19: Synthetic-prior enablement, warning and reversal behave correctly**
    - **Validates: Requirements 3.14, 3.15, 3.16, 3.17, 3.18, 3.19, 25.22**
    - Seed `SEED_P19`, 100 runs; `arbRealDeck` with a synthetic-only measurement and enable and disable sequences; cases (a) to (d) of the property. Add permanent example tests for (a), (b), (c) and one showing a `synthetic` deck in a Synthetic_Evaluation_Context applies the prior with no warning.
    - Files owned: `src/restore/__tests__/syntheticPrior.props.test.ts`.

  - [ ]* 19.14 Write property test for region bounds
    - **Property 20: Isolated-cell and short-region bounds are enforced**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.7**
    - Seed `SEED_P20`, 200 runs; region lengths 0 to `2 * shortRegionBound`; lengths at or below the bound are evaluated, above it abstain with `REGION_TOO_LARGE` naming length and bound, length 1 is an isolated cell, every uncovered Target_Cell has an Abstention.
    - Files owned: `src/restore/__tests__/regionBounds.props.test.ts`.

  - [ ]* 19.15 Write property test for attested synthetic decks and unchanged real decks
    - **Property 27: Attested synthetic decks use the prior without warning, and real decks are unchanged**
    - **Validates: Requirements 3.24, 3.25, 25.26, 25.27, 25.28**
    - Seed `SEED_P27` (20260527), 100 runs; `arbPeriodicDeck` with `deckOrigin` `synthetic`, valid per-card attestations (mixed decks included) and a synthetic-scope `arbPriorMeasurement`; with the prior enabled and no enablement entry, Hypotheses have `syntheticPriorWarning` false, `SYNTHETIC_DECK_NOTICE` in each explanation, `deckOrigin` and `attestationRefs` in the record, every Evidence_View and every heatmap entry, and status `uncalibrated`; the same run without the measurement returns `PRIOR_MEASUREMENT_MISSING`; `real` decks give outputs and errors equal to the P19 expectations.
    - Files owned: `src/restore/__tests__/attestedPrior.props.test.ts`.

- [ ] 20. Review service (single worker, not split, Group D)
  - Depends on: tasks 16, 17, 18. Files owned: `review/approval.ts`, `review/undo.ts`, `review/service.ts`, `src/restore/__tests__/generators/review.ts`, and the test files below.
  - [ ] 20.1 Implement approval and the blocking-item lists
    - `unresolvedAppliedOverrides`, `pendingCorrections`, `regionsWithState` and `approveDeck` with the guard order: unreviewed proposals (`APPROVAL_BLOCKED` reason `PROPOSALS_UNREVIEWED`, up to 100 regions plus the total), unresolved Applied_Overrides (`OVERRIDES_UNRESOLVED`), Pending_Corrections (`PENDING_CORRECTIONS`), then the domain `requestApproval` (`UNRESOLVED_CELLS` wrapped as `DOMAIN_RULE_REJECTED`). The ambiguous-as-down policy is passed only when the user supplies it with a note and is recorded with its affected cells. Approval changes no effective value, Raw_Observation, Restoration_Confidence (including `null`) or Evidence. Record the domain Action_Id and approval Sequence_Number. `revoke-approval` calls the domain `revokeApproval`.
    - Files owned: `src/restore/review/approval.ts`.
    - _Requirements: 2.7, 2.8, 13.12, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.11_

  - [ ] 20.2 Implement `undoReviewAction`
    - Check order: `UNKNOWN_ACTION_ID`, `DUPLICATE_ACTION_ID`, `NOTHING_TO_UNDO` (already reversed, not reversible, or domain writes already withdrawn), `INVALID_TRANSITION`. Then by kind: `edit-cell` through domain `undoEdit`; `accept-hypothesis` and `select-alternative` through `withdrawRegion` (all-cells pre-check before the first write, working Deck committed only if every call succeeds, no second approval record added by the service); `reject-hypothesis` and `acknowledge-override` with no domain call. Append an undo `AuditEntry` referencing the reversed Action_Id, never remove or modify an earlier entry, restore the Review_Outcome and cell state (`proposed` for withdrawn and rejected cells), keep the two undo paths apart, and return `USER_EDIT_PROTECTED` until an edit above an accepted inference is undone first. `approve-deck`, `revoke-approval` and `undo-action` are not reversible (`NOTHING_TO_UNDO`).
    - Files owned: `src/restore/review/undo.ts`.
    - _Requirements: 17.1, 17.5, 17.6, 17.6a, 17.6b, 17.6c, 17.7, 17.8, 17.9, 17.10, 17.11, 17.12, 17.13, 17.14, 17.15, 17.16_

  - [ ] 20.3 Implement `applyReviewAction`
    - Dispatch for `accept-hypothesis`, `select-alternative` (`HYPOTHESIS_NOT_FOUND`), `edit-cell` (note 1 to 1,000 characters, supersedes only that cell's pending Hypotheses), `reject-hypothesis` (no domain write, cells stay `ambiguous` with no effective value), `acknowledge-override` (record only), `approve-deck`, `revoke-approval` and `undo-action`. Call `checkTransition` first, reject every action other than `edit-cell`, `revoke-approval` and `undo-action` with `DECK_APPROVED` while approved, check `REGION_NOT_FOUND` and `UNKNOWN_CARD`, accept no batch parameter (bulk acceptance is one explicit action per listed region), never act automatically, and store an `opaqueTimestampLabel` unchanged within its configured cap without parsing it. Every domain write uses the matching existing Session_Action kind and defines no new kind. A rejected action leaves the Deck and record deeply equal to their earlier values. Remove the remaining review stubs.
    - Files owned: `src/restore/review/service.ts`.
    - _Requirements: 13.1, 13.8, 13.10, 13.11, 14.9, 14.10, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 17.1, 17.2, 17.3, 17.4_

  - [ ] 20.4 Add the review generators
    - `generators/review.ts`: `arbReviewActionSequence` (0 to 20 actions built only through public `applyReviewAction`, including invalid ones with expected codes), `arbUndoSequence`, and `arbOpsOnDeck` over accept, select, edit-cell, reject, acknowledge, approve, revoke and undo, applied to approved and unapproved decks with unique Action_Ids.
    - Files owned: `src/restore/__tests__/generators/review.ts`.
    - _Requirements: 25.2_

  - [ ]* 20.5 Write property test for raw preservation
    - **Property 2: Raw observations are preserved**
    - **Validates: Requirements 12.3, 12.4, 25.5**
    - Seed `SEED_P2`, 150 runs; `arbDeck` 1 to 6 cards, operation lists 0 to 20; every Raw_Observation of the Deck equals its prior value and its copy in the record.
    - Files owned: `src/restore/__tests__/rawPreserved.props.test.ts`.

  - [ ]* 20.6 Write property test for confidence bounds
    - **Property 3: Confidence and provenance bounds hold**
    - **Validates: Requirements 10.1, 10.3, 25.6**
    - Seed `SEED_P3`, 200 runs; mixed provenance and `null` or numeric confidences; every written confidence is finite in [0, 1], every cell without a written Hypothesis keeps its confidence strictly unchanged, and no `null` becomes `0`.
    - Files owned: `src/restore/__tests__/confidenceBounds.props.test.ts`.

  - [ ]* 20.7 Write property test for unknown staying unknown
    - **Property 4: Unknown stays unknown**
    - **Validates: Requirements 8.5, 15.6, 16.5, 25.7**
    - Seed `SEED_P4`, 150 runs; decks with at least one unsupportable Target_Cell, then a run, a reject and an approval attempt without a policy (`UNRESOLVED_CELLS`); those cells keep provenance `ambiguous` and no effective value.
    - Files owned: `src/restore/__tests__/unknownStaysUnknown.props.test.ts`.

  - [ ]* 20.8 Write property test for approval exactness
    - **Property 5: Approval is exact**
    - **Validates: Requirements 16.7, 16.8, 25.8**
    - Seed `SEED_P5`, 150 runs; action sequences of 0 to 15 ending in a successful approval; every effective value is observed, accepted or selected, user-edited or policy-supplied, and no unreviewed Hypothesis value is effective.
    - Files owned: `src/restore/__tests__/approvalExact.props.test.ts`.

  - [ ]* 20.9 Write property test for undo and withdrawal
    - **Property 6: Undo and withdrawal restore prior state and never shrink the record**
    - **Validates: Requirements 17.5, 17.6, 17.6a, 17.6b, 17.6c, 17.8, 17.9, 17.13, 17.15, 17.16, 25.9**
    - Seed `SEED_P6`, 150 runs; sequences of 0 to 20 accept, select, reject, edit-cell, approve and undo on approved and unapproved decks; the record and domain history never shrink and earlier entries stay equal, Raw_Observation unchanged, `edit-cell` undo restores the prior effective view and approval state, accept and select undo restore value or its absence, provenance, confidence (`null` stays `null`) and evidence and return cells to `proposed`, and a pre-check failure writes no cell.
    - Files owned: `src/restore/__tests__/undo.props.test.ts`.

  - [ ]* 20.10 Write property test for the state machine
    - **Property 14: The state machine only takes allowed transitions**
    - **Validates: Requirements 14.9, 14.10, 25.17**
    - Seed `SEED_P14`, 150 runs; `arbReviewActionSequence` of 0 to 20 including invalid transitions; only `ALLOWED_TRANSITIONS` occur, the derived deck state agrees with the domain approval state, and a rejected action leaves the Deck and record deeply equal to their earlier values.
    - Files owned: `src/restore/__tests__/stateMachine.props.test.ts`.

  - [ ]* 20.11 Write review example tests
    - Withdrawal blocked by an un-reversed user edit (`USER_EDIT_PROTECTED`), a second undo of the same acceptance (`NOTHING_TO_UNDO`), an approved Deck that becomes `unapproved` with cause `withdrawal` after the undo of an accepted Hypothesis, approval blocked in each of the three guard orders, ambiguous-as-down policy recorded with a note, bulk acceptance needing one action per region, `DECK_APPROVED` for each blocked action kind, opaque label ignored by equality, every `UNKNOWN_ACTION_ID` and `NOTHING_TO_UNDO` path.
    - Files owned: `src/restore/__tests__/review.test.ts`.
    - _Requirements: 13.11, 15.10, 16.2, 16.3, 16.4, 16.6, 17.3, 17.11, 17.16_

- [ ] 21. Whole-card recovery (stretch, optional, Group E)
  - Depends on: tasks 19, 20. Files owned: `inference/wholeCard.ts` (replaces the baseline body), and the test file below.
  - [ ]* 21.1 Implement `runWholeCardRecovery`
    - Disabled by default and explicitly requested per card. Only through an enabled prior kind with a passed Evidence_Test; below `wholeCardMinSupportingCards` returns `NO_NEIGHBOURING_INFORMATION`; Hypotheses per region obey the three-alternative cap and non-padding; report the share of cells covered; every result marked `stretch` in the record and Evidence_View; never bypasses `REGION_TOO_LARGE` for partial regions; acceptance needs an explicit `accept-hypothesis` or `select-alternative` per card.
    - Files owned: `src/restore/inference/wholeCard.ts`.
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 21.2 Write whole-card unit tests
    - Recovery on a periodic synthetic deck with a fully masked card, abstention below the support floor, no recovery when the Evidence_Test fails, `stretch` marking, disabled by default, per-card explicit acceptance.
    - Files owned: `src/restore/__tests__/wholeCard.test.ts`.
    - _Requirements: 11.1, 11.2, 11.3, 11.6, 11.7_

- [ ] 22. Offline measurement and calibration scripts (Crew-delegable, Group E)
  - Depends on: tasks 1.1, 6, 8, 14, 19, and 22.3 (pure tuning modules). Sub-task 22.3 and its tests (22.4 to 22.7) depend only on task 3 and are delegable in Group B. Files owned: `scripts/restoration-tune.ts`, `src/restore/tuning/*`, and the test files below.
  - [ ] 22.1 Implement `scripts/restoration-tune.ts` as a thin CLI
    - TypeScript script run through `npm run restore:tune`. It only parses arguments, reads files and calls the pure functions through the `src/restore` public index (`permitTuningRole`, `checkFileSetsDisjoint`, `importMinimalDataset`, `runInference`, the validators and serializers). It contains no role or format logic of its own and does not import `src/benchmark`.
    - Flow, in this order: (1) call `permitTuningRole` on each file set's declared role before any file is opened (`tuning` for prior-measurement and parameter-selection, `calibration` for calibration-fit); `held-out`, `test` or an unknown role exits non-zero with `ROLE_NOT_PERMITTED_FOR_TUNING` naming the role and reads no cell; (2) call `checkFileSetsDisjoint` on the calibration and tuning sets (`FILE_SET_OVERLAP` refuses before any cell is read); (3) `importMinimalDataset(text, suppliedRole)` per file (`UNKNOWN_FIELD`, `SPLIT_ROLE_MISMATCH`); (4) run `runInference` with no calibration record and bin raw confidences against the known masked values; (5) write `PriorMeasurement` JSON (with `datasetVersion` and `splitRole`; frequency from the Evidence_Test, reliability from correct recoveries; synthetic and real in separate files, never pooled, a synthetic file labelled a generator parameter) and a `CalibrationRecord` JSON (10-bin histogram binning, calibration and tuning roles, file-set ids, `datasetVersion`, valid prior kinds and support range, benchmark version, seed, sample sizes, and an ECE with its bin count only when measured on `tuning`, labelled a development figure); (6) validate each artifact with `validatePriorMeasurement` and `validateCalibrationRecord` before saving, and write nothing on any refusal.
    - Marks datasets with licence status `unchecked` as `local-only`, writes a description of the data used, and writes the tuned-constants overlay as versioned JSON (code defaults change only by loading that file). Writes artifacts to an output directory argument whose default is `data/restoration/` (Q7a pending, task 27) and creates a `README.md` there stating source, licence and roles when it writes the first artifact. Appends or verifies the matching row in the `docs/restoration-priors.md` registry table (task 23.3). Quotes no number that is not computed in the run. Official `held-out` and `test` metrics are never produced here.
    - Files owned: `scripts/restoration-tune.ts`, `data/restoration/README.md`.
    - _Requirements: 3.4, 3.5, 3.7, 3.8, 3.10, 3.11, 10.5, 10.6, 10.10, 10.11, 24.1, 24.3, 24.4, 24.5, 26.1, 26.2, 26.3, 26.4, 26.8, 26.9_

  - [ ]* 22.2 Write script guard tests
    - CLI smoke test on a tiny committed fixture and on a refused role: exit codes, and no artifact written on refusal. The script rejects a `held-out` file set, a `test` file set and an unknown role name by name, rejects overlapping calibration and tuning file sets, writes synthetic and real measurements to separate files, marks an unchecked-licence dataset `local-only`, output validates through `validatePriorMeasurement` and `validateCalibrationRecord`, ECE is computed from the run and recomputing it gives the same value, and an ECE measured on `tuning` is labelled a development figure.
    - Files owned: `src/restore/__tests__/tuneScript.test.ts`.
    - _Requirements: 3.7, 3.10, 10.6, 10.10, 10.11, 24.3, 26.3, 26.4_

  - [ ] 22.3 Implement the pure tuning modules (Crew-delegable, Group B)
    - `tuning/roles.ts`: `permitTuningRole(purpose, declaredRole)` succeeds only for `tuning` with `prior-measurement` or `parameter-selection` and for `calibration` with `calibration-fit`, otherwise `ROLE_NOT_PERMITTED_FOR_TUNING` with a message that names the role and states it is not permitted for tuning or calibration (takes only the role string, so it runs before any file is opened); `checkFileSetsDisjoint(calibration, tuning)` returns `FILE_SET_OVERLAP` naming the first shared `fileSetId`, and fails for identical lists.
    - `tuning/datasetFormat.ts`: `importMinimalDataset(text, suppliedRole)` with check order size, syntax, `format`, `schemaVersion`, unknown field, semantics. The optional fields `familyKey` and `splitRole` are tolerated and dropped; any other undocumented field returns `UNKNOWN_FIELD` with its path; a `splitRole` different from the supplied role returns `SPLIT_ROLE_MISMATCH` naming both roles, decided from the parsed header without reading any cell; the `deck` is validated through the domain importer. No partial value is returned on any error. Remove the two stubs.
    - Both modules are pure: no file, clock, network or randomness.
    - Files owned: `src/restore/tuning/roles.ts`, `src/restore/tuning/datasetFormat.ts`.
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 10.6_

  - [ ]* 22.4 Write tuning module unit tests
    - `held-out`, `test` and an unknown role (for example `validation`) each return `ROLE_NOT_PERMITTED_FOR_TUNING` naming the role; the wrong purpose for a valid role is refused; a calibration set equal to the tuning set and one sharing a single id each return `FILE_SET_OVERLAP`; a file with `familyKey` and `splitRole` imports unchanged; a file with a stray field returns `UNKNOWN_FIELD` with its path; `splitRole` `calibration` supplied under `tuning` returns `SPLIT_ROLE_MISMATCH`.
    - Files owned: `src/restore/__tests__/tuning.test.ts`.
    - _Requirements: 26.2, 26.3, 26.4, 26.5, 26.6, 26.7_

  - [ ]* 22.5 Write property test for the role allow-list
    - **Property 23: Only tuning and calibration roles are permitted, and refusal precedes any read**
    - **Validates: Requirements 26.2, 26.3**
    - Seed `SEED_P23`, 300 runs; `arbRoleString` (the four roles, case variants, empty, arbitrary text) crossed with `arbTuningPurpose`; assert the success set and the error code, and that a reader instrumented to throw on any cell access is never asked for a cell when the role is refused.
    - Files owned: `src/restore/__tests__/tuningRoles.props.test.ts`.

  - [ ]* 22.6 Write property test for the dataset format rule
    - **Property 24: Minimal_Dataset_Format extra-field and role-mismatch rule**
    - **Validates: Requirements 26.1, 26.5, 26.6, 26.7**
    - Seed `SEED_P24`, 200 runs; `arbMinimalDatasetFile` with any combination of `familyKey` and a matching `splitRole` imports deeply equal to the original; `arbExtraField` at a generated path returns `UNKNOWN_FIELD` naming it; a mismatching `splitRole` returns `SPLIT_ROLE_MISMATCH` naming both roles; no partial value in either error case.
    - Files owned: `src/restore/__tests__/tuningFormat.props.test.ts`.

  - [ ]* 22.7 Write property test for file-set disjointness
    - **Property 25: Calibration and tuning file sets are disjoint**
    - **Validates: Requirements 10.6, 26.4**
    - Seed `SEED_P25`, 300 runs; `arbFileSetRefList` pairs with seeded shared-id and identical-list cases; `checkFileSetsDisjoint` succeeds if and only if no `fileSetId` is shared, else `FILE_SET_OVERLAP` naming a shared id.
    - Files owned: `src/restore/__tests__/tuningDisjoint.props.test.ts`.

- [ ] 23. Documentation of contracts, methods and assumptions (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `docs/restoration-errors.md`, `docs/restoration-calibration.md`, `docs/restoration-priors.md`, `docs/restoration-assumptions.md`, `src/restore/__tests__/docsErrorsSync.test.ts`, `src/restore/__tests__/priorsRegistry.test.ts`. No other code files are edited.
  - [ ] 23.1 Write the error list and registry sync test
    - `docs/restoration-errors.md` lists every code in `RESTORATION_ERROR_CODES` and `ABSTENTION_REASONS` with its message and meaning, including the domain-code mapping table for undo and the amendment codes `ROLE_NOT_PERMITTED_FOR_TUNING`, `FILE_SET_OVERLAP`, `SPLIT_ROLE_MISMATCH` and the use of `UNKNOWN_FIELD` for the Minimal_Dataset_Format (Req 26.6). Note that these codes are additions to the Req 22.1 minimum list. The sync test fails when a registry and the document differ. This test is required.
    - _Requirements: 22.1, 22.2, 22.4, 26.3, 26.4, 26.6, 26.7_

  - [ ] 23.2 Write the calibration document
    - `docs/restoration-calibration.md`: histogram binning (10 equal-width bins) and why it was chosen over isotonic and Platt, the log-odds combination rule and its independence assumption and limit, the three disjoint seed blocks (tuning, calibration, held-out), ECE definition with the bin count stated, the deck-level `uncalibrated` marker rule, the documented synthetic recovery conditions used by Property 7, and the statement that no accuracy number is claimed before a recorded run.
    - _Requirements: 6.3, 10.9, 10.10, 24.3, 24.4_

  - [ ] 23.3 Write the priors document
    - `docs/restoration-priors.md`: Prior_Measurement fields (including `datasetVersion` and `splitRole`), the measurement procedure, the Minimal_Dataset_Format read by `scripts/restoration-tune.ts` (field list, types, the two tolerated optional fields `familyKey` and `splitRole`, the rule that any other extra field is rejected with `UNKNOWN_FIELD`, and a worked example), the role allow-list (which role feeds which purpose, `held-out`, `test` and unknown roles refused by name before any cell is read, the disjointness rule for calibration versus tuning file sets, and the statement that official `held-out` and `test` metrics come only from the benchmark runner), synthetic and real measurements kept separate, local-only licensing flag, the synthetic-only gating and enablement flow with the fixed warning text, and the statement that a synthetic frequency is a generator parameter and not historical prevalence.
    - Include a registry table with one row for every committed Prior_Measurement and Calibration_Record (artifact path, kind, scope, `datasetVersion`, role or roles read, benchmark version, seed, sample size, licence-check status). The table starts empty. No measurement or calibration number is quoted anywhere unless its row exists. State the artifact location as `data/restoration/` marked pending confirmation (Q7a).
    - _Requirements: 3.4, 3.5, 3.7, 3.8, 3.10, 3.14, 3.18, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9_

  - [ ] 23.5 Write the priors registry sync test
    - `src/restore/__tests__/priorsRegistry.test.ts`: every committed Prior_Measurement and Calibration_Record JSON (under the artifact directory, currently none) has a row in the `docs/restoration-priors.md` registry table whose role or roles and `datasetVersion` equal the artifact's, and every row names an existing artifact. The test passes while the directory and table are both empty and fails on any mismatch. Add a negative self-test with in-memory data. Also assert the document contains the Minimal_Dataset_Format and role allow-list sections. This test is required.
    - Files owned: `src/restore/__tests__/priorsRegistry.test.ts`.
    - _Requirements: 26.8, 26.9_

  - [ ] 23.4 Write the assumptions document
    - `docs/restoration-assumptions.md`: table of R1 to R6, A3 to A8 and A10 with working value, basis, where code depends on it, the paper page or figure still to be recorded, and the correction path. State that none is verified, that no dataset is redistributed, that the Garín5 licence is unchecked, and that the within-card partner mapping is a placeholder. List the closed questions and their approved answers (Q1 to Q7, folder part of Q7 only) and the items still to be confirmed from task 27 (Q7a only). Also record two settled decisions: the seed block starts at 20260500, and `reviewed` after a withdrawal on an approved Deck is a transient reported state while the derived deck state follows Req 14.7.
    - _Requirements: 4.10, 5.9, 24.5_

- [ ] 24. Golden tests (Group E)
  - Depends on: tasks 14, 15, 19, 20. Files owned: `src/restore/__tests__/golden/*`, `scripts/restoration-golden-update.ts`, and the test file below.
  - [ ] 24.1 Build the golden fixture and update script
    - Fixed 3-card deck under a small generated profile (not Garín), with one repeat-inferred cell, one symmetry-inferred cell, one short region that abstains with `REGION_TOO_LARGE` at a deliberately tiny bound, one Applied_Override cell, one cell with `syntheticPriorWarning` (a recorded enablement), and a `null` confidence cell beside a `0` confidence cell. Built only through public operations with `SEED_GOLDEN`. `restoration-golden-update.ts` regenerates the goldens and is run only on purpose.
    - Files owned: `src/restore/__tests__/golden/fixture.ts`, `scripts/restoration-golden-update.ts`.
    - _Requirements: 25.20_

  - [ ] 24.2 Commit goldens and write the comparison tests
    - Committed goldens: `restoration-record.golden.json`, `evidence-view.golden.json`, `confidence-heatmap.golden.json`. Tests assert byte equality, that the `null` and `0` cells appear as the literal `null` and `0`, that the warning cell carries the fixed text and `uncalibrated`, and that the opaque label does not change the compared bytes outside its own field. A golden change needs a stated reason in the commit message.
    - Files owned: `src/restore/__tests__/golden/*.golden.json`, `src/restore/__tests__/golden.test.ts`.
    - _Requirements: 21.9, 25.20_

- [ ] 25. Regression examples (Group A)
  - Depends on: task 3, and task 4.1 for 25.2. Files owned: `src/restore/__tests__/regressions.test.ts`.
  - [ ] 25.1 Create the regression example file
    - Create `regressions.test.ts` with a header describing the rule that every shrunk counterexample found by any property in this suite is added here as a permanent example with its seed and the date-free description of the failure. Seed it with the three example tests that are already required as permanent regressions (synthetic-prior cases a, b and c from Property 19 may stay in their own file; this file starts with a trivial self-check that it is imported by the test run).
    - Files owned: `src/restore/__tests__/regressions.test.ts`.
    - _Requirements: 25.21_

  - [ ] 25.2 Add the four attestation regression examples
    - In `regressions.test.ts`, add permanent examples calling `validateOriginAndAttestation`: (a) a `synthetic` deck with image evidence on one card and no entry for it returns `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]`; (b) a mixed deck of several context cards without Detection_Evidence plus one damaged card with image evidence and a matching entry is valid; (c) a deck of two cards with image evidence, one attested and one not, returns `INVALID_CONFIGURATION` naming the unattested `cardId`; (d) the same mixed deck as (b) with `deckOrigin` `real` and the entry supplied returns `INVALID_CONFIGURATION`.
    - Files owned: `src/restore/__tests__/regressions.test.ts`.
    - _Requirements: 25.25, 3.21, 3.22, 3.23_

- [ ] 26. Integration and final guards (Group E)
  - Depends on: tasks 19, 20, 22 (including 22.3), 23 (including 23.5), 24. Files owned: the test files below.
  - [ ] 26.1 Write the final repository guards
    - `src/restore/__tests__/guards.test.ts`: no file imports `_stub.ts`, then delete `_stub.ts`; the surface snapshot is unchanged since the freeze and `RESTORATION_INTERFACE_VERSION` is `"1.0.0"`; `SYNTHETIC_PRIOR_WARNING_TEXT` equals the required text; the docs sync test, the priors registry test and the four documents exist; `RESTORATION_ERROR_CODES` contains `ROLE_NOT_PERMITTED_FOR_TUNING`, `FILE_SET_OVERLAP`, `SPLIT_ROLE_MISMATCH` and `UNKNOWN_FIELD`; `src/restore/tuning/roles.ts` and `datasetFormat.ts` exist, are exported from the index, and import no file or clock API; `scripts/restoration-tune.ts` imports no `src/benchmark` and contains no role or format logic (it calls the pure functions); `src/restore/_stub.ts` is deleted; `docs/restoration-assumptions.md` lists R1 to R6, A8 and A10; no `src/restore` file outside `__tests__` uses a forbidden identifier. This test is required.
    - Files owned: `src/restore/__tests__/guards.test.ts`.
    - _Requirements: 3.18, 22.4, 23.4, 23.6, 23.7, 26.1, 26.8, 26.9_

  - [ ]* 26.2 Write the end-to-end integration test
    - `src/restore/__tests__/integration.test.ts`: build a periodic synthetic deck, mask cells with the test-owned function, run inference with a valid synthetic-scope measurement and an enablement entry on a `real` deck, review (accept one region, select an alternative, reject one, edit one cell, acknowledge an override), approve with and without the policy, revoke, undo an accepted region (approved and unapproved), export and import the record, rebuild the Evidence_View and heatmap, and assert that every effective value, every Raw_Observation, the record integrity check and the exported round trip agree.
    - Files owned: `src/restore/__tests__/integration.test.ts`.
    - _Requirements: 12.9, 13.3, 15.1, 16.7, 17.6, 21.8, 25.5_

  - [ ]* 26.3 Write the error-code coverage test
    - `src/restore/__tests__/errorCodes.test.ts` triggers every code in `RESTORATION_ERROR_CODES` and every value in `ABSTENTION_REASONS` through the public API at least once and fails when a registered code or reason is never triggered. The amendment codes `ROLE_NOT_PERMITTED_FOR_TUNING`, `FILE_SET_OVERLAP` and `SPLIT_ROLE_MISMATCH` are triggered through the public `permitTuningRole`, `checkFileSetsDisjoint` and `importMinimalDataset`, and `UNKNOWN_FIELD` through both the serializers and `importMinimalDataset`.
    - Files owned: `src/restore/__tests__/errorCodes.test.ts`.
    - _Requirements: 22.5_

- [ ] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm with the user **Q7a**, where committed Prior_Measurement and Calibration_Record JSON artifacts live: recommended `data/restoration/` with a README stating source, licence and roles (task 22.1 defaults to it), or beside the benchmark's committed outputs in `data/benchmark`. If the answer changes, update the default in `scripts/restoration-tune.ts`, the README location and `docs/restoration-priors.md`, and update `structure.md` only if the choice needs it.
  - Confirm that `docs/restoration-assumptions.md` records Q1 to Q7 with their approved answers.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Required items include the import-boundary test (1.3), the surface snapshot (2.8), the domain-version check (2.7), the docs sync test (23.1), the goldens (24.1, 24.2), the regression file (25.1) and the final guards (26.1), because they enforce stated requirements. Whole-card recovery (task 21) is a stretch feature and is entirely optional.
- Crew delegation summary (all tasks below start after the interface freeze, task 3, and edit no frozen file):

| Task | Group | Depends on | Files owned (disjoint) |
|------|-------|------------|------------------------|
| 4 | A | 3 (4.4 also 7.2) | `config/validate.ts`, `config/defaults.ts`, `determinism/*` |
| 5 | A | 3, 4.2 | `types/cell.ts` (bodies), `inference/trustedCells.ts`, `regions/segment.ts` |
| 6 | A | 3 | `gating/priorGate.ts` |
| 7 | A | 3 | `__tests__/generators/synthetic.ts`, `generators/data.ts`, `syntheticRecoveryConditions.ts` |
| 23 | A | 3 | `docs/restoration-*.md`, `docsErrorsSync.test.ts` |
| 25 | A | 3 | `__tests__/regressions.test.ts` |
| 8 | B | 3, 6 (P22), 7.2 | `calibration/apply.ts`, `calibration/validate.ts` |
| 9 | B | 4.2, 5.2, 7 | `inference/repeat.ts` |
| 10 | B | 4.2, 5.2, 7 | `inference/symmetry.ts` |
| 11 | B | 3 | `inference/imageEvidence.ts`, `inference/combine.ts` |
| 12 | B | 3, 7 | `inference/explain.ts`, `inference/rank.ts` |
| 13 | B | 3 | `record/build.ts` |
| 14 | B | 3, 6, 7.2, 8 | `record/serialize.ts` |
| 15 | B | 3 | `evidence/evidenceView.ts`, `evidence/heatmap.ts` |
| 16 | B | 3 | `review/stateMachine.ts` |
| 17 | B | 3, domain | `review/domainWrite.ts` |
| 19 | D, single worker | 18 | `inference/engine.ts`, `inference/wholeCard.ts` (baseline) |
| 20 | D, single worker | 16, 17, 18 | `review/approval.ts`, `review/undo.ts`, `review/service.ts`, `generators/review.ts` |
| 21 | E, optional | 19, 20 | `inference/wholeCard.ts` (body) |
| 22.3 to 22.7 | B | 3 (tests also 7.2) | `tuning/roles.ts`, `tuning/datasetFormat.ts`, `__tests__/tuning*.test.ts`, `tuning*.props.test.ts` |
| 22.1, 22.2 | E | 1.1, 6, 8, 14, 19, 22.3 | `scripts/restoration-tune.ts`, `data/restoration/README.md`, `__tests__/tuneScript.test.ts` |
| 23.5 | A | 23.3 | `__tests__/priorsRegistry.test.ts` |
| 24 | E | 14, 15, 19, 20 | `__tests__/golden/*`, `scripts/restoration-golden-update.ts` |
| 26 | E | 19, 20, 22, 23, 24 | `__tests__/guards.test.ts`, `integration.test.ts`, `errorCodes.test.ts` |

- Each Crew task owns its tests and edits no file owned by another task. No task edits `package.json` or the build and test configs. The integrator creates them at milestone M0 with every script pre-registered. Tasks 19 and 21 both touch `wholeCard.ts` in different waves.
- Property coverage: P1, P7 to P13, P16, P19 and P20 are in task 19; P2 to P6 and P14 in task 20; P15 in task 14; P17 (golden) in task 24; P18 (process rule) in task 25; P21 in task 12; P22 in task 8.3 (extended for roles, `datasetVersion` and file-set ids); P23, P24 and P25 in tasks 22.5, 22.6 and 22.7; P26 in task 4.4; P27 in task 19.15. The four Req 25.25 regression cases are in task 25.2. Properties 7, 8, 10 and 16 depend on the synthetic builders in task 7.
- Seeds: `SEED_Pn = 20260500 + n` for n from 1 to 27, `SEED_GOLDEN = 20260600` (block start 20260500 is settled). Generator preconditions are stated in a comment beside each test (Req 25.2).
- Restoration numeric defaults (thresholds, penalty constant, short-region bound, periods) are initial values. They are re-derived only by `scripts/restoration-tune.ts` on a tuning split and loaded from versioned JSON. No accuracy, frequency, reliability or calibration number is claimed before a recorded run.
- Benchmark (spec 4) and UI (spec 5) work is excluded. This plan provides the interfaces they consume: `runInference`, `applyReviewAction`, `approveDeck`, the Evidence_View and heatmap builders, the state accessors, the masking contract and the serialisers.
- To start executing, open this file and click "Start task" next to a task item.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.3"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5"] },
    { "id": 6, "tasks": ["2.6"] },
    { "id": 7, "tasks": ["2.7"] },
    { "id": 8, "tasks": ["2.8"] },
    { "id": 9, "tasks": ["3"] },
    { "id": 10, "tasks": ["4.1", "4.2", "5.1", "6.1", "7.1", "7.2", "8.1", "11.1", "12.1", "12.2", "13.1", "14.1", "15.1", "16.1", "17.1", "22.3", "23.1", "23.2", "23.3", "23.4"] },
    { "id": 11, "tasks": ["5.2", "4.3", "4.4", "6.2", "7.3", "8.2", "8.3", "11.2", "12.3", "12.4", "13.2", "14.2", "14.3", "15.2", "16.2", "17.2", "22.4", "22.5", "22.6", "22.7", "23.5", "25.1", "25.2"] },
    { "id": 12, "tasks": ["9.1", "10.1", "5.3"] },
    { "id": 13, "tasks": ["9.2", "10.2"] },
    { "id": 14, "tasks": ["18"] },
    { "id": 15, "tasks": ["19.1", "19.2", "20.1", "20.2"] },
    { "id": 16, "tasks": ["19.3", "19.4", "19.5", "19.6", "19.7", "19.8", "19.9", "19.10", "19.11", "19.12", "19.13", "19.14", "19.15", "20.3", "21.1", "22.1"] },
    { "id": 17, "tasks": ["20.4", "21.2", "22.2", "24.1", "26.2", "26.3"] },
    { "id": 18, "tasks": ["20.5", "20.6", "20.7", "20.8", "20.9", "20.10", "20.11", "24.2"] },
    { "id": 19, "tasks": ["26.1"] },
    { "id": 20, "tasks": ["27"] }
  ]
}
```

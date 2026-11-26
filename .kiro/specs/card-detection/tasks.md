# Implementation Plan: Card Detection

## Overview

This plan implements the Card_Detector in `src/vision`, with a thin worker adapter in `src/workers`, as strict TypeScript with Vitest, fast-check and Playwright, following `design.md`. It builds on the approved `card-domain-and-loom-engine` contract and imports `src/domain` only through its index.

Prerequisite: the `card-domain-and-loom-engine` library (at least its interface freeze, core deck work and `index.ts`) exists in `src/domain`. Tasks 10, 15 and every task that builds a Deck or Profile need it. If its scaffold (`package.json`, `tsconfig.json`, Vitest config) is missing, task 1.2 creates the minimum needed and does not duplicate files the domain already owns.

The plan is ordered so that interfaces come first:

- **Tasks 1 and 2:** repository preparation (including a verification that the `structure.md` scripts entry has already landed) and all interface definitions: vision types, parameters, `VisionResult` and the error registry, Detection_Result and correction-layer types, worker protocol types, `ImageBackend`, then signature stubs and the public index.
- **Task 3: INTERFACE FREEZE.** After it, signatures change only through a spec update (Req 20.5).
- **Group A (tasks 4 to 6):** foundations used by everything else. Crew-delegable.
- **Group B (tasks 7 to 16):** independent components. Crew-delegable, disjoint files, own tests.
- **Group C (tasks 17 to 21):** image stages that need the typed-array backend and the synthetic generator. Crew-delegable.
- **Task 23 (Group D):** pipeline integration. One worker, not split.
- **Group E (tasks 25 to 31):** worker adapter, cross-cutting tests, goldens, evaluation wrapper scripts (delegating to the benchmark runner), browser tests, measurements, optional OpenCV.js spike and final guards.

Approved decisions reflected here:
- Every detected cell maps with `initial.restorationConfidence: null` (not evaluated). The domain types it `number | null`. Detection never sets a number, and never derives one from hole probability.
- `set-cell-value` corrections map through the domain `userEdit` (provenance `user-edited`, per-cell action ids `"<actionId>#<readIndex>"`, value as a `Bit` through the polarity). `setInferred` is never called, because it rejects `user-edited` and `null`.
- `set-cell-condition` corrections live only in the vision Correction_Log, the Correction_Layer and `CardDetectionRecord.userConditionOverrides`. They are never written to the domain Card and never go through `setInferred`.
- Q1: the typed-array `ImageBackend` comes first. OpenCV.js is added only if the spike shows a measured gain (task 30, optional).
- Q4: patch and finding ids go in evidence text and in the detection record, with no domain change.
- Q5: the bundled sample ships with a recorded, user-supplied orientation.
- Q6: the `scripts` entry in `structure.md` has ALREADY landed (task 1.1 only verifies it, no edit). Q6 now covers only the dev-only image codec dependency.
- Q7: reference hardware for budgets is the developer machine plus the CI Chromium runner, with specifications recorded beside every number.
- Amendment (benchmark-and-evaluation, requirements 7 and 10): damage levels, the Occlusion_Cover_Fraction (a per-Cell_Window fraction, initial 0.9, `initial-unconfirmed` until benchmark experiment E-2) and the per-level `occlusionCoverage` extent are owned by the benchmark spec in `data/synthetic/damage-levels.json`. Detection only reads that file as data (`loadDamageLevels(json, unknownCoverFrac)`, benchmark 7.3 field list, no `src/benchmark` import, no placeholder file, an invalid file gives `INVALID_PARAMETERS`). Official detection numbers come from the benchmark runner: `scripts/vision-eval-synthetic.ts` and `scripts/vision-eval-real.ts` are thin wrappers over `runBenchmark` / `runDetectionTrack`, and `scripts/vision-tune.ts` reads only the `tuning` role of a Dataset_Manifest. The Deck_Family splits supersede the old seed-block convention for official reports. The benchmark runner may not exist yet, so the wrappers stay stubs that return a clear error until it does, and no detection task blocks on it.

Out of scope (other specs): UI, restoration, benchmark implementation (runner, dataset builder, Damage_Level_File content, Threshold_Register), damage-model definitions. The Playwright harness page in task 28 is a minimal test fixture, not a UI.

Conventions for every task:
- Inside `src/vision`, files that produce a Detection_Result must not use `document`, `window`, `fetch`, `XMLHttpRequest`, `Date`, `Math.random`, `performance.now`, `setTimeout` or `setInterval`. Exceptions are `intake/decoder.ts`, `client/`, `protocol/` adapters and `__tests__/` (Req 13.12, 20.7). The pipeline yields through the injected `PipelineHooks.yieldToEventLoop`.
- Each property test is a single `fc.assert(fc.property(...), { seed, numRuns })`. The seed comes from `src/vision/__tests__/seeds.ts` (`SEED_P1` to `SEED_P29`, value `20260200 + n`; this block applies to property tests only and defines no dataset split, because dataset splits are the benchmark's Deck_Family Split_Roles). `numRuns` is at most 200 for image-based properties and at most 500 for data-only properties. Each test has a tag comment `// Feature: card-detection, Property N: <title>` and an adjacent precondition and seed comment (Req 22.1, 22.2).
- No test uses `Math.random`, `Date.now` or the network. Every image is generated from a seed (Req 22.3).
- Code that depends on an unverified assumption carries `// UNVERIFIED D<n>: see .kiro/steering/jacquard-card-format.md`.
- A worker edits only the files its task owns. Frozen files change only through a spec update.
- Run tests with `vitest --run`, never watch mode. Playwright runs headless with `--reporter=line`.
- Restoration confidence in all detection output is `null` (not evaluated). A number is assigned only by the restoration spec through `setInferred`.
- Every shrunk counterexample found becomes a permanent example test (Req 22.17).
- Accuracy numbers are quoted only from a recorded run. No task asserts an accuracy threshold.

## Tasks

- [ ] 1. Repository preparation and scaffold
  - [ ] 1.1 Verify the `structure.md` scripts entry exists (Q6, no edit)
    - Read `.kiro/steering/structure.md` and confirm it already lists the `scripts` folder (thin TypeScript CLI entry points, no `src` folder imports `scripts`, generated data only under `data/generated`, committed manifests and reports under `data/benchmark`). Do not edit the file.
    - If the entry is missing, stop and report to the user instead of editing, because steering changes need approval.
    - Note for later tasks: `data/synthetic/damage-levels.json` is owned by the benchmark spec, and `data/samples` is created by task 28.1 with its own README.
    - Files owned: none (verification only).
    - _Requirements: 18.5, 21.7_

  - [ ] 1.2 Scaffold `src/vision`, `src/workers`, scripts entries and dev dependencies
    - Create the `src/vision` folder skeleton from the design's module layout (empty `index.ts` placeholder, `__tests__/`, `__tests__/support/`, `__tests__/synthetic/`, `__tests__/goldens/`, `__tests__/fixtures/`, `__tests__/browser/`) and `src/workers/`.
    - Choose and add a dev-only PNG, JPEG and WebP codec set for Node tests (check licence and size; choose after comparing at least two options) and Playwright. Record the choice, versions and licences in `docs/vision-dev-dependencies.md`. No production code imports them.
    - Pre-register every npm script in `package.json` now so later workers never edit it: `vision:spike`, `vision:measure`, `vision:compare-envs`, `vision:eval:synthetic`, `vision:eval:real`, `vision:tune`, `vision:make-sample`, `vision:golden:update`, `test:browser`.
    - Create `src/vision/__tests__/seeds.ts` with `SEED_P1` to `SEED_P29` (`20260200 + n`) and `SEED_GOLDEN = 20260300`. Reuse or mirror the domain's `deepFreeze` and `cloneBefore` helpers in `src/vision/__tests__/helpers.ts`.
    - Files owned: `package.json` (scripts and dev dependencies only), `docs/vision-dev-dependencies.md`, `src/vision/__tests__/seeds.ts`, `src/vision/__tests__/helpers.ts`, folder skeleton.
    - _Requirements: 17.9, 18.5, 22.1, 22.3_

  - [ ] 1.3 Write the import-boundary test
    - Create `src/vision/__tests__/boundary.test.ts` using the TypeScript compiler API over every `.ts` file in `src/vision`, `src/workers` and `src/domain`.
    - Fail if a file in `src/vision` imports `src/ui`, `src/restore`, `src/benchmark`, or `src/domain` by any path other than its index. Fail if `src/domain` imports `src/vision` or `src/workers`. Fail if `src/workers` imports anything other than `src/vision` (index) and `src/domain` (index). Fail if production code imports from `__tests__`.
    - Fail on the forbidden identifiers listed in Conventions in any file under `src/vision` that produces a Detection_Result, with the exception list in Conventions.
    - Add a negative self-test that feeds an in-memory violating source and expects failure.
    - Files owned: `src/vision/__tests__/boundary.test.ts`.
    - _Requirements: 13.12, 13.13, 20.6, 20.7_

- [ ] 2. Interface definitions
  - [ ] 2.1 Define `VisionResult`, `VisionError` and the error registry
    - Create `result.ts`: `JsonValue`, `JsonObject`, `VisionResult<T>`, `VisionError` (code, message, path, stage, domainCode, details), `VISION_ERROR_CODES` tuple, derived `VisionErrorCode`, `VISION_ERROR_MESSAGES` with a stable message per code, `ok`/`err` helpers and a helper that wraps a domain error as `DOMAIN_RULE_REJECTED` with `domainCode`.
    - Registry content is the table in the design's "Vision error registry", including the codes added by the design (`DETECTION_RESULT_MISMATCH`, `RESULT_NOT_MAPPABLE`, `PROFILE_MISMATCH`, `DOMAIN_RULE_REJECTED`). Do not extend the domain `ErrorCode` union.
    - Files owned: `src/vision/result.ts`.
    - _Requirements: 16.1, 16.2, 16.3, 10.9_

  - [ ] 2.2 Define shared coordinate types and enumerations
    - Create `coords.ts` types only: `ImagePoint`, `RectPoint`, `ImageQuad`, `RectBox`, `Orientation`, `Matrix3`, and the shared unions `HolePolarityAssumption`, `QualityKind`, `ArtifactKind`, `StageName`/`PipelineStage`, `Condition`, `RegionReason`, `CellUnknownReason`, `AlignmentStatus`, `FailureStage`, `SuggestedAction`. Add a compile-time test (`// @ts-expect-error`) that an `ImagePoint` is not accepted as a `RectPoint`.
    - Files owned: `src/vision/coords.ts` (types), `src/vision/__tests__/coordTypes.test.ts`.
    - _Requirements: 3.6, 4.8, 5.8, 8.1_

  - [ ] 2.3 Define `DetectionParameters` and its defaults
    - Create `params/types.ts` (`DetectionParameters`, `IntakeLimits`, sub-objects per stage), `params/defaults.ts` (`DEFAULT_PARAMETERS` with the design's initial values and the documented range table as data), and `params/overrideAllowList.ts` (`OVERRIDE_ALLOW_LIST`, `OverridablePath`, `unverifiedParameterPaths`).
    - Mark parameters that depend on unverified items (D2, D5, D6, D7, P1) in a constant used later to fill `unverifiedParameterPaths`.
    - Files owned: `src/vision/params/types.ts`, `defaults.ts`, `overrideAllowList.ts`.
    - _Requirements: 1.1, 2.5, 3.2, 5.9, 7.4, 8.7, 8.8_

  - [ ] 2.4 Define the Detection_Result types
    - Create `detectionResult.ts`: `DetectionResult`, `ImplementationStamp`, `ImageRef`, `ProfileRef`, `PolarityAssumption`, `IntakeReport`, `PreprocessingReport`, `GeometryReport`, `EndHoleFinding`, `GridReport`, `CellFeatures`, `PatchReference`, `CellDiagnostics`, `CellEvidence`, `CellWindow`, `ReservedRecord`, `ConditionSummary`, `QualityFinding`, `UnknownRegion`, `QualityReport`, `AlignmentOutcome`, `FailureDiagnostics`, `ArtifactDescriptor`, `ArtifactProvenance`, `ROUNDING`, `VISION_INTERFACE_VERSION = "1.0.0"`.
    - There is no restoration-confidence field anywhere in these types (Req 7.8). `holeProbabilityNote` and `calibration` are required fields.
    - Files owned: `src/vision/detectionResult.ts`.
    - _Requirements: 6.3, 7.7, 7.8, 8.1, 8.10, 9.2, 11.2, 14.2, 14.3, 15.5, 15.10_

  - [ ] 2.5 Define the correction types
    - Create `corrections/types.ts`: `CorrectionEntryClass`, `GeometryCorrectionKind`, `GeometryCorrectionEntry`, `CellCorrectionKind`, `CellCorrectionEntry`, `ReviewResolutionEntry`, `CorrectionUndoEntry`, `CorrectionLogEntry`, `CorrectionLog`, `GeometryFingerprint`, `EvidenceSnapshot`, `EffectiveGeometry`, `ReviewReasonCode`, `ReviewReason`, `ReconciliationTolerances`, `ReconciliationItem`, `ReconciliationReport`, `CorrectionLayer`, `AppliedCellCorrection`, `NotAppliedCorrection`, `GeometryValidationContext`, `DEFAULT_RECONCILIATION_TOLERANCES`.
    - Files owned: `src/vision/corrections/types.ts`.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.11, 12.16, 12.17, 12.20_

  - [ ] 2.6 Define the mapping types
    - Create `mapping/types.ts`: `MapOptions`, `MappedDetection`, `CardDetectionRecord`, `UserConditionOverride`, `AssistantEvidence` reference. `CardDetectionRecord` includes `restorationConfidenceNote`, `holeProbabilityCalibration`, `perCell`, `appliedCorrections`, `userConditionOverrides`, `notApplied`, `assistantEvidence`.
    - Files owned: `src/vision/mapping/types.ts`.
    - _Requirements: 10.1, 10.7, 10.12, 10.13, 10.14, 19.5_

  - [ ] 2.7 Define backend, pipeline environment, cache and assistant interfaces
    - Create `backend/imageBackend.ts` (`Raster`, `ImageBackend`, `ImageDecoder`, `ComponentSet`, `KernelSpec`), `pipeline/context.ts` types (`PipelineHooks`, `DetectEnvironment`, `DetectInput`, `StageCache`, `StageOutput`), and `assistant/interface.ts` (`DetectionAssistant`, `AssistantInput`, `AssistantTarget`, `AssistantProposal`, `AssistantEvidence`).
    - Files owned: `src/vision/backend/imageBackend.ts`, `src/vision/pipeline/context.ts` (types only at this stage), `src/vision/assistant/interface.ts`.
    - _Requirements: 13.5, 13.6, 17.1, 19.1, 19.3_

  - [ ] 2.8 Define the worker protocol and client types
    - Create `protocol/messages.ts` (`PROTOCOL_VERSION`, `RunMessage`, `CancelMessage`, `ReadyMessage`, `ProgressMessage`, `ResultMessage`, `ErrorMessage`, `TransferredArtifact`, `ClientMessage`, `WorkerMessage`) and `client/types.ts` (`WorkerFactory`, `WorkerLike`, `DetectionClient`). The `run` message carries no Cell_Corrections.
    - Files owned: `src/vision/protocol/messages.ts`, `src/vision/client/types.ts`.
    - _Requirements: 13.2, 13.3, 12.11_

  - [ ] 2.9 Declare signature stubs for every remaining module
    - In each file below, export the final function signatures from the design with TSDoc listing the `VisionError` codes. Bodies call a temporary `notImplemented()` helper in `src/vision/_stub.ts`.
    - Files: `hash.ts`, `canonical.ts`, `params/validate.ts`, `coords.ts` (function signatures), `intake/sniff.ts`, `intake/exif.ts`, `intake/limits.ts`, `intake/decoder.ts`, `backend/typedArrayBackend.ts`, `preprocess/{resize,illumination,denoise,perspective}.ts`, `geometry/{cardQuad,endHoles,orientation,holeContrast}.ts`, `grid/{latticeFit,cellWindows}.ts`, `classify/{features,probability,condition}.ts`, `quality/*.ts`, `pipeline/{stageCache,assemble,detect}.ts`, `serialize/{resultId,invariants,detectionResult}.ts`, `corrections/{log,validate,fold,restartStage,reconcile,layer,serialize}.ts`, `mapping/{observationMapper,applyCorrections,detectionRecord}.ts`, `assistant/validate.ts`, `evaluation/{metrics,compare}.ts`, `protocol/validate.ts`, `client/detectionClient.ts`, `src/workers/detectionAdapter.ts`.
    - Do not create `backend/opencvBackend.ts`. It exists only if the optional spike (task 30) justifies it.
    - Stubs carry the final confidence contract: `mapDetection` documents that every cell gets `restorationConfidence: null`.
    - `_stub.ts` is temporary. Task 31.1 asserts nothing imports it and deletes it.
    - _Requirements: 16.1, 20.1, 20.2, 20.3, 20.4_

  - [ ] 2.10 Create the public index and interface version
    - Create `src/vision/index.ts` as the single export surface re-exporting every type, function and constant named in the design, plus `VISION_INTERFACE_VERSION`, `VISION_ERROR_CODES` and `VISION_ERROR_MESSAGES`. Do not export anything from `__tests__`.
    - Files owned: `src/vision/index.ts`.
    - _Requirements: 20.1, 20.5_

  - [ ] 2.11 Add the exported-surface snapshot test
    - Create `src/vision/__tests__/surface.test.ts` comparing the sorted exports of `index.ts` with a committed `surface.snapshot.json`, plus an assertion that `VISION_INTERFACE_VERSION` exists.
    - Any later change to the snapshot requires a spec update.
    - Files owned: `src/vision/__tests__/surface.test.ts`, `src/vision/__tests__/surface.snapshot.json`.
    - _Requirements: 20.1, 20.5_

- [ ] 3. INTERFACE FREEZE checkpoint
  - Ensure `vitest --run` and the type check pass, the surface snapshot is committed and the stub list in task 2.9 is complete.
  - From this point every type file, `result.ts`, `params/types.ts`, `params/defaults.ts`, `index.ts` and all exported signatures change only through a spec update. Crew workers must not edit frozen files. A worker that finds a frozen signature must change stops and reports.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Foundations: hashing and canonical writer (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `src/vision/hash.ts`, `src/vision/canonical.ts`, and the test files below.
  - [ ] 4.1 Implement hashing
    - `fnv1a64` (synchronous, 16 lowercase hex characters, over UTF-8 bytes) and `sha256Hex` (asynchronous through `crypto.subtle`, algorithm name returned with the value).
    - Files owned: `src/vision/hash.ts`.
    - _Requirements: 1.10, 15.1_

  - [ ] 4.2 Implement the canonical JSON writer and schema key tables
    - Schema-ordered stable writer: key order from per-type key tables, two-space indent, `\n` line endings, finite numbers only, absent optionals omitted, no timestamps. Numbers are rounded per `ROUNDING` when a result is assembled and the writer never changes them.
    - Add the unknown-field walk (`UNKNOWN_FIELD` with path) used by importers. The key tables must contain no restoration-confidence field for Detection_Result types.
    - Files owned: `src/vision/canonical.ts`.
    - _Requirements: 7.8, 12.27, 15.3, 15.6, 15.8_

  - [ ]* 4.3 Write hashing and canonical-writer unit tests
    - Known FNV-1a and SHA-256 vectors, stable key order, equal values give byte-identical text, non-finite numbers rejected, unknown field reported with its path, no `restoration` key in the Detection_Result key tables.
    - Files owned: `src/vision/__tests__/hash.test.ts`, `src/vision/__tests__/canonical.test.ts`.
    - _Requirements: 7.8, 15.3, 15.6_

- [ ] 5. Foundations: coordinate math and parameter validation (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `src/vision/coords.ts` (function bodies), `src/vision/params/validate.ts`, `src/vision/__tests__/generators/params.ts`, and the test files below.
  - [ ] 5.1 Implement homography and raster rotation helpers
    - `homographyFromQuad`, `applyHomography`, `invert3`, `rotateRaster90` (lossless, no resampling), and the clockwise-order and convexity helpers used by validators.
    - Files owned: `src/vision/coords.ts`.
    - _Requirements: 3.6, 4.8, 12.6_

  - [ ] 5.2 Implement parameter validation
    - `validateParameters(p, profile)`: ranges from the documented table, the threshold relation `0 <= noHoleThreshold < holeThreshold <= 1`, weights sum to 1, `gridFitFailBelow < gridFitWarnBelow`, `ringOuterFactor * holeRadiusFrac <= 0.5`, `minLongSide >= minShortSide`. Return `INVALID_PARAMETERS` naming the first offending path before any pixel work. Implement the override allow-list check used by `set-parameter-override`.
    - Files owned: `src/vision/params/validate.ts`.
    - _Requirements: 1.1, 2.5, 3.10, 5.9, 8.7, 12.9_

  - [ ]* 5.3 Write property test for rectification geometry
    - **Property 27: Rectification geometry is consistent**
    - **Validates: Requirements 3.6, 4.8**
    - Seed `SEED_P27`, 500 runs; `arbQuad` (convex, clockwise, area above a minimum), `arbRaster` up to 16 by 16.
    - Files owned: `src/vision/__tests__/rectification.props.test.ts`.

  - [ ]* 5.4 Write property test for parameter validation
    - **Property 16: Invalid parameters are rejected before any processing**
    - **Validates: Requirements 3.10, 8.7, 5.9**
    - Seed `SEED_P16`, 500 runs. Define `arbParameters` and `arbParameterViolation` (one enumerated violation per sample) in `generators/params.ts`. A pipeline spy records no backend call and no decode on rejection.
    - Files owned: `src/vision/__tests__/generators/params.ts`, `src/vision/__tests__/params.props.test.ts`.

  - [ ]* 5.5 Write coordinate and parameter unit tests
    - Homography on a known quad, 180-degree rotation equals two 90-degree rotations, each documented range boundary accepted and one beyond rejected, override allow-list accept and reject examples.
    - Files owned: `src/vision/__tests__/coords.test.ts`, `src/vision/__tests__/paramsExamples.test.ts`.
    - _Requirements: 3.10, 8.7, 12.9_

- [ ] 6. Foundations: test support and shared data generators (Crew-delegable, Group A)
  - Depends on: task 3, task 1.2. Files owned: `src/vision/__tests__/support/*`, `src/vision/__tests__/generators/result.ts`, `src/vision/__tests__/generators/profile.ts`.
  - [ ] 6.1 Implement the Node image codec support
    - `nodeDecoder.ts` implementing `ImageDecoder` over the dev-only codec set, and `encodePng`/`encodeJpeg`/`encodeWebp` helpers used to build fixtures (animated PNG and WebP fixtures, truncated and corrupted copies). Test-only; never imported by production code.
    - Files owned: `src/vision/__tests__/support/nodeDecoder.ts`, `src/vision/__tests__/support/encode.ts`.
    - _Requirements: 1.2, 1.5, 1.7, 22.14_

  - [ ] 6.2 Add the shared data generators
    - `generators/profile.ts`: `arbSmallProfile` (3 to 12 rows, 2 to 8 columns, reserved list via seeded shuffle, read order from the domain generator pattern; always passes the domain `validateProfile`) and `arbReservedList`; also export the `GARIN_PROFILE` case.
    - `generators/result.ts`: `arbDetectionResult` (data only, satisfies every result invariant, any status, conditions, findings, regions, artifacts, polarity), `arbDetectionResultPair` (one fingerprint or evidence field mutated, for Property 13), `arbCorrectionLayer` and `arbAppliedCorrections` (value and condition kinds, overlaps for supersession).
    - Files owned: `src/vision/__tests__/generators/profile.ts`, `src/vision/__tests__/generators/result.ts`.
    - _Requirements: 22.1, 22.2_

- [ ] 7. Typed-array ImageBackend (Crew-delegable, Group B)
  - Depends on: tasks 3, 5. Files owned: `src/vision/backend/raster.ts`, `src/vision/backend/ops/*`, `src/vision/backend/typedArrayBackend.ts`, and the test files below. The `ops` split is an implementation detail and not exported.
  - [ ] 7.1 Implement raster helpers, filters and thresholding
    - `raster.ts` (constructors, buffer pool), `ops/filters.ts`: `toGray`, `resizeArea`, `gaussianBlur`, `medianBlur`, `normalizedBlur`, `threshold`, `otsu`. Fixed iteration order, no parallel reductions, no randomness.
    - Files owned: `src/vision/backend/raster.ts`, `src/vision/backend/ops/filters.ts`.
    - _Requirements: 3.3, 3.4, 3.5, 3.8, 17.1_

  - [ ] 7.2 Implement morphology, components and hull
    - `ops/morphology.ts`: `morph` (open, close, erode, dilate), `components` (4 and 8 connectivity with area, bbox, centroid, second moments), `convexHull`.
    - Files owned: `src/vision/backend/ops/morphology.ts`.
    - _Requirements: 4.1, 7.2, 17.1_

  - [ ] 7.3 Implement warp, sharpness and colour operations
    - `ops/geometry.ts`: `warpPerspective` (bilinear, inverse mapping), `laplacianVariance`, `rgbToLab`.
    - Files owned: `src/vision/backend/ops/geometry.ts`.
    - _Requirements: 3.6, 9.1, 17.1_

  - [ ] 7.4 Assemble the backend with allocation scopes
    - `typedArrayBackend.ts` implementing `ImageBackend` with a scope that records every pooled buffer, `liveAllocations()` and `dispose()`; name `"typed-array"` and a pinned version string for the Implementation_Stamp.
    - Files owned: `src/vision/backend/typedArrayBackend.ts`.
    - _Requirements: 17.1, 17.4, 17.8_

  - [ ]* 7.5 Write backend operation unit tests
    - Known-input results for each operation, determinism (two calls equal), no mutation of inputs, hull and component examples, bilinear warp against a hand-computed case.
    - Files owned: `src/vision/__tests__/backend.test.ts`.
    - _Requirements: 3.8, 17.1_

  - [ ]* 7.6 Write the allocation-release test
    - After 20 consecutive scoped runs of a representative operation chain, `liveAllocations()` equals the count before them.
    - Files owned: `src/vision/__tests__/backendAllocations.test.ts`.
    - _Requirements: 17.8_

- [ ] 8. Image intake (Crew-delegable, Group B)
  - Depends on: tasks 3, 5, 6.1. Files owned: `src/vision/intake/sniff.ts`, `exif.ts`, `limits.ts`, `decoder.ts`, and the test files below.
  - [ ] 8.1 Implement format sniffing and multi-frame detection
    - `sniffFormat` from magic bytes (never the file name) and `isMultiFrame` (PNG `acTL`, WebP animation flag, `ANIM`, `ANMF`).
    - Files owned: `src/vision/intake/sniff.ts`.
    - _Requirements: 1.2, 1.4, 1.7_

  - [ ] 8.2 Implement EXIF orientation read and raster transform
    - `readExifOrientation` for JPEG APP1, WebP EXIF chunk and PNG `eXIf`, values 1 to 8, and the transform to apply (rotation and optional flip) once after decode; report `appliedTransform`.
    - Files owned: `src/vision/intake/exif.ts`.
    - _Requirements: 1.8_

  - [ ] 8.3 Implement limit checks
    - `checkIntakeLimits` with the fixed order: bytes (before decoding), format, pixels, minimum size. Exactly at a limit is accepted and one unit beyond is rejected; messages state supplied and permitted values.
    - Files owned: `src/vision/intake/limits.ts`.
    - _Requirements: 1.1, 1.3, 1.6, 1.11_

  - [ ] 8.4 Implement the browser decoder
    - `decoder.ts`: `createImageBitmap` with `imageOrientation: "none"`, `premultiplyAlpha: "none"`, `colorSpaceConversion: "none"`, drawn to `OffscreenCanvas`. Return `IMAGE_DECODE_FAILED` for truncated or corrupted data with no partial raster. This is the only decode-path file allowed to use DOM-adjacent APIs.
    - Files owned: `src/vision/intake/decoder.ts`.
    - _Requirements: 1.5, 1.8, 13.1_

  - [ ]* 8.5 Write property test for intake limits and sniffing
    - **Property 15: Intake limits are exact and checked in a fixed order**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 1.11, 22.14**
    - Seed `SEED_P15`, 500 runs; `arbIntakeMeta` at limit-1, limit, limit+1 and random, `arbLimits` within bounds, `arbSignatureBytes` with random file names.
    - Files owned: `src/vision/__tests__/intake.props.test.ts`.

  - [ ]* 8.6 Write intake unit and example tests
    - Each of `IMAGE_TOO_LARGE_BYTES`, `UNSUPPORTED_IMAGE_FORMAT`, `IMAGE_DECODE_FAILED` (truncated and corrupted PNG, JPEG, WebP), `IMAGE_TOO_LARGE_PIXELS`, `IMAGE_TOO_SMALL`, `MULTI_FRAME_IMAGE` (animated PNG and WebP); exact-limit acceptance and plus-one rejection for bytes, width, height and pixel count; each of the eight EXIF values.
    - Files owned: `src/vision/__tests__/intake.test.ts`.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 22.14_

- [ ] 9. Manual-correction service (Crew-delegable, Group B)
  - Depends on: tasks 3, 4, 5, 6. Files owned: `src/vision/corrections/log.ts`, `validate.ts`, `fold.ts`, `restartStage.ts`, `reconcile.ts`, `layer.ts`, `serialize.ts`, `src/vision/__tests__/generators/corrections.ts`, and the test files below.
  - [ ] 9.1 Implement the log and the validators
    - `emptyCorrectionLog`, `recordGeometryCorrection` (log size, duplicate id, then per-kind rules: `INVALID_CORNERS` rule names, `INVALID_REFERENCE_HOLES`, `RESERVED_POSITION`, `INVALID_PARAMETERS`), `recordCellCorrection` (aligned status, `DETECTION_RESULT_MISMATCH`, `INVALID_CELL_CORRECTION`, note 1 to 1,000 chars; builds Evidence_Snapshots and the Geometry_Fingerprint from `current`), `resolveReview` (`UNKNOWN_ACTION_ID`, `REVIEW_NOT_PENDING`), `undoCorrection` (`UNKNOWN_ACTION_ID`, `NOTHING_TO_UNDO`). Single shared Sequence_Number, no timestamps, at most 1,000 entries (`CORRECTION_LOG_TOO_LARGE`). None of these invoke the detector, the backend or a decoder.
    - Files owned: `src/vision/corrections/log.ts`, `src/vision/corrections/validate.ts`.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.19, 12.21, 12.22, 12.23, 12.26, 12.29_

  - [ ] 9.2 Implement folding and restart-stage selection
    - `foldGeometry` (last `set-corners`, `set-reference-holes`, `set-orientation`, `set-polarity`, `select-profile`, last value per overridden path; reversed entries dropped, undo of undo restores) plus the shared helper that computes active and reversed entries. `restartStageFor(before, after)` per the design table (earliest stage wins, `null` when nothing changes).
    - Files owned: `src/vision/corrections/fold.ts`, `src/vision/corrections/restartStage.ts`.
    - _Requirements: 12.13, 12.14, 12.21, 12.24_

  - [ ] 9.3 Implement reconciliation and the Correction_Layer
    - `reconcile` (carried or needs-review with reason codes `ORIENTATION_CHANGED`, `POLARITY_CHANGED`, `PROFILE_CHANGED`, `INDEX_OUT_OF_RANGE`, `NOT_ALIGNED`, `GRID_SHIFTED`, `EVIDENCE_CHANGED`), `correctionLayer` (applied list, supersession by highest sequence, `notApplied` with `needs-review`, `discarded`, `superseded`; resolution bound to `resultId`). Pure functions of the log and the current result.
    - Files owned: `src/vision/corrections/reconcile.ts`, `src/vision/corrections/layer.ts`.
    - _Requirements: 12.16, 12.17, 12.18, 12.19, 12.20, 12.24_

  - [ ] 9.4 Implement Correction_Log export and import
    - `exportCorrectionLog` and `importCorrectionLog` via the canonical writer (`format: "loom-lazarus-corrections"`). Import order: size above 8 MiB (`INPUT_TOO_LARGE`), `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`, `CORRECTION_SEQUENCE_INVALID`, `CORRECTION_LOG_TOO_LARGE`. No partial log.
    - Files owned: `src/vision/corrections/serialize.ts`.
    - _Requirements: 12.26, 12.27, 12.28_

  - [ ] 9.5 Add the correction generators
    - `generators/corrections.ts`: `arbCorrectionLog` (built only through the public operations, 0 to 30 entries, embedded small profiles), `arbCorrectionOps`, `arbCellCorrection`, `arbValidGeometryCorrection`, `arbCornerSet`, `arbReferenceHoles`, `arbOverride`, each invalid variant from an enumerated list tagged with the expected code.
    - Files owned: `src/vision/__tests__/generators/corrections.ts`.
    - _Requirements: 22.2_

  - [ ]* 9.6 Write property test for geometry-correction validators
    - **Property 28: Geometry-correction validators accept exactly the valid inputs**
    - **Validates: Requirements 12.6, 12.7, 12.8, 12.9, 12.10**
    - Seed `SEED_P28`, 500 runs.
    - Files owned: `src/vision/__tests__/correctionValidators.props.test.ts`.

  - [ ]* 9.7 Write property test for log invariants
    - **Property 9: Correction_Log invariants hold under any operation sequence**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.19, 12.20, 12.21, 12.22, 12.23, 12.29, 22.11**
    - Seed `SEED_P9`, 200 runs, 0 to 20 operations against a fixed `arbDetectionResult`.
    - Files owned: `src/vision/__tests__/correctionLog.props.test.ts`.

  - [ ]* 9.8 Write property test for reconciliation
    - **Property 13: Reconciliation flags exactly the corrections that no longer match**
    - **Validates: Requirements 12.16, 12.17, 12.18, 22.20**
    - Seed `SEED_P13`, 300 runs, `arbDetectionResultPair`.
    - Files owned: `src/vision/__tests__/reconcile.props.test.ts`.

  - [ ]* 9.9 Write property test for Correction_Log round trip
    - **Property 7: Correction_Log export and import round trip**
    - **Validates: Requirements 12.27, 22.9**
    - Seed `SEED_P7`, 200 runs.
    - Files owned: `src/vision/__tests__/correctionLogRoundTrip.props.test.ts`.

  - [ ]* 9.10 Write correction service unit tests
    - `CORRECTION_LOG_TOO_LARGE` at entry 1,000 (accepted) and 1,001 (rejected), `DUPLICATE_ACTION_ID`, `REVIEW_NOT_PENDING`, `UNKNOWN_ACTION_ID`, `DETECTION_RESULT_MISMATCH`, undo of an undo restores the entry, one worked reconciliation example per reason code, `restartStageFor` table cases, supersession example.
    - Files owned: `src/vision/__tests__/corrections.test.ts`.
    - _Requirements: 12.4, 12.5, 12.14, 12.17, 12.19, 12.22, 12.26, 12.29_

- [ ] 10. Observation_Mapper (Crew-delegable, Group B)
  - Depends on: tasks 3, 6, and the domain library (core deck work). Files owned: `src/vision/mapping/detectionRecord.ts`, `applyCorrections.ts`, `observationMapper.ts`, and the test files below.
  - [ ] 10.1 Implement the card-level detection record builder
    - Build `CardDetectionRecord`: profile id and verification markers, Implementation_Stamp, Image_Digest, `resultId`, alignment, polarity, `restorationConfidenceNote` (states that every cell has `restorationConfidence: null` meaning not evaluated and that only restoration assigns a number), `holeProbabilityCalibration`, `perCell` (condition, probability, unknown reason, patch id, finding ids), `appliedCorrections`, `userConditionOverrides` (one entry per targeted `readIndex`, ordered by `readIndex` then sequence, derived from the layer only), `notApplied`, `assistantEvidence`, finding ids and unknown-region count.
    - Files owned: `src/vision/mapping/detectionRecord.ts`.
    - _Requirements: 10.5, 10.7, 10.11, 10.12, 10.13, 10.14, 19.5_

  - [ ] 10.2 Implement correction application
    - For each applied `set-cell-value` correction in sequence order, call the domain `userEdit` on the one-card Deck with `value` as a `Bit` through the polarity and `actionId` `"<actionId>#<readIndex>"`. `set-cell-condition` corrections produce no domain call. Never call `setInferred`. A domain rejection returns `DOMAIN_RULE_REJECTED` with `domainCode` and no partial Deck.
    - Files owned: `src/vision/mapping/applyCorrections.ts`.
    - _Requirements: 10.9, 10.13, 10.14, 10.16, 12.3_

  - [ ] 10.3 Implement `mapDetection`
    - Preconditions in order: status `aligned` or `aligned-with-warnings` (`RESULT_NOT_MAPPABLE`), profile id and schema version match (`PROFILE_MISMATCH`), `layer.resultId === result.resultId` (`DETECTION_RESULT_MISMATCH`). Build one `CellSeed` per readable position ordered by `readIndex` with `initial` passed explicitly: `observed` gives value and `holeLikelihood`, provenance `observed`; `ambiguous` gives `holeLikelihood` only, provenance `ambiguous`; `unknown` gives neither, provenance `ambiguous`. Always `restorationConfidence: null`. Evidence text is a deterministic template of at most 1,000 characters with bracketed ids `[patch: <id>] [findings: ...]` (Q4); `refs = [{ kind: "cell", cardId, readIndex }]`. Create the card with `createCard`, wrap it with `createDeck`, apply corrections, never produce `repeat-inferred` or `symmetry-inferred`, never produce a Cell for a reserved position, never call the detector. Do not add fields to the domain `Card`.
    - Files owned: `src/vision/mapping/observationMapper.ts`.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.10, 10.11, 10.12, 10.15_

  - [ ]* 10.4 Write property test for mapping without corrections
    - **Property 5: Mapping a Detection_Result without corrections is valid and faithful**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.10, 10.11, 10.12, 10.15, 22.8**
    - Seed `SEED_P5`, 300 runs, `arbDetectionResult`. Assert the exported Deck JSON shows the literal `null` for every `restorationConfidence` and the Deck passes the domain `validateDeck`.
    - Files owned: `src/vision/__tests__/mapper.props.test.ts`.

  - [ ]* 10.5 Write property test for correction application
    - **Property 21: Value corrections map through userEdit; condition corrections stay out of the domain Card**
    - **Validates: Requirements 10.9, 10.13, 10.14, 10.16, 12.3, 12.20**
    - Seed `SEED_P21`, 300 runs, `arbAppliedCorrections` including overlaps.
    - Files owned: `src/vision/__tests__/mapperCorrections.props.test.ts`.

  - [ ]* 10.6 Write property test for polarity at mapping time
    - **Property 22: Polarity is applied only when mapping**
    - **Validates: Requirements 8.11, 10.2**
    - Seed `SEED_P22`, 300 runs.
    - Files owned: `src/vision/__tests__/mapperPolarity.props.test.ts`.

  - [ ]* 10.7 Write mapper unit and example tests
    - Worked example per condition, `RESULT_NOT_MAPPABLE` per status, `PROFILE_MISMATCH`, `DETECTION_RESULT_MISMATCH`, a domain-rejection example (`DOMAIN_RULE_REJECTED` with `domainCode`), a `set-cell-condition` example showing the domain cell unchanged and an entry in `userConditionOverrides`, evidence text contains patch and finding ids.
    - Files owned: `src/vision/__tests__/mapper.test.ts`.
    - _Requirements: 10.2, 10.3, 10.4, 10.9, 10.13, 10.14, 10.16_

- [ ] 11. Detection_Result invariants, identity and serialization (Crew-delegable, Group B)
  - Depends on: tasks 3, 4, 6. Files owned: `src/vision/serialize/invariants.ts`, `resultId.ts`, `detectionResult.ts`, and the test files below.
  - [ ] 11.1 Implement the invariant checker
    - Checks: every probability, score and confidence finite in [0, 1]; exactly `readableCount` cells with distinct `readIndex` covering the range for `aligned*`; reserved record count; reserved record has no `readIndex`, `condition` or `holeProbability`; `unknown` cell has no probability or value; `observed` cell has a proposed value; `ambiguous` cell probability strictly between thresholds and no value; `failed` and `orientation-unresolved` have empty `cells` and a `failure` record; summary counts equal cell counts. Return the path of the first violation.
    - Files owned: `src/vision/serialize/invariants.ts`.
    - _Requirements: 6.3, 8.10, 11.1, 15.9_

  - [ ] 11.2 Implement `computeResultId`
    - `resultId` is `fnv1a64` of the canonical text without the `resultId` field. Used by assembly and by the importer.
    - Files owned: `src/vision/serialize/resultId.ts`.
    - _Requirements: 15.1, 15.7_

  - [ ] 11.3 Implement Detection_Result export and import
    - `exportDetectionResult` and `importDetectionResult` via the canonical writer. Import order: size above 16 MiB (`INPUT_TOO_LARGE`, before parsing, UTF-8 byte length), `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`, `INVALID_DETECTION_RESULT` (invariants, then recomputed `resultId` equality). No partial result. No pixel data in exports.
    - Files owned: `src/vision/serialize/detectionResult.ts`.
    - _Requirements: 15.5, 15.6, 15.7, 15.8, 15.9, 15.11_

  - [ ]* 11.4 Write property test for Detection_Result round trip
    - **Property 6: Detection_Result export and import round trip**
    - **Validates: Requirements 15.5, 15.6, 15.7, 22.9**
    - Seed `SEED_P6`, 200 runs, `arbDetectionResult` with any status, findings, regions, artifacts and assistant evidence.
    - Files owned: `src/vision/__tests__/detectionResultRoundTrip.props.test.ts`.

  - [ ]* 11.5 Write serialization unit tests
    - `INPUT_TOO_LARGE` at exactly 16 MiB (accepted) and plus one byte (rejected), truncated text gives `INVALID_JSON`, each of `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` path, one example per invariant, a wrong `resultId`, export contains no pixel data, generated results from `arbDetectionResult` satisfy the invariant checker.
    - Files owned: `src/vision/__tests__/detectionResultIO.test.ts`.
    - _Requirements: 15.8, 15.9, 15.11_

- [ ] 12. Worker protocol validation and Detection_Client (Crew-delegable, Group B)
  - Depends on: tasks 3, 4. Files owned: `src/vision/protocol/validate.ts`, `src/vision/client/detectionClient.ts`, and the test files below.
  - [ ] 12.1 Implement message validation
    - `validateClientMessage(unknown)`: total (never throws), `UNSUPPORTED_PROTOCOL_VERSION` naming supplied and supported versions (checked before type), `INVALID_MESSAGE` with the path of the first invalid field, a `run` message never accepts Cell_Corrections. Also a validator for worker messages used by the client.
    - Files owned: `src/vision/protocol/validate.ts`.
    - _Requirements: 13.2, 13.3, 13.7, 13.8_

  - [ ] 12.2 Implement the Detection_Client
    - `createDetectionClient(factory)`: posts `run` with `imageBytes` by structured clone (no transfer list, so the caller's buffer stays attached), progress callbacks, `cancel(runId)`, worker crash rejects the active run with `INTERNAL_ERROR` and recreates the worker on the next run. No image processing and no `new Worker` call (uses the injected `WorkerFactory`).
    - Files owned: `src/vision/client/detectionClient.ts`.
    - _Requirements: 13.1, 13.4, 13.9, 13.10, 20.3_

  - [ ]* 12.3 Write property test for the message validator
    - **Property 19: The message validator is total and precise**
    - **Validates: Requirements 13.2, 13.3, 13.7, 13.8**
    - Seed `SEED_P19`, 500 runs, `fc.anything()` plus mutated valid messages; also assert `structuredClone` of valid worker messages is deeply equal.
    - Files owned: `src/vision/__tests__/protocol.props.test.ts`.

  - [ ]* 12.4 Write client unit tests
    - With a fake worker: progress forwarded, cancel posted, caller's buffer not detached, crash gives `INTERNAL_ERROR` and the next run recreates the worker, `RUN_IN_PROGRESS` surfaced.
    - Files owned: `src/vision/__tests__/client.test.ts`.
    - _Requirements: 13.4, 13.9, 13.10, 13.11_

- [ ] 13. Vision-assistance validation (Crew-delegable, Group B)
  - Depends on: tasks 3, 6. Files owned: `src/vision/assistant/validate.ts`, and the test file below.
  - [ ] 13.1 Implement assistant validation and the default no-op
    - `validateAssistantOutput`: confidence finite in [0, 1], non-empty `modelId`, non-empty explanation, target in range; invalid proposals are discarded and an `ASSISTANT_OUTPUT_INVALID` diagnostic is returned. A thrown error or a missing assistant gives `ASSISTANT_UNAVAILABLE`. Add the model-generated label constant. The default is no assistant (`null`). A `usesNetwork: true` assistant without `networkOptIn` is skipped with `ASSISTANT_UNAVAILABLE`. Assistance never sets `condition`, `proposedValue` or `holeProbability`.
    - Files owned: `src/vision/assistant/validate.ts`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8_

  - [ ]* 13.2 Write assistant unit tests
    - Valid proposal kept with the label, each invalid case discarded with the diagnostic, throwing stub gives `ASSISTANT_UNAVAILABLE`, network assistant without opt-in skipped.
    - Files owned: `src/vision/__tests__/assistant.test.ts`.
    - _Requirements: 19.3, 19.6, 19.7, 19.8_

- [ ] 14. Evaluation metrics (Crew-delegable, Group B)
  - Depends on: tasks 3, 6. Files owned: `src/vision/evaluation/metrics.ts`, `compare.ts`, and the test file below.
  - [ ] 14.1 Implement the metric functions
    - Presence accuracy over `observed`, coverage per Condition, accuracy over all (ambiguous and unknown count as not correct), Brier score, expected calibration error with the bin count stated (10 equal-width), alignment success rate, corner error in pixels. Pure and exported for the benchmark spec.
    - Files owned: `src/vision/evaluation/metrics.ts`.
    - _Requirements: 21.1, 21.2_

  - [ ] 14.2 Implement `compareDetectionToTruth`
    - Requires equal profile id; derives truth hole presence from the truth Deck through the polarity; returns per-position truth, predicted, condition and probability plus the aggregates.
    - Files owned: `src/vision/evaluation/compare.ts`.
    - _Requirements: 20.4, 21.1_

  - [ ]* 14.3 Write metric unit tests
    - Hand-computed values for Brier, ECE with 10 bins and coverage, mismatched profile ids rejected.
    - Files owned: `src/vision/__tests__/metrics.test.ts`.
    - _Requirements: 21.1, 21.2_

- [ ] 15. Synthetic image generator and Damage_Level_File reader (Crew-delegable, Group B)
  - Depends on: tasks 3, 5, and the domain library. Does not depend on the benchmark spec being implemented. Files owned: `src/vision/__tests__/synthetic/*`, `src/vision/__tests__/generators/synthetic.ts`, `src/vision/__tests__/fixtures/damage-levels.fixture.json`, and the test file below. The real `data/synthetic/damage-levels.json` is owned by the benchmark spec and is never created or edited here.
  - [ ] 15.1 Implement the card renderer
    - `renderSyntheticCard(spec)`: paper-coloured card on a background, discs at truth hole positions via `readIndexToGrid`, hole polarity option, seeded PRNG (mulberry32 from `seed`), returns raster, true corners, truth Deck and applied orientation. No `Math.random`. Never imported by production code (Req 21.10).
    - Files owned: `src/vision/__tests__/synthetic/renderer.ts`.
    - _Requirements: 21.4, 21.10, 22.3_

  - [ ] 15.2 Implement the seeded degradations
    - Fixed order: illumination gradient, stain, cord, tear, occlusion of chosen windows, rotation and perspective, blur, noise. `DamageParameters` per the design.
    - Files owned: `src/vision/__tests__/synthetic/degradations.ts`.
    - _Requirements: 21.4, 22.7_

  - [ ] 15.3 Add the Damage_Level_File reader and validator, and a labelled test fixture copy
    - `loadDamageLevels(json, unknownCoverFrac)` in test support validates the benchmark-owned `data/synthetic/damage-levels.json` against exactly the benchmark requirement 7.3 field list: `format` `loom-lazarus-damage-levels`, integer `schemaVersion`, `damageLevelVersion`, `source`, file-level `occlusionCoverFraction` (per-Cell_Window fraction, in (0.5, 1], at least `unknownCoverFrac`, initial 0.9, `occlusionCoverFractionConfirmedBy` marker `initial-unconfirmed` until benchmark experiment E-2), and four levels `none`, `light`, `moderate`, `heavy` each with `cell` fields (`maskFraction`, `runLengthRange`, `stripWidthRange`, `stripCardRange`, `missingCardFraction`), `image` fields (`blurSigmaPx`, `noiseSigma`, `illuminationGradient`, `perspectiveDeg`, `rotationDeg`, `stainCoverage`, `cordCoverage`, `tearCoverage`, `occlusionCoverage`) and `confirmedBy`. No unknown field is accepted.
    - A missing, malformed, unknown-field, unsupported-`schemaVersion` or out-of-bound file returns `INVALID_PARAMETERS` naming the path of the first violation. There is no fallback to defaults and no placeholder file or placeholder marker anywhere. No new error code is added to the registry. The reader imports nothing from `src/benchmark`.
    - Add one small committed copy at `src/vision/__tests__/fixtures/damage-levels.fixture.json`, labelled in its own `source` text and in a sibling comment as a test fixture copy of the benchmark schema (not the benchmark file, not authoritative for any level definition). Tests that need levels use this fixture unless the benchmark file exists. No accuracy target and no level definition is fixed by detection.
    - Files owned: `src/vision/__tests__/synthetic/damageLevels.ts`, `src/vision/__tests__/fixtures/damage-levels.fixture.json`.
    - _Requirements: 21.4, 21.8, 22.7_

  - [ ] 15.4 Add the synthetic image generators
    - `generators/synthetic.ts`: `arbSyntheticCard` (Garín or `arbSmallProfile`, long side 1,024 px, rotation within 15 degrees, damage from `arbDamageLevel`), `arbUnalignable` (blank, noise, background only, card cut by the border, card under 20% of the image), `arbOcclusion` (seeded window set, solid colour), `arbAssistantOutput`.
    - Files owned: `src/vision/__tests__/generators/synthetic.ts`.
    - _Requirements: 11.6, 22.2, 22.7_

  - [ ]* 15.5 Write generator unit tests
    - Same seed gives an identical raster, truth hole positions match `readIndexToGrid`, true corners lie inside the image, `loadDamageLevels` accepts the fixture and returns `INVALID_PARAMETERS` with the first path for each of: malformed JSON, unknown field, unsupported `schemaVersion`, `occlusionCoverFraction` outside (0.5, 1] or below `unknownCoverFrac`, missing level, a level field that decreases from `none` to `heavy`, and `occlusionCoverage` of 1 or more. No test expects a fallback.
    - Files owned: `src/vision/__tests__/synthetic.test.ts`.
    - _Requirements: 21.4, 22.3_

- [ ] 16. Documentation of contracts and assumptions (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `docs/vision-errors.md`, `docs/vision-parameters.md`, `docs/vision-methods.md`, `docs/vision-assumptions.md`, `src/vision/__tests__/docsErrorsSync.test.ts`, `src/vision/__tests__/docsParamsSync.test.ts`. No code files are edited.
  - [ ] 16.1 Write the error list and the registry sync test
    - `docs/vision-errors.md` lists every code in `VISION_ERROR_CODES` with its message and meaning. The sync test fails when the registry and the document differ. This test is required.
    - _Requirements: 16.2, 16.4_

  - [ ] 16.2 Write the parameters document and the sync test
    - `docs/vision-parameters.md` reproduces the design's defaults and ranges table and marks the unverified rows. The sync test fails when the document and `DEFAULT_PARAMETERS` differ. This test is required.
    - _Requirements: 3.10, 7.4, 8.7_

  - [ ] 16.3 Write the methods document
    - `docs/vision-methods.md`: each preprocessing step, geometry, grid and classification method, each Quality_Finding kind's method and known failure modes, the statement that kinds other than perspective-distortion, blur and low-contrast are heuristics measured only by the evaluations, and that hole probability is an uncalibrated score.
    - _Requirements: 3.4, 3.5, 7.6, 9.9_

  - [ ] 16.4 Write the assumptions document
    - `docs/vision-assumptions.md`: table of D1 to D10 and P1 with working value, basis, where code depends on it, the paper page or figure still to be recorded, and the correction path (profile data or recorded parameters). State that none is verified. Add a licensing note: the Garín5 dataset licence (D10) is unchecked, no dataset images are committed or redistributed, bundled samples are synthetic or separately licensed, and any real photograph used for evaluation needs its source and licence in a `data` README before it is added. Include the closed design questions and their approved answers.
    - _Requirements: 6.4, 18.5, 21.7_

- [ ] 17. Preprocessing (Crew-delegable, Group C)
  - Depends on: tasks 3, 5, 7. Files owned: `src/vision/preprocess/resize.ts`, `illumination.ts`, `denoise.ts`, `perspective.ts`, and the test files below.
  - [ ] 17.1 Implement resize and alpha flattening
    - `resizeToWorking` (area average, never upscales, records the scale factor) and `flattenAlpha` onto white (`c' = c*a/255 + 255*(1 - a/255)`, reports whether any alpha was below 255).
    - Files owned: `src/vision/preprocess/resize.ts`.
    - _Requirements: 1.9, 3.3_

  - [ ] 17.2 Implement illumination correction
    - Border background mask (median of the one-pixel border, foreground by Otsu on `|gray - b|`), `normalizedBlur` background estimate weighted by the foreground, division with clamping. Records method, sigma and `mean(bg)`. Disable flag honoured.
    - Files owned: `src/vision/preprocess/illumination.ts`.
    - _Requirements: 3.2, 3.4_

  - [ ] 17.3 Implement noise reduction
    - 3x3 or 5x5 median blur; disable flag honoured; records method and kernel.
    - Files owned: `src/vision/preprocess/denoise.ts`.
    - _Requirements: 3.2, 3.5_

  - [ ] 17.4 Implement perspective correction and step reports
    - `rectify(quad, ...)` using `homographyFromQuad` and `warpPerspective`; records the matrix, the source quad and the output size. Each step returns a `PreprocessingStepReport` with name, parameters, input and output sizes, and mean and standard deviation of output intensity.
    - Files owned: `src/vision/preprocess/perspective.ts`.
    - _Requirements: 3.1, 3.6, 3.7, 3.9_

  - [ ]* 17.5 Write property test for resize and alpha flatten
    - **Property 29: Resize and alpha flatten behave as specified**
    - **Validates: Requirements 1.9, 3.3**
    - Seed `SEED_P29`, 300 runs, `arbRaster` sizes around limits, random alpha.
    - Files owned: `src/vision/__tests__/resizeAlpha.props.test.ts`.

  - [ ]* 17.6 Write preprocessing unit tests
    - Disabled steps leave data unchanged and are reported as disabled, report statistics match a hand-computed case, determinism (two runs equal), the Original raster is not mutated.
    - Files owned: `src/vision/__tests__/preprocess.test.ts`.
    - _Requirements: 3.2, 3.7, 3.8, 3.9_

- [ ] 18. Card and end-hole geometry (Crew-delegable, Group C)
  - Depends on: tasks 3, 5, 7, 15. Files owned: `src/vision/geometry/cardQuad.ts`, `endHoles.ts`, `orientation.ts`, `holeContrast.ts`, and the test file below.
  - [ ] 18.1 Implement card quadrilateral detection
    - Both background polarities, close then open morphology, components at least 5% of the image, hull, Douglas-Peucker with `simplifyToFour`, scoring with deterministic tie-breaks, clockwise corner order, corner confidence, `MULTIPLE_CARDS_SUSPECTED` with candidate polygons, the strip or crop heuristic, area and corner-confidence checks giving a failed geometry outcome, and honouring a user-supplied `set-corners` quad (marked `user-supplied`).
    - Files owned: `src/vision/geometry/cardQuad.ts`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.9, 11.4_

  - [ ] 18.2 Implement end-hole detection
    - Search two bands near the short ends using profile geometry when declared, else the recorded `unverified` parameters; report `found` (centre, radius, score, features) or `not-found` with a reason; never invent a position; a missing end hole adds a `Quality_Finding` of kind `other`; `requireEndHoles` makes it a failure. Honour user `set-reference-holes` end-hole references.
    - Files owned: `src/vision/geometry/endHoles.ts`.
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ] 18.3 Implement orientation resolution
    - Aspect gate, evidence only from profile-declared asymmetry, margin rule, user-supplied orientation recorded, `orientation-unresolved` with candidates, scores and one preview artifact per candidate, exact 90-degree rotation, never mirror, every rotation recorded.
    - Files owned: `src/vision/geometry/orientation.ts`.
    - _Requirements: 4.5, 4.6, 4.7, 4.8_

  - [ ] 18.4 Implement hole-contrast polarity detection
    - Automatic heuristic from border median against card median, parameter override, recorded in `geometry.holeContrast`. Distinct from the weaving `HolePolarityAssumption`.
    - Files owned: `src/vision/geometry/holeContrast.ts`.
    - _Requirements: 4.2, 7.4_

  - [ ]* 18.5 Write geometry unit and example tests
    - Known-corner synthetic images (corner error recorded, no accuracy target asserted), end holes found and not-found, orientation unresolved without declared asymmetry and resolved with a user-supplied value, multiple cards, strip heuristic, card below 20% of the image, user corners honoured.
    - Files owned: `src/vision/__tests__/geometry.test.ts`.
    - _Requirements: 2.2, 2.3, 4.1, 4.4, 4.6, 4.7, 11.4_

- [ ] 19. Grid fit and cell windows (Crew-delegable, Group C)
  - Depends on: tasks 3, 5, 7, 15, and the domain library. Files owned: `src/vision/grid/latticeFit.ts`, `cellWindows.ts`, and the test files below.
  - [ ] 19.1 Implement the lattice fit
    - Uniform initial lattice from the profile, candidate holes by Otsu and components, nearest-node assignment, Huber IRLS refinement, grid-fit score and residual, `supportFraction`, thresholds giving `failed`, `aligned-with-warnings` or `aligned`, and no best-guess grid when failed. Reserved nodes excluded from support unless `reservedAsAlignmentFeature`. User grid-position reference holes enter as high-weight inliers.
    - Files owned: `src/vision/grid/latticeFit.ts`.
    - _Requirements: 5.1, 5.3, 5.5, 5.6, 5.9, 6.5, 12.7_

  - [ ] 19.2 Implement cell windows and reserved records
    - `buildCellWindows`: one window per grid position (rectified rectangle plus Image_Coordinates polygon through the inverse homography and rotation), `readIndex` only through the domain `gridToReadIndex`, reserved positions routed to `ReservedRecord` with the profile verification status, basis and note copied and no `readIndex`, `condition` or probability.
    - Files owned: `src/vision/grid/cellWindows.ts`.
    - _Requirements: 5.2, 5.4, 5.7, 5.8, 6.1, 6.2, 6.3, 6.4, 6.6, 6.7_

  - [ ]* 19.3 Write property test for window tiling
    - **Property 26: Cell windows tile the fitted lattice**
    - **Validates: Requirements 5.2, 5.3, 5.8**
    - Seed `SEED_P26`, 500 runs.
    - Files owned: `src/vision/__tests__/cellWindows.props.test.ts`.

  - [ ]* 19.4 Write grid unit tests
    - Reserved positions excluded from support, score below the fail threshold gives `failed`, warning band gives `aligned-with-warnings`, a profile with a different grid size and reserved list works with no code change, two reference holes fix the pitch.
    - Files owned: `src/vision/__tests__/grid.test.ts`.
    - _Requirements: 5.5, 5.6, 5.7, 6.5, 6.7_

- [ ] 20. Hole classification (Crew-delegable, Group C)
  - Depends on: tasks 3, 7. Files owned: `src/vision/classify/features.ts`, `probability.ts`, `condition.ts`, and the test files below.
  - [ ] 20.1 Implement per-cell features and readability
    - Inner disc and ring statistics, contrast, hole fraction, largest component area ratio, roundness, centroid offset, per-card hole threshold with the recorded fallback, `Patch_Reference` statistics, readability score `q`.
    - Files owned: `src/vision/classify/features.ts`.
    - _Requirements: 7.1, 7.2, 8.1_

  - [ ] 20.2 Implement the probability mapping
    - Bounded sub-scores, weighted sum, logistic mapping. Non-finite intermediates yield no number. Documented as monotone and uncalibrated; the result carries `holeProbabilityNote` and `calibration: "uncalibrated"`.
    - Files owned: `src/vision/classify/probability.ts`.
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.11_

  - [ ] 20.3 Implement condition assignment and diagnostics
    - Order: outside image, low readability, non-finite, hole threshold, no-hole threshold, else ambiguous. Missing, occluded or unreadable evidence is never `hole-absent`; a final guard asserts every `hole-absent` cell has readability at or above the threshold. Build `CellDiagnostics` (deciding step, feature values, thresholds, explanation of at most 1,000 characters).
    - Files owned: `src/vision/classify/condition.ts`.
    - _Requirements: 7.3, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 20.4 Write property test for probability monotonicity
    - **Property 20: Hole probability is monotone in its evidence**
    - **Validates: Requirements 7.5, 7.6, 7.11**
    - Seed `SEED_P20`, 500 runs, `arbFeatureVector` bounded to realistic ranges plus non-finite injection; define the generator in this file.
    - Files owned: `src/vision/__tests__/probability.props.test.ts`.

  - [ ]* 20.5 Write classification unit tests
    - Threshold mapping at both boundaries, non-finite gives `unknown` with no number, outside-image and low readability give `unknown`, explanation length cap, the `hole-absent` guard.
    - Files owned: `src/vision/__tests__/classify.test.ts`.
    - _Requirements: 7.11, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 21. Quality diagnostics and unknown regions (Crew-delegable, Group C)
  - Depends on: tasks 3, 7, 15. Files owned: `src/vision/quality/*`, and the test file below.
  - [ ] 21.1 Implement the computed measurements
    - `blur.ts` (Laplacian variance per 64 px tile against the card median), `lowContrast.ts` (p95 minus p5 spread), `perspective.ts` (edge-ratio and angle deviation from the homography, values recorded).
    - Files owned: `src/vision/quality/blur.ts`, `lowContrast.ts`, `perspective.ts`.
    - _Requirements: 3.11, 9.1, 9.2, 9.4_

  - [ ] 21.2 Implement glare and shadow detection
    - `glare.ts` (saturated low-chroma components) and `shadow.ts` (low-frequency dark regions with little chroma change).
    - Files owned: `src/vision/quality/glare.ts`, `shadow.ts`.
    - _Requirements: 9.1, 9.2_

  - [ ] 21.3 Implement the colour-difference mask, stains and cords
    - `colourMask.ts` (CIELAB `deltaE` from the median card colour, hole-sized discs removed), `stain.ts` (soft edges, not elongated), `cord.ts` (oriented line kernels at 0, 45, 90 and 135 degrees, components crossing at least two cells).
    - Files owned: `src/vision/quality/colourMask.ts`, `stain.ts`, `cord.ts`.
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ] 21.4 Implement patch and tear detection
    - `patch.ts` (sharp, straight-edged large components) and `tear.ts` (background-like pixels inside the quad touching the card edge, not hole-shaped).
    - Files owned: `src/vision/quality/patch.ts`, `tear.ts`.
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ] 21.5 Implement unknown regions and the quality report
    - `unknownRegions.ts` (polygon, reason from the fixed list, affected `readIndex` values by the cover fraction), `report.ts` (deterministic finding ids `q-<kind>-<n>` ordered by kind then position, severity from the recorded thresholds, `heuristic` statement, `notEvaluated` entries with reasons, overlap lists for cells), `methodDocs.ts` (method name and failure-mode constants matching `docs/vision-methods.md`). No repair or inpainting.
    - Files owned: `src/vision/quality/unknownRegions.ts`, `report.ts`, `methodDocs.ts`.
    - _Requirements: 9.2, 9.3, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [ ]* 21.6 Write quality unit tests
    - One test per kind on a seeded synthetic image with that damage (presence, score in [0, 1], polygon, affected indices); no recall or precision target asserted; `not-evaluated` reported with a reason; severity thresholds; finding ids stable; hole-sized discs are not reported as damage.
    - Files owned: `src/vision/__tests__/quality.test.ts`.
    - _Requirements: 9.1, 9.2, 9.3, 9.10_

- [ ] 22. Checkpoint - Groups A to C merged
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Pipeline integration (single worker, not split; blocks Group E)
  - Depends on: task 22. Files owned: `src/vision/pipeline/*`, `src/vision/index.ts` is not edited (surface must be unchanged), and the test files below.
  - [ ] 23.1 Implement the pipeline context and stage cache
    - `context.ts` runtime pieces and `stageCache.ts`: content keys `fnv1a64(canonical{stage, stageParameters, upstreamKeys, profileFields, correctionFields, implementation})`, one image digest at a time, bounded to 160 MiB with oldest-first eviction, cleared on a new digest.
    - Files owned: `src/vision/pipeline/context.ts`, `src/vision/pipeline/stageCache.ts`.
    - _Requirements: 12.13, 12.14_

  - [ ] 23.2 Implement artifacts and failure diagnostics
    - `artifacts.ts`: `ArtifactDescriptor` with `artifactId`, content digest, `Artifact_Provenance` (step, parameters, Implementation_Stamp, original and input digests); regeneration is deterministic. `failureDiagnostics.ts`: build `FailureDiagnostics` (stage, code, values, thresholds, suggested actions from the fixed list, annotated artifacts, orientation candidates).
    - Files owned: `src/vision/pipeline/artifacts.ts`, `src/vision/pipeline/failureDiagnostics.ts`.
    - _Requirements: 3.9, 11.2, 11.3, 14.2, 14.3, 14.5, 14.6_

  - [ ] 23.3 Implement the front stages
    - `stages/intakeStage.ts` (checks, decode, EXIF, alpha flatten, digest), `stages/preprocessStage.ts`, `stages/geometryStage.ts` (card, end holes, orientation, rectified rasters). Failures produce a failed or unresolved result with diagnostics, not a thrown error. The Original_Image bytes are never written to.
    - Files owned: `src/vision/pipeline/stages/intakeStage.ts`, `preprocessStage.ts`, `geometryStage.ts`.
    - _Requirements: 1.10, 1.11, 3.1, 4.9, 11.1, 14.1_

  - [ ] 23.4 Implement the back stages
    - `stages/gridStage.ts`, `stages/classifyStage.ts` (checkpoints every `checkpointEveryRows` rows), `stages/qualityStage.ts`.
    - Files owned: `src/vision/pipeline/stages/gridStage.ts`, `classifyStage.ts`, `qualityStage.ts`.
    - _Requirements: 5.5, 7.1, 8.1, 9.1, 13.6_

  - [ ] 23.5 Implement assembly
    - `assemble.ts`: demote cells covered by blocking unknown regions to `unknown` (never creates `observed` or `hole-absent`), attach finding ids, attach the grid-fit score under warnings, condition summary, reserved records, polarity assumption, `unverifiedParameterPaths`, user-supplied markers, verification markers copied from the profile, assistant section (separate from cells), `calibration: "uncalibrated"`, rounding per `ROUNDING`, `resultId` via `computeResultId`.
    - Files owned: `src/vision/pipeline/assemble.ts`.
    - _Requirements: 6.4, 7.7, 8.5, 8.10, 8.11, 15.3, 15.10, 19.3, 19.9_

  - [ ] 23.6 Implement `detect` and `createDetector`
    - `detect(imageBytes, profile, parameters, geometryCorrections?, env?)` and `createDetector(env).run(input)`: parameter validation first, stage order, progress events (start and end per stage, non-decreasing fractions), cancellation checkpoints through `PipelineHooks`, restart-from stage with cache reuse only of stages before the restart stage, marking `user-supplied` outputs, returning a new Detection_Result on every run and never editing an earlier one, mapping unexpected exceptions to `INTERNAL_ERROR`, no partial result on error, `BACKEND_LOAD_FAILED` when no decoder is available. Also write the `stages.ts` barrel with the ordered `STAGES` list. Remove the temporary stubs for the pipeline files.
    - Files owned: `src/vision/pipeline/detect.ts`, `src/vision/pipeline/stages.ts`.
    - _Requirements: 3.10, 8.9, 12.13, 12.14, 12.15, 13.5, 13.6, 13.9, 13.10, 14.1, 15.1, 15.2, 20.4_

  - [ ]* 23.7 Write property test for determinism and artifacts
    - **Property 1: Detection is deterministic and reproduces its artifacts**
    - **Validates: Requirements 3.8, 3.9, 7.9, 9.8, 14.2, 14.3, 14.5, 14.6, 15.1, 15.2, 15.3, 15.11, 22.4**
    - Seed `SEED_P1`, 40 runs, `arbSyntheticCard`.
    - Files owned: `src/vision/__tests__/pipelineDeterminism.props.test.ts`.

  - [ ]* 23.8 Write property test for result bounds and explainability
    - **Property 2: Result bounds, condition rules and explainability**
    - **Validates: Requirements 6.3, 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.10, 22.5**
    - Seed `SEED_P2`, 40 runs; filter to status `aligned*` with the filter stated and rejected-case count logged.
    - Files owned: `src/vision/__tests__/pipelineBounds.props.test.ts`.

  - [ ]* 23.9 Write property test for grid and reserved positions
    - **Property 3: Grid and reserved positions follow the profile**
    - **Validates: Requirements 5.1, 5.4, 5.7, 6.1, 6.2, 6.3, 6.4, 6.7, 22.6**
    - Seed `SEED_P3`, 40 runs, `arbSmallProfile` with `arbReservedList`, damage `none` or `light`; includes the mapped Card cell count.
    - Files owned: `src/vision/__tests__/pipelineReserved.props.test.ts`.

  - [ ]* 23.10 Write property test for occluded evidence
    - **Property 4: Occluded evidence is never reported as an absent hole**
    - **Validates: Requirements 8.5, 8.6, 22.7**
    - Seed `SEED_P4`, 40 runs, `arbOcclusion`. Each covered window is covered at or above the per-Cell_Window `occlusionCoverFraction` read through `loadDamageLevels` from `data/synthetic/damage-levels.json` when it exists, otherwise from the labelled test fixture copy. The number of covered windows per card is capped by the chosen level's `occlusionCoverage`. The output states which source was used and the `initial-unconfirmed` marker when present. The property reads the fraction and does not fix it.
    - Files owned: `src/vision/__tests__/pipelineOcclusion.props.test.ts`.

  - [ ]* 23.11 Write property test for geometry-correction re-detection
    - **Property 11: A geometry correction re-detects from the original and keeps everything else**
    - **Validates: Requirements 12.13, 12.15, 12.16, 12.24, 12.25, 22.12, 22.19**
    - Seed `SEED_P11`, 30 runs, corners near the true corners, 0 to 3 existing cell corrections.
    - Files owned: `src/vision/__tests__/pipelineGeometryCorrection.props.test.ts`.

  - [ ]* 23.12 Write property test for staged recompute
    - **Property 12: Staged recompute equals a full run**
    - **Validates: Requirements 12.13, 12.14, 12.24**
    - Seed `SEED_P12`, 30 runs, warm cache from a prior run; assert stages before the restart stage are served from the cache and the restart stage and later stages are recomputed.
    - Files owned: `src/vision/__tests__/pipelineStaged.props.test.ts`.

  - [ ]* 23.13 Write property test for input immutability
    - **Property 17: Inputs are never mutated and errors return no partial value**
    - **Validates: Requirements 1.5, 1.11, 14.1, 16.3**
    - Seed `SEED_P17`, 40 runs, 400 px images, truncations, corruptions, over-limit headers.
    - Files owned: `src/vision/__tests__/pipelineImmutability.props.test.ts`.

  - [ ]* 23.14 Write property test for progress
    - **Property 18: Progress is monotone and brackets every stage**
    - **Validates: Requirements 13.5**
    - Seed `SEED_P18`, 30 runs, including failing images.
    - Files owned: `src/vision/__tests__/pipelineProgress.props.test.ts`.

  - [ ]* 23.15 Write property test for unalignable images
    - **Property 23: Unalignable images give failed or unresolved results without cells**
    - **Validates: Requirements 4.6, 4.9, 5.5, 11.1, 11.2, 11.7**
    - Seed `SEED_P23`, 40 runs, `arbUnalignable` plus unresolved-orientation cases.
    - Files owned: `src/vision/__tests__/pipelineUnalignable.props.test.ts`.

  - [ ]* 23.16 Write property test for quality findings
    - **Property 24: Quality findings and unknown regions are well formed**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5, 9.7, 9.10, 8.5**
    - Seed `SEED_P24`, 40 runs, seeded stain, cord, tear, patch and glare.
    - Files owned: `src/vision/__tests__/pipelineQuality.props.test.ts`.

  - [ ]* 23.17 Write property test for assistance as separate evidence
    - **Property 25: Assistance enters only as separate evidence**
    - **Validates: Requirements 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.9**
    - Seed `SEED_P25`, 30 runs, `arbAssistantOutput` (valid, invalid, throwing stub); includes the mapper producing the same Card with and without assistant evidence.
    - Files owned: `src/vision/__tests__/pipelineAssistant.props.test.ts`.

  - [ ]* 23.18 Write pipeline unit and example tests
    - Polarity default `hole-is-lifted` recorded with status `unverified`, `unverifiedParameterPaths` populated, `calibration: "uncalibrated"` and `holeProbabilityNote` present, no restoration-confidence field in a result, implementation stamp present on result and artifacts, a Garín-profile end-to-end run on a synthetic image with a user-supplied orientation, `BACKEND_LOAD_FAILED` when no decoder is supplied.
    - Files owned: `src/vision/__tests__/pipeline.test.ts`.
    - _Requirements: 7.7, 7.8, 8.11, 14.6, 15.10, 17.1_

- [ ] 24. Checkpoint - Pipeline merged
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 25. Worker adapter (Crew-delegable, Group E)
  - Depends on: tasks 12, 23. Files owned: `src/workers/detectionAdapter.ts`, `src/workers/detection.worker.ts`, and the test file below.
  - [ ] 25.1 Implement the adapter core
    - `detectionAdapter.ts`: a pure message handler taking an injected pipeline and port. Validates messages, holds `activeRunId`, `RUN_IN_PROGRESS` for a second run, cancel flag read at checkpoints (cancel for an unknown or finished run is ignored), `CANCELLED` and no result, progress forwarding, unexpected exception gives `INTERNAL_ERROR` and the next run still works, copies `imageBytes` (never transfers the caller's buffer), transfers artifact buffers only when requested, lazy backend load on the first `run` with `BACKEND_LOAD_FAILED` recovery, releases allocations in a `finally`. Imports only `src/vision` and `src/domain` indexes.
    - Files owned: `src/workers/detectionAdapter.ts`.
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10, 13.11, 14.7, 17.2, 17.5, 17.8_

  - [ ] 25.2 Implement the worker entry point
    - `detection.worker.ts`: `onmessage` wiring to the adapter, macrotask `yieldToEventLoop`, posts `ready` at startup, loads the backend only on the first `run`. No network call, no `Date`, no unseeded randomness.
    - Files owned: `src/workers/detection.worker.ts`.
    - _Requirements: 13.1, 13.12, 13.13, 17.2, 17.3_

  - [ ]* 25.3 Write worker protocol tests
    - With the adapter, an injected pipeline and a fake port pair: unsupported `protocolVersion`, unknown `type`, malformed `run` with first invalid path, `run` during an active run, cancel for the active run, cancel for an unknown run, progress monotonicity, unexpected exception then a good run, caller's buffer not detached, artifact buffers transferred only on request, backend load failure then a good run, `liveAllocations()` after 20 runs equals the count before.
    - Files owned: `src/workers/__tests__/detectionAdapter.test.ts`.
    - _Requirements: 13.4, 13.5, 13.6, 13.7, 13.8, 13.10, 13.11, 17.5, 17.8, 22.15_

- [ ] 26. Cross-cutting integration, corpus and golden tests (Crew-delegable, Group E)
  - Depends on: tasks 9, 10, 11, 23. Files owned: the test and fixture files below.
  - [ ]* 26.1 Write property test for truncated and corrupted text
    - **Property 8: Truncated and corrupted text never yields a partial value**
    - **Validates: Requirements 12.28, 15.8, 15.9, 22.10**
    - Seed `SEED_P8`, 300 runs over valid Detection_Result and Correction_Log texts, cut points, `arbTextCorruption` tagged with expected codes, seeded byte corruption.
    - Files owned: `src/vision/__tests__/corruption.props.test.ts`.

  - [ ]* 26.2 Write property test for cell-level operations
    - **Property 10: Cell-level operations never touch the pipeline or the result**
    - **Validates: Requirements 8.9, 12.11, 12.12, 12.21, 22.18, 22.22**
    - Seed `SEED_P10`, 200 runs, injected spies on `detect`, the backend and the decoder; assert earlier results unchanged and the raw observation of every corrected cell in the mapped Card equals the uncorrected one.
    - Files owned: `src/vision/__tests__/cellOpsNoDetect.props.test.ts`.

  - [ ]* 26.3 Write property test for review resolutions
    - **Property 14: Review resolutions behave as specified**
    - **Validates: Requirements 12.19, 12.21, 12.29, 22.21**
    - Seed `SEED_P14`, 200 runs; for a confirmed `set-cell-value` the mapped Card has a `user-edited` cell with history; for `set-cell-condition` the Card is unchanged and the override is `applied: true`.
    - Files owned: `src/vision/__tests__/reviewResolution.props.test.ts`.

  - [ ]* 26.4 Write the failure corpus and example tests
    - At least five synthetic images that cannot be aligned (card rotated out of frame, extreme perspective, no card visible, card cut by the border, blank), each asserting status `failed` and the failing stage; plus multi-card, strip heuristic, missing end hole and unresolved orientation.
    - Files owned: `src/vision/__tests__/failureCorpus.test.ts`.
    - _Requirements: 11.4, 11.5, 11.6, 22.13_

  - [ ] 26.5 Build the golden fixture and update script
    - Fixed profile `golden-6x3` (6 rows, 3 columns, 1 reserved) and a fixed synthetic image (seed `SEED_GOLDEN`, 512 px long side, damage `light` from the labelled test fixture copy of the Damage_Level_File, orientation user-supplied). The script `scripts/vision-golden-update.ts` regenerates the golden files and is run only on purpose.
    - Files owned: `src/vision/__tests__/goldens/fixture.ts`, `scripts/vision-golden-update.ts`.
    - _Requirements: 22.16_

  - [ ] 26.6 Commit goldens and write the comparison tests
    - Committed goldens in `src/vision/__tests__/goldens/`: `detection-result.golden.json`, `preprocessing-report.golden.json`, `card-detection-record.golden.json`, `deck.golden.json` (one value correction and one condition correction), `correction-log.golden.json`. Tests assert byte equality, that every cell in `deck.golden.json` shows the literal `null` for `restorationConfidence`, that the value-corrected cell is `user-edited` with one `user-edit` history entry, and that the condition-corrected cell is unchanged in the Deck and appears only in `userConditionOverrides`. A golden change needs a stated reason in the commit message.
    - Files owned: `src/vision/__tests__/goldens/*.golden.json`, `src/vision/__tests__/golden.test.ts`.
    - _Requirements: 10.7, 10.13, 22.16_

  - [ ]* 26.7 Write the error-code coverage test
    - Trigger every code in `VISION_ERROR_CODES` through the public API at least once and fail when a registered code is never triggered.
    - Files owned: `src/vision/__tests__/errorCodes.test.ts`.
    - _Requirements: 16.1, 16.5_

- [ ] 27. Evaluation wrapper scripts delegating to the benchmark runner (Crew-delegable, Group E)
  - Depends on: tasks 14, 23. Soft dependency on the benchmark spec: the `runBenchmark` / `runDetectionTrack` entries of the `src/benchmark` index (and its Dataset_Manifest and role gate) may not exist when this task runs. Until they exist, each wrapper is a stub that parses its arguments and exits non-zero with the clear message "benchmark runner not available: implement the benchmark-and-evaluation spec first" (a script message, not a new Vision_Error_Code). The stubs keep every other detection task unblocked. When the benchmark index exports the runner, the stub body is replaced by the delegation described below without changing the script's arguments.
  - Files owned: `scripts/vision-eval-synthetic.ts`, `scripts/vision-eval-real.ts`, `scripts/vision-tune.ts`, and the test file below. `docs/vision-eval-synthetic.md` and `docs/vision-eval-real.md` are generated output written by the wrappers from a returned benchmark report once the runner exists; no worker hand-writes them and no number is placed in them before a recorded run.
  - Conventions for these scripts: they are thin (argument parsing, one call into the `src/benchmark` public index, one file write). They compute no metric, import no module from `src/vision/evaluation` for reported numbers, and import `src/benchmark` only through its index. No `src` folder imports `scripts`.
  - [ ] 27.1 Implement the synthetic evaluation wrapper
    - Parse `--profile quick|full` and an output path. Call `runBenchmark` (detection track only) from the `src/benchmark` index and write `docs/vision-eval-synthetic.md` from the returned Benchmark_Report: per damage level and per Split_Role from the Dataset_Manifest, each row stating benchmark version (Dataset_Version), seed, Split_Role, sample size and Implementation_Stamp, any `initial-unconfirmed` marker carried by the Damage_Level_File, and the statement that synthetic accuracy does not predict real-photo performance.
    - Never request the `test` role (the benchmark role gate refuses it unless the Threshold_Register is frozen and the caller opts in; this wrapper never passes that option).
    - Until the runner exists, the stub behaviour from the task header applies.
    - Files owned: `scripts/vision-eval-synthetic.ts`.
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.9, 21.11, 21.12_

  - [ ] 27.2 Implement the real-image evaluation wrapper
    - Parse a photograph-folder path. Call `runDetectionTrack` on the Real_Photograph_Track inputs from the `src/benchmark` index and write `docs/vision-eval-real.md` from the returned section: sample size, the statement that it is small and qualitative, no accuracy claim beyond the sample, and the list of observed failures. The folder licence and README check is done by the benchmark track (`REAL_DATA_NOT_LICENSED`), and the wrapper reports its result without a second check or a second metric. Shares no table, average or summary line with the synthetic output.
    - Until the runner exists, the stub behaviour from the task header applies.
    - Files owned: `scripts/vision-eval-real.ts`.
    - _Requirements: 21.3, 21.6, 21.7, 21.11_

  - [ ] 27.3 Implement the tuning wrapper
    - Parse a Dataset_Manifest path and a requested role. The only permitted role is `tuning`. A request for `held-out` or `test` (or `calibration`) is refused by a script-local check before any file is read, with the message `SPLIT_ROLE_FORBIDDEN` naming the requester and the role, so the refusal works even while the benchmark runner is a stub. When the benchmark index exports its role gate, delegate to it for the same decision.
    - Read only `tuning`-role Items of the manifest, tune the `DetectionParameters` constants on them, and export the result as versioned JSON with a description of the data used (manifest Dataset_Version, seed, role, sample size). Code defaults change only by loading that JSON. The old seed-block convention (`1..N`, `100000..`) is not used.
    - Until the benchmark Dataset_Manifest reader exists, everything after the role check is the stub behaviour from the task header.
    - Files owned: `scripts/vision-tune.ts`.
    - _Requirements: 8.8, 21.3, 21.11_

  - [ ]* 27.4 Write harness tests
    - The tuning wrapper refuses `held-out`, `test` and `calibration` before reading any file and accepts `tuning`; with the benchmark runner absent each wrapper exits non-zero with the stated message and writes no report; a static check that none of the three scripts computes a metric or imports `src/vision/evaluation` and that they import `src/benchmark` only through its index; when a stub benchmark runner is injected, the synthetic wrapper's output rows carry Dataset_Version, seed, Split_Role, sample size and Implementation_Stamp, and the synthetic and real outputs are separate files that share no table.
    - Files owned: `src/vision/__tests__/evalHarness.test.ts`.
    - _Requirements: 8.8, 21.2, 21.3, 21.7, 21.11, 21.12_

- [ ] 28. Bundled sample and browser tests (Crew-delegable, Group E)
  - Depends on: tasks 15, 23, 25. Files owned: `scripts/vision-make-sample.ts`, `data/samples/*`, `playwright.config.ts`, `src/vision/__tests__/browser/*`, and the test file below.
  - [ ] 28.1 Generate the bundled sample
    - `scripts/vision-make-sample.ts` renders a synthetic Garín-profile card photograph and writes `data/samples/card-synthetic-sample.png` plus `sample.meta.json` with the recorded, user-supplied orientation (Q5) and the parameters used. `data/samples/README.md` states that the sample is synthetic, MIT licensed, contains no real photograph and that the Garín5 dataset has not been redistributed.
    - Files owned: `scripts/vision-make-sample.ts`, `data/samples/card-synthetic-sample.png`, `data/samples/sample.meta.json`, `data/samples/README.md`.
    - _Requirements: 18.5, 21.7_

  - [ ] 28.2 Add the minimal browser test harness
    - A bare page under `src/vision/__tests__/browser/` that creates the worker through `createDetectionClient`, loads the bundled sample and exposes run, cancel and result hooks to Playwright. Configure `playwright.config.ts` for headless Chromium with a Vite server for the harness. This is a test fixture, not product UI.
    - Files owned: `playwright.config.ts`, `src/vision/__tests__/browser/*`.
    - _Requirements: 13.14, 18.3_

  - [ ]* 28.3 Write the Playwright tests
    - Privacy: all non-same-origin requests blocked, the run completes, no request body carries image data, offline variant after assets load. Lazy load: no backend request before the first run, same-origin only. Main thread: longest task during a run under the design budget, `PerformanceObserver` `longtask` entries and a `requestAnimationFrame` gap sampler, reporting the longest task and the count of tasks of 50 ms or more. Cancellation: `cancel` posted at 20 seeded delays, min, median, p95 and max latency to `CANCELLED` reported against the 250 ms budget.
    - Files owned: `src/vision/__tests__/browser/vision.browser.spec.ts`.
    - _Requirements: 13.6, 13.14, 17.2, 17.3, 17.9, 18.1, 18.2, 18.3_

- [ ] 29. Performance and cross-environment measurement scripts (Crew-delegable, Group E)
  - Depends on: tasks 23, 28.1. Files owned: `scripts/vision-measure.ts`, `scripts/vision-compare-envs.ts`, `docs/vision-measurements.md`, and the test file below.
  - [ ] 29.1 Implement the measurement script
    - Runs the bundled sample and a synthetic set 20 times, records run time, asset size and load time, hardware and browser versions and commit, and writes `docs/vision-measurements.md`. `--env <label>` writes a result bundle (Detection_Results over the evaluation set) for cross-environment comparison. Reports numbers against the design budget table and never claims a budget as met unless measured.
    - Files owned: `scripts/vision-measure.ts`, `docs/vision-measurements.md`.
    - _Requirements: 17.6, 17.7, 15.4_

  - [ ] 29.2 Implement the cross-environment comparison
    - `vision-compare-envs.ts` compares two bundles: maximum `|dHoleProbability|`, `Condition` change fraction, `alignment.status` equality, maximum corner difference in pixels; reports against the design tolerance and names failures.
    - Files owned: `scripts/vision-compare-envs.ts`.
    - _Requirements: 15.4_

  - [ ]* 29.3 Write comparison unit tests
    - Hand-made bundles: identical bundles give zero differences, a seeded difference is reported with its position, a status difference is reported as a failure.
    - Files owned: `src/vision/__tests__/compareEnvs.test.ts`.
    - _Requirements: 15.4_

- [ ] 30. OpenCV.js spike (optional, measurement-driven, Group E)
  - Depends on: tasks 23, 28.1. Files owned: `scripts/vision-spike.ts`, `docs/vision-backend-spike.md`, and, only if approved, `src/vision/backend/opencvBackend.ts`, `public/vendor/*`, and the test file below. Q1 stays open until the spike is read: add OpenCV.js only if a measured gain justifies it and the user approves the stack change.
  - [ ]* 30.1 Implement the spike script
    - Runs the typed-array backend and, if a pinned OpenCV.js build is available, an OpenCV.js build on the same synthetic images and any licensed real photographs. Records asset size, load time, run time, peak memory and Detection_Result differences in `docs/vision-backend-spike.md` and states a recommendation.
    - _Requirements: 17.1, 17.6, 17.7_

  - [ ]* 30.2 Implement the OpenCV.js backend (only if the spike and the user approve)
    - `opencvBackend.ts` implementing `ImageBackend`; lazy load in the worker on the first `run` from a same-origin static asset with a pinned version recorded in the Implementation_Stamp; every `Mat` created through a `BackendScope`; `dispose()` in a `finally`; a failed load returns `BACKEND_LOAD_FAILED`.
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.8_

  - [ ]* 30.3 Write backend equivalence and allocation tests
    - The same synthetic set through both backends with differences reported against the tolerance; `liveAllocations()` after 20 runs equals the count before.
    - Files owned: `src/vision/__tests__/backendEquivalence.test.ts`.
    - _Requirements: 17.1, 17.8_

- [ ] 31. Final guards and end-to-end integration
  - [ ] 31.1 Write the final repository guards
    - `src/vision/__tests__/guards.test.ts`: no file imports `_stub.ts` (then delete `_stub.ts`); the surface snapshot is unchanged since the freeze; no production file imports from `__tests__`; the docs sync tests exist; every constant that the design states verbatim (the polarity default `hole-is-lifted`, the holeProbability note, the model-generated assistant label, the heuristic statement) is present; `docs/vision-assumptions.md` lists D1 to D10 and P1; no file in the repository refers to `damage-levels.placeholder.json` or the marker `PLACEHOLDER, not benchmark-defined`; no file under `src/vision` imports `src/benchmark`. This test is required.
    - Files owned: `src/vision/__tests__/guards.test.ts`.
    - _Requirements: 7.7, 9.2, 16.4, 19.3, 20.1, 20.5, 20.7, 21.4_

  - [ ]* 31.2 Write the end-to-end integration test
    - `src/vision/__tests__/integration.test.ts`: bundled sample with its recorded orientation, detect, map into the domain, record a geometry correction (corners), re-detect from the original, reconcile, confirm one `needs-review` correction and discard another, apply a value correction (domain `user-edited` with history) and a condition correction (override list only), export and import the Detection_Result and the Correction_Log, and assert the results agree with the recorded states and that every mapped cell has `restorationConfidence: null`.
    - Files owned: `src/vision/__tests__/integration.test.ts`.
    - _Requirements: 10.7, 10.13, 12.13, 12.16, 12.19, 15.7, 12.27_

- [ ] 32. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Required items include the import-boundary test (1.3), the surface snapshot (2.11), the docs sync tests (16.1, 16.2), the goldens (26.5, 26.6) and the final guards (31.1), because they enforce stated requirements.
- Crew delegation summary (all tasks below start after the interface freeze, task 3, and edit no frozen file):

| Task | Group | Depends on | Files owned (disjoint) |
|------|-------|------------|------------------------|
| 4 | A | 3 | `hash.ts`, `canonical.ts` |
| 5 | A | 3 | `coords.ts` (bodies), `params/validate.ts`, `generators/params.ts` |
| 6 | A | 3, 1.2 | `__tests__/support/*`, `generators/profile.ts`, `generators/result.ts` |
| 7 | B | 3, 5 | `backend/raster.ts`, `backend/ops/*`, `backend/typedArrayBackend.ts` |
| 8 | B | 3, 5, 6.1 | `intake/*` |
| 9 | B | 3, 4, 5, 6 | `corrections/{log,validate,fold,restartStage,reconcile,layer,serialize}.ts`, `generators/corrections.ts` |
| 10 | B | 3, 6, domain | `mapping/{detectionRecord,applyCorrections,observationMapper}.ts` |
| 11 | B | 3, 4, 6 | `serialize/*` |
| 12 | B | 3, 4 | `protocol/validate.ts`, `client/detectionClient.ts` |
| 13 | B | 3, 6 | `assistant/validate.ts` |
| 14 | B | 3, 6 | `evaluation/*` |
| 15 | B | 3, 5, domain | `__tests__/synthetic/*`, `generators/synthetic.ts`, `__tests__/fixtures/damage-levels.fixture.json` (never `data/synthetic/*`, which the benchmark spec owns) |
| 16 | B | 3 | `docs/vision-{errors,parameters,methods,assumptions}.md`, two sync tests |
| 17 | C | 3, 5, 7 | `preprocess/*` |
| 18 | C | 3, 5, 7, 15 | `geometry/*` |
| 19 | C | 3, 5, 7, 15, domain | `grid/*` |
| 20 | C | 3, 7 | `classify/*` |
| 21 | C | 3, 7, 15 | `quality/*` |
| 23 | D (single worker) | 22 | `pipeline/*` |
| 25 | E | 12, 23 | `src/workers/*` |
| 26 | E | 9, 10, 11, 23 | goldens, corpus, cross-cutting property tests, `scripts/vision-golden-update.ts` |
| 27 | E | 14, 23 (soft: benchmark runner, stub until available) | `scripts/vision-eval-synthetic.ts`, `scripts/vision-eval-real.ts`, `scripts/vision-tune.ts`, `__tests__/evalHarness.test.ts` |
| 28 | E | 15, 23, 25 | sample script and data, `playwright.config.ts`, browser harness and spec |
| 29 | E | 23, 28.1 | `scripts/vision-measure.ts`, `scripts/vision-compare-envs.ts`, measurements doc |
| 30 | E (optional) | 23, 28.1 | `scripts/vision-spike.ts`, spike doc, optional OpenCV.js backend |

- Each Crew task owns its tests and edits no file owned by another task. Shared generator files are split by owner so no two workers touch one file. `package.json` is edited only in task 1.2, which pre-registers every script name.
- If a Crew worker finds that a frozen signature must change, it stops and reports so the spec can be updated.
- Benchmark ownership: `data/synthetic/damage-levels.json` (damage levels, the per-Cell_Window Occlusion_Cover_Fraction with initial value 0.9 marked `initial-unconfirmed` until benchmark experiment E-2, and the per-level `occlusionCoverage`) belongs to the benchmark spec. Detection reads it as data through `loadDamageLevels` (task 15.3), never creates or edits it, never imports `src/benchmark` from `src/vision`, and has no placeholder file or fallback. Task 23.10 reads the fraction from this reader and fixes no value.
- Official detection numbers come from the benchmark runner. The three scripts of task 27 are thin wrappers that stay stubs with a clear error until the benchmark runner exists, so no detection task blocks on the benchmark spec. The Deck_Family Split_Roles supersede the old seed blocks for official reports, and `scripts/vision-tune.ts` reads only the `tuning` role.
- `detect`, `compareDetectionToTruth` and `evaluation/metrics.ts` (task 14) remain the single source of the shared detection metrics, and the benchmark runner must match them.
- Property tasks reference the property numbers in `design.md`. Properties 1 to 4, 11, 12, 17, 18, 23, 24 and 25 run at the pipeline level (task 23). Properties 8, 10 and 14 span the correction service, mapper and serializers and sit in task 26.
- The design's budgets (cancellation latency, main-thread blocking, backend size and load time, run time, cross-environment tolerance) are initial values. Tasks 28 and 29 implement the tests and scripts that report them against measured numbers. No budget is claimed met before a recorded run.
- Restoration confidence is `null` for every detected cell. Only the restoration spec assigns a number, through `setInferred`. UI code must show `null` as "not evaluated", never as 0%.
- The Garín format items (D1 to D10) are unverified. The licence of the Garín5 dataset is unchecked, no dataset images are committed, and any real photograph needs a `data` README with source and licence before use.
- To start executing, open this file and click "Start task" next to a task item.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5"] },
    { "id": 6, "tasks": ["2.6", "2.7"] },
    { "id": 7, "tasks": ["2.8"] },
    { "id": 8, "tasks": ["2.9"] },
    { "id": 9, "tasks": ["2.10"] },
    { "id": 10, "tasks": ["2.11"] },
    { "id": 11, "tasks": ["3"] },
    { "id": 12, "tasks": ["4.1", "4.2", "5.1", "5.2", "6.1", "6.2"] },
    { "id": 13, "tasks": ["4.3", "5.3", "5.4", "5.5", "7.1", "7.2", "7.3", "8.1", "8.2", "8.3", "8.4", "9.1", "9.2", "9.4", "10.1", "10.2", "11.1", "11.2", "12.1", "12.2", "13.1", "14.1", "14.2", "15.2", "15.3", "16.1", "16.2", "16.3", "16.4"] },
    { "id": 14, "tasks": ["7.4", "8.5", "8.6", "9.3", "9.5", "10.3", "11.3", "12.3", "12.4", "13.2", "14.3", "15.1"] },
    { "id": 15, "tasks": ["7.5", "7.6", "9.6", "9.7", "9.8", "9.9", "9.10", "10.4", "10.5", "10.6", "10.7", "11.4", "11.5", "15.4", "17.1", "17.2", "17.3", "17.4", "18.1", "18.2", "18.3", "18.4", "19.1", "19.2", "20.1", "20.2", "20.3", "21.1", "21.2", "21.3"] },
    { "id": 16, "tasks": ["15.5", "17.5", "17.6", "18.5", "19.3", "19.4", "20.4", "20.5", "21.4", "21.5"] },
    { "id": 17, "tasks": ["21.6"] },
    { "id": 18, "tasks": ["22"] },
    { "id": 19, "tasks": ["23.1", "23.2"] },
    { "id": 20, "tasks": ["23.3", "23.4"] },
    { "id": 21, "tasks": ["23.5"] },
    { "id": 22, "tasks": ["23.6"] },
    { "id": 23, "tasks": ["23.7", "23.8", "23.9", "23.10", "23.11", "23.12", "23.13", "23.14", "23.15", "23.16", "23.17", "23.18"] },
    { "id": 24, "tasks": ["24"] },
    { "id": 25, "tasks": ["25.1", "26.1", "26.2", "26.3", "26.4", "26.5", "26.7", "27.1", "27.2", "27.3", "28.1", "30.1"] },
    { "id": 26, "tasks": ["25.2", "26.6", "27.4", "29.1", "29.2", "30.2"] },
    { "id": 27, "tasks": ["25.3", "28.2", "29.3", "30.3"] },
    { "id": 28, "tasks": ["28.3", "31.2"] },
    { "id": 29, "tasks": ["31.1"] },
    { "id": 30, "tasks": ["32"] }
  ]
}
```

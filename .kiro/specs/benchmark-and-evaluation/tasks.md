# Implementation Plan: Benchmark and Evaluation

## Overview

This plan implements the Benchmark_Suite in `src/benchmark`, with thin TypeScript CLI entry points in `scripts/`, as strict TypeScript with Vitest and fast-check, following `design.md`. It is spec 4 of 5 (1 domain, 2 detection, 3 restoration, 4 benchmark, 5 UI). No UI work is planned here. The UI spec consumes the Browser_Report and the browser-safe Report_Reader.

Upstream dependency and stub policy:
- The benchmark tasks depend on the `card-domain-and-loom-engine`, `card-detection` and `restoration-engine` libraries (their public indexes). Tasks that only need types, pure data and the benchmark's own logic (groups A and B) do not need the other libraries to be complete, only their frozen public indexes.
- Tasks that call `deriveDamagedDeck`, `detect`, `mapDetection`, `runInference`, `validateCalibrationRecord`, `compareDetectionToTruth` or the shared detection metric functions use the real exports when they exist. When an upstream export does not exist yet, the task codes against a structural port type declared in `src/benchmark/upstream/ports.ts` (task 2.8) and tests against a test double in `src/benchmark/__tests__/support/fakeUpstream.ts`. Tests that need the real upstream library (the renderer conformance test, the within-card partner conformance test, the shared-metric equality test P14, the calibration-record validation call) are marked in their sub-tasks and are skipped with a clearly named `it.skip` reason ("upstream library not available") until the real export exists. No test is deleted because an upstream library is missing.
- `src/benchmark` imports `src/domain`, `src/vision` and `src/restore` only through their public indexes, with one documented exception (design Q1, option a): the within-card partner conformance test (task 7.5) imports restoration's internal `symmetry.ts`. That exception is recorded in the boundary test's own allow-list (task 1.3) and applies to that one test file only.
- Detection's `scripts/vision-eval-synthetic.ts`, `vision-eval-real.ts` and `vision-tune.ts` already exist as stubs (detection task 27, amended). Task 24.3 replaces their stub bodies by delegation once `runBenchmark` / `runDetectionTrack` exist. If detection task 27 has not landed, task 24.3 stops and reports instead of creating those files.

The plan is ordered so that interfaces come first:
- **Tasks 1 and 2:** repository preparation (including a verification that the `structure.md` `scripts` entry has ALREADY landed, with no edit) and all interface definitions: error registry and `BenchmarkResult`, seeding and canonical-JSON types, `MetricValue`, profile, family, damage, mask, item, manifest and split types, evaluation, baseline, threshold, study, report and runner types, upstream port types, signature stubs and the public index.
- **Task 3: INTERFACE FREEZE.** After it, exported signatures change only through a spec update (Req 27.5).
- **Groups A and B (tasks 4 to 19, 25, 26.5):** Crew-delegable components with disjoint files, their own tests, only frozen interfaces, no shared mutable state.
- **Group C (tasks 18 and 19):** dataset construction that uses groups A and B.
- **Group D (tasks 21 and 22):** tracks and the runner. One worker each, not split.
- **Group E (tasks 23, 24, 26, 27):** experiments, CLI scripts, cross-cutting property tests, goldens and final guards.

Resolved decisions reflected here:
- Baselines are exactly B1 deck-majority, B2 column-majority and B3 nearest-neighbour. B0 abstain-all is a test fixture only. It is never exported from `index.ts`, never in `BASELINES`, never in a paired comparison and never in a report.
- Occlusion_Cover_Fraction is a per-Cell_Window fraction (initial 0.9, bounds (0.5, 1], at least detection's `unknownCoverFrac`, `initial-unconfirmed` until E-2). It is distinct from the per-level `occlusionCoverage` (Occlusion_Extent), a cap on the fraction of a card's readable Cell_Windows that the occlusion model may damage (zero at `none`, below 1, non-decreasing). Neither fixes an acceptance threshold.
- Q1 (a): the conformance test imports restoration's internal `symmetry.ts`. Q2 (a): the `scripts` entry already landed in `structure.md`, so task 1.1 only verifies it. Q3 (a): detection's `vision-eval-*` scripts delegate to the runner. Q4: reference hardware is the developer machine plus the CI Chromium/Node runner, with its specification recorded beside every measured number.
- A0-1: `package.json` and all configuration files are created by the integrator at milestone M0, with every `bench:*` script pre-registered. No benchmark task edits them (task 1.2 only verifies the scripts exist).
- A0-4: benchmark data is synthetic, so every restoration call uses `deckOrigin: "synthetic"` and never `"real"`. Each card that has an image carries a `CardImageProvenance` entry in its Item's `imageProvenance` in the Dataset_Manifest (generator, generatorVersion, sourceId, seed, parametersDigest, imageDigest, with digests written `"sha-256:<lowercase hex>"`), and `adapters/syntheticAttestations.ts` builds restoration's per-card `syntheticAttestations` from it with `buildSyntheticAttestations(manifest, itemId)` and checks it against detection's `imageDigestText` with `checkAttestationsAgainstDetection`. The declaration is the benchmark's, not proof, and restoration never constructs it.
- A0-7: committed Browser_Reports are written to `data/benchmark/browser/`, and `data/benchmark/browser/index.json` is the index.
- Sibling amendments already made: detection reads `data/synthetic/damage-levels.json` (benchmark-owned, validated against the requirement 7.3 field list), and restoration's tune script accepts only the `tuning` and `calibration` roles.
- Four split roles: `tuning`, `calibration`, `held-out`, sealed `test`.
- This spec fixes no accuracy, coverage, calibration or improvement threshold. The Threshold_Register starts with every entry `not set`. Experiments E-1 to E-7 record results and never assert a threshold.

Out of scope (other specs): React UI and report rendering (spec 5), detector and restoration algorithms, physical loom control, training of learned models, any network service.

Conventions for every task:
- Inside `src/benchmark`, files that produce a dataset, a manifest or a report must not use `document`, `window`, `fetch`, `XMLHttpRequest`, `Date`, `Math.random`, `performance.now`, `setTimeout` or `setInterval`. The one exception is `runner/runtimeFile.ts`, which writes only the runtime file excluded from every digest (Req 9.9, 27.4). Test files are exempt from the identifier scan but still use no `Math.random`, `Date.now` or network (Req 28.3).
- Each property test is a single `fc.assert(fc.property(...), { seed, numRuns })`. Seeds come from `src/benchmark/__tests__/seeds.ts` (`SEED_P1` to `SEED_P25`, value `20260700 + n`, and `SEED_GOLDEN = 20260790`). `numRuns` is at most 200 for image-based properties and at most 500 for data-only properties, as set in the design's seed register. Each test has a tag comment `// Feature: benchmark-and-evaluation, Property N: <title>` and an adjacent precondition and seed comment (Req 28.1, 28.2). Failure output prints the seed and the shrunk counterexample (`verbose: 1`).
- Every shrunk counterexample becomes a permanent example in `src/benchmark/__tests__/regressions.test.ts` (task 26.5, Req 28.17).
- No function returns a partial result. Expected failures return `BenchmarkResult` errors and leave inputs unchanged (Req 25.3).
- Report types carry no timestamp, absolute path, personal data or pixel data (Req 20.8).
- Code that depends on an unverified assumption carries `// UNVERIFIED <id>: see .kiro/steering/jacquard-card-format.md`.
- Honesty rules: every number comes from a recorded run, synthetic results are labelled as results about the generator, and no document quotes a number absent from a recorded run (Req 1.5, 18.4).
- A worker edits only the files its task owns. Frozen files change only through a spec update. A worker that finds a frozen signature must change stops and reports.
- Run tests with `vitest --run`, never watch mode.
- Generated datasets go only under `data/generated` (not committed). Committed manifests, the Threshold_Register, experiments and fixtures live under `data/benchmark`. The Damage_Level_File lives at `data/synthetic/damage-levels.json`.

## Tasks

- [ ] 1. Repository preparation and scaffold
  - [ ] 1.1 Verify the `scripts` entry in `structure.md` and the upstream libraries (no edit)
    - Read `.kiro/steering/structure.md` and confirm it already lists the `scripts` folder (thin TypeScript CLI entry points, no `src` folder imports `scripts`, generated data only under `data/generated`, committed manifests and reports under `data/benchmark`). Do not edit the file. If the entry is missing, stop and report, because steering changes need approval (Q2 (a)).
    - Check which of the domain, detection and restoration public indexes exist and which of the exports named in the Overview stub policy are missing. Record the result as a short list in `docs/benchmark-assumptions.md` (created by task 25.5) so later tasks know which upstream tests run for real and which stay `it.skip`.
    - Note: `data/benchmark` and `data/generated` are sub-folders of the existing `data` folder. No new top-level folder is created.
    - Files owned: none (read-only verification).
    - _Requirements: 23.6, 27.2_

  - [ ] 1.2 Scaffold `src/benchmark`, seeds, helpers and npm scripts
    - Create the `src/benchmark` skeleton from the design's module layout (placeholder `index.ts`, `__tests__/`, `__tests__/support/`, `__tests__/golden/`, `upstream/`).
    - Create `src/benchmark/__tests__/seeds.ts` with `SEED_P1` to `SEED_P25` (`20260700 + n`) and `SEED_GOLDEN = 20260790`. Create `src/benchmark/__tests__/helpers.ts` reusing or mirroring the domain `deepFreeze` and `cloneBefore` helpers.
    - Do not edit `package.json` or any configuration file (A0-1). The integrator creates `package.json` and all configs at milestone M0 with every script pre-registered: `bench:dataset:quick`, `bench:dataset:full`, `bench:run:quick`, `bench:run:full`, `bench:tuning:export`, `bench:threshold:freeze`, `bench:browser-report`, `bench:experiment`, `bench:golden:update`. This task verifies that `package.json` exists and that each of these nine scripts is present, and reuses the existing TypeScript, Vitest and fast-check configuration. If `package.json` or any script is missing, or a config change is needed, stop and request the change from the integrator. Never add or edit it here.
    - Files owned: `src/benchmark/__tests__/seeds.ts`, `src/benchmark/__tests__/helpers.ts`, folder skeleton. (`package.json` is owned by the integrator.)
    - _Requirements: 23.6, 28.1_

  - [ ] 1.3 Write the import-boundary test
    - Create `src/benchmark/__tests__/boundary.test.ts` using the TypeScript compiler API over every `.ts` file in `src/benchmark`, `src/domain`, `src/vision`, `src/restore` and `src/workers`.
    - Fail if a file in `src/benchmark` imports `src/ui`, `src/vision/__tests__`, or a non-index module of `src/domain`, `src/vision` or `src/restore`. The only allow-list entry is `src/benchmark/__tests__/withinCardPartnerConformance.test.ts` importing restoration's `symmetry.ts` (Q1 (a)), recorded in the test itself with its reason.
    - Fail if a file in `src/domain`, `src/vision`, `src/restore` or `src/workers` imports from `src/benchmark`. Fail if a file in the Report_Reader path (`report/browserReport.ts` and its static-import closure) imports a Node-only module from an explicit disallowed list (`fs`, `path`, `os`, `child_process`, `node:*`).
    - Fail on the forbidden identifiers in Conventions in any `src/benchmark` file outside `__tests__` that contributes to a dataset or a report, with `runner/runtimeFile.ts` excepted.
    - Fail if a System_Input directory description in the dataset layout names a ground-truth file, and if a module in the evaluation-input construction path imports a module that reads a Ground_Truth_Artifact (computed from the static import graph and compared with an explicit list of `evaluation/*` modules allowed to do so).
    - Add a negative self-test that feeds an in-memory violating source and expects failure.
    - Files owned: `src/benchmark/__tests__/boundary.test.ts`.
    - _Requirements: 8.7, 20.7, 27.2, 27.3, 27.4_

- [ ] 2. Interface definitions
  - [ ] 2.1 Define `BenchmarkResult`, `BenchmarkError`, the error registry and limits
    - Create `result.ts`: `BenchmarkResult<T, E>`, `BenchmarkError` (code, message, path, optional `domainCode`), `BENCHMARK_ERROR_CODES` tuple with exactly the 27 codes of Req 25.1, derived `BenchmarkErrorCode`, `BENCHMARK_ERROR_MESSAGES` with one stable message per code, `ok`/`err` helpers, and a helper that wraps a domain error (code and path copied). Do not extend the domain, detection or restoration error unions.
    - Create `limits.ts`: `BENCHMARK_LIMITS` (report import maximum 16 MiB, manifest import maximum, study result maximum, `BROWSER_REPORT_MAX_BYTES` 2 MiB with permitted range 64 KiB to 8 MiB, bootstrap defaults, bin counts, failure examples per category 20) and the fixed honesty statement constants (synthetic-results disclaimer, calibration-on-synthetic disclaimer, real-photograph "small and qualitative" statement, "virtual loom is an educational simulation").
    - Files owned: `src/benchmark/result.ts`, `src/benchmark/limits.ts`.
    - _Requirements: 1.5, 11.6, 15.9, 22.2, 25.1, 25.2, 25.3, 26.8_

  - [ ] 2.2 Define seeding, canonical JSON, digest and `MetricValue` types
    - `seed.ts` types only: `RandomFn` (matching the domain shape), `makeRng`, `deriveSeed` signatures. `canonicalJson.ts` types: writer options, key-table registry type, digest record `{algorithm, hex}`. `evaluation/metricValue.ts` types: `MetricValue` (`defined` with value, numerator, denominator, cell, item and family counts and optional interval; `undefined` with reason and counts), `BootstrapInterval`, `BootstrapNotEstimated`.
    - Files owned: `src/benchmark/seed.ts` (types), `src/benchmark/canonicalJson.ts` (types), `src/benchmark/evaluation/metricValue.ts` (types).
    - _Requirements: 9.2, 9.3, 9.5, 9.6, 12.2, 12.4, 12.5_

  - [ ] 2.3 Define family, profile, damage and mask types
    - `families/patternFamilies.ts` types (`PatternFamilyKind`, `PatternFamilyParameters`, `FamilyKey`, `StructureLabel`, `StructureLabels`, `StructuralPriorKind` re-exported by name from the restoration port), `families/labelCheck.ts` types, `render/rendererTypes.ts` (`RenderParameters`, `RenderedCardImage`, `ImagePointLike`), `damage/damageLevelFile.ts` types (`CellDamageLevelParameters`, `ImageDamageLevelParameters`, `DamageLevelName`, `DamageLevelDefinition`, `DamageLevelFile` with both `occlusionCoverFraction` and per-level `occlusionCoverage`), `damage/damageMask.ts` (`DamageMaskEntry`, `CellDamageMask`, `ImageDamageMaskEntry`), `CellDamageModelKind`, `ImageDamageModelKind`, `IMAGE_DAMAGE_ORDER`.
    - Add a compile-time test (`// @ts-expect-error`) that `occlusionCoverFraction` is not accepted where a per-level `occlusionCoverage` is expected.
    - Files owned: `src/benchmark/families/patternFamilies.ts` (types), `families/labelCheck.ts` (types), `render/rendererTypes.ts`, `damage/damageLevelFile.ts` (types), `damage/damageMask.ts`, `src/benchmark/__tests__/damageTypes.test.ts`.
    - _Requirements: 2.1, 2.7, 4.1, 5.1, 6.1, 6.3, 7.1, 7.3, 7.5, 7.12_

  - [ ] 2.4 Define item, manifest and split types
    - `dataset/manifest.ts` types (`DatasetManifest`, `FamilyManifestEntry`, `ItemManifestEntry`). For every Item with a rendered card image, `ItemManifestEntry` carries `imageProvenance?: readonly CardImageProvenance[]` (A0-4), one `CardImageProvenance` per rendered damaged card image with fields `cardId`, `generator`, `generatorVersion`, `sourceId` (`${datasetVersion}/${itemId}`), `seed` (integer), `parametersDigest` and `imageDigest`. Both digests are strings in the form `"sha-256:<lowercase hex>"`, the Image_Digest text form detection exposes as `imageDigestText`, and the manifest's own artifact digest list keeps its separate `{algorithm, hex}` record. Items with no image (restoration track) omit `imageProvenance`. Use the design's exact declarations (design.md, `ItemManifestEntry` and `CardImageProvenance`). `dataset/splitAssignment.ts` types (`SplitRole`, `SplitAssignmentConfig`, `Stratum`), `dataset/familyBuilder.ts` types, `dataset/datasetBuilder.ts` types (`DatasetConfig`), and `Item`, `SystemInputRef`, `GroundTruthRef` (disjoint types sharing only the neutral `itemId`).
    - Add a compile-time test that a `GroundTruthRef` is not assignable where a `SystemInputRef` is expected, and that neither carries `familyKey`, `splitRole` or a damage level on the `SystemInputRef` side.
    - Files owned: `src/benchmark/dataset/manifest.ts` (types), `dataset/splitAssignment.ts` (types), `dataset/familyBuilder.ts` (types), `dataset/datasetBuilder.ts` (types), `src/benchmark/__tests__/itemTypes.test.ts`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.4, 10.1_

  - [ ] 2.5 Define evaluation, baseline and policy types
    - `evaluation/evaluationGroup.ts` (`EvaluationGroup`, `EvaluationGroupName`), `evaluation/bootstrap.ts` types (`BootstrapConfig`), `evaluation/detectionMetrics.ts` types (`DetectionCellOutcome`), `evaluation/restorationMetrics.ts` types, `evaluation/calibrationMetrics.ts` types (`ReliabilityBin`, `ReliabilityData`), `evaluation/baselines.ts` types (`BaselineResult`, `BASELINES` shape of exactly B1, B2, B3), `evaluation/evaluationPolicy.ts` types (`RestorationRunContext`, which keeps `deckOrigin: "synthetic"` as its only value and records `syntheticAttestations: ReadonlyMap<string, unknown>` keyed by `cardId`, as in the design). The attestation functions are declared in `adapters/syntheticAttestations.ts` (task 2.9 stub, task 18.6 body), not here.
    - Files owned: `src/benchmark/evaluation/evaluationGroup.ts`, and the type sections of the other `evaluation/*` files listed above.
    - _Requirements: 12.10, 13.1, 14.1, 15.4, 16.1, 17.1_

  - [ ] 2.6 Define threshold, experiment, user-study and real-photograph types
    - `threshold/thresholdRegister.ts` types (`ThresholdEntry`, `ThresholdRegister`, `ThresholdStatus`), `threshold/preliminaryExperiment.ts` types (`PreliminaryExperimentId` E-1 to E-7, `PreliminaryExperimentRecord`), `userStudy/protocol.ts` and `studyResult.ts` types (`UserComparisonProtocol`, `StudyResultFile`, `UserComparisonSection`), `tracks/realPhotographTrack.ts` types (`PhotographFolderManifest`, `RealPhotographTrackResult`, `MIN_LABELLED_CELLS_FOR_RATE`).
    - Files owned: `src/benchmark/threshold/thresholdRegister.ts` (types), `threshold/preliminaryExperiment.ts` (types), `userStudy/protocol.ts` (types), `userStudy/studyResult.ts` (types), `tracks/realPhotographTrack.ts` (types).
    - _Requirements: 11.4, 11.5, 18.1, 18.3, 19.1, 19.7_

  - [ ] 2.7 Define report types
    - `report/benchmarkReport.ts` types (`ComponentStamp`, `BenchmarkReport`, `TrackSection`, `FailureExample`), `report/browserReport.ts` types (`BrowserReport`, `BrowserReportIndexEntry` with fields `id`, `profileId`, `datasetVersion`, `executionProfile`, `reportDigest` and `trackStatuses`, as in the design), `report/tables.ts` and `report/failureExamples.ts` signature types. No timestamp, path, personal-data or pixel field in any report type.
    - Files owned: `src/benchmark/report/benchmarkReport.ts` (types), `report/browserReport.ts` (types), `report/tables.ts` (types), `report/failureExamples.ts` (types).
    - _Requirements: 20.1, 20.2, 20.8, 21.5, 22.1_

  - [ ] 2.8 Define runner, execution-profile, version and upstream port types
    - `runner/executionProfile.ts` types (`ExecutionProfileBounds`, `EXECUTION_PROFILE_BOUNDS` shape), `runner/benchmarkRunner.ts` types (`BenchmarkRunConfig`), `runner/runtimeFile.ts` types, version types (`SUPPORTED_COMPONENT_MAJOR_VERSIONS`, `checkComponentVersions` signature), `tracks/*` function signature types.
    - `upstream/ports.ts`: structural port types for the upstream functions the benchmark calls (`deriveDamagedDeck`, `compareCells`, `detect`, `mapDetection`, `runInference`, `validateCalibrationRecord`, `compareDetectionToTruth`, the shared detection metric functions), declared structurally so that real upstream exports satisfy them with no cast. Add `__tests__/support/fakeUpstream.ts` declaring test doubles for each port.
    - Files owned: `src/benchmark/runner/executionProfile.ts` (types), `runner/benchmarkRunner.ts` (types), `runner/runtimeFile.ts` (types), `tracks/detectionTrack.ts`, `restorationTrack.ts`, `endToEndTrack.ts` (types), `src/benchmark/upstream/ports.ts`, `src/benchmark/__tests__/support/fakeUpstream.ts`.
    - _Requirements: 1.1, 1.2, 1.3, 23.1, 24.1, 24.3_

  - [ ] 2.9 Declare signature stubs for every remaining module
    - In each file below, export the final function signatures from the design with TSDoc listing the `BenchmarkError` codes. Bodies call a temporary `notImplemented()` helper in `src/benchmark/_stub.ts`.
    - Files: `seed.ts`, `canonicalJson.ts`, `families/{deckBuilders,labelCheck,withinCardPartner}.ts`, `render/cardRenderer.ts`, `damage/{damageLevelFile,cellDamageModels,imageDamageModels}.ts`, `dataset/{manifest,familyBuilder,splitAssignment,datasetBuilder,leakageGuard}.ts`, `evaluation/*`, `tracks/*`, `runner/*`, `threshold/*`, `report/*`, `userStudy/*`, `adapters/{restorationTuneExport,calibrationExport,damageLevelForDetection,syntheticAttestations}.ts` (the last with the design signatures `buildSyntheticAttestations(manifest: DatasetManifest, itemId: string)` and `checkAttestationsAgainstDetection(attestations, detectedDigestTextByCard)`).
    - Stubs carry the final contracts: `buildProposalView` and the baselines take only damaged data, `evaluation/*` loads Ground_Truth_Artifacts only inside comparison functions, `B0` is declared only under `__tests__`.
    - `_stub.ts` is temporary. Task 27.1 asserts that nothing imports it and deletes it.
    - _Requirements: 8.4, 8.5, 16.5, 27.1_

  - [ ] 2.10 Create the public index and interface version
    - Create `src/benchmark/index.ts` as the single export surface re-exporting every type, function and constant named in the design, plus `BENCHMARK_INTERFACE_VERSION = "1.0.0"`, `BENCHMARK_ERROR_CODES`, `BENCHMARK_ERROR_MESSAGES`, the honesty statement constants, the Report_Reader and `BrowserReport` types. Do not export `B0` or anything from `__tests__`.
    - Files owned: `src/benchmark/index.ts`.
    - _Requirements: 16.9, 24.1, 27.1, 27.5_

  - [ ] 2.11 Add the exported-surface snapshot test
    - Create `src/benchmark/__tests__/surface.test.ts` comparing the sorted exports of `index.ts` with a committed `surface.snapshot.json`, plus assertions that `BENCHMARK_INTERFACE_VERSION` exists and that `BASELINES` has exactly the ids `B1`, `B2`, `B3`. Any later snapshot change requires a spec update. This test is required.
    - Files owned: `src/benchmark/__tests__/surface.test.ts`, `src/benchmark/__tests__/surface.snapshot.json`.
    - _Requirements: 16.1, 16.9, 27.1, 27.5_

- [ ] 3. INTERFACE FREEZE checkpoint
  - Ensure `vitest --run` and the type check pass, the surface snapshot is committed, the boundary test passes, and the stub list in task 2.9 is complete.
  - From this point every type file, `result.ts`, `limits.ts`, `index.ts` and all exported signatures change only through a spec update. Crew workers must not edit frozen files.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Seeding, PRNG, canonical JSON and digests (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `seed.ts` (bodies), `canonicalJson.ts` (bodies), and the test file below.
  - [ ] 4.1 Implement `makeRng` and `deriveSeed`
    - `makeRng(seed)` as mulberry32 over a 32-bit unsigned seed. `deriveSeed(rootSeed, keys)` hashes the canonical-joined keys with FNV-1a-64 and truncates to 32 bits. A seed depends only on the root seed and its own keys, never on enumeration order or sibling count.
    - Files owned: `src/benchmark/seed.ts`.
    - _Requirements: 9.2, 9.3_

  - [ ] 4.2 Implement the canonical JSON writer and digests
    - Schema-ordered stable writer from per-type key tables (two-space indent, `\n`, finite numbers only, optional absent fields omitted, no timestamps), the unknown-field walk (`UNKNOWN_FIELD` with path), `fnv1a-64-v1` digest over canonical text without the digest field, and a SHA-256 helper for artifact bytes (the algorithm name is stored beside each digest).
    - Files owned: `src/benchmark/canonicalJson.ts`.
    - _Requirements: 9.4, 9.5, 9.6, 20.1_

  - [ ]* 4.3 Write seeding and canonical-writer unit tests
    - Known mulberry32 sequence, adding an unrelated key does not change an existing derived seed, stable key order, non-finite numbers rejected, unknown field reported with path, digest independent of the digest field.
    - Files owned: `src/benchmark/__tests__/seedCanonical.test.ts`.
    - _Requirements: 9.3, 9.5, 9.6_

- [ ] 5. Metric framework and cluster bootstrap (Crew-delegable, Group A)
  - Depends on: tasks 3, 4.1 (for 5.2). Files owned: `evaluation/metricValue.ts` (bodies), `evaluation/evaluationGroup.ts` (bodies), `evaluation/bootstrap.ts`, and the test files below.
  - [ ] 5.1 Implement `definedRate`, group helpers and metric invariants
    - `definedRate(numerator, denominator, counts, reason?)` returns `undefined` with a non-empty reason for a zero denominator or invalid input and never `0`, `1` or `NaN`. Group helpers build explicit named `EvaluationGroup`s and a `PooledMetricValue` wrapper that must list its constituents. Counts of cells, Items and Families are carried on every value.
    - Files owned: `src/benchmark/evaluation/metricValue.ts`, `src/benchmark/evaluation/evaluationGroup.ts`.
    - _Requirements: 12.2, 12.3, 12.4, 12.9, 12.10_

  - [ ] 5.2 Implement the cluster bootstrap and paired difference
    - `clusterBootstrap` resamples whole `FamilyKey`s with replacement using `makeRng(config.seed)` (default 1,000 resamples, range 200 to 10,000, 95% percentile interval). Fewer families than the minimum (default 5) returns `not-estimated` with reason `INSUFFICIENT_FAMILIES`. `pairedClusterBootstrapDifference` uses the identical resampled family multiset for both systems and marks `distinguishable: false` when the interval contains zero.
    - Files owned: `src/benchmark/evaluation/bootstrap.ts`.
    - _Requirements: 12.5, 12.6, 12.7, 12.8_

  - [ ]* 5.3 Write property test for the bootstrap
    - **Property 13: The Cluster_Bootstrap is reproducible and respects the family-count floor**
    - **Validates: Requirements 12.5, 12.6, 12.8, 28.14**
    - Seed `SEED_P13`, 200 runs; `arbEvaluationGroup` with family counts at, above and below the minimum. Define `arbEvaluationGroup` in this file's generators section (`src/benchmark/__tests__/generators/groups.ts`).
    - Files owned: `src/benchmark/__tests__/bootstrap.props.test.ts`, `src/benchmark/__tests__/generators/groups.ts`.

  - [ ]* 5.4 Write metric framework unit tests
    - Zero denominator, empty group and invalid input each give `undefined` with reason; counts attached to every value; pooled value requires constituents; bootstrap documentation anchor states the interval describes variation across generated designs.
    - Files owned: `src/benchmark/__tests__/metricValue.test.ts`.
    - _Requirements: 12.2, 12.4, 12.7, 12.10_

- [ ] 6. Execution profiles, budgets, output paths and version checks (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `runner/executionProfile.ts` (bodies), `runner/versionCheck.ts`, `runner/outputDirectory.ts`, and the test files below.
  - [ ] 6.1 Implement execution-profile bounds and budget enforcement
    - `EXECUTION_PROFILE_BOUNDS` with the initial values of Req 23.2 and 23.3 (`quick`: 12 Families, 24 Items, 8 cards, 1,024 px, 200 resamples, 120 s; `full`: 400 Families, 4,000 Items, 100 cards, 2,048 px, 10,000 resamples, 60 min, 500 MiB), each marked `initial-unconfirmed` until E-7. `checkBounds(config)` returns `LIMIT_EXCEEDED` naming limit, supplied and permitted value before any generation. `enforceBudget(profile, startedAtMs, nowMs, onExceeded)` takes both times as arguments (never reads a clock) and returns `BUDGET_EXCEEDED`.
    - Files owned: `src/benchmark/runner/executionProfile.ts`.
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.8_

  - [ ] 6.2 Implement version checks and output-directory validation
    - `checkComponentVersions(domain, vision, restoration)` returns `COMPONENT_VERSION_UNSUPPORTED` naming component and both versions when a major version differs from `SUPPORTED_COMPONENT_MAJOR_VERSIONS`. `checkOutputDirectory(path, allowedRoots)` returns `OUTPUT_DIRECTORY_INVALID` for a path that escapes the configured roots (normalised, no `..` escape, no absolute path outside).
    - Files owned: `src/benchmark/runner/versionCheck.ts`, `src/benchmark/runner/outputDirectory.ts`.
    - _Requirements: 23.9, 24.1, 24.3_

  - [ ]* 6.3 Write property test for component version checks
    - **Property 25: Component version mismatches are rejected before any run**
    - **Validates: Requirements 24.3**
    - Seed `SEED_P25`, 200 runs; `arbVersionTriple` with one seeded major-version mismatch.
    - Files owned: `src/benchmark/__tests__/versionCheck.props.test.ts`.

  - [ ]* 6.4 Write bounds, budget and output-path unit tests
    - Each bound exactly at the limit accepted and one beyond rejected for both profiles, budget exceeded gives `BUDGET_EXCEEDED`, escaping paths (`..`, absolute, drive change) rejected, bound values marked `initial-unconfirmed`.
    - Files owned: `src/benchmark/__tests__/executionProfile.test.ts`.
    - _Requirements: 23.2, 23.3, 23.5, 23.8, 23.9_

- [ ] 7. Pattern families, structure labels and machine profiles (Crew-delegable, Group B)
  - Depends on: tasks 3, 4.1. Files owned: `families/deckBuilders.ts`, `families/patternFamilies.ts` (bodies), `families/labelCheck.ts` (bodies), `families/withinCardPartner.ts`, `dataset/profiles.ts`, `__tests__/generators/families.ts`, and the test files below.
  - [ ] 7.1 Implement the deck builders and family label table
    - One pure builder per `PatternFamilyKind` using only `makeRng(seed)`: `periodic`, `periodic-perturbed` (flip fraction recorded), `card-mirror`, `within-card-mirror` (via `withinCardPartner`), `periodic-and-mirror`, `random`, `sparse-or-constant`, `bitmap-derived` (calls the domain `bitmapToDeck` on `stripes`, `checkerboard`, `diamonds` or a seeded noise bitmap, never duplicating it). `FAMILY_STRUCTURE_LABELS`, `familyKeyString`, parameter range validation (`INVALID_DATASET_CONFIG` naming parameter and range), deck-size bound (at most the configured maximum and the domain limit 10,000), measured density recorded.
    - Files owned: `src/benchmark/families/deckBuilders.ts`, `src/benchmark/families/patternFamilies.ts`.
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8_

  - [ ] 7.2 Implement the independent label check and the partner mapping
    - `verifyStructureLabel(deck, expected, config)` measures agreement rates by plain counting (never the restoration Evidence_Test) and returns `PATTERN_LABEL_MISMATCH` naming family and measured value. `withinCardPartner(profile, readIndex)` is the benchmark's own documented mapping (reflection about the read-order midpoint for Garín, `// UNVERIFIED R4`), defined for any valid profile. Include the documented statement that helpful-family results do not estimate historical prevalence.
    - Files owned: `src/benchmark/families/labelCheck.ts`, `src/benchmark/families/withinCardPartner.ts`.
    - _Requirements: 2.3, 2.4, 2.9_

  - [ ] 7.3 Implement dataset profiles
    - `datasetProfiles()` returns the domain `GARIN_PROFILE` by reference (never redefined) and `generated(seed)` building 3 to 12 rows and 2 to 8 columns validated by the domain `validateProfile` (`INVALID_DATASET_CONFIG` with the domain code and path on failure). Copy the profile verification markers for manifests and reports.
    - Files owned: `src/benchmark/dataset/profiles.ts`.
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [ ]* 7.4 Write property test for structure labels
    - **Property 7: Structure labels match an independent measurement**
    - **Validates: Requirements 2.2, 2.3, 2.8**
    - Seed `SEED_P7`, 100 runs; `arbPatternFamilyParameters` across all eight kinds, card counts 2 to 20, plus `arbInvalidPatternFamilyParameters` with one seeded out-of-range field tagged with its expected code.
    - Files owned: `src/benchmark/__tests__/generators/families.ts`, `src/benchmark/__tests__/structureLabels.props.test.ts`.

  - [ ]* 7.5 Write the within-card partner conformance test
    - Create `withinCardPartnerConformance.test.ts` comparing `withinCardPartner` pointwise with restoration's `symmetry.ts` partner function for the Garín profile and one generated profile. A difference is a test failure and never a silent adjustment. This is the one allow-listed internal import (Q1 (a)). Skipped with a named reason while the restoration module is missing.
    - Files owned: `src/benchmark/__tests__/withinCardPartnerConformance.test.ts`.
    - _Requirements: 2.4_

  - [ ]* 7.6 Write family and profile unit tests
    - Worked example per family kind, label table values, density recorded, bitmap-derived decks equal to the domain `bitmapToDeck` output, invalid profile returns `INVALID_DATASET_CONFIG` with the domain code, Garín profile is the domain object by reference.
    - Files owned: `src/benchmark/__tests__/families.test.ts`.
    - _Requirements: 2.1, 2.2, 2.6, 3.1, 3.5_

- [ ] 8. Damage_Level_File (Crew-delegable, Group B)
  - Depends on: task 3. Files owned: `damage/damageLevelFile.ts` (bodies), `adapters/damageLevelForDetection.ts`, `data/synthetic/damage-levels.json`, `data/synthetic/README.md`, `__tests__/generators/damageLevels.ts`, and the test files below.
  - [ ] 8.1 Implement the Damage_Level_File validator and loader
    - `validateDamageLevelFile(json, unknownCoverFrac)` checks in order: `format`, integer `schemaVersion`, no unknown field; file-level `occlusionCoverFraction` in (0.5, 1] and at least `unknownCoverFrac`; every numeric field non-decreasing from `none` to `heavy`; every field of `none` equal to zero (the file-level fraction excepted); no two levels identical; per-level `occlusionCoverage` in [0, 1), non-decreasing, zero at `none`. First violation returns `INVALID_DAMAGE_LEVELS` naming the path. `loadDamageLevelFile(path)` is Node-only and used by scripts. The validated field list is exactly the one in Req 7.3.
    - Files owned: `src/benchmark/damage/damageLevelFile.ts`.
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.9, 7.12_

  - [ ] 8.2 Write the Damage_Level_File, the detection adapter and the fixture generators
    - Create `data/synthetic/damage-levels.json` with the design's initial values, `occlusionCoverFraction` 0.9 marked `initial-unconfirmed` (also `occlusionCoverFractionConfirmedBy`), per-level `confirmedBy: "initial-unconfirmed"`, `damageLevelVersion`, and `source` naming this spec. The file replaces the detection placeholder and never carries the placeholder marker. Add `data/synthetic/README.md` (MIT, synthetic, owned by the benchmark spec).
    - `adapters/damageLevelForDetection.ts` re-exports the exact shape detection's `loadDamageLevels(json, unknownCoverFrac)` validates. Add `arbDamageLevelFileCandidate` and `arbDamageLevelFileViolation` (non-monotone field, non-zero `none` field, duplicate level, out-of-range `occlusionCoverFraction`, `occlusionCoverFraction` below `unknownCoverFrac`, `occlusionCoverage` of 1 or more, non-monotone `occlusionCoverage`, unknown field, bad `schemaVersion`), each tagged with the expected path.
    - Files owned: `data/synthetic/damage-levels.json`, `data/synthetic/README.md`, `src/benchmark/adapters/damageLevelForDetection.ts`, `src/benchmark/__tests__/generators/damageLevels.ts`.
    - _Requirements: 4.4, 7.1, 7.2, 7.5, 7.6, 7.7, 7.8, 7.11, 7.12_

  - [ ]* 8.3 Write property test for the Damage_Level_File
    - **Property 6: The Damage_Level_File's numeric structure is well formed**
    - **Validates: Requirements 7.4, 7.5, 7.9, 7.12, 28.12**
    - Seed `SEED_P6`, 300 runs; valid candidates accepted, every enumerated violation rejected with `INVALID_DAMAGE_LEVELS` naming the first violating path.
    - Files owned: `src/benchmark/__tests__/damageLevelFile.props.test.ts`.

  - [ ]* 8.4 Write Damage_Level_File unit tests
    - The committed `data/synthetic/damage-levels.json` validates, contains no placeholder marker, `occlusionCoverFraction` is 0.9 with marker `initial-unconfirmed`, each rejection case has an example, the adapter output validates against the detection field list (when detection's loader exists, run it on the committed file).
    - Files owned: `src/benchmark/__tests__/damageLevelFile.test.ts`.
    - _Requirements: 7.2, 7.5, 7.7, 7.8, 7.9, 7.11, 7.12_

- [ ] 9. Cell-level damage models (Crew-delegable, Group B)
  - Depends on: tasks 3, 4.1. Files owned: `damage/cellDamageModels.ts`, `__tests__/generators/cellDamage.ts`, and the test files below.
  - [ ] 9.1 Implement the `DamageFn` factories and mask recording
    - `cellDamageModelFactory(kind, params, shortRegionBound, seed)` for `random-cells`, `consecutive-run`, `strip` and `missing-cards`, each returning a domain `DamageFn` that masks by returning an observation with no value and no hole likelihood. Callers pass it and a seeded `RandomFn` to `deriveDamagedDeck` (the benchmark never bypasses it). Compose in the fixed order random-cells, consecutive-run, strip, missing-cards and record each applied model and parameters in the `CellDamageMask`. Run-length ranges give values at or below and above `shortRegionBound`, read from the restoration configuration. `DAMAGE_TOO_SEVERE` before any damage when fewer than the minimum Trusted cells would remain. `INVALID_DAMAGE_PARAMETERS` for out-of-range values before any damage. Clean deck unchanged.
    - Files owned: `src/benchmark/damage/cellDamageModels.ts`.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 7.10_

  - [ ]* 9.2 Write property test for cell damage models
    - **Property 2: Cell damage models preserve everything outside the mask**
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.8, 5.9, 28.11**
    - Seed `SEED_P2`, 300 runs; `arbDeck` of 1 to 6 cards, in-range parameters, 1 to 4 models composed. Define `arbDeck`, `arbCellDamageModelKind` and the invalid-parameter variants in `generators/cellDamage.ts`.
    - Files owned: `src/benchmark/__tests__/generators/cellDamage.ts`, `src/benchmark/__tests__/cellDamage.props.test.ts`.

  - [ ]* 9.3 Write property test for severe damage refusal
    - **Property 3: Severely damaged decks are refused, never silently truncated**
    - **Validates: Requirements 5.6**
    - Seed `SEED_P3`, 150 runs; `arbSevereDamageParameters` breaching the Trusted-cell minimum; the Deck is unchanged after the refusal.
    - Files owned: `src/benchmark/__tests__/severeDamage.props.test.ts`.

  - [ ]* 9.4 Write cell damage unit tests
    - One worked example per model, the fixed composition order, run lengths on both sides of `shortRegionBound`, same seed gives an identical damaged deck, `INVALID_DAMAGE_PARAMETERS` names parameter and range.
    - Files owned: `src/benchmark/__tests__/cellDamage.test.ts`.
    - _Requirements: 5.4, 5.5, 5.7, 5.9_

- [ ] 10. Clean image renderer and image-level damage (Crew-delegable, Group B)
  - Depends on: tasks 3, 4.1. Files owned: `render/cardRenderer.ts`, `damage/imageDamageModels.ts`, `__tests__/generators/images.ts`, and the test files below.
  - [ ] 10.1 Implement the clean card renderer
    - `renderCleanCardImage(deck, cardId, profile, params, seed)` returns bytes (PNG, JPEG or WebP), the true Card_Quadrilateral, `RenderParameters` including `rendererVersion`, and a SHA-256 digest. Seeded, byte-identical for equal inputs and renderer version, no `Math.random`. The returned image digest is exposed in the string form `"sha-256:<lowercase hex>"` (computed over the image bytes, A0-4), alongside any `{algorithm, hex}` record. Larger than detection's Intake_Limits defaults returns `RENDER_OUT_OF_LIMITS` naming the limit and writes nothing. Independent of `src/vision/__tests__` (no import either way). Parameter names and units match `docs/benchmark-metrics.md`.
    - Files owned: `src/benchmark/render/cardRenderer.ts`.
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8_

  - [ ] 10.2 Implement the image damage models
    - `applyImageDamage(clean, levels, profile, seed)` applies models strictly in `IMAGE_DAMAGE_ORDER` (illumination-gradient, shadow, stain, cord, patch, tear, occlusion, rotation, perspective, blur, noise). Each element records its polygon in image coordinates and the `readIndex` set whose Cell_Window overlaps by at least the documented fraction. The `occlusion` model paints solid-colour covers over chosen Cell_Windows so that the fraction of readable Cell_Windows covered never exceeds the level's `occlusionCoverage` (the per-level Occlusion_Extent), and records each window's actual covered fraction in `parameters.coveredFraction`. The model never reads `occlusionCoverFraction`. Output stays within detection's minimum size and bounds after rotation and perspective. Never mutates the clean image. `INVALID_DAMAGE_PARAMETERS` before any pixel work. Document each model's meaning, unit and simplification.
    - Files owned: `src/benchmark/damage/imageDamageModels.ts`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.12, 7.13_

  - [ ]* 10.3 Write property test for image damage
    - **Property 4: Image damage models stay within bounds and never mutate the clean image**
    - **Validates: Requirements 6.4, 6.5, 6.6, 6.7, 28.11**
    - Seed `SEED_P4`, 40 runs; small 256 px images, in-range parameters plus enumerated out-of-range variants. Define `arbRenderedCardImage`, `arbImageDamageModelKind` in `generators/images.ts`.
    - Files owned: `src/benchmark/__tests__/generators/images.ts`, `src/benchmark/__tests__/imageDamage.props.test.ts`.

  - [ ]* 10.4 Write property test for the occlusion extent
    - **Property 5: Occlusion damage never exceeds its configured extent**
    - **Validates: Requirements 7.13**
    - Seed `SEED_P5`, 40 runs; `arbSmallProfile`, every Damage_Level, seeded occlusion placement; the recorded fraction of occluded readable Cell_Windows never exceeds that level's `occlusionCoverage`, which is below 1.
    - Files owned: `src/benchmark/__tests__/occlusionExtent.props.test.ts`.

  - [ ]* 10.5 Write the renderer conformance test
    - `rendererConformance.test.ts` renders clean cards at documented sizes, calls the public `detect` through the vision index, and asserts Alignment_Status `aligned` and recovery of every cell bit within the tolerance recorded by E-1 (initially 0 mismatches, marked `initial-unconfirmed`). Both generators read the same Damage_Level_File. Skipped with a named reason while `detect` is missing. This test is the evidence for experiment E-1.
    - Files owned: `src/benchmark/__tests__/rendererConformance.test.ts`.
    - _Requirements: 4.4_

  - [ ]* 10.6 Write renderer and image damage unit tests
    - Same seed gives identical bytes, `RENDER_OUT_OF_LIMITS` writes nothing, fixed damage order, polygons and overlapping `readIndex` sets recorded, rotation and perspective stay inside bounds, the clean image bytes are unchanged.
    - Files owned: `src/benchmark/__tests__/renderer.test.ts`.
    - _Requirements: 4.7, 4.8, 6.2, 6.3, 6.4_

- [ ] 11. Detection metrics (Crew-delegable, Group B)
  - Depends on: tasks 3, 5.1. Files owned: `evaluation/detectionMetrics.ts` (bodies), `__tests__/generators/detection.ts`, and the test files below.
  - [ ] 11.1 Implement detection metrics
    - Positive class is hole present through the polarity recorded in the Detection_Result. Precision over `observed` cells; recall over answered and over all (`ambiguous` and `unknown` count as misses); accuracy over answered and over all; coverage per Condition. Alignment success rate, corner error and per-stage failure rate reuse detection's exported functions by import (no re-implementation). Hole_Probability Brier and ECE with the bin count stated, labelled uncalibrated unless a detection calibration run is cited. An Item whose alignment status is not `aligned` or `aligned-with-warnings` counts every readable cell unresolved in "over all" and is excluded from "over answered". Groups: `all-cells`, `damage-masked-cells`, `undamaged-cells`, per Damage_Level, Profile and Split_Role.
    - Files owned: `src/benchmark/evaluation/detectionMetrics.ts`.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.8, 13.9_

  - [ ]* 11.2 Write property test for shared detection metrics
    - **Property 14: Shared detection metrics agree with vision's own definitions**
    - **Validates: Requirements 13.7**
    - Seed `SEED_P14`, 100 runs; `arbDetectionResultShaped` (data only, structurally matching `DetectionResult`). Compare accuracy over answered, accuracy over all, coverage, Brier, ECE, alignment success rate and corner error with detection's functions. Skipped with a named reason while detection's metric exports are missing. Define the generator in `generators/detection.ts`.
    - Files owned: `src/benchmark/__tests__/generators/detection.ts`, `src/benchmark/__tests__/detectionShared.props.test.ts`.

  - [ ]* 11.3 Write property test for alignment failure handling
    - **Property 15: Detection alignment failure is never silently excluded**
    - **Validates: Requirements 13.9**
    - Seed `SEED_P15`, 100 runs; Alignment_Status drawn from the non-aligned values.
    - Files owned: `src/benchmark/__tests__/detectionAlignment.props.test.ts`.

  - [ ]* 11.4 Write detection metric unit tests
    - Hand-computed precision, both recalls, both accuracies and coverage on a small table, alignment-failed Item counted as defined in Req 13.9, the Hole_Probability label states uncalibrated.
    - Files owned: `src/benchmark/__tests__/detectionMetrics.test.ts`.
    - _Requirements: 13.2, 13.3, 13.4, 13.8, 13.9_

- [ ] 12. Restoration and calibration metrics and the calibration adapter (Crew-delegable, Group B)
  - Depends on: tasks 3, 5.1. Files owned: `evaluation/restorationMetrics.ts`, `evaluation/calibrationMetrics.ts`, `adapters/calibrationExport.ts`, `__tests__/generators/metrics.ts`, and the test files below.
  - [ ] 12.1 Implement restoration metrics
    - Accuracy over all evaluated cells (a cell without a Proposal_View value is not correct), damaged-cell accuracy over all and over answered with coverage, per-provenance accuracy (`repeat-inferred`, `symmetry-inferred`) with per-category counts, abstention rate and per-reason counts keyed by restoration's `ABSTENTION_REASONS` values (reused by name, never redefined), top-1 and top-3 accuracy (top-3 documented as not a single proposal), whole-card recovery rate with share of cells covered or `not-evaluated`, false-structure count and accuracy on `non-helpful` families, per Pattern_Family, Structure_Label, Damage_Level, Profile and Split_Role. End-to-end split by detection Condition. An Item whose restoration run errored counts every cell not correct in "over all", is excluded from "over answered", and records the error code and group.
    - Files owned: `src/benchmark/evaluation/restorationMetrics.ts`.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10, 14.11_

  - [ ] 12.2 Implement calibration metrics and reliability data
    - Prediction is a cell with a rank-1 Hypothesis (confidence, outcome 1 if equal to truth). `brierScore`, `expectedCalibrationError` (equal-width bins, default 10, range 2 to 50, bin count carried on the value), `buildReliabilityData` (a zero-prediction bin is `"empty"`, never zero accuracy). Raw and calibrated values reported separately, calibrated `not-applicable` without a valid Calibration_Record. Hypotheses with the synthetic-prior warning reported `uncalibrated` with the flag kept in the group label. Calibration error reported only on `held-out` (or frozen `test`), never on the fitting data.
    - Files owned: `src/benchmark/evaluation/calibrationMetrics.ts`.
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.7, 15.8, 15.9_

  - [ ] 12.3 Implement the calibration artifact adapter
    - `writeRestorationCalibrationArtifact(...)` builds restoration's `CalibrationRecord` shape (histogram-binning, 10 bins, calibration and tuning roles, file-set ids, dataset version, per-bin sample size, seed, benchmark version, ECE with bin count measured on `tuning` or a later role never `calibration`, valid prior kinds and support range) and validates it with restoration's `validateCalibrationRecord` before returning (wrapped error on failure). The adapter fits only on the `calibration` role (via `readRole`). A `PriorMeasurement` builder does the same with `validatePriorMeasurement`, carrying `datasetVersion` and `splitRole` of `tuning` or `calibration`.
    - Files owned: `src/benchmark/adapters/calibrationExport.ts`.
    - _Requirements: 15.5, 15.6, 17.3, 21.4_

  - [ ]* 12.4 Write property test for metric bounds
    - **Property 11: Metric values are bounded and never silently absent**
    - **Validates: Requirements 12.2, 12.3, 12.9, 28.5, 28.7**
    - Seed `SEED_P11`, 500 runs; `arbEvaluationGroup` predictions in [0, 1] including empty and zero-denominator groups, applied to detection, restoration and calibration metric functions.
    - Files owned: `src/benchmark/__tests__/generators/metrics.ts`, `src/benchmark/__tests__/metricBounds.props.test.ts`.

  - [ ]* 12.5 Write property test for perfect predictions
    - **Property 12: Perfect predictions yield perfect metrics**
    - **Validates: Requirements 15.4, 15.8, 28.6**
    - Seed `SEED_P12`, 200 runs; `arbPerfectPredictionGroup`, `arbReliabilityBinsWithEmpty`.
    - Files owned: `src/benchmark/__tests__/perfectMetrics.props.test.ts`.

  - [ ]* 12.6 Write restoration and calibration unit tests
    - Hand-computed accuracy, coverage, top-3, abstention reason tally, whole-card `not-evaluated`, Brier and ECE with 10 bins on a small table, calibrated values `not-applicable` without a record, the adapter output validates through restoration's validator (skipped with a named reason while it is missing), ECE measured on `calibration` is refused.
    - Files owned: `src/benchmark/__tests__/restorationMetrics.test.ts`.
    - _Requirements: 14.2, 14.3, 14.5, 14.6, 14.7, 15.2, 15.3, 15.6_

- [ ] 13. Baselines and evaluation policy (Crew-delegable, Group B)
  - Depends on: tasks 3. Files owned: `evaluation/baselines.ts`, `evaluation/evaluationPolicy.ts`, `__tests__/support/abstainAll.ts`, `__tests__/generators/baselines.ts`, and the test files below.
  - [ ] 13.1 Implement the baselines B1, B2 and B3
    - Pure functions of the damaged deck only (no Ground_Truth_Artifact, no seed). B1 deck-majority, B2 column-majority (same `readIndex` across the other cards, no repeat-period or symmetry structure), B3 nearest-neighbour by `readIndex` distance within the same card (tie goes to the lower `readIndex`). Fixed rules: an exact majority tie or no support leaves the cell unresolved. `BASELINES` lists exactly B1, B2, B3 with their documented purposes (global density, cross-card position, local spatial copy). The paired comparison helper reports the difference per baseline with `pairedClusterBootstrapDifference`, at the system's coverage and at full coverage with the distinction stated, per Structure_Label, and returns `BASELINE_SPLIT_MISMATCH` when the Item sets differ.
    - Files owned: `src/benchmark/evaluation/baselines.ts`.
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [ ] 13.2 Implement the evaluation policy and run context
    - `buildProposalView(deck, hypothesesByCell)` reads effective values and rank-1 Hypothesis values only and never calls a review, accept, select, edit or approval function. `RestorationRunContext` fixes `deckOrigin: "synthetic"` and `syntheticEvaluationContext: true`, records the four labelled conditions (priors disabled, repeat only, symmetry only, both), prior measurement references (scope `synthetic`, from `tuning` or `calibration` of the same Dataset_Version), the complete `RestorationConfig` and `DetectionParameters` used, tuned-constants file identifiers and versions, and the restoration seed (documented as not used to choose among Hypotheses). A condition without its required measurement or record is `not-evaluated` with the reason, never substituted.
    - Attestations (A0-4): the run context only records the `syntheticAttestations` map it is given (built by `adapters/syntheticAttestations.ts`, task 18.6) and states in the report that an attestation is a declaration by the benchmark runner, not proof. It builds nothing itself. The run context always uses `deckOrigin: "synthetic"`, and no code path passes `deckOrigin: "real"` for benchmark data.
    - Files owned: `src/benchmark/evaluation/evaluationPolicy.ts`.
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 13.3 Add the abstain-all fixture and baseline generators
    - `__tests__/support/abstainAll.ts` exports `abstainAllFixture` (B0). It is test-only, is not imported by any file outside `__tests__`, and the surface snapshot asserts it is not in `index.ts`. `generators/baselines.ts`: `arbDamagedDeck`, `arbAlternateTruthDeck`, `arbHypothesisSet`, `arbConditionWithMissingMeasurement`.
    - Files owned: `src/benchmark/__tests__/support/abstainAll.ts`, `src/benchmark/__tests__/generators/baselines.ts`.
    - _Requirements: 16.9_

  - [ ]* 13.4 Write property test for baseline fairness
    - **Property 16: Baselines are pure functions of the damaged deck and are evaluated fairly**
    - **Validates: Requirements 16.2, 16.4, 16.5, 28.9**
    - Seed `SEED_P16`, 150 runs; replace the Clean_Ground_Truth with an arbitrary deck of the same shape and mask; each baseline's output is unchanged and deterministic with no seed; Item sets differing returns `BASELINE_SPLIT_MISMATCH`.
    - Files owned: `src/benchmark/__tests__/baselines.props.test.ts`.

  - [ ]* 13.5 Write property test for the abstain-all fixture
    - **Property 17: The abstain-all fixture is never a reported baseline**
    - **Validates: Requirements 16.9**
    - Seed `SEED_P17`, 100 runs; fully and partially masked decks; every metric is `undefined` with a non-empty reason and coverage 0; `BASELINES` never contains it.
    - Files owned: `src/benchmark/__tests__/abstainAll.props.test.ts`.

  - [ ]* 13.6 Write property test for the evaluation policy
    - **Property 18: The evaluation policy performs no review action and never substitutes a configuration**
    - **Validates: Requirements 17.1, 17.7**
    - Seed `SEED_P18`, 150 runs; spies on every review function are never called; a missing measurement gives `not-evaluated` with the reason and no substitute.
    - Files owned: `src/benchmark/__tests__/evaluationPolicy.props.test.ts`.

  - [ ]* 13.7 Write baseline unit tests
    - Worked examples for B1, B2, B3 including exact ties, no support and the lower-`readIndex` tie rule, the three baselines answer different questions on one deck, `BASELINES` ids are exactly B1, B2, B3.
    - Files owned: `src/benchmark/__tests__/baselines.test.ts`.
    - _Requirements: 16.1, 16.2, 16.3_

- [ ] 14. Threshold_Register and preliminary experiment records (Crew-delegable, Group B)
  - Depends on: tasks 3, 4.2. Files owned: `threshold/thresholdRegister.ts` (bodies), `threshold/preliminaryExperiment.ts` (bodies), `data/benchmark/threshold-register.json`, `__tests__/generators/threshold.ts`, and the test files below.
  - [ ] 14.1 Implement the Threshold_Register
    - `setThreshold` (rejects with `INVALID_THRESHOLD_REGISTER` when the register is `frozen`, when `splitRoleUsed` is `test`, or when the setting experiment did not read `tuning`, `calibration` or `held-out`), one-way `freezeRegister`, `evaluateThresholdStatus` (`not-set`, `not-evaluated`, `met` only when the interval lower bound satisfies the operator, else `not-met`), `ciGating` settable only after freezing, export and import with the canonical writer. Commit `data/benchmark/threshold-register.json` in state `draft` with every entry `value: "not set"`, `settingExperiment` `to be set from experiment E-n`, `splitRoleUsed: null`, for: detection accuracy-over-all, restoration accuracy-over-damaged, calibration ECE, whole-card recovery rate, baseline paired-difference significance, manual-versus-assisted time saving. No number is committed.
    - Files owned: `src/benchmark/threshold/thresholdRegister.ts`, `data/benchmark/threshold-register.json`.
    - _Requirements: 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9_

  - [ ] 14.2 Implement preliminary experiment records
    - `recordPreliminaryExperiment` builds a canonical `PreliminaryExperimentRecord` (E-1 to E-7, dataset version, seeds, roles read, configuration, results, report digest) and rejects `splitRolesRead` containing `test` with `SPLIT_ROLE_FORBIDDEN` before computing anything. Records are written under `data/benchmark/experiments/`.
    - Files owned: `src/benchmark/threshold/preliminaryExperiment.ts`, `data/benchmark/experiments/README.md`.
    - _Requirements: 18.1, 18.2, 18.5_

  - [ ]* 14.3 Write property test for register mutation
    - **Property 19: The Threshold_Register can only be mutated correctly**
    - **Validates: Requirements 18.4, 18.5, 18.6**
    - Seed `SEED_P19`, 150 runs; `arbRegisterMutationSequence` of 0 to 20 operations; a frozen register rejects every further `setThreshold` and is left unchanged.
    - Files owned: `src/benchmark/__tests__/generators/threshold.ts`, `src/benchmark/__tests__/register.props.test.ts`.

  - [ ]* 14.4 Write property test for threshold status
    - **Property 20: Threshold status is derived consistently from the metric interval**
    - **Validates: Requirements 18.7**
    - Seed `SEED_P20`, 300 runs; `arbThresholdEntry`, `arbMetricValue` (defined and undefined).
    - Files owned: `src/benchmark/__tests__/thresholdStatus.props.test.ts`.

  - [ ]* 14.5 Write register example tests
    - A fresh committed register has every entry `not set` and state `draft`, `freezeRegister` is one-way, a `test`-role setting experiment is rejected, an experiment record naming `test` is rejected, a refused `test` read example (28.16).
    - Files owned: `src/benchmark/__tests__/register.test.ts`.
    - _Requirements: 18.4, 18.5, 18.6, 28.16_

- [ ] 15. User-study protocol and the real-photograph track (Crew-delegable, Group B)
  - Depends on: tasks 3, 4.2, 5.2. Files owned: `userStudy/protocol.ts` (bodies), `userStudy/studyResult.ts`, `tracks/realPhotographTrack.ts` (bodies), and the test file below.
  - [ ] 15.1 Implement the study result importer and the user-comparison section
    - `StudyResultFile` validating importer (`INVALID_STUDY_RESULT` naming the path of the first violation, no partial import, integer-millisecond durations, no timestamps, pseudonymous ids). `buildUserComparisonSection(file?)` returns `not-conducted` with no time-saving number by default, `insufficient-sample` below the protocol minimum, and `conducted` with paired time and accuracy difference intervals (through the paired bootstrap) and the statement that results describe the tested participants and tasks only. Protocol constants mirror `docs/benchmark-user-comparison.md`.
    - Files owned: `src/benchmark/userStudy/protocol.ts`, `src/benchmark/userStudy/studyResult.ts`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10_

  - [ ] 15.2 Implement the real-photograph track
    - `evaluateRealPhotographFolder` returns `REAL_DATA_NOT_LICENSED` for a folder with no README, an unchecked licence or no reference labels (not evaluated). A non-redistributable folder is local-only: results go only to an uncommitted local path. Below `MIN_LABELLED_CELLS_FOR_RATE` (initial 200) only counts are reported with the statement that the sample is too small for a rate. The section states the sample size, that it is small and qualitative, makes no accuracy claim beyond it, lists observed failures, and shares no table or summary with any synthetic track. With no licensed folder the track is `not-evaluated`, reason `no licensed reference data`, no number. Garín5 content is never read or committed (A10 unchecked). No user photograph is committed.
    - Files owned: `src/benchmark/tracks/realPhotographTrack.ts`.
    - _Requirements: 1.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

  - [ ]* 15.3 Write study and real-photograph example tests
    - Real-photograph `not-evaluated` default, `countsOnly` below the minimum, a local-only folder never writes a committed path, `REAL_DATA_NOT_LICENSED` per missing condition; user comparison `not-conducted` default with no number, `insufficient-sample`, a malformed study file returns `INVALID_STUDY_RESULT` with first path and imports nothing; no personal-data field exists in any report type (key-table scan).
    - Files owned: `src/benchmark/__tests__/studyAndReal.test.ts`.
    - _Requirements: 11.2, 11.5, 11.7, 19.5, 19.8, 19.9, 26.4, 28.16_

- [ ] 16. Report format, validation and import (Crew-delegable, Group B)
  - Depends on: tasks 3, 4.2, 5.1. Files owned: `report/benchmarkReport.ts` (bodies), and the test file below.
  - [ ] 16.1 Implement report export, import and invariants
    - `exportBenchmarkReport` through the canonical writer with `format: "loom-lazarus-benchmark-report"`, integer `schemaVersion`, dataset identity, Component_Stamp, Execution_Profile, Split_Roles read, `testRoleOptIn`, register state at run, tracks, user comparison, thresholds with statuses, failure examples and the report digest. `importBenchmarkReport` order: size above 16 MiB (`INPUT_TOO_LARGE`, UTF-8 length before parsing), `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` (path), invariants then the recomputed digest (`INVALID_REPORT` with path). Invariants: defined rates in [0, 1], numerator not above denominator, every undefined value has a non-empty reason, every Metric_Value of a `not-evaluated` track is undefined, non-negative integer counts, `lower <= point <= upper`, no `test`-role value without the opt-in and a frozen register. No timestamp, absolute path, personal data or pixel data. The module and its static-import closure use no Node-only API.
    - Files owned: `src/benchmark/report/benchmarkReport.ts`.
    - _Requirements: 3.2, 10.8, 10.12, 20.1, 20.2, 20.3, 20.4, 20.7, 20.8, 24.2_

  - [ ]* 16.2 Write report import unit tests
    - `INPUT_TOO_LARGE` at exactly 16 MiB accepted and plus one byte rejected, each error code with its first-failure order, one example per invariant, a wrong digest, no timestamp or path in an export.
    - Files owned: `src/benchmark/__tests__/reportIO.test.ts`.
    - _Requirements: 20.3, 20.4, 20.8_

- [ ] 17. Tables, failure examples and browser reports (Crew-delegable, Group B)
  - Depends on: tasks 3, 16.1. Files owned: `report/tables.ts`, `report/failureExamples.ts`, `report/browserReport.ts` (bodies), and the test files below.
  - [ ] 17.1 Implement Markdown and CSV table generation
    - Pure functions of a report: header with Dataset_Version, seed, split, sample size and Component_Stamp, byte-identical for an identical report, synthetic and real-photograph results in separate files, every undefined value written as `undefined` plus its reason code, never an empty cell or a number.
    - Files owned: `src/benchmark/report/tables.ts`.
    - _Requirements: 21.1, 21.2_

  - [ ] 17.2 Implement failure-example selection
    - `selectFailureExamples` is deterministic (confidence-outcome gap descending, then Item id ascending, per-category limit default 20) over the categories wrong rank-1, high-confidence wrong, false structure on `non-helpful`, detection failure, alignment failure. Each example carries Item id, seed, Damage_Level, artifact path and digest, no pixels and no truth. A `test`-role example is written only when the register is frozen, and the fact is recorded.
    - Files owned: `src/benchmark/report/failureExamples.ts`.
    - _Requirements: 21.5, 21.6, 21.7_

  - [ ] 17.3 Implement the Browser_Report, the index and the browser-safe reader
    - `buildBrowserReport(report, firstN)` omits per-cell detail, keeps every Metric_Value with interval and counts, Reliability_Data, the first N failure examples, the fixed honesty statements (requirement 1.5, 15.9, 11.6 texts), the profile `unverified` markers, and credits Rodas Lorente et al. (2025) and the Garín5 dataset. Over `BROWSER_REPORT_MAX_BYTES` returns `REPORT_TOO_LARGE` naming size and limit and writes nothing. `buildBrowserReportIndex` lists, per report, `id` (also the file stem), `profileId`, `datasetVersion`, `executionProfile`, `reportDigest` and `trackStatuses`. The reader is browser-safe and loads by a plain static request.
    - Location (A0-7): Browser_Reports are written to `data/benchmark/browser/`, one file per report, and `data/benchmark/browser/index.json` (built with `buildBrowserReportIndex`) is maintained alongside them. The index lists every file in that folder and the builder refuses to list a report that is absent.
    - Files owned: `src/benchmark/report/browserReport.ts`.
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 26.7_

  - [ ]* 17.4 Write property test for tables and failure examples
    - **Property 22: Tables and failure-example selection are deterministic**
    - **Validates: Requirements 21.1, 21.5**
    - Seed `SEED_P22`, 100 runs; `arbBenchmarkReport`, `arbFailureExampleCandidateSet`. Define the generators in `generators/report.ts`.
    - Files owned: `src/benchmark/__tests__/generators/report.ts`, `src/benchmark/__tests__/tables.props.test.ts`.

  - [ ]* 17.5 Write property test for browser report size
    - **Property 23: Browser reports never exceed their size limit**
    - **Validates: Requirements 22.2**
    - Seed `SEED_P23`, 100 runs; `arbBenchmarkReport` sized near `BROWSER_REPORT_MAX_BYTES`.
    - Files owned: `src/benchmark/__tests__/browserReport.props.test.ts`.

  - [ ]* 17.6 Write table and browser report unit tests
    - Undefined value renders as `undefined` with reason, synthetic and real in separate files, `REPORT_TOO_LARGE` writes nothing, the browser reader imports no Node-only module (checked in the boundary test), honesty statements and `unverified` markers present.
    - Files owned: `src/benchmark/__tests__/tables.test.ts`.
    - _Requirements: 21.2, 22.2, 22.5_

- [ ] 18. Splits, families, manifest and leakage guard (Crew-delegable, Group C)
  - Depends on: tasks 3, 4, 7. Files owned: `dataset/familyBuilder.ts`, `dataset/splitAssignment.ts`, `dataset/manifest.ts`, `dataset/leakageGuard.ts`, `adapters/syntheticAttestations.ts`, `__tests__/generators/dataset.ts`, and the test files below.
  - [ ] 18.1 Implement family construction and split assignment
    - `familyBuilder.ts`: Deck_Family construction (Family_Key from Pattern_Family, parameters id, base-deck seed and profile id, damage seed excluded), per-item seeds via `deriveSeed`. `splitAssignment.ts`: `assignSplitRoles` stratified by Pattern_Family and Profile, deterministic (families ordered by key string, never generation order), `SPLIT_STRATUM_TOO_SMALL` naming the stratum below the minimum per role, `assertNoCrossSplitFamily`, and `readRole(role, caller, registerState, explicitTestOptIn)` returning `SPLIT_ROLE_FORBIDDEN` before any read (tuning and calibration callers never read `held-out` or `test`; the default runner and quick profile never read `test`; the final runner reads `test` only with the explicit option and a frozen register).
    - Files owned: `src/benchmark/dataset/familyBuilder.ts`, `src/benchmark/dataset/splitAssignment.ts`.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11_

  - [ ] 18.2 Implement the manifest, digest verification and reproduction check
    - `buildDatasetManifest` (canonical, byte-identical for identical inputs, records versions, root seed, every derived seed, parameter sets, profile id, per-artifact relative path, byte length, digest with algorithm, and, for every Item with rendered card images, `imageProvenance` with one `CardImageProvenance` per card (`cardId`, `generator`, `generatorVersion`, `sourceId`, `seed`, `parametersDigest`, `imageDigest`, the two digests written `"sha-256:<lowercase hex>"` over the damaged image bytes passed to `detect()`, A0-4); Items without images omit `imageProvenance`), `verifyManifestArtifacts` (`DATASET_DIGEST_MISMATCH` naming the first mismatch, run before any evaluation), `reproduceAndCompare` (`DATASET_NOT_REPRODUCIBLE` naming the first differing artifact). Wall-clock values and hardware go only to the runtime file.
    - Files owned: `src/benchmark/dataset/manifest.ts`.
    - _Requirements: 2.7, 3.3, 4.5, 9.1, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [ ] 18.3 Implement the leakage guard
    - `runLeakageTest` builds two clean decks differing only in the masked cells' true values and asserts deeply equal restoration output (the restoration masking contract is the oracle shape). `checkSystemInputFilesForLeakage(dir)` returns `LEAKAGE_DETECTED` naming the artifact when a System_Input file contains a Family_Key, a Pattern_Family name, a Damage_Level name, or a true bit value outside the damaged deck. System_Inputs and Ground_Truth_Artifacts live in physically separate directories, and no file holds both.
    - Files owned: `src/benchmark/dataset/leakageGuard.ts`.
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.8, 8.9_

  - [ ]* 18.4 Write property test for family splits
    - **Property 10: No Deck_Family or base-deck digest crosses two Split_Roles**
    - **Validates: Requirements 10.3, 10.4, 10.6, 28.8**
    - Seed `SEED_P10`, 100 runs; `arbDatasetFamilies` with stratum sizes near the configured minimum. Define it in `generators/dataset.ts`.
    - Files owned: `src/benchmark/__tests__/generators/dataset.ts`, `src/benchmark/__tests__/splits.props.test.ts`.

  - [ ]* 18.5 Write manifest, split and leakage unit tests
    - Adding a family to one stratum does not reassign another, `SPLIT_STRATUM_TOO_SMALL` names the stratum, `readRole` refusals for every caller and role combination (including the refused `test` read example), a tampered artifact gives `DATASET_DIGEST_MISMATCH`, a differing regeneration gives `DATASET_NOT_REPRODUCIBLE`, a System_Input file seeded with a Family_Key gives `LEAKAGE_DETECTED`.
    - Files owned: `src/benchmark/__tests__/manifestSplitsLeakage.test.ts`.
    - _Requirements: 8.9, 9.7, 9.8, 10.4, 10.11_

  - [ ] 18.6 Implement the synthetic attestation adapter (A0-4)
    - `buildSyntheticAttestations(manifest: DatasetManifest, itemId: string): BenchmarkResult<ReadonlyMap<string, unknown>>`: pure, reads only the manifest (never a Ground_Truth_Artifact), returns one entry per `cardId` in the Item's `imageProvenance`, mapping field for field (`generator`, `generatorVersion`, `sourceId`, `seed`, `parametersDigest`, `imageDigest`) to restoration's `SyntheticImageAttestation` shape with no translation. An unknown `itemId`, or an Item with no `imageProvenance`, returns an error and never a fabricated or empty-by-accident attestation set.
    - `checkAttestationsAgainstDetection(attestations, detectedDigestTextByCard): BenchmarkResult<void>`: returns `DATASET_DIGEST_MISMATCH` naming the `cardId` when a card's manifest `imageDigest` differs from the digest text detection reported (`CardDetectionRecord.imageDigestText`), or when a card is missing on either side. No new error code is introduced.
    - Use the design's signatures exactly. Declare restoration's attestation shape structurally in `upstream/ports.ts` (frozen, task 2.8) and do not edit that file.
    - Files owned: `src/benchmark/adapters/syntheticAttestations.ts`.
    - _Requirements: 4.5, 9.4, 17.2, 25.1_

  - [ ]* 18.7 Write attestation adapter unit tests
    - Field-for-field mapping from a manifest fixture, one entry per card, digests in `"sha-256:<lowercase hex>"` form, unknown `itemId` and image-less Item return errors, a changed manifest `imageDigest` or changed detected digest text returns `DATASET_DIGEST_MISMATCH` naming the `cardId`, a card missing from either map returns the same code, the adapter reads no ground-truth path (called with a manifest only).
    - Files owned: `src/benchmark/__tests__/syntheticAttestations.test.ts`.
    - _Requirements: 4.5, 17.2, 25.1_

- [ ] 19. Dataset builder and tuning export (Crew-delegable, Group C)
  - Depends on: tasks 6.1, 7, 8, 9, 10, 12.3, 18. Files owned: `dataset/datasetBuilder.ts` (bodies), `adapters/restorationTuneExport.ts`, and the test files below.
  - [ ] 19.1 Implement `buildDataset`
    - Check `config` against `EXECUTION_PROFILE_BOUNDS` first (`LIMIT_EXCEEDED` before any generation), validate profiles, build and verify base decks, derive keys and seeds, apply cell damage (restoration and end-to-end tracks) and render and damage images (detection and end-to-end), write System_Input files under `system-inputs/` and ground truth under `ground-truth/` with neutral Item ids, assign splits, assert no cross-split family, then finalise and digest the manifest. Write to a staging directory and rename atomically only on full success, so no partial dataset remains on any error. Generated data goes under `data/generated` only.
    - Files owned: `src/benchmark/dataset/datasetBuilder.ts`.
    - _Requirements: 2.8, 3.5, 4.7, 5.6, 8.1, 8.2, 8.3, 9.1, 10.4, 22.7, 23.8_

  - [ ] 19.2 Implement the restoration tuning export
    - `writeRestorationTuningExport(manifest, rootDir, roles)` writes restoration's Minimal_Dataset_Format (a domain Deck JSON and a list of masked cells with known values), one file set per Split_Role, only for `tuning` and `calibration` (refusing `held-out` and `test` by name via `readRole`). Optional `familyKey` and `splitRole` fields are written only when restoration's importer tolerates them (they are tolerated by the amended tune script). Calibration and prior artifacts are validated with restoration's validators before saving.
    - Files owned: `src/benchmark/adapters/restorationTuneExport.ts`.
    - _Requirements: 10.10, 21.3, 21.4_

  - [ ]* 19.3 Write property test for invalid configurations
    - **Property 8: Invalid profiles and over-limit renders are refused before generation**
    - **Validates: Requirements 3.5, 4.7**
    - Seed `SEED_P8`, 150 runs; `arbInvalidProfile`, `arbOverLimitRenderSpec`; nothing is written on error.
    - Files owned: `src/benchmark/__tests__/datasetRefusals.props.test.ts`.

  - [ ]* 19.4 Write property test for leakage
    - **Property 9: No leakage from masked ground truth**
    - **Validates: Requirements 8.6, 8.8, 8.9, 28.10**
    - Seed `SEED_P9`, 100 runs; `arbTruthDeckPair`, `arbSystemInputFileSet`; deeply equal restoration output (through the fake restoration port when the real one is missing) and no truth value in any System_Input file.
    - Files owned: `src/benchmark/__tests__/leakage.props.test.ts`.

  - [ ]* 19.5 Write dataset builder unit tests
    - A quick-profile dataset builds and verifies, no partial dataset on an injected failure, Item ids encode no truth, tuning export contains only `tuning` and `calibration` file sets and the tune script's allow-list accepts them (when the script exists), `LIMIT_EXCEEDED` before any file is written.
    - Files owned: `src/benchmark/__tests__/datasetBuilder.test.ts`.
    - _Requirements: 8.3, 19.1, 21.3, 23.8_

- [ ] 20. Checkpoint - Groups A to C merged
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Evaluation tracks (single worker, not split, Group D)
  - Depends on: task 20. Files owned: `tracks/detectionTrack.ts`, `tracks/restorationTrack.ts`, `tracks/endToEndTrack.ts` (bodies), and the test file below.
  - [ ] 21.1 Implement the Detection_Track
    - For each item, decode the rendered image bytes and call `detect(imageBytes, profile, parameters)` through the vision index. Only `SystemInputRef`s are passed. Ground truth is loaded afterwards in the comparison step through `compareDetectionToTruth` and the detection metrics (task 11).
    - Files owned: `src/benchmark/tracks/detectionTrack.ts`.
    - _Requirements: 1.1, 1.6, 8.4, 8.5_

  - [ ] 21.2 Implement the Restoration_Track
    - For each item and each of the four conditions build a `RestorationInput` with the damaged Deck, `detectionEvidence` undefined, the condition's `RestorationConfig`, `deckOrigin: "synthetic"` and `syntheticEvaluationContext: true` (never `"real"`), and call `runInference` through the restoration index. Restoration-only decks have no image digest, so they carry no `syntheticAttestations`. Build the Proposal_View with `buildProposalView`. Run B1, B2, B3 on the same inputs and Items, and the abstain-all fixture is never run here.
    - Files owned: `src/benchmark/tracks/restorationTrack.ts`.
    - _Requirements: 1.2, 1.6, 16.4, 17.1, 17.2, 17.4_

  - [ ] 21.3 Implement the End_To_End_Track
    - For each card image: `detect`, then `mapDetection`, assemble the mapped cards into one Deck with the domain `createDeck` (never hand-built), build `DetectionEvidenceInput` from each `CardDetectionRecord` structurally (no cast, no `src/vision` import on the restoration call path), build the per-card `syntheticAttestations` with `buildSyntheticAttestations(manifest, itemId)` (A0-4), then call `checkAttestationsAgainstDetection(attestations, detectedDigestTextByCard)` with each `CardDetectionRecord.imageDigestText` and stop with the returned `DATASET_DIGEST_MISMATCH` (naming the `cardId`) before restoration runs, record the attestations in `RestorationRunContext`, pass them in the `RestorationInput` with `deckOrigin: "synthetic"` (never `"real"`), call `runInference`, build the Proposal_View, and report metrics also split by detection Condition. A track whose required input is absent is recorded `not-evaluated` with a reason.
    - Files owned: `src/benchmark/tracks/endToEndTrack.ts`.
    - _Requirements: 1.3, 1.6, 1.8, 14.10_

  - [ ]* 21.4 Write track wiring tests
    - With the fake upstream doubles: `runDetectionTrack` calls `detect` with no `GroundTruthRef`, `runRestorationTrack` passes no detection evidence, the end-to-end track builds the Deck through `createDeck`, a missing input gives `not-evaluated` with a reason, tracks run independently of each other.
    - Attestation example test (A0-4): an end-to-end run on an image-carrying deck with `deckOrigin: "synthetic"` and no `syntheticAttestations` fails with restoration's `INVALID_CONFIGURATION`, and the same run with attestations built by `buildSyntheticAttestations(manifest, itemId)` succeeds. Add the changed-digest case: altering one card's manifest `imageDigest` (or the digest text detection reports) makes `checkAttestationsAgainstDetection` return `DATASET_DIGEST_MISMATCH` naming that `cardId`, and `runInference` is never called. Add the restoration-track case: `runRestorationTrack` passes no `syntheticAttestations` (empty or absent) with `detectionEvidence` undefined and never builds an attestation. Run it against the real restoration export, and with the fake double (which models the same check) while the export is missing, skipped with a named reason if neither is usable. Also assert that no benchmark call site passes `deckOrigin: "real"`.
    - Files owned: `src/benchmark/__tests__/tracks.test.ts`.
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.8, 17.2_

- [ ] 22. Benchmark runner (single worker, not split, Group D)
  - Depends on: tasks 20, 21.1, 21.2, 21.3. Files owned: `runner/runtimeFile.ts`, `runner/benchmarkRunner.ts`, and the test files below.
  - [ ] 22.1 Implement the runtime file writer
    - `runtimeFile.ts` is the only module allowed to read a clock or hardware description. It writes wall-clock durations, hardware, Node or browser versions and the git commit (when available) to `runtime.json`, excluded from every digest and determinism comparison. Reference hardware (developer machine plus the CI Chromium/Node runner, Q4) and its specification are recorded beside every measured runtime. No budget is claimed met without a recorded measurement.
    - Files owned: `src/benchmark/runner/runtimeFile.ts`.
    - _Requirements: 9.9, 23.5, 23.10, 24.4_

  - [ ] 22.2 Implement `runBenchmark`
    - Order: `checkComponentVersions`, `verifyManifestArtifacts`, `checkOutputDirectory`, resolve Items per readable Split_Role through `readRole` (`test` only with the explicit option and a frozen register), run the requested tracks (each independent), compute every group's metrics, bootstrap intervals, baseline comparisons and calibration data, evaluate every Threshold_Register entry, select failure examples, assemble the user-comparison section and the real-photograph section, add the fixed honesty statements and profile `unverified` markers, assemble and digest the report. Enforce the budget through `enforceBudget` with times supplied by the runtime file (`BUDGET_EXCEEDED`, no partial report). Record Component_Stamp, register version and state, restoration conditions and configuration, tuned-constants identifiers, and which E-7 bounds were confirmed. A track without required input is `not-evaluated`, never omitted.
    - Files owned: `src/benchmark/runner/benchmarkRunner.ts`.
    - _Requirements: 1.5, 1.7, 1.8, 10.8, 10.9, 12.10, 17.5, 18.9, 23.4, 23.5, 23.7, 24.2, 24.3, 24.5_

  - [ ]* 22.3 Write property test for profile bounds and budgets
    - **Property 24: Execution-profile bounds and budgets are enforced before and during a run**
    - **Validates: Requirements 23.5, 23.8, 23.9**
    - Seed `SEED_P24`, 100 runs; `arbDatasetConfig` with one bound breached, `arbElapsedTime` near and over the budget, `arbEscapingPath`; no partial report and no file outside the output directories.
    - Files owned: `src/benchmark/__tests__/runnerLimits.props.test.ts`.

  - [ ]* 22.4 Write runner unit and example tests
    - A quick run with the fake upstream doubles produces a valid report that round-trips, a refused `test` read, a `not set` threshold shown as such, a user comparison `not-conducted` section, real-photograph `not-evaluated` section, a version mismatch stops the run before anything is read, the report states the synthetic disclaimer, no `B0` anywhere in the report.
    - Files owned: `src/benchmark/__tests__/runner.test.ts`.
    - _Requirements: 1.5, 1.8, 10.8, 16.9, 18.9, 24.3, 28.16_

- [ ] 23. Preliminary experiments E-1 to E-7 (Crew-delegable, Group E)
  - Depends on: tasks 19, 22. Files owned: `scripts/benchmark-experiment.ts`, `src/benchmark/experiments/*`, `data/benchmark/experiments/E-*.json`, and the test file below. Experiments record results and never assert a threshold, and none reads the `test` role.
  - [ ] 23.1 Implement the experiment harness with E-1 and E-2
    - `experiments/harness.ts` (shared record writer through `recordPreliminaryExperiment`), `experiments/e1RendererConformance.ts` (clean-image detection check, records the observed mismatch count that sets the E-1 tolerance), `experiments/e2DamageLevels.ts`. E-2 checks monotone degradation and distinct levels, then, on rendered occluded cards, confirms that cells whose Cell_Window coverage is at least `occlusionCoverFraction` are never classified observed-absent by detection and separately reports the rate at which cells below the fraction are forced to `unknown`, plus the per-level `occlusionCoverage` extents. E-2 fixes no pass or fail percentage and introduces no Threshold_Register entry. It may update `confirmedBy` and the `initial-unconfirmed` markers only through an explicit, recorded script option.
    - Files owned: `src/benchmark/experiments/harness.ts`, `src/benchmark/experiments/e1RendererConformance.ts`, `src/benchmark/experiments/e2DamageLevels.ts`.
    - _Requirements: 4.4, 7.6, 7.11, 7.12, 18.1, 18.2_

  - [ ] 23.2 Implement E-3, E-4 and E-5
    - E-3 detection threshold tuning reading only `tuning`; E-4 `PriorMeasurement` production on `tuning` and `calibration` through the adapter; E-5 calibration fit on `calibration` and a held-out calibration check on `held-out`. Each records seeds, roles read, configuration and results.
    - Files owned: `src/benchmark/experiments/e3DetectionTuning.ts`, `e4PriorMeasurement.ts`, `e5Calibration.ts`.
    - _Requirements: 15.5, 15.6, 17.3, 18.1, 18.2, 18.5_

  - [ ] 23.3 Implement E-6, E-7 and the experiment CLI
    - E-6 baseline comparison variance and sample-size sufficiency on `held-out`; E-7 runtime and size measurement per Execution_Profile on the reference hardware (specification recorded beside every number, Q4), confirming or revising the initial profile bounds. `scripts/benchmark-experiment.ts` is a thin CLI (`--experiment E-n --profile quick|full`) that calls the experiment function and writes under `data/benchmark/experiments/`.
    - Files owned: `src/benchmark/experiments/e6BaselineVariance.ts`, `e7Runtime.ts`, `scripts/benchmark-experiment.ts`.
    - _Requirements: 18.1, 18.2, 23.4, 23.10_

  - [ ]* 23.4 Write experiment tests
    - Every experiment function rejects a `test` role with `SPLIT_ROLE_FORBIDDEN`, each record is canonical and its digest verifies, a quick-profile E-2 run on the fake upstream doubles records both rates without any threshold field, no experiment modifies the Threshold_Register.
    - Files owned: `src/benchmark/__tests__/experiments.test.ts`.
    - _Requirements: 7.11, 18.2, 18.5_

- [ ] 24. CLI scripts and delegation wrappers (Crew-delegable, Group E)
  - Depends on: tasks 19, 22. Files owned: `scripts/benchmark-build-dataset.ts`, `benchmark-run.ts`, `benchmark-export-tuning.ts`, `benchmark-freeze-thresholds.ts`, `benchmark-browser-report.ts`, `benchmark-golden-update.ts` (owned by task 26.3), and the test file below. Task 24.3 also edits detection's three evaluation wrapper scripts (see its note).
  - [ ] 24.1 Implement the dataset and run scripts
    - Thin, headless, offline, non-interactive scripts: argument parsing, one library call, one file write. `benchmark-build-dataset.ts` (`--profile quick|full`, `--verify` runs `reproduceAndCompare`), `benchmark-run.ts` (`--profile`, tracks, writes the report, tables, CSV and runtime file). They import `src/benchmark` only through its index, compute no metric themselves, and never request the `test` role unless an explicit option is passed and the register is frozen.
    - Files owned: `scripts/benchmark-build-dataset.ts`, `scripts/benchmark-run.ts`.
    - _Requirements: 10.9, 21.1, 23.6, 23.7_

  - [ ] 24.2 Implement the export, freeze and browser-report scripts
    - `benchmark-export-tuning.ts` (tuning and calibration roles only), `benchmark-freeze-thresholds.ts` (one-way `draft` to `frozen`, requires an explicit confirmation flag), `benchmark-browser-report.ts` (regenerates the committed quick-profile Browser_Report under `data/benchmark/browser/` and rewrites `data/benchmark/browser/index.json` (A0-7), the only way those files are updated).
    - Files owned: `scripts/benchmark-export-tuning.ts`, `scripts/benchmark-freeze-thresholds.ts`, `scripts/benchmark-browser-report.ts`.
    - _Requirements: 10.10, 18.6, 21.3, 22.3, 22.6_

  - [ ] 24.3 Replace the detection wrapper stubs with delegation (Q3 (a))
    - Precondition: detection task 27 has landed (its three stubs exist). If it has not, stop and report instead of creating those files. Replace the stub bodies of `scripts/vision-eval-synthetic.ts`, `scripts/vision-eval-real.ts` and `scripts/vision-tune.ts` with delegation to `runBenchmark` / `runDetectionTrack` and the Dataset_Manifest `tuning` role reader, keeping the arguments and the "benchmark runner not available" behaviour unchanged when the runner export is absent. They compute no metric, import `src/benchmark` only through its index, never request `test`, and write `docs/vision-eval-synthetic.md` and `docs/vision-eval-real.md` only from a returned report (no number before a recorded run). `vision-tune.ts` keeps its script-local refusal of `held-out`, `test` and `calibration`.
    - Files owned: `scripts/vision-eval-synthetic.ts`, `scripts/vision-eval-real.ts`, `scripts/vision-tune.ts` (stub bodies only; this task is the single editor of these bodies after detection task 27).
    - _Requirements: 10.9, 13.6, 21.1, 28.14_

  - [ ]* 24.4 Write script tests
    - Each script is headless with a non-zero exit and a stated message on a refused role, an escaping output path or a missing input; `benchmark-run.ts --profile quick` on the fake upstream doubles writes a valid report; the freeze script is one-way; a static check shows no script computes a metric and none imports a non-index module.
    - Files owned: `src/benchmark/__tests__/scripts.test.ts`.
    - _Requirements: 10.9, 18.6, 23.6, 23.9_

- [ ] 25. Documentation of contracts, methods, data handling and assumptions (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `docs/benchmark-errors.md`, `docs/benchmark-metrics.md`, `docs/benchmark-data-handling.md`, `docs/benchmark-user-comparison.md`, `docs/benchmark-assumptions.md`, `src/benchmark/__tests__/docsErrorsSync.test.ts`. No code files are edited.
  - [ ] 25.1 Write the error list and the registry sync test
    - `docs/benchmark-errors.md` lists every code in `BENCHMARK_ERROR_CODES` with message and meaning. The sync test fails when the registry and the document differ. This test is required.
    - Files owned: `docs/benchmark-errors.md`, `src/benchmark/__tests__/docsErrorsSync.test.ts`.
    - _Requirements: 25.1, 25.4_

  - [ ] 25.2 Write the metrics document
    - `docs/benchmark-metrics.md`: every metric with formula, group, abstention handling and undefined conditions; the shared detection metric definitions; the three baselines and what each isolates; the within-card partner mapping and its conformance test; renderer and damage-model parameter names, units and simplifications; the bootstrap rule and the statement that intervals describe variation across generated designs; the restoration seed statement; occlusion definitions (Occlusion_Cover_Fraction is a per-Cell_Window fraction, distinct from Occlusion_Extent). No accuracy number appears.
    - Files owned: `docs/benchmark-metrics.md`.
    - _Requirements: 6.8, 12.1, 12.7, 16.3, 17.6, 7.5, 7.12_

  - [ ] 25.3 Write the data-handling document
    - `docs/benchmark-data-handling.md`: data kinds produced, where each is stored, which are committed (manifests, Threshold_Register, Damage_Level_File, small fixtures, Browser_Reports), how a local-only dataset is kept out of version control, MIT licensing of code and synthetic data, third-party licensing rules, no user photographs, no personal data, no network, the Component_Stamp rule (reports with different stamps are not compared as one system), and the reference hardware (developer machine plus the CI Chromium/Node runner) with its specification to be recorded beside each measured number.
    - Files owned: `docs/benchmark-data-handling.md`.
    - _Requirements: 22.7, 23.10, 24.5, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6_

  - [ ] 25.4 Write the user-comparison protocol document
    - `docs/benchmark-user-comparison.md`: task set, conditions (manual-only versus assisted, counterbalanced and seeded, practice task), primary measures reported together, minimum participants and tasks, stopping rule and analysis method fixed before data collection, informed consent, pseudonymous ids, no recordings, ethics review note, study result file format. States the default report status is `not-conducted`.
    - Files owned: `docs/benchmark-user-comparison.md`.
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [ ] 25.5 Write the assumptions document
    - `docs/benchmark-assumptions.md`: table of A1 to A10 and B1 to B6 with working value, basis, where code depends on it, and the correction path. State that none is verified, the Garín5 licence is unchecked and no dataset is redistributed, credits Rodas Lorente et al. (2025) and the Garín5 dataset, lists the upstream-availability result from task 1.1, and records the closed design questions (Q1 (a), Q2 (a), Q3 (a), Q4) with their approved answers.
    - Files owned: `docs/benchmark-assumptions.md`.
    - _Requirements: 11.8, 26.7, 26.8_

- [ ] 26. Cross-cutting property tests, goldens and regression file (Group E)
  - Depends on: see each sub-task. Files owned: the test and fixture files below, plus `scripts/benchmark-golden-update.ts`.
  - [ ]* 26.1 Write property test for determinism
    - **Property 1: Dataset and report generation is deterministic**
    - **Validates: Requirements 4.8, 5.7, 6.5, 9.1, 9.2, 9.3, 28.1, 28.4**
    - Seed `SEED_P1`, 40 runs; `arbQuickDatasetConfig` within the quick bounds with the fake upstream doubles; two independent builds and runs give byte-identical manifests, damaged decks, images and reports (runtime file excluded); one extra appended family does not change any existing derived seed.
    - Files owned: `src/benchmark/__tests__/determinism.props.test.ts`.

  - [ ]* 26.2 Write property test for round trip and corruption
    - **Property 21: Report, manifest and study-result import never yields a partial value**
    - **Validates: Requirements 19.9, 20.5, 20.6, 28.13**
    - Seed `SEED_P21`, 300 runs; valid `DatasetManifest`, `BenchmarkReport` and `StudyResultFile` texts, truncation at generated cut points (`INVALID_JSON`), `arbTextCorruption` tagged with expected codes, seeded single-byte corruption (error or a deeply equal value); export, import, export gives identical text.
    - Files owned: `src/benchmark/__tests__/roundTrip.props.test.ts`.

  - [ ] 26.3 Build the golden fixture and update script
    - Fixed `quick` dataset `golden-bench-1`: two families (`periodic` period 3, `random`), a small generated profile, one card occluded above `occlusionCoverFraction` and one below it, damage levels `light` and `moderate`, built through public operations with `SEED_GOLDEN` and the fake upstream doubles (so goldens do not depend on upstream implementations). `scripts/benchmark-golden-update.ts` regenerates the goldens and is run only on purpose.
    - Files owned: `src/benchmark/__tests__/golden/fixture.ts`, `scripts/benchmark-golden-update.ts`.
    - _Requirements: 28.15_

  - [ ] 26.4 Commit goldens and write the comparison tests
    - Committed goldens in `src/benchmark/__tests__/golden/`: `dataset-manifest.golden.json`, `benchmark-report.golden.json`, `summary-table.golden.md`, `summary.golden.csv`, `calibration-record.golden.json` (validated through restoration's `validateCalibrationRecord` when it exists). Tests assert byte equality, that an undefined value renders as `undefined` with its reason, and that no number appears in the report for a `not set` threshold. A golden change needs a stated reason in the commit message. These tests are required.
    - Files owned: `src/benchmark/__tests__/golden/*.golden.*`, `src/benchmark/__tests__/golden.test.ts`.
    - _Requirements: 21.1, 21.2, 28.15_

  - [ ] 26.5 Create the regression example file
    - Create `regressions.test.ts` with a header describing the rule that every shrunk counterexample found by any property in this suite is added here as a permanent example with its seed and a date-free description. Seed it with a trivial self-check that the file is run.
    - Files owned: `src/benchmark/__tests__/regressions.test.ts`.
    - _Requirements: 28.17_

- [ ] 27. Final guards and integration (Group E)
  - [ ] 27.1 Write the final repository guards
    - `src/benchmark/__tests__/guards.test.ts`: no file imports `_stub.ts`, then delete `_stub.ts`; the surface snapshot is unchanged since the freeze and `BENCHMARK_INTERFACE_VERSION` is `"1.0.0"`; `B0` is not exported from `index.ts` and not in `BASELINES`; the docs sync test and the five documents exist; `data/synthetic/damage-levels.json` validates, has `occlusionCoverFraction` 0.9 with `initial-unconfirmed`, and no file in the repository refers to `damage-levels.placeholder.json` or the marker `PLACEHOLDER, not benchmark-defined`; the committed Threshold_Register has no numeric value while any `settingExperiment` is `to be set from experiment E-n`; no file under `src/vision`, `src/restore`, `src/domain` or `src/workers` imports `src/benchmark`; no `src/benchmark` file outside the allow-list imports a non-index module of another source folder; no `src/benchmark` file outside `__tests__` uses a forbidden identifier (runtime file excepted); the three honesty statements are present verbatim in the Browser_Report builder. This test is required.
    - Files owned: `src/benchmark/__tests__/guards.test.ts`.
    - _Requirements: 7.7, 16.9, 18.4, 25.4, 27.1, 27.3, 27.4_

  - [ ]* 27.2 Write the end-to-end integration test
    - `src/benchmark/__tests__/integration.test.ts`: build a quick dataset, verify the manifest, run all tracks against the fake upstream doubles (and the real upstream libraries when they exist), run baselines B1 to B3, compute metrics, intervals and reliability data, evaluate thresholds, write the report, tables and Browser_Report, import them back, and assert the round trip, the separation of system inputs from ground truth, the `not-conducted` user comparison, the `not-evaluated` real-photograph section and that no `test`-role value appears.
    - Files owned: `src/benchmark/__tests__/integration.test.ts`.
    - _Requirements: 1.5, 9.1, 10.9, 20.5, 22.1, 28.4_

  - [ ]* 27.3 Write the error-code coverage test
    - `src/benchmark/__tests__/errorCodes.test.ts` triggers every code in `BENCHMARK_ERROR_CODES` through the public API at least once and fails when a registered code is never triggered (Req 25.5), including the stable message per code and the shape of the returned `Result`.
    - Files owned: `src/benchmark/__tests__/errorCodes.test.ts`.
    - _Requirements: 25.3, 25.5_

- [ ] 28. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Items awaiting user confirmation or an owner decision (none of these is settled by this plan):
    - **Upstream availability:** which of the domain, detection and restoration exports exist when execution starts (task 1.1 result), and therefore which `it.skip` tests (renderer conformance, within-card partner conformance, shared-metric P14, calibration-record validation) remain skipped.
    - **Design Q5 to Q10 (still open in requirements.md):** Q5 restoration track without image evidence (recommended as written), Q6 whether a user study will be run before submission (default `not-conducted`), Q8 generated-data folder name (`data/generated`; the Browser_Report location `data/benchmark/browser/` is settled), Q9 whether the UI only displays committed Browser_Reports (recommended), Q10 Garín versus small profiles split between `quick` and `full` (recommended small for `quick`, Garín for `full` and the bundled journey).
    - **Initial values to confirm by experiments:** every Damage_Level_File value including `occlusionCoverFraction` 0.9 and the per-level `occlusionCoverage` (E-2), the Execution_Profile bounds and budgets (E-7), the E-1 renderer tolerance, `MIN_LABELLED_CELLS_FOR_RATE`, and the stratum minima. None is a threshold.
    - **Seed block:** this plan uses `20260701` to `20260725` as the requirement and design state. Confirm it does not collide with another spec's block.
    - **Threshold freeze:** when to run `bench:threshold:freeze`, which is required before any `test`-role read or user-comparison task draw.
    - **Q1 follow-up:** if restoration later exports its partner mapping from its public index, the allow-listed internal import in task 7.5 can be removed.
    - **Detection wrappers:** task 24.3 depends on detection task 27 having landed. Confirm its status.
    - **Garín5 licence (A10):** unchecked. No real-photograph number is reported until a licensed, labelled folder with a README exists.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Required items include the import-boundary test (1.3), the surface snapshot (2.11), the docs sync test (25.1), the goldens (26.3, 26.4), the regression file (26.5) and the final guards (27.1), because they enforce stated requirements.
- Crew delegation summary (all tasks below start after the interface freeze, task 3, and edit no frozen file):

| Task | Group | Depends on | Files owned (disjoint) |
|------|-------|------------|------------------------|
| 4 | A | 3 | `seed.ts`, `canonicalJson.ts` |
| 5 | A | 3, 4.1 | `evaluation/metricValue.ts`, `evaluation/evaluationGroup.ts`, `evaluation/bootstrap.ts` |
| 6 | A | 3 | `runner/executionProfile.ts`, `runner/versionCheck.ts`, `runner/outputDirectory.ts` |
| 25 | A | 3 | `docs/benchmark-*.md`, `docsErrorsSync.test.ts` |
| 26.5 | A | 3 | `__tests__/regressions.test.ts` |
| 7 | B | 3, 4.1 | `families/*`, `dataset/profiles.ts`, `generators/families.ts` |
| 8 | B | 3 | `damage/damageLevelFile.ts`, `adapters/damageLevelForDetection.ts`, `data/synthetic/*`, `generators/damageLevels.ts` |
| 9 | B | 3, 4.1 | `damage/cellDamageModels.ts`, `generators/cellDamage.ts` |
| 10 | B | 3, 4.1 | `render/cardRenderer.ts`, `damage/imageDamageModels.ts`, `generators/images.ts` |
| 11 | B | 3, 5.1 | `evaluation/detectionMetrics.ts`, `generators/detection.ts` |
| 12 | B | 3, 5.1 | `evaluation/restorationMetrics.ts`, `evaluation/calibrationMetrics.ts`, `adapters/calibrationExport.ts`, `generators/metrics.ts` |
| 13 | B | 3 | `evaluation/baselines.ts`, `evaluation/evaluationPolicy.ts`, `__tests__/support/abstainAll.ts`, `generators/baselines.ts` |
| 14 | B | 3, 4.2 | `threshold/*`, `data/benchmark/threshold-register.json`, `generators/threshold.ts` |
| 15 | B | 3, 4.2, 5.2 | `userStudy/*`, `tracks/realPhotographTrack.ts` |
| 16 | B | 3, 4.2, 5.1 | `report/benchmarkReport.ts` |
| 17 | B | 3, 16.1 | `report/tables.ts`, `report/failureExamples.ts`, `report/browserReport.ts`, `generators/report.ts` |
| 18 | C | 3, 4, 7 | `dataset/{familyBuilder,splitAssignment,manifest,leakageGuard}.ts`, `adapters/syntheticAttestations.ts`, `generators/dataset.ts` |
| 19 | C | 6.1, 7, 8, 9, 10, 12.3, 18 | `dataset/datasetBuilder.ts`, `adapters/restorationTuneExport.ts` |
| 21 | D, single worker | 20 | `tracks/{detectionTrack,restorationTrack,endToEndTrack}.ts` |
| 22 | D, single worker | 20, 21 | `runner/runtimeFile.ts`, `runner/benchmarkRunner.ts` |
| 23 | E | 19, 22 | `experiments/*`, `scripts/benchmark-experiment.ts`, `data/benchmark/experiments/*` |
| 24 | E | 19, 22 | `scripts/benchmark-*.ts`, detection wrapper stub bodies (24.3 only) |
| 26.1 to 26.4 | E | 19, 22 | goldens, determinism and round-trip property tests, `scripts/benchmark-golden-update.ts` |
| 27 | E | all | `guards.test.ts`, `integration.test.ts`, `errorCodes.test.ts` |

- Each Crew task owns its tests and edits no file owned by another task. Shared generator files are split by owner so no two workers touch one file. No task edits `package.json` or any configuration file (A0-1). The integrator creates them at milestone M0 with all nine `bench:*` scripts pre-registered, and a worker who needs a change requests it from the integrator.
- Property coverage: P1 task 26.1; P2 9.2; P3 9.3; P4 10.3; P5 10.4; P6 8.3; P7 7.4; P8 19.3; P9 19.4; P10 18.4; P11 12.4; P12 12.5; P13 5.3; P14 11.2; P15 11.3; P16 13.4; P17 13.5; P18 13.6; P19 14.3; P20 14.4; P21 26.2; P22 17.4; P23 17.5; P24 22.3; P25 6.3. Seeds are `20260700 + n`.
- Requirement 28 items that are not properties: 28.2 and 28.3 are conventions, 28.15 is the golden tests (26.3, 26.4), 28.16 is covered by example tests in 14.5, 15.3 and 22.4, and 28.17 is the regression file (26.5).
- The benchmark tasks depend on the domain, detection and restoration libraries. Until a needed export exists, code uses the structural ports in `upstream/ports.ts` and tests use `fakeUpstream.ts`, and tests that need the real library are `it.skip` with a named reason. The goldens and the determinism property use the doubles so they stay stable when upstream implementations change.
- UI (spec 5) work is excluded. This plan provides what the UI consumes: the Browser_Report, the browser-safe reader and index, the fixed honesty statements, error messages and `unverified` markers.
- No accuracy, coverage, calibration or improvement threshold is fixed anywhere in this plan. Every number comes from a recorded run.
- To start executing, open this file and click "Start task" next to a task item.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5"] },
    { "id": 5, "tasks": ["2.6", "2.7"] },
    { "id": 6, "tasks": ["2.8"] },
    { "id": 7, "tasks": ["2.9"] },
    { "id": 8, "tasks": ["2.10"] },
    { "id": 9, "tasks": ["2.11"] },
    { "id": 10, "tasks": ["3"] },
    { "id": 11, "tasks": ["4.1", "4.2", "5.1", "6.1", "6.2", "25.1", "25.2", "25.3", "25.4", "25.5", "26.5"] },
    { "id": 12, "tasks": ["4.3", "5.2", "6.3", "6.4", "7.1", "7.2", "7.3", "8.1", "9.1", "10.1", "11.1", "12.1", "12.2", "13.1", "14.1", "15.1", "16.1"] },
    { "id": 13, "tasks": ["5.3", "5.4", "7.4", "7.5", "7.6", "8.2", "8.3", "9.2", "9.3", "9.4", "10.2", "10.5", "11.2", "11.3", "11.4", "12.3", "12.4", "12.5", "12.6", "13.2", "13.3", "13.4", "13.5", "13.7", "14.2", "14.3", "14.4", "15.2", "16.2", "17.1", "17.2", "17.3", "18.1"] },
    { "id": 14, "tasks": ["8.4", "10.3", "10.4", "10.6", "13.6", "14.5", "15.3", "17.4", "17.5", "17.6", "18.2", "18.3"] },
    { "id": 15, "tasks": ["18.4", "18.5", "18.6", "19.1", "19.2"] },
    { "id": 16, "tasks": ["18.7", "19.3", "19.4", "19.5"] },
    { "id": 17, "tasks": ["20"] },
    { "id": 18, "tasks": ["21.1", "21.2", "21.3"] },
    { "id": 19, "tasks": ["21.4", "22.1"] },
    { "id": 20, "tasks": ["22.2"] },
    { "id": 21, "tasks": ["22.3", "22.4", "23.1", "23.2", "23.3", "24.1", "24.2", "24.3", "26.1", "26.2", "26.3"] },
    { "id": 22, "tasks": ["23.4", "24.4", "26.4", "27.2", "27.3"] },
    { "id": 23, "tasks": ["27.1"] },
    { "id": 24, "tasks": ["28"] }
  ]
}

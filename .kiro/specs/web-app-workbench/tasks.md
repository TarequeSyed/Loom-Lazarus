# Implementation Plan: Web App Workbench

## Overview

This plan implements the Workbench in `src/ui` (React, Vite, strict TypeScript) with thin worker adapters in `src/workers`, following `design.md` and `requirements.md` (requirements 1 to 30). It is spec 5 of 5 (1 domain, 2 detection, 3 restoration, 4 benchmark, 5 workbench). No algorithm of a sibling spec is implemented here. The Workbench holds view state only and calls sibling public APIs.

Upstream dependency and stub policy:
- UI tasks depend on the `card-domain-and-loom-engine`, `card-detection`, `restoration-engine` and `benchmark-and-evaluation` libraries (their public indexes, plus the browser-safe Report_Reader of benchmark). Those libraries may not be implemented when a UI task starts.
- Where an upstream export does not exist yet, the task codes against a structural port type declared in `src/ui/upstream/ports.ts` (task 2.4) and tests against test doubles in `src/ui/__tests__/support/fakeUpstream.ts` (the same approach as `benchmark-and-evaluation`'s `upstream/ports.ts`). Ports are declared structurally so that real exports satisfy them without a cast. The doubles are deterministic and seeded (a fake detector that returns a fixed `DetectionResult`, a fake restoration host that returns fixed Hypotheses, a fake loom that follows the domain `step`/`seek` contract, a fake Report_Reader). Tests that need a real upstream library are `it.skip` with the reason "upstream library not available" until the export exists. No test is deleted because a library is missing.
- Task 1.1 records which upstream exports exist when execution starts, in `docs/ui-assumptions.md` (task 37.2).
- The P0 journey test (task 19.1) runs on the real libraries when they exist and on the doubles otherwise. The result is recorded either way.
- Sibling specs are not changed here. Needed sibling amendments are only listed (task 37.2 and the final checkpoint).

Resolved decisions reflected here:
- **Q2:** state is a hand-written reducer store with `useSyncExternalStore`. No state library.
- **Q3:** the Demo_Bundle ships an optional precomputed `DetectionResult`, used only after `BACKEND_LOAD_FAILED` and labelled "precomputed, not detected in your browser".
- **Q4:** Verified_Export_Mode needs all eleven Required_Verified_Fields `verified` with a citation and stays disabled until then. Unverified downloads start on one activation with embedded Unverified_Assumption_Metadata and no acknowledgement step or dialog.
- **Q5:** the loom "Replay" control (restart playback) and the digest-verified domain "Replay session" are two separately named controls.
- **Q6:** every external boundary is validated at runtime by calling the owner's validator. The Workbench adds exactly four validators: Trail_Data, Demo_Bundle manifest, route parameters, user-entered text.
- **Q7:** English only. User-facing strings are centralised (glossary terms module and one `strings.ts` per screen).
- **Q8:** the full Benchmark Lab is P1. A small P0 results summary surface, fed by the BrowserReport reader, shows essential benchmark results in P0 (task 17.1).
- **Q9:** the Kiro Trail / About screen is P1. Credits and the Educational_Label are P0 (Shell).
- **Q10:** hosting stays undecided until deployment planning. This plan has one static-build task (18.2) and a documentation note (37.1) and no hosting task.
- The design has no numbered Correctness Properties section. The UI-side pure-logic property tests listed under the design's Testing Strategy (P1 to P10, seeds `20260801` to `20260810`) are sub-tasks, tagged with the table row they implement.

Amendments from plan batch A0 (design "Amendment record"), applied as small edits with numbering unchanged:
- **A0-1:** the integrator, not a task, creates `package.json`, `vite.config.ts`, `vitest.config.ts` and `playwright.config.ts` at milestone M0. Task 1.2 verifies them.
- **A0-3:** `PriorGatePanel` (task 22.3) is P0 and is built before app wiring (task 18). It has two cases: an attested synthetic deck (a toggle, with the Synthetic_Deck_Notice) and a real deck (recorded enablement with a note, with the Synthetic_Prior_Warning).
- **A0-4:** the attestation flow (`decideDeckOrigin`, `checkBundledImageDigest`, `buildBundledAttestations`, `DEMO_BUNDLE_DIGEST_MISMATCH`, `SimulatedDemoBadge`, `ContextCardLabel`) is added to tasks 2, 7, 10, 11, 13 and 21. The UI computes the digest `"sha-256:<lowercase hex>"` itself with `crypto.subtle.digest`, because the vision public index does not export `sha256Hex` and the UI must not import vision internals.
- **A0-5:** the Demo_Bundle is built in two steps: a placeholder bundle from test doubles (task 10.1), then regeneration from the real pipeline (task 10.6), with a release-build guard that fails on any placeholder.
- **A0-7:** the Results_Summary reads `data/benchmark/browser/index.json` through the browser-safe reader.
- **A0-9:** `insertDetectedCard` (domain `insertCard` at `damagedCardIndex`) runs before restoration (task 18.1). An upload with no Context_Deck gets the "within-card structure only" statement.

The plan is ordered so that interfaces come first:
- **Tasks 1 and 2:** repository preparation, then every interface: Workbench error registry and Error_Map types, route types, view state and store action types, view-model types and component prop contracts, restoration worker protocol types, upstream ports and doubles, Demo_Bundle and Trail_Data schema types, design tokens as data, signature stubs, and the interface surface snapshot.
- **Task 3: INTERFACE FREEZE.** After it, frozen signatures change only through a spec update (Req 29.1, 29.2).
- **Tasks 4 to 20 (P0):** foundation modules, then screens, then wiring, the static build and the Playwright journey. The P0 journey (Demo_Bundle card, detection, restoration, approval, loom, export) is completable and testable end to end at checkpoint 20, before any P1 or P2 task starts.
- **Tasks 21 to 30 (P1):** the remaining screen features, Benchmark Lab, Kiro Trail, guidance, workspace export, boundary tests and the accessibility suite.
- **Tasks 31 to 33 (P2):** ambient motifs, opt-in storage, synchronised zoom.
- **Tasks 34 to 39:** measurement scripts, goldens, documentation, final guards and the final checkpoint.

Out of scope (other specs or non-goals): detection, restoration, benchmark and loom algorithms, running benchmarks in the browser, accounts, server storage, physical loom control, internationalisation, changes to sibling specs.

Conventions for every task:
- **Tier tag.** Every task carries `[P0]`, `[P1]` or `[P2]` in its title. A task that cannot be removed without breaking P0 is P0.
- Inside `src/ui` modules that produce an engine-derived displayed value must contain no inference, detection, metric or loom computation (Req 1.9), no `Math.random` and no wall-clock read. The only clock reads are the rAF scheduler timing (task 15.1) and the optional Opaque_Timestamp_Label supplier (a separate file, `viewState/clock.ts`, task 6.2).
- Each property test is a single `fc.assert(fc.property(...), { seed, numRuns })`. Seeds come from `src/ui/__tests__/seeds.ts` (`SEED_P1` to `SEED_P10`, value `20260800 + n`, and `SEED_GOLDEN = 20260890`). `numRuns` is at most 500. Each test has a tag comment `// Feature: web-app-workbench, Property row N: <title>` (the design's Testing Strategy row), an adjacent generator-precondition and seed comment, and `verbose: 1` so failure prints the seed and the shrunk counterexample (Req 28.9).
- Every shrunk counterexample becomes a permanent example in `src/ui/__tests__/regressions.test.ts` (task 35.3, Req 28.13).
- A failed sibling call leaves `SessionArtifacts` unchanged and the displayed state equal to the previous state (Req 1.6, 30.5). No function returns a partial value.
- Every user-facing error goes through `mapError`. No component builds error text itself (Req 20).
- Every restoration confidence shown carries its Calibration_Marker. `null` is shown as "not evaluated", never 0 (Req 26).
- Code that depends on an unverified Garín fact carries `// UNVERIFIED <id>: see .kiro/steering/jacquard-card-format.md`.
- Every colour or marker conveys information with a shape or pattern and a text label as well (Req 22.1).
- A worker edits only the files its task owns. Frozen files change only through a spec update. A worker that finds a frozen signature must change stops and reports.
- Run tests with `vitest --run` and Playwright in non-watch mode, never watch mode. Do not start dev servers from a task. Tell the user to run `npm run dev` manually.
- No task asserts a performance, accuracy or time-saving threshold. Measurement tasks record numbers with their reference hardware and report a Budget as met, not met or not measured (Req 24.5).
- Generated data goes only under `data/generated` (not committed). The Demo_Bundle lives under `data/demo`. User photographs are never committed.

## Tasks

- [ ] 1. [P0] Repository preparation and scaffold
  - [ ] 1.1 [P0] Verify steering, folders and upstream libraries (no edit)
    - Read `.kiro/steering/structure.md` and confirm it lists `src/ui`, `src/workers` and the `scripts` folder, and that `scripts` writes generated data only under `data/generated`. Do not edit the file. If an entry is missing, stop and report because steering changes need approval.
    - Check which exports from the four sibling public indexes named in design "Reconciliation table (Q1)" exist, and which are missing. Record the result as a short list for `docs/ui-assumptions.md` (task 37.2) so later tasks know which tests run on real libraries and which run on doubles.
    - Files owned: none (read-only verification).
    - _Requirements: 1.1, 29.1_

  - [ ] 1.2 [P0] Scaffold `src/ui` skeleton, seeds and helpers, and verify the integrator's configuration
    - Create the `src/ui` and `src/workers` skeleton from the design's module layout (placeholder files only, `__tests__/`, `__tests__/support/`, `__tests__/golden/`, `upstream/`).
    - Create `src/ui/__tests__/seeds.ts` with `SEED_P1` to `SEED_P10` (`20260800 + n`) and `SEED_GOLDEN = 20260890`, and `src/ui/__tests__/helpers.ts` (deepFreeze, clone-before helpers reused or mirrored from the domain).
    - This task does not create or edit `package.json`, `vite.config.ts`, `vitest.config.ts` or `playwright.config.ts` (A0-1). The integrator creates them at milestone M0 with every script pre-registered (`build`, `preview`, `test:ui`, `test:e2e`, `test:a11y`, `build:trail`, `build:demo`, `measure:ui`, `golden:ui:update`), the React and test dependencies (`react`, `@testing-library/react`, `@axe-core/playwright`, `@playwright/test`), no state-management or schema-validation library (Q2, Q6), the `VITE_DISABLE_P2` define, worker module support, the jsdom environment for component tests, and Chromium plus tablet and narrow Playwright projects on the static preview of the built site.
    - Verify that each of those items exists. If one is missing or wrong, stop and ask the integrator for the change. Do not edit the files.
    - Files owned: `src/ui/__tests__/seeds.ts`, `src/ui/__tests__/helpers.ts`, folder skeleton. Read-only verification of the four configuration files and `package.json`.
    - _Requirements: 1.1, 2.6, 28.8, 28.9_

  - [ ] 1.3 [P0] Write the import-boundary and validator-ownership tests
    - Create `src/ui/__tests__/boundary.test.ts` using the TypeScript compiler API over every `.ts` and `.tsx` file in `src/ui`, `src/workers`, `src/domain`, `src/vision`, `src/restore`, `src/benchmark`.
    - Fail on: an import in `src/ui` or `src/workers` that resolves to a non-index module of `src/domain`, `src/vision` or `src/restore`; an import of `src/benchmark` other than the browser-safe `report/browserReport.ts` path; any file in `src/domain`, `src/vision`, `src/restore`, `src/benchmark` that imports `src/ui` or `src/workers`; a Node-only module (`fs`, `path`, `os`, `child_process`, `node:*`) imported by a file reachable from the `src/ui` render path (scripts exempt); a module in `src/ui` that imports a benchmark module that reads ground truth; and a local function in `src/ui` whose name is on the deny-list of sibling concepts (`computeReadOrder`, `computeConfidence`, `computeAccuracy`, and similar), kept beside the test (Req 1.9).
    - Create `src/ui/__tests__/validatorOwnership.test.ts` that scans `src/ui` for `JSON.parse` call sites and fails when one is not immediately passed to an Owner_Validator listed in `boundaries/boundaryRegistry.ts` or to one of the four Workbench validators (Req 30.6).
    - Add a negative self-test for each that feeds an in-memory violating source and expects failure. Skip nothing: both tests pass trivially on the scaffold and become binding as code lands.
    - Files owned: `src/ui/__tests__/boundary.test.ts`, `src/ui/__tests__/validatorOwnership.test.ts`.
    - _Requirements: 1.1, 1.2, 1.3, 1.9, 30.6_

- [ ] 2. [P0] Interface definitions
  - [ ] 2.1 [P0] Define the Workbench error registry, `MappedError` and Error_Map types
    - `boundaries/boundaryRegistry.ts` (types and constants only): `WORKBENCH_ERROR_CODES` tuple (`UNKNOWN_SCREEN`, `MALFORMED_ROUTE`, `TEXT_LENGTH_OUT_OF_RANGE`, `TEXT_CONTROL_CHAR`, `DEMO_BUNDLE_MANIFEST_INVALID`, `DEMO_BUNDLE_DIGEST_MISMATCH` (carries the computed and the expected digest as values; not a load failure, the bundle then loads as an unattested image with `deckOrigin` "real"), `TRAIL_DATA_INVALID`, `WORKSPACE_DATA_INVALID`, plus the restoration-host codes `RESTORATION_PROTOCOL_UNSUPPORTED` and `RESTORATION_WORKER_FAILED`), `WorkbenchErrorCode`, `WorkbenchError`, and `BOUNDARY_OWNERS` (the Boundary-to-Owner map from the design).
    - `viewState/errorMap.ts` types: `ErrorSource`, `ErrorMapKey`, `ErrorMapEntry`, `MappedError`, `ERROR_MAP` declaration, `mapError` signature.
    - Files owned: `src/ui/boundaries/boundaryRegistry.ts` (types and constants), `src/ui/viewState/errorMap.ts` (types).
    - _Requirements: 20.1, 20.3, 30.7, 30.9_

  - [ ] 2.2 [P0] Define route, view state, session artifacts and store action types
    - `app/routes.ts` types: `ROUTE_SCREENS` tuple, `RouteScreen`, `ParsedRoute`, `RouteParamError`, `parseRoute` and `buildRoute` signatures. `app/sessionArtifacts.ts` types: `SessionArtifacts`. `viewState/types.ts`: `ViewState` tree. `ViewState` also holds the view data `digestCheck` (the `DigestCheck` of the bundled card) and `deckOriginDecision` (the `DeckOriginDecision`), never in `SessionArtifacts`. `app/AppStore.ts` types: `AppState` (the two slices `artifacts` and `view`, never merged), the action union (`ARTIFACTS_REPLACED`, `ARTIFACTS_CALL_FAILED`, view actions), `Store`, `useStoreSlice(selector)` signature, `dispatchSiblingCall` signature.
    - Add a compile-time test (`// @ts-expect-error`) that `ViewState` is not assignable where `SessionArtifacts` is expected.
    - Files owned: `src/ui/app/routes.ts` (types), `src/ui/app/sessionArtifacts.ts`, `src/ui/viewState/types.ts`, `src/ui/app/AppStore.ts` (types), `src/ui/__tests__/stateTypes.test.ts`.
    - _Requirements: 1.4, 1.6, 1.7, 25.8, 30.4_

  - [ ] 2.3 [P0] Define view-model types and component prop contracts
    - `viewState/selectors.ts` types: `CardViewModel`, `CellViewModel`, `ScreenViewModel` per screen, `LoomViewModel`, `ResultsSummaryViewModel`. `viewState/provenanceMarker.ts` types (`ProvenanceMarker`: colour, shape, label). `viewState/confidenceDisplay.ts` types (`ConfidenceDisplay`). `viewState/clickCounter.ts` types (`ClickCounterState`, `ClickCounterAction`). `shared/export/requiredVerifiedFields.ts` types (`RequiredVerifiedFieldStatus`). Prop interfaces for every component in the design's "Key component contracts" (`CardViewerProps`, `RegionInspectorProps`, `AlternativesPanelProps`, `CorrectionToolbarProps`, `ApprovalPanelProps`, `ExportPanelProps`, `LoomStageProps`, `PlaybackControlsProps`, `ReliabilityDiagramProps`, `BaselineComparisonProps`, `GlossaryTooltipProps`, `PriorGatePanelProps` with `PriorGateCase` and `PriorGateRow`, `SimulatedDemoBadgeProps`, `ContextCardLabelProps`, `DeckContextNoticeProps`) in each component's own `props.ts` file.
    - Files owned: type sections of the files named above, and `*/props.ts` files for each screen folder.
    - _Requirements: 9.2, 9.6, 11.3, 13.1, 14.2, 15.7, 18.8, 26.2, 29.2_

  - [ ] 2.4 [P0] Define the restoration worker protocol, upstream ports and test doubles
    - `workers/host/restorationWorkerHost.ts` types: `RESTORATION_PROTOCOL_VERSION`, `SerialisableRestorationInput`, `RestorationRunMessage`, `RestorationResultMessage`, `RestorationErrorMessage`, `RestorationCancelMessage`, `RestorationWorkerHost`, `createRestorationWorkerHost` signature. `workers/host/detectionClient.ts` type re-exports, `workers/host/workerFactory.ts` and `protocolVersion.ts` types.
    - `src/ui/upstream/ports.ts`: structural port types for every sibling export the Workbench calls (see design Reconciliation table): the domain functions (`userEdit`, `undoEdit`, `create`, `step`, `seek`, `reset`, `pause`, `resume`, `makeLoomConfig`, `exportDeckJson`, `importDeckJson`, `exportDeckSvg`, `exportCardSvg`, `replaySession`), vision (`createDetectionClient`, `mapDetection`, the correction functions, `importDetectionResult`), restoration (`applyReviewAction`, `approveDeck`, `undoReviewAction`, `buildEvidenceView`, `buildConfidenceHeatmap`, `deriveCellState`, `deriveRegionState`, `deriveDeckState`, `evaluatePriorGate`, `recordSyntheticPriorEnablement`, `importRestorationRecord`), and the benchmark browser-safe reader. Declared structurally so real exports satisfy them with no cast.
    - `src/ui/__tests__/support/fakeUpstream.ts`: deterministic test doubles for each port.
    - Files owned: type sections of the files named above, `src/ui/upstream/ports.ts`, `src/ui/__tests__/support/fakeUpstream.ts`.
    - _Requirements: 1.8, 6.1, 10.1, 24.1, 29.1, 29.3_

  - [ ] 2.5 [P0] Define Demo_Bundle and Trail_Data schema types
    - `demoBundle/demoBundleTypes.ts` (`DemoBundleManifest` with `imageDigest`, `damagedCardIndex`, context-deck and `SampleMeta` references, recorded Orientation and loom configuration, and the `placeholder` flag; `DemoBundle`, `validateDemoBundleManifest` and `loadDemoBundle` signatures), signatures for `demoBundle/digest.ts` (`sha256DigestString(bytes): Promise<string>`), `demoBundle/attestation.ts` (`DigestCheck`, `checkBundledImageDigest`, `buildBundledAttestations`), `demoBundle/deckOrigin.ts` (`DeckOriginDecision`, `decideDeckOrigin`) and `demoBundle/contextDeck.ts` (`insertDetectedCard`), `trail/trailTypes.ts` (`TrailEntry`, `TrailData`, `RawTrailEntry`, `ExclusionReport`, `parseTrailMarkdown`, `verifyEntry`, `buildTrailData` signatures, `validateTrailData` and `loadTrailData` signatures).
    - Files owned: `src/ui/demoBundle/demoBundleTypes.ts`, `src/ui/trail/trailTypes.ts`.
    - _Requirements: 4.3, 6.8, 17.2, 17.3, 30.2, 30.7_

  - [ ] 2.6 [P0] Define design tokens as data
    - `shared/tokens/colour.ts`, `type.ts`, `space.ts`, `motion.ts`, `motif.ts`: exact values from the design's Design Tokens tables (palette, text and border colours, provenance and state markers with colour, shape and label, the confidence ramp with patterns, typography scale, spacing, radii, elevation, motion tokens with reduced-motion substitutions, motif opacity ceiling). Data only, no component code. Mark each value that the design calls an initial value.
    - Files owned: `src/ui/shared/tokens/*.ts`.
    - _Requirements: 9.2, 9.6, 22.1, 22.2, 22.4, 22.7_

  - [ ] 2.7 [P0] Declare signature stubs for every remaining module
    - In each file below, export the final function and component signatures from the design with TSDoc. Bodies call a temporary `notImplemented()` helper in `src/ui/_stub.ts`.
    - Files: `app/routes.ts`, `app/AppStore.ts`, `viewState/{selectors,provenanceMarker,confidenceDisplay,clickCounter,errorMap}.ts`, `boundaries/{routeParams,userText,demoBundleManifest,trailData}.ts`, `demoBundle/{loadDemoBundle,digest,attestation,deckOrigin,contextDeck}.ts`, `trail/loadTrailData.ts`, `workers/host/*.ts`, `shared/export/{exportModes,requiredVerifiedFields}.ts`, `persistence/workspaceStorage.ts`, `scripts/build-trail.ts` function signatures.
    - `_stub.ts` is temporary. Task 38.1 asserts that nothing imports it and deletes it.
    - _Requirements: 29.2_

  - [ ] 2.8 [P0] Create the interface barrel and the surface snapshot test
    - Create `src/ui/contracts.ts` re-exporting every frozen type, constant and signature (route, state, view-model, props, worker protocol, ports, Demo_Bundle and Trail_Data types, error registry, tokens). Nothing in `src/` imports `contracts.ts` except tests (the boundary test asserts it). Add `WORKBENCH_INTERFACE_VERSION = "1.0.0"`.
    - Create `src/ui/__tests__/surface.test.ts` comparing the sorted exports of `contracts.ts` with a committed `surface.snapshot.json`, and asserting `WORKBENCH_INTERFACE_VERSION` exists. Any later snapshot change requires a spec update. This test is required.
    - Files owned: `src/ui/contracts.ts`, `src/ui/__tests__/surface.test.ts`, `src/ui/__tests__/surface.snapshot.json`.
    - _Requirements: 29.1, 29.2, 29.3_

- [ ] 3. INTERFACE FREEZE checkpoint
  - Ensure `vitest --run` and the type check pass, the surface snapshot is committed, the boundary and validator-ownership tests pass, and the stub list in task 2.7 is complete.
  - From this point every type file, props file, `contracts.ts`, token data file and exported signature changes only through a spec update. Crew workers must not edit frozen files. Component and module bodies are not frozen.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. [P0] Design tokens runtime and global styles (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `src/ui/styles/*`, `src/ui/assets/fonts/*`, `shared/tokens/cssVariables.ts`, and the test file below.
  - [ ] 4.1 [P0] Implement global styles, CSS variables and self-hosted fonts
    - Generate CSS custom properties from the token data files (no duplicated hex values). Add `@font-face` rules for Spectral, Inter and JetBrains Mono as subset WOFF2 files under `src/ui/assets/fonts/` with `font-display: swap` and no external font URL. Add a focus-ring style (token `color.focus`, at least 3:1), the skip-link style, the `prefers-reduced-motion` rules (stop ambient animation, remove non-essential transitions), the visually-hidden utility, and the tablet and narrow breakpoints.
    - Document the font licences in `src/ui/assets/fonts/README.md`.
    - Files owned: `src/ui/styles/*`, `src/ui/assets/fonts/*`, `src/ui/shared/tokens/cssVariables.ts`.
    - _Requirements: 3.9, 21.2, 22.2, 22.4, 23.1_

  - [ ]* 4.2 [P0] Write the contrast, token-sync and no-external-font tests
    - Compute WCAG contrast ratios from the token data for every pairing in the design's contrast table (plain background and the 8%-white-mix noise approximation) and fail below 4.5:1 for text or 3:1 for components. Diff `shared/tokens/*` against a checked-in copy of the design tables (Design-token sync test). Scan built CSS and HTML for `fonts.googleapis.com`, `fonts.gstatic.com` and any cross-origin `@font-face` `url()`, and fail on a match.
    - Test design: Design Tokens (Contrast measurements), Testing Strategy (Design-token sync test).
    - Files owned: `src/ui/__tests__/tokens.test.ts`, `src/ui/__tests__/noExternalFonts.test.ts`.
    - _Requirements: 3.9, 22.2, 22.3_

- [ ] 5. [P0] Route parser and Workbench-owned boundary validators (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `app/routes.ts` (bodies), `boundaries/routeParams.ts`, `boundaries/userText.ts`, `boundaries/demoBundleManifest.ts`, `boundaries/trailData.ts`, and the test files below.
  - [ ] 5.1 [P0] Implement `parseRoute` and `buildRoute`
    - Accept only a screen identifier from `ROUTE_SCREENS`. Unknown, malformed, extra-segment, query-string and markup-bearing input returns a `RouteParamError`, and the caller opens the start view. The raw string is never used as a DOM id, a path or a request address. `buildRoute` is the only place a path string is constructed. No image, deck, record or personal data in the address.
    - Files owned: `src/ui/app/routes.ts`, `src/ui/boundaries/routeParams.ts`.
    - _Requirements: 25.8, 30.2, 30.4_

  - [ ] 5.2 [P0] Implement the user-text, Demo_Bundle manifest and Trail_Data validators
    - `validateUserText(kind, raw)`: note 1 to 1,000 characters after trimming, weaversLabel 1 to 64, no control character other than line feed and tab, value returned unchanged. `validateDemoBundleManifest(json)`: size check before parse, `format`, `schemaVersion`, unknown-field walk, orientation in {0, 90, 180, 270}, non-empty hook mapping and mirror strings (semantic checking stays with the domain `makeLoomConfig`), asset paths same-origin relative. `validateTrailData(json)`: `format`, `schemaVersion`, unknown field, entry array shape, opaque string fields. Each returns a `WorkbenchError` with a path and returns no partial value. Colour values go to the domain colour validator, not here.
    - Files owned: `src/ui/boundaries/userText.ts`, `src/ui/boundaries/demoBundleManifest.ts`, `src/ui/boundaries/trailData.ts`.
    - _Requirements: 4.3, 17.2, 30.2, 30.3, 30.5, 30.7_

  - [ ]* 5.3 [P0] Write property test for the route parser
    - **Row P5: Route parser accepts exactly the five screens plus start**
    - Seed `SEED_P5`, 300 runs; `fc.oneof(fc.constantFrom(...ROUTE_SCREENS), fc.string())`; malformed input always yields `UNKNOWN_SCREEN` or `MALFORMED_ROUTE`, never a throw.
    - Test design: Testing Strategy (unit and property tests, P5).
    - **Validates: Requirements 30.4**
    - Files owned: `src/ui/__tests__/routes.props.test.ts`.

  - [ ]* 5.4 [P0] Write property test for the user-text validator
    - **Row P6: User-text validator boundaries**
    - Seed `SEED_P6`, 300 runs; `arbUserText` (0 to 1,100 characters, with and without control characters) for both kinds, boundary-exact at 1, 1000 and 64 characters.
    - **Validates: Requirements 30.3**
    - Files owned: `src/ui/__tests__/userText.props.test.ts`, `src/ui/__tests__/generators/text.ts`.

  - [ ]* 5.5 [P1] Write property test for the manifest and Trail_Data validators
    - **Row P9: Demo_Bundle manifest and Trail_Data validators reject malformed input without partial values**
    - Seed `SEED_P9`, 300 runs; `arbJsonCorruption` (missing field, wrong type, unknown field, oversized) against both validators.
    - **Validates: Requirements 30.5, 30.7, 30.8**
    - Files owned: `src/ui/__tests__/workbenchValidators.props.test.ts`, `src/ui/__tests__/generators/corruption.ts`.

  - [ ]* 5.6 [P0] Write route and validator unit tests
    - Worked examples for each screen path, the start path, each error code of the four validators with its path, exactly at each text limit and one beyond.
    - Files owned: `src/ui/__tests__/boundaries.test.ts`.
    - _Requirements: 30.3, 30.4, 30.7_

- [ ] 6. [P0] Store, reducers and sibling-call dispatch (Crew-delegable, Group A)
  - Depends on: task 3, task 7.1 (for 6.2). Files owned: `app/AppStore.ts` (bodies), `app/sessionArtifacts.ts` (bodies), `viewState/clock.ts`, and the test file below.
  - [ ] 6.1 [P0] Implement the store and reducer
    - Hand-written `createStore(reducer, initialState)` (about 40 lines) with `useSyncExternalStore` subscription and `useStoreSlice(selector)`. Two independent slices: `artifacts` (replaced wholesale by `ARTIFACTS_REPLACED`) and `view`. `ARTIFACTS_CALL_FAILED` updates only `view.lastError`, never `artifacts`. Pure reducer, no side effects, no timers. No state library (Q2).
    - Files owned: `src/ui/app/AppStore.ts`, `src/ui/app/sessionArtifacts.ts`.
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

  - [ ] 6.2 [P0] Implement `dispatchSiblingCall` and the clock supplier
    - `dispatchSiblingCall(fn, args)`: awaits async worker-backed calls or calls synchronous domain functions, then dispatches exactly one `ARTIFACTS_REPLACED` or `ARTIFACTS_CALL_FAILED` carrying the sibling `Result`. On `{ok:false}` calls `mapError` once. An unexpected exception is caught and routed to the error boundary state, never rethrown to a component. `viewState/clock.ts` supplies an optional Opaque_Timestamp_Label (at most 64 characters, stored unparsed) or none. No other file reads a clock.
    - Files owned: `src/ui/app/dispatchSiblingCall.ts`, `src/ui/viewState/clock.ts`.
    - _Requirements: 1.5, 1.6, 1.10, 20.6_

  - [ ]* 6.3 [P0] Write store and reducer tests
    - A failed call leaves `artifacts` deeply equal to its earlier value and the displayed values unchanged. `view` changes never touch `artifacts`. A successful call replaces `artifacts` by the returned value, not a transformed copy. Slice subscription re-renders only the slice that changed. Use the doubles from `fakeUpstream.ts`.
    - Test design: Architecture (State management, Q2), Error Handling (No partial state).
    - Files owned: `src/ui/__tests__/store.test.ts`.
    - _Requirements: 1.5, 1.6, 1.7_

- [ ] 7. [P0] Error_Map and its coverage test (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `viewState/errorMap.ts` (bodies and entries), `boundaries/boundaryRegistry.ts` (messages only), and the test file below.
  - [ ] 7.1 [P0] Implement `mapError` and the `ERROR_MAP` entries
    - One entry for every code in the domain `ERROR_CODES`, vision `VISION_ERROR_CODES`, restoration `RESTORATION_ERROR_CODES` and `ABSTENTION_REASONS`, benchmark `BENCHMARK_ERROR_CODES`, and `WORKBENCH_ERROR_CODES`. Each entry has a plain-language English message and at least one recovery action. `CANCELLED` maps to a neutral message not styled as a failure. `mapError` carries the supplied values (limits, path of the first violation) and the original code and message for a details area. The `DEMO_BUNDLE_DIGEST_MISMATCH` entry shows the computed and the expected digest and states that the card is treated as an unattested image (Deck_Origin "real"). Where a sibling registry does not exist yet, the codes are read from the port types and the coverage test (7.2) skips that registry with the named reason.
    - Files owned: `src/ui/viewState/errorMap.ts`, `src/ui/viewState/errorMessages.ts`.
    - _Requirements: 20.1, 20.3, 20.7, 20.8, 30.9_

  - [ ] 7.2 [P0] Write the Error_Map coverage test and the confidence-display guard
    - Import the six registries and fail when a code has no `ERROR_MAP` entry, or an entry has an empty message or an empty recovery action list. Also assert every Workbench error code has an entry (Req 30.9). This test is required.
    - Test design: Error mapping layer; Testing Strategy (P3, exhaustive).
    - Files owned: `src/ui/__tests__/errorMapCoverage.test.ts`.
    - _Requirements: 20.1, 20.2, 30.9_

- [ ] 8. [P0] Pure view logic (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `viewState/provenanceMarker.ts`, `viewState/confidenceDisplay.ts`, `viewState/clickCounter.ts`, `shared/export/requiredVerifiedFields.ts`, `viewState/selectors.ts`, `__tests__/generators/viewLogic.ts`, and the test files below.
  - [ ] 8.1 [P0] Implement the provenance marker and confidence display functions
    - `provenanceMarker(state)` returns colour, shape or pattern, and label from the token data for every `Provenance_State`, the display states `unknown`, `needs-review`, and the reserved-position marker, with every pair differing in shape and in label. `confidenceDisplay(value, calibrationStatus)` returns "not evaluated" exactly for `null`, otherwise the number with the Calibration_Marker ("uncalibrated" or "calibrated" with the record reference), and distinguishes `0` from `null`. Add `cellAriaLabel(view)` composing `readIndex`, Grid_Position, provenance, effective value, confidence display and region state as one string.
    - Files owned: `src/ui/viewState/provenanceMarker.ts`, `src/ui/viewState/confidenceDisplay.ts`.
    - _Requirements: 9.2, 9.6, 9.8, 11.8, 21.4, 22.1, 26.1, 26.2, 26.3_

  - [ ] 8.2 [P0] Implement the Click counter reducer
    - `clickCounterReducer(state, action)`: a countable click increments, a non-countable dismissal (`isCountable: false`, the first-run guidance dismissal) never does, page load is zero, and `{kind: "passWoven"}` sets `firstPassVisible`. Pure.
    - Files owned: `src/ui/viewState/clickCounter.ts`.
    - _Requirements: 4.2, 4.5, 4.6, 4.10_

  - [ ] 8.3 [P0] Implement the Required_Verified_Fields status logic
    - `computeRequiredVerifiedFieldStatuses(profile, selectedHookMapping, selectedMirror)` returns the eleven entries from the design table, reading each status from the `MachineProfile` marker named there and never hard-coding a status. Orientation (D3) and hole polarity (D7) have no domain marker today, so they return `"no-marker-available"` and count as unverified. `isVerifiedExportAvailable` is true only when all eleven are `verified` with a non-empty source citation. Carry `// UNVERIFIED A1`, `A2`, `A3`, `A4`, `A5`, `A6`, `A8`, `A9`, `A11`, `D3`, `D7` comments where each is read.
    - Files owned: `src/ui/shared/export/requiredVerifiedFields.ts`.
    - _Requirements: 14.2, 14.3, 14.4, 14.10_

  - [ ] 8.4 [P0] Implement the screen selectors (view-model functions)
    - Pure functions `(artifacts, view) -> view-model` for the Studio card, the Loom, the Scan overlays, the approval blockers and the P0 results summary. No component reads `artifacts` directly. Cell values, provenance, confidence, state and approval come only from the sibling accessors (`deriveCellState`, `buildConfidenceHeatmap`, `buildEvidenceView`, `currentApproval`). Equal inputs give equal outputs. Grid position comes from the domain `readIndexToGrid` and is never recomputed.
    - Files owned: `src/ui/viewState/selectors.ts`.
    - _Requirements: 1.4, 1.7, 9.11, 13.1, 26.3_

  - [ ]* 8.5 [P0] Write property test for provenance markers
    - **Row P1: Provenance markers are pairwise distinct by shape and label**
    - Seed `SEED_P1`, 50 runs (finite domain); every state pair checked.
    - **Validates: Requirements 9.2, 22.1, 26.3, 28.9**
    - Files owned: `src/ui/__tests__/provenanceMarker.props.test.ts`.

  - [ ]* 8.6 [P0] Write property test for the confidence display
    - **Row P2: confidenceDisplay shows "not evaluated" if and only if null**
    - Seed `SEED_P2`, 300 runs; `fc.oneof(fc.constant(null), fc.double({min:0,max:1,noNaN:true}))` crossed with both `CalibrationStatus` kinds; the Calibration_Marker is always present for a number; `0` renders as "0".
    - **Validates: Requirements 9.6, 11.8, 26.1, 26.2, 28.11**
    - Files owned: `src/ui/__tests__/confidenceDisplay.props.test.ts`.

  - [ ]* 8.7 [P0] Write property test for the Click counter
    - **Row P4: A correct Quick_Loom_Demo sequence reaches the first pass within two countable clicks**
    - Seed `SEED_P4`, 200 runs; `arbClickSequence` (countable clicks, non-countable dismissals, pass-woven events); non-countable events never increment.
    - **Validates: Requirements 4.2, 4.5, 4.6**
    - Files owned: `src/ui/__tests__/clickCounter.props.test.ts`, `src/ui/__tests__/generators/viewLogic.ts`.

  - [ ]* 8.8 [P0] Write property test for export-mode availability
    - **Row P7: Verified export is available if and only if all eleven entries are verified with a citation**
    - Seed `SEED_P7`, 300 runs; `arbProfileVerificationCombination` (each entry independently verified-with-citation, verified-without-citation, unverified, absent, or no marker).
    - **Validates: Requirements 14.3, 14.4, 28.10**
    - Files owned: `src/ui/__tests__/requiredFields.props.test.ts`.

- [ ] 9. [P0] Worker hosts (Crew-delegable, Group A)
  - Depends on: task 3. Files owned: `workers/host/*.ts` (bodies), `src/workers/detection.worker.ts`, `src/workers/restoration.worker.ts`, and the test file below.
  - [ ] 9.1 [P0] Implement the detection client wrapper and worker factory
    - `createWorkbenchDetectionClient(factory)` is a passthrough over the vision `createDetectionClient`. `workerFactory.ts` creates module workers for detection and restoration. `src/workers/detection.worker.ts` is a thin adapter that imports only `src/vision` (per vision's own design). The Image_Backend loads lazily on the first detection run and never on page load. `protocolVersion.ts` rejects a mismatched version with `UNSUPPORTED_PROTOCOL_VERSION` or the Workbench restoration code, both covered by the Error_Map.
    - Files owned: `src/ui/workers/host/detectionClient.ts`, `workerFactory.ts`, `protocolVersion.ts`, `src/workers/detection.worker.ts`.
    - _Requirements: 1.8, 6.1, 6.5, 24.1, 24.2, 29.3_

  - [ ] 9.2 [P0] Implement the restoration worker and host
    - `restoration.worker.ts` imports only `src/restore` and calls `runInference` in its `run` handler. `createRestorationWorkerHost(factory)` implements `run` (progress 0 on start and 1 on completion only, because the engine exposes no intermediate checkpoints) and `cancel` (terminate and recreate the worker, with no artifact to clean up). Messages are typed, versioned with `RESTORATION_PROTOCOL_VERSION`, and structured-cloneable. Hypotheses and Abstentions are returned and never written to the Deck here.
    - Files owned: `src/ui/workers/host/restorationWorkerHost.ts`, `src/workers/restoration.worker.ts`.
    - _Requirements: 1.8, 10.1, 24.1, 29.3_

  - [ ]* 9.3 [P0] Write worker host tests
    - With the fake factory and doubles: progress never decreases, cancel replies once and leaves the host able to start a new run, a mismatched protocol version returns the mapped code, a `RUN_IN_PROGRESS` reply is surfaced, the restoration host returns Hypotheses without a Deck write, no backend request before the first run.
    - Test design: Worker orchestration.
    - Files owned: `src/ui/__tests__/workerHosts.test.ts`.
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 24.2_

- [ ] 10. [P0] Demo_Bundle (Crew-delegable, Group A)
  - Depends on: tasks 3, 5.2 (for 10.2), 2.5 (for 10.4). Files owned: `data/demo/*`, `scripts/build-demo-bundle.ts`, `scripts/assert-no-placeholder-bundle.ts`, `demoBundle/{loadDemoBundle,digest,attestation,deckOrigin,contextDeck}.ts`, and the test files below.
  - [ ] 10.1 [P0] Build the placeholder Demo_Bundle from test doubles
    - Under `data/demo/`: a Placeholder_Bundle built by `scripts/build-demo-bundle.ts` from the test doubles in `fakeUpstream.ts`, with `manifest.json` carrying `placeholder: true` (plus recorded Orientation, recorded `LoomConfiguration` fields chosen by the demonstration, asset paths, `imageDigest`, `damagedCardIndex`, `imageLicenceNote`), a placeholder card image, `sample.meta.json`, `context-deck.json`, `approved-deck.json` and `detection-result.json`. Each placeholder file carries a visible placeholder marker in its content (a `placeholder` note field where the format allows one, otherwise a README table row). `data/demo/README.md` lists the placeholder files, states source and licence, that content is synthetic, and that the recorded loom configuration is the demonstration's choice and not a Workbench default. The builder renders no image of its own. No Garín5 content and no user photograph is committed. No number in the README is a benchmark result.
    - A placeholder bundle never yields an attestation (task 10.4).
    - Files owned: `data/demo/*`, `scripts/build-demo-bundle.ts`.
    - _Requirements: 4.7, 4.8, 6.8, 25.10, 31.11, 31.12_

  - [ ] 10.2 [P0] Implement `loadDemoBundle`
    - Fetch each asset as a same-origin static file and validate it through its owning importer (`importDetectionResult`, `importDeckJson`, the detection intake for the image) and the Workbench manifest validator. Validate the recorded loom configuration against the loaded `MachineProfile` through `makeLoomConfig` so an unsupported option surfaces through the Error_Map. Label every value from the precomputed result "precomputed, not detected in your browser". If `precomputedDetectionResultPath` is absent, offer no fallback and never fabricate a result. Return no partial bundle on failure. Also load and validate `sample.meta.json` through detection's `SampleMeta` validator and `context-deck.json` through `importDeckJson`, and return the image bytes, `SampleMeta`, Context_Deck and manifest to the caller. A digest disagreement is not a load failure (task 10.4).
    - Files owned: `src/ui/demoBundle/loadDemoBundle.ts`.
    - _Requirements: 4.3, 4.8, 5.6, 6.8, 30.2, 30.10_

  - [ ]* 10.3 [P0] Write Demo_Bundle loader tests
    - The committed bundle loads and validates (on doubles when siblings are missing). A truncated manifest, a wrong orientation, a missing asset, an unsupported hook mapping, a corrupted `sample.meta.json` and a corrupted precomputed result each return the mapped error and no partial bundle. Absent fallback path offers no fallback.
    - Files owned: `src/ui/__tests__/demoBundle.test.ts`.
    - _Requirements: 6.8, 30.8_

  - [ ] 10.4 [P0] Implement the digest, attestation, deck-origin and context-deck modules
    - `demoBundle/digest.ts`: `sha256DigestString(bytes)` computes `"sha-256:<lowercase hex>"` with the browser's `crypto.subtle.digest`. The vision public index does not export `sha256Hex` and the UI must not import vision internals, so the UI computes the digest itself.
    - `demoBundle/attestation.ts`: `checkBundledImageDigest(imageBytes, manifest, meta)` returns a `DigestCheck` that is `ok` only when the computed, manifest and `SampleMeta` digests are equal as strings. `buildBundledAttestations(damagedCardId, meta)` returns one `SyntheticImageAttestation` for the damaged card only, copied unchanged from `SampleMeta`. Context cards get none. The attestation is worded "declaration by the sample generator, bound to this image digest".
    - `demoBundle/deckOrigin.ts`: `decideDeckOrigin` is the only module that produces a `deckOrigin` and an attestation map. The `demo-bundle` branch returns `synthetic` with one attestation only when `check.ok` and not `placeholder`. Otherwise it returns `real`, an empty map and the reason (computed and expected digest, or "placeholder bundle"). The `upload` branch reads no `SampleMeta`, manifest or attestation and always returns `real` with an empty map. The literal `deckOrigin: "synthetic"` appears only in this file.
    - `demoBundle/contextDeck.ts`: `insertDetectedCard(contextDeck, detectedCard, damagedCardIndex, actionId)` calls the domain `insertCard` once and returns its `Result` unchanged. The action id comes from a counter in configuration, with no clock and no `Math.random`.
    - Files owned: `src/ui/demoBundle/digest.ts`, `attestation.ts`, `deckOrigin.ts`, `contextDeck.ts`.
    - _Requirements: 5.10, 5.11, 30.11, 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.8_

  - [ ] 10.5 [P0] Write the attestation ownership and digest mismatch tests (required)
    - `src/ui/__tests__/attestationOwnership.test.ts` (static, TypeScript compiler API): fails if `syntheticAttestations`, `buildBundledAttestations` or `SyntheticImageAttestation` is referenced in `src/ui` outside `demoBundle/attestation.ts`, `demoBundle/deckOrigin.ts` and the worker host that forwards the decision; fails if `deckOrigin: "synthetic"` appears as a literal anywhere except `deckOrigin.ts`; fails if `UploadDropzone.tsx` or any module under `screens/scan/components/` imports from `demoBundle/attestation.ts`. Add a negative self-test with an in-memory violating source.
    - `src/ui/__tests__/digestMismatch.test.ts`: a bundled image with one byte changed gives `real`, the stated reason (computed and expected digest) and no attestation. A manifest digest that differs from the `SampleMeta` digest does the same. A placeholder manifest gives `real` with reason "placeholder bundle". Equal digests with `placeholder: false` give `synthetic` with exactly one attestation, keyed by the damaged card id.
    - Files owned: `src/ui/__tests__/attestationOwnership.test.ts`, `src/ui/__tests__/digestMismatch.test.ts`.
    - _Requirements: 30.11, 31.3, 31.4, 31.7_

  - [ ] 10.6 [P0] Regenerate the Demo_Bundle from the real pipeline and add the release guard
    - Depends on: tasks 10.1, 10.2, 10.4, and a working headless engine (the real `detect`, restoration and approval through the sibling public APIs). Runs `npm run build:demo` (`scripts/build-demo-bundle.ts`, fixed seed, writes only under `data/demo`) to copy detection's sample image (`data/samples/card-synthetic-sample.png`) and `sample.meta.json`, regenerate `detection-result.json` and `approved-deck.json` from the real pipeline, write `context-deck.json` (built from a bitmap through the domain `bitmapToDeck`) and `damagedCardIndex`, and set `manifest.placeholder` to `false`. The script renders no image and fabricates no result. Update `data/demo/README.md` to state the origin and licence of the copied files. If the real engine is not available when this task starts, stop and report. Do not mark the bundle non-placeholder by hand.
    - Add `scripts/assert-no-placeholder-bundle.ts` (`assertNoPlaceholderBundle`): reads `manifest.placeholder` and the placeholder markers in the built `dist/` copy of `data/demo` and exits non-zero if any is present. Ask the integrator to chain it into the release `build` script (task 18.2). A release-build guard test feeds a placeholder bundle and expects failure, and feeds the regenerated bundle and expects success.
    - Add a test that the UI digest (`sha256DigestString`) of the committed sample image equals the `imageDigest` in the committed `sample.meta.json` and in the manifest. This test is required.
    - Files owned: `data/demo/*`, `scripts/build-demo-bundle.ts`, `scripts/assert-no-placeholder-bundle.ts`, `src/ui/__tests__/demoBundleRelease.test.ts`.
    - _Requirements: 4.7, 30.10, 30.11, 31.11, 31.12_

- [ ] 11. [P0] Shell, accessibility primitives and credits (Crew-delegable, Group B)
  - Depends on: task 3, task 4.1. Files owned: `shared/layout/*`, `shared/a11y/*`, `shared/status/*`, `shared/glossary/*`, and the test file below.
  - [ ] 11.1 [P0] Implement the Shell, left navigation, inspector slot and responsive frame
    - `Shell`, `LeftNav` (five screen entries always reachable, an unavailable screen shows its own empty state with the reason and the fixing action), `Inspector` slot shown only where a screen defines content, `ResponsiveFrame` (tablet breakpoint and touch target size as design constants marked initial). Desktop layout is left navigation, central workbench, right inspector. At narrow width the navigation collapses to a labelled menu button and the inspector becomes a dismissible panel. The Shell shows deck approval status and Restoration_State (text and marker) on every screen except Trail and Lab.
    - Files owned: `src/ui/shared/layout/*`.
    - _Requirements: 3.1, 3.5, 3.6, 23.1, 23.2, 23.3, 23.5, 23.7_

  - [ ] 11.2 [P0] Implement the accessibility primitives
    - `SkipLink`, `LiveRegion` (`role="status"`, polite), `FocusTrap` (used only inside modal dialogs, returns focus to the opener), `useReducedMotion`, `useFocusAnnounce` (moves focus to the new screen's `h1` with `tabindex="-1"` and announces the change).
    - Files owned: `src/ui/shared/a11y/*`.
    - _Requirements: 21.5, 21.7, 21.9, 22.4_

  - [ ] 11.3 [P0] Implement status components and the error boundary
    - `StatusBanner`, `ScreenState` (loading, empty, error, incomplete-data, needs-review or partial, each with a visible text description, an announcement and a next action), `ErrorBoundary` ("something went wrong in the interface", Session_Artifacts kept in memory, an export offer, no stack trace as the primary message). An error that blocks the current action moves focus to the summary (`role="alert"`). An error tied to one item renders next to it. Reads only `MappedError`.
    - `SimulatedDemoBadge`: text "Simulated demo card" with the Deck_Origin, in the Shell header slot next to the approval status. Shown only when the current `DeckOriginDecision` attests a card of the deck, or while the precomputed approved deck is loaded with `manifest.placeholder === false` and a passing `DigestCheck`. Never shown for an upload, a digest mismatch or a placeholder bundle. Uses a text label, a glyph and an outline, never colour alone. `ContextCardLabel`: "Simulated intact cards (synthetic)" on each Context_Deck card, mounted in the Studio card list (task 14.5), the Loom card list (task 15.4) and the Compare view (task 22.1). Both take their data from props, not from sibling calls.
    - Files owned: `src/ui/shared/status/*` (including `SimulatedDemoBadge.tsx`, `ContextCardLabel.tsx`).
    - _Requirements: 20.3, 20.4, 20.5, 20.6, 20.7, 27.1_

  - [ ] 11.4 [P0] Implement credits, the Educational_Label and the P0 glossary
    - A persistent Shell control that opens the research credits (Rodas Lorente et al. 2025 with https://doi.org/10.1007/s11042-025-20917-9, the Garín5 dataset, other resources) and shows the credit of the paper as prior work. The Educational_Label (the domain `SIMULATION_DISCLAIMER` constant) shown next to every loom result and loom export control. A "Glossary" entry in the Shell, `GlossaryTooltip` (keyboard reachable, visible while focus remains, dismissed by Escape, does not hide its term), `glossaryTerms.ts` with every term of requirement 19.1 (P0 terms complete, the full set is task 26.1), and the fixed statement that Garín card format details are not verified against the reference paper. User-facing strings are centralised in a `strings.ts` (Q7).
    - Files owned: `src/ui/shared/glossary/*`, `src/ui/shared/layout/Credits.tsx`, `src/ui/shared/layout/strings.ts`.
    - _Requirements: 3.2, 3.3, 3.4, 3.8, 19.1, 19.2, 19.4, 19.7, 26.6_

  - [ ]* 11.5 [P0] Write shell and status component tests
    - Credits control and Educational_Label present on every screen route, navigation reachable while a prerequisite is missing, focus moves to the heading on screen change, each `ScreenState` kind renders its text and announcement, the error boundary keeps artifacts and offers export, tooltip dismisses on Escape.
    - Files owned: `src/ui/__tests__/shell.test.tsx`.
    - _Requirements: 3.2, 3.4, 3.6, 20.6, 21.7, 27.1_

  - [ ] 11.6 [P0] Write the badge-placement test (required)
    - Depends on: tasks 11.1, 11.3. `src/ui/__tests__/badgePlacement.test.tsx`: the Simulated_Demo_Badge renders in the Shell header slot, beside the approval status, on every screen route while the decision is `synthetic` or the verified precomputed deck is loaded. It does not render for a `real` decision, for an upload-built deck, after a digest mismatch, or for a placeholder bundle. `ContextCardLabel` text appears on each Context_Deck card and not on the detected card. The badge text and glyph survive `grayscale(1)` (no colour-only meaning).
    - Files owned: `src/ui/__tests__/badgePlacement.test.tsx`.
    - _Requirements: 3.10, 31.4, 31.9_

- [ ] 12. [P0] Start view and Quick_Loom_Demo entry (Crew-delegable, Group B)
  - Depends on: tasks 8.2, 10.2, 11.1. Files owned: `screens/start/*`, and the test file below.
  - [ ] 12.1 [P0] Implement the start screen
    - Two primary actions visible without scrolling at tablet width and above: "Watch the loom weave the demonstration deck" (Click 1: opens the Loom with the Demo_Bundle approved deck and the recorded configuration shown as an explicit selection labelled "chosen by the demonstration, change it below", Play enabled) and "Walk through the full restoration" (opens Scan with the Demo_Bundle card offered and the ordered step list: detect, review, approve, weave, export). A non-blocking first-run note whose dismissal is not a Click. No default mirror or hook mapping for a user deck. Label the deck "bundled synthetic demonstration deck" with its provenance.
    - Files owned: `src/ui/screens/start/*`.
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 12.2 [P0] Write start screen tests
    - Both actions render at tablet and desktop width, the first-run note dismissal does not increment the Click counter, the full-journey action lists the five remaining steps.
    - Files owned: `src/ui/__tests__/startScreen.test.tsx`.
    - _Requirements: 4.1, 4.6, 4.9_

- [ ] 13. [P0] Scan & Detect, P0 subset (Crew-delegable, Group B)
  - Depends on: tasks 4.1, 8.1, 9.1, 6.2, 10.2, 10.4, 11.3 (for 13.2). Files owned: `screens/scan/*` (P0 files), and the test file below.
  - [ ] 13.1 [P0] Implement the 2D card viewer and overlay layer
    - `CardViewer2D` shows the original or rectified image with zoom and pan by pointer and keyboard (plus, minus, arrows, visible instruction). `OverlayLayer` draws one marker per Readable_Position from the `DetectionResult` polygons (observed with hole, observed without hole, ambiguous, unknown, each a distinct shape with a legend label), Reserved_Positions with the label "reserved, not an instruction" and the "location inferred, unverified" text where the profile marks it unverified, and Unknown_Regions with their reasons. An unknown position is never drawn as an absent hole. Independent toggles for each overlay. Overlays render from the result and compute no geometry.
    - Files owned: `src/ui/screens/scan/components/CardViewer2D.tsx`, `OverlayLayer.tsx`, `legend.ts`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.9, 7.10_

  - [ ] 13.2 [P0] Implement the Scan screen with Demo_Bundle selection, progress, cancel and failure display
    - One-Click Demo_Bundle card selection labelled "bundled synthetic demonstration card" with source and licence reachable. Detection through the detection client with stage name, non-decreasing completion fraction and an enabled Cancel. States: empty, loading (Image_Backend), progress, error, incomplete-data (`aligned-with-warnings`). Failure display with stage, reason, numeric values, suggested actions and the manual-alignment entry point (opens the P1 editor when built). `MULTIPLE_CARDS_SUSPECTED` shows candidate polygons. Orientation recorded in the Demo_Bundle applied as a labelled user-supplied Orientation through `recordGeometryCorrection`. The `BACKEND_LOAD_FAILED` fallback offers the precomputed result, labelled as such. Selecting a position shows its inspector data. Shows Implementation_Stamp, Hole_Polarity_Assumption with its `unverified` marker, and the statement that images stay in the browser. When the bundled card is selected, call `checkBundledImageDigest` once and keep the `DigestCheck` in `ViewState`. Show the digest line and `DigestCheckNotice`: on a mismatch show `DEMO_BUNDLE_DIGEST_MISMATCH` through the Error_Map with the computed and the expected digest, and continue as an unattested image. The Scan screen calls no other attestation code.
    - Files owned: `src/ui/screens/scan/ScanScreen.tsx`, `viewModel.ts`, `strings.ts`.
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.5, 7.8_

  - [ ]* 13.3 [P0] Write Scan component tests
    - Marker kinds render distinct shapes and labels, an unknown position is not an absent-hole marker, progress never decreases, cancel shows "cancelling" then cancelled, a failed run shows stage and values with no per-cell result, the fallback labels precomputed values. Uses the detection double.
    - Files owned: `src/ui/__tests__/scanScreen.test.tsx`.
    - _Requirements: 6.2, 6.3, 6.6, 6.8, 7.1, 7.4_

- [ ] 14. [P0] Restoration Studio, P0 subset (Crew-delegable, Group B)
  - Depends on: see each sub-task. Files owned: `screens/studio/*` (P0 files), and the test file below.
  - [ ] 14.1 [P0] Implement the Studio card viewer, layers and legend
    - Depends on: tasks 8.1, 8.4. `CardViewer` renders one cell per Readable_Position (virtualised beyond 400 cells so only visible cells are mounted, key-stable updates) with `role="grid"` and `role="gridcell"` and the composed `aria-label`. Provenance markers use the token colour, shape and label. Effective value shown apart from provenance. `unknown` and `ambiguous` cells show the "unknown" marker. Layers: provenance (default), confidence heatmap (null drawn as "not evaluated" with its own pattern, never 0), hole likelihood (separate legend title "hole likelihood in the photograph" versus "estimated restoration correctness"), evidence links, Restoration_State. Calibration_Marker beside every confidence. Synthetic_Prior_Warning marker on flagged cells. Keyboard: arrows, Home, End, Page Up and Page Down card jumps. Zoom and pan by pointer and keyboard. Reserved positions as non-cell elements.
    - Files owned: `src/ui/screens/studio/components/CardViewer.tsx`, `ProvenanceLegend.tsx`, `LayerToggles.tsx`, `cellGrid.ts`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.12, 21.3, 21.4, 24.8_

  - [ ] 14.2 [P0] Implement the region inspector and alternatives panel
    - Depends on: task 14.1. `RegionInspector`: crop reference or "no image evidence available", Raw_Observation, "Hole likelihood (photograph)" and "Estimated restoration correctness" as separate fields with different markers, effective value, provenance marker, supporting evidence, Calibration_Marker, review state, approval status, profile verification markers the run depended on, Applied_Override detail with the statement that the card value was not changed, Assistant_Evidence in a separate block labelled "model-generated, not an observation", the cell's edit history in Sequence_Number order with no timestamp. `AlternativesPanel`: at most three Hypotheses in rank order with confidence display, explanation and structured evidence, never padded, an Abstention shown with its reason and structured values when none exists, contradiction statement shown, each unaccepted item labelled "proposal". Confidence `0` and `null` shown differently.
    - Files owned: `src/ui/screens/studio/components/RegionInspector.tsx`, `AlternativesPanel.tsx`.
    - _Requirements: 10.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 26.5_

  - [ ] 14.3 [P0] Implement the correction toolbar and review wiring
    - Depends on: task 14.2. Accept (`accept-hypothesis`), select alternative (`select-alternative` with rank), Reject (`reject-hypothesis`, cells shown "left unknown"), Edit value with a note validated by `validateUserText` (shows before submission that an observed value stays in history and that an edit on an approved deck withdraws approval), "Undo my edit" (domain `undoEdit`) and "Withdraw accepted suggestion" (`undo-action`, never interchanged), `USER_EDIT_PROTECTED` offering the undo-edit control, `NOTHING_TO_UNDO` leaving records unchanged, the deck shown `unapproved` with cause after an undo or withdrawal on an approved deck. An audit list of applied actions (Action_Id, Sequence_Number, kind, target, note, optional label unparsed), append-only in the display. Every action goes through `dispatchSiblingCall` and `applyReviewAction` or `undoReviewAction`. No action runs automatically. Bulk acceptance only by an explicit selected list. Keyboard shortcuts `A`, `E`, `U`, `W` are remappable and each action also has a visible control.
    - Files owned: `src/ui/screens/studio/components/CorrectionToolbar.tsx`, `AuditList.tsx`, `reviewActions.ts`.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13, 21.3, 21.5_

  - [ ] 14.4 [P0] Implement the approval panel
    - Depends on: task 14.1. `ApprovalPanel` shows the blocking reasons returned by `approveDeck` (`PROPOSALS_UNREVIEWED`, `OVERRIDES_UNRESOLVED`, `PENDING_CORRECTIONS`, wrapped `UNRESOLVED_CELLS`) with counts, up to 100 listed items and the total, each with a link that moves focus to the first item. It does not recompute counts. The ambiguous-as-down policy is offered only as an explicit option needing a note, with the plain statement that it sets those cells to "down". After success it shows the deck `approved`, that unreviewed proposals were not applied, and enables the Loom and export links. Revoke approval. The approval audit trail (Action_Id, Sequence_Number, state, cause, no timestamp). While `unapproved`, Loom run and final export stay disabled with the reason and a link.
    - Files owned: `src/ui/screens/studio/components/ApprovalPanel.tsx`, `approvalBlockers.ts`.
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.8, 13.9, 15.1_

  - [ ] 14.5 [P0] Implement the Studio screen assembly and restoration run
    - Depends on: tasks 14.1, 14.2, 14.3, 14.4, 9.2, 6.2, 22.3, 11.3, 10.4. Layout of the card (largest element), inspector and panels. Mount `PriorGatePanel` (task 22.3) with the case taken from the `DeckOriginDecision` (synthetic gives the attested-synthetic case, real gives the real-deck case), and `ContextCardLabel` on each Context_Deck card in the card list. Add `DeckContextNotice`: for the demo path "The detected card was placed at position {n+1} among {m} simulated intact cards (synthetic)", for an upload with no Context_Deck "Only structure within this card is available for this deck. Repeat evidence across cards needs more cards." The restoration run passes `deckOrigin` and the attestations from the `DeckOriginDecision` unchanged, and the enabled priors from the configuration. The Workbench does not duplicate the engine's attestation check. In the inspector of every cell, region and hypothesis of an attested synthetic deck, show `SYNTHETIC_DECK_NOTICE` as supplied by `Evidence_View.syntheticDeckNotice`, never authored here. "Propose restorations" through the restoration host with progress, proposals shown without any Deck write, plain statement that proposals are suggestions, the Prior_Gate state of each prior kind with the synthetic-frequency-is-a-generator-parameter statement for the bundled run, abstention reasons per region, the "no missing cells" state with an approval offer. Mapped errors for `PRIOR_MEASUREMENT_MISSING`, `PRIOR_NOT_VALIDATED_FOR_REAL_DECKS`, `INVALID_CONFIGURATION`, `LIMIT_EXCEEDED`, `DETECTION_EVIDENCE_MISMATCH` leave Deck and record unchanged. States: empty, loading, error, incomplete-data (count of unknown or ambiguous cells).
    - Files owned: `src/ui/screens/studio/StudioScreen.tsx`, `viewModel.ts`, `strings.ts`, `components/DeckContextNotice.tsx`.
    - _Requirements: 9.13, 10.1, 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 27.3, 31.8, 31.9, 31.10_

  - [ ]* 14.6 [P0] Write Studio component tests
    - Each Provenance_State renders its own marker and label, `null` shows "not evaluated" and `0` shows "0", the "uncalibrated" marker is next to every number, Hole likelihood and restoration correctness are separate fields, at most three alternatives and no padding, undo and withdraw call the matching sibling functions, the approval panel shows each blocking reason and does not recompute counts, a rejected action leaves displayed state unchanged. Uses the restoration double.
    - Test design: Component Breakdown, Interaction Contracts (Exact sibling calls).
    - Files owned: `src/ui/__tests__/studioScreen.test.tsx`.
    - _Requirements: 9.2, 9.6, 11.2, 11.3, 12.6, 13.2, 26.7_

- [ ] 15. [P0] Virtual Loom, P0 subset (Crew-delegable, Group B)
  - Depends on: see each sub-task. Files owned: `screens/loom/*` (P0 files), `src/ui/loom/scheduler.ts`, and the test file below.
  - [ ] 15.1 [P0] Implement the loom scheduler
    - Depends on: task 3. `createLoomScheduler()` with a `requestAnimationFrame` fixed-step accumulator: `onTick` fires once per `1000 / passesPerSecond` ms accumulated, the remainder carried forward, never faster than the configured speed. It holds no simulation state. Speed ceiling 8 passes per second (initial value). Not started while reduced motion is requested unless the user opts into a timed rate under three transitions per second. The only timer owner for Play.
    - Files owned: `src/ui/loom/scheduler.ts`.
    - _Requirements: 15.7, 15.15, 22.7_

  - [ ] 15.2 [P0] Implement the loom stage renderer
    - Depends on: task 4.1. `LoomStage` draws the cloth on a `<canvas>` incrementally (one `fillRect` per lifted cell per new row, no full redraw per tick) from `FabricBuffer.rows`, with an SVG overlay for the active card's hook markers. Warp and weft use two distinct fill patterns as well as colours. `ResolvedColours` from the domain interpreter paints colours directly with no colour derived in the UI. `HookLiftPanel` shows the lifted hooks and the warp threads they drive under the chosen mapping. Shows the pass index and pass count as text. The Educational_Label is shown with the stage.
    - Files owned: `src/ui/screens/loom/components/LoomStage.tsx`, `HookLiftPanel.tsx`.
    - _Requirements: 15.6, 15.11, 15.12_

  - [ ] 15.3 [P0] Implement the configuration picker and playback controls
    - Depends on: task 15.1. `ConfigPicker`: mirror and hook-mapping radios from the options the `MachineProfile` permits, neither preselected for a user deck, Play and Step disabled with the reason "choose a mirror orientation and a hook mapping" until both are chosen, plain-language option descriptions with the profile `unverified` status and the statement that neither hook mapping is claimed as historical fact, threads-per-hook (range 1 to 64, default from the profile, `unverified` status, resulting warp thread and pass counts). The Demo_Bundle recorded configuration shows pre-filled and labelled "chosen by the demonstration". `PlaybackControls`: Step, Play, Pause, Seek (control and numeric field), Reset, each calling the domain `step`, `pause`, `resume`, `seek`, `reset`. Complete state shows "complete" as text. In reduced-motion mode Play becomes step-through. Keyboard `S`, `P`, `R` with visible controls.
    - Files owned: `src/ui/screens/loom/components/ConfigPicker.tsx`, `PlaybackControls.tsx`.
    - _Requirements: 15.2, 15.3, 15.4, 15.7, 15.9, 15.15, 4.8, 21.3_

  - [ ] 15.4 [P0] Implement the Loom screen assembly
    - Depends on: tasks 15.2, 15.3, 6.2. An unapproved deck shows the empty state "only an approved deck runs on the loom" with a link to approval and no run control. Interpreter errors (`FABRIC_TOO_LARGE`, `INVALID_THREADS_PER_HOOK`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`, `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`, `DECK_NOT_APPROVED`, `UNRESOLVED_CELL`) show the mapped message with values and leave the previous simulation state unchanged. Same cloth for the same deck and configuration at every speed and after every seek. States: empty, loading, error, incomplete-data (missing mirror or hook mapping), partial (paused mid-run, "Paused at pass 12 of 400"). Export controls for the loom mount from the shared export panel (task 16.1). Emits `passWoven` to the Click counter when the fabric grows. For the demonstration deck the card list beside the active card labels each Context_Deck card with `ContextCardLabel`, and the Shell shows the Simulated_Demo_Badge.
    - Files owned: `src/ui/screens/loom/LoomScreen.tsx`, `viewModel.ts`, `strings.ts`.
    - _Requirements: 4.4, 15.1, 15.5, 15.9, 15.10, 15.11, 27.4_

  - [ ]* 15.5 [P0] Write scheduler and loom tests
    - Fixed-step accumulator under jittery frame times calls `onTick` the expected number of times and never faster than the speed, `seek(n)` shows the same state as `reset` plus `n` steps (with the loom double), the same cloth at every speed, reduced-motion mode never starts the scheduler, Play and Step stay disabled with the reason until both choices are made, no preselection for a user deck.
    - Test design: Loom Rendering Design.
    - Files owned: `src/ui/__tests__/loom.test.tsx`, `src/ui/__tests__/scheduler.test.ts`.
    - _Requirements: 15.2, 15.7, 15.10, 15.15, 22.7_

- [ ] 16. [P0] Export panel and banned-wording scan (Crew-delegable, Group B)
  - Depends on: task 8.3. Files owned: `shared/export/ExportPanel.tsx`, `shared/export/exportModes.ts`, and the test files below.
  - [ ] 16.1 [P0] Implement the export panel
    - Deck JSON through `exportDeckJson` with a file name stating content kind and approval status, and a Weft_Colour_Layer only as a separate labelled section. Two SVG controls always shown: "Export SVG (verified)" present and disabled while `!isVerifiedExportAvailable`, with the reason "these profile fields are not verified" and each non-verified entry named with basis and note (an entry without a marker listed as "no verification marker available"), and "Export SVG (unverified, not validated for physical cutting)" that downloads on one activation with no acknowledgement control and no dialog (Q4). Both show next to the control the verification markers of all eleven entries and, for the unverified mode, the Unverified_Assumption_Metadata and the exact Cutting_Caveat constant, matching what the domain exporter embeds. Where the exporter metadata omits an entry (hook mapping, threads-per-hook, mirror) the UI lists it and notes the amendment need. Explicit scale and unit required, `INVALID_EXPORT_OPTIONS` mapped to the invalid field, `mm` refused before the call when no physical dimensions exist (offer `px` and state it is a screen unit), approval status shown next to the control, content kind and Component_Stamp shown. The words "laser-ready", "cut-ready", "machine-ready" never appear. Export numbers of unresolved items shown in the dialog.
    - Files owned: `src/ui/shared/export/ExportPanel.tsx`, `exportModes.ts`, `strings.ts`.
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8, 14.9, 14.10, 16.1, 16.5, 16.6, 16.7_

  - [ ] 16.2 [P0] Write the banned-wording scan
    - `src/ui/__tests__/bannedWording.test.ts` greps every string literal under `src/ui` and every exported SVG fixture (including the downloaded file from the exporter double) for `laser-ready`, `cut-ready`, `machine-ready` (the exported `BANNED_EXPORT_WORDS`), and fails on a match. A negative self-test uses an in-memory violating string. This test is required.
    - Test design: Export Design.
    - Files owned: `src/ui/__tests__/bannedWording.test.ts`.
    - _Requirements: 14.6_

  - [ ]* 16.3 [P0] Write export panel tests
    - Verified control present and disabled with named entries for a profile that has the two missing markers, enabled only when all eleven are verified with a citation, unverified download on one activation with no dialog and no acknowledgement, the caveat text and metadata shown on the control, `mm` refused without physical dimensions, invalid scale shows the field.
    - Files owned: `src/ui/__tests__/exportPanel.test.tsx`.
    - _Requirements: 14.3, 14.5, 14.7, 14.8_

- [ ] 17. [P0] Benchmark results summary (Crew-delegable, Group B)
  - Depends on: tasks 3, 8.1, 11.3. Files owned: `screens/results/*`, and the test file below.
  - [ ] 17.1 [P0] Implement the P0 results summary surface
    - The Results_Summary reads `data/benchmark/browser/index.json` and the quick-profile BrowserReport it lists beside it, through the browser-safe reader, and makes no other report path known to the reader. It is linked from the Start view and the Studio ("See recorded results") and rendered on the Lab route by a minimal Lab host that the P1 `LabScreen` (task 24.3) later replaces by mounting the same component. Shows only values the report records: dataset identity, Execution_Profile, split role and sample size, damaged-cell recovery accuracy over all damaged cells and over answered cells with the coverage, the baseline names and the paired difference line, the expected calibration error with the raw "uncalibrated" statement, each track status, the fixed honesty statements verbatim, and a link to the full Benchmark Lab (P1). `undefined` metrics render the word "undefined" with the reason, `not-estimated` intervals render "not estimated" with the reason, an unset threshold renders "not set", the real-photograph track renders "not evaluated" with its reason and no number, the synthetic and real sections share no table or average. No computation beyond what the report records. When no report is bundled it shows the empty state "No committed report is bundled in this build" and no number. A load or validation failure shows the mapped benchmark error and no partial report.
    - Files owned: `src/ui/screens/results/ResultsSummary.tsx`, `viewModel.ts`, `strings.ts`.
    - _Requirements: 18.1, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.17, 18.20, 18.21, 3.4_

  - [ ]* 17.2 [P0] Write results summary tests
    - Fake reader returns a defined metric, an undefined metric with reason, a not-estimated interval, an unset threshold, a not-evaluated real track and an empty index; each renders verbatim as specified. A rendered number always equals the recorded one. No Node-only import on the reader path (checked by the boundary test).
    - Also load the committed `data/benchmark/browser/index.json` through the real reader (when present) and assert the honesty statements verbatim and the words "undefined", "not estimated" and "not evaluated" wherever the report records those statuses, plus the empty and error states for a missing or corrupted file.
    - Files owned: `src/ui/__tests__/resultsSummary.test.tsx`.
    - _Requirements: 18.4, 18.7, 18.8, 18.9, 18.17, 18.20, 18.21_

- [ ] 18. [P0] App wiring and static build (Group C)
  - [ ] 18.1 [P0] Wire the application
    - Depends on: tasks 5.1, 6.2, 10.4, 11.4, 12.1, 13.2, 14.5, 15.4, 16.1, 17.1, 22.3. `main.tsx` mounts `App`. `App.tsx` composes Shell, routing through `parseRoute` (an invalid route opens the start view with a plain message), `AppStore`, lazy loading of the Loom, Lab and Trail code by dynamic import, and the screen hosts. Quick_Loom_Demo wiring: Click 1 loads the Demo_Bundle approved deck through `importDeckJson` and opens the Loom with the recorded configuration; Click 2 is Play. Full journey wiring: Scan result to `mapDetection` to Deck to deck context to Studio to approval to Loom to export, each step through `dispatchSiblingCall`. At "Continue to restoration" (before any restoration run): call `decideDeckOrigin` (the `demo-bundle` branch with the stored `DigestCheck` for the bundled card, the `upload` branch for an uploaded image) and keep the decision in `ViewState`. For the bundled card call `insertDetectedCard` (domain `insertCard(contextDeck, detectedCard, damagedCardIndex, actionId)`) so the detected card sits in the Context_Deck at `damagedCardIndex`, and hand the returned Deck to restoration with `detectionEvidence` for the damaged card only. For an upload with no Context_Deck do not call `insertDetectedCard`: create the Deck from the single detected card through the domain `createDeck`, and show the "within-card structure only" statement through `DeckContextNotice`. Errors from `insertCard` (out-of-range index, duplicate `cardId`) go through the Error_Map and leave the Session_Artifacts unchanged. A warning before closing the page with unsaved changes. Memory-only work with a first-use notice, no browser storage by default, no network request other than same-origin assets, the BrowserReport and Trail_Data files. The `VITE_DISABLE_P2` flag removes every P2 item without changing the P0 path.
    - Files owned: `src/ui/main.tsx`, `src/ui/app/App.tsx`, `index.html`.
    - _Requirements: 1.5, 2.5, 2.6, 4.3, 4.4, 24.3, 25.1, 25.2, 25.3, 25.7_

  - [ ] 18.2 [P0] Configure the static build assets
    - Depends on: tasks 18.1, 10.6. `scripts/ui-copy-assets.ts` copies the `data/demo` assets and the folder `data/benchmark/browser/` (`index.json` and the BrowserReport files it lists) unchanged into the static site, and copies `data/generated/trail-data.json` when present. The Vite production build (owned by the integrator, A0-1) outputs a static site with same-origin assets only, emits a size report and loads the Image_Backend lazily. This task asks the integrator to chain `scripts/ui-copy-assets.ts` and `scripts/assert-no-placeholder-bundle.ts` (task 10.6) into the release `build` script, so the build fails if any placeholder remains. It does not edit `vite.config.ts` or `package.json`. No server, no hosting configuration, no deployment step (Q10).
    - Files owned: `scripts/ui-copy-assets.ts`.
    - _Requirements: 3.9, 24.2, 24.3, 25.2, 18.21, 31.12_

- [ ] 19. [P0] End-to-end journey tests with Playwright
  - [ ] 19.1 [P0] Write the Playwright P0 journey test
    - Depends on: task 18.2. From the first page load with no stored data: select the Demo_Bundle card (digest check passes and the Simulated_Demo_Badge appears), run detection through the worker, continue to restoration and assert that the detected card now sits in the Context_Deck at `damagedCardIndex` (read from the deck returned by `insertCard`, with the context cards labelled "Simulated intact cards (synthetic)"), turn a Structural_Prior on through the PriorGatePanel toggle and assert the resulting gate state and the Synthetic_Deck_Notice, run restoration, accept and select proposals, edit one cell with a note, approve with blockers resolved, open the Loom, choose a mirror orientation and a hook mapping, play or step to completion, export Deck JSON and SVG in Unverified_Export_Mode. Assert at each step: each Provenance_State present has its own marker and label, `null` confidence shows "not evaluated", "uncalibrated" is next to every number, Hole likelihood and restoration correctness are separate fields, an undo of an edit and a withdrawal of an accepted suggestion each restore the prior value, provenance and approval shown, an approval attempt with an unreviewed proposal shows the blocking reason, Verified_Export_Mode is present and disabled with named entries, the unverified download starts on one activation with no acknowledgement and no dialog, the downloaded SVG contains the Cutting_Caveat text and the Unverified_Assumption_Metadata, and no label or file contains a banned word. Runs against the built static site with `VITE_DISABLE_P2=1`, offline (non-same-origin requests blocked), with the fixed Demo_Bundle and fixed seeds, waiting only on observable state, printing the seed and the failing step on failure. Runs on the real libraries when they exist and on the doubles otherwise, and records which. This test is required.
    - The test runs against the regenerated, non-placeholder Demo_Bundle (task 10.6). It fails if the bundle is a placeholder.
    - Files owned: `e2e/p0-journey.spec.ts`, `e2e/support/*`.
    - _Requirements: 4.10, 12.7, 13.2, 14.5, 25.9, 28.1, 28.2, 28.3, 28.4, 28.7, 28.8, 28.14, 2.6_

  - [ ] 19.2 [P0] Write the three-Click path test
    - Depends on: task 18.2. Starting at the first page load (zero Clicks), perform the Quick_Loom_Demo with at most three Clicks counted by the Glossary rule (pointer press or Enter or Space on a focused control; scrolling, hovering, focus moves and typing do not count; dismissing the first-run note does not count) and assert at least one woven pass is visible after the last Click, at most two Clicks to the first pass. Also run the reduced-motion variant (Step instead of Play). This test is required.
    - Files owned: `e2e/quick-loom-demo.spec.ts`.
    - _Requirements: 4.2, 4.4, 4.5, 4.10_

  - [ ]* 19.3 [P0] Write the keyboard-only P0 journey
    - Depends on: task 18.2. The same P0 path with keyboard input only (no pointer events), asserting every essential operation of requirement 21.3 is reachable and that focus never traps outside a modal.
    - Files owned: `e2e/p0-keyboard.spec.ts`.
    - _Requirements: 21.1, 21.3, 28.6_

  - [ ] 19.4 [P1] Write the upload-path Playwright test (required)
    - Depends on: tasks 18.2, 21.4 (the upload dropzone, `UploadDropzone`, is P1 in the design, so this test runs after checkpoint 20 and is not part of the P0 gate). Upload a generated card file. Assert the run input carries `deckOrigin: "real"` with no attestation and that no Simulated_Demo_Badge renders. Assert the "within-card structure only" notice. Turn a Synthetic_Only_Prior on through the recorded `enable-synthetic-prior` flow with a note (real-deck enablement), and assert the Synthetic_Prior_Warning on every dependent item and that the case-1 toggle is not offered. In a second variant the uploaded file's bytes equal the bundled image's bytes, and the result is still `real`. Runs against the built static site, offline, with fixed seeds.
    - Files owned: `e2e/upload-path.spec.ts`.
    - _Requirements: 28.15, 31.7, 10.9, 10.10, 10.11, 10.12_

- [ ] 20. P0 checkpoint: the P0 journey runs end to end
  - The P0 set includes `PriorGatePanel` (task 22.3, both cases), the attestation flow and its required tests (tasks 10.4, 10.5, 11.6), the regenerated non-placeholder Demo_Bundle with its release guard (task 10.6) and the Results_Summary (task 17).
  - Ensure `vitest --run`, the type check, the boundary tests, the surface snapshot, the Error_Map coverage test, the banned-wording scan, the attestation ownership, digest mismatch and badge-placement tests, and the Playwright P0 journey and three-Click tests pass on the static build with every P1 and P2 item disabled.
  - Record in `docs/ui-measurements.md` (created by task 34.1) whether the journey ran on the real libraries or on the doubles.
  - No P1 or P2 task starts before this checkpoint. Ensure all tests pass, ask the user if questions arise.

- [ ] 21. [P1] Scan & Detect, P1 features (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `screens/scan/components/UploadDropzone.tsx`, `AlignmentEditor.tsx`, `QualityFindingsList.tsx`, `CorrectionLogList.tsx`, and the wiring and test files named below.
  - [ ] 21.1 [P1] Implement the upload dropzone with boundary validation
    - Drag-and-drop and a file picker, operable by keyboard (focusable, Enter or Space opens the picker, visible focus and text label). Passes bytes to the detection client without upload and keeps the original unchanged with its Image_Digest and dimensions, and an original or rectified view switch. Intake rejection returns the mapped message with the supplied and permitted values and keeps the previous image and result. `orientation-unresolved` for a user image shows the candidate Orientations with scores and previews, no per-cell results, and requires the user's choice. An uploaded image is always treated as real: the dropzone and every module under `screens/scan/components/` import nothing from `demoBundle/attestation.ts` and read no `SampleMeta`, and the upload flow reaches only the `upload` branch of `decideDeckOrigin` (task 18.1).
    - Files owned: `src/ui/screens/scan/components/UploadDropzone.tsx`, `OrientationChooser.tsx`.
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.11, 30.2_

  - [ ] 21.2 [P1] Implement the alignment editor and Correction_Log list
    - Geometry_Correction kinds `set-corners` (drag by pointer and keyboard steps, quadrilateral shown, validation shown before submission), `set-reference-holes`, `set-orientation`, `set-polarity` (plain-language wording and `unverified` status), advanced `set-parameter-override` and `select-profile`. Mapped messages for `INVALID_CORNERS`, `INVALID_REFERENCE_HOLES`, `RESERVED_POSITION`, `INVALID_PARAMETERS`, `DUPLICATE_ACTION_ID` with the form kept open. A geometry correction re-runs detection and keeps the previous result for comparison. A Cell_Correction or Review_Resolution starts no detection and shows no progress. `needs-review` corrections listed with reasons, Evidence_Snapshot and new evidence, with confirm and discard. Undo states which kinds re-read the image. The Correction_Log is an ordered list with no timestamp and unchanged after an error.
    - Files owned: `src/ui/screens/scan/components/AlignmentEditor.tsx`, `CorrectionLogList.tsx`, `correctionActions.ts`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ] 21.3 [P1] Implement the quality findings list
    - Each Quality_Finding with kind, severity, numeric score, affected position count and the statement that it is a heuristic. Selecting a finding highlights its polygon and affected positions. A kind reported `not-evaluated` shows "not evaluated" with its reason. Condition counts and the statement that Hole_Likelihood is an uncalibrated algorithmic score.
    - Files owned: `src/ui/screens/scan/components/QualityFindingsList.tsx`.
    - _Requirements: 7.6, 7.7, 7.8_

  - [ ] 21.4 [P1] Wire the P1 features into the Scan screen
    - Depends on: tasks 21.1, 21.2, 21.3. Mount the components in `ScanScreen`, the manual alignment entry point on failure, and the needs-review state mapping.
    - Files owned: `src/ui/screens/scan/ScanScreen.tsx` (wiring only), `viewModel.ts`.
    - _Requirements: 6.6, 27.2_

  - [ ]* 21.5 [P1] Write Scan P1 tests
    - Dropzone keyboard operation, intake rejection keeps the previous image, each correction error keeps the form open with input preserved, a cell correction starts no detection (no progress shown), a geometry correction shows reread, needs-review list actions.
    - Files owned: `src/ui/__tests__/scanP1.test.tsx`.
    - _Requirements: 5.2, 5.5, 8.3, 8.6, 8.7_

  - [ ] 21.6 [P1] Write the upload origin test (required)
    - Depends on: tasks 21.1, 21.4, 10.4. `src/ui/__tests__/uploadOrigin.test.tsx`: feed the upload flow a file whose bytes equal the bundled image, and a file with a `sample.meta.json` beside it. In every case the run input has `deckOrigin: "real"` and no attestation, and no Simulated_Demo_Badge renders. A route parameter, a configuration value or file content never reaches the `demo-bundle` branch.
    - Files owned: `src/ui/__tests__/uploadOrigin.test.tsx`.
    - _Requirements: 5.11, 31.7_

- [ ] 22. [P1] Restoration Studio, P1 features (Crew-delegable, Group C; task 22.3 is P0 and Group B)
  - Depends on: task 20, except task 22.3, which is P0 and depends on tasks 3, 6.2, 8.1, 9.2 and 11.3 and is built before app wiring (task 18). Files owned: `screens/studio/components/SideBySide.tsx`, `OverrideList.tsx`, `NeedsReviewList.tsx`, `PriorGatePanel.tsx`, and the wiring and test files named below.
  - [ ] 22.1 [P1] Implement the side-by-side comparison
    - "Compare" shows the original card (as detected) and the reconstructed card side by side, with the same Provenance_Markers, the same legend and independent zoom, and marks every cell that differs. Each Context_Deck card in the Compare view carries `ContextCardLabel` (task 11.3). (Synchronised zoom is P2, task 33.1.)
    - Files owned: `src/ui/screens/studio/components/SideBySide.tsx`.
    - _Requirements: 13.7_

  - [ ] 22.2 [P1] Implement condition overrides, the override list and needs-review handling
    - A condition correction (`ambiguous` or `unknown`) presented as "your override" with a note, the domain value shown unchanged, an override list with the `applied` flag and review state, `acknowledge-override`. Needs-review corrections listed with reasons, Evidence_Snapshot and new evidence, confirm and discard, stated as not applied until confirmed.
    - Files owned: `src/ui/screens/studio/components/OverrideList.tsx`, `NeedsReviewList.tsx`.
    - _Requirements: 12.5, 13.6_

  - [ ] 22.3 [P0] Implement the prior gate panel and synthetic-prior flow
    - Moved to P0 (A0-3). The panel takes its case from the `DeckOriginDecision`. Prior_Gate state for each kind (`repeat`, `symmetry`): disabled, enabled with measurement reference, scope `synthetic` or `real`, taken from `evaluatePriorGate`.
    - Case 1, attested synthetic deck: a toggle ("Use this prior") that changes `RestorationConfig.enabledPriors`, enabled only while a valid measurement exists. No note is asked for and no enablement entry is recorded. No real-deck warning is shown. The Synthetic_Deck_Notice (`SYNTHETIC_DECK_NOTICE`, as supplied) is shown on every dependent item. The statement that the measured frequency is a generator parameter is shown.
    - Case 2, real deck (upload, digest mismatch or placeholder bundle): a Synthetic_Only_Prior stays disabled until the user records `enable-synthetic-prior` with a note of 1 to 1,000 characters through `recordSyntheticPriorEnablement` (`applyReviewAction`), showing the Action_Id and Sequence_Number. The fixed Synthetic_Prior_Warning text on every dependent item and the deck-level warning while an enablement is in effect. Disable is recorded the same way. The case-1 toggle is not offered. The user's note goes through `validateUserText`.
    - Files owned: `src/ui/screens/studio/components/PriorGatePanel.tsx`.
    - _Requirements: 2.7, 10.3, 10.4, 10.9, 10.10, 10.11, 10.12, 9.9_

  - [ ] 22.4 [P1] Wire the P1 features into the Studio screen
    - Depends on: tasks 22.1, 22.2. `PriorGatePanel` is already mounted by task 14.5. Mount the components and map the needs-review state. Ambiguity: whole-card recovery "stretch" labelling is shown only if the engine reports it (the Studio makes no whole-card UI of its own unless a Hypothesis carries the `stretch` flag, then it labels it and requires one explicit action per card).
    - Files owned: `src/ui/screens/studio/StudioScreen.tsx` (wiring only), `viewModel.ts`.
    - _Requirements: 12.14, 27.3_

  - [ ]* 22.6 [P0] Write PriorGatePanel tests
    - Depends on: task 22.3. Case 1: the toggle changes `enabledPriors`, shows no note field and no real-deck warning, shows the Synthetic_Deck_Notice. Case 2: the toggle is not offered, the enablement note limits (0, 1, 1000, 1001), the Action_Id and Sequence_Number are shown, the Synthetic_Prior_Warning appears on dependent items and at deck level, disable removes the dependency.
    - Files owned: `src/ui/__tests__/priorGatePanel.test.tsx`.
    - _Requirements: 10.9, 10.10, 10.11, 10.12_

  - [ ]* 22.5 [P1] Write Studio P1 tests
    - Side-by-side marks differing cells, override shows the unchanged domain value, `stretch` hypotheses are labelled.
    - Files owned: `src/ui/__tests__/studioP1.test.tsx`.
    - _Requirements: 10.4, 12.5, 12.14, 13.7_

- [ ] 23. [P1] Virtual Loom, P1 features (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `screens/loom/components/SessionReplayControl.tsx`, `WeaversNotesPanel.tsx`, and the wiring and test files named below. Task 23.1 edits `PlaybackControls.tsx` (owned earlier by task 15.3, which is complete at this point).
  - [ ] 23.1 [P1] Implement playback speed and the Replay control
    - Named speed steps (ceiling 8 passes per second, initial value) with keyboard `[` and `]`, and a "Replay" control that resets to pass 0 and starts playback.
    - Files owned: `src/ui/screens/loom/components/PlaybackControls.tsx`.
    - _Requirements: 15.8, 22.7_

  - [ ] 23.2 [P1] Implement the "Replay session" control
    - A separately named control that calls the domain `replaySession` with digest verification and shows `SESSION_DIGEST_MISMATCH` and the other session errors through the Error_Map. Never merged with Replay (Q5). Imports a Session_Log only through the domain importer.
    - Files owned: `src/ui/screens/loom/components/SessionReplayControl.tsx`.
    - _Requirements: 15.16, 16.3_

  - [ ] 23.3 [P1] Implement the Weaver's Notes panel
    - A separate panel titled "Weaver's Notes" with "colour supplied by you, not stored on the cards". Users assign warp and weft colours. Labels go through `validateUserText`. Colour values pass to the domain validator (`INVALID_COLOUR_LAYER`, `COLOUR_LAYER_OUT_OF_RANGE` mapped). Passed to the interpreter only as the Weft_Colour_Layer. Nothing is written into a Card, Deck, Restoration_Record or Correction_Log. The cloth is labelled "colours: user-supplied (Weaver's Notes)" and shows without the layer when cleared.
    - Files owned: `src/ui/screens/loom/components/WeaversNotesPanel.tsx`.
    - _Requirements: 15.13, 15.14, 30.3_

  - [ ] 23.4 [P1] Wire the P1 features into the Loom screen
    - Depends on: tasks 23.1, 23.2, 23.3. Mount the panels and controls.
    - Files owned: `src/ui/screens/loom/LoomScreen.tsx` (wiring only), `viewModel.ts`.
    - _Requirements: 15.8, 15.13, 15.16_

  - [ ]* 23.5 [P1] Write Loom P1 tests
    - Replay and Replay session are two controls with distinct names and calls, a mismatched digest shows the mapped error, a colour layer never reaches a Deck write, clearing the layer restores the plain cloth, an invalid colour shows the domain error.
    - Files owned: `src/ui/__tests__/loomP1.test.tsx`.
    - _Requirements: 15.13, 15.14, 15.16_

- [ ] 24. [P1] Benchmark Lab (reader only) (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `screens/lab/*`, and the test files below.
  - [ ] 24.1 [P1] Implement the report picker, metric table and honesty block
    - `ReportPicker` (single select, lists index entries with dataset identity, Execution_Profile, digest and track statuses, loads through the reader), `MetricTable` (every Metric_Value with its definition identifier, Evaluation_Group, numerator, denominator, counts of cells, items and families, Split_Role, interval as recorded bounds), a `HonestyStatements` block that renders the report's fixed statements verbatim, the unverified markers, and the dataset version, root seed, Component_Stamp, manifest and report digests, register state. Rendering rules shown verbatim: `undefined` as the word "undefined" with its reason, `not-estimated` as "not estimated" with its reason, pooled values marked pooled with their constituents. Chart values also as text. Different Component_Stamps are never combined without the label "different component versions".
    - Files owned: `src/ui/screens/lab/components/ReportPicker.tsx`, `MetricTable.tsx`, `HonestyStatements.tsx`.
    - _Requirements: 18.2, 18.3, 18.5, 18.8, 18.9, 18.10, 18.16, 18.17, 18.18, 18.19_

  - [ ] 24.2 [P1] Implement the reliability diagram and comparison components
    - `ReliabilityDiagram` (bin count shown, an empty bin drawn as empty and never as zero accuracy, ECE and Brier for raw and calibrated as recorded with `not-applicable` verbatim, a table with the same values, patterns in addition to colour). `BaselineComparison` (B1 deck-majority, B2 column-majority, B3 nearest-neighbour with paired difference and interval per Structure_Label, "not distinguishable" verbatim, system coverage shown). `ThresholdTable` (status verbatim: `met`, `not-met`, `not-set`, `not-evaluated`, "not set" shown, register version and state). `UserComparisonSection` (status verbatim; no time number when `not-conducted`). `FailureExampleList` (Item identifier, seed, Damage_Level, category only, no pixels or truth that the report does not embed). A separate `RealPhotographSection` that shares no table or summary with the synthetic section ("not evaluated" with the reason and no number when so recorded).
    - Files owned: `src/ui/screens/lab/components/ReliabilityDiagram.tsx`, `BaselineComparison.tsx`, `ThresholdTable.tsx`, `UserComparisonSection.tsx`, `FailureExampleList.tsx`, `RealPhotographSection.tsx`.
    - _Requirements: 18.6, 18.7, 18.10, 18.11, 18.12, 18.13, 18.14, 18.15, 18.18_

  - [ ] 24.3 [P1] Implement the Lab screen
    - Depends on: tasks 24.1, 24.2. Assembles the components, loads the index on open, shows the empty state when no report is bundled, mapped benchmark errors with no partial report, loading, partial (tracks partly `not-evaluated`) and incomplete-data states. Computes, rounds, averages, ranks and summarises nothing beyond what the report records.
    - Files owned: `src/ui/screens/lab/LabScreen.tsx`, `viewModel.ts`, `strings.ts`.
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.17, 27.5_

  - [ ]* 24.4 [P1] Write property test for metric rendering
    - **Row P10: Metric and interval rendering never fabricates a number**
    - Seed `SEED_P10`, 200 runs; `arbMetricValue` (defined and undefined), `arbBootstrapInterval` and `arbBootstrapNotEstimated`; rendered text for undefined and not-estimated cases equals the documented literal plus reason, and a defined value renders the recorded number.
    - **Validates: Requirements 18.8, 18.9, 18.17**
    - Files owned: `src/ui/__tests__/metricRender.props.test.tsx`, `src/ui/__tests__/generators/metrics.ts`.

  - [ ]* 24.5 [P1] Write Lab component tests
    - Empty bin drawn empty, "not set" threshold, "not distinguishable", `not-conducted` shows no time number, real section separate from synthetic, honesty statements verbatim, different Component_Stamps labelled, a corrupted report shows the mapped error and no partial report.
    - Files owned: `src/ui/__tests__/labScreen.test.tsx`.
    - _Requirements: 18.5, 18.7, 18.11, 18.12, 18.13, 18.14, 18.19_

- [ ] 25. [P1] Kiro Trail build script and Trail / About screen (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `scripts/build-trail.ts`, `trail/loadTrailData.ts`, `screens/trail/*`, and the test files below. The `scripts` folder entry already exists in `structure.md` (task 1.1 verified it).
  - [ ] 25.1 [P1] Implement `scripts/build-trail.ts`
    - A thin TypeScript CLI that reads `docs/KIRO_TRAIL.md`, calls `parseTrailMarkdown`, `verifyEntry` and `buildTrailData` (exported from a pure module under `src/ui/trail/` so tests import it), records `sourceCommit` through `git rev-parse HEAD` and `generatedAt` from the build clock (the one permitted timestamp, labelled "generated at build time"), and writes `data/generated/trail-data.json`. An entry is kept only with a date, a task and at least one evidence reference confirmed at build time (a commit hash found in history, a spec folder, a hook file, or a screenshot under `docs/trail/`). A field marked "unverified" stays "unverified". A failing or malformed entry is excluded, reported with its reason in the build output, and never repaired or invented. A missing or empty source writes the documented empty payload (`entries: []`) and does not fail the build.
    - Files owned: `scripts/build-trail.ts`, `src/ui/trail/trailBuilder.ts`.
    - _Requirements: 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 25.2 [P1] Implement the Trail loader and the Trail / About screen
    - Depends on: task 25.1. `loadTrailData` fetches the static asset and validates it with `validateTrailData`. `TrailScreen` shows the explanation of Kiro's contribution, specs with phase, steering files, hooks, Kiro Crew and MCP use, dated milestones in date order with evidence, screenshots only from files the build found with their date and a text alternative, credits, limitations (unverified card format, synthetic benchmark, uncalibrated confidence, educational simulation), source links with descriptive link text that pass no image or session data, the MIT licence statement, the build stamp ("generated at build time") and the About section with the application version and Component_Stamp (a major version mismatch shows an error). Empty state "No verified Kiro trail entries are bundled in this build" with the stamp and no placeholder. No accuracy, speed or time-saving number unless in a Browser_Report. States per requirement 27.6.
    - Files owned: `src/ui/trail/loadTrailData.ts`, `src/ui/screens/trail/*`.
    - _Requirements: 3.3, 3.7, 17.1, 17.2, 17.3, 17.5, 17.7, 17.8, 17.9, 17.10, 17.11, 27.6, 29.5_

  - [ ]* 25.3 [P1] Write the Trail build test
    - Feed `buildTrailData` a fixture Markdown with one valid entry, one entry with a missing evidence file and one malformed entry. Assert exactly the valid entry appears and the two exclusions are reported with reasons, that an "unverified" field is preserved, and that an empty source gives the empty payload.
    - Test design: Build-time Kiro Trail conversion, Testing Strategy (Trail build test).
    - Files owned: `src/ui/__tests__/trailBuild.test.ts`, `src/ui/__tests__/fixtures/trail/*`.
    - _Requirements: 17.4, 17.5, 17.6, 17.7, 17.12_

  - [ ]* 25.4 [P1] Write Trail screen tests
    - Date order and equal output for equal data, screenshot shown only with an entry, empty state, a `TRAIL_DATA_INVALID` file shows the mapped error, limitations present.
    - Files owned: `src/ui/__tests__/trailScreen.test.tsx`.
    - _Requirements: 17.7, 17.8, 17.9, 17.11_

- [ ] 26. [P1] Glossary completion and first-run guidance (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `shared/glossary/glossaryTerms.ts` (completion), `shared/glossary/GlossaryPanel.tsx`, `shared/guidance/*`, `docs/ui-usability-protocol.md`, and the test file below.
  - [ ] 26.1 [P1] Complete the glossary and the glossary panel
    - Every term of requirement 19.1 with a non-empty plain definition and each Provenance_State, no accuracy, prevalence or physical-loom claim. `GlossaryPanel` opens from the Shell as a modal with a focus trap and Escape to close. Plain-language labels used throughout with the engine term in the inspector or tooltip.
    - Files owned: `src/ui/shared/glossary/glossaryTerms.ts`, `GlossaryPanel.tsx`.
    - _Requirements: 19.1, 19.2, 19.7_

  - [ ] 26.2 [P1] Implement first-run guidance and the Help control
    - `FirstRunPanel` per screen with at most five short steps, non-blocking, dismissible and reopened from `HelpControl`, shown only on first visit, with a first-use notice that work is kept in memory until exported. Dismissal is not a Click.
    - Files owned: `src/ui/shared/guidance/*`.
    - _Requirements: 19.3, 25.3, 4.6_

  - [ ]* 26.3 [P1] Write the glossary completeness test
    - Every term of requirement 19.1 appears with a non-empty definition, each Provenance_State has an entry, no definition contains an accuracy percentage or a physical-loom compatibility claim.
    - Files owned: `src/ui/__tests__/glossary.test.ts`.
    - _Requirements: 19.6, 19.7_

  - [ ] 26.4 [P1] Write the usability test protocol document
    - `docs/ui-usability-protocol.md`: the task list (Quick_Loom_Demo; in a Full_Journey, identify whether a named cell was observed or inferred, state whether a displayed confidence is calibrated, state what approving does), participant criteria, recording rules (no personal data, no recordings). States "not conducted" until a recorded study exists and quotes no result.
    - Files owned: `docs/ui-usability-protocol.md`.
    - _Requirements: 19.5_

- [ ] 27. [P1] Workspace export and import (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `shared/export/workspaceExport.ts`, `shared/export/ImportPanel.tsx`, `shared/export/ExportPanel.tsx` (add the workspace section only), and the test file below.
  - [ ] 27.1 [P1] Implement workspace export and import
    - Export the Session_Artifacts as separate files, each in its owning serialiser (`exportDeckJson`, `exportRestorationRecord`, `exportCorrectionLog`, optional session log), with no pixels and no original image, and the Weft_Colour_Layer only as a separate labelled file. Import passes the text to the matching importer (`importDeckJson`, `importSessionLog`, `importDetectionResult`, `importCorrectionLog`, `importRestorationRecord`) and shows the returned error (`INPUT_TOO_LARGE`, `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`, `INVALID_DECK`, `INVALID_RESTORATION_RECORD`, `INVALID_DETECTION_RESULT`, `CORRECTION_SEQUENCE_INVALID`, `MISSING_REQUIRED_FIELD`) with its path through the Error_Map. A failed import loads no partial value and leaves the Session_Artifacts unchanged. `null` confidences stay `null`. Shows the content kind, Component_Stamp and approval status for each export.
    - Files owned: `src/ui/shared/export/workspaceExport.ts`, `ImportPanel.tsx`.
    - _Requirements: 16.2, 16.3, 16.4, 16.6, 16.7, 30.2_

  - [ ]* 27.2 [P1] Write workspace export and import tests
    - Round trip through the owner serialisers on the doubles (and the real ones when present), each import error code shown with its path, a failed import leaves `artifacts` equal to its earlier value, no pixel data in an export.
    - Files owned: `src/ui/__tests__/workspace.test.tsx`.
    - _Requirements: 16.2, 16.3, 16.4_

- [ ] 28. [P1] Per-screen state tests
  - [ ]* 28.1 [P1] Write the Playwright screen-state tests
    - Depends on: tasks 21.4, 22.4, 23.4, 24.3, 25.2. For each of the five screens, reach each defined state of requirement 27 (loading, empty, error, incomplete-data, needs-review or partial) and assert the visible text, the announcement and the next action.
    - Files owned: `e2e/screen-states.spec.ts`.
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

- [ ] 29. [P1] Boundary corrupted-input tests (required)
  - Depends on: see each sub-task.
  - [ ] 29.1 [P1] Write one corrupted-input test per boundary
    - Depends on: tasks 21.1, 24.3, 25.2, 27.1, 32.1, 10.2, 5.2. For each Boundary of requirement 30 criterion 2 ((a) image, (b) Deck JSON, (c) Session_Log, (d) Detection_Result, (e) Correction_Log, (f) Restoration_Record, (g) BrowserReport and index, (h) Demo_Bundle, (i) Trail_Data, (j) saved local data where built, (k) route parameters, (l) user-entered text) supply at least one truncated, one wrongly typed, one oversized or out-of-range, and one unknown-field or unknown-value input where applicable. Assert the returned error code, the mapped message and recovery action, that no partial value was loaded, and that the Session_Artifacts are unchanged. Tests run on the doubles for sibling-owned boundaries when the real owners are missing, and on the owners when they exist, and record which. This test is required.
    - Files owned: `src/ui/__tests__/boundaryCorruption.test.ts`.
    - _Requirements: 30.2, 30.5, 30.8_

  - [ ] 29.2 [P1] Write the boundary coverage guard
    - Depends on: task 29.1. Fails when a Boundary in `BOUNDARY_OWNERS` or in the requirement 30 list has no corrupted-input test in `boundaryCorruption.test.ts` (tests register their boundary id), and when any code returned at a Boundary lacks an Error_Map entry. This test is required.
    - Files owned: `src/ui/__tests__/boundaryCoverage.test.ts`.
    - _Requirements: 30.8, 30.9_

- [ ] 30. [P1] Keyboard and accessibility suite (Crew-delegable, Group C)
  - Depends on: task 20. Files owned: `shared/a11y/keyboardMap.ts`, `shared/guidance/KeyboardHelp.tsx`, `e2e/a11y/*`, and the test files named below.
  - [ ] 30.1 [P1] Implement the keyboard shortcut registry and help view
    - A registry of every shortcut (the design's keyboard maps) with enable and remap support, and a `?` help view (a modal with a focus trap, Escape closes, focus returns to the opener). No single-character shortcut is the only way to perform its action. Includes zoom and pan keys with a visible instruction.
    - Files owned: `src/ui/shared/a11y/keyboardMap.ts`, `src/ui/shared/guidance/KeyboardHelp.tsx`.
    - _Requirements: 21.3, 21.5, 21.6, 21.8_

  - [ ]* 30.2 [P1] Write the keyboard completeness test
    - **Row P8: Every essential operation has a registered keyboard path**
    - Exhaustive, not random (no seed). Every operation of requirement 21.3 has at least one keyboard path registered and a visible control equivalent.
    - **Validates: Requirements 21.3, 28.6**
    - Files owned: `src/ui/__tests__/keyboardMap.test.ts`.

  - [ ]* 30.3 [P1] Write the axe accessibility suite
    - `@axe-core/playwright` on every screen in every defined state, zero violations at WCAG 2.1 AA. Records the rule set used.
    - Test design: Testing Strategy (Playwright end-to-end and accessibility).
    - Files owned: `e2e/a11y/axe.spec.ts`.
    - _Requirements: 28.5_

  - [ ]* 30.4 [P1] Write the rendered-pixel contrast test
    - Sample rendered pixels behind text, markers and focus indicators on every P0 screen and every ambient-effect setting, take the lowest-contrast background pixel in each element's area, and fail below 4.5:1 for text or 3:1 for components.
    - Files owned: `e2e/a11y/contrast.spec.ts`.
    - _Requirements: 22.2, 22.3_

  - [ ]* 30.5 [P1] Write the reduced-motion emulation test
    - Emulate `prefers-reduced-motion: reduce` and assert ambient motifs stop, Loom playback becomes step-through with identical data, transitions are removed and no information is lost.
    - Files owned: `e2e/a11y/reduced-motion.spec.ts`.
    - _Requirements: 22.4, 22.5, 22.8_

  - [ ]* 30.6 [P1] Write the no-flash check
    - Measure the fastest configured playback and transition change rate and fail above three per second.
    - Files owned: `e2e/a11y/flash-rate.spec.ts`.
    - _Requirements: 22.7, 22.8_

  - [ ]* 30.7 [P1] Write the monochrome test
    - Render the Studio card with CSS `grayscale(1)` and assert each pair of Provenance_Markers still differs in shape or pattern and in label text.
    - Files owned: `e2e/a11y/monochrome.spec.ts`.
    - _Requirements: 22.1, 22.9_

  - [ ]* 30.8 [P1] Write the responsive and touch Playwright tests
    - Complete the P0 journey at a tablet viewport and at a narrow viewport. Assert no horizontal page scroll at the narrow width (outside the viewers), the card is the largest Studio element, and touch targets meet the design's minimum size.
    - Files owned: `e2e/responsive.spec.ts`.
    - _Requirements: 23.2, 23.3, 23.5, 23.6_

  - [ ]* 30.9 [P1] Write the privacy and offline test
    - Block every non-same-origin request, run the Quick_Loom_Demo and the Full_Journey on the Demo_Bundle, and assert both complete, that no request carries image data, and that nothing was written to browser storage.
    - Files owned: `e2e/privacy.spec.ts`.
    - _Requirements: 25.1, 25.2, 25.3, 25.9, 28.7_

- [ ] 31. [P2] Ambient motifs and the ambient-effects toggle
  - Depends on: task 20. Files owned: `shared/layout/AmbientLayer.tsx`, `shared/tokens/motifAssets/*`, `shared/layout/Shell.tsx` (mount the layer and toggle only).
  - [ ] 31.1 [P2] Implement the ambient layer and toggle
    - A Shell-level background layer (a pre-rendered 256 by 256 tiled image or one CSS gradient layer, animation only on `background-position` or `opacity`, opacity ceiling 0.12 so contrast never depends on its absence). Never inside the card viewer or loom stage. A session-only control in the Shell turns it off for users with no system preference. Off under `prefers-reduced-motion`. Removed by `VITE_DISABLE_P2`.
    - Files owned: `src/ui/shared/layout/AmbientLayer.tsx`, `src/ui/shared/tokens/motifAssets/*`, mount edit in `src/ui/shared/layout/Shell.tsx`.
    - _Requirements: 2.4, 22.4, 22.6, 22.10_

- [ ] 32. [P2] Opt-in browser storage
  - Depends on: task 20. Files owned: `persistence/workspaceStorage.ts`, `persistence/SaveWorkspaceControl.tsx`.
  - [ ] 32.1 [P2] Implement the workspace storage module and controls
    - `saveWorkspace(artifacts)` runs only from the click handler of a labelled "Save workspace in this browser" control, stores only the Session_Artifacts through their own exporters (never the image unless the user separately chooses "also save the original image"), and shows what is stored. `loadStoredWorkspace` never runs at mount. `hasStoredWorkspace()` is a cheap existence check. A "Clear local data" control removes every stored item and confirms in text. Stored data re-validates through the owners' importers (Boundary j) and shows `WORKSPACE_DATA_INVALID` with an offer to clear. Removed by `VITE_DISABLE_P2`.
    - Files owned: `src/ui/persistence/workspaceStorage.ts`, `SaveWorkspaceControl.tsx`.
    - _Requirements: 25.3, 25.4, 25.5, 25.6, 30.2_

  - [ ] 32.2 [P2] Wire storage into the application
    - Depends on: task 32.1. On first load, ask the user whether to restore found data and never restore silently. Mount the controls in the app.
    - Files owned: `src/ui/app/App.tsx` (storage wiring only).
    - _Requirements: 25.6_

- [ ] 33. [P2] Synchronised side-by-side zoom
  - Depends on: task 22.1. Files owned: `screens/studio/components/SideBySide.tsx` (zoom sync only).
  - [ ] 33.1 [P2] Implement optional synchronised zoom
    - A toggle that links the zoom and pan of the two comparison cards. Independent zoom stays the default. Removed by `VITE_DISABLE_P2`.
    - Files owned: `src/ui/screens/studio/components/SideBySide.tsx`.
    - _Requirements: 2.4, 13.7_

- [ ] 34. [P1] Performance and bundle measurement
  - Depends on: task 20. Files owned: `scripts/ui-measure.ts`, `docs/ui-measurements.md`, `e2e/perf/*`.
  - [ ] 34.1 [P1] Implement the measurement script and record file
    - `scripts/ui-measure.ts` (npm `measure:ui`) measures the Budgets of the design's table on the built site (initial JavaScript transfer, Image_Backend size and load time, first contentful paint, interaction latency for cell selection and layer toggle, longest main-thread task during detection, time from the first Click to the first woven pass, font payload, memory where the browser exposes it) and writes `docs/ui-measurements.md` with reference hardware and browser versions. It reports each Budget as met, not met or not measured and asserts no threshold. No number is quoted anywhere that is not in a recorded run. All figures in the design are initial values.
    - Files owned: `scripts/ui-measure.ts`, `docs/ui-measurements.md`.
    - _Requirements: 24.4, 24.5_

  - [ ]* 34.2 [P1] Write the main-thread and lazy-load Playwright tests
    - Measure the longest main-thread task during a detection run through the worker with a `longtask` observer and record it against the Budget once defined. Assert no Image_Backend request before the first "start detection" activation, and that the Loom, Lab and Trail code load on demand.
    - Files owned: `e2e/perf/longtask.spec.ts`, `e2e/perf/lazy-load.spec.ts`.
    - _Requirements: 24.2, 24.3, 24.6_

- [ ] 35. [P1] Golden view-model tests and regression file
  - [ ]* 35.1 [P1] Build the golden fixture and update script
    - Depends on: tasks 8.4, 14.5, 17.1. A fixed small deck (not Garín) built through public operations and doubles with `SEED_GOLDEN`, covering one observed, one repeat-inferred, one symmetry-inferred, one ambiguous, one user-edited, one `unknown`, a `null` confidence beside a `0` confidence, and a warning-flagged cell. `npm run golden:ui:update` regenerates goldens and is run only on purpose.
    - Files owned: `src/ui/__tests__/golden/fixture.ts`, `scripts/ui-golden-update.ts`.
    - _Requirements: 28.12_

  - [ ]* 35.2 [P1] Commit goldens and write the comparison tests
    - Depends on: task 35.1. Committed goldens of the view models (provenance legend, heatmap legend, inspector data) and the downloaded SVG fixture. Tests assert byte equality, that `null` and `0` render distinctly, and that the warning cell carries the fixed text and "uncalibrated". A golden change needs a stated reason in the commit message.
    - Files owned: `src/ui/__tests__/golden/*.golden.*`, `src/ui/__tests__/golden.test.ts`.
    - _Requirements: 28.12_

  - [ ] 35.3 [P1] Create the regression example file
    - `src/ui/__tests__/regressions.test.ts` with a header stating that every shrunk counterexample from any property in this suite is added here as a permanent example with its seed and a date-free description. Seeded with a self-check that the file is run.
    - Files owned: `src/ui/__tests__/regressions.test.ts`.
    - _Requirements: 28.13_

- [ ] 37. [P1] Documentation
  - [ ] 37.1 [P1] Write the README and run instructions
    - Depends on: task 18.2 and the P1 tasks. Update `README.md` (or the UI section) with: what the Workbench is, how to run and test (`npm run dev` is run manually by the user, `npm run build`, `npm run preview`, `npm run test:ui`, `npm run test:e2e`, `npm run test:a11y`, `npm run build:trail`, `npm run measure:ui`), the privacy statement (images stay in the browser, nothing uploaded, nothing stored by default), the research credits (Rodas Lorente et al. 2025 with the DOI, the Garín5 dataset), limitations (unverified card format, synthetic benchmark, uncalibrated confidence, educational simulation, Verified export unavailable), the MIT licence statement, and a note that hosting is undecided and the build is a plain static site (Q10). Quotes no number that is absent from a recorded run.
    - Files owned: `README.md` (UI section).
    - _Requirements: 3.2, 3.3, 24.5, 25.1, 25.3, 26.4, 26.6_

  - [ ] 37.2 [P1] Write the assumptions and amendments document
    - `docs/ui-assumptions.md`: the table of assumptions the Workbench depends on (A1 to A11, D3, D7, W1 to W5) with where code depends on each and its correction path, the upstream-availability result from task 1.1, which tests ran on doubles, and the sibling amendments needed, listed only and not applied: (1) domain markers for orientation (D3) and hole polarity (D7); (2) markers for hole spacing, hole sizes and end-hole geometry; (3) domain SVG exporter metadata for the selected hook mapping, threads-per-hook and mirror; (4) a single domain accessor for the eleven statuses; (5) optional restoration progress reporting; (6) `structure.md` naming the benchmark browser-safe reader subpath; (7) `kiro-evidence.md` stating the build-time verification rule; (8) the vision public index exporting `sha256Hex` (until then the UI computes the digest itself with `crypto.subtle.digest`, task 10.4). The report path (`data/benchmark/browser/index.json`), the worker import rule and the attestation inputs are resolved in the design and are not listed. No sibling file is edited.
    - Files owned: `docs/ui-assumptions.md`.
    - _Requirements: 26.4, 26.6, 29.1_

- [ ] 38. [P1] Final repository guards (required)
  - [ ] 38.1 [P1] Write the final guards
    - Depends on: all implementation tasks. `src/ui/__tests__/guards.test.ts`: no file imports `_stub.ts`, then delete `_stub.ts`; the surface snapshot is unchanged since the freeze and `WORKBENCH_INTERFACE_VERSION` is `"1.0.0"`; the error-registry sync, banned-wording, boundary, validator-ownership and boundary-coverage tests exist; no `src/ui` file imports `contracts.ts`; no state-management or schema-validation library appears in `package.json` (Q2, Q6); no `src/ui` string or built asset references an external font or a non-same-origin URL; no file under `src/domain`, `src/vision`, `src/restore`, `src/benchmark` or `src/workers` imports `src/ui`; no `src/ui` module outside `viewState/clock.ts`, `loom/scheduler.ts` and `scripts` reads a clock or uses `Math.random` in an engine-value path; the Q4 export rules hold (no acknowledgement control or dialog on the unverified export path); no committed file under `data/` is a user photograph (a README is present in `data/demo`). This test is required.
    - Files owned: `src/ui/__tests__/guards.test.ts`.
    - _Requirements: 1.1, 1.2, 1.9, 1.11, 14.5, 25.1, 25.10, 29.1, 30.6_

- [ ] 39. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Items awaiting user confirmation (none of these is settled by this plan, and no sibling spec is edited):
    - **Domain MachineProfile markers:** the three missing verification markers (orientation D3, hole polarity D7, and the separately marked hole spacing, hole sizes and end-hole geometry) and the exporter metadata for hook mapping, threads-per-hook and mirror. Until the domain adds them, Verified_Export_Mode cannot become available for any profile (design "Export Design"). Confirm whether to amend the domain spec (recommended) or read the values from detection fields.
    - **Upstream availability:** which sibling exports exist at execution start (task 1.1 result), and therefore which tests ran on doubles and which `it.skip` tests remain.
    - **Req 14.7 versus 17.6c wording conflict** carried from the restoration spec: after a withdrawal on an approved deck the derived deck state is `proposed` or `reviewed`. The Workbench displays whatever `deriveDeckState` returns. Confirm the restoration decision.
    - **Q7 internationalisation:** English only is assumed. Confirm no i18n scaffolding is wanted now.
    - **Q10 hosting:** undecided. No hosting task is planned. Decide before deployment planning.
    - **Initial values to confirm by measurement:** tablet width and touch target size (design constants), the Budgets (task 34.1), playback speed ceiling, motif opacity ceiling. None is a claim.
    - **Seed block:** this plan uses `20260801` to `20260810` and `20260890`. Confirm no collision with another spec's block (benchmark uses `20260700+`, restoration `20260500+`).
    - **Usability study (Req 19.5):** whether one will be run before submission. The default is "not conducted".

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Required items include the import-boundary and validator-ownership tests (1.3), the surface snapshot (2.8), the Error_Map coverage test (7.2), the banned-wording scan (16.2), the Playwright P0 journey (19.1) and three-Click test (19.2), the boundary corrupted-input tests (29.1) and coverage guard (29.2), the regression file (35.3) and the final guards (38.1), because they enforce stated requirements.
- Crew delegation summary (every task listed starts after the interface freeze, task 3, and edits no frozen file):

| Task | Group | Tier | Depends on | Files owned (disjoint) |
|------|-------|------|------------|------------------------|
| 4 | A | P0 | 3 | `styles/*`, `assets/fonts/*`, `shared/tokens/cssVariables.ts` |
| 5 | A | P0 | 3 | `app/routes.ts`, `boundaries/{routeParams,userText,demoBundleManifest,trailData}.ts` |
| 6 | A | P0 | 3, 7.1 (for 6.2) | `app/AppStore.ts`, `app/sessionArtifacts.ts`, `app/dispatchSiblingCall.ts`, `viewState/clock.ts` |
| 7 | A | P0 | 3 | `viewState/errorMap.ts`, `viewState/errorMessages.ts` |
| 8 | A | P0 | 3 | `viewState/{provenanceMarker,confidenceDisplay,clickCounter,selectors}.ts`, `shared/export/requiredVerifiedFields.ts` |
| 9 | A | P0 | 3 | `workers/host/*`, `src/workers/*.worker.ts` |
| 10 | A | P0 | 3, 5.2 (for 10.2), 2.5 (for 10.4); 10.6 needs the real engine | `data/demo/*`, `scripts/build-demo-bundle.ts`, `scripts/assert-no-placeholder-bundle.ts`, `demoBundle/{loadDemoBundle,digest,attestation,deckOrigin,contextDeck}.ts` |
| 11 | B | P0 | 3, 4.1 | `shared/layout/*`, `shared/a11y/*`, `shared/status/*` (including `SimulatedDemoBadge.tsx`, `ContextCardLabel.tsx`), `shared/glossary/*` |
| 12 | B | P0 | 8.2, 10.2, 11.1 | `screens/start/*` |
| 13 | B | P0 | 4.1, 8.1, 9.1, 6.2, 10.2, 11.3 | `screens/scan/*` (P0 files) |
| 14 | B | P0 | 8, 9.2, 6.2 | `screens/studio/*` (P0 files) |
| 15 | B | P0 | 3, 4.1, 6.2 | `loom/scheduler.ts`, `screens/loom/*` (P0 files) |
| 16 | B | P0 | 8.3 | `shared/export/ExportPanel.tsx`, `exportModes.ts` |
| 17 | B | P0 | 3, 8.1, 11.3 | `screens/results/*` |
| 18 | C | P0 | 5.1, 6.2, 10.4, 10.6 (18.2), 11.4, 12.1, 13.2, 14.5, 15.4, 16.1, 17.1, 22.3 | `main.tsx`, `app/App.tsx`, `index.html`, `scripts/ui-copy-assets.ts` |
| 19 | C | P0 (19.4 is P1) | 18.2 (19.4 also 21.4) | `e2e/p0-journey.spec.ts`, `e2e/quick-loom-demo.spec.ts`, `e2e/p0-keyboard.spec.ts`, `e2e/upload-path.spec.ts` |
| 21 | C | P1 | 20 | `screens/scan/components/{UploadDropzone,OrientationChooser,AlignmentEditor,CorrectionLogList,QualityFindingsList}.tsx` |
| 22 | C (22.3: B) | P1 (22.3, 22.6: P0) | 20 (22.3: 3, 6.2, 8.1, 9.2, 11.3, before task 18) | `screens/studio/components/{SideBySide,OverrideList,NeedsReviewList,PriorGatePanel}.tsx` |
| 23 | C | P1 | 20 | `screens/loom/components/{SessionReplayControl,WeaversNotesPanel}.tsx`, `PlaybackControls.tsx` (23.1 only) |
| 24 | C | P1 | 20 | `screens/lab/*` |
| 25 | C | P1 | 20 | `scripts/build-trail.ts`, `trail/trailBuilder.ts`, `trail/loadTrailData.ts`, `screens/trail/*` |
| 26 | C | P1 | 20 | `shared/glossary/glossaryTerms.ts`, `GlossaryPanel.tsx`, `shared/guidance/*`, `docs/ui-usability-protocol.md` |
| 27 | C | P1 | 20 | `shared/export/workspaceExport.ts`, `ImportPanel.tsx` |
| 29 | C | P1 | see sub-tasks | `__tests__/boundaryCorruption.test.ts`, `boundaryCoverage.test.ts` |
| 30 | C | P1 | 20 | `shared/a11y/keyboardMap.ts`, `shared/guidance/KeyboardHelp.tsx`, `e2e/a11y/*`, `e2e/responsive.spec.ts`, `e2e/privacy.spec.ts` |
| 31, 32, 33 | D | P2 | 20 (33: 22.1) | `shared/layout/AmbientLayer.tsx`, `persistence/*`, `SideBySide.tsx` (zoom sync only) |
| 34 | D | P1 | 20 | `scripts/ui-measure.ts`, `docs/ui-measurements.md`, `e2e/perf/*` |
| 35 | E | P1 | 8.4, 14.5, 17.1 | `__tests__/golden/*`, `scripts/ui-golden-update.ts`, `regressions.test.ts` |
| 37, 38 | E | P1 | all | `README.md`, `docs/ui-assumptions.md`, `__tests__/guards.test.ts` |

- Each Crew task owns its tests and edits no file owned by another task in the same wave. Files edited by two tasks (`PlaybackControls.tsx`, `ScanScreen.tsx`, `StudioScreen.tsx`, `LoomScreen.tsx`, `SideBySide.tsx`, `ExportPanel.tsx`, `Shell.tsx`, `App.tsx`, `glossaryTerms.ts`) are edited in different waves only. `package.json`, `vite.config.ts`, `vitest.config.ts` and `playwright.config.ts` are created and edited only by the integrator at milestone M0 (A0-1). No task edits them, and a task that needs a change asks the integrator.
- Property test coverage (design Testing Strategy rows, seeds `20260800 + n`): P1 task 8.5; P2 8.6; P3 7.2 (exhaustive); P4 8.7; P5 5.3; P6 5.4; P7 8.8; P8 30.2 (exhaustive); P9 5.5; P10 24.4.
- Stub and double policy: until a sibling library exports what a UI task calls, the task codes against `src/ui/upstream/ports.ts` and tests with `fakeUpstream.ts`. The doubles are deterministic and contain no engine logic beyond a fixed canned response, so tests of the Workbench check wiring, display and boundary behaviour, not sibling correctness.
- Sibling specs are not edited. Needed sibling amendments are listed in `docs/ui-assumptions.md` and in checkpoint 39.
- No accuracy, speed, latency or time-saving number is asserted anywhere in this plan. Every figure comes from a recorded run.
- Hosting is undecided (Q10). The plan contains one static-build task (18.2) and a README note (37.1) and nothing else about deployment.
- This workflow only creates planning artifacts. To start executing, open this file and click "Start task" next to a task item.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1", "2.2", "2.6"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["2.7"] },
    { "id": 5, "tasks": ["2.8"] },
    { "id": 6, "tasks": ["3"] },
    { "id": 7, "tasks": ["4.1", "5.1", "5.2", "6.1", "7.1", "8.1", "8.2", "8.3", "9.1", "9.2", "10.1", "10.4", "11.2"] },
    { "id": 8, "tasks": ["4.2", "5.3", "5.4", "5.5", "5.6", "6.2", "7.2", "8.4", "8.5", "8.6", "8.7", "8.8", "9.3", "10.2", "10.5", "11.1", "11.3"] },
    { "id": 9, "tasks": ["6.3", "10.3", "11.4", "22.3", "12.1", "13.1", "14.1", "15.1", "15.2", "16.1", "17.1"] },
    { "id": 10, "tasks": ["11.5", "11.6", "22.6", "12.2", "13.2", "14.2", "14.4", "15.3", "15.5", "16.2", "16.3", "17.2"] },
    { "id": 11, "tasks": ["13.3", "14.3", "15.4"] },
    { "id": 12, "tasks": ["14.5"] },
    { "id": 13, "tasks": ["10.6", "14.6", "18.1"] },
    { "id": 14, "tasks": ["18.2"] },
    { "id": 15, "tasks": ["19.1", "19.2", "19.3"] },
    { "id": 16, "tasks": ["20"] },
    { "id": 17, "tasks": ["21.1", "21.2", "21.3", "22.1", "22.2", "23.1", "23.2", "23.3", "24.1", "24.2", "25.1", "26.1", "26.2", "27.1", "30.1", "34.1", "35.3", "37.2"] },
    { "id": 18, "tasks": ["21.4", "22.4", "23.4", "24.3", "24.4", "25.2", "25.3", "26.3", "26.4", "27.2", "31.1", "32.1", "33.1"] },
    { "id": 19, "tasks": ["21.5", "21.6", "19.4", "22.5", "23.5", "24.5", "25.4", "28.1", "29.1", "30.2", "30.3", "30.4", "30.5", "30.6", "30.7", "30.8", "30.9", "32.2", "34.2", "35.1"] },
    { "id": 20, "tasks": ["29.2", "35.2", "37.1"] },
    { "id": 21, "tasks": ["38.1"] },
    { "id": 22, "tasks": ["39"] }
  ]
}
```

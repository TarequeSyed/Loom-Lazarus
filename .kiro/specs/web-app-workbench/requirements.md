# Requirements Document

## Introduction

This feature delivers the Workbench: the browser application in `src/ui` (React, Vite) and its worker entry points in `src/workers`. It is the fifth of five specs (domain, detection, restoration, benchmark, web-app-workbench). It turns the four engines into one journey: photograph or bundled sample, hole detection, evidence-based restoration, human approval, deterministic virtual loom, export. A fifth surface shows committed benchmark reports, and a sixth shows the real Kiro engineering trail.

**Product stance.** The Workbench is a haunted textile archive and a scientific restoration laboratory, not a generic dashboard. The visual heroes are the punched card, the missing instructions, the confidence evidence and the woven output. Controls appear in context, next to the thing they act on. The look follows `.kiro/steering/ui-design-system.md` (charcoal and deep purple, antique amber for observation and the loom, ghost-cyan for inference, low-contrast thread and perforation motifs, restrained animation). Token values, wireframes and component code belong to `design.md`. This document states only user-facing, testable obligations.

**The Workbench holds view state only.** The single source of truth is the domain `Deck`, the Restoration_Record and the Correction_Log. Every change to them passes through the sibling APIs (`userEdit`, `undoEdit`, `setInferred` through the review service, `withdrawInference`, `requestApproval`, `revokeApproval`, the manual-correction service). The Workbench never edits a Deck, a record or a log by any other path, and never computes detection, inference, benchmark or loom results itself.

**Honesty rules carried from steering.** The Workbench never states an accuracy, frequency, calibration or time-saving number that is absent from a recorded run. It shows uncertainty everywhere. It shows what was observed and what was inferred with different treatments. It never conceals an inferred cell behind the treatment of an observed cell. It shows `null` confidence as "not evaluated" and never as 0%. Cards carry no colour. The loom is an educational simulation. The Workbench makes no physical-cutting or physical-loom claim that the domain does not support.

**Verification status of the card format.** No Garín format value in `jacquard-card-format.md` is verified against Rodas Lorente et al. (2025), https://doi.org/10.1007/s11042-025-20917-9. The Workbench reads every format fact from the `MachineProfile`, shows its verification markers wherever a dependent value is shown, and lists its own dependence in "Assumptions requiring verification".

**Scope boundaries.**
- In scope: application shell and navigation, the five screens (Scan & Detect, Restoration Studio, Virtual Loom, Benchmark Lab, Kiro Trail / About), the first-run experience, provenance and confidence presentation, keyboard and accessibility behaviour, reduced motion, responsive layout, error mapping, local persistence rules, export user flows, the build-time Kiro Trail conversion, and the automated tests of these obligations.
- Out of scope: the detection, restoration, benchmark and loom algorithms, damage models, benchmark execution in the browser, user accounts, server-side storage of photos, physical loom control, support for card formats other than those a `MachineProfile` describes, and internationalisation (English only; see Q7).

**MVP first.** One end-to-end scenario takes priority: preloaded damaged card, detection, evidence-based restoration, human approval, animated loom, export. Requirement 2 defines the tiers P0, P1 and P2. Advanced animation and decorative interaction never block the P0 path. Every requirement carries a tier.

## Glossary

- **Workbench**: The browser application specified by this document, as a whole.
- **Shell**: The persistent frame of the Workbench: left navigation, the central workbench area, the contextual inspector area, and the persistent footer content of requirement 3.
- **Scan_Screen**, **Studio_Screen**, **Loom_Screen**, **Lab_Screen**, **Trail_Screen**: The five main screens: Scan & Detect, Restoration Studio, Virtual Loom, Benchmark Lab, Kiro Trail / About.
- **Demo_Bundle**: The committed sample under `data` that contains one damaged synthetic card image, its recorded orientation, a recorded loom configuration, a precomputed approved deck for the Quick_Loom_Demo, and a README with source and licence. Its content is synthetic unless the README records a checked licence for real material.
- **Quick_Loom_Demo**: The path that opens the Loom_Screen with the Demo_Bundle approved deck and recorded loom configuration (requirement 4).
- **Full_Journey**: The path through all five P0 steps: demo card, detection, restoration, approval, loom, export (requirement 2).
- **Click**: One activation of a control by pointer press or by the Enter or Space key on a focused control. Scrolling, hovering, moving focus and typing are not Clicks.
- **Domain_Deck**: The domain `Deck` value, the single source of truth for cell values, provenance, history and approval.
- **Restoration_Record**: The restoration-layer record defined by the restoration spec.
- **Correction_Log**: The detection-layer correction log defined by the card-detection spec.
- **Session_Artifacts**: The Domain_Deck, Restoration_Record, Correction_Log and, optionally, the domain Session_Log of one working session.
- **View_State**: State that exists only for display (selected cell, zoom, active layer, panel visibility, playback speed). It is never a source of truth.
- **Provenance_Marker**: The combination of a colour, a shape or pattern, and a text label that identifies one Provenance or Condition state. Each state has its own Provenance_Marker.
- **Provenance_State**: One of `observed`, `repeat-inferred`, `symmetry-inferred`, `ambiguous`, `user-edited` (domain Provenance), plus the display states `unknown` (detection Condition unknown or restoration abstention) and `unresolved`.
- **Hole_Likelihood**: The detection estimate that a hole is present in the image. It is not restoration confidence.
- **Restoration_Confidence_Display**: The presentation of a restoration confidence: a numeric value with a Calibration_Marker, or the text "not evaluated" for `null`.
- **Calibration_Marker**: The visible marker `uncalibrated` or `calibrated` with the cited Calibration_Record reference.
- **Synthetic_Prior_Warning**: The restoration spec's fixed text "Warning: this prior was derived from synthetic data and has not been validated on historical cards." and its flag.
- **Educational_Label**: The domain disclaimer constant "Educational Jacquard-inspired simulation. Not compatible with, and does not drive, physical looms."
- **Cutting_Caveat**: The domain SVG caveat constant (requirement 6 criterion 6 of the domain spec): "Not validated for physical laser cutting or any physical loom. Dimensions are unverified unless marked verified in the Machine_Profile."
- **Weavers_Notes**: The user-supplied colour layer of the Loom_Screen. It is the domain Weft_Colour_Layer under a user-facing name.
- **Verified_Export_Mode**, **Unverified_Export_Mode**: The two physical-cutting export modes of requirement 14.
- **Required_Verified_Fields**: The explicit set of eleven profile facts listed in requirement 14 criterion 2, each of which must carry `verified` status with a non-empty source citation before Verified_Export_Mode is available.
- **Unverified_Assumption_Metadata**: The machine-readable and visible record, inside an Unverified_Export_Mode file and in the export UI, of every Required_Verified_Fields entry that is not `verified`, with its basis (for example `geometric-inference`), together with the Cutting_Caveat constant (requirement 14).
- **Boundary**: A point where external or user-supplied data enters the Workbench (requirement 30). Each Boundary has one owning module whose validator the Workbench calls.
- **Owner_Validator**: The validator or importer exported by the module that owns a data type (domain, vision, restoration or benchmark). The Workbench calls it and adds no second validator for the same data.
- **Browser_Report**: The committed benchmark report type of the benchmark spec, read through its browser-safe Report_Reader.
- **Trail_Data**: The JSON generated at build time from `docs/KIRO_TRAIL.md` (requirement 17).
- **Error_Map**: The Workbench table from every Vision, Restoration, Domain and Benchmark error code to a plain-language message and a recovery action (requirement 20).
- **Worker_Host**: The code in `src/workers` and `src/ui` that runs detection and restoration off the UI thread through typed, versioned, structured-cloneable messages.
- **Budget**: A numeric performance or size limit that `design.md` defines and a measurement validates. This document fixes none.
- **Tier**: P0 (the MVP path), P1 (complete the five screens) or P2 (enhancement).

## Requirements

### Requirement 1: Architecture boundaries and single source of truth

**Tier:** P0

**User Story:** As a maintainer, I want the UI to hold view state only and to route every change through the engines, so that what a user sees always equals what the engines recorded.

#### Acceptance Criteria

1. THE Workbench SHALL import only the public indexes of `src/domain`, `src/vision`, `src/restore` and the browser-safe Report_Reader of `src/benchmark`, and SHALL NOT import any other module of those folders.
2. THE Workbench SHALL be imported by no module in `src/domain`, `src/vision`, `src/restore`, `src/benchmark` or `src/workers`.
3. THE Workbench SHALL provide an import-boundary test that fails when a file in `src/ui` violates criterion 1, when a file in the other source folders imports `src/ui`, or when a file in `src/ui` imports a Node-only module or a benchmark module that reads ground truth.
4. THE Workbench SHALL treat the Domain_Deck, the Restoration_Record and the Correction_Log as the single source of truth, and SHALL derive every displayed cell value, provenance, confidence, state and approval status from them through the sibling public accessors.
5. WHEN a user changes a cell value, an inference decision, an approval, or a correction, THE Workbench SHALL perform the change only through the matching sibling API (`userEdit`, the review service, `undoEdit`, `withdrawInference`, `requestApproval`, `revokeApproval`, or the manual-correction service), and SHALL replace its displayed state with the value that the API returns.
6. IF a sibling API returns an error, THEN THE Workbench SHALL leave the Session_Artifacts unchanged, SHALL leave the displayed values equal to the previous values, and SHALL show the mapped message of requirement 20.
7. THE Workbench SHALL keep View_State separate from Session_Artifacts, and SHALL NOT write View_State into any Session_Artifact.
8. THE Workbench SHALL run detection and restoration only inside workers through the Worker_Host, and SHALL NOT run an image-processing or inference loop on the UI thread.
9. THE Workbench SHALL contain no inference, detection, metric or loom computation of its own, and SHALL provide a test that fails when a module in `src/ui` reimplements a sibling function (for example a read-order, confidence or accuracy computation).
10. THE Workbench SHALL use no wall-clock value in any Session_Artifact. WHERE the Workbench supplies an Opaque_Timestamp_Label to the restoration service, THE Workbench SHALL read it from its own clock outside the engines and SHALL display it as an unparsed string.
11. THE Workbench SHALL use no `Math.random` in any code path that affects a displayed engine value, and SHALL take every seed from configuration.

### Requirement 2: Priority tiers and the MVP path

**Tier:** P0

**User Story:** As a project owner, I want an explicit MVP path, so that decoration never blocks the one scenario that must work.

#### Acceptance Criteria

1. THE Workbench SHALL deliver the P0 tier before any P1 or P2 item is started, and SHALL tag every requirement and screen feature of this document with its Tier.
2. THE P0 tier SHALL consist of: the Shell with persistent credits and Educational_Label (requirement 3); the Quick_Loom_Demo (requirement 4); Scan_Screen with the Demo_Bundle card, detection with progress and cancel, overlay of holes and uncertain regions, and failure display (requirements 5 to 7); Studio_Screen with the card viewer, Provenance_Markers, the region inspector, accept, select, reject, value edit, undo, and approval with blocking reasons (requirements 9 to 13); Loom_Screen with explicit mirror and hook-mapping selection, step, play, pause, seek and reset, and the Educational_Label (requirement 15); JSON and SVG export in Unverified_Export_Mode with Verified_Export_Mode present and disabled (requirement 16); the error mapping (requirement 20); keyboard access, contrast and reduced-motion behaviour for these screens (requirements 21 to 23); and the end-to-end journey test (requirement 28).
3. THE P1 tier SHALL consist of: file picker and drag-and-drop upload of user images, quality-finding detail, manual alignment fallback, condition overrides, needs-review handling, side-by-side comparison, playback speed and replay, Weavers_Notes, the Benchmark_Lab, the Trail_Screen, glossary and first-run guidance beyond the P0 labels, workspace export and import, and the accessibility suite for all screens.
4. THE P2 tier SHALL consist of: ambient fog and thread animation, perforation and thread motifs beyond static backgrounds, synchronised zoom between the side-by-side cards, opt-in browser storage of a workspace, deep links beyond the screen route, and decorative transitions.
5. THE Workbench SHALL keep each P1 and P2 item removable without changing the P0 path, so that the P0 path passes its end-to-end test with every P1 and P2 item disabled.
6. THE Workbench SHALL provide a build configuration that disables all P2 items, and THE end-to-end journey test of requirement 28 SHALL run on that configuration.

### Requirement 3: Shell, navigation and persistent content

**Tier:** P0

**User Story:** As a visitor, I want a consistent frame with navigation, credits and the simulation label always reachable, so that I always know where I am and what the system claims.

#### Acceptance Criteria

1. THE Shell SHALL present the five screens as navigation entries (Scan & Detect, Restoration Studio, Virtual Loom, Benchmark Lab, Kiro Trail / About) in a left navigation, a focused central workbench area, and a contextual right-hand inspector area that is shown only where a screen defines inspector content.
2. THE Shell SHALL show on every screen, without scrolling past other content, a persistent control that opens the research credits (Rodas Lorente et al. 2025 with https://doi.org/10.1007/s11042-025-20917-9, the Garín5 dataset, and other resources) and the Educational_Label.
3. THE Shell SHALL credit the reference paper as prior work that already covers digitisation, recognition of damaged cards, error correction, manual validation, pattern reconstruction and vector export, and SHALL NOT present those capabilities as inventions of this project.
4. WHILE a screen shows a loom result or a loom export control, THE Shell SHALL show the Educational_Label on that screen.
5. THE Shell SHALL show the current Domain_Deck approval status (`unapproved` or `approved`) and the current Restoration_State on every screen that is not the Trail_Screen or the Lab_Screen, using text and a marker in addition to colour.
6. WHERE a screen is not available because its prerequisite is missing (for example the Loom_Screen without an approved deck), THE Shell SHALL keep its navigation entry reachable and SHALL show the screen's empty state with the reason and the action that fixes it.
7. THE Shell SHALL show the bundled application version and the Component_Stamp of the engines in the About section of the Trail_Screen.
8. THE Shell SHALL contain a visible, labelled "Glossary" entry that opens the glossary of requirement 19 from every screen.
9. THE Shell SHALL contain no advertisement, tracking script or third-party request, and SHALL load all fonts, scripts and assets from the same origin.

### Requirement 4: First visit and the three-Click loom demonstration

**Tier:** P0

**User Story:** As a judge or new visitor, I want to see the loom weave a recovered pattern within three Clicks of opening the page, so that I understand the product in a few minutes without uploading anything.

#### Acceptance Criteria

1. WHEN the Workbench first loads with no stored workspace, THE Workbench SHALL show a start view that offers two clearly labelled primary actions, "Watch the loom weave the demonstration deck" (Quick_Loom_Demo) and "Walk through the full restoration" (Full_Journey), and SHALL show them without scrolling at tablet width and above.
2. THE Workbench SHALL count the Clicks of the Quick_Loom_Demo from the first rendered page, with the page load itself counting as zero Clicks.
3. WHEN a user activates "Watch the loom weave the demonstration deck" (Click 1), THE Workbench SHALL open the Loom_Screen with the Demo_Bundle approved deck loaded, the Demo_Bundle recorded loom configuration (mirror orientation, hook mapping and threads-per-hook) shown as an explicit, labelled selection "chosen by the demonstration, change it below", and the Play control enabled.
4. WHEN a user activates Play on that screen (Click 2), THE Workbench SHALL start the animated playback, or, WHILE reduced motion is requested, SHALL advance by one pass per activation of the Step control with the same information shown.
5. THE Quick_Loom_Demo SHALL need at most two Clicks to the first woven pass, and SHALL need no more than three Clicks for the user to dismiss any first-run note and reach a running playback.
6. THE first-run guidance of requirement 19 SHALL be non-blocking, SHALL NOT need a Click to dismiss before another control is usable, and SHALL NOT be counted as a Click.
7. THE Workbench SHALL label the demonstration deck as "bundled synthetic demonstration deck" together with its recorded provenance, and SHALL state that the recorded loom configuration was chosen by the demonstration and is not a default of the Workbench.
8. THE Workbench SHALL provide no default mirror orientation and no default hook mapping for a deck that the user brings to the Loom_Screen, and SHALL treat the Demo_Bundle recorded configuration as an explicit selection supplied with the sample.
9. WHEN a user activates "Walk through the full restoration", THE Workbench SHALL open the Scan_Screen with the Demo_Bundle card already offered and a visible, ordered list of the remaining steps (detect, review, approve, weave, export) with the current step marked.
10. THE Workbench SHALL provide an automated test that starts from the first page load, performs the Quick_Loom_Demo with at most three Clicks counted by the rule of the Glossary, and asserts that at least one woven pass is visible after the last Click.

### Requirement 5: Scan & Detect: intake and the bundled card

**Tier:** P0 for the Demo_Bundle card, P1 for user upload

**User Story:** As an archivist, I want to bring a card photograph or use the bundled card, and keep my original untouched, so that I can start a restoration without uploading anything.

#### Acceptance Criteria

1. THE Scan_Screen SHALL offer the Demo_Bundle damaged card as a one-Click selection, labelled "bundled synthetic demonstration card", with its source and licence reachable from the label.
2. WHERE P1 upload is built, THE Scan_Screen SHALL offer drag-and-drop and a file picker, and SHALL make the drop zone operable by keyboard (focusable, activated by Enter or Space to open the file picker) with a visible focus state and a text label.
3. WHEN a user supplies an image, THE Scan_Screen SHALL pass the bytes to the Worker_Host without upload to any server, and SHALL show the original image in a viewer that the user can open at any time during the session.
4. THE Scan_Screen SHALL keep the original image unchanged, SHALL show the Image_Digest and the original dimensions, and SHALL provide a control to switch between the original and the rectified view.
5. IF the intake validation rejects the image, THEN THE Scan_Screen SHALL show the mapped message of requirement 20 for the returned Vision_Error_Code, SHALL state the supplied value and the permitted value where the error carries them, and SHALL keep the previous image and result, if any.
6. WHEN the Demo_Bundle card is selected and the detection reports `orientation-unresolved`, THE Scan_Screen SHALL apply the Orientation recorded in the Demo_Bundle as a user-supplied Orientation, SHALL label it "orientation recorded with the bundled sample, not detected", and SHALL record it as a Geometry_Correction through the manual-correction service.
7. WHEN a user-supplied image yields `orientation-unresolved`, THE Scan_Screen SHALL show the candidate Orientations with their scores and previews, SHALL NOT show per-cell results, and SHALL require the user to choose one before detection continues.
8. THE Scan_Screen SHALL state in plain language that images stay in the browser and are not uploaded.
9. THE Scan_Screen SHALL show an empty state before any image is chosen, a loading state while the Image_Backend loads, a progress state while detection runs (requirement 6), an error state for a failed run, and an incomplete-data state for an `aligned-with-warnings` result, each with a visible text description and a next action.

### Requirement 6: Scan & Detect: progress, cancellation and failure

**Tier:** P0

**User Story:** As a user, I want to see detection progress, cancel it, and understand a failure, so that I never wait on a frozen screen.

#### Acceptance Criteria

1. WHEN detection starts, THE Scan_Screen SHALL show the current stage name (`intake`, `preprocess`, `geometry`, `grid`, `classify`, `quality`, `assemble`) in plain language, the completion fraction from the worker `progress` messages, and an enabled Cancel control.
2. THE Scan_Screen SHALL show a completion fraction that does not decrease within one run.
3. WHEN a user activates Cancel, THE Scan_Screen SHALL send `cancel` for the active `runId`, SHALL show "cancelling" until the worker replies, and SHALL then show that the run was cancelled with the retained previous result, if any.
4. WHILE detection runs, THE Scan_Screen SHALL remain responsive to pointer and keyboard input, and SHALL keep every control that is not blocked by the run operable.
5. IF the worker replies with `RUN_IN_PROGRESS`, `BACKEND_LOAD_FAILED`, `INTERNAL_ERROR`, `INVALID_MESSAGE` or `UNSUPPORTED_PROTOCOL_VERSION`, THEN THE Scan_Screen SHALL show the mapped message with a recovery action and SHALL leave the application able to start a new run.
6. IF the Alignment_Status is `failed`, THEN THE Scan_Screen SHALL show the failure stage, the reason, the numeric values and thresholds in a details area, the suggested user actions from the detection list, the annotated Derived_Artifacts returned, and an action that opens the manual alignment fallback (requirement 8), and SHALL show no per-cell result.
7. IF the detection reports `MULTIPLE_CARDS_SUSPECTED`, THEN THE Scan_Screen SHALL show the candidate polygons on the image and SHALL state that one card per image is supported.
8. IF the Image_Backend cannot load and the Demo_Bundle includes a precomputed Detection_Result, THEN THE Scan_Screen SHALL offer to continue with the precomputed result, SHALL label every value derived from it "precomputed, not detected in your browser", and SHALL NOT present it as a fresh run [CONFIRM Q3].
9. THE Scan_Screen SHALL show, for each finished run, the Implementation_Stamp and the Hole_Polarity_Assumption in effect with its `unverified` marker.

### Requirement 7: Scan & Detect: overlays, grid and quality findings

**Tier:** P0 for the hole and uncertain-region overlay, P1 for finding detail

**User Story:** As a researcher, I want to see where the system found holes, where the grid sits and where it could not read, so that I can judge the detection before I trust it.

#### Acceptance Criteria

1. WHEN a detection result with Alignment_Status `aligned` or `aligned-with-warnings` exists, THE Scan_Screen SHALL draw over the card image one marker per Readable_Position, in Image_Coordinates, whose marker kind distinguishes Condition `observed` with hole present, `observed` with hole absent, `ambiguous` and `unknown`, using a distinct shape and a text label in the legend in addition to colour.
2. THE Scan_Screen SHALL provide independent toggles for the hole markers, the grid with Grid_Positions (row and column labels, `readIndex` on focus or hover), the Reserved_Positions, the Unknown_Regions and the Quality_Finding polygons.
3. THE Scan_Screen SHALL draw each Reserved_Position with a marker that is distinct from every instruction marker, with the label "reserved, not an instruction", and WHERE the profile marks `reservedPositions` `unverified`, with the text "location inferred, unverified".
4. THE Scan_Screen SHALL draw each Unknown_Region and show its reason from the fixed list in plain language, and SHALL NOT draw an unknown position as a position with an absent hole.
5. WHEN a user selects a position, THE Scan_Screen SHALL show in the inspector its `readIndex`, Grid_Position, Condition, Hole_Likelihood (or "no reading" for `unknown`), proposed raw value, the deciding feature values and the diagnostics text, and the Quality_Finding identifiers that overlap it.
6. THE Scan_Screen SHALL list each Quality_Finding with its kind, severity, numeric score, affected position count and the statement that it is a heuristic, and WHEN the user selects a finding THE Scan_Screen SHALL highlight its polygon and its affected positions.
7. THE Scan_Screen SHALL show a kind that the detector reports as `not-evaluated` as "not evaluated" with its reason, and SHALL NOT show it as absent.
8. THE Scan_Screen SHALL show the number of positions per Condition and SHALL state that Hole_Likelihood is an uncalibrated algorithmic score unless the result cites a calibration run.
9. WHEN the image is larger than the viewer, THE Scan_Screen SHALL provide zoom and pan operable by pointer and by keyboard, and SHALL keep markers aligned with the image at every zoom level.
10. THE Scan_Screen SHALL render overlays from the Detection_Result polygons and SHALL NOT compute geometry itself.

### Requirement 8: Scan & Detect: manual alignment fallback

**Tier:** P1

**User Story:** As a heritage weaver, I want to fix how the photograph is interpreted and, separately, to fix individual cells, so that a geometry fix re-reads the image while a cell fix never discards my other work.

#### Acceptance Criteria

1. THE Scan_Screen SHALL offer the Geometry_Correction kinds `set-corners`, `set-reference-holes`, `set-orientation` and `set-polarity`, and SHALL offer `set-parameter-override` and `select-profile` only where design lists them in an advanced section.
2. WHEN a user places the four corners, THE Scan_Screen SHALL let the user drag each corner by pointer and move it by keyboard in steps, SHALL show the quadrilateral over the image, and SHALL show the validation result of the manual-correction service before submission.
3. IF the manual-correction service returns `INVALID_CORNERS`, `INVALID_REFERENCE_HOLES`, `RESERVED_POSITION`, `INVALID_PARAMETERS` or `DUPLICATE_ACTION_ID`, THEN THE Scan_Screen SHALL show the mapped message that names the failed rule and SHALL keep the correction form open with the user's input preserved.
4. WHEN a user records a Geometry_Correction, THE Scan_Screen SHALL state that the image will be read again from the original, SHALL show detection progress as in requirement 6, and SHALL keep the previous Detection_Result available for comparison.
5. WHEN a Geometry_Correction produces a new result, THE Scan_Screen SHALL show, for every existing Cell_Correction, its Correction_Review_State (`carried` or `needs-review`) with the reasons, and SHALL list every `needs-review` correction with its Evidence_Snapshot and the new evidence of the same position.
6. WHEN a user records a Cell_Correction or a Review_Resolution, THE Scan_Screen SHALL NOT start detection, SHALL show no progress indicator for detection, and SHALL show the Correction_Log with the new entry.
7. THE Scan_Screen SHALL offer for each `needs-review` Cell_Correction the actions confirm and discard, SHALL show that neither action starts detection, and SHALL keep the correction visible in the Correction_Log after either action.
8. WHEN a user undoes a Manual_Correction, THE Scan_Screen SHALL show that undoing a Geometry_Correction reads the image again and that undoing a Cell_Correction or a Review_Resolution does not.
9. THE Scan_Screen SHALL show the Correction_Log as an ordered list of Sequence_Numbers, kinds, targets and notes with no timestamp, and SHALL show it unchanged after an error.
10. THE Scan_Screen SHALL name the polarity choice in plain language ("a hole means the hook is lifted" or "a hole means the hook stays down"), SHALL show its `unverified` status, and SHALL state that a change re-reads the card.

### Requirement 9: Restoration Studio: card viewer, layers and provenance

**Tier:** P0

**User Story:** As a restorer, I want one large interactive card that shows at a glance what was observed and what was inferred, so that I never mistake a guess for a measurement.

#### Acceptance Criteria

1. THE Studio_Screen SHALL render the card as the largest element on the screen, with one cell per Readable_Position placed by the domain Grid_Position and read order, and SHALL render the Reserved_Positions as non-cell elements with the label "reserved, not an instruction".
2. THE Studio_Screen SHALL give each Provenance_State its own Provenance_Marker with a distinct colour, a distinct shape or pattern, and a distinct text label, and SHALL show the legend for them next to the card.
3. THE Studio_Screen SHALL show the effective value of a cell (lifted or down) separately from its Provenance_Marker, so that a user can read both without relying on colour.
4. THE Studio_Screen SHALL show a cell with provenance `ambiguous` and no effective value, and a cell that detection left `unknown`, with the `unknown` marker and the label "unknown", and SHALL NOT show it with the treatment of an absent hole.
5. THE Studio_Screen SHALL provide layer toggles for: Provenance (default on), Restoration confidence heatmap, Hole likelihood, Evidence links, and Restoration_State, and SHALL show at most one value layer as the cell fill at a time and keep the Provenance_Marker visible in every layer.
6. THE Studio_Screen SHALL draw the confidence heatmap from the Confidence_Heatmap_Data, SHALL draw `null` as the marker "not evaluated" with a pattern distinct from every numeric level and from 0, and SHALL NOT draw `null` as 0%.
7. THE Studio_Screen SHALL draw the Hole_Likelihood layer from the separate Hole_Probability layer of the heatmap data, with a legend title different from the confidence legend ("hole likelihood in the photograph" versus "estimated restoration correctness").
8. WHERE a confidence is shown, THE Studio_Screen SHALL show the Calibration_Marker next to it, and WHILE the confidence is `uncalibrated` THE Studio_Screen SHALL show the text "uncalibrated" in the legend and in every cell tooltip or inspector entry that shows the number.
9. WHERE a Hypothesis, heatmap entry or Evidence_View carries the Synthetic_Prior_Warning flag, THE Studio_Screen SHALL show the fixed warning text and a warning marker on the cell, and SHALL show the deck-level warning while a Synthetic_Prior_Enablement is in effect.
10. THE Studio_Screen SHALL show the Restoration_State (`detected`, `proposed`, `reviewed`, `approved`) per cell, per region and for the deck, using text and a marker in addition to colour.
11. THE Studio_Screen SHALL keep each rendered colour and marker equal for equal data, so that the card rendered twice from the same Session_Artifacts is identical (determinism of the view model).
12. THE Studio_Screen SHALL provide zoom and pan of the card by pointer and by keyboard, and SHALL keep the focused cell visible.
13. THE Studio_Screen SHALL show an empty state when no detected card or deck exists, a loading state while restoration runs, an error state for a failed run, and an incomplete-data state that lists the number of cells that are `unknown` or `ambiguous`.

### Requirement 10: Restoration Studio: running restoration and the prior gate

**Tier:** P0 for running with the Demo_Bundle configuration, P1 for prior controls

**User Story:** As a researcher, I want restoration started explicitly and the structural priors shown as gated, so that nothing is inferred on faith.

#### Acceptance Criteria

1. WHEN a user activates "Propose restorations", THE Studio_Screen SHALL pass the Domain_Deck and the Detection_Evidence to the Worker_Host, SHALL show progress, and SHALL show the returned Hypotheses and Abstentions without writing any Hypothesis to the Domain_Deck.
2. THE Studio_Screen SHALL state in plain language that proposals are suggestions, that nothing changes the deck until the user accepts it, and that the system leaves a cell unknown when the evidence does not support a proposal.
3. THE Studio_Screen SHALL show the Prior_Gate state of each Structural_Prior kind (disabled, enabled with measurement reference, scope `synthetic` or `real`), and SHALL show a Synthetic_Only_Prior on a real deck as disabled until the user records `enable-synthetic-prior` with a note.
4. WHEN a user records `enable-synthetic-prior` or `disable-synthetic-prior`, THE Studio_Screen SHALL require a note of 1 to 1,000 characters, SHALL show the Action_Id and Sequence_Number of the entry, and SHALL show the Synthetic_Prior_Warning on every dependent item.
5. IF the run returns `PRIOR_MEASUREMENT_MISSING`, `PRIOR_NOT_VALIDATED_FOR_REAL_DECKS`, `INVALID_CONFIGURATION`, `LIMIT_EXCEEDED` or `DETECTION_EVIDENCE_MISMATCH`, THEN THE Studio_Screen SHALL show the mapped message with a recovery action and SHALL leave the Domain_Deck and Restoration_Record unchanged.
6. THE Studio_Screen SHALL show for the bundled Demo_Bundle run the Prior_Measurement scope and the statement that a `synthetic` frequency is a generator parameter and not evidence of historical prevalence.
7. THE Studio_Screen SHALL show, for every region that has no Hypothesis, the Abstention_Reason in plain language and its structured values (for example the region length and the bound for `REGION_TOO_LARGE`).
8. IF no Target_Cell exists, THEN THE Studio_Screen SHALL state that the card has no missing cells to restore and SHALL offer the approval action when no other blocker exists.

### Requirement 11: Restoration Studio: region inspector and alternatives

**Tier:** P0

**User Story:** As an archivist, I want every proposal explained with its evidence, so that I can judge it without reading code.

#### Acceptance Criteria

1. WHEN a user selects a cell or region, THE Studio_Screen SHALL show in the inspector: the original image crop reference (`patchId` and Image_Digest) or the statement "no image evidence available", the Raw_Observation, the Hole_Likelihood as a field named "Hole likelihood (photograph)", the effective value, the Provenance_Marker, the supporting neighbouring evidence (cells and cards used), the Restoration_Confidence_Display as a field named "Estimated restoration correctness", the Calibration_Marker, the review state and the approval status.
2. THE Studio_Screen SHALL show the Hole_Likelihood and the Restoration_Confidence_Display as separate fields with different labels, different positions and different marker styles.
3. WHERE a region has Hypotheses, THE Studio_Screen SHALL list them in rank order, at most three, each with its confidence display, its Calibration_Marker, its explanation text and a view of its structured evidence items, and SHALL NOT add placeholder entries to reach three.
4. WHEN a region has exactly one Hypothesis, THE Studio_Screen SHALL list exactly one, and WHEN a region has an Abstention, THE Studio_Screen SHALL list none and show the Abstention_Reason.
5. WHERE image evidence contradicts a Hypothesis, THE Studio_Screen SHALL show the contradiction statement of its explanation.
6. WHERE the detection record carries Assistant_Evidence, THE Studio_Screen SHALL show it in a separate block with the model identifier, model version and the label "model-generated, not an observation", and SHALL NOT use it as a value.
7. WHERE a cell carries an Applied_Override, THE Studio_Screen SHALL show the override's Action_Id, declared Condition, note and review state, and the statement "the value on the card was not changed by this override".
8. THE Studio_Screen SHALL show a cell with a numeric confidence of `0` as "0" and a cell with `null` as "not evaluated", and SHALL show both with distinct markers.
9. THE Studio_Screen SHALL show the verification markers that the run depended on (profile fields with `unverified` status and basis) in the inspector or a linked details panel.
10. THE Studio_Screen SHALL show the edit history of the selected cell from its Edit_History (user edits, inferences, undo and withdrawal entries) in Sequence_Number order with no timestamp.

### Requirement 12: Restoration Studio: review actions, corrections and undo

**Tier:** P0 for accept, select, reject, edit and undo; P1 for condition overrides

**User Story:** As a restorer, I want to accept, choose, reject and correct, and to reverse each decision in a way I understand, so that I stay in control and nothing is lost.

#### Acceptance Criteria

1. WHEN a user activates Accept on a region, THE Studio_Screen SHALL call the review service `accept-hypothesis` for the top Hypothesis, and WHEN a user chooses an alternative THE Studio_Screen SHALL call `select-alternative` with its rank, and SHALL show the resulting provenance, effective value and Review_Outcome from the returned records.
2. WHEN a user activates Reject, THE Studio_Screen SHALL call `reject-hypothesis`, SHALL show the cells as `unknown` with the label "left unknown", and SHALL NOT show them as absent holes.
3. WHEN a user edits a cell value, THE Studio_Screen SHALL require a note of 1 to 1,000 characters, SHALL call `userEdit` through the review service, and SHALL show the new value with provenance `user-edited` and the earlier value and provenance in the history.
4. WHEN a user edits an `observed` cell, THE Studio_Screen SHALL state before submission that the observed value stays recorded in the history and that the cell becomes `user-edited`.
5. WHERE P1 condition overrides are built, THE Studio_Screen SHALL present a condition correction (`ambiguous` or `unknown`) as "your override" with a note, SHALL show that the domain cell value is unchanged, and SHALL list it in the override list with its `applied` flag and review state.
6. THE Studio_Screen SHALL offer two separate undo controls with plain-language names: "Undo my edit" (domain `undoEdit`, restores the earlier value and provenance of a manual edit) and "Withdraw accepted suggestion" (domain `withdrawInference`, appends a withdrawal entry, keeps the history, restores the cell to its state before the suggestion), and SHALL NOT use either control for the other kind of entry.
7. WHEN a user activates "Withdraw accepted suggestion" on a region, THE Studio_Screen SHALL call `undo-action` of the review service for that region, SHALL show each cell's restored value or absence, provenance, and confidence (including "not evaluated"), and SHALL show the region as `proposed` again.
8. IF the review service returns `USER_EDIT_PROTECTED` for a withdrawal, THEN THE Studio_Screen SHALL show "this cell has a manual edit above the suggestion; undo your edit first" and SHALL offer the "Undo my edit" control for that cell.
9. IF the review service returns `NOTHING_TO_UNDO`, THEN THE Studio_Screen SHALL show that there is nothing left to undo for that target and SHALL leave every record unchanged.
10. WHEN an undo or withdrawal is applied to a deck whose approval status is `approved`, THE Studio_Screen SHALL show that the deck is now `unapproved` and the cause ("an edit" or "a withdrawal"), taken from the Approval_Records.
11. WHEN a user edits any cell of an approved deck, THE Studio_Screen SHALL state before submission that the approval will be withdrawn, and SHALL show the new `unapproved` status after submission.
12. THE Studio_Screen SHALL perform no Review_Action automatically, SHALL change no region from `proposed` to `reviewed` without a user action, and SHALL support bulk acceptance only by an explicit list of regions that the user selects and confirms.
13. THE Studio_Screen SHALL show each applied action in an audit list with the Action_Id, Sequence_Number, kind, target, note and the optional Opaque_Timestamp_Label as an unparsed string, and SHALL keep the list append-only in the display.
14. WHERE whole-card recovery is enabled, THE Studio_Screen SHALL mark each whole-card Hypothesis "stretch" and SHALL require one explicit action per card.

### Requirement 13: Restoration Studio: needs-review items and approval

**Tier:** P0 for approval, P1 for needs-review handling

**User Story:** As an archivist, I want approval to freeze exactly the decisions I made and to tell me what blocks it, so that nothing I did not choose reaches the loom or an export.

#### Acceptance Criteria

1. THE Studio_Screen SHALL show a list of unresolved items that block approval: regions in state `proposed` (PROPOSALS_UNREVIEWED), Applied_Overrides without acknowledgement or edit (OVERRIDES_UNRESOLVED), Pending_Corrections (PENDING_CORRECTIONS) and cells that are `ambiguous` with no effective value (UNRESOLVED_CELLS), each with a count and a link that moves focus to the first item.
2. WHEN a user activates Approve, THE Studio_Screen SHALL call the review service `approve-deck`, and IF the service returns `APPROVAL_BLOCKED` or a wrapped `UNRESOLVED_CELLS`, THEN THE Studio_Screen SHALL show every returned reason in plain language with its list of up to 100 items and the total count, and SHALL leave the deck `unapproved`.
3. WHERE the deck has `unknown` cells, THE Studio_Screen SHALL offer the ambiguous-as-down policy only as an explicit option that needs a note, SHALL state in plain language that it sets those cells to "down" in the deck, and SHALL record the policy, note and affected cells from the returned record.
4. WHEN approval succeeds, THE Studio_Screen SHALL show the deck as `approved`, SHALL show that unreviewed proposals were not applied, and SHALL enable the links to the Loom_Screen and to export.
5. WHEN a user activates Revoke approval, THE Studio_Screen SHALL call `revoke-approval` and SHALL show the deck as `unapproved`.
6. WHERE a Cell_Correction is in review state `needs-review`, THE Studio_Screen SHALL list it with its reasons, its Evidence_Snapshot and the new evidence, SHALL offer confirm and discard, and SHALL state that the correction is not applied until confirmed.
7. WHEN a user activates "Compare" , THE Studio_Screen SHALL show the original card (as detected, before any user action) and the reconstructed card (the current effective view) side by side, each with the same Provenance_Markers, the same legend and independent zoom, and SHALL mark every cell that differs between them.
8. THE Studio_Screen SHALL NOT enable the Loom_Screen run or any final export while the deck is `unapproved`, and SHALL show the reason and the link to the approval step.
9. THE Studio_Screen SHALL show the approval audit trail from the Approval_Records (Action_Id, Sequence_Number, state, cause) with no timestamp.

### Requirement 14: Export modes and the physical-cutting claim

**Tier:** P0

**User Story:** As an archivist, I want to export my reconstruction with an honest statement of what the export is valid for, so that no one cuts a card from unverified dimensions by mistake.

#### Acceptance Criteria

1. THE Loom_Screen and the Studio_Screen SHALL present SVG export as two modes with separate controls: Verified_Export_Mode and Unverified_Export_Mode, each with its name visible.
2. THE Workbench SHALL define Required_Verified_Fields as exactly these eleven profile facts, named against the domain MachineProfile verification markers and the jacquard-card-format VERIFY list: (a) `gridSize`, the grid dimensions and axis (A3); (b) `physicalDimensions`, the card dimensions, hole spacing and hole sizes (A9); (c) `endHoles`, the end-hole positions and sizes (A2); (d) `reservedPositions` (A1); (e) the card orientation, the Orientation the reading assumes (D3); (f) the hole polarity (D7); (g) `readOrder` (A4); (h) the hook-to-warp mapping selected for the export, from `hookMappings` (A11); (i) `defaultThreadsPerHook`, or the threads-per-hook value in use (A5); (j) the mirror handling selected for the export, from `mirrorOptions` (A6); (k) `cardToPass` (A8). THE Workbench SHALL read the status of each entry from the MachineProfile marker named in the list and SHALL NOT hard-code any status. Entries (e) and (f) and the hole spacing and hole sizes of (b) and (c) are not yet exposed as domain MachineProfile markers; the amendment in "Amendments to earlier specs" lists them.
3. WHILE any Required_Verified_Fields entry has status other than `verified` with a non-empty source citation, or has no marker that the Workbench can read, THE Workbench SHALL show Verified_Export_Mode as present and disabled, SHALL show the reason "these profile fields are not verified" with each unverified entry by name, its basis and (where read) its note, and SHALL NOT start any export in that mode. An entry without a readable marker SHALL be listed as "no verification marker available" and SHALL count as unverified.
4. THE Workbench SHALL enable Verified_Export_Mode only when every Required_Verified_Fields entry has status `verified` with a non-empty source citation, and SHALL still carry the domain Cutting_Caveat constant text in the exported file. Verified_Export_Mode SHALL NOT be described in any label as a historically verified weave unless entry (h) is `verified`.
5. THE Workbench SHALL provide Unverified_Export_Mode as an export that carries the Cutting_Caveat constant in the visible text and the `<desc>` element (supplied by the domain exporter), that is labelled "unverified, not validated for physical cutting" on the control and in the downloaded file name or metadata. THE Workbench SHALL allow the download directly on activation of the export control, with no acknowledgement control and no confirmation dialog. THE Workbench SHALL show the Unverified_Assumption_Metadata on the export control (each unverified Required_Verified_Fields entry by name with its basis, and the Cutting_Caveat constant text) and SHALL include the same Unverified_Assumption_Metadata in the exported file through the domain exporter metadata.
6. THE Workbench SHALL NOT use the words "laser-ready", "cut-ready" or "machine-ready" in any control label, message, file name, file content or documentation of the Workbench, and SHALL provide a test that fails when such a word appears in `src/ui` strings or in the exported SVG.
7. IF the user requests an export with unit `mm` and the MachineProfile declares no physical dimensions, THEN THE Workbench SHALL show the mapped message for `PHYSICAL_DIMENSIONS_UNAVAILABLE`, SHALL offer unit `px` and SHALL state that `px` is a screen unit.
8. THE Workbench SHALL require an explicit scale and unit from the user for every SVG export and SHALL map `INVALID_EXPORT_OPTIONS` to a message that names the invalid field.
9. WHILE the deck is `unapproved`, THE Workbench SHALL allow SVG export only with each card marked "unapproved" and each inferred cell labelled inferred by the domain exporter, and SHALL show that status on the export control.
10. THE Workbench SHALL show the verification markers of every Required_Verified_Fields entry next to the export controls and SHALL include them in the exported metadata through the domain exporter. WHERE the domain exporter metadata omits an entry of criterion 2 (for example the hook mapping), THE Workbench SHALL list that entry as an amendment need and SHALL show it in the export UI.

### Requirement 15: Virtual Loom

**Tier:** P0 for step, play, pause, seek, reset and explicit selection; P1 for speed, replay and Weavers_Notes

**User Story:** As an educator, I want a deterministic animated loom that shows the active card, the lifted hooks and the growing cloth, so that learners see how a deck produces a pattern.

#### Acceptance Criteria

1. WHILE the Domain_Deck is `unapproved`, THE Loom_Screen SHALL show an empty state with the reason "only an approved deck runs on the loom" and a link to the approval step, and SHALL offer no run control.
2. THE Loom_Screen SHALL require the user to choose a mirror orientation from the options the MachineProfile permits and a hook mapping from the options it permits, SHALL show neither preselected for a deck that the user brings, and SHALL disable Play and Step with the visible reason "choose a mirror orientation and a hook mapping" until both are chosen.
3. THE Loom_Screen SHALL show next to the mirror and hook-mapping controls a plain-language description of each option, the profile's `unverified` status for it, and the statement that neither hook mapping is claimed as historical fact.
4. THE Loom_Screen SHALL show the threads-per-hook value (profile default, accepted range 1 to 64), its `unverified` status, and the resulting warp thread count and pass count.
5. IF the Interpreter returns `FABRIC_TOO_LARGE`, `INVALID_THREADS_PER_HOOK`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`, `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`, `DECK_NOT_APPROVED`, `UNRESOLVED_CELL`, `INVALID_COLOUR_LAYER` or `COLOUR_LAYER_OUT_OF_RANGE`, THEN THE Loom_Screen SHALL show the mapped message that states the values involved and a recovery action, and SHALL leave the previous simulation state unchanged.
6. THE Loom_Screen SHALL show the active card (the card for the current pass, with its lifted and down positions), the hook lift instructions for the current pass (which hooks lift, and the warp threads they drive under the chosen mapping), a weaving progress indicator with the pass index and the pass count as text, and the cloth woven so far.
7. THE Loom_Screen SHALL provide Step, Play, Pause, Seek (a control and a numeric field for a pass index), and Reset, each calling the domain pure transition (`step`, `pause`, `resume`, `seek`, `reset`) and SHALL own all timers for Play.
8. WHERE P1 is built, THE Loom_Screen SHALL provide a playback speed control with named steps, and a Replay control that resets to pass 0 and starts playback.
9. WHEN Play reaches the pass count, THE Loom_Screen SHALL stop timers, SHALL show the status `complete`, and SHALL show "complete" as text.
10. THE Loom_Screen SHALL produce the same cloth for the same deck and configuration at every playback speed and after every seek, and SHALL show the same pass state after `seek(n)` as after `reset` and `n` calls of `step`.
11. THE Loom_Screen SHALL show the Educational_Label next to the loom and in every loom export control, and SHALL NOT claim compatibility with physical looms.
12. THE Loom_Screen SHALL render the recovered cloth as warp and weft symbolic cells (distinguishable by pattern and label as well as colour) when no Weavers_Notes layer is supplied.
13. WHEN P1 Weavers_Notes is built, THE Loom_Screen SHALL present it in a separate panel titled "Weaver's Notes" with the text "colour supplied by you, not stored on the cards", SHALL let the user assign warp and weft colours, SHALL pass them to the Interpreter as the Weft_Colour_Layer only, and SHALL NOT write any colour into a Card, a Deck, a Restoration_Record or a Correction_Log.
14. WHERE a colour layer is applied, THE Loom_Screen SHALL label the cloth "colours: user-supplied (Weaver's Notes)" and SHALL show the cloth without the layer when the user clears it.
15. WHILE reduced motion is requested, THE Loom_Screen SHALL replace automatic animation by Step-through playback with identical information per pass and SHALL provide a "play" control that advances only on user activation or, if the user enables it, at a rate under the flashing limit of requirement 24.
16. THE Loom_Screen SHALL offer "Replay session" on the Studio_Screen or Loom_Screen as the domain `replaySession` of a Session_Log with digest verification, separate from the Replay control of criterion 8, and SHALL show `SESSION_DIGEST_MISMATCH` and the other session errors through the Error_Map [CONFIRM Q5].

### Requirement 16: Data export and import

**Tier:** P0 for deck JSON and SVG, P1 for workspace export and import

**User Story:** As an archivist, I want lossless exports and imports of my work, so that I can save, share and reload a reconstruction with its evidence.

#### Acceptance Criteria

1. THE Workbench SHALL provide Deck JSON export through the domain Deck_Serializer, and SHALL provide the file download with a file name that states the content kind and the approval status.
2. WHERE P1 workspace export is built, THE Workbench SHALL export the Session_Artifacts (Domain_Deck, Restoration_Record, Correction_Log and optional Session_Log) as separate files, each in its owning spec's serialiser, and SHALL NOT embed image pixels or the original image.
3. WHEN a user imports a file, THE Workbench SHALL apply requirement 30 and SHALL pass the text to the matching serialiser and SHALL show the returned error (`INPUT_TOO_LARGE`, `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`, `INVALID_DECK`, `INVALID_RESTORATION_RECORD`, `INVALID_DETECTION_RESULT`, `CORRECTION_SEQUENCE_INVALID`, `MISSING_REQUIRED_FIELD`) through the Error_Map with the path where one is returned, and SHALL load no partial value.
4. IF an import fails, THEN THE Workbench SHALL leave the current Session_Artifacts unchanged.
5. THE Workbench SHALL export a Weft_Colour_Layer only as a separate labelled file or section, never inside Card content.
6. THE Workbench SHALL export the Restoration_Record with its `null` confidences kept as `null`, and SHALL show the number of unresolved items in the export dialog.
7. THE Workbench SHALL show for each export the content kind, the Component_Stamp and the approval status, and SHALL state that the export is not validated for physical use (Cutting_Caveat) wherever SVG is offered.

### Requirement 17: Kiro Trail and About screen

**Tier:** P1 (the credits and Educational_Label are P0 under requirement 3)

**User Story:** As a hackathon judge, I want to see how Kiro was actually used, with verifiable evidence, so that I can assess the engineering process without trusting claims.

#### Acceptance Criteria

1. THE Trail_Screen SHALL show: the explanation of Kiro's engineering contribution in this project, the specs (with their phase), the steering files, the hooks, Kiro Crew use, MCP use, screenshots, dated milestones, the research credits (Rodas Lorente et al. 2025 with the DOI link, the Garín5 dataset, other resources), the limitations, source links and the MIT licence statement.
2. THE Workbench SHALL convert `docs/KIRO_TRAIL.md` to Trail_Data at build time by a script, and SHALL bundle Trail_Data as a static asset, and THE deployed Workbench SHALL NOT read repository files or request the Markdown file at run time.
3. THE Trail_Data SHALL carry a generated-at stamp and the source commit identifier recorded by the build script, and THE Trail_Screen SHALL show both as opaque strings with the label "generated at build time".
4. THE build script SHALL include in Trail_Data only entries that satisfy the evidence rules of `.kiro/steering/kiro-evidence.md`: an entry has a date, a task and at least one evidence reference that the script confirms at build time (a commit hash found in the repository history, a spec folder that exists, a hook file that exists, or a screenshot file under `docs/trail/` that exists).
5. WHERE an entry field is marked "unverified" in the source, THE Trail_Screen SHALL show that field as "unverified" and SHALL NOT replace it with another text.
6. IF an entry fails the build-time checks or is malformed, THEN THE build script SHALL exclude it, SHALL report each excluded entry and its reason in the build output, and SHALL NOT fabricate, repair or infer its content.
7. IF `docs/KIRO_TRAIL.md` is missing, empty or yields no valid entry, THEN THE Trail_Screen SHALL show an empty state "No verified Kiro trail entries are bundled in this build" with the build stamp, and SHALL show no placeholder entry.
8. THE Trail_Screen SHALL show screenshots only from files that the build script found under `docs/trail/`, each with its real date from the entry and a text alternative, and SHALL NOT show an image that has no entry.
9. THE Trail_Screen SHALL list entries in date order, and SHALL keep the order and content equal for equal Trail_Data.
10. THE Trail_Screen SHALL link to source repositories and documents with visible, descriptive link text, and SHALL open external links without passing image data or session data.
11. THE Trail_Screen SHALL state the limitations of the project (unverified card format, synthetic benchmark, uncalibrated confidence, educational simulation), and SHALL NOT quote an accuracy, speed or time-saving number that is absent from a Browser_Report.
12. THE Workbench SHALL provide a build test that converts a fixture trail file with one valid entry, one entry with a missing evidence file and one malformed entry, and asserts that exactly the valid entry appears in Trail_Data and the two exclusions are reported.

### Requirement 18: Benchmark Lab

**Tier:** P1

**User Story:** As a judge and a researcher, I want to read the committed benchmark results exactly as recorded, with every limit and unknown shown, so that no number is overstated and the system is judged on evidence.

#### Acceptance Criteria

1. THE Lab_Screen SHALL display only committed Browser_Reports loaded as static files through the Report_Reader, and SHALL NOT run, regenerate or modify a benchmark in the browser.
2. WHEN the Lab_Screen opens, THE Lab_Screen SHALL load the report index, SHALL list the available Browser_Reports with their dataset identity, Execution_Profile, report digest and track statuses, and SHALL load the selected report through the Report_Reader.
3. IF the index or a report fails to load or validate, THEN THE Lab_Screen SHALL show the mapped message for the returned Benchmark_Error_Code (`INPUT_TOO_LARGE`, `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`, `INVALID_REPORT`, `REPORT_TOO_LARGE`) and SHALL show no partial report.
4. IF no report is available, THEN THE Lab_Screen SHALL show an empty state that states that no committed report is bundled in this build and SHALL show no number.
5. THE Lab_Screen SHALL show the fixed honesty statements of the Browser_Report verbatim (synthetic results measure the system on generated data and do not estimate performance on historical cards; calibration on synthetic data does not establish calibration on historical cards; the real-photograph statements; the educational-simulation statement where a loom result is shown), and SHALL NOT shorten or rephrase them.
6. THE Lab_Screen SHALL show a synthetic overview and a real-photograph section as separate sections that share no table, chart, average or summary line, and SHALL label each "synthetic" or "real photographs" with the sample size.
7. WHEN the real-photograph track has status `not-evaluated`, THE Lab_Screen SHALL show "not evaluated" with the recorded reason and no number.
8. THE Lab_Screen SHALL show every Metric_Value with its definition identifier, Evaluation_Group, numerator, denominator, number of cells, items and families, and the Split_Role, and SHALL show a metric of status `undefined` as the word "undefined" with its recorded reason, and SHALL NOT show it as 0, 1, an empty cell or a dash.
9. THE Lab_Screen SHALL show each interval as the recorded lower and upper bounds, and SHALL show interval status `not-estimated` as "not estimated" with its recorded reason (for example `INSUFFICIENT_FAMILIES`).
10. THE Lab_Screen SHALL show damaged-cell recovery accuracy over all damaged cells and over answered cells with the coverage, side by side, per Damage_Level, per Pattern_Family or Structure_Label as the report provides, and per profile identifier, and SHALL mark a pooled value as pooled with its constituents.
11. THE Lab_Screen SHALL show the reliability diagram from the ReliabilityData with the bin count, drawing an empty bin as empty (not as zero accuracy), and SHALL show the expected calibration error and Brier score for the raw and calibrated confidence as recorded, with `not-applicable` shown verbatim.
12. THE Lab_Screen SHALL show the baseline comparison B1 deck-majority, B2 column-majority and B3 nearest-neighbour with the paired difference and its interval, SHALL show `not-distinguishable` verbatim where the report records it, and SHALL show the comparison per Structure_Label with the system's coverage.
13. THE Lab_Screen SHALL show each Threshold entry's status verbatim (`met`, `not-met`, `not-set`, `not-evaluated`), and SHALL show "not set" for each threshold the report lists as not set, with the register version and state.
14. THE Lab_Screen SHALL show the user-comparison section with its recorded status (`not-conducted`, `insufficient-sample` or a result) and SHALL show no manual-versus-assisted time number when the status is `not-conducted`.
15. THE Lab_Screen SHALL show the failure examples as listed (by Item identifier, seed, Damage_Level and category) and SHALL NOT show truth artifacts or pixels that the report does not embed.
16. THE Lab_Screen SHALL show the dataset version, root seed, Component_Stamp, Dataset_Manifest digest, report digest, Execution_Profile, Split_Roles read, the register state, and the profile `unverifiedMarkers` that the report carries.
17. THE Lab_Screen SHALL NOT compute, round up, average, rank or summarise any metric beyond what the report records, and SHALL NOT invent an accuracy, a calibration or a time-saving number.
18. THE Lab_Screen SHALL show a chart value also as text or a table with the same values, and SHALL use markers or patterns in addition to colour for every chart series.
19. WHERE two reports have different Component_Stamps, THE Lab_Screen SHALL NOT place them in one comparison without the label "different component versions".

### Requirement 19: Guidance, glossary and plain-language labels

**Tier:** P0 for plain-language labels and the P0 terms, P1 for the complete glossary and first-run tour

**User Story:** As a newcomer without Jacquard knowledge, I want plain words and short explanations at the point of use, so that I can follow the restoration without prior training.

#### Acceptance Criteria

1. THE Workbench SHALL define each of these terms in the glossary and in an inline explanation reachable from the term where it first appears on a screen: Jacquard card, punched hole, hook, warp, weft, pass, lifted, down, observed, inferred, ambiguous, unknown, hole likelihood, restoration confidence, uncalibrated, hypothesis, provenance, approval, mirror, hook mapping, threads-per-hook, reserved position, polarity, synthetic benchmark.
2. THE Workbench SHALL use the plain-language labels of this document (for example "Estimated restoration correctness", "Hole likelihood (photograph)", "Undo my edit", "Withdraw accepted suggestion", "left unknown") for the matching engine terms, and SHALL show the engine term in the inspector or tooltip where a researcher needs it.
3. WHEN the Workbench first loads with no stored workspace, THE Workbench SHALL show a first-run guidance panel on each screen on its first visit that states, in at most five short steps, what to do on that screen, and SHALL let the user dismiss it and reopen it from a "Help" control.
4. THE inline explanations SHALL be reachable by keyboard (focus opens the explanation or a control opens it with Enter or Space), SHALL stay visible while focus remains on the term or its explanation, SHALL be dismissible by Escape, and SHALL not hide the term they explain.
5. THE Workbench SHALL provide a usability test protocol document in `docs` with these testable criteria: a participant with no Jacquard knowledge completes the Quick_Loom_Demo and, in a Full_Journey, identifies for a named cell whether it was observed or inferred, states whether a displayed confidence is calibrated, and states what approving does, each from the screen alone, with the task list, the stated participant criteria and the recording rules (no personal data); and THE Workbench SHALL report a result only from a recorded study and SHALL state "not conducted" otherwise.
6. THE Workbench SHALL provide an automated test that every term of criterion 1 appears in the glossary with a non-empty definition, and that each Provenance_State has a glossary entry.
7. THE Workbench SHALL write glossary definitions that make no accuracy, prevalence or physical-loom claim.

### Requirement 20: Error mapping and recovery

**Tier:** P0

**User Story:** As a user, I want every failure explained in plain words with something I can do about it, so that I am never left with a code.

#### Acceptance Criteria

1. THE Workbench SHALL provide an Error_Map with one entry for every code in the domain ErrorCode registry, the Vision_Error_Code registry, the Restoration_Error_Code registry, the Abstention_Reason registry, the Benchmark_Error_Code registry and the Workbench error registry of requirement 30.7, each entry holding a plain-language message and at least one recovery action.
2. THE Workbench SHALL provide a test that imports the registries and fails when a registry code has no Error_Map entry or an entry has an empty message or an empty recovery action.
3. THE Workbench SHALL show for each error the mapped message, the values that the error carries (for example supplied and permitted limits, the path of the first violation) and the recovery action as a control or an instruction, and SHALL offer a details area that shows the original code and message.
4. THE Workbench SHALL show errors in a region announced to assistive technology and SHALL move focus to the error summary only for errors that block the user's current action.
5. WHEN an error affects only one item (one cell, one region, one file), THE Workbench SHALL show the error next to that item and SHALL NOT replace the whole screen.
6. IF an unexpected exception occurs in the UI, THEN THE Workbench SHALL show an error boundary with the message "something went wrong in the interface", SHALL keep the Session_Artifacts in memory, SHALL offer to export them, and SHALL NOT show a stack trace as the primary message.
7. THE Workbench SHALL map `CANCELLED` to a neutral "cancelled" message that is not styled as a failure.
8. THE Workbench SHALL show an error message in the language of the interface with no code alone.

### Requirement 21: Keyboard access and focus

**Tier:** P0 for the P0 screens, P1 for the others

**User Story:** As a keyboard user, I want to do everything essential without a pointer, so that the workbench is usable by everyone.

#### Acceptance Criteria

1. THE Workbench SHALL make every interactive element reachable and operable by keyboard in a logical order.
2. THE Workbench SHALL show a visible focus indicator on every interactive element, with at least 3:1 contrast against its adjacent colours.
3. THE Workbench SHALL provide keyboard operation for these essential operations: moving between cells of the card (arrow keys over the grid, with Home, End and card-level jumps), opening the alternatives of a region, accepting, selecting, rejecting, editing a cell with a note, undoing and withdrawing, approving and revoking, choosing mirror and hook mapping, Step, Play, Pause, Seek and Reset, selecting export options, and opening the glossary and credits.
4. WHEN a cell has keyboard focus, THE Studio_Screen SHALL expose its `readIndex`, Grid_Position, Provenance_State, effective value, confidence display with Calibration_Marker, and region state to assistive technology as text.
5. THE Workbench SHALL list the keyboard shortcuts in a help view, SHALL use no single-character shortcut that cannot be turned off or remapped, and SHALL NOT trap focus except inside an open modal dialog, which SHALL return focus to the control that opened it when it closes.
6. THE Workbench SHALL support Escape to close an open inline explanation, dialog or popover.
7. WHEN a screen changes, THE Workbench SHALL move focus to the main heading of the new screen and announce the change to assistive technology.
8. THE Workbench SHALL support zoom and pan of the card and the image by keyboard (for example plus, minus and arrow keys while the viewer has focus) with a visible instruction.
9. THE Workbench SHALL provide a skip link to the main content.

### Requirement 22: Colour independence, contrast and motion

**Tier:** P0

**User Story:** As a user with low vision, colour-vision difference or vestibular sensitivity, I want information that does not depend on colour or motion alone, so that I can use every feature.

#### Acceptance Criteria

1. THE Workbench SHALL identify each Provenance_State, Condition, Restoration_State, approval status and confidence level by a distinct text label and a distinct shape or pattern in addition to colour, and SHALL show the numeric confidence on focus or hover and in the inspector.
2. THE Workbench SHALL meet a contrast ratio of at least 4.5:1 for text and at least 3:1 for interface components and graphical objects, measured against the actual rendered background including any noise, fog or motif.
3. THE Workbench SHALL provide an automated contrast test that samples rendered pixels behind text, markers and focus indicators, using the lowest-contrast background pixel in the element's area, on every P0 screen and every ambient-effect setting, and fails below the limits of criterion 2.
4. WHEN the user agent requests reduced motion, THE Workbench SHALL stop ambient fog, thread and perforation animation, SHALL replace automatic loom playback by step-through playback, SHALL remove parallax and non-essential transitions, and SHALL remove no information.
5. WHEN reduced motion is requested, THE Workbench SHALL show the same data, the same pass state and the same controls as without it.
6. THE Workbench SHALL provide a control in the Shell that turns ambient effects off for users who have not set a system preference, and SHALL keep the setting for the session.
7. THE Workbench SHALL NOT flash any content more than three times per second, including loom playback at its fastest speed and any highlight or transition.
8. THE Workbench SHALL provide a test that runs the Playwright suite with `prefers-reduced-motion: reduce` emulated and asserts the behaviour of criteria 4 and 5, and a test that measures the playback and transition change rate and fails above three flashes per second.
9. THE Workbench SHALL provide a monochrome test that renders the Studio_Screen card in greyscale and asserts that each pair of Provenance_Markers differs in shape or pattern and in label text.
10. THE Workbench SHALL keep ambient effects low-contrast behind content, and SHALL keep the card, the evidence and the woven output visually dominant.

### Requirement 23: Responsive layout

**Tier:** P0 for tablet width and above on the P0 screens, P1 for narrow screens

**User Story:** As a user on a tablet or a phone, I want a usable layout, so that I can review a card away from a desk.

#### Acceptance Criteria

1. THE Workbench SHALL provide a layout that keeps every P0 operation available at a viewport width down to the tablet width that design defines (initial value to be set in design).
2. WHEN the viewport is narrower than the tablet width, THE Workbench SHALL collapse the left navigation to a labelled menu control, SHALL move the inspector below or over the card in a dismissible panel, and SHALL keep every essential operation available.
3. THE Workbench SHALL keep the card the largest element on every Studio_Screen layout and SHALL keep each interactive target large enough for touch, with the minimum target size that design defines.
4. THE Workbench SHALL support pinch and drag for zoom and pan of the card where touch input exists, and SHALL provide the keyboard and button equivalents.
5. THE Workbench SHALL show no horizontal page scroll at the narrow width, except inside the card or image viewer.
6. THE Workbench SHALL provide Playwright tests at a tablet viewport and a narrow viewport that complete the P0 journey of requirement 28.
7. THE Workbench SHALL follow the layout of the design system (left navigation, central workbench, contextual inspector) at desktop widths.

### Requirement 24: Performance, workers and bundle budgets

**Tier:** P0 for the worker rule, P1 for the measured budgets

**User Story:** As a user, I want the interface to stay responsive while heavy work runs and to load quickly, so that the demonstration feels immediate.

#### Acceptance Criteria

1. THE Workbench SHALL run detection (including the Image_Backend load) and restoration in workers, SHALL keep the UI thread free of those computations, and SHALL exchange only typed, versioned, structured-cloneable messages with them.
2. THE Workbench SHALL load the Image_Backend lazily on the first detection run, SHALL NOT load it on page load, and SHALL show a loading state while it loads.
3. THE Workbench SHALL load the code of each screen on demand where the screen is not the first screen shown, so that the first screen does not wait for the Loom, Lab or Trail code.
4. THE Workbench SHALL define in `design.md`, as initial values to be measured, a Budget for each of: the initial JavaScript transfer size excluding the Image_Backend, the Image_Backend asset size and load time, first contentful paint, interaction latency for cell selection and layer toggle, the main-thread blocking time during detection, the time from the first Click to the first woven pass in the Quick_Loom_Demo, and the memory used for the largest supported deck.
5. THE Workbench SHALL record each measurement with its reference hardware and browser in `docs`, SHALL report the Budget status as met, not met or not measured, and SHALL NOT state a size, time or latency that is not measured.
6. THE Workbench SHALL provide a Playwright test that measures the longest main-thread task during a detection run through the worker and compares it with the Budget once the Budget is defined.
7. WHEN a screen needs data that takes longer to produce than the interaction-latency Budget, THE Workbench SHALL show a loading state with text and SHALL stay operable.
8. THE Workbench SHALL render the card viewer so that selecting a cell or toggling a layer updates only the affected elements for a deck of the largest supported size, and the render approach SHALL be validated by the interaction-latency measurement.

### Requirement 25: Privacy and local persistence

**Tier:** P0 for no upload and no persistence by default, P2 for opt-in browser storage

**User Story:** As an archivist, I want my photographs to stay in my browser and nothing stored without my consent, so that I do not expose collection material.

#### Acceptance Criteria

1. THE Workbench SHALL process every image in the browser and SHALL transmit no image bytes, derived image, Detection_Result, Deck or record to any server.
2. THE Workbench SHALL make no network request during a session other than the load of its own same-origin static assets and the Browser_Report and Trail_Data files.
3. THE Workbench SHALL store nothing in browser storage by default, and SHALL tell the user on first use that work is kept in memory until exported.
4. WHERE P2 opt-in storage is built, THE Workbench SHALL store a workspace only after the user activates a clearly labelled "Save workspace in this browser" control, SHALL store only the Session_Artifacts and never the image unless the user separately chooses "also save the original image", and SHALL show what is stored.
5. WHERE storage is used, THE Workbench SHALL provide a "Clear local data" control that removes every stored item and confirms the removal in text.
6. WHEN the Workbench loads and finds stored data, THE Workbench SHALL ask the user whether to restore it and SHALL NOT restore it silently, and IF the stored data fails validation THEN THE Workbench SHALL show the mapped error and offer to clear it.
7. WHILE the user has not exported or saved a workspace with unsaved changes, THE Workbench SHALL warn before the page is closed or a new image replaces the session.
8. THE Workbench SHALL keep minimal deep-link behaviour: the route of a screen is part of the address, and no image, deck, record or personal data is placed in the address.
9. THE Workbench SHALL provide a Playwright test that blocks all non-same-origin requests, runs the Quick_Loom_Demo and the Full_Journey on the Demo_Bundle, and asserts that both complete and that no request carries image data.
10. THE Workbench SHALL NOT commit user photographs, and SHALL bundle only the Demo_Bundle whose README states its source and licence.

### Requirement 26: Cross-cutting display of uncertainty and honesty

**Tier:** P0

**User Story:** As a reviewer, I want the same honest treatment of uncertainty on every screen, so that no view contradicts another.

#### Acceptance Criteria

1. THE Workbench SHALL show the Calibration_Marker wherever a restoration confidence is shown on any screen, including tooltips, the inspector, the legend, exports and the Lab_Screen.
2. THE Workbench SHALL show a `null` restoration confidence as "not evaluated" on every screen, and SHALL NOT show it as 0, 0%, empty or as a dash.
3. THE Workbench SHALL NOT treat a cell with provenance `observed`, `repeat-inferred`, `symmetry-inferred`, `ambiguous` or `user-edited` with the same visual treatment as another provenance.
4. THE Workbench SHALL show the profile verification markers (status and basis) wherever a value depends on an `unverified` field, and SHALL provide a single "What is not verified" view that lists every unverified profile field with its basis.
5. THE Workbench SHALL NOT present any proposal as a human-approved deck, and SHALL show "proposal" or "suggestion" on every unaccepted Hypothesis.
6. THE Workbench SHALL show a fixed statement that the Garín card format details are not yet verified against the reference paper, in the "What is not verified" view and in the About section.
7. THE Workbench SHALL provide a test that, for each screen, fails when a numeric confidence is rendered without a Calibration_Marker or when a `null` confidence is rendered as a number.

### Requirement 27: Screen states

**Tier:** P0 for P0 screens, P1 for the others

**User Story:** As a user, I want every screen to say clearly when it is loading, empty, failed, incomplete or waiting for my review, so that I always know what to do next.

#### Acceptance Criteria

1. THE Workbench SHALL define, for each of the five screens, these states with a visible text description, an announcement to assistive technology and a next action: loading, empty, error, incomplete-data and partial or needs-review.
2. THE Scan_Screen SHALL map these states to: loading (Image_Backend or run in progress), empty (no image), error (`failed`, intake or worker error), incomplete-data (`aligned-with-warnings`, unknown positions), and needs-review (Cell_Corrections awaiting a Review_Resolution).
3. THE Studio_Screen SHALL map these states to: loading (restoration run), empty (no detected card), error (run or review error), incomplete-data (`unknown` or `ambiguous` cells), and needs-review (regions `proposed`, unresolved overrides or Pending_Corrections).
4. THE Loom_Screen SHALL map these states to: loading (interpreter preparation), empty (deck unapproved), error (an Interpreter error), incomplete-data (missing mirror, hook mapping or colour layer data), and partial (playback paused before completion).
5. THE Lab_Screen SHALL map these states to: loading (report load), empty (no report), error (report validation error), incomplete-data (undefined metrics, `not-estimated` intervals, `not-evaluated` tracks, shown with their reasons), and partial (a report whose tracks are partly `not-evaluated`).
6. THE Trail_Screen SHALL map these states to: loading (Trail_Data load), empty (no valid entries), error (Trail_Data failing validation), incomplete-data (entries with `unverified` fields), and partial (excluded entries reported in the build stamp).
7. THE Workbench SHALL provide a Playwright test per screen that reaches each of its defined states and asserts the text and the announcement.

### Requirement 28: End-to-end journey and accessibility test suite

**Tier:** P0 for the journey, P1 for the full accessibility suite

**User Story:** As a maintainer, I want automated tests of the whole journey and of accessibility, so that the demonstration cannot silently break.

#### Acceptance Criteria

1. THE Workbench SHALL provide a Playwright journey test that, from the first page load with no stored data, selects the Demo_Bundle card, runs detection through the worker, runs restoration, accepts or selects proposals and edits one cell with a note, approves the deck (with the blockers resolved), opens the Loom_Screen, chooses a mirror orientation and a hook mapping, plays or steps the loom to completion, and exports Deck JSON and SVG in Unverified_Export_Mode, and asserts the state at each step.
2. THE journey test SHALL assert that Verified_Export_Mode is present and disabled with its reason and the named unverified entries, that the Unverified_Export_Mode download starts on one activation with no acknowledgement control and no dialog, that the downloaded SVG contains the Cutting_Caveat text and the Unverified_Assumption_Metadata, and that no label or file contains "laser-ready", "cut-ready" or "machine-ready".
3. THE journey test SHALL assert at the Studio_Screen that each Provenance_State present has its own marker and label, that a `null` confidence is shown as "not evaluated", that the "uncalibrated" marker is visible next to every numeric confidence, and that Hole_Likelihood and restoration confidence are separate fields.
4. THE journey test SHALL assert that an undo of an edit and a withdrawal of an accepted suggestion each restore the prior value, provenance and approval status shown, and that an attempted approval with an unreviewed proposal shows the blocking reason.
5. THE Workbench SHALL provide an accessibility suite that runs an automated rule engine (axe-core through Playwright, or an equivalent that design records) on every screen in each defined state of requirement 27, with zero violations at the levels that design records, and the contrast, keyboard, reduced-motion and flashing tests of requirements 21 and 22.
6. THE Workbench SHALL provide a keyboard test that completes the P0 journey with keyboard input only.
7. THE Workbench SHALL run the journey and accessibility tests offline against the built static site with no network access beyond the same origin.
8. THE Workbench SHALL use a fixed Demo_Bundle and fixed seeds so that the journey test result is deterministic, SHALL use no wall-clock wait in an assertion (it waits on observable states), and SHALL print the seed and the failing step on failure.
9. THE Workbench SHALL provide unit and property tests for pure view-model functions (provenance-to-marker mapping, confidence display, error mapping, export-mode availability, Trail_Data conversion), each with an explicit seed from a block starting at 20260800, a bounded `numRuns` of at most 500, the generator precondition stated beside it, and no `Math.random`, `Date.now` or network.
10. THE Workbench SHALL provide a property test that, for all combinations of profile verification statuses over the Required_Verified_Fields, Verified_Export_Mode is available if and only if every one of the eleven entries is `verified` with a non-empty source citation, including the case of an entry with no readable marker (generator precondition: each entry is `verified` with citation, `verified` without citation, `unverified`, or absent).
11. THE Workbench SHALL provide a property test that, for all confidence values in {`null`, numbers in [0, 1]} and both Calibration_Status values, the Restoration_Confidence_Display shows "not evaluated" exactly for `null`, shows the number otherwise, and always includes the Calibration_Marker for a number.
12. THE Workbench SHALL provide golden tests for the view models of a fixed small deck (the provenance legend, the heatmap legend and the inspector data), committed in version control with a stated reason for any change.
13. THE Workbench SHALL convert every shrunk counterexample into a permanent example test.

### Requirement 29: Interfaces consumed and interface freeze

**Tier:** P0

**User Story:** As a maintainer using Kiro Crew, I want the consumed interfaces recorded and frozen, so that screens can be built in parallel without breaking each other.

#### Acceptance Criteria

1. THE Workbench SHALL record, in `design.md`, the exact exports it consumes from each sibling public index (see "Dependencies on earlier specs") and SHALL treat a change to any of them after design approval as requiring a spec update.
2. THE Workbench SHALL define its own internal interfaces (view-model types, screen props, the Worker_Host message types) in `design.md` before any screen implementation task is delegated, and SHALL mark them frozen at that point.
3. THE Workbench SHALL version its worker messages with an integer protocol version and SHALL reject an unsupported version with an error that the Error_Map covers.
4. THE Workbench SHALL keep each screen in its own module with its own view-model tests, so that tasks for different screens do not edit the same file.
5. THE Workbench SHALL record the interface version constants of the domain, vision, restore and benchmark libraries in the Component_Stamp shown on the Trail_Screen, and SHALL show an error when a major version differs from the one the Workbench supports.

### Requirement 30: Runtime validation at external boundaries

**Tier:** P0 for the image, deck, Detection_Result, Correction_Log, demo asset, URL and user-text Boundaries; P1 for the session log, Benchmark_Report, Trail_Data and user-supplied colour Boundaries; P2 for saved local data

**User Story:** As a user and a maintainer, I want every external file and typed value checked when it enters the Workbench, so that corrupted input produces a clear message and never reaches the engines or the display as partial data.

#### Acceptance Criteria

1. THE Workbench SHALL NOT repeat validation of data that passes between its own typed internal modules or between the sibling public APIs, and SHALL rely on the TypeScript types for that data.
2. THE Workbench SHALL validate at runtime, at its entry Boundary, each of these inputs, and SHALL call the Owner_Validator named for it: (a) an uploaded image file (media type, byte size and pixel dimensions) through the detection intake, returning a Vision_Error_Code; (b) an imported Deck JSON through the domain Deck_Serializer importer; (c) an imported Session_Log through the domain session importer; (d) an imported Detection_Result through the detection Detection_Result importer; (e) an imported Correction_Log through the detection Correction_Log importer; (f) an imported Restoration_Record through the restoration Record_Serializer; (g) a benchmark report index or Browser_Report file through the browser-safe Report_Reader; (h) the bundled Demo_Bundle assets (image, recorded Orientation, recorded loom configuration, precomputed deck and precomputed Detection_Result) through the owning importers, with the manifest validated by the Workbench; (i) the generated Trail_Data, validated at load; (j) saved local session data, WHERE P2 storage is built, through the owners' importers of (b), (e) and (f); (k) route and deep-link parameters; (l) user-entered text: edit notes, correction notes, prior-gate notes, Weaver's Notes labels and colour values.
3. THE Workbench SHALL validate user-entered text before submission to a sibling API: a note SHALL have 1 to 1,000 characters after trimming, SHALL contain no control character other than line feed and tab, and SHALL be shown back unchanged; a Weaver's Notes label SHALL have 1 to 64 characters with the same character rule; a colour value SHALL match the colour representation that the domain Weft_Colour_Layer accepts and SHALL be passed to the domain validator, which returns `INVALID_COLOUR_LAYER` or `COLOUR_LAYER_OUT_OF_RANGE`. THE Workbench SHALL show the violated rule and the permitted values.
4. THE Workbench SHALL accept in a route or deep-link parameter only a screen identifier from the fixed list of five screens, and, IF a parameter is unknown or malformed, THEN THE Workbench SHALL open the start view, SHALL show a plain-language message and SHALL use no parameter value as markup, a path, a file name or a request address.
5. IF a Boundary check fails, THEN THE Workbench SHALL return the owning module's error code, SHALL show the message of the Error_Map with its recovery action (requirement 20), SHALL load no partial value, and SHALL leave the Session_Artifacts and the displayed state unchanged.
6. THE Workbench SHALL introduce no second validator, schema or parser for data that a sibling module owns, and SHALL provide a test that fails when a module in `src/ui` validates, parses or schema-checks such data other than by calling the Owner_Validator.
7. WHERE no sibling owns a Boundary (the Trail_Data, the Demo_Bundle manifest, the route parameters and the user-entered text), THE Workbench SHALL provide exactly one validator for it, in a single module per Boundary, and SHALL give its failures a code in a Workbench error registry that the Error_Map covers (requirement 20.1).
8. THE Workbench SHALL provide, for each Boundary listed in criterion 2, a corrupted-input test that supplies at least one truncated, one wrongly typed, one oversized or out-of-range, and one unknown-field or unknown-value input (where the Boundary has such a case), asserts the returned error code, the mapped message and recovery action, that no partial value was loaded, and that the Session_Artifacts are unchanged, and SHALL provide a test that fails when a Boundary of criterion 2 has no such test.
9. THE Workbench SHALL provide a test that asserts that every error code returned at a Boundary, including those of the Workbench error registry, has an Error_Map entry.

## Assumptions requiring verification

The Workbench copies the verification markers of the MachineProfile and carries a code comment `// UNVERIFIED <id>: see .kiro/steering/jacquard-card-format.md` where it depends on one of them.

| ID | Item | Workbench dependence and handling |
|----|------|-----------------------------------|
| A1 to A9 | Garín format items (reserved positions, end holes, axes, read order, threads-per-hook, mirror, symmetry, card-to-pass mapping, dimensions) | All shown with their unverified markers. Verified_Export_Mode is disabled while any is unverified (requirement 14). The "What is not verified" view lists them. |
| A10 | Licence and terms of the Garín5 dataset | No Garín5 content is bundled. The Demo_Bundle is synthetic unless its README records a checked licence. |
| A11 | Hook mapping: `contiguous-visualization` or `repeat` | The Workbench never preselects one for the user's deck (requirement 15). The Demo_Bundle records an explicit choice and labels it. |
| A8 | Card-to-pass mapping | One card per pass in deck order. Shown as unverified on the Loom_Screen. |
| D7 | Hole polarity | Shown in the Scan_Screen as an unverified assumption with plain-language wording. A change re-reads the card. |
| D3 | Card orientation in the photo | The Demo_Bundle carries a recorded Orientation, labelled "recorded with the bundled sample, not detected". A user image with unresolved orientation needs a user choice. |
| W1 | Which profile facts make up Required_Verified_Fields | Resolved by Q4: the eleven entries of requirement 14 criterion 2. The domain exposes markers for `gridSize`, `physicalDimensions`, `endHoles`, `reservedPositions`, `readOrder`, `hookMappings`, `defaultThreadsPerHook`, `mirrorOptions` and `cardToPass`. Orientation (D3) and hole polarity (D7) have no domain marker, and hole spacing, hole sizes and end-hole geometry are not separately marked. Until the amendment lands, those entries count as unverified. |
| W5 | Validation at each Boundary (requirement 30) | The Workbench calls the Owner_Validator. Corrupted-input behaviour of each owner is covered by the owner's own tests and re-checked at the Boundary by requirement 30. |
| W2 | Budget values (first paint, bundle sizes, latency, tablet width, touch target size) | Initial values are defined in design and validated by measurement. No figure is asserted here. |
| W3 | The Demo_Bundle content, the recorded loom configuration and the precomputed result | To be generated by the sibling pipelines and committed with a README. Their numbers are not benchmark results. |
| W4 | Plain-language labels aid comprehension for newcomers | Not verified until a usability study is recorded (requirement 19.5). The Workbench makes no claim before then. |

## Dependencies on earlier specs

The Workbench consumes the following public exports by name as stated in the sibling requirements. `design.md` records the exact export names after reconciling them with each sibling `design.md` and `index.ts` (Q1).

- **card-domain-and-loom-engine:** `MachineProfile` and its `VerificationStatus` per field, `Garín_Profile`, `Deck`, `Card`, `Cell`, `EffectiveView`, `Provenance`, `Bit`, `ReadIndex`, `GridPosition`, `readIndexToGrid`, `gridToReadIndex`, `userEdit`, `undoEdit`, `withdrawInference`, `requestApproval`, `revokeApproval`, `setInferred` (indirectly through the restoration review service), the Approval_Record and Edit_History accessors, `validateDeck`, the Deck_Serializer export and import, the Session_Log builder and `replaySession`, State_Digest, the Interpreter and the pure `create`, `step`, `pause`, `resume`, `seek`, `reset`, `runToEnd`, `SimulationState`, `FabricBuffer`, the Hook_Mapping and mirror option types, the Weft_Colour_Layer type, the Bitmap_Converter (not used in P0), the SVG_Exporter, the Cutting_Caveat constant, the Educational_Label constant, the interface version constant and the ErrorCode registry with its stable messages.
- **card-detection:** `detect` through the Detection_Client and the Detection_Worker protocol (`run`, `progress`, `cancel`, `result`, `error`, `ready`), `DetectionResult`, `DetectionParameters`, Alignment_Status, failure diagnostics, Derived_Artifact descriptors, Quality_Finding and Unknown_Region polygons, the Manual_Correction_Service operations for both correction classes, the Correction_Log exporter and importer, the reconciliation result, `mapDetection` and the `CardDetectionRecord` with `userConditionOverrides` and `notApplied`, the Detection_Result exporter and importer, the Vision_Error_Code registry, the Implementation_Stamp and the interface version constant.
- **restoration-engine:** the restoration run function, the review service operations (`accept-hypothesis`, `select-alternative`, `edit-cell`, `reject-hypothesis`, `acknowledge-override`, `approve-deck`, `revoke-approval`, `undo-action`, `enable-synthetic-prior`, `disable-synthetic-prior`), Hypothesis and Abstention types, the Evidence_View builder, the Confidence_Heatmap_Data builder, the Restoration_State accessors for cell, region and deck, the unresolved-items list, the Calibration_Status markers, the Prior_Gate state, the Synthetic_Prior_Warning flag and fixed text, the Record_Serializer, the Restoration_Error_Code and Abstention_Reason registries, the Opaque_Timestamp_Label support and the interface version constant.
- **benchmark-and-evaluation:** the browser-safe Report_Reader, the Browser_Report and index types, `MetricValue`, interval statuses, `ReliabilityData`, the user-comparison section statuses, the real-photograph track result, the threshold entry statuses, the fixed honesty-statement constants, `ComponentStamp`, `unverifiedMarkers`, the Benchmark_Error_Code registry and its messages, and the committed quick-profile Browser_Report.

Each sibling's runtime validator or importer named in requirement 30 criterion 2 is part of the consumed interface and is frozen with it (requirement 29).

### Amendments to earlier specs (listed only, not applied)

1. **Domain (Q4, listing only):** (a) expose a `VerificationStatus` marker for the card orientation (D3) and the hole polarity (D7), or confirm that card-detection owns them and supplies the status; (b) expose markers for hole spacing, hole sizes and end-hole geometry, or confirm that `physicalDimensions` and `endHoles` cover them; (c) include the selected hook mapping and the threads-per-hook and mirror statuses in the SVG exporter metadata, which currently lists `gridSize`, `reservedPositions`, `endHoles`, `readOrder` and `physicalDimensions`; (d) export an accessor that returns the eleven Required_Verified_Fields statuses, so that the Workbench does not hard-code them.
2. **Domain:** confirm that the Cutting_Caveat and Educational_Label constants and the SVG exporter's "unapproved" marking are exported as the Workbench needs (requirement 14).
3. **Card-detection:** confirm that the `Detection_Client` is usable from `src/ui` without importing `src/workers` internals, and that a precomputed Detection_Result can be supplied for the fallback of requirement 6.8 (Q3).
4. **Card-detection and restoration:** define the Demo_Bundle format (image, recorded Orientation, precomputed results) and where it is stored under `data` with a README.
5. **Restoration:** confirm the Opaque_Timestamp_Label limit (64 characters in its Q3) so that the Workbench can supply one or none.
6. **Benchmark:** confirm the location and file names of the committed report index and the quick-profile Browser_Report that the build copies into the static site, and that the Report_Reader is exported through a browser-safe subpath.
7. **structure.md:** the `ui` dependency line should name the browser-safe benchmark reader subpath explicitly. The build-time Trail conversion needs a stated home: recommended `scripts/build-trail.ts`, writing generated JSON under `data/generated` for the Vite build to bundle. Update `structure.md` first if a new folder is needed.
8. **tech.md (Q6, listing only):** the open schema-validator trade-off is resolved for the Workbench by requirement 30: the Workbench adds no validator library and calls the Owner_Validators. Each owning spec must export a runtime validator for its external input (detection intake and the Detection_Result and Correction_Log importers, the domain Deck and Session_Log importers, the Report_Reader). For the Trail_Data and the Demo_Bundle manifest, which no sibling owns, the Workbench owns one validator each (requirement 30 criterion 7).
9. **kiro-evidence.md:** state the build-time checks of requirement 17.4 as the verification rule for bundled entries, so that the steering and the converter agree.

## Deliverables mapping

| Requested deliverable | Document | Content |
|-----------------------|----------|---------|
| Acceptance criteria | `requirements.md` (this file) | Obligations, states, tests, tiers. |
| UI architecture | `design.md` | Module layout, state management library choice (Q2), worker host, routing, rendering approach for the card, data-flow diagrams. |
| Screen wireframes | `design.md` | One wireframe per screen and per defined state of requirement 27, desktop, tablet and narrow. |
| Component breakdown | `design.md` | Component tree per screen, props, view-model types, ownership by module. |
| Design tokens | `design.md` | Colour, type, spacing, motion, focus and marker tokens, with measured contrast. |
| Interaction contracts | `design.md` | Keyboard maps, focus order, undo and approval flows, worker message contracts, error mapping table. |
| Implementation tasks | `tasks.md` | Ordered tasks by tier with tests; after the interface freeze of requirement 29.2, per-screen tasks marked as Kiro Crew-delegable. |
| Evidence of Kiro use | `docs/KIRO_TRAIL.md` | Real entries only, converted at build time (requirement 17). |

## Open questions requiring confirmation

- **[CONFIRM] Q1 Export names.** This document names sibling exports as the sibling requirements and the request name them. Recommended: reconcile with each sibling `design.md` and index before this spec's design is written, and record the result in `design.md`.
- **[CONFIRM] Q2 State management.** The choice of React state library belongs to design. Recommended: a small store for View_State and a thin adapter that reads engine state from the Session_Artifacts, so that no library holds a second copy of the truth.
- **[CONFIRM] Q3 Precomputed fallback.** Recommended: ship a precomputed Detection_Result in the Demo_Bundle for the case that the Image_Backend fails, labelled "precomputed, not detected in your browser" (requirement 6.8). The alternative is to show only the failure.
- **[RESOLVED] Q4 Verified export fields and acknowledgement.** Decided by the user. Verified_Export_Mode needs all eleven Required_Verified_Fields of requirement 14.2 verified with a citation, including the hook-to-warp mapping. Unverified downloads are allowed with no acknowledgement or confirmation step, and carry the Unverified_Assumption_Metadata and the Cutting_Caveat (requirement 14.5).
- **[CONFIRM] Q5 "Replay".** The loom Replay control (restart playback) and the domain session replay (digest-verified reconstruction) are different operations. Recommended: show both, with distinct names, as in requirement 15.8 and 15.16.
- **[RESOLVED] Q6 Schema validation at import boundaries.** Decided by the user. No validation between trusted internal modules. Every external or user-supplied input is validated at its Boundary by the owning module's validator (requirement 30). The UI adds no second validator for data a sibling owns.
- **[CONFIRM] Q7 Internationalisation.** Out of scope. Recommended: English only, with all user-facing strings kept in one module so that a later translation does not touch components.
- **[CONFIRM] Q8 Benchmark Lab tier.** Recommended: P1, because the committed report must exist first. The alternative is to promote a minimal Lab to P0 for the judging audience.
- **[CONFIRM] Q9 Trail_Screen tier.** Recommended: P1 with the credits as P0. The alternative is P0 for hackathon submission.
- **[CONFIRM] Q10 Hosting.** Static hosting with no server. The hosting provider is a deployment decision outside this spec.

## Non-functional bounds summary

- Fixed: three Clicks for the Quick_Loom_Demo (at most two Clicks to the first woven pass); at most three Hypotheses per region; no more than three flashes per second; text contrast 4.5:1 and component contrast 3:1; notes and explanations at most 1,000 characters; up to 100 listed items with a total count.
- Defined in design and validated by measurement: tablet width, touch target size, initial JavaScript size, Image_Backend size and load time, first contentful paint, interaction latency, main-thread blocking time, memory for the largest deck, cancellation display latency.
- Not fixed here: any accuracy, calibration, speed or time-saving number. Those come only from recorded Browser_Reports.

## Amendment record

| # | Change | Source | Sections touched |
|---|--------|--------|------------------|
| 1 | Q4 resolved. Required_Verified_Fields is now an explicit list of eleven entries (grid, physical dimensions and spacing, end holes, reserved positions, orientation, hole polarity, read order, hook mapping, threads-per-hook, mirror, card-to-pass). Verified_Export_Mode stays disabled until all are `verified` with a citation. Unverified downloads need no acknowledgement or dialog and carry Unverified_Assumption_Metadata. The acknowledgement requirement was removed. | User decision | Glossary; requirement 14 criteria 2 to 5 and 10; requirement 28 criteria 2 and 10; assumption W1; amendment 1 to the domain spec; Q4 |
| 2 | Q6 resolved. New requirement 30 lists every external input Boundary, requires the Owner_Validator at each, adds the user-text, route-parameter, Trail_Data and Demo_Bundle manifest validators, forbids a second validator for sibling-owned data, and requires a corrupted-input test per Boundary. | User decision | Glossary; requirements 16 criterion 3, 20 criterion 1 and 30; dependencies; assumption W5; amendment 8 to tech.md; Q6 |
| 3 | Domain amendments listed, not applied: markers for orientation and hole polarity, hole spacing, hole sizes and end-hole geometry; exporter metadata for the hook mapping, threads-per-hook and mirror; an accessor for the eleven statuses. | Follows from 1 | Amendments to earlier specs, item 1 |

Numbering of requirements 1 to 29 is unchanged. `design.md` and `tasks.md` were not touched.

# Requirements Document

## Introduction

This feature delivers the Restoration_Engine: a deterministic, browser-side library in `src/restore` that proposes values for missing or ambiguous Jacquard card instructions, explains every proposal, quantifies its uncertainty, and routes every decision through explicit human review and approval. It is the third of five specs (domain, detection, restoration, benchmark, UI).

**Core principle.** Loom Lazarus never silently invents historical instructions. Every reconstruction is a hypothesis supported by stated evidence. It is not a claim of historical certainty. A missing cell stays unknown unless the evidence supports a proposal, and a proposal changes the effective deck only after a human accepts it.

**Approach.** Restoration uses deterministic algorithms only: repeat detection across the card sequence, mirror-symmetry evaluation where the particular deck supports it, and combination of those structural priors with image evidence from detection. No large language model or other learned model restores cells. Optional model output from detection (Assistant_Evidence) is displayed with its label and is not used for inference.

**Builds on approved contracts.** The Restoration_Engine reuses these domain names without redefining them: `MachineProfile`, `Deck`, `Card`, `Cell`, `RawObservation`, `Evidence`, `Provenance`, `Bit`, `ReadIndex`, `ActionId`, `SequenceNumber`, `ApprovalRecord`, `ApprovalState`, `EffectiveView`, `Result`, `DomainError`, `setInferred`, `userEdit`, `undoEdit`, `withdrawInference`, `Live_Entry`, `requestApproval`, `revokeApproval`, `effectiveView`, `validateDeck`, `readIndexToGrid`, `gridToReadIndex`. It consumes these detection outputs by name: `CardDetectionRecord`, `userConditionOverrides`, `notApplied` (needs-review corrections), `assistantEvidence`, `Condition` (`observed`, `ambiguous`, `unknown`), `holeProbability`, `polarity`, `patchId` and `Image_Digest`.

The domain contract imposes these constraints, which this document respects:
- Restoration_Confidence is `number | null`. `null` means not evaluated and is never equal to `0`. Detection sets `null` on every detected cell. Only restoration assigns a numeric value, and only through `setInferred`.
- `setInferred` accepts provenance `repeat-inferred`, `symmetry-inferred` or `ambiguous`, requires a numeric confidence in [0, 1] and non-empty evidence of at most 1,000 characters, rejects `observed`, and returns `INVALID_EDIT` on a cell whose latest user edit is not reversed.
- `userEdit` takes a `Bit` and an Edit_Note and sets provenance `user-edited`.
- The domain provides `undoEdit` for `user-edit` entries only, and `withdrawInference` for `inference` entries. `withdrawInference` is append-only: it appends a withdrawal entry, removes no history, restores the Previous_Fields of the withdrawn inference (earlier value or its absence, provenance, Restoration_Confidence including `null`, and evidence), and appends an `unapproved` Approval_Record with cause `withdrawal` when the Deck was approved. It accepts a cell only when the latest Live_Entry of the cell is an `inference` entry, and otherwise returns `INVALID_EDIT` (the latest Live_Entry is a user edit) or `NOTHING_TO_WITHDRAW` (no Live_Entry, or the latest is not an inference). It reports `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE` and `DUPLICATE_ACTION_ID` first, in that order.
- Approval is a separate append-only list of Approval_Records with an Action_Id and a Sequence_Number. No wall-clock time exists in any domain type.
- `requestApproval` refuses a deck that holds a cell with provenance `ambiguous` and no effective value, unless the caller passes the explicit ambiguous-as-down policy.

`src/restore` may import `src/domain` and consume detection output types. `src/domain` never imports `src/restore`. `src/restore` never imports `src/benchmark` or `src/ui`.

**Verification status of the card format.** The Garín format values in `jacquard-card-format.md` are NOT verified against Rodas Lorente et al. (2025), https://doi.org/10.1007/s11042-025-20917-9. Whether historical decks repeat, whether they are mirror-symmetric, and how card order maps to weaving passes (assumption A8) are all unverified. The Restoration_Engine therefore treats repetition and symmetry as hypotheses to test per deck, keeps both disabled until a recorded measurement exists (requirement 3), and lists its dependence on unverified items in "Historical assumptions requiring verification".

**Research integrity.** The reference paper already covers digitization, recognition of damaged cards, error correction, manual validation and pattern reconstruction. This feature does not claim those capabilities as new. Its stated contribution is inference of missing instructions from deck-level structure with explicit provenance, calibrated uncertainty, alternative hypotheses and reversible human approval.

**Scope boundaries.**
- In scope: input validation, protected-cell rules, prior gating and measurement records, repeat detection, symmetry evidence testing, image-evidence combination, short-region inference, ranked hypotheses with abstention, explanations, confidence and calibration status, the Restoration_Record, review actions, the state machine, approval gating, undo, audit trail, Restoration Evidence Mode data, heatmap data, record serialisation, error registry, and interfaces for the UI and benchmark specs.
- Stretch (optional): whole-card recovery (requirement 11).
- Out of scope: image detection, damage models, accuracy targets, benchmark harness, React UI and rendering, within-card periodicity detection, learned or LLM-based restoration, historical colour inference, physical loom control and support for card formats other than those a Machine_Profile describes.

**Deferred numbers.** Numeric thresholds (agreement thresholds, minimum support, maximum period, region-length bound, run-time budgets) are not fixed here. Design defines them as configurable defaults and empirical testing on the benchmark `tuning` role validates them. The `src/benchmark` spec owns damage definitions, split roles and accuracy targets. Official held-out and test metrics are produced only by the benchmark runner, never by restoration.

**Honesty rules carried from steering.** Accuracy and prevalence numbers are quoted only from a recorded run. Hole likelihood (probability that a hole is present in the image) and restoration confidence (estimated correctness of a proposed value) are separate fields with separate labels. Unknown evidence is never converted into a value without evidence. Uncertainty is always shown.

## Glossary

- **Restoration_Engine**: The `src/restore` library specified by this document, as a whole.
- **Inference_Engine**: The component that runs repeat detection, symmetry evaluation and evidence combination and returns hypotheses. It never writes to a Deck.
- **Review_Service**: The component that validates and records review actions (accept, select, edit, reject, acknowledge, undo, approve) and writes to the domain only through the domain functions named in requirement 13.
- **Evidence_View_Builder**: The component that produces the Restoration Evidence Mode view data and the heatmap data.
- **Record_Serializer**: The component that exports and imports the Restoration_Record, Prior_Measurement and Calibration_Record as JSON.
- **Base_Deck**: The domain `Deck` supplied to a restoration run.
- **Detection_Evidence**: The optional per-card `CardDetectionRecord` values supplied beside the Base_Deck, keyed by `cardId`.
- **Target_Cell**: A cell that the Inference_Engine may propose a value for: a cell whose Effective_View has provenance `ambiguous` and no effective value (see requirement 2).
- **Protected_Cell**: A cell the Inference_Engine must not change or propose over without surfacing: a cell with provenance `observed`, a cell with provenance `user-edited` whose latest user edit is not reversed, or a cell with an applied user condition override.
- **Trusted_Cell**: A cell whose effective value may serve as structural evidence: provenance `observed` without an applied user condition override, or `user-edited` with an un-reversed edit. Cells with provenance `repeat-inferred`, `symmetry-inferred` or `ambiguous` are never Trusted_Cells.
- **Applied_Override**: A `userConditionOverrides` entry with `applied` true in the detection record.
- **Pending_Correction**: A detection Cell_Correction in review state `needs-review` that is listed in `notApplied` of the detection record.
- **Restoration_Region**: A maximal run of Target_Cells with consecutive `readIndex` values within one Card.
- **Region_Length**: The number of cells in a Restoration_Region.
- **Short_Region_Bound**: The configurable maximum Region_Length for which the Inference_Engine proposes values. Its default is set in design.
- **Structural_Prior**: A hypothesis family that uses deck-level structure: `repeat` (rows repeat at a period across the card sequence) or `symmetry` (mirror symmetry about an axis).
- **Repeat_Period**: A positive integer `p` such that card `i` and card `i + p` are hypothesised to carry the same row.
- **Symmetry_Axis**: A reflection hypothesis, either `card-sequence` (card `i` pairs with card `c - i` for an axis position `c`, possibly half-integer) or `within-card` (hook partner mapping defined in design). Both kinds are subject to the unverified assumptions A3 to A6.
- **Evidence_Test**: The per-deck statistical test that decides whether a Structural_Prior is supported by that deck's own Trusted_Cells (requirement 4 and 5).
- **Chance_Baseline**: The agreement expected between compared cells if no structure exists, computed from the bit densities of the compared Trusted_Cells.
- **Hypothesis**: A proposed assignment of Bits to the cells of one Restoration_Region, with a Hypothesis_Confidence, a provenance category, an explanation and the supporting evidence.
- **Hypothesis_Confidence**: The estimated probability in [0, 1] that the Hypothesis assignment is correct. A different quantity from Hole_Probability.
- **Hole_Probability**: The detection estimate in [0, 1] that a hole is present in the image at a position (domain `holeLikelihood`).
- **Image_Evidence**: The Hole_Probability, Condition, unknown reason and quality-finding references of a cell from the Detection_Evidence, converted to a Bit probability through the polarity recorded in the detection record.
- **Abstention**: The outcome that a Restoration_Region receives no Hypothesis, with an Abstention_Reason.
- **Abstention_Reason**: A code from the fixed list in requirement 22.
- **Prior_Measurement**: A versioned record of the measured frequency and measured reliability of one Structural_Prior kind on a named dataset, with licence status, scope, split, seed, benchmark version and sample size (requirement 3).
- **Prior_Gate**: The rule that a Structural_Prior kind is disabled until a valid Prior_Measurement for that kind is supplied and the caller enables it.
- **Deck_Origin**: A configuration value `real` or `synthetic`. `real` marks a deck derived from a real photograph or a historical card, or from any image whose synthetic origin is not attested. `synthetic` marks a generator-produced deck. The default is `real`. A deck is never marked `real` in order to pass validation when it is synthetic, and a deck is accepted as `synthetic` only when every card whose Detection_Evidence carries an `Image_Digest` has a valid Synthetic_Image_Attestation. Cards without image evidence (for example context cards created from a bitmap) need no attestation.
- **Synthetic_Image_Attestation**: A caller-supplied declaration bound to one image digest of one card, with the fields `generator`, `generatorVersion`, `sourceId` (dataset or bundle identifier), `seed` (integer), `parametersDigest` and `imageDigest`. It is a declaration by the caller. The Restoration_Engine cannot prove how the image was made, and its documentation SHALL say so.
- **syntheticAttestations**: The optional input map from `cardId` to Synthetic_Image_Attestation. A deck has at most one attestation per card, because Detection_Evidence is also keyed by `cardId`. The map is empty or absent for Deck_Origin `real`.
- **Synthetic_Deck_Notice**: The fixed text constant "Measured on synthetic data. This says nothing about historical cards."
- **Synthetic_Evaluation_Context**: A configuration flag, valid only together with Deck_Origin `synthetic`, that marks a run as an evaluation or test run on generator-produced decks.
- **Synthetic_Only_Prior**: A Structural_Prior kind whose only supplied Prior_Measurement has scope `synthetic`.
- **Synthetic_Prior_Enablement**: An explicit, user-recorded action `enable-synthetic-prior` (or its reversal `disable-synthetic-prior`) that allows or stops use of one Synthetic_Only_Prior on a Deck_Origin `real` deck. Each is an entry in the Restoration_Record with an Action_Id and a Sequence_Number, and a note of 1 to 1,000 characters.
- **Synthetic_Prior_Warning**: The pair of a boolean flag `syntheticPriorWarning` and the fixed text "Warning: this prior was derived from synthetic data and has not been validated on historical cards." carried by every output item that depends on an enabled Synthetic_Only_Prior on a Deck_Origin `real` deck.
- **Calibration_Record**: A versioned record that maps raw Hypothesis_Confidence to calibrated confidence, with method name, calibration split, sample size, seed, expected calibration error, bin count and the conditions under which it applies (requirement 10).
- **Benchmark_Split_Role**: One of `tuning`, `calibration`, `held-out` or `test`, as defined by the benchmark-and-evaluation spec (requirement 10). Each Deck_Family of a benchmark dataset belongs to exactly one role. Restoration consumes only `tuning` and `calibration`.
- **Tuning_Script**: The offline TypeScript script `scripts/restoration-tune.ts` that measures priors, selects parameters and fits calibration mappings from files in the Minimal_Dataset_Format.
- **Minimal_Dataset_Format**: The JSON file format that the Tuning_Script reads: a domain Deck JSON and a list of masked cells with their known values. Documented in `docs/restoration-priors.md`.
- **Calibration_Status**: `uncalibrated` or `calibrated` with a reference to one Calibration_Record, carried on every Hypothesis and every reported confidence.
- **Restoration_Record**: The versioned, append-only restoration-layer record that is stored beside the domain Deck. It holds the run configuration, hypotheses, review entries, raw-observation copies, diagnostics and abstentions. It is not a domain type.
- **Review_Action**: One recorded user decision: `accept-hypothesis`, `select-alternative`, `edit-cell`, `reject-hypothesis`, `acknowledge-override`, `approve-deck`, `revoke-approval` or `undo-action`.
- **Review_Outcome**: The result of a Review_Action on a cell: `accepted`, `selected`, `edited`, `rejected-left-unknown` or `acknowledged`.
- **Restoration_State**: One of `detected`, `proposed`, `reviewed` or `approved`, defined per cell, per Restoration_Region and per Deck (requirement 14).
- **Opaque_Timestamp_Label**: An optional caller-supplied string attached to a Review_Action. The library never reads a clock, never parses the string, and excludes it from equality, digests and determinism checks (requirement 17).
- **Evidence_View**: The data for Restoration Evidence Mode for one inferred cell or Restoration_Region (requirement 18).
- **Confidence_Heatmap_Data**: Per-card arrays of per-cell numeric confidence (or `null`) and provenance category, plus a separate per-cell Hole_Probability layer (requirement 18).
- **Ground_Truth_Value**: Any value, label or deck from a benchmark or evaluation source that records the true instruction of a masked cell.
- **Seed**: An integer in the restoration configuration. The algorithms are deterministic, and the Seed is recorded for any component that needs one.
- **Restoration_Error_Code**: A code in the Restoration_Engine error registry (requirement 22). It uses the domain `Result` shape and is separate from the domain `ErrorCode` union.

## Requirements

### Requirement 1: Inputs and validation

**User Story:** As a restoration user, I want the engine to accept an ordered deck with its detection evidence and refuse inconsistent input, so that restoration never starts from corrupted or mismatched data.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL accept as input a Base_Deck, an optional Detection_Evidence entry per card, a restoration configuration, an optional Prior_Measurement per Structural_Prior kind and an optional `syntheticAttestations` map from `cardId` to Synthetic_Image_Attestation.
2. WHEN a restoration run starts, THE Restoration_Engine SHALL validate the Base_Deck with the domain `validateDeck` and SHALL return the domain violations, wrapped with code `DOMAIN_RULE_REJECTED`, IF validation fails.
3. IF a Detection_Evidence entry names a `cardId` that is absent from the Base_Deck, THEN THE Restoration_Engine SHALL return error `DETECTION_EVIDENCE_MISMATCH` naming the `cardId`.
4. IF a Detection_Evidence entry has a `profileId` that differs from the Base_Deck Machine_Profile, or a `perCell` length that differs from `readableCount`, THEN THE Restoration_Engine SHALL return error `DETECTION_EVIDENCE_MISMATCH` naming the field.
5. WHERE no Detection_Evidence is supplied for a card, THE Restoration_Engine SHALL run on the domain Deck values alone and SHALL record that no image evidence was available for that card.
6. THE Restoration_Engine SHALL treat the card order of the Base_Deck as the card sequence and SHALL document that the order equals the weaving pass order only under the unverified assumption A8.
7. IF the restoration configuration has a value outside its documented range, THEN THE Restoration_Engine SHALL return error `INVALID_CONFIGURATION` naming the field and its permitted range before any inference starts.
8. IF the Base_Deck holds more cards than the configured maximum deck size for restoration, THEN THE Restoration_Engine SHALL return error `LIMIT_EXCEEDED` naming the limit, the supplied value and the permitted value.
9. IF any function of the Restoration_Engine returns an error, THEN THE Restoration_Engine SHALL leave every input unchanged and SHALL return no partial result.
10. THE Restoration_Engine SHALL record in the Restoration_Record the digest of the Base_Deck, the profile identifier, the verification markers the run depended on, and, for each card with Detection_Evidence, the `Image_Digest` and the detection `resultId`.

### Requirement 2: Target cells and protected cells

**User Story:** As an archivist, I want observed and human-decided cells protected, so that restoration never overwrites historical evidence or my decisions.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL treat a cell as a Target_Cell only when the cell's Effective_View has provenance `ambiguous` and no effective value.
2. THE Restoration_Engine SHALL treat each cell with provenance `observed` as a Protected_Cell and SHALL NOT propose a value for it.
3. WHILE the latest user edit of a cell is not reversed, THE Restoration_Engine SHALL treat the cell as a Protected_Cell and SHALL NOT propose a value for it.
4. WHERE the Detection_Evidence lists an Applied_Override for a cell, THE Restoration_Engine SHALL treat the cell as a Protected_Cell for automatic writing and SHALL surface the cell for review, as stated in criteria 5 to 7.
5. WHEN the Inference_Engine evaluates a cell with an Applied_Override, THE Inference_Engine SHALL record any Hypothesis for that cell in the Restoration_Record only, SHALL include the override's Action_Id, declared Condition and note in the Hypothesis explanation, and SHALL NOT write the Hypothesis to the Base_Deck.
6. WHEN the Inference_Engine evaluates structural evidence for any cell, THE Inference_Engine SHALL exclude the detector's value of each cell with an Applied_Override from the Trusted_Cell set.
7. WHILE an Applied_Override has no `acknowledge-override` Review_Action and no user edit on its cell, THE Restoration_Engine SHALL list the override as an unresolved item that blocks approval (requirement 16).
8. IF a Pending_Correction exists in the Detection_Evidence of a card, THEN THE Restoration_Engine SHALL list it as an unresolved item that blocks approval, SHALL NOT apply it, and SHALL NOT drop it.
9. THE Restoration_Engine SHALL NOT use a cell with provenance `repeat-inferred`, `symmetry-inferred` or `ambiguous` as structural evidence for another cell, so that no inference is built on an earlier inference.
10. WHERE the Detection_Evidence records a Condition `observed` that contradicts a Hypothesis of an enabled Structural_Prior for that cell, THE Inference_Engine SHALL report the disagreement as a diagnostic with the supporting counts and SHALL leave the observed cell unchanged.
11. THE Restoration_Engine SHALL NOT set a cell to provenance `observed` through any function.
12. THE Restoration_Engine SHALL define a Restoration_Region as a maximal run of consecutive `readIndex` values of Target_Cells within one Card, and SHALL treat a Protected_Cell as a boundary between two regions.

### Requirement 3: Prior gating and measurement

**User Story:** As a researcher, I want repeat and symmetry priors disabled until their frequency and reliability have been measured, so that no structural assumption is applied on faith.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL disable every Structural_Prior kind by default.
2. WHEN a caller enables a Structural_Prior kind in the configuration without a valid Prior_Measurement for that kind, THE Restoration_Engine SHALL return error `PRIOR_MEASUREMENT_MISSING` naming the kind and SHALL start no inference.
3. WHILE a Structural_Prior kind is disabled, THE Inference_Engine SHALL produce no Hypothesis of that kind and SHALL report Abstention_Reason `PRIOR_NOT_ENABLED` for each region that only that kind could address.
4. THE Prior_Measurement SHALL contain: the prior kind, the dataset identifier, the dataset source, the dataset licence, a licence-check status (`checked` or `unchecked`), a redistribution flag, the scope (`synthetic` or `real`), the benchmark version, the dataset version, the seed, the Benchmark_Split_Role (`tuning` or `calibration`), the sample size, the measured frequency, the measured reliability, the evidence-test parameters used, and a description of the data.
5. THE Prior_Measurement SHALL define measured frequency as the fraction of decks or cards in the dataset for which the Evidence_Test reports support for the prior kind, and measured reliability as the fraction of correct values among masked cells of known value that the prior recovered, each with its sample size.
6. IF a Prior_Measurement lacks a required field, has a frequency or reliability outside [0, 1], has a sample size below 1, or names a different prior kind than the one it is supplied for, THEN THE Restoration_Engine SHALL reject it with error `INVALID_PRIOR_MEASUREMENT` naming the path of the first violation.
7. THE Restoration_Engine SHALL keep a Prior_Measurement of scope `synthetic` and one of scope `real` as separate records and SHALL NOT merge, pool or average their numbers.
8. WHERE a Prior_Measurement has scope `synthetic`, THE Restoration_Engine SHALL label its frequency as a generator parameter and not as evidence of historical prevalence, wherever the frequency is reported.
9. WHERE the only Prior_Measurement for an enabled prior kind has scope `synthetic` and the Deck_Origin is `real`, THE Restoration_Engine SHALL attach the Synthetic_Prior_Warning to every Hypothesis of that kind and SHALL add the text "prior measured on synthetic data only; real-card prevalence not measured" to its explanation (criteria 14 to 19).
10. WHERE a Prior_Measurement names a dataset with licence-check status `unchecked`, THE Restoration_Engine SHALL mark the measurement `local-only`, and THE Restoration_Engine SHALL NOT list it among the measurements bundled with the application.
11. THE Restoration_Engine SHALL NOT report a prior frequency, prior reliability or recovery accuracy that is absent from a recorded Prior_Measurement.
12. WHEN a Hypothesis is produced, THE Restoration_Engine SHALL record in the Restoration_Record a reference to the Prior_Measurement that enabled its prior kind.
13. THE Restoration_Engine SHALL record the Prior_Gate state (kind, enabled flag, measurement reference, Deck_Origin, Synthetic_Prior_Enablement state) in the Restoration_Record of every run.
14. WHILE the Deck_Origin is `real`, THE Restoration_Engine SHALL treat each Synthetic_Only_Prior as disabled by default, regardless of the enabled flag in the configuration, until a Synthetic_Prior_Enablement for that kind is recorded.
15. IF a run on a Deck_Origin `real` deck enables a Synthetic_Only_Prior in the configuration and no `enable-synthetic-prior` entry for that kind is in effect, THEN THE Restoration_Engine SHALL return error `PRIOR_NOT_VALIDATED_FOR_REAL_DECKS` naming the kind, SHALL apply no inference of that kind and SHALL start no inference.
16. WHEN a user records `enable-synthetic-prior` for a kind, THE Restoration_Engine SHALL append an entry with an Action_Id, a Sequence_Number, the kind, the note and the optional Opaque_Timestamp_Label to the Restoration_Record, SHALL reject a duplicate Action_Id with `DUPLICATE_ACTION_ID`, SHALL reject a missing or over-long note with `NOTE_REQUIRED` or `NOTE_TOO_LONG`, and SHALL reject a kind that has no Synthetic_Only_Prior status with `INVALID_TRANSITION`.
17. WHEN a user records `disable-synthetic-prior` for a kind, THE Restoration_Engine SHALL append an entry as in criterion 16, SHALL apply no further inference of that kind in later runs, and SHALL keep earlier Hypotheses of that kind in the Restoration_Record with their Synthetic_Prior_Warning.
18. WHILE a Synthetic_Prior_Enablement is in effect, THE Restoration_Engine SHALL set `syntheticPriorWarning` to true and attach the fixed Synthetic_Prior_Warning text on every Hypothesis, Evidence_View, Confidence_Heatmap_Data entry and Restoration_Record entry that depends on that prior, and SHALL include the fixed text in the Hypothesis explanation.
19. THE Restoration_Engine SHALL give every Hypothesis that carries the Synthetic_Prior_Warning the Calibration_Status `uncalibrated`, SHALL NOT mark its confidence as validated historical evidence, and SHALL NOT remove the warning by calibration, acceptance or approval.
20. WHERE the Deck_Origin is `synthetic` and the Synthetic_Evaluation_Context is set, THE Restoration_Engine SHALL permit a Synthetic_Only_Prior without Synthetic_Prior_Enablement and without the Synthetic_Prior_Warning, and SHALL record the Deck_Origin and the context flag in the Restoration_Record.
21. IF the Synthetic_Evaluation_Context is set with Deck_Origin `real`, THEN THE Restoration_Engine SHALL return error `INVALID_CONFIGURATION` naming the field. IF Deck_Origin `synthetic` is supplied and any card whose Detection_Evidence carries an `Image_Digest` has no entry in `syntheticAttestations` whose `imageDigest` equals that `Image_Digest`, THEN THE Restoration_Engine SHALL return error `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]` for the first such card in deck order. Cards without an `Image_Digest` in their Detection_Evidence, and cards without Detection_Evidence, need no attestation. This rule is the safeguard against relabelling real photographs as synthetic.
22. THE Restoration_Engine SHALL accept each entry of `syntheticAttestations` as valid only if every field is present and non-empty, `seed` is an integer, `parametersDigest` and `imageDigest` have the documented digest format, the key `cardId` exists in the Base_Deck, that card's Detection_Evidence carries an `Image_Digest`, and `imageDigest` equals that `Image_Digest`. IF any of these fails, THEN THE Restoration_Engine SHALL return error `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]` and the first failing field, and SHALL evaluate entries in deck order, then by `cardId` for keys absent from the deck.
23. IF `syntheticAttestations` holds any entry and the Deck_Origin is `real`, THEN THE Restoration_Engine SHALL return error `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]` for the first entry.
24. WHERE the Deck_Origin is `synthetic` and criteria 21 and 22 are satisfied for every card, with or without the Synthetic_Evaluation_Context, THE Restoration_Engine SHALL permit a Synthetic_Only_Prior that the configuration enables and a valid Prior_Measurement backs, SHALL require no `enable-synthetic-prior` entry, SHALL still return `PRIOR_MEASUREMENT_MISSING` when the measurement is absent, and SHALL set `syntheticPriorWarning` to false, because the Synthetic_Prior_Warning concerns historical cards.
25. WHERE the Deck_Origin is `synthetic` and criteria 21 and 22 are satisfied, THE Restoration_Engine SHALL record `deckOrigin` in every Restoration_Record, Evidence_View, Confidence_Heatmap_Data entry and Hypothesis, SHALL record the per-card attestation references (the `cardId` and attestation `imageDigest` of each attested card) in the Restoration_Record and in each Evidence_View and Hypothesis whose evidence includes an attested card, SHALL record that a card without an attestation has no image evidence, SHALL include the Synthetic_Deck_Notice in every Hypothesis explanation, and SHALL set the Calibration_Status to `uncalibrated` unless a valid Calibration_Record of scope `synthetic` applies.
26. WHEN `syntheticAttestations` holds valid entries, THE Restoration_Engine SHALL record in the Restoration_Record, per card, the attestation fields and the statement that the attestation is an unverified caller declaration. THE Restoration_Engine SHALL add no new Restoration_Error_Code for criteria 21 to 25.

### Requirement 4: Repeat detection across the card sequence

**User Story:** As a restorer, I want missing instructions proposed from rows that demonstrably repeat in this deck, so that a proposal rests on the deck's own evidence.

#### Acceptance Criteria

1. WHERE the `repeat` prior kind is enabled, THE Inference_Engine SHALL search Repeat_Periods from 1 to the configured maximum period, whose default design sets, for each ordered pair of cards separated by the period.
2. THE Inference_Engine SHALL compute, for each candidate Repeat_Period and each card, the number of Trusted_Cells at which both cards of a pair have a Trusted value (the comparable count) and the number of those cells at which the values agree.
3. THE Evidence_Test SHALL report support for a Repeat_Period only when the comparable count reaches the configured minimum, the agreement fraction reaches the configured threshold, the agreement exceeds the Chance_Baseline by the configured margin, and the number of agreeing card pairs reaches the configured minimum support.
4. WHEN no Repeat_Period passes the Evidence_Test for a card, THE Inference_Engine SHALL report Abstention_Reason `NO_STRUCTURAL_EVIDENCE` for the repeat prior on that card's regions.
5. WHEN a Repeat_Period passes the Evidence_Test, THE Inference_Engine SHALL derive, for each Target_Cell, the candidate value from Trusted_Cells at the same `readIndex` in cards at distance `k * p` from the target card, for every integer `k` (positive and negative) that lies inside the deck.
6. IF the supporting Trusted values for one Target_Cell are equally split between 0 and 1, THEN THE Inference_Engine SHALL report Abstention_Reason `CONFLICTING_EVIDENCE` for that cell and SHALL NOT break the tie by position or by seed.
7. IF a candidate pattern is degenerate, meaning the compared Trusted_Cells have a bit density within the configured margin of 0 or 1 so that agreement does not exceed the Chance_Baseline, THEN THE Inference_Engine SHALL report Abstention_Reason `DEGENERATE_PATTERN`.
8. THE Inference_Engine SHALL state in each repeat Hypothesis explanation the Repeat_Period, the number of supporting cards, the number of agreeing cards and the comparable cell count.
9. WHERE more than one Repeat_Period passes the Evidence_Test, THE Inference_Engine SHALL evaluate each separately and SHALL NOT merge their evidence into one count.
10. THE Inference_Engine SHALL document that repetition is a property of some decks and not a rule, and SHALL NOT apply a Repeat_Period to a deck for which the Evidence_Test reports no support.

### Requirement 5: Mirror symmetry evaluated per design

**User Story:** As a restorer, I want symmetry used only when this particular design shows it, so that a symmetric assumption never overwrites an asymmetric design.

#### Acceptance Criteria

1. WHERE the `symmetry` prior kind is enabled, THE Inference_Engine SHALL evaluate each candidate Symmetry_Axis of the kinds the configuration enables, and SHALL evaluate no axis that the configuration does not enable.
2. THE Inference_Engine SHALL evaluate a Symmetry_Axis only through its Evidence_Test: comparable count, agreement fraction, Chance_Baseline margin and minimum number of agreeing pairs, each at its configured threshold.
3. WHEN a Symmetry_Axis fails the Evidence_Test, THE Inference_Engine SHALL produce no `symmetry-inferred` Hypothesis from that axis and SHALL report Abstention_Reason `NO_STRUCTURAL_EVIDENCE` where no other prior applies.
4. THE Inference_Engine SHALL evaluate symmetry for a deck independently of any other deck and SHALL NOT carry a symmetry conclusion from one deck to another.
5. WHEN a Symmetry_Axis passes the Evidence_Test, THE Inference_Engine SHALL derive the partner position of each Target_Cell from the axis definition and SHALL propose its value only if the partner is a Trusted_Cell.
6. WHERE the axis kind is `within-card`, THE Inference_Engine SHALL take the partner mapping from a documented function of the Machine_Profile and SHALL mark every resulting Hypothesis with the unverified status of assumptions A3 to A6.
7. THE Inference_Engine SHALL state in each symmetry Hypothesis explanation the axis kind, the axis position, the agreement fraction, the comparable count and the partner position used.
8. THE Inference_Engine SHALL treat a design that does not pass the symmetry Evidence_Test as asymmetric for restoration purposes, SHALL NOT infer from symmetry in that deck, and SHALL NOT report the deck as asymmetric in any output.
9. THE Restoration_Engine SHALL document that historical designs may be non-symmetrical (assumption A7) and SHALL NOT assume symmetry in any default.

### Requirement 6: Combining structural priors with image evidence

**User Story:** As a restorer, I want the image evidence and the structural evidence weighed together, so that a proposal that the photograph contradicts is ranked lower or withheld.

#### Acceptance Criteria

1. WHERE Detection_Evidence supplies a Hole_Probability for a Target_Cell, THE Inference_Engine SHALL convert it to a probability that the cell is `lifted` through the polarity recorded in the detection record, using `hole-is-lifted` as `P(lifted) = holeProbability` and `hole-is-down` as `P(lifted) = 1 - holeProbability`.
2. IF the detection record carries no polarity, THEN THE Inference_Engine SHALL NOT combine its Hole_Probability with a structural Hypothesis and SHALL record the reason in the diagnostics.
3. WHEN a Target_Cell has both a structural candidate and Image_Evidence, THE Inference_Engine SHALL combine them by a documented rule defined in design, and SHALL record both inputs and the combined result in the Hypothesis evidence.
4. WHEN the Image_Evidence for a Target_Cell strongly contradicts the structural candidate, as defined by a configurable contradiction threshold, THE Inference_Engine SHALL lower the Hypothesis_Confidence of the structural candidate and SHALL state the contradiction in the explanation.
5. WHERE the Target_Cell has Condition `unknown` in the Detection_Evidence, THE Inference_Engine SHALL use no image evidence for that cell and SHALL record the unknown reason (for example `occluded-by-cord`) in the explanation.
6. WHERE a Target_Cell has Image_Evidence and no structural candidate, THE Inference_Engine SHALL NOT propose a value from the Hole_Probability alone and SHALL report Abstention_Reason `NO_STRUCTURAL_EVIDENCE`.
7. THE Inference_Engine SHALL NOT use the Hole_Probability of a Protected_Cell as evidence about a different cell, except through the Trusted_Cell value of that Protected_Cell under requirements 4 and 5.
8. THE Inference_Engine SHALL list the detection quality-finding identifiers that overlap each Target_Cell in the Hypothesis evidence.
9. WHERE Detection_Evidence carries Assistant_Evidence, THE Inference_Engine SHALL NOT use it as input, and THE Evidence_View_Builder SHALL display it with its model identifier, model version and the label that it is model-generated and not an observation.

### Requirement 7: Short-region inference

**User Story:** As a restorer, I want proposals only for isolated cells and short damaged runs, so that long gaps are not filled by guesswork.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL expose the Short_Region_Bound as a configuration value with a documented range and a default set in design.
2. WHEN a Restoration_Region has a Region_Length at most the Short_Region_Bound, THE Inference_Engine SHALL evaluate it for Hypotheses.
3. IF a Restoration_Region has a Region_Length greater than the Short_Region_Bound, THEN THE Inference_Engine SHALL report Abstention_Reason `REGION_TOO_LARGE` with the Region_Length and the bound, and SHALL propose no value for that region.
4. WHEN a Restoration_Region has a Region_Length of 1, THE Inference_Engine SHALL treat it as an isolated missing cell.
5. THE Inference_Engine SHALL evaluate each Restoration_Region independently, so that the Hypotheses of one region do not use the Hypotheses of another region as evidence.
6. WHERE every cell of a Card is a Target_Cell, THE Inference_Engine SHALL apply requirement 11 instead of this requirement.
7. THE Inference_Engine SHALL report, for each region, either at least one Hypothesis or an Abstention with an Abstention_Reason.

### Requirement 8: Ranked hypotheses and abstention

**User Story:** As a restorer, I want a few honest alternatives with reasons, or an explicit refusal, so that I am never shown padding.

#### Acceptance Criteria

1. THE Inference_Engine SHALL return at most three Hypotheses per Restoration_Region.
2. THE Inference_Engine SHALL rank the Hypotheses of a region by Hypothesis_Confidence in non-increasing order and SHALL break equal confidences by a fixed documented rule that does not depend on the Seed.
3. THE Inference_Engine SHALL include a Hypothesis only when at least one Trusted_Cell or Image_Evidence item supports its assignment, and SHALL NOT create a Hypothesis to fill a slot.
4. WHEN only one assignment is supported for a region, THE Inference_Engine SHALL return exactly one Hypothesis.
5. WHEN no assignment is supported for a region, THE Inference_Engine SHALL return an Abstention and the region SHALL keep provenance `ambiguous` with no effective value.
6. THE Inference_Engine SHALL include with each Hypothesis a non-empty explanation of at most 1,000 characters that names the evidence kind, the supporting counts and the cells or cards used.
7. THE Inference_Engine SHALL distinguish, in each Hypothesis, the provenance category (`repeat-inferred` or `symmetry-inferred`) from the status `proposed`, and SHALL NOT use provenance `observed`.
8. IF a Hypothesis combines evidence of the `repeat` and `symmetry` kinds, THEN THE Inference_Engine SHALL assign one provenance category by a documented rule and SHALL list both evidence kinds in the explanation.
9. THE Inference_Engine SHALL return an Abstention with a reason from the fixed list in requirement 22 for every Target_Cell that is not covered by a Hypothesis.

### Requirement 9: Evidence and explanation per inference

**User Story:** As an archivist, I want a specific human-readable reason for every inference, so that I can judge it without reading code.

#### Acceptance Criteria

1. THE Inference_Engine SHALL produce for each Hypothesis an explanation that states the prior kind, the supporting counts, the agreeing counts, the cells used as evidence (by `cardId` and `readIndex`, up to a configured limit with the total count), and the Image_Evidence used.
2. THE Inference_Engine SHALL produce each explanation by a deterministic template so that equal inputs give equal text.
3. IF an explanation exceeds 1,000 characters, THEN THE Inference_Engine SHALL truncate it with an ellipsis and SHALL keep the full structured evidence in the Restoration_Record.
4. THE Inference_Engine SHALL record in structured form, for each Hypothesis, the evidence items (kind, `cardId`, `readIndex`, value, trust source) so that the Evidence_View_Builder does not parse text.
5. WHERE a Hypothesis carries the Synthetic_Prior_Warning, THE explanation SHALL contain the fixed warning text and the label of requirement 3.9.
6. THE explanation SHALL contain the Calibration_Status of the Hypothesis_Confidence.

### Requirement 10: Confidence and calibration

**User Story:** As a researcher, I want every confidence number labelled calibrated or uncalibrated and tied to a validation on a Benchmark_Split_Role that the fit did not read, so that no score is read as more reliable than it is.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL assign a Hypothesis_Confidence in [0, 1] to each Hypothesis and SHALL assign no numeric confidence to any other cell.
2. THE Restoration_Engine SHALL keep Hypothesis_Confidence separate from Hole_Probability in every output and SHALL label them differently.
3. THE Restoration_Engine SHALL leave the Restoration_Confidence of a cell at `null` when no Hypothesis has been written to the Deck for that cell, and SHALL NOT write `0` for a cell that has not been evaluated.
4. THE Restoration_Engine SHALL mark each Hypothesis_Confidence with a Calibration_Status, and SHALL use `uncalibrated` unless a valid Calibration_Record applies.
5. THE Calibration_Record SHALL contain: the method name, the calibration split identifier (Benchmark_Split_Role `calibration`), the tuning split identifier (Benchmark_Split_Role `tuning`), the dataset version, the sample size per bin, the Seed, the benchmark version, the expected calibration error with its bin count, the prior kinds and support ranges for which it is valid, and the mapping data.
6. IF a Calibration_Record names a calibration split other than `calibration`, a tuning split other than `tuning`, the same split for calibration and for tuning, or a calibration split that overlaps the tuning split, THEN THE Restoration_Engine SHALL reject it with error `INVALID_CALIBRATION_RECORD`.
7. WHERE a Hypothesis lies outside the prior kinds or support ranges of the Calibration_Record, THE Restoration_Engine SHALL mark its confidence `uncalibrated`.
8. WHERE a valid Calibration_Record applies, THE Restoration_Engine SHALL use the calibrated value as the Hypothesis_Confidence, SHALL keep the raw value in the Restoration_Record, and SHALL cite the Calibration_Record in the Calibration_Status.
9. THE Restoration_Engine SHALL set the domain deck-level `confidenceCalibration` marker to `uncalibrated` unless every numeric confidence written to the Deck carries a `calibrated` status that cites one benchmark reference.
10. THE Restoration_Engine SHALL document that the calibration method is defined in design, that calibration data comes from the benchmark `calibration` role and is split from tuning data (the `tuning` role), that the Calibration_Record reports expected calibration error only if it was measured on a role the fit did not read, and that the damage definitions, split roles and accuracy targets of the calibration data belong to the `src/benchmark` spec. Official held-out and test calibration error is produced only by the benchmark runner.
11. THE Restoration_Engine SHALL NOT quote an expected calibration error that is absent from a recorded Calibration_Record.
12. THE Restoration_Engine SHALL read the Calibration_Record as a data value and SHALL NOT import any benchmark or evaluation module at run time.

### Requirement 11: Whole-card recovery (stretch, optional)

**User Story:** As a restorer, I want an optional attempt to recover a fully missing card from its neighbours, with an honest refusal when the deck does not support it, so that I can test how far the structure reaches.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL treat whole-card recovery as a stretch feature, SHALL disable it by default, and SHALL satisfy every other requirement of this document without it.
2. WHERE whole-card recovery is enabled and a Card has every cell as a Target_Cell, THE Inference_Engine SHALL attempt recovery only through a Structural_Prior kind that is enabled and has a passed Evidence_Test.
3. WHEN the number of Trusted_Cell supporting cards for a whole-card recovery is below the configured minimum, THE Inference_Engine SHALL report Abstention_Reason `NO_NEIGHBOURING_INFORMATION` and SHALL propose no value for that card.
4. THE Inference_Engine SHALL return, for a whole-card recovery, a Hypothesis per Restoration_Region subject to requirement 8, and SHALL report the share of the card's cells covered by Hypotheses.
5. WHERE the Short_Region_Bound is smaller than `readableCount`, THE Inference_Engine SHALL treat whole-card recovery as a separate request that the caller enables explicitly and SHALL NOT use it to bypass `REGION_TOO_LARGE` for partial regions.
6. THE Restoration_Engine SHALL mark every whole-card Hypothesis `stretch` in the Restoration_Record and in the Evidence_View.
7. THE Restoration_Engine SHALL NOT accept a whole-card Hypothesis without an explicit Review_Action per card.

### Requirement 12: Restoration_Record and raw-observation preservation

**User Story:** As an auditor, I want the original observations and every restoration decision kept permanently in one record, so that the restoration can be reviewed and reproduced.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL create a Restoration_Record for each restoration run and SHALL keep it separate from the domain Deck.
2. THE Restoration_Record SHALL contain, for each Restoration_Region and each Target_Cell, a copy of the Raw_Observation (value and Hole_Probability, either possibly absent) taken from the Base_Deck, and the detection `patchId` and `Image_Digest` where Detection_Evidence exists.
3. THE Restoration_Engine SHALL NOT modify a Raw_Observation in the Deck or in the Restoration_Record after the run that created the copy.
4. FOR ALL Deck cells and all sequences of Restoration_Engine operations, THE Raw_Observation of the Deck cell SHALL equal the Raw_Observation copied into the Restoration_Record.
5. THE Restoration_Record SHALL contain the configuration of the run, the Seed, the Prior_Gate state, the Calibration_Status references, every Hypothesis (including those not accepted), every Abstention, every diagnostic, and every Review_Action in order.
6. THE Restoration_Record SHALL be append-only: no entry SHALL be removed or modified, and a later run SHALL append a new run section and SHALL mark the earlier unreviewed Hypotheses `superseded`.
7. WHEN a later run supersedes a Hypothesis that has a recorded Review_Action, THE Restoration_Engine SHALL keep the Review_Action and the decided value, and SHALL NOT re-propose over a cell with a Review_Outcome `accepted`, `selected` or `edited`.
8. THE Restoration_Record SHALL assign each entry a Sequence_Number that increases by exactly 1 per entry, and SHALL contain no wall-clock time.
9. THE Restoration_Engine SHALL provide an integrity check that returns `RECORD_DECK_MISMATCH` when the Deck digest, a raw-observation copy, or a recorded domain write does not agree with the supplied Deck.

### Requirement 13: Writing into the domain

**User Story:** As a maintainer, I want every change to the deck to pass through the domain's own functions, so that restoration cannot bypass domain rules or contradict the domain contract.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL write an inferred value to a Deck only through the domain `setInferred`, a human-edited value only through the domain `userEdit`, the reversal of an edit only through the domain `undoEdit`, the reversal of an accepted inference only through the domain `withdrawInference`, and approval changes only through the domain `requestApproval` and `revokeApproval`.
2. THE Restoration_Engine SHALL NOT write a Hypothesis to a Deck until a user has recorded an `accept-hypothesis` or `select-alternative` Review_Action for it.
3. WHEN a user accepts or selects a Hypothesis, THE Review_Service SHALL call `setInferred` once per cell of the region with the Hypothesis provenance category, value, Hypothesis_Confidence (calibrated when a Calibration_Record applies), and an Evidence text equal to the Hypothesis explanation, using Action_Id `"<actionId>#<cardId>#<readIndex>"` per cell.
4. WHEN a user records an `edit-cell` Review_Action, THE Review_Service SHALL call `userEdit` with the user's value, the user's note as the Edit_Note, and the supplied Action_Id.
5. IF the domain rejects a call, THEN THE Review_Service SHALL return error `DOMAIN_RULE_REJECTED` with the underlying domain code, SHALL leave the Deck and the Restoration_Record unchanged, and SHALL return no partial write, except for the domain codes that criterion 14 of requirement 17 maps to a specific Restoration_Error_Code.
6. IF a Review_Action would write to a cell with provenance `observed`, THEN THE Review_Service SHALL return error `OBSERVED_CELL_PROTECTED` and SHALL leave the Deck unchanged, except for an `edit-cell` Review_Action by the user.
7. IF a Review_Action would write an inferred value to a cell whose latest user edit is not reversed, THEN THE Review_Service SHALL return error `USER_EDIT_PROTECTED` and SHALL leave the Deck unchanged.
8. THE Review_Service SHALL express each domain write as the matching domain Session_Action kind (`set-inferred`, `user-edit`, `undo-edit`, `withdraw-inference`, `request-approval`, `revoke-approval`) so that a domain Session_Log can record and replay it, and SHALL define no new Session_Action kind.
9. THE Restoration_Engine SHALL keep in the Restoration_Record, and not in the Deck, the Hypotheses, alternatives, abstentions, review states, raw confidence, Calibration_Status references, evidence structure and diagnostics.
10. THE Review_Service SHALL give each Review_Action that writes to the domain the same Action_Id as the domain action, and SHALL reject an Action_Id that already exists in the Restoration_Record or in the Deck history with error `DUPLICATE_ACTION_ID`.
11. WHILE the Deck Approval_State is `approved`, THE Review_Service SHALL reject every Review_Action other than `edit-cell`, `revoke-approval` and `undo-action` with error `DECK_APPROVED`.
12. THE Restoration_Engine SHALL NOT call the domain `requestApproval` with the ambiguous-as-down policy unless the user supplies the policy and a note in an `approve-deck` Review_Action.

### Requirement 14: State machine

**User Story:** As a UI developer, I want a precise state machine at cell, region and deck level that maps onto the domain approval contract, so that the UI cannot show an approved deck that the domain considers unapproved.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL define the Restoration_State values `detected`, `proposed`, `reviewed` and `approved`, and SHALL define them per cell, per Restoration_Region and per Deck.
2. THE Restoration_Engine SHALL set a Target_Cell to `detected` before any Hypothesis exists, and a cell that holds an observed value in the Base_Deck SHALL remain `detected` until the Deck is approved.
3. WHEN the Inference_Engine returns at least one Hypothesis for a Target_Cell, THE Restoration_Engine SHALL set the cell state to `proposed`.
4. WHEN a user records a Review_Action with a Review_Outcome on a cell, THE Restoration_Engine SHALL set the cell state to `reviewed`.
5. WHEN the Deck Approval_State becomes `approved`, THE Restoration_Engine SHALL report every cell as `approved`.
6. THE Restoration_Engine SHALL derive the Restoration_State of a Restoration_Region as `proposed` when at least one cell of the region is `proposed`, as `reviewed` when no cell is `proposed` and at least one cell is `reviewed`, and as `detected` otherwise.
7. THE Restoration_Engine SHALL derive the Deck Restoration_State from the Deck's current domain Approval_State and the region states: `approved` when `currentApproval` is `approved`; otherwise `proposed` when any region is `proposed`; otherwise `reviewed` when any review entry exists; otherwise `detected`.
8. THE Restoration_Engine SHALL map the domain Approval_State `unapproved` to the Deck states `detected`, `proposed` and `reviewed`, and the domain Approval_State `approved` to the Deck state `approved`, and SHALL store no approval flag of its own.
9. THE Restoration_Engine SHALL allow only these transitions: `detected` to `proposed` (a run), `detected` to `reviewed` (a user edit or acknowledgement), `proposed` to `reviewed` (a Review_Action), `reviewed` to `proposed` (undo of a Review_Action, or a new run that adds Hypotheses to unreviewed cells), `reviewed` to `approved` (approval), `detected` to `approved` (approval of a Deck with no Target_Cell, Applied_Override or Pending_Correction), and `approved` to `reviewed` (a user edit, a withdrawal of an accepted inference, or a revoke).
10. IF a requested transition is not in the allowed list or its guard fails, THEN THE Restoration_Engine SHALL return error `INVALID_TRANSITION` naming the current state, the requested action and the failed guard, and SHALL leave the Deck and the Restoration_Record unchanged.
11. WHILE a Restoration_Region is `approved`, THE Restoration_Engine SHALL NOT change its cells except through an `edit-cell` Review_Action or an `undo-action` Review_Action, each of which appends an `unapproved` Approval_Record through the domain.
12. IF the Restoration_Record reports the Deck state `approved` while the Deck's domain Approval_State is `unapproved`, or the reverse, THEN THE Restoration_Engine SHALL return error `RECORD_DECK_MISMATCH` from the integrity check.

### Requirement 15: Review actions

**User Story:** As a restorer, I want to accept, select, edit, reject and acknowledge, one region at a time, so that I stay in control of every value.

#### Acceptance Criteria

1. WHEN a user records `accept-hypothesis` for a region, THE Review_Service SHALL apply the top-ranked Hypothesis of the region as in requirement 13 and SHALL set the Review_Outcome `accepted` on each cell of the region.
2. WHEN a user records `select-alternative` with the rank of a Hypothesis of the region, THE Review_Service SHALL apply that Hypothesis as in requirement 13 and SHALL set the Review_Outcome `selected`.
3. IF the rank in a `select-alternative` Review_Action is not the rank of an existing Hypothesis of the region, THEN THE Review_Service SHALL return error `HYPOTHESIS_NOT_FOUND`.
4. WHEN a user records `edit-cell` for a cell with a value and a note of 1 to 1,000 characters, THE Review_Service SHALL apply it through `userEdit` and SHALL set the Review_Outcome `edited` and the state `reviewed`.
5. WHEN a user records `edit-cell` for a cell inside a region with pending Hypotheses, THE Review_Service SHALL mark the Hypotheses of that cell `superseded by user edit` and SHALL leave the other cells of the region as they were.
6. WHEN a user records `reject-hypothesis` for a region, THE Review_Service SHALL set the Review_Outcome `rejected-left-unknown`, SHALL make no domain write, and SHALL leave each cell of the region with provenance `ambiguous` and no effective value.
7. WHEN a user records `acknowledge-override` for an Applied_Override cell, THE Review_Service SHALL record the acknowledgement and an optional note in the Restoration_Record, SHALL leave the domain cell unchanged, and SHALL NOT delete or alter the override.
8. IF a Review_Action names a `cardId`, region or cell that does not exist in the Base_Deck or the Restoration_Record, THEN THE Review_Service SHALL return error `REGION_NOT_FOUND` or `UNKNOWN_CARD` and SHALL leave every record unchanged.
9. THE Review_Service SHALL NOT perform any Review_Action automatically, and SHALL NOT change a state from `proposed` to `reviewed` without a user-supplied Review_Action.
10. WHERE a caller requests a bulk acceptance, THE Review_Service SHALL require the caller to list the regions explicitly, SHALL record one Review_Action per region, and SHALL NOT accept a region that is not listed.
11. IF a Review_Action carries an empty note where this document requires one, or a note longer than 1,000 characters, THEN THE Review_Service SHALL return error `NOTE_REQUIRED` or `NOTE_TOO_LONG`.

### Requirement 16: Approval

**User Story:** As an archivist, I want approval to freeze exactly the decisions I made, so that nothing I did not choose reaches the loom or an export.

#### Acceptance Criteria

1. WHEN a user records `approve-deck`, THE Review_Service SHALL evaluate the approval guard of criteria 2 to 6 before it calls the domain `requestApproval`.
2. IF any Restoration_Region has state `proposed`, THEN THE Review_Service SHALL return error `APPROVAL_BLOCKED` with reason `PROPOSALS_UNREVIEWED` listing up to 100 regions and the total count.
3. IF any Applied_Override has no `acknowledge-override` Review_Action and no user edit on its cell, THEN THE Review_Service SHALL return error `APPROVAL_BLOCKED` with reason `OVERRIDES_UNRESOLVED`.
4. IF any Pending_Correction exists in the Detection_Evidence, THEN THE Review_Service SHALL return error `APPROVAL_BLOCKED` with reason `PENDING_CORRECTIONS`.
5. IF any cell has provenance `ambiguous` and no effective value and the user supplied no ambiguous-as-down policy, THEN THE Review_Service SHALL return the domain error `UNRESOLVED_CELLS`, wrapped as `DOMAIN_RULE_REJECTED`, with the card and `readIndex` list.
6. WHERE the user supplies the ambiguous-as-down policy with a note, THE Review_Service SHALL pass it to the domain and SHALL record the policy, the note and the affected cells in the Restoration_Record.
7. WHEN approval succeeds, THE Review_Service SHALL leave the effective value of every cell equal to the value held before approval, so that the approved deck contains only observed values, accepted or selected Hypotheses, user edits and, where the user chose the policy, policy values.
8. THE Review_Service SHALL NOT turn any unreviewed Hypothesis into an effective value at approval.
9. WHEN approval succeeds, THE Review_Service SHALL leave every Raw_Observation, every Restoration_Confidence (including `null`) and every Evidence of the Deck unchanged.
10. WHEN a user records `revoke-approval`, THE Review_Service SHALL call the domain `revokeApproval`, and the Deck state SHALL become `reviewed`.
11. WHEN the Deck approval succeeds, THE Review_Service SHALL record the domain Action_Id and the domain approval Sequence_Number in the Restoration_Record.

### Requirement 17: Undo and audit trail

**User Story:** As an archivist, I want to reverse my decisions without losing the history, and to see who decided what and why, so that the restoration is auditable.

#### Acceptance Criteria

1. THE Review_Service SHALL record each Review_Action as an entry with an Action_Id, a Sequence_Number, the action kind, the target, the prior value, the prior provenance, the prior Review_Outcome, the new values, the note, and the optional Opaque_Timestamp_Label.
2. THE Review_Service SHALL treat the Action_Id and Sequence_Number as the authoritative order of the audit trail.
3. WHERE a caller supplies an Opaque_Timestamp_Label, THE Review_Service SHALL store it unchanged, SHALL NOT parse or validate it as a date, SHALL limit its length to the configured maximum, and SHALL exclude it from equality checks, digests and determinism comparisons.
4. THE Restoration_Engine SHALL NOT read the system clock in any function.
5. WHEN a user records `undo-action` for a Review_Action of kind `edit-cell` that is not reversed and is the latest un-reversed edit of its cell, THE Review_Service SHALL call the domain `undoEdit`, SHALL append an undo entry that references the reversed Action_Id, and SHALL restore the prior effective value, provenance and Approval_State in the Effective_View.
6. WHEN a user records `undo-action` for a Review_Action of kind `accept-hypothesis` or `select-alternative`, THE Review_Service SHALL call the domain `withdrawInference` once per cell of the region with Action_Id `"<actionId>#<cardId>#<readIndex>"`, SHALL append an undo entry to the Restoration_Record that references the reversed Action_Id, SHALL set each affected cell state back to `proposed`, and SHALL make the Effective_View of each cell (value or its absence, provenance, Restoration_Confidence including `null`, evidence) equal to its Effective_View before the reversed action.
6a. WHEN a user records `undo-action` for a Review_Action of kind `reject-hypothesis`, THE Review_Service SHALL make no domain call, SHALL append an undo entry that references the reversed Action_Id, and SHALL set each affected cell state back to `proposed`.
6b. THE Review_Service SHALL check, before the first domain call of an `undo-action` on an accepted or selected Hypothesis, that every cell of the region has an `inference` entry written by the reversed action as its latest Live_Entry, and SHALL make no domain write if any cell fails the check.
6c. WHEN `withdrawInference` succeeds on a Deck whose Approval_State is `approved`, THE Review_Service SHALL report the Deck state `reviewed` as a transient transition, because the domain appends an `unapproved` Approval_Record with cause `withdrawal`, and the derived Deck state SHALL then follow requirement 14.7 from the cell and region states (so `proposed` when the withdrawn cells are `proposed` again).
7. WHEN a user records `undo-action` for a Review_Action of kind `acknowledge-override`, THE Review_Service SHALL append an undo entry and SHALL make the override unresolved again.
8. THE Review_Service SHALL NOT remove or modify any entry of the Restoration_Record or any domain history entry when it records an undo.
9. THE Restoration_Engine SHALL NOT withdraw or undo an automatic Hypothesis that has not been accepted, because it was never written to the Deck. A Hypothesis that is not accepted SHALL stay in the Restoration_Record with the state `proposed`, `rejected-left-unknown` or `superseded`, as the Review_Outcome or a later run determines.
10. WHEN an undo reverses an edit that was made while the Deck was approved, THE Review_Service SHALL restore the Deck Approval_State that existed before the edit by the domain mechanism that appends an Approval_Record.
11. IF the referenced Action_Id does not exist in the Restoration_Record, THEN THE Review_Service SHALL return error `UNKNOWN_ACTION_ID`, and IF it exists but is already reversed or is not reversible, THEN THE Review_Service SHALL return error `NOTHING_TO_UNDO`, in both cases without changing any record, and SHALL return `NOTHING_TO_UNDO` for an `undo-action` that targets a Review_Action whose domain writes were already withdrawn.
12. THE Review_Service SHALL apply the multi-level undo limit of the domain `undoEdit` to `edit-cell` entries and SHALL document it (see open question Q4), and SHALL apply the Live_Entry rule of the domain `withdrawInference` to accepted inferences.
13. FOR ALL sequences of Review_Actions and undos, THE Restoration_Record length SHALL never decrease and every earlier entry SHALL remain equal to its earlier value.
14. WHEN a domain call made for an `undo-action` returns an error, THE Review_Service SHALL map `NOTHING_TO_WITHDRAW` and `NOTHING_TO_UNDO` to `NOTHING_TO_UNDO`, SHALL map `INVALID_EDIT` from `withdrawInference` (a user edit protects the cell) to `USER_EDIT_PROTECTED` naming the cell, SHALL map `UNKNOWN_CARD` to `UNKNOWN_CARD`, and SHALL wrap any other domain code as `DOMAIN_RULE_REJECTED`, in every case without a partial write.
15. THE Review_Service SHALL keep two undo paths apart: the undo of a manual edit calls the domain `undoEdit`, and the undo of an accepted or selected inference calls the domain `withdrawInference`, and THE Review_Service SHALL NOT use either call for the other kind of entry.
16. WHEN a user edit lies above an accepted inference on a cell, THE Review_Service SHALL require the user to undo the edit first before the inference can be withdrawn, and SHALL return `USER_EDIT_PROTECTED` until then.

### Requirement 18: Restoration Evidence Mode data and confidence heatmap

**User Story:** As a UI developer and a reviewer, I want one complete evidence view per inferred cell or region and a heatmap data set, so that the interface can show what was observed, what was inferred, and how sure the system is.

#### Acceptance Criteria

1. THE Evidence_View_Builder SHALL produce, for each inferred cell or Restoration_Region, an Evidence_View that contains: the original image crop reference (`patchId` and `Image_Digest`), the Raw_Observation, the Hole_Probability, the proposed recovered value, the provenance category, the supporting neighbouring evidence, the Hypothesis_Confidence, the Calibration_Status, the competing Hypotheses, and the review and approval status.
2. WHERE no Detection_Evidence exists for a cell, THE Evidence_View_Builder SHALL set the crop reference to absent and SHALL state that no image evidence was available.
3. THE Evidence_View_Builder SHALL show Hole_Probability and Hypothesis_Confidence as separate named fields.
4. WHERE a Hypothesis_Confidence is `uncalibrated`, THE Evidence_View_Builder SHALL carry the marker `uncalibrated` in the Evidence_View and in the Confidence_Heatmap_Data.
5. THE Evidence_View_Builder SHALL include for each Applied_Override cell the override's Action_Id, condition, note and review state.
6. THE Evidence_View_Builder SHALL include for each Abstention the Abstention_Reason and its structured values.
7. THE Evidence_View_Builder SHALL produce Confidence_Heatmap_Data per card with one entry per `readIndex`, holding the numeric confidence or `null`, the provenance category from the five domain values or `unresolved`, the Restoration_State and the Grid_Position from the domain `readIndexToGrid`.
8. THE Evidence_View_Builder SHALL keep `null` (not evaluated) distinct from `0` in the Confidence_Heatmap_Data and SHALL NOT coerce one into the other.
9. THE Evidence_View_Builder SHALL provide a separate Hole_Probability layer that is independent of the confidence layer.
10. THE Evidence_View_Builder SHALL produce the same data for equal inputs, and SHALL contain no rendering instruction, colour or pixel.
11. THE Evidence_View_Builder SHALL include the unverified markers that the run depended on (requirement 1.10) in every view.
12. WHERE a Hypothesis, Evidence_View or Confidence_Heatmap_Data entry carries the Synthetic_Prior_Warning, THE Evidence_View_Builder SHALL set `syntheticPriorWarning` to true and include the fixed warning text in the Evidence_View and in each affected heatmap entry.
13. THE Evidence_View_Builder SHALL include in every view the Deck_Origin and the Synthetic_Prior_Enablement entries (Action_Id, Sequence_Number, kind, note) that apply to the shown Hypotheses.
14. WHILE a Synthetic_Prior_Enablement is in effect, THE Evidence_View_Builder SHALL list the enabled Synthetic_Only_Prior kinds in a deck-level warning field with the fixed warning text, so that the warning is visible even when no Hypothesis is shown.

### Requirement 19: Determinism and leakage guard

**User Story:** As a researcher, I want identical runs to give identical records and a proof that no evaluation label can reach the inference, so that benchmark results are honest and reproducible.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL return identical Restoration_Records and identical Decks for identical Base_Deck, Detection_Evidence, configuration, Prior_Measurements, Calibration_Records and Seed.
2. THE Restoration_Engine SHALL use no `Math.random`, no `Date`, no network request and no environment-dependent value in any function that produces a Hypothesis or a record.
3. THE Restoration_Engine SHALL order every iteration by `cardId` position, then `readIndex`, then period or axis position, so that results do not depend on object key order.
4. THE Inference_Engine SHALL accept only the Base_Deck, Detection_Evidence, configuration, Prior_Measurements and Calibration_Records as input, and SHALL define no input type that carries a Ground_Truth_Value, a truth Deck or an evaluation label.
5. THE Restoration_Engine SHALL NOT import any module that defines or reads a Ground_Truth_Value, and a boundary test SHALL fail when `src/restore` imports from `src/benchmark`, `src/ui`, `src/workers` or any evaluation or damage module, or imports `src/vision` at run time.
6. IF a caller supplies a Base_Deck in which a masked cell still carries a `raw.value`, THEN THE Restoration_Engine SHALL treat that value as an observation and SHALL NOT treat the cell as masked.
7. THE Restoration_Engine SHALL expose a masking contract for benchmark use: a masked cell is represented in the Deck by a Raw_Observation without value and provenance `ambiguous`, so that the true value does not exist in any input of the Inference_Engine.
8. THE Restoration_Engine SHALL document that the Seed does not select among equally supported Hypotheses, that tie-breaking uses a fixed documented rule, and that the Seed is recorded for components that need one.

### Requirement 20: Limits

**User Story:** As a maintainer, I want explicit configurable limits, so that a large or hostile input cannot exhaust the browser.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL expose these limits as configuration values with documented ranges, each with a default that design sets and measurement validates: the maximum number of cards processed per run, the maximum Repeat_Period, the Short_Region_Bound, the maximum number of Target_Cells per run, the maximum evidence items listed per explanation, the maximum Review_Actions per Restoration_Record, the maximum Restoration_Record text size and the maximum Opaque_Timestamp_Label length.
2. THE Restoration_Engine SHALL fix the maximum Hypotheses per region at 3, the maximum explanation length at 1,000 characters and the maximum note length at 1,000 characters, and SHALL NOT allow a configuration to raise them.
3. THE Restoration_Engine SHALL NOT accept a configuration that raises the maximum number of cards above the domain limit of 10,000 cards.
4. IF an input exceeds a configured limit, THEN THE Restoration_Engine SHALL return error `LIMIT_EXCEEDED` naming the limit, the supplied value and the permitted value, before it starts the expensive computation.
5. THE Restoration_Engine SHALL document the time and memory budgets for a run on the bundled sample, SHALL validate them by measurement on reference hardware, and SHALL NOT claim a budget that has not been measured.

### Requirement 21: Serialisation of the Restoration_Record, Prior_Measurement and Calibration_Record

**User Story:** As an archivist and a researcher, I want lossless, versioned files for the record and the measurement data, so that restorations can be saved, shared and audited.

#### Acceptance Criteria

1. THE Record_Serializer SHALL export a Restoration_Record, a Prior_Measurement and a Calibration_Record as JSON text, each with a `format` marker and an integer `schemaVersion`, with stable key order, with no timestamp, and with the Opaque_Timestamp_Label written only as a string field where present.
2. THE Record_Serializer SHALL import each of the three types and SHALL return the first failure in this order: size, syntax, `format`, `schemaVersion`, unknown field, then semantic validation.
3. IF the text of a Restoration_Record is larger than the configured maximum size, THEN THE Record_Serializer SHALL return error `INPUT_TOO_LARGE` without parsing it.
4. IF the text is not valid JSON, including truncated text, THEN THE Record_Serializer SHALL return error `INVALID_JSON`.
5. IF the `format` marker is absent or unknown, or the `schemaVersion` is unsupported or not an integer, THEN THE Record_Serializer SHALL return `INVALID_FORMAT` or `UNSUPPORTED_SCHEMA_VERSION`.
6. IF the text holds a field that is not in the schema, THEN THE Record_Serializer SHALL return error `UNKNOWN_FIELD` naming the path.
7. IF the text parses but violates a record invariant (a confidence outside [0, 1], a numeric confidence on a Hypothesis with provenance `observed`, more than three Hypotheses in a region, a non-contiguous Sequence_Number, a duplicate Action_Id, or a Review_Action that references a missing entry), THEN THE Record_Serializer SHALL return error `INVALID_RESTORATION_RECORD` with the path of the first violation and no partial record.
8. FOR ALL valid Restoration_Records, Prior_Measurements and Calibration_Records, THE Record_Serializer SHALL produce identical text when it exports, imports and exports again (round trip).
9. THE Record_Serializer SHALL write a confidence of `null` as the JSON literal `null`, SHALL read it back as `null`, and SHALL keep it distinct from `0`.
10. THE Record_Serializer SHALL leave an Opaque_Timestamp_Label out of any digest or equality function that it provides.
11. THE Record_Serializer SHALL NOT embed image pixels or the Original_Image in any record.

### Requirement 22: Error registry and abstention codes

**User Story:** As a UI and test author, I want every failure and every refusal to have a stable, documented code, so that behaviour at the boundaries is explicit and testable.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL define one Restoration_Error_Code registry with a stable message per code, containing at least: `DOMAIN_RULE_REJECTED`, `DETECTION_EVIDENCE_MISMATCH`, `INVALID_CONFIGURATION`, `LIMIT_EXCEEDED`, `PRIOR_MEASUREMENT_MISSING`, `PRIOR_NOT_VALIDATED_FOR_REAL_DECKS`, `INVALID_PRIOR_MEASUREMENT`, `INVALID_CALIBRATION_RECORD`, `OBSERVED_CELL_PROTECTED`, `USER_EDIT_PROTECTED`, `HYPOTHESIS_NOT_FOUND`, `REGION_NOT_FOUND`, `UNKNOWN_CARD`, `INVALID_TRANSITION`, `APPROVAL_BLOCKED`, `DECK_APPROVED`, `DUPLICATE_ACTION_ID`, `UNKNOWN_ACTION_ID`, `NOTHING_TO_UNDO`, `NOTE_REQUIRED`, `NOTE_TOO_LONG`, `RECORD_DECK_MISMATCH`, `INVALID_RESTORATION_RECORD`, `INPUT_TOO_LARGE`, `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`.
2. THE Restoration_Engine SHALL define one Abstention_Reason registry containing at least: `PRIOR_NOT_ENABLED`, `NO_STRUCTURAL_EVIDENCE`, `INSUFFICIENT_SUPPORT`, `CONFLICTING_EVIDENCE`, `DEGENERATE_PATTERN`, `REGION_TOO_LARGE`, `NO_NEIGHBOURING_INFORMATION`, `PROTECTED_CELL` and `IMAGE_EVIDENCE_CONTRADICTS`, each with a stable message and a structured values object.
3. THE Restoration_Engine SHALL keep each code's meaning unchanged across minor interface versions, and SHALL NOT extend the domain `ErrorCode` union.
4. THE Restoration_Engine SHALL document all codes in `docs/restoration-errors.md` and SHALL provide a test that fails when a registry and that document differ.
5. THE Restoration_Engine SHALL provide at least one example test per Restoration_Error_Code and per Abstention_Reason that triggers it.
6. WHEN a function returns an error, THE Restoration_Engine SHALL return the domain `Result` shape with `ok`, `error.code`, `error.message` and, where relevant, `error.path`.

### Requirement 23: Interfaces for later specs and module boundaries

**User Story:** As the author of the UI and benchmark specs, I want a stable, documented interface from restoration, so that those specs can be built in parallel.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL export, from one index module in `src/restore`, the types and functions named in this document, each function documented with its Restoration_Error_Code results, and SHALL record an interface version constant.
2. THE Restoration_Engine SHALL provide to the UI spec: a restoration run function, the Review_Service operations of requirement 15 to 17, the Evidence_View and Confidence_Heatmap_Data builders, the derived Restoration_State accessors for cell, region and deck, the unresolved-item list that blocks approval, the Calibration_Status markers, the Prior_Gate state, the Synthetic_Prior_Enablement operations and the Synthetic_Prior_Warning flag and text, the verification markers, the error and abstention messages, and the serialisers.
3. THE Restoration_Engine SHALL provide to the benchmark spec: a pure restoration function usable without a worker and without the UI, the configuration schema with defaults, the masking contract of requirement 19.7, the Hypotheses and Abstentions with raw and calibrated confidence for every region, and the Prior_Measurement and Calibration_Record schemas.
4. THE Restoration_Engine SHALL treat a change to an exported signature after design approval as requiring a spec update.
5. THE Restoration_Engine SHALL import from `src/domain` only through its public index, SHALL NOT define a type that duplicates a domain type, and SHALL consume detection output through its own input types, which `CardDetectionRecord` satisfies.
6. THE Restoration_Engine SHALL provide an import-boundary test that fails when a file in `src/restore` imports from `src/ui`, `src/benchmark` or `src/workers`, or when a file in `src/domain` imports from `src/restore`.
7. THE Restoration_Engine SHALL provide a test that fails when a file in `src/restore` uses `document`, `window`, `fetch`, `Date`, `Math.random`, `performance.now`, `setTimeout` or `setInterval` in a code path that produces a Hypothesis, a Deck or a record.
8. WHERE the Restoration_Engine runs in a Web Worker, THE worker adapter SHALL exchange only typed, versioned, structured-cloneable messages, and SHALL contain no inference logic.

### Requirement 24: Evaluation and reporting support

**User Story:** As a judge or researcher, I want restoration quality reported only from recorded runs on separated synthetic and real data, so that no number is overstated.

#### Acceptance Criteria

1. THE Restoration_Engine SHALL provide, for the benchmark spec, per-region outputs sufficient to compute held-out damaged-cell accuracy, calibration error, abstention rate and whole-card recovery rate, each with benchmark version, seed, Benchmark_Split_Role and sample size. Restoration SHALL compute no official `held-out` or `test` metric itself, and the benchmark runner is the only producer of those metrics.
2. THE Restoration_Engine SHALL count an Abstention as not-correct in an accuracy over all targets, and SHALL report the accuracy over answered targets separately with its coverage.
3. THE Restoration_Engine SHALL report synthetic and real evaluations in separate documents or sections, SHALL NOT pool their numbers, and SHALL NOT tune any parameter or calibration on the `held-out` or `test` role.
4. THE Restoration_Engine SHALL NOT quote an accuracy, frequency, reliability or calibration number in the application, the README or documentation that is absent from a recorded run.
5. WHERE a real card photograph or a real deck is used for evaluation, THE Restoration_Engine SHALL record its source and licence in the `data` README and SHALL check the Garín5 dataset terms (assumption A10) before any redistribution.
6. THE Restoration_Engine SHALL leave accuracy targets and damage-level definitions to the `src/benchmark` spec and SHALL fix no target in this document.

### Requirement 25: Correctness properties and test determinism

**User Story:** As a maintainer, I want property-based tests with deterministic seeds, so that invariants hold and any failure is reproducible.

#### Acceptance Criteria

1. THE Restoration_Engine test suite SHALL run every fast-check property with an explicit, distinct seed constant from a block starting at 20260500 (golden tests 20260600) and a bounded `numRuns` of at most 500, and SHALL print the seed and the shrunk counterexample on failure.
2. THE Restoration_Engine test suite SHALL state in a comment beside each property its generator precondition, for example "for any valid deck of 3 to 12 cards under a generated profile with at most 20% of cells masked".
3. THE Restoration_Engine test suite SHALL use no `Math.random`, `Date.now` or network access, and SHALL build every damaged deck by applying a seeded masking function to a valid deck so that the ground truth is known to the test and unreachable by the Inference_Engine.
4. THE Restoration_Engine test suite SHALL include an unchanged-deck property that, FOR ALL valid Decks in which every cell has an effective value, a restoration run produces no Hypothesis, an unchanged Deck and no state other than `detected`.
5. THE Restoration_Engine test suite SHALL include a raw-preservation property that, FOR ALL valid Decks and all sequences of up to 20 Restoration_Engine operations, every Raw_Observation of the Deck equals its value before the sequence and equals its copy in the Restoration_Record.
6. THE Restoration_Engine test suite SHALL include a bounds property that, FOR ALL runs, every numeric Hypothesis_Confidence and every confidence written to a Deck is finite and within [0, 1], every cell without a written Hypothesis keeps its Restoration_Confidence (including `null`) strictly unchanged, and no `null` is coerced to `0`.
7. THE Restoration_Engine test suite SHALL include an unknown-stays-unknown property that, FOR ALL Decks with Target_Cells for which no supported Hypothesis exists, those cells keep provenance `ambiguous` and no effective value through the run, a reject, and an approval attempt without a policy (which returns `UNRESOLVED_CELLS`).
8. THE Restoration_Engine test suite SHALL include an approval-exactness property that, FOR ALL sequences of Review_Actions ending in a successful approval, the effective value of every cell equals the observed value, or the accepted or selected Hypothesis value, or the user-edited value, or the policy value, and no unreviewed Hypothesis value is effective.
9. THE Restoration_Engine test suite SHALL include an undo property that, FOR ALL sequences of up to 20 Review_Actions and undos on a valid Deck, the Restoration_Record and the domain Edit_History never shrink, earlier entries stay equal, an undo of an `edit-cell` (through `undoEdit`) restores the prior effective value, provenance, Review_Outcome and Approval_State of its target in the Effective_View, an undo of an `accept-hypothesis` or `select-alternative` (through `withdrawInference`) restores the prior effective value or its absence, provenance, Restoration_Confidence (including `null`, never coerced to `0`) and evidence, and the Raw_Observation is unchanged by every path. Example tests SHALL cover a withdrawal blocked by an un-reversed user edit (`USER_EDIT_PROTECTED`), a second undo of the same acceptance (`NOTHING_TO_UNDO`), and an approved Deck that becomes `unapproved` after a withdrawal.
10. THE Restoration_Engine test suite SHALL include a recovery property that, FOR ALL synthetic decks constructed with a known Repeat_Period (or a known Symmetry_Axis), a non-degenerate bit density, at least the documented minimum number of repeats, and at most the documented fraction of cells masked, every masked cell covered by a Hypothesis is recovered with its true value in the top-ranked Hypothesis, under the conditions that design documents.
11. THE Restoration_Engine test suite SHALL include a structure-free property that, FOR ALL decks constructed so that no two cards agree above the Chance_Baseline margin at any candidate period and no axis passes the Evidence_Test, no `repeat-inferred` or `symmetry-inferred` Hypothesis is produced.
12. THE Restoration_Engine test suite SHALL include a gating property that, FOR ALL configurations with a Structural_Prior kind disabled or lacking a valid Prior_Measurement, no Hypothesis of that kind is produced, and enabling a kind without a valid Prior_Measurement returns `PRIOR_MEASUREMENT_MISSING`.
13. THE Restoration_Engine test suite SHALL include a leakage property that, FOR ALL decks built by masking a truth deck, the restoration output is deeply equal across two truth decks that differ only in the masked cells' true values, and a static test that no `src/restore` module imports a ground-truth, benchmark or damage module.
14. THE Restoration_Engine test suite SHALL include a determinism property that, FOR ALL inputs, two runs produce deeply equal Restoration_Records, byte-identical exported text, and deeply equal Decks, with the Opaque_Timestamp_Label excluded from the comparison.
15. THE Restoration_Engine test suite SHALL include a hypotheses property that, FOR ALL runs, each region has at most three Hypotheses ranked by non-increasing confidence, each Hypothesis has a non-empty explanation of at most 1,000 characters and at least one supporting evidence item, and no Hypothesis has provenance `observed`.
16. THE Restoration_Engine test suite SHALL include a protection property that, FOR ALL operation sequences, the effective value and provenance of each observed cell, each cell with an un-reversed user edit and each Applied_Override cell is unchanged by any Inference_Engine run, and an inferred write to such a cell returns `OBSERVED_CELL_PROTECTED`, `USER_EDIT_PROTECTED` or no write.
17. THE Restoration_Engine test suite SHALL include a state-machine property that, FOR ALL sequences of Review_Actions, only the transitions of requirement 14.9 occur, the derived Deck state agrees with the domain Approval_State, and a rejected action leaves the Deck and the Restoration_Record deeply equal to their earlier values.
18. THE Restoration_Engine test suite SHALL include a round-trip property that, FOR ALL valid Restoration_Records, Prior_Measurements and Calibration_Records, export, import and export yields identical text, and a corruption property that truncation at generated cut points returns `INVALID_JSON` and seeded single-byte corruption never returns a value that differs from the original without an error.
19. THE Restoration_Engine test suite SHALL include a metamorphic property that, FOR ALL decks with a supported repeat Hypothesis, changing one supporting Trusted_Cell to contradict the value does not increase the Hypothesis_Confidence of that value.
20. THE Restoration_Engine test suite SHALL include golden tests for a fixed small deck, covering the Restoration_Record export, the Evidence_View data and the Confidence_Heatmap_Data, committed in version control with a stated reason for any change.
21. THE Restoration_Engine test suite SHALL convert every shrunk counterexample into a permanent example test.
22. THE Restoration_Engine test suite SHALL include a synthetic-prior property that, FOR ALL Deck_Origin `real` decks with a Synthetic_Only_Prior enabled in the configuration: (a) without a recorded `enable-synthetic-prior` entry, the run returns `PRIOR_NOT_VALIDATED_FOR_REAL_DECKS` and produces no Hypothesis of that kind; (b) with the entry, every produced Hypothesis of that kind, its Evidence_View and its heatmap entries carry `syntheticPriorWarning` true, the fixed warning text and Calibration_Status `uncalibrated`; (c) after a `disable-synthetic-prior` entry, a later run produces no Hypothesis of that kind; and (d) the enabling and disabling entries have distinct Action_Ids and contiguous Sequence_Numbers. A permanent regression example test SHALL cover each of (a) to (c), and a further example SHALL show that a Deck_Origin `synthetic` run in a Synthetic_Evaluation_Context applies the prior with no warning.
23. THE Restoration_Engine test suite SHALL include an attestation-mismatch property that, FOR ALL decks of 3 to 12 cards with Deck_Origin `synthetic` and an attested card whose Detection_Evidence carries an `Image_Digest`, a `syntheticAttestations` entry whose `imageDigest` differs from that `Image_Digest`, or that lacks or empties any field, or has a non-integer `seed`, or a malformed digest, returns `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]` and the field, and produces no Hypothesis. It SHALL use a distinct seed constant from the block of criterion 1.
24. THE Restoration_Engine test suite SHALL include an attestation-misuse property that, FOR ALL decks, (a) with Deck_Origin `real` and any `syntheticAttestations` entry, (b) with an entry keyed by a `cardId` that is not in the deck, or (c) with an entry keyed by a card whose Detection_Evidence has no `Image_Digest`, returns `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]`.
25. THE Restoration_Engine test suite SHALL include these regression examples: (a) a Deck_Origin `synthetic` deck with image evidence on one card and no attestation returns `INVALID_CONFIGURATION` naming `syntheticAttestations[<cardId>]`; (b) a mixed deck of several context cards without Detection_Evidence plus one damaged card with image evidence and a matching attestation is valid; (c) a deck of two cards with image evidence, one attested and one not, returns `INVALID_CONFIGURATION` naming the unattested `cardId`; (d) the same mixed deck as (b) with Deck_Origin `real` and the attestation supplied returns `INVALID_CONFIGURATION`.
26. THE Restoration_Engine test suite SHALL include an attested-synthetic property that, FOR ALL decks with a known Repeat_Period, Deck_Origin `synthetic`, valid attestations for every card with an `Image_Digest` (including mixed decks where context cards have no image evidence) and a valid synthetic-scope Prior_Measurement, a run with the prior enabled and no `enable-synthetic-prior` entry produces Hypotheses with `syntheticPriorWarning` false, the Synthetic_Deck_Notice in each explanation, `deckOrigin` and the per-card attestation references in the record, Evidence_View and heatmap entries, and Calibration_Status `uncalibrated`. A run without the Prior_Measurement SHALL return `PRIOR_MEASUREMENT_MISSING`.
27. THE Restoration_Engine test suite SHALL include a real-deck-unchanged property that, FOR ALL Deck_Origin `real` decks, outputs and errors equal those required by criteria 3.14 to 3.19 of this document, so that the attestation mechanism changes nothing for real decks.
28. THE Restoration_Engine test suite SHALL extend the leakage property (criterion 13) and the determinism property (criterion 14) to attested synthetic runs: outputs are deeply equal across two truth decks that differ only in masked true values, and two runs give byte-identical records.

### Requirement 26: Tuning script, dataset format and role allow-list

**User Story:** As a researcher, I want the offline tuning script to read only the benchmark roles meant for tuning and calibration, so that no parameter or calibration is fitted on evaluation data.

#### Acceptance Criteria

1. THE Tuning_Script SHALL read files in the Minimal_Dataset_Format, and the benchmark spec SHALL write one file set per Benchmark_Split_Role in that format, so that no change to the format is required.
2. THE Tuning_Script SHALL accept only the Benchmark_Split_Role `tuning` for prior measurement and parameter selection, and only the Benchmark_Split_Role `calibration` for the calibration fit.
3. IF the Tuning_Script is given a file set of the Benchmark_Split_Role `held-out` or `test`, or a role name that is not one of the four Benchmark_Split_Roles, THEN THE Tuning_Script SHALL refuse it with an error that names the role and states that the role is not permitted for tuning or calibration, and SHALL read no cell of that file set.
4. IF the Tuning_Script is given a calibration file set that equals or overlaps the tuning file set, THEN THE Tuning_Script SHALL refuse it, consistent with requirement 10.6.
5. WHERE a Minimal_Dataset_Format file carries the optional fields `familyKey` or `splitRole`, THE Tuning_Script importer SHALL ignore those two fields and SHALL NOT reject the file because of them.
6. IF a Minimal_Dataset_Format file carries any field that is neither documented in the format nor one of the optional fields `familyKey` and `splitRole`, THEN THE Tuning_Script importer SHALL reject the file with error `UNKNOWN_FIELD` naming the path.
7. WHERE a file carries a `splitRole` field whose value differs from the role under which the Tuning_Script was given the file, THE Tuning_Script SHALL refuse the file and name both roles.
8. THE Restoration_Engine SHALL document in `docs/restoration-priors.md` the Minimal_Dataset_Format, the role allow-list of this requirement, and, for each Prior_Measurement and each Calibration_Record that the project records, the Benchmark_Split_Role or roles and the dataset version it used.
9. THE Restoration_Engine SHALL NOT quote a Prior_Measurement or Calibration_Record in any document unless `docs/restoration-priors.md` lists its roles and dataset version.

## Historical assumptions requiring verification

The following items are NOT verified against Rodas Lorente et al. (2025). The Restoration_Engine reads them from the Machine_Profile or from recorded configuration, carries a code comment `// UNVERIFIED <id>: see .kiro/steering/jacquard-card-format.md` where it depends on one, copies the verification markers into every record and Evidence_View, and shows the unverified status in the UI.

| ID | Item | Restoration dependence and handling | Affects |
|----|------|-------------------------------------|---------|
| R1 | Prevalence of row repetition across the card sequence in historical decks | Unknown. Repeat prior disabled by default. Enabled only after a recorded Prior_Measurement. Per-deck Evidence_Test required. Synthetic frequency is labelled a generator parameter. | Req 3, 4 |
| R2 | Prevalence of mirror symmetry in historical designs | Unknown. Same gating as R1. Per-deck Evidence_Test required. A7 states that designs need not be symmetric. | Req 3, 5 |
| R3 | Meaning of a card-sequence reflection (`card-sequence` axis) | Depends on A8 (card-to-pass mapping). Marked unverified on every symmetry and repeat Hypothesis. | Req 4, 5 |
| R4 | Meaning of a within-card partner mapping | Depends on A3 (axis), A4 (read order), A5 (threads-per-hook), A6 (mirror handling). Marked unverified. | Req 5 |
| R5 | Whether a Hole_Probability near the threshold can be combined with a structural candidate by a fixed rule | The combination rule is a design choice that measurement validates. | Req 6 |
| R6 | Hole polarity (A: hole means `lifted` or `down`) | Taken from the detection record (assumption D7 of detection). A wrong polarity inverts every Image_Evidence conversion. | Req 6 |
| A8 | Card-to-pass mapping | One card per pass in deck order. Repeated or skipped cards are not confirmed. | Req 1, 4, 5 |
| A10 | Licence and terms of the Garín5 dataset | Checked before any use as a measurement dataset that is bundled or redistributed. No dataset content is committed by this feature. | Req 3, 24 |

## Open questions requiring confirmation

- **[RESOLVED] Q1 Undoing an accepted inference.** Decision by the user: the domain amendment was made. The domain provides `withdrawInference` (domain requirement 5, criteria 26 to 33). Restoration reverses an accepted or selected inference by calling it (requirement 17.6). The call is append-only, preserves history, restores the earlier value or its absence, provenance, Restoration_Confidence (including `null`) and evidence, and appends an `unapproved` Approval_Record with cause `withdrawal` when the Deck was approved. Undo of a manual edit stays with `undoEdit`. No fallback that rebuilds the Deck projection is needed, and no `DOMAIN_AMENDMENT_REQUIRED` error exists.
- **[CONFIRM] Q2 When a Hypothesis is written to the Deck.** This document writes a Hypothesis to the Deck only after a user accepts or selects it (requirement 13.2), so rejected proposals never need withdrawal and an unreviewed proposal can never become effective by approval. The alternative is to write the top Hypothesis with `setInferred` at proposal time, which shows inferred cells in the domain SVG export but needs `withdrawInference` (Q1) for every rejection. Recommended: the acceptance-time write.
- **[CONFIRM] Q3 Timestamps in the audit trail (requirement 17).** The domain forbids wall-clock time. The audit trail uses Action_Id and Sequence_Number as the authoritative order. A caller may attach an Opaque_Timestamp_Label, an optional string that the caller reads from its own clock, that the library never parses, and that is excluded from equality and digests. Recommended default: support the optional label, limited to 64 characters. The alternative is to omit it and let the UI keep its own display time outside the record.
- **[CONFIRM] Q4 Multi-level undo of edits.** The domain `undoEdit` reverses only the latest un-reversed user edit of a cell, so a second undo on the same cell returns `NOTHING_TO_UNDO` until a new edit is made (domain open question Q4). Requirement 17.12 inherits that limit for `edit-cell`. Recommended: accept the limit for now and revisit if the UI needs deeper undo, which would amend the domain.
- **[RESOLVED] Q5 Use of prior measurements of scope `synthetic` only.** Decision by the user: a Synthetic_Only_Prior is disabled by default on Deck_Origin `real` decks. A user may enable it through an explicit, audited Synthetic_Prior_Enablement (requirement 3.14 to 3.17). While enabled, every dependent output carries the Synthetic_Prior_Warning and stays `uncalibrated` (3.18, 3.19). Without enablement the run returns `PRIOR_NOT_VALIDATED_FOR_REAL_DECKS` (3.15). Synthetic decks in a marked evaluation context may use such priors without the warning (3.20).
- **[CONFIRM] Q6 Import of detection types.** `structure.md` lists `ui -> restore, vision, benchmark -> domain` and does not list a `restore -> vision` edge. Requirement 23.5 consumes detection output through restoration's own input types, which `CardDetectionRecord` satisfies structurally, so no import is needed. The alternative is a type-only import from the `src/vision` index. Recommended: structural input types with no import from `src/vision`.
- **[CONFIRM] Q7 Offline measurement and calibration scripts.** Producing a Prior_Measurement and a Calibration_Record needs an offline script. `structure.md` has no `scripts` folder and `research` is Python-only by steering. The detection design raised the same point (its Q6). Recommended: decide once for both specs by updating `structure.md` before any new top-level folder is created.

- **[RESOLVED] Q8 Property seed block.** Decision by the user (plan amendment A0-6): the block starts at 20260500, golden tests at 20260600, matching the design and tasks (requirement 25.1).

- **[RESOLVED] Q9 Attestation granularity.** Decision by the user (plan Section 5.3 and finding C-18): attestations are per card. The input carries `syntheticAttestations`, a map from `cardId` to Synthetic_Image_Attestation, because Detection_Evidence is keyed by `cardId` and the demo deck holds several simulated intact context cards supplied as a bitmap (no image evidence, no attestation needed) plus one detected damaged card (attested). Requirements 3.21 to 3.26 and 25.23 to 25.28 apply per card.

## Non-functional bounds summary

- Fixed: at most 3 Hypotheses per region; explanation and note at most 1,000 characters; domain deck limit 10,000 cards.
- Configurable with design-set defaults: maximum cards per run, maximum Repeat_Period, Short_Region_Bound, maximum Target_Cells per run, evidence items per explanation, Review_Actions per record, record text size, Opaque_Timestamp_Label length.
- Thresholds (agreement, minimum comparable count, minimum support, Chance_Baseline margin, contradiction threshold, degenerate-density margin, whole-card minimum support): defined by design and validated on the benchmark `tuning` role. This document fixes none.
- Time and memory budgets: defined in design, validated by measurement. This document fixes none.
- Damage definitions, accuracy targets and calibration data sets: owned by the `src/benchmark` spec.

## Dependencies for later specs

- `ui` (spec 5): consumes the benchmark's `BrowserReport` for benchmark results and does not call restoration metric functions for benchmark purposes. It renders the Evidence_View and Confidence_Heatmap_Data, offers the review actions, shows the Restoration_State per cell, region and deck, shows the `uncalibrated` marker wherever a confidence is shown, shows the Prior_Gate state and the synthetic-only label, shows the Synthetic_Prior_Warning (flag and fixed text) on every affected Hypothesis, view and heatmap cell and at deck level while a Synthetic_Prior_Enablement is in effect, offers the explicit enable and disable actions with a required note, attaches a Synthetic_Image_Attestation, per card in `syntheticAttestations`, only for bundled assets whose digests match its committed manifest and never for uploaded files (uploads are always Deck_Origin `real`), and supplies no attestation for simulated intact context cards that carry no image evidence, shows a persistent "Simulated demo card" badge and the Synthetic_Deck_Notice for attested synthetic decks, shows `null` as "not evaluated", shows Applied_Overrides and Pending_Corrections as blocking items, owns timers and any display time, and supplies the optional Opaque_Timestamp_Label if Q3 is confirmed.
- `benchmark` (spec 4): supplies damage definitions, masking fractions, accuracy targets, the datasets and Benchmark_Split_Roles for Prior_Measurements and Calibration_Records, one Minimal_Dataset_Format file set per role, and the evaluation of restoration with the masking contract of requirement 19.7. It consumes restoration through the `src/restore` public index only (the restoration run function, the Calibration_Record and Prior_Measurement formats, and the RestorationInput masking contract) and supplies no ground truth to inference. It builds the `syntheticAttestations` map, one Synthetic_Image_Attestation per card with a generated image, from its dataset manifest. It is the only producer of official `held-out` and `test` metrics. `src/restore` never imports it.
- `domain` (spec 1): already amended with `withdrawInference`, `NOTHING_TO_WITHDRAW` and the Live_Entry rules (Q1 resolved). Restoration uses `undoEdit` for manual edits and `withdrawInference` for accepted inferences. A further domain amendment is needed only if a deeper edit undo (Q4) is chosen.
- `card-detection` (spec 2): supplies `CardDetectionRecord`, polarity, `userConditionOverrides`, `notApplied` and `assistantEvidence` as specified. The restoration spec requires no change to the detection contract.

## Amendment record

Targeted amendment, approved by the user, to align this document with benchmark-and-evaluation requirements 8, 10 and 15 and its design "Amendments to earlier specs" items 2 and 4. Numbering of existing requirements is unchanged.

- Glossary: added Benchmark_Split_Role, Tuning_Script and Minimal_Dataset_Format.
- Introduction and Non-functional bounds: validation of design-set thresholds now names the `tuning` role. Official held-out and test metrics come only from the benchmark runner. The spec order is now domain, detection, restoration, benchmark, UI.
- Requirement 3.4: Prior_Measurement records the dataset version and the Benchmark_Split_Role (`tuning` or `calibration`) in place of a generic split.
- Requirement 10.5, 10.6, 10.10 and the user story: Calibration_Record names the `calibration` and `tuning` roles and the dataset version, and ECE is reported only from a role the fit did not read.
- Requirement 24.1 and 24.3: restoration computes no official `held-out` or `test` metric and never tunes on those roles.
- New requirement 26: role allow-list of the Tuning_Script (`tuning`, `calibration` only, `held-out` and `test` refused by name), unchanged Minimal_Dataset_Format, the rule for unrecognised extra fields (only `familyKey` and `splitRole` ignored, anything else `UNKNOWN_FIELD`), and the content of `docs/restoration-priors.md`.
- Dependencies for later specs: benchmark is spec 4 and UI is spec 5. The UI consumes the benchmark `BrowserReport`. The benchmark consumes restoration through the public index only and supplies no ground truth to inference.
- Not changed: requirement 25.1 (seed block start 20260400 against the design's 20260500). This remains a pending user confirmation. Open question Q7 (location of offline scripts) is also unchanged.

Reason (first amendment): the benchmark spec introduced four Split_Roles and a sealed `test` role, which replace the earlier seed-block and generic tuning/calibration/held-out wording.

### Second amendment (plan amendments A0-4 and A0-6, approved by the user)

- Glossary: clarified Deck_Origin and added Synthetic_Image_Attestation and Synthetic_Deck_Notice.
- Requirement 3.21: first clause kept. The second clause now requires a matching Synthetic_Image_Attestation for a `synthetic` deck with an `Image_Digest`, and otherwise returns `INVALID_CONFIGURATION` naming `syntheticAttestation`. Synthetic data is never marked `real` to pass validation.
- New requirements 3.22 to 3.26: attestation validity, rejection on real decks or decks without an `Image_Digest`, prior use without enablement and without the real-deck warning, recording of `deckOrigin`, attestation reference and notice, and the unverified-declaration record. No new error code.
- Requirement 17.6c: `reviewed` after a withdrawal is a transient transition. The derived Deck state follows 14.7.
- Requirement 25.1: seed block starts at 20260500 (golden 20260600). New criteria 25.23 to 25.28 cover the attestation. Q8 is resolved.
- Dependencies for later specs: the benchmark builds the attestation from its manifest. The Workbench attaches one only for bundled assets with matching digests, never for uploads.
- Not changed: requirement numbering, `design.md` and `tasks.md`. Those documents need a follow-up update.

### Third amendment (open question Q9, plan finding C-18, approved by the user)

- Glossary: Deck_Origin and Synthetic_Image_Attestation now work per card. Added `syntheticAttestations`, the map from `cardId` to attestation.
- Requirement 1.1: input includes the optional `syntheticAttestations` map.
- Requirement 3.21 (second clause): a `synthetic` deck is rejected when any card with an `Image_Digest` lacks a matching attestation, naming `syntheticAttestations[<cardId>]`. Cards without image evidence need no attestation.
- Requirements 3.22 and 3.23: validity is per entry. An entry keyed by a card that is not in the deck or has no `Image_Digest` is rejected. Any entry with Deck_Origin `real` is rejected. Errors name `syntheticAttestations[<cardId>]`.
- Requirements 3.24 to 3.26: apply per card. Records carry per-card attestation references. No new error code.
- Requirements 25.23 to 25.26: rewritten per card, with a mixed-deck valid case (context cards plus one attested damaged card) and a rejected case (one attested and one unattested image card).
- Dependencies for later specs: the benchmark and the Workbench build or attach attestations per card.
- Q9 marked resolved. `design.md` and `tasks.md` are not changed here and need a follow-up update.

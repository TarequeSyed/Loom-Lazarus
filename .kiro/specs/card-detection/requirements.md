# Requirements Document

## Introduction

This feature delivers the Card_Detector: a browser-side pipeline in `src/vision`, with its worker entry point in `src/workers`, that converts one photograph of a supported punched card into structured, explainable observations. For each readable position it reports a hole probability in [0, 1], a condition (`observed`, `ambiguous` or `unknown`) and diagnostics. It also reports card geometry, quality problems and unknown regions. It does not infer missing instructions; that belongs to the restoration spec.

The Card_Detector builds on the approved `card-domain-and-loom-engine` contract and reuses its types by name without redefining them: `MachineProfile`, `VerificationStatus`, `Card`, `Cell`, `CellSeed`, `RawObservation`, `Evidence`, `EvidenceRef`, `Provenance`, `GridPosition`, `ReadIndex`, `Result` and `DomainError`. Detection output must map into domain `CellSeed` and `RawObservation` values without loss. `src/vision` may import `src/domain`. `src/domain` never imports `src/vision`.

**Verification status of the card format.** The Garín format values in `jacquard-card-format.md` are NOT verified against Rodas Lorente et al. (2025), https://doi.org/10.1007/s11042-025-20917-9. Some wording elsewhere may call the Garín profile "verified"; it is not. The reserved-position location is a geometric inference. Card orientation, end-hole placement, physical dimensions and hole size are unverified. The Card_Detector therefore takes the `MachineProfile` as input data, hard-codes no Garín value, copies the profile's verification markers into every output, and lists its dependence on unverified items in the section "Historical and geometric assumptions requiring verification".

**Scope boundaries.**
- In scope: image intake and validation, deterministic preprocessing, card and end-hole detection, grid estimation, per-cell hole probability, quality diagnostics, manual geometry correction (which re-runs detection), a cell-level correction layer (which does not), worker protocol, derived-artifact provenance, an optional replaceable assistance interface, and measured evaluation on synthetic and real images reported separately.
- Out of scope: multi-card strip segmentation (diagnosed and rejected only), restoration of missing instructions, historical colour inference, physical loom control, server-side processing or storage of photos, and a trained custom neural network unless later justified by data and time in a separate decision.

**Two classes of manual correction.** A Geometry_Correction changes how the image is interpreted (corners, reference holes and end-hole locations, orientation, polarity, parameters, profile selection). It invalidates the geometry and triggers re-detection from the Original_Image. A Cell_Correction changes the value or condition of one or more cells. It never triggers detection. It is an append-only, auditable layer over an unchanged Detection_Result. Cell_Corrections survive re-detection: they are keyed by `readIndex`, reconciled against the new result, and flagged for user review when they no longer match the new geometry (requirement 12).

**Configurable defaults and deferred numbers.** The intake limits are starting constraints, not scientifically established requirements, and they are configurable. Numeric detection thresholds, performance budgets, cross-environment tolerances, damage-level definitions, occlusion fractions and accuracy targets are not fixed in this document. Design and empirical testing define the first three groups and validate them. The `src/benchmark` specification owns the damage-level definitions, the Occlusion_Cover_Fraction and accuracy targets, and publishes them as the Damage_Level_File that detection reads as data.

**Honesty rules carried from the product steering.** Accuracy numbers are quoted only from a recorded run. Hole probability (how likely a hole is present in the image) is a different quantity from restoration correctness (how likely an effective value is right). Unknown or unreadable evidence is never classified as an absent hole. Raw evidence is never overwritten.

## Glossary

- **Card_Detector**: The `src/vision` pipeline specified by this document, as a whole.
- **Detection_Worker**: The Web Worker entry point in `src/workers` that runs the Card_Detector off the UI thread.
- **Detection_Client**: The main-thread component that posts messages to the Detection_Worker and receives its replies. It contains no image processing.
- **Image_Validator**: The component that checks an Input_Image against the Intake_Limits.
- **Preprocessor**: The component that applies resizing, illumination correction, noise reduction and perspective correction.
- **Geometry_Estimator**: The component that finds the Card_Quadrilateral, the End_Holes and the card orientation.
- **Grid_Estimator**: The component that fits the Machine_Profile grid to the rectified image and produces one Cell_Window per grid position.
- **Hole_Classifier**: The component that computes Hole_Probability and Condition for each Readable_Position.
- **Quality_Analyzer**: The component that produces Quality_Findings and Unknown_Regions.
- **Manual_Correction_Service**: The component that validates Manual_Corrections, records the Correction_Log, reconciles Cell_Corrections against a new Detection_Result and computes the Correction_Layer. It does not run detection.
- **Observation_Mapper**: The component that converts a Detection_Result into domain `CellSeed` values and `Evidence`, applies the value corrections of the Correction_Layer through the domain edit operation, and lists the condition corrections of the Correction_Layer as user condition overrides in the card-level detection record without writing them into the domain Card.
- **Detection_Assistant**: An optional, replaceable interface through which a vision model may propose evidence.
- **Image_Backend**: The internal interface that provides the image primitives the pipeline uses (for example thresholding, morphology, connected components, warping). OpenCV.js is the planned implementation. A hand-written canvas implementation is a permitted alternative (see requirement 17).
- **Machine_Profile**: The domain `MachineProfile` value supplied as input. Includes its per-field `VerificationStatus`.
- **Input_Image**: The bytes of one uploaded or bundled image file, exactly as supplied.
- **Image_Digest**: A deterministic content digest of the Input_Image bytes. The algorithm name is recorded next to the value.
- **Original_Image**: The Input_Image as retained unchanged by the caller. Never mutated.
- **Derived_Artifact**: Any image or data produced from the Original_Image by a pipeline step (for example the rectified image). Carries an Artifact_Provenance.
- **Artifact_Provenance**: A record of the producing step, its parameter values, the Implementation_Stamp and the Image_Digest of the input.
- **Implementation_Stamp**: The Card_Detector version string, the Image_Backend name and version (including the OpenCV.js version and build identifier when used), and the Detection_Result schema version.
- **Detection_Parameters**: The complete, versioned set of parameter values for one run, including every threshold, kernel size, resize target, seed and orientation setting.
- **Intake_Limits**: Configurable Detection_Parameters with these defaults: maximum file size 20 MiB (20,971,520 bytes), maximum 8,192 pixels per side and 33,554,432 pixels in total, minimum 800 pixels on the longer side and 200 pixels on the shorter side. Supported formats PNG, JPEG and WebP. The defaults are reasonable starting constraints, not scientifically established requirements (see requirement 1).
- **Card_Quadrilateral**: The four corner points of the card in Image_Coordinates, ordered clockwise as displayed.
- **End_Holes**: The two larger holes at the ends of the card that the Machine_Profile declares (domain `endHoles`). They are not part of the instruction grid.
- **Image_Coordinates**: Pixel positions `(imageX, imageY)` in the Original_Image, origin at the top-left, y increasing downward. A fifth coordinate system, distinct from the four domain systems (grid, physical, read order, fabric).
- **Rectified_Coordinates**: Pixel positions `(rectX, rectY)` in the Rectified_Image after perspective correction.
- **Rectified_Image**: The Derived_Artifact in which the Card_Quadrilateral is mapped to an axis-aligned rectangle.
- **Orientation**: One of four rotations (0, 90, 180, 270 degrees clockwise) that maps the displayed card onto the Machine_Profile grid axes.
- **Cell_Window**: The region of the Rectified_Image assigned to one Grid_Position, with its Rectified_Coordinates polygon and its Image_Coordinates polygon.
- **Readable_Position**: A domain Readable_Position: a Grid_Position that is not reserved under the Machine_Profile.
- **Reserved_Position**: A domain Reserved_Position of the Machine_Profile. Never produces a readable instruction.
- **Hole_Probability**: The estimate in [0, 1] that a hole is present at a Readable_Position in the image. Maps to domain `holeLikelihood`. Not a restoration correctness estimate.
- **Condition**: One of `observed`, `ambiguous` or `unknown` for one Readable_Position (see requirement 8).
- **Hole_Polarity_Assumption**: A configurable field (in the Machine_Profile or the Detection_Parameters) that states how a hole observation maps to a domain Bit. The explicit default is `hole-is-lifted`: a hole present means `lifted` (Bit 1) and no hole means `down` (Bit 0). The default is an unverified assumption (see assumptions table, item D7), and the other value is `hole-is-down`.
- **Cell_Evidence**: The per-position record of raw image evidence (patch reference and statistics), features, thresholds, step identifiers, Hole_Probability, Condition and Cell_Diagnostics.
- **Patch_Reference**: A reference to the pixel region of a Cell_Window in the Original_Image and in the Rectified_Image, by coordinates and Image_Digest, plus summary statistics. It never replaces the pixels.
- **Cell_Diagnostics**: Human-readable explanation plus structured values (features, thresholds, deciding step) for one position's Condition and Hole_Probability.
- **Quality_Finding**: A diagnostic with a kind (`stain`, `tear`, `cord`, `patch`, `shadow`, `perspective-distortion`, `glare`, `blur`, `low-contrast` or `other`), a severity, a numeric score in [0, 1], a polygon in Image_Coordinates, the affected `readIndex` values, the detecting method and a statement that the finding is heuristic.
- **Severity**: One of `low`, `medium` or `high`, derived from the finding score by documented thresholds.
- **Unknown_Region**: A polygon in Image_Coordinates where the image does not support any hole presence judgement, with a reason and the affected `readIndex` values.
- **Alignment_Status**: One of `aligned`, `aligned-with-warnings`, `failed` or `orientation-unresolved`.
- **Detection_Result**: The complete versioned output of one run: Implementation_Stamp, Detection_Parameters, Image_Digest, intake report, Preprocessing_Report, geometry, grid, Cell_Evidence for every Readable_Position, Reserved_Position records, Quality_Findings, Unknown_Regions, Alignment_Status, Derived_Artifact descriptors, the effective Geometry_Corrections, Assistant_Evidence and the Machine_Profile verification markers.
- **Preprocessing_Report**: The per-step record of the Preprocessor: step name, parameters, input and output sizes, and summary statistics.
- **Manual_Correction**: A user-supplied Correction_Log entry of one of two classes, Geometry_Correction or Cell_Correction, with an Action_Id and a Sequence_Number.
- **Geometry_Correction**: A Manual_Correction that changes image interpretation: card corners, Reference_Holes (including End_Hole locations), Orientation, polarity, a Detection_Parameters override or the Machine_Profile selection. It triggers re-detection from the Original_Image.
- **Cell_Correction**: A Manual_Correction that sets the value (hole present or absent) or the Condition (`ambiguous` or `unknown`) of one or more cells identified by `readIndex`. It never triggers detection.
- **Correction_Layer**: The set of applied Cell_Corrections, computed from the Correction_Log and the current Detection_Result. It is kept beside the Detection_Result and never written into it.
- **Evidence_Snapshot**: The record, stored in a Cell_Correction, of the targeted position's Condition, Hole_Probability, proposed raw value, Patch_Reference and Cell_Evidence feature values at the time of the correction.
- **Geometry_Fingerprint**: The Orientation, polarity, Machine_Profile identifier, grid size, `readableCount` and fitted grid parameters (pitch and offsets) of the Detection_Result that a Cell_Correction was made against.
- **Correction_Review_State**: One of `carried` (the Cell_Correction still matches the new Detection_Result and is applied) or `needs-review` (it does not match, is not applied and waits for the user).
- **Review_Resolution**: A Correction_Log entry of kind `confirm-cell-correction` or `discard-cell-correction` that references a Cell_Correction in state `needs-review`.
- **Reference_Hole**: A user-marked point in Image_Coordinates that the user identifies either as one of the End_Holes or as a named Grid_Position hole.
- **Correction_Log**: The append-only list of Manual_Corrections of both classes, Correction_Undo_Entries and Review_Resolutions for one Original_Image. Entries are never removed or modified.
- **Correction_Undo_Entry**: A Correction_Log entry that reverses an earlier Manual_Correction or Review_Resolution by reference to its Action_Id.
- **Action_Id**: A caller-supplied string identifying one recorded action, unique within the Correction_Log. Never generated from time or randomness.
- **Sequence_Number**: A positive integer assigned by the Manual_Correction_Service, increasing by exactly 1 per Correction_Log entry. Replaces any wall-clock timestamp.
- **Worker_Message**: A typed, versioned, structured-cloneable message exchanged between the Detection_Client and the Detection_Worker.
- **Protocol_Version**: An integer `protocolVersion` present on every Worker_Message.
- **Run_Id**: A caller-supplied string identifying one detection run in Worker_Messages.
- **Assistant_Evidence**: A record produced by a Detection_Assistant carrying the model identifier, model version, a label that it is model-generated, a proposal, a confidence in [0, 1] and an explanation.
- **Synthetic_Benchmark**: Evaluation on generated images with known ground truth. Reported separately from the Real_Image_Evaluation.
- **Damage_Level_File**: The file `data/synthetic/damage-levels.json`, defined by `benchmark-and-evaluation` requirement 7 and read by detection as data. It holds the damage levels, the Occlusion_Cover_Fraction and the per-level `occlusionCoverage` extent.
- **Occlusion_Cover_Fraction**: A per-Cell_Window coverage fraction in the Damage_Level_File (initial value 0.9, `initial-unconfirmed` until benchmark experiment E-2). It is the minimum share of one Cell_Window that an occluder must cover before detection must not report that cell as an observed absent hole. It is not a share of all cells that are occluded.
- **Split_Role**: One of `tuning`, `calibration`, `held-out` or `test`, as defined by `benchmark-and-evaluation` requirement 10.
- **Dataset_Manifest**: The benchmark file that lists every Deck_Family, Item, Split_Role and artifact of one dataset, as defined by `benchmark-and-evaluation`.
- **Real_Image_Evaluation**: Evaluation on real historical or physical card photographs. Small and qualitative unless stated otherwise. Never merged with Synthetic_Benchmark numbers.
- **Result**: The domain `Result` discriminated union. Expected failures never throw.
- **Vision_Error_Code**: A code in the Card_Detector error registry (requirement 16). The registry is separate from the domain `ErrorCode` registry, and it uses the domain `Result` and `DomainError` shapes. The domain registry is not extended by this feature.

## Requirements

### Requirement 1: Image intake and validation

**User Story:** As an archivist, I want the system to accept one card photograph and reject unsuitable files with a clear reason, so that I never get silent garbage from a wrong input.

#### Acceptance Criteria

1. WHEN an Input_Image is submitted, THE Image_Validator SHALL accept it only if its file size is at most 20 MiB, its width and height are each at most 8,192 pixels, its total pixel count is at most 33,554,432, its longer side is at least 800 pixels and its shorter side is at least 200 pixels. These limits are reasonable starting constraints chosen for browser memory and usable resolution. They are not scientifically established requirements. THE Card_Detector SHALL expose each of them as a Detection_Parameter with the stated value as its default, SHALL allow a caller to change it within documented bounds without a code change, and SHALL record the limits that applied in the intake report.
2. THE Image_Validator SHALL identify the image format from the file bytes and not from the file name, and SHALL accept PNG, JPEG and WebP.
3. IF the file size exceeds the limit, THEN THE Image_Validator SHALL return error `IMAGE_TOO_LARGE_BYTES` before decoding.
4. IF the format is not PNG, JPEG or WebP, THEN THE Image_Validator SHALL return error `UNSUPPORTED_IMAGE_FORMAT` naming the detected format or `unknown`.
5. IF the bytes cannot be decoded, including truncated or corrupted files, THEN THE Image_Validator SHALL return error `IMAGE_DECODE_FAILED` and SHALL return no partial image.
6. IF the decoded dimensions exceed the pixel limits, THEN THE Image_Validator SHALL return error `IMAGE_TOO_LARGE_PIXELS`, and IF they fall below the minimum, THEN THE Image_Validator SHALL return error `IMAGE_TOO_SMALL`, in both cases stating the supplied and permitted values.
7. IF the file contains more than one frame (for example an animated image), THEN THE Image_Validator SHALL return error `MULTI_FRAME_IMAGE`.
8. WHEN an image carries an EXIF orientation tag, THE Image_Validator SHALL apply it once during decoding and SHALL record the tag value and the applied rotation in the intake report.
9. WHEN an image has an alpha channel, THE Image_Validator SHALL flatten it onto white and SHALL record the flattening in the intake report.
10. THE Image_Validator SHALL compute the Image_Digest of the Input_Image bytes and SHALL record the algorithm name with it.
11. IF the Image_Validator rejects an image, THEN THE Card_Detector SHALL return no Detection_Result and SHALL leave the Input_Image unchanged.

### Requirement 2: Single-card input and multi-card rejection

**User Story:** As a user, I want a photo of several cards or a strip to be diagnosed and refused, so that the system does not mix up cards.

#### Acceptance Criteria

1. THE Card_Detector SHALL process exactly one card per run.
2. WHEN the Geometry_Estimator finds more than one card-like quadrilateral whose area is at least 25% of the largest one, THE Card_Detector SHALL return error `MULTIPLE_CARDS_SUSPECTED` with the polygons of the candidates and SHALL return no per-cell observations.
3. WHEN the largest card-like quadrilateral has an aspect ratio that differs from the Machine_Profile grid aspect ratio by more than the configured tolerance and touches the image border on both ends of its long side, THE Card_Detector SHALL report a Quality_Finding of kind `other` stating that the input may be a strip or a crop, and SHALL set Alignment_Status `failed` unless the user supplies a Geometry_Correction.
4. THE Card_Detector SHALL document that strip segmentation is out of scope, and SHALL NOT attempt to split a multi-card image.
5. THE Card_Detector SHALL expose the aspect ratio tolerance and the 25% area ratio as Detection_Parameters.

### Requirement 3: Preprocessing

**User Story:** As a researcher, I want each preprocessing step to be parameterised, deterministic and reported, so that I can see exactly what was done to the image.

#### Acceptance Criteria

1. THE Preprocessor SHALL apply, in this order: resizing to a working resolution, illumination correction, noise reduction, and perspective correction (after geometry estimation).
2. THE Preprocessor SHALL take every step's parameters from the Detection_Parameters, and SHALL include in the Detection_Parameters a boolean that disables each of illumination correction and noise reduction.
3. WHERE resizing is enabled, THE Preprocessor SHALL scale the Original_Image so that its longer side equals the configured working size (default 2,048 pixels), SHALL NOT upscale beyond the Original_Image size, and SHALL record the scale factor in the Preprocessing_Report.
4. THE Preprocessor SHALL implement illumination correction by a documented method (for example background estimation by large-kernel blur or morphological closing, followed by division or subtraction) and SHALL record the method name and kernel size.
5. THE Preprocessor SHALL implement noise reduction by a documented method and SHALL record the method name and kernel size.
6. THE Preprocessor SHALL perform perspective correction by a homography computed from the Card_Quadrilateral, and SHALL record the homography matrix, the source quadrilateral and the output size.
7. THE Preprocessor SHALL report, for each step, its name, parameter values, input size, output size and the mean and standard deviation of the output intensity, in the Preprocessing_Report.
8. THE Preprocessor SHALL return identical output for identical input bytes, Detection_Parameters and Implementation_Stamp.
9. THE Preprocessor SHALL NOT modify the Original_Image, and SHALL return every processed image as a Derived_Artifact with an Artifact_Provenance.
10. IF a Detection_Parameters value is outside its documented range, THEN THE Card_Detector SHALL return error `INVALID_PARAMETERS` naming the parameter and its permitted range before any image processing starts.
11. WHEN perspective correction is applied, THE Quality_Analyzer SHALL report the applied distortion as a Quality_Finding of kind `perspective-distortion` with a score computed from the homography (requirement 9) and SHALL NOT present the correction as an unreported fix.

### Requirement 4: Card and end-hole detection

**User Story:** As an archivist, I want the card outline and end holes located where they are visible, so that the grid can be anchored to the card.

#### Acceptance Criteria

1. THE Geometry_Estimator SHALL estimate the Card_Quadrilateral in Image_Coordinates by a documented method (for example thresholding, largest contour and polygon approximation) and SHALL report its corner points, an area, and a corner-confidence value in [0, 1] for each corner.
2. WHERE the Machine_Profile declares End_Holes, THE Geometry_Estimator SHALL search for two large, roughly circular holes near the two short ends of the card, using size and position relations taken from the Machine_Profile when it declares them and from documented Detection_Parameters when it does not.
3. THE Geometry_Estimator SHALL report each detected End_Hole with centre, radius in Image_Coordinates, a detection score in [0, 1] and the deciding feature values.
4. IF an End_Hole is not found, THEN THE Geometry_Estimator SHALL report it as `not-found` with the reason, SHALL NOT invent a position, and SHALL include a Quality_Finding of kind `other` naming the missing End_Hole.
5. THE Geometry_Estimator SHALL determine Orientation only from evidence that distinguishes the four rotations (for example end-hole placement or an asymmetry declared by the Machine_Profile), and SHALL report the Orientation evidence and an orientation score in [0, 1].
6. IF the evidence supports more than one Orientation with scores that differ by less than a configured margin, or the Machine_Profile marks the relevant field `unverified` and the caller supplied no Orientation, THEN THE Card_Detector SHALL set Alignment_Status `orientation-unresolved`, SHALL return no Readable_Position observations, and SHALL return the candidate Orientations with their scores and previews as Derived_Artifacts.
7. WHERE the caller supplies an Orientation in the Detection_Parameters or in a Geometry_Correction, THE Geometry_Estimator SHALL use it and SHALL record that the Orientation was user-supplied.
8. THE Geometry_Estimator SHALL NOT flip, mirror or rotate the card silently; every rotation applied SHALL appear in the Detection_Result.
9. IF the Card_Quadrilateral cannot be estimated, THEN THE Card_Detector SHALL set Alignment_Status `failed`, SHALL return failure diagnostics (requirement 11) and SHALL offer the manual Geometry_Correction fallback (requirement 12).
10. THE Geometry_Estimator SHALL treat the physical dimensions of the Machine_Profile as optional, and WHERE they are absent it SHALL work in pixels and the Card_Quadrilateral aspect ratio only, and SHALL NOT derive a millimetre scale from grid counts.

### Requirement 5: Grid estimation from the Machine_Profile

**User Story:** As a researcher, I want the grid fitted from the supplied profile rather than from hard-coded numbers, so that a profile correction needs no code change.

#### Acceptance Criteria

1. THE Grid_Estimator SHALL take `gridRows`, `gridColumns`, `reservedPositions`, `readOrder` and the verification markers only from the supplied Machine_Profile.
2. THE Grid_Estimator SHALL produce, for every Grid_Position of the Machine_Profile, one Cell_Window with its polygon in Rectified_Coordinates and in Image_Coordinates.
3. THE Grid_Estimator SHALL fit the grid to the Rectified_Image by a documented method (for example row and column projection profiles refined by detected hole centres) and SHALL report the fitted row pitch, column pitch, offsets and a grid-fit score in [0, 1] together with the residual of the fit in pixels.
4. WHEN the Grid_Estimator maps a Grid_Position to its `readIndex`, THE Grid_Estimator SHALL use the domain `gridToReadIndex` function and SHALL NOT re-implement the read order.
5. IF the grid-fit score is below a configured threshold, THEN THE Card_Detector SHALL set Alignment_Status `failed` and SHALL return failure diagnostics (requirement 11), and SHALL NOT return Readable_Position observations derived from the poor fit.
6. IF the grid-fit score is at least the threshold and below a second, higher configured threshold, THEN THE Card_Detector SHALL set Alignment_Status `aligned-with-warnings` and SHALL attach the grid-fit score to every Cell_Evidence.
7. WHERE the Machine_Profile is replaced by another valid profile with a different grid size, THE Card_Detector SHALL produce Cell_Windows for that grid without any change to detector code.
8. THE Grid_Estimator SHALL treat Grid_Position, Rectified_Coordinates and Image_Coordinates as distinct types, so that one system's numbers cannot be passed where another is expected.
9. THE Card_Detector SHALL expose the two grid-fit thresholds as Detection_Parameters with default values that design and empirical testing on a documented tuning split determine, recorded with the benchmark version. This document fixes no numeric value for them.

### Requirement 6: Reserved positions

**User Story:** As an archivist, I want the eight alignment positions excluded from the instruction output, so that a placeholder alignment hole is never read as a weaving instruction.

#### Acceptance Criteria

1. THE Card_Detector SHALL derive the set of Reserved_Positions from the supplied Machine_Profile and SHALL NOT hard-code any position.
2. THE Card_Detector SHALL produce Cell_Evidence only for Readable_Positions, and SHALL produce for each Reserved_Position a separate Reserved_Position record that carries no Hole_Probability usable as an instruction, no Condition and no `readIndex`.
3. THE Detection_Result SHALL contain exactly `readableCount` Cell_Evidence records, one for each `readIndex` in `[0, readableCount - 1]`, each used once, and exactly one Reserved_Position record per reserved entry of the Machine_Profile.
4. WHERE the Machine_Profile marks the `reservedPositions` field `unverified`, THE Card_Detector SHALL copy that status, basis and note into the Detection_Result and into each Reserved_Position record, so that the placeholder status is visible downstream.
5. WHERE the Machine_Profile marks `reservedPositions` `unverified`, THE Card_Detector SHALL by default not use Reserved_Position content as an alignment feature, and SHALL expose a Detection_Parameter that enables it, recorded in the Detection_Result when enabled.
6. WHERE a Reserved_Position record carries an observed raw measurement (hole present or absent in the image), THE Card_Detector SHALL label it `reserved-observation, not an instruction`, and THE Observation_Mapper SHALL NOT convert it into a Cell.
7. WHEN the Machine_Profile's reserved list changes to another valid list, THE Card_Detector SHALL recompute the Readable_Position set and the Cell_Evidence count without any change to detector code.

### Requirement 7: Explainable hole detection

**User Story:** As a researcher, I want every hole decision to be explainable, so that I can see which step and feature produced it and judge it.

#### Acceptance Criteria

1. THE Hole_Classifier SHALL compute Hole_Probability for each Readable_Position from image-processing features of its Cell_Window by a documented, deterministic method, and SHALL NOT use a trained black-box model as the primary method.
2. THE Hole_Classifier SHALL compute and record, for each Cell_Window, at least: the mean and standard deviation of normalised intensity inside the expected hole area, the same inside a surrounding ring, their contrast, the fraction of pixels above the hole threshold, and for the largest connected component inside the window its area relative to the expected hole area, its circularity, and the offset of its centroid from the window centre.
3. THE Hole_Classifier SHALL record in Cell_Diagnostics the deciding step, each feature value used, each threshold applied and its numeric value, and a text explanation of at most 1,000 characters.
4. THE Hole_Classifier SHALL take the expected hole size and shape tolerances from the Machine_Profile when it declares them, and otherwise from Detection_Parameters that are recorded in the Detection_Result and marked `unverified` (see assumption D5).
5. THE Hole_Classifier SHALL return a Hole_Probability that is finite and within [0, 1] for every Readable_Position with Condition `observed` or `ambiguous`.
6. THE Hole_Classifier SHALL compute Hole_Probability by a documented monotonic mapping from the feature evidence, and SHALL state in the Detection_Result that Hole_Probability is an uncalibrated algorithmic score until a calibration run is recorded.
7. WHERE a calibration run exists, THE Detection_Result SHALL cite its benchmark version, seed, split and sample size, and otherwise SHALL carry the marker `uncalibrated`.
8. THE Hole_Classifier SHALL keep Hole_Probability separate from any restoration correctness estimate, and SHALL NOT output a field named or described as restoration confidence or correctness.
9. THE Hole_Classifier SHALL return identical output for identical rectified input, Detection_Parameters and Implementation_Stamp.
10. WHERE an Image_Backend uses a randomised algorithm (for example RANSAC), THE Card_Detector SHALL take its seed from the Detection_Parameters and SHALL record the seed.
11. IF the supplied Detection_Parameters imply a Hole_Probability that is not finite for a position, THEN THE Hole_Classifier SHALL set that position's Condition to `unknown` and SHALL record the reason, and SHALL NOT output a number.

### Requirement 8: Per-position output, conditions and unknown evidence

**User Story:** As a restoration developer, I want each position reported as observed, ambiguous or unknown with its evidence, so that gaps are never mistaken for absent holes.

#### Acceptance Criteria

1. THE Detection_Result SHALL contain, for each Readable_Position: the `readIndex`, the Grid_Position, the Cell_Window polygons, the Patch_Reference, the Cell_Evidence features, the Hole_Probability (absent when Condition is `unknown`), the Condition and the Cell_Diagnostics.
2. WHEN the Hole_Probability is at least the configured `holeThreshold` and the position's quality score allows a reading, THE Hole_Classifier SHALL set Condition `observed` and the proposed raw value to hole present.
3. WHEN the Hole_Probability is at most the configured `noHoleThreshold` and the position's quality score allows a reading, THE Hole_Classifier SHALL set Condition `observed` and the proposed raw value to hole absent.
4. WHEN the Hole_Probability lies strictly between `noHoleThreshold` and `holeThreshold`, THE Hole_Classifier SHALL set Condition `ambiguous`, SHALL keep the Hole_Probability, and SHALL propose no raw value.
5. WHEN the Cell_Window lies outside the image, is covered by an Unknown_Region, is occluded, or its quality score is below the configured readability threshold, THE Hole_Classifier SHALL set Condition `unknown`, SHALL output no Hole_Probability and no raw value, and SHALL record the reason.
6. THE Hole_Classifier SHALL NOT classify a position as hole absent solely because evidence is missing, unreadable, occluded or outside the image.
7. THE Card_Detector SHALL expose `noHoleThreshold`, `holeThreshold` and the readability threshold as Detection_Parameters with `0 <= noHoleThreshold < holeThreshold <= 1`, and IF that relation is violated, THEN THE Card_Detector SHALL return `INVALID_PARAMETERS`.
8. THE Card_Detector SHALL NOT tune `noHoleThreshold`, `holeThreshold` or the readability threshold on a held-out split. Default values SHALL be determined by design and empirical testing on a documented tuning split, and this document fixes no numeric value for them.
9. THE Detection_Result SHALL keep the raw image evidence (Patch_Reference and feature statistics) of each position unchanged by any later step, including a Cell_Correction and a re-run; a Cell_Correction SHALL leave the Detection_Result unchanged, and a re-run SHALL produce a new Detection_Result and SHALL NOT edit an earlier one.
10. THE Detection_Result SHALL report, for each of the three Conditions, the number of Readable_Positions and the list of `readIndex` values (capped at 400, which equals `readableCount` for Garín).
11. THE Detection_Result SHALL carry the Hole_Polarity_Assumption as a named field with the value in effect (default `hole-is-lifted`) and the status `unverified`, THE Card_Detector SHALL read the value from the Machine_Profile or the Detection_Parameters so that a caller can change it without a code change, and THE Observation_Mapper SHALL apply it only when mapping a proposed raw value to a domain Bit.

### Requirement 9: Quality diagnostics and unknown regions

**User Story:** As an archivist, I want damage and photographic problems reported with severity and location, so that I know where to distrust the detection.

#### Acceptance Criteria

1. THE Quality_Analyzer SHALL examine the image for stains, tears, cords, patches, shadows, perspective distortion, glare, blur and low contrast, and SHALL report each as a Quality_Finding.
2. THE Quality_Analyzer SHALL give each Quality_Finding a kind, a score in [0, 1], a Severity, a polygon in Image_Coordinates, the list of affected `readIndex` values, the detecting method name, the feature values and thresholds used, and the statement that the finding is a heuristic that may be wrong.
3. THE Quality_Analyzer SHALL derive Severity from the score by thresholds recorded in the Detection_Parameters.
4. THE Quality_Analyzer SHALL report perspective distortion with a score computed from the homography (for example the ratio of opposite edge lengths and the deviation from a rectangle), and SHALL include the homography values used.
5. THE Quality_Analyzer SHALL report an Unknown_Region for every area where the image supports no hole presence judgement, with a reason from a fixed list (`outside-image`, `occluded-by-cord`, `torn-away`, `saturated`, `too-dark`, `blurred`, `covered-by-patch`, `other`).
6. THE Quality_Analyzer SHALL NOT repair, inpaint or hide damaged areas in the image used for hole classification, and SHALL leave their effects to be reflected in Condition and in the diagnostics.
7. WHERE a Quality_Finding overlaps a Cell_Window, THE Detection_Result SHALL list the finding's identifier in that position's Cell_Diagnostics.
8. THE Quality_Analyzer SHALL return identical Quality_Findings for identical rectified input, Detection_Parameters and Implementation_Stamp.
9. THE Card_Detector SHALL document each Quality_Finding kind's method and known failure modes, and SHALL state that kinds other than perspective-distortion, blur and low-contrast are heuristic detectors whose recall and precision are measured only on the evaluations of requirement 21.
10. IF the Quality_Analyzer cannot evaluate a kind for a given image, THEN THE Quality_Analyzer SHALL report that kind as `not-evaluated` with the reason, and SHALL NOT report it as absent.

### Requirement 10: Output mapping into the domain without loss

**User Story:** As a restoration and UI developer, I want detection output to map directly into domain cells and evidence, so that no information is lost or invented at the boundary.

#### Acceptance Criteria

1. THE Observation_Mapper SHALL convert a Detection_Result with Alignment_Status `aligned` or `aligned-with-warnings` into one domain `CellSeed` per Readable_Position, ordered by `readIndex`, and SHALL create a domain `Card` through the domain `createCard` function.
2. THE Observation_Mapper SHALL map Condition `observed` to a `RawObservation` with `value` set from the proposed raw value through the Hole_Polarity_Assumption and `holeLikelihood` set to the Hole_Probability, and SHALL set `initial.provenance` to `observed`.
3. THE Observation_Mapper SHALL map Condition `ambiguous` to a `RawObservation` with no `value` and `holeLikelihood` set to the Hole_Probability, and SHALL set `initial.provenance` to `ambiguous` with no `effectiveValue`.
4. THE Observation_Mapper SHALL map Condition `unknown` to a `RawObservation` with neither `value` nor `holeLikelihood`, and SHALL set `initial.provenance` to `ambiguous` with no `effectiveValue`.
5. THE Observation_Mapper SHALL write the Cell_Diagnostics summary into `initial.evidence.text` (at most 1,000 characters) and SHALL add `EvidenceRef` entries that point to the Patch_Reference and the Quality_Finding identifiers.
6. THE Observation_Mapper SHALL NOT produce provenance `repeat-inferred` or `symmetry-inferred` from detection output, SHALL produce provenance `user-edited` only through criterion 13, and SHALL NOT produce a Cell for any Reserved_Position.
7. THE Observation_Mapper SHALL set `initial.restorationConfidence` of every mapped Cell, for every Condition, to `null` (not evaluated, as the domain defines Restoration_Confidence as `number | null`), SHALL NOT use a numeric placeholder, SHALL state in the card-level detection record that `null` means restoration confidence was not evaluated, and SHALL NOT derive any value for it from the Hole_Probability, the classification margin or the quality score.
8. THE Card_Detector SHALL carry hole likelihood only as its probability output, and THE Observation_Mapper SHALL keep `holeLikelihood` separate from every restoration confidence field, so that restoration alone sets restoration confidence.
9. THE Observation_Mapper SHALL return an error rather than a partial Card when any mapped value would violate a domain rule, with the underlying domain error code.
10. FOR ALL Detection_Results with Alignment_Status `aligned` or `aligned-with-warnings`, THE Observation_Mapper output SHALL pass domain deck validation when wrapped in a one-card Deck under the same Machine_Profile.
11. FOR ALL Detection_Results, THE Observation_Mapper SHALL preserve the Hole_Probability, the Condition and the quality finding references of every position, so that a reader can reconstruct the Condition from the `CellSeed` and its evidence.
12. THE Observation_Mapper SHALL copy the Machine_Profile identifier, the Machine_Profile verification markers, the Implementation_Stamp and the Image_Digest into a card-level detection record that the caller can store beside the domain Card, and SHALL NOT add fields to the domain `Card` type.
13. WHERE the Correction_Layer contains an applied `set-cell-value` Cell_Correction (review state `carried`, or `needs-review` with a `confirm-cell-correction` Review_Resolution), THE Observation_Mapper SHALL apply it to the mapped Card through the domain edit operation (`userEdit`) using the Cell_Correction's Action_Id, so that the domain sets provenance `user-edited` and keeps the earlier value, provenance and evidence in the domain history. THE Observation_Mapper SHALL NOT write a `set-cell-condition` Cell_Correction into the domain Card, because the domain has no human operation that marks a cell ambiguous or unknown and domain provenance `ambiguous` would misrepresent a human decision as an algorithmic one; the mapped domain cell SHALL keep the provenance that the detector produced. THE Observation_Mapper SHALL instead list each `set-cell-condition` Cell_Correction in the card-level detection record as a human-authored user condition override (`userConditionOverrides`) with the `readIndex`, the declared Condition, the Action_Id, the Sequence_Number, the note, the review state and an `applied` flag.
14. THE Observation_Mapper SHALL NOT apply a Cell_Correction in review state `needs-review` that has no `confirm-cell-correction` Review_Resolution, and SHALL NOT apply a discarded one, and SHALL list each such Cell_Correction in the card-level detection record with its reasons, and, for a `set-cell-condition` Cell_Correction, with `applied` set to false in `userConditionOverrides`.
15. THE Observation_Mapper SHALL map from an unchanged Detection_Result plus the Correction_Layer, so that mapping the same Detection_Result with an empty Correction_Layer reproduces the uncorrected Card exactly, and the raw observation of every corrected cell remains equal to the detection output.
16. THE Observation_Mapper SHALL NOT call the Card_Detector, and SHALL return an error with the underlying domain error code, and no partial Card, when a domain rule rejects an applied Cell_Correction.

### Requirement 11: Failure diagnostics

**User Story:** As a user, I want a clear explanation when automatic alignment fails, so that I can fix the photo or use the manual fallback.

#### Acceptance Criteria

1. WHEN Alignment_Status is `failed`, THE Card_Detector SHALL return a Detection_Result that contains failure diagnostics and no Readable_Position observations.
2. THE failure diagnostics SHALL contain the failing stage (`intake`, `geometry`, `end-holes`, `orientation`, `grid-fit`), a reason code from the Vision_Error_Code registry, the numeric values and thresholds involved, and a list of suggested user actions chosen from a fixed list.
3. THE failure diagnostics SHALL include annotated Derived_Artifacts when available (for example the detected Card_Quadrilateral candidates and the grid overlay), each with its Artifact_Provenance.
4. IF the Card_Quadrilateral area is less than 20% of the image area, or any corner confidence is below its configured threshold, THEN THE Card_Detector SHALL report `ALIGNMENT_UNRELIABLE` with the stage `geometry`.
5. IF the grid-fit score is below its failure threshold, THEN THE Card_Detector SHALL report `ALIGNMENT_UNRELIABLE` with the stage `grid-fit`.
6. THE Card_Detector SHALL include a unit-testable corpus of at least five synthetic images that cannot be reliably aligned (for example heavily rotated out of the frame, extreme perspective, no card visible, a card cut by the image border, and a blank image) and SHALL assert for each image the Alignment_Status `failed` and the failing stage.
7. THE Card_Detector SHALL NOT return a best-guess grid for an image whose Alignment_Status is `failed`.

### Requirement 12: Manual correction contract (geometry corrections and cell-level corrections)

**User Story:** As a heritage weaver, I want to fix how the photograph is interpreted, and separately to fix individual cells, so that a geometry fix re-reads the image while a cell fix never discards my other work, and every correction is recorded.

#### Acceptance Criteria

1. THE Manual_Correction_Service SHALL accept exactly two classes of Manual_Correction, Geometry_Correction and Cell_Correction, SHALL record the class on every Correction_Log entry, and SHALL treat the class as determined by the entry kind in criteria 2 and 3.
2. THE Manual_Correction_Service SHALL accept these Geometry_Correction kinds, each of which changes how the image is interpreted: `set-corners` (four points in Image_Coordinates), `set-reference-holes` (one or more Reference_Holes, including End_Hole locations), `set-orientation` (one of the four rotations), `set-polarity` (the Hole_Polarity_Assumption value), `set-parameter-override` (named Detection_Parameters from a documented allow-list, including preprocessing, grid and classification parameters) and `select-profile` (a different Machine_Profile).
3. THE Manual_Correction_Service SHALL accept these Cell_Correction kinds, each of which targets a non-empty list of distinct `readIndex` values (a single cell or a region) of one Detection_Result: `set-cell-value` (hole present or hole absent) and `set-cell-condition` (`ambiguous` or `unknown`, with no value). A `set-cell-condition` Cell_Correction is a human-authored record kept only in the Correction_Log and the Correction_Layer; it SHALL NOT change the domain provenance of any cell. Documented limitation: because the domain has no human operation that marks a cell unknown, a cell that the detector observed keeps the detector's value in the domain Card after a user declares it `unknown`, so consumers must read `userConditionOverrides` in addition to the domain Card.
4. THE Manual_Correction_Service SHALL require an Action_Id on every Manual_Correction, and SHALL assign the next Sequence_Number from one sequence shared by both classes, by Correction_Undo_Entries and by Review_Resolutions.
5. IF a Manual_Correction carries an Action_Id that already exists in the Correction_Log, THEN THE Manual_Correction_Service SHALL return error `DUPLICATE_ACTION_ID` and leave the Correction_Log unchanged.
6. THE Manual_Correction_Service SHALL validate `set-corners` so that all four points lie within the Original_Image bounds, are finite, are ordered clockwise as displayed, form a convex quadrilateral, have no three collinear points within a configured tolerance, and enclose an area of at least 5% of the image area, and IF a rule fails, THEN THE Manual_Correction_Service SHALL return error `INVALID_CORNERS` naming the failed rule.
7. THE Manual_Correction_Service SHALL validate `set-reference-holes` so that each point lies within the image, each identifier is one of the declared End_Hole identifiers or an in-grid, non-reserved Grid_Position, no identifier repeats, and at least the number of points needed by the documented solver is present (at least 2 for a similarity fit), and IF a rule fails, THEN THE Manual_Correction_Service SHALL return error `INVALID_REFERENCE_HOLES`.
8. IF a Reference_Hole names a Reserved_Position, THEN THE Manual_Correction_Service SHALL return error `RESERVED_POSITION` and leave the Correction_Log unchanged.
9. IF a `set-polarity` value is not one of the documented polarity values, a `set-parameter-override` names a parameter outside the allow-list or a value outside its documented range, or a `select-profile` value fails domain Machine_Profile validation, THEN THE Manual_Correction_Service SHALL return error `INVALID_PARAMETERS` naming the field and SHALL leave the Correction_Log unchanged.
10. THE Manual_Correction_Service SHALL validate a Cell_Correction so that it refers to a Detection_Result with Alignment_Status `aligned` or `aligned-with-warnings`, every `readIndex` is an integer in `[0, readableCount - 1]` of that Detection_Result, no `readIndex` repeats, and the Condition and value fields match the kind, and IF a rule fails, THEN THE Manual_Correction_Service SHALL return error `INVALID_CELL_CORRECTION` naming the failed rule and SHALL leave the Correction_Log unchanged.
11. WHEN a valid Cell_Correction is recorded, THE Manual_Correction_Service SHALL append it to the Correction_Log together with an Evidence_Snapshot and the Geometry_Fingerprint of each targeted position, SHALL return the new Correction_Log, and SHALL NOT invoke the Card_Detector, the Image_Backend or the Detection_Worker, and SHALL NOT decode the Input_Image.
12. THE Manual_Correction_Service SHALL NOT alter, replace or re-derive any value in the Detection_Result when it records a Cell_Correction, SHALL NOT alter a Hole_Probability or a Condition in any Detection_Result, and SHALL keep the raw evidence and the detection output of each corrected position available beside the Correction_Layer.
13. WHEN a valid Geometry_Correction is recorded, THE Card_Detector SHALL re-run the pipeline from the Original_Image with the effective Geometry_Corrections (the Geometry_Correction entries of the Correction_Log folded in Sequence_Number order, after removing reversed entries), and SHALL return a new Detection_Result whose content equals that of a full run with the same inputs.
14. WHEN a Geometry_Correction is recorded, THE Card_Detector SHALL recompute, from the earliest pipeline stage that the kind affects, every later stage: `set-parameter-override` of a preprocessing parameter recomputes from `preprocess`; `set-corners`, `set-reference-holes`, `set-orientation`, `select-profile` and `set-parameter-override` of a geometry, grid or classification parameter recompute from `geometry`; and `set-polarity` recomputes `assemble`. Every recomputed stage SHALL include the Cell_Evidence, Quality_Findings, Unknown_Regions, Alignment_Status and Derived_Artifacts that depend on it.
15. WHEN a Geometry_Correction is recorded, THE Card_Detector SHALL keep the Original_Image as supplied by the caller and unchanged, SHALL keep the previous Detection_Result retained and available to the caller, and SHALL mark each output value that depends on a user-supplied geometry value `user-supplied` in the new Detection_Result.
16. WHEN a Geometry_Correction has produced a new Detection_Result, THE Manual_Correction_Service SHALL reconcile every active Cell_Correction (not reversed, and not discarded) against the new Detection_Result by `readIndex`, and SHALL assign each one the Correction_Review_State `carried` or `needs-review`, with the reasons.
17. THE Manual_Correction_Service SHALL assign `needs-review` to an active Cell_Correction when any of these holds: the Orientation differs from the Evidence_Snapshot's Geometry_Fingerprint; the polarity differs; the Machine_Profile identifier, grid size or `readableCount` differs, or a targeted `readIndex` is outside the new `readableCount`; the new Alignment_Status is not `aligned` or `aligned-with-warnings`; the fitted grid differs from the snapshot grid by more than a design-defined grid-shift tolerance; or the new raw evidence of a targeted position differs from its Evidence_Snapshot by more than a design-defined tolerance. Otherwise THE Manual_Correction_Service SHALL assign `carried`.
18. IF a Cell_Correction has the review state `needs-review`, THEN THE Manual_Correction_Service SHALL NOT apply it to the mapped Card, SHALL NOT drop it from the Correction_Log, SHALL list it with its reasons, its Evidence_Snapshot and the new evidence of the same `readIndex`, and SHALL wait for a Review_Resolution.
19. THE Manual_Correction_Service SHALL accept a Review_Resolution of kind `confirm-cell-correction` or `discard-cell-correction` that references the Action_Id of a Cell_Correction in review state `needs-review`, SHALL append it to the Correction_Log without invoking the Card_Detector, SHALL apply a confirmed Cell_Correction to the mapped Card, and SHALL keep a discarded one in the Correction_Log without applying it, and IF the referenced entry does not exist or is not in state `needs-review`, THEN THE Manual_Correction_Service SHALL return error `REVIEW_NOT_PENDING` and leave the Correction_Log unchanged.
20. THE Manual_Correction_Service SHALL compute the effective Correction_Layer (the set of applied Cell_Corrections) as a pure function of the Correction_Log and the current Detection_Result, and THE Observation_Mapper SHALL apply it as specified in requirement 10.
21. WHEN the user undoes a Manual_Correction, THE Manual_Correction_Service SHALL append a Correction_Undo_Entry that references the Action_Id of the reversed entry, SHALL NOT remove or modify any entry, and SHALL make the effective corrections equal those before the reversed entry; undoing a Geometry_Correction SHALL trigger the re-detection and reconciliation of criteria 13 to 16, and undoing a Cell_Correction or a Review_Resolution SHALL NOT invoke the Card_Detector.
22. IF the entry to undo does not exist or is already reversed, THEN THE Manual_Correction_Service SHALL return error `NOTHING_TO_UNDO` and leave the Correction_Log unchanged.
23. THE Manual_Correction_Service SHALL contain no timestamp in any entry, SHALL order entries only by Sequence_Number, and SHALL be append-only: an entry SHALL never be removed or modified.
24. THE re-detection semantics SHALL be a pure function of the Original_Image, the Detection_Parameters, the Machine_Profile and the effective Geometry_Corrections, so that folding the same Correction_Log over the same inputs yields an identical Detection_Result, and THE reconciliation SHALL be a pure function of the Correction_Log and the new Detection_Result.
25. THE Detection_Result SHALL include the effective Geometry_Corrections used for that run, and THE Manual_Correction_Service SHALL keep the full Correction_Log, including Cell_Corrections and Review_Resolutions, separate from every Detection_Result.
26. THE Manual_Correction_Service SHALL accept at most 1,000 Correction_Log entries, and IF a further entry is submitted, THEN THE Manual_Correction_Service SHALL return error `CORRECTION_LOG_TOO_LARGE`.
27. THE Manual_Correction_Service SHALL provide a Correction_Log exporter and importer with stable key order, a `format` marker and a `schemaVersion`, and FOR ALL valid Correction_Logs, exporting then importing then exporting SHALL produce identical text.
28. IF Correction_Log text is not valid JSON, has an unsupported `schemaVersion`, an unknown field or a non-contiguous Sequence_Number, THEN THE Manual_Correction_Service SHALL return respectively `INVALID_JSON`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD` or `CORRECTION_SEQUENCE_INVALID` and no partial log.
29. IF an undo or Review_Resolution references an Action_Id that is not in the Correction_Log, THEN THE Manual_Correction_Service SHALL return error `UNKNOWN_ACTION_ID` and leave the Correction_Log unchanged.

### Requirement 13: Worker execution and message protocol

**User Story:** As a UI developer, I want detection to run in a worker with progress and cancellation, so that the interface stays responsive.

#### Acceptance Criteria

1. THE Card_Detector SHALL run image decoding, preprocessing, geometry estimation, grid estimation, hole classification and quality analysis inside the Detection_Worker, and SHALL run none of them on the UI thread.
2. THE Detection_Worker SHALL exchange only Worker_Messages that are structured-cloneable plain data, each carrying `protocolVersion`, a `type` and a `runId`.
3. THE Worker_Message set SHALL include: `run` (Input_Image bytes, Machine_Profile, Detection_Parameters, optional effective Geometry_Corrections; the message carries no Cell_Corrections, because Cell_Corrections never trigger detection), `progress`, `cancel`, `result`, `error` and `ready`.
4. WHEN the Detection_Worker receives a `run` message, THE Detection_Worker SHALL operate on a copy of the Input_Image bytes, so that the caller's Original_Image buffer is not detached or mutated.
5. THE Detection_Worker SHALL send a `progress` message at least at the start and end of each of the stages `intake`, `preprocess`, `geometry`, `grid`, `classify`, `quality` and `assemble`, each with a stage name and a completion fraction in [0, 1] that does not decrease within one run.
6. WHEN the Detection_Worker receives a `cancel` message with a known `runId`, THE Detection_Worker SHALL stop that run at the next checkpoint, SHALL send an `error` message with code `CANCELLED`, and SHALL send no `result` for that run. Checkpoints SHALL occur between stages and at least every 50 grid rows processed. Design SHALL define a cancellation-latency budget, and the budget SHALL be validated by measurement on reference hardware and the result reported. This document fixes no number.
7. IF the Detection_Worker receives a message with an unsupported `protocolVersion`, THEN THE Detection_Worker SHALL reply with `error` code `UNSUPPORTED_PROTOCOL_VERSION` naming the supplied and supported versions.
8. IF the Detection_Worker receives a message that is not a known `type` or fails structural validation, THEN THE Detection_Worker SHALL reply with `error` code `INVALID_MESSAGE` and the path of the first invalid field, and SHALL continue to serve later messages.
9. IF a run fails with an expected error, THEN THE Detection_Worker SHALL send an `error` message with a Vision_Error_Code, a message and the failing stage, and SHALL send no partial `result`.
10. IF an unexpected exception occurs, THEN THE Detection_Worker SHALL send an `error` message with code `INTERNAL_ERROR` and the exception message text, and SHALL remain able to accept a new run.
11. WHEN a `run` message arrives while another run is active, THE Detection_Worker SHALL reply with `error` code `RUN_IN_PROGRESS` for the new `runId` and SHALL leave the active run unaffected.
12. THE Detection_Worker SHALL contain no network request, no `Date` use and no unseeded randomness in the code paths that produce a Detection_Result.
13. THE Card_Detector SHALL keep the pipeline logic in `src/vision` as functions that do not depend on the worker, so that the Detection_Worker is a thin adapter and the pipeline is unit-testable without a worker.
14. THE Card_Detector SHALL provide a Playwright browser test that runs a detection through the worker and checks that the main thread's longest task during the run stays below a measured budget. Design SHALL define the main-thread blocking budget, and the test SHALL validate it by measurement on reference hardware and report the result. This document fixes no number.

### Requirement 14: Original image preservation and derived artifacts

**User Story:** As an archivist, I want the original image kept untouched and every processed image traceable to its parameters, so that I can audit what the system did.

#### Acceptance Criteria

1. THE Card_Detector SHALL leave the Original_Image bytes unchanged by every operation, and the Image_Digest recomputed after a run SHALL equal the Image_Digest recorded before the run.
2. THE Card_Detector SHALL return every processed image (resized, illumination-corrected, denoised, Rectified_Image, overlays, patch crops) as a Derived_Artifact with an Artifact_Provenance holding the step name, the parameter values, the Implementation_Stamp and the Image_Digest of its input.
3. THE Detection_Result SHALL refer to Derived_Artifacts by descriptor (identifier, size, producing step, Artifact_Provenance) and SHALL carry pixel data only where the caller requests it through a Detection_Parameter.
4. THE Card_Detector SHALL store the Original_Image only as a reference supplied by the caller (Image_Digest and dimensions) in the Detection_Result, and SHALL NOT embed the Original_Image pixels in the Detection_Result.
5. THE Card_Detector SHALL regenerate any Derived_Artifact from the Original_Image, the Detection_Parameters and the Implementation_Stamp with identical content (determinism).
6. THE Card_Detector SHALL include the Implementation_Stamp in every Detection_Result, every Derived_Artifact descriptor and every card-level detection record.
7. WHERE the caller requests Derived_Artifact pixel data, THE Detection_Worker SHALL return it as transferable buffers in the `result` message, and the Original_Image copy inside the worker SHALL NOT be transferred.

### Requirement 15: Determinism, versioning and Detection_Result serialisation

**User Story:** As a researcher, I want identical runs to give identical output and a versioned, round-trippable result format, so that results are reproducible and comparable.

#### Acceptance Criteria

1. THE Card_Detector SHALL return identical Detection_Results for identical Input_Image bytes, Machine_Profile, Detection_Parameters, effective Geometry_Corrections and Implementation_Stamp, within one runtime environment.
2. THE Card_Detector SHALL use no `Math.random`, no `Date` and no network in code that produces a Detection_Result, and SHALL take any seed from the Detection_Parameters.
3. THE Card_Detector SHALL report floating-point results rounded to a documented number of decimal places in serialised form, so that serialised text is stable.
4. THE Card_Detector SHALL document that identical output across different browsers, operating systems or Image_Backend versions is not guaranteed, and SHALL measure and report the maximum Hole_Probability difference and the number of Condition changes between two environments on the evaluation set. Design SHALL define the cross-browser and cross-environment tolerance for Hole_Probability differences and Condition changes, and the measurement SHALL validate it. This document fixes no number.
5. THE Detection_Result SHALL carry a `schemaVersion` and a `format` marker, and every persisted type of this feature SHALL carry an integer `schemaVersion`.
6. THE Card_Detector SHALL provide a Detection_Result exporter that writes stable-key-order JSON text without timestamps, and an importer that validates it.
7. FOR ALL valid Detection_Results, exporting, importing and exporting again SHALL produce identical text (round trip).
8. IF Detection_Result text is larger than 16 MiB, THEN THE importer SHALL return `INPUT_TOO_LARGE` without parsing it, IF it is not valid JSON, including truncated text, THEN THE importer SHALL return `INVALID_JSON`, IF the `format` marker or `schemaVersion` is unsupported THEN THE importer SHALL return `INVALID_FORMAT` or `UNSUPPORTED_SCHEMA_VERSION`, and IF it holds a field not in the schema, THEN THE importer SHALL return `UNKNOWN_FIELD` naming the path.
9. IF imported text parses but violates a Detection_Result invariant (probability outside [0, 1], a Reserved_Position with a `readIndex`, a Condition `unknown` with a Hole_Probability, or a Cell_Evidence count other than `readableCount`), THEN THE importer SHALL return error `INVALID_DETECTION_RESULT` with the path of the first violation and no partial result.
10. THE Detection_Result SHALL carry the Machine_Profile identifier, the Machine_Profile `schemaVersion` and a copy of every Machine_Profile verification marker that the run depended on (grid size, reserved positions, end holes, read order, physical dimensions), each with status, basis and note.
11. THE Detection_Result SHALL NOT embed user photographs or pixel data of the Original_Image.

### Requirement 16: Error registry

**User Story:** As a UI and test author, I want every expected failure to have a stable, documented code, so that behaviour at the boundaries is explicit and testable.

#### Acceptance Criteria

1. THE Card_Detector SHALL define one Vision_Error_Code registry containing at least: `IMAGE_TOO_LARGE_BYTES`, `UNSUPPORTED_IMAGE_FORMAT`, `IMAGE_DECODE_FAILED`, `IMAGE_TOO_LARGE_PIXELS`, `IMAGE_TOO_SMALL`, `MULTI_FRAME_IMAGE`, `MULTIPLE_CARDS_SUSPECTED`, `INVALID_PARAMETERS`, `ALIGNMENT_UNRELIABLE`, `ORIENTATION_UNRESOLVED`, `INVALID_CORNERS`, `INVALID_REFERENCE_HOLES`, `RESERVED_POSITION`, `DUPLICATE_ACTION_ID`, `NOTHING_TO_UNDO`, `CORRECTION_LOG_TOO_LARGE`, `CORRECTION_SEQUENCE_INVALID`, `INVALID_MESSAGE`, `UNSUPPORTED_PROTOCOL_VERSION`, `RUN_IN_PROGRESS`, `CANCELLED`, `INTERNAL_ERROR`, `INVALID_DETECTION_RESULT`, `INPUT_TOO_LARGE`, `INVALID_JSON`, `INVALID_FORMAT`, `UNSUPPORTED_SCHEMA_VERSION`, `UNKNOWN_FIELD`, `BACKEND_LOAD_FAILED`, `ASSISTANT_UNAVAILABLE`, `ASSISTANT_OUTPUT_INVALID`, `INVALID_CELL_CORRECTION`, `REVIEW_NOT_PENDING`, `UNKNOWN_ACTION_ID`.
2. THE Card_Detector SHALL give each code a stable message text and SHALL keep each code's meaning unchanged across minor interface versions.
3. WHEN a function returns an error, THE Card_Detector SHALL leave every input unchanged and SHALL return no partial result value.
4. THE Card_Detector SHALL document all codes in `docs/vision-errors.md` and SHALL provide a test that fails when the registry and that document differ.
5. THE Card_Detector SHALL provide at least one example test per code that triggers that code.

### Requirement 17: Image backend and OpenCV.js loading

**User Story:** As a maintainer, I want the image-processing library loaded lazily and replaceable, so that startup stays light and the choice can be revised after a spike.

#### Acceptance Criteria

1. THE Card_Detector SHALL access image primitives only through the Image_Backend interface, so that OpenCV.js and a hand-written canvas implementation are interchangeable without changes to pipeline logic.
2. WHERE OpenCV.js is the Image_Backend, THE Detection_Worker SHALL load it lazily on the first `run` message, and SHALL NOT load it on page load or on the main thread.
3. THE Detection_Worker SHALL load OpenCV.js from a same-origin static asset, and SHALL NOT load it from a third-party host.
4. THE Detection_Worker SHALL pin the OpenCV.js version and record it in the Implementation_Stamp.
5. IF the Image_Backend fails to load, THEN THE Detection_Worker SHALL send an `error` message with code `BACKEND_LOAD_FAILED` naming the backend and SHALL remain able to accept a later run.
6. THE Card_Detector SHALL state a transfer-size budget for the Image_Backend asset and its load time on reference hardware. Design SHALL define the numeric budget after a spike on real card photographs and SHALL validate it by measurement, and this document fixes no number. The options for design are of lazy loading, a trimmed OpenCV.js build, or a hand-written canvas implementation if detection needs only thresholding, morphology, connected components and a homography.
7. THE Card_Detector SHALL record the measured asset size and load time in `docs`, and SHALL NOT claim a size or time that has not been measured.
8. WHEN a detection run completes, THE Detection_Worker SHALL release every OpenCV.js allocation it made for that run, and a test SHALL check that the number of live allocations after 20 consecutive runs equals the number before them.
9. THE Card_Detector SHALL ensure that the core demonstration works with the Image_Backend and the bundled sample only, with no external AI API and no network access after the application assets are loaded.

### Requirement 18: Privacy

**User Story:** As an archivist, I want my photographs to stay in my browser, so that I do not expose collection material.

#### Acceptance Criteria

1. THE Card_Detector SHALL process every Input_Image inside the browser and SHALL NOT transmit image bytes, Derived_Artifacts or Detection_Results to any server.
2. THE Card_Detector SHALL make no network request during a detection run, other than the one-time load of its own static assets.
3. THE Card_Detector SHALL provide a Playwright test that blocks all non-same-origin requests, runs a detection on the bundled sample, and asserts that the run completes and that no request carried image data.
4. THE Card_Detector SHALL NOT persist the Input_Image to browser storage unless the caller explicitly requests it.
5. THE Card_Detector SHALL NOT commit user photographs to the repository, and any bundled sample SHALL come from `data` with a README stating its source and licence.

### Requirement 19: Optional vision-model assistance

**User Story:** As a researcher, I want a replaceable hook for model help on hard images, so that I can experiment later without changing the deterministic core or inventing observations.

#### Acceptance Criteria

1. THE Card_Detector SHALL define a Detection_Assistant interface through which a model may propose evidence for a Readable_Position, an Unknown_Region or a Quality_Finding.
2. THE Card_Detector SHALL run with no Detection_Assistant configured by default, and every requirement of this document other than this one SHALL be satisfied without it.
3. WHERE a Detection_Assistant is configured, THE Card_Detector SHALL record its output as Assistant_Evidence with the model identifier, model version, a label stating that the proposal is model-generated, a confidence in [0, 1] and a text explanation, in a section of the Detection_Result separate from Cell_Evidence.
4. THE Card_Detector SHALL NOT set Condition `observed`, a raw value or a Hole_Probability from Assistant_Evidence, and THE Observation_Mapper SHALL NOT convert Assistant_Evidence into a `RawObservation`.
5. THE Observation_Mapper SHALL carry Assistant_Evidence into the card-level detection record only, so that restoration can weigh it as evidence with provenance.
6. IF Assistant_Evidence fails validation (confidence outside [0, 1], missing model identifier, missing label or empty explanation), THEN THE Card_Detector SHALL discard it, SHALL record error `ASSISTANT_OUTPUT_INVALID` as a diagnostic, and SHALL leave every other output unchanged.
7. IF a configured Detection_Assistant is unavailable, THEN THE Card_Detector SHALL record `ASSISTANT_UNAVAILABLE` as a diagnostic and SHALL complete the run without it.
8. THE Card_Detector SHALL NOT call an external network API from the core pipeline, and WHERE an assistant uses a network service, THE UI spec SHALL show a clear label and require explicit user opt-in before any image data leaves the browser.
9. THE Card_Detector SHALL keep a run with an assistant and a run without it distinguishable in the Detection_Result by the recorded assistant identifier.

### Requirement 20: Interfaces provided to later specs

**User Story:** As the author of the restoration, UI and benchmark specs, I want a stable, documented interface from card detection, so that those specs can be built in parallel.

#### Acceptance Criteria

1. THE Card_Detector SHALL export, from one index module in `src/vision`, the types and functions named in this document, each function documented with its Vision_Error_Code results, and SHALL record an interface version constant.
2. THE Card_Detector SHALL provide to the restoration spec: the Observation_Mapper (Detection_Result to `CellSeed` and `Card`), the Condition and Hole_Probability of every position, the Cell_Evidence and `EvidenceRef` entries, the Quality_Findings and Unknown_Regions with affected `readIndex` values, the card-level detection record, the Correction_Layer application (`set-cell-value` Cell_Corrections applied as domain `user-edited` edits, with the raw observation unchanged, and `set-cell-condition` Cell_Corrections exposed as `userConditionOverrides` in the card-level detection record), the list of Cell_Corrections in review state `needs-review`, `initial.restorationConfidence: null` (not evaluated) on every mapped Cell, and the Machine_Profile verification markers.
3. THE Card_Detector SHALL provide to the UI spec: the Detection_Client with `run`, `cancel` and progress callbacks, the Manual_Correction_Service operations for both classes (record a Geometry_Correction, record a Cell_Correction, resolve a review, undo) and Correction_Log accessors, the reconciliation result with review states and reasons, the retained previous Detection_Results, the Derived_Artifact descriptors for overlays, the Quality_Finding and Unknown_Region polygons in Image_Coordinates, the Alignment_Status and failure diagnostics, the Vision_Error_Code messages, the exporters, and the uncalibrated marker.
4. THE Card_Detector SHALL provide to the benchmark spec: a pure function `detect(imageBytes, profile, parameters, geometryCorrections?)` usable without a worker (it takes no Cell_Corrections), the Detection_Parameters schema with defaults, a per-cell comparison function between a Detection_Result and a ground-truth Deck of the same Machine_Profile, and the metric definitions of requirement 21.
5. THE Card_Detector SHALL treat a change to any exported signature after design approval as requiring a spec update.
6. THE Card_Detector SHALL import from `src/domain` only through its public index, and SHALL NOT define a type that duplicates a domain type.
7. THE Card_Detector SHALL provide an import-boundary test that fails if any file in `src/vision` imports from `src/ui`, `src/restore` or `src/benchmark`, or if any file in `src/domain` imports from `src/vision` or `src/workers`; and that fails if a file in `src/vision` other than the worker adapter uses a DOM, `Date`, `Math.random` or network API in a code path that produces a Detection_Result.

### Requirement 21: Evaluation and reporting

**User Story:** As a judge or researcher, I want measured detection quality reported separately for synthetic and real images, so that no number is overstated or mixed.

#### Acceptance Criteria

1. THE Card_Detector SHALL define and report these metrics: per-cell hole presence accuracy over positions with Condition `observed`; coverage as the fraction of Readable_Positions in each Condition; accuracy over all positions where `ambiguous` and `unknown` count as not-correct; Brier score of Hole_Probability over positions with a Hole_Probability; expected calibration error of Hole_Probability with the bin count stated; alignment success rate; and Card_Quadrilateral corner error in pixels.
2. THE Card_Detector SHALL report every metric with the benchmark version, the seed, the split, the sample size and the Implementation_Stamp.
3. THE Card_Detector SHALL report the Synthetic_Benchmark and the Real_Image_Evaluation in separate documents or sections, SHALL NOT pool or average their numbers, and SHALL NOT tune any parameter on a held-out or `test` Split_Role. THE Card_Detector tuning SHALL read only the `tuning` Split_Role of a Dataset_Manifest.
4. THE Synthetic_Benchmark SHALL render images from known Decks under the Machine_Profile at the damage levels `none`, `light`, `moderate` and `heavy`. The level definitions, the Occlusion_Cover_Fraction and the per-level `occlusionCoverage` extent are defined by requirement 7 of the `benchmark-and-evaluation` spec and are stored in the Damage_Level_File `data/synthetic/damage-levels.json`. THE Card_Detector SHALL read the Damage_Level_File as data, SHALL NOT import any module from `src/benchmark`, and SHALL validate exactly the field list of the benchmark schema (benchmark requirement 7.3). The placeholder file `data/synthetic/damage-levels.placeholder.json` and its marker are superseded. This document fixes no level definition and no accuracy target.
5. THE Synthetic_Benchmark SHALL report the metrics of criterion 1 for each damage level separately, for the Split_Roles defined by benchmark requirement 10 (Deck_Family splits), and SHALL state that synthetic accuracy does not predict performance on real photographs. The seed-block convention (tuning from seed 1, held-out from seed 100000) is superseded for official reports by those Deck_Family splits.
6. THE Real_Image_Evaluation SHALL be reported as small and qualitative where the sample is small, SHALL state the sample size, SHALL state that no accuracy claim is made beyond the measured sample, and SHALL list the failures observed.
7. WHERE a real image is used for evaluation or bundled as a sample, THE Card_Detector SHALL record its source and licence in the `data` README, and SHALL check the Garín5 dataset terms (assumption D10) before any redistribution.
8. THE Card_Detector SHALL treat target values for these metrics as measured-and-reported quantities, not guaranteed thresholds, and SHALL leave accuracy targets to the `src/benchmark` specification (its Threshold_Register, requirement 18), so that this document fixes no threshold.
9. THE Card_Detector SHALL NOT quote an accuracy number in the application, README or documentation that is not taken from a recorded run.
10. THE Synthetic_Benchmark SHALL be separate from the damage models of the `src/benchmark` spec; the generator used here SHALL live in `src/vision/__tests__` and SHALL NOT be imported by production code.
11. THE scripts `scripts/vision-eval-synthetic.ts` and `scripts/vision-eval-real.ts` SHALL be thin wrappers that delegate to the benchmark runner (`runBenchmark` or `runDetectionTrack`) and SHALL compute no metric themselves, and THE script `scripts/vision-tune.ts` SHALL read the `tuning` Split_Role from a Dataset_Manifest and SHALL refuse the `held-out` and `test` roles.
12. THE Card_Detector SHALL keep the pure `detect` function, the per-cell comparison function and the metric definitions of criterion 1 as the single source for shared detection metrics, and THE benchmark runner SHALL match them (benchmark requirement 13.7).

### Requirement 22: Correctness properties and test determinism

**User Story:** As a maintainer, I want property-based tests with deterministic seeds, so that invariants hold and any failure is reproducible.

#### Acceptance Criteria

1. THE Card_Detector test suite SHALL run every fast-check property with an explicit, distinct seed constant (a block starting at 20260200, which applies to property tests only and does not define dataset splits) and a bounded `numRuns` of at most 200 (image-based properties) or 500 (pure-data properties), and SHALL print the seed and the shrunk counterexample on failure.
2. THE Card_Detector test suite SHALL state in a comment beside each property its generator precondition, for example "for any synthetic card image of 51 x 8 grid at 1,024 pixels on the longer side with rotation within 15 degrees".
3. THE Card_Detector test suite SHALL use no `Math.random`, `Date.now` or network access, and SHALL generate every image from a seed.
4. THE Card_Detector test suite SHALL include a determinism property that, FOR ALL synthetic images and valid Detection_Parameters, two runs of `detect` produce deeply equal Detection_Results and byte-identical exported text.
5. THE Card_Detector test suite SHALL include a bounds property that, FOR ALL Detection_Results produced from synthetic images, every Hole_Probability is finite and within [0, 1], every score and confidence is within [0, 1], and no Cell_Evidence with Condition `unknown` has a Hole_Probability.
6. THE Card_Detector test suite SHALL include a reserved-position property that, FOR ALL valid Machine_Profiles and all Reserved_Position lists, the Detection_Result contains no Cell_Evidence for a Reserved_Position, `readableCount` Cell_Evidence records with distinct `readIndex` values, and the Observation_Mapper output has `readableCount` cells.
7. THE Card_Detector test suite SHALL include an unknown-evidence property that, FOR ALL synthetic images in which a seeded region is occluded (solid colour covering the Cell_Windows of chosen positions), every position whose Cell_Window is covered by at least the Occlusion_Cover_Fraction has Condition `unknown` or `ambiguous` and none has Condition `observed` with value hole absent. The test SHALL read the Occlusion_Cover_Fraction from the Damage_Level_File, where it is a per-Cell_Window coverage fraction (initial value 0.9, `initial-unconfirmed` until benchmark experiment E-2) and not a share of all cells that are occluded, and this document fixes no value.
8. THE Card_Detector test suite SHALL include a mapping property that, FOR ALL Detection_Results with Alignment_Status `aligned` or `aligned-with-warnings`, the Observation_Mapper output validates in a one-card Deck, preserves Hole_Probability and Condition as specified in requirement 10, and, with an empty Correction_Layer, produces no provenance other than `observed` and `ambiguous`, and produces `user-edited` only for cells with an applied `set-cell-value` Cell_Correction. The property SHALL also assert that every `initial.restorationConfidence` equals `null`.
9. THE Card_Detector test suite SHALL include a round-trip property that, FOR ALL valid Detection_Results and Correction_Logs, export then import then export yields identical text.
10. THE Card_Detector test suite SHALL include a corruption property that, FOR ALL valid exported Detection_Result and Correction_Log texts, truncation at generated cut points returns `INVALID_JSON`, and seeded single-byte corruption never returns a value that differs from the original without an error.
11. THE Card_Detector test suite SHALL include a correction-log property that, FOR ALL sequences of up to 20 Manual_Correction, Review_Resolution and undo operations of both classes, the log never shrinks, earlier entries stay equal, Sequence_Numbers are contiguous, every undo references an earlier un-reversed entry, and the effective corrections equal an independent fold of the log.
12. THE Card_Detector test suite SHALL include a re-run property that, FOR ALL synthetic images and valid Correction_Logs, re-detecting with the same effective Geometry_Corrections yields an identical Detection_Result and leaves the previous Detection_Result and the Original_Image digest unchanged.
13. THE Card_Detector test suite SHALL include a failure-diagnostics example corpus (requirement 11, criterion 6) and an example test per error code.
14. THE Card_Detector test suite SHALL include an image-intake boundary test with explicit seeds for oversize input at exactly the limit and one unit above it for bytes, width, height and pixel count, and for truncated and corrupted files, each asserting the specific error code and that no partial value is returned.
15. THE Card_Detector test suite SHALL include a worker protocol test for: unsupported `protocolVersion`, invalid message, `run` during an active run, cancellation, progress monotonicity and unexpected exception, using the worker adapter with an injected pipeline.
16. THE Card_Detector test suite SHALL include golden tests for a fixed small synthetic image: the exported Detection_Result text and the Preprocessing_Report, committed in version control with a stated reason for any change.
17. THE Card_Detector test suite SHALL convert every shrunk counterexample found into a permanent example test.
18. THE Card_Detector test suite SHALL include a no-detection property that, FOR ALL valid sequences of Cell_Corrections, Review_Resolutions and undos of either, an injected pipeline spy records zero invocations of `detect`, zero Image_Backend calls and zero Input_Image decodes, and every earlier Detection_Result stays deeply equal to its value before the sequence.
19. THE Card_Detector test suite SHALL include a geometry-correction property that, FOR ALL synthetic images, valid Geometry_Corrections of each kind and existing Cell_Corrections, recording the Geometry_Correction invokes `detect` exactly once with the Original_Image bytes, retains the previous Detection_Result, keeps every Cell_Correction entry in the Correction_Log with its Action_Id and Sequence_Number, and assigns each Cell_Correction a Correction_Review_State.
20. THE Card_Detector test suite SHALL include a reconciliation regression property that, FOR ALL Cell_Corrections made against a Detection_Result and then reconciled against a re-detection with an unchanged geometry, every one is `carried`, and, FOR ALL re-detections with a changed Orientation, a changed polarity, a different Machine_Profile grid or a grid shift larger than the design-defined tolerance, every affected Cell_Correction is `needs-review` with a non-empty reason, is not applied by the Observation_Mapper, and is neither dropped nor silently reapplied.
21. THE Card_Detector test suite SHALL include a review-resolution property that, FOR ALL `needs-review` Cell_Corrections, `confirm-cell-correction` applies a `set-cell-value` Cell_Correction as a `user-edited` edit that keeps the earlier value and provenance in the domain history, and for a `set-cell-condition` Cell_Correction sets its user condition override to `applied` true while leaving the mapped Card equal to the uncorrected Card, `discard-cell-correction` leaves the mapped Card equal to the uncorrected Card, and undoing the Review_Resolution restores the `needs-review` state, in each case without invoking `detect`.
22. THE Card_Detector test suite SHALL include a layering property that, FOR ALL Detection_Results and valid Cell_Corrections, the Detection_Result is deeply equal before and after the correction, and the raw observation of every corrected cell in the mapped Card equals the uncorrected raw observation.

## Historical and geometric assumptions requiring verification

The following items come from `jacquard-card-format.md` and from detection-specific choices. NONE is verified against Rodas Lorente et al. (2025). The Card_Detector reads each from the Machine_Profile (or from recorded Detection_Parameters where the profile is silent), copies its `VerificationStatus` into the Detection_Result, and carries a code comment `// UNVERIFIED <id>: see .kiro/steering/jacquard-card-format.md` where it depends on the item. The UI and exports show the unverified status. When an item is checked, the page or figure is recorded in the Machine_Profile and in `jacquard-card-format.md`.

| ID | Item | Detection dependence and handling | Basis | Affects |
|----|------|-----------------------------------|-------|---------|
| D1 | Location of the eight reserved alignment positions | Profile placeholder, a geometric inference. Excluded from instruction output. Not used as an alignment feature by default. Status copied to outputs. | geometric-inference | Req 5, 6, 10 |
| D2 | Placement, size and shape of the two End_Holes, and whether they affect the 51-row count | Profile `endHoles` carries no geometry. The detector uses size and position parameters recorded in Detection_Parameters and marked `unverified`. A not-found end hole is reported, not invented. | unknown | Req 4 |
| D3 | Axis of the 51 rows and 8 columns on the physical card, and card orientation in the photo | Orientation is determined from evidence or supplied by the user. When the profile field is `unverified` and no Orientation is supplied, the result is `orientation-unresolved`, with no per-cell output. | unknown | Req 4, 5 |
| D4 | Read order over the 400 readable positions | Taken from the profile through the domain `gridToReadIndex`. The detector does not re-implement it. "Bottom-up" meaning (descending `gridRow`) depends on D3. | unknown | Req 5, 10 |
| D5 | Hole size, shape tolerance and spacing in pixels or millimetres | The profile has no physical dimensions. Detection uses size ratios relative to the fitted grid pitch, with tolerances in Detection_Parameters marked `unverified`. No millimetre scale is derived. | unknown | Req 4, 7 |
| D6 | Physical dimensions of the card | Absent. Aspect ratio only. | unknown | Req 4 |
| D7 | Meaning of hole present: `lifted` (Bit 1) or `down` (Bit 0) | Hole_Polarity_Assumption: the explicit default `hole-is-lifted` maps hole present to Bit 1. The value is configurable through the profile or the Detection_Parameters, and a change is a Geometry_Correction. A named, `unverified` field in every Detection_Result. Applied only in the Observation_Mapper. To be checked against the paper. | unknown | Req 8, 10, 12 |
| D8 | Whether holes in real historical cards can be partially obscured by cords, patches or wear in ways the heuristics miss | Quality heuristics are labelled heuristic and measured, not assumed accurate. | not applicable | Req 9, 21 |
| D9 | Whether all historical designs are non-symmetrical | The detector makes no symmetry assumption. | unknown | none |
| D10 | Licence and terms of the Garín5 dataset | Checked before any redistribution. No dataset images are committed by this feature. Bundled samples are synthetic or separately licensed. | unknown | Req 21, 18 |

## Non-functional bounds summary

- Image intake defaults (configurable, starting constraints and not scientifically established): 20 MiB, 8,192 px per side, 33,554,432 px total, minimum 800 px longer side and 200 px shorter side. Working resolution default 2,048 px longer side.
- Detection_Result import: 16 MiB. Correction_Log: 1,000 entries.
- Performance, cancellation latency, main-thread blocking, OpenCV.js asset size, load time and cross-environment tolerance: design defines each budget or tolerance, and measurement on reference hardware validates and reports it. No figure is asserted in this document.
- Numeric thresholds (`noHoleThreshold`, `holeThreshold`, readability, grid-fit, orientation margin, grid-shift tolerance, evidence-match tolerance, Severity): determined by design and empirical testing on a documented tuning split and recorded with the benchmark version. This document fixes none.
- Damage-level definitions, the Occlusion_Cover_Fraction, the `occlusionCoverage` extent and accuracy targets: owned by the `src/benchmark` specification and read as data from the Damage_Level_File. This document fixes none.

## Resolved decisions

1. Intake limits are configurable defaults and starting constraints (requirement 1.1).
2. Detection thresholds are left to design and empirical testing (requirements 5.9, 8.8).
3. Detection carries hole likelihood only. The mapping sets `initial.restorationConfidence` to `null` (not evaluated) for every mapped Cell, never a numeric placeholder (requirements 10.7, 10.8).
4. Hole polarity defaults to `hole-is-lifted`, is configurable, and stays an unverified assumption (requirement 8.11, assumption D7).
5. Performance budgets and cross-environment tolerances are defined in design and validated by measurement (requirements 13.6, 13.14, 15.4, 17.6).
6. Damage levels, the Occlusion_Cover_Fraction, the `occlusionCoverage` extent and accuracy targets belong to the `src/benchmark` specification. Detection reads the Damage_Level_File as data (requirements 21.4, 21.8, 22.7). The placeholder damage-levels file is superseded.
7. Manual corrections have two classes. Geometry_Corrections re-run detection and Cell_Corrections never do. Cell_Corrections carry across re-detection by `readIndex` and are flagged `needs-review` on a mismatch (requirement 12).

## Dependencies for later specs

- `restoration`: consumes the Observation_Mapper output, including `user-edited` cells created from Cell_Corrections, `initial.restorationConfidence: null` (not evaluated; restoration alone sets a numeric restoration confidence), pending `needs-review` Cell_Corrections, the `userConditionOverrides` list and Assistant_Evidence in the card-level detection record. Restoration SHALL read the user condition overrides, SHALL NOT infer over a cell with an applied override silently (any inference there must name the override and be surfaced for review), and SHALL NOT treat the detector's value for that cell as human-confirmed.
- `ui`: provides the two correction flows (geometry flow that re-detects, cell flow that does not), the review screen for `needs-review` Cell_Corrections with old and new evidence, the display of `null` restoration confidence as "not evaluated", the display of user condition overrides (which are not visible in the domain Card alone), the retained previous Detection_Results, the polarity setting and the unverified markers.
- `benchmark` (the FOURTH spec): supplies the Damage_Level_File (damage levels, Occlusion_Cover_Fraction, `occlusionCoverage`), the Deck_Family splits and the accuracy thresholds. Card-detection exports `detect`, the per-cell comparison function and the metric definitions of requirement 21, and the benchmark runner reports official detection numbers using them. Detection never imports `src/benchmark`.
- `ui` (the FIFTH spec) additionally consumes the benchmark's `BrowserReport` files for benchmark results and does not call detection metric functions for benchmark purposes.

## Amendment record

Targeted amendment, made after approval of `benchmark-and-evaluation` (its design section "Amendments to earlier specs", item 1 and item 4). Numbering is unchanged, and two criteria were appended (21.11, 21.12).

- Damage levels, the Occlusion_Cover_Fraction and `occlusionCoverage` are now owned by benchmark requirement 7. Detection reads `data/synthetic/damage-levels.json` as data and validates the benchmark schema (7.3). The placeholder file and marker are superseded. The Occlusion_Cover_Fraction is a per-Cell_Window fraction (initial 0.9, `initial-unconfirmed` until E-2), not a share of all cells occluded. Changed: Introduction scope paragraph, Glossary (three entries added, one extended), 21.4, 21.8, 22.7, Non-functional bounds summary, Resolved decision 6. Reason: one definition of damage levels, no duplicate in two specs.
- The seed-block convention for splits (tuning 1..N, held-out 100000..) is superseded for official reports by the benchmark Deck_Family splits (benchmark requirement 10). Detection tuning reads only the `tuning` role. Changed: 21.3, 21.5, 22.1 (the 20260200 seed block now applies to property tests only). Reason: damaged copies of one design must not cross splits.
- `vision-eval-synthetic` and `vision-eval-real` become thin wrappers over `runBenchmark` or `runDetectionTrack`, and `vision-tune` reads the `tuning` role from a Dataset_Manifest. Detection keeps `detect`, the per-cell comparison function and the requirement 21 metric definitions as the single source for shared metrics. Added: 21.11, 21.12. Reason: one source of reported numbers.
- Dependencies for later specs: benchmark is the fourth spec and the UI the fifth, and the UI consumes `BrowserReport` files. Changed: the `benchmark` bullet and a `ui` addition.
- Not changed: `design.md` and `tasks.md` of this spec. They still carry the placeholder interface and tasks 27, and need a matching edit in their own workflow.

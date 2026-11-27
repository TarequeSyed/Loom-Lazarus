# Requirements Document

## Introduction

This feature delivers the Card_Domain_Library: a pure TypeScript library in `src/domain` that represents historical Jacquard punched cards, ordered decks and a deterministic virtual loom. It is an educational model. It is Jacquard-inspired and makes no claim of compatibility with physical looms.

The library uses a Garín-format Machine_Profile taken from `jacquard-card-format.md`. That file's details are NOT yet verified against Rodas Lorente et al. (2025), https://doi.org/10.1007/s11042-025-20917-9. Some wording elsewhere may call them "verified"; they are not. Therefore every format-specific value (grid size, reserved positions, read order, threads-per-hook, hook-to-warp mapping, mirror handling, dimensions) lives in a Machine_Profile data value, not in code constants. A correction to the profile requires no change to library logic. The representation is extensible so other historical formats can be added as further profiles.

Scope boundaries:
- In scope: domain types, coordinate mappings, cell evidence, edit history, undo and withdrawal of inferences, approval records, deck JSON import/export, loom interpreter, hook-to-warp mappings, pure step/seek API, session log and deterministic replay, bitmap-to-deck generation, SVG export.
- Out of scope: image detection (vision spec), inference of missing cells (restoration spec), damage models (benchmark spec), React UI and animation timers (UI spec), benchmark harness (benchmark spec), physical loom control.

The library imports nothing from `src/vision`, `src/restore`, `src/benchmark`, `src/ui` or `src/workers`. It uses no DOM, no `Date`, no network and no unseeded randomness.

## Glossary

- **Card_Domain_Library**: The pure TypeScript library in `src/domain` specified by this document.
- **Machine_Profile**: A versioned data value describing one machine/card format: grid size, reserved positions, read order, hook mapping options, threads-per-hook default, mirror options, physical dimensions (optional) and a Verification_Status per field.
- **Garín_Profile**: The Machine_Profile instance built from `jacquard-card-format.md` (51 x 8 grid, 8 reserved positions, 400 readable positions, default threads-per-hook 16).
- **Verification_Status**: A per-field marker on a Machine_Profile with `status` (`unverified` or `verified`), a `basis` (`paper-figure`, `geometric-inference` or `unknown`), an optional source citation (page or figure) and an optional human-readable note.
- **Geometric_Inference**: A profile value derived by reasoning from the stated grid geometry, not observed in the paper's figures. Carries `basis` `geometric-inference` and status `unverified`.
- **Grid_Position**: A `(gridRow, gridColumn)` pair addressing one position of the physical grid of one card.
- **Reserved_Position**: A Grid_Position set aside by the Machine_Profile (for example alignment) that never carries a weaving instruction.
- **Readable_Position**: A Grid_Position that is not reserved and carries one weaving instruction.
- **Read_Index**: An integer `readIndex` in `[0, readableCount - 1]` giving the machine read order of a Readable_Position.
- **Physical_Location**: A position on the physical card in millimetres. Distinct from Grid_Position.
- **Fabric_Coordinate**: A `(warpIndex, passIndex)` pair addressing one cell of the rendered cloth.
- **Cell**: The record for one Readable_Position of one card, holding raw observation, effective value, provenance, algorithmic confidence, evidence and history.
- **Raw_Observation**: The value and hole likelihood measured from an image or supplied at import. Never overwritten.
- **Effective_Value**: The bit (`lifted` = 1, `down` = 0) used for weaving, or absent when unknown.
- **Provenance**: One of `observed`, `repeat-inferred`, `symmetry-inferred`, `ambiguous`, `user-edited`.
- **Hole_Likelihood**: Probability in [0, 1] that a hole is present in the image at a position.
- **Restoration_Confidence**: Either a finite number in [0, 1] or `null`. A number is the algorithmic estimate that the Effective_Value is correct, as assigned by inference or import. `null` means "not evaluated": no algorithm has estimated whether the Effective_Value is correct. `0` means an evaluated estimate of zero and is not equivalent to `null`. The field is always present; a missing or `undefined` field is invalid. A separate field from Hole_Likelihood and from Approval_Record. A human action never sets or alters it. The one operation that changes the effective value of the field without a new inference is a Withdrawal, which restores the value (a number or `null`) that the Cell had before the withdrawn inference; it does not compute or set a new value.
- **Evidence**: The algorithmic, human-readable explanation plus structured references supporting a Cell's value or provenance. A user edit never overwrites it.
- **Edit_Note**: A human-written rationale of at most 1,000 characters attached to one user edit entry. Distinct from Evidence.
- **Action_Id**: A caller-supplied string that identifies one recorded action. Unique within a Deck's history and within a Session_Log. Never generated from time or randomness.
- **Sequence_Number**: A positive integer assigned by the Card_Domain_Library to each recorded action, increasing by exactly 1 per action within a Deck history or Session_Log. Replaces any wall-clock timestamp.
- **Edit_History**: An append-only list of recorded entries for one Cell. Entry kinds: `user-edit`, `inference`, `undo`, `withdrawal`. Each entry carries an Action_Id and a Sequence_Number. No entry is ever removed or modified.
- **Previous_Fields**: The fields recorded in an `inference` entry for the state of the Cell immediately before that inference: the earlier Effective_Value (or absent), Provenance, Restoration_Confidence (a number or `null`) and Evidence.
- **Undo_Entry**: An Edit_History entry of kind `undo` that references the Action_Id of the user-edit entry it reverses.
- **Withdrawal_Entry**: An Edit_History entry of kind `withdrawal` that references the Action_Id of the `inference` entry it reverses. It is appended, never replaces or removes the inference entry, and carries the Previous_Fields of the withdrawn inference as the restored state.
- **Withdrawal**: The operation `withdrawInference` that appends a Withdrawal_Entry. Withdrawal is the mechanism for reversing an inference; undo (Undo_Entry) is the mechanism for reversing a user edit.
- **Live_Entry**: An Edit_History entry that is a `user-edit` entry not referenced by any Undo_Entry, or an `inference` entry not referenced by any Withdrawal_Entry. `undo` and `withdrawal` entries are never Live_Entries. The latest Live_Entry of a Cell is the Live_Entry with the highest Sequence_Number.
- **Effective_View**: The current state of a Cell (effective value, provenance, confidence, evidence) and of a Deck (approval) derived from the append-only history, after applying Undo_Entries and Withdrawal_Entries.
- **Card**: One punched card: a grid of Cells under a Machine_Profile.
- **Deck**: An ordered sequence of Cards with an Approval_Record history.
- **Approval_State**: One of `unapproved` or `approved`.
- **Approval_Record**: An entry holding an Approval_State, an Action_Id and a Sequence_Number. The Deck keeps an append-only list of Approval_Records; the last one is the current approval. An Approval_Record appended by a Withdrawal carries the cause label `withdrawal`. Approval is a field separate from Restoration_Confidence.
- **Weft_Colour_Layer**: A user-supplied, separate mapping from pass index to a weft colour and from warp index to a warp colour. Never stored on Cards.
- **Hook_Mapping**: A Machine_Profile entry that defines how a hook (Read_Index) maps to warp thread indices. Variants: `contiguous-visualization` and `repeat`.
- **Contiguous_Visualization_Mapping**: Hook `h` drives the `threadsPerHook` consecutive warp threads `h * threadsPerHook` to `h * threadsPerHook + threadsPerHook - 1`. A display convenience. Not claimed as historical.
- **Repeat_Mapping**: The hook pattern repeats across the warp: hook `h` drives warp threads `h + k * readableCount` for `k` from 0 to `threadsPerHook - 1`. Motivated by Jacquard harness tie-ups, where one hook lifts several warp threads spaced across the width. Not claimed as verified.
- **Loom_Configuration**: Threads-per-hook, hook mapping selection, mirror orientation, Weft_Colour_Layer and the Machine_Profile used for one simulation run.
- **Simulation_State**: An immutable value holding the Deck reference, Loom_Configuration, current pass index, run status and the fabric buffer rendered so far.
- **Fabric_Buffer**: A rectangular array of cells, each `warp-colour` or `weft-colour`, addressed by Fabric_Coordinate.
- **Interpreter**: The Card_Domain_Library component that decodes Cards into lifted hooks and warp threads.
- **Deck_Serializer**: The component that exports and imports Decks as JSON.
- **Deck_Validator**: The component that checks a Deck or imported JSON against schema and limits.
- **Bitmap_Converter**: The component that generates a Deck from a binary bitmap.
- **SVG_Exporter**: The component that serializes a Card or Deck to SVG.
- **Session_Log**: An ordered, versioned record of Session_Actions applied to an initial Deck, optional initial Loom_Configuration and their Machine_Profile.
- **Session_Action**: One recorded operation with `sequence`, `actionId`, `kind`, a `payload` and the `stateDigest` of the Session_State after it.
- **Session_State**: A value holding a Deck and an optional Simulation_State.
- **State_Digest**: A deterministic, non-cryptographic digest of the canonical JSON of a Session_State, computed by a pure function whose algorithm name is stored in the Session_Log.
- **Session_Replayer**: The component that reconstructs the Session_State sequence from a Session_Log.
- **Result**: A discriminated union `{ ok: true, value } | { ok: false, error }` where `error` carries a stable error code and a message. Expected failures never throw.
- **Schema_Version**: An integer `schemaVersion` present on every persisted type.
- **Limits**: Max Deck size 10,000 Cards; max imported JSON size 8 MiB; max bitmap 10,000 rows by 2,048 columns; max threads-per-hook 64; max evidence text and max Edit_Note 1,000 characters each; max Session_Log size 32 MiB; max Session_Log actions 100,000; max fabric size 4,000,000 cells.

## Requirements

### Requirement 1: Versioned domain types

**User Story:** As a library consumer, I want versioned, immutable domain types, so that stored decks stay readable and later specs can rely on stable shapes.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL define Card, Deck, Cell, Evidence, Machine_Profile, Weft_Colour_Layer, Loom_Configuration, Simulation_State, Approval_Record and Session_Log types, each carrying an integer `schemaVersion`.
2. THE Card_Domain_Library SHALL treat every value of these types as immutable, so that each edit operation returns a new value and leaves its input unchanged.
3. THE Card_Domain_Library SHALL return a Result, not throw, for every expected failure (validation, bounds, unsupported version).
4. WHEN a value with an unsupported `schemaVersion` is supplied, THE Deck_Validator SHALL return an error with code `UNSUPPORTED_SCHEMA_VERSION` that names the supplied and supported versions.
5. THE Card_Domain_Library SHALL contain no import from `src/vision`, `src/restore`, `src/benchmark`, `src/ui` or `src/workers`, and no use of DOM APIs, `Date`, network APIs or `Math.random`.
6. THE Card_Domain_Library SHALL provide an automated import-boundary test that fails when any source file in `src/domain` violates criterion 5.
7. THE Card_Domain_Library SHALL identify each Card within a Deck by a caller-supplied string `cardId` that is unique within the Deck, and SHALL NOT generate identifiers from time or randomness.
8. THE Card_Domain_Library SHALL contain no wall-clock time value in any type, and SHALL order recorded actions only by Sequence_Number.

### Requirement 2: Machine profile as data

**User Story:** As a researcher, I want the machine format held as data with verification status, so that unverified values can be corrected without code changes and other formats can be added.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL define a Machine_Profile containing: profile identifier, display name, grid row count, grid column count, list of Reserved_Positions, read-order definition, list of permitted Hook_Mappings, default threads-per-hook, permitted mirror options, optional physical dimensions, and a Verification_Status per field.
2. THE Card_Domain_Library SHALL provide the Garín_Profile with 51 grid rows, 8 grid columns, 8 Reserved_Positions, 400 Readable_Positions, default threads-per-hook 16, and both the `contiguous-visualization` and `repeat` Hook_Mappings as permitted options.
3. THE Garín_Profile SHALL mark every field listed in the "Historical assumptions requiring verification" section as `unverified`.
4. WHEN a Machine_Profile is validated, THE Deck_Validator SHALL confirm that grid rows and grid columns are integers in [1, 256], and that the Reserved_Positions are distinct and lie inside the grid.
5. IF a Machine_Profile has a Readable_Position count that differs from grid rows times grid columns minus the Reserved_Position count, THEN THE Deck_Validator SHALL return error `PROFILE_COUNT_MISMATCH`.
6. WHEN a second Machine_Profile with a different grid size is supplied, THE Card_Domain_Library SHALL create, validate and weave Cards under it without any change to library code.
7. WHERE a Machine_Profile field is marked `unverified`, THE Card_Domain_Library SHALL expose that status, its basis and its note to callers so that UI and exports can display them.
8. THE Deck SHALL record the identifier and `schemaVersion` of the Machine_Profile it was created under, and the Deck_Serializer SHALL embed the full Machine_Profile value in exported JSON.
9. THE Garín_Profile SHALL record the 8 Reserved_Positions with Verification_Status `unverified`, basis `geometric-inference` and a note stating that the location is inferred from the 51 x 8 grid geometry, is a placeholder, and was not observed in the paper's figures.
10. WHEN the Reserved_Positions of a Machine_Profile are replaced with a different valid list in the profile data, THE Card_Domain_Library SHALL recompute the read-order tables, the readable count and every dependent conversion without any change to library code.
11. IF a Machine_Profile marks a field `verified` without a non-empty source citation, THEN THE Deck_Validator SHALL return error `INVALID_PROFILE` naming the field.
12. IF a Machine_Profile fails validation for a reason other than a count mismatch, THEN THE Deck_Validator SHALL return error `INVALID_PROFILE` with a path to the offending field.
13. WHEN a Machine_Profile fails validation, THE Deck_Validator SHALL return the specific error code of the first violation at the top level (for example `PROFILE_COUNT_MISMATCH` or `HOOK_MAPPING_INVALID`) with the full violation report attached, and SHALL use `INVALID_PROFILE` only for violations that have no more specific code.

### Requirement 3: Grid, reserved and readable positions

**User Story:** As a library consumer, I want physical positions, reserved positions and readable instructions kept separate, so that alignment holes are never mistaken for weaving instructions.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL represent the full physical grid (51 x 8 = 408 positions for the Garín_Profile) separately from the list of Readable_Positions (400 for the Garín_Profile).
2. THE Card_Domain_Library SHALL represent each Reserved_Position as a record that is not a Cell and carries no Effective_Value.
3. THE Card_Domain_Library SHALL represent the two larger end holes, if the Machine_Profile declares them, as separate non-grid features that do not change the grid row count.
4. IF a caller addresses a Grid_Position outside the grid, THEN THE Card_Domain_Library SHALL return error `POSITION_OUT_OF_RANGE` and leave the Card unchanged.
5. IF a caller attempts to set an instruction value on a Reserved_Position, THEN THE Card_Domain_Library SHALL return error `RESERVED_POSITION` and leave the Card unchanged.
6. THE Card_Domain_Library SHALL name variables and parameters by coordinate system (`gridRow`, `gridColumn`, `readIndex`, `warpIndex`, `passIndex`) and SHALL NOT accept one system's number where another is expected, as enforced by distinct TypeScript types.
7. THE Card_Domain_Library SHALL define error code `POSITION_OUT_OF_RANGE` as a grid or fabric position out of range, and SHALL return it for a non-integer or out-of-range `gridRow`, `gridColumn` or `warpIndex`, and for a thread offset outside [0, `threadsPerHook`).

### Requirement 4: Coordinate and read-order mappings

**User Story:** As a library consumer, I want explicit, tested conversions between coordinate systems, so that detection, restoration and weaving address the same position consistently.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL provide a function that converts a Readable_Position's Grid_Position to its Read_Index and a function that converts a Read_Index to its Grid_Position, both defined by the Machine_Profile read-order definition.
2. THE Card_Domain_Library SHALL map exactly `readableCount` Readable_Positions to Read_Indices `0` to `readableCount - 1` (0 to 399 for the Garín_Profile), each used once.
3. IF a Grid_Position that is reserved is supplied to the Grid_Position to Read_Index conversion, THEN THE Card_Domain_Library SHALL return error `RESERVED_POSITION`.
4. IF a Read_Index is not an integer in `[0, readableCount - 1]`, THEN THE Card_Domain_Library SHALL return error `READ_INDEX_OUT_OF_RANGE`.
5. WHERE a Machine_Profile declares physical dimensions, THE Card_Domain_Library SHALL provide a Grid_Position to Physical_Location conversion that uses only those declared dimensions.
6. IF a Machine_Profile declares no physical dimensions, THEN THE Card_Domain_Library SHALL return error `PHYSICAL_DIMENSIONS_UNAVAILABLE` for Physical_Location conversions and SHALL NOT estimate them from grid coordinates.
7. THE Card_Domain_Library SHALL provide conversions from (Read_Index, thread offset, `passIndex`, Loom_Configuration) to Fabric_Coordinates, applying the selected Hook_Mapping, threads-per-hook and mirror settings.
8. THE Card_Domain_Library SHALL document the read order implemented for the Garín_Profile (column-by-column, bottom-up, starting at the rightmost column, per `jacquard-card-format.md`) and SHALL cite assumption A4 as unverified.
9. FOR ALL Machine_Profiles that pass validation, converting a Read_Index to a Grid_Position and back SHALL return the original Read_Index, and converting a Readable_Position to a Read_Index and back SHALL return the original Grid_Position (bijection).
10. THE Grid_Position to Physical_Location conversion SHALL use only declared physical dimensions, SHALL take the origin as the centre of grid position (0,0), SHALL increase x with `gridColumn` and y with `gridRow` (row 0 at top as drawn, unverified assumption A3), and SHALL check preconditions in this order: `PHYSICAL_DIMENSIONS_UNAVAILABLE`, then `POSITION_OUT_OF_RANGE`.
11. IF a Read_Index supplied to a conversion is not an integer, THEN THE Card_Domain_Library SHALL return `READ_INDEX_OUT_OF_RANGE`, and IF a `passIndex` supplied to a conversion or seek is not an integer, THEN THE Card_Domain_Library SHALL return `SEEK_OUT_OF_RANGE`.

### Requirement 5: Cell values, provenance, evidence, history, undo and approval

**User Story:** As an archivist, I want raw observations, algorithmic confidence, human decisions and approval kept as separate, auditable facts, so that I can see exactly what was observed, what was inferred and what a person decided.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL store on every Cell: Raw_Observation (value or absent, and Hole_Likelihood in [0, 1] or absent), Effective_Value (0, 1 or absent), Provenance, Restoration_Confidence (a number in [0, 1] or `null`, always present), Evidence, and Edit_History.
2. THE Card_Domain_Library SHALL keep Hole_Likelihood, Restoration_Confidence and Approval_Record as separate fields.
3. THE Card_Domain_Library SHALL accept Provenance only from `observed`, `repeat-inferred`, `symmetry-inferred`, `ambiguous` and `user-edited`.
4. WHEN a Cell has no Raw_Observation and no accepted inference, THE Card_Domain_Library SHALL represent it with Provenance `ambiguous` and an absent Effective_Value.
5. IF Provenance is `repeat-inferred` or `symmetry-inferred`, THEN THE Card_Domain_Library SHALL require non-empty Evidence text of at most 1,000 characters.
6. IF a Cell supplied to the Card_Domain_Library has Provenance `observed` and no Raw_Observation value, THEN THE Deck_Validator SHALL return error `OBSERVED_WITHOUT_OBSERVATION`.
7. IF a Hole_Likelihood value, or a Restoration_Confidence value other than `null`, is outside [0, 1] or is not finite (including `NaN`, `Infinity` and `-Infinity`), THEN THE Deck_Validator SHALL return error `PROBABILITY_OUT_OF_RANGE` naming the Cell.
8. WHEN a caller applies a user edit with an Action_Id, a value and an Edit_Note, THE Card_Domain_Library SHALL return a new Card whose edited Cell has Provenance `user-edited` and the new Effective_Value, and SHALL leave the Raw_Observation, the Restoration_Confidence (including `null`) and the Evidence of that Cell unchanged.
9. WHEN a caller applies a user edit, THE Card_Domain_Library SHALL append to the Cell's Edit_History one `user-edit` entry holding the Action_Id, the Sequence_Number, the earlier Effective_Value, the earlier Provenance, the new value and the Edit_Note.
10. IF a user edit supplies an empty Edit_Note, THEN THE Card_Domain_Library SHALL return error `EDIT_NOTE_REQUIRED`, and IF the Edit_Note exceeds 1,000 characters, THEN THE Card_Domain_Library SHALL return error `EVIDENCE_TOO_LONG`, and in both cases SHALL leave the Card unchanged.
11. IF a caller supplies an Action_Id that already exists in the Deck's history, THEN THE Card_Domain_Library SHALL return error `DUPLICATE_ACTION_ID` and leave the Deck unchanged.
12. WHEN a caller applies a user edit to a Card of an approved Deck, THE Card_Domain_Library SHALL append an Approval_Record with Approval_State `unapproved`, the same Action_Id and a new Sequence_Number, and SHALL leave every Restoration_Confidence (including `null`) unchanged.
13. WHEN a caller undoes the latest user edit of a Cell, THE Card_Domain_Library SHALL append an Undo_Entry that references the Action_Id of the reversed user-edit entry, and SHALL NOT remove or modify any earlier entry.
14. WHEN an Undo_Entry is appended, THE Card_Domain_Library SHALL restore, in the Effective_View, the Effective_Value and Provenance that the Cell had before the reversed edit, and SHALL restore the Deck Approval_State that existed before the reversed edit by appending an Approval_Record carrying that earlier state.
15. IF the latest entry of a Cell's Edit_History is not a `user-edit` entry that has not been reversed, THEN THE Card_Domain_Library SHALL return error `NOTHING_TO_UNDO` and leave the Deck unchanged.
16. THE Card_Domain_Library SHALL restrict undo to `user-edit` entries, and SHALL reverse `inference` entries only through Withdrawal (criteria 26 to 33), never through undo.
17. THE Card_Domain_Library SHALL provide a function that sets an inferred Effective_Value only with Provenance `repeat-inferred`, `symmetry-inferred` or `ambiguous`, an Action_Id, a numeric Restoration_Confidence in [0, 1] and Evidence, and SHALL reject the Provenance `observed` for inference with error `INFERENCE_CANNOT_BE_OBSERVED`.
18. IF the Provenance supplied to an inference function is not one of the five defined Provenance values, THEN THE Card_Domain_Library SHALL return error `INVALID_PROVENANCE`.
18a. IF the Restoration_Confidence supplied to an inference function is `null`, not a number, outside [0, 1] or not finite, THEN THE Card_Domain_Library SHALL return error `PROBABILITY_OUT_OF_RANGE` and leave the Deck unchanged, because an inference is an evaluation.
19. IF a caller applies an inference to a Cell whose Provenance is `user-edited` and whose latest user edit has not been reversed, THEN THE Card_Domain_Library SHALL return error `INVALID_EDIT` and leave the Deck unchanged.
20. IF a caller addresses a `cardId` that is not in the Deck, THEN THE Card_Domain_Library SHALL return error `UNKNOWN_CARD`.
21. THE Card_Domain_Library SHALL record every Deck Approval_State change as an appended Approval_Record, and SHALL treat an `ambiguous` Cell without Effective_Value as blocking approval unless the caller passes an explicit policy that treats it as `down`.
22. WHERE a caller passes the explicit `ambiguous`-as-`down` policy, THE Card_Domain_Library SHALL set the Effective_Value to 0, keep Provenance `ambiguous`, keep the Restoration_Confidence unchanged (including `null`), and record the policy note in the Edit_History entry, not in Evidence.
23. IF approval is requested for a Deck that contains an `ambiguous` Cell without Effective_Value and no explicit policy is supplied, THEN THE Card_Domain_Library SHALL return error `UNRESOLVED_CELLS` listing the Card identifiers and Read_Indices, up to 100 entries plus a total count.
24. WHEN approval is requested with an Action_Id, THE Card_Domain_Library SHALL append an Approval_Record with Approval_State `approved` and SHALL leave every Restoration_Confidence (including `null`), Evidence and Raw_Observation unchanged.
25. THE Card_Domain_Library SHALL expose the Approval_Record history of a Deck, so that the full approval audit trail can be shown without any timestamp.
26. THE Card_Domain_Library SHALL provide a function `withdrawInference` that accepts a `cardId`, a `readIndex` and an Action_Id, and returns a Result of a new Deck.
27. WHEN the inference function of criterion 17 succeeds, THE Card_Domain_Library SHALL append to the Cell's Edit_History an `inference` entry holding the Action_Id, the Sequence_Number, the new value, Provenance, Restoration_Confidence and Evidence, and the Previous_Fields.
28. WHEN `withdrawInference` is called, THE Card_Domain_Library SHALL check in this fixed order and return the first failure, leaving the Deck unchanged: `UNKNOWN_CARD` if the `cardId` is not in the Deck; `READ_INDEX_OUT_OF_RANGE` if `readIndex` is not an integer in `[0, readableCount - 1]`; `DUPLICATE_ACTION_ID` if the Action_Id already exists in the Deck's history; `INVALID_EDIT` if the latest Live_Entry of the Cell is a `user-edit` entry; `NOTHING_TO_WITHDRAW` if the Cell has no Live_Entry, or its latest Live_Entry is not an `inference` entry.
29. WHEN `withdrawInference` succeeds, THE Card_Domain_Library SHALL append a Withdrawal_Entry that holds the new Action_Id, a new Sequence_Number and the Action_Id of the withdrawn `inference` entry, and SHALL NOT remove or modify any earlier entry.
30. WHEN a Withdrawal_Entry is appended, THE Card_Domain_Library SHALL restore, in the Effective_View, the Effective_Value (or its absence), Provenance, Restoration_Confidence (including `null`, never coerced to `0`) and Evidence recorded in the Previous_Fields of the withdrawn inference entry, and SHALL leave the Raw_Observation unchanged.
31. WHEN `withdrawInference` succeeds on a Deck whose current Approval_State is `approved`, THE Card_Domain_Library SHALL append an Approval_Record with Approval_State `unapproved`, cause `withdrawal`, the same Action_Id and a new Sequence_Number, including when the withdrawn inference is the value an earlier approval covered, and WHEN the current Approval_State is `unapproved`, THE Card_Domain_Library SHALL append no Approval_Record.
32. WHEN the latest entry of a Cell's Edit_History is a Withdrawal_Entry, THE Card_Domain_Library SHALL return `NOTHING_TO_UNDO` from the undo function and leave the Deck unchanged, and a user edit applied after a Withdrawal_Entry SHALL record the post-withdrawal Effective_Value and Provenance as its earlier values.
33. WHEN the inference function of criterion 17 is applied to a Cell after a Withdrawal_Entry and no un-reversed user edit protects the Cell, THE Card_Domain_Library SHALL accept the inference as for any other Cell, and THE Card_Domain_Library SHALL provide no operation that reverses a Withdrawal_Entry (a new inference is the way to set a value again).
34. IF the inference function of criterion 17 is called with Provenance `repeat-inferred` or `symmetry-inferred` and no value, or with Provenance `ambiguous` and a value, THEN THE Card_Domain_Library SHALL return `INVALID_PROVENANCE` and leave the Deck unchanged.
35. THE Card_Domain_Library SHALL write an `ambiguous` entry that carries an Effective_Value only through `requestApproval` with the explicit `ambiguous`-as-`down` policy of criterion 22, with the policy note recorded in the entry.
36. IF the inference function of criterion 17 is called on a Cell whose current effective Provenance is `observed`, THEN THE Card_Domain_Library SHALL return error `OBSERVED_CELL_PROTECTED` and leave the Deck unchanged, because only an explicit, recorded user action (`userEdit`) may override an observed value.
37. WHEN the inference function of criterion 17 is called, THE Card_Domain_Library SHALL check in this fixed order and return the first failure: `UNKNOWN_CARD`, then `READ_INDEX_OUT_OF_RANGE`, then `DUPLICATE_ACTION_ID`, then `OBSERVED_CELL_PROTECTED`, then `INVALID_EDIT` (the latest Live_Entry of the Cell is an un-reversed user edit), and the checks of criteria 17, 18, 18a and 34 apply in the position the design assigns to them.
38. WHEN a Cell has Provenance `observed`, a user edit of that Cell has been applied, and that user edit was later undone, THE Card_Domain_Library SHALL treat the Cell as `observed` again in the Effective_View, and the inference function of criterion 17 SHALL return `OBSERVED_CELL_PROTECTED` for it.
39. WHEN `requestApproval` with the explicit `ambiguous`-as-`down` policy writes an entry, THE Card_Domain_Library SHALL check the derived Action_Id `<actionId>#<cardId>#<readIndex>` for uniqueness against the Deck's history like any other Action_Id, and IF the derived Action_Id already exists, THEN THE Card_Domain_Library SHALL return `DUPLICATE_ACTION_ID` and leave the Deck unchanged.

### Requirement 6: Deck structure and validation

**User Story:** As a library consumer, I want invalid decks rejected with specific errors, so that bad data never silently reaches the loom or an export.

#### Acceptance Criteria

1. THE Deck_Validator SHALL check that a Deck has 1 to 10,000 Cards, unique `cardId` values, and that every Card has exactly `readableCount` Cells under the Deck's Machine_Profile.
2. IF a Deck has fewer than 1 or more than 10,000 Cards, THEN THE Deck_Validator SHALL report error `DECK_SIZE_OUT_OF_RANGE`, IF two Cards share a `cardId`, THEN THE Deck_Validator SHALL report error `DUPLICATE_CARD_ID`, and IF a Card has a wrong Cell count, THEN THE Deck_Validator SHALL report error `CELL_COUNT_MISMATCH`.
3. IF a Deck fails validation, THEN THE Deck_Validator SHALL return error `INVALID_DECK` carrying a list of every violation found (up to 100, plus a total count), each with a stable error code, a path to the offending value and a message.
4. IF a Deck fails validation, THEN THE Deck_Validator SHALL return the input value unmodified and SHALL NOT repair, clamp or default any field.
5. THE Deck_Validator SHALL check that the Approval_Record list has contiguous Sequence_Numbers starting at 1 and unique Action_Ids, and that every Edit_History entry has a unique Action_Id and a Sequence_Number consistent with the Deck's sequence.
6. IF an Undo_Entry references an Action_Id that is not an earlier `user-edit` entry of the same Cell, or an entry already reversed, THEN THE Deck_Validator SHALL report error `INVALID_EDIT_HISTORY` with the path of the Undo_Entry.
7. WHEN a caller reorders, inserts, removes or duplicates Cards with an Action_Id, THE Card_Domain_Library SHALL return a new Deck, preserve every Cell's Provenance, Evidence, Restoration_Confidence (including `null`) and Edit_History, and append an Approval_Record with Approval_State `unapproved`.
8. IF a reorder operation names a `cardId` that is absent from the Deck or lists a `cardId` twice, THEN THE Card_Domain_Library SHALL return error `INVALID_REORDER` and leave the Deck unchanged.
9. THE Card_Domain_Library SHALL define the card-to-pass mapping as one Card per weaving pass in Deck order, as the default assumption A8, and SHALL expose it as a field of the Machine_Profile so that repeated or skipped cards can be added later without a schema break.
10. IF an approved Deck contains a Cell without Effective_Value, THEN THE Deck_Validator SHALL report error `UNRESOLVED_CELL` with the Card identifier and Read_Index.
11. IF a Withdrawal_Entry references an Action_Id that is not an earlier `inference` entry of the same Cell, or an `inference` entry already referenced by another Withdrawal_Entry, THEN THE Deck_Validator SHALL report error `INVALID_EDIT_HISTORY` with the path of the Withdrawal_Entry.
12. THE Deck_Validator SHALL apply the Action_Id uniqueness and Sequence_Number consistency rules of criterion 5 to Withdrawal_Entries, and SHALL check that each Withdrawal_Entry's restored fields equal the Previous_Fields of the inference entry it references.
13. IF a Card supplied to `insertCard` or `duplicateCard` has any Cell with a non-empty Edit_History, THEN THE Card_Domain_Library SHALL return `INVALID_EDIT_HISTORY` and leave the Deck unchanged, because copying history would break deck-wide uniqueness of Action_Ids and Sequence_Numbers (criterion 5). A Card with no history SHALL be inserted or duplicated with every field kept.
14. IF the position supplied to `insertCard` is not an integer in [0, card count], THEN THE Card_Domain_Library SHALL return `CARD_INDEX_OUT_OF_RANGE` and leave the Deck unchanged.
15. THE Deck_Validator SHALL return `INVALID_APPROVAL_HISTORY` for an empty Approval_Record list or Approval_Record Sequence_Numbers not contiguous from 1, `DUPLICATE_ACTION_ID` for a duplicate Action_Id anywhere in the Deck, `INVALID_EDIT_HISTORY` for an inconsistent Edit_History Sequence_Number, and the Machine_Profile's own codes (including `HOOK_MAPPING_INVALID`) for profile violations inside a Deck.

### Requirement 7: Deck JSON export and import

**User Story:** As an archivist, I want lossless JSON export and import of decks, so that I can save, share and reload reconstructions with their evidence intact.

#### Acceptance Criteria

1. THE Deck_Serializer SHALL export a valid Deck as JSON text that includes `schemaVersion`, the Machine_Profile, all Cards, all Cell fields (Raw_Observation, Effective_Value, Provenance, Restoration_Confidence, Evidence, Edit_History including Undo_Entries) and the full Approval_Record list.
2. THE Deck_Serializer SHALL produce byte-identical JSON text when exporting equal Decks (stable key order, no timestamps).
3. WHEN valid JSON text produced by the Deck_Serializer is imported, THE Deck_Serializer SHALL return a Deck equal to the exported Deck, with no loss of Provenance, Evidence, Edit_History, Approval_Records or Sequence_Numbers.
4. IF JSON text is larger than 8 MiB, THEN THE Deck_Serializer SHALL return error `INPUT_TOO_LARGE` without parsing it.
5. IF JSON text is not syntactically valid JSON, including text that is truncated, THEN THE Deck_Serializer SHALL return error `INVALID_JSON`.
6. IF imported JSON parses but fails Deck validation, THEN THE Deck_Serializer SHALL return the Deck_Validator violations and SHALL NOT return a partial Deck.
7. IF imported JSON contains fields not defined in the schema, THEN THE Deck_Serializer SHALL return error `UNKNOWN_FIELD` naming the path, and SHALL NOT silently drop them.
8. WHEN JSON with a supported older `schemaVersion` is imported, THE Deck_Serializer SHALL migrate it by a documented, tested pure function and record the migration in the result metadata.
9. THE Deck_Serializer SHALL exclude Weft_Colour_Layer data from Card content, and SHALL export a Weft_Colour_Layer only as a separate, labelled top-level section.
10. FOR ALL valid Decks, exporting, importing and exporting again SHALL produce identical JSON text (round trip).
11. IF the JSON `format` marker is absent or differs from the Deck format name, THEN THE Deck_Serializer SHALL return error `INVALID_FORMAT`.
12. THE Deck_Serializer SHALL write a Restoration_Confidence of `null` as the JSON literal `null`, SHALL read it back as `null`, and SHALL keep it distinct from `0` in export and import.
13. IF an imported Cell lacks the Restoration_Confidence field, THEN THE Deck_Serializer SHALL return the Deck_Validator violations including error `MISSING_REQUIRED_FIELD` with the path of the Cell, and SHALL NOT default the field to `null` or `0`.
14. THE Deck_Serializer SHALL export and import `inference` entries (including Previous_Fields) and Withdrawal_Entries (including the referenced Action_Id and the restored fields) with a stable key order and no loss, and SHALL keep a restored Restoration_Confidence of `null` distinct from `0`.
15. FOR ALL valid Decks whose Edit_History contains Withdrawal_Entries, exporting, importing and exporting again SHALL produce identical JSON text, and the imported Deck SHALL equal the exported Deck.
16. THE Deck_Serializer SHALL carry a single top-level `schemaVersion` in the deck file format, and SHALL end canonical JSON text with exactly one trailing newline (`\n`).
17. THE Card_Domain_Library SHALL keep the canonical JSON writer internal, so that later specs obtain canonical text only through `exportDeckJson`, `exportSessionLog` and `stateDigest`.

### Requirement 8: Loom interpreter

**User Story:** As an educator, I want a deterministic virtual loom that decodes cards into lifted warp threads, so that learners can see how a deck produces a pattern.

#### Acceptance Criteria

1. THE Interpreter SHALL decode each Card into an array of `readableCount` hook states ordered by Read_Index, where Effective_Value 1 is lifted and 0 is down.
2. THE Interpreter SHALL compute, for each pass, the set of lifted hooks and the corresponding lifted warp thread indices, using the Loom_Configuration threads-per-hook and selected Hook_Mapping.
3. THE Loom_Configuration SHALL default threads-per-hook to the Machine_Profile default (16 for the Garín_Profile) and accept integer values in [1, 64].
4. IF threads-per-hook is not an integer in [1, 64], THEN THE Interpreter SHALL return error `INVALID_THREADS_PER_HOOK`.
5. THE Loom_Configuration SHALL require an explicit mirror orientation chosen from the options the Machine_Profile permits (at minimum `none` and `mirrored`), with no default.
6. IF no mirror orientation is supplied, THEN THE Interpreter SHALL return error `MIRROR_NOT_CONFIGURED`.
7. WHERE mirror orientation is `mirrored`, THE Interpreter SHALL reverse the warp thread index order after the Hook_Mapping is applied, as documented, and SHALL NOT alter the Deck.
8. IF the current Deck Approval_State is `unapproved`, THEN THE Interpreter SHALL return error `DECK_NOT_APPROVED` and produce no Fabric_Buffer.
9. IF a Card in an approved Deck has a Cell with an absent Effective_Value, THEN THE Interpreter SHALL return error `UNRESOLVED_CELL` naming the Card and Read_Index.
10. THE Interpreter SHALL execute Cards in Deck order, one Card per pass, per assumption A8.
11. THE Interpreter SHALL compute the warp thread count and the pass count, and SHALL return error `FABRIC_TOO_LARGE` when warp thread count times pass count exceeds 4,000,000 cells.
12. THE Interpreter SHALL render each Fabric_Buffer cell as the warp colour when its warp thread is lifted on that pass and as the weft colour when it is down.
13. THE Interpreter SHALL read colours only from the Weft_Colour_Layer, and WHEN no Weft_Colour_Layer is supplied THE Interpreter SHALL render the Fabric_Buffer with symbolic values `warp` and `weft` and no colours.
14. IF a Weft_Colour_Layer references a pass index or warp index outside the fabric, THEN THE Interpreter SHALL return error `COLOUR_LAYER_OUT_OF_RANGE`, and IF a Weft_Colour_Layer is structurally invalid or lacks a colour for a thread or pass without a default, THEN THE Interpreter SHALL return error `INVALID_COLOUR_LAYER`.
15. THE Interpreter SHALL produce identical output for identical Deck, Machine_Profile and Loom_Configuration values.
16. THE Card_Domain_Library SHALL attach the educational-simulation disclaimer text to every Simulation_State and every Fabric_Buffer result: "Educational Jacquard-inspired simulation. Not compatible with, and does not drive, physical looms."
17. IF the mirror orientation supplied is not among the options the Machine_Profile permits, THEN THE Interpreter SHALL return error `UNSUPPORTED_MIRROR`.
18. THE Interpreter SHALL check preconditions in this fixed order and return the first failure: Loom_Configuration validity, Deck approval, unresolved Cells, fabric size, colour layer.

### Requirement 9: Pure step, pause, seek and reset

**User Story:** As a UI developer, I want the loom exposed as pure state transitions, so that I can animate it with my own timers while the library stays deterministic.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL provide `create`, `step`, `pause`, `resume`, `seek` and `reset` functions that each take a Simulation_State (or, for `create`, a Deck and Loom_Configuration) and return a new Simulation_State or a Result of one, with no timers and no side effects.
2. WHEN `create` is called with an approved Deck and a valid Loom_Configuration, THE Card_Domain_Library SHALL return a Simulation_State with `passIndex` 0 and status `ready`.
3. WHEN `step` is called on a state with `passIndex` less than the pass count and status other than `paused`, THE Card_Domain_Library SHALL return a state advanced by exactly one pass, with the pass result (lifted hooks, lifted warp threads, fabric row) appended.
4. WHEN `step` advances to the pass count, THE Card_Domain_Library SHALL set status `complete`.
5. IF `step` is called on a `complete` state, THEN THE Card_Domain_Library SHALL return error `ALREADY_COMPLETE`, and SHALL leave the supplied state unchanged.
6. WHILE status is `paused`, THE Card_Domain_Library SHALL return error `PAUSED` from `step`, and SHALL leave the supplied state unchanged.
7. WHEN `seek` is called with an integer `passIndex` in `[0, passCount]`, THE Card_Domain_Library SHALL return a state equal to the state reached by `reset` followed by that many `step` calls.
8. IF `seek` is called with a `passIndex` outside `[0, passCount]` or non-integer, THEN THE Card_Domain_Library SHALL return error `SEEK_OUT_OF_RANGE`.
9. WHEN `reset` is called, THE Card_Domain_Library SHALL return a state with `passIndex` 0, an empty fabric and status `ready`.
10. THE Card_Domain_Library SHALL provide a `runToEnd` function that returns the `complete` state for a given Deck and Loom_Configuration.
11. THE Card_Domain_Library SHALL make every Simulation_State serialisable by structured clone.
12. WHEN `pause` is called on a `ready` or `running` state, THE Card_Domain_Library SHALL return the state with status `paused`, and WHEN `resume` is called on a `paused` state, THE Card_Domain_Library SHALL return status `ready` if `passIndex` is 0 and `running` otherwise.
13. THE Card_Domain_Library SHALL provide session replay through Requirement 15, and SHALL NOT define `replay` as an alias of `create`.

### Requirement 10: Card generation from a binary bitmap

**User Story:** As an educator, I want to generate a card deck from a binary pattern, so that I can show how a design becomes punched cards.

#### Acceptance Criteria

1. WHEN a binary bitmap with width equal to the Machine_Profile `readableCount` and height in [1, 10,000] is supplied, THE Bitmap_Converter SHALL return a Deck with one Card per bitmap row, in row order, where bitmap value 1 maps to lifted and 0 to down.
2. THE Bitmap_Converter SHALL set every generated Cell to Provenance `observed`, Raw_Observation equal to the bitmap value, Restoration_Confidence 1 (a supplied bitmap is treated as ground-truth input) and Evidence stating that the value comes from a supplied bitmap, and SHALL create the Deck with an initial Approval_Record of state `unapproved`.
3. THE Bitmap_Converter SHALL document the representable pattern space: bitmaps whose width equals `readableCount`, with Reserved_Positions carrying no data. WHERE threads-per-hook is greater than 1, rendered fabric width is `readableCount` times threads-per-hook, and each hook's value spans its threads according to the selected Hook_Mapping (adjacent threads under Contiguous_Visualization_Mapping, threads spaced `readableCount` apart under Repeat_Mapping).
4. IF the bitmap width differs from `readableCount`, THEN THE Bitmap_Converter SHALL return error `BITMAP_WIDTH_UNSUPPORTED` stating the expected and supplied widths, and SHALL NOT crop, pad or scale.
5. IF the bitmap height is 0 or greater than 10,000, THEN THE Bitmap_Converter SHALL return error `BITMAP_HEIGHT_UNSUPPORTED`.
6. IF a bitmap contains a value other than 0 or 1, or its rows have unequal lengths, THEN THE Bitmap_Converter SHALL return error `BITMAP_NOT_BINARY` naming the first offending row and column.
7. THE Bitmap_Converter SHALL accept the bitmap as a plain array of arrays of numbers and SHALL leave image decoding and thresholding to the caller.
8. WHEN a Deck generated from a bitmap is approved and rendered with threads-per-hook 1, mirror `none` and either Hook_Mapping, THE Interpreter SHALL produce a Fabric_Buffer whose lifted cells equal the bitmap 1 values, row for row.
9. IF the profile `readableCount` is greater than 2,048, THEN THE Bitmap_Converter SHALL return error `BITMAP_WIDTH_UNSUPPORTED`.
10. IF the bitmap is empty, THEN THE Bitmap_Converter SHALL return `BITMAP_HEIGHT_UNSUPPORTED`.

### Requirement 11: SVG export

**User Story:** As an archivist, I want an SVG export of cards with explicit geometry, so that I can inspect and document a reconstruction without being misled about physical readiness.

#### Acceptance Criteria

1. WHEN a caller requests SVG export of a Card or Deck, THE SVG_Exporter SHALL require an explicit scale (a positive finite number), an explicit unit from `px` or `mm`, and a Machine_Profile, and return a Result containing SVG text.
2. IF scale is not a positive finite number or the unit is not `px` or `mm`, THEN THE SVG_Exporter SHALL return error `INVALID_EXPORT_OPTIONS`.
3. IF unit `mm` is requested and the Machine_Profile declares no physical dimensions, THEN THE SVG_Exporter SHALL return error `PHYSICAL_DIMENSIONS_UNAVAILABLE`.
4. THE SVG_Exporter SHALL draw one element per Readable_Position for lifted cells, draw Reserved_Positions as separately identified elements, and write the Machine_Profile identifier, scale, unit and Verification_Status (including basis) of the geometry fields into SVG metadata.
5. THE SVG_Exporter SHALL NOT describe its output as "laser-ready", "cut-ready" or "machine-ready" in file content, metadata, function names or documentation.
6. THE SVG_Exporter SHALL write into every exported SVG a visible text note and a `<desc>` element stating: "Not validated for physical laser cutting or any physical loom. Dimensions are unverified unless marked verified in the Machine_Profile."
7. WHEN the current Deck Approval_State is `unapproved`, THE SVG_Exporter SHALL mark each Card as "unapproved" in the SVG and SHALL label inferred cells as inferred.
8. THE SVG_Exporter SHALL produce byte-identical SVG text for equal inputs.
9. THE Card_Domain_Library SHALL provide a documentation file under `docs` that repeats the criterion 6 caveat, and SHALL provide the caveat text as an exported constant for UI reuse.
10. WHERE the Machine_Profile marks the Reserved_Positions as Geometric_Inference, THE SVG_Exporter SHALL label the reserved elements as "inferred location" in the SVG.
11. THE SVG_Exporter SHALL use the Deck's Machine_Profile for Card export, and IF the export options carry a Machine_Profile with a different `profileId`, THEN THE SVG_Exporter SHALL return `INVALID_FORMAT`.

### Requirement 12: Stable interfaces for later specs

**User Story:** As the author of the vision, restoration, UI and benchmark specs, I want a stable, documented library interface, so that those specs can be built in parallel without changing this library.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL export, from a single index module, all types and functions named in this document, with each exported function documented with its Result error codes.
2. THE Card_Domain_Library SHALL provide to the vision spec: the Machine_Profile, Grid_Position to Read_Index and Physical_Location conversions, and a constructor that creates a Card from per-position Raw_Observation and Hole_Likelihood values and a Restoration_Confidence of `null` (not evaluated) for each Cell.
3. THE Card_Domain_Library SHALL provide to the restoration spec: Cell and Evidence types, a function to set an inferred value with Provenance, Restoration_Confidence and Action_Id, the `withdrawInference` function for reversing an accepted inference, Edit_History operations, Approval_Record accessors, and deck-level accessors that return Cells by `cardId` and Read_Index.
4. THE Card_Domain_Library SHALL provide to the UI spec: the pure Simulation_State transition functions, the Session_Log builder and replay functions, the Fabric_Buffer type, validation error codes with stable messages, the SVG caveat constant, the disclaimer constant, the Verification_Status (status, basis and note) of every profile field, the Approval_Record history, and the Effective_View accessors that show the audit log.
5. THE Card_Domain_Library SHALL provide to the benchmark spec: deterministic Deck equality, a Cell-wise comparison function over two Decks of the same Machine_Profile, and a neutral damage hook point named `deriveDamagedDeck` that accepts a caller-supplied seeded random function and a caller-supplied damage function, together with the canonical JSON, State_Digest and Deck types, and SHALL NOT define any damage model and SHALL NOT create randomness itself.
6. THE Card_Domain_Library SHALL treat a change to any exported signature after design approval as requiring a spec update, and SHALL record the interface version in an exported constant.
7. THE Card_Domain_Library SHALL provide a documented list of all error codes, each stable across minor versions.
8. THE Card_Domain_Library SHALL document the Restoration_Confidence as algorithmic and uncalibrated, with `null` meaning not evaluated, and SHALL carry a deck-level calibration marker with value `uncalibrated` unless a caller supplies a benchmark reference.
9. THE functions `createSession`, `exportDeckJson`, `deriveDamagedDeck` and `compareCells` SHALL return `INVALID_DECK` in the `ReportedError` form, carrying the violation report, and `compareCells` SHALL return `DECK_SHAPE_MISMATCH` for two Decks with different profile identifiers or different `cardId` lists.
10. THE `CellSeed.initial` type SHALL have no `restorationConfidence` field, `createCard` SHALL always write `null`, seeds SHALL carry Provenance `observed` or `ambiguous` only, and a seed with `repeat-inferred`, `symmetry-inferred` or `user-edited` SHALL return `INVALID_PROVENANCE`.
11. THE Card_Domain_Library SHALL return `CARD_INDEX_OUT_OF_RANGE` from `decodeCard` for a Card index outside the Deck.
12. THE exported-surface guard test SHALL record declaration text (parameter and return types), not only export names, so that a changed signature fails the guard.
13. THE exported-surface guard snapshot SHALL be regenerable only by an explicit opt-in, SHALL refuse to regenerate WHEN the `CI` environment variable is set, and SHALL fail the run that regenerates it, so that a changed snapshot never passes silently and must be committed and reviewed as a spec change under criterion 6.

### Requirement 13: Correctness properties and test determinism

**User Story:** As a maintainer, I want property-based tests with deterministic seeds, so that invariants hold and any failure is reproducible.

#### Acceptance Criteria

1. THE Card_Domain_Library test suite SHALL run every fast-check property with an explicit, distinct seed constant and a bounded `numRuns` of at most 500, and SHALL print the seed and the shrunk counterexample on failure.
2. THE Card_Domain_Library test suite SHALL state in each property test the precondition that bounds its generator, for example "for any valid Machine_Profile with 1 to 256 rows and columns".
3. THE Card_Domain_Library test suite SHALL use no `Math.random`, `Date.now` or network access.
4. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL valid Machine_Profiles, the Grid_Position to Read_Index mapping is a bijection between Readable_Positions and `[0, readableCount - 1]`, and an example test for the Garín_Profile with 400 positions.
5. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL valid Machine_Profiles and all Reserved_Positions, no Reserved_Position maps to a Read_Index and no Read_Index maps to a Reserved_Position.
6. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL valid Decks, export then import yields an equal Deck with all Provenance, Evidence, Edit_History, Effective_Values and Approval_Records preserved.
7. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL approved Decks and valid Loom_Configurations, two runs yield deeply equal Simulation_States and Fabric_Buffers.
8. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL approved Decks containing at least two Cards with different bit rows, swapping two Cards with different bit rows changes the Fabric_Buffer rows at exactly those two pass indices, and leaves all other rows unchanged.
9. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL binary bitmaps within the representable pattern space of Requirement 10, bitmap to Deck to approved rendering (threads-per-hook 1, mirror `none`, either Hook_Mapping) reproduces the bitmap, and an example test that unrepresentable bitmaps return the specified errors.
10. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL approved Decks and valid Loom_Configurations, repeated `step` to completion and `runToEnd` yield equal final Simulation_States, and that `seek` to any valid pass equals reset plus that many steps.
11. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL invalid Decks generated by applying one seeded corruption to a valid Deck, validation returns a failure and the input Deck remains deeply equal to a copy taken before validation.
12. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL Cells, applying a user edit and then undoing it restores the prior Effective_Value, Provenance and Approval_State in the Effective_View, leaves Restoration_Confidence (including `null`) and Evidence unchanged throughout, and that raw observations are unchanged by any sequence of edit, undo and inference operations.
13. THE Card_Domain_Library test suite SHALL include a property that Hole_Likelihood values and non-null Restoration_Confidence values accepted by the library are within [0, 1], and that every inferred Cell has non-empty Evidence.
14. THE Card_Domain_Library test suite SHALL include golden tests for the Deck JSON export, the SVG export and a Session_Log of a fixed small Deck, with goldens in version control and a stated reason for any change.
15. THE Card_Domain_Library test suite SHALL include a hook-mapping property that, FOR ALL valid Machine_Profiles with `readableCount` 1 to 64, threads-per-hook in [1, 64] and each permitted Hook_Mapping and mirror option, every hook maps to exactly `threadsPerHook` distinct warp indices, the union over all hooks equals `[0, readableCount * threadsPerHook - 1]` with no overlap, Contiguous_Visualization_Mapping yields consecutive indices per hook, Repeat_Mapping yields indices spaced `readableCount` apart, and mirrored indices equal `warpCount - 1 - w` of the unmirrored indices, with example tests for the Garín_Profile warp count 6,400.
16. THE Card_Domain_Library test suite SHALL include a reserved-position property that, FOR ALL valid Machine_Profiles and all valid replacement Reserved_Position lists, recomputing the profile keeps the bijection of Requirement 4.9, keeps `readableCount` equal to grid rows times grid columns minus the reserved count, and requires no library code change, and an example test that the Garín_Profile Reserved_Positions carry basis `geometric-inference` and status `unverified`.
17. THE Card_Domain_Library test suite SHALL include an undo property that, FOR ALL sequences of up to 20 edit, undo and inference operations on a valid Deck, the Edit_History length never decreases, every earlier entry remains equal, every Undo_Entry references an earlier un-reversed user-edit entry, the Effective_View equals the Effective_View obtained by folding the full history, and Restoration_Confidence (including `null`) is never changed by a user edit or undo.
18. THE Card_Domain_Library test suite SHALL include a replay property that, FOR ALL valid Session_Logs generated by applying up to 30 seeded actions to a valid initial Deck, replaying the log twice yields byte-identical canonical JSON for every Session_State in the sequence, and the State_Digest of every Session_State equals the digest recorded in the log.
19. THE Card_Domain_Library test suite SHALL include corruption-boundary tests that cover, with explicit seeds for the generated cases: truncated JSON text at every generated cut point for the Deck and Session_Log formats, corrupted bytes at generated positions, out-of-range Read_Indices, Grid_Positions, pass indices and seek values, `schemaVersion` mismatch (older supported, newer unsupported, non-integer), and oversize input at exactly the limit and one unit above it for JSON text, Session_Log size, Session_Log action count, Deck card count and fabric size, and each case SHALL assert the specific error code and that no partial value is returned.
20. THE Card_Domain_Library test suite SHALL state, for each invariant and regression test in criteria 15 to 19, the generator precondition and the seed constant in a comment adjacent to the test, and SHALL convert every shrunk counterexample found into a permanent example test.
21. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL valid Decks and Cells with an `inference` entry as latest Live_Entry, `withdrawInference` restores the Effective_View (Effective_Value or its absence, Provenance, Restoration_Confidence including `null`, Evidence) exactly to the Effective_View the Cell had before that inference, and leaves the Raw_Observation unchanged.
22. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL sequences of up to 20 edit, undo, inference and withdrawal operations on a valid Deck, the Edit_History length never decreases, every earlier entry remains equal, every Withdrawal_Entry references an earlier un-withdrawn `inference` entry of the same Cell, and the Effective_View equals the Effective_View obtained by folding the full history.
23. THE Card_Domain_Library test suite SHALL include example tests that a second `withdrawInference` on the same single inference returns `NOTHING_TO_WITHDRAW`, that withdrawal beneath an un-reversed user edit returns `INVALID_EDIT`, that withdrawal after the user edit was undone succeeds, that `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE` and `DUPLICATE_ACTION_ID` are returned in the order of Requirement 5, criterion 28, and that an approved Deck becomes `unapproved` with cause `withdrawal` after a withdrawal.
24. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL valid Decks whose history contains Withdrawal_Entries, export, import and export again yields identical JSON text, and a replay property that Session_Logs containing `withdraw-inference` actions replay twice to byte-identical canonical JSON with State_Digests equal to those recorded, each with an explicit seed and a stated generator precondition.
25. THE Card_Domain_Library test suite SHALL include validator tests, with explicit seeds for generated cases, that a Withdrawal_Entry referencing a missing Action_Id, a `user-edit` entry, an inference of another Cell, a later entry, or an already-withdrawn inference returns `INVALID_EDIT_HISTORY`, and that a duplicate Action_Id or a non-consistent Sequence_Number on a Withdrawal_Entry is reported.
26. A correctness property of this suite MAY consist of several `fc.assert` calls that share the property's seed constant, and non-property tests (generator self-checks and auxiliary writer properties) SHALL use named auxiliary seeds 20260190 to 20260199 recorded in the test seed register.
27. THE Card_Domain_Library test suite SHALL include example tests that the inference function returns `OBSERVED_CELL_PROTECTED` for an `observed` Cell with each of the Provenance values `repeat-inferred`, `symmetry-inferred` and `ambiguous`, that it returns `OBSERVED_CELL_PROTECTED` for an `observed` Cell whose user edit was undone, that `DUPLICATE_ACTION_ID` precedes `OBSERVED_CELL_PROTECTED` and `OBSERVED_CELL_PROTECTED` precedes `INVALID_EDIT`, that a user edit then still overrides the observed Cell, and, with an explicit seed, that a derived Action_Id collision in `requestApproval` returns `DUPLICATE_ACTION_ID` and leaves the Deck unchanged.
28. THE invariant property of criterion 12 SHALL also assert that no call of the inference function, whether it succeeds or fails, ever changes the Effective_Value or Provenance of a Cell whose current effective Provenance is `observed`.
29. THE Card_Domain_Library test suite SHALL include an example test that the surface-guard snapshot regeneration refuses to run when the `CI` environment variable is set, and that a regeneration run fails after writing the snapshot.

### Requirement 14: Hook-to-warp mappings

**User Story:** As a researcher, I want hook-to-warp mappings held as explicit profile data, so that a visualization convenience is never mistaken for a verified historical fact and each mapping's consequences are documented.

#### Acceptance Criteria

1. THE Machine_Profile SHALL list its permitted Hook_Mappings from the variants `contiguous-visualization` and `repeat`, each with its own Verification_Status.
2. THE Loom_Configuration SHALL require an explicit Hook_Mapping selection chosen from the options the Machine_Profile permits, with no default.
3. IF no Hook_Mapping is supplied in the Loom_Configuration, THEN THE Interpreter SHALL return error `HOOK_MAPPING_NOT_CONFIGURED`.
4. IF the selected Hook_Mapping is not among the options the Machine_Profile permits, THEN THE Interpreter SHALL return error `UNSUPPORTED_HOOK_MAPPING`.
5. IF a Hook_Mapping value in a Machine_Profile has an unknown `kind` or invalid parameters, THEN THE Deck_Validator SHALL return error `HOOK_MAPPING_INVALID` with a path to the field.
6. WHERE the selected Hook_Mapping is `contiguous-visualization`, THE Interpreter SHALL assign to hook `h` the warp indices `h * threadsPerHook + k` for `k` from 0 to `threadsPerHook - 1`.
7. WHERE the selected Hook_Mapping is `repeat`, THE Interpreter SHALL assign to hook `h` the warp indices `h + k * readableCount` for `k` from 0 to `threadsPerHook - 1`.
8. THE Interpreter SHALL compute the warp thread count as `readableCount * threadsPerHook` for both Hook_Mappings, and SHALL apply the mirror orientation after the Hook_Mapping.
9. THE Card_Domain_Library SHALL document that neither Hook_Mapping is claimed as verified, that `contiguous-visualization` is a display convenience, that `repeat` is historically motivated by Jacquard harness tie-ups, and that the choice does not alter the Deck.
10. THE Card_Domain_Library SHALL document the following consequences for the Garín_Profile and the Limits, using the fabric cap of 4,000,000 cells: threads-per-hook 16 gives 6,400 warp threads and at most 625 passes; threads-per-hook 10 gives 4,000 warp threads and at most 1,000 passes; threads-per-hook 64 gives 25,600 warp threads and at most 156 passes; threads-per-hook 1 gives 400 warp threads and at most 10,000 passes, which equals the maximum Deck size; and that these numbers are identical for both Hook_Mappings and differ only in which warp threads each hook drives.
11. WHEN a Deck with more passes than the cap allows for the selected threads-per-hook is run, THE Interpreter SHALL return error `FABRIC_TOO_LARGE` stating the warp count, the pass count and the cap.
12. THE Card_Domain_Library SHALL keep default threads-per-hook at 16 in the Garín_Profile and SHALL mark it `unverified` per assumption A5.
13. THE functions `warpCount` and `hookWarpIndices` SHALL return Result values and SHALL NOT throw for expected failures. IF the mapping kind is unknown or not among the profile's `hookMappings`, THEN they SHALL return `UNSUPPORTED_HOOK_MAPPING`, and IF the mirror option is not among the profile's `mirrorOptions`, THEN they SHALL return `UNSUPPORTED_MIRROR`. `HOOK_MAPPING_INVALID` SHALL remain reserved for bad profile data (criterion 5).

### Requirement 15: Session log and deterministic replay

**User Story:** As an archivist and a UI developer, I want an ordered, versioned session log that can be replayed exactly, so that a restoration and weaving session can be audited, shared and reproduced byte for byte.

#### Acceptance Criteria

1. THE Session_Log SHALL contain: a `format` marker, `schemaVersion`, the initial Deck (including its Machine_Profile), an optional initial Loom_Configuration, `digestAlgorithm`, `actionCount`, and an ordered list of Session_Actions.
2. THE Session_Action SHALL contain: `sequence` (contiguous integers starting at 1), a unique `actionId`, a `kind`, a `payload` and the `stateDigest` of the Session_State after the action, and SHALL contain no timestamp.
3. THE Session_Action `kind` SHALL be one of: `user-edit`, `undo-edit`, `set-inferred`, `request-approval`, `revoke-approval`, `withdraw-inference`, `reorder-cards`, `insert-card`, `remove-card`, `duplicate-card`, `sim-create`, `sim-step`, `sim-pause`, `sim-resume`, `sim-seek`, `sim-reset`.
4. THE Card_Domain_Library SHALL provide a pure function that appends one Session_Action to a Session_Log by applying it to the last Session_State, assigning the next Sequence_Number and recording the resulting State_Digest, and returning the new Session_Log or the error of the failed action.
5. WHEN `replay` is called with a valid Session_Log, THE Session_Replayer SHALL apply the Session_Actions in sequence order to the initial Deck and Loom_Configuration and return the ordered list of Session_States (the initial state followed by one state per action), calling only the same pure functions that produced the log.
6. THE Session_Replayer SHALL produce, for equal Session_Logs, Session_State sequences whose canonical JSON serialization is byte-identical across runs.
7. WHEN `replay` applies a Session_Action, THE Session_Replayer SHALL compute the State_Digest of the resulting Session_State and compare it with the recorded `stateDigest`.
8. IF the computed State_Digest differs from the recorded `stateDigest`, THEN THE Session_Replayer SHALL return error `SESSION_DIGEST_MISMATCH` with the path of the first mismatching action, and SHALL NOT return a partial state sequence.
9. IF the Session_Log JSON text is larger than 32 MiB, THEN THE Session_Replayer SHALL return error `INPUT_TOO_LARGE` without parsing it, and IF it is not syntactically valid JSON, including truncated text, THEN THE Session_Replayer SHALL return error `INVALID_JSON`.
10. IF the `actionCount` differs from the number of Session_Actions present, THEN THE Session_Replayer SHALL return error `SESSION_TRUNCATED` stating the declared and present counts.
11. IF the Sequence_Numbers are not contiguous from 1, or an `actionId` is duplicated, THEN THE Session_Replayer SHALL return error `SESSION_SEQUENCE_INVALID` with the path of the first offending action.
12. IF the Session_Log has more than 100,000 Session_Actions, THEN THE Session_Replayer SHALL return error `SESSION_TOO_LARGE`.
13. IF a Session_Action has an unknown `kind` or a payload that fails validation, THEN THE Session_Replayer SHALL return error `SESSION_ACTION_INVALID` with the path of the action.
14. IF applying a Session_Action returns an error, THEN THE Session_Replayer SHALL return error `SESSION_ACTION_FAILED` with the path of the action and the underlying error code, and SHALL NOT skip, repair or reorder the action.
15. IF the `schemaVersion` of a Session_Log is unsupported, THEN THE Session_Replayer SHALL return error `UNSUPPORTED_SCHEMA_VERSION`, and IF the `format` marker or `digestAlgorithm` is unknown, THEN THE Session_Replayer SHALL return error `INVALID_FORMAT`.
16. IF a Session_Log contains fields not defined in the schema, THEN THE Session_Replayer SHALL return error `UNKNOWN_FIELD` naming the path.
17. THE Session_Replayer SHALL validate the initial Deck with the Deck_Validator before applying any action, and SHALL return the Deck_Validator violations if it fails.
18. THE Card_Domain_Library SHALL provide a Session_Log exporter and importer with stable key order, and FOR ALL valid Session_Logs, exporting, importing and exporting again SHALL produce identical JSON text.
19. THE Card_Domain_Library SHALL document the State_Digest algorithm as a deterministic, non-cryptographic checksum for corruption detection, and SHALL NOT describe it as tamper-proof.
20. THE Session_Replayer SHALL leave the Session_Log input unmodified.
21. THE Card_Domain_Library SHALL apply a Session_Action of kind `withdraw-inference` (payload: `cardId`, `readIndex`) by calling `withdrawInference` with the Session_Action's `actionId`, in both the append function of criterion 4 and `replay`, and SHALL include the resulting Withdrawal_Entry and any `withdrawal`-cause Approval_Record in the Session_State and its State_Digest.
22. IF a `withdraw-inference` Session_Action fails during `replay`, THEN THE Session_Replayer SHALL return `SESSION_ACTION_FAILED` with the path of the action and the underlying error code (`UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `INVALID_EDIT` or `NOTHING_TO_WITHDRAW`).
23. THE Session_Log SHALL carry its `initialDeck` with `schemaVersion` on the Deck and on each Card, as the Deck and Card types do, and the digest input of a Simulation_State SHALL replace the Deck snapshot with its `deckDigest`.

### Requirement 16: Stable error registry and corruption boundaries

**User Story:** As a UI and test author, I want every expected failure to have a stable, documented code, so that behaviour at the boundaries is explicit and testable.

#### Acceptance Criteria

1. THE Card_Domain_Library SHALL define one `ErrorCode` registry containing at least the following codes: `UNSUPPORTED_SCHEMA_VERSION`, `INVALID_FORMAT`, `INVALID_PROFILE`, `PROFILE_COUNT_MISMATCH`, `POSITION_OUT_OF_RANGE`, `RESERVED_POSITION`, `READ_INDEX_OUT_OF_RANGE`, `PHYSICAL_DIMENSIONS_UNAVAILABLE`, `OBSERVED_WITHOUT_OBSERVATION`, `PROBABILITY_OUT_OF_RANGE`, `INVALID_PROVENANCE`, `INFERENCE_CANNOT_BE_OBSERVED`, `EDIT_NOTE_REQUIRED`, `EVIDENCE_REQUIRED`, `EVIDENCE_TOO_LONG`, `DUPLICATE_ACTION_ID`, `NOTHING_TO_UNDO`, `INVALID_EDIT`, `INVALID_EDIT_HISTORY`, `UNKNOWN_CARD`, `UNRESOLVED_CELLS`, `UNRESOLVED_CELL`, `MISSING_REQUIRED_FIELD`, `INVALID_DECK`, `DECK_SIZE_OUT_OF_RANGE`, `DUPLICATE_CARD_ID`, `CELL_COUNT_MISMATCH`, `INVALID_REORDER`, `INPUT_TOO_LARGE`, `INVALID_JSON`, `UNKNOWN_FIELD`, `INVALID_THREADS_PER_HOOK`, `MIRROR_NOT_CONFIGURED`, `UNSUPPORTED_MIRROR`, `HOOK_MAPPING_NOT_CONFIGURED`, `UNSUPPORTED_HOOK_MAPPING`, `HOOK_MAPPING_INVALID`, `DECK_NOT_APPROVED`, `FABRIC_TOO_LARGE`, `COLOUR_LAYER_OUT_OF_RANGE`, `INVALID_COLOUR_LAYER`, `ALREADY_COMPLETE`, `PAUSED`, `SEEK_OUT_OF_RANGE`, `BITMAP_WIDTH_UNSUPPORTED`, `BITMAP_HEIGHT_UNSUPPORTED`, `BITMAP_NOT_BINARY`, `INVALID_EXPORT_OPTIONS`, `SESSION_DIGEST_MISMATCH`, `SESSION_TRUNCATED`, `SESSION_SEQUENCE_INVALID`, `SESSION_TOO_LARGE`, `SESSION_ACTION_INVALID`, `SESSION_ACTION_FAILED`, `NOTHING_TO_WITHDRAW`, `DECK_SHAPE_MISMATCH`, `CARD_INDEX_OUT_OF_RANGE`, `INVALID_APPROVAL_HISTORY`, `OBSERVED_CELL_PROTECTED`.
2. THE Card_Domain_Library SHALL give each error code a stable message text and SHALL keep each code's meaning unchanged across minor interface versions.
3. WHEN a function returns an error, THE Card_Domain_Library SHALL leave every input value unchanged and SHALL return no partial result value.
4. THE Card_Domain_Library SHALL provide a test that fails when the error registry and `docs/domain-errors.md` differ.
5. THE Card_Domain_Library SHALL provide at least one example test per error code that triggers that code.

### Requirement 17: Unevaluated confidence (null)

**User Story:** As the author of the card-detection spec, I want to represent "confidence not evaluated" separately from a confidence of zero, so that detected cells are never presented as evaluated restorations.

#### Acceptance Criteria

1. THE Deck_Validator SHALL accept a Restoration_Confidence of `null`, `0` and `1`, and SHALL return `PROBABILITY_OUT_OF_RANGE` for `-0.0001`, `1.0001`, `NaN`, `Infinity` and `-Infinity`.
2. IF a Cell has no Restoration_Confidence field or the value is `undefined`, THEN THE Deck_Validator SHALL return error `MISSING_REQUIRED_FIELD` naming the Cell path, and SHALL NOT treat the missing field as `null`.
3. THE Effective_View SHALL expose Restoration_Confidence with type `number | null`.
4. WHEN a user edit, undo, approval, structure operation or replay is applied, THE Card_Domain_Library SHALL leave each Restoration_Confidence value unchanged, including `null`.
5. THE Interpreter and the SVG_Exporter SHALL produce identical output for Decks that differ only in Restoration_Confidence values.
6. THE Card_Domain_Library test suite SHALL include a property that, FOR ALL valid Decks whose Restoration_Confidence values are drawn from `null` and numbers in [0, 1], export then import then export preserves each value exactly, never coerces `null` to `0` or `0` to `null`, and that validator example tests cover `null`, `0`, `1`, `-0.0001`, `1.0001` and `NaN`, with an explicit seed and the generator precondition stated beside the test.
7. THE Card_Domain_Library test suite SHALL include an example test that the inference function rejects a `null` confidence with `PROBABILITY_OUT_OF_RANGE`, and a golden test showing a `null` confidence in the canonical Deck JSON.
8. WHEN a user edit, undo, approval, structure operation or replay is applied, the unchanged-confidence rule of criterion 4 holds, and WHEN a Withdrawal is applied, THE Card_Domain_Library SHALL change the Restoration_Confidence of the Cell only by restoring the value in the Previous_Fields of the withdrawn inference (a number or `null`), and SHALL leave the Restoration_Confidence of every other Cell unchanged.

## Dependencies for later specs

Final spec order: 1 card-domain-and-loom-engine (this spec), 2 card-detection, 3 restoration-engine, 4 benchmark-and-evaluation, 5 UI.

- The benchmark-and-evaluation spec (4) SHALL consume from this library the neutral `deriveDamagedDeck` hook (which accepts a caller-supplied damage function and a caller-supplied seeded random function, and keeps no damage models in the domain), the canonical JSON, the State_Digest and the Deck types.
- The UI spec (5) SHALL consume the benchmark spec's `BrowserReport` for benchmark results, and SHALL NOT call detection or restoration metric functions for benchmark purposes.
- The card-detection spec SHALL map every detected cell with `restorationConfidence` set to `null` (detection observes holes and does not evaluate restoration correctness). Only the restoration spec sets a numeric Restoration_Confidence, through the inference function.
- The restoration spec SHALL undo an accepted or selected inference by calling `withdrawInference` (Requirement 5, criteria 26 to 33), and SHALL NOT use the user-edit undo for inferences. This replaces the earlier restoration fallback error `DOMAIN_AMENDMENT_REQUIRED`.

## Historical assumptions requiring verification

The following items come from `jacquard-card-format.md` and are NOT verified against Rodas Lorente et al. (2025). Each is stored as `unverified` in the Garín_Profile with a `basis`. Until an item is checked, code that depends on it SHALL carry a comment pointing to `jacquard-card-format.md`, and UI and exports SHALL show the unverified status and basis. When an item is checked, the page or figure that confirms it SHALL be recorded in the Machine_Profile and in `jacquard-card-format.md`.

| ID | Item | Current working value (unverified) | Basis | Affects |
|----|------|------------------------------------|-------|---------|
| A1 | The eight central alignment positions | Eight reserved positions in the central area of the grid. The Garín_Profile uses a placeholder location, labelled as inferred from the 51 x 8 geometry and not observed in the paper. Correctable in profile data only. | geometric-inference | Req 2, 3, 4, 11 |
| A2 | Two larger end holes | Separate from the instruction grid; placement and effect on the 51-row count not confirmed | unknown | Req 3, 11 |
| A3 | Axis of 51 rows and 8 columns on the physical card, and photo orientation | 51 rows by 8 columns in grid coordinates; physical axis not confirmed | unknown | Req 3, 4, 11 |
| A4 | Read-order mapping onto the 400 readable positions | Column by column, bottom-up, starting at the rightmost column, skipping reserved positions; the exact handling of the reserved positions is not confirmed | unknown | Req 4, 8 |
| A5 | Threads-per-hook semantics | Default 16; meaning, reason for 16 and mapping from read order to warp threads not confirmed | unknown | Req 4, 8, 10, 14 |
| A6 | Mirror handling | Explicit per run; whether it belongs to the machine or the design is not confirmed | unknown | Req 8 |
| A7 | Whether all designs may be non-symmetrical | Do not assume symmetry | unknown | Req 8 |
| A8 | Card-to-pass mapping | One Card per pass in Deck order; repeated or skipped cards not confirmed | unknown | Req 6, 8 |
| A9 | Physical dimensions and hole sizes | Unknown; required before any physical export claim | unknown | Req 4, 11 |
| A10 | Licence and terms of the Garín5 dataset | Unknown; no dataset samples are redistributed by this feature | unknown | Out of this feature |
| A11 | Which Hook_Mapping applies: `contiguous-visualization` or `repeat` | Both offered; the loom configuration must pick one explicitly; neither claimed as historical fact | repeat: historical motivation only; contiguous: visualization convenience | Req 8, 10, 14 |

Consequence of A4, A5 and A11: with 400 hooks and 16 threads per hook, both mappings imply 6,400 warp threads and a cap of 625 passes under the 4,000,000-cell limit (see Requirement 14, criterion 10). The 16 may instead be a property of the machine's hook-to-thread arrangement. Design must treat the hook-to-warp mapping as profile data and must not hard-code this product.

## Non-functional bounds summary

- Max Deck size: 10,000 Cards. Max imported Deck JSON size: 8 MiB. Max Session_Log size: 32 MiB. Max Session_Log actions: 100,000. Max fabric size: 4,000,000 cells. Max threads-per-hook: 64. Max bitmap: 10,000 rows. Max evidence text and Edit_Note: 1,000 characters each. Max listed violations: 100, plus a total count.
- Performance targets are deferred to design, to be measured rather than asserted.


## Amendment record

### G1 review resolutions

Source: `docs/reviews/2026-11-26-g1-domain-interface.md`. Numbering is unchanged; new criteria are appended at the end of the requirement named. Each decision was approved by the orchestrator on the user's instruction.

| Review item | Decision | Recorded in |
|----|----|----|
| B-1 | `warpCount` and `hookWarpIndices` return Result; unsupported mapping or mirror codes | Req 14.13 |
| B-2 | `INVALID_DECK` returned with the report; new code `DECK_SHAPE_MISMATCH` | Req 12.9, 16.1 |
| S-1 | `setInferred` value rules; ambiguous value only via policy approval | Req 5.34, 5.35 |
| S-2 | Insert or duplicate rejects Cards with history; new code `CARD_INDEX_OUT_OF_RANGE` | Req 6.13, 6.14, 12.11, 16.1 |
| S-3 | Seeds carry no confidence and only observed or ambiguous provenance | Req 12.10 |
| S-4 | Embedded deck schemaVersion; simulation digest uses deckDigest | Req 7.16, 15.23 |
| S-5 | Canonical writer internal; one trailing newline | Req 7.16, 7.17 |
| S-7 | `gridToPhysical` origin, axes and check order | Req 4.10 |
| S-8, N-1 | Non-integer inputs use the range codes; `POSITION_OUT_OF_RANGE` definition; empty bitmap; SVG profile | Req 3.7, 4.11, 10.10, 11.11 |
| S-9 | New code `INVALID_APPROVAL_HISTORY` and validator code assignments | Req 6.15, 16.1 |
| S-10 | Profile violations return the specific code with report | Req 2.13 |
| N-4 | Seed rule for multi-assert properties and auxiliary seeds | Req 13.26 |
| N-5 | Surface guard records declaration text | Req 12.12 |

Not amended (design or later-task matters): S-6, N-2, N-3, N-6, N-7.

### G1 review round 2 resolutions

Source: `docs/reviews/2026-11-26-g1-domain-interface-r2.md`. Numbering is unchanged; new criteria are appended at the end of the requirement named. Only the items below are amended here; the other round 2 findings (R2-1, R2-3, R2-4, R2-6, R2-7, R2-8) are documentation or design matters and are not amended in this document.

| Review item | Decision | Recorded in |
|----|----|----|
| R2-5 | `setInferred` on an `observed` cell returns new code `OBSERVED_CELL_PROTECTED`; check order fixed; tests and invariant clause | Req 5.36 to 5.38, 13.27, 13.28, 16.1 |
| R2-9 | Derived `requestApproval` Action_Ids are checked for uniqueness; collision returns `DUPLICATE_ACTION_ID` | Req 5.39, 13.27 |
| R2-2 | Surface snapshot regenerable only by explicit opt-in, refused under `CI`, and the regeneration run still fails | Req 12.13, 13.29 |

# Requirements Document

## Introduction

Loom Lazarus is a Jacquard-inspired educational tool. The Loom_Engine converts a bounded two-state Pattern into an editable Deck of Cards, interprets the Deck deterministically into Cloth, supplies pass-by-pass results for animation, and feeds digital exporters. The model is deliberately simplified: two thread states (lifted or down), one Card per weft Pass, and no tie-ups, harnesses, float rules, selvedges, density, or tension physics. The product is an educational model and makes no claim of compatibility with any physical loom, card format, or controller.

This document covers the pure engine, the exporters and importer, the animation behavior that consumes engine output, the mandatory disclaimer, and the engine/interface separation.

### Fixed conventions

- Warp threads are indexed left to right, 0 to W-1. Passes and Cards are indexed in reading order, 0 to H-1.
- Bit 1 means hole, lifted. Bit 0 means no hole, down.
- Cloth cell (x, y) shows the Warp_Color when thread x is lifted on Pass y, and the Weft_Color when thread x is down on Pass y.
- Cloth row y is the visual row for Pass y. Row 0 is the first Pass woven.

### Bounds summary

| Item | Minimum | Maximum |
|---|---|---|
| Pattern width W | 1 | 64 |
| Pattern height H | 1 | 64 |
| Deck length (Cards) | 1 | 64 |
| Card width | equals Deck width W | equals Deck width W |
| Animation speed (Passes per second) | 1 | 30 |
| Imported deck JSON text size | 1 byte | 262144 bytes (256 KiB) |

## Glossary

- **Loom_Engine**: The pure TypeScript module in `src/engine/` containing validation, conversion, editing, and interpretation. It has no DOM, timers, randomness, I/O, or `Date`.
- **Pattern**: A rectangular grid of W by H bits, where each bit is 0 or 1.
- **Pattern_Validator**: The Loom_Engine function that checks a Pattern against the bounds and returns a Result.
- **Pattern_Parser**: The function that parses Pattern_Text into a Pattern.
- **Pattern_Printer**: The function that formats a Pattern into Pattern_Text.
- **Pattern_Text**: A text form of a Pattern with H lines, each line holding W characters from `0` and `1`, lines separated by a single `\n`.
- **Card**: A bit row of width W. A bit of 1 is a hole (lift the warp thread). A bit of 0 is no hole (leave the warp thread down).
- **Deck**: An immutable ordered sequence of H Cards, all of width W, carrying a `schemaVersion`.
- **Converter**: The Loom_Engine functions that convert a Pattern into a Deck and a Deck into a Pattern.
- **Deck_Editor**: The Loom_Engine functions that edit a Deck. Each edit returns a new Deck in a Result.
- **Interpreter**: The Loom_Engine function that computes Pass_Results and Cloth from a Deck and Weave_Options.
- **Weave_Options**: The Interpreter input holding Warp_Color and Weft_Color.
- **Warp_Color**: A color in the form `#RRGGBB` shown where a warp thread is lifted. Default `#1F3A5F`.
- **Weft_Color**: A color in the form `#RRGGBB` shown where a warp thread is down. Default `#F2E8CF`.
- **Pass**: One weft traverse, controlled by one Card.
- **Pass_Result**: The Interpreter output for one Pass: the Pass index, the lifted or down state of each warp thread, and the Cloth row for that Pass.
- **Cloth**: The W by H grid of cells produced by interpreting a whole Deck.
- **Result**: A value that is either `{ ok: true, value }` or `{ ok: false, error }`, where `error` has a discriminated `code`.
- **Animation_Controller**: The UI-layer component that reveals Pass_Results over time. It owns all scheduling.
- **Playback_State**: One of `stopped`, `playing`, `paused`, or `complete`.
- **Exporter**: A pure serializer in `src/exporters/` from engine types to a string or bytes.
- **Deck_JSON**: The canonical JSON text form of a Deck produced by the Deck_Exporter.
- **Deck_Importer**: The function that parses and validates Deck_JSON into a Deck.
- **Disclaimer**: The text "Loom Lazarus uses an explicitly simplified educational loom model. It is Jacquard-inspired and makes no claim of compatibility with any physical industrial loom, card format, or controller."
- **UI**: The code in `src/ui/` that renders, edits, schedules animation, and triggers file downloads.
- **Import_Boundary_Check**: An automated test or lint rule that verifies the allowed dependency direction `ui -> exporters -> engine`.

## Requirements

### Requirement 1: Pattern Input and Validation

**User Story:** As a student, I want to enter a two-state pattern and get clear feedback when it is invalid, so that I can fix mistakes before weaving.

#### Acceptance Criteria

1. WHEN a Pattern with W from 1 to 64 and H from 1 to 64, with every bit equal to 0 or 1, is submitted, THE Pattern_Validator SHALL return an ok Result containing the Pattern.
2. IF the Pattern width W is less than 1 or greater than 64, THEN THE Pattern_Validator SHALL return an error Result with code `WIDTH_OUT_OF_BOUNDS`.
3. IF the Pattern height H is less than 1 or greater than 64, THEN THE Pattern_Validator SHALL return an error Result with code `HEIGHT_OUT_OF_BOUNDS`.
4. IF the rows of a submitted Pattern do not all have the same length, THEN THE Pattern_Validator SHALL return an error Result with code `RAGGED_ROWS` and the index of the first row whose length differs from row 0.
5. IF a Pattern cell holds a value other than 0 or 1, THEN THE Pattern_Validator SHALL return an error Result with code `INVALID_CELL_VALUE` and the row and column of the first offending cell in row-major order.
6. WHEN Pattern_Text is submitted, THE Pattern_Parser SHALL parse the text into a Pattern and pass the Pattern to the Pattern_Validator.
7. IF Pattern_Text contains a character other than `0`, `1`, and `\n`, THEN THE Pattern_Parser SHALL return an error Result with code `INVALID_CHARACTER` and the line and column of the first offending character.
8. WHEN a Pattern is valid, THE Pattern_Printer SHALL format the Pattern into Pattern_Text.
9. FOR ALL valid Patterns, parsing the output of the Pattern_Printer SHALL produce a Pattern equal to the original (round-trip property).
10. WHEN the Pattern_Validator rejects input, THE Loom_Engine SHALL return the error Result without throwing an exception and without modifying any existing Pattern or Deck.

### Requirement 2: Pattern-to-Deck Conversion

**User Story:** As a student, I want each pattern row turned into one punched card, so that I can see how a picture becomes loom instructions.

#### Acceptance Criteria

1. WHEN a valid Pattern of W by H is converted, THE Converter SHALL produce a Deck of exactly H Cards, each of width W, with `schemaVersion` set to 1.
2. THE Converter SHALL map Pattern bit 1 to a Card hole (lifted) and Pattern bit 0 to a Card with no hole (down).
3. THE Converter SHALL order Cards so that Card y is derived from Pattern row y, with Pattern row 0 as the first Pass.
4. WHEN a valid Deck is converted back, THE Converter SHALL produce a Pattern whose cell (x, y) equals bit x of Card y.
5. FOR ALL valid Patterns, converting the Pattern to a Deck and back to a Pattern SHALL produce a Pattern equal to the original (round-trip property).
6. FOR ALL valid Decks, converting the Deck to a Pattern and back to a Deck SHALL produce a Deck equal to the original (round-trip property).
7. IF the Converter receives a Pattern that fails validation, THEN THE Converter SHALL return the validation error Result unchanged.
8. IF the Converter receives a Deck that fails validation, THEN THE Converter SHALL return an error Result with the code produced by Deck validation defined in Requirement 3.

### Requirement 3: Deck Model and Validation

**User Story:** As a student, I want the deck to always be well-formed, so that every card and pass can be inspected without surprises.

#### Acceptance Criteria

1. THE Loom_Engine SHALL represent every Deck, Card, and Pattern as immutable data.
2. THE Loom_Engine SHALL include a `schemaVersion` field in every Deck.
3. WHEN a Deck is validated, THE Loom_Engine SHALL accept the Deck only if the Deck has from 1 to 64 Cards, a width W from 1 to 64, every Card has exactly W bits, and every bit is 0 or 1.
4. IF a Deck has zero Cards or more than 64 Cards, THEN THE Loom_Engine SHALL return an error Result with code `DECK_LENGTH_OUT_OF_BOUNDS`.
5. IF a Deck has a width less than 1 or greater than 64, THEN THE Loom_Engine SHALL return an error Result with code `WIDTH_OUT_OF_BOUNDS`.
6. IF a Card in a Deck has a width different from the Deck width, THEN THE Loom_Engine SHALL return an error Result with code `CARD_WIDTH_MISMATCH` and the index of the first offending Card.
7. IF a Deck has a `schemaVersion` other than 1, THEN THE Loom_Engine SHALL return an error Result with code `UNSUPPORTED_SCHEMA_VERSION`.

### Requirement 4: Deck Editing

**User Story:** As a hobbyist, I want to toggle holes and rearrange cards, so that I can see how changing the deck changes the cloth.

#### Acceptance Criteria

1. WHEN a toggle is requested for card index y from 0 to H-1 and thread index x from 0 to W-1, THE Deck_Editor SHALL return a new Deck in which bit x of Card y is inverted and every other bit is unchanged.
2. WHEN a Card replacement is requested for card index y and a replacement Card of width W, THE Deck_Editor SHALL return a new Deck in which Card y equals the replacement Card and every other Card is unchanged.
3. WHEN an insert is requested at index i from 0 to H inclusive with a Card of width W and the Deck has fewer than 64 Cards, THE Deck_Editor SHALL return a new Deck of H+1 Cards in which the new Card is at index i and the former Cards at index i and above are shifted by one index in the same order.
4. WHEN a delete is requested for card index y and the Deck has more than 1 Card, THE Deck_Editor SHALL return a new Deck of H-1 Cards with Card y removed and the remaining Cards in the same relative order.
5. WHEN a reorder is requested moving the Card at index from to index to, with both indices from 0 to H-1, THE Deck_Editor SHALL return a new Deck with the same Cards, with the moved Card at index to and the remaining Cards in the same relative order.
6. IF an edit references a card index or thread index outside its valid range, THEN THE Deck_Editor SHALL return an error Result with code `INDEX_OUT_OF_RANGE`.
7. IF an insert is requested on a Deck that already has 64 Cards, THEN THE Deck_Editor SHALL return an error Result with code `DECK_LENGTH_OUT_OF_BOUNDS`.
8. IF a delete is requested on a Deck that has exactly 1 Card, THEN THE Deck_Editor SHALL return an error Result with code `DECK_LENGTH_OUT_OF_BOUNDS`.
9. IF an inserted or replacement Card has a width different from the Deck width, THEN THE Deck_Editor SHALL return an error Result with code `CARD_WIDTH_MISMATCH`.
10. WHEN the Deck_Editor returns an error Result, THE Deck_Editor SHALL leave the input Deck unchanged.
11. WHEN any edit succeeds, THE Deck_Editor SHALL leave the input Deck unchanged and return a Deck that passes Deck validation.
12. FOR ALL valid Decks and valid toggle edits, toggling the same bit twice SHALL produce a Deck equal to the original (idempotence of paired edits).
13. FOR ALL valid Decks and valid toggle edits at (x, y), the Cloth of the edited Deck SHALL differ from the Cloth of the original Deck at cell (x, y) only (edit locality).
14. FOR ALL valid Decks and valid reorder edits, the multiset of Cards in the edited Deck SHALL equal the multiset of Cards in the original Deck.

### Requirement 5: Deterministic Interpretation

**User Story:** As a student, I want the same deck to always produce the same cloth, so that I can trust what I see.

#### Acceptance Criteria

1. WHEN a valid Deck and valid Weave_Options are interpreted, THE Interpreter SHALL return an ok Result containing H Pass_Results in Card order and a Cloth of W by H cells.
2. THE Interpreter SHALL set the state of warp thread x in Pass_Result y to lifted when bit x of Card y is 1, and to down when bit x of Card y is 0.
3. THE Interpreter SHALL set the Cloth cell (x, y) to the Warp_Color when warp thread x is lifted on Pass y, and to the Weft_Color when warp thread x is down on Pass y.
4. WHERE Weave_Options are not supplied, THE Interpreter SHALL use the default Warp_Color `#1F3A5F` and the default Weft_Color `#F2E8CF`.
5. IF a Warp_Color or Weft_Color is not a string of the form `#RRGGBB` with hexadecimal digits, THEN THE Interpreter SHALL return an error Result with code `INVALID_COLOR`.
6. IF the Deck fails Deck validation, THEN THE Interpreter SHALL return the validation error Result without producing partial output.
7. FOR ALL valid Decks and valid Weave_Options, interpreting the same inputs twice SHALL produce deeply equal results (determinism).
8. FOR ALL valid Decks, the Cloth cell (x, y) SHALL equal the Warp_Color if and only if bit x of Card y is 1 (cloth cell = lifted ? warp color : weft color).
9. FOR ALL valid Decks, Cloth row y SHALL depend only on Card y and the Weave_Options (pass independence).
10. THE Interpreter SHALL compute every Pass_Result without reading a clock, a random source, global mutable state, or any input other than the Deck and Weave_Options.
11. THE Loom_Engine SHALL expose Pass_Results as a precomputed sequence or as a pull-based function of (Deck, Weave_Options, pass index) so that the Animation_Controller can obtain any Pass_Result by index.

### Requirement 6: Animation of Weaving Passes

**User Story:** As a curious visitor, I want to watch the cloth appear one pass at a time, so that I can see how each card shapes a row.

#### Acceptance Criteria

1. WHEN the user starts playback from the `stopped` state, THE Animation_Controller SHALL enter the `playing` state and reveal Pass_Results in order starting at Pass 0, using only Pass_Results obtained from the Interpreter.
2. WHILE the Playback_State is `playing`, THE Animation_Controller SHALL reveal one Pass_Result per interval of 1000 divided by the speed setting in milliseconds, with a tolerance of 50 ms.
3. WHEN the user pauses playback, THE Animation_Controller SHALL enter the `paused` state and stop revealing Pass_Results while retaining the current Pass index.
4. WHEN the user resumes playback from the `paused` state, THE Animation_Controller SHALL enter the `playing` state and continue from the retained Pass index.
5. WHEN the user requests a step while the Playback_State is `stopped` or `paused` and the current Pass index is less than H, THE Animation_Controller SHALL reveal exactly one next Pass_Result.
6. WHEN the user sets the speed to an integer from 1 to 30 Passes per second, THE Animation_Controller SHALL apply the new speed to the next reveal interval.
7. IF the user sets a speed that is not an integer from 1 to 30, THEN THE Animation_Controller SHALL keep the previous speed and display an error message naming the allowed range.
8. WHEN the last Pass_Result (index H-1) is revealed, THE Animation_Controller SHALL enter the `complete` state.
9. WHEN the user requests a reset, THE Animation_Controller SHALL clear the revealed Cloth rows, set the current Pass index to 0, and enter the `stopped` state.
10. WHEN the Deck changes while the Playback_State is `playing` or `paused`, THE Animation_Controller SHALL reset playback as specified in criterion 9 and re-obtain Pass_Results from the Interpreter.
11. FOR ALL valid Decks and any sequence of play, pause, step, and speed operations that reveals all H Passes, THE revealed Cloth SHALL equal the Cloth returned by the Interpreter for the same Deck and Weave_Options (animation consistency).
12. THE Animation_Controller SHALL display, for the Pass being revealed, the Pass index, the Card bits, and the lifted or down state of each warp thread.

### Requirement 7: Digital Exports

**User Story:** As a hobbyist, I want to save my deck, pattern, and cloth as files, so that I can keep and share my work.

#### Acceptance Criteria

1. WHEN a valid Deck is exported as Deck_JSON, THE Deck_Exporter SHALL produce canonical JSON text containing `schemaVersion`, `width`, `height`, `cards`, and a `disclaimer` field holding the Disclaimer text.
2. THE Deck_Exporter SHALL write each Card in Deck_JSON as a string of W characters from `0` and `1`, in Card order.
3. WHEN a valid Pattern is exported, THE Pattern_Exporter SHALL produce the Pattern_Text of the Pattern preceded by no additional header lines, and SHALL also support a JSON form containing `schemaVersion`, `width`, `height`, `rows`, and the `disclaimer` field.
4. WHEN a valid Deck and valid Weave_Options are exported as SVG, THE SVG_Exporter SHALL produce an SVG document with W by H square cells, each filled with the Cloth color for that cell, and a `<desc>` element containing the Disclaimer text.
5. WHEN a valid Deck and valid Weave_Options are exported as PNG, THE PNG_Exporter SHALL produce PNG bytes of an image with W by H cells of equal pixel size, each cell colored with the Cloth color for that cell, and SHALL embed the Disclaimer text in a PNG text chunk.
6. THE SVG_Exporter and PNG_Exporter SHALL use a cell size from 1 to 32 pixels, with a default of 8 pixels.
7. IF an Exporter receives a Deck, Pattern, or Weave_Options that fails validation, THEN THE Exporter SHALL return an error Result with the validation error code and produce no output.
8. IF a requested cell size is not an integer from 1 to 32, THEN THE SVG_Exporter and PNG_Exporter SHALL return an error Result with code `INVALID_CELL_SIZE`.
9. FOR ALL valid inputs, exporting the same inputs twice SHALL produce byte-identical output (export determinism).
10. THE Exporters SHALL be pure functions with no DOM, file system, network, or `Date` access, and the UI SHALL perform the browser download.
11. THE Exporters SHALL produce SVG output matching committed golden example files for a fixed set of sample Decks (golden tests).

### Requirement 8: Deck Import and Round Trip

**User Story:** As a hobbyist, I want to reload a saved deck, so that I can continue editing later.

#### Acceptance Criteria

1. WHEN Deck_JSON text of 1 to 262144 bytes is imported, THE Deck_Importer SHALL parse the text, validate the Deck against Requirement 3, and return an ok Result containing the Deck.
2. IF the text is larger than 262144 bytes, THEN THE Deck_Importer SHALL return an error Result with code `INPUT_TOO_LARGE` without parsing the text.
3. IF the text is not valid JSON, THEN THE Deck_Importer SHALL return an error Result with code `INVALID_JSON`.
4. IF a required field (`schemaVersion`, `width`, `height`, `cards`) is missing or has the wrong type, THEN THE Deck_Importer SHALL return an error Result with code `INVALID_DECK_SHAPE` and the name of the first offending field.
5. IF the imported Deck fails Deck validation, THEN THE Deck_Importer SHALL return the Deck validation error Result.
6. IF a Card string contains a character other than `0` and `1`, THEN THE Deck_Importer SHALL return an error Result with code `INVALID_CELL_VALUE` and the Card index.
7. THE Deck_Importer SHALL ignore the `disclaimer` field when building the Deck, and SHALL ignore unknown additional fields.
8. FOR ALL valid Decks, exporting the Deck as Deck_JSON and importing the result SHALL produce a Deck equal to the original (round-trip property).
9. FOR ALL valid Decks, exporting, importing, and exporting again SHALL produce Deck_JSON text equal to the first export (idempotent normalization).
10. FOR ALL valid Patterns, converting to a Deck, exporting as Deck_JSON, importing, and converting back SHALL produce a Pattern equal to the original.

### Requirement 9: Educational Model Disclaimer

**User Story:** As a visitor, I want to know this is a simplified teaching model, so that I do not mistake it for real loom software.

#### Acceptance Criteria

1. THE UI SHALL display the Disclaimer text in a visible location on the main screen at all times.
2. THE Deck_Exporter, Pattern_Exporter in JSON form, SVG_Exporter, and PNG_Exporter SHALL each include the Disclaimer text in the output as specified in Requirement 7.
3. WHERE the Pattern_Exporter produces plain Pattern_Text, THE UI SHALL display the Disclaimer text next to the export action, because the format has no metadata field.
4. THE Loom_Engine SHALL export the Disclaimer text as a single constant used by the UI and all Exporters.
5. THE UI and Exporters SHALL use the phrases "Jacquard-inspired" and "educational model" when describing the product.
6. THE UI, Exporters, and documentation strings SHALL omit the phrases "compatible with", "runs on", and "drives" in reference to a physical loom.
7. THE Loom_Engine, Exporters, and UI SHALL attribute no historical dates or inventor claims unless a verified source is cited next to the claim.
8. THE automated test suite SHALL verify that every export format listed in Requirement 7 contains the Disclaimer text, and that the main UI screen renders it.

### Requirement 10: Engine and Interface Separation

**User Story:** As a maintainer, I want the engine to be pure and independent of the UI, so that it can be tested and reused with confidence.

#### Acceptance Criteria

1. THE Loom_Engine SHALL reside in `src/engine/`, the Exporters in `src/exporters/`, and the UI in `src/ui/`.
2. THE Loom_Engine SHALL contain no import of a DOM API, UI framework, timer function, random source, I/O API, or `Date`.
3. THE Exporters SHALL import from `src/engine/` only and SHALL contain no import from `src/ui/`.
4. THE Import_Boundary_Check SHALL fail the build if any file in `src/engine/` imports from `src/exporters/` or `src/ui/`, or any file in `src/exporters/` imports from `src/ui/`.
5. THE Loom_Engine SHALL return expected failures as Result values with a discriminated `code` and SHALL NOT throw exceptions for invalid input.
6. FOR ALL inputs, including inputs outside the documented bounds, every public Loom_Engine function SHALL return a Result and SHALL NOT throw (totality).
7. THE Loom_Engine SHALL schedule no time-based behavior, and THE Animation_Controller in `src/ui/` SHALL own all scheduling.
8. THE Loom_Engine and Exporters SHALL compile under TypeScript strict mode.
9. THE Loom_Engine and Exporter type signatures SHALL be reviewed and stabilized before UI implementation starts.

### Requirement 11: Bounds Enforcement

**User Story:** As a maintainer, I want limits enforced everywhere, so that the tool stays small and predictable.

#### Acceptance Criteria

1. THE Loom_Engine SHALL enforce a minimum of 1 and a maximum of 64 for Pattern width, Pattern height, Deck width, and Deck length at every public entry point that accepts or produces a Pattern or Deck.
2. FOR ALL Patterns and Decks with a dimension outside 1 to 64, every public Loom_Engine function that accepts a Pattern or Deck SHALL return an error Result and SHALL NOT return a Pattern or Deck.
3. FOR ALL sequences of valid Deck_Editor operations, every Deck returned in an ok Result SHALL have from 1 to 64 Cards of width W (bounds invariant).
4. THE Loom_Engine SHALL expose the numeric limits (minimum 1, maximum 64, maximum import size 262144 bytes, speed range 1 to 30, cell size range 1 to 32) as named constants used by validation, the UI, and tests.

### Requirement 12: Inspectability and Property-Test Verification

**User Story:** As a student and as a maintainer, I want every card, pass, and thread state visible and the invariants verified, so that the model is easy to understand and trust.

#### Acceptance Criteria

1. THE UI SHALL render every Card of the Deck with each bit shown as a hole or no hole, and SHALL render the Cloth cells with the Warp_Color and Weft_Color.
2. WHEN the user selects a Card, THE UI SHALL highlight the matching Cloth row and show the lifted or down state of each warp thread for that Pass.
3. THE test suite SHALL include a unit test for each public Loom_Engine function.
4. THE test suite SHALL include fast-check property tests for: pattern-deck-pattern round trip, Pattern_Text round trip, determinism, edit locality, bounds enforcement, Deck_JSON export-import round trip, idempotent normalization, and cloth cell color equals lifted ? Warp_Color : Weft_Color.
5. THE property tests SHALL use bounded generators limited to W and H from 1 to 64 for valid inputs, with additional generators from 0 to 80 for bounds-violation tests.
6. WHEN a property test fails, THE test suite SHALL report the failing seed and the shrunk counterexample.
7. THE UI tests SHALL verify animation sequencing against Interpreter output and SHALL NOT re-test Interpreter logic.

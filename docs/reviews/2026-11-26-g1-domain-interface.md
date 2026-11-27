# G1 interface freeze review: card domain library

Reviewer: independent (did not write the code). Interface version under review: 1.1.0.

## Scope

- Diff `d3b19d3..HEAD`, restricted to `src/domain/**` (48 files, 5,361 added lines), branch `main`, HEAD `af339af`.
- Authority: `.kiro/specs/card-domain-and-loom-engine/requirements.md` and `design.md`, plus `.kiro/steering/*.md`.
- Out of scope: bodies of stubbed functions (they throw `NotImplementedError` by design until later tasks), tests as evidence of correctness, docs files not yet written.

## Method

1. Read the requirements and design in full (public surface, check orders, error-code registry, JSON schemas, Garín working values, seed register).
2. Compared every export of `src/domain/index.ts` with the design's signatures and module layout.
3. Read every stub's TSDoc (error codes and order) against the requirement clause that defines it. Where the clause is silent, the list is recorded as INFERRED below.
4. Read implemented modules (`types`, `result`, `brand`, `limits`, `canonicalJson`, `schema`, `profile/*`) for behaviour against the spec.
5. Grepped `src/domain` for banned globals and forbidden SVG wording. Ran `npm run typecheck` (clean) and `npm test` (14 files, 79 tests pass). These runs are observation only and are not used as a basis for the verdict.

## Checked and consistent with the spec

- `INTERFACE_VERSION = "1.1.0"`. `ERROR_CODES` contains every code in Req 16.1 (including `MISSING_REQUIRED_FIELD` and `NOTHING_TO_WITHDRAW`). `LIMITS` values equal the design table.
- Every symbol named in the design's surface is exported from `index.ts`. No design symbol is missing or renamed. The snapshot (`surface.snapshot.json`) matches `index.ts`.
- `withdrawInference` check order is exactly Req 5.28: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `INVALID_EDIT`, `NOTHING_TO_WITHDRAW` (`card/edit.ts:88-90`). `userEdit` order matches the design (`edit.ts:22-23`). `setInferred` rejects `null` with `PROBABILITY_OUT_OF_RANGE` (`edit.ts:67-68`). `createCard` is documented to write `restorationConfidence: null` (`card.ts:26-27`). `makeLoomConfig` and the interpreter/`create` precondition orders match Req 8.18 (`config.ts:12-14`, `interpreter.ts:5-8`, `simulation.ts:14-16`). `replaySession`, `replaySessionJson` and bitmap check orders match the design.
- `restorationConfidence` and `confidence` fields are `number | null`, required, in `types.ts`, and the schema walk treats them as required nullable (`schema.ts` `NULLABLE_NUMBER`, `CELL_INITIAL_NODE`, `PREVIOUS_FIELDS_NODE`, `INFERENCE_ENTRY_NODE`). An absent field gives `MISSING_REQUIRED_FIELD`; it is never defaulted. The writer emits `null` as the literal.
- Garín profile (`garinProfile.ts`): 51 x 8, 400 readable, 8 reserved at row 25 columns 0 to 7 with basis `geometric-inference` and the exact placeholder note, two end holes without geometry, default threads-per-hook 16, mirror options `none`/`mirrored`, `one-card-per-pass`, no `physicalDimensions`. Every verification entry (including both hook mappings) is `unverified`. Nothing in `src/domain` marks anything `verified`. UNVERIFIED A1 to A6, A8, A9, A11 comments are present.
- Read order (`machineProfile.ts` `compileProfile`, `readOrder.ts`): rightmost column first, bottom-up as descending `gridRow`, reserved skipped, marked UNVERIFIED A3/A4.
- Hook formulas (`hookMapping.ts:92-93`): contiguous `h*t+k`, repeat `h+k*readableCount`, warp count `readableCount*t`, mirror `total-1-w` after mapping, result sorted ascending. All match Req 14.6 to 14.8.
- `SIMULATION_DISCLAIMER` equals Req 8.16 verbatim. `SVG_CAVEAT` equals Req 11.6 verbatim. The strings "laser-ready", "cut-ready" and "machine-ready" do not occur in `src/domain`.
- No banned global (`Date`, `Math.random`, `performance.now`, timers, DOM, `fetch`) appears in non-test `src/domain` code; the only grep hits were the word "document" in comments. `_stub.ts` uses none.
- `SimulationDisclaimerText` is a hand-written literal, but `disclaimer.ts:7-10` asserts at compile time that it equals `typeof SIMULATION_DISCLAIMER`, so it is the same type the design names.

## Findings

### BLOCKING

**B-1. Hook-mapping signatures differ from the design.**
Files: `profile/hookMapping.ts:61-65, 71-76`. Spec: design "Hook-to-warp mappings" declares `warpCount(profile, cfg: LoomConfiguration): number` and `hookWarpIndices(profile, cfg: LoomConfiguration, hook: ReadIndex): readonly WarpIndex[]`; Req 12.6 makes any signature change after design approval a spec change.
The code returns `Result<number>` / `Result<readonly WarpIndex[]>` and takes a locally defined `HookMappingConfig` (`hookMapping` and `mirror` optional). The Result form is the better one, because these functions can fail on bad configuration and the design's own rule is "no throws for expected failures". `LoomConfiguration` is assignable to `HookMappingConfig`, so the parameter change is harmless to callers. The return type is not. The design (and P4, and the `fabricCoordinate` consistency clause) must be amended to the Result form before freeze, or the code changed. Also in this module:
- Unknown or non-permitted mapping returns `HOOK_MAPPING_INVALID` (`hookMapping.ts:44-46`). Req 14.4 and design `makeLoomConfig` require `UNSUPPORTED_HOOK_MAPPING`; `HOOK_MAPPING_INVALID` is reserved for bad profile data (Req 14.5).
- `profile.hookMappings` and `profile.mirrorOptions` are never consulted, so a mapping or mirror the profile does not permit is accepted (Req 14.4, 8.17).
- Neither exported function documents its error codes (Req 12.1).
The two behaviour points can be fixed after freeze, but the signature must be settled now.

**B-2. `INVALID_DECK` is documented on functions whose declared error type cannot carry the violation report.**
Files: `session/record.ts:19, 23` (`createSession`: `Result<RecordingSession>`); `io/serialize.ts:22, 24-27` (`exportDeckJson`: `Result<string>`); `deck/compare.ts:34, 36, 55, 58-63` (`compareCells`, `deriveDamagedDeck`). Spec: design defines `INVALID_DECK` as the wrapper carrying a `ViolationReport` (`ReportedError`); the design signatures for these four functions use plain `Result<T>`; Req 15.17 and 6.3 require violations to be returned.
`createSession` is documented as "`INVALID_DECK` (with report)", but `Result<RecordingSession>` has `DomainError` as its error type, so the report is not part of the type. A caller cannot read it without a cast, and the UI needs it to show why a session cannot start. Widening the error type to `ReportedError` is a signature change, so it must happen before freeze (design amended at the same time). The same decision applies to the other three functions: either they return `ReportedError`, or they use a different code (for `compareCells`, mismatched profile id or card ids is not a deck validation failure; the spec names no code, see S-8). The doc text must not promise a report that the type cannot hold.

### SPEC-GAP (decision needed, preferably before freeze)

**S-1. `setInferred` can create a deck that `validateDeck` rejects.** `card/edit.ts:51-59, 70-74`; design Validation ("`ambiguous` with a value requires an `inference` entry with `policyNote`"); Req 5.17, 5.22.
`InferenceInput` accepts `provenance: "ambiguous"` with `value`. `InferenceInput` has no `policyNote`, and only `requestApproval` writes policy entries. So `setInferred(ambiguous, value: 1)` is accepted by the documented error list but produces a deck the validator must reject. Decision needed: (a) `setInferred` rejects `ambiguous` with a value (state the code, for example `INVALID_PROVENANCE`; no signature change), or (b) add an optional `policyNote` to `InferenceInput` (signature change, so before freeze). Also decide whether an inference with `value` absent and provenance `repeat-inferred` is allowed.

**S-2. Requirement 6.7 (structure operations keep history byte for byte) conflicts with the uniqueness rules in Req 6.5 and the design validator.** `deck/deck.ts:46-83` (`insertCard`, `duplicateCard`).
Entry `actionId` and `sequence` values must be unique and contiguous across the whole deck. `duplicateCard` of a card with history copies those entries, so the result has repeated action ids and sequence numbers. `insertCard` of a card from another deck can collide the same way. The stub lists no error code for it. Decision: duplicates drop or renumber history (violates 6.7), uniqueness is scoped per cell (changes the validator and Req 6.5), or these operations reject cards with history (new error code or reuse of `DUPLICATE_ACTION_ID`). `insertCard` also reports an out-of-range `at` as `DECK_SIZE_OUT_OF_RANGE` (`deck.ts:43-44`), whose registered meaning is card count; the spec names no code for `at`.

**S-3. `CellSeed.initial` type.** `card/card.ts:18-21`; design declares `initial?: CellInitial` while its prose and Req 12.2 say `restorationConfidence` is always `null` for seeded cells.
The worker narrowed the type to `Omit<CellInitial, "restorationConfidence">`. This satisfies Req 12.2 and I recommend it, but it is a design signature change. Amend the design to the Omit form. `createCard` also lacks an `EVIDENCE_REQUIRED` entry for a seed with `repeat-inferred`/`symmetry-inferred` and empty evidence (Req 5.5); decide whether seeds may carry those provenances at all.

**S-4. Embedded-deck schema: does `initialDeck` carry `schemaVersion`?** `io/schema.ts:517` (`DECK_NODE` with `schemaVersion` on the deck and each card) versus design "Session log schema" example (`initialDeck` lists `profile, cards, approvals, lastEntrySequence, confidenceCalibration` and no `schemaVersion`) and the deck file, which carries a single top-level `schemaVersion` (`FILE_DECK_NODE`, matching the design example).
The session example uses `{}`/`[]` placeholders, so it may be abbreviated. The key set decides session-log bytes, `stateDigest` input and goldens, so it is part of the frozen persisted format. State it in the design.
Related: the design says the digest form of a simulation holds `deckDigest` instead of the deck snapshot, but `SIMULATION_STATE_NODE` (`schema.ts:552-555`) embeds the full deck and has no `deckDigest` key. The digest task will need its own node. Record that decision with S-4.

**S-5. Canonical writer is exported without a usable schema.** `index.ts` exports `writeCanonicalJson` and type `SchemaNode`, while `DECK_FILE_NODE` and every other node stay private. A consumer such as the benchmark spec cannot build a deck `SchemaNode`, so the public writer is a half API once frozen. The design lists "canonical JSON writer" as a benchmark input. Decision: benchmark uses `exportDeckJson` (then drop both exports before freeze, since removal later is breaking), or export the nodes. Also decide the trailing newline: the writer emits none (`canonicalJson.ts:5`), the design says only "two-space indent, `\n` line endings", and goldens will fix whichever is chosen.

**S-6. Types the design uses but never defines.** `SessionLogContext` (`session/sessionLog.ts:124-126`, `{ initialLoomConfiguration? }`), `SessionPayload` and its eleven payload types (`sessionLog.ts:30-92`), `CompiledProfile`/`CompiledGridPosition` (`machineProfile.ts:397-410`), `HookMappingConfig`, `validateLoomConfig`, `migrateToCurrent`/`MigrationOutcome` (`io/migrate.ts`), and `ok`/`err`/`makeError`. The payload shapes agree with the design's payload table, and the other definitions are reasonable. They are now frozen public surface that the design does not mention; add them to the design. Of these, `CompiledProfile` fixes an internal encoding (`gridToRead` keyed by `row*columns+column` with `-1` for reserved, `machineProfile.ts:402-410`) that vision and others could start to depend on. Either document it or stop exporting the type. `MIGRATIONS` and the key tables staying private is fine.

**S-7. `gridToPhysical` geometry.** `profile/readOrder.ts:72-96`; design `PhysicalDimensions.originXMm/originYMm: "centre of grid (0,0)"`; Req 4.5.
The code computes `x = originX + gridColumn*columnPitch`, `y = originY + gridRow*rowPitch` (y grows downward, matching A3's "row 0 at top"). It uses declared values only and never estimates (Req 4.6 satisfied). The design phrase is ambiguous (centre of the position (0,0), or centre of the whole grid). The y direction and x direction are not specified either. Also, the check order is `POSITION_OUT_OF_RANGE` first (`readOrder.ts:77`) while the design lists `PHYSICAL_DIMENSIONS_UNAVAILABLE | POSITION_OUT_OF_RANGE`. Req 4.6 says a profile without dimensions returns `PHYSICAL_DIMENSIONS_UNAVAILABLE` for conversions, which can be read as taking precedence. State the origin, axis directions and order in the design. No signature changes.

**S-8. Error lists marked INFERRED.** The spec is silent on, so I could not confirm, these lists. None conflicts with a requirement; each needs a one-line design statement:
- `createCard` (`CELL_COUNT_MISMATCH`, `OBSERVED_WITHOUT_OBSERVATION`, `PROBABILITY_OUT_OF_RANGE`, `EVIDENCE_TOO_LONG`, `INVALID_PROVENANCE`; no order requirement).
- `undoEdit` (`UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `NOTHING_TO_UNDO`; Req 5.11 and 5.15 support the codes, not the order).
- `setInferred` position of `DUPLICATE_ACTION_ID` and the `INFERENCE_CANNOT_BE_OBSERVED`/`INVALID_PROVENANCE` order (inputs are disjoint, so order is immaterial there).
- `createDeck`, `reorderCards`, `insertCard`, `removeCard`, `duplicateCard`, `requestApproval`, `revokeApproval` (the spec names only `INVALID_REORDER`, `DECK_SIZE_OUT_OF_RANGE` for removing the last card, `UNRESOLVED_CELLS`, `DUPLICATE_ACTION_ID`).
- `compareCells`/`deriveDamagedDeck` codes (see B-2).
- `decodeCard` (`UNKNOWN_CARD` for a bad `cardIndex`), `passResult` and `fabricCoordinate` (`SEEK_OUT_OF_RANGE`, and `INVALID_THREADS_PER_HOOK` for a bad `threadOffset`, `interpreter.ts:56-57`). The last reuses a code whose registered meaning is the configuration value.
- `exportDeckJson` (`INVALID_DECK`, `INVALID_COLOUR_LAYER`, `INVALID_FORMAT`), `exportSessionLog` (`SESSION_TRUNCATED`), `importSessionLog` order, `exportCardSvg` (`UNKNOWN_CARD`), `appendAction` (`DUPLICATE_ACTION_ID`, `SESSION_TOO_LARGE`).
- `bitmapToDeck` with an empty bitmap: the stated order checks width first, but `[]` has no width, while Req 10.5 says height 0 gives `BITMAP_HEIGHT_UNSUPPORTED`. State that an empty bitmap reports height.
- `exportCardSvg(card, deck, o)` takes `o.profile` and `deck.profile`. The spec does not say which wins or what happens when they differ.

**S-9. Validator codes with no assigned code.** `deck/validate.ts:14-18`. Req 6.5 and 13.25 require reporting approval-list sequence gaps, empty approvals, duplicate action ids and inconsistent entry sequence numbers, but no requirement assigns a code to them. The TSDoc list names none (and omits `HOOK_MAPPING_INVALID`, which Req 14.5 assigns to the Deck_Validator). The design's P6 expects "the specific code for that corruption". Decide the codes (`DUPLICATE_ACTION_ID`, `INVALID_EDIT_HISTORY`, or a new code, which is a minor-version addition).

**S-10. Wrapper code of a profile failure.** `machineProfile.ts:384-388`. `validateProfile` returns the first violation's code as the top-level code (for example `PROFILE_COUNT_MISMATCH`), with the report attached. The design's Error Handling section says the wrapper is `INVALID_PROFILE`, while its profile "Verification rules" paragraph and Req 2.5/14.5 say the specific code is returned. Pick one and state it. `compileProfile` returns `Result<CompiledProfile, ReportedError>`, which is assignable to the design's `Result<CompiledProfile>`; no signature issue.

### NON-BLOCKING

**N-1. Brand constructor error codes contradict Req 4.4 and 9.8 for non-integers.** `brand.ts:36-71`. `asReadIndex(1.5)` returns `INVALID_FORMAT`, but Req 4.4 and 5.28 say a read index that is not an integer in range is `READ_INDEX_OUT_OF_RANGE`. `asPassIndex(2.5)` returns `INVALID_FORMAT`, but Req 9.8 says a non-integer seek target is `SEEK_OUT_OF_RANGE`. `gridToReadIndex` reports non-integers as `POSITION_OUT_OF_RANGE` while `asGridRow` reports `INVALID_FORMAT`, so one concept has two codes. `asWarpIndex` reports `POSITION_OUT_OF_RANGE`, a grid-coordinate code, for a fabric coordinate. No TSDoc lists any error code (Req 12.1). Fix: non-integers use the same range code as out-of-range for read index and pass index; decide the warp index code (`COLOUR_LAYER_OUT_OF_RANGE` does not fit either; a design statement is enough). No signature change. Do this before the vision spec starts calling the constructors.

**N-2. Missing error documentation on implemented exports (Req 12.1).** `validateProfile`, `compileProfile`, `warpCount`, `hookWarpIndices`, `writeCanonicalJson` partly, and all brand constructors list no codes. `gridToReadIndex`, `readIndexToGrid` and `gridToPhysical` do.

**N-3. `validateLoomConfig` ordering text.** `loom/config.ts:22-26` says the same codes in the same order "then `INVALID_FORMAT` for a wrong shape or `profileId` mismatch". A wrong shape must be detected first or the other checks cannot run. `create` and `createSession` do not list the `INVALID_FORMAT` profile-id mismatch although they run the same checks (`simulation.ts:14-16`, `record.ts:19-21`). Align the lists.

**N-4. Seeds outside the register.** `canonicalJson.test.ts:81` uses literal seed 4101 (not a constant, not `20260100 + n`). `generators/profile.test.ts:19, 29, 51` use literal 20260100 three times (n = 0, not distinct). `readOrderReject.props.test.ts` runs three `fc.assert` calls on `SEED_P2`, while the design register allows one assert per property. Req 13.1 requires an explicit, distinct seed constant per property. Move the canonical-JSON null/0 property under `SEED_P22` (it is the P22 concern) or add named auxiliary seeds to `seeds.ts` and the design register.

**N-5. Surface snapshot detects names only.** `surface.test.ts` and `surface.snapshot.json` record export names and value/type kind, not signatures. A changed parameter or return type (the very thing Req 12.6 forbids after freeze) passes the test. Consider adding a declaration-text snapshot (`tsc --declaration` output of `index.ts`) before relying on it as the freeze guard.

**N-6. Documentation files the spec requires are not yet present.** `docs/domain-errors.md`, `docs/domain-loom.md`, `docs/domain-svg-caveat.md`, `docs/domain-session-log.md`, and the registry-sync test (Req 16.4, 12.7). Expected from later tasks; they do not change signatures. They must exist before the final gate. TSDoc in the source already states the INFERRED lists, so S-8 decisions should flow into `domain-errors.md`.

**N-7. Compile cache assumes immutability.** `machineProfile.ts:413-420`. `compileProfile` caches by object identity and says profiles must not be mutated. Nothing freezes `GARIN_PROFILE`. The risk is stale tables if a caller mutates a profile, which the spec's immutability rule already forbids. A `deepFreeze` of the Garín profile or a note in the TSDoc would close it.

## Item-by-item answers for the flagged list

| Flagged item | Result |
|---|---|
| Branded-constructor codes | N-1 (non-integer codes contradict Req 4.4 and 9.8; warp index code undecided) |
| Seed 4101 in `canonicalJson.test.ts` | N-4 |
| `gridToPhysical` pitch and origin | S-7 (uses declared values only; origin and axes unspecified) |
| `CompiledProfile` shape | S-6 (table names match the design; encoding is frozen publicly) |
| Hook mapping returns `Result`, local `HookMappingConfig` | B-1 |
| `CellSeed.initial` as `Omit<CellInitial, "restorationConfidence">` | S-3 (recommended, design needs the amendment) |
| `MIGRATIONS` and schema tables private | Acceptable; `migrateToCurrent` and `writeCanonicalJson`/`SchemaNode` on the surface are S-6 and S-5 |
| `SimulationDisclaimerText` vs `SIMULATION_DISCLAIMER` | Same type, enforced at compile time; no finding |
| `SessionPayload`/`SessionLogContext` defined by worker | S-6 (payload shapes match the design's table; `SessionLogContext` is undefined in the spec) |

## Verdict

VERDICT: FAIL (B-1, B-2)

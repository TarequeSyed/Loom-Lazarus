# G1 interface freeze review, second pass: card domain library

Reviewer: independent second reviewer (did not write the code or the fixes). Interface version under review: 1.1.0.

## Scope

- `src/domain/**` at HEAD `ca45a4f` (branch `main`), the whole public surface. The diff `af339af..ca45a4f` was used to find what changed, but unchanged files were also read.
- Authority: the amended `.kiro/specs/card-domain-and-loom-engine/requirements.md` and `design.md` ("G1 review resolutions" records, Req 2.13, 3.7, 4.10, 4.11, 5.34, 5.35, 6.13 to 6.15, 7.16, 7.17, 10.10, 11.11, 12.9 to 12.12, 13.26, 14.13, 15.23) and `.kiro/steering/*.md`.
- Out of scope: bodies of stubs (they throw `NotImplementedError` by design), `docs/domain-*.md` (later tasks), and tests as evidence of correctness.
- No file under `src/` or `.kiro/` was edited. The surface-guard experiment ran on a temporary copy outside the repository (since deleted). `git status` is clean.

## Method

1. Read the first review, then the amendment records in both spec files and each clause they cite.
2. Read every export's signature and TSDoc (error codes and order) and compared it with the design's "Error codes per function" table, the per-function check orders in the design body, and the requirement clauses.
3. Read `hookMapping.ts`, `readOrder.ts`, `brand.ts`, `canonicalJson.ts`, `garinProfile.ts` and the schema key tables in full.
4. Grepped non-test `src/domain` for implicit defaults (`?? "..."`), banned globals (`Date`, `Math.random`, `performance`, timers, DOM, `fetch`) and the wording "laser-ready", "cut-ready", "machine-ready", "verified", "compatib". Only the required `SIMULATION_DISCLAIMER` and `SVG_CAVEAT` texts, `unverified` markers and the validator's `verified`-needs-source rule matched.
5. Compared `index.ts` (all exports) and the 168-entry snapshot (91 types, 77 values) with the design's module layout, "Additional public surface" list and signatures.
6. Ran `npm run typecheck` (clean) and `npm test` (14 files, 88 tests pass). Observation only; not used for the verdict.
7. Surface-guard experiment on a temporary copy: changed a return type (`hookWarpIndices`), added an optional parameter (`insertCard`), made an exported interface field nullable (`InferenceInput`), then changed a parameter type with `UPDATE_SURFACE_SNAPSHOT=1`.

## First-review findings and status

| ID | Status | Evidence |
|----|--------|----------|
| B-1 hook mapping signature, codes, profile lists, docs | RESOLVED | `hookMapping.ts:16-20` (`HookMappingConfig`), `:69,:81` both return `Result`; check order `:33-62` is threads (1..64), mapping absent, mapping unknown or not in `profile.hookMappings`, mirror absent, mirror unknown or not in `profile.mirrorOptions`, then `READ_INDEX_OUT_OF_RANGE` (`:93+`), which equals design "Hook-to-warp mappings" and Req 14.13. No `??` default anywhere; `HOOK_MAPPING_INVALID` is never returned (`:30-31`). TSDoc lists the codes in order (`:65-68`, `:78-80`). Tests in `hookMapping.test.ts` cover permitted lists, absent values and order. |
| B-2 `ReportedError` on four functions | RESOLVED | `record.ts` `createSession`, `serialize.ts:25` `exportDeckJson`, `compare.ts:37` `compareCells`, `compare.ts:60` `deriveDamagedDeck` all return `Result<T, ReportedError>`; snapshot entries agree; design lines for each and Req 12.9 agree. `DECK_SHAPE_MISMATCH`, `CARD_INDEX_OUT_OF_RANGE`, `INVALID_APPROVAL_HISTORY` are in `ERROR_CODES` and `ERROR_MESSAGES` (`result.ts`), and are documented where the spec places them: `compareCells`, `insertCard` and `decodeCard`, `validateDeck`. Their bodies are stubs, so use at runtime is for later tasks. |
| S-1 `setInferred` value rules | RESOLVED | `edit.ts:65-68, 70-74`; Req 5.34, 5.35; design `setInferred`. See SPEC-GAP R2-5 for a related gap that is not part of S-1. |
| S-2 history on insert/duplicate | RESOLVED | `deck.ts:45-51, 76-80`; Req 6.13, 6.14. `INVALID_EDIT_HISTORY` and `CARD_INDEX_OUT_OF_RANGE` are used as specified. The design wording for `insertCard` step 3 is garbled, see R2-6. |
| S-3 `CellSeed.initial`, seed provenance | RESOLVED | `card.ts:18-21` is `Omit<CellInitial, "restorationConfidence">`; `createCard` order `card.ts:31-37` equals the design's `createCard` line; Req 12.10. |
| S-4 embedded deck `schemaVersion`, digest form | RESOLVED, with note R2-4 | `schema.ts` `DECK_NODE` (with `schemaVersion` on deck and cards) and `FILE_DECK_NODE` (without) equal Req 15.23 and design "Session log schema". `SIMULATION_STATE_NODE` keeps the full deck, which the design now states stays as is; the digest node is a task 14.1 item. `stateDigest` TSDoc does not state the digest form (R2-4). |
| S-5 canonical writer internal, trailing newline | RESOLVED | `index.ts` has no `writeCanonicalJson` or `SchemaNode`; `canonicalJson.ts:63-66` appends exactly one `\n`; tests `canonicalJson.test.ts:32-81` and `surface.test.ts` ("does not export ..."). Req 7.16, 7.17. |
| S-6 undocumented public types | RESOLVED | Design "Additional public surface" and "Compiled profile (public types)" list `ok`, `err`, `makeError`, `HookMappingConfig`, `CompiledProfile`, `CompiledGridPosition` (with encoding), `validateLoomConfig`, `SessionLogContext`, the payload types, `migrateToCurrent`, `MigrationOutcome`. All are in `index.ts`. |
| S-7 `gridToPhysical` | RESOLVED | `readOrder.ts:70-97`: `PHYSICAL_DIMENSIONS_UNAVAILABLE` first, then `POSITION_OUT_OF_RANGE`; origin is the centre of position (0,0), x grows with column, y with row; Req 4.10, design `PhysicalDimensions` comment. Formatting defect at `readOrder.ts:93` (N-R2-1). |
| S-8 error lists | PARTIAL | Most lists now match the design table (see "Stub TSDoc against the S-8 table" below). `exportSessionLog` does not (R2-1, BLOCKING). `importSessionLog` and `stateDigest` wording differs (R2-3, R2-4). |
| S-9 validator codes | RESOLVED | `validate.ts:16-26`; Req 6.15; design "Validator code assignments". |
| S-10 profile wrapper code | RESOLVED | `machineProfile.ts` TSDoc for `validateProfile` and `compileProfile` (specific code at top level with report); Req 2.13; the design Error Handling section now says the same. Test `profile.test.ts` covers `PROFILE_COUNT_MISMATCH` and `HOOK_MAPPING_INVALID`. |
| N-1 brand codes | RESOLVED | `brand.ts` `checkInteger` uses the supplied code for non-integers; table in design "Branded coordinate types" equals the implementation (`asReadIndex` `READ_INDEX_OUT_OF_RANGE`, `asPassIndex` `SEEK_OUT_OF_RANGE`, `asWarpIndex` and grid constructors `POSITION_OUT_OF_RANGE`, the rest `INVALID_FORMAT`). TSDoc lists codes. |
| N-2 error docs on exports | RESOLVED | Brand constructors, `validateProfile`, `compileProfile`, `warpCount`, `hookWarpIndices` now document codes. |
| N-3 `validateLoomConfig` text | RESOLVED | `config.ts:22-30`, `interpreter.ts:5-9`, `simulation.ts:14-17`, `record.ts`. See R2-7 for the design's own precondition paragraph. |
| N-4 seeds | RESOLVED | No literal seeds remain; auxiliary seeds `20260190` to `20260192` in `seeds.ts` and the design register; multi-assert on `SEED_P2` allowed by Req 13.26. |
| N-5 guard records declaration text | RESOLVED | `surface.test.ts` records `declaration` per export. Experiment below shows it fails on a signature change. Caveat R2-2. |
| N-6 documentation files | OPEN, accepted | `docs/` has no `domain-*.md`. The amendment says "not amended (later tasks)". Needed before the final gate; does not affect signatures. |
| N-7 compile cache and mutation | RESOLVED | `garinProfile.ts:13-20,133-136` deep-freezes `GARIN_PROFILE`; test `garinProfile.test.ts` "is deep-frozen". |

## Checks requested

### 2. Hook functions

No implicit default for mapping or mirror (`hookMapping.ts:44,51` return `HOOK_MAPPING_NOT_CONFIGURED` and `MIRROR_NOT_CONFIGURED`). They consult `profile.hookMappings` (`:46`) and `profile.mirrorOptions` (`:53`). Both return `Result`. Order equals the design. Formulas, sorting and mirror-after-mapping are unchanged from the first review. No finding.

### 3. `Result<T, ReportedError>` and new codes

Confirmed for all four functions, in source and snapshot. New codes exist in `ERROR_CODES`, have fixed messages, and are named in the TSDoc of the functions the spec assigns them to (see B-2 row). `UNRESOLVED_CELLS` is documented on `requestApproval`.

### 4. Stub TSDoc against the S-8 table

Matches: `createCard`, `userEdit`, `undoEdit`, `setInferred`, `withdrawInference`, `createDeck`, `reorderCards`, `insertCard` (apart from R2-6), `removeCard`, `duplicateCard`, `requestApproval`, `revokeApproval`, `getCell`, `getCellByCardAndIndex`, `decodeCard`, `passResult`, `fabricCoordinate`, `makeLoomConfig`, `validateLoomConfig`, `create`, `runToEnd`, `step`, `seek`, `exportDeckJson`, `importDeckJson`, `createSession`, `appendAction`, `replaySession`, `replaySessionJson`, `bitmapToDeck`, `exportCardSvg`, `exportDeckSvg`, `compareCells`, `deriveDamagedDeck`, `validateDeck`, `validateProfile`, `compileProfile`, `gridToReadIndex`, `readIndexToGrid`, `gridToPhysical`, `warpCount`, `hookWarpIndices`, `currentApproval` and `approvalHistory` (both state "never fails").
Does not match: `exportSessionLog` (R2-1). Wording differs: `importSessionLog` (R2-3), `stateDigest` (R2-4).

### 5. Surface snapshot and guard

- `index.ts` exports neither `writeCanonicalJson` nor `SchemaNode`. The snapshot has 168 entries (91 types, 77 values), sorted, with declaration text. Every name in the design's surface and "Additional public surface" list is present, and no export lacks a design basis. Signatures for the four `ReportedError` functions, `warpCount`, `hookWarpIndices`, `decodeCard`, `createSession` and `applySessionAction` equal the design.
- Experiment on a temporary copy. Dropping `readonly` in the `hookWarpIndices` return type: guard fails, "Changed declaration: hookWarpIndices (value)". Adding an optional parameter to `insertCard`: fails, names `insertCard`. Making `InferenceInput.confidence` nullable: fails, names `InferenceInput (type)`. So the guard detects signature and exported-type changes, which is the substance of Req 12.12.
- With `UPDATE_SURFACE_SNAPSHOT=1` and a changed `hookWarpIndices` parameter type, all 7 tests passed and the snapshot file was rewritten. See R2-2.

### 6. New disagreements introduced by the fixes

None blocking beyond R2-1. Nothing introduces a default, a banned global, or the words "laser-ready", "cut-ready" or "machine-ready". `SVG_CAVEAT` and `SIMULATION_DISCLAIMER` are unchanged and equal the requirement text.

## New findings

### BLOCKING

**R2-1. `exportSessionLog` TSDoc contradicts the design's error-code table.** `src/domain/session/serialize.ts:12` lists `SESSION_TRUNCATED` and `INVALID_FORMAT (non-finite number)`. Design "Session log schema" and the "Error codes per function" table give the order `SESSION_TRUNCATED`, `SESSION_TOO_LARGE`, `INPUT_TOO_LARGE` (text over 32 MiB). The TSDoc omits two codes the caller must handle and names one the design does not assign here. This is a documentation fix only (no signature change), but check 4 of this gate is that every stub's TSDoc matches the S-8 table, and S-8 cannot be marked RESOLVED until it does. Fix: change the TSDoc to the design's list and order; if `INVALID_FORMAT` for a non-finite number is intended, add it to the design table first.

### NON-BLOCKING

**R2-2. `UPDATE_SURFACE_SNAPSHOT` regeneration switch weakens the guard.** `src/domain/__tests__/surface.test.ts:98-101`. The snapshot is rewritten at module load, before the assertions, so a run with the variable set rewrites the file and then compares it with itself and passes. Confirmed by experiment. There is no CI refusal, no separate script, and the interface version is hardcoded in the generator. Req 12.6 makes any signature change after freeze a spec change, but nothing besides a comment enforces that. Suggested: move regeneration to a dedicated script (like the repository's other `*:update` scripts), refuse when `process.env.CI` is set, and make the final gate compare the snapshot with the frozen tag in git.

**R2-3. `importSessionLog` order is wider than the design states.** `serialize.ts:20-22` lists `SESSION_TOO_LARGE`, `SESSION_TRUNCATED`, `SESSION_SEQUENCE_INVALID`, `INVALID_DECK` after `UNKNOWN_FIELD`. The design says it "runs the same order as `replaySessionJson` up to and including `UNKNOWN_FIELD`, without applying actions". The return type has `ReportedError`, which supports the TSDoc reading. State one of the two in the design. (Spec clause: design "Session log schema".)

**R2-4. `stateDigest` TSDoc omits the digest form.** `session/digest.ts:11-15` says "canonical JSON of `{ deck, simulation? }`" and does not say that the simulation's deck is replaced by `deckDigest` (Req 15.23, design "State_Digest"). `SIMULATION_STATE_NODE` (`schema.ts:552-553`) still embeds the deck, which the design says is intended, with a separate digest node in task 14.1. Add the sentence so the frozen documentation matches the algorithm. The trailing `\n` from the canonical writer is also part of the digest input; the design does not say so. State it before digest goldens exist.

**R2-8. Formatting defects in committed source.** `readOrder.ts:93` has `}  return ok({` on one line (left by the reorder of checks). `garinProfile.ts:135` contains a U+FFFD replacement character in "Gar?n" in a comment. Neither changes behaviour. Fix with a formatter pass and by restoring the "í".

### SPEC-GAP

**R2-5. `setInferred` can override an `observed` cell with a value.** `edit.ts:70-74` and Req 5.17 to 5.19 reject the provenance `observed` and protect only a cell with an un-reversed user edit. A call with provenance `repeat-inferred` on a cell whose current provenance is `observed` with a raw value is accepted by the documented error list, and `ambiguous` without a value would blank it. `restoration-principles.md` says an observed value may only be overridden by an explicit, recorded user action. Raw is preserved and the change is a withdrawable history entry, so this is not data loss, but the domain is the last line of defence for that rule. Decide before the freeze whether to add a check (a new error code, or `INVALID_EDIT`) or state that the restoration spec owns it. Confidence: likely (read from the TSDoc and requirements; the body is a stub).

**R2-6. Design `insertCard` step 3 is unclear.** Design "Deck operations" reads "`INVALID_FORMAT` (card of another profile or wrong cell count: `CELL_COUNT_MISMATCH`)". A `Card` carries no profile, so no `INVALID_FORMAT` case can arise, and the TSDoc (`deck.ts:48-52`) lists only `CELL_COUNT_MISMATCH` in that position. The TSDoc is the sensible reading. Correct the design text to `CELL_COUNT_MISMATCH`.

**R2-7. Design precondition paragraph omits `INVALID_FORMAT`.** Design "Interpreter and fabric" (precondition order, Req 8.18) lists configuration validity as five codes. `interpreter.ts:5-9`, `simulation.ts:14-17` and the design's per-function table for `create` all add `INVALID_FORMAT` first. The table and code agree; the paragraph and Req 8.18 do not. Align the paragraph. Also, `createDeck` returning `INVALID_EDIT_HISTORY` (`deck.ts:19-20`, design `createDeck` bullet) has no requirement clause; Req 6.13 covers only insert and duplicate.

**R2-9. Derived action id for policy entries can collide.** `approval.ts:35` derives `"<actionId>#<cardId>#<readIndex>"`. If that string already exists in the Deck history, the result is a `DUPLICATE_ACTION_ID` that no documented check position covers. Low likelihood; state whether it is returned.

## Result

Every first-review B and S item is RESOLVED except S-8, which is PARTIAL because of R2-1. N-6 is accepted as later work. The other findings do not block the freeze, but R2-2 and R2-5 should be decided before it.

VERDICT: FAIL (R2-1)

# G1 interface freeze review, third pass: card domain library

Reviewer: independent third reviewer (did not write the code or the fixes). Interface version under review: 1.1.0.

## Scope

- `src/domain/**` at HEAD `b4f8388` (branch `main`), the whole public surface, not only `git diff ca45a4f..b4f8388`.
- Authority: the amended `.kiro/specs/card-domain-and-loom-engine/requirements.md` and `design.md`, including both "G1 review resolutions" records and the round 2 records (Req 5.36 to 5.39, 12.13, 13.27 to 13.29, 16.1), and `.kiro/steering/*.md`.
- Out of scope: stub bodies (they throw `NotImplementedError` by design), `docs/domain-*.md` (later tasks), tests as evidence of correctness.
- No file under `src/` or `.kiro/` was edited. The surface-guard experiments ran on a temporary copy under `%TEMP%` (since deleted). `git status` is clean.

## Method

1. Read the round 2 review, then the diff `ca45a4f..b4f8388` for source, requirements and design.
2. Read the amended `setInferred` and `requestApproval` TSDoc against Req 5.36 to 5.39 and the design's S-8 table, "Deck operations" bullets and Property 9 text.
3. Compared `ERROR_CODES` (59 codes) with `ERROR_MESSAGES`, Req 16.1 and the design: every code has a message, is in the Req 16.1 list and appears in the design. `OBSERVED_CELL_PROTECTED` is present in all three (`result.ts:65, :131`).
4. Re-read the S-8 table row by row against the TSDoc of every exported function that appears in it, with extra attention to the rows changed in round 2 (`exportSessionLog`, `importSessionLog`, `stateDigest`, `setInferred`, `insertCard`, `requestApproval`, interpreter preconditions).
5. Grepped non-test `src/domain` for implicit defaults (`??`), banned globals (`Date`, `Math.random`, `performance`, timers, DOM, `fetch`, `process.env`, `Intl`, locale calls) and the wording "laser-ready", "cut-ready", "machine-ready", "compatib", and for U+FFFD characters.
6. Read `surface.test.ts` in full and ran the three guard experiments on a temporary copy.
7. Ran `npm run typecheck` (clean) and `npm test` (14 files, 91 tests pass). Observation only; not used for the verdict.

## Round 2 findings and status

| ID | Status | Evidence |
|----|--------|----------|
| R2-1 `exportSessionLog` TSDoc | RESOLVED | `session/serialize.ts:10-13` lists `SESSION_TRUNCATED`, `SESSION_TOO_LARGE`, `INPUT_TOO_LARGE` in that order, equal to the S-8 row and "Session log schema". The invalid `INVALID_FORMAT (non-finite number)` is gone. The design record confirms `INVALID_FORMAT` is not assigned to this function. |
| R2-2 snapshot regeneration weakens guard | RESOLVED | Req 12.13 and 13.29 added. `surface.test.ts:107-112` (`decideRegeneration`) returns `refuse` when `CI` is non-empty, `regenerate` only for `UPDATE_SURFACE_SNAPSHOT=1`. `applyRegeneration` writes then returns a failure message, and the first test asserts that message is null. Experiments in "Surface guard" below. Two non-blocking residues: N-R3-2, N-R3-3. |
| R2-3 `importSessionLog` wording | RESOLVED | Design table row added; TSDoc `serialize.ts:20-24` states "runs the `replaySessionJson` check order up to and including `UNKNOWN_FIELD`, then the log-level checks" and lists the nine codes in the same order as the design row. |
| R2-4 `stateDigest` digest form | RESOLVED | `session/digest.ts:11-17` states that the digested simulation carries `deckDigest` instead of the deck, that the persisted `SimulationState` keeps the deck, that the input includes the trailing `\n`, and that the function never fails. Equals the new design row and Req 15.23. |
| R2-5 observed cell overridden by `setInferred` | RESOLVED | New code `OBSERVED_CELL_PROTECTED`. Details in check (2) below. |
| R2-6 design `insertCard` step 3 | RESOLVED | Design `insertCard` bullet (design.md:~588 area) now reads `CELL_COUNT_MISMATCH` and says no `INVALID_FORMAT` case exists. TSDoc `deck.ts:49` agrees. |
| R2-7 interpreter precondition paragraph; `createDeck` clause | PARTIAL | Paragraph fixed: it starts with `INVALID_FORMAT`, equal to `interpreter.ts:6`, `simulation.ts:14,59` and the S-8 row. Still open: `createDeck` returns `INVALID_EDIT_HISTORY` (`deck.ts:19`) with no requirement clause (Req 6.13 covers insert and duplicate only). The design says it is a requirements matter and leaves it. See SG-R3-1. Non-blocking. |
| R2-8 formatting defects | RESOLVED | `readOrder.ts:93-94` is split onto two lines. `garinProfile.ts:135` reads "Garín". No U+FFFD remains in `src/**/*.ts` or `*.json`. |
| R2-9 derived action id collision | RESOLVED | Req 5.39; design `requestApproval` bullet (derived ids checked against every entry and approval record and against each other, returns `DUPLICATE_ACTION_ID`, Deck unchanged). TSDoc `approval.ts:38-42` says the same. Wording residue: N-R3-1. |

## Checks requested

### (2) `OBSERVED_CELL_PROTECTED`

- Registry: `result.ts:65` (code), `:131-132` (fixed message). Listed in Req 16.1 and in the design registry table ("Cells, evidence, edits").
- Documented order, `card/edit.ts:70-79`: `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `INFERENCE_CANNOT_BE_OBSERVED` / `INVALID_PROVENANCE`, `EVIDENCE_REQUIRED`, `EVIDENCE_TOO_LONG`, `PROBABILITY_OUT_OF_RANGE`, `OBSERVED_CELL_PROTECTED`, `INVALID_EDIT`. This is identical to the design S-8 row and to the design `setInferred` bullet ("the input checks below, then `OBSERVED_CELL_PROTECTED`, then `INVALID_EDIT`").
- Req 5.37 lists the sequence as `UNKNOWN_CARD`, `READ_INDEX_OUT_OF_RANGE`, `DUPLICATE_ACTION_ID`, `OBSERVED_CELL_PROTECTED`, `INVALID_EDIT`, and adds that "the checks of criteria 17, 18, 18a and 34 apply in the position the design assigns to them". Read together, the design places the input checks between `DUPLICATE_ACTION_ID` and `OBSERVED_CELL_PROTECTED`, so there is no contradiction. The literal list is easy to misread; see N-R3-4.
- Undone-edit case: stated in the TSDoc (`edit.ts:75-77`, "including a cell whose user edit was undone and that therefore shows its observed raw value again"), the design bullet, the S-8 row, Property 9 text, and Req 5.38. Requirements 5.36 and 5.38 use "current effective Provenance", which matches the TSDoc's "current provenance".
- The code is a registry addition, so `ERROR_CODES` changed (the `ERROR_CODES` entry in the snapshot) and the interface version stays 1.1.0 as a pre-freeze correction. No function signature changed.
- `userEdit` TSDoc has no new restriction, which matches Req 27 ("a user edit then still overrides the observed Cell").

### (3) Surface guard (temporary copy of `src`, `tsconfig.json`, `vitest.config.ts`, `package.json`, with `node_modules` linked)

| Run | Result |
|-----|--------|
| `UPDATE_SURFACE_SNAPSHOT=1` and `CI=true` | Test file fails: "UPDATE_SURFACE_SNAPSHOT is refused when the CI environment variable is set". Snapshot file hash unchanged. |
| `UPDATE_SURFACE_SNAPSHOT=1`, no `CI` | Snapshot rewritten, test file fails with "Snapshot regenerated; review the diff and rerun without UPDATE_SURFACE_SNAPSHOT (Requirement 12.13, 13.29)". The run cannot pass. |
| No switch, `insertCard` given an extra optional parameter | Test file fails: "Changed declaration: insertCard (value)", with the Req 12.6 spec-update message. |

Guard design: `decideRegeneration` and `applyRegeneration` are pure and have their own example tests with a temporary path (Req 13.29). The snapshot has 168 entries (91 types, 77 values), sorted, with declaration text. It contains neither `writeCanonicalJson` nor `SchemaNode`. The guard meets Req 12.12, 12.13 and 13.29.

### (4) Fresh pass over round 1 items

Re-checked in the current tree, not copied from round 2:

- B-1: `hookMapping.ts` unchanged since round 2; no `??` default; `HOOK_MAPPING_INVALID` is not returned by the hook functions. B-2: all four functions still return `Result<T, ReportedError>` in source and snapshot.
- S-1 to S-3, S-5 to S-7, S-9, S-10, N-1 to N-5, N-7: unchanged files, no regression. The edits since round 2 touch only TSDoc, one registry code, one comment, one whitespace fix and the test file.
- S-4: embedded deck `schemaVersion` and digest form unchanged; digest form now documented (R2-4).
- S-8: every row of the design's "Error codes per function" table now has matching TSDoc. This closes the round 2 PARTIAL. `bitmapToDeck`, `exportCardSvg`, `exportDeckSvg`, `compareCells`, `deriveDamagedDeck` and the `getCell`/`decodeCard` rows were re-read and agree.
- N-6: OPEN, accepted. `docs/` has no `domain-*.md`. The registry-sync test (Req 16.4) and `docs/domain-errors.md` must list `OBSERVED_CELL_PROTECTED` with an example test (Req 16.4, 16.5); this belongs to later tasks and changes no signature.

### (5) New disagreements

No implicit defaults in the public surface. The only `??` in non-test domain code is `schema.ts:119` (`options.optional ?? []`), a private schema-builder helper not exported from `index.ts`. No banned globals. The strings "laser", "compatib" appear only in `SIMULATION_DISCLAIMER` (`loom/disclaimer.ts:5`, `loom/types.ts:10`) and `SVG_CAVEAT` (`svg/exportSvg.ts:18`), which are the required negative statements. No "laser-ready", "cut-ready" or "machine-ready".

## New findings

### BLOCKING

None.

### NON-BLOCKING

**N-R3-1. `requestApproval` TSDoc lists the derived-id check at position 1.** `deck/approval.ts:38-42` puts "`DUPLICATE_ACTION_ID` (the supplied actionId, or a derived policy actionId ...)" before `UNRESOLVED_CELLS`, while the design bullet says the derived check runs after `UNRESOLVED_CELLS`. The two orders cannot be told apart: `UNRESOLVED_CELLS` is returned only without a policy and derived ids exist only with one. Meaning is unchanged. Optional: make the design or TSDoc say the same thing.

**N-R3-2. Guard comparison reads the snapshot after regeneration.** Design "Surface guard" says "The guard's comparison must not read a snapshot the same run has just written". `surface.test.ts:137-139` writes the file and then reads it back, so in a regeneration run the comparison test compares the file with itself and passes. The run still fails through the first test, so Req 12.13 and 13.29 hold. Test-only; no signature effect.

**N-R3-3. Interface version hardcoded in the generator.** `surface.test.ts:115` writes `interfaceVersion: "1.1.0"` instead of reading `INTERFACE_VERSION`. A future version bump needs two edits. Test-only.

**N-R3-4. Req 5.37 reads as a different order than the design if taken alone.** It lists `OBSERVED_CELL_PROTECTED` directly after `DUPLICATE_ACTION_ID` and defers the input checks to "the position the design assigns". Resolved by that clause; a short parenthetical "after the input checks of criteria 17, 18, 18a and 34" would remove the doubt.

**N-R3-5. Design round 2 record says `requirements.md` and `tasks.md` are not touched.** design.md:1507 states "`requirements.md` and `tasks.md` are not touched by this amendment", but the same commit amends `requirements.md` (Req 5.36 to 5.39, 12.13, 13.27 to 13.29 and a round 2 record) and `tasks.md` (task 4.8). Record keeping only.

### SPEC-GAP

**SG-R3-1. `createDeck` returns `INVALID_EDIT_HISTORY` without a requirement clause.** `deck/deck.ts:19`; design `createDeck` bullet; Req 6.13 covers `insertCard` and `duplicateCard` only. Must it be decided before the freeze? No. The TSDoc and the design agree, and the code list is part of the frozen documentation either way. If the requirement is later written to disagree, only an error list would change. Add the clause to Req 6 when convenient; do it before the final gate, not before G1.

## Result

All round 2 findings are RESOLVED except R2-7, which is PARTIAL on a requirements-only gap that does not affect any exported signature or documented code list. `OBSERVED_CELL_PROTECTED` exists, sits at the required position in `setInferred`'s documented order, and the undone-edit case is stated in code, design and requirements. The surface guard refuses regeneration under CI, fails a regeneration run, and fails on a signature change. Round 1 items show no regression. Every S-8 row agrees with the TSDoc. No exported signature or documented semantics disagrees with the amended spec, and nothing found would force a later signature change.

VERDICT: PASS

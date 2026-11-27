# Kiro Trail

Verified record of how Kiro was used to build Loom Lazarus. Procedure: `.kiro/steering/kiro-evidence.md`. Entries are append-only and in date order. A field that cannot be shown from the repository says "unverified".

### 2026-11-23  Repository created
- Surface: unverified
- Steering: none
- Feature Spec: none
- Hooks fired: none observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: none
- Screenshots: none
- Commits: c4abaac
- Decisions: MIT licence (`LICENSE`).

### 2026-11-26  Steering files for product, tech, structure, card format, restoration, UI, testing and evidence
- Surface: Kiro IDE
- Steering: added `product.md`, `tech.md`, `structure.md`, `jacquard-card-format.md`, `restoration-principles.md`, `ui-design-system.md` (fileMatch `src/ui/**/*`), `testing-standards.md` (fileMatch on test files), `kiro-evidence.md`, `update-kiro-trail.md`, `submission-check.md` (manual)
- Feature Spec: none
- Hooks fired: none observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: none
- Screenshots: none
- Commits: 7a94742, 2e425ed
- Decisions: the card format is documented as the Garín format from Rodas Lorente et al. (2025) with a VERIFY checklist; no detail is treated as verified. A `scripts` folder entry was added to `structure.md` (2e425ed).

### 2026-11-26  Five Feature Specs: requirements, design and tasks, each phase approved by the user
- Surface: Kiro IDE, spec workflow (requirements, then design, then tasks)
- Steering: all always-included files above
- Feature Spec: `card-domain-and-loom-engine`, `card-detection`, `restoration-engine`, `benchmark-and-evaluation`, `web-app-workbench`
- Hooks fired: none observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: none (no code). Kiro spec format validation was run on each document.
- Screenshots: none
- Commits: 0a7b5c8 (restoration), eda2b02 (detection), b44b606 (benchmark), 96d590a (domain), c3336f6 (Workbench); c40cf39 removed an obsolete earlier spec
- Decisions: cross-spec amendments made during review, each approved by the user before the next phase. Examples: append-only withdrawal of inferences in the domain; `null` restoration confidence meaning "not evaluated"; synthetic-only priors disabled by default on real decks; damage levels owned by the benchmark spec.

### 2026-11-26  Implementation plan, risk register and demo script
- Surface: Kiro IDE
- Steering: all always-included files
- Feature Spec: all five, read for planning
- Hooks fired: none observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: none
- Screenshots: none
- Commits: 7691139
- Decisions: `docs/PLAN.md` found 18 cross-spec contradictions before any code. The user approved the plan with two corrections: synthetic data is never marked real to pass validation, and the prior-enablement control is P0.

### 2026-11-26  Amendment batch A0 applied to the specs
- Surface: Kiro IDE, spec workflow
- Steering: unchanged
- Feature Spec: all five amended
- Hooks fired: none observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: none. Kiro spec format validation passed on every changed document, with two known warnings.
- Screenshots: none
- Commits: 9e0b5dc
- Decisions: per-card `Synthetic_Image_Attestation` instead of relabelling synthetic data as real; prior gate panel promoted to P0; one integrator owns `package.json` and all configs; worker import rule aligned with `structure.md`; demo deck built from simulated intact context cards plus one damaged card.
### 2026-11-26  M0 scaffold, hooks, MCP configuration and domain task 1.1
- Surface: Kiro IDE (spec task execution through the `spec-task-execution` sub-agent)
- Steering: all always-included files; `testing-standards.md` applied to the new test file
- Feature Spec: `card-domain-and-loom-engine` task 1.1 completed
- Hooks fired: "Protect .kiro from .gitignore" (PreToolUse on file-write tools) fired on the sub-agent's file writes during task 1.1 and blocked one write to `src/domain/__tests__/helpers.ts`, an unrelated file. The user then chose to change it to a `fileEdited` hook on `.gitignore` only. "Typecheck and test after task" (PostTaskExec, `npm run check`): not observed firing yet
- MCP tools used: none. Playwright MCP configured in `.kiro/settings/mcp.json` (`@playwright/mcp@0.0.86`), not yet used
- Bugfix Spec: none
- Tests: `npm run check`: typecheck passed; Vitest 5.1.2, 1 test file, 2 tests passed (Node v26.13.1, npm 11.20.0)
- Screenshots: none
- Commits: this entry's commit
- Decisions: one integrator owns `package.json` and every config (amendment A0-1). TypeScript pinned to 6.0.3 rather than 7.0.2, because the boundary tests use the compiler API and version 7 publishes it as unstable. `esbuild`'s install script was approved explicitly after npm blocked it.
### 2026-11-26  Domain tasks 1.2 (import-boundary test) and 1.3 (Result, branded types, limits, error registry)
- Surface: Kiro IDE, two `spec-task-execution` sub-agents run in parallel on disjoint files
- Steering: all always-included files; `testing-standards.md` for the test files
- Feature Spec: `card-domain-and-loom-engine` tasks 1.2 and 1.3 completed; task 1 complete
- Hooks fired: "Protect .kiro from .gitignore" (now `fileEdited` on `.gitignore`): both sub-agents reported running its `git check-ignore` command (exit 1, nothing under `.kiro` ignored) even though neither saved `.gitignore`. I could not confirm from the repository whether the hook triggered or the agents ran the check on their own. "Typecheck and test after task": not observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: `npm run check`: typecheck passed, 3 files and 14 tests passed. A planted file importing `../ui/App` and calling `Date.now()` made the boundary test fail with both violations named; the file was then removed and the test passed again
- Screenshots: none
- Commits: this entry's commit
- Decisions: task 1.3 reported its own run with one failing boundary self-test, because it ran while task 1.2 was still correcting a test input; the combined rerun passed. Constructor error codes chosen by task 1.3 (`INVALID_FORMAT`, `POSITION_OUT_OF_RANGE`, `READ_INDEX_OUT_OF_RANGE`, `SEEK_OUT_OF_RANGE`) are recorded for review at the interface freeze.
### 2026-11-26  Domain tasks 2.1, 4.1, 2.2, 2.3, 3.1, 3.2, 3.3 (types, canonical JSON, machine profile, Garín profile, generator, read order, hook mapping)
- Surface: Kiro IDE, `spec-task-execution` sub-agents. 2.1, 4.1 and 2.2 ran one at a time because the schema key lists depend on the type names; 2.3, 3.1, 3.2 and 3.3 ran in parallel on disjoint files
- Steering: all always-included files; `jacquard-card-format.md` for the Garín profile values
- Feature Spec: `card-domain-and-loom-engine` tasks 2 and 3 complete (optional tests 2.4, 3.4 to 3.7 not yet run), 4.1 complete
- Hooks fired: the sub-agents reported running the `.gitignore` hook's `git check-ignore` check (exit 1, nothing under `.kiro` ignored); trigger source unverified. "Typecheck and test after task": not observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: combined `npm run check` after the parallel batch: typecheck passed, 10 files and 68 tests passed. During the batch, task 3.2 saw two failures in task 3.3's test file that 3.3 then fixed (wrong expected value in its own test), so per-worker reports differed until the combined run
- Screenshots: none
- Commits: this entry's commit
- Decisions: every Garín field is `unverified`; reserved positions are the row 25 placeholder with basis `geometric-inference`. `gridRow` 0 is the top edge and bottom-up means descending `gridRow` (UNVERIFIED A3, A4). Items for the interface-freeze review: task 4.1 property uses seed 4101 outside the domain seed register; `CompiledProfile` shape and `gridToPhysical` pitch formula chosen by the workers; hook-mapping functions return `Result` and take a local `HookMappingConfig`.
### 2026-11-26  Domain tasks 3.4, 3.5, 4.2, 4.3, 4.4 (property tests, signature stubs, public index, surface snapshot)
- Surface: Kiro IDE, `spec-task-execution` sub-agents; 3.4, 3.5 and 4.2 in parallel on disjoint files, then 4.3 and 4.4 in sequence
- Steering: all always-included files; `testing-standards.md` for the property tests
- Feature Spec: `card-domain-and-loom-engine` tasks 1 to 4 complete (M0 domain scope). Optional tests 2.4, 3.6 and 3.7 not run
- Hooks fired: sub-agents reported running the `.gitignore` check (nothing under `.kiro` ignored); trigger source unverified. "Typecheck and test after task": not observed
- MCP tools used: none
- Bugfix Spec: none
- Tests: Property 1 (read-order bijection, seed 20260101, 300 runs, profiles up to 256 x 256) and Property 2 (rejected positions, seed 20260102, 200 runs) pass. The first version of the Property 1 test took about 230 seconds and timed out; its author replaced per-cell assertions in the hot loop and it now runs in about 1.3 seconds. Surface snapshot: 170 exports (78 values, 92 types), interface version 1.1.0. Combined `npm run check`: typecheck passed, 14 files and 79 tests passed. A text search found no "laser-ready", "cut-ready" or "machine-ready" wording in `src`
- Screenshots: none
- Commits: this entry's commit
- Decisions: `CellSeed.initial` is `Omit<CellInitial, "restorationConfidence">`, so callers cannot pass a numeric confidence and `createCard` always writes `null`. `MIGRATIONS` and the schema key tables are not on the public surface. Several stub error-code lists were inferred by the worker and are flagged for review at the interface freeze (task 5).
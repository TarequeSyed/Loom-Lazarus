---
inclusion: always
---

# Restoration Principles

## Per-cell data
Every cell preserves:
- Raw image observation and hole likelihood.
- Effective (restored) value.
- Provenance: `observed`, `repeat-inferred`, `symmetry-inferred`, `ambiguous` or `user-edited`.
- Confidence in the accepted or proposed interpretation, in [0, 1].
- Human-readable evidence explaining any inference.

## Rules
- Distinguish hole probability (how likely a hole is present in the image) from estimated restoration correctness (how likely the effective value is right). They are separate fields and separate UI labels.
- Never overwrite raw observation data. An observed value may only be overridden through an explicit, recorded user action, which sets provenance to `user-edited` and keeps the earlier value and provenance in history.
- Missing cells stay unknown (`ambiguous`, no effective value) when insufficient evidence exists. Do not guess to fill a gap.
- At most three ranked alternatives per ambiguous region, each with confidence and an explanation.
- Maintain reversible edit history and approval state. Only approved decks run on the loom or export as final.
- Calibrate confidence empirically on validation data. While confidence is not calibrated, say so wherever it is shown.
- Every inference has a non-empty, specific explanation, for example which rows repeat at which period and how many repeats agree.
- Restoration is deterministic for the same evidence, configuration and seed.
- Inference never produces `observed` provenance.

## Invariants to test
- Raw observations are unchanged by any restoration run.
- Confidence is within [0, 1] for every cell.
- Every inferred cell has a non-empty explanation.
- Alternatives per region are at most three, ranked by confidence.
- Same input gives the same output.
- Undoing a user edit restores the prior value, provenance and approval state.

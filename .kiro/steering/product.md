---
inclusion: always
---

# Product: Loom Lazarus

Kiroween 2026, Resurrection category. Loom Lazarus is an explainable, browser-based restoration platform for historical Jacquard punched-card programs.

Journey: photograph of a historical or damaged punched card, hole detection, evidence-based reconstruction, uncertainty visualization, human approval, deterministic virtual loom execution, digital export.

## Resurrection relevance
Punched cards are dormant programs. Damaged cards lose instructions, and with them the patterns they wove. We bring those programs back to a runnable state, and we show exactly what was observed and what was inferred.

## Users
Textile archivists, heritage weavers, educators and researchers. Hackathon judges are an important evaluation audience, so the core journey must be understandable in a few minutes without uploading anything (bundled sample).

## Distinctive contribution: Restoration Evidence Mode
Every inferred instruction has provenance, confidence and an understandable explanation, and a human controls the final reconstruction.

## Research integrity
Reference paper: Rodas Lorente et al. (2025), "Digitization and recognition of Jacquard cards for textile design preservation", https://doi.org/10.1007/s11042-025-20917-9.

That paper already covers digitization, recognition of damaged or obscured cards, error correction, manual validation, pattern reconstruction and vector export. We must NOT claim those capabilities as our inventions.

Our proposed differentiation:
- Inference of genuinely missing instructions using deck-level structure (repeats, symmetry).
- Explicit, calibrated uncertainty and provenance.
- Alternative restoration hypotheses with explanations.
- Reversible human corrections and approval.
- Reproducible evaluation against held-out damaged-card benchmarks.

Credit the paper, the Garín5 dataset and other research resources in the README and in the application UI. Verify licensing before redistributing any data.

## Five central capabilities
1. Detection: find the card, align the grid, estimate hole likelihood per position.
2. Restoration: infer missing or ambiguous cells from deck-level structure and image evidence.
3. Evidence and approval: show provenance, confidence and reasons; let a human review, edit and approve.
4. Loom execution: run the approved deck on a deterministic virtual loom with animated passes.
5. Evaluation and export: held-out benchmark reporting and digital export (including SVG).

## MVP
One complete restoration journey, end to end, on one supported card format (the Garín card format in jacquard-card-format.md). Breadth of formats is out of scope.

## Success metrics
- Held-out damaged-cell accuracy.
- Calibration error of reported confidence.
- Whole-card recovery rate, where the format and damage make it supported.
- Manual versus assisted restoration time.

Report each with benchmark version, seed, split and sample size.

## Honesty rules
- Never claim accuracy without measurements. Quote only numbers from a recorded run.
- Never silently replace historical evidence.
- Jacquard cards do not encode original fabric colours. Colours come only from a separate user-supplied layer and are labelled as such.
- The virtual loom is an educational simulation. Do not claim compatibility with physical looms.
- Always show uncertainty.

## Non-goals
Physical loom control, accounts, server-side storage of user photos, support for every historical card format.

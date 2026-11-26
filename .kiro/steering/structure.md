---
inclusion: always
---

# Structure

```
src/domain      card and deck models, encoding, simulator (virtual loom logic)
src/vision      image preprocessing, detection
src/restore     inference, evidence and review
src/benchmark   synthetic damage and evaluation
src/ui          React screens, components, design tokens
src/workers     browser worker entry points, if needed
research        offline scripts (Python)
scripts         TypeScript CLI entry points: benchmark, tuning, measurement (headless, deterministic)
docs            plans, Kiro evidence, verification
data            licensed samples, metadata, synthetic fixtures
.kiro           steering, specs, hooks, MCP configuration
```

## Dependency direction
`ui -> restore, vision, benchmark -> domain`. `domain` imports nothing from the other folders. `workers` may import vision and restore. Enforce with an import-boundary test.

## Rules
- NEVER add `.kiro` to `.gitignore`. Commit relevant steering, specs, hooks and MCP configuration, without secrets.
- Do not place generated datasets or model weights in Git without checking size, licensing and necessity.
- Every folder under `data` that holds third-party material carries a README with its source and licence.
- Do not commit user photos.
- Add new top-level folders only after updating this file.
- `scripts` holds thin TypeScript CLI entry points. They may import the public index of any `src` folder. No `src` folder imports `scripts`. Scripts read no ground truth outside the benchmark runner and write generated data only under `data/generated` (not committed). Committed manifests and reports live under `data/benchmark`.

---
inclusion: fileMatch
fileMatchPattern: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"]
---

# Testing Standards

Tools: Vitest, fast-check, Playwright (browser tests), Playwright MCP (agent UI verification).

## Required
- Unit tests for domain and vision utilities.
- Property-based tests for domain, restoration and loom logic.
- Deterministic random seeds and reproducible fixtures.
- Golden reference outputs for loom rendering.
- Separate synthetic benchmark and real-image evaluation. Never merge their numbers, and never tune on held-out data.
- Failing regression tests before bug fixes where feasible.
- Precise preconditions for every correctness property, stated in the test, for example "for any valid 51 x 8 card with at least one observed cell".

## Determinism
- Set an explicit seed and bounded `numRuns` on every property, for example `fc.assert(prop, { seed: 1234, numRuns: 200 })`.
- Output the seed and the shrunk counterexample on failure. Convert real counterexamples into permanent example-based regression tests.
- No `Math.random`, `Date.now` or network in tests. Inject clocks and seeds.

## Generators
Keep generators beside the domain types and bounded to real card dimensions. Build damaged cards by applying a seeded damage function to a valid card, so the ground truth is known.

## Golden outputs
Goldens live in version control. Changing one needs a stated reason, and the diff is a review item.

## Boundaries
Include an import-boundary test that `domain` imports from no other source folder. UI tests check presentation and interaction against engine output and do not re-implement engine logic.

# Loom Lazarus

An explainable, browser-based restoration workbench for historical Jacquard punched-card programs. Built for the Kiroween 2026 hackathon, Resurrection category.

> **Status: under construction.** No application code exists yet. This README describes intent, not results.

## What it is meant to do

Photograph of a damaged punched card, then hole detection, then evidence-based reconstruction of missing instructions, then uncertainty display, then human approval, then a deterministic virtual loom, then digital export.

Every inferred cell carries its provenance, a confidence value and a plain-language reason. A person approves the final deck.

## Honesty statements

- The virtual loom is an **educational simulation**. It makes no claim of compatibility with any physical loom.
- The card format model (Garín format) is **unverified** against the source paper. Every unverified detail is marked in the code and in exports.
- Exports are **not** described as ready for laser cutting.
- Punched cards store no colour. Colours shown are a user-supplied layer.
- No accuracy figure exists yet. Results will be reported only from recorded benchmark runs, and synthetic results are kept separate from real photographs.

## Requirements

- Node.js **22.12 or later**. Developed and tested on Node v26.13.1 with npm 11.20.0. `.npmrc` sets `engine-strict`, so installation fails on older versions.
- npm 10 or later.

## Setup

```sh
npm install
npm install-scripts approve esbuild   # npm 11 blocks install scripts until approved
npx playwright install chromium
npm run typecheck
npm test
```

The scripts for detection, restoration, the benchmark and the build are registered in `package.json` but most of their files do not exist yet.

## Repository layout

See [`.kiro/steering/structure.md`](.kiro/steering/structure.md). Specifications live in `.kiro/specs/`.

## Credits

- Rodas Lorente, M. et al. (2025). *Digitization and recognition of Jacquard cards for textile design preservation.* Multimedia Tools and Applications. https://doi.org/10.1007/s11042-025-20917-9. That work already covers digitization, recognition of damaged cards, error correction, manual validation, pattern reconstruction and vector export. Loom Lazarus does not claim those as its own inventions.
- The Garín5 dataset is credited to the same research. Its licence has not been checked, and none of its content is included in this repository.

## Kiro usage

Development evidence is recorded in [`docs/KIRO_TRAIL.md`](docs/KIRO_TRAIL.md). Only verified activity is listed.

## Licence

MIT, see [`LICENSE`](LICENSE). Third-party data and assets keep their own licences.
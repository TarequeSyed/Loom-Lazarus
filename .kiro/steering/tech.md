---
inclusion: always
---

# Tech

## Preferred stack
- TypeScript (strict), React, Vite.
- Pure TypeScript domain and loom logic (no DOM, no Date, no unseeded randomness).
- OpenCV.js for browser-side image processing.
- Web Workers for expensive detection and restoration.
- Vitest and fast-check for tests.
- Playwright for browser tests; Playwright MCP for agent-driven UI verification.
- Python only for offline research, dataset analysis and benchmark preparation under `/research`. Nothing in `/src` depends on Python.
- Static deployment with no always-on application server. Photos are processed in the browser and not uploaded.
- MIT license for our own code. Third-party data and assets keep their own licences.

## Separation of concerns
Domain, vision, restoration and UI are separate layers. Domain imports nothing from the others. Vision and restoration communicate with the UI through typed, versioned, structured-cloneable worker messages.

## Reconstruction approach
- Deterministic algorithms are the primary reconstruction mechanism.
- An optional vision model may assist difficult cases (for example hole likelihood in poor images). It must be clearly labelled, must not silently invent historical information, and its output enters the pipeline as evidence with provenance and confidence, never as an observed value.

## Changing the stack
If a different technology is better, document the trade-off and request approval before changing the stack. Open trade-offs to decide with the user:
- OpenCV.js is large. Options: lazy load inside the worker, a trimmed build, or a small hand-written canvas implementation if detection needs only thresholding, morphology and connected components. Decide after a spike on real card photos.
- A schema validator (for example Zod) at worker and file-import boundaries.
- Playwright MCP is a development tool, not a runtime dependency.

## Data and artifacts
Do not commit large datasets or model weights without checking size, licensing and necessity. Tuned constants exported from `/research` are versioned JSON with a description of the data used.

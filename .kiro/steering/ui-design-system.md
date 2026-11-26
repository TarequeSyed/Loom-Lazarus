---
inclusion: fileMatch
fileMatchPattern: "src/ui/**/*"
---

# UI Design System: Haunted Textile Archive Workbench

Not a generic SaaS dashboard. The punched card and the reconstructed evidence dominate the screen.

## Look
- Charcoal and deep-purple backgrounds.
- Antique amber and ghost-cyan accents (amber for observation and the loom, ghost-cyan for inference).
- Subtle fog, noise, punched-card and loom-thread motifs, kept low-contrast behind content.
- Modern, premium typography and restrained animation.
- Avoid stock dashboard patterns such as uniform metric tiles and default component-library styling.

## Layout
Left navigation, a focused central workbench, and a contextual right-side inspector where useful (cell details: provenance, confidence, evidence, alternatives, history). The card view is the largest element on every restoration screen.

## Accessibility
- Text contrast at least 4.5:1 and UI component contrast at least 3:1, measured against actual backgrounds including noise.
- Full keyboard navigation, including moving between cells, opening alternatives, editing, approving and undoing.
- Visible focus states on every interactive element.
- Responsive layout down to tablet width, with usable behaviour on narrow screens.
- Honour `prefers-reduced-motion`: stop ambient fog and thread motion and provide step-through loom playback. Never remove information when motion is reduced.
- Do not use colour alone to identify provenance or confidence. Pair each state with a distinct shape or pattern marker and a text label. Show numeric confidence on focus or hover and in the inspector.
- Do not flash content more than three times per second.

## Required persistent content
Research credits (Rodas Lorente et al. 2025, Garín5 and other resources) and the "educational simulation" label are reachable from every screen. Colour layer controls are labelled as user-supplied.

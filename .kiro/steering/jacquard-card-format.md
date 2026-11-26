---
inclusion: always
---

# Jacquard Card Format (Garín card format)

This documents the Garín card format as described in Rodas Lorente et al. (2025), https://doi.org/10.1007/s11042-025-20917-9. It is NOT a universal Jacquard standard. Do not assume other historical cards share these dimensions or conventions.

## Format summary
- 51 x 8 positions = 408 potential positions.
- Eight central positions are reserved for alignment, leaving 400 readable instruction positions.
- Two larger end holes are used for attachment and processing. They are separate from the instruction grid.
- Instruction reading proceeds column by column, bottom-up, starting from the rightmost column.
- Threads-per-hook is configurable. Default is 16 for the documented machine.
- Mirror handling must be explicit in the loom configuration. Never flip a deck silently.
- Each card participates in the sequence of weaving passes.
- Colour is not stored on the punched cards.
- Do not assume all historical designs are symmetrical.

## Four coordinate systems (keep them distinct)
1. Grid coordinates: (row, column) in the 51 x 8 grid, used to address positions on one card.
2. Physical locations: positions on the physical card (for example millimetres), used for image alignment and laser export. Do not infer these from grid coordinates without verified spacing.
3. Machine read order: the sequence in which positions are read, as an index over the 400 readable positions.
4. Rendered fabric coordinates: (warp thread, pass) positions in the simulated cloth, after threads-per-hook and mirror settings.

Provide explicit, tested conversion functions between them. Never use one system's numbers as another's. Name variables by system (for example `gridRow`, `readIndex`, `warpIndex`).

## VERIFY (check against the paper's figures before implementation)
- [ ] Which positions are the eight central alignment positions.
- [ ] Where the two end holes sit relative to the grid, and whether they affect the 51 row count.
- [ ] Which axis the 51 rows and 8 columns follow on the physical card.
- [ ] Exact column order and bottom-up direction relative to the card orientation in the photo.
- [ ] How the read order maps onto the 400 readable positions, given the reserved central ones.
- [ ] Meaning of threads-per-hook, why 16 is the default, and how it maps read order to warp threads.
- [ ] How mirror image weaving is applied, and whether it is a property of the machine or the design.
- [ ] How cards map to passes, including any repeated or skipped cards.
- [ ] Physical dimensions and hole sizes (needed before laser-ready export).
- [ ] Licence and terms of the Garín5 dataset before redistributing any sample.

Record the page or figure that confirms each item, and update this file. Until an item is checked, code that depends on it must carry a comment pointing here.

/**
 * The Garín card format profile (design.md, "Garín profile" and "Historical assumptions requiring
 * verification"). Source of the working values: .kiro/steering/jacquard-card-format.md, which
 * describes Rodas Lorente et al. (2025), https://doi.org/10.1007/s11042-025-20917-9.
 *
 * Nothing here is marked verified. Every field carries status `unverified`, a basis and a note.
 * Corrections are made by editing this data only; no library code depends on these values.
 */

import type { MachineProfile, VerificationStatus } from "./machineProfile";

const NOT_CHECKED = "Not yet checked against the paper's figures.";

function unverified(
  basis: VerificationStatus["basis"],
  note: string,
): VerificationStatus {
  return { status: "unverified", basis, note };
}

export const GARIN_PROFILE: MachineProfile = {
  schemaVersion: 1,
  profileId: "garin-51x8",
  displayName: "Garín card format (51 x 8, unverified working profile)",

  // UNVERIFIED A3: see .kiro/steering/jacquard-card-format.md (which axis of the card the 51 rows follow).
  gridRows: 51,
  gridColumns: 8,
  // 51 x 8 = 408 positions, minus 8 reserved = 400 readable.
  readableCount: 400,

  // UNVERIFIED A1: see .kiro/steering/jacquard-card-format.md (placeholder location, not observed in the paper's figures).
  reservedPositions: [0, 1, 2, 3, 4, 5, 6, 7].map((gridColumn) => ({
    gridRow: 25,
    gridColumn,
    role: "alignment (placeholder)",
  })),

  // UNVERIFIED A2: see .kiro/steering/jacquard-card-format.md (two larger end holes, position and size unknown).
  endHoles: [
    {
      id: "end-hole-1",
      description: "Larger end hole for attachment and processing. Outside the instruction grid. No geometry known.",
    },
    {
      id: "end-hole-2",
      description: "Larger end hole for attachment and processing. Outside the instruction grid. No geometry known.",
    },
  ],

  // UNVERIFIED A4: see .kiro/steering/jacquard-card-format.md (read order over the 400 readable positions).
  // UNVERIFIED A3: "bottom-up" is taken as descending gridRow, with gridRow 0 at the top as drawn.
  readOrder: {
    kind: "column-major",
    columnDirection: "right-to-left",
    rowDirection: "bottom-up",
  },

  // UNVERIFIED A5, A11: see .kiro/steering/jacquard-card-format.md (which hook mapping applies is not established).
  hookMappings: [
    {
      kind: "contiguous-visualization",
      verification: unverified(
        "unknown",
        "Display convenience: each hook drives a contiguous block of warp threads. Not established as the machine's arrangement.",
      ),
      note: "Display convenience, not a claim about the machine.",
    },
    {
      kind: "repeat",
      verification: unverified(
        "unknown",
        "Each hook drives warp threads spaced one card width apart. Historically motivated but not checked against the paper.",
      ),
      note: "Historically motivated, not verified.",
    },
  ],

  // UNVERIFIED A5: see .kiro/steering/jacquard-card-format.md (meaning of threads-per-hook and why 16 is the default).
  defaultThreadsPerHook: 16,

  // UNVERIFIED A6: see .kiro/steering/jacquard-card-format.md (mirror handling: machine or design property).
  mirrorOptions: ["none", "mirrored"],

  // UNVERIFIED A8: see .kiro/steering/jacquard-card-format.md (how cards map to passes).
  cardToPass: { kind: "one-card-per-pass" },

  // UNVERIFIED A9: physicalDimensions is intentionally absent; physical sizes are not known.

  verification: {
    gridSize: unverified(
      "unknown",
      `A3: 51 x 8 follows the steering file's summary of the paper. The physical axis and photo orientation are not confirmed. ${NOT_CHECKED}`,
    ),
    reservedPositions: unverified(
      "geometric-inference",
      "Location inferred from the 51 x 8 grid geometry. This is a placeholder. It was not observed in the paper's figures.",
    ),
    endHoles: unverified(
      "unknown",
      `A2: two larger end holes are declared outside the grid with no geometry. ${NOT_CHECKED}`,
    ),
    readOrder: unverified(
      "unknown",
      `A4: column by column, rightmost column first, bottom-up, reserved positions skipped. Direction relative to the photo is unconfirmed. ${NOT_CHECKED}`,
    ),
    defaultThreadsPerHook: unverified(
      "unknown",
      `A5: 16 is the documented default. Its meaning and mapping to warp threads are unconfirmed. ${NOT_CHECKED}`,
    ),
    mirrorOptions: unverified(
      "unknown",
      `A6: whether mirroring belongs to the machine or the design is unknown, so both options are offered. ${NOT_CHECKED}`,
    ),
    cardToPass: unverified(
      "unknown",
      `A8: one card per weaving pass is assumed. Repeated or skipped cards are not modelled. ${NOT_CHECKED}`,
    ),
    physicalDimensions: unverified(
      "unknown",
      "A9: card dimensions and hole sizes are not known, so none are declared and millimetre export is refused.",
    ),
  },
};

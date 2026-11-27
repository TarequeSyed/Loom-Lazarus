/**
 * Fabric and simulation types (design.md, "Interpreter and fabric", "Simulation").
 * Type-only module. The disclaimer constant itself lives in `loom/disclaimer.ts`.
 */
import type { PassIndex, ReadIndex, WarpIndex } from "../brand";
import type { Deck, LoomConfiguration } from "../types";

/** Literal type of `SIMULATION_DISCLAIMER`. */
export type SimulationDisclaimerText =
  "Educational Jacquard-inspired simulation. Not compatible with, and does not drive, physical looms.";

export type FabricCell = "warp" | "weft";

export interface FabricRow {
  readonly passIndex: PassIndex;
  /** Ascending. */
  readonly liftedHooks: readonly ReadIndex[];
  /** Ascending, after mirror. The canonical record of the row. */
  readonly liftedWarpIndices: readonly WarpIndex[];
}

export interface ResolvedColours {
  readonly label: "user-supplied colour layer";
  readonly warpColourByIndex: readonly string[];
  readonly weftColourByPass: readonly string[];
}

export interface FabricBuffer {
  readonly warpCount: number;
  readonly passCount: number;
  /** Rows rendered so far. */
  readonly rows: readonly FabricRow[];
  /** Only when a colour layer was supplied. */
  readonly colours?: ResolvedColours;
  readonly disclaimer: SimulationDisclaimerText;
}

export type RunStatus = "ready" | "running" | "paused" | "complete";

export interface SimulationState {
  readonly schemaVersion: 1;
  /** Immutable snapshot taken at create. */
  readonly deck: Deck;
  readonly config: LoomConfiguration;
  /** Passes executed so far, 0..passCount. */
  readonly passIndex: PassIndex;
  readonly status: RunStatus;
  readonly fabric: FabricBuffer;
  readonly disclaimer: SimulationDisclaimerText;
}

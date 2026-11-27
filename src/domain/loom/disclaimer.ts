/** The simulation disclaimer (design.md, "Interpreter and fabric"). Final value, not a stub. */
import type { SimulationDisclaimerText } from "./types";

export const SIMULATION_DISCLAIMER =
  "Educational Jacquard-inspired simulation. Not compatible with, and does not drive, physical looms.";

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Compile-time check: the constant's type equals `SimulationDisclaimerText`. */
export const SIMULATION_DISCLAIMER_TYPE_CHECK: Equal<typeof SIMULATION_DISCLAIMER, SimulationDisclaimerText> = true;

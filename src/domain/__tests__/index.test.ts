import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  GARIN_PROFILE,
  INTERFACE_VERSION,
  SIMULATION_DISCLAIMER,
  SVG_CAVEAT,
} from "../index";

describe("domain public index", () => {
  it("exports the interface version 1.1.0", () => {
    expect(INTERFACE_VERSION).toBe("1.1.0");
  });

  it("exports runtime constants", () => {
    expect(GARIN_PROFILE).toBeDefined();
    expect(SIMULATION_DISCLAIMER).toBeDefined();
    expect(SVG_CAVEAT).toBeDefined();
    expect(ERROR_CODES).toContain("NOTHING_TO_WITHDRAW");
    expect(ERROR_MESSAGES).toBeDefined();
  });
});

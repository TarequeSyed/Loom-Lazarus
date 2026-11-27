import { describe, expect, it } from "vitest";
import { GARIN_PROFILE } from "../profile/garinProfile";
import { compileProfile, validateProfile } from "../profile/machineProfile";

describe("GARIN_PROFILE", () => {
  it("validates, compiles, has 400 readable positions and marks everything unverified", () => {
    expect(validateProfile(GARIN_PROFILE).ok).toBe(true);

    const compiled = compileProfile(GARIN_PROFILE);
    expect(compiled.ok).toBe(true);
    expect(GARIN_PROFILE.readableCount).toBe(400);
    if (compiled.ok) expect(compiled.value.readToGrid).toHaveLength(400);

    for (const status of Object.values(GARIN_PROFILE.verification)) {
      expect(status.status).toBe("unverified");
    }
    for (const mapping of GARIN_PROFILE.hookMappings) {
      expect(mapping.verification.status).toBe("unverified");
    }

    expect(GARIN_PROFILE.reservedPositions.map((p) => [p.gridRow, p.gridColumn])).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7].map((c) => [25, c]),
    );
  });

  it("is deep-frozen", () => {
    expect(Object.isFrozen(GARIN_PROFILE)).toBe(true);
    expect(Object.isFrozen(GARIN_PROFILE.reservedPositions)).toBe(true);
    expect(Object.isFrozen(GARIN_PROFILE.reservedPositions[0])).toBe(true);
    expect(Object.isFrozen(GARIN_PROFILE.hookMappings[0]?.verification)).toBe(true);
    expect(Object.isFrozen(GARIN_PROFILE.verification.readOrder)).toBe(true);
    expect(Object.isFrozen(GARIN_PROFILE.readOrder)).toBe(true);
  });
});

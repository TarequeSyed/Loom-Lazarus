import { describe, expect, it } from "vitest";
import type { GridRow, ReadIndex } from "../brand";
import { asGridRow, asReadIndex, asSequenceNumber } from "../brand";
import { LIMITS, SUPPORTED_SCHEMA_VERSIONS } from "../limits";
import { ERROR_CODES, ERROR_MESSAGES, err, makeError, ok } from "../result";

describe("error registry", () => {
  it("has unique codes", () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it("gives every code a non-empty message and no extra messages", () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_MESSAGES[code].trim().length).toBeGreaterThan(0);
    }
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual([...ERROR_CODES].sort());
  });

  it("includes MISSING_REQUIRED_FIELD and NOTHING_TO_WITHDRAW", () => {
    expect(ERROR_CODES).toContain("MISSING_REQUIRED_FIELD");
    expect(ERROR_CODES).toContain("NOTHING_TO_WITHDRAW");
    expect(ERROR_MESSAGES.NOTHING_TO_WITHDRAW).toMatch(/inference/);
  });
});

describe("Result helpers", () => {
  it("ok and err build the two variants", () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
    const e = makeError("INVALID_JSON", "at 4", "a.b");
    expect(err(e)).toEqual({ ok: false, error: e });
    expect(e.message.startsWith(ERROR_MESSAGES.INVALID_JSON)).toBe(true);
    expect(makeError("PAUSED")).toEqual({ code: "PAUSED", message: ERROR_MESSAGES.PAUSED });
  });
});

describe("limits", () => {
  it("states the documented values", () => {
    expect(LIMITS.maxViolations).toBe(100);
    expect(LIMITS.maxJsonBytes).toBe(8 * 1024 * 1024);
    expect(SUPPORTED_SCHEMA_VERSIONS).toEqual([1]);
  });
});

describe("branded constructors", () => {
  it("accepts in-range integers and rejects others", () => {
    expect(asGridRow(3, 51)).toEqual({ ok: true, value: 3 });
    const bad = asReadIndex(400, 400);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("READ_INDEX_OUT_OF_RANGE");
    const frac = asGridRow(1.5);
    if (!frac.ok) expect(frac.error.code).toBe("INVALID_FORMAT");
    expect(frac.ok).toBe(false);
    expect(asSequenceNumber(0).ok).toBe(false);
  });

  it("does not accept a ReadIndex where a GridRow is expected", () => {
    const takesRow = (_row: GridRow): void => {};
    const readIndex = 5 as ReadIndex;
    // @ts-expect-error ReadIndex is not assignable to GridRow
    takesRow(readIndex);
    expect(readIndex).toBe(5);
  });
});

import { describe, expect, it } from "vitest";
import * as seeds from "./seeds";
import { cloneBefore, deepFreeze } from "./helpers";

describe("seeds", () => {
  it("defines SEED_P1..SEED_P29 as 20260100 + n, all distinct", () => {
    const record = seeds as unknown as Record<string, number>;
    for (let n = 1; n <= 29; n++) {
      expect(record[`SEED_P${n}`]).toBe(20260100 + n);
    }
    expect(new Set(seeds.ALL_SEEDS).size).toBe(29);
  });
});

describe("helpers", () => {
  it("deepFreeze freezes nested values and cloneBefore copies them", () => {
    const original = { a: [1, { b: 2 }] };
    const copy = cloneBefore(original);
    deepFreeze(original);
    expect(Object.isFrozen(original.a[1])).toBe(true);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
  });
});

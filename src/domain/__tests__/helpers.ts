// Test helpers for detecting input mutation (Req 13.3).

/** Recursively freezes a value in place and returns it. Mutating it later throws in strict mode. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key]);
    }
  }
  return value;
}

/** Returns a deep, structurally equal copy to compare against an input after a call. */
export function cloneBefore<T>(value: T): T {
  return structuredClone(value);
}

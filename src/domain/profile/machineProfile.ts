/**
 * Machine profile types, validation and compilation (design.md, "Machine profile").
 * `compileProfile` is the only place that derives read-order tables.
 */

import { LIMITS } from "../limits";
import { err, makeError, ok } from "../result";
import type { DomainError, ErrorCode, ReportedError, Result } from "../result";

export interface VerificationStatus {
  readonly status: "unverified" | "verified";
  readonly basis: "paper-figure" | "geometric-inference" | "unknown";
  /** Page or figure. Required and non-empty when status is "verified". */
  readonly source?: string;
  readonly note?: string;
}

export type ProfileFieldKey =
  | "gridSize"
  | "reservedPositions"
  | "endHoles"
  | "readOrder"
  | "defaultThreadsPerHook"
  | "mirrorOptions"
  | "cardToPass"
  | "physicalDimensions";

export interface ReservedPositionSpec {
  readonly gridRow: number;
  readonly gridColumn: number;
  readonly role: string;
}

export interface EndHoleSpec {
  readonly id: string;
  readonly description: string;
  readonly xMm?: number;
  readonly yMm?: number;
  readonly diameterMm?: number;
}

export type MirrorOrientation = "none" | "mirrored";

export type CardToPassSpec = { readonly kind: "one-card-per-pass" };

export interface PhysicalDimensions {
  readonly cardWidthMm: number;
  readonly cardHeightMm: number;
  readonly originXMm: number;
  readonly originYMm: number;
  readonly rowPitchMm: number;
  readonly columnPitchMm: number;
  readonly holeDiameterMm: number;
}

export type HookMappingKind = "contiguous-visualization" | "repeat";

export interface HookMappingSpec {
  readonly kind: HookMappingKind;
  readonly verification: VerificationStatus;
  readonly note?: string;
}

export type ReadOrderSpec =
  | {
      readonly kind: "column-major";
      readonly columnDirection: "right-to-left" | "left-to-right";
      readonly rowDirection: "bottom-up" | "top-down";
    }
  | {
      readonly kind: "explicit";
      readonly order: readonly { readonly gridRow: number; readonly gridColumn: number }[];
    };

export interface MachineProfile {
  readonly schemaVersion: 1;
  readonly profileId: string;
  readonly displayName: string;
  readonly gridRows: number;
  readonly gridColumns: number;
  readonly readableCount: number;
  readonly reservedPositions: readonly ReservedPositionSpec[];
  readonly endHoles?: readonly EndHoleSpec[];
  readonly readOrder: ReadOrderSpec;
  readonly hookMappings: readonly HookMappingSpec[];
  readonly defaultThreadsPerHook: number;
  readonly mirrorOptions: readonly MirrorOrientation[];
  readonly cardToPass: CardToPassSpec;
  readonly physicalDimensions?: PhysicalDimensions;
  readonly verification: Readonly<Record<ProfileFieldKey, VerificationStatus>>;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FIELD_KEYS: readonly ProfileFieldKey[] = [
  "gridSize",
  "reservedPositions",
  "endHoles",
  "readOrder",
  "defaultThreadsPerHook",
  "mirrorOptions",
  "cardToPass",
  "physicalDimensions",
];
const KNOWN_HOOK_KINDS: readonly string[] = ["contiguous-visualization", "repeat"];
const KNOWN_MIRRORS: readonly string[] = ["none", "mirrored"];
const STATUSES: readonly string[] = ["unverified", "verified"];
const BASES: readonly string[] = ["paper-figure", "geometric-inference", "unknown"];
const HOOK_MAPPING_KEYS: readonly string[] = ["kind", "verification", "note"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIntIn(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

class Collector {
  readonly violations: DomainError[] = [];
  total = 0;
  add(code: ErrorCode, detail: string, path: string): void {
    this.total += 1;
    if (this.violations.length < LIMITS.maxViolations) {
      this.violations.push(makeError(code, detail, path));
    }
  }
}

function checkVerification(v: unknown, path: string, label: string, c: Collector): void {
  if (!isRecord(v)) {
    c.add("INVALID_PROFILE", `Field "${label}" has no verification status.`, path);
    return;
  }
  if (typeof v.status !== "string" || !STATUSES.includes(v.status)) {
    c.add("INVALID_PROFILE", `Field "${label}" has an unknown verification status.`, `${path}.status`);
    return;
  }
  if (typeof v.basis !== "string" || !BASES.includes(v.basis)) {
    c.add("INVALID_PROFILE", `Field "${label}" has an unknown verification basis.`, `${path}.basis`);
  }
  if (v.source !== undefined && typeof v.source !== "string") {
    c.add("INVALID_PROFILE", `Field "${label}" has a non-text source.`, `${path}.source`);
  }
  if (v.status === "verified" && (typeof v.source !== "string" || v.source.trim() === "")) {
    c.add(
      "INVALID_PROFILE",
      `Field "${label}" is marked verified without a source.`,
      `${path}.source`,
    );
  }
}

function checkPosition(
  pos: unknown,
  rows: number,
  columns: number,
  path: string,
  c: Collector,
): { gridRow: number; gridColumn: number } | undefined {
  if (!isRecord(pos) || !isIntIn(pos.gridRow, 0, Number.MAX_SAFE_INTEGER) || !isIntIn(pos.gridColumn, 0, Number.MAX_SAFE_INTEGER)) {
    c.add("INVALID_PROFILE", "A position needs integer gridRow and gridColumn.", path);
    return undefined;
  }
  if (pos.gridRow >= rows || pos.gridColumn >= columns) {
    c.add("INVALID_PROFILE", `Position (${pos.gridRow}, ${pos.gridColumn}) is outside the grid.`, path);
    return undefined;
  }
  return { gridRow: pos.gridRow, gridColumn: pos.gridColumn };
}

/**
 * Validate an unknown value as a MachineProfile. Never modifies, repairs or defaults the input.
 * The first violation is the returned error, with its specific code at top level; all violations
 * (up to LIMITS.maxViolations) are in `report` (Req 2.13).
 * Errors: `PROFILE_COUNT_MISMATCH` (readable count differs from rows x columns minus reserved),
 * `HOOK_MAPPING_INVALID` (bad `hookMappings` entry), `INVALID_PROFILE` (any violation with no more
 * specific code, including a `verified` field without a source).
 */
export function validateProfile(p: unknown): Result<MachineProfile, ReportedError> {
  const c = new Collector();
  if (!isRecord(p)) {
    c.add("INVALID_PROFILE", "The profile must be an object.", "");
    return finish(c);
  }

  if (p.schemaVersion !== 1) {
    c.add("INVALID_PROFILE", "schemaVersion must be 1.", "schemaVersion");
  }
  if (typeof p.profileId !== "string" || p.profileId === "") {
    c.add("INVALID_PROFILE", "profileId must be a non-empty string.", "profileId");
  }
  if (typeof p.displayName !== "string") {
    c.add("INVALID_PROFILE", "displayName must be a string.", "displayName");
  }

  const rowsOk = isIntIn(p.gridRows, 1, LIMITS.maxGridRows);
  const colsOk = isIntIn(p.gridColumns, 1, LIMITS.maxGridColumns);
  if (!rowsOk) c.add("INVALID_PROFILE", `gridRows must be an integer in [1, ${LIMITS.maxGridRows}].`, "gridRows");
  if (!colsOk) c.add("INVALID_PROFILE", `gridColumns must be an integer in [1, ${LIMITS.maxGridColumns}].`, "gridColumns");
  const rows = rowsOk ? (p.gridRows as number) : 0;
  const columns = colsOk ? (p.gridColumns as number) : 0;
  const gridOk = rowsOk && colsOk;

  // Reserved positions.
  const reservedKeys = new Set<number>();
  let reservedShapeOk = Array.isArray(p.reservedPositions);
  if (!reservedShapeOk) {
    c.add("INVALID_PROFILE", "reservedPositions must be an array.", "reservedPositions");
  } else if (gridOk) {
    (p.reservedPositions as unknown[]).forEach((r, i) => {
      const path = `reservedPositions[${i}]`;
      const pos = checkPosition(r, rows, columns, path, c);
      if (pos === undefined) return;
      if (typeof (r as Record<string, unknown>).role !== "string") {
        c.add("INVALID_PROFILE", "A reserved position needs a role string.", `${path}.role`);
      }
      const key = pos.gridRow * columns + pos.gridColumn;
      if (reservedKeys.has(key)) {
        c.add("INVALID_PROFILE", `Reserved position (${pos.gridRow}, ${pos.gridColumn}) is repeated.`, path);
      }
      reservedKeys.add(key);
    });
  }

  // Readable count.
  if (!isIntIn(p.readableCount, 0, Number.MAX_SAFE_INTEGER)) {
    c.add("INVALID_PROFILE", "readableCount must be a non-negative integer.", "readableCount");
  } else if (gridOk && reservedShapeOk) {
    const expected = rows * columns - (p.reservedPositions as unknown[]).length;
    if (p.readableCount !== expected) {
      c.add(
        "PROFILE_COUNT_MISMATCH",
        `readableCount is ${p.readableCount}, expected ${rows} x ${columns} - ${(p.reservedPositions as unknown[]).length} = ${expected}.`,
        "readableCount",
      );
    }
  }

  // End holes (optional).
  if (p.endHoles !== undefined) {
    if (!Array.isArray(p.endHoles)) {
      c.add("INVALID_PROFILE", "endHoles must be an array when present.", "endHoles");
    } else {
      p.endHoles.forEach((h: unknown, i: number) => {
        if (!isRecord(h) || typeof h.id !== "string" || typeof h.description !== "string") {
          c.add("INVALID_PROFILE", "An end hole needs id and description strings.", `endHoles[${i}]`);
        }
      });
    }
  }

  // Read order.
  checkReadOrder(p.readOrder, rows, columns, gridOk, reservedKeys, reservedShapeOk, p.readableCount, c);

  // Threads per hook, mirror options, card-to-pass.
  if (!isIntIn(p.defaultThreadsPerHook, 1, LIMITS.maxThreadsPerHook)) {
    c.add(
      "INVALID_PROFILE",
      `defaultThreadsPerHook must be an integer in [1, ${LIMITS.maxThreadsPerHook}].`,
      "defaultThreadsPerHook",
    );
  }
  if (
    !Array.isArray(p.mirrorOptions) ||
    p.mirrorOptions.length === 0 ||
    !p.mirrorOptions.every((m: unknown) => typeof m === "string" && KNOWN_MIRRORS.includes(m)) ||
    !p.mirrorOptions.includes("none")
  ) {
    c.add("INVALID_PROFILE", 'mirrorOptions must be a non-empty subset of "none" and "mirrored" including "none".', "mirrorOptions");
  }
  if (!isRecord(p.cardToPass) || p.cardToPass.kind !== "one-card-per-pass") {
    c.add("INVALID_PROFILE", 'cardToPass.kind must be "one-card-per-pass".', "cardToPass");
  }

  // Physical dimensions (optional).
  if (p.physicalDimensions !== undefined) {
    const d = p.physicalDimensions;
    const keys = [
      "cardWidthMm",
      "cardHeightMm",
      "originXMm",
      "originYMm",
      "rowPitchMm",
      "columnPitchMm",
      "holeDiameterMm",
    ];
    if (!isRecord(d) || !keys.every((k) => typeof d[k] === "number" && Number.isFinite(d[k] as number))) {
      c.add("INVALID_PROFILE", "physicalDimensions needs finite numbers for every dimension.", "physicalDimensions");
    }
  }

  // Hook mappings.
  if (!Array.isArray(p.hookMappings) || p.hookMappings.length === 0) {
    c.add("HOOK_MAPPING_INVALID", "hookMappings must be a non-empty array.", "hookMappings");
  } else {
    p.hookMappings.forEach((m: unknown, i: number) => {
      const path = `hookMappings[${i}]`;
      if (!isRecord(m)) {
        c.add("HOOK_MAPPING_INVALID", "A hook mapping must be an object.", path);
        return;
      }
      if (typeof m.kind !== "string" || !KNOWN_HOOK_KINDS.includes(m.kind)) {
        c.add("HOOK_MAPPING_INVALID", `Unknown hook mapping kind at ${path}.`, `${path}.kind`);
      }
      for (const k of Object.keys(m)) {
        if (!HOOK_MAPPING_KEYS.includes(k)) {
          c.add("HOOK_MAPPING_INVALID", `Unknown hook mapping parameter "${k}".`, `${path}.${k}`);
        }
      }
      if (m.note !== undefined && typeof m.note !== "string") {
        c.add("HOOK_MAPPING_INVALID", "A hook mapping note must be a string.", `${path}.note`);
      }
      checkVerification(m.verification, `${path}.verification`, `hookMappings[${i}]`, c);
    });
  }

  // Per-field verification.
  if (!isRecord(p.verification)) {
    c.add("INVALID_PROFILE", "verification must be an object with one status per field.", "verification");
  } else {
    for (const key of FIELD_KEYS) {
      checkVerification(p.verification[key], `verification.${key}`, key, c);
    }
  }

  return finish(c, p as unknown as MachineProfile);
}

function checkReadOrder(
  ro: unknown,
  rows: number,
  columns: number,
  gridOk: boolean,
  reservedKeys: ReadonlySet<number>,
  reservedShapeOk: boolean,
  readableCount: unknown,
  c: Collector,
): void {
  if (!isRecord(ro)) {
    c.add("INVALID_PROFILE", "readOrder must be an object.", "readOrder");
    return;
  }
  if (ro.kind === "column-major") {
    if (ro.columnDirection !== "right-to-left" && ro.columnDirection !== "left-to-right") {
      c.add("INVALID_PROFILE", "Unknown columnDirection.", "readOrder.columnDirection");
    }
    if (ro.rowDirection !== "bottom-up" && ro.rowDirection !== "top-down") {
      c.add("INVALID_PROFILE", "Unknown rowDirection.", "readOrder.rowDirection");
    }
    return;
  }
  if (ro.kind !== "explicit") {
    c.add("INVALID_PROFILE", "readOrder.kind must be column-major or explicit.", "readOrder.kind");
    return;
  }
  if (!Array.isArray(ro.order)) {
    c.add("INVALID_PROFILE", "readOrder.order must be an array.", "readOrder.order");
    return;
  }
  if (!gridOk || !reservedShapeOk) return;
  const seen = new Set<number>();
  ro.order.forEach((o: unknown, i: number) => {
    const path = `readOrder.order[${i}]`;
    const pos = checkPosition(o, rows, columns, path, c);
    if (pos === undefined) return;
    const key = pos.gridRow * columns + pos.gridColumn;
    if (reservedKeys.has(key)) {
      c.add("INVALID_PROFILE", `Explicit order lists reserved position (${pos.gridRow}, ${pos.gridColumn}).`, path);
    } else if (seen.has(key)) {
      c.add("INVALID_PROFILE", `Explicit order repeats position (${pos.gridRow}, ${pos.gridColumn}).`, path);
    }
    seen.add(key);
  });
  const expected = rows * columns - reservedKeys.size;
  if (seen.size !== expected || ro.order.length !== expected) {
    c.add(
      "INVALID_PROFILE",
      `Explicit order must list each of the ${expected} readable positions exactly once (found ${ro.order.length} entries).`,
      "readOrder.order",
    );
  }
  void readableCount;
}

function finish(c: Collector, value?: MachineProfile): Result<MachineProfile, ReportedError> {
  if (c.total === 0 && value !== undefined) return ok(value);
  const first = c.violations[0] ?? makeError("INVALID_PROFILE");
  return err({ ...first, report: { violations: c.violations, totalViolations: c.total } });
}

// ---------------------------------------------------------------------------
// Compilation
// ---------------------------------------------------------------------------

export interface CompiledGridPosition {
  readonly gridRow: number;
  readonly gridColumn: number;
}

/**
 * Lookup tables derived from a profile. Grid keys are `gridRow * gridColumns + gridColumn`.
 */
export interface CompiledProfile {
  readonly gridRows: number;
  readonly gridColumns: number;
  readonly readableCount: number;
  /** Grid key set of reserved positions. */
  readonly reserved: ReadonlySet<number>;
  /** Indexed by grid key. Value is the read index, or -1 for a reserved position. */
  readonly gridToRead: readonly number[];
  /** Indexed by read index. */
  readonly readToGrid: readonly CompiledGridPosition[];
}

const compileCache = new WeakMap<MachineProfile, CompiledProfile>();

/**
 * Validate and compile a profile into read-order tables. Pure; the cache (keyed on object identity)
 * never changes results, so profiles must not be mutated after compiling.
 * Errors: those of `validateProfile` (`PROFILE_COUNT_MISMATCH`, `HOOK_MAPPING_INVALID`, `INVALID_PROFILE`),
 * each at top level with the report attached; then `PROFILE_COUNT_MISMATCH` if the derived read order
 * length differs from `readableCount`.
 */
export function compileProfile(profile: MachineProfile): Result<CompiledProfile, ReportedError> {
  const cached = compileCache.get(profile);
  if (cached !== undefined) return ok(cached);

  const valid = validateProfile(profile);
  if (!valid.ok) return valid;

  const { gridRows: rows, gridColumns: columns } = profile;
  const reserved = new Set<number>();
  for (const r of profile.reservedPositions) reserved.add(r.gridRow * columns + r.gridColumn);

  const order: CompiledGridPosition[] = [];
  const ro = profile.readOrder;
  if (ro.kind === "column-major") {
    // UNVERIFIED A4: see .kiro/steering/jacquard-card-format.md (read direction relative to the photo).
    // Assumption for "bottom-up": gridRow 0 is the top edge, so bottom-up starts at gridRows - 1.
    const colSeq = sequence(columns, ro.columnDirection === "left-to-right");
    const rowSeq = sequence(rows, ro.rowDirection === "top-down");
    for (const gridColumn of colSeq) {
      for (const gridRow of rowSeq) {
        if (!reserved.has(gridRow * columns + gridColumn)) order.push({ gridRow, gridColumn });
      }
    }
  } else {
    for (const o of ro.order) order.push({ gridRow: o.gridRow, gridColumn: o.gridColumn });
  }

  if (order.length !== profile.readableCount) {
    const e = makeError(
      "PROFILE_COUNT_MISMATCH",
      `The read order has ${order.length} positions but readableCount is ${profile.readableCount}.`,
      "readOrder",
    );
    return err({ ...e, report: { violations: [e], totalViolations: 1 } });
  }

  const gridToRead: number[] = new Array<number>(rows * columns).fill(-1);
  order.forEach((pos, i) => {
    gridToRead[pos.gridRow * columns + pos.gridColumn] = i;
  });
  const compiled: CompiledProfile = Object.freeze({
    gridRows: rows,
    gridColumns: columns,
    readableCount: profile.readableCount,
    reserved,
    gridToRead: Object.freeze(gridToRead),
    readToGrid: Object.freeze(order.map((o) => Object.freeze(o))),
  });
  compileCache.set(profile, compiled);
  return ok(compiled);
}

/** 0..n-1 ascending when `ascending`, otherwise n-1..0. */
function sequence(n: number, ascending: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(ascending ? i : n - 1 - i);
  return out;
}

// Profile generators (task 3.1). Randomness comes only from fast-check, so a fixed seed reproduces every profile.
import fc from "fast-check";
import type {
  HookMappingSpec,
  MachineProfile,
  MirrorOrientation,
  ProfileFieldKey,
  ReadOrderSpec,
  ReservedPositionSpec,
  VerificationStatus,
} from "../../profile/machineProfile";

export interface GridPosition {
  readonly gridRow: number;
  readonly gridColumn: number;
}

export interface ArbProfileOptions {
  /** Largest rows and columns. Default 16. Use 256 for table-only tests (P1). */
  readonly maxDimension?: number;
  /** Largest grid cell count for which an explicit read order is generated. Default 1024. */
  readonly maxExplicitCells?: number;
}

const DEFAULT_MAX_DIMENSION = 16;
const DEFAULT_MAX_EXPLICIT_CELLS = 1024;
const MAX_RESERVED = 8;

const UNVERIFIED: VerificationStatus = {
  status: "unverified",
  basis: "unknown",
  note: "Generated test profile.",
};

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

function allUnverified(): Record<ProfileFieldKey, VerificationStatus> {
  const out = {} as Record<ProfileFieldKey, VerificationStatus>;
  for (const key of FIELD_KEYS) out[key] = { ...UNVERIFIED };
  return out;
}

/** A position inside a rows x columns grid. */
export function arbPosition(gridRows: number, gridColumns: number): fc.Arbitrary<GridPosition> {
  return fc.record({
    gridRow: fc.integer({ min: 0, max: gridRows - 1 }),
    gridColumn: fc.integer({ min: 0, max: gridColumns - 1 }),
  });
}

/**
 * A distinct, in-grid list of reserved positions in shuffled order.
 * Size is 0 to min(8, rows * columns - 1), so at least one readable position remains.
 */
export function arbReservedList(
  gridRows: number,
  gridColumns: number,
): fc.Arbitrary<ReservedPositionSpec[]> {
  const cells = gridRows * gridColumns;
  const maxLength = Math.min(MAX_RESERVED, cells - 1);
  return fc
    .uniqueArray(fc.integer({ min: 0, max: cells - 1 }), { minLength: 0, maxLength })
    .map((keys) =>
      keys.map((key, i) => ({
        gridRow: Math.floor(key / gridColumns),
        gridColumn: key % gridColumns,
        role: `reserved-${i}`,
      })),
    );
}

const arbColumnMajor: fc.Arbitrary<ReadOrderSpec> = fc.record({
  kind: fc.constant("column-major" as const),
  columnDirection: fc.constantFrom("right-to-left" as const, "left-to-right" as const),
  rowDirection: fc.constantFrom("bottom-up" as const, "top-down" as const),
});

function arbExplicitOrder(
  gridRows: number,
  gridColumns: number,
  reserved: readonly ReservedPositionSpec[],
): fc.Arbitrary<ReadOrderSpec> {
  const reservedKeys = new Set(reserved.map((r) => r.gridRow * gridColumns + r.gridColumn));
  const readable: GridPosition[] = [];
  for (let gridRow = 0; gridRow < gridRows; gridRow++) {
    for (let gridColumn = 0; gridColumn < gridColumns; gridColumn++) {
      if (!reservedKeys.has(gridRow * gridColumns + gridColumn)) readable.push({ gridRow, gridColumn });
    }
  }
  return fc
    .shuffledSubarray(readable, { minLength: readable.length, maxLength: readable.length })
    .map((order) => ({ kind: "explicit" as const, order }));
}

const arbHookMappings: fc.Arbitrary<HookMappingSpec[]> = fc
  .subarray(["contiguous-visualization", "repeat"] as const, { minLength: 1 })
  .map((kinds) =>
    kinds.map((kind) => ({ kind, verification: { ...UNVERIFIED }, note: "Generated test mapping." })),
  );

const arbMirrorOptions: fc.Arbitrary<MirrorOrientation[]> = fc
  .boolean()
  .map((withMirrored) => (withMirrored ? ["none", "mirrored"] : ["none"]));

/**
 * Valid machine profiles. Rows and columns are in [1, maxDimension] (default 16).
 * Every output passes `validateProfile` and has `readableCount >= 1`.
 */
export function arbProfile(options: ArbProfileOptions = {}): fc.Arbitrary<MachineProfile> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const maxExplicitCells = options.maxExplicitCells ?? DEFAULT_MAX_EXPLICIT_CELLS;
  const dimension = fc.integer({ min: 1, max: maxDimension });
  return fc
    .tuple(dimension, dimension)
    .chain(([gridRows, gridColumns]) => {
      return arbReservedList(gridRows, gridColumns).chain((reservedPositions) => {
        const order: fc.Arbitrary<ReadOrderSpec> =
          gridRows * gridColumns <= maxExplicitCells
            ? fc.oneof(arbColumnMajor, arbExplicitOrder(gridRows, gridColumns, reservedPositions))
            : arbColumnMajor;
        return fc.record({
          schemaVersion: fc.constant(1 as const),
          profileId: fc.constant(`generated-${gridRows}x${gridColumns}`),
          displayName: fc.constant(`Generated ${gridRows} x ${gridColumns}`),
          gridRows: fc.constant(gridRows),
          gridColumns: fc.constant(gridColumns),
          readableCount: fc.constant(gridRows * gridColumns - reservedPositions.length),
          reservedPositions: fc.constant(reservedPositions),
          readOrder: order,
          hookMappings: arbHookMappings,
          defaultThreadsPerHook: fc.integer({ min: 1, max: 16 }),
          mirrorOptions: arbMirrorOptions,
          cardToPass: fc.constant({ kind: "one-card-per-pass" as const }),
          verification: fc.constant(allUnverified()),
        });
      });
    });
}

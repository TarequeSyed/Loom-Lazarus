/**
 * Conversions between grid coordinates, machine read order and physical locations.
 * Read-order tables come only from `compileProfile`; nothing here derives its own order.
 *
 * Convention: `gridRow` 0 is the top edge as drawn, so "bottom-up" means descending `gridRow`.
 * // UNVERIFIED A3: see .kiro/steering/jacquard-card-format.md (which physical edge is gridRow 0,
 * //   and which axis the 51 rows and 8 columns follow on the card).
 * // UNVERIFIED A4: see .kiro/steering/jacquard-card-format.md
 * //   (Garin read order: rightmost column first, bottom-up within a column, i.e. descending
 * //   gridRow; the direction relative to the photo is not checked against the paper's figures).
 */

import type { GridPosition, Millimetres, PhysicalLocation, ReadIndex } from "../brand";
import { err, makeError, ok } from "../result";
import type { Result } from "../result";
import { compileProfile } from "./machineProfile";
import type { MachineProfile } from "./machineProfile";

function isIntegerIn(v: unknown, count: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < count;
}

/**
 * Grid position to read index.
 * Errors: `POSITION_OUT_OF_RANGE` (not an integer pair inside the grid), `RESERVED_POSITION`,
 * and the profile errors from `compileProfile` (invalid profile).
 */
export function gridToReadIndex(p: MachineProfile, pos: GridPosition): Result<ReadIndex> {
  const compiled = compileProfile(p);
  if (!compiled.ok) return compiled;
  const { gridRows, gridColumns, gridToRead } = compiled.value;
  const gridRow: unknown = pos.gridRow;
  const gridColumn: unknown = pos.gridColumn;
  if (!isIntegerIn(gridRow, gridRows) || !isIntegerIn(gridColumn, gridColumns)) {
    return err(
      makeError(
        "POSITION_OUT_OF_RANGE",
        `Position (${String(gridRow)}, ${String(gridColumn)}) is outside the ${gridRows} x ${gridColumns} grid.`,
      ),
    );
  }
  const readIndex = gridToRead[gridRow * gridColumns + gridColumn];
  if (readIndex === undefined || readIndex < 0) {
    return err(makeError("RESERVED_POSITION", `Position (${gridRow}, ${gridColumn}) is reserved.`));
  }
  return ok(readIndex as ReadIndex);
}

/**
 * Read index to grid position.
 * Errors: `READ_INDEX_OUT_OF_RANGE` (not an integer in `[0, readableCount - 1]`), plus profile errors.
 */
export function readIndexToGrid(p: MachineProfile, i: number): Result<GridPosition> {
  const compiled = compileProfile(p);
  if (!compiled.ok) return compiled;
  const { readableCount, readToGrid } = compiled.value;
  if (!isIntegerIn(i, readableCount)) {
    return err(
      makeError(
        "READ_INDEX_OUT_OF_RANGE",
        `Read index ${String(i)} is not an integer in 0 to ${readableCount - 1}.`,
      ),
    );
  }
  const pos = readToGrid[i];
  if (pos === undefined) {
    return err(makeError("READ_INDEX_OUT_OF_RANGE", `Read index ${i} has no grid position.`));
  }
  return ok({ gridRow: pos.gridRow, gridColumn: pos.gridColumn } as GridPosition);
}

/**
 * Grid position to physical location, using only the profile's declared physical dimensions.
 * The origin is the centre of grid position (0, 0), declared as (originXMm, originYMm); x grows with `gridColumn`
 * by `columnPitchMm` and y grows with `gridRow` by `rowPitchMm`.
 * Never estimates a location from grid coordinates alone.
 * y grows with `gridRow` (row 0 at the top as drawn; UNVERIFIED A3).
 * Errors, in check order: `PHYSICAL_DIMENSIONS_UNAVAILABLE`, then `POSITION_OUT_OF_RANGE`.
 * Reserved positions are allowed: they are real places on the card.
 */
export function gridToPhysical(p: MachineProfile, pos: GridPosition): Result<PhysicalLocation> {
  const d = p.physicalDimensions;
  if (d === undefined) return err(makeError("PHYSICAL_DIMENSIONS_UNAVAILABLE"));
  const gridRow: unknown = pos.gridRow;
  const gridColumn: unknown = pos.gridColumn;
  if (!isIntegerIn(gridRow, p.gridRows) || !isIntegerIn(gridColumn, p.gridColumns)) {
    return err(
      makeError(
        "POSITION_OUT_OF_RANGE",
        `Position (${String(gridRow)}, ${String(gridColumn)}) is outside the ${p.gridRows} x ${p.gridColumns} grid.`,
      ),
    );
  }  return ok({
    xMm: (d.originXMm + gridColumn * d.columnPitchMm) as Millimetres,
    yMm: (d.originYMm + gridRow * d.rowPitchMm) as Millimetres,
  });
}

/**
 * Branded coordinate types (Req 3.6). Brands are compile-time only; values stay plain numbers.
 * Four coordinate systems stay distinct: grid, physical, machine read order, fabric.
 */
import type { ErrorCode, Result } from "./result";
import { err, makeError, ok } from "./result";

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type GridRow = Brand<number, "GridRow">;
export type GridColumn = Brand<number, "GridColumn">;
export type ReadIndex = Brand<number, "ReadIndex">;
export type WarpIndex = Brand<number, "WarpIndex">;
export type PassIndex = Brand<number, "PassIndex">;
export type Millimetres = Brand<number, "Millimetres">;
/** Caller supplied, never generated. */
export type ActionId = string;
/** Positive integer, assigned by the library. */
export type SequenceNumber = number;

export interface GridPosition {
  readonly gridRow: GridRow;
  readonly gridColumn: GridColumn;
}
export interface PhysicalLocation {
  readonly xMm: Millimetres;
  readonly yMm: Millimetres;
}
export interface FabricCoordinate {
  readonly warpIndex: WarpIndex;
  readonly passIndex: PassIndex;
}

function checkInteger<B extends number>(
  value: number,
  name: string,
  code: ErrorCode,
  min: number,
  countExclusive: number | undefined,
): Result<B> {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return err(makeError("INVALID_FORMAT", `${name} must be an integer, got ${String(value)}.`));
  }
  if (value < min || (countExclusive !== undefined && value >= countExclusive)) {
    const range = countExclusive === undefined ? `at least ${min}` : `${min} to ${countExclusive - 1}`;
    return err(makeError(code, `${name} ${value} is outside ${range}.`));
  }
  return ok(value as B);
}

/** `rowCount`, when given, is the exclusive upper bound. */
export function asGridRow(value: number, rowCount?: number): Result<GridRow> {
  return checkInteger<GridRow>(value, "gridRow", "POSITION_OUT_OF_RANGE", 0, rowCount);
}

export function asGridColumn(value: number, columnCount?: number): Result<GridColumn> {
  return checkInteger<GridColumn>(value, "gridColumn", "POSITION_OUT_OF_RANGE", 0, columnCount);
}

export function asReadIndex(value: number, readableCount?: number): Result<ReadIndex> {
  return checkInteger<ReadIndex>(value, "readIndex", "READ_INDEX_OUT_OF_RANGE", 0, readableCount);
}

export function asWarpIndex(value: number, warpCount?: number): Result<WarpIndex> {
  return checkInteger<WarpIndex>(value, "warpIndex", "POSITION_OUT_OF_RANGE", 0, warpCount);
}

export function asPassIndex(value: number, passCount?: number): Result<PassIndex> {
  return checkInteger<PassIndex>(value, "passIndex", "SEEK_OUT_OF_RANGE", 0, passCount);
}

/** Any finite number (physical positions may be offsets). */
export function asMillimetres(value: number): Result<Millimetres> {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return err(makeError("INVALID_FORMAT", `millimetres must be a finite number, got ${String(value)}.`));
  }
  return ok(value as Millimetres);
}

export function asActionId(value: string): Result<ActionId> {
  if (typeof value !== "string" || value.length === 0) {
    return err(makeError("INVALID_FORMAT", "action id must be a non-empty string."));
  }
  return ok(value);
}

export function asSequenceNumber(value: number): Result<SequenceNumber> {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return err(makeError("INVALID_FORMAT", `sequence number must be a positive integer, got ${String(value)}.`));
  }
  return ok(value);
}

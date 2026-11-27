/**
 * Pure schema migrations (design.md, "JSON serialization", Migration).
 * Signature stubs (task 4.2). Body is implemented in task 8.2.
 */
import { notImplemented } from "../_stub";
import type { Result } from "../result";

/** Migration table keyed by source schema version. Version 1 is current, so the table is empty at release. */
export const MIGRATIONS: Readonly<Record<number, (json: unknown) => unknown>> = {};

export interface MigrationOutcome {
  readonly json: unknown;
  readonly sourceSchemaVersion: number;
  /** Names of the applied migrations, in order. */
  readonly applied: readonly string[];
}

/**
 * Migrate a parsed deck file to the current schema version, step by step. `migrations` defaults to `MIGRATIONS`
 * and exists so a test can inject a synthetic migration.
 *
 * Errors: `UNSUPPORTED_SCHEMA_VERSION` (not an integer, newer than current, or no migration for a lower version).
 */
export function migrateToCurrent(
  json: unknown,
  migrations?: Readonly<Record<number, (json: unknown) => unknown>>,
): Result<MigrationOutcome> {
  void json;
  void migrations;
  return notImplemented("migrateToCurrent");
}

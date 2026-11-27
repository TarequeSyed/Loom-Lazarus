/**
 * Canonical, schema-ordered JSON writer (design.md, "Deck file schema", Stable output).
 *
 * - Keys are written in the schema's key order, never in object insertion order.
 * - Two-space indent, `\n` line endings, exactly one trailing `\n`, no timestamps.
 * - Numbers must be finite. Absent optional fields are omitted, never written as `null`.
 * - Required nullable numbers (`restorationConfidence`, `confidence`) are always written;
 *   `null` is the literal `null`, distinct from `0`. Nothing is coerced.
 * - The value is checked with `walkSchema` first, so unknown fields, missing required
 *   fields and non-finite numbers return an error instead of silently changing the output.
 */
import { err, ok } from "../result";
import type { Result } from "../result";
import { walkSchema } from "./schema";
import type { ObjectNode, SchemaNode } from "./schema";
import { SCALAR } from "./schema";

const INDENT = "  ";

function emit(value: unknown, node: SchemaNode, parent: unknown, depth: number): string {
  switch (node.kind) {
    case "scalar":
    case "nullable-number":
      return JSON.stringify(value);
    case "union": {
      const chosen = node.select(value, parent);
      // walkSchema has already rejected values with no matching variant.
      return emit(value, chosen ?? SCALAR, parent, depth);
    }
    case "array": {
      const items = value as readonly unknown[];
      if (items.length === 0) return "[]";
      const pad = INDENT.repeat(depth + 1);
      const parts = items.map((item) => pad + emit(item, node.item, items, depth + 1));
      return `[\n${parts.join(",\n")}\n${INDENT.repeat(depth)}]`;
    }
    case "object":
      return emitObject(value as Record<string, unknown>, node, depth);
  }
}

function emitObject(value: Record<string, unknown>, node: ObjectNode, depth: number): string {
  const pad = INDENT.repeat(depth + 1);
  const parts: string[] = [];
  for (const key of node.keys) {
    const child = value[key];
    if (child === undefined) continue; // absent optional field (walkSchema rejected required ones)
    parts.push(`${pad}${JSON.stringify(key)}: ${emit(child, node.children[key] ?? SCALAR, value, depth + 1)}`);
  }
  if (parts.length === 0) return "{}";
  return `{\n${parts.join(",\n")}\n${INDENT.repeat(depth)}}`;
}

/**
 * Writes `value` as canonical JSON for `node`. Equal values give byte-identical text.
 *
 * Errors (the first problem found, in document order, with a path):
 * `UNKNOWN_FIELD`, `MISSING_REQUIRED_FIELD`, `INVALID_FORMAT` (wrong shape, `null` where
 * not allowed, non-finite number).
 */
export function writeCanonicalJson(value: unknown, node: SchemaNode): Result<string> {
  const problems = walkSchema(value, node);
  const first = problems[0];
  if (first !== undefined) return err(first);
  return ok(`${emit(value, node, undefined, 0)}\n`);
}

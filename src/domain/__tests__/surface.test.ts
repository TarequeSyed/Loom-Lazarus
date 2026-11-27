// Exported-surface snapshot (Req 12.1, 12.6). Compares every export of src/domain/index.ts,
// value and type, with the committed surface.snapshot.json.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type ExportKind = "value" | "type";
interface SurfaceEntry {
  readonly name: string;
  readonly kind: ExportKind;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const INDEX_PATH = resolve(HERE, "../index.ts");
const SNAPSHOT_PATH = resolve(HERE, "surface.snapshot.json");

function compareEntries(a: SurfaceEntry, b: SurfaceEntry): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** Reads the export names of index.ts with the TypeScript checker. One program build. */
function readSurface(): SurfaceEntry[] {
  const configPath = resolve(REPO_ROOT, "tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, REPO_ROOT);
  const program = ts.createProgram({ rootNames: [INDEX_PATH], options: parsed.options });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(INDEX_PATH);
  if (!source) throw new Error("index.ts not found in program");
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error("index.ts has no module symbol");
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol): SurfaceEntry => {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      return { name: symbol.getName(), kind: target.flags & ts.SymbolFlags.Value ? "value" : "type" };
    })
    .sort(compareEntries);
}

function describeEntry(entry: SurfaceEntry): string {
  return `${entry.name} (${entry.kind})`;
}

/** Returns null when equal, otherwise a failure message listing added and removed names. */
function diffSurface(snapshot: readonly SurfaceEntry[], current: readonly SurfaceEntry[]): string | null {
  const snap = new Set(snapshot.map(describeEntry));
  const now = new Set(current.map(describeEntry));
  const added = [...now].filter((n) => !snap.has(n)).sort();
  const removed = [...snap].filter((n) => !now.has(n)).sort();
  if (added.length === 0 && removed.length === 0) return null;
  return [
    "The exported surface of src/domain/index.ts differs from surface.snapshot.json.",
    `Added: ${added.length > 0 ? added.join(", ") : "(none)"}`,
    `Removed: ${removed.length > 0 ? removed.join(", ") : "(none)"}`,
    "Changing the snapshot requires a spec update (Requirement 12.6).",
  ].join("\n");
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as { exports: SurfaceEntry[] };
const current = readSurface();

describe("domain exported surface", () => {
  it("matches the committed snapshot (values and types)", () => {
    const message = diffSurface(snapshot.exports, current);
    expect(message, message ?? "").toBeNull();
  });

  it("keeps the snapshot sorted by name", () => {
    expect(snapshot.exports).toEqual([...snapshot.exports].sort(compareEntries));
  });

  it("agrees with the runtime value exports", async () => {
    const mod = await import("../index");
    const runtime = Object.keys(mod).sort();
    const values = current.filter((e) => e.kind === "value").map((e) => e.name);
    expect(runtime).toEqual(values);
  });

  it("exports INTERFACE_VERSION equal to 1.1.0", async () => {
    const mod = await import("../index");
    expect(mod.INTERFACE_VERSION).toBe("1.1.0");
  });

  it("reports added and removed names on mismatch (negative self-test)", () => {
    const modified: SurfaceEntry[] = [
      ...snapshot.exports.filter((e) => e.name !== "ok"),
      { name: "notARealExport", kind: "value" },
    ];
    const message = diffSurface(modified, current);
    expect(message).not.toBeNull();
    expect(message).toContain("Added: ok (value)");
    expect(message).toContain("Removed: notARealExport (value)");
    expect(message).toContain("requires a spec update");
    expect(message).toContain("12.6");
  });
});

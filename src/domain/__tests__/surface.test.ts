// Exported-surface snapshot (Req 12.1, 12.6, 12.12). Compares every export of src/domain/index.ts,
// value and type, with the committed surface.snapshot.json. Each entry records the export name, its kind and
// a normalised declaration text, so a changed parameter or return type is detected, not only a changed name.
//
// Regenerate (only through a spec update): set UPDATE_SURFACE_SNAPSHOT=1 and run this test file once.
// Refused when CI is set. A regeneration run writes the file and then FAILS; review the diff and rerun
// without the switch (Req 12.13, 13.29).
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type ExportKind = "value" | "type";
interface SurfaceEntry {
  readonly name: string;
  readonly kind: ExportKind;
  readonly declaration: string;
}
interface SurfaceSnapshot {
  readonly interfaceVersion: string;
  readonly exports: SurfaceEntry[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const INDEX_PATH = resolve(HERE, "../index.ts");
const SNAPSHOT_PATH = resolve(HERE, "surface.snapshot.json");

function compareEntries(a: SurfaceEntry, b: SurfaceEntry): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function normalise(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Reads name, kind and declaration text of every export of index.ts with the TypeScript checker.
 * One program build. Values use the printed type of the export (function signatures with parameter and
 * return types, constant types). Types use the comment-free printed declaration nodes.
 */
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
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature;

  return checker
    .getExportsOfModule(moduleSymbol)
    .map((symbol): SurfaceEntry => {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      const isValue = (target.flags & ts.SymbolFlags.Value) !== 0;
      let declaration: string;
      if (isValue) {
        const location = target.valueDeclaration ?? source;
        declaration = checker.typeToString(checker.getTypeOfSymbolAtLocation(target, location), undefined, flags);
      } else {
        declaration = (target.declarations ?? [])
          .map((d) => printer.printNode(ts.EmitHint.Unspecified, d, d.getSourceFile()))
          .join(" ");
      }
      return { name: symbol.getName(), kind: isValue ? "value" : "type", declaration: normalise(declaration) };
    })
    .sort(compareEntries);
}

function describeEntry(entry: SurfaceEntry): string {
  return `${entry.name} (${entry.kind})`;
}

/** Returns null when equal, otherwise a failure message listing added, removed and changed exports. */
function diffSurface(snapshot: readonly SurfaceEntry[], current: readonly SurfaceEntry[]): string | null {
  const snap = new Map(snapshot.map((e) => [describeEntry(e), e.declaration]));
  const now = new Map(current.map((e) => [describeEntry(e), e.declaration]));
  const added = [...now.keys()].filter((n) => !snap.has(n)).sort();
  const removed = [...snap.keys()].filter((n) => !now.has(n)).sort();
  const changed = [...now.keys()].filter((n) => snap.has(n) && snap.get(n) !== now.get(n)).sort();
  if (added.length === 0 && removed.length === 0 && changed.length === 0) return null;
  const list = (names: string[]): string => (names.length > 0 ? names.join(", ") : "(none)");
  return [
    "The exported surface of src/domain/index.ts differs from surface.snapshot.json.",
    `Added: ${list(added)}`,
    `Removed: ${list(removed)}`,
    `Changed declaration: ${list(changed)}`,
    "Changing the snapshot after the interface freeze requires a spec update (Requirement 12.6, 12.12).",
  ].join("\n");
}

type RegenerationDecision = "compare" | "regenerate" | "refuse";

const CI_REFUSAL_MESSAGE =
  "UPDATE_SURFACE_SNAPSHOT is refused when the CI environment variable is set. Regenerate the surface snapshot locally through a spec update (Requirement 12.13).";
const REGENERATED_MESSAGE =
  "Snapshot regenerated; review the diff and rerun without UPDATE_SURFACE_SNAPSHOT (Requirement 12.13, 13.29).";

/** Pure decision logic for the regeneration opt-in. CI wins over the switch. */
function decideRegeneration(env: Readonly<Record<string, string | undefined>>): RegenerationDecision {
  if (env["UPDATE_SURFACE_SNAPSHOT"] !== "1") return "compare";
  const ci = env["CI"];
  if (ci !== undefined && ci !== "") return "refuse";
  return "regenerate";
}

function writeSnapshot(path: string, entries: readonly SurfaceEntry[]): void {
  const generated: SurfaceSnapshot = { interfaceVersion: "1.1.0", exports: [...entries] };
  writeFileSync(path, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
}

/**
 * Applies the decision. Returns the failure message the run must report, or null for a normal comparison run.
 * A regeneration run writes first and still returns a failure message, so it never passes.
 */
function applyRegeneration(
  decision: RegenerationDecision,
  path: string,
  entries: readonly SurfaceEntry[],
): string | null {
  if (decision === "refuse") return CI_REFUSAL_MESSAGE;
  if (decision === "regenerate") {
    writeSnapshot(path, entries);
    return REGENERATED_MESSAGE;
  }
  return null;
}

const current = readSurface();
const regenerationFailure = applyRegeneration(decideRegeneration(process.env), SNAPSHOT_PATH, current);

const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as SurfaceSnapshot;

describe("domain exported surface", () => {
  it("is not run in regeneration mode (a regeneration or refused run always fails)", () => {
    expect(regenerationFailure, regenerationFailure ?? "").toBeNull();
  });

  it("refuses regeneration when CI is set and reports a clear message", () => {
    expect(decideRegeneration({ UPDATE_SURFACE_SNAPSHOT: "1", CI: "true" })).toBe("refuse");
    expect(decideRegeneration({ UPDATE_SURFACE_SNAPSHOT: "1", CI: "1" })).toBe("refuse");
    expect(decideRegeneration({ UPDATE_SURFACE_SNAPSHOT: "1" })).toBe("regenerate");
    expect(decideRegeneration({ CI: "true" })).toBe("compare");
    expect(decideRegeneration({})).toBe("compare");
    const dir = mkdtempSync(join(tmpdir(), "surface-ci-"));
    try {
      const path = join(dir, "snapshot.json");
      const message = applyRegeneration("refuse", path, []);
      expect(message).toContain("CI");
      expect(message).toContain("refused");
      expect(existsSync(path)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a regeneration run after writing the file (temporary path)", () => {
    const dir = mkdtempSync(join(tmpdir(), "surface-regen-"));
    try {
      const path = join(dir, "snapshot.json");
      const entries: SurfaceEntry[] = [{ name: "x", kind: "value", declaration: "() => void" }];
      const message = applyRegeneration("regenerate", path, entries);
      expect(message).toContain("Snapshot regenerated; review the diff and rerun without");
      const written = JSON.parse(readFileSync(path, "utf8")) as SurfaceSnapshot;
      expect(written.exports).toEqual(entries);
      expect(applyRegeneration("compare", path, entries)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("matches the committed snapshot (names, kinds and declaration text)", () => {
    const message = diffSurface(snapshot.exports, current);
    expect(message, message ?? "").toBeNull();
  });

  it("keeps the snapshot sorted by name and records the interface version", () => {
    expect(snapshot.exports).toEqual([...snapshot.exports].sort(compareEntries));
    expect(snapshot.interfaceVersion).toBe("1.1.0");
    expect(snapshot.exports.every((e) => e.declaration.length > 0)).toBe(true);
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

  it("does not export the internal canonical JSON writer or schema node type (S-5)", () => {
    const names = current.map((e) => e.name);
    expect(names).not.toContain("writeCanonicalJson");
    expect(names).not.toContain("SchemaNode");
  });

  it("reports added and removed names on mismatch (negative self-test)", () => {
    const modified: SurfaceEntry[] = [
      ...snapshot.exports.filter((e) => e.name !== "ok"),
      { name: "notARealExport", kind: "value", declaration: "() => void" },
    ];
    const message = diffSurface(modified, current);
    expect(message).not.toBeNull();
    expect(message).toContain("Added: ok (value)");
    expect(message).toContain("Removed: notARealExport (value)");
    expect(message).toContain("requires a spec update");
    expect(message).toContain("12.6");
  });

  it("reports a changed declaration text as a mismatch (negative self-test)", () => {
    const target = snapshot.exports.find((e) => e.kind === "value" && e.declaration.includes("=>"));
    expect(target).toBeDefined();
    const modified = snapshot.exports.map((e) =>
      e.name === target?.name ? { ...e, declaration: `${e.declaration} | undefined` } : e,
    );
    const message = diffSurface(modified, current);
    expect(message).not.toBeNull();
    expect(message).toContain(`Changed declaration: ${describeEntry(target as SurfaceEntry)}`);
    expect(message).toContain("after the interface freeze requires a spec update");
  });
});

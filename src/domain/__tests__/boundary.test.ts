// Import-boundary test (Requirements 1.5, 1.6, 1.8).
//
// Scans every `.ts` file under `src/domain`, this file included, with the TypeScript
// compiler API. The scan works on the AST, so words in comments and string literals
// never trigger it.
//
// Self-scan policy: this file is NOT exempt. It names the banned identifiers only inside
// string literals (the in-memory violating sources and the expected-name lists), which the
// AST scan ignores. It must never use a banned identifier as code.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const FORBIDDEN_LAYERS = ["vision", "restore", "benchmark", "ui", "workers"] as const;
const BANNED_IDENTIFIERS = new Set([
  "document",
  "window",
  "fetch",
  "XMLHttpRequest",
  "Date",
  "setTimeout",
  "setInterval",
]);
// `object.member` pairs banned even though the member alone is harmless.
const BANNED_MEMBERS: ReadonlyArray<readonly [string, string]> = [
  ["Math", "random"],
  ["performance", "now"],
];
// Global object aliases: `globalThis.Date` and similar bypass the identifier check.
const GLOBAL_OBJECTS = new Set(["globalThis", "self", "global"]);

const domainDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface Violation {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

function layerOfSpecifier(specifier: string, fromFile: string): string | null {
  let rest: string;
  if (specifier.startsWith(".")) {
    const target = path.resolve(path.dirname(fromFile), specifier);
    const srcDir = path.resolve(domainDir, "..");
    const rel = path.relative(srcDir, target);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
    rest = rel.split(path.sep).join("/");
  } else {
    // Alias forms: "@/vision", "~/vision", "@src/vision", "src/vision", "/src/vision".
    rest = specifier.replace(/^(?:@|~)\/?/, "").replace(/^\/+/, "").replace(/^src\//, "");
    rest = rest.replace(/^src\//, "");
  }
  const first = rest.split("/")[0] ?? "";
  return (FORBIDDEN_LAYERS as readonly string[]).includes(first) ? first : null;
}

function isReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isMethodSignature(parent) ||
      ts.isEnumMember(parent) ||
      ts.isBindingElement(parent)) &&
    parent.name === node &&
    !ts.isBindingElement(parent)
  ) {
    return false;
  }
  if (ts.isImportSpecifier(parent) && parent.propertyName === node) return false;
  if (ts.isExportSpecifier(parent) && parent.propertyName === node) return false;
  return true;
}

export function scanSource(fileName: string, text: string): Violation[] {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: Violation[] = [];
  const add = (node: ts.Node, message: string): void => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    out.push({ file: fileName, line, message });
  };
  const checkSpecifier = (node: ts.Node, spec: string): void => {
    const layer = layerOfSpecifier(spec, fileName);
    if (layer !== null) add(node, `forbidden import of src/${layer}: "${spec}"`);
  };

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      checkSpecifier(node, node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      checkSpecifier(node, node.moduleReference.expression.text);
    } else if (ts.isImportTypeNode(node)) {
      const arg = node.argument;
      if (ts.isLiteralTypeNode(arg) && ts.isStringLiteralLike(arg.literal)) {
        checkSpecifier(node, arg.literal.text);
      }
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const first = node.arguments[0];
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(callee) && callee.text === "require";
      if ((isDynamicImport || isRequire) && first !== undefined) {
        if (ts.isStringLiteralLike(first)) checkSpecifier(node, first.text);
        else add(node, "non-literal dynamic import or require cannot be checked");
      }
    }

    if (ts.isIdentifier(node) && BANNED_IDENTIFIERS.has(node.text) && isReference(node)) {
      add(node, `banned identifier: ${node.text}`);
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const obj = node.expression.text;
      const member = node.name.text;
      for (const [o, m] of BANNED_MEMBERS) {
        if (obj === o && member === m) add(node, `banned member: ${o}.${m}`);
      }
      if (GLOBAL_OBJECTS.has(obj)) {
        if (BANNED_IDENTIFIERS.has(member)) add(node, `banned global: ${obj}.${member}`);
        if (member === "Math" || member === "performance") {
          add(node, `banned global object access: ${obj}.${member}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function listTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(full);
  }
  return files.sort();
}

describe("domain import boundary", () => {
  const files = listTsFiles(domainDir);

  it("finds files to scan, including this test", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith("boundary.test.ts"))).toBe(true);
  });

  it("no file under src/domain imports an upper layer or uses a banned global", () => {
    const violations: Violation[] = [];
    for (const file of files) {
      violations.push(...scanSource(file, readFileSync(file, "utf8")));
    }
    const report = violations.map(
      (v) => `${path.relative(domainDir, v.file)}:${v.line} ${v.message}`,
    );
    expect(report).toEqual([]);
  });
});

describe("boundary scanner self-test", () => {
  const fake = path.join(domainDir, "fake.ts");
  const messages = (src: string): string[] => scanSource(fake, src).map((v) => v.message);

  it("fails on an in-memory violating source", () => {
    const src = [
      'import { a } from "../vision/index";',
      'import type { b } from "@/restore/x";',
      'export * from "src/ui/y";',
      'const c = await import("../workers/w");',
      'const d = require("../benchmark/z");',
      "const t = new Date();",
      "const r = Math.random();",
      "const p = performance.now();",
      "setTimeout(() => 1, 0);",
      "setInterval(() => 1, 0);",
      "fetch('u');",
      "new XMLHttpRequest();",
      "document.title;",
      "window.name;",
      "globalThis.Date;",
    ].join("\n");
    const found = messages(src);
    for (const layer of FORBIDDEN_LAYERS) {
      expect(found.some((m) => m.includes(`src/${layer}`))).toBe(true);
    }
    for (const name of [...BANNED_IDENTIFIERS]) {
      expect(found.some((m) => m.includes(name))).toBe(true);
    }
    expect(found).toContain("banned member: Math.random");
    expect(found).toContain("banned member: performance.now");
  });

  it("ignores comments, strings, property names and allowed imports", () => {
    const src = [
      '// uses Date and fetch and import "../vision/x"',
      'const s = "Date Math.random window";',
      "const o = { fetch: 1, document: 2 };",
      "o.fetch; o.document;",
      'import { k } from "./result";',
      'import { m } from "../domain/limits";',
      'import fs from "node:fs";',
    ].join("\n");
    expect(messages(src)).toEqual([]);
  });

  it("resolves relative imports out of the domain folder", () => {
    // The fake file sits in src/domain, so "../ui/App" is src/ui/App.
    expect(messages('import x from "../ui/App";')).toHaveLength(1);
    // "../../node_modules/ui/App" leaves src entirely and is not a layer import.
    expect(messages('import x from "../../node_modules/ui/App";')).toEqual([]);
  });
});

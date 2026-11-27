import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { writeCanonicalJson } from "../io/canonicalJson";
import { SEED_AUX_CANONICAL } from "./seeds";
import {
  CELL_NODE,
  DECK_FILE_NODE,
  EVIDENCE_NODE,
  findUnknownFields,
  walkSchema,
} from "../io/schema";

function cell(confidence: number | null, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    raw: { holeLikelihood: 0.5, value: 1 },
    initial: {
      evidence: { refs: [], text: "t" },
      restorationConfidence: confidence,
      provenance: "observed",
      effectiveValue: 1,
    },
    history: [],
    ...extra,
  };
}

function write(value: unknown, node = CELL_NODE) {
  return writeCanonicalJson(value, node);
}

describe("canonical JSON writer", () => {
  it("uses schema key order, two-space indent and \\n with one trailing newline, omitting absent optionals", () => {
    const result = write({
      history: [],
      initial: { evidence: { text: "t", refs: [] }, provenance: "ambiguous", restorationConfidence: null },
      raw: {},
    });
    expect(result).toEqual({
      ok: true,
      value: [
        "{",
        '  "raw": {},',
        '  "initial": {',
        '    "provenance": "ambiguous",',
        '    "restorationConfidence": null,',
        '    "evidence": {',
        '      "text": "t",',
        '      "refs": []',
        "    }",
        "  },",
        '  "history": []',
        "}",
      ].join("\n") + "\n",
    });
  });

  it("writes null confidence as null and 0 as 0 (distinct text)", () => {
    const withNull = write(cell(null));
    const withZero = write(cell(0));
    expect(withNull.ok && withNull.value).toContain('"restorationConfidence": null');
    expect(withZero.ok && withZero.value).toContain('"restorationConfidence": 0,');
    expect(withNull).not.toEqual(withZero);
  });

  it("is independent of insertion order and byte-identical for equal values", () => {
    const a = write(cell(0.25));
    const b = write({ history: [], initial: { ...(cell(0.25).initial as object) }, raw: { value: 1, holeLikelihood: 0.5 } });
    expect(a.ok).toBe(true);
    expect(a).toEqual(b);
  });

  it("property: equal inputs give identical text and null never equals a number", () => {
    // Precondition: any confidence that is null or a finite number in [0, 1].
    fc.assert(
      fc.property(fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }), (confidence) => {
        const first = write(cell(confidence));
        const second = write(structuredClone(cell(confidence)));
        expect(first).toEqual(second);
        const text = first.ok ? first.value : "";
        expect(text.endsWith("}\n")).toBe(true);
        expect(text.endsWith("\n\n")).toBe(false);
        expect(text.includes('"restorationConfidence": null')).toBe(confidence === null);
      }),
      { seed: SEED_AUX_CANONICAL, numRuns: 100 },
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite number %s with a path",
    (bad) => {
      const result = write(cell(bad));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("INVALID_FORMAT");
        expect(result.error.path).toBe("initial.restorationConfidence");
      }
    },
  );

  it("reports a missing restorationConfidence and never defaults it", () => {
    const value = cell(null);
    delete (value.initial as Record<string, unknown>).restorationConfidence;
    const result = write(value);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("MISSING_REQUIRED_FIELD");
      expect(result.error.path).toBe("initial.restorationConfidence");
    }
  });

  it("reports an undefined restorationConfidence as missing", () => {
    const result = write(cell(undefined as unknown as null));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MISSING_REQUIRED_FIELD");
  });

  it("reports unknown fields with a path, including colour fields on a cell", () => {
    const value = cell(0.5, { colour: "#fff" });
    expect(findUnknownFields(value, CELL_NODE).map((e) => [e.code, e.path])).toEqual([
      ["UNKNOWN_FIELD", "colour"],
    ]);
    const result = write(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNKNOWN_FIELD");
  });

  it("reports nested unknown fields with indexed paths", () => {
    const entry = { text: "x", refs: [{ kind: "note", bogus: 1 }] };
    expect(findUnknownFields(entry, EVIDENCE_NODE, "cards[3].cells[17]").map((e) => e.path)).toEqual([
      "cards[3].cells[17].refs[0].bogus",
    ]);
  });

  it("selects history entry variants by kind and always writes inference confidence", () => {
    const history = [
      {
        kind: "inference",
        actionId: "a3",
        sequence: 3,
        previous: { provenance: "ambiguous", confidence: null, evidence: { text: "n", refs: [] } },
        provenance: "ambiguous",
        confidence: null,
        evidence: { text: "e", refs: [] },
        policyNote: "p",
      },
    ];
    const result = write(cell(null, { history }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('"confidence": null');
      expect(result.value.indexOf('"previous"')).toBeLessThan(result.value.indexOf('"policyNote"'));
    }
    const bad = write(cell(null, { history: [{ kind: "nope" }] }));
    expect(bad.ok).toBe(false);
  });

  it("walks the deck file wrapper: top-level schemaVersion, no schemaVersion inside deck", () => {
    const errors = walkSchema({ format: "loom-lazarus-deck", deck: { schemaVersion: 1 } }, DECK_FILE_NODE);
    const codes = errors.map((e) => `${e.code}@${e.path}`);
    expect(codes).toContain("MISSING_REQUIRED_FIELD@schemaVersion");
    expect(codes).toContain("UNKNOWN_FIELD@deck.schemaVersion");
    expect(codes).toContain("MISSING_REQUIRED_FIELD@deck.profile");
  });
});

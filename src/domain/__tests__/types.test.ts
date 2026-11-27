import { describe, expect, it } from "vitest";
import { DIGEST_ALGORITHM } from "../session/sessionLog";
import type { SessionActionKind } from "../session/sessionLog";
import type { CellInitial, EffectiveView, EditEntry, PreviousFields, WithdrawalEntry } from "../types";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function assertType<_T extends true>(): void {}

const evidence = { text: "e", refs: [] };

describe("persisted domain types (compile-time)", () => {
  it("types restorationConfidence and confidence as required number | null", () => {
    assertType<Equal<EffectiveView["restorationConfidence"], number | null>>();
    assertType<Equal<CellInitial["restorationConfidence"], number | null>>();
    assertType<Equal<PreviousFields["confidence"], number | null>>();
    assertType<Equal<WithdrawalEntry["restored"]["confidence"], number | null>>();

    // @ts-expect-error restorationConfidence is required on CellInitial
    const missingInitial: CellInitial = { provenance: "ambiguous", evidence };
    // @ts-expect-error confidence is required on PreviousFields
    const missingPrev: PreviousFields = { provenance: "observed", evidence };
    // @ts-expect-error restorationConfidence is required on EffectiveView
    const missingView: EffectiveView = { provenance: "observed", evidence };
    // @ts-expect-error confidence is required in withdrawal.restored
    const missingRestored: WithdrawalEntry["restored"] = { provenance: "observed", evidence };
    // @ts-expect-error undefined is not allowed for restorationConfidence
    const undef: CellInitial = { provenance: "ambiguous", evidence, restorationConfidence: undefined };
    // @ts-expect-error user-edited is not a valid initial provenance
    const badProv: CellInitial = { provenance: "user-edited", evidence, restorationConfidence: null };

    const okInitial: CellInitial = { provenance: "ambiguous", evidence, restorationConfidence: null };
    expect(okInitial.restorationConfidence).toBeNull();
    void [missingInitial, missingPrev, missingView, missingRestored, undef, badProv];
  });

  it("covers every EditEntry kind and all 16 session action kinds", () => {
    assertType<Equal<EditEntry["kind"], "user-edit" | "inference" | "undo" | "withdrawal">>();
    const kinds: readonly SessionActionKind[] = [
      "user-edit", "undo-edit", "set-inferred", "withdraw-inference", "request-approval",
      "revoke-approval", "reorder-cards", "insert-card", "remove-card", "duplicate-card",
      "sim-create", "sim-step", "sim-pause", "sim-resume", "sim-seek", "sim-reset",
    ];
    expect(new Set(kinds).size).toBe(16);
    expect(DIGEST_ALGORITHM).toBe("fnv1a-64-v1");
  });
});

/**
 * Bitmap converter (design.md, "Bitmap converter").
 * Signature stub (task 4.2). Body is implemented in task 10.1.
 *
 * Every created cell has `raw.value` = the bit, provenance `observed` and `restorationConfidence` the number 1
 * (the specified import value for ground-truth input; not `null`). Image decoding and thresholding are the
 * caller's job.
 */
import { notImplemented } from "../_stub";
import type { ActionId } from "../brand";
import type { MachineProfile } from "../profile/machineProfile";
import type { Result } from "../result";
import type { Deck } from "../types";

export type Bitmap = readonly (readonly number[])[];

/**
 * Convert a binary bitmap to a Deck, one card per row, bitmap column c = readIndex c, card ids
 * `${cardIdPrefix}-${zero-padded row}`.
 *
 * An empty bitmap `[]` has no width, so it reports `BITMAP_HEIGHT_UNSUPPORTED` (the height check runs first when
 * the bitmap has no rows, Req 10.10).
 *
 * Errors, in check order: `BITMAP_WIDTH_UNSUPPORTED` (readableCount above 2,048 or width differs from
 * readableCount; no crop, pad or scale), `BITMAP_HEIGHT_UNSUPPORTED` (0 or above 10,000 rows),
 * `BITMAP_NOT_BINARY` (a value other than 0 or 1, or unequal row lengths, naming the first row and column).
 */
export function bitmapToDeck(
  bitmap: Bitmap,
  profile: MachineProfile,
  options: { cardIdPrefix: string; actionId: ActionId },
): Result<Deck> {
  void bitmap;
  void profile;
  void options;
  return notImplemented("bitmapToDeck");
}

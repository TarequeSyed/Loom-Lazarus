/**
 * SVG exporter (design.md, "SVG exporter").
 * Signature stubs (task 4.2). Bodies are implemented in task 11.1.
 * The caveat text below is final.
 */
import { notImplemented } from "../_stub";
import type { MachineProfile } from "../profile/machineProfile";
import type { Result } from "../result";
import type { Card, Deck } from "../types";

export interface SvgExportOptions {
  readonly scale: number;
  readonly unit: "px" | "mm";
  readonly profile: MachineProfile;
}

export const SVG_CAVEAT =
  "Not validated for physical laser cutting or any physical loom. Dimensions are unverified unless marked verified in the Machine_Profile.";

/**
 * Export one card. Uses `deck.profile`; `o.profile` must have the same `profileId` (Req 11.11).
 *
 * Errors, in check order: `INVALID_EXPORT_OPTIONS` (scale not a positive finite number, or unit not
 * `px` or `mm`), `INVALID_FORMAT` (`o.profile.profileId` differs from `deck.profile.profileId`),
 * `PHYSICAL_DIMENSIONS_UNAVAILABLE` (`mm` without `profile.physicalDimensions`), `UNKNOWN_CARD`
 * (the card is not in the deck).
 */
export function exportCardSvg(card: Card, deck: Deck, o: SvgExportOptions): Result<string> {
  void card;
  void deck;
  void o;
  return notImplemented("exportCardSvg");
}

/**
 * Export every card of a deck. Follows the same profile rule as `exportCardSvg`. Errors, in check order:
 * `INVALID_EXPORT_OPTIONS`, `INVALID_FORMAT` (profile id), `PHYSICAL_DIMENSIONS_UNAVAILABLE`.
 */
export function exportDeckSvg(deck: Deck, o: SvgExportOptions): Result<string> {
  void deck;
  void o;
  return notImplemented("exportDeckSvg");
}

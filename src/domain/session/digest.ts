/**
 * State digest (design.md, "State_Digest").
 * Signature stub (task 4.2). Body is implemented in task 14.1.
 * `DIGEST_ALGORITHM` is defined once in `sessionLog.ts` and re-exported here.
 */
import { notImplemented } from "../_stub";
import type { SessionState } from "./sessionLog";

export { DIGEST_ALGORITHM } from "./sessionLog";

/**
 * 64-bit FNV-1a over the UTF-8 bytes of the canonical JSON of `{ deck, simulation? }`, as 16 lowercase hex
 * characters. Digest form: in the digested `simulation`, the deck is replaced by its `deckDigest`; the persisted
 * `SimulationState` keeps the full deck. The digest input is the canonical writer's output including its trailing
 * `\n`. A `null` confidence and a `0` confidence give different digests. This is a corruption check, not
 * tamper protection. Never fails: no `Result`, no error codes.
 */
export function stateDigest(state: SessionState): string {
  void state;
  return notImplemented("stateDigest");
}

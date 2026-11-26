/** Resource limits checked before expensive work (design.md, "Schema versioning and limits"). */
export const LIMITS = {
  maxCardsPerDeck: 10_000,
  maxJsonBytes: 8 * 1024 * 1024,
  maxSessionLogBytes: 32 * 1024 * 1024,
  maxSessionActions: 100_000,
  maxBitmapRows: 10_000,
  maxBitmapColumns: 2_048,
  maxThreadsPerHook: 64,
  maxEvidenceChars: 1_000,
  maxEditNoteChars: 1_000,
  maxViolations: 100,
  maxFabricCells: 4_000_000,
  maxGridRows: 256,
  maxGridColumns: 256,
} as const;

/** Schema versions this library can read. */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1];

/**
 * TEMPORARY. Placeholder body for signature stubs declared in task 4.2.
 * Each owning task replaces its stub bodies and removes the import. Task 16.3 asserts
 * that no module imports this file, after which the file is deleted.
 *
 * It throws a clearly named error because a stub must never be mistaken for a working
 * function. It uses no banned global.
 */
export class NotImplementedError extends Error {
  constructor(name: string) {
    super(`NOT_IMPLEMENTED: ${name} is a signature stub (task 4.2) and has no body yet.`);
    this.name = "NotImplementedError";
  }
}

export function notImplemented(name: string): never {
  throw new NotImplementedError(name);
}

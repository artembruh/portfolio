/**
 * Extracts a string message from an unknown error value.
 * Avoids `any` casts and works for Error instances, strings, and arbitrary objects.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

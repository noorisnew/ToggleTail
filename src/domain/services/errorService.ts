/**
 * Normalize any error value into a user-friendly string message.
 * @param e - The error value (Error, string, or unknown)
 * @returns A string representation of the error
 */
export function normalizeError(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  return 'An unknown error occurred';
}

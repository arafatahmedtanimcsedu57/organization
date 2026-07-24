/**
 * Extracts a human-readable message out of an RTK Query error, unwrapping the
 * Nest `ValidationPipe` / `BadRequestException` payload (`{ data: { message } }`,
 * where `message` may be a string or an array of field errors). Falls back to a
 * generic message for network/unknown errors.
 */
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }
  }
  return 'Something went wrong. Please try again.';
}

export function assertNonEmpty(value: string, message: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(message);
  }
  return value;
}

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}


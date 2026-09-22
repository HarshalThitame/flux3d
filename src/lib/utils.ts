/** Lightweight cn replacement — joins truthy class strings */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

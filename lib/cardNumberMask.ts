/** Demo checkout: standard 16-digit PAN cap for inputs. */
export const MAX_CARD_DIGITS = 16;

export function clampCardDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, MAX_CARD_DIGITS);
}

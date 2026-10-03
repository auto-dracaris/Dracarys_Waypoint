/**
 * Normalizes phone numbers to standard Sri Lankan international format without leading plus:
 * e.g., '0711120401' -> '94711120401'
 *       '+94711120401' -> '94711120401'
 *       '711120401' -> '94711120401'
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) {
    return '';
  }

  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0 (e.g. 071...), replace leading 0 with 94
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.slice(1);
  } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
    // e.g. 711120401 -> 94711120401
    cleaned = '94' + cleaned;
  }

  return cleaned;
}

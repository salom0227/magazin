/**
 * Format currency to Uzbek Som (UZS)
 * e.g. 15400000 -> "15 400 000 so'm"
 */
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) return "0 so'm";
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
}

/**
 * Calculate monthly installment (e.g. 12 months split)
 */
export function formatInstallment(price: number, customFormatPrice?: (price: number) => string, months: number = 12): string {
  const monthly = Math.round(price / months);
  const formatFn = customFormatPrice || formatPrice;
  return `${formatFn(monthly)} / oyiga`;
}

/**
 * Format date to readable Uzbek string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}, ${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}

/**
 * Format phone display e.g. +998 90 123 45 67
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+998') && cleaned.length === 13) {
    return `${cleaned.slice(0, 4)} (${cleaned.slice(4, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}-${cleaned.slice(11, 13)}`;
  }
  return phone;
}

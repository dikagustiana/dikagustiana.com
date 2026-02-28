/**
 * Format an ISO date string to a short display format.
 * Within the current year: "Jun 15"
 * Prior years: "Jun 15, 2024"
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const currentYear = new Date().getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    if (date.getFullYear() === currentYear) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${date.getFullYear()}`;
  } catch {
    return isoDate;
  }
}

/**
 * Format an ISO date string to a short display format.
 * Within the current year: "Jun 15"
 * Prior years: "Jun 15, 2024"
 */
export function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
    // Render in UTC, deliberately. `essays.date` is a Postgres DATE; it
    // arrives as UTC midnight, and formatting it in the viewer's zone shifts
    // it a day for everyone west of UTC — "Mar 9" published, "Mar 8" shown.
    // A calendar date has no timezone; render the calendar date.
    const currentYear = new Date().getUTCFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    if (date.getUTCFullYear() === currentYear) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${date.getUTCFullYear()}`;
  } catch {
    return isoDate;
  }
}

/**
 * A calendar date, always with its year: "26 May 2025".
 *
 * `formatDate` drops the year inside the current one, which is right for a
 * feed of recent essays and wrong for anything dated against an archive: a
 * correction shown as "14 Sep" beside an entry shown as "Jun 15, 2025" reads
 * as the older of the two. A dated correction that hides its year is not a
 * dated correction. Rendered in UTC for the same reason as above.
 */
export function fullDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

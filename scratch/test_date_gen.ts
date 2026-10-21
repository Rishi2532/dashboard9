const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateRecentDateStrings(referenceDateStr?: string, daysLookback: number = 35): string[] {
  let baseDate = new Date();
  if (referenceDateStr) {
    const parts = referenceDateStr.split('-');
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const monIdx = MONTHS_SHORT.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
      if (!isNaN(day) && monIdx !== -1) {
        baseDate = new Date(Date.UTC(2026, monIdx, day));
      }
    }
  }

  const dateStrings = new Set<string>();
  for (let i = 0; i < daysLookback; i++) {
    const d = new Date(baseDate.getTime() - i * 86400000);
    const day = d.getUTCDate();
    const mon = MONTHS_SHORT[d.getUTCMonth()];
    const padDay = String(day).padStart(2, '0');
    // Standard formats present in database
    dateStrings.add(`${padDay}-${mon}`);     // '19-Oct', '01-Oct'
    dateStrings.add(`${day}-${mon}`);        // '1-Oct'
    dateStrings.add(`${padDay}-${mon}-25`);  // '01-Oct-25'
    dateStrings.add(`${day}-${mon}-2025`);   // '1-Oct-2025'
    dateStrings.add(`${padDay}-${mon}-2026`);// '19-Oct-2026'
    dateStrings.add(`${day}-${mon}-2026`);   // '19-Oct-2026'
  }
  return Array.from(dateStrings);
}

const dates = generateRecentDateStrings('19-Oct', 35);
console.log(`Generated ${dates.length} date strings:`, dates.slice(0, 15));

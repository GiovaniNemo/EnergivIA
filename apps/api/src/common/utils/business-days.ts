export function getBusinessDaysDiff(startDate: Date, endDate: Date = new Date()): number {
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (cur >= end) return 0;

  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

export function getTrialDaysLeft(startDate: Date, maxBusinessDays = 5): number {
  const diff = getBusinessDaysDiff(startDate, new Date());
  return Math.max(0, maxBusinessDays - diff);
}

export function isTrialExpired(startDate: Date, maxBusinessDays = 5): boolean {
  return getBusinessDaysDiff(startDate, new Date()) >= maxBusinessDays;
}

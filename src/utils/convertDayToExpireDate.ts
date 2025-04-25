export function convertDayToExpireDate(days: number): Date {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now;
}

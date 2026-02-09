export function convertDayToExpireDate(days) {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return now;
}

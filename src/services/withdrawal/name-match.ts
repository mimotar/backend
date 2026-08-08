/** Soft-normalize person names for KYC vs bank account comparison. */
export function normalizePersonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|miss|ms|dr|prof|eng|alhaja|alhaji|chief)\b\.?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Soft match: exact normalized equality, or all tokens of the shorter name
 * appear in the longer name (handles middle-name omissions).
 */
export function softNameMatch(a: string, b: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftTokens = left.split(" ").filter(Boolean);
  const rightTokens = right.split(" ").filter(Boolean);
  const [shorter, longer] =
    leftTokens.length <= rightTokens.length
      ? [leftTokens, rightTokens]
      : [rightTokens, leftTokens];

  if (shorter.length === 0) return false;
  return shorter.every((token) => longer.includes(token));
}

export function buildKycLegalName(user: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  sureName?: string | null;
}): string {
  return [user.firstName, user.middleName, user.lastName || user.sureName]
    .filter((part) => part && String(part).trim())
    .join(" ");
}

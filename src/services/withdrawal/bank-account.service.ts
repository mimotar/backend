import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import prisma from "../../utils/prisma.js";
import {
  flutterwaveListBanks,
  flutterwaveResolveAccount,
} from "./flutterwave-payout.service.js";
import { buildKycLegalName, softNameMatch } from "./name-match.js";

async function assertCanManageBank(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userKYC: true },
  });

  if (!user) {
    throw new GlobalError("User not found", "NOT_FOUND", 404, true);
  }
  if (!user.verified) {
    throw new GlobalError(
      "Email verification is required before adding a bank account",
      "EMAIL_NOT_VERIFIED",
      403,
      true
    );
  }
  if (!user.userKYC?.isVerified) {
    throw new GlobalError(
      "Identity KYC verification is required before adding a bank account",
      "KYC_REQUIRED",
      403,
      true
    );
  }

  return user;
}

export async function listNigerianBanksService() {
  return flutterwaveListBanks("NG");
}

export async function getBankAccountService(userId: number) {
  return prisma.bankAccountDetail.findUnique({ where: { userId } });
}

export async function saveBankAccountService(
  userId: number,
  input: { bankCode: string; accountNumber: string; bankName?: string }
) {
  const user = await assertCanManageBank(userId);
  const accountNumber = String(input.accountNumber).replace(/\s+/g, "");
  const bankCode = String(input.bankCode).trim();

  if (!/^\d{10}$/.test(accountNumber)) {
    throw new GlobalError(
      "Account number must be a 10-digit Nuban",
      "INVALID_ACCOUNT_NUMBER",
      400,
      true
    );
  }

  const resolved = await flutterwaveResolveAccount(accountNumber, bankCode);
  const legalName = buildKycLegalName(user);

  if (!softNameMatch(legalName, resolved.accountName)) {
    throw new GlobalError(
      "Resolved account name does not match your verified KYC name",
      "NAME_MISMATCH",
      409,
      true
    );
  }

  let bankName = input.bankName?.trim();
  if (!bankName) {
    const banks = await flutterwaveListBanks("NG");
    bankName =
      banks.find((b) => String(b.code) === bankCode)?.name || `Bank ${bankCode}`;
  }

  return prisma.bankAccountDetail.upsert({
    where: { userId },
    create: {
      userId,
      bankCode,
      bankName,
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
    },
    update: {
      bankCode,
      bankName,
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
    },
  });
}

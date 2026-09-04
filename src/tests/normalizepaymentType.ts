import { mapFlutterwavePaymentTypeToEnum } from "../controllers/payment/normalizepaymentType.js";

describe("mapFlutterwavePaymentTypeToEnum", () => {
  it("maps card types", () => {
    expect(mapFlutterwavePaymentTypeToEnum("card")).toBe("ATM_CARD");
  });

  it("maps bank, account, nqr, and transfer types to BANK_TRANSFER", () => {
    expect(mapFlutterwavePaymentTypeToEnum("account")).toBe("BANK_TRANSFER");
    expect(mapFlutterwavePaymentTypeToEnum("bank_transfer")).toBe("BANK_TRANSFER");
    expect(mapFlutterwavePaymentTypeToEnum("nqr")).toBe("BANK_TRANSFER");
  });

  it("does not throw on missing payment_type", () => {
    expect(mapFlutterwavePaymentTypeToEnum(undefined)).toBe("ATM_CARD");
    expect(mapFlutterwavePaymentTypeToEnum(null)).toBe("ATM_CARD");
  });

  it("does not throw on unknown payment_type", () => {
    expect(mapFlutterwavePaymentTypeToEnum("mobilemoneyghana")).toBe("ATM_CARD");
  });
});

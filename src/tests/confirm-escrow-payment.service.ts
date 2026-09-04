import axios from "axios";
import { prisma } from "../config/db.js";
import { activateTransactionAfterPayment } from "../services/payment/activate-after-payment.service.js";
import { sendEmailWithTemplate } from "../services/emailService.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import {
  confirmEscrowPayment,
  confirmEscrowPaymentForTransaction,
} from "../services/payment/confirm-escrow-payment.service.js";

jest.mock("axios");
jest.mock("../config/env.js", () => ({
  env: {
    FLW_API_SECRET_KEY: "test-secret",
    FLW_BASE_URL: "https://api.flutterwave.com/v3",
  },
}));
jest.mock("../config/db.js", () => ({
  prisma: {
    transaction: { findUnique: jest.fn() },
    payment: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("../services/payment/activate-after-payment.service.js", () => ({
  activateTransactionAfterPayment: jest.fn().mockResolvedValue({ status: "ONGOING" }),
}));
jest.mock("../services/emailService.js", () => ({
  sendEmailWithTemplate: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("../utils/payment/getTransactionParticipants.js", () => ({
  getTransactionParticipants: jest.fn().mockResolvedValue({
    buyer: { fullname: "Buyer", email: "buyer@example.com" },
    seller: { fullname: "Seller", email: "seller@example.com" },
    creatorId: 1,
  }),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const pendingPayment = {
  id: 11,
  transaction_id: 7,
  transaction_reference: "MIM_pending_ref",
  status: "PENDING",
  amount: 10300,
};

const approvedTransaction = {
  id: 7,
  status: "APPROVED",
  amount: 10000,
  pay_escrow_fee: "CLIENT",
  currency: "NGN",
  transaction_description: "Build a site",
  payment: pendingPayment,
};

function flwVerifyResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: "success",
    data: {
      id: 999,
      status: "successful",
      amount: 10300,
      currency: "NGN",
      tx_ref: "MIM_pending_ref",
      payment_type: "card",
      meta: { transaction_id: 7, description: "Build a site" },
      ...overrides,
    },
  };
}

describe("confirmEscrowPayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
      cb({
        payment: {
          update: prisma.payment.update,
          create: prisma.payment.create,
        },
      })
    );
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(approvedTransaction);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(pendingPayment);
    (prisma.payment.update as jest.Mock).mockResolvedValue({
      ...pendingPayment,
      status: "COMPLETED",
    });
    (prisma.payment.create as jest.Mock).mockResolvedValue({
      id: 11,
      status: "COMPLETED",
    });
    mockedAxios.get.mockResolvedValue({ data: flwVerifyResponse() });
  });

  it("does not roll back activation when payment_type is missing or unknown", async () => {
    mockedAxios.get.mockResolvedValue({
      data: flwVerifyResponse({ payment_type: undefined }),
    });

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      webhookPayload: { data: { id: 999, tx_ref: "MIM_pending_ref" } },
    });

    expect(result.outcome).toBe("activated");
    expect(activateTransactionAfterPayment).toHaveBeenCalledWith(7, expect.anything());
    expect(prisma.payment.update).toHaveBeenCalled();
  });

  it("completes a PENDING payment matched by tx_ref instead of skipping it", async () => {
    mockedAxios.get.mockResolvedValue({
      data: flwVerifyResponse({ meta: undefined }),
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(pendingPayment);

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      txRef: "MIM_pending_ref",
    });

    expect(result.outcome).toBe("activated");
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
    expect(activateTransactionAfterPayment).toHaveBeenCalled();
  });

  it("resolves the Mimotar transaction via stored tx_ref when meta is missing", async () => {
    mockedAxios.get.mockResolvedValue({
      data: flwVerifyResponse({ meta: undefined }),
    });
    (prisma.payment.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.transaction_reference === "MIM_pending_ref") {
        return Promise.resolve(pendingPayment);
      }
      return Promise.resolve(null);
    });

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      webhookPayload: { data: { id: 999, tx_ref: "MIM_pending_ref" } },
    });

    expect(result.outcome).toBe("activated");
    expect(result.transactionId).toBe(7);
  });

  it("activates an EXPIRED transaction after a successful charge", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...approvedTransaction,
      status: "EXPIRED",
    });

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      mimotarTransactionId: 7,
    });

    expect(result.outcome).toBe("activated");
    expect(activateTransactionAfterPayment).toHaveBeenCalledWith(7, expect.anything());
  });

  it("is idempotent when the webhook is delivered again after success", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...approvedTransaction,
      status: "ONGOING",
      payment: { ...pendingPayment, status: "COMPLETED" },
    });

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      mimotarTransactionId: 7,
    });

    expect(result.outcome).toBe("already_processed");
    expect(activateTransactionAfterPayment).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("still activates when a COMPLETED payment exists but the deal is stuck APPROVED", async () => {
    const completed = { ...pendingPayment, status: "COMPLETED" };
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...approvedTransaction,
      payment: completed,
    });
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(completed);

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      mimotarTransactionId: 7,
    });

    expect(result.outcome).toBe("activated");
    expect(activateTransactionAfterPayment).toHaveBeenCalled();
  });

  it("does not fail the confirm if seller email sending throws", async () => {
    (sendEmailWithTemplate as jest.Mock).mockRejectedValueOnce(new Error("brevo down"));

    const result = await confirmEscrowPayment({
      flwTransactionId: 999,
      mimotarTransactionId: 7,
    });

    expect(result.outcome).toBe("activated");
  });

  it("verify fallback activates when the webhook never ran", async () => {
    const result = await confirmEscrowPaymentForTransaction(7, {});

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://api.flutterwave.com/v3/transactions/verify_by_reference",
      expect.objectContaining({
        params: { tx_ref: "MIM_pending_ref" },
      })
    );
    expect(result.outcome).toBe("activated");
    expect(activateTransactionAfterPayment).toHaveBeenCalled();
    expect(getTransactionParticipants).toHaveBeenCalled();
  });

  it("rejects amount mismatch", async () => {
    mockedAxios.get.mockResolvedValue({
      data: flwVerifyResponse({ amount: 50 }),
    });

    await expect(
      confirmEscrowPayment({ flwTransactionId: 999, mimotarTransactionId: 7 })
    ).rejects.toMatchObject({
      name: "AMOUNT_MISMATCH",
      statusCode: 409,
    });
    expect(activateTransactionAfterPayment).not.toHaveBeenCalled();
  });
});

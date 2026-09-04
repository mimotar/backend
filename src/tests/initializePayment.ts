import axios from "axios";
import { prisma } from "../config/db.js";
import { initializeFlutterwavePaymentService } from "../services/payment/initializePayment.js";
import { checkAndExpireAllTransactionService } from "../services/ticket.service.js";

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
  },
}));
jest.mock("../services/ticket.service.js", () => ({
  checkAndExpireAllTransactionService: jest.fn().mockResolvedValue(undefined),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const approvedTransaction = {
  id: 7,
  status: "APPROVED",
  amount: 10000,
  pay_escrow_fee: "CLIENT",
  currency: "NGN",
  reciever_role: "FREELANCER",
  creator_email: "buyer@example.com",
  creator_fullname: "Buyer",
  creator_address: null,
  reciever_email: "seller@example.com",
  receiver_fullname: "Seller",
  receiver_address: null,
  transaction_description: "Build a site",
  payment: null,
};

describe("initializeFlutterwavePaymentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkAndExpireAllTransactionService as jest.Mock).mockResolvedValue(undefined);
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(approvedTransaction);
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.payment.create as jest.Mock).mockResolvedValue({ id: 1, status: "PENDING" });
    (prisma.payment.update as jest.Mock).mockResolvedValue({ id: 1, status: "PENDING" });
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { status: "success", data: { link: "https://checkout.flutterwave.com/pay" } },
    });
  });

  it("creates a PENDING payment with the Flutterwave tx_ref", async () => {
    const result = await initializeFlutterwavePaymentService({ transaction_id: 7 });

    expect(result.data?.link).toBe("https://checkout.flutterwave.com/pay");
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transaction_id: 7,
          status: "PENDING",
          amount: 10300,
        }),
      })
    );
    const created = (prisma.payment.create as jest.Mock).mock.calls[0][0].data;
    expect(created.transaction_reference).toMatch(/^MIM_/);
  });

  it("updates the existing PENDING payment on re-init instead of inserting a second row", async () => {
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      transaction_id: 7,
      status: "PENDING",
      transaction_reference: "MIM_old",
    });

    await initializeFlutterwavePaymentService({ transaction_id: 7 });

    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transaction_id: 7 },
        data: expect.objectContaining({
          status: "PENDING",
        }),
      })
    );
  });

  it("rejects initialize when a COMPLETED payment already exists", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue({
      ...approvedTransaction,
      payment: { status: "COMPLETED" },
    });

    await expect(
      initializeFlutterwavePaymentService({ transaction_id: 7 })
    ).rejects.toMatchObject({
      message: "ALREADY_PAID",
      statusCode: 400,
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

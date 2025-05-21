import { Ticket } from "../controllers/ticket.controller";
import { PrismaClient } from "@prisma/client";
import { createToken } from "../utils/createToken";
import { convertDayToExpireDate } from "../utils/convertDayToExpireDate";
import { TransactionSchema } from "../zod/TicketSchema";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { prismaMock } from "../utils/prismaJestSingleton";

jest.mock("../utils/createToken", () => ({
  createToken: jest.fn(),
}));

jest.mock("../utils/convertDayToExpireDate", () => ({
  convertDayToExpireDate: jest.fn((x) => x),
}));

jest.mock("../zod/TicketSchema", () => ({
  TransactionSchema: {
    safeParse: jest.fn(),
  },
}));

describe("Ticket.GenerateTicket", () => {
  let mockPrisma: any;
  let ticket: Ticket;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    // mockPrisma = {
    //   transaction: {
    //     create: jest.fn((x) => x),
    //   },
    // };
    // ticket = new Ticket(mockPrisma);
    ticket = new Ticket(prismaMock);

    req = {
      body: {
        amount: 100,
        transaction_description: "Test Transaction",
        user_id: "user123",
        pay_escrow_fee: true,
        additional_agreement: "Agreement details",
        pay_shipping_cost: false,
        creator_fullname: "John Doe",
        creator_email: "john@example.com",
        creator_no: "1234567890",
        creator_address: "123 Street",
        creator_role: "buyer",
        receiver_fullname: "Jane Smith",
        reciever_email: "jane@example.com",
        receiver_no: "0987654321",
        receiver_address: "321 Avenue",
        reciever_role: "seller",
        terms: "some terms",
        transactionType: "purchase",
        expiresAt: 2,
        inspection_duration: 3,
      },
    };

    res = {
      status: jest.fn(),
      json: jest.fn(),
    };

    next = jest.fn();

    // Default mocks
    (TransactionSchema.safeParse as jest.Mock).mockReturnValue({
      success: true,
      data: req.body,
    });
    (convertDayToExpireDate as jest.Mock).mockReturnValue(
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    );
    (createToken as jest.Mock).mockResolvedValue("mocked-token");
    prismaMock.transaction.create.mockResolvedValue(
      req
      //   {
      //   id: 123,
      //   receiver_fullname: "Jane Smith",
      //   reciever_email: "jane@example.com",
      //   receiver_no: "0987654321",
      //   created_at: new Date(),
      //   transactionToken: "mocked-token",
      //   txn_link: `${process.env.FRONTEND_URL}/ticket/mocked-token`,
      //   amount: 100,
      //   transaction_description: "Test Transaction",
      // }
    );
  });

  it("should create a ticket successfully", async () => {
    await ticket.GenerateTicket(req, res, next);

    expect(TransactionSchema.safeParse).toHaveBeenCalledWith(
      expect.objectContaining(req.body)
    );
    expect(createToken).toHaveBeenCalled();
    prismaMock.user.create.mockResolvedValue(req);
    // await expect(prismaMock.transaction.create).resolves.toEqual(req);
    // expect(res.status).toHaveBeenCalledWith(200);
    // expect(res.json).toHaveBeenCalledWith({
    //   message: "Ticket created successfully",
    //   data: expect.objectContaining({
    //     id: 123,
    //     receiver_fullname: "Jane Smith",
    //     reciever_email: "jane@example.com",
    //     receiver_no: "0987654321",
    //     created_at: new Date(),
    //     transactionToken: "mocked-token",
    //     txn_link: `${process.env.FRONTEND_URL}/ticket/mocked-token`,
    //     amount: 100,
    //     transaction_description: "Test Transaction",
    //   }),
    // });
    // expect(next).not.toHaveBeenCalled();
  });
});

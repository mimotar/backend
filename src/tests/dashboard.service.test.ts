import prisma from "../utils/prisma.js";
import { DashboardService } from "../services/dashboard/dashboard.service.js";
import { ProjectsQuerySchema } from "../zod/TicketSchema.js";
import { listUserProjectsService } from "../services/project-list.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    earnings: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("DashboardService - Active Contracts and User Filtering", () => {
  const mockUser = {
    id: 42,
    email: "user@example.com",
    walletBalanceNGN: 50000,
    walletBalanceUSD: 100,
  };

  it("throws error when user is not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(DashboardService(999)).rejects.toThrow("User not found");
  });

  it("returns active contracts including unfunded and funded tickets, computing locked escrow correctly", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(5);
    (prisma.dispute.count as jest.Mock).mockResolvedValue(0);
    (prisma.transaction.groupBy as jest.Mock).mockResolvedValue([
      { status: "CREATED", _count: { id: 1 } },
      { status: "ONGOING", _count: { id: 1 } },
    ]);
    (prisma.earnings.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    const unfundedTicket = {
      id: 101,
      title: "Design Landing Page",
      amount: 50000,
      currency: "NGN",
      status: "CREATED",
      deadline: new Date("2026-11-01T00:00:00.000Z"),
      created_at: new Date("2026-10-10T12:00:00.000Z"),
      user_id: 42,
      payment_sent_to_escrow_at: null,
      transactionType: "PROJECT",
      pay_escrow_fee: "CREATOR",
      creator_email: "user@example.com",
      creator_fullname: "Alice Creator",
      creator_role: "BUYER",
      reciever_email: "bob@example.com",
      receiver_fullname: "Bob Counterparty",
      reciever_role: "SELLER",
      payment: null,
      milestones: [],
    };

    const fundedTicket = {
      id: 102,
      title: "Backend Development",
      amount: 100000,
      currency: "NGN",
      status: "ONGOING",
      deadline: new Date("2026-12-01T00:00:00.000Z"),
      created_at: new Date("2026-10-11T12:00:00.000Z"),
      user_id: 99,
      payment_sent_to_escrow_at: new Date("2026-10-11T13:00:00.000Z"),
      transactionType: "MILESTONE_BASED_PROJECT",
      pay_escrow_fee: "RECEIVER",
      creator_email: "charlie@example.com",
      creator_fullname: "Charlie Client",
      creator_role: "BUYER",
      reciever_email: "user@example.com",
      receiver_fullname: "Alice Receiver",
      reciever_role: "SELLER",
      payment: { status: "COMPLETED" },
      milestones: [
        {
          id: 1,
          name: "Phase 1 API",
          status: "ONGOING",
          amount: 60000,
          sequence: 1,
        },
        {
          id: 2,
          name: "Phase 2 Integration",
          status: "CREATED",
          amount: 40000,
          sequence: 2,
        },
      ],
    };

    (prisma.transaction.findMany as jest.Mock)
      .mockResolvedValueOnce([unfundedTicket, fundedTicket]) // activeTransactions
      .mockResolvedValueOnce([]); // actionCandidates
    (prisma.dispute.findMany as jest.Mock).mockResolvedValue([]); // openDisputes

    const dashboard = await DashboardService(42);

    // Verify activeContracts returns both tickets
    expect(dashboard.activeContracts).toHaveLength(2);

    // Unfunded contract
    expect(dashboard.activeContracts[0]).toMatchObject({
      id: 101,
      title: "Design Landing Page",
      status: "CREATED",
      fundedStatus: "UNFUNDED",
      counterparty: {
        name: "Bob Counterparty",
        email: "bob@example.com",
      },
      role: "BUYER",
    });

    // Funded contract with active milestone
    expect(dashboard.activeContracts[1]).toMatchObject({
      id: 102,
      title: "Backend Development",
      status: "ONGOING",
      fundedStatus: "FUNDED",
      counterparty: {
        name: "Charlie Client",
        email: "charlie@example.com",
      },
      role: "SELLER",
      activeMilestone: {
        id: 1,
        name: "Phase 1 API",
        status: "ONGOING",
        amount: 60000,
      },
    });

    // Verify lockedEscrow locks the uncompleted milestone amounts of the funded ticket (60000 + 40000 = 100000)
    // while unfunded ticket (50000) is excluded from lockedEscrow.
    expect(dashboard.balance.lockedEscrow).toEqual({
      NGN: 100000,
      USD: 0,
    });

    // Verify findMany was queried with ACTIVE_CONTRACT_STATUSES and userFilter
    const activeContractsQuery = (prisma.transaction.findMany as jest.Mock).mock.calls[0][0];
    expect(activeContractsQuery.where.AND[0]).toEqual({
      OR: [
        { user_id: 42 },
        { creator_email: { equals: "user@example.com", mode: "insensitive" } },
        { reciever_email: { equals: "user@example.com", mode: "insensitive" } },
      ],
    });
    expect(activeContractsQuery.where.AND[1].status.in).toEqual(
      expect.arrayContaining(["CREATED", "APPROVED", "CHANGES_REQUESTED", "ONGOING", "PENDING_CLOSURE", "DISPUTE"])
    );
    expect(activeContractsQuery.orderBy).toEqual({ created_at: "desc" });
  });

  it("handles user identification via user_id correctly for counterparty and role", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.transaction.count as jest.Mock).mockResolvedValue(1);
    (prisma.dispute.count as jest.Mock).mockResolvedValue(0);
    (prisma.transaction.groupBy as jest.Mock).mockResolvedValue([
      { status: "ONGOING", _count: { id: 1 } },
    ]);
    (prisma.earnings.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    const ticketOwnedByUserId = {
      id: 201,
      title: "Owned by user_id",
      amount: 30000,
      currency: "USD",
      status: "ONGOING",
      deadline: new Date("2026-11-01T00:00:00.000Z"),
      created_at: new Date("2026-10-10T12:00:00.000Z"),
      user_id: 42,
      payment_sent_to_escrow_at: new Date("2026-10-10T12:30:00.000Z"),
      transactionType: "PROJECT",
      pay_escrow_fee: "CREATOR",
      creator_email: "different-email@example.com",
      creator_fullname: "Alice Alt",
      creator_role: "SELLER",
      reciever_email: "client@example.com",
      receiver_fullname: "Client Corp",
      reciever_role: "BUYER",
      payment: { status: "COMPLETED" },
      milestones: [],
    };

    (prisma.transaction.findMany as jest.Mock)
      .mockResolvedValueOnce([ticketOwnedByUserId])
      .mockResolvedValueOnce([]);
    (prisma.dispute.findMany as jest.Mock).mockResolvedValue([]);

    const dashboard = await DashboardService(42);

    expect(dashboard.activeContracts).toHaveLength(1);
    // Because user_id === 42, the user is recognized as the creator, so counterparty is receiver
    expect(dashboard.activeContracts[0].counterparty).toEqual({
      name: "Client Corp",
      email: "client@example.com",
    });
    expect(dashboard.activeContracts[0].role).toBe("SELLER");
  });
});

describe("ProjectsQuerySchema and listUserProjectsService", () => {
  it("parses 'active' status alias into ONGOING, PENDING_CLOSURE, DISPUTE", () => {
    const result = ProjectsQuerySchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toEqual(["ONGOING", "PENDING_CLOSURE", "DISPUTE"]);
    }

    const upperResult = ProjectsQuerySchema.safeParse({ status: "ACTIVE" });
    expect(upperResult.success).toBe(true);
    if (upperResult.success) {
      expect(upperResult.data.status).toEqual(["ONGOING", "PENDING_CLOSURE", "DISPUTE"]);
    }
  });

  it("parses combined statuses with 'active' without duplicates", () => {
    const result = ProjectsQuerySchema.safeParse({ status: "active,COMPLETED,ONGOING" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toEqual(["ONGOING", "PENDING_CLOSURE", "DISPUTE", "COMPLETED"]);
    }
  });

  it("passes user_id and case-insensitive email match in listUserProjectsService", async () => {
    (prisma.transaction.count as jest.Mock).mockResolvedValue(0);
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

    await listUserProjectsService(
      "test@example.com",
      { page: 1, limit: 10 },
      100
    );

    expect(prisma.transaction.findMany).toHaveBeenCalled();
    const findManyArg = (prisma.transaction.findMany as jest.Mock).mock.calls[0][0];

    expect(findManyArg.where.AND[0]).toEqual({
      OR: [
        { user_id: 100 },
        { creator_email: { equals: "test@example.com", mode: "insensitive" } },
        { reciever_email: { equals: "test@example.com", mode: "insensitive" } },
      ],
    });
  });
});

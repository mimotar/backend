import { ResolutionOption } from "@prisma/client";

export interface UpdateDisputeInput {
  disputeId: number;
  userId: number;
  data: {
    description?: string;
    reason?: any;
    resolutionOption?: ResolutionOption;
    evidence?: string;
    statusId?: number;
  };
}

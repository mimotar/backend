import { Reasons, ResolutionOption } from "@prisma/client";

export interface UpdateDisputeInput {
  disputeId: number;
  userId: number;
  data: {
    description?: string;
    reason?: Reasons;
    resolutionOption?: ResolutionOption;
    evidence?: string;
    statusId?: number;
  };
}

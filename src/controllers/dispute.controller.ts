import { NextFunction, Request, Response } from "express";

import { uploadToCloudinary } from "../config/cloudinary";
import { DisputeSchema } from "../zod/Dispute.zod";
import disputeService from "../services/dispute.service";

const CreateDisputeController = async (
  req: Request,
  res: Response
) => {
  const user = req.user;
  try {
    const files = (req.files as Express.Multer.File[]) || [];

    let evidenceUrl: string[] = [];
    let evidenceId: string[] = [];

    if (files.length) {
      const uploads = await Promise.all(
        files.map((file) => uploadToCloudinary(file))
      );
      evidenceUrl = uploads.map((u) => (u as any).url);
      evidenceId = uploads.map((u) => (u as any).public_id);
    }

    const parsed = DisputeSchema.parse({
      transactionId: parseInt(req.body.transactionId),
      reason: req.body.reason,
      description: req.body.description,
      resolutionOption: req.body.resolutionOption,
      evidenceUrl,
      evidenceId,
    });

    console.log("Parsed dispute data:", parsed);

    const dispute = await disputeService.createDispute(parsed, (user as any)?.id);
    res.status(201).json({
      message: "Dispute created successfully",
      status: "success",
      payload: req.body,
      dispute,
    });
  } catch (error) {
    console.error("Error in DisputeController:", error);
    res
      .status(500)
      .json({
        error: "Error creating dispute",
        message: error instanceof Error ? error.message : "Unknown error",
      });
  }
};


const DeleteDisputeController  = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  try {
    const deletedDispute = await disputeService.deleteDispute(parseInt(id));
    res.status(200).json({
      message: "Dispute deleted successfully",
      status: "success",
      payload: deletedDispute,
    });
  } catch (error) {
    console.error("Error in DeleteDisputeController:", error);
    res.status(500).json({
      error: "Error deleting dispute",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};


const GetUserDisputesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  try {
    const disputes = await disputeService.getUserDisputes((user as any).id);
    res.status(200).json({
      message: "User disputes retrieved successfully",
      status: "success",
      data: disputes,
    });
  } catch (error) {
    console.error("Error in GetUserDisputesController:", error);
    res.status(500).json({
      error: "Error retrieving user disputes",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const GetDisputeByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    const dispute = await disputeService.getDisputeById(parseInt(id));
    res.status(200).json({
      message: "Dispute retrieved successfully",
      status: "success",
      payload: dispute,
    });
  } catch (error) {
    console.error("Error in GetDisputeById:", error);   
    res.status(500).json({
      error: "Error retrieving dispute",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};



export { CreateDisputeController, DeleteDisputeController, GetUserDisputesController, GetDisputeByIdController };

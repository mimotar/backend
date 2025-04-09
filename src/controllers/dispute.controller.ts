import { Request, Response } from "express";
import { createDisputeService, getAllUserDisputes, getDisputeById } from "../services/dispute.service";
import { cloudinaryConfig } from "../config/cloudinary";

export const createDisputeController = async (req: any, res: any) => {
    const {id } = req.user;
    const {transactionId, reason, description, resolutionOption} = req.body;

    if(!id){
         res.status(400).json({ message: "User ID is required", success: false });
         return;
    }

    const file = req.file;
    let evidenceUrl = "";
    let evidenceId = "";

    if (file) {
        const uploadResult = await cloudinaryConfig.uploader.upload_stream({
            folder: "dispute-evidence",
            resource_type: "auto",
        },
        async(error: Error | null, result: { secure_url: string; public_id: string } | undefined) => {
            if (error) {
            console.error("Error uploading file to Cloudinary:", error);
             res.status(500).json({ message: "Error uploading file", success: false });
             return
            }
            if (result) {
            evidenceUrl = result.secure_url;
            evidenceId = result.public_id;
            }
            const disputeData = {
                userId: id,
                orderId: transactionId,
                reason,
                resolutionOption,
                description,
                evidenceUrl,
                evidenceId
            }
            const disputeResult = await createDisputeService(disputeData);
            if (disputeResult.status !== 201) {
                 res.status(disputeResult.status).json({ message: disputeResult.message, success: false });
                    return;
            }
            res.status(201).json({
                message: "Dispute created successfully",
                data: disputeResult,
                success: true
            });
        }
        )
        file.stream.pipe(uploadResult);
    } else {
        const disputeData = {
            userId: id,
            orderId: transactionId,
            reason,
            resolutionOption,
            description,
            evidenceUrl,
            evidenceId
        }
        const disputeResult = await createDisputeService(disputeData);
        if (disputeResult.status !== 201) {
             res.status(disputeResult.status).json({ message: disputeResult.message, success: false });
                return;
        }
        res.status(201).json({
            message: "Dispute created successfully",
            data: disputeResult,
            success: true
        });
    
    }
}


export const getDisputeController = async (req: any, res: any) => {
    try{
        const {userId } = req.user;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const result = await getAllUserDisputes(userId);
        res.status(201).json({
            message: "Dispute created successfully",
            data: result,
            sucess: true
        })

    } catch (error) {
        console.error("Error creating dispute:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const getSingleDisputeController = async (req: Request, res: Response) => {
    const { disputeId } = req.params;
    if (!disputeId) {
        return res.status(400).json({ message: "Dispute ID is required" });
    }
    try{
        const result = await getDisputeById(Number(disputeId));
        res.status(201).json({
            message: "Dispute fetched successfully",
            data: result,
            sucess: true
        })

    } catch (error) {
        console.error("Error creating dispute:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export const getUserDisputeController = async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }
    try{
        const result = await getAllUserDisputes(Number(userId));
        res.status(201).json({
            message: "Dispute fetched successfully",
            data: result,
            sucess: true
        })

    } catch (error) {
        console.error("Error creating dispute:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}







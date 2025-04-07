import { Request, Response } from "express";
import { createDisputeService, getAllUserDisputes, getDisputeById } from "../services/dispute.service";

export const createDisputeController = async (req: any, res: any) => {
    try{
        const result = await createDisputeService(req.body);
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







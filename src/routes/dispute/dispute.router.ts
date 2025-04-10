import { Router } from "express";
import { createDisputeController } from "../../controllers/dispute.controller";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware";
import { validateDisputeCreateInput } from "../../middlewares/validations/createDisputeValidation";

const disputeRouter = Router();

disputeRouter.post('/create', authenticateTokenMiddleware, validateDisputeCreateInput, createDisputeController)


export default disputeRouter;
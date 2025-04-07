import { Router } from "express";
import { createDisputeController } from "../../controllers/dispute.controller";

const disputeRouter = Router();

disputeRouter.route("/")
    .post(createDisputeController)


export default disputeRouter;
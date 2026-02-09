import { Router } from "express";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware.js";
import { DeleteDisputeController, CreateDisputeController, GetDisputeByIdController, GetUserDisputesController } from "../../controllers/dispute.controller.js";
import { validateSchema } from "../../middlewares/validations/allroute.validation.js";
import { DisputeSchema } from "../../zod/Dispute.zod.js";
import { upload } from "../../config/cloudinary.js";
import createRateLimiterMiddleware from "../../utils/loginLimiter.js";

const disputeRouter = Router();

disputeRouter.post('/', 
    authenticateTokenMiddleware, 
     createRateLimiterMiddleware(10 * 60 * 1000, 10),
    upload.array('evidence', 5),
    validateSchema(DisputeSchema), 
    CreateDisputeController
)

disputeRouter.delete('/:id', 
    authenticateTokenMiddleware, 
     createRateLimiterMiddleware(10 * 60 * 1000, 10),
    DeleteDisputeController
);

disputeRouter.get('/:id',
    authenticateTokenMiddleware,
     createRateLimiterMiddleware(10 * 60 * 1000, 10),
    GetDisputeByIdController
);  

disputeRouter.get('/',
    authenticateTokenMiddleware,
     createRateLimiterMiddleware(10 * 60 * 1000, 10),
    GetUserDisputesController
);




export default disputeRouter;
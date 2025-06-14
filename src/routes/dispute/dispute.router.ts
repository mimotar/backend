import { Router } from "express";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware";
import { DeleteDisputeController, CreateDisputeController, GetDisputeByIdController, GetUserDisputesController } from "../../controllers/dispute.controller";
import { validateSchema } from "../../middlewares/validations/allroute.validation";
import { DisputeSchema } from "../../zod/Dispute.zod";
import { upload } from "../../config/cloudinary";
import createRateLimiterMiddleware from "../../utils/loginLimiter";

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
import { Router } from "express";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware";
import { DeleteDisputeController, CreateDisputeController, GetDisputeByIdController, GetUserDisputesController } from "../../controllers/dispute.controller";
import { validateSchema } from "../../middlewares/validations/allroute.validation";
import { DisputeSchema } from "../../zod/Dispute.zod";
import { upload } from "../../config/cloudinary";

const disputeRouter = Router();

disputeRouter.post('/', 
    authenticateTokenMiddleware, 
    upload.array('evidence', 5),
    validateSchema(DisputeSchema), 
    CreateDisputeController
)

disputeRouter.delete('/:id', 
    authenticateTokenMiddleware, 
    DeleteDisputeController
);

disputeRouter.get('/:id',
    authenticateTokenMiddleware,
    GetDisputeByIdController
);  

disputeRouter.get('/',
    authenticateTokenMiddleware,
    GetUserDisputesController
);




export default disputeRouter;
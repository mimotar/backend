// import { sendEmailController } from "../controllers/emailController";

import { Router } from "express";
import { EmailController } from "../controllers/test/email";
const emailROuter = Router();

emailROuter.post("/", EmailController.welcome);

// const emailRouter = express.Router();

// emailRouter.post("/send-email", sendEmailController);

// export default emailRouter;

export default emailROuter;
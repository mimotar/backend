import { sendEmailController } from "../controllers/emailController";

const express = require("express");


const emailRouter = express.Router();

emailRouter.post("/send-email", sendEmailController);

export default emailRouter;

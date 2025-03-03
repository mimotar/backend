import { sendEmailController } from "../controllers/emailController";

const express = require("express");


const router = express.Router();

router.post("/send-email", sendEmailController);

module.exports = router;

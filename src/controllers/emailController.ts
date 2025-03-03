import { Request, Response } from "express";
import { sendEmail } from "../services/emailService";
import { EmailType } from "../emails/templates/emailTypes";


export async function sendEmailController(req: Request, res: Response) {
  const { email, type, params } = req.body;

  if (!email || !type || !params) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const result = await sendEmail(email, type as EmailType, params);
    if (result.success) {
      return res.status(200).json({ message: result.message });
    } else {
      return res.status(500).json({ message: "Error sending email", error: result.error });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error });
  }
}

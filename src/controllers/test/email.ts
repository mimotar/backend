import { Response, Request } from "express";
import { sendEmailWithTemplate } from "../../services/emailService";

class emailControllers {
  async welcome(req: Request, res: Response) {
    sendEmailWithTemplate("kcblack22@gmail.com", { firstname: "Agu!" }, 1);
    res.send("Email sent");
  }
}

export const EmailController = new emailControllers();

import { Router } from "express";
import { contactController } from "../../controllers/contact/contact.controller.js";

const contactRouter = Router();

contactRouter.post("/", contactController.create);
contactRouter.get("/", contactController.getAll);
contactRouter.get("/:id", contactController.getById);
contactRouter.put("/:id", contactController.update);
contactRouter.delete("/:id", contactController.delete);
contactRouter.delete("/", contactController.deleteAll);

export default contactRouter;
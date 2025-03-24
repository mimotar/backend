import { Router } from "express";
// import emailRouter from "./emailRoute";
import signupRouter from "./auth/signup";
import emailRouter from "./emailRoute";

const router = Router();
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use("/auth", signupRouter);

router.post("/middleware", (req, res) => {
  res.send("middleware");
});

router.use("/email", emailRouter);



// router.use("/email", emailRouter )

export default router;

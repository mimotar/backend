import { Router } from "express";

const router = Router();
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.post("/middleware", (req, res) => {
  res.send("middleware");
});

export default router;

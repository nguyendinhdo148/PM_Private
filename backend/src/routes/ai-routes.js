import express from "express";
import { askAnalystController } from "../controllers/ai-controller.js";

const router = express.Router();

router.post("/analyst", askAnalystController);

export default router;
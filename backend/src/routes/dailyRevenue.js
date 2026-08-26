import express from "express";
import { bulkImport, create, getAll, getById, update, remove } from "../controllers/dailyRevenue.js";

const router = express.Router();

router.post("/", create);
router.post("/import", bulkImport);
router.get("/", getAll);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
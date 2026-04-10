import express from "express";
import { 
  createCommissionBill, 
  getAllCommissionBills, 
  updateCommissionBill, 
  deleteCommissionBill 
} from "../controllers/wineCommission.js";

const router = express.Router();

router.post("/", createCommissionBill);
router.get("/", getAllCommissionBills);
router.put("/:id", updateCommissionBill);
router.delete("/:id", deleteCommissionBill);

export default router;
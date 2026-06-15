import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import { fundController } from "../controllers/fund.js";

const router = express.Router();

// Bỏ hẳn chữ dashboard, dùng root "/"
router.get("/", authMiddleware, fundController.getFunds);

router.post(
  "/transaction",
  authMiddleware,
  validateRequest({
    body: z.object({
      title: z.string().min(1, "Nội dung không được để trống"),
      description: z.string().optional(),
      type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADVANCE"]),
      amount: z.number().positive("Số tiền phải lớn hơn 0"),
      transactionDate: z.string().min(1, "Ngày thực hiện không được trống"),
    }),
  }),
  fundController.addTransaction
);

router.put(
  "/transaction/:transactionId",
  authMiddleware,
  validateRequest({
    params: z.object({ transactionId: z.string() }),
    body: z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      type: z.enum(["DEPOSIT", "WITHDRAWAL", "ADVANCE"]).optional(),
      amount: z.number().positive().optional(),
      transactionDate: z.string().optional(),
    }),
  }),
  fundController.updateTransaction
);

router.delete(
  "/transaction/:transactionId",
  authMiddleware,
  validateRequest({
    params: z.object({ transactionId: z.string() }),
  }),
  fundController.deleteTransaction
);

router.post(
  "/transaction/:transactionId/recover",
  authMiddleware,
  validateRequest({
    params: z.object({ transactionId: z.string() }),
  }),
  fundController.recoverAdvance
);

export default router;
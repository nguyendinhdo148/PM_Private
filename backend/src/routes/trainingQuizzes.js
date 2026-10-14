
import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";

import {
  submitQuiz,
  getMyQuizHistory,
  getQuizAttemptById,
} from "../controllers/quizAttempt.js";

const router = express.Router();

// Lịch sử kiểm tra của tài khoản hiện tại
router.get(
  "/history",
  authMiddleware,
  getMyQuizHistory
);

// Nộp bài kiểm tra và chấm điểm ở backend
router.post(
  "/:lessonId/submit",
  authMiddleware,
  submitQuiz
);

// Xem kết quả một lần làm bài
router.get(
  "/attempts/:id",
  authMiddleware,
  getQuizAttemptById
);

export default router;

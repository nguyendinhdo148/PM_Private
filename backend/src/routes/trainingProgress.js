
import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";

import {
  getMyLearningProgress,
  updateLearningProgress,
  getMyLearningSummary,
} from "../controllers/learningProgress.js";

const router = express.Router();

// Tổng quan học tập của tài khoản hiện tại
router.get("/summary", authMiddleware, getMyLearningSummary);

// Danh sách tiến độ học của tài khoản hiện tại
router.get("/", authMiddleware, getMyLearningProgress);

// Cập nhật tiến độ một bài học
router.patch(
  "/:lessonId",
  authMiddleware,
  updateLearningProgress
);

export default router;

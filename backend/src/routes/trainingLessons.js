import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import roleMiddleware from "../middleware/role-middleware.js";

import {
  generateLessonWithAI,
  createLessonManually,
  getLessons,
  getLessonById,
  updateLesson,
  publishLesson,
  archiveLesson,
  deleteLesson,
  submitQuiz,        // 👈 THÊM
  updateProgress,    // 👈 THÊM
} from "../controllers/lesson.js";

const router = express.Router();

// Tạo bài học bằng AI — chỉ cashier
router.post(
  "/generate",
  authMiddleware,
  roleMiddleware(["cashier"]),
  generateLessonWithAI
);

// Tạo bài học thủ công — chỉ cashier
router.post(
  "/manual",
  authMiddleware,
  roleMiddleware(["cashier"]),
  createLessonManually
);

// Lấy danh sách bài học
router.get("/", authMiddleware, getLessons);

// Xem chi tiết bài học
router.get("/:id", authMiddleware, getLessonById);

// Chỉnh sửa bài học
router.put("/:id", authMiddleware, updateLesson);

// Xuất bản bài học
router.patch("/:id/publish", authMiddleware, publishLesson);

// Lưu trữ bài học
router.patch("/:id/archive", authMiddleware, archiveLesson);

// Xóa bài học
router.delete("/:id", authMiddleware, deleteLesson);

// Nộp bài kiểm tra — chấm điểm server-side
router.post("/:id/quiz/submit", authMiddleware, submitQuiz);  // 👈 THÊM

// Cập nhật tiến độ học tập
router.patch("/progress/:lessonId", authMiddleware, updateProgress);  // 👈 THÊM

export default router;

import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";

import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  publishCourse,
  addLessonToCourse,
  removeLessonFromCourse,
  deleteCourse,
} from "../controllers/course.js";

const router = express.Router();

router.post("/", authMiddleware, createCourse);
router.get("/", authMiddleware, getCourses);
router.get("/:id", authMiddleware, getCourseById);

router.put("/:id", authMiddleware, updateCourse);

router.patch("/:id/publish", authMiddleware, publishCourse);

router.post(
  "/:id/lessons/:lessonId",
  authMiddleware,
  addLessonToCourse
);

router.delete(
  "/:id/lessons/:lessonId",
  authMiddleware,
  removeLessonFromCourse
);

router.delete("/:id", authMiddleware, deleteCourse);

export default router;

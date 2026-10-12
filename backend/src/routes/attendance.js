import express from "express";

import {
  generateMonthlyAttendance,
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendanceDay,
  updateAttendanceSchedule,
  addOvertimeEntry,
  updateOvertimeEntry,
  deleteOvertimeEntry,
  updateAttendanceStatus,
  deleteAttendance,
} from "../controllers/attendance.js";

const router = express.Router();

router.get("/", getAttendances);

router.post("/generate", generateMonthlyAttendance);

router.post("/", createAttendance);

router.get("/:id", getAttendanceById);

// Cập nhật lịch phân ca.
router.patch("/:id/schedule", updateAttendanceSchedule);

// Cập nhật chấm công từng ngày.
router.put("/:id/day", updateAttendanceDay);

// Quản lý OT.
router.post("/:id/overtime", addOvertimeEntry);

router.put("/:id/overtime/:entryId", updateOvertimeEntry);

router.delete("/:id/overtime/:entryId", deleteOvertimeEntry);

// Xác nhận, khóa hoặc mở bảng công.
router.patch("/:id/status", updateAttendanceStatus);

// Xóa bảng công.
router.delete("/:id", deleteAttendance);

export default router;
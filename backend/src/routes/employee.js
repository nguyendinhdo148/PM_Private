import express from "express";
import multer from "multer";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  deleteEmployeeAvatar,
  uploadEmployeeAvatar,
} from "../controllers/employee.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ được upload file hình ảnh"));
    }
  },
});
/**
 * Employee
 */

// GET /api/employees
router.get("/", getEmployees);

// GET /api/employees/:id
// POST /api/employees/upload-avatar
router.post(
  "/upload-avatar",
  upload.single("file"),
  uploadEmployeeAvatar
);
router.get("/:id", getEmployeeById);

// POST /api/employees
router.post("/", createEmployee);

// PUT /api/employees/:id
router.put("/:id", updateEmployee);

// DELETE /api/employees/:id
router.delete("/:id", deleteEmployee);

// PATCH /api/employees/:id/status
router.patch(
  "/:id/status",
  updateEmployeeStatus
);

// DELETE /api/employees/:id/avatar
router.delete(
  "/:id/avatar",
  deleteEmployeeAvatar
);

// POST /api/employees/upload-avatar
router.post("/upload-avatar", uploadEmployeeAvatar);

export default router;
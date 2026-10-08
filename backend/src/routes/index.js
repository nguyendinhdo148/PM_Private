import express from "express";
import authRoutes from "./auth.js";
import workspaceRoutes from "./workspace.js";
import projectRoutes from "./project.js";
import taskRoutes from "./task.js";
import userRoutes from "./user.js";
import epicRoutes from "./epic.js";
import storyRoutes from "./story.js";
import chatRoutes from "./chat.js";
import notificationRoutes from "./notification.js";
import monthlyReportRoutes from "./monthlyReport.js";
import dailyRevenueRoutes from "./dailyRevenue.js";
import invoiceMonthRoutes from "./invoiceMonth.js";
import invoiceRoutes from "./invoice.js";
import staffRoutes from "./staff.js";
import tipRoutes from "./tip.js";
import fundRoutes from "./fund.js";
import wineCommissionRoutes from "./wineCommission.js";
import cancelReportRoutes from "./cancelReport.js";
import bottleKeepRoutes from "./bottleKeep.js";
import aiRoutes from "./ai-routes.js";
import employeeRoutes from "./employee.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);
router.use("/epics", epicRoutes);
router.use("/stories", storyRoutes);
router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);
router.use("/monthly-reports", monthlyReportRoutes);
router.use("/daily-revenues", dailyRevenueRoutes);
router.use("/invoice-months", invoiceMonthRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/tips", tipRoutes);
router.use("/staff", staffRoutes);
router.use("/funds", fundRoutes);

// Hoa hồng rượu
router.use("/wine-commission", wineCommissionRoutes);

// Quản lý hủy món
router.use("/cancel-reports", cancelReportRoutes);

// Gửi rượu / Bottle Keep
router.use("/bottle-keep", bottleKeepRoutes);

// AI
router.use("/ai", aiRoutes);

// =========================================================
// HR - EMPLOYEE
// =========================================================
router.use("/employees", employeeRoutes);

export default router;
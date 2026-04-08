// routes/index.js
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

// <-- IMPORT 2 FILE MỚI -->
import monthlyReportRoutes from "./monthlyReport.js"; 
import dailyRevenueRoutes from "./dailyRevenue.js";   

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

// <-- GẮN ROUTE VÀO API -->
router.use("/monthly-reports", monthlyReportRoutes); 
router.use("/daily-revenues", dailyRevenueRoutes);   

export default router;
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
export default router;

import mongoose from "mongoose";
import Lesson from "../models/Lesson.js";
import Course from "../models/Course.js";
import LearningProgress from "../models/LearningProgress.js";
import QuizAttempt from "../models/QuizAttempt.js";

const getUserId = (req) =>
  req.user?._id || req.user?.id || req.id;

const validId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

export const getMyLearningProgress = async (req, res) => {
  try {
    const userId = getUserId(req);

    const progress = await LearningProgress.find({ user: userId })
      .populate(
        "lesson",
        "title topic language level status estimatedMinutes"
      )
      .populate("course", "title language")
      .sort({ lastStudiedAt: -1, updatedAt: -1 });

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy tiến độ học.",
    });
  }
};

export const updateLearningProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const {
      progressPercent,
      completedSections,
      lastSection,
      lastPosition,
      status,
    } = req.body;

    if (!validId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "ID bài học không hợp lệ.",
      });
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      status: "published",
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bài học đã xuất bản.",
      });
    }

    if (
      progressPercent !== undefined &&
      (!Number.isFinite(Number(progressPercent)) ||
        Number(progressPercent) < 0 ||
        Number(progressPercent) > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Tiến độ phải nằm trong khoảng 0–100.",
      });
    }

    if (
      completedSections !== undefined &&
      (!Array.isArray(completedSections) ||
        completedSections.length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "Danh sách phần đã học không hợp lệ.",
      });
    }

    const allowedStatuses = ["in_progress", "completed"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái học không hợp lệ.",
      });
    }

    const userId = getUserId(req);

    let progress = await LearningProgress.findOne({
      user: userId,
      lesson: lessonId,
    });

    if (!progress) {
      progress = new LearningProgress({
        user: userId,
        lesson: lessonId,
      });
    }

    if (progressPercent !== undefined) {
      progress.progressPercent = Number(progressPercent);
    }

    if (completedSections !== undefined) {
      progress.completedSections = [
        ...new Set(completedSections),
      ];
    }

    if (lastSection !== undefined) {
      progress.lastSection = String(lastSection).slice(0, 100);
    }

    if (lastPosition !== undefined) {
      const position = Number(lastPosition);

      if (!Number.isFinite(position) || position < 0) {
        return res.status(400).json({
          success: false,
          message: "Vị trí học không hợp lệ.",
        });
      }

      progress.lastPosition = position;
    }

    if (!progress.startedAt) {
      progress.startedAt = new Date();
    }

    progress.lastStudiedAt = new Date();

    if (status === "completed" || progress.progressPercent === 100) {
      progress.status = "completed";
      progress.progressPercent = 100;
      progress.completedAt = progress.completedAt || new Date();
    } else {
      progress.status = "in_progress";
    }

    await progress.save();

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật tiến độ học.",
      progress,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật tiến độ học.",
    });
  }
};

export const getMyLearningSummary = async (req, res) => {
  try {
    const userId = getUserId(req);

    const [totalLessons, progressStats, attempts] = await Promise.all([
      Lesson.countDocuments({ status: "published" }),

      LearningProgress.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      QuizAttempt.find({ user: userId })
        .select("score lesson submittedAt")
        .populate("lesson", "title topic")
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const progressCounts = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
    };

    for (const item of progressStats) {
      progressCounts[item._id] = item.count;
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalPublishedLessons: totalLessons,
        ...progressCounts,
        recentQuizAttempts: attempts,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy tổng quan học tập.",
    });
  }
};

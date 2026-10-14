
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const learningProgressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    lesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },

    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true,
    },

    // Tiến độ học từ 0 đến 100%
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Các phần đã học xong
    completedSections: {
      type: [String],
      default: [],
    },

    lastSection: {
      type: String,
      default: "",
    },

    lastPosition: {
      type: Number,
      default: 0,
      min: 0,
    },

    bestQuizScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    lastStudiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Mỗi user chỉ có một bản ghi tiến độ cho một bài học
learningProgressSchema.index(
  { user: 1, lesson: 1 },
  { unique: true }
);

// Tra cứu tiến độ theo khóa học
learningProgressSchema.index({
  user: 1,
  course: 1,
  status: 1,
});

const LearningProgress =
  models.LearningProgress ||
  model("LearningProgress", learningProgressSchema);

export default LearningProgress;

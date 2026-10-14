
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    language: {
      type: String,
      enum: ["zh-CN", "en"],
      required: true,
      default: "zh-CN",
      index: true,
    },

    level: {
      type: String,
      enum: [
        "beginner",
        "elementary",
        "intermediate",
        "advanced",
      ],
      default: "beginner",
    },

    coverImage: {
      type: String,
      default: "",
    },

    // Danh sách bài học thuộc chương trình
    lessons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({
  language: 1,
  status: 1,
  createdAt: -1,
});

const Course =
  models.Course || model("Course", courseSchema);

export default Course;

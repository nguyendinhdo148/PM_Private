
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const answerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    selectedAnswer: {
      type: Number,
      required: true,
      min: 0,
    },

    correct: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
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

    answers: {
      type: [answerSchema],
      default: [],
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 0,
    },

    correctCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    passed: {
      type: Boolean,
      default: false,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

quizAttemptSchema.index({
  user: 1,
  lesson: 1,
  submittedAt: -1,
});

const QuizAttempt =
  models.QuizAttempt ||
  model("QuizAttempt", quizAttemptSchema);

export default QuizAttempt;

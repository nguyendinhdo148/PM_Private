
import mongoose from "mongoose";
import Lesson from "../models/Lesson.js";
import QuizAttempt from "../models/QuizAttempt.js";
import LearningProgress from "../models/LearningProgress.js";

const getUserId = (req) =>
  req.user?._id || req.user?.id || req.id;

const validId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

export const submitQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { answers, durationSeconds = 0 } = req.body;

    if (!validId(lessonId)) {
      return res.status(400).json({
        success: false,
        message: "ID bài học không hợp lệ.",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách câu trả lời không hợp lệ.",
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

    if (lesson.quiz.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Bài học chưa có câu hỏi kiểm tra.",
      });
    }

    if (answers.length !== lesson.quiz.length) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng trả lời đầy đủ các câu hỏi.",
      });
    }

    const answerMap = new Map();

    for (const answer of answers) {
      const questionId = String(answer.questionId);

      if (
        !validId(questionId) ||
        answerMap.has(questionId) ||
        !Number.isInteger(answer.selectedAnswer)
      ) {
        return res.status(400).json({
          success: false,
          message: "Câu trả lời không hợp lệ hoặc bị trùng.",
        });
      }

      answerMap.set(questionId, answer.selectedAnswer);
    }

    const gradedAnswers = [];
    let correctCount = 0;

    for (const question of lesson.quiz) {
      const questionId = String(question._id);

      if (!answerMap.has(questionId)) {
        return res.status(400).json({
          success: false,
          message: "Thiếu câu trả lời cho một câu hỏi.",
        });
      }

      const selectedAnswer = answerMap.get(questionId);

      if (
        selectedAnswer < 0 ||
        selectedAnswer >= question.options.length
      ) {
        return res.status(400).json({
          success: false,
          message: "Lựa chọn đáp án không hợp lệ.",
        });
      }

      const correct =
        selectedAnswer === question.correctAnswer;

      if (correct) correctCount += 1;

      gradedAnswers.push({
        questionId: question._id,
        selectedAnswer,
        correct,
      });
    }

    const totalQuestions = lesson.quiz.length;
    const score = Math.round(
      (correctCount / totalQuestions) * 100
    );

    const passed = score >= 70;
    const duration = Number(durationSeconds);

    if (
      !Number.isInteger(duration) ||
      duration < 0 ||
      duration > 86400
    ) {
      return res.status(400).json({
        success: false,
        message: "Thời gian làm bài không hợp lệ.",
      });
    }

    const attempt = await QuizAttempt.create({
      user: getUserId(req),
      lesson: lesson._id,
      answers: gradedAnswers,
      totalQuestions,
      correctCount,
      score,
      passed,
      durationSeconds: duration,
      submittedAt: new Date(),
    });

    const userId = getUserId(req);

    let progress = await LearningProgress.findOne({
      user: userId,
      lesson: lesson._id,
    });

    if (!progress) {
      progress = new LearningProgress({
        user: userId,
        lesson: lesson._id,
        startedAt: new Date(),
      });
    }

    progress.bestQuizScore = Math.max(
      progress.bestQuizScore ?? 0,
      score
    );

    progress.lastStudiedAt = new Date();

    // Hoàn thành phần kiểm tra không đồng nghĩa
    // chắc chắn đã học xong toàn bộ nội dung.
    await progress.save();

    return res.status(201).json({
      success: true,
      message: "Nộp bài kiểm tra thành công.",
      result: {
        attemptId: attempt._id,
        totalQuestions,
        correctCount,
        score,
        passed,
        passingScore: 70,
        answers: gradedAnswers.map((answer, index) => ({
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          correct: answer.correct,
          correctAnswer: lesson.quiz[index].correctAnswer,
          explanation: lesson.quiz[index].explanation,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể chấm bài kiểm tra.",
    });
  }
};

export const getMyQuizHistory = async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      user: getUserId(req),
    })
      .populate("lesson", "title topic language")
      .sort({ submittedAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      attempts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy lịch sử kiểm tra.",
    });
  }
};

export const getQuizAttemptById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID lần làm bài không hợp lệ.",
      });
    }

    const attempt = await QuizAttempt.findOne({
      _id: id,
      user: getUserId(req),
    }).populate("lesson", "title topic language");

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kết quả bài kiểm tra.",
      });
    }

    return res.status(200).json({
      success: true,
      attempt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy kết quả bài kiểm tra.",
    });
  }
};

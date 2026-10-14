import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const vocabularySchema = new Schema(
  {
    word: { type: String, default: "" },
    pinyin: { type: String, default: "" },
    meaning: { type: String, default: "" },
    partOfSpeech: { type: String, default: "" },
    example: { type: String, default: "" },
    exampleTranslation: { type: String, default: "" },
  },
  { _id: false }
);

const exampleSchema = new Schema(
  {
    sentence: { type: String, default: "" },
    pinyin: { type: String, default: "" },
    translation: { type: String, default: "" },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const grammarSchema = new Schema(
  {
    title: { type: String, default: "" },
    explanation: { type: String, default: "" },
    structure: { type: String, default: "" },
    examples: { type: [exampleSchema], default: [] },
  },
  { _id: false }
);

const dialogueLineSchema = new Schema(
  {
    speaker: { type: String, default: "" },
    text: { type: String, default: "" },
    pinyin: { type: String, default: "" },
    translation: { type: String, default: "" },
  },
  { _id: false }
);

const dialogueSchema = new Schema(
  {
    title: { type: String, default: "" },
    context: { type: String, default: "" },
    lines: { type: [dialogueLineSchema], default: [] },
  },
  { _id: false }
);

const quizSchema = new Schema(
  {
    question: { type: String, default: "" },
    pinyin: { type: String, default: "" },
    options: { type: [String], default: [] },
    correctAnswer: { type: Number, min: 0, default: 0 },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const lessonSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    language: {
      type: String,
      enum: ["zh-CN", "en"],
      default: "zh-CN",
      index: true,
    },
    level: {
      type: String,
      enum: ["beginner", "elementary", "intermediate", "advanced"],
      default: "beginner",
    },
    topic: { type: String, default: "" },
    objectives: { type: [String], default: [] },
    estimatedMinutes: { type: Number, min: 1, max: 240, default: 15 },
    vocabulary: { type: [vocabularySchema], default: [] },
    examples: { type: [exampleSchema], default: [] },
    grammar: { type: [grammarSchema], default: [] },
    dialogues: { type: [dialogueSchema], default: [] },
    quiz: { type: [quizSchema], default: [] },
    studyNotes: { type: String, default: "" },
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
    aiGenerated: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

lessonSchema.index({ language: 1, status: 1, createdAt: -1 });

const Lesson = models.Lesson || model("Lesson", lessonSchema);

export default Lesson;

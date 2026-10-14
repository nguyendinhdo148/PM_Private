import mongoose from "mongoose";
import Groq from "groq-sdk";
import Lesson  from "../models/Lesson.js";
import Course from "../models/Course.js";
import LearningProgress from "../models/LearningProgress.js";
import QuizAttempt from "../models/QuizAttempt.js";

const VALID_LANGUAGES = ["zh-CN", "en"];
const VALID_LEVELS = ["beginner", "elementary", "intermediate", "advanced"];

const getUserId = (req) => req.user?._id || req.user?.id || req.id;
const getRole = (req) => String(req.user?.role || "").toLowerCase();
const isAdmin = (req) => ["admin", "superadmin"].includes(getRole(req));
const isCashier = (req) => getRole(req) === "cashier";
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const sendError = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({ success: false, message });
};

// Chuẩn hoá language FE-friendly
const normalizeLanguageForClient = (lang) => {
  const value = String(lang || "").toLowerCase();
  if (["zh-cn", "zh", "chinese", "zh-hans"].includes(value)) return "zh-CN";
  if (["en", "en-us", "en-gb", "english"].includes(value)) return "en";
  return lang;
};

// Groq AI config
const resolveGroqApiKey = () => {
  const key =
    process.env.GROQ_API_KEY ||
    process.env.GROQ_CLOUD_API_KEY ||
    process.env.GroqCloud_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
};

const groqApiKey = resolveGroqApiKey();
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

const PRIMARY_LESSON_MODEL = process.env.GROQ_LESSON_MODEL || "openai/gpt-oss-120b";
const FALLBACK_LESSON_MODEL = "openai/gpt-oss-20b";

const createLessonPrompt = ({ topic, language, level, count, objectives }) => {
  const languageName = language === "zh-CN" ? "tiếng Trung phổ thông giản thể" : "tiếng Anh";

  return `
Bạn là giáo viên ngoại ngữ chuyên nghiệp, chuyên dạy người Việt.
Hãy tạo một bài học ${languageName} chất lượng, chính xác và thực tế.

CHỦ ĐỀ: ${topic}
NGÔN NGỮ: ${languageName}
TRÌNH ĐỘ: ${level}
SỐ TỪ VỰNG: ${count}
MỤC TIÊU ĐƯỢC YÊU CẦU: ${
    Array.isArray(objectives) && objectives.length
      ? objectives.slice(0, 10).join("; ")
      : "Tự đề xuất 3-5 mục tiêu học tập phù hợp với chủ đề."
  }

Chỉ trả về MỘT JSON object hợp lệ, không Markdown, không code fence, không thêm văn bản bên ngoài JSON.
JSON phải theo đúng cấu trúc sau:
{
  "title": "Tiêu đề bài học bằng tiếng Việt",
  "description": "Mô tả ngắn bằng tiếng Việt",
  "objectives": ["Mục tiêu học tập"],
  "vocabulary": [
    {
      "word": "Từ hoặc cụm từ đang học",
      "pinyin": "Pinyin có dấu thanh nếu là tiếng Trung; chuỗi rỗng nếu là tiếng Anh",
      "meaning": "Nghĩa tiếng Việt",
      "partOfSpeech": "Từ loại",
      "example": "Câu ví dụ bằng ngôn ngữ đang học",
      "exampleTranslation": "Bản dịch tiếng Việt"
    }
  ],
  "examples": [
    {
      "sentence": "Câu ví dụ bằng ngôn ngữ đang học",
      "pinyin": "Pinyin nếu là tiếng Trung; chuỗi rỗng nếu là tiếng Anh",
      "translation": "Dịch tiếng Việt",
      "explanation": "Giải thích ngắn bằng tiếng Việt"
    }
  ],
  "grammar": [
    {
      "title": "Tên điểm ngữ pháp",
      "explanation": "Giải thích dễ hiểu bằng tiếng Việt",
      "structure": "Cấu trúc ngữ pháp",
      "examples": [
        {
          "sentence": "Câu ví dụ",
          "pinyin": "Pinyin nếu là tiếng Trung; chuỗi rỗng nếu là tiếng Anh",
          "translation": "Dịch tiếng Việt",
          "explanation": "Giải thích ví dụ"
        }
      ]
    }
  ],
  "dialogues": [
    {
      "title": "Tên hội thoại",
      "context": "Bối cảnh hội thoại",
      "lines": [
        {
          "speaker": "A",
          "text": "Câu thoại bằng ngôn ngữ đang học",
          "pinyin": "Pinyin nếu là tiếng Trung; chuỗi rỗng nếu là tiếng Anh",
          "translation": "Dịch tiếng Việt"
        }
      ]
    }
  ],
  "quiz": [
    {
      "question": "Câu hỏi bằng tiếng Việt hoặc ngôn ngữ đang học",
      "pinyin": "Pinyin nếu câu hỏi là tiếng Trung; chuỗi rỗng nếu không cần",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": 0,
      "explanation": "Giải thích đáp án bằng tiếng Việt"
    }
  ],
  "studyNotes": "Ghi chú ôn tập bằng tiếng Việt"
}

YÊU CẦU CHẤT LƯỢNG (BẮT BUỘC TUÂN THỦ):
- Tạo đúng ${count} mục từ vựng, mỗi từ có ví dụ + bản dịch đầy đủ.
- Tạo 8-12 câu ví dụ thực hành đa dạng ngữ cảnh (không trùng lặp).
- Tạo 4-6 điểm ngữ pháp quan trọng, mỗi điểm có cấu trúc + 2-3 ví dụ minh hoạ.
- Tạo 2 hội thoại thực tế, mỗi hội thoại 8-12 lượt nói, có bối cảnh rõ ràng.
- Tạo 10 câu trắc nghiệm đa dạng (nhận biết nghĩa, chọn từ đúng, sắp xếp câu, điền khuyết).
- Mỗi câu quiz có 4 lựa chọn, correctAnswer là chỉ số từ 0 đến 3.
- Các trường bắt buộc phải có đúng kiểu dữ liệu theo schema.
- Giải thích, bản dịch và ghi chú bằng tiếng Việt tự nhiên, dễ hiểu.
- Nếu là tiếng Trung, dùng chữ Hán giản thể và Pinyin có dấu thanh chính xác; không để trống Pinyin cho từ/câu tiếng Trung.
- Nếu là tiếng Anh, dùng tiếng Anh tự nhiên và để trường pinyin là chuỗi rỗng.
- Không bịa thông tin văn hóa hoặc ngữ pháp; nội dung phải phù hợp trình độ đã yêu cầu.
- Không dùng dấu phẩy cuối cùng trong JSON. Không trả về null cho các trường chuỗi.
`;
};

// Chuẩn hoá dữ liệu AI trả về cho FE
const sanitizeLessonForClient = (lessonDoc) => {
  if (!lessonDoc) return null;
  const obj = lessonDoc.toObject ? lessonDoc.toObject() : { ...lessonDoc };

  obj.language = normalizeLanguageForClient(obj.language);

  if (Array.isArray(obj.vocabulary)) {
    obj.vocabulary = obj.vocabulary.map((v) => ({
      word: v.word || "",
      pinyin: v.pinyin || "",
      meaning: v.meaning || "",
      partOfSpeech: v.partOfSpeech || "",
      example: v.example || "",
      exampleTranslation: v.exampleTranslation || "",
    }));
  }

  if (Array.isArray(obj.examples)) {
    obj.examples = obj.examples.map((e) => ({
      sentence: e.sentence || "",
      pinyin: e.pinyin || "",
      translation: e.translation || "",
      explanation: e.explanation || "",
    }));
  }

  if (Array.isArray(obj.grammar)) {
    obj.grammar = obj.grammar.map((g) => ({
      title: g.title || "",
      explanation: g.explanation || "",
      structure: g.structure || "",
      examples: Array.isArray(g.examples)
        ? g.examples.map((ex) => ({
            sentence: ex.sentence || "",
            pinyin: ex.pinyin || "",
            translation: ex.translation || "",
            explanation: ex.explanation || "",
          }))
        : [],
    }));
  }

  if (Array.isArray(obj.dialogues)) {
    obj.dialogues = obj.dialogues.flatMap((d) => {
      const lines = Array.isArray(d.lines) ? d.lines : [];
      return lines.map((l) => ({
        title: d.title || "",
        context: d.context || "",
        speaker: l.speaker || "",
        text: l.text || "",
        pinyin: l.pinyin || "",
        translation: l.translation || "",
      }));
    });
  }

  if (Array.isArray(obj.quiz)) {
    obj.quiz = obj.quiz.map(({ correctAnswer, ...rest }) => rest);
  }

  return obj;
};

// Chỉ cho phép cashier tạo bài học bằng AI.
export const generateLessonWithAI = async (req, res) => {
  try {
    if (!isCashier(req)) {
      return res.status(403).json({ success: false, message: "Chỉ cashier được tạo bài học bằng AI." });
    }

    const {
      topic,
      language = "zh-CN",
      level = "beginner",
      vocabularyCount = 10,
      objectives = [],
      estimatedMinutes = 15,
    } = req.body || {};

    if (typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập chủ đề bài học." });
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: "Ngôn ngữ không hợp lệ." });
    }
    if (!VALID_LEVELS.includes(level)) {
      return res.status(400).json({ success: false, message: "Trình độ không hợp lệ." });
    }

    const count = Number(vocabularyCount);
    if (!Number.isInteger(count) || count < 3 || count > 30) {
      return res.status(400).json({ success: false, message: "Số từ vựng phải từ 3 đến 30." });
    }

    if (!groq) {
      return res.status(503).json({
        success: false,
        message: "Chưa cấu hình GROQ_API_KEY (hoặc GROQ_CLOUD_API_KEY) trên server.",
        code: "AI_AUTH",
      });
    }

    const minutes = Number(estimatedMinutes);
    const safeMinutes = Number.isFinite(minutes) ? Math.max(1, Math.min(Math.round(minutes), 240)) : 15;

    const prompt = createLessonPrompt({
      topic: topic.trim(),
      language,
      level,
      count,
      objectives,
    });

    const requestModel = async (model) => {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "Bạn là hệ thống tạo bài học ngoại ngữ. Tuân thủ schema JSON được yêu cầu, không thêm nội dung ngoài JSON và không bỏ sót trường.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 6000,
        top_p: 0.9,
        stream: false,
        response_format: { type: "json_object" },
      });

      const content = completion.choices?.[0]?.message?.content?.trim();
      if (!content) {
        const error = new Error("Groq trả về nội dung bài học rỗng.");
        error.code = "EMPTY_RESPONSE";
        throw error;
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const error = new Error("Groq trả về JSON không hợp lệ.");
        error.code = "INVALID_AI_JSON";
        throw error;
      }

      return { parsed, model };
    };

    let generated;
    try {
      generated = await requestModel(PRIMARY_LESSON_MODEL);
    } catch (error) {
      const status = error?.status || error?.response?.status;
      const message = error?.message || "";
      const shouldFallback =
        [429, 500, 502, 503, 504].includes(status) ||
        status === 404 ||
        /model_not_found|does not exist/i.test(message) ||
        ["EMPTY_RESPONSE", "INVALID_AI_JSON"].includes(error?.code);

      if (!shouldFallback || PRIMARY_LESSON_MODEL === FALLBACK_LESSON_MODEL) {
        throw error;
      }

      console.warn(
        `[Training AI] Model ${PRIMARY_LESSON_MODEL} lỗi; chuyển sang ${FALLBACK_LESSON_MODEL}.`,
        status || error?.code || message
      );
      generated = await requestModel(FALLBACK_LESSON_MODEL);
    }

    const lessonData = generated.parsed;

    if (
      !lessonData ||
      typeof lessonData.title !== "string" ||
      !lessonData.title.trim() ||
      !Array.isArray(lessonData.vocabulary) ||
      !Array.isArray(lessonData.examples) ||
      !Array.isArray(lessonData.grammar) ||
      !Array.isArray(lessonData.dialogues) ||
      !Array.isArray(lessonData.quiz)
    ) {
      return res.status(502).json({
        success: false,
        message: "Nội dung bài học AI tạo chưa đầy đủ hoặc sai cấu trúc.",
        code: "INVALID_LESSON_SCHEMA",
      });
    }

    const invalidVocabulary = lessonData.vocabulary.some(
      (item) =>
        !item ||
        typeof item.word !== "string" ||
        !item.word.trim() ||
        typeof item.meaning !== "string" ||
        !item.meaning.trim()
    );

    const invalidQuiz = lessonData.quiz.some(
      (question) =>
        !question ||
        typeof question.question !== "string" ||
        !Array.isArray(question.options) ||
        question.options.length < 2 ||
        !Number.isInteger(question.correctAnswer) ||
        question.correctAnswer < 0 ||
        question.correctAnswer >= question.options.length
    );

    if (invalidVocabulary || invalidQuiz) {
      return res.status(502).json({
        success: false,
        message: "AI tạo từ vựng hoặc câu hỏi trắc nghiệm không hợp lệ.",
        code: "INVALID_LESSON_CONTENT",
      });
    }

    const lesson = await Lesson.create({
      title: lessonData.title.trim(),
      description: typeof lessonData.description === "string" ? lessonData.description : "",
      language,
      level,
      topic: topic.trim(),
      objectives: Array.isArray(lessonData.objectives)
        ? lessonData.objectives.filter((item) => typeof item === "string").slice(0, 10)
        : [],
      estimatedMinutes: safeMinutes,
      vocabulary: lessonData.vocabulary,
      examples: lessonData.examples,
      grammar: lessonData.grammar,
      dialogues: lessonData.dialogues,
      quiz: lessonData.quiz,
      studyNotes: typeof lessonData.studyNotes === "string" ? lessonData.studyNotes : "",
      status: "draft",
      createdBy: getUserId(req),
      aiGenerated: true,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo bài học thành công bằng Groq AI. Bài học đang ở trạng thái nháp.",
      lesson: sanitizeLessonForClient(lesson),
      ai: { provider: "Groq", model: generated.model },
    });
  } catch (error) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";

    console.error("[Training AI] Không thể tạo bài học:", {
      status,
      code: error?.code,
      message,
    });

    if (status === 429) {
      return res.status(429).json({
        success: false,
        message: "Groq đang giới hạn lượt gọi. Vui lòng thử lại sau.",
        code: "RATE_LIMIT",
      });
    }
    if (status === 401 || status === 403 || error?.code === "AI_AUTH") {
      return res.status(503).json({
        success: false,
        message: "Cấu hình Groq không hợp lệ. Kiểm tra API key trên server.",
        code: "AI_AUTH",
      });
    }
    if (error?.code === "EMPTY_RESPONSE" || error?.code === "INVALID_AI_JSON") {
      return res.status(502).json({
        success: false,
        message: "Groq không trả về JSON bài học hợp lệ. Vui lòng thử lại.",
        code: error.code,
      });
    }
    if (status === 404 || /model_not_found|does not exist/i.test(message)) {
      return res.status(502).json({
        success: false,
        message: "Model Groq không khả dụng. Kiểm tra GROQ_LESSON_MODEL trên server.",
        code: "MODEL_NOT_FOUND",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Không thể tạo bài học bằng AI. Vui lòng thử lại.",
      code: error?.code || "LESSON_GENERATION_FAILED",
    });
  }
};

// Tạo bài học thủ công
export const createLessonManually = async (req, res) => {
  try {
    if (!isCashier(req)) {
      return res.status(403).json({ success: false, message: "Chỉ cashier được tạo bài học." });
    }

    const body = req.body || {};
    const {
      title,
      description = "",
      language = "zh-CN",
      level = "beginner",
      topic = "",
      objectives = [],
      estimatedMinutes = 15,
      vocabulary = [],
      examples = [],
      grammar = [],
      dialogues = [],
      quiz = [],
      studyNotes = "",
    } = body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tiêu đề bài học." });
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: "Ngôn ngữ không hợp lệ." });
    }
    if (!VALID_LEVELS.includes(level)) {
      return res.status(400).json({ success: false, message: "Trình độ không hợp lệ." });
    }
    if (!Array.isArray(vocabulary) || !Array.isArray(examples) ||
        !Array.isArray(grammar) || !Array.isArray(dialogues) || !Array.isArray(quiz)) {
      return res.status(400).json({ success: false, message: "Các phần từ vựng, ví dụ, ngữ pháp, hội thoại và quiz phải là danh sách." });
    }
    if (vocabulary.length === 0) {
      return res.status(400).json({ success: false, message: "Bài học cần có ít nhất một từ vựng." });
    }

    const invalidQuiz = quiz.some((question) =>
      !question || typeof question.question !== "string" ||
      !Array.isArray(question.options) || question.options.length < 2 ||
      !Number.isInteger(Number(question.correctAnswer)) ||
      Number(question.correctAnswer) < 0 ||
      Number(question.correctAnswer) >= question.options.length
    );
    if (invalidQuiz) {
      return res.status(400).json({ success: false, message: "Có câu hỏi trắc nghiệm hoặc đáp án chưa hợp lệ." });
    }

    const userId = getUserId(req);
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(401).json({ success: false, message: "Không xác định được tài khoản tạo bài học." });
    }

    const lesson = await Lesson.create({
      title: title.trim(),
      description: String(description || ""),
      language,
      level,
      topic: String(topic || title).trim(),
      objectives: Array.isArray(objectives) ? objectives.filter((item) => typeof item === "string").slice(0, 20) : [],
      estimatedMinutes: Math.max(1, Math.min(240, Number(estimatedMinutes) || 15)),
      vocabulary,
      examples,
      grammar,
      dialogues,
      quiz: quiz.map((question) => ({ ...question, correctAnswer: Number(question.correctAnswer) })),
      studyNotes: String(studyNotes || ""),
      status: "draft",
      createdBy: userId,
      aiGenerated: false,
    });

    return res.status(201).json({
      success: true,
      message: "Tạo bài học thủ công thành công. Bài học đang ở trạng thái nháp.",
      lesson: sanitizeLessonForClient(lesson),
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return sendError(res, error, "Không thể tạo bài học thủ công.");
  }
};

export const getLessons = async (req, res) => {
  try {
    const { language, level, topic, status, page = 1, limit = 12 } = req.query;
    const filter = {};

    if (!isAdmin(req)) {
      filter.$or = [
        { status: "published" },
        { createdBy: getUserId(req), status: "draft" },
      ];
    }
    if (language && VALID_LANGUAGES.includes(language)) filter.language = language;
    if (level && VALID_LEVELS.includes(level)) filter.level = level;
    if (topic) filter.topic = { $regex: String(topic), $options: "i" };

    if (isAdmin(req) && status && ["draft", "published", "archived"].includes(status)) {
      filter.status = status;
    } else if (status === "draft") {
      filter.status = "draft";
      filter.createdBy = getUserId(req);
    } else if (status === "published") {
      filter.status = "published";
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(limit) || 12));

    const [lessons, total] = await Promise.all([
      Lesson.find(filter)
        .select("-quiz.correctAnswer")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Lesson.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      lessons: lessons.map((l) => sanitizeLessonForClient(l)),
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return sendError(res, error, "Không thể lấy danh sách bài học.");
  }
};

// Xem chi tiết một bài học
export const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const owner = String(lesson.createdBy) === String(getUserId(req));
    if (lesson.status !== "published" && !owner && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xem bài học này." });
    }

    return res.status(200).json({
      success: true,
      lesson: sanitizeLessonForClient(lesson),
    });
  } catch (error) {
    return sendError(res, error, "Không thể lấy chi tiết bài học.");
  }
};

// Chỉnh sửa bài học nháp
export const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const owner = String(lesson.createdBy) === String(getUserId(req));
    if (!owner && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền chỉnh sửa bài học này." });
    }
    if (lesson.status !== "draft" && !isAdmin(req)) {
      return res.status(400).json({ success: false, message: "Chỉ được sửa bài học đang ở trạng thái nháp." });
    }

    const allowedFields = [
      "title", "description", "topic", "level", "objectives",
      "estimatedMinutes", "vocabulary", "examples", "grammar",
      "dialogues", "quiz", "studyNotes",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) lesson.set(field, req.body[field]);
    }

    await lesson.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật bài học thành công.",
      lesson: sanitizeLessonForClient(lesson),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return sendError(res, error, "Không thể cập nhật bài học.");
  }
};

// Xuất bản bài học
export const publishLesson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const owner = String(lesson.createdBy) === String(getUserId(req));
    if (!owner && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xuất bản bài học này." });
    }
    if (!lesson.title || lesson.vocabulary.length === 0) {
      return res.status(400).json({ success: false, message: "Bài học cần có tiêu đề và từ vựng trước khi xuất bản." });
    }

    lesson.status = "published";
    lesson.publishedAt = new Date();
    await lesson.save();

    return res.status(200).json({
      success: true,
      message: "Xuất bản bài học thành công.",
      lesson: sanitizeLessonForClient(lesson),
    });
  } catch (error) {
    return sendError(res, error, "Không thể xuất bản bài học.");
  }
};

// Lưu trữ bài học
export const archiveLesson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const owner = String(lesson.createdBy) === String(getUserId(req));
    if (!owner && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền lưu trữ bài học này." });
    }

    lesson.status = "archived";
    await lesson.save();

    return res.status(200).json({ success: true, message: "Đã lưu trữ bài học." });
  } catch (error) {
    return sendError(res, error, "Không thể lưu trữ bài học.");
  }
};

// Xóa bài học nháp
export const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const owner = String(lesson.createdBy) === String(getUserId(req));
    if (!owner && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bài học này." });
    }
    if (lesson.status !== "draft" && !isAdmin(req)) {
      return res.status(400).json({ success: false, message: "Chỉ được xóa bài học nháp." });
    }

    const [progressCount, attemptCount, courseCount] = await Promise.all([
      LearningProgress.countDocuments({ lesson: id }),
      QuizAttempt.countDocuments({ lesson: id }),
      Course.countDocuments({ lessons: id }),
    ]);

    if (progressCount || attemptCount || courseCount) {
      return res.status(409).json({
        success: false,
        message: "Bài học đã có dữ liệu liên quan. Hãy lưu trữ thay vì xóa.",
      });
    }

    await lesson.deleteOne();

    return res.status(200).json({ success: true, message: "Đã xóa bài học nháp." });
  } catch (error) {
    return sendError(res, error, "Không thể xóa bài học.");
  }
};

// ============ QUIZ SUBMIT ============
export const submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const { answers = [] } = req.body || {};
    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "Danh sách câu trả lời không hợp lệ." });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const quiz = Array.isArray(lesson.quiz) ? lesson.quiz : [];
    if (quiz.length === 0) {
      return res.status(400).json({ success: false, message: "Bài học này chưa có câu hỏi trắc nghiệm." });
    }

    let correctCount = 0;
    const results = quiz.map((q, index) => {
      const userAnswer = Number(answers[index]);
      const isCorrect = Number.isInteger(userAnswer) && userAnswer === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        index,
        isCorrect,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      };
    });

    const score = Math.round((correctCount / quiz.length) * 100);

    const userId = getUserId(req);
    let attempt = null;
    if (userId) {
      try {
        attempt = await QuizAttempt.create({
          user: userId,
          lesson: lesson._id,
          answers: Array.isArray(answers) ? answers.map((a) => Number(a)) : [],
          score,
          totalQuestions: quiz.length,
          correctCount,
          submittedAt: new Date(),
        });
      } catch (saveErr) {
        console.warn("[Quiz] Không lưu được attempt:", saveErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Đã chấm điểm bài kiểm tra.",
      result: {
        score,
        correctCount,
        totalQuestions: quiz.length,
        results,
        attemptId: attempt?._id || null,
      },
    });
  } catch (error) {
    return sendError(res, error, "Không thể chấm điểm bài kiểm tra.");
  }
};

// ============ LEARNING PROGRESS ============
export const updateProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!validId(lessonId)) {
      return res.status(400).json({ success: false, message: "ID bài học không hợp lệ." });
    }

    const userId = getUserId(req);
    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(401).json({ success: false, message: "Không xác định được tài khoản." });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài học." });
    }

    const { completed = false, status = "completed" } = req.body || {};

    // Upsert: tìm progress cũ, nếu chưa có thì tạo mới
    const progress = await LearningProgress.findOneAndUpdate(
      { user: userId, lesson: lessonId },
      {
        $set: {
          completed: Boolean(completed),
          status: String(status || "in_progress"),
          completedAt: completed ? new Date() : null,
          lastAccessedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật tiến độ học tập.",
      progress,
    });
  } catch (error) {
    return sendError(res, error, "Không thể cập nhật tiến độ học tập.");
  }
};
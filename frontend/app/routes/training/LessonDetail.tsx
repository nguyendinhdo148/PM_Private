import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { pinyin as toPinyin } from "pinyin-pro";
import { fetchData, patchData, postData } from "@/lib/fetch-util";
import { useAuth } from "@/provider/auth-context";
// ✅ Đúng - cùng thư mục training
import QuizCountdown from "./QuizCountdown";
import type { QuizSubmitPayload } from "./QuizCountdown";

type VocabularyItem = {
  word?: string;
  term?: string;
  vocabulary?: string;
  pronunciation?: string;
  phonetic?: string;
  pinyin?: string;
  romanization?: string;
  ipa?: string;
  meaning?: string;
  definition?: string;
  translation?: string;
  example?: string;
  examplePinyin?: string;
  example_pinyin?: string;
  pinyinExample?: string;
  pinyin_example?: string;
  exampleTranslation?: string;
  exampleSentence?: string;
  partOfSpeech?: string;
};
type ExampleItem = {
  sentence?: string;
  text?: string;
  pinyin?: string;
  translation?: string;
  meaning?: string;
  explanation?: string;
};
type DialogueLine = {
  speaker?: string;
  role?: string;
  text?: string;
  sentence?: string;
  pinyin?: string;
  translation?: string;
};
type QuizQuestion = {
  question?: string;
  pinyin?: string;
  options?: string[];
  explanation?: string;
  correctAnswer?: number;
};
type Lesson = {
  _id: string;
  title?: string;
  language?: string;
  level?: string;
  topic?: string;
  status?: string;
  description?: string;
  estimatedMinutes?: number;
  introduction?: string;
  aiGenerated?: boolean;
  studyNotes?: string;
  objectives?: string[] | string;
  vocabulary?: VocabularyItem[] | string[];
  grammar?: unknown[] | string[] | string;
  examples?: ExampleItem[] | string[];
  dialogues?: DialogueLine[] | string[];
  quiz?: QuizQuestion[];
  content?: string;
  lessonContent?: string;
  summary?: string;
};
type LessonResponse = Lesson | { lesson?: Lesson; data?: Lesson | { lesson?: Lesson } };

function extractLesson(response: LessonResponse | null | undefined): Lesson | null {
  if (!response) return null;
  if ("_id" in response && response._id) return response;
  if ("lesson" in response && response.lesson) return response.lesson;
  if ("data" in response && response.data) {
    if ("_id" in response.data && response.data._id) return response.data;
    if ("lesson" in response.data && response.data.lesson) return response.data.lesson;
  }
  return null;
}
function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
function getStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return toText(record.text ?? record.sentence ?? record.content ?? record.description ?? record.name);
      }
      return "";
    }).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  return [];
}
function getVocabulary(value: Lesson["vocabulary"]): VocabularyItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? { word: item } : item);
}
function getExamples(value: Lesson["examples"]): ExampleItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? { sentence: item } : item);
}
function getDialogues(value: Lesson["dialogues"]): DialogueLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === "string" ? { text: item } : item);
}
function getQuiz(value: Lesson["quiz"]): QuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value;
}
function levelLabel(level?: string) {
  const normalized = (level || "").toLowerCase();
  if (["beginner", "basic", "a1", "a2"].includes(normalized)) return "Cơ bản";
  if (["elementary", "sơ cấp"].includes(normalized)) return "Sơ cấp";
  if (["intermediate", "b1", "b2"].includes(normalized)) return "Trung cấp";
  if (["advanced", "c1", "c2"].includes(normalized)) return "Nâng cao";
  return level || "Chưa phân cấp";
}
function languageLabel(language?: string) {
  const value = (language || "").toLowerCase();
  if (["zh-cn", "zh", "chinese"].includes(value)) return "Tiếng Trung";
  if (["en", "en-us", "en-gb", "english"].includes(value)) return "Tiếng Anh";
  return language || "Bài học";
}
function toSpeechLang(language?: string) {
  const value = (language || "").toLowerCase();
  if (["zh-cn", "zh", "chinese"].includes(value)) return "zh-CN";
  if (["en", "en-us", "en-gb", "english"].includes(value)) return "en-US";
  return value || "en-US";
}

/**
 * Lấy pinyin cho câu ví dụ / hội thoại:
 * 1. Ưu tiên field từ API (nhiều tên khác nhau)
 * 2. Nếu API không có → tự sinh pinyin bằng pinyin-pro
 *    (CHỈ khi chuỗi chủ yếu là chữ Hán, tránh tách từng chữ cái câu Việt)
 */
function getExamplePinyin(
  item: VocabularyItem | ExampleItem | DialogueLine | Record<string, unknown>,
  sourceText?: string
): string {
  const anyItem = item as Record<string, unknown>;
  // ❌ KHÔNG lấy anyItem.pinyin — vì đó là pinyin của TỪ, không phải của CÂU
  const fromApi =
    (anyItem.examplePinyin as string) ||
    (anyItem.example_pinyin as string) ||
    (anyItem.pinyinExample as string) ||
    (anyItem.pinyin_example as string);

  if (fromApi && String(fromApi).trim()) return String(fromApi).trim();

  // ✅ Chỉ tự sinh khi chuỗi CHỦ YẾU là chữ Hán (>= 50% ký tự)
  if (sourceText) {
    const trimmed = sourceText.trim();
    const total = trimmed.replace(/\s/g, "").length;
    const chinese = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
    if (total > 0 && chinese / total >= 0.5) {
      try {
        const result = toPinyin(trimmed, { toneType: "symbol", type: "array" });
        return Array.isArray(result) ? result.join(" ") : String(result);
      } catch {
        return "";
      }
    }
  }
  return "";
}

export default function LessonDetail() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const role = String((user as any)?.role || "").toLowerCase();
  const isCashier = role === "cashier";
  const isAdmin = ["admin", "superadmin"].includes(role);
  const canPublish = isCashier || isAdmin;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vocabulary: true,
    grammar: true,
    examples: true,
    dialogues: true,
    quiz: true,
  });

  const speechLang = useMemo(() => toSpeechLang(lesson?.language), [lesson?.language]);

  const loadLesson = useCallback(async () => {
    if (!lessonId) {
      setError("Không tìm thấy mã bài học trong đường dẫn.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetchData<LessonResponse>(`/training/lessons/${lessonId}`);
      const found = extractLesson(response);
      if (!found) throw new Error("Phản hồi API không có dữ liệu bài học hợp lệ.");
      setLesson(found);
    } catch (err) {
      console.error("Không thể tải chi tiết bài học:", err);
      setError("Không thể tải bài học. Bạn hãy kiểm tra kết nối hoặc thử tải lại.");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadLesson();
  }, [loadLesson]);

  // Web Speech API: bấm để nghe
  const speak = (text?: string) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang;
    u.rate = 0.9;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const markCompleted = async () => {
    if (!lessonId || lesson?.status !== "published" || savingProgress || completed) return;
    setSavingProgress(true);
    setError("");
    try {
      await patchData(`/training/progress/${lessonId}`, { completed: true, status: "completed" });
      setCompleted(true);
      setNotice("Đã ghi nhận tiến độ học tập.");
    } catch (err) {
      console.error("Không thể lưu tiến độ bài học:", err);
      setError("Chưa lưu được tiến độ học. Hãy thử lại.");
    } finally {
      setSavingProgress(false);
    }
  };

  const publishLesson = async () => {
    if (!lessonId || publishing) return;
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      await patchData(`/training/lessons/${lessonId}/publish`, {});
      setLesson((prev) => (prev ? { ...prev, status: "published" } : prev));
      setNotice("Đã xuất bản bài học thành công.");
    } catch (err) {
      console.error("Không thể xuất bản bài học:", err);
      setError("Chưa xuất bản được bài học. Vui lòng thử lại.");
    } finally {
      setPublishing(false);
    }
  };

  // Nộp quiz từ QuizCountdown
  const handleQuizSubmit = async (payload: QuizSubmitPayload) => {
    if (!lessonId) return null;
    try {
      const res = (await postData(
        `/training/lessons/${lessonId}/quiz/submit`,
        { answers: payload.answers }
      )) as
        | { result?: any }
        | { data?: { result?: any } }
        | null;

      const result =
        (res as any)?.result ?? (res as any)?.data?.result ?? (res as any);
      if (!result || typeof result.score !== "number") return null;
      return result;
    } catch (err) {
      console.error("Không thể nộp bài kiểm tra:", err);
      return null;
    }
  };

  const resetQuiz = () => {
    setError("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <LoaderCircle className="mr-3 h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-sm font-medium text-slate-600">Đang tải nội dung bài học...</span>
      </div>
    );
  }
  if (error && !lesson) {
    return (
      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-lg font-bold text-rose-800">Không tải được bài học</h1>
          <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => void loadLesson()} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
              <RefreshCw className="h-4 w-4" /> Thử lại
            </button>
            <Link to="/training" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100">
              <ArrowLeft className="h-4 w-4" /> Về trung tâm đào tạo
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (!lesson) return null;

  const vocabulary = getVocabulary(lesson.vocabulary);
  const examples = getExamples(lesson.examples);
  const dialogues = getDialogues(lesson.dialogues);
  const grammar = getStringList(lesson.grammar);
  const objectives = getStringList(lesson.objectives);
  const quiz = getQuiz(lesson.quiz);
  const contentText = lesson.studyNotes || lesson.content || lesson.lessonContent || lesson.summary || "";
  const isPublished = lesson.status === "published";

  const SectionHeader = ({ id, title, subtitle, count }: { id: string; title: string; subtitle: string; count?: number }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
      aria-expanded={!!expandedSections[id]}
    >
      <span className="min-w-0">
        <span className="block font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-xs text-slate-500">{subtitle}{typeof count === "number" ? ` · ${count} mục` : ""}</span>
      </span>
      {expandedSections[id] ? <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />}
    </button>
  );

  return (
    <div className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to={lesson.language && ["en", "en-us", "en-gb", "english"].includes(lesson.language.toLowerCase()) ? "/training/english" : lesson.language && ["zh", "zh-cn", "chinese"].includes(lesson.language.toLowerCase()) ? "/training/chinese" : "/training"} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài học
        </Link>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-600 p-6 text-white shadow-lg shadow-indigo-200/50 sm:p-9">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">{languageLabel(lesson.language)}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">{levelLabel(lesson.level)}</span>
              {lesson.estimatedMinutes && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold"><Clock3 className="h-3.5 w-3.5" /> {lesson.estimatedMinutes} phút</span>}
              <span className={`rounded-full border border-white/20 px-3 py-1 text-xs font-semibold ${isPublished ? "bg-emerald-400/20 text-emerald-50" : "bg-amber-400/20 text-amber-50"}`}>
                {isPublished ? "Đã xuất bản" : "Bản nháp"}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title || lesson.topic || "Chi tiết bài học"}</h1>
            {lesson.description && <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">{lesson.description}</p>}
            {lesson.introduction && <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90">{lesson.introduction}</p>}
            {lesson.aiGenerated && <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium"><Sparkles className="h-4 w-4" /> Nội dung được hỗ trợ bởi AI</span>}
          </div>
        </section>

        {notice && (
          <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && lesson && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        )}

        {/* Nút xuất bản cho cashier/admin khi bài đang draft */}
        {!isPublished && canPublish && (
          <section className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-violet-900">Bài học đang ở trạng thái nháp</h2>
                <p className="mt-1 text-sm text-violet-800">
                  Xuất bản để học viên có thể truy cập và học bài này.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void publishLesson()}
              disabled={publishing}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publishing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {publishing ? "Đang xuất bản..." : "Xuất bản bài học"}
            </button>
          </section>
        )}

        {objectives.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><GraduationCap className="h-5 w-5" /></span>
              <div><h2 className="font-bold text-slate-900">Mục tiêu bài học</h2><p className="mt-1 text-sm text-slate-500">Sau bài học, bạn có thể</p></div>
            </div>
            <ul className="mt-4 space-y-2">
              {objectives.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />{item}</li>)}
            </ul>
          </section>
        )}

        {/* ===== VOCABULARY ===== */}
        {vocabulary.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader id="vocabulary" title="Từ vựng" subtitle="Từ mới, phiên âm và ví dụ" count={vocabulary.length} />
            {expandedSections.vocabulary && (
              <div className="border-t border-slate-100">
                <div className="divide-y divide-slate-100">
                  {vocabulary.map((item, index) => {
                    const word = item.word || item.term || item.vocabulary || "Từ vựng";
                    const wordPinyin =
                      item.pinyin ||
                      item.romanization ||
                      item.ipa ||
                      item.pronunciation ||
                      item.phonetic ||
                      (word && /[\u4e00-\u9fff]/.test(word)
                        ? (() => {
                            try {
                              const r = toPinyin(word, { toneType: "symbol", type: "array" });
                              return Array.isArray(r) ? r.join(" ") : String(r);
                            } catch {
                              return "";
                            }
                          })()
                        : "");
                    const meaning = item.meaning || item.definition || item.translation;
                    const example = item.example || item.exampleSentence;
                    const examplePinyin = getExamplePinyin(item, example);
                    return (
                      <div key={`${word}-${index}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1.4fr] sm:gap-6 sm:px-6">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{word}</h3>
                            <button
                              type="button"
                              onClick={() => speak(word)}
                              className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50"
                              title="Nghe phát âm"
                              aria-label="Nghe phát âm"
                            >
                              <Volume2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Pinyin hiển thị riêng, nổi bật */}
                          {wordPinyin && (
                            <p className="mt-1 text-base font-medium tracking-wide text-indigo-600">
                              {wordPinyin}
                            </p>
                          )}

                          {item.partOfSpeech && <p className="mt-1 text-xs italic text-slate-400">{item.partOfSpeech}</p>}
                          {meaning && <p className="mt-1 text-sm text-slate-600">{meaning}</p>}
                        </div>
                        {example && (
                          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Ví dụ</span>
                              <button
                                type="button"
                                onClick={() => speak(example)}
                                className="rounded-md p-1 text-slate-500 transition hover:bg-white hover:text-indigo-600"
                                title="Nghe ví dụ"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="font-medium text-slate-800">{example}</p>
                            {/* Pinyin của câu ví dụ */}
                            {examplePinyin && (
                              <p className="mt-1 text-sm font-medium text-indigo-600">{examplePinyin}</p>
                            )}
                            {item.exampleTranslation && <p className="mt-1 text-slate-500">{item.exampleTranslation}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ===== GRAMMAR ===== */}
        {grammar.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader id="grammar" title="Ngữ pháp / Ghi chú" subtitle="Cấu trúc và điểm cần nhớ" count={grammar.length} />
            {expandedSections.grammar && (
              <div className="space-y-3 border-t border-slate-100 p-5 sm:p-6">
                {grammar.map((item, index) => (
                  <div key={`${item}-${index}`} className="rounded-xl bg-indigo-50/70 p-4 text-sm leading-6 text-slate-700">{item}</div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ===== EXAMPLES ===== */}
        {examples.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader id="examples" title="Câu ví dụ thực hành" subtitle="Quan sát cách dùng trong ngữ cảnh" count={examples.length} />
            {expandedSections.examples && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {examples.map((item, index) => {
                  const sentence = item.sentence || item.text || "";
                  const examplePinyin = getExamplePinyin(item, sentence);
                  return (
                    <div key={index} className="px-5 py-4 sm:px-6">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-6 text-slate-800">{sentence || "Ví dụ"}</p>
                        {sentence && (
                          <button
                            type="button"
                            onClick={() => speak(sentence)}
                            className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
                            title="Nghe ví dụ"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {examplePinyin && <p className="mt-1 text-sm font-medium text-indigo-600">{examplePinyin}</p>}
                      {(item.translation || item.meaning) && <p className="mt-1 text-sm text-slate-500">{item.translation || item.meaning}</p>}
                      {item.explanation && <p className="mt-2 text-sm leading-6 text-indigo-700">{item.explanation}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ===== DIALOGUES ===== */}
        {dialogues.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <SectionHeader id="dialogues" title="Hội thoại" subtitle="Luyện đọc theo từng lượt nói" count={dialogues.length} />
            {expandedSections.dialogues && (
              <div className="space-y-3 border-t border-slate-100 p-5 sm:p-6">
                {dialogues.map((line, index) => {
                  const text = line.text || line.sentence || "";
                  const linePinyin = getExamplePinyin(line, text);
                  return (
                    <div key={index} className={`max-w-[90%] rounded-2xl px-4 py-3 ${index % 2 === 0 ? "bg-indigo-50 text-indigo-950" : "ml-auto bg-slate-100 text-slate-800"}`}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide opacity-60">{line.speaker || line.role || (index % 2 === 0 ? "Người nói 1" : "Người nói 2")}</p>
                        {text && (
                          <button
                            type="button"
                            onClick={() => speak(text)}
                            className="rounded-md p-1 opacity-70 transition hover:bg-white/60 hover:opacity-100"
                            title="Nghe lượt nói"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm leading-6">{text}</p>
                      {linePinyin && <p className="mt-1 text-sm font-medium text-indigo-700">{linePinyin}</p>}
                      {line.translation && <p className="mt-1 text-sm opacity-70">{line.translation}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (vocabulary.length > 0 || quiz.length > 0) ? (
          <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-center">
            <p className="text-sm font-semibold text-amber-800">
              ⚠️ Bài học này chưa có hội thoại. Bạn có thể yêu cầu cashier tạo lại để bổ sung.
            </p>
          </section>
        ) : null}

        {/* ===== QUIZ (countdown) ===== */}
        {quiz.length > 0 && (
          <section className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/60 shadow-md">
            <SectionHeader
              id="quiz"
              title="Bài kiểm tra"
              subtitle="Đếm ngược 15s mỗi câu · Trả lời nhanh để được nhiều điểm"
              count={quiz.length}
            />
            {expandedSections.quiz && (
              <div className="border-t border-indigo-100 p-4 sm:p-6">
                <QuizCountdown
                  questions={quiz}
                  secondsPerQuestion={15}
                  onSpeak={speak}
                  onSubmit={handleQuizSubmit}
                  onReset={resetQuiz}
                />
              </div>
            )}
          </section>
        )}

        {contentText && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><BookOpen className="h-5 w-5" /></span><h2 className="font-bold text-slate-900">Nội dung bài học</h2></div>
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{contentText}</div>
          </section>
        )}

        {!vocabulary.length && !grammar.length && !examples.length && !dialogues.length && !quiz.length && !contentText && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CircleHelp className="mx-auto h-9 w-9 text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-800">Bài học chưa có nội dung chi tiết</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Thông tin bài học đã tải được, nhưng chưa có từ vựng, ngữ pháp hoặc nội dung thực hành để hiển thị.</p>
          </section>
        )}

        {isPublished ? (
          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className={`rounded-xl p-2.5 ${completed ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>{completed ? <CheckCircle2 className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}</span>
              <div><h2 className="font-bold text-slate-900">{completed ? "Bạn đã hoàn thành bài học!" : "Hoàn thành bài học"}</h2><p className="mt-1 text-sm text-slate-500">{completed ? "Tiến độ học đã được cập nhật." : "Đánh dấu hoàn thành để ghi nhận tiến độ học tập của bạn."}</p></div>
            </div>
            <button type="button" onClick={() => void markCompleted()} disabled={completed || savingProgress} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-emerald-600">
              {savingProgress ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {savingProgress ? "Đang lưu..." : completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                <Clock3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-amber-900">Bài học chưa được xuất bản</h2>
                <p className="mt-1 text-sm text-amber-800">
                  {canPublish
                    ? "Hãy xuất bản bài học ở khối phía trên để học viên có thể truy cập và ghi nhận tiến độ."
                    : "Tiến độ học chỉ được ghi nhận cho bài học đã xuất bản."}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
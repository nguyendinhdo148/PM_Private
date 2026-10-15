import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Filter,
  Languages,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Volume2,
  X,
  XCircle,
  TrendingUp,
  Award,
} from "lucide-react";
import { useAuth } from "@/provider/auth-context";
import { fetchData, postData } from "@/lib/fetch-util";

type Lesson = {
  _id: string;
  title: string;
  description?: string;
  language?: string;
  level?: string;
  topic?: string;
  estimatedMinutes?: number;
  vocabulary?: unknown[];
  status?: "draft" | "published" | "archived";
  aiGenerated?: boolean;
  createdAt?: string;
};

type LessonResponse = Lesson[] | { lessons?: Lesson[]; data?: Lesson[] };

const LEVELS = [
  { value: "all", label: "Tất cả cấp độ" },
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
];

function readLessons(response: any): Lesson[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.lessons)) return response.lessons;
  if (Array.isArray(response?.data?.lessons)) return response.data.lessons;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function getErrorMessage(error: any) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Không thể tải danh sách bài học. Vui lòng thử lại."
  );
}

function getLevelLabel(level?: string) {
  const value = String(level || "").toLowerCase();
  if (["beginner", "basic", "easy", "cơ bản"].includes(value)) return "Cơ bản";
  if (["intermediate", "medium", "trung cấp"].includes(value)) return "Trung cấp";
  if (["advanced", "hard", "nâng cao"].includes(value)) return "Nâng cao";
  return level || "Cơ bản";
}

function getLevelStyle(level?: string) {
  const value = String(level || "").toLowerCase();
  if (["beginner", "basic", "easy", "cơ bản"].includes(value)) {
    return {
      pill: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      gradient: "from-emerald-500 to-teal-400",
    };
  }
  if (["intermediate", "medium", "trung cấp"].includes(value)) {
    return {
      pill: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      gradient: "from-amber-500 to-orange-400",
    };
  }
  if (["advanced", "hard", "nâng cao"].includes(value)) {
    return {
      pill: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
      gradient: "from-rose-500 to-pink-400",
    };
  }
  return {
    pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    gradient: "from-slate-500 to-slate-400",
  };
}

function speakChinese(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

export default function ChineseLearning() {
  const { user } = useAuth();
  const isCashier = String((user as any)?.role || "").toLowerCase() === "cashier";

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<"ai" | "manual">("ai");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualVocabulary, setManualVocabulary] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [topic, setTopic] = useState("");
  const [targetLevel, setTargetLevel] = useState("beginner");
  const [duration, setDuration] = useState("15");
  const [vocabularyCount, setVocabularyCount] = useState("15");
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState("");

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchData<LessonResponse>("/training/lessons?language=zh-CN");
      const data = readLessons(response);
      setLessons(
        data.filter((lesson) => {
          const lang = String(lesson.language || "zh-CN").toLowerCase();
          return (
            ["zh-cn", "zh", "chinese", "tiếng trung"].includes(lang) &&
            lesson.status !== "archived"
          );
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  // Auto dismiss notice sau 4 giây
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    return lessons.filter((lesson) => {
      const haystack = [lesson.title, lesson.description, lesson.topic]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi");
      const matchesSearch = !query || haystack.includes(query);

      const rawLevel = String(lesson.level || "").toLowerCase();
      const matchesLevel =
        level === "all" ||
        rawLevel === level ||
        (level === "beginner" && ["basic", "easy", "cơ bản"].includes(rawLevel)) ||
        (level === "intermediate" && ["medium", "trung cấp"].includes(rawLevel)) ||
        (level === "advanced" && ["hard", "nâng cao"].includes(rawLevel));

      return matchesSearch && matchesLevel;
    });
  }, [lessons, search, level]);

  const publishedCount = lessons.filter((lesson) => lesson.status === "published").length;
  const draftCount = lessons.filter((lesson) => lesson.status === "draft").length;
  const totalLessons = lessons.length;

  // Phím tắt Ctrl+K để focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("search-lessons") as HTMLInputElement | null;
        input?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const createLesson = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topic.trim()) return;

    setGenerating(true);
    setError("");
    setNotice("");

    try {
      await postData("/training/lessons/generate", {
        topic: topic.trim(),
        language: "zh-CN",
        level: targetLevel,
        estimatedMinutes: Number(duration) || 15,
        vocabularyCount: Number(vocabularyCount) || 15,
      });

      setNotice("Đã gửi yêu cầu tạo bài học. Đang cập nhật danh sách...");
      setTopic("");
      setShowCreateModal(false);
      await loadLessons();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const createManualLesson = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualTitle.trim() || !topic.trim()) return;

    setGenerating(true);
    setError("");
    setNotice("");

    try {
      const vocabulary = manualVocabulary
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [word = "", pinyin = "", meaning = "", example = "", exampleTranslation = ""] =
            line.split("|").map((part) => part.trim());
          return { word, pinyin, meaning, example, exampleTranslation };
        })
        .filter((v) => v.word && v.meaning);

      if (vocabulary.length === 0) {
        setError(
          "Vui lòng nhập ít nhất 1 từ vựng (định dạng: từ | pinyin | nghĩa | ví dụ | dịch).",
        );
        setGenerating(false);
        return;
      }

      await postData("/training/lessons/manual", {
        title: manualTitle.trim(),
        topic: topic.trim(),
        description: manualDescription.trim(),
        language: "zh-CN",
        level: targetLevel,
        estimatedMinutes: Number(duration) || 15,
        vocabulary,
        examples: [],
        grammar: [],
        dialogues: [],
        quiz: [],
        studyNotes: manualNotes.trim(),
      });

      setNotice("Đã tạo bài học thủ công ở trạng thái bản nháp.");
      setManualTitle("");
      setManualDescription("");
      setManualVocabulary("");
      setManualNotes("");
      setTopic("");
      setShowCreateModal(false);
      await loadLessons();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-8">
      {/* ===== HERO ===== */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-rose-700 via-orange-600 to-amber-500 px-6 py-8 text-white shadow-xl shadow-rose-900/20 sm:px-9 sm:py-10">
        {/* Pattern chấm bi */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Vòng tròn viền */}
        <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full border-[40px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-72 w-72 rounded-full border-[40px] border-white/5" />
        {/* Blur blobs */}
        <div className="pointer-events-none absolute bottom-0 right-1/3 -z-10 h-48 w-48 rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-1/2 -z-10 h-40 w-40 rounded-full bg-rose-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wide text-white/95 backdrop-blur">
              <Languages className="h-3.5 w-3.5" />
              中文 · CHINESE LEARNING
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Học tiếng Trung
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
              Từ những câu chào hỏi đơn giản đến các tình huống giao tiếp thực tế.
              Học từ vựng, luyện phát âm và tiến bộ mỗi ngày.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: Sparkles, label: "Từ vựng & Pinyin" },
                { icon: Volume2, label: "Nghe phát âm" },
                { icon: Award, label: "Hội thoại thực tế" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>
          {isCashier && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-black text-rose-700 shadow-lg shadow-rose-900/20 transition hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
              Tạo bài học
            </button>
          )}
        </div>
      </section>

      {/* ===== NOTICE ===== */}
      {notice && (
        <div
          role="status"
          className="animate-[slideDown_0.3s_ease-out] flex items-start gap-3 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm text-emerald-800 shadow-sm"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <span className="flex-1 font-medium">{notice}</span>
          <button
            onClick={() => setNotice("")}
            className="rounded-md p-0.5 text-emerald-600 transition hover:bg-emerald-100"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===== ERROR ===== */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-3 text-sm text-rose-700 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadLessons()}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100"
          >
            Thử tải lại
          </button>
        </div>
      )}

      {/* ===== STATS ===== */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-rose-100/60 blur-2xl transition group-hover:bg-rose-200/60" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Tổng bài học</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                {loading ? "—" : totalLessons}
              </p>
            </div>
          </div>
          <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400 transition-all duration-700"
              style={{ width: totalLessons > 0 ? "100%" : "0%" }}
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-100/60 blur-2xl transition group-hover:bg-emerald-200/60" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Đã xuất bản</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                {loading ? "—" : publishedCount}
              </p>
            </div>
          </div>
          <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              style={{
                width:
                  totalLessons > 0 ? `${(publishedCount / totalLessons) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-100/60 blur-2xl transition group-hover:bg-amber-200/60" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Bản nháp</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-slate-900">
                {loading ? "—" : draftCount}
              </p>
            </div>
          </div>
          <div className="relative mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
              style={{
                width: totalLessons > 0 ? `${(draftCount / totalLessons) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
      </section>

      {/* ===== SEARCH & FILTER ===== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="search-lessons"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm bài học, chủ đề..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-20 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:inline-flex">
              Ctrl K
            </kbd>
          </label>
          <label className="relative lg:w-56">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"
            >
              {LEVELS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {(search || level !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setLevel("all");
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <X className="h-4 w-4" /> Xóa lọc
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            {loading ? (
              "Đang tải bài học..."
            ) : (
              <>
                Tìm thấy{" "}
                <span className="font-bold text-slate-900">{filteredLessons.length}</span> bài học
              </>
            )}
          </p>
          <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:inline-flex">
            <Volume2 className="h-3.5 w-3.5" /> Có hỗ trợ nghe phát âm trong bài học
          </span>
        </div>
      </section>

      {/* ===== LESSON LIST ===== */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="h-1 w-full bg-slate-100" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100" />
                  <div className="h-5 w-16 rounded-full bg-slate-100" />
                </div>
                <div className="mt-5 h-3 w-24 rounded bg-slate-100" />
                <div className="mt-3 h-5 w-3/4 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
                <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="h-3 w-16 rounded bg-slate-100" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredLessons.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredLessons.map((lesson, index) => {
            const isPublished = lesson.status === "published";
            const levelStyle = getLevelStyle(lesson.level);
            const accent =
              index % 3 === 0
                ? "from-rose-500 to-orange-400"
                : index % 3 === 1
                  ? "from-amber-400 to-rose-400"
                  : "from-orange-500 to-pink-400";

            return (
              <article
                key={lesson._id}
                className="group relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100/50"
              >
                {/* Accent bar */}
                <div className={`h-1 bg-gradient-to-r ${accent}`} />

                {/* Corner ribbon khi published */}
                {isPublished && (
                  <div className="pointer-events-none absolute right-0 top-1 z-10 overflow-hidden">
                    <div className="translate-x-[30%] rotate-45 bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                      Live
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-md shadow-rose-200 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : lesson.status === "archived"
                              ? "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}
                      >
                        {isPublished
                          ? "Đã xuất bản"
                          : lesson.status === "archived"
                            ? "Đã lưu trữ"
                            : "Bản nháp"}
                      </span>
                      {lesson.aiGenerated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelStyle.pill}`}
                      >
                        {getLevelLabel(lesson.level)}
                      </span>
                      {lesson.topic && (
                        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {lesson.topic}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-slate-900 transition group-hover:text-rose-700">
                      {lesson.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                      {lesson.description ||
                        "Bài học thực hành giúp bạn ghi nhớ từ vựng và tự tin hơn khi giao tiếp."}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" /> {lesson.estimatedMinutes || 15} phút
                    </span>
                    <Link
                      to={`/training/lesson/${lesson._id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-black text-rose-600 transition hover:bg-rose-100 hover:text-rose-700"
                    >
                      {isPublished ? "Vào học" : "Xem bản nháp"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 px-5 py-16 text-center">
          {/* Background blobs */}
          <div className="pointer-events-none absolute left-1/4 top-0 h-40 w-40 rounded-full bg-rose-100/50 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-amber-100/50 blur-3xl" />

          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-xl shadow-rose-200">
            <BookOpen className="h-10 w-10" />
          </div>
          <h2 className="relative mt-5 text-xl font-black text-slate-900">
            {search || level !== "all"
              ? "Không tìm thấy bài học phù hợp"
              : "Chưa có bài học tiếng Trung"}
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {search || level !== "all"
              ? "Bạn hãy thử từ khóa khác hoặc thay đổi cấp độ lọc."
              : "Khi có bài học được xuất bản, nội dung sẽ xuất hiện tại đây để bạn bắt đầu học."}
          </p>
          {isCashier && !search && level === "all" && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4" /> Tạo bài học đầu tiên
            </button>
          )}
        </div>
      )}

      {/* ===== CREATE MODAL ===== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !generating)
              setShowCreateModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-chinese-lesson-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-[slideUp_0.3s_ease-out]"
          >
            {/* Header gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-6 py-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      id="create-chinese-lesson-title"
                      className="text-lg font-black"
                    >
                      Tạo bài học tiếng Trung
                    </h2>
                    <p className="mt-0.5 text-sm text-white/85">
                      Tạo nội dung theo chủ đề bạn chọn.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Đóng"
                  className="rounded-lg p-1.5 transition hover:bg-white/15 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              {/* Tab switch */}
              <div className="relative grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setCreateMode("ai")}
                  className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    createMode === "ai"
                      ? "bg-white text-rose-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Sparkles className="h-4 w-4" /> Tạo bằng AI
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("manual")}
                  className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    createMode === "manual"
                      ? "bg-white text-rose-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Plus className="h-4 w-4" /> Tự soạn bài
                </button>
              </div>

              {createMode === "ai" ? (
                <form onSubmit={createLesson} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="chinese-topic"
                      className="mb-1.5 block text-sm font-bold text-slate-700"
                    >
                      Chủ đề bài học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="chinese-topic"
                      required
                      autoFocus
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      placeholder="Ví dụ: Chào hỏi khách hàng, gọi món..."
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="chinese-level"
                        className="mb-1.5 block text-sm font-bold text-slate-700"
                      >
                        Cấp độ
                      </label>
                      <select
                        id="chinese-level"
                        value={targetLevel}
                        onChange={(event) => setTargetLevel(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      >
                        <option value="beginner">Cơ bản</option>
                        <option value="intermediate">Trung cấp</option>
                        <option value="advanced">Nâng cao</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="chinese-vocab"
                        className="mb-1.5 block text-sm font-bold text-slate-700"
                      >
                        Số từ
                      </label>
                      <select
                        id="chinese-vocab"
                        value={vocabularyCount}
                        onChange={(event) => setVocabularyCount(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      >
                        <option value="10">10 từ</option>
                        <option value="15">15 từ</option>
                        <option value="20">20 từ</option>
                        <option value="25">25 từ</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="chinese-duration"
                        className="mb-1.5 block text-sm font-bold text-slate-700"
                      >
                        Thời lượng
                      </label>
                      <select
                        id="chinese-duration"
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      >
                        <option value="10">10 phút</option>
                        <option value="15">15 phút</option>
                        <option value="20">20 phút</option>
                        <option value="30">30 phút</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-violet-900">
                      <Sparkles className="h-3.5 w-3.5" />
                      Nội dung AI dự kiến
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-violet-800">
                      <li className="flex gap-1.5">
                        <span>•</span> Từ vựng + Pinyin + nghĩa tiếng Việt
                      </li>
                      <li className="flex gap-1.5">
                        <span>•</span> Ví dụ, ngữ pháp, 2 hội thoại thực tế
                      </li>
                      <li className="flex gap-1.5">
                        <span>•</span> 10 câu trắc nghiệm phủ đều từ vựng
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={generating || !topic.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {generating ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {generating ? "Đang tạo..." : "Tạo bài học"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={createManualLesson} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Tiêu đề bài học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      placeholder="Ví dụ: Chào hỏi khách hàng"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Chủ đề <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      placeholder="Chủ đề bài học"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Mô tả
                    </label>
                    <textarea
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      placeholder="Mục tiêu và nội dung bài học"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Từ vựng
                    </label>
                    <p className="mb-1.5 text-[11px] text-slate-500">
                      Mỗi dòng: <code className="rounded bg-slate-100 px-1">từ | pinyin | nghĩa | ví dụ | dịch</code>
                    </p>
                    <textarea
                      value={manualVocabulary}
                      onChange={(e) => setManualVocabulary(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 p-3 font-mono text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                      placeholder={"你好 | nǐ hǎo | xin chào | 你好！ | Xin chào!"}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Ghi chú bài học
                    </label>
                    <textarea
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={generating}
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={generating || !manualTitle.trim() || !topic.trim()}
                      className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {generating ? "Đang lưu..." : "Lưu bản nháp"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyframes cho animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  Languages,
  LoaderCircle,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import { fetchData, postData } from "@/lib/fetch-util";

type Lesson = {
  _id: string;
  title?: string;
  language?: string;
  level?: string;
  topic?: string;
  status?: string;
  estimatedMinutes?: number;
  aiGenerated?: boolean;
  description?: string;
  createdAt?: string;
  createdBy?: string | { _id: string; name?: string };
};

type LessonResponse = Lesson[] | {
  lessons?: Lesson[];
  data?: Lesson[] | { lessons?: Lesson[] };
  results?: Lesson[];
};

const LEVELS = [
  { value: "all", label: "Tất cả cấp độ" },
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
];

function getLessons(response: LessonResponse | null | undefined): Lesson[] {
  if (Array.isArray(response)) return response;
  if (!response) return [];
  if (Array.isArray(response.lessons)) return response.lessons;
  if (Array.isArray(response.data)) return response.data;
  if (response.data && !Array.isArray(response.data) && Array.isArray(response.data.lessons)) {
    return response.data.lessons;
  }
  if (Array.isArray(response.results)) return response.results;
  return [];
}

function normalizeLevel(level?: string) {
  const value = (level || "").toLowerCase();
  if (["beginner", "basic", "a1", "a2", "cơ bản"].includes(value)) return "beginner";
  if (["intermediate", "intermediate-level", "b1", "b2", "trung cấp"].includes(value)) return "intermediate";
  if (["advanced", "c1", "c2", "nâng cao"].includes(value)) return "advanced";
  return value;
}

function levelLabel(level?: string) {
  const normalized = normalizeLevel(level);
  if (normalized === "beginner") return "Cơ bản";
  if (normalized === "intermediate") return "Trung cấp";
  if (normalized === "advanced") return "Nâng cao";
  return level || "Chưa phân cấp";
}

function getLevelStyle(level?: string) {
  const normalized = normalizeLevel(level);
  if (normalized === "beginner") {
    return {
      pill: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      gradient: "from-emerald-500 to-teal-400",
    };
  }
  if (normalized === "intermediate") {
    return {
      pill: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      gradient: "from-amber-500 to-orange-400",
    };
  }
  if (normalized === "advanced") {
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

function isPublished(status?: string) {
  return ["published", "public", "active"].includes((status || "").toLowerCase());
}

// 👇 Lấy userId + role từ localStorage, linh hoạt nhiều key
function readCurrentUser(): { role: string; userId: string } {
  if (typeof window === "undefined") return { role: "", userId: "" };
  const userKeys = ["user", "currentUser", "authUser", "profile"];
  for (const key of userKeys) {
    try {
      const rawUser = window.localStorage.getItem(key);
      if (!rawUser) continue;
      const parsed = JSON.parse(rawUser);
      const user = parsed?.user ?? parsed?.data?.user ?? parsed?.data ?? parsed;
      const role = String(user?.role ?? user?.user?.role ?? "").toLowerCase();
      const id = String(user?._id ?? user?.id ?? user?.user?._id ?? "");
      if (role || id) return { role, userId: id };
    } catch {
      // ignore
    }
  }
  return { role: "", userId: "" };
}

export default function EnglishLearning() {
  const { role, userId: currentUserId } = useMemo(() => readCurrentUser(), []);
  const isCashier = role === "cashier";
  const isAdmin = ["admin", "superadmin"].includes(role);
  const canGenerate = isCashier || isAdmin;

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"ai" | "manual">("ai");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualVocabulary, setManualVocabulary] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [topic, setTopic] = useState("");
  const [createLevel, setCreateLevel] = useState("beginner");
  const [duration, setDuration] = useState("15");
  const [vocabularyCount, setVocabularyCount] = useState("15");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const loadLessons = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await fetchData<LessonResponse>("/training/lessons?language=en");
      const loaded = getLessons(response);
      const filtered = loaded.filter((lesson) => {
        const language = (lesson.language || "").toLowerCase();
        return !language || ["en", "en-us", "english", "en-gb"].includes(language);
      });
      setLessons(filtered.filter((lesson) => (lesson.status || "").toLowerCase() !== "archived"));
    } catch (err) {
      console.error("Không thể tải bài học tiếng Anh:", err);
      setError("Không thể tải danh sách bài học. Bạn hãy kiểm tra kết nối hoặc API rồi thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("search-english") as HTMLInputElement | null;
        input?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const visibleLessons = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return lessons.filter((lesson) => {
      const matchesKeyword = !query ||
        `${lesson.title || ""} ${lesson.topic || ""} ${lesson.description || ""}`.toLowerCase().includes(query);
      const matchesLevel = level === "all" || normalizeLevel(lesson.level) === level;
      return matchesKeyword && matchesLevel;
    });
  }, [lessons, keyword, level]);

  const publishedCount = lessons.filter((lesson) => isPublished(lesson.status)).length;
  const draftCount = lessons.filter((lesson) => !isPublished(lesson.status)).length;
  const totalLessons = lessons.length;

  // 🔑 Kiểm tra user hiện tại có phải là owner của bài học không
  const isOwnerOf = (lesson: Lesson) => {
    if (!currentUserId) return false;
    const createdById = typeof lesson.createdBy === "object"
      ? lesson.createdBy?._id
      : lesson.createdBy;
    return !!createdById && String(createdById) === String(currentUserId);
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!topic.trim()) {
      setFormError("Bạn hãy nhập chủ đề bài học trước nhé.");
      return;
    }

    setCreating(true);
    setFormError("");
    try {
      await postData("/training/lessons/generate", {
        topic: topic.trim(),
        language: "en",
        level: createLevel,
        estimatedMinutes: Number(duration),
        vocabularyCount: Number(vocabularyCount) || 15,
      });
      setShowCreate(false);
      setTopic("");
      setNotice("Đã gửi yêu cầu tạo bài học tiếng Anh. Đang cập nhật danh sách...");
      await loadLessons(true);
    } catch (err) {
      console.error("Không thể tạo bài học tiếng Anh:", err);
      setFormError("Tạo bài học chưa thành công. Hãy kiểm tra API tạo bài học và thử lại.");
    } finally {
      setCreating(false);
    }
  };

  const handleManualCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualTitle.trim() || !topic.trim()) return;

    setCreating(true);
    setFormError("");

    try {
      const vocabulary = manualVocabulary
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [word = "", meaning = "", example = "", exampleTranslation = ""] =
            line.split("|").map((part) => part.trim());
          return { word, pinyin: "", meaning, example, examplePinyin: "", exampleTranslation };
        })
        .filter((v) => v.word && v.meaning);

      if (vocabulary.length === 0) {
        setFormError("Vui lòng nhập ít nhất 1 từ vựng (định dạng: từ | nghĩa | ví dụ | dịch).");
        setCreating(false);
        return;
      }

      await postData("/training/lessons/manual", {
        title: manualTitle.trim(),
        topic: topic.trim(),
        description: manualDescription.trim(),
        language: "en",
        level: createLevel,
        estimatedMinutes: Number(duration) || 15,
        vocabulary,
        examples: [],
        grammar: [],
        dialogues: [],
        quiz: [],
        studyNotes: manualNotes.trim(),
      });

      setShowCreate(false);
      setManualTitle("");
      setManualDescription("");
      setManualVocabulary("");
      setManualNotes("");
      setTopic("");
      setNotice("Đã tạo bài học thủ công ở trạng thái bản nháp.");
      await loadLessons(true);
    } catch (err) {
      console.error(err);
      setFormError("Không thể lưu bài học thủ công. Hãy kiểm tra API và dữ liệu nhập.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* ===== HERO ===== */}
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-600 p-6 text-white shadow-xl shadow-indigo-200/60 sm:p-9">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full border-[40px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-72 w-72 rounded-full border-[40px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 -z-10 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wide text-white/95 backdrop-blur">
                <Languages className="h-3.5 w-3.5" />
                EN · ENGLISH LEARNING CENTER
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Học tiếng Anh mỗi ngày
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Học từ vựng, luyện giao tiếp và nâng cao kỹ năng tiếng Anh qua những bài học ngắn gọn, dễ áp dụng trong công việc.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: BookOpen, label: `${totalLessons} bài học` },
                  { icon: CheckCircle2, label: `${publishedCount} đã mở` },
                  { icon: Sparkles, label: `${draftCount} bản nháp` },
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

            <div className="hidden shrink-0 items-center justify-center md:flex">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner backdrop-blur">
                <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-cyan-300/40 blur-2xl" />
                <GraduationCap className="h-20 w-20 text-white drop-shadow" strokeWidth={1.4} />
              </div>
            </div>
          </div>

          {canGenerate && (
            <button
              type="button"
              onClick={() => { setFormError(""); setShowCreate(true); }}
              className="group relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              Tạo bài học
            </button>
          )}
        </section>

        {/* ===== NOTICE ===== */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm text-emerald-800 shadow-sm"
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

        {/* ===== STATS ===== */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-100/60 blur-2xl transition group-hover:bg-indigo-200/60" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-200">
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
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-700"
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
                <FileText className="h-5 w-5" />
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Thư viện bài học</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn bài học phù hợp với trình độ của bạn.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block sm:min-w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="search-english"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm theo tên hoặc chủ đề..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-16 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:inline-flex">
                  Ctrl K
                </kbd>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Filter className="h-4 w-4 shrink-0 text-slate-400" />
                <select
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  className="min-w-32 bg-transparent py-2.5 text-sm text-slate-700 outline-none"
                >
                  {LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void loadLessons(true)}
                disabled={refreshing}
                aria-label="Tải lại danh sách"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Tải lại
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              {loading ? (
                "Đang tải bài học..."
              ) : (
                <>
                  Tìm thấy <span className="font-bold text-slate-900">{visibleLessons.length}</span> bài học
                </>
              )}
            </p>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:inline-flex">
              <Volume2 className="h-3.5 w-3.5" /> Hỗ trợ nghe phát âm trong bài học
            </span>
          </div>

          {error && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-4 text-sm text-rose-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
              <button
                onClick={() => void loadLessons()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-100"
              >
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  </div>
                </div>
              ))}
            </div>
          ) : visibleLessons.length === 0 ? (
            <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-white to-slate-50 px-5 py-16 text-center">
              <div className="pointer-events-none absolute left-1/4 top-0 h-40 w-40 rounded-full bg-indigo-100/50 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-blue-100/50 blur-3xl" />

              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-xl shadow-indigo-200">
                <BookOpen className="h-10 w-10" />
              </div>
              <h3 className="relative mt-5 text-xl font-black text-slate-900">
                {keyword || level !== "all" ? "Không tìm thấy bài học phù hợp" : "Chưa có bài học tiếng Anh"}
              </h3>
              <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {keyword || level !== "all"
                  ? "Thử đổi từ khóa hoặc cấp độ lọc để xem thêm bài học."
                  : canGenerate
                    ? "Bạn có thể tạo bài học mới bằng AI để bắt đầu thư viện."
                    : "Các bài học sẽ xuất hiện tại đây khi được tạo và xuất bản."}
              </p>
              {keyword || level !== "all" ? (
                <button
                  onClick={() => { setKeyword(""); setLevel("all"); }}
                  className="relative mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  <X className="h-4 w-4" /> Xóa bộ lọc
                </button>
              ) : canGenerate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <Sparkles className="h-4 w-4" /> Tạo bài học đầu tiên
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleLessons.map((lesson, index) => {
                const published = isPublished(lesson.status);
                const levelStyle = getLevelStyle(lesson.level);
                const accent =
                  index % 3 === 0
                    ? "from-indigo-500 to-blue-400"
                    : index % 3 === 1
                      ? "from-blue-400 to-cyan-400"
                      : "from-sky-500 to-indigo-400";

                // 🔑 Kiểm tra quyền mở bài
                const owner = isOwnerOf(lesson);
                const canOpen = published || canGenerate || owner;

                return (
                  <article
                    key={lesson._id}
                    className="group relative flex min-h-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50"
                  >
                    <div className={`h-1 bg-gradient-to-r ${accent}`} />

                    {published && (
                      <div className="pointer-events-none absolute right-0 top-1 z-10 overflow-hidden">
                        <div className="translate-x-[30%] rotate-45 bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                          Live
                        </div>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-200 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                              published
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            {published ? "Đã xuất bản" : "Bản nháp"}
                          </span>
                          {lesson.aiGenerated && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
                              <Sparkles className="h-2.5 w-2.5" />
                              AI
                            </span>
                          )}
                          {!published && owner && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                              Của bạn
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelStyle.pill}`}
                          >
                            {levelLabel(lesson.level)}
                          </span>
                          {lesson.topic && (
                            <span className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
                              {lesson.topic}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-slate-900 transition group-hover:text-indigo-700">
                          {lesson.title || lesson.topic || "Bài học tiếng Anh"}
                        </h3>
                        {lesson.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                            {lesson.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" /> {lesson.estimatedMinutes || 15} phút
                        </span>
                        {canOpen ? (
                          <Link
                            to={`/training/lesson/${lesson._id}`}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black transition ${
                              published
                                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            }`}
                          >
                            {published ? (
                              <>
                                <BookOpen className="h-4 w-4" /> Vào học
                              </>
                            ) : (
                              <>
                                <FileText className="h-4 w-4" /> Xem bản nháp
                              </>
                            )}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                            <Lock className="h-3.5 w-3.5" /> Chưa mở
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ===== CREATE MODAL ===== */}
      {showCreate && canGenerate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) setShowCreate(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-english-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 px-6 py-5 text-white">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="create-english-title" className="text-lg font-black">
                      Tạo bài học tiếng Anh
                    </h2>
                    <p className="mt-0.5 text-sm text-white/85">
                      Chọn chủ đề, cấp độ và thời lượng mong muốn.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  aria-label="Đóng"
                  className="rounded-lg p-1.5 transition hover:bg-white/15 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setCreateMode("ai")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    createMode === "ai"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Sparkles className="h-4 w-4" /> Tạo bằng AI
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("manual")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                    createMode === "manual"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Plus className="h-4 w-4" /> Tự soạn bài
                </button>
              </div>

              {createMode === "ai" ? (
                <form onSubmit={handleGenerate} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="english-topic" className="mb-1.5 block text-sm font-bold text-slate-700">
                      Chủ đề bài học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="english-topic"
                      required
                      autoFocus
                      value={topic}
                      onChange={(event) => setTopic(event.target.value)}
                      maxLength={160}
                      placeholder="Ví dụ: Chào hỏi khách hàng tại nhà hàng"
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="english-level" className="mb-1.5 block text-sm font-bold text-slate-700">
                        Cấp độ
                      </label>
                      <select
                        id="english-level"
                        value={createLevel}
                        onChange={(event) => setCreateLevel(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      >
                        <option value="beginner">Cơ bản</option>
                        <option value="intermediate">Trung cấp</option>
                        <option value="advanced">Nâng cao</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="english-vocab" className="mb-1.5 block text-sm font-bold text-slate-700">
                        Số từ
                      </label>
                      <select
                        id="english-vocab"
                        value={vocabularyCount}
                        onChange={(event) => setVocabularyCount(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      >
                        <option value="10">10 từ</option>
                        <option value="15">15 từ</option>
                        <option value="20">20 từ</option>
                        <option value="25">25 từ</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="english-duration" className="mb-1.5 block text-sm font-bold text-slate-700">
                        Thời lượng
                      </label>
                      <select
                        id="english-duration"
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      >
                        <option value="10">10 phút</option>
                        <option value="15">15 phút</option>
                        <option value="20">20 phút</option>
                        <option value="30">30 phút</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-900">
                      <Sparkles className="h-3.5 w-3.5" />
                      Nội dung AI dự kiến
                    </p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-indigo-800">
                      <li className="flex gap-1.5"><span>•</span> Từ vựng + nghĩa tiếng Việt</li>
                      <li className="flex gap-1.5"><span>•</span> Ví dụ, ngữ pháp, 2 hội thoại thực tế</li>
                      <li className="flex gap-1.5"><span>•</span> 10 câu trắc nghiệm phủ đều từ vựng</li>
                    </ul>
                  </div>

                  {formError && (
                    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      {formError}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      disabled={creating}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !topic.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {creating ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {creating ? "Đang tạo..." : "Tạo bài học"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleManualCreate} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Tiêu đề bài học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      placeholder="Ví dụ: Greeting customers"
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
                      className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
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
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      placeholder="Mục tiêu và nội dung bài học"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-bold text-slate-700">
                      Từ vựng
                    </label>
                    <p className="mb-1.5 text-[11px] text-slate-500">
                      Mỗi dòng: <code className="rounded bg-slate-100 px-1">từ | nghĩa | ví dụ | dịch</code>
                    </p>
                    <textarea
                      value={manualVocabulary}
                      onChange={(e) => setManualVocabulary(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 p-3 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      placeholder={"Hello | Xin chào | Hello, welcome! | Xin chào, chào mừng bạn!"}
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
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>
                  {formError && (
                    <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                      {formError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={creating}
                      onClick={() => setShowCreate(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !manualTitle.trim() || !topic.trim()}
                      className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {creating ? "Đang lưu..." : "Lưu bản nháp"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
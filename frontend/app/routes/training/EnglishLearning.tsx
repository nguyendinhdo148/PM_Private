import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
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

function isPublished(status?: string) {
  return ["published", "public", "active"].includes((status || "").toLowerCase());
}

export default function EnglishLearning() {
  // Đọc role từ thông tin người dùng được lưu trong localStorage.
  // Hỗ trợ các tên key thường dùng trong ứng dụng; nếu không tìm thấy user,
  // nút tạo bài học AI sẽ được ẩn để tránh mở quyền ngoài ý muốn.
  const canGenerate = (() => {
    if (typeof window === "undefined") return false;

    const userKeys = ["user", "currentUser", "authUser", "profile"];
    for (const key of userKeys) {
      try {
        const rawUser = window.localStorage.getItem(key);
        if (!rawUser) continue;
        const parsed = JSON.parse(rawUser);
        const user = parsed?.user ?? parsed?.data?.user ?? parsed?.data ?? parsed;
        if (String(user?.role ?? user?.user?.role ?? "").toLowerCase() === "cashier") {
          return true;
        }
      } catch {
        // Bỏ qua key không chứa JSON hợp lệ.
      }
    }

    return false;
  })();

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
  const [formError, setFormError] = useState("");

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
      });
      setShowCreate(false);
      setTopic("");
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
    setCreating(true); setFormError("");
    try {
      const vocabulary = manualVocabulary.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const [word = "", meaning = "", example = "", exampleTranslation = ""] = line.split("|").map((part) => part.trim());
        return { word, meaning, example, exampleTranslation };
      });
      await postData("/training/lessons/manual", { title: manualTitle.trim(), topic: topic.trim(), description: manualDescription.trim(), language: "en", level: createLevel, estimatedMinutes: Number(duration) || 15, vocabulary, studyNotes: manualNotes.trim() });
      setShowCreate(false); setManualTitle(""); setManualDescription(""); setManualVocabulary(""); setManualNotes(""); setTopic(""); await loadLessons(true);
    } catch (err) { console.error(err); setFormError("Không thể lưu bài học thủ công. Hãy kiểm tra API và dữ liệu nhập."); } finally { setCreating(false); }
  };

  return (
    <div className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-sky-600 p-6 text-white shadow-lg shadow-indigo-200/60 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-blue-50">
                <Sparkles className="h-4 w-4" />
                English Learning Center
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Học tiếng Anh mỗi ngày</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Học từ vựng, luyện giao tiếp và nâng cao kỹ năng tiếng Anh qua những bài học ngắn gọn, dễ áp dụng trong công việc.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
                  <BookOpen className="h-4 w-4" /> {lessons.length} bài học
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
                  <CheckCircle2 className="h-4 w-4" /> {publishedCount} bài đã mở
                </span>
              </div>
            </div>
            <div className="hidden shrink-0 items-center justify-center md:flex">
              <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner backdrop-blur">
                <GraduationCap className="h-20 w-20 text-white drop-shadow" strokeWidth={1.4} />
              </div>
            </div>
          </div>
          {canGenerate && (
            <button
              type="button"
              onClick={() => { setFormError(""); setShowCreate(true); }}
              className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <Plus className="h-4 w-4" />
              Tạo bài học
            </button>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Tổng bài học</span>
              <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><BookOpen className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{lessons.length}</p>
            <p className="mt-1 text-xs text-slate-500">Bài học tiếng Anh trong hệ thống</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Đã xuất bản</span>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{publishedCount}</p>
            <p className="mt-1 text-xs text-slate-500">Có thể mở để học ngay</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Bản nháp</span>
              <span className="rounded-xl bg-amber-50 p-2 text-amber-600"><FileText className="h-5 w-5" /></span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{draftCount}</p>
            <p className="mt-1 text-xs text-slate-500">Đang chờ được xuất bản</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Thư viện bài học</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn bài học phù hợp với trình độ của bạn.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block sm:min-w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm theo tên hoặc chủ đề..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Tải lại
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
              <p>{error}</p>
              <button onClick={() => void loadLessons()} className="inline-flex shrink-0 items-center gap-2 font-semibold hover:underline">
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-56 items-center justify-center text-slate-500">
              <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-indigo-600" />
              Đang tải bài học...
            </div>
          ) : visibleLessons.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-800">
                {keyword || level !== "all" ? "Không tìm thấy bài học phù hợp" : "Chưa có bài học tiếng Anh"}
              </h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                {keyword || level !== "all"
                  ? "Thử đổi từ khóa hoặc cấp độ lọc để xem thêm bài học."
                  : canGenerate
                    ? "Bạn có thể tạo bài học mới bằng AI để bắt đầu thư viện."
                    : "Các bài học sẽ xuất hiện tại đây khi được tạo và xuất bản."}
              </p>
              {keyword || level !== "all" ? (
                <button onClick={() => { setKeyword(""); setLevel("all"); }} className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                  Xóa bộ lọc
                </button>
              ) : canGenerate ? (
                <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                  <Sparkles className="h-4 w-4" /> Tạo bài học đầu tiên
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleLessons.map((lesson) => {
                const published = isPublished(lesson.status);
                return (
                  <article key={lesson._id} className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        <GraduationCap className="h-3.5 w-3.5" /> {levelLabel(lesson.level)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {published ? "Đã xuất bản" : "Bản nháp"}
                      </span>
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-lg font-bold leading-6 text-slate-900 group-hover:text-indigo-700">
                      {lesson.title || lesson.topic || "Bài học tiếng Anh"}
                    </h3>
                    {lesson.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{lesson.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {lesson.estimatedMinutes || 15} phút</span>
                        {lesson.aiGenerated && <span className="inline-flex items-center gap-1 text-indigo-600"><Sparkles className="h-3.5 w-3.5" /> AI</span>}
                      </div>
                      {published ? (
                        <Link to={`/training/lesson/${lesson._id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
                          <BookOpen className="h-4 w-4" /> Vào học
                        </Link>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-slate-400">Chưa mở học</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {showCreate && canGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !creating) setShowCreate(false);
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="create-english-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><Sparkles className="h-5 w-5" /></div>
                <h2 id="create-english-title" className="text-xl font-bold text-slate-900">Tạo bài học tiếng Anh</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Chọn chủ đề, cấp độ và thời lượng mong muốn.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} disabled={creating} aria-label="Đóng" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => setCreateMode("ai")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${createMode === "ai" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><Sparkles className="mr-1 inline h-4 w-4" /> Tạo bằng AI</button>
              <button type="button" onClick={() => setCreateMode("manual")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${createMode === "manual" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><Plus className="mr-1 inline h-4 w-4" /> Tự soạn bài</button>
            </div>
            {createMode === "ai" ? <form onSubmit={handleGenerate} className="mt-6 space-y-5">
              <div>
                <label htmlFor="english-topic" className="mb-2 block text-sm font-semibold text-slate-700">Chủ đề bài học <span className="text-rose-500">*</span></label>
                <input id="english-topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} placeholder="Ví dụ: Chào hỏi khách hàng tại nhà hàng" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
              </div>
              <div>
                <label htmlFor="english-level" className="mb-2 block text-sm font-semibold text-slate-700">Cấp độ</label>
                <select id="english-level" value={createLevel} onChange={(event) => setCreateLevel(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                  <option value="beginner">Cơ bản (Beginner)</option>
                  <option value="intermediate">Trung cấp (Intermediate)</option>
                  <option value="advanced">Nâng cao (Advanced)</option>
                </select>
              </div>
              <div>
                <label htmlFor="english-duration" className="mb-2 block text-sm font-semibold text-slate-700">Thời lượng dự kiến</label>
                <select id="english-duration" value={duration} onChange={(event) => setDuration(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                  <option value="10">10 phút</option>
                  <option value="15">15 phút</option>
                  <option value="20">20 phút</option>
                  <option value="30">30 phút</option>
                </select>
              </div>
              {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{formError}</p>}
              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Hủy</button>
                <button type="submit" disabled={creating || !topic.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {creating ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Đang tạo bài học...</> : <><Sparkles className="h-4 w-4" /> Tạo bài học</>}
                </button>
              </div>
            </form> : <form onSubmit={handleManualCreate} className="mt-6 space-y-4">
              <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Tiêu đề bài học *</label><input required value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Ví dụ: Greeting customers" /></div>
              <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Chủ đề *</label><input required value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" placeholder="Chủ đề bài học" /></div>
              <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</label><textarea value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></div>
              <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Từ vựng (mỗi dòng: từ | nghĩa | ví dụ | dịch ví dụ)</label><textarea value={manualVocabulary} onChange={(e) => setManualVocabulary(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm font-mono" placeholder={'Hello | Xin chào | Hello, welcome! | Xin chào, chào mừng bạn!'} /></div>
              <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú bài học</label><textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></div>
              {formError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
              <div className="flex justify-end gap-2"><button type="button" disabled={creating} onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2.5 text-sm">Hủy</button><button type="submit" disabled={creating || !manualTitle.trim() || !topic.trim()} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{creating ? "Đang lưu..." : "Lưu bản nháp"}</button></div>
            </form>}
          </div>
        </div>
      )}
    </div>
  );
}

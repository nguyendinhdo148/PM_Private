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

            return ["zh-cn", "zh", "chinese", "tiếng trung"].includes(lang) &&

              lesson.status !== "archived";

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

      setGenerating(true); setError(""); setNotice("");

      try {

        const vocabulary = manualVocabulary.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {

          const [word = "", pinyin = "", meaning = "", example = "", exampleTranslation = ""] = line.split("|").map((part) => part.trim());

          return { word, pinyin, meaning, example, exampleTranslation };

        });

        await postData("/training/lessons/manual", { title: manualTitle.trim(), topic: topic.trim(), description: manualDescription.trim(), language: "zh-CN", level: targetLevel, estimatedMinutes: Number(duration) || 15, vocabulary, studyNotes: manualNotes.trim() });

        setNotice("Đã tạo bài học thủ công ở trạng thái bản nháp."); setManualTitle(""); setManualDescription(""); setManualVocabulary(""); setManualNotes(""); setTopic(""); setShowCreateModal(false); await loadLessons();

      } catch (err) { setError(getErrorMessage(err)); } finally { setGenerating(false); }

    };

    return (

      <div className="mx-auto max-w-7xl space-y-7 pb-8">


        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-rose-700 via-orange-600 to-amber-500 px-6 py-7 text-white shadow-lg shadow-rose-900/10 sm:px-8 sm:py-9">

          <div className="pointer-events-none absolute -right-10 -top-16 -z-10 h-64 w-64 rounded-full border-[34px] border-white/10" />

          <div className="pointer-events-none absolute bottom-0 right-1/3 -z-10 h-40 w-40 rounded-full bg-yellow-200/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

            <div className="max-w-2xl">

              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-white/90">

                <Languages className="h-3.5 w-3.5" />

                中文 · CHINESE LEARNING

              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">

                Học tiếng Trung

              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">

                Từ những câu chào hỏi đơn giản đến các tình huống giao tiếp thực tế.

                Học từ vựng, luyện phát âm và tiến bộ mỗi ngày.

              </p>

              <div className="mt-5 flex flex-wrap gap-2">

                {["Từ vựng & Pinyin", "Nghe phát âm", "Hội thoại thực tế"].map((item) => (

                  <span key={item} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">

                    {item}

                  </span>

                ))}

              </div>

            </div>

            {isCashier && (

              <button

                type="button"

                onClick={() => setShowCreateModal(true)}

                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50"

              >

                <Sparkles className="h-4 w-4" />

                Tạo bài học

              </button>

            )}

          </div>

        </section>

        {notice && (

          <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">

            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{notice}</span>

          </div>

        )}

        {error && (

          <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">

            <span>{error}</span>

            <button type="button" onClick={() => void loadLessons()} className="shrink-0 font-semibold underline underline-offset-4">

              Thử tải lại

            </button>

          </div>

        )}

        <section className="grid gap-3 sm:grid-cols-3">

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><BookOpen className="h-5 w-5" /></div>

            <div><p className="text-xs text-slate-500">Tổng bài học</p><p className="mt-0.5 text-xl font-bold text-slate-900">{loading ? "—" : lessons.length}</p></div>

          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>

            <div><p className="text-xs text-slate-500">Đã xuất bản</p><p className="mt-0.5 text-xl font-bold text-slate-900">{loading ? "—" : publishedCount}</p></div>

          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Clock3 className="h-5 w-5" /></div>

            <div><p className="text-xs text-slate-500">Bản nháp</p><p className="mt-0.5 text-xl font-bold text-slate-900">{loading ? "—" : draftCount}</p></div>

          </div>

        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          <div className="flex flex-col gap-3 lg:flex-row">

            <label className="relative min-w-0 flex-1">

              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input

                value={search}

                onChange={(event) => setSearch(event.target.value)}

                placeholder="Tìm bài học, chủ đề..."

                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"

              />

            </label>

            <label className="relative lg:w-56">

              <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select

                value={level}

                onChange={(event) => setLevel(event.target.value)}

                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"

              >

                {LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}

              </select>

            </label>

            {(search || level !== "all") && (

              <button

                type="button"

                onClick={() => { setSearch(""); setLevel("all"); }}

                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"

              >

                <X className="h-4 w-4" /> Xóa lọc

              </button>

            )}

          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">

            <p className="text-sm text-slate-500">

              {loading ? "Đang tải bài học..." : <>Tìm thấy <span className="font-bold text-slate-900">{filteredLessons.length}</span> bài học</>}

            </p>

            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:inline-flex"><Volume2 className="h-3.5 w-3.5" /> Có hỗ trợ nghe phát âm trong bài học</span>

          </div>

        </section>


        {loading ? (

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {[1, 2, 3].map((item) => (

              <div key={item} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">

                <div className="h-11 w-11 rounded-xl bg-slate-100" />

                <div className="mt-5 h-3 w-24 rounded bg-slate-100" />

                <div className="mt-3 h-5 w-3/4 rounded bg-slate-100" />

                <div className="mt-3 h-3 w-full rounded bg-slate-100" />

                <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />

                <div className="mt-7 h-9 rounded-lg bg-slate-100" />

              </div>

            ))}

          </div>

        ) : filteredLessons.length > 0 ? (

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredLessons.map((lesson, index) => {

              const isPublished = lesson.status === "published";

              return (

                <article key={lesson._id} className="group flex min-h-64 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg">

                  <div className={`h-1 bg-gradient-to-r ${index % 3 === 0 ? "from-rose-500 to-orange-400" : index % 3 === 1 ? "from-amber-400 to-rose-400" : "from-orange-500 to-pink-400"}`} />

                  <div className="flex flex-1 flex-col p-5">

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition group-hover:bg-rose-100">

                        <BookOpen className="h-5 w-5" />

                      </div>

                      <div className="flex flex-wrap justify-end gap-1.5">

                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isPublished ? "bg-emerald-50 text-emerald-700" : lesson.status === "archived" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}>

                          {isPublished ? "Đã xuất bản" : lesson.status === "archived" ? "Đã lưu trữ" : "Bản nháp"}

                        </span>

                        {lesson.aiGenerated && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">AI</span>}

                      </div>

                    </div>

                    <div className="mt-4 flex-1">

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">

                        <span>{lesson.topic || "Tiếng Trung"}</span><span>•</span><span>{getLevelLabel(lesson.level)}</span>

                      </div>

                      <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-6 text-slate-900">{lesson.title}</h2>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{lesson.description || "Bài học thực hành giúp bạn ghi nhớ từ vựng và tự tin hơn khi giao tiếp."}</p>

                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">

                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><Clock3 className="h-3.5 w-3.5" /> {lesson.estimatedMinutes || 15} phút</span>

                      <Link
                          to={`/training/lesson/${lesson._id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                        >
                          {isPublished ? "Vào học" : "Xem bản nháp"}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </Link>

                    </div>

                  </div>

                </article>

              );

            })}

          </div>

        ) : (

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><BookOpen className="h-8 w-8" /></div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">{search || level !== "all" ? "Không tìm thấy bài học phù hợp" : "Chưa có bài học tiếng Trung"}</h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">

              {search || level !== "all"

                ? "Bạn hãy thử từ khóa khác hoặc thay đổi cấp độ lọc."

                : "Khi có bài học được xuất bản, nội dung sẽ xuất hiện tại đây để bạn bắt đầu học."}

            </p>

            {isCashier && !search && level === "all" && (

              <button type="button" onClick={() => setShowCreateModal(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700">

                <Sparkles className="h-4 w-4" /> Tạo bài học đầu tiên

              </button>

            )}

          </div>

        )}

        {showCreateModal && (

          <div

            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"

            onMouseDown={(event) => {

              if (event.target === event.currentTarget && !generating) setShowCreateModal(false);

            }}

          >

            <div role="dialog" aria-modal="true" aria-labelledby="create-chinese-lesson-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7">

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-start gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-5 w-5" /></div>

                  <div>

                    <h2 id="create-chinese-lesson-title" className="text-lg font-bold text-slate-900">Tạo bài học tiếng Trung</h2>

                    <p className="mt-1 text-sm text-slate-500">Tạo nội dung tiếng Trung theo chủ đề bạn chọn.</p>

                  </div>

                </div>

                <button type="button" disabled={generating} onClick={() => setShowCreateModal(false)} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-5 w-5" /></button>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">

                <button type="button" onClick={() => setCreateMode("ai")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${createMode === "ai" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}><Sparkles className="mr-1 inline h-4 w-4" /> Tạo bằng AI</button>

                <button type="button" onClick={() => setCreateMode("manual")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${createMode === "manual" ? "bg-white text-rose-700 shadow-sm" : "text-slate-500"}`}><Plus className="mr-1 inline h-4 w-4" /> Tự soạn bài</button>

              </div>

              {createMode === "ai" ? <form onSubmit={createLesson} className="mt-6 space-y-4">

                <div>

                  <label htmlFor="chinese-topic" className="mb-1.5 block text-sm font-semibold text-slate-700">Chủ đề bài học <span className="text-rose-500">\*</span></label>

                  <input id="chinese-topic" required autoFocus value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ví dụ: Chào hỏi khách hàng, gọi món..." className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-50" />

                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div>

                    <label htmlFor="chinese-level" className="mb-1.5 block text-sm font-semibold text-slate-700">Cấp độ</label>

                    <select id="chinese-level" value={targetLevel} onChange={(event) => setTargetLevel(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50">

                      <option value="beginner">Cơ bản</option><option value="intermediate">Trung cấp</option><option value="advanced">Nâng cao</option>

                    </select>

                  </div>

                  <div>

                    <label htmlFor="chinese-duration" className="mb-1.5 block text-sm font-semibold text-slate-700">Thời lượng</label>

                    <select id="chinese-duration" value={duration} onChange={(event) => setDuration(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50">

                      <option value="10">10 phút</option><option value="15">15 phút</option><option value="20">20 phút</option><option value="30">30 phút</option>

                    </select>

                  </div>

                </div>

                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3.5">

                  <p className="text-xs font-bold text-violet-900">Nội dung AI dự kiến</p>

                  <p className="mt-1 text-xs leading-5 text-violet-800">Từ vựng, Pinyin, nghĩa tiếng Việt, ví dụ, hội thoại và câu hỏi ôn tập phù hợp với cấp độ đã chọn.</p>

                </div>

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">

                  <button type="button" disabled={generating} onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">Hủy</button>

                  <button type="submit" disabled={generating || !topic.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">

                    {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}

                    {generating ? "Đang tạo bài học..." : "Tạo bài học"}

                  </button>

                </div>

              </form> : <form onSubmit={createManualLesson} className="mt-6 space-y-4">

                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Tiêu đề bài học \*</label><input required value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm" placeholder="Ví dụ: Chào hỏi khách hàng" /></div>

                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Chủ đề \*</label><input required value={topic} onChange={(e) => setTopic(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm" placeholder="Chủ đề bài học" /></div>

                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả</label><textarea value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Mục tiêu và nội dung bài học" /></div>

                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Từ vựng (mỗi dòng: từ | pinyin | nghĩa | ví dụ | dịch ví dụ)</label><textarea value={manualVocabulary} onChange={(e) => setManualVocabulary(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 p-3 text-sm font-mono" placeholder={'你好 | nǐ hǎo | xin chào | 你好！ | Xin chào!'} /></div>

                <div><label className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú bài học</label><textarea value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></div>

                <div className="flex justify-end gap-2"><button type="button" disabled={generating} onClick={() => setShowCreateModal(false)} className="rounded-xl border px-4 py-2.5 text-sm">Hủy</button><button type="submit" disabled={generating || !manualTitle.trim() || !topic.trim()} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{generating ? "Đang lưu..." : "Lưu bản nháp"}</button></div>

              </form>}

            </div>

          </div>

        )}

      </div>

    );

  }

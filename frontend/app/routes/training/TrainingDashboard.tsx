import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  Languages,
  LoaderCircle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { fetchData } from "@/lib/fetch-util";
import { useAuth } from "@/provider/auth-context";

type Language = "zh-CN" | "en";

type Lesson = {
  _id: string;
  title: string;
  description?: string;
  language: Language;
  level?: string;
  topic?: string;
  status?: "draft" | "published" | "archived";
  estimatedMinutes?: number;
};

type LearningProgress = {
  lesson?: string | { _id: string; title?: string; language?: Language };
  lessonId?: string;
  status?: "not_started" | "in_progress" | "completed";
  progressPercent?: number;
  lastStudiedAt?: string;
};

const languageCards = [
  {
    title: "Tiếng Trung",
    description: "Tự tin giao tiếp với khách hàng và đồng nghiệp.",
    language: "zh-CN" as const,
    path: "/training/chinese",
    icon: Languages,
    iconStyle: "bg-rose-50 text-rose-600",
    gradient: "from-rose-500 via-orange-500 to-amber-400",
    tag: "中文 · Pinyin · Hội thoại",
  },
  {
    title: "Tiếng Anh",
    description: "Mở rộng vốn từ và phản xạ trong công việc.",
    language: "en" as const,
    path: "/training/english",
    icon: BookOpen,
    iconStyle: "bg-indigo-50 text-indigo-600",
    gradient: "from-indigo-600 via-blue-500 to-cyan-400",
    tag: "Vocabulary · Grammar · Speaking",
  },
];

function getList<T>(response: any, keys: string[] = []): T[] {
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
  }
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
}

function getLessonId(item: LearningProgress) {
  if (typeof item.lesson === "string") return item.lesson;
  return item.lesson?._id || item.lessonId || "";
}

function getErrorMessage(error: any) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Không thể tải dữ liệu đào tạo. Vui lòng thử lại."
  );
}

export default function TrainingDashboard() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const [lessonsResult, progressResult, summaryResult] =
          await Promise.all([
            fetchData<any>("/training/lessons"),
            fetchData<any>("/training/progress"),
            fetchData<any>("/training/progress/summary").catch(() => null),
          ]);

        if (!active) return;

        setLessons(
          getList<Lesson>(lessonsResult, ["lessons"]).filter(
            (lesson) => lesson.status !== "archived",
          ),
        );
        setProgress(getList<LearningProgress>(progressResult, ["progress"]));
        setSummary(
          summaryResult?.summary ||
            summaryResult?.data?.summary ||
            summaryResult?.data ||
            summaryResult,
        );
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const completedCount = useMemo(
    () =>
      Number(
        summary?.completedLessons ??
          progress.filter((item) => item.status === "completed").length,
      ),
    [progress, summary],
  );

  const inProgressCount = useMemo(
    () =>
      Number(
        summary?.inProgressLessons ??
          progress.filter((item) => item.status === "in_progress").length,
      ),
    [progress, summary],
  );

  const recentLessons = useMemo(() => {
    const lessonsById = new Map(lessons.map((lesson) => [lesson._id, lesson]));
    const seen = new Set<string>();

    return [...progress]
      .sort(
        (a, b) =>
          new Date(b.lastStudiedAt || 0).getTime() -
          new Date(a.lastStudiedAt || 0).getTime(),
      )
      .map((item) => {
        const id = getLessonId(item);
        if (!id || seen.has(id)) return null;
        seen.add(id);
        const found = lessonsById.get(id);
        if (found) return found;
        return typeof item.lesson === "object" ? item.lesson : null;
      })
      .filter((lesson): lesson is Lesson => Boolean(lesson))
      .slice(0, 3);
  }, [lessons, progress]);

  const publishedChineseCount = lessons.filter(
    (lesson) => lesson.language === "zh-CN" && lesson.status === "published",
  ).length;
  const publishedEnglishCount = lessons.filter(
    (lesson) => lesson.language === "en" && lesson.status === "published",
  ).length;

  // Ngôn ngữ có nhiều bài published hơn → dùng cho nút "Bắt đầu học"
  const startPath =
    publishedChineseCount >= publishedEnglishCount
      ? "/training/chinese"
      : "/training/english";

  const stats = [
    {
      label: "Bài học khả dụng",
      value: lessons.filter((lesson) => lesson.status === "published").length,
      icon: BookOpen,
      iconStyle: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Đã hoàn thành",
      value: completedCount,
      icon: CheckCircle2,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Đang học",
      value: inProgressCount,
      icon: Target,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      label: "Lượt học",
      value:
        summary?.totalAttempts ??
        summary?.totalLessonsStudied ??
        progress.length,
      icon: TrendingUp,
      iconStyle: "bg-sky-50 text-sky-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome banner */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-20 -z-10 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 -z-10 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100">
              <Sparkles className="h-3.5 w-3.5" />
              MAXIMSAIGON · LEARNING HUB
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              Chào {user?.name?.trim()?.split(/\s+/).slice(-1)[0] || "bạn"}!
              <br className="hidden sm:block" /> Sẵn sàng học hôm nay?
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Mỗi ngày một chút kiến thức mới. Luyện từ vựng, nghe phát âm và
              thực hành các tình huống giao tiếp thường gặp trong công việc.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={startPath}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-indigo-50"
              >
                Bắt đầu học <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#training-progress"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Xem tiến độ
              </a>
            </div>
          </div>

          <div className="hidden h-36 w-36 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] md:flex">
            <GraduationCap
              className="h-20 w-20 text-indigo-200"
              strokeWidth={1.2}
            />
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 font-semibold underline underline-offset-4"
          >
            Tải lại trang
          </button>
        </div>
      )}

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/60"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">{stat.label}</span>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconStyle}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex min-h-9 items-center text-3xl font-bold tracking-tight text-slate-900">
                {loading ? (
                  <LoaderCircle className="h-6 w-6 animate-spin text-slate-300" />
                ) : (
                  stat.value
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Language cards */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
              Choose your path
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              Chọn ngôn ngữ học
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Học theo tốc độ của riêng bạn
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {languageCards.map((card) => {
            const Icon = card.icon;
            const count =
              card.language === "zh-CN"
                ? publishedChineseCount
                : publishedEnglishCount;

            return (
              <Link
                key={card.language}
                to={card.path}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />
                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconStyle}`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      {loading ? "Đang tải…" : `${count} bài học`}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {card.description}
                  </p>
                  <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400">
                    {card.tag}
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-sm font-semibold text-slate-700">
                      Khám phá bài học
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white">
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Progress and learning tips */}
      <section
        id="training-progress"
        className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Học tiếp gần đây
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Quay lại bài học bạn đã bắt đầu
              </p>
            </div>
            <Clock3 className="h-5 w-5 text-slate-400" />
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <LoaderCircle className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : recentLessons.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {recentLessons.map((lesson) => (
                <Link
                  key={lesson._id}
                  to={`/training/lesson/${lesson._id}`}
                  className="flex items-center gap-3 py-4 first:pt-1 last:pb-1"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {lesson.title || "Bài học"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {lesson.topic || "Bài học"} · {lesson.level || "Cơ bản"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Chưa có bài học gần đây
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Chọn tiếng Trung hoặc tiếng Anh để bắt đầu hành trình học tập.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Mẹo học hiệu quả</h2>
              <p className="text-sm text-slate-500">
                Duy trì thói quen mỗi ngày
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-600">
              Dành 10–15 phút mỗi ngày để học từ mới, nghe phát âm và luyện
              nói thành tiếng. Ôn lại kiến thức cũ giúp bạn ghi nhớ lâu hơn.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Clock3 className="h-4 w-4 text-indigo-500" />
              Gợi ý: học 1 chủ đề mỗi ngày
            </div>
          </div>

          <Link
            to={startPath}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Tìm bài học phù hợp <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pinyin as toPinyin } from "pinyin-pro";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  LoaderCircle,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  XCircle,
  Zap,
} from "lucide-react";

export type QuizQuestion = {
  question?: string;
  pinyin?: string;
  options?: string[];
  explanation?: string;
  correctAnswer?: number;
};

export type QuizAnswerResult = {
  index: number;
  selected: number | null;
  correctAnswer: number;
  isCorrect: boolean;
  timeSpent: number;
  points: number;
};

export type QuizSubmitPayload = {
  answers: (number | null)[];
  totalTimeSpent: number;
};

type Props = {
  questions: QuizQuestion[];
  secondsPerQuestion?: number;
  onSpeak?: (text?: string) => void;
  onSubmit?: (payload: QuizSubmitPayload) => Promise<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    results: {
      index: number;
      isCorrect: boolean;
      correctAnswer: number;
      explanation: string;
    }[];
  } | null>;
  onReset?: () => void;
};

const MAX_POINTS = 20;
const BASE_POINTS = 10;

const countChinese = (text: string) => (text.match(/[\u4e00-\u9fff]/g) || []).length;

/**
 * 🔑 Ép kiểu correctAnswer an toàn:
 * - Chấp nhận number, string number, hoặc undefined
 * - Trả về -1 nếu không hợp lệ
 */
const parseCorrectIndex = (q: QuizQuestion): number => {
  const raw = (q as any)?.correctAnswer;
  if (raw === undefined || raw === null || raw === "") return -1;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : -1;
};

/**
 * So sánh đáp án an toàn (ép cả 2 về Number).
 */
const isAnswerCorrect = (optionIndex: number, q: QuizQuestion): boolean => {
  const correctIdx = parseCorrectIndex(q);
  if (correctIdx < 0) return false;
  return Number(optionIndex) === correctIdx;
};

/**
 * Tự sinh pinyin CHỈ khi chuỗi chủ yếu là chữ Hán (>= 50% ký tự).
 */
const autoPinyin = (text?: string): string => {
  if (!text) return "";
  const trimmed = text.trim();
  const total = trimmed.replace(/\s/g, "").length;
  const chinese = countChinese(trimmed);
  if (total === 0 || chinese / total < 0.5) return "";

  try {
    const r = toPinyin(trimmed, { toneType: "symbol", type: "array" });
    return Array.isArray(r) ? r.join(" ") : String(r);
  } catch {
    return "";
  }
};

const getQuestionPinyin = (q: QuizQuestion): string => {
  if (q.pinyin && q.pinyin.trim()) return q.pinyin.trim();
  const text = (q.question || "").trim();
  const isChineseQuestion = /^[\u4e00-\u9fff\s，。？！、；：""''（）《》【】…—]+$/.test(text);
  if (!isChineseQuestion) return "";
  return autoPinyin(text);
};

const getOptionPinyin = (opt: string): string => {
  if (!opt) return "";
  const trimmed = opt.trim();
  const isPureChinese = /^[\u4e00-\u9fff\s]+$/.test(trimmed);
  if (!isPureChinese) return "";
  if (trimmed.replace(/\s/g, "").length > 8) return "";
  return autoPinyin(trimmed);
};

export default function QuizCountdown({
  questions,
  secondsPerQuestion = 15,
  onSpeak,
  onSubmit,
  onReset,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const [isRunning, setIsRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswerResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    results: { index: number; isCorrect: boolean; correctAnswer: number; explanation: string }[];
  } | null>(null);
  const [finished, setFinished] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const total = questions.length;

  useEffect(() => {
    setCurrentIndex(0);
    setTimeLeft(secondsPerQuestion);
    setIsRunning(false);
    setStarted(false);
    setSelectedAnswer(null);
    setRevealed(false);
    setAnswers([]);
    setSubmitting(false);
    setQuizResult(null);
    setFinished(false);
  }, [questions, secondsPerQuestion]);

  const playTone = useCallback((freq: number, duration = 0.15, volume = 0.12) => {
    if (typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      /* ignore */
    }
  }, []);

  const playCorrect = () => {
    playTone(660, 0.1, 0.15);
    setTimeout(() => playTone(880, 0.15, 0.15), 100);
  };
  const playWrong = () => playTone(220, 0.3, 0.15);
  const playStart = () => {
    playTone(523, 0.1, 0.13);
    setTimeout(() => playTone(659, 0.1, 0.13), 90);
    setTimeout(() => playTone(784, 0.18, 0.13), 180);
  };

  useEffect(() => {
    if (!started || !isRunning || revealed || finished) return;
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (next <= 5 && next > 0) playTone(next <= 3 ? 880 : 440, 0.1, 0.1);
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, isRunning, timeLeft, revealed, finished]);

  const startQuiz = () => {
    playStart();
    setStarted(true);
    setIsRunning(true);
  };

  const handleSelect = (optionIndex: number) => {
    if (revealed || finished || !started) return;
    const spent = secondsPerQuestion - timeLeft;
    const q = questions[currentIndex];

    // ✅ Ép kiểu an toàn — chấp nhận cả number và string
    const correctIdx = parseCorrectIndex(q);
    const isCorrect = correctIdx >= 0 && Number(optionIndex) === correctIdx;

    const timeBonus = isCorrect
      ? Math.round((timeLeft / secondsPerQuestion) * (MAX_POINTS - BASE_POINTS))
      : 0;
    const points = isCorrect ? BASE_POINTS + timeBonus : 0;

    setSelectedAnswer(optionIndex);
    setRevealed(true);
    setIsRunning(false);

    setAnswers((prev) => [
      ...prev,
      {
        index: currentIndex,
        selected: optionIndex,
        correctAnswer: correctIdx,
        isCorrect,
        timeSpent: spent,
        points,
      },
    ]);

    isCorrect ? playCorrect() : playWrong();
    setTimeout(() => goNext(), 1600);
  };

  const handleTimeout = () => {
    if (revealed || finished) return;
    const q = questions[currentIndex];
    const correctIdx = parseCorrectIndex(q);

    setSelectedAnswer(null);
    setRevealed(true);
    setIsRunning(false);
    playWrong();

    setAnswers((prev) => [
      ...prev,
      {
        index: currentIndex,
        selected: null,
        correctAnswer: correctIdx,
        isCorrect: false,
        timeSpent: secondsPerQuestion,
        points: 0,
      },
    ]);

    setTimeout(() => goNext(), 1600);
  };

  const goNext = () => {
    if (currentIndex + 1 >= total) {
      finishQuiz();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setRevealed(false);
    setTimeLeft(secondsPerQuestion);
    setIsRunning(true);
  };

  const finishQuiz = useCallback(async () => {
    setIsRunning(false);
    setFinished(true);

    if (onSubmit) {
      setSubmitting(true);
      const finalAnswers = [...answers];
      const payload: QuizSubmitPayload = {
        answers: finalAnswers.map((a) => a.selected),
        totalTimeSpent: finalAnswers.reduce((sum, a) => sum + a.timeSpent, 0),
      };
      const result = await onSubmit(payload);
      setQuizResult(result);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, onSubmit]);

  const restart = () => {
    setCurrentIndex(0);
    setTimeLeft(secondsPerQuestion);
    setIsRunning(false);
    setStarted(false);
    setSelectedAnswer(null);
    setRevealed(false);
    setAnswers([]);
    setQuizResult(null);
    setFinished(false);
    onReset?.();
  };

  if (total === 0) return null;

  const q = questions[currentIndex];
  const questionPinyin = useMemo(() => getQuestionPinyin(q), [q]);
  const progressPercent = (timeLeft / secondsPerQuestion) * 100;
  const progressColor =
    timeLeft > 10
      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
      : timeLeft > 5
        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
        : "bg-gradient-to-r from-rose-500 to-pink-500";
  const urgent = timeLeft <= 5 && !revealed && !finished && started;

  // ===== MÀN HÌNH START =====
  if (!started && !finished) {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 shadow-lg sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Sẵn sàng chưa?
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Bài kiểm tra <span className="text-indigo-600">{total}</span> câu
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Mỗi câu bạn có <strong className="text-indigo-700">{secondsPerQuestion} giây</strong>. Trả lời càng nhanh, điểm càng cao!
          </p>

          <div className="mt-6 grid w-full max-w-lg grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm backdrop-blur">
              <Target className="h-5 w-5 text-indigo-600" />
              <p className="mt-2 text-[11px] font-semibold uppercase text-slate-500">Số câu</p>
              <p className="text-lg font-black text-slate-900">{total}</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm backdrop-blur">
              <Clock className="h-5 w-5 text-amber-500" />
              <p className="mt-2 text-[11px] font-semibold uppercase text-slate-500">Mỗi câu</p>
              <p className="text-lg font-black text-slate-900">{secondsPerQuestion}s</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm backdrop-blur">
              <Zap className="h-5 w-5 text-rose-500" />
              <p className="mt-2 text-[11px] font-semibold uppercase text-slate-500">Tối đa</p>
              <p className="text-lg font-black text-slate-900">{total * MAX_POINTS}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={startQuiz}
            className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 px-7 py-3.5 text-base font-black text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0"
          >
            <Play className="h-5 w-5 transition-transform group-hover:scale-110" />
            Bắt đầu làm bài
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-4 text-xs text-slate-400">
            ⏱️ Đồng hồ sẽ bắt đầu đếm khi bạn nhấn nút
          </p>
        </div>
      </div>
    );
  }

  // ===== KẾT QUẢ =====
  if (finished) {
    const totalPoints = answers.reduce((sum, a) => sum + a.points, 0);
    const maxPoints = total * MAX_POINTS;
    const totalCorrect = answers.filter((a) => a.isCorrect).length;
    const percent = Math.round((totalCorrect / total) * 100);

    const grade =
      percent >= 90
        ? { label: "Xuất sắc!", color: "text-emerald-600", bg: "from-emerald-500 via-teal-500 to-cyan-400", icon: Trophy }
        : percent >= 70
          ? { label: "Rất tốt!", color: "text-indigo-600", bg: "from-indigo-500 via-blue-500 to-sky-400", icon: Star }
          : percent >= 50
            ? { label: "Khá ổn", color: "text-amber-600", bg: "from-amber-500 via-orange-500 to-yellow-400", icon: Flame }
            : { label: "Cần cố gắng thêm", color: "text-rose-600", bg: "from-rose-500 via-pink-500 to-fuchsia-400", icon: Zap };

    const GradeIcon = grade.icon;

    return (
      <div className="space-y-5">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${grade.bg} p-6 text-white shadow-2xl sm:p-8`}>
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-black/10 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wide backdrop-blur">
              <GradeIcon className="h-3.5 w-3.5" />
              {grade.label}
            </span>
            <p className="mt-5 text-7xl font-black drop-shadow-md sm:text-8xl">
              {percent}
              <span className="text-4xl font-bold opacity-80">%</span>
            </p>
            <p className="mt-3 text-sm text-white/95">
              Đúng <strong>{totalCorrect}/{total}</strong> câu · Tổng điểm{" "}
              <strong>{totalPoints}/{maxPoints}</strong>
            </p>
            {submitting && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Đang đồng bộ server...
              </p>
            )}
            {quizResult && !submitting && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">
                <CheckCircle2 className="h-3.5 w-3.5" /> Server chấm: {quizResult.score}/100
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((qq, idx) => {
            const ans = answers.find((a) => a.index === idx);
            const serverResult = quizResult?.results?.find((r) => r.index === idx);
            const correct = serverResult ? serverResult.isCorrect : (ans?.isCorrect ?? false);
            const qPinyin = getQuestionPinyin(qq);
            const correctIdx = parseCorrectIndex(qq);

            return (
              <div
                key={idx}
                className={`overflow-hidden rounded-2xl border-2 ${
                  correct
                    ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
                    : "border-rose-200 bg-gradient-to-br from-rose-50 to-white"
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      correct ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}
                  >
                    {correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      Câu {idx + 1}: {qq.question}
                    </p>
                    {qPinyin && <p className="mt-0.5 text-xs font-medium text-indigo-600">{qPinyin}</p>}

                    {ans?.selected != null && (
                      <p className="mt-2 text-xs">
                        <span className="font-semibold text-slate-500">Bạn chọn: </span>
                        <span className={correct ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                          {String.fromCharCode(65 + ans.selected)}. {qq.options?.[ans.selected]}
                        </span>
                      </p>
                    )}
                    {ans?.selected == null && (
                      <p className="mt-2 text-xs font-semibold text-rose-700">Hết giờ - chưa chọn đáp án</p>
                    )}
                    {!correct && correctIdx >= 0 && (
                      <p className="mt-1 text-xs">
                        <span className="font-semibold text-slate-500">Đáp án đúng: </span>
                        <span className="font-bold text-emerald-700">
                          {String.fromCharCode(65 + correctIdx)}. {qq.options?.[correctIdx]}
                        </span>
                      </p>
                    )}
                    {(serverResult?.explanation || qq.explanation) && (
                      <p className="mt-2 rounded-lg bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600">
                        <strong>Giải thích: </strong>
                        {serverResult?.explanation || qq.explanation}
                      </p>
                    )}
                    {ans?.isCorrect && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Zap className="h-3 w-3" /> +{ans.points} điểm · {ans.timeSpent}s
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={restart}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <RefreshCw className="h-4 w-4" /> Làm lại bài kiểm tra
        </button>
      </div>
    );
  }

  // ===== CÂU HỎI =====
  const liveCorrectIdx = parseCorrectIndex(q);

  return (
    <div className="space-y-4">
      <div
        className={`relative overflow-hidden rounded-2xl border-2 p-4 transition-all ${
          urgent
            ? "border-rose-300 bg-gradient-to-br from-rose-50 to-white shadow-lg shadow-rose-100"
            : "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
              Câu {currentIndex + 1}/{total}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Điểm tối đa {MAX_POINTS}/câu
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black tabular-nums ${
              urgent
                ? "animate-pulse bg-rose-500 text-white shadow-lg shadow-rose-200"
                : "bg-white text-indigo-700 ring-2 ring-indigo-200"
            }`}
          >
            <Clock className="h-4 w-4" />
            {timeLeft}s
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${progressColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold leading-6 text-slate-900 sm:text-lg">
              {q.question || ""}
            </p>
            {questionPinyin && (
              <p className="mt-1 text-sm font-medium tracking-wide text-indigo-600">
                {questionPinyin}
              </p>
            )}
          </div>
          {onSpeak && q.question && (
            <button
              type="button"
              onClick={() => onSpeak(q.question)}
              className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 transition hover:bg-indigo-100"
              title="Nghe câu hỏi"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {(q.options || []).map((opt, optIndex) => {
            const isSelected = selectedAnswer === optIndex;
            // ✅ Ép kiểu Number cho cả 2 vế
            const isCorrect = revealed && liveCorrectIdx >= 0 && Number(optIndex) === liveCorrectIdx;
            const isWrong = revealed && isSelected && liveCorrectIdx >= 0 && Number(optIndex) !== liveCorrectIdx;
            const letter = String.fromCharCode(65 + optIndex);
            const optPinyin = getOptionPinyin(opt);

            const base =
              "group flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-sm text-left transition-all duration-200";
            const state = revealed
              ? isCorrect
                ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white text-emerald-900 shadow-md shadow-emerald-100"
                : isWrong
                  ? "border-rose-400 bg-gradient-to-br from-rose-50 to-white text-rose-900 shadow-md shadow-rose-100"
                  : "border-slate-200 bg-white text-slate-400"
              : isSelected
                ? "border-indigo-400 bg-gradient-to-br from-indigo-50 to-white text-indigo-900 shadow-md shadow-indigo-100"
                : "border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/60 hover:shadow-md cursor-pointer";

            return (
              <div key={optIndex} className={`${base} ${state}`}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => handleSelect(optIndex)}
                  className="flex flex-1 items-center gap-2.5 text-left disabled:cursor-not-allowed"
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition ${
                      isCorrect
                        ? "bg-emerald-500 text-white"
                        : isWrong
                          ? "bg-rose-500 text-white"
                          : isSelected
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{opt}</span>
                    {optPinyin && (
                      <span className="mt-0.5 block text-xs font-medium text-indigo-500 opacity-90">
                        {optPinyin}
                      </span>
                    )}
                  </span>
                </button>
                {opt && onSpeak && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSpeak(opt);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-current opacity-50 transition hover:bg-white/70 hover:opacity-100"
                    title="Nghe đáp án"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {revealed && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                {revealed && isWrong && <XCircle className="h-5 w-5 shrink-0 text-rose-600" />}
              </div>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 text-sm">
            {(() => {
              const lastAnswer = answers[answers.length - 1];
              return (
                <>
                  {lastAnswer?.selected == null ? (
                    <p className="font-semibold text-rose-700">
                      ⏰ Hết giờ! Bạn chưa chọn đáp án.
                    </p>
                  ) : liveCorrectIdx < 0 ? (
                    <p className="font-semibold text-slate-700">
                      ℹ️ Đã ghi nhận đáp án. Server sẽ chấm điểm khi bạn hoàn thành.
                    </p>
                  ) : (
                    <p
                      className={`font-semibold ${
                        lastAnswer?.isCorrect ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {lastAnswer?.isCorrect
                        ? `🎉 Chính xác! +${lastAnswer.points} điểm (${lastAnswer.timeSpent}s)`
                        : `❌ Sai rồi! Đáp án đúng là ${String.fromCharCode(65 + liveCorrectIdx)}.`}
                    </p>
                  )}
                  {q.explanation && (
                    <p className="mt-1.5 leading-6 text-slate-600">{q.explanation}</p>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
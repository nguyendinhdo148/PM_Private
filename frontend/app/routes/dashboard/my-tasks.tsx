import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, List, Download, CalendarDays, CalendarRange,
  ChevronLeft, ChevronRight, Loader2, Send, Copy, Check,
} from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchData, postData, deleteData } from "@/lib/fetch-util";
import * as XLSX from "xlsx";
import {
  Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Area, AreaChart, Legend, ComposedChart, PieChart, Pie, Cell,
} from "recharts";

// ============================================================
// TYPES
// ============================================================

export interface MonthlyReport {
  _id: string;
  monthKey: string;
  title: string;
  totalGross: number;
  preTaxRevenue: number;
  guestCount: number;
  billCount: number;
  daysCount: number;
  foodRevenue?: number;
  drinkRevenue?: number;
  otherRevenue?: number;
  cash?: number;
  transfer?: number;
  card?: number;
  debt?: number;
  founderPoints?: number;
  totalExpense?: number;
}

export interface DailyRevenue {
  _id?: string;
  reportId: string;
  date: string;
  dayOfWeek: string;
  cash: number;
  transfer: number;
  card: number;
  debt: number;
  founderPoints: number;
  foodRevenue?: number;
  drinkRevenue?: number;
  otherRevenue?: number;
  preTaxRevenue: number;
  totalGross: number;
  guestCount: number;
  billCount: number;
  note?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================
// HELPERS
// ============================================================

const sanitizeSheetName = (name: string) =>
  name.replace(/[:\\/?*\[\]]/g, "_");

const formatDateForExcel = (dateString: string) => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const fmtCompact = (n: number) => {
  if (!n || isNaN(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + " tr";
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
};

// ============================================================
// AI ANSWER RENDERER
// ============================================================

interface Section {
  emoji?: string;
  title?: string;
  lines: string[];
}

interface ChartSpec {
  type: "bar" | "line" | "pie";
  title?: string;
  data: { name: string; value: number }[];
}

const SECTION_EMOJIS = "📊|👥|🧾|💰|💸|📌|💡|⚠️|🎯|📈|📉|🔥|✅|❌|💳|🚀|🔗";

/**
 * Parse câu trả lời AI thành intro + sections.
 * QUAN TRỌNG: tự chèn \n\n trước emoji nếu emoji đang nằm giữa dòng,
 * để parser luôn tách đúng section ngay cả khi AI viết dính.
 */
function parseAiAnswer(text: string): { intro: string[]; sections: Section[] } {
  if (!text) return { intro: [], sections: [] };

  // BƯỚC 1: Chèn \n\n trước mọi emoji section nằm giữa dòng
  const normalized = text.replace(
    new RegExp(`([^\\n])\\s*(${SECTION_EMOJIS})`, "g"),
    (_m, before, emoji) => `${before}\n\n${emoji}`
  );

  // BƯỚC 2: Parse theo dòng
  const lines = normalized.split("\n").map((l) => l.trimEnd());
  const intro: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  const emojiLineRegex = new RegExp(`^(${SECTION_EMOJIS})\\s*(.*)$`);

  for (const line of lines) {
    const emojiMatch = line.match(emojiLineRegex);
    if (emojiMatch) {
      if (current) sections.push(current);
      current = { emoji: emojiMatch[1], title: emojiMatch[2].trim(), lines: [] };
      continue;
    }
    if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) sections.push(current);

  return {
    intro: intro.filter((l) => l.trim()),
    sections,
  };
}

/**
 * Extract [CHART:type]{json}[/CHART] blocks khỏi text.
 */
function extractChartBlocks(text: string): { cleanText: string; charts: ChartSpec[] } {
  const charts: ChartSpec[] = [];
  const chartRegex = /\[CHART:(\w+)\]\s*(\{[\s\S]*?\})\s*\[\/CHART\]/g;

  const cleanText = text.replace(chartRegex, (_, type, jsonStr) => {
    try {
      const spec = JSON.parse(jsonStr);
      charts.push({ type: type as ChartSpec["type"], ...spec });
    } catch (e) {
      console.warn("Invalid chart spec:", jsonStr);
    }
    return "";
  });

  return { cleanText, charts };
}

/**
 * Format inline: bỏ markdown, format số, xử lý link.
 * Khi không có link → trả STRING thuần (tránh dấu câu bị tách node).
 */
function formatInline(text: string): React.ReactNode {
  let cleaned = text.replace(/\*\*(.+?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1");
  cleaned = cleaned.replace(/\b(\d{6,})\b/g, (m) => Number(m).toLocaleString("vi-VN"));

  if (!/https?:\/\//.test(cleaned)) return cleaned;

  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = cleaned.split(urlRegex);
  const testRegex = /^https?:\/\//;

  return parts.map((part, i) => {
    if (testRegex.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium break-all"
        >
          {part.replace(/^https?:\/\//, "")}
        </a>
      );
    }
    return part;
  });
}

function ChartBlock({ spec }: { spec: ChartSpec }) {
  const colors = ["#0f172a", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

  if (!spec.data || spec.data.length === 0) return null;

  if (spec.type === "pie") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 my-3">
        {spec.title && (
          <p className="text-xs font-semibold text-slate-600 mb-2">{spec.title}</p>
        )}
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={spec.data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {spec.data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => Number(v).toLocaleString("vi-VN") + " đ"} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (spec.type === "line") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 my-3">
        {spec.title && (
          <p className="text-xs font-semibold text-slate-600 mb-2">{spec.title}</p>
        )}
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spec.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => Number(v).toLocaleString("vi-VN") + " đ"} />
              <Area type="monotone" dataKey="value" stroke="#0f172a" fill="#0f172a" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // default bar
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 my-3">
      {spec.title && (
        <p className="text-xs font-semibold text-slate-600 mb-2">{spec.title}</p>
      )}
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={spec.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: any) => Number(v).toLocaleString("vi-VN") + " đ"} />
            <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AiAnswerRenderer({ text }: { text: string }) {
  const { cleanText, charts } = extractChartBlocks(text);
  const { intro, sections } = parseAiAnswer(cleanText);

  return (
    <div className="space-y-4 text-sm">
      {/* INTRO — kết luận ngắn, không nền */}
      {intro.length > 0 && (
        <p className="text-[15px] text-slate-800 leading-relaxed">
          {formatInline(intro.join(" "))}
        </p>
      )}

      {/* SECTIONS — mỗi section có nền riêng, tách biệt rõ */}
      {sections.map((sec, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden"
        >
          {/* Section header */}
          {sec.title && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200">
              <span className="text-base leading-none">{sec.emoji}</span>
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                {formatInline(sec.title)}
              </span>
            </div>
          )}

          {/* Section body */}
          <div className="px-4 py-3 space-y-1.5">
            {sec.lines
              .filter((l) => l.trim())
              .map((line, j) => {
                const trimmed = line.trim();
                const isBullet = /^[•\-*]\s/.test(trimmed);
                const isArrow = trimmed.startsWith("→");
                const isNumbered = /^\d+\.\s/.test(trimmed);

                const clean = trimmed
                  .replace(/^[•\-*]\s/, "")
                  .replace(/^→\s*/, "")
                  .replace(/^\d+\.\s/, "")
                  .trim();

                if (isArrow) {
                  return (
                    <div key={j} className="flex items-start gap-2 pt-1">
                      <span className="text-slate-400 text-sm mt-0.5 flex-shrink-0">→</span>
                      <span className="text-sm text-slate-800 leading-relaxed font-medium">
                        {formatInline(clean)}
                      </span>
                    </div>
                  );
                }

                if (isNumbered) {
                  const num = trimmed.match(/^(\d+)\./)?.[1];
                  return (
                    <div key={j} className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-slate-500 mt-0.5 w-4 flex-shrink-0 tabular-nums">
                        {num}.
                      </span>
                      <span className="text-sm text-slate-700 leading-relaxed">
                        {formatInline(clean)}
                      </span>
                    </div>
                  );
                }

                if (isBullet) {
                  return (
                    <div key={j} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span className="text-sm text-slate-700 leading-relaxed tabular-nums">
                        {formatInline(clean)}
                      </span>
                    </div>
                  );
                }

                return (
                  <p key={j} className="text-sm text-slate-700 leading-relaxed">
                    {formatInline(line)}
                  </p>
                );
              })}
          </div>
        </div>
      ))}

      {/* Charts */}
      {charts.map((spec, i) => (
        <ChartBlock key={i} spec={spec} />
      ))}
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================

const MyTasks = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [enrichedReports, setEnrichedReports] = useState<MonthlyReport[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [chartIndex, setChartIndex] = useState(0);
  const chartPageSize = 12;

  const [newMonth, setNewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set(reports.map((r) => r.monthKey.split("-")[0]));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [reports]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = (await fetchData("/monthly-reports")) as ApiResponse<MonthlyReport[]>;
      if (res.success) {
        setReports(res.data);
        await enrichReportsWithExpenses(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tháng:", error);
    }
  };

  const enrichReportsWithExpenses = async (list: MonthlyReport[]) => {
    setLoadingExpenses(true);
    try {
      const results = await Promise.all(
        list.map(async (report) => {
          try {
            const [expRes, dailyRes] = await Promise.all([
              fetchData(`/monthly-reports/${report._id}`) as Promise<ApiResponse<any>>,
              fetchData(`/daily-revenues?reportId=${report._id}`) as Promise<ApiResponse<DailyRevenue[]>>,
            ]);

            const m = expRes.success ? expRes.data : {};
            const expensePerDay =
              (Number(m.rent) || 0) +
              (Number(m.electricity) || 0) +
              (Number(m.water) || 0) +
              (Number(m.internet) || 0) +
              (Number(m.telephone) || 0) +
              (Number(m.garbage) || 0) +
              (Number(m.employeeSalary) || 0) +
              (Number(m.otherExpense) || 0);

            let cash = 0, transfer = 0, card = 0, debt = 0, founderPoints = 0;
            let foodRevenue = 0, drinkRevenue = 0, otherRevenue = 0;

            if (dailyRes.success && Array.isArray(dailyRes.data)) {
              dailyRes.data.forEach((d) => {
                cash += Number(d.cash) || 0;
                transfer += Number(d.transfer) || 0;
                card += Number(d.card) || 0;
                debt += Number(d.debt) || 0;
                founderPoints += Number(d.founderPoints) || 0;
                foodRevenue += Number(d.foodRevenue) || 0;
                drinkRevenue += Number(d.drinkRevenue) || 0;
                otherRevenue += Number(d.otherRevenue) || 0;
              });
            }

            return {
              ...report,
              cash,
              transfer,
              card,
              debt,
              founderPoints,
              foodRevenue,
              drinkRevenue,
              otherRevenue,
              totalExpense: expensePerDay * (report.daysCount || 0),
            };
          } catch (e) {
            console.error(`Lỗi enrich tháng ${report.title}:`, e);
            return { ...report, totalExpense: 0 };
          }
        })
      );
      setEnrichedReports(results);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val) return "0";
    return new Intl.NumberFormat("vi-VN").format(val);
  };

  const handleCreateMonth = async () => {
    if (!newMonth) return alert("Vui lòng chọn tháng!");
    const parts = newMonth.split("-");
    const title = `Tháng ${parts[1]}/${parts[0]}`;

    const res = (await postData("/monthly-reports", { monthKey: newMonth, title })) as ApiResponse<MonthlyReport>;
    if (res.success) {
      loadReports();
      navigate(`/daily-report/${res.data._id}`);
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("CẢNH BÁO: Xoá tháng này sẽ XOÁ SẠCH TOÀN BỘ dữ liệu báo cáo từng ngày bên trong. Bạn chắc chắn chứ?")) return;
    const res = (await deleteData(`/monthly-reports/${id}`)) as ApiResponse<any>;
    if (res.success) loadReports();
    else alert(res.message);
  };

  // ============================================================
  // FILTER + DERIVED
  // ============================================================
  const sortedReports = useMemo(
    () => [...enrichedReports].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    [enrichedReports]
  );

  const getFilteredReports = (list: MonthlyReport[]) => {
    return list.filter((r) => {
      const year = r.monthKey.split("-")[0];
      const month = Number(r.monthKey.split("-")[1]);
      if (filterYear !== "all" && year !== filterYear) return false;
      if (filterQuarter !== "all") {
        if (filterQuarter === "Q1" && (month < 1 || month > 3)) return false;
        if (filterQuarter === "Q2" && (month < 4 || month > 6)) return false;
        if (filterQuarter === "Q3" && (month < 7 || month > 9)) return false;
        if (filterQuarter === "Q4" && (month < 10 || month > 12)) return false;
      }
      if (filterMonth !== "all" && r.monthKey !== filterMonth) return false;
      return true;
    });
  };

  const filteredData = useMemo(
    () => getFilteredReports(sortedReports),
    [enrichedReports, filterYear, filterQuarter, filterMonth]
  );

  const latestMonth = filteredData[0] || null;
  const olderMonths = filteredData.slice(1);

  const totalOfFilteredData = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => {
        acc.totalGross += r.totalGross;
        acc.preTaxRevenue += r.preTaxRevenue;
        acc.guestCount += r.guestCount;
        acc.billCount += r.billCount;
        acc.daysCount += r.daysCount;
        acc.foodRevenue += r.foodRevenue || 0;
        acc.drinkRevenue += r.drinkRevenue || 0;
        acc.otherRevenue += r.otherRevenue || 0;
        acc.cash += r.cash || 0;
        acc.transfer += r.transfer || 0;
        acc.card += r.card || 0;
        acc.debt += r.debt || 0;
        acc.founderPoints += r.founderPoints || 0;
        acc.totalExpense += r.totalExpense || 0;
        return acc;
      },
      {
        totalGross: 0, preTaxRevenue: 0, guestCount: 0, billCount: 0, daysCount: 0,
        foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
        cash: 0, transfer: 0, card: 0, debt: 0, founderPoints: 0,
        totalExpense: 0,
      }
    );
  }, [filteredData]);

  const profitAfterFixed = totalOfFilteredData.preTaxRevenue - totalOfFilteredData.totalExpense;
  const profitMargin =
    totalOfFilteredData.preTaxRevenue > 0
      ? (profitAfterFixed / totalOfFilteredData.preTaxRevenue) * 100
      : 0;

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const revenues = filteredData.map((r) => r.totalGross);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    const sorted = [...filteredData].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const growthRates: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].totalGross > 0) {
        growthRates.push(((sorted[i].totalGross - sorted[i - 1].totalGross) / sorted[i - 1].totalGross) * 100);
      }
    }
    const avgGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;
    return { avgRevenue, maxRevenue, minRevenue, avgGrowth, totalMonths: filteredData.length };
  }, [filteredData]);

  // ============================================================
  // CHART DATA
  // ============================================================
  const allChartData = useMemo(() => {
    return [...filteredData].reverse().map((r) => ({
      name: r.monthKey.split("-")[1] + "/" + r.monthKey.split("-")[0],
      total: r.totalGross,
      guest: r.guestCount,
      bill: r.billCount,
      monthKey: r.monthKey,
    }));
  }, [filteredData]);

  const chartData = useMemo(() => {
    const start = chartIndex * chartPageSize;
    return allChartData.slice(start, start + chartPageSize);
  }, [allChartData, chartIndex]);

  const totalPages = Math.ceil(allChartData.length / chartPageSize);

  useEffect(() => {
    setChartIndex(0);
  }, [filterYear, filterQuarter, filterMonth]);

  // ============================================================
  // CƠ CẤU + PAYMENT — THÁNG MỚI NHẤT
  // ============================================================
  const mixSource: any = latestMonth || totalOfFilteredData;

  const revenueMix = useMemo(
    () => [
      { name: "Món ăn", value: Number(mixSource.foodRevenue) || 0, color: "#0f172a" },
      { name: "Đồ uống", value: Number(mixSource.drinkRevenue) || 0, color: "#3b82f6" },
      { name: "Khác", value: Number(mixSource.otherRevenue) || 0, color: "#8b5cf6" },
    ],
    [mixSource]
  );
  const revenueMixTotal =
    (Number(mixSource.foodRevenue) || 0) +
    (Number(mixSource.drinkRevenue) || 0) +
    (Number(mixSource.otherRevenue) || 0);

  const paymentMix = useMemo(
    () => [
      { name: "Tiền mặt", value: Number(mixSource.cash) || 0, color: "#10b981" },
      { name: "Chuyển khoản", value: Number(mixSource.transfer) || 0, color: "#3b82f6" },
      { name: "Cà thẻ", value: Number(mixSource.card) || 0, color: "#0f172a" },
      { name: "Công nợ", value: Number(mixSource.debt) || 0, color: "#f59e0b" },
      { name: "Điểm Founder", value: Number(mixSource.founderPoints) || 0, color: "#8b5cf6" },
    ],
    [mixSource]
  );
  const paymentTotal = paymentMix.reduce((s, p) => s + p.value, 0);

  const insights = useMemo(() => {
    const list: { level: "red" | "yellow" | "green"; text: string }[] = [];
    if (!stats || filteredData.length === 0) return list;

    const sortedAsc = [...filteredData].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const latest = sortedAsc[sortedAsc.length - 1];
    const prev = sortedAsc[sortedAsc.length - 2];

    if (prev && prev.totalGross > 0) {
      const delta = ((latest.totalGross - prev.totalGross) / prev.totalGross) * 100;
      if (delta <= -3) list.push({ level: "red", text: `${latest.title} giảm ${Math.abs(delta).toFixed(1)}% so với ${prev.title}` });
      else if (delta >= 3) list.push({ level: "green", text: `${latest.title} tăng ${delta.toFixed(1)}% so với ${prev.title}` });
    }

    if (profitAfterFixed < 0) {
      list.push({ level: "red", text: `Tổng kết quả sau định phí ÂM: ${formatCurrency(profitAfterFixed)} đ` });
    } else if (profitMargin < 10) {
      list.push({ level: "yellow", text: `Biên lợi nhuận mỏng: ${profitMargin.toFixed(1)}%` });
    } else {
      list.push({ level: "green", text: `Biên lợi nhuận: ${profitMargin.toFixed(1)}%` });
    }

    if (totalOfFilteredData.debt > 0) {
      const debtRatio = totalOfFilteredData.totalGross > 0
        ? (totalOfFilteredData.debt / totalOfFilteredData.totalGross) * 100
        : 0;
      list.push({
        level: debtRatio > 5 ? "yellow" : "green",
        text: `Công nợ ${formatCurrency(totalOfFilteredData.debt)} đ (${debtRatio.toFixed(1)}% DT)`,
      });
    }

    if (stats.maxRevenue && stats.minRevenue && stats.maxRevenue > 0) {
      const spread = ((stats.maxRevenue - stats.minRevenue) / stats.maxRevenue) * 100;
      list.push({
        level: spread > 50 ? "yellow" : "green",
        text: `Chênh lệch tháng cao/thấp: ${spread.toFixed(1)}%`,
      });
    }

    return list;
  }, [stats, filteredData, profitAfterFixed, profitMargin, totalOfFilteredData]);

  // ============================================================
  // EXPORT EXCEL
  // ============================================================
  const handleExportExcel = async () => {
    if (filteredData.length === 0) return alert("Không có dữ liệu trong khoảng thời gian này!");

    const workbook = XLSX.utils.book_new();

    const aoaSummary: any[][] = [
      ["BÁO CÁO TỔNG HỢP DOANH THU"],
      [`Kỳ: ${filterMonth !== "all" ? "Tháng " + filterMonth.split("-")[1] + "/" + filterMonth.split("-")[0] : (filterQuarter !== "all" ? filterQuarter + " - " + filterYear : "Tất cả các tháng")}`],
      [],
    ];
    aoaSummary.push(["STT", "Kỳ Báo Cáo", "DT trước PPV/VAT", "Tổng DT (VAT)", "Số khách", "DT / Khách", "Số bill", "Đã ghi nhận"]);

    filteredData.forEach((r, idx) => {
      aoaSummary.push([
        idx + 1,
        r.title,
        r.preTaxRevenue,
        r.totalGross,
        r.guestCount,
        r.guestCount > 0 ? Math.round(r.totalGross / r.guestCount) : 0,
        r.billCount,
        r.daysCount + " ngày",
      ]);
    });

    aoaSummary.push([]);
    aoaSummary.push([
      "", "TỔNG CỘNG",
      totalOfFilteredData.preTaxRevenue,
      totalOfFilteredData.totalGross,
      totalOfFilteredData.guestCount,
      totalOfFilteredData.guestCount > 0 ? Math.round(totalOfFilteredData.totalGross / totalOfFilteredData.guestCount) : 0,
      totalOfFilteredData.billCount,
      totalOfFilteredData.daysCount + " ngày",
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(aoaSummary);
    wsSummary["!cols"] = [
      { wch: 6 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, wsSummary, "Tổng hợp");

    const detailRequests = filteredData.map(async (report) => {
      try {
        const detailRes = await fetchData(`/daily-revenues?reportId=${report._id}`) as ApiResponse<DailyRevenue[]>;
        return { report, dailyData: detailRes.success ? detailRes.data : [] };
      } catch {
        return { report, dailyData: [] };
      }
    });

    const detailResults = await Promise.all(detailRequests);

    detailResults.forEach(({ report, dailyData }) => {
      const aoaDetail: any[][] = [[`BÁO CÁO DOANH THU ${report.title.toUpperCase()}`], []];
      aoaDetail.push([
        "Ngày", "Thứ", "Tiền mặt", "Chuyển khoản", "Cà thẻ", "Công nợ", "Điểm Founder",
        "DT trước PPV & VAT", "Tổng DT (VAT)", "Số khách", "DT / Khách", "Số bill", "Ghi Chú",
      ]);

      const sortedDetail = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

      let tCash = 0, tTransfer = 0, tCard = 0, tDebt = 0, tFounder = 0;
      let tPreTax = 0, tGross = 0, tGuest = 0, tBill = 0;
      let currentWeek = 0;

      sortedDetail.forEach((row) => {
        const g = Number(row.cash || 0) + Number(row.transfer || 0) + Number(row.card || 0) + Number(row.debt || 0) + Number(row.founderPoints || 0);
        const avg = row.guestCount > 0 ? Math.round(g / row.guestCount) : 0;
        const day = Number(row.date.split("-")[2]);
        const week = Math.ceil(day / 7);
        if (week !== currentWeek) {
          currentWeek = week;
          aoaDetail.push([`TUẦN ${currentWeek}`]);
        }

        aoaDetail.push([
          formatDateForExcel(row.date), row.dayOfWeek,
          row.cash || 0, row.transfer || 0, row.card || 0, row.debt || 0, row.founderPoints || 0,
          row.preTaxRevenue || 0, g, row.guestCount || 0, avg, row.billCount || 0, row.note || "",
        ]);

        tCash += row.cash || 0; tTransfer += row.transfer || 0;
        tCard += row.card || 0; tDebt += row.debt || 0;
        tFounder += row.founderPoints || 0; tPreTax += row.preTaxRevenue || 0;
        tGross += g; tGuest += row.guestCount || 0; tBill += row.billCount || 0;
      });

      aoaDetail.push([
        "TỔNG CỘNG", "", tCash, tTransfer, tCard, tDebt, tFounder,
        tPreTax, tGross, tGuest,
        tGuest > 0 ? Math.round(tGross / tGuest) : 0, tBill, "",
      ]);

      const wsDetail = XLSX.utils.aoa_to_sheet(aoaDetail);
      const sheetName = sanitizeSheetName(report.title.replace(/ /g, "_"));
      XLSX.utils.book_append_sheet(workbook, wsDetail, sheetName);
    });

    let fileName = `Bao_Cao_Tong_Hop`;
    if (filterYear !== "all") fileName += `_${filterYear}`;
    if (filterQuarter !== "all") fileName += `_${filterQuarter}`;
    if (filterMonth !== "all") fileName += `_Thang_${filterMonth.split("-")[1]}`;

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // ============================================================
  // AI HANDLER
  // ============================================================
  const handleAskAI = async (question?: string) => {
    const q = (question ?? aiPrompt).trim();
    if (!q) return;
    setAiPrompt(q);
    setAiLoading(true);
    setAiAnswer("");
    setAiCopied(false);

    const allMonthsForAI = [...enrichedReports]
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((r) => {
        const expense = r.totalExpense || 0;
        const profit = (r.preTaxRevenue || 0) - expense;
        const margin = r.preTaxRevenue > 0 ? (profit / r.preTaxRevenue) * 100 : 0;
        return {
          monthKey: r.monthKey,
          title: r.title,
          daysCount: r.daysCount,
          totalGross: r.totalGross,
          preTax: r.preTaxRevenue,
          guest: r.guestCount,
          bill: r.billCount,
          billPerGuest: r.guestCount > 0 ? +(r.billCount / r.guestCount).toFixed(2) : 0,
          avgPerGuest: r.guestCount > 0 ? Math.round(r.totalGross / r.guestCount) : 0,
          avgPerBill: r.billCount > 0 ? Math.round(r.totalGross / r.billCount) : 0,
          food: r.foodRevenue || 0,
          drink: r.drinkRevenue || 0,
          other: r.otherRevenue || 0,
          cash: r.cash || 0,
          transfer: r.transfer || 0,
          card: r.card || 0,
          debt: r.debt || 0,
          founder: r.founderPoints || 0,
          totalExpense: expense,
          profitAfterFixed: profit,
          profitMargin: +margin.toFixed(1),
        };
      });

    const context = {
      scope: filterMonth !== "all"
        ? `Đang xem: Tháng ${filterMonth.split("-")[1]}/${filterMonth.split("-")[0]}`
        : filterQuarter !== "all"
          ? `Đang xem: ${filterQuarter}/${filterYear}`
          : filterYear !== "all"
            ? `Đang xem: Năm ${filterYear}`
            : "Đang xem: Tất cả các tháng",
      filter: { year: filterYear, quarter: filterQuarter, month: filterMonth },

      totals: {
        monthsCount: filteredData.length,
        daysCount: totalOfFilteredData.daysCount,
        totalGross: totalOfFilteredData.totalGross,
        preTax: totalOfFilteredData.preTaxRevenue,
        guest: totalOfFilteredData.guestCount,
        bill: totalOfFilteredData.billCount,
        avgPerGuest: totalOfFilteredData.guestCount > 0
          ? Math.round(totalOfFilteredData.totalGross / totalOfFilteredData.guestCount) : 0,
        avgPerBill: totalOfFilteredData.billCount > 0
          ? Math.round(totalOfFilteredData.totalGross / totalOfFilteredData.billCount) : 0,
        food: totalOfFilteredData.foodRevenue,
        drink: totalOfFilteredData.drinkRevenue,
        other: totalOfFilteredData.otherRevenue,
        cash: totalOfFilteredData.cash,
        transfer: totalOfFilteredData.transfer,
        card: totalOfFilteredData.card,
        debt: totalOfFilteredData.debt,
        founder: totalOfFilteredData.founderPoints,
        totalExpense: totalOfFilteredData.totalExpense,
        profitAfterFixed,
        profitMargin: +profitMargin.toFixed(1),
      },

      allMonths: allMonthsForAI,
      allMonthsCount: allMonthsForAI.length,
    };

    try {
      const res = await postData<ApiResponse<{ answer: string }>>("/ai/analyst", { question: q, context });
      if (res.success) setAiAnswer(res.data.answer);
      else setAiAnswer("❌ " + (res.message || "Lỗi gọi AI"));
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Không kết nối được tới AI.";
      setAiAnswer("❌ " + msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyAi = async () => {
    if (!aiAnswer) return;
    try {
      await navigator.clipboard.writeText(aiAnswer);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    } catch {}
  };

  const quickQuestions = [
    "Doanh thu các tháng gần đây thế nào?",
    "Tháng nào cao nhất, tháng nào thấp nhất?",
    "Xu hướng 6 tháng qua ra sao?",
    "So sánh quý này với quý trước.",
    "Cơ cấu doanh thu thay đổi thế nào?",
    "Chi phí có hợp lý không?",
    "Tỷ lệ khách/bill có ổn không?",
    "Phương thức thanh toán nào phổ biến nhất?",
    "Khách hàng mua nhiều vào ngày nào?",
    "Công nợ hiện tại bao nhiêu?",
    "Đề xuất cải thiện doanh thu.",
    "Maxim Saigon có website gì?",
    "Cần kiểm tra gì để tăng lợi nhuận?",
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Tổng quan báo cáo</h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            Phân tích hiệu quả kinh doanh đa tháng
            {loadingExpenses && (
              <span className="text-slate-400 flex items-center gap-1 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang tải chi phí
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="month"
              value={newMonth}
              onChange={(e) => setNewMonth(e.target.value)}
              className="w-44 pl-10 bg-slate-50 border-slate-200"
            />
          </div>
          <Button onClick={handleCreateMonth} className="gap-2 bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Tạo tháng
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-slate-700" />
          <span className="font-medium text-slate-700 text-sm">Lọc dữ liệu</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setFilterMonth("all"); setFilterQuarter("all"); }}
          >
            <option value="all">Tất cả các năm</option>
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={filterQuarter}
            onChange={(e) => { setFilterQuarter(e.target.value); setFilterMonth("all"); }}
          >
            <option value="all">Tất cả các quý</option>
            <option value="Q1">Quý 1 (T1-3)</option>
            <option value="Q2">Quý 2 (T4-6)</option>
            <option value="Q3">Quý 3 (T7-9)</option>
            <option value="Q4">Quý 4 (T10-12)</option>
          </select>

          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Tất cả các tháng</option>
            {[...new Set(filteredData.map((r) => r.monthKey))]
              .sort((a, b) => b.localeCompare(a))
              .map((m) => {
                const p = m.split("-");
                return <option key={m} value={m}>{`Tháng ${p[1]}/${p[0]}`}</option>;
              })}
          </select>

          <Button onClick={handleExportExcel} className="gap-2 ml-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4" /> Xuất Excel
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-0 shadow-sm bg-slate-900 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tổng doanh thu</p>
            <p className="text-2xl font-bold mt-2">{fmtCompact(totalOfFilteredData.totalGross)}</p>
            <p className="text-xs text-slate-400 mt-1">{formatCurrency(totalOfFilteredData.totalGross)} đ</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-sky-600 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-sky-100 uppercase tracking-wide">DT trước thuế</p>
            <p className="text-2xl font-bold mt-2">{fmtCompact(totalOfFilteredData.preTaxRevenue)}</p>
            <p className="text-xs text-sky-100 mt-1">{formatCurrency(totalOfFilteredData.preTaxRevenue)} đ</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-blue-600 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">Tổng khách</p>
            <p className="text-2xl font-bold mt-2">{totalOfFilteredData.guestCount}</p>
            <p className="text-xs text-blue-100 mt-1">
              {totalOfFilteredData.guestCount > 0
                ? formatCurrency(totalOfFilteredData.totalGross / totalOfFilteredData.guestCount) + " đ/khách"
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-emerald-600 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-100 uppercase tracking-wide">Tổng bill</p>
            <p className="text-2xl font-bold mt-2">{totalOfFilteredData.billCount}</p>
            <p className="text-xs text-emerald-100 mt-1">
              {totalOfFilteredData.billCount > 0
                ? (totalOfFilteredData.guestCount / totalOfFilteredData.billCount).toFixed(2) + " khách/bill"
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-amber-600 text-white">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-amber-100 uppercase tracking-wide">Định phí</p>
            <p className="text-2xl font-bold mt-2">{fmtCompact(totalOfFilteredData.totalExpense)}</p>
            <p className="text-xs text-amber-100 mt-1">{totalOfFilteredData.daysCount} ngày</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-sm text-white ${profitAfterFixed >= 0 ? "bg-emerald-700" : "bg-rose-600"}`}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide opacity-90">Kết quả sau ĐP</p>
            <p className="text-2xl font-bold mt-2">{fmtCompact(profitAfterFixed)}</p>
            <p className="text-xs opacity-90 mt-1">Biên {profitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* STATS PHỤ */}
      {stats && (
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Tăng trưởng TB</p>
              <p className={`text-xl font-bold mt-1 ${stats.avgGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {stats.avgGrowth >= 0 ? "+" : ""}{stats.avgGrowth.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Doanh thu TB tháng</p>
              <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(Math.round(stats.avgRevenue))}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Tháng cao nhất</p>
              <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(stats.maxRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Tháng thấp nhất</p>
              <p className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(stats.minRevenue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* THÁNG MỚI NHẤT */}
      {latestMonth && (() => {
        const profit = (latestMonth.preTaxRevenue || 0) - (latestMonth.totalExpense || 0);
        const margin = latestMonth.preTaxRevenue > 0 ? (profit / latestMonth.preTaxRevenue) * 100 : 0;
        return (
          <Card className="border-l-4 border-l-violet-500 border-y border-r border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-semibold text-slate-900">
                      {latestMonth.title}
                    </CardTitle>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-violet-100 text-violet-700 uppercase tracking-wide">
                      Mới nhất
                    </span>
                  </div>
                  <CardDescription className="mt-1">
                    Báo cáo gần nhất · {latestMonth.daysCount} ngày đã ghi nhận
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate(`/daily-report/${latestMonth._id}`)}
                  className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <List className="w-4 h-4" /> Xem chi tiết
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Doanh thu (VAT)</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">{fmtCompact(latestMonth.totalGross)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatCurrency(latestMonth.totalGross)} đ</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">DT trước thuế</p>
                  <p className="text-lg font-semibold text-sky-700 mt-1">{fmtCompact(latestMonth.preTaxRevenue)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatCurrency(latestMonth.preTaxRevenue)} đ</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Định phí</p>
                  <p className="text-lg font-semibold text-amber-600 mt-1">{fmtCompact(latestMonth.totalExpense || 0)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatCurrency(latestMonth.totalExpense || 0)} đ</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Kết quả sau ĐP</p>
                  <p className={`text-lg font-semibold mt-1 ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {fmtCompact(profit)}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    Biên {margin.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Khách</p>
                  <p className="text-lg font-semibold text-blue-600 mt-1">{latestMonth.guestCount}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {latestMonth.guestCount > 0
                      ? formatCurrency(latestMonth.totalGross / latestMonth.guestCount) + " đ/khách"
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Bill</p>
                  <p className="text-lg font-semibold text-emerald-600 mt-1">{latestMonth.billCount}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {latestMonth.billCount > 0
                      ? (latestMonth.guestCount / latestMonth.billCount).toFixed(2) + " khách/bill"
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* CƠ CẤU + PAYMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800">Cơ cấu doanh thu</CardTitle>
            <CardDescription>
              {latestMonth
                ? `${latestMonth.title} · Món ăn / Đồ uống / Khác`
                : "Món ăn / Đồ uống / Khác"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-[220px]">
                {revenueMixTotal > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {revenueMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatCurrency(v) + " đ"} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">Chưa có dữ liệu</div>
                )}
              </div>
              <div className="space-y-3">
                {revenueMix.map((r) => {
                  const pct = revenueMixTotal > 0 ? (r.value / revenueMixTotal) * 100 : 0;
                  return (
                    <div key={r.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-2 text-slate-700">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />
                          {r.name}
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="text-xs text-slate-500 tabular-nums">{formatCurrency(r.value)} đ</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800">Phương thức thanh toán</CardTitle>
            <CardDescription>
              {latestMonth ? `${latestMonth.title} · Cơ cấu theo giá trị` : "Cơ cấu theo giá trị giao dịch"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMix.map((p) => {
                const pct = paymentTotal > 0 ? (p.value / paymentTotal) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                        {p.name}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1 tabular-nums">{formatCurrency(p.value)} đ</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHART DOANH THU */}
      {allChartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-800">Doanh thu theo tháng</CardTitle>
                <CardDescription>Biến động tổng doanh thu qua các tháng</CardDescription>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setChartIndex(chartIndex - 1)} disabled={chartIndex === 0} className="h-8 w-8 border-slate-300">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-500 tabular-nums">{chartIndex + 1} / {totalPages}</span>
                  <Button variant="outline" size="icon" onClick={() => setChartIndex(chartIndex + 1)} disabled={chartIndex >= totalPages - 1} className="h-8 w-8 border-slate-300">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value) + " đ", "Doanh thu"]} contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="total" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CHART KHÁCH & BILL */}
      {allChartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800">Xu hướng khách & bill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend />
                  <Area type="monotone" dataKey="guest" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Số khách" />
                  <Area type="monotone" dataKey="bill" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} name="Số bill" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">Điểm cần quan tâm</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map((ins, i) => {
              const cfg = ins.level === "red"
                ? { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" }
                : ins.level === "yellow"
                  ? { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" }
                  : { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" };
              return (
                <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${cfg.bg} ${cfg.text} text-sm`}>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                  <span>{ins.text}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ============ AI ANALYST — CHAT UI ============ */}
      <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">Maxim AI Analyst</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trợ lý phân tích kinh doanh · Trả lời dựa trên số liệu thực
              </p>
            </div>
            <a
              href="https://maximsaigon.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              maximsaigon.vn
            </a>
          </div>
        </div>

        <div className="bg-slate-50/50">
          {!aiAnswer && !aiLoading && (
            <div className="px-6 py-8">
              <p className="text-sm text-slate-600 mb-4">
                Chọn một câu hỏi gợi ý bên dưới hoặc tự đặt câu hỏi:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAskAI(q)}
                    className="text-left text-sm px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(aiAnswer || aiLoading) && (
            <div className="px-6 py-5 space-y-5 max-h-[700px] overflow-y-auto">
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-slate-900 text-white px-4 py-2.5 text-sm">
                  {aiPrompt}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Maxim AI</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-400">
                      {aiLoading ? "đang phân tích" : "đã trả lời"}
                    </span>
                  </div>

                  {aiLoading && (
                    <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-1/3 animate-pulse" />
                      <div className="h-3 bg-slate-200 rounded w-full animate-pulse" />
                      <div className="h-3 bg-slate-200 rounded w-5/6 animate-pulse" />
                      <p className="text-xs text-slate-500 pt-1 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Đang tra cứu dữ liệu và phân tích…
                      </p>
                    </div>
                  )}

                  {!aiLoading && aiAnswer && (
                    <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-4">
                      <AiAnswerRenderer text={aiAnswer} />
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          Nguồn: dữ liệu báo cáo nội bộ
                        </span>
                        <button
                          onClick={handleCopyAi}
                          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                        >
                          {aiCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Đã copy
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          {aiAnswer && !aiLoading && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 py-1.5">Hỏi tiếp:</span>
              {quickQuestions.slice(0, 6).map((q) => (
                <button
                  key={q}
                  onClick={() => handleAskAI(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAskAI()}
              placeholder="Đặt câu hỏi về tình hình kinh doanh…"
              className="flex-1 h-11 border-slate-300 focus-visible:ring-slate-900"
              disabled={aiLoading}
            />
            <Button
              onClick={() => handleAskAI()}
              disabled={aiLoading || !aiPrompt.trim()}
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white h-11 px-5"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {aiLoading ? "Đang phân tích" : "Gửi"}
            </Button>
          </div>
        </div>
      </Card>

      {/* BẢNG CÁC THÁNG TRƯỚC */}
      {olderMonths.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-800">
              Các tháng trước ({olderMonths.length})
            </CardTitle>
            <CardDescription>Bấm "Chi tiết" để xem báo cáo từng ngày</CardDescription>
          </CardHeader>
          <div className="rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 hover:bg-slate-100">
                  <TableHead className="text-slate-700 font-semibold">Kỳ báo cáo</TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">DT trước PPV/VAT</TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">Tổng DT (VAT)</TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">Định phí</TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">Kết quả sau ĐP</TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">Khách</TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">DT / Khách</TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">Bill</TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">Đã ghi nhận</TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {olderMonths.map((r, idx) => {
                  const profit = (r.preTaxRevenue || 0) - (r.totalExpense || 0);
                  return (
                    <TableRow key={r._id} className={idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-50"}>
                      <TableCell className="font-medium text-slate-800">{r.title}</TableCell>
                      <TableCell className="text-right text-slate-600 tabular-nums">{formatCurrency(r.preTaxRevenue)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(r.totalGross)}</TableCell>
                      <TableCell className="text-right text-amber-600 tabular-nums">{formatCurrency(r.totalExpense || 0)}</TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-center text-slate-700 tabular-nums">{r.guestCount}</TableCell>
                      <TableCell className="text-right text-blue-600 tabular-nums">
                        {formatCurrency(r.guestCount > 0 ? r.totalGross / r.guestCount : 0)}
                      </TableCell>
                      <TableCell className="text-center text-slate-700 tabular-nums">{r.billCount}</TableCell>
                      <TableCell className="text-center text-slate-500 tabular-nums text-xs">{r.daysCount} ngày</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            onClick={() => navigate(`/daily-report/${r._id}`)}
                            variant="outline"
                            size="sm"
                            className="gap-1 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-8 px-3"
                          >
                            <List className="w-3.5 h-3.5" /> Chi tiết
                          </Button>
                          <Button
                            onClick={() => handleDelete(r._id)}
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MyTasks;
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, ArrowUp, ArrowDown, Download, Search, Plus, Trash2, EyeOff, Eye, CalendarDays, Upload, Loader2, Save, Check, X, Camera, BarChart3, List, Users, Coins, UtensilsCrossed, CupSoda, CircleEllipsis, Calculator, ReceiptText } from "lucide-react";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchData, updateData, postData, deleteData } from "@/lib/fetch-util";
import * as XLSX from "xlsx";
import html2canvas from 'html2canvas-pro';

export interface SessionRevenue {
  cash: number;
  transfer: number;
  card: number;
  debt: number;
  founderPoints: number;
  foodRevenue: number;
  drinkRevenue: number;
  otherRevenue: number;
  guestCount: number;
  billCount: number;
  note?: string;
}

const EMPTY_SESSION: SessionRevenue = {
  cash: 0,
  transfer: 0,
  card: 0,
  debt: 0,
  founderPoints: 0,
  foodRevenue: 0,
  drinkRevenue: 0,
  otherRevenue: 0,
  guestCount: 0,
  billCount: 0,
  note: "",
};

export interface DailyRevenue {
  _id?: string;
  reportId: string;
  date: string;
  dayOfWeek: string;

  lunch: SessionRevenue;
  dinner: SessionRevenue;

  cash: number;
  transfer: number;
  card: number;
  debt: number;
  founderPoints: number;
  foodRevenue: number;
  drinkRevenue: number;
  otherRevenue: number;
  preTaxRevenue: number;
  totalGross: number;
  guestCount: number;
  billCount: number;
  note?: string;
}

export interface MonthlyExpense {
  _id?: string;
  monthKey?: string;
  title?: string;
  rent: number;
  electricity: number;
  water: number;
  internet: number;
  telephone: number;
  garbage: number;
  employeeSalary: number;
  otherExpense: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  skippedDates?: string[];
}

const VAT_MULTIPLIER = 1.05;

const sumSessionToTotals = (row: DailyRevenue): DailyRevenue => {
  const l = row.lunch || EMPTY_SESSION;
  const d = row.dinner || EMPTY_SESSION;
  const s = (a: any, b: any) => (Number(a) || 0) + (Number(b) || 0);

  return {
    ...row,
    cash: s(l.cash, d.cash),
    transfer: s(l.transfer, d.transfer),
    card: s(l.card, d.card),
    debt: s(l.debt, d.debt),
    founderPoints: s(l.founderPoints, d.founderPoints),
    foodRevenue: s(l.foodRevenue, d.foodRevenue),
    drinkRevenue: s(l.drinkRevenue, d.drinkRevenue),
    otherRevenue: s(l.otherRevenue, d.otherRevenue),
    guestCount: s(l.guestCount, d.guestCount),
    billCount: s(l.billCount, d.billCount),
    note: [l.note, d.note].filter(Boolean).join(" | "),
  };
};

const DailyReport = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DailyRevenue[]>([]);
  const [search, setSearch] = useState("");
  const [weekFilter, setWeekFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"detail" | "daily">("detail");

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [showFounderPoints, setShowFounderPoints] = useState(false);
  const [showNote, setShowNote] = useState(true);
  const [showActions, setShowActions] = useState(true);

  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [screenshotSnapshot, setScreenshotSnapshot] = useState<{
    compact: boolean;
    founder: boolean;
    note: boolean;
    actions: boolean;
    week: string;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editRowRef = useRef<HTMLTableRowElement>(null);

  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>("");

  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense>({
    rent: 0, electricity: 0, water: 0, internet: 0,
    telephone: 0, garbage: 0, employeeSalary: 0, otherExpense: 0,
  });

  const [editingExpenseField, setEditingExpenseField] = useState<keyof MonthlyExpense | null>(null);
  const [expenseInputValue, setExpenseInputValue] = useState<string>("");
  const [savingExpense, setSavingExpense] = useState(false);

  const [otherExpenseInput, setOtherExpenseInput] = useState<string>("");

  const [selectedDailyStartDate, setSelectedDailyStartDate] = useState<string>("");
  const [selectedDailyEndDate, setSelectedDailyEndDate] = useState<string>("");

  const toLocalDateString = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const convertUTCToLocalDate = (utcDateStr: string): string => {
    if (!utcDateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(utcDateStr)) return utcDateStr;
    try {
      const d = new Date(utcDateStr);
      if (isNaN(d.getTime())) return utcDateStr;
      return toLocalDateString(d);
    } catch {
      return utcDateStr;
    }
  };

  const convertExcelDateToLocalString = (dateObj: any): string => {
    if (!dateObj) return "";
    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getUTCFullYear();
      const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    if (typeof dateObj === 'string') {
      const match = dateObj.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateObj)) return dateObj;
      const d = new Date(dateObj);
      if (!isNaN(d.getTime())) return toLocalDateString(d);
    }
    return String(dateObj);
  };

  const normalizeRow = (item: any): DailyRevenue => {
    const base: DailyRevenue = {
      ...item,
      date: convertUTCToLocalDate(item.date),
      lunch: item.lunch ?? { ...EMPTY_SESSION },
      dinner: item.dinner ?? {
        cash: Number(item.cash) || 0,
        transfer: Number(item.transfer) || 0,
        card: Number(item.card) || 0,
        debt: Number(item.debt) || 0,
        founderPoints: Number(item.founderPoints) || 0,
        foodRevenue: Number(item.foodRevenue) || 0,
        drinkRevenue: Number(item.drinkRevenue) || 0,
        otherRevenue: Number(item.otherRevenue) || 0,
        guestCount: Number(item.guestCount) || 0,
        billCount: Number(item.billCount) || 0,
        note: item.note || "",
      },
    };
    return base;
  };

  useEffect(() => {
    if (reportId) {
      const fetchRevenues = async () => {
        try {
          const result = (await fetchData(`/daily-revenues?reportId=${reportId}`)) as ApiResponse<DailyRevenue[]>;
          if (result.success) {
            const formattedData = result.data.map(normalizeRow);
            setData(formattedData);
          }
        } catch (error) {
          console.error("Lỗi khi tải dữ liệu:", error);
        }
      };
      fetchRevenues();
    }
  }, [reportId]);

  useEffect(() => {
    if (reportId) {
      const fetchMonthlyReport = async () => {
        try {
          const result = (await fetchData(`/monthly-reports/${reportId}`)) as ApiResponse<any>;
          if (result.success && result.data) {
            const m = result.data;
            setMonthlyExpenses({
              _id: m._id,
              monthKey: m.monthKey,
              title: m.title,
              rent: Number(m.rent) || 0,
              electricity: Number(m.electricity) || 0,
              water: Number(m.water) || 0,
              internet: Number(m.internet) || 0,
              telephone: Number(m.telephone) || 0,
              garbage: Number(m.garbage) || 0,
              employeeSalary: Number(m.employeeSalary) || 0,
              otherExpense: Number(m.otherExpense) || 0,
            });
          }
        } catch (error) {
          console.error("Lỗi khi tải chi phí tháng:", error);
        }
      };
      fetchMonthlyReport();
    }
  }, [reportId]);

  useEffect(() => {
    if (editingId && editRowRef.current) {
      editRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editingId]);

  useEffect(() => {
    if (!selectedDailyStartDate && !selectedDailyEndDate && data.length > 0) {
      const sortedDates = [...data].map(d => d.date).sort();
      const latestDate = sortedDates[sortedDates.length - 1];
      setSelectedDailyStartDate(latestDate);
      setSelectedDailyEndDate(latestDate);
    }
  }, [data, selectedDailyStartDate, selectedDailyEndDate]);

  const injectScreenshotCSS = () => {
    const style = document.createElement('style');
    style.id = 'screenshot-fix';
    style.innerHTML = `
      #report-container table th,
      #report-container table td {
        white-space: nowrap !important;
        vertical-align: middle !important;
        min-width: max-content !important;
        width: auto !important;
        max-width: none !important;
      }
      #report-container table td > div,
      #report-container table td > span,
      #report-container table td > input,
      #report-container table td > textarea {
        min-width: max-content !important;
        width: auto !important;
        max-width: none !important;
        white-space: nowrap !important;
      }
      #report-container table td > div.justify-end {
        justify-content: flex-end !important;
      }
      #report-container table td > div.justify-center {
        justify-content: center !important;
      }
      #report-container table {
        table-layout: auto !important;
        width: max-content !important;
      }
      #report-container table td.note-cell,
      #report-container table td.note-cell > textarea,
      #report-container table td.note-cell > div {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        min-width: 220px !important;
        max-width: 400px !important;
        width: 220px !important;
      }
    `;
    document.head.appendChild(style);
  };

  const removeScreenshotCSS = () => {
    const existing = document.getElementById('screenshot-fix');
    if (existing) existing.remove();
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) return "";
    return Number(amount).toLocaleString('vi-VN') + " ₫";
  };

  const formatCurrencyNoUnit = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) return "";
    return Number(amount).toLocaleString('vi-VN');
  };

  const formatAvgGuest = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) return "";
    return Math.round(Number(amount)).toLocaleString('vi-VN') + " ₫";
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const parseNumberFromString = (value: string): number => {
    if (!value || value.trim() === "") return 0;
    const cleaned = String(value).replace(/[,.]/g, "").replace(/\s/g, "");
    const number = Number(cleaned);
    return isNaN(number) ? 0 : number;
  };

  const calculateTotalGross = (row: DailyRevenue | any) => {
    return (Number(row.cash) || 0) + (Number(row.transfer) || 0) + (Number(row.card) || 0) + (Number(row.debt) || 0) + (Number(row.founderPoints) || 0);
  };

  const calculatePreTaxRevenue = (row: DailyRevenue | any) => {
    const food = Number(row.foodRevenue) || 0;
    const drink = Number(row.drinkRevenue) || 0;
    const other = Number(row.otherRevenue) || 0;
    if (food === 0 && drink === 0 && other === 0) {
      return Number(row.preTaxRevenue) || 0;
    }
    return Math.round((food + drink + other) * VAT_MULTIPLIER);
  };

  const hasNewColumns = (row: DailyRevenue | any): boolean => {
    return (
      Number(row.foodRevenue) > 0 ||
      Number(row.drinkRevenue) > 0 ||
      Number(row.otherRevenue) > 0
    );
  };

  const recalcTotals = (row: DailyRevenue): DailyRevenue => {
    const summed = sumSessionToTotals(row);
    summed.totalGross = calculateTotalGross(summed);
    summed.preTaxRevenue = calculatePreTaxRevenue(summed);
    return summed;
  };

  const sessionGross = (s?: SessionRevenue) => {
    if (!s) return 0;
    return (Number(s.cash) || 0) + (Number(s.transfer) || 0) + (Number(s.card) || 0) + (Number(s.debt) || 0) + (Number(s.founderPoints) || 0);
  };
  const sessionPreTax = (s?: SessionRevenue) => {
    if (!s) return 0;
    return Math.round(((Number(s.foodRevenue) || 0) + (Number(s.drinkRevenue) || 0) + (Number(s.otherRevenue) || 0)) * VAT_MULTIPLIER);
  };
  const sessionAvg = (s?: SessionRevenue) => {
    if (!s) return 0;
    const g = Number(s.guestCount) || 0;
    return g > 0 ? Math.round(sessionGross(s) / g) : 0;
  };

  const getWeekInfo = (dateStr: string) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    const firstDay = new Date(year, month - 1, 1).getDay() || 7;
    const weekNum = Math.ceil((day + firstDay - 1) / 7);
    return { year, month, day, weekNum };
  };

  const saveMonthlyExpenses = async (updatedExpenses: MonthlyExpense) => {
    if (!reportId) return;
    setSavingExpense(true);
    try {
      const payload = {
        rent: updatedExpenses.rent,
        electricity: updatedExpenses.electricity,
        water: updatedExpenses.water,
        internet: updatedExpenses.internet,
        telephone: updatedExpenses.telephone,
        garbage: updatedExpenses.garbage,
        employeeSalary: updatedExpenses.employeeSalary,
        otherExpense: updatedExpenses.otherExpense,
      };

      const result = (await updateData(`/monthly-reports/${reportId}`, payload)) as ApiResponse<any>;

      if (result.success) {
        const m = result.data;
        setMonthlyExpenses({
          _id: m._id,
          monthKey: m.monthKey,
          title: m.title,
          rent: Number(m.rent) || 0,
          electricity: Number(m.electricity) || 0,
          water: Number(m.water) || 0,
          internet: Number(m.internet) || 0,
          telephone: Number(m.telephone) || 0,
          garbage: Number(m.garbage) || 0,
          employeeSalary: Number(m.employeeSalary) || 0,
          otherExpense: Number(m.otherExpense) || 0,
        });
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
        toast.textContent = '✅ Đã lưu chi phí tháng!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      } else {
        alert("Lỗi khi lưu chi phí: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi kết nối khi lưu chi phí:", error);
      alert("❌ Lỗi kết nối khi lưu chi phí!");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleStartEditExpense = (field: keyof MonthlyExpense) => {
    setEditingExpenseField(field);
    setExpenseInputValue(formatCurrencyNoUnit(monthlyExpenses[field] as number) || "");
  };

  const handleSaveExpenseField = async () => {
    if (!editingExpenseField) return;
    const numValue = parseNumberFromString(expenseInputValue);
    const updated = { ...monthlyExpenses, [editingExpenseField]: numValue };
    setMonthlyExpenses(updated);
    setEditingExpenseField(null);
    setExpenseInputValue("");
    await saveMonthlyExpenses(updated);
  };

  const handleCancelEditExpense = () => {
    setEditingExpenseField(null);
    setExpenseInputValue("");
  };

  const handleOtherExpenseAdd = async () => {
    const numValue = parseNumberFromString(otherExpenseInput);
    if (numValue === 0) return;
    const updated = {
      ...monthlyExpenses,
      otherExpense: (Number(monthlyExpenses.otherExpense) || 0) + numValue
    };
    setMonthlyExpenses(updated);
    setOtherExpenseInput("");
    await saveMonthlyExpenses(updated);
  };

  const handleSaveRow = async (row: DailyRevenue) => {
    if (!row._id) return;
    setSavingRowId(row._id);
    try {
      const computed = recalcTotals(row);

      const payload = {
        lunch: computed.lunch,
        dinner: computed.dinner,
        note: computed.note,
        cash: computed.cash,
        transfer: computed.transfer,
        card: computed.card,
        debt: computed.debt,
        founderPoints: computed.founderPoints,
        foodRevenue: computed.foodRevenue,
        drinkRevenue: computed.drinkRevenue,
        otherRevenue: computed.otherRevenue,
        guestCount: computed.guestCount,
        billCount: computed.billCount,
        preTaxRevenue: computed.preTaxRevenue,
        totalGross: computed.totalGross,
      };

      const result = (await updateData(`/daily-revenues/${row._id}`, payload)) as ApiResponse<DailyRevenue>;
      if (result.success) {
        setData(prev => prev.map(item =>
          item._id === row._id ? normalizeRow(result.data) : item
        ));
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
        toast.textContent = '✅ Đã lưu thành công!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      } else {
        alert("Lỗi khi lưu: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi kết nối khi lưu:", error);
      alert("❌ Lỗi kết nối khi lưu dữ liệu!");
    } finally {
      setSavingRowId(null);
    }
  };

  // 👇 MIGRATE: chuyển doanh thu đang nằm ở cấp TỔNG (Trưa/Tối rỗng) sang buổi TỐI
  // const handleMigrateTotalsToDinner = async () => {
  //   const isSessionEmpty = (s?: SessionRevenue) => {
  //     if (!s) return true;
  //     return (
  //       (Number(s.cash) || 0) === 0 &&
  //       (Number(s.transfer) || 0) === 0 &&
  //       (Number(s.card) || 0) === 0 &&
  //       (Number(s.debt) || 0) === 0 &&
  //       (Number(s.founderPoints) || 0) === 0 &&
  //       (Number(s.foodRevenue) || 0) === 0 &&
  //       (Number(s.drinkRevenue) || 0) === 0 &&
  //       (Number(s.otherRevenue) || 0) === 0 &&
  //       (Number(s.guestCount) || 0) === 0 &&
  //       (Number(s.billCount) || 0) === 0
  //     );
  //   };

  //   const candidates = data.filter((row) => {
  //     const dayHasValue =
  //       (Number(row.cash) || 0) +
  //         (Number(row.transfer) || 0) +
  //         (Number(row.card) || 0) +
  //         (Number(row.debt) || 0) +
  //         (Number(row.founderPoints) || 0) +
  //         (Number(row.foodRevenue) || 0) +
  //         (Number(row.drinkRevenue) || 0) +
  //         (Number(row.otherRevenue) || 0) +
  //         (Number(row.guestCount) || 0) +
  //         (Number(row.billCount) || 0) >
  //       0;

  //     return (
  //       isSessionEmpty(row.lunch) &&
  //       isSessionEmpty(row.dinner) &&
  //       dayHasValue
  //     );
  //   });

  //   if (candidates.length === 0) {
  //     alert("Không có dòng nào cần chuyển (tất cả đã có Trưa/Tối).");
  //     return;
  //   }

  //   if (
  //     !window.confirm(
  //       `Tìm thấy ${candidates.length} ngày có doanh thu ở cấp TỔNG nhưng Trưa/Tối đang rỗng.\n\nChuyển toàn bộ số liệu cấp ngày sang buổi TỐI cho ${candidates.length} ngày này?`
  //     )
  //   )
  //     return;

  //   const toast = document.createElement("div");
  //   toast.className =
  //     "fixed bottom-4 right-4 bg-sky-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm";
  //   toast.textContent = `Đang chuyển 0/${candidates.length}...`;
  //   document.body.appendChild(toast);

  //   let done = 0;
  //   let failed = 0;

  //   for (const row of candidates) {
  //     if (!row._id) continue;
  //     try {
  //       const dinner: SessionRevenue = {
  //         cash: Number(row.cash) || 0,
  //         transfer: Number(row.transfer) || 0,
  //         card: Number(row.card) || 0,
  //         debt: Number(row.debt) || 0,
  //         founderPoints: Number(row.founderPoints) || 0,
  //         foodRevenue: Number(row.foodRevenue) || 0,
  //         drinkRevenue: Number(row.drinkRevenue) || 0,
  //         otherRevenue: Number(row.otherRevenue) || 0,
  //         guestCount: Number(row.guestCount) || 0,
  //         billCount: Number(row.billCount) || 0,
  //         note: row.note || "",
  //       };

  //       const updated: DailyRevenue = recalcTotals({
  //         ...row,
  //         lunch: { ...EMPTY_SESSION },
  //         dinner,
  //       });

  //       const payload = {
  //         lunch: updated.lunch,
  //         dinner: updated.dinner,
  //         note: updated.note,
  //         cash: updated.cash,
  //         transfer: updated.transfer,
  //         card: updated.card,
  //         debt: updated.debt,
  //         founderPoints: updated.founderPoints,
  //         foodRevenue: updated.foodRevenue,
  //         drinkRevenue: updated.drinkRevenue,
  //         otherRevenue: updated.otherRevenue,
  //         guestCount: updated.guestCount,
  //         billCount: updated.billCount,
  //         preTaxRevenue: updated.preTaxRevenue,
  //         totalGross: updated.totalGross,
  //       };

  //       const result = (await updateData(
  //         `/daily-revenues/${row._id}`,
  //         payload
  //       )) as ApiResponse<DailyRevenue>;

  //       if (result.success) {
  //         setData((prev) =>
  //           prev.map((it) =>
  //             it._id === row._id ? normalizeRow(result.data) : it
  //           )
  //         );
  //         done++;
  //       } else {
  //         failed++;
  //       }
  //     } catch (e) {
  //       console.error("Lỗi migrate row", row.date, e);
  //       failed++;
  //     }
  //     toast.textContent = `Đang chuyển ${done + failed}/${candidates.length}... (lỗi: ${failed})`;
  //   }

  //   toast.textContent = `✅ Đã chuyển ${done} ngày sang Tối${
  //     failed ? `, lỗi ${failed}` : ""
  //   }!`;
  //   toast.className =
  //     "fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm";
  //   setTimeout(() => toast.remove(), 3500);
  // };

  const updateLocalRow = (rowId: string, field: keyof DailyRevenue, rawValue: any) => {
    setData(prev => {
      const newData = prev.map(item => {
        if (item._id === rowId) {
          let processedValue = rawValue;
          if (typeof rawValue === 'string' && field !== 'date' && field !== 'note' && field !== 'dayOfWeek') {
            processedValue = parseNumberFromString(rawValue);
          }
          const updated = { ...item, [field]: processedValue } as DailyRevenue;
          const recalc = recalcTotals(updated);
          return recalc;
        }
        return item;
      });
      return newData;
    });
  };

  const updateSessionField = (
    rowId: string,
    session: "lunch" | "dinner",
    field: keyof SessionRevenue,
    rawValue: any
  ) => {
    setData(prev => prev.map(item => {
      if (item._id !== rowId) return item;
      const processed = (typeof rawValue === "string" && field !== "note")
        ? parseNumberFromString(rawValue)
        : rawValue;
      const updated: DailyRevenue = {
        ...item,
        [session]: { ...item[session], [field]: processed },
      };
      return recalcTotals(updated);
    }));
  };

  const handleRevenueInput = (rowId: string, field: keyof DailyRevenue, rawValue: string) => {
    const numValue = parseNumberFromString(rawValue);
    updateLocalRow(rowId, field, numValue);
  };

  const handleNumberFieldInput = (rowId: string, field: keyof DailyRevenue, rawValue: string) => {
    const numValue = parseNumberFromString(rawValue);
    updateLocalRow(rowId, field, numValue);
  };

  const handleDeleteRow = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá báo cáo của ngày này? Hành động này không thể hoàn tác!")) return;
    try {
      const result = await deleteData(`/daily-revenues/${id}`) as ApiResponse<any>;
      if (result.success) setData(data.filter(item => item._id !== id));
      else alert("Lỗi khi xoá: " + result.message);
    } catch (error) {
      console.error("Lỗi kết nối:", error);
    }
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;
    const cleaned = String(value).replace(/[,.]/g, "").replace(/\s/g, "");
    const number = Number(cleaned);
    return isNaN(number) ? 0 : number;
  };

  const getDayOfWeekFromDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return "";
    const daysOfWeek = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return daysOfWeek[date.getDay()];
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!reportId) {
      alert("Không tìm thấy ID báo cáo tháng!");
      return;
    }

    setIsImporting(true);
    setImportProgress("Đang đọc file Excel...");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        alert("Không tìm thấy sheet dữ liệu!");
        return;
      }

      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      const dataRows: any[][] = [];

      for (let row = range.s.r; row <= range.e.r; row++) {
        const rowData: any[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          rowData.push(col === 0 ? (cell?.w ?? cell?.v ?? "") : (cell?.v ?? ""));
        }
        dataRows.push(rowData);
      }

      const importedData: Omit<DailyRevenue, "_id">[] = [];
      const importedDates = new Set<string>();
      let rowCount = 0;

      setImportProgress("Đang xử lý dữ liệu...");

      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.every(cell => !cell || String(cell).trim() === "")) continue;

        const dateValue = row[0];
        const dateStr = String(dateValue).toUpperCase().trim();
        if (dateStr.includes("TUẦN") || dateStr.includes("TỔNG CỘNG") || dateStr.includes("TOTAL")) continue;

        let dateStrFormatted = "";
        let dateObj: Date | null = null;

        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          dateStrFormatted = convertExcelDateToLocalString(dateValue);
          const [year, month, day] = dateStrFormatted.split('-').map(Number);
          dateObj = new Date(year, month - 1, day);
        } else if (typeof dateValue === 'string') {
          dateStrFormatted = convertExcelDateToLocalString(dateValue);
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStrFormatted)) {
            const [year, month, day] = dateStrFormatted.split('-').map(Number);
            dateObj = new Date(year, month - 1, day);
          }
        }

        if (!dateStrFormatted || !dateObj) continue;

        if (data.length > 0) {
          const firstDateParts = data[0].date.split('-');
          const currentParts = dateStrFormatted.split('-');
          if (parseInt(currentParts[0]) !== parseInt(firstDateParts[0]) ||
              parseInt(currentParts[1]) !== parseInt(firstDateParts[1])) continue;
        }

        if (importedDates.has(dateStrFormatted)) continue;
        importedDates.add(dateStrFormatted);

        const dayOfWeek = String(row[1] || "").trim();
        const cash = parseNumber(row[2]);
        const transfer = parseNumber(row[3]);
        const card = parseNumber(row[4]);
        const debt = parseNumber(row[5]);
        const founderPoints = parseNumber(row[6]);
        const foodRevenueRaw = parseNumber(row[7] || 0);
        const drinkRevenueRaw = parseNumber(row[8] || 0);
        const otherRevenueRaw = parseNumber(row[9] || 0);
        const foodRevenue = foodRevenueRaw > 0 ? Math.round(foodRevenueRaw / VAT_MULTIPLIER) : 0;
        const drinkRevenue = drinkRevenueRaw > 0 ? Math.round(drinkRevenueRaw / VAT_MULTIPLIER) : 0;
        const otherRevenue = otherRevenueRaw > 0 ? Math.round(otherRevenueRaw / VAT_MULTIPLIER) : 0;

        const preTaxRevenue = Math.round((foodRevenue + drinkRevenue + otherRevenue) * VAT_MULTIPLIER);
        const totalGross = cash + transfer + card + debt + founderPoints;
        const guestCount = parseNumber(row[12] || 0);
        const billCount = parseNumber(row[13] || 0);
        const note = String(row[14] || "").trim();
        const finalDayOfWeek = dayOfWeek || getDayOfWeekFromDate(dateObj);

        importedData.push({
          reportId,
          date: dateStrFormatted,
          dayOfWeek: finalDayOfWeek,
          lunch: { ...EMPTY_SESSION },
          dinner: {
            cash, transfer, card, debt, founderPoints,
            foodRevenue, drinkRevenue, otherRevenue,
            guestCount, billCount, note,
          },
          founderPoints, cash, transfer, card, debt,
          foodRevenue, drinkRevenue, otherRevenue,
          preTaxRevenue, totalGross, guestCount, billCount, note,
        });

        rowCount++;
        setImportProgress(`Đã xử lý ${rowCount} ngày...`);
      }

      if (importedData.length === 0) {
        alert("Không tìm thấy dữ liệu ngày nào trong file Excel!");
        return;
      }

      setImportProgress(`Đang import ${importedData.length} ngày...`);

      const result = await postData("/daily-revenues/import", {
        reportId,
        data: importedData,
      }) as ApiResponse<DailyRevenue[]>;

      if (result.success) {
        const formattedResult = result.data.map(normalizeRow);
        setData(prev => [...prev, ...formattedResult]);
        const skippedCount = result.skippedDates?.length || 0;
        alert(
          skippedCount > 0
            ? `✅ Đã thêm ${result.data.length} ngày, bỏ qua ${skippedCount} ngày đã tồn tại.`
            : `✅ Import thành công ${result.data.length} ngày!`,
        );
      } else {
        alert("❌ Lỗi import: " + (result.message || "Không xác định"));
      }

    } catch (error: any) {
      console.error("❌ Lỗi import Excel:", error);
      alert("❌ Có lỗi khi đọc file Excel: " + (error.message || "Không xác định"));
    } finally {
      setIsImporting(false);
      setImportProgress("");
    }

    event.target.value = "";
  };

  const handleAddRow = async () => {
    if (!reportId) return alert("Không tìm thấy ID của tháng!");

    let targetYear, targetMonth;
    if (data.length > 0) {
      const parts = data[0].date.split('-');
      targetYear = parseInt(parts[0]);
      targetMonth = parseInt(parts[1]);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    let nextDateStr = null;
    const existingDates = new Set(data.map(d => d.date));
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!existingDates.has(dateStr)) {
        nextDateStr = dateStr;
        break;
      }
    }

    if (!nextDateStr) {
      alert(`Đã có đủ ${daysInMonth} ngày trong tháng!`);
      return;
    }

    const parts = nextDateStr.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const daysOfWeek = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const currentDayOfWeek = daysOfWeek[dateObj.getDay()];

    const newRow = {
      reportId: reportId,
      date: nextDateStr,
      dayOfWeek: currentDayOfWeek,
      lunch: { ...EMPTY_SESSION },
      dinner: { ...EMPTY_SESSION },
      cash: 0, transfer: 0, card: 0, debt: 0, founderPoints: 0,
      foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
      preTaxRevenue: 0, totalGross: 0, guestCount: 0, billCount: 0,
      note: "",
    };

    try {
      const result = (await postData("/daily-revenues", newRow)) as ApiResponse<DailyRevenue>;
      if (result.success) {
        const formattedResult = normalizeRow(result.data);
        setData([...data, formattedResult]);
        if (result.data._id) setEditingId(result.data._id);
      } else {
        alert("Lỗi khi tạo mới: " + result.message);
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
    }
  };

  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, row: DailyRevenue) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + "\n" + value.substring(end);
      target.value = newValue;
      target.selectionStart = target.selectionEnd = start + 1;
      updateLocalRow(row._id!, "note", newValue);
      setTimeout(() => autoResizeTextarea(target), 0);
    }
  };

  const processedData = useMemo(() => {
    let filtered = [...data];
    if (search) {
      filtered = filtered.filter(i =>
        i.date.includes(search) ||
        i.note?.toLowerCase().includes(search.toLowerCase()) ||
        i.dayOfWeek.toLowerCase().includes(search.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      return sortDirection === "asc"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });
    return filtered;
  }, [data, search, sortDirection]);

  const groupedData = useMemo(() => {
    const groupMap = new Map<string, any>();

    processedData.forEach((row) => {
      const { year, month, day, weekNum } = getWeekInfo(row.date);
      const groupKey = `${year}-${String(month).padStart(2, '0')}-W${weekNum}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          key: groupKey,
          year: year,
          month: month,
          weekNum: weekNum,
          records: [],
          totals: {
            cash: 0, transfer: 0, card: 0, debt: 0,
            founderPoints: 0,
            foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
            foodRevenueDisplay: 0, drinkRevenueDisplay: 0, otherRevenueDisplay: 0,
            preTax: 0, totalGross: 0,
            guestCount: 0, billCount: 0,
          },
        });
      }

      const group = groupMap.get(groupKey);
      group.records.push(row);
      group.totals.cash += Number(row.cash) || 0;
      group.totals.transfer += Number(row.transfer) || 0;
      group.totals.card += Number(row.card) || 0;
      group.totals.debt += Number(row.debt) || 0;
      group.totals.founderPoints += Number(row.founderPoints) || 0;

      group.totals.foodRevenue += Number(row.foodRevenue) || 0;
      group.totals.drinkRevenue += Number(row.drinkRevenue) || 0;
      group.totals.otherRevenue += Number(row.otherRevenue) || 0;

      group.totals.foodRevenueDisplay += Math.round((Number(row.foodRevenue) || 0) * VAT_MULTIPLIER);
      group.totals.drinkRevenueDisplay += Math.round((Number(row.drinkRevenue) || 0) * VAT_MULTIPLIER);
      group.totals.otherRevenueDisplay += Math.round((Number(row.otherRevenue) || 0) * VAT_MULTIPLIER);

      group.totals.preTax += Number(row.preTaxRevenue) || 0;
      group.totals.totalGross += calculateTotalGross(row);
      group.totals.guestCount += Number(row.guestCount) || 0;
      group.totals.billCount += Number(row.billCount) || 0;
    });

    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.year !== b.year) return sortDirection === "asc" ? a.year - b.year : b.year - a.year;
      if (a.month !== b.month) return sortDirection === "asc" ? a.month - b.month : b.month - a.month;
      return sortDirection === "asc" ? a.weekNum - b.weekNum : b.weekNum - a.weekNum;
    });
  }, [processedData, sortDirection]);

  const availableWeeks = useMemo(() => {
    const weekSet = new Set<string>();
    groupedData.forEach(g => {
      weekSet.add(g.key);
    });
    return Array.from(weekSet).sort();
  }, [groupedData]);

  useEffect(() => {
    if (availableWeeks.length > 0 && weekFilter === "all") {
      const latestWeek = availableWeeks[availableWeeks.length - 1];
      setWeekFilter(latestWeek);
    }
  }, [availableWeeks]);

  const filteredGroupedData = useMemo(() => {
    if (weekFilter === "all") return groupedData;
    return groupedData.filter(g => g.key === weekFilter);
  }, [groupedData, weekFilter]);

  const { totals, totalDays } = useMemo(() => {
    let days = 0;
    const t = groupedData.reduce((acc, group) => {
      days += group.records.length;
      return {
        cash: acc.cash + group.totals.cash,
        transfer: acc.transfer + group.totals.transfer,
        card: acc.card + group.totals.card,
        debt: acc.debt + group.totals.debt,
        founderPoints: acc.founderPoints + group.totals.founderPoints,

        foodRevenue: acc.foodRevenue + group.totals.foodRevenue,
        drinkRevenue: acc.drinkRevenue + group.totals.drinkRevenue,
        otherRevenue: acc.otherRevenue + group.totals.otherRevenue,

        foodRevenueDisplay: acc.foodRevenueDisplay + group.totals.foodRevenueDisplay,
        drinkRevenueDisplay: acc.drinkRevenueDisplay + group.totals.drinkRevenueDisplay,
        otherRevenueDisplay: acc.otherRevenueDisplay + group.totals.otherRevenueDisplay,

        preTax: acc.preTax + group.totals.preTax,
        totalGross: acc.totalGross + group.totals.totalGross,
        guest: acc.guest + group.totals.guestCount,
        bill: acc.bill + group.totals.billCount,
      };
    }, {
      cash: 0, transfer: 0, card: 0, debt: 0, founderPoints: 0,
      foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
      foodRevenueDisplay: 0, drinkRevenueDisplay: 0, otherRevenueDisplay: 0,
      preTax: 0, totalGross: 0, guest: 0, bill: 0,
    });
    return { totals: t, totalDays: days };
  }, [groupedData]);

  const avgPerGuest = totals.guest > 0 ? totals.totalGross / totals.guest : 0;

  const totalExpense = useMemo(() => {
    return (monthlyExpenses.rent || 0) + (monthlyExpenses.electricity || 0) +
           (monthlyExpenses.water || 0) + (monthlyExpenses.internet || 0) +
           (monthlyExpenses.telephone || 0) + (monthlyExpenses.garbage || 0) +
           (monthlyExpenses.employeeSalary || 0) + (monthlyExpenses.otherExpense || 0);
  }, [monthlyExpenses]);

  const reportDays = useMemo(() => {
    return data.length;
  }, [data]);

  const totalExpenseActual = useMemo(() => {
    return totalExpense * reportDays;
  }, [totalExpense, reportDays]);

  const profit = useMemo(() => {
    return (totals.preTax || 0) - totalExpenseActual;
  }, [totals.preTax, totalExpenseActual]);

  const handleExportExcel = () => {
    if (data.length === 0) return alert("Chưa có dữ liệu để xuất Excel!");

    const exportData = processedData.map((row) => {
      const hasNewCols = hasNewColumns(row);
      return {
        "Ngày": formatDateDisplay(row.date),
        "Thứ": row.dayOfWeek,
        "Tiền mặt": row.cash || 0,
        "Chuyển khoản": row.transfer || 0,
        "Cà thẻ": row.card || 0,
        "Công nợ": row.debt || 0,
        "Điểm Founder": row.founderPoints || 0,
        "Doanh thu món ăn": hasNewCols ? Math.round((row.foodRevenue || 0) * VAT_MULTIPLIER) : "",
        "Doanh thu đồ uống": hasNewCols ? Math.round((row.drinkRevenue || 0) * VAT_MULTIPLIER) : "",
        "Doanh thu khác": hasNewCols ? Math.round((row.otherRevenue || 0) * VAT_MULTIPLIER) : "",
        "DT trước thuế & PPV": row.preTaxRevenue || 0,
        "Tổng DT (VAT)": calculateTotalGross(row),
        "Số khách": row.guestCount || 0,
        "DT / Khách": row.guestCount > 0 ? Math.round(calculateTotalGross(row) / row.guestCount) : 0,
        "Số bill": row.billCount || 0,
        "Ghi chú": row.note || ""
      };
    });

    const emptyRow: any = {};
    Object.keys(exportData[0] || {}).forEach(key => {
      emptyRow[key] = "";
    });
    exportData.push(emptyRow);

    const totalRow: any = {
      "Ngày": "TỔNG CỘNG",
      "Thứ": `(${totalDays} ngày)`,
      "Tiền mặt": totals.cash,
      "Chuyển khoản": totals.transfer,
      "Cà thẻ": totals.card,
      "Công nợ": totals.debt,
      "Điểm Founder": totals.founderPoints,
      "Doanh thu món ăn": totals.foodRevenueDisplay,
      "Doanh thu đồ uống": totals.drinkRevenueDisplay,
      "Doanh thu khác": totals.otherRevenueDisplay,
      "DT trước thuế & PPV": totals.preTax,
      "Tổng DT (VAT)": totals.totalGross,
      "Số khách": totals.guest,
      "DT / Khách": Math.round(avgPerGuest),
      "Số bill": totals.bill,
      "Ghi chú": ""
    };
    exportData.push(totalRow);

    const expenseData = [
      { "Khoản chi": "Mặt bằng", "Số tiền": monthlyExpenses.rent || 0 },
      { "Khoản chi": "Điện", "Số tiền": monthlyExpenses.electricity || 0 },
      { "Khoản chi": "Nước", "Số tiền": monthlyExpenses.water || 0 },
      { "Khoản chi": "Internet", "Số tiền": monthlyExpenses.internet || 0 },
      { "Khoản chi": "Điện thoại", "Số tiền": monthlyExpenses.telephone || 0 },
      { "Khoản chi": "Rác", "Số tiền": monthlyExpenses.garbage || 0 },
      { "Khoản chi": "Lương nhân viên", "Số tiền": monthlyExpenses.employeeSalary || 0 },
      { "Khoản chi": "Khác", "Số tiền": monthlyExpenses.otherExpense || 0 },
      { "Khoản chi": "TỔNG ĐỊNH PHÍ NGÀY", "Số tiền": totalExpense },
      { "Khoản chi": `TỔNG ĐỊNH PHÍ THÁNG (${reportDays} ngày)`, "Số tiền": totalExpenseActual },
      { "Khoản chi": "DT TRƯỚC THUẾ", "Số tiền": totals.preTax },
      { "Khoản chi": "LỢI NHUẬN", "Số tiền": profit },
    ];

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const expenseWorksheet = XLSX.utils.json_to_sheet(expenseData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoDoanhThu");
    XLSX.utils.book_append_sheet(workbook, expenseWorksheet, "ChiPhiThang");

    XLSX.writeFile(workbook, `Bao_Cao_Doanh_Thu_${new Date().getTime()}.xlsx`);
  };

  const handleScreenshot = async () => {
    const element = document.getElementById("report-container");
    if (!element) {
      alert("Không tìm thấy nội dung báo cáo để chụp!");
      return;
    }

    const snapshot = {
      compact: isCompactMode,
      founder: showFounderPoints,
      note: showNote,
      actions: showActions,
      week: weekFilter,
    };
    setScreenshotSnapshot(snapshot);

    const scrollWrapper = element.querySelector(".overflow-x-auto") as HTMLElement | null;
    const footer = element.querySelector("tfoot") as HTMLElement | null;
    const tableCard = element.querySelector(".overflow-hidden") as HTMLElement | null;

    const savedStyles = {
      element: {
        width: element.style.width,
        minWidth: element.style.minWidth,
        maxWidth: element.style.maxWidth,
        padding: element.style.padding,
        position: element.style.position,
      },
      wrapper: scrollWrapper
        ? {
            overflow: scrollWrapper.style.overflow,
            overflowX: scrollWrapper.style.overflowX,
            width: scrollWrapper.style.width,
            minWidth: scrollWrapper.style.minWidth,
            maxWidth: scrollWrapper.style.maxWidth,
          }
        : null,
      tableCard: tableCard
        ? {
            width: tableCard.style.width,
            minWidth: tableCard.style.minWidth,
            maxWidth: tableCard.style.maxWidth,
          }
        : null,
      footerClass: footer?.className || "",
    };

    try {
      setIsScreenshotMode(true);
      injectScreenshotCSS();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const freshElement = document.getElementById("report-container");
      if (!freshElement) {
        throw new Error("Không tìm thấy element sau khi render screenshot");
      }

      const freshWrapper = freshElement.querySelector(".overflow-x-auto") as HTMLElement | null;
      const freshFooter = freshElement.querySelector("tfoot") as HTMLElement | null;
      const freshTable = freshElement.querySelector("table") as HTMLElement | null;
      const freshTableCard = freshElement.querySelector(".overflow-hidden") as HTMLElement | null;

      if (!freshTable) {
        throw new Error("Không tìm thấy bảng báo cáo");
      }

      freshTable.style.tableLayout = "auto";
      freshTable.style.width = "max-content";
      freshTable.style.minWidth = "max-content";

      const cols = freshTable.querySelectorAll("colgroup col");
      cols.forEach((col) => {
        (col as HTMLElement).style.width = "auto";
        (col as HTMLElement).style.minWidth = "auto";
        (col as HTMLElement).style.maxWidth = "none";
      });

      if (freshWrapper) {
        freshWrapper.style.overflow = "visible";
        freshWrapper.style.overflowX = "visible";
        freshWrapper.style.width = "max-content";
        freshWrapper.style.minWidth = "max-content";
        freshWrapper.style.maxWidth = "none";
      }

      if (freshFooter) {
        freshFooter.classList.remove("sticky", "bottom-0");
      }

      freshElement.style.width = "max-content";
      freshElement.style.position = "relative";
      freshElement.style.padding = "0";

      await new Promise((resolve) => setTimeout(resolve, 400));

      const tableWidth = Math.ceil(freshTable.scrollWidth);

      const computedStyle = window.getComputedStyle(element);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;

      const contentWidth = tableWidth + paddingLeft + paddingRight;

      if (freshTableCard) {
        freshTableCard.style.width = `${tableWidth}px`;
        freshTableCard.style.minWidth = `${tableWidth}px`;
        freshTableCard.style.maxWidth = `${tableWidth}px`;
      }

      if (freshWrapper) {
        freshWrapper.style.width = `${tableWidth}px`;
        freshWrapper.style.minWidth = `${tableWidth}px`;
        freshWrapper.style.maxWidth = `${tableWidth}px`;
      }

      freshElement.style.width = `${contentWidth}px`;
      freshElement.style.minWidth = `${contentWidth}px`;
      freshElement.style.maxWidth = `${contentWidth}px`;
      freshElement.style.padding = `${paddingLeft}px ${paddingRight}px`;

      const canvas = await html2canvas(freshElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,

        width: contentWidth,
        height: freshElement.scrollHeight,

        windowWidth: contentWidth,
        windowHeight: freshElement.scrollHeight,

        scrollX: 0,
        scrollY: 0,

        onclone: (clonedDoc, clonedElement) => {
          const originalElements = [
            freshElement,
            ...Array.from(freshElement.querySelectorAll("*")),
          ];

          const clonedElements = [
            clonedElement,
            ...Array.from(clonedElement.querySelectorAll("*")),
          ];

          const length = Math.min(
            originalElements.length,
            clonedElements.length
          );

          for (let i = 0; i < length; i++) {
            const original = originalElements[i] as HTMLElement;
            const cloned = clonedElements[i] as HTMLElement;

            try {
              const computed = window.getComputedStyle(original);

              const properties = [
                "display", "position", "top", "right", "bottom", "left",
                "width", "min-width", "max-width", "height", "min-height", "max-height",
                "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
                "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
                "box-sizing",
                "font-family", "font-size", "font-weight", "font-style", "line-height",
                "letter-spacing", "text-align", "text-transform", "text-decoration",
                "font-variant-numeric", "white-space",
                "color", "background", "background-color", "background-image",
                "border", "border-width", "border-style", "border-color",
                "border-top", "border-right", "border-bottom", "border-left", "border-radius",
                "box-shadow",
                "overflow", "overflow-x", "overflow-y",
                "vertical-align",
                "opacity",
                "flex", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink",
                "align-items", "align-content", "align-self",
                "justify-content", "justify-items",
                "gap", "row-gap", "column-gap",
                "grid", "grid-template-columns", "grid-template-rows",
                "visibility", "z-index",
                "transform", "white-space",
              ];

              properties.forEach((property) => {
                const value = computed.getPropertyValue(property);

                if (value) {
                  cloned.style.setProperty(property, value, "important");
                }
              });

              if (
                cloned.tagName === "INPUT" ||
                cloned.tagName === "TEXTAREA" ||
                cloned.tagName === "BUTTON"
              ) {
                cloned.style.caretColor = "transparent";
                cloned.style.outline = "none";
              }
            } catch (error) {
              console.warn("Không copy được style:", error);
            }
          }

          const screenshotStyle = clonedDoc.createElement("style");

          screenshotStyle.textContent = `
            * { box-sizing: border-box !important; }
            html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; }

            #report-container {
              width: ${contentWidth}px !important;
              min-width: ${contentWidth}px !important;
              max-width: ${contentWidth}px !important;
              padding: ${paddingLeft}px ${paddingRight}px !important;
              position: relative !important;
              overflow: visible !important;
              background: #ffffff !important;
            }

            #report-container .overflow-x-auto {
              overflow: visible !important;
              overflow-x: visible !important;
              width: ${tableWidth}px !important;
              min-width: ${tableWidth}px !important;
              max-width: ${tableWidth}px !important;
            }

            #report-container .overflow-hidden {
              width: ${tableWidth}px !important;
              min-width: ${tableWidth}px !important;
              max-width: ${tableWidth}px !important;
            }

            #report-container table {
              border-collapse: collapse !important;
              table-layout: auto !important;
              width: max-content !important;
            }

            #report-container th,
            #report-container td {
              vertical-align: middle !important;
              white-space: nowrap !important;
              min-width: max-content !important;
              width: auto !important;
              max-width: none !important;
            }

            #report-container td > div,
            #report-container td > span,
            #report-container td > input,
            #report-container td > textarea {
              min-width: max-content !important;
              width: auto !important;
              max-width: none !important;
              white-space: nowrap !important;
            }

            #report-container td.note-cell,
            #report-container td.note-cell > textarea,
            #report-container td.note-cell > div {
              white-space: pre-wrap !important;
              word-break: break-word !important;
              min-width: 220px !important;
              max-width: 400px !important;
              width: 220px !important;
            }

            #report-container tfoot { position: static !important; }
            textarea { resize: none !important; }
            input, textarea, button { caret-color: transparent !important; }
          `;

          clonedDoc.head.appendChild(screenshotStyle);

          clonedElement.style.width = `${contentWidth}px`;
          clonedElement.style.minWidth = `${contentWidth}px`;
          clonedElement.style.maxWidth = `${contentWidth}px`;
          clonedElement.style.padding = `${paddingLeft}px ${paddingRight}px`;
          clonedElement.style.overflow = "visible";
        },
      });

      const image = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = image;
      link.download = `Bao_Cao_Doanh_Thu_${new Date().getTime()}.png`;

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      alert("❌ Có lỗi xảy ra khi chụp ảnh báo cáo!");
    } finally {
      removeScreenshotCSS();

      setIsScreenshotMode(false);
      setScreenshotSnapshot(null);

      const finalElement = document.getElementById("report-container");
      if (finalElement) {
        finalElement.style.width = savedStyles.element.width;
        finalElement.style.minWidth = savedStyles.element.minWidth;
        finalElement.style.maxWidth = savedStyles.element.maxWidth;
        finalElement.style.padding = savedStyles.element.padding;
        finalElement.style.position = savedStyles.element.position;

        const finalWrapper = finalElement.querySelector(".overflow-x-auto") as HTMLElement | null;
        if (finalWrapper && savedStyles.wrapper) {
          finalWrapper.style.overflow = savedStyles.wrapper.overflow;
          finalWrapper.style.overflowX = savedStyles.wrapper.overflowX;
          finalWrapper.style.width = savedStyles.wrapper.width;
          finalWrapper.style.minWidth = savedStyles.wrapper.minWidth;
          finalWrapper.style.maxWidth = savedStyles.wrapper.maxWidth;
        }

        const finalTableCard = finalElement.querySelector(".overflow-hidden") as HTMLElement | null;
        if (finalTableCard && savedStyles.tableCard) {
          finalTableCard.style.width = savedStyles.tableCard.width;
          finalTableCard.style.minWidth = savedStyles.tableCard.minWidth;
          finalTableCard.style.maxWidth = savedStyles.tableCard.maxWidth;
        }

        const finalFooter = finalElement.querySelector("tfoot") as HTMLElement | null;
        if (finalFooter) {
          finalFooter.className = savedStyles.footerClass;
        }

        const finalTable = finalElement.querySelector("table") as HTMLElement | null;
        if (finalTable) {
          finalTable.style.tableLayout = "";
          finalTable.style.width = "";
          finalTable.style.minWidth = "";
        }
      }
    }
  };

  const renderCompact = isScreenshotMode && screenshotSnapshot
    ? screenshotSnapshot.compact
    : isCompactMode;

  const renderFounder = isScreenshotMode && screenshotSnapshot
    ? screenshotSnapshot.founder
    : showFounderPoints;

  const renderNote = isScreenshotMode
    ? true
    : showNote;

  const renderActions = isScreenshotMode
    ? false
    : showActions;

  const renderWeek = isScreenshotMode && screenshotSnapshot
    ? screenshotSnapshot.week
    : weekFilter;

  const hideCashColumns = isScreenshotMode;

  const renderRevenueCell = (
    row: DailyRevenue,
    field: "foodRevenue" | "drinkRevenue" | "otherRevenue",
    hasNewCols: boolean
  ) => {
    const isEditingThisCell =
      editingCell?.rowId === row._id && editingCell?.field === field;

    const rawValue = Number(row[field]) || 0;

    const displayValue =
      hasNewCols && rawValue > 0
        ? formatCurrencyNoUnit(Math.round(rawValue * VAT_MULTIPLIER))
        : "";

    if (isScreenshotMode) {
      return (
        <TableCell
          className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap"
          style={{ minWidth: "max-content" }}
        >
          <div className="w-full h-6 sm:h-7 flex items-center justify-end px-1 text-right text-[10px] sm:text-[13px] font-medium tabular-nums">
            {displayValue || "0"}
          </div>
        </TableCell>
      );
    }

    return (
      <TableCell
        className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap"
        style={{ width: 160, minWidth: 160 }}
      >
        {isEditingThisCell ? (
          <Input
            type="text"
            autoFocus
            value={editingCellValue}
            onChange={(e) => setEditingCellValue(e.target.value)}
            onBlur={() => {
              if (row._id) {
                handleRevenueInput(row._id, field, editingCellValue);
              }
              setEditingCell(null);
              setEditingCellValue("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                setEditingCell(null);
                setEditingCellValue("");
              }
            }}
            className="w-full h-6 sm:h-7 text-right border-transparent bg-transparent focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1 tabular-nums"
          />
        ) : (
          <div
            onClick={() => {
              if (!row._id) return;
              setEditingId(row._id);
              setEditingCell({ rowId: row._id, field });
              setEditingCellValue(formatCurrencyNoUnit(rawValue) || "");
            }}
            className="w-full h-6 sm:h-7 flex items-center justify-end px-1 text-right text-[10px] sm:text-[13px] font-medium tabular-nums cursor-text hover:bg-slate-100 rounded whitespace-nowrap"
          >
            {displayValue}
          </div>
        )}
      </TableCell>
    );
  };

  const renderExpenseCard = (
    field: keyof MonthlyExpense,
    label: string,
  ) => {
    const isEditing = editingExpenseField === field;
    const value = monthlyExpenses[field] as number;

    return (
      <Card className="border-amber-200 bg-amber-50/50 shadow-sm w-auto inline-flex h-fit self-start">
        <CardContent className="px-3 py-1 flex items-center justify-between gap-3 min-w-[200px]">
          <span className="text-sm sm:text-base font-medium text-amber-700 whitespace-nowrap">
            {label}
          </span>

          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                type="text"
                autoFocus
                value={expenseInputValue}
                onChange={(e) => setExpenseInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveExpenseField();
                  } else if (e.key === "Escape") {
                    handleCancelEditExpense();
                  }
                }}
                className="w-24 sm:w-32 h-6 sm:h-7 text-right text-[10px] sm:text-[13px] border-amber-300 focus-visible:ring-amber-500 p-0.5 tabular-nums"
              />

              <Button
                size="icon"
                variant="ghost"
                onClick={handleSaveExpenseField}
                disabled={savingExpense}
                className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 hover:bg-emerald-100 p-0"
              >
                {savingExpense ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancelEditExpense}
                className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 hover:bg-red-100 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span
              onClick={() => handleStartEditExpense(field)}
              className="text-base sm:text-lg font-bold text-amber-700 whitespace-nowrap cursor-pointer hover:bg-amber-100 px-2 py-0.5 rounded transition-colors tabular-nums"
              title="Click để chỉnh sửa"
            >
              {formatCurrency(value) || "0 ₫"}
            </span>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSessionRow = (
    row: DailyRevenue,
    sessionKey: "lunch" | "dinner",
    label: string
  ) => {
    const session = row[sessionKey] || EMPTY_SESSION;
    const isLunch = sessionKey === "lunch";
    const sPreTax = sessionPreTax(session);
    const sGross = sessionGross(session);
    const sAvg = sessionAvg(session);

    const cellInput = (
      field: keyof SessionRevenue,
      align: "left" | "right" | "center" = "right",
      extraClass = ""
    ) => {
      if (isScreenshotMode) {
        const display =
          field === "foodRevenue" || field === "drinkRevenue" || field === "otherRevenue"
            ? formatCurrencyNoUnit(Math.round((Number(session[field]) || 0) * VAT_MULTIPLIER)) || "0"
            : field === "note"
            ? ""
            : formatCurrencyNoUnit(Number(session[field]) || 0) || "0";
        return (
          <div
            className={`w-full h-6 sm:h-7 flex items-center px-1 text-[10px] sm:text-[13px] font-medium tabular-nums whitespace-nowrap ${
              align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"
            } ${extraClass}`}
          >
            {display}
          </div>
        );
      }
      return (
        <Input
          type="text"
          defaultValue={formatCurrencyNoUnit(Number(session[field]) || 0)}
          onFocus={() => row._id && setEditingId(row._id)}
          onBlur={(e) => {
            if (row._id) updateSessionField(row._id, sessionKey, field, e.target.value);
          }}
          className={`w-full h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-400 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1 tabular-nums ${
            align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
          } ${extraClass}`}
        />
      );
    };

    return (
      <TableRow
        className={isLunch ? "bg-amber-50/40 hover:bg-amber-50/70" : "bg-sky-50/40 hover:bg-sky-50/70"}
      >
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-center text-[10px] sm:text-[13px] font-medium tabular-nums whitespace-nowrap">
          {isLunch ? formatDateDisplay(row.date) : ""}
        </TableCell>
        <TableCell
          className={`border border-slate-400 p-0.5 sm:p-1 text-center text-[10px] sm:text-[13px] font-bold whitespace-nowrap ${
            isLunch ? "text-amber-700" : "text-sky-700"
          }`}
        >
          {isLunch ? `${row.dayOfWeek} · Trưa` : `${row.dayOfWeek} · Tối`}
        </TableCell>

        {!renderCompact ? (
          <>
            {!hideCashColumns && (
              <>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("cash")}</TableCell>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("transfer")}</TableCell>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("card")}</TableCell>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("debt")}</TableCell>
              </>
            )}
            {renderFounder && (
              <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("founderPoints")}</TableCell>
            )}
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap" style={{ width: 160, minWidth: 160 }}>{cellInput("foodRevenue")}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap" style={{ width: 160, minWidth: 160 }}>{cellInput("drinkRevenue")}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap" style={{ width: 160, minWidth: 160 }}>{cellInput("otherRevenue")}</TableCell>
          </>
        ) : (
          <>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap" style={{ width: 160, minWidth: 160 }}>{cellInput("foodRevenue")}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap" style={{ width: 160, minWidth: 160 }}>{cellInput("drinkRevenue")}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap" style={{ width: 160, minWidth: 160 }}>{cellInput("otherRevenue")}</TableCell>
          </>
        )}

        <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap bg-orange-50 text-right font-bold text-orange-700 text-[10px] sm:text-[13px] tabular-nums">
          {formatCurrencyNoUnit(sPreTax) || "0"}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right font-extrabold text-primary whitespace-nowrap bg-primary/5 text-[10px] sm:text-[13px] tabular-nums">
          {formatCurrency(sGross) || "0 ₫"}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("guestCount", "center")}</TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right font-bold text-blue-600 whitespace-nowrap bg-blue-50/30 text-[10px] sm:text-[13px] tabular-nums">
          {formatAvgGuest(sAvg) || "0 ₫"}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 whitespace-nowrap">{cellInput("billCount", "center")}</TableCell>

        {renderNote && (
          <TableCell className="border border-slate-400 p-0.5 sm:p-1 min-w-[220px] align-top note-cell">
            {isScreenshotMode ? (
              <div className="w-full min-w-[220px] max-w-[400px] p-0.5 sm:p-1 text-[10px] sm:text-[13px] whitespace-pre-wrap break-words leading-relaxed">
                {session.note || ""}
              </div>
            ) : (
              <textarea
                defaultValue={session.note || ""}
                rows={1}
                onFocus={() => row._id && setEditingId(row._id)}
                onBlur={(e) => {
                  if (row._id) updateSessionField(row._id, sessionKey, "note", e.target.value);
                }}
                onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                className="w-full min-w-[220px] overflow-hidden resize-none rounded-md border border-transparent bg-transparent p-0.5 sm:p-1 text-[10px] sm:text-[13px] hover:border-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
            )}
          </TableCell>
        )}
        {renderActions && (
          <>
            <TableCell className="border border-slate-400 px-1 py-1"></TableCell>
            <TableCell className="border border-slate-400 px-1 py-1"></TableCell>
          </>
        )}
      </TableRow>
    );
  };

  const renderTotalDayRow = (row: DailyRevenue) => {
    const totalGross = calculateTotalGross(row);
    const preTaxDisplay = calculatePreTaxRevenue(row);
    const avgGuest = Number(row.guestCount || 0) > 0 ? totalGross / Number(row.guestCount) : 0;
    const isSaving = savingRowId === row._id;

    return (
      <TableRow className="bg-slate-100 hover:bg-slate-100 border-b-2 border-slate-500">
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-center text-[10px] sm:text-[13px] font-medium tabular-nums whitespace-nowrap">
          {formatDateDisplay(row.date)}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-center text-[10px] sm:text-[13px] font-black whitespace-nowrap text-slate-800">
          TỔNG
        </TableCell>

        {!renderCompact ? (
          <>
            {!hideCashColumns && (
              <>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(row.cash) || "0"}</TableCell>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(row.transfer) || "0"}</TableCell>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(row.card) || "0"}</TableCell>
                <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(row.debt) || "0"}</TableCell>
              </>
            )}
            {renderFounder && (
              <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(row.founderPoints) || "0"}</TableCell>
            )}
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(Math.round((Number(row.foodRevenue) || 0) * VAT_MULTIPLIER)) || "0"}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(Math.round((Number(row.drinkRevenue) || 0) * VAT_MULTIPLIER)) || "0"}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(Math.round((Number(row.otherRevenue) || 0) * VAT_MULTIPLIER)) || "0"}</TableCell>
          </>
        ) : (
          <>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(Math.round((Number(row.foodRevenue) || 0) * VAT_MULTIPLIER)) || "0"}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(Math.round((Number(row.drinkRevenue) || 0) * VAT_MULTIPLIER)) || "0"}</TableCell>
            <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{formatCurrencyNoUnit(Math.round((Number(row.otherRevenue) || 0) * VAT_MULTIPLIER)) || "0"}</TableCell>
          </>
        )}

        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right font-bold text-orange-700 whitespace-nowrap bg-orange-50 text-[10px] sm:text-[13px] tabular-nums">
          {formatCurrencyNoUnit(preTaxDisplay) || "0"}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right font-extrabold text-primary whitespace-nowrap bg-primary/5 text-[10px] sm:text-[13px] tabular-nums">
          {formatCurrency(totalGross) || "0 ₫"}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-center text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{row.guestCount || "0"}</TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-right font-bold text-blue-600 whitespace-nowrap bg-blue-50/30 text-[10px] sm:text-[13px] tabular-nums">
          {formatAvgGuest(avgGuest) || "0 ₫"}
        </TableCell>
        <TableCell className="border border-slate-400 p-0.5 sm:p-1 text-center text-[10px] sm:text-[13px] font-bold tabular-nums whitespace-nowrap">{row.billCount || "0"}</TableCell>

        {renderNote && (
          <TableCell className="border border-slate-400 p-0.5 sm:p-1 min-w-[220px] align-top note-cell text-[10px] sm:text-[12px] italic text-slate-600 whitespace-pre-wrap break-words">
            {row.note || ""}
          </TableCell>
        )}
        {renderActions && (
          <>
            <TableCell className="border border-slate-400 text-center whitespace-nowrap px-0.5 sm:px-2 py-0.5 sm:py-1.5">
              <div className="flex items-center justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSaveRow(row)}
                  disabled={isSaving}
                  className="text-emerald-600 hover:bg-emerald-100 h-5 w-5 sm:h-7 sm:w-7"
                >
                  {isSaving ? (
                    <Loader2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                  )}
                </Button>
              </div>
            </TableCell>
            <TableCell className="border border-slate-400 text-center whitespace-nowrap px-0.5 sm:px-2 py-0.5 sm:py-1.5">
              <div className="flex items-center justify-center">
                <Button size="icon" variant="ghost" onClick={() => row._id && handleDeleteRow(row._id)} className="text-red-500 hover:bg-red-100 h-5 w-5 sm:h-7 sm:w-7">
                  <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                </Button>
              </div>
            </TableCell>
          </>
        )}
      </TableRow>
    );
  };

  // 👇 THÊM: dữ liệu cho tab Báo cáo theo ngày (Gộp 3 dòng vào 1 ô)
  const dailyReportData = useMemo(() => {
    const filtered = data.filter(d => {
      if (!selectedDailyStartDate || !selectedDailyEndDate) return false;
      return d.date >= selectedDailyStartDate && d.date <= selectedDailyEndDate;
    });

    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    const dates = sorted.map(d => d.date);

    const getRow = (date: string) => sorted.find(x => x.date === date);

    const buildGroupedRows = (
      label: string,
      icon: any,
      valueGetter: (r: DailyRevenue | undefined, session: "lunch" | "dinner" | "total") => number,
      formatter: (n: number) => string,
      monthTotalLunch: number,
      monthTotalDinner: number,
      monthTotalAll: number
    ) => {
      return {
        label,
        icon,
        formatter,
        values: dates.reduce((acc, date) => {
          const r = getRow(date);
          acc[date] = {
            lunch: valueGetter(r, "lunch"),
            total: valueGetter(r, "total"),
            dinner: valueGetter(r, "dinner"),
          };
          return acc;
        }, {} as Record<string, { lunch: number; total: number; dinner: number }>),
        monthTotal: {
          lunch: monthTotalLunch,
          total: monthTotalAll,
          dinner: monthTotalDinner,
        }
      };
    };

    const monthLunchGross = data.reduce((s, r) => s + sessionGross(r.lunch), 0);
    const monthDinnerGross = data.reduce((s, r) => s + sessionGross(r.dinner), 0);
    const monthLunchPreTax = data.reduce((s, r) => s + sessionPreTax(r.lunch), 0);
    const monthDinnerPreTax = data.reduce((s, r) => s + sessionPreTax(r.dinner), 0);
    const monthLunchFood = data.reduce((s, r) => s + Math.round((Number(r.lunch?.foodRevenue) || 0) * VAT_MULTIPLIER), 0);
    const monthDinnerFood = data.reduce((s, r) => s + Math.round((Number(r.dinner?.foodRevenue) || 0) * VAT_MULTIPLIER), 0);
    const monthLunchDrink = data.reduce((s, r) => s + Math.round((Number(r.lunch?.drinkRevenue) || 0) * VAT_MULTIPLIER), 0);
    const monthDinnerDrink = data.reduce((s, r) => s + Math.round((Number(r.dinner?.drinkRevenue) || 0) * VAT_MULTIPLIER), 0);
    const monthLunchOther = data.reduce((s, r) => s + Math.round((Number(r.lunch?.otherRevenue) || 0) * VAT_MULTIPLIER), 0);
    const monthDinnerOther = data.reduce((s, r) => s + Math.round((Number(r.dinner?.otherRevenue) || 0) * VAT_MULTIPLIER), 0);
    const monthLunchGuest = data.reduce((s, r) => s + (Number(r.lunch?.guestCount) || 0), 0);
    const monthDinnerGuest = data.reduce((s, r) => s + (Number(r.dinner?.guestCount) || 0), 0);

    const guestRows = buildGroupedRows(
      "Số lượt khách",
      Users,
      (r, s) => {
        if (!r) return 0;
        if (s === "lunch") return Number(r.lunch?.guestCount) || 0;
        if (s === "dinner") return Number(r.dinner?.guestCount) || 0;
        return Number(r.guestCount) || 0;
      },
      (n) => String(n || 0),
      monthLunchGuest,
      monthDinnerGuest,
      totals.guest
    );

    const avgRows = buildGroupedRows(
      "Chi tiêu bình quân/lượt khách",
      Coins,
      (r, s) => {
        if (!r) return 0;
        if (s === "lunch") return sessionAvg(r.lunch);
        if (s === "dinner") return sessionAvg(r.dinner);
        const g = Number(r.guestCount) || 0;
        return g > 0 ? Math.round(calculateTotalGross(r) / g) : 0;
      },
      (n) => formatAvgGuest(n) || "0 ₫",
      monthLunchGuest > 0 ? Math.round(monthLunchGross / monthLunchGuest) : 0,
      monthDinnerGuest > 0 ? Math.round(monthDinnerGross / monthDinnerGuest) : 0,
      totals.guest > 0 ? Math.round(totals.totalGross / totals.guest) : 0
    );

    const foodRows = buildGroupedRows(
      "Doanh thu đồ ăn",
      UtensilsCrossed,
      (r, s) => {
        if (!r) return 0;
        if (s === "lunch") return Math.round((Number(r.lunch?.foodRevenue) || 0) * VAT_MULTIPLIER);
        if (s === "dinner") return Math.round((Number(r.dinner?.foodRevenue) || 0) * VAT_MULTIPLIER);
        return Math.round((Number(r.foodRevenue) || 0) * VAT_MULTIPLIER);
      },
      (n) => formatCurrency(n) || "0 ₫",
      monthLunchFood,
      monthDinnerFood,
      totals.foodRevenueDisplay
    );

    const drinkRows = buildGroupedRows(
      "Doanh thu nước uống",
      CupSoda,
      (r, s) => {
        if (!r) return 0;
        if (s === "lunch") return Math.round((Number(r.lunch?.drinkRevenue) || 0) * VAT_MULTIPLIER);
        if (s === "dinner") return Math.round((Number(r.dinner?.drinkRevenue) || 0) * VAT_MULTIPLIER);
        return Math.round((Number(r.drinkRevenue) || 0) * VAT_MULTIPLIER);
      },
      (n) => formatCurrency(n) || "0 ₫",
      monthLunchDrink,
      monthDinnerDrink,
      totals.drinkRevenueDisplay
    );

    const otherRows = buildGroupedRows(
      "Doanh thu khác",
      CircleEllipsis,
      (r, s) => {
        if (!r) return 0;
        if (s === "lunch") return Math.round((Number(r.lunch?.otherRevenue) || 0) * VAT_MULTIPLIER);
        if (s === "dinner") return Math.round((Number(r.dinner?.otherRevenue) || 0) * VAT_MULTIPLIER);
        return Math.round((Number(r.otherRevenue) || 0) * VAT_MULTIPLIER);
      },
      (n) => formatCurrency(n) || "0 ₫",
      monthLunchOther,
      monthDinnerOther,
      totals.otherRevenueDisplay
    );

    const footerTotals = dates.reduce((acc, date) => {
      const r = getRow(date);
      acc[date] = {
        lunchPreTax: sessionPreTax(r?.lunch),
        dinnerPreTax: sessionPreTax(r?.dinner),
        preTax: Math.round(((Number(r?.foodRevenue) || 0) + (Number(r?.drinkRevenue) || 0) + (Number(r?.otherRevenue) || 0)) * VAT_MULTIPLIER),
        lunchGross: sessionGross(r?.lunch),
        dinnerGross: sessionGross(r?.dinner),
        gross: calculateTotalGross(r || {}),
      };
      return acc;
    }, {} as Record<string, { lunchPreTax: number; dinnerPreTax: number; preTax: number; lunchGross: number; dinnerGross: number; gross: number }>);

    return {
      dates,
      guestRows,
      avgRows,
      foodRows,
      drinkRows,
      otherRows,
      footerTotals,
      hasData: sorted.length > 0,
      monthGuest: totals.guest,
      monthAvgGuest: totals.guest > 0 ? Math.round(totals.totalGross / totals.guest) : 0,
      monthPreTax: totals.preTax,
      monthGross: totals.totalGross,
      monthLunchPreTax,
      monthDinnerPreTax,
      monthLunchGross,
      monthDinnerGross,
      filteredDays: sorted.length,
    };
  }, [data, selectedDailyStartDate, selectedDailyEndDate, totals]);

  return (
    <div id="report-container" className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 flex-shrink-0">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5"/>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold truncate">Chi Tiết Báo Cáo Tháng</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => setIsCompactMode(!isCompactMode)} className="gap-1 sm:gap-2 bg-slate-50 text-slate-700 border-slate-300 text-xs sm:text-sm px-2 sm:px-4">
            {isCompactMode ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />} <span className="hidden xs:inline">{isCompactMode ? "Hiện chi tiết" : "Thu gọn"}</span>
          </Button>

          <Button variant="outline" onClick={() => setShowFounderPoints(!showFounderPoints)} className="gap-1 sm:gap-2 bg-slate-50 text-slate-700 border-slate-300 text-xs sm:text-sm px-2 sm:px-4">
            {showFounderPoints ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden xs:inline">Điểm Founder</span>
          </Button>

          <Button variant="outline" onClick={() => setShowNote(!showNote)} className="gap-1 sm:gap-2 bg-slate-50 text-slate-700 border-slate-300 text-xs sm:text-sm px-2 sm:px-4">
            {showNote ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden xs:inline">Ghi chú</span>
          </Button>

          <Button variant="outline" onClick={() => setShowActions(!showActions)} className="gap-1 sm:gap-2 bg-slate-50 text-slate-700 border-slate-300 text-xs sm:text-sm px-2 sm:px-4">
            {showActions ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span className="hidden xs:inline">Lưu/Xoá</span>
          </Button>

          <input
            ref={fileInputRef}
            id="excel-import"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
            disabled={isImporting}
          />
          <Button
            variant="outline"
            className="gap-1 sm:gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm px-2 sm:px-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden xs:inline">{importProgress || "Đang nhập..."}</span>
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Nhập Excel</span>
              </>
            )}
          </Button>

          {/* 👇 NÚT MIGRATE: chuyển doanh thu cấp TỔNG (Trưa/Tối rỗng) sang buổi TỐI */}
          {/* <Button
            variant="outline"
            className="gap-1 sm:gap-2 border-amber-400 text-amber-700 hover:bg-amber-50 text-xs sm:text-sm px-2 sm:px-4"
            onClick={handleMigrateTotalsToDinner}
            title="Chuyển doanh thu đang nằm ở cấp TỔNG (Trưa/Tối rỗng) sang buổi TỐI"
          >
            <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">TỔNG → Tối</span>
          </Button> */}

          <Button variant="outline" className="gap-1 sm:gap-2 border-slate-300 text-xs sm:text-sm px-2 sm:px-4" onClick={handleExportExcel}>
            <Download className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Xuất Excel</span>
          </Button>

          <Button variant="outline" className="gap-1 sm:gap-2 border-sky-300 text-sky-700 hover:bg-sky-50 text-xs sm:text-sm px-2 sm:px-4" onClick={handleScreenshot}>
            <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Chụp ảnh</span>
          </Button>

          <Button className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4" onClick={handleAddRow}>
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Thêm</span>
          </Button>
        </div>
      </div>

      {/* 👇 TABS */}
      <div className="flex items-center gap-1 border-b border-slate-300">
        <button
          onClick={() => setActiveTab("detail")}
          className={`flex items-center gap-2 px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors ${
            activeTab === "detail"
              ? "bg-white text-emerald-700 border border-slate-300 border-b-white -mb-px"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <List className="w-3 h-3 sm:w-4 sm:h-4" />
          Chi tiết
        </button>
        <button
          onClick={() => setActiveTab("daily")}
          className={`flex items-center gap-2 px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors ${
            activeTab === "daily"
              ? "bg-white text-emerald-700 border border-slate-300 border-b-white -mb-px"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
          Báo cáo theo ngày
        </button>
      </div>

      {/* ===== TAB 1: CHI TIẾT ===== */}
      {activeTab === "detail" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-72 lg:w-80">
              <Search className="absolute left-3 top-2.5 w-3 h-3 sm:w-4 sm:h-4 text-slate-400"/>
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 sm:pl-10 border-slate-300 text-sm h-9 sm:h-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")} className="gap-1 sm:gap-2 border-slate-300 text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10">
                {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                <span className="hidden xs:inline">{sortDirection === 'asc' ? 'Từ Ngày 1' : 'Từ Ngày 31'}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-primary text-primary text-xs sm:text-sm px-2 sm:px-4 h-9 sm:h-10">
                    <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"/>
                    <span className="truncate max-w-[80px] sm:max-w-none">
                      {weekFilter === "all" ? "Tất cả các tuần" : `Tuần ${weekFilter.split('-W')[1]}`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setWeekFilter("all")}>Tất cả các tuần</DropdownMenuItem>
                  {availableWeeks.map(w => (
                    <DropdownMenuItem key={w} onClick={() => setWeekFilter(w)}>
                      Tuần {w.split('-W')[1]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Table doanh thu ngày */}
          <Card className="border-slate-400 overflow-hidden">
            <div className="rounded-md overflow-x-auto">
              <Table
                className="border-collapse text-xs sm:text-sm tabular-nums"
                style={{
                  width: "max-content",
                  minWidth: "100%",
                  tableLayout: isScreenshotMode ? "auto" : "auto"
                }}
              >
                <TableHeader>
                  <TableRow className="bg-slate-200">
                    <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[100px] w-[100px]">Ngày</TableHead>
                    <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[120px] w-[120px]">Thứ / Buổi</TableHead>
                    {!renderCompact ? (
                      <>
                        {!hideCashColumns && (
                          <>
                            <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[110px] w-[110px]">Tiền mặt</TableHead>
                            <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[120px] w-[120px]">Chuyển khoản</TableHead>
                            <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[110px] w-[110px]">Cà thẻ</TableHead>
                            <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[110px] w-[110px]">Công nợ</TableHead>
                          </>
                        )}
                        {renderFounder && (
                          <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[110px] w-[110px]">Điểm Founder</TableHead>
                        )}
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[160px] w-[160px]">DT Món ăn trước thuế</TableHead>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[160px] w-[160px]">DT Đồ uống trước thuế</TableHead>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[160px] w-[160px]">DT Khác trước thuế</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[160px] w-[160px]">DT Món ăn trước thuế</TableHead>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[160px] w-[160px]">DT Đồ uống trước thuế</TableHead>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[160px] w-[160px]">DT Khác trước thuế</TableHead>
                      </>
                    )}
                    <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[130px] w-[130px]">DT trước thuế</TableHead>
                    <TableHead className="border border-slate-400 text-primary font-extrabold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[140px] w-[140px]">Tổng DT (VAT)</TableHead>
                    <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[90px] w-[90px]">SL Khách</TableHead>
                    <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[130px] w-[130px]">Tiêu dùng/Khách</TableHead>
                    <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[90px] w-[90px]">SL Bill</TableHead>
                    {renderNote && (
                      <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap min-w-[220px] px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[13px]">Ghi chú</TableHead>
                    )}
                    {renderActions && (
                      <>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[60px] w-[60px]">Lưu</TableHead>
                        <TableHead className="border border-slate-400 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] min-w-[60px] w-[60px]">Xoá</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {groupedData.length > 0 ? groupedData.map((group) => {
                    const isSelectedWeek = renderWeek === "all" || group.key === renderWeek;

                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="bg-emerald-50 hover:bg-emerald-50 border-y-2 border-emerald-300">
                          <TableCell colSpan={2} className="border border-emerald-300 font-black text-center whitespace-nowrap bg-emerald-100 text-emerald-800 px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">
                            TUẦN {group.weekNum}
                          </TableCell>
                          {!renderCompact ? (
                            <>
                              {!hideCashColumns && (
                                <>
                                  <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.cash) || "0"}</TableCell>
                                  <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.transfer) || "0"}</TableCell>
                                  <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.card) || "0"}</TableCell>
                                  <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.debt) || "0"}</TableCell>
                                </>
                              )}
                              {renderFounder && (
                                <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.founderPoints) || "0"}</TableCell>
                              )}
                              <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.foodRevenueDisplay) || "0"}</TableCell>
                              <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.drinkRevenueDisplay) || "0"}</TableCell>
                              <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.otherRevenueDisplay) || "0"}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.foodRevenueDisplay) || "0"}</TableCell>
                              <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.drinkRevenueDisplay) || "0"}</TableCell>
                              <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{formatCurrency(group.totals.otherRevenueDisplay) || "0"}</TableCell>
                            </>
                          )}
                          <TableCell className="border border-emerald-300 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-orange-600 tabular-nums">{formatCurrency(group.totals.preTax) || "0"}</TableCell>
                          <TableCell className="border border-emerald-300 text-right font-extrabold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-primary tabular-nums">{formatCurrency(group.totals.totalGross) || "0"}</TableCell>
                          <TableCell className="border border-emerald-300 text-center font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{group.totals.guestCount}</TableCell>
                          <TableCell className="border border-emerald-300 text-right font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-blue-600 tabular-nums">{formatAvgGuest(group.totals.guestCount > 0 ? group.totals.totalGross / group.totals.guestCount : 0) || "0"}</TableCell>
                          <TableCell className="border border-emerald-300 text-center font-semibold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-emerald-700 tabular-nums">{group.totals.billCount}</TableCell>
                          {renderNote && (
                            <TableCell className="border border-emerald-300 px-1 py-1 sm:px-2 sm:py-1.5 bg-emerald-50 note-cell"></TableCell>
                          )}
                          {renderActions && (
                            <>
                              <TableCell className="border border-emerald-300 px-1 py-1 sm:px-2 sm:py-1.5 bg-emerald-50"></TableCell>
                              <TableCell className="border border-emerald-300 px-1 py-1 sm:px-2 sm:py-1.5 bg-emerald-50"></TableCell>
                            </>
                          )}
                        </TableRow>

                        {isSelectedWeek && group.records.map((row: DailyRevenue) => {
                          return (
                            <React.Fragment key={row._id}>
                              {renderSessionRow(row, "lunch", "Trưa")}
                              {renderSessionRow(row, "dinner", "Tối")}
                              {renderTotalDayRow(row)}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  }) : (<TableRow><TableCell colSpan={14 + (showFounderPoints ? 1 : 0) + (showNote ? 1 : 0) + (showActions ? 2 : 0) - (isCompactMode ? 5 : 0)} className="border border-slate-400 h-24 sm:h-32 text-center text-muted-foreground font-medium text-[10px] sm:text-[13px]">Chưa có dữ liệu. Hãy thêm doanh thu ngày.</TableCell></TableRow>)}
                </TableBody>

                  <TableFooter className="bg-slate-800 text-white sticky bottom-0 z-10 border-t-4 border-slate-900">
                    <TableRow className="hover:bg-slate-800">
                      <TableCell colSpan={2} className="border border-slate-600 text-center font-black text-white whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-sm bg-slate-900">TỔNG ({totalDays} Ngày)</TableCell>
                      {!renderCompact ? (
                        <>
                          {!hideCashColumns && (
                            <>
                              <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.cash) || "0"}</TableCell>
                              <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.transfer) || "0"}</TableCell>
                              <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.card) || "0"}</TableCell>
                              <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.debt) || "0"}</TableCell>
                            </>
                          )}
                          {renderFounder && (
                            <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.founderPoints) || "0"}</TableCell>
                          )}
                          <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.foodRevenueDisplay) || "0"}</TableCell>
                          <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.drinkRevenueDisplay) || "0"}</TableCell>
                          <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.otherRevenueDisplay) || "0"}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.foodRevenueDisplay) || "0"}</TableCell>
                          <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.drinkRevenueDisplay) || "0"}</TableCell>
                          <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.otherRevenueDisplay) || "0"}</TableCell>
                        </>
                      )}
                      <TableCell className="border border-slate-600 text-right font-bold text-orange-300 whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatCurrency(totals.preTax) || "0"}</TableCell>
                      <TableCell className="border border-slate-600 text-right font-black text-white whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-sm bg-slate-900 tabular-nums">{formatCurrency(totals.totalGross) || "0"}</TableCell>
                      <TableCell className="border border-slate-600 text-center font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{totals.guest}</TableCell>
                      <TableCell className="border border-slate-600 text-right font-bold text-blue-200 whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{formatAvgGuest(avgPerGuest) || "0"}</TableCell>
                      <TableCell className="border border-slate-600 text-center font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px] tabular-nums">{totals.bill}</TableCell>
                      {renderNote && (
                        <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-2 note-cell"></TableCell>
                      )}
                      {renderActions && (
                        <>
                          <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-2"></TableCell>
                          <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-2"></TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableFooter>
              </Table>
            </div>
          </Card>

          {/* ===== CHI PHÍ THÁNG (EDITABLE) ===== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Định phí ngày</h2>
              {savingExpense && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {renderExpenseCard("rent", "Mặt bằng")}
              {renderExpenseCard("electricity", "Điện")}
              {renderExpenseCard("water", "Nước")}
              {renderExpenseCard("internet", "Internet")}
              {renderExpenseCard("telephone", "Điện thoại")}
              {renderExpenseCard("garbage", "Rác")}
              {renderExpenseCard("employeeSalary", "Lương nhân viên")}

              <Card className="border-amber-200 bg-amber-50/50 shadow-sm w-auto inline-flex h-fit self-start">
                <CardContent className="px-3 py-1 flex items-center justify-between gap-3 min-w-[200px]">
                  <span className="text-sm sm:text-base font-medium text-amber-700 whitespace-nowrap">
                    Khác
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-base sm:text-lg font-bold text-amber-700 whitespace-nowrap tabular-nums">
                      {formatCurrency(monthlyExpenses.otherExpense) || "0 ₫"}
                    </span>
                    <Input
                      type="text"
                      placeholder="+"
                      value={otherExpenseInput}
                      onChange={(e) => setOtherExpenseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleOtherExpenseAdd();
                        }
                      }}
                      className="w-16 sm:w-20 h-5 sm:h-6 text-[10px] sm:text-[12px] text-right border-amber-300 focus-visible:ring-amber-500 p-0.5 tabular-nums"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleOtherExpenseAdd}
                      disabled={savingExpense}
                      className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 hover:bg-amber-100 p-0 flex-shrink-0"
                      title="Cộng dồn vào chi phí Khác"
                    >
                      {savingExpense ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm w-auto inline-flex h-fit self-start">
              <CardContent className="px-2 py-0 flex items-center justify-between gap-3">
                <span className="text-sm sm:text-base font-medium text-emerald-700 whitespace-nowrap">
                  Tổng định phí ngày
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                  {formatCurrency(totalExpense) || "0 ₫"}
                </span>
              </CardContent>
            </Card>

            <Card className="border-emerald-300 bg-emerald-50/50 shadow-sm w-auto inline-flex h-fit self-start">
              <CardContent className="px-2 py-0 flex items-center justify-between gap-3">
                <span className="text-sm sm:text-base font-medium text-emerald-700 whitespace-nowrap">
                  Tổng định phí tháng ({reportDays} ngày)
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                  {formatCurrency(totalExpenseActual) || "0 ₫"}
                </span>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm w-auto inline-flex h-fit self-start">
              <CardContent className="px-2 py-0 flex items-center justify-between gap-3">
                <span className="text-sm sm:text-base font-medium text-emerald-700 whitespace-nowrap">
                  Tổng DT trước thuế ({reportDays} ngày)
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                  {formatCurrency(totals.preTax) || "0 ₫"}
                </span>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ===== TAB 2: BÁO CÁO THEO NGÀY ===== */}
      {activeTab === "daily" && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3 rounded-lg border border-slate-300 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Từ ngày:</span>
              <Input
                type="date"
                value={selectedDailyStartDate}
                onChange={(e) => setSelectedDailyStartDate(e.target.value)}
                className="w-full sm:w-40 border-slate-300 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Đến ngày:</span>
              <Input
                type="date"
                value={selectedDailyEndDate}
                onChange={(e) => setSelectedDailyEndDate(e.target.value)}
                className="w-full sm:w-40 border-slate-300 h-9"
              />
            </div>
            <div className="text-xs text-slate-500 italic ml-auto">
              {dailyReportData.hasData ? (
                <span className="text-emerald-600 font-medium">
                  Đang xem {dailyReportData.filteredDays} ngày
                </span>
              ) : (
                "Chọn khoảng ngày để xem báo cáo"
              )}
            </div>
          </div>

          {!dailyReportData.hasData ? (
            <Card className="border-slate-300">
              <CardContent className="py-12 text-center text-slate-500 text-sm">
                {data.length === 0
                  ? "Chưa có dữ liệu báo cáo. Hãy thêm hoặc import doanh thu ngày."
                  : "Không có dữ liệu cho khoảng thời gian đã chọn. Vui lòng chọn lại."}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xl sm:text-2xl mb-2">
                <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10 text-slate-800 shrink-0" strokeWidth={2.2} />
                <div className="flex flex-col leading-tight">
                  <span className="font-black text-slate-900 uppercase tracking-wide text-2xl sm:text-3xl">
                    BÁO CÁO DOANH THU NHÀ HÀNG Maxim Saigon
                  </span>
                  <span className="text-slate-500 font-medium text-base sm:text-lg">
                    Từ {formatDateDisplay(selectedDailyStartDate)} đến {formatDateDisplay(selectedDailyEndDate)}
                  </span>
                </div>
              </div>

              <div className="w-full overflow-x-auto">
                <Table className="border-collapse border border-[#B8D3E8] tabular-nums w-auto min-w-full text-xl sm:text-2xl">
                  <TableHeader>
                    <TableRow className="bg-[#204878] hover:bg-[#204878]">
                      <TableHead className="border border-[#B8D3E8] text-white font-black whitespace-nowrap text-center px-4 py-4 text-xl sm:text-2xl min-w-[360px] sticky left-0 z-20 bg-[#204878]">
                        Nội dung báo cáo
                      </TableHead>
                      {dailyReportData.dates.map((dateStr) => (
                        <TableHead key={dateStr} className="border border-[#B8D3E8] text-white font-black whitespace-nowrap text-center px-4 py-2 text-lg sm:text-xl min-w-[160px]">
                          Trong ngày<br />
                          <span className="text-sm font-normal text-blue-100">
                            ({formatDateDisplay(dateStr)})
                          </span>
                        </TableHead>
                      ))}
                      <TableHead className="border border-[#B8D3E8] text-white font-black whitespace-nowrap text-center px-4 py-4 text-xl sm:text-2xl min-w-[180px] bg-[#1a3a63]">
                        Lũy kế tháng
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {/* Số lượt khách */}
                    <TableRow className="bg-[#F1F7FC] hover:bg-[#F1F7FC] border-b border-[#C7DCEC]">
                      <TableCell className="border border-[#C7DCEC] font-bold text-[#10284A] px-4 py-3 whitespace-nowrap text-left text-lg sm:text-xl sticky left-0 z-10 bg-[#F1F7FC]">
                        <div className="flex items-center gap-3">
                          <Users className="w-6 h-6 sm:w-7 sm:h-7 text-[#10284A] shrink-0" strokeWidth={1.8} />
                          <span>{dailyReportData.guestRows.label}</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#C7DCEC] p-0 align-middle text-[#10284A]">
                          <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                            <div className="flex-1 flex items-center justify-center py-2 px-2 text-[16px] sm:text-[18px] font-black bg-blue-100/30 min-w-[90px]">
                              {dailyReportData.guestRows.formatter(dailyReportData.guestRows.values[dateStr]?.total || 0)}
                            </div>
                            <div className="flex flex-col w-[140px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                                <span className="w-[80px] shrink-0 text-[#10284A] text-right pr-3 whitespace-nowrap">{dailyReportData.guestRows.formatter(dailyReportData.guestRows.values[dateStr]?.lunch || 0)}</span>
                              </div>
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                                <span className="w-[80px] shrink-0 text-[#10284A] text-right pr-3 whitespace-nowrap">{dailyReportData.guestRows.formatter(dailyReportData.guestRows.values[dateStr]?.dinner || 0)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#C7DCEC] p-0 align-middle bg-[#E8F5E9] text-[#10284A]">
                        <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                          <div className="flex-1 flex items-center justify-center py-2 px-2 text-[16px] sm:text-[18px] font-black text-[#168653] bg-green-200/30 min-w-[100px]">
                            {dailyReportData.guestRows.formatter(dailyReportData.guestRows.monthTotal.total)}
                          </div>
                          <div className="flex flex-col w-[150px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                              <span className="w-[90px] shrink-0 text-[#168653] text-right pr-3 whitespace-nowrap">{dailyReportData.guestRows.formatter(dailyReportData.guestRows.monthTotal.lunch)}</span>
                            </div>
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                              <span className="w-[90px] shrink-0 text-[#168653] text-right pr-3 whitespace-nowrap">{dailyReportData.guestRows.formatter(dailyReportData.guestRows.monthTotal.dinner)}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Chi tiêu bình quân */}
                    <TableRow className="bg-white hover:bg-white border-b border-[#C7DCEC]">
                      <TableCell className="border border-[#C7DCEC] font-bold text-[#10284A] px-4 py-3 whitespace-nowrap text-left text-lg sm:text-xl sticky left-0 z-10 bg-white">
                        <div className="flex items-center gap-3">
                          <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-[#10284A] shrink-0" strokeWidth={1.8} />
                          <span>{dailyReportData.avgRows.label}</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#C7DCEC] align-middle text-center text-[#1761D2] font-black text-[16px] sm:text-[17px] whitespace-nowrap py-3 px-3">
                          {dailyReportData.avgRows.formatter(dailyReportData.avgRows.values[dateStr]?.total || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#C7DCEC] align-middle bg-[#E8F5E9] text-center text-[#168653] font-black text-[16px] sm:text-[17px] whitespace-nowrap py-3 px-3">
                        {dailyReportData.avgRows.formatter(dailyReportData.avgRows.monthTotal.total)}
                      </TableCell>
                    </TableRow>

                    {/* Doanh thu đồ ăn */}
                    <TableRow className="bg-[#F1F7FC] hover:bg-[#F1F7FC] border-b border-[#C7DCEC]">
                      <TableCell className="border border-[#C7DCEC] font-bold text-[#10284A] px-4 py-3 whitespace-nowrap text-left text-lg sm:text-xl sticky left-0 z-10 bg-[#F1F7FC]">
                        <div className="flex items-center gap-3">
                          <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7 text-[#10284A] shrink-0" strokeWidth={1.8} />
                          <span>{dailyReportData.foodRows.label}</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#C7DCEC] p-0 align-middle text-[#10284A]">
                          <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                            <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-blue-100/30 min-w-[110px] whitespace-nowrap">
                              {dailyReportData.foodRows.formatter(dailyReportData.foodRows.values[dateStr]?.total || 0)}
                            </div>
                            <div className="flex flex-col w-[160px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                                <span className="w-[100px] shrink-0 text-[#10284A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.foodRows.values[dateStr]?.lunch || 0)}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                                <span className="w-[100px] shrink-0 text-[#10284A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.foodRows.values[dateStr]?.dinner || 0)}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#C7DCEC] p-0 align-middle bg-[#E8F5E9] text-[#10284A]">
                        <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                          <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-green-200/30 min-w-[120px] whitespace-nowrap">
                            {dailyReportData.foodRows.formatter(dailyReportData.foodRows.monthTotal.total)}
                          </div>
                          <div className="flex flex-col w-[170px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                              <span className="w-[110px] shrink-0 text-[#168653] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.foodRows.monthTotal.lunch)}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                              <span className="w-[110px] shrink-0 text-[#168653] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.foodRows.monthTotal.dinner)}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Doanh thu nước uống */}
                    <TableRow className="bg-white hover:bg-white border-b border-[#C7DCEC]">
                      <TableCell className="border border-[#C7DCEC] font-bold text-[#10284A] px-4 py-3 whitespace-nowrap text-left text-lg sm:text-xl sticky left-0 z-10 bg-white">
                        <div className="flex items-center gap-3">
                          <CupSoda className="w-6 h-6 sm:w-7 sm:h-7 text-[#10284A] shrink-0" strokeWidth={1.8} />
                          <span>{dailyReportData.drinkRows.label}</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#C7DCEC] p-0 align-middle text-[#10284A]">
                          <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                            <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-blue-100/30 min-w-[110px] whitespace-nowrap">
                              {dailyReportData.drinkRows.formatter(dailyReportData.drinkRows.values[dateStr]?.total || 0)}
                            </div>
                            <div className="flex flex-col w-[160px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                                <span className="w-[100px] shrink-0 text-[#10284A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.drinkRows.values[dateStr]?.lunch || 0)}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                                <span className="w-[100px] shrink-0 text-[#10284A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.drinkRows.values[dateStr]?.dinner || 0)}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#C7DCEC] p-0 align-middle bg-[#E8F5E9] text-[#10284A]">
                        <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                          <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-green-200/30 min-w-[120px] whitespace-nowrap">
                            {dailyReportData.drinkRows.formatter(dailyReportData.drinkRows.monthTotal.total)}
                          </div>
                          <div className="flex flex-col w-[170px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                              <span className="w-[110px] shrink-0 text-[#168653] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.drinkRows.monthTotal.lunch)}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                              <span className="w-[110px] shrink-0 text-[#168653] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.drinkRows.monthTotal.dinner)}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Doanh thu khác */}
                    <TableRow className="bg-[#F1F7FC] hover:bg-[#F1F7FC] border-b border-[#C7DCEC]">
                      <TableCell className="border border-[#C7DCEC] font-bold text-[#10284A] px-4 py-3 whitespace-nowrap text-left text-lg sm:text-xl sticky left-0 z-10 bg-[#F1F7FC]">
                        <div className="flex items-center gap-3">
                          <CircleEllipsis className="w-6 h-6 sm:w-7 sm:h-7 text-[#10284A] shrink-0" strokeWidth={1.8} />
                          <span>{dailyReportData.otherRows.label}</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#C7DCEC] p-0 align-middle text-[#10284A]">
                          <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                            <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-blue-100/30 min-w-[110px] whitespace-nowrap">
                              {dailyReportData.otherRows.formatter(dailyReportData.otherRows.values[dateStr]?.total || 0)}
                            </div>
                            <div className="flex flex-col w-[160px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                                <span className="w-[100px] shrink-0 text-[#10284A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.otherRows.values[dateStr]?.lunch || 0)}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                                <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                                <span className="w-[100px] shrink-0 text-[#10284A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.otherRows.values[dateStr]?.dinner || 0)}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#C7DCEC] p-0 align-middle bg-[#E8F5E9] text-[#10284A]">
                        <div className="flex h-full w-full divide-x divide-[#C7DCEC]">
                          <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-green-200/30 min-w-[120px] whitespace-nowrap">
                            {dailyReportData.otherRows.formatter(dailyReportData.otherRows.monthTotal.total)}
                          </div>
                          <div className="flex flex-col w-[170px] shrink-0 justify-center divide-y divide-[#C7DCEC]/50">
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Trưa</span>
                              <span className="w-[110px] shrink-0 text-[#168653] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.otherRows.monthTotal.lunch)}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-slate-600">
                              <span className="w-[60px] shrink-0 border-r border-[#C7DCEC] pl-2 flex items-center">Tối</span>
                              <span className="w-[110px] shrink-0 text-[#168653] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.otherRows.monthTotal.dinner)}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>

                  <TableFooter>
                    {/* Tổng doanh thu trước thuế */}
                    <TableRow className="bg-[#204878] hover:bg-[#204878]">
                      <TableCell className="border border-[#8FB4D5] text-left font-black text-white px-4 py-3 whitespace-nowrap text-lg sm:text-xl sticky left-0 z-20 bg-[#204878]">
                        <div className="flex items-center gap-3">
                          <Calculator className="w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0" strokeWidth={1.8} />
                          <span>Tổng doanh thu trước thuế</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#8FB4D5] p-0 align-middle text-white">
                          <div className="flex h-full w-full divide-x divide-[#8FB4D5]/50">
                            <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-[#2a598a] text-[#FFC35A] min-w-[110px] whitespace-nowrap">
                              {formatCurrency(dailyReportData.footerTotals[dateStr]?.preTax) || "0"}
                            </div>
                            <div className="flex flex-col w-[170px] shrink-0 justify-center divide-y divide-[#8FB4D5]/50">
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#FFC35A]/80">
                                <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Trưa</span>
                                <span className="w-[110px] shrink-0 text-[#FFC35A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.footerTotals[dateStr]?.lunchPreTax) || "0"}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#FFC35A]/80">
                                <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Tối</span>
                                <span className="w-[110px] shrink-0 text-[#FFC35A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.footerTotals[dateStr]?.dinnerPreTax) || "0"}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#8FB4D5] p-0 align-middle bg-[#1a3a63] text-[#FFC35A]">
                        <div className="flex h-full w-full divide-x divide-[#8FB4D5]/50">
                          <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-[#183b66] text-[#FFD580] min-w-[120px] whitespace-nowrap">
                            {formatCurrency(dailyReportData.monthPreTax) || "0"}
                          </div>
                          <div className="flex flex-col w-[180px] shrink-0 justify-center divide-y divide-[#8FB4D5]/50">
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#FFC35A]/80">
                              <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Trưa</span>
                              <span className="w-[120px] shrink-0 text-[#FFC35A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.monthLunchPreTax) || "0"}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#FFC35A]/80">
                              <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Tối</span>
                              <span className="w-[120px] shrink-0 text-[#FFC35A] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.monthDinnerPreTax) || "0"}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Tổng doanh thu bao gồm thuế */}
                    <TableRow className="bg-[#17365D] hover:bg-[#17365D]">
                      <TableCell className="border border-[#8FB4D5] text-left font-black text-white px-4 py-3 whitespace-nowrap text-lg sm:text-xl sticky left-0 z-20 bg-[#17365D]">
                        <div className="flex items-center gap-3">
                          <ReceiptText className="w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0" strokeWidth={1.8} />
                          <span>Tổng doanh thu bao gồm thuế</span>
                        </div>
                      </TableCell>
                      {dailyReportData.dates.map(dateStr => (
                        <TableCell key={dateStr} className="border border-[#8FB4D5] p-0 align-middle text-white">
                          <div className="flex h-full w-full divide-x divide-[#8FB4D5]/50">
                            <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-[#22507f] text-[#68F0B0] min-w-[110px] whitespace-nowrap">
                              {formatCurrency(dailyReportData.footerTotals[dateStr]?.gross) || "0"}
                            </div>
                            <div className="flex flex-col w-[170px] shrink-0 justify-center divide-y divide-[#8FB4D5]/50">
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#68F0B0]/80">
                                <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Trưa</span>
                                <span className="w-[110px] shrink-0 text-[#68F0B0] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.footerTotals[dateStr]?.lunchGross) || "0"}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                              <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#68F0B0]/80">
                                <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Tối</span>
                                <span className="w-[110px] shrink-0 text-[#68F0B0] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                  <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.footerTotals[dateStr]?.dinnerGross) || "0"}</span>
                                  <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="border border-[#8FB4D5] p-0 align-middle bg-[#132c4e] text-[#68F0B0]">
                        <div className="flex h-full w-full divide-x divide-[#8FB4D5]/50">
                          <div className="flex-1 flex items-center justify-center py-2 px-2 text-[15px] sm:text-[17px] font-black bg-[#102745] text-[#A0FFC8] min-w-[120px] whitespace-nowrap">
                            {formatCurrency(dailyReportData.monthGross) || "0"}
                          </div>
                          <div className="flex flex-col w-[180px] shrink-0 justify-center divide-y divide-[#8FB4D5]/50">
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#68F0B0]/80">
                              <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Trưa</span>
                              <span className="w-[120px] shrink-0 text-[#68F0B0] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.monthLunchGross) || "0"}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                            <div className="flex items-stretch py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#68F0B0]/80">
                              <span className="w-[60px] shrink-0 border-r border-[#8FB4D5] pl-2 flex items-center">Tối</span>
                              <span className="w-[120px] shrink-0 text-[#68F0B0] text-right pr-2 whitespace-nowrap flex justify-end items-center">
                                <span className="flex-1 min-w-0 text-right tabular-nums">{formatCurrencyNoUnit(dailyReportData.monthDinnerGross) || "0"}</span>
                                <span className="w-[18px] shrink-0 text-left pl-1">đ</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">Định phí ngày</h2>
                  {savingExpense && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {renderExpenseCard("rent", "Mặt bằng")}
                  {renderExpenseCard("electricity", "Điện")}
                  {renderExpenseCard("water", "Nước")}
                  {renderExpenseCard("internet", "Internet")}
                  {renderExpenseCard("telephone", "Điện thoại")}
                  {renderExpenseCard("garbage", "Rác")}
                  {renderExpenseCard("employeeSalary", "Lương nhân viên")}

                  <Card className="border-amber-200 bg-amber-50/50 shadow-sm w-auto inline-flex h-fit self-start">
                    <CardContent className="px-3 py-1 flex items-center justify-between gap-3 min-w-[200px]">
                      <span className="text-sm sm:text-base font-medium text-amber-700 whitespace-nowrap">
                        Khác
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-base sm:text-lg font-bold text-amber-700 whitespace-nowrap tabular-nums">
                          {formatCurrency(monthlyExpenses.otherExpense) || "0 ₫"}
                        </span>
                        <Input
                          type="text"
                          placeholder="+"
                          value={otherExpenseInput}
                          onChange={(e) => setOtherExpenseInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleOtherExpenseAdd();
                            }
                          }}
                          className="w-16 sm:w-20 h-5 sm:h-6 text-[10px] sm:text-[12px] text-right border-amber-300 focus-visible:ring-amber-500 p-0.5 tabular-nums"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleOtherExpenseAdd}
                          disabled={savingExpense}
                          className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 hover:bg-amber-100 p-0 flex-shrink-0"
                          title="Cộng dồn vào chi phí Khác"
                        >
                          {savingExpense ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm w-auto inline-flex h-fit self-start">
                  <CardContent className="px-2 py-0 flex items-center justify-between gap-3">
                    <span className="text-sm sm:text-base font-medium text-emerald-700 whitespace-nowrap">
                      Tổng định phí ngày
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                      {formatCurrency(totalExpense) || "0 ₫"}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-emerald-300 bg-emerald-50/50 shadow-sm w-auto inline-flex h-fit self-start">
                  <CardContent className="px-2 py-0 flex items-center justify-between gap-3">
                    <span className="text-sm sm:text-base font-medium text-emerald-700 whitespace-nowrap">
                      Tổng định phí tháng ({reportDays} ngày)
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                      {formatCurrency(totalExpenseActual) || "0 ₫"}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm w-auto inline-flex h-fit self-start">
                  <CardContent className="px-2 py-0 flex items-center justify-between gap-3">
                    <span className="text-sm sm:text-base font-medium text-emerald-700 whitespace-nowrap">
                      Tổng DT trước thuế ({reportDays} ngày)
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                      {formatCurrency(totals.preTax) || "0 ₫"}
                    </span>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <strong>Lưu ý:</strong> "DT trước thuế" là doanh thu gốc (chưa VAT). Cột "tháng" là tổng toàn bộ các ngày đã nhập trong tháng. Mỗi ô dữ liệu hiển thị: <strong>Tổng (bên trái)</strong> và <em>Trưa (trên), Tối (dưới) (bên phải)</em>.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyReport;
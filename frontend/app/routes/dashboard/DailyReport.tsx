import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, ArrowUp, ArrowDown, Download, Search, Plus, Trash2, EyeOff, Eye, CalendarDays, Upload, Loader2, Save, Check, X } from "lucide-react";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import { fetchData, updateData, postData, deleteData } from "@/lib/fetch-util";
import * as XLSX from "xlsx";

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
  foodRevenue: number;
  drinkRevenue: number;
  otherRevenue: number;
  preTaxRevenue: number; 
  totalGross: number; 
  guestCount: number;
  billCount: number;
  note?: string;
}

// ===== CHI PHÍ THÁNG (thuộc MonthlyReport) =====
export interface MonthlyExpense {
  _id?: string;
  monthKey?: string;
  title?: string;
  rent: number;              // Mặt bằng
  electricity: number;       // Điện
  water: number;             // Nước
  internet: number;          // Internet
  telephone: number;         // Điện thoại
  garbage: number;           // Rác
  employeeSalary: number;    // Lương nhân viên
  otherExpense: number;      // Khác (cộng dồn)
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  skippedDates?: string[];
}

const DailyReport = () => {
  const { reportId } = useParams<{ reportId: string }>(); 
  const navigate = useNavigate();

  const [data, setData] = useState<DailyRevenue[]>([]);
  const [search, setSearch] = useState("");
  const [weekFilter, setWeekFilter] = useState("all");
  
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [showFounderPoints, setShowFounderPoints] = useState(false);
  const [showNote, setShowNote] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editRowRef = useRef<HTMLTableRowElement>(null);

  // ===== STATE CHI PHÍ THÁNG =====
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense>({
    rent: 0, electricity: 0, water: 0, internet: 0,
    telephone: 0, garbage: 0, employeeSalary: 0, otherExpense: 0,
  });

  // ===== STATE CHO Ô ĐANG EDIT CHI PHÍ THÁNG =====
  const [editingExpenseField, setEditingExpenseField] = useState<keyof MonthlyExpense | null>(null);
  const [expenseInputValue, setExpenseInputValue] = useState<string>("");
  const [savingExpense, setSavingExpense] = useState(false);

  // ===== STATE CHO Ô NHẬP "KHÁC" (CỘNG DỒN) =====
  const [otherExpenseInput, setOtherExpenseInput] = useState<string>("");

  // ===== HÀM CHUYỂN ĐỔI DATE -> YYYY-MM-DD (LUÔN LẤY GIỜ LOCAL) =====
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

  // ===== LẤY DỮ LIỆU DOANH THU =====
  useEffect(() => {
    if (reportId) {
      const fetchRevenues = async () => {
        try {
          const result = (await fetchData(`/daily-revenues?reportId=${reportId}`)) as ApiResponse<DailyRevenue[]>; 
          if (result.success) {
            const formattedData = result.data.map(item => ({
              ...item,
              date: convertUTCToLocalDate(item.date)
            }));
            setData(formattedData);
          }
        } catch (error) {
          console.error("Lỗi khi tải dữ liệu:", error);
        }
      };
      fetchRevenues();
    }
  }, [reportId]);

  // ===== LẤY DỮ LIỆU CHI PHÍ THÁNG TỪ MonthlyReport =====
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

  // ===== FORMAT =====
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
    return Math.round((food + drink + other) * 1.05);
  };

  const hasNewColumns = (row: DailyRevenue | any): boolean => {
    return (
      Number(row.foodRevenue) > 0 ||
      Number(row.drinkRevenue) > 0 ||
      Number(row.otherRevenue) > 0
    );
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

  // ===== LƯU CHI PHÍ THÁNG VÀO MonthlyReport =====
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

  // ===== BẮT ĐẦU EDIT CHI PHÍ THÁNG =====
  const handleStartEditExpense = (field: keyof MonthlyExpense) => {
    setEditingExpenseField(field);
    setExpenseInputValue(formatCurrencyNoUnit(monthlyExpenses[field] as number) || "");
  };

  // ===== LƯU FIELD CHI PHÍ ĐANG EDIT =====
  const handleSaveExpenseField = async () => {
    if (!editingExpenseField) return;
    const numValue = parseNumberFromString(expenseInputValue);
    const updated = { ...monthlyExpenses, [editingExpenseField]: numValue };
    setMonthlyExpenses(updated);
    setEditingExpenseField(null);
    setExpenseInputValue("");
    await saveMonthlyExpenses(updated);
  };

  // ===== HUỶ EDIT =====
  const handleCancelEditExpense = () => {
    setEditingExpenseField(null);
    setExpenseInputValue("");
  };

  // ===== CỘNG DỒN "KHÁC" =====
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

  // ===== LƯU TỪNG DÒNG DOANH THU =====
  const handleSaveRow = async (row: DailyRevenue) => {
    if (!row._id) return;
    setSavingRowId(row._id);
    try {
      const payload = { ...row };
      payload.totalGross = calculateTotalGross(payload);
      payload.preTaxRevenue = calculatePreTaxRevenue(payload);
      
      const result = (await updateData(`/daily-revenues/${row._id}`, payload)) as ApiResponse<DailyRevenue>;
      if (result.success) {
        setData(prev => prev.map(item => 
          item._id === row._id ? { ...result.data, date: convertUTCToLocalDate(result.data.date) } : item
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

  const updateLocalRow = (rowId: string, field: keyof DailyRevenue, rawValue: any) => {
    setData(prev => {
      const newData = prev.map(item => {
        if (item._id === rowId) {
          let processedValue = rawValue;
          if (typeof rawValue === 'string' && field !== 'date' && field !== 'note' && field !== 'dayOfWeek') {
            processedValue = parseNumberFromString(rawValue);
          }
          const updated = { ...item, [field]: processedValue };
          updated.totalGross = calculateTotalGross(updated);
          updated.preTaxRevenue = calculatePreTaxRevenue(updated);
          return updated;
        }
        return item;
      });
      return newData;
    });
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

  // ======================== IMPORT EXCEL ========================
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
        const foodRevenue = parseNumber(row[7] || 0);
        const drinkRevenue = parseNumber(row[8] || 0);
        const otherRevenue = parseNumber(row[9] || 0);
        const preTaxRevenue = Math.round((foodRevenue + drinkRevenue + otherRevenue) * 1.05);
        const totalGross = cash + transfer + card + debt + founderPoints;
        const guestCount = parseNumber(row[12] || 0);
        const billCount = parseNumber(row[13] || 0);
        const note = String(row[14] || "").trim();
        const finalDayOfWeek = dayOfWeek || getDayOfWeekFromDate(dateObj);

        importedData.push({
          reportId, date: dateStrFormatted, dayOfWeek: finalDayOfWeek,
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
        const formattedResult = result.data.map(item => ({
          ...item,
          date: convertUTCToLocalDate(item.date)
        }));
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

  // ======================== THÊM MỚI ========================
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
      cash: 0, transfer: 0, card: 0, debt: 0, founderPoints: 0,
      foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
      preTaxRevenue: 0, totalGross: 0, guestCount: 0, billCount: 0,
      note: "",
    };

    try {
      const result = (await postData("/daily-revenues", newRow)) as ApiResponse<DailyRevenue>;
      if (result.success) {
        const formattedResult = {
          ...result.data,
          date: convertUTCToLocalDate(result.data.date)
        };
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

  // ======================== XỬ LÝ DỮ LIỆU ========================
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
            founderPoints: 0, foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
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
        preTax: acc.preTax + group.totals.preTax, 
        totalGross: acc.totalGross + group.totals.totalGross, 
        guest: acc.guest + group.totals.guestCount, 
        bill: acc.bill + group.totals.billCount,
      };
    }, { 
      cash: 0, transfer: 0, card: 0, debt: 0, founderPoints: 0, 
      foodRevenue: 0, drinkRevenue: 0, otherRevenue: 0,
      preTax: 0, totalGross: 0, guest: 0, bill: 0,
    });
    return { totals: t, totalDays: days };
  }, [groupedData]);

  const avgPerGuest = totals.guest > 0 ? totals.totalGross / totals.guest : 0;

  // ===== TỔNG CHI PHÍ THÁNG =====
  const totalExpense = useMemo(() => {
    return (monthlyExpenses.rent || 0) + (monthlyExpenses.electricity || 0) + 
           (monthlyExpenses.water || 0) + (monthlyExpenses.internet || 0) + 
           (monthlyExpenses.telephone || 0) + (monthlyExpenses.garbage || 0) + 
           (monthlyExpenses.employeeSalary || 0) + (monthlyExpenses.otherExpense || 0);
  }, [monthlyExpenses]);

  // ===== LỢI NHUẬN = DT TRƯỚC THUẾ - TỔNG CHI PHÍ =====
  const profit = useMemo(() => {
    return (totals.preTax || 0) - totalExpense;
  }, [totals.preTax, totalExpense]);

  // ===== EXPORT EXCEL =====
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
        "Doanh thu món ăn": hasNewCols ? (row.foodRevenue || 0) : "",
        "Doanh thu đồ uống": hasNewCols ? (row.drinkRevenue || 0) : "",
        "Doanh thu khác": hasNewCols ? (row.otherRevenue || 0) : "",
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
      "Doanh thu món ăn": totals.foodRevenue || 0,
      "Doanh thu đồ uống": totals.drinkRevenue || 0,
      "Doanh thu khác": totals.otherRevenue || 0,
      "DT trước thuế & PPV": totals.preTax,
      "Tổng DT (VAT)": totals.totalGross,
      "Số khách": totals.guest,
      "DT / Khách": Math.round(avgPerGuest),
      "Số bill": totals.bill,
      "Ghi chú": ""
    };
    exportData.push(totalRow);

    // ===== SHEET CHI PHÍ THÁNG =====
    const expenseData = [
      { "Khoản chi": "Mặt bằng", "Số tiền": monthlyExpenses.rent || 0 },
      { "Khoản chi": "Điện", "Số tiền": monthlyExpenses.electricity || 0 },
      { "Khoản chi": "Nước", "Số tiền": monthlyExpenses.water || 0 },
      { "Khoản chi": "Internet", "Số tiền": monthlyExpenses.internet || 0 },
      { "Khoản chi": "Điện thoại", "Số tiền": monthlyExpenses.telephone || 0 },
      { "Khoản chi": "Rác", "Số tiền": monthlyExpenses.garbage || 0 },
      { "Khoản chi": "Lương nhân viên", "Số tiền": monthlyExpenses.employeeSalary || 0 },
      { "Khoản chi": "Khác", "Số tiền": monthlyExpenses.otherExpense || 0 },
      { "Khoản chi": "TỔNG CHI PHÍ", "Số tiền": totalExpense },
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

  // ===== RENDER Ô CHI PHÍ EDITABLE =====
  const renderExpenseCard = (
  field: keyof MonthlyExpense,
  label: string,
) => {
  const isEditing = editingExpenseField === field;
  const value = monthlyExpenses[field] as number;

  return (
  <Card className="border-amber-200 bg-amber-50/50 shadow-sm w-auto inline-flex h-fit self-start">
    <CardContent className="px-2 py-0 flex items-center justify-between gap-2">
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
            className="w-24 sm:w-32 h-6 sm:h-7 text-right text-[10px] sm:text-[13px] border-amber-300 focus-visible:ring-amber-500 p-0.5"
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
className="text-base sm:text-lg font-bold text-amber-700 whitespace-nowrap cursor-pointer hover:bg-amber-100 px-2 py-0.5 rounded transition-colors"          title="Click để chỉnh sửa"
        >
          {formatCurrency(value) || "0 ₫"}
        </span>
      )}
    </CardContent>
  </Card>
);
};

  return (
    <div className="space-y-4 p-4 sm:p-6">
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

          <Button 
            variant="outline" 
            onClick={() => setShowFounderPoints(!showFounderPoints)} 
            className="gap-1 sm:gap-2 bg-slate-50 text-slate-700 border-slate-300 text-xs sm:text-sm px-2 sm:px-4"
          >
            {showFounderPoints ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />} 
            <span className="hidden xs:inline">Điểm Founder</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setShowNote(!showNote)} 
            className="gap-1 sm:gap-2 bg-slate-50 text-slate-700 border-slate-300 text-xs sm:text-sm px-2 sm:px-4"
          >
            {showNote ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />} 
            <span className="hidden xs:inline">Ghi chú</span>
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

          <Button variant="outline" className="gap-1 sm:gap-2 border-slate-300 text-xs sm:text-sm px-2 sm:px-4" onClick={handleExportExcel}>
            <Download className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Xuất Excel</span>
          </Button>
          
          <Button className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4" onClick={handleAddRow}>
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Thêm</span>
          </Button>
        </div>
      </div>

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
      <Card className="border-slate-300 overflow-hidden">
        <div className="rounded-md overflow-x-auto">
          <Table className="border-collapse w-max min-w-full table-fixed text-xs sm:text-sm">
            <TableHeader>
              <TableRow className="bg-slate-200">
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Ngày</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Thứ</TableHead>
                {!isCompactMode ? (
                  <>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Tiền mặt</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Chuyển khoản</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Cà thẻ</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Công nợ</TableHead>
                    {showFounderPoints && (
                      <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Điểm Founder</TableHead>
                    )}
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT Món ăn trước thuế</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT Đồ uống trước thuế</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT Khác trước thuế</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT Món ăn trước thuế</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT Đồ uống trước thuế</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT Khác trước thuế</TableHead>
                  </>
                )}
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">DT trước thuế</TableHead>
                <TableHead className="border border-slate-300 text-primary font-extrabold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Tổng DT (VAT)</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">SL Khách</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Tiêu dùng/Khách</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">SL Bill</TableHead>
                {showNote && (
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap min-w-[220px] px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[13px]">Ghi chú</TableHead>
                )}
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Lưu</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">Xoá</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {filteredGroupedData.length > 0 ? filteredGroupedData.map((group) => (
                <React.Fragment key={group.key}>
                  <TableRow className="bg-slate-700 hover:bg-slate-700 text-white font-bold">
                    <TableCell colSpan={2} className="border border-slate-600 font-black text-center whitespace-nowrap bg-slate-800 text-white px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px]">
                      TUẦN {group.weekNum}
                    </TableCell>
                    {!isCompactMode ? (
                      <>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.cash) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.transfer) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.card) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.debt) || "0"}</TableCell>
                        {showFounderPoints && (
                          <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.founderPoints) || "0"}</TableCell>
                        )}
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.foodRevenue) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.drinkRevenue) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.otherRevenue) || "0"}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.foodRevenue) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.drinkRevenue) || "0"}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{formatCurrency(group.totals.otherRevenue) || "0"}</TableCell>
                      </>
                    )}
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-orange-200">{formatCurrency(group.totals.preTax) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-white bg-slate-800">{formatCurrency(group.totals.totalGross) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-center font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{group.totals.guestCount}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-blue-200">{formatAvgGuest(group.totals.guestCount > 0 ? group.totals.totalGross / group.totals.guestCount : 0) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-center font-medium whitespace-nowrap px-1 py-1 sm:px-2 sm:py-1.5 text-[10px] sm:text-[13px] text-slate-100">{group.totals.billCount}</TableCell>
                    {showNote && (
                      <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-1.5 bg-slate-700"></TableCell>
                    )}
                    <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-1.5 bg-slate-700"></TableCell>
                    <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-1.5 bg-slate-700"></TableCell>
                  </TableRow>

                  {group.records.map((row: DailyRevenue) => {
                    const isEditing = editingId === row._id;
                    const totalGross = calculateTotalGross(row);
                    const avgGuest = Number(row.guestCount || 0) > 0 ? totalGross / Number(row.guestCount) : 0;
                    const isSaving = savingRowId === row._id;
                    const preTaxDisplay = calculatePreTaxRevenue(row);
                    const hasNewCols = hasNewColumns(row);
                    
                    return (
                      <TableRow 
                        key={row._id} 
                        ref={isEditing ? editRowRef : null}
                        className={isEditing ? "bg-emerald-50/60 outline-2 outline-emerald-400 -outline-offset-2 relative z-10" : "hover:bg-slate-50 transition-colors"}
                      >
                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                          <Input type="date" defaultValue={row.date}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => updateLocalRow(row._id!, "date", e.target.value)}
                            className="w-20 sm:w-32 h-6 sm:h-7 text-[10px] sm:text-[13px] border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 p-0.5 sm:p-1" />
                        </TableCell>
                        
                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap bg-slate-50">
                          <div className="w-14 sm:w-20 h-6 sm:h-7 text-[10px] sm:text-[13px] font-bold text-slate-700 text-center flex items-center justify-center">
                            {row.dayOfWeek}
                          </div>
                        </TableCell>

                        {!isCompactMode ? (
                          <>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.cash)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleNumberFieldInput(row._id!, "cash", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1" 
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.transfer)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleNumberFieldInput(row._id!, "transfer", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.card)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleNumberFieldInput(row._id!, "card", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.debt)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleNumberFieldInput(row._id!, "debt", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            {showFounderPoints && (
                              <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                                <Input type="text" 
                                  defaultValue={formatCurrencyNoUnit(row.founderPoints)}
                                  onFocus={() => row._id && setEditingId(row._id)}
                                  onBlur={(e) => handleNumberFieldInput(row._id!, "founderPoints", e.target.value)}
                                  className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                                />
                              </TableCell>
                            )}
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={hasNewCols ? formatCurrencyNoUnit(row.foodRevenue) : ""}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleRevenueInput(row._id!, "foodRevenue", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={hasNewCols ? formatCurrencyNoUnit(row.drinkRevenue) : ""}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleRevenueInput(row._id!, "drinkRevenue", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={hasNewCols ? formatCurrencyNoUnit(row.otherRevenue) : ""}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleRevenueInput(row._id!, "otherRevenue", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={hasNewCols ? formatCurrencyNoUnit(row.foodRevenue) : ""}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleRevenueInput(row._id!, "foodRevenue", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={hasNewCols ? formatCurrencyNoUnit(row.drinkRevenue) : ""}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleRevenueInput(row._id!, "drinkRevenue", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={hasNewCols ? formatCurrencyNoUnit(row.otherRevenue) : ""}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => handleRevenueInput(row._id!, "otherRevenue", e.target.value)}
                                className="w-16 sm:w-28 text-right h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                              />
                            </TableCell>
                          </>
                        )}

                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                          <Input type="text" 
                            value={formatCurrencyNoUnit(preTaxDisplay) || "0"}
                            readOnly
                            className="w-16 sm:w-32 text-right h-6 sm:h-7 bg-orange-50 border-orange-200 font-bold text-orange-700 text-[10px] sm:text-[13px] p-0.5 sm:p-1" />
                        </TableCell>

                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 text-right font-extrabold text-primary whitespace-nowrap bg-primary/5 text-[10px] sm:text-[13px]">
                          {formatCurrency(totalGross) || "0 ₫"}
                        </TableCell>

                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                          <Input type="text" 
                            defaultValue={row.guestCount || ""}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => handleNumberFieldInput(row._id!, "guestCount", e.target.value)}
                            className="w-10 sm:w-14 text-center h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                          />
                        </TableCell>

                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 text-right font-bold text-blue-600 whitespace-nowrap bg-blue-50/30 text-[10px] sm:text-[13px]">
                          {formatAvgGuest(avgGuest) || "0 ₫"}
                        </TableCell>

                        <TableCell className="border border-slate-300 p-0.5 sm:p-1 whitespace-nowrap">
                          <Input type="text" 
                            defaultValue={row.billCount || ""}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => handleNumberFieldInput(row._id!, "billCount", e.target.value)}
                            className="w-10 sm:w-14 text-center h-6 sm:h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[10px] sm:text-[13px] font-medium p-0.5 sm:p-1"
                          />
                        </TableCell>

                        {showNote && (
                          <TableCell className="border border-slate-300 p-0.5 sm:p-1 min-w-[220px] align-top">
                            <textarea
                              ref={(el) => {
                                if (el) {
                                  autoResizeTextarea(el);
                                }
                              }}
                              defaultValue={row.note || ""}
                              rows={1}
                              onFocus={() => row._id && setEditingId(row._id)}
                              onBlur={(e) => updateLocalRow(row._id!, "note", e.target.value)}
                              onKeyDown={(e) => handleTextareaKeyDown(e, row)}
                              onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                              className="w-full min-w-[220px] overflow-hidden resize-none rounded-md border border-transparent bg-transparent p-0.5 sm:p-1 text-[10px] sm:text-[13px] hover:border-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                            />
                          </TableCell>
                        )}

                        <TableCell className="border border-slate-300 text-center whitespace-nowrap px-0.5 sm:px-2 py-0.5 sm:py-1.5">
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

                        <TableCell className="border border-slate-300 text-center whitespace-nowrap px-0.5 sm:px-2 py-0.5 sm:py-1.5">
                          <div className="flex items-center justify-center">
                            <Button size="icon" variant="ghost" onClick={()=>row._id && handleDeleteRow(row._id)} className="text-red-500 hover:bg-red-100 h-5 w-5 sm:h-7 sm:w-7">
                              <Trash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5"/>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              )) : (<TableRow><TableCell colSpan={showNote ? 16 : 15} className="border border-slate-300 h-24 sm:h-32 text-center text-muted-foreground font-medium text-[10px] sm:text-[13px]">Chưa có dữ liệu. Hãy thêm doanh thu ngày.</TableCell></TableRow>)}
            </TableBody>
            
            <TableFooter className="bg-slate-800 text-white sticky bottom-0 z-10 border-t-4 border-slate-900">
              <TableRow className="hover:bg-slate-800">
                <TableCell colSpan={2} className="border border-slate-600 text-center font-black text-white whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-sm bg-slate-900">TỔNG ({totalDays} Ngày)</TableCell>
                {!isCompactMode ? (
                  <>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.cash) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.transfer) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.card) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.debt) || "0"}</TableCell>
                    {showFounderPoints && (
                      <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.founderPoints) || "0"}</TableCell>
                    )}
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.foodRevenue) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.drinkRevenue) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.otherRevenue) || "0"}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.foodRevenue) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.drinkRevenue) || "0"}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.otherRevenue) || "0"}</TableCell>
                  </>
                )}
                <TableCell className="border border-slate-600 text-right font-bold text-orange-300 whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatCurrency(totals.preTax) || "0"}</TableCell>
                <TableCell className="border border-slate-600 text-right font-black text-white whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-sm bg-slate-900">{formatCurrency(totals.totalGross) || "0"}</TableCell>
                <TableCell className="border border-slate-600 text-center font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{totals.guest}</TableCell>
                <TableCell className="border border-slate-600 text-right font-bold text-blue-200 whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{formatAvgGuest(avgPerGuest) || "0"}</TableCell>
                <TableCell className="border border-slate-600 text-center font-bold whitespace-nowrap px-1 py-1 sm:px-2 sm:py-2 text-[10px] sm:text-[13px]">{totals.bill}</TableCell>
                {showNote && (
                  <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-2"></TableCell>
                )}
                <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-2"></TableCell>
                <TableCell className="border border-slate-600 px-1 py-1 sm:px-2 sm:py-2"></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>

      {/* ===== CHI PHÍ THÁNG (EDITABLE) ===== */}
      <div className="space-y-2">
  <div className="flex items-center justify-between">
    <h2 className="text-base sm:text-lg font-bold text-slate-800">Định phí tháng</h2>
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

    {/* Ô "Khác" đặc biệt - cộng dồn */}
    <Card className="border-amber-200 bg-amber-50/50 shadow-sm w-auto inline-flex h-fit self-start">
      <CardContent className="px-2 py-0.5 flex items-center justify-between gap-2">
        <span className="text-sm sm:text-base font-medium text-amber-700 whitespace-nowrap">
  Khác
</span>
        <div className="flex items-center gap-1">
          <span className="text-sm sm:text-base font-bold text-amber-700 whitespace-nowrap">
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
            className="w-16 sm:w-20 h-5 sm:h-6 text-[10px] sm:text-[12px] text-right border-amber-300 focus-visible:ring-amber-500 p-0.5"
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

      {/* ===== TỔNG CHI PHÍ, DT TRƯỚC THUẾ & LỢI NHUẬN ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
  <Card className="border-red-200 bg-red-50/50 shadow-sm w-auto inline-flex h-fit self-start">
    <CardContent className="px-2 py-0 flex items-center justify-between gap-2">
      <span className="text-sm sm:text-base font-medium text-red-700 whitespace-nowrap">
        Tổng chi phí
      </span>

      <span className="text-base sm:text-lg font-bold text-red-700 whitespace-nowrap">
        {formatCurrency(totalExpense) || "0 ₫"}
      </span>
    </CardContent>
  </Card>

        {/* <Card className="border-orange-200 bg-orange-50/50 shadow-sm">
          <CardContent className="px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-medium text-orange-700 whitespace-nowrap">
              DT trước thuế
            </span>
            <span className="text-sm sm:text-base font-bold text-orange-700 whitespace-nowrap">
              {formatCurrency(totals.preTax) || "0 ₫"}
            </span>
          </CardContent>
        </Card>

        <Card className={`border-slate-300 shadow-sm ${profit >= 0 ? "bg-emerald-50/50" : "bg-red-50/50"}`}>
          <CardContent className="px-3 py-2 flex items-center justify-between gap-2">
            <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              Lợi nhuận
            </span>
            <span className={`text-sm sm:text-base font-bold whitespace-nowrap ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatCurrency(profit) || "0 ₫"}
            </span>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
};

export default DailyReport;
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, ArrowUp, ArrowDown, CreditCard, DollarSign, Download, Receipt, Search, Users, Plus, Trash2, EyeOff, Eye, CalendarDays, Upload, Loader2 } from "lucide-react";
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
  
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editRowRef = useRef<HTMLTableRowElement>(null);

  // ===== HÀM CHUYỂN ĐỔI DATE -> YYYY-MM-DD (LUÔN LẤY GIỜ LOCAL) =====
  const toLocalDateString = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return "";
    
    // Lấy trực tiếp năm/tháng/ngày theo giờ LOCAL, không qua UTC
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // ===== HÀM CHUYỂN ĐỔI TỪ API (UTC -> LOCAL) =====
  const convertUTCToLocalDate = (utcDateStr: string): string => {
    if (!utcDateStr) return "";
    
    // Nếu đã là YYYY-MM-DD thì giữ nguyên
    if (/^\d{4}-\d{2}-\d{2}$/.test(utcDateStr)) {
      return utcDateStr;
    }
    
    try {
      const d = new Date(utcDateStr);
      if (isNaN(d.getTime())) return utcDateStr;
      
      // Dùng getFullYear/getMonth/getDate - lấy theo giờ LOCAL
      return toLocalDateString(d);
    } catch {
      return utcDateStr;
    }
  };

  // ===== HÀM CHUYỂN ĐỔI TỪ EXCEL (Date object có thể có giờ lẻ) =====
  const convertExcelDateToLocalString = (dateObj: any): string => {
    if (!dateObj) return "";
    
    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      // SheetJS creates Excel dates at UTC midnight; use UTC calendar parts.
      const yyyy = dateObj.getUTCFullYear();
      const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    
    if (typeof dateObj === 'string') {
      // Nếu là "DD/MM/YYYY"
      const match = dateObj.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      
      // Nếu là "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateObj)) {
        return dateObj;
      }

      const d = new Date(dateObj);
      if (!isNaN(d.getTime())) {
        return toLocalDateString(d);
      }
    }
    
    return String(dateObj);
  };

  // ===== LẤY DỮ LIỆU =====
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

  useEffect(() => {
    if (editingId && editRowRef.current) {
      editRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editingId]);

  // ===== FORMAT =====
  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) return "0 ₫";
    return Number(amount).toLocaleString('vi-VN') + " ₫";
  };

  const formatCurrencyNoUnit = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) return "0";
    return Number(amount).toLocaleString('vi-VN');
  };

  const formatAvgGuest = (amount: number) => {
    if (!amount || isNaN(amount) || amount === 0) return "0 ₫";
    return Math.round(amount).toLocaleString('vi-VN') + " ₫";
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const calculateTotalGross = (row: DailyRevenue | any) => {
    return (Number(row.cash) || 0) + (Number(row.transfer) || 0) + (Number(row.card) || 0) + (Number(row.debt) || 0) + (Number(row.founderPoints) || 0);
  };

  // ===== HÀM TÍNH TUẦN =====
  const getWeekInfo = (dateStr: string) => {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    const firstDay = new Date(year, month - 1, 1).getDay() || 7;
    const weekNum = Math.ceil((day + firstDay - 1) / 7);
    
    return { year, month, day, weekNum };
  };

  // ===== LƯU DỮ LIỆU =====
  const executeSave = async (row: DailyRevenue, field: keyof DailyRevenue, value: any) => {
    const updatedRow = { ...row, [field]: value };
    
    if (field === "date") {
      updatedRow.date = value;
    }
    
    updatedRow.totalGross = calculateTotalGross(updatedRow);

    setData(prev => prev.map(item => item._id === row._id ? updatedRow : item));

    try {
      const payload = { ...updatedRow };
      const result = (await updateData(`/daily-revenues/${row._id}`, payload)) as ApiResponse<DailyRevenue>;
      if (!result.success) {
        console.error("Lỗi khi lưu:", result.message);
      }
    } catch (error) {
      console.error("Lỗi kết nối khi lưu:", error);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DailyRevenue) => {
    e.preventDefault(); 
    
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const values = pastedText.split(/\r?\n|\t/).filter(v => v.trim() !== "");
    
    const rowIndex = data.findIndex(item => item._id === editingId);
    if (rowIndex === -1) return;

    let currentIndex = rowIndex;
    let currentData = data;
    for (const val of values) {
      const currentRow = currentData[currentIndex];
      if (!currentRow) break; 

      await executeSave(currentRow, field, val);
      currentData = currentData.map(item =>
        item._id === currentRow._id
          ? { ...currentRow, [field]: val, totalGross: calculateTotalGross({ ...currentRow, [field]: val }) }
          : item,
      );
      currentIndex++;
    }
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
          // Keep Excel's displayed calendar date; SheetJS may shift its Date value by timezone.
          rowData.push(col === 0 ? (cell?.w ?? cell?.v ?? "") : (cell?.v ?? ""));
        }
        dataRows.push(rowData);
      }

      console.log("📊 Raw Excel data:", dataRows);

      const importedData: Omit<DailyRevenue, "_id">[] = [];
      const importedDates = new Set<string>();
      let rowCount = 0;

      setImportProgress("Đang xử lý dữ liệu...");

      for (let i = 1; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        if (!row || row.every(cell => !cell || String(cell).trim() === "")) continue;
        
        const dateValue = row[0];
        const dateStr = String(dateValue).toUpperCase().trim();
        
        if (dateStr.includes("TUẦN") || dateStr.includes("TỔNG CỘNG") || dateStr.includes("TOTAL")) {
          console.log(`Row ${i}: Skipped - week/total row`);
          continue;
        }

        // ===== XỬ LÝ DATE TỪ EXCEL =====
        let dateStrFormatted = "";
        let dateObj: Date | null = null;

        if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
          // Excel dates are calendar values represented by UTC-midnight Dates.
          dateStrFormatted = convertExcelDateToLocalString(dateValue);
          const [year, month, day] = dateStrFormatted.split('-').map(Number);
          dateObj = new Date(year, month - 1, day);
          console.log(`Row ${i}: Excel Date object:`, dateValue, '->', dateStrFormatted);
        } else if (typeof dateValue === 'string') {
          dateStrFormatted = convertExcelDateToLocalString(dateValue);
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStrFormatted)) {
            const [year, month, day] = dateStrFormatted.split('-').map(Number);
            dateObj = new Date(year, month - 1, day);
          }
        }
        
        if (!dateStrFormatted || !dateObj) {
          console.log(`Row ${i}: Cannot parse date "${dateValue}", skipped`);
          continue;
        }

        // Kiểm tra cùng tháng với dữ liệu hiện có
        if (data.length > 0) {
          const firstDateParts = data[0].date.split('-');
          const currentParts = dateStrFormatted.split('-');
          if (parseInt(currentParts[0]) !== parseInt(firstDateParts[0]) || 
              parseInt(currentParts[1]) !== parseInt(firstDateParts[1])) {
            console.log(`Row ${i}: Date ${dateStrFormatted} not in current month, skipped`);
            continue;
          }
        }
        
        if (importedDates.has(dateStrFormatted)) {
          console.log(`Row ${i}: Duplicate date ${dateStrFormatted}, skipped`);
          continue;
        }

        importedDates.add(dateStrFormatted);

        const dayOfWeek = String(row[1] || "").trim();
        const cash = parseNumber(row[2]);
        const transfer = parseNumber(row[3]);
        const card = parseNumber(row[4]);
        const debt = parseNumber(row[5]);
        const founderPoints = parseNumber(row[6]);
        const preTaxRevenue = parseNumber(row[7]);
        const totalGross = cash + transfer + card + debt + founderPoints;
        const guestCount = parseNumber(row[9]);
        const billCount = parseNumber(row[11]);
        const note = String(row[12] || "").trim();

        const finalDayOfWeek = dayOfWeek || getDayOfWeekFromDate(dateObj);

        console.log(`Row ${i}: ✅ PARSED:`, {
          date: dateStrFormatted,
          dayOfWeek: finalDayOfWeek,
          cash,
          transfer,
          card,
          debt,
          founderPoints,
          preTaxRevenue,
          totalGross,
          guestCount,
          billCount,
          note
        });

        importedData.push({
          reportId,
          date: dateStrFormatted,
          dayOfWeek: finalDayOfWeek,
          founderPoints,
          cash,
          transfer,
          card,
          debt,
          preTaxRevenue,
          totalGross,
          guestCount,
          billCount,
          note,
        });

        rowCount++;
        setImportProgress(`Đã xử lý ${rowCount} ngày...`);
      }

      if (importedData.length === 0) {
        alert("Không tìm thấy dữ liệu ngày nào trong file Excel!");
        return;
      }

      console.log("📦 Imported data:", importedData);

      setImportProgress(`Đang import ${importedData.length} ngày...`);

      const result = await postData("/daily-revenues/import", {
        reportId,
        data: importedData,
      }) as ApiResponse<DailyRevenue[]>;

      if (result.success) {
        // Format lại date từ API response (phòng trường hợp API trả về UTC)
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
      cash: 0,
      transfer: 0,
      card: 0,
      debt: 0,
      founderPoints: 0,
      preTaxRevenue: 0,
      totalGross: 0,
      guestCount: 0,
      billCount: 0,
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

  // ===== GROUP BY WEEK =====
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
            founderPoints: 0, preTax: 0, totalGross: 0, 
            guestCount: 0, billCount: 0 
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

  // ===== AVAILABLE WEEKS =====
  const availableWeeks = useMemo(() => {
    const weekSet = new Set<string>();
    groupedData.forEach(g => {
      weekSet.add(g.key);
    });
    return Array.from(weekSet).sort();
  }, [groupedData]);

  // ===== FILTER BY WEEK =====
  const filteredGroupedData = useMemo(() => {
    if (weekFilter === "all") return groupedData;
    return groupedData.filter(g => g.key === weekFilter);
  }, [groupedData, weekFilter]);

  // ===== TOTALS =====
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
        preTax: acc.preTax + group.totals.preTax, 
        totalGross: acc.totalGross + group.totals.totalGross, 
        guest: acc.guest + group.totals.guestCount, 
        bill: acc.bill + group.totals.billCount,
      };
    }, { cash: 0, transfer: 0, card: 0, debt: 0, founderPoints: 0, preTax: 0, totalGross: 0, guest: 0, bill: 0 });
    return { totals: t, totalDays: days };
  }, [groupedData]);

  const avgPerGuest = totals.guest > 0 ? totals.totalGross / totals.guest : 0;

  // ===== EXPORT EXCEL =====
  const handleExportExcel = () => {
    if (data.length === 0) return alert("Chưa có dữ liệu để xuất Excel!");

    const exportData = processedData.map((row) => ({
      "Ngày": formatDateDisplay(row.date),
      "Thứ": row.dayOfWeek,
      "Tiền mặt": row.cash || 0,
      "Chuyển khoản": row.transfer || 0,
      "Cà thẻ": row.card || 0,
      "Công nợ": row.debt || 0,
      "Điểm Founder": row.founderPoints || 0,
      "DT trước PPV/VAT": row.preTaxRevenue || 0,
      "Tổng DT (VAT)": calculateTotalGross(row),
      "Số khách": row.guestCount || 0,
      "DT / Khách": row.guestCount > 0 ? Math.round(calculateTotalGross(row) / row.guestCount) : 0,
      "Số bill": row.billCount || 0,
      "Ghi chú": row.note || ""
    }));

    exportData.push({
      "Ngày": "", "Thứ": "", "Tiền mặt": "" as any, "Chuyển khoản": "" as any, "Cà thẻ": "" as any, "Công nợ": "" as any, "Điểm Founder": "" as any, "DT trước PPV/VAT": "" as any, "Tổng DT (VAT)": "" as any, "Số khách": "" as any, "DT / Khách": "" as any, "Số bill": "" as any, "Ghi chú": ""
    });

    exportData.push({
      "Ngày": "TỔNG CỘNG",
      "Thứ": `(${totalDays} ngày)`,
      "Tiền mặt": totals.cash,
      "Chuyển khoản": totals.transfer,
      "Cà thẻ": totals.card,
      "Công nợ": totals.debt,
      "Điểm Founder": totals.founderPoints,
      "DT trước PPV/VAT": totals.preTax,
      "Tổng DT (VAT)": totals.totalGross,
      "Số khách": totals.guest,
      "DT / Khách": avgPerGuest,
      "Số bill": totals.bill,
      "Ghi chú": ""
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoDoanhThu");

    const wscols = [
      { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 30 }
    ];
    worksheet["!cols"] = wscols;

    XLSX.writeFile(workbook, `Bao_Cao_Doanh_Thu_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300">
            <ArrowLeft className="w-5 h-5"/>
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Chi Tiết Báo Cáo Tháng</h1>
            <p className="text-muted-foreground text-sm mt-1">Nhập liệu trực tiếp hoặc dán nguyên cột từ Excel. Có thể Import trực tiếp file Excel có format chuẩn.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsCompactMode(!isCompactMode)} className="gap-2 bg-slate-50 text-slate-700 border-slate-300">
            {isCompactMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} {isCompactMode ? "Hiện chi tiết" : "Thu gọn bảng"}
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
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {importProgress || "Đang nhập..."}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Nhập Excel
              </>
            )}
          </Button>

          <Button variant="outline" className="gap-2 border-slate-300" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> Xuất Excel
          </Button>
          
          <Button className="gap-2" onClick={handleAddRow}>
            <Plus className="w-4 h-4" /> Thêm doanh thu ngày
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-300">
          <CardHeader>
            <CardTitle className="text-sm">Tổng Doanh Thu (VAT)</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500 absolute top-4 right-4"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalGross)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-300">
          <CardHeader>
            <CardTitle className="text-sm">Tổng Lượng Khách</CardTitle>
            <Users className="w-4 h-4 text-blue-500 absolute top-4 right-4"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.guest}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-300">
          <CardHeader>
            <CardTitle className="text-sm">Trung Bình / Khách</CardTitle>
            <CreditCard className="w-4 h-4 text-orange-500 absolute top-4 right-4"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgPerGuest)}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-300">
          <CardHeader>
            <CardTitle className="text-sm">Tổng Số Bill</CardTitle>
            <Receipt className="w-4 h-4 text-purple-500 absolute top-4 right-4"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.bill}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between pt-4">
        <div className="relative w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
          <Input 
            placeholder="Tìm kiếm theo ngày, thứ, ghi chú" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 border-slate-300"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")} className="gap-2 border-slate-300">
            {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />} 
            {sortDirection === 'asc' ? 'Từ Ngày 1' : 'Từ Ngày 31'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-primary text-primary">
                <CalendarDays className="w-4 h-4 mr-2"/> 
                {weekFilter === "all" ? "Tất cả các tuần" : weekFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setWeekFilter("all")}>Tất cả các tuần</DropdownMenuItem>
              {availableWeeks.map(w => {
                const parts = w.split('-W');
                const year = parts[0];
                const month = parts[1] ? parts[1].slice(0, 2) : '';
                const week = parts[1] ? parts[1].slice(3) : '';
                return (
                  <DropdownMenuItem key={w} onClick={() => setWeekFilter(w)}>
                    Tháng {parseInt(month)}/{year} - Tuần {week}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-300">
        <div className="rounded-md overflow-x-auto">
          <Table className="border-collapse w-full">
            <TableHeader>
              <TableRow className="bg-slate-200">
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-2 py-1.5 text-[13px]">Ngày</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-2 py-1.5 text-[13px]">Thứ</TableHead>
                {!isCompactMode && (
                  <>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">Tiền mặt</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">Chuyển khoản</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">Cà thẻ</TableHead>
                    <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">Công nợ</TableHead>
                  </>
                )}
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-2 py-1.5 text-[13px]">Điểm Founder</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">DT trước PPV/VAT</TableHead>
                <TableHead className="border border-slate-300 text-primary font-extrabold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">Tổng DT (VAT)</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center w-20 px-2 py-1.5 text-[13px]">Khách</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-right px-2 py-1.5 text-[13px]">DT / Khách</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center w-20 px-2 py-1.5 text-[13px]">Bill</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap min-w-50 px-2 py-1.5 text-[13px]">Ghi chú</TableHead>
                <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-2 py-1.5 text-[13px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {filteredGroupedData.length > 0 ? filteredGroupedData.map((group) => (
                <React.Fragment key={group.key}>
                  <TableRow className="bg-slate-700 hover:bg-slate-700 text-white font-bold">
                    <TableCell colSpan={2} className="border border-slate-600 font-black text-center whitespace-nowrap bg-slate-800 text-white px-2 py-1.5 text-[13px]">
                      TUẦN {group.weekNum} - Tháng {String(group.month).padStart(2, '0')}/{group.year}
                    </TableCell>
                    {!isCompactMode && (
                      <>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{formatCurrency(group.totals.cash)}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{formatCurrency(group.totals.transfer)}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{formatCurrency(group.totals.card)}</TableCell>
                        <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{formatCurrency(group.totals.debt)}</TableCell>
                      </>
                    )}
                    <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{formatCurrency(group.totals.founderPoints)}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-1.5 text-[13px] text-orange-200">{formatCurrency(group.totals.preTax)}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-1.5 text-[13px] text-white bg-slate-800">{formatCurrency(group.totals.totalGross)}</TableCell>
                    <TableCell className="border border-slate-600 text-center font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{group.totals.guestCount}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-blue-200">{formatAvgGuest(group.totals.guestCount > 0 ? group.totals.totalGross / group.totals.guestCount : 0)}</TableCell>
                    <TableCell className="border border-slate-600 text-center font-medium whitespace-nowrap px-2 py-1.5 text-[13px] text-slate-100">{group.totals.billCount}</TableCell>
                    <TableCell className="border border-slate-600 px-2 py-1.5 bg-slate-700"></TableCell>
                    <TableCell className="border border-slate-600 px-2 py-1.5 bg-slate-700"></TableCell>
                  </TableRow>

                  {group.records.map((row: DailyRevenue) => {
                    const isEditing = editingId === row._id;
                    const totalGross = calculateTotalGross(row);
                    const avgGuest = Number(row.guestCount || 0) > 0 ? totalGross / Number(row.guestCount) : 0;
                    
                    return (
                      <TableRow 
                        key={row._id} 
                        ref={isEditing ? editRowRef : null}
                        className={isEditing ? "bg-emerald-50/60 outline-2 outline-emerald-400 -outline-offset-2 relative z-10" : "hover:bg-slate-50 transition-colors"}
                      >
                        <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                          <Input type="date" defaultValue={row.date}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => executeSave(row, "date", e.target.value)}
                            className="w-32 h-7 text-[13px] border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500" />
                        </TableCell>
                        
                        <TableCell className="border border-slate-300 p-1 whitespace-nowrap bg-slate-50">
                          <div className="w-20 h-7 text-[13px] font-bold text-slate-700 text-center flex items-center justify-center">
                            {row.dayOfWeek}
                          </div>
                        </TableCell>

                        {!isCompactMode && (
                          <>
                            <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.cash)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => {
                                  const val = e.target.value.replace(/,/g, '');
                                  executeSave(row, "cash", val);
                                }}
                                onPaste={(e) => handlePaste(e, "cash")}
                                className="w-28 text-right h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.transfer)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => {
                                  const val = e.target.value.replace(/,/g, '');
                                  executeSave(row, "transfer", val);
                                }}
                                onPaste={(e) => handlePaste(e, "transfer")}
                                className="w-28 text-right h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.card)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => {
                                  const val = e.target.value.replace(/,/g, '');
                                  executeSave(row, "card", val);
                                }}
                                onPaste={(e) => handlePaste(e, "card")}
                                className="w-28 text-right h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                            </TableCell>
                            <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                              <Input type="text" 
                                defaultValue={formatCurrencyNoUnit(row.debt)}
                                onFocus={() => row._id && setEditingId(row._id)}
                                onBlur={(e) => {
                                  const val = e.target.value.replace(/,/g, '');
                                  executeSave(row, "debt", val);
                                }}
                                onPaste={(e) => handlePaste(e, "debt")}
                                className="w-28 text-right h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                            </TableCell>
                          </>
                        )}

                        <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                          <Input type="text" 
                            defaultValue={formatCurrencyNoUnit(row.founderPoints)}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/,/g, '');
                              executeSave(row, "founderPoints", val);
                            }}
                            onPaste={(e) => handlePaste(e, "founderPoints")}
                            className="w-28 text-right h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                        </TableCell>

                        <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                          <Input type="text" 
                            defaultValue={formatCurrencyNoUnit(row.preTaxRevenue)}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/,/g, '');
                              executeSave(row, "preTaxRevenue", val);
                            }}
                            onPaste={(e) => handlePaste(e, "preTaxRevenue")}
                            className="w-32 text-right h-7 bg-orange-50 border-transparent hover:border-orange-300 focus-visible:ring-orange-500 font-bold text-orange-700 text-[13px]" />
                        </TableCell>

                        <TableCell className="border border-slate-300 p-1 text-right font-extrabold text-primary whitespace-nowrap bg-primary/5 text-[13px]">
                          {formatCurrency(totalGross)}
                        </TableCell>

                        <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                          <Input type="number" defaultValue={row.guestCount}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => executeSave(row, "guestCount", e.target.value)}
                            onPaste={(e) => handlePaste(e, "guestCount")}
                            className="w-14 text-center h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                        </TableCell>

                        <TableCell className="border border-slate-300 p-1 text-right font-bold text-blue-600 whitespace-nowrap bg-blue-50/30 text-[13px]">
                          {formatAvgGuest(avgGuest)}
                        </TableCell>

                        <TableCell className="border border-slate-300 p-1 whitespace-nowrap">
                          <Input type="number" defaultValue={row.billCount}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => executeSave(row, "billCount", e.target.value)}
                            onPaste={(e) => handlePaste(e, "billCount")}
                            className="w-14 text-center h-7 border-transparent bg-transparent hover:border-slate-300 focus-visible:ring-emerald-500 text-[13px] font-medium" />
                        </TableCell>

                        <TableCell className="border border-slate-300 p-1 min-w-50">
                          <textarea defaultValue={row.note || ""}
                            onFocus={() => row._id && setEditingId(row._id)}
                            onBlur={(e) => executeSave(row, "note", e.target.value)}
                            onPaste={(e) => handlePaste(e, "note")}
                            className="flex min-h-7 w-full rounded-md border border-transparent bg-transparent p-1.5 text-[13px] resize-y hover:border-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500" />
                        </TableCell>

                        <TableCell className="border border-slate-300 text-center whitespace-nowrap px-2 py-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" onClick={()=>row._id && handleDeleteRow(row._id)} className={`text-red-500 hover:bg-red-100 h-7 w-7`}><Trash2 className="w-3.5 h-3.5"/></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              )) : (<TableRow><TableCell colSpan={isCompactMode ? 12 : 14} className="border border-slate-300 h-32 text-center text-muted-foreground font-medium text-[13px]">Chưa có dữ liệu. Hãy thêm doanh thu ngày.</TableCell></TableRow>)}
            </TableBody>
            
            <TableFooter className="bg-slate-800 text-white sticky bottom-0 z-10 border-t-4 border-slate-900">
              <TableRow className="hover:bg-slate-800">
                <TableCell colSpan={2} className="border border-slate-600 text-center font-black text-white whitespace-nowrap px-2 py-2 text-sm bg-slate-900">TỔNG CỘNG ({totalDays} Ngày)</TableCell>
                {!isCompactMode && (
                  <>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-2 text-[13px]">{formatCurrency(totals.cash)}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-2 text-[13px]">{formatCurrency(totals.transfer)}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-2 text-[13px]">{formatCurrency(totals.card)}</TableCell>
                    <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-2 text-[13px]">{formatCurrency(totals.debt)}</TableCell>
                  </>
                )}
                <TableCell className="border border-slate-600 text-right font-bold whitespace-nowrap px-2 py-2 text-[13px]">{formatCurrency(totals.founderPoints)}</TableCell>
                <TableCell className="border border-slate-600 text-right font-bold text-orange-300 whitespace-nowrap px-2 py-2 text-[13px]">{formatCurrency(totals.preTax)}</TableCell>
                <TableCell className="border border-slate-600 text-right font-black text-white whitespace-nowrap px-2 py-2 text-sm bg-slate-900">{formatCurrency(totals.totalGross)}</TableCell>
                <TableCell className="border border-slate-600 text-center font-bold whitespace-nowrap px-2 py-2 text-[13px]">{totals.guest}</TableCell>
                <TableCell className="border border-slate-600 text-right font-bold text-blue-200 whitespace-nowrap px-2 py-2 text-[13px]">{formatAvgGuest(avgPerGuest)}</TableCell>
                <TableCell className="border border-slate-600 text-center font-bold whitespace-nowrap px-2 py-2 text-[13px]">{totals.bill}</TableCell>
                <TableCell className="border border-slate-600 px-2 py-2"></TableCell>
                <TableCell className="border border-slate-600 px-2 py-2"></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default DailyReport;
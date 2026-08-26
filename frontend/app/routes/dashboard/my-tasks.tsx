import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DollarSign, Users, Receipt, Plus, Trash2, List, ArrowUpRight, ArrowDownRight, TrendingUp, CalendarDays, Download, CalendarRange, BarChart3, Activity, TrendingDown, Target, Award, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom"; 
import { fetchData, postData, deleteData } from "@/lib/fetch-util";
import * as XLSX from "xlsx";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Legend, ComposedChart } from "recharts";

export interface MonthlyReport {
  _id: string;
  monthKey: string;
  title: string;
  totalGross: number;
  preTaxRevenue: number;
  guestCount: number;
  billCount: number;
  daysCount: number;
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

const sanitizeSheetName = (name: string) => {
  return name.replace(/[:\\/?*\[\]]/g, "_");
};

const formatDateForExcel = (dateString: string) => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const MyTasks = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [chartIndex, setChartIndex] = useState(0);
  const [chartPageSize, setChartPageSize] = useState(12);
  
  const [newMonth, setNewMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");

  const availableYears = useMemo(() => {
    const years = new Set(reports.map(r => r.monthKey.split("-")[0]));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [reports]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = (await fetchData("/monthly-reports")) as ApiResponse<MonthlyReport[]>;
      if (res.success) setReports(res.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu tháng:", error);
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

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [reports]);

  const currentMonth = sortedReports[0];
  const previousMonth = sortedReports[1];

  const calculateGrowth = (current?: number, previous?: number) => {
    if (!current) return 0;
    if (!previous || previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(currentMonth?.totalGross, previousMonth?.totalGross);
  const guestGrowth = calculateGrowth(currentMonth?.guestCount, previousMonth?.guestCount);
  const billGrowth = calculateGrowth(currentMonth?.billCount, previousMonth?.billCount);

  const renderGrowthBadge = (growth: number) => {
    if (growth > 0) return <span className="text-emerald-500 flex items-center text-sm font-medium"><ArrowUpRight className="w-4 h-4 mr-1"/>+{growth.toFixed(1)}%</span>;
    if (growth < 0) return <span className="text-red-500 flex items-center text-sm font-medium"><ArrowDownRight className="w-4 h-4 mr-1"/>{growth.toFixed(1)}%</span>;
    return <span className="text-slate-400 text-sm font-medium">0%</span>;
  };

  const getFilteredReports = (list: MonthlyReport[]) => {
    return list.filter(r => {
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

  const filteredData = useMemo(() => getFilteredReports(sortedReports), [reports, filterYear, filterQuarter, filterMonth]);

  const totalOfFilteredData = useMemo(() => {
    return filteredData.reduce((acc, r) => {
      acc.totalGross += r.totalGross;
      acc.preTaxRevenue += r.preTaxRevenue;
      acc.guestCount += r.guestCount;
      acc.billCount += r.billCount;
      acc.daysCount += r.daysCount;
      return acc;
    }, { totalGross: 0, preTaxRevenue: 0, guestCount: 0, billCount: 0, daysCount: 0 });
  }, [filteredData]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const revenues = filteredData.map(r => r.totalGross);
    const guests = filteredData.map(r => r.guestCount);
    const bills = filteredData.map(r => r.billCount);
    
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const avgGuest = guests.reduce((a, b) => a + b, 0) / guests.length;
    const avgBill = bills.reduce((a, b) => a + b, 0) / bills.length;
    
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    
    const sorted = [...filteredData].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    let growthRates = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i-1].totalGross > 0) {
        growthRates.push(((sorted[i].totalGross - sorted[i-1].totalGross) / sorted[i-1].totalGross) * 100);
      }
    }
    const avgGrowth = growthRates.length > 0 ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length : 0;
    
    return {
      avgRevenue,
      avgGuest,
      avgBill,
      maxRevenue,
      minRevenue,
      avgGrowth,
      totalMonths: filteredData.length
    };
  }, [filteredData]);

  // Tất cả dữ liệu cho biểu đồ (không giới hạn)
  const allChartData = useMemo(() => {
    return [...filteredData].reverse().map(r => ({
      name: r.monthKey.split("-")[1] + "/" + r.monthKey.split("-")[0],
      total: r.totalGross,
      guest: r.guestCount,
      bill: r.billCount,
      monthKey: r.monthKey
    }));
  }, [filteredData]);

  // Dữ liệu cho biểu đồ theo trang
  const chartData = useMemo(() => {
    const start = chartIndex * chartPageSize;
    const end = start + chartPageSize;
    return allChartData.slice(start, end);
  }, [allChartData, chartIndex, chartPageSize]);

  const totalPages = Math.ceil(allChartData.length / chartPageSize);

  const handlePrevChart = () => {
    if (chartIndex > 0) setChartIndex(chartIndex - 1);
  };

  const handleNextChart = () => {
    if (chartIndex < totalPages - 1) setChartIndex(chartIndex + 1);
  };

  // Reset chart index khi filter thay đổi
  useEffect(() => {
    setChartIndex(0);
  }, [filterYear, filterQuarter, filterMonth]);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) return alert("Không có dữ liệu trong khoảng thời gian này!");

    const workbook = XLSX.utils.book_new();

    const aoaSummary: any[][] = [
      ["BÁO CÁO TỔNG HỢP DOANH THU"],
      [`Kỳ: ${filterMonth !== "all" ? "Tháng " + filterMonth.split("-")[1] + "/" + filterMonth.split("-")[0] : (filterQuarter !== "all" ? filterQuarter + " - " + filterYear : "Tất cả các tháng")}`],
      []
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
        r.daysCount + " ngày"
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
      totalOfFilteredData.daysCount + " ngày"
    ]);

    aoaSummary.push([]);
    aoaSummary.push([]);

    if (stats) {
      aoaSummary.push(["THỐNG KÊ BỔ SUNG"]);
      aoaSummary.push(["Tổng số tháng", stats.totalMonths]);
      aoaSummary.push(["Doanh thu TB tháng", Math.round(stats.avgRevenue)]);
      aoaSummary.push(["Khách TB tháng", Math.round(stats.avgGuest)]);
      aoaSummary.push(["Bill TB tháng", Math.round(stats.avgBill)]);
      aoaSummary.push(["Doanh thu cao nhất", stats.maxRevenue]);
      aoaSummary.push(["Doanh thu thấp nhất", stats.minRevenue]);
      aoaSummary.push(["Tăng trưởng TB", stats.avgGrowth.toFixed(1) + "%"]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet(aoaSummary);
    
    wsSummary["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: aoaSummary.length - (stats ? 10 : 2), c: 0 }, e: { r: aoaSummary.length - (stats ? 10 : 2), c: 7 } }
    ];
    
    wsSummary["!cols"] = [
      { wch: 6 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 14 }
    ];

    const range = XLSX.utils.decode_range(wsSummary["!ref"] || "A1");
    
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = wsSummary[cellAddress];
        if (cell) {
          if (typeof cell.v === 'number' && cell.v !== 0) {
            cell.z = '#,##0';
          }
          if (!cell.s) cell.s = {};
          cell.s.border = {
            top: { style: 'thin', color: { rgb: "B0B0B0" } },
            bottom: { style: 'thin', color: { rgb: "B0B0B0" } },
            left: { style: 'thin', color: { rgb: "B0B0B0" } },
            right: { style: 'thin', color: { rgb: "B0B0B0" } }
          };
        }
      }
    }

    const titleCell1 = wsSummary[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    if (titleCell1) {
      titleCell1.s = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1a1a2e" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: 'thin', color: { rgb: "1a1a2e" } },
          bottom: { style: 'thin', color: { rgb: "1a1a2e" } },
          left: { style: 'thin', color: { rgb: "1a1a2e" } },
          right: { style: 'thin', color: { rgb: "1a1a2e" } }
        }
      };
    }

    const titleCell2 = wsSummary[XLSX.utils.encode_cell({ r: 1, c: 0 })];
    if (titleCell2) {
      titleCell2.s = {
        font: { bold: true, color: { rgb: "C00000" } },
        alignment: { horizontal: "center" },
        border: {
          top: { style: 'thin', color: { rgb: "B0B0B0" } },
          bottom: { style: 'thin', color: { rgb: "B0B0B0" } },
          left: { style: 'thin', color: { rgb: "B0B0B0" } },
          right: { style: 'thin', color: { rgb: "B0B0B0" } }
        }
      };
    }

    for (let C = 0; C <= 7; C++) {
      const cell = wsSummary[XLSX.utils.encode_cell({ r: 3, c: C })];
      if (cell) {
        cell.s = {
          fill: { fgColor: { rgb: "1a1a2e" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: 'medium', color: { rgb: "1a1a2e" } },
            bottom: { style: 'medium', color: { rgb: "1a1a2e" } },
            left: { style: 'thin', color: { rgb: "1a1a2e" } },
            right: { style: 'thin', color: { rgb: "1a1a2e" } }
          }
        };
      }
    }

    const totalRowIndex = aoaSummary.findIndex(row => row[0] === "" && row[1] === "TỔNG CỘNG");
    if (totalRowIndex !== -1) {
      for (let C = 0; C <= 7; C++) {
        const cell = wsSummary[XLSX.utils.encode_cell({ r: totalRowIndex, c: C })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: "FFF3CD" } },
            font: { bold: true },
            alignment: { horizontal: C === 1 ? "left" : "right" },
            border: {
              top: { style: 'medium', color: { rgb: "000000" } },
              bottom: { style: 'medium', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
      }
    }

    if (stats) {
      const statStartRow = aoaSummary.length - 10;
      const statTitle = wsSummary[XLSX.utils.encode_cell({ r: statStartRow, c: 0 })];
      if (statTitle) {
        statTitle.s = {
          font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1a1a2e" } },
          alignment: { horizontal: "center" },
          border: {
            top: { style: 'medium', color: { rgb: "1a1a2e" } },
            bottom: { style: 'medium', color: { rgb: "1a1a2e" } },
            left: { style: 'thin', color: { rgb: "1a1a2e" } },
            right: { style: 'thin', color: { rgb: "1a1a2e" } }
          }
        };
      }

      for (let i = 1; i <= 7; i++) {
        const rowIdx = statStartRow + i;
        const cell1 = wsSummary[XLSX.utils.encode_cell({ r: rowIdx, c: 0 })];
        const cell2 = wsSummary[XLSX.utils.encode_cell({ r: rowIdx, c: 1 })];
        
        if (cell1) {
          cell1.s = {
            fill: { fgColor: { rgb: i % 2 === 0 ? "F8F9FA" : "FFFFFF" } },
            font: { bold: true },
            alignment: { horizontal: "left" },
            border: {
              top: { style: 'thin', color: { rgb: "B0B0B0" } },
              bottom: { style: 'thin', color: { rgb: "B0B0B0" } },
              left: { style: 'thin', color: { rgb: "B0B0B0" } },
              right: { style: 'thin', color: { rgb: "B0B0B0" } }
            }
          };
        }
        if (cell2) {
          if (typeof cell2.v === 'number' && cell2.v !== 0) {
            cell2.z = '#,##0';
          }
          cell2.s = {
            fill: { fgColor: { rgb: i % 2 === 0 ? "F8F9FA" : "FFFFFF" } },
            alignment: { horizontal: "right" },
            font: { bold: true },
            border: {
              top: { style: 'thin', color: { rgb: "B0B0B0" } },
              bottom: { style: 'thin', color: { rgb: "B0B0B0" } },
              left: { style: 'thin', color: { rgb: "B0B0B0" } },
              right: { style: 'thin', color: { rgb: "B0B0B0" } }
            }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, wsSummary, "Tổng hợp");

    const detailRequests = filteredData.map(async (report) => {
      try {
        const detailRes = await fetchData(`/daily-revenues?reportId=${report._id}`) as ApiResponse<DailyRevenue[]>;
        return { report, dailyData: detailRes.success ? detailRes.data : [] };
      } catch (error) {
        console.error(`Lỗi lấy chi tiết tháng ${report.title}:`, error);
        return { report, dailyData: [] };
      }
    });

    const detailResults = await Promise.all(detailRequests);

    detailResults.forEach(({ report, dailyData }) => {
      const aoaDetail: any[][] = [
        [`BÁO CÁO DOANH THU ${report.title.toUpperCase()}`],
        []
      ];

      aoaDetail.push([
        "Ngày", "Thứ", "Tiền mặt", "Chuyển khoản", "Cà thẻ", "Công nợ", "Điểm Founder", 
        "DT trước PPV & VAT", "Tổng DT (VAT)", "Số khách", 
        "DT / Khách", "Số bill", "Ghi Chú"
      ]);

      const sortedDetail = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
      
      let dTotalCash = 0, dTotalTransfer = 0, dTotalCard = 0, dTotalDebt = 0, dTotalFounder = 0;
      let dTotalPreTax = 0, dTotalGross = 0, dTotalGuest = 0, dTotalBill = 0;
      let currentWeek = 0;
      let isNewWeek = true;

      sortedDetail.forEach(row => {
        const g = Number(row.cash || 0) + Number(row.transfer || 0) + Number(row.card || 0) + Number(row.debt || 0) + Number(row.founderPoints || 0);
        const avg = row.guestCount > 0 ? Math.round(g / row.guestCount) : 0;

        const day = Number(row.date.split("-")[2]);
        const week = Math.ceil(day / 7);
        if (week !== currentWeek) {
          currentWeek = week;
          isNewWeek = true;
        } else {
          isNewWeek = false;
        }

        if (isNewWeek) {
          aoaDetail.push([`TUẦN ${currentWeek}`]);
        }

        aoaDetail.push([
          formatDateForExcel(row.date),
          row.dayOfWeek,
          row.cash || 0,
          row.transfer || 0,
          row.card || 0,
          row.debt || 0,
          row.founderPoints || 0,
          row.preTaxRevenue || 0,
          g,
          row.guestCount || 0,
          avg,
          row.billCount || 0,
          row.note || ""
        ]);

        dTotalCash += row.cash || 0; dTotalTransfer += row.transfer || 0; 
        dTotalCard += row.card || 0; dTotalDebt += row.debt || 0; 
        dTotalFounder += row.founderPoints || 0; dTotalPreTax += row.preTaxRevenue || 0;
        dTotalGross += g; dTotalGuest += row.guestCount || 0; dTotalBill += row.billCount || 0;
      });

      aoaDetail.push([
        "TỔNG CỘNG", "", dTotalCash, dTotalTransfer, dTotalCard, dTotalDebt, dTotalFounder, 
        dTotalPreTax, dTotalGross, dTotalGuest, 
        dTotalGuest > 0 ? Math.round(dTotalGross / dTotalGuest) : 0, dTotalBill, ""
      ]);

      const wsDetail = XLSX.utils.aoa_to_sheet(aoaDetail);

      wsDetail["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }
      ];

      wsDetail["!cols"] = [
        { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 30 }
      ];

      const detailRange = XLSX.utils.decode_range(wsDetail["!ref"] || "A1");
      
      for (let R = detailRange.s.r; R <= detailRange.e.r; R++) {
        for (let C = detailRange.s.c; C <= detailRange.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = wsDetail[cellAddress];
          if (cell) {
            if (typeof cell.v === 'number' && cell.v !== 0) {
              cell.z = '#,##0';
            }
            if (!cell.s) cell.s = {};
            cell.s.border = {
              top: { style: 'thin', color: { rgb: "B0B0B0" } },
              bottom: { style: 'thin', color: { rgb: "B0B0B0" } },
              left: { style: 'thin', color: { rgb: "B0B0B0" } },
              right: { style: 'thin', color: { rgb: "B0B0B0" } }
            };
          }
        }
      }

      const detailTitle = wsDetail[XLSX.utils.encode_cell({ r: 0, c: 0 })];
      if (detailTitle) {
        detailTitle.s = {
          font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1a1a2e" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: 'thin', color: { rgb: "1a1a2e" } },
            bottom: { style: 'thin', color: { rgb: "1a1a2e" } },
            left: { style: 'thin', color: { rgb: "1a1a2e" } },
            right: { style: 'thin', color: { rgb: "1a1a2e" } }
          }
        };
      }

      for (let C = 0; C <= 12; C++) {
        const cell = wsDetail[XLSX.utils.encode_cell({ r: 2, c: C })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: "C00000" } },
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: 'medium', color: { rgb: "C00000" } },
              bottom: { style: 'medium', color: { rgb: "C00000" } },
              left: { style: 'thin', color: { rgb: "C00000" } },
              right: { style: 'thin', color: { rgb: "C00000" } }
            }
          };
        }
      }

      for (let R = 3; R < aoaDetail.length - 1; R++) {
        const cell = wsDetail[XLSX.utils.encode_cell({ r: R, c: 0 })];
        if (cell && typeof cell.v === 'string' && cell.v.startsWith("TUẦN")) {
          cell.s = {
            fill: { fgColor: { rgb: "FFC000" } },
            font: { bold: true },
            alignment: { horizontal: "center" },
            border: {
              top: { style: 'medium', color: { rgb: "FFC000" } },
              bottom: { style: 'medium', color: { rgb: "FFC000" } },
              left: { style: 'thin', color: { rgb: "FFC000" } },
              right: { style: 'thin', color: { rgb: "FFC000" } }
            }
          };
        }
      }

      const detailTotalRow = aoaDetail.length - 1;
      for (let C = 0; C <= 12; C++) {
        const cell = wsDetail[XLSX.utils.encode_cell({ r: detailTotalRow, c: C })];
        if (cell) {
          cell.s = {
            fill: { fgColor: { rgb: "FFF3CD" } },
            font: { bold: true },
            alignment: { horizontal: C <= 1 ? "center" : "right" },
            border: {
              top: { style: 'medium', color: { rgb: "000000" } },
              bottom: { style: 'medium', color: { rgb: "000000" } },
              left: { style: 'thin', color: { rgb: "000000" } },
              right: { style: 'thin', color: { rgb: "000000" } }
            }
          };
        }
      }

      const sheetName = sanitizeSheetName(report.title.replace(/ /g, "_"));
      XLSX.utils.book_append_sheet(workbook, wsDetail, sheetName);
    });

    let fileName = `Bao_Cao_Tong_Hop`;
    if (filterYear !== "all") fileName += `_${filterYear}`;
    if (filterQuarter !== "all") fileName += `_${filterQuarter}`;
    if (filterMonth !== "all") fileName += `_Thang_${filterMonth.split("-")[1]}`;
    
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Tổng Quan Báo Cáo</h1>
          <p className="text-slate-500 text-sm mt-1">Phân tích hiệu quả kinh doanh và xu hướng các tháng</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              type="month" 
              value={newMonth} 
              onChange={(e) => setNewMonth(e.target.value)} 
              className="w-44 pl-10 bg-slate-50 border-slate-200 focus:border-primary"
            />
          </div>
          <Button onClick={handleCreateMonth} className="gap-2 bg-slate-900 hover:bg-slate-800">
            <Plus className="w-4 h-4"/> Tạo & Nhập liệu
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-5 h-5 text-slate-900" />
          <span className="font-semibold text-slate-700">Lọc dữ liệu:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <select 
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            value={filterYear} 
            onChange={(e) => { setFilterYear(e.target.value); setFilterMonth("all"); setFilterQuarter("all"); }}
          >
            <option value="all">Tất cả các năm</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
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
            {[...new Set(filteredData.map(r => r.monthKey))].sort((a, b) => b.localeCompare(a)).map(m => {
                const p = m.split("-");
                return <option key={m} value={m}>{`Tháng ${p[1]}/${p[0]}`}</option>;
              })
            }
          </select>

          <Button onClick={handleExportExcel} className="gap-2 ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-200">
            <Download className="w-4 h-4" /> Xuất Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Tổng Doanh Thu</CardTitle>
            <div className="p-2 bg-white/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-400"/>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalOfFilteredData.totalGross)}</div>
            <div className="flex items-center mt-2 gap-2">
              {renderGrowthBadge(revenueGrowth)}
              <span className="text-xs text-slate-400">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Tổng Khách</CardTitle>
            <div className="p-2 bg-white/10 rounded-lg">
              <Users className="w-4 h-4 text-blue-200"/>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOfFilteredData.guestCount}</div>
            <div className="flex items-center mt-2 gap-2">
              {renderGrowthBadge(guestGrowth)}
              <span className="text-xs text-blue-200">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-600 to-purple-700 text-white hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">DT / Khách</CardTitle>
            <div className="p-2 bg-white/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-purple-200"/>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(totalOfFilteredData.guestCount > 0 ? totalOfFilteredData.totalGross / totalOfFilteredData.guestCount : 0)}
            </div>
            <div className="flex items-center mt-2 gap-2">
              <span className="text-xs text-purple-200">Chi tiêu trung bình</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-100">Tổng Bill</CardTitle>
            <div className="p-2 bg-white/10 rounded-lg">
              <Receipt className="w-4 h-4 text-emerald-200"/>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOfFilteredData.billCount}</div>
            <div className="flex items-center mt-2 gap-2">
              {renderGrowthBadge(billGrowth)}
              <span className="text-xs text-emerald-200">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Activity className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tăng trưởng TB</p>
                  <p className={`text-lg font-bold ${stats.avgGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {stats.avgGrowth >= 0 ? '+' : ''}{stats.avgGrowth.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Doanh thu TB tháng</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(Math.round(stats.avgRevenue))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tháng cao nhất</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.maxRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tháng thấp nhất</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.minRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Biểu đồ Doanh Thu với điều hướng */}
      {allChartData.length > 0 && (
        <Card className="border-0 shadow-md hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <BarChart3 className="w-5 h-5 text-slate-900" /> Doanh Thu Theo Tháng
                </CardTitle>
                <CardDescription>Biến động tổng doanh thu qua các tháng</CardDescription>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handlePrevChart}
                    disabled={chartIndex === 0}
                    className="h-8 w-8 border-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-500">
                    {chartIndex + 1} / {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleNextChart}
                    disabled={chartIndex >= totalPages - 1}
                    className="h-8 w-8 border-slate-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6b7280', fontSize: 12}} 
                    interval={Math.floor(chartData.length / 20)}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6b7280', fontSize: 12}} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="total" fill="#0f172a" radius={[8, 8, 0, 0]} maxBarSize={50} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Biểu đồ Xu Hướng Khách Hàng & Bill */}
      {allChartData.length > 0 && (
        <Card className="border-0 shadow-md hover:shadow-xl transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Activity className="w-5 h-5 text-slate-900" /> Xu Hướng Khách Hàng & Bill
                </CardTitle>
                <CardDescription>Biến động số lượng khách và số bill qua các tháng</CardDescription>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handlePrevChart}
                    disabled={chartIndex === 0}
                    className="h-8 w-8 border-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-500">
                    {chartIndex + 1} / {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleNextChart}
                    disabled={chartIndex >= totalPages - 1}
                    className="h-8 w-8 border-slate-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#6b7280', fontSize: 12}}
                    interval={Math.floor(chartData.length / 20)}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'}}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="guest" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Số khách" />
                  <Area type="monotone" dataKey="bill" stackId="2" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Số bill" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-md hover:shadow-xl transition-shadow">
        <div className="rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900 text-white">
                <TableHead className="text-white font-semibold">Kỳ Báo Cáo</TableHead>
                <TableHead className="text-right text-white font-semibold">DT trước PPV/VAT</TableHead>
                <TableHead className="text-right text-emerald-400 font-bold">Tổng DT (VAT)</TableHead>
                <TableHead className="text-center text-white font-semibold">Số khách</TableHead>
                <TableHead className="text-right text-blue-300 font-semibold">DT / Khách</TableHead>
                <TableHead className="text-center text-white font-semibold">Số bill</TableHead>
                <TableHead className="text-center text-white font-semibold">Đã ghi nhận</TableHead>
                <TableHead className="text-center text-white font-semibold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? filteredData.map((r, idx) => (
                <TableRow key={r._id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <TableCell className="font-bold text-slate-800">{r.title}</TableCell>
                  <TableCell className="text-right text-orange-600 font-medium">{formatCurrency(r.preTaxRevenue)}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 text-base">{formatCurrency(r.totalGross)}</TableCell>
                  <TableCell className="text-center font-medium">{r.guestCount}</TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">{formatCurrency(r.guestCount > 0 ? r.totalGross / r.guestCount : 0)}</TableCell>
                  <TableCell className="text-center font-medium">{r.billCount}</TableCell>
                  <TableCell className="text-center text-slate-500 font-medium">{r.daysCount} ngày</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button onClick={() => navigate(`/daily-report/${r._id}`)} variant="default" className="gap-1 bg-slate-900 hover:bg-slate-800 text-xs h-8 px-3">
                        <List className="w-3.5 h-3.5"/> Chi tiết
                      </Button>
                      <Button onClick={() => handleDelete(r._id)} variant="ghost" className="text-red-500 hover:bg-red-50 h-8 w-8 p-0">
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    Không có dữ liệu cho kỳ đã chọn. Hãy thử chọn kỳ khác.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default MyTasks;
import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { 
  CheckCircle2, Clock, ArrowUpDown, Search, 
  DollarSign, Users, Receipt, ArrowUpRight, ArrowDownRight, 
  TrendingUp, CalendarDays, PieChart as PieChartIcon, 
  Filter, X, CircleDollarSign, UserCheck, Wallet,
  ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";

import { fetchData } from "@/lib/fetch-util";

import { Loader } from "@/components/loader";
import { NoDataFound } from "@/components/no-data-found";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { 
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as BarTooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Tooltip as PieTooltip
} from "recharts";

// ==============================
// TYPE DEFINITIONS
// ==============================
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

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Helper: Get available months from reports
const getAvailableMonths = (reports: MonthlyReport[]) => {
  return reports
    .map(r => r.monthKey)
    .sort((a, b) => b.localeCompare(a));
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // ====================================================
  // TRẠNG THÁI (STATES)
  // ====================================================
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [wineBills, setWineBills] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<string>("date-desc");
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);

  // ====================================================
  // LẤY DỮ LIỆU API (FETCH DATA)
  // ====================================================
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [reportRes, tasksRes]: [any, any] = await Promise.all([
          fetchData("/monthly-reports"),
          fetchData("/tasks/my-tasks")
        ]);

        if (reportRes.success) setReports(reportRes.data);
        setTasks(tasksRes?.data || tasksRes || []);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu ban đầu:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Auto-select latest available month after reports load
  useEffect(() => {
    if (reports.length > 0) {
      const availableMonths = getAvailableMonths(reports);
      if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
        setSelectedMonth(availableMonths[0]);
      }
    }
  }, [reports]);

  useEffect(() => {
    const fetchWineCommission = async () => {
      if (!selectedMonth) return;
      try {
        const wineRes: any = await fetchData(`/wine-commission?month=${selectedMonth}`);
        setWineBills(wineRes.data || wineRes || []);
      } catch (error) {
        console.error("Lỗi lấy hoa hồng rượu:", error);
      }
    };
    fetchWineCommission();
  }, [selectedMonth]);

  // ====================================================
  // LOGIC: THỐNG KÊ DOANH THU KPI
  // ====================================================
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [reports]);

  const availableMonths = useMemo(() => getAvailableMonths(reports), [reports]);
  
  const currentReportMonth = useMemo(() => {
    return sortedReports.find(r => r.monthKey === selectedMonth);
  }, [sortedReports, selectedMonth]);

  const previousReportMonth = useMemo(() => {
    if (!selectedMonth) return undefined;
    const currentIndex = availableMonths.findIndex(m => m === selectedMonth);
    if (currentIndex !== -1 && currentIndex + 1 < availableMonths.length) {
      return sortedReports.find(r => r.monthKey === availableMonths[currentIndex + 1]);
    }
    return undefined;
  }, [sortedReports, availableMonths, selectedMonth]);

  const calculateGrowth = (current?: number, previous?: number) => {
    if (!current) return 0;
    if (!previous || previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(currentReportMonth?.totalGross, previousReportMonth?.totalGross);
  const guestGrowth = calculateGrowth(currentReportMonth?.guestCount, previousReportMonth?.guestCount);

  const renderGrowthBadge = (growth: number) => {
    if (growth > 0) return <span className="text-emerald-500 flex items-center text-[11px] font-bold"><ArrowUpRight className="w-3 h-3 mr-0.5"/>+{growth.toFixed(1)}%</span>;
    if (growth < 0) return <span className="text-red-500 flex items-center text-[11px] font-bold"><ArrowDownRight className="w-3 h-3 mr-0.5"/>{growth.toFixed(1)}%</span>;
    return <span className="text-slate-400 text-[11px] font-bold">0%</span>;
  };

  const barChartData = useMemo(() => {
    return sortedReports.slice(0, 6).reverse().map(r => ({
      name: `T${r.monthKey.split("-")[1]}/${r.monthKey.split("-")[0].slice(-2)}`,
      total: r.totalGross,
      fullMonth: r.monthKey
    }));
  }, [sortedReports]);

  // ====================================================
  // LOGIC: BIỂU ĐỒ HOA HỒNG (PIE CHART)
  // ====================================================
  const wineChartData = useMemo(() => {
    const map: Record<string, number> = {};
    wineBills.forEach(b => {
      if (!map[b.staffName]) map[b.staffName] = 0;
      map[b.staffName] += b.commissionEarned || 0;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [wineBills]);

  // ====================================================
  // LOGIC: DANH SÁCH CÔNG NỢ
  // ====================================================
  const enrichedTasks = useMemo(() => {
    return tasks.map((task) => {
      const debtAmount = Number(task.title) || 0;
      const totalSubtasks = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
      const completedSubtasks = Array.isArray(task.subtasks) ? task.subtasks.filter((st: any) => st.completed).length : 0;

      const completedAmount = Array.isArray(task.subtasks)
        ? task.subtasks
            .filter((st: any) => st.completed)
            .reduce((sum: number, st: any) => {
              const amount = typeof st.title === "string" ? Number(st.title.replace(/[^\d.-]/g, "")) : Number(st.title);
              return sum + (Number.isFinite(amount) ? amount : 0);
            }, 0)
        : 0;

      const progressPercent = totalSubtasks > 0
        ? Math.min(100, Math.round((completedSubtasks / totalSubtasks) * 100))
        : task.status === "Done" ? 100 : 0;

      const statusText = progressPercent >= 100 || task.status === "Done" ? "Đã xong" : "Chưa thu đủ";
      const collectedAmount = progressPercent >= 100 && completedAmount === 0 ? debtAmount : completedAmount;
      const isFullyPaid = progressPercent >= 100;

      const dateObj = new Date(task.dueDate || task.createdAt || Date.now());
      const monthStr = format(dateObj, "MM/yyyy");
      const dayStr = format(dateObj, "dd/MM/yyyy");

      return { ...task, debtAmount, collectedAmount, progressPercent, isFullyPaid, statusText, dateObj, monthStr, dayStr };
    });
  }, [tasks]);

  const processedData = useMemo(() => {
    let result = [...enrichedTasks];
    
    // Filter by month
    if (selectedMonth) {
      const targetDebtMonth = `${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;
      result = result.filter(t => t.monthStr === targetDebtMonth);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.description && t.description.toLowerCase().includes(lowerQuery)) || 
        (t.project?.title && t.project.title.toLowerCase().includes(lowerQuery)) ||
        (t.title && String(t.title).toLowerCase().includes(lowerQuery))
      );
    }

    // Filter only unpaid
    if (showOnlyUnpaid) {
      result = result.filter(t => !t.isFullyPaid);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "date-desc": return b.dateObj.getTime() - a.dateObj.getTime();
        case "date-asc": return a.dateObj.getTime() - b.dateObj.getTime();
        case "amount-desc": return b.debtAmount - a.debtAmount;
        case "amount-asc": return a.debtAmount - b.debtAmount;
        case "status-done": return (a.isFullyPaid === b.isFullyPaid) ? 0 : a.isFullyPaid ? -1 : 1;
        case "status-pending": return (a.isFullyPaid === b.isFullyPaid) ? 0 : a.isFullyPaid ? 1 : -1;
        default: return 0;
      }
    });

    return result;
  }, [enrichedTasks, selectedMonth, sortOption, searchQuery, showOnlyUnpaid]);

  const { currentTotalDebt, currentTotalCollected, remainingDebt } = useMemo(() => {
    const totals = processedData.reduce(
      (acc, task) => {
        acc.currentTotalDebt += task.debtAmount;
        acc.currentTotalCollected += task.collectedAmount;
        return acc;
      },
      { currentTotalDebt: 0, currentTotalCollected: 0 }
    );
    return {
      ...totals,
      remainingDebt: totals.currentTotalDebt - totals.currentTotalCollected
    };
  }, [processedData]);

  // Month navigation
  const goToPreviousMonth = () => {
    const currentIndex = availableMonths.findIndex(m => m === selectedMonth);
    if (currentIndex !== -1 && currentIndex + 1 < availableMonths.length) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const goToNextMonth = () => {
    const currentIndex = availableMonths.findIndex(m => m === selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Loader />
    </div>
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const displayMonthText = selectedMonth && currentReportMonth
    ? `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`
    : "Không có dữ liệu";

  // Custom tooltip cho pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-slate-200 shadow-xl rounded-lg text-sm min-w-[220px] z-50">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
            Chi tiết Hoa Hồng ({displayMonthText})
          </p>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {wineChartData.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                  <span className="text-xs">{item.name}</span>
                </div>
                <span className="text-xs font-medium text-emerald-600">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-black text-slate-800">
            <span>Tổng cộng:</span>
            <span>{formatCurrency(wineChartData.reduce((a, b) => a + b.value, 0))}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
      
      {/* ================= HEADER ================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Tổng Quan Hệ Thống
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-lg">
              Thống kê doanh thu, hoa hồng và công nợ chi tiết theo từng tháng
            </p>
          </div>
          
          {/* Month Selector with Navigation */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPreviousMonth}
              disabled={availableMonths.findIndex(m => m === selectedMonth) === availableMonths.length - 1}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold whitespace-nowrap">Tháng:</span>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
              >
                {availableMonths.length > 0 ? (
                  availableMonths.map(month => (
                    <option key={month} value={month} className="bg-slate-800 text-white">
                      {`Tháng ${month.split('-')[1]}/${month.split('-')[0]}`}
                    </option>
                  ))
                ) : (
                  <option value={selectedMonth} className="bg-slate-800 text-white">
                    {displayMonthText}
                  </option>
                )}
              </select>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextMonth}
              disabled={availableMonths.findIndex(m => m === selectedMonth) === 0}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ================= BỐ CỤC CHÍNH (GRID 2 CỘT) ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* === CỘT TRÁI: 3 KPI & DANH SÁCH CÔNG NỢ === */}
        <div className="xl:col-span-2 flex flex-col gap-5">
          
          {/* 3 THẺ KPI - Enhanced */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30 hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Doanh Thu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency(currentReportMonth?.totalGross || 0)}
                </div>
                <div className="flex items-center mt-2 gap-1.5 text-xs">
                  {renderGrowthBadge(revenueGrowth)} so với tháng trước
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50/30 hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> Khách Hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-800">
                  {currentReportMonth?.guestCount?.toLocaleString() || 0}
                </div>
                <div className="flex items-center mt-2 gap-1.5 text-xs">
                  {renderGrowthBadge(guestGrowth)} so với tháng trước
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-amber-50/30 hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <Receipt className="w-3 h-3" /> Chi Tiêu TB
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency((currentReportMonth?.guestCount || 0) > 0 ? (currentReportMonth!.totalGross / currentReportMonth!.guestCount) : 0)}
                </div>
                <div className="flex items-center mt-2 gap-1.5 text-xs">
                  <span className="text-slate-400">Chi tiêu trung bình/khách</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DANH SÁCH CÔNG NỢ - Enhanced */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Tìm kiếm công nợ..." 
                    className="h-9 pl-9 text-sm bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 border-slate-200 bg-white">
                      <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
                      Sắp xếp
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setSortOption("date-desc")}>📅 Mới nhất lên trước</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("date-asc")}>📅 Cũ nhất lên trước</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("amount-desc")}>💰 Số nợ cao nhất</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("amount-asc")}>💰 Số nợ thấp nhất</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("status-done")}>✅ Ưu tiên "Đã xong"</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOption("status-pending")}>⏳ Ưu tiên "Chưa thu đủ"</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant={showOnlyUnpaid ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
                  className={`h-9 ${showOnlyUnpaid ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-200 bg-white'}`}
                >
                  <Clock className="w-3.5 h-3.5 mr-2" />
                  {showOnlyUnpaid ? "Hiển thị tất cả" : "Chưa thu đủ"}
                </Button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-500">Công nợ: </span>
                  <span className="font-bold text-slate-800">{processedData.length}</span>
                </div>
                <div className="bg-emerald-50 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-500">Còn lại: </span>
                  <span className="font-bold text-emerald-600">{formatCurrency(remainingDebt)}</span>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-lg overflow-hidden bg-white rounded-xl">
              <div className="overflow-x-auto max-h-[500px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700 w-[110px]">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Tổng Nợ</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Đã Thu</TableHead>
                      <TableHead className="font-semibold text-slate-700 w-[100px]">Tiến độ</TableHead>
                      <TableHead className="font-semibold text-slate-700">Dự án / Ghi chú</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  
                  <TableBody>
                    {processedData.length > 0 ? (
                      processedData.map((task) => (
                        <TableRow 
                          key={task._id} 
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          onClick={() => {
                            const workspaceId = task.workspace?._id || task.workspace || task.workspaceId || task.project?.workspace?._id || task.project?.workspace;
                            const projectId = task.project?._id || task.project || task.projectId;
                            if (workspaceId && projectId) {
                              navigate(`/workspaces/${workspaceId}/projects/${projectId}`);
                            }
                          }}
                        >
                          <TableCell>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                              task.isFullyPaid 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {task.isFullyPaid ? <CheckCircle2 className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                              {task.statusText}
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-bold text-slate-800 text-sm whitespace-nowrap">
                            {formatCurrency(task.debtAmount)}
                          </TableCell>

                          <TableCell className="text-right font-medium text-emerald-600 text-sm whitespace-nowrap">
                            {formatCurrency(task.collectedAmount)}
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1.5 w-full min-w-[80px]">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-semibold text-slate-500">{task.progressPercent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    task.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${task.progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                                {task.project?.title || "Không xác định"}
                              </span>
                              <span className="text-[11px] text-slate-400 line-clamp-1">
                                {task.description || "Không có mô tả"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center text-xs font-medium text-slate-500 whitespace-nowrap">
                            {task.dayStr}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <NoDataFound 
                            title={`Không có công nợ ${displayMonthText.toLowerCase()}`}
                            description="Chưa có dữ liệu phù hợp với bộ lọc." 
                            buttonText="" 
                            buttonAction={() => {}} 
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>

                  {processedData.length > 0 && (
                    <TableFooter className="bg-slate-50 sticky bottom-0 z-10 border-t border-slate-200">
                      <TableRow className="hover:bg-slate-50">
                        <TableCell className="font-bold text-slate-700 text-xs uppercase">
                          TỔNG ({processedData.length})
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-800 text-sm">
                          {formatCurrency(currentTotalDebt)}
                        </TableCell>
                        <TableCell className="text-right font-black text-emerald-600 text-sm">
                          {formatCurrency(currentTotalCollected)}
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </Card>
          </div>
        </div>

        {/* === CỘT PHẢI: 2 BIỂU ĐỒ === */}
        <div className="xl:col-span-1 flex flex-col gap-5">
          
          {/* BAR CHART - Enhanced */}
          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                Biểu Đồ Doanh Thu
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Xu hướng 6 tháng gần nhất
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {barChartData.length > 0 ? (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 11}} 
                        dy={10} 
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 11}} 
                        dx={-5}
                      />
                      <BarTooltip 
                        cursor={{fill: '#f8fafc'}}
                        formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                        labelStyle={{color: '#1e293b', fontWeight: 'bold'}}
                        contentStyle={{
                          borderRadius: '12px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                          fontSize: '12px',
                          padding: '8px 12px'
                        }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#3b82f6" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={45}
                        onClick={(data) => {
                          if (data && data.fullMonth) {
                            setSelectedMonth(data.fullMonth);
                          }
                        }}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[240px] w-full flex items-center justify-center text-slate-400 text-sm">
                  <div className="text-center">
                    <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <span>Chưa có dữ liệu</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PIE CHART - Enhanced */}
          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                  <PieChartIcon className="w-4 h-4 text-emerald-600" />
                </div>
                Tỉ Trọng Hoa Hồng
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {displayMonthText} - Theo nhân viên
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {wineChartData.length > 0 ? (
                <div className="h-[260px] w-full flex flex-col items-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={wineChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55} 
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="white"
                        strokeWidth={2}
                      >
                        {wineChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </Pie>
                      <PieTooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Tổng chi</p>
                    <p className="text-base font-black text-slate-800">
                      {formatCurrency(wineChartData.reduce((acc, curr) => acc + curr.value, 0))}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-[260px] w-full flex flex-col gap-2 items-center justify-center text-slate-400">
                  <PieChartIcon className="w-12 h-12 opacity-20" />
                  <span className="text-sm font-medium">Chưa có dữ liệu hoa hồng</span>
                  <span className="text-xs">Tháng {displayMonthText.toLowerCase()}</span>
                </div>
              )}

              {/* Legend for Pie Chart */}
              {wineChartData.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-center">
                  {wineChartData.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="text-[10px] text-slate-500">{item.name}</span>
                    </div>
                  ))}
                  {wineChartData.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{wineChartData.length - 4} khác</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>


        </div>
      </div>
    </div>
  );
};

export default Dashboard;
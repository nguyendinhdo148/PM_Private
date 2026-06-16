import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router";
import { 
  CheckCircle2, Clock, ArrowUpDown, Search, 
  DollarSign, Users, Receipt, ArrowUpRight, ArrowDownRight, 
  TrendingUp, CalendarDays, PieChart as PieChartIcon, 
  X, Wallet, ChevronLeft, ChevronRight, Sparkles,
  Award, Crown, Star, Medal
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
  PieChart, Pie, Cell, Sector
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

const PIE_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#d946ef', '#eab308'
];

// Helper: Get available months from reports
const getAvailableMonths = (reports: MonthlyReport[]) => {
  return reports
    .map(r => r.monthKey)
    .sort((a, b) => b.localeCompare(a));
};

// Get rank icon based on index
const getRankIcon = (index: number) => {
  switch(index) {
    case 0: return <Crown className="w-3.5 h-3.5 text-yellow-500" />;
    case 1: return <Medal className="w-3.5 h-3.5 text-gray-400" />;
    case 2: return <Medal className="w-3.5 h-3.5 text-amber-600" />;
    default: return <Award className="w-3.5 h-3.5 text-slate-400" />;
  }
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
  
  // Pie chart active index for hover effect
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);

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

    const data = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
    }));
  }, [wineBills]);

  const totalCommission = useMemo(() => {
    return wineChartData.reduce((sum, item) => sum + item.value, 0);
  }, [wineChartData]);

  const hoveredData = useMemo(() => {
    if (activePieIndex !== undefined && wineChartData[activePieIndex]) {
      return wineChartData[activePieIndex];
    }
    return null;
  }, [activePieIndex, wineChartData]);

  // Custom active shape for pie chart - zoom effect
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    
    return (
      <g>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="6" floodOpacity="0.3"/>
        </filter>
        
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 4}
          outerRadius={outerRadius + 12}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.15}
        />
        
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          filter="url(#shadow)"
          stroke="#fff"
          strokeWidth={3}
        />
      </g>
    );
  };

  // ====================================================
  // LOGIC: DANH SÁCH CÔNG NỢ
  // ====================================================
  const enrichedTasks = useMemo(() => {
    return tasks.map((task) => {
      const debtAmount = Number(task.title) || 0;
      const paidAmount = Array.isArray(task.subtasks)
        ? task.subtasks
            .filter((st: any) => st.completed)
            .reduce((sum: number, st: any) => {
              const rawValue = typeof st.title === "string" ? st.title.replace(/[^\d.-]/g, "") : st.title;
              const amount = Number(rawValue);
              return sum + (Number.isFinite(amount) ? amount : 0);
            }, 0)
        : 0;

      const isDone = task.status === "Done";
      const progressPercent = isDone
        ? 100
        : debtAmount > 0
          ? Math.min(100, Math.round((paidAmount / debtAmount) * 100))
          : 0;

      const collectedAmount = isDone ? debtAmount : Math.min(paidAmount, debtAmount);
      const isFullyPaid = isDone || (debtAmount > 0 ? collectedAmount >= debtAmount : false);
      const statusText = isFullyPaid ? "Hoàn thành" : "Đang xử lý";

      const dateObj = new Date(task.dueDate || task.createdAt || Date.now());
      const monthStr = format(dateObj, "MM/yyyy");
      const dayStr = format(dateObj, "dd/MM/yyyy");

      return { ...task, debtAmount, collectedAmount, progressPercent, isFullyPaid, statusText, dateObj, monthStr, dayStr };
    });
  }, [tasks]);

  const processedData = useMemo(() => {
    let result = [...enrichedTasks];
    
    if (selectedMonth) {
      const targetDebtMonth = `${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;
      result = result.filter(t => t.monthStr === targetDebtMonth);
    }

    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.description && t.description.toLowerCase().includes(lowerQuery)) || 
        (t.project?.title && t.project.title.toLowerCase().includes(lowerQuery)) ||
        (t.title && String(t.title).toLowerCase().includes(lowerQuery))
      );
    }

    if (showOnlyUnpaid) {
      result = result.filter(t => !t.isFullyPaid);
    }

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

  const onPieEnter = (_: any, index: number) => {
    setActivePieIndex(index);
  };

  const onPieLeave = () => {
    setActivePieIndex(undefined);
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

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-screen">
      
      {/* ================= HEADER ================= */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
    Tổng Quan
  </h1>
  
  <div className="flex items-center gap-2">
    <Button 
      variant="outline" 
      size="sm" 
      onClick={goToPreviousMonth}
      disabled={availableMonths.findIndex(m => m === selectedMonth) === availableMonths.length - 1}
    >
      <ChevronLeft className="w-4 h-4" />
    </Button>
    
    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
      <CalendarDays className="w-4 h-4 text-blue-600" />
      <span className="text-sm font-medium whitespace-nowrap text-slate-600">Tháng:</span>
      <select 
        value={selectedMonth} 
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer"
      >
        {availableMonths.length > 0 ? (
          availableMonths.map(month => (
            <option key={month} value={month}>
              {`Tháng ${month.split('-')[1]}/${month.split('-')[0]}`}
            </option>
          ))
        ) : (
          <option value={selectedMonth}>
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
    >
      <ChevronRight className="w-4 h-4" />
    </Button>
  </div>
</div>

      {/* ================= BỐ CỤC CHÍNH ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* === CỘT TRÁI === */}
        <div className="xl:col-span-2 flex flex-col gap-6">
  
  {/* 3 THẺ KPI */}
  <div className="grid gap-4 md:grid-cols-3">
    <Card className="border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-blue-600" /> Doanh Thu
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold text-slate-900">
          {formatCurrency(currentReportMonth?.totalGross || 0)}
        </div>
        <div className="flex items-center mt-1 gap-1.5 text-xs">
          {renderGrowthBadge(revenueGrowth)} so với tháng trước
        </div>
      </CardContent>
    </Card>

    <Card className="border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-1">
          <Users className="w-4 h-4 text-emerald-600" /> Khách Hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold text-slate-900">
          {currentReportMonth?.guestCount?.toLocaleString() || 0}
        </div>
        <div className="flex items-center mt-1 gap-1.5 text-xs">
          {renderGrowthBadge(guestGrowth)} so với tháng trước
        </div>
      </CardContent>
    </Card>

    <Card className="border bg-white shadow-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-500 flex items-center gap-1">
          <Receipt className="w-4 h-4 text-amber-600" /> Chi Tiêu TB
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold text-slate-900">
          {formatCurrency((currentReportMonth?.guestCount || 0) > 0 ? (currentReportMonth!.totalGross / currentReportMonth!.guestCount) : 0)}
        </div>
        <div className="flex items-center mt-1 gap-1.5 text-xs text-slate-500">
          Chi tiêu trung bình/khách
        </div>
      </CardContent>
    </Card>
  </div>

  {/* DANH SÁCH CÔNG NỢ */}
  <div className="flex flex-col gap-4">
    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {/* Tìm kiếm */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Tìm kiếm công nợ..." 
            className="h-9 pl-9 text-sm bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
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

        {/* Sắp xếp */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 bg-white">
              <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
              Sắp xếp
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setSortOption("date-desc")}>Mới nhất lên trước</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("date-asc")}>Cũ nhất lên trước</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("amount-desc")}>Số nợ cao nhất</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("amount-asc")}>Số nợ thấp nhất</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("status-done")}>Ưu tiên hoàn thành</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOption("status-pending")}>Ưu tiên đang xử lý</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Lọc Trạng thái */}
        <Button 
          variant={showOnlyUnpaid ? "default" : "outline"} 
          size="sm" 
          onClick={() => setShowOnlyUnpaid(!showOnlyUnpaid)}
          className={`h-9 ${showOnlyUnpaid ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white'}`}
        >
          <Clock className="w-3.5 h-3.5 mr-2" />
          {showOnlyUnpaid ? "Tất cả" : "Đang xử lý"}
        </Button>
      </div>

      {/* Thống kê nhỏ */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-slate-500">Công nợ: </span>
          <span className="font-semibold text-slate-900">{processedData.length}</span>
        </div>
        <div>
          <span className="text-slate-500">Còn lại: </span>
          <span className="font-semibold text-red-600">{formatCurrency(remainingDebt)}</span>
        </div>
      </div>
    </div>

    {/* Bảng dữ liệu */}
    <Card className="border rounded-lg shadow-sm bg-white overflow-hidden">
      <div className="overflow-x-auto max-h-[500px]">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
            <TableRow>
              <TableHead className="font-medium text-slate-600 w-[110px]">Trạng thái</TableHead>
              <TableHead className="font-medium text-slate-600 text-right">Tổng Nợ</TableHead>
              <TableHead className="font-medium text-slate-600 text-right">Đã Thu</TableHead>
              <TableHead className="font-medium text-slate-600 w-[100px]">Tiến độ</TableHead>
              <TableHead className="font-medium text-slate-600">Dự án / Ghi chú</TableHead>
              <TableHead className="font-medium text-slate-600 text-center">Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {processedData.length > 0 ? (
              processedData.map((task) => (
                <TableRow 
                  key={task._id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    const workspaceId = task.workspace?._id || task.workspace || task.workspaceId || task.project?.workspace?._id || task.project?.workspace;
                    const projectId = task.project?._id || task.project || task.projectId;
                    if (workspaceId && projectId) {
                      navigate(`/workspaces/${workspaceId}/projects/${projectId}`);
                    }
                  }}
                >
                  <TableCell>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap ${
                      task.isFullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {task.isFullyPaid ? <CheckCircle2 className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                      {task.statusText}
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-medium text-slate-900 text-sm whitespace-nowrap">
                    {formatCurrency(task.debtAmount)}
                  </TableCell>

                  <TableCell className="text-right text-slate-600 text-sm whitespace-nowrap">
                    {formatCurrency(task.collectedAmount)}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-1 w-full min-w-[80px]">
                      <div className="text-[10px] text-slate-500 text-right">{task.progressPercent}%</div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${task.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        {task.project?.title || "Không xác định"}
                      </span>
                      <span className="text-xs text-slate-500 line-clamp-1">
                        {task.description || "Không có mô tả"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-center text-sm text-slate-500 whitespace-nowrap">
                    {task.dayStr}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <NoDataFound 
                    title={`Không có dữ liệu ${displayMonthText.toLowerCase()}`}
                    description="Thử thay đổi bộ lọc hoặc chọn tháng khác." 
                    buttonText="" 
                    buttonAction={() => {}} 
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {processedData.length > 0 && (
            <TableFooter className="bg-slate-50 sticky bottom-0 z-10 border-t">
              <TableRow>
                <TableCell className="font-semibold text-slate-900 text-xs">
                  TỔNG ({processedData.length})
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900 text-sm">
                  {formatCurrency(currentTotalDebt)}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-600 text-sm">
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
          
          {/* BAR CHART */}
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
                          padding: '8px 12px',
                          zIndex: 9999
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

          {/* PIE CHART - WITH HOVER TOGGLE EFFECT */}
          <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <PieChartIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  Tỉ Trọng Hoa Hồng
                </CardTitle>
                {wineChartData.length > 0 && !hoveredData && (
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tổng chi</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(totalCommission)}</p>
                  </div>
                )}
                {hoveredData && (
                  <div className="text-right animate-in fade-in duration-200">
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Đang chọn</p>
                    <p className="text-sm font-black text-emerald-600">{hoveredData.name}</p>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs text-slate-400">
                {displayMonthText} - Di chuột vào biểu đồ để xem chi tiết
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              {wineChartData.length > 0 ? (
                <div>
                  {/* Pie Chart - Larger size */}
                  <div className="h-[320px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          activeIndex={activePieIndex}
                          activeShape={renderActiveShape}
                          data={wineChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="white"
                          strokeWidth={2.5}
                          onMouseEnter={onPieEnter}
                          onMouseLeave={onPieLeave}
                        >
                          {wineChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                              className="transition-all duration-300 cursor-pointer"
                              style={{ filter: activePieIndex === index ? 'brightness(1.05)' : 'none' }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Center content - changes based on hover state */}
                    {!hoveredData ? (
                      // Show total commission when not hovering
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Tổng hoa hồng</p>
                        <p className="text-base font-black text-slate-800">
                          {formatCurrency(totalCommission)}
                        </p>
                      </div>
                    ) : (
                      // Show hovered staff info when hovering
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                        <div 
                          className="w-10 h-10 rounded-full mx-auto mb-1 shadow-lg flex items-center justify-center"
                          style={{ backgroundColor: PIE_COLORS[activePieIndex! % PIE_COLORS.length] + '20' }}
                        >
                          <div 
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[activePieIndex! % PIE_COLORS.length] }}
                          />
                        </div>
                        <p className="text-xs font-bold text-slate-700 mt-1">
                          {hoveredData.name}
                        </p>
                        <p className="text-base font-black text-emerald-600">
                          {formatCurrency(hoveredData.value)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {hoveredData.percentage}% tổng
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ranking Table */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-1 gap-1.5">
                      {wineChartData.map((item, index) => {
                        const isActive = activePieIndex === index;
                        return (
                          <div 
                            key={index}
                            onMouseEnter={() => setActivePieIndex(index)}
                            onMouseLeave={() => setActivePieIndex(undefined)}
                            className={`
                              flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer
                              ${isActive 
                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm scale-[1.01]' 
                                : 'hover:bg-slate-50'
                              }
                            `}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex items-center justify-center w-6">
                                {getRankIcon(index)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-200"
                                  style={{ 
                                    backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                                    transform: isActive ? 'scale(1.2)' : 'scale(1)'
                                  }}
                                />
                                <span className={`text-sm font-medium transition-all duration-200 ${isActive ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                                  {item.name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs text-slate-400 ${isActive ? 'text-emerald-600 font-semibold' : ''}`}>
                                {item.percentage}%
                              </span>
                              <span className={`text-sm font-bold transition-all duration-200 ${isActive ? 'text-emerald-600 scale-105' : 'text-slate-800'}`}>
                                {formatCurrency(item.value)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[320px] w-full flex flex-col gap-2 items-center justify-center text-slate-400">
                  <PieChartIcon className="w-12 h-12 opacity-20" />
                  <span className="text-sm font-medium">Chưa có dữ liệu hoa hồng</span>
                  <span className="text-xs">Tháng {displayMonthText.toLowerCase()}</span>
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
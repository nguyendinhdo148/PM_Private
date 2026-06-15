import React, { useState, useMemo, useEffect } from "react";
import { Wallet, ArrowDownRight, ArrowUpRight, HandCoins, Beer, PlusCircle, AlertCircle, X, Calendar, Edit, Trash2, Filter, ArrowDown, ArrowUp, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { fetchData, updateData, postData, deleteData } from "@/lib/fetch-util";

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "ADVANCE" | "REFUND";

export interface FundTransaction {
  _id: string;
  title: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  createdBy?: { _id: string; name: string }; 
  isRecovered?: boolean;
}

export default function FundManagement() {
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<"ALL" | "EXPENSES">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "DEPOSIT" as TransactionType,
    amount: "",
    transactionDate: new Date().toISOString().split('T')[0],
  });

  // Bộ Lọc & Tìm kiếm
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // 1. FETCH DỮ LIỆU BẰNG fetch-util
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const result = (await fetchData(`/funds`)) as ApiResponse;
      if (result.success) {
        setTransactions(result.data.transactions);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu quỹ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // TÍNH TOÁN THỐNG KÊ
  const stats = useMemo(() => {
    const s = { DEPOSIT: 0, WITHDRAWAL: 0, ADVANCE: 0, REFUND: 0 };
    transactions.forEach(tx => { s[tx.type] += tx.amount; });
    return s;
  }, [transactions]);

  // Logic tính quỹ
  const actualTotalFund = stats.DEPOSIT - stats.WITHDRAWAL; 
  const pendingAdvances = stats.ADVANCE - stats.REFUND; 
  const currentBalance = actualTotalFund - pendingAdvances; 

  const isPartyTime = actualTotalFund >= 2000000;

  // XỬ LÝ LỌC & TÌM KIẾM
  const processedTransactions = useMemo(() => {
    let result = [...transactions];
    
    // Lọc theo Tab
    if (activeTab === "EXPENSES") {
      result = result.filter(tx => tx.type === "WITHDRAWAL");
    }

    // Lọc theo search (Nội dung)
    if (search) {
      result = result.filter(tx => tx.title.toLowerCase().includes(search.toLowerCase()));
    }
    // Lọc theo năm
    if (filterYear !== "all") {
      result = result.filter(tx => tx.transactionDate.startsWith(filterYear));
    }
    // Lọc theo tháng
    if (filterMonth !== "all") {
      const month = filterMonth.padStart(2, '0');
      result = result.filter(tx => tx.transactionDate.includes(`-${month}-`));
    }
    // Sắp xếp
    result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        const timeA = new Date(a.transactionDate).getTime();
        const timeB = new Date(b.transactionDate).getTime();
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      } else {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });
    return result;
  }, [transactions, activeTab, search, filterMonth, filterYear, sortConfig]);

  const handleSort = (key: 'date' | 'amount') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Helpers format
  const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  const formatDateForDisplay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getTransactionStyle = (type: TransactionType) => {
    switch (type) {
      case "DEPOSIT": return { icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Nạp quỹ" };
      case "REFUND": return { icon: ArrowDownRight, color: "text-blue-500", bg: "bg-blue-500/10", label: "Thu hồi" };
      case "WITHDRAWAL": return { icon: ArrowUpRight, color: "text-rose-500", bg: "bg-rose-500/10", label: "Trích quỹ" };
      case "ADVANCE": return { icon: HandCoins, color: "text-amber-500", bg: "bg-amber-500/10", label: "Ứng quỹ" };
      default: return { icon: Wallet, color: "text-gray-500", bg: "bg-gray-500/10", label: "Khác" };
    }
  };

  // ---- THAO TÁC API ACTIONS ----
  const openAddModal = () => {
    setEditingId(null);
    setFormData({ title: "", type: "DEPOSIT", amount: "", transactionDate: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const openPartyModal = () => {
    setEditingId(null);
    setFormData({ title: "Giải ngân quỹ nhậu team 🍻", type: "WITHDRAWAL", amount: "", transactionDate: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const handleEdit = (tx: FundTransaction) => {
    setEditingId(tx._id);
    setFormData({ 
      title: tx.title, 
      type: tx.type, 
      amount: tx.amount.toString(), 
      transactionDate: new Date(tx.transactionDate).toISOString().split('T')[0] 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác!")) {
      try {
        const result = (await deleteData(`/funds/transaction/${id}`)) as ApiResponse;
        if (result.success) {
          setTransactions(transactions.filter(tx => tx._id !== id));
        } else {
          alert("Lỗi khi xóa: " + result.message);
        }
      } catch (error) {
        console.error("Lỗi xóa giao dịch:", error);
      }
    }
  };

  const handleRecover = async (advanceTx: FundTransaction) => {
    if (confirm(`Xác nhận thu hồi ${formatMoney(advanceTx.amount)} từ khoản ứng này?`)) {
      try {
        const result = (await postData(`/funds/transaction/${advanceTx._id}/recover`, {})) as ApiResponse;
        if (result.success) {
          fetchTransactions();
        } else {
          alert("Lỗi thu hồi: " + result.message);
        }
      } catch (error) {
        console.error("Lỗi thu hồi tiền ứng:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.transactionDate) return;

    const numAmount = Number(formData.amount);
    if (formData.type === "WITHDRAWAL" && !editingId && numAmount > currentBalance) {
      alert("Quỹ mặt không đủ số dư để trích xuất khoản tiền này, vui lòng thu hồi ứng trước!");
      return;
    }

    try {
      const payload = {
        title: formData.title,
        type: formData.type,
        amount: numAmount,
        transactionDate: formData.transactionDate 
      };

      let result: ApiResponse;
      if (editingId) {
        result = (await updateData(`/funds/transaction/${editingId}`, payload)) as ApiResponse;
      } else {
        result = (await postData(`/funds/transaction`, payload)) as ApiResponse;
      }
      
      if (result.success) {
        setIsModalOpen(false);
        fetchTransactions();
      } else {
        alert("Lỗi lưu giao dịch: " + result.message);
      }
    } catch (error: any) {
      console.error("Lỗi Submit:", error);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({length: 6}, (_, i) => (currentYear - i).toString());

  if (isLoading) {
    return <div className="p-10 text-center animate-pulse text-muted-foreground">Đang tải hệ thống quỹ...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Quản Lý Quỹ Team</h1>
            <p className="text-muted-foreground text-sm mt-1">Theo dõi thu chi, ứng quỹ và tự động báo nhậu.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAddModal} className="gap-2 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> Thêm giao dịch
          </Button>
        </div>
      </div>

      {isPartyTime && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 p-1 shadow-lg animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between bg-card/90 backdrop-blur-sm p-4 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-500/20 rounded-full animate-bounce"><Beer className="w-8 h-8 text-pink-500" /></div>
              <div>
                <h3 className="font-bold text-lg text-foreground bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">Tới mốc đi nhậu rồi anh em ơi !!! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  Tổng quỹ đã chạm mốc {formatMoney(actualTotalFund)}.
                  {pendingAdvances > 0 ? (
                    <span className="text-amber-500 font-bold ml-1">
                      Nhưng đang có {formatMoney(pendingAdvances)} tiền ứng, thu hồi quỹ sớm rồi đi nhậu nhé ~
                    </span>
                  ) : (
                    <span className="ml-1">Tới lúc lên kèo giải ngân!</span>
                  )}
                </p>
              </div>
            </div>
            <Button onClick={openPartyModal} variant="secondary" className="font-bold border-2 border-pink-500/50 hover:bg-pink-500 hover:text-white transition-colors">Lên Kèo Ngay 🍻</Button>
          </div>
        </div>
      )}

      {/* DASHBOARD CARD */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50/30 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700 font-bold">Tổng quỹ thực tế</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600">
              {formatMoney(actualTotalFund)}
            </div>
            <p className="text-xs text-emerald-600/70 mt-2 font-medium">Bao gồm cả tiền đang cho ứng</p>
          </CardContent>
        </Card>

        <Card className="border-slate-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tiền mặt hiện có</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-extrabold", currentBalance < 0 ? "text-rose-500" : "text-foreground")}>
              {formatMoney(currentBalance)}
            </div>
            {currentBalance < 0 && <p className="text-xs text-rose-500 mt-2 flex items-center font-medium"><AlertCircle className="w-3 h-3 mr-1"/>Quỹ âm do có người ứng tiền</p>}
          </CardContent>
        </Card>

        <Card className="border-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Đang cho ứng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{formatMoney(pendingAdvances)}</div>
            {pendingAdvances > 0 && <p className="text-xs text-amber-500 mt-2 font-medium">Cần thu hồi!</p>}
          </CardContent>
        </Card>

        <Card className="border-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tổng thực chi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-500">{formatMoney(stats.WITHDRAWAL)}</div>
          </CardContent>
        </Card>
      </div>

      {/* TABS & BẢNG LỊCH SỬ GIAO DỊCH */}
      <div className="pt-6">
        <div className="flex space-x-1 rounded-xl bg-slate-200/50 p-1 w-max mb-4">
          <button
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            )}
          >
            Tất cả giao dịch
          </button>
          <button
            onClick={() => setActiveTab("EXPENSES")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "EXPENSES" ? "bg-white text-rose-600 shadow-sm" : "text-slate-600 hover:text-rose-600 hover:bg-slate-200"
            )}
          >
            Lịch sử trích quỹ (Chi)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input placeholder="Tìm kiếm theo nội dung..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-slate-300" />
          </div>
          <div className="flex gap-2">
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer">
              <option value="all">Tất cả tháng</option>
              {Array.from({length: 12}, (_, i) => <option key={i} value={(i + 1).toString()}>Tháng {i + 1}</option>)}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="h-10 rounded-md border border-slate-300 bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer">
              <option value="all">Tất cả năm</option>
              {yearOptions.map(y => <option key={y} value={y}>Năm {y}</option>)}
            </select>
          </div>
        </div>

        <Card className="border-slate-300">
          <div className="rounded-md overflow-x-auto">
            <Table className="border-collapse w-full">
              <TableHeader>
                <TableRow className="bg-slate-200">
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap px-4 py-3 cursor-pointer hover:bg-slate-300 transition-colors select-none w-[150px]" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-2">Ngày thực hiện {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5"/> : <ArrowDown className="w-3.5 h-3.5"/>)}</div>
                  </TableHead>
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap px-4 py-3 w-[150px]">Phân loại</TableHead>
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap px-4 py-3">Nội dung chi tiết</TableHead>
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap px-4 py-3 text-right cursor-pointer hover:bg-slate-300 transition-colors select-none w-[180px]" onClick={() => handleSort('amount')}>
                    <div className="flex items-center justify-end gap-2">Số tiền {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5"/> : <ArrowDown className="w-3.5 h-3.5"/>)}</div>
                  </TableHead>
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-4 py-3 w-[120px]">Trạng thái</TableHead>
                  <TableHead className="border border-slate-300 text-slate-800 font-bold whitespace-nowrap text-center px-4 py-3 w-[100px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-medium text-[14px]">
                      {activeTab === "EXPENSES" ? "Chưa có dữ liệu trích quỹ nào." : "Chưa có giao dịch nào khớp với bộ lọc."}
                    </TableCell>
                  </TableRow>
                ) : (
                  processedTransactions.map((tx) => {
                    const style = getTransactionStyle(tx.type);
                    const isNegative = tx.type === "WITHDRAWAL" || tx.type === "ADVANCE";
                    const isLocked = tx.type === "REFUND" || (tx.type === "ADVANCE" && tx.isRecovered);

                    return (
                      <TableRow key={tx._id} className="hover:bg-slate-50 transition-colors group">
                        <TableCell className="border border-slate-300 px-4 font-semibold text-slate-700 bg-slate-50 whitespace-nowrap">{formatDateForDisplay(tx.transactionDate)}</TableCell>
                        <TableCell className="border border-slate-300 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-medium">
                            <div className={cn("p-1.5 rounded-md", style.bg, style.color)}><style.icon className="w-4 h-4" /></div>
                            {style.label}
                          </div>
                        </TableCell>
                        <TableCell className="border border-slate-300 px-4 font-medium text-slate-800 whitespace-pre-wrap">{tx.title}</TableCell>
                        <TableCell className={cn("border border-slate-300 px-4 text-right font-extrabold whitespace-nowrap", isNegative ? "text-rose-500 bg-rose-50/30" : "text-emerald-600 bg-emerald-50/30")}>
                          {isNegative ? "-" : "+"}{formatMoney(tx.amount)}
                        </TableCell>
                        <TableCell className="border border-slate-300 px-4 text-center whitespace-nowrap">
                          {tx.type === "ADVANCE" ? (
                            tx.isRecovered ? <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-semibold">Đã thu hồi</span>
                            : <Button size="sm" variant="outline" onClick={() => handleRecover(tx)} className="text-amber-600 border-amber-500 hover:bg-amber-500 hover:text-white h-7 text-xs">Thu hồi</Button>
                          ) : <span className="px-2 py-1 bg-slate-500/10 text-slate-600 rounded-full text-xs font-semibold">Hoàn tất</span>}
                        </TableCell>
                        <TableCell className="border border-slate-300 px-4 whitespace-nowrap">
                          {!isLocked ? (
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(tx)} className="hover:bg-blue-100 hover:text-blue-600 h-7 w-7"><Edit className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(tx._id)} className="text-red-500 hover:bg-red-100 h-7 w-7"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          ) : <div className="text-center"><span className="text-xs text-muted-foreground/60 italic select-none">Khóa</span></div>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-card w-full max-w-[480px] rounded-2xl border border-border shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-emerald-200"><Wallet className="w-6 h-6 text-emerald-700" /></div>
              <h2 className="text-xl font-bold text-foreground">{formData.title === "Giải ngân quỹ nhậu team 🍻" ? "Lên Kèo Nhậu 🍻" : (editingId ? "Sửa thông tin giao dịch" : "Thêm giao dịch quỹ")}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Loại giao dịch</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as TransactionType})} disabled={formData.title === "Giải ngân quỹ nhậu team 🍻"}>
                    <option value="DEPOSIT">Nạp quỹ (+)</option>
                    <option value="WITHDRAWAL">Trích quỹ (-)</option>
                    <option value="ADVANCE">Ứng quỹ (-)</option>
                    <option value="REFUND">Thu hồi (+)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ngày thực hiện</label>
                  <Input type="date" required value={formData.transactionDate} onChange={(e) => setFormData({...formData, transactionDate: e.target.value})} className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Số tiền (VNĐ)</label>
                <div className="relative">
                  <Input type="number" min="0" required placeholder="VD: 500000" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="h-10 pl-3 pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">đ</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nội dung</label>
                <textarea required rows={3} placeholder="Nhập lý do nạp/chi quỹ..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" className="h-10 px-6 font-medium" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit" className="h-10 px-8 font-medium bg-emerald-600 hover:bg-emerald-700 text-white">Xác nhận</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
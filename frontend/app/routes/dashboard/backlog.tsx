import { useState, useEffect, useMemo } from "react";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";
import * as XLSX from "xlsx";

export default function BacklogPage() {
  const [monthData, setMonthData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // Trạng thái lọc default: tự động lấy năm-tháng hiện tại (định dạng YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }); 
  const [isLoading, setIsLoading] = useState(false);
  
  // States cho Tab & Lọc
  const [activeTab, setActiveTab] = useState<"UNPOSTED" | "POSTED">("UNPOSTED");

  // States cho bộ lọc
  const [searchName, setSearchName] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  // States cho Form Tháng
  const [isEditingMonth, setIsEditingMonth] = useState(false);
  const [monthNote, setMonthNote] = useState("");

  // States cho Form Hóa đơn
  const [editId, setEditId] = useState<string | null>(null);
  const defaultForm = {
    date: "", customerName: "", table: "", note: "",
    goodsAmount: "", discountAmount: "", beforeServiceCharge: "", totalAmount: "",
    status: "UNPOSTED", invoiceNumber: ""
  };
  const [formData, setFormData] = useState<any>(defaultForm);

  // =================== CRUD THÁNG ===================
  const fetchMonthData = async () => {
    setIsLoading(true);
    try {
      const res: any = await fetchData(`/invoice-months/${selectedMonth}`);
      setMonthData(res);
      setMonthNote(res.note);
      setInvoices(res.invoices || []);
      setIsEditingMonth(false);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setMonthData(null);
        setInvoices([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMonthData(); }, [selectedMonth]);

  // Reset bộ lọc khi đổi tháng
  useEffect(() => {
    setSearchName("");
    setFilterFromDate("");
    setFilterToDate("");
  }, [selectedMonth]);

  const handleCreateMonth = async () => {
    try {
      await postData("/invoice-months", { monthStr: selectedMonth, note: "" });
      fetchMonthData();
    } catch (error) {
      alert("Không thể tạo tháng này!");
    }
  };

  const handleUpdateMonth = async () => {
    try {
      await updateData(`/invoice-months/${selectedMonth}`, { note: monthNote });
      fetchMonthData();
    } catch (error) {
      alert("Lỗi cập nhật ghi chú tháng!");
    }
  };

  const handleDeleteMonth = async () => {
    if (window.confirm(`NGUY HIỂM: Bạn có chắc muốn xóa TOÀN BỘ dữ liệu tháng ${selectedMonth}? Tất cả hóa đơn sẽ bị xóa sạch!`)) {
      try {
        await deleteData(`/invoice-months/${selectedMonth}`);
        fetchMonthData();
      } catch (error) {
        alert("Lỗi xóa tháng!");
      }
    }
  };

  // =================== CRUD HÓA ĐƠN ===================
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
      const newData = { ...prev, [name]: value };
      
      if (name === "goodsAmount" || name === "discountAmount") {
        if (newData.goodsAmount === "" && newData.discountAmount === "") {
          newData.beforeServiceCharge = ""; 
        } else {
          const goods = parseFloat(newData.goodsAmount as any) || 0;
          const discount = parseFloat(newData.discountAmount as any) || 0;
          newData.beforeServiceCharge = goods - discount;
        }
      }
      
      return newData;
    });
  };

  const handleSubmitInvoice = async (e: any) => {
    e.preventDefault();
    if (!monthData) return alert("Vui lòng tạo tháng trước!");

    const payload = {
      ...formData,
      goodsAmount: Number(formData.goodsAmount) || 0,
      discountAmount: Number(formData.discountAmount) || 0,
      beforeServiceCharge: Number(formData.beforeServiceCharge) || 0,
      totalAmount: Number(formData.totalAmount) || 0,
    };

    try {
      if (editId) {
        await updateData(`/invoices/${editId}`, payload);
        setEditId(null);
      } else {
        await postData("/invoices", { ...payload, monthBoard: monthData._id });
      }
      fetchMonthData();
      setFormData(defaultForm);
    } catch (error) {
      alert("Có lỗi xảy ra khi lưu hóa đơn!");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa hóa đơn này?")) {
      try {
        await deleteData(`/invoices/${id}`);
        fetchMonthData();
      } catch (error) {
        alert("Lỗi xóa hóa đơn!");
      }
    }
  };

  // =================== HÀM LỌC CHUNG ===================
  // Lọc theo tên + khoảng ngày
  const applyFilters = (list: any[]) => {
    return list.filter(inv => {
      // Lọc theo tên khách hàng (không phân biệt hoa thường)
      if (searchName.trim()) {
        const keyword = searchName.trim().toLowerCase();
        const name = (inv.customerName || "").toLowerCase();
        const invoiceNum = (inv.invoiceNumber || "").toLowerCase();
        const table = (inv.table || "").toLowerCase();
        if (!name.includes(keyword) && !invoiceNum.includes(keyword) && !table.includes(keyword)) {
          return false;
        }
      }

      // Lọc theo ngày
      if (inv.date) {
        const invDate = new Date(inv.date);
        invDate.setHours(0, 0, 0, 0);

        if (filterFromDate) {
          const from = new Date(filterFromDate);
          from.setHours(0, 0, 0, 0);
          if (invDate < from) return false;
        }
        if (filterToDate) {
          const to = new Date(filterToDate);
          to.setHours(23, 59, 59, 999);
          if (invDate > to) return false;
        }
      }

      return true;
    });
  };

  // =================== TÍNH TOÁN & LỌC ===================
  // Lọc toàn bộ invoices theo bộ lọc hiện tại
  const filteredAll = useMemo(() => applyFilters(invoices), [invoices, searchName, filterFromDate, filterToDate]);

  // Lọc theo tab hiện tại (để hiển thị bảng)
  const filteredInvoices = filteredAll.filter(inv => inv.status === activeTab);

  // Đếm số lượng theo tab (sau khi lọc)
  const countUnposted = filteredAll.filter(i => i.status === "UNPOSTED").length;
  const countPosted = filteredAll.filter(i => i.status === "POSTED").length;

  // 1. Thống kê TỔNG TIỀN (theo dữ liệu đã lọc)
  const totalUnposted = filteredAll.filter(i => i.status === "UNPOSTED").reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const totalPosted = filteredAll.filter(i => i.status === "POSTED").reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const diffTotal = totalUnposted - totalPosted; 

  // 2. Thống kê TRƯỚC PPV (theo dữ liệu đã lọc)
  const ppvUnposted = filteredAll.filter(i => i.status === "UNPOSTED").reduce((sum, i) => sum + (Number(i.beforeServiceCharge) || 0), 0);
  const ppvPosted = filteredAll.filter(i => i.status === "POSTED").reduce((sum, i) => sum + (Number(i.beforeServiceCharge) || 0), 0);
  const diffPpv = ppvUnposted - ppvPosted;

  const formatCurrency = (num: number) => new Intl.NumberFormat('vi-VN').format(num || 0);

  const hasFilter = searchName.trim() !== "" || filterFromDate !== "" || filterToDate !== "";

  const clearFilters = () => {
    setSearchName("");
    setFilterFromDate("");
    setFilterToDate("");
  };

  // =================== XUẤT EXCEL ===================
  const handleExportExcel = () => {
    if (!monthData || invoices.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    // Dùng dữ liệu ĐÃ LỌC để xuất
    const unpostedInvoices = filteredAll.filter(i => i.status === "UNPOSTED");
    const postedInvoices = filteredAll.filter(i => i.status === "POSTED");

    if (unpostedInvoices.length === 0 && postedInvoices.length === 0) {
      alert("Không có dữ liệu nào khớp với bộ lọc để xuất!");
      return;
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    };

    // Tạo dòng mô tả bộ lọc
    const filterDescParts: string[] = [];
    if (searchName.trim()) filterDescParts.push(`Tên/Mã HĐ/Bàn: "${searchName.trim()}"`);
    if (filterFromDate) filterDescParts.push(`Từ ngày: ${formatDate(filterFromDate)}`);
    if (filterToDate) filterDescParts.push(`Đến ngày: ${formatDate(filterToDate)}`);
    const filterDesc = filterDescParts.length > 0 ? filterDescParts.join(" | ") : "";

    const createSheetData = (data: any[], title: string) => {
      const header: any[][] = [
        ["DANH SÁCH HÓA ĐƠN " + title.toUpperCase() + " - THÁNG " + selectedMonth],
      ];

      // Thêm dòng mô tả bộ lọc nếu có
      if (filterDesc) {
        header.push([`Bộ lọc: ${filterDesc}`]);
      } else {
        header.push([]);
      }

      header.push([]);
      header.push(["STT", "Ngày", "Số hóa đơn", "Khách hàng", "Bàn", "Ghi chú", 
                   "Số tiền hàng", "Số tiền KM", "TRƯỚC PPV", "TỔNG TIỀN"]);

      const rows = data.map((inv, idx) => [
        idx + 1,
        formatDate(inv.date),
        inv.invoiceNumber || "",
        inv.customerName || "",
        inv.table || "",
        inv.note || "",
        Number(inv.goodsAmount) || 0,
        Number(inv.discountAmount) || 0,
        Number(inv.beforeServiceCharge) || 0,
        Number(inv.totalAmount) || 0
      ]);

      const totalGoods = data.reduce((sum, i) => sum + (Number(i.goodsAmount) || 0), 0);
      const totalDiscount = data.reduce((sum, i) => sum + (Number(i.discountAmount) || 0), 0);
      const totalPPV = data.reduce((sum, i) => sum + (Number(i.beforeServiceCharge) || 0), 0);
      const totalAmount = data.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);

      const totalRow = [
        "", "", "", "", "", "TỔNG CỘNG",
        totalGoods, totalDiscount, totalPPV, totalAmount
      ];

      return { rows: [...header, ...rows, [], totalRow], headerRowIndex: filterDesc ? 3 : 2 };
    };

    const unpostedSheet = createSheetData(unpostedInvoices, "CHƯA POST");
    const postedSheet = createSheetData(postedInvoices, "ĐÃ POST");

    const wb = XLSX.utils.book_new();

    const wsUnposted = XLSX.utils.aoa_to_sheet(unpostedSheet.rows);
    const wsPosted = XLSX.utils.aoa_to_sheet(postedSheet.rows);

    const colWidths = [
      { wch: 5 }, { wch: 12 }, { wch: 15 }, { wch: 22 },
      { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 },
    ];

    wsUnposted["!cols"] = colWidths;
    wsPosted["!cols"] = colWidths;

    // Merge title row
    wsUnposted["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    wsPosted["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

    // Nếu có filter desc thì merge thêm dòng đó
    if (filterDesc) {
      wsUnposted["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });
      wsPosted["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 9 } });
    }

    // Apply number format cho cột số (G, H, I, J) — bắt đầu từ sau header row
    const applyNumberFormat = (ws: any, startRow: number) => {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let r = startRow; r <= range.e.r; r++) {
        ["G", "H", "I", "J"].forEach(col => {
          const cellRef = col + (r + 1);
          if (ws[cellRef] && typeof ws[cellRef].v === "number") {
            ws[cellRef].z = "#,##0";
          }
        });
      }
    };

    applyNumberFormat(wsUnposted, unpostedSheet.headerRowIndex + 1);
    applyNumberFormat(wsPosted, postedSheet.headerRowIndex + 1);

    XLSX.utils.book_append_sheet(wb, wsUnposted, "Chưa Post");
    XLSX.utils.book_append_sheet(wb, wsPosted, "Đã Post");

    // Tên file có kèm dấu hiệu nếu đang lọc
    const fileName = `HoaDon_Thang_${selectedMonth}${hasFilter ? "_DaLoc" : ""}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // =================== RENDER GIAO DIỆN ===================
  return (
    <div className="h-full overflow-auto bg-gray-50 p-6 text-sm">
      <div className="max-w-[1400px] mx-auto space-y-4">
        
        {/* HEADER & FILTER THÁNG */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Quản Lý Hóa Đơn Tạm Tính</h1>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleExportExcel}
              disabled={!monthData || invoices.length === 0}
              className={`flex items-center gap-2 px-4 py-1.5 rounded font-medium text-sm transition-all shadow-sm ${
                !monthData || invoices.length === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
              }`}
              title={hasFilter ? "Xuất Excel theo bộ lọc hiện tại" : "Xuất toàn bộ dữ liệu"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" x2="12" y1="15" y2="3"></line>
              </svg>
              {hasFilter ? "Xuất Excel (đã lọc)" : "Xuất Excel"}
            </button>

            <label className="font-medium text-gray-700">Chọn Tháng:</label>
            <div className="relative flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                <line x1="16" x2="16" y1="2" y2="6"></line>
                <line x1="8" x2="8" y1="2" y2="6"></line>
                <line x1="3" x2="21" y1="10" y2="10"></line>
              </svg>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="relative pl-9 pr-3 py-1.5 border border-gray-300 rounded font-medium outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* NẾU CHƯA CÓ THÁNG */}
        {!isLoading && !monthData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mt-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Chưa có sổ dữ liệu tháng {selectedMonth}</h2>
            <button onClick={handleCreateMonth} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded shadow">
              + Tạo sổ Tháng {selectedMonth}
            </button>
          </div>
        )}

        {/* NẾU ĐÃ CÓ THÁNG */}
        {monthData && (
          <>
            {/* THANH BỘ LỌC */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-wrap items-end gap-3">
                {/* Lọc theo tên */}
                <div className="flex-1 min-w-[220px]">
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    🔍 Tìm theo Tên KH / Số HĐ / Bàn
                  </label>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
                    </svg>
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Nhập tên khách hàng, số HĐ hoặc bàn..."
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Từ ngày */}
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-gray-600 block mb-1">📅 Từ ngày</label>
                  <input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Đến ngày */}
                <div className="min-w-[150px]">
                  <label className="text-xs font-medium text-gray-600 block mb-1">📅 Đến ngày</label>
                  <input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Nút xóa lọc */}
                <button
                  onClick={clearFilters}
                  disabled={!hasFilter}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    hasFilter
                      ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  ✕ Xóa lọc
                </button>

                {/* Hiển thị thông tin lọc */}
                {hasFilter && (
                  <div className="ml-auto text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded border border-blue-200 font-medium">
                    Đang lọc: {filteredAll.length}/{invoices.length} hóa đơn
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {/* CỘT TRÁI: FORM NHẬP LIỆU */}
              <div className="w-[35%] bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-fit">
                <h2 className="font-semibold text-base mb-3 text-gray-800 border-b pb-2 flex justify-between items-center">
                  <span>{editId ? "Sửa Hóa Đơn" : "Nhập Hóa Đơn"}</span>
                  {editId && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Đang sửa</span>}
                </h2>
                
                <form onSubmit={handleSubmitInvoice} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Ngày *</label>
                      <div className="relative flex items-center">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10"
                        >
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                          <line x1="16" x2="16" y1="2" y2="6"></line>
                          <line x1="8" x2="8" y1="2" y2="6"></line>
                          <line x1="3" x2="21" y1="10" y2="10"></line>
                        </svg>
                        <input 
                          type="date" 
                          name="date" 
                          value={formData.date} 
                          onChange={handleChange} 
                          required 
                          className="relative w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                        />
                      </div>
                    </div>
                    <div><label className="text-xs font-medium text-gray-600 block mb-1">Trạng thái</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-300 p-1.5 rounded text-sm bg-gray-50 font-medium">
                        <option value="UNPOSTED">Chưa Post</option>
                        <option value="POSTED">Đã Post</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-gray-600 block mb-1">Khách hàng</label><input type="text" name="customerName" value={formData.customerName} onChange={handleChange} placeholder="VD: Anh A..." className="w-full border p-1.5 rounded text-sm"/></div>
                    <div><label className="text-xs font-medium text-gray-600 block mb-1">Bàn</label><input type="text" name="table" value={formData.table} onChange={handleChange} placeholder="VD: VIP 1" className="w-full border p-1.5 rounded text-sm"/></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded border border-gray-100">
                    <div><label className="text-xs font-medium text-gray-600 block mb-1">Số tiền hàng</label><input type="number" name="goodsAmount" value={formData.goodsAmount} onChange={handleChange} className="w-full border p-1.5 rounded text-sm"/></div>
                    <div><label className="text-xs font-medium text-gray-600 block mb-1">Số tiền KM</label><input type="number" name="discountAmount" value={formData.discountAmount} onChange={handleChange} className="w-full border p-1.5 rounded text-sm"/></div>
                    <div className="col-span-2"><label className="text-xs font-medium text-blue-700 block mb-1">TRƯỚC PPV (Tự động)</label><input type="number" name="beforeServiceCharge" value={formData.beforeServiceCharge} readOnly className="w-full border p-1.5 rounded text-sm bg-blue-50 text-blue-700 font-semibold outline-none cursor-not-allowed"/></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-red-600 block mb-1">TỔNG TIỀN (Số tiền) *</label><input type="number" name="totalAmount" value={formData.totalAmount} onChange={handleChange} required className="w-full border border-red-300 p-1.5 rounded text-sm font-bold text-red-600 outline-none focus:border-red-500"/></div>
                    <div><label className="text-xs font-medium text-gray-600 block mb-1">Số Hóa Đơn</label><input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} disabled={formData.status === "UNPOSTED"} placeholder={formData.status === "UNPOSTED" ? "Chỉ nhập khi Đã Post" : "Nhập mã HĐ..."} className={`w-full border p-1.5 rounded text-sm ${formData.status === 'UNPOSTED' ? 'bg-gray-100' : ''}`}/></div>
                  </div>

                  <div><label className="text-xs font-medium text-gray-600 block mb-1">Ghi chú</label><input type="text" name="note" value={formData.note} onChange={handleChange} className="w-full border p-1.5 rounded text-sm"/></div>

                  <div className="flex gap-2 pt-2 border-t mt-2">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition-colors">
                      {editId ? "Lưu Chỉnh Sửa" : "+ Thêm Vào Bảng"}
                    </button>
                    {editId && (
                      <button type="button" onClick={() => { setEditId(null); setFormData(defaultForm); }} className="bg-gray-200 px-4 py-2 rounded text-gray-700">Hủy</button>
                    )}
                  </div>
                </form>
              </div>

              {/* CỘT PHẢI: BẢNG DỮ LIỆU & THỐNG KÊ (Rộng 65%) */}
              <div className="w-[65%] flex flex-col gap-4">
                
                {/* KHỐI THỐNG KÊ */}
                <div className="flex flex-col gap-3">
                  
                  {/* Dòng 1: THỐNG KÊ TỔNG TIỀN */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                      1. Thống kê Tổng Tiền (Thực thu){hasFilter && <span className="text-blue-500 ml-1">• theo bộ lọc</span>}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col justify-center items-center bg-gray-50 rounded py-2 border border-gray-100">
                        <span className="text-[11px] text-gray-500 font-medium">Chưa Post (Cộng dồn)</span>
                        <span className="text-base font-bold text-gray-800">{formatCurrency(totalUnposted)}</span>
                      </div>
                      <div className="flex flex-col justify-center items-center bg-green-50 rounded py-2 border border-green-100">
                        <span className="text-[11px] text-green-600 font-medium">Đã Post</span>
                        <span className="text-base font-bold text-green-700">{formatCurrency(totalPosted)}</span>
                      </div>
                      <div className="flex flex-col justify-center items-center bg-red-50 rounded py-2 border border-red-100">
                        <span className="text-[11px] text-red-600 font-medium">Độ Lệch (Chưa - Đã)</span>
                        <span className="text-base font-bold text-red-600">{formatCurrency(diffTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dòng 2: THỐNG KÊ TRƯỚC PPV */}
                  <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-xs font-bold text-blue-500 mb-2 uppercase tracking-wide">
                      2. Thống kê Trước PPV{hasFilter && <span className="text-blue-500 ml-1">• theo bộ lọc</span>}
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col justify-center items-center bg-blue-50 rounded py-2 border border-blue-100">
                        <span className="text-[11px] text-blue-600 font-medium">Chưa Post (Cộng dồn)</span>
                        <span className="text-base font-bold text-blue-800">{formatCurrency(ppvUnposted)}</span>
                      </div>
                      <div className="flex flex-col justify-center items-center bg-teal-50 rounded py-2 border border-teal-100">
                        <span className="text-[11px] text-teal-600 font-medium">Đã Post</span>
                        <span className="text-base font-bold text-teal-700">{formatCurrency(ppvPosted)}</span>
                      </div>
                      <div className="flex flex-col justify-center items-center bg-orange-50 rounded py-2 border border-orange-100">
                        <span className="text-[11px] text-orange-600 font-medium">Độ Lệch (Chưa - Đã)</span>
                        <span className="text-base font-bold text-orange-600">{formatCurrency(diffPpv)}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* BẢNG DỮ LIỆU CÓ TABS */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                  {/* TABS */}
                  <div className="flex border-b">
                    <button 
                      className={`flex-1 py-2.5 font-medium text-sm text-center transition-colors ${activeTab === 'UNPOSTED' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                      onClick={() => setActiveTab('UNPOSTED')}
                    >
                      CHƯA POST ({countUnposted})
                    </button>
                    <button 
                      className={`flex-1 py-2.5 font-medium text-sm text-center transition-colors ${activeTab === 'POSTED' ? 'border-b-2 border-green-600 text-green-600 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                      onClick={() => setActiveTab('POSTED')}
                    >
                      ĐÃ POST ({countPosted})
                    </button>
                  </div>

                  {/* BẢNG THEO FORMAT */}
                  <div className="overflow-x-auto h-[350px] relative">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm">
                        <tr>
                          <th className="p-2 border-b border-r">Ngày</th>
                          <th className="p-2 border-b border-r">Số hóa đơn</th>
                          <th className="p-2 border-b border-r">Khách hàng</th>
                          <th className="p-2 border-b border-r text-right">Số tiền</th>
                          <th className="p-2 border-b border-r">Bàn</th>
                          <th className="p-2 border-b border-r">Ghi chú</th>
                          <th className="p-2 border-b border-r text-right">Số tiền hàng</th>
                          <th className="p-2 border-b border-r text-right">Số tiền KM</th>
                          <th className="p-2 border-b border-r text-right font-bold">TRƯỚC PPV</th>
                          <th className="p-2 border-b text-center">Sửa / Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.length === 0 ? (
                          <tr><td colSpan={10} className="p-8 text-center text-gray-400">
                            {hasFilter ? "Không có hóa đơn nào khớp với bộ lọc." : "Không có hóa đơn nào ở trạng thái này."}
                          </td></tr>
                        ) : (
                          filteredInvoices.map((inv: any) => (
                            <tr key={inv._id} className={`border-b hover:bg-gray-50 ${editId === inv._id ? 'bg-yellow-50' : ''}`}>
                              <td className="p-2 border-r">{new Date(inv.date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-2 border-r font-medium text-blue-600">{inv.invoiceNumber || ""}</td>
                              <td className="p-2 border-r">{inv.customerName}</td>
                              <td className="p-2 border-r text-right font-semibold">{formatCurrency(inv.totalAmount)}</td>
                              <td className="p-2 border-r">{inv.table}</td>
                              <td className="p-2 border-r truncate max-w-[120px]" title={inv.note}>{inv.note}</td>
                              <td className="p-2 border-r text-right">{formatCurrency(inv.goodsAmount)}</td>
                              <td className="p-2 border-r text-right">{formatCurrency(inv.discountAmount)}</td>
                              <td className="p-2 border-r text-right font-bold text-gray-800">{formatCurrency(inv.beforeServiceCharge)}</td>
                              <td className="p-2 text-center">
                                <button onClick={() => { 
                                  setEditId(inv._id); 
                                  setFormData({
                                    ...inv, 
                                    date: inv.date.split('T')[0],
                                    goodsAmount: inv.goodsAmount === 0 ? "" : inv.goodsAmount,
                                    discountAmount: inv.discountAmount === 0 ? "" : inv.discountAmount,
                                    beforeServiceCharge: inv.beforeServiceCharge === 0 ? "" : inv.beforeServiceCharge,
                                    totalAmount: inv.totalAmount === 0 ? "" : inv.totalAmount,
                                  }); 
                                }} className="text-blue-500 hover:text-blue-700 mx-1">✏️</button>
                                <button onClick={() => handleDeleteInvoice(inv._id)} className="text-red-500 hover:text-red-700 mx-1">❌</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Save, Users, Star, PlusCircle, FileText, AlertCircle } from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";

type StaffMember = {
  _id: string;
  name: string;
  department: "FOH" | "BOH";
  workDays?: number | string;
  penalty?: number | string;
  isDeleted?: boolean; // Đánh dấu nhân viên đã bị xóa
};

type TipDetail = {
  employeeName: string;
  department: "FOH" | "BOH";
  workDays: number;
  penalty: number;
  isTopPerformer?: boolean;
};

type TipBoard = {
  _id: string;
  month: string;
  periodName: string;
  totalTip: number;
  topPerformerName: string;
  details: TipDetail[];
  createdAt?: string;
};

export default function TipManagement() {
  const [masterStaff, setMasterStaff] = useState<StaffMember[]>([]);
  const [tipBoards, setTipBoards] = useState<TipBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("NEW");
  
  const [month, setMonth] = useState("");
  const [periodName, setPeriodName] = useState("");
  const [totalTipStr, setTotalTipStr] = useState<string>("");
  const [topPerformerId, setTopPerformerId] = useState<string>("");
  const [activeStaffList, setActiveStaffList] = useState<StaffMember[]>([]);

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffDept, setNewStaffDept] = useState<"FOH" | "BOH">("FOH");

  // Lưu danh sách nhân viên đã xóa để hiển thị trong bảng cũ
  const [deletedStaffMap, setDeletedStaffMap] = useState<Map<string, StaffMember>>(new Map());

  const BONUS_AMOUNT = 500000;
  const FUND_PERCENT = 0.05;

  const loadInitialData = async () => {
    try {
      const [staffRes, tipsRes]: [any, any] = await Promise.all([
        fetchData("/staff"),
        fetchData("/tips")
      ]);
      const staff = staffRes.data || staffRes || [];
      const tips = tipsRes.data || tipsRes || [];
      
      // Đánh dấu tất cả staff là chưa bị xóa
      const staffWithFlag = staff.map((s: StaffMember) => ({ ...s, isDeleted: false }));
      setMasterStaff(staffWithFlag);
      setTipBoards(tips);
      resetFormToNew(staffWithFlag);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { loadInitialData(); }, []);

  const resetFormToNew = (staffBase: StaffMember[] = masterStaff) => {
    setMonth(""); setPeriodName(""); setTotalTipStr(""); setTopPerformerId("");
    // Chỉ lấy nhân viên chưa bị xóa cho bảng mới
    const activeStaff = staffBase.filter(s => !s.isDeleted);
    setActiveStaffList(activeStaff.map(s => ({ ...s, workDays: "", penalty: "" })));
  };

  // Lấy danh sách nhân viên từ bảng tip đã lưu
  const getStaffFromBoard = (board: TipBoard): StaffMember[] => {
    return board.details.map(detail => {
      // Tìm trong master staff
      const existingStaff = masterStaff.find(s => s.name === detail.employeeName);
      if (existingStaff) {
        return {
          ...existingStaff,
          workDays: detail.workDays,
          penalty: detail.penalty
        };
      } else {
        // Nhân viên đã bị xóa khỏi master, tạo bản ghi tạm
        const deletedStaff: StaffMember = {
          _id: `deleted_${detail.employeeName}`,
          name: detail.employeeName,
          department: detail.department,
          workDays: detail.workDays,
          penalty: detail.penalty,
          isDeleted: true
        };
        // Lưu vào map để biết đã xóa
        setDeletedStaffMap(prev => new Map(prev).set(detail.employeeName, deletedStaff));
        return deletedStaff;
      }
    });
  };

  useEffect(() => {
    if (selectedBoardId === "NEW") {
      resetFormToNew();
    } else {
      const board = tipBoards.find(b => b._id === selectedBoardId);
      if (board) {
        setMonth(board.month); 
        setPeriodName(board.periodName); 
        setTotalTipStr(board.totalTip ? board.totalTip.toString() : "");
        
        // Tìm top performer
        const topDetail = board.details.find((d: any) => d.isTopPerformer);
        const topStaff = masterStaff.find(s => s.name === topDetail?.employeeName);
        setTopPerformerId(topStaff ? topStaff._id : (topDetail ? `deleted_${topDetail.employeeName}` : ""));
        
        // Lấy danh sách nhân viên từ board
        const staffList = getStaffFromBoard(board);
        setActiveStaffList(staffList);
      }
    }
  }, [selectedBoardId, tipBoards, masterStaff]);

  const calculations = useMemo(() => {
    const tipValue = Number(totalTipStr) || 0;
    const remainingTip = Math.max(0, tipValue - BONUS_AMOUNT);
    
    const activeMembers = activeStaffList.filter(s => Number(s.workDays) > 0);
    const totalDays = activeMembers.reduce((acc, curr) => acc + Number(curr.workDays), 0);
    const tipPerDay = totalDays > 0 ? remainingTip / totalDays : 0;

    let totalServiceFund = 0; 

    const details = activeMembers.map((staff) => {
      const days = Number(staff.workDays);
      const penalty = Number(staff.penalty) || 0; 
      const isTop = staff._id === topPerformerId;
      const baseTip = days * tipPerDay;
      
      let fundDeduction = 0;
      let finalTip = baseTip;

      if (staff.department === "FOH") {
        fundDeduction = baseTip * FUND_PERCENT;
        finalTip = baseTip - fundDeduction;
      }
      
      if (isTop) finalTip += BONUS_AMOUNT;

      finalTip -= penalty;

      totalServiceFund += (fundDeduction + penalty);

      return { ...staff, days, isTop, baseTip, fundDeduction, penalty, finalTip };
    });

    return { remainingTip, totalDays, tipPerDay, totalServiceFund, details };
  }, [totalTipStr, activeStaffList, topPerformerId]);

  const formatVND = (amount: number) => Math.round(amount).toLocaleString("vi-VN") + "đ";

  const handleWorkDaysChange = (id: string, val: string) => {
    setActiveStaffList(prev => prev.map(s => s._id === id ? { ...s, workDays: val } : s));
  };

  const handlePenaltyChange = (id: string, val: string) => {
    const raw = val.replace(/\./g, "");
    if (/^\d*$/.test(raw)) {
      setActiveStaffList(prev => prev.map(s => s._id === id ? { ...s, penalty: raw } : s));
    }
  };

  const handleSaveTip = async () => {
    if (!month || !periodName || Number(totalTipStr) <= 0 || calculations.details.length === 0) {
      return alert("Nhập đủ Tháng, Kỳ, Tổng tiền và ít nhất 1 người có công!");
    }
    
    // Tìm tên top performer
    let topPerformerName = "";
    if (topPerformerId) {
      const topStaff = activeStaffList.find(s => s._id === topPerformerId);
      topPerformerName = topStaff?.name || "";
    }
    
    const payload = {
      month, 
      periodName, 
      totalTip: Number(totalTipStr),
      topPerformerName,
      staffList: calculations.details.map(d => ({ 
        employeeName: d.name, 
        department: d.department, 
        workDays: d.days, 
        penalty: d.penalty,
        isTopPerformer: d.isTop
      }))
    };

    try {
      if (selectedBoardId === "NEW") {
        await postData("/tips", payload);
      } else {
        await updateData(`/tips/${selectedBoardId}`, payload);
      }
      const tipsRes: any = await fetchData("/tips");
      setTipBoards(tipsRes.data || tipsRes || []);
      if (selectedBoardId === "NEW") {
        const newTipsList = tipsRes.data || tipsRes || [];
        if (newTipsList.length > 0) setSelectedBoardId(newTipsList[0]._id);
      }
      alert("Lưu thành công!");
    } catch (error) {
      alert("Lỗi khi lưu Tip!");
    }
  };

  const handleDeleteTipBoard = async () => {
    if (!window.confirm("Xóa bảng chia tip này?")) return;
    try {
      await deleteData(`/tips/${selectedBoardId}`);
      const tipsRes: any = await fetchData("/tips");
      setTipBoards(tipsRes.data || tipsRes || []);
      setSelectedBoardId("NEW");
    } catch (error) {}
  };

  const handleAddMasterStaff = async () => {
    if (!newStaffName) return;
    try {
      const res: any = await postData("/staff", { name: newStaffName, department: newStaffDept });
      const newStaff = res.data || res;
      const staffWithFlag = { ...newStaff, isDeleted: false };
      setMasterStaff([...masterStaff, staffWithFlag]);
      // Chỉ thêm vào active list nếu đang ở tab NEW
      if (selectedBoardId === "NEW") {
        setActiveStaffList([...activeStaffList, { ...staffWithFlag, workDays: "", penalty: "" }]);
      }
      setNewStaffName(""); 
    } catch (error) {}
  };

  const handleDeleteMasterStaff = async (id: string) => {
    if (!window.confirm("Xóa nhân viên này? Lưu ý: Các bảng tip cũ vẫn giữ nguyên dữ liệu!")) return;
    try {
      await deleteData(`/staff/${id}`);
      
      // Đánh dấu nhân viên đã xóa trong master
      const staffToDelete = masterStaff.find(s => s._id === id);
      if (staffToDelete) {
        setDeletedStaffMap(prev => new Map(prev).set(staffToDelete.name, { ...staffToDelete, isDeleted: true }));
      }
      
      setMasterStaff(masterStaff.map(s => s._id === id ? { ...s, isDeleted: true } : s));
      
      // Nếu đang ở bảng mới, loại bỏ nhân viên khỏi active list
      if (selectedBoardId === "NEW") {
        setActiveStaffList(activeStaffList.filter(s => s._id !== id));
      }
      
      if (topPerformerId === id) setTopPerformerId("");
    } catch (error) {}
  };

  // Kiểm tra nhân viên đã bị xóa khỏi master nhưng đang có trong bảng cũ
  const isStaffDeleted = (staff: StaffMember) => {
    return staff.isDeleted === true || !masterStaff.some(s => s.name === staff.name && !s.isDeleted);
  };

  const fohStaff = activeStaffList.filter(s => s.department === "FOH");
  const bohStaff = activeStaffList.filter(s => s.department === "BOH");

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-2 sm:p-3 text-sm">
      <div className="max-w-[1600px] mx-auto space-y-3 pb-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Star className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Hệ Thống Chia Tip</h1>
              <p className="text-[11px] text-slate-500">Quản lý và phân chia tiền tip theo ngày công</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <label className="font-semibold text-slate-600 text-xs whitespace-nowrap">Dữ liệu:</label>
            <SelectUI value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="w-[240px] h-9 bg-white border-slate-300 text-xs rounded-lg shadow-sm">
                <SelectValue placeholder="Chọn bảng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW" className="font-bold text-blue-600 text-sm">
                  <span className="flex items-center"><PlusCircle className="w-4 h-4 mr-2" /> TẠO BẢNG MỚI</span>
                </SelectItem>
                {tipBoards.map(b => (
                  <SelectItem key={b._id} value={b._id} className="text-sm">
                    {b.month} - {b.periodName}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectUI>
          </div>
        </div>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="mb-2 h-9 bg-white border border-slate-200 shadow-sm rounded-lg p-1">
            <TabsTrigger value="calculator" className="text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-1.5 px-4 rounded-md font-semibold">
              Bảng Tính Tip
            </TabsTrigger>
            <TabsTrigger value="staff" className="text-xs data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 py-1.5 px-4 rounded-md font-semibold">
              Nhân Sự Gốc
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-3 m-0">
            
            {/* THÔNG TIN BẢNG VÀ THỐNG KÊ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    {selectedBoardId === "NEW" ? (
                      <><PlusCircle className="w-4 h-4 text-blue-500" /> Khởi Tạo Mới</>
                    ) : (
                      <><FileText className="w-4 h-4 text-blue-500" /> Sửa Bảng</>
                    )}
                    {selectedBoardId !== "NEW" && (
                      <Badge variant="outline" className="text-[10px] h-5 px-2 bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                        {activeStaffList.filter(s => isStaffDeleted(s)).length} nhân viên đã nghỉ
                      </Badge>
                    )}
                  </span>
                  <div className="flex gap-2">
                    {selectedBoardId !== "NEW" && (
                      <Button variant="destructive" size="sm" className="h-8 text-xs px-3 rounded-lg shadow-sm" onClick={handleDeleteTipBoard}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa
                      </Button>
                    )}
                    <Button size="sm" className="h-8 text-xs px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-sm font-semibold" onClick={handleSaveTip}>
                      <Save className="w-3.5 h-3.5 mr-1" /> Lưu
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wide">Tháng</span>
                    <Input placeholder="VD: 3/2026" value={month} onChange={e => setMonth(e.target.value)} className="h-9 text-xs rounded-lg border-slate-300 focus-visible:ring-blue-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1 uppercase tracking-wide">Kỳ</span>
                    <Input placeholder="VD: 15-30/3" value={periodName} onChange={e => setPeriodName(e.target.value)} className="h-9 text-xs rounded-lg border-slate-300 focus-visible:ring-blue-500" />
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 font-bold block mb-1 uppercase tracking-wide">Tổng Tip</span>
                    <Input 
                      type="text" 
                      placeholder="Nhập..." 
                      value={totalTipStr ? Number(totalTipStr).toLocaleString("vi-VN") : ""} 
                      onChange={e => {
                        const raw = e.target.value.replace(/\./g, "");
                        if (/^\d*$/.test(raw)) setTotalTipStr(raw);
                      }} 
                      className="h-9 text-xs font-bold border-blue-300 focus-visible:ring-blue-500 rounded-lg bg-blue-50/30 tabular-nums text-right" 
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI THỐNG KÊ */}
              <div className="lg:col-span-7 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-full items-center text-center">
                  <div className="bg-gradient-to-br from-rose-50 to-red-50 p-2.5 rounded-lg border border-rose-200 flex flex-col justify-center">
                    <p className="text-[10px] text-rose-600 font-bold whitespace-nowrap uppercase tracking-wide">
                      Còn lại <span className="text-rose-500 font-medium">(-500K)</span>
                    </p>
                    <p className="text-base font-bold text-rose-700 tabular-nums">{formatVND(calculations.remainingTip)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-center">
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide">Tổng công</p>
                    <p className="text-base font-bold text-slate-800 tabular-nums">{calculations.totalDays}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-2.5 rounded-lg border border-blue-200 flex flex-col justify-center">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">1 Công</p>
                    <p className="text-base font-bold text-blue-700 tabular-nums">{formatVND(calculations.tipPerDay)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-2.5 rounded-lg border border-orange-200 flex flex-col justify-center">
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide">Quỹ PV (+Phạt)</p>
                    <p className="text-base font-bold text-orange-700 tabular-nums">{formatVND(calculations.totalServiceFund)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG CHIA FOH/BOH */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col xl:flex-row">
              
              {/* BẢNG FOH */}
              <div className="flex-1 border-b xl:border-b-0 xl:border-r border-slate-200">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 border-b-2 border-blue-200 flex justify-between items-center">
                   <h3 className="font-bold text-blue-800 text-xs pl-1 flex items-center gap-1.5 uppercase tracking-wide">
                     <Users className="w-4 h-4" /> Front Of House (FOH)
                   </h3>
                   <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-300 shadow-sm">-5% Quỹ</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[120px] pl-3 font-bold uppercase tracking-wide text-[10px]">Nhân viên</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[70px] text-center font-bold uppercase tracking-wide text-[10px]">Ngày công</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[50px] text-center font-bold uppercase tracking-wide text-[10px]">TOP</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r text-right font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Cơ Bản</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r text-right text-orange-600 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">-Quỹ</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[90px] text-center text-red-600 font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Phạt</th>
                        <th className="p-2 border-b-2 border-slate-300 text-right font-bold pr-3 uppercase tracking-wide text-[10px] whitespace-nowrap text-emerald-700">Thực Nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fohStaff.map((row) => {
                        const calc = calculations.details.find(d => d._id === row._id);
                        const isTop = topPerformerId === row._id;
                        const isDeleted = isStaffDeleted(row);
                        return (
                          <tr key={row._id} className={`border-b border-slate-100 transition-colors ${isTop ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-l-yellow-400' : ''} ${isDeleted ? 'bg-slate-100 opacity-75' : 'hover:bg-blue-50/40'}`}>
                            <td className="p-2 pl-3 border-r border-slate-100 font-semibold text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}>{row.name}</span>
                                {isTop && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                                {isDeleted && (
                                  <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Đã nghỉ</Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 border-r border-slate-100">
                              <Input 
                                type="number" 
                                className={`h-7 w-14 mx-auto text-center text-sm font-bold px-1 rounded-md transition-all ${Number(row.workDays) > 0 ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm" : "border-slate-300"} ${isDeleted ? "opacity-60" : ""}`} 
                                value={row.workDays} 
                                onChange={(e) => handleWorkDaysChange(row._id, e.target.value)}
                                disabled={isDeleted && selectedBoardId !== "NEW"}
                              />
                            </td>
                            <td className="p-1 border-r border-slate-100 text-center">
                               <button 
                                 onClick={() => !isDeleted && setTopPerformerId(isTop ? "" : row._id)} 
                                 className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-sm transition-all ${isTop ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:scale-105'} ${isDeleted ? 'cursor-not-allowed opacity-50' : ''}`}
                                 disabled={isDeleted}
                               >★</button>
                            </td>
                            <td className="p-2 border-r border-slate-100 text-right text-slate-600 text-[11px] whitespace-nowrap tabular-nums">{calc ? formatVND(calc.baseTip) : "-"}</td>
                            <td className="p-2 border-r border-slate-100 text-right text-orange-600 text-[11px] whitespace-nowrap tabular-nums font-medium">{calc && calc.fundDeduction > 0 ? `-${formatVND(calc.fundDeduction)}` : "-"}</td>
                            <td className="p-1.5 border-r border-slate-100 text-center">
                              <Input 
                                type="text" 
                                className={`h-7 w-20 mx-auto text-right text-xs px-1.5 text-red-600 font-semibold rounded-md border-slate-300 focus-visible:ring-red-400 tabular-nums ${isDeleted ? "opacity-60" : ""}`} 
                                value={row.penalty ? Number(row.penalty).toLocaleString("vi-VN") : ""} 
                                onChange={(e) => handlePenaltyChange(row._id, e.target.value)}
                                disabled={isDeleted && selectedBoardId !== "NEW"}
                              />
                            </td>
                            <td className="p-2 pr-3 text-right whitespace-nowrap">
                              <span className="font-bold text-emerald-700 text-sm tabular-nums bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                {calc ? formatVND(calc.finalTip) : "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BẢNG BOH */}
              <div className="flex-1">
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-2.5 border-b-2 border-emerald-200 flex justify-between items-center">
                   <h3 className="font-bold text-emerald-800 text-xs pl-1 flex items-center gap-1.5 uppercase tracking-wide">
                     <Users className="w-4 h-4" /> Back Of House (BOH)
                   </h3>
                   <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-sm">Giữ Nguyên</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[120px] pl-3 font-bold uppercase tracking-wide text-[10px]">Nhân viên</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[70px] text-center font-bold uppercase tracking-wide text-[10px]">Ngày công</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r w-[50px] text-center font-bold uppercase tracking-wide text-[10px]">TOP</th>
                        <th className="p-2 border-b-2 border-slate-300 border-r text-right font-bold uppercase tracking-wide text-[10px] whitespace-nowrap">Cơ Bản</th>
                        <th className="p-2 border-b-2 border-slate-300 text-right font-bold pr-3 uppercase tracking-wide text-[10px] whitespace-nowrap text-emerald-700">Thực Nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bohStaff.map((row) => {
                        const calc = calculations.details.find(d => d._id === row._id);
                        const isTop = topPerformerId === row._id;
                        const isDeleted = isStaffDeleted(row);
                        return (
                          <tr key={row._id} className={`border-b border-slate-100 transition-colors ${isTop ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-l-yellow-400' : ''} ${isDeleted ? 'bg-slate-100 opacity-75' : 'hover:bg-emerald-50/40'}`}>
                            <td className="p-2 pl-3 border-r border-slate-100 font-semibold text-xs whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}>{row.name}</span>
                                {isTop && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                                {isDeleted && (
                                  <Badge variant="destructive" className="text-[9px] h-4 px-1.5">Đã nghỉ</Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-1.5 border-r border-slate-100">
                              <Input 
                                type="number" 
                                className={`h-7 w-14 mx-auto text-center text-sm font-bold px-1 rounded-md transition-all ${Number(row.workDays) > 0 ? "bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm" : "border-slate-300"} ${isDeleted ? "opacity-60" : ""}`} 
                                value={row.workDays} 
                                onChange={(e) => handleWorkDaysChange(row._id, e.target.value)}
                                disabled={isDeleted && selectedBoardId !== "NEW"}
                              />
                            </td>
                            <td className="p-1 border-r border-slate-100 text-center">
                               <button 
                                 onClick={() => !isDeleted && setTopPerformerId(isTop ? "" : row._id)} 
                                 className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-sm transition-all ${isTop ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:scale-105'} ${isDeleted ? 'cursor-not-allowed opacity-50' : ''}`}
                                 disabled={isDeleted}
                               >★</button>
                            </td>
                            <td className="p-2 border-r border-slate-100 text-right text-slate-600 text-[11px] whitespace-nowrap tabular-nums">{calc ? formatVND(calc.baseTip) : "-"}</td>
                            <td className="p-2 pr-3 text-right whitespace-nowrap">
                              <span className="font-bold text-emerald-700 text-sm tabular-nums bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                {calc ? formatVND(calc.finalTip) : "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: QUẢN LÝ NHÂN SỰ */}
          <TabsContent value="staff" className="m-0">
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex gap-3 items-end bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-100 w-fit flex-wrap shadow-sm">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-700 uppercase tracking-wide">Tên nhân viên</label>
                    <Input placeholder="Nhập..." value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="h-10 text-sm bg-white w-[240px] rounded-lg border-slate-300 focus-visible:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-slate-700 uppercase tracking-wide">Bộ phận</label>
                    <SelectUI value={newStaffDept} onValueChange={(val: "FOH"|"BOH") => setNewStaffDept(val)}>
                      <SelectTrigger className="h-10 text-sm bg-white w-[120px] rounded-lg border-slate-300"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOH" className="text-sm">FOH</SelectItem>
                        <SelectItem value="BOH" className="text-sm">BOH</SelectItem>
                      </SelectContent>
                    </SelectUI>
                  </div>
                  <Button className="h-10 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 rounded-lg shadow-sm font-semibold" onClick={handleAddMasterStaff}>
                    <PlusCircle className="w-4 h-4 mr-1.5" /> Thêm Mới
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden w-fit min-w-[500px] shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 border-b-2 border-slate-200 font-bold uppercase tracking-wide text-[10px] text-slate-600">Tên nhân sự</th>
                        <th className="p-3 border-b-2 border-slate-200 font-bold uppercase tracking-wide text-[10px] text-slate-600">Bộ phận</th>
                        <th className="p-3 border-b-2 border-slate-200 font-bold uppercase tracking-wide text-[10px] text-slate-600">Trạng thái</th>
                        <th className="p-3 border-b-2 border-slate-200 font-bold uppercase tracking-wide text-[10px] text-slate-600 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterStaff.map(staff => (
                        <tr key={staff._id} className={`border-b border-slate-100 transition-colors ${staff.isDeleted ? 'bg-slate-50' : 'hover:bg-blue-50/40'}`}>
                          <td className={`p-3 font-semibold ${staff.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{staff.name}</td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-xs h-6 px-2 font-semibold ${staff.isDeleted ? 'text-slate-400 border-slate-200' : staff.department === 'FOH' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}`}>
                              {staff.department}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {staff.isDeleted ? (
                              <Badge variant="destructive" className="text-xs h-5 px-2 font-semibold">Đã nghỉ</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs h-5 px-2 text-emerald-600 border-emerald-200 bg-emerald-50 font-semibold">Đang làm</Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {!staff.isDeleted ? (
                              <button onClick={() => handleDeleteMasterStaff(staff._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs italic">Đã xóa</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="text-xs text-amber-700 flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span><strong>Lưu ý:</strong> Nhân viên đã nghỉ vẫn xuất hiện trong các bảng tip cũ để đảm bảo dữ liệu lịch sử không bị mất.</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
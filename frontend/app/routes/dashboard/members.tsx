import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select as SelectUI, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Save, Users, Star, PlusCircle, FileText } from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";

type StaffMember = {
  _id: string;
  name: string;
  department: "FOH" | "BOH";
  workDays?: number | string;
  penalty?: number | string;
};

export default function TipManagement() {
  const [masterStaff, setMasterStaff] = useState<StaffMember[]>([]);
  const [tipBoards, setTipBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("NEW");
  
  const [month, setMonth] = useState("");
  const [periodName, setPeriodName] = useState("");
  const [totalTipStr, setTotalTipStr] = useState<string>("");
  const [topPerformerId, setTopPerformerId] = useState<string>("");
  const [activeStaffList, setActiveStaffList] = useState<StaffMember[]>([]);

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffDept, setNewStaffDept] = useState<"FOH" | "BOH">("FOH");

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
      setMasterStaff(staff);
      setTipBoards(tips);
      resetFormToNew(staff);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { loadInitialData(); }, []);

  const resetFormToNew = (staffBase: StaffMember[] = masterStaff) => {
    setMonth(""); setPeriodName(""); setTotalTipStr(""); setTopPerformerId("");
    setActiveStaffList(staffBase.map(s => ({ ...s, workDays: "", penalty: "" })));
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
        const topDetail = board.details.find((d: any) => d.isTopPerformer);
        const topStaff = masterStaff.find(s => s.name === topDetail?.employeeName);
        setTopPerformerId(topStaff ? topStaff._id : "");
        setActiveStaffList(masterStaff.map(staff => {
          const detail = board.details.find((d: any) => d.employeeName === staff.name);
          return { ...staff, workDays: detail ? detail.workDays : "", penalty: detail ? detail.penalty : "" };
        }));
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
    const payload = {
      month, periodName, totalTip: Number(totalTipStr),
      topPerformerName: activeStaffList.find(s => s._id === topPerformerId)?.name || "",
      staffList: calculations.details.map(d => ({ 
        employeeName: d.name, 
        department: d.department, 
        workDays: d.days, 
        penalty: d.penalty 
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
      setMasterStaff([...masterStaff, newStaff]);
      setActiveStaffList([...activeStaffList, { ...newStaff, workDays: "", penalty: "" }]);
      setNewStaffName(""); 
    } catch (error) {}
  };

  const handleDeleteMasterStaff = async (id: string) => {
    if (!window.confirm("Xóa nhân sự gốc?")) return;
    try {
      await deleteData(`/staff/${id}`);
      setMasterStaff(masterStaff.filter(s => s._id !== id));
      setActiveStaffList(activeStaffList.filter(s => s._id !== id));
      if (topPerformerId === id) setTopPerformerId("");
    } catch (error) {}
  };

  const fohStaff = activeStaffList.filter(s => s.department === "FOH");
  const bohStaff = activeStaffList.filter(s => s.department === "BOH");

  return (
    <div className="h-full overflow-auto bg-gray-50 p-2 sm:p-4 text-sm md:text-base">
      <div className="max-w-[1500px] mx-auto space-y-3 pb-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded shadow-sm border border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Hệ Thống Chia Tip</h1>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <label className="font-medium text-gray-700 text-sm">Dữ liệu:</label>
            <SelectUI value={selectedBoardId} onValueChange={setSelectedBoardId}>
              <SelectTrigger className="w-[260px] h-9 bg-white border-blue-200 text-sm">
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
          <TabsList className="mb-2 h-9 bg-white border shadow-sm">
            <TabsTrigger value="calculator" className="text-sm data-[state=active]:bg-blue-50 py-1.5 px-4">Bảng Tính Tip</TabsTrigger>
            <TabsTrigger value="staff" className="text-sm data-[state=active]:bg-blue-50 py-1.5 px-4">Nhân Sự Gốc</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-3 m-0">
            
            {/* THÔNG TIN BẢNG VÀ THỐNG KÊ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-5 bg-white p-3 rounded border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                  <span className="font-bold text-gray-800 text-base">{selectedBoardId === "NEW" ? "Khởi Tạo Mới" : "Sửa Bảng"}</span>
                  <div className="flex gap-2">
                    {selectedBoardId !== "NEW" && (
                      <Button variant="destructive" size="sm" className="h-8 text-sm px-3" onClick={handleDeleteTipBoard}>Xóa</Button>
                    )}
                    <Button size="sm" className="h-8 text-sm px-3 bg-blue-600" onClick={handleSaveTip}>Lưu</Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs text-gray-500 font-bold block mb-1">Tháng</span>
                    <Input placeholder="VD: 3/2026" value={month} onChange={e => setMonth(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-bold block mb-1">Kỳ</span>
                    <Input placeholder="VD: 15-30/3" value={periodName} onChange={e => setPeriodName(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <span className="text-xs text-blue-600 font-bold block mb-1">Tổng Tip</span>
                    <Input 
                      type="text" 
                      placeholder="Nhập..." 
                      value={totalTipStr ? Number(totalTipStr).toLocaleString("vi-VN") : ""} 
                      onChange={e => {
                        const raw = e.target.value.replace(/\./g, "");
                        if (/^\d*$/.test(raw)) setTotalTipStr(raw);
                      }} 
                      className="h-9 text-sm font-bold border-blue-300" 
                    />
                  </div>
                </div>
              </div>

              {/* KHỐI THỐNG KÊ */}
              <div className="lg:col-span-7 bg-white p-2.5 rounded border border-gray-200 shadow-sm">
                <div className="grid grid-cols-4 gap-2 h-full items-center text-center">
                  <div className="bg-gray-50 p-2 rounded border border-gray-100 flex flex-col justify-center">
                    <p className="text-xs text-gray-500 font-bold mb-1 whitespace-nowrap">
                      CÒN LẠI <span className="text-red-500 font-medium tracking-tighter">(-500.000đ)</span>
                    </p>
                    <p className="text-base font-bold">{formatVND(calculations.remainingTip)}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-100 flex flex-col justify-center">
                    <p className="text-xs text-gray-500 font-bold mb-1">TỔNG CÔNG</p>
                    <p className="text-base font-bold">{calculations.totalDays}</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded border border-blue-100 flex flex-col justify-center">
                    <p className="text-xs text-blue-600 font-bold mb-1">1 CÔNG</p>
                    <p className="text-base font-bold text-blue-700">{formatVND(calculations.tipPerDay)}</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded border border-orange-100 flex flex-col justify-center">
                    <p className="text-xs text-orange-600 font-bold mb-1">QUỸ PV (+PHẠT)</p>
                    <p className="text-base font-bold text-orange-700">{formatVND(calculations.totalServiceFund)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG CHIA FOH/BOH */}
            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden flex flex-col xl:flex-row">
              
              {/* BẢNG FOH */}
              <div className="flex-1 border-b xl:border-b-0 xl:border-r border-gray-200">
                <div className="bg-blue-50 p-2 border-b border-blue-200 flex justify-between items-center">
                   <h3 className="font-bold text-blue-800 text-sm pl-1">FRONT OF HOUSE (FOH)</h3>
                   <span className="text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">-5% Quỹ</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="p-2 border-b border-r w-[120px] pl-3">Nhân viên</th>
                        <th className="p-2 border-b border-r w-[55px] text-center">Công</th>
                        <th className="p-2 border-b border-r w-[45px] text-center">TOP</th>
                        <th className="p-2 border-b border-r text-right">Cơ Bản</th>
                        <th className="p-2 border-b border-r text-right text-orange-600">-Quỹ</th>
                        <th className="p-2 border-b border-r w-[85px] text-center text-red-600">Phạt</th>
                        <th className="p-2 border-b text-right font-bold pr-3">Thực Nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fohStaff.map((row) => {
                        const calc = calculations.details.find(d => d._id === row._id);
                        const isTop = topPerformerId === row._id;
                        return (
                          <tr key={row._id} className={`border-b ${isTop ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                            <td className="p-2 pl-3 border-r font-medium text-sm">{row.name}</td>
                            <td className="p-2 border-r">
                              <Input type="number" className={`h-8 text-center text-sm px-1 ${Number(row.workDays) > 0 ? "bg-blue-50 border-blue-300" : ""}`} value={row.workDays} onChange={(e) => handleWorkDaysChange(row._id, e.target.value)} />
                            </td>
                            <td className="p-2 border-r text-center">
                               <button onClick={() => setTopPerformerId(isTop ? "" : row._id)} className={`h-6 w-6 rounded inline-flex items-center justify-center ${isTop ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'}`}>★</button>
                            </td>
                            <td className="p-2 border-r text-right text-gray-600 text-sm">{calc ? formatVND(calc.baseTip) : "-"}</td>
                            <td className="p-2 border-r text-right text-orange-600 text-sm">{calc && calc.fundDeduction > 0 ? `-${formatVND(calc.fundDeduction)}` : "-"}</td>
                            <td className="p-2 border-r text-center">
                              <Input 
                                type="text" 
                                className="h-8 text-right text-sm px-1.5 text-red-600" 
                                value={row.penalty ? Number(row.penalty).toLocaleString("vi-VN") : ""} 
                                onChange={(e) => handlePenaltyChange(row._id, e.target.value)} 
                              />
                            </td>
                            <td className="p-2 pr-3 text-right font-bold text-green-700 text-sm">{calc ? formatVND(calc.finalTip) : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BẢNG BOH */}
              <div className="flex-1">
                <div className="bg-green-50 p-2 border-b border-green-200 flex justify-between items-center">
                   <h3 className="font-bold text-green-800 text-sm pl-1">BACK OF HOUSE (BOH)</h3>
                   <span className="text-xs font-medium text-green-600 bg-white px-2 py-1 rounded border border-green-200">Giữ Nguyên</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="p-2 border-b border-r w-[120px] pl-3">Nhân viên</th>
                        <th className="p-2 border-b border-r w-[55px] text-center">Công</th>
                        <th className="p-2 border-b border-r w-[45px] text-center">TOP</th>
                        <th className="p-2 border-b border-r text-right">Cơ Bản</th>
                        <th className="p-2 border-b text-right font-bold pr-3">Thực Nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bohStaff.map((row) => {
                        const calc = calculations.details.find(d => d._id === row._id);
                        const isTop = topPerformerId === row._id;
                        return (
                          <tr key={row._id} className={`border-b ${isTop ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                            <td className="p-2 pl-3 border-r font-medium text-sm">{row.name}</td>
                            <td className="p-2 border-r">
                              <Input type="number" className={`h-8 text-center text-sm px-1 ${Number(row.workDays) > 0 ? "bg-green-50 border-green-300" : ""}`} value={row.workDays} onChange={(e) => handleWorkDaysChange(row._id, e.target.value)} />
                            </td>
                            <td className="p-2 border-r text-center">
                               <button onClick={() => setTopPerformerId(isTop ? "" : row._id)} className={`h-6 w-6 rounded inline-flex items-center justify-center ${isTop ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'}`}>★</button>
                            </td>
                            <td className="p-2 border-r text-right text-gray-600 text-sm">{calc ? formatVND(calc.baseTip) : "-"}</td>
                            <td className="p-2 pr-3 text-right font-bold text-green-700 text-sm">{calc ? formatVND(calc.finalTip) : "-"}</td>
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
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex gap-3 items-end bg-gray-50 p-3 rounded border border-gray-100 w-fit">
                  <div>
                    <label className="text-xs font-bold mb-1 block">Tên nhân viên</label>
                    <Input placeholder="Nhập..." value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="h-9 text-sm bg-white w-[220px]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1 block">Bộ phận</label>
                    <SelectUI value={newStaffDept} onValueChange={(val: "FOH"|"BOH") => setNewStaffDept(val)}>
                      <SelectTrigger className="h-9 text-sm bg-white w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOH" className="text-sm">FOH</SelectItem>
                        <SelectItem value="BOH" className="text-sm">BOH</SelectItem>
                      </SelectContent>
                    </SelectUI>
                  </div>
                  <Button className="h-9 text-sm bg-blue-600 px-4" onClick={handleAddMasterStaff}>Thêm Mới</Button>
                </div>

                <div className="border rounded overflow-hidden w-fit min-w-[450px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2.5 border-b">Tên nhân sự</th>
                        <th className="p-2.5 border-b">Bộ phận</th>
                        <th className="p-2.5 border-b text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterStaff.map(staff => (
                        <tr key={staff._id} className="border-b hover:bg-gray-50">
                          <td className="p-2.5 font-medium">{staff.name}</td>
                          <td className="p-2.5"><Badge variant="outline" className="text-xs h-6 px-2">{staff.department}</Badge></td>
                          <td className="p-2.5 text-center">
                            <button onClick={() => handleDeleteMasterStaff(staff._id)} className="text-red-500 hover:text-red-700 text-base">❌</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
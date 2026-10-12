import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  CARD_CLASS,
  STATUS_OPTIONS,
  WEEKDAYS,
  dateDay,
  dateWeekday,
  getDepartment,
  getEmployeeId,
  getEmployeeName,
  getStatusInfo,
} from "../types/attendance";
import type {
  Attendance,
  AttendanceDay,
  DayStatus,
  Employee,
  SheetStatus,
  ShiftType,
} from "../types/attendance";
import ShiftPickerPortal from "./ShiftPickerPortal";

type Props = {
  month: number;
  year: number;
  loading: boolean;
  generating: boolean;
  days: string[];
  attendances: Attendance[];
  employees: Employee[];
  filteredEmployees: Employee[];
  selectedEmployeeIds: string[];
  departmentFilter: string;
  search: string;
  savingDay: string | null;
  onToggleEmployee: (id: string) => void;
  onToggleVisible: () => void;
  onOpenSchedule: (e: Employee) => void;
  onOpenOvertime: (a: Attendance) => void;
  onUpdateDay: (
    a: Attendance,
    r: AttendanceDay,
    s: DayStatus,
    shift?: { shiftType: ShiftType | null; shiftTime: string | null },
  ) => void;
  onChangeStatus: (a: Attendance, s: SheetStatus) => void;
  onDelete: (a: Attendance) => void;
  onGenerate: () => void;
};

type ShiftPickerState = {
  attendanceId: string;
  date: string;
  anchorRect: DOMRect;
  currentShiftType: ShiftType | null;
  currentShiftTime: string | null;
};

export default function AttendanceTableTab({
  month, year, loading, generating, days, attendances, employees,
  filteredEmployees, selectedEmployeeIds, departmentFilter, search,
  savingDay, onToggleEmployee, onToggleVisible, onOpenSchedule,
  onOpenOvertime, onUpdateDay, onChangeStatus, onDelete, onGenerate,
}: Props) {
  const [shiftPicker, setShiftPicker] = useState<ShiftPickerState | null>(null);

  const visibleRows = attendances.filter((attendance) => {
    const employeeId = getEmployeeId(attendance.employee);
    const employee = employees.find((item) => item._id === employeeId);
    if (!employee) {
      return departmentFilter === "all" || attendance.department === departmentFilter;
    }
    const matchesDepartment = departmentFilter === "all" || getDepartment(employee) === departmentFilter;
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      attendance.employeeName.toLowerCase().includes(keyword) ||
      (attendance.employeeCode || "").toLowerCase().includes(keyword);
    return matchesDepartment && matchesSearch;
  });

  const handleStatusChange = (
    attendance: Attendance,
    record: AttendanceDay,
    newStatus: DayStatus,
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    if (newStatus === "WORK") {
      const rect = event.target.getBoundingClientRect();
      setShiftPicker({
        attendanceId: attendance._id,
        date: record.date,
        anchorRect: rect,
        currentShiftType: record.shiftType || "SHIFT_2",
        currentShiftTime: record.shiftTime || "15:30",
      });
      return;
    }
    onUpdateDay(attendance, record, newStatus);
  };

  const confirmShift = (
    attendance: Attendance,
    record: AttendanceDay,
    shiftType: ShiftType,
    shiftTime: string,
  ) => {
    onUpdateDay(attendance, record, "WORK", { shiftType, shiftTime });
    setShiftPicker(null);
  };

  const pickerAttendance = shiftPicker
    ? attendances.find((a) => a._id === shiftPicker.attendanceId)
    : null;
  const pickerRecord = pickerAttendance?.dailyRecords.find(
    (r) => r.date === shiftPicker?.date,
  );

  return (
    <section className={CARD_CLASS}>
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bảng công tháng {month}/{year}</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Chọn nhân viên rồi tạo bảng công. Nhấn vào từng ô để chỉnh sửa trạng thái ngày.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          Tạo bảng công đã chọn ({selectedEmployeeIds.length})
        </button>
      </div>

      {/* Employee selection */}
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-base font-medium text-slate-700">
            <input
              type="checkbox"
              checked={filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.includes(e._id))}
              onChange={onToggleVisible}
              className="h-5 w-5 rounded border-slate-300 accent-blue-600"
            />
            Chọn tất cả nhân viên đang lọc
          </label>
          <span className="text-sm text-slate-500">{filteredEmployees.length} nhân viên</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {filteredEmployees.map((employee) => {
            const selected = selectedEmployeeIds.includes(employee._id);
            return (
              <label
                key={employee._id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                  selected
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleEmployee(employee._id)}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="max-w-48 truncate font-medium">{getEmployeeName(employee)}</span>
                <button
                  type="button"
                  title="Thiết lập lịch làm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenSchedule(employee);
                  }}
                  className="ml-0.5 rounded-md p-1 hover:bg-blue-100"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </label>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 text-base text-slate-500">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          Đang tải dữ liệu...
        </div>
      ) : attendances.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Chưa có bảng công kỳ này</h3>
          <p className="mt-2 max-w-md text-base text-slate-500">
            Chọn nhân viên, cấu hình lịch phân ca rồi nhấn “Tạo bảng công đã chọn”.
          </p>
        </div>
      ) : (
        <div className="max-h-[680px] overflow-auto">
          <table className="min-w-max border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr>
                <th className="sticky left-0 z-30 min-w-16 border-b border-r border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-bold text-slate-700">STT</th>
                <th className="sticky left-16 z-30 min-w-60 border-b border-r border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">Nhân viên</th>
                {days.map((date) => {
                  const wd = dateWeekday(date);
                  const isWeekend = wd === 0 || wd === 6;
                  return (
                    <th key={date} className={`min-w-16 border-b border-r border-slate-200 px-1.5 py-3 text-center ${isWeekend ? "bg-blue-50/80" : ""}`}>
                      <div className="text-base font-bold text-slate-800">{dateDay(date)}</div>
                      <div className="text-xs text-slate-400">{String(date.slice(5, 7))}/{date.slice(0, 4)}</div>
                      <div className="mt-1 text-xs font-medium text-slate-500">{WEEKDAYS[wd]}</div>
                    </th>
                  );
                })}
                <th className="min-w-20 border-b border-r border-slate-200 px-3 py-4 text-center text-sm font-bold text-slate-700">Công</th>
                <th className="min-w-20 border-b border-r border-slate-200 px-3 py-4 text-center text-sm font-bold text-slate-700">P vượt</th>
                <th className="min-w-20 border-b border-r border-slate-200 px-3 py-4 text-center text-sm font-bold text-slate-700">OT</th>
                <th className="sticky right-0 z-30 min-w-56 border-b border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((attendance, index) => {
                const recordMap = new Map(attendance.dailyRecords.map((r) => [r.date, r]));
                return (
                  <tr key={attendance._id} className="hover:bg-blue-50/30">
                    <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-3 text-center text-sm text-slate-500">{index + 1}</td>
                    <td className="sticky left-16 z-10 border-b border-r border-slate-100 bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800">{attendance.employeeName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {attendance.employeeCode || "Chưa có mã"}{" · "}{attendance.department || "Chưa phân phòng"}
                      </div>
                    </td>
                    {days.map((date) => {
                      const record = recordMap.get(date);
                      if (!record) return <td key={date} className="border-b border-r border-slate-100 px-1.5 py-3 text-center text-slate-300">—</td>;
                      const info = getStatusInfo(record.status);
                      const isSaving = savingDay === `${attendance._id}-${record.date}`;
                      return (
                        <td key={date} className="border-b border-r border-slate-100 px-1 py-2 text-center">
                          <div className="group relative flex flex-col items-center gap-1">
                            <select
                              aria-label={`${attendance.employeeName} ngày ${date}`}
                              value={record.status}
                              disabled={attendance.status === "LOCKED" || isSaving}
                              onChange={(e) =>
                                handleStatusChange(
                                  attendance,
                                  record,
                                  e.target.value as DayStatus,
                                  e,
                                )
                              }
                              className={`w-14 cursor-pointer appearance-none rounded-md px-1 py-2 text-center text-sm font-bold outline-none ring-blue-200 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${info.className}`}
                            >
                              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.short}</option>)}
                            </select>
                            {record.status === "WORK" && record.shiftTime && (
                              <span className="text-xs text-slate-500">{record.shiftTime}</span>
                            )}
                            {isSaving && <LoaderCircle className="absolute -right-1 -top-1 h-4 w-4 animate-spin text-blue-600" />}
                          </div>
                        </td>
                      );
                    })}
                    <td className="border-b border-r border-slate-100 px-3 py-3 text-center text-base font-bold text-slate-800">{attendance.summary?.totalWorkDays ?? 0}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-3 text-center text-base font-semibold text-rose-600">{attendance.summary?.excessPDays ?? 0}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-3 text-center text-base font-semibold text-violet-700">{(attendance.summary?.totalOTHours ?? 0).toFixed(1)}</td>
                    <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const id = getEmployeeId(attendance.employee);
                            const emp = employees.find((e) => e._id === id);
                            if (emp) onOpenSchedule(emp);
                          }}
                          disabled={attendance.status === "LOCKED"}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <Settings2 className="h-4 w-4" /> Lịch
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenOvertime(attendance)}
                          disabled={attendance.status === "LOCKED"}
                          className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 px-2.5 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                        >
                          <Clock3 className="h-4 w-4" /> OT
                        </button>
                        {attendance.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(attendance, "CONFIRMED")}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Xác nhận
                          </button>
                        )}
                        {attendance.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(attendance, "LOCKED")}
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-2.5 py-2 text-sm font-medium text-white hover:bg-slate-900"
                          >
                            <LockKeyhole className="h-4 w-4" /> Khóa
                          </button>
                        )}
                        {attendance.status === "LOCKED" && (
                          <button
                            type="button"
                            onClick={() => onChangeStatus(attendance, "CONFIRMED")}
                            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                          >
                            <LockKeyhole className="h-4 w-4" /> Mở khóa
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(attendance)}
                          disabled={attendance.status === "LOCKED"}
                          className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-2.5 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-200 px-5 py-4">
        {STATUS_OPTIONS.map((item) => (
          <div key={item.value} className="flex items-center gap-2 text-sm text-slate-600">
            <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${item.className}`}>{item.short}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* Portal — render ngoài table, không bị cắt bởi overflow */}
      {shiftPicker && pickerAttendance && pickerRecord && (
        <ShiftPickerPortal
          anchorRect={shiftPicker.anchorRect}
          initialShiftType={shiftPicker.currentShiftType || "SHIFT_2"}
          initialShiftTime={shiftPicker.currentShiftTime || "15:30"}
          onConfirm={(st, stime) =>
            confirmShift(pickerAttendance, pickerRecord, st, stime)
          }
          onCancel={() => setShiftPicker(null)}
        />
      )}
    </section>
  );
}
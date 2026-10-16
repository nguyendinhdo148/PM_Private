import {
  CalendarDays,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Settings2,
  Trash2,
  X,
  CheckSquare,
  Square,
  CheckCircle2,
  Unlock,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CARD_CLASS,
  STATUS_OPTIONS,
  WEEKDAYS,
  dateDay,
  dateWeekday,
  getEmployeeId,
  getEmployeeName,
  matchesAttendanceFilters,
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
  departmentFilter: string[];
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
  onGenerate: (employeeIds: string[]) => void;
};

type ShiftPickerState = {
  attendanceId: string;
  date: string;
  anchorRect: DOMRect;
  currentShiftType: ShiftType | null;
  currentShiftTime: string | null;
};

export default function AttendanceTableTab({
  month,
  year,
  loading,
  generating,
  days,
  attendances,
  employees,
  filteredEmployees,
  selectedEmployeeIds,
  departmentFilter,
  search,
  savingDay,
  onToggleEmployee,
  onToggleVisible,
  onOpenSchedule,
  onOpenOvertime,
  onUpdateDay,
  onChangeStatus,
  onDelete,
  onGenerate,
}: Props) {
  const [shiftPicker, setShiftPicker] = useState<ShiftPickerState | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const employeesWithSheet = useMemo(() => {
    return new Set(attendances.map((a) => getEmployeeId(a.employee)));
  }, [attendances]);

  const employeesAvailable = useMemo(() => {
    return filteredEmployees.filter((e) => !employeesWithSheet.has(e._id));
  }, [filteredEmployees, employeesWithSheet]);

  const visibleRows = attendances.filter((attendance) =>
    matchesAttendanceFilters(
      attendance,
      departmentFilter,
      search,
      employees.find((item) => item._id === getEmployeeId(attendance.employee)),
    ),
  );

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

  const selectedNewCount = selectedEmployeeIds.filter(
    (id) => !employeesWithSheet.has(id),
  ).length;

  const handleConfirmGenerate = () => {
    const newEmployeeIds = selectedEmployeeIds.filter(
      (id) => !employeesWithSheet.has(id),
    );
    if (newEmployeeIds.length === 0) return;
    onGenerate(newEmployeeIds);
    setShowCreateModal(false);
  };

  return (
    <section className={CARD_CLASS}>
      {/* ============ HEADER ============ */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Bảng công tháng {month}/{year}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Nhấn vào từng ô để chỉnh sửa trạng thái ngày.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          disabled={generating || loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          Tạo bảng công
        </button>
      </div>

      {/* ============ MAIN TABLE ============ */}
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
          <h3 className="text-lg font-semibold text-slate-900">
            Chưa có bảng công kỳ này
          </h3>
          <p className="mt-2 max-w-md text-base text-slate-500">
            Bấm "Tạo bảng công" để chọn nhân viên và tạo bảng công mới.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Tạo bảng công
          </button>
        </div>
      ) : (
        /* KHÔNG scroll — hiển thị đủ trên 1 trang */
        <div className="overflow-x-visible">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                {/* STT */}
                <th className="w-8 border-b border-r border-slate-200 bg-slate-50 px-1 py-2 text-center text-xs font-bold text-slate-700">
                  #
                </th>
                {/* Nhân viên */}
                <th className="w-36 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700">
                  Nhân viên
                </th>
                {/* Ngày — thu nhỏ để vừa 1 trang */}
                {days.map((date) => {
                  const wd = dateWeekday(date);
                  const isWeekend = wd === 0 || wd === 6;
                  return (
                    <th
                      key={date}
                      className={`w-8 border-b border-r border-slate-200 px-0.5 py-1.5 text-center ${
                        isWeekend ? "bg-blue-50/80" : ""
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-800">
                        {dateDay(date)}
                      </div>
                      <div className="text-[9px] font-medium text-slate-500">
                        {WEEKDAYS[wd]}
                      </div>
                    </th>
                  );
                })}
                {/* Tổng hợp */}
                <th className="w-9 border-b border-r border-slate-200 px-0.5 py-2 text-center text-xs font-bold text-slate-700">
                  Công
                </th>
                <th className="w-9 border-b border-r border-slate-200 px-0.5 py-2 text-center text-xs font-bold text-slate-700">
                  P
                </th>
                <th className="w-9 border-b border-r border-slate-200 px-0.5 py-2 text-center text-xs font-bold text-slate-700">
                  OT
                </th>
                {/* Thao tác — KHÔNG sticky nữa, để trong luồng bình thường */}
                <th className="w-20 border-b border-slate-200 bg-slate-50 px-1 py-2 text-center text-xs font-bold text-slate-700">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((attendance, index) => {
                const recordMap = new Map(
                  attendance.dailyRecords.map((r) => [r.date, r]),
                );
                return (
                  <tr key={attendance._id} className="hover:bg-blue-50/30">
                    <td className="w-8 border-b border-r border-slate-100 px-1 py-1.5 text-center text-xs text-slate-500">
                      {index + 1}
                    </td>
                    <td className="w-36 border-b border-r border-slate-100 px-2 py-1.5">
                      <div className="truncate text-xs font-semibold text-slate-800">
                        {attendance.employeeName}
                      </div>
                      <div className="truncate text-[10px] text-slate-500">
                        {attendance.employeeCode || "—"}
                      </div>
                    </td>
                    {days.map((date) => {
                      const record = recordMap.get(date);
                      if (!record)
                        return (
                          <td
                            key={date}
                            className="border-b border-r border-slate-100 px-0.5 py-1 text-center text-[10px] text-slate-300"
                          >
                            —
                          </td>
                        );
                      const info = getStatusInfo(record.status);
                      const isSaving =
                        savingDay === `${attendance._id}-${record.date}`;
                      return (
                        <td
                          key={date}
                          className="border-b border-r border-slate-100 p-0.5 text-center"
                        >
                          <div className="relative flex justify-center">
                            <select
                              aria-label={`${attendance.employeeName} ngày ${date}`}
                              value={record.status}
                              disabled={
                                attendance.status === "LOCKED" || isSaving
                              }
                              onChange={(e) =>
                                handleStatusChange(
                                  attendance,
                                  record,
                                  e.target.value as DayStatus,
                                  e,
                                )
                              }
                              className={`h-6 w-full max-w-[34px] cursor-pointer appearance-none rounded text-center text-[10px] font-bold outline-none ring-blue-200 focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${info.className}`}
                            >
                              {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.short}
                                </option>
                              ))}
                            </select>
                            {isSaving && (
                              <LoaderCircle className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-spin text-blue-600" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="w-9 border-b border-r border-slate-100 px-0.5 py-1.5 text-center text-xs font-bold text-slate-800">
                      {attendance.summary?.totalWorkDays ?? 0}
                    </td>
                    <td className="w-9 border-b border-r border-slate-100 px-0.5 py-1.5 text-center text-xs font-semibold text-rose-600">
                      {attendance.summary?.excessPDays ?? 0}
                    </td>
                    <td className="w-9 border-b border-r border-slate-100 px-0.5 py-1.5 text-center text-xs font-semibold text-violet-700">
                      {(attendance.summary?.totalOTHours ?? 0).toFixed(1)}
                    </td>
                    {/* Thao tác — không sticky, trong luồng bình thường */}
                    <td className="w-20 border-b border-slate-100 px-1 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        {attendance.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStatus(attendance, "CONFIRMED")
                            }
                            title="Xác nhận"
                            className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white transition hover:bg-blue-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {attendance.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStatus(attendance, "LOCKED")
                            }
                            title="Khóa"
                            className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-white transition hover:bg-slate-900"
                          >
                            <LockKeyhole className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {attendance.status === "LOCKED" && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeStatus(attendance, "CONFIRMED")
                            }
                            title="Mở khóa"
                            className="flex h-6 w-6 items-center justify-center rounded border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(attendance)}
                          disabled={attendance.status === "LOCKED"}
                          title="Xóa"
                          className="flex h-6 w-6 items-center justify-center rounded border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* ============ LEGEND ============ */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 px-5 py-3">
        {STATUS_OPTIONS.map((item) => (
          <div
            key={item.value}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${item.className}`}
            >
              {item.short}
            </span>
            {item.label}
          </div>
        ))}
      </div>

      {/* ============ MODAL TẠO BẢNG CÔNG ============ */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tạo bảng công tháng {month}/{year}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {attendances.length > 0
                    ? "Chọn thêm nhân viên để tạo bổ sung."
                    : "Chọn nhân viên cần tạo bảng công."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
                  {employeesAvailable.length > 0 &&
                  employeesAvailable.every((e) =>
                    selectedEmployeeIds.includes(e._id),
                  ) ? (
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                  <input
                    type="checkbox"
                    checked={
                      employeesAvailable.length > 0 &&
                      employeesAvailable.every((e) =>
                        selectedEmployeeIds.includes(e._id),
                      )
                    }
                    onChange={onToggleVisible}
                    className="sr-only"
                  />
                  Chọn tất cả nhân viên chưa có bảng công
                </label>
                <span className="text-sm text-slate-500">
                  Đã chọn{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedNewCount}
                  </span>{" "}
                  / {employeesAvailable.length} khả dụng
                </span>
              </div>

              {employeesAvailable.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    Tất cả nhân viên đang lọc đều đã có bảng công tháng này.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {employeesAvailable.map((employee) => {
                    const selected = selectedEmployeeIds.includes(
                      employee._id,
                    );
                    return (
                      <label
                        key={employee._id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                          selected
                            ? "border-blue-300 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleEmployee(employee._id)}
                          className="sr-only"
                        />
                        {selected ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="max-w-48 truncate font-medium">
                          {getEmployeeName(employee)}
                        </span>
                        <button
                          type="button"
                          title="Thiết lập lịch phân ca"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onOpenSchedule(employee);
                          }}
                          className="ml-0.5 rounded-md p-1 text-slate-400 transition hover:bg-blue-100 hover:text-blue-700"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                      </label>
                    );
                  })}
                </div>
              )}

              {employeesWithSheet.size > 0 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase text-slate-400">
                    Đã có bảng công tháng này ({employeesWithSheet.size})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(employeesWithSheet).map((id) => {
                      const emp = employees.find((e) => e._id === id);
                      if (!emp) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {getEmployeeName(emp)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <span className="text-sm text-slate-500">
                Sẽ tạo mới cho{" "}
                <span className="font-bold text-slate-700">
                  {selectedNewCount}
                </span>{" "}
                nhân viên
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGenerate}
                  disabled={selectedNewCount === 0 || generating}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {generating ? "Đang tạo..." : "Tạo bảng công"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
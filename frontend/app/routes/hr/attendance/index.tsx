
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchData,
  postData,
  updateData,
  patchData,
  deleteData,
} from "@/lib/fetch-util";

import AttendanceHeader from "./components/AttendanceHeader";
import AttendanceTabs from "./components/AttendanceTabs";
import SummaryCards from "./components/SummaryCards";
import WeeklyScheduleTab from "./components/WeeklyScheduleTab";
import SummaryTab from "./components/SummaryTab";
import AttendanceTableTab from "./components/AttendanceTableTab";
import OvertimeTab from "./components/OvertimeTab";
import ScheduleModal from "./components/ScheduleModal";
import OvertimeModal from "./components/OvertimeModal";

import {
  emptySchedule,
  getDefaultShift,
  getDepartment,
  getEmployeeCode,
  getEmployeeId,
  getEmployeeName,
  getList,
  matchesAttendanceFilters,
  matchesEmployeeFilters,
  getPayPeriodDates,
  getScheduleFromAttendance,
  unwrap,
} from "./types/attendance";

import type { TabKey } from "./components/AttendanceTabs";
import type {
  Attendance,
  AttendanceDay,
  DayStatus,
  Employee,
  EmployeeSchedule,
  SheetStatus,
  ShiftType,
} from "./types/attendance";

const API = "/attendance";

export default function AttendancePage() {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Nhiều phòng ban được chọn cùng lúc
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [scheduleByEmployee, setScheduleByEmployee] = useState<
    Record<string, EmployeeSchedule>
  >({});

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [draftSchedule, setDraftSchedule] =
    useState<EmployeeSchedule>(emptySchedule());
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [overtimeAttendance, setOvertimeAttendance] =
    useState<Attendance | null>(null);
  const [overtimeDate, setOvertimeDate] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeNote, setOvertimeNote] = useState("");
  const [overtimeSaving, setOvertimeSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("attendance");
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [yearAttendances, setYearAttendances] = useState<Attendance[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  /* ---- request ---- */
  const request = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const method = (options.method || "GET").toUpperCase();
      let body: unknown;

      if (options.body) {
        try {
          body = JSON.parse(String(options.body));
        } catch {
          body = options.body;
        }
      }

      try {
        let payload: any;

        if (method === "GET") payload = await fetchData(url);
        else if (method === "POST") payload = await postData(url, body ?? {});
        else if (method === "PUT") payload = await updateData(url, body ?? {});
        else if (method === "PATCH") payload = await patchData(url, body ?? {});
        else if (method === "DELETE") payload = await deleteData(url);
        else throw new Error(`Phương thức API không được hỗ trợ: ${method}`);

        if (payload?.success === false) {
          throw new Error(
            payload.message || payload.error || "Yêu cầu thất bại",
          );
        }

        return payload;
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Không thể kết nối API.";

        throw new Error(msg);
      }
    },
    [],
  );

  /* ---- loaders ---- */
  const loadEmployees = useCallback(async () => {
    const payload = await request("/employees");
    const list = getList(payload) as Employee[];

    setEmployees(list);

    setSelectedEmployeeIds((prev) =>
      prev.length
        ? prev.filter((id) => list.some((e) => e._id === id))
        : list
            .filter((e) =>
              ["ACTIVE", "PROBATION", "active", "probation"].includes(
                e.status || "",
              ),
            )
            .map((e) => e._id),
    );

    setScheduleByEmployee((prev) => {
      const next = { ...prev };

      for (const employee of list) {
        if (!next[employee._id]) {
          next[employee._id] = emptySchedule(
            1,
            getDefaultShift(employee),
          );
        }
      }

      return next;
    });
  }, [request]);

  const loadAttendances = useCallback(async () => {
    const payload = await request(`${API}?month=${month}&year=${year}`);
    setAttendances(getList(payload) as Attendance[]);
  }, [month, year, request]);

  const loadYearAttendances = useCallback(async () => {
    setSummaryLoading(true);

    try {
      const previousMonth = month === 1 ? 12 : month - 1;
      const previousYear = month === 1 ? year - 1 : year;

      const queries = [
        ...Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          year: summaryYear,
        })),
        { month: previousMonth, year: previousYear },
      ];

      const results = await Promise.all(
        queries.map(({ month: m, year: y }) =>
          request(`${API}?month=${m}&year=${y}`)
            .then((payload) => getList(payload) as Attendance[])
            .catch(() => [] as Attendance[]),
        ),
      );

      const unique = new Map<string, Attendance>();
      results.flat().forEach((item) => unique.set(item._id, item));

      setYearAttendances(Array.from(unique.values()));
    } finally {
      setSummaryLoading(false);
    }
  }, [request, summaryYear, month, year]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      await Promise.all([loadEmployees(), loadAttendances()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu chấm công.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadEmployees, loadAttendances]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    void loadAttendances();
  }, [month, year, loadAttendances]);

  useEffect(() => {
    if (activeTab === "summary" || activeTab === "overtime") {
      void loadYearAttendances();
    }
  }, [activeTab, loadYearAttendances]);

  /* ---- derived ---- */
  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map(getDepartment),
        ),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [employees],
  );

  // Lọc nhân viên: khớp một trong các phòng ban được chọn.
  // Mảng rỗng nghĩa là hiển thị tất cả phòng ban.
  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) =>
      matchesEmployeeFilters(employee, departmentFilter, search),
    );
  }, [employees, departmentFilter, search]);

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee._id, employee])),
    [employees],
  );

  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance>();

    for (const attendance of attendances) {
      const id = getEmployeeId(attendance.employee);
      if (id) map.set(id, attendance);
    }

    return map;
  }, [attendances]);

  const days = useMemo(
    () => getPayPeriodDates(month, year),
    [month, year],
  );

  // Lọc dữ liệu lịch làm việc theo nhiều phòng ban và từ khóa tìm kiếm.
  const filteredAttendances = useMemo(
    () =>
      attendances.filter((attendance) =>
        matchesAttendanceFilters(
          attendance,
          departmentFilter,
          search,
          employeeById.get(getEmployeeId(attendance.employee) || ""),
        ),
      ),
    [attendances, departmentFilter, search, employeeById],
  );

  const weeklyAttendanceRows = useMemo(
    () =>
      [...filteredAttendances]
      .sort(
        (a, b) =>
          (a.department || "").localeCompare(b.department || "", "vi") ||
          a.employeeName.localeCompare(b.employeeName, "vi"),
      ),
    [filteredAttendances],
  );

  const summary = useMemo(
    () =>
      filteredAttendances.reduce(
        (total, attendance) => {
          const s = attendance.summary || {};

          total.work += s.totalWorkDays || 0;
          total.off += s.totalOffDays || 0;
          total.leave += s.totalPDays || 0;
          total.excessLeave += s.excessPDays || 0;
          total.absent += s.totalAbsentDays || 0;
          total.ot += s.totalPositiveOTHours || 0;

          return total;
        },
        {
          work: 0,
          off: 0,
          leave: 0,
          excessLeave: 0,
          absent: 0,
          ot: 0,
        },
      ),
    [filteredAttendances],
  );

  /* ---- actions ---- */
  const handleGenerate = async () => {
    if (!selectedEmployeeIds.length) {
      setErrorMessage("Bạn cần chọn ít nhất một nhân viên.");
      return;
    }

    setGenerating(true);
    setErrorMessage("");
    setMessage("");

    try {
      const schedules: Record<string, EmployeeSchedule> = {};

      for (const id of selectedEmployeeIds) {
        const employee = employees.find((e) => e._id === id);

        schedules[id] =
          scheduleByEmployee[id] ||
          emptySchedule(1, getDefaultShift(employee));
      }

      const payload = await request(`${API}/generate`, {
        method: "POST",
        body: JSON.stringify({
          month,
          year,
          employeeIds: selectedEmployeeIds,
          scheduleByEmployee: schedules,
        }),
      });

      const result = unwrap(payload);

      setMessage(
        `Đã tạo ${result?.createdCount ?? 0} bảng công; bỏ qua ${
          result?.skippedCount ?? 0
        } bảng đã tồn tại; lỗi ${result?.errorCount ?? 0}.`,
      );

      if (Array.isArray(result?.errors) && result.errors.length) {
        setErrorMessage(
          result.errors
            .map(
              (item: any) =>
                `${item.employeeName || item.employeeId}: ${item.message}`,
            )
            .join("\n"),
        );
      }

      await loadAttendances();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể tạo bảng công.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const toggleEmployee = (id: string) =>
    setSelectedEmployeeIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );

  const toggleVisibleEmployees = () => {
    const visibleIds = filteredEmployees.map((employee) => employee._id);

    const allSelected = visibleIds.every((id) =>
      selectedEmployeeIds.includes(id),
    );

    setSelectedEmployeeIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds])),
    );
  };

  const openScheduleEditor = (employee: Employee) => {
    const existing = attendanceMap.get(employee._id);

    const current =
      scheduleByEmployee[employee._id] ||
      getScheduleFromAttendance(existing);

    setEditingEmployee(employee);

    setDraftSchedule({
      ...current,
      weeklySchedule: { ...current.weeklySchedule },
      dateOverrides: { ...current.dateOverrides },
    });
  };

  const saveSchedule = async () => {
    if (!editingEmployee) return;

    setScheduleSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      const schedule: EmployeeSchedule = {
        ...draftSchedule,
        weeklySchedule: Object.fromEntries(
          Object.entries(draftSchedule.weeklySchedule).map(([day, cfg]) => [
            day,
            { ...cfg, isWeeklyOff: cfg.status === "OFF" },
          ]),
        ) as Record<number, any>,
      };

      const attendance = attendanceMap.get(editingEmployee._id);

      if (attendance) {
        await request(`${API}/${attendance._id}/schedule`, {
          method: "PATCH",
          body: JSON.stringify(schedule),
        });

        setMessage(
          "Đã lưu lịch phân ca. Các ô chấm công trong tháng hiện tại chưa bị thay đổi.",
        );
      } else {
        setMessage(
          "Đã lưu cấu hình lịch làm cho lần tạo bảng công tiếp theo.",
        );
      }

      setScheduleByEmployee((prev) => ({
        ...prev,
        [editingEmployee._id]: schedule,
      }));

      setEditingEmployee(null);

      if (attendance) await loadAttendances();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể lưu lịch phân ca.",
      );
    } finally {
      setScheduleSaving(false);
    }
  };

  const updateDay = async (
    attendance: Attendance,
    record: AttendanceDay,
    status: DayStatus,
    shift?: {
      shiftType: ShiftType | null;
      shiftTime: string | null;
    },
  ) => {
    if (attendance.status === "LOCKED") {
      setErrorMessage("Bảng công đã khóa, không thể sửa.");
      return;
    }

    setSavingDay(`${attendance._id}-${record.date}`);
    setErrorMessage("");
    setMessage("");

    try {
      const nextShiftType =
        status === "WORK"
          ? shift?.shiftType ?? record.shiftType ?? "SHIFT_2"
          : null;

      const nextShiftTime =
        status === "WORK"
          ? shift?.shiftTime ?? record.shiftTime ?? "15:30"
          : null;

      await request(`${API}/${attendance._id}/day`, {
        method: "PUT",
        body: JSON.stringify({
          date: record.date,
          status,
          shiftTime: nextShiftTime,
          shiftType: nextShiftType,
          isWeeklyOff: status === "OFF",
          note: record.note || "",
        }),
      });

      setMessage(`Đã cập nhật ngày ${record.date}.`);
      await loadAttendances();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật ngày công.",
      );
    } finally {
      setSavingDay(null);
    }
  };

  const changeSheetStatus = async (
    attendance: Attendance,
    status: SheetStatus,
  ) => {
    const label =
      attendance.status === "LOCKED" && status === "CONFIRMED"
        ? "mở khóa"
        : status === "CONFIRMED"
          ? "xác nhận"
          : "khóa";

    if (
      !window.confirm(
        `Bạn có chắc muốn ${label} bảng công của ${attendance.employeeName}?`,
      )
    ) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    try {
      await request(`${API}/${attendance._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setMessage("Đã cập nhật trạng thái bảng công.");
      await loadAttendances();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái bảng công.",
      );
    }
  };

  const deleteAttendance = async (attendance: Attendance) => {
    if (attendance.status === "LOCKED") {
      setErrorMessage("Bảng công đã khóa, không thể xóa.");
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa bảng công tháng ${attendance.month}/${attendance.year} của ${attendance.employeeName}? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    try {
      await request(`${API}/${attendance._id}`, { method: "DELETE" });

      setMessage(`Đã xóa bảng công của ${attendance.employeeName}.`);

      await Promise.all([loadAttendances(), loadYearAttendances()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa bảng công.",
      );
    }
  };

  const deleteAttendanceMonth = async (
    m: number,
    y: number,
    rows: Attendance[],
  ) => {
    if (rows.length === 0) return;

    const locked = rows.filter((item) => item.status === "LOCKED");

    if (locked.length > 0) {
      setErrorMessage(
        `Không thể xóa tháng ${m}/${y} vì có ${locked.length} bảng công đã khóa.`,
      );
      setMessage("");
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn XÓA TOÀN BỘ ${rows.length} bảng công của tháng ${m}/${y}?`,
      )
    ) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    try {
      for (const attendance of rows) {
        await request(`${API}/${attendance._id}`, { method: "DELETE" });
      }

      setMessage(
        `Đã xóa toàn bộ ${rows.length} bảng công của tháng ${m}/${y}.`,
      );

      await Promise.all([loadAttendances(), loadYearAttendances()]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể xóa toàn bộ bảng công tháng này.",
      );

      await Promise.all([loadAttendances(), loadYearAttendances()]);
    }
  };

  const openOvertime = (attendance: Attendance) => {
    setOvertimeAttendance(attendance);
    setOvertimeDate(`${year}-${String(month).padStart(2, "0")}-01`);
    setOvertimeHours("");
    setOvertimeNote("");
  };

  const addOvertime = async () => {
    if (!overtimeAttendance) return;

    const hours = Number(overtimeHours);

    if (!overtimeDate || !Number.isFinite(hours) || hours === 0) {
      setErrorMessage("Nhập ngày và số giờ OT khác 0.");
      return;
    }

    if (hours < -24 || hours > 24) {
      setErrorMessage("Số giờ OT phải trong khoảng -24 đến 24.");
      return;
    }

    setOvertimeSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      await request(`${API}/${overtimeAttendance._id}/overtime`, {
        method: "POST",
        body: JSON.stringify({
          date: overtimeDate,
          hours,
          note: overtimeNote,
        }),
      });

      setOvertimeAttendance(null);

      setMessage(
        hours > 0
          ? `Đã thêm ${hours} giờ tăng ca.`
          : `Đã ghi nhận ${Math.abs(hours)} giờ về sớm.`,
      );

      await loadAttendances();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể thêm OT.",
      );
    } finally {
      setOvertimeSaving(false);
    }
  };

  // Reset toàn bộ bộ lọc phòng ban và từ khóa tìm kiếm.
  const handleResetFilter = () => {
    setDepartmentFilter([]);
    setSearch("");
  };

  /* ---- render ---- */
  return (
    <div className="space-y-6 pb-10">
      <AttendanceHeader
        month={month}
        year={year}
        departmentFilter={departmentFilter}
        search={search}
        departments={departments}
        loading={loading}
        now={now}
        onChangeMonth={setMonth}
        onChangeYear={(value) => {
          setYear(value);
          setSummaryYear(value);
        }}
        onChangeDepartment={setDepartmentFilter}
        onChangeSearch={setSearch}
        onReset={handleResetFilter}
        onRefresh={() => void loadPage()}
      />

      <AttendanceTabs activeTab={activeTab} onChange={setActiveTab} />

      {message && (
        <div className="flex items-start gap-3 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-base text-emerald-800">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ✓
          </span>
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 whitespace-pre-wrap rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-base text-rose-700">
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
            !
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      <style>{`@media print {
        body * { visibility: hidden !important; }
        .weekly-print-area,
        .weekly-print-area * { visibility: visible !important; }
        .weekly-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          box-shadow: none !important;
          border: 0 !important;
        }
        .weekly-no-print { display: none !important; }
        @page { size: landscape; margin: 8mm; }
      }`}</style>

      {activeTab === "weekly" && (
        <WeeklyScheduleTab
          month={month}
          year={year}
          loading={loading}
          rows={weeklyAttendanceRows}
        />
      )}

      {activeTab === "summary" && (
        <SummaryTab
          summaryYear={summaryYear}
          summaryLoading={summaryLoading}
          yearAttendances={yearAttendances}
          employees={employees}
          departmentFilter={departmentFilter}
          search={search}
          onViewMonth={(m, y) => {
            setMonth(m);
            setYear(y);
            setSummaryYear(y);
            setActiveTab("attendance");
          }}
          onDeleteMonth={(m, y, rows) =>
            void deleteAttendanceMonth(m, y, rows)
          }
          onCreateNew={() => {
            setMonth(now.getMonth() + 1);
            setYear(now.getFullYear());
            setSummaryYear(now.getFullYear());
            setActiveTab("attendance");
          }}
        />
      )}

      {activeTab === "attendance" && (
        <AttendanceTableTab
          month={month}
          year={year}
          loading={loading}
          generating={generating}
          days={days}
          attendances={attendances}
          employees={employees}
          filteredEmployees={filteredEmployees}
          selectedEmployeeIds={selectedEmployeeIds}
          departmentFilter={departmentFilter}
          search={search}
          savingDay={savingDay}
          onToggleEmployee={toggleEmployee}
          onToggleVisible={toggleVisibleEmployees}
          onOpenSchedule={openScheduleEditor}
          onOpenOvertime={openOvertime}
          onUpdateDay={(a, r, s, shift) =>
            void updateDay(a, r, s, shift)
          }
          onChangeStatus={(a, s) => void changeSheetStatus(a, s)}
          onDelete={(a) => void deleteAttendance(a)}
          onGenerate={() => void handleGenerate()}
        />
      )}

      {activeTab === "overtime" && (
        <OvertimeTab
          month={month}
          year={year}
          loading={loading}
          attendances={attendances}
          employees={employees}
          yearAttendances={yearAttendances}
          departmentFilter={departmentFilter}
          search={search}
          onSaved={() => {
            void loadAttendances();
            void loadYearAttendances();
          }}
        />
      )}

      {activeTab === "summary" && (
        <SummaryCards
          attendanceCount={filteredAttendances.length}
          summary={summary}
        />
      )}

      {editingEmployee && (
        <ScheduleModal
          employee={editingEmployee}
          draft={draftSchedule}
          saving={scheduleSaving}
          onChange={setDraftSchedule}
          onClose={() => setEditingEmployee(null)}
          onSave={() => void saveSchedule()}
        />
      )}

      {overtimeAttendance && (
        <OvertimeModal
          attendance={overtimeAttendance}
          month={month}
          year={year}
          date={overtimeDate}
          hours={overtimeHours}
          note={overtimeNote}
          saving={overtimeSaving}
          onChangeDate={setOvertimeDate}
          onChangeHours={setOvertimeHours}
          onChangeNote={setOvertimeNote}
          onClose={() => setOvertimeAttendance(null)}
          onSave={() => void addOvertime()}
        />
      )}
    </div>
  );
}

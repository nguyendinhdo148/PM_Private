import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Users,
  RefreshCw,
  Settings2,
  CheckCircle2,
  LockKeyhole,
  Search,
  Plus,
  X,
  LoaderCircle,
  CalendarCheck,
  CircleAlert,
  Trash2,
  Eye,
  BarChart3,
} from "lucide-react";
import {
  fetchData,
  postData,
  updateData,
  patchData,
  deleteData,
} from "@/lib/fetch-util";

// Dùng chung BASE_URL và xác thực đã cấu hình trong lib/fetch-util.ts.
const API = "/attendance";
type DayStatus = "WORK" | "P" | "ABSENT" | "HOLIDAY" | "OFF";
type SheetStatus = "DRAFT" | "CONFIRMED" | "LOCKED";
type ShiftType = "SHIFT_1" | "SHIFT_2" | "SHIFT_3" | "SHIFT_4" | "CUSTOM";
type ScheduleDay = {
  status: DayStatus;
  shiftType: ShiftType | null;
  shiftTime: string | null;
  isWeeklyOff: boolean;
  note: string;
};
type EmployeeSchedule = {
  weeklyOffAllowance: number;
  monthlyPAllowance: number;
  weeklySchedule: Record<number, ScheduleDay>;
  dateOverrides: Record<string, Partial<ScheduleDay>>;
};
type Employee = {
  _id: string;
  name?: string;
  fullName?: string;
  employeeCode?: string;
  department?: string;
  position?: string;
  status?: string;
  workInfo?: {
    employeeCode?: string;
    department?: string;
    position?: string;
  };
};
type AttendanceDay = {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  status: DayStatus;
  shiftType: ShiftType | null;
  shiftTime: string | null;
  isWeeklyOff?: boolean;
  note?: string;
};
type OvertimeEntry = {
  _id: string;
  date: string;
  hours: number;
  note?: string;
};
type Attendance = {
  _id: string;
  employee: Employee | string;
  employeeCode?: string;
  employeeName: string;
  department?: string;
  position?: string;
  month: number;
  year: number;
  status: SheetStatus;
  dailyRecords: AttendanceDay[];
  overtimeEntries: OvertimeEntry[];
  workSchedule?: EmployeeSchedule;
  summary?: {
    totalWorkDays?: number;
    totalOffDays?: number;
    totalPDays?: number;
    excessPDays?: number;
    totalAbsentDays?: number;
    totalHolidayDays?: number;
    totalPositiveOTHours?: number;
    totalShortfallHours?: number;
    totalOTHours?: number;
  };
};
const API = "/attendance";
const WEEKDAYS = [
  "CN",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
];
const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const STATUS_OPTIONS: {
  value: DayStatus;
  label: string;
  short: string;
  className: string;
}[] = [
  {
    value: "WORK",
    label: "Đi làm",
    short: "X",
    className: "bg-emerald-50 text-emerald-700",
  },
  {
    value: "OFF",
    label: "Nghỉ tuần",
    short: "OFF",
    className: "bg-slate-100 text-slate-600",
  },
  {
    value: "P",
    label: "Nghỉ phép",
    short: "P",
    className: "bg-amber-50 text-amber-700",
  },
  {
    value: "ABSENT",
    label: "Vắng mặt",
    short: "A",
    className: "bg-rose-50 text-rose-700",
  },
  {
    value: "HOLIDAY",
    label: "Ngày lễ",
    short: "L",
    className: "bg-violet-50 text-violet-700",
  },
];
const SHIFTS: {
  value: string;
  label: string;
  time: string;
}[] = [
  { value: "SHIFT_1", label: "Ca 09:00", time: "09:00" },
  { value: "SHIFT_2", label: "Ca 15:30", time: "15:30" },
  { value: "SHIFT_3", label: "Ca 14:30", time: "14:30" },
  { value: "SHIFT_4", label: "Ca 11:00", time: "11:00" },
  { value: "CUSTOM", label: "Tùy chỉnh", time: "" },
];
const getDefaultShift = (employee?: Employee) => {
  const department = getDepartment(employee || ({} as Employee)).trim().toLowerCase();
  // Mặc định nhân viên Bếp vào ca 14:30; các phòng ban khác vào ca 15:30.
  return department === "bếp"
    ? { shiftType: "SHIFT_3" as ShiftType, shiftTime: "14:30" }
    : { shiftType: "SHIFT_2" as ShiftType, shiftTime: "15:30" };
};
const emptySchedule = (
  allowance = 1,
  defaultShift: { shiftType: ShiftType; shiftTime: string } = {
    shiftType: "SHIFT_2",
    shiftTime: "15:30",
  },
): EmployeeSchedule => {
  const weeklySchedule: Record<number, ScheduleDay> = {};
  for (let day = 0; day <= 6; day++) {
    weeklySchedule[day] = {
      // Không tự mặc định ngày nghỉ; người dùng tự chỉnh trạng thái từng ngày.
      status: "WORK",
      shiftType: defaultShift.shiftType,
      shiftTime: defaultShift.shiftTime,
      isWeeklyOff: false,
      note: "",
    };
  }
  return {
    weeklyOffAllowance: allowance,
    monthlyPAllowance: 1,
    weeklySchedule,
    dateOverrides: {},
  };
};
const unwrap = (payload: any): any => {
  let result = payload;
  for (let i = 0; i < 3; i++) {
    if (
      result &&
      !Array.isArray(result) &&
      result.data !== undefined
    ) {
      result = result.data;
    } else {
      break;
    }
  }
  return result;
};
const getList = (payload: any): any[] => {
  const result = unwrap(payload);
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.attendances)) {
    return result.attendances;
  }
  if (Array.isArray(result?.employees)) {
    return result.employees;
  }
  return [];
};
const getEmployeeId = (employee: Employee | string) =>
  typeof employee === "string" ? employee : employee?._id;
const getEmployeeName = (employee: Employee) =>
  employee.name || employee.fullName || "Chưa có tên";
const getEmployeeCode = (employee: Employee) =>
  employee.workInfo?.employeeCode ||
  employee.employeeCode ||
  "";
const getDepartment = (employee: Employee) =>
  employee.workInfo?.department ||
  employee.department ||
  "Chưa phân phòng";
const getPosition = (employee: Employee) =>
  employee.workInfo?.position ||
  employee.position ||
  "";
const formatDate = (date: string) => {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};
const getMonthDays = (month: number, year: number) => {
  return new Date(year, month, 0).getDate();
};
const getPayPeriod = (month: number, year: number) => {
  const start = new Date(year, month - 2, 26);
  const end = new Date(year, month - 1, 25);
  const toISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: toISO(start), end: toISO(end), startDate: start, endDate: end };
};
const getPayPeriodDates = (month: number, year: number) => {
  const period = getPayPeriod(month, year);
  const dates: string[] = [];
  const cursor = new Date(period.startDate);
  while (cursor <= period.endDate) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};
const dateDay = (date: string) => Number(date.slice(8, 10));
const dateWeekday = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
const isInPeriod = (date: string, start: string, end: string) => {
  const normalized = date?.slice(0, 10);
  return Boolean(normalized && normalized >= start && normalized <= end);
};
const getStatusInfo = (status: DayStatus) =>
  STATUS_OPTIONS.find((item) => item.value === status) ||
  STATUS_OPTIONS[0];
const getScheduleFromAttendance = (
  attendance?: Attendance,
): EmployeeSchedule => {
  const fallback = emptySchedule(
    attendance?.workSchedule?.weeklyOffAllowance ?? 1,
  );
  const stored = attendance?.workSchedule;
  if (!stored) return fallback;
  return {
    weeklyOffAllowance:
      stored.weeklyOffAllowance ?? fallback.weeklyOffAllowance,
    monthlyPAllowance:
      stored.monthlyPAllowance ?? fallback.monthlyPAllowance,
    weeklySchedule: {
      ...fallback.weeklySchedule,
      ...(stored.weeklySchedule || {}),
    },
    dateOverrides: stored.dateOverrides || {},
  };
};
export default function AttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    [],
  );
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingDay, setSavingDay] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scheduleByEmployee, setScheduleByEmployee] = useState<
    Record<string, EmployeeSchedule>
  >({});
  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);
  const [draftSchedule, setDraftSchedule] =
    useState<EmployeeSchedule>(emptySchedule());
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [overtimeAttendance, setOvertimeAttendance] =
    useState<Attendance | null>(null);
  const [overtimeDate, setOvertimeDate] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeNote, setOvertimeNote] = useState("");
  const [overtimeSaving, setOvertimeSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"weekly" | "summary" | "attendance" | "overtime">("weekly");
  const [weeklyIndex, setWeeklyIndex] = useState(0);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [yearAttendances, setYearAttendances] = useState<Attendance[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const request = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const method = (options.method || "GET").toUpperCase();
      let body: unknown = undefined;

      if (options.body) {
        try {
          body = JSON.parse(String(options.body));
        } catch {
          body = options.body;
        }
      }

      try {
        let payload: any;

        if (method === "GET") {
          payload = await fetchData(url);
        } else if (method === "POST") {
          payload = await postData(url, body ?? {});
        } else if (method === "PUT") {
          payload = await updateData(url, body ?? {});
        } else if (method === "PATCH") {
          payload = await patchData(url, body ?? {});
        } else if (method === "DELETE") {
          payload = await deleteData(url);
        } else {
          throw new Error(`Phương thức API không được hỗ trợ: ${method}`);
        }

        if (payload?.success === false) {
          throw new Error(payload.message || payload.error || "Yêu cầu thất bại");
        }

        return payload;
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Không thể kết nối API.";
        throw new Error(message);
      }
    },
    [],
  );
  const loadEmployees = useCallback(async () => {
    const payload = await request("/employees");
    const list = getList(payload) as Employee[];
    setEmployees(list);
    setSelectedEmployeeIds((previous) =>
      previous.length
        ? previous.filter((id) =>
            list.some((employee) => employee._id === id),
          )
        : list
            .filter((employee) =>
              ["ACTIVE", "PROBATION", "active", "probation"].includes(
                employee.status || "",
              ),
            )
            .map((employee) => employee._id),
    );
    setScheduleByEmployee((previous) => {
      const next = { ...previous };
      for (const employee of list) {
        if (!next[employee._id]) {
          next[employee._id] = emptySchedule(1, getDefaultShift(employee));
        }
      }
      return next;
    });
  }, [request]);
  const loadAttendances = useCallback(async () => {
    const payload = await request(
      `${API}?month=${month}&year=${year}`,
    );
    setAttendances(getList(payload) as Attendance[]);
  }, [month, year, request]);
  const loadYearAttendances = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const previousMonth = month === 1 ? 12 : month - 1;
      const previousYear = month === 1 ? year - 1 : year;
      const queries = [
        ...Array.from({ length: 12 }, (_, index) => ({ month: index + 1, year: summaryYear })),
        { month: previousMonth, year: previousYear },
      ];
      const results = await Promise.all(
        queries.map(({ month: queryMonth, year: queryYear }) =>
          request(`${API}?month=${queryMonth}&year=${queryYear}`)
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

  useEffect(() => {
    if (activeTab === "summary" || activeTab === "overtime") void loadYearAttendances();
  }, [activeTab, loadYearAttendances]);
  useEffect(() => {
    void loadAttendances();
  }, [month, year, loadAttendances]);

  const deleteAttendance = async (attendance: Attendance) => {
    if (attendance.status === "LOCKED") {
      setErrorMessage("Bảng công đã khóa, không thể xóa.");
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa bảng công tháng ${attendance.month}/${attendance.year} của ${attendance.employeeName}? Thao tác này không thể hoàn tác.`)) return;
    setErrorMessage("");
    setMessage("");
    try {
      await request(`${API}/${attendance._id}`, { method: "DELETE" });
      setMessage(`Đã xóa bảng công của ${attendance.employeeName}.`);
      await Promise.all([loadAttendances(), loadYearAttendances()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Không thể xóa bảng công.");
    }
  };

  const deleteAttendanceMonth = async (monthNumber: number, targetYear: number, rows: Attendance[]) => {
    if (rows.length === 0) return;
    const lockedRows = rows.filter((item) => item.status === "LOCKED");
    if (lockedRows.length > 0) {
      setErrorMessage(`Không thể xóa tháng ${monthNumber}/${targetYear} vì có ${lockedRows.length} bảng công đã khóa. Hãy mở khóa các bảng công trước.`);
      setMessage("");
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc muốn XÓA TOÀN BỘ ${rows.length} bảng công của tháng ${monthNumber}/${targetYear}? Dữ liệu đã xóa không thể khôi phục.`,
    );
    if (!confirmed) return;

    setErrorMessage("");
    setMessage("");
    try {
      for (const attendance of rows) {
        await request(`${API}/${attendance._id}`, { method: "DELETE" });
      }
      setMessage(`Đã xóa toàn bộ ${rows.length} bảng công của tháng ${monthNumber}/${targetYear}.`);
      await Promise.all([loadAttendances(), loadYearAttendances()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? `${error.message} Một số bảng công có thể đã được xóa; hãy tải lại dữ liệu để kiểm tra.` : "Không thể xóa toàn bộ bảng công tháng này. Hãy tải lại dữ liệu để kiểm tra.");
      await Promise.all([loadAttendances(), loadYearAttendances()]);
    }
  };

  const viewAttendanceMonth = (attendance: Attendance) => {
    setMonth(attendance.month);
    setYear(attendance.year);
    setActiveTab("attendance");
  };
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
  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map(getDepartment)
            .filter((department) => department !== "Chưa phân phòng"),
        ),
      ).sort(),
    [employees],
  );
  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const departmentMatches =
        departmentFilter === "all" ||
        getDepartment(employee) === departmentFilter;
      const searchMatches =
        !keyword ||
        getEmployeeName(employee).toLowerCase().includes(keyword) ||
        getEmployeeCode(employee).toLowerCase().includes(keyword);
      return departmentMatches && searchMatches;
    });
  }, [employees, departmentFilter, search]);
  const attendanceMap = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const attendance of attendances) {
      const employeeId = getEmployeeId(attendance.employee);
      if (employeeId) map.set(employeeId, attendance);
    }
    return map;
  }, [attendances]);
  const days = useMemo(() => getPayPeriodDates(month, year), [month, year]);
  const weeklyRanges = useMemo(() => {
    const ranges: string[][] = [];
    let current: string[] = [];
    for (const date of getPayPeriodDates(month, year)) {
      const weekday = dateWeekday(date); // Sunday = 0
      if (current.length && weekday === 1) {
        ranges.push(current);
        current = [];
      }
      current.push(date);
      if (weekday === 0 || date === getPayPeriod(month, year).end) {
        ranges.push(current);
        current = [];
      }
    }
    if (current.length) ranges.push(current);
    return ranges;
  }, [month, year]);
  const selectedWeekDays = weeklyRanges[Math.min(weeklyIndex, Math.max(0, weeklyRanges.length - 1))] || [];
  const weeklyAttendanceRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return attendances
      .filter((item) => {
        const departmentMatches = departmentFilter === "all" || (item.department || (typeof item.employee === "object" ? getDepartment(item.employee) : "")) === departmentFilter;
        const searchMatches = !keyword || item.employeeName.toLowerCase().includes(keyword) || (item.employeeCode || "").toLowerCase().includes(keyword);
        return departmentMatches && searchMatches;
      })
      .sort((a, b) => (a.department || "").localeCompare(b.department || "", "vi") || a.employeeName.localeCompare(b.employeeName, "vi"));
  }, [attendances, departmentFilter, search]);
  useEffect(() => { setWeeklyIndex(0); }, [month, year]);

  const summary = useMemo(() => {
    return attendances.reduce(
      (total, attendance) => {
        const item = attendance.summary || {};
        total.work += item.totalWorkDays || 0;
        total.off += item.totalOffDays || 0;
        total.leave += item.totalPDays || 0;
        total.excessLeave += item.excessPDays || 0;
        total.absent += item.totalAbsentDays || 0;
        total.ot += item.totalPositiveOTHours || 0;
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
    );
  }, [attendances]);
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
      for (const employeeId of selectedEmployeeIds) {
        schedules[employeeId] =
          scheduleByEmployee[employeeId] || emptySchedule(1, getDefaultShift(employees.find((employee) => employee._id === employeeId)));
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
      const createdCount = result?.createdCount ?? 0;
      const skippedCount = result?.skippedCount ?? 0;
      const errorCount = result?.errorCount ?? 0;
      setMessage(
        `Đã tạo ${createdCount} bảng công; bỏ qua ${skippedCount} bảng đã tồn tại; lỗi ${errorCount}.`,
      );
      if (Array.isArray(result?.errors) && result.errors.length) {
        setErrorMessage(
          result.errors
            .map((item: any) =>
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
  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((previous) =>
      previous.includes(employeeId)
        ? previous.filter((id) => id !== employeeId)
        : [...previous, employeeId],
    );
  };
  const toggleVisibleEmployees = () => {
    const visibleIds = filteredEmployees.map((employee) => employee._id);
    const allSelected = visibleIds.every((id) =>
      selectedEmployeeIds.includes(id),
    );
    setSelectedEmployeeIds((previous) =>
      allSelected
        ? previous.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...previous, ...visibleIds])),
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
      weeklySchedule: {
        ...current.weeklySchedule,
      },
      dateOverrides: {
        ...current.dateOverrides,
      },
    });
  };
  const updateDraftDay = (
    day: number,
    patch: Partial<ScheduleDay>,
  ) => {
    setDraftSchedule((previous) => {
      const current = previous.weeklySchedule[day];
      const next = {
        ...current,
        ...patch,
      };
      if (patch.status === "OFF") {
        next.isWeeklyOff = true;
        next.shiftType = null;
        next.shiftTime = null;
      } else if (patch.status) {
        next.isWeeklyOff = false;
      }
      return {
        ...previous,
        weeklySchedule: {
          ...previous.weeklySchedule,
          [day]: next,
        },
      };
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
          Object.entries(draftSchedule.weeklySchedule).map(
            ([day, config]) => [
              day,
              {
                ...config,
                isWeeklyOff: config.status === "OFF",
              },
            ],
          ),
        ) as Record<number, ScheduleDay>,
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
      setScheduleByEmployee((previous) => ({
        ...previous,
        [editingEmployee._id]: schedule,
      }));
      setEditingEmployee(null);
      if (attendance) {
        await loadAttendances();
      }
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
  ) => {
    if (attendance.status === "LOCKED") {
      setErrorMessage("Bảng công đã khóa, không thể sửa.");
      return;
    }
    setSavingDay(`${attendance._id}-${record.date}`);
    setErrorMessage("");
    setMessage("");
    try {
      const shift = SHIFTS.find(
        (item) => item.value === record.shiftType,
      );
      const shiftTime =
        status === "WORK"
          ? record.shiftTime || shift?.time || "15:30"
          : null;
      const shiftType =
        status === "WORK"
          ? record.shiftType || "SHIFT_2"
          : null;
      await request(`${API}/${attendance._id}/day`, {
        method: "PUT",
        body: JSON.stringify({
          date: record.date,
          status,
          shiftTime,
          shiftType,
          isWeeklyOff: status === "OFF",
          note: record.note || "",
        }),
      });
      setMessage(`Đã cập nhật ngày ${formatDate(record.date)}.`);
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
      setMessage(`Đã cập nhật trạng thái bảng công.`);
      await loadAttendances();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái bảng công.",
      );
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
        error instanceof Error
          ? error.message
          : "Không thể thêm OT.",
      );
    } finally {
      setOvertimeSaving(false);
    }
  };
  const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const inputClass =
    "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <CalendarCheck className="h-4 w-4" />
            <span>Nhân sự</span>
            <span>/</span>
            <span className="text-blue-700">Chấm công</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quản lý chấm công
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi ngày công, lịch phân ca, nghỉ phép và tăng ca.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPage()}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Làm mới
        </button>
      </div>
      {/* FILTERS */}
      <section className={`${cardClass} p-4`}>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Tháng
            </label>
            <select
              className={inputClass}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Năm
            </label>
            <select
              className={inputClass}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {Array.from({ length: 7 }, (_, index) => now.getFullYear() - 3 + index).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Phòng ban
            </label>
            <select
              className={inputClass}
              value={departmentFilter}
              onChange={(event) =>
                setDepartmentFilter(event.target.value)
              }
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">
              Tìm nhân viên
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Tên hoặc mã nhân viên"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>
      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          {
            label: "Nhân viên có bảng công",
            value: attendances.length,
            icon: Users,
            color: "text-blue-700 bg-blue-50",
          },
          {
            label: "Tổng ngày đi làm",
            value: summary.work,
            icon: CalendarCheck,
            color: "text-emerald-700 bg-emerald-50",
          },
          {
            label: "Ngày nghỉ phép P",
            value: summary.leave,
            icon: CalendarDays,
            color: "text-amber-700 bg-amber-50",
          },
          {
            label: "Phép vượt định mức",
            value: summary.excessLeave,
            icon: CircleAlert,
            color: "text-rose-700 bg-rose-50",
          },
          {
            label: "Giờ tăng ca",
            value: `${summary.ot.toFixed(1)}h`,
            icon: Clock3,
            color: "text-violet-700 bg-violet-50",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`${cardClass} p-4`}
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>
      {/* FEEDBACK */}
      {message && (
        <div className="whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="whitespace-pre-wrap rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}
      {/* TABS */}
      <style>{`@media print { body * { visibility: hidden !important; } .weekly-print-area, .weekly-print-area * { visibility: visible !important; } .weekly-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; box-shadow: none !important; border: 0 !important; } .weekly-no-print { display: none !important; } @page { size: landscape; margin: 8mm; } }`}</style>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "summary" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Tổng hợp</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("weekly")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "weekly" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
        >
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Lịch tuần</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attendance")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "attendance"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Bảng chấm công
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("overtime")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "overtime"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Thống kê OT & AL
        </button>
      </div>
      {/* WEEKLY STAFF SCHEDULE TAB */}
      {activeTab === "weekly" && (
        <section className={`${cardClass} weekly-print-area overflow-hidden`}>
          <div className="weekly-no-print flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Lịch làm việc theo tuần</h2>
              <p className="mt-1 text-xs text-slate-500">Bản gọn để Captain chụp màn hình hoặc in gửi nhân sự nắm lịch tuần sau.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs font-semibold text-slate-500">Tháng
                <select className={`${inputClass} mt-1 min-w-32`} value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">Năm
                <select className={`${inputClass} mt-1 min-w-24`} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {Array.from({ length: 7 }, (_, index) => now.getFullYear() - 3 + index).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">Tuần
                <select className={`${inputClass} mt-1 min-w-36`} value={weeklyIndex} onChange={(event) => setWeeklyIndex(Number(event.target.value))}>
                  {weeklyRanges.map((range, index) => <option key={index} value={index}>Tuần {index + 1}: {formatDate(range[0])} – {formatDate(range[range.length - 1])}</option>)}
                </select>
              </label>
              <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><Eye className="h-4 w-4" /> In / Lưu PDF</button>
            </div>
          </div>
          <div className="p-3 sm:p-5">
            <div className="mb-3 text-center">
              <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">LỊCH LÀM VIỆC NHÂN SỰ</h2>
              <p className="mt-1 text-sm font-semibold text-slate-700">Tuần {weeklyIndex + 1}: {selectedWeekDays.length ? `${formatDate(selectedWeekDays[0])} – ${formatDate(selectedWeekDays[selectedWeekDays.length - 1])}` : ""}</p>
            </div>
            {loading ? <div className="p-8 text-center text-sm text-slate-500">Đang tải lịch...</div> : weeklyAttendanceRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Tháng {month}/{year} chưa có bảng công. Hãy tạo bảng công ở tab “Bảng chấm công” trước nhé.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-center text-xs text-slate-900">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-2 py-2">STT</th>
                      <th rowSpan={2} className="min-w-40 border border-slate-500 bg-slate-100 px-2 py-2 text-left">TÊN NHÂN VIÊN</th>
                      <th rowSpan={2} className="min-w-28 border border-slate-500 bg-slate-100 px-2 py-2">CHỨC VỤ</th>
                      {selectedWeekDays.map((date) => <th key={date} className="min-w-16 border border-slate-500 bg-emerald-700 px-2 py-2 font-bold text-white">{formatDate(date).slice(0, 5)}</th>)}
                    </tr>
                    <tr>
                      {selectedWeekDays.map((date) => {
                        const weekday = dateWeekday(date);
                        const names = ["CHỦ NHẬT", "THỨ HAI", "THỨ BA", "THỨ TƯ", "THỨ NĂM", "THỨ SÁU", "THỨ BẢY"];
                        const colors = ["bg-rose-100", "bg-slate-50", "bg-slate-50", "bg-slate-50", "bg-slate-50", "bg-slate-50", "bg-emerald-100"];
                        return <th key={date} className={`border border-slate-500 px-1 py-2 font-semibold ${colors[weekday]}`}>{names[weekday]}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyAttendanceRows.map((attendance, index) => (
                      <tr key={attendance._id}>
                        <td className="border border-slate-500 px-2 py-2 italic">{index + 1}</td>
                        <td className="border border-slate-500 px-2 py-2 text-left font-semibold italic">{attendance.employeeName}</td>
                        <td className="border border-slate-500 px-2 py-2 italic">{attendance.position || (typeof attendance.employee === "object" ? getPosition(attendance.employee) : "") || ""}</td>
                        {selectedWeekDays.map((date) => {
                          const record = attendance.dailyRecords?.find((item) => item.date === date);
                          let label = "—";
                          let color = "text-slate-400";
                          if (record) {
                            if (record.status === "OFF") { label = "OFF"; color = "font-bold text-emerald-600"; }
                            else if (record.status === "P") { label = "P"; color = "font-bold text-blue-700"; }
                            else if (record.status === "ABSENT") { label = "VẮNG"; color = "font-bold text-rose-600"; }
                            else if (record.status === "HOLIDAY") { label = "LỄ"; color = "font-bold text-violet-600"; }
                            else {
                              if (record.shiftType === "CUSTOM" && record.shiftTime) label = record.shiftTime;
                              else if (record.shiftTime) {
                                const [hourText, minuteText] = record.shiftTime.split(":");
                                const hour = Number(hourText);
                                const minute = Number(minuteText);
                                label = `PM${hour % 12 || 12}.${Math.floor(minute / 10)}`;
                              } else label = record.shiftType ? (SHIFTS.find((shift) => shift.value === record.shiftType)?.label || "X") : "X";
                              color = "font-bold italic text-slate-900";
                            }
                          }
                          return <td key={date} className={`border border-slate-500 px-2 py-2 ${color}`}>{label}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-600">
              <span><b>OFF</b>: Nghỉ tuần</span><span><b>P</b>: Nghỉ phép</span><span><b>VẮNG</b>: Vắng mặt</span><span><b>LỄ</b>: Ngày lễ</span><span>PM = Ca làm việc</span>
            </div>
          </div>
        </section>
      )}

      {/* SUMMARY TAB */}
      {activeTab === "summary" && (
        <section className={cardClass}>
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Tổng hợp chấm công theo tháng</h2>
              <p className="mt-1 text-xs text-slate-500">Chọn tháng để xem chi tiết bảng chấm công tương ứng.</p>
            </div>
            <select className={inputClass + " sm:max-w-40"} value={summaryYear} onChange={(event) => setSummaryYear(Number(event.target.value))}>
              {Array.from({ length: 7 }, (_, index) => now.getFullYear() - 3 + index).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          {summaryLoading ? (
            <div className="p-8 text-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Đang tổng hợp dữ liệu...</div>
          ) : yearAttendances.filter((item) => item.year === summaryYear).length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
              <h3 className="font-semibold text-slate-800">Chưa có bảng công trong năm {summaryYear}</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Chỉ những tháng đã tạo bảng công mới xuất hiện tại đây. Hãy vào tab Bảng chấm công để tạo bảng công cho tháng cần quản lý.
              </p>
              <button
                type="button"
                onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); setActiveTab("attendance"); }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Tạo bảng công
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>
                  <th className="px-4 py-3">Tháng</th><th className="px-4 py-3 text-right">Số bảng công</th><th className="px-4 py-3 text-right">Ngày đi làm</th><th className="px-4 py-3 text-right">Ngày nghỉ</th><th className="px-4 py-3 text-right">Ngày phép P</th><th className="px-4 py-3 text-right">Vắng mặt</th><th className="px-4 py-3 text-right">Tổng OT</th><th className="px-4 py-3 text-right">Thao tác</th>
                </tr></thead>
                <tbody>
                  {MONTHS.map((monthName, index) => {
                    const monthNumber = index + 1;
                    const rows = yearAttendances.filter((item) => item.month === monthNumber && item.year === summaryYear);
                    if (rows.length === 0) return null;
                    const totals = rows.reduce((acc, item) => {
                      acc.work += item.summary?.totalWorkDays || 0;
                      acc.off += item.summary?.totalOffDays || 0;
                      acc.leave += item.summary?.totalPDays || 0;
                      acc.absent += item.summary?.totalAbsentDays || 0;
                      acc.ot += item.summary?.totalOTHours || 0;
                      return acc;
                    }, { work: 0, off: 0, leave: 0, absent: 0, ot: 0 });
                    return <tr key={monthNumber} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">{monthName} {summaryYear}</td>
                      <td className="px-4 py-3 text-right">{rows.length}</td><td className="px-4 py-3 text-right">{totals.work}</td><td className="px-4 py-3 text-right">{totals.off}</td><td className="px-4 py-3 text-right">{totals.leave}</td><td className="px-4 py-3 text-right">{totals.absent}</td><td className="px-4 py-3 text-right">{totals.ot.toFixed(1)}h</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setMonth(monthNumber); setYear(summaryYear); setActiveTab("attendance"); }} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Eye className="h-3.5 w-3.5" /> Xem chi tiết</button>
                          <button type="button" onClick={() => void deleteAttendanceMonth(monthNumber, summaryYear, rows)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Xóa tháng</button>
                        </div>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === "attendance" && (
        <section className={cardClass}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold text-slate-900">
                Bảng công tháng {month}/{year}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Chọn nhân viên rồi tạo bảng công. Nhấn vào từng ô để
                chỉnh sửa trạng thái ngày.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating || loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tạo bảng công đã chọn ({selectedEmployeeIds.length})
            </button>
          </div>
          {/* EMPLOYEE SELECTION */}
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    filteredEmployees.length > 0 &&
                    filteredEmployees.every((employee) =>
                      selectedEmployeeIds.includes(employee._id),
                    )
                  }
                  onChange={toggleVisibleEmployees}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                Chọn tất cả nhân viên đang lọc
              </label>
              <span className="text-xs text-slate-500">
                {filteredEmployees.length} nhân viên
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredEmployees.map((employee) => (
                <label
                  key={employee._id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                    selectedEmployeeIds.includes(employee._id)
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.includes(employee._id)}
                    onChange={() => toggleEmployee(employee._id)}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                  <span className="max-w-44 truncate">
                    {getEmployeeName(employee)}
                  </span>
                  <button
                    type="button"
                    title="Thiết lập lịch làm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openScheduleEditor(employee);
                    }}
                    className="ml-1 rounded-md p-1 hover:bg-blue-100"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </label>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Đang tải dữ liệu...
            </div>
          ) : attendances.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <CalendarDays className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-slate-900">
                Chưa có bảng công kỳ này
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Chọn nhân viên, cấu hình lịch phân ca rồi nhấn
                “Tạo bảng công đã chọn”.
              </p>
            </div>
          ) : (
            <div className="max-h-[680px] overflow-auto">
              <table className="min-w-max border-collapse text-left text-xs">
                <thead className="sticky top-0 z-20 bg-slate-50">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-12 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-center">
                      STT
                    </th>
                    <th className="sticky left-12 z-30 min-w-52 border-b border-r border-slate-200 bg-slate-50 px-3 py-3">
                      Nhân viên
                    </th>
                    {days.map((date) => {
                      const weekday = dateWeekday(date);
                      const isWeekend = weekday === 0 || weekday === 6;
                      return (
                        <th
                          key={date}
                          className={`min-w-14 border-b border-r border-slate-200 px-1 py-2 text-center ${
                            isWeekend ? "bg-blue-50/80" : ""
                          }`}
                        >
                          <div className="font-bold text-slate-800">
                            {dateDay(date)}
                          </div>
                          <div className="text-[9px] text-slate-400">{String(date.slice(5, 7))}/{date.slice(0, 4)}</div>
                          <div className="mt-1 text-[10px] font-normal text-slate-500">
                            {WEEKDAYS[weekday]}
                          </div>
                        </th>
                      );
                    })}
                    <th className="min-w-16 border-b border-r border-slate-200 px-2 py-3 text-center">
                      Công
                    </th>
                    <th className="min-w-16 border-b border-r border-slate-200 px-2 py-3 text-center">
                      P vượt
                    </th>
                    <th className="min-w-16 border-b border-r border-slate-200 px-2 py-3 text-center">
                      OT
                    </th>
                    <th className="sticky right-0 z-30 min-w-48 border-b border-slate-200 bg-slate-50 px-3 py-3">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendances
                    .filter((attendance) => {
                      const employeeId = getEmployeeId(
                        attendance.employee,
                      );
                      const employee =
                        employees.find((item) => item._id === employeeId);
                      if (!employee) {
                        return (
                          departmentFilter === "all" ||
                          attendance.department === departmentFilter
                        );
                      }
                      const matchesDepartment =
                        departmentFilter === "all" ||
                        getDepartment(employee) === departmentFilter;
                      const keyword = search.trim().toLowerCase();
                      const matchesSearch =
                        !keyword ||
                        attendance.employeeName
                          .toLowerCase()
                          .includes(keyword) ||
                        (attendance.employeeCode || "")
                          .toLowerCase()
                          .includes(keyword);
                      return matchesDepartment && matchesSearch;
                    })
                    .map((attendance, index) => {
                      const recordMap = new Map(
                        attendance.dailyRecords.map((record) => [
                          record.date,
                          record,
                        ]),
                      );
                      return (
                        <tr
                          key={attendance._id}
                          className="hover:bg-blue-50/30"
                        >
                          <td className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white px-3 py-2 text-center text-slate-500">
                            {index + 1}
                          </td>
                          <td className="sticky left-12 z-10 border-b border-r border-slate-100 bg-white px-3 py-2">
                            <div className="font-semibold text-slate-800">
                              {attendance.employeeName}
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500">
                              {attendance.employeeCode || "Chưa có mã"}
                              {" · "}
                              {attendance.department || "Chưa phân phòng"}
                            </div>
                          </td>
                          {days.map((date) => {
                            const record = recordMap.get(date);
                            if (!record) {
                              return (
                                <td
                                  key={date}
                                  className="border-b border-r border-slate-100 px-1 py-2 text-center text-slate-300"
                                >
                                  —
                                </td>
                              );
                            }
                            const info = getStatusInfo(record.status);
                            const isSaving =
                              savingDay ===
                              `${attendance._id}-${record.date}`;
                            return (
                              <td
                                key={date}
                                className="border-b border-r border-slate-100 px-1 py-1.5 text-center"
                              >
                                <div className="group relative flex flex-col items-center gap-1">
                                  <select
                                    aria-label={`${attendance.employeeName} ngày ${date}`}
                                    value={record.status}
                                    disabled={
                                      attendance.status === "LOCKED" ||
                                      isSaving
                                    }
                                    onChange={(event) =>
                                      void updateDay(
                                        attendance,
                                        record,
                                        event.target.value as DayStatus,
                                      )
                                    }
                                    className={`w-12 cursor-pointer appearance-none rounded-md px-0.5 py-1.5 text-center text-[10px] font-bold outline-none ring-blue-200 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${info.className}`}
                                  >
                                    {STATUS_OPTIONS.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.short}
                                      </option>
                                    ))}
                                  </select>
                                  {record.status === "WORK" &&
                                    record.shiftTime && (
                                      <span className="text-[9px] text-slate-500">
                                        {record.shiftTime}
                                      </span>
                                    )}
                                  {isSaving && (
                                    <LoaderCircle className="absolute -right-1 -top-1 h-3 w-3 animate-spin text-blue-600" />
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center font-bold text-slate-800">
                            {attendance.summary?.totalWorkDays ?? 0}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center font-semibold text-rose-600">
                            {attendance.summary?.excessPDays ?? 0}
                          </td>
                          <td className="border-b border-r border-slate-100 px-2 py-2 text-center font-semibold text-violet-700">
                            {(
                              attendance.summary?.totalOTHours ?? 0
                            ).toFixed(1)}
                          </td>
                          <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-2 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const employeeId = getEmployeeId(
                                    attendance.employee,
                                  );
                                  const employee = employees.find(
                                    (item) => item._id === employeeId,
                                  );
                                  if (employee) {
                                    openScheduleEditor(employee);
                                  } else {
                                    setErrorMessage(
                                      "Không tìm thấy hồ sơ nhân viên để sửa lịch.",
                                    );
                                  }
                                }}
                                disabled={attendance.status === "LOCKED"}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                              >
                                <Settings2 className="h-3 w-3" />
                                Lịch
                              </button>
                              <button
                                type="button"
                                onClick={() => openOvertime(attendance)}
                                disabled={attendance.status === "LOCKED"}
                                className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2 py-1.5 font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                              >
                                <Clock3 className="h-3 w-3" />
                                OT
                              </button>
                              {attendance.status === "DRAFT" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void changeSheetStatus(
                                      attendance,
                                      "CONFIRMED",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 font-medium text-white hover:bg-blue-700"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Xác nhận
                                </button>
                              )}
                              {attendance.status === "CONFIRMED" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void changeSheetStatus(
                                      attendance,
                                      "LOCKED",
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1.5 font-medium text-white hover:bg-slate-900"
                                >
                                  <LockKeyhole className="h-3 w-3" />
                                  Khóa
                                </button>
                              )}
                              {attendance.status === "LOCKED" && (
                                <button
                                  type="button"
                                  onClick={() => void changeSheetStatus(attendance, "CONFIRMED")}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 font-medium text-amber-800 hover:bg-amber-100"
                                  title="Mở khóa để chỉnh sửa bảng công"
                                >
                                  <LockKeyhole className="h-3 w-3" />
                                  Mở khóa
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void deleteAttendance(attendance)}
                                disabled={attendance.status === "LOCKED"}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1.5 font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Xóa bảng công"
                              >
                                <Trash2 className="h-3 w-3" /> Xóa
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
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 px-4 py-3">
            {STATUS_OPTIONS.map((item) => (
              <div
                key={item.value}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <span
                  className={`rounded-md px-2 py-1 font-bold ${item.className}`}
                >
                  {item.short}
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </section>
      )}
      {/* OVERTIME TAB */}
      {activeTab === "overtime" && (
        <section className={cardClass}>
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">
              Thống kê OT & AL — {formatDate(getPayPeriod(month, year).start)} đến {formatDate(getPayPeriod(month, year).end)}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Kỳ công từ ngày 26 tháng trước đến hết ngày 25 tháng chọn. OFF ca không cộng dồn; AL chưa dùng được chuyển sang kỳ công tiếp theo.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="text-xs font-semibold text-slate-500">Tháng thống kê
                <select className={`${inputClass} mt-1 min-w-32`} value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">Năm
                <select className={`${inputClass} mt-1 min-w-24`} value={year} onChange={(event) => { const value = Number(event.target.value); setYear(value); setSummaryYear(value); }}>
                  {Array.from({ length: 7 }, (_, index) => now.getFullYear() - 3 + index).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </div>
          ) : attendances.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chưa có bảng công để quản lý OT.
            </div>
          ) : (
            <>
            <div className="overflow-x-auto border-b border-slate-200">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>
                  <th className="px-4 py-3">Nhân viên</th><th className="px-4 py-3">Phòng ban</th>
                  <th className="px-4 py-3 text-right">OFF định mức</th><th className="px-4 py-3 text-right">OFF đã dùng</th><th className="px-4 py-3 text-right">OFF còn lại</th>
                  <th className="px-4 py-3 text-right">AL tồn đầu tháng</th><th className="px-4 py-3 text-right">AL phát sinh</th><th className="px-4 py-3 text-right">AL đã dùng</th><th className="px-4 py-3 text-right">AL còn lại chuyển tháng sau</th>
                </tr></thead>
                <tbody>
                  {Array.from(new Map(yearAttendances.filter((item) => {
                    const period = getPayPeriod(month, year);
                    return item.dailyRecords.some((day) => isInPeriod(day.date, period.start, period.end)) || (item.year === year && item.month === month) || (item.year === period.startDate.getFullYear() && item.month === period.startDate.getMonth() + 1);
                  }).map((item) => [getEmployeeId(item.employee), item])).values()).map((attendance) => {
                    const period = getPayPeriod(month, year);
                    const employeeId = getEmployeeId(attendance.employee);
                    const employeeSheets = yearAttendances.filter((item) => getEmployeeId(item.employee) === employeeId);
                    const periodDays = employeeSheets.flatMap((item) => item.dailyRecords.filter((day) => isInPeriod(day.date, period.start, period.end)));
                    const history = employeeSheets.filter((item) => item.dailyRecords.some((day) => day.date < period.start)).sort((a, b) => a.year - b.year || a.month - b.month);
                    const carryIn = history.reduce((carry, item) => {
                      const allowance = item.workSchedule?.monthlyPAllowance ?? 1;
                      const used = item.dailyRecords.filter((day) => day.date < period.start && day.status === "P").length;
                      return Math.max(0, carry + allowance - used);
                    }, 0);
                    const pAllowance = attendance.workSchedule?.monthlyPAllowance ?? 1;
                    const pUsed = periodDays.filter((day) => day.status === "P").length;
                    const alRemaining = Math.max(0, carryIn + pAllowance - pUsed);
                    const periodWeeks = Math.ceil((period.endDate.getTime() - period.startDate.getTime() + 86400000) / (7 * 86400000));
                    const offAllowance = (attendance.workSchedule?.weeklyOffAllowance ?? 0) * periodWeeks;
                    const offUsed = periodDays.filter((day) => day.status === "OFF").length;
                    return <tr key={`leave-${attendance._id}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{attendance.employeeName}<div className="mt-1 text-xs text-slate-400">{attendance.employeeCode || ""}</div></td>
                      <td className="px-4 py-3 text-slate-600">{attendance.department || "—"}</td>
                      <td className="px-4 py-3 text-right">{offAllowance}</td><td className="px-4 py-3 text-right">{offUsed}</td><td className={`px-4 py-3 text-right font-semibold ${offAllowance - offUsed < 0 ? "text-rose-600" : "text-slate-800"}`}>{offAllowance - offUsed}</td>
                      <td className="px-4 py-3 text-right">{carryIn}</td><td className="px-4 py-3 text-right">{pAllowance}</td><td className="px-4 py-3 text-right">{pUsed}</td><td className="px-4 py-3 text-right font-bold text-emerald-700">{alRemaining}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <div className="px-4 pt-4 text-sm font-semibold text-slate-800">Chi tiết OT và giờ về sớm</div>
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nhân viên</th>
                    <th className="px-4 py-3">Phòng ban</th>
                    <th className="px-4 py-3">Ghi chú OT</th>
                    <th className="px-4 py-3 text-right">
                      OT tăng ca
                    </th>
                    <th className="px-4 py-3 text-right">
                      Giờ về sớm
                    </th>
                    <th className="px-4 py-3 text-right">
                      Tổng ròng
                    </th>
                    <th className="px-4 py-3 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Map(yearAttendances.filter((item) => item.overtimeEntries?.some((entry) => isInPeriod(entry.date, getPayPeriod(month, year).start, getPayPeriod(month, year).end)) || (item.year === year && item.month === month)).map((item) => [getEmployeeId(item.employee), item])).values()).map((attendance) => {
                    const period = getPayPeriod(month, year);
                    const entries = (yearAttendances.filter((item) => getEmployeeId(item.employee) === getEmployeeId(attendance.employee)).flatMap((item) => item.overtimeEntries || [])).filter((entry) => isInPeriod(entry.date, period.start, period.end));
                    const positive = entries.reduce(
                      (sum, entry) =>
                        sum + Math.max(0, entry.hours),
                      0,
                    );
                    const negative = entries.reduce(
                      (sum, entry) =>
                        sum + Math.max(0, -entry.hours),
                      0,
                    );
                    return (
                      <tr
                        key={attendance._id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {attendance.employeeName}
                          <div className="mt-1 text-xs text-slate-400">
                            {attendance.employeeCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {attendance.department || "—"}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                          {entries.length ? (
                            <div className="space-y-2">
                              {entries.map((entry) => (
                                <div key={entry._id} className="rounded-md bg-slate-50 p-2">
                                  <div className="font-semibold text-slate-700">{formatDate(entry.date)} · {entry.hours > 0 ? `+${entry.hours}h tăng ca` : `${entry.hours}h về sớm`}</div>
                                  <div className="mt-1 whitespace-pre-wrap">{entry.note?.trim() || "Không có ghi chú"}</div>
                                </div>
                              ))}
                            </div>
                          ) : "Chưa có khoản OT"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          +{positive.toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-rose-600">
                          -{negative.toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {(positive - negative).toFixed(1)}h
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openOvertime(attendance)}
                            disabled={attendance.status === "LOCKED"}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Thêm OT
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      )}
      {/* SCHEDULE MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Thiết lập lịch phân ca
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getEmployeeName(editingEmployee)}
                  {" · "}
                  {getEmployeeCode(editingEmployee) || "Chưa có mã"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    Số ngày nghỉ tuần
                  </label>
                  <select
                    className={inputClass}
                    value={draftSchedule.weeklyOffAllowance}
                    onChange={(event) => {
                      const allowance = Number(event.target.value);
                      setDraftSchedule((previous) => ({
                        ...previous,
                        weeklyOffAllowance: allowance,
                      }));
                    }}
                  >
                    <option value={1}>
                      1 ngày / tuần — Nhân viên thường
                    </option>
                    <option value={2}>
                      2 ngày / tuần — Nhân viên văn phòng
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                    Định mức phép P trong tháng
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    className={inputClass}
                    value={draftSchedule.monthlyPAllowance}
                    onChange={(event) =>
                      setDraftSchedule((previous) => ({
                        ...previous,
                        monthlyPAllowance: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Lịch làm theo thứ trong tuần
                </h3>
                <p className="mb-3 text-xs text-slate-500">
                  Chọn trạng thái cho từng thứ và giờ bắt đầu ca. Những
                  ngày OFF không bị tính là ngày phép P.
                </p>
                <div className="space-y-2">
                  {WEEKDAYS.map((weekday, day) => {
                    const config =
                      draftSchedule.weeklySchedule[day] || {
                        status: "WORK" as DayStatus,
                        shiftType: getDefaultShift(editingEmployee || undefined).shiftType,
                        shiftTime: getDefaultShift(editingEmployee || undefined).shiftTime,
                        isWeeklyOff: false,
                        note: "",
                      };
                    const selectedShift =
                      SHIFTS.find(
                        (shift) =>
                          shift.value === config.shiftType,
                      ) || SHIFTS[4];
                    return (
                      <div
                        key={day}
                        className="grid items-center gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[70px_140px_1fr]"
                      >
                        <div className="font-semibold text-slate-700">
                          {weekday === "CN" ? "Chủ nhật" : `Thứ ${day + 1}`}
                        </div>
                        <select
                          className={inputClass}
                          value={config.status}
                          onChange={(event) =>
                            updateDraftDay(day, {
                              status: event.target.value as DayStatus,
                            })
                          }
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {config.status === "WORK" ? (
                          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                            <select
                              className={inputClass}
                              value={
                                selectedShift.value === "CUSTOM"
                                  ? "CUSTOM"
                                  : selectedShift.value
                              }
                              onChange={(event) => {
                                const shift = SHIFTS.find(
                                  (item) =>
                                    item.value === event.target.value,
                                );
                                if (!shift) return;
                                updateDraftDay(day, {
                                  shiftType: shift.value as ShiftType,
                                  shiftTime:
                                    shift.value === "CUSTOM"
                                      ? config.shiftTime || getDefaultShift(editingEmployee || undefined).shiftTime
                                      : shift.time,
                                });
                              }}
                            >
                              {SHIFTS.map((shift) => (
                                <option
                                  key={shift.value}
                                  value={shift.value}
                                >
                                  {shift.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="time"
                              className={inputClass}
                              value={config.shiftTime || getDefaultShift(editingEmployee || undefined).shiftTime}
                              onChange={(event) =>
                                updateDraftDay(day, {
                                  shiftType: "CUSTOM",
                                  shiftTime: event.target.value,
                                })
                              }
                            />
                          </div>
                        ) : (
                          <input
                            className={`${inputClass} bg-slate-50`}
                            disabled
                            value={
                              config.status === "OFF"
                                ? "Ngày nghỉ tuần"
                                : config.status === "P"
                                  ? "Nghỉ phép"
                                  : config.status === "HOLIDAY"
                                    ? "Ngày lễ"
                                    : "Vắng mặt"
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                <strong>Lưu ý:</strong> Với bảng công đã tạo, lưu lịch
                phân ca chỉ cập nhật cấu hình lịch. Các ô chấm công của
                tháng hiện tại không tự thay đổi để tránh ghi đè dữ liệu
                đã chỉnh sửa.
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void saveSchedule()}
                disabled={scheduleSaving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {scheduleSaving && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Lưu lịch làm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* OVERTIME MODAL */}
      {overtimeAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Thêm giờ OT
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {overtimeAttendance.employeeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOvertimeAttendance(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Ngày
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={overtimeDate}
                  min={getPayPeriod(month, year).start}
                  max={getPayPeriod(month, year).end}
                  onChange={(event) =>
                    setOvertimeDate(event.target.value)
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Số giờ
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="-24"
                  max="24"
                  className={inputClass}
                  placeholder="Ví dụ: 2 hoặc -1.5"
                  value={overtimeHours}
                  onChange={(event) =>
                    setOvertimeHours(event.target.value)
                  }
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Số dương là tăng ca. Số âm là giờ về sớm.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  className={`${inputClass} h-auto py-2`}
                  placeholder="Lý do hoặc thông tin bổ sung..."
                  value={overtimeNote}
                  onChange={(event) =>
                    setOvertimeNote(event.target.value)
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setOvertimeAttendance(null)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void addOvertime()}
                disabled={overtimeSaving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {overtimeSaving && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Lưu OT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

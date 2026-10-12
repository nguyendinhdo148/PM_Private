// hr/attendance/types/attendance.ts
export type DayStatus = "WORK" | "P" | "ABSENT" | "HOLIDAY" | "OFF";
export type SheetStatus = "DRAFT" | "CONFIRMED" | "LOCKED";
export type ShiftType = "SHIFT_1" | "SHIFT_2" | "SHIFT_3" | "SHIFT_4" | "CUSTOM";

export type ScheduleDay = {
  status: DayStatus;
  shiftType: ShiftType | null;
  shiftTime: string | null;
  isWeeklyOff: boolean;
  note: string;
};

export type EmployeeSchedule = {
  weeklyOffAllowance: number;
  monthlyPAllowance: number;
  weeklySchedule: Record<number, ScheduleDay>;
  dateOverrides: Record<string, Partial<ScheduleDay>>;
};

export type Employee = {
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

export type AttendanceDay = {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  status: DayStatus;
  shiftType: ShiftType | null;
  shiftTime: string | null;
  isWeeklyOff?: boolean;
  note?: string;
};

export type OvertimeEntry = {
  _id: string;
  date: string;
  hours: number;
  note?: string;
};

export type Attendance = {
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

export const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export const STATUS_OPTIONS: {
  value: DayStatus;
  label: string;
  short: string;
  className: string;
}[] = [
  { value: "WORK",    label: "Đi làm",     short: "X",   className: "bg-emerald-50 text-emerald-700" },
  { value: "OFF",     label: "Nghỉ tuần",  short: "OFF", className: "bg-slate-100 text-slate-600" },
  { value: "P",       label: "Nghỉ phép",  short: "P",   className: "bg-amber-50 text-amber-700" },
  { value: "ABSENT",  label: "Vắng mặt",   short: "A",   className: "bg-rose-50 text-rose-700" },
  { value: "HOLIDAY", label: "Ngày lễ",    short: "L",   className: "bg-violet-50 text-violet-700" },
];

export const SHIFTS: { value: string; label: string; time: string }[] = [
  { value: "SHIFT_1", label: "Ca 09:00", time: "09:00" },
  { value: "SHIFT_2", label: "Ca 15:30", time: "15:30" },
  { value: "SHIFT_3", label: "Ca 14:30", time: "14:30" },
  { value: "SHIFT_4", label: "Ca 11:00", time: "11:00" },
  { value: "CUSTOM",  label: "Tùy chỉnh", time: "" },
];

/* ============ Helpers ============ */

export const getEmployeeId = (employee: Employee | string) =>
  typeof employee === "string" ? employee : employee?._id;

export const getEmployeeName = (employee: Employee) =>
  employee.name || employee.fullName || "Chưa có tên";

export const getEmployeeCode = (employee: Employee) =>
  employee.workInfo?.employeeCode || employee.employeeCode || "";

export const getDepartment = (employee: Employee) =>
  employee.workInfo?.department || employee.department || "Chưa phân phòng";

export const getPosition = (employee: Employee) =>
  employee.workInfo?.position || employee.position || "";

export const getDefaultShift = (employee?: Employee) => {
  const department = getDepartment(employee || ({} as Employee))
    .trim()
    .toLowerCase();

  // Customize theo phòng ban
  if (department === "bếp") {
    return { shiftType: "SHIFT_3" as ShiftType, shiftTime: "14:30" };
  }
  if (["cashier", "thu ngân", "thu ngan"].includes(department)) {
    return { shiftType: "SHIFT_1" as ShiftType, shiftTime: "09:00" };
  }
  if (department === "bar") {
    return { shiftType: "SHIFT_2" as ShiftType, shiftTime: "15:30" };
  }
  if (department === "phục vụ") {
    return { shiftType: "SHIFT_2" as ShiftType, shiftTime: "15:30" };
  }

  // Fallback
  return { shiftType: "SHIFT_2" as ShiftType, shiftTime: "15:30" };
};

export const emptySchedule = (
  allowance = 1,
  defaultShift: { shiftType: ShiftType; shiftTime: string } = {
    shiftType: "SHIFT_2",
    shiftTime: "15:30",
  },
): EmployeeSchedule => {
  const weeklySchedule: Record<number, ScheduleDay> = {};
  for (let day = 0; day <= 6; day++) {
    weeklySchedule[day] = {
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

export const unwrap = (payload: any): any => {
  let result = payload;
  for (let i = 0; i < 3; i++) {
    if (result && !Array.isArray(result) && result.data !== undefined) result = result.data;
    else break;
  }
  return result;
};

export const getList = (payload: any): any[] => {
  const result = unwrap(payload);
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.attendances)) return result.attendances;
  if (Array.isArray(result?.employees)) return result.employees;
  return [];
};

export const formatDate = (date: string) => {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

export const getPayPeriod = (month: number, year: number) => {
  const start = new Date(year, month - 2, 26);
  const end = new Date(year, month - 1, 25);
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: toISO(start), end: toISO(end), startDate: start, endDate: end };
};

export const getPayPeriodDates = (month: number, year: number) => {
  const period = getPayPeriod(month, year);
  const dates: string[] = [];
  const cursor = new Date(period.startDate);
  while (cursor <= period.endDate) {
    dates.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const dateDay = (date: string) => Number(date.slice(8, 10));

export const dateWeekday = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const isInPeriod = (date: string, start: string, end: string) => {
  const normalized = date?.slice(0, 10);
  return Boolean(normalized && normalized >= start && normalized <= end);
};

export const getStatusInfo = (status: DayStatus) =>
  STATUS_OPTIONS.find((item) => item.value === status) || STATUS_OPTIONS[0];

export const getScheduleFromAttendance = (attendance?: Attendance): EmployeeSchedule => {
  const fallback = emptySchedule(attendance?.workSchedule?.weeklyOffAllowance ?? 1);
  const stored = attendance?.workSchedule;
  if (!stored) return fallback;
  return {
    weeklyOffAllowance: stored.weeklyOffAllowance ?? fallback.weeklyOffAllowance,
    monthlyPAllowance: stored.monthlyPAllowance ?? fallback.monthlyPAllowance,
    weeklySchedule: { ...fallback.weeklySchedule, ...(stored.weeklySchedule || {}) },
    dateOverrides: stored.dateOverrides || {},
  };
};

export const CARD_CLASS = "rounded-2xl border border-slate-200 bg-white shadow-sm";
export const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
// Thêm vào cuối file types/attendance.ts
export const FILTER_WRAPPER = "flex flex-col gap-1.5";
export const FILTER_LABEL =
  "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
export const FIELD_ICON =
  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400";
export const FIELD_WITH_ICON = "pl-9";
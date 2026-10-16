import {
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  User,
  ChevronDown,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchData,
  postData,
  updateData,
  deleteData,
} from "@/lib/fetch-util";
import DatePickerField from "../ui/date-picker-field";
import {
  CARD_CLASS,
  dateWeekday,
  formatDate,
  getEmployeeId,
  getPayPeriod,
  getPayPeriodDates,
  isInPeriod,
  matchesAttendanceFilters,
} from "../types/attendance";
import type { Attendance, Employee } from "../types/attendance";

const API = "/attendance";

/** Danh sách gợi ý ghi chú */
const NOTE_PRESETS = [
  "Đi training",
  "Đi training + tăng ca đêm",
  "Họp trưa",
  "Về sớm",
  "Tiệc trưa",
  "OFF - Học training ( 14h-16h)",
  "Họp",
  "Tăng ca đêm",
];

type Props = {
  month: number;
  year: number;
  loading: boolean;
  attendances: Attendance[];
  employees: Employee[];
  yearAttendances: Attendance[];
  departmentFilter: string[];
  search: string;
  onSaved: () => void;
};

/** 1 dòng đang edit */
type DraftEntry = {
  tempId: string;
  _id?: string;
  attendanceId: string;
  date: string;
  hours: string;
  note: string;
  original?: {
    date: string;
    hours: string;
    note: string;
  };
};

/** Gọi API qua fetch-util */
async function callApi(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: any,
) {
  let payload: any;
  if (method === "GET") payload = await fetchData(url);
  else if (method === "POST") payload = await postData(url, body ?? {});
  else if (method === "PUT") payload = await updateData(url, body ?? {});
  else if (method === "DELETE") payload = await deleteData(url);

  if (payload?.success === false) {
    throw new Error(payload?.message || "Yêu cầu thất bại");
  }
  return payload;
}

const genTempId = () =>
  `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const isDraftChanged = (draft: DraftEntry, defaultDate: string) =>
  draft.original
    ? draft.date !== draft.original.date ||
      draft.hours !== draft.original.hours ||
      draft.note !== draft.original.note
    : Boolean(
        draft.hours.trim() ||
          draft.note.trim() ||
          draft.date !== defaultDate,
      );

function countOffDays(
  attendance: Attendance,
  periodDates: string[],
): number {
  const schedule = attendance.workSchedule;
  if (!schedule) return 0;

  const offWeekdays = new Set<number>();
  Object.entries(schedule.weeklySchedule || {}).forEach(([day, config]) => {
    if (config?.status === "OFF") offWeekdays.add(Number(day));
  });

  return periodDates.filter((date) => {
    const override = schedule.dateOverrides?.[date];
    const overrideStatus = override?.status as string | undefined;
    if (overrideStatus === "OFF") return true;
    if (overrideStatus && overrideStatus !== "OFF") return false;
    return offWeekdays.has(dateWeekday(date));
  }).length;
}

export default function OvertimeTab({
  month,
  year,
  loading,
  attendances,
  employees,
  yearAttendances,
  departmentFilter,
  search,
  onSaved,
}: Props) {
  const period = getPayPeriod(month, year);

  const periodDates = useMemo(
    () => getPayPeriodDates(month, year),
    [month, year],
  );

  /* ============ STATE ============ */
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // Quản lý trạng thái mở/đóng của từng Card nhân viên
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /* ============ DERIVED ============ */
  const periodEmployees = useMemo(() => {
    return Array.from(
      new Map(
        yearAttendances
          .filter(
            (item) =>
              item.dailyRecords.some((d) =>
                isInPeriod(d.date, period.start, period.end),
              ) ||
              (item.year === year && item.month === month),
          )
          .map((item) => [getEmployeeId(item.employee), item]),
      ).values(),
    );
  }, [yearAttendances, period.start, period.end, year, month]);

  useEffect(() => {
    if (loading) return;
    const next: DraftEntry[] = [];
    for (const attendance of periodEmployees) {
      const employeeId = getEmployeeId(attendance.employee);
      const employeeSheets = yearAttendances.filter(
        (i) => getEmployeeId(i.employee) === employeeId,
      );
      for (const sheet of employeeSheets) {
        for (const entry of sheet.overtimeEntries || []) {
          if (!isInPeriod(entry.date, period.start, period.end)) continue;
          const date = entry.date;
          const hours = String(entry.hours);
          const note = entry.note || "";
          next.push({
            tempId: entry._id,
            _id: entry._id,
            attendanceId: sheet._id,
            date,
            hours,
            note,
            original: { date, hours, note },
          });
        }
      }
    }
    setDrafts(next);
  }, [loading, periodEmployees, yearAttendances, period.start, period.end]);

  const totalsByAttendance = useMemo(() => {
    const m = new Map<
      string,
      { positive: number; negative: number; net: number }
    >();
    for (const d of drafts) {
      const num = Number(d.hours) || 0;
      const current = m.get(d.attendanceId) || {
        positive: 0,
        negative: 0,
        net: 0,
      };
      if (num > 0) current.positive += num;
      if (num < 0) current.negative += Math.abs(num);
      current.net += num;
      m.set(d.attendanceId, current);
    }
    return m;
  }, [drafts]);

  const changedDrafts = useMemo(
    () => drafts.filter((draft) => isDraftChanged(draft, period.start)),
    [drafts, period.start],
  );

  const visibleAttendances = useMemo(
    () =>
      periodEmployees
        .filter((attendance) =>
          matchesAttendanceFilters(
            attendance,
            departmentFilter,
            search,
            employees.find(
              (employee) => employee._id === getEmployeeId(attendance.employee),
            ),
          ),
        )
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "vi")),
    [periodEmployees, employees, departmentFilter, search],
  );

  /* ============ TOGGLE EXPAND ============ */
  const toggleExpand = (attendanceId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(attendanceId)) {
        next.delete(attendanceId);
      } else {
        next.add(attendanceId);
      }
      return next;
    });
  };

  /* ============ HANDLERS ============ */
  const addRow = (attendanceId: string) => {
    setDrafts((prev) => [
      ...prev,
      {
        tempId: genTempId(),
        attendanceId,
        date: period.start,
        hours: "",
        note: "",
      },
    ]);
    // Tự động mở rộng khi thêm dòng
    setExpandedIds((prev) => new Set(prev).add(attendanceId));
  };

  const updateDraft = (tempId: string, patch: Partial<DraftEntry>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, ...patch } : d)),
    );
  };

  const removeDraftRow = async (tempId: string) => {
    const draft = drafts.find((d) => d.tempId === tempId);
    if (!draft) return;

    if (!draft._id) {
      setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
      return;
    }

    if (
      !window.confirm(
        `Xóa khoản OT ngày ${formatDate(draft.date)} (${draft.hours}h)?`,
      )
    )
      return;

    setDeletingId(tempId);
    setErrorMessage("");
    setMessage("");
    try {
      await callApi(
        `${API}/${draft.attendanceId}/overtime/${draft._id}`,
        "DELETE",
      );
      setDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
      setMessage("Đã xóa khoản OT.");
      onSaved();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể xóa khoản OT.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const saveAll = async () => {
    const errors: string[] = [];
    for (const d of changedDrafts) {
      const num = Number(d.hours);
      if (!d.date) errors.push(`Có dòng chưa chọn ngày.`);
      if (!Number.isFinite(num) || num === 0) {
        errors.push(`Ngày ${d.date}: giờ OT phải khác 0.`);
      }
      if (num < -24 || num > 24) {
        errors.push(`Ngày ${d.date}: giờ OT phải trong khoảng -24 đến 24.`);
      }
    }
    if (errors.length > 0) {
      setErrorMessage(errors.slice(0, 5).join("\n"));
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    try {
      let created = 0;
      let updated = 0;

      for (const d of changedDrafts) {
        const payload = {
          date: d.date,
          hours: Number(d.hours),
          note: d.note,
        };

        if (d._id) {
          await callApi(
            `${API}/${d.attendanceId}/overtime/${d._id}`,
            "PUT",
            payload,
          );
          updated++;
        } else {
          await callApi(
            `${API}/${d.attendanceId}/overtime`,
            "POST",
            payload,
          );
          created++;
        }
      }

      setMessage(`Đã lưu tất cả: ${created} thêm mới, ${updated} cập nhật.`);
      onSaved();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể lưu OT.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveEmployee = async (attendanceId: string, employeeName: string) => {
    const employeeDrafts = changedDrafts.filter(
      (draft) => draft.attendanceId === attendanceId,
    );

    const errors: string[] = [];
    for (const d of employeeDrafts) {
      const num = Number(d.hours);
      if (!d.date) errors.push(`Có dòng chưa chọn ngày.`);
      if (!Number.isFinite(num) || num === 0) {
        errors.push(`Ngày ${d.date}: giờ OT phải khác 0.`);
      }
      if (num < -24 || num > 24) {
        errors.push(`Ngày ${d.date}: giờ OT phải trong khoảng -24 đến 24.`);
      }
    }
    if (errors.length > 0) {
      setErrorMessage(`[${employeeName}] ` + errors.slice(0, 5).join("\n"));
      return;
    }

    setSavingId(attendanceId);
    setErrorMessage("");
    setMessage("");

    try {
      let created = 0;
      let updated = 0;

      for (const d of employeeDrafts) {
        const payload = {
          date: d.date,
          hours: Number(d.hours),
          note: d.note,
        };

        if (d._id) {
          await callApi(
            `${API}/${d.attendanceId}/overtime/${d._id}`,
            "PUT",
            payload,
          );
          updated++;
        } else {
          await callApi(
            `${API}/${d.attendanceId}/overtime`,
            "POST",
            payload,
          );
          created++;
        }
      }

      setMessage(
        `[${employeeName}] Đã lưu: ${created} thêm mới, ${updated} cập nhật.`,
      );
      onSaved();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `[${employeeName}] ${err.message}`
          : `[${employeeName}] Không thể lưu OT.`,
      );
    } finally {
      setSavingId(null);
    }
  };

  /* ============ RENDER ============ */
  return (
    <section className={CARD_CLASS}>
      {/* ============ HEADER ============ */}
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-900">
          Thống kê OT & AL — {formatDate(period.start)} đến {formatDate(period.end)}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Kỳ công từ ngày 26 tháng trước đến hết ngày 25 tháng chọn. Điền trực tiếp
          vào bảng rồi bấm "Lưu tất cả".
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || loading || changedDrafts.length === 0}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-6 text-base font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              changedDrafts.length > 0
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-slate-200 bg-white text-slate-400"
            }`}
          >
            {saving ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? "Đang lưu..." : "Lưu tất cả"}
          </button>
        </div>
      </div>

      {/* ============ FEEDBACK ============ */}
      {message && (
        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="whitespace-pre-wrap border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* ============ MAIN ============ */}
      {loading ? (
        <div className="p-10 text-center text-base text-slate-500">
          Đang tải dữ liệu...
        </div>
      ) : attendances.length === 0 ? (
        <div className="p-10 text-center text-base text-slate-500">
          Chưa có bảng công để quản lý OT.
        </div>
      ) : visibleAttendances.length === 0 ? (
        <div className="p-10 text-center text-base text-slate-500">
          Không có nhân viên phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="p-5">
          <div className="mb-4 text-base font-bold text-slate-800">
            Chi tiết OT và giờ về sớm
          </div>

          <div className="flex flex-col gap-3">
            {visibleAttendances.map((attendance) => {
              const rowDrafts = drafts.filter(
                (d) => d.attendanceId === attendance._id,
              );
              const hasChanges = rowDrafts.some((draft) =>
                isDraftChanged(draft, period.start),
              );
              const isLocked = attendance.status === "LOCKED";
              const isSavingThis = savingId === attendance._id;
              const totals = totalsByAttendance.get(attendance._id) || {
                positive: 0,
                negative: 0,
                net: 0,
              };
              const isEmpty = rowDrafts.length === 0;
              // Mặc định thu gọn nếu không nằm trong danh sách expanded
              const isExpanded = expandedIds.has(attendance._id);

              return (
                <div
                  key={attendance._id}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    isEmpty
                      ? "border-slate-200 opacity-60 hover:opacity-100"
                      : "border-slate-200 hover:shadow-md"
                  }`}
                >
                  {/* ============ HEADER CARD (Có thể click để mở rộng) ============ */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 transition ${
                      isEmpty
                        ? "bg-slate-50/50"
                        : "bg-slate-50/80"
                    }`}
                  >
                    <div
                      className="flex flex-1 cursor-pointer items-center gap-3"
                      onClick={() => toggleExpand(attendance._id)}
                    >
                      {/* Nút mở rộng */}
                      <button
                        type="button"
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(attendance._id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isEmpty
                            ? "bg-slate-200 text-slate-400"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {isEmpty ? (
                          <Inbox className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <h3
                          className={`font-bold ${
                            isEmpty ? "text-slate-500" : "text-slate-800"
                          }`}
                        >
                          {attendance.employeeName}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {attendance.employeeCode || "—"} •{" "}
                          {attendance.department || "—"}
                          {isEmpty && (
                            <span className="ml-2 italic text-slate-400">
                              — Chưa có khoản OT
                            </span>
                          )}
                          {!isEmpty && !isExpanded && (
                            <span className="ml-2 font-semibold text-slate-600">
                              • {rowDrafts.length} dòng
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Tổng kết (chỉ hiện khi có data) */}
                      {!isEmpty && (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-semibold uppercase text-slate-400">
                              Tổng ròng
                            </div>
                            <div className="text-lg font-bold text-slate-800">
                              {(totals.net || 0).toFixed(1)}h
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-xs">
                            {totals.positive > 0 && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                +{totals.positive.toFixed(1)}h
                              </span>
                            )}
                            {totals.negative > 0 && (
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                                -{totals.negative.toFixed(1)}h
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Nút thêm dòng nhanh (khi thu gọn) */}
                      {!isExpanded && (
                        <button
                          type="button"
                          onClick={() => addRow(attendance._id)}
                          disabled={isLocked}
                          title="Thêm dòng OT"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" /> Thêm
                        </button>
                      )}

                      {/* Nút Lưu riêng */}
                      <button
                        type="button"
                        onClick={() =>
                          void saveEmployee(
                            attendance._id,
                            attendance.employeeName,
                          )
                        }
                        disabled={
                          isLocked || isSavingThis || isEmpty || !hasChanges
                        }
                        title={hasChanges ? "Lưu thay đổi" : "Chưa có thay đổi"}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          hasChanges
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border border-slate-200 bg-white text-slate-400"
                        }`}
                      >
                        {isSavingThis ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {isSavingThis ? "Đang lưu..." : "Lưu"}
                      </button>
                    </div>
                  </div>

                  {/* ============ BODY CARD (Chỉ hiện khi mở rộng) ============ */}
                  {isExpanded && (
                    <div className="p-4">
                      {rowDrafts.length === 0 ? (
                        <div className="py-4 text-center text-sm italic text-slate-400">
                          Chưa có khoản OT nào. Bấm "Thêm dòng OT" bên dưới.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {rowDrafts.map((draft, idx) => {
                            const num = Number(draft.hours) || 0;
                            const isDeleting = deletingId === draft.tempId;

                            return (
                              <div
                                key={draft.tempId}
                                className="group relative flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition hover:border-blue-200 hover:bg-white sm:flex-row sm:items-center"
                              >
                                <div className="hidden w-6 text-center text-xs font-bold text-slate-400 sm:block">
                                  #{idx + 1}
                                </div>

                                <div className="flex-1">
                                  <label className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                                    Ngày
                                  </label>
                                  <DatePickerField
                                    value={draft.date}
                                    onChange={(v) =>
                                      updateDraft(draft.tempId, { date: v })
                                    }
                                    min={period.start}
                                    max={period.end}
                                    disabled={isLocked || isDeleting}
                                  />
                                </div>

                                <div className="w-full sm:w-28">
                                  <label className="mb-1 block text-xs font-semibold text-emerald-600 sm:hidden">
                                    OT (+)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="24"
                                      placeholder="0"
                                      value={num > 0 ? draft.hours : ""}
                                      disabled={isLocked || isDeleting}
                                      onChange={(e) => {
                                        const raw = Number(e.target.value);
                                        const value =
                                          e.target.value === ""
                                            ? ""
                                            : String(Math.abs(raw) || 0);
                                        updateDraft(draft.tempId, {
                                          hours: value,
                                        });
                                      }}
                                      className="h-10 w-full rounded-md border border-emerald-200 bg-white px-3 text-right text-sm font-semibold text-emerald-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
                                      h
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full sm:w-28">
                                  <label className="mb-1 block text-xs font-semibold text-rose-600 sm:hidden">
                                    Về sớm (-)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="24"
                                      placeholder="0"
                                      value={
                                        num < 0 ? String(Math.abs(num)) : ""
                                      }
                                      disabled={isLocked || isDeleting}
                                      onChange={(e) => {
                                        const raw = Number(e.target.value);
                                        const value =
                                          e.target.value === ""
                                            ? ""
                                            : String(-Math.abs(raw) || 0);
                                        updateDraft(draft.tempId, {
                                          hours: value,
                                        });
                                      }}
                                      className="h-10 w-full rounded-md border border-rose-200 bg-white px-3 text-right text-sm font-semibold text-rose-700 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100 disabled:opacity-50"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-400">
                                      h
                                    </span>
                                  </div>
                                </div>

                                <div className="flex-[2]">
                                  <label className="mb-1 block text-xs font-semibold text-slate-500 sm:hidden">
                                    Ghi chú
                                  </label>
                                  <input
                                    type="text"
                                    list={`note-presets-${draft.tempId}`}
                                    placeholder="Chọn hoặc nhập ghi chú..."
                                    value={draft.note}
                                    disabled={isLocked || isDeleting}
                                    onChange={(e) =>
                                      updateDraft(draft.tempId, {
                                        note: e.target.value,
                                      })
                                    }
                                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                  />
                                  <datalist id={`note-presets-${draft.tempId}`}>
                                    {NOTE_PRESETS.map((preset) => (
                                      <option key={preset} value={preset} />
                                    ))}
                                  </datalist>
                                </div>

                                <div className="flex justify-end sm:block">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void removeDraftRow(draft.tempId)
                                    }
                                    disabled={isLocked || isDeleting}
                                    title="Xóa dòng này"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {isDeleting ? (
                                      <LoaderCircle className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-5 w-5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={() => addRow(attendance._id)}
                          disabled={isLocked}
                          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" /> Thêm dòng OT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ============ BẢNG AL / OFF ============ */}
          <div className="mt-10 border-t border-slate-200 pt-6">
            <div className="mb-3 text-base font-bold text-slate-800">
              Thống kê ngày OFF & phép AL
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="bg-slate-50 text-left text-sm text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-bold">Nhân viên</th>
                    <th className="px-4 py-3 font-bold">Phòng ban</th>
                    <th className="px-4 py-3 text-right font-bold">OFF định mức</th>
                    <th className="px-4 py-3 text-right font-bold">OFF đã dùng</th>
                    <th className="px-4 py-3 text-right font-bold">OFF còn lại</th>
                    <th className="px-4 py-3 text-right font-bold">Ngày công chuẩn</th>
                    <th className="px-4 py-3 text-right font-bold">AL tồn đầu tháng</th>
                    <th className="px-4 py-3 text-right font-bold">AL phát sinh</th>
                    <th className="px-4 py-3 text-right font-bold">AL đã dùng</th>
                    <th className="px-4 py-3 text-right font-bold">
                      AL còn lại chuyển tháng sau
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAttendances.map((attendance) => {
                    const employeeId = getEmployeeId(attendance.employee);
                    const employeeSheets = yearAttendances.filter(
                      (i) => getEmployeeId(i.employee) === employeeId,
                    );
                    const periodDays = employeeSheets.flatMap((i) =>
                      i.dailyRecords.filter((d) =>
                        isInPeriod(d.date, period.start, period.end),
                      ),
                    );
                    const history = employeeSheets
                      .filter((i) =>
                        i.dailyRecords.some((d) => d.date < period.start),
                      )
                      .sort((a, b) => a.year - b.year || a.month - b.month);
                    const carryIn = history.reduce((carry, item) => {
                      const allowance =
                        item.workSchedule?.monthlyPAllowance ?? 1;
                      const used = item.dailyRecords.filter(
                        (d) => d.date < period.start && d.status === "P",
                      ).length;
                      return Math.max(0, carry + allowance - used);
                    }, 0);
                    const pAllowance =
                      attendance.workSchedule?.monthlyPAllowance ?? 1;
                    const pUsed = periodDays.filter(
                      (d) => d.status === "P",
                    ).length;
                    const alRemaining = Math.max(
                      0,
                      carryIn + pAllowance - pUsed,
                    );

                    const offAllowance = countOffDays(attendance, periodDates);
                    const offUsed = periodDays.filter(
                      (d) => d.status === "OFF",
                    ).length;

                    const standardWorkDays = periodDates.length - offAllowance;

                    return (
                      <tr
                        key={`leave-${attendance._id}`}
                        className="border-t border-slate-100 hover:bg-slate-50/50"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {attendance.employeeName}
                          <div className="mt-1 text-xs text-slate-400">
                            {attendance.employeeCode || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {attendance.department || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-base">
                          {offAllowance}
                        </td>
                        <td className="px-4 py-3 text-right text-base">
                          {offUsed}
                        </td>
                        <td
                          className={`px-4 py-3 text-right text-base font-semibold ${
                            offAllowance - offUsed < 0
                              ? "text-rose-600"
                              : "text-slate-800"
                          }`}
                        >
                          {offAllowance - offUsed}
                        </td>
                        <td className="px-4 py-3 text-right text-base font-semibold text-blue-700">
                          {standardWorkDays}
                        </td>
                        <td className="px-4 py-3 text-right text-base">
                          {carryIn}
                        </td>
                        <td className="px-4 py-3 text-right text-base">
                          {pAllowance}
                        </td>
                        <td className="px-4 py-3 text-right text-base">
                          {pUsed}
                        </td>
                        <td className="px-4 py-3 text-right text-base font-bold text-emerald-700">
                          {alRemaining}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
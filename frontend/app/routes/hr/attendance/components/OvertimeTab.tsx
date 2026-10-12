import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
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
  INPUT_CLASS,
  MONTHS,
  dateWeekday,        // ← THÊM
  formatDate,
  getEmployeeId,
  getPayPeriod,
  getPayPeriodDates,  // ← THÊM
  isInPeriod,
} from "../types/attendance";
import type { Attendance } from "../types/attendance";

const API = "/attendance";

type Props = {
  month: number;
  year: number;
  now: Date;
  loading: boolean;
  attendances: Attendance[];
  yearAttendances: Attendance[];
  onChangeMonth: (v: number) => void;
  onChangeYear: (v: number) => void;
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
};

/** Gọi API qua fetch-util — tự thêm prefix + parse + throw chuẩn */
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

/**
 * Đếm số ngày OFF thực tế trong kỳ công.
 * Ưu tiên: dateOverrides > weeklySchedule theo thứ.
 */
function countOffDays(
  attendance: Attendance,
  periodDates: string[],
): number {
  const schedule = attendance.workSchedule;
  if (!schedule) return 0;

  // Xác định các thứ OFF cố định trong tuần
  const offWeekdays = new Set<number>();
  Object.entries(schedule.weeklySchedule || {}).forEach(([day, config]) => {
    if (config?.status === "OFF") offWeekdays.add(Number(day));
  });

  return periodDates.filter((date) => {
    // 1. Override ngày cụ thể có ưu tiên cao nhất
    const override = schedule.dateOverrides?.[date];
    const overrideStatus = override?.status as string | undefined;
    if (overrideStatus === "OFF") return true;
    if (overrideStatus && overrideStatus !== "OFF") return false;
    // 2. Không có override → theo lịch tuần
    return offWeekdays.has(dateWeekday(date));
  }).length;
}

export default function OvertimeTab({
  month,
  year,
  now,
  loading,
  attendances,
  yearAttendances,
  onChangeMonth,
  onChangeYear,
  onSaved,
}: Props) {
  const period = getPayPeriod(month, year);

  // Danh sách ngày trong kỳ — dùng cho việc đếm OFF
  const periodDates = useMemo(
    () => getPayPeriodDates(month, year),
    [month, year],
  );

  /* ============ STATE ============ */
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  /* Build drafts từ data thật */
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
          next.push({
            tempId: entry._id,
            _id: entry._id,
            attendanceId: sheet._id,
            date: entry.date,
            hours: String(entry.hours),
            note: entry.note || "",
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

  const visibleAttendances = useMemo(
    () =>
      [...periodEmployees].sort((a, b) =>
        a.employeeName.localeCompare(b.employeeName, "vi"),
      ),
    [periodEmployees],
  );

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
    for (const d of drafts) {
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

      for (const d of drafts) {
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

      setMessage(`Đã lưu: ${created} thêm mới, ${updated} cập nhật.`);
      onSaved();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể lưu OT.",
      );
    } finally {
      setSaving(false);
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
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm font-semibold text-slate-600">
              Tháng thống kê
              <select
                className={`${INPUT_CLASS} mt-1.5 min-w-36 text-base`}
                value={month}
                onChange={(e) => onChangeMonth(Number(e.target.value))}
              >
                {MONTHS.map((n, i) => (
                  <option key={n} value={i + 1}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Năm
              <select
                className={`${INPUT_CLASS} mt-1.5 min-w-28 text-base`}
                value={year}
                onChange={(e) => onChangeYear(Number(e.target.value))}
              >
                {Array.from(
                  { length: 7 },
                  (_, i) => now.getFullYear() - 3 + i,
                ).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || loading || drafts.length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      ) : (
        <div className="overflow-x-auto">
          {/* ============ BẢNG OT ============ */}
          <div className="px-5 pt-5 pb-3 text-base font-bold text-slate-800">
            Chi tiết OT và giờ về sớm
          </div>
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold">Nhân viên</th>
                <th className="px-4 py-3 font-bold">Phòng ban</th>
                <th className="px-4 py-3 font-bold">Ngày</th>
                <th className="px-4 py-3 text-right font-bold">OT (+)</th>
                <th className="px-4 py-3 text-right font-bold">Về sớm (-)</th>
                <th className="px-4 py-3 font-bold">Ghi chú</th>
                <th className="px-4 py-3 text-right font-bold">Ròng</th>
                <th className="px-4 py-3 text-center font-bold">Thêm</th>
                <th className="px-4 py-3 text-center font-bold">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {visibleAttendances.map((attendance) => {
                const rowDrafts = drafts.filter(
                  (d) => d.attendanceId === attendance._id,
                );
                const isLocked = attendance.status === "LOCKED";
                const totals = totalsByAttendance.get(attendance._id) || {
                  positive: 0,
                  negative: 0,
                  net: 0,
                };

                if (rowDrafts.length === 0) {
                  return (
                    <tr
                      key={attendance._id}
                      className="border-t border-slate-100"
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
                      <td
                        colSpan={6}
                        className="px-4 py-3 italic text-slate-400"
                      >
                        Chưa có khoản OT
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => addRow(attendance._id)}
                          disabled={isLocked}
                          className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" /> Thêm
                        </button>
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  );
                }

                return rowDrafts.map((draft, idx) => {
                  const num = Number(draft.hours) || 0;
                  const isDeleting = deletingId === draft.tempId;
                  const isFirstRow = idx === 0;

                  return (
                    <tr
                      key={draft.tempId}
                      className="border-t border-slate-100 hover:bg-slate-50/50"
                    >
                      {isFirstRow ? (
                        <td
                          rowSpan={rowDrafts.length}
                          className="px-4 py-3 align-top font-semibold text-slate-800"
                        >
                          {attendance.employeeName}
                          <div className="mt-1 text-xs text-slate-400">
                            {attendance.employeeCode || ""}
                          </div>
                        </td>
                      ) : null}
                      {isFirstRow ? (
                        <td
                          rowSpan={rowDrafts.length}
                          className="px-4 py-3 align-top text-slate-600"
                        >
                          {attendance.department || "—"}
                        </td>
                      ) : null}

                      {/* Ngày — dùng DatePickerField */}
                      <td className="px-4 py-2">
                        <DatePickerField
                          value={draft.date}
                          onChange={(v) =>
                            updateDraft(draft.tempId, { date: v })
                          }
                          min={period.start}
                          max={period.end}
                          disabled={isLocked || isDeleting}
                        />
                      </td>

                      {/* OT (+) */}
                      <td className="px-4 py-2 text-right">
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
                            updateDraft(draft.tempId, { hours: value });
                          }}
                          className="h-9 w-24 rounded-md border border-emerald-200 bg-emerald-50/50 px-2 text-right text-sm font-semibold text-emerald-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                        />
                      </td>

                      {/* Về sớm (-) */}
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          placeholder="0"
                          value={num < 0 ? String(Math.abs(num)) : ""}
                          disabled={isLocked || isDeleting}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const value =
                              e.target.value === ""
                                ? ""
                                : String(-Math.abs(raw) || 0);
                            updateDraft(draft.tempId, { hours: value });
                          }}
                          className="h-9 w-24 rounded-md border border-rose-200 bg-rose-50/50 px-2 text-right text-sm font-semibold text-rose-700 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100 disabled:opacity-50"
                        />
                      </td>

                      {/* Ghi chú */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          placeholder="Ghi chú..."
                          value={draft.note}
                          disabled={isLocked || isDeleting}
                          onChange={(e) =>
                            updateDraft(draft.tempId, {
                              note: e.target.value,
                            })
                          }
                          className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                        />
                      </td>

                      {/* Ròng */}
                      {isFirstRow ? (
                        <td
                          rowSpan={rowDrafts.length}
                          className="px-4 py-3 text-right align-middle text-base font-bold text-slate-800"
                        >
                          <div>{(totals.net || 0).toFixed(1)}h</div>
                          {totals.positive > 0 && (
                            <div className="mt-1 text-xs font-normal text-emerald-700">
                              +{totals.positive.toFixed(1)}h
                            </div>
                          )}
                          {totals.negative > 0 && (
                            <div className="text-xs font-normal text-rose-600">
                              -{totals.negative.toFixed(1)}h
                            </div>
                          )}
                        </td>
                      ) : null}

                      {/* Thêm dòng */}
                      {isFirstRow ? (
                        <td
                          rowSpan={rowDrafts.length}
                          className="px-4 py-3 text-center align-middle"
                        >
                          <button
                            type="button"
                            onClick={() => addRow(attendance._id)}
                            disabled={isLocked}
                            title="Thêm dòng OT nữa cho nhân viên này"
                            className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm dòng
                          </button>
                        </td>
                      ) : null}

                      {/* Xóa từng dòng */}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => void removeDraftRow(draft.tempId)}
                          disabled={isLocked || isDeleting}
                          title="Xóa dòng này"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isDeleting ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>

          {/* ============ BẢNG AL / OFF ============ */}
          <div className="mt-8 border-t border-slate-200 px-5 pt-5 pb-3 text-base font-bold text-slate-800">
            Thống kê ngày OFF & phép AL
          </div>
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
              {periodEmployees.map((attendance) => {
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
                  const allowance = item.workSchedule?.monthlyPAllowance ?? 1;
                  const used = item.dailyRecords.filter(
                    (d) => d.date < period.start && d.status === "P",
                  ).length;
                  return Math.max(0, carry + allowance - used);
                }, 0);
                const pAllowance =
                  attendance.workSchedule?.monthlyPAllowance ?? 1;
                const pUsed = periodDays.filter((d) => d.status === "P").length;
                const alRemaining = Math.max(0, carryIn + pAllowance - pUsed);

                // ✅ Đếm OFF thực tế theo lịch phân ca + dateOverrides
                const offAllowance = countOffDays(attendance, periodDates);
                const offUsed = periodDays.filter(
                  (d) => d.status === "OFF",
                ).length;

                // ✅ Ngày công chuẩn = tổng ngày kỳ − OFF định mức
                const standardWorkDays = periodDates.length - offAllowance;

                return (
                  <tr
                    key={`leave-${attendance._id}`}
                    className="border-t border-slate-100"
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
                    <td className="px-4 py-3 text-right text-base">{offUsed}</td>
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
                    <td className="px-4 py-3 text-right text-base">{pUsed}</td>
                    <td className="px-4 py-3 text-right text-base font-bold text-emerald-700">
                      {alRemaining}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
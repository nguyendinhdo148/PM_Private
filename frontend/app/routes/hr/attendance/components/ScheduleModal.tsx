import { LoaderCircle, X } from "lucide-react";
import {
  INPUT_CLASS, SHIFTS, STATUS_OPTIONS, WEEKDAYS,
  emptySchedule, getDefaultShift, getEmployeeCode, getEmployeeName,
} from "../types/attendance";
import type {
  DayStatus, Employee, EmployeeSchedule, ScheduleDay,
} from "../types/attendance";

type Props = {
  employee: Employee;
  draft: EmployeeSchedule;
  saving: boolean;
  onChange: React.Dispatch<React.SetStateAction<EmployeeSchedule>>;
  onClose: () => void;
  onSave: () => void;
};

export default function ScheduleModal({
  employee, draft, saving, onChange, onClose, onSave,
}: Props) {
  const updateDraftDay = (day: number, patch: Partial<ScheduleDay>) => {
    onChange((previous) => {
      const current = previous.weeklySchedule[day] || emptySchedule().weeklySchedule[day];
      const next: ScheduleDay = { ...current, ...patch };
      if (patch.status === "OFF") {
        next.isWeeklyOff = true;
        next.shiftType = null;
        next.shiftTime = null;
      } else if (patch.status) {
        next.isWeeklyOff = false;
      }
      return {
        ...previous,
        weeklySchedule: { ...previous.weeklySchedule, [day]: next },
      };
    });
  };

  const defaultShift = getDefaultShift(employee);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Thiết lập lịch phân ca</h2>
            <p className="mt-1 text-sm text-slate-500">
              {getEmployeeName(employee)}{" · "}
              {getEmployeeCode(employee) || "Chưa có mã"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Số ngày nghỉ tuần</label>
              <select
                className={INPUT_CLASS}
                value={draft.weeklyOffAllowance}
                onChange={(e) =>
                  onChange((p) => ({ ...p, weeklyOffAllowance: Number(e.target.value) }))
                }
              >
                <option value={1}>1 ngày / tuần — Nhân viên thường</option>
                <option value={2}>2 ngày / tuần — Nhân viên văn phòng</option>
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
                className={INPUT_CLASS}
                value={draft.monthlyPAllowance}
                onChange={(e) =>
                  onChange((p) => ({ ...p, monthlyPAllowance: Number(e.target.value) }))
                }
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Lịch làm theo thứ trong tuần</h3>
            <p className="mb-3 text-xs text-slate-500">
              Chọn trạng thái cho từng thứ và giờ bắt đầu ca. Những ngày OFF không bị tính là ngày phép P.
            </p>
            <div className="space-y-2">
              {WEEKDAYS.map((weekday, day) => {
                const config: ScheduleDay = draft.weeklySchedule[day] || {
                  status: "WORK",
                  shiftType: defaultShift.shiftType,
                  shiftTime: defaultShift.shiftTime,
                  isWeeklyOff: false,
                  note: "",
                };
                const selectedShift = SHIFTS.find((s) => s.value === config.shiftType) || SHIFTS[4];
                return (
                  <div key={day} className="grid items-center gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[70px_140px_1fr]">
                    <div className="font-semibold text-slate-700">
                      {weekday === "CN" ? "Chủ nhật" : `Thứ ${day + 1}`}
                    </div>
                    <select
                      className={INPUT_CLASS}
                      value={config.status}
                      onChange={(e) => updateDraftDay(day, { status: e.target.value as DayStatus })}
                    >
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {config.status === "WORK" ? (
                      <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                        <select
                          className={INPUT_CLASS}
                          value={selectedShift.value === "CUSTOM" ? "CUSTOM" : selectedShift.value}
                          onChange={(e) => {
                            const shift = SHIFTS.find((s) => s.value === e.target.value);
                            if (!shift) return;
                            updateDraftDay(day, {
                              shiftType: shift.value as ScheduleDay["shiftType"],
                              shiftTime: shift.value === "CUSTOM" ? config.shiftTime || defaultShift.shiftTime : shift.time,
                            });
                          }}
                        >
                          {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <input
                          type="time"
                          className={INPUT_CLASS}
                          value={config.shiftTime || defaultShift.shiftTime}
                          onChange={(e) => updateDraftDay(day, { shiftType: "CUSTOM", shiftTime: e.target.value })}
                        />
                      </div>
                    ) : (
                      <input
                        className={`${INPUT_CLASS} bg-slate-50`}
                        disabled
                        value={
                          config.status === "OFF" ? "Ngày nghỉ tuần"
                          : config.status === "P" ? "Nghỉ phép"
                          : config.status === "HOLIDAY" ? "Ngày lễ"
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
            <strong>Lưu ý:</strong> Với bảng công đã tạo, lưu lịch phân ca chỉ cập nhật cấu hình lịch.
            Các ô chấm công của tháng hiện tại không tự thay đổi để tránh ghi đè dữ liệu đã chỉnh sửa.
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Lưu lịch làm
          </button>
        </div>
      </div>
    </div>
  );
}
import { LoaderCircle, X } from "lucide-react";
import { INPUT_CLASS, getPayPeriod } from "../types/attendance";
import type { Attendance } from "../types/attendance";

type Props = {
  attendance: Attendance;
  month: number;
  year: number;
  date: string;
  hours: string;
  note: string;
  saving: boolean;
  onChangeDate: (v: string) => void;
  onChangeHours: (v: string) => void;
  onChangeNote: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function OvertimeModal({
  attendance, month, year, date, hours, note, saving,
  onChangeDate, onChangeHours, onChangeNote, onClose, onSave,
}: Props) {
  const period = getPayPeriod(month, year);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold text-slate-900">Thêm giờ OT</h2>
            <p className="mt-1 text-sm text-slate-500">{attendance.employeeName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Ngày</label>
            <input
              type="date"
              className={INPUT_CLASS}
              value={date}
              min={period.start}
              max={period.end}
              onChange={(e) => onChangeDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Số giờ</label>
            <input
              type="number"
              step="0.5"
              min="-24"
              max="24"
              className={INPUT_CLASS}
              placeholder="Ví dụ: 2 hoặc -1.5"
              value={hours}
              onChange={(e) => onChangeHours(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-500">Số dương là tăng ca. Số âm là giờ về sớm.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Ghi chú</label>
            <textarea
              rows={3}
              className={`${INPUT_CLASS} h-auto py-2`}
              placeholder="Lý do hoặc thông tin bổ sung..."
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
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
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Lưu OT
          </button>
        </div>
      </div>
    </div>
  );
}
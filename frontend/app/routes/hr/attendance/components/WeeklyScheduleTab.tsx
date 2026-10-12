import { Eye } from "lucide-react";
import {
  CARD_CLASS, INPUT_CLASS, MONTHS, SHIFTS,
  dateWeekday, formatDate, getPosition,
} from "../types/attendance";
import type { Attendance } from "../types/attendance";

type Props = {
  month: number;
  year: number;
  now: Date;
  loading: boolean;
  weeklyIndex: number;
  weeklyRanges: string[][];
  selectedWeekDays: string[];
  rows: Attendance[];
  onChangeMonth: (v: number) => void;
  onChangeYear: (v: number) => void;
  onChangeWeek: (v: number) => void;
};

export default function WeeklyScheduleTab({
  month, year, now, loading, weeklyIndex, weeklyRanges,
  selectedWeekDays, rows,
  onChangeMonth, onChangeYear, onChangeWeek,
}: Props) {
  return (
    <section className={`${CARD_CLASS} weekly-print-area overflow-hidden`}>
      <div className="weekly-no-print flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Lịch làm việc theo tuần</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Bản gọn để Captain chụp màn hình hoặc in gửi nhân sự nắm lịch tuần sau.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold text-slate-600">Tháng
            <select className={`${INPUT_CLASS} mt-1.5 min-w-36 text-base`} value={month} onChange={(e) => onChangeMonth(Number(e.target.value))}>
              {MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-600">Năm
            <select className={`${INPUT_CLASS} mt-1.5 min-w-28 text-base`} value={year} onChange={(e) => onChangeYear(Number(e.target.value))}>
              {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-600">Tuần
            <select className={`${INPUT_CLASS} mt-1.5 min-w-48 text-base`} value={weeklyIndex} onChange={(e) => onChangeWeek(Number(e.target.value))}>
              {weeklyRanges.map((range, i) => (
                <option key={i} value={i}>Tuần {i + 1}: {formatDate(range[0])} – {formatDate(range[range.length - 1])}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-semibold text-white hover:bg-blue-700"
          >
            <Eye className="h-5 w-5" /> In / Lưu PDF
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-900">LỊCH LÀM VIỆC NHÂN SỰ</h2>
          <p className="mt-2 text-base font-semibold text-slate-700">
            Tuần {weeklyIndex + 1}: {selectedWeekDays.length ? `${formatDate(selectedWeekDays[0])} – ${formatDate(selectedWeekDays[selectedWeekDays.length - 1])}` : ""}
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-base text-slate-500">Đang tải lịch...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-base text-slate-500">
            Tháng {month}/{year} chưa có bảng công. Hãy tạo bảng công ở tab “Bảng chấm công” trước nhé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-center text-sm text-slate-900">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-3 py-3 text-base">STT</th>
                  <th rowSpan={2} className="min-w-48 border border-slate-500 bg-slate-100 px-3 py-3 text-left text-base">TÊN NHÂN VIÊN</th>
                  <th rowSpan={2} className="min-w-32 border border-slate-500 bg-slate-100 px-3 py-3 text-base">CHỨC VỤ</th>
                  {selectedWeekDays.map((d) => (
                    <th key={d} className="min-w-20 border border-slate-500 bg-emerald-700 px-3 py-3 text-base font-bold text-white">
                      {formatDate(d).slice(0, 5)}
                    </th>
                  ))}
                </tr>
                <tr>
                  {selectedWeekDays.map((d) => {
                    const wd = dateWeekday(d);
                    const names = ["CHỦ NHẬT", "THỨ HAI", "THỨ BA", "THỨ TƯ", "THỨ NĂM", "THỨ SÁU", "THỨ BẢY"];
                    const colors = ["bg-rose-100", "bg-slate-50", "bg-slate-50", "bg-slate-50", "bg-slate-50", "bg-slate-50", "bg-emerald-100"];
                    return <th key={d} className={`border border-slate-500 px-2 py-2.5 text-sm font-semibold ${colors[wd]}`}>{names[wd]}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((attendance, index) => (
                  <tr key={attendance._id}>
                    <td className="border border-slate-500 px-3 py-3 text-base italic">{index + 1}</td>
                    <td className="border border-slate-500 px-3 py-3 text-left text-base font-semibold italic">{attendance.employeeName}</td>
                    <td className="border border-slate-500 px-3 py-3 text-sm italic">
                      {attendance.position || (typeof attendance.employee === "object" ? getPosition(attendance.employee) : "") || ""}
                    </td>
                    {selectedWeekDays.map((d) => {
                      const record = attendance.dailyRecords?.find((item) => item.date === d);
                      let label = "—";
                      let color = "text-slate-400";
                      if (record) {
                        if (record.status === "OFF") { label = "OFF"; color = "font-bold text-emerald-600"; }
                        else if (record.status === "P") { label = "P"; color = "font-bold text-blue-700"; }
                        else if (record.status === "ABSENT") { label = "VẮNG"; color = "font-bold text-rose-600"; }
                        else if (record.status === "HOLIDAY") { label = "LỄ"; color = "font-bold text-violet-600"; }
                        else {
                          // ✅ Hiển thị giờ 24h trực tiếp (14:30, 15:30, 18:00...)
                          if (record.shiftTime) {
                            label = record.shiftTime;
                          } else {
                            label = record.shiftType
                              ? (SHIFTS.find((s) => s.value === record.shiftType)?.label || "X")
                              : "X";
                          }
                          color = "font-bold italic text-slate-900";
                        }
                      }
                      return <td key={d} className={`border border-slate-500 px-3 py-3 text-base ${color}`}>{label}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <span><b>OFF</b>: Nghỉ tuần</span>
          <span><b>P</b>: Nghỉ phép</span>
          <span><b>VẮNG</b>: Vắng mặt</span>
          <span><b>LỄ</b>: Ngày lễ</span>
        </div>
      </div>
    </section>
  );
}
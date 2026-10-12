import { CalendarDays, Eye, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, MONTHS } from "../types/attendance";
import type { Attendance } from "../types/attendance";

type Props = {
  summaryYear: number;
  summaryLoading: boolean;
  yearAttendances: Attendance[];
  now: Date;
  onChangeYear: (v: number) => void;
  onViewMonth: (month: number, year: number) => void;
  onDeleteMonth: (month: number, year: number, rows: Attendance[]) => void;
  onCreateNew: () => void;
};

export default function SummaryTab({
  summaryYear, summaryLoading, yearAttendances, now,
  onChangeYear, onViewMonth, onDeleteMonth, onCreateNew,
}: Props) {
  const yearlyRows = yearAttendances.filter((i) => i.year === summaryYear);

  return (
    <section className={CARD_CLASS}>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tổng hợp chấm công theo tháng</h2>
          <p className="mt-1.5 text-sm text-slate-500">Chọn tháng để xem chi tiết bảng chấm công tương ứng.</p>
        </div>
        <select
          className={INPUT_CLASS + " text-base sm:max-w-44"}
          value={summaryYear}
          onChange={(e) => onChangeYear(Number(e.target.value))}
        >
          {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {summaryLoading ? (
        <div className="p-10 text-center text-base text-slate-500">
          <LoaderCircle className="mr-2 inline h-5 w-5 animate-spin" />
          Đang tổng hợp dữ liệu...
        </div>
      ) : yearlyRows.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
          <CalendarDays className="mb-3 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-800">Chưa có bảng công trong năm {summaryYear}</h3>
          <p className="mt-2 max-w-md text-base text-slate-500">
            Chỉ những tháng đã tạo bảng công mới xuất hiện tại đây. Hãy vào tab Bảng chấm công để tạo bảng công cho tháng cần quản lý.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" /> Tạo bảng công
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-4 font-bold">Tháng</th>
                <th className="px-4 py-4 text-right font-bold">Số bảng công</th>
                <th className="px-4 py-4 text-right font-bold">Ngày đi làm</th>
                <th className="px-4 py-4 text-right font-bold">Ngày nghỉ</th>
                <th className="px-4 py-4 text-right font-bold">Ngày phép P</th>
                <th className="px-4 py-4 text-right font-bold">Vắng mặt</th>
                <th className="px-4 py-4 text-right font-bold">Tổng OT</th>
                <th className="px-4 py-4 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((monthName, index) => {
                const monthNumber = index + 1;
                const rows = yearlyRows.filter((i) => i.month === monthNumber);
                if (rows.length === 0) return null;
                const totals = rows.reduce(
                  (acc, item) => {
                    acc.work += item.summary?.totalWorkDays || 0;
                    acc.off += item.summary?.totalOffDays || 0;
                    acc.leave += item.summary?.totalPDays || 0;
                    acc.absent += item.summary?.totalAbsentDays || 0;
                    acc.ot += item.summary?.totalOTHours || 0;
                    return acc;
                  },
                  { work: 0, off: 0, leave: 0, absent: 0, ot: 0 },
                );
                return (
                  <tr key={monthNumber} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4 text-base font-semibold text-slate-800">{monthName} {summaryYear}</td>
                    <td className="px-4 py-4 text-right text-base">{rows.length}</td>
                    <td className="px-4 py-4 text-right text-base">{totals.work}</td>
                    <td className="px-4 py-4 text-right text-base">{totals.off}</td>
                    <td className="px-4 py-4 text-right text-base">{totals.leave}</td>
                    <td className="px-4 py-4 text-right text-base">{totals.absent}</td>
                    <td className="px-4 py-4 text-right text-base">{totals.ot.toFixed(1)}h</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onViewMonth(monthNumber, summaryYear)}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 px-3.5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" /> Xem chi tiết
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMonth(monthNumber, summaryYear, rows)}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 px-3.5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" /> Xóa tháng
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
    </section>
  );
}
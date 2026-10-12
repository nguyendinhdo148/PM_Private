import { Camera, Eye, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
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
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureMessage, setCaptureMessage] = useState("");

  const handleCapture = async () => {
    if (!printAreaRef.current) return;
    setCapturing(true);
    setCaptureMessage("");
    try {
      // Chờ 1 frame để đảm bảo DOM đã render xong
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2, // 2x cho ảnh nét
        useCORS: true, // cho phép ảnh cross-origin (logo)
        backgroundColor: "#ffffff",
        logging: false,
      });

      const fileName = `Lich-lam-viec-tuan-${weeklyIndex + 1}-${month}-${year}.png`;

      // Tải về dưới dạng file
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();

      setCaptureMessage(`Đã lưu ảnh: ${fileName}`);
      setTimeout(() => setCaptureMessage(""), 3000);
    } catch (error) {
      console.error("Capture error:", error);
      setCaptureMessage("Không thể chụp màn hình. Vui lòng thử lại.");
      setTimeout(() => setCaptureMessage(""), 3000);
    } finally {
      setCapturing(false);
    }
  };

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

          {/* === NÚT CHỤP MÀN HÌNH === */}
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={capturing || loading || rows.length === 0}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 text-base font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Chụp ảnh lịch tuần và tải về"
          >
            {capturing ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            {capturing ? "Đang chụp..." : "Chụp màn hình"}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-semibold text-white hover:bg-blue-700"
          >
            <Eye className="h-5 w-5" /> In / Lưu PDF
          </button>
        </div>
      </div>

      {/* Feedback */}
      {captureMessage && (
        <div className="weekly-no-print border-b border-emerald-100 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-800">
          {captureMessage}
        </div>
      )}

      {/* ==================== KHU VỰC ĐƯỢC CHỤP ==================== */}
      <div className="p-5" ref={printAreaRef}>
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
                          if (record.shiftType === "CUSTOM" && record.shiftTime) label = record.shiftTime;
                          else if (record.shiftTime) {
                            const [h, m] = record.shiftTime.split(":");
                            label = `PM${Number(h) % 12 || 12}.${Math.floor(Number(m) / 10)}`;
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
          <span>PM = Ca làm việc</span>
        </div>
      </div>
    </section>
  );
}
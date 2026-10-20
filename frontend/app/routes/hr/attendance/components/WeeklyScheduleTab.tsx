import { useMemo, useRef, useState } from "react";
import { Eye, Camera } from "lucide-react";
import html2canvas from "html2canvas-pro";
import {
  CARD_CLASS,
  SHIFTS,
  dateWeekday,
  formatDate,
  getPosition,
} from "../types/attendance";
import type { Attendance } from "../types/attendance";

type Props = {
  month: number;
  year: number;
  loading: boolean;
  rows: Attendance[];
};

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const STT_WIDTH = 56;
const NAME_WIDTH = 190;
const POSITION_WIDTH = 130;
const DAY_WIDTH = 80;

type WeekRange = {
  index: number;
  start: string;
  end: string;
  days: string[];
};

export default function WeeklyScheduleTab({
  month,
  year,
  loading,
  rows,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [weekFilter, setWeekFilter] = useState<"all" | number>("all");

  // Kỳ công: ngày 26 tháng trước đến ngày 25 tháng chọn.
  const startDate = new Date(year, month - 2, 26);
  const endDate = new Date(year, month - 1, 25);

  const monthlyDays: string[] = [];

  for (
    const date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    monthlyDays.push(toDateKey(date));
  }

  // Chia kỳ công thành các tuần, mỗi tuần bắt đầu Thứ Hai.
  const weeks = useMemo<WeekRange[]>(() => {
    const result: WeekRange[] = [];
    let current: string[] = [];

    monthlyDays.forEach((day) => {
      const weekday = dateWeekday(day); // 0 = CN, 1 = T2, ...
      // Bắt đầu tuần mới khi gặp Thứ Hai (trừ ngày đầu tiên của kỳ công)
      if (weekday === 1 && current.length > 0) {
        result.push({
          index: result.length,
          start: current[0],
          end: current[current.length - 1],
          days: current,
        });
        current = [];
      }
      current.push(day);
    });

    if (current.length > 0) {
      result.push({
        index: result.length,
        start: current[0],
        end: current[current.length - 1],
        days: current,
      });
    }

    return result;
  }, [monthlyDays.join("|")]);

  // Ngày hiển thị theo bộ lọc tuần.
  const visibleDays: string[] = useMemo(() => {
    if (weekFilter === "all") return monthlyDays;
    return weeks[weekFilter]?.days ?? monthlyDays;
  }, [weekFilter, weeks, monthlyDays.join("|")]);

  const weekdayNames = [
    "CHỦ NHẬT",
    "THỨ HAI",
    "THỨ BA",
    "THỨ TƯ",
    "THỨ NĂM",
    "THỨ SÁU",
    "THỨ BẢY",
  ];

  const weekdayColors = [
    "bg-rose-100",
    "bg-slate-50",
    "bg-slate-50",
    "bg-slate-50",
    "bg-slate-50",
    "bg-slate-50",
    "bg-emerald-100",
  ];

  // Chụp toàn bộ bảng bằng bản DOM riêng, không làm lệch giao diện.
  const handleCapture = async () => {
    if (!printRef.current || capturing || loading) return;

    setCapturing(true);

    try {
      const content = printRef.current;
      const table = content.querySelector("table");

      if (!table) {
        throw new Error("Không tìm thấy bảng lịch làm việc.");
      }

      const tableWidth = table.scrollWidth;
      const contentWidth = tableWidth + 40;
      const contentHeight = content.scrollHeight;

      const canvas = await html2canvas(content, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        width: contentWidth,
        height: contentHeight,
        windowWidth: Math.max(window.innerWidth, contentWidth),
        windowHeight: Math.max(window.innerHeight, contentHeight),
        scrollX: 0,
        scrollY: 0,

        onclone: (clonedDocument) => {
          const clonedContent = clonedDocument.querySelector(
            ".weekly-capture-content",
          ) as HTMLElement | null;

          if (clonedContent) {
            clonedContent.style.width = `${contentWidth}px`;
            clonedContent.style.maxWidth = "none";
            clonedContent.style.overflow = "visible";
          }

          const clonedScroller = clonedDocument.querySelector(
            ".weekly-table-scroll",
          ) as HTMLElement | null;

          if (clonedScroller) {
            clonedScroller.style.width = `${contentWidth}px`;
            clonedScroller.style.maxWidth = "none";
            clonedScroller.style.overflow = "visible";
          }

          // Ảnh chụp không dùng sticky để tránh chồng cột.
          clonedDocument
            .querySelectorAll<HTMLElement>(".weekly-sticky-cell")
            .forEach((cell) => {
              cell.style.position = "static";
              cell.style.left = "auto";
              cell.style.zIndex = "auto";
              cell.style.boxShadow = "none";
            });

          const clonedTable = clonedDocument.querySelector(
            ".weekly-schedule-table",
          ) as HTMLTableElement | null;

          if (clonedTable) {
            clonedTable.style.width = `${tableWidth}px`;
            clonedTable.style.minWidth = `${tableWidth}px`;
            clonedTable.style.tableLayout = "fixed";
          }
        },
      });

      const suffix =
        weekFilter === "all"
          ? `${month}-${year}`
          : `tuan-${weekFilter + 1}-${month}-${year}`;

      const link = document.createElement("a");
      link.download = `lich-lam-viec-${suffix}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Lỗi chụp hình:", error);
      alert("Không chụp được hình. Vui lòng thử lại.");
    } finally {
      setCapturing(false);
    }
  };

  const stickyHeader =
    "weekly-sticky-cell sticky z-30 border border-slate-500 bg-slate-100";

  const stickyDayHeader =
    "border border-slate-500 bg-emerald-700 px-2 py-3 text-base font-bold text-white";

  const stickyEmployeeCell =
    "weekly-sticky-cell sticky z-20 border border-slate-300 bg-white";

  const visibleLabel =
    weekFilter === "all"
      ? `KỲ CÔNG: ${formatDate(monthlyDays[0])} – ${formatDate(
          monthlyDays[monthlyDays.length - 1],
        )}`
      : `TUẦN ${weekFilter + 1}: ${formatDate(
          visibleDays[0],
        )} – ${formatDate(visibleDays[visibleDays.length - 1])}`;

  return (
    <section
      className={`${CARD_CLASS} weekly-print-area overflow-hidden`}
    >
      {/* Thanh công cụ */}
      <div className="weekly-no-print flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Lịch làm việc theo tháng
          </h2>

          <p className="mt-1.5 text-sm text-slate-500">
            Kỳ công từ ngày 26 tháng trước đến ngày 25 tháng chọn.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Lọc theo tuần */}
          <label className="flex flex-col text-sm font-medium text-slate-600">
            <span className="mb-1">Lọc theo tuần</span>
            <select
              value={weekFilter === "all" ? "all" : String(weekFilter)}
              onChange={(e) =>
                setWeekFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              className="h-11 min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="all">Cả tháng</option>
              {weeks.map((week) => (
                <option key={week.index} value={week.index}>
                  Tuần {week.index + 1} ({formatDate(week.start).slice(0, 5)} –{" "}
                  {formatDate(week.end).slice(0, 5)})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleCapture}
            disabled={capturing || loading}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className="h-5 w-5" />
            {capturing ? "Đang chụp..." : "Chụp toàn bộ tháng"}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-semibold text-white hover:bg-blue-700"
          >
            <Eye className="h-5 w-5" />
            In / Lưu PDF
          </button>
        </div>
      </div>

      {/* Vùng nội dung */}
      <div
        ref={printRef}
        className="weekly-capture-content"
      >
        <div className="p-5">
          <div className="mb-5 text-center">
            <h2 className="text-3xl font-bold uppercase tracking-wide text-slate-900">
              LỊCH LÀM VIỆC NHÂN SỰ
            </h2>

            <p className="mt-2 text-lg font-semibold text-slate-700">
              {visibleLabel}
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-base text-slate-500">
              Đang tải lịch...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-base text-slate-500">
              Kỳ công tháng {month}/{year} chưa có bảng công. Hãy tạo
              bảng công ở tab “Bảng chấm công” trước nhé.
            </div>
          ) : (
            <div
              ref={tableScrollRef}
              className="weekly-table-scroll w-full max-w-full overflow-x-auto"
            >
              <table
                className="weekly-schedule-table w-full min-w-[850px] border-separate border-spacing-0 text-center text-base text-slate-900"
                style={{ tableLayout: "fixed" }}
              >
                <colgroup>
                  <col style={{ width: STT_WIDTH }} />
                  <col style={{ width: NAME_WIDTH }} />
                  <col style={{ width: POSITION_WIDTH }} />

                  {visibleDays.map((day) => (
                    <col
                      key={day}
                      style={{ width: DAY_WIDTH }}
                    />
                  ))}
                </colgroup>

                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className={`${stickyHeader} left-0 px-2 py-4 text-base`}
                      style={{
                        width: STT_WIDTH,
                        minWidth: STT_WIDTH,
                        left: 0,
                      }}
                    >
                      STT
                    </th>

                    <th
                      rowSpan={2}
                      className={`${stickyHeader} left-14 px-3 py-4 text-left text-base`}
                      style={{
                        width: NAME_WIDTH,
                        minWidth: NAME_WIDTH,
                        left: STT_WIDTH,
                      }}
                    >
                      TÊN NHÂN VIÊN
                    </th>

                    <th
                      rowSpan={2}
                      className={`${stickyHeader} left-[246px] px-3 py-4 text-base`}
                      style={{
                        width: POSITION_WIDTH,
                        minWidth: POSITION_WIDTH,
                        left: STT_WIDTH + NAME_WIDTH,
                      }}
                    >
                      CHỨC VỤ
                    </th>

                    {visibleDays.map((day) => (
                      <th
                        key={day}
                        className={stickyDayHeader}
                        style={{
                          width: DAY_WIDTH,
                          minWidth: DAY_WIDTH,
                        }}
                      >
                        {formatDate(day).slice(0, 5)}
                      </th>
                    ))}
                  </tr>

                  <tr>
                    {visibleDays.map((day) => {
                      const weekday = dateWeekday(day);

                      return (
                        <th
                          key={day}
                          className={`border border-slate-500 px-2 py-3 text-base font-semibold ${weekdayColors[weekday]}`}
                          style={{
                            width: DAY_WIDTH,
                            minWidth: DAY_WIDTH,
                          }}
                        >
                          {weekdayNames[weekday]}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((attendance, index) => (
                    <tr key={attendance._id}>
                      <td
                        className={`${stickyEmployeeCell} left-0 px-2 py-4 text-base italic`}
                        style={{
                          width: STT_WIDTH,
                          minWidth: STT_WIDTH,
                          left: 0,
                        }}
                      >
                        {index + 1}
                      </td>

                      <td
                        className={`${stickyEmployeeCell} left-14 px-3 py-4 text-left text-base font-semibold italic`}
                        style={{
                          width: NAME_WIDTH,
                          minWidth: NAME_WIDTH,
                          left: STT_WIDTH,
                        }}
                      >
                        {attendance.employeeName}
                      </td>

                      <td
                        className={`${stickyEmployeeCell} left-[246px] px-3 py-4 text-center text-base italic`}
                        style={{
                          width: POSITION_WIDTH,
                          minWidth: POSITION_WIDTH,
                          left: STT_WIDTH + NAME_WIDTH,
                        }}
                      >
                        {attendance.position ||
                          (typeof attendance.employee === "object"
                            ? getPosition(attendance.employee)
                            : "") ||
                          ""}
                      </td>

                      {visibleDays.map((day) => {
                        const record = attendance.dailyRecords?.find(
                          (item) => item.date === day,
                        );

                        let label = "—";
                        let color = "text-slate-400";

                        if (record) {
                          if (record.status === "OFF") {
                            label = "OFF";
                            color = "font-bold text-emerald-600";
                          } else if (record.status === "P") {
                            label = "P";
                            color = "font-bold text-blue-700";
                          } else if (record.status === "ABSENT") {
                            label = "VẮNG";
                            color = "font-bold text-rose-600";
                          } else if (record.status === "HOLIDAY") {
                            label = "LỄ";
                            color = "font-bold text-violet-600";
                          } else {
                            label = record.shiftTime
                              ? record.shiftTime
                              : record.shiftType
                                ? SHIFTS.find(
                                    (shift) =>
                                      shift.value === record.shiftType,
                                  )?.label || "X"
                                : "X";

                            color = "font-bold italic text-slate-900";
                          }
                        }

                        return (
                          <td
                            key={day}
                            className={`border border-slate-300 px-2 py-4 text-base ${color}`}
                            style={{
                              width: DAY_WIDTH,
                              minWidth: DAY_WIDTH,
                            }}
                          >
                            {label}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-base text-slate-600">
            <span><b>OFF</b>: Nghỉ tuần</span>
            <span><b>P</b>: Nghỉ phép</span>
            <span><b>VẮNG</b>: Vắng mặt</span>
            <span><b>LỄ</b>: Ngày lễ</span>
          </div>
        </div>
      </div>
    </section>
  );
}
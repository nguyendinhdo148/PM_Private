import {
  Users,
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  Clock3,
} from "lucide-react";
import { CARD_CLASS } from "../types/attendance";

type SummaryData = {
  work: number;
  off: number;
  leave: number;
  excessLeave: number;
  absent: number;
  ot: number;
};

type Props = {
  attendanceCount: number;
  summary: SummaryData;
};

const ITEMS = [
  {
    label: "Nhân viên có bảng công",
    key: "count" as const,
    icon: Users,
    tone: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    label: "Tổng ngày đi làm",
    key: "work" as const,
    icon: CalendarCheck,
    tone: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
  },
  {
    label: "Ngày nghỉ phép P",
    key: "leave" as const,
    icon: CalendarDays,
    tone: "from-amber-500 to-amber-600",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  {
    label: "Phép vượt định mức",
    key: "excessLeave" as const,
    icon: CircleAlert,
    tone: "from-rose-500 to-rose-600",
    bg: "bg-rose-50",
    text: "text-rose-600",
  },
  {
    label: "Giờ tăng ca",
    key: "ot" as const,
    icon: Clock3,
    tone: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
  },
];

export default function SummaryCards({ attendanceCount, summary }: Props) {
  const values: Record<(typeof ITEMS)[number]["key"], string | number> = {
    count: attendanceCount,
    work: summary.work,
    leave: summary.leave,
    excessLeave: summary.excessLeave,
    ot: `${summary.ot.toFixed(1)}h`,
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`${CARD_CLASS} group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            {/* gradient top border */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.tone}`} />

            <div className="flex items-start justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bg} ${item.text}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-3 text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {values[item.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
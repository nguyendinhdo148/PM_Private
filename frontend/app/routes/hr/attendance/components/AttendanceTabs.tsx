import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Clock3,
} from "lucide-react";

export type TabKey = "weekly" | "summary" | "attendance" | "overtime";

type Props = {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
};

const TABS = [
  { id: "weekly", label: "Lịch tuần", icon: CalendarDays },
  { id: "attendance", label: "Chấm công", icon: CalendarCheck },
  { id: "summary", label: "Tổng hợp", icon: BarChart3 },
  { id: "overtime", label: "Tăng ca", icon: Clock3 },
] satisfies { id: TabKey; label: string; icon: typeof CalendarDays }[];

export default function AttendanceTabs({ activeTab, onChange }: Props) {
  return (
    <div
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="tablist"
      aria-label="Các mục chấm công"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
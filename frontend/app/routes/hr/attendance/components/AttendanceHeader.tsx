import {
  CalendarCheck,
  CalendarRange,
  Building2,
  Search,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { MONTHS } from "../types/attendance";

type Props = {
  month: number;
  year: number;
  departmentFilter: string;
  search: string;
  departments: string[];
  loading: boolean;
  now: Date;
  onChangeMonth: (v: number) => void;
  onChangeYear: (v: number) => void;
  onChangeDepartment: (v: string) => void;
  onChangeSearch: (v: string) => void;
  onReset: () => void;
  onRefresh: () => void;
};

const baseInput =
  "h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function AttendanceHeader({
  month, year, departmentFilter, search, departments, loading, now,
  onChangeMonth, onChangeYear, onChangeDepartment, onChangeSearch,
  onReset, onRefresh,
}: Props) {
  const hasFilter =
    departmentFilter !== "all" || search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* === Title block === */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>Nhân sự</span>
            <span className="text-blue-300">/</span>
            <span>Chấm công</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quản lý chấm công
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Theo dõi ngày công, lịch phân ca, nghỉ phép và tăng ca của toàn bộ nhân sự.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 transition-transform ${loading ? "animate-spin" : "group-hover:rotate-90"}`}
          />
          Làm mới
        </button>
      </div>

      {/* === Filter toolbar === */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Month */}
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Tháng
            </label>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className={baseInput + " appearance-none pr-9"}
                value={month}
                onChange={(e) => onChangeMonth(Number(e.target.value))}
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                ▾
              </span>
            </div>
          </div>

          {/* Year */}
          <div className="lg:col-span-2">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Năm
            </label>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className={baseInput + " appearance-none pr-9"}
                value={year}
                onChange={(e) => onChangeYear(Number(e.target.value))}
              >
                {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                ▾
              </span>
            </div>
          </div>

          {/* Department */}
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Phòng ban
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                className={baseInput + " appearance-none pr-9"}
                value={departmentFilter}
                onChange={(e) => onChangeDepartment(e.target.value)}
              >
                <option value="all">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                ▾
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="lg:col-span-4">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Tìm nhân viên
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={baseInput}
                placeholder="Nhập tên hoặc mã nhân viên..."
                value={search}
                onChange={(e) => onChangeSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Reset */}
          <div className="flex items-end lg:col-span-1">
            <button
              type="button"
              onClick={onReset}
              disabled={!hasFilter}
              title="Xóa bộ lọc"
              className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-600"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {(departmentFilter !== "all" || search.trim()) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">Đang lọc:</span>
            {departmentFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Building2 className="h-3 w-3" />
                {departmentFilter}
                <button
                  type="button"
                  onClick={() => onChangeDepartment("all")}
                  className="ml-0.5 rounded-full text-blue-500 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            {search.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                <Search className="h-3 w-3" />
                "{search}"
                <button
                  type="button"
                  onClick={() => onChangeSearch("")}
                  className="ml-0.5 rounded-full text-slate-500 hover:text-slate-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
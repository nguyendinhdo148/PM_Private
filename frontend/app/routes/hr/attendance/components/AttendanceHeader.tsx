
import { useState, useRef, useEffect } from "react";
import {
  CalendarCheck,
  CalendarRange,
  Building2,
  Search,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { MONTHS } from "../types/attendance";

type Props = {
  month: number;
  year: number;
  departmentFilter: string[];
  search: string;
  departments: string[];
  loading: boolean;
  now: Date;
  onChangeMonth: (v: number) => void;
  onChangeYear: (v: number) => void;
  onChangeDepartment: (v: string[]) => void;
  onChangeSearch: (v: string) => void;
  onReset: () => void;
  onRefresh: () => void;
};

const baseInput =
  "h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function AttendanceHeader({
  month,
  year,
  departmentFilter,
  search,
  departments,
  loading,
  now,
  onChangeMonth,
  onChangeYear,
  onChangeDepartment,
  onChangeSearch,
  onReset,
  onRefresh,
}: Props) {
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const departmentRef = useRef<HTMLDivElement>(null);

  const hasFilter =
    departmentFilter.length > 0 || search.trim().length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        departmentRef.current &&
        !departmentRef.current.contains(event.target as Node)
      ) {
        setDepartmentOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDepartment = (department: string) => {
    const next = departmentFilter.includes(department)
      ? departmentFilter.filter((item) => item !== department)
      : [...departmentFilter, department];

    onChangeDepartment(next);
  };

  const selectAllDepartments = () => {
    onChangeDepartment([]);
  };

  return (
    <div className="space-y-5">
      {/* Title block */}
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
            className={`h-4 w-4 transition-transform ${
              loading ? "animate-spin" : "group-hover:rotate-90"
            }`}
          />
          Làm mới
        </button>
      </div>

      {/* Filter toolbar */}
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
                {Array.from(
                  { length: 7 },
                  (_, i) => now.getFullYear() - 3 + i
                ).map((v) => (
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

          {/* Multiple departments */}
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Phòng ban
            </label>

            <div className="relative" ref={departmentRef}>
              <button
                type="button"
                onClick={() => setDepartmentOpen((prev) => !prev)}
                aria-expanded={departmentOpen}
                className={`${baseInput} flex items-center justify-between text-left`}
              >
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                </span>

                <span className="truncate pr-2">
                  {departmentFilter.length === 0
                    ? "Tất cả phòng ban"
                    : `Đã chọn ${departmentFilter.length} phòng ban`}
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    departmentOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {departmentOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                    <span className="text-xs font-semibold text-slate-600">
                      Chọn phòng ban
                    </span>

                    <button
                      type="button"
                      onClick={selectAllDepartments}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {departments.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-slate-400">
                        Chưa có phòng ban
                      </p>
                    ) : (
                      departments.map((department) => {
                        const checked = departmentFilter.includes(department);

                        return (
                          <button
                            key={department}
                            type="button"
                            onClick={() => toggleDepartment(department)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                              checked
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                checked
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </span>

                            <span className="flex-1">{department}</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => setDepartmentOpen(false)}
                      className="h-9 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              )}
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
        {(departmentFilter.length > 0 || search.trim()) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-500">Đang lọc:</span>

            {departmentFilter.map((department) => (
              <span
                key={department}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
              >
                <Building2 className="h-3 w-3" />
                {department}

                <button
                  type="button"
                  onClick={() => toggleDepartment(department)}
                  aria-label={`Bỏ lọc ${department}`}
                  className="ml-0.5 rounded-full text-blue-500 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {search.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                <Search className="h-3 w-3" />
                "{search}"

                <button
                  type="button"
                  onClick={() => onChangeSearch("")}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="ml-0.5 rounded-full text-slate-500 hover:text-slate-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

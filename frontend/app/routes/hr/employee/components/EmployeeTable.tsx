import {
  Edit,
  Eye,
  FileText,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";

import type { Employee, EmployeeStatus } from "../types";
import { STATUS_OPTIONS } from "../constants";

const formatDate = (date?: string) => {
  if (!date) return "-";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleDateString("vi-VN");
};

const getStatusClass = (status?: EmployeeStatus) => {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "PROBATION":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "ON_LEAVE":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "RESIGNED":
      return "bg-slate-100 text-slate-600 border-slate-200";

    case "TERMINATED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

export function EmployeeTable({
  employees,
  loading,
  totalEmployees,
  page,
  totalPages,
  onDetail,
  onEdit,
  onDelete,
  onStatusChange,
  onPageChange,
  onTemplate,
}: {
  employees: Employee[];
  loading: boolean;
  totalEmployees: number;
  page: number;
  totalPages: number;
  onDetail: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void | Promise<void>;
  onStatusChange: (
    employee: Employee,
    status: EmployeeStatus,
  ) => void | Promise<void>;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
  onTemplate: (employee: Employee) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {[
                "Nhân viên",
                "Mã NV",
                "Chức vụ",
                "Phòng ban",
                "SĐT",
                "Ngày nhận việc",
                "Trạng thái",
              ].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left font-semibold text-slate-600"
                >
                  {label}
                </th>
              ))}

              <th className="px-4 py-3 text-right font-semibold text-slate-600">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-16 text-center text-slate-500"
                >
                  <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />

                  Đang tải danh sách nhân viên...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <UserPlus className="h-5 w-5 text-slate-400" />
                  </div>

                  <p className="mt-3 font-medium text-slate-700">
                    Chưa có nhân viên
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Hãy thêm nhân viên đầu tiên.
                  </p>
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee._id}
                  className="border-b border-slate-100 transition hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {employee.avatar?.url ? (
                          <img
                            src={employee.avatar.url}
                            alt={employee.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">
                            {employee.name
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onDetail(employee)}
                          className="truncate font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {employee.name}
                        </button>

                        <p className="truncate text-xs text-slate-500">
                          {employee.email || "Chưa có email"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {employee.workInfo?.employeeCode || "-"}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {employee.workInfo?.position || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {employee.workInfo?.department ? (
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {employee.workInfo.department}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {employee.phone || "-"}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(employee.workInfo?.startDate)}
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={employee.status}
                      onChange={(event) =>
                        void onStatusChange(
                          employee,
                          event.target.value as EmployeeStatus,
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium outline-none ${getStatusClass(
                        employee.status,
                      )}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {/* Xem hồ sơ */}
                      <button
                        type="button"
                        onClick={() => onDetail(employee)}
                        title="Xem hồ sơ"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Biểu mẫu */}
                      <button
                        type="button"
                        onClick={() => onTemplate(employee)}
                        title="Biểu mẫu"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 hover:bg-violet-50"
                      >
                        <FileText className="h-4 w-4" />
                      </button>

                      {/* Chỉnh sửa */}
                      <button
                        type="button"
                        onClick={() => onEdit(employee)}
                        title="Chỉnh sửa"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {/* Xóa */}
                      <button
                        type="button"
                        onClick={() => void onDelete(employee)}
                        title="Xóa"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <p className="text-sm text-slate-500">
          Tổng{" "}
          <span className="font-semibold text-slate-700">
            {totalEmployees}
          </span>{" "}
          nhân viên
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              onPageChange((current) =>
                Math.max(current - 1, 1),
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>

          <span className="text-sm text-slate-600">
            Trang {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              onPageChange((current) =>
                Math.min(current + 1, totalPages),
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
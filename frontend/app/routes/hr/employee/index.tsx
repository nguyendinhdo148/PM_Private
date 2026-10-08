import type { Employee, EmployeeForm, EmployeeStatus } from "./types";

import { EMPTY_FORM, STATUS_OPTIONS } from "./constants";

import { employeeToForm, formToPayload } from "./utils/employee-form";

import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
  updateEmployeeStatus,
} from "./services/employee-api";

import { exportEmployeesToExcel } from "./utils/excel";

import { EmployeeModal } from "./components/EmployeeModal";
import { EmployeeDetailModal } from "./components/EmployeeDetailModal";
import { EmployeeTable } from "./components/EmployeeTable";
import { EmployeeTemplateModal } from "./components/EmployeeTemplateModal";

import { useEffect, useMemo, useState } from "react";

import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";

import { toast } from "sonner";

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [departmentFilter, setDepartmentFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [totalEmployees, setTotalEmployees] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);

  const [templateOpen, setTemplateOpen] = useState(false);

  const [templateEmployee, setTemplateEmployee] =
    useState<Employee | null>(null);

  const [editingEmployee, setEditingEmployee] =
    useState<Employee | null>(null);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [form, setForm] = useState<EmployeeForm>(
    structuredClone(EMPTY_FORM),
  );

  const [saving, setSaving] = useState(false);

  const [exporting, setExporting] = useState(false);

  async function loadEmployees() {
    try {
      setLoading(true);

      const data = await getEmployees({
        search,
        department: departmentFilter,
        status: statusFilter,
        page,
        limit: 20,
      });

      setEmployees(data.employees || []);

      setTotalPages(data.pagination?.totalPages || 1);

      setTotalEmployees(data.pagination?.total || 0);
    } catch (error) {
      console.error("loadEmployees:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách nhân viên",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEmployees();
  }, [page, search, departmentFilter, statusFilter]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map((employee) => employee.workInfo?.department)
            .filter(
              (value): value is string => Boolean(value),
            ),
        ),
      ).sort(),
    [employees],
  );

  const resetFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(structuredClone(EMPTY_FORM));
    setModalOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setForm(employeeToForm(employee));
    setModalOpen(true);
  };

  const openDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailOpen(true);
  };

  const openTemplate = (employee: Employee) => {
    setTemplateEmployee(employee);
    setTemplateOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập họ và tên");
      return;
    }

    try {
      setSaving(true);

      const payload = formToPayload(form);

      if (editingEmployee) {
        await updateEmployee(editingEmployee._id, payload);

        toast.success("Cập nhật nhân viên thành công");
      } else {
        await createEmployee(payload);

        toast.success("Thêm nhân viên thành công");
      }

      setModalOpen(false);

      await loadEmployees();
    } catch (error) {
      console.error("handleSubmit:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu nhân viên",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa nhân viên "${employee.name}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteEmployee(employee._id);

      toast.success("Xóa nhân viên thành công");

      await loadEmployees();
    } catch (error) {
      console.error("handleDelete:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa nhân viên",
      );
    }
  };

  const handleStatusChange = async (
    employee: Employee,
    status: EmployeeStatus,
  ) => {
    try {
      await updateEmployeeStatus(employee._id, status);

      toast.success("Cập nhật trạng thái thành công");

      await loadEmployees();
    } catch (error) {
      console.error("handleStatusChange:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái",
      );
    }
  };

  const exportExcel = async () => {
    try {
      setExporting(true);

      const loadAllEmployees = async () => {
        const first = await getEmployees({
          search,
          department: departmentFilter,
          status: statusFilter,
          page: 1,
          limit: 100,
        });

        const total = first.pagination?.totalPages || 1;

        if (total === 1) {
          return first.employees || [];
        }

        const pages = await Promise.all(
          Array.from(
            { length: total },
            (_, index) =>
              getEmployees({
                search,
                department: departmentFilter,
                status: statusFilter,
                page: index + 1,
                limit: 100,
              }),
          ),
        );

        return pages.flatMap(
          (item) => item.employees || [],
        );
      };

      const count = await exportEmployeesToExcel(
        employees,
        loadAllEmployees,
      );

      toast.success(
        `Đã xuất ${count} nhân viên ra Excel`,
      );
    } catch (error) {
      console.error("exportExcel:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xuất Excel",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <UserPlus className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hồ sơ Nhân sự
            </h1>

            <p className="text-sm text-slate-500">
              Quản lý thông tin nhân viên và hồ sơ nhân sự.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadEmployees()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Làm mới
          </button>

          <button
            type="button"
            onClick={() => void exportExcel()}
            disabled={exporting || loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}

            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />

            Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Tổng nhân viên"
          value={totalEmployees}
        />

        <SummaryCard
          label="Đang làm việc"
          value={
            employees.filter(
              (item) => item.status === "ACTIVE",
            ).length
          }
        />

        <SummaryCard
          label="Thử việc"
          value={
            employees.filter(
              (item) => item.status === "PROBATION",
            ).length
          }
        />

        <SummaryCard
          label="Nghỉ việc"
          value={
            employees.filter(
              (item) =>
                item.status === "RESIGNED" ||
                item.status === "TERMINATED",
            ).length
          }
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên, mã NV, SĐT, email, CCCD..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(event) => {
              setDepartmentFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tất cả phòng ban</option>

            {departments.map((department) => (
              <option
                key={department}
                value={department}
              >
                {department}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tất cả trạng thái</option>

            {STATUS_OPTIONS.map((status) => (
              <option
                key={status.value}
                value={status.value}
              >
                {status.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      <EmployeeTable
        employees={employees}
        loading={loading}
        totalEmployees={totalEmployees}
        page={page}
        totalPages={totalPages}
        onDetail={openDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        onPageChange={setPage}
        onTemplate={openTemplate}
      />

      {modalOpen && (
        <EmployeeModal
          form={form}
          setForm={setForm}
          editingEmployee={editingEmployee}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      {detailOpen && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setDetailOpen(false)}
          onEdit={() => {
            setDetailOpen(false);
            openEdit(selectedEmployee);
          }}
        />
      )}

      {templateOpen && templateEmployee && (
        <EmployeeTemplateModal
          employee={templateEmployee}
          onClose={() => {
            setTemplateOpen(false);
            setTemplateEmployee(null);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value.toLocaleString("vi-VN")}
      </p>
    </div>
  );
}
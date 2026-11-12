import type { Employee, EmployeeForm, EmployeeStatus } from "./types";

import { EMPTY_FORM, STATUS_OPTIONS } from "./constants";

import { employeeToForm, formToPayload } from "./utils/employee-form";
import html2canvas from "html2canvas-pro";
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

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Network,
  ChevronDown,
  ChevronRight,
  Users,
  GripVertical,
  Camera,
} from "lucide-react";

import { toast } from "sonner";

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [activeView, setActiveView] = useState<"list" | "organization">("list");
  const [loadingAllEmployees, setLoadingAllEmployees] = useState(false);

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

  async function loadAllEmployees() {
    try {
      setLoadingAllEmployees(true);

      const first = await getEmployees({
        search: "",
        department: "",
        status: "",
        page: 1,
        limit: 100,
      });

      const totalPagesAll = first.pagination?.totalPages || 1;

      if (totalPagesAll <= 1) {
        setAllEmployees(first.employees || []);
        return first.employees || [];
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPagesAll - 1 }, (_, index) =>
          getEmployees({
            search: "",
            department: "",
            status: "",
            page: index + 2,
            limit: 100,
          }),
        ),
      );

      const completeList = [
        ...(first.employees || []),
        ...remainingPages.flatMap((item) => item.employees || []),
      ];

      setAllEmployees(completeList);
      return completeList;
    } catch (error) {
      console.error("loadAllEmployees:", error);
      toast.error("Không thể tải đầy đủ danh sách nhân viên");
      return employees;
    } finally {
      setLoadingAllEmployees(false);
    }
  }

  useEffect(() => {
    void loadEmployees();
  }, [page, search, departmentFilter, statusFilter]);

  useEffect(() => {
    void loadAllEmployees();
  }, []);

  const handleOrganizationManagerChange = async (
    employee: Employee,
    managerId: string | null,
  ) => {
    try {
      const payload = formToPayload(employeeToForm(employee)) as any;
      payload.workInfo = {
        ...payload.workInfo,
        organizationLevel: employee.workInfo?.organizationLevel || "EMPLOYEE",
        managerId,
      };

      await updateEmployee(employee._id, payload);
      await loadAllEmployees();
      toast.success(
        managerId
          ? `Đã chuyển ${employee.name} vào nhánh quản lý mới`
          : `Đã đưa ${employee.name} về cấp chưa có quản lý`,
      );
    } catch (error) {
      console.error("handleOrganizationManagerChange:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật người quản lý",
      );
      throw error;
    }
  };

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

      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveView("list")}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeView === "list"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Danh sách nhân viên
        </button>
        <button
          type="button"
          onClick={() => setActiveView("organization")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeView === "organization"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Network className="h-4 w-4" />
          Sơ đồ tổ chức
        </button>
      </div>

      {activeView === "organization" ? (
        <OrganizationChart
          employees={allEmployees.length ? allEmployees : employees}
          loading={loadingAllEmployees}
          onEmployeeClick={openDetail}
          onManagerChange={handleOrganizationManagerChange}
        />
      ) : (
        <>
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
        </>
      )}

      {modalOpen && (
        <EmployeeModal
          form={form}
          setForm={setForm}
          editingEmployee={editingEmployee}
          employees={allEmployees.length ? allEmployees : employees}
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

type OrganizationLevel =
  | "DIRECTOR"
  | "MANAGER"
  | "DEPARTMENT_HEAD"
  | "EMPLOYEE";

const ORGANIZATION_LEVELS: Record<
  OrganizationLevel,
  { label: string; color: string; dot: string }
> = {
  DIRECTOR: {
    label: "Giám đốc",
    color: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  MANAGER: {
    label: "Quản lý",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  DEPARTMENT_HEAD: {
    label: "Trưởng bộ phận",
    color: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  EMPLOYEE: {
    label: "Nhân viên",
    color: "border-slate-200 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};

function getEmployeeManagerId(employee: Employee): string | null {
  const managerId = employee.workInfo?.managerId as
    | string
    | { _id?: string }
    | null
    | undefined;

  if (typeof managerId === "string") return managerId;
  return managerId?._id || null;
}

function OrganizationEmployeeCard({
  employee,
  onClick,
  compact = false,
}: {
  employee: Employee;
  onClick: () => void;
  compact?: boolean;
}) {
  const level =
    (employee.workInfo?.organizationLevel as OrganizationLevel) ||
    "EMPLOYEE";
  const meta = ORGANIZATION_LEVELS[level] || ORGANIZATION_LEVELS.EMPLOYEE;

  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: employee._id });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: employee._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setDropNodeRef}
      className={`relative min-w-0 rounded-xl transition ${
        isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""
      }`}
    >
      <div ref={setDragNodeRef} style={style} className="relative">
        <button
          type="button"
          onClick={onClick}
          title={`${employee.name} · ${employee.workInfo?.position || meta.label}`}
          className={`group flex min-w-0 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md ${
            compact
              ? "min-h-[54px] px-2 py-1.5 pr-7"
              : "min-h-[68px] px-2.5 py-2 pr-8"
          }`}
        >
          {employee.avatar?.url ? (
            <img
              src={employee.avatar.url}
              alt={employee.name}
              width={compact ? 28 : 36}
              height={compact ? 28 : 36}
              style={{
                width: compact ? 28 : 36,
                height: compact ? 28 : 36,
                minWidth: compact ? 28 : 36,
                maxWidth: compact ? 28 : 36,
                minHeight: compact ? 28 : 36,
                maxHeight: compact ? 28 : 36,
                flex: "0 0 auto",
                objectFit: "cover",
                borderRadius: "50%",
                display: "block",
              }}
              className="shrink-0"
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700 ${
                compact ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-sm"
              }`}
            >
              {(employee.name || "?").trim().charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-slate-800 group-hover:text-blue-700">
              {employee.name}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              {employee.workInfo?.position || meta.label}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-1">
              <span
                className={`max-w-[110px] truncate rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${meta.color}`}
              >
                {meta.label}
              </span>
              {employee.workInfo?.department && (
                <span className="max-w-[70px] truncate rounded-full bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-500">
                  {employee.workInfo.department}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-blue-500" />
        </button>

        <button
          type="button"
          {...attributes}
          {...listeners}
          data-capture-hide
          onClick={(event) => event.stopPropagation()}
          title="Kéo để đổi người quản lý"
          aria-label={`Kéo ${employee.name} để đổi người quản lý`}
          className="absolute right-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 cursor-grab items-center justify-center rounded-md text-slate-300 hover:bg-blue-50 hover:text-blue-600 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {isOver && (
        <span className="pointer-events-none absolute -bottom-5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-blue-600 px-2 py-0.5 text-[9px] font-medium text-white shadow">
          Thả để chuyển quản lý
        </span>
      )}
    </div>
  );
}

function OrganizationRootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "organization-root" });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-dashed px-4 py-2 text-center text-[10px] transition ${
        isOver
          ? "border-blue-400 bg-blue-50 text-blue-700"
          : "border-slate-300 bg-white/70 text-slate-400"
      }`}
    >
      {isOver
        ? "Thả để đưa về cấp chưa có quản lý"
        : "Kéo nhân viên vào đây để bỏ quản lý trực tiếp"}
    </div>
  );
}

function OrganizationTreeBranch({
  employee,
  employeesByManager,
  onEmployeeClick,
  onManagerChange,
  path,
  depth = 0,
}: {
  employee: Employee;
  employeesByManager: Map<string, Employee[]>;
  onEmployeeClick: (employee: Employee) => void;
  onManagerChange: (employee: Employee, managerId: string | null) => Promise<void>;
  path: Set<string>;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = (employeesByManager.get(employee._id) || []).filter(
    (child) => !path.has(child._id),
  );

  const nextPath = new Set(path);
  nextPath.add(employee._id);

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative z-10 w-full">
        <OrganizationEmployeeCard
          employee={employee}
          onClick={() => onEmployeeClick(employee)}
        />

        {children.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="absolute -bottom-2.5 left-1/2 z-20 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
            aria-label={expanded ? "Thu gọn cấp dưới" : "Mở rộng cấp dưới"}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {expanded && children.length > 0 && (
        <>
          <div className="h-5 w-px bg-slate-300" />
          <div className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5">
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-semibold text-slate-500">
                Nhân viên trực thuộc
              </span>
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                {children.length}
              </span>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-2">
              {children.map((child) => (
                <div
                  key={child._id}
                  className="w-full min-w-[220px] max-w-[280px] flex-1"
                >
                  <OrganizationTreeBranch
                    employee={child}
                    employeesByManager={employeesByManager}
                    onEmployeeClick={onEmployeeClick}
                    onManagerChange={onManagerChange}
                    path={nextPath}
                    depth={depth + 1}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OrganizationChart({
  employees,
  loading,
  onEmployeeClick,
  onManagerChange,
}: {
  employees: Employee[];
  loading: boolean;
  onEmployeeClick: (employee: Employee) => void;
  onManagerChange: (employee: Employee, managerId: string | null) => Promise<void>;
}) {
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [savingDrop, setSavingDrop] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const chartRef = useRef<HTMLElement | null>(null);

  const captureOrganizationChart = async () => {
    const element = chartRef.current;
    if (!element || capturing) return;

    try {
      setCapturing(true);

      // Đợi React cập nhật giao diện, font và ảnh đại diện trước khi chụp.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map(async (img) => {
          if (!img.complete) {
            await new Promise<void>((resolve) => {
              const finish = () => resolve();
              img.addEventListener("load", finish, { once: true });
              img.addEventListener("error", finish, { once: true });
            });
          }
          if (img.complete && img.naturalWidth > 0 && typeof img.decode === "function") {
            try {
              await img.decode();
            } catch {
              // Một số trình duyệt báo decode lỗi dù ảnh đã hiển thị; vẫn tiếp tục chụp.
            }
          }
        }),
      );

      const width = Math.ceil(Math.max(element.scrollWidth, element.clientWidth));
      const height = Math.ceil(Math.max(element.scrollHeight, element.clientHeight));
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;

      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width,
        height,
        // Giữ viewport giống màn hình đang hiển thị, không lấy chiều rộng sơ đồ
        // làm viewport vì sẽ khiến các breakpoint responsive bị thay đổi.
        windowWidth: viewportWidth,
        windowHeight: viewportHeight,
        onclone: (clonedDocument) => {
          const clonedElement = clonedDocument.querySelector<HTMLElement>(
            "[data-organization-capture]",
          );

          if (clonedElement) {
            // Tailwind/CSS production đôi khi không được html2canvas clone
            // áp dụng đầy đủ. Sao chép computed style từ DOM thật sang DOM clone.
            const copyComputedStyles = (source: Element, target: Element) => {
              const sourceStyle = window.getComputedStyle(source);
              const targetStyle = (target as HTMLElement | SVGElement).style;

              for (let index = 0; index < sourceStyle.length; index += 1) {
                const property = sourceStyle.item(index);
                targetStyle.setProperty(
                  property,
                  sourceStyle.getPropertyValue(property),
                  sourceStyle.getPropertyPriority(property),
                );
              }

              const sourceChildren = Array.from(source.childNodes);
              const targetChildren = Array.from(target.childNodes);
              sourceChildren.forEach((sourceChild, index) => {
                const targetChild = targetChildren[index];
                if (
                  sourceChild instanceof Element &&
                  targetChild instanceof Element
                ) {
                  copyComputedStyles(sourceChild, targetChild);
                }
              });
            };

            copyComputedStyles(element, clonedElement);

            // Đảm bảo vùng chụp chứa toàn bộ sơ đồ và không bị cắt chiều cao.
            clonedElement.style.width = `${width}px`;
            clonedElement.style.height = `${height}px`;
            clonedElement.style.minHeight = `${height}px`;
            clonedElement.style.maxHeight = "none";
            clonedElement.style.overflow = "visible";
            clonedElement.style.boxSizing = "border-box";
          }

          // Ẩn các nút kéo/thả và vùng hướng dẫn chỉ dùng trên giao diện.
          clonedDocument
            .querySelectorAll<HTMLElement>("[data-capture-hide]")
            .forEach((item) => {
              item.style.display = "none";
            });

          // Khóa kích thước avatar trong DOM clone, tránh ảnh bị bung về kích thước gốc.
          clonedDocument
            .querySelectorAll<HTMLImageElement>("[data-organization-capture] img")
            .forEach((img) => {
              const sourceImage = images.find(
                (source) => source.getAttribute("src") === img.getAttribute("src"),
              );
              if (sourceImage) {
                const computed = window.getComputedStyle(sourceImage);
                img.style.width = computed.width;
                img.style.height = computed.height;
                img.style.minWidth = computed.minWidth;
                img.style.maxWidth = computed.maxWidth;
                img.style.minHeight = computed.minHeight;
                img.style.maxHeight = computed.maxHeight;
                img.style.objectFit = computed.objectFit;
                img.style.flex = computed.flex;
                img.style.borderRadius = computed.borderRadius;
                img.style.display = "block";
              }
            });
        },
      });

      const link = document.createElement("a");
      link.download = `so-do-to-chuc-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Đã lưu ảnh sơ đồ tổ chức");
    } catch (error) {
      console.error("captureOrganizationChart:", error);
      toast.error("Không thể chụp sơ đồ tổ chức");
    } finally {
      setCapturing(false);
    }
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeEmployees = employees.filter(
    (employee) =>
      employee.status !== "RESIGNED" &&
      employee.status !== "TERMINATED",
  );

  const activeIds = new Set(activeEmployees.map((employee) => employee._id));
  const employeesByManager = new Map<string, Employee[]>();

  // Quan hệ cha-con chỉ lấy từ managerId trong form.
  // organizationLevel chỉ dùng để tô nhãn, không dùng để quyết định tầng.
  activeEmployees.forEach((employee) => {
    const managerId = getEmployeeManagerId(employee);

    if (
      !managerId ||
      managerId === employee._id ||
      !activeIds.has(managerId)
    ) {
      return;
    }

    const reports = employeesByManager.get(managerId) || [];
    reports.push(employee);
    employeesByManager.set(managerId, reports);
  });

  const sortByName = (a: Employee, b: Employee) =>
    a.name.localeCompare(b.name, "vi");

  employeesByManager.forEach((reports) => reports.sort(sortByName));

  const roots = activeEmployees
    .filter((employee) => {
      const managerId = getEmployeeManagerId(employee);
      return (
        !managerId ||
        managerId === employee._id ||
        !activeIds.has(managerId)
      );
    })
    .sort((a, b) => {
      const levelA =
        (a.workInfo?.organizationLevel as OrganizationLevel) || "EMPLOYEE";
      const levelB =
        (b.workInfo?.organizationLevel as OrganizationLevel) || "EMPLOYEE";

      return (
        (levelA === "DIRECTOR" ? -1 : 0) -
          (levelB === "DIRECTOR" ? -1 : 0) ||
        sortByName(a, b)
      );
    });

  // Phát hiện các bản ghi bị mắc vòng lặp managerId để không làm mất người.
  const visited = new Set<string>();
  const visit = (employee: Employee, ancestors: Set<string>) => {
    if (ancestors.has(employee._id) || visited.has(employee._id)) return;

    visited.add(employee._id);
    const next = new Set(ancestors);
    next.add(employee._id);

    (employeesByManager.get(employee._id) || []).forEach((child) =>
      visit(child, next),
    );
  };

  roots.forEach((root) => visit(root, new Set()));

  const orphanedByCycle = activeEmployees
    .filter((employee) => !visited.has(employee._id))
    .sort(sortByName);

  const treeRoots = [...roots, ...orphanedByCycle];
  const director =
    treeRoots.find(
      (employee) =>
        (employee.workInfo?.organizationLevel as OrganizationLevel) ===
        "DIRECTOR",
    ) || treeRoots[0];

  const directorChildren = director
    ? employeesByManager.get(director._id) || []
    : [];

  const otherRoots = treeRoots.filter(
    (employee) => employee._id !== director?._id,
  );

  const departmentCount = new Set(
    activeEmployees
      .map((employee) => employee.workInfo?.department)
      .filter(Boolean),
  ).size;

  const assignedCount = activeEmployees.filter((employee) => {
    const managerId = getEmployeeManagerId(employee);
    return Boolean(
      managerId &&
        managerId !== employee._id &&
        activeIds.has(managerId),
    );
  }).length;

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">
            Đang tải sơ đồ tổ chức...
          </p>
        </div>
      </div>
    );
  }

  if (!activeEmployees.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <Network className="mx-auto h-8 w-8 text-blue-500" />
        <h3 className="mt-3 font-semibold text-slate-800">
          Chưa có dữ liệu tổ chức
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Nhân viên đang làm việc sẽ được hiển thị tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Sơ đồ tổ chức
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Quan hệ cấp trên – cấp dưới theo người quản lý trực tiếp
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center">
              <p className="text-base font-bold text-slate-900">
                {activeEmployees.length}
              </p>
              <p className="text-[10px] text-slate-500">Nhân sự</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center">
              <p className="text-base font-bold text-slate-900">
                {departmentCount}
              </p>
              <p className="text-[10px] text-slate-500">Phòng ban</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center">
              <p className="text-base font-bold text-slate-900">
                {assignedCount}
              </p>
              <p className="text-[10px] text-slate-500">Có quản lý</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
          {Object.entries(ORGANIZATION_LEVELS).map(([key, item]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 text-[11px] text-slate-600"
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Cơ cấu phân cấp
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Kéo biểu tượng ⋮ trên thẻ nhân viên và thả vào thẻ người quản lý mới để đổi nhánh
            </p>
          </div>
          <button
            type="button"
            onClick={() => void captureOrganizationChart()}
            disabled={capturing || savingDrop}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {capturing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {capturing ? "Đang chụp..." : "Chụp sơ đồ"}
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={async (event: DragEndEvent) => {
            const draggedId = String(event.active.id);
            const targetId = event.over ? String(event.over.id) : null;
            if (!targetId || draggedId === targetId) return;

            const draggedEmployee = activeEmployees.find((item) => item._id === draggedId);
            const targetEmployee =
              targetId === "organization-root"
                ? null
                : activeEmployees.find((item) => item._id === targetId);

            if (!draggedEmployee) return;
            if (targetId !== "organization-root" && !targetEmployee) return;

            // Chặn việc kéo một người vào chính nhánh cấp dưới của họ.
            let cursor: string | null = targetEmployee?._id || null;
            const checked = new Set<string>();
            while (cursor && !checked.has(cursor)) {
              if (cursor === draggedId) {
                toast.error("Không thể chuyển nhân viên vào nhánh cấp dưới của chính họ");
                return;
              }
              checked.add(cursor);
              const parent = activeEmployees.find((item) => item._id === cursor);
              cursor = parent ? getEmployeeManagerId(parent) : null;
            }

            const nextManagerId = targetEmployee?._id || null;
            if (getEmployeeManagerId(draggedEmployee) === nextManagerId) return;

            try {
              setSavingDrop(true);
              await onManagerChange(draggedEmployee, nextManagerId);
            } catch {
              // Hàm cha đã hiển thị thông báo lỗi.
            } finally {
              setSavingDrop(false);
            }
          }}
        >
        <section
          ref={chartRef}
          data-organization-capture
          className="bg-gradient-to-b from-slate-50/80 to-white px-3 py-5 sm:px-5"
        >
          <div className="mb-3 flex justify-center">
            <div data-capture-hide><OrganizationRootDropZone /></div>
          </div>
          {director && (
            <div className="mx-auto flex w-full max-w-[230px] flex-col items-center">
              <OrganizationEmployeeCard
                employee={director}
                onClick={() => onEmployeeClick(director)}
              />
              {directorChildren.length > 0 && (
                <div className="h-6 w-px bg-slate-300" />
              )}
            </div>
          )}

          {directorChildren.length > 0 && (
            <>
              <div className="mx-auto h-px w-[92%] bg-slate-300" />
              <div className="mx-auto flex w-full flex-wrap items-start justify-center gap-x-3 gap-y-6 pt-3">
                {directorChildren.map((child) => (
                  <div
                    key={child._id}
                    className="w-full min-w-[260px] max-w-[286px] flex-1"
                  >
                    <OrganizationTreeBranch
                      employee={child}
                      employeesByManager={employeesByManager}
                      onEmployeeClick={onEmployeeClick}
                      onManagerChange={onManagerChange}
                      path={new Set([director._id])}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {otherRoots.length > 0 && (
            <div className="mt-6 border-t border-dashed border-slate-200 pt-4">
              <p className="mb-3 text-[10px] font-semibold text-slate-500">
                Chưa có quản lý trực tiếp / nhánh độc lập
              </p>
              <div className="flex flex-wrap items-start justify-center gap-3">
                {otherRoots.map((root) => (
                  <div
                    key={root._id}
                    className="w-full min-w-[260px] max-w-[286px] flex-1"
                  >
                    <OrganizationTreeBranch
                      employee={root}
                      employeesByManager={employeesByManager}
                      onEmployeeClick={onEmployeeClick}
                      onManagerChange={onManagerChange}
                      path={new Set()}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        </DndContext>
      </section>

      {savingDrop && (
        <div className="text-center text-[11px] font-medium text-blue-600">
          Đang lưu thay đổi phân công quản lý...
        </div>
      )}

      {orphanedByCycle.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Có {orphanedByCycle.length} nhân viên nằm trong quan hệ quản lý bị vòng lặp.
          </p>
          <p className="mt-1 text-[10px] text-amber-800">
            Tạm hiển thị thành nhánh riêng để không bị mất khỏi sơ đồ. Hãy kiểm tra lại người quản lý trực tiếp của các nhân viên này.
          </p>
        </section>
      )}
    </div>
  );
}


import { Header } from "@/components/layout/header";
import { fetchData } from "@/lib/fetch-util";
import type { Workspace } from "@/types";
import { useState } from "react";
import { Link } from "react-router";

export const clientLoader = async () => {
  try {
    const [workspaces] = await Promise.all([
      fetchData("/workspaces"),
    ]);

    return {
      workspaces: workspaces ?? [],
    };
  } catch (error) {
    console.error("Portal loader error:", error);

    return {
      workspaces: [],
    };
  }
};

const modules = [
  {
    title: "Hệ thống quản lý",
    description:
      "Quản lý công nợ, doanh thu, tips, hoa hồng rượu, quỹ, hủy món và các nghiệp vụ quản lý hiện tại.",
    icon: "📊",
    path: "/dashboard",
    available: true,
  },
  {
    title: "Nhân sự",
    description:
      "Quản lý nhân viên, phòng ban, chấm công, nghỉ phép, tiền lương và các nghiệp vụ nhân sự.",
    icon: "👥",
    path: "/hr",
    available: false,
  },
];

export default function Portal() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleWorkspaceSelected = (workspace: Workspace) => {
    console.log("Workspace selected:", workspace);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header dùng lại Header hiện tại */}
      <Header
        selectedWorkspace={null}
        onWorkspaceSelected={handleWorkspaceSelected}
        onCreateWorkspace={() => {}}
        onMobileMenuToggle={() =>
          setIsMobileMenuOpen(!isMobileMenuOpen)
        }
      />

      <main className="min-h-[calc(100vh-64px)]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          {/* Welcome */}
          <section className="mb-10">
            <p className="mb-2 text-sm font-medium text-slate-500">
              TRUNG TÂM HỆ THỐNG
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Chào mừng bạn trở lại 👋
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-500">
              Chọn hệ thống bạn muốn làm việc để tiếp tục.
            </p>
          </section>

          {/* Modules */}
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Các hệ thống
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Truy cập nhanh vào các hệ thống quản lý của doanh nghiệp.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {modules.map((module) => (
                <div
                  key={module.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                >
                  {/* Icon */}
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-4xl transition-transform duration-200 group-hover:scale-105">
                    {module.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-slate-900">
                    {module.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                    {module.description}
                  </p>

                  {/* Button */}
                  <div className="mt-8">
                    {module.available ? (
                      <Link
                        to={module.path}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Truy cập

                        <span className="transition-transform duration-200 group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-400"
                      >
                        Sắp ra mắt
                      </button>
                    )}
                  </div>

                  {/* Decoration */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-slate-50 transition-transform duration-300 group-hover:scale-125" />
                </div>
              ))}
            </div>
          </section>

          {/* Quick Access */}
          <section className="mt-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Truy cập nhanh
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Các hệ thống bạn thường xuyên sử dụng sẽ xuất hiện tại đây.
              </p>

              <div className="mt-5">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Mở hệ thống quản lý
                  <span>→</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-xs text-slate-400">
          <span>Company ERP</span>

          <span>Hệ thống quản lý doanh nghiệp</span>
        </div>
      </footer>
    </div>
  );
}
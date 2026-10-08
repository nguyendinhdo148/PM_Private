import { Header } from "@/components/layout/header";
import { fetchData } from "@/lib/fetch-util";
import type { Workspace } from "@/types";
import { ArrowRight, BarChart3, Building2, Users } from "lucide-react";
import { Link } from "react-router";

/*
 * Header hiện tại sử dụng useLoaderData()
 * để lấy danh sách workspaces.
 *
 * Vì Portal không nằm trong dashboard-layout,
 * nên Portal cần cung cấp loader riêng cho Header.
 */
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
      "Quản lý công nợ, doanh thu, tips, hoa hồng rượu, quỹ và các nghiệp vụ vận hành.",
    icon: BarChart3,
    path: "/dashboard",
  },
  {
    title: "Hệ thống Nhân sự",
    description:
      "Quản lý phòng ban, hồ sơ nhân sự, hợp đồng và các nghiệp vụ quản lý nhân sự.",
    icon: Users,
    path: "/hr",
  },
];

export default function Portal() {
  const handleWorkspaceSelected = (workspace: Workspace) => {
    console.log("Workspace selected:", workspace);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ================= HEADER DÙNG CHUNG ================= */}
      <Header
        selectedWorkspace={null}
        onWorkspaceSelected={handleWorkspaceSelected}
        onCreateWorkspace={() => {}}
      />

      {/* ================= MAIN ================= */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Welcome */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Building2 className="h-4 w-4" />
            <span>TRUNG TÂM HỆ THỐNG</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Chào mừng bạn trở lại
            <span className="ml-2">👋</span>
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
            Chọn hệ thống bạn muốn làm việc để tiếp tục.
          </p>
        </section>

        {/* ================= MODULES ================= */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Hệ thống
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Các hệ thống quản lý của MaximSaigon.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <div
                  key={module.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                >
                  {/* Decoration */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-slate-50 transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative">
                    {/* Icon */}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors duration-200 group-hover:bg-slate-900 group-hover:text-white">
                      <Icon className="h-7 w-7" />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-slate-900">
                      {module.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-3 min-h-[56px] max-w-xl text-sm leading-6 text-slate-500">
                      {module.description}
                    </p>

                    {/* Button */}
                    <div className="mt-7">
                      <Link
                        to={module.path}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Truy cập hệ thống

                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
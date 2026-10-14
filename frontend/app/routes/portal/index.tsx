import { Header } from "@/components/layout/header";
import { fetchData } from "@/lib/fetch-util";
import type { Workspace } from "@/types";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Users,
  GraduationCap,
} from "lucide-react";
import { Link } from "react-router";

export const clientLoader = async () => {
  try {
    const [workspaces] = await Promise.all([fetchData("/workspaces")]);
    return { workspaces: workspaces ?? [] };
  } catch (error) {
    console.error("Portal loader error:", error);
    return { workspaces: [] };
  }
};

const modules = [
  {
    title: "Hệ thống quản lý",
    description:
      "Quản lý công nợ, doanh thu, tips, hoa hồng rượu, quỹ và các nghiệp vụ vận hành.",
    icon: BarChart3,
    path: "/dashboard",
    theme: "default",
    ctaLabel: "Truy cập hệ thống",
  },
  {
    title: "Hệ thống Nhân sự",
    description:
      "Quản lý phòng ban, hồ sơ nhân sự, hợp đồng và các nghiệp vụ quản lý nhân sự.",
    icon: Users,
    path: "/hr",
    theme: "default",
    ctaLabel: "Truy cập hệ thống",
  },
  {
    title: "Đào tạo",
    description:
      "Học ngoại ngữ, quản lý bài học, luyện nghe, phát âm và theo dõi tiến độ học tập.",
    icon: GraduationCap,
    path: "/training",
    theme: "training",
    ctaLabel: "Vào trung tâm đào tạo",
  },
];

export default function Portal() {
  const handleWorkspaceSelected = (workspace: Workspace) => {
    console.log("Workspace selected:", workspace);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        selectedWorkspace={null}
        onWorkspaceSelected={handleWorkspaceSelected}
        onCreateWorkspace={() => {}}
      />

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

        {/* Modules */}
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Hệ thống</h2>
            <p className="mt-1 text-sm text-slate-500">
              Các hệ thống quản lý và đào tạo của MaximSaigon.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              const isTraining = module.theme === "training";

              return (
                // 👇 Cả card là 1 Link → bấm chỗ nào cũng đi
                <Link
                  key={module.title}
                  to={module.path}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    isTraining
                      ? "border-indigo-200 hover:border-indigo-300"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full transition-transform duration-500 group-hover:scale-125 ${
                      isTraining ? "bg-indigo-50" : "bg-slate-50"
                    }`}
                  />

                  <div className="relative">
                    <div
                      className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-colors duration-200 ${
                        isTraining
                          ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                          : "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white"
                      }`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900">
                      {module.title}
                    </h3>

                    <p className="mt-3 min-h-[72px] max-w-xl text-sm leading-6 text-slate-500">
                      {module.description}
                    </p>

                    {/* Không dùng <Link> nữa, chỉ hiện "nút giả" để giữ giao diện */}
                    <div className="mt-7">
                      <span
                        className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition ${
                          isTraining
                            ? "bg-indigo-600 group-hover:bg-indigo-700"
                            : "bg-slate-900 group-hover:bg-slate-800"
                        }`}
                      >
                        {module.ctaLabel}
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
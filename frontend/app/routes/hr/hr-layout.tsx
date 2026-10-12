import { Header } from "@/components/layout/header";
import { fetchData } from "@/lib/fetch-util";
import { cn } from "@/lib/utils";
import { useAuth } from "@/provider/auth-context";
import type { Workspace } from "@/types";
import {
  BarChart3,
  CalendarCheck,
  Calculator,
  FileText,
  Landmark,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router";

export const clientLoader = async () => {
  try {
    const [workspaces] = await Promise.all([fetchData("/workspaces")]);
    return { workspaces: workspaces ?? [] };
  } catch (error) {
    console.error("HR loader error:", error);
    return { workspaces: [] };
  }
};

const hrMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/hr", end: true },
  { title: "Hồ sơ Nhân sự", icon: Users, path: "/hr/employee" },
  { title: "Quản lý Chấm công", icon: CalendarCheck, path: "/hr/attendance" },
  { title: "Quản lý Tăng ca", icon: Timer, path: "/hr/overtime" },
  { title: "Bảng lương Gross", icon: Calculator, path: "/hr/gross-salary" },
  { title: "Khấu trừ Bảo hiểm", icon: ShieldCheck, path: "/hr/insurance" },
  { title: "Khấu trừ Thuế (TNCN)", icon: Landmark, path: "/hr/tax" },
  { title: "Bảng Thực lĩnh (Net)", icon: BarChart3, path: "/hr/net-salary" },
  { title: "Tổng hợp Kỳ lương", icon: FileText, path: "/hr/payroll" },
  { title: "Tin nhắn nội bộ", icon: MessageCircle, path: "/hr/messages" },
  { title: "Cài đặt hệ thống", icon: Settings, path: "/hr/settings" },
];

const STORAGE_KEY = "hr-sidebar-collapsed";

const HRLayout = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  /* Load trạng thái từ localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Đang tải...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* =====================================================
          SIDEBAR HR
      ===================================================== */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-slate-200 bg-white transition-all duration-300 md:flex md:flex-col",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* ================= LOGO + TOGGLE ================= */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-slate-200",
            collapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {!collapsed && (
            <NavLink to="/portal" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img
                  src="/logo/logotab2.jpg"
                  alt="MaximSaigon"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  MaximSaigon
                </p>
                <p className="truncate text-xs text-slate-500">
                  Hệ thống Nhân sự
                </p>
              </div>
            </NavLink>
          )}

          {collapsed && (
            <NavLink
              to="/portal"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white"
            >
              <img
                src="/logo/logotab2.jpg"
                alt="MaximSaigon"
                className="h-full w-full object-contain"
              />
            </NavLink>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900",
              collapsed && "hidden",
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Nút mở khi collapsed */}
        {collapsed && (
          <div className="flex justify-center border-b border-slate-200 py-2">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Mở rộng menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ================= MENU ================= */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-1">
            {hrMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  title={collapsed ? item.title : undefined}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-2" : "px-3",
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* ================= USER ================= */}
        <div
          className={cn(
            "border-t border-slate-200",
            collapsed ? "p-2" : "p-3",
          )}
        >
          {user && !collapsed && (
            <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="truncate text-xs font-semibold text-slate-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-lg text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900",
              collapsed ? "justify-center px-2" : "px-3",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          selectedWorkspace={null}
          onWorkspaceSelected={(workspace: Workspace) => {
            console.log("Workspace selected:", workspace);
          }}
          onCreateWorkspace={() => {}}
        />

        <main className="flex-1 overflow-y-auto">
          {/* ✅ BỎ max-w-7xl + mx-auto → nội dung tràn full width */}
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default HRLayout;
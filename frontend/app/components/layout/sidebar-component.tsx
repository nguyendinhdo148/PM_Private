import { cn } from "@/lib/utils";
import { useAuth } from "@/provider/auth-context";
import { useChatUnreadCount } from "@/hooks/use-chat";
import type { Workspace } from "@/types";
import {
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  ListCheck,
  LogOut,
  Settings,
  Users,
  FolderTree,
  MessageCircle,
  GlassWater,
  FileWarning,
  Wine,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { SidebarNav } from "./sidebar-nav";

const STORAGE_KEY = "main-sidebar-collapsed";

export const SidebarComponent = ({
  currentWorkspace,
  onMobileMenuClose,
}: {
  currentWorkspace: Workspace | null;
  onMobileMenuClose?: () => void;
}) => {
  const { user, logout, hasRole } = useAuth();
  const { totalUnreadCount } = useChatUnreadCount();
  const [isCollapsed, setIsCollapsed] = useState(false);

  /* Load trạng thái từ localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setIsCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const allNavItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Công nợ", href: "/workspaces", icon: Users },
    { title: "Báo cáo doanh thu", href: "/my-tasks", icon: ListCheck },
    { title: "Đã post & Chưa post", href: "/backlog", icon: FolderTree },
    { title: "Chia Tips", href: "/members", icon: Users },
    {
      title: "Hoa Hồng Rượu",
      href: "/wine-commission",
      icon: GlassWater,
    },
    {
      title: "Hệ Thống Hủy Món",
      href: "/cancel-report",
      icon: FileWarning,
    },
    {
      title: "GUI Rượu",
      href: "/gui-ruou",
      icon: Wine,
      roles: ["bar", "admin"],
    },
    {
      title: "Quản lý Quỹ",
      href: "/fund-management",
      icon: Wallet,
      roles: ["manager", "admin"],
    },
    {
      title: "Messenger",
      href: "/achieved",
      icon: MessageCircle,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const navItems = allNavItems;

  return (
    <div
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* ================= HEADER / LOGO ================= */}
      <div
        className={cn(
          "group relative flex items-center border-b border-border",
          isCollapsed ? "justify-center px-2 py-4" : "px-3 py-4",
        )}
      >
        {/* Logo — bấm vào về /portal */}
        <Link
          to="/portal"
          title="Về trang chủ hệ thống"
          className={cn(
            "flex items-center gap-3 overflow-hidden",
            isCollapsed ? "justify-center" : "flex-1",
          )}
        >
          {!isCollapsed ? (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                <img
                  src="/logo/logotab2.jpg"
                  alt="MaximSaigon"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="truncate text-lg font-bold tracking-wide text-black">
                MaximSaigon
              </span>
            </>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
              <img
                src="/logo/logotab2.jpg"
                alt="MaximSaigon"
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </Link>

        {/* Toggle Collapse Button — chỉ hiện khi expanded */}
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            title="Thu gọn menu"
            className="
              absolute right-2 top-1/2 -translate-y-1/2
              h-7 w-7 hidden md:flex
              opacity-0 group-hover:opacity-100
              transition-all duration-200
              bg-muted/50 hover:bg-muted
            "
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nút mở rộng — hiện khi collapsed */}
      {isCollapsed && (
        <div className="hidden justify-center border-b border-border py-2 md:flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            title="Mở rộng menu"
            className="h-8 w-8 bg-muted/50 hover:bg-muted"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ================= MENU ================= */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-2 py-3">
          <SidebarNav
            items={navItems}
            isCollapsed={isCollapsed}
            className={cn(isCollapsed && "items-center space-y-1")}
            currentWorkspace={currentWorkspace}
            onNavigate={onMobileMenuClose}
            unreadMessageCount={totalUnreadCount}
          />
        </div>
      </ScrollArea>

      {/* ================= FOOTER ================= */}
      <div className="space-y-3 border-t border-border p-3">
        {/* User Info */}
        {!isCollapsed && user && (
          <div className="rounded-lg border border-border/50 bg-surface px-2 py-2">
            <p className="truncate text-xs font-medium text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "sm"}
          onClick={logout}
          title={isCollapsed ? "Logout" : undefined}
          className={cn(
            "h-9 w-full justify-start gap-2 text-muted-foreground hover:text-foreground",
            isCollapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
};
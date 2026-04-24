import { cn } from "@/lib/utils";
import type { Workspace } from "@/types";
import { Icon, type LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router";

interface SidebarNavProps extends React.HtmlHTMLAttributes<HTMLElement> {
  items: {
    title: string;
    href: string;
    icon: LucideIcon;
  }[];
  isCollapsed: boolean;
  currentWorkspace: Workspace | null;
  onNavigate?: () => void;
}

export const SidebarNav = ({
  items,
  isCollapsed,
  className,
  currentWorkspace,
  onNavigate,
  ...props
}: SidebarNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className={cn("flex flex-col gap-y-2", className)} {...props}>
      {items.map((el) => {
        const Icon = el.icon;
        const isActive =
          location.pathname === el.href ||
          location.pathname.startsWith(`${el.href}/`);

        const handleClick = () => {
          if (el.href === "/workspaces") {
            navigate(el.href);
          } else if (currentWorkspace && currentWorkspace._id) {
            navigate(`${el.href}?workspaceId=${currentWorkspace._id}`);
          } else {
            navigate(el.href);
          }
          onNavigate?.();
        };

        return (
          <Button
            key={el.href}
            variant={isActive ? "outline" : "ghost"}
            className={cn(
              "justify-start",
              isActive && "bg-blue-800/20 text-blue-600 font-medium",
            )}
            onClick={handleClick}
          >
            <Icon className="size-5" />
            {isCollapsed ? (
              <span className="sr-only">{el.title}</span>
            ) : (
              el.title
            )}
          </Button>
        );
      })}
    </nav>
  );
};

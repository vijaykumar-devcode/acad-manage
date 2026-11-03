import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Bell, Search, Menu } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Simple breadcrumb/title logic based on path
  const getPageTitle = (pathname: string) => {
    if (pathname === "/") return "Dashboard";
    const path = pathname.split("/")[1];
    return path ? path.charAt(0).toUpperCase() + path.slice(1) : "Dashboard";
  };

  const title = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-surface border-b border-surface-border px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-canvas-alt transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
          <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2">
            <span>AcadeManage</span>
            <span>/</span>
            <span className="text-slate-700 font-medium">{title}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-64 relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <label htmlFor="header-search" className="sr-only">
            Search
          </label>
          <input
            id="header-search"
            name="header-search"
            type="text"
            autoComplete="off"
            placeholder="Search..."
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-surface-border bg-canvas-alt text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={() => navigate("/notices")}
          className="relative p-2 rounded-lg text-slate-500 hover:bg-canvas-alt transition-colors cursor-pointer"
          title="View Notices"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface"></span>
        </button>

        <div className="flex items-center gap-3 border-l border-surface-border pl-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-tight">
              {user?.name}
            </p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <UserAvatar
            name={user?.name}
            avatarUrl={user?.avatarUrl}
            className="h-9 w-9 shadow-sm"
          />
        </div>
      </div>
    </header>
  );
}

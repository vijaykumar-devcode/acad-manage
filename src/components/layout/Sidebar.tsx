import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Search,
  BarChart,
  LogOut,
  User,
  Archive,
  Shield,
  Trophy,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();

  const navItems = [
    {
      name: "Dashboard",
      to: "/",
      icon: LayoutDashboard,
      roles: ["Student", "Faculty", "Admin", "admin"],
    },
    {
      name: "Challenges",
      to: "/challenges",
      icon: Trophy,
      roles: ["Student", "Faculty", "Admin", "admin"],
    },
    {
      name: "Classes",
      to: "/classes",
      icon: Users,
      roles: ["Student", "Faculty", "Admin", "admin"],
    },
    {
      name: "Study Materials",
      to: "/study-materials",
      icon: BookOpen,
      roles: ["Student", "Faculty"],
    },
    {
      name: "Assignments",
      to: "/assignments",
      icon: FileText,
      roles: ["Student", "Faculty"],
    },
    {
      name: "Quizzes",
      to: "/quizzes",
      icon: ClipboardList,
      roles: ["Student", "Faculty"],
    },
    { name: "Marks", to: "/marks", icon: BarChart, roles: ["Faculty"] },
    {
      name: "Results",
      to: "/results",
      icon: FileText,
      roles: ["Student", "Faculty"],
    },
    { name: "PYQs", to: "/pyqs", icon: Archive, roles: ["Student", "Faculty"] },
    {
      name: "Search",
      to: "/search",
      icon: Search,
      roles: ["Student", "Faculty", "Admin", "admin"],
    },
    {
      name: "Profile",
      to: "/profile",
      icon: User,
      roles: ["Student", "Faculty", "Admin", "admin"],
    },
    {
      name: "Admin Console",
      to: "/admin",
      icon: Shield,
      roles: ["Admin", "admin"],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64 bg-sidebar text-slate-300 print:hidden transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-center h-16 bg-sidebar border-b border-sidebar-hover shrink-0 px-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            AcadeManage
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-3">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "hover:bg-sidebar-hover hover:text-white",
                )
              }
              onClick={onClose}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="p-4 bg-sidebar-hover/30 border-t border-sidebar-hover mt-auto">
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-sidebar-hover hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

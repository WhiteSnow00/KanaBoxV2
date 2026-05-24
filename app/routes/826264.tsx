import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Outlet,
  useLocation,
} from "@remix-run/react";
import { useState } from "react";
import {
  LayoutDashboard,
  UserPlus,
  Archive,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { ObjectId } from "mongodb";
import { archiveCustomer } from "~/models/customer.server";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  if (intent === "archive") {
    const customerId = String(formData.get("customerId") || "");
    if (!customerId || !ObjectId.isValid(customerId)) {
      return json({ ok: false, error: "ID thành viên không hợp lệ" }, { status: 400 });
    }
    try {
      const archived = await archiveCustomer(customerId);
      if (!archived) {
        return json({ ok: false, error: "Không tìm thấy thành viên" }, { status: 404 });
      }
      return json({ ok: true, customerId });
    } catch (error) {
      console.error("Error archiving customer:", error);
      return json({ ok: false, error: "Lưu trữ thành viên thất bại" }, { status: 500 });
    }
  }
  return json({ ok: false, error: "Thao tác không hợp lệ" }, { status: 400 });
}
function AdminNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    {
      to: "/826264",
      label: "Bảng điều khiển",
      icon: LayoutDashboard,
      exact: false,
    },
    {
      to: "/826264/customers/new",
      label: "Thêm thành viên",
      icon: UserPlus,
      exact: true,
    },
    {
      to: "/826264/customers/archived",
      label: "Thành viên lưu trữ",
      icon: Archive,
      exact: true,
    },
  ];
  const isActive = (path: string, exact: boolean) =>
    exact ? currentPath === path : currentPath.startsWith(path);
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/826264" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500">
                <span className="text-xs font-bold text-white">K</span>
              </div>
              <span className="text-sm font-semibold text-white">Quản trị</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(item.to, item.exact)
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Trang công khai
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
          <div className="px-3 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.to, item.exact)
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Trang công khai
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminNavigation />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

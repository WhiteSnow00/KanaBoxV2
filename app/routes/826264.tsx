import {
  Link,
  Outlet,
  useLocation,
} from "@remix-run/react";
import { useState } from "react";

function AdminNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center">
            <Link to="/826264" className="text-lg sm:text-xl font-bold text-white">
              Quản trị
            </Link>
            <div className="hidden md:flex ml-10 items-baseline space-x-4">
              <Link
                to="/826264"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/826264")
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
              >
                Bảng điều khiển
              </Link>
              <Link
                to="/826264/customers/new"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive("/826264/customers/new")
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
              >
                Thêm thành viên
              </Link>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-gray-400 hover:text-white"
            >
              Xem trang công khai →
            </Link>
          </div>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-700">
          <div className="px-2 py-3 space-y-1 sm:px-3">
            <Link
              to="/826264"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive("/826264")
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
            >
              Bảng điều khiển
            </Link>
            <Link
              to="/826264/customers/new"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive("/826264/customers/new")
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
            >
              Thêm thành viên
            </Link>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white"
            >
              Xem trang công khai →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

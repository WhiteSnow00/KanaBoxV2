import {
  Link,
  Outlet,
  useLocation,
} from "@remix-run/react";

function AdminNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCustomersActive = currentPath.startsWith("/826264/customers");

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/826264" className="text-xl font-bold text-white">
              Quản trị
            </Link>
            <div className="hidden md:block ml-10 flex items-baseline space-x-4">
              <Link
                to="/826264"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/826264")
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                Bảng điều khiển
              </Link>
              <Link
                to="/826264/customers/new"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/826264/customers/new")
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                Thêm thành viên
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-gray-400 hover:text-white"
            >
              Xem trang công khai →
            </Link>
          </div>
        </div>
      </div>
      <div className="md:hidden border-t border-gray-700">
        <div className="px-2 py-3 space-y-1 sm:px-3">
          <Link
            to="/826264"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive("/826264")
                ? "bg-gray-800 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Bảng điều khiển
          </Link>
          <Link
            to="/826264/customers/new"
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive("/826264/customers/new")
                ? "bg-gray-800 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            Thêm thành viên
          </Link>
          <Link
            to="/"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white"
          >
            Xem trang công khai →
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

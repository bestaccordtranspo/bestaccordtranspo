import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Navigation,
  FileText,
  Truck,
  Users,
  User,
  Archive,
  LogOut,
  Menu,
  Package,
  UserRoundCheck,
} from "lucide-react";
import logo from "../assets/bestaccord_logo.png";

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const role = localStorage.getItem("role");

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Booking", path: "/dashboard/booking", icon: <Package size={20} /> },
    { name: "Monitoring", path: "/dashboard/monitoring", icon: <Navigation size={20} /> },
    { name: "Billing", path: "/dashboard/trip-report", icon: <FileText size={20} /> },
  ];

  if (role === "admin") {
    menuItems.push(
      { name: "Vehicle", path: "/dashboard/vehicle", icon: <Truck size={20} /> },
      { name: "Driver/Helper", path: "/dashboard/employee", icon: <Users size={20} /> },
      { name: "Client", path: "/dashboard/client", icon: <User size={20} /> },
      { name: "Staff", path: "/dashboard/staff", icon: <UserRoundCheck size={20} /> },
      { name: "Archive", path: "/dashboard/archive", icon: <Archive size={20} /> },
      // { name: "Pending Staff", path: "/dashboard/pending-staff", icon: <Users size={20} /> }
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${isSidebarCollapsed ? "w-20" : "w-72"
          } fixed left-0 top-0 bottom-0 z-40 bg-purple-950 text-white flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-2xl border-r border-slate-700`}
      >
        {/* Subtle background pattern overlay */}
        <div className="absolute inset-0 pointer-events-none"></div>

        <div className="flex-1 relative z-10">
          {/* Header Section: Toggle + Logo */}
          <div
            className={`flex items-center ${isSidebarCollapsed
              ? "flex-col gap-3"
              : "flex-row justify-between px-4"
              } p-4 transition-all duration-300`}
          >
            {/* Logo */}
            <div className="relative">
              {isSidebarCollapsed ? (
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <img src={logo} alt="Company Logo" className="w-6 h-auto" />
                </div>
              ) : (
                <div className="text-center">
                  <img
                    src={logo}
                    alt="Company Logo"
                    className="w-36 h-auto mx-auto drop-shadow-lg"
                  />
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="bg-white/10 backdrop-blur-sm text-white p-2 rounded-lg border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 transform hover:scale-105 group"
            >
              <Menu
                size={18}
                className="transition-transform duration-300 group-hover:rotate-90"
              />
            </button>
          </div>

          {/* Menu Items */}
          <nav
            className={`space-y-2 transition-all duration-300 ${isSidebarCollapsed ? "px-3 pb-4" : "px-4 pb-4"
              }`}
          >
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  `group flex items-center transition-all duration-300 rounded-xl relative overflow-hidden ${isSidebarCollapsed ? "p-3 justify-center" : "p-4"
                  } ${isActive
                    ? "bg-purple-500 shadow-lg shadow-purple-500/25 text-white"
                    : "hover:bg-white/10 hover:shadow-lg hover:shadow-black/20 text-slate-300 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && !isSidebarCollapsed && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-white rounded-r-full"></div>
                    )}

                    {/* Icon container */}
                    <div
                      className={`flex-shrink-0 relative ${isActive ? "text-white" : "group-hover:text-white"
                        } transition-all duration-300 ${isSidebarCollapsed && isActive ? "text-blue-400" : ""
                        }`}
                    >
                      {item.icon}
                      {/* Pulse animation for active collapsed items */}
                      {isActive && isSidebarCollapsed && (
                        <div className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></div>
                      )}
                    </div>

                    {/* Text with smooth transitions */}
                    {!isSidebarCollapsed && (
                      <span
                        className={`ml-4 text-sm font-medium whitespace-nowrap transition-all duration-300 ${isActive
                          ? "text-white"
                          : "text-slate-300 group-hover:text-white"
                          }`}
                      >
                        {item.name}
                      </span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-purple-950 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 border border-slate-600">
                        {item.name}
                        <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-600"></div>
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Logout Section */}
        <div
          className={`border-t border-slate-700 bg-purple-950 relative z-10 ${isSidebarCollapsed ? "p-3" : "p-4"
            }`}
        >
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`group flex items-center w-full rounded-xl transition-all duration-300 text-slate-300 hover:text-white hover:bg-red-600/20 hover:shadow-lg ${isSidebarCollapsed ? "p-3 justify-center" : "p-4"
              }`}
          >
            <div className="flex-shrink-0 relative">
              <LogOut
                size={20}
                className="group-hover:text-red-400 transition-colors duration-300"
              />
            </div>
            {!isSidebarCollapsed && (
              <span className="ml-4 text-sm font-medium whitespace-nowrap">
                Logout
              </span>
            )}

            {/* Tooltip for collapsed logout */}
            {isSidebarCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-purple-950 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 border border-slate-600">
                Logout
                <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-600"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950 to-purple-800 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                  <LogOut size={24} />
                </div>
                <h3 className="text-xl font-semibold">Confirm Logout</h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-600 text-base">
                Are you sure you want to logout? You'll need to sign in again to access your dashboard.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-950 to-purple-800 text-white rounded-xl font-medium hover:from-purple-900 hover:to-purple-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isSidebarCollapsed ? "ml-20" : "ml-72"} flex-1 min-w-0 bg-gray-50 transition-all duration-300 h-screen overflow-auto`}>
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
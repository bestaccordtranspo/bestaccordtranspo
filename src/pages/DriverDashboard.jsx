// src/pages/DriverDashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  ArrowLeft,
  Calendar,
  ClipboardList,
  History,
} from "lucide-react";
import DriverProfile from "./DriverProfile";
import DriverBookings from "./DriverBookings";
import DriverSchedule from "./DriverSchedule";
import DriverHistory from "./DriverHistory";
import { useDriverBookingCount } from "../hooks/useDriverBookingCount";
import logo from "../assets/bestaccord_logo.png";
import driverloginbg from "../assets/driver_login_bg.png";

export default function DriverDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("home");
  const navigate = useNavigate();

  // Get booking count for notification badge
  const { bookingCount, loading: countLoading } = useDriverBookingCount();

  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    navigate("/driver-login");
  };

  const goBack = () => setActivePage("home");

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: `url(${driverloginbg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Subtle overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-purple-800/50 to-indigo-900/50"></div>

      {/* Decorative background elements - subtle */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-60 sm:h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-60 sm:h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-32 h-32 sm:w-40 sm:h-40 bg-purple-400/5 rounded-full blur-2xl"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-white/10 backdrop-blur-2xl border-b border-white/20 shadow-lg">
        {activePage !== "home" ? (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={goBack}
            className="flex items-center text-white font-medium hover:text-purple-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" /> Back
          </motion.button>
        ) : (
          <div className="flex-1 flex justify-center">
            {/* Company Logo */}
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={logo}
              alt="Company Logo"
              className="h-12 w-auto object-contain mx-auto"
            />
          </div>
        )}

        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors backdrop-blur-sm"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {activePage === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center p-6 h-full"
            >
              <div className="grid gap-6 w-full max-w-sm">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePage("bookings")}
                  className="relative w-full py-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl text-xl font-semibold flex items-center justify-center space-x-3 text-white hover:bg-white/15 transition-all group"
                >
                  <ClipboardList className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  <span>Bookings</span>

                  {/* Notification Badge */}
                  {!countLoading && bookingCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-sm font-bold rounded-full h-8 w-8 flex items-center justify-center shadow-lg border-2 border-white/30"
                    >
                      {bookingCount > 99 ? "99+" : bookingCount}
                    </motion.div>
                  )}

                  {/* Loading indicator for badge */}
                  {countLoading && (
                    <div className="absolute -top-2 -right-2 bg-white/20 rounded-full h-7 w-7 flex items-center justify-center border-2 border-purple-800">
                      <div className="animate-pulse bg-white/40 rounded-full h-4 w-4"></div>
                    </div>
                  )}
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePage("schedule")}
                  className="w-full py-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl text-xl font-semibold flex items-center justify-center space-x-3 text-white hover:bg-white/15 transition-all group"
                >
                  <Calendar className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  <span>Schedule</span>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActivePage("history")}
                  className="w-full py-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl text-xl font-semibold flex items-center justify-center space-x-3 text-white hover:bg-white/15 transition-all group"
                >
                  <History className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  <span>History</span>
                </motion.button>

                {/* Welcome Message */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 p-4 bg-purple-600/10 backdrop-blur-sm rounded-2xl border border-purple-400/20 text-center"
                >
                  <p className="text-purple-200 text-sm">
                    Welcome back! Ready for your deliveries today?
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activePage === "bookings" && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <DriverBookings />
            </motion.div>
          )}

          {activePage === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <DriverSchedule />
            </motion.div>
          )}

          {activePage === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <DriverHistory />
            </motion.div>
          )}

          {activePage === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="h-full"
            >
              <DriverProfile />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 w-64 h-full bg-white/95 backdrop-blur-2xl shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-purple-100">
                <h2 className="text-lg font-bold bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent">
                  Menu
                </h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <X className="w-5 h-5 text-purple-900" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 p-4 space-y-4">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setActivePage("profile");
                  }}
                  className="flex items-center w-full p-3 rounded-2xl text-purple-900 hover:bg-purple-50 transition-all group"
                >
                  <div className="p-2 bg-purple-100 rounded-lg mr-3 group-hover:bg-purple-200 transition-colors">
                    <User className="w-5 h-5 text-purple-700" />
                  </div>
                  <span className="font-medium">Profile</span>
                </button>
              </div>

              {/* Logout */}
              <div className="p-4 border-t border-purple-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full p-3 rounded-2xl text-red-600 hover:bg-red-50 transition-all group"
                >
                  <div className="p-2 bg-red-100 rounded-lg mr-3 group-hover:bg-red-200 transition-colors">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

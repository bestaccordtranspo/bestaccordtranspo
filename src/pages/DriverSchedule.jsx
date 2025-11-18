import React, { useState, useEffect } from "react";
import { axiosClient } from "../api/axiosClient";

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Package,
  X,
  Truck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function DriverSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "list"

  // Fetch driver's bookings
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("driverToken");

      if (!token) {
        setError("No driver token found. Please log in again.");
        setLoading(false);
        return;
      }

      const res = await axiosClient.get("/api/driver/bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setBookings(res.data.bookings);
      } else {
        setError("Failed to fetch bookings");
      }
    } catch (err) {
      console.error("❌ Error fetching bookings for schedule:", err);

      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem("driverToken");
      } else {
        setError(err.response?.data?.msg || "Failed to load schedule.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Debug function to check if bookings have dates and are being filtered correctly
  const debugBookingDates = () => {
    if (bookings.length > 0) {
      console.log("📅 Debug - Total bookings:", bookings.length);
      bookings.forEach((booking, index) => {
        const bookingDate = new Date(booking.dateNeeded);
        console.log(`Booking ${index + 1}:`, {
          id: booking._id,
          company: booking.companyName,
          dateNeeded: booking.dateNeeded,
          parsedDate: bookingDate.toDateString(),
          status: booking.status,
        });
      });
    }
  };

  // Call debug function when bookings change
  useEffect(() => {
    if (bookings.length > 0) {
      debugBookingDates();
    }
  }, [bookings]);

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getBookingsForDate = (date) => {
    const filtered = bookings.filter((booking) => {
      if (!booking.dateNeeded) return false;

      const bookingDate = new Date(booking.dateNeeded);
      const targetDate = new Date(date);

      // Set time to 00:00:00 for both dates to compare only the date part
      bookingDate.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      const matches = bookingDate.getTime() === targetDate.getTime();

      if (matches) {
        console.log(`📅 Found booking for ${targetDate.toDateString()}:`, {
          company: booking.companyName,
          status: booking.status,
          bookingDate: bookingDate.toDateString(),
          targetDate: targetDate.toDateString(),
        });
      }

      return matches;
    });

    return filtered;
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openBookingModal = (booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  const refreshSchedule = async () => {
    await fetchBookings();
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const statusColors = {
    Pending: "bg-yellow-500",
    "Ready to go": "bg-blue-500",
    "In Transit": "bg-purple-500",
    "On Trip": "bg-purple-500",
    Delivered: "bg-green-500",
    Completed: "bg-gray-500",
  };

  // Get upcoming bookings for list view
  const getUpcomingBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings
      .filter((booking) => new Date(booking.dateNeeded) >= today)
      .sort((a, b) => new Date(a.dateNeeded) - new Date(b.dateNeeded))
      .slice(0, 10); // Show next 10 bookings
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-purple-400/50 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-purple-400/50 rounded w-3/4"></div>
              <div className="h-4 bg-purple-400/50 rounded w-1/2"></div>
            </div>
          </div>
          <p className="text-center mt-4 text-purple-200">
            Loading schedule...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Schedule Error</h2>
          <p className="text-red-300 mb-4 text-sm">{error}</p>
          <button
            onClick={refreshSchedule}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="max-w-sm mx-auto px-4 py-6">
        {/* Mobile Header */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              My Schedule
            </h1>
            <button
              onClick={refreshSchedule}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
              title="Refresh Schedule"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white/10 rounded-lg p-1 mb-4">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                viewMode === "calendar"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition ${
                viewMode === "list"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              List
            </button>
          </div>

          {/* Month Navigation - Only show in calendar view */}
          {viewMode === "calendar" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={previousMonth}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <h2 className="text-lg font-semibold text-white">
                  {monthName}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>

              <button
                onClick={goToToday}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                Go to Today
              </button>
            </>
          )}

          {/* Summary */}
          <div className="mt-4 text-center">
            <p className="text-purple-200 text-sm">
              {bookings.length} total booking{bookings.length !== 1 ? "s" : ""}{" "}
              assigned
            </p>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4">
            {/* Mobile Calendar Grid - Compact */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div
                  key={`day-header-${index}`}
                  className="text-center font-semibold text-purple-200 py-2 text-sm"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days - Mobile optimized */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="bg-white/5 rounded-lg p-1 h-12 opacity-50"
                ></div>
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const date = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                const dayBookings = getBookingsForDate(date);
                const isToday =
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();

                return (
                  <div
                    key={`calendar-day-${day}`}
                    className={`bg-white/5 backdrop-blur-sm border rounded-lg p-1 h-12 hover:bg-white/10 transition relative ${
                      isToday
                        ? "border-purple-400 border-2 bg-purple-400/10"
                        : "border-white/10"
                    }`}
                    onClick={() => {
                      if (dayBookings.length > 0) {
                        if (dayBookings.length === 1) {
                          openBookingModal(dayBookings[0]);
                        } else {
                          // Show all bookings for the day
                          const allBookingsText = dayBookings
                            .map((b) => `${b.companyName} - ${b.timeNeeded}`)
                            .join("\n");
                          alert(
                            `Bookings for ${date.toDateString()}:\n\n${allBookingsText}`
                          );
                        }
                      }
                    }}
                  >
                    <div
                      className={`text-xs font-semibold ${
                        isToday ? "text-purple-300" : "text-white"
                      }`}
                    >
                      {day}
                    </div>

                    {/* Booking indicators - Enhanced visibility */}
                    {dayBookings.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center">
                        <div
                          className={`w-3 h-3 rounded-full border border-white/50 ${
                            statusColors[dayBookings[0].status] || "bg-gray-500"
                          } shadow-sm`}
                        ></div>
                        {dayBookings.length > 1 && (
                          <div className="w-2 h-2 rounded-full bg-white border border-purple-300 ml-1 shadow-sm"></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Legend - Compact */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <h3 className="text-xs font-semibold text-white mb-2">Status:</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusColors).map(([status, color], index) => (
                  <div
                    key={`status-${index}-${status}`}
                    className="flex items-center gap-1"
                  >
                    <div className={`w-3 h-3 ${color} rounded`}></div>
                    <span className="text-xs text-purple-200">
                      {status === "In Transit" ? "On Trip" : status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* No bookings message */}
            {bookings.length === 0 && (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Bookings
                </h3>
                <p className="text-purple-200 text-sm">
                  You don't have any bookings scheduled yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Upcoming Bookings
              </h3>

              {getUpcomingBookings().length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                  <p className="text-purple-200 text-sm">
                    No upcoming bookings
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getUpcomingBookings().map((booking, index) => (
                    <div
                      key={`booking-${booking._id}-${index}`}
                      onClick={() => openBookingModal(booking)}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition"
                    >
                      {/* Date and Status */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-sm text-purple-200">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.dateNeeded).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              weekday: "short",
                            }
                          )}
                          <Clock className="w-4 h-4 ml-2" />
                          {booking.timeNeeded}
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            booking.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : booking.status === "Ready to go"
                              ? "bg-blue-100 text-blue-800"
                              : booking.status === "In Transit" ||
                                booking.status === "On Trip"
                              ? "bg-purple-100 text-purple-800"
                              : booking.status === "Delivered"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {booking.status === "In Transit"
                            ? "On Trip"
                            : booking.status}
                        </div>
                      </div>

                      {/* Company and Product */}
                      <div className="mb-2">
                        <p className="font-semibold text-white text-sm">
                          {booking.companyName}
                        </p>
                        <p className="text-purple-200 text-xs flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {booking.productName}
                        </p>
                      </div>

                      {/* Route - Compact */}
                      <div className="text-xs text-purple-300">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="truncate text-xs">
                            {booking.originAddress}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="truncate text-xs">
                            {booking.destinationAddress}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Booking Details Modal */}
        {showModal && selectedBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="min-h-screen flex items-end">
                <div className="bg-white w-full rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden">
                  {/* Modal Header - Sticky */}
                  <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {selectedBooking.reservationId}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedBooking.tripNumber}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        selectedBooking.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedBooking.status === "Ready to go"
                          ? "bg-blue-100 text-blue-800"
                          : selectedBooking.status === "In Transit" ||
                            selectedBooking.status === "On Trip"
                          ? "bg-purple-100 text-purple-800"
                          : selectedBooking.status === "Delivered"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedBooking.status === "In Transit"
                        ? "On Trip"
                        : selectedBooking.status}
                    </div>
                    <button
                      onClick={closeModal}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body - Scrollable */}
                  <div
                    className="overflow-y-auto px-4 py-4"
                    style={{ maxHeight: "calc(85vh - 80px)" }}
                  >
                    <div className="space-y-4">
                      {/* Schedule Info */}
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Schedule
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Date:</span>
                            <p className="font-medium text-gray-900">
                              {new Date(
                                selectedBooking.dateNeeded
                              ).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Time:</span>
                            <p className="font-medium text-gray-900">
                              {selectedBooking.timeNeeded}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Route
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                Origin
                              </p>
                              <p className="text-sm text-gray-600">
                                {selectedBooking.originAddress}
                              </p>
                            </div>
                          </div>
                          <div className="border-l-2 border-gray-200 ml-1.5 h-4"></div>
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full mt-1 flex-shrink-0"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                Destination
                              </p>
                              <p className="text-sm text-gray-600">
                                {selectedBooking.destinationAddress}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cargo Details */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Cargo Details
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Company:</span>
                            <p className="font-medium text-gray-900">
                              {selectedBooking.companyName}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Product:</span>
                            <p className="font-medium text-gray-900">
                              {selectedBooking.productName}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <p className="font-medium text-gray-900">
                              {selectedBooking.quantity?.toLocaleString()} units
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Weight:</span>
                            <p className="font-medium text-gray-900">
                              {selectedBooking.grossWeight} tons
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle & Team */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Vehicle & Team
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-gray-600">Vehicle:</span>
                            <p className="font-medium text-gray-900">
                              {selectedBooking.vehicleType}
                            </p>
                          </div>
                          {selectedBooking.employeeDetails &&
                            selectedBooking.employeeDetails.length > 0 && (
                              <div>
                                <span className="text-gray-600">Team:</span>
                                <div className="mt-2 space-y-1">
                                  {selectedBooking.employeeDetails.map(
                                    (emp, idx) => (
                                      <div
                                        key={`employee-${
                                          emp.employeeId || emp.fullName
                                        }-${idx}`}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                          {emp.role}
                                        </span>
                                        <span className="font-medium text-gray-900">
                                          {emp.fullName}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer - Sticky */}
                  <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                    <button
                      onClick={closeModal}
                      className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Truck,
  Clock,
  CheckCircle,
  TrendingUp,
  Package,
  MapPin,
  FileText,
  ArrowUpRight,
  Activity,
  BarChart3,
  CalendarRange,
} from "lucide-react";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    upcoming: 0,
    ongoing: 0,
    pending: 0,
    delivered: 0,
    loading: true,
  });

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  //VITE API base URL
  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // Fetch dashboard data from your API
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${baseURL}/api/bookings`);

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const bookings = await response.json();

      const counts = {
        upcoming: bookings.filter((booking) => booking.status === "Ready to go")
          .length,
        ongoing: bookings.filter((booking) => booking.status === "In Transit")
          .length,
        pending: bookings.filter((booking) => booking.status === "Pending")
          .length,
        delivered: bookings.filter(
          (booking) =>
            booking.status === "Delivered" || booking.status === "Completed"
        ).length,
        loading: false,
      };

      setDashboardData(counts);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData({
        upcoming: 50,
        ongoing: 20,
        pending: 25,
        delivered: 7,
        loading: false,
      });
    }
  };

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/bookings`);

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const bookings = await response.json();

      // Generate date range
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const dateArray = [];

      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
      ) {
        dateArray.push({
          date: new Date(date),
          dateStr: date.toISOString().split("T")[0],
          dayName: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          trips: 0,
        });
      }

      // Count bookings created on each day
      bookings.forEach((booking) => {
        if (booking.createdAt) {
          const bookingDate = new Date(booking.createdAt)
            .toISOString()
            .split("T")[0];
          const dayData = dateArray.find((day) => day.dateStr === bookingDate);
          if (dayData) {
            dayData.trips++;
          }
        }
      });

      setChartData(dateArray);
      setChartLoading(false);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setChartLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
    setShowDatePicker(false);
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: (index) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    }),
    hover: {
      scale: 1.02,
      y: -4,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  };

  const cards = [
    {
      title: "Upcoming Trips",
      count: dashboardData.upcoming,
      subtitle: "Ready to start",
      icon: <Calendar className="w-7 h-7" />,
      bgGradient: "bg-gradient-to-br from-purple-50 to-purple-100/70",
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      textColor: "text-purple-700",
      borderColor: "border-purple-200/50",
      status: "Ready to go",
    },
    {
      title: "On-Going Trips",
      count: dashboardData.ongoing,
      subtitle: "In progress",
      icon: <Truck className="w-7 h-7" />,
      bgGradient: "bg-gradient-to-br from-indigo-50 to-indigo-100/70",
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      textColor: "text-indigo-700",
      borderColor: "border-indigo-200/50",
      status: "In Transit",
    },
    {
      title: "Pending Reservations",
      count: dashboardData.pending,
      subtitle: "Awaiting confirmation",
      icon: <Clock className="w-7 h-7" />,
      bgGradient: "bg-gradient-to-br from-violet-50 to-violet-100/70",
      iconBg: "bg-gradient-to-br from-violet-500 to-violet-600",
      textColor: "text-violet-700",
      borderColor: "border-violet-200/50",
      status: "Pending",
    },
    {
      title: "Delivered",
      count: dashboardData.delivered,
      subtitle: "Successfully completed",
      icon: <CheckCircle className="w-7 h-7" />,
      bgGradient: "bg-gradient-to-br from-fuchsia-50 to-fuchsia-100/70",
      iconBg: "bg-gradient-to-br from-fuchsia-500 to-fuchsia-600",
      textColor: "text-fuchsia-700",
      borderColor: "border-fuchsia-200/50",
      status: "Delivered",
    },
  ];

  const handleCardClick = (status) => {
    window.location.href = `/dashboard/booking?status=${encodeURIComponent(
      status
    )}`;
  };

  const totalTrips =
    dashboardData.upcoming +
    dashboardData.ongoing +
    dashboardData.pending +
    dashboardData.delivered;
  const maxChartValue = Math.max(...chartData.map((d) => d.trips), 1);

  // Calculate line chart points
  const chartWidth = 100;
  const chartHeight = 100;
  const pointsPath =
    chartData.length > 0
      ? chartData
          .map((point, index) => {
            const x = (index / (chartData.length - 1 || 1)) * chartWidth;
            const y = chartHeight - (point.trips / maxChartValue) * chartHeight;
            return `${x},${y}`;
          })
          .join(" ")
      : "";

  if (dashboardData.loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="text-center space-y-3">
          <div className="h-8 bg-gray-200 rounded-lg w-96 mx-auto animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-white rounded-2xl shadow-sm animate-pulse border border-gray-100"
            >
              <div className="p-6 h-full space-y-4">
                <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Purple Theme */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-purple-600/5 rounded-2xl -z-10"></div>
        <div className="py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-3">
            Dashboard
          </h1>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Live Updates</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Real-time Analytics</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Quick Actions with Purple Theme */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {[
          {
            title: "New Booking",
            description: "Create a new booking request",
            icon: <Package className="w-5 h-5" />,
            gradient: "from-purple-500 to-purple-600",
            bgGradient: "from-purple-50 to-purple-100",
            action: () => (window.location.href = "/dashboard/booking"),
          },
          {
            title: "Track Vehicles",
            description: "Monitor fleet and deliveries",
            icon: <MapPin className="w-5 h-5" />,
            gradient: "from-indigo-500 to-indigo-600",
            bgGradient: "from-indigo-50 to-indigo-100",
            action: () => (window.location.href = "/dashboard/monitoring"),
          },
          {
            title: "Trip Reports",
            description: "View analytics and reports",
            icon: <FileText className="w-5 h-5" />,
            gradient: "from-violet-500 to-violet-600",
            bgGradient: "from-violet-50 to-violet-100",
            action: () => (window.location.href = "/dashboard/trip-report"),
          },
        ].map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className={`bg-gradient-to-br ${action.bgGradient} rounded-xl shadow-sm border border-purple-100 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 group cursor-pointer`}
            onClick={action.action}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`bg-gradient-to-br ${action.gradient} p-3 rounded-lg group-hover:scale-110 transition-transform duration-200 shadow-md`}
              >
                <div className="text-white">{action.icon}</div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {action.description}
                </p>
                <button
                  className={`w-full bg-gradient-to-r ${action.gradient} text-white py-2.5 px-4 rounded-lg transition-all duration-300 text-sm font-medium hover:shadow-lg transform hover:-translate-y-0.5`}
                >
                  {action.title.includes("New")
                    ? "Create"
                    : action.title.includes("Track")
                    ? "Monitor"
                    : "View"}{" "}
                  Now
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Enhanced Stats Cards with Purple Theme */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            custom={index}
            onClick={() => handleCardClick(card.status)}
            className={`aspect-square ${card.bgGradient} rounded-2xl shadow-sm hover:shadow-xl cursor-pointer group transition-all duration-300 border-2 ${card.borderColor} relative overflow-hidden backdrop-blur-sm`}
          >
            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-white/5"></div>

            {/* Card Content */}
            <div className="p-6 h-full flex flex-col relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`${card.iconBg} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  {card.icon}
                </div>
                <div className="flex items-center space-x-1 text-xs font-medium text-gray-600 group-hover:text-gray-800 transition-colors">
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-3xl font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform duration-200">
                  {card.count.toLocaleString()}
                </div>
                <h3
                  className={`text-sm font-semibold ${card.textColor} mb-1 leading-tight`}
                >
                  {card.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  {card.subtitle}
                </p>
              </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </motion.div>
        ))}
      </div>

      {/* Enhanced Trip Analytics Line Chart with Date Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 overflow-hidden"
      >
        {/* Chart Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-8 py-6 border-b border-purple-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                Trip Analytics
              </h2>
              <p className="text-sm text-gray-600">
                Daily booking trends for selected period
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {totalTrips}
                </div>
                <div className="text-sm text-gray-500">Total Active</div>
              </div>

              {/* Date Range Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-50 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Date Range</span>
                </button>

                {showDatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-purple-100 p-6 z-50 min-w-[320px]"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Select Date Range
                        </h3>
                        <button
                          onClick={() => setShowDatePicker(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>

                      {/* Quick Range Buttons */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[7, 14, 30].map((days) => (
                          <button
                            key={days}
                            onClick={() => setQuickRange(days)}
                            className="px-3 py-2 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            {days} Days
                          </button>
                        ))}
                      </div>

                      {/* Date Inputs */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) =>
                              handleDateRangeChange("start", e.target.value)
                            }
                            max={dateRange.end}
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) =>
                              handleDateRangeChange("end", e.target.value)
                            }
                            min={dateRange.start}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2.5 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
                      >
                        Apply Range
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {chartLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Bar Chart */}
              <div className="flex items-end justify-between h-64 space-x-2 mb-6">
                {chartData.map((day, index) => (
                  <motion.div
                    key={`${day.dayName}-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: `${Math.max(
                        (day.trips / maxChartValue) * 100,
                        4
                      )}%`,
                      opacity: 1,
                    }}
                    transition={{
                      delay: 0.1 * index,
                      duration: 0.8,
                      ease: "easeOut",
                    }}
                    className="flex-1 bg-gradient-to-t from-purple-600 via-purple-500 to-indigo-400 rounded-t-lg relative group shadow-sm hover:shadow-lg transition-all duration-200 hover:from-purple-700 hover:via-purple-600 hover:to-indigo-500"
                    style={{ minHeight: "16px" }}
                  >
                    {/* Enhanced Tooltip */}
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-900 to-indigo-900 text-white text-xs py-3 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-2xl z-10 backdrop-blur-sm border border-purple-500/30">
                      <div className="font-bold text-base mb-1">
                        {day.trips} {day.trips === 1 ? "booking" : "bookings"}
                      </div>
                      <div className="text-purple-200">{day.dayName}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-purple-900"></div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* X-axis Labels */}
              <div className="flex justify-between text-xs text-gray-600 border-t border-purple-100 pt-4 overflow-x-auto">
                {chartData.map((day, index) => (
                  <div
                    key={`label-${index}`}
                    className="flex-shrink-0 text-center px-2"
                  >
                    <div className="font-medium text-purple-700">
                      {day.dayName}
                    </div>
                    <div className="text-gray-400 mt-1">
                      {day.trips} {day.trips === 1 ? "trip" : "trips"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

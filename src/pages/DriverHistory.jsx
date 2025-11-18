import React, { useState, useEffect } from "react";
import { axiosClient } from "../api/axiosClient";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  Users,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  Award,
  Search,
  Weight,
} from "lucide-react";
import driverloginbg from "../assets/driver_login_bg.png";

export default function DriverHistory() {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    route: true,
    cargo: false,
    customer: false,
    team: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getDestinations = (booking) => {
    if (!booking.destinationAddress) return [];
    return Array.isArray(booking.destinationAddress)
      ? booking.destinationAddress
      : [booking.destinationAddress];
  };

  const fetchCompletedBookings = async () => {
    try {
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
        // Filter only completed bookings
        const completedBookings = res.data.bookings.filter(
          (booking) => booking.status === "Completed"
        );
        setBookings(completedBookings);
        setFilteredBookings(completedBookings);
        setError("");
      } else {
        setError("Failed to fetch bookings");
      }
    } catch (err) {
      console.error("❌ Error fetching completed bookings:", err);

      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        localStorage.removeItem("driverToken");
      } else {
        setError(err.response?.data?.msg || "Failed to load history.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshHistory = async () => {
    setRefreshing(true);
    await fetchCompletedBookings();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredBookings(bookings);
    } else {
      const filtered = bookings.filter(
        (booking) =>
          booking.reservationId.toLowerCase().includes(query.toLowerCase()) ||
          booking.tripNumber.toLowerCase().includes(query.toLowerCase()) ||
          booking.companyName.toLowerCase().includes(query.toLowerCase()) ||
          booking.productName.toLowerCase().includes(query.toLowerCase()) ||
          booking.originAddress.toLowerCase().includes(query.toLowerCase()) ||
          booking.destinationAddress
            .toString()
            .toLowerCase()
            .includes(query.toLowerCase())
      );
      setFilteredBookings(filtered);
    }
  };

  const openBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
    setExpandedSections({
      route: true,
      cargo: false,
      customer: false,
      team: false,
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  useEffect(() => {
    fetchCompletedBookings();
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${driverloginbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-purple-400/50 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-purple-400/50 rounded w-3/4"></div>
              <div className="h-4 bg-purple-400/50 rounded w-1/2"></div>
            </div>
          </div>
          <p className="text-center mt-4 text-purple-200">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: `url(${driverloginbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Error Loading History
          </h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchCompletedBookings}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4"
      style={{
        backgroundImage: `url(${driverloginbg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay + decorative glows */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-purple-800/50 to-indigo-900/50"></div>
      <div className="absolute -top-20 -right-20 w-40 h-40 sm:w-60 sm:h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-40 h-40 sm:w-60 sm:h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/3 right-1/4 w-32 h-32 sm:w-40 sm:h-40 bg-purple-400/5 rounded-full blur-2xl"></div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Award className="w-7 h-7" />
              Trip History
            </h1>
            <p className="text-xs text-purple-200">
              {filteredBookings.length} completed trip
              {filteredBookings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={refreshHistory}
            disabled={refreshing}
            className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white/20 transition"
          >
            <RefreshCw
              className={`w-5 h-5 text-white ${
                refreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-300" />
            <input
              type="text"
              placeholder="Search by ID, company, product..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl text-center">
            <Award className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {searchQuery ? "No Results Found" : "No Completed Trips"}
            </h2>
            <p className="text-purple-200 mb-2">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Your completed trips will appear here"}
            </p>
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4 cursor-pointer hover:bg-white/15 transition-all active:scale-95"
                onClick={() => openBookingDetails(booking)}
              >
                {/* Booking Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {booking.reservationId}
                    </h3>
                    <p className="text-sm text-purple-200 font-mono">
                      {booking.tripNumber}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </div>
                </div>

                {/* Company & Product */}
                <div className="mb-3">
                  <p className="font-semibold text-white">
                    {booking.companyName}
                  </p>
                  <p className="text-sm text-purple-200 flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {booking.productName} ({booking.quantity} units)
                  </p>
                </div>

                {/* Route */}
                <div className="mb-3 text-sm bg-white/5 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-purple-300">From:</span>
                    <span className="font-medium text-xs text-white">
                      {booking.originAddress.length > 30
                        ? booking.originAddress.substring(0, 30) + "..."
                        : booking.originAddress}
                    </span>
                  </div>

                  {getDestinations(booking).map((dest, idx) => (
                    <div key={idx} className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                      <span className="text-xs text-purple-300">
                        {getDestinations(booking).length > 1
                          ? `To (${idx + 1}):`
                          : "To:"}
                      </span>
                      <span className="font-medium text-xs text-white">
                        {dest.length > 30
                          ? dest.substring(0, 30) + "..."
                          : dest}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Date Completed */}
                <div className="flex items-center gap-4 text-sm text-purple-200">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(booking.dateNeeded).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {booking.timeNeeded}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedBooking && (
        <div
          className="fixed inset-0 z-50"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
              <div className="bg-white/80 backdrop-blur-2xl border border-white/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Modal Header - Sticky */}
                <div className="sticky top-0 bg-white/80 border-b border-gray-200/50 px-4 py-3 flex items-center justify-between z-10">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {selectedBooking.reservationId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedBooking.tripNumber}
                    </p>
                  </div>
                  <div className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </div>
                  <button
                    onClick={closeModal}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: "calc(90vh - 140px)" }}
                >
                  {/* Proof of Delivery */}
                  {selectedBooking.proofOfDelivery && (
                    <div className="p-4 border-b border-gray-100">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Award className="w-5 h-5 text-green-600" />
                          Proof of Delivery
                        </h4>
                        <img
                          src={selectedBooking.proofOfDelivery}
                          alt="Proof of Delivery"
                          className="w-full rounded-lg border-2 border-green-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Route Section */}
                  <div className="border-b border-gray-100">
                    <button
                      onClick={() => toggleSection("route")}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">Route Details</span>
                      </div>
                      {expandedSections.route ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.route && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Origin
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedBooking.originAddress}
                            </p>
                          </div>
                        </div>

                        {getDestinations(selectedBooking).map(
                          (destination, idx) => (
                            <React.Fragment key={idx}>
                              <div className="border-l-2 border-gray-200 ml-1.5 h-4"></div>
                              <div className="flex items-start gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {getDestinations(selectedBooking).length > 1
                                      ? `Destination ${idx + 1}`
                                      : "Destination"}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {destination}
                                  </p>
                                </div>
                              </div>
                            </React.Fragment>
                          )
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-4 bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(
                              selectedBooking.dateNeeded
                            ).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedBooking.timeNeeded}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cargo Section */}
                  <div className="border-b border-gray-100">
                    <button
                      onClick={() => toggleSection("cargo")}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">Cargo Details</span>
                      </div>
                      {expandedSections.cargo ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.cargo && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Product</p>
                            <p className="font-medium">
                              {selectedBooking.productName}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Quantity</p>
                            <p className="font-medium">
                              {selectedBooking.quantity?.toLocaleString()} pcs
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Weight</p>
                            <p className="font-medium flex items-center gap-1">
                              <Weight className="w-3 h-3" />
                              {selectedBooking.grossWeight} tons
                            </p>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-gray-600 text-xs">Packages</p>
                            <p className="font-medium">
                              {selectedBooking.numberOfPackages} boxes
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Section */}
                  <div className="border-b border-gray-100">
                    <button
                      onClick={() => toggleSection("customer")}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Customer Info</span>
                      </div>
                      {expandedSections.customer ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.customer && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-gray-600 text-xs mb-1">Company</p>
                          <p className="font-medium">
                            {selectedBooking.companyName}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-gray-600 text-xs mb-1">Customer</p>
                          <p className="font-medium">
                            {selectedBooking.customerEstablishmentName ||
                              selectedBooking.shipperConsignorName ||
                              "N/A"}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-gray-600 text-xs mb-1">
                            Delivery Fee
                          </p>
                          <p className="font-medium text-green-600">
                            ₱{selectedBooking.deliveryFee?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Section */}
                  <div className="border-b border-gray-100">
                    <button
                      onClick={() => toggleSection("team")}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">Team Assignment</span>
                      </div>
                      {expandedSections.team ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    {expandedSections.team && (
                      <div className="px-4 pb-4">
                        <div className="space-y-2">
                          {selectedBooking.employeeDetails &&
                          selectedBooking.employeeDetails.length > 0 ? (
                            selectedBooking.employeeDetails.map((emp, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-gray-50 p-2 rounded"
                              >
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium flex-1">
                                  {emp.fullName}
                                </span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {emp.role}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded text-center">
                              No team assigned
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer - Sticky */}
                <div className="sticky bottom-0 bg-white/80 border-t border-gray-200/50 p-4 z-10">
                  <button
                    onClick={closeModal}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
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
  );
}

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Calendar } from "lucide-react";

function BranchInfo() {
  const { id } = useParams();
  const [branch, setBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [bookings, setBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: "",
    end: "",
  });
  const [error, setError] = useState(null);
  const [isLoadingBranch, setIsLoadingBranch] = useState(true);
  const navigate = useNavigate();

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // Fetch all branches (for prev/next navigation)
  useEffect(() => {
    fetch(`${baseURL}/api/branches`)
      .then((res) => res.json())
      .then((data) => setBranches(data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch single branch info
  useEffect(() => {
    if (!id) return;

    const fetchBranch = async () => {
      setIsLoadingBranch(true);
      setError(null);
      try {
        const res = await fetch(`${baseURL}/api/branches/${id}`);
        if (!res.ok) throw new Error("Failed to fetch branch");
        const data = await res.json();
        setBranch(data);
      } catch (err) {
        console.error("Error fetching branch:", err);
        setError(err.message);
      } finally {
        setIsLoadingBranch(false);
      }
    };

    fetchBranch();
  }, [id]);

  // Update index whenever branches list or current id changes
  useEffect(() => {
    if (branches.length > 0) {
      const idx = branches.findIndex((b) => b._id === id);
      setCurrentIndex(idx);
    }
  }, [branches, id]);

  // Filter bookings based on date range using useMemo
  const filteredBookings = useMemo(() => {
    if (!selectedDateRange.start && !selectedDateRange.end) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const bookingDate =
        booking.dateNeeded || booking.dateBooked || booking.createdAt;
      if (!bookingDate) return false;

      const bookingDateObj = new Date(bookingDate);
      const startDate = selectedDateRange.start
        ? new Date(selectedDateRange.start)
        : null;
      const endDate = selectedDateRange.end
        ? new Date(selectedDateRange.end)
        : null;

      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);
      bookingDateObj.setHours(0, 0, 0, 0);

      if (startDate && endDate) {
        return bookingDateObj >= startDate && bookingDateObj <= endDate;
      } else if (startDate) {
        return bookingDateObj >= startDate;
      } else if (endDate) {
        return bookingDateObj <= endDate;
      }

      return true;
    });
  }, [bookings, selectedDateRange]);

  // Fetch bookings for this branch
  const fetchBookingHistory = async () => {
    if (!branch) return;
    setIsLoadingBookings(true);
    setError(null);
    try {
      const res = await fetch(`${baseURL}/api/branches/${id}/bookings`);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Server error ${res.status}: ${errorText.slice(0, 200)}`
        );
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format: expected array");
      }

      setBookings(data);
      setShowModal(true);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load booking history: " + err.message);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  if (isLoadingBranch) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Loading branch information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold">Error</p>
          <p className="text-red-500 mt-2">{error}</p>
          <button
            onClick={() => navigate("/dashboard/branch")}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
          >
            Back to Branches
          </button>
        </div>
      </div>
    );
  }

  const clearFilter = () => {
    setSelectedDateRange({
      start: "",
      end: "",
    });
  };

  const handleReservationClick = (bookingId) => {
    navigate(`/dashboard/booking/${bookingId}`);
  };

  if (!branch)
    return <p className="text-center py-6 text-gray-500">Loading...</p>;

  const handlePrev = () => {
    if (currentIndex > 0) {
      navigate(`/dashboard/branch/${branches[currentIndex - 1]._id}`);
    }
  };

  const handleNext = () => {
    if (currentIndex < branches.length - 1) {
      navigate(`/dashboard/branch/${branches[currentIndex + 1]._id}`);
    }
  };

  return (
    <>
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Branch Information
        </h2>
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={fetchBookingHistory}
            disabled={isLoadingBookings}
            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition disabled:bg-red-300"
          >
            {isLoadingBookings ? "Loading..." : "View History"}
          </button>
          <button
            onClick={() => navigate("/dashboard/branch")}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
          >
            Back
          </button>
        </div>

        {/* Branch Info Table */}
        <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-700">
            <tbody>
              <tr className="border-b">
                <th className="px-6 py-3 font-semibold bg-gray-100">
                  Branch Name
                </th>
                <td className="px-6 py-3">{branch.branchName}</td>
              </tr>
              <tr className="border-b">
                <th className="px-6 py-3 font-semibold bg-gray-100">Client</th>
                <td className="px-6 py-3">
                  {branch.client?.clientName || branch.client}
                </td>
              </tr>
              <tr className="border-b">
                <th className="px-6 py-3 font-semibold bg-gray-100">
                  Location
                </th>
                <td className="px-6 py-3">
                  {[
                    branch.address?.barangay,
                    branch.address?.city,
                    branch.address?.province,
                    branch.address?.region,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </td>
              </tr>
              <tr>
                <th className="px-6 py-3 font-semibold bg-gray-100">
                  Date Created
                </th>
                <td className="px-6 py-3">{branch.createdAt}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className={`px-4 py-2 rounded-lg shadow ${
              currentIndex <= 0
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Previous
          </button>
          <p className="text-gray-600 text-sm">
            {currentIndex + 1} of {branches.length}
          </p>
          <button
            onClick={handleNext}
            disabled={currentIndex >= branches.length - 1}
            className={`px-4 py-2 rounded-lg shadow ${
              currentIndex >= branches.length - 1
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Booking History Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Booking History
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Branch: {branch.branchName} • Total Bookings:{" "}
                  {bookings.length}
                  {(selectedDateRange.start || selectedDateRange.end) &&
                    ` • Filtered: ${filteredBookings.length}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={selectedDateRange.start}
                      onChange={(e) =>
                        setSelectedDateRange((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-40"
                      placeholder="Start date"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={selectedDateRange.end}
                      onChange={(e) =>
                        setSelectedDateRange((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-40"
                      placeholder="End date"
                    />
                  </div>
                  {(selectedDateRange.start || selectedDateRange.end) && (
                    <button
                      onClick={clearFilter}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    {selectedDateRange.start || selectedDateRange.end
                      ? "No bookings found for the selected date range."
                      : "No booking history found for this branch."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Reservation ID</th>
                        <th className="px-4 py-3">Trip Number</th>
                        <th className="px-4 py-3">Company Name</th>
                        <th className="px-4 py-3">Origin Address</th>
                        <th className="px-4 py-3">Destinations</th>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date Needed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {booking._id ? (
                              <button
                                onClick={() =>
                                  handleReservationClick(booking._id)
                                }
                                className="text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer"
                              >
                                {booking.reservationId || "N/A"}
                              </button>
                            ) : (
                              <span className="text-gray-500">
                                {booking.reservationId || "N/A"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-purple-600">
                            {booking.tripNumber || "N/A"}
                          </td>
                          <td className="px-4 py-3">{booking.companyName}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <div
                              className="truncate"
                              title={booking.originAddress}
                            >
                              {booking.originAddress}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="space-y-1">
                              {booking.destinationDeliveries?.map(
                                (delivery, idx) => (
                                  <div key={idx} className="text-sm">
                                    <div className="font-medium">
                                      {delivery.customerEstablishmentName}
                                    </div>
                                    <div
                                      className="text-gray-500 truncate"
                                      title={delivery.destinationAddress}
                                    >
                                      {delivery.destinationAddress}
                                    </div>
                                  </div>
                                )
                              ) || "No destinations"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <div>{booking.vehicleType}</div>
                              <div className="text-gray-500">
                                {booking.plateNumber}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                booking.status === "Completed" ||
                                booking.status === "Delivered"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "In Transit"
                                  ? "bg-blue-100 text-blue-800"
                                  : booking.status === "Ready to go"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {booking.dateNeeded
                              ? new Date(
                                  booking.dateNeeded
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BranchInfo;

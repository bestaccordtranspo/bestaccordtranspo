import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, Calendar } from "lucide-react";

function VehicleInfo() {
    const { id } = useParams();
    const [vehicle, setVehicle] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [bookings, setBookings] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [selectedDateRange, setSelectedDateRange] = useState({
        start: "",
        end: ""
    });
    const navigate = useNavigate();

    const baseURL = import.meta.env.VITE_API_BASE_URL;

    // Fetch all vehicles
    useEffect(() => {
        fetch(`${baseURL}/api/vehicles`)
            .then((res) => res.json())
            .then((data) => setVehicles(data))
            .catch((err) => console.error(err));
    }, []);

    // Fetch single vehicle info when id changes
    useEffect(() => {
        if (!id) return;
        fetch(`${baseURL}/api/vehicles/${id}`)
            .then((res) => res.json())
            .then((data) => setVehicle(data))
            .catch((err) => console.error(err));
    }, [id]);

    // Update index whenever vehicles list or current id changes
    useEffect(() => {
        if (vehicles.length > 0) {
            const idx = vehicles.findIndex((emp) => emp._id === id);
            setCurrentIndex(idx);
        }
    }, [vehicles, id]);

    // Filter bookings based on date range using useMemo for better performance
    const filteredBookings = useMemo(() => {
        if (!selectedDateRange.start && !selectedDateRange.end) {
            return bookings;
        }

        return bookings.filter((booking) => {
            const bookingDate = booking.tripDate || booking.dateNeeded || booking.dateBooked || booking.createdAt;
            if (!bookingDate) return false;

            const bookingDateObj = new Date(bookingDate);
            const startDate = selectedDateRange.start ? new Date(selectedDateRange.start) : null;
            const endDate = selectedDateRange.end ? new Date(selectedDateRange.end) : null;

            // Set time to beginning of day for start date and end of day for end date
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

    // Fetch bookings for the vehicle
    const fetchBookingHistory = async () => {
        if (!vehicle) return;

        setIsLoadingBookings(true);
        try {
            const res = await fetch(`${baseURL}/api/vehicles/${id}/bookings`);
            const data = await res.json();
            setBookings(data);
            setShowModal(true);
        } catch (err) {
            console.error("Error fetching bookings:", err);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    const clearFilter = () => {
        setSelectedDateRange({
            start: "",
            end: ""
        });
    };

    // Navgiate to booking details
    const handleTripClick = (bookingId) => {
        navigate(`/dashboard/booking/${bookingId}`);
    };

    if (!vehicle) return <p className="text-center py-6 text-gray-500">Loading...</p>;

    // Handlers for pagination
    const handlePrev = () => {
        if (currentIndex > 0) {
            navigate(`/dashboard/vehicle/${vehicles[currentIndex - 1]._id}`);
        }
    };

    const handleNext = () => {
        if (currentIndex < vehicles.length - 1) {
            navigate(`/dashboard/vehicle/${vehicles[currentIndex + 1]._id}`);
        }
    };

    return (
        <>
            <div className="p-6 max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-center text-gray-800">Vehicle Information</h2>
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={fetchBookingHistory}
                        disabled={isLoadingBookings}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition disabled:bg-red-300"
                    >
                        {isLoadingBookings ? "Loading..." : "View History"}
                    </button>
                    <button
                        onClick={() => navigate("/dashboard/vehicle")}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
                    >
                        Back
                    </button>
                </div>

                {/* Vehicle Info Table */}
                <div className="overflow-x-auto shadow rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-700">
                        <tbody>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Registration Number</th>
                                <td className="px-6 py-3">{vehicle.registrationNumber}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Brand</th>
                                <td className="px-6 py-3">{vehicle.manufacturedBy}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Model</th>
                                <td className="px-6 py-3">{vehicle.model}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Vehicle Type</th>
                                <td className="px-6 py-3">{vehicle.vehicleType}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Vehicle Color</th>
                                <td className="px-6 py-3">{vehicle.color}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Plate No.</th>
                                <td className="px-6 py-3">{vehicle.plateNumber}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Chassis No.</th>
                                <td className="px-6 py-3">{vehicle.chassisNumber}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Engine No.</th>
                                <td className="px-6 py-3">{vehicle.engineNumber}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Registration Expiry Date</th>
                                <td className="px-6 py-3">{vehicle.registrationExpiryDate}</td>
                            </tr>
                            <tr className="border-b">
                                <th className="px-6 py-3 font-semibold bg-gray-100">Max Weight Capacity (kg)</th>
                                <td className="px-6 py-3">{vehicle.maxWeightCapacity}</td>
                            </tr>
                            <tr>
                                <th className="px-6 py-3 font-semibold bg-gray-100">Date Added</th>
                                <td className="px-6 py-3">{vehicle.createdAt}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex <= 0}
                        className={`px-4 py-2 rounded-lg shadow ${currentIndex <= 0
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                    >
                        Previous
                    </button>
                    <p className="text-gray-600 text-sm">
                        {currentIndex + 1} of {vehicles.length}
                    </p>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= vehicles.length - 1}
                        className={`px-4 py-2 rounded-lg shadow ${currentIndex >= vehicles.length - 1
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Vehicle History Modal*/}
            {showModal && (
                <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">Vehicle History</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Vehicle: {vehicle.vehicleType} • Total Bookings: {bookings.length}
                                    {(selectedDateRange.start || selectedDateRange.end) && ` • Filtered: ${filteredBookings.length}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-600" />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={selectedDateRange.start}
                                            onChange={(e) => setSelectedDateRange(prev => ({
                                                ...prev,
                                                start: e.target.value
                                            }))}
                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-40"
                                            placeholder="Start date"
                                        />
                                        <span className="text-gray-500">to</span>
                                        <input
                                            type="date"
                                            value={selectedDateRange.end}
                                            onChange={(e) => setSelectedDateRange(prev => ({
                                                ...prev,
                                                end: e.target.value
                                            }))}
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

                        {/* Modal Content */}
                        <div className="flex-1 overflow-auto p-6">
                            {filteredBookings.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 text-lg">
                                        {selectedDateRange.start || selectedDateRange.end
                                            ? "No bookings found for the selected date range."
                                            : "No booking history found for this vehicle."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3">Trip Number</th>
                                                <th className="px-4 py-3">Company Name</th>
                                                <th className="px-4 py-3">Vehicle Used</th>
                                                <th className="px-4 py-3">Plate Number</th>
                                                <th className="px-4 py-3">Origin Address</th>
                                                <th className="px-4 py-3">Destination Address</th>
                                                <th className="px-4 py-3">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {filteredBookings.map((booking) => {
                                                const bookingDate = booking.tripDate || booking.dateNeeded || booking.dateBooked || booking.createdAt;
                                                return (
                                                    <tr key={booking._id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium">
                                                            {booking._id ? (
                                                                <button
                                                                    onClick={() => handleTripClick(booking._id)}
                                                                    className="text-purple-600 hover:text-purple-800 hover:underline transition cursor-pointer"
                                                                >
                                                                    {booking.tripNumber || "N/A"}
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-500">{booking.tripNumber || "N/A"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {booking.companyName}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {booking.vehicleInfo?.vehicleType || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {booking.vehicleInfo?.plateNumber || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {booking.originAddress}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {booking.destinationAddress}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {bookingDate
                                                                ? new Date(bookingDate).toLocaleDateString()
                                                                : 'N/A'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
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

export default VehicleInfo;
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, Building, Package, Truck, MapPin } from "lucide-react";
import { axiosClient } from "../api/axiosClient";

function BookingInfo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    // New state to hold client and branch details
    const [clientDetails, setClientDetails] = useState(null);
    const [branchDetails, setBranchDetails] = useState([]); // parallel to deliveries when found
    const formatAddress = (obj) => {
        if (!obj) return "";
        if (typeof obj === "string") return obj;
        if (obj.formattedAddress) return obj.formattedAddress;
        const parts = [
            obj.houseNumber,
            obj.street,
            obj.barangay,
            obj.city,
            obj.province,
            obj.region,
            obj.fullAddress
        ].filter(Boolean);
        return parts.join(", ");
    };

    const fetchBooking = async () => {
        try {
            const res = await axiosClient.get(`/api/bookings/${id}`);
            const data = res.data || {};
            // booking object remains the main payload
            setBooking(data);
            // if server returned enriched details, populate local states
            if (data.clientDetails) setClientDetails(data.clientDetails);
            if (data.branchDetails) setBranchDetails(data.branchDetails);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching booking:", err);
            setLoading(false);
        }
    };
    
    const goBack = () => {
        navigate("/dashboard/booking");
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="text-center py-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Booking Not Found</h2>
                <button
                    onClick={goBack}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Back to Bookings
                </button>
            </div>
        );
    }

    // Use destinationDeliveries as source of truth
    const deliveries = Array.isArray(booking.destinationDeliveries) && booking.destinationDeliveries.length > 0
        ? booking.destinationDeliveries
        : [];

    const isMultipleDestinations = deliveries.length > 1;

    // Fallback for customer/establishment name shown in header (use top-level if present, else first delivery)
    const customerEstablishmentName = booking.customerEstablishmentName || deliveries[0]?.customerEstablishmentName || "N/A";

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button
                    onClick={goBack}
                    className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Booking Details</h1>
                    <p className="text-gray-600">View complete booking information</p>
                </div>
            </div>

            {/* Booking Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                    <h3 className="text-sm font-medium opacity-90">Reservation ID</h3>
                    <p className="text-2xl font-bold font-mono">{booking.reservationId}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-purple-500 text-white p-4 rounded-lg">
                    <h3 className="text-sm font-medium opacity-90">Trip Number</h3>
                    <p className="text-2xl font-bold font-mono">{booking.tripNumber}</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-950 text-white p-4 rounded-lg">
                    <h3 className="text-sm font-medium opacity-90">Status</h3>
                    <p className="text-2xl font-bold">{booking.status}</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
                    <h3 className="text-sm font-medium opacity-90">Trip Type</h3>
                    <p className="text-2xl font-bold">
                        {isMultipleDestinations ? `${deliveries.length} Stops` : 'Single Drop'}
                    </p>
                </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Information */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Package className="text-blue-600" size={20} />
                        Product Information
                    </h2>

                    {deliveries.length === 0 ? (
                        <div className="text-sm text-gray-600">No product/delivery details available.</div>
                    ) : isMultipleDestinations ? (
                        <div className="space-y-3">
                            {deliveries.map((d, idx) => (
                                <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                                    <div className="flex justify-between">
                                        <span className="text-gray-700 font-medium">Stop {d.destinationIndex + 1 || idx + 1} - {d.customerEstablishmentName || 'N/A'}</span>
                                        <span className="text-sm text-gray-500">{d.destinationAddress}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                                        <div>
                                            <div className="text-gray-600">Product</div>
                                            <div className="font-semibold">{d.productName || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600">Quantity</div>
                                            <div className="font-semibold">{d.quantity ?? 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600">Gross Weight (kg)</div>
                                            <div className="font-semibold">{d.grossWeight ?? 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600">Units / Packages</div>
                                            <div className="font-semibold">{`${d.unitPerPackage ?? 'N/A'} / ${d.numberOfPackages ?? 'N/A'}`}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Single drop - show first delivery's details
                        <div className="space-y-3">
                            {(() => {
                                const d = deliveries[0];
                                return (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Product Name:</span>
                                            <span className="font-semibold">{d.productName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Quantity:</span>
                                            <span className="font-semibold">{d.quantity ?? 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Gross Weight:</span>
                                            <span className="font-semibold">{d.grossWeight ?? 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Units per Package:</span>
                                            <span className="font-semibold">{d.unitPerPackage ?? 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Number of Packages:</span>
                                            <span className="font-semibold">{d.numberOfPackages ?? 'N/A'}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Company Information */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Building className="text-blue-600" size={20} />
                        Company Information
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Company Name:</span>
                            <span className="font-semibold">{booking.companyName}</span>
                        </div>

                        {/* Client address (from fetched client record or originAddressDetails or booking.originAddress) */}
                        <div className="flex justify-between">
                            <span className="text-gray-600">Client Address:</span>
                            <span className="font-semibold">
                                {clientDetails?.formattedAddress
                                    || (clientDetails?.address ? `${clientDetails.address.street || ''} ${clientDetails.address.city || ''}`.trim() : '')
                                    || booking.originAddressDetails?.formattedAddress
                                    || booking.originAddress
                                    || "N/A"}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-600">Customer/Establishment:</span>
                            <span className="font-semibold">{customerEstablishmentName}</span>
                        </div>

                        {/* When multiple drops: list selected branches with address + contact */}
                        {deliveries.length > 1 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Branches</h4>
                                <div className="space-y-2">
                                    {branchDetails.map((b, i) => (
                                        <div key={b._id || i} className="p-3 border rounded-lg bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-semibold text-gray-800">{b.name || deliveries[i]?.customerEstablishmentName || `Stop ${i+1}`}</div>
                                                    <div className="text-xs text-gray-600">{b.address || deliveries[i]?.destinationAddress || "No address"}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                                                <div>
                                                    <div className="text-gray-600">Contact Person</div>
                                                    <div className="font-semibold">{b.contactPerson || "N/A"}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">Contact Number</div>
                                                    <div className="font-semibold">{b.contactNumber || "N/A"}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">Email</div>
                                                    <div className="font-semibold">{b.email || "N/A"}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Route Information */}
                <div className={`bg-white rounded-xl shadow-lg p-6 ${isMultipleDestinations ? 'lg:col-span-2' : ''}`}>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin className="text-blue-600" size={20} />
                        Route Information
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <span className="text-gray-600 block mb-1">Origin Address:</span>
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <span className="font-semibold">{booking.originAddress || 'N/A'}</span>
                            </div>
                        </div>

                        {deliveries.length > 0 ? (
                            <div>
                                <span className="text-gray-600 block mb-2">Destination Stops:</span>
                                <div className="space-y-2">
                                    {deliveries.map((d, index) => (
                                        <div key={index} className="bg-green-50 p-3 rounded-lg flex flex-col gap-2">
                                            <div className="flex items-start gap-3">
                                                <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[28px] text-center">
                                                    {d.destinationIndex + 1 || index + 1}
                                                </span>
                                                <div className="flex-1">
                                                    <div className="font-semibold">{d.customerEstablishmentName || 'N/A'}</div>
                                                    <div className="text-xs text-gray-600 truncate">{d.destinationAddress}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <div className="text-gray-600">Product</div>
                                                    <div className="font-semibold">{d.productName || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">Quantity</div>
                                                    <div className="font-semibold">{d.quantity ?? 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">Gross Weight</div>
                                                    <div className="font-semibold">{d.grossWeight ?? 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-gray-600">Packages</div>
                                                    <div className="font-semibold">{d.numberOfPackages ?? 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600">No destination stops available.</div>
                        )}
                    </div>
                </div>

                {/* Vehicle & Cost Information */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Truck className="text-blue-600" size={20} />
                        Vehicle & Cost
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Vehicle Type:</span>
                            <span className="font-semibold">{booking.vehicleType}</span>
                        </div>
                        <div className="flex justify-between border-t pt-3">
                            <span className="text-gray-600">Plate Number:</span>
                            <span className="font-semibold">{booking.plateNumber}</span>
                        </div>
                    </div>
                </div>

                {/* Schedule Information */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="text-blue-600" size={20} />
                        Schedule Information
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Date Needed:</span>
                            <span className="font-semibold flex items-center gap-2">
                                <Calendar size={16} />
                                {booking.dateNeeded ? new Date(booking.dateNeeded).toLocaleDateString() : ""}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Time Needed:</span>
                            <span className="font-semibold flex items-center gap-2">
                                <Clock size={16} />
                                {booking.timeNeeded || ""}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Employee Information */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="text-blue-600" size={20} />
                        Employee Information
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Employee Assigned:</span>
                            <span className="font-semibold">
                                {Array.isArray(booking.employeeAssigned)
                                    ? booking.employeeAssigned.join(', ')
                                    : booking.employeeAssigned}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Role:</span>
                            <span className="font-semibold">
                                {Array.isArray(booking.roleOfEmployee)
                                    ? booking.roleOfEmployee.join(', ')
                                    : booking.roleOfEmployee}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timestamps */}
            <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                        <span className="font-medium">Created:</span> {new Date(booking.createdAt).toLocaleString()}
                    </div>
                    <div>
                        <span className="font-medium">Last Updated:</span> {new Date(booking.updatedAt).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BookingInfo;
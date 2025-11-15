import Booking from "../models/Booking.js";
import Employee from "../models/Employee.js";
import Vehicle from "../models/Vehicle.js";

/**
 * GET /api/driver/bookings/count
 * Returns the count of ACTIVE bookings assigned to the logged-in driver/helper
 * (excludes completed bookings)
 */
export const getDriverBookingCount = async (req, res) => {
  try {
    const driver = req.driver;

    if (!driver) {
      return res.status(404).json({
        success: false,
        msg: "Driver not found"
      });
    }

    console.log("🔢 Fetching booking count for driver:", driver.employeeId);

    // Count ONLY active bookings (not completed) assigned to this driver
    const count = await Booking.countDocuments({
      employeeAssigned: { $in: [driver.employeeId] },
      status: { $ne: "Completed" }
    });

    console.log("📊 Active booking count for driver", driver.employeeId, ":", count);

    res.json({
      success: true,
      count,
      driverEmployeeId: driver.employeeId
    });

  } catch (err) {
    console.error("❌ Error fetching booking count:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while fetching booking count",
      error: err.message
    });
  }
};

/**
 * GET /api/driver/bookings
 * Returns bookings assigned to the logged-in driver/helper
 */
export const getDriverBookings = async (req, res) => {
  try {
    const driver = req.driver;

    console.log("🔍 DEBUG: Driver from middleware:", {
      id: driver._id,
      employeeId: driver.employeeId,
      fullName: driver.fullName,
      role: driver.role
    });

    if (!driver) {
      console.log("❌ DEBUG: No driver found in request");
      return res.status(404).json({ msg: "Driver not found" });
    }

    console.log("🔍 Fetching bookings for driver:", driver.employeeId);

    const allBookings = await Booking.find({});
    console.log("📋 DEBUG: Total bookings in database:", allBookings.length);

    allBookings.forEach((booking, index) => {
      console.log(`📋 DEBUG: Booking ${index + 1}:`, {
        reservationId: booking.reservationId,
        employeeAssigned: booking.employeeAssigned,
        employeeAssignedType: typeof booking.employeeAssigned,
        employeeAssignedIsArray: Array.isArray(booking.employeeAssigned)
      });
    });

    console.log("🔍 Searching for driver employeeId:", driver.employeeId);

    const bookings1 = await Booking.find({
      employeeAssigned: { $in: [driver.employeeId] }
    });
    console.log("📋 Query 1 ($in array) - Found bookings:", bookings1.length);

    const bookings2 = await Booking.find({
      employeeAssigned: driver.employeeId
    });
    console.log("📋 Query 2 (direct match) - Found bookings:", bookings2.length);

    const bookings3 = await Booking.find({
      employeeAssigned: { $regex: driver.employeeId, $options: 'i' }
    });
    console.log("📋 Query 3 (regex) - Found bookings:", bookings3.length);

    let bookings = bookings1.length > 0 ? bookings1 :
      bookings2.length > 0 ? bookings2 :
        bookings3.length > 0 ? bookings3 : [];

    console.log("📋 Final bookings selected:", bookings.length);

    if (bookings.length === 0) {
      console.log("🔍 No bookings found. Checking if driver ID exists in any booking...");

      const bookingsWithDriver = await Booking.find({
        $or: [
          { employeeAssigned: { $elemMatch: { $eq: driver.employeeId } } },
          { employeeAssigned: { $regex: driver.employeeId } }
        ]
      });

      console.log("📋 Bookings with driver ID (alternative search):", bookingsWithDriver.length);
      bookings = bookingsWithDriver;
    }

    bookings = bookings.sort((a, b) => new Date(b.dateNeeded) - new Date(a.dateNeeded));

    console.log("📋 Found bookings for driver:", bookings.length);

    const enhancedBookings = await Promise.all(bookings.map(async (booking) => {
      console.log("🔧 Processing booking:", booking.reservationId);

      let employeeDetails = [];
      if (Array.isArray(booking.employeeAssigned)) {
        employeeDetails = await Employee.find({
          employeeId: { $in: booking.employeeAssigned }
        }).select('employeeId fullName role');
        console.log("👥 Employee details found:", employeeDetails.length);
      } else if (booking.employeeAssigned) {
        const emp = await Employee.findOne({ employeeId: booking.employeeAssigned });
        if (emp) {
          employeeDetails = [{
            employeeId: emp.employeeId,
            fullName: emp.fullName,
            role: emp.role
          }];
        }
        console.log("👤 Single employee details found:", employeeDetails.length);
      }

      let vehicleDetails = null;
      try {
        vehicleDetails = await Vehicle.findOne({ vehicleType: booking.vehicleType });
        console.log("🚛 Vehicle details found:", !!vehicleDetails);
      } catch (err) {
        console.log("⚠️ Vehicle model not found, skipping vehicle details");
      }

      return {
        ...booking.toObject(),
        employeeDetails,
        vehicleDetails: vehicleDetails ? {
          color: vehicleDetails.color,
          manufacturedBy: vehicleDetails.manufacturedBy,
          model: vehicleDetails.model,
          plateNumber: vehicleDetails.plateNumber,
          vehicleType: vehicleDetails.vehicleType
        } : null,
        isCurrentDriver: true
      };
    }));

    console.log("✅ Returning enhanced bookings:", enhancedBookings.length);

    res.json({
      success: true,
      count: enhancedBookings.length,
      bookings: enhancedBookings,
      debug: {
        driverEmployeeId: driver.employeeId,
        totalBookingsInDB: allBookings.length,
        queriedBookings: bookings.length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching driver bookings:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while fetching bookings",
      error: err.message
    });
  }
};

/**
 * PUT /api/driver/bookings/:id/pickup-origin
 * Confirm origin pickup with proof
 */
export const confirmOriginPickup = async (req, res) => {
  try {
    const driver = req.driver;
    const bookingId = req.params.id;
    const { originPickupProof } = req.body;

    console.log("📦 Confirming origin pickup:", {
      bookingId,
      driverId: driver.employeeId,
      hasProof: !!originPickupProof
    });

    if (!originPickupProof) {
      return res.status(400).json({
        success: false,
        msg: "Pickup proof is required"
      });
    }

    if (!originPickupProof.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        msg: "Invalid proof format. Must be a base64 image."
      });
    }

    const sizeInMB = (originPickupProof.length * 0.75) / (1024 * 1024);
    if (sizeInMB > 10) {
      return res.status(413).json({
        success: false,
        msg: `Image too large (${sizeInMB.toFixed(2)} MB). Maximum 10MB allowed.`
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      employeeAssigned: { $in: [driver.employeeId] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        msg: "Booking not found or you are not assigned to this booking"
      });
    }

    if (booking.status !== "In Transit") {
      return res.status(400).json({
        success: false,
        msg: "Can only confirm pickup when trip is In Transit"
      });
    }

    // Update origin pickup details
    booking.originPickedUp = true;
    booking.originPickupAt = new Date();
    booking.originPickupProof = originPickupProof;
    booking.updatedAt = new Date();

    await booking.save();

    console.log(`✅ Origin pickup confirmed for booking ${booking.reservationId}`);

    res.json({
      success: true,
      msg: "Origin pickup confirmed successfully",
      booking: {
        _id: booking._id,
        reservationId: booking.reservationId,
        tripNumber: booking.tripNumber,
        originPickedUp: booking.originPickedUp,
        originPickupAt: booking.originPickupAt,
        updatedAt: booking.updatedAt
      }
    });

  } catch (err) {
    console.error("❌ Error confirming origin pickup:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while confirming pickup",
      error: err.message
    });
  }
};

/**
 * GET /api/driver/bookings/:id
 * Get specific booking details for the logged-in driver
 */
export const getDriverBookingById = async (req, res) => {
  try {
    const driver = req.driver;
    const bookingId = req.params.id;

    console.log("🔍 DEBUG: Getting booking details for:", bookingId, "by driver:", driver.employeeId);

    const booking = await Booking.findOne({
      _id: bookingId,
      employeeAssigned: { $in: [driver.employeeId] }
    });

    if (!booking) {
      console.log("❌ DEBUG: Booking not found or driver not assigned");
      return res.status(404).json({
        success: false,
        msg: "Booking not found or you are not assigned to this booking"
      });
    }

    console.log("✅ DEBUG: Booking found:", booking.reservationId);

    const employeeDetails = await Employee.find({
      employeeId: { $in: booking.employeeAssigned }
    }).select('employeeId fullName role');

    let vehicleDetails = null;
    try {
      vehicleDetails = await Vehicle.findOne({ vehicleType: booking.vehicleType });
    } catch (err) {
      console.log("⚠️ Vehicle model not found");
    }

    const enhancedBooking = {
      ...booking.toObject(),
      employeeDetails: employeeDetails.map(emp => ({
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        role: emp.role
      })),
      vehicleDetails: vehicleDetails ? {
        color: vehicleDetails.color,
        manufacturedBy: vehicleDetails.manufacturedBy,
        model: vehicleDetails.model,
        plateNumber: vehicleDetails.plateNumber,
        vehicleType: vehicleDetails.vehicleType
      } : null
    };

    res.json({
      success: true,
      booking: enhancedBooking
    });

  } catch (err) {
    console.error("❌ Error fetching booking details:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while fetching booking details"
    });
  }
};

/**
 * PUT /api/driver/bookings/:id/status
 * Update booking status (drivers can update status of their assigned bookings)
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const driver = req.driver;
    const bookingId = req.params.id;
    const { status, proofOfDelivery } = req.body;

    console.log("🔄 Updating booking status:", {
      bookingId,
      driverId: driver.employeeId,
      newStatus: status,
      hasProofOfDelivery: !!proofOfDelivery,
      proofSize: proofOfDelivery ? `${(proofOfDelivery.length / 1024).toFixed(2)} KB` : 'N/A'
    });

    const allowedStatuses = ["Pending", "In Transit", "Delivered", "Completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid status. Allowed: " + allowedStatuses.join(", ")
      });
    }

    if (status === "Completed" && !proofOfDelivery) {
      return res.status(400).json({
        success: false,
        msg: "Proof of delivery is required to complete a booking"
      });
    }

    if (proofOfDelivery) {
      if (!proofOfDelivery.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          msg: "Invalid proof of delivery format. Must be a base64 image."
        });
      }

      const sizeInMB = (proofOfDelivery.length * 0.75) / (1024 * 1024);
      console.log(`📸 Proof of delivery size: ${sizeInMB.toFixed(2)} MB`);
      
      if (sizeInMB > 10) {
        console.error(`❌ Image too large: ${sizeInMB.toFixed(2)} MB`);
        return res.status(413).json({
          success: false,
          msg: `Proof of delivery image is too large (${sizeInMB.toFixed(2)} MB). Maximum 10MB allowed.`
        });
      }
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      employeeAssigned: { $in: [driver.employeeId] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        msg: "Booking not found or you are not assigned to this booking"
      });
    }

    booking.status = status;
    booking.updatedAt = new Date();
    
    if (proofOfDelivery) {
      booking.proofOfDelivery = proofOfDelivery;
      console.log("📸 Proof of delivery image saved successfully");
    }

    await booking.save();

    if (status === "Completed") {
      try {
        await updateVehicleAndEmployeeStatus(booking, "Available");
      } catch (error) {
        console.error("Failed to update vehicle/employee status:", error);
      }
    }

    console.log(`✅ Driver ${driver.employeeId} updated booking ${booking.reservationId} status to: ${status}`);

    res.json({
      success: true,
      msg: "Booking status updated successfully",
      booking: {
        _id: booking._id,
        reservationId: booking.reservationId,
        tripNumber: booking.tripNumber,
        status: booking.status,
        proofOfDelivery: booking.proofOfDelivery ? "Stored" : null,
        updatedAt: booking.updatedAt
      }
    });

  } catch (err) {
    console.error("❌ Error updating booking status:", err);
    console.error("❌ Full error details:", {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    
    if (err.name === 'DocumentNotFoundError') {
      return res.status(404).json({
        success: false,
        msg: "Booking not found"
      });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        msg: "Invalid data: " + err.message
      });
    }

    if (err.message && err.message.includes('document is too large')) {
      return res.status(413).json({
        success: false,
        msg: "Image file is too large. Please capture a smaller image."
      });
    }

    res.status(500).json({
      success: false,
      msg: "Server error while updating status",
      error: err.message
    });
  }
};

async function updateVehicleAndEmployeeStatus(booking, newStatus) {
  try {
    if (booking.vehicleType) {
      const vehicle = await Vehicle.findOneAndUpdate(
        { vehicleType: booking.vehicleType },
        { status: newStatus }
      );
      console.log(`✅ Vehicle ${booking.vehicleType} status updated to ${newStatus}`);
    }

    if (Array.isArray(booking.employeeAssigned) && booking.employeeAssigned.length > 0) {
      const result = await Employee.updateMany(
        { employeeId: { $in: booking.employeeAssigned } },
        { status: newStatus }
      );
      console.log(`✅ ${result.modifiedCount} employees updated to ${newStatus}`);
    }
  } catch (error) {
    console.error("❌ Error updating statuses:", error);
    throw error;
  }
}

/**
 * PUT /api/driver/bookings/:id/location
 * Update driver's current location for a booking
 */
export const updateDriverLocation = async (req, res) => {
  try {
    const driver = req.driver;
    const bookingId = req.params.id;
    const { latitude, longitude, accuracy } = req.body;

    console.log("📍 Updating driver location:", {
      bookingId,
      driverId: driver.employeeId,
      latitude,
      longitude,
      accuracy
    });

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        msg: "Latitude and longitude are required"
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        msg: "Invalid latitude. Must be between -90 and 90"
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        msg: "Invalid longitude. Must be between -180 and 180"
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      employeeAssigned: { $in: [driver.employeeId] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        msg: "Booking not found or you are not assigned to this booking"
      });
    }

    if (booking.status !== "In Transit" && booking.status !== "On Trip") {
      return res.status(400).json({
        success: false,
        msg: "Location can only be updated for trips that are In Transit"
      });
    }

    // Update location with proper structure
    booking.driverLocation = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      lastUpdated: new Date(),
      accuracy: accuracy ? parseFloat(accuracy) : null
    };

    // IMPORTANT: Mark the field as modified to ensure Mongoose saves it
    booking.markModified('driverLocation');

    await booking.save();

    console.log(`✅ Driver location updated for booking ${booking.reservationId}`);
    console.log(`📍 New location:`, booking.driverLocation);

    res.json({
      success: true,
      msg: "Location updated successfully",
      location: booking.driverLocation
    });

  } catch (err) {
    console.error("❌ Error updating driver location:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while updating location",
      error: err.message
    });
  }
};

/**
 * ✨ NEW: PUT /api/driver/bookings/:id/deliver-destination
 * Mark a specific destination as delivered
 */
export const markDestinationDelivered = async (req, res) => {
  try {
    const driver = req.driver;
    const bookingId = req.params.id;
    const { destinationIndex, proofOfDelivery, notes } = req.body;

    console.log("📦 Marking destination as delivered:", {
      bookingId,
      driverId: driver.employeeId,
      destinationIndex,
      hasProof: !!proofOfDelivery
    });

    if (destinationIndex === undefined || destinationIndex === null) {
      return res.status(400).json({
        success: false,
        msg: "Destination index is required"
      });
    }

    if (proofOfDelivery) {
      if (!proofOfDelivery.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          msg: "Invalid proof of delivery format. Must be a base64 image."
        });
      }

      const sizeInMB = (proofOfDelivery.length * 0.75) / (1024 * 1024);
      if (sizeInMB > 10) {
        return res.status(413).json({
          success: false,
          msg: `Image too large (${sizeInMB.toFixed(2)} MB). Maximum 10MB allowed.`
        });
      }
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      employeeAssigned: { $in: [driver.employeeId] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        msg: "Booking not found or you are not assigned to this booking"
      });
    }

    if (booking.status !== "In Transit") {
      return res.status(400).json({
        success: false,
        msg: "Can only mark destinations as delivered when trip is In Transit"
      });
    }

    if (!booking.destinationDeliveries || booking.destinationDeliveries.length === 0) {
      booking.destinationDeliveries = booking.destinationAddress.map((address, index) => ({
        destinationAddress: address,
        destinationIndex: index,
        status: 'pending',
        deliveredAt: null,
        deliveredBy: null,
        proofOfDelivery: null,
        notes: null
      }));
    }

    const destinationToUpdate = booking.destinationDeliveries.find(
      d => d.destinationIndex === destinationIndex
    );

    if (!destinationToUpdate) {
      return res.status(404).json({
        success: false,
        msg: "Destination not found"
      });
    }

    if (destinationToUpdate.status === 'delivered') {
      return res.status(400).json({
        success: false,
        msg: "This destination has already been marked as delivered"
      });
    }

    destinationToUpdate.status = 'delivered';
    destinationToUpdate.deliveredAt = new Date();
    destinationToUpdate.deliveredBy = driver.employeeId;
    if (proofOfDelivery) {
      destinationToUpdate.proofOfDelivery = proofOfDelivery;
    }
    if (notes) {
      destinationToUpdate.notes = notes;
    }

    const allDelivered = booking.destinationDeliveries.every(
      d => d.status === 'delivered'
    );

    if (allDelivered) {
      booking.status = "Delivered";
      console.log("✅ All destinations delivered - updating booking status to Delivered");
    }

    booking.updatedAt = new Date();
    await booking.save();

    console.log(`✅ Destination ${destinationIndex} marked as delivered for booking ${booking.reservationId}`);

    res.json({
      success: true,
      msg: allDelivered 
        ? "All destinations delivered! Package ready to be completed." 
        : "Destination marked as delivered successfully",
      booking: {
        _id: booking._id,
        reservationId: booking.reservationId,
        tripNumber: booking.tripNumber,
        status: booking.status,
        destinationDeliveries: booking.destinationDeliveries,
        allDelivered: allDelivered,
        updatedAt: booking.updatedAt
      }
    });

  } catch (err) {
    console.error("❌ Error marking destination as delivered:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while updating destination status",
      error: err.message
    });
  }
};

/**
 * PUT /api/driver/bookings/:id/set-active-destination
 * Driver can select which destination to deliver to next
 */
export const setActiveDestination = async (req, res) => {
  try {
    const driver = req.driver;
    const bookingId = req.params.id;
    const { destinationIndex } = req.body;

    console.log("🎯 Setting active destination:", {
      bookingId,
      driverId: driver.employeeId,
      destinationIndex
    });

    if (destinationIndex === undefined || destinationIndex === null) {
      return res.status(400).json({
        success: false,
        msg: "Destination index is required"
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      employeeAssigned: { $in: [driver.employeeId] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        msg: "Booking not found or you are not assigned to this booking"
      });
    }

    if (booking.status !== "In Transit") {
      return res.status(400).json({
        success: false,
        msg: "Can only change route when trip is In Transit"
      });
    }

    // Validate that the destination exists and is pending
    const targetDestination = booking.destinationDeliveries.find(
      d => d.destinationIndex === destinationIndex
    );

    if (!targetDestination) {
      return res.status(404).json({
        success: false,
        msg: "Destination not found"
      });
    }

    if (targetDestination.status === 'delivered') {
      return res.status(400).json({
        success: false,
        msg: "This destination has already been delivered"
      });
    }

    // Store the active destination preference
    booking.activeDestinationIndex = destinationIndex;
    booking.updatedAt = new Date();
    await booking.save();

    console.log(`✅ Active destination set to index ${destinationIndex} for booking ${booking.reservationId}`);

    res.json({
      success: true,
      msg: `Route updated to Stop ${destinationIndex + 1}`,
      booking: {
        _id: booking._id,
        reservationId: booking.reservationId,
        tripNumber: booking.tripNumber,
        activeDestinationIndex: booking.activeDestinationIndex,
        updatedAt: booking.updatedAt
      }
    });

  } catch (err) {
    console.error("❌ Error setting active destination:", err);
    res.status(500).json({
      success: false,
      msg: "Server error while updating destination order",
      error: err.message
    });
  }
};
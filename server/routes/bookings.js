import express from "express";
import Booking from "../models/Booking.js";
import Counter from "../models/Counter.js";
import Vehicle from "../models/Vehicle.js";
import Employee from "../models/Employee.js";

const router = express.Router();

// Generate next Reservation ID
async function getNextReservationID() {
  try {
    const counter = await Counter.findOneAndUpdate(
      { id: "reservation" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!counter.seq) {
      counter.seq = 1;
      await counter.save();
    }

    const seqNumber = counter.seq.toString().padStart(6, "0");
    return `RES${seqNumber}`;
  } catch (error) {
    console.error("Error generating reservation ID:", error);
    throw error;
  }
}

// Generate next Trip Number
async function getNextTripNumber() {
  try {
    const counter = await Counter.findOneAndUpdate(
      { id: "trip" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // If seq is somehow missing, set it to 1
    if (!counter.seq) {
      counter.seq = 1;
      await counter.save();
    }

    const seqNumber = counter.seq.toString().padStart(6, "0");
    return `TRP${seqNumber}`;
  } catch (error) {
    console.error("Error generating trip number:", error);
    throw error;
  }
}

// GET all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find();
    const Employee = (await import("../models/Employee.js")).default;
    const Vehicle = (await import("../models/Vehicle.js")).default;

    const bookingsWithDetails = await Promise.all(bookings.map(async (booking) => {
      let employeeDetails = [];
      if (Array.isArray(booking.employeeAssigned)) {
        employeeDetails = await Employee.find({ employeeId: { $in: booking.employeeAssigned } });
      }
      let vehicle = null;
      if (booking.vehicleType) {
        vehicle = await Vehicle.findOne({ vehicleType: booking.vehicleType });
      }
      return {
        ...booking.toObject(),
        employeeDetails: employeeDetails.map(emp => ({
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          role: emp.role
        })),
        vehicle: vehicle ? {
          color: vehicle.color,
          manufacturedBy: vehicle.manufacturedBy,
          model: vehicle.model,
          vehicleType: vehicle.vehicleType
        } : null
      };
    }));
    res.json(bookingsWithDetails);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET booking by reservation ID
router.get("/reservation/:reservationId", async (req, res) => {
  try {
    const booking = await Booking.findOne({ reservationId: req.params.reservationId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET booking by trip number
router.get("/trip/:tripNumber", async (req, res) => {
  try {
    const booking = await Booking.findOne({ tripNumber: req.params.tripNumber });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET single booking (ENRICHED: includes clientDetails and branchDetails)
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Try to enrich with client and branch info (best-effort, non-blocking)
    const Client = (await import("../models/Client.js")).default;
    const Branch = (await import("../models/Branch.js")).default;

    let clientDetails = null;
    if (booking.companyName) {
      clientDetails = await Client.findOne({ clientName: booking.companyName }).lean();
    } else if (booking.originAddressDetails && booking.originAddressDetails._id) {
      clientDetails = await Client.findById(booking.originAddressDetails._id).lean();
    }

    const deliveries = Array.isArray(booking.destinationDeliveries) ? booking.destinationDeliveries : [];
    const branchDetails = await Promise.all(deliveries.map(async (d) => {
      const branchName = d.customerEstablishmentName || d.branch || d.branchName;
      if (!branchName) {
        return {
          branchName: branchName || "Unknown",
          address: d.destinationAddress || "",
          contactPerson: d.contactPerson || "",
          contactNumber: d.contactNumber || "",
          email: d.email || ""
        };
      }

      // Try find branch by name and client (if available), fallback to name-only
      let b = null;
      if (clientDetails && clientDetails._id) {
        b = await Branch.findOne({ branchName: branchName, client: clientDetails._id }).lean();
      }
      if (!b) {
        b = await Branch.findOne({ branchName: branchName }).lean();
      }

      if (b) {
        return {
          _id: b._id,
          branchName: b.branchName,
          address: b.address || {},
          contactPerson: b.contactPerson || "",
          contactNumber: b.contactNumber || "",
          email: b.email || ""
        };
      }

      // Fallback to delivery-stored fields
      return {
        branchName,
        address: d.destinationAddress || "",
        contactPerson: d.contactPerson || "",
        contactNumber: d.contactNumber || "",
        email: d.email || ""
      };
    }));

    const result = booking.toObject();
    result.clientDetails = clientDetails;
    result.branchDetails = branchDetails;

    res.json(result);
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({ message: err.message });
  }
});

async function updateVehicleAndEmployeeStatus(booking, newStatus) {
  try {
    if (booking.vehicleId) {
      const vehicleResult = await Vehicle.findOneAndUpdate(
        { vehicleId: booking.vehicleId },
        { status: newStatus },
        { new: true }
      );
      if (!vehicleResult) {
        console.warn(`⚠️ Vehicle ${booking.vehicleId} not found`);
      } else {
        console.log(`✅ Vehicle ${booking.vehicleId} status updated to ${newStatus}`);
      }
    }

    // Update employees status
    if (Array.isArray(booking.employeeAssigned) && booking.employeeAssigned.length > 0) {
      const employeeResult = await Employee.updateMany(
        { employeeId: { $in: booking.employeeAssigned } },
        { status: newStatus }
      );
      console.log(`✅ ${employeeResult.modifiedCount} employees updated to ${newStatus}`);
    }
  } catch (error) {
    console.error("❌ Error updating statuses:", error);
    throw error;
  }
}

// POST create booking
router.post("/", async (req, res) => {
  try {
    console.log("📥 ========== NEW BOOKING REQUEST ==========");
    console.log("📦 Full request body:", JSON.stringify(req.body, null, 2));
    console.log("🎯 Trip Type:", req.body.tripType);
    console.log("📍 Destination Deliveries:", JSON.stringify(req.body.destinationDeliveries, null, 2));
    
    const { reservationId, tripNumber, ...bookingData } = req.body;

    // CRITICAL: Log what we're about to save
    console.log("💾 Data to be saved (bookingData):", JSON.stringify(bookingData, null, 2));

    // Generate new IDs
    const newReservationId = await getNextReservationID();
    const newTripNumber = await getNextTripNumber();

    if (!newReservationId || !newTripNumber) {
      return res.status(500).json({ message: "Failed to generate booking IDs" });
    }

    console.log("🆔 Generated IDs:", { newReservationId, newTripNumber });

    // CRITICAL: Check destinationDeliveries before creating the document
    if (!bookingData.destinationDeliveries || bookingData.destinationDeliveries.length === 0) {
      console.error("❌ ERROR: destinationDeliveries is missing or empty!");
      return res.status(400).json({ 
        message: "destinationDeliveries is required and cannot be empty" 
      });
    }

    console.log("✅ destinationDeliveries validation passed");
    console.log("📋 First delivery:", bookingData.destinationDeliveries[0]);

    // Create new booking
    const newBooking = new Booking({
      ...bookingData,
      reservationId: newReservationId,
      tripNumber: newTripNumber,
      status: "Pending"
    });

    console.log("📝 Booking document created (before save)");
    console.log("🔍 Document destinationDeliveries:", JSON.stringify(newBooking.destinationDeliveries, null, 2));

    const savedBooking = await newBooking.save();

    console.log("✅ Booking saved successfully:", savedBooking._id);

    // Update vehicle and employee statuses to "On Trip"
    await updateVehicleAndEmployeeStatus(savedBooking, "On Trip");

    res.status(201).json(savedBooking);
  } catch (err) {
    console.error("❌ ========== ERROR CREATING BOOKING ==========");
    console.error("Error creating booking:", err);
    console.warn(err); // This will show the full validation error details
    
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate booking ID. Please retry." });
    }

    if (err.code === 11000) {
      if (err.keyPattern && (err.keyPattern.reservationId || err.keyPattern.tripNumber)) {
        return res.status(400).json({
          message: "Booking ID generation conflict. Please try again."
        });
      }
      return res.status(400).json({
        message: "Duplicate entry detected"
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      console.error("📋 Validation errors:", errors);
      console.error("🔍 Failed fields:", Object.keys(err.errors));
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
      });
    }

    res.status(500).json({ message: err.message });
  }
});

// PUT update booking
router.put("/:id", async (req, res) => {
  try {
    // First, get the current booking to check its status
    const currentBooking = await Booking.findById(req.params.id);
    if (!currentBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Prevent editing if booking is ready to go or in transit
    if (currentBooking.status === "Ready to go" || currentBooking.status === "In Transit") {
      return res.status(400).json({
        message: "Cannot edit booking while ready to go or in transit"
      });
    }

    console.log("🔄 Updating booking:", req.params.id, "with data:", req.body);

    // Don't allow updating auto-generated IDs through PUT request (except for status updates)
    const { reservationId, tripNumber, ...updateData } = req.body;

    // Special handling for status updates from admin
    if (updateData.status) {
      console.log("📝 Status update requested:", updateData.status);

      // Validate status
      const allowedStatuses = ["Pending", "Ready to go", "In Transit", "Delivered", "Completed"];
      if (!allowedStatuses.includes(updateData.status)) {
        return res.status(400).json({
          message: `Invalid status. Allowed statuses: ${allowedStatuses.join(", ")}`
        });
      }
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log("✅ Booking updated successfully:", {
      id: updatedBooking._id,
      reservationId: updatedBooking.reservationId,
      status: updatedBooking.status
    });

    res.json(updatedBooking);
  } catch (err) {
    console.error("Error updating booking:", err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        message: "Validation failed",
        errors: errors
      });
    }

    res.status(500).json({ message: err.message });
  }
});

// PATCH update booking status only
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;

    console.log("🔄 Status update request:", { bookingId, status });

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: "Status updated successfully",
      booking: {
        _id: booking._id,
        reservationId: booking.reservationId,
        tripNumber: booking.tripNumber,
        status: booking.status,
        updatedAt: booking.updatedAt
      }
    });

  } catch (err) {
    console.error("❌ Error updating booking status:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating status"
    });
  }
});

// PATCH archive booking
router.patch('/:id/archive', async (req, res) => {
  try {
    // First, get the current booking to check its status
    const currentBooking = await Booking.findById(req.params.id);
    if (!currentBooking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Prevent archiving if booking is ready to go or in transit
    if (currentBooking.status === "Ready to go" || currentBooking.status === "In Transit") {
      return res.status(400).json({
        success: false,
        message: "Cannot archive booking while ready to go or in transit"
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.json({
      success: true,
      message: "Booking archived successfully",
      booking
    });
  } catch (err) {
    console.error('Error archiving booking:', err);
    res.status(500).json({
      success: false,
      message: "Error archiving booking"
    });
  }
});

// PATCH restore booking
router.patch('/:id/restore', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: false,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.json({
      success: true,
      message: "Booking restored successfully",
      booking
    });
  } catch (err) {
    console.error('Error restoring booking:', err);
    res.status(500).json({
      success: false,
      message: "Error restoring booking"
    });
  }
});

// DELETE booking
router.delete("/:id", async (req, res) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
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

// Check if booking date is today or in the past
function isBookingDateToday(bookingDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const booking = new Date(bookingDate);
  booking.setHours(0, 0, 0, 0);
  
  return booking <= today;
}

// Update vehicle and employee status
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

// Check for schedule conflicts (same vehicle/employee on same date)
async function checkScheduleConflicts(vehicleId, employeeIds, bookingDate, excludeBookingId = null) {
  try {
    const bookingDay = new Date(bookingDate);
    bookingDay.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(bookingDay);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const query = {
      dateNeeded: {
        $gte: bookingDay,
        $lt: nextDay
      },
      status: { $in: ["Pending", "Ready to go", "In Transit"] },
      isArchived: false
    };
    
    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }
    
    const conflictingBookings = await Booking.find(query);
    
    const conflicts = {
      vehicle: false,
      employees: []
    };
    
    for (const booking of conflictingBookings) {
      if (booking.vehicleId === vehicleId) {
        conflicts.vehicle = true;
      }
      
      if (Array.isArray(booking.employeeAssigned)) {
        const conflictingEmployees = employeeIds.filter(empId => 
          booking.employeeAssigned.includes(empId)
        );
        conflicts.employees.push(...conflictingEmployees);
      }
    }
    
    conflicts.employees = [...new Set(conflicts.employees)];
    
    return conflicts;
  } catch (error) {
    console.error("Error checking schedule conflicts:", error);
    throw error;
  }
}

// Process scheduled bookings (call this periodically or on status check)
async function processScheduledBookings() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookingsToActivate = await Booking.find({
      dateNeeded: { $lte: today },
      status: "Pending",
      isArchived: false
    });
    
    console.log(`🔍 Found ${bookingsToActivate.length} bookings to activate`);
    
    for (const booking of bookingsToActivate) {
      await updateVehicleAndEmployeeStatus(booking, "On Trip");
      console.log(`✅ Activated booking ${booking.reservationId} for date ${booking.dateNeeded}`);
    }
    
    return bookingsToActivate.length;
  } catch (error) {
    console.error("Error processing scheduled bookings:", error);
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

// GET check schedule conflicts
router.post("/check-conflicts", async (req, res) => {
  try {
    const { vehicleId, employeeIds, bookingDate, excludeBookingId } = req.body;
    
    const conflicts = await checkScheduleConflicts(
      vehicleId, 
      employeeIds, 
      bookingDate, 
      excludeBookingId
    );
    
    res.json({
      hasConflicts: conflicts.vehicle || conflicts.employees.length > 0,
      conflicts
    });
  } catch (err) {
    console.error("Error checking conflicts:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET process scheduled bookings (can be called manually or via cron)
router.post("/process-scheduled", async (req, res) => {
  try {
    const count = await processScheduledBookings();
    res.json({ 
      success: true, 
      message: `Processed ${count} scheduled bookings`,
      count 
    });
  } catch (err) {
    console.error("Error processing scheduled bookings:", err);
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

// POST create booking
router.post("/", async (req, res) => {
  try {
    console.log("📥 ========== NEW BOOKING REQUEST ==========");
    console.log("📦 Full request body:", JSON.stringify(req.body, null, 2));
    
    const { reservationId, tripNumber, ...bookingData } = req.body;

    // Check for schedule conflicts (for logging only, not blocking)
    const conflicts = await checkScheduleConflicts(
      bookingData.vehicleId,
      bookingData.employeeAssigned || [],
      bookingData.dateNeeded
    );

    if (conflicts.vehicle || conflicts.employees.length > 0) {
      console.log("⚠️ Schedule conflicts detected (allowed for future bookings):", conflicts);
    }

    // Generate new IDs
    const newReservationId = await getNextReservationID();
    const newTripNumber = await getNextTripNumber();

    if (!newReservationId || !newTripNumber) {
      return res.status(500).json({ message: "Failed to generate booking IDs" });
    }

    console.log("🆔 Generated IDs:", { newReservationId, newTripNumber });

    // Validate destinationDeliveries
    if (!bookingData.destinationDeliveries || bookingData.destinationDeliveries.length === 0) {
      console.error("❌ ERROR: destinationDeliveries is missing or empty!");
      return res.status(400).json({ 
        message: "destinationDeliveries is required and cannot be empty" 
      });
    }

    // Create new booking
    const newBooking = new Booking({
      ...bookingData,
      reservationId: newReservationId,
      tripNumber: newTripNumber,
      status: "Pending"
    });

    console.log("📝 Booking document created (before save)");
    const savedBooking = await newBooking.save();
    console.log("✅ Booking saved successfully:", savedBooking._id);

    // Update vehicle and employee status ONLY if booking date is today or in the past
    if (isBookingDateToday(savedBooking.dateNeeded)) {
      console.log("📅 Booking date is today or past - updating statuses to 'On Trip'");
      await updateVehicleAndEmployeeStatus(savedBooking, "On Trip");
    } else {
      console.log("📅 Booking is scheduled for future - statuses remain unchanged");
      console.log(`📆 Scheduled for: ${new Date(savedBooking.dateNeeded).toLocaleDateString()}`);
      console.log("ℹ️ Vehicle and employees will be automatically marked 'On Trip' when the date arrives");
    }

    res.status(201).json(savedBooking);
  } catch (err) {
    console.error("❌ ========== ERROR CREATING BOOKING ==========");
    console.error("Error creating booking:", err);
    
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate booking ID. Please retry." });
    }

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      console.error("📋 Validation errors:", errors);
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
    const currentBooking = await Booking.findById(req.params.id);
    if (!currentBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (currentBooking.status === "Ready to go" || currentBooking.status === "In Transit") {
      return res.status(400).json({
        message: "Cannot edit booking while ready to go or in transit"
      });
    }

    console.log("🔄 Updating booking:", req.params.id, "with data:", req.body);

    const { reservationId, tripNumber, ...updateData } = req.body;

    // Check for schedule conflicts if date, vehicle, or employees changed
    if (updateData.dateNeeded || updateData.vehicleId || updateData.employeeAssigned) {
      const conflicts = await checkScheduleConflicts(
        updateData.vehicleId || currentBooking.vehicleId,
        updateData.employeeAssigned || currentBooking.employeeAssigned,
        updateData.dateNeeded || currentBooking.dateNeeded,
        req.params.id // Exclude current booking from conflict check
      );

      if (conflicts.vehicle || conflicts.employees.length > 0) {
        return res.status(409).json({
          message: "Schedule conflict detected",
          conflicts: {
            vehicle: conflicts.vehicle ? "Vehicle is already booked for this date" : null,
            employees: conflicts.employees.length > 0 
              ? `Employees ${conflicts.employees.join(", ")} are already booked for this date` 
              : null
          }
        });
      }
    }

    if (updateData.status) {
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

    const oldStatus = booking.status;
    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    // Update vehicle and employee status based on new booking status
    if (status === "In Transit" && oldStatus === "Pending") {
      await updateVehicleAndEmployeeStatus(booking, "On Trip");
    } else if (status === "Completed" || status === "Delivered") {
      await updateVehicleAndEmployeeStatus(booking, "Available");
    }

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
    const currentBooking = await Booking.findById(req.params.id);
    if (!currentBooking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

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
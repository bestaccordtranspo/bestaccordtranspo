// server/routes/driverAuth.js (Updated with location tracking and destination delivery)
import express from "express";
import Employee from "../models/Employee.js";
import jwt from "jsonwebtoken";
import { driverLogin, getDriverProfile } from "../controllers/driverAuthController.js";
import { 
  getDriverBookings, 
  getDriverBookingById, 
  updateBookingStatus, 
  getDriverBookingCount,
  updateDriverLocation,
  markDestinationDelivered
} from "../controllers/driverBookingsController.js";
import driverAuth from "../middleware/driverAuth1.js";

const router = express.Router();

// POST /api/driver/driver-login
// Delegate to controller which accepts employeeId OR username (case-insensitive)
router.post("/driver-login", driverLogin);

// Authentication routes from driverAuthController
router.post("/login", driverLogin); // Alternative login route
router.get("/profile", driverAuth, getDriverProfile);

// Booking routes for drivers (Note: /count must come before /:id to avoid conflicts)
router.get("/bookings/count", driverAuth, getDriverBookingCount);
router.get("/bookings", driverAuth, getDriverBookings);
router.get("/bookings/:id", driverAuth, getDriverBookingById);
router.put("/bookings/:id/status", driverAuth, updateBookingStatus);

// Location tracking route
router.put("/bookings/:id/location", driverAuth, updateDriverLocation);

// Mark individual destination as delivered
router.put("/bookings/:id/deliver-destination", driverAuth, markDestinationDelivered);

export default router;
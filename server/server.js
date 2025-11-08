import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import archiveRoutes from "./routes/archive.js";
import vehicleRoutes from "./routes/vehicle.js";
import employeeRoutes from "./routes/employees.js";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import bookingRoutes from "./routes/bookings.js";
import driverAuthRoutes from "./routes/driverAuth.js";
import staffRoutes from "./routes/staff.js";
import { initGridFS } from "./config/gridfs.js";
import tripReportsRoutes from './routes/tripReports.js';



dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' })); // Increased from default 100kb
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://bestaccordtranspo.vercel.app'
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}));

app.options("*", cors());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/driver", driverAuthRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/archive", archiveRoutes);
app.use('/api/trip-reports', tripReportsRoutes);

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    initGridFS();

    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("MongoDB connection error:", err));

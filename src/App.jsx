import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Monitoring from "./pages/Monitoring";
import TripReport from "./pages/TripReport";
import Vehicle from "./pages/Vehicle";
import Employee from "./pages/Employee";
import EmployeeInfo from "./pages/EmployeeInfo";
import Client from "./pages/Client";
import Archive from "./pages/Archive";
import ClientInfo from "./pages/ClientInfo";
import VehicleInfo from "./pages/VehicleInfo";
import DriverLogin from "./pages/DriverLogin";
import DriverDashboard from "./pages/DriverDashboard";
import DriverProfile from "./pages/DriverProfile";
import DriverBookings from "./pages/DriverBookings";
import DriverSchedule from "./pages/DriverSchedule";
import BookingInfo from "./pages/BookingInfo";
import PendingStaff from "./pages/PendingStaff";
import Staff from "./pages/Staff";
import Branch from "./pages/Branch"; // <-- added import

// Admin/Staff Private Route
function PrivateRoute({ children, roles }) {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // redirect only if token is missing
  if (!token) return <Navigate to="/login" />;

  // if roles are defined, redirect if user's role is not included
  if (roles && !roles.includes(role)) return <Navigate to="/dashboard" />;

  return children;
}

// Driver Private Route (separate auth for drivers)
function DriverPrivateRoute({ children }) {
  const driverToken = localStorage.getItem("driverToken");

  // Redirect to driver login if no driver token
  if (!driverToken) {
    console.log("❌ No driver token found, redirecting to driver-login");
    return <Navigate to="/driver-login" />;
  }

  console.log("✅ Driver token found, allowing access");
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" />} /> {/* 👈 Landing page */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/driver-login" element={<DriverLogin />} />

      {/* Driver Routes - Protected */}
      <Route
        path="/driver-dashboard"
        element={
          <DriverPrivateRoute>
            <DriverDashboard />
          </DriverPrivateRoute>
        }
      />
      <Route
        path="/driver/profile"
        element={
          <DriverPrivateRoute>
            <DriverProfile />
          </DriverPrivateRoute>
        }
      />
      <Route
        path="/driver/bookings"
        element={
          <DriverPrivateRoute>
            <DriverBookings />
          </DriverPrivateRoute>
        }
      />
      <Route
        path="/driver/schedule"
        element={
          <DriverPrivateRoute>
            <DriverSchedule />
          </DriverPrivateRoute>
        }
      />

      {/* Admin/Staff Routes - Protected */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute roles={["admin", "staff"]}>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="booking" element={<Booking />} />
        <Route path="booking/:id" element={<BookingInfo />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="trip-report" element={<TripReport />} />

        {/* Admin-only */}
        <Route
          path="vehicle"
          element={
            <PrivateRoute roles={["admin"]}>
              <Vehicle />
            </PrivateRoute>
          }
        />

        <Route
          path="pending-staff"
          element={
            <PrivateRoute roles={["admin"]}>
              <PendingStaff />
            </PrivateRoute>
          }
        />

        <Route
          path="vehicle/:id"
          element={
            <PrivateRoute roles={["admin"]}>
              <VehicleInfo />
            </PrivateRoute>
          }
        />
        <Route
          path="employee"
          element={
            <PrivateRoute roles={["admin"]}>
              <Employee />
            </PrivateRoute>
          }
        />
        <Route
          path="employee/:id"
          element={
            <PrivateRoute roles={["admin"]}>
              <EmployeeInfo />
            </PrivateRoute>
          }
        />
        <Route
          path="client"
          element={
            <PrivateRoute roles={["admin"]}>
              <Client />
            </PrivateRoute>
          }
        />
        <Route
          path="client/:id"
          element={
            <PrivateRoute roles={["admin"]}>
              <ClientInfo />
            </PrivateRoute>
          }
        />

        {/* Branch route (admin only) */}
        <Route
          path="branch"
          element={
            <PrivateRoute roles={["admin"]}>
              <Branch />
            </PrivateRoute>
          }
        />

        <Route
          path="staff"
          element={
            <PrivateRoute roles={["admin"]}>
              <Staff />
            </PrivateRoute>
          }
        />
        <Route
          path="archive"
          element={
            <PrivateRoute roles={["admin"]}>
              <Archive />
            </PrivateRoute>
          }
        />
      </Route>

      {/* Catch-all: Redirect unknown routes to login */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

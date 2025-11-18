// src/pages/DriverProfile.jsx
import React, { useEffect, useState } from "react";
import { axiosClient } from "../api/axiosClient";

import {
  User,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Clock,
  Mail,
} from "lucide-react";

export default function DriverProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("driverToken");

        if (!token) {
          setError("No driver token found. Please log in again.");
          setLoading(false);
          return;
        }

        const res = await axiosClient.get("/api/driver/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProfile(res.data);
        setError("");
      } catch (err) {
        console.error("Error fetching driver profile:", err);

        if (err.response?.status === 401) {
          setError("Session expired. Please log in again.");
          localStorage.removeItem("driverToken");
        } else if (err.response?.status === 403) {
          setError("Access denied. Not authorized as driver/helper.");
        } else {
          setError(err.response?.data?.msg || "Failed to load profile.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-purple-400/50 h-12 w-12"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-purple-400/50 rounded w-3/4"></div>
              <div className="h-4 bg-purple-400/50 rounded w-1/2"></div>
            </div>
          </div>
          <p className="text-center mt-4 text-purple-200">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Profile Error</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <p className="text-purple-200">No profile data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Profile Header */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 mb-4">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {profile.fullName}
            </h1>
            <p className="text-purple-300 font-semibold">{profile.role}</p>
            <p className="text-purple-200 text-sm font-mono mt-1">
              {profile.employeeId}
            </p>
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            {/* Contact Information */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-purple-300" />
                Contact Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">Mobile:</span>
                  <span className="font-medium text-white">
                    {profile.mobileNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Email:</span>
                  <span className="font-medium text-white text-xs break-all">
                    {profile.email || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Work Information */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-purple-300" />
                Work Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">Employment Type:</span>
                  <span className="font-medium text-white">
                    {profile.employmentType || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Shift:</span>
                  <span className="font-medium text-white">
                    {profile.shift || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Date Hired:</span>
                  <span className="font-medium text-white">
                    {profile.dateHired
                      ? new Date(profile.dateHired).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-purple-300" />
                Address Information
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-purple-200 block mb-1">
                    Current Address:
                  </span>
                  <span className="font-medium text-white">
                    {profile.currentAddress || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-purple-200 block mb-1">
                    Permanent Address:
                  </span>
                  <span className="font-medium text-white">
                    {profile.permanentAddress || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            {(profile.emergencyContactName ||
              profile.emergencyContactNumber) && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/20 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-red-400" />
                  Emergency Contact
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-200">Name:</span>
                    <span className="font-medium text-white">
                      {profile.emergencyContactName || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200">Phone:</span>
                    <span className="font-medium text-white">
                      {profile.emergencyContactNumber || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-purple-300 text-xs opacity-75">
          Last updated:{" "}
          {profile.updatedAt
            ? new Date(profile.updatedAt).toLocaleString()
            : "Unknown"}
        </div>
      </div>
    </div>
  );
}

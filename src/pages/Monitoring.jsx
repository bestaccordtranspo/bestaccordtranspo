import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  RefreshCw,
  MapPin,
  Clock,
  Package,
  Calendar,
  X,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  User,
  FileText,
  Camera,
} from "lucide-react";
import ReceiptGenerator from "../components/InvoiceGenerator";
import { createTruckDivIcon } from "../components/TruckMarkerIcon";

// This calculates ETA based on OSRM routing data
const calculateETA = (durationMinutes) => {
  if (!durationMinutes) return "Calculating...";

  const hours = Math.floor(durationMinutes / 60);
  const minutes = Math.round(durationMinutes % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export default function Monitoring() {
  const [bookings, setBookings] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [lastMapUpdate, setLastMapUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReceiptGenerator, setShowReceiptGenerator] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDestProofModal, setShowDestProofModal] = useState(false);
  const [showOriginPickup, setShowOriginPickup] = useState(false);
  const [originPickupProof, setOriginPickupProof] = useState(null);
  const [selectedDestProof, setSelectedDestProof] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  // sorting state
  const [sortBy, setSortBy] = useState("schedule"); // default sort
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // helper to toggle sort
  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  // return comparable value for sorting
  const getSortValue = (booking, key) => {
    switch (key) {
      case "trip":
        return (booking.tripNumber || "").toString().toLowerCase();
      case "route":
        return (
          getDestinations(booking).join(", ") ||
          booking.originAddress ||
          ""
        )
          .toString()
          .toLowerCase();
      case "status":
        return (booking.status || "").toString().toLowerCase();
      case "schedule":
        return booking.dateNeeded ? new Date(booking.dateNeeded).getTime() : 0;
      case "team":
        return (
          Array.isArray(booking.employeeAssigned)
            ? booking.employeeAssigned.join(", ")
            : booking.employeeAssigned || ""
        )
          .toString()
          .toLowerCase();
      default:
        return "";
    }
  };

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  // Animation variants (keeping your existing ones)
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 500,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: (progress) => ({
      width: `${progress}%`,
      transition: {
        duration: 1,
        ease: "easeOut",
        delay: 0.5,
      },
    }),
  };

  const tableRowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.2 },
    },
    hover: {
      backgroundColor: "#f9fafb",
      transition: { duration: 0.2 },
    },
  };

  // Status configuration
  const statusConfig = {
    Pending: {
      color: "bg-yellow-100 text-yellow-800",
      icon: AlertCircle,
      progress: 20,
      bgColor: "bg-yellow-500",
      step: 0,
    },
    "Ready to go": {
      color: "bg-blue-100 text-blue-800",
      icon: CheckCircle,
      progress: 40,
      bgColor: "bg-blue-500",
      step: 1,
    },
    "On Trip": {
      color: "bg-purple-100 text-purple-800",
      icon: PlayCircle,
      progress: 60,
      bgColor: "bg-purple-500",
      step: 2,
    },
    "In Transit": {
      color: "bg-purple-100 text-purple-800",
      icon: PlayCircle,
      progress: 60,
      bgColor: "bg-purple-500",
      step: 2,
    },
    Delivered: {
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
      progress: 80,
      bgColor: "bg-green-500",
      step: 3,
    },
    Completed: {
      color: "bg-gray-100 text-gray-800",
      icon: CheckCircle,
      progress: 100,
      bgColor: "bg-gray-500",
      step: 4,
    },
  };

  // Timeline steps
  const timelineSteps = [
    { name: "Preparing", status: "Pending" },
    { name: "Ready to go", status: "Ready to go" },
    { name: "On Trip", status: "On Trip" },
    { name: "Delivered", status: "Delivered" },
    { name: "Completed", status: "Completed" },
  ];

  // Helper function to get destinations array
  // Use destinationDeliveries (new model) as source of truth for destinations.
  // Fallback to legacy destinationAddress field when destinationDeliveries is missing.
  const getDestinations = (booking) => {
    if (!booking) return [];
    if (
      Array.isArray(booking.destinationDeliveries) &&
      booking.destinationDeliveries.length > 0
    ) {
      return booking.destinationDeliveries.map(
        (d) => d.destinationAddress || ""
      );
    }
    if (!booking.destinationAddress) return [];
    return Array.isArray(booking.destinationAddress)
      ? booking.destinationAddress
      : [booking.destinationAddress];
  };

  // Helper function to format destinations display
  const formatDestinations = (booking) => {
    const destinations = getDestinations(booking);
    if (destinations.length === 0) return "No destination";
    if (destinations.length === 1) return destinations[0];
    return `${destinations.length} destinations`;
  };

  // Add these new functions for receipt generation
  const handleGenerateReceipt = () => {
    if (selectedBooking && selectedBooking.status === "Completed") {
      setShowReceiptGenerator(true);
    }
  };

  const handleReceiptGenerated = (receiptData) => {
    console.log("Receipt generated:", receiptData);
    setShowReceiptGenerator(false);
    alert(
      `Receipt generated successfully! Receipt Number: ${receiptData.receiptNumber}`
    );
  };

  // Update booking status
  const updateBookingStatus = async (bookingId, newStatus) => {
    setUpdating(true);
    try {
      const response = await fetch(`${baseURL}/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedBooking = await response.json();

      // Update local state
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking._id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      setSelectedBooking((prev) => ({
        ...prev,
        status: newStatus,
      }));

      console.log("✅ Booking status updated successfully:", updatedBooking);
    } catch (err) {
      console.error("❌ Error updating booking status:", err);
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Fetch bookings data from MongoDB
  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      console.log(
        "🔄 Fetching bookings from API...",
        new Date().toLocaleTimeString()
      );

      const response = await fetch(`${baseURL}/api/bookings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Fetched bookings data:", data);

      const bookingsArray = Array.isArray(data) ? data : data.bookings || [];

      // Log bookings with driver locations
      const tripsInProgress = bookingsArray.filter(
        (b) => b.status === "In Transit" || b.status === "On Trip"
      );

      console.log(`📊 Total bookings: ${bookingsArray.length}`);
      console.log(`🚛 Trips in progress: ${tripsInProgress.length}`);

      tripsInProgress.forEach((booking) => {
        if (booking.driverLocation) {
          console.log(`📍 Trip ${booking.tripNumber} location:`, {
            lat: booking.driverLocation.latitude,
            lng: booking.driverLocation.longitude,
            lastUpdated: booking.driverLocation.lastUpdated,
            accuracy: booking.driverLocation.accuracy,
          });
        } else {
          console.warn(`⚠️ Trip ${booking.tripNumber} has no driver location`);
        }
      });

      setBookings(bookingsArray);
      setFilteredBookings(bookingsArray);
      setLastMapUpdate(new Date());
    } catch (err) {
      console.error("❌ Error fetching bookings:", err);
      setError(`Failed to load bookings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Initialize map with proper marker handling
  const initializeMap = async () => {
    if (!selectedBooking || !mapRef.current) return;

    // Clean up existing map
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    try {
      // Check if Leaflet is already loaded
      if (window.L) {
        await createMap();
      } else {
        // Load Leaflet dynamically
        const leafletScript = document.createElement("script");
        leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        leafletScript.onload = () => createMap();
        document.head.appendChild(leafletScript);
      }
    } catch (error) {
      console.error("Error loading map:", error);
    }
  };

  // OSRM Routing function to get actual road routes
  const getRoute = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          coordinates: route.geometry.coordinates.map((coord) => [
            coord[1],
            coord[0],
          ]),
          distance: (route.distance / 1000).toFixed(2), // km
          duration: Math.round(route.duration / 60), // minutes
          eta: new Date(Date.now() + route.duration * 1000), // ETA timestamp
        };
      }
    } catch (error) {
      console.error("OSRM routing error:", error);
      return null;
    }
  };

  // IMPROVED: Create map with multiple destination support and fallback geocoding

  // Create map with database coordinates and fallback geocoding
  const createMap = async () => {
    if (!mapRef.current) return;

    const L = window.L;

    // Initialize map centered on Philippines
    const map = L.map(mapRef.current).setView([14.5995, 120.9842], 6);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Helper function to fetch client coordinates
    const fetchClientCoordinates = async (address) => {
      try {
        console.log(`🔍 Fetching coordinates from database for: "${address}"`);
        const response = await fetch(
          `${baseURL}/api/clients/by-address?address=${encodeURIComponent(
            address
          )}`
        );

        if (!response.ok) {
          console.log(`⚠️ No client found in database for: "${address}"`);
          return null;
        }

        const client = await response.json();
        if (client && client.address?.latitude && client.address?.longitude) {
          console.log(
            `✅ Found coordinates in database: [${client.address.latitude}, ${client.address.longitude}]`
          );
          return {
            coords: [client.address.latitude, client.address.longitude],
            displayName: address,
            confidence: "exact",
            source: "database",
          };
        }
        return null;
      } catch (error) {
        console.error("Error fetching client coordinates:", error);
        return null;
      }
    };

    // Geocoding function (keep existing implementation)
    const geocodeAddress = async (address, retryLevel = 0) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1100));

        let searchQuery = address;

        if (retryLevel === 0) {
          searchQuery = `${address}, Philippines`;
        } else if (retryLevel === 1) {
          const cityMatch = address.match(
            /City of ([^,]+)|Taguig|Makati|Manila|Quezon City|Pasig|Mandaluyong|Pasay|Parañaque|Las Piñas|Muntinlupa|Caloocan|Malabon|Navotas|Valenzuela|San Juan|Marikina|Pateros/i
          );
          if (cityMatch) {
            const city = cityMatch[1] || cityMatch[0];
            searchQuery = `${city}, Metro Manila, Philippines`;
          }
        } else if (retryLevel === 2) {
          if (
            address.toLowerCase().includes("metro manila") ||
            address.toLowerCase().includes("ncr")
          ) {
            searchQuery = "Metro Manila, Philippines";
          }
        }

        console.log(`🔍 Geocoding attempt ${retryLevel + 1}: "${searchQuery}"`);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&countrycodes=ph&limit=3`,
          {
            headers: {
              "User-Agent": "BestAccord-Monitoring-App",
            },
          }
        );
        const data = await response.json();

        if (data && data.length > 0) {
          console.log(`✅ Geocoded "${address}":`, data[0]);
          return {
            coords: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
            displayName: data[0].display_name,
            confidence:
              retryLevel === 0 ? "high" : retryLevel === 1 ? "medium" : "low",
            source: "geocoding",
          };
        } else if (retryLevel < 2) {
          console.warn(
            `⚠️ No results for "${searchQuery}", trying fallback...`
          );
          return await geocodeAddress(address, retryLevel + 1);
        } else {
          console.warn(`❌ All geocoding attempts failed for: "${address}"`);
          return getHardcodedCoordinates(address);
        }
      } catch (error) {
        console.error(`❌ Geocoding error for "${address}":`, error);
        if (retryLevel < 2) {
          return await geocodeAddress(address, retryLevel + 1);
        }
        return getHardcodedCoordinates(address);
      }
    };

    // Hardcoded coordinates fallback (keep existing)
    const getHardcodedCoordinates = (address) => {
      const lowerAddress = address.toLowerCase();

      const cityCoords = {
        taguig: [14.5176, 121.0509],
        makati: [14.5547, 121.0244],
        manila: [14.5995, 120.9842],
        quezon: [14.676, 121.0437],
        pasig: [14.5764, 121.0851],
        mandaluyong: [14.5794, 121.0359],
        pasay: [14.5378, 121.0014],
        parañaque: [14.4793, 121.0198],
        paranaque: [14.4793, 121.0198],
        "las piñas": [14.4453, 120.9831],
        "las pinas": [14.4453, 120.9831],
        muntinlupa: [14.3754, 121.0359],
        caloocan: [14.6507, 120.9674],
        malabon: [14.6622, 120.957],
        navotas: [14.6684, 120.9387],
        valenzuela: [14.7001, 120.9828],
        "san juan": [14.6019, 121.0355],
        marikina: [14.6507, 121.1029],
        pateros: [14.5445, 121.0658],
      };

      for (const [city, coords] of Object.entries(cityCoords)) {
        if (lowerAddress.includes(city)) {
          return {
            coords,
            displayName: `${city.charAt(0).toUpperCase() + city.slice(1)} City`,
            confidence: "fallback",
            source: "hardcoded",
          };
        }
      }

      console.log(`📍 Using default Metro Manila coordinates`);
      return {
        coords: [14.5995, 120.9842],
        displayName: "Metro Manila",
        confidence: "default",
        source: "hardcoded",
      };
    };

    const allCoordinates = [];
    const markers = [];
    let currentRouteInfo = null;

    try {
      // Add origin marker with improved priority
      let originResult = null;
      if (selectedBooking.originAddress) {
        // PRIORITY 1: Check booking coordinates first
        if (selectedBooking.latitude && selectedBooking.longitude) {
          originResult = {
            coords: [selectedBooking.latitude, selectedBooking.longitude],
            displayName: selectedBooking.originAddress,
            confidence: "exact",
            source: "booking",
          };
          console.log("✅ Using stored origin coordinates from booking");
        }
        // PRIORITY 2: Try client database
        else {
          originResult = await fetchClientCoordinates(
            selectedBooking.originAddress
          );
        }

        // PRIORITY 3: Fallback to geocoding
        if (!originResult) {
          console.log(
            `⚠️ No stored coordinates for origin, using geocoding...`
          );
          originResult = await geocodeAddress(selectedBooking.originAddress);
        }
      }

      // Get all destinations
      const destinations = getDestinations(selectedBooking);

      // 🎯 KEY LOGIC: Determine which destinations to show based on delivery status
      let destinationsToDisplay = [];
      let activeDestinationIndex = -1;

      if (
        selectedBooking.status === "In Transit" ||
        selectedBooking.status === "On Trip"
      ) {
        // Show only pending destinations
        if (
          selectedBooking.destinationDeliveries &&
          selectedBooking.destinationDeliveries.length > 0
        ) {
          destinationsToDisplay = selectedBooking.destinationDeliveries
            .filter((d) => d.status === "pending")
            .map((d) => ({
              address: d.destinationAddress,
              index: d.destinationIndex,
              isPending: true,
            }));

          // The first pending destination is the active one
          if (destinationsToDisplay.length > 0) {
            activeDestinationIndex = destinationsToDisplay[0].index;
          }
        } else {
          // Fallback for old bookings without destination tracking
          destinationsToDisplay = destinations.map((addr, idx) => ({
            address: addr,
            index: idx,
            isPending: true,
          }));
          activeDestinationIndex = 0;
        }
      } else {
        // For non-active trips, show all destinations
        destinationsToDisplay = destinations.map((addr, idx) => ({
          address: addr,
          index: idx,
          isPending: false,
        }));
      }

      console.log(
        `🗺️ Displaying ${destinationsToDisplay.length} destinations:`,
        destinationsToDisplay
      );

      // Add destination markers
      for (let i = 0; i < destinationsToDisplay.length; i++) {
        const destInfo = destinationsToDisplay[i];
        const destAddress = destInfo.address;

        if (destAddress) {
          let destResult = null;

          // PRIORITY 1: Check if destination has stored coordinates in destinationDeliveries
          if (
            selectedBooking.destinationDeliveries &&
            selectedBooking.destinationDeliveries[destInfo.index]
          ) {
            const dest = selectedBooking.destinationDeliveries[destInfo.index];
            if (dest.latitude && dest.longitude) {
              destResult = {
                coords: [dest.latitude, dest.longitude],
                displayName: destAddress,
                confidence: "exact",
                source: "booking",
              };
              console.log(
                `✅ Using stored destination coordinates from booking for stop ${
                  destInfo.index + 1
                }`
              );
            }
          }

          // PRIORITY 2: Try branch database
          if (!destResult) {
            destResult = await fetchClientCoordinates(destAddress);
          }

          // PRIORITY 3: Fallback to geocoding
          if (!destResult) {
            console.log(
              `⚠️ No stored coordinates for "${destAddress}", using geocoding...`
            );
            destResult = await geocodeAddress(destAddress);
          }

          if (destResult && destResult.coords) {
            allCoordinates.push(destResult.coords);

            const colors = [
              { fill: "#ef4444", border: "#dc2626" },
              { fill: "#f59e0b", border: "#d97706" },
              { fill: "#8b5cf6", border: "#7c3aed" },
              { fill: "#ec4899", border: "#db2777" },
              { fill: "#06b6d4", border: "#0891b2" },
            ];
            const color = colors[destInfo.index % colors.length];

            // Highlight the active destination differently
            const isActive = destInfo.index === activeDestinationIndex;
            const markerRadius = isActive ? 12 : 10;
            const markerColor = isActive ? "#ff0000" : color.fill;

            const destMarker = L.circleMarker(destResult.coords, {
              radius: markerRadius,
              fillColor: markerColor,
              color: "#ffffff",
              weight: isActive ? 4 : 3,
              opacity: 1,
              fillOpacity: isActive ? 1 : 0.9,
            }).addTo(map);

            const stopLabel =
              destinations.length > 1
                ? `Stop ${destInfo.index + 1}${isActive ? " (Next)" : ""}`
                : "Destination";

            const confidenceText =
              destResult.source === "database"
                ? "✓ Exact location (from database)"
                : destResult.confidence === "high"
                ? "✓ Geocoded (high accuracy)"
                : destResult.confidence === "medium"
                ? "⚠️ Approximate area"
                : destResult.confidence === "fallback"
                ? "📍 City center (approximate)"
                : "📍 General area";

            destMarker.bindPopup(`
                <div style="min-width: 200px;">
                  <strong style="color: ${markerColor}; font-size: 14px;">📍 ${stopLabel}</strong><br/>
                  <p style="margin: 8px 0 0 0; font-size: 12px;">${destAddress}</p>
                  <p style="margin: 4px 0 0 0; font-size: 10px; color: #6b7280;">${confidenceText}</p>
                  ${
                    isActive
                      ? '<p style="margin: 4px 0 0 0; font-size: 10px; color: #ef4444; font-weight: bold;">→ Current destination</p>'
                      : ""
                  }
                </div>
              `);

            markers.push({
              type: "destination",
              marker: destMarker,
              index: destInfo.index,
              coords: destResult.coords,
              isActive,
            });
          }
        }
      }

      // 🚚 Add driver location and route ONLY to active destination
      if (
        selectedBooking.driverLocation &&
        selectedBooking.driverLocation.latitude &&
        selectedBooking.driverLocation.longitude &&
        (selectedBooking.status === "In Transit" ||
          selectedBooking.status === "On Trip")
      ) {
        const driverCoords = [
          selectedBooking.driverLocation.latitude,
          selectedBooking.driverLocation.longitude,
        ];

        allCoordinates.push(driverCoords);

        // Create custom truck icon
        const truckIcon = createTruckDivIcon(L, "#F97316");

        const truckMarker = L.marker(driverCoords, {
          icon: truckIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        const lastUpdated = selectedBooking.driverLocation.lastUpdated
          ? new Date(
              selectedBooking.driverLocation.lastUpdated
            ).toLocaleString()
          : "Unknown";

        const accuracy = selectedBooking.driverLocation.accuracy
          ? `±${Math.round(selectedBooking.driverLocation.accuracy)}m`
          : "Unknown";

        const getTimeSinceUpdate = () => {
          if (!selectedBooking.driverLocation.lastUpdated) return "Unknown";

          const now = new Date();
          const lastUpdateTime = new Date(
            selectedBooking.driverLocation.lastUpdated
          );
          const diffMs = now - lastUpdateTime;
          const diffMins = Math.floor(diffMs / 60000);

          if (diffMins < 1) return "Just now";
          if (diffMins < 60)
            return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;

          const diffHours = Math.floor(diffMins / 60);
          return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        };

        const driverName =
          selectedBooking.employeeDetails?.find((emp) => emp.role === "Driver")
            ?.employeeName ||
          selectedBooking.employeeDetails?.find((emp) => emp.role === "Driver")
            ?.fullName ||
          "Driver";

        truckMarker.bindPopup(`
            <div style="min-width: 220px;">
              <strong style="color: #F97316; font-size: 14px;">🚚 ${driverName}'s Location</strong><br/>
              <p style="margin: 8px 0 4px 0; font-size: 11px;">
                <strong>Trip:</strong> ${selectedBooking.tripNumber}<br/>
                <strong>Status:</strong> ${selectedBooking.status}
              </p>
              <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
              <p style="margin: 4px 0; font-size: 11px;">
                <strong>Coordinates:</strong><br/>
                ${driverCoords[0].toFixed(6)}, ${driverCoords[1].toFixed(6)}
              </p>
              <p style="margin: 4px 0; font-size: 10px; color: #6b7280;">
                <strong>Last Updated:</strong> ${getTimeSinceUpdate()}<br/>
                <span style="font-size: 9px;">${lastUpdated}</span>
              </p>
              <p style="margin: 4px 0; font-size: 10px; color: #6b7280;">
                <strong>GPS Accuracy:</strong> ${accuracy}
              </p>
              <p style="margin: 6px 0 0 0; font-size: 9px; color: #059669; background: #d1fae5; padding: 4px 6px; border-radius: 4px;">
                ✓ Live GPS tracking (updates every 5 min)
              </p>
            </div>
          `);

        if (selectedBooking.driverLocation.accuracy) {
          L.circle(driverCoords, {
            radius: selectedBooking.driverLocation.accuracy,
            color: "#F97316",
            fillColor: "#F97316",
            fillOpacity: 0.1,
            weight: 1,
            opacity: 0.3,
          }).addTo(map);
        }

        // 🎯 Draw route ONLY to the ACTIVE (next pending) destination
        const activeDestMarker = markers.find(
          (m) => m.type === "destination" && m.isActive
        );

        if (activeDestMarker && activeDestMarker.coords) {
          console.log(
            `🗺️ Drawing route to active destination (index ${activeDestMarker.index})`
          );

          const driverRoute = await getRoute(
            driverCoords,
            activeDestMarker.coords
          );

          if (driverRoute && driverRoute.coordinates) {
            console.log(
              `✅ Route found! Distance: ${driverRoute.distance}km, Duration: ${driverRoute.duration}min`
            );

            // Store route info for ETA display
            currentRouteInfo = {
              distance: driverRoute.distance,
              duration: driverRoute.duration,
              eta: driverRoute.eta,
              destinationIndex: activeDestMarker.index,
            };

            // Draw the active route in bold orange
            const routeLine = L.polyline(driverRoute.coordinates, {
              color: "#F97316",
              weight: 5,
              opacity: 0.8,
            }).addTo(map);

            // Add distance/time label on the route
            const midpoint =
              driverRoute.coordinates[
                Math.floor(driverRoute.coordinates.length / 2)
              ];
            L.marker(midpoint, {
              icon: L.divIcon({
                className: "route-label",
                html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; border: 2px solid #F97316; font-size: 11px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap;">
                          🚚 ${driverRoute.distance}km
                        </div>`,
                iconSize: [100, 30],
                iconAnchor: [50, 15],
              }),
            }).addTo(map);
          } else {
            console.log(`⚠️ OSRM routing failed, using straight line`);
            L.polyline([driverCoords, activeDestMarker.coords], {
              color: "#F97316",
              weight: 4,
              opacity: 0.7,
              dashArray: "10, 5",
            }).addTo(map);
          }
        } else {
          console.log(`⚠️ No active destination found for route`);
        }

        markers.push({ type: "driver", marker: truckMarker });
      }

      // Update route info state
      setRouteInfo(currentRouteInfo);

      // Fit map to show all markers
      if (allCoordinates.length > 0) {
        const bounds = L.latLngBounds(allCoordinates);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
        });
      } else {
        map.setView([14.5995, 120.9842], 6);
      }
    } catch (error) {
      console.error("Error creating map markers:", error);
    }

    // // Add legend
    // const legend = L.control({ position: 'bottomright' });
    // legend.onAdd = function () {
    //   const div = L.DomUtil.create('div', 'info legend');
    //   div.style.backgroundColor = 'white';
    //   div.style.padding = '10px';
    //   div.style.borderRadius = '8px';
    //   div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

    //   let legendHtml = `
    //     <div style="font-size: 11px;">
    //       <strong>Map Legend</strong><br/>
    //       <span style="color: #10b981;">●</span> Origin<br/>
    //       <span style="color: #ef4444;">●</span> Active Destination<br/>
    //       <span style="color: #f59e0b;">●</span> Pending Stops<br/>
    //   `;

    //   if (selectedBooking.driverLocation?.latitude && selectedBooking.driverLocation?.longitude) {
    //     legendHtml += `<span style="color: #F97316;">🚚</span> Driver Location<br/>`;
    //     legendHtml += `<span style="color: #F97316;">─</span> Active Route<br/>`;
    //   }

    //   legendHtml += `
    //       <hr style="margin: 5px 0;"/>
    //       <div style="font-size: 10px; color: #6b7280;">
    //         ✓ Exact match<br/>
    //         ⚠️ Approximate<br/>
    //         📍 City center
    //       </div>
    //     </div>
    //   `;

    //   div.innerHTML = legendHtml;
    //   return div;
    // };
    // legend.addTo(map);

    mapInstance.current = map;

    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 100);
  };

  // Filter bookings
  useEffect(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter((booking) => {
        const destinations = getDestinations(booking);
        return (
          booking.tripNumber
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.reservationId
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.companyName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          destinations.some((dest) =>
            dest?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      });
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const va = getSortValue(a, sortBy);
        const vb = getSortValue(b, sortBy);

        // numeric compare for schedule (timestamp)
        if (sortBy === "schedule") {
          return sortDir === "asc" ? va - vb : vb - va;
        }

        // fallback string compare
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredBookings(filtered);
  }, [searchTerm, statusFilter, bookings, sortBy, sortDir]);

  // Open booking details
  const openBookingDetails = (booking) => {
    console.log("Opening booking details for:", booking);
    setSelectedBooking(booking);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
  };

  const openProofModal = () => {
    setShowProofModal(true);
  };

  const closeProofModal = () => {
    setShowProofModal(false);
  };

  // Initialize map when modal opens
  useEffect(() => {
    if (showModal && selectedBooking && mapRef.current) {
      setTimeout(() => initializeMap(), 100);
    }
  }, [showModal, selectedBooking]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchBookings();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing bookings...");
      fetchBookings();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Force map re-initialization when booking data changes
  useEffect(() => {
    if (showModal && selectedBooking && mapRef.current) {
      console.log("🗺️ Re-initializing map due to data update");

      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initializeMap();
      }, 100);
    }
  }, [showModal, selectedBooking, lastMapUpdate]);

  const handleManualRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    setRefreshing(true);

    try {
      // Refresh the bookings list
      await fetchBookings();

      // If modal is open with a selected booking, refresh that specific booking
      if (showModal && selectedBooking) {
        console.log("🔄 Refreshing booking data for:", selectedBooking._id);

        const response = await fetch(
          `${baseURL}/api/bookings/${selectedBooking._id}`
        );

        if (response.ok) {
          const updatedBooking = await response.json();
          console.log("✅ Updated booking data:", updatedBooking);

          // Check if driver location exists
          if (updatedBooking.driverLocation) {
            console.log(
              "📍 Driver location found:",
              updatedBooking.driverLocation
            );
          } else {
            console.warn("⚠️ No driver location in updated booking");
          }

          setSelectedBooking(updatedBooking);
          setLastMapUpdate(new Date());

          // Force map refresh after a small delay
          setTimeout(() => {
            console.log("🗺️ Re-initializing map with fresh data");
            initializeMap();
          }, 200);

          // Show success message
          const successMsg = updatedBooking.driverLocation
            ? `Location updated! Last seen: ${new Date(
                updatedBooking.driverLocation.lastUpdated
              ).toLocaleTimeString()}`
            : "Data refreshed (no active location tracking)";

          // Optional: Use a toast notification instead of alert if you have one
          alert(successMsg);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
    } catch (err) {
      console.error("❌ Error refreshing:", err);
      alert(`Failed to refresh: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Get unique statuses
  const uniqueStatuses = [
    "All",
    ...new Set(bookings.map((b) => b.status || "Pending")),
  ];

  // Get current step for timeline
  const getCurrentStep = (status) => {
    return statusConfig[status]?.step || 0;
  };

  // Helper function to get employee display name
  const getEmployeeDisplayName = (employeeId, employeeDetails) => {
    if (employeeDetails && employeeDetails.length > 0) {
      const emp = employeeDetails.find((e) => e.employeeId === employeeId);
      return emp ? emp.employeeName || emp.fullName || emp.name : employeeId;
    }
    return employeeId || "Unknown";
  };

  // Check if booking is scheduled for today
  const isBookingScheduledForToday = (booking) => {
    if (!booking || !booking.dateNeeded) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bookingDate = new Date(booking.dateNeeded);
    bookingDate.setHours(0, 0, 0, 0);
    
    return bookingDate.getTime() === today.getTime();
  };

  // Handle confirm ready to go
  const handleConfirmReadyToGo = () => {
    if (selectedBooking) {
      if (!isBookingScheduledForToday(selectedBooking)) {
        alert(`This trip is scheduled for ${new Date(selectedBooking.dateNeeded).toLocaleDateString()}. You can only confirm "Ready to go" on the scheduled date.`);
        return;
      }
      updateBookingStatus(selectedBooking._id, "Ready to go");
    }
  };

  return (
    <>
      {/* Add Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      <motion.div
        className="min-h-screen bg-gray-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <motion.div
          className="flex justify-between items-center mb-6 p-6 bg-white border-b border-purple-100"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-2">
              Trip Monitoring
            </h1>
            <p className="text-gray-600 text-sm">
              Track and manage ongoing trips and delivery status
            </p>
          </div>

          <motion.button
            onClick={fetchBookings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="font-medium">Error loading data:</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchBookings}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <motion.input
            type="text"
            placeholder="Search by Trip Number, Reservation ID, or Destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            whileFocus={{ scale: 1.01 }}
          />

          <motion.select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            whileFocus={{ scale: 1.01 }}
          >
            {uniqueStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </motion.select>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 px-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
          {Object.entries(
            bookings.reduce((acc, booking) => {
              const status = booking.status || "Pending";
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {})
          ).map(([status, count], index) => {
            const config = statusConfig[status] || statusConfig["Pending"];
            const StatusIcon = config.icon;
            const isActive = statusFilter === status;

            return (
              <motion.div
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`bg-white p-4 rounded-lg shadow-sm border-l-4 hover:shadow-md transition cursor-pointer ${
                  isActive
                    ? "border-purple-600 ring-2 ring-purple-200 bg-purple-50"
                    : "border-purple-500"
                }`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        isActive ? "text-purple-700" : "text-gray-600"
                      }`}
                    >
                      {status}
                    </p>
                    <motion.p
                      className={`text-2xl font-bold ${
                        isActive ? "text-purple-800" : "text-gray-800"
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {count}
                    </motion.p>
                  </div>
                  <motion.div
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  >
                    <StatusIcon
                      className={`w-8 h-8 ${
                        isActive ? "text-purple-600" : "text-purple-400"
                      }`}
                    />
                  </motion.div>
                </div>
                {isActive && (
                  <motion.div
                    className="mt-2 text-xs text-purple-600 font-medium"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ✓ Showing all "{status}" Bookings
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Monitoring Table */}
        <motion.div
          className="bg-white rounded-lg shadow-sm mx-6 overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.3 }}
        >
          {loading ? (
            <motion.div
              className="flex items-center justify-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </motion.div>
              <span className="ml-2 text-gray-600">Loading trips...</span>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("trip")}
                    >
                      <div className="flex items-center gap-2">
                        Trip Info
                        {sortBy === "trip" && (
                          <span className="text-xs">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("route")}
                    >
                      <div className="flex items-center gap-2">
                        Route
                        {sortBy === "route" && (
                          <span className="text-xs">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-2">
                        Status
                        {sortBy === "status" && (
                          <span className="text-xs">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("schedule")}
                    >
                      <div className="flex items-center gap-2">
                        Schedule
                        {sortBy === "schedule" && (
                          <span className="text-xs">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => handleSort("team")}
                    >
                      <div className="flex items-center gap-2">
                        Team
                        {sortBy === "team" && (
                          <span className="text-xs">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <AnimatePresence>
                    {filteredBookings.map((booking, index) => {
                      const config = statusConfig[booking.status || "Pending"];
                      const StatusIcon = config.icon;
                      const destinations = getDestinations(booking);

                      return (
                        <motion.tr
                          key={booking._id}
                          className="hover:bg-purple-50 transition"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{
                            backgroundColor: "rgba(147, 51, 234, 0.05)",
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {booking.tripNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                {booking.reservationId}
                              </div>
                              <div className="text-xs text-purple-600 font-medium">
                                {booking.companyName}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="flex items-center text-green-600 mb-1">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">
                                  {booking.originAddress}
                                </span>
                              </div>
                              {destinations.map((dest, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center text-red-600 mt-1"
                                >
                                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {destinations.length > 1 && `(${idx + 1}) `}
                                    {dest}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div>
                              <motion.span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} mb-2`}
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.05 + 0.1 }}
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {booking.status || "Pending"}
                              </motion.span>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <motion.div
                                  className={`h-2 rounded-full ${config.bgColor}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${config.progress}%` }}
                                  transition={{
                                    delay: index * 0.05 + 0.2,
                                    duration: 0.5,
                                  }}
                                ></motion.div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {config.progress}% Complete
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center mb-1">
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(
                                booking.dateNeeded
                              ).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {booking.timeNeeded}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {booking.employeeAssigned &&
                              booking.employeeAssigned.length > 0 ? (
                                booking.employeeAssigned
                                  .slice(0, 2)
                                  .map((empId, idx) => (
                                    <motion.span
                                      key={idx}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{
                                        delay: index * 0.05 + 0.3 + idx * 0.1,
                                      }}
                                    >
                                      {getEmployeeDisplayName(
                                        empId,
                                        booking.employeeDetails
                                      )}
                                    </motion.span>
                                  ))
                              ) : (
                                <span className="text-xs text-gray-500">
                                  Not assigned
                                </span>
                              )}
                              {booking.employeeAssigned &&
                                booking.employeeAssigned.length > 2 && (
                                  <span className="text-xs text-gray-500">
                                    +{booking.employeeAssigned.length - 2}
                                  </span>
                                )}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <motion.button
                              onClick={() => openBookingDetails(booking)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-purple-600 bg-purple-100 hover:bg-purple-200 transition"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {filteredBookings.length === 0 && !loading && !error && (
                <motion.div
                  className="text-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No trips found
                  </h3>
                  <p className="text-gray-500">
                    {bookings.length === 0
                      ? "No bookings available. Create a booking first."
                      : "No trips match your current filters."}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Trip Details Modal - Fixed Overlay */}
      <AnimatePresence>
        {showModal && selectedBooking && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(5px)",
            }}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">
                    Trip Monitoring
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span>
                      Track and manage ongoing trips and delivery status
                    </span>
                    {lastMapUpdate && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs text-gray-500 font-medium">
                          Last updated: {lastMapUpdate.toLocaleTimeString()}
                        </span>
                      </>
                    )}
                    {selectedBooking?.driverLocation?.lastUpdated && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Live tracking active
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Refresh Button */}
                  <motion.button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className={`p-2 transition-colors rounded-lg ${
                      refreshing
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    }`}
                    whileHover={!refreshing ? { scale: 1.1 } : {}}
                    whileTap={!refreshing ? { scale: 0.9 } : {}}
                    title={
                      refreshing ? "Refreshing..." : "Refresh location data"
                    }
                  >
                    <RefreshCw
                      className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                    />
                  </motion.button>

                  {/* Close Button */}
                  <motion.button
                    onClick={closeModal}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div
                className="overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 80px)" }}
              >
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      {/* Trip Header with Timeline */}
                      <motion.div
                        className="bg-white rounded-lg border border-gray-200 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                      >
                        <motion.h2
                          className="text-2xl font-bold text-gray-900 mb-6"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          Trip #{selectedBooking.tripNumber}
                        </motion.h2>

                        {/* Progress Timeline */}
                        <div className="relative mb-8">
                          <div className="flex items-center justify-between">
                            {timelineSteps.map((step, index) => {
                              const currentStep = getCurrentStep(
                                selectedBooking.status || "Pending"
                              );
                              const isActive = index === currentStep;
                              const isCompleted = index < currentStep;

                              return (
                                <motion.div
                                  key={index}
                                  className="flex flex-col items-center relative flex-1"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2 + index * 0.1 }}
                                >
                                  <motion.div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 bg-white ${
                                      isActive
                                        ? "bg-purple-600 border-purple-600 text-white"
                                        : isCompleted
                                        ? "bg-purple-600 border-purple-600 text-white"
                                        : "border-gray-300 text-gray-400"
                                    }`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    whileHover={{ scale: 1.1 }}
                                  >
                                    {isCompleted || isActive ? (
                                      <CheckCircle className="w-5 h-5" />
                                    ) : (
                                      <div className="w-3 h-3 rounded-full bg-current" />
                                    )}
                                  </motion.div>
                                  <motion.span
                                    className={`text-xs mt-2 font-medium text-center ${
                                      isActive || isCompleted
                                        ? "text-purple-600"
                                        : "text-gray-500"
                                    }`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 + index * 0.1 }}
                                  >
                                    {step.name}
                                  </motion.span>

                                  {/* Progress Line */}
                                  {index < timelineSteps.length - 1 && (
                                    <motion.div
                                      className={`absolute top-5 h-0.5 ${
                                        isCompleted
                                          ? "bg-purple-600"
                                          : "bg-gray-300"
                                      }`}
                                      style={{
                                        left: "50%",
                                        right: "-50%",
                                        width: "100%",
                                      }}
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: 1 }}
                                      transition={{
                                        delay: 0.7 + index * 0.1,
                                        duration: 0.3,
                                      }}
                                    />
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Map Container */}
                    <motion.div
                      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <div
                        ref={mapRef}
                        className="w-full h-96"
                        style={{ minHeight: "400px" }}
                      >
                        <div className="flex items-center justify-center h-full bg-gray-100">
                          <div className="text-center">
                            <motion.div
                              animate={{ y: [0, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            </motion.div>
                            <p className="text-gray-500 text-sm">
                              Loading route map...
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Route Timeline with ETA */}
                    <motion.div
                      className="bg-white rounded-lg border border-gray-200 p-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      {/* Header with Stats and ETA */}
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          Route Timeline
                        </h3>
                        <div className="flex flex-col items-end gap-1">
                          {selectedBooking.destinationDeliveries?.length > 1 &&
                            (() => {
                              const delivered =
                                selectedBooking.destinationDeliveries.filter(
                                  (d) => d.status === "delivered"
                                ).length;
                              const total =
                                selectedBooking.destinationDeliveries.length;
                              const pending = total - delivered;
                              return (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                                    {delivered} Delivered
                                  </span>
                                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                                    {pending} Pending
                                  </span>
                                </div>
                              );
                            })()}

                          {/* Display ETA if available */}
                          {routeInfo &&
                            (selectedBooking.status === "In Transit" ||
                              selectedBooking.status === "On Trip") && (
                              <div className="mt-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                ETA: {calculateETA(routeInfo.duration)} (
                                {routeInfo.distance}km)
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-6">
                        {/* Trip Started */}
                        <div className="flex items-start space-x-4">
                          <div className="relative flex flex-col items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center z-10">
                              <Package className="w-5 h-5 text-white" />
                            </div>
                            <div className="w-0.5 h-full bg-blue-200 absolute top-10"></div>
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                Trip Started
                              </p>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  selectedBooking.createdAt
                                ).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(
                                selectedBooking.dateNeeded
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}{" "}
                              at {selectedBooking.timeNeeded}
                            </p>
                          </div>
                        </div>

                        {/* Origin Pickup */}
                        <div className="flex items-start space-x-4">
                          <div className="relative flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                selectedBooking.originPickedUp
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            >
                              {selectedBooking.originPickedUp ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : (
                                <MapPin className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div
                              className={`w-0.5 h-full absolute top-10 ${
                                selectedBooking.originPickedUp
                                  ? "bg-green-200"
                                  : "bg-gray-200"
                              }`}
                            ></div>
                          </div>
                          <div className="flex-1 pb-8">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-900">
                                Picked up from Origin
                                {selectedBooking.originPickedUp && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                    ✓ Picked Up
                                  </span>
                                )}
                              </p>
                              {selectedBooking.originPickedUp &&
                                selectedBooking.originPickupAt && (
                                  <span className="text-xs text-gray-500">
                                    {new Date(
                                      selectedBooking.originPickupAt
                                    ).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {selectedBooking.originAddress}
                            </p>
                            {selectedBooking.originPickedUp ? (
                              <p className="text-xs text-green-600 mt-1 font-medium">
                                ✓ Cargo picked up successfully
                              </p>
                            ) : selectedBooking.status === "In Transit" ? (
                              <p className="text-xs text-orange-600 mt-1 font-medium">
                                → Driver en route to pickup location
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">
                                Awaiting pickup...
                              </p>
                            )}

                            {selectedBooking.originPickedUp &&
                              selectedBooking.originPickupProof && (
                                <button
                                  onClick={() => {
                                    setOriginPickupProof(
                                      selectedBooking.originPickupProof
                                    );
                                    setShowOriginPickup(true);
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-2 hover:underline"
                                >
                                  <Camera className="w-3 h-3" />
                                  View pickup proof
                                </button>
                              )}
                          </div>
                        </div>

                        {/* FUNCTIONAL Destinations */}
                        {selectedBooking.destinationDeliveries &&
                        selectedBooking.destinationDeliveries.length > 0 ? (
                          selectedBooking.destinationDeliveries.map(
                            (dest, index) => {
                              const isLast =
                                index ===
                                selectedBooking.destinationDeliveries.length -
                                  1;
                              const isDelivered = dest.status === "delivered";
                              const hasMultiple =
                                selectedBooking.destinationDeliveries.length >
                                1;

                              return (
                                <div
                                  key={index}
                                  className="flex items-start space-x-4"
                                >
                                  <div className="relative flex flex-col items-center">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                        isDelivered
                                          ? "bg-green-500"
                                          : "bg-gray-300"
                                      }`}
                                    >
                                      {isDelivered ? (
                                        <CheckCircle className="w-5 h-5 text-white" />
                                      ) : (
                                        <Clock className="w-5 h-5 text-white" />
                                      )}
                                    </div>
                                    {!isLast && (
                                      <div
                                        className={`w-0.5 h-full absolute top-10 ${
                                          isDelivered
                                            ? "bg-green-200"
                                            : "bg-gray-200"
                                        }`}
                                      ></div>
                                    )}
                                  </div>
                                  <div className="flex-1 pb-8">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-semibold text-gray-900">
                                        {hasMultiple
                                          ? `Destination ${index + 1}`
                                          : "Destination"}
                                        {isDelivered && (
                                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                            ✓ Delivered
                                          </span>
                                        )}
                                      </p>
                                      {isDelivered && dest.deliveredAt && (
                                        <span className="text-xs text-gray-500">
                                          {new Date(
                                            dest.deliveredAt
                                          ).toLocaleString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      {dest.destinationAddress}
                                    </p>

                                    {/* Delivery Details */}
                                    {isDelivered ? (
                                      <div className="mt-2 space-y-1">
                                        <p className="text-xs text-green-600 font-medium">
                                          ✓ Package delivered successfully
                                        </p>
                                        {dest.notes && (
                                          <p className="text-xs text-gray-600 italic">
                                            Note: {dest.notes}
                                          </p>
                                        )}
                                        {dest.proofOfDelivery && (
                                          <button
                                            onClick={() => {
                                              setSelectedDestProof({
                                                image: dest.proofOfDelivery,
                                                address:
                                                  dest.destinationAddress,
                                                deliveredAt: dest.deliveredAt,
                                                index: index + 1,
                                                notes: dest.notes,
                                              });
                                              setShowDestProofModal(true);
                                            }}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1 hover:underline"
                                          >
                                            <Camera className="w-3 h-3" />
                                            View delivery proof
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {selectedBooking.status === "In Transit"
                                          ? "Awaiting delivery..."
                                          : "Pending delivery"}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          )
                        ) : (
                          // Fallback for old bookings
                          <div className="flex items-start space-x-4">
                            <div className="relative flex flex-col items-center">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                  selectedBooking.status === "Delivered" ||
                                  selectedBooking.status === "Completed"
                                    ? "bg-green-500"
                                    : "bg-gray-300"
                                }`}
                              >
                                {selectedBooking.status === "Delivered" ||
                                selectedBooking.status === "Completed" ? (
                                  <CheckCircle className="w-5 h-5 text-white" />
                                ) : (
                                  <Clock className="w-5 h-5 text-white" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 pb-8">
                              <p className="text-sm font-semibold text-gray-900">
                                Destination
                              </p>
                              <p className="text-sm text-gray-600">
                                {Array.isArray(
                                  selectedBooking.destinationAddress
                                )
                                  ? selectedBooking.destinationAddress.join(
                                      ", "
                                    )
                                  : selectedBooking.destinationAddress}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Completed Status */}
                        {selectedBooking.status === "Completed" && (
                          <div className="flex items-start space-x-4">
                            <div className="relative flex flex-col items-center">
                              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center z-10">
                                <FileText className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  Trip Completed
                                </p>
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    selectedBooking.updatedAt
                                  ).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                All deliveries completed successfully
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress Summary */}
                      {selectedBooking.destinationDeliveries?.length > 1 &&
                        selectedBooking.status === "In Transit" &&
                        (() => {
                          const delivered =
                            selectedBooking.destinationDeliveries.filter(
                              (d) => d.status === "delivered"
                            ).length;
                          const total =
                            selectedBooking.destinationDeliveries.length;
                          return (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-600">
                                  Delivery Progress
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {delivered} of {total} destinations
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(delivered / total) * 100}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          );
                        })()}
                    </motion.div>

                    {/* Right Column - All the details */}
                    <motion.div
                      className="space-y-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      {/* Customer & Company */}
                      <motion.div
                        className="bg-white rounded-lg border border-gray-200 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      >
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              Company
                            </h4>
                            <p className="text-gray-900">
                              {selectedBooking.companyName || "N/A"}
                            </p>
                          </div>

                          {/* Show client address if available (clientDetails or originAddressDetails or originAddress) */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              Company Address
                            </h4>
                            <p className="text-gray-900">
                              {selectedBooking.clientDetails
                                ?.formattedAddress ||
                                (selectedBooking.clientDetails?.address
                                  ? `${
                                      selectedBooking.clientDetails.address
                                        .street || ""
                                    } ${
                                      selectedBooking.clientDetails.address
                                        .city || ""
                                    }`.trim()
                                  : "") ||
                                selectedBooking.originAddressDetails
                                  ?.formattedAddress ||
                                selectedBooking.originAddress ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Product Details */}
                      <motion.div
                        className="bg-white p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <h4 className="text-sm font-medium text-gray-600 mb-4">
                          Product Details
                        </h4>
                        {Array.isArray(selectedBooking.destinationDeliveries) &&
                        selectedBooking.destinationDeliveries.length > 0 ? (
                          <div className="space-y-3">
                            {selectedBooking.destinationDeliveries.map(
                              (d, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded border bg-gray-50"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="text-sm font-medium text-gray-800">{`Stop ${
                                      d.destinationIndex + 1 || idx + 1
                                    } — ${
                                      d.customerEstablishmentName || "N/A"
                                    }`}</div>
                                    <div className="text-xs text-gray-500">
                                      {d.destinationAddress}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <div className="text-gray-600">
                                        Product
                                      </div>
                                      <div className="font-semibold">
                                        {d.productName || "N/A"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-600">
                                        Quantity
                                      </div>
                                      <div className="font-semibold">
                                        {d.quantity?.toLocaleString() ?? "N/A"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-600">
                                        Gross Weight
                                      </div>
                                      <div className="font-semibold">
                                        {d.grossWeight ?? "N/A"}
                                      </div>
                                    </div>
                                    {d.notes && (
                                      <div className="col-span-2 text-sm text-gray-600">
                                        <div className="text-gray-600">
                                          Notes
                                        </div>
                                        <div>{d.notes}</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          // Fallback to legacy single-product fields
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-sm font-medium text-gray-600 mb-2">
                                Item
                              </h4>
                              <p className="text-gray-900">
                                {selectedBooking.productName || "N/A"}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-600 mb-2">
                                Quantity
                              </h4>
                              <p className="text-gray-900">
                                {selectedBooking.quantity?.toLocaleString() ||
                                  "N/A"}{" "}
                                pcs
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-600 mb-2">
                                Gross Weight
                              </h4>
                              <p className="text-gray-900">
                                {selectedBooking.grossWeight || "N/A"}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-600 mb-2">
                                Delivery Fee
                              </h4>
                              <p className="text-gray-900">
                                ₱
                                {selectedBooking.deliveryFee?.toLocaleString() ||
                                  "0"}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>

                      {/* Vehicle Information */}
                      <motion.div
                        className="bg-white rounded-lg border border-gray-200 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              Vehicle Type
                            </h4>
                            <p className="text-gray-900">
                              {selectedBooking.vehicleType}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              Vehicle Plate
                            </h4>
                            <p className="text-gray-900">
                              {selectedBooking.plateNumber}
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Location & Rate - FIXED for multiple destinations */}
                      <motion.div
                        className="bg-white rounded-lg border border-gray-200 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                      >
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              Origin Location
                            </h4>
                            <p className="text-gray-900">
                              {selectedBooking.originAddress}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              {getDestinations(selectedBooking).length > 1
                                ? "Destinations"
                                : "Destination"}
                            </h4>
                            <div className="space-y-2">
                              {getDestinations(selectedBooking).map(
                                (dest, idx) => (
                                  <div key={idx} className="flex items-start">
                                    {getDestinations(selectedBooking).length >
                                      1 && (
                                      <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded mr-2 mt-0.5">
                                        {idx + 1}
                                      </span>
                                    )}
                                    <p className="text-gray-900 flex-1">
                                      {dest}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Team Information */}
                      <motion.div
                        className="bg-white rounded-lg border border-gray-200 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-3">
                              Drivers
                            </h4>
                            <div className="space-y-2">
                              {selectedBooking.employeeDetails
                                ?.filter((emp) => emp.role === "Driver")
                                .map((driver, idx) => (
                                  <motion.div
                                    key={idx}
                                    className="flex items-center space-x-2"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.9 + idx * 0.1 }}
                                  >
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">
                                      {driver.employeeName ||
                                        driver.fullName ||
                                        "Unknown Driver"}
                                    </span>
                                  </motion.div>
                                ))}

                              {/* If no drivers found, check employeeAssigned array */}
                              {(!selectedBooking.employeeDetails ||
                                selectedBooking.employeeDetails.filter(
                                  (emp) => emp.role === "Driver"
                                ).length === 0) &&
                                selectedBooking.employeeAssigned &&
                                selectedBooking.employeeAssigned.length > 0 &&
                                selectedBooking.employeeAssigned.map(
                                  (empId, idx) => (
                                    <motion.div
                                      key={idx}
                                      className="flex items-center space-x-2"
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.9 + idx * 0.1 }}
                                    >
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-900">
                                        {getEmployeeDisplayName(
                                          empId,
                                          selectedBooking.employeeDetails
                                        )}
                                      </span>
                                    </motion.div>
                                  )
                                )}

                              {(!selectedBooking.employeeDetails ||
                                selectedBooking.employeeDetails.length === 0) &&
                                (!selectedBooking.employeeAssigned ||
                                  selectedBooking.employeeAssigned.length ===
                                    0) && (
                                  <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500">
                                      Not assigned
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-600 mb-3">
                              Helpers
                            </h4>
                            <div className="space-y-2">
                              {selectedBooking.employeeDetails
                                ?.filter((emp) => emp.role === "Helper")
                                .map((helper, idx) => (
                                  <motion.div
                                    key={idx}
                                    className="flex items-center space-x-2"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.0 + idx * 0.1 }}
                                  >
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">
                                      {helper.employeeName ||
                                        helper.fullName ||
                                        "Unknown Helper"}
                                    </span>
                                  </motion.div>
                                ))}

                              {(!selectedBooking.employeeDetails ||
                                selectedBooking.employeeDetails.filter(
                                  (emp) => emp.role === "Helper"
                                ).length === 0) && (
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-500">
                                    Not assigned
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Action Buttons */}
                      <motion.div
                        className="flex space-x-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                      >
                        <motion.button
                          onClick={closeModal}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Back to the List
                        </motion.button>

                        {/* Show different buttons based on status */}
                        {selectedBooking.status === "Pending" && (
                          <>
                            {isBookingScheduledForToday(selectedBooking) ? (
                              <motion.button
                                onClick={handleConfirmReadyToGo}
                                disabled={updating}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                whileHover={!updating ? { scale: 1.02 } : {}}
                                whileTap={!updating ? { scale: 0.98 } : {}}
                              >
                                {updating ? "Updating..." : "Confirm Ready to go"}
                              </motion.button>
                            ) : (
                              <div className="flex-1 px-4 py-3 bg-yellow-100 border-2 border-yellow-300 text-yellow-800 rounded-lg text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <div>
                                    <div className="font-semibold text-sm">Scheduled Trip</div>
                                    <div className="text-xs">
                                      Can confirm on {new Date(selectedBooking.dateNeeded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {selectedBooking.status === "Ready to go" && (
                          <div className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-center">
                            ✓ Ready for Driver to Start Trip
                          </div>
                        )}

                        {(selectedBooking.status === "On Trip" ||
                          selectedBooking.status === "In Transit") && (
                          <div className="flex-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-center">
                            🚛 Trip in Progress
                          </div>
                        )}

                        {selectedBooking.status === "Delivered" && (
                          <div className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-center">
                            ✓ Package Delivered
                          </div>
                        )}

                        {/* Buttons for Completed Status */}
                        {selectedBooking.status === "Completed" && (
                          <>
                            <motion.button
                              onClick={handleGenerateReceipt}
                              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <FileText className="w-4 h-4" />
                              <span>Generate Invoice</span>
                            </motion.button>

                            {/* Show Proof button only if proof exists */}
                            {/* {selectedBooking.proofOfDelivery && (
                              <motion.button
                                onClick={openProofModal}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Camera className="w-4 h-4" />
                                <span>View Proof</span>
                              </motion.button>
                            )} */}
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Generator Modal */}
      {showReceiptGenerator && selectedBooking && (
        <ReceiptGenerator
          booking={selectedBooking}
          onClose={() => setShowReceiptGenerator(false)}
          onReceiptGenerated={handleReceiptGenerated}
        />
      )}

      {/* Proof of Delivery Modal */}
      <AnimatePresence>
        {showProofModal && selectedBooking?.proofOfDelivery && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
            }}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeProofModal}
          >
            <motion.div
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Proof Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <Camera className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold">Proof of Delivery</h3>
                    <p className="text-sm text-purple-100">
                      Trip: {selectedBooking.tripNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeProofModal}
                  className="p-2 text-white hover:bg-white/20 transition-colors rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Proof Image */}
              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={selectedBooking.proofOfDelivery}
                    alt="Proof of Delivery"
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>

                {/* Delivery Info */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Delivered To</p>
                    <div className="space-y-1">
                      {getDestinations(selectedBooking).map((dest, idx) => (
                        <p key={idx} className="text-sm font-medium">
                          {getDestinations(selectedBooking).length > 1 &&
                            `${idx + 1}. `}
                          {dest}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Completed At</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedBooking.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Photo taken by driver upon delivery completion
                </p>
                <button
                  onClick={closeProofModal}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual Destination Proof Modal */}
      <AnimatePresence>
        {showDestProofModal && selectedDestProof && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
            }}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowDestProofModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <div className="flex items-center gap-3">
                  <Camera className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold">
                      Delivery Proof - Stop {selectedDestProof.index}
                    </h3>
                    <p className="text-sm text-green-100">
                      Trip: {selectedBooking.tripNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDestProofModal(false)}
                  className="p-2 text-white hover:bg-white/20 transition-colors rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Proof Image */}
              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={selectedDestProof.image}
                    alt={`Proof of Delivery - Stop ${selectedDestProof.index}`}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>

                {/* Delivery Info */}
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Delivered To</p>
                    <p className="text-sm font-medium">
                      {selectedDestProof.address}
                    </p>
                  </div>

                  {selectedDestProof.deliveredAt && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Delivery Time
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(
                          selectedDestProof.deliveredAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedDestProof.notes && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">
                        Delivery Notes
                      </p>
                      <p className="text-sm font-medium">
                        {selectedDestProof.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Photo taken by driver upon delivery at this stop
                </p>
                <button
                  onClick={() => setShowDestProofModal(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Origin Pickup Proof Modal */}
      <AnimatePresence>
        {showOriginPickup && originPickupProof && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
            }}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={() => setShowOriginPickup(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <Camera className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-bold">Origin Pickup Proof</h3>
                    <p className="text-sm text-blue-100">
                      Trip: {selectedBooking.tripNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOriginPickup(false)}
                  className="p-2 text-white hover:bg-white/20 transition-colors rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 bg-gray-50">
                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={originPickupProof}
                    alt="Origin Pickup Proof"
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">
                      Pickup Location
                    </p>
                    <p className="text-sm font-medium">
                      {selectedBooking.originAddress}
                    </p>
                  </div>

                  {selectedBooking.originPickupAt && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Pickup Time</p>
                      <p className="text-sm font-medium">
                        {new Date(
                          selectedBooking.originPickupAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Photo taken by driver upon cargo pickup
                </p>
                <button
                  onClick={() => setShowOriginPickup(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
